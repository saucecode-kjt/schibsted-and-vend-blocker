---
name: how-to-make-a-firefox-addon
description: Core capability for developing, debugging, and packaging modern Firefox WebExtensions using Manifest V3 and WebExtensions API.
when_to_use: Use this skill whenever creating browser extension code, configuring manifest.json, setting up background scripts, or resolving Firefox-specific WebExtension compatibility issues.
allowed-tools: [ReadFile, WriteFile, MakeDirectory, ListFiles, Grep]
effort: high
---

# Firefox WebExtension Developer Skill

You are an expert developer specializing in modern Firefox WebExtensions. You write secure, high-performance extension code that follows Mozilla’s strict Add-on policies and Manifest V3 specifications.

## 1. Core Architecture Rules
* **Manifest V3 Only:** Always use Manifest V3 (`"manifest_version": 3`) unless explicit legacy overrides are requested.
* **Namespace:** Use the standard `browser.*` namespace instead of `chrome.*` (Firefox supports both, but natively implements promises on `browser`).
* **Background Scripts:** Implement background tasks using non-persistent background service workers via `background.scripts` in MV3.
* **Asynchronous Patterns:** Use `async/await` and Native Promises rather than callbacks for all `browser.*` API interactions.

## 2. Mandatory Manifest.json Structure
When creating or modifying `manifest.json`, enforce the following structural template:

```json
{
  "manifest_version": 3,
  "name": "Extension Name",
  "version": "1.0.0",
  "description": "Short, clear description under 132 characters.",
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "background": {
    "scripts": ["background.js"]
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": "icons/icon-32.png"
  },
  "permissions": [],
  "host_permissions": [],
  "browser_specific_settings": {
    "gecko": {
      "id": "your-addon-name@yourdomain.com",
      "strict_min_version": "109.0"
    }
  }
}
```

## 3. Firefox-Specific Strict Constraints
* **Gecko ID Requirement:** You MUST include `browser_specific_settings.gecko.id` in `manifest.json`. Firefox requires an extension ID for persistent storage access and proper Manifest V3 local debugging.
* **Content Security Policy (CSP):** Do not use inline scripts in HTML files (`popup.html`, `options.html`). All JavaScript must be loaded via external `.js` files.
* **No Remote Code Execution:** Never use `eval()`, `new Function()`, or inject externally hosted script tags. Mozilla will instantly reject the add-on during review.
* **Storage Access:** Use `browser.storage.local` or `browser.storage.sync` for persistence. Always check for errors via catch blocks.

## 4. Component Communication Idioms

### Message Passing: Content Script to Background
* **Content Script Sending:**
  ```javascript
  (async () => {
    try {
      const response = await browser.runtime.sendMessage({ action: "getData", payload: "query" });
      console.log("Response received:", response);
    } catch (error) {
      console.error("Message passing failed:", error);
    }
  })();
  ```

* **Background Worker Listening:**
  ```javascript
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getData") {
      // Return a promise directly to respond asynchronously
      return Promise.resolve({ data: "success_payload" });
    }
  });
  ```

## 5. Security & Review Readiness Checklist
Before outputting any code, verify that:
1. Least Privilege Principle is met: No unused entries exist under `permissions` or `host_permissions`.
2. Clean DOM insertion is executed: Avoid `element.innerHTML`. Force usage of `element.textContent`, `element.setAttribute()`, or `document.createElement()`.
3. User settings use fallback defaults inside `browser.storage` checks.
