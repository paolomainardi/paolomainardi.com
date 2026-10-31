---
name: write-post
description: Draft a blog post for paolomainardi.com in Paolo's voice, from facts and his own answers, with the site's figures and charts. Use when Paolo asks to write, draft or outline a post, or to turn notes, a session or an interview into an article.
---

# Write a post

A post on this site is Paolo's: his experience, his opinions, his voice. This
skill gathers the facts, interviews him for the opinions, drafts in his voice
and checks the result. It never invents what he thinks.

Read [voice.md](voice.md) before writing a single line. It is the style guide
for every sentence.

## Rules

- **Opinions come from Paolo.** Every opinion, feeling, preference or
  experience in the draft traces back to something he said in the interview or
  wrote in his notes. If a section needs one and there is none, ask.
- **Facts come with a source.** Numbers, versions, dates and claims link to
  where they come from: a pull request, a benchmark, the project's own page.
- **Facts, not announcements.** No slogan headings, no sentences that sell
  what comes next, no bold label followed by a colon. Short paragraphs and
  plenty of bold on terms and numbers. voice.md has the details.
- **No AI disclosure notice.** Posts do not open with a note about how AI
  helped write them.
- **English only,** even when he answers in Italian.
- **Nothing is published without his approval.** The pull request waits for
  him; never turn on auto-merge for a post.

## Steps

1. **Collect the material.** Ask for the topic and what to read: notes,
   pull requests, issues, data, earlier posts. Build a list of facts, each with
   its source. Note the numbers that could become a chart and the screens that
   could become a figure.
2. **Propose an outline**, in the shape voice.md describes: TL;DR,
   Introduction, the parts, Conclusion. One line per section on what it says,
   plus the figures and charts it needs. Wait for his approval.
3. **Interview him**, one question at a time, five to ten in all. Ask for what
   only he knows: why he did it, what surprised him, what he would do
   differently, what he thinks of the result. Follow up on a short or vague
   answer ("which part?", "what broke?", "an example?"). Keep his answers word
   for word in a transcript outside the repository, which is public.
4. **Draft the post** in `src/content/posts/<n>-<slug>/index.md`, `<n>` being
   the next number after the highest existing post. Front matter in TOML, with
   a one sentence `description` (the subtitle under the title) and
   `draft = "true"` until he approves. A part of a series also sets
   `series = "<key>"` and `series_part = <n>`, the key being an entry in
   `src/data/series.yaml` (`title`, planned `parts`, optional `description`);
   add the entry first if the series is new. Write each section from the facts
   and his answers, in voice.md's voice.
5. **Add figures and charts.**
   - **A cover**, when the post needs one, comes from the `generate-image`
     skill.
   - **Images** go in `src/assets/images/posts/<n>-<slug>/` as WebP and are
     referenced as `/images/posts/<n>-<slug>/<file>.webp`, with the `figure`
     shortcode and a caption that says something. Screenshots are taken with
     Playwright at 1280 pixels, both colour schemes when the scheme matters.
   - **Charts** are drawn from a CSV next to `index.md` with the `chart`
     shortcode: `dot`, `bar` or `slope`, `facet` for small multiples, `axis`
     for the direction that is better, `notes` for labels that need
     explaining. Never paste a chart as an image when the data exists.
   - **Notices** for caveats, **sidenotes** for asides that would break the
     paragraph.
6. **Check it.**
   - `python3 scripts/check-post-style.py src/content/posts/<n>-<slug>/index.md`
     passes: no dashes as punctuation, no marketing words.
   - The production build is clean, and `scripts/a11y-check.cjs` passes on the
     new page.
   - Read the draft once against voice.md's "Things to avoid".
7. **Show it to him**, as a preview he can open, with screenshots of anything
   visual. Apply his edits. When he approves, set `draft = "false"` and open a
   pull request; merge only when he says so.
