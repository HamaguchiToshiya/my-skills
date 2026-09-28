# PHPメール送信の標準形（form-implementation の参照資料）

`../SKILL.md`（form-implementation）「PHPでのメール送信実装（自前実装の場合）」から読むコードの正。到達性の注意（From の同一ドメイン・SPF・複数宛先テスト）と WordPress の場合の方針は SKILL.md 側にある。

```php
<?php
// 文字化け対策: 言語と内部エンコーディングを最初に宣言する（これを忘れると件名・本文が化ける定番トラブル）
mb_language('Japanese');
mb_internal_encoding('UTF-8');
session_start();

// POST以外のアクセスとhoneypotを拒否
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !empty($_POST['company_url'])) {
  http_response_code(400);
  exit;
}

// CSRFトークン照合（発行は下記「入力画面側」参照。不一致は拒否）
if (!hash_equals($_SESSION['csrf_token'] ?? '', $_POST['csrf_token'] ?? '')) {
  http_response_code(400);
  exit;
}

// 入力の取得とヘッダインジェクション対策（改行が含まれていたら拒否）
$name  = str_replace(["\r", "\n"], '', $_POST['name'] ?? '');
$email = str_replace(["\r", "\n"], '', $_POST['email'] ?? '');
$body  = $_POST['message'] ?? '';

// サーバー側の再バリデーション
$errors = [];
if ($name === '') $errors[] = 'お名前は必須です';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'メールアドレスの形式が正しくありません';
if ($body === '') $errors[] = 'お問い合わせ内容は必須です';

if ($errors) {
  http_response_code(422);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['errors' => $errors], JSON_UNESCAPED_UNICODE);
  exit;
}

// 管理者宛メール
$to      = 'info@example.com';           // 受信先（案件ごとに置換）
$subject = '【サイト名】お問い合わせがありました';
$mailBody = "お名前: {$name}\nメール: {$email}\n\n--- 内容 ---\n{$body}";

// Fromはドメインのメールアドレスにする（Gmail等を偽装するとSPF/DKIM/DMARCで迷惑メール行き・不達になる）
$headers = "From: noreply@example.com\r\nReply-To: {$email}";

$sent = mb_send_mail($to, $subject, $mailBody, $headers);

http_response_code($sent ? 200 : 500);
header('Content-Type: application/json; charset=UTF-8');
echo json_encode(['ok' => $sent], JSON_UNESCAPED_UNICODE);
```

入力画面側（フォームのあるページを `.php` にする）は、表示時にCSRFトークンを発行してhiddenで埋め込む:

```php
<?php
// ページ先頭で発行
session_start();
if (empty($_SESSION['csrf_token'])) {
  $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>
<!-- form内に設置 -->
<input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
```
