import { useCallback, useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { formatApiErrorDetail } from "../lib/utils";

const CONFIDENCE_REVIEW_THRESHOLD = 0.75;

function normalizeIsoDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime()) && /\d{4}/.test(String(value))) {
    return parsed.toISOString().slice(0, 10);
  }
  return value;
}

function quantityFromOcr(rawQuantity) {
  const match = String(rawQuantity ?? "1").match(/\d+/);
  return parseInt(match?.[0] || "1", 10);
}

function ocrFieldsToForm(ocrFields = {}) {
  return {
    product_name: ocrFields.product_name || "",
    batch_number: ocrFields.batch_number || "",
    mfg_date: normalizeIsoDate(ocrFields.mfg_date),
    exp_date: normalizeIsoDate(ocrFields.exp_date),
    quantity: quantityFromOcr(ocrFields.quantity),
    category: (ocrFields.category || "general").toLowerCase(),
    notes: "",
  };
}

/**
 * Runs OCR against the backend, keeps the result state, and exposes
 * a `form` prefilled from extraction.
 */
export function useOcrProcessor({ onParsed } = {}) {
  const [ocr, setOcr] = useState(null);
  const [processing, setProcessing] = useState(false);

  const run = useCallback(
    async (capturedDataUrl) => {
      if (!capturedDataUrl) return;
      setProcessing(true);
      setOcr(null);
      try {
        const formData = new FormData();
        formData.append("image_base64", capturedDataUrl);
        const { data } = await api.post("/ocr/scan", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setOcr(data);
        onParsed?.(ocrFieldsToForm(data.fields));
        if (data.confidence < CONFIDENCE_REVIEW_THRESHOLD || data.needs_review) {
          toast.warning("Low confidence — please verify the fields.");
        } else {
          toast.success("Label parsed");
        }
      } catch (err) {
        toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "OCR failed");
      } finally {
        setProcessing(false);
      }
    },
    [onParsed],
  );

  const clear = useCallback(() => setOcr(null), []);

  return { ocr, processing, run, clear };
}
