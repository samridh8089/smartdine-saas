const RESPONSE_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function doOptions(e) {
  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  return handleRequest(e, "GET");
}

function doPost(e) {
  return handleRequest(e, "POST");
}

function handleRequest(e, method) {
  try {
    let params = e.parameter;
    if (method === "POST" && e.postData && e.postData.contents) {
      let body = JSON.parse(e.postData.contents);
      params = { ...params, ...body };
    }

    const action = params.action;
    let result = { success: false, message: "Action not found" };

    if (!action) {
       return buildResponse({ success: false, message: "Action parameter is required" });
    }

    // Routing
    switch (action) {
      // Super Admin Actions
      case "createRestaurant":
        result = createRestaurant(params);
        break;
      case "getRestaurants":
        result = getRestaurants(params);
        break;
      case "superAdminLogin":
        result = superAdminLogin(params);
        break;
      case "suspendRestaurant":
        result = suspendRestaurant(params);
        break;
      case "backupRestaurant":
        result = backupRestaurant(params);
        break;
      
      // Menu Actions
      case "getMenu":
        result = getMenu(params.restaurantId);
        break;
      case "updateMenu":
        result = updateMenu(params);
        break;
      
      // Orders Actions
      case "addOrder":
        result = addOrder(params);
        break;
      case "getOrders":
        result = getOrders(params.restaurantId, params.status);
        break;
      case "updateOrder":
        result = updateOrder(params);
        break;
      
      // Staff / Interaction Actions
      case "callWaiter":
        result = callWaiter(params);
        break;
      case "requestBill":
        result = requestBill(params);
        break;
      case "getWaiterCalls":
        result = getWaiterCalls(params.restaurantId);
        break;
      case "updateWaiterCall":
        result = updateWaiterCall(params);
        break;
      
      // Login Actions
      case "loginStaff":
        result = loginStaff(params);
        break;
      case "logoutStaff":
        result = logoutStaff(params);
        break;

      // Settings Action
      case "getRestaurantSettings":
        result = getRestaurantSettings(params);
        break;

      default:
        result = { success: false, message: "Unknown action" };
    }

    return buildResponse(result);

  } catch (error) {
    return buildResponse({ success: false, message: error.message, stack: error.stack });
  }
}

function buildResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Utility Function to get internal spreadsheet ID
function getInternalSpreadsheetId(publicId) {
  if (!publicId) throw new Error("Public Restaurant ID is missing");
  const masterSS = getMasterSpreadsheet();
  const sheet = masterSS.getSheetByName("Restaurants");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === publicId) {
      if (data[i][4] === "Suspended") throw new Error("Restaurant is suspended");
      return data[i][1]; // SpreadsheetID
    }
  }
  throw new Error("Restaurant not found for ID: " + publicId);
}

// Utility Function to get sheet by Public ID
function getRestaurantSheet(publicId, sheetName) {
  const spreadsheetId = getInternalSpreadsheetId(publicId);
  const ss = SpreadsheetApp.openById(spreadsheetId);
  return ss.getSheetByName(sheetName);
}

// Utility to convert sheet data to array of objects
function sheetDataToObjects(data) {
  if (!data || data.length < 2) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function getMenu(restaurantId) {
  const sheet = getRestaurantSheet(restaurantId, "Menu");
  const data = sheet.getDataRange().getValues();
  const items = sheetDataToObjects(data);
  
  const catSheet = getRestaurantSheet(restaurantId, "Categories");
  const catData = catSheet.getDataRange().getValues();
  const categories = sheetDataToObjects(catData);
  
  return { success: true, menu: items, categories: categories };
}

function updateMenu(params) {
  const { restaurantId, actionType, item } = params; // actionType: add, edit, delete
  const sheet = getRestaurantSheet(restaurantId, "Menu");
  
  if (actionType === "add") {
    const id = Utilities.getUuid();
    sheet.appendRow([id, item.Category, item.Name, item.Description, item.Price, item.ImageURL, true]);
    
    // Auto-add category if missing
    const catSheet = getRestaurantSheet(restaurantId, "Categories");
    const catData = catSheet.getDataRange().getValues();
    let catExists = false;
    for (let i = 1; i < catData.length; i++) {
      if (catData[i][1] === item.Category) {
        catExists = true;
        break;
      }
    }
    if (!catExists && item.Category) {
      catSheet.appendRow([Utilities.getUuid(), item.Category, true]);
    }
    
    return { success: true, message: "Item added successfully" };
  } 
  else if (actionType === "edit" || actionType === "delete") {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === item.ID) {
        if (actionType === "delete") {
          sheet.deleteRow(i + 1);
          return { success: true, message: "Item deleted" };
        } else {
          sheet.getRange(i + 1, 2, 1, 6).setValues([[item.Category, item.Name, item.Description, item.Price, item.ImageURL, item.Available]]);
          return { success: true, message: "Item updated" };
        }
      }
    }
    return { success: false, message: "Item not found" };
  }
}

function addOrder(params) {
  const { restaurantId, tableNo, items, total, specialInstructions } = params;
  const sheet = getRestaurantSheet(restaurantId, "Orders");
  
  const orderId = "ORD-" + Utilities.getUuid().split('-')[0].toUpperCase();
  const timestamp = new Date().toISOString();
  
  // Convert items array to JSON string for storage
  const itemsStr = JSON.stringify(items);
  
  sheet.appendRow([orderId, tableNo, itemsStr, total, "Pending", specialInstructions || "", timestamp]);
  
  return { success: true, orderId: orderId, message: "Order placed successfully" };
}

