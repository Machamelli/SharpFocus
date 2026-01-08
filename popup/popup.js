document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     CONSTANTS
  ========================= */
  const SAVE_FEEDBACK_DELAY = 1000;

  const DEFAULT_FOCUS_SETTINGS = {
    hideTopBar: true,
    hideVideoDescription: true,
    hideComments: true,
    hideRecommendations: true,
    hideChannelInfo: true,
    hideShorts: true,
  };

  /* =========================
     DOM ELEMENTS
  ========================= */
  const domainInput = document.getElementById("domain-input");
  const addDomainBtn = document.getElementById("add-domain");
  const domainList = document.getElementById("domain-list");
  const toggleExtensionBtn = document.getElementById("toggle-extension");
  const saveSettingsBtn = document.getElementById("save-settings");
  const themeToggleBtn = document.getElementById("theme-toggle");

  const checkboxes = {
    hideTopBar: document.getElementById("hide-top-bar"),
    hideVideoDescription: document.getElementById("hide-video-description"),
    hideComments: document.getElementById("hide-comments"),
    hideRecommendations: document.getElementById("hide-recommendations"),
    hideChannelInfo: document.getElementById("hide-channel-info"),
    hideShorts: document.getElementById("hide-shorts"),
  };

  /* =========================
     STATE
  ========================= */
  let localDomains = [];

  /* =========================
     UI HELPERS
  ========================= */
  const applyTheme = (theme) => {
    const isLight = theme === "light";
    document.body.classList.toggle("light-theme", isLight);
    if (themeToggleBtn) {
      themeToggleBtn.textContent = isLight ? "☀️" : "🌙";
    }
  };

  const updateToggleButton = (enabled) => {
    toggleExtensionBtn.classList.toggle("btn-on", enabled);
    toggleExtensionBtn.classList.toggle("btn-off", !enabled);
    toggleExtensionBtn.textContent = enabled
      ? "🟢 Focus Mode Enabled - Click to Disable"
      : "🔴 Focus Mode Disabled - Click to Enable";
  };

  const renderDomainList = () => {
    domainList.innerHTML = "";

    localDomains.forEach((domain, idx) => {
      const li = document.createElement("li");

      const text = document.createElement("span");
      text.textContent = domain;

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "×";
      deleteBtn.addEventListener("click", () => {
        localDomains.splice(idx, 1);
        renderDomainList();
      });

      li.append(text, deleteBtn);
      domainList.appendChild(li);
    });
  };

  const showSaveConfirmation = () => {
    const originalText = saveSettingsBtn.textContent;
    saveSettingsBtn.textContent = "Saved!";
    saveSettingsBtn.disabled = true;

    setTimeout(() => {
      saveSettingsBtn.textContent = originalText;
      saveSettingsBtn.disabled = false;
    }, SAVE_FEEDBACK_DELAY);
  };

  /* =========================
     SETTINGS HELPERS
  ========================= */
  const getCheckboxSettings = () => {
    const settings = {};
    for (const [key, el] of Object.entries(checkboxes)) {
      if (el) settings[key] = !!el.checked;
    }
    return settings;
  };

  const applyCheckboxSettings = (settings) => {
    for (const [key, el] of Object.entries(checkboxes)) {
      if (el) el.checked = settings[key] !== false;
    }
  };

  /* =========================
     EVENT HANDLERS
  ========================= */
  const handleExtensionToggle = () => {
    browser.storage.local.get("extensionEnabled").then((res) => {
      const newState = res.extensionEnabled === false;
      updateToggleButton(newState);
      browser.storage.local.set({ extensionEnabled: newState });
    });
  };

  const handleAddDomain = () => {
    const domain = (domainInput.value || "").trim();
    if (!domain) return;

    if (!localDomains.includes(domain)) {
      localDomains.push(domain);
      renderDomainList();
    }
    domainInput.value = "";
  };

  const handleSaveSettings = () => {
    browser.storage.local
      .set({
        whitelistedDomains: localDomains,
        focusSettings: getCheckboxSettings(),
      })
      .then(showSaveConfirmation);
  };

  const handleThemeToggle = () => {
    const isLight = document.body.classList.toggle("light-theme");
    const theme = isLight ? "light" : "dark";
    applyTheme(theme);
    browser.storage.local.set({ theme });
  };

  /* =========================
     INITIALIZATION
  ========================= */
  const loadSettings = () => {
    browser.storage.local
      .get(["whitelistedDomains", "focusSettings", "extensionEnabled", "theme"])
      .then((result) => {
        localDomains = result.whitelistedDomains || [];
        renderDomainList();

        applyCheckboxSettings(result.focusSettings || DEFAULT_FOCUS_SETTINGS);
        updateToggleButton(result.extensionEnabled !== false);

        if (themeToggleBtn && result.theme) {
          applyTheme(result.theme);
        }
      })
      .catch((err) => console.error("Error loading settings:", err));
  };

  const bindEventListeners = () => {
    toggleExtensionBtn.addEventListener("click", handleExtensionToggle);
    addDomainBtn?.addEventListener("click", handleAddDomain);
    saveSettingsBtn?.addEventListener("click", handleSaveSettings);
    themeToggleBtn?.addEventListener("click", handleThemeToggle);
  };

  loadSettings();
  bindEventListeners();
});
