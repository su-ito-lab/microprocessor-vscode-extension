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
exports.opsHoverProvider = void 0;
const vscode = __importStar(require("vscode"));
const staticHoverInfo = {
    AC: "アキュムレータ(8ビット)\n\nALU(算術論理装置)による8ビット演算結果が格納される。 ALUの左入力として使用される。",
    WA: "ワイドアキュムレータ(16ビット)\n\nALU(算術論理装置)による16ビット演算結果が格納される。ALUの左入力として使用される。\n\nインクリメント(値を1増加)およびデクリメント(値を1減少)機能がある。ただし、インクリメント、デクリメントはALUを使用せず、フラグも変化しない。",
    X: "汎用レジスタ(16ビット)\n\n任意の16ビットのデータを記憶する。\n\nインクリメント(値を1増加)およびデクリメント(値を1減少)機能がある。ただし、インクリメント、デクリメントはALUを使用せず、フラグも変化しない。",
    B: "汎用レジスタ(8ビット)\n\nインクリメント(値を1増加)およびデクリメント(値を1減少)機能がある。ただし、インクリメント、デクリメントはALUを使用せず、フラグも変化しない。",
    PC: "プログラムカウンタ(16ビット)\n\n次に実行する命令を読み出すメモリアドレスが記録されている。\n\nアドレス相対ジャンプのための加算機能がある。 インクリメント(値を1増加)機能がある。",
    IR: "命令レジスタ(8ビット)\n\nメモリから読み出した命令コードが記録されている。",
    MAR: "メモリアドレスレジスタ(16ビット)\n\nメモリに与えるアドレスデータを格納する。\n\nインクリメント(値を1増加)機能がある。",
    MDR: "メモリデータレジスタ(8ビット)\n\nメモリからのデータ読み出しでは、メモリから読み出したデータが格納される。 メモリへのデータ書き込みでは、メモリに書き込むデータをMDRに格納してからメモリ書き込み信号を与える。",
    MDRH: "メモリデータレジスタ(8ビット)\n\nMDRWの上位8ビットに対応するレジスタである。MDRから値を転送して保存することが可能であり、MDRH単独で8ビットデータを読み出すことはできない。",
    MDRW: "メモリデータレジスタ(16ビット)\n\nMDRWは16ビットデータを読み出すことだけが可能な仮想レジスタであり、実際に16ビットレジスタが存在するのではない。\n\nMDRWの値を参照(読み出す)場合、上位8ビットはMDRHの値、下位8ビットはMDRの値が使用される。",
    S: "符号フラグ(1ビット)\n\nALUによる演算結果のMSBが'1'の場合にセット(値1が代入)され、MSBが'0'の 場合にリセット(値0が代入)される。\n\n2の補数表現を用いた符号つきデータの場合はMSBは符号ビットとなるので、Sの値によって演算結果の符号(正またはゼロか、負か)を知ることができる。",
    C: "桁上げフラグ(1ビット)\n\nALUによる加算が桁上げ(carry)を起こした場合、および減算が桁借り(borrow)を起こした場合にセット(値1が代入)される。 また、ALUによるシフト操作により、データのMSBまたはLSBが代入される。",
    Z: "ゼロフラグ(1ビット)\n\nALUによる演算結果がゼロとなる場合にセット(値1が代入)される。それ以外では、リセット(値0が代入)される。",
    H: "停止フラグ(1ビット)\n\nプロセッサの命令実行/停止の状態を制御する。Hの値が1の場合はプロセッサは停止し、次に実行すべき命令の読み出しを行わない。",
    WR: "メモリ制御信号\n\nWR=0のとき読み出し動作、WR=1のとき書き込み動作を行う。\n\nただしWR = 0は省略できる。",
    mem: "レジスタMARの内容をアドレスとする位置のメモリ内容",
    nbyte: "命令のバイト数\n\n命令のオペコードは1バイトであり、 オペランドのない命令ではバイト数は1、オペランドが1バイトの命令では バイト数は2となる。",
    opcode: "命令のオペコード\n\nオペコードは1バイトであり、8ビットの 2進数によって記述する。",
    alias: "この命令が、他の命令の別名であることを定義する。\n\nalias指定がある場合は、 この他のnbyteやopcodeなどの指定はすべて無効となる。"
};
class opsHoverProvider {
    provideHover(document, position) {
        const range = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
        if (!range)
            return;
        const word = document.getText(range);
        // 静的 hover（レジスタなど）
        if (staticHoverInfo[word]) {
            if (word === "H") {
                // 直前文字を調べる
                const pos = range.start;
                const lineText = document.lineAt(pos.line).text;
                const prevChar = lineText[pos.character - 1] ?? '';
                // "<-H" の H の場合は除外
                if (prevChar === '<' || prevChar === '-') {
                    return; // ホバーしない
                }
            }
            return new vscode.Hover(`${staticHoverInfo[word]}`);
        }
    }
}
exports.opsHoverProvider = opsHoverProvider;
//# sourceMappingURL=opsHoverProvider.js.map