const GAS_URL = "https://script.google.com/macros/s/AKfycbx6-eBU5-NKIrM0VEUJgTHlEbzkpbFTCo_wlA_Eh7_t6l6A4dwAvC1WthqfJ4oxZ9mA/exec";

// Use a test restaurant ID (we will create one if needed, or assume a known one or pass empty to test failures)
// We will just test createRestaurant first to get an ID.
async function gasRequest(action, payload = {}) {
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload })
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function runQA() {
  console.log("Starting QA Test against LIVE Backend...\n");
  
  // 1. Create a dummy restaurant to test isolated tenant modules
  console.log("-> Provisioning Test Restaurant...");
  const createRes = await gasRequest("createRestaurant", { 
    name: "QA Test Rest", 
    ownerEmail: "qa@test.com", 
    ownerPassword: "qa123" 
  });
  
  if(!createRes.success) {
    console.error("Failed to provision restaurant:", createRes.message);
    return;
  }
  const rid = createRes.restaurantId;
  console.log("✅ Restaurant Provisioned: " + rid + "\n");

  const results = [];

  const runTest = async (module, api, sheet, requestFunc) => {
    try {
      const res = await requestFunc();
      const passed = res && res.success === true;
      results.push({
        module, api, sheet, passed, message: res ? res.message : "No response", data: res ? res.data : null
      });
      console.log(`${passed ? '✅ PASS' : '❌ FAIL'} | Module: ${module} | API: ${api} | Sheet: ${sheet}`);
      if(!passed) console.log(`   Error: ${res ? res.message : "Unknown"}`);
    } catch(e) {
      results.push({ module, api, sheet, passed: false, message: e.message });
      console.log(`❌ FAIL | Module: ${module} | API: ${api} | Sheet: ${sheet}`);
      console.log(`   Exception: ${e.message}`);
    }
  };

  // --- STAFF ---
  await runTest("Staff", "getStaff", "Staff", () => gasRequest("getStaff", { restaurantId: rid }));
  await runTest("Staff", "updateStaff (add)", "Staff", () => gasRequest("updateStaff", { restaurantId: rid, actionType: "add", staff: { Username: "qatest", Password: "123", Role: "Waiter", Status: "Active" } }));

  // --- CATEGORIES ---
  await runTest("Categories", "getCategories", "Categories", () => gasRequest("getCategories", { restaurantId: rid }));
  await runTest("Categories", "updateCategory (add)", "Categories", () => gasRequest("updateCategory", { restaurantId: rid, actionType: "add", category: { Name: "QA Drinks", Active: true } }));

  // --- TABLES ---
  await runTest("Tables", "getTables", "Tables", () => gasRequest("getTables", { restaurantId: rid }));
  await runTest("Tables", "updateTable (add)", "Tables", () => gasRequest("updateTable", { restaurantId: rid, actionType: "add", table: { TableNo: "99", QRLink: "http://test.com" } }));

  // --- SETTINGS ---
  await runTest("Settings", "getRestaurantSettings", "Settings", () => gasRequest("getRestaurantSettings", { restaurantId: rid }));
  await runTest("Settings", "updateRestaurantSettings", "Settings", () => gasRequest("updateRestaurantSettings", { restaurantId: rid, settings: { RestaurantName: "QA Name", GST: "18" } }));

  // --- ANALYTICS ---
  await runTest("Analytics", "getAnalytics", "Orders", () => gasRequest("getAnalytics", { restaurantId: rid }));

  // --- LIVE ORDERS ---
  await runTest("Live Orders", "getOrders", "Orders", () => gasRequest("getOrders", { restaurantId: rid, status: "All" }));
  
  // Cleanup/Finish
  console.log("\nQA Test Complete.");
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Summary: ${passedCount}/${results.length} PASSED`);
}

runQA();
