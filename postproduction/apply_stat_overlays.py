#!/usr/bin/env python3
"""
Burns player/agent stat cards (photo + name + height/weight + dollar amount) and
contract-breakdown banners into a video, driven by a plain CSV timeline - same
pattern as apply_overlays.py, extended to composite real photo files instead of
drawing everything with shapes.

Usage:
    python3 apply_stat_overlays.py input.mp4 output.mp4
    python3 apply_stat_overlays.py input.mp4 output.mp4 --dry-run
    python3 apply_stat_overlays.py input.mp4 output.mp4 --scale 0.667   # for 720p source

Photos: put image files in postproduction/photos/ and reference just the filename
(e.g. "mahomes.jpg") in the CSV's image_path column - the script looks for them
there automatically.

CSV columns (postproduction/stat_overlay_plan.csv):
    start, end, kind, image_path, line1, line2, line3, notes

    kind = "player_card": shows the photo (image_path required) plus up to three
           lines of text next to it - typically name / height-weight / dollar amount.
    kind = "banner": a full-width lower banner, no photo - typically amount / contract
           breakdown detail. image_path is ignored for this kind.
"""
import argparse
import csv
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
PHOTOS_DIR = HERE / "photos"

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]

# Pixel geometry, designed for 1920x1080. --scale multiplies all of it.
CARD_PHOTO = {"x": 60, "y": 640, "size": 340}
CARD_TEXT_X = 430  # to the right of the photo
CARD_LINE_Y = [660, 720, 780]  # name, height/weight, dollar amount
CARD_LINE_SIZE = [40, 26, 46]
BANNER = {"x": 0, "y": 860, "w": 1920, "h": 160, "line_y": [900, 960]}


def escape_drawtext(s: str) -> str:
    return s.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'").replace("%", "\\%")


def find_font(explicit):
    if explicit:
        return explicit
    for candidate in FONT_CANDIDATES:
        if Path(candidate).exists():
            return candidate
    sys.exit("No font found automatically. Pass --font /path/to/a/bold/ttf/file.ttf.")


def resolve_photo(image_path: str) -> Path:
    p = Path(image_path)
    if p.is_absolute() and p.exists():
        return p
    candidate = PHOTOS_DIR / image_path
    if candidate.exists():
        return candidate
    sys.exit(f"Photo not found: '{image_path}' (looked in {PHOTOS_DIR}/). Put it there or use a full path.")


def build_filter_complex(rows, font: str, scale: float, photo_input_index: dict) -> str:
    def s(px):
        return round(px * scale)

    filters = []
    label = "0:v"
    idx = 0

    def next_label():
        nonlocal idx
        idx += 1
        return f"v{idx}"

    for row in rows:
        start, end = float(row["start"]), float(row["end"])
        kind = row["kind"].strip()
        enable = f"between(t,{start},{end})"
        lines = [row.get("line1", ""), row.get("line2", ""), row.get("line3", "")]

        if kind == "player_card":
            input_idx = photo_input_index[row["image_path"]]
            size = s(CARD_PHOTO["size"])
            x, y = s(CARD_PHOTO["x"]), s(CARD_PHOTO["y"])
            scaled_label = f"img{idx}"
            filters.append(f"[{input_idx}:v]scale={size}:{size}[{scaled_label}]")
            out1 = next_label()
            filters.append(f"[{label}][{scaled_label}]overlay=x={x}:y={y}:enable='{enable}'[{out1}]")
            label = out1

            text_x = s(CARD_TEXT_X)
            for line, line_y, line_size in zip(lines, CARD_LINE_Y, CARD_LINE_SIZE):
                if not line:
                    continue
                out = next_label()
                filters.append(
                    f"[{label}]drawtext=fontfile='{font}':text='{escape_drawtext(line)}':"
                    f"fontcolor=white:fontsize={s(line_size)}:x={text_x}:y={s(line_y)}:"
                    f"box=1:boxcolor=black@0.55:boxborderw={s(8)}:enable='{enable}'[{out}]"
                )
                label = out

        elif kind == "banner":
            x, y, w, h = s(BANNER["x"]), s(BANNER["y"]), s(BANNER["w"]), s(BANNER["h"])
            out1 = next_label()
            filters.append(
                f"[{label}]drawbox=x={x}:y={y}:w={w}:h={h}:color=black@0.7:t=fill:enable='{enable}'[{out1}]"
            )
            label = out1
            sizes = [56, 30]
            for line, line_y, line_size in zip(lines, BANNER["line_y"], sizes):
                if not line:
                    continue
                out = next_label()
                filters.append(
                    f"[{label}]drawtext=fontfile='{font}':text='{escape_drawtext(line)}':"
                    f"fontcolor=white:fontsize={s(line_size)}:x=(w-text_w)/2:y={s(line_y)}:"
                    f"enable='{enable}'[{out}]"
                )
                label = out
        else:
            sys.exit(f"Unknown overlay kind '{kind}' in stat_overlay_plan.csv")

    filters.append(f"[{label}]null[vout]")
    return ";".join(filters)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--plan", default=str(HERE / "stat_overlay_plan.csv"))
    parser.add_argument("--font", default=None)
    parser.add_argument("--scale", type=float, default=1.0)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not shutil.which("ffmpeg") and not args.dry_run:
        sys.exit("ffmpeg not found on PATH. Install it (e.g. `brew install ffmpeg` on Mac) or pass --dry-run.")

    font = find_font(args.font)
    with open(args.plan, newline="") as f:
        rows = list(csv.DictReader(f))

    # Every unique photo becomes its own ffmpeg input, in order of first appearance.
    photo_paths = []
    photo_input_index = {}
    for row in rows:
        if row["kind"].strip() == "player_card":
            img = row["image_path"].strip()
            if img not in photo_input_index:
                resolved = resolve_photo(img)
                photo_input_index[img] = 1 + len(photo_paths)  # input 0 is the main video
                photo_paths.append(resolved)

    filter_complex = build_filter_complex(rows, font, args.scale, photo_input_index)

    cmd = ["ffmpeg", "-y", "-i", args.input]
    for p in photo_paths:
        cmd += ["-i", str(p)]
    cmd += [
        "-filter_complex", filter_complex,
        "-map", "[vout]", "-map", "0:a?",
        "-c:v", "libx264", "-crf", "18", "-preset", "veryfast",
        "-c:a", "copy",
        args.output,
    ]

    if args.dry_run:
        print(" ".join(f'"{c}"' if " " in c else c for c in cmd))
        return

    print(f"Rendering {args.output} ...")
    subprocess.run(cmd, check=True)
    print("Done.")


if __name__ == "__main__":
    main()
