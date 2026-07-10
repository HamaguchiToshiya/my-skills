---
name: code-formatting-lint
description: Web制作の実案件で、PrettierやESLintの導入・設定ファイル生成・運用ルールを扱う際に使用する。「Prettier入れて」「ESLint設定して」「フォーマットを自動化したい」「保存時に自動整形したい」「コードの品質チェックをしたい」等の依頼で使う。.prettierrc・.eslintrc等の設定ファイルを新規作成する場合や、coding-standard/js-implementation-standardのルールとフォーマッタ設定を整合させる場合に必ず使用する。
---

# コードフォーマット・Lint運用ルール（Prettier / ESLint）

Web制作の実案件で、PrettierやESLintを導入・設定する際は、このスキルに従う。`coding-standard`（命名・単位・a11y等の「書き方」のルール）と役割が異なる点に注意する：このスキルは「書いたコードを自動で整形・検査する仕組み」を扱う。両者が矛盾しないよう、フォーマッタの設定は`coding-standard`のルールを壊さない範囲で行う。

対象は基本 vanilla JS + WordPress案件（Vue/Reactは対象外。フレームワーク案件の場合はその都度ユーザーに構成を確認する）。

## 0. 導入前に確認すること

依頼文に含まれていなければ、着手前に以下を確認する（不明のまま進める場合は前提を明示して仮置きする）。

1. **Node.js / npmが使える環境か**: 静的サイト制作でもnpm経由の導入が基本。npm未導入なら`npm init -y`から案内する
2. **エディタ**: Cursor/VS Code系であれば、保存時の自動フォーマットをエディタ設定側でも案内する
3. **既存の設定ファイルの有無**: `.prettierrc`や`.eslintrc`が既にある場合は上書きせず、差分を提案する

## 1. Prettierの設定方針

- インストール: `npm install --save-dev prettier`
- 設定ファイルは `.prettierrc.json` として作成する（JSON形式が読み書きしやすいため）
- `coding-standard`のHTML/SCSS実装と衝突しないよう、以下を既定値とする（案件指定があれば従う）

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "endOfLine": "lf"
}
```

- `.prettierignore` も合わせて作成し、ビルド生成物やベンダーコードを除外する

```
dist/
node_modules/
*.min.js
vendor/
```

- SCSS/HTMLもPrettierの対象に含めてよいが、既存の手書きインデントルールと衝突する場合は「JS/CSSのみ対象にし、HTMLは対象外にする」等、範囲を絞る提案をする

## 2. ESLintの設定方針

- インストール（Flat Config系。ESLint v9以降が現在の標準。下記コード例で使うパッケージも一緒に入れる）:
  ```
  npm install --save-dev eslint @eslint/js globals eslint-config-prettier
  ```
- 設定ファイルは `eslint.config.js`（Flat Config）で作成する。ESLintのバージョンによって書式が変わるため、**導入時点でnpmのインストールバージョンを確認し、v8以前の`.eslintrc`形式が必要な場合はその旨を明示してから合わせる**
- vanilla JS + WordPress案件向けの既定ルール方針:
  - `no-unused-vars`, `no-undef` はerror
  - WordPressのグローバル変数（`wp`, `jQuery`, `ajaxurl`等）を使う場合は `globals` パッケージまたは環境設定でグローバル宣言し、`no-undef`の誤検知を防ぐ
  - フォーマット関連のルール（インデント・クォート等）はPrettierに任せ、ESLint側では重複させない（`eslint-config-prettier`を併用し、競合するルールを無効化する）

```js
// eslint.config.js の例（Flat Config / ESLint v9系）
import js from '@eslint/js';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        wp: 'readonly',
        jQuery: 'readonly',
        ajaxurl: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'warn',
      // js-implementation-standardの手書きルールを機械的に担保する
      'no-var': 'error',        // varは使わない
      'prefer-const': 'error',  // 再代入しない変数はconst
      eqeqeq: 'error',          // 厳密等価（===）を使う
    },
  },
  eslintConfigPrettier,
];
```

- 上記コード例は目安であり、**ESLint/プラグインのバージョンによってAPIが変わることがあるため、案件で実際にインストールされているバージョンに応じて必ずWeb検索で最新の設定方法を確認してから確定させる**

## 3. Stylelint（SCSSの検査・任意）

PrettierはSCSSを「整形」するだけで「検査」はしない。SCSS主体の案件で品質チェックまで自動化したい場合は、Stylelintの導入を提案してよい（必須ではない。まず提案し、承諾を得てから設定する）。

- インストール: `npm install --save-dev stylelint stylelint-config-standard-scss`
- `coding-standard`のFLOCSS命名をクラスセレクタのパターン検査で機械的に担保できるのが導入の主なメリット

```json
// .stylelintrc.json の例
{
  "extends": ["stylelint-config-standard-scss"],
  "rules": {
    "selector-class-pattern": [
      "^(l|c|p|u|is|js)-[a-z0-9]+(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$",
      { "message": "FLOCSS命名（l-/c-/p-/u- + BEM）に従ってください（coding-standard参照）" }
    ]
  }
}
```

- Prettierとの競合ルールは近年のstylelint-config-standardでは基本的に排除済みだが、警告が競合する場合は`stylelint-config-prettier-scss`等の併用をWeb検索で確認する

## 4. package.jsonへのスクリプト追加

導入時は、手動実行しやすいようnpm scriptsも一緒に用意する。

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

## 5. エディタ連携（保存時の自動整形）

Cursor/VS Code系での`.vscode/settings.json`の例も、必要に応じて併せて提示する（プロジェクト単位で共有したい場合）。

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

拡張機能（Prettier、ESLint）のインストールが前提になる旨を伝える。

## 6. コミットとの連携（任意）

コミット前に自動フォーマット・Lintを走らせたい場合、`husky` + `lint-staged`の導入を提案してよい。ただし、これは案件の要望や`git-workflow`スキルの運用ルールと矛盾しないか確認してから導入する（過剰な自動化を望まないケースもあるため、まず提案し、承諾を得てから設定ファイルを作成する）。

## 7. 既存コードベースへ後から導入する場合（後入れ手順）

- 初回の一括フォーマット（`prettier --write .`）は差分が巨大になるため、**機能変更のコミットと絶対に混ぜず、「フォーマット適用のみ」の単独コミットにする**（あとから変更履歴を追えなくなるのを防ぐ。コミットの切り方は`git-workflow`参照）
- 手順の目安: ①設定ファイル追加をコミット → ②一括フォーマットを単独コミット → ③以降は保存時整形で運用
- ESLintのエラーが大量に出る場合は、一気に直さずルールを段階的に有効化する（まず`warn`で入れて実態を把握 → 修正 → `error`へ）

### PHPの扱い（対象外の明示）

- Prettier/ESLintはWordPressのPHPファイルを対象にしない。PHPの書き方はWPCS準拠（`wordpress-development`参照）とし、機械検査まで必要な場合はPHP_CodeSniffer（phpcs + WPCSルールセット）の導入を別途検討する（導入方法はその時点でWeb検索で確認する）

## 8. 出力形式

- 設定ファイル（`.prettierrc.json`, `.prettierignore`, `eslint.config.js`, package.jsonへの追記内容）を実際に作成する
- 案件で採用しているルールが既定値と異なる場合（例: セミコロンなし運用、シングルクォートでなくダブルクォート運用等）は、その場で確認してから値を調整する
- Prettier/ESLintそれぞれのバージョンに依存する設定書式（特にESLintのFlat Config移行まわり）は情報が変化しやすいため、確信が持てない場合は必ず一言断ってからWeb検索で確認する
