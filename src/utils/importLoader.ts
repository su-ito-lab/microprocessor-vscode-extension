import * as vscode from 'vscode';
import * as path from 'path';
import { loadOpsFile, clearCachedInstructions, getOpsFilePath } from './opsLoader';
import { analyzeOpsFile } from '../providers/opsDiagnostics';
import { registerDependency } from './dependencyMap';

export function findImportOpsInAsm(document: vscode.TextDocument): string | null {
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i).text.trim();
    const m = line.match(/^#import\s+["'](.+\.ops)["']\s*$/);
    if (m) {
        // console.log("[VProcAsm] import ops", m[1].trim());
        return m[1].trim();
    }
  }
  // console.log("[VProcAsm] not import ops");
  return null;
}

export function getOpsPathForAsmDocument(
  document: vscode.TextDocument
): string | null {
  const opsFile = findImportOpsInAsm(document);
  if (!opsFile) {
    return null;
  }

  const asmDir = path.dirname(document.uri.fsPath);
  const absoluteOpsPath = path.isAbsolute(opsFile)
    ? opsFile
    : path.resolve(asmDir, opsFile);

  console.log('[VProcAsm] Resolved ops path:', absoluteOpsPath);
  return absoluteOpsPath;
}

export async function loadOpsForAsmDocument(
  document: vscode.TextDocument
) {
    if (document.languageId !== 'vprocasm') return;

    const absoluteOpsPath = getOpsPathForAsmDocument(document);
    if (!absoluteOpsPath) {
        clearCachedInstructions();
        return;
    }

    const asmPath = document.uri.fsPath;

    // ★ 依存関係を記録（ops → asm）
    registerDependency(absoluteOpsPath, asmPath);

    // ---- すでに読み込んでいる ops と同じならスキップ ----
    const currentOps = getOpsFilePath();
    if (currentOps === absoluteOpsPath) {
    // console.log("[VProcAsm] ops already loaded → skip loading");
    } else {
    // console.log("[VProcAsm] loading ops:", absoluteOpsPath);
    clearCachedInstructions();
    loadOpsFile(absoluteOpsPath);
    }

    vscode.commands.executeCommand('editor.action.forceRetokenize');

  // 診断（重複 opcode など）
//   try {
//     const opsDoc = await vscode.workspace.openTextDocument(absoluteOpsPath);
//     analyzeOpsFile(opsDoc, opsDiagnosticCollection);
//   } catch (e) {
//     console.error("[VProcAsm] Failed to analyze imported ops:", e);
//   }

}
