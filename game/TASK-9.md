# Task 9: small fixes

Work only inside `game/`, no git commands. Finish with a summary.

1. **Long sentences.** The sentence line cuts long titles at the right edge. Wrap it
   onto a second line when it does not fit, breaking at a word, and end with "…"
   only if two lines are still not enough. Same for the text the character says.
2. **Walking.** Crossing the room to a far object is slow. Raise the speed to about
   90 pixels per second at scale 1, and let a double click on the floor or on an
   object make the character run at twice the speed for that walk.
3. **Reader frame.** The reader's dark top bar wastes space just to hold the Close
   button. Remove the bar: the iframe fills the frame, and a small close button
   ("×", with an accessible label "Close") sits over the frame's top right corner.
   Esc still closes.
