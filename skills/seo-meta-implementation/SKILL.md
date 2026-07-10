---
name: seo-meta-implementation
description: Web制作の実案件で、meta タグ・OGP・構造化データ（JSON-LD）を実装する際に使用する。「SEO対応して」「metaタグ入れて」「OGP設定して」「構造化データ入れて」等の依頼、および新規ページ作成時のhead実装で常に併用する。wordpress-developmentと併用する場合はfunctions.php側でのテンプレート化も検討する。
---

# SEO・メタタグ実装ルール

Web制作の実案件で、ページの`head`を実装する際は以下のルールに従う。

## 基本メタタグ

- `title` はページごとに個別の内容にする（サイト名だけの重複や使い回しをしない。例: `ページ名｜サイト名`）
- `meta description` はページ内容を要約した100〜120文字程度で、ページごとに個別に書く
- `viewport` は `<meta name="viewport" content="width=device-width, initial-scale=1">` を基本とする
- 正規URLが必要な場合（重複コンテンツになりやすいページ）は `link rel="canonical"` を設定する
- WordPress案件では `<title>` を直書きせず `add_theme_support('title-tag')` で出力し（`wordpress-development` 参照）、meta description・OGPをテーマ実装とSEO系プラグインのどちらで管理するかを先に決める（二重出力を防ぐ）

## OGP（SNSシェア用）

- 最低限 `og:title` `og:description` `og:image` `og:url` `og:type` を設定する
- `og:image` はシェア時に見切れないサイズ（1200×630px目安）で用意する。相対パスではなく絶対URLで指定する
- Twitter/Xでのシェア表示を整えたい場合は `twitter:card`（`summary_large_image`等）も併せて設定する

```html
<meta property="og:title" content="ページタイトル">
<meta property="og:description" content="ページの説明文">
<meta property="og:image" content="https://example.com/img/ogp.jpg">
<meta property="og:url" content="https://example.com/page/">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
```

## 構造化データ（JSON-LD）

- `<script type="application/ld+json">` で埋め込む（Microdata形式は使わない。保守性が高いJSON-LDを優先）
- ページの性質に応じて適切な `@type` を使う（会社概要ページなら`Organization`、記事なら`Article`、店舗情報なら`LocalBusiness`等）
- `FAQPage` は**新規実装しない**（Googleが2026年5月7日にリッチリザルト表示を完全終了したため。以降Search Consoleの関連レポートも順次終了）。既存サイトの改修時は削除必須ではないが、クライアントには検索結果での特別表示はされない旨を説明する
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
- `favicon`、`apple-touch-icon` 等の基本セットの設置有無を、新規サイト構築時に確認する

## 公開時のインデックス対策（サイト単位）

新規サイト公開時は、head実装に加えて以下の設置・登録を案内する（実際の登録作業はユーザー側）。

- `sitemap.xml` を用意する（静的サイトは生成ツールまたは手書き、WordPressはSEO系プラグインやWP標準機能で自動生成）
- `robots.txt` を設置し、sitemap.xmlの場所を記載する（`Sitemap: https://example.com/sitemap.xml`）
- Google Search Consoleへのサイト登録とsitemap送信を推奨事項として伝える
- OGP実装後は、SNS各社のデバッガー（X Card Validator、Facebookシェアデバッガー等）でキャッシュ確認・更新ができることを伝える

## 出力形式

- 通常はページのhead部分としてまとめて提示する
- OGP画像やロゴ等、実ファイルが必要なものは「ユーザー側で用意が必要」と明示する
