"""Fold lower page corners from open.png, using only the book's palette."""
from pathlib import Path
import json
from PIL import Image


def generate(folder):
    book = json.loads((folder / 'book.json').read_text())
    paper = Image.open(folder / book['image']).convert('RGB')
    palette = [tuple(bytes.fromhex(c[1:])) for c in json.loads((folder.parent / 'palette.json').read_text())]
    size = 24
    strip = Image.new('RGBA', (size * 2, size))
    rects = []
    for side, (x, y, w, h) in enumerate(book['pages']):
        tone = paper.crop((x, y, x + w, y + h)).getcolors(w * h)
        dominant = max(tone)[1]
        points = [(px, py) for py in range(y + h - 10, min(330, y + h + 40))
                  for px in (range(0, x + w // 2) if side == 0 else range(x + w // 2, 640))
                  if sum((a - b) ** 2 for a, b in zip(paper.getpixel((px, py)), dominant)) < 100]
        bottom = max(py for px, py in points)
        edge = (min if side == 0 else max)(px for px, py in points if py >= bottom - 4)
        left, top = edge if side == 0 else edge - size + 1, bottom - size + 1
        rects.append([left, top, size, size])
        for v in range(size):
            for u in range(size):
                inward = u if side == 0 else size - 1 - u
                if inward + size - 1 - v >= size:
                    continue
                # Reflect the page pixels across the diagonal crease.
                source_x = left + (size - 1 - v if side == 0 else v)
                source_y = top + (size - 1 - inward)
                rgb = paper.getpixel((source_x, source_y))
                if inward + size - 1 - v < size // 2:
                    # Expose the pixels just below the leaf where the tip lifts.
                    rgb = paper.getpixel((left + u, min(paper.height - 1, bottom + 5)))
                    darker = rgb
                else:
                    darker = tuple(round(c * 0.88) for c in rgb)
                color = min(palette, key=lambda c: sum((a - b) ** 2 for a, b in zip(c, darker)))
                strip.putpixel((side * size + u, v), (*color, 255))
    strip.save(folder / 'curl.png')
    book['curl'] = dict(image='curl.png', rects=rects)
    (folder / 'book.json').write_text(json.dumps(book, indent=2) + '\n')


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1] / 'dev'
    for kind in ['data', 'real']:
        generate(root / kind / 'book')
