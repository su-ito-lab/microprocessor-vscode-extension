// import * as vscode from 'vscode';
// import { getCachedInstructions } from '../utils/opsLoader';
// import { collectDefinedLabels } from '../utils/labelUtils';

// const registers = ["AC", "WA", "B", "X"];

// export class OpCompletionProvider implements vscode.CompletionItemProvider {

//   provideCompletionItems(
//     document: vscode.TextDocument,
//     position: vscode.Position
//   ): vscode.ProviderResult<vscode.CompletionItem[]> {

//     // ---------------------------
//     // カーソル手前を抽出
//     // ---------------------------
//     const line = document.lineAt(position.line).text;
//     let beforeCursor = line.substring(0, position.character)
//     beforeCursor = beforeCursor.replace(/^[A-Za-z_]\w*:\s*/, "");
//     beforeCursor = beforeCursor.trim();
//     beforeCursor = beforeCursor.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
//     if (!beforeCursor) return;

//     const prefix = this.getLastWord(beforeCursor);

//     const cachedInstructions = getCachedInstructions();
//     if (cachedInstructions.length === 0) return;

//     const DefinedLabels = collectDefinedLabels(document);

//     const items: vscode.CompletionItem[] = [];

//     // --- レジスタ（最優先：sortText = "0"） ---
//     for (const r of registers) {
//       if (r.startsWith(prefix)) {
//         const item = new vscode.CompletionItem(r, vscode.CompletionItemKind.Variable);
//         item.insertText = r;
//         item.sortText = "0";
//         item.detail = "レジスタ";
//         items.push(item);
//       }
//     }

//     // --- ラベル（二番目：sortText = "1"） ---
//     for (const lab of DefinedLabels) {
//       if (lab.startsWith(prefix)) {
//         const item = new vscode.CompletionItem(lab, vscode.CompletionItemKind.Field);
//         item.insertText = lab;
//         item.sortText = "1";
//         item.detail = "ラベル";
//         items.push(item);
//       }
//     }

//     // ===========================================================
//     // ③ beforeCursor（行全体）で命令テンプレを前方一致抽出
//     // ===========================================================
//     for (const inst of cachedInstructions) {
//       if (inst.startsWith(beforeCursor)) {
//         const item = new vscode.CompletionItem(inst, vscode.CompletionItemKind.Snippet);
//         // 挿入時だけ TAB に変換
//         item.insertText = inst.replace(/\s+/g, '\t');
//         item.sortText = "2";  // 最下位に表示
//         item.detail = "定義済み命令";
//         items.push(item);
//       }
//     }

//     // --- すべての候補を返す ---
//     return items;
//   }

//   private getLastWord(text: string): string  {
//     const match = text.trim().match(/([A-Za-z_][\w]*)$/);
//     return match ? match[1] : " ";
//   }
// }
