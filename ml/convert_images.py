"""
Utility script for converting Google Quick, Draw! NDJSON files into rasterized
64x64 grayscale PNG images. Each NDJSON file is processed in a dedicated
process, making the conversion fast even for large datasets.

The script expects the following directory layout:

original_datasets/
    class_a.ndjson
    class_b.ndjson
    ...

It will generate:

image_doodle_dataset/
    class_a/
        class_a_000000.png
        class_a_000001.png
        ...
    class_b/
        ...

Configuration is intentionally simple: adjust the constants defined below to
control the input directory, output directory, and the maximum number of images
per class.
"""

from __future__ import annotations

import json
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from typing import List, Optional, Sequence, Tuple

from PIL import Image, ImageDraw

# --------------------------------------------------------------------------- #
# Configuration                                                               #
# --------------------------------------------------------------------------- #

input_dir = Path("original_datasets")
output_dir = Path("image_doodle_dataset")
max_per_class = 20000  # Increase/decrease to control images exported per class.

CANVAS_SIZE = 64
PADDING = 2
LINE_WIDTH = 3

# Type aliases for readability.
RawStroke = Sequence[Sequence[float]]
RawDrawing = Sequence[RawStroke]
NormalizedStroke = List[Tuple[float, float]]
NormalizedDrawing = List[NormalizedStroke]


# --------------------------------------------------------------------------- #
# Rasterization helpers                                                       #
# --------------------------------------------------------------------------- #


def normalize_drawing(raw_drawing: RawDrawing) -> Optional[NormalizedDrawing]:
    """
    Normalize raw stroke data so that it fits into a 64x64 canvas with padding.

    Args:
        raw_drawing: A drawing as provided by the Quick, Draw! dataset. Each
            stroke is a pair of lists (xs, ys).

    Returns:
        A list of normalized strokes, where each stroke is a list of (x, y)
        tuples positioned inside the target canvas. Returns None if the drawing
        is empty or malformed.
    """
    if not isinstance(raw_drawing, Sequence):
        return None

    x_coords: List[float] = []
    y_coords: List[float] = []

    # First pass: collect bounding box.
    for stroke in raw_drawing:
        if not isinstance(stroke, Sequence) or len(stroke) != 2:
            continue
        xs, ys = stroke
        if not xs or not ys:
            continue
        x_coords.extend(xs)
        y_coords.extend(ys)

    if not x_coords or not y_coords:
        return None

    min_x, max_x = min(x_coords), max(x_coords)
    min_y, max_y = min(y_coords), max(y_coords)

    width = max_x - min_x
    height = max_y - min_y
    span = max(width, height, 1.0)  # Avoid division by zero.

    target_span = CANVAS_SIZE - 2 * PADDING
    scale = target_span / span

    # Center the drawing within the padded area.
    translated_width = width * scale
    translated_height = height * scale
    offset_x = PADDING + (target_span - translated_width) / 2.0
    offset_y = PADDING + (target_span - translated_height) / 2.0

    normalized: NormalizedDrawing = []
    for stroke in raw_drawing:
        if not isinstance(stroke, Sequence) or len(stroke) != 2:
            normalized.append([])
            continue
        xs, ys = stroke
        coords = [
            (
                (float(x) - min_x) * scale + offset_x,
                (float(y) - min_y) * scale + offset_y,
            )
            for x, y in zip(xs, ys)
        ]
        normalized.append(coords)

    return normalized


def render_drawing(normalized: NormalizedDrawing) -> Image.Image:
    """
    Render normalized strokes onto a grayscale PIL image.

    Args:
        normalized: A list of strokes with coordinates already transformed to
            canvas space.

    Returns:
        A Pillow Image object containing the rasterized drawing.
    """
    image = Image.new("L", (CANVAS_SIZE, CANVAS_SIZE), color=255)
    draw = ImageDraw.Draw(image)
    radius = LINE_WIDTH / 2.0

    for stroke in normalized:
        if not stroke:
            continue
        if len(stroke) == 1:
            x, y = stroke[0]
            draw.ellipse(
                (x - radius, y - radius, x + radius, y + radius),
                fill=0,
                outline=0,
            )
        else:
            draw.line(stroke, fill=0, width=LINE_WIDTH, joint="curve")

    return image


# --------------------------------------------------------------------------- #
# Processing logic                                                            #
# --------------------------------------------------------------------------- #


def process_class_file(ndjson_path: Path) -> Tuple[str, int, int]:
    """
    Convert a single NDJSON file (one drawing class) into PNG images.

    Args:
        ndjson_path: Path to the class NDJSON file.

    Returns:
        A tuple of (class_name, saved_count, skipped_count).
    """
    class_name = ndjson_path.stem
    class_output_dir = output_dir / class_name
    class_output_dir.mkdir(parents=True, exist_ok=True)

    saved = 0
    skipped = 0

    with ndjson_path.open("r", encoding="utf-8") as source:
        for line in source:
            if saved >= max_per_class:
                break

            line = line.strip()
            if not line:
                continue

            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                skipped += 1
                continue

            drawing = record.get("drawing")
            normalized = normalize_drawing(drawing)
            if not normalized:
                skipped += 1
                continue

            image = render_drawing(normalized)
            filename = f"{class_name}_{saved:06d}.png"
            image.save(class_output_dir / filename, format="PNG")
            saved += 1

    return class_name, saved, skipped


def main() -> None:
    """
    Entry point for the conversion process.
    """
    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    ndjson_files = sorted(input_dir.glob("*.ndjson"))
    if not ndjson_files:
        print(f"No .ndjson files found in '{input_dir}'. Nothing to do.")
        return

    print(
        f"Processing {len(ndjson_files)} classes with up to "
        f"{max_per_class} images per class..."
    )

    with ProcessPoolExecutor() as executor:
        for class_name, saved, skipped in executor.map(
            process_class_file, ndjson_files
        ):
            print(
                f"[{class_name}] saved {saved:>6} images "
                f"(skipped {skipped:>4} records)"
            )

    print("Conversion complete. Images stored in", output_dir)


if __name__ == "__main__":
    main()