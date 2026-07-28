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
exports.findExeInAsm = findExeInAsm;
exports.getExePathForAsmDocument = getExePathForAsmDocument;
exports.exeFileExists = exeFileExists;
exports.launchExeForAsmDocument = launchExeForAsmDocument;
exports.updateExeDiagnostics = updateExeDiagnostics;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const EXPECTED_EXE_NAME = 'WinELC1Sim.exe';
function isWinELC1SimPath(filePath) {
    return path.basename(filePath).toLowerCase() === EXPECTED_EXE_NAME.toLowerCase();
}
function findExeDirective(document) {
    for (let i = 0; i < document.lineCount; i++) {
        const rawLine = document.lineAt(i).text;
        const match = rawLine.match(/^\s*#exe\s+(["'])(.+)\1\s*$/i);
        if (match) {
            const filePath = match[2].trim();
            return {
                filePath,
                line: i,
                pathStart: rawLine.indexOf(filePath)
            };
        }
    }
    return null;
}
/**
 * ASM ファイル内の `#exe "path"` から引用符内のパスを取得する。
 */
function findExeInAsm(document) {
    return findExeDirective(document)?.filePath ?? null;
}
/**
 * `#exe` のパスを ASM ファイルの場所を基準に絶対パスへ解決する。
 */
function getExePathForAsmDocument(document) {
    const exeFile = findExeInAsm(document);
    if (!exeFile) {
        return null;
    }
    if (path.isAbsolute(exeFile)) {
        return exeFile;
    }
    const asmDir = path.dirname(document.uri.fsPath);
    return path.resolve(asmDir, exeFile);
}
/**
 * `#exe` で指定されたパスに通常ファイルが存在するか確認する。
 */
function exeFileExists(document) {
    const exePath = getExePathForAsmDocument(document);
    if (!exePath) {
        return false;
    }
    try {
        return fs.statSync(exePath).isFile();
    }
    catch {
        return false;
    }
}
/**
 * `#exe` で指定された実行ファイルを起動する。
 */
async function launchExeForAsmDocument(document, extensionPath, opsFilePath) {
    const exePath = getExePathForAsmDocument(document);
    if (!exePath) {
        throw new Error('#exe でWinELC1Sim.exeを指定してください。');
    }
    if (!isWinELC1SimPath(exePath)) {
        throw new Error(`#exe には ${EXPECTED_EXE_NAME} を指定してください。`);
    }
    if (!exeFileExists(document)) {
        throw new Error(`WinELC1Sim.exeが見つかりません`);
    }
    if (!opsFilePath) {
        throw new Error('#import で命令定義ファイルを指定してください。');
    }
    try {
        if (!fs.statSync(opsFilePath).isFile()) {
            throw new Error();
        }
    }
    catch {
        throw new Error(`命令定義ファイルが見つかりません: '${opsFilePath}'`);
    }
    const launchScriptPath = path.join(extensionPath, 'scripts', 'launch-exe.ps1');
    try {
        if (!fs.statSync(launchScriptPath).isFile()) {
            throw new Error();
        }
    }
    catch {
        throw new Error(`起動スクリプトが見つかりません: '${launchScriptPath}'`);
    }
    await new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)('powershell.exe', [
            '-NoProfile',
            '-STA',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            launchScriptPath,
            '-ExecutablePath',
            exePath,
            '-WorkingDirectory',
            path.dirname(exePath),
            '-OpsFilePath',
            opsFilePath,
            '-AsmFilePath',
            document.uri.fsPath
        ], {
            windowsHide: true,
            stdio: ['ignore', 'ignore', 'pipe']
        });
        let errorOutput = '';
        child.stderr?.on('data', data => {
            errorOutput += data.toString();
        });
        child.once('error', reject);
        child.once('close', code => {
            if (code === 0) {
                resolve();
                return;
            }
            const detail = errorOutput.trim();
            reject(new Error(detail || `PowerShell スクリプトが終了コード ${code} で失敗しました。`));
        });
    });
}
/**
 * `#exe` で指定されたファイルが存在しない場合に診断エラーを表示する。
 */
function updateExeDiagnostics(document, collection) {
    if (document.languageId !== 'vprocasm') {
        return;
    }
    const directive = findExeDirective(document);
    if (!directive) {
        collection.delete(document.uri);
        return;
    }
    const range = new vscode.Range(directive.line, directive.pathStart, directive.line, directive.pathStart + directive.filePath.length);
    let message;
    if (!isWinELC1SimPath(directive.filePath)) {
        message = `#exe には ${EXPECTED_EXE_NAME} を指定してください。`;
    }
    else if (!exeFileExists(document)) {
        message = `WinELC1Sim.exeが見つかりません`;
    }
    else {
        collection.delete(document.uri);
        return;
    }
    const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
    collection.set(document.uri, [diagnostic]);
}
//# sourceMappingURL=exeLauncher.js.map