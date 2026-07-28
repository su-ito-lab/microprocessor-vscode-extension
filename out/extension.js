"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.opsDiagnosticCollection = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const opsLoader_1 = require("./utils/opsLoader");
const semanticProvider_1 = require("./providers/semanticProvider");
const diagnosticProvider_1 = require("./providers/diagnosticProvider");
const DefinitionProvider_1 = require("./providers/DefinitionProvider");
const opsDiagnostics_1 = require("./providers/opsDiagnostics");
const asmHoverProvider_1 = require("./providers/asmHoverProvider");
const opsHoverProvider_1 = require("./providers/opsHoverProvider");
const importLoader_1 = require("./utils/importLoader");
const dependencyMap_1 = require("./utils/dependencyMap");
const exeLauncher_1 = require("./utils/exeLauncher");
function activate(context) {
    console.log('[VProcAsm] Activated');
    // ===== ASM Diagnostics Collection =====
    const asmDiagnostics = (0, diagnosticProvider_1.Diagnostics)(context);
    // ===== EXE Diagnostics Collection =====
    const exeDiagnostics = vscode.languages.createDiagnosticCollection('vprocExe');
    context.subscriptions.push(exeDiagnostics);
    const activeDocument = vscode.window.activeTextEditor?.document;
    if (activeDocument?.languageId === 'vprocasm') {
        (0, exeLauncher_1.updateExeDiagnostics)(activeDocument, exeDiagnostics);
    }
    context.subscriptions.push(vscode.commands.registerCommand('vprocAssembly.runExe', async () => {
        const document = vscode.window.activeTextEditor?.document;
        if (!document || document.languageId !== 'vprocasm') {
            vscode.window.showErrorMessage('ASM ファイルを開いてください。');
            return;
        }
        try {
            const opsFilePath = (0, importLoader_1.getOpsPathForAsmDocument)(document);
            await (0, exeLauncher_1.launchExeForAsmDocument)(document, context.extensionPath, opsFilePath);
        }
        catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'WinELC1Sim.exeの起動に失敗しました。';
            vscode.window.showErrorMessage(message);
        }
    }));
    // ===== OPS Diagnostics Collection =====
    exports.opsDiagnosticCollection = vscode.languages.createDiagnosticCollection('vprocOps');
    context.subscriptions.push(exports.opsDiagnosticCollection);
    // ==== asm 開いたら import 解析・依存登録 + opsロード + エラー検知 ====
    vscode.workspace.onDidOpenTextDocument(doc => {
        if (doc.languageId === "vprocasm") {
            (0, importLoader_1.loadOpsForAsmDocument)(doc);
            (0, diagnosticProvider_1.updateDiagnostics)(doc, asmDiagnostics);
            (0, exeLauncher_1.updateExeDiagnostics)(doc, exeDiagnostics);
        }
    });
    // ==== asm編集時も import 解析・依存登録 + opsロード + エラー検知 ====
    vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document.languageId === 'vprocasm') {
            (0, importLoader_1.loadOpsForAsmDocument)(e.document);
            (0, diagnosticProvider_1.updateDiagnostics)(e.document, asmDiagnostics);
            (0, exeLauncher_1.updateExeDiagnostics)(e.document, exeDiagnostics);
        }
    });
    // ==== asm 保存時も import 解析 + エラー検知 ====
    vscode.workspace.onDidSaveTextDocument(doc => {
        if (doc.languageId === "vprocasm") {
            (0, importLoader_1.loadOpsForAsmDocument)(doc);
            (0, diagnosticProvider_1.updateDiagnostics)(doc, asmDiagnostics);
            (0, exeLauncher_1.updateExeDiagnostics)(doc, exeDiagnostics);
        }
    });
    // ==== エディタ切替時も import 解析 + エラー検知 ====
    vscode.window.onDidChangeActiveTextEditor(editor => {
        const doc = editor?.document;
        if (doc?.languageId === "vprocasm") {
            (0, importLoader_1.loadOpsForAsmDocument)(doc);
            (0, diagnosticProvider_1.updateDiagnostics)(doc, asmDiagnostics);
            (0, exeLauncher_1.updateExeDiagnostics)(doc, exeDiagnostics);
        }
    });
    vscode.workspace.onDidOpenTextDocument(doc => {
        if (doc.languageId === "vprocops") {
            (0, opsDiagnostics_1.analyzeOpsFile)(doc, exports.opsDiagnosticCollection);
        }
    });
    vscode.window.onDidChangeActiveTextEditor(editor => {
        const doc = editor?.document;
        if (doc?.languageId === "vprocops") {
            (0, opsDiagnostics_1.analyzeOpsFile)(doc, exports.opsDiagnosticCollection);
        }
    });
    // ==== ★ ops 保存時：依存 asm を再読み込み ====
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
        if (!doc.fileName.endsWith('.ops'))
            return;
        (0, opsDiagnostics_1.analyzeOpsFile)(doc, exports.opsDiagnosticCollection);
        const opsPath = doc.uri.fsPath;
        (0, opsLoader_1.loadOpsFile)(doc.uri.fsPath);
        const dependents = (0, dependencyMap_1.getDependentAsmFiles)(opsPath);
        for (const asmPath of dependents) {
            const asmDoc = await vscode.workspace.openTextDocument(asmPath);
            (0, diagnosticProvider_1.updateDiagnostics)(asmDoc, asmDiagnostics);
        }
    });
    vscode.workspace.onDidChangeTextDocument(event => {
        const doc = event.document;
        if (doc.languageId === 'vprocops') {
            (0, opsDiagnostics_1.analyzeOpsFile)(doc, exports.opsDiagnosticCollection);
        }
    });
    // SemanticTokensProvider 登録
    const provider = new semanticProvider_1.VProcSemanticProvider();
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'vprocasm' }, provider, provider.getLegend()));
    // DefinitionProvider 登録
    context.subscriptions.push(vscode.languages.registerDefinitionProvider({ language: 'vprocasm' }, new DefinitionProvider_1.VProcDefinitionProvider()));
    // asm 用 hover
    context.subscriptions.push(vscode.languages.registerHoverProvider({ language: 'vprocasm' }, new asmHoverProvider_1.asmHoverProvider()));
    // ops 用 hover
    context.subscriptions.push(vscode.languages.registerHoverProvider({ language: 'vprocops' }, new opsHoverProvider_1.opsHoverProvider()));
}
function deactivate() { }
// --- 補完 CompletionProvider を登録
// const CompletionProvider = vscode.languages.registerCompletionItemProvider(
//   { language: 'vprocasm' },
//   new OpCompletionProvider(),
//   ' ', '\t' // 必要に応じてトリガー文字を増やす
// );
//# sourceMappingURL=extension.js.map