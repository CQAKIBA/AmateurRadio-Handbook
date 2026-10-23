/* Switch the article between Material's default width and a wide layout. */
(() => {
  "use strict";

  const storageKey = "handbook-content-width";
  const wideClass = "handbook-wide-layout";
  let isWide = false;

  try {
    isWide = window.localStorage.getItem(storageKey) === "wide";
  } catch (_) {
    // Browsers may disable local storage; the button still works for this page.
  }

  function updateLayout() {
    document.documentElement.classList.toggle(wideClass, isWide);

    const button = document.querySelector(".handbook-width-toggle");
    if (!button) return;

    const label = isWide ? "本文の横幅を標準に戻す" : "本文の横幅を広げる";
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(isWide));
    button.title = label;
  }

  function addToggle() {
    const header = document.querySelector(".md-header__inner");
    const source = header?.querySelector(".md-header__source");
    if (!source) return;
    if (header.querySelector(".handbook-width-toggle")) {
      updateLayout();
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "md-header__button md-icon handbook-width-toggle";
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="fill: none">
        <path d="M7 12H2m0 0 4-4m-4 4 4 4m11-4h5m0 0-4-4m4 4-4 4M10 5v14m4-14v14"
              stroke="currentColor" stroke-width="1.7"
              stroke-linecap="round" stroke-linejoin="round" />
      </svg>`;
    button.addEventListener("click", () => {
      isWide = !isWide;
      try {
        window.localStorage.setItem(storageKey, isWide ? "wide" : "normal");
      } catch (_) {
        // Continue without persistence if local storage is disabled.
      }
      updateLayout();
    });

    source.before(button);
    updateLayout();
  }

  // Apply a saved choice before installing the control to reduce layout shifts.
  updateLayout();

  // Material's instant navigation can replace page content without a reload.
  if (typeof document$ !== "undefined") {
    document$.subscribe(addToggle);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addToggle, { once: true });
  } else {
    addToggle();
  }
})();
