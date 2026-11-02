# Task 12: the verb menu on right click

Add a small menu that opens on right click, so the visitor can pick an action
for what is under the pointer without going to the verb bar. Work only inside
`game/`. No git commands. The plan is approved: do not stop to ask.

## Behaviour

1. **Opening.** A right click on a hotspot, a light, an exit, a content object
   or a topic book opens the menu next to the pointer, kept inside the frame.
   The browser's own context menu never shows over the game. A right click on
   empty floor or on nothing closes an open menu and does nothing else.
2. **What it lists.** Only the verbs that do something for that target, in the
   order of `world.verbs`, with the target's name as a header line. Add `Take`
   to the verbs: on a topic book it opens the book, on a content object it
   opens the reader; elsewhere it is not listed.
3. **Look.** Drawn in the game's pixel frame: a small parchment box with a 1 px
   dark border, the labels in the book's `body` font when `book.json` is
   loaded, otherwise the 5×7 font. The label under the pointer is in the rose
   `accent`, and the sentence line reads "<verb> <target>" while hovering.
4. **Using it.** A left click on a label walks to the target when needed and
   runs the verb, exactly like choosing the verb in the bar and clicking the
   target. Esc, a click outside the menu, or moving to another room closes it.
   The verb bar's selected verb does not change.
5. **Keyboard.** When the menu is open, up and down move the highlight and
   Enter runs it.

The verb list per target lives in one place in the engine, shared with the verb
bar's own checks, so the bar and the menu never disagree.

## Docs and tests

- Document the menu in `README.md`.
- Tests: which verbs are listed for each kind of target, placement inside the
  frame near the edges, hover and click running the right verb, Esc and outside
  click closing it, and that the right click never reaches the browser's
  context menu.
- Run the whole suite. One browser check only if the sandbox allows it.

Finish with a short summary.
