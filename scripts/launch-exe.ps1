# Node.js 側から、実行ファイルと自動入力するファイルの絶対パスを受け取る。
param(
    [Parameter(Mandatory = $true)]
    [string]$ExecutablePath,

    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,

    [Parameter(Mandatory = $true)]
    [string]$OpsFilePath,

    [Parameter(Mandatory = $true)]
    [string]$AsmFilePath
)

$ErrorActionPreference = 'Stop'

# キー入力の同期送信に使用する。
Add-Type -AssemblyName System.Windows.Forms

# ウィンドウの検出・前面化と、ファイル名欄への Unicode 文字列設定に使用する Win32 API。
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

[StructLayout(LayoutKind.Sequential)]
public struct WindowRectangle
{
    public int left;
    public int top;
    public int right;
    public int bottom;
}

[StructLayout(LayoutKind.Sequential)]
public struct GuiThreadInfo
{
    public int size;
    public uint flags;
    public IntPtr activeWindow;
    public IntPtr focusWindow;
    public IntPtr captureWindow;
    public IntPtr menuOwnerWindow;
    public IntPtr moveSizeWindow;
    public IntPtr caretWindow;
    public WindowRectangle caretRectangle;
}

public static class WindowApi
{
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(
        IntPtr windowHandle,
        out uint processId
    );

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr windowHandle);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindowVisible(IntPtr windowHandle);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool GetGUIThreadInfo(
        uint threadId,
        ref GuiThreadInfo info
    );

    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "GetClassNameW")]
    public static extern int GetClassName(
        IntPtr windowHandle,
        StringBuilder className,
        int maximumCharacterCount
    );

    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "SendMessageW")]
    public static extern IntPtr SetWindowText(
        IntPtr windowHandle,
        uint message,
        IntPtr parameter,
        string text
    );

    [DllImport("user32.dll", EntryPoint = "SendMessageW")]
    public static extern IntPtr GetWindowTextLength(
        IntPtr windowHandle,
        uint message,
        IntPtr parameter,
        IntPtr unused
    );

    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "SendMessageW")]
    public static extern IntPtr GetWindowText(
        IntPtr windowHandle,
        uint message,
        IntPtr characterCount,
        StringBuilder text
    );
}
'@

# ダイアログのファイル名欄をフォーカスし、WM_SETTEXT でパスを直接設定する。
# Ctrl+A / Ctrl+V は使わないため、a や v の誤入力を防げる。
function Set-DialogFilePath {
    param(
        [Parameter(Mandatory = $true)]
        [IntPtr]$DialogHandle,

        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [DateTime]$InputDeadline
    )

    # ダイアログの外枠が表示されても、内部の入力欄はまだ準備中の場合がある。
    # ファイル名欄への入力と読み戻しに成功するまで、最大15秒間再試行する。
    if ($InputDeadline -eq [DateTime]::MinValue) {
        $InputDeadline = [DateTime]::UtcNow.AddSeconds(15)
    }
    $lastFailure = 'The file name field was not ready.'

    do {
        try {
            if (
                [WindowApi]::GetForegroundWindow() -ne $DialogHandle -and
                -not [WindowApi]::SetForegroundWindow($DialogHandle)
            ) {
                throw 'Could not reactivate the file selection dialog.'
            }

            Start-Sleep -Milliseconds 100
            [System.Windows.Forms.SendKeys]::SendWait('%n')
            Start-Sleep -Milliseconds 100

            [uint32]$dialogProcessId = 0
            $dialogThreadId = [WindowApi]::GetWindowThreadProcessId(
                $DialogHandle,
                [ref]$dialogProcessId
            )
            if ($dialogThreadId -eq 0) {
                throw 'Could not inspect the file selection dialog thread.'
            }

            $guiInfo = [GuiThreadInfo]::new()
            $guiInfo.size = [System.Runtime.InteropServices.Marshal]::SizeOf(
                [type][GuiThreadInfo]
            )

            if (-not [WindowApi]::GetGUIThreadInfo($dialogThreadId, [ref]$guiInfo)) {
                throw 'Could not inspect the focused control in the file selection dialog.'
            }

            if ($guiInfo.focusWindow -eq [IntPtr]::Zero) {
                throw 'The file name control did not receive focus.'
            }

            # Alt+N がファイル名欄へ届く前に、一覧やボタンを入力欄と誤認しないようにする。
            $classNameBuffer = [System.Text.StringBuilder]::new(256)
            $classNameLength = [WindowApi]::GetClassName(
                $guiInfo.focusWindow,
                $classNameBuffer,
                $classNameBuffer.Capacity
            )
            if ($classNameLength -eq 0) {
                throw 'Could not identify the focused control in the file selection dialog.'
            }

            $focusedControlClass = $classNameBuffer.ToString()
            if ($focusedControlClass -ine 'Edit') {
                throw "The focused control is not the file name input field: '$focusedControlClass'."
            }

            $setResult = [WindowApi]::SetWindowText(
                $guiInfo.focusWindow,
                0x000C,
                [IntPtr]::Zero,
                $FilePath
            )
            if ($setResult -eq [IntPtr]::Zero) {
                throw 'Could not set the file path with the native input method.'
            }

            $textLength = [int][WindowApi]::GetWindowTextLength(
                $guiInfo.focusWindow,
                0x000E,
                [IntPtr]::Zero,
                [IntPtr]::Zero
            )
            $textBuffer = [System.Text.StringBuilder]::new($textLength + 1)
            [void][WindowApi]::GetWindowText(
                $guiInfo.focusWindow,
                0x000D,
                [IntPtr]::new($textLength + 1),
                $textBuffer
            )

            if ($textBuffer.ToString() -ne $FilePath) {
                throw 'The native input method could not verify the file path.'
            }

            # ダイアログの初期化処理によって入力内容が消されないことを確認する。
            Start-Sleep -Milliseconds 500
            $stableTextLength = [int][WindowApi]::GetWindowTextLength(
                $guiInfo.focusWindow,
                0x000E,
                [IntPtr]::Zero,
                [IntPtr]::Zero
            )
            $stableTextBuffer = [System.Text.StringBuilder]::new($stableTextLength + 1)
            [void][WindowApi]::GetWindowText(
                $guiInfo.focusWindow,
                0x000D,
                [IntPtr]::new($stableTextLength + 1),
                $stableTextBuffer
            )

            if ($stableTextBuffer.ToString() -ne $FilePath) {
                throw 'The file path was cleared while the file selection dialog was initializing.'
            }

            return
        }
        catch {
            $lastFailure = $_.Exception.Message
        }

        Start-Sleep -Milliseconds 100
    } while ([DateTime]::UtcNow -lt $InputDeadline)

    throw "The file name field did not become ready within 15 seconds: $lastFailure"
}

