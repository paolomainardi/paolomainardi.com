# Paolo's writing voice

Inferred from the twelve posts on paolomainardi.com, weighted towards the
recent ones (2025 and 2026). The early posts (2022 and 2023) used heavy bold,
semicolon chains and emoji; the recent voice dropped all three. Write in the
recent voice.

## Who is talking

- **First person, a practitioner.** "I built", "I switched", "I changed my
  mind". The reader is a peer engineer, never a beginner to be talked down to.
- **Candid about himself.** Admits limits and small vanities, often in an
  italic aside: "I am not really a gamer", "_(yes, I know how that sounds)_",
  "because I am an Arch guy (btw)".
- **Opinionated, with the trade-off spelled out.** States the option he thinks
  is objectively better, then says what he chose anyway and why: "Now, I
  actually think immutable distros are probably the better fit for a
  console. … I went with CachyOS anyway, because …".
- **Curious about the history.** Places the topic in time with a short,
  sourced story: "I still remember when gaming on Linux was close to a lost
  cause."

## Shape of a post

1. **Front matter in TOML** (`+++`), `toc = true` on long posts, a
   `featuredImage` when there is one. Always a `description`: one sentence,
   about twenty words, saying what the reader gets from the post. It shows
   under the title as the subtitle and is the page's meta description.
2. **`## TL;DR`**: two to four sentences, the answer first, key terms in bold,
   links to the main things named.
3. **`## Introduction`**: why he did it, in personal terms, ending with the
   goal in a plain sentence.
4. **Context or history**, then **the requirements** as a plain bulleted list,
   with the key term of each item in bold where it falls in the sentence
   ("Living room standards for **noise**, not office ones.").
5. **The body**, one `##` per part and `###` for the pieces of a part. Tables
   for anything with the same fields per row.
6. **`## Conclusion`**: short, what he got and how he feels about it, no
   recap of every section.
7. **The closing invitation**: "If you have questions or just want to talk
   about X, just drop me a message [here](discussions link)".

Analysis posts swap the conclusion for numbered **takeaways** with a bold
heading each, and end with the data and references.

## Sentences and paragraphs

- **Short paragraphs**, one to three sentences, with a blank line between
  them. Start a new paragraph whenever the subject changes; a long block of
  text is always split.
- **Facts first.** Each paragraph opens with a fact: what the thing is, what
  it does, a number. Never with a sentence that introduces or sells what comes
  next.
- **Explains by analogy**: "An image-based system is basically firmware."
- **Concrete numbers, with sources**: prices, ratios, versions, dates, each
  linked to where it comes from. A strong reaction is allowed once the number
  is on the table: "Around 5.5x in just over two years, this is crazy."
- **Mostly uncontracted** ("it is", "I am", "does not"), with occasional
  "don't", "won't", "I'd".
- **Casual phrases he actually uses**: "I won't lie", "that is it", "poking
  at", "squeeze out", "comfy", "a story for another post", "just works".

## Formatting

- **Bold** generously on technical terms, tools, file formats, named people,
  agents and projects, and the numbers that matter, so a reader skimming the
  bold words gets the outline. Never whole sentences, and never a bold label
  followed by a colon.
- **Italics** for quoted words and for the one word a sentence turns on
  ("where a pixel is read from, and _which drawing_").
- **Links inline**, to primary sources: projects, specs, benchmarks, his own
  older posts.
- **Italic asides in parentheses** for jokes and side notes:
  `_(and I am not building this one with a glass panel)_`.
- **Notices** (`{{< notice note >}}`) for caveats and honesty about limits
  ("I haven't gone deep into the technical details …").
- **Figures with a caption that says something**, not just a label: "The same
  kit, now 924,99€."
- No emoji.
- **No dashes as punctuation, ever**: no em dash, no en dash, no spaced hyphen
  standing in for a comma. Use a comma, a period, a colon or parentheses.
  Hyphens inside compound words ("low-profile", "image-based") are fine.

## Things to avoid

- Inventing his opinions, feelings or experiences. Every opinion in a draft
  comes from something he said.
- The 2022 tics: bold on every other word, long chains joined by semicolons,
  emoji.
- **Marketing claims.** He describes what something does and what it did for
  him, with numbers; he never sells it. No "blazing fast", "seamless",
  "powerful", "cutting-edge", "best-in-class", "revolutionary", "next level",
  "effortless", "robust". A claim of speed or quality needs a number and a
  source next to it.
- **Announcements and slogans.** No heading or sentence that pitches an idea
  before the facts: "Every pixel is a drawing", "The browser never invents a
  pixel", "That is harder than it sounds", "Here is the trick", "This is the
  part that matters", "The answer is simple". Headings name the topic ("From
  drawings to screen", "The object sheet"); sentences state the fact.
- **Clever headings.** A heading that teases, dramatizes or reads like a
  story beat instead of naming its topic: "Where alternates stop", "When the
  local value did not apply", "Where it breaks down". Name the topic or state
  the point plainly: "Native includes over alternates", "The Alacritty font
  size".
- **Colon setups.** A sentence that stops at a colon to deliver a punchline,
  a bold phrase or an inline list reads like a slide. Examples to avoid are
  "Paolo set two rules: **only Claude and Codex**, and **every object
  drawn**", "They are not hours of work: …", "The engine has one rule: …" and
  "**Silent**: living room standards". Write a plain sentence instead, in one
  of three ways.
  - Use a verb: "Paolo set two rules, to use **only Claude and Codex** and to
    have **every object drawn**".
  - Join with "because", "so", "which" or "such as": "They are **not hours of
    work**, because Paolo sent a request and came back later".
  - Split into two sentences: "We do not chat. I write a prompt, …".

  A colon is fine at the end of a sentence that introduces a code block, a
  quote or a list on its own lines, and inside quoted text. Headings have no
  colon.
- Generic AI phrasing: "In today's fast-paced world", "Let's dive in",
  "game-changer", "In conclusion", summaries that repeat the post.
- Italian-English slips that appear in older posts ("I am using it since"):
  write correct English in his voice.
