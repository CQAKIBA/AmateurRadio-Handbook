import argparse, csv, html
from pathlib import Path
ap=argparse.ArgumentParser(description='Render SEO-readable static table from the redacted short-message CSV')
ap.add_argument('--data-dir',default='.',help='Directory containing the corpus CSV')
ap.add_argument('--output',default='ナビトラ受信ログ一覧.md',help='Target Markdown file')
args=ap.parse_args()
p=Path(args.data_dir)
rows=list(csv.DictReader((p/'navitra-gps-packet-2005-2008.csv').open(encoding='utf8')))
e=lambda t: html.escape(str(t),quote=True)
text='''# ナビトラ受信ログ検索 ― 2005～2008年

2005～2008年に日本のアマチュア無線で交わされた位置情報と短文を、旧ナビトラ情報サイトの保存資料から検索できます。**当時のコールサイン・アイコン・メッセージを原則そのまま掲載し、正確な位置座標と個人の連絡先は省略しています。**

この一覧は**728種類のコールサイン・アイコン・メッセージの組み合わせ**です。全**1,152件**の受信記録では同じ短文でも日時・速度・方向が変わるため、**最新の観測値を代表として表示**しています。過去の変化を調べる場合は詳細CSVを利用できます。

<div class="navitra-source-links">
  <a href="../assets/data/navitra-gps-packet-2005-2008.csv">短文索引CSV（728種類）</a>
  <a href="../assets/data/navitra-gps-packet-2005-2008-observations.csv">全観測CSV（1,152件、受信時刻・速度・方向・グループ付き）</a>
  <a href="ナビトラ受信ログアーカイブ.md">資料の出典・保存時点・データ解説</a>
</div>

<div id="navitra-search" class="navitra-archive" aria-label="ナビトラ受信ログの検索">
  <div class="navitra-controls">
    <label>検索 <input id="navitra-query" type="search" placeholder="コールサイン・メッセージ・機材名" autocomplete="off"></label>
    <label>年代 <select id="navitra-year"><option value="">すべて</option><option value="2005">2005年</option><option value="2006">2006年</option><option value="2007">2007年</option><option value="2008">2008年</option></select></label>
    <label>分類 <select id="navitra-category"><option value="">すべて</option><option value="移動局">移動局</option><option value="レピーター">レピーター</option><option value="民家">民家</option><option value="その他">その他</option></select></label>
    <label>表示件数 <select id="navitra-page-size"><option value="25">25</option><option value="50" selected>50</option><option value="100">100</option></select></label>
  </div>
  <p id="navitra-status" class="navitra-status" role="status" aria-live="polite">728種類を表示中。検索・絞り込みにはJavaScriptを使用します。</p>
  <div class="navitra-table-scroll">
    <table class="navitra-table">
      <thead><tr><th scope="col">最終掲載</th><th scope="col">呼出符号</th><th scope="col">アイコン</th><th scope="col">メッセージ</th><th scope="col">掲載回数</th><th scope="col">最新速度</th><th scope="col">最新方向</th><th scope="col">グループ</th></tr></thead>
      <tbody>
'''
for r in rows:
 last=r['last_updated_at'][:10]
 yearstr=' '.join(sorted({part[:4] for part in r['snapshots'].split(';')}))
 category=r['category']; idx=r['callsign']
 # Same message may be at different speeds/compass values; preserve latest as marked.
 speed=r['speed_latest_raw']; angle=r['direction_latest_raw'];group=r['reported_group_latest_raw']
 text+=f'        <tr data-years="{e(yearstr)}" data-category="{e(category)}"><td>{e(last)}</td><td>{e(idx)}</td><td>{e(r["icon"])}</td><td class="navitra-message">{e(r["message"]) if r["message"] else "<span class=\"navitra-empty\">（なし）</span>"}</td><td>{e(r["observations"])}</td><td>{e(speed)}</td><td>{e(angle)}</td><td>{e(group)}</td></tr>\n'
text+='''      </tbody>
    </table>
  </div>
  <nav class="navitra-pager" aria-label="ナビトラログのページ切替">
    <button id="navitra-prev" type="button">前のページ</button>
    <span id="navitra-page-status" role="status" aria-live="polite">一覧を読み込み中</span>
    <button id="navitra-next" type="button">次のページ</button>
  </nav>
</div>

速度と移動方向の数値は`.mps`に記録されていた値のままで、**速度単位をkm/hと断定せず、0を必ずしも「静止」と解釈しません**。分類は地図上のアイコンによるもので、実設備の確認結果ではありません。最新値を示している行でも、同じ文章が過去に送られたときの値は異なる場合があります。検索はページ内で完結し、検索語を外部サーバーへ送信しません。

記録には当時の個人的な日常表現も含まれます。**メールアドレス等の連絡先は、元の種類が分かる「［メールアドレスのため掲載省略］」などに置換**しています。詳細な住居座標や個別の追跡URLは公開していません。
'''
Path(args.output).write_text(text,encoding='utf8')
print('Viewer chars',len(text),'rows',len(rows))
