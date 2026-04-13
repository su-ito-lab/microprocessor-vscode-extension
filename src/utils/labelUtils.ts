import * as vscode from 'vscode';

export function collectDefinedLabels(document: vscode.TextDocument): Set<string> {
  const labelDefRegex = /^([A-Za-z_][A-Za-z0-9_]*):/;
  const labels = new Set<string>();
  for (let i = 0; i < document.lineCount; i++) {
    const text = document.lineAt(i).text;
    const m = labelDefRegex.exec(text);
    if (m) labels.add(m[1]);
  }
  return labels;
}

export function collectLabelComments(document: vscode.TextDocument): Record<string, string> {
  const labelDefRegex = /^([A-Za-z_][A-Za-z0-9_]*)\s*:(.*)$/;

  const labelComments: Record<string, string> = {};

  for (let i = 0; i < document.lineCount; i++) {
    const raw = document.lineAt(i).text;

    const m = raw.match(labelDefRegex);
    if (!m) continue;

    const label = m[1];
    const rest  = m[2];

    const c = rest.match(/#(.*)$/);
    labelComments[label] = c ? c[1].trim() : "";
  }

  return labelComments;
}

export function collectLabelDefinitions(document: vscode.TextDocument): Map<string, vscode.Position> {
  const labelDefRegex = /^([A-Za-z_][A-Za-z0-9_]*):/;
  const defs = new Map<string, vscode.Position>();

  for (let i = 0; i < document.lineCount; i++) {
    const text = document.lineAt(i).text;
    const m = labelDefRegex.exec(text);
    if (m) {
      const label = m[1];
      const col = text.indexOf(label);
      defs.set(label, new vscode.Position(i, col));
    }
  }

  return defs;
}

export function makeLabelRegex(labels: Set<string>): RegExp | null {
  if (labels.size === 0) return null;
  return new RegExp(`\\b(${[...labels].join('|')})\\b`, 'g');
}
