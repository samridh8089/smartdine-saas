import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { PushNotifications } from '@capacitor/push-notifications';
import { Haptics } from '@capacitor/haptics';
import buildInfo from './build-info.json';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

class DebugLogger {
  constructor() {
    this.state = {
      appVersion: APP_VERSION,
      buildTime: buildInfo.buildTime || 'unknown',
      commit: buildInfo.commit || 'unknown',
      androidVersion: 'unknown',
      deviceModel: 'unknown',
      capacitorVersion: 'unknown',
      networkStatus: 'unknown',
      pushPermission: 'unknown',
      fcmToken: 'none',
      pollingStatus: 'inactive',
      realtimeStatus: 'inactive',
      lastOrder: 'none',
      lastWaiterCall: 'none',
      lastNotification: 'none',
      lastNotificationError: 'none',
      audioLoaded: false,
      audioUnlocked: false,
      lastApiReq: 'none',
      lastApiRes: 'none',
      lastApiErr: 'none',
    };
    this.tapCount = 0;
    this.tapTimer = null;
    this.init();
  }

  async init() {
    if (import.meta.env.VITE_DEBUG === 'false') return;

    try {
      const info = await Device.getInfo();
      this.state.deviceModel = info.model;
      this.state.androidVersion = info.osVersion;
      this.state.capacitorVersion = info.capacitorVersion || 'N/A';
    } catch(e) {}

    try {
      const net = await Network.getStatus();
      this.state.networkStatus = net.connected ? `Online (${net.connectionType})` : 'Offline';
      Network.addListener('networkStatusChange', status => {
        this.setStatus('networkStatus', status.connected ? `Online (${status.connectionType})` : 'Offline');
      });
    } catch(e) {}

    this.injectUI();
  }

  setStatus(key, value) {
    if (this.state.hasOwnProperty(key)) {
      this.state[key] = value;
      this.render();
    }
  }

  logEvent(name, data) {
    if (name === 'order') this.setStatus('lastOrder', JSON.stringify(data));
    if (name === 'waiterCall') this.setStatus('lastWaiterCall', JSON.stringify(data));
    if (name === 'notification') this.setStatus('lastNotification', JSON.stringify(data));
    if (name === 'notificationError') this.setStatus('lastNotificationError', JSON.stringify(data));
    if (name === 'apiReq') this.setStatus('lastApiReq', JSON.stringify(data));
    if (name === 'apiRes') this.setStatus('lastApiRes', JSON.stringify(data));
    if (name === 'apiErr') this.setStatus('lastApiErr', JSON.stringify(data));
    this.render();
  }

  injectUI() {
    if (!document.getElementById('app-version-trigger')) {
      const trigger = document.createElement('div');
      trigger.id = 'app-version-trigger';
      trigger.innerHTML = `v${this.state.appVersion}`;
      trigger.style.position = 'fixed';
      trigger.style.bottom = '10px';
      trigger.style.right = '10px';
      trigger.style.fontSize = '10px';
      trigger.style.color = 'rgba(255,255,255,0.3)';
      trigger.style.zIndex = '9999';
      document.body.appendChild(trigger);

      trigger.addEventListener('click', () => {
        this.tapCount++;
        if (this.tapTimer) clearTimeout(this.tapTimer);
        this.tapTimer = setTimeout(() => { this.tapCount = 0; }, 2000);
        
        if (this.tapCount >= 5) {
          this.tapCount = 0;
          this.togglePanel();
        }
      });
    }

    const panel = document.createElement('div');
    panel.id = 'debug-panel-overlay';
    panel.style.display = 'none';
    panel.style.position = 'fixed';
    panel.style.top = '0';
    panel.style.left = '0';
    panel.style.width = '100vw';
    panel.style.height = '100vh';
    panel.style.backgroundColor = 'rgba(0,0,0,0.95)';
    panel.style.color = '#0f0';
    panel.style.zIndex = '10000';
    panel.style.overflowY = 'auto';
    panel.style.padding = '20px';
    panel.style.fontFamily = 'monospace';
    panel.style.fontSize = '12px';
    
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #0f0; padding-bottom:10px; margin-bottom:10px;">
        <h2 style="margin:0; color:#0f0;">Debug Panel</h2>
        <button id="debug-close-btn" style="background:#0f0; color:#000; border:none; padding:5px 10px; cursor:pointer;">Close</button>
      </div>
      <div id="debug-content"></div>
      <div style="margin-top:20px; display:flex; gap:10px; flex-wrap:wrap;">
        <button id="btn-test-bell" style="background:#333; color:#0f0; border:1px solid #0f0; padding:8px;">Test Bell</button>
        <button id="btn-test-notif" style="background:#333; color:#0f0; border:1px solid #0f0; padding:8px;">Test FCM</button>
        <button id="btn-test-vib" style="background:#333; color:#0f0; border:1px solid #0f0; padding:8px;">Test Vibration</button>
        <button id="btn-test-api" style="background:#333; color:#0f0; border:1px solid #0f0; padding:8px;">Test API</button>
        <button id="btn-copy-report" style="background:#333; color:#0f0; border:1px solid #0f0; padding:8px;">Copy Report</button>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById('debug-close-btn').addEventListener('click', () => this.togglePanel());
    
    document.getElementById('btn-test-bell').addEventListener('click', () => {
      const bell = document.getElementById('bellSound');
      if (bell) {
        bell.play().then(() => {
          this.setStatus('audioUnlocked', true);
          setTimeout(() => { bell.pause(); bell.currentTime = 0; }, 1000);
        }).catch(e => {
          this.setStatus('audioUnlocked', false);
          this.setStatus('lastAudioError', e.message);
        });
      } else {
        alert("No audio element found");
      }
    });

    document.getElementById('btn-test-vib').addEventListener('click', () => {
      Haptics.vibrate().catch(e => alert(e.message));
    });

    document.getElementById('btn-copy-report').addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(this.state, null, 2)).then(() => alert("Copied!"));
    });

    this.render();
  }

  togglePanel() {
    const p = document.getElementById('debug-panel-overlay');
    if (p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
  }

  render() {
    const content = document.getElementById('debug-content');
    if (!content) return;
    
    let html = '<table style="width:100%; border-collapse:collapse;">';
    for (const [key, val] of Object.entries(this.state)) {
      html += `<tr>
        <td style="padding:4px; border-bottom:1px solid #333; width:150px; font-weight:bold;">${key}</td>
        <td style="padding:4px; border-bottom:1px solid #333; word-break:break-all;">${val}</td>
      </tr>`;
    }
    html += '</table>';
    content.innerHTML = html;
  }
}

const instance = new DebugLogger();
window.DebugLogger = instance;
export default instance;
