from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np


SOURCE = Path(__file__).resolve().parents[1] / "shield-reference.png"
OUT_DIR = Path(__file__).resolve().parent / "enemies" / "shields"
PREVIEW = OUT_DIR / "preview.png"
MANIFEST = OUT_DIR / "manifest.json"

PAD = 14
FG_THRESHOLD = 40
MIN_COMPONENT_AREA = 120

# Segment split by polar angle around the image center.
# Angles use np.arctan2(y-cy, x-cx) in degrees [-180, 180].
SEGMENTS = [
    ("shield_void", 136.0, -112.0, (130, 170)),
    ("shield_amber", -112.0, -8.0, (15, 45)),
    ("shield_azure", -8.0, 136.0, (85, 115)),
]


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


def largest_component_bbox(mask: np.ndarray) -> tuple[int, int, int, int]:
    n_labels, _, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    best = None
    for i in range(1, n_labels):
        x, y, w, h, area = stats[i]
        if area < 200:
            continue
        if best is None or area > best[0]:
            best = (int(area), int(x), int(y), int(x + w), int(y + h))
    if best is None:
        raise RuntimeError("Could not isolate shield segment component")
    return best[1], best[2], best[3], best[4]


def angle_mask(angles: np.ndarray, start_deg: float, end_deg: float) -> np.ndarray:
    if start_deg <= end_deg:
        return (angles >= start_deg) & (angles <= end_deg)
    return (angles >= start_deg) | (angles <= end_deg)


def keep_components(mask: np.ndarray, min_area: int) -> np.ndarray:
    labels_count, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    out = np.zeros(mask.shape, dtype=np.uint8)
    for i in range(1, labels_count):
        area = int(stats[i, cv2.CC_STAT_AREA])
        if area < min_area:
            continue
        out[labels == i] = 255
    return out


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

    canvas = np.zeros((tile_h, tile_w * cols, 4), dtype=np.uint8)
    for idx, img in enumerate(images):
        if img.shape[2] == 3:
            alpha_full = np.full((img.shape[0], img.shape[1], 1), 255, dtype=np.uint8)
            img = np.dstack([img, alpha_full])
        y0 = (tile_h - img.shape[0]) // 2
        x0 = idx * tile_w + (tile_w - img.shape[1]) // 2
        roi = canvas[y0:y0 + img.shape[0], x0:x0 + img.shape[1]]
        src_alpha = img[:, :, 3:4].astype(np.float32) / 255.0
        dst_alpha = roi[:, :, 3:4].astype(np.float32) / 255.0
        out_alpha = src_alpha + dst_alpha * (1.0 - src_alpha)
        out_alpha_safe = np.maximum(out_alpha, 1e-6)
        roi[:, :, :3] = (
            (img[:, :, :3].astype(np.float32) * src_alpha + roi[:, :, :3].astype(np.float32) * dst_alpha * (1.0 - src_alpha))
            / out_alpha_safe
        ).astype(np.uint8)
        roi[:, :, 3:4] = (out_alpha * 255.0).astype(np.uint8)

    cv2.imwrite(str(out_path), canvas)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing source image: {SOURCE}")

    src = cv2.imread(str(SOURCE), cv2.IMREAD_COLOR)
    if src is None:
        raise RuntimeError(f"Could not read image: {SOURCE}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    img_h, img_w = src.shape[:2]
    cy = img_h / 2.0
    cx = img_w / 2.0
    yy, xx = np.mgrid[0:img_h, 0:img_w]
    angles = np.degrees(np.arctan2(yy - cy, xx - cx))
    fg = (src.max(axis=2) > FG_THRESHOLD).astype(np.uint8)
    hsv = cv2.cvtColor(src, cv2.COLOR_BGR2HSV)
    h_channel, s_channel, v_channel = cv2.split(hsv)

    manifest: list[dict[str, object]] = []
    written: list[Path] = []

    for name, a0, a1, (h0, h1) in SEGMENTS:
        sector = angle_mask(angles, a0, a1)
        color = (h_channel >= h0) & (h_channel <= h1) & (s_channel >= 70) & (v_channel >= 40)

        seed = (fg > 0) & sector & color
        cleaned = keep_components(seed, MIN_COMPONENT_AREA)
        if not np.any(cleaned):
            raise RuntimeError(f"Could not isolate {name}")

        # Expand from hue-seeded pixels to include neutral highlights and edge glow.
        expanded = cv2.dilate(cleaned, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)), iterations=1) > 0
        neutral = (s_channel < 68) & (v_channel >= 42)
        final_mask = ((fg > 0) & sector & expanded & (color | neutral)).astype(np.uint8)
        final_mask = keep_components(final_mask, 40)
        x0, y0, x1, y1 = largest_component_bbox(final_mask > 0)
        px0, py0, px1, py1 = pad_bbox(x0, y0, x1, y1, img_w, img_h, PAD)
        crop_bgr = src[py0:py1, px0:px1]
        crop_expanded = expanded[py0:py1, px0:px1]
        crop_core = final_mask[py0:py1, px0:px1]

        # Soft alpha keeps glow while dropping checkerboard background.
        border = np.concatenate(
            [crop_bgr[0, :, :], crop_bgr[-1, :, :], crop_bgr[:, 0, :], crop_bgr[:, -1, :]],
            axis=0,
        ).astype(np.float32)
        bg = np.median(border, axis=0)
        diff = np.linalg.norm(crop_bgr.astype(np.float32) - bg, axis=2)
        maxc = crop_bgr.max(axis=2).astype(np.float32)
        alpha_luma = np.clip((maxc - 38.0) * 7.0, 0.0, 255.0)
        alpha_diff = np.clip((diff - 18.0) * 9.0, 0.0, 255.0)
        alpha_soft = np.maximum(alpha_luma, alpha_diff)
        alpha_soft[crop_expanded == 0] = 0.0
        alpha = np.maximum(alpha_soft.astype(np.uint8), (crop_core > 0).astype(np.uint8) * 255)

        crop_bgr = crop_bgr.copy()
        crop_bgr[alpha == 0] = 0
        crop = np.dstack([crop_bgr, alpha])

        out_path = OUT_DIR / f"{name}.png"
        cv2.imwrite(str(out_path), crop)
        written.append(out_path)

        manifest.append(
            {
                "name": name,
                "file": str(out_path.relative_to(SOURCE.parent)),
                "bbox_source": {"x0": px0, "y0": py0, "x1": px1, "y1": py1},
                "angle_range": {"start_deg": a0, "end_deg": a1},
                "hue_range": {"h0": h0, "h1": h1},
                "size": {"width": int(crop.shape[1]), "height": int(crop.shape[0])},
            }
        )

    build_preview(written, PREVIEW)
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"Wrote {len(written)} shield sprites to {OUT_DIR}")
    print(f"Manifest: {MANIFEST}")
    print(f"Preview: {PREVIEW}")


if __name__ == "__main__":
    main()
