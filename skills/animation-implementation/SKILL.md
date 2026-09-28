---
name: animation-implementation
verified: 2026-08-26
description: Web制作の実案件で、要素の出現・ホバー・スクロール連動などのアニメーションを実装する際に使用する。CSS(@keyframes/transition)とGSAPの使い分け、パフォーマンスルール、coding-standardとの併用を前提とする。「アニメーションつけて」「動きをつけて」「GSAPで実装して」「スクロールで出てくる演出にして」「ホバーエフェクトをつけて」「パララックスにして」「オープニング演出を入れて」「慣性スクロールにして」「リッチな動きにして」等の依頼で使う。GSAP採用の可否は本スキルが決める（gsap-* はAPI参照専用）。既存コード全体のアニメ監査は improve-animations、実装後のレビューは js-reviewer が担当。
---

# アニメーション実装ルール

Web制作の実案件で、CSS/JSアニメーションを実装する際は、以下のルールに従う。`coding-standard` との併用を前提とする。

## 0. 着手前に確認すること

1. **design-brief.md の MOTION 値**（`design-taste` Phase 2 で宣言したダイヤル）を確認し、演出の深度をこの値に合わせる。briefが無い案件は依頼内容から仮置きし、仮置きと明示する

| MOTION | 実装の目安 |
|---|---|
| 1〜3 | CSSのみ（transition / IntersectionObserver + クラス付与） |
| 4〜6 | GSAP基本（タイムライン・stagger）＋スクロール出現 |
| 7〜10 | ScrollTrigger演出・大きな動き（`references/large-motion-patterns.md`）を検討 |

2. **ライブラリ追加の可否**: GSAP / Lenis 等を新規導入する際は、共通ルールどおり事前に確認を取る（読み込みはCDNかnpmか、案件のビルド環境に合わせる）
3. **対応ブラウザ範囲**: `coding-standard` の確認事項と共通。新しめのCSS機能（`@starting-style` 等）の採用判断に影響する
4. **UI部品に動きを足すときの却下ゲート**（演出には適用しない——演出の採否は design-brief の MOTION 値が上流）: ①頻度——1日に何十回も触る操作（ナビ・ホバー・頻繁なトグル）は動かさないか、ほぼ知覚できない速さに留める ②目的——フィードバック／空間の一貫性／状態表示／唐突な変化の緩和／説明 のどれかで一言で言えるか（「かっこいいから」は不可） ③速度——UI部品は300ms未満に収まるか ④機能——読む・操作するための情報密度の高いUIでは装飾の動きは邪魔になる。1つでも落ちたら付けない

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

### スクロール連動の新しい選択肢（CSSスクロール駆動アニメーション）

- CSSの**スクロール駆動アニメーション**（`animation-timeline: scroll()` / `view()` + `animation-range`）は、スクロール位置や要素の可視領域に連動した演出を**JSなし・コンポジタスレッド**で実現できる。進捗バー、単純なパララックス、可視領域に入った要素のフェード等の「単純なスクロール連動」では `ScrollTrigger` の代替になりうる
- ただし2026-07時点で**Baseline未達（限定的利用）**。Chrome/Edge 115+・Safari 26+ は対応するが、**Firefox 安定版が未対応**（フラグ付き）。採用する場合は `coding-standard` のモダンCSS採用ルールに従い、対応ブラウザ要件を確認したうえで、未対応ブラウザでは演出が再生されず要素は静止表示になる（＝内容が成立する）フォールバック前提で使う
- 複数要素の時間差制御・中断/往復・SVGパスや数値の補間など複雑な制御、あるいはクロスブラウザで確実に動かす必要がある案件では、引き続き `ScrollTrigger` を既定とする
- CSSスクロール駆動アニメーションでも `prefers-reduced-motion` 対応は必須（一括killパターンは使わない。`references/large-motion-patterns.md`「スクロール駆動アニメの reduced-motion 粒度」節が正）

判断に迷う場合は「CSSで書けるなら書かない理由がない」を基本とし、CSSで実現できるものにGSAPを使わない。

## CSS実装ルール

