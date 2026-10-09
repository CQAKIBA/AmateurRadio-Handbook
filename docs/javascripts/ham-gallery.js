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

      const img = document.createElement("img");
      img.src = src;
      img.alt = "資料画像 " + (index + 1);
      img.loading = "lazy";
      img.decoding = "async";
      link.append(img);
      container.append(link);
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
