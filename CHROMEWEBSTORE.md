# convrtr — Chrome Web Store Listing & Readiness

Single source of truth for the Chrome Web Store listing metadata, permissions justifications, privacy disclosures, and version history for **convrtr**.

**Last Updated:** 2026-09-26  
**Current Version:** 0.2.8  
**Manifest Version:** 3  

---

## 1. Store Listing Metadata

### Name
```
convrtr
```

### Single Purpose Statement (for Developer Dashboard)
```
Converts files directly within your browser using local WebAssembly processing.
```

### Short Description (max 132 characters)
```
Private in-browser file converter. Convert media and documents locally using WebAssembly with zero server uploads.
```
*(Length: 119 characters)*

### Detailed Description (Plain Text Format)
```
convrtr is a private, client-side file converter that runs entirely inside your browser.

Convert images, audio, video, documents, and code locally without uploading your files to remote servers. No account registration, no cloud queues, and zero network latency.

FEATURES:
• Adaptive 3-Way Interface — Work your way with a docked Side Panel (Command+Shift+C), a compact Quick Popup (Command+Shift+Comma), or a dedicated Full Tab Studio (Command+Shift+O).
• Mutual Exclusivity & Session Continuity — Opening any view automatically closes previous surfaces while preserving your active conversion queue, files, and format selections via local IndexedDB storage.
• Material M3 Technical Design — Elevated surface cards, segmented view controls, interactive suggestion chips, and responsive boundary constraints that eliminate horizontal scrollbar overflow.
• 100% Client-Side Processing — Over 200 format conversions execute entirely on your machine via WebAssembly and Web Workers.
• Complete Privacy & Offline Operation — Zero files or telemetry are transmitted across the network. Works completely offline without internet connectivity.
• Context Menu Staging — Right-click web images, audio, video, links, or highlighted code/text to stage and convert them directly into your workflow.
• Comprehensive Keyboard Shortcuts — High-productivity instrument controls: Command+O (open files), Command+Enter (start conversion), Command+D (download ZIP), Command+A (select all), Delete (remove items), Command+K (search formats), P (presets), H (history), and ? (shortcuts modal).
• Omnibox Quick Navigation — Type "cv" in Chrome's address bar to jump directly to matched conversion tools (e.g., "cv png to webp").

HOW TO USE:
1. Click the convrtr extension icon in your Chrome toolbar or press Command+Shift+C to open the Side Panel.
2. Drag and drop files into the dropzone or press Command+O to select from your computer.
3. Select your target format or click quick suggestion presets (P).
4. Press Command+Enter to process files locally. Download individual outputs or press Command+D to save all as a ZIP archive.

PRIVACY & SECURITY:
convrtr is designed from the ground up for strict privacy. It does not collect, store, track, or transmit any personal data, browsing history, or file contents. All conversions occur entirely on your local machine using client-side WebAssembly, Canvas, and Web Workers.

PERMISSIONS:
• sidePanel: Displays the converter beside your active tab for side-by-side workflow.
• storage: Passes temporary session references between background events and the converter interface. No personal data or browsing history is stored.
• contextMenus: Lets you right-click web media, links, or text to stage them for conversion.
• scripting: Stages user-selected media or text snippets into the converter upon explicit user request.
• activeTab: Grants temporary, user-invoked access to stage target media or text snippets upon explicit command without broad host permissions.

SUPPORT & CONTACT:
Email: contact@mreshank.com
Help & Diagnostic Center: https://convrtr.mreshank.com/support
Privacy Policy: https://convrtr.mreshank.com/privacy
Source Code & Issues: https://github.com/mreshank/convrtr

Version 0.2.8 — Collaborative Material M3 design system overhaul, 3-way view coordination with seamless session resumption, streamlined icon controls, decluttered layout, and WCAG accessibility improvements.
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

Every permission declared in `manifest.json` is strictly justified below for the Chrome Web Store review team. Following least-privilege guidance, `tabs` and `downloads` permissions have been completely omitted from the manifest:

| Permission | Specific Reason Required for Functionality |
| :--- | :--- |
| `sidePanel` | Allows convrtr to open in Chrome's native Side Panel dock, allowing users to drag and drop files and monitor conversion progress without switching away from their current web page. |
| `storage` | Uses `chrome.storage.session` to pass ephemeral file and media references (such as media URLs or text snippets) from background events into the converter interface. No personal data, settings, or browsing history is stored. |
| `contextMenus` | Creates context menu entries ("Convert image with convrtr", "Convert video with convrtr", "Convert audio with convrtr", "Convert target link with convrtr", "Convert selected text / code with convrtr") to quickly stage web assets into the converter on demand. |
| `scripting` | Stages user-selected web media, canvas elements, or text snippets into the converter sandbox upon explicit user invocation. |
| `activeTab` | Grants temporary permission to stage clicked media or text snippets when explicitly initiated by user gesture (context menu or extension shortcut). Eliminates the need for broad host permissions or sensitive `tabs` permissions, maximizing user privacy and fast-tracking store review. |

> **Omitted Permissions:**
> - `tabs`: Not required. convrtr only creates local extension tabs (`chrome.tabs.create`) and queries active window IDs, never inspecting privileged properties (`url`, `title`, `favIconUrl`).
> - `downloads`: Not required. All converted file outputs and ZIP archives are generated client-side and downloaded via standard web DOM Blob anchor elements (`<a download>`).

> **Content Security Policy (`content_security_policy`):**
> - `extension_pages`: `"script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"` — standard Manifest V3 policy strictly required to compile and execute local WebAssembly codecs (such as MozJPEG, Oxipng, libheif, and SILK) directly inside the browser sandbox with zero server processing. General `unsafe-eval` remains strictly forbidden.

---

## 3. Privacy & Data Use Disclosure

- **Does this extension collect user data?** No.
- **Does this extension transmit user data to remote servers?** No.
- **Does this extension use analytics, tracking, or telemetry?** No.
- **Data storage:** Minimal ephemeral session state stored in `chrome.storage.session` and local IndexedDB for passing file handoffs and maintaining conversion queues between browser contexts. Cleared upon browser close.
- **Processing architecture:** 100% client-side WebAssembly, JavaScript, Web Workers, and Canvas. All files remain in local memory on the user's device.

---

## 4. Version History

### 0.2.8 — 2026-09-26
- Adopted collaborative Google Material 3 (M3) design system harmonized with convrtr's Dieter Rams technical instrument theme.
- Redesigned Top App Bar with elevated M3 surface card, rounded logo tile, subtle overline pill, and compact circular icon buttons with accessible hover tooltips for Presets, History, Shortcuts [?], Support, and Feedback.
- Introduced M3 Segmented Button view switcher (`SIDEBAR`, `POPUP`, `STUDIO ↗`) with mutual exclusivity (opening any view automatically closes previous surfaces).
- Implemented seamless session persistence and resumption: queue items, target formats, and binary buffers automatically sync to IndexedDB so switching between Side Panel, Popup, and Studio continues without interruption.
- Modernized presets bar into interactive M3 Suggestion Chips and category assist chips.
- Transformed History Drawer into an elevated M3 surface card with pill search input and rounded records.
- Upgraded Keyboard Shortcuts modal to an M3 elevated Dialog with rounded pill keys.
- Completely removed legacy non-functional buttons (CAPTURE, EXTRACT, PASTE ⌘V) and screenshot context menus to focus strictly on core file and media conversion.
- Resolved sidebar horizontal overflow with responsive boundary constraints (`min-w-0`, `max-w-full`).
- Replaced harsh brutalist ASCII corner markers with clean technical iconography and rounded-2xl dropzones.
- Bundled full offline WebAssembly dependencies (`7z-wasm`, `sql-wasm`, `libflac`, `silk`, `ffmpeg`) into extension package for 100% self-contained offline conversions.
- Comprehensive WCAG 2.1 AA accessibility improvements: high-contrast `:focus-visible` outlines, ARIA live announcer regions, and screen-reader status notices.
- Maintained strict zero-emojis policy across all copy, code, and UI elements.

### 0.2.7 — 2026-09-26
- Implemented mutual view exclusivity across extension surfaces: opening Quick Popup, Side Panel, or Studio Tab automatically closes the previously active surface.
- Implemented seamless session persistence and resumption: active conversion queue items, configuration parameters, and binary file buffers automatically save to IndexedDB and resume seamlessly across all extension views.
- Stripped extraneous non-core clutter: completely removed non-functional capture, extract, and paste buttons along with unnecessary background context menus.
- Bundled full offline WebAssembly dependencies (`7z-wasm`, `sql-wasm`, `libflac`, `silk`, `ffmpeg`) into extension package for 100% self-contained offline conversions.
- Comprehensive accessibility (A11Y) enhancements: WCAG-compliant high-contrast `:focus-visible` outlines, ARIA live announcer regions for background operations, landmark structures, and screen-reader status notices.
- Added technical keyboard shortcuts (`Command+O`, `Command+Enter`, `Command+D`, `Command+A`, `Command+K`, `Delete`, `1`, `2`, `3`, `P`, `H`, `?`, `Esc`) and in-product Dieter Rams technical instrument cheatsheet modal.
- Added dedicated shortcut `Command+Shift+O` (`Ctrl+Shift+O`) to open Full Tab Studio.

### 0.2.6 — 2026-09-22
- Added `content_security_policy.extension_pages` declaring `'wasm-unsafe-eval'` to resolve Chromium Manifest V3 WebAssembly instantiation blocks across extension surfaces (enables local MozJPEG, Oxipng, libheif, and SILK conversion without server interaction).
- Suppressed redundant extension marketing install callouts inside the extension interface (`showExtensionCallout={false}`).
- Maintained strict 5-permission least privilege set (`sidePanel`, `storage`, `contextMenus`, `scripting`, `activeTab`) with zero remote network calls and 100% offline local processing.

### 0.2.5 — 2026-09-18
- Set extension store name strictly to `convrtr` to prevent title metadata discrepancies with manifest.
- Set `action.default_title` strictly to `convrtr`.
- Maintained strict 5-permission least privilege set (`sidePanel`, `storage`, `contextMenus`, `scripting`, `activeTab`) with `tabs` and `downloads` completely removed.

### 0.2.4 — 2026-09-18
- Successfully resolved Chrome Web Store appeal: overturned previous "Yellow Nickel" spam policy rejection (confirmed 100% compliant with SPAM policy).
- Streamlined extension manifest permissions to strict least-privilege set (`sidePanel`, `storage`, `contextMenus`, `scripting`, `activeTab`).
- Removed `tabs` permission (convrtr only interacts with tab IDs for active window operations and visible viewport capture via `activeTab`, requiring zero access to sensitive tab URL/title/favicon properties).
- Removed `downloads` permission (file outputs are delivered strictly client-side via standard web DOM Blob anchor downloads).
- Bumped extension version to 0.2.4 for Chrome Web Store package update.

### 0.2.3 — 2026-09-18
- Comprehensive remediation of Chrome Web Store automated "Yellow Nickel" OCR review flags.
- Re-rendered all store listing screenshots (`screenshot-2-sidepanel.png`, `screenshot-3-popup.png`) with realistic, neutral browsing contexts, eliminating simulated developer URLs (`convrtr.mreshank.com/tools`) and marketing callout banners.
- Redesigned small and marquee promotional tiles to follow Google's strict minimalist branding guidelines, completely removing version numbers (`V0.2.1`), tool/engine counts, and feature bullet lists.
- Bumped extension version to 0.2.3.

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
