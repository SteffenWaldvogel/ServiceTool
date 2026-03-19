# backup.ps1 – Automatisches PostgreSQL-Backup fuer ServiceTool
# Aufruf: .\scripts\backup.ps1
# Einrichten via Windows Task Scheduler fuer taeglich automatisches Backup
#
# Task Scheduler Einrichtung:
#   Trigger: Taeglich, z.B. 02:00 Uhr
#   Aktion:  powershell.exe -NonInteractive -File "C:\ServiceTool\scripts\backup.ps1"
#   Starten in: C:\ServiceTool

param(
    [string]$BackupDir = "C:\ServiceTool\backups",
    [string]$DbName    = "servicetickets",
    [string]$DbUser    = "postgres",
    [string]$DbHost    = "localhost",
    [int]   $DbPort    = 5432,
    [int]   $KeepDays  = 30
)

# DB_PASSWORD aus Umgebungsvariable – niemals hardkodiert
$env:PGPASSWORD = $env:DB_PASSWORD
if (-not $env:PGPASSWORD) {
    Write-Error "DB_PASSWORD Umgebungsvariable nicht gesetzt!"
    exit 1
}

$pgDump  = "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
$gzip    = "C:\Program Files\Git\usr\bin\gzip.exe"

# Pruefen ob pg_dump vorhanden
if (-not (Test-Path $pgDump)) {
    Write-Error "pg_dump nicht gefunden: $pgDump"
    exit 1
}

# Backup-Ordner anlegen falls nicht vorhanden
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Write-Host "Backup-Ordner erstellt: $BackupDir"
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$filename  = "${DbName}_${timestamp}.sql"
$outPath   = Join-Path $BackupDir $filename

Write-Host "==> Starte Backup: $outPath"

# pg_dump ausfuehren
& $pgDump `
    --host=$DbHost `
    --port=$DbPort `
    --username=$DbUser `
    --dbname=$DbName `
    --format=plain `
    --no-password `
    --file=$outPath

if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_dump fehlgeschlagen! Exit code: $LASTEXITCODE"
    exit 1
}

# Komprimieren wenn gzip verfuegbar
if (Test-Path $gzip) {
    & $gzip $outPath
    $outPath = "$outPath.gz"
    Write-Host "==> Komprimiert: $outPath"
} else {
    Write-Warning "gzip nicht gefunden – Backup nicht komprimiert."
}

$size = [math]::Round((Get-Item $outPath).Length / 1MB, 2)
Write-Host "==> Backup erfolgreich: $outPath ($size MB)"

# Alte Backups loeschen (aelter als $KeepDays Tage)
$deleted = 0
Get-ChildItem -Path $BackupDir -Filter "${DbName}_*.sql*" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
    ForEach-Object {
        Remove-Item $_.FullName -Force
        $deleted++
    }

if ($deleted -gt 0) {
    Write-Host "==> Cleanup: $deleted Backup(s) aelter als $KeepDays Tage entfernt."
}

Write-Host "==> Fertig."
