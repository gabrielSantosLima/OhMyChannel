$proj = Split-Path -Parent $PSScriptRoot
$exe = Join-Path $proj "node_modules\electron\dist\electron.exe"
$ico = Join-Path $proj "assets\icon.ico"

if (-not (Test-Path $exe)) {
    Write-Error "electron.exe nao encontrado em $exe. Rode 'npm install' primeiro."
    exit 1
}

$ws = New-Object -ComObject WScript.Shell

$targets = @(
    [Environment]::GetFolderPath("Desktop"),
    (Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs")
)

foreach ($dir in $targets) {
    if (-not (Test-Path $dir)) { continue }
    $lnkPath = Join-Path $dir "OhMyChannel.lnk"
    $lnk = $ws.CreateShortcut($lnkPath)
    $lnk.TargetPath = $exe
    $lnk.Arguments = '"' + $proj + '"'
    $lnk.WorkingDirectory = $proj
    if (Test-Path $ico) { $lnk.IconLocation = "$ico,0" }
    $lnk.Description = "OhMyChannel - pre-upload de videos no YouTube"
    $lnk.Save()
    Write-Output "Atalho criado: $lnkPath"
}
