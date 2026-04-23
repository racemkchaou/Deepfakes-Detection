import base64
import cv2
import numpy as np
import tensorflow as tf


def build_gradcam_model(model):
    """
    Construit le modèle Grad-CAM UNE SEULE FOIS au démarrage.
    Retourne le fast_model prêt à l'emploi.
    """
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
                    # Warm-up
                    dummy = np.zeros((1, 224, 224, 3), dtype='float32')
                    fast_model.predict(dummy, verbose=0)
                    print("✅ Grad-CAM model built on layer 'top_conv'")
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
    Le gradcam_model est déjà compilé — pas de reconstruction.
    """
    if gradcam_model is None:
        return ''
    if processed_video.ndim != 5 or processed_video.shape[1] == 0:
        return ''

    frame_index = int(np.clip(frame_index, 0, processed_video.shape[1] - 1))
    frame_data   = processed_video[0, frame_index]          # (224, 224, 3)
    frame_tensor = np.expand_dims(frame_data, axis=0)       # (1, 224, 224, 3)

    # Inférence sur le modèle pré-construit (rapide)
    activations = gradcam_model(frame_tensor, training=False)

    # Heatmap = moyenne des canaux de la dernière conv
    heatmap = tf.reduce_mean(activations[0], axis=-1).numpy()
    heatmap = _normalize_heatmap(heatmap)

    # Fallback si frame centrale absente
    if middle_frame_bgr is None or middle_frame_bgr.size == 0:
        middle_frame_bgr = cv2.resize(
            processed_video[0, frame_index].astype(np.uint8),
            (224, 224)
        )

    h, w = middle_frame_bgr.shape[:2]
    heatmap_resized  = cv2.resize(heatmap, (w, h))
    heatmap_uint8    = np.uint8(255 * heatmap_resized)
    colored_heatmap  = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    overlay          = cv2.addWeighted(middle_frame_bgr, 0.55, colored_heatmap, 0.45, 0)

    ok, buf = cv2.imencode('.png', overlay)
    if not ok:
        return ''

    return base64.b64encode(buf).decode('utf-8')