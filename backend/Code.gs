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
      
      // Menu & Categories Actions
      case "getMenu":
        result = getMenu(params.restaurantId);
        break;
      case "updateMenu":
        result = updateMenu(params);
        break;
      case "getCategories":
        result = getCategories(params.restaurantId);
        break;
      case "updateCategory":
        result = updateCategory(params);
        break;
      
      // Orders & Analytics Actions
      case "addOrder":
        result = addOrder(params);
        break;
      case "getOrders":
        result = getOrders(params.restaurantId, params.status);
        break;
      case "updateOrder":
        result = updateOrder(params);
        break;
      case "getAnalytics":
        result = getAnalytics(params.restaurantId);
        break;
      
      // Interaction Actions
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
      
      // Staff Actions
      case "loginStaff":
        result = loginStaff(params);
        break;
      case "logoutStaff":
        result = logoutStaff(params);
        break;
      case "getStaff":
        result = getStaff(params.restaurantId);
        break;
      case "updateStaff":
        result = updateStaff(params);
        break;

      // Settings Actions
      case "getRestaurantSettings":
        result = getRestaurantSettings(params);
        break;
      case "updateRestaurantSettings":
        result = updateRestaurantSettings(params);
        break;
      case "registerFcmToken":
        result = registerFcmToken(params);
        break;
        
      // Tables Actions
      case "getTables":
        result = getTables(params.restaurantId);
        break;
      case "updateTable":
        result = updateTable(params);
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
