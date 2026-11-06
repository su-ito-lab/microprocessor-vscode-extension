import * as vscode from 'vscode';
import * as path from 'path';
import { getCachedInstructions, getOpsFilePath, getInstructionLineNumbers } from '../utils/opsLoader';
import { normalizeLineForAnalysis } from '../utils/normalizeUtils';
import { collectLabelDefinitions } from '../utils/labelUtils';

export class VProcDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Definition | vscode.DefinitionLink[]> {

    const rawLine = document.lineAt(position.line).text;
    const importMatch = rawLine.match(/^(\s*#import\s+)(["'])(.+\.ops)\2\s*$/i);
    if (importMatch) {
      const importPath = importMatch[3];
      const pathStart = importMatch[1].length + 1;
      const pathEnd = pathStart + importPath.length;

      if (position.character >= pathStart && position.character < pathEnd) {
        const opsPath = path.isAbsolute(importPath)
          ? importPath
          : path.resolve(path.dirname(document.uri.fsPath), importPath);

        const targetPosition = new vscode.Position(0, 0);
        return [{
          originSelectionRange: new vscode.Range(
            position.line,
            pathStart,
            position.line,
            pathEnd
          ),
          targetUri: vscode.Uri.file(opsPath),
          targetRange: new vscode.Range(targetPosition, targetPosition),
          targetSelectionRange: new vscode.Range(targetPosition, targetPosition)
        }];
      }
    }

    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) return;

    const clickedWord = document.getText(wordRange);

    // クリックされた行の生テキスト
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
