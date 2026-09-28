# UIコンポーネント実装パターン集

`js-implementation-standard` 本体のルール（`js-`フック・ARIA同時更新・`matchMedia`・1ファイル1責務・イベント委譲）を前提とした、頻出UIの採用判断と実装骨格集。ゼロから書かず、ここの骨格をベースに案件へ合わせて調整する。

## 共通の前提

- **ネイティブ要素・標準APIで足りるならネイティブ優先**（`<details>` / `<dialog>` / Popover API）。開閉・ESC・フォーカス管理・a11yが標準で済み、自作コードが最小になる
- **カルーセルのSwiperはこのテンプレートの既定ライブラリとして承認済み**（都度の確認は不要）。それ以外のUIライブラリ追加は共通ルールどおり事前確認を取る
- 複数インスタンスが置かれる前提で書く（`querySelector` 決め打ちで1個しか動かない実装にしない）
- `display: none` を跨ぐ開閉アニメーションは `@starting-style` + `transition-behavior: allow-discrete` で書ける。非対応ブラウザは「アニメなしで即時開閉」に落ちるだけなので採用してよい（coding-standardのモダンCSS採用ルールに従い対応状況は確認する）
- コード例の duration / easing は仮値。実案件では `foundation/_variable.scss` のトークンに置き換える（`animation-implementation` のトークン集約ルール）
- モーダル内フォーム等のバリデーションは `form-implementation` の担当

### 背景スクロールロック（モーダル・ドロワー共通）

```js
// scroll-lock.js
export function lockScroll() {
  document.documentElement.classList.add("is-scroll-locked");
}
export function unlockScroll() {
  document.documentElement.classList.remove("is-scroll-locked");
}
```

```scss
html {
  scrollbar-gutter: stable; // ロック時にスクロールバーが消えて横にガタつくのを防ぐ
}
html.is-scroll-locked {
  overflow: hidden;
}
```

- Lenis導入案件では `lenis.stop()` / `lenis.start()` も併せて呼ぶ（`animation-implementation/references/large-motion-patterns.md` 参照）

## 1. カルーセル / スライダー

### 採用判断

| 要件 | 実装 |
|---|---|
| 前後ボタン・ページネーション・自動再生・ループ等「スライダーらしい」操作が必要 | **Swiper**（既定・承認済み） |
| 横に並べてスワイプ/スクロールで見られれば十分（カード一覧等） | **CSSスクロールスナップ**（JS不要） |
| ロゴ等がただ流れ続けるだけ | **marquee**（large-motion-patterns参照。カルーセルにしない） |
| 既存サイト改修でslick等が導入済み | 既存に従う（existing-site-modification） |

### Swiper実装ルール

- バンドラ案件（Vite等）は `npm i swiper` + **使用モジュールのみ**import。バンドラなし案件はCDNの `swiper-bundle`（全部入りで楽だが重い。バンドラ案件でbundleをimportしない）
- バージョンは導入時に最新安定版を確認する（以下はv11系の例）
- **自動再生を使う場合は一時停止ボタンを必ず付ける**（WCAG 2.2.2。hoverで止まるだけではタッチ端末で止められない）。`reduceMotion` 時は自動再生を無効にする
- `loop: true` はスライドがDOM複製される。スライド内に `id`・フォーム要素を置かない。枚数が少ないと正しくループしない（表示枚数の2倍が目安）
- 画像は width/height 必須 + 枠側の `aspect-ratio` でサイズ確定（CLS対策）
- `breakpoints` のキーはpx指定。CSSのブレークポイント（48em=768px / 64em=1024px。正は coding-standard の `mq()`）と揃える
- a11yメッセージは日本語化する（デフォルトは英語）

```html
<div class="p-works-slider swiper js-works-slider">
  <ul class="swiper-wrapper">
    <li class="swiper-slide">…</li>
  </ul>
  <button class="p-works-slider__pause js-slider-pause" type="button" aria-label="自動再生を停止"></button>
  <div class="swiper-pagination"></div>
  <button class="swiper-button-prev" type="button" aria-label="前のスライドへ"></button>
  <button class="swiper-button-next" type="button" aria-label="次のスライドへ"></button>
</div>
```

