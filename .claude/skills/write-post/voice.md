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
   `featuredImage` when there is one.
2. **A disclosure notice first**, whenever AI helped, worded for what it did.
   A post he wrote by hand: "I wrote this post by hand. An AI helped me review
   it, tighten the writing and fact-check the technical parts." A post drafted
   from his notes and answers: "This post was drafted with AI from my notes
   and answers. I reviewed and edited every line, and the opinions are mine."
   Say "AI", never a product name.
3. **`## TL;DR`**: two to four sentences, the answer first, key terms in bold,
   links to the main things named.
4. **`## Introduction`**: why he did it, in personal terms, with the goal
   stated plainly at the end ("So the goal was simple: …").
5. **Context or history**, then **the requirements** as a bulleted list with
   bold lead-ins ("**Silent**: living room standards, not office standards.").
6. **The body**, one `##` per part and `###` for the pieces of a part. Tables
   for anything with the same fields per row.
7. **`## Conclusion`**: short, what he got and how he feels about it, no
   recap of every section.
8. **The closing invitation**: "If you have questions or just want to talk
   about X, just drop me a message [here](discussions link)".

Analysis posts swap the conclusion for numbered **takeaways** with a bold
heading each, and end with the data and references.

## Sentences and paragraphs

- **Short paragraphs**, two to four sentences. A one-sentence paragraph is used
  as a hinge: "This is the part I changed my mind about."
- **Rhetorical question, then the plain answer**: "So what is actually
  happening under the hood?"
- **Explains by analogy**: "An image-based system is basically firmware."
- **Concrete numbers, with sources**: prices, ratios, versions, dates, each
  linked to where it comes from. A strong reaction is allowed once the number
  is on the table: "Around 5.5x in just over two years, this is crazy."
- **Mostly uncontracted** ("it is", "I am", "does not"), with occasional
  "don't", "won't", "I'd".
- **Casual phrases he actually uses**: "I won't lie", "that is it", "poking
  at", "squeeze out", "comfy", "a story for another post", "just works".

## Formatting

- **Bold** for key terms and named things, a few per section, never whole
  sentences.
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
- Generic AI phrasing: "In today's fast-paced world", "Let's dive in",
  "game-changer", "In conclusion", summaries that repeat the post.
- Italian-English slips that appear in older posts ("I am using it since"):
  write correct English in his voice.
