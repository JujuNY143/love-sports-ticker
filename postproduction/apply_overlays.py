#!/usr/bin/env python3
"""
Burns team-colored title cards, a persistent "matchup bug," and stat/pick callouts
into a talking-head video, driven by a simple CSV timeline instead of hand-written
ffmpeg filters per video.

Usage:
    python3 apply_overlays.py input.mp4 output.mp4
    python3 apply_overlays.py input.mp4 output.mp4 --dry-run   # just print the ffmpeg command
    python3 apply_overlays.py input.mp4 output.mp4 --font /path/to/font.ttf

Requires: ffmpeg on PATH (test with `ffmpeg -version`). No team logo images are used —
everything is drawn from team_colors.json, which avoids any trademark/logo licensing
question entirely.

Positions below assume a 1920x1080 video. If yours is a different resolution, pass
--scale (e.g. --scale 0.667 for a 1280x720 video, --scale 2.0 for 4K) and every box/
text position scales with it.
"""
import argparse
import csv
import json
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]

# Pixel geometry, designed for 1920x1080. --scale multiplies all of it.
TITLE_CARD = {"y": 60, "h": 140, "title_y": 100, "subtitle_y": 155}
CORNER_BUG = {"w": 420, "h": 70, "margin": 30}
CALLOUT = {"x": 40, "y": 800, "w": 760, "h": 160, "title_y": 840, "subtitle_y": 895}
CALLOUT_DURATION = 8  # seconds a callout stays on screen, regardless of its CSV `end`


def escape_drawtext(s: str) -> str:
    return s.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'").replace("%", "\\%")


def find_font(explicit: str | None) -> str:
    if explicit:
        return explicit
    for candidate in FONT_CANDIDATES:
        if Path(candidate).exists():
            return candidate
    sys.exit(
        "No font found automatically. Pass --font /path/to/a/bold/ttf/file.ttf "
        "(any bold TrueType/OpenType font on your system works)."
    )


def load_colors(path: Path) -> dict:
    return json.loads(path.read_text())


def team_color(colors: dict, name: str, which: str) -> str:
    if not name:
        return "#000000"
    entry = colors.get(name.strip().upper())
    if not entry:
        sys.exit(f"Unknown team '{name}' — add it to team_colors.json first.")
    return entry[which]


