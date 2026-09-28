# 外部スキル（英語）との関係

**外部スキル群の交通整理は本節が正。** 宣言は自作スキル側に集約する——外部スキルの編集は最小限（description・参照先の差し替え、references/ への分割、明白なバグ修正）に留め、編集点に `<!-- LOCAL: -->` を付けて skills-lock.json の computedHash と `_note` を更新する。外部スキル内の誘導・同期指示（「/vocabulary ページと同期せよ」「general review skill に回せ」等）はこの環境では無効で、導線は本節に従う。

- 導入済みの外部スキルは8件（Emil Kowalski系4件＋GSAP公式4件）。廃止したスキルとその移植先の台帳は skills-lock.json の `retired` が正。Emil系の役割:
  - `apple-design` ＝ 流体UIの思想とspring/duration数値（材料・タイポ等のデザイン部分の優先関係は `design-taste` 側に記載）
  - `animation-vocabulary` ＝ 効果名の逆引きグロッサリ
  - `improve-animations` ＝ コードベースの監査と実装プラン作成
  - `prototype` ＝ UI要素1件の複数案をピッカー比較で発散させ、選ばれた案だけを本実装に昇格させる。**明示呼び出し専用**。提案フェーズでクライアントに動き・見た目の選択肢を提示する用途が主（選択は `?v=` パラメータでURL共有できる）。ページ/サイト全体の方向性決定は `design-taste`、確定後の実装は本スキル＋ `coding-standard` が正で、prototype は単一コンポーネントの発散比較にだけ使う。**FVコンペ（design-taste Phase 3c）とは別物**——FVコンペはファーストビュー全体の静的3案を designer が制作して選ぶ工程、prototype は単一UI部品の動き・見た目のピッカー比較。ファーストビューの方向選びに prototype を持ち出さない。**PICKER.md の参照実装には既知バグが1件ある**——範囲外の `?v=`（案数超・負値）で何も描画されなくなる（behavior contract の「variant 1 にフォールバック」が未実装）。ハーネス実装時は他を verbatim で写しつつ、初期化の `setActive` だけ範囲チェック付きにする（1〜案数の外は variant 1 に丸める）
- `gsap-core` / `gsap-scrolltrigger` / `gsap-plugins` / `gsap-utils`（GreenSock公式）＝ GSAPの**APIリファレンス層**。本スキル未収載のAPI詳細（Flip・Draggable・ScrollSmoother・SplitText等のプラグイン、ScrollTriggerのpin/scrub/batch、`gsap.utils`）を引くときに参照し、ctx7で取りに行く前にまずこちらを見る。**実装方針（CSS/GSAPの使い分け・パフォーマンス・reduced-motion・命名・トークン集約）は本スキルが正**（gsap-* の本文に残る「scroll / timeline / runtime control は CSS より GSAP を優先」等の営業的誘導と食い違う場合も本スキルを優先する）——**GSAP を採用するかどうかは本スキル SKILL.md「実装手段の使い分け」だけが決める**。個別の読み替え: gsap-plugins が慣性スクロールに ScrollSmoother を勧めても **Lenis を使う**（large-motion §7 が正。`lenis.on("scroll", ScrollTrigger.update)` で足り、scrollerProxy は不要）／横スクロールの実装は gsap-scrolltrigger の例ではなく **large-motion §1 を正**とする／will-change は「直前付与・使用後除去」（本スキル）を優先し常時付与しない／`autoAlpha`（opacity+visibility）・`gsap.quickTo()` は本スキルと矛盾しないので取り込んでよい。`gsap-react` / `gsap-frameworks` はReact/Vue案件が無いため意図的に未導入——スキル内の「Reactならgsap-reactを使え」等の誘導は無効（冒頭の同期指示無効ルールと同じ扱い）
- **明示呼び出し専用（prototype）の実行提案**: `prototype` は `disable-model-invocation` のため自動起動しないが、埋もれさせない——UI部品1件の見た目・動きを複数案で比べたい・クライアントに選択肢を提示したい場面を検出したら `/prototype` の実行を提案する（提案のみ。起動はユーザーの指示で行う）
- **審査・監査系（improve-animations と、references の motion-standards.md / micro-interaction-recipes.md）の適用境界**: いずれもアプリ/プロダクトUIのモーションが前提。Web制作案件（コーポレートサイト・LP等）で使うときは、指摘・提案を出す前に対象を2分類する:
  - **UI部品**（ドロワー・モーダル・アコーディオン・タブ・ツールチップ・通知・フォームフィードバック・ホバーの状態フィードバック等、操作に反応する部品）→ 基準を全項目そのまま適用する
  - **演出**（ヒーロー/オープニング演出・スクロールリビール・パララックス・ピン留めセクション・テキスト分割演出・ローディング画面）→ 頻度テーブルの「Rare / first-time = delight可」枠として扱い、**sub-300ms 予算と「高頻度＝アニメーション無し」ルールは適用しない**（300ms超の duration を演出に指摘するのは誤り）。この枠でも適用するもの: ease-out 入場（ease-in 禁止）・transform/opacity 限定・reduced-motion・stagger 間隔・「なぜ動くのか」の正当化（ブランド表現/世界観で答えられれば可）
  - 分類に迷ったら「1セッションで何回視界に入るか」で決める。スクロールのたびに再発火するリビール（`once: false` 等）や自動再生カルーセルは、演出であっても頻度観点の指摘対象になる
