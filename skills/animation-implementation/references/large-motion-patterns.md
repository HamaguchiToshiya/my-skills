# 大きな動きパターン集（定番演出の実装骨格）

`animation-implementation` 本体のルール（CSS/GSAPの使い分け・パフォーマンス・`reduceMotion`・命名・トークン化）を前提とした、ページの主役級演出の骨格集。ゼロから書かず、ここの骨格をベースに案件へ合わせて調整する。

## 共通の前提

- **ピン留め（`pin: true`）を使う演出の `start` は必ず `"top top"`**。`"top 80%"` 等の途中発火にすると、ピンが画面途中で始まりレイアウトがズレて崩れる（最頻出バグ）
- ピン留めセクションの後続要素の位置が狂う場合は `invalidateOnRefresh: true` を付け、画像には width/height 指定（CLS対策）を徹底する
- `reduceMotion` 時は演出ごとスキップし、演出なしの縦積みレイアウトで成立するHTML構造にしておく（演出前提の構造にしない）
- 大きな動きは**1ページに主役1つ**が目安。横パン・スタック・慣性スクロールを同一ページに全部盛りしない（本体の「動きの動機」ルールと同じ考え方）
- **緩急の設計**（出自: nateherkai/scroll-craft, MIT）: 最大の視覚変化（ピーク）に最長のスクロール尺を与える。同じ演出ファミリーを2セクション連続で使わない。ページ終端はフェードで流して終わらせず、解決して静止する
- 画像・Webフォントの読み込みで要素の高さが変わるとScrollTriggerの開始位置がズレる。`window.addEventListener('load', () => ScrollTrigger.refresh())` を入れておく。`ScrollTrigger.refresh()` は全トリガーの再計算で重いので、レイアウトが実際に変わったとき（load・アコーディオン開閉・画像遅延読み込み完了）にだけ呼び、resize 由来なら debounce する（ScrollTrigger 自体の resize 追従は内蔵されているので、自前の resize ハンドラから毎回呼ばない）
- 各スケルトンの `reduceMotion` は共有ユーティリティから import する（ファイルごとに重複定義しない）:

  ```js
  // utils/reduce-motion.js
  export const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  ```

  各スケルトンの冒頭に `import { reduceMotion } from "../utils/reduce-motion.js";` を足す前提で読む
- コード例の duration / easing は仮値。実案件では `foundation/_variable.scss` のトークンに置き換える（本体のトークン集約ルール）
- スケルトンはESM表記。CDNグローバル読み込みの案件では `import` 行を読み替える。バンドラ利用時は `gsap.registerPlugin(ScrollTrigger, SplitText)` を忘れない
- デバッグ用の `markers: true` は納品前に必ず外す

## 1. 横スクロールパン（縦スクロールで横に流れるセクション）

```html
<section class="p-works-pan js-hpan">
  <div class="p-works-pan__track js-hpan-track">
    <div class="p-works-pan__panel js-hpan-panel">…</div>
    <div class="p-works-pan__panel js-hpan-panel">…</div>
    <div class="p-works-pan__panel js-hpan-panel">…</div>
  </div>
</section>
```

```scss
.p-works-pan {
  overflow: hidden;
  &__track {
    display: flex; // パネルを横並びにする
  }
  &__panel {
    flex: 0 0 100vw; // 1パネル = 1画面幅
    min-height: 100svh;
  }
}
```

```js
function horizontalPan() {
  const wrapper = document.querySelector(".js-hpan");
  if (!wrapper) return; // 演出なしでも縦積みで読める構造にしておく

  // scrub系は reduceMotion の早期returnでなく gsap.matchMedia() で囲む
  // （設定変更にも追従して演出ごと止まる。他のscrub系スケルトンも同様に囲んでよい）
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const panels = gsap.utils.toArray(".js-hpan-panel", wrapper);

    gsap.to(panels, {
      xPercent: -100 * (panels.length - 1), // パネル数-1枚ぶん左へ
      ease: "none",
      scrollTrigger: {
        trigger: wrapper,
        pin: true,
        scrub: 1,
        start: "top top", // 必ず top top（途中発火はピンずれの原因）
        end: () => "+=" + wrapper.offsetWidth * (panels.length - 1), // 横移動量ぶんスクロール距離を確保
        invalidateOnRefresh: true,
      },
    });
  });
}
```

## 2. スティッキースタック（スクロールでカードが重なっていく演出）

```html
<section class="p-flow js-stack">
  <article class="p-flow__card js-stack-card">…</article>
  <article class="p-flow__card js-stack-card">…</article>
  <article class="p-flow__card js-stack-card">…</article>
</section>
```

