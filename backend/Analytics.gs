function getAnalytics(restaurantId) {
  try {
    const ordersSheet = getRestaurantSheet(restaurantId, "Orders");
    const data = ordersSheet.getDataRange().getValues();
    const orders = sheetDataToObjects(data);

    let todaySales = 0;
    let weekSales = 0;
    let monthSales = 0;
    let ordersCount = 0;
    
    let itemCounts = {};

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    orders.forEach(o => {
      // Only count completed/delivered or all orders? Usually all paid or delivered. Let's count all non-cancelled. 
      // For simplicity in this mock, we'll count all valid orders.
      if (!o.Timestamp) return;

      const orderDate = new Date(o.Timestamp);
      const orderTotal = parseFloat(o.Total) || 0;
      
      ordersCount++;

      // Daily
      if (o.Timestamp.startsWith(todayStr)) {
        todaySales += orderTotal;
      }
      
      // Weekly
      if (orderDate >= oneWeekAgo) {
        weekSales += orderTotal;
      }

      // Monthly
      if (orderDate >= oneMonthAgo) {
        monthSales += orderTotal;
      }

      // Items
      try {
        let items = JSON.parse(o.Items);
        items.forEach(item => {
          if (!itemCounts[item.name]) itemCounts[item.name] = 0;
          itemCounts[item.name] += item.qty;
        });
      } catch (e) {}
    });

    let bestSelling = Object.keys(itemCounts).map(name => {
      return { Name: name, Sold: itemCounts[name] };
    });
    
    // Sort descending by Sold
    bestSelling.sort((a, b) => b.Sold - a.Sold);

    return { 
      success: true, 
      data: {
        todaySales: todaySales,
        weekSales: weekSales,
        monthSales: monthSales,
        ordersCount: ordersCount,
        bestSelling: bestSelling.slice(0, 5) // Top 5
      } 
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
