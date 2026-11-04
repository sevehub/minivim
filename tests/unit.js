// Unit tests for minivim.js: node tests/unit.js   (set MINIVIM=/path/to/minivim.js to test another copy)
const { run, FILE } = require('./harness');
let pass = 0, fail = 0;
const t = (name, text, keys, expect, extra) => {
  let r; try { r = run(text, keys); } catch (e) { r = { text: 'EXC ' + e.stack.split('\n').slice(0, 3).join(' | ') }; }
  const ok = r.text === expect && (!extra || extra(r));
  if (ok) pass++; else { fail++; console.log('FAIL', name, '\n  got   :', JSON.stringify(r.text), r.cy !== undefined ? `@${r.cy}:${r.cx}` : '', '\n  expect:', JSON.stringify(expect)); }
};
const pos = (cy, cx) => (r) => r.cy === cy && r.cx === cx;
const ESC = '\x1b';

// ---- paragraph motions and the exclusive-linewise rule
t('} moves to blank line', '|a\nb\n\nc', '}', 'a\nb\n\nc', pos(2, 0));
t('{ moves back to blank', 'a\n\nb\n|c', '{', 'a\n\nb\nc', pos(1, 0));
t('d} whole paragraph is linewise', '|a\nb\n\nc', 'd}', '\nc');
t('d} from mid paragraph stays charwise', 'a\nb|cd\nef\n\nc', 'd}', 'a\nb\n\nc');
t('} at last paragraph goes to end', 'a\n|b\nc', '}', 'a\nb\nc', pos(2, 0));
t('2} skips two paragraphs', '|a\n\nb\n\nc', '2}', 'a\n\nb\n\nc', pos(3, 0));
t('y} then p', '|a\nb\n\nz', 'y}Gp', 'a\nb\n\nz\na\nb');
// ---- f F t T ; ,
t('df,', 'ab|cd,ef,gh', 'f,', 'abcd,ef,gh', pos(0, 4));
t('df, deletes through the char', 'a|bc,de', 'df,', 'ade');
t('dF, deletes back to the char', 'a,bc|d', 'dF,', 'ad');
t('dt,', '|abc,de', 'dt,', ',de');
t('dT,', 'a,bc|d', 'dT,', 'a,d');
t('; repeats f', '|a,b,c,d', 'f,;', 'a,b,c,d', pos(0, 3));
t(', reverses', 'a,b,c|,d', 'F,,', 'a,b,c,d', pos(0, 5));
t('d; deletes to next match (inclusive)', '|a,b,c', 'f,d;', 'ac');
t('2fa', '|xaxaxa', '2fa', 'xaxaxa', pos(0, 3));
t('fx not found keeps cursor', '|abc', 'fz', 'abc', pos(0, 0));
t('t then ; does not stick', '|a,b,c,d', 't,;', 'a,b,c,d', pos(0, 2));
t('c f x', '|abcxdef', 'cfxZ' + ESC, 'Zdef');
t('f cancelled by Esc', '|abc', 'f' + ESC + 'x', 'bc');
// ---- w b B W E and the dw rule
t('dw last word does not join', 'foo |bar\nbaz', 'dw', 'foo \nbaz');
t('dw mid line', '|foo bar', 'dw', 'bar');
t('d2w', '|a b c d', 'd2w', 'c d');
t('db', 'foo b|ar', 'db', 'foo ar');
t('dB WORD', 'x a.b-c|d', 'dB', 'x d');
t('db word with punctuation', 'x a.b-c|d', 'db', 'x a.b-d');
t('dW', '|a.b c', 'dW', 'c');
t('W moves by WORD', '|a.b c.d e', 'W', 'a.b c.d e', pos(0, 4));
t('B moves back by WORD', 'a.b c.d |e', 'B', 'a.b c.d e', pos(0, 4));
t('E end of WORD', '|a.b c', 'E', 'a.b c', pos(0, 2));
t('dE', '|a.b c', 'dE', ' c');
t('ge', 'foo ba|r', 'ge', 'foo bar', pos(0, 2));
t('gE', 'a.b c|d', 'gE', 'a.b cd', pos(0, 2));
t('dge is inclusive at both ends', 'foo ba|r', 'dge', 'fo');
// ---- g_ gj gk g0 g^ g$ _ + -
t('g_', '|ab  ', 'g_', 'ab  ', pos(0, 1));
t('dg_ keeps trailing blanks', '|ab  ', 'dg_', '  ');
t('gj', '|a\nb', 'gj', 'a\nb', pos(1, 0));
t('g$', '|abc', 'g$', 'abc', pos(0, 2));
t('g0', 'ab|c', 'g0', 'abc', pos(0, 0));
t('g^', '  a|b', 'g^', '  ab', pos(0, 2));
t('+', '|a\n  b', '+', 'a\n  b', pos(1, 2));
t('-', 'a\n|  b', '-', 'a\n  b', pos(0, 0));
t('_', '  |ab', '_', '  ab', pos(0, 2));
// ---- %
t('% to closer', '|(a(b)c)', '%', '(a(b)c)', pos(0, 6));
t('% back', '(a(b)c|)', '%', '(a(b)c)', pos(0, 0));
t('% multi-line', '|{\na\n}', '%', '{\na\n}', pos(2, 0));
t('d%', '|(ab) c', 'd%', ' c');
t('% jumps from before bracket', 'x |y (a)', '%', 'x y (a)', pos(0, 6));
// ---- quotes
t('di"', 'a "b|c" d', 'di"', 'a "" d');
t('da"', 'a "b|c" d', 'da"', 'a d');
t("di'", "a 'b|c' d", "di'", "a '' d");
t('di` ', 'a `b|c` d', 'di`', 'a `` d');
t('di" cursor before quote', '|a "bc" d', 'di"', 'a "" d');
t('di" second string', '"a" |"b" "c"', 'di"', '"a" "" "c"');
t('da" no trailing space takes leading', 'x "b|c"', 'da"', 'x');
t('di" escaped quote inside', 'a "b\\"c|d" e', 'di"', 'a "" e');
t('di" no quotes', 'a|bc', 'di"', 'abc');
t('ci"', 'a "b|c" d', 'ci"X' + ESC, 'a "X" d');
t('yi" p', 'a "b|c" d', 'yi"$p', 'a "bc" dbc');
// ---- brackets
t('di(', 'f(a, (b)|, c)', 'di(', 'f()');
t('di( inner nested', 'f(a, (|b), c)', 'di(', 'f(a, (), c)');
t('da(', 'f(a|b) x', 'da(', 'f x');
t('dib alias', 'f(a|b)', 'dib', 'f()');
t('di[', '[a, |b]', 'di[', '[]');
t('di{ on bracket', '|{a}', 'di{', '{}');
t('diB multi-line keeps bracket lines', 'f {\n  a\n  |b\n}', 'diB', 'f {\n}');
t('di< angle', '<a|b>', 'di<', '<>');
t('di) from closer', '(ab|)', 'di)', '()');
t('ci(', 'f(a|b)', 'ci(X' + ESC, 'f(X)');
t('di( cursor outside', 'a|b (c)', 'di(', 'ab (c)');
t('di( empty', '(|)', 'di(', '()');
// ---- tags
t('dit', '<b>he|llo</b>', 'dit', '<b></b>');
t('dat', 'x <b>he|llo</b> y', 'dat', 'x  y');
t('dit nested picks innermost', '<div><b>h|i</b> yo</div>', 'dit', '<div><b></b> yo</div>');
t('dit from outer text', '<div>|a <b>i</b></div>', 'dit', '<div></div>');
t('dit with cursor on a nested open tag picks that element', '<div>a |<b>i</b></div>', 'dit', '<div>a <b></b></div>');
t('dit with attributes', '<a href="x>y">te|xt</a>', 'dit', '<a href="x>y"></a>');
t('dit multi-line', '<div>\n  t|ext\n</div>', 'dit', '<div></div>');
t('dit ignores void br', '<p>a<br>b|c</p>', 'dit', '<p></p>');
t('dit ignores self-closing', '<p>a<br />b|c</p>', 'dit', '<p></p>');
t('dit case-insensitive close', '<DIV>a|b</div>', 'dit', '<DIV></div>');
t('cit', '<b>he|llo</b>', 'citX' + ESC, '<b>X</b>');
t('dit on the tag itself', '<b>x</b|>', 'dit', '<b></b>');
t('dit none', 'a|b', 'dit', 'ab');
t('dit unclosed outer', '<div><b>a|b</b>', 'dit', '<div><b></b>');
t('yit p', '<b>a|b</b>', 'yit$p', '<b>ab</b>ab');
// ---- words and paragraphs objects
t('diw', 'foo b|ar baz', 'diw', 'foo  baz');
t('daw', 'foo b|ar baz', 'daw', 'foo baz');
t('daw at end takes leading space', 'foo b|ar', 'daw', 'foo');
t('diW', 'a.b|c d', 'diW', ' d');
t('diw on spaces', 'a|  b', 'diw', 'ab');
t('ciw', 'foo b|ar', 'ciwX' + ESC, 'foo X');
t('dip', 'a\nb|\n\nc', 'dip', '\nc');
t('dap', 'a\nb|\n\nc', 'dap', 'c');
t('dap last paragraph takes preceding blank', 'a\n\nb|', 'dap', 'a');
// ---- case operators and ~
t('gUiw', 'foo b|ar', 'gUiw', 'foo BAR');
t('guiw', 'FOO B|AR', 'guiw', 'FOO bar');
t('g~iw', 'fo|o', 'g~iw', 'FOO');
t('g?iw rot13', 'he|llo', 'g?iw', 'uryyb');
t('gUU line', 'a|b\nc', 'gUU', 'AB\nc');
t('guu line', 'A|B', 'guu', 'ab');
t('gUgU line', 'a|b', 'gUgU', 'AB');
t('g~~ line', 'aB|c', 'g~~', 'AbC');
t('gUw', '|ab cd', 'gUw', 'AB cd');
t('gU$ ', 'a|b cd', 'gU$', 'aB CD');
t('2gUU', '|a\nb\nc', '2gUU', 'A\nB\nc');
t('~ toggles and advances', '|aB', '~~', 'Ab', pos(0, 1));
t('3~', '|abcd', '3~', 'ABCd');
t('u undoes gU', 'a|b', 'gUiwu', 'ab');
t('visual U', '|abc', 'vlU', 'ABc');
t('visual gu', '|ABC', 'vlgu', 'abC');
t('visual ~', '|aB', 'vl~', 'Ab');
// ---- gJ gi gI gp gP gv ga
t('gJ', '|a\n  b', 'gJ', 'a  b');
t('J still adds a space', '|a\n  b', 'J', 'a b');
t('gI', '  a|b', 'gIX' + ESC, 'X  ab');
t('gi', 'a|b\nc', 'iX' + ESC + 'jgiY' + ESC, 'aXYb\nc');
t('gp linewise puts cursor after', '|a\nb', 'yyjgp', 'a\nb\na', pos(2, 0));
t('gp mid', '|a\nb\nc', 'yyjgpix' + ESC, 'a\nb\na\nxc');
t('gP', '|ab', 'ylgPiX' + ESC, 'aXab');
t('gv reselect then d', '|abcd', 'vl' + ESC + 'gvd', 'cd');
t('ga message', '|A', 'ga', 'A', (r) => /<A> 65, Hex 41/.test(r.msg));
// ---- * # g*
t('* next whole word', '|foo foobar foo', '*', 'foo foobar foo', pos(0, 11));
t('# previous whole word', 'foo foobar |foo', '#', 'foo foobar foo', pos(0, 0));
t('g* matches substring', '|foo foobar', 'g*', 'foo foobar', pos(0, 4));
t('* wraps', 'a\nf|oo\nb\nfoo', '**', 'a\nfoo\nb\nfoo', pos(1, 0));
// ---- regression of existing behaviour
t('dd', 'a\n|b\nc', 'dd', 'a\nc');
t('dw old behaviour', '|ab cd', 'dw', 'cd');
t('cw', '|ab cd', 'cwX' + ESC, 'X cd');
t('x', '|abc', 'x', 'bc');
t('dgg', 'a\n|b\nc', 'dgg', 'c');
t('dG', 'a\n|b\nc', 'dG', 'a');
t('yy p', '|a\nb', 'yyjp', 'a\nb\na');
t('de', '|ab cd', 'de', ' cd');
t('d$', 'a|bc', 'd$', 'a');
t('d0', 'ab|c', 'd0', 'c');
t('r', '|ab', 'rx', 'xb');
t('gg', 'a\nb|', 'gg', 'a\nb', pos(0, 0));
t('5 j count', '|a\nb\nc', 'dj', 'c');
t('u after dit', '<b>a|b</b>', 'ditu', '<b>ab</b>');
t('unknown g key is a no-op', 'a|b', 'gz', 'ab');
t('d then i unknown object', 'a|b', 'diz', 'ab');

