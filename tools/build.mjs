#!/usr/bin/env node
// Assembles src/ and assets/ into one self-contained HTML file.
// No dependencies, no network: every sprite goes in as a base64 data URI, so the
// result works opened straight from disk, from a USB stick, or off any static host.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'coderush-kombat.html');

// Published key -> file. The keys are what src/game.js looks sprites up by.
const ART = {
  'serpent/idle':     'assets/fighters/serpent/idle.png',
  'serpent/run':      'assets/fighters/serpent/run.png',
  'serpent/jump':     'assets/fighters/serpent/jump.png',
  'serpent/fall':     'assets/fighters/serpent/fall.png',
  'serpent/attack1':  'assets/fighters/serpent/attack1.png',
  'serpent/attack2':  'assets/fighters/serpent/attack2.png',
  'serpent/hit':      'assets/fighters/serpent/hit.png',
  'serpent/death':    'assets/fighters/serpent/death.png',
  'serpent/block':    'assets/fighters/serpent/block.png',
  'serpent/launcher': 'assets/fighters/serpent/launcher.png',
  'serpent/cast':     'assets/fighters/serpent/cast.png',
  'serpent/grab':     'assets/fighters/serpent/grab.png',
  'serpent/throw':    'assets/fighters/serpent/throw.png',
  'serpent/fatal_dash': 'assets/fighters/serpent/fatal_dash.png',
  'serpent/fatal_hit1': 'assets/fighters/serpent/fatal_hit1.png',
  'serpent/fatal_hit2': 'assets/fighters/serpent/fatal_hit2.png',
  'serpent/fatal_hit3': 'assets/fighters/serpent/fatal_hit3.png',
  'serpent/fatal_rise': 'assets/fighters/serpent/fatal_rise.png',
  'serpent/fatal_slam': 'assets/fighters/serpent/fatal_slam.png',
  // Real juggle art drops in here: uncomment a line, put the strip in assets/, then point
  // the matching anim in SHEETS (src/game.js) at the key and delete its `pose`.
  // 'serpent/launcher':  'assets/fighters/serpent/launcher.png',
  // 'serpent/airhit':    'assets/fighters/serpent/airhit.png',
  // 'serpent/knockdown': 'assets/fighters/serpent/knockdown.png',
  // 'serpent/getup':     'assets/fighters/serpent/getup.png',
  'undefined/idle':    'assets/fighters/undefined/idle.png',
  'undefined/run':     'assets/fighters/undefined/run.png',
  'undefined/jump':    'assets/fighters/undefined/jump.png',
  'undefined/fall':    'assets/fighters/undefined/fall.png',
  'undefined/attack1': 'assets/fighters/undefined/attack1.png',
  'undefined/attack2': 'assets/fighters/undefined/attack2.png',
  'undefined/hit':     'assets/fighters/undefined/hit.png',
  'undefined/death':   'assets/fighters/undefined/death.png',
  'undefined/block':    'assets/fighters/undefined/block.png',
  'undefined/launcher': 'assets/fighters/undefined/launcher.png',
  'undefined/cast':     'assets/fighters/undefined/cast.png',
  'undefined/grab':     'assets/fighters/undefined/grab.png',
  'undefined/throw':    'assets/fighters/undefined/throw.png',
  'undefined/fatal_dash': 'assets/fighters/undefined/fatal_dash.png',
  'undefined/fatal_hit1': 'assets/fighters/undefined/fatal_hit1.png',
  'undefined/fatal_hit2': 'assets/fighters/undefined/fatal_hit2.png',
  'undefined/fatal_hit3': 'assets/fighters/undefined/fatal_hit3.png',
  'undefined/fatal_rise': 'assets/fighters/undefined/fatal_rise.png',
  'undefined/fatal_slam': 'assets/fighters/undefined/fatal_slam.png',
  // 'undefined/launcher':  'assets/fighters/undefined/launcher.png',
  // 'undefined/airhit':    'assets/fighters/undefined/airhit.png',
  // 'undefined/knockdown': 'assets/fighters/undefined/knockdown.png',
  // 'undefined/getup':     'assets/fighters/undefined/getup.png',
  'stage/woods':      'assets/stage/woods.png',
  'stage/shop':       'assets/stage/shop.png',
};

const read = p => readFileSync(join(root, p));
const lines = ['const SPRITES = {'];
let artBytes = 0;
for (const [key, file] of Object.entries(ART)){
  const buf = read(file);
  artBytes += buf.length;
  lines.push(`'${key}':'data:image/png;base64,${buf.toString('base64')}',`);
}
lines.push('};');

const html = read('src/shell.html').toString()
  .replace('/*{{STYLE}}*/', () => read('src/style.css').toString().trim())
  .replace('/*{{SPRITES}}*/', () => lines.join('\n'))
  .replace('/*{{GAME}}*/', () => read('src/game.js').toString().trim());

for (const marker of ['{{STYLE}}', '{{SPRITES}}', '{{GAME}}']){
  if (html.includes(marker)) throw new Error('shell.html still has ' + marker + ' — nothing was substituted');
}
writeFileSync(out, html);

const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`built coderush-kombat.html  ${kb(statSync(out).size)}  (${Object.keys(ART).length} sprite sheets, ${kb(artBytes)} of art)`);
