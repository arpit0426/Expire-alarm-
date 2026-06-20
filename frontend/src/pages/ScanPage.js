import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { formatApiErrorDetail } from "../lib/utils";
import { useCameraCapture } from "../hooks/useCameraCapture";
import { useOcrProcessor } from "../hooks/useOcrProcessor";
import CameraPanel from "../components/scan/CameraPanel";
import ScanResults from "../components/scan/ScanResults";

const EMPTY_FORM = {
  product_name: "",
  batch_number: "",
  mfg_date: "",
  exp_date: "",
  quantity: 1,
  category: "general",
  notes: "",
};

export default function ScanPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const camera = useCameraCapture();

  const handleParsed = useCallback((parsedForm) => setForm(parsedForm), []);
  const { ocr, processing, run: runOcr, clear: clearOcr } = useOcrProcessor({
    onParsed: handleParsed,
  });

  const resetAll = useCallback(() => {
    camera.reset();
    clearOcr();
    setForm(EMPTY_FORM);
  }, [camera, clearOcr]);

  const saveProduct = async () => {
    setSaving(true);
    try {
      await api.post("/products", form);
      toast.success("Saved to inventory");
      resetAll();
    } catch (err) {
      if (err?.response?.status === 409) {
        toast.error("Duplicate: product+batch already in inventory");
      } else {
        toast.error(
          formatApiErrorDetail(err?.response?.data?.detail) || "Save failed",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="scan-page">
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-brand-primary mb-2">
          / Scanner
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-black text-ink tracking-tight">
          Point. <span className="italic text-brand-primary">Scan.</span> Done.
        </h1>
        <p className="text-ink-soft mt-2 max-w-xl">
          Capture a label with your camera or upload an image. Our AI extracts the data
          — you confirm and save.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <CameraPanel
          videoRef={camera.videoRef}
          cameraOn={camera.cameraOn}
          captured={camera.captured}
          processing={processing}
          onStartCamera={camera.startCamera}
          onStopCamera={camera.stopCamera}
          onCapture={camera.capture}
          onReset={resetAll}
          onUploadFile={camera.acceptFile}
          onRunOcr={() => runOcr(camera.captured)}
        />
        <ScanResults
          ocr={ocr}
          processing={processing}
          form={form}
          setForm={setForm}
          onSave={saveProduct}
          saving={saving}
        />
      </div>
    </div>
  );
}
