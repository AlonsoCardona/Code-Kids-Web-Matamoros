# Script de inicio automatico CodeKids con Ollama IA
Write-Host "Iniciando CodeKids con Cody IA (Ollama)..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar e iniciar Ollama
Write-Host "Verificando Ollama..." -ForegroundColor Cyan
try {
    $ollamaCheck = Get-Process ollama -ErrorAction SilentlyContinue
    if ($ollamaCheck) {
        Write-Host "  Ollama ya esta corriendo" -ForegroundColor Green
    } else {
        Write-Host "  Iniciando Ollama..." -ForegroundColor Yellow
        Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        Write-Host "  Ollama iniciado" -ForegroundColor Green
    }
    
    # Precargar modelo en memoria para respuestas rápidas
    Write-Host "  Precargando modelo llama3.2:3b..." -ForegroundColor Yellow
    $body = @{ model='llama3.2:3b'; prompt='test'; stream=$false; keep_alive='30m' } | ConvertTo-Json
    $null = Invoke-WebRequest -Uri http://127.0.0.1:11434/api/generate -Method POST -ContentType 'application/json' -Body $body -TimeoutSec 60 -ErrorAction SilentlyContinue
    Write-Host "  Modelo cargado y listo" -ForegroundColor Green
} catch {
    Write-Host "  Advertencia: No se pudo verificar Ollama" -ForegroundColor Yellow
    Write-Host "  Si Cody IA no funciona, ejecuta: ollama serve" -ForegroundColor Yellow
}
Write-Host ""

# 2. Limpiar puertos
Write-Host "Limpiando puertos ocupados..." -ForegroundColor Cyan
$ports = @(5001, 5002, 9099, 10080, 4001, 4401, 4501)
foreach ($port in $ports) {
    $pids = netstat -ano | Select-String ":$port " | ForEach-Object { if ($_ -match '\s+(\d+)\s*$') { $matches[1] } }
    $pids | ForEach-Object {
        try {
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
            Write-Host "  Puerto $port liberado" -ForegroundColor Gray
        } catch {}
    }
}

Start-Sleep -Seconds 2
Write-Host "Puertos limpios" -ForegroundColor Green
Write-Host ""

# 3. Verificar dependencias
Write-Host "Verificando dependencias..." -ForegroundColor Cyan
$functionsPath = Join-Path $PSScriptRoot "functions"

if (-not (Test-Path "$functionsPath\node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    Push-Location $functionsPath
    npm install
    Pop-Location
}

Write-Host "Dependencias OK" -ForegroundColor Green
Write-Host ""

# 4. Iniciar emuladores
Write-Host "Iniciando Firebase Emulators..." -ForegroundColor Cyan
Write-Host "- Hosting: http://127.0.0.1:5002" -ForegroundColor Gray
Write-Host "- Functions: http://127.0.0.1:5001" -ForegroundColor Gray
Write-Host "- Auth: http://127.0.0.1:9099" -ForegroundColor Gray
Write-Host "- Firestore: http://127.0.0.1:10080" -ForegroundColor Gray
Write-Host "- UI: http://127.0.0.1:4001" -ForegroundColor Gray
Write-Host "- Cody IA: Ollama (local)" -ForegroundColor Magenta
Write-Host ""

cd $PSScriptRoot
firebase emulators:start --project demo-codekids
