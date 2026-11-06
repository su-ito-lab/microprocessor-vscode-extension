import * as vscode from 'vscode';
import { collectDefinedLabels } from '../utils/labelUtils';

export class LabelCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const lineBeforeCursor = document.lineAt(position.line).text.substring(0, position.character);

    if (lineBeforeCursor.includes('#')) {
      return [];
    }

    const wordRange = document.getWordRangeAtPosition(
      position,
      /[A-Za-z_][A-Za-z0-9_]*/
    );
    const prefix = wordRange ? document.getText(wordRange) : '';

    return [...collectDefinedLabels(document)]
      .filter(label => label.startsWith(prefix))
      .map(label => {
        const item = new vscode.CompletionItem(
          label,
          vscode.CompletionItemKind.Reference
        );
        item.insertText = label;
        item.detail = '定義済みラベル';
        return item;
      });
  }
}
