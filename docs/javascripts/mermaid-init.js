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
    securityLevel: "strict"
  });

  await mermaid.run({
    querySelector: ".mermaid"
  });
});
