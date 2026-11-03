"""Write the site's world.json from the game's: topic books list posts only."""
import json
import sys
from pathlib import Path

game = Path(__file__).resolve().parents[1]
world = json.loads((game / "dev/real/world.json").read_text())
for book in world.get("books", {}).values():
    book["content"].setdefault("type", "post")
target = Path(sys.argv[1]) if len(sys.argv) > 1 else game.parent / "adventure/world.json"
target.write_text(json.dumps(world, indent=2) + "\n")
print(f"wrote {target}")
