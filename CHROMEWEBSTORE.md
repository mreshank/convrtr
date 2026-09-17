# convrtr — Chrome Web Store Listing & Readiness

Single source of truth for the Chrome Web Store listing metadata, permissions justifications, privacy disclosures, and version history for **convrtr**.

**Last Updated:** 2026-09-17  
**Current Version:** 0.2.2  
**Manifest Version:** 3  

---

## 1. Store Listing Metadata

### Name
```
convrtr — File Converter
```

### Single Purpose Statement (for Developer Dashboard)
```
Converts files and web media directly within your browser using local WebAssembly processing.
```

### Short Description (max 132 characters)
```
Private in-browser file converter. Convert media and documents locally using WebAssembly with zero server uploads.
```
*(Length: 119 characters)*

### Detailed Description (Plain Text Format)
```
convrtr is a private, client-side file converter that runs entirely inside your browser.

Convert images, audio, video, and documents locally without uploading your files to remote servers. No account registration, no server queues, and no network latency.

FEATURES:
• Native Side Panel — Open convrtr beside your active browser tab to convert files without switching windows.
• Quick Popup & Studio Views — Convert files in a compact popup via keyboard shortcut (Command+Shift+Comma) or expand into a full-screen workspace.
• Context Menu Conversion — Right-click images, media elements, or links on any webpage to stage and convert them directly.
• Visible Viewport Capture — Capture the visible portion of your current browser tab (Command+Shift+S) and stage it directly for conversion.
• Webpage Media Staging — Stage images, audio, video, and vector graphics from web pages into the converter with a single click.
• Omnibox Navigation — Type "cv" in Chrome's address bar to quickly find supported conversion options.
• 100% Client-Side Processing — All file processing runs locally on your machine via WebAssembly and Web Workers.
• Complete Privacy — Zero files or telemetry are transmitted across the network. Works completely offline.

HOW TO USE:
1. Click the convrtr extension icon in your Chrome toolbar to open the Side Panel.
2. Drag and drop a file or select one from your computer.
3. Choose your target format.
4. Click Convert to process the file locally and save the result to your Downloads folder.

PRIVACY & SECURITY:
convrtr is designed from the ground up for privacy. It does not collect, store, or transmit personal data or file contents. All conversions occur entirely on your local machine using client-side WebAssembly, Canvas, and Web Workers.

PERMISSIONS:
• sidePanel: Displays the converter beside your active tab for side-by-side workflow.
• storage: Passes temporary session references between background events and the converter interface. No browsing history or personal data is stored.
• contextMenus: Lets you right-click web media or links to stage them for conversion.
• tabs: Opens the converter in a full browser tab when requested and identifies the active window for side panel display.
• downloads: Saves converted output files to your Downloads folder.
• scripting: Inspects media elements on the active page to stage them into the converter upon explicit user request.
• activeTab: Grants temporary, user-invoked access to capture the visible tab or stage media upon explicit command without broad host permissions.

SUPPORT & CONTACT:
Email: contact@mreshank.com
Help & Diagnostic Center: https://convrtr.mreshank.com/support
Privacy Policy: https://convrtr.mreshank.com/privacy
Source Code & Issues: https://github.com/mreshank/convrtr

Version 0.2.2 — Compliance release streamlining store metadata and reinforcing client-side single-purpose file conversion.
```

### Category
```
Productivity
```

### Language
```
English
```

### Homepage URL
```
https://convrtr.mreshank.com
```

### Support URL
```
https://convrtr.mreshank.com/support
```

### Privacy Policy URL
```
https://convrtr.mreshank.com/privacy
```

### Store Listing Visual Assets (in `store-assets/`)
- **Store Icon (128x128):** `store-assets/icon-128.png`
- **Screenshot 1 — Full Tab Studio (1280x800):** `store-assets/screenshot-1-tab-studio.png`
- **Screenshot 2 — Docked Side Panel (1280x800):** `store-assets/screenshot-2-sidepanel.png`
- **Screenshot 3 — Quick Popup (1280x800):** `store-assets/screenshot-3-popup.png`
- **Small Promo Tile (440x280):** `store-assets/promo-small-tile.png`
- **Marquee Promo Tile (1400x560):** `store-assets/promo-marquee-tile.png`

