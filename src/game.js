(function(){
'use strict';
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function shuffle(a){ for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

// ---------------------------------------------------------------- questions
// The first option is always the correct one; options are shuffled when shown.
const QUESTIONS = {
  easy: [
    { lang:'JavaScript', code:'console.log(3 + "3")', opts:['33','6','NaN','Error'] },
    { lang:'Python', code:'print(len("code"))', opts:['4','3','5','Error'] },
    { lang:'Python', code:'print(10 // 3)', opts:['3','3.33','4','1'] },
    { lang:'JavaScript', code:'console.log(typeof [])', opts:['object','array','list','undefined'] },
    { lang:'Python', code:'print("ha" * 3)', opts:['hahaha','ha3','ha ha ha','Error'] },
    { lang:'Python', code:'x = [1, 2, 3]\nprint(x[-1])', opts:['3','1','-1','Error'] },
    { lang:'JavaScript', code:'console.log(10 % 4)', opts:['2','2.5','0','4'] },
    { lang:'Python', code:'print(2 ** 3)', opts:['8','6','9','5'] },
    { lang:'JavaScript', code:'console.log("5" * 2)', opts:['10','55','NaN','Error'] },
    { lang:'Python', code:'print(bool(0))', opts:['False','True','0','None'] },
    { lang:'JavaScript', code:'console.log([1, 2, 3].length)', opts:['3','2','4','undefined'] },
    { lang:'Python', code:'print(type(3.0).__name__)', opts:['float','int','double','str'] },
    { lang:'JavaScript', code:'let x = 5;\nx += 2;\nconsole.log(x);', opts:['7','5','52','2'] },
    { lang:'Python', code:'print(max([4, 9, 2]))', opts:['9','4','2','15'] },
  ],
  medium: [
    { lang:'JavaScript', code:'console.log(0.1 + 0.2 === 0.3)', opts:['false','true','NaN','Error'] },
    { lang:'Python', code:'print([1, 2, 3][1:])', opts:['[2, 3]','[1, 2]','[1]','[3]'] },
    { lang:'JavaScript', code:'console.log(typeof null)', opts:['object','null','undefined','number'] },
    { lang:'Python', code:'x = [1, 2]\ny = x\ny.append(3)\nprint(len(x))', opts:['3','2','1','Error'] },
    { lang:'Python', code:'print("abc"[::-1])', opts:['cba','abc','c','Error'] },
    { lang:'JavaScript', code:'const a = [1, 2, 3];\nconsole.log(a.map(n => n * 2)[2]);', opts:['6','3','4','undefined'] },
    { lang:'Python', code:'print(sum(range(4)))', opts:['6','10','4','3'] },
    { lang:'JavaScript', code:'console.log(1 < 2 < 3, 3 > 2 > 1)', opts:['true false','true true','false true','false false'] },
    { lang:'JavaScript', code:'console.log("10" == 10, "10" === 10)', opts:['true false','true true','false true','false false'] },
    { lang:'Python', code:'print({1, 1, 2, 2})', opts:['{1, 2}','{1, 1, 2, 2}','[1, 2]','Error'] },
  ],
  hard: [
    { lang:'JavaScript', code:'console.log([] + [])', opts:['an empty string','[]','0','Error'] },
    { lang:'Python', code:'def f(a, b=[]):\n    b.append(a)\n    return b\n\nf(1)\nprint(f(2))', opts:['[1, 2]','[2]','[1]','Error'] },
    { lang:'JavaScript', code:'console.log([10, 1, 3].sort())', opts:['[1, 10, 3]','[1, 3, 10]','[10, 3, 1]','Error'] },
    { lang:'JavaScript', code:'console.log("b" + "a" + +"a" + "a")', opts:['baNaNa','baaa','ba1a','Error'] },
    { lang:'JavaScript', code:'setTimeout(() => console.log("A"));\nPromise.resolve().then(() => console.log("B"));\nconsole.log("C");', opts:['C B A','A B C','C A B','B C A'] },
    { lang:'Python', code:'print(round(2.5))', opts:['2','3','2.5','Error'] },
    { lang:'JavaScript', code:'console.log(typeof NaN)', opts:['number','NaN','undefined','object'] },
    { lang:'Python', code:'print([i for i in range(10) if i % 3 == 0])', opts:['[0, 3, 6, 9]','[3, 6, 9]','[0, 3, 6]','[1, 4, 7]'] },
    { lang:'JavaScript', code:'console.log(Math.max())', opts:['-Infinity','0','Infinity','NaN'] },
  ],
};
const decks = { easy:[], medium:[], hard:[] };
function drawQuestion(diff){
  if (!decks[diff].length) decks[diff] = shuffle(QUESTIONS[diff].slice());
  const src = decks[diff].pop();
  const order = shuffle([0, 1, 2, 3]);
  return { lang:src.lang, code:src.code, opts:order.map(i => src.opts[i]), correct:order.indexOf(0) };
}
const CPU_DELAY = { easy:[1.4, 3.8], medium:[2.0, 5.2], hard:[2.8, 7.5] };
const CPU_ACC = { easy:.65, medium:.5, hard:.4 };

// ---------------------------------------------------------------- audio
let AC = null, master = null, noiseBuf = null, soundOn = true;
function audioInit(){
  if (AC){ if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = .45; master.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e){ AC = null; }
}
function noise(dur, freq, q, gain, delay){
  if (!AC || !soundOn) return;
  const t = AC.currentTime + (delay || 0);
  const src = AC.createBufferSource(); src.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = AC.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + dur + .02);
}
function tone(freq, dur, type, gain, slide, delay){
  if (!AC || !soundOn) return;
  const t = AC.currentTime + (delay || 0);
  const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
}
const sfx = {
  hit: heavy => { noise(heavy ? .22 : .12, heavy ? 500 : 1100, .9, heavy ? 1 : .7); tone(heavy ? 110 : 170, heavy ? .25 : .12, 'sine', heavy ? .8 : .5, 40); },
  block: () => { noise(.07, 2600, 3, .5); tone(820, .06, 'square', .12); },
  whoosh: () => noise(.13, 1400, .6, .16),
  jump: () => { noise(.08, 900, 1.2, .18); tone(260, .1, 'sine', .14, 420); },
  land: () => noise(.1, 240, .9, .3),
  right: () => { tone(660, .12, 'triangle', .3); tone(990, .18, 'triangle', .3, null, .1); },
  wrong: () => tone(180, .3, 'sawtooth', .18, 90),
  gong: () => { tone(98, 1.8, 'sine', .55); tone(147, 1.5, 'sine', .22); tone(196, 1.2, 'triangle', .1); noise(.5, 280, .6, .35); },
  boom: () => { noise(.6, 180, .5, 1); tone(70, .7, 'sine', .9, 28); },
  heal: () => { tone(520, .15, 'sine', .25); tone(780, .2, 'sine', .25, null, .12); tone(1040, .3, 'sine', .2, null, .24); },
  thud: () => { tone(80, .2, 'sine', .6, 40); noise(.15, 300, .7, .4); },
  amp: () => { tone(160, .3, 'sawtooth', .3, 640); tone(320, .22, 'square', .14, 1280); noise(.2, 1000, 1.1, .3); },
  launch: () => { tone(220, .34, 'triangle', .36, 980); noise(.12, 1800, 1.4, .3); },
  bounce: () => { tone(120, .18, 'sine', .5, 60); noise(.12, 420, .8, .45); },
  cast: () => { tone(300, .2, 'triangle', .22, 760); noise(.12, 1600, 1.6, .16); },
  shot: cold => { tone(cold ? 700 : 330, .26, cold ? 'sine' : 'square', .22, cold ? 300 : 820); noise(.16, cold ? 2400 : 900, 1.4, .2); },
  clink: () => { tone(1400, .09, 'square', .22); tone(2100, .07, 'square', .14, null, .04); noise(.08, 3000, 3, .3); },
  freeze: () => { tone(1200, .5, 'sine', .3, 220); tone(880, .45, 'triangle', .16, 180, .03); noise(.35, 5200, 2.4, .22); },
  portal: () => { tone(140, .5, 'sawtooth', .22, 520); tone(520, .4, 'sine', .14, 160, .06); noise(.3, 700, .9, .2); },
  warp: () => { tone(900, .18, 'square', .2, 180); noise(.12, 2200, 2, .22); },
  grab: () => { noise(.1, 520, 1.1, .5); tone(190, .14, 'square', .3, 120); },
  slam: () => { tone(66, .36, 'sine', .95, 30); noise(.26, 220, .6, .8); },
};
function speak(text){
  if (!soundOn || !('speechSynthesis' in window)) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.pitch = .3; u.rate = .82; u.volume = 1; speechSynthesis.speak(u); } catch (e){}
}

// ---------------------------------------------------------------- graphics quality
// Low mode: device pixel ratio 1, no embers, half the particles, no auras or shadows.
// Auto starts high and drops to low on its own if the machine can't hold the frame rate.
const GFX_KEY = 'crk2d-gfx';
let gfxPref = 'auto';
try { gfxPref = localStorage.getItem(GFX_KEY) || 'auto'; } catch (e){}
let LOW = gfxPref === 'low';
let autoDropped = false, slowFrames = 0, fastFrames = 0;

// ---------------------------------------------------------------- stage canvas
// Everything is drawn in a fixed 1024x576 space; the canvas is scaled to the window,
// so the layout never depends on the screen and the pixel art stays on whole pixels.
const VW = 1024, VH = 576, GROUND = 480, WALL_L = 86, WALL_R = 938;
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d', { alpha:false });
if (!ctx){ $('#nocanvas').classList.remove('hidden'); $('#menu').classList.add('hidden'); return; }
$('#stage').appendChild(canvas);
let viewScale = 1, viewLeft = 0, viewTop = 0;
function resize(){
  const dpr = LOW ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const s = Math.max(.2, Math.min(innerWidth / VW, innerHeight / VH));
  const cssW = Math.round(VW * s), cssH = Math.round(VH * s);
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  ctx.imageSmoothingEnabled = false;
  viewScale = cssW / VW; viewLeft = (innerWidth - cssW) / 2; viewTop = (innerHeight - cssH) / 2;
}
// world point -> page pixels, for the HUD bits that live in the DOM. These run through the
// camera too, so floating text still lands on a fighter when a cinematic has zoomed in.
const toScreenX = x => viewLeft + ((x - cam.x) * cam.z + VW / 2) * viewScale;
const toScreenY = y => viewTop + ((y - cam.y) * cam.z + VH / 2) * viewScale;
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- art
// SPRITES holds every sheet as a base64 PNG, so the page is one file with no requests.
const IMG = {}; let imagesLeft = 0;
for (const key in SPRITES){
  const im = new Image(); imagesLeft++;
  im.onload = im.onerror = () => { if (--imagesLeft === 0) bakeStage(); };
  im.src = SPRITES[key];
  IMG[key] = im;
}
function offscreen(w, h, draw){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h); return c;
}
// Pre-rendered once: gradients are expensive to build, cheap to blit.
const nightTint = offscreen(VW, VH, (g) => {
  const grd = g.createLinearGradient(0, 0, 0, VH);
  grd.addColorStop(0, 'rgba(26,8,10,.80)'); grd.addColorStop(.55, 'rgba(32,12,10,.62)'); grd.addColorStop(1, 'rgba(14,6,6,.78)');
  g.fillStyle = grd; g.fillRect(0, 0, VW, VH);
  const glow = g.createRadialGradient(VW / 2, GROUND - 40, 20, VW / 2, GROUND - 40, VW * .55);
  glow.addColorStop(0, 'rgba(255,110,40,.20)'); glow.addColorStop(1, 'rgba(255,110,40,0)');
  g.fillStyle = glow; g.fillRect(0, 0, VW, VH);
});
const vignette = offscreen(VW, VH, (g) => {
  const grd = g.createRadialGradient(VW / 2, VH / 2, VH * .35, VW / 2, VH / 2, VH * .95);
  grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.75)');
  g.fillStyle = grd; g.fillRect(0, 0, VW, VH);
});
const auraTex = ['#ff3a22', '#49e0ff'].map(col => offscreen(128, 128, (g) => {
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, col); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = .55; g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
}));
// The Fatal Blow backdrop: a red sun with a gold rim and spokes, baked once and turned slowly
// behind the fighters. It is the only thing lighting the arena once the stage has gone dark.
const fatalBack = offscreen(512, 512, (g) => {
  for (let i = 0; i < 28; i++){                     // spokes first, so the glow sits over them
    const a = i / 28 * 6.283, w = i % 2 ? .018 : .042;
    g.fillStyle = i % 2 ? 'rgba(255,196,96,.30)' : 'rgba(255,104,34,.40)';
    g.beginPath(); g.moveTo(256, 256); g.arc(256, 256, 252, a - w, a + w); g.closePath(); g.fill();
  }
  const grd = g.createRadialGradient(256, 256, 16, 256, 256, 252);
  grd.addColorStop(0, 'rgba(255,236,186,.95)'); grd.addColorStop(.24, 'rgba(255,128,36,.72)');
  grd.addColorStop(.6, 'rgba(176,18,22,.5)'); grd.addColorStop(1, 'rgba(60,4,8,0)');
  g.fillStyle = grd; g.beginPath(); g.arc(256, 256, 252, 0, 6.283); g.fill();
  g.strokeStyle = 'rgba(255,214,120,.9)'; g.lineWidth = 6;
  g.beginPath(); g.arc(256, 256, 184, 0, 6.283); g.stroke();
  g.strokeStyle = 'rgba(255,170,60,.45)'; g.lineWidth = 2.5;
  g.beginPath(); g.arc(256, 256, 214, 0, 6.283); g.stroke();
});
// Radiating streaks for the impact panels: one blit, drawn rotated and scaled per hit.
const speedTex = offscreen(256, 256, (g) => {
  for (let i = 0; i < 80; i++){
    const a = Math.random() * 6.283, r0 = 22 + Math.random() * 46, r1 = 126 + Math.random() * 44;
    g.strokeStyle = 'rgba(255,255,255,' + (.07 + Math.random() * .5).toFixed(2) + ')';
    g.lineWidth = .5 + Math.random() * 2.6;
    g.beginPath(); g.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0);
    g.lineTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1); g.stroke();
  }
});
// One frame, recoloured through its own silhouette. Drawing the sprite into a scratch canvas
// and filling it with `source-atop` paints only the pixels the sprite actually covers, which
// is what makes a fighter read as frozen rather than as a rectangle of blue.
const tintBuf = offscreen(288, 288, () => {});
const tintCtx = tintBuf.getContext('2d');
function tintFrame(img, sx, fw, fh, col, alpha){
  const w = Math.min(fw, 288), h = Math.min(fh, 288);
  tintCtx.clearRect(0, 0, 288, 288);
  tintCtx.drawImage(img, sx, 0, fw, fh, 0, 0, w, h);
  tintCtx.globalCompositeOperation = 'source-atop';
  tintCtx.globalAlpha = alpha; tintCtx.fillStyle = col;
  tintCtx.fillRect(0, 0, w, h);
  tintCtx.globalAlpha = 1; tintCtx.globalCompositeOperation = 'source-over';
  return tintBuf;
}
const crateTex = offscreen(64, 64, (g) => {
  g.fillStyle = '#2a1a10'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#e8b04a'; g.lineWidth = 4; g.strokeRect(3, 3, 58, 58);
  g.strokeStyle = 'rgba(232,176,74,.5)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(3, 3); g.lineTo(61, 61); g.moveTo(61, 3); g.lineTo(3, 61); g.stroke();
  g.fillStyle = '#ffcf5a'; g.font = 'bold 42px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('?', 32, 35);
});

