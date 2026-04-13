import * as vscode from 'vscode';
import * as path from 'path';
import { clearCachedInstructions, loadOpsFile, getOpsFilePath } from './utils/opsLoader';
import { VProcSemanticProvider } from './providers/semanticProvider';
import { updateDiagnostics, Diagnostics } from './providers/diagnosticProvider';
import { VProcDefinitionProvider } from './providers/DefinitionProvider';
import { analyzeOpsFile } from './providers/opsDiagnostics';
import { asmHoverProvider } from './providers/asmHoverProvider';
import { opsHoverProvider } from './providers/opsHoverProvider';
import { loadOpsForAsmDocument } from './utils/importLoader';
import { getDependentAsmFiles } from './utils/dependencyMap';
// import { OpCompletionProvider } from './providers/CompletionProvider'; 

export let opsDiagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  console.log('[VProcAsm] Activated');

  // ===== ASM Diagnostics Collection =====
  const asmDiagnostics = Diagnostics(context);

  // ===== OPS Diagnostics Collection =====
  opsDiagnosticCollection = vscode.languages.createDiagnosticCollection('vprocOps');
  context.subscriptions.push(opsDiagnosticCollection);


    // ==== asm 開いたら import 解析・依存登録 + opsロード + エラー検知 ====
  vscode.workspace.onDidOpenTextDocument(doc => {
    if (doc.languageId === "vprocasm") {
      loadOpsForAsmDocument(doc);
      updateDiagnostics(doc, asmDiagnostics);
    }
  });

  // ==== asm編集時も import 解析・依存登録 + opsロード + エラー検知 ====
  vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.languageId === 'vprocasm') {
        loadOpsForAsmDocument(e.document);
        updateDiagnostics(e.document, asmDiagnostics);
      }
  });


    // ==== asm 保存時も import 解析 + エラー検知 ====
  vscode.workspace.onDidSaveTextDocument(doc => {
    if (doc.languageId === "vprocasm") {
      loadOpsForAsmDocument(doc);
      updateDiagnostics(doc, asmDiagnostics);
    }
  });



  // ==== エディタ切替時も import 解析 + エラー検知 ====
  vscode.window.onDidChangeActiveTextEditor(editor => {
    const doc = editor?.document;
    if (doc?.languageId === "vprocasm") {
      loadOpsForAsmDocument(doc);
      updateDiagnostics(doc, asmDiagnostics);
    }
  });

  vscode.workspace.onDidOpenTextDocument(doc => {
    if (doc.languageId === "vprocops") {
      analyzeOpsFile(doc, opsDiagnosticCollection)
    }
  });

  vscode.window.onDidChangeActiveTextEditor(editor => {
    const doc = editor?.document;
    if (doc?.languageId === "vprocops") {
      analyzeOpsFile(doc, opsDiagnosticCollection)
    }
  });

  // ==== ★ ops 保存時：依存 asm を再読み込み ====
  vscode.workspace.onDidSaveTextDocument(async doc => {
    if (!doc.fileName.endsWith('.ops')) return;
    analyzeOpsFile(doc, opsDiagnosticCollection)
    
      const opsPath = doc.uri.fsPath;
      loadOpsFile(doc.uri.fsPath);
      const dependents = getDependentAsmFiles(opsPath);

      for (const asmPath of dependents) {
          const asmDoc = await vscode.workspace.openTextDocument(asmPath);
          updateDiagnostics(asmDoc, asmDiagnostics);
      }
  });

  vscode.workspace.onDidChangeTextDocument(event => {
    const doc = event.document;

    if (doc.languageId === 'vprocops') {
      analyzeOpsFile(doc, opsDiagnosticCollection);
    }
  });


  // SemanticTokensProvider 登録
  const provider = new VProcSemanticProvider();
  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider({ language: 'vprocasm' }, provider, provider.getLegend())
  );

  // DefinitionProvider 登録
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      { language: 'vprocasm' },
      new VProcDefinitionProvider()
    )
  );

  // asm 用 hover
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { language: 'vprocasm' },
      new asmHoverProvider()
    )
  );

  // ops 用 hover
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { language: 'vprocops' }, 
      new opsHoverProvider()
    )
  );

  


 
}

export function deactivate() {}


 // --- 補完 CompletionProvider を登録
  // const CompletionProvider = vscode.languages.registerCompletionItemProvider(
  //   { language: 'vprocasm' },
  //   new OpCompletionProvider(),
  //   ' ', '\t' // 必要に応じてトリガー文字を増やす
  // );