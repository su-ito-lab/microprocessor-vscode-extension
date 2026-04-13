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
exports.loadOpsFile = loadOpsFile;
exports.getCachedInstructions = getCachedInstructions;
exports.getCachedMnemonics = getCachedMnemonics;
exports.clearCachedInstructions = clearCachedInstructions;
exports.getOpsFilePath = getOpsFilePath;
exports.getInstructionLineNumbers = getInstructionLineNumbers;
exports.getInstructionComments = getInstructionComments;
const fs = __importStar(require("fs"));
let cachedInstructions = [];
let cachedMnemonics = [];
let opsFilePath = '';
let InstructionsLineNumbers = [];
let cachedInstructionComments = []; // 各命令の説明コメント（先頭 # 行）
let cachedInstructionopcode = []; // 各命令の説明コメント（先頭 # 行）
/**
 * .opsファイルを読み込んで命令定義をキャッシュ
 */
function loadOpsFile(opsPath) {
    clearCachedInstructions();
    try {
        opsFilePath = opsPath;
        const content = fs.readFileSync(opsPath, 'utf-8');
        cachedInstructions = content
            .split(/\r?\n/)
            .map((s, idx, arr) => {
            const trimmed = s.trimEnd();
            // ヘッダ行判定
            const isHeader = trimmed.length > 0 && /^[^\s#]/.test(trimmed);
            if (isHeader) {
                // ここで ops ファイルの行番号を保存
                InstructionsLineNumbers.push(idx);
                // 1行上にコメントがあるか確認
                let comment = "";
                if (idx > 0) {
                    const prev = arr[idx - 1].trim(); // 前の行
                    if (prev.startsWith("#")) {
                        comment = prev.replace(/^#\s*/, ""); // '#' を除去
                    }
                }
                cachedInstructionComments.push(comment);
                // 正規化して return（cachedInstructions に入る）
                return trimmed.replace(/,/g, ' ').replace(/\s+/g, ' ');
            }
            // ヘッダ行でないなら null を返す
            return null;
        })
            // null を除去
            .filter((x) => x !== null);
        // console.log("cachedInstructions =", JSON.stringify(cachedInstructions));
        // console.log("headerLineNumbers =", JSON.stringify(InstructionsLineNumbers));
        cachedMnemonics = Array.from(new Set(cachedInstructions.map(line => line.split(/\s+/)[0].toUpperCase())));
        console.log(`[VProcAsm] Reloaded instructions (${cachedInstructions.length} lines)`);
        return cachedInstructions;
    }
    catch (e) {
        console.error('[VProcAsm] Failed to load .ops file:', e);
        return [];
    }
}
/**
 * 命令定義全体を取得
 */
function getCachedInstructions() {
    return cachedInstructions;
}
/**
 * ニーモニック一覧を取得
 */
function getCachedMnemonics() {
    return cachedMnemonics;
}
/**
 * キャッシュをクリア
 */
function clearCachedInstructions() {
    cachedInstructions = [];
    cachedMnemonics = [];
    InstructionsLineNumbers = [];
    cachedInstructionComments = [];
}
/**
 * 追加：.opsファイルのパス取得
 */
function getOpsFilePath() {
    return opsFilePath;
}
/**
 * 命令行の ops 内行番号リストを返す
 */
function getInstructionLineNumbers() {
    return InstructionsLineNumbers;
}
/**
 * 命令行の ops 内行番号リストを返す
 */
function getInstructionComments() {
    return cachedInstructionComments;
}
//# sourceMappingURL=opsLoader.js.map