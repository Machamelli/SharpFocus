/* =========================
   CONSTANTS
========================= */
const DEFAULT_FOCUS_SETTINGS = {
  hideTopBar: true,
  hideComments: true,
  hideRecommendations: true,
  hideVideoDescription: true,
  hideChannelInfo: true,
  hideShorts: true,
};

const STYLE_ELEMENT_ID = "sf-dynamic-styles";
const FOCUS_ACTIVE_CLASS = "sharp-focus-active";
const VIDEO_END_THRESHOLD = 1;

/* =========================
   STATE
========================= */
let videoElement = null;
let isEndedSent = false;
let lastUrl = location.href;

/* =========================
   UTILITY HELPERS
========================= */
const isWatchPage = () => window.location.href.includes("/watch");

const getOrCreateStyleElement = () => {
  let style = document.getElementById(STYLE_ELEMENT_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ELEMENT_ID;
    document.head.appendChild(style);
  }
  return style;
};

/* =========================
   DYNAMIC CSS INJECTION
========================= */
const updateDynamicStyles = (settings) => {
  const prefix = `body.${FOCUS_ACTIVE_CLASS}`;
  let css = "";

  if (settings.hideTopBar) {
    css += `${prefix} #masthead-container { display: none !important; }\n`;
  }

  if (settings.hideVideoDescription) {
    css += `
      ${prefix} ytd-watch-metadata #title,
      ${prefix} h1.ytd-watch-metadata,
      ${prefix} ytd-watch-metadata #bottom-row,
      ${prefix} ytd-watch-metadata #description-inline-expander,
      ${prefix} ytd-watch-metadata #structured-description,
      ${prefix} ytd-text-inline-expander,
      ${prefix} ytd-watch-metadata #actions {
        display: none !important;
      }\n`;
  }

  if (settings.hideChannelInfo) {
    css += `
      ${prefix} ytd-watch-metadata #owner,
      ${prefix} ytd-video-owner-renderer {
        display: none !important;
      }\n`;
  }

  if (settings.hideRecommendations) {
    css += `
      ${prefix} #secondary,
      ${prefix} ytd-watch-next-secondary-results-renderer {
        display: none !important;
      }
      ${prefix} ytd-watch-flexy[flexy] {
        --ytd-watch-flexy-sidebar-width: 0px !important;
      }\n`;
  }

  if (settings.hideComments) {
    css += `
      ${prefix} ytd-comments#comments,
      ${prefix} #comments-button {
        display: none !important;
      }\n`;
  }

  if (settings.hideShorts) {
    css += `${prefix} ytd-reel-shelf-renderer { display: none !important; }\n`;
  }

  getOrCreateStyleElement().textContent = css;
};

/* =========================
   FOCUS MODE CONTROL
========================= */
const loadFocusSettings = () => {
  browser.storage.local
    .get(["extensionEnabled", "focusSettings"])
    .then((result) => {
      if (result.extensionEnabled === false) return;
      updateDynamicStyles(result.focusSettings || DEFAULT_FOCUS_SETTINGS);
    });
};

const activateFocusMode = () => {
  browser.storage.local.get("extensionEnabled").then((res) => {
    if (res.extensionEnabled !== false) {
      document.body.classList.add(FOCUS_ACTIVE_CLASS);
      loadFocusSettings();
    }
  });
};

const deactivateFocusMode = () => {
  document.body.classList.remove(FOCUS_ACTIVE_CLASS);
};

/* =========================
   VIDEO EVENT HANDLING
========================= */
const attachVideoListeners = (video) => {
  if (videoElement === video) return;
  videoElement = video;

  const handleVideoEnd = () => {
    if (isEndedSent) return;
    isEndedSent = true;
    deactivateFocusMode();
    browser.runtime.sendMessage({ action: "VIDEO_ENDED" });
  };

  video.addEventListener("play", () => {
    if (!isWatchPage() || video.ended) return;
    isEndedSent = false;
    activateFocusMode();
    browser.runtime.sendMessage({ action: "VIDEO_STARTED" });
  });

  video.addEventListener("ended", handleVideoEnd);

  video.addEventListener("timeupdate", () => {
    const isNearEnd =
      video.duration > 0 &&
      video.currentTime >= video.duration - VIDEO_END_THRESHOLD;

    if (!isEndedSent && isNearEnd) {
      handleVideoEnd();
    }
  });

  video.addEventListener("loadeddata", () => {
    isEndedSent = false;
  });
};

/* =========================
   MESSAGE HANDLING
========================= */
const handleBackgroundMessage = (message) => {
  if (message.type === "DISABLE_FOCUS") {
    deactivateFocusMode();
  }

  const canEnableFocus =
    message.type === "ENABLE_FOCUS" &&
    isWatchPage() &&
    videoElement &&
    !videoElement.paused;

  if (canEnableFocus) {
    activateFocusMode();
  }
};

/* =========================
   STORAGE CHANGE HANDLING
========================= */
const handleStorageChange = (changes, area) => {
  if (area !== "local") return;

  if (changes.focusSettings) {
    loadFocusSettings();
  }

  if (changes.extensionEnabled) {
    const isEnabled = changes.extensionEnabled.newValue;

    if (isEnabled === false) {
      deactivateFocusMode();
      return;
    }

    const canActivate =
      isEnabled === true &&
      isWatchPage() &&
      videoElement &&
      !videoElement.paused &&
      !videoElement.ended;

    if (canActivate) {
      activateFocusMode();
      browser.runtime.sendMessage({ action: "VIDEO_STARTED" });
    }
  }
};

/* =========================
   NAVIGATION HANDLING
========================= */
const handleNavigation = () => {
  const url = location.href;
  if (url === lastUrl) return;

  lastUrl = url;

  if (!isWatchPage()) {
    deactivateFocusMode();
    browser.runtime.sendMessage({ action: "VIDEO_ENDED" });
  }
};

/* =========================
   OBSERVERS
========================= */
const initVideoObserver = () => {
  const observer = new MutationObserver(() => {
    const video = document.querySelector("video");
    if (video) attachVideoListeners(video);
  });
  observer.observe(document.body, { childList: true, subtree: true });
};

const initNavigationObserver = () => {
  const observer = new MutationObserver(handleNavigation);
  observer.observe(document, { subtree: true, childList: true });
};

/* =========================
   INITIALIZATION
========================= */
const init = () => {
  // Attach to existing video if present
  const initialVideo = document.querySelector("video");
  if (initialVideo) {
    attachVideoListeners(initialVideo);
  }

  // Set up observers for SPA navigation
  initVideoObserver();
  initNavigationObserver();

  // Set up event listeners
  browser.runtime.onMessage.addListener(handleBackgroundMessage);
  browser.storage.onChanged.addListener(handleStorageChange);

  // Check initial state from background script
  browser.runtime
    .sendMessage({ action: "CHECK_STATUS" })
    .then((res) => {
      if (res?.isFocusedTab) activateFocusMode();
    })
    .catch(() => {});

  // Load initial settings
  loadFocusSettings();
};

init();
