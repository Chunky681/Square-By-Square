from pathlib import Path

import cv2
import numpy as np


SOURCE = Path(__file__).with_name("currency-icons.png")
OUT_DIR = Path(__file__).with_name("currency")


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

    alpha_luma = np.clip((maxc - 28.0) * 5.5, 0.0, 255.0)
    alpha_diff = np.clip((diff - 16.0) * 9.0, 0.0, 255.0)
    alpha = np.maximum(alpha_luma, alpha_diff).astype(np.uint8)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 0.7)
    return alpha


def tight_bbox(image_bgr: np.ndarray) -> tuple[int, int, int, int]:
    mask = (image_bgr.max(axis=2) > 14).astype(np.uint8)
    ys, xs = np.where(mask > 0)
    if ys.size == 0 or xs.size == 0:
        return (0, 0, image_bgr.shape[1], image_bgr.shape[0])
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    return (x0, y0, x1, y1)


def extract() -> None:
    src = cv2.imread(str(SOURCE), cv2.IMREAD_UNCHANGED)
    if src is None:
        raise FileNotFoundError(f"Missing source file: {SOURCE}")
    bgr = src[:, :, :3] if src.shape[2] == 4 else src

    h, w = bgr.shape[:2]
    mx, my = w // 2, h // 2
    quadrants = {
        "essence": (0, 0, mx, my),       # green (top-left)
        "azure": (mx, 0, w, my),         # blue (top-right)
        "amber": (0, my, mx, h),         # orange (bottom-left)
        "void": (mx, my, w, h),          # purple (bottom-right)
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for name, (x0, y0, x1, y1) in quadrants.items():
        quad = bgr[y0:y1, x0:x1]
        bx0, by0, bx1, by1 = tight_bbox(quad)
        pad = 16
        cx0 = max(0, bx0 - pad)
        cy0 = max(0, by0 - pad)
        cx1 = min(quad.shape[1], bx1 + pad)
        cy1 = min(quad.shape[0], by1 + pad)

        crop = quad[cy0:cy1, cx0:cx1]
        alpha = make_alpha(crop)
        out = np.dstack([crop, alpha])

        out_path = OUT_DIR / f"{name}.png"
        cv2.imwrite(str(out_path), out)
        print(f"Wrote {out_path}")


if __name__ == "__main__":
    extract()
