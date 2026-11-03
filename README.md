# Minivim

minivim is a lightweight, single-file modal editor written in JavaScript for Node.js. It is designed as a zero-configuration, dependency-free alternative to Notepad for developers who need to quickly edit and execute PowerShell or Bash scripts without leaving the console.

## Quick Start

minivim requires **Node.js 16 or later** for the script version.

**Windows Users:** 
You can download the latest standalone executable directly via PowerShell:
```powershell
irm https://github.com/sevehub/minivim/releases/latest/download/minivim-windows-x64.exe -OutFile ~/.local/bin/minivim.exe
```


Since browsers often block `.js` downloads, the fastest way to install it is via the shell:

**PowerShell**
```powershell
irm https://raw.githubusercontent.com/sevehub/minivim/refs/heads/main/minivim.js -OutFile minivim.js
node minivim.js script.ps1
```
```
wget https://raw.githubusercontent.com/sevehub/PowerShellUtils/refs/heads/main/minivim.js 
node minivim.js script.ps1
```

## Key Features

*   **Integrated Terminal Pane:** Open a terminal within the editor using `:term` and switch focus with `Ctrl-W`.
*   **Instant Execution:** Press `F5` or type `:run [args]` to save your buffer and execute the script immediately.
*   **Smart Error Navigation:** When scripts report errors, use `:cn` and `:cp` to jump directly to the problematic line and character.
*   **Shell Filtering:** Pipe buffer ranges into shell commands (e.g., `:%!Sort-Object -Unique`) to modify text using the power of your shell.
*   **Multi-Language Support:** 
    *   **PowerShell:** Automatic syntax highlighting for `.ps1`, `.psm1`, and `.psd1`. Includes a dedicated `:dryrun` (F6) mode using `$WhatIfPreference` to simulate changes.
    *   **Bash:** Support for `.sh`, `.bash`, and other shell scripts. Includes `:dryrun` via `bash -n` and `shellcheck`.
*   **Keystroke HUD:** Toggle a visual heads-up display with `F2` to see your most recent keystrokes color-coded by mode.
*   **Zero Config:** No setup required. It detects your system shell automatically and starts instantly.
*   **Easy Exit:** Quick exit via `Ctrl-Q`.

## Command Reference

| Category | Commands |
| :--- | :--- |
| **File Mgmt** | `:w [file]` (save), `:e [file]` (open/switch), `:enew` (new), `:wa` (save all), `:bd` (close buffer) |
| **Navigation** | `h, j, k, l` (move), `gg/G` (top/bottom), `:N` (goto line), `:bn / :bp` (next/prev buffer) |
| **Execution** | `F5` (run), `:run [args]` (run with args), `F6` or `:dryrun` (simulated run) |
| **Terminal** | `:term` (open), `:termclose` (close), `:resize N` (change height), `:!cmd` (run single cmd) |
| **Editing** | `i, a, o` (insert), `v, V` (visual), `d, y, c` (delete, yank, change), `u` (undo), `Ctrl-R` (redo) |
| **System** | `:q` (quit), `:qa!` (force quit all), `:wqa` (save all and quit), `Ctrl-Q` (quick exit) |

## Known Limitations

*   **Terminal:** Uses plain pipes rather than a pseudo-terminal; interactive full-screen apps (like `htop` or `vim`) will not work in the pane.
*   **Formatting:** Tabs are converted to two spaces upon loading.
*   **Vim Parity:** Dot-repeat, text objects (`diw`), named registers, marks, macros, and split windows are not currently implemented.
*   **Undo:** Uses snapshot-based undo, optimized for moderate file sizes.
