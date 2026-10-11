/* BandGraph playground for the handbook. Dependency: bandgraph.js. MIT License. */
(() => {
  'use strict';

  const SELECTOR = '[data-bandgraph-playground]';
  const STYLE_ID = 'bandgraph-playground-style';
  const mounted = new WeakSet();
  const STYLE = String.raw`
.bandgraph-playground {
  box-sizing: border-box; width: 100%; max-width: 100%;
  padding: 14px; margin: 16px 0 25px; border: 1px solid var(--md-default-fg-color--lightest, #cbd5de);
  border-radius: 7px; background: var(--md-code-bg-color, #f7f8fa);
}
.bgp__label { display: block; margin: 0 0 7px; font-weight: 700; }
.bgp__editor {
  display: block; width: 100%; box-sizing: border-box; min-height: 305px;
  font: 12.5px/1.55 ui-monospace, SFMono-Regular, Consolas, 'Noto Sans Mono', monospace;
  tab-size: 2; padding: 11px; resize: vertical; border-radius: 4px;
  border: 1px solid var(--md-default-fg-color--lightest, #cbd5de);
  color: var(--md-default-fg-color, #18212b); background: var(--md-default-bg-color, #fff);
  white-space: pre; overflow-x: auto;
}
.bgp__controls { display: flex; align-items: center; gap: 8px 12px; flex-wrap: wrap; margin: 11px 0 7px; }
.md-typeset .bgp__button {
  appearance: none; cursor: pointer; padding: 7px 12px; border: 1px solid var(--md-primary-fg-color, #0754ae);
  border-radius: 5px; font-size: 13px; line-height: 1.4;
  color: var(--md-primary-fg-color, #0754ae); background: transparent;
}
.md-typeset .bgp__button--primary { color: #fff; background: var(--md-primary-fg-color, #0754ae); }
.md-typeset .bgp__button:hover { filter: brightness(.93); }
.md-typeset .bgp__button:focus-visible,
.bgp__editor:focus-visible { outline: 2px solid var(--md-accent-fg-color, #1772ac); outline-offset: 2px; }
.bgp__compression { display: inline-flex; align-items: center; gap: 8px; flex-wrap: nowrap; font-size: 13px; margin-left: auto; }
.bgp__compression input { min-width: 95px; width: 125px; cursor: pointer; }
.bgp__compression output { min-width: 34px; font-variant-numeric: tabular-nums; font-weight: 700; }
.bgp__status { margin: 4px 0 8px !important; min-height: 1.4em; font-size: 12px; color: var(--md-default-fg-color--light, #596573); }
.bgp__status--error { color: #b52c2c; font-weight: 650; }
.bgp__preview { box-sizing: border-box; width: 100%; max-width: 100%; overflow: hidden; padding: 11px;
  background: var(--md-default-bg-color, #fff); border: 1px solid var(--md-default-fg-color--lightest, #d1d8df);
  border-radius: 5px; min-height: 125px; }
.bgp__preview > .js-bandgraph { margin: 0; }
@media(max-width: 640px) {
  .bandgraph-playground { padding: 9px; }
  .bgp__editor { min-height: 255px; font-size: 11.5px; }
  .bgp__compression { margin-left: 0; width: 100%; justify-content: flex-start; }
  .bgp__preview { padding: 6px; }
}
`;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE;
    document.head.append(style);
  }

  // Parse inert markup. Never inject user-provided HTML into the live page.
  function readSource(input) {
    const doc = new DOMParser().parseFromString(input.trim(), 'text/html');
    const elements = Array.from(doc.body.children);
    if (elements.length !== 1 || elements[0].tagName !== 'DIV' ||
        !elements[0].classList.contains('js-bandgraph')) {
      throw new Error('class="js-bandgraph" を持つ <div>...</div> を1つだけ入力してください。');
    }
    const element = elements[0];
    if (element.children.length) {
      throw new Error('div の内側には周波数指定のテキストだけを書いてください。');
    }
    const attributes = {};
    for (const key of ['title', 'unit', 'band', 'compression', 'track-height', 'font-size', 'max-lines']) {
      const value = element.getAttribute('data-' + key);
      if (value !== null) attributes['data-' + key] = value;
    }
    return { attributes, source: element.textContent };
  }

  function applyCompressionToMarkup(markup, compression) {
    const tagMatch = markup.match(/<div\b[^>]*>/i);
    if (!tagMatch) return markup;
    let tag = tagMatch[0];
    const attr = /\bdata-compression\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i;
    if (attr.test(tag)) tag = tag.replace(attr, `data-compression="${compression}"`);
    else tag = tag.replace(/>$/, ` data-compression="${compression}">`);
    return markup.slice(0, tagMatch.index) + tag + markup.slice(tagMatch.index + tagMatch[0].length);
  }

  function setup(container) {
    if (mounted.has(container)) return;
    const editor = container.querySelector('.bgp__editor');
    const renderButton = container.querySelector('[data-bgp-render]');
    const copyButton = container.querySelector('[data-bgp-copy]');
    const resetButton = container.querySelector('[data-bgp-reset]');
    const slider = container.querySelector('[data-bgp-compression]');
    const output = container.querySelector('[data-bgp-compression-output]');
    const status = container.querySelector('[data-bgp-status]');
    const preview = container.querySelector('[data-bgp-preview]');
    if (!editor || !renderButton || !copyButton || !resetButton || !slider || !output || !status || !preview) return;
    if (!window.BandGraph || typeof window.BandGraph.init !== 'function') {
      status.textContent = 'bandgraph.js が読み込まれていません。';
      status.classList.add('bgp__status--error');
      return;
    }
    mounted.add(container);
    ensureStyle();
    const initial = editor.value;

    function setStatus(message, error = false) {
      status.textContent = message;
      status.classList.toggle('bgp__status--error', error);
    }
    function draw() {
      try {
        const { attributes, source } = readSource(editor.value);
        const host = document.createElement('div');
        host.className = 'js-bandgraph';
        for (const [key, value] of Object.entries(attributes)) host.setAttribute(key, value);
        host.textContent = source;
        preview.replaceChildren(host);
        // BandGraph.init also attaches its resize observer.
        window.BandGraph.init(host);
        const error = host.querySelector('.bandgraph__error');
        if (error) { setStatus(error.textContent, true); return; }
        setStatus('プレビューを更新しました。Ctrl + Enter でも更新できます。');
      } catch (err) {
        preview.replaceChildren();
        setStatus(err.message || String(err), true);
      }
    }
    function setSliderFromEditor() {
      try {
        const value = Number(readSource(editor.value).attributes['data-compression'] ?? 0.5);
        slider.value = String(Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5);
      } catch { /* Keep the previous slider value while input is incomplete. */ }
      output.textContent = Number(slider.value).toFixed(2);
    }

    renderButton.addEventListener('click', () => { setSliderFromEditor(); draw(); });
    editor.addEventListener('keydown', event => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault(); setSliderFromEditor(); draw();
      }
    });
    slider.addEventListener('input', () => {
      const value = Number(slider.value).toFixed(2);
      output.textContent = value;
      editor.value = applyCompressionToMarkup(editor.value, value);
      draw();
    });
    resetButton.addEventListener('click', () => {
      editor.value = initial;
      setSliderFromEditor();
      draw();
    });
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(editor.value);
        setStatus('HTMLをクリップボードにコピーしました。');
      } catch {
        editor.focus(); editor.select();
        setStatus('自動コピーできませんでした。選択済みのHTMLを Ctrl + C でコピーしてください。', true);
      }
    });

    setSliderFromEditor();
    draw();
  }

  function init() { document.querySelectorAll(SELECTOR).forEach(setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  if (window.document$ && typeof window.document$.subscribe === 'function') window.document$.subscribe(init);
})();