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
assert len(colors) == 32
palette = {tuple(bytes.fromhex(c[1:])) for c in colors}
image_palette = Image.open(data / world['palette']).convert('RGB')
assert image_palette.size == (32, 1)
assert list(image_palette.getdata()) == [tuple(bytes.fromhex(c[1:])) for c in colors]
for room_id, config in world['rooms'].items():
    room_path = data / config['src']
    room = load(room_path)
    assert room['size'] == [320, 180]
    mask = np.array(Image.open(room_path.parent / room['objects']).convert('RGB'))
    assert mask.shape == (180, 320, 3)
    known = {tuple(bytes.fromhex(i['color'][1:])) for i in room['items']} | {(0, 0, 0)}
    assert set(map(tuple, mask.reshape(-1, 3))) <= known
    for state in room['states'].values():
        for file in state.values():
            image = Image.open(room_path.parent / file).convert('RGBA')
            assert image.size == (320, 180)
            assert all(pixel[3] == 0 or pixel[:3] in palette for pixel in image.getdata())
    for item in room['items']:
        color = tuple(bytes.fromhex(item['color'][1:]))
        assert np.any(np.all(mask == color, axis=2)), item['id']
        if item['kind'] == 'light':
            pool = Image.open(room_path.parent / item['pool']).convert('RGB')
            assert pool.size == (320, 180)
            assert all(r == g == b for r, g, b in pool.getdata())
    assert sum(i['kind'] == 'slot' for i in room['items']) == 6
character_path = data / world['character']
character = load(character_path)
sheet = Image.open(character_path.parent / character['sheet']).convert('RGBA')
assert sheet.size == (192, 240)
assert all(pixel[3] == 0 or pixel[:3] in palette for pixel in sheet.getdata())
for animation in character['animations'].values():
    assert (animation['row'] + 1) * character['frame'][1] <= sheet.height
    assert animation['frames'] * character['frame'][0] <= sheet.width
for file in world['objects'].values():
    image = Image.open(data / file).convert('RGBA')
    assert all(pixel[3] == 0 or pixel[:3] in palette for pixel in image.getdata())
content_path = data / 'content.json'
items = load(content_path)['items']
assert len(items) == 6
assert [item['part'] for item in items] == list(range(1, 7))
for item in items:
    reader = (content_path.parent / item['reader']).resolve()
    assert reader.is_relative_to(root)
    text = reader.read_text()
    assert '<h1>' in text and '<p>' in text and '<code>' in text
print('Placeholder dimensions, palette membership, masks, pools, animations, slots, and six reader URLs passed.')
