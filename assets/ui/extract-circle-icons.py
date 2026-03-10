import json
from pathlib import Path

import cv2
import numpy as np


SOURCE = Path(__file__).with_name("source-icons.png")
OUT_DIR = Path(__file__).with_name("icons")
PREVIEW = Path(__file__).with_name("icons-preview.png")
MANIFEST = Path(__file__).with_name("icons-manifest.json")

# Name, center X, center Y, radius
ICONS = [
    ("front_l_hammer", 97, 58, 20),
    ("top_flower", 152, 28, 20),
    ("top_crate", 221, 31, 22),
    ("right_up_green", 278, 58, 21),
    ("right_up_grid", 314, 117, 21),
    ("right_mid_hook", 335, 172, 20),
    ("right_low_shield", 316, 239, 21),
    ("back_r_plane", 269, 293, 19),
    ("back_core", 185, 316, 23),
    ("back_l_eye", 100, 292, 20),
    ("left_low_star", 55, 236, 22),
    ("left_mid_check", 33, 171, 19),
    ("left_up_purple", 56, 117, 21),
]


def extract_icon(src_bgra: np.ndarray, cx: int, cy: int, r: int, pad: int = 2) -> np.ndarray:
    size = 2 * (r + pad)
    left = cx - (r + pad)
    top = cy - (r + pad)

    out = np.zeros((size, size, 4), dtype=np.uint8)

    src_h, src_w = src_bgra.shape[:2]
    src_x0 = max(0, left)
    src_y0 = max(0, top)
    src_x1 = min(src_w, left + size)
    src_y1 = min(src_h, top + size)

    dst_x0 = src_x0 - left
    dst_y0 = src_y0 - top
    dst_x1 = dst_x0 + (src_x1 - src_x0)
    dst_y1 = dst_y0 + (src_y1 - src_y0)

    out[dst_y0:dst_y1, dst_x0:dst_x1] = src_bgra[src_y0:src_y1, src_x0:src_x1]

    yy, xx = np.mgrid[0:size, 0:size]
    center = (size - 1) / 2.0
    dist = np.sqrt((xx - center) ** 2 + (yy - center) ** 2)

    edge_start = r - 0.75
    edge_end = r + 0.75

    alpha = out[:, :, 3].astype(np.float32)
    alpha[dist > edge_end] = 0.0
    feather = (dist > edge_start) & (dist <= edge_end)
    alpha[feather] *= (edge_end - dist[feather]) / (edge_end - edge_start)
    out[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)

    return out


def build_preview(icon_files: list[Path], tile: int = 64, cols: int = 4) -> None:
    rows = (len(icon_files) + cols - 1) // cols
    canvas = np.zeros((rows * tile, cols * tile, 4), dtype=np.uint8)

    for idx, icon_path in enumerate(icon_files):
        icon = cv2.imread(str(icon_path), cv2.IMREAD_UNCHANGED)
        if icon is None:
            continue

        h, w = icon.shape[:2]
        scale = min((tile - 8) / max(h, 1), (tile - 8) / max(w, 1))
        resized = cv2.resize(icon, (max(1, int(w * scale)), max(1, int(h * scale))), interpolation=cv2.INTER_AREA)

        row = idx // cols
        col = idx % cols
        y0 = row * tile + (tile - resized.shape[0]) // 2
        x0 = col * tile + (tile - resized.shape[1]) // 2

        roi = canvas[y0:y0 + resized.shape[0], x0:x0 + resized.shape[1]]
        alpha = resized[:, :, 3:4].astype(np.float32) / 255.0
        roi[:, :, :3] = (resized[:, :, :3] * alpha + roi[:, :, :3] * (1 - alpha)).astype(np.uint8)
        roi[:, :, 3] = np.maximum(roi[:, :, 3], resized[:, :, 3])

    cv2.imwrite(str(PREVIEW), canvas)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing source image: {SOURCE}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    src = cv2.imread(str(SOURCE), cv2.IMREAD_UNCHANGED)
    if src is None:
        raise RuntimeError(f"Could not read image: {SOURCE}")

    if src.shape[2] == 3:
        src = cv2.cvtColor(src, cv2.COLOR_BGR2BGRA)

    manifest: list[dict] = []
    written: list[Path] = []

    for name, cx, cy, r in ICONS:
        cut = extract_icon(src, cx, cy, r)
        out_path = OUT_DIR / f"{name}.png"
        cv2.imwrite(str(out_path), cut)
        written.append(out_path)
        manifest.append({"name": name, "center_x": cx, "center_y": cy, "radius": r, "file": str(out_path.relative_to(SOURCE.parent))})

    build_preview(written)
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"Wrote {len(written)} icons to {OUT_DIR}")
    print(f"Preview: {PREVIEW}")
    print(f"Manifest: {MANIFEST}")


if __name__ == "__main__":
    main()
