"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLineForAnalysis = normalizeLineForAnalysis;
// utils/normalizeUtils.ts
const commentRegex = /#.*/;
const isNumberToken = (tok) => {
    // 1. '' で囲まれていたら無条件で数値扱い（arg）
    if (tok.startsWith("'") && tok.endsWith("'")) {
        return true;
    }
    // 2. 本来の数値の判定
    return /^(?:\$[0-9A-Fa-f]+|\d+)$/.test(tok);
};
// レジスタ
const registers = ['AC', 'WA', 'B', 'X'];
/**
 * アセンブリ1行を命令解析用に正規化
 * - コメント削除
 * - カンマ→空白
 * - 連続空白→1つ
 * - 数値 → 'arg'
 * - レジスタ以外の英字トークン → 'label' に変換
 * - 行頭のラベル定義(LABEL:)は削除
 */
function normalizeLineForAnalysis(raw) {
    let code = raw;
    // コメント削除
    const cmt = commentRegex.exec(code);
    if (cmt)
        code = code.substring(0, cmt.index);
    // カンマ→空白、連続空白→1つ
    code = code.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    // 行頭のラベル定義を削除
    code = code.replace(/^[A-Za-z_][A-Za-z0-9_]*:/, '').trim();
    //  正規化
    const parts = code.split(/\s+/);
    if (parts.length > 1) {
        const mnemonic = parts[0];
        const rest = parts
            .slice(1)
            .map(tok => {
            const paren1 = tok.match(/^\(\(([^()]+)\)\)$/);
            const paren2 = tok.match(/^\((.*)\)$/);
            // 括弧を考慮して処理
            if (paren1) {
                const inner = paren1[1].trim();
                if (registers.includes(inner))
                    return tok;
                if (isNumberToken(inner))
                    return `((arg))`;
                return '((label))';
            }
            else if (paren2) {
                const inner = paren2[1].trim();
                if (registers.includes(inner))
                    return tok;
                if (isNumberToken(inner))
                    return `(arg)`;
                return '(label)';
            }
            else {
                if (registers.includes(tok))
                    return tok; // レジスタチェック
                if (isNumberToken(tok))
                    return 'arg'; // 数値は arg   
                return 'label'; // その他始まりは label
            }
        })
            .join(' ');
        code = `${mnemonic} ${rest}`;
    }
    return code.trim();
}
//# sourceMappingURL=normalizeUtils.js.map