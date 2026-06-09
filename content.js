/* YouTube Age Filter — content script
 * 1. Hides video entries older than a chosen threshold on the home page and
 *    the Subscriptions feed (youtube.com/feed/subscriptions).
 * 2. Optionally hides clutter elements (chip shelves, recs panel, Shorts).
 *
 * Works in Chrome and Firefox (both expose the `chrome` namespace).
 */
(function () {
  "use strict";

  // Length of each unit in MINUTES (minutes/hours need finer granularity than
  // days, so everything is compared in minutes). Months/years are averaged.
  const UNIT_MINUTES = {
    minutes: 1,
    hours: 60,
    days: 1440,
    weeks: 10080,
    months: 43200,   // 30 days
    years: 525600    // 365 days
  };

  // Simple selector-based element toggles.
  const ELEMENT_TOGGLES = [
    { key: "hideChipsShelf", selector: "ytd-chips-shelf-with-video-shelf-renderer" },
    { key: "hideTalkToRecs", selector: "yt-talk-to-recs-view-model" }
  ];

  // Default state, mirrored from the popup's storage.
  const DEFAULTS = {
    enabled: false,
    unit: "weeks",
    value: 1,
    hideShorts: false,
    hideChipsShelf: false,
    hideTalkToRecs: false
  };
  let state = Object.assign({}, DEFAULTS);

  // New YouTube layout: the upload age lives in this metadata view-model,
  // inside a span whose aria-label holds the "X ago" text.
  const META_SELECTOR =
    "yt-content-metadata-view-model, .ytContentMetadataViewModelHost";

  // Video cells we hide for the age filter. Outermost grid cells preferred.
  const CONTAINER_SELECTOR =
    "ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer";
  const LOCKUP_SELECTOR = "yt-lockup-view-model";

  // Things that positively identify Shorts content (layout/language agnostic).
  const SHORTS_MARKER =
    "ytm-shorts-lockup-view-model-v2, ytm-shorts-lockup-view-model, " +
    ".shortsLockupViewModelHost, ytd-reel-item-renderer, a[href^='/shorts/']";

  const AGE_ATTR = "data-ytaf-hidden";       // hidden by the age filter
  const EL_ATTR = "data-ytaf-el-hidden";     // hidden by an element toggle
  const SHORTS_ATTR = "data-ytaf-shorts";    // hidden by the Shorts toggle

  // Match strings like "3 days ago", "1 week ago", "Streamed 2 months ago".
  const AGE_RE = /(\d+)\s*(second|minute|hour|day|week|month|year)s?\s+ago/i;

  function onTargetPage() {
    const path = location.pathname;
    return path === "/" || path === "" || path === "/feed/subscriptions";
  }

  function thresholdMinutes() {
    const per = UNIT_MINUTES[state.unit] || UNIT_MINUTES.weeks;
    return (Number(state.value) || 1) * per;
  }

  // Convert an "X <unit> ago" string into approximate minutes, or null.
  function ageFromText(text) {
    if (!text) return null;
    const textMatch = String(text).match(AGE_RE);
    if (!textMatch) return null;
    const age = parseInt(textMatch[1], 10);
    switch (textMatch[2].toLowerCase()) {
      case "second": return 0; // newer than any threshold (min is 1 minute)
      case "minute": return age;
      case "hour":   return age * 60;
      case "day":    return age * 1440;
      case "week":   return age * 10080;
      case "month":  return age * 43200;
      case "year":   return age * 525600;
      default:       return null;
    }
  }

  function ageFromMeta(metaEl) {
    const labeled = metaEl.querySelectorAll("[aria-label]");
    for (const selectedLabel of labeled) {
      const labelAttribute = ageFromText(selectedLabel.getAttribute("aria-label"));
      if (labelAttribute !== null) return labelAttribute;
    }
    return ageFromText(metaEl.textContent);
  }

  function ageFromOldContainer(containerElement) {
    const spans = containerElement.querySelectorAll(
      "#metadata-line span, .inline-metadata-item, ytd-video-meta-block span"
    );
    for (const s of spans) {
      const age = ageFromText(s.textContent);
      if (age !== null) return age;
    }
    const labeled = containerElement.querySelectorAll("[aria-label]");
    for (const selectedLabel of labeled) {
      const labelAttribute = ageFromText(selectedLabel.getAttribute("aria-label"));
      if (labelAttribute !== null) return labelAttribute;
    }
    return null;
  }

  function findContainer(element) {
    return element.closest(CONTAINER_SELECTOR) || element.closest(LOCKUP_SELECTOR) || element;
  }

  // From a Shorts marker, find the right thing to hide: the whole feed
  // section if there is one, else the shelf, else the single grid cell.
  // Returns null if none of those exist (e.g. a sidebar link) so we never
  // hide stray anchors or unrelated sections.
  function findShortsContainer(element) {
    return (
      element.closest("ytd-rich-section-renderer") ||
      element.closest("ytd-reel-shelf-renderer, ytd-rich-shelf-renderer") ||
      element.closest("ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer") ||
      null
    );
  }

  function hide(element, attribute) {
    if (!element.hasAttribute(attribute)) {
      element.style.display = "none";
      element.setAttribute(attribute, "1");
    }
  }

  function reveal(element, attribute) {
    if (element.hasAttribute(attribute)) {
      element.style.display = "";
      element.removeAttribute(attribute);
    }
  }

  function setHidden(element, attribute, shouldHide) {
    if (shouldHide) hide(element, attribute);
    else reveal(element, attribute);
  }

  function revealByAttr(attribute) {
    document.querySelectorAll("[" + attribute + "]").forEach(function (element) {
      reveal(element, attribute);
    });
  }

  // ---- The age filter ------------------------------------------------------
  function applyAgeFilter() {
    if (!state.enabled || !onTargetPage()) {
      revealByAttr(AGE_ATTR);
      return;
    }

    const maxMinutes = thresholdMinutes();
    const processed = new Set();

    document.querySelectorAll(META_SELECTOR).forEach(function (metaEl) {
      const age = ageFromMeta(metaEl);
      if (age === null) return;
      const container = findContainer(metaEl);
      processed.add(container);
      setHidden(container, AGE_ATTR, age > maxMinutes);
    });

    document.querySelectorAll(CONTAINER_SELECTOR).forEach(function (element) {
      if (processed.has(element) || element.querySelector(META_SELECTOR)) return;
      const age = ageFromOldContainer(element);
      if (age === null) return;
      setHidden(element, AGE_ATTR, age > maxMinutes);
    });
  }

  // ---- Simple element toggles ----------------------------------------------
  function applyElementToggles() {
    ELEMENT_TOGGLES.forEach(function (toggle) {
      const shouldHide = !!state[toggle.key];
      document.querySelectorAll(toggle.selector).forEach(function (element) {
        setHidden(element, EL_ATTR, shouldHide);
      });
    });
  }

  // ---- Shorts toggle -------------------------------------------------------
  function applyShortsToggle() {
    if (!state.hideShorts) {
      revealByAttr(SHORTS_ATTR);
      return;
    }
    const seen = new Set();
    document.querySelectorAll(SHORTS_MARKER).forEach(function (marker) {
      const container = findShortsContainer(marker);
      if (!container || seen.has(container)) return;
      seen.add(container);
      hide(container, SHORTS_ATTR);
    });
  }

  function apply() {
    applyAgeFilter();
    applyElementToggles();
    applyShortsToggle();
  }

  // Debounce so a burst of DOM mutations triggers a single pass.
  let timer = null;
  function scheduleApply() {
    if (timer) return;
    timer = setTimeout(function () {
      timer = null;
      apply();
    }, 200);
  }

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "local") return;
    Object.keys(changes).forEach(function (key) {
      state[key] = changes[key].newValue;
    });
    apply();
  });

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("yt-navigate-finish", scheduleApply, true);

  chrome.storage.local.get(DEFAULTS, function (res) {
    state = Object.assign({}, DEFAULTS, res);
    apply();
  });
})();
