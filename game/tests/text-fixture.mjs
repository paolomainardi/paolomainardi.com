// Deterministic Canvas metrics for logic tests; browser checks use actual NF-Pixels.
export function context2D() {
  return {
    font: "10px NF-Pixels",
    calls: [],
    measureText(text) {
      const size = Number(this.font.match(/([\d.]+)px/)[1]);
      return {
        width: [...String(text)].reduce(
          (w, c) => w + (c === "W" ? 0.8 : c === "i" ? 0.3 : 0.6) * size,
          0,
        ),
        actualBoundingBoxAscent: size * 0.7,
        actualBoundingBoxDescent: size * 0.2,
      };
    },
    getImageData() {
      return {
        data: new Uint8ClampedArray([
          72, 44, 23, 0, 72, 44, 23, 127, 72, 44, 23, 128, 72, 44, 23, 255,
        ]),
      };
    },
    putImageData(pixels) {
      this.pixels = pixels;
    },
    fillText(...args) {
      this.calls.push({
        type: "text",
        args,
        font: this.font,
        color: this.fillStyle,
      });
    },
    fillRect(...args) {
      this.calls.push({ type: "rect", args, color: this.fillStyle });
    },
  };
}
export function canvas2D() {
  const context = context2D();
  return { width: 0, height: 0, getContext: () => context };
}
