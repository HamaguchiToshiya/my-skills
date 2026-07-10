---
name: wordpress-development
description: WordPressのテーマ実装全般で使用する。(A)フルスクラッチでのオリジナルテーマ開発（ACF・Local環境前提）と、(B)完成済み静的HTML/CSS/JSのWordPressテーマ化（WP化・移植）の両方をカバーする。「WordPressのテーマを作って」「functions.phpに追加して」「ACFのフィールドを実装して」「WordPress化して」「WP化して」「静的サイトを移植して」「テーマ化して」等の依頼で必ず使用する。HTML/CSSの書き方はcoding-standardと併用する。
---

# WordPress テーマ開発ルール

WordPressテーマの実装は、まず作業タイプを判別してから進める。

- **A. ゼロから構築**: カンプから直接WordPressテーマとして組む（→ 共通ルール + セクションA）
- **B. 静的HTML→WP化**: 完成済みの静的サイトをテンプレート分割して移植する（→ 共通ルール + セクションB）

いずれもページビルダー（Elementor等）や既製テーマのカスタマイズではなく、`functions.php` から自作するスタイルを前提とする。HTML/CSSのクラス命名・単位・a11y・画像は `coding-standard` に従う。

## 共通ルール

### テーマの基本構成

```
theme-name/
├── style.css              ← テーマ情報コメント必須（下記）
├── functions.php          ← 読み込み処理の集約のみ。直書きしすぎない
├── index.php              ← テーマとして最低限必須のファイル
├── front-page.php
├── header.php / footer.php
├── page.php / single.php / archive.php / 404.php
├── screenshot.png         ← 管理画面のテーマ一覧用（1200×900px推奨）
├── inc/                   ← functions.phpから分割する処理
│   ├── enqueue.php        ← wp_enqueue_script/style
│   ├── theme-support.php  ← add_theme_support 等
│   ├── acf-fields.php     ← ACFフィールド定義（コード管理する場合）
│   └── custom-post-types.php
├── template-parts/
│   ├── header/ footer/ section/
├── assets/
│   ├── scss/ js/ images/  ← coding-standardのFLOCSS構成
└── acf-json/              ← ACFのローカルJSON同期先
```

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
- `inc/theme-support.php` には最低限 `add_theme_support('title-tag')`（`<title>`の自動出力。headに`<title>`を直書きしない）と `add_theme_support('post-thumbnails')` を宣言する。titleやmeta descriptionをSEO系プラグインで管理する案件では、テーマ側と二重出力にならないよう分担を確認する
- CSS/JSは必ず `wp_enqueue_style` / `wp_enqueue_script` 経由。`<link>` `<script>` の直書きはしない
- バージョン引数には `filemtime()` を使い、更新のたびにキャッシュが切れるようにする
- JSの読み込みは基本フッター（第5引数 `true`）にし、レンダリングをブロックしない

```php
// inc/enqueue.php
function theme_enqueue_assets() {
    wp_enqueue_style(
        'theme-style',
        get_template_directory_uri() . '/assets/css/style.css',
        [],
        filemtime(get_template_directory() . '/assets/css/style.css')
    );
    wp_enqueue_script(
        'theme-script',
        get_template_directory_uri() . '/assets/js/main.js',
        [],
        filemtime(get_template_directory() . '/assets/js/main.js'),
        true
    );
}
add_action('wp_enqueue_scripts', 'theme_enqueue_assets');
```

- `header.php` に `wp_head()`、`footer.php` に `wp_footer()` を必ず設置する（プラグイン・トラッキングコードの動作に必須）
- `<body>` には `body_class()` を付ける

### セキュリティ・エスケープ

出力時は必ずエスケープ関数を通す。素の `echo` は避ける。

- テキスト: `esc_html()` / 属性値: `esc_attr()` / URL: `esc_url()`
- HTML許可が必要な場合のみ: `wp_kses_post()`
- フォーム送信には `wp_nonce_field()` / `wp_verify_nonce()` を必ず使う

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

### 本番移行チェックリスト

Local → 本番サーバーへの移行時は以下を順に行う。

