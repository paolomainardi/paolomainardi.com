// Deterministic Canvas metrics for logic tests; browser checks use actual Literata.
export function context2D() {
  return {
    font: "400 6.5px Literata",
    calls: [],
    measureText(text) {
      const size = Number(this.font.match(/([\d.]+)px/)[1]);
      return {
        width: [...String(text)].reduce(
          (w, c) => w + (c === "W" ? 0.9 : c === "i" ? 0.27 : 0.52) * size,
          0,
        ),
        fontBoundingBoxAscent: size * 0.95,
        fontBoundingBoxDescent: size * 0.25,
      };
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
      this.calls.push({ type: "rect", args });
    },
  };
}
export function canvas2D() {
  const context = context2D();
  return { width: 0, height: 0, getContext: () => context };
}
