# バンドグラフ

**周波数を記述する。帯域が、図になる。**

周波数ごとの使用区別や用途を、色分けした帯域図として表示するツールです。  
**アマチュア無線のバンドプラン図をいい感じに自動生成するプログラムです。**

周波数軸を対数圧縮する事で、実際の幅の大小関係をなるべく保ちつつ、見やすいレイアウトを自動計算するアルゴリズムとして作成しました。周波数区間と用途を記述するだけで、区分の密度や文字量、重複した用途まで考慮して描画します。

**[bandgraph.js — JavaScript本体](../../javascripts/bandgraph.js)** · [GitHubでソースコードを見る](https://github.com/CQAKIBA/AmateurRadio-Handbook/blob/main/docs/javascripts/bandgraph.js)

<small>Copyright (c) 2026 Daisuke JA1UMW / CQAKIBA.TOKYO  
Released under the MIT License.</small>

## ブラウザで試す

下の入力欄に **`<div class="js-bandgraph">` から `</div>` まで**を貼り付け、「プレビューを更新」を押してください。ページ内だけで描画するので、入力内容はサーバーへ送信されません。最初は、複数の区間が重なる50MHz帯のサンプルが入っています。

<div class="bandgraph-playground" data-bandgraph-playground>
  <label class="bgp__label" for="bandgraph-source">HTML（周波数区間を含む div 全体）</label>
  <textarea class="bgp__editor" id="bandgraph-source" spellcheck="false" rows="16" aria-label="バンドグラフのHTMLソース">&lt;div class="js-bandgraph" data-title="50MHz帯" data-unit="MHz" data-compression="0.5"&gt;
50.00 50.10 turquoise CW | y=0:2
50.00 50.30 greenyellow EME | y=2:3
50.10 50.20 plum - | y=0:2
50.20 50.30 plum - | y=1:2
50.30 51.00 plum CW\n狭帯域の電話・電信・画像 | y=1:3
50.20 51.00 deepskyblue 狭帯域データ | y=0:1
51.00 52.00 springgreen 広帯域の電話・電信・画像 | y=0:3
52.00 52.30 khaki VoIP | y=0:3
52.30 52.50 plum CW\n狭帯域の電話・電信・画像 | y=0:3
52.50 52.90 orange 広帯域データ | y=0:3
52.90 54.00 magenta 全電波形式（実験・研究用） | y=0:3
@break 52.00
@note ※ この図は描画テスト用サンプルです。実際の運用では最新のバンドプランを確認してください。
&lt;/div&gt;</textarea>
  <div class="bgp__controls">
    <button class="bgp__button bgp__button--primary" type="button" data-bgp-render>プレビューを更新</button>
    <button class="bgp__button" type="button" data-bgp-copy>HTMLをコピー</button>
    <button class="bgp__button" type="button" data-bgp-reset>サンプルに戻す</button>
    <label class="bgp__compression">対数圧縮 <input type="range" min="0" max="1" step="0.05" value="0.5" data-bgp-compression aria-label="対数圧縮の強さ"> <output data-bgp-compression-output>0.50</output></label>
  </div>
  <p class="bgp__status" role="status" aria-live="polite" data-bgp-status></p>
  <div class="bgp__preview" data-bgp-preview aria-label="バンドグラフ描画結果"></div>
</div>

## 基本の記述方法

ライブラリを読み込んだページに、次のHTMLを置くとバンドグラフが生成されます。このハンドブックでは `bandgraph.js` をサイト全体で読み込んでいるので、本文に `div` を書くだけで使えます。

```html
<div class="js-bandgraph" data-title="7MHz帯" data-unit="MHz">
7.000 7.030 turquoise CW
7.030 7.200 sandybrown 狭帯域の全電波型式
@note ※ 7.050MHzは非常通信周波数です。
</div>
```

1行にひとつの区間を **`開始周波数 終了周波数 [色] ラベル`** の順で記述します。単位は `data-unit` で表示する文字列を決めます。周波数の数値は、その単位に合わせてそろえてください。

```text
50.00 50.10 turquoise CW
50.10 50.20 #dda0dd 狭帯域の全電波型式
50.20 50.30 CW
```

3番目の要素が `turquoise` や `#dda0dd` などの有効なCSS色なら背景色として使用し、色がなければラベルの内容から自動的に配色します。ラベル中の `\n` はセル内の改行です。たとえば `CW\n狭帯域データ` は2行に表示されます。長いラベルはセル内で自動的に折り返されることもあります。

## 上下方向の配置：`y=0:3` の意味

`y=` は**「上端の段番号 : 下端の段番号（ここは含まない）」**です。段は上から0、1、2…と数えます。`y=0:3` は、0段目から2段目までの**3段全部**を使う指定です。

| 指定 | 0段目（上） | 1段目（中） | 2段目（下） |
| --- | :---: | :---: | :---: |
| `y=0:3` | ■ | ■ | ■ |
| `y=0:2` | ■ | ■ | · |
| `y=1:3` | · | ■ | ■ |
| `y=2:3` | · | · | ■ |
| `y=0:1` | ■ | · | · |

同じ周波数に複数のブロックを重ねたいときは、**周波数が重なっていても `y` の使用段が重ならないように**配置します。例えば、EMEを下1段、CWを上2段にするときは次のようにします。

```text
50.00 50.30 turquoise CW | y=0:2
50.00 50.30 greenyellow EME | y=2:3
```

**`|` 以降はレイアウトのオプション**です。`y` を省略すると、周波数が重なるブロックをなるべく重ならない空き段に自動配置します。`row=1` は `y=1:2` の省略形です。`-` は特別な命令ではなく、単に「-」と表示するラベルです。

## 周波数目盛りとグラフの折り返し

```text
@ticks 50.00 50.10 50.20 50.30 51.00 52.00 54.00
@break 52.00
```

`@ticks` は**上部に数字を表示する目盛り**を指定します。省略すると、ブロックの開始・終了周波数から取り出したすべての境界を表示します。目盛りの指定は、列の構造や幅を変更しません。

`@break` は指定周波数で図を上下の行へ折り返します。`@break 52.00 52.90` のように複数指定もできます。ブロックの途中を指定しても分割して描画します。折り返し後は**各行で横幅を再計算**するため、細かな区間だけを広く見せる用途にも使えます。

## 色・表示設定・注釈

| 記述 | 用途 |
| --- | --- |
| `data-title="50MHz帯"` | 図のタイトル |
| `data-unit="MHz"` | 周波数の表示単位（既定はMHz） |
| `data-compression="0.5"` | 横幅の圧縮率。`0` は実際の周波数幅を重視、`1` は対数圧縮を重視。既定値は `0.5` |
| `data-track-height="26"` | 上下1段分の高さ（px） |
| `data-font-size="13"` | ブロック内の文字サイズ（px） |
| `data-max-lines="3"` | 文字の折り返し行数の目安 |
| `\| color=#00fa9a` | 背景色を右側のオプションとして指定（3列目より優先） |
| `\| tone=cw` | 自動配色の種類を指定 |
| `\| note=説明文` | ブロックを指したときに出る補足 |
| `@note 説明文` | グラフの下に注釈を表示。複数記述可能 |
| `// コメント` | 描画されない説明行（行頭の `#` も可） |

色はCSSの色名（`violet`、`turquoise`など）、16進数（`#00fa9a`）、`rgb(...)` や `hsl(...)` が使えます。指定しない場合は、用途名から選んだ色を使います。ラベルを変更しても色を一定に保ちたい場合は、色を明示しておくと便利です。

横幅は**周波数の幅を圧縮して求めた値**を基準とし、文字が読めなくなる区間には必要な幅を追加して調整します。そのため、目盛り位置は必ずしも通常の線形周波数軸とは一致しません。図は区分を読みやすくするための模式図であり、帯域幅の精密な比較には周波数の数値を使用してください。

この描画機能は [`bandgraph.js`](https://github.com/CQAKIBA/AmateurRadio-Handbook/blob/main/docs/javascripts/bandgraph.js) に収録されています。改善案や動作例は [GitHub Issues](https://github.com/CQAKIBA/AmateurRadio-Handbook/issues) から共有できます。