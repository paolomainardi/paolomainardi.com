// Build the 5 by 7 bitmap UI font and wrap its fixed-width text.
// Each pair of hexadecimal digits encodes one glyph row.
const glyphs = {
  A: "0e11111f111111",
  B: "1e11111e11111e",
  C: "0e11101010110e",
  D: "1e11111111111e",
  E: "1f10101e10101f",
  F: "1f10101e101010",
  G: "0e11101711110f",
  H: "1111111f111111",
  I: "0e04040404040e",
  J: "0702020212120c",
  K: "11121418141211",
  L: "1010101010101f",
  M: "111b1515111111",
  N: "11191513111111",
  O: "0e11111111110e",
  P: "1e11111e101010",
  Q: "0e11111115120d",
  R: "1e11111e141211",
  S: "0f10100e01011e",
  T: "1f040404040404",
  U: "1111111111110e",
  V: "11111111110a04",
  W: "11111115151b11",
  X: "11110a040a1111",
  Y: "11110a04040404",
  Z: "1f01020408101f",
  0: "0e11131519110e",
  1: "040c040404040e",
  2: "0e11010204081f",
  3: "1e01010601011e",
  4: "02060a121f0202",
  5: "1f10101e01011e",
  6: "0e10101e11110e",
  7: "1f010204080808",
  8: "0e11110e11110e",
  9: "0e11110f01010e",
  ".": "00000000000c0c",
  ",": "00000000000c08",
  ":": "000c0c000c0c00",
  "'": "04040800000000",
  "!": "04040404040004",
  "?": "0e110102040004",
  "-": "0000001f000000",
  "/": "01010204081010",
  "(": "02040808080402",
  ")": "08040202020408",
  "<": "02040810080402",
  ">": "08040201020408",
  "+": "0004041f040400",
  ";": "000c0c000c0c08",
  '"': "0a0a0a00000000",
  _: "0000000000001f",
  "=": "00001f001f0000",
  " ": "00000000000000",
  "…": "00000000001515",
};

export function fontPixels() {
  const pixels = new Uint8Array(96 * 48 * 4);
  for (let code = 32; code < 128; code++) {
    const bits =
      glyphs[code === 127 ? "…" : String.fromCharCode(code).toUpperCase()] ||
      glyphs["?"];
    const ox = ((code - 32) % 16) * 6,
      oy = Math.floor((code - 32) / 16) * 8;
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 5; x++) {
        if (parseInt(bits.slice(y * 2, y * 2 + 2), 16) & (1 << (4 - x))) {
          pixels.set([255, 255, 255, 255], ((oy + y) * 96 + ox + x) * 4);
        }
      }
  }
  return pixels;
}

export function wrap(text, width = 42, maxLines = Infinity) {
  const lines = [];
  for (const paragraph of String(text).split("\n")) {
    let line = "";
    for (let word of paragraph.split(/\s+/)) {
      while (word.length > width) {
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(word.slice(0, width));
        word = word.slice(width);
      }
      if (line && line.length + word.length + 1 > width) {
        lines.push(line);
        line = "";
      }
      line += (line ? " " : "") + word;
    }
    if (line) lines.push(line);
  }
  if (lines.length > maxLines) {
    let end = lines[maxLines - 1];
    if (end.length >= width) {
      end = end.slice(0, width - 1);
      const space = end.lastIndexOf(" ");
      if (space > 0) end = end.slice(0, space);
    }
    return [...lines.slice(0, maxLines - 1), end.trimEnd() + "…"];
  }
  return lines;
}