function getOrders(restaurantId, statusFilter) {
  const sheet = getRestaurantSheet(restaurantId, "Orders");
  const data = sheet.getDataRange().getValues();
  let orders = sheetDataToObjects(data);
  
  // Parse JSON strings back to arrays
  orders = orders.map(o => {
    try {
      o.Items = JSON.parse(o.Items);
    } catch(e) {}
    return o;
  });

  if (statusFilter && statusFilter !== "All") {
    orders = orders.filter(o => o.Status === statusFilter);
  }
  
  return { success: true, data: orders.reverse() }; // newest first
}

function updateOrder(params) {
  const { restaurantId, orderId, status } = params;
  const sheet = getRestaurantSheet(restaurantId, "Orders");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === orderId) {
      sheet.getRange(i + 1, 5).setValue(status);
      
      // Update Analytics if Delivered
      if (status === "Delivered") {
        try {
          const total = parseFloat(data[i][3]) || 0;
          const analyticsSheet = getRestaurantSheet(restaurantId, "Analytics");
          const aData = analyticsSheet.getDataRange().getValues();
          const today = new Date().toISOString().split('T')[0];
          let found = false;
          
          for(let j=1; j<aData.length; j++) {
            if(String(aData[j][0]).startsWith(today)) {
              analyticsSheet.getRange(j+1, 2).setValue((parseFloat(aData[j][1]) || 0) + total);
              analyticsSheet.getRange(j+1, 3).setValue((parseInt(aData[j][2]) || 0) + 1);
              found = true;
              break;
            }
          }
          if(!found) {
            analyticsSheet.appendRow([today, total, 1]);
          }
        } catch(e) {}
      }
      
      return { success: true, message: "Order status updated to " + status };
    }
  }
  return { success: false, message: "Order not found" };
}

function loginStaff(params) {
  const { restaurantId, username, password } = params;
  if (!restaurantId || !username || !password) return { success: false, message: "Missing credentials" };
  
  const masterSS = getMasterSpreadsheet();
  const usersSheet = masterSS.getSheetByName("Users");
  const data = usersSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][4] === restaurantId && data[i][1] === username && data[i][2] === password) {
      const token = Utilities.getUuid();
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 12);
      
      usersSheet.getRange(i + 1, 6).setValue(token);
      usersSheet.getRange(i + 1, 7).setValue(expiry.toISOString());
      
      return { success: true, role: data[i][3], token: token, message: "Login successful" };
    }
  }
  return { success: false, message: "Invalid credentials" };
}

function validateSessionToken(token) {
  if (!token) return { valid: false };
  const masterSS = getMasterSpreadsheet();
  const usersSheet = masterSS.getSheetByName("Users");
  const data = usersSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === token) {
      if (new Date(data[i][6]) > new Date()) {
        return { valid: true, role: data[i][3], restaurantId: data[i][4] };
      } else {
        return { valid: false, message: "Session expired" };
      }
    }
  }
  return { valid: false, message: "Invalid token" };
}

function logoutStaff(params) {
  const { token } = params;
  if (!token) return { success: true };
  const masterSS = getMasterSpreadsheet();
  const usersSheet = masterSS.getSheetByName("Users");
  const data = usersSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === token) {
      usersSheet.getRange(i + 1, 6).clearContent();
      usersSheet.getRange(i + 1, 7).clearContent();
      return { success: true, message: "Logged out" };
    }
  }
  return { success: true };
}

function callWaiter(params) {
  const { restaurantId, tableNo } = params;
  const sheet = getRestaurantSheet(restaurantId, "WaiterCalls");
  
  const callId = "CALL-" + Utilities.getUuid().split('-')[0].toUpperCase();
  const timestamp = new Date().toISOString();
  
  sheet.appendRow([callId, tableNo, "Call", "Pending", timestamp]);
  return { success: true, message: "Waiter called successfully" };
}

function requestBill(params) {
  const { restaurantId, tableNo } = params;
  const sheet = getRestaurantSheet(restaurantId, "WaiterCalls");
  
  const callId = "BILL-" + Utilities.getUuid().split('-')[0].toUpperCase();
  const timestamp = new Date().toISOString();
  
  sheet.appendRow([callId, tableNo, "Bill", "Pending", timestamp]);
  return { success: true, message: "Bill requested successfully" };
}

function getWaiterCalls(restaurantId) {
  const sheet = getRestaurantSheet(restaurantId, "WaiterCalls");
  const data = sheet.getDataRange().getValues();
  const calls = sheetDataToObjects(data).filter(c => c.Status === "Pending");
  return { success: true, data: calls.reverse() };
}

function updateWaiterCall(params) {
  const { restaurantId, callId, status } = params;
  const sheet = getRestaurantSheet(restaurantId, "WaiterCalls");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === callId) {
      sheet.getRange(i + 1, 4).setValue(status);
      return { success: true, message: "Call status updated" };
    }
  }
  return { success: false, message: "Call not found" };
}

function getRestaurantSettings(params) {
  const { restaurantId } = params;
  try {
    const sheet = getRestaurantSheet(restaurantId, "Settings");
    const data = sheet.getDataRange().getValues();
    const settings = {};
    for (let i = 1; i < data.length; i++) {
      settings[data[i][0]] = data[i][1];
    }
    return { success: true, settings: settings };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

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

