from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np


SOURCE = Path(__file__).resolve().parents[1] / "minion-reference.png"
OUT_DIR = Path(__file__).resolve().parent / "enemies" / "minions"
PREVIEW = OUT_DIR / "preview.png"
MANIFEST = OUT_DIR / "manifest.json"

THRESHOLD = 40
MIN_COMPONENT_AREA = 20_000
PAD = 14

# Left-to-right order.
NAMES = ["minion_void", "minion_azure", "minion_amber"]


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


def pad_bbox(
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    max_w: int,
    max_h: int,
    pad: int,
) -> tuple[int, int, int, int]:
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

    cols = len(images)
    max_h = max(img.shape[0] for img in images)
    max_w = max(img.shape[1] for img in images)
    tile_h = max_h + 24
    tile_w = max_w + 24

    canvas = np.zeros((tile_h, tile_w * cols, 3), dtype=np.uint8)
    for idx, img in enumerate(images):
        y0 = (tile_h - img.shape[0]) // 2
        x0 = idx * tile_w + (tile_w - img.shape[1]) // 2
        canvas[y0:y0 + img.shape[0], x0:x0 + img.shape[1]] = img[:, :, :3]

    cv2.imwrite(str(out_path), canvas)


def find_minion_components(src_bgr: np.ndarray) -> list[tuple[int, int, int, int]]:
    mask = (src_bgr.max(axis=2) > THRESHOLD).astype(np.uint8)
    n_labels, _, stats, centroids = cv2.connectedComponentsWithStats(mask, 8)

    comps: list[tuple[float, int, int, int, int]] = []
    for i in range(1, n_labels):
        x, y, w, h, area = stats[i]
        if area < MIN_COMPONENT_AREA:
            continue
        cx = float(centroids[i][0])
        comps.append((cx, int(x), int(y), int(x + w), int(y + h)))

    comps.sort(key=lambda item: item[0])
    return [(x0, y0, x1, y1) for _, x0, y0, x1, y1 in comps[:3]]


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing source image: {SOURCE}")

    src = cv2.imread(str(SOURCE), cv2.IMREAD_COLOR)
    if src is None:
        raise RuntimeError(f"Could not read image: {SOURCE}")

    boxes = find_minion_components(src)
    if len(boxes) != 3:
        raise RuntimeError(f"Expected 3 minion components, found {len(boxes)}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    h, w = src.shape[:2]
    manifest: list[dict[str, object]] = []
    written: list[Path] = []

    for name, (x0, y0, x1, y1) in zip(NAMES, boxes):
        px0, py0, px1, py1 = pad_bbox(x0, y0, x1, y1, w, h, PAD)
        crop_rgb = src[py0:py1, px0:px1]
        alpha = make_alpha(crop_rgb)
        crop = np.dstack([crop_rgb, alpha])
        crop[:, :, :3][alpha == 0] = 0

        out_path = OUT_DIR / f"{name}.png"
        cv2.imwrite(str(out_path), crop)
        written.append(out_path)

        manifest.append(
            {
                "name": name,
                "file": str(out_path.relative_to(SOURCE.parent)),
                "bbox_source": {"x0": px0, "y0": py0, "x1": px1, "y1": py1},
                "size": {"width": int(crop.shape[1]), "height": int(crop.shape[0])},
            }
        )

    build_preview(written, PREVIEW)
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"Wrote {len(written)} minion sprites to {OUT_DIR}")
    print(f"Manifest: {MANIFEST}")
    print(f"Preview: {PREVIEW}")


if __name__ == "__main__":
    main()
