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
exports.asmHoverProvider = void 0;
// providers/LabelHoverProvider.ts
const vscode = __importStar(require("vscode"));
const labelUtils_1 = require("../utils/labelUtils");
const normalizeUtils_1 = require("../utils/normalizeUtils");
const opsLoader_1 = require("../utils/opsLoader");
const staticHoverInfo = {
    AC: "アキュムレータ(8ビット)\n\nALU(算術論理装置)による8ビット演算結果が格納される。 ALUの左入力として使用される。",
    WA: "ワイドアキュムレータ(16ビット)\n\nALU(算術論理装置)による16ビット演算結果が格納される。ALUの左入力として使用される。\n\nインクリメント(値を1増加)およびデクリメント(値を1減少)機能がある。ただし、インクリメント、デクリメントはALUを使用せず、フラグも変化しない。",
    X: "汎用レジスタ(16ビット)\n\n任意の16ビットのデータを記憶する。\n\nインクリメント(値を1増加)およびデクリメント(値を1減少)機能がある。ただし、インクリメント、デクリメントはALUを使用せず、フラグも変化しない。",
    B: "汎用レジスタ(8ビット)\n\nインクリメント(値を1増加)およびデクリメント(値を1減少)機能がある。ただし、インクリメント、デクリメントはALUを使用せず、フラグも変化しない。",
    org: "org <メモリアドレス>\n\norg命令以下の命令を格納するアドレスを、オペランドで指定したメモリアドレス以降にする。\n\nつまり、orgの直後の命令(疑似命令を含む)は、指定したメモリアドレスに格納される。",
    db: "db <数値>\n\nオペランドで指定した数値を1バイトのデータとしてメモリに格納する。\n\norg疑似命令と組み合わせることで、任意のメモリアドレスに任意のデータをプログラムの一部として書き込むことができる。",
    dw: "dw <数値>\n\nオペランドで指定した数値を2バイトのデータとしてメモリに格納する。\n\norg先のメモリアドレスに上位1バイト、次(+1)のメモリアドレスに下位1バイトが格納される。"
};
class asmHoverProvider {
    provideHover(document, position, token) {
        const range = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
        if (!range)
            return;
        const word = document.getText(range);
        // 静的 hover（レジスタなど）
        if (staticHoverInfo[word]) {
            return new vscode.Hover(`${staticHoverInfo[word]}`);
        }
        // コメントマップ取得
        const labelComments = (0, labelUtils_1.collectLabelComments)(document);
        if (labelComments[word]) {
            const comment = labelComments[word] || "(no comment)";
            return new vscode.Hover(`${comment}`);
        }
        // アセンブリファイルのその行を取得し、正規化
        const lineText = document.lineAt(position.line).text;
        const normalized = (0, normalizeUtils_1.normalizeLineForAnalysis)(lineText);
        const tokens = normalized.split(/\s+/);
        const mnemonicInLine = tokens[0];
        if (word !== mnemonicInLine) {
            return; // ← ここで命令hoverを無効化
        }
        const instructions = (0, opsLoader_1.getCachedInstructions)();
        const instructionsComments = (0, opsLoader_1.getInstructionComments)();
        const idx = instructions.findIndex(line => line === normalized);
        if (idx >= 0) {
            const comment = instructionsComments[idx];
            if (comment != '')
                return new vscode.Hover(`${normalized}\n\n${comment}`);
        }
        // const comment = comments[word] || "(no comment)";
        // return new vscode.Hover(
        //   `${comment}`
        // );
    }
}
exports.asmHoverProvider = asmHoverProvider;
//# sourceMappingURL=asmHoverProvider.js.map