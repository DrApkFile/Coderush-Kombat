# Credits

The fighters and the stage are pixel art by two artists who released their work for anyone
to use. The game is built around that art, not the other way round.

## Fighter sprites — [LuizMelo](https://luizmelo.itch.io/)

Both fighters are **based on LuizMelo's Martial Hero sprites, modified**.

* **Serpent.py** is based on [Martial Hero](https://luizmelo.itch.io/martial-hero)
* **Undefined.js** is based on [Martial Hero 2](https://luizmelo.itch.io/martial-hero-2)

The idle, run, jump, fall, two attacks, take-hit and death animations are the original art.
Everything else a fighter does here — block, launcher, cast, grab, throw and the Fatal Blow
beats — was built from those frames: recomposed into new strips in Aseprite, kept to the same
palette, outline, 200x200 frame and foot baseline. Working files are in `art/`, the exported
strips in `assets/fighters/`.

Released under CC0, so credit isn't required. It's here because the art is the reason the game
looks like anything at all.

## Stage and background — [brullov](https://brullov.itch.io/)

The woods and the animated shop come from the
[Oak Woods](https://brullov.itch.io/oak-woods) environment pack — `assets/stage/`.
Free for personal and commercial use **with credit**, and not to be resold or redistributed
as an asset pack. The night tint, embers, lighting and vignette are drawn over it at run time.

## Fonts

Grenze, Grenze Gotisch and JetBrains Mono, served by Google Fonts. They are the only thing the
page loads from the network, and the game is fully playable without them.

## Everything else

The canvas 2D engine, the fighting system, the four question moments, the question bank, the
CPU opponent, the HUD and the synthesised sound effects were written for this project. There
are no sound files and no third-party JavaScript.

The 2D sprite fighter this one is modelled on is
[Divak-ar/mortal-kombat](https://github.com/Divak-ar/mortal-kombat), which is where these two
art packs were first put together, and which in turn follows a well-known HTML canvas
fighting-game tutorial. The code in this repository was written from scratch.
