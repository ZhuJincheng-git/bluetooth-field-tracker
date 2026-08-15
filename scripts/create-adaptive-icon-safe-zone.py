from pathlib import Path

from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSETS = PROJECT_ROOT / "assets" / "images"
SOURCE = ASSETS / "icon.png"
TARGETS = [ASSETS / "android-icon-foreground.png", ASSETS / "android-icon-monochrome.png"]
SAFE_ZONE_RATIO = 0.70


def render_safe_zone_icon(source: Image.Image) -> Image.Image:
    canvas_size = max(source.size)
    content_size = int(canvas_size * SAFE_ZONE_RATIO)
    resized = source.convert("RGBA").resize((content_size, content_size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    offset = (canvas_size - content_size) // 2
    canvas.alpha_composite(resized, (offset, offset))
    return canvas


def main() -> None:
    with Image.open(SOURCE) as image:
        safe_icon = render_safe_zone_icon(image)
    for target in TARGETS:
        safe_icon.save(target, optimize=True)
        print(f"Wrote {target}")


if __name__ == "__main__":
    main()
