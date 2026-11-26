# EVALIA: diagnósticos locales sin credenciales, cambios de configuración ni backups.
# Ejecutar desde PowerShell en el PC destinado a respaldos.
$ErrorActionPreference = 'Stop'
$checks = @(
    @{ Name='Node.js'; Command='node'; Arguments=@('--version') },
    @{ Name='Git'; Command='git'; Arguments=@('--version') },
    @{ Name='Supabase CLI'; Command='supabase'; Arguments=@('--version') },
    @{ Name='Docker CLI'; Command='docker'; Arguments=@('--version') },
    @{ Name='AWS CLI'; Command='aws'; Arguments=@('--version') },
    @{ Name='tar'; Command='tar'; Arguments=@('--version') },
    @{ Name='age'; Command='age'; Arguments=@('--version') },
    @{ Name='age-keygen'; Command='age-keygen'; Arguments=@('--version') },
    @{ Name='psql'; Command='psql'; Arguments=@('--version') }
)
$missing = @()
foreach ($check in $checks) {
    if (-not (Get-Command $check.Command -ErrorAction SilentlyContinue)) {
        Write-Host ('FALTA: ' + $check.Name)
        $missing += $check.Name
        continue
    }
    try {
        $result = & $check.Command @($check.Arguments) 2>&1
        if ($LASTEXITCODE -ne 0) { throw 'Comando no disponible' }
        $first = @($result)[0].ToString().Trim()
        Write-Host ('OK: ' + $check.Name + ' - ' + $first)
    } catch {
        Write-Host ('REVISAR: ' + $check.Name)
        $missing += $check.Name
    }
}
if (Get-Command docker -ErrorAction SilentlyContinue) {
    try {
        $null = & docker info --format '{{.ServerVersion}}' 2>&1
        if ($LASTEXITCODE -ne 0) { throw 'Docker no disponible' }
        Write-Host 'OK: motor Docker accesible'
    } catch {
        Write-Host 'REVISAR: iniciar Docker Desktop'
        $missing += 'Motor Docker'
    }
}
Write-Host '---'
if ($missing.Count -eq 0) {
    Write-Host 'PRECHECK: herramientas detectadas. Aún faltan configurar rutas privadas, cifrado de volumen, credenciales y ensayo de recuperación.'
} else {
    Write-Host ('PRECHECK: faltan o requieren revisión ' + $missing.Count + ' componentes.')
}
Write-Host 'No se leyeron claves, contraseñas, archivos de configuración ni datos comerciales.'
