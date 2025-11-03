from __future__ import annotations

import argparse
import base64
import binascii
import io
import json
from functools import lru_cache
from pathlib import Path
from typing import Sequence

import torch
from PIL import Image
from torch import nn
from torch.nn import functional as F

CLASS_NAMES: Sequence[str] = (
    "axe",
    "bicycle",
    "bucket",
    "cloud",
    "door",
    "microphone",
)

_MODEL_FILENAME = "doodle_classifier.pth"
_IMAGE_SIZE = (64, 64)


class DoodleClassifier(nn.Module):
    """Convolutional classifier used during model training."""

    def __init__(self, num_classes: int = len(CLASS_NAMES), in_channels: int = 1) -> None:
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(in_channels, 32, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.Conv2d(32, 32, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Dropout(0.25),
            nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Dropout(0.25),
        )
        self.gap = nn.AdaptiveAvgPool2d(1)
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.4),
            nn.Linear(128, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = self.gap(x)
        return self.classifier(x)


def _model_path() -> Path:
    return Path(__file__).resolve().parent / "models" / _MODEL_FILENAME


def _load_state_dict(model: nn.Module, state: dict[str, torch.Tensor]) -> None:
    """Load weights saved in a few common torch.save formats."""
    if "state_dict" in state and isinstance(state["state_dict"], dict):
        state = state["state_dict"]  # type: ignore[assignment]
    elif "model_state_dict" in state and isinstance(state["model_state_dict"], dict):
        state = state["model_state_dict"]  # type: ignore[assignment]
    model.load_state_dict(state)  # type: ignore[arg-type]


@lru_cache(maxsize=1)
def get_model() -> nn.Module:
    model = DoodleClassifier()
    path = _model_path()
    checkpoint = torch.load(path, map_location=torch.device("cpu"))
    if isinstance(checkpoint, dict):
        _load_state_dict(model, checkpoint)  # type: ignore[arg-type]
    else:
        model.load_state_dict(checkpoint)
    model.eval()
    return model


def _decode_image_bytes(raw_image: str | bytes | bytearray) -> bytes:
    if isinstance(raw_image, (bytes, bytearray)):
        return bytes(raw_image)
    if not isinstance(raw_image, str):
        raise TypeError("Unsupported image payload type.")

    image_str = raw_image.strip()
    if image_str.startswith("data:"):
        _, _, encoded = image_str.partition(",")
        image_str = encoded or ""

    try:
        return base64.b64decode(image_str, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("Image payload is not valid base64.") from exc


def _preprocess(image_bytes: bytes) -> torch.Tensor:
    buffer = io.BytesIO(image_bytes)
    with Image.open(buffer) as img:
        img = img.convert("L")
        try:
            resample = Image.Resampling.BILINEAR  # type: ignore[attr-defined]
        except AttributeError:  # Pillow < 9
            resample = Image.BILINEAR
        img = img.resize(_IMAGE_SIZE, resample=resample)
        pixel_values = list(img.getdata())
    tensor = torch.tensor(pixel_values, dtype=torch.float32).view(1, 1, *_IMAGE_SIZE)
    return tensor / 255.0


def _format_predictions(probabilities: torch.Tensor) -> list[dict[str, float]]:
    preds = []
    for label, score in zip(CLASS_NAMES, probabilities):
        preds.append({"label": label, "probability": float(score)})
    preds.sort(key=lambda item: item["probability"], reverse=True)
    return preds


def make_prediction(image_payload: str | bytes | bytearray) -> dict[str, object]:
    """Run an inference pass and return ordered class probabilities."""
    image_bytes = _decode_image_bytes(image_payload)
    input_tensor = _preprocess(image_bytes)

    model = get_model()
    with torch.no_grad():
        logits = model(input_tensor)
        probs = F.softmax(logits, dim=1).squeeze(0)

    ranked = _format_predictions(probs)
    top = ranked[0] if ranked else None
    return {"predictions": ranked, "top": top}

# Make prediction from file path for testing
def make_prediction_from_path(image_path: str | Path) -> dict[str, object]:
    """Convenience helper for running inference against a local file."""
    path = Path(image_path)
    image_bytes = path.read_bytes()
    return make_prediction(image_bytes)


def _cli() -> None:
    parser = argparse.ArgumentParser(description="Run doodle model prediction on an image file.")
    parser.add_argument("image_path", help="Path to the image to classify.")
    args = parser.parse_args()

    result = make_prediction_from_path(args.image_path)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    _cli()
