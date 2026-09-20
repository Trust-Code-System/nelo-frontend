"""Cut the Linear Summer campaign figures out of the red studio backdrop.

Uses rembg (u2net_human_seg) with alpha matting for clean hair/hem edges,
trims to the subject, then normalises every figure onto a fixed transparent
canvas (bottom-aligned, identical figure height) so the hero procession can
size them with object-fit:contain and every model stands at the same
relative height on the plain backdrop.

Run: python scripts/cutout-campaign.py
"""

from pathlib import Path

from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "catalogue" / "cutouts"

CANVAS_W, CANVAS_H = 1000, 1400
SUBJECT_H = 1300  # every figure is scaled to this pixel height
BOTTOM_MARGIN = 24  # feet sit this far above the canvas floor

# Full-length frames only - portrait details would read at a different scale
# once the backdrop is gone, so the procession keeps one framing grammar.
LOOKS = [
    ("tokyo", "01"),
    ("tokyo", "03"),
    ("santorini", "01"),
    ("bloom", "02"),
    ("bloom", "01"),
    ("bloom", "03"),
    ("reign", "01"),
    ("reign", "02"),
    # The polka capsule joins the runway (added for the fuller procession).
    ("midnight-jewel", "01"),
    ("monaco", "01"),
    ("adele", "01"),
    ("havana", "01"),
    ("majesty", "01"),
    ("iris", "01"),
    ("velora", "01"),
]


def main() -> None:
    session = new_session("u2net_human_seg")
    OUT.mkdir(parents=True, exist_ok=True)

    for name, idx in LOOKS:
        src = ROOT / "public" / "catalogue" / name / f"{idx}.jpg"
        dest = OUT / f"{name}-{idx}.webp"
        if dest.exists():
            print(f"{dest.name}: exists, skipping")
            continue
        img = Image.open(src).convert("RGB")
        if max(img.size) > 1400:
            img.thumbnail((1400, 1400), Image.LANCZOS)

        cut = remove(
            img,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=242,
            alpha_matting_background_threshold=8,
            alpha_matting_erode_size=11,
        )

        bbox = cut.getchannel("A").getbbox()
        if bbox:
            cut = cut.crop(bbox)

        scale = SUBJECT_H / cut.height
        subject = cut.resize((round(cut.width * scale), SUBJECT_H), Image.LANCZOS)

        canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
        x = (CANVAS_W - subject.width) // 2
        y = CANVAS_H - BOTTOM_MARGIN - subject.height
        canvas.alpha_composite(subject, (x, y))

        canvas.save(dest, "WEBP", quality=92, method=6)
        print(f"{dest.name}: subject {cut.width}x{cut.height}")


if __name__ == "__main__":
    main()
