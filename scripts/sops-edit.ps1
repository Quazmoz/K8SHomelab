param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Path
)

$ErrorActionPreference = "Stop"

$resolvedPath = (Resolve-Path -LiteralPath $Path).Path
$sopsCommand = Get-Command sops.exe -ErrorAction SilentlyContinue
if (-not $sopsCommand) {
    throw "sops.exe was not found on PATH."
}

$codeCommand = Get-Command Code.exe -ErrorAction SilentlyContinue
if ($codeCommand) {
    $env:SOPS_EDITOR = "Code.exe --wait"
} else {
    $notepadCommand = Get-Command notepad.exe -ErrorAction SilentlyContinue
    if ($notepadCommand) {
        $env:SOPS_EDITOR = "notepad.exe"
    }
}

if (-not $env:SOPS_EDITOR) {
    throw "No editor found. Install VS Code or set SOPS_EDITOR explicitly."
}

Write-Host "Opening $resolvedPath with SOPS_EDITOR=$env:SOPS_EDITOR"
& $sopsCommand.Source $resolvedPath
