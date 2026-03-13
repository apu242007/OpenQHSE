"""OCR Service — extract text and analyze safety photos."""

from __future__ import annotations

import io
import structlog

logger = structlog.get_logger(__name__)


class OCRService:
    """Handles text extraction from images and PDFs, plus safety photo analysis."""

    # ── Text extraction from image ─────────────────────────────────────────

    async def extract_text_from_image(self, image_bytes: bytes) -> dict:
        """Extract text from an image using OCR.

        Returns:
            {
                text: str,
                confidence: float,
                language: str,
                blocks: [{text, confidence, bbox}]
            }
        """
        try:
            import easyocr  # type: ignore[import]
            import numpy as np
            from PIL import Image  # type: ignore[import]

            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_array = np.array(image)

            reader = easyocr.Reader(["es", "en"], gpu=False)
            results = reader.readtext(img_array)

            blocks = []
            full_text_parts = []
            total_conf = 0.0

            for bbox, text, conf in results:
                blocks.append({"text": text, "confidence": round(conf, 3), "bbox": bbox})
                full_text_parts.append(text)
                total_conf += conf

            avg_conf = total_conf / len(results) if results else 0.0
            full_text = " ".join(full_text_parts)

            logger.info("ocr_image_extracted", blocks=len(blocks), confidence=round(avg_conf, 3))
            return {
                "text": full_text,
                "confidence": round(avg_conf, 3),
                "language": "es",
                "blocks": blocks,
            }

        except ImportError:
            logger.warning("easyocr_not_installed_falling_back_to_tesseract")
            return await self._tesseract_extract(image_bytes)
        except Exception as exc:
            logger.error("ocr_image_failed", error=str(exc))
            return {"text": "", "confidence": 0.0, "language": "unknown", "blocks": []}

    async def _tesseract_extract(self, image_bytes: bytes) -> dict:
        """Fallback OCR using pytesseract."""
        try:
            import pytesseract  # type: ignore[import]
            from PIL import Image  # type: ignore[import]

            image = Image.open(io.BytesIO(image_bytes))
            data = pytesseract.image_to_data(
                image,
                lang="spa+eng",
                output_type=pytesseract.Output.DICT,
            )

            blocks = []
            words = []
            confidences = []

            for i, word in enumerate(data["text"]):
                conf = int(data["conf"][i])
                if conf > 0 and word.strip():
                    words.append(word)
                    confidences.append(conf)
                    blocks.append({
                        "text": word,
                        "confidence": conf / 100,
                        "bbox": [
                            data["left"][i],
                            data["top"][i],
                            data["left"][i] + data["width"][i],
                            data["top"][i] + data["height"][i],
                        ],
                    })

            avg_conf = sum(confidences) / len(confidences) / 100 if confidences else 0.0
            return {
                "text": " ".join(words),
                "confidence": round(avg_conf, 3),
                "language": "es",
                "blocks": blocks,
            }
        except ImportError:
            logger.error("pytesseract_not_installed")
            return {"text": "", "confidence": 0.0, "language": "unknown", "blocks": []}

    # ── Text extraction from PDF ───────────────────────────────────────────

    async def extract_text_from_pdf(self, pdf_bytes: bytes) -> dict:
        """Extract text from a PDF using pdfplumber.

        Returns:
            {
                text: str,
                pages: [{page_num, text, tables}],
                total_pages: int
            }
        """
        try:
            import pdfplumber  # type: ignore[import]

            pages_data = []
            full_text_parts = []

            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                total_pages = len(pdf.pages)
                for page_num, page in enumerate(pdf.pages, start=1):
                    text = page.extract_text() or ""
                    tables = page.extract_tables() or []

                    # Flatten tables to list of row dicts
                    parsed_tables = []
                    for table in tables:
                        if table and len(table) > 1:
                            headers = [str(h).strip() if h else f"col{i}" for i, h in enumerate(table[0])]
                            rows = []
                            for row in table[1:]:
                                rows.append({headers[i]: str(cell).strip() if cell else "" for i, cell in enumerate(row)})
                            parsed_tables.append({"headers": headers, "rows": rows})

                    pages_data.append({
                        "page_num": page_num,
                        "text": text,
                        "tables": parsed_tables,
                    })
                    full_text_parts.append(text)

            logger.info("pdf_text_extracted", pages=total_pages)
            return {
                "text": "\n\n".join(full_text_parts),
                "pages": pages_data,
                "total_pages": total_pages,
            }

        except ImportError:
            logger.error("pdfplumber_not_installed")
            return {"text": "", "pages": [], "total_pages": 0}
        except Exception as exc:
            logger.error("pdf_extraction_failed", error=str(exc))
            return {"text": "", "pages": [], "total_pages": 0}

    # ── Safety photo analysis ──────────────────────────────────────────────

    async def analyze_safety_photo(self, image_bytes: bytes) -> dict:
        """Detect safety issues in a workplace photo using vision + OCR.

        Returns:
            {
                missing_ppe: [str],
                unsafe_conditions: [str],
                signage_issues: [str],
                risk_level: "critical"|"high"|"medium"|"low",
                confidence: float,
                observations: [str],
                recommended_actions: [str],
                extracted_text: str
            }
        """
        # First extract any text in the image (signs, labels, etc.)
        ocr_result = await self.extract_text_from_image(image_bytes)
        extracted_text = ocr_result.get("text", "")

        # Try vision-based analysis first
        vision_result = await self._vision_analyze(image_bytes, extracted_text)
        logger.info("safety_photo_analyzed", risk_level=vision_result.get("risk_level"))
        return vision_result

    async def _vision_analyze(self, image_bytes: bytes, extracted_text: str) -> dict:
        """Use LLM vision or heuristic analysis on the image."""
        try:
            import base64

            from app.core.llm import get_ollama_client

            client = get_ollama_client()
            b64_image = base64.b64encode(image_bytes).decode()

            prompt = f"""Analyze this workplace safety photo.

Extracted text found in image: "{extracted_text}"

Identify:
1. Missing PPE (hard hat, safety vest, gloves, safety glasses, steel-toe boots, harness)
2. Unsafe conditions (housekeeping, equipment damage, unguarded machinery, fall hazards, electrical hazards)
3. Signage issues (missing warnings, blocked exit signs, illegible labels)

Return a JSON object:
{{
  "missing_ppe": ["<item>"],
  "unsafe_conditions": ["<condition>"],
  "signage_issues": ["<issue>"],
  "risk_level": "critical|high|medium|low",
  "confidence": <0.0-1.0>,
  "observations": ["<observation>"],
  "recommended_actions": ["<action>"],
  "extracted_text": "{extracted_text}"
}}"""

            # Check if client supports vision (llava model)
            raw = await client.generate(
                prompt,
                system="You are a certified safety inspector. Analyze workplace photos for hazards.",
                images=[b64_image],
            )

            from app.services.llm_service import _parse_json
            result = _parse_json(raw)
            if result:
                result["extracted_text"] = extracted_text
                return result

        except Exception as exc:
            logger.warning("vision_analysis_failed", error=str(exc))

        # Fallback: heuristic based on extracted text
        return self._heuristic_analyze(extracted_text)

    def _heuristic_analyze(self, extracted_text: str) -> dict:
        """Rule-based analysis when vision AI is unavailable."""
        text_lower = extracted_text.lower()

        unsafe_keywords = [
            "peligro", "danger", "warning", "advertencia",
            "prohibido", "no pasar", "alto voltaje", "high voltage",
        ]
        ppe_keywords = [
            "casco", "helmet", "chaleco", "vest", "guantes", "gloves",
            "lentes", "glasses", "botas", "boots", "arnés", "harness",
        ]

        detected_unsafe = [kw for kw in unsafe_keywords if kw in text_lower]
        detected_ppe_text = [kw for kw in ppe_keywords if kw in text_lower]

        risk_level = "medium"
        if any(kw in text_lower for kw in ["peligro", "danger", "alto voltaje", "high voltage"]):
            risk_level = "high"

        return {
            "missing_ppe": [],
            "unsafe_conditions": [f"Texto de advertencia detectado: {kw}" for kw in detected_unsafe],
            "signage_issues": [],
            "risk_level": risk_level,
            "confidence": 0.4,
            "observations": [f"Texto extraído: {extracted_text[:200]}"] if extracted_text else [],
            "recommended_actions": ["Revisar la foto manualmente para evaluación detallada"],
            "extracted_text": extracted_text,
        }


def get_ocr_service() -> OCRService:
    return OCRService()
