---
name: coding-standard
description: Web制作の実案件でHTML/CSS(SCSS)コーディングをする際の統合標準ルール。FLOCSS命名・単位・モダンCSS採用・アクセシビリティ・画像実装をすべて含む。「コーディングして」「カンプ通りに実装して」「HTML/CSSを書いて」「アクセシビリティ対応して」「レスポンシブ画像にして」「画像を軽くして」等の依頼、およびFigma/Photoshopのカンプからの実装、セクション単位の実装依頼で必ず使用する。コーディングに関わる依頼なら明示的に指定されなくても常にこのスキルを適用する。
---

# コーディング標準（FLOCSS / 単位 / モダンCSS / a11y / 画像）

Web制作の実案件でHTML/CSS(SCSS)を書く際は、常にこのスキル全体をベースルールとして適用する。

## 関連スキルの分担マップ

| 内容 | 参照先スキル |
|---|---|
| JS実装（vanilla） | `js-implementation-standard` |
| アニメーション（CSS/GSAP） | `animation-implementation` |
| フォーム | `form-implementation` |
| head・meta・OGP・構造化データ | `seo-meta-implementation` |
| WordPressテーマ化・構築 | `wordpress-development` |
| Prettier / ESLint / Stylelintの導入・設定 | `code-formatting-lint` |
| Git運用 | `git-workflow` |
| 納品前チェック | `pre-delivery-checklist` |

クラス命名（FLOCSS / `is-` / `js-`）・単位・a11y・画像のルールは本スキルが正とし、他スキルはこれを参照する。

## 0. 案件開始時に確認すること

依頼文に含まれていなければ、着手前に以下を確認する（不明のまま進める場合は前提を明示して仮置きする）。

1. **対応ブラウザ範囲**: 未確認なら「主要ブラウザ（Chrome / Safari / Firefox / Edge）の最新版〜数バージョン前を前提にする」と一言添えて進める
2. **remのルート基準**: `html { font-size: 62.5%; }`（1rem = 10px）か、ブラウザ標準16px基準か。案件内で必ず統一する
3. **ブレークポイント**: 単位（em基準を推奨 / px運用は案件都合がある場合のみ）と値。指定がなければ下記の既定値を使う
4. **画像素材**: 元データの形式・解像度、WebP/AVIF書き出しが可能か
5. **SCSSのビルド環境**: 既存のビルド構成（Vite / gulp / VS Code拡張等）があるか。なければ簡易な方法（Live Sass Compiler等）を提案する。いずれもDart Sass前提とし、`@import` は使わず `@use` / `@forward` で書く（`@import` はSass公式で廃止予定のため）

## 1. クラス命名: FLOCSS

- **Layout (`l-`)**: ページ全体の土台となる大枠のレイアウト（header, footer, main, container など）
- **Object > Component (`c-`)**: サイト内で繰り返し使う小さな部品（ボタン、ロゴ、見出し、区切り線など）
- **Object > Project (`p-`)**: 特定のページ・機能固有のまとまり（特定セクションなど）
- **Object > Utility (`u-`)**: 微調整用の単機能クラス（余白調整、非表示など）。多用しすぎない

BEMのElement/Modifier記法（`__` `--`）を併用する。例: `.p-header__title--large`

- 状態の切り替えは `is-` プレフィックスのstateクラス（`is-active`, `is-error` 等）をJSで付け外しし、スタイルはSCSS側で `&.is-active {}` として管理する
- JS操作用フックは `js-` プレフィックスのクラスまたはdata属性とし、スタイル用クラスと必ず分離する。CSSのセレクタとして `.js-*` を使わない
- 各層（`.l-` `.c-` `.p-` `.u-`）を跨いだ上書きは避け、詳細度の衝突を防ぐ
- HTML側はクラスの複数付与でよい（例: `class="c-button p-header__cta"`）

## 2. SCSSファイル構成

1コンポーネント/1プロジェクト = 1ファイルを基本とする。

```
scss/
├── foundation/
│   ├── _reset.scss
│   ├── _base.scss
│   ├── _variable.scss   ← 色・フォント・余白・duration等のデザイントークン
│   └── _mixin.scss      ← mq() 等
├── layout/
│   └── _[layout名].scss
├── object/
│   ├── component/
│   │   └── _[component名].scss
│   ├── project/
│   │   └── _[project名].scss
│   └── utility/
│       └── _utility.scss
└── style.scss   ← @forward/@use でまとめる
```

- 色・フォントサイズ・余白・アニメーションのduration/easingなどの値は `foundation/_variable.scss` に集約する。数値をコンポーネントごとにバラバラに書かない

