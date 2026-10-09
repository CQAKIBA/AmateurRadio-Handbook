/*
 * MkDocs image gallery shorthand:
 *
 * gallery(120, file1.png, file2.png, file3.png)
 *
 * Original image files are stored in the page's adjacent
 * images_ham_contents/ directory. No thumbnail generation is required.
 * GitHub source previews display the shortcode as plain text.
 */
(() => {
  "use strict";

  const shortcode = /^gallery\(\s*(\d{1,3})\s*,\s*([^\n]+?)\s*\)$/i;
  const filename = /^[^/\\<>:"|?*]+\.(?:png|jpe?g|gif|webp|avif)$/i;

  // A single native dialog serves all galleries on the page.
  // Without showModal(), normal image links still work.
  let lightbox = null;
  let modalImage = null;
  let modalCaption = null;
  let prevButton = null;
  let nextButton = null;
  let activeLinks = [];
  let activeIndex = 0;
  let opener = null;

  function displayImage(index) {
    activeIndex = (index + activeLinks.length) % activeLinks.length;
    const link = activeLinks[activeIndex];
    modalImage.src = link.href;
    modalImage.alt = link.querySelector("img")?.alt || "拡大画像";
    modalCaption.textContent =
      (activeIndex + 1) + " / " + activeLinks.length + " · " + link.dataset.filename;
    prevButton.hidden = activeLinks.length < 2;
    nextButton.hidden = activeLinks.length < 2;
  }

  function createLightbox() {
    if (lightbox) return lightbox;

    const dialog = document.createElement("dialog");
    dialog.className = "ham-lightbox";
    dialog.setAttribute("aria-label", "画像ギャラリーの拡大表示");
    dialog.innerHTML = [
      '<div class="ham-lightbox__panel">',
      '<button type="button" class="ham-lightbox__close" aria-label="閉じる">×</button>',
      '<div class="ham-lightbox__frame">',
      '<img class="ham-lightbox__image" alt="">',
      '<button type="button" class="ham-lightbox__previous" aria-label="前の画像">‹</button>',
      '<button type="button" class="ham-lightbox__next" aria-label="次の画像">›</button>',
      '</div>',
      '<p class="ham-lightbox__caption" aria-live="polite"></p>',
      '</div>'
    ].join("");

    modalImage = dialog.querySelector(".ham-lightbox__image");
    modalCaption = dialog.querySelector(".ham-lightbox__caption");
    prevButton = dialog.querySelector(".ham-lightbox__previous");
    nextButton = dialog.querySelector(".ham-lightbox__next");
    dialog.querySelector(".ham-lightbox__close")
      .addEventListener("click", () => dialog.close());
    prevButton.addEventListener("click", () => displayImage(activeIndex - 1));
    nextButton.addEventListener("click", () => displayImage(activeIndex + 1));

    dialog.addEventListener("keydown", (event) => {
      if (activeLinks.length < 2) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        displayImage(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
      }
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      opener = null;
      modalImage.removeAttribute("src");
      activeLinks = [];
    });

    document.body.append(dialog);
    lightbox = dialog;
    return dialog;
  }

  function openLightbox(links, index, trigger) {
    const dialog = createLightbox();
    if (typeof dialog.showModal !== "function") return false;
    activeLinks = links;
    opener = trigger;
    displayImage(index);
    dialog.showModal();
    return true;
  }

  function gallery(height, ...imageNames) {
    const container = document.createElement("div");
    container.className = "ham-image-gallery";
    container.setAttribute("role", "group");
    container.setAttribute("aria-label", "記事の画像ギャラリー");
    container.style.setProperty("--gallery-height", height + "px");

    // The published page is normally /chapter/article/. Images live one
    // level above that directory; .html URLs use a same-directory base.
    const base = new URL(
      location.pathname.endsWith("/") ? "../images_ham_contents/" : "images_ham_contents/",
      location.href
    );

    imageNames.forEach((name, index) => {
      const src = new URL(encodeURIComponent(name), base).href;
      const link = document.createElement("a");
      link.href = src;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = "画像を原寸で開く：" + name;
      link.dataset.filename = name;

      const img = document.createElement("img");
      img.src = src;
      img.alt = "資料画像 " + (index + 1);
      img.loading = "lazy";
      img.decoding = "async";
      link.append(img);
      container.append(link);
    });

    container.addEventListener("click", (event) => {
      const link = event.target.closest?.("a");
      if (!link || !container.contains(link) || event.defaultPrevented ||
          event.button !== 0 || event.ctrlKey || event.metaKey ||
          event.shiftKey || event.altKey) return;

      const links = Array.from(container.querySelectorAll("a"));
      if (openLightbox(links, links.indexOf(link), link)) event.preventDefault();
    });
    return container;
  }

  function processGalleries() {
    document.querySelectorAll(".md-content .md-typeset p").forEach((paragraph) => {
      if (paragraph.children.length) return;
      const found = paragraph.textContent.trim().match(shortcode);
      if (!found) return;

      const height = Number(found[1]);
      const images = found[2].split(",").map((value) => value.trim());
      if (height < 24 || height > 600 || images.length < 1 ||
          images.length > 24 || images.some((value) => !filename.test(value))) return;

      paragraph.replaceWith(gallery(height, ...images));
    });
  }

  if (typeof document$ !== "undefined" && document$?.subscribe) {
    document$.subscribe(processGalleries);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", processGalleries);
  } else {
    processGalleries();
  }
})();
