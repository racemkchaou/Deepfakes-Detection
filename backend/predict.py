import base64
import cv2
import numpy as np


face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')


def apply_clahe(img):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def preprocess_video(video_path, num_frames=30, target_size=(224, 224)):
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    interval = max(1, total // num_frames)
    frames, count = [], 0
    while len(frames) < num_frames and count < total:
        ret, frame = cap.read()
        if not ret:
            break
        if count % interval == 0:
            frames.append(frame)
        count += 1
    cap.release()
    while len(frames) < num_frames and len(frames) > 0:
        frames.append(frames[-1])
    processed = []
    for frame in frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
        if len(faces) > 0:
            faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
            x, y, w, h = faces[0]
            x = max(0, x - 30)
            y = max(0, y - 30)
            w = min(frame.shape[1] - x, w + 60)
            h = min(frame.shape[0] - y, h + 60)
            face = frame[y:y + h, x:x + w]
        else:
            face = frame
        face = apply_clahe(face)
        face = cv2.resize(face, target_size)
        processed.append(face)
    return np.array([processed], dtype='float32')


def _sample_frames(video_path, num_frames=30):
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    interval = max(1, total // num_frames)
    frames, count = [], 0

    while len(frames) < num_frames and count < total:
        ret, frame = cap.read()
        if not ret:
            break
        if count % interval == 0:
            frames.append(frame)
        count += 1

    cap.release()

    while len(frames) < num_frames and len(frames) > 0:
        frames.append(frames[-1])

    return frames


def extract_face_crop(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))

    if len(faces) > 0:
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        x, y, w, h = faces[0]
        x = max(0, x - 30)
        y = max(0, y - 30)
        w = min(frame.shape[1] - x, w + 60)
        h = min(frame.shape[0] - y, h + 60)
        return frame[y:y + h, x:x + w]

    return frame


def extract_middle_face_crop(video_path, num_frames=30, frame_index=15):
    frames = _sample_frames(video_path, num_frames=num_frames)
    if not frames:
        return np.zeros((224, 224, 3), dtype=np.uint8)

    idx = max(0, min(frame_index, len(frames) - 1))
    return extract_face_crop(frames[idx])


def encode_bgr_image_to_base64_png(image_bgr):
    ok, buffer = cv2.imencode('.png', image_bgr)
    if not ok:
        return ''
    return base64.b64encode(buffer).decode('utf-8')
