---
name: wordpress-development
description: WordPressのテーマ実装全般で使用する。(A)フルスクラッチでのオリジナルテーマ開発（ACF・Local環境前提）と、(B)完成済み静的HTML/CSS/JSのWordPressテーマ化（WP化・移植）の両方をカバーする。「WordPressのテーマを作って」「functions.phpに追加して」「ACFのフィールドを実装して」「WordPress化して」「WP化して」「静的サイトを移植して」「テーマ化して」等の依頼で必ず使用する。HTML/CSSの書き方はcoding-standardと併用する。他人が作った既存WordPressサイトの改修はexisting-site-modificationが担当（本スキルは自分で作るテーマが対象）。
---

# WordPress テーマ開発ルール

WordPressテーマの実装は、まず作業タイプを判別してから進める。

- **A. ゼロから構築**: カンプから直接WordPressテーマとして組む（→ 共通ルール + セクションA）
- **B. 静的HTML→WP化**: 完成済みの静的サイトをテンプレート分割して移植する（→ 共通ルール + セクションB）

いずれもページビルダー（Elementor等）や既製テーマのカスタマイズではなく、`functions.php` から自作するスタイルを前提とする。HTML/CSSのクラス命名・単位・a11y・画像は `coding-standard` に従う。

## 共通ルール

### テーマの基本構成

ディレクトリ構成（`functions.php` の `inc/` 分割・`template-parts/`・`assets/`・`acf-json/` の配置）は `references/theme-skeleton.md` が正。テーマのファイルを組む前に必ず読む。

`style.css` の先頭にはテーマ情報コメントが必須（これがないとテーマとして認識されない）。

```css
/*
Theme Name: サイト名
Theme URI:
Author:
Description:
Version: 1.0
*/
```

実際のスタイルは `assets/css/` 等に分離し、ルートの `style.css` はテーマ情報のみにするのが基本（案件のビルド構成に合わせて調整可）。

### functions.php / アセット読み込み

- `functions.php` に処理を直書きせず、`inc/` 配下に分割して `require_once` で読み込む
- `inc/theme-support.php` には最低限 `add_theme_support('title-tag')`（`<title>`の自動出力。headに`<title>`を直書きしない）と `add_theme_support('post-thumbnails')` を宣言する。titleやmeta descriptionをSEO系プラグインで管理する案件では、テーマ側と二重出力にならないよう分担を確認する（**テーマ実装かプラグイン管理かの判断基準は `seo-meta-implementation` が正**。ここでは実装関数のみ扱う）
- CSS/JSは必ず `wp_enqueue_style` / `wp_enqueue_script` 経由。`<link>` `<script>` の直書きはしない
- バージョン引数には `filemtime()` を使い、更新のたびにキャッシュが切れるようにする
- JSの読み込みは基本フッター（第5引数 `true`）にし、レンダリングをブロックしない

`inc/enqueue.php` の雛形（`wp_enqueue_style` / `wp_enqueue_script`）は `references/theme-skeleton.md` が正。

#### ESM（`type="module"`）の読み込み

`js-implementation-standard` のJSは `<script type="module">` 前提のため、上記の `wp_enqueue_script()` のままでは `import`/`export` がSyntaxErrorになる。moduleのJSは以下で読み込む:

- **WP6.5以上（基本）**: `wp_enqueue_script_module()` を使う（自動でmodule属性が付く。moduleは標準でdefer相当のためフッター指定は不要）

コードは `references/theme-skeleton.md` の「inc/enqueue.php（ESM）」にある。

- `header.php` に `wp_head()`、`footer.php` に `wp_footer()` を必ず設置する（プラグイン・トラッキングコードの動作に必須）
- `<html>` タグには `language_attributes()` を使う（`lang="ja"` の直書きでなく設定値に追従させる）
- `<body>` には `body_class()` を付け、**`<body>` 開始タグの直後に `wp_body_open()` を設置する**（GTMのnoscriptタグや各種プラグインがこのフックに依存する。`analytics-setup` のGTM設置が前提とするフック）

### セキュリティ・エスケープ

出力時は必ずエスケープ関数を通す。素の `echo` は避ける。

- テキスト: `esc_html()` / 属性値: `esc_attr()` / URL: `esc_url()`
- HTML許可が必要な場合のみ: `wp_kses_post()`
- フォーム送信には `wp_nonce_field()` / `wp_verify_nonce()` を必ず使う
- **nonce は CSRF 対策であって権限チェックではない**（使い捨てでもなく、有効期限内は何度でも通る）。管理操作・Ajax ハンドラでは `current_user_can()` と nonce 検証を**必ずセットで書く**——nonce だけだと、権限の無いログインユーザー（購読者等）が管理操作を叩ける

