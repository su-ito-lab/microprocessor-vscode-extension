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
exports.OpCompletionProvider = void 0;
const vscode = __importStar(require("vscode"));
const opsLoader_1 = require("../utils/opsLoader");
const labelUtils_1 = require("../utils/labelUtils");
const registers = ["AC", "WA", "B", "X"];
class OpCompletionProvider {
    provideCompletionItems(document, position) {
        // ---------------------------
        // カーソル手前を抽出
        // ---------------------------
        const line = document.lineAt(position.line).text;
        let beforeCursor = line.substring(0, position.character);
        beforeCursor = beforeCursor.replace(/^[A-Za-z_]\w*:\s*/, "");
        beforeCursor = beforeCursor.trim();
        beforeCursor = beforeCursor.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
        if (!beforeCursor)
            return;
        const prefix = this.getLastWord(beforeCursor);
        const cachedInstructions = (0, opsLoader_1.getCachedInstructions)();
        if (cachedInstructions.length === 0)
            return;
        const DefinedLabels = (0, labelUtils_1.collectDefinedLabels)(document);
        const items = [];
        // --- レジスタ（最優先：sortText = "0"） ---
        for (const r of registers) {
            if (r.startsWith(prefix)) {
                const item = new vscode.CompletionItem(r, vscode.CompletionItemKind.Variable);
                item.insertText = r;
                item.sortText = "0";
                item.detail = "レジスタ";
                items.push(item);
            }
        }
        // --- ラベル（二番目：sortText = "1"） ---
        for (const lab of DefinedLabels) {
            if (lab.startsWith(prefix)) {
                const item = new vscode.CompletionItem(lab, vscode.CompletionItemKind.Field);
                item.insertText = lab;
                item.sortText = "1";
                item.detail = "ラベル";
                items.push(item);
            }
        }
        // ===========================================================
        // ③ beforeCursor（行全体）で命令テンプレを前方一致抽出
        // ===========================================================
        for (const inst of cachedInstructions) {
            if (inst.startsWith(beforeCursor)) {
                const item = new vscode.CompletionItem(inst, vscode.CompletionItemKind.Snippet);
                // 挿入時だけ TAB に変換
                item.insertText = inst.replace(/\s+/g, '\t');
                item.sortText = "2"; // 最下位に表示
                item.detail = "定義済み命令";
                items.push(item);
            }
        }
        // --- すべての候補を返す ---
        return items;
    }
    getLastWord(text) {
        const match = text.trim().match(/([A-Za-z_][\w]*)$/);
        return match ? match[1] : " ";
    }
}
exports.OpCompletionProvider = OpCompletionProvider;
//# sourceMappingURL=opCompletionProvider.js.map