# パスを安定して入力できたことを確認してから Alt+O を送り、
# ダイアログが残っている場合は入力から最大15秒間再試行する。
function Submit-DialogFilePath {
    param(
        [Parameter(Mandatory = $true)]
        [IntPtr]$DialogHandle,

        [Parameter(Mandatory = $true)]
        [string]$FilePath
    )

    $submissionDeadline = [DateTime]::UtcNow.AddSeconds(15)
    $lastFailure = 'The file selection dialog did not close.'

    do {
        try {
            Set-DialogFilePath `
                -DialogHandle $DialogHandle `
                -FilePath $FilePath `
                -InputDeadline $submissionDeadline

            Start-Sleep -Milliseconds 150
            if (
                [WindowApi]::GetForegroundWindow() -ne $DialogHandle -and
                -not [WindowApi]::SetForegroundWindow($DialogHandle)
            ) {
                throw 'Could not reactivate the file selection dialog before opening the file.'
            }

            [System.Windows.Forms.SendKeys]::SendWait('%o')

            # Alt+O が受け付けられたかを確認し、ダイアログが残っていれば再入力する。
            $closeCheckDeadline = [DateTime]::UtcNow.AddMilliseconds(750)
            do {
                Start-Sleep -Milliseconds 100
                if (-not [WindowApi]::IsWindowVisible($DialogHandle)) {
                    return
                }
            } while (
                [DateTime]::UtcNow -lt $closeCheckDeadline -and
                [DateTime]::UtcNow -lt $submissionDeadline
            )

            $lastFailure = 'The file selection dialog remained open after Alt+O.'
        }
        catch {
            $lastFailure = $_.Exception.Message
        }

        Start-Sleep -Milliseconds 100
    } while ([DateTime]::UtcNow -lt $submissionDeadline)

    throw "The file selection dialog did not close within 15 seconds: $lastFailure"
}

# シミュレータを起動し、プロセス情報を取得する。
$process = Start-Process `
    -FilePath $ExecutablePath `
    -WorkingDirectory $WorkingDirectory `
    -PassThru

# GUI がキー入力を受け付けられる状態になるまで待機する。
try {
    if (-not $process.WaitForInputIdle(10000)) {
        throw 'The launched application did not become input-idle within 10 seconds.'
    }
} catch {
    throw "Could not confirm that the launched application was ready: $($_.Exception.Message)"
}

$mainWindowDeadline = [DateTime]::UtcNow.AddSeconds(15)
do {
    if ($process.HasExited) {
        throw 'The launched application exited before creating its main window.'
    }

    $process.Refresh()
    if ($process.MainWindowHandle -ne [IntPtr]::Zero) {
        break
    }

    Start-Sleep -Milliseconds 100
} while ([DateTime]::UtcNow -lt $mainWindowDeadline)

if ($process.MainWindowHandle -eq [IntPtr]::Zero) {
    throw 'The main window of the launched application was not found.'
}

$shell = New-Object -ComObject WScript.Shell
if (-not $shell.AppActivate($process.Id)) {
    throw 'Could not activate the launched application window.'
}

# 1回目のファイル選択ダイアログを開く。
# Alt+F でファイルメニューを開き、先頭項目を Enter で実行する。
Start-Sleep -Milliseconds 200
$shell.SendKeys('%f')
Start-Sleep -Milliseconds 200
$mainWindowHandle = $process.MainWindowHandle
$shell.SendKeys('{ENTER}')

$dialogHandle = [IntPtr]::Zero
$dialogDeadline = [DateTime]::UtcNow.AddSeconds(10)

# 起動したアプリと同じプロセスの新しい前面ウィンドウをダイアログとして検出する。
do {
    Start-Sleep -Milliseconds 100

    $candidateHandle = [WindowApi]::GetForegroundWindow()
    [uint32]$ownerProcessId = 0
    [void][WindowApi]::GetWindowThreadProcessId(
        $candidateHandle,
        [ref]$ownerProcessId
    )

    if (
        $candidateHandle -ne [IntPtr]::Zero -and
        $candidateHandle -ne $mainWindowHandle -and
        $ownerProcessId -eq [uint32]$process.Id
    ) {
        $dialogHandle = $candidateHandle
        break
    }
} while ([DateTime]::UtcNow -lt $dialogDeadline)

if ($dialogHandle -eq [IntPtr]::Zero) {
    throw 'The file selection dialog did not open within 10 seconds.'
}

if (
    [WindowApi]::GetForegroundWindow() -ne $dialogHandle -and
    -not [WindowApi]::SetForegroundWindow($dialogHandle)
) {
    throw 'Could not activate the file selection dialog.'
}

# 1回目のダイアログへ命令定義ファイル（.ops）の絶対パスを設定し、開く。
Submit-DialogFilePath `
    -DialogHandle $dialogHandle `
    -FilePath $OpsFilePath

# .ops の読み込み後、ファイル選択ダイアログが閉じてメインウィンドウへ戻るまで待機する。
$mainWindowDeadline = [DateTime]::UtcNow.AddSeconds(10)
do {
    Start-Sleep -Milliseconds 100
    $currentForegroundWindow = [WindowApi]::GetForegroundWindow()
    if ($currentForegroundWindow -eq $mainWindowHandle) {
        break
    }
} while ([DateTime]::UtcNow -lt $mainWindowDeadline)

if ([WindowApi]::GetForegroundWindow() -ne $mainWindowHandle) {
    throw 'The application did not return to its main window after loading the ops file.'
}

# 2回目のファイル選択ダイアログを開く。
# Alt+F の後に↓で次の項目へ移動し、Enter で実行する。
Start-Sleep -Milliseconds 100
[System.Windows.Forms.SendKeys]::SendWait('%f')
Start-Sleep -Milliseconds 100
[System.Windows.Forms.SendKeys]::SendWait('{DOWN}')
[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')

$asmDialogHandle = [IntPtr]::Zero
$asmDialogDeadline = [DateTime]::UtcNow.AddSeconds(10)

# 2回目に開かれたダイアログを検出する。
do {
    Start-Sleep -Milliseconds 100

    $candidateHandle = [WindowApi]::GetForegroundWindow()
    [uint32]$ownerProcessId = 0
    [void][WindowApi]::GetWindowThreadProcessId(
        $candidateHandle,
        [ref]$ownerProcessId
    )

    if (
        $candidateHandle -ne [IntPtr]::Zero -and
        $candidateHandle -ne $mainWindowHandle -and
        $ownerProcessId -eq [uint32]$process.Id
    ) {
        $asmDialogHandle = $candidateHandle
        break
    }
} while ([DateTime]::UtcNow -lt $asmDialogDeadline)

if ($asmDialogHandle -eq [IntPtr]::Zero) {
    throw 'The ASM file selection dialog did not open within 10 seconds.'
}

if (
    [WindowApi]::GetForegroundWindow() -ne $asmDialogHandle -and
    -not [WindowApi]::SetForegroundWindow($asmDialogHandle)
) {
    throw 'Could not activate the ASM file selection dialog.'
}

# 2回目のダイアログへアクティブな ASM ファイルの絶対パスを設定し、開く。
Submit-DialogFilePath `
    -DialogHandle $asmDialogHandle `
    -FilePath $AsmFilePath
