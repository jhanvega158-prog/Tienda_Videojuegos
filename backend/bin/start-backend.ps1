param([string]$EnvFile = (Join-Path $PSScriptRoot '.env'))
$ErrorActionPreference = 'Stop'
$allowed = @('PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_MODE','PAYPAL_WEBHOOK_ID',
    'FRONTEND_URL','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','DATABASE_URL','DATABASE_USERNAME','DATABASE_PASSWORD','PORT')
if (Test-Path -LiteralPath $EnvFile) {
    foreach ($line in [System.IO.File]::ReadAllLines((Resolve-Path -LiteralPath $EnvFile))) {
        if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith('#')) { continue }
        $pair = $line -split '=', 2
        if ($pair.Count -ne 2 -or $allowed -notcontains $pair[0].Trim()) { throw 'Variable no reconocida en .env. Revisa los nombres, sin publicar sus valores.' }
        # Literal values only. Never evaluate shell expressions from a credentials file.
        [Environment]::SetEnvironmentVariable($pair[0].Trim(), $pair[1], 'Process')
    }
}
foreach ($name in @('PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','DATABASE_URL','DATABASE_USERNAME','DATABASE_PASSWORD')) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name,'Process'))) { throw "Falta configurar $name en backend/.env o en el entorno del proceso." }
}
if ($env:PAYPAL_MODE -and $env:PAYPAL_MODE -ne 'sandbox') { throw 'Solo Sandbox esta habilitado.' }
$env:PAYPAL_MODE = 'sandbox'
Push-Location $PSScriptRoot
try {
    # Maven and the forked application both need the trusted Windows certificates.
    $env:MAVEN_OPTS = "$env:MAVEN_OPTS -Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NONE"
    & .\mvnw.cmd spring-boot:run '-Dspring-boot.run.jvmArguments=-Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NONE'
    if ($LASTEXITCODE -ne 0) { throw 'Spring Boot no pudo iniciarse.' }
}
finally { Pop-Location }
