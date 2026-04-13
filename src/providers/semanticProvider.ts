import * as vscode from 'vscode';
import * as path from 'path';
import { loadOpsFile, getCachedInstructions } from '../utils/opsLoader';
import { collectDefinedLabels, makeLabelRegex } from '../utils/labelUtils';
import { highlightLine } from '../utils/highlightUtils';
import { loadOpsForAsmDocument } from '../utils/importLoader';

export class VProcSemanticProvider implements vscode.DocumentSemanticTokensProvider {
  private legend: vscode.SemanticTokensLegend;

  constructor() {
    this.legend = new vscode.SemanticTokensLegend(['mnemonic', 'label', 'comment', 'register', 'number', 'import', 'string']);
  }

  getLegend() {
    return this.legend;
  }

  async provideDocumentSemanticTokens(document: vscode.TextDocument): Promise<vscode.SemanticTokens> {
    const builder = new vscode.SemanticTokensBuilder(this.legend);

    await loadOpsForAsmDocument(document);

    const dir = path.dirname(document.uri.fsPath);
    const opsPath = path.join(dir, 'basic.ops');
    const cachedInstructions = getCachedInstructions();

    if (cachedInstructions.length === 0) {
      return builder.build();
    }

    const PseudoInstructions = ['org', 'db', 'dw'];
    const registers = ['AC', 'WA', 'B', 'X'];

    const PseRegex = new RegExp(`\\b(${PseudoInstructions.join('|')})\\b`, 'g');
    const regRegex = new RegExp(`\\b(${registers.join('|')})\\b`, 'g');
    const commentRegex = /#.*/;
    const mnemonicRegex = new RegExp(`\\b(${cachedInstructions.join('|')})\\b`, 'g');

    const definedLabels = collectDefinedLabels(document);
    // const definedLabels = new Set(Object.keys(DefinedLabels));
    const labelRegex = makeLabelRegex(definedLabels);

    for (let i = 0; i < document.lineCount; i++) {
      highlightLine(document.lineAt(i).text, i, builder, labelRegex, mnemonicRegex, PseRegex, regRegex, commentRegex, cachedInstructions);
    }

    return builder.build();
  }
}
