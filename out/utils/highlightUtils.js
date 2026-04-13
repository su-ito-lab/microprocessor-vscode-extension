"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.highlightLine = highlightLine;
const normalizeUtils_1 = require("./normalizeUtils");
function highlightLine(raw_text, line, builder, labelRegex, mnemonicRegex, PseRegex, regRegex, commentRegex, cachedInstructions) {
    const tokens = [];
    const lineLen = raw_text.length;
    // 正規表現リセット
    if (labelRegex)
        labelRegex.lastIndex = 0;
    mnemonicRegex.lastIndex = 0;
    PseRegex.lastIndex = 0;
    regRegex.lastIndex = 0;
    commentRegex.lastIndex = 0;
    // インポートチェック
    const importMatch = raw_text.match(/^#import\b/);
    if (importMatch) {
        // ---- #import を push ----
        // console.log('importMatch');
        const importStart = raw_text.indexOf("#import");
        tokens.push({
            start: importStart,
            length: 7, // "#import".length
            type: 5,
            mod: 0
        });
        const quotedMatch = raw_text.match(/["']([^"']+)["']/);
        if (quotedMatch) {
            const inner = quotedMatch[1]; // basic.ops
            const innerStart = raw_text.indexOf(inner); // 文字列の中身の開始位置
            if (innerStart >= 0) {
                tokens.push({
                    start: innerStart - 1,
                    length: inner.length + 2,
                    type: 6, // ← string 用 tokenType（legendに追加）
                    mod: 0
                });
            }
        }
        for (const t of tokens) {
            builder.push(line, t.start, t.length, t.type, t.mod);
        }
        return;
    }
    // --- コメント検出とハイライト ---
    const commentMatch = commentRegex.exec(raw_text);
    let codePart = raw_text;
    if (commentMatch) {
        const start = commentMatch.index;
        const length = commentMatch[0].length;
        // tokens.push({ start, length, type: 2, mod: 0 }); // type=2 → comment
        // コメントより前の部分だけ解析対象にする
        codePart = raw_text.substring(0, start);
    }
    // --- ラベルハイライト ---
    if (labelRegex) {
        let labelMatch;
        while ((labelMatch = labelRegex.exec(codePart)) !== null) {
            tokens.push({ start: labelMatch.index, length: labelMatch[1].length, type: 1, mod: 0 });
        }
    }
    // 数値
    const numRegex = /(?<![A-Za-z_])(?:\$[0-9A-Fa-f]+|\d+)\b/g;
    let numMatch;
    while ((numMatch = numRegex.exec(codePart))) {
        tokens.push({ start: numMatch.index, length: numMatch[0].length, type: 4, mod: 0 });
    }
    // 正規化されたコードを取得
    const normalized = (0, normalizeUtils_1.normalizeLineForAnalysis)(codePart);
    // ニーモニック判定
    let match = cachedInstructions.includes(normalized);
    if (match) {
        const mnemonic = normalized.split(/\s+/)[0];
        const start = raw_text.indexOf(mnemonic);
        tokens.push({ start, length: mnemonic.length, type: 0, mod: 0 });
    }
    else {
        const PseMatch = PseRegex.exec(normalized);
        if (PseMatch) {
            const mnemonic = PseMatch[0].split(/\s+/)[0];
            const start = raw_text.indexOf(mnemonic);
            tokens.push({ start, length: mnemonic.length, type: 0, mod: 0 });
        }
    }
    // レジスタ
    let regMatch;
    while ((regMatch = regRegex.exec(codePart))) {
        tokens.push({ start: regMatch.index, length: regMatch[1].length, type: 3, mod: 0 });
    }
    // ソート＆push
    tokens.sort((a, b) => a.start - b.start);
    for (const t of tokens) {
        // 前後に ' がついていたら semanticハイライトしない
        const before = codePart[t.start - 1];
        const after = codePart[t.start + t.length];
        if (before === "'" && after === "'")
            continue;
        builder.push(line, t.start, t.length, t.type, t.mod);
    }
}
//# sourceMappingURL=highlightUtils.js.map