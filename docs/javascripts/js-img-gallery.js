/*
 * js-img-gallery.js — image gallery + instant lightbox, no dependencies.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * Copyright (c) 2026 Daisuke JA1UMW / CQAKIBA.TOKYO
 * Released under the MIT License.
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 *
 * Place this script on an HTML page (with defer), or add its path to
 * MkDocs' extra_javascript list. It installs its own CSS once.
 *
 * Usage (original image files only, no thumbnails):
 *
 * <div class="js-img-gallery" data-path="images_ham_contents" data-height="120"
 *      data-caption="Common caption">
 *   <div>image1.png</div>
 *   <div>image2.png Caption for this image (overrides common caption)</div>
 *   <div>image3.png</div>
 * </div>
 *
 * Each child <div> contains a filename and an optional caption, separated
 * by the FIRST whitespace. Filenames must not contain whitespace or paths.
 * GitHub's Markdown preview displays each child div as a separate text line;
 * with JavaScript enabled the contents become a horizontal image gallery.
 *
 * data-path: folder shared by this gallery. Relative paths are based on the
 *   article's source-directory equivalent in MkDocs (pretty URLs and .html).
 *   Leading / means the site origin's root; https:// URLs also work.
 *   Default: images_ham_contents.
 * data-height: image height in pixels, optional (default 120, range 24–600).
 * data-caption: optional common caption on the outer div. A child's caption
 *   after the filename overrides it. Optionally use data-caption="" on a
 *   child div to suppress the common caption for that image.
 *
 * Click to zoom; left/right arrows switch images; Esc or backdrop closes.
 * With Ctrl/Command-click, the image link opens normally in a new tab.
 * GitHub previews show the original filename/caption lines, not images.
 */
