# .htaccess 集（site-deployment の参照資料）

`../SKILL.md`（site-deployment）「1. 静的サイトの公開」から参照する .htaccess の記述例。基本セット・404/メンテナンスの返し方・テスト公開のBasic認証を収録する。

## .htaccess の基本セット

新規公開時の標準形。コメントごと提示してよい:

```apache
# https・www無しに統一（301リダイレクト）
RewriteEngine On
RewriteCond %{HTTPS} off [OR]
RewriteCond %{HTTP_HOST} ^www\. [NC]
RewriteRule ^(.*)$ https://example.com/$1 [R=301,L]
```

- ドメイン部分は必ず案件の本番ドメインに置換する
- www有り統一にするかはクライアントの既存資産（被リンク・印刷物のURL表記）に合わせて確認
- リニューアル案件で**URL構造が変わる場合**は、旧URL→新URLの301リダイレクト対応表を作ってから `RedirectPermanent` または `RewriteRule` で個別に設定する（SEO資産の引き継ぎ）
- 開発中にBasic認証をかけていた場合、公開時に**認証記述の削除を忘れない**

## 404ページ・メンテナンス画面の返し方（boilerplate-pages と併用）

boilerplate-pages で 404.html / maintenance.html を作ったら、.htaccess 側で**ステータスコードごと**返す。ページを置くだけでは 200 で返り、Google に「ソフト404」「メンテ画面がインデックス」として扱われる。

```apache
# 404: ページ本体は 404.html（ルート直下）。パスはドキュメントルート基準の絶対パスで書く
ErrorDocument 404 /404.html
```

```apache
# メンテナンス: 503 + Retry-After を返す（200 で返さない）。終わったらこのブロックごと削除する
# maintenance.html と、そこから読む css/img は除外して 503 の無限ループを防ぐ
ErrorDocument 503 /maintenance.html
<IfModule mod_headers.c>
  Header always set Retry-After "3600"
</IfModule>
RewriteEngine On
# 自分の作業IPは除外（置換する。ドットは \. でエスケープ）
RewriteCond %{REMOTE_ADDR} !^203\.0\.113\.10$
RewriteCond %{REQUEST_URI} !^/maintenance\.html$
# メンテ画面が使う静的ファイル
RewriteCond %{REQUEST_URI} !^/(assets|css|img)/
RewriteRule ^.*$ - [R=503,L]
```

- **`.htaccess` のコメントは必ず独立した行に書く。** Apache はディレクティブと同じ行の `# …` をコメントとして扱わず引数として読むため、構文エラー（500）になる

- 503 は「一時的」の合図で、Google はしばらく再訪してからインデックスを落とす。長期間（数日以上）503 を返し続けるとインデックスから外れるので、長引く場合は通常公開に戻すか 200 のお知らせページに切り替える
- `Retry-After` は秒数（例は1時間）。復旧見込みに合わせる
- WordPress 案件では、`.htaccess` の `# BEGIN WordPress` ブロックより**上**にメンテブロックを置く（下だと WordPress のリライトが先に効く）

## テスト公開（クライアント確認用のBasic認証）

公開前にテストサーバー・本番サーバー上でクライアント確認する場合は、Basic認証 + noindexで外部から見えない状態にする。

```apache
# .htaccess（テスト公開ディレクトリ直下）
AuthType Basic
AuthName "Restricted"
# AuthUserFile は相対パス不可。サーバーのフルパスを確認して指定
AuthUserFile /home/アカウント名/フルパス/.htpasswd
Require valid-user
```

- `.htpasswd` はサーバーのツール（多くのレンタルサーバーは管理画面にアクセス制限機能あり）か `htpasswd` コマンドで生成する。**パスワードを平文で書かない**
- 併せて `<meta name="robots" content="noindex">`（またはWPの「インデックスを回避」設定）を入れる
- **公開時は「Basic認証の削除」と「noindexの解除」を必ずセットで行う**（片方だけ外す漏れが定番事故）
- クライアントへの共有: URLと認証情報（ID/パスワード）は**別のチャネルで分けて送る**（メールにURL、チャットに認証情報等）。確認依頼には「確認してほしい観点（実機での表示・文言・写真）」と**回答期限**を添える（検収の起算と同じ考え方。文面の線引きは billing-paperwork 参照）
- クライアント確認で出た修正は PROMPT.md の1タスクとして受け、修正→再確認→合意してから本公開に進む
