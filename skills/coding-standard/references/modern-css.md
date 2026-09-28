# モダンCSS 採用一覧（coding-standard の参照資料）

`../SKILL.md`（coding-standard）「5. モダンCSSの積極採用」から読む一覧の正。採用方針（Baseline 基準・`@supports` ガードの扱い・Web検索での再確認）は SKILL.md 側にあり、ここは機能ごとの目安と注意書きだけを持つ。対応状況の確認日は SKILL.md の frontmatter `verified:` が示す。

現時点で安定して使える主な機能（目安）:

- **CSSネスティング**（`&`）/ **`:has()`** / **`:is()` `:where()`**
- **`:has()` で「要素の有無」による分岐をCSSに寄せる**: サムネイルが有る記事と無い記事が混在する一覧（実績・お知らせ・ブログ）で、テンプレート側で `--has-image` のような修飾クラスを出し分けない。**1カラムを既定にして `:has(img)` で上書きする**（`:not(:has(img))` と2本書くより、非対応環境でも既定の1カラムで成立する）。マークアップを1種類に保てるので、静的HTMLとWPテンプレの差分が減り、`the_post_thumbnail()` 側の条件分岐も消える。Chrome 105 / Safari 15.4 / Firefox 121〜（MDN, 2026-09-18確認）

  ```scss
  .c-card {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;

    &:has(img) {
      grid-template-columns: 1fr 2fr;
    }
  }
  ```
- **コンテナクエリ (`@container`)** / **`subgrid`** / **`@layer`**
- **`clamp() / min() / max()`** / **`color-mix()`** / **`accent-color`**
- **`oklch()`**: 色トークンを新規に定義する時はHexではなくOKLCHで持つ。知覚均等なので、L・Cを固定してHを変えるだけでトーンの揃ったパレットになる
- **相対カラー構文**: hover / disabled 等の状態色は基準色から算出する（例: `oklch(from var(--color-primary) calc(l - 0.1) c h)`）。Baseline 2024-09 Newly available〜（Chrome/Edge 125+ / Firefox 128+ / Safari 18+。Safari 16.4〜17 は旧ドラフト実装で計算の単位扱いが違う）のため、対応ブラウザ要件が広い案件では使用前に確認する
- `contrast-color()` は Baseline Newly available（2026-04）で日が浅いため当面使わない
- **論理プロパティ**（`margin-inline`, `padding-block` 等）
- **`aspect-ratio`** / **flex/gridの `gap`**
- **`scrollbar-width`**（安定）/ **`scrollbar-color`**（2025年12月Baseline入り（Safari 26.2 で揃った）で比較的新しい。装飾用途に限定し、非対応環境でも破綻しないデフォルト表示を許容する書き方にする。`-webkit-scrollbar` 系の独自実装より標準プロパティを優先）
- **`overscroll-behavior`**（安定）: 内側のスクロール領域を読み切ったときに背面ページまで動く「スクロール連鎖」を止める。**軸を指定した `contain` を既定にする**（`none` は連鎖以外の挙動まで殺すので後から）。入れる場所は毎案件同じ——ドロワー／モーダル本文／利用規約・プライバシーポリシーのスクロールボックス／チャット・通知パネル／横スクロールのカードリスト（`overscroll-behavior-x: contain` で戻る操作の誤爆を防ぐ）。`position: fixed` で body を固定するJSの手当てより副作用が少ないので、まずこちらで足りるかを見る

  ```scss
  .p-drawer__body { overflow-y: auto; overscroll-behavior-y: contain; }
  ```
- **Gap Decorations（`column-rule` / `row-rule`）**: Chrome/Edge 149〜（Safari・Firefox 未対応）。**折り返す（`flex-wrap: wrap`）リストの区切り線**は `border-left` だと2行目の先頭にも線が残るが、`column-rule` は「アイテムの隙間」に引くので行頭・行末に出ない。未対応環境では線が消えるだけで崩れないため、装飾用途なら進行的強化として入れてよい。線が情報の区切りとして意味を持つ場合は擬似要素版を使う
- **`appearance: base-select` / `::picker(select)`**: Chrome 135〜・Safari 27〜で主要2エンジンが揃った。採用可否と順序は `form-implementation` / `js-implementation-standard` の select 実装方針が正
