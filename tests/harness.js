// Loads minivim.js without starting the editor and drives it key by key.
// This file is the only place that touches minivim.js internals (S, onKey, parseKeys), so a refactor
// only has to adapt the few lines marked ADAPTER; the cases in unit.js stay unchanged.
const fs = require('fs');
const path = require('path');

const FILE = process.env.MINIVIM || path.join(__dirname, '..', 'minivim.js');

function load() {
  let src = fs.readFileSync(FILE, 'utf8').replace(/^#![^\n]*\n/, '');
  src = src.replace(/\nstart\(\);\s*$/, '\nmodule.exports = { S, T, onKey, parseKeys };');   // ADAPTER: what to expose
  const m = { exports: {} };
  new Function('require', 'module', 'exports', 'process', src)(require, m, m.exports, process);
  return m.exports;
}

const E = load();

// Runs keys against text; '|' marks the starting cursor. Returns the resulting text, cursor, mode, message, register.
function run(text, keys) {
  const { S, onKey, parseKeys } = E;
  const ci = text.indexOf('|');
  if (ci < 0) throw new Error('test text needs a | cursor marker: ' + JSON.stringify(text));
  const before = text.slice(0, ci) + text.slice(ci + 1);
  // ADAPTER: reset a fresh document and place the cursor
  S.lines = before.split('\n'); S.mode = 'NORMAL'; S.op = null; S.count = ''; S.pend = ''; S.msg = '';
  S.undo = []; S.redo = []; S.dirty = false; S.hud = false; S.reg = { text: [], lw: false }; S.lastFind = null;
  const upTo = text.slice(0, ci).split('\n');
  S.cy = upTo.length - 1; S.cx = upTo[upTo.length - 1].length; S.want = S.cx;
  for (const k of parseKeys(keys)) onKey(k);                                                // ADAPTER: feed keys
  return { text: S.lines.join('\n'), cy: S.cy, cx: S.cx, mode: S.mode, msg: S.msg, reg: S.reg };   // ADAPTER: read state
}

module.exports = { run, E, FILE };
