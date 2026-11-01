"""Generate the contract's disposable artwork and sample content."""
from pathlib import Path
import json
import math
from PIL import Image, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parents[1] / 'dev'
DATA = ROOT / 'data'
COLORS = ['#11121d','#1d202f','#292c3b','#383a45','#4b4650','#60545a','#76645f','#917b69',
          '#af9678','#c9b18a','#e0cda1','#f5e3b8','#fff1ce','#2a3742','#354b52','#486568',
          '#63817a','#8b9b82','#aabb98','#493438','#694444','#8a5650','#b57058','#d69266',
          '#edb87b','#ffd08a','#f8dca0','#30384e','#465276','#647497','#95a0ba','#d0d5d9']
RGB = np.array([tuple(bytes.fromhex(c[1:])) for c in COLORS], dtype=np.uint8)

def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + '\n')

def quantize(array):
    # Squared RGB distance suffices for placeholder asset generation.
    flat = np.asarray(array, dtype=np.int32)[..., :3]
    dist = ((flat[:, :, None, :] - RGB.astype(np.int32)) ** 2).sum(axis=3)
    return Image.fromarray(RGB[dist.argmin(axis=2)])

def generate():
    room_dir = DATA / 'rooms/stone-house'
    char_dir = DATA / 'character'
    (room_dir / 'pools').mkdir(parents=True, exist_ok=True)
    char_dir.mkdir(parents=True, exist_ok=True)
    (DATA / 'objects').mkdir(parents=True, exist_ok=True)
    Image.fromarray(RGB.reshape(1, 32, 3)).save(DATA / 'palette.png')
    save_json(DATA / 'palette.json', COLORS)
    base = Image.new('RGB', (320, 180), COLORS[3])
    d = ImageDraw.Draw(base)
    d.rectangle((0, 105, 319, 179), fill=COLORS[5])
    for y in range(110, 180, 12):
        d.line((0, y, 319, y), fill=COLORS[4])
        for x in range((y * 7) % 55, 320, 55):
            d.line((x, y, x - 10, min(y + 11, 179)), fill=COLORS[4])
    for y in range(18, 105, 15):
        d.line((0, y, 319, y), fill=COLORS[2])
        for x in range(0 if y % 2 else 20, 320, 40):
            d.line((x, y, x, y + 14), fill=COLORS[2])
    d.rectangle((15, 43, 62, 113), fill=COLORS[7])
    d.rectangle((19, 47, 58, 113), fill=COLORS[1])
    d.rectangle((22, 50, 55, 112), fill=COLORS[6])
    for x in (27, 38, 49):
        d.line((x, 51, x, 111), fill=COLORS[4])
    d.rectangle((48, 82, 51, 85), fill=COLORS[24])
    d.rectangle((77, 42, 117, 82), fill=COLORS[7])
    d.rectangle((81, 46, 113, 78), fill=COLORS[28])
    d.ellipse((100, 49, 109, 58), fill=COLORS[30])
    d.line((97, 46, 97, 78), fill=COLORS[7], width=3)
    d.line((81, 63, 113, 63), fill=COLORS[7], width=3)
    d.rectangle((222, 48, 307, 119), fill=COLORS[6])
    d.rectangle((227, 52, 302, 112), fill=COLORS[1])
    for y in (79, 111):
        d.rectangle((224, y, 306, y + 4), fill=COLORS[8])
    d.rectangle((224, 116, 228, 127), fill=COLORS[6])
    d.rectangle((301, 116, 305, 127), fill=COLORS[6])
    d.line((158, 0, 158, 27), fill=COLORS[0], width=2)
    d.polygon([(147, 27), (169, 27), (175, 36), (141, 36)], fill=COLORS[8])
    d.rectangle((153, 36, 163, 40), fill=COLORS[26])
    d.rectangle((127, 108, 187, 113), fill=COLORS[7])
    d.rectangle((132, 114, 136, 144), fill=COLORS[4])
    d.rectangle((179, 114, 183, 144), fill=COLORS[4])
    d.rectangle((174, 91, 180, 107), fill=COLORS[9])
    d.ellipse((173, 87, 181, 95), fill=COLORS[25])
    d.rectangle((170, 106, 184, 108), fill=COLORS[7])
    # The chair is baked into both drawings and restored above the actor.
    d.rectangle((89, 132, 111, 156), fill=COLORS[6])
    d.rectangle((93, 136, 107, 150), fill=COLORS[2])
    d.rectangle((86, 154, 114, 161), fill=COLORS[7])
    d.rectangle((89, 161, 92, 178), fill=COLORS[4])
    d.rectangle((109, 161, 112, 178), fill=COLORS[4])
    objects = Image.new('RGB', (320, 180))
    m = ImageDraw.Draw(objects)
    m.rectangle((0, 112, 319, 179), fill='#00ff00')
    m.rectangle((127, 108, 187, 144), fill='#000000')
    m.rectangle((89, 132, 111, 156), fill='#0000ff')
    m.rectangle((93, 136, 107, 150), fill='#00ff00')
    m.rectangle((86, 154, 114, 161), fill='#0000ff')
    m.rectangle((89, 161, 92, 178), fill='#0000ff')
    m.rectangle((109, 161, 112, 178), fill='#0000ff')
    items = [dict(id='floor', kind='walkable', color='#00ff00'),
             dict(id='chair', kind='foreground', color='#0000ff')]
    for i, (x, y) in enumerate([(235, 78), (261, 78), (287, 78), (235, 110), (261, 110), (287, 110)]):
        color = '#ff00' + format(100 + i * 20, '02x')
        m.rectangle((x - 7, y - 18, x + 7, y), fill=color)
        items.append(dict(id=f'shelf-{i+1}', kind='slot', color=color))
    yy, xx = np.mgrid[0:180, 0:320]
    pools = []
    for name, kind, color, bounds, center, radius in [
        ('pendant', 'pendant', '#ffff00', (153, 36, 163, 40), (158, 42), 145),
        ('oil', 'oil', '#ff0000', (173, 87, 181, 98), (177, 94), 91)]:
        m.rectangle(bounds, fill=color)
        pool = np.clip(1 - np.sqrt((xx-center[0])**2 + ((yy-center[1])*0.88)**2)/radius, 0, 1) ** 1.25
        pools.append(pool)
        Image.fromarray((pool * 255).astype('uint8')).save(room_dir / f'pools/{name}.png')
        items.append(dict(id=name, kind='light', label=f'{name.title()} lamp', light=kind,
                          color=color, pool=f'pools/{name}.png', tint='#ffd08a'))
    m.rectangle((19, 47, 58, 111), fill='#ff8000')
    items.append(dict(id='door', kind='exit', label='Door', to='harbour', color='#ff8000'))
    m.rectangle((77, 42, 117, 82), fill='#00ffff')
    items.append(dict(id='window', kind='hotspot', label='Window', look='The sea, calm tonight.', color='#00ffff'))
    objects.save(room_dir / 'objects.png')
    raw = np.array(base).astype(float)
    light = np.clip(sum(pools), 0, 1)[..., None]
    for state, ambient in [('dusk', 0.72), ('night', 0.34)]:
        unlit = raw * ambient
        lit = raw * (ambient + (1.18 - ambient) * light) + np.array([28, 13, 0]) * light
        quantize(unlit).save(room_dir / f'{state}-unlit.png')
        quantize(lit).save(room_dir / f'{state}-lit.png')
    save_json(room_dir / 'room.json', dict(name='stone-house', size=[320, 180],
        states={s: dict(lit=f'{s}-lit.png', unlit=f'{s}-unlit.png') for s in ('dusk', 'night')},
        objects='objects.png', items=items, depth=dict(far=[96, 0.7], near=[176, 1.0]), spawn=[60, 160]))
    sheet = Image.new('RGBA', (192, 240))
    s = ImageDraw.Draw(sheet)
    for row, count in enumerate([1, 6, 4, 4, 2]):
        for frame in range(count):
            x, y = frame * 32, row * 48
            stride = round(math.sin(frame / count * math.tau) * 4) if row in (1, 2, 3) else 0
            bob = abs(stride) // 3
            s.rectangle((x+11, y+28-bob, x+15, y+44+stride//2), fill=COLORS[27])
            s.rectangle((x+18, y+28-bob, x+22, y+44-stride//2), fill=COLORS[28])
            s.rectangle((x+9, y+44+stride//2, x+15, y+47), fill=COLORS[0])
            s.rectangle((x+18, y+44-stride//2, x+24, y+47), fill=COLORS[0])
            s.rectangle((x+10, y+16-bob, x+22, y+31-bob), fill=COLORS[14])
            s.rectangle((x+12, y+4-bob, x+21, y+15-bob), fill=COLORS[9] if row != 3 else COLORS[4])
            s.rectangle((x+11, y+3-bob, x+22, y+7-bob), fill=COLORS[4])
            if row != 3:
                eye_x = 21 if row == 1 else 14
                s.point((x+eye_x, y+10-bob), fill=COLORS[0])
                if row != 1:
                    s.point((x+19, y+10-bob), fill=COLORS[0])
                if row == 4:
                    s.rectangle((x+15, y+13, x+18, y+13+frame), fill=COLORS[20])
            s.rectangle((x+7+stride//2, y+18-bob, x+10+stride//2, y+32-bob), fill=COLORS[15])
            s.rectangle((x+23, y+18-bob, x+25, y+29-bob), fill=COLORS[15])
            s.rectangle((x+24, y+30-bob, x+29, y+37-bob), fill=COLORS[8])
            s.rectangle((x+25, y+31-bob, x+28, y+35-bob), fill=COLORS[25])
    sheet.save(char_dir / 'sheet.png')
    save_json(char_dir / 'character.json', dict(sheet='sheet.png', frame=[32, 48], anchor=[16, 47], animations={
        name: dict(row=i, frames=n, fps=fps) for i, (name, n, fps) in enumerate([
            ('idle-front', 1, 1), ('walk-side', 6, 8), ('walk-front', 4, 8), ('walk-back', 4, 8), ('talk-front', 2, 4)])}))
    book = Image.new('RGBA', (12, 18))
    b = ImageDraw.Draw(book)
    b.rectangle((1, 0, 10, 17), fill=COLORS[20])
    b.rectangle((3, 1, 9, 16), fill=COLORS[22])
    b.line((4, 4, 8, 4), fill=COLORS[10])
    b.line((4, 12, 8, 12), fill=COLORS[10])
    book.save(DATA / 'objects/book.png')
    frame = Image.new('RGBA', (12, 12), COLORS[6])
    f = ImageDraw.Draw(frame)
    for inset, color in [(0, 0), (1, 9), (2, 7), (3, 2)]:
        f.rectangle((inset, inset, 11-inset, 11-inset), outline=COLORS[color])
    frame.save(ROOT.parent / 'src/reader-frame.png')
    save_json(DATA / 'world.json', dict(title='The engineer\'s study', palette='palette.png', start='stone-house',
        character='character/character.json', verbs=['Look at', 'Open', 'Use', 'Talk to'], objects=dict(book='objects/book.png'),
        rooms={'stone-house': dict(src='rooms/stone-house/room.json', content=dict(series='workstation'), object='book')}))
    titles = ['A room of one\'s own', 'Choosing the hardware', 'Linux on the desk', 'Containers at home', 'A quieter workstation', 'The finished build']
    content = []
    for i, title in enumerate(titles, 1):
        slug = f'workstation-{i}'
        content.append(dict(id=slug, type='post', title=title, description=f'Part {i} of the workstation series. {title}.',
            date=f'2026-10-{i:02}', tags=['linux', 'hardware'], series='workstation', part=i,
            url=f'../reader/{slug}.html', reader=f'../reader/{slug}.html'))
        (ROOT / 'reader').mkdir(exist_ok=True)
        (ROOT / f'reader/{slug}.html').write_text(f'''<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><style>html{{color-scheme:light dark}}body{{max-width:42rem;margin:3rem auto;padding:0 1.5rem;font:19px/1.7 Georgia,serif}}h1{{line-height:1.2}}pre{{overflow:auto;padding:1rem;background:#8882;font:14px/1.6 monospace}}small{{font-family:monospace}}</style>
<small>WORKSTATION / PART {i} OF 6</small><h1>{title}</h1>
<p>A workstation is a place to think. The machine should stay quiet, the tools should feel familiar, and the desk should leave room for a notebook.</p>
<p>This sample article lives outside the low resolution scene. Its text stays sharp as you resize the window.</p>
<h2>Start with what you need</h2><p>Measure the work you do each day before choosing parts. A useful system is one you understand and can repair.</p>
<pre><code>$ uname -s\nLinux\n$ printf 'hello, workstation\\n'\nhello, workstation</code></pre>
<p>Close this reader with Escape or the close button to return to the study.</p></html>''')
    save_json(DATA / 'content.json', dict(items=content))
    print(f'Generated placeholder assets and six articles in {ROOT}')

if __name__ == '__main__':
    generate()