- アニメーション対象のプロパティは「パフォーマンスルール」（後述）に従う（`transform` / `opacity` のみ基本）
- `@keyframes` の名前は `kf-` プレフィックスを付ける（例: `kf-fade-in-up`）。FLOCSSのレイヤーと衝突しないようにするため
- `transition` はプロパティを明示指定する（`transition: all .3s;` のような `all` 指定は避け、`transition: transform .3s ease, opacity .3s ease;` のように書く）
- duration・easingの値は `foundation/_variable.scss` にトークン化する（例: `$duration-base: .3s; $ease-out: cubic-bezier(.23,1,.32,1);`）。数値をコンポーネントごとにバラバラに書かない（`coding-standard` の変数集約ルール）。easing・duration の代表値セットは `references/motion-standards.md` が正で、ここで挙げた `$ease-out` はその一例。GSAP使用時はJS側にも同じ値の定数を持たせ、CSSと二重定義にならないよう同期させる
- `prefers-reduced-motion: reduce` に対応する。動きに意味がある演出（出現アニメーション等）は、このメディアクエリ内で `transition-duration` を短く/`0` にするか、`transform` を無効化する

```scss
@media (prefers-reduced-motion: reduce) {
  // 動きに意味がある演出だけを個別に止める（* 一括にしない）
  .c-reveal,
  .p-hero__visual {
    animation: none;
    transition-duration: 0.01ms;
    transform: none;
  }
}
```

`* { animation-duration: 0.01ms !important }` の一括killパターンは使わない。スクロール駆動アニメーション（`animation-timeline`）を壊し、`::details-content` 等の新しい擬似要素には掛からないため。対象の選び方と粒度パターンは `references/large-motion-patterns.md`「スクロール駆動アニメの reduced-motion 粒度」節が正。

### スクロール出現の最小骨格（MOTION 1〜3 / IntersectionObserver + クラス付与）

GSAPを使わないスクロール出現（表示/非表示の1回きりの切り替え）はこの骨格を基本とする。HTML側は `<div class="c-card c-fade-up js-inview">` のようにスタイル用クラスとフックを併記する。

```js
// inview.js
export function initInview() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-inview");
        io.unobserve(entry.target); // 1回きり（ScrollTriggerのonce相当）
      });
    },
    { rootMargin: "0px 0px -15% 0px" } // 画面下端から15%手前で発火（start: "top 85%" 相当）
  );
  document.querySelectorAll(".js-inview").forEach((el) => io.observe(el));
}
```

```scss
// スタイルは .js-inview でなくスタイル用クラスに当てる（coding-standardの分離ルール）
.c-fade-up {
  opacity: 0;
  translate: 0 24px;
  transition: opacity 0.6s ease, translate 0.6s ease;
  &.is-inview {
    opacity: 1;
    translate: 0 0;
  }
  @media (prefers-reduced-motion: reduce) {
    opacity: 1;
    translate: 0 0;
    transition: none;
  }
}
```

- 初期非表示（`opacity: 0`）をCSSに直書きするため、JS失敗時の保険が必要なページではヒーローイントロと同じ `.js` クラスゲート（`references/large-motion-patterns.md` 参照）を使う

## GSAP実装ルール

- GSAPは旧Club Plugins（SplitText・MorphSVG・Draggable等）を含め、商用利用も完全無料。有料を理由に演出の選択肢から外さない。ただし「使うプラグインのみ読み込む」原則は従来どおり維持する
- CDN読み込みは案件の対応ブラウザ要件を確認した上で `gsap` 本体 + 必要なプラグイン（`ScrollTrigger` 等）のみを読み込む。使わないプラグインは読み込まない
- アニメーション対象は `p-` または `c-` オブジェクトのルート要素に `js-` プレフィックスのフック用クラス、または `data-animate` 系のdata属性で指定する（スタイル用クラス `c-` `p-` とJS操作用フックを分離する。JSがCSSクラスに依存しないようにする）
  - 例: `<div class="c-card js-fade-up" data-animate="fade-up">`
