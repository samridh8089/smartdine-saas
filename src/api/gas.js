export const GAS_URL = "https://script.google.com/macros/s/AKfycbxDLNRRjUSeMqev084sI20vt0ckA4RtuTWDAXU-8HOC_BwpJ6lK6e7amRBph6oC2rV7/exec";

export async function gasRequest(action, payload = {}) {
  if (GAS_URL === "MOCK" || GAS_URL.includes("YOUR_SCRIPT_ID")) {
    console.warn("GAS_URL is not set.");
    alert("Backend URL is not configured. Please see the console.");
    return { success: false, message: "Backend URL not configured" };
  }

  try {
    console.log(`[gasRequest] Initiating fetch for action: ${action}`);
    console.log(`[gasRequest] Target URL: ${GAS_URL}`);
    console.log(`[gasRequest] HTTP Method: POST`);
    console.log(`[gasRequest] Headers: {"Content-Type": "text/plain;charset=utf-8"}`);
    console.log(`[gasRequest] Payload:`, JSON.stringify({ action, ...payload }, null, 2));
    
    const startTime = performance.now();
    
    // Create an AbortController for fetch timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // text/plain avoids CORS preflight
      },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const endTime = performance.now();
    
    console.log(`[gasRequest] Response status: ${response.status}`);
    console.log(`[gasRequest] Response time: ${(endTime - startTime).toFixed(2)}ms`);
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`[gasRequest] Parsed JSON result for ${action}:`, result);
    return result;
  } catch (error) {
    console.error(`[gasRequest] Error for ${action}:`, error);
    
    let errorMsg = error.message;
    if (error.name === 'AbortError') {
      errorMsg = "Request timed out after 15 seconds. Please check your internet connection.";
    }
    
    return { success: false, message: "Network error or backend failure: " + errorMsg };
  }
}

// Adaptive Polling Helper
export function startPolling(fn, baseInterval = 2000) {
  let interval = baseInterval;
  let timerId;
  let idleTimeout;

  const loop = async () => {
    await fn();
    timerId = setTimeout(loop, interval);
  };
  
  fn().then(() => {
    timerId = setTimeout(loop, interval);
  });

  const resetIdle = () => {
    interval = baseInterval;
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => { interval = baseInterval * 3; }, 60000);
  };

  window.addEventListener('mousemove', resetIdle);
  window.addEventListener('keydown', resetIdle);
  window.addEventListener('touchstart', resetIdle);
  resetIdle();

  return {
    stop: () => {
      clearTimeout(timerId);
      clearTimeout(idleTimeout);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
    }
  };
}

export function stopPolling(pollObj) {
  if (pollObj && typeof pollObj.stop === 'function') pollObj.stop();
  else if (pollObj) clearInterval(pollObj);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW Reg:', reg.scope))
      .catch(err => console.error('SW Fail:', err));
  });
}