1. データベースのエクスポート/インポートと、**URL置換**（`.local` → 本番ドメイン）。シリアライズデータを壊さないよう、置換はWP-CLIの `wp search-replace` またはSearch Replace系ツールで行う（テキストエディタでの単純置換はNG）
2. `wp-config.php` のDB接続情報を本番用に書き換える。`WP_DEBUG` は `false` にする
3. 管理画面でパーマリンク設定を開いて再保存する（リライトルールの再生成。404の定番原因）
4. 「検索エンジンによるサイトのインデックスを回避する」設定をOFFにする
5. SSL（https）化とhttpsへのリダイレクト設定を確認する
6. `acf-json/` の同期状態（管理画面のフィールドグループに「同期が必要」が出ていないか）を確認する
7. お問い合わせフォームの送信テスト（メール受信まで）を行う
8. 最後に `pre-delivery-checklist` スキルで最終確認する

## A. ゼロから構築する場合

- 共通ルールのテーマ構成どおりにファイルを組み、カンプからの実装は `coding-standard`（FLOCSS・単位・a11y・画像）に従って進める
- 繰り返しコンテンツ（実績・スタッフ一覧等）は、更新頻度と件数に応じて「カスタム投稿タイプ + ループ」か「ACFリピーター」かを選ぶ。件数が増え続けるもの・一覧/詳細ページが必要なものは投稿タイプ、ページ内で完結する少数の繰り返しはリピーターが目安

## B. 静的HTML→WP化の場合

既存のマークアップ・クラス名・見た目を**変更せず**、PHPタグの挿入のみで変換することを最優先とする（CSSが効かなくなるのを防ぐ）。

### 最初に確認すること

- ACFを使うか（管理画面から編集したい箇所があるか）。**未確認の場合はACFなしを初期値**とし、後から必要箇所だけACF化する方針で進めてよいか確認する
- 固定ページ構成（トップ、下層の種類、ブログ/お知らせの有無）
- 静的HTMLのファイル一覧と、どのページがどのテンプレートに対応するか

### ファイル分割の対応表

| 静的HTMLの範囲 | 分割先 |
|---|---|
| `<head>`〜`<body>`開始、共通ヘッダー | `header.php` |
| 共通フッター | `footer.php` |
| トップ固有のコンテンツ | `front-page.php` |
| 固定ページ共通の型 | `page.php`（個別デザインが強いページは `page-{slug}.php`） |
| 投稿一覧 | `archive.php` または `home.php` |
| 投稿詳細 | `single.php` |
| 404ページ | `404.php` |

```php
<?php // 各テンプレートの基本形 ?>
<?php get_header(); ?>

<!-- 元のHTMLのメインコンテンツ部分をそのまま配置 -->

<?php get_footer(); ?>
```

### パスの置き換え

- 画像等の相対パス（`img/hero.jpg`）→ `<?php echo get_template_directory_uri(); ?>/img/hero.jpg`
- CSS内の `url()` は、CSSファイルの配置場所を変えなければ基本そのままでよい（構成を変える場合のみ再確認）
- 内部リンク（`about.html` 等）→ 固定ページ化後のURL（`<?php echo esc_url( home_url('/about/') ); ?>` 等）
- `<link>` / `<script>` の直書き → 共通ルールどおり `functions.php` のenqueueに移す

### 繰り返しコンテンツの変換

ループ部分は元の静的HTMLの1件分のマークアップ（`.c-card` 等）をそのまま活かし、テキスト差し込み部分だけPHPに置き換える。

```php
<?php // ACFなし: 標準ループ ?>
<?php if (have_posts()) : while (have_posts()) : the_post(); ?>
  <div class="c-card">
    <h3 class="c-card__title"><?php the_title(); ?></h3>
    <p class="c-card__text"><?php the_excerpt(); ?></p>
  </div>
<?php endwhile; endif; ?>
```

ACFを使う場合は共通ルールのリピーター記法に置き換える。

### 変換後の確認

- 各テンプレートで `wp_head()` / `wp_footer()` が出力されているか
- パーマリンク設定を反映した状態でリンク切れがないか
- クラス名・DOM構造が静的HTML時点から変わっていないか（CSS崩れの有無）
- 最終的には共通ルールの「本番移行チェックリスト」と `pre-delivery-checklist` で確認する

## 出力形式

- A（ゼロ構築）: テーマ構成 + 該当テンプレート + `inc/` の該当ファイルをまとめて提示する
- B（WP化）: 分割後のPHPファイル一式（`header.php` / `footer.php` / 該当テンプレート / `functions.php` 該当部分）を提示する。ACF使用が未確認ならACFなし構成で提示し、必要に応じてACF版へ切り替え可能な旨を添える
