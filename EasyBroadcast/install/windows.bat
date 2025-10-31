@echo off
:: Script di installazione per EasyBroadcast
title EasyBroadcast - Installazione
color 0b
cls

echo =====================================================
echo     EasyBroadcast - Installer per Windows
echo =====================================================
echo.

:: --- 1. Imposta Percorsi ---
set "DESKTOP=%USERPROFILE%\Desktop"
set "APP_DIR=%DESKTOP%\EasyBroadcast"
:: Percorso dati modificato come da richiesta
set "DATA_DIR=%APP_DIR%\eb_data"
set "IMG_DIR=%DATA_DIR%\img"

echo [INFO] Installazione sul Desktop in corso...
echo.

:: --- 2. Crea Cartelle ---
if not exist "%APP_DIR%" mkdir "%APP_DIR%"
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%IMG_DIR%" mkdir "%IMG_DIR%"
echo [OK] Cartelle create: %IMG_DIR%
echo.

:: --- 3. Controlla Python ---
echo [1/3] Controllo Python 3...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRORE] Python 3 non trovato.
    echo Per favore installalo dal Microsoft Store o da python.org.
    echo Premi un tasto per uscire.
    pause >nul
    exit /b
)
echo [OK] Python 3 trovato.
echo.

:: --- 4. Installa Dipendenze ---
echo [2/3] Installazione dipendenze Python...
python -m pip install --upgrade pip >nul
echo [INFO] Installo: python-telegram-bot Pillow requests Markdown tkhtmlview...
python -m pip install python-telegram-bot Pillow requests Markdown tkhtmlview >nul
if %errorlevel% neq 0 (
    echo [ERRORE] Impossibile installare le dipendenze.
    echo Controlla la tua connessione internet e assicurati di eseguire
    echo questo script come Amministratore se hai problemi di permessi.
    echo Premi un tasto per uscire.
    pause >nul
    exit /b
)
echo [OK] Dipendenze installate.
echo.

:: --- 5. Scarica File Principali ---
echo [3/3] Download dei file principali...

set "SCRIPT_URL=https://downloads.kekkotech.com/EasyBroadcast/updates/easybroadcast.py"
set "LOGO_URL=https://downloads.kekkotech.com/EasyBroadcast/install/logo.png"

set "SCRIPT_DEST=%APP_DIR%\EasyBroadcast.py"
:: Destinazione logo modificata
set "LOGO_DEST=%IMG_DIR%\logo.png"

:: Ritorno a PowerShell con gestione degli errori try...catch migliorata
echo [INFO] Download di easybroadcast.py...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '%SCRIPT_URL%' -OutFile '%SCRIPT_DEST%' } catch { Write-Host '[PS_ERROR] Errore durante il download del file:'; Write-Error $_; exit 1 }"
if %errorlevel% neq 0 (
    echo [ERRORE] Download fallito: easybroadcast.py
    echo Controlla la tua connessione internet e i permessi.
    echo L'errore specifico di PowerShell e' stato mostrato sopra.
    echo Premi un tasto per uscire.
    pause >nul
    exit /b
)

echo [INFO] Download di logo.png...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '%LOGO_URL%' -OutFile '%LOGO_DEST%' } catch { Write-Host '[PS_ERROR] Errore durante il download del file:'; Write-Error $_; exit 1 }"
if %errorlevel% neq 0 (
    echo [ERRORE] Download fallito: logo.png
    echo Controlla la tua connessione internet e i permessi.
    echo L'errore specifico di PowerShell e' stato mostrato sopra.
    echo Premi un tasto per uscire.
    pause >nul
    exit /b
)

echo [OK] File scaricati con successo.
echo.

:: --- 6. Fine ---
echo =====================================================
echo ? Installazione completata!
echo I file sono stati salvati in:
echo %APP_DIR%
echo.
echo Puoi avviare EasyBroadcast dal collegamento
echo "Avvia EasyBroadcast.py" che trovi sul tuo Desktop nella carteòòa "EasyBroadcast".
echo =====================================================
echo.
echo Premi un tasto per chiudere.
pause >nul
exit

