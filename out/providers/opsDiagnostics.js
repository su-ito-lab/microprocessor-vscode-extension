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
exports.analyzeOpsFile = analyzeOpsFile;
const vscode = __importStar(require("vscode"));
function analyzeOpsFile(document, collection) {
    try {
        // console.log("[ops] begin analyze");
        const diagnostics = [];
        const lines = document.getText().split(/\r?\n/);
        const opcodeMap = new Map();
        // if (document.getText().length === 0) {
        //     const diagnostic = new vscode.Diagnostic(
        //         new vscode.Range(0, 0, 0, 1),
        //         `画面右下のエンコーディングメニューが Shift JIS であることを確認してください。\nUTF-8 の場合は変更してください。`,
        //         vscode.DiagnosticSeverity.Warning
        //     );
        //     collection.set(document.uri, [diagnostic]);
        //     return;
        // }
        for (let i = 0; i < lines.length; i++) {
            try {
                const line = lines[i].trim();
                if (!(line.length > 0 && /^[^\s#]/.test(line)))
                    continue;
                const next = lines[i + 1] || "";
                const opcodeLine = lines[i + 2] || "";
                const m = opcodeLine.match(/([01]{8})/);
                const opcode = m ? m[1] : null;
                if (!opcode)
                    continue;
                if (opcodeMap.has(opcode)) {
                    // console.log("error");
                    const start = opcodeLine.indexOf(opcode);
                    const pos = new vscode.Position(i + 2, start);
                    const range = new vscode.Range(pos, pos.translate(0, 8));
                    const prev = opcodeMap.get(opcode);
                    diagnostics.push(new vscode.Diagnostic(range, `オペコード ${opcode} は命令 "${prev}" と重複しています`, vscode.DiagnosticSeverity.Error));
                }
                else {
                    opcodeMap.set(opcode, line);
                }
            }
            catch (e) {
                console.log("[ops] inner error:", e);
            }
        }
        // console.log("[ops-diagnostic] diagnostics length =", diagnostics.length);
        collection.set(document.uri, diagnostics);
    }
    catch (e) {
        console.log("[ops] fatal error:", e);
    }
}
//# sourceMappingURL=opsDiagnostics.js.map