- タイムライン（`gsap.timeline()`）の配置は position parameter で制御する（`delay` の連鎖で順序を作らない）: 絶対 `1`＝1秒地点 / 相対 `"+=0.5"` `"-=0.2"`＝直前の終端基準 / `"<"`＝直前と同時開始・`"<0.2"`＝直前開始の0.2秒後 / `">"`＝直前の終了時（既定）/ ラベル `"intro"` `"intro+=0.3"`。共通の duration・ease は `gsap.timeline({ defaults: {...} })` に寄せる。ScrollTrigger は入れ子の子ではなくトップレベルのタイムライン／tweenに付ける
- タイムライン（`gsap.timeline()`）は演出ごとに1つの関数にまとめ、初期化処理は `DOMContentLoaded` またはページ全体のinit関数から呼び出す形にし、グローバルスコープに散らばらせない
- `ScrollTrigger` を使う場合、`start` / `end` / `once` の指定を明示する。特に「1回だけ再生」なのか「スクロールに追従して往復」なのかを最初に決めて実装する
- `gsap.set()` で初期状態（非表示・ズレた位置など）を明示的に設定してからアニメーションさせる。CSS側の初期状態とJS側の初期状態が二重管理・矛盾しないよう、初期状態はどちらか一方（基本はJS側）に寄せる
- **CSSの `transition` を持つ要素をGSAPで直接動かさない（同一プロパティを2つのエンジンで奪い合わせない）**。`transition: transform` を持つ要素（ホバー付きの `c-button` 系が典型）を `.from()`/`.to()` の対象にすると、tweenが1フレームも再生されず完了時にスナップする「凍結」が起きる。ホバーの有無に関係なく起きるため、tween対象に同一プロパティの `transition` が載っていないかを実装時に確認する。該当したら `transition` を持たないラッパー要素を作り、ラッパー側を動かす。`clearProps` は最終状態とホバーを直すが凍結自体を隠す対症療法なので、この用途では使わない
- **演出の検証は最終状態だけで判定しない**。「最終位置が正しい」は「演出が再生された」の証拠にならない（凍結していても完了時にスナップすれば最終状態は正しく見える）。入場演出は対象の `style.transform` 等を数百msごとに読む時系列サンプリングで、中間値が出ていることを確認する。サンプリング窓は対象の出番（タイムライン上の開始時刻）より長く取る（短いと「凍結」と「まだ始まっていない」を取り違える）
- `prefers-reduced-motion` はJS側でも判定し、該当する場合はタイムラインのdurationを0にするかアニメーション自体をスキップする
- **モーションには動機を持たせる**。実装前に「この動きは何を伝えるか」を1文で説明できないアニメーションは実装しない（例:「カードの重なりで制作フローの積み上がりを表現する」はOK、「なんとなく動かす」はNG）。説明できない演出は削除候補とする
- 無限ループの横流し演出（marquee / ロゴスライダー等）は**1ページ1回まで**。2箇所以上入れたくなったら片方を静的グリッドに変える
- スクロール連動は `window.addEventListener("scroll", ...)` を直接使わない。連続値の変化は `ScrollTrigger`、表示切替のみなら `IntersectionObserver` を使う（メインスレッド負荷のため）。唯一の例外は `references/large-motion-patterns.md`「11. video scrubbing」の骨格（GSAP不採用案件のみ・条件は同節）

```js
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function fadeUpAnimation() {
  const targets = document.querySelectorAll(".js-fade-up");
  targets.forEach((el) => {
    gsap.set(el, { opacity: 0, y: 24 });
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: reduceMotion ? 0 : 0.6,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        once: true,
      },
    });
  });
}
```

## 大きな動き・定番演出（references参照）

以下の演出は、ゼロから書かず **`references/large-motion-patterns.md` の骨格をベースに実装する**。ピン留め系・ライブラリ連携系は書き方を間違えると崩れやすいため、該当する依頼が来たら必ずreferencesを読んでから着手する。

1. 横スクロールパン（縦スクロールで横に流れるセクション）
2. スティッキースタック（カードが重なっていく演出）
3. オープニング演出（ヒーローイントロ）
4. テキスト分割アニメーション（SplitText）
5. パララックス（画像の視差）
6. マウス追従カーソル
7. 慣性スクロール（Lenis）
8. 無限ループ横流し（marquee）
9. 数値カウントアップ
10. ページ遷移演出（View Transitions）
11. スクロールで動画の再生位置を動かす（video scrubbing）

