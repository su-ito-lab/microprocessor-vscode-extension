import * as vscode from 'vscode';
import { getCachedInstructions, getOpsFilePath, getInstructionLineNumbers } from '../utils/opsLoader';
import { normalizeLineForAnalysis } from '../utils/normalizeUtils';
import { collectLabelDefinitions } from '../utils/labelUtils';

export class VProcDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Location> {

    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) return;

    const clickedWord = document.getText(wordRange);

    // クリックされた行の生テキスト
    const rawLine = document.lineAt(position.line).text;
    const normalized = normalizeLineForAnalysis(rawLine);

    const mnemonic = normalized.trim().split(/\s+/)[0];

    if (clickedWord === mnemonic) {
      const instructions = getCachedInstructions();
      if (!instructions || instructions.length === 0) return;

      const lineNumbers = getInstructionLineNumbers();
      if (!lineNumbers || lineNumbers.length === 0) return;

      const idx = instructions.findIndex(line => line === normalized);
      if (idx >= 0) {
        const opsLine = lineNumbers[idx];
        const opsPath = getOpsFilePath();
        if (!opsPath) return;

        return new vscode.Location(
          vscode.Uri.file(opsPath),
          new vscode.Position(opsLine, 0)
        );
      }
    }

    // ===== ラベル → 同一 asm 内の定義箇所ジャンプ =====
    const labelDefs = collectLabelDefinitions(document);
    const defPos = labelDefs.get(clickedWord);
    if (!defPos) return;

    return new vscode.Location(document.uri, defPos);
  }
}