// ---------------------------------------------------------------- sprite sheets
// Every sheet is one row of 200x200 frames. The art sits in the same place in every
// frame of a character, so one anchor (the point between the feet) lines them all up.
// `impact` is the frame where the blade arrives: the hitbox opens on exactly that frame.
const SHEETS = {
  serpent: {
    scale:2.85, anchorX:94.5, anchorY:122, faces:1,
    anims:{
      idle:{ img:'serpent/idle', frames:8, fps:10, loop:true },
      run:{ img:'serpent/run', frames:8, fps:15, loop:true },
      jump:{ img:'serpent/jump', frames:2, fps:7 },
      fall:{ img:'serpent/fall', frames:2, fps:7 },
      attack1:{ img:'serpent/attack1', frames:6, impact:4 },
      attack2:{ img:'serpent/attack2', frames:6, impact:4 },
      hit:{ img:'serpent/hit', frames:4, fps:16 },
      death:{ img:'serpent/death', frames:6, fps:9 },
      block:{ img:'serpent/block', frames:4, fps:7, loop:true },   // drawn-sword guard, settling
      // Juggle poses. The dy values put each pose's lowest pixel on the floor rather than
      // through it; they were measured off the sheets, so they move if the art does.
      // These are placeholders: each one borrows the frames of another
      // animation and bends them with a canvas transform at draw time (see `pose` in
      // drawFighter). To drop in real art, add the strip to tools/build.mjs, point `img`
      // at it, set its frame count, and delete the `pose` - nothing else changes.
      launcher:{ img:'serpent/launcher', frames:5, impact:3 },   // real strip: overhead thrust, then the uncoil
      stagger:{ img:'serpent/hit', frames:4, fps:5, pose:{ rot:-.3, pivot:34, dy:-20 } },
      airhit:{ img:'serpent/hit', frames:4, fps:11, pose:{ rot:-.5, pivot:60, dy:-18 } },
      tumble:{ img:'serpent/fall', frames:2, fps:9, loop:true, pose:{ rot:.4, pivot:26, flipY:true, dy:118 } },
      knockdown:{ img:'serpent/fall', frames:2, fps:7, pose:{ rot:-1.32, dy:-76 } },
      getup:{ img:'serpent/death', frames:6, fps:14, reverse:true },
      // Fatal Blow strips. Same deal: borrowed frames, bent by a transform, named here so a
      // real serpent/fatal_* strip replaces one by changing img and dropping pose.
      fatalDash:{ img:'serpent/fatal_dash', frames:4, fps:16, loop:true },
      fatalHit1:{ img:'serpent/fatal_hit1', frames:3 },      // a lunging cut across
      fatalHit2:{ img:'serpent/fatal_hit2', frames:3 },      // high to mid: a chop down
      fatalHit3:{ img:'serpent/fatal_hit3', frames:3 },      // mid to high: a rising cut
      fatalRise:{ img:'serpent/fatal_rise', frames:4 },
      fatalSlam:{ img:'serpent/fatal_slam', frames:4 },      // beats 6 and 7 share this one
      fatalTake:{ img:'serpent/hit', frames:4, fps:12, pose:{ rot:-.6, pivot:54, dy:-24 } },
      // The casting stance for specials: the first frame of the spin, leaned back into a
      // brace. It has to be the first one - later frames in these strips are mostly the white
      // slash effect painted over the fighter, which on its own reads as a blank flash.
      // A real serpent/cast strip replaces this with img, frames and no of/offset/pose.
      cast:{ img:'serpent/cast', frames:4, fps:12 },               // coil, then thrust forward
      // Throws. Real Grab / Throw / Thrown strips replace these by pointing img at them and
      // dropping of/offset/pose; `thrown` is spun at draw time, so it needs a pivot near the
      // middle of the body whatever art ends up in it.
      grab:{ img:'serpent/grab', frames:3, fps:15 },
      throwHold:{ img:'serpent/throw', frames:5, fps:6 },          // grip, hoist, swing over, release
      grabbed:{ img:'serpent/hit', frames:1, of:4, offset:0, pose:{ rot:-.26, pivot:54, dy:-10 } },
      thrown:{ img:'serpent/fall', frames:2, of:2, offset:0, fps:12, loop:true, pose:{ pivot:58 } },
    },
  },
  undefined_js: {
    scale:2.75, anchorX:102.5, anchorY:128, faces:-1,
    anims:{
      idle:{ img:'undefined/idle', frames:4, fps:8, loop:true },
      run:{ img:'undefined/run', frames:8, fps:15, loop:true },
      jump:{ img:'undefined/jump', frames:2, fps:7 },
      fall:{ img:'undefined/fall', frames:2, fps:7 },
      attack1:{ img:'undefined/attack1', frames:4, impact:1 },
      attack2:{ img:'undefined/attack2', frames:4, impact:1 },
      hit:{ img:'undefined/hit', frames:3, fps:14 },
      death:{ img:'undefined/death', frames:7, fps:9 },
      block:{ img:'undefined/block', frames:4, fps:7, loop:true },   // two-handed overhead guard
      launcher:{ img:'undefined/launcher', frames:5, impact:3 },   // floor to full overhead
      stagger:{ img:'undefined/hit', frames:3, fps:4.5, pose:{ rot:-.3, pivot:34, dy:-10 } },
      airhit:{ img:'undefined/hit', frames:3, fps:9, pose:{ rot:-.5, pivot:60 } },
      tumble:{ img:'undefined/fall', frames:2, fps:9, loop:true, pose:{ rot:.4, pivot:28, flipY:true, dy:130 } },
      knockdown:{ img:'undefined/fall', frames:2, fps:7, pose:{ rot:-1.32, dy:-66 } },
      getup:{ img:'undefined/death', frames:7, fps:16, reverse:true },
      fatalDash:{ img:'undefined/fatal_dash', frames:4, fps:15, loop:true },
      fatalHit1:{ img:'undefined/fatal_hit1', frames:3 },    // vertical blade, driving forward
      fatalHit2:{ img:'undefined/fatal_hit2', frames:3 },    // high to low: a chop down
      fatalHit3:{ img:'undefined/fatal_hit3', frames:3 },    // low to high: a rising cut
      fatalRise:{ img:'undefined/fatal_rise', frames:4 },
      fatalSlam:{ img:'undefined/fatal_slam', frames:4 },    // beats 6 and 7 share this one
      fatalTake:{ img:'undefined/hit', frames:3, fps:10, pose:{ rot:-.64, pivot:52, dy:-2 } },
      cast:{ img:'undefined/cast', frames:4, fps:12 },             // coil, thrust forward, rise
      grab:{ img:'undefined/grab', frames:3, fps:15 },
      throwHold:{ img:'undefined/throw', frames:5, fps:6 },        // low grip, lift, fling, release
      grabbed:{ img:'undefined/hit', frames:1, of:3, offset:0, pose:{ rot:-.3, pivot:52, dy:-8 } },
      thrown:{ img:'undefined/fall', frames:2, of:2, offset:0, fps:12, loop:true, pose:{ pivot:56, dy:-4 } },
    },
  },
};

// ---------------------------------------------------------------- moves
// Four attack buttons out of two sword animations: each one has a quick, cheap version
// and a slow, committed version. Same art, different weight.
// y is where the blow lands, for sparks and blood. step is how far a move carries a
// fighter who starts it from out of range. The Fatal Blow deals no damage of its own:
// the question that follows it decides that.
const ATT = {
  fp:{ anim:'attack1', startup:.08, active:.07, recovery:.16, dmg:4,  range:188, hitstun:.40, push:7,  step:26, y:300 },                      // U, light slash
  bp:{ anim:'attack1', startup:.15, active:.08, recovery:.26, dmg:7,  range:204, hitstun:.46, push:11, step:44, y:296, heavy:true },          // I, heavy slash
  fk:{ anim:'attack2', startup:.12, active:.07, recovery:.20, dmg:6,  range:212, hitstun:.44, push:9,  step:30, y:334 },                      // J, light spin
  bk:{ anim:'attack2', startup:.23, active:.09, recovery:.34, dmg:11, range:238, hitstun:.50, push:0,  step:58, y:318, knockdown:true, heavy:true },  // K, heavy spin
  amp:{ anim:'launcher', startup:.17, active:.10, recovery:.30, dmg:9, range:216, hitstun:.30, push:0, step:52, y:330, heavy:true, launcher:true },  // O, the Amplify launcher
  fatal:{ anim:'attack2', startup:.30, active:.12, recovery:.50, range:262, push:0, step:150, y:306, heavy:true, fatal:true },                // P
};
const GRAVITY = 1750, JUMP_V = -690, WALK_F = 232, WALK_B = 186, AIR_MOVE = 176, MIN_GAP = 82;

// Juggles. A launcher throws the opponent off the floor and gravity takes over from there.
// Every airborne hit adds less lift than the one before it, so the sum of the lift a juggle
// can ever add is bounded: once the next pop would be under JUGGLE_MIN_LIFT they only come
// down, which is why no juggle can be extended for ever. The landing is always the same
// shape - one ground bounce, then they lie there, then they get up briefly invulnerable.
const LAUNCH_V = -680, JUGGLE_LIFT = 430, JUGGLE_FALLOFF = .62, JUGGLE_MIN_LIFT = 95, BOUNCE_V = -270;
const STAGGER_T = .62, DOWN_T = .85, JUGGLE_DOWN_T = 1.05, AIR_REACH = 240;
// Super meter: three bars, filled by landing and by taking hits, one bar per Amplify.
const METER_MAX = 3, AMP_COST = 1, METER_ON_DEAL = .035, METER_ON_TAKE = .022, METER_AIR_SCALE = .35;

