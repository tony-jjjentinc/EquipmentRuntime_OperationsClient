# Operations React Client (PWA) Requirements

The **Operations React Client** is an offline-first, mobile-optimized Progressive Web App (PWA) built with React 18, TypeScript, and Vite. It provides on-ground facility technicians with seamless equipment runtime controls even in environments with zero network connectivity.

---

## 1. Development & Build Prerequisites

| Tool / Runtime | Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` (LTS recommended) | JavaScript runtime for package management and building. |
| **npm** | `>= 9.0.0` | Package manager. |
| **Build Tool** | `Vite ^5.4.0` | Production bundling and development server. |
| **Language** | `TypeScript ^5.5.0` | Static typing and interface checking. |

---

## 2. Environment Variables Configuration

The application requires the deployed Google Apps Script REST Gateway Web App URL:

### `.env.development` / `.env.production`
```env
VITE_GAS_API_URL=https://script.google.com/macros/s/AKfycbz_YOUR_DEPLOYMENT_ID/exec
```

*(Refer to `.env.example` for the template; production secrets are excluded via `.gitignore`).*

---

## 3. Browser & Hardware Requirements

| Requirement | Specification | Rationale |
| :--- | :--- | :--- |
| **Modern Browser** | Chrome/Edge 90+, Safari 15+, Firefox 90+ | Full support for Service Workers, IndexedDB, and Web Locks API (`navigator.locks`). |
| **Camera Access** | Camera hardware & permissions | Required for live equipment photo capture during startup and shutdown actions. |
| **IndexedDB Support** | Dexie.js v3+ | Local offline outbox, photo blob cache, and equipment directory storage. |
| **Screen Resolution** | Mobile viewport (optimized for 360px–480px width) | Responsive layout using Bootstrap 5. |

---

## 4. Key Library Dependencies

- **`react` & `react-dom` (`^18.3.1`)**: Core component UI framework.
- **`dexie` (`^4.0.8` / v3 schema)**: Offline IndexedDB persistence layer.
- **`zustand` (`^4.5.5`)**: Lightweight state management store.
- **`vite-plugin-pwa` (`^0.20.0`)**: Workbox service worker generation and app shell caching.
- **`exifreader` (`^4.23.5`)**: Client-side binary JPEG APP1 EXIF parser for capture date validation.
- **`bootstrap` (`^5.3.3`) & `bootstrap-icons` (`^1.11.3`)**: UI grid, buttons, and iconography.

---

## 5. Build & Test Commands

```bash
# Install dependencies
npm install

# Type check without emitting files
npx tsc --noEmit

# Production build (outputs to dist/)
npm run build

# Local development preview
npm run preview
```
