/*
 * BandGraph — アマチュア無線バンドプラン・周波数区間グラフ
 * --------------------------------------------------------
 * 周波数の「開始 終了 内容」を、そのまま色分け帯域図に変換します。
 * 周波数幅を対数圧縮し、セル内文字が収まるよう列幅を再配分します。
 * 外部ライブラリ、CSSファイル、ビルド作業は不要です（このJSだけ）。
 *
 * 【最短の使い方：このままHTMLにコピー】
 *
 *   <div class="js-bandgraph" data-title="50MHz帯" data-unit="MHz">
 *   50.00 50.07 CW
 *   50.07 51.00 #f9cda7 狭帯域の全電波形式
 *   50.00 50.30 #77b596 EME
 *   51.00 54.00 全電波形式
 *   </div>
 *   <script defer src="bandgraph.js"></script>
 *
 * このファイルを bandgraph.js として設置し、HTMLの最後にscriptタグを
 * 追加すれば自動描画されます。CSSはJS自身がページに埋め込みます。
 * class="js-bandgraph" の要素をページ内にいくつでも書けます。
 *
 * 【1行ごとの記述】
 *   開始周波数 終了周波数 ラベル
 *   開始周波数 終了周波数 CSS色 ラベル
 *
 *   5757 5760 violet 全電波形式
 *   5760 5762 #00fa9a CW・狭帯域の電話・電信・画像
 *   5762 5765 rgb(220 220 245) 全電波形式
 *
 * 3列目がCSS色として有効なら背景色として使います。そうでなければ
 * 3列目以降すべてをラベルとして扱い、用途に応じた初期配色を適用します。
 * 色は、CSS色名、#rgb、#rrggbb、rgb(...)、hsl(...)などに対応。
 * 文字を明示的に改行する場合は \n と書きます。
 *
 * 【コマンド】
 *   @title 5600MHz帯       図のタイトル（data-titleでも指定可）
 *   @ticks 5600 5755 ...  上部に表示する目盛り（省略で全境界）
 *   @break 5755 5775     指定周波数でグラフを折り返す（複数指定可）
 *   @note ※注釈          図の下に注釈を追加（複数可）
 *   // コメント            コメント行（# で始まる行も同様）
 *
 * 【追加オプション】 各行の末尾に | 区切りで指定
 *   | row=1               重複時の表示段を指定（省略時は自動割当）
 *   | y=0:2               上下方向の表示位置を細かく指定
 *   | color=violet        背景色を指定（3列目より優先）
 *   | tone=cw             初期配色の色カテゴリを指定
 *   | note=説明           マウスを乗せた際の補足説明
 *
 * 【表示属性】
 *   data-unit="MHz"        周波数単位（初期値 MHz）
 *   data-title="144MHz帯"  タイトル
 *   data-compression="0.9" 0=線形、1=対数のみ（初期値 0.9）
 *   data-max-lines="3"    折り返し行数の目安
 *   data-font-size="13"   ラベルの文字サイズ（px）
 *   data-track-height="26" 1段の高さ（px）
 *
 * 【途中改行と重なりの例】
 *   <div class="js-bandgraph" data-title="5600MHz帯" data-unit="MHz">
 *   @break 5755 5775
 *   5600 5755 #cbd0d5 衛星など
 *   5755 5757 #b1a8cf ビーコン
 *   5757 5760 violet 全電波形式
 *   5760 5762 #00fa9a CW・狭帯域の電話・電信・画像
 *   5762 5770 #c5c3dd 全電波形式
 *   5770 5850 #c5c3dd 全電波形式
 *   </div>
 *
 *   <div class="js-bandgraph" data-title="50MHz帯" data-track-height="26">
 *   50.00 50.07 CW | y=0:2
 *   50.07 50.30 狭帯域の全電波形式 | y=0:2
 *   50.00 50.30 EME | y=2:3
 *   50.30 51.00 狭帯域の全電波形式 | y=0:3
 *   </div>
 *
 * 【MkDocs Material】
 * docs/assets/bandgraph.js にこのファイルを置き、mkdocs.ymlの
 * 既存 extra_javascript リストに「- assets/bandgraph.js」を追記。
 * extra_cssの設定は不要。MaterialのInstant Navigationにも対応。
 * Markdownには上記のdivをそのまま記述します（空行は挟まない）。
 *
 * 【プログラムから再描画】
 *   BandGraph.render(document.querySelector('.js-bandgraph'),
 *                    '50.00 50.07 CW\n50.07 54.00 全電波形式');
 *   BandGraph.init();  // 新規要素を走査（通常は呼び出し不要）
 *
 * 描画結果は教材・出版向けの模式図です。例示の周波数・運用区分は
 * 最新の国内バンドプランへの準拠を保証しません。運用前にご確認ください。
 * License: MIT
 */

