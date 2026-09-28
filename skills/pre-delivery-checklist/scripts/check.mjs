#!/usr/bin/env node
/**
 * 納品前 機械チェックスクリプト（依存パッケージなし / Node 18+）
 *
 * 使い方:
 *   node ~/.claude/skills/pre-delivery-checklist/scripts/check.mjs <対象ディレクトリ> [--json]
 *
 * 検査対象:
 *   HTML: alt欠落 / title・meta description・OGP欠落 / noindex残り /
 *         target="_blank"のrel漏れ / html lang属性欠落 / 見出し階層飛び /
 *         h1の個数（0個・2個以上） / ダミーテキスト / TODO・作業メモコメント /
 *         imgのwidth・height欠落 / favicon /
 *         autoplay の <video> の muted・playsinline 欠落 /
 *         インライン<script>内の console.log・debugger
 *   JS  : console.log / debugger の残り（.js / .mjs のみ）
 *   PHP : var_dump / print_r の残り、WP_DEBUG true（WP_DEBUG検査は wp-config.php のみ）
 *         （PHPファイルにはHTMLの検査も適用する = テンプレート想定。
 *           インライン<script>のデバッグコードはHTML検査側が検出する）
 *   画像: 300KB超の重い画像、WebP未変換の大きなJPG/PNG
 *
 * 実装挙動（この一覧が機械検出項目の正。実装を変えたらここも同時に更新する）:
 *   - 対象拡張子: .html/.htm（HTML検査）, .js/.mjs（JS検査）, .php（PHP+HTML検査）,
 *     .jpg/.jpeg/.png/.gif/.webp/.avif（画像検査）。それ以外は検査しない
 *   - 除外ディレクトリ: node_modules / .git / dist / vendor / .cache
 *     （dist を検査しない設計 = ビルド前の src 側に対して実行する）
 *   - *.min.js はJS検査をスキップ
 *   - <html> タグを含まない断片HTML（パーツ/テンプレ断片）は head 系チェック
 *     （title / meta description / OGP / noindex / favicon / lang / h1=0個）をスキップ
 *   - noindex はファイル名が thanks / complete / sanks を含むか、ページ内に
 *     マーカーコメント <!-- noindex: intended --> がある場合は想定内として INFO に格下げ
 *     （フォーム送信完了ページは boilerplate-pages の規約で noindex 必須のため）
 *   - console 検出は console.log / console.debug / console.table の3種
 *
 * 終了コード: エラーあり=1 / なし=0（警告のみなら0）
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";

const targetDir = process.argv[2];
const asJson = process.argv.includes("--json");

if (!targetDir || targetDir.startsWith("-")) {
  console.error("使い方: node ~/.claude/skills/pre-delivery-checklist/scripts/check.mjs <対象ディレクトリ> [--json]");
  process.exit(2);
}
if (!existsSync(targetDir) || !statSync(targetDir).isDirectory()) {
  console.error(`対象ディレクトリが見つからない: ${targetDir}（実在するフォルダ名を指定する）`);
  process.exit(2);
}

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "vendor", ".cache"]);
const IMG_SIZE_LIMIT = 300 * 1024; // 300KB
const results = []; // { level: "error"|"warn"|"info", file, line, rule, message }

function add(level, file, line, rule, message) {
  results.push({ level, file: relative(process.cwd(), file), line, rule, message });
}

// --- ファイル収集 -----------------------------------------------------------
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else acc.push({ path: p, size: st.size });
  }
  return acc;
}

// 行番号を取得（マッチ位置から算出）
function lineOf(src, index) {
  return src.slice(0, index).split("\n").length;
}

// --- HTMLチェック -----------------------------------------------------------
function checkHtml(file, src) {
  const isFragment = !/<html[\s>]/i.test(src); // パーツ/テンプレ断片はhead系チェックを緩める

  // タグ単位の検査用: PHPブロック（<?php … ?> / <?= … ?>）を同じ長さの空白に置き換える。
  // 属性値の中の `?>` で `[^>]*` が途切れ、alt / width / rel が「無い」と誤検出されるのを防ぐ（位置と行番号は保たれる）
  const tagSrc = src.replace(/<\?(?:php|=)[\s\S]*?\?>/gi, (php) => php.replace(/[^\n]/g, " "));

  // img タグ検査
  for (const m of tagSrc.matchAll(/<img\b[^>]*>/gis)) {
    const tag = m[0];
    const line = lineOf(src, m.index);
    if (!/\balt\s*=/i.test(tag)) {
      add("error", file, line, "img-alt", "alt属性がない（装飾画像でも alt=\"\" が必要）");
    }
    if (!/\bwidth\s*=/i.test(tag) || !/\bheight\s*=/i.test(tag)) {
      add("warn", file, line, "img-size", "width/height 指定なし（CLSの原因。CSSでaspect-ratio指定済みなら無視可）");
    }
  }

  // 自動再生動画の必須属性（muted が無いと再生がブロックされ、playsinline が無いと iOS で全画面に飛ぶ）
  for (const m of tagSrc.matchAll(/<video\b[^>]*\bautoplay\b[^>]*>/gis)) {
    const missing = ["muted", "playsinline"].filter((attr) => !new RegExp(`\\b${attr}\\b`, "i").test(m[0]));
    if (missing.length > 0) {
      add("error", file, lineOf(src, m.index), "video-autoplay", `autoplay の <video> に ${missing.join(" / ")} 属性がない（iPhoneで再生されない・全画面に飛ぶ）`);
    }
  }

  // target="_blank" の rel 漏れ
  for (const m of tagSrc.matchAll(/<a\b[^>]*target\s*=\s*["']_blank["'][^>]*>/gis)) {
    if (!/\brel\s*=\s*["'][^"']*noopener/i.test(m[0])) {
      add("error", file, lineOf(src, m.index), "blank-noopener", 'target="_blank" に rel="noopener" がない');
    }
  }

  // 見出し階層
  const headings = [...src.matchAll(/<h([1-6])\b/gi)];
  const h1Count = headings.filter((h) => h[1] === "1").length;
  if (!isFragment && h1Count === 0) add("warn", file, 1, "heading-h1", "h1 が見つからない");
  if (h1Count > 1) add("warn", file, 1, "heading-h1", `h1 が ${h1Count} 個ある`);
  let prev = 0;
  for (const h of headings) {
    const lv = Number(h[1]);
    if (prev > 0 && lv > prev + 1) {
      add("warn", file, lineOf(src, h.index), "heading-skip", `見出しレベルが h${prev} → h${lv} に飛んでいる`);
    }
    prev = lv;
  }

  // ダミーテキスト
  for (const m of src.matchAll(/(テキストが入ります|ダミーテキスト|Lorem ipsum|ここに文章)/gi)) {
    add("error", file, lineOf(src, m.index), "dummy-text", `ダミーテキストの消し忘れ: "${m[0]}"`);
  }

  // 作業メモっぽいコメント
  for (const m of src.matchAll(/<!--\s*(TODO|FIXME|あとで|仮(?!登録|予約|会員|設定|払|契約|押さえ))[\s\S]*?-->/gi)) {
    add("warn", file, lineOf(src, m.index), "todo-comment", "作業メモのコメントが残っている");
  }

  // インライン<script>内のデバッグコード
  for (const m of src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = m[1];
    if (/console\.(log|debug|table)\s*\(/.test(body)) {
      add("warn", file, lineOf(src, m.index), "console-log", "インラインscriptに console.log 等が残っている");
    }
    if (/\bdebugger\b/.test(body)) {
      add("error", file, lineOf(src, m.index), "debugger", "インラインscriptに debugger が残っている");
    }
  }

  if (isFragment) return;

  // head 系（フルHTMLのみ）
  if (!/<title\b[^>]*>\s*\S/i.test(src)) add("error", file, 1, "meta-title", "title が空か存在しない");
  if (!/<meta\s[^>]*name\s*=\s*["']description["']/i.test(src)) add("error", file, 1, "meta-description", "meta description がない");
  if (!/<meta\s[^>]*property\s*=\s*["']og:title["']/i.test(src)) add("warn", file, 1, "ogp", "og:title がない（OGP未設定の可能性）");
  if (!/<meta\s[^>]*property\s*=\s*["']og:image["']/i.test(src)) add("warn", file, 1, "ogp", "og:image がない");
  if (/<meta\s[^>]*content\s*=\s*["'][^"']*noindex/i.test(src)) {
    // フォーム送信完了ページ等、規約上 noindex 必須のページは想定内（boilerplate-pages 参照）
    const intended = /thanks|complete|sanks/i.test(file) || /<!--\s*noindex:\s*intended\s*-->/i.test(src);
    if (intended) add("info", file, 1, "noindex", "noindex あり（完了ページ等の想定内。公開対象ページなら要確認）");
    else add("warn", file, 1, "noindex", "noindex が残っている（本番公開前に要確認）");
  }
  if (!/<link\s[^>]*rel\s*=\s*["'][^"']*icon/i.test(src)) add("warn", file, 1, "favicon", "favicon の link がない");
  if (!/<html\s[^>]*lang\s*=/i.test(src)) add("warn", file, 1, "html-lang", '<html> に lang 属性がない（lang="ja"）');
}

// --- JSチェック -------------------------------------------------------------
function checkJs(file, src) {
  if (/\.min\.js$/.test(file)) return;
  for (const m of src.matchAll(/console\.(log|debug|table)\s*\(/g)) {
    add("warn", file, lineOf(src, m.index), "console-log", `console.${m[1]} が残っている`);
  }
  for (const m of src.matchAll(/\bdebugger\b/g)) {
    add("error", file, lineOf(src, m.index), "debugger", "debugger 文が残っている");
  }
}

// --- PHPチェック（WordPress） -----------------------------------------------
function checkPhp(file, src) {
  for (const m of src.matchAll(/\b(var_dump|print_r)\s*\(/g)) {
    add("error", file, lineOf(src, m.index), "php-debug", `${m[1]}() が残っている`);
  }
  if (/wp-config\.php$/.test(file) && /define\s*\(\s*['"]WP_DEBUG['"]\s*,\s*true\s*\)/.test(src)) {
    add("error", file, 1, "wp-debug", "WP_DEBUG が true（本番では false にする）");
  }
}

// --- 画像チェック -------------------------------------------------------------
function checkImage(f) {
  const ext = extname(f.path).toLowerCase();
  if (f.size > IMG_SIZE_LIMIT) {
    add("warn", f.path, null, "img-heavy", `${Math.round(f.size / 1024)}KB（300KB超。圧縮/リサイズ推奨）`);
  }
  if ([".jpg", ".jpeg", ".png"].includes(ext) && f.size > 100 * 1024) {
    add("warn", f.path, null, "img-webp", "WebP変換を検討（picture+sourceでフォールバック）");
  }
}

// --- 実行 ---------------------------------------------------------------------
const files = walk(targetDir);
for (const f of files) {
  const ext = extname(f.path).toLowerCase();
  try {
    if ([".html", ".htm"].includes(ext)) checkHtml(f.path, readFileSync(f.path, "utf8"));
    else if ([".js", ".mjs"].includes(ext)) checkJs(f.path, readFileSync(f.path, "utf8"));
    else if (ext === ".php") {
      const src = readFileSync(f.path, "utf8");
      checkPhp(f.path, src);
      checkHtml(f.path, src); // テーマファイル内のHTMLも検査（インラインscriptのデバッグコードはここで検出）
    } else if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"].includes(ext)) {
      checkImage(f);
    }
  } catch (e) {
    add("warn", f.path, null, "read-error", `読み込み失敗: ${e.message}`);
  }
}

// --- 出力 ---------------------------------------------------------------------
const errors = results.filter((r) => r.level === "error");
const warns = results.filter((r) => r.level === "warn");
const infos = results.filter((r) => r.level === "info");

if (asJson) {
  console.log(JSON.stringify({ errors: errors.length, warnings: warns.length, infos: infos.length, results }, null, 2));
} else {
  for (const r of results) {
    const loc = r.line ? `${r.file}:${r.line}` : r.file;
    console.log(`[${r.level.toUpperCase()}] ${loc}  (${r.rule})  ${r.message}`);
  }
  console.log(`\n---- 検査ファイル数: ${files.length} / エラー: ${errors.length} / 警告: ${warns.length} / 情報: ${infos.length} ----`);
}

process.exit(errors.length > 0 ? 1 : 0);
