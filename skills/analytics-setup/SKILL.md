---
name: analytics-setup
description: Webサイトへのアクセス解析・計測ツールの導入で使用する。「GA4入れて」「アナリティクス設定して」「タグマネージャー（GTM）で管理したい」「Search Console登録して」「フォーム送信を計測したい」「コンバージョン設定して」「解析タグを実装して」等の依頼で必ず使う。GA4・GTM・Search Consoleの導入、イベント計測の実装、納品時の設定引き継ぎまでをカバーする。metaタグ・OGPはseo-meta-implementation、公開作業はsite-deploymentと併用する。
---

# アクセス解析・計測導入

GA4 / Googleタグマネージャー（GTM） / Search Console の導入と、実案件で頻出のイベント計測実装。納品時に「解析も設定済みです」と言える状態にするのがゴール。

## 0. 導入前の確認

- [ ] Googleアカウントは**誰のものを使うか**（クライアントのアカウントで作成し、制作者に権限付与してもらうのが原則。制作者アカウントで作ると解約・引き継ぎ時に揉める）
- [ ] 直接GA4タグを貼るか、GTM経由にするか（**GTM経由を推奨**。タグの追加・変更でコード修正が不要になる）
- [ ] 計測したいアクション（コンバージョン）は何か: フォーム送信 / 電話タップ / 外部リンク / 資料DL など
- [ ] プライバシーポリシーにアクセス解析の記載があるか（Cookie利用の明記。なければ追記を提案）

## 1. GTM + GA4 の標準構成（推奨）

### 導入手順

1. GTMでコンテナ作成 → 発行された2つのスニペットを設置:

```html
<!-- Google Tag Manager: headのなるべく上部 -->
<script>(function(w,d,s,l,i){...GTM発行コードをそのまま貼る...})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
```

```html
<!-- Google Tag Manager (noscript): bodyの開始直後 -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
```

2. GA4プロパティ作成 → 測定ID（G-XXXXXXX）を控える
3. GTMに「Googleタグ」を追加し測定IDを設定、トリガーは All Pages（Initialization 推奨）
4. GTMの**プレビューモードで動作確認**してから「公開」（公開を忘れると何も計測されない・定番ミス）
5. GA4のリアルタイムレポートで自分のアクセスが計測されているか確認

### WordPressへの設置

wordpress-developmentスキルの構成に合わせ、テーマに直書きせず `functions.php` でフックする:

```php
// GTMスニペットの出力（headとbody直後）
add_action('wp_head', function() {
  if (is_user_logged_in()) return; // ログイン中の管理者は計測しない
  ?>
  <!-- Google Tag Manager -->
  <script>/* GTM発行コード */</script>
  <?php
}, 1);

add_action('wp_body_open', function() {
  if (is_user_logged_in()) return;
  ?>
  <!-- GTM (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <?php
});
```

テーマ側に `wp_body_open()` の呼び出しがあることを確認する（wordpress-developmentの標準構成なら入っている）。

## 2. 頻出イベント計測

GA4は主要操作（外部リンククリック、スクロール90%、ファイルDL等）を「拡張計測機能」で自動収集する。**まず自動収集で足りるか確認し、足りないものだけ実装**する。

### フォーム送信（最重要コンバージョン）

サンクスページ（`/thanks/` 等）がある場合: GTMで「ページビュー」トリガー＋URLパス条件でイベント送信。実装不要で最も確実。

サンクスページがない（Ajax送信・同一ページ完了）場合: 送信成功時に dataLayer へ push する。form-implementationスキルの送信成功処理に組み込む:

```js
// 送信成功時にGTMへイベントを送る
window.dataLayer = window.dataLayer || [];
dataLayer.push({
  event: 'form_submit_success', // GTM側でこのイベント名をトリガーにする
  form_name: 'contact',         // 複数フォームがある場合の識別用
});
```

Contact Form 7 の場合は送信完了イベントを拾う:

```js
// CF7の送信完了時にdataLayerへ
document.addEventListener('wpcf7mailsent', (e) => {
  dataLayer.push({
    event: 'form_submit_success',
    form_name: e.detail.contactFormId, // フォームIDで識別
  });
});
```

### 電話番号タップ

GTMの「クリック」トリガーで `Click URL` が `tel:` で始まる条件を設定。実装不要。

### コンバージョン登録

計測できたイベントは、GA4の管理画面で「キーイベント」（旧コンバージョン）としてマークする。ここまでやって初めてクライアントが成果を見られる。

## 3. Search Console

登録・所有権確認・sitemap送信の手順は**このスキルを正とする**（sitemap.xml / robots.txt のファイル自体の用意は seo-meta-implementation）。

1. GA4連携済みなら「Googleアナリティクス」方式で所有権確認が最速。未連携ならDNSレコード or HTMLタグで確認
2. `sitemap.xml` を送信（seo-meta-implementationスキルで生成したもの）
3. リニューアル案件では**旧サイトのプロパティを引き継ぎ**、URL変更があればアドレス変更ツールの使用を検討
4. GA4とSearch Consoleを連携しておく（GA4側でも検索クエリが見られる）

## 4. 納品時の引き継ぎ

- [ ] GA4・GTM・Search Consoleの**権限をクライアントアカウントに付与**（GA4/GTMは「編集者」以上、最終的な所有はクライアント側にする）
- [ ] 計測している内容の一覧（何をコンバージョンにしているか）を1枚にまとめて渡す（coding-standards-docスキルの引き継ぎ資料に含めてもよい）
- [ ] 公開直後は数日後にデータが入っているか確認する旨を伝える
- [ ] 自分のアクセスを除外したい場合: GA4の内部トラフィック定義（IP指定）を設定。固定IPがない場合はその旨を説明

## 出力形式

- コードを提示する際は、測定ID・コンテナIDがプレースホルダ（G-XXXXXXX等）であることを明示する
- 「タグを貼るだけ」で終わらせず、プレビュー確認 → 公開 → リアルタイム確認までを手順に含める
- クライアント向け説明が必要な場面（アカウント作成依頼、権限付与手順）では、そのまま送れる依頼文の作成を提案してよい
