---
name: js-implementation-standard
description: Web制作の実案件で、フロントエンドのJavaScript（vanilla JS / ES6+）を実装する際に使用する。「JSを実装して」「ハンバーガーメニューの動きをつけて」「タブ切り替えを実装して」等、フレームワークを使わない素のJS実装依頼で使う。animation-implementation, form-implementationと併用する。
---

# JS実装標準（Vanilla / ES6+）

Web制作の実案件で、React/Vue等のフレームワークを使わない素のJS（ES6+）を実装する際は、以下のルールに従う。

## ファイル構成・分割方針

- 機能ごとに1ファイル1責務を基本とする（例: `header.js`, `accordion.js`, `form-validation.js`）
- 全体の初期化は `main.js`（または`app.js`）から各モジュールを呼び出す形にし、グローバルスコープに関数や変数を直書きしない
- ES Modules（`import`/`export`）を使い、`<script type="module">` で読み込む。対応ブラウザ要件が古い場合のみバンドラ導入を検討する

```js
// header.js
export function initHeader() {
  const trigger = document.querySelector('.js-header-toggle');
  if (!trigger) return;
  trigger.addEventListener('click', () => {
    document.body.classList.toggle('is-menu-open');
  });
}
```

```js
// main.js
import { initHeader } from './header.js';
import { initAccordion } from './accordion.js';

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initAccordion();
});
```

## セレクタ・DOM操作

- フック用クラス（`js-`）・状態クラス（`is-`）の命名と分離ルールは `coding-standard` に従う。状態の切り替えはクラスの付け外しで行い、スタイル自体（色・サイズ等）を直接JSで書き換えない
- 要素取得は必要な範囲に絞る（`document.querySelectorAll`をイベントごとに毎回呼ばず、初期化時に一度取得してキャッシュする）

## イベント処理

- 同種の要素が多い場合（リスト内の削除ボタン等、動的に増減する要素）はイベント委譲（親要素に1つのリスナー + `event.target`判定）を使う
- 同じ要素に同じリスナーを重複登録しないよう、初期化処理は1回のみ実行されるようガードする

## リサイズ・スクロール・ブレークポイント連動

- `resize` / `scroll` イベントに重い処理を直接ぶら下げない。頻度を間引く（debounce/throttle）か、用途に応じて `IntersectionObserver`（表示検知）や `ResizeObserver`（要素サイズ検知）で代替する
- 「SPとPCで挙動を変える」判定は `window.innerWidth` の都度比較ではなく `matchMedia` を使い、CSSのブレークポイント値（`coding-standard` の `mq()` と同じ値）と一致させる

```js
const mqPc = window.matchMedia('(min-width: 64em)');
function handleBreakpoint(e) {
  if (e.matches) { /* PC時の初期化 */ } else { /* SP時の初期化 */ }
}
mqPc.addEventListener('change', handleBreakpoint);
handleBreakpoint(mqPc); // 初回実行
```

## 非同期処理

- `fetch`は`async/await`を基本とし、`try/catch`でエラーハンドリングする
- 通信中はローディング状態を表示し、多重送信を防ぐ（`form-implementation`と連携）

```js
async function submitForm(formData) {
  try {
    const res = await fetch('/api/contact', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('送信に失敗しました');
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}
```

## 命名・コーディングスタイル

- 変数・関数は `camelCase`、クラス（ES6 class）は `PascalCase`
- `var`は使わず `const`を基本、再代入が必要な場合のみ`let`
- マジックナンバー・文字列は定数化する（例: `const BREAKPOINT_TABLET = 768;`）
- 条件分岐が複雑になる場合は早期return（ガード節）で見通しをよくする
- これらのルール（`no-var` / `prefer-const` 等）はESLintで機械的に担保できる。導入・設定は `code-formatting-lint` に従う

## 外部ライブラリとの関係

- アニメーション実装（GSAP等）は`animation-implementation`のルールに従う
- ここでのルールは「ライブラリを使わない素のJS」の書き方が対象。ライブラリ導入が必要かの判断自体は各機能スキル（animation-implementation等）を参照する

## 出力形式

- 通常はHTML/SCSSと合わせてJSファイルも分割した形で提示する
