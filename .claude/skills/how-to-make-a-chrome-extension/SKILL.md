---
name: chrome-extension-development
description: Core capability for developing, debugging, and packaging modern Chrome Extensions using Manifest V3 and the Chrome Extensions API.
when_to_use: Use this skill whenever creating browser extension code, configuring manifest.json, setting up background service workers, implementing content scripts, configuring UI elements (popups, sidebars), handling cross-context communication, or resolving Manifest V3 constraints.
allowed-tools: [ReadFile, WriteFile, MakeDirectory, ListFiles, Grep, Terminal]
effort: high
---

# Chrome Extension Development Capability

This document provides a comprehensive operational guide for developing Google Chrome browser extensions using Manifest V3 (MV3). It details architecture, context isolation, asynchronous APIs, security requirements, and debugging paradigms.

## 1. Extension Architecture & Contexts

A Chrome extension is a decoupled multi-process application execution environment. You must write code respecting the strict isolation of its core components:

* **Manifest (`manifest.json`):** The declarative entry point. Defines metadata, permissions, resource routing, and register scripts.
* **Background Service Worker:** The extension's event-driven backbone. It runs in a distinct execution context, is completely isolated from the web page DOM, and is **ephemeral** (spins up on browser events, tears down when idle). Global in-memory variables do not persist.
* **Content Scripts:** Scripts executed in the context of a target web page. They share the DOM with the host page but operate within an **Isolated World** execution space—they cannot access the host page's JavaScript variables or functions directly, protecting security and stability.
* **UI Elements (Popup, Options, Side Panel):** Standard HTML/CSS/JS execution environments that run within the extension's privileged process. They have full access to `chrome.*` APIs while open.

---

## 2. Complete Manifest V3 Structure

Below is a production-ready, fully expanded `manifest.json` boilerplate mapping all standard modern execution boundaries.

```json
{
  "manifest_version": 3,
  "name": "Production Extension Boilerplate",
  "version": "1.0.0",
  "description": "Comprehensive template demonstrating standard MV3 features.",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "ui/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  },
  "options_ui": {
    "page": "ui/options.html",
    "open_in_tab": false
  },
  "side_panel": {
    "default_path": "ui/sidepanel.html"
  },
  "content_scripts": [
    {
      "matches": ["https://*[.example.com/](https://.example.com/)*", "http://localhost/*"],
      "js": ["scripts/content.js"],
      "css": ["styles/content.css"],
      "run_at": "document_idle",
      "all_frames": false
    }
  ],
  "permissions": [
    "storage",
    "tabs",
    "activeTab",
    "scripting",
    "alarms",
    "sidePanel"
  ],
  "host_permissions": [
    "[https://api.example.com/](https://api.example.com/)*"
  ],
  "web_accessible_resources": [
    {
      "resources": ["images/logo.png"],
      "matches": ["https://*[.example.com/](https://.example.com/)*"]
    }
  ]
}
```

---

## 3. Ephemeral Background Service Workers

Because the background worker shuts down after periods of inactivity, you must register event listeners synchronously at the top level of the script and leverage storage for persistent state tracking.

```javascript
// background.js

// 1. Initial Setup via Installation Listener
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // Populate default state into storage
    await chrome.storage.local.set({
      extensionEnabled: true,
      apiToken: null,
      requestCount: 0
    });
    console.log("Extension initialized successfully.");
  }
});

// 2. Alarm API for Cron/Periodic tasks instead of setInterval
chrome.alarms.create("syncDataAlarm", { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncDataAlarm") {
    performBackgroundSync();
  }
});

// 3. Keep-alive safe processing async function
async function performBackgroundSync() {
  const { apiToken } = await chrome.storage.local.get("apiToken");
  if (!apiToken) return;

  try {
    const response = await fetch("[https://api.example.com/sync](https://api.example.com/sync)", {
      headers: { "Authorization": `Bearer ${apiToken}` }
    });
    const data = await response.json();
    console.log("Data synced successfully:", data);
  } catch (error) {
    console.error("Sync failed:", error);
  }
}
```

---

## 4. Content Scripts & DOM Orchestration

Content scripts can parse, modify, and inject elements into the DOM. They run automatically based on the manifest `matches` block or can be dynamically injected.

```javascript
// scripts/content.js

console.log("Content script injected and executing inside Isolated World.");

// Standard DOM mutation/Read operations
function injectControlPanel() {
  const container = document.createElement("div");
  container.id = "ext-control-panel";
  container.style.cssText = "position: fixed; top: 10px; right: 10px; z-index: 99999; padding: 10px; background: white; border: 1px solid #ccc;";
  
  const button = document.createElement("button");
  button.innerText = "Extract Page Data";
  button.addEventListener("click", handleExtraction);
  
  container.appendChild(button);
  document.body.appendChild(container);
}

function handleExtraction() {
  const pageTitle = document.title;
  const headings = Array.from(document.querySelectorAll("h1, h2")).map(h => h.innerText);
  
  // Forward data to background worker since content script cannot make arbitrary cross-origin requests
  chrome.runtime.sendMessage({
    action: "PROCESS_PAGE_DATA",
    payload: { title: pageTitle, headings }
  }, (response) => {
    console.log("Background acknowledged receipt:", response);
  });
}

// Ensure execution safety based on page state
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectControlPanel);
} else {
  injectControlPanel();
}
```

