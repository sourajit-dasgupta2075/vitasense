from __future__ import annotations

import numpy as np


def smooth_camera_bpm(signal: list[float]) -> float:
    """Small helper for future backend refinement of camera-derived pulse signals."""
    if not signal:
        return 0.0

    values = np.asarray(signal, dtype=float)
    if values.size < 3:
        return float(np.mean(values))

    kernel = np.array([0.2, 0.6, 0.2])
    smoothed = np.convolve(values, kernel, mode="same")
    return float(np.mean(smoothed))