```js
function stickyStack() {
  const cards = gsap.utils.toArray(".js-stack-card");
  if (!cards.length || reduceMotion) return;

  cards.forEach((card, i) => {
    const isLast = i === cards.length - 1;
    if (isLast) return; // 最後のカードは固定しない

    // カードを画面上部に固定し、次のカードが上に重なってくる
    ScrollTrigger.create({
      trigger: card,
      start: "top top+=96", // ヘッダー高ぶんオフセット（値はトークンと揃える）
      endTrigger: cards[cards.length - 1],
      end: "top top+=96",
      pin: true,
      pinSpacing: false, // 後続カードを詰めて重ねる
    });

    // 重なられる側をわずかに縮小して奥行きを出す
    gsap.to(card, {
      scale: 0.95,
      ease: "none",
      scrollTrigger: {
        trigger: cards[i + 1],
        start: "top bottom",
        end: "top top+=96",
        scrub: true,
      },
    });
  });
}
```

- カード枚数は3〜5枚が上限目安。多すぎるとスクロール距離が長くなりすぎて離脱要因になる
- `pinSpacing: false` を使うため、セクション下端の余白は実機で必ず確認する

## 3. オープニング演出（ヒーローイントロ）

- **1セッション1回まで**。ページ内回遊のたびに再生される演出は確実に嫌われる。`sessionStorage` で制御する
- ローディング画面（進捗バー）は原則作らない。実測と合わないフェイク進捗になりがちで、重さの解決は `performance-optimization` の仕事。演出したいなら「即開始のイントロ」にする
- 初期非表示は `gsap.from()`（JS側）で作る。CSSに `opacity: 0` を直書きすると、JSが失敗したときページが表示されないままになる

```js
// hero-intro.js
export function heroIntro() {
  const hero = document.querySelector(".js-hero");
  if (!hero) return;

  const KEY = "heroIntroPlayed";
  const skip = reduceMotion || sessionStorage.getItem(KEY) === "1";
  sessionStorage.setItem(KEY, "1");
  if (skip) return; // 初期状態はJS側で作っているので、スキップ時は何もしなくてよい

  const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });
  tl.from(".js-hero-copy", { opacity: 0, y: 32 })
    .from(".js-hero-visual", { opacity: 0, scale: 1.04 }, "-=0.4")
    .from(".js-header", { opacity: 0, y: -16 }, "-=0.4");
}
```

- 再生前に一瞬コンテンツが見えてしまう（チラつく）場合のみ、headのインラインスクリプトで `<html>` に `js` クラスを付け、`.js .p-hero__copy { opacity: 0; }` のようにスタイル用クラス側でJS有効時だけCSSで初期非表示にする（`.js-*` はCSSセレクタに使わない — coding-standard。JS無効・エラー時は表示されたまま＝安全側）
- 全画面オーバーレイ型（ロゴ表示→カーテン退場）にする場合: オーバーレイは `position: fixed` + 最後に `yPercent: -100` で退場させ、終了時に `display: none` にする。表示中も `pointer-events: none` にできないか検討し、ユーザーの操作を奪う時間を最短にする

## 4. テキスト分割アニメーション（SplitText）

- SplitTextは3.13以降**無料**、かつアクセシビリティ対応内蔵（元テキストを `aria-label` に、分割spanを `aria-hidden` にする処理が自動で入る）。手動のaria対応は不要
- 日本語は `words` 分割が効かない（スペース区切りがないため）。`chars` か `lines` を使う
- `chars` 分割はspan化で禁則処理（句読点の行頭禁止等）が壊れることがある。**改行が発生しない短い見出しに限定**し、長めの文は `lines` のみにする
- 適用は見出し・キャッチコピーまで。本文への適用は可読性を損なうので禁止

```js
// split-title.js
export function splitTitles() {
  if (reduceMotion) return;
  document.querySelectorAll(".js-split").forEach((el) => {
    SplitText.create(el, {
      type: "lines,chars",
      autoSplit: true, // フォント読み込み・リサイズ時に自動で再分割
      mask: "lines",   // 行ごとにクリップ用マスクを付け「下から出る」表現に
      onSplit: (self) =>
        gsap.from(self.chars, {
          yPercent: 110,
          stagger: 0.02,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        }), // アニメーションを返すと再分割時に自動でクリーンアップされる
    });
  });
}
```

## 5. パララックス（画像の視差）

