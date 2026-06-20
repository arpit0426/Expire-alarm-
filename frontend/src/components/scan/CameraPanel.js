import React from "react";
import {
  Camera,
  CameraOff,
  ScanLine,
  Upload,
  RotateCcw,
  Image as ImageIcon,
} from "lucide-react";

export default function CameraPanel({
  videoRef,
  cameraOn,
  captured,
  processing,
  onStartCamera,
  onStopCamera,
  onCapture,
  onReset,
  onUploadFile,
  onRunOcr,
}) {
  const fileRef = React.useRef(null);

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-4">
        / 01 — Capture
      </div>

      <CameraViewport videoRef={videoRef} cameraOn={cameraOn} captured={captured} />

      <CameraControls
        cameraOn={cameraOn}
        captured={captured}
        fileRef={fileRef}
        onStartCamera={onStartCamera}
        onStopCamera={onStopCamera}
        onCapture={onCapture}
        onReset={onReset}
        onUploadFile={onUploadFile}
      />

      {captured && (
        <button
          data-testid="run-ocr-btn"
          onClick={onRunOcr}
          disabled={processing}
          className="w-full mt-3 inline-flex items-center justify-center gap-2 bg-brand-dark text-brand-cream font-bold px-4 py-3 rounded-full hover:bg-ink disabled:opacity-60"
        >
          {processing ? (
            "Reading label…"
          ) : (
            <>
              <ImageIcon className="h-4 w-4 text-brand-accent" /> Run OCR extraction
            </>
          )}
        </button>
      )}
    </div>
  );
}

function CameraViewport({ videoRef, cameraOn, captured }) {
  if (captured) {
    return (
      <Viewfinder>
        <img
          src={captured}
          alt="captured"
          className="w-full h-full object-cover"
          data-testid="captured-preview"
        />
      </Viewfinder>
    );
  }
  if (cameraOn) {
    return (
      <Viewfinder>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          data-testid="camera-video"
        />
        <div className="absolute inset-x-12 top-12 bottom-12 overflow-hidden pointer-events-none">
          <div className="h-0.5 w-full bg-brand-accent shadow-[0_0_18px_2px_rgba(193,213,68,0.7)] animate-scanline" />
        </div>
      </Viewfinder>
    );
  }
  return (
    <Viewfinder>
      <div className="absolute inset-0 grid place-items-center text-brand-cream/70">
        <div className="flex flex-col items-center gap-3">
          <Camera className="h-10 w-10 text-brand-accent" strokeWidth={1.5} />
          <span className="font-sans text-sm">Camera idle</span>
        </div>
      </div>
    </Viewfinder>
  );
}

function Viewfinder({ children }) {
  return (
    <div className="viewfinder relative w-full aspect-[4/3] bg-brand-dark rounded-2xl overflow-hidden">
      <span className="vf-bl" />
      <span className="vf-br" />
      {children}
    </div>
  );
}

function CameraControls({
  cameraOn,
  captured,
  fileRef,
  onStartCamera,
  onStopCamera,
  onCapture,
  onReset,
  onUploadFile,
}) {
  if (captured) {
    return (
      <div className="grid grid-cols-2 gap-3 mt-5">
        <button
          data-testid="retake-btn"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 bg-brand-cream border border-line text-ink font-semibold px-4 py-3 rounded-full hover:border-brand-primary"
        >
          <RotateCcw className="h-4 w-4" /> Retake
        </button>
      </div>
    );
  }
  if (cameraOn) {
    return (
      <div className="grid grid-cols-2 gap-3 mt-5">
        <button
          data-testid="capture-btn"
          onClick={onCapture}
          className="inline-flex items-center justify-center gap-2 bg-brand-accent text-brand-dark font-bold px-4 py-3 rounded-full hover:bg-brand-accentHover shadow-accent"
        >
          <ScanLine className="h-4 w-4" /> Capture
        </button>
        <button
          onClick={onStopCamera}
          className="inline-flex items-center justify-center gap-2 bg-surface border border-line text-ink-soft font-semibold px-4 py-3 rounded-full hover:bg-line/30"
        >
          <CameraOff className="h-4 w-4" /> Stop
        </button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 mt-5">
      <button
        data-testid="start-camera-btn"
        onClick={onStartCamera}
        className="inline-flex items-center justify-center gap-2 bg-brand-primary text-white font-semibold px-4 py-3 rounded-full hover:bg-brand-primaryHover shadow-glow"
      >
        <Camera className="h-4 w-4" /> Start camera
      </button>
      <button
        data-testid="upload-image-btn"
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center justify-center gap-2 bg-surface border border-line text-ink font-semibold px-4 py-3 rounded-full hover:border-brand-primary"
      >
        <Upload className="h-4 w-4" /> Upload image
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onUploadFile(e.target.files?.[0])}
        data-testid="upload-file-input"
      />
    </div>
  );
}
