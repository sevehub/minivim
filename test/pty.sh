#!/usr/bin/env bash
# Interactive tests: runs minivim.js inside a pseudo-terminal, sends real key bytes, checks files and screens.
# Needs bash, node, `script` and `timeout`. Linux and macOS only (not Windows). Takes about two minutes.
#   bash tests/pty.sh              (PTY_SCALE=2 bash tests/pty.sh on a slow machine)
set -u
cd "$(dirname "$0")/.."
MV="node $PWD/minivim.js"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0
ok()    { pass=$((pass+1)); printf '  ok    %s\n' "$1"; }
bad()   { fail=$((fail+1)); printf '  FAIL  %s\n' "$1"; }
check() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (got '$2', want '$3')"; fi; }
contains() { if grep -q -- "$3" "$2"; then ok "$1"; else bad "$1 (missing: $3)"; fi; }
lacks()    { if grep -q -- "$3" "$2"; then bad "$1 (unexpected: $3)"; else ok "$1"; fi; }
TO=timeout; command -v timeout >/dev/null || TO=gtimeout
# Slow machines (CI): PTY_SCALE=2 doubles every wait and the per-run timeout.
SCALE=${PTY_SCALE:-1}
nap() { sleep "$(awk "BEGIN{print $1*$SCALE}")"; }

# pty <screen-file> <args...>  : keys come on stdin; prints the exit status (124 = editor still running when input ended)
pty() {
  local out=$1; shift
  if script --version 2>&1 | grep -q util-linux; then
    $TO $((15*SCALE)) script -qec "stty rows 24 cols 100; $MV $*" /dev/null > "$out" 2>&1
  else
    $TO $((15*SCALE)) script -q /dev/null sh -c "stty rows 24 cols 100; $MV $*" > "$out" 2>&1
  fi
  echo $?
}
plain() { node -e 'process.stdout.write(require("fs").readFileSync(process.argv[1],"latin1").replace(/\x1b\[[0-9;?]*[A-Za-z]/g,"").replace(/\r/g,""))' "$1" > "$1.txt"; echo "$1.txt"; }

ESC='\033'; CQ='\021'; CS='\023'; CC='\003'; CZ='\032'; F5='\033[15~'
MSG='Unsaved changes: Ctrl-Q again to discard, Ctrl-S to save'
F=$TMP/q.txt; reset() { printf 'hello\n' > "$F"; }

echo "Ctrl-Q quit behaviour"
reset; rc=$( { nap 1; printf "$CQ"; nap 1; } | pty $TMP/o1 $F );                                          check "clean buffer quits at once" "$rc" 0
reset; rc=$( { nap 1; printf "i" ; printf x; printf "$ESC"; nap .3; printf "$CQ"; nap .4; printf "$CQ"; nap 1; } | pty $TMP/o2 $F )
check "double press quits" "$rc" 0; check "double press discards the change" "$(cat $F)" hello
reset; rc=$( { nap 1; printf "ix$ESC"; nap .3; printf "$CQ"; nap 1; } | pty $TMP/o3 $F )
check "single press on a modified buffer does not quit" "$rc" 124; contains "single press shows the warning" "$(plain $TMP/o3)" "$MSG"
reset; rc=$( { nap 1; printf "ix$ESC"; nap .3; printf "$CQ"; nap .4; printf j; nap .3; printf "$CQ"; nap 1; } | pty $TMP/o4 $F )
check "another key disarms (second Ctrl-Q arms again, no quit)" "$rc" 124
reset; rc=$( { nap 1; printf "ix$ESC"; nap .3; printf "$CQ"; nap 3.6; printf "$CQ"; nap 1; } | pty $TMP/o5 $F )
check "timeout disarms (second Ctrl-Q arms again, no quit)" "$rc" 124
reset; rc=$( { nap 1; printf "ix$ESC"; nap .3; printf ":term\r"; nap .5; printf "$CQ"; nap 1; } | pty $TMP/o6 $F )
check "Ctrl-Q in the terminal pane does not quit" "$rc" 124; lacks "Ctrl-Q in the terminal pane does not arm" "$(plain $TMP/o6)" "$MSG"
reset; rc=$( { nap 1; printf "ix$ESC"; nap .3; printf "$CQ"; nap .4; printf "$CS"; nap .5; printf "$CQ"; nap 1; } | pty $TMP/o7 $F )
check "Ctrl-S saves, then Ctrl-Q quits at once" "$rc" 0; check "Ctrl-S wrote the change" "$(cat $F)" xhello
reset; rc=$( { nap 1; printf "$CC"; nap .3; printf "$CZ"; nap 1; } | pty $TMP/o8 $F )
check "Ctrl-C and Ctrl-Z do not quit" "$rc" 124
rc=$( { nap 6.5; } | pty $TMP/o9 )
node -e 'const f=require("fs").readFileSync(process.argv[1],"latin1").split("\x1b[H").slice(1).map(x=>x.replace(/\x1b\[[0-9;?]*[A-Za-z]/g,""));
const h=f.map(x=>x.includes("Ctrl-Q to quit")); console.log(h[0] && !h[h.length-1] ? "OK" : "BAD")' $TMP/o9 | { read r; check "startup hint shows, then expires after 5 s" "$r" OK; }

echo "Text objects and operators through the real key parser"
printf 'say "hello world" now\n<b>hi</b>\nfoo bar\n\npara one\nstill one\n\nlast\n' > $F
{ nap 1; printf 'fhdi"'; nap .2; printf j; printf 'fhdit'; nap .2; printf j; printf '0gUiw'; nap .2; printf 'jj0d}'; nap .2; printf ':wq\r'; nap 1; } | pty $TMP/o10 $F >/dev/null
check "di\" dit gUiw d} on a real file" "$(tr '\n' '|' < $F)" 'say "" now|<b></b>|FOO bar|||last|'

if command -v bash >/dev/null; then
echo "bash pane and script runs"
cat > $TMP/s.sh <<'EOS'
#!/bin/bash
name="world"
echo "hello $name"
foo_missing_command
EOS
{ nap 1; printf ':!cd /tmp\r'; nap 1; printf "$ESC"; printf ':!pwd\r'; nap 1; printf "$ESC"
  printf ':!export FOO=bar\r'; nap 1; printf "$ESC"; printf ':!echo foo=$FOO\r'; nap 1; printf "$ESC"
  printf "$F5"; nap 2; printf ':cn\r'; nap .5
  printf ':!sleep 30\r'; nap 1; printf "$CC"; nap 1; printf "$ESC"
  printf ':!echo alive\r'; nap 1; printf "$ESC"; printf ':qa!\r'; nap .5; } | pty $TMP/o11 $TMP/s.sh >/dev/null
P=$(plain $TMP/o11)
contains "cd persists between pane commands" "$P" '^/tmp$'
contains "export persists between pane commands" "$P" 'foo=bar'
contains "F5 runs the script" "$P" 'hello world'
contains "bash error is reported with its line" "$P" 's.sh: line 4: foo_missing_command'
contains ":cn jumps to the error" "$P" 'error 1/1'
contains "Ctrl-C interrupts the command" "$P" '\[exit 130\]'
contains "the session survives Ctrl-C" "$P" '^alive$'
fi

echo; echo "pass $pass, fail $fail"
[ $fail -eq 0 ]
