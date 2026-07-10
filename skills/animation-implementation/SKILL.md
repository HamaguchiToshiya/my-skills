---
name: animation-implementation
description: Web制作の実案件で、要素の出現・ホバー・スクロール連動などのアニメーションを実装する際に使用する。CSS(@keyframes/transition)とGSAPの使い分け、パフォーマンスルール、coding-standardとの併用を前提とする。「アニメーションつけて」「動きをつけて」「GSAPで実装して」「スクロールで出てくる演出にして」「ホバーエフェクトをつけて」等の依頼で使う。
---

# アニメーション実装ルール

Web制作の実案件で、CSS/JSアニメーションを実装する際は、以下のルールに従う。`coding-standard` との併用を前提とする。

## 実装手段の使い分け

- **CSS（`@keyframes` / `transition`）を優先**する。以下に該当する場合はCSSのみで実装する:
  - ホバー・フォーカスなどの単純な状態変化
  - ページ読み込み時の単発フェードイン等、タイムライン制御が不要なもの
  - スクロール連動でも「表示/非表示の1回きりの切り替え」程度で足りるもの（`IntersectionObserver` でクラス付与 + CSS transitionの組み合わせ）
- **GSAP（JSライブラリ）を使う**のは以下に該当する場合:
  - 複数要素を時間差・順序制御するタイムラインが必要（stagger等）
  - スクロール位置に応じて連続的に値を変化させたい（`ScrollTrigger` が必要なケース）
  - easingを細かく作り込みたい、または往復・ループ・中断可能なアニメーション
  - 数値・SVGパス・Canvasなど、CSSだけでは表現できない補間が必要

判断に迷う場合は「CSSで書けるなら書かない理由がない」を基本とし、CSSで実現できるものにGSAPを使わない。

## CSS実装ルール

- アニメーション対象は `transform` と `opacity` のみを基本とする（レイアウト・ペイントの再計算が発生するプロパティ = `width` `height` `top` `left` `margin` 等は極力避ける）
- `@keyframes` の名前は `kf-` プレフィックスを付ける（例: `kf-fade-in-up`）。FLOCSSのレイヤーと衝突しないようにするため
- `transition` はプロパティを明示指定する（`transition: all .3s;` のような `all` 指定は避け、`transition: transform .3s ease, opacity .3s ease;` のように書く）
- duration・easingの値は `foundation/_variable.scss` にトークン化する（例: `$duration-base: .3s; $ease-out-expo: cubic-bezier(.16,1,.3,1);`）。数値をコンポーネントごとにバラバラに書かない
- `prefers-reduced-motion: reduce` に対応する。動きに意味がある演出（出現アニメーション等）は、このメディアクエリ内で `transition-duration` を短く/`0` にするか、`transform` を無効化する

```scss
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
```

## GSAP実装ルール

- GSAPは2025年4月末より旧Club Plugins（SplitText・MorphSVG・Draggable等）を含め、商用利用も完全無料（Webflowによる買収・支援のため）。有料を理由に演出の選択肢から外さない。ただし「使うプラグインのみ読み込む」原則は従来どおり維持する
- CDN読み込みは案件の対応ブラウザ要件を確認した上で `gsap` 本体 + 必要なプラグイン（`ScrollTrigger` 等）のみを読み込む。使わないプラグインは読み込まない
- アニメーション対象は `p-` または `c-` オブジェクトのルート要素に `js-` プレフィックスのフック用クラス、または `data-animate` 系のdata属性で指定する（スタイル用クラス `c-` `p-` とJS操作用フックを分離する。JSがCSSクラスに依存しないようにする）
  - 例: `<div class="c-card js-fade-up" data-animate="fade-up">`
- タイムライン（`gsap.timeline()`）は演出ごとに1つの関数にまとめ、初期化処理は `DOMContentLoaded` またはページ全体のinit関数から呼び出す形にし、グローバルスコープに散らばらせない
- `ScrollTrigger` を使う場合、`start` / `end` / `once` の指定を明示する。特に「1回だけ再生」なのか「スクロールに追従して往復」なのかを最初に決めて実装する
- `gsap.set()` で初期状態（非表示・ズレた位置など）を明示的に設定してからアニメーションさせる。CSS側の初期状態とJS側の初期状態が二重管理・矛盾しないよう、初期状態はどちらか一方（基本はJS側）に寄せる
- `prefers-reduced-motion` はJS側でも判定し、該当する場合はタイムラインのdurationを0にするかアニメーション自体をスキップする

```js
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fadeUpAnimation() {
  const targets = document.querySelectorAll('.js-fade-up');
  targets.forEach((el) => {
    gsap.set(el, { opacity: 0, y: 24 });
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: reduceMotion ? 0 : 0.6,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        once: true,
      },
    });
  });
}
```

## パフォーマンスルール

- アニメーションさせるプロパティは `transform` と `opacity` のみを基本とする（CSS/GSAP共通）
- `will-change` は「今まさにアニメーションする直前の要素」にのみ付与し、常時付与しない。使い終わったら外す、もしくはアニメーション開始時にJSで付与→終了時に削除する運用にする
- 同時に動く要素数が多い場合（リスト一括fadeUp等）は `stagger` を使い、個別にタイムラインを増やさない
- スクロール連動アニメーションは対象要素数が多くなりやすいので、`ScrollTrigger` の `once: true` を基本にし、往復再生が本当に必要な場合のみ双方向にする
- 画像・動画等の重いコンテンツにアニメーションを重ねる場合、レイアウトシフト（CLS）を起こさないよう、要素のサイズは事前に確保（`aspect-ratio` 等）してからアニメーションさせる

## coding-standard との併用

- クラス命名（`js-`フックとスタイル用クラスの分離、`is-`状態クラス）は `coding-standard` のルールに従う
- duration・easingの変数は `foundation/_variable.scss` に集約し、CSS・GSAP双方から同じ値を参照する意識で管理する（GSAP側はJS定数として同じ値を持たせる）
- モダンCSSの `@starting-style` や `transition-behavior: allow-discrete` など、`display: none` 要素の出現アニメーションを可能にする機能を使いたい場合は、`coding-standard` のモダンCSS採用ルールに従い採用可否をWeb検索で確認してから使う

## 出力形式

- 通常はHTML + SCSS + （GSAP使用時のみ）JSをまとめて提示する
- ファイル出力が必要な場合のみ、実際にフォルダ構成でファイルを作成する
