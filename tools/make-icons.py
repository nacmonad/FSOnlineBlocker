#!/usr/bin/env python3
"""Generate the extension icons. Requires Pillow. Run from the repo root."""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
S = 512
BG = "#0f172a"
BORDER = "#1e293b"
INK = "#e2e8f0"
RED = "#ef4444"


def draw() -> Image.Image:
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    d.rounded_rectangle((8, 8, S - 8, S - 8), radius=110, fill=BG, outline=BORDER, width=8)

    # browser window
    d.rounded_rectangle((112, 150, 400, 344), radius=26, outline=INK, width=26)
    d.line((112, 216, 400, 216), fill=INK, width=22)
    for i, x in enumerate((152, 196, 240)):
        d.ellipse((x - 9, 183 - 9, x + 9, 183 + 9), fill=INK)

    # slash
    d.line((150, 396, 366, 118), fill=RED, width=38)
    d.ellipse((150 - 19, 396 - 19, 150 + 19, 396 + 19), fill=RED)
    d.ellipse((366 - 19, 118 - 19, 366 + 19, 118 + 19), fill=RED)
    return img


def main() -> None:
    OUT.mkdir(exist_ok=True)
    master = draw()
    for size in (16, 32, 48, 128):
        master.resize((size, size), Image.LANCZOS).save(OUT / f"icon-{size}.png")
    master.resize((256, 256), Image.LANCZOS).save(OUT / "icon-256.png")
    print("wrote", *sorted(p.name for p in OUT.iterdir()))


if __name__ == "__main__":
    main()
