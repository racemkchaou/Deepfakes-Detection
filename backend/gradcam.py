import base64
import cv2
import numpy as np
import tensorflow as tf


def _device_name():
    return '/GPU:0' if tf.config.list_physical_devices('GPU') else '/CPU:0'


def build_gradcam_model(model):
    """
    Construit le modèle Grad-CAM UNE SEULE FOIS au démarrage.
    Retourne le fast_model prêt à l'emploi — OPTIMISÉ GPU.
    """
    device = _device_name()
    
    with tf.device(device):
        for layer in model.layers:
            if isinstance(layer, tf.keras.layers.TimeDistributed):
                inner = layer.layer
                if isinstance(inner, tf.keras.Model):
                    try:
                        conv_layer = inner.get_layer('top_conv')
                        fast_model = tf.keras.Model(
                            inputs=inner.inputs,
                            outputs=conv_layer.output
                        )
                        # Warm-up pour compiler les kernels GPU
                        dummy = np.zeros((1, 224, 224, 3), dtype='float32')
                        _ = fast_model.predict(dummy, verbose=0)
                        print(f"✅ Grad-CAM model built on GPU device '{device}'")
                        return fast_model
                    except ValueError:
                        continue
    
    raise ValueError("Couche 'top_conv' introuvable dans EfficientNetB0")


def _normalize_heatmap(heatmap):
    heatmap = np.maximum(heatmap, 0)
    max_val = np.max(heatmap)
    if max_val > 0:
        heatmap = heatmap / max_val
    return heatmap


def generate_gradcam(gradcam_model, processed_video, middle_frame_bgr, frame_index=15):
    """
    Génère la heatmap Grad-CAM en utilisant le modèle pré-construit.
    OPTIMISÉ pour GPU : évite les rechargements.
    """
    if gradcam_model is None:
        return ''
    
    try:
        # Validation stricte des entrées
        if processed_video is None or processed_video.size == 0:
            return ''
        if processed_video.ndim != 5 or processed_video.shape[1] == 0:
            return ''

        frame_index = int(np.clip(frame_index, 0, processed_video.shape[1] - 1))
        
        # ── Extraire et normaliser le frame ────────────────────
        frame_data = processed_video[0, frame_index]  # (224, 224, 3)
        
        # Vérifier si déjà normalisé (valeurs entre 0-1)
        if np.max(frame_data) > 1.5:
            # Pas normalisé, normaliser
            frame_data = frame_data / 255.0
        
        frame_tensor = np.expand_dims(frame_data.astype(np.float32), axis=0)  # (1, 224, 224, 3)
        
        # ── Inférence GPU ─────────────────────────────────────
        with tf.device(_device_name()):
            activations = gradcam_model(frame_tensor, training=False)
        
        # ── Calcul heatmap ────────────────────────────────────
        heatmap = tf.reduce_mean(activations[0], axis=-1).numpy()
        heatmap = _normalize_heatmap(heatmap)

        # ── Fallback : frame centrale ─────────────────────────
        if middle_frame_bgr is None or middle_frame_bgr.size == 0:
            # Reconstruire depuis processed_video
            frame_uint8 = (frame_data * 255).astype(np.uint8) if np.max(frame_data) <= 1.5 else frame_data.astype(np.uint8)
            middle_frame_bgr = cv2.resize(frame_uint8, (224, 224))

        h, w = middle_frame_bgr.shape[:2]
        
        # ── Redimensionner heatmap et overlay ─────────────────
        heatmap_resized = cv2.resize(heatmap, (w, h))
        heatmap_uint8 = np.uint8(255 * heatmap_resized)
        colored_heatmap = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        
        # Assurer que middle_frame_bgr est uint8
        frame_for_overlay = middle_frame_bgr.astype(np.uint8) if middle_frame_bgr.dtype != np.uint8 else middle_frame_bgr
        overlay = cv2.addWeighted(frame_for_overlay, 0.55, colored_heatmap, 0.45, 0)

        # ── Encoder en PNG ────────────────────────────────────
        ok, buf = cv2.imencode('.png', overlay)
        if not ok:
            return ''

        return base64.b64encode(buf).decode('utf-8')
        
    except Exception as e:
        print(f"❌ Erreur Grad-CAM: {e}")
        import traceback
        traceback.print_exc()
        return ''