```js
// works-slider.js
import Swiper from "swiper";
import { Navigation, Pagination, Autoplay, A11y, Keyboard } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export function initWorksSlider() {
  const el = document.querySelector(".js-works-slider");
  if (!el) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const swiper = new Swiper(el, {
    modules: [Navigation, Pagination, Autoplay, A11y, Keyboard],
    slidesPerView: 1.2, // 次のスライドをチラ見せして「まだある」と伝える
    spaceBetween: 16,
    breakpoints: {
      768: { slidesPerView: 2, spaceBetween: 24 },
      1024: { slidesPerView: 3, spaceBetween: 32 },
    },
    loop: true,
    speed: 600,
    autoplay: reduceMotion
      ? false
      : { delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true },
    keyboard: { enabled: true },
    // 要素はインスタンス内から取得する（1ページ複数スライダー対応）
    navigation: {
      nextEl: el.querySelector(".swiper-button-next"),
      prevEl: el.querySelector(".swiper-button-prev"),
    },
    pagination: { el: el.querySelector(".swiper-pagination"), clickable: true },
    a11y: {
      prevSlideMessage: "前のスライドへ",
      nextSlideMessage: "次のスライドへ",
      paginationBulletMessage: "{{index}}枚目のスライドを表示",
    },
  });

  // 一時停止ボタン（autoplay使用時は必須）
  const pauseBtn = el.querySelector(".js-slider-pause");
  if (pauseBtn && swiper.params.autoplay) {
    pauseBtn.addEventListener("click", () => {
      const running = swiper.autoplay.running;
      running ? swiper.autoplay.stop() : swiper.autoplay.start();
      pauseBtn.setAttribute("aria-label", running ? "自動再生を再開" : "自動再生を停止");
      pauseBtn.classList.toggle("is-paused", running);
    });
  }
}
```

「SPはスライダー・PCはグリッド」型は、ブレークポイント切替でinit/destroyする:

```js
const mqPc = window.matchMedia("(min-width: 64em)");
let swiper = null;
function update(e) {
  if (e.matches) {
    swiper?.destroy(true, true); // DOMを元に戻す
    swiper = null;
  } else if (!swiper) {
    swiper = new Swiper(el, options);
  }
}
mqPc.addEventListener("change", update);
update(mqPc);
```

- destroy後も `.swiper-wrapper { display: flex }`（Swiper側CSS）が残るため、PC側のグリッドは `@include mq(pc)` 内で上書きする

### CSSスクロールスナップ（JSなしで足りる場合）

```html
<ul class="c-snap-slider">
  <li class="c-snap-slider__item">…</li>
</ul>
```

```scss
.c-snap-slider {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 24px; // 端でのスナップ位置を調整
  padding-block-end: 8px; // スクロールバーと内容の間隔
  &__item {
    flex: 0 0 min(80%, 320px); // はみ出し表示で「スクロールできる」と伝える
    scroll-snap-align: start;
  }
}
```

- スクロールバーは消さない（消すなら前後ボタン等の代替手段を付ける。「スクロールできると気づけない」問題を作らない）
- この方式で足りる要件にSwiperを入れない

## 2. モーダル（`<dialog>` 一択）

自作divモーダルは作らない。`<dialog>` + `showModal()` なら、フォーカストラップ・ESCで閉じる・背面の操作不能化（inert）・top-layer表示（z-index地獄の回避）・閉じたとき開いたボタンへフォーカスが戻る挙動、がすべて標準で付く。

```html
<button type="button" class="js-modal-open" data-modal="modal-movie">動画を見る</button>

<dialog class="c-modal js-modal" id="modal-movie" aria-labelledby="modal-movie-title">
  <div class="c-modal__inner">
    <h2 class="c-modal__title" id="modal-movie-title">…</h2>
    <div class="c-modal__body">…</div>
    <button type="button" class="c-modal__close js-modal-close" aria-label="閉じる"></button>
  </div>
</dialog>
```

```js
// modal.js
import { lockScroll, unlockScroll } from "./scroll-lock.js";

export function initModal() {
  document.querySelectorAll(".js-modal-open").forEach((btn) => {
    const dialog = document.getElementById(btn.dataset.modal);
    if (!dialog) return;
    btn.addEventListener("click", () => {
      dialog.showModal();
      lockScroll();
    });
  });

  document.querySelectorAll(".js-modal").forEach((dialog) => {
    dialog.querySelector(".js-modal-close")?.addEventListener("click", () => dialog.close());

    // 背景クリックで閉じる: dialog自体がクリック対象 = inner外（backdrop相当）
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });

    // 閉じ方によらず必ず通る後始末はcloseイベントに集約（ESCで閉じてもここを通る）
    dialog.addEventListener("close", () => unlockScroll());
  });
}
```

