---
name: js-implementation-standard
description: Web制作の実案件で、フロントエンドのJavaScript（vanilla JS / ES6+）を実装する際に使用する。「JSを実装して」「ハンバーガーメニュー（ドロワー）をつけて」「タブ切り替えを実装して」「カルーセル/スライダーを入れて」「モーダル/ポップアップを実装して」「アコーディオンを作って」「絞り込みフィルタをつけて」等、フレームワークを使わない素のJS実装・UIコンポーネント実装の依頼で使う。頻出UIの採用判断と骨格はreferences/ui-components.mdに集約している。animation-implementation, form-implementationと併用する。
verified: 2026-08-26
---

# JS実装標準（Vanilla / ES6+）

Web制作の実案件で、React/Vue等のフレームワークを使わない素のJS（ES6+）を実装する際は、以下のルールに従う。

## 0. 着手前に確認すること

CLAUDE.mdのプロジェクト概要と依頼文から以下を確認する（不明のまま進める場合は前提を明示して仮置きする）。

1. **ビルド環境の有無**: Vite等のバンドラがあれば `npm i` + ESM import、なければ `<script type="module">` の素のESM＋ライブラリはCDN読み込み（コード例の `import` 行を読み替える）
2. **対応ブラウザ範囲**: `coding-standard` の確認事項と共通。Popover / `<dialog>` / `@starting-style` は採用してよい（`<dialog>` は Baseline Widely available、Popover・`@starting-style` は Newly available〔2026-09-19 確認〕。未対応環境では開閉アニメーションが付かないだけで機能は成立する）。対応ブラウザ範囲が特殊な案件のみ再確認する
3. **既存コードの有無**: 既存サイトの改修なら `existing-site-modification` の大原則（既存の書き方に従う）が本スキルより優先

## ファイル構成・分割方針

- 機能ごとに1ファイル1責務を基本とする（例: `header.js`, `accordion.js`, `form-validation.js`）
- 全体の初期化は `main.js`（または`app.js`）から各モジュールを呼び出す形にし、グローバルスコープに関数や変数を直書きしない
- ES Modules（`import`/`export`）を使い、`<script type="module">` で読み込む。ビルド環境は `project-scaffold` の Vite 構成が既定（バンドル・エントリは `vite.config.js` に従う）。Vite を入れない小規模案件でも module 読み込みは同じ
- `type="module"` は**標準でdefer相当**（HTML解析をブロックせず、解析完了後に実行）なので、head内に置いてよく、`defer` 属性の追加は不要。moduleを使わない `<script>` を書く場合のみ `defer` を付ける（**scriptの読み込み方は本スキルが正**。`performance-optimization` から参照される）。WordPress案件の読み込みは `wordpress-development` のenqueueルールに従う

```js
// header.js（HTML側の初期値: <button class="js-header-toggle" aria-expanded="false" aria-label="メニューを開く">）
export function initHeader() {
  const trigger = document.querySelector('.js-header-toggle');
  if (!trigger) return;
  trigger.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('is-menu-open');
    trigger.setAttribute('aria-expanded', String(isOpen));
    trigger.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
  });
}
```

動的UIの状態は見た目のクラスだけでなくARIA属性も同時に更新する（`coding-standard` のa11yルール準拠）。

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

## 頻出UIコンポーネント（references参照）

以下のUIは、ゼロから書かず **`references/ui-components.md` の採用判断と骨格をベースに実装する**。該当する依頼が来たら必ずreferencesを読んでから着手する。

1. カルーセル / スライダー（Swiper・CSSスクロールスナップの使い分け）
2. モーダル・ライトボックス（`<dialog>`）
3. ドロワーメニュー（フォーカス管理・スクロールロック込みの詳細版）
4. アコーディオン（`<details>` / 自作の使い分け）
5. タブ（キーボード操作込み）
6. ツールチップ / 吹き出し（Popover API）
7. ページトップボタン
8. 絞り込みフィルタ
9. スムーススクロール（アンカー）
10. セレクトボックス（`appearance: base-select` を先に検討。JS自作は最後の手段）

referencesを読まない場合でも、最低限これだけは守る:

- **ネイティブ要素・標準APIで足りるならネイティブ優先**（`<details>` / `<dialog>` / Popover API）。開閉・ESC・フォーカス管理・a11yが標準で済み、JSが最小になる
- **カルーセルはSwiperを既定**とする（このテンプレートで承認済み。単純な横スクロール一覧はCSSスクロールスナップで自作）
- 自作する場合、状態は `aria-expanded` / `aria-selected` / `hidden` 等の属性とセットで更新する（見た目クラスだけで管理しない）
- 自動再生・自動で動き続けるUIには必ず停止手段を付け、`prefers-reduced-motion` に対応する

## 外部ライブラリとの関係

- アニメーション実装（GSAP等）は`animation-implementation`のルールに従う。パララックス・慣性スクロール等の「大きな動き」は同スキルの `references/large-motion-patterns.md` に骨格がある
- カルーセル用ライブラリの既定は前節のとおりSwiper（採用判断・実装ルールは `references/ui-components.md`）。それ以外のライブラリ追加は共通ルールどおり事前確認を取る
- ここでのルールは「ライブラリを使わない素のJS」の書き方が対象。ライブラリ導入が必要かの判断自体は各機能スキル・referencesの採用判断表を参照する

## 出力形式

- HTML/SCSSと合わせて、JSも上記の分割方針どおりファイル分割して実装する

対応レビューエージェント: `js-reviewer`
