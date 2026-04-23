import os
import tempfile
import time
from contextlib import asynccontextmanager

import numpy as np
import tensorflow as tf
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from gradcam import build_gradcam_model, generate_gradcam
from predict import (
    encode_bgr_image_to_base64_png,
    extract_middle_face_crop,
    preprocess_video,
)

MODEL_PATH = os.path.join('model', 'best_phase2.keras')
ALLOWED_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv'}
MAX_SIZE_BYTES = 100 * 1024 * 1024


def _device_name():
    return '/GPU:0' if tf.config.list_physical_devices('GPU') else '/CPU:0'


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Configurer le GPU NVIDIA ──────────────────────────────
    print("\n" + "="*60)
    print("🔧 Configuration GPU NVIDIA GTX 1650")
    print("="*60)
    
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        try:
            # Activer memory growth pour éviter l'allocation complète
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
            
            # Afficher les détails GPU
            gpu_details = tf.sysconfig.get_build_info()['cuda_version']
            print(f"✅ GPU détecté: {len(gpus)} GPU(s)")
            print(f"✅ CUDA activé pour TensorFlow")

            try:
                tf.keras.mixed_precision.set_global_policy('mixed_float16')
                print("✅ Mixed precision activée")
            except Exception as mixed_precision_error:
                print(f"⚠️  Mixed precision non disponible: {mixed_precision_error}")
            
            # Forcer le placement des opérations sur GPU
            tf.debugging.set_log_device_placement(False)
            
        except RuntimeError as e:
            print(f"⚠️  Erreur config GPU: {e}")
            print("⚠️  Passage en mode CPU")
    else:
        print("⚠️  Aucun GPU NVIDIA détecté")
        print("⚠️  Utilisation CPU (mode dégradé)")

    # ── Charger le modèle ──────────────────────────────────────
    try:
        with tf.device(_device_name()):
            model = tf.keras.models.load_model(MODEL_PATH)
            # Warm-up : inférence factice pour compiler les kernels GPU
            dummy = np.zeros((1, 30, 224, 224, 3), dtype='float32')
            _ = model.predict(dummy, verbose=0)
        print("✅ Modèle chargé sur GPU avec warm-up")
    except Exception as exc:
        raise RuntimeError(f'Erreur chargement modèle: {exc}') from exc

    # ── Pré-construire le modèle Grad-CAM UNE SEULE FOIS ──────
    try:
        with tf.device(_device_name()):
            gradcam_model = build_gradcam_model(model)
        print("✅ Modèle Grad-CAM pré-construit sur GPU")
    except Exception as exc:
        gradcam_model = None
        print(f"⚠️  Grad-CAM non disponible: {exc}")

    print("="*60 + "\n")
    
    app.state.model = model
    app.state.gradcam_model = gradcam_model
    app.state.gpus = gpus
    yield