(() => {
  'use strict';

  const STYLE_ID = 'bandgraph-embedded-css';
  const STYLES = String.raw`/* BandGraph. Colors inspired by the provided band-plan illustrations. MIT License. */
.js-bandgraph {
  --bandgraph-text: #18212b;
  --bandgraph-border: #425264;
  display: block;
  max-width: 100%;
  white-space: normal;
  margin: 1.1rem 0 1.6rem;
}
.bandgraph { width: 100%; font-family: system-ui, -apple-system, "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif; }
.bandgraph__heading { display: flex; align-items: center; gap: 0; min-height: 27px; margin-bottom: 6px; }
.bandgraph__title, .bandgraph__unit {
  color: #fff; font-size: 13px; font-weight: 750; line-height: 1.4;
  padding: 1px 5px; white-space: nowrap;
}
.bandgraph__title { background: #00a45d; }
.bandgraph__unit { background: #0754ae; }
.bandgraph__rule { flex: 1; border-top: 2px solid #0754ae; margin-left: 2px; }
.bandgraph__scroll {
  max-width: 100%; overflow-x: auto; overflow-y: hidden;
  overscroll-behavior-x: contain; padding-bottom: 5px;
}
/* Each @break creates a separately fitted, independently scrollable line. */
.bandgraph__segment + .bandgraph__segment { margin-top: 12px; }
.bandgraph__scroll:focus-visible { outline: 2px solid #0754ae; outline-offset: 2px; }
.bandgraph__inner { min-width: 0; position: relative; }
.bandgraph__axis { position: relative; color: var(--md-default-fg-color, #222); }
.bandgraph__tick {
  position: absolute; font: 600 11px/14px system-ui, "Noto Sans JP", sans-serif;
  white-space: nowrap;
}
.bandgraph__tickline { position: absolute; width: 1px; height: 7px; bottom: 0; background: #526475; }
.bandgraph__plot { position: relative; background: transparent; }
.bandgraph__block {
  position: absolute; box-sizing: border-box;
  display: flex; justify-content: center; align-items: center; text-align: center;
  border: 0.8px solid var(--bandgraph-border); padding: 2px 4px;
  color: var(--bandgraph-text); font-weight: 650; line-height: 1.24;
  white-space: pre-line; overflow-wrap: anywhere; word-break: normal;
  overflow: hidden;
}
.bandgraph__block--cw { background: #94d8f1; }
.bandgraph__block--narrow { background: #f9cda7; }
.bandgraph__block--all { background: #c5c3dd; }
.bandgraph__block--eme { background: #77b596; }
.bandgraph__block--satellite { background: #cbd0d5; }
.bandgraph__block--repeater { background: #f4edab; }
.bandgraph__block--beacon { background: #b1a8cf; }
.bandgraph__block--voip { background: #fce844; }
.bandgraph__block--atv { background: #f6bd8f; }
.bandgraph__block--wide { background: #b3dfd1; }
.bandgraph__block--other { background: #d9e0e5; }
.bandgraph__notes { font-size: 11px; line-height: 1.45; margin-top: 5px; }
.bandgraph__error { color: #ac2c29; padding: .65rem; border: 1px solid currentColor; }
@media (prefers-reduced-motion: no-preference) {
  .bandgraph__scroll { scroll-behavior: smooth; }
}

/* Tiny arrows show that a colored block continues across a manual line break. */
.bandgraph__block--continued-left::before,
.bandgraph__block--continued-right::after {
  position: absolute; top: 50%; transform: translateY(-50%);
  font-size: 12px; font-weight: 800; line-height: 1; opacity: .7;
  pointer-events: none;
}
.bandgraph__block--continued-left::before { content: "‹"; left: 1px; }
.bandgraph__block--continued-right::after { content: "›"; right: 1px; }`;
  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLES;
    (document.head || document.documentElement).appendChild(style);
  }

  const COLOR_NAMES = new Set([
    'cw', 'narrow', 'all', 'eme', 'satellite', 'repeater',
    'beacon', 'voip', 'wide', 'atv', 'other'
  ]);
  const measured = document.createElement('canvas').getContext('2d');
  const EPS = 1e-8;
  const raf = window.requestAnimationFrame || (fn => window.setTimeout(fn, 0));
  const observed = new WeakMap();

  function parseNumber(s) {
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return NaN;
    return Number(s);
  }
  function coordinateKey(n) { return n.toFixed(8); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function isCssColorToken(value) {
    if (!value) return false;
    // The browser validates CSS colors so that unknown names are treated as
    // ordinary label text, rather than requiring explicit color syntax.
    if (window.CSS && typeof window.CSS.supports === 'function') {
      return window.CSS.supports('color', value);
    }
    // Fallback for older browsers. CSS hex colors always work.
    return /^#[0-9a-fA-F]{3,4}(?:[0-9a-fA-F]{3,4})?$/.test(value);
  }

  function parse(source, host) {
    const items = [], notes = [], points = new Map(), breakValues = [];
    let title = host.dataset.title || '';
    let tickLabels = null;

    const point = (text, lineNo) => {
      const n = parseNumber(text);
      if (!Number.isFinite(n)) throw Error(`${lineNo}行目: 周波数 ${text} が不正です`);
      const key = coordinateKey(n);
      if (!points.has(key)) points.set(key, { value: n, label: text });
      return n;
    };

    source.split(/\r?\n/).forEach((rawLine, index) => {
      const lineNo = index + 1;
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) return;
      if (line.startsWith('@title ')) { title = line.slice(7).trim(); return; }
      if (line.startsWith('@note ')) { notes.push(line.slice(6).trim()); return; }
      if (line.startsWith('@ticks ')) { tickLabels = line.slice(7).trim().split(/\s+/); return; }
      if (line.startsWith('@break ')) {
        const values = line.slice(7).trim().split(/\s+/);
        for (const value of values) breakValues.push({ value: point(value, lineNo), sourceLine: lineNo });
        return;
      }
      const fields = line.split(/\s*\|\s*/);
      const match = fields[0].match(/^(\S+)\s+(\S+)\s+(.+)$/);
      if (!match) throw Error(`${lineNo}行目: 「開始周波数 終了周波数 名称」の形式で指定してください`);
      const start = point(match[1], lineNo), end = point(match[2], lineNo);
      if (end - start <= EPS) throw Error(`${lineNo}行目: 終了周波数は開始周波数より大きくしてください`);
      let label = match[3];
      let colorFromColumn = '';
      // An optional CSS color precedes the label. Functions may contain spaces,
      // e.g. rgb(220 220 245) / hsl(160 80% 60%).
      const optionalColor = label.match(/^((?:rgba?|hsla?)\([^)]*\)|\S+)\s+(.+)$/i);
      if (optionalColor && isCssColorToken(optionalColor[1])) {
        colorFromColumn = optionalColor[1];
        label = optionalColor[2];
      }
      const item = { start, end, label: label.replace(/\\n/g, '\n'), sourceLine: lineNo,
        index: items.length, y0: null, y1: null, explicit: false, tone: '', color: colorFromColumn, description: '' };
      for (const opt of fields.slice(1)) {
        const eq = opt.indexOf('=');
        if (eq < 0) throw Error(`${lineNo}行目: オプションは key=value 形式です (${opt})`);
        const key = opt.slice(0, eq).trim().toLowerCase(), value = opt.slice(eq + 1).trim();
        if (key === 'row') {
          const n = Number(value);
          if (!Number.isInteger(n) || n < 0 || n > 30) throw Error(`${lineNo}行目: row は0～30の整数です`);
          item.y0 = n; item.y1 = n + 1; item.explicit = true;
        } else if (key === 'y') {
          const m = value.match(/^(\d+):(\d+)$/);
          if (!m || +m[2] <= +m[1] || +m[2] > 40) throw Error(`${lineNo}行目: y は 0:2 のような形式です`);
          item.y0 = +m[1]; item.y1 = +m[2]; item.explicit = true;
        } else if (key === 'tone') {
          if (!COLOR_NAMES.has(value)) throw Error(`${lineNo}行目: 未定義のtone (${value})`);
          item.tone = value;
        } else if (key === 'color') {
          if (!isCssColorToken(value))
            throw Error(`${lineNo}行目: color には CSS の色名・#rrggbb・rgb()・hsl() を指定してください`);
          item.color = value;
        } else if (key === 'note') {
          item.description = value;
        } else {
          throw Error(`${lineNo}行目: 不明なオプション (${key})`);
        }
      }
      items.push(item);
    });
    if (!items.length) throw Error('表示する周波数区間がありません');

    const low = Math.min(...items.map(x => x.start));
    const high = Math.max(...items.map(x => x.end));
    for (const b of breakValues) {
      if (b.value <= low + EPS || b.value >= high - EPS)
        throw Error(`${b.sourceLine}行目: @break は表示範囲の内側の周波数を指定してください`);
    }
    const breaks = [...new Set(breakValues.map(b => coordinateKey(b.value)))].map(k => points.get(k).value).sort((a, b) => a - b);
    const boundaries = [...points.values()].sort((a, b) => a.value - b.value);
    if (tickLabels) {
      const allowed = new Set(boundaries.map(x => coordinateKey(x.value)));
      tickLabels = tickLabels.map(t => {
        const n = parseNumber(t);
        if (!Number.isFinite(n) || !allowed.has(coordinateKey(n)))
          throw Error(`@ticks の ${t} は区間境界の周波数ではありません`);
        return { value: n, label: t };
      }).sort((a, b) => a.value - b.value);
    } else {
      tickLabels = boundaries;
    }
    return { items, notes, boundaries, tickLabels, title, breaks };
  }

  function intervalsOverlap(a, b) {
    return a.start < b.end - EPS && b.start < a.end - EPS;
  }
  function layoutRows(items) {
    // Explicit y ranges take precedence; other intervals occupy the first free row.
    const placed = items.filter(x => x.explicit);
    for (const item of items.filter(x => !x.explicit)) {
      let row = 0;
      while (placed.some(other => intervalsOverlap(item, other) &&
        row < other.y1 && row + 1 > other.y0)) row++;
      item.y0 = row; item.y1 = row + 1;
      placed.push(item);
    }
    return Math.max(...items.map(x => x.y1));
  }

  function naturalTone(label) {
    if (/EME/i.test(label)) return 'eme';
    if (/レピータ/.test(label)) return 'repeater';
    if (/衛星/.test(label)) return 'satellite';
    if (/ビーコン/.test(label)) return 'beacon';
    if (/VoIP/i.test(label)) return 'voip';
    if (/ATV/i.test(label)) return 'atv';
    if (/CW/i.test(label)) return 'cw';
    if (/狭帯域/.test(label)) return 'narrow';
    if (/広帯域/.test(label)) return 'wide';
    if (/全電波形式/.test(label)) return 'all';
    return 'other';
  }

  function labelMinWidth(item, rowHeight, fontSize, maxLines) {
    measured.font = `600 ${fontSize}px sans-serif`;
    const lines = item.label.split('\n');
    const availableLines = Math.max(lines.length,
      Math.min(maxLines, Math.floor(((item.y1 - item.y0) * rowHeight - 5) / (fontSize * 1.24))));
    const widths = lines.map(s => measured.measureText(s).width);
    let lo = 1, hi = Math.max(2, ...widths) + 2;
    // Estimate Japanese and ASCII line wrapping; explicit newlines consume lines.
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      const required = widths.reduce((sum, w) => sum + Math.max(1, Math.ceil((w - .001) / mid)), 0);
      if (required <= availableLines) hi = mid; else lo = mid;
    }
    return Math.ceil(Math.max(34, hi + 13));
  }

  function allocateWidths(boundaries, items, targetWidth, rowHeight, fontSize, maxLines, compression) {
    const deltas = boundaries.slice(1).map((p, i) => p.value - boundaries[i].value);
    const sortedDeltas = [...deltas].sort((a, b) => a - b);
    const scale = sortedDeltas[Math.floor(sortedDeltas.length / 2)] || 1;
    const logValues = deltas.map(d => Math.log1p(d / scale));
    const logSum = logValues.reduce((a, b) => a + b, 0);
    const linearSum = deltas.reduce((a, b) => a + b, 0);
    const weights = deltas.map((d, i) =>
      (1 - compression) * d / linearSum + compression * logValues[i] / logSum);
    const widths = deltas.map(() => 2);
    const keyToIndex = new Map(boundaries.map((b, i) => [coordinateKey(b.value), i]));
    const constraints = items.map(item => ({
      i: keyToIndex.get(coordinateKey(item.start)),
      j: keyToIndex.get(coordinateKey(item.end)),
      min: item.showLabel ? labelMinWidth(item, rowHeight, fontSize, maxLines) : 0
    })).sort((a, b) => (a.j - a.i) - (b.j - b.i) || a.i - b.i);

    for (const c of constraints) {
      const current = widths.slice(c.i, c.j).reduce((a, b) => a + b, 0);
      const deficit = Math.max(0, c.min - current);
      if (deficit < .001) continue;
      const total = weights.slice(c.i, c.j).reduce((a, b) => a + b, 0);
      for (let k = c.i; k < c.j; k++) widths[k] += deficit * weights[k] / total;
    }
    const minimum = widths.reduce((a, b) => a + b, 0);
    const extra = Math.max(0, targetWidth - minimum);
    for (let k = 0; k < widths.length; k++) widths[k] += extra * weights[k];
    const x = [0];
    for (const w of widths) x.push(x[x.length - 1] + w);
    return { x, width: x[x.length - 1], keyToIndex };
  }

  function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function ticksLayout(ticks, xFor, width) {
    measured.font = '11px sans-serif';
    const lastRight = [];
    return ticks.map((tick, n) => {
      const x = xFor(tick.value);
      const labelW = measured.measureText(tick.label).width + 7;
      const left = n === 0 ? 0 : n === ticks.length - 1 ? width - labelW : x - labelW / 2;
      let tier = lastRight.findIndex(right => left >= right + 5);
      if (tier < 0) { tier = lastRight.length; lastRight.push(-Infinity); }
      lastRight[tier] = left + labelW;
      return { ...tick, x, left: Math.max(0, left), tier };
    });
  }

  function render(host) {
    ensureStyles();
    const source = host._bandgraphSource === undefined ? host.textContent : host._bandgraphSource;
    host._bandgraphSource = source;
    let chart;
    try { chart = parse(source, host); }
    catch (e) {
      host.replaceChildren(make('p', 'bandgraph__error', `BandGraph: ${e.message}`));
      return;
    }
    const { items, notes, boundaries, tickLabels, breaks } = chart;
    const rows = layoutRows(items);
    const explicitSubrows = items.some(item => item.explicit &&
      (item.y1 - item.y0 !== 1 || /y=/.test(source)));
    const rowHeight = clamp(Number(host.dataset.trackHeight) || (explicitSubrows ? 26 : 51), 18, 100);
    const maxLines = clamp(Number(host.dataset.maxLines) || 3, 1, 10);
    const fontSize = clamp(Number(host.dataset.fontSize) || 13, 9, 22);
    const compression = clamp(Number(host.dataset.compression ?? .9), 0, 1);
    const target = Math.max(250, host.clientWidth || 720);
    const low = boundaries[0].value, high = boundaries[boundaries.length - 1].value;
    const splitPoints = [low, ...breaks, high];
    const sections = splitPoints.slice(1).map((end, index) => {
      const start = splitPoints[index];
      const sectionBoundaries = boundaries.filter(b => b.value >= start - EPS && b.value <= end + EPS);
      const pieces = items.filter(item => item.start < end - EPS && item.end > start + EPS)
        .map(item => ({ ...item, original: item, start: Math.max(item.start, start),
          end: Math.min(item.end, end), showLabel: false,
          continuesLeft: item.start < start - EPS, continuesRight: item.end > end + EPS }));
      return { start, end, boundaries: sectionBoundaries, pieces };
    });
    // A block may cross one or more @break positions. Reserve space for its label
    // in the longest visible fragment; shorter fragments show continuation marks.
    // This avoids making a tiny fragment enormous merely to fit a long label.
    for (const item of items) {
      const fragments = sections.flatMap(section => section.pieces.filter(p => p.original === item));
      if (fragments.length) {
        fragments.reduce((a, b) => b.end - b.start > a.end - a.start ? b : a).showLabel = true;
      }
    }

    const root = make('div', 'bandgraph');
    if (chart.title || host.dataset.band) {
      const header = make('div', 'bandgraph__heading');
      header.append(make('span', 'bandgraph__title', chart.title || host.dataset.band),
        make('span', 'bandgraph__unit', `周波数・${host.dataset.unit || 'MHz'}`),
        make('span', 'bandgraph__rule'));
      root.append(header);
    }
    const boundaryLabels = new Map(boundaries.map(b => [coordinateKey(b.value), b.label]));
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const section = sections[sectionIndex];
      const { x, width, keyToIndex } = allocateWidths(section.boundaries, section.pieces,
        target, rowHeight, fontSize, maxLines, compression);
      const xFor = value => x[keyToIndex.get(coordinateKey(value))];
      // Include the endpoints even when @ticks filters the interior markers:
      // each wrapped line remains readable on its own.
      const selected = new Map(tickLabels
        .filter(t => t.value >= section.start - EPS && t.value <= section.end + EPS)
        .map(t => [coordinateKey(t.value), t]));
      if (breaks.length) {
        for (const v of [section.start, section.end]) {
          const key = coordinateKey(v);
          if (!selected.has(key)) selected.set(key, { value: v, label: boundaryLabels.get(key) || String(v) });
        }
      }
      const tickList = [...selected.values()].sort((a, b) => a.value - b.value);
      const ticks = ticksLayout(tickList, xFor, width);
      const axisHeight = 13 + (Math.max(0, ...ticks.map(t => t.tier)) + 1) * 17;

      const scroll = make('div', 'bandgraph__scroll');
      if (breaks.length) scroll.classList.add('bandgraph__segment');
      scroll.tabIndex = 0;
      scroll.setAttribute('aria-label', `${boundaryLabels.get(coordinateKey(section.start))}～${boundaryLabels.get(coordinateKey(section.end))} ${host.dataset.unit || 'MHz'} の周波数割り当て図。横方向にスクロールできます`);
      const inner = make('div', 'bandgraph__inner');
      inner.style.width = `${Math.ceil(width)}px`;
      const axis = make('div', 'bandgraph__axis');
      axis.style.height = `${axisHeight}px`;
      for (const tick of ticks) {
        const tickEl = make('span', 'bandgraph__tick', tick.label);
        tickEl.style.left = `${tick.left}px`;
        tickEl.style.top = `${3 + tick.tier * 17}px`;
        axis.append(tickEl);
        const line = make('span', 'bandgraph__tickline');
        line.style.left = `${tick.x}px`;
        axis.append(line);
      }
      const plot = make('div', 'bandgraph__plot');
      plot.style.height = `${rowHeight * rows}px`;
      plot.style.fontSize = `${fontSize}px`;
      for (const item of section.pieces) {
        const spanWidth = xFor(item.end) - xFor(item.start);
        // A secondary fragment may be labeled when it naturally has room;
        // it never forces the other blocks to become wider.
        const showLabel = item.showLabel || spanWidth >= labelMinWidth(item, rowHeight, fontSize, maxLines);
        const classes = ['bandgraph__block', `bandgraph__block--${item.tone || naturalTone(item.label)}`];
        if (item.continuesLeft) classes.push('bandgraph__block--continued-left');
        if (item.continuesRight) classes.push('bandgraph__block--continued-right');
        const block = make('div', classes.join(' '), showLabel ? item.label : '');
        block.style.left = `${xFor(item.start)}px`;
        block.style.top = `${item.y0 * rowHeight}px`;
        block.style.width = `${spanWidth}px`;
        block.style.height = `${(item.y1 - item.y0) * rowHeight}px`;
        if (item.color) block.style.backgroundColor = item.color;
        block.title = `${boundaryLabels.get(coordinateKey(item.original.start))}–${boundaryLabels.get(coordinateKey(item.original.end))} ${host.dataset.unit || 'MHz'}: ${item.label}${item.description ? ' — ' + item.description : ''}`;
        block.setAttribute('aria-label', block.title);
        plot.append(block);
      }
      inner.append(axis, plot);
      scroll.append(inner);
      root.append(scroll);
    }
    if (notes.length) {
      const footnotes = make('div', 'bandgraph__notes');
      for (const note of notes) footnotes.append(make('div', '', note));
      root.append(footnotes);
    }
    host.replaceChildren(root);
    host.dataset.bandgraphReady = 'true';
  }

  function init(scope = document) {
    ensureStyles();
    const hosts = [];
    if (scope.matches?.('.js-bandgraph')) hosts.push(scope);
    hosts.push(...scope.querySelectorAll('.js-bandgraph'));
    for (const host of hosts) {
      if (host.dataset.bandgraphReady === 'true') continue;
      render(host);
      if (window.ResizeObserver && !observed.has(host)) {
        let previousWidth = host.clientWidth;
        const obs = new ResizeObserver(() => {
          const w = host.clientWidth;
          if (Math.abs(w - previousWidth) < 2) return;
          previousWidth = w;
          raf(() => { if (host.isConnected) render(host); });
        });
        obs.observe(host);
        observed.set(host, obs);
      }
    }
  }

  window.BandGraph = {
    init,
    render(host, source) {
      if (typeof host === 'string') host = document.querySelector(host);
      if (!host) throw new Error('描画先の要素が見つかりません');
      if (typeof source === 'string') host._bandgraphSource = source;
      render(host);
    },
    parse
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  else init();
  // MkDocs Material instant navigation swaps the document without a new DOMContentLoaded.
  if (window.document$ && typeof window.document$.subscribe === 'function') {
    window.document$.subscribe(() => init());
  }
})();
