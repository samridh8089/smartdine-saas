function getMasterSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let masterId = props.getProperty("MASTER_SPREADSHEET_ID");
  
  if (!masterId) {
    const ss = SpreadsheetApp.create("SmartDine_MasterDB");
    
    const requiredSheets = [
      { name: "Restaurants", headers: ["PublicID", "SpreadsheetID", "Name", "OwnerEmail", "Status", "CreatedAt"] },
      { name: "Users", headers: ["ID", "Username", "Password", "Role", "PublicResID", "SessionToken", "SessionExpiry"] },
      { name: "Plans", headers: ["PlanID", "Name", "Price", "Features"] },
      { name: "Subscriptions", headers: ["SubID", "PublicResID", "PlanID", "Status", "ExpiryDate"] },
      { name: "Payments", headers: ["PaymentID", "PublicResID", "Amount", "Date", "Status"] },
      { name: "ActivityLogs", headers: ["LogID", "PublicResID", "User", "Action", "Timestamp"] },
      { name: "Backups", headers: ["BackupID", "PublicResID", "SpreadsheetID", "Timestamp"] },
      { name: "NotificationQueue", headers: ["NotifID", "PublicResID", "Type", "Status", "Payload", "Timestamp"] },
      { name: "SuperAdmin", headers: ["Username", "Password", "SessionToken", "SessionExpiry"] }
    ];
    
    // Process first sheet specially (which is Sheet1 by default)
    let firstSheet = ss.getActiveSheet();
    firstSheet.setName(requiredSheets[0].name);
    firstSheet.appendRow(requiredSheets[0].headers);
    
    for (let i = 1; i < requiredSheets.length; i++) {
      let sh = ss.insertSheet(requiredSheets[i].name);
      sh.appendRow(requiredSheets[i].headers);
      if (requiredSheets[i].name === "SuperAdmin") {
        sh.appendRow(["admin", "admin123", "", ""]);
      }
    }
    
    masterId = ss.getId();
    props.setProperty("MASTER_SPREADSHEET_ID", masterId);
  }
  
  return SpreadsheetApp.openById(masterId);
}

function superAdminLogin(params) {
  const { username, password } = params;
  const masterSS = getMasterSpreadsheet();
  const saSheet = masterSS.getSheetByName("SuperAdmin");
  const data = saSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username && data[i][1] === password) {
      const token = Utilities.getUuid();
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24); // 24 hour session
      
      saSheet.getRange(i + 1, 3).setValue(token);
      saSheet.getRange(i + 1, 4).setValue(expiry.toISOString());
      
      return { success: true, message: "Login successful", token: token };
    }
  }
  return { success: false, message: "Invalid credentials" };
}

function getRestaurants(params) {
  const masterSS = getMasterSpreadsheet();
  const sheet = masterSS.getSheetByName("Restaurants");
  const data = sheet.getDataRange().getValues();
  const restaurants = sheetDataToObjects(data).map(r => {
    // Scrub internal SpreadsheetID before sending to frontend
    delete r.SpreadsheetID;
    return r;
  });
  return { success: true, data: restaurants };
}

