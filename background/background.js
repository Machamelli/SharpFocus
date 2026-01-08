/* =========================
   CONSTANTS
========================= */
const YOUTUBE_WATCH_URL = "youtube.com/watch";
const OVERLAY_SCRIPT_PATH = "content_scripts/overlay.js";
const VALID_PROTOCOLS = ["http:", "https:"];

const MESSAGE_TYPES = {
  SHOW_OVERLAY: "SHOW_OVERLAY",
  REMOVE_OVERLAY: "REMOVE_OVERLAY",
};

const ACTION_TYPES = {
  VIDEO_STARTED: "VIDEO_STARTED",
  VIDEO_ENDED: "VIDEO_ENDED",
  CHECK_STATUS: "CHECK_STATUS",
};

/* =========================
   STATE
========================= */
let isFocusModeActive = false;
let focusedTabId = null;

/* =========================
   UTILITY HELPERS
========================= */
const normalizeDomain = (domain) => domain.toLowerCase().replace(/^www\./, "");

const isValidProtocol = (protocol) => VALID_PROTOCOLS.includes(protocol);

const isYouTubeWatchPage = (url) => url.includes(YOUTUBE_WATCH_URL);

const isDomainWhitelisted = (domain, whitelistedDomains) => {
  const normalizedDomain = normalizeDomain(domain);
  return whitelistedDomains.some((allowed) => {
    const normalizedAllowed = normalizeDomain(allowed);
    return (
      normalizedDomain === normalizedAllowed ||
      normalizedDomain.endsWith("." + normalizedAllowed)
    );
  });
};

const getTabDomain = (tabUrl) => {
  if (!tabUrl) return null;

  try {
    const url = new URL(tabUrl);
    if (!isValidProtocol(url.protocol)) return null;
    return url.hostname;
  } catch {
    return null;
  }
};

/* =========================
   OVERLAY MANAGEMENT
========================= */
const sendMessageOrInject = async (tabId, message) => {
  try {
    await browser.tabs.sendMessage(tabId, message);
  } catch {
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: [OVERLAY_SCRIPT_PATH],
      });
      await browser.tabs.sendMessage(tabId, message);
    } catch {
      // Silently fail for restricted tabs
    }
  }
};

const showOverlay = (tabId) =>
  sendMessageOrInject(tabId, { type: MESSAGE_TYPES.SHOW_OVERLAY });

const removeOverlay = (tabId) =>
  sendMessageOrInject(tabId, { type: MESSAGE_TYPES.REMOVE_OVERLAY });

/* =========================
   FOCUS STATE MANAGEMENT
========================= */
// Helper to restore state if background script was terminated
const ensureStateLoaded = async () => {
  if (isFocusModeActive && focusedTabId) return;

  const result = await browser.storage.local.get("focusState");
  if (result.focusState?.isActive) {
    isFocusModeActive = true;
    focusedTabId = result.focusState.tabId;
  }
};

const resetFocusState = async () => {
  isFocusModeActive = false;
  focusedTabId = null;

  // Clear persistent state
  await browser.storage.local.remove("focusState");

  const tabs = await browser.tabs.query({});
  for (const tab of tabs) {
    removeOverlay(tab.id);
  }
};

const processTabForFocusMode = async (tab, focusTabId, whitelistedDomains) => {
  if (tab.id === focusTabId) return;

  const domain = getTabDomain(tab.url);
  if (!domain) return;

  if (isDomainWhitelisted(domain, whitelistedDomains)) {
    removeOverlay(tab.id);
  } else {
    await showOverlay(tab.id);
  }
};

const enableFocusMode = async (tabId) => {
  try {
    const result = await browser.storage.local.get([
      "extensionEnabled",
      "whitelistedDomains",
    ]);

    if (result.extensionEnabled === false) return;

    const whitelistedDomains = result.whitelistedDomains || [];
    const tabs = await browser.tabs.query({});

    for (const tab of tabs) {
      await processTabForFocusMode(tab, tabId, whitelistedDomains);
    }

    isFocusModeActive = true;
    focusedTabId = tabId;

    // Save state to storage for persistence
    await browser.storage.local.set({
      focusState: { isActive: true, tabId: tabId },
    });
  } catch (error) {
    console.error("SharpFocus: Error in enableFocusMode:", error);
  }
};

/* =========================
   MESSAGE HANDLING
========================= */
const handleMessage = (message, sender) => {
  const { action } = message;
  const tabId = sender.tab?.id;

  // Return promise for async handling in Firefox
  return (async () => {
    await ensureStateLoaded();

    switch (action) {
      case ACTION_TYPES.VIDEO_STARTED:
        await enableFocusMode(tabId);
        break;

      case ACTION_TYPES.VIDEO_ENDED:
        await resetFocusState();
        break;

      case ACTION_TYPES.CHECK_STATUS:
        return {
          isFocusedTab: isFocusModeActive && focusedTabId === tabId,
        };
    }
  })();
};

/* =========================
   STORAGE CHANGE HANDLING
========================= */
const handleStorageChange = (changes, area) => {
  if (area !== "local") return;

  if (changes.extensionEnabled?.newValue === false) {
    resetFocusState();
  }
};

/* =========================
   TAB EVENT HANDLING
========================= */
const handleFocusedTabNavigation = (changeInfo) => {
  if (changeInfo.url && !isYouTubeWatchPage(changeInfo.url)) {
    resetFocusState();
  }
};

const handleOtherTabLoad = (tabId, tabUrl) => {
  browser.storage.local.get(["whitelistedDomains"]).then((result) => {
    const whitelistedDomains = result.whitelistedDomains || [];
    const domain = getTabDomain(tabUrl);

    if (domain && !isDomainWhitelisted(domain, whitelistedDomains)) {
      showOverlay(tabId);
    }
  });
};

const handleTabUpdate = async (tabId, changeInfo, tab) => {
  // Restore state first so we know if we need to act
  await ensureStateLoaded();

  if (!isFocusModeActive) return;

  // Handle focused tab navigation
  if (tabId === focusedTabId) {
    handleFocusedTabNavigation(changeInfo);
    return;
  }

  // Handle blocking of other tabs on page load
  if (changeInfo.status === "complete") {
    handleOtherTabLoad(tabId, tab.url);
  }
};

const handleTabRemoved = async (tabId) => {
  // Restore state to check if the closed tab was the focused one
  await ensureStateLoaded();

  if (tabId === focusedTabId) {
    resetFocusState();
  }
};

/* =========================
   INITIALIZATION
========================= */
const init = () => {
  browser.runtime.onMessage.addListener(handleMessage);
  browser.storage.onChanged.addListener(handleStorageChange);
  browser.tabs.onUpdated.addListener(handleTabUpdate);
  browser.tabs.onRemoved.addListener(handleTabRemoved);
};

init();