def build_filters(rows: list[dict], colors: dict, font: str, scale: float) -> str:
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
        start = float(row["start"])
        end = float(row["end"])
        kind = row["kind"].strip()
        t1, t2 = row.get("team1", "").strip(), row.get("team2", "").strip()
        title, subtitle = row.get("title", ""), row.get("subtitle", "")

        if kind == "title_card":
            box_y, box_h = s(TITLE_CARD["y"]), s(TITLE_CARD["h"])
            primary = team_color(colors, t1, "primary")
            secondary = team_color(colors, t2, "secondary") if t2 else team_color(colors, t1, "secondary")
            enable = f"between(t,{start},{end})"
            out1 = next_label()
            filters.append(
                f"[{label}]drawbox=x=0:y={box_y}:w=iw/2:h={box_h}:color={primary}@0.85:t=fill:"
                f"enable='{enable}'[{out1}]"
            )
            label = out1
            out2 = next_label()
            filters.append(
                f"[{label}]drawbox=x=iw/2:y={box_y}:w=iw/2:h={box_h}:color={secondary}@0.85:t=fill:"
                f"enable='{enable}'[{out2}]"
            )
            label = out2
            out3 = next_label()
            filters.append(
                f"[{label}]drawtext=fontfile='{font}':text='{escape_drawtext(title)}':"
                f"fontcolor=white:fontsize={s(52)}:x=(w-text_w)/2:y={s(TITLE_CARD['title_y'])}:"
                f"enable='{enable}'[{out3}]"
            )
            label = out3
            if subtitle:
                out4 = next_label()
                filters.append(
                    f"[{label}]drawtext=fontfile='{font}':text='{escape_drawtext(subtitle)}':"
                    f"fontcolor=white:fontsize={s(30)}:x=(w-text_w)/2:y={s(TITLE_CARD['subtitle_y'])}:"
                    f"enable='{enable}'[{out4}]"
                )
                label = out4

        elif kind == "corner_bug":
            w, h, margin = s(CORNER_BUG["w"]), s(CORNER_BUG["h"]), s(CORNER_BUG["margin"])
            primary = team_color(colors, t1, "primary")
            secondary = team_color(colors, t2, "secondary") if t2 else team_color(colors, t1, "secondary")
            enable = f"between(t,{start},{end})"
            out1 = next_label()
            filters.append(
                f"[{label}]drawbox=x=iw-{w}-{margin}:y=ih-{h}-{margin}:w={w}/2:h={h}:color={primary}@0.9:"
                f"t=fill:enable='{enable}'[{out1}]"
            )
            label = out1
            out2 = next_label()
            filters.append(
                f"[{label}]drawbox=x=iw-{w // 2}-{margin}:y=ih-{h}-{margin}:w={w}/2:h={h}:color={secondary}@0.9:"
                f"t=fill:enable='{enable}'[{out2}]"
            )
            label = out2
            out3 = next_label()
            filters.append(
                f"[{label}]drawtext=fontfile='{font}':text='{escape_drawtext(title)}':"
                f"fontcolor=white:fontsize={s(22)}:x=w-{w}-{margin}+({w}-text_w)/2:y=h-{h}-{margin}+({h}-text_h)/2:"
                f"enable='{enable}'[{out3}]"
            )
            label = out3

        elif kind == "callout":
            x, y, w, h = s(CALLOUT["x"]), s(CALLOUT["y"]), s(CALLOUT["w"]), s(CALLOUT["h"])
            callout_end = min(end, start + CALLOUT_DURATION)
            primary = team_color(colors, t1, "primary")
            enable = f"between(t,{start},{callout_end})"
            out1 = next_label()
            filters.append(
                f"[{label}]drawbox=x={x}:y={y}:w={w}:h={h}:color={primary}@0.88:t=fill:"
                f"enable='{enable}'[{out1}]"
            )
            label = out1
            out2 = next_label()
            filters.append(
                f"[{label}]drawtext=fontfile='{font}':text='{escape_drawtext(title)}':"
                f"fontcolor=white:fontsize={s(30)}:x={x + s(20)}:y={s(CALLOUT['title_y'])}:"
                f"enable='{enable}'[{out2}]"
            )
            label = out2
            if subtitle:
                out3 = next_label()
                filters.append(
                    f"[{label}]drawtext=fontfile='{font}':text='{escape_drawtext(subtitle)}':"
                    f"fontcolor=white:fontsize={s(22)}:x={x + s(20)}:y={s(CALLOUT['subtitle_y'])}:"
                    f"enable='{enable}'[{out3}]"
                )
                label = out3
        else:
            sys.exit(f"Unknown overlay kind '{kind}' in overlay_plan.csv")

    filters.append(f"[{label}]null[vout]")
    return ";".join(filters)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="Input video file")
    parser.add_argument("output", help="Output video file")
    parser.add_argument("--plan", default=str(HERE / "overlay_plan.csv"))
    parser.add_argument("--colors", default=str(HERE / "team_colors.json"))
    parser.add_argument("--font", default=None)
    parser.add_argument("--scale", type=float, default=1.0, help="1.0 for 1920x1080, 0.667 for 720p, 2.0 for 4K, etc.")
    parser.add_argument("--dry-run", action="store_true", help="Print the ffmpeg command instead of running it")
    args = parser.parse_args()

    if not shutil.which("ffmpeg") and not args.dry_run:
        sys.exit("ffmpeg not found on PATH. Install it (e.g. `brew install ffmpeg` on Mac) or pass --dry-run.")

    font = find_font(args.font)
    colors = load_colors(Path(args.colors))
    with open(args.plan, newline="") as f:
        rows = list(csv.DictReader(f))

    filter_complex = build_filters(rows, colors, font, args.scale)

    cmd = [
        "ffmpeg", "-y", "-i", args.input,
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
