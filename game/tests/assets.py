"""Check placeholder data and image constraints independently of the engine."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
data = root / 'dev/data'
load = lambda p: json.loads(p.read_text())
world = load(data / 'world.json')
colors = load(data / 'palette.json')
assert 1 <= len(colors) <= 256
palette = {tuple(bytes.fromhex(c[1:])) for c in colors}
image_palette = Image.open(data / world['palette']).convert('RGB')
assert image_palette.size == (len(colors), 1)
assert list(image_palette.getdata()) == [tuple(bytes.fromhex(c[1:])) for c in colors]
for room_id, config in world['rooms'].items():
    room_path = data / config['src']
    room = load(room_path)
    assert room['size'] == [640, 360]
    mask = np.array(Image.open(room_path.parent / room['objects']).convert('RGB'))
    assert mask.shape == (360, 640, 3)
    known = {tuple(bytes.fromhex(i['color'][1:])) for i in room['items']} | {(0, 0, 0)}
    assert set(map(tuple, mask.reshape(-1, 3))) <= known
    if room.get('water'):
        water = np.array(Image.open(room_path.parent / room['water']).convert('RGB'))
        assert water.shape == (360, 640, 3)
        assert set(map(tuple, water.reshape(-1, 3))) <= {(0, 0, 0), (255, 0, 0), (255, 255, 0)}
        assert np.any(water[..., 0] == 255) and np.any(water[..., 1] == 255)
    files = [room['albedo']]
    light_ids = {i['id'] for i in room['items'] if i['kind'] == 'light'}
    for state in room['states'].values():
        assert set(state) == {'unlit', 'lights'}
        assert set(state['lights']) == light_ids
        files += [state['unlit'], *state['lights'].values()]
    for file in files:
        image = Image.open(room_path.parent / file).convert('RGBA')
        assert image.size == (640, 360)
        assert all(pixel[3] == 0 or pixel[:3] in palette for pixel in image.getdata())
    for item in room['items']:
        color = tuple(bytes.fromhex(item['color'][1:]))
        assert np.any(np.all(mask == color, axis=2)), item['id']
        assert 'pool' not in item
    assert sum(i['kind'] == 'slot' for i in room['items']) == (6 if room_id == 'stone-house' else 0)
    assert not np.any(np.all(mask[308:] == (0, 255, 0), axis=2))
character_path = data / world['character']
character = load(character_path)
sheet = Image.open(character_path.parent / character['sheet']).convert('RGBA')
assert character['frame'] == [128, 234]
assert character['anchor'] == [64, 233]
assert character['lantern'] == [46, -73]
assert sheet.size == (768, 1170)
glow = Image.open(character_path.parent / character['glow']).convert('RGBA')
assert glow.size == sheet.size
assert any(p[3] for p in glow.getdata())
assert all(p[3] == 0 or p[:3] == (255, 255, 255) for p in glow.getdata())
assert np.all(np.array(sheet)[..., 3][np.array(glow)[..., 3] > 0] > 0)
assert all(pixel[3] == 0 or pixel[:3] in palette for pixel in sheet.getdata())
for animation in character['animations'].values():
    assert (animation['row'] + 1) * character['frame'][1] <= sheet.height
    assert (animation.get('start', 0) + animation['frames']) * character['frame'][0] <= sheet.width
for name in ('walk-side', 'walk-front', 'walk-back'):
    assert character['animations'][name]['stride'] > 0
for value in world['objects'].values():
    for file in value if isinstance(value, list) else [value]:
        image = Image.open(data / file).convert('RGBA')
        assert all(pixel[3] == 0 or pixel[:3] in palette for pixel in image.getdata())
books = [Image.open(data / file).convert('RGBA') for file in world['objects']['book']]
assert len(books) == 3
assert all(book.size == (24, 36) for book in books)
assert len({book.tobytes() for book in books}) == 3
assert all(book.getchannel('A').tobytes() == books[0].getchannel('A').tobytes() for book in books)
content_path = data / 'content.json'
items = load(content_path)['items']
posts = [item for item in items if item['type'] == 'post']
links = [item for item in items if item['type'] == 'link']
assert len(posts) == 22 and len(links) == 2
assert [item['part'] for item in posts] == list(range(1, 23))
assert world['rooms']['stone-house']['hotspots']['window']['content'] == {'type': 'link'}
for item in links:
    assert all(item.get(key) for key in ['id', 'title', 'description', 'date', 'tags', 'link'])
    assert item['link'].startswith('https://')
assert len({item['date'] for item in links}) == 2
for item in posts:
    reader = (content_path.parent / item['reader']).resolve()
    assert reader.is_relative_to(root)
    text = reader.read_text()
    assert '<h1>' in text and '<p>' in text and '<code>' in text
print('Placeholder dimensions, palette membership, masks, lamp drawings, albedo, glow, animations, slots, and six reader URLs passed.')

real = root / 'dev/real'
real_world = load(real / 'world.json')
real_palette = {tuple(bytes.fromhex(c[1:])) for c in load(real / 'palette.json')}
for config in real_world['rooms'].values():
    room_path = real / config['src']
    room = load(room_path)
    assert room['size'] == [640, 360]
    for file in [room['albedo'], *[file for state in room['states'].values()
                 for file in [state['unlit'], *state['lights'].values()]]]:
        image = Image.open(room_path.parent / file).convert('RGBA')
        assert image.size == tuple(room['size'])
        pixels = np.array(image)
        assert set(map(tuple, pixels[..., :3][pixels[..., 3] > 0])) <= real_palette
    mask = np.array(Image.open(room_path.parent / room['objects']).convert('RGB'))
    assert mask.shape == (360, 640, 3)
    known = {tuple(bytes.fromhex(item['color'][1:])) for item in room['items']}
    assert set(map(tuple, mask.reshape(-1, 3))) <= known | {(0, 0, 0)}
    for color in known:
        assert np.any(np.all(mask == color, axis=2))
character_path = real / real_world['character']
character = load(character_path)
assert character['frame'] == [128, 234]
assert character['anchor'] == [64, 233]
sheet = Image.open(character_path.parent / character['sheet']).convert('RGBA')
glow = Image.open(character_path.parent / character['glow']).convert('RGBA')
animations = character['animations'].values()
columns = max(a.get('start', 0) + a['frames'] for a in animations)
rows = max(a['row'] for a in animations) + 1
assert sheet.size == glow.size == (128 * columns, 234 * rows)
pixels = np.array(sheet)
assert set(map(tuple, pixels[..., :3][pixels[..., 3] > 0])) <= real_palette
assert np.all(pixels[..., 3][np.array(glow)[..., 3] > 0] > 0)
for value in real_world['objects'].values():
    for file in value if isinstance(value, list) else [value]:
        pixels = np.array(Image.open(real / file).convert('RGBA'))
        assert set(map(tuple, pixels[..., :3][pixels[..., 3] > 0])) <= real_palette
print('Real 640×360 room, palette, masks, 128×234 character cells, glow, and books passed.')

for folder in [data / 'book', real / 'book']:
    book = load(folder / 'book.json')
    assert Image.open(folder / book['image']).size == (640, 360)
    turn = book['turn']
    assert Image.open(folder / turn['sheet']).size == (turn['rect'][2] * turn['frames'], turn['rect'][3])
    assert book['font']['family'] == 'NF-Pixels'
    assert (folder / book['font']['regular']).read_bytes() == (real / 'book/fonts/NFPixels-Regular.ttf').read_bytes()
    assert (folder / 'fonts/NFPixels-OFL.txt').read_bytes() == (real / 'book/fonts/NFPixels-OFL.txt').read_bytes()
    assert b'SIL OPEN FONT LICENSE Version 1.1' in (folder / 'fonts/NFPixels-OFL.txt').read_bytes()
    assert book['sizes'] == dict(title=20, body=10, label=10)
    curl = np.array(Image.open(folder / book['curl']['image']).convert('RGBA'))
    colors = palette if folder == data / 'book' else real_palette
    assert set(map(tuple, curl[..., :3][curl[..., 3] > 0])) <= colors
    assert curl.shape == (24, 48, 4)
    assert set(np.unique(curl[..., 3])) == {0, 255}
assert list(real_world['books']) == ['workstation', 'linux', 'ai', 'docker', 'security', 'personal']
assert real_world['rooms']['stone-house']['books'] == list(real_world['books'])
assert [book['sprite'] for book in real_world['books'].values()] == [f'objects/book-{i}.png' for i in range(1, 7)]
print('Book frame, turn strip, NF-Pixels and OFL licence, sizes, palette curls, and real shelf order passed.')