```scss
.c-modal {
  margin: auto; // 中央配置
  border: none;
  padding: 0; // 背景クリック判定を成立させるため、dialog自体は無余白にしてinnerに余白を持たせる
  opacity: 0;
  transition: opacity 0.3s ease, display 0.3s ease allow-discrete, overlay 0.3s ease allow-discrete;
  &[open] {
    opacity: 1;
    @starting-style {
      opacity: 0;
    }
  }
  &::backdrop {
    background: rgb(0 0 0 / 0.6);
  }
  &__inner {
    padding: 40px 24px;
  }
}
```

- `overlay` の transition は Chrome/Edge のみ対応（Firefox / Safari は未対応〔2026-09-19 確認〕）。未対応環境では閉じるアニメーション中に top layer から外れ、固定ヘッダー等が上に重なりうる。**固定要素より上の `z-index` を `.c-modal` / `.c-drawer` に保険で指定しておく**（値は案件の z-index トークンに従う）
- 開いた直後のフォーカスは「dialog内の最初のフォーカス可能要素」。先頭に当てたい要素があれば `autofocus` を付ける
- `closedby="any"`（宣言的な背景クリック閉じ）は Chrome/Edge 134+・Firefox 141+ のみで Safari 未対応＝Baseline 外。上のクリック判定で十分
- 動画モーダルは `close` 時に再生を止める（`video.pause()` / iframeは `src` を空にして戻す）

### 派生: ライトボックス（画像拡大）

サムネイルを `<button>` で包み、共有の `<dialog>` 内の `<img>` を差し替える。

```html
<button type="button" class="js-lightbox-open" data-full="photo01.webp">
  <img src="photo01-thumb.webp" width="400" height="300" alt="施工事例: ○○邸リビング">
</button>

<dialog class="c-lightbox js-lightbox js-modal"><img src="" alt=""><button type="button" class="js-modal-close" aria-label="閉じる"></button></dialog>
```

```js
// lightbox.js
// 閉じるボタン・背景クリック・ESC後の unlockScroll は initModal が受け持つ（dialog に js-modal を併記しているため）。
// initModal を呼ばないページで使う場合は、close イベントで unlockScroll する処理をここに足す
import { lockScroll } from "./scroll-lock.js";

export function initLightbox() {
  const dialog = document.querySelector(".js-lightbox"); // 全サムネで共有する1つのdialog
  if (!dialog) return;
  const img = dialog.querySelector("img");
  document.querySelectorAll(".js-lightbox-open").forEach((btn) => {
    btn.addEventListener("click", () => {
      img.src = btn.dataset.full;
      img.alt = btn.querySelector("img")?.alt ?? ""; // altはサムネから引き継ぐ
      dialog.showModal();
      lockScroll();
    });
  });
}
```

- 拡大画像の枠は `aspect-ratio` 等でサイズを確定し、読み込み中のガタつきを防ぐ

## 3. ドロワーメニュー（ハンバーガー詳細版）

ドロワーも `<dialog>` で実装すると、フォーカストラップ・ESC・背面操作不能が標準で済む。本体SKILL.mdのクラストグル式（`is-menu-open`）で作る場合は、末尾のチェックリストを自前で満たすこと。

```html
<header class="l-header">
  <button type="button" class="js-drawer-open" data-drawer="drawer-menu" aria-label="メニューを開く">…</button>
</header>

<dialog class="c-drawer js-drawer" id="drawer-menu" aria-label="メニュー">
  <nav>…</nav>
  <button type="button" class="js-drawer-close" aria-label="メニューを閉じる">…</button>
</dialog>
```