## 3. ブレークポイント・mq() mixin

sp / tablet / pc の3段階を基本とする。案件指定がなければ以下を既定値とする。

```scss
// foundation/_mixin.scss
$breakpoints: (
  'tablet': 48em,   // 768px相当
  'pc': 64em,       // 1024px相当
) !default;

@mixin mq($bp) {
  @media (min-width: map-get($breakpoints, $bp)) {
    @content;
  }
}
```

- モバイルファースト（min-width基準）で書き、SPのスタイルをベースにtablet/pcで上書きする
- ブレークポイントの単位は `em` を基本とする（ユーザーのブラウザ文字サイズ変更に追従させるため）
- ホバー演出はタッチデバイスで残留しないよう `@media (hover: hover)` 内に書く

## 4. 単位の使い分け

pxによる絶対値指定はブラウザの文字サイズ変更等に追従できず崩れの原因になるため、**相対単位を基本方針**とする。

- **フォントサイズ**: `rem` を基本とする（ルート基準はセクション0で決めたものに従う）
- **line-height**: 単位なし（例: `line-height: 1.6;`）。rem/px固定にすると子要素のフォントサイズ変更時に比率が崩れる
- **行の高さに揃えるサイズ**: テキスト1行分に高さを合わせたい要素（行内アイコン、バッジ等）は `lh` 単位を使う（例: `height: 1lh;`）。ルート基準にしたい場合は `rlh`。Baseline Widely available（2026年5月〜）
- **余白（margin / padding / gap）**: `rem` を基本。可変にしたい場合は `clamp(1.5rem, 4vw, 3rem)` のように組み合わせる
- **ボーダー・角丸**: `px` 固定でよい（相対化すると極端な値になりやすい）。大きめの角丸をレスポンシブで変えたい場合のみ `rem` / `%` を検討
- **幅・高さ**: 基本は `%` / `vw` / `svh` / `dvh` 等で可変に保つ。コンテナ最大幅など絶対的な上限のみpxもあり得る
- **アスペクト比**: `aspect-ratio` を使い、幅と高さを個別のpx指定にしない
- **極小の固定UIパーツ（アイコン等）**: 視認性優先で `px` 固定でも可。ただし多用しない

## 5. モダンCSSの積極採用

古い書き方に固執せず、主要ブラウザで **Baseline "Widely available"**（安定サポート）水準の機能を積極的に使う。

現時点で安定して使える主な機能（目安）:

- **CSSネスティング**（`&`）/ **`:has()`** / **`:is()` `:where()`**
- **コンテナクエリ (`@container`)** / **`subgrid`** / **`@layer`**
- **`clamp() / min() / max()`** / **`color-mix()`** / **`accent-color`**
- **論理プロパティ**（`margin-inline`, `padding-block` 等）
- **`aspect-ratio`** / **flex/gridの `gap`**
- **`scrollbar-width`**（安定）/ **`scrollbar-color`**（2025年12月Baseline入りで比較的新しい。装飾用途に限定し、非対応環境でも破綻しないデフォルト表示を許容する書き方にする。`-webkit-scrollbar` 系の独自実装より標準プロパティを優先）

運用ルール:

- 自分（Claude）の知識にはカットオフがあり、対応状況は変化し続ける。**上記リストにない機能を使う時、案件の対応ブラウザ要件が広い時、「もっと新しい書き方は？」と聞かれた時は、必ずWeb検索でcaniuse.com / MDNの最新状況を確認してから採用する**
- 実験的機能（Baseline "Newly available" で日が浅いもの）は避ける
- やや新しめの機能を採用した場合は、コード内コメントか回答内で一言触れる（例: `/* Baseline 2024〜: container queries */`）

## 6. アクセシビリティ（a11y）

### セマンティックHTML

- 見出しは `h1`〜`h6` を文書構造どおりに使い、レベルを飛ばさない（見た目はCSSで調整）。`h1` はページ内1つ
- クリック可能な要素は `button`（画面遷移しない操作）または `a`（遷移・アンカー）。`div`/`span` + `onclick` のみは不可
- リスト状UI（ナビ、カード一覧等）は `ul`/`ol` + `li`
- フォーム部品には対応する `label` を必ず設置（`for` とidの紐付け、または `label` で囲む）

### キーボード操作・フォーカス

