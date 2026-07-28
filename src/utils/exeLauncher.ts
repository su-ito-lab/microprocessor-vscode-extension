import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const EXPECTED_EXE_NAME = 'WinELC1Sim.exe';

interface ExeDirective {
  filePath: string;
  line: number;
  pathStart: number;
}

function isWinELC1SimPath(filePath: string): boolean {
  return path.basename(filePath).toLowerCase() === EXPECTED_EXE_NAME.toLowerCase();
}

function findExeDirective(document: vscode.TextDocument): ExeDirective | null {
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
export function findExeInAsm(document: vscode.TextDocument): string | null {
  return findExeDirective(document)?.filePath ?? null;
}

/**
 * `#exe` のパスを ASM ファイルの場所を基準に絶対パスへ解決する。
 */
export function getExePathForAsmDocument(
  document: vscode.TextDocument
): string | null {
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
export function exeFileExists(document: vscode.TextDocument): boolean {
  const exePath = getExePathForAsmDocument(document);
  if (!exePath) {
    return false;
  }

  try {
    return fs.statSync(exePath).isFile();
  } catch {
    return false;
  }
}

/**
 * `#exe` で指定された実行ファイルを起動する。
 */
export async function launchExeForAsmDocument(
  document: vscode.TextDocument,
  extensionPath: string,
  opsFilePath: string | null
): Promise<void> {
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
  } catch {
    throw new Error(`命令定義ファイルが見つかりません: '${opsFilePath}'`);
  }

  const launchScriptPath = path.join(extensionPath, 'scripts', 'launch-exe.ps1');
  try {
    if (!fs.statSync(launchScriptPath).isFile()) {
      throw new Error();
    }
  } catch {
    throw new Error(`起動スクリプトが見つかりません: '${launchScriptPath}'`);
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn('powershell.exe', [
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
      reject(new Error(
        detail || `PowerShell スクリプトが終了コード ${code} で失敗しました。`
      ));
    });
  });
}

/**
 * `#exe` で指定されたファイルが存在しない場合に診断エラーを表示する。
 */
export function updateExeDiagnostics(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection
): void {
  if (document.languageId !== 'vprocasm') {
    return;
  }

  const directive = findExeDirective(document);
  if (!directive) {
    collection.delete(document.uri);
    return;
  }

  const range = new vscode.Range(
    directive.line,
    directive.pathStart,
    directive.line,
    directive.pathStart + directive.filePath.length
  );
  let message: string;
  if (!isWinELC1SimPath(directive.filePath)) {
    message = `#exe には ${EXPECTED_EXE_NAME} を指定してください。`;
  } else if (!exeFileExists(document)) {
    message = `WinELC1Sim.exeが見つかりません`;
  } else {
    collection.delete(document.uri);
    return;
  }

  const diagnostic = new vscode.Diagnostic(
    range,
    message,
    vscode.DiagnosticSeverity.Error
  );

  collection.set(document.uri, [diagnostic]);
}
