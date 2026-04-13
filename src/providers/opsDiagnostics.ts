import * as vscode from 'vscode';
import * as fs from 'fs';
import * as iconv from 'iconv-lite';

export function analyzeOpsFile(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
    try {
        // console.log("[ops] begin analyze");

        const diagnostics: vscode.Diagnostic[] = [];
        const lines = document.getText().split(/\r?\n/);
        const opcodeMap = new Map<string, string>();

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

                if (!(line.length > 0 && /^[^\s#]/.test(line))) continue;

                const next = lines[i + 1] || "";
                const opcodeLine = lines[i + 2] || "";

                const m = opcodeLine.match(/([01]{8})/);
                const opcode = m ? m[1] : null;

                if (!opcode) continue;

                if (opcodeMap.has(opcode)) {
                    // console.log("error");
                    const start = opcodeLine.indexOf(opcode);
                    const pos = new vscode.Position(i + 2, start);
                    const range = new vscode.Range(pos, pos.translate(0, 8));
                    const prev = opcodeMap.get(opcode);

                    diagnostics.push(
                        new vscode.Diagnostic(
                            range,
                            `オペコード ${opcode} は命令 "${prev}" と重複しています`,
                            vscode.DiagnosticSeverity.Error
                        )
                    );
                } else {
                    opcodeMap.set(opcode, line);
                }
            } catch (e) {
                console.log("[ops] inner error:", e);
            }
        }

        // console.log("[ops-diagnostic] diagnostics length =", diagnostics.length);
        collection.set(document.uri, diagnostics);
    } catch (e) {
        console.log("[ops] fatal error:", e);
    }
}
