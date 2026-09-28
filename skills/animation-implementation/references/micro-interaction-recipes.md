<!--
出自: emilkowalski/skills `skills/animate/RECIPES.md`（MIT License, Copyright (c) 2026 Emil Kowalski）。
animation-implementation の参照資料（マイクロインタラクションのレシピ集）。本文は上流ベース。上流の更新は追わない（vendor 済み）。
LOCAL: Base UI / React 依存だった箇所（Dropdown・Tooltip・Modal の `var(--transform-origin)` / `[data-starting-style]`、Toast の useEffect フォールバック、Drag to dismiss の spring 設定）を
プレーン CSS（Popover API / `<dialog>` + `@starting-style` + `transition-behavior: allow-discrete`）と GSAP に書き換え、Scroll reveal は本体 SKILL.md への参照に置き換えた。

この環境での読み替え（animation-implementation が正）:
- ツール選定は Motion (motion.dev) / React 前提で書かれている → CSS @keyframes / transition / GSAP に読み替える
- 「SKILL.md で定義したトークン」とは次の3つ（旧 animate/SKILL.md 由来）。案件では `foundation/_variable.scss` のトークンに寄せ、並行トークン体系を作らない:
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);      /* strong ease-out for UI */
    --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* strong ease-in-out for on-screen movement */
    --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* iOS-like drawer curve (Ionic) */
- 頻度ゲート・sub-300ms 予算は UI部品にのみ適用し、演出には適用しない（external-skills.md「UI部品と演出の適用境界」）
-->

# Animation Recipes

Ready-to-build implementations for the cases that come up most. Start from the recipe, then adapt — don't rebuild from scratch.

Curves are the `--ease-out`, `--ease-in-out`, and `--ease-drawer` tokens defined in SKILL.md.

---

## Button press

Any pressable element. Instant feedback that the interface heard the user.

```css
.button {
  transition: transform 160ms var(--ease-out);
}

.button:active {
  transform: scale(0.97);
}
```

`scale()` scales children too — the label and icons come along, which is what makes it read as a physical press.

No hover gating needed here: `:active` is a real press on touch. Gate any `:hover` styling separately.

---

## Dropdown, popover, menu, select

Scales out of its trigger, not out of thin air.

Plain CSS with the Popover API (`popover` + `popovertarget`, no JS). `@starting-style` handles the entry, `transition-behavior: allow-discrete` on `display` / `overlay` handles the exit.

```css
.popover {
  /* Set the origin explicitly to the trigger's corner (e.g. top left when the panel opens below-left).
     If the panel can flip, have the positioning JS set a data attribute and switch the origin on it. */
  transform-origin: top left;
  opacity: 0;
  transform: scale(0.95);
  transition:
    opacity 200ms var(--ease-out),
    transform 200ms var(--ease-out),
    overlay 200ms allow-discrete,
    display 200ms allow-discrete;
}

.popover:popover-open {
  opacity: 1;
  transform: scale(1);

  @starting-style {
    opacity: 0;
    transform: scale(0.95);
  }
}
```

For a class-toggled panel (no Popover API), replace `:popover-open` with `.is-open` and drop the `overlay` line.

The `transform-origin` is the whole point — the panel should look like it came out of the thing you clicked.

---

## Tooltip

Same shape as a popover, faster, plus the detail most implementations miss.

```css
.tooltip {
  transform-origin: bottom center; /* tooltip sits above its trigger; set explicitly per placement */
  opacity: 0;
  transform: scale(0.97);
  transition:
    transform 125ms var(--ease-out),
    opacity 125ms var(--ease-out),
    overlay 125ms allow-discrete,
    display 125ms allow-discrete;
}

.tooltip:popover-open {
  opacity: 1;
  transform: scale(1);

  @starting-style {
    opacity: 0;
    transform: scale(0.97);
  }
}

/* Once one tooltip is open, neighbours open instantly (JS sets data-instant while any tooltip is open) */
.tooltip[data-instant] {
  transition-duration: 0ms;
}
```

The initial delay prevents accidental activation. After that, skipping both the delay and the animation makes the whole toolbar feel faster.

---

## Modal

The one popover that stays centered.

Native `<dialog>` (`showModal()` / `close()`); the backdrop is `::backdrop`.

```css
.modal {
  transform-origin: center; /* exempt — not anchored to a trigger */
  opacity: 0;
  transform: scale(0.96);
  transition:
    opacity 250ms var(--ease-out),
    transform 250ms var(--ease-out),
    overlay 250ms allow-discrete,
    display 250ms allow-discrete;
}

.modal[open] {
  opacity: 1;
  transform: scale(1);

  @starting-style {
    opacity: 0;
    transform: scale(0.96);
  }
}

.modal::backdrop {
  opacity: 0;
  transition:
    opacity 250ms var(--ease-out),
    overlay 250ms allow-discrete,
    display 250ms allow-discrete;
}

.modal[open]::backdrop {
  opacity: 1;

  @starting-style {
    opacity: 0;
  }
}
```

Animate the backdrop's opacity alongside it so they read as one surface.

---

## Drawer / sheet

```css
.drawer {
  transform: translateY(0);
  transition: transform 500ms var(--ease-drawer);
}

.drawer[data-closed] {
  transform: translateY(100%);
}
```

This is how Vaul hides a drawer before animating it in.