- `background-attachment: fixed` は使わない（iOSで効かない・再描画負荷が高い）。`transform` ベースで実装する
- ずらし量は最大±10%程度。大きくすると酔い・違和感の原因になる
- テキストには掛けない（可読性が落ちる）。画像のみ、1ページ1〜3箇所のアクセントまで

```html
<div class="c-parallax js-parallax">
  <img src="visual.webp" width="1200" height="800" alt="">
</div>
```

```scss
.c-parallax {
  overflow: hidden;
  aspect-ratio: 3 / 2; // 枠のサイズは枠側で確定させる（CLS対策）
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    scale: 1.2; // 動かしても端が見えないよう「のりしろ」を確保
  }
}
```

```js
export function parallax() {
  if (reduceMotion) return;
  document.querySelectorAll(".js-parallax").forEach((frame) => {
    const img = frame.querySelector("img");
    gsap.fromTo(img, { yPercent: -8 }, {
      yPercent: 8,
      ease: "none",
      scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: true },
    });
  });
}
```

## 6. マウス追従カーソル

- **`pointer-events: none` 必須**。忘れるとカーソル要素がクリックを奪い、全リンクが押せなくなる
- ネイティブカーソルは消さない（`cursor: none` はどこを指しているか分からなくなる）。「装飾を重ねる」演出にとどめる
- タッチ端末・`reduceMotion` では初期化ごとスキップする
- `mousemove` は高頻度で発火するため、都度 `gsap.to()` を作らず `gsap.quickTo()` を使う

```html
<div class="c-cursor js-cursor" aria-hidden="true"></div>
```

```scss
.c-cursor {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  width: 24px;
  height: 24px;
  pointer-events: none; // 必須
  border-radius: 50%;
  background: #fff;
  mix-blend-mode: difference; // 背景色を反転させる定番。不要なら外す
  transition: scale 0.3s ease;
  &.is-hover {
    scale: 2.5;
  }
  @media (hover: none), (pointer: coarse) {
    display: none; // タッチ端末では出さない
  }
}
```

```js
export function cursorFollower() {
  const cursor = document.querySelector(".js-cursor");
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!cursor || !fine || reduceMotion) return;

  gsap.set(cursor, { xPercent: -50, yPercent: -50 });
  const xTo = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3" });
  window.addEventListener("mousemove", (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
  });

  // ホバー対象で拡大（イベント委譲で拾う）
  document.addEventListener("mouseover", (e) => {
    cursor.classList.toggle("is-hover", Boolean(e.target.closest("a, button")));
  });
}
```

## 7. 慣性スクロール（Lenis）

- **ライブラリ追加なので、共通ルールどおり導入前に確認を取る**。サイト全体の手触りが変わるため、クライアントへの事前確認も推奨
- 向くのはブランディング・ポートフォリオ型。フォーム主体・情報検索型サイトには入れない
- npmは `lenis`。CDNの場合は `dist/lenis.min.js`（グローバルに `Lenis`）と `dist/lenis.css` を読み込む

```js
// smooth-scroll.js
import Lenis from "lenis";
import "lenis/dist/lenis.css"; // 推奨CSS（html.lenis 等）を同梱から読み込む

export function initLenis() {
  if (reduceMotion) return null;

  const lenis = new Lenis({ autoRaf: false });

  // ScrollTrigger連携はこの3行が正（scrollerProxyは不要）
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  return lenis;
}
```

- CSSの `scroll-behavior: smooth` と併用しない（イージングが二重に掛かる）。アンカーリンクは `lenis.scrollTo(hash, { offset: -ヘッダー高 })` に置き換える
- モーダル・ドロワー表示中は `lenis.stop()`、閉じたら `lenis.start()`（`ui-components.md` の背景スクロールロックと連動させる）
- モーダル内・横スクロールUI内など「中で普通にスクロールさせたい」要素には `data-lenis-prevent` を付ける
- `main.js` では戻り値の `lenis` を保持し、アンカー処理・モーダル処理へ渡す

## 8. 無限ループ横流し（marquee）

- **1ページ1回まで**（本体ルール）。2箇所目が欲しくなったら片方を静的グリッドに変える
- 動きはCSSアニメーションのみで実装する（JSはトラックの複製だけ）
- 速度は「1周30秒〜」を目安に。速すぎると読めない上に安っぽくなる
- ロゴ画像は width/height 必須（読み込みで幅が変わるとガタつく）

```html
<div class="c-marquee">
  <ul class="c-marquee__track js-marquee-track">
    <li><img src="logo-a.svg" alt="株式会社A" width="160" height="48"></li>
    <!-- … 複製は手書きせずJSで生成する（メンテ漏れ防止） -->
  </ul>
</div>
```

