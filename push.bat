@echo off
REM Chiedi il messaggio di commit
set /p commit_msg="Inserisci il messaggio di commit: "

REM Aggiungi tutti i cambiamenti
git add .

REM Esegui il commit
git commit -m "%commit_msg%"

REM Esegui il push su GitHub
git push origin main

echo "Push effettuato con successo!"
pause
