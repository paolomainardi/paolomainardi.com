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
    assert room['size'] == [480, 270]
    mask = np.array(Image.open(room_path.parent / room['objects']).convert('RGB'))
    assert mask.shape == (270, 480, 3)
    known = {tuple(bytes.fromhex(i['color'][1:])) for i in room['items']} | {(0, 0, 0)}
    assert set(map(tuple, mask.reshape(-1, 3))) <= known
    files = [room['albedo']]
    light_ids = {i['id'] for i in room['items'] if i['kind'] == 'light'}
    for state in room['states'].values():
        assert set(state) == {'unlit', 'lights'}
        assert set(state['lights']) == light_ids
        files += [state['unlit'], *state['lights'].values()]
    for file in files:
        image = Image.open(room_path.parent / file).convert('RGBA')
        assert image.size == (480, 270)
        assert all(pixel[3] == 0 or pixel[:3] in palette for pixel in image.getdata())
    for item in room['items']:
        color = tuple(bytes.fromhex(item['color'][1:]))
        assert np.any(np.all(mask == color, axis=2)), item['id']
        assert 'pool' not in item
    assert sum(i['kind'] == 'slot' for i in room['items']) == 6
character_path = data / world['character']
character = load(character_path)
sheet = Image.open(character_path.parent / character['sheet']).convert('RGBA')
assert character['frame'] == [72, 128]
assert character['anchor'] == [36, 127]
assert character['lantern'] == [26, -40]
assert sheet.size == (432, 640)
glow = Image.open(character_path.parent / character['glow']).convert('RGBA')
assert glow.size == sheet.size
assert any(p[3] for p in glow.getdata())
assert all(p[3] == 0 or p[:3] == (255, 255, 255) for p in glow.getdata())
assert np.all(np.array(sheet)[..., 3][np.array(glow)[..., 3] > 0] > 0)
assert all(pixel[3] == 0 or pixel[:3] in palette for pixel in sheet.getdata())
for animation in character['animations'].values():
    assert (animation['row'] + 1) * character['frame'][1] <= sheet.height
    assert animation['frames'] * character['frame'][0] <= sheet.width
for value in world['objects'].values():
    for file in value if isinstance(value, list) else [value]:
        image = Image.open(data / file).convert('RGBA')
        assert all(pixel[3] == 0 or pixel[:3] in palette for pixel in image.getdata())
books = [Image.open(data / file).convert('RGBA') for file in world['objects']['book']]
assert len(books) == 3
assert all(book.size == (18, 27) for book in books)
assert len({book.tobytes() for book in books}) == 3
assert all(book.getchannel('A').tobytes() == books[0].getchannel('A').tobytes() for book in books)
content_path = data / 'content.json'
items = load(content_path)['items']
assert len(items) == 6
assert [item['part'] for item in items] == list(range(1, 7))
for item in items:
    reader = (content_path.parent / item['reader']).resolve()
    assert reader.is_relative_to(root)
    text = reader.read_text()
    assert '<h1>' in text and '<p>' in text and '<code>' in text
print('Placeholder dimensions, palette membership, masks, lamp drawings, albedo, glow, animations, slots, and six reader URLs passed.')
