# convrtr — Chrome Web Store Listing & Readiness

Single source of truth for the Chrome Web Store listing metadata, permissions justifications, privacy disclosures, and version history for **convrtr**.

**Last Updated:** 2026-09-16  
**Current Version:** 0.1.0  
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
• Quick Context Menus: Right-click any image, video, audio file, or link on any webpage and select "Convert with convrtr" to stage and process it instantly.
• Selective Batch Processing: Queue multiple files, apply common target formats in bulk or customize per file, preview outputs, and download individually or as a single ZIP.
• Full Desktop Studio Mode: Expand into a dedicated full browser tab whenever you want maximum screen space for massive file batches.
• In-Place Operations: Compress images, resize dimensions, strip EXIF metadata, rotate PDFs, merge multiple PDFs into one document, normalize audio, and more.
• Complete Privacy & Security: All conversions are processed locally via WebAssembly, Web Workers, and WebCodecs. Works completely offline.

PERMISSIONS USAGE:
• sidePanel: Displays the converter alongside any web page you are browsing.
• storage: Temporarily passes staged file references between background events and the active converter UI.
• contextMenus: Lets you right-click web media to convert it instantly with convrtr.
• tabs: Opens the converter in a full tab when requested and binds the side panel to your active window.
• downloads: Saves your converted files and batch ZIP archives directly to your Downloads folder.
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
| `storage` | Uses `chrome.storage.session` to pass metadata for media selected via context menus into the converter interface. No personal data or browsing history is stored. |
| `contextMenus` | Creates context menu entries ("Convert image with convrtr", "Convert video with convrtr", etc.) when right-clicking media on web pages. |
| `tabs` | Identifies the current browser window ID so the side panel opens in the user's active window, and allows opening the Full Tab Studio (`tab.html`) in a new tab upon user request. |
| `downloads` | Saves completed conversion outputs, transformed images/audio/video, and batch ZIP archives to the user's local disk via standard browser download APIs. |

---

## 3. Privacy & Data Use Disclosure

- **Does this extension collect user data?** No.
- **Does this extension transmit user data to remote servers?** No.
- **Does this extension use analytics, tracking, or telemetry?** No.
- **Data storage:** Minimal ephemeral session state stored in `chrome.storage.session` for passing file handoffs between browser contexts. Cleared immediately upon window close.
- **Processing architecture:** 100% client-side WebAssembly, JavaScript, Web Workers, and Canvas. All files remain in local memory on the user's device.

---

## 4. Version History

### 0.1.0 — 2026-09-16
- Initial release of the universal convrtr Chrome Extension.
- Direct shared engine architecture with all 198+ tools and 146+ local engines.
- Chrome Side Panel (`sidepanel.html`), Quick Popup (`popup.html`), and Full Tab Studio (`tab.html`).
- Intelligent multi-hop conversion graph routing.
- Context menu integration for converting web images, audio, video, and links.
- High-contrast dark mode aesthetics with responsive queue controls.
