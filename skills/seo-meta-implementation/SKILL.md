---
name: seo-meta-implementation
description: Web制作の実案件で、meta タグ・OGP・構造化データ（JSON-LD）を実装する際に使用する。「SEO対応して」「metaタグ入れて」「OGP設定して」「構造化データ入れて」等の依頼、および新規ページ作成時のhead実装で常に併用する。wordpress-developmentと併用する場合はfunctions.php側でのテンプレート化も検討する。Search Consoleの登録はanalytics-setup、meta descriptionの文言作成はweb-copywriting、表示速度の改善はperformance-optimizationが担当。
---

# SEO・メタタグ実装ルール

Web制作の実案件で、ページの`head`を実装する際は以下のルールに従う。

## 0. 着手前に確認すること

1. **本番URL（ドメイン）が確定しているか**: OGP・canonical・JSON-LDは絶対URLで書くため。未確定なら `https://example.com/` 等のプレースホルダで実装し、**公開前の一括置換が必要**な旨をTODOとして明示する
2. **OGP画像の素材があるか**: サイズは「OGP」節参照。なければクライアント支給か制作側で作るかを確認する（ロゴ流用で仮対応する場合もその旨を明示）
3. **WordPress案件の管理方針**: meta description・OGPをテーマ実装で持つかSEO系プラグインで持つか（判断の目安は次節。二重出力の防止が目的）

## 基本メタタグ

- `title` はページごとに個別の内容にする（サイト名だけの重複や使い回しをしない。例: `ページ名｜サイト名`）
- `meta description` はページ内容を要約した100〜120文字程度で、ページごとに個別に書く
- `viewport` は `<meta name="viewport" content="width=device-width, initial-scale=1">` を基本とする
- 正規URLが必要な場合（重複コンテンツになりやすいページ）は `link rel="canonical"` を設定する
- WordPress案件では `<title>` を直書きせず `add_theme_support('title-tag')` で出力し（`wordpress-development` 参照）、meta description・OGPをテーマ実装とSEO系プラグインのどちらで管理するかを先に決める（二重出力を防ぐ）。判断の目安: **クライアントが公開後に自分でmeta/OGPを編集したい → SEO系プラグイン管理（テーマは出力しない）/ 制作側で固定管理する小規模サイト → テーマ実装**。どちらか一方に寄せる

## OGP（SNSシェア用）

- 基本セットは `og:title` `og:description` `og:image` `og:url` `og:type` + `og:site_name` `og:locale`
- `og:type` はトップ・通常ページが `website`、ブログ記事・お知らせ詳細が `article`、代表挨拶・スタッフ紹介など人物単位のページは `profile`（`profile:first_name` / `profile:last_name` を併記できる）
- `og:image` はシェア時に見切れないサイズ（1200×630px目安）で用意する。相対パスではなく絶対URLで指定する
- Twitter/Xでのシェア表示を整えたい場合は `twitter:card`（`summary_large_image`等）も併せて設定する
- 完全なコードは下記「標準headテンプレート」参照（そちらが正）

## 構造化データ（JSON-LD）

- `<script type="application/ld+json">` で埋め込む（Microdata形式は使わない。保守性が高いJSON-LDを優先）
- ページの性質に応じて適切な `@type` を使う（会社概要ページなら`Organization`、記事なら`Article`、店舗情報なら`LocalBusiness`等）
- `FAQPage` は新規実装しない（リッチリザルト終了済み）
- 実在しない情報・確認できない情報をでっち上げない。ユーザーから提供された情報のみを使う

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "会社名",
    "url": "https://example.com",
    "logo": "https://example.com/img/logo.png"
  }
</script>
```

## 見出し・構造面（SEOに関わるHTML面）

- `h1` はページ内で1つ、ページの主題を表す内容にする（`coding-standard`の見出し階層ルールと同一方針）
- `alt`属性はSEO面でも重要なので、`coding-standard`の画像実装ルールに従い内容が分かる説明を入れる（キーワードの詰め込みはしない）

## robots・favicon等の基本セット

- 検索エンジンにインデックスさせたくないページ（開発中ページ等）がある場合のみ `<meta name="robots" content="noindex">` を使う。通常ページには付けない。**開発中に付けたnoindexは公開時に必ず外す**
- `favicon`、`apple-touch-icon` 等の基本セットを新規サイト構築時に設置する。標準セットの完全なコードは下記「標準headテンプレート」参照（そちらが正）
- SVGを用意できない案件は `favicon.ico` + `apple-touch-icon` の2つで足りる。元画像はユーザー側で用意が必要

## 公開時のインデックス対策（サイト単位）

新規サイト公開時は、head実装に加えて以下の設置・登録を案内する（実際の登録作業はユーザー側）。

- `sitemap.xml` を用意する（静的サイトは生成ツールまたは手書き、WordPressはSEO系プラグインやWP標準機能で自動生成）
- `robots.txt` を設置し、sitemap.xmlの場所を記載する（`Sitemap: https://example.com/sitemap.xml`）
- Google Search Consoleへの登録・所有権確認・sitemap送信の手順は `analytics-setup` が正。本スキルの担当は sitemap.xml / robots.txt の用意まで
- OGP実装後は、SNS各社の確認手段（Facebookシェアデバッガー等）でキャッシュ確認・更新ができることを伝える。X は Card Validator のプレビュー機能が廃止済みなので、投稿画面にURLを貼ってカード表示を確認する

## 標準headテンプレート（新規ページの雛形）

新規ページのhead実装は、上記ルールを織り込んだ以下の並びを基本形とする（値は案件ごとに置換）。これがコピペで使える完全形（OGP・faviconの正）。WordPressはtitleを `title-tag` に、CSS/JSをenqueueに委ねる点だけ読み替える（`wordpress-development` 参照）。

```html
<html lang="ja"><!-- lang指定必須（WordPressは language_attributes() — wordpress-development 参照） -->
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ページ名｜サイト名</title>
  <meta name="description" content="ページ内容の要約（100〜120文字）">
  <!-- OGP（ルールは上記「OGP」節） -->
  <meta property="og:title" content="ページ名｜サイト名">
  <meta property="og:description" content="ページ内容の要約">
  <meta property="og:image" content="https://example.com/img/ogp.jpg">
  <meta property="og:url" content="https://example.com/page/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="サイト名">
  <meta property="og:locale" content="ja_JP">
  <meta name="twitter:card" content="summary_large_image">
  <!-- favicon等（ルールは上記「robots・favicon等の基本セット」節） -->
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/img/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/img/apple-touch-icon.png"><!-- 180×180px -->
  <!-- CSS・フォント（読み込み最適化は coding-standard / performance-optimization 参照） -->
  <link rel="stylesheet" href="/css/style.css">
  <!-- JS（type="module" はhead内でよい。js-implementation-standard 参照） -->
  <script type="module" src="/js/main.js"></script>
  <!-- JSON-LD（ページ性質に応じて。上記「構造化データ」節参照） -->
</head>
```

- `canonical` / `noindex` は該当ページのみ追加（上記ルール参照）。GTM等の計測タグの位置・実装は `analytics-setup` が正

## 出力形式

- ページのhead部分としてまとめて実装する
- OGP画像やロゴ等、実ファイルが必要なものは「ユーザー側で用意が必要」と明示する

対応レビューエージェント: `seo-meta-checker`
