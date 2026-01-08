/* =========================
   CONSTANTS
========================= */
const OVERLAY_ID = "sharp-focus-overlay";
const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";

const ASSETS = {
  light: "assets/blocked-light.png",
  dark: "assets/blocked-dark.png",
};

const MESSAGE_TYPES = {
  SHOW_OVERLAY: "SHOW_OVERLAY",
  REMOVE_OVERLAY: "REMOVE_OVERLAY",
};

const OVERLAY_STYLES = `
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 2147483647 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  pointer-events: auto !important;
`;

/* =========================
   UTILITY HELPERS
========================= */
const getSystemTheme = () => {
  const prefersDark =
    window.matchMedia && window.matchMedia(DARK_MODE_QUERY).matches;
  return prefersDark ? "dark" : "light";
};

const getOverlayElement = () => document.getElementById(OVERLAY_ID);

const getThemedImageUrl = (theme) => {
  const assetPath = theme === "light" ? ASSETS.light : ASSETS.dark;
  return browser.runtime.getURL(assetPath);
};

/* =========================
   OVERLAY MANAGEMENT
========================= */
const createOverlay = () => {
  if (getOverlayElement()) return;

  browser.storage.local.get("theme").then((result) => {
    const theme = result.theme || getSystemTheme();
    const imagePath = getThemedImageUrl(theme);

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.style.cssText =
      OVERLAY_STYLES +
      `background: url('${imagePath}') center/cover no-repeat !important;`;

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
  });
};

const removeOverlay = () => {
  getOverlayElement()?.remove();
  document.body.style.overflow = "";
};

/* =========================
   MESSAGE HANDLING
========================= */
const handleMessage = (message) => {
  if (message.type === MESSAGE_TYPES.SHOW_OVERLAY) {
    createOverlay();
  } else if (message.type === MESSAGE_TYPES.REMOVE_OVERLAY) {
    removeOverlay();
  }
};

/* =========================
   INITIALIZATION
========================= */
// Prevent multiple injections
if (!window.hasSharpFocusOverlayListener) {
  window.hasSharpFocusOverlayListener = true;

  browser.runtime.onMessage.addListener(handleMessage);
}

// Initial check with background script
browser.runtime
  .sendMessage({ action: "CHECK_STATUS" })
  .then((response) => {
    if (response?.isFocusedTab) {
      removeOverlay();
    }
  })
  .catch(() => {});
