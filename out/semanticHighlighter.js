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
exports.VProcSemanticProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const iconv = __importStar(require("iconv-lite"));
class VProcSemanticProvider {
    constructor() {
        this.legend = new vscode.SemanticTokensLegend(['mnemonic']);
    }
    getLegend() {
        return this.legend;
    }
    async provideDocumentSemanticTokens(document, token) {
        const builder = new vscode.SemanticTokensBuilder(this.legend);
        // 現在のアセンブリファイルのディレクトリ
        const dir = path.dirname(document.uri.fsPath);
        // 同じフォルダにある basic.opt ファイルを探す
        const optFile = fs.readdirSync(dir).find(f => f === "basic.opt");
        if (!optFile)
            return builder.build();
        const optPath = path.join(dir, optFile);
        // 命令定義ファイル読み込み
        const sjisBuffer = fs.readFileSync(optPath);
        const content = iconv.decode(sjisBuffer, 'shift_jis');
        const instructions = content
            .split(/\r?\n/) // 行ごとに分割
            .map(s => s.trimEnd()) // 行末の改行や空白だけ削除
            .filter(s => s.length > 0 && /^[^\s#]/.test(s)) // 行頭が空白でも # でもない行を抽出
            .map(s => s.replace(/,/g, ' ').replace(/\s+/g, ' ')); // カンマ→空白 & 連続空白を1つに
        if (instructions.length === 0)
            return builder.build();
        const regex = new RegExp(`\\b(${instructions.join('|')})\\b`, 'g');
        // アセンブリファイルの全行をスキャン
        for (let line = 0; line < document.lineCount; line++) {
            const text = document.lineAt(line).text;
            const match = regex.exec(text); //定義されている命令が行に含まれているか(例."LD AC B")
            if (match) {
                const mnemonic = match[0].split(/\s+/)[0]; //ニーモニックを抽出
                const start = match.index;
                const length = mnemonic.length;
                builder.push(line, start, length, 0, 0);
            }
        }
        return builder.build();
    }
}
exports.VProcSemanticProvider = VProcSemanticProvider;
//# sourceMappingURL=semanticHighlighter.js.map