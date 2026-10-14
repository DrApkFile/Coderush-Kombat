# CodeRush Kombat

A 2D sprite fighting game that stops mid-fight to ask you a coding question. Four moments
in every round put a question on screen, and the answer decides what happens next: a combo
either continues or gets broken, a mystery box either pays out or explodes, a Fatal Blow
either lands at full damage or gets halved, and Double or nothing either heals you or costs you.

Everything renders on a plain 2D canvas, so it runs on old hardware. No WebGL, no 3D models,
no animation libraries, no build step at play time. The whole game is one HTML file.

**Play it:** open `coderush-kombat.html` in a browser. That's the entire install — double-click
the file, or put it on any static host. It works offline once the page is open; the only thing
it ever fetches is the three web fonts.

## Controls

|                   | Serpent.py        | Undefined.js         | Controller        |
| ----------------- | ----------------- | -------------------- | ----------------- |
| Move              | `A` `D`           | `←` `→`              | Stick or d-pad    |
| Jump              | `W`               | `↑`                  | Stick or d-pad up |
| Block (hold)      | `S`               | `↓`                  | L2 / LT           |
| Attacks           | `U` `I` `J` `K`   | numpad `7` `8` `4` `5` | `□` `△` `✕` `○` |
| Throw             | `G`               | numpad `2`           | L1 / LB           |
| Special           | `H`               | numpad `1`           | R3 / stick click  |
| Amplify           | `O`               | numpad `3`           | R2 / RT           |
| Fatal Blow        | `P`               | numpad `9`           | L3 / stick click  |
| Double or nothing | `L`               | numpad `6`           | R1 / RB           |

`Esc` pauses, `M` mutes. On a phone, turn it sideways — touch buttons appear once the fight
starts. The same four attack buttons answer A, B, C and D when a question is up.

Two sword animations give four attacks: each one has a light version (quick, cheap, safe) and
a heavy version (slow, committed, hurts). The heaviest knocks the opponent down.

## Throws

Only up close, and a guard is no defence: a throw goes straight through a block, which is what
stops blocking from being a free ride. You can't throw out of the air or out of hitstun. Holding
**back** as you throw puts them down behind you instead of in front, for a little more damage.

When a throw grabs, the screen flashes white — that flash is the cue. It opens a **0.35 second
window** for the fighter being held to tap Throw themselves: do it and the throw breaks, both of
them are shoved apart and **THROW ESCAPE** lands on screen. Miss it and you go up, over and down
into a knockdown. The CPU gets out of about three throws in ten, and will throw a player who
sits on block.

The tech is read straight out of the input pass rather than the usual buffer, because a fighter
in someone's hands is in no state to buffer anything — the same way Amplify is read mid-cast.

| | Forward | Back (hold back) |
| --- | --- | --- |
| Damage | 14 | 17 |

## Special moves

Each fighter has two, on a motion input: **back, forward** then the first attack button, and
**down, back** then the second. Directions are relative to facing and `down` is the block
direction, which is what both keyboard layouts and the pad already use. The whole motion has to
land inside **0.4 seconds**.

They are read off an input buffer. Every time a direction goes from not-held to held it lands
in the fighter's buffer with a timestamp; pressing an attack asks whether the last few entries
spell a motion and whether the first of them is still inside the window. A motion that misses,
or that lands on a special still cooling down, falls through to the ordinary attack rather than
eating the input.

The **Special** button does the same thing without the motion — on its own for the first move,
with block held for the second — so a phone or a pad never has to draw a quarter-circle.

| Fighter | back, forward + A | down, back + B |
| --- | --- | --- |
| Serpent.py | **Pointer Pull** — a chain that yanks them in for a free hit | **Goto Strike** — comes apart into pixels, back together behind them |
| Undefined.js | **Null Freeze** — a cold orb that holds them for 1.5s | **Recursion Portal** — the floor opens under them, hands them out behind him |

Projectiles can be blocked for a point of chip damage, and two of them thrown at once cancel
each other in mid-air. Specials cost no meter. Pressing **Amplify while one is still coming
out** spends a bar to make it hit harder and land bigger — a longer freeze, a wider portal, a
knockdown instead of a stagger.

Every effect is drawn in code — the orb, its shell of turning shards, the chain and its links,
the portals, the pixel scatter of a teleport and the ice around a frozen fighter. No art files.

## The Fatal Blow

Landing one stops the fight. The screen freezes on the hit and whites out, the arena fades to
black, a red and gold sun comes up behind the two fighters, letterbox bars close in and the
title lands. The damage question runs against that backdrop, and whatever it decides, the
cinematic then plays: a dash in, three cuts with a full-screen impact panel on each, a launch,
and a ground slam in slow motion. Then the arena fades back with the loser on the floor.

The sequence is **data**, in `FATAL_SEQ`, one list of beats per fighter:

```js
{ d:.60,                                   // length in beat-time; real time is d / slow
  att:'fatalRise', def:'airhit',           // the strip each fighter shows, by name
  gap:120, defUp:250, attUp:150, ease:'out',   // where the two of them end up
  cam:{ zoom:1.62, on:'def', dy:-26, ease:8 }, // zoom, who to follow, how fast to get there
  hit:.16, panel:'red', shake:10, slow:.8, sfx:'launch' }
```

