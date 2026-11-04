+++
date = "2026-11-04T15:01:00+01:00"
title = "This site is now also an island you can walk"
description = "A 90s point-and-click adventure that browses this site: the island, the intro, the light, the walk, the sound and the voices."
slug = "this-site-is-now-an-island"
tags = ["ai", "agents", "webgl", "games", "design"]
featuredImage = "/images/posts/20-the-island/harbour.webp"
images = ["/images/posts/20-the-island/harbour.webp"]
draft = "false"
series = "agents"
series_part = 4
+++

## TL;DR

This site can now be browsed as a **point-and-click adventure** in the style of the LucasArts games of the 90s. It opens with an **intro**, then a visitor walks a small island, opens **topic books** to read posts, takes notes from a **notice board** to follow links and finds the about page as a **letter** in a lighthouse, and the game is called **The Context Island**. You can [play it here](/play/) on a desktop browser.

{{< notice tip "How to play" >}}
- **Click** a spot to walk there, or a book or paper to open it.
- **Pick a verb** in the panel (Look at, Open, Use, Take, Talk to), then click an object. A right click shows an object's actions.
- **The folded map** in your pocket takes you anywhere on the island.
- **T** switches between night and dusk, **M** mutes the sound and **Esc** closes a book or a page.
- **A click** skips the intro, and **R** replays it.
{{< /notice >}}

It is built with:

