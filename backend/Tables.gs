function getTables(restaurantId) {
  const sheet = getRestaurantSheet(restaurantId, "Tables");
  const data = sheet.getDataRange().getValues();
  const items = sheetDataToObjects(data);
  return { success: true, data: items };
}

function updateTable(params) {
  const { restaurantId, actionType, table } = params;
  const sheet = getRestaurantSheet(restaurantId, "Tables");
  
  if (actionType === "add") {
    // Generate QR link based on base URL (could be parameterized but sticking to logic)
    sheet.appendRow([table.TableNo, table.QRLink || ""]);
    return { success: true, message: "Table added successfully" };
  } else if (actionType === "edit" || actionType === "delete") {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == table.TableNo) { // Use loose equality in case of string/number mismatch
        if (actionType === "delete") {
          sheet.deleteRow(i + 1);
          return { success: true, message: "Table deleted" };
        } else {
          sheet.getRange(i + 1, 1, 1, 2).setValues([[table.TableNo, table.QRLink || data[i][1]]]);
          return { success: true, message: "Table updated" };
        }
      }
    }
    return { success: false, message: "Table not found" };
  }
}