referencesを読まない場合でも、最低限これだけは守る:

- **ピン留め（`pin: true`）を使う演出の `start` は必ず `"top top"`**（途中発火はピンずれで崩れる最頻出バグ）
- ピン留めセクション後続のズレは `invalidateOnRefresh: true` + 画像のwidth/height指定で防ぐ
- `reduceMotion` 時は大きな演出ごとスキップし、演出なしの縦積みでも成立するHTML構造にしておく
- ライブラリ追加が必要な演出（Lenis等）は、共通ルールどおり導入前に確認を取る

## パフォーマンスルール

- アニメーションさせるプロパティは `transform` と `opacity` のみを基本とする（CSS/GSAP共通）。`translate` / `scale` / `rotate` の個別プロパティは `transform` と同等に扱ってよい。例外として許す骨格（アコーディオンの `grid-template-rows` 開閉、`<dialog>`・ドロワーの `transition-behavior: allow-discrete`）は js-implementation-standard の `references/ui-components.md` が定める
- `will-change` は「今まさにアニメーションする直前の要素」にのみ付与し、常時付与しない。使い終わったら外す、もしくはアニメーション開始時にJSで付与→終了時に削除する運用にする
- 同時に動く要素数が多い場合（リスト一括fadeUp等）は `stagger` を使い、個別にタイムラインを増やさない
- スクロール連動アニメーションは対象要素数が多くなりやすいので、`ScrollTrigger` の `once: true` を基本にし、往復再生が本当に必要な場合のみ双方向にする
- 画像・動画等の重いコンテンツにアニメーションを重ねる場合、レイアウトシフト（CLS）を起こさないよう、要素のサイズは事前に確保（`aspect-ratio` 等）してからアニメーションさせる

## coding-standard との併用

- クラス命名（`js-`フックとスタイル用クラスの分離、`is-`状態クラス）とトークンの集約先は `coding-standard` のルールに従う
- モダンCSSの `@starting-style` や `transition-behavior: allow-discrete` など、`display: none` 要素の出現アニメーションを可能にする機能は採用してよい（`<dialog>` は Baseline Widely available。`@starting-style` / `transition-behavior` は 2024-08、Popover は 2025-01 から **Newly available**〔2026-09-19 確認〕——未対応環境ではアニメーションなしの即時開閉に落ちるだけなので `@supports` ガードなしで採用可）。案件の対応ブラウザ範囲が特殊な場合のみ `coding-standard` のモダンCSS採用ルールに従って再確認する

## 外部スキル（英語）との関係

導入済みの外部スキルは8件（Emil Kowalski系4件: apple-design / animation-vocabulary / improve-animations / prototype ＋ GSAP公式4件: gsap-core / gsap-scrolltrigger / gsap-plugins / gsap-utils）。詳細・提案基準は **`references/external-skills.md`（この節が外部スキル使い分けの正）** を読んでから使う。要点:

- 外部スキルの編集は最小限（description・参照先の差し替え、references/ への分割、明白なバグ修正）。編集点には `<!-- LOCAL: -->` を付け、skills-lock.json の computedHash と `_note` を更新する。外部スキル内の誘導・同期指示はこの環境では無効
- **実装ルール（CSS/GSAPの使い分け・パフォーマンス・reduced-motion・命名・トークン集約）と GSAP 採用可否は本スキルが正**。gsap-* は API リファレンス層。本文に残る「CSS より GSAP を優先」等と食い違う場合は本スキルと design-brief.md の MOTION 値を優先する
- `prototype` は明示呼び出し専用（UI部品1件の複数案比較。該当場面では実行を提案する。基準はreferences参照）
- 参照資料: **`references/micro-interaction-recipes.md`**（マイクロインタラクションのレシピ集。UI部品の動きを実装するときに読む）／**`references/motion-standards.md`**（feel数値カタログ。js-reviewer が判定値として読む）。廃止した外部スキルの台帳は skills-lock.json の `retired` が正

## 出力形式

- HTML + SCSS + （GSAP使用時のみ）JSをまとめて実装する

対応レビューエージェント: `js-reviewer`