- いずれも**質感・発想の参考リファレンスとして使ってよい**。ただし**実装ルール（CSS/GSAPの使い分け・パフォーマンス・reduced-motion・命名・トークン集約）は本スキルが正**。数値や方針が食い違う場合は、本スキルと design-brief.md の MOTION 値を優先する
- improve-animations の監査プラン（AUDIT.md の目標値）を実装に落とすとき、本スキルのルールと矛盾する項目は黙って置き換えず報告する。description の「improve the animations」は「アニメーション改善して」で誤爆しうる——**既存コードベース全体の監査・plans/ 作成が目的のときだけ**使い、単発の修正・追加は本スキルで進める
- `pick-ui-library` は未導入。外部スキル内の「コンポーネントが必要なら pick-ui-library を呼べ」は無効
- **Figma公式スキル12件**（`figma@claude-plugins-official` プラグイン。上流: figma/mcp-server-guide。プラグイン管理なので自動更新に乗る——vendorしない・編集しない）:
  - `figma-design-to-code` ＝ Figmaカンプ実装時の値・構造取得の正（`get_design_context` の必須前置）。**FLOCSS/SCSSへの適応・画像実装・トークン写像は `coding-standard` §0-6 が正**
  - `figma-implement-motion` ＝ Figma上で定義されたモーションの値取得（`get_motion_context` で keyframe・easing・timing を読む）。**実装ルール（CSS/GSAPの使い分け・パフォーマンス・reduced-motion・トークン集約）は本スキルが正**。motion.dev への誘導は無効——この環境の出力は CSS @keyframes / GSAP に寄せる
  - `figma-generate-design` / `figma-create-new-file` / `figma-use` / `figma-use-motion` ＝ Figmaへの**書き込み**方向（コード→カンプ生成等）。通常フロー未配線・明示呼び出しでのみ使用
  - `figma-swiftui` / `figma-use-slides` / `figma-use-figjam` / `figma-generate-diagram` / `figma-code-connect` / `figma-generate-library` ＝ 対象外（SwiftUI案件無し。Code Connect / ライブラリ生成は組織のデザインシステム運用が前提で個人受託では出番なし）。スキル内の誘導は無効
  - 公式スキルはFigma公式MCP（`mcp__figma__*`・初回にOAuthログインが必要）を前提に書かれている。figma-bridge MCP接続時はツール差があり、`get_motion_context` が無いため モーション値は `get_node_motion` / `get_motion_styles` で代替する