```js
export function initMarquee() {
  document.querySelectorAll(".js-marquee-track").forEach((track) => {
    const clone = track.cloneNode(true);
    clone.setAttribute("aria-hidden", "true"); // 複製は支援技術・Tab巡回から除外
    clone.querySelectorAll("a, button").forEach((el) => (el.tabIndex = -1));
    track.parentElement.append(clone);
  });
}
```

```scss
.c-marquee {
  display: flex;
  overflow: hidden;
  &__track {
    display: flex;
    flex: 0 0 auto;
    min-width: 100%;
    gap: 40px;
    padding-right: 40px; // 継ぎ目にもgapぶんの余白を作る
    animation: kf-marquee 30s linear infinite;
    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }
}

@keyframes kf-marquee {
  to {
    transform: translateX(-100%);
  }
}
```

## 9. 数値カウントアップ

- HTMLには**最終値を書いておく**（JS無効でも成立し、CLS・SEOにも安全）。JSが開始時に0へ差し替えてから回す
- カウント中に数字の幅が変わってガタつく場合は、数値に `font-variant-numeric: tabular-nums` を当てる

```html
<p class="p-stats__num"><span class="js-count" data-count-to="1250">1,250</span>件</p>
```

```js
export function countUp() {
  document.querySelectorAll(".js-count").forEach((el) => {
    const to = parseFloat(el.dataset.countTo);
    const counter = { val: 0 };
    gsap.to(counter, {
      val: to,
      duration: reduceMotion ? 0 : 1.4,
      ease: "power2.out",
      snap: { val: 1 }, // 整数刻み。小数（98.5%等）なら 0.1 に
      onUpdate: () => {
        el.textContent = counter.val.toLocaleString(); // 桁区切りはHTML側の表記と揃える
      },
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
  });
}
```

## 10. ページ遷移演出（View Transitions）

- 静的HTML（MPA）のページ間フェードは、CSSのみのクロスドキュメントView Transitionsで**プログレッシブエンハンスメント**として入れる。非対応ブラウザは通常遷移になるだけで害がない（採用前に対応状況を確認 — coding-standardのモダンCSS採用ルール）
- barba.js等のJSページ遷移（SPA化）は既定で採用しない。スクリプト再初期化・計測タグ・保守の複雑さがコストに見合う案件は稀。必要な場合のみ事前確認の上で

```scss
// 全ページ共通CSSに置く（同一オリジン間の遷移で有効）
@view-transition {
  navigation: auto;
}

::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none !important;
  }
}
```

## スクロール駆動アニメの reduced-motion 粒度

CSSスクロール駆動アニメーション（`animation-timeline: scroll()` / `view()`）を使うページでは、`prefers-reduced-motion` の一括killパターン（`* { animation-duration: 0.01ms !important; }`）を使わない。durationを潰すとスクロール進行との対応が壊れ「発火しない」ように見える（本体SKILL.md参照）。対象を選んで `animation` ごと外す:

```scss
@media (prefers-reduced-motion: reduce) {
  // 動きに意味がある演出だけを個別に止める（* 一括にしない）
  .p-hero__visual,
  .c-reveal {
    animation: none;
  }
}
```

- GSAPの scrub はCSSでは止まらないため `gsap.matchMedia()` 側で止める（「1. 横スクロールパン」の形）

## 11. スクロールで動画の再生位置を動かす（video scrubbing）

「スクロールに合わせて映像がヌルヌル動く」系の依頼で、**3D・大量要素の演出を自前で組む代わりに、mp4 の再生位置をスクロール量で動かす**手。表現の上限が映像側（Blender / After Effects / 生成AI の出力）になるので、実装コストに対して見栄えの伸びが大きい。

### 採用判断

- **向く**: ヒーローの世界観演出、プロダクトの回転・分解、映像素材がすでにある／作れる案件
- **向かない**: テキストや要素と細かく連動させたい（→ ScrollTrigger + DOM）、動きが単純（→ `animation-timeline` のスクロール駆動。CSSだけで無料）、通信環境の悪いユーザーが主対象
- 映像を新規制作するなら**工数は実装ではなく映像側**に乗る。見積もり時に分けて出す

### 骨格

```html
<section class="p-hero js-video-scrub">
  <video class="p-hero__video js-video-scrub-video" src="/assets/hero.mp4" poster="/assets/hero-poster.webp" muted playsinline preload="auto"></video>
</section>
```

