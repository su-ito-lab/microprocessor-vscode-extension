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
exports.LabelCompletionProvider = void 0;
const vscode = __importStar(require("vscode"));
const labelUtils_1 = require("../utils/labelUtils");
class LabelCompletionProvider {
    provideCompletionItems(document, position) {
        const lineBeforeCursor = document.lineAt(position.line).text.substring(0, position.character);
        if (lineBeforeCursor.includes('#')) {
            return [];
        }
        const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
        const prefix = wordRange ? document.getText(wordRange) : '';
        return [...(0, labelUtils_1.collectDefinedLabels)(document)]
            .filter(label => label.startsWith(prefix))
            .map(label => {
            const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Reference);
            item.insertText = label;
            item.detail = '定義済みラベル';
            return item;
        });
    }
}
exports.LabelCompletionProvider = LabelCompletionProvider;
//# sourceMappingURL=CompletionProvider.js.map