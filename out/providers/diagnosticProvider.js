"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDiagnostics = updateDiagnostics;
exports.Diagnostics = Diagnostics;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const opsLoader_1 = require("../utils/opsLoader");
const labelUtils_1 = require("../utils/labelUtils");
const normalizeUtils_1 = require("../utils/normalizeUtils");
const importLoader_1 = require("../utils/importLoader");
const commentRegex = /#.*/;
async function updateDiagnostics(document, collection) {
    if (document.languageId !== 'vprocasm')
        return;
    const dir = path.dirname(document.uri.fsPath);
    const opsFile = (0, importLoader_1.findImportOpsInAsm)(document);
    // if (document.getText().length === 0) {
    //     const diagnostic = new vscode.Diagnostic(
    //         new vscode.Range(0, 0, 0, 1),
    //         `画面右下のエンコーディングメニューが Shift JIS であることを確認してください。\nUTF-8 の場合は変更してください。`,
    //         vscode.DiagnosticSeverity.Warning
    //     );
    //     collection.set(document.uri, [diagnostic]);
    //     return;
    // }
    if (!opsFile) {
        const range = new vscode.Range(0, 0, 0, 1);
        collection.set(document.uri, [
            new vscode.Diagnostic(range, `読み込む命令定義ファイルが指定されていません。\n先頭に '#import "xxx.ops"' を追加してください。`, vscode.DiagnosticSeverity.Error)
        ]);
        return;
    }
    const opsPath = path.resolve(dir, opsFile);
    if (!fs.existsSync(opsPath)) {
        const range = new vscode.Range(0, 0, 0, 1);
        collection.set(document.uri, [
            new vscode.Diagnostic(range, `命令定義ファイル '${opsFile}' が見つかりません。`, vscode.DiagnosticSeverity.Error)
        ]);
        return;
    }
    const cachedInstructions = (0, opsLoader_1.getCachedInstructions)().length > 0
        ? (0, opsLoader_1.getCachedInstructions)()
        : (0, opsLoader_1.loadOpsFile)(opsPath);
    if (cachedInstructions.length === 0) {
        const range = new vscode.Range(0, 0, 0, 1);
        collection.set(document.uri, [
            new vscode.Diagnostic(range, `命令定義ファイル '${opsFile}' に命令がありません。`, vscode.DiagnosticSeverity.Error)
        ]);
        return;
    }
    const cachedMnemonics = (0, opsLoader_1.getCachedMnemonics)();
    const pseudoInstructions = ['org', 'db', 'dw'];
    const registers = ['AC', 'WA', 'B', 'X'];
    const definedLabels = (0, labelUtils_1.collectDefinedLabels)(document);
    const diagList = [];
    for (let i = 0; i < document.lineCount; i++) {
        const raw = document.lineAt(i).text;
        if (raw == "")
            continue;
        const normalized = (0, normalizeUtils_1.normalizeLineForAnalysis)(raw);
        const firstWord = normalized.split(/\s+/)[0];
        const hasMnemonic = cachedInstructions.some(inst => inst.startsWith(firstWord + ' ') || inst === firstWord);
        // console.log(`[debug]   hasMnemonic=${hasMnemonic}`);
        // --- 命令＋オペランド組み合わせ定義チェック ---
        const matched = cachedInstructions.some(inst => inst === normalized) ||
            pseudoInstructions.some(pse => normalized.startsWith(pse));
        if (!matched && normalized != "") {
            if (hasMnemonic) {
                const parts = normalized.split(/\s+/);
                const mnemonic = parts[0];
                // console.log(`[debug] line ${i}: normalized='${normalized}', mnemonic='${mnemonic}'`);
                // .opsの定義から、同じニーモニックで始まる行を取得
                const sameMnemonicDefs = cachedInstructions.filter(inst => inst.startsWith(mnemonic + ' ') || inst === mnemonic);
                // console.log(`[debug]   sameMnemonicDefs=`, sameMnemonicDefs);
                // 定義の中で、期待トークン数をすべて収集
                const expectedTokenCounts = sameMnemonicDefs.map(inst => inst.split(/\s+/).length);
                // 実際のトークン数
                const actualCount = parts.length;
                if (actualCount < expectedTokenCounts[0]) {
                    //オペランドの入力途中
                    const range = new vscode.Range(i, 0, i, raw.length);
                    diagList.push(new vscode.Diagnostic(range, `命令 '${firstWord}' にはオペランドが必要です`, vscode.DiagnosticSeverity.Warning));
                }
                else {
                    const range = new vscode.Range(i, 0, i, raw.length);
                    diagList.push(new vscode.Diagnostic(range, `未定義の命令: '${normalized}'`, vscode.DiagnosticSeverity.Error));
                }
            }
            else {
                const range = new vscode.Range(i, 0, i, raw.length);
                diagList.push(new vscode.Diagnostic(range, `未定義の命令: '${normalized}'`, vscode.DiagnosticSeverity.Error));
            }
        }
        let code = raw;
        // コメント削除
        const cmt = commentRegex.exec(code);
        if (cmt)
            code = code.substring(0, cmt.index);
        // 未定義ラベル参照チェック
        const refs = code.split(/[\s,]+/).filter(tok => /^[A-Za-z_][A-Za-z0-9_]*$/.test(tok) && // 英字で始まる単語
            !tok.endsWith(':') && // L0: のようなラベル定義除外
            !tok.startsWith('$') // $C0 のような16進数除外
        );
        for (const ref of refs) {
            if (ref.endsWith(':'))
                continue; //ラベル定義そのもの（例: L0:）は除外
            if (registers.includes(ref))
                continue; // レジスタ名は除外（AC, WA, B, X）
            if (pseudoInstructions.includes(ref))
                continue; // 疑似命令も除外
            const isKnown = cachedInstructions.some(inst => inst === ref || inst.startsWith(ref + ' ')); //ニーモニックも除外
            if (isKnown)
                continue;
            if (!definedLabels.has(ref)) {
                const start = code.indexOf(ref);
                const range = new vscode.Range(i, start, i, start + ref.length);
                diagList.push(new vscode.Diagnostic(range, `未定義のラベル '${ref}'`, vscode.DiagnosticSeverity.Error));
            }
        }
        // --- ラベル定義でレジスタ名やニーモニック名を使っていないかチェック ---
        if (code.includes(':')) {
            const labelPart = code.split(':')[0].trim(); // ":"より前の文字列を取得
            // console.log("label:", labelPart)
            if (registers.includes(labelPart)) {
                const start = code.indexOf(labelPart);
                const range = new vscode.Range(i, start, i, start + labelPart.length);
                diagList.push(new vscode.Diagnostic(range, `ラベルとしてレジスタ名'${labelPart}'を使用してはいけません`, vscode.DiagnosticSeverity.Error));
            }
            if (cachedMnemonics.includes(labelPart)) {
                const start = code.indexOf(labelPart);
                const range = new vscode.Range(i, start, i, start + labelPart.length);
                diagList.push(new vscode.Diagnostic(range, `ラベルとして命令ニーモニック名'${labelPart}'を使用してはいけません`, vscode.DiagnosticSeverity.Error));
            }
        }
    }
    collection.set(document.uri, diagList);
}
// ======================================================
// ★ Diagnostics(context) は Collection 作成だけ担当
// ======================================================
function Diagnostics(context) {
    const collection = vscode.languages.createDiagnosticCollection('vprocasm');
    context.subscriptions.push(collection);
    return collection;
}
//# sourceMappingURL=diagnosticProvider.js.map