(() => {
  "use strict";

  const STYLE_ID = "js-img-gallery-style";
  const CSS = [
    ".js-img-gallery {display:flex; flex-wrap:wrap; align-items:flex-start; gap:8px; margin:.8em 0}",
    ".js-img-gallery a {display:inline-block; max-width:100%; line-height:0; cursor:zoom-in}",
    ".js-img-gallery img {display:block; width:auto; height:var(--gallery-height,120px); max-width:100%; object-fit:contain}",
    ".js-img-gallery__lightbox {max-width:calc(100vw - 20px); max-height:calc(100vh - 20px); padding:0; overflow:visible; border:0; background:transparent; color:#fff}",
    ".js-img-gallery__lightbox::backdrop {background:rgba(0,0,0,.88)}",
    ".js-img-gallery__panel {position:relative; display:flex; flex-direction:column; align-items:center; gap:.6rem; padding-top:1.6rem}",
    ".js-img-gallery__frame {position:relative; min-width:0}",
    ".js-img-gallery__full {display:block; width:auto; height:auto; max-width:calc(100vw - 48px); max-height:calc(100vh - 130px); max-height:calc(100dvh - 130px); object-fit:contain}",
    ".js-img-gallery__caption {max-width:calc(100vw - 48px); margin:0; padding:0 .4rem; text-align:center; overflow-wrap:anywhere; font-size:.8rem}",
    ".js-img-gallery__lightbox button {display:grid; place-items:center; width:2.6rem; height:2.6rem; padding:0; border:0; border-radius:50%; background:rgba(30,30,30,.8); color:#fff; font:inherit; font-size:2rem; line-height:1; cursor:pointer}",
    ".js-img-gallery__lightbox button:hover {background:rgba(75,75,75,.95)}",
    ".js-img-gallery__lightbox button:focus-visible {outline:3px solid #83cfff; outline-offset:3px}",
    ".js-img-gallery__lightbox button[hidden] {display:none}",
    ".js-img-gallery__close {position:absolute; top:-.9rem; right:0; z-index:1}",
    ".js-img-gallery__previous, .js-img-gallery__next {position:absolute; top:50%; transform:translateY(-50%)}",
    ".js-img-gallery__previous {left:.3rem}",
    ".js-img-gallery__next {right:.3rem}"
  ].join("\n");

  function installCSS() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  let dialog = null;
  let fullImage, captionLabel, backButton, nextButton;
  let activeItems = [];
  let activeIndex = 0;
  let opener = null;

  function display(index) {
    if (!activeItems.length) return;
    activeIndex = (index + activeItems.length) % activeItems.length;
    const item = activeItems[activeIndex];

    fullImage.src = item.href;
    fullImage.alt = item.querySelector("img")?.alt || "拡大画像";
    const caption = item.dataset.caption || "";
    captionLabel.textContent = caption
      ? caption + "　(" + (activeIndex + 1) + "/" + activeItems.length + ")"
      : (activeIndex + 1) + "/" + activeItems.length;
    backButton.hidden = activeItems.length < 2;
    nextButton.hidden = activeItems.length < 2;
  }

  function getDialog() {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.className = "js-img-gallery__lightbox";
    dialog.setAttribute("aria-label", "画像の拡大表示");
    dialog.innerHTML = [
      '<div class="js-img-gallery__panel">',
      '<button type="button" class="js-img-gallery__close" aria-label="閉じる">×</button>',
      '<div class="js-img-gallery__frame">',
      '<img class="js-img-gallery__full" alt="">',
      '<button type="button" class="js-img-gallery__previous" aria-label="前の画像">‹</button>',
      '<button type="button" class="js-img-gallery__next" aria-label="次の画像">›</button>',
      '</div>',
      '<p class="js-img-gallery__caption" aria-live="polite"></p>',
      '</div>'
    ].join("");

    fullImage = dialog.querySelector(".js-img-gallery__full");
    captionLabel = dialog.querySelector(".js-img-gallery__caption");
    backButton = dialog.querySelector(".js-img-gallery__previous");
    nextButton = dialog.querySelector(".js-img-gallery__next");

    dialog.querySelector(".js-img-gallery__close")
      .addEventListener("click", () => dialog.close());
    backButton.addEventListener("click", () => display(activeIndex - 1));
    nextButton.addEventListener("click", () => display(activeIndex + 1));
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (activeItems.length < 2) return;
        event.preventDefault();
        display(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
      }
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      opener = null;
      fullImage.removeAttribute("src");
      activeItems = [];
    });

    document.body.appendChild(dialog);
    return dialog;
  }

  function imageFolder(gallery) {
    // In MkDocs, /section/article/ represents docs/section/article.md.
    // The adjacent image folder is therefore one level above the page URL.
    const pageDirectory = new URL(
      location.pathname.endsWith("/") ? "../" : "./",
      location.href
    );
    const path = (gallery.dataset.path || "images_ham_contents").trim();
    const folder = new URL(path.endsWith("/") ? path : path + "/", pageDirectory);
    return ["http:", "https:"].includes(folder.protocol) ? folder : null;
  }

  function renderGallery(gallery) {
    if (gallery.dataset.galleryReady === "true") return;
    const heightText = gallery.dataset.height ?? "120";
    const height = Number(heightText);
    if (!Number.isInteger(height) || height < 24 || height > 600) return;
    const folder = imageFolder(gallery);
    if (!folder) return;

    const children = Array.from(gallery.querySelectorAll(":scope > div"));
    if (!children.length) return;

    const commonCaption = gallery.dataset.caption ?? "";
    const links = [];

    children.forEach((entry, i) => {
      // Split only at the first whitespace; captions may contain spaces.
      const match = entry.textContent.trim().match(/^(\S+)(?:\s+([\s\S]*))?$/u);
      if (!match) return;
      const file = match[1];
      // The directory belongs in data-path, never in an individual filename.
      if (file === "." || file === ".." || /[/\\]/.test(file)) return;
      const src = new URL(encodeURIComponent(file), folder).href;
      const caption = entry.dataset.caption ?? match[2] ?? commonCaption;

      const anchor = document.createElement("a");
      anchor.href = src;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.dataset.caption = caption;
      anchor.title = caption || file;

      const img = document.createElement("img");
      img.src = src;
      img.alt = caption || "資料画像 " + (i + 1);
      img.loading = "lazy";
      img.decoding = "async";
      anchor.appendChild(img);
      links.push(anchor);
    });

    if (!links.length) return;
    installCSS();
    gallery.style.setProperty("--gallery-height", height + "px");
    gallery.replaceChildren(...links);
    gallery.dataset.galleryReady = "true";

    gallery.addEventListener("click", (event) => {
      const anchor = event.target.closest?.("a");
      if (!anchor || !gallery.contains(anchor) || event.defaultPrevented ||
          event.button !== 0 || event.ctrlKey || event.metaKey ||
          event.altKey || event.shiftKey) return;

      const box = getDialog();
      if (typeof box.showModal !== "function") return;
      activeItems = Array.from(gallery.querySelectorAll("a"));
      opener = anchor;
      display(activeItems.indexOf(anchor));
      box.showModal();
      event.preventDefault();
    });
  }

  function initialize() {
    // MkDocs Material can replace articles without reloading the JS file.
    // Native dialogs remain attached to the body, so close on navigation.
    if (dialog?.open) dialog.close();
    document.querySelectorAll(".js-img-gallery").forEach(renderGallery);
  }

  if (typeof document$ !== "undefined" && document$?.subscribe) {
    document$.subscribe(initialize);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
