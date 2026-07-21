export const GAS_URL = "https://script.google.com/macros/s/AKfycbx6-eBU5-NKIrM0VEUJgTHlEbzkpbFTCo_wlA_Eh7_t6l6A4dwAvC1WthqfJ4oxZ9mA/exec";

export async function gasRequest(action, payload = {}) {
  if (GAS_URL === "MOCK" || GAS_URL.includes("YOUR_SCRIPT_ID")) {
    console.warn("GAS_URL is not set. Please set your Web App URL in localStorage using localStorage.setItem('GAS_URL', 'your_url_here') or update src/api/gas.js directly.");
    alert("Backend URL is not configured. Please see the console.");
    return { success: false, message: "Backend URL not configured" };
  }

  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // text/plain avoids CORS preflight
      },
      body: JSON.stringify({ action, ...payload })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("GAS Request Error:", error);
    return { success: false, message: "Network error or backend failure: " + error.message };
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
