document.addEventListener("DOMContentLoaded", async () => {
  if (typeof mermaid === "undefined") return;

  const blocks = document.querySelectorAll("pre > code.language-mermaid");

  blocks.forEach((code) => {
    const pre = code.parentElement;
    const container = document.createElement("div");
    container.className = "mermaid";
    container.textContent = code.textContent;
    pre.replaceWith(container);
  });

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    layout: "elk",

    // Keep node labels on one line unless the diagram source contains an
    // explicit line break such as <br>.  Mermaid's flowchart renderer wraps
    // labels at wrappingWidth during layout, before the responsive SVG is
    // scaled to the page width.
    markdownAutoWrap: false,
    flowchart: {
      wrappingWidth: 4096
    }
  });

  await mermaid.run({
    querySelector: ".mermaid"
  });
});
