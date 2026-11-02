"""Generate the contract's disposable artwork and sample content."""
from pathlib import Path
import json
import math
from PIL import Image, ImageDraw
import shutil
import numpy as np

ROOT = Path(__file__).resolve().parents[1] / 'dev'
DATA = ROOT / 'data'
COLORS = ['#11121d','#1d202f','#292c3b','#383a45','#4b4650','#60545a','#76645f','#917b69',
          '#af9678','#c9b18a','#e0cda1','#f5e3b8','#fff1ce','#2a3742','#354b52','#486568',
          '#63817a','#8b9b82','#aabb98','#493438','#694444','#8a5650','#b57058','#d69266',
          '#edb87b','#ffd08a','#f8dca0','#30384e','#465276','#647497','#95a0ba','#d0d5d9']
# Keep the drawing's original swatches, then add a VGA-style RGB cube and greys.
COLORS += [f'#{r:02x}{g:02x}{b:02x}'
           for r in range(0, 256, 51) for g in range(0, 256, 51) for b in range(0, 256, 51)]
COLORS += [f'#{v:02x}{v:02x}{v:02x}' for v in range(16, 256, 32)]
DRAWING_SIZE = (480, 270)
ROOM_SIZE = (640, 360)
CHARACTER_FRAME = (128, 234)
RGB = np.array([tuple(bytes.fromhex(c[1:])) for c in COLORS], dtype=np.uint8)

def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + '\n')

def quantize(array):
    # Squared RGB distance suffices for placeholder asset generation.
    flat = np.asarray(array, dtype=np.int32)[..., :3]
    output = np.empty(flat.shape, dtype=np.uint8)
    for y in range(flat.shape[0]):
        dist = ((flat[y, :, None, :] - RGB.astype(np.int32)) ** 2).sum(axis=2)
        output[y] = RGB[dist.argmin(axis=1)]
    return Image.fromarray(output)

def generate_book():
    folder = DATA / 'book'
    (folder / 'fonts').mkdir(parents=True, exist_ok=True)
    paper = Image.new('RGB', ROOM_SIZE, COLORS[6])
    draw = ImageDraw.Draw(paper)
    draw.rectangle((66, 33, 574, 320), fill=COLORS[4])
    draw.rectangle((76, 40, 316, 314), fill=COLORS[11])
    draw.rectangle((323, 40, 564, 314), fill=COLORS[10])
    draw.line((320, 40, 320, 314), fill=COLORS[7], width=3)
    paper.save(folder / 'open.png')
    turn = Image.new('RGBA', (488 * 4, 274))
    draw = ImageDraw.Draw(turn)
    for frame, x in enumerate([240, 175, 95, 0]):
        origin = frame * 488
        draw.polygon([(origin + 244, 0), (origin + x, 15),
                      (origin + x, 258), (origin + 244, 273)], fill=COLORS[12])
    turn.save(folder / 'turn.png')
    for name in ['NFPixels-Regular.ttf', 'NFPixels-OFL.txt']:
        shutil.copyfile(ROOT / 'real/book/fonts' / name, folder / 'fonts' / name)
    save_json(folder / 'book.json', dict(image='open.png', pages=[[92, 56, 208, 240], [340, 56, 208, 240]],
        turn=dict(sheet='turn.png', rect=[76, 40, 488, 274], frames=4, fps=12),
        ink=COLORS[1], faded=COLORS[6], accent=COLORS[21],
        font=dict(regular='fonts/NFPixels-Regular.ttf', family='NF-Pixels'),
        sizes=dict(title=20, body=10, label=10)))
    from make_curls import generate as generate_curl
    generate_curl(folder)
    real = ROOT / 'real/book'
    if not real.exists():
        shutil.copytree(folder, real)