---

## 5. Cross-Context Message Passing

Communication across execution contexts uses standard message passing signatures. asynchronous handlers must return `true` explicitly to keep the communication channel open.

### Sending Message (Content Script or Popup to Background)
```javascript
// ui/popup.js or scripts/content.js
async function triggerBackgroundProcess() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "FETCH_USER_PROFILE",
      userId: "usr_99X"
    });
    console.log("Profile Data received in UI:", response);
  } catch (error) {
    console.error("Message passing pipeline failed:", error);
  }
}
```

### Receiving and Processing Message Asynchronously (Background)
```javascript
// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "FETCH_USER_PROFILE") {
    // CRITICAL: Return true to indicate the response will be sent asynchronously.
    // Without 'return true', sendResponse becomes invalid immediately.
    executeAsyncFetch(message.userId)
      .then(data => sendResponse({ success: true, profile: data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
      
    return true; 
  }
});

async function executeAsyncFetch(userId) {
  const res = await fetch(`https://api.example.com/users/${userId}`);
  if (!res.ok) throw new Error("Network response error");
  return res.json();
}
```

### Sending Message (Background to Specific Tab Content Script)
```javascript
// background.js
async function notifyTab(tabId, updates) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: "DOM_UPDATE_TRIGGER",
      data: updates
    });
  } catch (error) {
    console.error("Target tab context not available or script not ready:", error);
  }
}
```

---

## 6. Secure State Storage Management

`localStorage` is blocked inside MV3 service workers. All extensions must use `chrome.storage`.

* `chrome.storage.local`: Local persistent data (Max 5MB standard; extended via `unlimitedStorage` permission).
* `chrome.storage.sync`: Automatically synced across user profiles linked to Google Accounts (Max 100KB total, 8KB per individual key).
* `chrome.storage.session`: In-memory volatile runtime state storage. Excellent for non-persistent security credentials or transient operational flags.

```javascript
// Storing structured data using modern async-await wrappers
async function saveUserSettings(userId, configurationObject) {
  await chrome.storage.local.set({
    currentUser: userId,
    config: configurationObject,
    lastSaved: Date.now()
  });
}

// Querying partial keys
async function getUserSettings() {
  const store = await chrome.storage.local.get(["currentUser", "config"]);
  return {
    user: store.currentUser || "Guest",
    settings: store.config || {}
  };
}

// Global state monitoring (Reactive Architecture pattern)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.config) {
    console.log("Configuration state changed dynamically!");
    console.log("Old State:", changes.config.oldValue);
    console.log("New State:", changes.config.newValue);
  }
});
```

---

## 7. Mandatory Manifest V3 Security Constraints

* **No Remotely Hosted Code:** Every byte of executable logic (excluding text/JSON payloads) must be packed locally into the `.crx` file. You cannot point script tags to external CDN URLs, nor fetch JavaScript to execute via `eval()` or `new Function()`.
* **Content Security Policy (CSP):** The default MV3 CSP explicitly blocks remote script evaluations. If communication with external sandboxes is required, they must be contained inside isolated extension `iframe` sandboxes specified in the manifest.
* **Declarative Net Request (DNR):** Blocking network modifications via `chrome.webRequest.onBeforeRequest` is deprecated for non-enterprise profiles. You must use `chrome.declarativeNetRequest` to supply rules arrays telling the browser how to intercept and modify headers/requests declarations natively.

---

## 8. Testing and Diagnostic Workflows

1.  **Installation and Sideloading:**
    * Navigate directly to `chrome://extensions/`.
    * Enable the **Developer mode** switch in the upper right quadrant.
    * Click **Load unpacked** and select the top-level project directory containing `manifest.json`.
2.  **Targeted Context Inspections:**
    * *Popup context*: Right-click the active extension icon toolbar and choose **Inspect popup**.
    * *Service Worker context*: On `chrome://extensions/`, click the blue active **service worker** hyperlink inside the target extension module to spin up a dedicated DevTools interface.
    * *Content Script context*: Press F12 on the target webpage. In the DevTools Console tab, look for the execution context dropdown selector (defaults to "top"). Switch it to the name of your extension to run live commands against the Isolated World context.
3.  **Hard Reload Cycles:** Whenever you modify structural configurations in `manifest.json` or rewrite synchronous lines inside the background service worker, you must click the circular **Reload** icon on the `chrome://extensions/` dashboard card to force compile updates into the execution instances.
---