```js
// drawer.js（モーダルと同じ data属性ペアリングで複数インスタンス対応）
import { lockScroll, unlockScroll } from "./scroll-lock.js";

export function initDrawer() {
  document.querySelectorAll(".js-drawer-open").forEach((btn) => {
    const drawer = document.getElementById(btn.dataset.drawer);
    if (!drawer) return;
    btn.addEventListener("click", () => {
      drawer.showModal();
      lockScroll();
    });
  });

  document.querySelectorAll(".js-drawer").forEach((drawer) => {
    drawer.querySelector(".js-drawer-close")?.addEventListener("click", () => drawer.close());
    drawer.addEventListener("close", () => unlockScroll());

    // ページ内アンカーへ移動するときは閉じる
    drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => drawer.close()));

    // PC幅に切り替わったら閉じる（開きっぱなし＋ロック残りの定番バグ対策）
    const mqPc = window.matchMedia("(min-width: 64em)");
    mqPc.addEventListener("change", (e) => {
      if (e.matches) drawer.close();
    });
  });
}
```

```scss
.c-drawer {
  // dialogのUA既定（中央寄せ・最大サイズ・境界線）を上書きして右端パネルにする
  margin: 0 0 0 auto;
  width: min(80%, 400px);
  height: 100svh;
  max-height: none;
  border: none;
  translate: 100% 0;
  transition: translate 0.4s ease, display 0.4s ease allow-discrete, overlay 0.4s ease allow-discrete;
  &[open] {
    translate: 0 0;
    @starting-style {
      translate: 100% 0;
    }
  }
}
```

クラストグル式で自作する場合のチェックリスト（dialogなら全部標準か上記数行で済む）:

- [ ] トリガーの `aria-expanded` を開閉と同時に更新
- [ ] ESCキーで閉じられる
- [ ] 開いている間、背面コンテンツを `inert` にする
- [ ] 閉じたら開閉ボタンへフォーカスを戻す
- [ ] 背景スクロールロック（PC幅切替時の解除漏れも）

## 4. アコーディオン

- 基本は `<details>`/`<summary>`（本体ルール）。「1つ開くと他が閉じる」は `name` 属性で宣言的に実現できる（主要ブラウザ対応済み）。ただしFAQは「複数開いて見比べたい」場合も多いので、排他にするかは要件で判断する
- 開閉アニメーションは `interpolate-size` + `::details-content` のCSSのみ方式を第一候補にする。非対応ブラウザは即時開閉に落ちるだけで機能は損なわれない（`interpolate-size` は Chrome/Edge 129+ のみで Baseline 外、`::details-content` は Baseline 2025-09 Newly available。Firefox / Safari ではアニメーションしない前提で採用する）
- クロスブラウザで必ずアニメーションさせる要件のときだけ、grid-template-rows方式で自作する

```html
<details class="c-accordion" name="faq">
  <summary class="c-accordion__summary">配送にはどのくらいかかりますか？</summary>
  <div class="c-accordion__body">…回答…</div>
</details>
```

```scss
:root {
  interpolate-size: allow-keywords; // height: auto へのtransitionを許可（対応ブラウザのみ効く）
}

.c-accordion {
  &::details-content {
    height: 0;
    overflow: clip;
    transition: height 0.3s ease, content-visibility 0.3s ease allow-discrete;
  }
  &[open]::details-content {
    height: auto;
  }
  &__summary {
    list-style: none; // 既定の三角マーカーを消し、::after等でアイコンを付ける
    cursor: pointer;
    &::-webkit-details-marker {
      display: none;
    }
  }
}
```

### 自作する場合（grid-template-rows方式・全ブラウザでアニメ可）

```html
<div class="c-accordion2">
  <button type="button" class="c-accordion2__trigger js-acc-trigger" aria-expanded="false" aria-controls="acc-1">質問…</button>
  <div class="c-accordion2__panel" id="acc-1">
    <div class="c-accordion2__inner">回答…</div>
  </div>
</div>
```

```scss
.c-accordion2 {
  &__panel {
    display: grid;
    grid-template-rows: 0fr; // 0fr→1fr で高さ不定のままアニメーションできる
    overflow: hidden;
    transition: grid-template-rows 0.3s ease;
  }
  &__inner {
    min-height: 0;
    visibility: hidden; // 閉状態で中のリンクがTab巡回・読み上げに乗らないように
    transition: visibility 0.3s;
  }
  &__trigger[aria-expanded="true"] + &__panel {
    grid-template-rows: 1fr;
    .c-accordion2__inner {
      visibility: visible;
    }
  }
}
```

```js
// accordion.js（イベント委譲。動的に増えても動く）
export function initAccordion() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-acc-trigger");
    if (!btn) return;
    btn.setAttribute("aria-expanded", String(btn.getAttribute("aria-expanded") !== "true"));
  });
}
```

