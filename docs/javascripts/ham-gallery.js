/*
 * Compact gallery shortcode for MkDocs pages:
 *
 * gallery(120, picture_1.png, picture_2.png, picture_3.png)
 *
 * Place the original images in images_ham_contents/ beside the source .md.
 * No separate thumbnails are necessary. The shortcode intentionally remains
 * visible as plain text in GitHub's Markdown preview.
 */
(() => {
  "use strict";

  const expression = /^gallery\(\s*(\d{1,4})\s*,\s*(.+)\s*\)$/i;
  const allowedFile = /^[^/\\<>:"|?*]+\.(?:png|jpe?g|gif|webp|avif)$/i;

  function renderGalleries() {
    // Limit replacements to entire paragraphs, not mentions in normal prose.
    document.querySelectorAll(".md-content .md-typeset p").forEach((paragraph) => {
      if (paragraph.querySelector("*")) return;
      const match = paragraph.textContent.trim().match(expression);
      if (!match) return;

      const height = Number(match[1]);
      if (height < 32 || height > 600) return;

      const names = match[2].split(",").map((part) =>
        part.trim().replace(/^["']|["']$/g, "")
      );
      if (names.length === 0 || names.length > 30 ||
          names.some((name) => !allowedFile.test(name) || name === "..")) return;

      // MkDocs default: /chapter/article/ (pretty URLs).
      // Also support use_directory_urls: false (/chapter/article.html).
      const galleryFolder = window.location.pathname.endsWith("/")
        ? "../images_ham_contents/"
        : "images_ham_contents/";
      const imageBase = new URL(galleryFolder, window.location.href);

      const gallery = document.createElement("div");
      gallery.className = "ham-gallery";
      gallery.setAttribute("role", "group");
      gallery.setAttribute("aria-label", "記事の画像ギャラリー");
      gallery.style.setProperty("--ham-gallery-height", `${height}px`);

      names.forEach((name, index) => {
        const imageUrl = new URL(encodeURIComponent(name), imageBase).href;

        const link = document.createElement("a");
        link.href = imageUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.title = "元画像を開く：" + name;

        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = "資料画像 " + (index + 1) + "：" + name;
        img.loading = "lazy";
        img.decoding = "async";
        link.appendChild(img);
        gallery.appendChild(link);
      });

      paragraph.replaceWith(gallery);
    });
  }

  // Material for MkDocs emits this event after each page update.
  if (typeof document$ !== "undefined" && document$?.subscribe) {
    document$.subscribe(renderGalleries);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderGalleries);
  } else {
    renderGalleries();
  }
})();