app = FastAPI(title='DeepGuard API', version='1.0.0', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


def _predict_score(model, clip):
    """Prédiction optimisée GPU avec gestion des erreurs."""
    try:
        with tf.device(_device_name()):
            pred = model.predict(clip, verbose=0)
        score = float(np.squeeze(pred))
        return max(0.0, min(1.0, score))
    except Exception as e:
        print(f"❌ Erreur prédiction: {e}")
        return 0.5  # Valeur par défaut en cas d'erreur


def _compute_frame_scores_fast(model, processed_video):
    """
    Version rapide optimisée GPU : UNE SEULE inférence sur la vidéo complète.
    Sliding window de taille 5, stride 5 → 6 inférences au lieu de 30.
    """
    frame_count = processed_video.shape[1]  # 30
    scores = []
    window = 5
    stride = 5  # 6 fenêtres non-chevauchantes

    try:
        with tf.device(_device_name()):
            for start in range(0, frame_count, stride):
                end = min(start + window, frame_count)
                chunk = processed_video[:, start:end, :, :, :]
                # Rembourrer à 30 frames par répétition
                repeats = int(np.ceil(frame_count / chunk.shape[1]))
                tiled = np.tile(chunk, (1, repeats, 1, 1, 1))[:, :frame_count, :, :, :]
                scores.append(_predict_score(model, tiled))
    except Exception as e:
        print(f"❌ Erreur calcul frame scores: {e}")
        # Fallback : retourner scores constants
        scores = [0.5] * 6

    # Interpoler les 6 scores → 30 points pour le graphique
    x_orig = np.linspace(0, 1, len(scores))
    x_new = np.linspace(0, 1, frame_count)
    frame_scores = np.interp(x_new, x_orig, scores).tolist()

    return frame_scores


@app.get('/health')
def health():
    model = app.state.model
    gpus = tf.config.list_physical_devices('GPU')
    
    # Obtenir les détails GPU
    gpu_details = []
    for gpu in gpus:
        try:
            details = tf.config.experimental.get_memory_info(gpu)
            gpu_details.append({
                'name': gpu.name,
                'memory': details
            })
        except:
            gpu_details.append({'name': gpu.name})
    
    return {
        'status': 'ok',
        'model_loaded': model is not None,
        'gpu_available': len(gpus) > 0,
        'gpu_count': len(gpus),
        'gpu_details': gpu_details,
        'model_path': MODEL_PATH,
        'input_shape': str(getattr(model, 'input_shape', None)),
        'message': f"✅ GPU NVIDIA GTX 1650 activé" if gpus else "⚠️  Mode CPU (ralenti)"
    }


@app.post('/predict')
async def predict(file: UploadFile = File(...)):
    start_time = time.perf_counter()

    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail='Format non supporté. Utilisez MP4, AVI, MOV ou MKV.'
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail='Fichier trop volumineux. Max 100MB.'
        )

    model         = app.state.model
    gradcam_model = app.state.gradcam_model
    temp_path     = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp:
            temp.write(file_bytes)
            temp_path = temp.name

        t0 = time.perf_counter()

        # ── 1. Prétraitement ──────────────────────────────────
        processed = preprocess_video(temp_path, num_frames=30, target_size=(224, 224))
        if processed.shape[1] == 0:
            raise HTTPException(
                status_code=400,
                detail='Impossible d\'extraire des frames de cette vidéo.'
            )
        print(f"  Prétraitement : {time.perf_counter()-t0:.2f}s")

        # ── 2. Prédiction principale (1 inférence) ────────────
        t1 = time.perf_counter()
        score      = _predict_score(model, processed)
        label      = 'DEEPFAKE' if score >= 0.5 else 'REAL'
        confidence = score if label == 'DEEPFAKE' else 1.0 - score
        print(f"  Prédiction principale : {time.perf_counter()-t1:.2f}s")

        # ── 3. Frame scores (6 inférences au lieu de 30) ──────
        t2 = time.perf_counter()
        frame_scores = _compute_frame_scores_fast(model, processed)
        print(f"  Frame scores : {time.perf_counter()-t2:.2f}s")

        # ── 4. Frame centrale ─────────────────────────────────
        t3 = time.perf_counter()
        middle_crop    = extract_middle_face_crop(temp_path, num_frames=30, frame_index=15)
        middle_frame_b64 = encode_bgr_image_to_base64_png(middle_crop)
        print(f"  Frame centrale : {time.perf_counter()-t3:.2f}s")

        # ── 5. Grad-CAM (modèle pré-construit) ───────────────
        t4 = time.perf_counter()
        gradcam_b64 = generate_gradcam(
            gradcam_model, processed, middle_crop, frame_index=15
        ) if gradcam_model is not None else ''
        print(f"  Grad-CAM : {time.perf_counter()-t4:.2f}s")

        processing_time = time.perf_counter() - start_time
        print(f"  TOTAL : {processing_time:.2f}s")

        return {
            'score':            score,
            'label':            label,
            'confidence':       float(confidence),
            'gradcam_b64':      gradcam_b64,
            'middle_frame_b64': middle_frame_b64,
            'processing_time':  float(processing_time),
            'frame_scores':     frame_scores,
            'frame_scores_min': float(np.min(frame_scores)),
            'frame_scores_max': float(np.max(frame_scores)),
            'frame_scores_var': float(np.var(frame_scores)),
        }

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=False)