t('d2} two paragraphs', '|a\n\nb\n\nc', 'd2}', '\nc');
t('vf, d', '|ab,cd', 'vf,d', 'cd');
t('vt, d', '|ab,cd', 'vt,d', ',cd');
t('v} extends selection and takes the blank line', '|a\nb\n\nc', 'v}d', 'c');
t('vge', 'foo ba|r', 'vged', 'fo');
t('cc keeps working', 'a\n|b\nc', 'ccX' + ESC, 'a\nX\nc');
t('c} in paragraph', '|a\nb\n\nc', 'c}X' + ESC, 'X\n\nc');
t('d with count before and after', '|a,b,c,d,e', '2d2f,', 'a,b,c,d,e'.slice(0, 0) + 'e');
t('dif unknown after i', 'a|b', 'dif', 'ab');
t('y then ip yanks paragraph', '|a\nb\n\nc', 'yipGp', 'a\nb\n\nc\na\nb');
t('u then Ctrl-R redoes dit', '<b>a|b</b>', 'ditu' + '\x12', '<b></b>');
t('di" at end of line cursor on closing quote', 'x "ab|"', 'di"', 'x ""' );
t('visual mode survives g pend', '|abc', 'vlgg', 'abc', (r) => r.mode === 'VISUAL');
console.log(`${FILE}\npass ${pass}, fail ${fail}`);
process.exitCode = fail ? 1 : 0;