// ---------------------------------------------------------------- particles
const PARTS = [];
for (let i = 0; i < 320; i++) PARTS.push({ life:0 });
let partI = 0;
function emit(x, y, o){
  const n = LOW ? Math.ceil(o.n / 2) : o.n;
  for (let k = 0; k < n; k++){
    const p = PARTS[partI]; partI = (partI + 1) % PARTS.length;
    const a = Math.random() * Math.PI * 2, sp = o.speed * (.4 + Math.random() * .8);
    p.vx = Math.cos(a) * sp * (o.dirX ? .5 : 1) + (o.dirX || 0) * sp * .8;
    p.vy = Math.sin(a) * sp - (o.up || 0);
    p.g = o.gravity; p.life = p.max = o.life * (.6 + Math.random() * .6);
    p.size = o.size * (.6 + Math.random() * .8);
    p.x = x + rand(-4, 4); p.y = y + rand(-4, 4); p.col = o.col; p.add = !!o.add;
  }
}
function sparks(x, y, o){ emit(x, y, Object.assign({ n:14, speed:290, size:6, life:.35, col:'255,196,112', gravity:380, add:true }, o || {})); }
function blood(x, y, dir, o){ emit(x, y, Object.assign({ n:10, speed:210, size:5, life:.75, col:'158,15,22', gravity:900, dirX:dir }, o || {})); }
function updateParts(dt){
  if (dt <= 0) return;
  for (const p of PARTS){
    if (p.life <= 0) continue;
    p.life -= dt; if (p.life <= 0) continue;
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.y > GROUND){ p.y = GROUND; p.vy *= -.25; p.vx *= .55; }
  }
}
function drawParts(){
  for (let pass = 0; pass < 2; pass++){
    if (pass) ctx.globalCompositeOperation = 'lighter';
    for (const p of PARTS){
      if (p.life <= 0 || p.add !== !!pass) continue;
      const r = p.life / p.max, s = p.size * (.5 + r * .5);
      ctx.fillStyle = 'rgba(' + p.col + ',' + r.toFixed(3) + ')';
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}
// embers drifting up the stage
const EMBERS = [];
for (let i = 0; i < 70; i++) EMBERS.push({ x:rand(0, VW), y:rand(0, VH), v:rand(14, 44), s:rand(1.5, 3.2), p:rand(0, 9) });
function drawEmbers(dt, t){
  if (LOW) return;
  ctx.globalCompositeOperation = 'lighter';
  for (const e of EMBERS){
    e.y -= e.v * dt; if (e.y < -10){ e.y = VH + 10; e.x = rand(0, VW); }
    const a = .25 + .25 * Math.sin(t * 2 + e.p);
    ctx.fillStyle = 'rgba(255,146,58,' + a.toFixed(3) + ')';
    ctx.fillRect(e.x + Math.sin(t * .8 + e.p) * 9, e.y, e.s, e.s);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------- fighters
const CFG = [
  { name:'Serpent.py', short:'Serpent', sheet:'serpent' },
  { name:'Undefined.js', short:'Undefined', sheet:'undefined_js' },
];
const F = CFG.map((c, i) => ({
  id:i, name:c.name, short:c.short, sheet:SHEETS[c.sheet], sheetKey:c.sheet, cpu:false,
  cineAnim:null, cineFrame:0,
  x:i ? 660 : 364, y:GROUND, vy:0, facing:i ? -1 : 1, hp:100, ghost:100, wins:0,
  state:'idle', stateT:0, attack:null, attackHit:false, scripted:false,
  hitstun:0, invuln:0, combo:0, comboShowN:0, comboShowT:0, vx:0, buffer:null,
  held:{ left:false, right:false, block:false }, jumpHeld:false, jumpBuf:0,
  power:null, lowUsed:{ fatal:false, don:false }, roundLow:false, fatalCD:0,
  meter:0, juggle:0, bounced:false, downT:DOWN_T,
  motion:[], dirPrev:{}, special:null, specAmp:false, specFired:false, spCD:[0, 0],
  frozen:0, vanish:0, throwCD:0, throwBack:false, poseSpin:0,
  animT:0, flash:0, inputLock:0, stats:{ asked:0, right:0 }, chipsHTML:'',
}));
const other = f => F[1 - f.id];
const airborne = f => f.y < GROUND - .5;
// the states a hit can be followed up out of, i.e. the ones that keep a combo alive
const stunned = s => s === 'hit' || s === 'stagger' || s === 'airhit' || s === 'frozen';
function setState(f, s, keep){ if (keep && f.state === s) return; f.state = s; f.stateT = 0; f.animT = 0; }
// where a fighter goes when an action ends: back to the air if they're still off the floor
const restState = f => airborne(f) ? 'air' : 'idle';

// Which sheet frame to show. Attacks are retimed so the blade lands on the active
// window the game already decided on: the art follows the fight, never the other way.
function frameOf(f){
  const S = f.sheet, A = S.anims;
  const oneShot = (a, t) => {
    const n = a.frames, fps = a.fps || 12;
    const i = a.loop ? Math.floor(t * fps) % n : clamp(Math.floor(t * fps), 0, n - 1);
    return a.reverse ? n - 1 - i : i;          // a getup is a knockdown run backwards
  };
  // while a cinematic is running the director picks the frame itself, by name and index
  if (f.cineAnim){ const a = A[f.cineAnim]; if (a) return { a, i:clamp(f.cineFrame | 0, 0, a.frames - 1) }; }
  switch (f.state){
    case 'attack': {
      const m = ATT[f.attack], a = A[m.anim], imp = Math.max(1, a.impact);
      if (f.stateT < m.startup) return { a, i:clamp(Math.floor(f.stateT / m.startup * imp), 0, imp - 1) };
      const rest = a.frames - imp, span = m.active + m.recovery;
      return { a, i:clamp(imp + Math.floor((f.stateT - m.startup) / span * rest), imp, a.frames - 1) };
    }
    case 'cast': { const a = A.cast || A.attack2; return { a, i:clamp(Math.floor(f.animT * (a.fps || 12)), 0, a.frames - 1) }; }
    case 'grab': { const a = A.grab || A.attack1; return { a, i:clamp(Math.floor(f.stateT * (a.fps || 14)), 0, a.frames - 1) }; }
    case 'throw': {                                  // played across hold -> lift -> slam
      const a = A.throwHold || A.grab || A.attack1;
      return { a, i:clamp(Math.floor(f.stateT * (a.fps || 6)), 0, a.frames - 1) };
    }
    case 'grabbed': { const a = A.grabbed || A.hit; return { a, i:0 }; }
    case 'thrown': { const a = A.thrown || A.fall; return { a, i:Math.floor(f.animT * (a.fps || 10)) % a.frames }; }
    case 'frozen': return { a:A.hit, i:0 };          // held in the pose the ice caught them in
    case 'hit': return { a:A.hit, i:oneShot(A.hit, f.animT) };
    case 'stagger': { const a = A.stagger || A.hit; return { a, i:oneShot(a, f.animT) }; }
    case 'airhit': {                                 // tilted back on the way up, tumbling after the bounce
      const a = f.bounced ? (A.tumble || A.fall) : (A.airhit || A.hit);
      return { a, i:oneShot(a, f.animT) };
    }
    case 'blockstun': return { a:A.hit, i:0 };
    case 'block': { const a = A.block || A.idle; return { a, i:a.loop ? oneShot(a, f.animT) : 0 }; }
    case 'air': return f.vy < 0 ? { a:A.jump, i:oneShot(A.jump, f.animT) } : { a:A.fall, i:oneShot(A.fall, f.animT) };
    case 'down': { const a = A.knockdown || A.death; return { a, i:oneShot(a, f.animT * 2.2) }; }
    case 'getup': { const a = A.getup || A.death; return { a, i:oneShot(a, f.animT) }; }
    case 'ko': return { a:A.death, i:oneShot(A.death, f.animT) };
    case 'walk': return { a:A.run, i:Math.floor(f.animT * A.run.fps) % A.run.frames };
    case 'answer': return { a:A.idle, i:Math.floor(f.animT * A.idle.fps * .5) % A.idle.frames };
    default: return { a:A.idle, i:Math.floor(f.animT * A.idle.fps) % A.idle.frames };
  }
}
function drawFighter(f, t){
  if (f.vanish > 0) return;                         // mid-teleport: nothing of them is here
  const S = f.sheet, { a, i } = frameOf(f), img = IMG[a.img];
  if (!img || !img.width) return;
  const fw = img.width / (a.of || a.frames), fh = img.height, sc = S.scale;
  const sx = (i + (a.offset || 0)) * fw;            // `of`/`offset`: borrow one frame of a strip
  const lean = f.state === 'blockstun' ? -7 * f.facing : f.state === 'block' ? -4 * f.facing : 0;

  if (!LOW){                                        // contact shadow, shrinking as they rise
    const h = clamp(1 - (GROUND - f.y) / 260, .25, 1);
    ctx.fillStyle = 'rgba(0,0,0,' + (.34 * h).toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(f.x, GROUND + 2, 44 * h, 9 * h, 0, 0, 6.283); ctx.fill();
  }
  if (f.power && !LOW){
    const k = f.power.type === 'double' ? 0 : 1, s = 150 + Math.sin(t * 9) * 12;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(auraTex[k], f.x - s / 2, f.y - 150 - s / 2 + 60, s, s);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.save();
  ctx.translate(Math.round(f.x + lean), Math.round(f.y));
  if (f.facing !== S.faces) ctx.scale(-1, 1);
  // A placeholder pose: borrowed frames bent into a new shape by the transform, not by new
  // art. It runs inside the facing flip, so a lean or a spin mirrors with the fighter.
  // pivot is in sprite pixels above the feet, rot in radians, dx/dy in stage pixels.
  // `poseSpin` is a rotation the game adds on top of the strip's own pose, for a fighter
  // being turned over in the air by something - a throw, for now.
  const pose = a.pose, spin = f.poseSpin || 0;
  if (pose || spin){
    const q = pose || {}, rot = (q.rot || 0) + spin;
    if (q.dx || q.dy) ctx.translate(q.dx || 0, q.dy || 0);
    if (rot || q.flipX || q.flipY){
      const pv = (q.pivot || 0) * sc;
      ctx.translate(0, -pv);
      if (rot) ctx.rotate(rot);
      if (q.flipX || q.flipY) ctx.scale(q.flipX ? -1 : 1, q.flipY ? -1 : 1);
      ctx.translate(0, pv);
    }
  }
  const dx = Math.round(-S.anchorX * sc), dy = Math.round(-S.anchorY * sc);
  ctx.drawImage(img, sx, 0, fw, fh, dx, dy, fw * sc, fh * sc);
  if (f.flash > 0){                                 // a cheap white-out: the same frame, added on top
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(f.flash * 4, 0, .85);
    ctx.drawImage(img, sx, 0, fw, fh, dx, dy, fw * sc, fh * sc);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  if (f.frozen > 0 && !LOW){                        // the same frame, filled in through its own shape
    ctx.globalAlpha = .62;
    ctx.drawImage(tintFrame(img, sx, fw, fh, '#7fd8ff', .85), 0, 0, fw, fh, dx, dy, fw * sc, fh * sc);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  if (f.state === 'block' || f.state === 'blockstun'){
    const hard = f.state === 'blockstun';
    const gx = f.x + f.facing * 10, gy = f.y - 84, base = f.facing > 0 ? 0 : Math.PI;
    const a0 = base - .95, a1 = base + .95, rOut = 70, rIn = 52;
    ctx.save();
    ctx.beginPath();                                // a band of light held out in front
    ctx.arc(gx, gy, rOut, a0, a1);
    ctx.arc(gx, gy, rIn, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = hard ? 'rgba(255,228,170,.26)' : 'rgba(201,162,74,.13)';
    ctx.fill();
    ctx.strokeStyle = hard ? 'rgba(255,248,228,.95)' : 'rgba(226,192,112,.8)';
    ctx.lineWidth = hard ? 4 : 2.5;
    ctx.beginPath(); ctx.arc(gx, gy, rOut, a0, a1); ctx.stroke();
    ctx.restore();
  }
  if (f.state === 'answer'){                        // a tablet over the head: this one is answering
    const bx = f.x, by = f.y - 196;
    ctx.fillStyle = 'rgba(20,12,10,.9)'; ctx.fillRect(bx - 20, by - 26, 40, 40);
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 2; ctx.strokeRect(bx - 20, by - 26, 40, 40);
    ctx.fillStyle = '#f0c75e'; ctx.font = 'bold 28px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', bx, by - 4);
  }
}

// ---------------------------------------------------------------- mystery box
const box = { state:'none', x:VW / 2, y:0, vy:0, spin:0 };
function spawnBox(){ box.state = 'falling'; box.x = VW / 2; box.y = -40; box.vy = 0; }
function removeBox(){ box.state = 'none'; game.boxTimer = 30; }
function updateBox(dt, t){
  if (game.phase !== 'fight') return;
  if (box.state === 'none'){ game.boxTimer -= dt; if (game.boxTimer <= 0) spawnBox(); return; }
  if (box.state === 'falling'){
    box.vy += 1500 * dt; box.y += box.vy * dt;
    if (box.y >= GROUND - 34){
      box.y = GROUND - 34; box.state = 'ground';
      sparks(box.x, GROUND - 6, { col:'255,210,122', n:16, speed:190, gravity:500 });
      sfx.thud(); game.shake = Math.max(game.shake, 7);
    }
  } else if (box.state === 'ground'){
    box.spin += dt * 1.6;
    if (!Q.active){
      const order = Math.random() < .5 ? [F[0], F[1]] : [F[1], F[0]];
      for (const f of order) if ((f.state === 'idle' || f.state === 'walk') && !airborne(f) && Math.abs(f.x - box.x) < 54){ grabBox(f); break; }
    }
  }
}
function drawBox(t){
  if (box.state === 'none' || box.state === 'taken') return;
  const bob = box.state === 'ground' ? Math.sin(t * 3) * 5 : 0;
  ctx.save();
  ctx.translate(box.x, box.y + bob);
  ctx.rotate(Math.sin(box.spin) * .12);
  if (!LOW){
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(auraTex[1], -70, -70, 140, 140);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(crateTex, -34, -34, 68, 68);
  ctx.restore();
}

// ---------------------------------------------------------------- game state
const game = {
  phase:'menu', mode:'cpu', round:1, timer:90, freeze:false, paused:false, pausedAt:0,
  hitstop:0, slowT:0, slowScale:1, simTime:0, events:[], clashCD:0, boxTimer:30, shake:0, token:0,
};
function later(ms, fn){ const tok = game.token; setTimeout(() => { if (tok === game.token) fn(); }, ms); }
function scheduleSim(delay, fn){ game.events.push({ t:game.simTime + delay, fn }); }

const bannerEl = $('#banner'); let bannerTimer = null;
function showBanner(text, cls, ms){
  bannerEl.className = 'banner'; void bannerEl.offsetWidth;
  bannerEl.textContent = text; bannerEl.className = 'banner show ' + (cls || '');
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { bannerEl.className = 'banner'; }, ms);
}
const toastEl = $('#toast'); let toastTimer = null;
function toast(text){ toastEl.textContent = text; toastEl.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 1400); }
function screenFlash(){ const el = $('#flash'); el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 60); }
function floatText(f, text, cls){
  const el = document.createElement('div'); el.className = 'float ' + (cls || ''); el.textContent = text;
  el.style.left = toScreenX(f.x) + 'px'; el.style.top = toScreenY(f.y - 190) + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 1350);
}

// ---------------------------------------------------------------- questions
const Q = { active:null };
const qEl = $('#q'), qOpts = Array.from(document.querySelectorAll('#qOpts .opt'));
function startQuestion(o){
  const now = performance.now();
  const A = Object.assign({ q:drawQuestion(o.diff), start:now, locked:{}, resolved:false, winner:null, cpuAt:{}, cpuPick:{}, doneAt:0 }, o);
  Q.active = A;
  if (A.global) game.freeze = true;
  for (const p of A.participants) if (p.cpu){
    const [a, b] = CPU_DELAY[A.diff];
    A.cpuAt[p.id] = now + rand(a, b) * 1000;
    const right = Math.random() < CPU_ACC[A.diff];
    A.cpuPick[p.id] = right ? A.q.correct : pick([0, 1, 2, 3].filter(i => i !== A.q.correct));
  }
  qEl.className = 'q ' + (A.global ? '' : 'side-' + A.side) + ' kind-' + A.kind;
  $('#qTitle').textContent = A.title; $('#qStakes').textContent = A.stakes;
  $('#qLang').textContent = A.q.lang; $('#qCode').textContent = A.q.code;
  qOpts.forEach((el, i) => { el.className = 'opt'; el.querySelector('.txt').textContent = A.q.opts[i]; el.querySelector('.marks').innerHTML = ''; });
  const r = $('#qResult'); r.textContent = ''; r.className = 'q-result';
  $('#qBar').style.width = '100%';
  $('#qKeys').innerHTML = A.participants.filter(p => !p.cpu).map(keyLegend).join('');
  renderWho();
  void qEl.offsetWidth; qEl.classList.add('in');
}
function keyLegend(p){
  const kb = p.id === 0 ? ['U','I','J','K'] : ['7','8','4','5'];
  const grid = keys => '<span class="kgrid">' + keys.map(k => '<kbd>' + k + '</kbd>').join('') + '</span>';
  let html = '<div class="legend"><span>' + p.short + (p.id === 1 ? ' (numpad)' : '') + '</span>' + grid(kb);
  if (p.id === 0 && game.mode === 'cpu') html += '<span>or</span>' + grid(['7','8','4','5']);
  if (padStates[p.id]) html += '<span>or</span>' + grid(['□','△','✕','○']);
  return html + '</div>';
}
function renderWho(){
  const A = Q.active; if (!A) return;
  $('#qWho').innerHTML = A.participants.map(p => {
    let s = 'thinking', cls = '';
    if (A.resolved){ if (A.winner === p){ s = 'got it'; cls = 'ok'; } else if (A.locked[p.id]){ s = 'wrong answer'; cls = 'no'; } else { s = 'too slow'; cls = 'no'; } }
    else if (A.locked[p.id]){ s = 'wrong answer, locked out'; cls = 'no'; }
    const role = A.roles ? ' <em>' + A.roles[p.id] + '</em>' : '';
    return '<span class="who p' + p.id + ' ' + cls + '"><b>' + p.name + '</b>' + role + '<i>' + s + '</i></span>';
  }).join('');
}
function answer(p, i){
  const A = Q.active; if (!A || A.resolved || A.locked[p.id]) return;
  const mark = document.createElement('span'); mark.className = 'mark';
  if (i === A.q.correct){
    mark.textContent = p.short + ' ✓'; qOpts[i].querySelector('.marks').appendChild(mark); resolveQ(p);
  } else {
    A.locked[p.id] = true; mark.textContent = p.short + ' ✗'; mark.classList.add('x');
    qOpts[i].classList.add('wrong'); qOpts[i].querySelector('.marks').appendChild(mark); sfx.wrong();
    if (A.participants.every(q => A.locked[q.id])) resolveQ(null); else renderWho();
  }
}
function resolveQ(w){
  const A = Q.active; A.resolved = true; A.winner = w; A.doneAt = performance.now() + (A.global ? 1300 : 850);
  A.participants.forEach(p => p.stats.asked++); if (w) w.stats.right++;
  qOpts[A.q.correct].classList.add('correct');
  const r = $('#qResult'); r.textContent = A.result(w); r.className = 'q-result ' + (w ? 'good' : 'bad');
  if (w) sfx.right(); else if (!A.participants.some(p => A.locked[p.id])) sfx.wrong();
  renderWho();
}
function finishQ(){
  const A = Q.active; Q.active = null; qEl.className = 'q hidden';
  if (A.global) game.freeze = false;
  A.participants.forEach(p => { p.inputLock = .2; p.buffer = null; });
  A.onDone(A.winner);
}
function clearQuestion(){
  Q.active = null; qEl.className = 'q hidden'; game.freeze = false;
  F.forEach(f => { if (f.state === 'answer') setState(f, restState(f)); });
}
function questionTick(now){
  const A = Q.active; if (!A) return;
  if (!A.resolved){
    const el = (now - A.start) / 1000;
    $('#qBar').style.width = Math.max(0, 1 - el / A.dur) * 100 + '%';
    for (const p of A.participants) if (p.cpu && !A.locked[p.id] && now >= A.cpuAt[p.id]){ answer(p, A.cpuPick[p.id]); if (A.resolved) break; }
    if (Q.active === A && !A.resolved && el >= A.dur) resolveQ(null);
  } else if (now >= A.doneAt) finishQ();
}

// ---------------------------------------------------------------- combat
function lowMoveBlocked(f, act){
  const name = act === 'fatal' ? 'Fatal Blow' : 'Double or nothing';
  if (f.hp > 30) return name + ' unlocks below 30% health';
  if (act === 'fatal' && f.lowUsed.fatal) return 'Fatal Blow is already used this match';
  if (act === 'don' && f.lowUsed.don) return 'Double or nothing is already used this match';
  if (f.roundLow) return 'You already used a low-health move this round';
  if (act === 'fatal' && f.fatalCD > 0) return 'Fatal Blow ready in ' + Math.ceil(f.fatalCD) + 's';
  return '';
}
function ampBlocked(f){
  if (f.meter < AMP_COST) return 'Amplify needs one full bar of meter';
  return '';
}
function canAmp(f){ return f.meter >= AMP_COST && f.hp > 0 && !Q.active && game.phase === 'fight'; }
function gainMeter(f, n){ if (f.hp > 0) f.meter = clamp(f.meter + n, 0, METER_MAX); }
function canFatal(f){ return f.hp <= 30 && f.hp > 0 && !f.lowUsed.fatal && !f.roundLow && f.fatalCD <= 0 && !Q.active && game.phase === 'fight'; }
function canDon(f){ return f.hp <= 30 && f.hp > 0 && !f.lowUsed.don && !f.roundLow && !Q.active && game.phase === 'fight'; }
function startAttack(f, type){
  const o = other(f);
  f.facing = Math.sign(o.x - f.x) || f.facing;
  setState(f, 'attack'); f.attack = type; f.attackHit = false; f.scripted = false;
  sfx.whoosh();
}
function tryHit(att, def, a){
  const dist = Math.abs(def.x - att.x);
  if (dist > a.range) return;
  // a juggled opponent counts as in range much further up: that is what makes juggling
  // them from the floor possible at all
  if (Math.abs(def.y - att.y) > (def.state === 'airhit' ? AIR_REACH : 122)) return;   // else they jumped clear of it
  if (def.state === 'down' || def.state === 'getup' || def.state === 'ko' || def.invuln > 0) return;
  if (def.state === 'grabbed' || def.state === 'thrown') return;      // already in someone's hands
  att.attackHit = true;
  const hx = (att.x + def.x) / 2 + att.facing * 14, hy = a.y;
  const facingAtt = Math.sign(att.x - def.x) === def.facing;
  if ((def.state === 'block' || def.state === 'blockstun') && facingAtt){
    setState(def, 'blockstun'); def.hitstun = .22; def.x += att.facing * 14;
    sparks(hx, hy, { col:'159,196,255', n:10, speed:230 }); sfx.block();
    game.shake = Math.max(game.shake, 4); game.hitstop = .03;
    if (a.fatal){ att.fatalCD = 4; floatText(def, 'Blocked', 'gold'); }
    return;
  }
  if (a.fatal){ triggerFatal(att, def); return; }
  const dmg = a.dmg * (att.power && att.power.type === 'double' ? 2 : 1);
  att.combo = stunned(def.state) ? att.combo + 1 : 1;
  if (att.combo >= 2){ att.comboShowN = att.combo; att.comboShowT = 1.2; }
  // Hits 1 and 2 are plain standing hitstun. Hit 3 staggers them, or knocks them flat if
  // the blow is a heavy one. None of that applies off the floor: up there every hit feeds
  // the juggle instead, and the juggle decides when it ends.
  const air = airborne(def) || def.state === 'airhit';
  const kd = !air && !a.launcher && (!!a.knockdown || (att.combo >= 3 && !!a.heavy));
  const stagger = !air && !kd && !a.launcher && att.combo >= 3;
  dealDamage(att, def, dmg, { knockdown:kd, stagger, launch:!air && !!a.launcher, juggle:air,
    hitstun:a.hitstun, push:a.push, x:hx, y:hy, heavy:!!a.heavy || kd });
  if (def.hp > 0 && !kd && att.combo >= 4 && game.clashCD <= 0 && !Q.active && game.phase === 'fight') startClash(att, def);
}
function dealDamage(att, def, dmg, o){
  o = o || {};
  if (game.phase !== 'fight') return;
  const A = Q.active;
  if (A && A.kind === 'box' && A.participants[0] === def){ clearQuestion(); removeBox(); floatText(def, 'Box lost', 'bad'); }
  def.hp = Math.max(0, def.hp - dmg); def.flash = .14;
  if (def.frozen > 0){                                 // a clean hit breaks the ice
    def.frozen = 0;
    sparks(def.x, def.y - 110, { col:'214,246,255', n:LOW ? 12 : 30, speed:420, life:.55, add:true });
    sfx.clink();
  }
  const dir = att ? att.facing : -def.facing;
  const x = o.x !== undefined ? o.x : def.x, y = o.y !== undefined ? o.y : def.y - 150;
  sparks(x, y, { n:o.heavy ? 24 : 14, speed:o.heavy ? 400 : 290 });
  blood(x, y, dir, { n:o.heavy ? 16 : 8 });
  game.hitstop = o.heavy ? .09 : .05; game.shake = Math.max(game.shake, o.heavy ? 13 : 6); sfx.hit(!!o.heavy);
  // The meter pays both sides, so being on the wrong end of a beating still builds towards
  // one. Airborne hits pay a fraction of that, or a juggle would refund its own launcher.
  const mscale = o.juggle ? METER_AIR_SCALE : 1;
  if (att && !o.launch) gainMeter(att, dmg * METER_ON_DEAL * mscale);
  gainMeter(def, dmg * METER_ON_TAKE * mscale);
  if (def.hp <= 0){ roundOver(att || other(def), def); return; }
  if (o.launch) launchUp(def, dir);
  else if (o.juggle) juggleUp(def, dir);
  else if (o.knockdown){
    setState(def, 'down'); def.hitstun = 0; def.y = GROUND; def.vy = 0; def.vx = dir * 400;
    def.downT = DOWN_T; def.juggle = 0; def.bounced = false;
  }
  else if (o.stagger){
    setState(def, 'stagger'); def.hitstun = STAGGER_T; def.x += dir * 8;
    game.shake = Math.max(game.shake, 11); floatText(def, 'Stagger', 'gold');
  }
  else if (o.hitstun){ setState(def, 'hit'); def.hitstun = o.hitstun; if (o.push) def.x += dir * o.push; }
}

// ---------------------------------------------------------------- juggles
// The launcher: off the floor with one big push, and gravity does the rest.
function launchUp(def, dir){
  setState(def, 'airhit'); def.hitstun = 0; def.juggle = 0; def.bounced = false;
  def.y = Math.min(def.y, GROUND - 2); def.vy = LAUNCH_V; def.vx = dir * 70;
  sparks(def.x, def.y - 80, { col:'255,224,138', n:30, speed:380, gravity:-140, up:120, life:.55 });
  game.shake = Math.max(game.shake, 15); game.hitstop = .1; sfx.launch();
  floatText(def, 'Launched', 'gold');
}
// Every hit up there adds a smaller pop than the last. Once the next one would be too small
// to matter they stop rising, which is the hard end of every juggle.
function juggleUp(def, dir){
  if (def.state !== 'airhit'){ setState(def, 'airhit'); def.juggle = 0; def.bounced = false; }
  def.animT = 0; def.hitstun = 0;
  const lift = JUGGLE_LIFT * Math.pow(JUGGLE_FALLOFF, def.juggle);
  def.juggle++;
  if (lift >= JUGGLE_MIN_LIFT) def.vy = Math.max(LAUNCH_V, def.vy - lift);
  else def.vy = Math.max(def.vy, -40);               // out of lift: from here they only fall
  def.vx = dir * 60;
  if (def.y > GROUND - 2) def.y = GROUND - 2;
}
// A juggle always lands the same way: one ground bounce, then they lie there.
function landJuggle(f){
  if (!f.bounced){
    f.bounced = true; f.animT = 0; f.y = GROUND - 2; f.vy = BOUNCE_V; f.vx *= .5;
    sparks(f.x, GROUND - 6, { col:'214,176,132', n:LOW ? 8 : 18, speed:300, gravity:600, life:.4 });
    game.shake = Math.max(game.shake, 9); game.hitstop = .04; sfx.bounce();
    return;
  }
  setState(f, 'down'); f.downT = JUGGLE_DOWN_T; f.y = GROUND; f.vy = 0; f.vx *= .4;
  f.juggle = 0; f.bounced = false; other(f).combo = 0;
  sparks(f.x, GROUND - 4, { col:'190,160,130', n:LOW ? 4 : 10, speed:150, life:.3, gravity:400 });
  game.shake = Math.max(game.shake, 6); sfx.land();
}
// Used wherever something else takes the juggle over: a clash, a breakaway, a round reset.
function endJuggle(f){
  f.juggle = 0; f.bounced = false;
  if (f.state === 'airhit') setState(f, restState(f));
}
function heal(f, n){
  f.hp = Math.min(100, f.hp + n); f.ghost = f.hp;
  sparks(f.x, f.y - 110, { col:'109,255,168', n:26, speed:150, gravity:-180, life:.8, up:90 });
  sfx.heal(); floatText(f, '+' + n, 'good');
}

// combo clash
function startClash(att, def){
  game.clashCD = 12; game.freeze = true;
  showBanner('Clash!', 'clash', 800); sfx.gong();
  later(650, () => {
    if (game.phase !== 'fight'){ game.freeze = false; return; }
    startQuestion({
      kind:'clash', diff:'easy', dur:6, participants:[att, def], global:true, title:'Combo clash',
      stakes:'First right answer wins. ' + att.short + ' gets 3 bonus hits, ' + def.short + ' breaks free.',
      roles:{ [att.id]:'attacking', [def.id]:'defending' },
      result:w => !w ? 'Nobody got it. The combo ends.' : w === att ? att.short + ' keeps the combo going!' : def.short + ' breaks free!',
      onDone:w => {
        if (game.phase !== 'fight') return;
        if (w === att) bonusHits(att, def);
        else if (w === def) breakaway(def, att);
        else { endJuggle(def); setState(def, restState(def)); def.hitstun = 0; def.x += att.facing * 40; att.combo = 0; }
      },
    });
  });
}
function bonusHits(att, def){
  att.y = GROUND; att.vy = 0; def.y = GROUND; def.vy = 0; endJuggle(def);
  def.x = clamp(att.x + att.facing * 150, WALL_L, WALL_R); setState(def, 'hit'); def.hitstun = 2;
  ['fp', 'bp', 'bk'].forEach((type, i, arr) => scheduleSim(.05 + i * .26, () => {
    if (game.phase !== 'fight') return;
    setState(att, 'attack'); att.attack = type; att.stateT = ATT[type].startup; att.attackHit = true; att.scripted = true;
    att.combo++; att.comboShowN = att.combo; att.comboShowT = 1.4;
    const last = i === arr.length - 1;
    dealDamage(att, def, 5 * (att.power && att.power.type === 'double' ? 2 : 1),
      { hitstun:last ? 0 : 2, knockdown:last, x:(att.x + def.x) / 2, y:ATT[type].y, heavy:last });
    if (last) att.combo = 0;
  }));
}
function breakaway(def, att){
  endJuggle(def);
  setState(def, restState(def)); def.hitstun = 0; def.invuln = .4; att.combo = 0;
  sparks(def.x, def.y - 130, { col:'255,224,138', n:36, speed:440, gravity:150, life:.5 });
  floatText(def, 'Breaker!', 'gold');
  dealDamage(def, att, 5, { knockdown:true, x:att.x, y:att.y - 150, heavy:true });
}




// ---------------------------------------------------------------- throws
// A throw beats a guard, which is what stops blocking from being a free ride - so the only
// answer to one is to tech it. The grab hands the defender a window measured in frames, and
// the white flash on contact is the cue that the window has opened.
const THROW = {
  startup:.10, active:.08, recovery:.32,              // the whiff, if it catches nothing
  // Two standing fighters can never be closer than MIN_GAP (82), so a throw that only
  // reached 98 left 16px of tolerance - and holding back to get a back throw walks you out of
  // it before the grab lands. This is still far and away the shortest range in the game: the
  // quickest punch reaches 188.
  range:132, reach:84,
  tech:.35,                                           // the window the defender gets
  hold:.42, lift:.26, slam:.20,                       // the throw itself, once the window shuts
  dmg:14, backDmg:17, lifted:198, place:112, push:132, cd:.85,
};
const CPU_TECH = .3;
const thr = { on:false, att:null, def:null, t:0, phase:'', back:false, tx:0, fromX:0, cpuTechAt:-1 };
function thrReset(){
  if (thr.att) thr.att.poseSpin = 0;
  if (thr.def) thr.def.poseSpin = 0;
  thr.on = false; thr.att = thr.def = null; thr.t = 0; thr.phase = ''; thr.cpuTechAt = -1;
}
function throwBlocked(f){
  if (airborne(f)) return 'No throwing in the air';
  if (f.throwCD > 0) return 'Throw is still recovering';
  return '';
}
function canThrow(f){
  return !airborne(f) && f.hp > 0 && f.throwCD <= 0 && !thr.on &&
    !Q.active && game.phase === 'fight' && !cine.on;
}
// who can be grabbed: not off the floor, not already being thrown, not on the ground. Blocking
// is deliberately not on this list.
function throwable(o){
  if (airborne(o) || o.hp <= 0 || o.invuln > 0) return false;
  return !(o.state === 'down' || o.state === 'getup' || o.state === 'ko' ||
           o.state === 'grabbed' || o.state === 'thrown' || o.state === 'frozen');
}
function startThrow(f){
  const h = f.held;
  f.throwBack = (h.left && f.facing > 0) || (h.right && f.facing < 0);   // back throw
  f.facing = Math.sign(other(f).x - f.x) || f.facing;
  setState(f, 'grab'); f.throwCD = THROW.cd; f.vx = 0; f.buffer = null;
  sfx.whoosh();
}
function tryGrab(att, def){
  if (Math.abs(def.x - att.x) > THROW.range) return false;
  if (Math.abs(def.y - att.y) > THROW.reach) return false;
  if (!throwable(def)) return false;
  thr.on = true; thr.att = att; thr.def = def; thr.t = 0; thr.phase = 'hold';
  thr.back = !!att.throwBack;
  setState(att, 'throw'); setState(def, 'grabbed');
  att.vx = 0; def.vx = 0; def.vy = 0; def.hitstun = 0; def.buffer = null;
  endJuggle(def); def.poseSpin = 0; att.combo = 0;
  def.x = clamp(att.x + att.facing * 64, WALL_L, WALL_R);
  def.y = GROUND; att.y = GROUND;
  game.hitstop = .09; game.shake = Math.max(game.shake, 9);
  screenFlash(); sfx.grab();                          // the flash is the tech cue
  // the CPU decides here whether this one gets away
  thr.cpuTechAt = (def.cpu && Math.random() < CPU_TECH) ? rand(.05, THROW.tech - .05) : -1;
  return true;
}
function techThrow(){
  if (!thr.on || thr.phase !== 'hold' || thr.t > THROW.tech) return false;
  const att = thr.att, def = thr.def;
  const s = Math.sign(def.x - att.x) || att.facing;
  setState(att, restState(att)); setState(def, restState(def));
  att.x = clamp(att.x - s * THROW.push * .5, WALL_L, WALL_R);
  def.x = clamp(def.x + s * THROW.push * .5, WALL_L, WALL_R);
  att.invuln = def.invuln = .25; att.inputLock = def.inputLock = .14;
  att.throwCD = def.throwCD = .5;
  sparks((att.x + def.x) / 2, GROUND - 150, { col:'255,236,180', n:LOW ? 14 : 34, speed:440, life:.5, add:true });
  game.shake = Math.max(game.shake, 12); game.hitstop = .07;
  screenFlash(); sfx.clink();
  showBanner('THROW ESCAPE', 'tech', 900);
  thrReset();
  return true;
}
// The throw proper: held, then up, over, and down. Driven here rather than out of the fighter
// state machine, because for its length the two of them are one moving thing.
function updateThrow(dt){
  if (!thr.on) return;
  const att = thr.att, def = thr.def;
  if (game.phase !== 'fight' || att.hp <= 0){ thrReset(); return; }
  thr.t += dt;
  if (thr.phase === 'hold'){
    def.x = clamp(att.x + att.facing * 64, WALL_L, WALL_R);
    def.y = GROUND;
    if (thr.cpuTechAt >= 0 && thr.t >= thr.cpuTechAt){ techThrow(); return; }
    if (thr.t >= THROW.hold){
      thr.phase = 'lift'; thr.t = 0;
      thr.fromX = def.x;
      thr.tx = clamp(att.x + (thr.back ? -1 : 1) * att.facing * THROW.place, WALL_L + 20, WALL_R - 20);
      sfx.whoosh();
    }
  } else if (thr.phase === 'lift'){
    const k = clamp(thr.t / THROW.lift, 0, 1), e = 1 - Math.pow(1 - k, 2);
    def.y = GROUND - THROW.lifted * e;
    def.x = thr.fromX + (thr.tx - thr.fromX) * (e * .45);
    def.poseSpin = e * Math.PI * .9 * -att.facing;     // over they go
    if (k >= 1){ thr.phase = 'slam'; thr.t = 0; }
  } else if (thr.phase === 'slam'){
    const k = clamp(thr.t / THROW.slam, 0, 1), e = k * k;
    def.y = GROUND - THROW.lifted * (1 - e);
    def.x = thr.fromX + (thr.tx - thr.fromX) * (.45 + .55 * e);
    def.poseSpin = (Math.PI * .9 + e * Math.PI * 1.1) * -att.facing;
    if (k >= 1){
      def.x = thr.tx; def.y = GROUND; def.vy = 0; def.poseSpin = 0;
      const n = thr.back ? THROW.backDmg : THROW.dmg;
      setState(att, restState(att)); att.throwCD = .35;
      game.shake = Math.max(game.shake, 22); sfx.slam();
      sparks(def.x, GROUND - 20, { col:'206,172,138', n:LOW ? 10 : 26, speed:360, gravity:700, life:.5 });
      thrReset();
      dealDamage(att, def, n, { knockdown:true, heavy:true, x:def.x, y:GROUND - 80 });
      if (def.state === 'down'){ def.vx = 0; def.downT = 1.05; }
      floatText(def, '-' + n, 'bad');
    }
  }
}

// ---------------------------------------------------------------- special moves
// Motion inputs, read off an input buffer. Every time a direction goes from not-held to held
// it lands in the fighter's buffer with a timestamp; pressing an attack then asks whether the
// last few entries spell a motion and whether the whole thing happened inside the window.
// Back and forward are relative to facing, and `down` is the block direction, as it is on both
// keyboard layouts and on the pad.
const MOTION_WINDOW = .4;                            // the whole sequence, in seconds
const MOTION = { bf:['b', 'f'], db:['d', 'b'] };
function trackMotion(f, now){
  const h = f.held, fwd = f.facing;
  const cur = {
    b:(h.left && fwd > 0) || (h.right && fwd < 0),
    f:(h.right && fwd > 0) || (h.left && fwd < 0),
    d:!!h.block,
  };
  for (const k in cur) if (cur[k] && !f.dirPrev[k]) f.motion.push({ d:k, t:now });
  f.dirPrev = cur;
  while (f.motion.length && now - f.motion[0].t > MOTION_WINDOW * 1000) f.motion.shift();
  if (f.motion.length > 6) f.motion.shift();
}
function motionMatch(f, name, now){
  const seq = MOTION[name], m = f.motion;
  if (m.length < seq.length) return false;
  const tail = m.slice(-seq.length);
  for (let i = 0; i < seq.length; i++) if (tail[i].d !== seq[i]) return false;
  return (now - tail[0].t) <= MOTION_WINDOW * 1000;
}

// Each fighter's two specials, as data. `fire` is what the move actually does; everything
// before it is the shared shape of a special - a cast pose, a window where Amplify can still
// catch it, and a cooldown. None of them cost meter.
const SPECIALS = {
  // Serpent.py (the Martial Hero sheet - Samurai Mack)
  serpent: [
    { name:'Pointer Pull', motion:'bf', startup:.17, recovery:.30, cd:2.2,
      fire:(f, o, amp) => shoot(f, 'chain', amp) },
    { name:'Goto Strike', motion:'db', startup:.14, recovery:.34, cd:3.4,
      fire:(f, o, amp) => gotoStrike(f, o, amp) },
  ],
  // Undefined.js (the Martial Hero 2 sheet - Kenji)
  undefined_js: [
    { name:'Null Freeze', motion:'bf', startup:.18, recovery:.32, cd:2.6,
      fire:(f, o, amp) => shoot(f, 'freeze', amp) },
    { name:'Recursion Portal', motion:'db', startup:.16, recovery:.36, cd:3.8,
      fire:(f, o, amp) => recursionPortal(f, o, amp) },
  ],
};
const specialsOf = f => SPECIALS[f.sheetKey] || SPECIALS.serpent;
function specReady(f, i){
  return f.spCD[i] <= 0 && f.hp > 0 && !Q.active && game.phase === 'fight' && !cine.on;
}
function startSpecial(f, i){
  const sp = specialsOf(f)[i]; if (!sp) return false;
  f.facing = Math.sign(other(f).x - f.x) || f.facing;
  setState(f, 'cast'); f.special = sp; f.specIdx = i; f.specAmp = false; f.specFired = false;
  f.spCD[i] = sp.cd; f.motion.length = 0;
  f.vx = 0; sfx.cast();
  floatText(f, sp.name, 'gold');
  sparks(f.x + f.facing * 26, f.y - 118, { col:'184,214,255', n:LOW ? 6 : 14, speed:150, gravity:-120, life:.4 });
  return true;
}
// Amplify does not pay for a special, it upgrades one already on its way out.
function ampSpecial(f){
  if (f.state !== 'cast' || f.specAmp || f.specFired || f.meter < AMP_COST) return false;
  f.meter -= AMP_COST; f.specAmp = true;
  sfx.amp(); floatText(f, 'Amplified', 'gold');
  sparks(f.x, f.y - 110, { col:'255,196,112', n:26, speed:300, gravity:-140, up:70, life:.55 });
  game.shake = Math.max(game.shake, 7);
  return true;
}

// ---------------------------------------------------------------- projectiles
// A fixed pool, so a long match never allocates. A shot carries who threw it, which is what
// lets two of them cancel and what keeps one from hitting the fighter who threw it.
const SHOTS = [];
for (let i = 0; i < 8; i++) SHOTS.push({ live:false });
const SHOT_DEF = {
  freeze:{ speed:560, dmg:5, ampDmg:9, r:26, ampR:38, range:980, col:'126,214,255', freeze:1.5, ampFreeze:2.2 },
  chain:{ speed:720, dmg:4, ampDmg:8, r:20, ampR:28, range:470, col:'255,206,120', pull:true },
};
function shoot(f, kind, amp){
  const d = SHOT_DEF[kind];
  const s = SHOTS.find(q => !q.live); if (!s) return;
  s.live = true; s.kind = kind; s.def = d; s.amp = !!amp; s.owner = f;
  s.dir = f.facing; s.x = f.x + f.facing * 46; s.y = f.y - 112; s.x0 = s.x;
  s.t = 0; s.phase = 'out'; s.hooked = null;
  sfx.shot(kind === 'freeze');
}
function killShot(s, burst){
  if (burst) sparks(s.x, s.y, { col:s.def.col, n:LOW ? 10 : 24, speed:300, life:.45, gravity:60, add:true });
  s.live = false; s.hooked = null;
}
function shotR(s){ return s.amp ? s.def.ampR : s.def.r; }
function updateShots(dt){
  for (const s of SHOTS){
    if (!s.live) continue;
    s.t += dt;
    const d = s.def, o = other(s.owner);
    if (s.phase === 'out'){
      s.x += s.dir * d.speed * dt;
      if (!LOW && Math.random() < .7)                 // the tail it drags behind it
        emit(s.x - s.dir * 10, s.y, { n:1, speed:40, size:s.amp ? 7 : 5, life:.3, col:d.col, gravity:-20, add:true });
      if (Math.abs(s.x - s.x0) > d.range || s.x < WALL_L - 40 || s.x > WALL_R + 40){ killShot(s, true); continue; }
      // two shots in the air meet and take each other out
      for (const q of SHOTS){
        if (q === s || !q.live || q.owner === s.owner || q.phase !== 'out') continue;
        if (Math.abs(q.x - s.x) < shotR(s) + shotR(q) && Math.abs(q.y - s.y) < 46){
          const mx = (s.x + q.x) / 2, my = (s.y + q.y) / 2;
          sparks(mx, my, { col:'255,255,255', n:LOW ? 14 : 34, speed:430, life:.5, add:true });
          sparks(mx, my, { col:s.def.col, n:LOW ? 8 : 20, speed:300, life:.6, add:true });
          game.shake = Math.max(game.shake, 8); sfx.clink();
          floatText({ x:mx, y:my + 150 }, 'Cancel', 'gold');
          killShot(s); killShot(q);
          break;
        }
      }
      if (!s.live) continue;
      if (shotHits(s, o)) shotHit(s, o);
    } else if (s.phase === 'retract'){                // the chain, dragging them back in
      const f = s.owner, anchor = f.x + f.dir * 46;
      s.t += 0;
      const k = Math.min(1, s.t / .22);
      if (s.hooked){
        s.hooked.x = s.hx + (f.x + f.facing * 96 - s.hx) * k;
        s.hooked.y = GROUND; s.hooked.vy = 0;
        s.x = s.hooked.x - f.facing * 20;
      } else s.x = anchor;
      if (k >= 1){
        if (s.hooked){
          const n = s.amp ? d.ampDmg : d.dmg;
          dealDamage(f, s.hooked, n, { hitstun:s.amp ? .85 : .6, x:s.hooked.x, y:s.hooked.y - 150, heavy:s.amp });
          if (s.amp) game.shake = Math.max(game.shake, 12);
        }
        killShot(s, true);
      }
    }
  }
}
function shotHits(s, o){
  if (o.invuln > 0 || o.vanish > 0) return false;
  if (o.state === 'down' || o.state === 'getup' || o.state === 'ko') return false;
  if (o.state === 'grabbed' || o.state === 'thrown') return false;
  return Math.abs(o.x - s.x) < shotR(s) + 34 && Math.abs((o.y - 104) - s.y) < 90;
}
function shotHit(s, o){
  const d = s.def, f = s.owner;
  const facingIt = Math.sign(s.x - o.x) === o.facing;
  if ((o.state === 'block' || o.state === 'blockstun') && facingIt){     // guarded: chip and gone
    setState(o, 'blockstun'); o.hitstun = .24; o.x += s.dir * 10;
    dealDamage(null, o, s.amp ? 2 : 1, { x:s.x, y:s.y });
    sparks(s.x, s.y, { col:'159,196,255', n:16, speed:280, add:true }); sfx.block();
    game.shake = Math.max(game.shake, 5);
    killShot(s, true);
    return;
  }
  if (d.pull){                                        // the chain keeps hold of them
    s.phase = 'retract'; s.t = 0; s.hooked = o; s.hx = o.x;
    o.vx = 0; setState(o, 'hit'); o.hitstun = 1.2; endJuggle(o);
    sparks(s.x, s.y, { col:d.col, n:20, speed:240, add:true }); sfx.clink();
    return;
  }
  const n = s.amp ? d.ampDmg : d.dmg;
  dealDamage(f, o, n, { hitstun:.2, x:s.x, y:s.y, heavy:s.amp });
  if (o.hp > 0 && d.freeze) freezeFighter(o, s.amp ? d.ampFreeze : d.freeze);
  killShot(s, true);
}
function drawShots(t){
  for (const s of SHOTS){
    if (!s.live) continue;
    const r = shotR(s), col = s.def.col;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (s.kind === 'chain'){                          // links back to the hand, then a head
      const f = s.owner, hx = f.x + f.facing * 40, hy = f.y - 112;
      const n = Math.max(2, Math.round(Math.abs(s.x - hx) / 18));
      for (let i = 1; i <= n; i++){
        const k = i / n, lx = hx + (s.x - hx) * k, ly = hy + (s.y - hy) * k + Math.sin(t * 14 + i) * 2;
        ctx.fillStyle = 'rgba(' + col + ',' + (.5 + .4 * k).toFixed(2) + ')';
        ctx.fillRect(lx - 5, ly - 3, 10, 6);
      }
      const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, r * 1.9);
      g.addColorStop(0, 'rgba(255,245,210,.95)'); g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r * 1.9, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,196,.95)';
      ctx.beginPath();                                 // a spearhead on the end
      ctx.moveTo(s.x + s.dir * r, s.y); ctx.lineTo(s.x - s.dir * r * .5, s.y - r * .6);
      ctx.lineTo(s.x - s.dir * r * .5, s.y + r * .6); ctx.closePath(); ctx.fill();
    } else {                                           // a cold orb with a shell and a core
      // a small hard core inside a cold halo: added light goes white very fast, so the
      // white stop has to stay tiny or the whole orb reads as a flashbulb
      const puls = 1 + .1 * Math.sin(t * 18), R = r * 1.85 * puls;
      const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, R);
      g.addColorStop(0, 'rgba(255,255,255,.9)');
      g.addColorStop(.16, 'rgba(206,242,255,.62)');
      g.addColorStop(.46, 'rgba(' + col + ',.34)');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(226,246,255,.9)'; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++){                     // shards turning around it
        const a = t * 5 + i * 1.047, rr = r * (1.15 + .18 * Math.sin(t * 9 + i));
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(a) * rr * .5, s.y + Math.sin(a) * rr * .5);
        ctx.lineTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- freeze
function freezeFighter(o, secs){
  o.frozen = secs; setState(o, 'frozen'); o.hitstun = 0; o.vx = 0; o.vy = 0;
  endJuggle(o); o.buffer = null; o.motion.length = 0;
  sparks(o.x, o.y - 110, { col:'168,232,255', n:LOW ? 14 : 34, speed:300, life:.7, gravity:-40, add:true });
  sfx.freeze(); floatText(o, 'Frozen', 'gold');
}
function thaw(f){ f.frozen = 0; if (f.state === 'frozen') setState(f, restState(f)); }
// the shell of ice, drawn around whoever is in it
function drawFrost(f, t){
  if (f.frozen <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const h = 150, w = 54, cy = f.y - 92;
  const g = ctx.createRadialGradient(f.x, cy, 8, f.x, cy, h);
  g.addColorStop(0, 'rgba(150,224,255,.30)'); g.addColorStop(1, 'rgba(90,180,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(f.x, cy, w * 1.5, h, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(222,248,255,.8)'; ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++){                        // angular shards standing off the body
    const a = (i / 9) * 6.283 + Math.sin(t * .6 + i) * .1;
    const r0 = w * .62, r1 = w * (.86 + .22 * ((i * 37) % 7) / 7);
    ctx.beginPath();
    ctx.moveTo(f.x + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 1.55);
    ctx.lineTo(f.x + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 1.55);
    ctx.stroke();
  }
  ctx.restore();
  if (!LOW && Math.random() < .5)                     // frost drifting off them
    emit(f.x + rand(-30, 30), cy + rand(-70, 70), { n:1, speed:24, size:4, life:.8, col:'198,240,255', gravity:70, add:true });
}

// ---------------------------------------------------------------- scripted effects
// Portals and teleports: short-lived, they move a fighter around, and they draw themselves.
const FX = [];
function addFx(kind, o){ FX.push(Object.assign({ kind, t:0, life:.8, under:false }, o)); }
function updateFx(dt){
  for (let i = FX.length - 1; i >= 0; i--){
    const e = FX[i];
    e.t += dt;
    if (e.step) e.step(e, dt);
    if (e.t >= e.life) FX.splice(i, 1);
  }
}
function drawFxLayer(t, under){
  for (const e of FX){
    if (!!e.under !== under) continue;
    const k = clamp(e.t / e.life, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (e.kind === 'portal'){
      const open = clamp(Math.min(e.t, e.life - e.t) / .14, 0, 1);
      const rx = e.rx * open, ry = e.ry * open;
      const g = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, rx);
      g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(.3, 'rgba(' + e.col + ',.85)');
      g.addColorStop(.7, 'rgba(' + e.col + ',.5)'); g.addColorStop(1, 'rgba(' + e.col + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(e.x, e.y, rx, ry, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(' + e.col + ',.95)'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++){                    // rings turning at different rates
        const rr = rx * (1 - i * .22), a0 = t * (3 + i * 2.4) + i;
        ctx.beginPath(); ctx.ellipse(e.x, e.y, rr, ry * (1 - i * .22), 0, a0, a0 + 4.2); ctx.stroke();
      }
    } else if (e.kind === 'pixels'){                  // a fighter coming apart, or back together
      const n = LOW ? 14 : 34;
      for (let i = 0; i < n; i++){
        const a = (i * 2.399) % 6.283, sp = 20 + ((i * 53) % 90);
        const g2 = e.inward ? (1 - k) : k;
        const px = e.x + Math.cos(a) * sp * g2, py = e.y - 96 + Math.sin(a) * sp * 1.6 * g2;
        ctx.fillStyle = 'rgba(' + e.col + ',' + ((1 - k) * .9).toFixed(2) + ')';
        const sz = 3 + (i % 4);
        ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
      }
    }
    ctx.restore();
  }
}

// Recursion Portal: the floor opens under them and hands them back out above and behind Kenji.
function recursionPortal(f, o, amp){
  const reach = amp ? 600 : 440;
  if (Math.abs(o.x - f.x) > reach || o.state === 'ko'){
    floatText(f, 'No target', 'bad');
    return;
  }
  const back = clamp(f.x - f.facing * 120, WALL_L + 30, WALL_R - 30);
  addFx('portal', { x:o.x, y:GROUND - 6, rx:96, ry:30, col:'178,124,255', life:.46, under:true });
  sfx.portal();
  o.buffer = null; endJuggle(o); o.vx = 0;
  scheduleSim(.16, () => {
    if (game.phase !== 'fight') return;
    addFx('pixels', { x:o.x, y:o.y, col:'198,160,255', life:.3, inward:true });
    o.vanish = .26;                                    // swallowed: gone for a moment
    addFx('portal', { x:back, y:GROUND - 250, rx:100, ry:32, col:'178,124,255', life:.5 });
  });
  scheduleSim(.42, () => {
    if (game.phase !== 'fight') return;
    o.vanish = 0; o.x = back; o.y = GROUND - 240; o.vy = 60;
    setState(o, 'airhit'); o.bounced = true;           // they come down into the usual landing
    o.juggle = 0;
    addFx('pixels', { x:back, y:GROUND - 150, col:'198,160,255', life:.3 });
    dealDamage(f, o, amp ? 11 : 6, { x:back, y:GROUND - 180, heavy:amp });
    if (amp) game.shake = Math.max(game.shake, 14);
  });
}
// Goto Strike: he comes apart into pixels and puts himself back together behind them.
function gotoStrike(f, o, amp){
  addFx('pixels', { x:f.x, y:f.y, col:'255,196,112', life:.28, inward:true });
  f.vanish = .3; f.vx = 0; sfx.warp();
  scheduleSim(.26, () => {
    if (game.phase !== 'fight'){ f.vanish = 0; return; }
    const behind = clamp(o.x - o.facing * 104, WALL_L + 24, WALL_R - 24);
    f.vanish = 0; f.x = behind; f.y = GROUND; f.vy = 0;
    f.facing = Math.sign(o.x - f.x) || f.facing;
    addFx('pixels', { x:f.x, y:f.y, col:'255,224,150', life:.3 });
    sfx.warp();
    if (o.state === 'ko' || o.invuln > 0) return;
    o.facing = -f.facing;
    dealDamage(f, o, amp ? 14 : 9, { hitstun:amp ? 0 : .5, knockdown:amp, heavy:true,
      x:(f.x + o.x) / 2, y:o.y - 150 });
    game.shake = Math.max(game.shake, amp ? 16 : 10);
  });
}

// ---------------------------------------------------------------- camera
// Every arena draw goes through this: a zoom, a point to sit on, and a shake. It rests at
// zoom 1 on the middle of the stage for the whole fight and only moves when a cinematic takes
// it over, so an ordinary frame pays for one identity transform and nothing else.
const cam = { x:VW / 2, y:VH / 2, z:1, tx:VW / 2, ty:VH / 2, tz:1, ease:6, spec:null };
function camAim(c){
  const f = c.on === 'att' ? cine.att : c.on === 'def' ? cine.def : null;
  cam.tz = reduceMotion ? 1 + ((c.zoom || 1) - 1) * .5 : (c.zoom || 1);   // gentler when asked
  cam.ease = c.ease || 6;
  // How far up a fighter the camera looks. A fighter is about 205 tall and the gap between
  // the letterbox bars is 460, so past about 2.2x a whole one no longer fits and something
  // has to go. Looking further up the body as the zoom climbs crops the legs and keeps the
  // head, which is the way round a close-up is supposed to crop.
  const look = clamp(102 + 60 * (cam.tz - 1), 92, 150);
  if (c.on === 'mid' && cine.att && cine.def){
    cam.tx = (cine.att.x + cine.def.x) / 2 + (c.dx || 0) * cine.att.facing;
    cam.ty = (cine.att.y + cine.def.y) / 2 - look + (c.dy || 0);
  } else if (f){
    cam.tx = f.x + (c.dx || 0) * f.facing;
    cam.ty = f.y - look + (c.dy || 0);
  }
}
function camTo(c){
  cam.spec = c || null;
  if (c){ camAim(c); if (c.snap){ cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; } }
}
function camHome(){ cam.spec = null; cam.tx = VW / 2; cam.ty = VH / 2; cam.tz = 1; cam.ease = 5; }
function camStep(rdt){
  if (cam.spec) camAim(cam.spec);                 // targets track the fighters as a beat plays
  const k = Math.min(1, cam.ease * rdt);
  cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k; cam.z += (cam.tz - cam.z) * k;
  // settle exactly: a camera resting at 1.0003 would put the pixel art off whole pixels
  if (Math.abs(cam.z - cam.tz) < .0015) cam.z = cam.tz;
  if (Math.abs(cam.x - cam.tx) < .06) cam.x = cam.tx;
  if (Math.abs(cam.y - cam.ty) < .06) cam.y = cam.ty;
}
function camApply(shake){
  if (shake > 0) ctx.translate(rand(-shake, shake), rand(-shake, shake) * .6);
  if (cam.z !== 1 || cam.x !== VW / 2 || cam.y !== VH / 2){
    ctx.translate(VW / 2, VH / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
  }
}

// ---------------------------------------------------------------- Fatal Blow cinematic
// The sequence is data. A beat says how long it runs, which strip each fighter shows, where
// the two of them end up, where the camera goes and how fast time runs while it plays, so a
// fighter gets their own Fatal Blow by writing a different list - no new code.
//
//   d       length of the beat in beat-time; real time is d / slow
//   att,def the strip each fighter shows, by name in their sheet. A looping strip cycles at
//           its own fps; any other strip is stretched to fit the beat, so a real 20-frame
//           FatalBlow strip drops straight in where a 6-frame placeholder is now.
//   gap     how far apart the two end up, attUp/defUp how high off the floor, ease the curve
//   cam     { zoom, on:'att'|'def'|'mid', dx, dy, ease, snap } - snap cuts instead of moving
//   hit     the share of the question's damage this beat lands (1 = whatever is left)
//   panel   a full-screen impact panel, 'red' or 'gold'
//   slow    time scale for the beat; shake, flash and sfx fire as it starts
const FATAL_SEQ = {
  // Serpent.py: closes fast, cuts three times on the way past, then takes them up and down.
  serpent: [
    { d:.55, att:'fatalDash', def:'fatalTake', gap:112, ease:'in', sfx:'whoosh',
      cam:{ zoom:1.95, on:'mid', dy:-14, ease:4.5 } },
    { d:.26, att:'fatalHit1', def:'fatalTake', hit:.14, panel:'red', shake:14, sfx:'hit', heavy:true, flash:.4,
      cam:{ zoom:2.7, on:'def', dx:-14, dy:-26, ease:18, snap:true } },
    { d:.24, att:'fatalHit2', def:'fatalTake', hit:.14, panel:'gold', shake:15, sfx:'hit', heavy:true, gap:96,
      cam:{ zoom:2.45, on:'def', dx:16, dy:-14, ease:18, snap:true } },
    { d:.30, att:'fatalHit3', def:'fatalTake', hit:.16, panel:'red', shake:18, sfx:'hit', heavy:true, gap:104, slow:.85,
      cam:{ zoom:2.85, on:'mid', dy:-30, ease:16, snap:true } },
    { d:.60, att:'fatalRise', def:'airhit', hit:.16, defUp:250, attUp:150, gap:120, ease:'out',
      shake:10, sfx:'launch', slow:.8, cam:{ zoom:1.62, on:'def', dy:-26, ease:8 } },
    { d:.85, att:'fatalSlam', def:'tumble', defUp:0, attUp:0, gap:118, ease:'in', slow:.35, sfx:'whoosh',
      cam:{ zoom:1.8, on:'def', dy:-18, ease:8.5 } },
    { d:.70, att:'fatalSlam', def:'knockdown', hit:1, panel:'gold', flash:1, shake:30, sfx:'boom',
      heavy:true, slow:.55, cam:{ zoom:1.5, on:'mid', dy:14, ease:9, snap:true } },
  ],
  // Undefined.js: slower, heavier, and holds on each hit a beat longer.
  undefined_js: [
    { d:.62, att:'fatalDash', def:'fatalTake', gap:124, ease:'in', sfx:'whoosh',
      cam:{ zoom:1.8, on:'mid', dy:-10, ease:4 } },
    { d:.30, att:'fatalHit1', def:'fatalTake', hit:.16, panel:'gold', shake:16, sfx:'hit', heavy:true, flash:.45,
      cam:{ zoom:2.6, on:'def', dx:-18, dy:-20, ease:18, snap:true } },
    { d:.26, att:'fatalHit2', def:'fatalTake', hit:.14, panel:'red', shake:14, sfx:'hit', heavy:true, gap:92,
      cam:{ zoom:2.9, on:'def', dx:10, dy:-34, ease:20, snap:true } },
    { d:.34, att:'fatalHit3', def:'fatalTake', hit:.18, panel:'gold', shake:20, sfx:'hit', heavy:true, gap:110, slow:.8,
      cam:{ zoom:2.3, on:'mid', dy:-22, ease:14, snap:true } },
    { d:.66, att:'fatalRise', def:'airhit', hit:.14, defUp:288, attUp:170, gap:132, ease:'out',
      shake:12, sfx:'launch', slow:.75, cam:{ zoom:1.52, on:'def', dy:-30, ease:7.5 } },
    { d:.95, att:'fatalSlam', def:'tumble', defUp:0, attUp:0, gap:126, ease:'in', slow:.3, sfx:'whoosh',
      cam:{ zoom:1.86, on:'def', dy:-20, ease:8 } },
    { d:.75, att:'fatalSlam', def:'knockdown', hit:1, panel:'red', flash:1, shake:34, sfx:'boom',
      heavy:true, slow:.5, cam:{ zoom:1.42, on:'mid', dy:18, ease:8, snap:true } },
  ],
};
const EASE = {
  linear:k => k,
  out:k => 1 - Math.pow(1 - k, 3),
  in:k => k * k * k,
  inout:k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
};
const easeK = (name, k) => (EASE[name] || EASE.out)(k);

// Everything the cinematic is doing right now. `phase` walks intro -> question -> beats ->
// outro; the arena stays frozen for all of it and the director moves the fighters itself.
const cine = {
  on:false, phase:'', t:0, hold:0, slow:1, shake:0,
  black:0, back:0, bars:0, titleT:-1, flash:0, panel:0, panelKind:'red', panelRot:0,
  att:null, def:null, dmg:0, left:0, beats:null, bi:0, bt:0, from:null,
};
function cineReset(){
  cine.on = false; cine.phase = ''; cine.beats = null; cine.bi = 0; cine.bt = 0; cine.t = 0;
  cine.black = cine.back = cine.bars = cine.panel = cine.flash = cine.shake = cine.hold = 0;
  cine.titleT = -1; cine.slow = 1; cine.att = cine.def = null;
  F.forEach(f => { f.cineAnim = null; f.cineFrame = 0; });
  camHome(); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz;
}
function holdPose(f, key, fps){
  const a = f.sheet.anims[key]; if (!a) return;
  f.cineAnim = key; f.cineFrame = Math.floor(cine.t * (fps || 6)) % a.frames;
}
// the opening: hit-freeze and a white flash, the arena goes out, the backdrop comes up behind
// them, the bars close in and the title lands
function cineBegin(att, def){
  cineReset();
  cine.on = true; cine.phase = 'intro'; cine.att = att; cine.def = def;
  cine.flash = 1; cine.hold = .34;                  // the hit-freeze, before anything moves
  game.freeze = true; game.hitstop = 0; game.shake = 20;
  // the arena is about to be theirs alone: nothing of the fight before it comes along
  clearEffects();
  if (def.frozen > 0){ thaw(def); sfx.clink(); }
  att.poseSpin = def.poseSpin = 0;
  att.frozen = 0; att.vanish = 0; def.vanish = 0;
  att.vx = def.vx = 0; att.vy = def.vy = 0; att.y = def.y = GROUND;
  // the stage is about to go black, so this is a free moment to put the pair somewhere clean
  const sgn = att.facing;
  att.x = VW / 2 - sgn * 150; def.x = VW / 2 + sgn * 150;
  att.cineAnim = 'fatalDash'; att.cineFrame = 0;
  def.cineAnim = 'fatalTake'; def.cineFrame = 0;
  camTo({ zoom:1.5, on:'mid', dy:-6, ease:3.4 });
  sfx.gong(); sfx.hit(true); speak('Fatal blow');
}
function cineIntro(dt){
  cine.t += dt;
  cine.black = clamp((cine.t - .05) / .45, 0, 1) * .97;
  cine.back = clamp((cine.t - .22) / .55, 0, 1);
  cine.bars = clamp((cine.t - .34) / .3, 0, 1);
  if (cine.t >= .62 && cine.titleT < 0) cine.titleT = 0;
  if (cine.titleT >= 0) cine.titleT += dt;
  holdPose(cine.def, 'fatalTake', 5);
  if (cine.t >= 2.05){ cine.phase = 'question'; cine.t = 0; askFatal(cine.att, cine.def); }
}
// the beats, run one at a time
function beatEnter(){
  const b = cine.beats[cine.bi], att = cine.att, def = cine.def;
  cine.from = { ax:att.x, ay:att.y, dx:def.x, dy:def.y };
  cine.slow = b.slow || 1;
  if (b.shake) cine.shake = b.shake;
  if (b.flash) cine.flash = b.flash;
  if (b.panel){ cine.panel = 1; cine.panelKind = b.panel; cine.panelRot = rand(-.55, .55); }
  if (b.sfx && sfx[b.sfx]) sfx[b.sfx](b.heavy);
  if (b.hit) cineHit(b);
  camTo(b.cam);
}
function cineHit(b){
  const att = cine.att, def = cine.def;
  const n = Math.min(cine.left, b.hit >= 1 ? cine.left : cine.dmg * b.hit);
  cine.left -= n;
  def.hp = Math.max(0, def.hp - n); def.flash = .18;     // the KO waits for the end of the take
  const x = (att.x + def.x) / 2, y = def.y - 150;
  sparks(x, y, { n:b.heavy ? 34 : 22, speed:b.heavy ? 470 : 340 });
  blood(x, y, att.facing, { n:b.heavy ? 22 : 12 });
}
function beatApply(b, k){
  const att = cine.att, def = cine.def, f = cine.from, e = easeK(b.ease, k), sgn = att.facing;
  if (b.defUp !== undefined) def.y = GROUND - ((GROUND - f.dy) + (b.defUp - (GROUND - f.dy)) * e);
  if (b.attUp !== undefined) att.y = GROUND - ((GROUND - f.ay) + (b.attUp - (GROUND - f.ay)) * e);
  if (b.gap !== undefined){
    const g0 = Math.abs(f.dx - f.ax);
    att.x = def.x - sgn * (g0 + (b.gap - g0) * e);
  }
  att.cineAnim = b.att || null; att.cineFrame = stripFrame(att, b.att, k);
  def.cineAnim = b.def || null; def.cineFrame = stripFrame(def, b.def, k);
}
// a looping strip runs at its own fps; anything else is stretched across the beat
function stripFrame(f, key, k){
  const a = key && f.sheet.anims[key];
  if (!a) return 0;
  if (a.loop) return Math.floor(cine.bt * (a.fps || 12)) % a.frames;
  return clamp(Math.floor(k * a.frames), 0, a.frames - 1);
}
function cinePlay(att, def, dmg){
  game.freeze = true;                                // the question let go of it on its way out
  cine.phase = 'beats'; cine.dmg = dmg; cine.left = dmg;
  cine.beats = FATAL_SEQ[att.sheetKey] || FATAL_SEQ.serpent;
  cine.bi = 0; cine.bt = 0; cine.t = 0;
  const sgn = att.facing;
  att.y = def.y = GROUND; att.vy = def.vy = 0;
  def.x = VW / 2 + sgn * 120; att.x = def.x - sgn * 300;
  beatEnter();
}
function cineBeats(dt, rdt){
  const b = cine.beats[cine.bi];
  if (!b){ cineOutro(); return; }
  cine.bt += dt; cine.t += dt;
  beatApply(b, clamp(cine.bt / b.d, 0, 1));
  cine.shake = Math.max(0, cine.shake - rdt * 55);
  if (cine.bt >= b.d){
    cine.bi++; cine.bt = 0;
    if (cine.beats[cine.bi]) beatEnter(); else cineOutro();
  }
}
// and out: the arena comes back, with them on the floor
function cineOutro(){
  const att = cine.att, def = cine.def;
  cine.phase = 'outro'; cine.t = 0; cine.slow = 1; cine.titleT = -1;
  camHome();
  att.cineAnim = def.cineAnim = null;
  att.y = GROUND; att.vy = 0; def.y = GROUND; def.vy = 0; def.vx = 0;
  setState(att, 'idle'); setState(def, 'down');
  def.downT = 1.3; def.hitstun = 0; def.juggle = 0; def.bounced = false; att.combo = 0;
  floatText(def, '-' + Math.round(cine.dmg), 'bad');
}
function cineEnd(){
  const att = cine.att, def = cine.def;
  cineReset();
  game.freeze = false;
  if (def.hp <= 0 && game.phase === 'fight') roundOver(att, def);
}
// Driven from the frame loop on real time, not from the sim: the fight stays frozen for the
// whole cinematic and the director is the only thing moving the fighters.
function cineTick(rdt){
  if (!cine.on){ camStep(rdt); return; }
  if (cine.flash > 0) cine.flash = Math.max(0, cine.flash - rdt * 3.4);
  if (cine.panel > 0) cine.panel = Math.max(0, cine.panel - rdt * 5.5);
  if (cine.hold > 0){ cine.hold -= rdt; camStep(rdt); return; }     // the hit-freeze
  const dt = rdt * cine.slow;
  if (cine.phase === 'intro') cineIntro(dt);
  else if (cine.phase === 'question'){
    cine.t += dt;
    if (cine.titleT >= 0){ cine.titleT += dt; }
    holdPose(cine.att, 'idle', 5); holdPose(cine.def, 'fatalTake', 4);
  }
  else if (cine.phase === 'beats') cineBeats(dt, rdt);
  else if (cine.phase === 'outro'){
    cine.t += dt;
    const k = clamp(cine.t / .55, 0, 1);
    cine.black = .97 * (1 - k); cine.back = 1 - k; cine.bars = 1 - k;
    cine.shake = Math.max(0, cine.shake - rdt * 55);
    if (cine.t >= .6) cineEnd();
  }
  camStep(rdt);
}

// what the cinematic paints: the backdrop under the fighters, the panels, bars and title over
function drawBackdrop(t){
  if (cine.back <= 0) return;
  const att = cine.att, def = cine.def;
  const cx = att && def ? (att.x + def.x) / 2 : VW / 2, cy = GROUND - 150;
  const s = (880 + 70 * Math.sin(t * 2.2)) * (.6 + .4 * cine.back);
  ctx.save();
  ctx.globalAlpha = cine.back; ctx.globalCompositeOperation = 'lighter';
  ctx.translate(cx, cy); ctx.rotate(t * .16);
  ctx.drawImage(fatalBack, -s / 2, -s / 2, s, s);
  ctx.restore();
}
function drawPanel(){
  if (cine.panel <= 0) return;
  const a = cine.panel, k = 1 - a;
  ctx.save();
  ctx.globalAlpha = a * (reduceMotion ? .45 : 1);
  ctx.fillStyle = cine.panelKind === 'gold' ? 'rgba(255,198,104,.5)' : 'rgba(214,30,26,.5)';
  ctx.fillRect(0, 0, VW, VH);
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(VW / 2, VH / 2); ctx.rotate(cine.panelRot);
  const s = VW * (1.15 + k * .95);
  ctx.drawImage(speedTex, -s / 2, -s / 2, s, s);
  ctx.rotate(.42);                                  // one hard slash across the frame
  ctx.fillStyle = 'rgba(255,248,230,' + (a * .5).toFixed(3) + ')';
  const h = 18 + 105 * k;
  ctx.fillRect(-VW, -h / 2, VW * 2, h);
  ctx.restore();
}
function drawBars(){
  if (cine.bars <= 0) return;
  const h = Math.round(58 * cine.bars);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, VW, h); ctx.fillRect(0, VH - h, VW, h);
  ctx.fillStyle = 'rgba(201,162,74,' + (.45 * cine.bars).toFixed(3) + ')';
  ctx.fillRect(0, h, VW, 2); ctx.fillRect(0, VH - h - 2, VW, 2);
}
function drawTitle(){
  const p = cine.titleT;
  if (p < 0) return;
  let sc, al = 1;
  if (p < .14){ sc = 4.6 - 3.72 * (1 - Math.pow(1 - p / .14, 3)); al = Math.min(1, p / .05); }
  else if (p < .30) sc = .88 + .12 * ((p - .14) / .16);     // the overshoot settling back
  else sc = 1;
  if (p > 1.35) al = clamp(1 - (p - 1.35) / .4, 0, 1);
  if (al <= 0) return;
  ctx.save();
  ctx.globalAlpha = al;
  ctx.translate(VW / 2, VH / 2 - 6); ctx.scale(sc, sc);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 84px "Grenze Gotisch", Georgia, serif';
  try { ctx.letterSpacing = '10px'; } catch (e){}
  ctx.lineJoin = 'round'; ctx.lineWidth = 11; ctx.strokeStyle = '#2a0608';
  ctx.strokeText('FATAL BLOW', 0, 0);
  const grd = ctx.createLinearGradient(0, -44, 0, 44);
  grd.addColorStop(0, '#fff4d2'); grd.addColorStop(.5, '#f0bf52'); grd.addColorStop(1, '#a8651a');
  ctx.shadowColor = 'rgba(255,96,30,.9)'; ctx.shadowBlur = 26;
  ctx.fillStyle = grd; ctx.fillText('FATAL BLOW', 0, 0);
  try { ctx.letterSpacing = '0px'; } catch (e){}
  ctx.restore();
  const k = clamp((p - .12) / .42, 0, 1);            // the shockwave the landing throws out
  if (k > 0 && k < 1 && !reduceMotion){
    ctx.save();
    ctx.globalAlpha = (1 - k) * .65 * al; ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 1 + 8 * (1 - k);
    ctx.beginPath(); ctx.ellipse(VW / 2, VH / 2 - 6, 60 + k * 640, 24 + k * 240, 0, 0, 6.283); ctx.stroke();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- fatal blow
// Landing one no longer deals damage of its own. It takes the arena over: the cinematic
// stages itself, the question decides the number, and the director plays the take.
function triggerFatal(att, def){
  att.lowUsed.fatal = true; att.roundLow = true;
  endJuggle(def); setState(def, 'hit'); def.hitstun = 3;
  screenFlash();
  cineBegin(att, def);
}
// step two of the cinematic: the same race for the damage that has always been there
function askFatal(att, def){
  if (game.phase !== 'fight'){ cineEnd(); return; }
  startQuestion({
    kind:'fatal', diff:'medium', dur:7, participants:[att, def], global:true, title:'Fatal Blow',
    stakes:'First right answer decides the damage. ' + att.short + ': 30. ' + def.short + ': cut it to 15.',
    roles:{ [att.id]:'attacking', [def.id]:'defending' },
    result:w => w === att ? att.short + ' lands the full Fatal Blow!' : w === def ? def.short + ' cuts the damage in half!' : 'Nobody got it. Half damage.',
    onDone:w => {
      if (game.phase !== 'fight'){ cineEnd(); return; }
      cinePlay(att, def, w === att ? 30 : 15);
    },
  });
}

// double or nothing
function startDon(f){
  f.lowUsed.don = true; f.roundLow = true; setState(f, 'answer'); game.freeze = true;
  showBanner('Double or nothing', 'don', 900);
  later(700, () => {
    if (game.phase !== 'fight'){ game.freeze = false; return; }
    startQuestion({
      kind:'don', diff:'hard', dur:10, participants:[f], global:true, title:'Double or nothing',
      stakes:'One hard question. Right answer heals 25. Wrong answer costs 10.',
      result:w => w ? f.short + ' heals 25!' : f.short + ' loses 10.',
      onDone:w => {
        if (game.phase !== 'fight') return;
        setState(f, restState(f));
        if (w) heal(f, 25);
        else { floatText(f, '-10', 'bad'); dealDamage(null, f, 10, { hitstun:.3, x:f.x, y:f.y - 150 }); }
      },
    });
  });
}

// mystery box
function grabBox(f){
  box.state = 'taken'; setState(f, 'answer'); f.vx = 0; f.buffer = null;
  const power = pick(['double', 'heal', 'speed']);
  const label = { double:'double damage for 10 seconds', heal:'+15 health', speed:'a speed boost for 10 seconds' }[power];
  startQuestion({
    kind:'box', diff:'easy', dur:6, participants:[f], global:false, side:f.x <= other(f).x ? 'left' : 'right',
    title:'Mystery box', stakes:"You're frozen until you answer. Right: a power-up. Wrong: it explodes.",
    result:w => w ? f.short + ' gets ' + label + '!' : 'The box explodes!',
    onDone:w => {
      removeBox();
      if (f.state === 'answer') setState(f, restState(f));
      if (game.phase !== 'fight') return;
      if (w){
        if (power === 'heal') heal(f, 15);
        else { f.power = { type:power, t:10 }; floatText(f, power === 'double' ? 'Double damage' : 'Speed boost', 'gold'); sfx.heal(); }
      } else {
        sparks(f.x, f.y - 120, { col:'255,154,58', n:40, speed:440, life:.6 }); sfx.boom();
        floatText(f, '-5', 'bad'); dealDamage(null, f, 5, { hitstun:.35, heavy:true, x:f.x, y:f.y - 120 });
      }
    },
  });
}

// ---------------------------------------------------------------- fighter update
function updateFighter(f, o, dt, now){
  f.stateT += dt; f.animT += dt;
  if (f.invuln > 0) f.invuln -= dt;
  if (f.vanish > 0) f.vanish = Math.max(0, f.vanish - dt);
  if (f.throwCD > 0) f.throwCD -= dt;
  for (let i = 0; i < f.spCD.length; i++) if (f.spCD[i] > 0) f.spCD[i] -= dt;
  if (f.fatalCD > 0) f.fatalCD -= dt;
  if (f.inputLock > 0) f.inputLock -= dt;
  if (f.flash > 0) f.flash -= dt;
  if (f.comboShowT > 0) f.comboShowT -= dt;
  if (f.power){ f.power.t -= dt; if (f.power.t <= 0) f.power = null; }

  switch (f.state){
    case 'hit': case 'stagger':
      f.hitstun -= dt; if (f.hitstun <= 0){ setState(f, restState(f)); o.combo = 0; } break;
    case 'blockstun': f.hitstun -= dt; if (f.hitstun <= 0) setState(f, 'block'); break;
    case 'airhit': if (!airborne(f) && f.vy >= 0) landJuggle(f); break;   // safety net: gravity normally gets here first
    case 'frozen':
      f.frozen -= dt;
      if (f.frozen <= 0){ thaw(f); sparks(f.x, f.y - 110, { col:'198,240,255', n:LOW ? 10 : 26, speed:340, life:.5, add:true }); }
      break;
    case 'grab': {
      if (!thr.on && f.stateT >= THROW.startup && f.stateT < THROW.startup + THROW.active && tryGrab(f, o)) break;
      if (f.stateT >= THROW.startup + THROW.active + THROW.recovery) setState(f, restState(f));
      break;
    }
    case 'throw': case 'grabbed': case 'thrown': break;     // updateThrow owns these
    case 'cast': {
      const sp = f.special;
      if (!sp){ setState(f, restState(f)); break; }
      if (!f.specFired && f.stateT >= sp.startup){ f.specFired = true; sp.fire(f, other(f), f.specAmp); }
      if (f.stateT >= sp.startup + sp.recovery){ f.special = null; setState(f, restState(f)); }
      break;
    }
    case 'down': if (f.stateT > f.downT){ setState(f, 'getup'); f.invuln = .5; } break;
    case 'getup': if (f.stateT > .42) setState(f, 'idle'); break;
    case 'attack': {
      const a = ATT[f.attack];
      if (!f.scripted && f.stateT < a.startup && Math.abs(o.x - f.x) > a.range * .72 && !airborne(f))
        f.x += f.facing * (a.step / a.startup) * dt;
      if (!f.attackHit && !f.scripted && f.stateT >= a.startup && f.stateT < a.startup + a.active) tryHit(f, o, a);
      if (f.state === 'attack' && f.stateT >= a.startup + a.active + a.recovery){
        if (f.attack === 'fatal' && !f.scripted && !f.attackHit){ f.fatalCD = 4; if (!f.cpu) floatText(f, 'Missed, get closer', 'bad'); }
        if (f.attack === 'amp' && !f.scripted && !f.attackHit && !f.cpu) floatText(f, 'Launcher whiffed', 'bad');
        f.scripted = false; setState(f, restState(f));
      }
      break;
    }
  }

  // gravity runs under every state except the scripted ones that pin fighters to the floor,
  // and ice, which holds them exactly where it caught them
  const pinned = f.state === 'frozen' || f.state === 'grabbed' || f.state === 'thrown';
  if ((airborne(f) || f.vy < 0) && !pinned){
    f.vy += GRAVITY * dt; f.y += f.vy * dt;
    if (f.y >= GROUND){
      f.y = GROUND; f.vy = 0;
      if (f.state === 'airhit') landJuggle(f);          // bounce once, then lie down
      else {
        if (f.state === 'air') setState(f, 'idle');
        sparks(f.x, GROUND - 4, { col:'190,160,130', n:LOW ? 3 : 6, speed:110, life:.25, gravity:400 });
        sfx.land();
      }
    }
  }

  const grounded = !airborne(f);
  const free = s => s === 'idle' || s === 'walk' || s === 'block' || s === 'air';
  if (free(f.state) && game.phase === 'fight' && f.inputLock <= 0 && !game.freeze){
    const holdMs = f.buffer && (f.buffer.act === 'fatal' || f.buffer.act === 'don') ? 1500 : 230;
    const b = f.buffer && (now - f.buffer.at) < holdMs ? f.buffer.act : null;
    if (b){
      f.buffer = null;
      if (b === 'fatal'){ if (canFatal(f)) startAttack(f, 'fatal'); }
      else if (b === 'don'){ if (canDon(f)) startDon(f); }
      else if (b === 'throw'){ if (canThrow(f)) startThrow(f); }
      else if (b === 'sp0' || b === 'sp1'){
        const i = b === 'sp1' ? 1 : 0;
        if (specReady(f, i)) startSpecial(f, i);
      }
      else if (b === 'amp'){
        if (canAmp(f)){
          f.meter -= AMP_COST; startAttack(f, 'amp');
          sparks(f.x, f.y - 100, { col:'255,196,112', n:22, speed:260, gravity:-100, up:60, life:.5 });
          floatText(f, 'Amplify', 'gold'); sfx.amp();
        }
      }
      else if (ATT[b]) startAttack(f, b);
    }
    if (free(f.state)){
      const h = f.held;
      if (f.jumpBuf && now - f.jumpBuf < 180 && grounded && f.state !== 'block'){
        f.jumpBuf = 0; f.vy = JUMP_V; setState(f, 'air'); sfx.jump();
      } else if (h.block && grounded) setState(f, 'block', true);
      else {
        const dir = (h.right ? 1 : 0) - (h.left ? 1 : 0);
        const boost = f.power && f.power.type === 'speed' ? 1.5 : 1;
        if (!grounded){
          if (dir) f.x += dir * AIR_MOVE * boost * dt;
          setState(f, 'air', true);
        } else if (dir){
          const fwd = dir === f.facing;
          f.x += dir * (fwd ? WALK_F : WALK_B) * boost * dt;
          setState(f, 'walk', true);
        } else setState(f, 'idle', true);
      }
    }
  }
  if (f.buffer && now - f.buffer.at > ((f.buffer.act === 'fatal' || f.buffer.act === 'don') ? 1600 : 400)) f.buffer = null;
  if (f.vx && !pinned){               // ice, and a pair of hands, hold them still sideways too
    f.x += f.vx * dt; f.vx *= Math.exp(-5 * dt); if (Math.abs(f.vx) < 4) f.vx = 0;
  }
  f.x = clamp(f.x, WALL_L, WALL_R);
}

// ---------------------------------------------------------------- CPU
const ai = { t:0, move:0, blockT:0, reacted:false, chained:false, jump:false };
function cpuThink(c, o, dt, now){
  c.held = { left:false, right:false, block:false };
  if (game.freeze || game.phase !== 'fight' || c.state === 'answer') return;
  const dx = o.x - c.x, dist = Math.abs(dx), toward = Math.sign(dx) || 1;
  if (ai.jump){ c.jumpBuf = now; ai.jump = false; }
  if (ai.blockT > 0){ ai.blockT -= dt; c.held.block = true; return; }
  // something is in the air with its name on it
  for (const s of SHOTS){
    if (!s.live || s.owner === c || s.phase !== 'out') continue;
    if (Math.sign(s.x - c.x) === -s.dir || Math.abs(s.x - c.x) > 300) continue;
    if (Math.random() < .5 && (c.state === 'idle' || c.state === 'walk')){ ai.blockT = .5; c.held.block = true; return; }
  }
  if (o.state === 'attack' && ATT[o.attack] && !o.scripted && o.stateT < ATT[o.attack].startup && dist < ATT[o.attack].range + 20 && !ai.reacted){
    ai.reacted = true;
    if (Math.random() < .38 && (c.state === 'idle' || c.state === 'walk')){ ai.blockT = .45; c.held.block = true; return; }
  }
  if (o.state !== 'attack') ai.reacted = false;
  if (c.state === 'attack' && c.attackHit && o.state === 'hit' && !ai.chained){
    ai.chained = true;
    if (Math.random() < .72) c.buffer = { act:pick(['fp', 'bp', 'fk', 'fp']), at:now + 60 };
  }
  if (c.state !== 'attack') ai.chained = false;
  if (c.state === 'cast' && !c.specAmp && !c.specFired && c.meter >= AMP_COST && Math.random() < .07) ampSpecial(c);
  ai.t -= dt;
  if (ai.t <= 0){
    ai.t = .1 + Math.random() * .18;
    if (c.hp <= 30 && !c.roundLow){
      if (!c.lowUsed.fatal && c.fatalCD <= 0 && dist < 230 && Math.random() < .3) c.buffer = { act:'fatal', at:now };
      else if (!c.lowUsed.don && Math.random() < .04) c.buffer = { act:'don', at:now };
    }
    // a guard is not a wall: throw it open
    if (!c.buffer && canThrow(c) && dist < THROW.range - 8){
      const guarding = o.state === 'block' || o.state === 'blockstun';
      if (Math.random() < (guarding ? .45 : .12)) c.buffer = { act:'throw', at:now };
    }
    // specials: the projectile at range, the teleport at mid range
    if (!c.buffer && !airborne(c) && o.state !== 'airhit'){
      if (dist > 250 && specReady(c, 0) && Math.random() < .3) c.buffer = { act:'sp0', at:now };
      else if (dist > 120 && dist < 300 && specReady(c, 1) && Math.random() < .12) c.buffer = { act:'sp1', at:now };
    }
    if (c.meter >= AMP_COST && !c.buffer && o.state !== 'airhit' && !airborne(o) && dist > 90 && dist < 200 && Math.random() < .2)
      c.buffer = { act:'amp', at:now };
    const dy = o.y - c.y;
    if (o.state === 'airhit'){                                      // keep the juggle going
      ai.move = dist > 95 ? toward : 0;
      if (!c.buffer && dist < AIR_REACH - 20 && Math.random() < .55) c.buffer = { act:pick(['fp', 'fk', 'bp']), at:now };
      else if (dy < -170 && Math.random() < .35) ai.jump = true;
    }
    else if (box.state === 'ground' && Math.abs(box.x - c.x) < Math.abs(box.x - o.x) + 40 && Math.random() < .8) ai.move = Math.sign(box.x - c.x);
    else if (dist > 205) ai.move = Math.random() < .85 ? toward : 0;
    else if (dist < 130 && Math.random() < .3) ai.move = -toward;
    else {
      ai.move = 0;
      if (dy < -90 && Math.random() < .25) ai.jump = true;          // chase them up
      else if (!c.buffer && Math.abs(dy) < 110 && Math.random() < .5){
        const r = Math.random();
        c.buffer = { act:r < .35 ? 'fp' : r < .6 ? 'bp' : r < .85 ? 'fk' : 'bk', at:now };
      }
    }
    if (!airborne(c) && o.state !== 'airhit' && Math.random() < .035) ai.jump = true;
  }
  if (ai.move < 0) c.held.left = true; else if (ai.move > 0) c.held.right = true;
}

// ---------------------------------------------------------------- input
const keys = new Set(), pressedKeys = new Set();
const ACTS = ['fp', 'bp', 'fk', 'bk', 'amp', 'sp', 'throw', 'fatal', 'don'];
const ANSWER_IDX = { fp:0, bp:1, fk:2, bk:3 };
const KEYMAP = [
  { left:['KeyA'], right:['KeyD'], block:['KeyS'], jump:['KeyW'], fp:['KeyU'], bp:['KeyI'], fk:['KeyJ'], bk:['KeyK'], amp:['KeyO'], sp:['KeyH'], throw:['KeyG'], fatal:['KeyP'], don:['KeyL'] },
  { left:['ArrowLeft'], right:['ArrowRight'], block:['ArrowDown'], jump:['ArrowUp'], fp:['Numpad7'], bp:['Numpad8'], fk:['Numpad4'], bk:['Numpad5'], amp:['Numpad3'], sp:['Numpad1'], throw:['Numpad2'], fatal:['Numpad9'], don:['Numpad6'] },
];
const padPrev = [{}, {}], padStates = [null, null];
function pollPads(){
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const list = []; for (const p of pads) if (p && p.connected) list.push(p);
  for (let i = 0; i < 2; i++){
    const p = list[i]; if (!p){ padStates[i] = null; continue; }
    const b = j => !!(p.buttons[j] && p.buttons[j].pressed);
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    const st = { left:ax < -.45 || b(14), right:ax > .45 || b(15), block:b(6), jump:ay < -.5 || b(12), pressed:[] };
    const map = { fp:2, bp:3, fk:0, bk:1, amp:7, sp:11, throw:4, fatal:10, don:5, start:9 };
    // L1 throw, L2 block, R2 amplify; the two stick clicks are the two committed moves,
    // L3 Fatal Blow and R3 special
    for (const act in map){ const d = b(map[act]); if (d && !padPrev[i][act]) st.pressed.push(act); padPrev[i][act] = d; }
    padStates[i] = st;
  }
}
function readHuman(id){
  const maps = (game.mode === 'cpu' && id === 0) ? KEYMAP : [KEYMAP[id]];
  const r = { left:false, right:false, block:false, jump:false, pressed:[] };
  for (const m of maps){
    if (m.left.some(c => keys.has(c))) r.left = true;
    if (m.right.some(c => keys.has(c))) r.right = true;
    if (m.block.some(c => keys.has(c))) r.block = true;
    if (m.jump.some(c => keys.has(c))) r.jump = true;
    for (const a of ACTS) if (m[a].some(c => pressedKeys.has(c))) r.pressed.push(a);
  }
  const ps = padStates[id];
  if (ps){
    r.left = r.left || ps.left; r.right = r.right || ps.right; r.block = r.block || ps.block; r.jump = r.jump || ps.jump;
    ps.pressed.forEach(a => { if (ACTS.includes(a)) r.pressed.push(a); });
  }
  return r;
}
// Which special, if any, a button press just completed. A motion that lands on a special still
// on cooldown falls through to the ordinary attack rather than eating the input.
const SP_BUTTON = { fp:0, bp:1 };
function specialFor(f, act, now){
  if (act === 'sp'){                                  // the dedicated button: hold down for the second
    const i = f.held.block ? 1 : 0;
    if (specReady(f, i)) return 'sp' + i;
    const sp = specialsOf(f)[i];
    if (!f.cpu && sp && f.spCD[i] > 0) toast(sp.name + ' ready in ' + Math.ceil(f.spCD[i]) + 's');
    return null;
  }
  const i = SP_BUTTON[act];
  if (i === undefined) return null;
  const sp = specialsOf(f)[i];
  if (!sp || !motionMatch(f, sp.motion, now)) return null;
  if (!specReady(f, i)){
    if (!f.cpu && f.spCD[i] > 0) toast(sp.name + ' ready in ' + Math.ceil(f.spCD[i]) + 's');
    return null;
  }
  return 'sp' + i;
}
function gatherInputs(now){
  for (const f of F){
    if (f.cpu) continue;
    const k = readHuman(f.id);
    f.held = { left:k.left, right:k.right, block:k.block };
    if (k.jump && !f.jumpHeld) f.jumpBuf = now;   // one jump per press, and it survives hitstop
    f.jumpHeld = k.jump;
    const A = Q.active;
    if (A && !A.resolved && A.participants.includes(f)){
      const ans = k.pressed.find(a => ANSWER_IDX[a] !== undefined);
      if (ans) answer(f, ANSWER_IDX[ans]);
      continue;
    }
    if (game.phase !== 'fight') continue;
    if ((game.freeze || f.inputLock > 0) && !(thr.on && thr.def === f)) continue;
    for (const a of k.pressed){
      // Amplify mid-cast upgrades the special instead of starting a launcher, the way it does
      // in the game this borrows from. It has to be read here: a casting fighter is busy, so
      // the press would never reach the buffer.
      // the tech: the only input a grabbed fighter has, and it only counts inside the window
      if (a === 'throw' && thr.on && thr.def === f){ techThrow(); continue; }
      if (a === 'amp' && f.state === 'cast'){
        if (!ampSpecial(f)) toast(f.specAmp ? 'Already amplified' : 'Amplify needs one full bar of meter');
        continue;
      }
      if (a === 'fatal' || a === 'don'){
        const why = lowMoveBlocked(f, a);
        if (why){ toast(why); continue; }
      } else if (a === 'amp'){
        const why = ampBlocked(f);
        if (why){ toast(why); continue; }
      } else if (a === 'throw'){
        const why = throwBlocked(f);
        if (why){ toast(why); continue; }
      }
      const resolved = specialFor(f, a, now);
      if (!resolved && a === 'sp') continue;           // the Special button has no attack to fall back on
      f.buffer = { act:resolved || a, at:now };
    }
  }
}
addEventListener('keydown', e => {
  if (game.phase !== 'menu' && ['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code); pressedKeys.add(e.code);
  if (e.code === 'Escape' && ['fight', 'intro', 'ko'].includes(game.phase)) togglePause();
  if (e.code === 'KeyM'){ soundOn = !soundOn; if (!soundOn && 'speechSynthesis' in window) speechSynthesis.cancel(); toast(soundOn ? 'Sound on' : 'Sound off'); }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// ---------------------------------------------------------------- touch controls
const isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints || 0) > 0;
if (isTouch) document.body.classList.add('touch');
addEventListener('touchstart', () => document.body.classList.add('touch'), { once:true, passive:true });
document.querySelectorAll('#touch .tb').forEach(btn => {
  const code = btn.dataset.code; let pid = null;
  const press = e => {
    e.preventDefault(); if (pid !== null) return;
    pid = e.pointerId; try { btn.setPointerCapture(pid); } catch (err){}
    keys.add(code); pressedKeys.add(code); btn.classList.add('down');
    audioInit();
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err){} }
  };
  const release = e => {
    if (e && pid !== null && e.pointerId !== pid) return;
    pid = null; keys.delete(code); btn.classList.remove('down');
  };
  btn.addEventListener('pointerdown', press);
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('lostpointercapture', release);
  btn.addEventListener('contextmenu', e => e.preventDefault());
});
(() => {
  const pb = $('#tbPause');
  if (pb) pb.addEventListener('pointerdown', e => { e.preventDefault(); if (['fight', 'intro', 'ko'].includes(game.phase)) togglePause(true); });
})();
const tbAmp = $('#tbAmp'), tbSpecial = $('#tbSpecial'), tbThrow = $('#tbThrow'), tbFatal = $('#tbFatal'), tbDon = $('#tbDon');
function updateTouchUI(){
  const playing = game.phase !== 'menu';
  document.body.classList.toggle('playing', playing);
  if (!playing || !document.body.classList.contains('touch')) return;
  const A = Q.active;
  document.body.classList.toggle('answering', !!(A && !A.resolved && A.participants.includes(F[0]) && !F[0].cpu));
  if (tbAmp) tbAmp.classList.toggle('ready', canAmp(F[0]));
  if (tbSpecial) tbSpecial.classList.toggle('ready', specReady(F[0], F[0].held.block ? 1 : 0));
  // while they are in a throw the button is the tech, and it should look like the urgent one
  if (tbThrow) tbThrow.classList.toggle('ready', (thr.on && thr.def === F[0]) || canThrow(F[0]));
  document.body.classList.toggle('teching', thr.on && thr.def === F[0] && thr.t <= THROW.tech);
  if (tbFatal) tbFatal.classList.toggle('ready', canFatal(F[0]));
  if (tbDon) tbDon.classList.toggle('ready', canDon(F[0]));
}

// ---------------------------------------------------------------- rounds
function clearEffects(){ SHOTS.forEach(s => { s.live = false; s.hooked = null; }); FX.length = 0; thrReset(); }
function resetFighters(){
  clearEffects();
  F.forEach((f, i) => {
    f.x = i ? 660 : 364; f.y = GROUND; f.vy = 0; f.facing = i ? -1 : 1; f.hp = 100; f.ghost = 100; setState(f, 'idle');
    f.vx = 0; f.combo = 0; f.comboShowT = 0; f.buffer = null; f.power = null; f.roundLow = false; f.fatalCD = 0;
    f.hitstun = 0; f.invuln = 0; f.scripted = false; f.attackHit = false; f.inputLock = 0; f.flash = 0;
    f.jumpBuf = 0; f.jumpHeld = false; f.juggle = 0; f.bounced = false; f.downT = DOWN_T;
    f.frozen = 0; f.vanish = 0; f.special = null; f.specAmp = false; f.specFired = false;
    f.spCD = [0, 0]; f.motion.length = 0; f.dirPrev = {}; f.throwCD = 0; f.poseSpin = 0; f.throwBack = false;
  });
}
function startRound(){
  resetFighters(); clearQuestion(); removeBox();
  game.timer = 90; game.clashCD = 0; game.events = []; game.slowT = 0; game.hitstop = 0; cineReset();
  game.phase = 'intro';
  showBanner('Round ' + game.round, 'round', 1200); speak('Round ' + game.round);
  later(1400, () => { showBanner('Fight!', 'fight', 900); speak('Fight'); game.phase = 'fight'; });
}
function roundOver(w, l){
  if (game.phase !== 'fight') return;
  clearQuestion(); game.phase = 'ko'; game.events = [];
  setState(l, 'ko'); l.hp = 0; l.y = GROUND; l.vy = 0; l.vx = (Math.sign(l.x - w.x) || 1) * 440;
  w.wins++; game.slowT = 1.1; game.slowScale = .3;
  showBanner('K.O.', 'ko', 1900);
  speak(w.hp >= 100 ? 'Flawless victory' : w.wins >= 2 ? 'Finish' : 'K O');
  later(2800, () => { if (w.wins >= 2) matchOver(w); else { game.round++; startRound(); } });
}
function timeOver(){
  clearQuestion(); game.phase = 'ko'; game.timer = 0; game.events = [];
  const [a, b] = F;
  if (Math.round(a.hp) === Math.round(b.hp)){ showBanner('Draw', 'round', 1600); speak('Draw'); later(2200, startRound); return; }
  const w = a.hp > b.hp ? a : b, l = other(w);
  w.wins++; setState(l, 'ko'); l.y = GROUND; l.vy = 0;
  showBanner('Time', 'ko', 1600); speak('Time');
  later(2600, () => { if (w.wins >= 2) matchOver(w); else { game.round++; startRound(); } });
}
function matchOver(w){
  game.phase = 'end'; cineReset(); setState(w, 'win');
  showBanner(w.name + ' wins', 'win', 2400); speak(w.short + ' wins');
  later(2500, () => {
    $('#endTitle').textContent = w.name + ' wins';
    $('#endStats').innerHTML = F.map(f => '<span>' + f.name + (f.cpu ? ' (CPU)' : '') + ': ' + f.stats.right + ' of ' + f.stats.asked + ' questions right</span>').join('');
    $('#end').classList.remove('hidden'); $('#btnRematch').focus();
  });
}
function startMatch(mode){
  audioInit();
  game.mode = mode; F[1].cpu = mode === 'cpu';
  game.token++; game.round = 1; game.paused = false;
  F.forEach(f => { f.wins = 0; f.lowUsed = { fatal:false, don:false }; f.stats = { asked:0, right:0 }; f.chipsHTML = ''; f.meter = 0; });
  $('#name1').textContent = 'Undefined.js' + (F[1].cpu ? ' (CPU)' : '');
  ['#menu', '#end', '#pause', '#credits'].forEach(s => $(s).classList.add('hidden'));
  $('#hud').classList.remove('hidden');
  startRound();
}
function quitToMenu(){
  game.token++; game.paused = false; game.phase = 'menu';
  clearQuestion(); removeBox(); resetFighters(); cineReset(); game.events = [];
  ['#pause', '#end', '#hud', '#credits'].forEach(s => $(s).classList.add('hidden'));
  $('#combo0').classList.remove('on'); $('#combo1').classList.remove('on');
  bannerEl.className = 'banner';
  $('#menu').classList.remove('hidden'); $('#btnCpu').focus();
}
function togglePause(force){
  const p = force !== undefined ? force : !game.paused;
  if (p === game.paused) return;
  game.paused = p; const now = performance.now();
  if (p){ game.pausedAt = now; $('#pause').classList.remove('hidden'); $('#btnResume').focus(); if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  else {
    const d = now - game.pausedAt, A = Q.active;
    if (A){ A.start += d; for (const k in A.cpuAt) A.cpuAt[k] += d; if (A.doneAt) A.doneAt += d; }
    $('#pause').classList.add('hidden'); lastT = now;
  }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && ['fight', 'intro'].includes(game.phase)) togglePause(true); });
$('#btnCpu').addEventListener('click', () => startMatch('cpu'));
$('#btn2p').addEventListener('click', () => startMatch('2p'));
$('#btnCredits').addEventListener('click', () => { $('#menu').classList.add('hidden'); $('#credits').classList.remove('hidden'); $('#btnCreditsBack').focus(); });
$('#btnCreditsBack').addEventListener('click', () => { $('#credits').classList.add('hidden'); $('#menu').classList.remove('hidden'); $('#btnCredits').focus(); });
(() => {
  const btn = $('#btnGfx');
  const label = () => gfxPref === 'auto' ? 'Auto (' + (LOW ? 'low' : 'high') + ')' : gfxPref === 'low' ? 'Low' : 'High';
  btn.textContent = label();
  btn.title = 'Lower settings drop the extra effects and render at one pixel per pixel.';
  btn.addEventListener('click', () => {
    gfxPref = { auto:'low', low:'high', high:'auto' }[gfxPref] || 'auto';
    try { localStorage.setItem(GFX_KEY, gfxPref); } catch (e){}
    LOW = gfxPref === 'low'; autoDropped = false; slowFrames = fastFrames = 0;
    resize(); btn.textContent = label();
  });
  window.__gfxLabel = () => { btn.textContent = label(); };
})();
$('#btnResume').addEventListener('click', () => togglePause(false));
$('#btnQuit').addEventListener('click', quitToMenu);
$('#btnRematch').addEventListener('click', () => startMatch(game.mode));
$('#btnMenu').addEventListener('click', quitToMenu);

// ---------------------------------------------------------------- simulation
function simulate(dt, now){
  game.simTime += dt;
  if (game.events.length){
    const due = game.events.filter(e => e.t <= game.simTime);
    if (due.length){ game.events = game.events.filter(e => e.t > game.simTime); due.forEach(e => e.fn()); }
  }
  if (game.phase === 'fight'){ game.timer -= dt; game.clashCD -= dt; }
  if (F[1].cpu) cpuThink(F[1], F[0], dt, now);
  F.forEach(f => trackMotion(f, now));
  updateFighter(F[0], F[1], dt, now);
  updateFighter(F[1], F[0], dt, now);
  updateThrow(dt); updateShots(dt); updateFx(dt);
  for (const f of F){
    const o = other(f);
    if (thr.on && (f === thr.att || f === thr.def)) continue;
    if (f.state === 'idle' || f.state === 'walk' || f.state === 'block' || f.state === 'air') f.facing = Math.sign(o.x - f.x) || f.facing;
  }
  // fighters can't stand inside each other, unless one of them is on the floor
  const dx = F[1].x - F[0].x, lying = s => s === 'down' || s === 'ko' || s === 'airhit' || s === 'frozen';
  const gone = F[0].vanish > 0 || F[1].vanish > 0 || thr.on;
  if (!gone && Math.abs(dx) < MIN_GAP && !lying(F[0].state) && !lying(F[1].state) && Math.abs(F[0].y - F[1].y) < 120){
    const push = (MIN_GAP - Math.abs(dx)) / 2, s = Math.sign(dx) || 1;
    F[0].x -= s * push; F[1].x += s * push;
  }
  F.forEach(f => { f.x = clamp(f.x, WALL_L, WALL_R); });
  updateBox(dt);
  if (game.phase === 'fight' && game.timer <= 0) timeOver();
}

// ---------------------------------------------------------------- HUD
function keyLabel(f, act){
  if (f.cpu) return '';
  const k = f.id === 0 ? { amp:'O', fatal:'P', don:'L' } : { amp:'Num 3', fatal:'Num 9', don:'Num 6' };
  return ' <kbd>' + k[act] + '</kbd>';
}
function chipsFor(f){
  const out = [];
  if (f.power) out.push('<span class="chip pw-' + f.power.type + '">' + (f.power.type === 'double' ? 'Double damage ' : 'Speed boost ') + Math.ceil(f.power.t) + 's</span>');
  // only while they are away: a ready special is the normal state and does not need a chip,
  // and this row is already long enough to start wrapping over the stage
  specialsOf(f).forEach((sp, i) => {
    if (f.spCD[i] > 0) out.push('<span class="chip dim chip-sp">' + sp.name + ' ' + Math.ceil(f.spCD[i]) + 's</span>');
  });
  if (f.meter >= AMP_COST) out.push('<span class="chip ready chip-amp">Amplify' + keyLabel(f, 'amp') + '</span>');
  const low = f.hp <= 30 && f.hp > 0;
  const suffix = () => !low ? ' below 30%' : f.roundLow ? ' next round' : '';
  if (!f.lowUsed.fatal){
    const ready = low && !f.roundLow && f.fatalCD <= 0;
    out.push('<span class="chip ' + (ready ? 'ready' : 'dim') + '">Fatal Blow' + (ready ? keyLabel(f, 'fatal') : low && !f.roundLow ? ' in ' + Math.ceil(f.fatalCD) + 's' : suffix()) + '</span>');
  }
  if (!f.lowUsed.don){
    const ready = low && !f.roundLow;
    out.push('<span class="chip ' + (ready ? 'ready' : 'dim') + '">Double or nothing' + (ready ? keyLabel(f, 'don') : suffix()) + '</span>');
  }
  return out.join('');
}
// Writing to the DOM every frame is the one thing that can cost more than the fight itself,
// so each piece of the HUD only gets touched when its text actually changes.
const hudEls = F.map(f => ({ fill:$('#fill' + f.id), ghost:$('#ghost' + f.id), chips:$('#chips' + f.id),
  pips:$('#pips' + f.id).children, meter:$('#meter' + f.id).children, combo:$('#combo' + f.id),
  lastFill:'', lastGhost:'', lastMeter:'' }));
let lastTimerText = '', lastBoxText = '', lastRoundText = '';
function updateHUD(rdt){
  if (game.phase === 'menu') return;
  F.forEach((f, i) => {
    const E = hudEls[i];
    if (!game.freeze) f.ghost = f.ghost > f.hp ? Math.max(f.hp, f.ghost - 28 * rdt) : f.hp;
    const fw = f.hp.toFixed(1) + '%', gw = f.ghost.toFixed(1) + '%';
    if (fw !== E.lastFill){ E.fill.style.width = fw; E.lastFill = fw; }
    if (gw !== E.lastGhost){ E.ghost.style.width = gw; E.lastGhost = gw; }
    E.fill.classList.toggle('low', f.hp <= 30);
    const seg = [];                                    // three bars, each one filled left to right
    for (let j = 0; j < METER_MAX; j++) seg.push(Math.round(clamp((f.meter - j) * 100, 0, 100)));
    const sk = seg.join(',');
    if (sk !== E.lastMeter){
      for (let j = 0; j < METER_MAX; j++){
        E.meter[j].firstElementChild.style.width = seg[j] + '%';
        E.meter[j].classList.toggle('full', seg[j] >= 100);
      }
      E.lastMeter = sk;
    }
    for (let j = 0; j < 2; j++) E.pips[j].classList.toggle('on', f.wins > j);
    const html = chipsFor(f); if (html !== f.chipsHTML){ E.chips.innerHTML = html; f.chipsHTML = html; }
    if (f.comboShowT > 0){ const t = f.comboShowN + ' hits'; if (E.combo.textContent !== t) E.combo.textContent = t; E.combo.classList.add('on'); }
    else E.combo.classList.remove('on');
  });
  const tt = String(Math.ceil(Math.max(0, game.timer)));
  if (tt !== lastTimerText){ $('#timer').textContent = tt; lastTimerText = tt; }
  const rt = 'Round ' + game.round;
  if (rt !== lastRoundText){ $('#roundLbl').textContent = rt; lastRoundText = rt; }
  const bt = game.phase !== 'fight' ? '' : box.state === 'none' ? 'Mystery box in ' + Math.ceil(game.boxTimer) : box.state === 'taken' ? 'Mystery box taken' : 'Mystery box is up';
  if (bt !== lastBoxText){ $('#boxLbl').textContent = bt; lastBoxText = bt; }
}

// ---------------------------------------------------------------- drawing
const SHOP = { x:600, y:128, scale:2.75, frames:6, fps:7 };
// The stage is baked once with the night wash already on it, so a frame costs one blit.
// The shop animates, so its six frames are baked the same way, each carrying the slice of
// the wash that belongs at its place on the stage - otherwise its edges show as a rectangle.
let stageBaked = null; const shopBaked = [];
function bakeStage(){
  const bg = IMG['stage/woods'], shop = IMG['stage/shop'];
  if (bg && bg.width) stageBaked = offscreen(VW, VH, g => {
    g.imageSmoothingEnabled = false;
    g.drawImage(bg, 0, 0, VW, VH);
    g.drawImage(nightTint, 0, 0, VW, VH);
  });
  if (shop && shop.width){
    const fw = shop.width / SHOP.frames, w = Math.round(fw * SHOP.scale), h = Math.round(shop.height * SHOP.scale);
    for (let i = 0; i < SHOP.frames; i++) shopBaked.push(offscreen(w, h, g => {
      g.imageSmoothingEnabled = false;
      g.drawImage(shop, i * fw, 0, fw, shop.height, 0, 0, w, h);
      g.globalCompositeOperation = 'source-atop';      // only the building, never its empty corners
      g.drawImage(nightTint, SHOP.x, SHOP.y, w, h, 0, 0, w, h);
    }));
  }
}
function drawStage(t){
  if (stageBaked) ctx.drawImage(stageBaked, 0, 0, VW, VH);
  else { ctx.fillStyle = '#1a1010'; ctx.fillRect(0, 0, VW, VH); }
  if (shopBaked.length) ctx.drawImage(shopBaked[Math.floor(t * SHOP.fps) % SHOP.frames], SHOP.x, SHOP.y);
}
function draw(rdt, t){
  const shake = (game.shake + cine.shake) * (reduceMotion ? .25 : 1);
  game.shake = Math.max(0, game.shake - rdt * 95);
  ctx.setTransform(canvas.width / VW, 0, 0, canvas.height / VH, 0, 0);

  // the arena, under the camera. During a Fatal Blow it is fading out underneath everything.
  if (cine.black < 1){
    ctx.save(); camApply(shake);
    drawStage(t); drawEmbers(rdt, t); drawBox(t);
    ctx.restore();
  }
  // the blackout is screen space: however far the camera has pushed in, the stage is gone
  if (cine.black > 0){
    ctx.fillStyle = 'rgba(0,0,0,' + cine.black.toFixed(3) + ')';
    ctx.fillRect(0, 0, VW, VH);
  }
  ctx.save(); camApply(shake);
  drawBackdrop(t);                                     // the red and gold sun behind them
  drawFxLayer(t, true);                                // portals open in the floor, under them
  const order = F[0].y <= F[1].y ? F : [F[1], F[0]];   // whoever is lower draws in front
  order.forEach(f => drawFighter(f, t));
  F.forEach(f => drawFrost(f, t));
  drawShots(t); drawFxLayer(t, false);
  drawParts();
  ctx.restore();

  if (!LOW) ctx.drawImage(vignette, 0, 0, VW, VH);
  drawPanel(); drawBars(); drawTitle();
  if (cine.flash > 0){                                 // the white-out on impact
    ctx.fillStyle = 'rgba(255,248,240,' + (cine.flash * .85).toFixed(3) + ')';
    ctx.fillRect(0, 0, VW, VH);
  }
}

// ---------------------------------------------------------------- main loop
let lastT = performance.now(), clock = 0;
function frame(now){
  requestAnimationFrame(frame);
  const rdt = Math.min(.05, Math.max(0, (now - lastT) / 1000)); lastT = now; clock += rdt;
  if (gfxPref === 'auto' && !autoDropped){           // a laptop that can't keep up gets the cheap stage
    if (rdt > .028) slowFrames++; else fastFrames++;
    if (slowFrames > 90 && slowFrames > fastFrames){ LOW = autoDropped = true; resize(); window.__gfxLabel(); toast('Graphics set to low'); }
    if (fastFrames > 600){ slowFrames = fastFrames = 0; }
  }
  pollPads();
  if (game.phase === 'menu' && padStates[0] && padStates[0].pressed.some(a => a === 'start' || a === 'fk') && !$('#menu').classList.contains('hidden')) startMatch('cpu');
  if (!game.paused){
    gatherInputs(now);
    questionTick(now);
    let dt = rdt;
    if (game.slowT > 0){ game.slowT -= rdt; dt *= game.slowScale; }
    if (game.hitstop > 0){ game.hitstop -= rdt; dt = 0; }
    cineTick(rdt);
    if (dt > 0 && !game.freeze && game.phase !== 'menu') simulate(dt, now);
    else if (!cine.on && (game.freeze || game.phase === 'menu')) F.forEach(f => { f.animT += rdt * (game.freeze ? .35 : 1); });
    updateParts(cine.on ? rdt * cine.slow : game.freeze ? 0 : dt);
    draw(rdt, clock);
    updateHUD(rdt);
    updateTouchUI();
  }
  pressedKeys.clear();
}
$('#btnCpu').focus();
requestAnimationFrame(frame);

// A peephole for tests and for poking at a live fight from the console.
// Off unless the page is opened with #debug, so a normal game exposes nothing.
if (location.hash === '#debug') window.CRK = { F, game, Q, box, ATT, SHEETS, IMG, startMatch, frameOf,
  launchUp, juggleUp, gainMeter, cine, cam, FATAL_SEQ, triggerFatal, cineReset,
  SPECIALS, SHOTS, FX, startSpecial, ampSpecial, motionMatch, freezeFighter, MOTION_WINDOW,
  thr, THROW, startThrow, tryGrab, techThrow, canThrow, CPU_TECH };
})();