```js
const section = document.querySelector(".js-video-scrub");
const video = section?.querySelector(".js-video-scrub-video");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let target = 0, current = 0, raf = null;

const onScroll = () => {
  const rect = section.getBoundingClientRect();
  const total = section.offsetHeight - window.innerHeight;
  const progress = Math.min(Math.max(-rect.top / total, 0), 1); // 0〜1
  target = progress * (video.duration || 0);
  if (!raf) raf = requestAnimationFrame(tick);
};

const tick = () => {
  current += (target - current) * 0.15;        // 補間して滑らかに
  video.currentTime = current;
  raf = Math.abs(target - current) > 0.01 ? requestAnimationFrame(tick) : null;
};

// 画面内にあるときだけ scroll を購読する（画面外では購読を外す）
const io = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  } else {
    window.removeEventListener("scroll", onScroll);
  }
});

// reduced-motion ではスクラブ自体を初期化しない（poster が静止画として残る）
if (video && !reduceMotion) {
  if (video.readyState >= 1) io.observe(section);
  else video.addEventListener("loadedmetadata", () => io.observe(section), { once: true });
}
```

- **これは SKILL.md「scroll を直接使わない」の唯一の例外骨格。** 条件は3つ——①scroll ハンドラは目標値の計算だけ（`currentTime` への書き込みは rAF 側）②`passive: true` ③画面内のときだけ購読。js-reviewer もこの3条件で骨格との差分を見る
- **GSAP採用済みの案件では scroll を購読しない。** `ScrollTrigger.create({ trigger: section, start: "top top", end: "bottom bottom", onUpdate: (self) => { target = self.progress * video.duration; if (!raf) raf = requestAnimationFrame(tick); } })` に置き換え、`gsap.matchMedia()` の no-preference 側で作る

### 詰まるところ（ここを外すと「カクつく・動かない」になる）

- **scroll イベントで直接 `currentTime` を代入しない。** シークは重い処理なので、rAFで間引いて補間する（上の `tick`）
- **キーフレーム間隔（GOP）を短く書き出す。** 通常のmp4は数秒に1枚しかIフレームが無く、任意位置へのシークで直前のIフレームから復号し直すためカクつく。書き出し時に全フレームIフレーム寄りにする（`ffmpeg -g 1`、または ProRes → mp4 の再エンコード時に指定）。**ファイルサイズは増えるのでトレードオフ**
- **iOS は `muted` と `playsinline` が必須**（無いと全画面再生に持っていかれる）。`preload="auto"` も付ける
- **サイズがそのまま LCP に効く。** ヒーローで使うなら数MB以内に抑え、`poster` に1フレーム目の画像を置いて初期表示を埋める（`performance-optimization` の LCP 分解と併せて見る）
- **代替案**: 連番画像を canvas に描く方式（シークは正確・転送量は増える）。動きが単純なら CSS の `animation-timeline`
- **`prefers-reduced-motion` では静止画にする**: 骨格はスクラブを初期化せず `poster` を見せたままにする。動画の転送自体も止めたい場合は、動画要素ごと非表示にして `poster` 相当の `<img>` を出す

## 12. 背景動画（自動再生のループ動画）

ヒーロー等の背景で流しっぱなしにする動画。「PCでは動くのに iPhone で動かない」「省電力モードで真っ黒」が定番事故で、**再生できなかったときに黙って壊れない**ことが骨格の要点（HTML属性のルールは `coding-standard` の「動画」が正）。

```html
<video class="p-hero__bg js-bg-video" poster="/assets/hero-poster.webp" muted playsinline loop preload="metadata">
  <source src="/assets/hero.webm" type="video/webm">
  <source src="/assets/hero.mp4" type="video/mp4">
</video>
```

```js
const video = document.querySelector(".js-bg-video");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// reduced-motion では再生しない（poster が静止画として残る）。autoplay 属性ではなく JS から再生して分岐を持つ
if (video && !reduceMotion) {
  video.play().catch(() => {
    // 省電力モード・自動再生オフ等で拒否されたら poster のまま止める（再生ボタンを出すなら案件判断）
  });
}
```

- `autoplay` 属性を書く形にするなら `muted playsinline` とセット（check.mjs が検出）。その場合も reduced-motion では `video.pause()` して poster に戻す
- **音ありの自動再生は通らない**。要件に出てきたら設計段階で「タップで再生」に変える
- 停止手段: 5秒を超えて自動で動き続ける要素なので、装飾の域を超える動き（人物・文字が動く等）なら一時停止ボタンを付ける（WCAG 2.2.2）