Add drag and it becomes a gesture problem — see **Drag to dismiss** below.

---

## Toast

```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 400ms ease,
    transform 400ms ease;

  @starting-style {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

- `ease` rather than `ease-out`, slightly slower than typical UI: Sonner reads as elegant partly because its motion is tuned to the component's personality rather than to the generic UI budget.
- `@starting-style` is Baseline Newly available (since 2024-08; checked 2026-09-19) — no fallback needed, because unsupported browsers simply show the element without the enter transition. If a class-toggle is required for another reason, insert the element, then add `.is-mounted` inside a double `requestAnimationFrame` so the initial state paints first.

When toasts stack and the list reflows, the opacity change has to work against the height change. There's no formula for that pair — adjust until it feels right, then check it again the next day.

---

## Accordion / collapse

```css
.content {
  overflow: hidden;
  transition:
    height 200ms var(--ease-out),
    opacity 200ms var(--ease-out);
}
```

Keep it short — this is one of the few animations that costs layout on every frame, so a long duration is expensive as well as sluggish. Measure the content height in JS (or use a headless primitive that supplies it) rather than animating to `auto`.

---

## Stagger a group entrance

For a list or grid the user sees occasionally — not for a list they scroll past all day.

```css
.item {
  opacity: 0;
  transform: translateY(8px);
  animation: fadeIn 300ms var(--ease-out) forwards;
}

.item:nth-child(2) { animation-delay: 50ms; }
.item:nth-child(3) { animation-delay: 100ms; }
.item:nth-child(4) { animation-delay: 150ms; }

@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Stagger is decorative — it must never block interaction while it plays.

---

## Hold to confirm

For destructive actions where a plain click is too easy to fire by accident.

```css
.overlay {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 200ms var(--ease-out); /* release: snappy */
}

.button:active .overlay {
  clip-path: inset(0 0 0 0);
  transition: clip-path 2s linear;             /* press: slow and deliberate */
}

.button:active {
  transform: scale(0.97);
}
```

`linear` is correct here — the fill is a progress indicator, and progress shouldn't ease.

---

## Tab indicator with a color transition

Timing individual color transitions across a tab list never quite lands. Clip instead.

Duplicate the tab list. Style the copy as the active state — different background, different text color. Clip the copy so only the active tab shows, and animate the clip on change:

```css
.tabs-active-copy {
  clip-path: inset(0 60% 0 20%); /* driven by the active tab's position */
  transition: clip-path 250ms var(--ease-in-out);
}
```

The text and background change together, in perfect sync, because they're one element being revealed rather than two colors being interpolated.

---

## Scroll reveal

Marketing surfaces only. Don't do this to functional UI a user visits daily.

→ 骨格は本体 SKILL.md「スクロール出現の最小骨格」（IntersectionObserver + `.is-inview`、1回きり発火）が正。clip-path で見せたい場合は、その `.c-fade-up` の opacity/translate を `clip-path: inset(0 0 100% 0)` → `inset(0 0 0 0)`（`600ms var(--ease-in-out)`）に差し替えるだけ。Fire it once — re-animating on every scroll-by is an interface fighting its reader.

---

## Drag to dismiss

The gesture recipe. Interruptible tweens, not fixed keyframes, because the user can reverse mid-motion.

```js
// Dismiss on a flick, not just on distance
const timeTaken = Date.now() - dragStartTime.current;
const velocity = Math.abs(swipeAmount) / timeTaken;

if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11) {
  dismiss();
}
```

```js
// Set transform on the dragged element directly.
// Driving it through a CSS variable on the parent recalcs styles for every child.
element.style.transform = `translateY(${distance}px)`;
```

Four details that separate a good drag from a bad one:

- **Pointer capture** once the drag starts, so it continues when the pointer leaves the element's bounds.
- **Multi-touch protection** — `if (isDragging) return` on new touch points, or switching fingers mid-drag makes the element jump.
- **Damping past boundaries** — dragging beyond a natural edge moves the element less the further it goes. Real things slow before they stop.
- **Friction, not a wall** — allow the over-drag with rising resistance rather than refusing it.

Settle with a GSAP tween that overwrites any in-flight tween, so an interrupted drag retargets from its current position instead of restarting:

```js
// snap back (or out) after the pointer is released
gsap.to(element, { y: 0, duration: 0.5, ease: "back.out(1.2)", overwrite: true });
```

Keep the overshoot subtle (`back.out(1–1.4)`); most UI should use `power2.out` with no bounce.

---

## Masking a crossfade that won't settle

When two states overlap visibly during a transition and no amount of easing or duration tuning fixes it, blur the seam:

```css
.content {
  transition:
    filter 200ms ease,
    opacity 200ms ease;
}

.content.transitioning {
  filter: blur(2px);
  opacity: 0.7;
}
```

Without blur the eye reads two distinct objects swapping. Blur blends them into one perceived transformation. Keep it under 20px — heavy blur is expensive, especially in Safari.

---

## Programmatic, without a library

When the motion needs JS control but not a dependency, WAAPI gives you CSS-grade performance:

```js
element.animate(
  [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }],
  { duration: 1000, fill: 'forwards', easing: 'cubic-bezier(0.77, 0, 0.175, 1)' }
);
```

Hardware-accelerated, interruptible, no bundle cost.