A new fighter gets their own Fatal Blow by writing a different list — different timing, camera
and strips — with no new code. A looping strip runs at its own frame rate; any other strip is
stretched to fit its beat, so a real 20-frame FatalBlow strip drops in where a 6-frame
placeholder is now without retiming anything.

A small director walks the list, and a camera (zoom, a point to sit on, shake) sits under every
arena draw. It rests at zoom 1 in the middle of the stage for the whole fight and only moves
when a cinematic takes it over. Because a close-up is tighter than a whole fighter — past about
2.2x one no longer fits between the letterbox bars — the camera looks further up the body as it
zooms, so a close-up crops the legs and never the head.

## Juggles and the super meter

Hits escalate. The first two stand the opponent up in plain hitstun; a third one staggers them,
and a third one that lands heavy puts them on the floor instead.

Under each health bar is a meter of three bars, filled by landing hits and by taking them, so
being on the wrong end of a beating still builds towards something. **Amplify** spends one bar
on a launcher: instead of a stagger or a knockdown, the opponent goes up, under the same gravity
everything else in the game uses.

While they are up there every hit keeps them up, but each one adds less lift than the one
before it. Once the next pop would be too small to matter they stop rising, which is why a
juggle can't be extended for ever — in practice four lifting hits, about a second and three
quarters in the air. Then they bounce off the ground once, lie there, and get up with a short
window of invulnerability.

The combo clash question still fires on the fourth hit of a combo, and a juggle is a combo like
any other, so a clash can happen with the defender two hundred pixels off the floor.

## Rules

Best of three rounds, 90 seconds each, 100 health. Run the opponent out of health or be
ahead when the clock stops.

| Moment | Trigger | At stake |
| --- | --- | --- |
| Combo clash | A combo reaches 4 hits, on the floor or mid-juggle | Attacker answers first: 3 bonus hits. Defender first: breaks free and counters. |
| Mystery box | Drops every 30 seconds | Walk into it and you're frozen until you answer. Right: a power-up. Wrong: it explodes. |
| Fatal Blow | Below 30% health, once a match | Landing one takes the arena over. Both race to answer: 30 damage, or 15 if the defender gets there first — then the cinematic plays the whole take. |
| Double or nothing | Below 30% health, once a match | One hard question. Right: heal 25. Wrong: lose 10. |

Using either low-health move locks the other one for the rest of the round.

## Working on it

```
src/shell.html   page markup, with three substitution markers
src/style.css    all of the CSS
src/game.js      the whole game: engine, fight system, questions, CPU, HUD
assets/          the original PNG sprite sheets
tools/build.mjs  inlines the three above into coderush-kombat.html
```

```sh
node tools/build.mjs        # rebuilds coderush-kombat.html (needs nothing installed)
```

Edit the files in `src/`, run the build, reload the page. The build inlines every sprite as a
base64 data URI, which is what makes the result a single file; `assets/` stays the source of
truth for the art.

Opening the page with `#debug` on the URL puts `window.CRK` in the console — the fighters,
the game state and the active question — which is the quickest way to try out a change.

### How the fight is put together

The game runs in a fixed 1024×576 space and the canvas is scaled to the window, so nothing in
the layout depends on the screen size. Fighters are positioned by the point between their feet,
which is also how the sprite sheets are anchored: every frame of a character puts the body in
the same place, so one anchor lines up all eight animations.

The juggle, Fatal Blow, casting and throw animations are placeholders. Rather than ship invented art, each of them borrows the
frames of another animation and bends them with a canvas transform while drawing — the stagger is
the take-hit frames leaned back, the knockdown is a fall frame rotated flat, the post-bounce
tumble is a fall frame flipped upside down. They are declared in the sprite table next to the
real animations, with a `pose` holding the transform, so dropping in a real Launcher, AirHit,
Knockdown, Getup, Cast, Grab, Throw, Thrown or FatalBlow strip is three edits: add the file to the `ART` table in `tools/build.mjs`
(the keys are already there, commented out), point the animation's `img` at it, and delete its
`pose`. The `dy` in each pose is what keeps the pose's lowest pixel on the floor rather than
through it; those numbers were measured off these sheets and want re-measuring if the art changes. A
one-frame pose borrows a single frame out of the middle of a strip with `of` (how many frames
the file holds) and `offset` (which one) — and it has to be a frame that shows the fighter: the
later frames of these attack strips are mostly the white slash effect, which alone reads as a
blank flash rather than a pose. A pose can also be spun at run time on top of whatever its
strip carries — that is how a thrown fighter turns over in the air — so a borrowed pose that
will be spun needs its pivot near the middle of the body rather than at the feet.

Attack timing is the game's, not the art's. Each move declares startup, active and recovery
frames, and the animation is stretched to fit, with the frame where the blade arrives pinned to
the start of the active window. That keeps the hit looking like it connects on both characters,
even though one of them swings on frame 4 of 6 and the other on frame 1 of 4.

Graphics quality has three settings in the menu. On auto, the game watches its own frame times
and drops to the cheap stage by itself if the machine can't hold the pace.

## Credits

The art is by two people who released it for anyone to use, and the game is built around it.
See `CREDITS.md`, or the Credits screen in the game.
