const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\c7049e86-5d99-4a09-8401-56b454e619a7';

let browser;
let page;
let customerPage;

async function run() {
  console.log('Starting puppeteer E2E validation...');
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--mute-audio',
      '--disable-features=AudioServiceOutOfProcess'
    ]
  });

  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.evaluateOnNewDocument(() => {
    window.Audio = class MockAudio {
      constructor() {
        this.loop = false;
        this.currentTime = 0;
      }
      play() { return Promise.resolve(); }
      pause() {}
      addEventListener() {}
      removeEventListener() {}
    };
    const mockNode = {
      connect() {},
      disconnect() {},
      start() {},
      stop() {},
      gain: { value: 1 },
      frequency: { value: 440, setValueAtTime() {} }
    };
    window.AudioContext = class MockAudioContext {
      constructor() { this.state = 'suspended'; }
      resume() { return Promise.resolve(); }
      suspend() { return Promise.resolve(); }
      createOscillator() { return mockNode; }
      createGain() { return mockNode; }
      close() { return Promise.resolve(); }
      get destination() { return {}; }
    };
    window.webkitAudioContext = window.AudioContext;
  });

  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('React DevTools')) console.log('STAFF BROWSER LOG:', text);
  });
  page.on('pageerror', err => console.log('STAFF BROWSER PAGEERROR:', err.toString()));
  page.on('requestfailed', req => console.log('STAFF BROWSER REQUEST FAILED:', req.url(), req.failure()?.errorText));
  page.on('dialog', async dialog => {
    console.log('STAFF BROWSER DIALOG:', dialog.type(), dialog.message());
    await dialog.dismiss().catch(() => {});
  });

  // 1. Sign up a new owner and restaurant
  console.log('Navigating to signup page...');
  await page.goto('https://smartdine-qr.vercel.app/signup', { waitUntil: 'load' });

  const randomSuffix = Math.random().toString(36).substr(2, 5);
  const email = `owner_${randomSuffix}@smartdine.com`;
  const password = 'Password123!';
  const restName = `Burger Palace ${randomSuffix}`;

  console.log(`Signing up with email: ${email}, rest: ${restName}`);
  await page.type('input[placeholder="John Doe"]', 'John Owner');
  await page.type('input[placeholder="you@example.com"]', email);
  await page.type('input[placeholder="e.g. +91 99999 88888"]', '+1 555-555-5555');
  await page.type('input[placeholder="••••••••"]', password);
  await page.type('input[placeholder="The Bistro Cafe"]', restName);

  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  console.log('Signup completed. Current URL:', page.url());

  // Fetch the restaurant we just created from the DB to seed items
  console.log('Signing in Supabase client...');
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (signInErr) throw signInErr;
  console.log('Supabase client signed in successfully.');

  console.log('Seeding categories and menu items...');
  const { data: newRests } = await supabase
    .from('restaurants')
    .select('id')
    .eq('name', restName);

  if (!newRests || newRests.length === 0) {
    throw new Error('Failed to find newly created restaurant in database');
  }
  const newRestId = newRests[0].id;

  // Insert a category
  const { data: cats, error: catErr } = await supabase
    .from('categories')
    .insert({
      restaurant_id: newRestId,
      name: 'Drinks'
    })
    .select();
  if (catErr) throw catErr;
  const catId = cats[0].id;

  // Insert menu items
  const { error: itemsErr } = await supabase
    .from('menu_items')
    .insert([
      {
        restaurant_id: newRestId,
        category_id: catId,
        name: 'Cool Lemonade',
        price: 4.5,
        is_available: true,
        is_veg: true,
        description: 'Fresh lemonade with mint.'
      },
      {
        restaurant_id: newRestId,
        category_id: catId,
        name: 'Strawberry Mojito',
        price: 6.0,
        is_available: true,
        is_veg: true,
        description: 'Refreshing strawberry mocktail.'
      }
    ]);
  if (itemsErr) throw itemsErr;
  console.log('Seeding items completed.');

  // Take signup dashboard screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_owner_dashboard.png') });
  console.log('Screenshot 01_owner_dashboard.png saved.');

  // 2. Add a table
  console.log('Navigating to Tables configuration page...');
  await page.goto('https://smartdine-qr.vercel.app/dashboard/tables', { waitUntil: 'load' });
  console.log('Waiting for Tables page to load...');
  await page.waitForSelector('h2', { timeout: 15000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_tables_page_before.png') });

  // Create Table 1
  console.log('Opening Add Table modal...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Table'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Typing table name...');
  // Clear field by evaluating or select all and delete
  await page.focus('input[placeholder="e.g. Table 1, Outdoor 4, Cabin B"]');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type('input[placeholder="e.g. Table 1, Outdoor 4, Cabin B"]', 'Table 1');

  console.log('Submitting table creation...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create Table'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_tables_page_after.png') });

  // Extract the table ID or QR code link
  const customerLink = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find(el => el.href.includes('/menu/') && el.href.includes('/table/'));
    return a ? a.href : null;
  });

  console.log('Customer QR code Link found:', customerLink);
  if (!customerLink) {
    throw new Error('Failed to extract customer table link.');
  }

  // 3. Open Customer Menu page
  console.log('Opening customer menu page in a new session...');
  customerPage = await browser.newPage();
  await customerPage.setViewport({ width: 450, height: 800 });

  await customerPage.evaluateOnNewDocument(() => {
    window.Audio = class MockAudio {
      constructor() {
        this.loop = false;
        this.currentTime = 0;
      }
      play() { return Promise.resolve(); }
      pause() {}
      addEventListener() {}
      removeEventListener() {}
    };
    const mockNode = {
      connect() {},
      disconnect() {},
      start() {},
      stop() {},
      gain: { value: 1 },
      frequency: { value: 440, setValueAtTime() {} }
    };
    window.AudioContext = class MockAudioContext {
      constructor() { this.state = 'suspended'; }
      resume() { return Promise.resolve(); }
      suspend() { return Promise.resolve(); }
      createOscillator() { return mockNode; }
      createGain() { return mockNode; }
      close() { return Promise.resolve(); }
      get destination() { return {}; }
    };
    window.webkitAudioContext = window.AudioContext;
  });

  customerPage.on('console', msg => {
    const text = msg.text();
    if (!text.includes('React DevTools')) console.log('CUSTOMER BROWSER LOG:', text);
  });
  customerPage.on('pageerror', err => console.log('CUSTOMER BROWSER PAGEERROR:', err.toString()));
  customerPage.on('requestfailed', req => console.log('CUSTOMER BROWSER REQUEST FAILED:', req.url(), req.failure()?.errorText));
  customerPage.on('dialog', async dialog => {
    console.log('CUSTOMER BROWSER DIALOG:', dialog.type(), dialog.message());
    await dialog.dismiss().catch(() => {});
  });

  await customerPage.goto(customerLink, { waitUntil: 'load' });
  console.log('Waiting for customer menu page to load...');
  await customerPage.waitForSelector('input[placeholder="Search dishes..."]');
  await customerPage.screenshot({ path: path.join(ARTIFACT_DIR, '04_customer_menu.png') });

  // Add items to cart
  console.log('Adding first menu item to cart...');
  await customerPage.evaluate(() => {
    const addBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Add'));
    if (addBtns.length > 0) addBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await customerPage.screenshot({ path: path.join(ARTIFACT_DIR, '05_customer_cart_added.png') });

  // Open cart and place order
  console.log('Opening cart...');
  await customerPage.evaluate(() => {
    const cartBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('View Cart'));
    if (cartBtn) cartBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await customerPage.screenshot({ path: path.join(ARTIFACT_DIR, '06_cart_details.png') });

  console.log('Placing order...');
  await customerPage.evaluate(() => {
    const placeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Place Order'));
    if (placeBtn) placeBtn.click();
  });
  console.log('Waiting for tracking page Order Summary...');
  await customerPage.waitForFunction(() => document.body.innerText.toLowerCase().includes('order summary'), { timeout: 15000 });
  console.log('Order placed. Tracking URL:', customerPage.url());
  await customerPage.screenshot({ path: path.join(ARTIFACT_DIR, '07_tracking_sent.png') });
  console.log('Screenshot 07_tracking_sent.png saved.');

  // 4. Open KDS page to Accept & Cook
  console.log('Navigating staff portal to KDS...');
  await page.goto('https://smartdine-qr.vercel.app/dashboard/kds', { waitUntil: 'load' });
  console.log('Waiting for KDS page to load...');
  await page.waitForSelector('h2', { timeout: 15000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '08_kds_new_alarm.png') });
  console.log('Screenshot 08_kds_new_alarm.png saved.');

  // Click "Accept" on KDS alert banner
  console.log('Accepting order on KDS...');
  await page.evaluate(() => {
    const acceptBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Accept'));
    if (acceptBtns.length > 0) acceptBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '09_kds_accepted.png') });

  // Click "Start Cooking" on KDS
  console.log('Cooking order on KDS...');
  await page.evaluate(() => {
    const startCookingBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Start Cooking'));
    if (startCookingBtns.length > 0) startCookingBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '10_kds_cooking.png') });

  // Click "Ready for Pickup" on KDS
  console.log('Marking order ready on KDS...');
  await page.evaluate(() => {
    const readyBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Ready for Pickup'));
    if (readyBtns.length > 0) readyBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '11_kds_ready.png') });

  // 5. Open Waiter Portal to Serve
  console.log('Navigating staff portal to Live Orders (Waiter)...');
  await page.goto('https://smartdine-qr.vercel.app/dashboard/orders', { waitUntil: 'load' });
  console.log('Waiting for Waiter page to load...');
  await page.waitForSelector('h2', { timeout: 15000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '12_waiter_ready_alarm.png') });
  console.log('Screenshot 12_waiter_ready_alarm.png saved.');

  // Click "Serve Order"
  console.log('Serving order on Waiter Portal...');
  await page.evaluate(() => {
    const serveBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Serve'));
    if (serveBtns.length > 0) serveBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '13_waiter_served.png') });

  console.log('Checking customer tracking page for Served status and timestamps...');
  await customerPage.reload({ waitUntil: 'networkidle2' });
  console.log('Waiting for Customer Tracking reload...');
  await customerPage.waitForFunction(() => document.body.innerText.toLowerCase().includes('order summary'));
  await customerPage.screenshot({ path: path.join(ARTIFACT_DIR, '14_tracking_served.png') });
  console.log('Screenshot 14_tracking_served.png saved.');

  // 7. Click "Add More Items"
  console.log('Clicking Add More Items...');
  await customerPage.evaluate(() => {
    const addMoreBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add More Items'));
    if (addMoreBtn) addMoreBtn.click();
  });
  await customerPage.waitForSelector('input[placeholder="Search dishes..."]');
  console.log('Current customer URL after Add More:', customerPage.url());
  await customerPage.screenshot({ path: path.join(ARTIFACT_DIR, '15_customer_menu_add_more.png') });

  // Add more items and checkout
  console.log('Adding more items...');
  await customerPage.evaluate(() => {
    const addBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Add'));
    if (addBtns.length > 0) addBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 1000));

  await customerPage.evaluate(() => {
    const cartBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('View Cart'));
    if (cartBtn) cartBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  
  await customerPage.evaluate(() => {
    const placeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Place Order'));
    if (placeBtn) placeBtn.click();
  });
  console.log('Waiting for tracking page Order Summary...');
  await customerPage.waitForFunction(() => document.body.innerText.toLowerCase().includes('order summary'), { timeout: 15000 });
  console.log('Second order batch placed. Tracking URL:', customerPage.url());
  await customerPage.screenshot({ path: path.join(ARTIFACT_DIR, '16_tracking_appended.png') });
  console.log('Screenshot 16_tracking_appended.png saved.');

  await browser.close();
  console.log('E2E validation finished successfully!');
}

run().catch(async err => {
  console.error('Error during E2E validation:', err);
  try {
    if (typeof page !== 'undefined') {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_error_staff.png') });
      console.log('Saved screenshot_error_staff.png');
    }
    if (typeof customerPage !== 'undefined') {
      await customerPage.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_error_customer.png') });
      console.log('Saved screenshot_error_customer.png');
    }
  } catch (ssErr) {
    console.error('Failed to take failure screenshots:', ssErr);
  }
  if (typeof browser !== 'undefined') {
    await browser.close().catch(() => {});
  }
  process.exit(1);
});
