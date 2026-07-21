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

function getStaff(restaurantId) {
  const sheet = getRestaurantSheet(restaurantId, 'Staff');
  const data = sheet.getDataRange().getValues();
  const items = sheetDataToObjects(data).map(s => {
    return { StaffID: s.Username, Name: s.Username, Role: s.Role, Username: s.Username, Status: s.Status };
  });
  return { success: true, data: items };
}

function updateStaff(params) {
  const { restaurantId, actionType, staff } = params;
  const sheet = getRestaurantSheet(restaurantId, 'Staff');
  
  if (actionType === 'add') {
    sheet.appendRow([staff.Username, staff.Password, staff.Role, staff.Status]);
    return { success: true, message: 'Staff added successfully' };
  } else if (actionType === 'edit' || actionType === 'delete') {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === staff.Username) {
        if (actionType === 'delete') {
          sheet.deleteRow(i + 1);
          return { success: true, message: 'Staff deleted' };
        } else {
          const pass = staff.Password ? staff.Password : data[i][1];
          sheet.getRange(i + 1, 1, 1, 4).setValues([[staff.Username, pass, staff.Role, staff.Status]]);
          return { success: true, message: 'Staff updated' };
        }
      }
    }
    return { success: false, message: 'Staff not found' };
  }
}
