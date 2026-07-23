/**
 * Retrieves or generates an OAuth2 access token for FCM HTTP v1 API.
 * Uses CacheService to reuse the token until it expires (usually 1 hour).
 */
function getFirebaseAccessToken() {
  const cache = CacheService.getScriptCache();
  const cachedToken = cache.get('firebase_access_token');
  const cachedProjectId = cache.get('firebase_project_id');
  
  if (cachedToken && cachedProjectId) {
    return { token: cachedToken, projectId: cachedProjectId };
  }

  const serviceAccountString = PropertiesService.getScriptProperties().getProperty("FIREBASE_SERVICE_ACCOUNT");
  if (!serviceAccountString) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT script property");
  
  const serviceAccount = JSON.parse(serviceAccountString);
  const privateKey = serviceAccount.private_key;
  const clientEmail = serviceAccount.client_email;
  const projectId = serviceAccount.project_id;
  
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  
  const encodeBase64Url = (obj) => Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
  const signatureInput = encodeBase64Url(header) + '.' + encodeBase64Url(claim);
  const signature = Utilities.computeRsaSha256Signature(signatureInput, privateKey);
  const jwt = signatureInput + '.' + Utilities.base64EncodeWebSafe(signature).replace(/=+$/, '');
  
  const options = {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', options);
  const data = JSON.parse(response.getContentText());
  
  if (!data.access_token) {
    throw new Error("Failed to generate access token: " + response.getContentText());
  }

  // Cache token for 55 minutes (3300 seconds) to be safe before 1 hr expiry
  cache.put('firebase_access_token', data.access_token, 3300);
  cache.put('firebase_project_id', projectId, 3300);
  
  return { token: data.access_token, projectId: projectId };
}

/**
 * Logs a push notification attempt
 */
var globalPushLogs = [];
function logPushNotification(restaurantId, orderId, status, responseText) {
globalPushLogs.push({ restaurantId, orderId, status, responseText });

  try {
    const timestamp = new Date().toISOString();
    console.log(`[PUSH LOG] Res: ${restaurantId} | Order: ${orderId} | Status: ${status} | Response: ${responseText}`);
    
    // Optionally append to a PushLogs sheet if it exists
    const sheet = getRestaurantSheet(restaurantId, "PushLogs");
    if (sheet) {
      sheet.appendRow([timestamp, orderId, status, responseText]);
    }
  } catch(e) {
    // Ignore if PushLogs sheet doesn't exist
  }
  
  // ALWAYS save the last log to properties for debugging
  try {
    PropertiesService.getScriptProperties().setProperty('LAST_PUSH_LOG', JSON.stringify({ timestamp: new Date().toISOString(), restaurantId, orderId, status, responseText }));
  } catch(e) {}
}

/**
 * Removes an invalid token from the stored array
 */
function removeInvalidToken(propKey, invalidToken) {
  try {
    const props = PropertiesService.getScriptProperties();
    const existing = props.getProperty(propKey);
    if (existing) {
      let tokens = JSON.parse(existing);
      tokens = tokens.filter(t => t !== invalidToken);
      props.setProperty(propKey, JSON.stringify(tokens));
      console.log(`Removed invalid token: ${invalidToken} from ${propKey}`);
    }
  } catch (e) {
    console.error("Failed to remove token", e);
  }
}

/**
 * Sends FCM Message using HTTP v1 API with retries and token cleanup
 */
function sendFcmMessage(token, payload, auth, propKey, restaurantId, orderId) {
  const url = `https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`;
  
  // Attach token to payload
  const finalPayload = {
    message: {
      token: token,
      ...payload
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + auth.token },
    payload: JSON.stringify(finalPayload),
    muteHttpExceptions: true
  };
  
  let attempts = 0;
  const maxRetries = 3;
  let success = false;
  
  while (attempts < maxRetries && !success) {
    attempts++;
    try {
      const response = UrlFetchApp.fetch(url, options);
      const code = response.getResponseCode();
      const responseText = response.getContentText();
      
      if (code === 200) {
        success = true;
        logPushNotification(restaurantId, orderId, "SUCCESS", responseText);
      } else {
        const resJson = JSON.parse(responseText);
        const errorCode = resJson.error && resJson.error.details && resJson.error.details[0] ? resJson.error.details[0].errorCode : "";
        
        if (code === 404 || code === 400 || errorCode === "UNREGISTERED" || errorCode === "INVALID_ARGUMENT" || errorCode === "SENDER_ID_MISMATCH") {
          // Token is dead, remove it and don't retry
          logPushNotification(restaurantId, orderId, "INVALID_TOKEN", responseText);
          removeInvalidToken(propKey, token);
          break;
        } else if (code >= 500) {
          // Server error, allow retry
          logPushNotification(restaurantId, orderId, `RETRY_${attempts}`, responseText);
          if (attempts < maxRetries) Utilities.sleep(1000 * attempts);
        } else {
          // Client error, don't retry
          logPushNotification(restaurantId, orderId, "FAILED", responseText);
          break;
        }
      }
    } catch(e) {
      logPushNotification(restaurantId, orderId, "ERROR", e.message);
      if (attempts < maxRetries) Utilities.sleep(1000 * attempts);
    }
  }
}

/**
 * Kitchen-specific notification wrapper
 */
function sendKitchenNotification(restaurantId, orderId, tableNo) {
  const propKey = 'fcm_' + restaurantId + '_Kitchen';
  PropertiesService.getScriptProperties().setProperty('LAST_PUSH_LOG', JSON.stringify({ step: 'Entered sendKitchenNotification', restaurantId }));
  const tokensStr = PropertiesService.getScriptProperties().getProperty(propKey);
  
  if (!tokensStr) {
    PropertiesService.getScriptProperties().setProperty('LAST_PUSH_LOG', JSON.stringify({ error: 'No tokens found', propKey, tokensStr }));
    return;
  }
  
  let tokens = [];
  try {
    tokens = JSON.parse(tokensStr);
  } catch(e) { 
    PropertiesService.getScriptProperties().setProperty('LAST_PUSH_LOG', JSON.stringify({ error: 'Failed to parse tokens JSON', message: e.message }));
    return; 
  }
  
  if (tokens.length === 0) {
    PropertiesService.getScriptProperties().setProperty('LAST_PUSH_LOG', JSON.stringify({ error: 'Tokens array is empty', propKey }));
    return;
  }
  
  const payload = {
    android: { priority: "HIGH" },
    data: {
      title: "New Order! Table " + tableNo,
      body: "Order " + orderId + " has arrived. Tap to view.",
      channel_id: "smartdine_kitchen",
      click_action: "FLUTTER_NOTIFICATION_CLICK"
    }
  };
  
  let auth;
  try {
    auth = getFirebaseAccessToken();
  } catch(e) {
    console.error("Failed to get FCM Auth: ", e);
    return;
  }
  
  // Send to all registered devices
  tokens.forEach(token => {
    console.log(`[sendKitchenNotification] Sending to token: ${token}`);
    sendFcmMessage(token, payload, auth, propKey, restaurantId, orderId);
  });
}

/**
 * Waiter-specific notification wrapper
 */
function sendWaiterNotification(restaurantId, tableNo, message) {
  const propKey = 'fcm_' + restaurantId + '_Waiter';
  const tokensStr = PropertiesService.getScriptProperties().getProperty(propKey);
  if (!tokensStr) return;
  
  let tokens = [];
  try {
    tokens = JSON.parse(tokensStr);
  } catch(e) { return; }
  
  if (tokens.length === 0) return;
  
  const payload = {
    android: { priority: "HIGH" },
    data: {
      title: "Waiter Call: Table " + tableNo,
      body: message || "A customer requested a waiter.",
      channel_id: "smartdine_waiter",
      click_action: "FLUTTER_NOTIFICATION_CLICK"
    }
  };
  
  let auth;
  try {
    auth = getFirebaseAccessToken();
  } catch(e) {
    console.error("Failed to get FCM Auth: ", e);
    return;
  }
  
  tokens.forEach(token => {
    sendFcmMessage(token, payload, auth, propKey, restaurantId, "WAITER_CALL");
  });
}

/**
 * Owner-specific notification wrapper
 */
function sendOwnerNotification(restaurantId, orderId, tableNo) {
  const propKey = 'fcm_' + restaurantId + '_Owner';
  const tokensStr = PropertiesService.getScriptProperties().getProperty(propKey);
  console.log(`[sendOwnerNotification] Attempting to send for ${restaurantId}. Tokens in storage: ${tokensStr}`);
  
  if (!tokensStr) {
    console.log(`[sendOwnerNotification] STOPPING: No tokens found in property ${propKey}`);
    return;
  }
  
  let tokens = [];
  try {
    tokens = JSON.parse(tokensStr);
  } catch(e) { 
    console.log(`[sendOwnerNotification] STOPPING: Failed to parse tokens JSON: ${e.message}`);
    return; 
  }
  
  if (tokens.length === 0) {
    console.log(`[sendOwnerNotification] STOPPING: Tokens array is empty for ${propKey}`);
    return;
  }
  
  const payload = {
    android: { priority: "HIGH" },
    data: {
      title: "New Order! Table " + tableNo,
      body: "Order " + orderId + " has been placed.",
      channel_id: "smartdine_owner",
      click_action: "FLUTTER_NOTIFICATION_CLICK"
    }
  };
  
  let auth;
  try {
    auth = getFirebaseAccessToken();
  } catch(e) {
    console.error("Failed to get FCM Auth: ", e);
    return;
  }
  
  tokens.forEach(token => {
    console.log(`[sendOwnerNotification] Sending to token: ${token}`);
    sendFcmMessage(token, payload, auth, propKey, restaurantId, orderId);
  });
}

function testFCMChain() {
  const testToken = "REPLACE_WITH_FCM_TOKEN_FROM_DEBUG_PANEL";
  const auth = getFirebaseAccessToken();
  
  if (testToken === "REPLACE_WITH_FCM_TOKEN_FROM_DEBUG_PANEL") {
     console.error("You must paste your real FCM token into testToken before running this test.");
     return;
  }
  
  const payload = {
    message: {
      token: testToken,
      android: { priority: 'HIGH' },
      data: {
        title: 'Test Chain Verification',
        body: 'If you hear the bell and the screen wakes, steps 6-8 are successful.',
        channel_id: 'smartdine_kitchen',
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      }
    }
  };

  const url = 'https://fcm.googleapis.com/v1/projects/' + auth.projectId + '/messages:send';
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + auth.token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  console.log(response.getResponseCode(), response.getContentText());
}