## 5. タブ

状態はクラスではなく属性（`aria-selected` / `hidden` / `tabindex`）で管理する。矢印キー・Home/Endでのタブ間移動も付ける。

```html
<div class="c-tab js-tab">
  <div class="c-tab__list" role="tablist" aria-label="料金プラン">
    <button class="c-tab__tab" type="button" role="tab" id="tab-1" aria-controls="panel-1" aria-selected="true">個人</button>
    <button class="c-tab__tab" type="button" role="tab" id="tab-2" aria-controls="panel-2" aria-selected="false" tabindex="-1">法人</button>
  </div>
  <div class="c-tab__panel" role="tabpanel" id="panel-1" aria-labelledby="tab-1">…</div>
  <div class="c-tab__panel" role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>…</div>
</div>
```

```js
// tab.js（main.jsから: document.querySelectorAll('.js-tab').forEach(initTab);）
export function initTab(root) {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = [...root.querySelectorAll('[role="tabpanel"]')];

  function activate(tab) {
    tabs.forEach((t) => {
      const selected = t === tab;
      t.setAttribute("aria-selected", String(selected));
      t.tabIndex = selected ? 0 : -1; // Tabキーは選択中タブにだけ止まる（roving tabindex）
    });
    panels.forEach((p) => (p.hidden = p.id !== tab.getAttribute("aria-controls")));
    tab.focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => activate(tab));
    tab.addEventListener("keydown", (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1, Home: -i, End: tabs.length - 1 - i }[e.key];
      if (step === undefined) return;
      e.preventDefault();
      activate(tabs[(i + step + tabs.length) % tabs.length]);
    });
  });
}
```

## 6. ツールチップ / 軽い吹き出し（Popover API）

- `popover` 属性 + `popovertarget` なら、開閉・ESC・外側クリックで閉じる（light dismiss）・top-layer表示までJSゼロで済む
- hoverで出すツールチップはタッチ端末で使えない。クリック式にする。そもそも重要な情報をツールチップに隠さない
- CSS Anchor Positioning はコア機能（`anchor-name` / `position-try-fallbacks` / `position-visibility` 等）が Chrome 125・Safari 26・Firefox 147（2026-01）で3エンジン揃った〔2026-09-19 確認。webstatus の総合表示は後発キーの影響で Limited のまま〕。**`@supports (anchor-name: --a)` の内側で採用してよく、下の `toggle` イベントでの位置決めは未対応環境向けのフォールバック**として残す。`position-visibility` のキーワードは改名の過渡期（Safari 27 は単数形 `anchor-visible`、Chrome / Firefox は複数形 `anchors-visible`）なので、使うなら両方書く

```html
<button type="button" class="c-tooltip__trigger" popovertarget="tip-fee">手数料とは？</button>
<div class="c-tooltip__panel" id="tip-fee" popover>販売価格の10%が手数料として…</div>
```

```js
// tooltip.js: トリガーの直下に表示する（popoverは position: fixed のviewport基準）
export function initTooltip() {
  document.querySelectorAll("[popover]").forEach((panel) => {
    const trigger = document.querySelector(`[popovertarget="${panel.id}"]`);
    if (!trigger) return;
    panel.addEventListener("toggle", (e) => {
      if (e.newState !== "open") return;
      const r = trigger.getBoundingClientRect();
      panel.style.top = `${r.bottom + 8}px`;
      panel.style.left = `${r.left}px`;
    });
  });
}
```

- 開いたままページをスクロールすると位置がズレる。問題になる場合はスクロール時に `panel.hidePopover()` で閉じるのが簡単

## 7. ページトップボタン

```html
<button type="button" class="c-pagetop js-pagetop" aria-label="ページの先頭へ戻る">↑</button>
```

```js
// pagetop.js
export function initPagetop() {
  const btn = document.querySelector(".js-pagetop");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  // ファーストビューを過ぎたら表示する（scrollイベントではなくIntersectionObserver）
  const sentinel = document.querySelector(".js-pagetop-sentinel") ?? document.body.firstElementChild;
  new IntersectionObserver(([entry]) => {
    btn.classList.toggle("is-visible", !entry.isIntersecting);
  }).observe(sentinel);
}
```