- `tabindex` は独自コンポーネント（モーダル、タブ等）でのみ最小限使う。`tabindex="0"` を基本とし、正の値は使わない
- `:focus-visible` のフォーカススタイルを消さない。消す必要がある場合は代替の視認可能なスタイルを必ず用意する
- モーダル・ドロワーはフォーカストラップ + `Esc` で閉じられるようにする
- グローバルナビが長い場合はスキップリンク（「本文へスキップ」）を検討する

### 色・コントラスト

- コントラスト比はWCAG AA基準（通常テキスト4.5:1以上、大きいテキスト3:1以上）を目安にする
- 色だけで意味を伝えない（エラーの赤のみ等はNG。アイコン・テキストを併用）

### ARIA

- ネイティブHTML要素で解決できるものにARIAを追加しない（セマンティックHTML優先）
- 動的UI（タブ、アコーディオン等）には状態を示すARIA属性を付ける（`aria-expanded`, `aria-selected`, `aria-hidden` 等）
- 非同期更新される領域（通知、バリデーションエラー等）には `aria-live="polite"`（緊急なら `assertive`）を検討する
- アイコンのみのボタンには `aria-label` で目的を明示する（例: `aria-label="メニューを開く"`）

### モーション

- `prefers-reduced-motion: reduce` への対応を必ず行う（実装の詳細は `animation-implementation` に従う）

## 7. Webフォント・日本語テキスト

### Webフォント

- 読み込みには `font-display: swap` を指定し、フォント読み込み中もテキストを表示させる（Google Fontsは `display=swap` パラメータ）
- 日本語Webフォント（Noto Sans JP等）はファイルサイズが大きいため、使用ウェイトを必要最小限に絞る。セルフホストする場合はサブセット化を検討する
- ファーストビューで使うフォントは `<link rel="preload" as="font">` を検討する（多用すると逆効果なので1〜2ファイルまで）
- フォールバックのフォントスタック（`"Noto Sans JP", sans-serif` 等）を必ず指定する

### 日本語テキストの崩れ対策

- 長いURL・英単語のはみ出し対策として、本文系要素に `overflow-wrap: break-word` を基本で入れる
- 見出しの不自然な改行位置には `text-wrap: balance` を検討する（`text-wrap: pretty` や `word-break: auto-phrase` などより新しい機能は、モダンCSS採用ルールに従いWeb検索で対応状況を確認してから使う）
- 改行位置を制御したい箇所は `<br>` のPC/SP出し分けより、`span` の `display: inline-block` 単位での折り返し制御を優先する

## 8. 画像実装・最適化

### フォーマット

- 写真・グラデーション: **WebP（可能ならAVIF）優先**。非対応ブラウザ向けに `picture` + `source` でフォールバック
- ロゴ・アイコン・単純図形: **SVG** 優先
- 透過が必要な写真的画像: `webp`（透過対応）

```html
<picture>
  <source srcset="/img/hero.webp" type="image/webp">
  <img src="/img/hero.jpg" alt="サービス紹介の様子" width="1200" height="800" loading="lazy">
</picture>
```

### レスポンシブ画像

- PC/SPでトリミングが変わる画像: `picture` + `media` 属性で出し分け
- 同一画像の解像度違い（Retina対応等）: `srcset` + `sizes`（media出し分けと混同しない）

### 読み込み優先度・CLS対策

- ファーストビューのLCP候補画像には `loading="lazy"` を付けない（`fetchpriority="high"` を検討）
- ファーストビュー外は `loading="lazy"` + `decoding="async"` を基本
- `img` には必ず `width`/`height`（実比率）または CSS `aspect-ratio` を指定し、読み込み前にスペースを確保する
- 背景画像（`background-image`）は装飾用途に限定。意味のある画像は `img`/`picture` を使う（altが必要なため）

### alt・命名

- 意味のある画像には内容を説明する `alt`。装飾画像は `alt=""`（キーワード詰め込みはしない）
- ファイル名は英数字・ハイフン区切りで内容が分かる名前（例: `hero-visual.webp`）。`img/` 配下はセクション/コンポーネント単位でディレクトリ分けする

## 9. 出力形式

- 通常はHTML + SCSS（フォルダ分割イメージ込み）で提示する。上記ルールは自動的に織り込み、逐一説明しない
- Claude Code等のプロジェクト環境で作業している場合は、チャット提示ではなくプロジェクトの実ファイルを直接作成・編集する（他スキルの「出力形式」も同様に読み替える）
- 判断が割れる箇所（ARIA属性の要否等）のみ、実装後に一言補足する
- ファイル出力が必要な場合のみ、実際にフォルダ構成でファイルを作成する
- WebP変換等の画像加工が必要な場合は、実装コードを提示した上で変換作業が別途必要な旨を伝える
