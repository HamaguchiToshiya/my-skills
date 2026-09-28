# B. 静的HTML→WP化の手順（wordpress-development の参照資料）

`../SKILL.md`（wordpress-development）「B. 静的HTML→WP化の場合」の本文。WP化の依頼を受けたら本ファイルを読んでから着手する。

既存のマークアップ・クラス名・見た目を**変更せず**、PHPタグの挿入のみで変換することを最優先とする（CSSが効かなくなるのを防ぐ）。

## 着手前に確認すること

- ACFを使うか（管理画面から編集したい箇所があるか）。**未確認の場合はACFなしを初期値**とし、後から必要箇所だけACF化する方針で進めてよいか確認する
- 固定ページ構成（トップ、下層の種類、ブログ/お知らせの有無）
- 静的HTMLのファイル一覧と、どのページがどのテンプレートに対応するか

## ファイル分割の対応表

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

## パスの置き換え

- 画像等の相対パス（`img/hero.jpg`）→ `<?php echo esc_url( get_template_directory_uri() . '/img/hero.jpg' ); ?>`（URLの出力は `esc_url()` を通す。エスケープなしの `echo get_…` は wp-theme-reviewer の致命判定）
- CSS内の `url()` は、CSSファイルの配置場所を変えなければ基本そのままでよい（構成を変える場合のみ再確認）
- 内部リンク（`about.html` 等）→ 固定ページ化後のURL（`<?php echo esc_url( home_url('/about/') ); ?>` 等）
- `<link>` / `<script>` の直書き → 共通ルールどおり `functions.php` のenqueueに移す。`type="module"` のJSは共通ルールのESM読み込み方法で（属性が落ちると `import` がSyntaxErrorになる）

## 繰り返しコンテンツの変換

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

## 変換後の確認

- 各テンプレートで `wp_head()` / `wp_footer()` / `wp_body_open()` が出力されているか
- JSが静的HTML時点と同様に動作しているか（enqueue移行で `type="module"` が落ちていないか。ブラウザのコンソールにSyntaxError等が出ていないか）
- パーマリンク設定を反映した状態でリンク切れがないか
- クラス名・DOM構造が静的HTML時点から変わっていないか（CSS崩れの有無）
- 最終的には `pre-delivery-checklist`（納品前）と `site-deployment`（本番移行・公開直後チェック）で確認する
