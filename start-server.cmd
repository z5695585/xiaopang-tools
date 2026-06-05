@echo off
cd /d "%~dp0server"
set "PATH=C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Program Files\nodejs;C:\Windows\system32;C:\Windows;C:\Windows\System32\WindowsPowerShell\v1.0"
npm.cmd run dev
