# convrtr — Chrome Web Store Listing & Readiness

Single source of truth for the Chrome Web Store listing metadata, permissions justifications, privacy disclosures, and version history for **convrtr**.

**Last Updated:** 2026-09-16  
**Current Version:** 0.2.0  
**Manifest Version:** 3  

---

## 1. Store Listing Metadata

### Name
```
convrtr — Universal Local File Converter
```

### Short Description (max 132 characters)
```
Universal in-browser file converter. Convert, compress, transpile, extract, and decrypt files locally with zero server uploads.
```

### Detailed Description
```
convrtr is the universal, ultra-fast file conversion, compression, extraction, and media processing studio that runs 100% inside your browser.

No file uploads. No server queues. No size limits. Zero data leaves your computer.

KEY FEATURES:
• Universal Format Coverage: Convert images, video, audio, documents, e-books, archives, 3D models, retro gaming assets, vector graphics, and data files across 198+ dedicated tools and 146+ specialized local engines.
• Multi-Hop Graph Routing: Intelligent conversion routing traverses format paths automatically (e.g. CLIP → PNG → PDF, or XM → WAV → MP3) in a single step with live progress reporting.
• Native Chrome Side Panel: Dock convrtr beside your active browser tab. Drag and drop files from your desktop or web pages while you work.
• Page Viewport Capture (⌘⇧S): One-click screenshot capture of your active browser viewport staged directly into convrtr for instant conversion to WebP, PDF, or vector SVG.
• Deep Page Media & Asset Extraction: Extract responsive images, video/audio sources, canvas renders, inline vector SVGs, and linked documents from any web page in 1 click.
• Quick Context Menus: Right-click any image, video, audio file, selected code/text, or link on any webpage and select "Convert with convrtr" to stage and process it instantly.
• Address Bar Omnibox (cv): Type "cv png to webp" or "cv pdf" directly into your Chrome address bar for instant format search and jump-to-converter navigation.
• Quick Workflow Presets: Instant one-click chips for popular workflows (PNG➔WEBP, JPG➔WEBP, RASTER➔SVG, PDF➔TXT, SVG➔PNG, JSON➔YAML, MP4➔MP3).
• Dynamic Icon Badging: Live status badge (RUN, DONE, ERR) directly on your toolbar icon so you always know when batch processing finishes.
• History Drawer & Export: Search past conversions, preview file sizes and duration, and export full history records as CSV or JSON.
• Complete Privacy & Security: All conversions are processed locally via WebAssembly, Web Workers, and WebCodecs. Works completely offline.

PERMISSIONS USAGE:
• sidePanel: Displays the converter alongside any web page you are browsing.
• storage: Temporarily passes staged file references between background events and the active converter UI.
• contextMenus: Lets you right-click web media, text selections, or entire pages to convert them instantly with convrtr.
• tabs: Opens the converter in a full tab when requested, identifies window IDs for side panel docking, and captures visible viewports.
• downloads: Saves your converted files and batch ZIP archives directly to your Downloads folder.
• scripting: Queries DOM elements on the active page to extract images, media sources, inline SVGs, and document links upon user request.
• activeTab: Captures the visible tab viewport when you trigger "Capture Page" (⌘⇧S).
• host_permissions (<all_urls>): Allows media and asset extraction across standard websites upon user command.
```

### Category
```
Productivity / Developer Tools / Photos
```

### Language
```
English
```

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
| `activeTab` | Grants temporary permission to capture the active tab's visible area (`chrome.tabs.captureVisibleTab`) when the user executes the Capture Page command (`Command+Shift+S` or via extension button). |
| `host_permissions: ["<all_urls>"]` | Required to permit asset extraction across any standard website that the user requests media extraction on. Zero data is uploaded or transmitted remotely. |

---

## 3. Privacy & Data Use Disclosure

- **Does this extension collect user data?** No.
- **Does this extension transmit user data to remote servers?** No.
- **Does this extension use analytics, tracking, or telemetry?** No.
- **Data storage:** Minimal ephemeral session state stored in `chrome.storage.session` for passing file handoffs between browser contexts. Cleared immediately upon window close.
- **Processing architecture:** 100% client-side WebAssembly, JavaScript, Web Workers, and Canvas. All files remain in local memory on the user's device.

---

## 4. Version History

### 0.2.0 — 2026-09-16
- Added Viewport Screenshot Capture (`capture_tab` shortcut `Command+Shift+S` / `Ctrl+Shift+S`, header button, and context menu).
- Added Deep Webpage Asset & Vector Extraction (images, audio/video sources, HTML5 canvases, inline SVGs serialized as standalone `.svg` files, and linked documents).
- Added Dynamic Toolbar Icon Badging (⏳ Running, DONE in green accent, ERR in red).
- Added Quick Workflow Presets Bar (`PNG➔WEBP`, `RASTER➔SVG`, `PDF➔TXT`, `JSON➔YAML`, etc.).
- Added Conversion History live search filter and CSV/JSON export buttons.
- Added Omnibox search keyword `cv` for quick format matching from the Chrome address bar.
- Manifest V3 permissions upgraded with `activeTab`, `scripting`, and `host_permissions`.

### 0.1.0 — 2026-09-16
- Initial release of the universal convrtr Chrome Extension.
- Direct shared engine architecture with all 198+ tools and 146+ local engines.
- Chrome Side Panel (`sidepanel.html`), Quick Popup (`popup.html`), and Full Tab Studio (`tab.html`).
- Intelligent multi-hop conversion graph routing.
- Context menu integration for converting web images, audio, video, and links.
- High-contrast dark mode aesthetics with responsive queue controls.
