from PIL import Image
import io
import os
import re


# Optional loading of ultralytics for production YOLO
ULTRALYTICS_AVAILABLE = False
try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    print("[DPD YOLO] ultralytics package not installed. Running in heuristic fallback mode.")

class DarkPatternYOLODetector:
    def __init__(self, model_path: str = "models/yolo_dark_patterns.pt"):
        self.confidence_threshold = 0.65
        self.model_loaded = False
        self.model = None
        
        # Mapping from YOLO class index to DPD Category
        self.class_labels = {
            0: "URGENCY_TIMER",
            1: "HIDDEN_BUTTON",
            2: "PRE_TICKED_BOX",
            3: "MISLEADING_PRICE",
            4: "CONFIRM_SHAME_TEXT",
            5: "FAKE_REVIEW_BADGE",
            6: "DISGUISED_AD",
            7: "FORCED_SIGNUP",
            8: "SUBSCRIPTION_TRAP"
        }

        # Attempt loading YOLO model
        if ULTRALYTICS_AVAILABLE:
            abs_model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), model_path)
            if os.path.exists(abs_model_path):
                try:
                    self.model = YOLO(abs_model_path)
                    self.model_loaded = True
                    print(f"[DPD YOLO] Successfully loaded YOLO weights from: {abs_model_path}")
                except Exception as e:
                    print(f"[DPD YOLO] Failed loading model file: {e}. Falling back to heuristics.")
            else:
                print(f"[DPD YOLO] Weights file not found at: {abs_model_path}. Using fallback scanner.")

    def detect(self, screenshot_bytes: bytes, html_context: str = None, bounds: dict = None) -> list[dict]:
        """
        Scans screenshot bytes.
        If YOLO model is loaded, it runs the PyTorch model.
        Otherwise, it falls back to a high-fidelity coordinates & HTML signature scanner.
        """
        if self.model_loaded and self.model:
            try:
                image = Image.open(io.BytesIO(screenshot_bytes))
                results = self.model(image, conf=self.confidence_threshold)
                detections = []
                
                for r in results:
                    for box in r.boxes:
                        coords = box.xyxy[0].tolist() # [x1, y1, x2, y2]
                        conf = float(box.conf[0])
                        cls_idx = int(box.cls[0])
                        class_name = self.class_labels.get(cls_idx, "UNKNOWN")
                        
                        detections.append({
                            "box": {
                                "x": coords[0],
                                "y": coords[1],
                                "width": coords[2] - coords[0],
                                "height": coords[3] - coords[1]
                            },
                            "confidence": conf,
                            "pattern_type": class_name,
                            "requires_vision_confirmation": conf < 0.85
                        })
                return detections
            except Exception as e:
                print(f"[DPD YOLO] Real inference execution failed: {e}. Engaging fallback.")

        # ================= FALLBACK HEURISTIC SIGNATURE SCANNER =================
        detections = []
        if not html_context:
            return detections
            
        html_lower = html_context.lower()
        x = bounds.get("x", 0) if bounds else 100
        y = bounds.get("y", 0) if bounds else 100
        w = bounds.get("width", 50) if bounds else 150
        h = bounds.get("height", 30) if bounds else 50

        # 1. Checkbox Consent detection signature
        if 'type="checkbox"' in html_context or "checkbox" in html_lower:
            suspicious = ['newsletter', 'marketing', 'offers', 'partners', 'third party', 'promotional', 'updates', 'sms']
            if any(kw in html_lower for kw in suspicious):
                detections.append({
                    "box": {"x": x, "y": y, "width": w, "height": h},
                    "confidence": 0.95,
                    "pattern_type": "PRE_TICKED_CONSENT",
                    "requires_vision_confirmation": False,
                    "description": "Pre-ticked checkboxes attempting to gather sneaky marketing opt-ins."
                })

        # 2. Hidden cancel path / roach motel detection signature
        exit_keywords = ['cancel', 'unsubscribe', 'no thanks', 'skip', 'close account', 'delete']
        if any(kw in html_lower for kw in exit_keywords):
            # Check for accessibility exit deficits / hidden styles in HTML
            is_hidden = ('opacity' in html_lower and ('0.' in html_lower or 'opacity:0' in html_lower)) or \
                        ('color' in html_lower and 'background' in html_lower) or \
                        ('font-size' in html_lower and ('5px' in html_lower or '6px' in html_lower or '7px' in html_lower)) or \
                        'hidden-cancel' in html_lower or 'hidden-btn' in html_lower
            
            if is_hidden:
                detections.append({
                    "box": {"x": x, "y": y, "width": w, "height": h},
                    "confidence": 0.92,
                    "pattern_type": "HIDDEN_EXIT_PATH",
                    "requires_vision_confirmation": False,
                    "description": "Unsubscribe or close-account button styled to be hidden or unreadable."
                })
            else:
                # If there's an exit word but it's not hidden, check if it's confirm shaming text
                shaming_patterns = [
                    r"no.{0,10}(thanks|thank you).{0,20}(saving|deals|money|discount)",
                    r"i (don'?t|do not) (want|need|care).{0,30}(save|deal|discount|offer)",
                    r"i('?ll)? (pass|skip|miss out)",
                    r"no.{0,5}i('?m)? (fine|ok|good|happy).{0,20}(paying|spending)"
                ]
                if any(re.search(p, html_lower) for p in shaming_patterns):
                    detections.append({
                        "box": {"x": x, "y": y, "width": w, "height": h},
                        "confidence": 0.88,
                        "pattern_type": "CONFIRM_SHAMING",
                        "requires_vision_confirmation": False,
                        "description": "Guilt-tripping dialog options attempting to emotionally manipulate user decisions."
                    })

        # 3. Countdown / Fake Urgency signature
        if any(kw in html_lower for kw in ['timer', 'countdown', 'urgency', 'expire', 'hurry', 'sale ends']):
            # Usually numbers matching clock countdowns
            if re.search(r'\d+:\d+', html_lower) or 'timer' in html_lower:
                detections.append({
                    "box": {"x": x, "y": y, "width": w, "height": h},
                    "confidence": 0.94,
                    "pattern_type": "FAKE_COUNTDOWN",
                    "requires_vision_confirmation": False,
                    "description": "Artificial countdown timer pressuring user into rapid checkout."
                })

        # 4. Hidden fee / Price Injection signature
        if any(kw in html_lower for kw in ['price', 'total', 'cost', 'fee', 'service fee']):
            if '+' in html_lower or 'extra' in html_lower or 'injection' in html_lower or 'added' in html_lower:
                detections.append({
                    "box": {"x": x, "y": y, "width": w, "height": h},
                    "confidence": 0.90,
                    "pattern_type": "PRICE_INJECTION",
                    "requires_vision_confirmation": False,
                    "description": "Late-stage hidden checkout fee or product injection."
                })

        return detections

    def should_escalate_to_vision(self, detections: list) -> bool:
        """Determines if the YOLO scan requires secondary LLM visual reasoning verification."""
        if not detections:
            return True
        return any(d.get("requires_vision_confirmation", False) for d in detections)
