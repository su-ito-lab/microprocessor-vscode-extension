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
exports.VProcDefinitionProvider = void 0;
const vscode = __importStar(require("vscode"));
const opsLoader_1 = require("../utils/opsLoader");
const normalizeUtils_1 = require("../utils/normalizeUtils");
const labelUtils_1 = require("../utils/labelUtils");
class VProcDefinitionProvider {
    provideDefinition(document, position) {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange)
            return;
        const clickedWord = document.getText(wordRange);
        // クリックされた行の生テキスト
        const rawLine = document.lineAt(position.line).text;
        const normalized = (0, normalizeUtils_1.normalizeLineForAnalysis)(rawLine);
        const mnemonic = normalized.trim().split(/\s+/)[0];
        if (clickedWord === mnemonic) {
            const instructions = (0, opsLoader_1.getCachedInstructions)();
            if (!instructions || instructions.length === 0)
                return;
            const lineNumbers = (0, opsLoader_1.getInstructionLineNumbers)();
            if (!lineNumbers || lineNumbers.length === 0)
                return;
            const idx = instructions.findIndex(line => line === normalized);
            if (idx >= 0) {
                const opsLine = lineNumbers[idx];
                const opsPath = (0, opsLoader_1.getOpsFilePath)();
                if (!opsPath)
                    return;
                return new vscode.Location(vscode.Uri.file(opsPath), new vscode.Position(opsLine, 0));
            }
        }
        // ===== ラベル → 同一 asm 内の定義箇所ジャンプ =====
        const labelDefs = (0, labelUtils_1.collectLabelDefinitions)(document);
        const defPos = labelDefs.get(clickedWord);
        if (!defPos)
            return;
        return new vscode.Location(document.uri, defPos);
    }
}
exports.VProcDefinitionProvider = VProcDefinitionProvider;
//# sourceMappingURL=DefinitionProvider.js.map