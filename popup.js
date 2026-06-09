/* YouTube Age Filter — popup logic */
(function () {
  "use strict";

  // Allowed value ranges per unit. Each unit caps where the next begins:
  // 60 min = 1 hr, 24 hr = 1 day, etc. Years is unbounded above.
  const RANGES = {
    minutes: { min: 1, max: 59 },
    hours: { min: 1, max: 23 },
    days: { min: 1, max: 14 },
    weeks: { min: 1, max: 4 },
    months: { min: 1, max: 12 },
    years: { min: 1, max: Infinity }
  };

  const SINGULAR = {
    minutes: "minute",
    hours: "hour",
    days: "day",
    weeks: "week",
    months: "month",
    years: "year"
  };

  const DEFAULTS = {
    enabled: false,
    unit: "weeks",
    value: 1,
    hideChipsShelf: false,
    hideTalkToRecs: false
  };

  const enabledElement = document.getElementById("enabled");
  const valueElement = document.getElementById("value");
  const hintElement = document.getElementById("rangeHint");
  const summaryElement = document.getElementById("summary");
  const panelElement = document.getElementById("panel");
  const segmentElement = document.getElementById("unit");
  const segmentButtons = Array.prototype.slice.call(segmentElement.querySelectorAll(".seg-btn"));
  const shortsElement = document.getElementById("hideShorts");
  const chipsElement = document.getElementById("hideChipsShelf");
  const talkElement = document.getElementById("hideTalkToRecs");

  let currentUnit = DEFAULTS.unit;

  function clamp(unit, raw) {
    const unitRange = RANGES[unit];
    let roundedValue = Math.floor(Number(raw));
    if (!isFinite(roundedValue) || isNaN(roundedValue)) roundedValue = unitRange.min;
    if (roundedValue < unitRange.min) roundedValue = unitRange.min;
    if (unitRange.max !== Infinity && roundedValue > unitRange.max) roundedValue = unitRange.max;
    return roundedValue;
  }

  function applyUnitToUI(unit) {
    const unitRange = RANGES[unit];
    valueElement.min = unitRange.min;
    if (unitRange.max === Infinity) valueElement.removeAttribute("max");
    else valueElement.max = unitRange.max;
    hintElement.textContent =
        unitRange.max === Infinity ? "(" + unitRange.min + "+)" : "(" + unitRange.min + "\u2013" + unitRange.max + ")";
    segmentButtons.forEach(function (button) {
      button.classList.toggle("active", button.dataset.unit === unit);
    });
  }

  function unitWord(unit, value) {
    return value === 1 ? SINGULAR[unit] : unit;
  }

  function updateSummary() {
    panelElement.classList.toggle("disabled", !enabledElement.checked);
    if (!enabledElement.checked) {
      summaryElement.innerHTML = "Filter is <strong>off</strong> &mdash; every video is shown.";
      return;
    }
    const value = clamp(currentUnit, valueElement.value);
    summaryElement.innerHTML =
      "Hiding videos older than <strong>" + value + " " + unitWord(currentUnit, value) + "</strong>.";
  }

  function save() {
    const value = clamp(currentUnit, valueElement.value);
    valueElement.value = value;
    chrome.storage.local.set({
      enabled: enabledElement.checked,
      unit: currentUnit,
      value: value,
      hideShorts: shortsElement.checked,
      hideChipsShelf: chipsElement.checked,
      hideTalkToRecs: talkElement.checked
    });
    updateSummary();
  }

  // Events
  segmentButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      currentUnit = button.dataset.unit;
      applyUnitToUI(currentUnit);
      valueElement.value = clamp(currentUnit, valueElement.value);
      save();
    });
  });
  valueElement.addEventListener("input", save);
  valueElement.addEventListener("change", save);
  enabledElement.addEventListener("change", save);
  shortsElement.addEventListener("change", save);
  chipsElement.addEventListener("change", save);
  talkElement.addEventListener("change", save);

  // Initial load
  chrome.storage.local.get(DEFAULTS, function (results) {
    enabledElement.checked = !!results.enabled;
    shortsElement.checked = !!results.hideShorts;
    chipsElement.checked = !!results.hideChipsShelf;
    talkElement.checked = !!results.hideTalkToRecs;
    currentUnit = RANGES[results.unit] ? results.unit : DEFAULTS.unit;
    applyUnitToUI(currentUnit);
    valueElement.value = clamp(currentUnit, results.value);
    updateSummary();
  });
})();
