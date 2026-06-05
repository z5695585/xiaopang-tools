@echo off
cd /d "%~dp0client"
set "PATH=C:\Program Files\nodejs;C:\Windows\system32;C:\Windows;C:\Windows\System32\WindowsPowerShell\v1.0"
npm.cmd run dev -- --host 127.0.0.1
