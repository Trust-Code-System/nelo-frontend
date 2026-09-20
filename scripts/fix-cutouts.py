"""Re-cut the three campaign figures whose first pass kept backdrop remnants
(majesty-01 red wall, santorini-01 white wall, midnight-jewel-01 floor).

Uses the isnet-general-use model (cleaner edges on studio backdrops than
u2net_human_seg), then keeps only alpha pixels that survive a confident
threshold, and finally re-runs the same normalisation as cutout-campaign.py
so the replacement frames land on the identical canvas.

Run: python scripts/fix-cutouts.py
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "catalogue" / "cutouts"

CANVAS_W, CANVAS_H = 1000, 1400
SUBJECT_H = 1300
BOTTOM_MARGIN = 24

FIX = [
    ("majesty", "01"),
    ("santorini", "01"),
    ("midnight-jewel", "01"),
]


def main() -> None:
    session = new_session("isnet-general-use")

    for name, idx in FIX:
        src = ROOT / "public" / "catalogue" / name / f"{idx}.jpg"
        dest = OUT / f"{name}-{idx}.webp"
        img = Image.open(src).convert("RGB")
        if max(img.size) > 1400:
            img.thumbnail((1400, 1400), Image.LANCZOS)

        cut = remove(img, session=session)

        # Tighten the matte: drop faint halo pixels outright, then erode the
        # edge a touch so no backdrop fringe survives.
        alpha = np.asarray(cut.getchannel("A"), dtype=np.uint8)
        alpha = np.where(alpha < 40, 0, alpha).astype(np.uint8)
        cut.putalpha(Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)))

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
