import * as fs from 'fs';
import * as iconv from 'iconv-lite';

let cachedInstructions: string[] = [];
let cachedMnemonics: string[] = [];
let opsFilePath: string = '';
let InstructionsLineNumbers: number[] = [];
let cachedInstructionComments: string[] = [];  // 各命令の説明コメント（先頭 # 行）
let cachedInstructionopcode: string[] = [];  // 各命令の説明コメント（先頭 # 行）

/**
 * .opsファイルを読み込んで命令定義をキャッシュ
 */
export function loadOpsFile(opsPath: string): string[] {
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
              const prev = arr[idx - 1].trim();      // 前の行
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
      .filter((x): x is string => x !== null);
    
    // console.log("cachedInstructions =", JSON.stringify(cachedInstructions));
    // console.log("headerLineNumbers =", JSON.stringify(InstructionsLineNumbers));

    cachedMnemonics = Array.from(
      new Set(cachedInstructions.map(line => line.split(/\s+/)[0].toUpperCase()))
    );

    console.log(`[VProcAsm] Reloaded instructions (${cachedInstructions.length} lines)`);
    return cachedInstructions;
  } catch (e) {
    console.error('[VProcAsm] Failed to load .ops file:', e);
    return [];
  }
}

/**
 * 命令定義全体を取得
 */
export function getCachedInstructions(): string[] {
  return cachedInstructions;
}

/**
 * ニーモニック一覧を取得
 */
export function getCachedMnemonics(): string[] {
  return cachedMnemonics;
}

/**
 * キャッシュをクリア
 */
export function clearCachedInstructions() {
  cachedInstructions = [];
  cachedMnemonics = [];
  InstructionsLineNumbers = [];
  cachedInstructionComments = [];
}

/**
 * 追加：.opsファイルのパス取得
 */
export function getOpsFilePath(): string {
  return opsFilePath;
}

/**
 * 命令行の ops 内行番号リストを返す
 */
export function getInstructionLineNumbers(): number[] {
  return InstructionsLineNumbers;
}

/**
 * 命令行の ops 内行番号リストを返す
 */
export function getInstructionComments(): string[] {
  return cachedInstructionComments;
}