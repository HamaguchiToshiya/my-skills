# テーマ骨格（wordpress-development の参照資料）

`../SKILL.md`（wordpress-development）「共通ルール」から読む、テーマのディレクトリ構成と `inc/enqueue.php` の雛形の正。運用ルール（`filemtime()` / フッター読み込み / `wp_head()` `wp_footer()` `wp_body_open()` の設置）は SKILL.md 側にある。

## テーマの基本構成

```
theme-name/
├── style.css              ← テーマ情報コメント必須（SKILL.md「テーマの基本構成」のコメント例を使う）
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
│   ├── css/               ← コンパイル後CSS（enqueue対象）
│   ├── scss/ js/ images/  ← coding-standardのFLOCSS構成
└── acf-json/              ← ACFのローカルJSON同期先
```

## inc/enqueue.php（CSS / 通常JS）

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

## inc/enqueue.php（ESM）

`type="module"` のJS（WP6.5以上は `wp_enqueue_script_module()`。自動でmodule属性が付き、defer相当のためフッター指定は不要）:

```php
// inc/enqueue.php
function theme_enqueue_modules() {
    wp_enqueue_script_module(
        'theme-script',
        get_template_directory_uri() . '/assets/js/main.js',
        [],
        filemtime(get_template_directory() . '/assets/js/main.js')
    );
}
add_action('wp_enqueue_scripts', 'theme_enqueue_modules');
```