- **OpenAI image models**, through **[Codex](https://openai.com/codex/)**, for the art.
- **[ElevenLabs](https://elevenlabs.io/)** for the voice, the sound effects and the music.
- A **game engine** in plain JavaScript and **[WebGL2](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext)**, configured by JSON, with no dependencies ([`game/`](https://github.com/paolomainardi/paolomainardi.com/blob/main/game)).
- A **[lighting engine](https://github.com/paolomainardi/paolomainardi.com/blob/main/game/src/lighting.js)** that composes one drawing per lamp in a [shader](https://github.com/paolomainardi/paolomainardi.com/blob/main/game/src/renderer.js).
- A **[sound engine](https://github.com/paolomainardi/paolomainardi.com/blob/main/game/src/sound.js)** on **[Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)**, with synthesized ambience, recorded effects and binaural music.
- A **walk rig** in Python that moves a cut-out puppet with gait curves ([`rig_walk.py`](https://github.com/paolomainardi/paolomainardi.com/blob/main/game/tools/rig_walk.py)).
- **[Hugo](https://gohugo.io/)**, which builds the site and writes its content for the game.

{{< notice note "Updated on 5 November 2026" >}}
The island now has an intro and recorded sound effects, and this post covers them.
{{< /notice >}}

## Introduction

This is the fourth part of a journey I started a couple of weeks ago, when I [handed this blog's stack to my agents](/posts/the-stack-is-now-my-agents-job/), to see what the new generation of models can do. Then I moved to art, starting with [images](/posts/how-the-image-engine-works/), the illustrated covers of this site. Then came animations, then interactivity, with lamps you can switch on and off and a [Halloween scene](/posts/what-the-cover-engine-learned-on-halloween/) with a cat you can pet.

At that point I realized we could take one step further and try to mimic an adventure game, and even the design of the covers pushed me there. I am not a gamer, but I loved the LucasArts games so much. They always inspired me for their aesthetic and their mood.

I played **Monkey Island** from the [first](https://en.wikipedia.org/wiki/The_Secret_of_Monkey_Island) to the [third](https://en.wikipedia.org/wiki/The_Curse_of_Monkey_Island), and I watched them evolve from a bunch of colours and synthetic sounds to advanced graphics, sound and voices. Everything was stunning in that era, from the 386 to the 486 and the first audio card, the mythical **[Sound Blaster Pro](https://en.wikipedia.org/wiki/Sound_Blaster)**. Pure magic.

## The rules

I came up with the idea on 1 November while I was out for a walk, and I dictated it to Claude in Italian. Before any code, I set some rules:

- **Not an easter egg**, but an alternative way to navigate the site.
- **Monkey Island** concepts, with the same art line as the covers.
- **Lights and atmosphere** first, rendered with **[WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)**.
- Articles **readable** inside the game, rendered by the browser and not redrawn in pixels.
- **Desktop only**, no mobile version for now.
- An engine **configured by JSON**, kept separate from the site, so that one day it can work on any site, but without abstracting it too much in a prototype.
- **Only Claude and Codex** as AI models, the rule I already had for the covers. ElevenLabs, for the voices, the sounds and the music, became the one exception.

The site and the game share only the build. Hugo writes a [`content.json`](https://github.com/paolomainardi/paolomainardi.com/blob/main/src/themes/large-print/layouts/play/list.adventure.json) with posts, links and pages, and the engine reads it together with a hand-written [`world.json`](https://github.com/paolomainardi/paolomainardi.com/blob/main/game/dev/real/world.json) and the room drawings. The whole game can be removed in a single change, and the site then builds byte for byte as before ([`docs/adventure.md`](https://github.com/paolomainardi/paolomainardi.com/blob/main/docs/adventure.md)).

## The intro

The [intro](https://github.com/paolomainardi/paolomainardi.com/blob/main/game/src/intro.js) is only data. [`world.json`](https://github.com/paolomainardi/paolomainardi.com/blob/main/game/dev/real/world.json) lists its **shots**, each with a room, a time of day, a duration, its credit lines and optional sound cues, plus the music that plays under all of them.

The engine plays each shot as a room without the visitor or the panel, with the same lights and the same moving sea, and cross-fades from one shot to the next. Each credit line gets an equal part of its shot and fades in and out, drawn by the [text layer](https://github.com/paolomainardi/paolomainardi.com/blob/main/game/src/text-layer.js) with the book's pixel font in a dark band at the bottom of the screen.

A sound cue plays at its second of the shot. A click starts the game at any point, the last shot waits for one, and **R** plays the intro again from the first shot.

{{< figure src="/images/posts/20-the-island/intro-workshop.webp" caption="A shot of the intro: the room plays without the visitor or the panel, and the credit sits in the band at the bottom." >}}

{{< figure src="/images/posts/20-the-island/intro-title.webp" caption="The title shot: the scene dims and the engine draws the title large over it." >}}

The music comes from [ElevenLabs Music](https://elevenlabs.io/music), and the browser plays it **binaurally**, through two Web Audio [HRTF panners](https://developer.mozilla.org/en-US/docs/Web/API/PannerNode) that slowly drift around your head.

The music bus is split into its left and right channels, and each one feeds a **virtual speaker** in front of the listener, about 40 degrees to its side. A very slow oscillator, at 0.04 Hz, sways each speaker left and right, so on headphones the music moves gently around you ([`sound.js`](https://github.com/paolomainardi/paolomainardi.com/blob/main/game/src/sound.js)):

```js
binaural(c) {
  if (
    !c.createPanner ||
    !c.createChannelSplitter ||
    !c.createOscillator
  )
    return null;
  const split = c.createChannelSplitter(2);
  [-1, 1].forEach((side, channel) => {
    const panner = c.createPanner();
    panner.panningModel = "HRTF";
    panner.positionX.value = side * Math.sin(0.7);
    panner.positionZ.value = -Math.cos(0.7);
    const drift = c.createOscillator();
    const depth = c.createGain();
    drift.frequency.value = 0.04;
    depth.gain.value = side * 0.25;
    drift.connect(depth);
    depth.connect(panner.positionX);
    drift.start();
    split.connect(panner, channel);
    panner.connect(this.master);
  });
  return split;
}
```

## The island

The island is the world of the covers, the sea, the stone house, the lighthouses and the rose shipping container on the quay, reduced to 90s pixels. There are **four places** to visit.

{{< figure src="/images/posts/20-the-island/study.webp" caption="The study at night. Each book on the shelf is a topic, and the laptop is still awake." >}}

- The **study** in the stone house, where the bookshelf holds six [topic books](https://github.com/paolomainardi/paolomainardi.com/blob/main/game/src/book.js) (Linux, AI, Docker, Security, Workstation and Personal). Each opens in a close-up with its table of contents, and the pages turn with a curl.
- The **harbour**, where a **[notice board](https://github.com/paolomainardi/paolomainardi.com/blob/main/game/src/board.js)** holds the links as pinned papers you can read, follow or take.
- The **lighthouse**, where a **letter** on the desk is the about page and a **logbook** lists my talks.
- The **island map**, which connects the three places.

{{< figure src="/images/posts/20-the-island/harbour.webp" caption="The harbour. The notice board holds the links, and the signpost points to the rest of the island." >}}

Articles open in a reader at the browser's own resolution, with the site's fonts, and every close-up shows which section of the site you are in, with a link to the normal page. The things you take go in the **[inventory](https://github.com/paolomainardi/paolomainardi.com/blob/main/game/src/inventory.js)** and stay there on your next visit. It is the second thing on this site that uses the browser's storage, and **Forget** empties it.

{{< figure src="/images/posts/20-the-island/lighthouse.webp" caption="The top of the lighthouse, where the letter and the logbook wait on the desk." >}}

## How it is drawn

The frame is **640×360** game pixels with **256 colours**, scaled by whole numbers, so it is three times bigger on a 1080p screen. The first version ran at 320×180 with 32 colours. I found it too low, with too few colours, and I asked for 256, then for a higher resolution that still felt like the 90s.

Light is the part I cared about most. Each room is drawn several times, with every lamp off and then with each lamp lit on its own, at dusk and at night. The **WebGL** [shader](https://github.com/paolomainardi/paolomainardi.com/blob/main/game/src/renderer.js) adds the lamps you switch on, so a lamp lights the room the way it was drawn. Oil lamps flicker, the lighthouse beacon flashes and at night the character's **lantern** throws a warm pool around him. Every visit starts at night, where the lights show best, and the **Time** control in the panel switches to dusk. The sea moves a pixel at a time, from pixels already in the drawing.

{{< compare before="/images/posts/20-the-island/harbour-dusk.webp" after="/images/posts/20-the-island/harbour.webp" before-label="Dusk" after-label="Night" alt="The harbour at dusk and at night" >}}
The same harbour at dusk and at night. At night the street lamp, the door lantern and the lighthouse light the scene.
{{< /compare >}}

{{< figure src="/images/posts/20-the-island/map.webp" caption="The island map, with the stone house, the harbour and the lighthouse." >}}

## The walk

Making the character walk was the hardest part, every version looked unnatural. This is where I dove into the [ScummVM](https://github.com/scummvm/scummvm/blob/master/engines/scumm/actor.cpp) source, to see how the original engine moved a character, one fixed step per frame with separate limbs. It was far more complex than ours, so we tried other ways.

First we **measured** the drawn frames. The foot on the ground jumped **36 pixels** in one frame and barely **6** in the next, and the head bobbed 10 pixels, so the drawings could not be patched. I also found the Curse of Monkey Island sprites, which we studied as a reference only, and none of them ships in the game.

Then Claude proposed to stop drawing frames one by one, and to build a **cut-out puppet** moved by recorded human walking data. I did not even imagine that scenario, it was absurdly complex for me, but not for the agents, and it surprised me more than anything else in this project. Claude wrote the [rig in Python](https://github.com/paolomainardi/paolomainardi.com/blob/main/game/tools/rig_walk.py) without Codex. It cuts the legs from a standing pose and moves them with textbook gait curves instead of recordings, in **12 frames** that each move the foot the same **11.3 pixels**.

{{< chart type="bar" data="walk.csv" y="frame" x="px" facet="walk" unit="px" axis="Pixels the planted foot moves in each frame, equal is better" >}}
The planted foot in four frames of the side walk, in the drawn frames and in the cut-out rig.
{{< /chart >}}

Later the same rig gained the arm swing, a small bob and the front and back walks, and [`character-walk.md`](https://github.com/paolomainardi/paolomainardi.com/blob/main/game/docs/character-walk.md) explains how to do it for a new character.

## Sound and voices

The doors, the books, the lamps, the papers, the cat and the ambience of the harbour and the lighthouse are [ElevenLabs Sound Effects](https://elevenlabs.io/sound-effects). The sea, the wind and the flames are synthesized with Web Audio, follow the room and the time of day, and pan towards what makes them. The footsteps are [CC0 recordings](https://opengameart.org/node/5701) by TinyWorlds.

The visitor speaks **49 lines**, written by Claude and recorded with **[Eleven v4](https://elevenlabs.io/docs/overview/models)** in a voice called **Will**, which I chose by taste. Claude cannot hear, so I listened to every sound and every voice myself.

The hard part of AI voices is expression. Tags for pauses and emotions ended up on every line and sounded unnatural, so only nine lines keep a hesitation, and v4 follows them far better than the older models. You can [listen to the study](/play/data/voices/study-enter.mp3).

## Conclusion

All of this was a lot of fun. It started with plain [images](/posts/how-the-image-engine-works/) for the covers, then they became animations, then shaders with lamps you can switch on, a [Halloween scene](/posts/what-the-cover-engine-learned-on-halloween/), and in the end a game engine. Every step opened the next one, and the creative flow seemed endless.

It is a new way to be in the flow, in the AI era, and I am really liking it.
