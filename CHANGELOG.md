# Skill 更新履歴

<!-- skill-auto-update-pipeline により生成。適用は毎回ユーザー承認済みの変更のみ -->

### 2026-08-10 form-implementation（提案中 / PR: proposal/2026-08-10）
- 追加: 「バリデーション方針」に、送信時にエラーが残る場合は最初のエラー項目へフォーカスを移動する旨（キーボード/スクリーンリーダー対応・スマホでの自動スクロール）と、エラーメッセージを該当欄直下にインライン配置する旨を追記
- 出典: https://www.72technologies.com/blog/form-validation-ux-when-to-show-errors / https://www.staticforms.dev/blog/form-error-messages / https://www.uxpin.com/studio/blog/error-feedback-best-practices-mobile-forms/
- 承認者: PR レビューにて

### 2026-07-27 animation-implementation（提案中 / PR: proposal/2026-07-27）
- 追加: 「実装手段の使い分け」に、CSSスクロール駆動アニメーション（`animation-timeline: scroll()`/`view()`）を単純なスクロール連動の新しい選択肢として追記。Baseline未達（Firefox安定版未対応）のため `coding-standard` のモダンCSS採用ルールに従いフォールバック前提で使う旨、複雑な制御・クロスブラウザ確実性が必要な場合はScrollTriggerを既定とする旨を明記
- 出典: https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/ / https://web-platform-dx.github.io/web-features-explorer/features/scroll-driven-animations/
- 承認者: PR レビューにて

### 2026-07-20 coding-standard（提案中 / PR: proposal/2026-07-20）
- 追加: §6「色・コントラスト」に、透過/固定ヘッダーなど背景が動的に変わる要素上のテキストのコントラストを実機（FV〜次セクション通しスクロール）で確認する注記
- 出典: https://www.nngroup.com/articles/sticky-headers/
- 承認者: PR レビューにて

### 2026-07-06 seo-meta-implementation
- 修正: 構造化データの推奨 `@type` 例から `FAQPage` を除外し、新規実装非推奨の注記を追加（Googleが2026年5月7日にFAQリッチリザルト表示を完全終了）
- 出典: https://www.suzukikenichi.com/blog/google-deprecated-faq-rich-result-feature/
- 承認者: ユーザー

### 2026-07-06 wp-maintenance-inspection
- 追加: 「プラグイン・本体更新の進め方」にPHPバージョン点検の観点（EOL確認・移行手順・毎回Web検索で最新確認）
- 出典: https://seory.co.jp/php-version/ / https://wpcenter.jp/blog/php-version-upgrade-wordpress/
- 承認者: ユーザー

### 2026-07-06 animation-implementation
- 追加: GSAP実装ルール冒頭にライセンス情報（2025年4月末より旧Club Plugins含め商用完全無料）
- 出典: https://ics.media/entry/220822/
- 承認者: ユーザー

### 2026-07-05 coding-standard
- 追加: セクション4「単位の使い分け」に `lh` / `rlh` 単位（2026年5月 Baseline Widely available）
- 出典: https://web.dev/blog/baseline-digest-may-2026
- 追加: セクション5「モダンCSS」リストに `scrollbar-width` / `scrollbar-color`（後者は装飾用途限定の注意書き付き）
- 出典: https://www.buildmvpfast.com/blog/web-platform-baseline-2026-new-features-browser-support
- 承認者: ユーザー
