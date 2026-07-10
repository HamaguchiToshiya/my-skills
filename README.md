# my-skills

Web制作業務用 Custom Skills 群の正本リポジトリ + 自動更新パイプライン（skill-auto-update-pipeline）。

## 構成

```
skills/           全Custom Skill（ここが正本。claude.aiへは手動で再アップロード）
pipeline-state/   パイプラインの状態（トピック周期・収集済みURL・却下リスト）
proposals/        提案書の保管場所（実行日ごと）
CLAUDE.md         Claude Code向けのパイプライン実行手順
PIPELINE_SPEC.md  仕様書 v1.0
CHANGELOG.md      承認済み変更の履歴
```

## 初回セットアップ（PowerShell）

```powershell
# 1. 解凍したフォルダへ移動
cd my-skills

# 2. Git初期化(このフォルダをリポジトリにする)
git init

# 3. 全ファイルをステージ(コミット対象に登録)
git add .

# 4. 最初のコミット(スナップショットを記録)
git commit -m "init: skill群の正本化とパイプライン導入(承認済み変更6件適用済み)"

# 5. GitHubで空リポジトリ my-skills を作成後、紐付けてpush(アップロード)
git remote add origin https://github.com/HamaguchiToshiya/my-skills.git
git branch -M main
git push -u origin main
```

## 運用

- **定期実行**: Claude Code / Cowork のスケジュール実行で週1回、CLAUDE.md の手順に沿って収集〜PR作成まで自動実行
- **承認**: 上がってきたPRをレビューしてマージ(=承認)。却下ならPRをクローズ
- **claude.aiへの反映**: マージ後、更新されたSKILL.mdをclaude.aiのSkill設定に再アップロード
- **手動実行**: Claude Codeで「パイプラインを今すぐ実行して」でも動く

## 注意

- skills/ 配下はこのリポジトリが正本。claude.ai側だけを直接編集しない(乖離のもと)
- パイプラインがSKILL.mdをmainで直接書き換えることはない(必ずPR経由・人間承認)