---

## 2. Permissions Justification

Every permission declared in `manifest.json` is justified below for the Chrome Web Store review team:

| Permission | Specific Reason Required for Functionality |
| :--- | :--- |
| `sidePanel` | Allows convrtr to open in Chrome's native Side Panel dock, allowing users to drag and drop files and monitor conversion progress without switching away from their current web page. |
| `storage` | Uses `chrome.storage.session` to pass ephemeral file references (such as media URLs, text snippets, or screenshots) from background events into the converter interface. No personal data or browsing history is stored. |
| `contextMenus` | Creates context menu entries ("Convert image with convrtr", "Capture visible page to convrtr", "Extract all media on page", etc.) when right-clicking on web pages. |
| `tabs` | Identifies the current browser window ID so the side panel opens in the user's active window, captures the visible tab viewport when requested, and allows opening the Full Tab Studio (`tab.html`) upon user request. |
| `downloads` | Saves completed conversion outputs, transformed images/audio/video, and batch ZIP archives to the user's local disk via Chrome's native download manager. |
| `scripting` | Executes non-intrusive DOM queries to discover and extract media (images, audio/video sources, canvases, inline SVGs, and linked documents) on the active page when explicitly invoked by the user. |
| `activeTab` | Grants temporary permission to capture the active tab's visible area (`chrome.tabs.captureVisibleTab`) or extract media when explicitly initiated by user gesture (`Command+Shift+S`, context menu, or extension button). Eliminates the need for broad host permissions, maximizing user privacy and fast-tracking store review. |

---

## 3. Privacy & Data Use Disclosure

- **Does this extension collect user data?** No.
- **Does this extension transmit user data to remote servers?** No.
- **Does this extension use analytics, tracking, or telemetry?** No.
- **Data storage:** Minimal ephemeral session state stored in `chrome.storage.session` for passing file handoffs between browser contexts. Cleared immediately upon window close.
- **Processing architecture:** 100% client-side WebAssembly, JavaScript, Web Workers, and Canvas. All files remain in local memory on the user's device.

---

## 4. Version History

### 0.2.2 — 2026-09-17
- Resolved Chrome Web Store "Yellow Nickel" spam policy review flag.
- Streamlined store listing metadata, eliminating keyword stuffing and format permutation chains.
- Formulated clear Single Purpose statement: in-browser file conversion via local WebAssembly.
- Bumped extension version to 0.2.2 for package resubmission.

### 0.2.1 — 2026-09-16
- Defaulted primary toolbar action to native Chrome Side Panel.
- Added dedicated shortcut (`Command+Shift+Comma` / `Ctrl+Shift+Comma`) to launch the Quick Popup anytime.
- Added bidirectional navigation controls (`POPUP ↗` in side panel, `DOCK IN SIDE PANEL ↗` in popup).
- Added right-click context menu shortcuts for both Side Panel and Quick Popup.
- Strict zero-emojis styling enforcement across all surfaces, copy, and code.

### 0.2.0 — 2026-09-16
- Added Viewport Screenshot Capture (`capture_tab` shortcut `Command+Shift+S` / `Ctrl+Shift+S`, header button, and context menu).
- Added Deep Webpage Asset & Vector Extraction (images, audio/video sources, HTML5 canvases, inline SVGs serialized as standalone `.svg` files, and linked documents).
- Added Dynamic Toolbar Icon Badging (RUN status with count, DONE in green accent, ERR in red).
- Added Quick Workflow Presets Bar.
- Added Conversion History live search filter and CSV/JSON export buttons.
- Added Omnibox search keyword `cv` for quick format matching from the Chrome address bar.
- Manifest V3 permissions upgraded with `activeTab` and `scripting`.

### 0.1.0 — 2026-09-16
- Initial release of the universal convrtr Chrome Extension.
- Direct shared engine architecture with all 200 tools and 147 local engines.
- Chrome Side Panel (`sidepanel.html`), Quick Popup (`popup.html`), and Full Tab Studio (`tab.html`).
- Intelligent multi-hop conversion graph routing.
- Context menu integration for converting web images, audio, video, and links.
- High-contrast dark mode aesthetics with responsive queue controls.
