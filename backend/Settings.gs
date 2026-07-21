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

function registerFcmToken(params) {
  const { restaurantId, token, role } = params;
  if (!restaurantId || !token || !role) return { success: false, message: 'Missing parameters' };
  
  const propKey = 'fcm_' + restaurantId + '_' + role;
  const props = PropertiesService.getScriptProperties();
  
  let tokens = [];
  try {
    const existing = props.getProperty(propKey);
    if (existing) tokens = JSON.parse(existing);
  } catch(e) {}
  
  if (!tokens.includes(token)) {
    tokens.push(token);
    props.setProperty(propKey, JSON.stringify(tokens));
  }
  
  return { success: true, message: 'FCM Token registered' };
}

function updateRestaurantSettings(params) {
  const { restaurantId, settings } = params;
  try {
    const sheet = getRestaurantSheet(restaurantId, 'Settings');
    const data = sheet.getDataRange().getValues();
    
    for (const key in settings) {
      let found = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue(settings[key]);
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow([key, settings[key]]);
      }
    }
    return { success: true, message: 'Settings updated' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
