@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo ERROR: Debes instalar Node.js 22 o superior para enviar correos.
 echo https://nodejs.org/
 pause
 exit /b 1
)
if not exist "correo.config.json" (
 echo No se encontro correo.config.json.
 echo Copia correo.config.EJEMPLO.json como correo.config.json y completa la configuracion.
 echo El sitio web abrira, pero los formularios NO enviaran correos hasta que lo configures.
 pause
)
start "" "http://127.0.0.1:3000"
node server.mjs
if errorlevel 1 pause