function createRestaurant(params) {
  const { name, ownerEmail, ownerPassword } = params;
  
  // 1. Generate Public UUID
  const publicId = "RES-" + Utilities.getUuid().split('-')[0].toUpperCase();
  
  // 2. Create actual Google Spreadsheet
  const ss = SpreadsheetApp.create("SmartDine_" + name);
  const spreadsheetId = ss.getId();
  
  // 3. Setup standard Sheets for Tenant
  const sheetsConfig = [
    { name: "Settings", headers: ["Key", "Value"] },
    { name: "Menu", headers: ["ID", "Category", "Name", "Description", "Price", "ImageURL", "Available"] },
    { name: "Categories", headers: ["ID", "Name", "Active"] },
    { name: "Orders", headers: ["OrderID", "TableNo", "Items", "Total", "Status", "SpecialInstructions", "Timestamp"] },
    { name: "Tables", headers: ["TableNo", "QRLink"] },
    { name: "WaiterCalls", headers: ["CallID", "TableNo", "Type", "Status", "Timestamp"] },
    { name: "Analytics", headers: ["Date", "TotalSales", "TotalOrders"] },
    { name: "Bills", headers: ["BillID", "TableNo", "OrderID", "Total", "Status"] },
    { name: "Customers", headers: ["Phone", "Name", "TotalVisits"] },
    { name: "Staff", headers: ["Username", "Password", "Role", "Status"] },
    { name: "QRLinks", headers: ["TableNo", "URL"] },
    { name: "Notifications", headers: ["ID", "Message", "Read", "Timestamp"] },
    { name: "ActivityLogs", headers: ["LogID", "User", "Action", "Timestamp"] }
  ];
  
  let defaultSheet = ss.getActiveSheet();
  defaultSheet.setName(sheetsConfig[0].name);
  defaultSheet.appendRow(sheetsConfig[0].headers);
  
  // Apply default settings
  defaultSheet.appendRow(["RestaurantName", name]);
  defaultSheet.appendRow(["Phone", ""]);
  defaultSheet.appendRow(["Address", ""]);
  defaultSheet.appendRow(["GST", "0"]);
  defaultSheet.appendRow(["Currency", "USD"]);
  defaultSheet.appendRow(["Theme", "dark"]);
  defaultSheet.appendRow(["Logo", ""]);
  defaultSheet.appendRow(["Subscription", "Free"]);
  defaultSheet.appendRow(["TrialExpiry", new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()]);
  
  for (let i = 1; i < sheetsConfig.length; i++) {
    let sh = ss.insertSheet(sheetsConfig[i].name);
    sh.appendRow(sheetsConfig[i].headers);
    if (sheetsConfig[i].name === "Staff") {
       sh.appendRow(["owner_" + name.replace(/\s+/g, '').toLowerCase(), ownerPassword || "owner123", "Owner", "Active"]);
       sh.appendRow(["kitchen", "kitchen123", "Kitchen", "Active"]);
       sh.appendRow(["waiter", "waiter123", "Waiter", "Active"]);
    }
  }
  
  // 4. Save to Master DB (Users sheet for Auth)
  const masterSS = getMasterSpreadsheet();
  const usersSheet = masterSS.getSheetByName("Users");
  usersSheet.appendRow([Utilities.getUuid(), "owner_" + name.replace(/\s+/g, '').toLowerCase(), ownerPassword || "owner123", "Owner", publicId, "", ""]);
  usersSheet.appendRow([Utilities.getUuid(), "kitchen", "kitchen123", "Kitchen", publicId, "", ""]);
  usersSheet.appendRow([Utilities.getUuid(), "waiter", "waiter123", "Waiter", publicId, "", ""]);
  
  // 5. Save to Master DB (Restaurants mapping)
  const resSheet = masterSS.getSheetByName("Restaurants");
  resSheet.appendRow([publicId, spreadsheetId, name, ownerEmail, "Active", new Date().toISOString()]);
  
  return { success: true, restaurantId: publicId, message: "Restaurant created successfully" };
}

function suspendRestaurant(params) {
  const { restaurantId } = params; // This is the Public ID
  const masterSS = getMasterSpreadsheet();
  const sheet = masterSS.getSheetByName("Restaurants");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === restaurantId) {
      sheet.getRange(i + 1, 5).setValue("Suspended");
      return { success: true, message: "Restaurant suspended" };
    }
  }
  return { success: false, message: "Restaurant not found" };
}

function backupRestaurant(params) {
  const { restaurantId } = params; // Public ID
  try {
    const spreadsheetId = getInternalSpreadsheetId(restaurantId);
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const name = ss.getName();
    const backupName = name + "_Backup_" + new Date().toISOString().split('T')[0];
    const backup = ss.copy(backupName);
    
    const masterSS = getMasterSpreadsheet();
    masterSS.getSheetByName("Backups").appendRow([Utilities.getUuid(), restaurantId, backup.getId(), new Date().toISOString()]);
    
    return { success: true, message: "Backup successful" };
  } catch(e) {
    return { success: false, message: e.message };
  }
}
