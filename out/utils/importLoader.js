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
exports.findImportOpsInAsm = findImportOpsInAsm;
exports.loadOpsForAsmDocument = loadOpsForAsmDocument;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const opsLoader_1 = require("./opsLoader");
const dependencyMap_1 = require("./dependencyMap");
function findImportOpsInAsm(document) {
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
async function loadOpsForAsmDocument(document) {
    if (document.languageId !== 'vprocasm')
        return;
    const opsFile = findImportOpsInAsm(document);
    if (!opsFile) {
        (0, opsLoader_1.clearCachedInstructions)();
        return;
    }
    const asmDir = path.dirname(document.uri.fsPath);
    // ★ 絶対パスならそのまま、相対パスなら resolve
    const absoluteOpsPath = path.isAbsolute(opsFile)
        ? opsFile
        : path.resolve(asmDir, opsFile);
    const asmPath = document.uri.fsPath;
    // ★ 依存関係を記録（ops → asm）
    (0, dependencyMap_1.registerDependency)(absoluteOpsPath, asmPath);
    // ---- すでに読み込んでいる ops と同じならスキップ ----
    const currentOps = (0, opsLoader_1.getOpsFilePath)();
    if (currentOps === absoluteOpsPath) {
        // console.log("[VProcAsm] ops already loaded → skip loading");
    }
    else {
        // console.log("[VProcAsm] loading ops:", absoluteOpsPath);
        (0, opsLoader_1.clearCachedInstructions)();
        (0, opsLoader_1.loadOpsFile)(absoluteOpsPath);
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
//# sourceMappingURL=importLoader.js.map