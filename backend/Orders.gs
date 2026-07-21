function addOrder(params) {
  const { restaurantId, tableNo, items, total, specialInstructions } = params;
  const sheet = getRestaurantSheet(restaurantId, "Orders");
  
  const orderId = "ORD-" + Utilities.getUuid().split('-')[0].toUpperCase();
  const timestamp = new Date().toISOString();
  
  // Convert items array to JSON string for storage
  const itemsStr = JSON.stringify(items);
  
  sheet.appendRow([orderId, tableNo, itemsStr, total, "Pending", specialInstructions || "", timestamp]);
  
  // Try to send push notification to all Kitchen devices
  try {
    sendKitchenNotification(restaurantId, orderId, tableNo);
  } catch(e) {
    // Fail silently if push fails, order should still be placed
    console.error("Push Error: ", e);
  }
  
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