def generate():
    room_dir = DATA / 'rooms/stone-house'
    char_dir = DATA / 'character'
    room_dir.mkdir(parents=True, exist_ok=True)
    char_dir.mkdir(parents=True, exist_ok=True)
    (DATA / 'objects').mkdir(parents=True, exist_ok=True)
    Image.fromarray(RGB.reshape(1, len(COLORS), 3)).save(DATA / 'palette.png')
    save_json(DATA / 'palette.json', COLORS)
    base = Image.new('RGB', DRAWING_SIZE, COLORS[3])
    d = ImageDraw.Draw(base)
    d.rectangle((0, 158, DRAWING_SIZE[0] - 1, DRAWING_SIZE[1] - 1), fill=COLORS[5])
    for y in range(165, 270, 18):
        d.line((0, y, DRAWING_SIZE[0] - 1, y), fill=COLORS[4])
        for x in range((y * 7) % 82, 480, 82):
            d.line((x, y, x - 15, min(y + 16, DRAWING_SIZE[1] - 1)), fill=COLORS[4])
    for y in range(27, 158, 22):
        d.line((0, y, DRAWING_SIZE[0] - 1, y), fill=COLORS[2])
        for x in range(0 if y % 2 else 30, 480, 60):
            d.line((x, y, x, y + 21), fill=COLORS[2])
    d.rectangle((22, 64, 93, 170), fill=COLORS[7])
    d.rectangle((28, 70, 87, 170), fill=COLORS[1])
    d.rectangle((33, 75, 82, 168), fill=COLORS[6])
    for x in (40, 57, 74):
        d.line((x, 76, x, 166), fill=COLORS[4])
    d.rectangle((72, 123, 76, 128), fill=COLORS[24])
    d.rectangle((116, 63, 176, 123), fill=COLORS[7])
    d.rectangle((122, 69, 170, 117), fill=COLORS[28])
    d.ellipse((150, 74, 164, 87), fill=COLORS[30])
    d.line((146, 69, 146, 117), fill=COLORS[7], width=4)
    d.line((122, 94, 170, 94), fill=COLORS[7], width=4)
    d.rectangle((333, 72, 460, 178), fill=COLORS[6])
    d.rectangle((340, 78, 453, 168), fill=COLORS[1])
    for y in (118, 166):
        d.rectangle((336, y, 459, y + 6), fill=COLORS[8])
    d.rectangle((336, 174, 342, 190), fill=COLORS[6])
    d.rectangle((452, 174, 458, 190), fill=COLORS[6])
    d.line((237, 0, 237, 40), fill=COLORS[0], width=3)
    d.polygon([(220, 40), (254, 40), (262, 54), (212, 54)], fill=COLORS[8])
    d.rectangle((230, 54, 244, 60), fill=COLORS[26])
    d.rectangle((190, 162, 280, 170), fill=COLORS[7])
    d.rectangle((198, 171, 204, 216), fill=COLORS[4])
    d.rectangle((268, 171, 274, 216), fill=COLORS[4])
    d.rectangle((261, 136, 270, 160), fill=COLORS[9])
    d.ellipse((260, 130, 272, 142), fill=COLORS[25])
    d.rectangle((255, 159, 276, 162), fill=COLORS[7])
    # The chair is baked into both drawings and restored above the actor.
    d.rectangle((134, 198, 166, 234), fill=COLORS[6])
    d.rectangle((140, 204, 160, 225), fill=COLORS[2])
    d.rectangle((129, 231, 171, 242), fill=COLORS[7])
    d.rectangle((134, 242, 138, 267), fill=COLORS[4])
    d.rectangle((164, 242, 168, 267), fill=COLORS[4])
    objects = Image.new('RGB', DRAWING_SIZE)
    m = ImageDraw.Draw(objects)
    m.rectangle((0, 168, DRAWING_SIZE[0] - 1, DRAWING_SIZE[1] - 1), fill='#00ff00')
    m.rectangle((190, 162, 280, 216), fill='#000000')
    m.rectangle((134, 198, 166, 234), fill='#0000ff')
    m.rectangle((140, 204, 160, 225), fill='#00ff00')
    m.rectangle((129, 231, 171, 242), fill='#0000ff')
    m.rectangle((134, 242, 138, 267), fill='#0000ff')
    m.rectangle((164, 242, 168, 267), fill='#0000ff')
    items = [dict(id='floor', kind='walkable', color='#00ff00'),
             dict(id='chair', kind='foreground', color='#0000ff')]
    for i, (x, y) in enumerate([(352, 117), (392, 117), (430, 117), (352, 165), (392, 165), (430, 165)]):
        color = '#ff00' + format(100 + i * 20, '02x')
        m.rectangle((x - 10, y - 27, x + 10, y), fill=color)
        items.append(dict(id=f'shelf-{i+1}', kind='slot', color=color))
    yy, xx = np.mgrid[0:DRAWING_SIZE[1], 0:DRAWING_SIZE[0]]
    pools = []
    for name, kind, color, bounds, center, radius in [
        ('pendant', 'pendant', '#ffff00', (230, 54, 244, 60), (237, 63), 218),
        ('oil', 'oil', '#ff0000', (260, 130, 272, 147), (266, 141), 136)]:
        m.rectangle(bounds, fill=color)
        pool = np.clip(1 - np.sqrt((xx-center[0])**2 + ((yy-center[1])*0.88)**2)/radius, 0, 1) ** 1.25
        pools.append(pool)
        items.append(dict(id=name, kind='light', label=f'{name.title()} lamp', light=kind,
                          color=color, tint='#ffd08a'))
    m.rectangle((28, 70, 87, 166), fill='#ff8000')
    items.append(dict(id='door', kind='exit', label='Door', to='harbour', color='#ff8000'))
    m.rectangle((116, 63, 176, 123), fill='#00ffff')
    items.append(dict(id='window', kind='hotspot', label='Window', look='The sea, calm tonight.', color='#00ffff'))
    objects.resize(ROOM_SIZE, Image.Resampling.NEAREST).save(room_dir / 'objects.png')
    water = Image.new('RGB', DRAWING_SIZE)
    w = ImageDraw.Draw(water)
    for left, right in [(122, 143), (149, 170)]:
        w.rectangle((left, 97, right, 117), fill='#ff0000')
    w.rectangle((155, 97, 161, 117), fill='#ffff00')
    water.resize(ROOM_SIZE, Image.Resampling.NEAREST).save(room_dir / 'water.png')
    raw = np.array(base).astype(float)
    quantize(raw * 1.35).resize(ROOM_SIZE, Image.Resampling.NEAREST).save(room_dir / 'albedo.png')
    for state, ambient in [('dusk', 0.72), ('night', 0.34)]:
        unlit = raw * ambient
        quantize(unlit).resize(ROOM_SIZE, Image.Resampling.NEAREST).save(room_dir / f'{state}-unlit.png')
        for name, pool in zip(('pendant', 'oil'), pools):
            light = pool[..., None]
            lit = unlit + (raw * (1.18 - ambient) + np.array([28, 13, 0])) * light
            quantize(lit).resize(ROOM_SIZE, Image.Resampling.NEAREST).save(room_dir / f'{state}-{name}.png')
    save_json(room_dir / 'room.json', dict(name='stone-house', size=list(ROOM_SIZE), albedo='albedo.png', water='water.png',
        states={s: dict(unlit=f'{s}-unlit.png', lights={name: f'{s}-{name}.png' for name in ('pendant', 'oil')}) for s in ('dusk', 'night')},
        objects='objects.png', items=items, depth=dict(far=[192, 0.7], near=[352, 1.0]), spawn=[120, 320]))
    sheet = Image.new('RGBA', (192, 240))
    s = ImageDraw.Draw(sheet)
    glow = Image.new('RGBA', sheet.size)
    g = ImageDraw.Draw(glow)
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
            g.rectangle((x+25, y+31-bob, x+28, y+35-bob), fill='white')
    # Resize each cell separately so nearest sampling cannot cross animation cells.
    expanded = Image.new('RGBA', (CHARACTER_FRAME[0] * 6, CHARACTER_FRAME[1] * 5))
    expanded_glow = Image.new('RGBA', expanded.size)
    for row in range(5):
        for column in range(6):
            cell = sheet.crop((column * 32, row * 48, (column + 1) * 32, (row + 1) * 48))
            expanded.paste(cell.resize(CHARACTER_FRAME, Image.Resampling.NEAREST),
                           (column * CHARACTER_FRAME[0], row * CHARACTER_FRAME[1]))
            glow_cell = glow.crop((column * 32, row * 48, (column + 1) * 32, (row + 1) * 48))
            expanded_glow.paste(glow_cell.resize(CHARACTER_FRAME, Image.Resampling.NEAREST),
                                (column * CHARACTER_FRAME[0], row * CHARACTER_FRAME[1]))
    expanded.save(char_dir / 'sheet.png')
    expanded_glow.save(char_dir / 'glow.png')
    save_json(char_dir / 'character.json', dict(sheet='sheet.png', glow='glow.png', frame=list(CHARACTER_FRAME), anchor=[64, 233], lantern=[46, -73], animations={
        name: dict(row=i, frames=n, fps=fps, **({'stride': 96} if name.startswith('walk-') else {})) for i, (name, n, fps) in enumerate([
            ('idle-front', 1, 1), ('walk-side', 6, 8), ('walk-front', 4, 8), ('walk-back', 4, 8), ('talk-front', 2, 4)])}))
    generate_book()
    books = []
    for name, dark, light in [('book', 20, 22), ('book-green', 14, 16), ('book-blue', 28, 29)]:
        book = Image.new('RGBA', (12, 18))
        b = ImageDraw.Draw(book)
        b.rectangle((1, 0, 10, 17), fill=COLORS[dark])
        b.rectangle((3, 1, 9, 16), fill=COLORS[light])
        b.line((4, 4, 8, 4), fill=COLORS[10])
        b.line((4, 12, 8, 12), fill=COLORS[10])
        book = book.resize((24, 36), Image.Resampling.NEAREST)
        path = f'objects/{name}.png'
        book.save(DATA / path)
        books.append(path)
    frame = Image.new('RGBA', (12, 12), COLORS[6])
    f = ImageDraw.Draw(frame)
    for inset, color in [(0, 0), (1, 9), (2, 7), (3, 2)]:
        f.rectangle((inset, inset, 11-inset, 11-inset), outline=COLORS[color])
    frame.save(ROOT.parent / 'src/reader-frame.png')
    save_json(DATA / 'world.json', dict(title='The engineer\'s study', palette='palette.png', start='stone-house',
        character='character/character.json', verbs=['Look at', 'Open', 'Use', 'Talk to'], objects=dict(book=books),
        sounds={'sea': {'synth': 'surf', 'volume': 0.5, 'loop': True}, 'wind': {'synth': 'wind', 'volume': 0.3, 'loop': True}, 'flame': {'synth': 'crackle', 'volume': 0.25, 'loop': True}, 'step': {'synth': 'step', 'volume': 0.5}, 'page': {'synth': 'page', 'volume': 0.6}, 'click': {'synth': 'click', 'volume': 0.4}, 'door': {'synth': 'creak', 'volume': 0.5}},
        events={'step': 'step', 'page-turn': 'page', 'book-open': 'page', 'book-close': 'page', 'lamp': 'click', 'menu': 'click', 'door': 'door'},
        mix={'master': 0.5, 'ambience': 0.8, 'effects': 1.0},
        book='book/book.json',
        books={key: dict(title=title, content=content, sprite=books[i % len(books)])
               for i, (key, title, content) in enumerate([
                   ('workstation', 'Workstation', dict(series='workstation')),
                   ('linux', 'Linux', dict(tags=['linux'])),
                   ('ai', 'AI and agents', dict(tags=['ai'])),
                   ('docker', 'Docker', dict(tags=['docker'])),
                   ('security', 'Security', dict(tags=['security'])),
                   ('personal', 'Personal', dict(tags=['personal']))])},
        rooms={'stone-house': dict(src='rooms/stone-house/room.json', books=['workstation', 'linux', 'ai', 'docker', 'security', 'personal'],
            ambience=dict(dusk=[dict(sound='sea', at='window')],
                night=[dict(sound='sea', at='window'), dict(sound='wind'), dict(sound='flame', at='oil', light='oil')]),
            hotspots=dict(window=dict(content=dict(type='link'))))}))
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
    for i in range(7, 23):
        content.append(dict(id=f'workstation-{i}', type='post',
            title=f'Workstation notes {i}: choosing quiet hardware and tools for a Linux development desk',
            description='Placeholder notes for the book close-up.', date=f'2026-10-{i:02}',
            tags=['linux', ['ai', 'docker', 'security', 'personal'][i % 4]], series='workstation', part=i,
            url='../reader/workstation-1.html', reader='../reader/workstation-1.html'))
    content.extend([
        dict(id='web-platform', type='link', title='The web platform',
             description='Standards and tools for building on the web.', date='2026-10-20',
             tags=['web'], link='https://www.w3.org/', url='/links/web-platform/'),
        dict(id='linux-kernel', type='link', title='The Linux kernel',
             description='Follow kernel releases and development.', date='2026-10-25',
             tags=['linux'], link='https://www.kernel.org/', url='/links/linux-kernel/'),
    ])
    save_json(DATA / 'content.json', dict(items=content))
    print(f'Generated placeholder assets, book close-up, 22 posts and two links in {ROOT}')

if __name__ == '__main__':
    generate()