### ACF（Advanced Custom Fields）

- フィールドグループは**ローカルJSON同期**を使い、`acf-json/` をGit管理下に置く（環境間でフィールド定義を共有するため）
- フィールド名はスネークケース（例: `hero_title`, `news_list`）で統一
- 取得は `get_field()` を基本とし、リピーターは `have_rows()` / `the_row()` でループする
- コードで管理する場合は `inc/acf-fields.php` に `acf_add_local_field_group()` で記述する（GUI管理と混在させない）

```php
<?php if ( have_rows('news_list') ) : while ( have_rows('news_list') ) : the_row(); ?>
  <div class="c-card">
    <h3 class="c-card__title"><?php echo esc_html( get_sub_field('title') ); ?></h3>
    <p class="c-card__text"><?php echo esc_html( get_sub_field('text') ); ?></p>
  </div>
<?php endwhile; endif; ?>
```

### カスタム投稿タイプ・タクソノミー

- `inc/custom-post-types.php` に集約し、`register_post_type()` / `register_taxonomy()` を使う
- `rewrite` のslugは日本語URLを避け、英数字で明示的に指定する

### 編集可否の線引き（ACF化しすぎない）

- 頻繁に更新される情報（お知らせ本文、価格、営業時間等）→ 管理画面から編集可能にする（ACFフィールドまたは標準投稿）
- ほぼ変わらない情報（定型文、デザイン上のキャッチコピー等）→ テンプレート直書きでよい。**「更新頻度」を基準に判断**し、迷う項目は実装前にユーザーに確認する

### コーディング規約

- PHPはWordPress Coding Standards（WPCS）準拠のインデント・命名（関数名スネークケース、クラス名パスカルケース）
- テンプレート階層と条件分岐タグ（`is_front_page()` 等）を活用し、1ファイルに条件分岐を詰め込みすぎない
- WordPress標準クラス（`.alignleft`, `.wp-block-*` 等）と衝突しないよう、独自クラスはFLOCSSプレフィックスを必ず付ける

### Local（ローカル開発環境）前提の運用

- `.local` ドメイン運用を前提とし、URL・パスのハードコーディングを避ける（`get_template_directory_uri()`、`home_url()`、`wp_get_attachment_image()` 等の関数経由にする）
- `WP_DEBUG` はLocal環境ではtrueでよいが、`var_dump()` / `print_r()` を本番用コードに残さない

### 本番移行

Local → 本番サーバーへの移行手順（プラグイン移行 / 手動移行、URL置換、移行後チェック）は **`site-deployment` スキルを正とし、そちらに従う**（同じ内容をここに重複して持たない）。

開発フェーズ側で意識しておくことだけ挙げる:

- URL・パスをハードコーディングしない（上記Local前提の運用ルール）。守れていれば移行時のURL置換事故が減る
- `acf-json/` を最新の状態でGit管理/アップロードに含める（移行後の「同期が必要」表示の解消に必要）
- 移行前に `pre-delivery-checklist` スキルで納品前チェックを済ませておく

## A. ゼロから構築する場合

- 共通ルールのテーマ構成どおりにファイルを組み、カンプからの実装は `coding-standard`（FLOCSS・単位・a11y・画像）に従って進める
- 繰り返しコンテンツ（実績・スタッフ一覧等）は、更新頻度と件数に応じて「カスタム投稿タイプ + ループ」か「ACFリピーター」かを選ぶ。件数が増え続けるもの・一覧/詳細ページが必要なものは投稿タイプ、ページ内で完結する少数の繰り返しはリピーターが目安

## B. 静的HTML→WP化の場合

既存のマークアップ・クラス名・見た目を**変更せず**、PHPタグの挿入のみで変換することを最優先とする（CSSが効かなくなるのを防ぐ）。

**手順の本文（着手前確認・ファイル分割の対応表・パス置換と enqueue 化・ループ化・変換後チェック）は `references/static-to-wp.md` が正。WP化に着手する前に必ず読む。**

## 出力形式

- A（ゼロ構築）: テーマ構成 + 該当テンプレート + `inc/` の該当ファイルをまとめて実装する
- B（WP化）: 分割後のPHPファイル一式（`header.php` / `footer.php` / 該当テンプレート / `functions.php` 該当部分）を作成する。ACF使用が未確認ならACFなし構成で実装し、必要に応じてACF版へ切り替え可能な旨を添える

対応レビューエージェント: `wp-theme-reviewer`
