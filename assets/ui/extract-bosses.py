from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np


SOURCE = Path(__file__).resolve().parents[1] / "boss-reference.png"
OUT_DIR = Path(__file__).resolve().parent / "enemies" / "bosses"
PREVIEW = OUT_DIR / "preview.png"
MANIFEST = OUT_DIR / "manifest.json"

# Name, row, col in a 2x2 layout.
BOSSES = [
    ("boss_top_left", 0, 0),
    ("boss_top_right", 0, 1),
    ("boss_bottom_left", 1, 0),
    ("boss_bottom_right", 1, 1),
]

GRID_ROWS = 2
GRID_COLS = 2
FG_THRESHOLD = 40
PAD = 14


def make_alpha(rgb: np.ndarray) -> np.ndarray:
    maxc = rgb.max(axis=2).astype(np.float32)
    border = np.concatenate(
        [
            rgb[0, :, :],
            rgb[-1, :, :],
            rgb[:, 0, :],
            rgb[:, -1, :],
        ],
        axis=0,
    ).astype(np.float32)
    bg = np.median(border, axis=0)
    diff = np.linalg.norm(rgb.astype(np.float32) - bg, axis=2)

    alpha_luma = np.clip((maxc - 32.0) * 7.0, 0.0, 255.0)
    alpha_diff = np.clip((diff - 18.0) * 9.0, 0.0, 255.0)
    alpha = np.maximum(alpha_luma, alpha_diff).astype(np.uint8)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 0.7)
    return alpha


def get_cell_rect(width: int, height: int, row: int, col: int) -> tuple[int, int, int, int]:
    cell_w = width // GRID_COLS
    cell_h = height // GRID_ROWS
    x0 = col * cell_w
    y0 = row * cell_h
    x1 = width if col == GRID_COLS - 1 else x0 + cell_w
    y1 = height if row == GRID_ROWS - 1 else y0 + cell_h
    return x0, y0, x1, y1


def tight_foreground_bbox(image_bgr: np.ndarray, threshold: int) -> tuple[int, int, int, int]:
    mask = (image_bgr.max(axis=2) > threshold).astype(np.uint8)
    ys, xs = np.where(mask > 0)
    if ys.size == 0 or xs.size == 0:
        return 0, 0, image_bgr.shape[1], image_bgr.shape[0]
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    return x0, y0, x1, y1


def pad_bbox(x0: int, y0: int, x1: int, y1: int, max_w: int, max_h: int, pad: int) -> tuple[int, int, int, int]:
    return (
        max(0, x0 - pad),
        max(0, y0 - pad),
        min(max_w, x1 + pad),
        min(max_h, y1 + pad),
    )


def build_preview(image_paths: list[Path], out_path: Path) -> None:
    images = [cv2.imread(str(p), cv2.IMREAD_UNCHANGED) for p in image_paths]
    images = [img for img in images if img is not None]
    if not images:
        return

    max_h = max(img.shape[0] for img in images)
    max_w = max(img.shape[1] for img in images)
    tile_h = max_h + 24
    tile_w = max_w + 24

    canvas = np.zeros((tile_h * GRID_ROWS, tile_w * GRID_COLS, 3), dtype=np.uint8)
    for idx, img in enumerate(images):
        row = idx // GRID_COLS
        col = idx % GRID_COLS
        y0 = row * tile_h + (tile_h - img.shape[0]) // 2
        x0 = col * tile_w + (tile_w - img.shape[1]) // 2
        canvas[y0:y0 + img.shape[0], x0:x0 + img.shape[1]] = img[:, :, :3]

    cv2.imwrite(str(out_path), canvas)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing source image: {SOURCE}")

    src = cv2.imread(str(SOURCE), cv2.IMREAD_COLOR)
    if src is None:
        raise RuntimeError(f"Could not read image: {SOURCE}")

    out_dir = OUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    h, w = src.shape[:2]
    manifest: list[dict[str, object]] = []
    written: list[Path] = []

    for name, row, col in BOSSES:
        cx0, cy0, cx1, cy1 = get_cell_rect(w, h, row, col)
        cell = src[cy0:cy1, cx0:cx1]

        bx0, by0, bx1, by1 = tight_foreground_bbox(cell, FG_THRESHOLD)
        px0, py0, px1, py1 = pad_bbox(bx0, by0, bx1, by1, cell.shape[1], cell.shape[0], PAD)

        crop_rgb = cell[py0:py1, px0:px1]
        alpha = make_alpha(crop_rgb)
        crop = np.dstack([crop_rgb, alpha])
        crop[:, :, :3][alpha == 0] = 0
        out_path = out_dir / f"{name}.png"
        cv2.imwrite(str(out_path), crop)
        written.append(out_path)

        manifest.append(
            {
                "name": name,
                "file": str(out_path.relative_to(SOURCE.parent)),
                "grid_row": row,
                "grid_col": col,
                "cell_rect": {"x0": cx0, "y0": cy0, "x1": cx1, "y1": cy1},
                "crop_rect_in_cell": {"x0": px0, "y0": py0, "x1": px1, "y1": py1},
                "crop_rect_in_source": {
                    "x0": cx0 + px0,
                    "y0": cy0 + py0,
                    "x1": cx0 + px1,
                    "y1": cy0 + py1,
                },
                "size": {"width": int(crop.shape[1]), "height": int(crop.shape[0])},
            }
        )

    build_preview(written, PREVIEW)
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"Wrote {len(written)} boss sprites to {OUT_DIR}")
    print(f"Manifest: {MANIFEST}")
    print(f"Preview: {PREVIEW}")


if __name__ == "__main__":
    main()
