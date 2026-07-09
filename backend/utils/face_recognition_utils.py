"""
Face encoding utilities for MindScale Face Unlock.

Uses MediaPipe Face Landmarker (Tasks API) to extract a normalized landmark
vector from a face image. The encoding is stored in the database and compared
on later logins.
"""

import base64
import io
import json
import os

import numpy as np
from PIL import Image

try:
    import cv2
    import mediapipe as mp
    FACE_LIBS_AVAILABLE = True
except ImportError:
    FACE_LIBS_AVAILABLE = False

# Lower = stricter matching. Tuned for front-camera selfies.
FACE_MATCH_THRESHOLD = 0.32

# Path to the downloaded face_landmarker.task model file
_MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
_MODEL_PATH = os.path.join(_MODEL_DIR, 'face_landmarker.task')


def _require_face_libs():
    if not FACE_LIBS_AVAILABLE:
        raise RuntimeError(
            'Face recognition dependencies are not installed. '
            'Run: pip install mediapipe opencv-python-headless Pillow'
        )
    if not os.path.isfile(_MODEL_PATH):
        raise RuntimeError(
            f'Face landmarker model not found at {_MODEL_PATH}. '
            'Download it from: https://storage.googleapis.com/mediapipe-models/'
            'face_landmarker/face_landmarker/float16/1/face_landmarker.task'
        )


def decode_base64_image(b64_string):
    """Decode a base64 image string (with or without data-URI prefix) to BGR numpy array."""
    _require_face_libs()

    if not b64_string or not isinstance(b64_string, str):
        return None

    payload = b64_string
    if ',' in payload:
        payload = payload.split(',', 1)[1]

    try:
        image_data = base64.b64decode(payload)
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        rgb = np.array(image)
        return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    except Exception:
        return None


def extract_face_encoding(image_bgr):
    """
    Extract a normalized face landmark encoding from a BGR image.

    Returns:
        list[float] | None — encoding vector, or None if no single face found.
    """
    _require_face_libs()

    if image_bgr is None or image_bgr.size == 0:
        return None

    # Use the new mediapipe Tasks API (FaceLandmarker)
    BaseOptions = mp.tasks.BaseOptions
    FaceLandmarker = mp.tasks.vision.FaceLandmarker
    FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions

    options = FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=_MODEL_PATH),
        num_faces=2,
        min_face_detection_confidence=0.6,
        min_face_presence_confidence=0.6,
        min_tracking_confidence=0.6,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
    )

    with FaceLandmarker.create_from_options(options) as landmarker:
        # Convert BGR to RGB for mediapipe
        rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = landmarker.detect(mp_image)

        if not result.face_landmarks:
            return None

        if len(result.face_landmarks) != 1:
            return None

        landmarks = result.face_landmarks[0]
        coords = []
        for landmark in landmarks:
            coords.extend([landmark.x, landmark.y, landmark.z])

        encoding = np.array(coords, dtype=np.float64)
        std = encoding.std()
        if std < 1e-8:
            return None

        encoding = (encoding - encoding.mean()) / std
        return encoding.tolist()


def extract_face_encoding_from_base64(b64_string):
    """Decode base64 image and return face encoding."""
    image_bgr = decode_base64_image(b64_string)
    if image_bgr is None:
        return None
    return extract_face_encoding(image_bgr)


def compare_face_encodings(stored_encoding, live_encoding, threshold=FACE_MATCH_THRESHOLD):
    """
    Compare two face encodings.

    Returns:
        (is_match: bool, confidence: float, distance: float)
    """
    if not stored_encoding or not live_encoding:
        return False, 0.0, 1.0

    e1 = np.array(json.loads(stored_encoding) if isinstance(stored_encoding, str) else stored_encoding)
    e2 = np.array(live_encoding)

    if e1.shape != e2.shape:
        return False, 0.0, 1.0

    distance = float(np.linalg.norm(e1 - e2) / len(e1))
    is_match = distance < threshold
    confidence = max(0.0, min(1.0, 1.0 - (distance / threshold)))

    return is_match, confidence, distance


def encoding_to_json(encoding):
    """Serialize encoding for SQLite storage."""
    return json.dumps(encoding)
