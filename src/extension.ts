import * as vscode from 'vscode';
import * as path from 'path';
import { clearCachedInstructions, loadOpsFile, getOpsFilePath } from './utils/opsLoader';
import { VProcSemanticProvider } from './providers/semanticProvider';
import { updateDiagnostics, Diagnostics } from './providers/diagnosticProvider';
import { VProcDefinitionProvider } from './providers/DefinitionProvider';
import { analyzeOpsFile } from './providers/opsDiagnostics';
import { asmHoverProvider } from './providers/asmHoverProvider';
import { opsHoverProvider } from './providers/opsHoverProvider';
import { getOpsPathForAsmDocument, loadOpsForAsmDocument } from './utils/importLoader';
import { getDependentAsmFiles } from './utils/dependencyMap';
import { launchExeForAsmDocument, updateExeDiagnostics } from './utils/exeLauncher';
// import { OpCompletionProvider } from './providers/CompletionProvider'; 

export let opsDiagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  console.log('[VProcAsm] Activated');

  // ===== ASM Diagnostics Collection =====
  const asmDiagnostics = Diagnostics(context);

  // ===== EXE Diagnostics Collection =====
  const exeDiagnostics = vscode.languages.createDiagnosticCollection('vprocExe');
  context.subscriptions.push(exeDiagnostics);

  const activeDocument = vscode.window.activeTextEditor?.document;
  if (activeDocument?.languageId === 'vprocasm') {
    updateExeDiagnostics(activeDocument, exeDiagnostics);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('vprocAssembly.runExe', async () => {
      const document = vscode.window.activeTextEditor?.document;
      if (!document || document.languageId !== 'vprocasm') {
        vscode.window.showErrorMessage('ASM ファイルを開いてください。');
        return;
      }

      try {
        const opsFilePath = getOpsPathForAsmDocument(document);
        await launchExeForAsmDocument(
          document,
          context.extensionPath,
          opsFilePath
        );
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : 'WinELC1Sim.exeの起動に失敗しました。';
        vscode.window.showErrorMessage(message);
      }
    })
  );

  // ===== OPS Diagnostics Collection =====
  opsDiagnosticCollection = vscode.languages.createDiagnosticCollection('vprocOps');
  context.subscriptions.push(opsDiagnosticCollection);


    // ==== asm 開いたら import 解析・依存登録 + opsロード + エラー検知 ====
  vscode.workspace.onDidOpenTextDocument(doc => {
    if (doc.languageId === "vprocasm") {
      loadOpsForAsmDocument(doc);
      updateDiagnostics(doc, asmDiagnostics);
      updateExeDiagnostics(doc, exeDiagnostics);
    }
  });

  // ==== asm編集時も import 解析・依存登録 + opsロード + エラー検知 ====
  vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.languageId === 'vprocasm') {
        loadOpsForAsmDocument(e.document);
        updateDiagnostics(e.document, asmDiagnostics);
        updateExeDiagnostics(e.document, exeDiagnostics);
      }
  });


    // ==== asm 保存時も import 解析 + エラー検知 ====
  vscode.workspace.onDidSaveTextDocument(doc => {
    if (doc.languageId === "vprocasm") {
      loadOpsForAsmDocument(doc);
      updateDiagnostics(doc, asmDiagnostics);
      updateExeDiagnostics(doc, exeDiagnostics);
    }
  });



  // ==== エディタ切替時も import 解析 + エラー検知 ====
  vscode.window.onDidChangeActiveTextEditor(editor => {
    const doc = editor?.document;
    if (doc?.languageId === "vprocasm") {
      loadOpsForAsmDocument(doc);
      updateDiagnostics(doc, asmDiagnostics);
      updateExeDiagnostics(doc, exeDiagnostics);
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
