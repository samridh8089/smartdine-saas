const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

// Load environment variables manually to avoid dependencies
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  // Try first in root project directory
  const rootEnvPath = path.resolve(__dirname, 'smartdine-qr/.env.local');
  const localEnvPath = path.resolve(__dirname, '.env.local');
  const envPath = fs.existsSync(rootEnvPath) ? rootEnvPath : (fs.existsSync(localEnvPath) ? localEnvPath : path.resolve(__dirname, '../.env.local'));
  
  console.log('Loading env variables from:', envPath);
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = val;
    }
  });
} catch (e) {
  console.error('Failed to parse .env.local file:', e.message);
  process.exit(1);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables!');
  process.exit(1);
}

console.log('Using Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
  console.log('Starting Takeaway Ordering E2E Test...');
  let orderRecord = null;
  
  try {
    // 1. Fetch first table to get valid FK references
    console.log('1. Fetching valid table record...');
    const { data: tables, error: tableErr } = await supabase
      .from('tables')
      .select('*')
      .limit(1);
      
    if (tableErr || !tables || tables.length === 0) {
      throw new Error('Table fetch failed: ' + (tableErr?.message || 'none found'));
    }
    const tableId = tables[0].id;
    const tableName = tables[0].name;
    const restaurantId = tables[0].restaurant_id;
    console.log(`✓ Using Table: ${tableName} (${tableId})`);
    console.log(`✓ Using Restaurant ID: ${restaurantId}`);

    // 2. Place a Takeaway Prepaid Order
    console.log('2. Inserting prepaid takeaway order...');
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId,
        table_name: 'Takeaway',
        status: 'new',
        subtotal: 200,
        gst: 10,
        service_charge: 10,
        total: 220,
        payment_status: 'customer_marked_paid', // Takeaway is prepaid
        order_type: 'takeaway',
        customer_arrival_minutes: 20,
        takeaway_notes: 'Please pack in bio-degradable boxes'
      })
      .select();
      
    if (orderErr || !order || order.length === 0) {
      throw new Error('Takeaway Order placement failed: ' + (orderErr?.message || 'empty response'));
    }
    orderRecord = order[0];
    console.log(`✓ Takeaway order successfully placed! ID: ${orderRecord.id}`);
    console.log(`  - Order Type: ${orderRecord.order_type}`);
    console.log(`  - Customer Arrival: ${orderRecord.customer_arrival_minutes} minutes`);
    console.log(`  - Takeaway Notes: "${orderRecord.takeaway_notes}"`);
    console.log(`  - Payment Status: ${orderRecord.payment_status}`);

    // 3. Retrieve order and verify fields persist correctly
    console.log('3. Verifying fields persistence on retrieve...');
    const { data: fetchedOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderRecord.id)
      .single();
      
    if (fetchErr || !fetchedOrder) {
      throw new Error('Failed to retrieve order: ' + fetchErr?.message);
    }
    
    if (fetchedOrder.order_type !== 'takeaway') {
      throw new Error(`Assertion failed: order_type is ${fetchedOrder.order_type}, expected 'takeaway'`);
    }
    if (fetchedOrder.customer_arrival_minutes !== 20) {
      throw new Error(`Assertion failed: customer_arrival_minutes is ${fetchedOrder.customer_arrival_minutes}, expected 20`);
    }
    if (fetchedOrder.takeaway_notes !== 'Please pack in bio-degradable boxes') {
      throw new Error(`Assertion failed: takeaway_notes is "${fetchedOrder.takeaway_notes}", expected "Please pack in bio-degradable boxes"`);
    }
    console.log('✓ Persistence assertions passed successfully.');

    // 4. Simulate staff accepting & preparing the takeaway order
    console.log('4. Accepting order in kitchen...');
    const { error: acceptErr } = await supabase
      .from('orders')
      .update({ status: 'accepted' })
      .eq('id', orderRecord.id);
    if (acceptErr) throw new Error('Accept status update failed: ' + acceptErr.message);
    
    console.log('5. Starting preparation...');
    const { error: prepErr } = await supabase
      .from('orders')
      .update({ status: 'preparing' })
      .eq('id', orderRecord.id);
    if (prepErr) throw new Error('Preparing status update failed: ' + prepErr.message);

    // 5. Mark ready for pickup
    console.log('6. Marking ready for pickup...');
    const { error: readyErr } = await supabase
      .from('orders')
      .update({ status: 'ready' })
      .eq('id', orderRecord.id);
    if (readyErr) throw new Error('Ready status update failed: ' + readyErr.message);
    console.log('✓ Order is now ready for takeaway pickup.');

    // 6. Complete payment & order
    console.log('7. Verifying payment and completing order...');
    const { error: completeErr } = await supabase
      .from('orders')
      .update({ 
        payment_status: 'paid',
        status: 'completed',
        marked_paid_by: 'E2E Staff Member'
      })
      .eq('id', orderRecord.id);
    if (completeErr) throw new Error('Verification & completion failed: ' + completeErr.message);
    console.log('✓ Order successfully verified & completed.');

    // 7. Clean up test order
    console.log('8. Cleaning up E2E test order...');
    const { error: deleteErr } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderRecord.id);
    if (deleteErr) throw new Error('Clean up delete failed: ' + deleteErr.message);
    console.log('✓ Clean up complete.');

    console.log('🎉 TAKEAWAY ORDER E2E VALIDATION PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ E2E Validation Failed:', err.message);
    if (orderRecord) {
      console.log('Cleaning up dangling order...');
      await supabase.from('orders').delete().eq('id', orderRecord.id);
    }
    process.exit(1);
  }
}

runTest();
