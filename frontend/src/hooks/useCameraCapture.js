import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const DEFAULT_CAPTURE_WIDTH = 800;
const DEFAULT_CAPTURE_HEIGHT = 600;
const JPEG_QUALITY = 0.85;

/**
 * Manages the device-camera lifecycle and a single captured image.
 * Returns:
 *   videoRef – ref to attach to a <video> element
 *   cameraOn – boolean
 *   captured – data-URL string or null
 *   startCamera / stopCamera / capture / acceptFile / reset – actions
 */
export function useCameraCapture() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [captured, setCaptured] = useState(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  }, []);

  // Always release the camera on unmount.
  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (_err) {
      toast.error("Camera unavailable. Use 'Upload image' instead.");
    }
  }, []);

  const capture = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || DEFAULT_CAPTURE_WIDTH;
    canvas.height = v.videoHeight || DEFAULT_CAPTURE_HEIGHT;
    canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
    setCaptured(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    stopCamera();
  }, [stopCamera]);

  const acceptFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCaptured(reader.result);
    reader.readAsDataURL(file);
  }, []);

  const reset = useCallback(() => {
    setCaptured(null);
    stopCamera();
  }, [stopCamera]);

  return {
    videoRef,
    cameraOn,
    captured,
    setCaptured,
    startCamera,
    stopCamera,
    capture,
    acceptFile,
    reset,
  };
}