- 表示切替は、`display` 切替でアニメさせる場合は `@starting-style` + `allow-discrete`（冒頭「共通の前提」参照）、対応を簡易にするなら `.is-visible` に `opacity` + `visibility` のtransitionで
- 「フッターに重ねない」要件は、フッター直前に置いた親要素内で `position: sticky` にする方法もある
- Lenis導入案件は `lenis.scrollTo(0)` に置き換える

## 8. 絞り込みフィルタ（実績・商品一覧）

```html
<div class="p-works-filter" role="group" aria-label="実績の絞り込み">
  <button type="button" class="js-filter-btn" data-filter="all" aria-pressed="true">すべて</button>
  <button type="button" class="js-filter-btn" data-filter="web" aria-pressed="false">Webサイト</button>
  <button type="button" class="js-filter-btn" data-filter="wordpress" aria-pressed="false">WordPress</button>
</div>

<ul class="p-works-list js-filter-list">
  <li data-category="web wordpress">…</li>
  <li data-category="web">…</li>
</ul>
<p class="js-filter-empty" hidden>該当する実績はありません</p>
```

```js
// filter.js
export function initFilter() {
  const buttons = document.querySelectorAll(".js-filter-btn");
  const items = document.querySelectorAll(".js-filter-list > li");
  const empty = document.querySelector(".js-filter-empty");
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.filter;
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      let visible = 0;
      items.forEach((item) => {
        const show = key === "all" || item.dataset.category.split(" ").includes(key);
        item.hidden = !show;
        if (show) visible += 1;
      });
      if (empty) empty.hidden = visible > 0;
    });
  });
}
```

- 選択状態は `aria-pressed` で持ち、見た目は `[aria-pressed="true"]` セレクタで当てる（クラスと属性の二重管理をしない）
- 0件表示のメッセージを必ず用意する（全部消えて壊れたように見える問題）
- 出現アニメーションはフェードで十分ならCSS（`@starting-style`）。FLIP等の並び替えアニメは工数対効果が薄いので既定では入れない
- 「URLで絞り込み状態を共有したい」要件が出たときだけ `URLSearchParams` で `?category=` 同期を足す

## 9. スムーススクロール（ページ内アンカー）

JSは書かないのが基本。CSSで足りる。

```scss
html {
  scroll-behavior: smooth;
  @media (prefers-reduced-motion: reduce) {
    scroll-behavior: auto;
  }
}

[id] {
  scroll-margin-top: 96px; // 固定ヘッダーの高さぶん。値はヘッダー高のトークンと揃える
}
```

- `href="#"` のダミーリンクは使わない（動作はJS任せなら `<button>` にする）
- Lenis導入案件はCSSの `scroll-behavior: smooth` を外し、`lenis.scrollTo()` に置き換える（large-motion-patterns参照）

## 10. セレクトボックス（カスタムUIを作る前に）

「デザインカンプの `select` が角丸・矢印つきで、ネイティブと違う」ときの採用順序。**上から順に検討し、下に行くほどコストと事故率が上がる。**

1. **`appearance: none` + 背景画像の矢印** … 閉じているときの見た目だけ変えれば足りる場合。選択肢リスト（ドロップダウン）はネイティブのまま
2. **`appearance: base-select`（推奨・2026-09〜）** … 選択肢リストまで含めて装飾したい場合。Chrome/Edge 135+・Safari 27+。`::picker(select)` / `::picker-icon` / `::checkmark` を装飾する。**キーボード操作・モバイルのピッカー・フォーム送信・バリデーションはネイティブのまま残る**のが決定的な利点。未対応環境（Firefox・古いiOS）ではネイティブ表示に戻るだけなので、**フォールバックが「素のselect」でよい案件では進行的強化としてそのまま入れてよい**
3. **JSでの自作（`role="combobox"` / `listbox`）** … 検索付き・複数選択・独自の選択肢UIが要件のときだけ。`aria-expanded` / `aria-activedescendant` / 矢印キー・Home/End・Escape・フォーカストラップまで自前で作ることになる。**見た目のためだけに選ばない**

案件の対応ブラウザ要件が「全ブラウザで同一の見た目」なら 3 になるが、その要件自体を疑う（`design-taste` の判断に戻す）。フォーム全体のマークアップ・状態スタイルは `form-implementation` が正。
