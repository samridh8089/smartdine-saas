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

function getCategories(restaurantId) {
  const sheet = getRestaurantSheet(restaurantId, 'Categories');
  const data = sheet.getDataRange().getValues();
  const items = sheetDataToObjects(data);
  return { success: true, data: items };
}

function updateCategory(params) {
  const { restaurantId, actionType, category } = params;
  const sheet = getRestaurantSheet(restaurantId, 'Categories');
  
  if (actionType === 'add') {
    const id = category.ID || Utilities.getUuid();
    sheet.appendRow([id, category.Name, category.Active]);
    return { success: true, message: 'Category added successfully' };
  } else if (actionType === 'edit' || actionType === 'delete') {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === category.ID) {
        if (actionType === 'delete') {
          sheet.deleteRow(i + 1);
          return { success: true, message: 'Category deleted' };
        } else {
          sheet.getRange(i + 1, 1, 1, 3).setValues([[category.ID, category.Name, category.Active]]);
          return { success: true, message: 'Category updated' };
        }
      }
    }
    return { success: false, message: 'Category not found' };
  }
}
