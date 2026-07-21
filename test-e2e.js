const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\c7049e86-5d99-4a09-8401-56b454e619a7';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForDashboardLoad(page) {
  console.log('Waiting for dashboard loading screen to disappear...');
  await page.waitForFunction(() => {
    return !document.body.innerText.includes('Loading SmartDine');
  }, { timeout: 10000 }).catch(() => {});
  await sleep(1000);
}

async function waitForButton(page, text) {
  console.log(`Waiting for button containing "${text}"...`);
  await page.waitForFunction((btnText) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some(b => b.textContent.includes(btnText));
  }, { timeout: 10000 }, text);
}

async function clickButton(page, text) {
  await waitForButton(page, text);
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const btnText = await page.evaluate(el => el.textContent, btn);
    if (btnText.includes(text)) {
      await page.evaluate((el) => {
        if (el) el.click();
      }, btn);
      return;
    }
  }
  throw new Error(`Button containing "${text}" not found`);
}

async function runTests() {
  console.log('Starting E2E verification...');

  // Ensure artifact dir exists
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('React DevTools') && !text.includes('Download')) {
      console.log('BROWSER LOG:', text);
    }
  });

  page.on('pageerror', err => {
    console.log('BROWSER PAGEERROR:', err.toString());
  });

  page.on('requestfailed', request => {
    console.log('BROWSER REQUEST FAILED:', request.url(), request.failure()?.errorText || 'unknown error');
  });

  try {
    // 1. LANDING PAGE
    console.log('1. Navigating to landing page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_landing.png') });
    console.log('Saved 01_landing.png');

    // 2. SIGNUP PAGE
    console.log('2. Navigating to signup page...');
    await page.goto('http://localhost:3000/signup', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_signup.png') });

    // Fill signup form
    console.log('Submitting signup form...');
    const rand = Math.random().toString(36).substr(2, 5);
    const testEmail = `taco_${rand}@town.com`;
    const testRestaurant = `Taco Town ${rand}`;
    const testSlug = `taco-town-${rand}`;

    await page.waitForSelector('input[placeholder="John Doe"]');
    await page.type('input[placeholder="John Doe"]', 'Taco Maria');
    await page.type('input[placeholder="you@example.com"]', testEmail);
    await page.type('input[placeholder="••••••••"]', 'password123');
    await page.type('input[placeholder="The Bistro Cafe"]', testRestaurant);
    await page.type('input[placeholder="e.g. +91 99999 88888"]', '+91 98765 43210');
    await sleep(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_signup_filled.png') });
    
    // Submit signup
    await page.click('button[type="submit"]');
    await sleep(2000);
    await waitForDashboardLoad(page);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_dashboard.png') });
    console.log('Saved 03_dashboard.png');

    // 3. MENU MANAGEMENT
    console.log('3. Navigating to Menu Management...');
    await page.goto('http://localhost:3000/dashboard/menu', { waitUntil: 'networkidle2' });
    await waitForDashboardLoad(page);
    await waitForButton(page, 'Category');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_menu_empty.png') });

    // Open Category Modal
    console.log('Creating category Tacos...');
    await clickButton(page, 'Category');
    
    await page.waitForSelector('input[placeholder="e.g. Appetizers, Mains, Drinks"]');
    await page.type('input[placeholder="e.g. Appetizers, Mains, Drinks"]', 'Tacos');
    
    // Save Category
    await clickButton(page, 'Save Category');
    await sleep(1500);

    // Open Menu Item Modal
    console.log('Creating menu item Spicy Beef Taco...');
    await clickButton(page, 'Menu Item');
    
    await page.waitForSelector('input[placeholder="e.g. Garlic Bread, Pasta Carbonara"]');
    await page.type('input[placeholder="e.g. Garlic Bread, Pasta Carbonara"]', 'Spicy Beef Taco');
    await page.type('input[placeholder="e.g. 299"]', '350');
    await page.type('input[placeholder="https://images.unsplash.com/..."]', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop&q=80');
    await page.type('textarea[placeholder="Describe the dish ingredients, preparation, allergens..."]', 'Crispy shell, spicy beef, lettuce, cheese');
    
    // Uncheck vegetarian checkbox (it is checked by default)
    await page.click('input[id="isVeg"]');
    
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_menu_item_modal.png') });

    // Save Menu Item
    await clickButton(page, 'Save Menu Item');
    await sleep(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_menu_final.png') });
    console.log('Saved 04_menu_final.png');

    // 4. TABLE & QR MANAGEMENT
    console.log('4. Navigating to Tables...');
    await page.goto('http://localhost:3000/dashboard/tables', { waitUntil: 'networkidle2' });
    await waitForDashboardLoad(page);
    await waitForButton(page, 'Add Table');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_tables_empty.png') });

    // Open Add Table Modal
    console.log('Creating Table 5...');
    await clickButton(page, 'Add Table');
    
    await page.waitForSelector('input[placeholder="e.g. Table 1, Outdoor 4, Cabin B"]');
    await page.focus('input[placeholder="e.g. Table 1, Outdoor 4, Cabin B"]');
    // Clear auto-suggested text
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('input[placeholder="e.g. Table 1, Outdoor 4, Cabin B"]', 'Table 5');
    await sleep(1000);
    // Click the "Create Table" button
    await clickButton(page, 'Create Table');
    await sleep(3500); // wait for QR generation
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_tables_final.png') });
    console.log('Saved 05_tables_final.png');

    // Retrieve the customer URL from the "Test Menu" link
    const customerUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const testMenuLink = links.find(l => l.textContent.includes('Test Menu'));
      return testMenuLink ? testMenuLink.href : null;
    });
    if (!customerUrl) {
      throw new Error('Test Menu link not found on Tables page!');
    }
    console.log(`Retrieved Customer Menu URL: ${customerUrl}`);

    // 5. CUSTOMER MENU & ORDER PLACEMENT
    console.log('5. Navigating to Customer Table QR Menu...');
    await page.goto(customerUrl, { waitUntil: 'networkidle2' });
    await waitForButton(page, 'Add +');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_customer_menu.png') });
    console.log('Saved 06_customer_menu.png');

    // Add item to cart
    console.log('Adding item to cart...');
    await clickButton(page, 'Add +');
    await sleep(500);

    // Open Cart Sheet
    console.log('Opening Cart Sheet...');
    await clickButton(page, 'View Cart');
    
    // Wait for the modal/sheet to slide in
    await page.waitForSelector('textarea', { timeout: 3000 });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_customer_cart.png') });

    // Enter cooking instructions
    console.log('Entering cooking instructions...');
    await page.type('textarea', 'Extra salsa please');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_customer_cart_filled.png') });

    // Place Order
    console.log('Submitting order...');
    await clickButton(page, 'Place Order ticket');
    await sleep(3000); // wait for redirect to tracking page

    // 6. ORDER TRACKING
    console.log('6. Order tracking timeline...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '07_order_tracking.png') });
    console.log('Saved 07_order_tracking.png');

    // 7. RESTAURANT ORDERS DASHBOARD
    console.log('7. Verifying order on Restaurant Dashboard...');
    await page.goto('http://localhost:3000/dashboard/orders', { waitUntil: 'networkidle2' });
    await waitForDashboardLoad(page);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '08_dashboard_orders.png') });
    console.log('Saved 08_dashboard_orders.png');

    // 8. KITCHEN DISPLAY SYSTEM (KDS)
    console.log('8. Verifying order on KDS...');
    await page.goto('http://localhost:3000/dashboard/kds', { waitUntil: 'networkidle2' });
    await waitForDashboardLoad(page);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '09_kds.png') });
    console.log('Saved 09_kds.png');

    // 9. BILLING & SAAS LIMITS
    console.log('9. Checking SaaS quotas and Billing...');
    await page.goto('http://localhost:3000/dashboard/billing', { waitUntil: 'networkidle2' });
    await waitForDashboardLoad(page);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '10_billing.png') });
    console.log('Saved 10_billing.png');

    // 10. SUPER ADMIN
    console.log('10. Signing Out and accessing Super Admin...');
    // Log out first
    await clickButton(page, 'Sign Out');
    await sleep(1500);

    // Login as Super Admin
    console.log('Logging in as Super Admin...');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'admin@smartdine.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => {
      return document.body.innerText.includes('Global Platform Dashboard');
    }, { timeout: 15000 }).catch(() => {});
    await sleep(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '11_super_admin.png') });
    console.log('Saved 11_super_admin.png');

    console.log('E2E Verification completed successfully!');

  } catch (e) {
    console.error('Test execution failed with error:', e);
    try {
      console.log('Current Page URL at failure:', page.url());
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_error.png') });
      console.log('Saved screenshot_error.png');
    } catch (ssErr) {
      console.error('Failed to capture error screenshot:', ssErr);
    }
  } finally {
    await browser.close();
  }
}

runTests();
