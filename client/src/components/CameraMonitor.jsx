import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, HeartPulse, ScanFace, ShieldAlert, Sparkles, Waves } from "lucide-react";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import SignalGraph from "./SignalGraph";
import { Panel, SoftInfo, StatusBanner } from "./common";
import { analyzeSignal, trimSignalWindow } from "../utils/cameraSignal";
import { postCameraPredict } from "../lib/api";

const TARGET_FPS = 12;
const CAMERA_WINDOW_MS = 15000;

export default function CameraMonitor() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const sampleCanvasRef = useRef(null);
  const rafRef = useRef(0);
  const lastProcessedRef = useRef(0);
  const isCameraOnRef = useRef(false);
  const detectorRef = useRef(null);
  const signalSamplesRef = useRef([]);
  const postTimeoutRef = useRef(0);
  const lastBpmSentRef = useRef(0);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [permissionError, setPermissionError] = useState("");
  const [cameraMetrics, setCameraMetrics] = useState({
    bpm: null,
    status: "Camera idle",
    quality: { label: "Low", score: 0 },
    stress: { label: "Calibrating", index: 0 },
    waveform: []
  });
  const [serverInsights, setServerInsights] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFaceDetector() {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
        if (cancelled) return;

        detectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
          },
          runningMode: "VIDEO"
        });
      } catch (error) {
        if (!cancelled) {
          setPermissionError(error.message || "Unable to load face detection.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingModel(false);
        }
      }
    }

    loadFaceDetector();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafRef.current);
      window.clearTimeout(postTimeoutRef.current);
      detectorRef.current?.close?.();
    };
  }, []);

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    setPermissionError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 960 },
          height: { ideal: 540 }
        },
        audio: false
      });

      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      isCameraOnRef.current = true;
      setIsCameraOn(true);
      signalSamplesRef.current = [];
      setCameraMetrics({
        bpm: null,
        status: "Detecting face",
        quality: { label: "Low", score: 0 },
        stress: { label: "Calibrating", index: 0 },
        waveform: []
      });
      processFrame();
    } catch (error) {
      setPermissionError(error.message || "Camera access was denied.");
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    window.cancelAnimationFrame(rafRef.current);
    isCameraOnRef.current = false;
    setIsCameraOn(false);
    setCameraMetrics((current) => ({
      ...current,
      status: "Camera idle",
      waveform: []
    }));
  }

  async function processFrame() {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    const detector = detectorRef.current;

    if (!video || !overlay || !detector || !isCameraOnRef.current) {
      return;
    }

    const now = performance.now();
    const elapsed = now - lastProcessedRef.current;

    if (elapsed >= 1000 / TARGET_FPS) {
      lastProcessedRef.current = now;
      drawOverlay(overlay, video);

      const detectionResult = detector.detectForVideo(video, now);
      const primaryFace = selectPrimaryFace(detectionResult?.detections || []);

      if (primaryFace) {
        const foreheadSample = extractForeheadSample(video, sampleCanvasRef.current, primaryFace);
        if (foreheadSample) {
          signalSamplesRef.current = trimSignalWindow(
            [...signalSamplesRef.current, { time: Date.now(), value: foreheadSample.green }],
            CAMERA_WINDOW_MS
          );

          const faceAreaRatio = primaryFace.width * primaryFace.height / (video.videoWidth * video.videoHeight);
          const analysis = analyzeSignal(signalSamplesRef.current, faceAreaRatio);
          setCameraMetrics({
            bpm: analysis.bpm,
            status: analysis.status,
            quality: analysis.quality,
            stress: analysis.stress,
            waveform: analysis.filteredSignal.slice(-160)
          });

          drawFaceGuide(overlay, primaryFace, analysis.quality.label);
          maybeSendToBackend(analysis, faceAreaRatio);
        }
      } else {
        setCameraMetrics((current) => ({
          ...current,
          bpm: null,
          status: "Detecting face",
          quality: { label: "Low", score: 0 },
          waveform: []
        }));
      }
    }

    rafRef.current = window.requestAnimationFrame(processFrame);
  }

  function maybeSendToBackend(analysis, faceAreaRatio) {
    if (!analysis.bpm || analysis.bpm === lastBpmSentRef.current) {
      return;
    }

    lastBpmSentRef.current = analysis.bpm;
    window.clearTimeout(postTimeoutRef.current);
    postTimeoutRef.current = window.setTimeout(async () => {
      try {
        const payload = await postCameraPredict({
          bpm: analysis.bpm,
          quality: analysis.quality.label,
          qualityScore: analysis.quality.score,
          stressIndex: analysis.stress.index,
          faceAreaRatio,
          samples: signalSamplesRef.current.slice(-90)
        });
        setServerInsights(payload);
      } catch {
        setServerInsights(null);
      }
    }, 350);
  }

  const cameraReady = !isLoadingModel && !permissionError;
  const qualityTone = cameraMetrics.quality.label === "High" ? "info" : cameraMetrics.quality.label === "Medium" ? "warning" : "error";

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
        <Panel
          title="Live video preview"
          subtitle="Align the subject's face, keep the forehead visible, and hold steady for 10 to 15 seconds."
          actions={
            <div className="flex flex-wrap gap-3">
              <button
                onClick={startCamera}
                disabled={!cameraReady || isCameraOn}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Camera className="h-4 w-4" />
                Start camera
              </button>
              <button
                onClick={stopCamera}
                disabled={!isCameraOn}
                className="inline-flex items-center gap-2 rounded-full border border-[#d2dfec] px-5 py-3 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <CameraOff className="h-4 w-4" />
                Stop camera
              </button>
            </div>
          }
        >
          <div className="relative overflow-hidden rounded-[28px] border border-[#d9e6f3] bg-[#0c2145]">
            <video ref={videoRef} playsInline muted className="aspect-video w-full object-cover" />
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
            <canvas ref={sampleCanvasRef} data-camera-sample="true" className="hidden" />
            {!isCameraOn ? (
              <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(160deg,rgba(8,28,58,0.82),rgba(17,70,104,0.55))] text-center text-white">
                <div className="max-w-md px-6">
                  <ScanFace className="mx-auto h-12 w-12 text-[var(--accent)]" />
                  <p className="mt-4 text-xl font-bold">Camera Mode</p>
                  <p className="mt-2 text-sm leading-6 text-white/72">Use the front-facing camera to estimate pulse using tiny forehead color changes. Readings are approximate and not medical-grade.</p>
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <StatusBanner label="Mode" detail="Camera-based health monitoring" />
            <StatusBanner label="Status" detail={cameraMetrics.status} tone={cameraMetrics.status === "Stable reading" ? "info" : "warning"} />
            <StatusBanner label="Signal quality" detail={cameraMetrics.quality.label} tone={qualityTone} />
          </div>
          {permissionError ? <div className="mt-4 rounded-2xl border border-[#f1d1d3] bg-[#fff6f6] px-4 py-3 text-sm text-[#9a4250]">{permissionError}</div> : null}
        </Panel>

        <Panel title="Real-time camera metrics" subtitle="Derived from the forehead photoplethysmography signal.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <MetricTile icon={HeartPulse} label="Estimated BPM" value={cameraMetrics.bpm ? `${cameraMetrics.bpm}` : "--"} detail={cameraMetrics.status} />
            <MetricTile icon={Sparkles} label="Stress estimate" value={`${cameraMetrics.stress.index || 0}/100`} detail={cameraMetrics.stress.label} />
            <MetricTile icon={Waves} label="Signal quality" value={cameraMetrics.quality.label} detail={`Score ${cameraMetrics.quality.score}`} />
            <MetricTile
              icon={ShieldAlert}
              label="Backend guidance"
              value={serverInsights?.status || "Pending"}
              detail={serverInsights?.recommendation || "Optional /camera-predict endpoint refines camera-derived output."}
            />
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Panel title="Signal waveform" subtitle="Green-channel forehead signal after detrending, bandpass filtering, and FFT selection.">
          <SignalGraph data={cameraMetrics.waveform} />
        </Panel>

        <Panel title="Accuracy notes" subtitle="Built-in safeguards for camera-based readings.">
          <div className="grid gap-4">
            <SoftInfo label="Reading disclaimer" value="Camera-based readings are approximate and not medical-grade." />
            <SoftInfo label="Best positioning" value="Keep one face centered, forehead visible, and stay still in steady light." />
            <SoftInfo label="Auto-switch behavior" value="Use sensors as the primary source and fall back to camera mode when sensor history is sparse." />
            <SoftInfo label="Multiple faces" value="The largest face in frame is selected as the primary subject." />
          </div>
        </Panel>
      </div>
    </section>
  );
}

function MetricTile({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-[24px] border border-[#dce6f0] bg-[#f9fbff] p-5">
      <div className="flex items-center gap-3 text-[#0fb9e6]">
        <Icon className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7892b3]">{label}</span>
      </div>
      <div className="mt-4 text-4xl font-black text-[var(--ink)]">{value}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</div>
    </div>
  );
}

function drawOverlay(canvas, video) {
  const context = canvas.getContext("2d");
  canvas.width = video.videoWidth || canvas.clientWidth;
  canvas.height = video.videoHeight || canvas.clientHeight;
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawFaceGuide(canvas, face, qualityLabel) {
  const context = canvas.getContext("2d");
  const tone = qualityLabel === "High" ? "#29d391" : qualityLabel === "Medium" ? "#f0b22a" : "#f06464";
  context.strokeStyle = tone;
  context.lineWidth = 4;
  context.strokeRect(face.x, face.y, face.width, face.height);

  const forehead = getForeheadRegion(face);
  context.strokeStyle = "#6ef0f8";
  context.setLineDash([8, 6]);
  context.strokeRect(forehead.x, forehead.y, forehead.width, forehead.height);
  context.setLineDash([]);
}

function selectPrimaryFace(detections) {
  if (!detections.length) return null;

  const [largest] = detections
    .map((detection) => detection.boundingBox)
    .filter(Boolean)
    .sort((left, right) => right.width * right.height - left.width * left.height);

  if (!largest) return null;

  return {
    x: largest.originX,
    y: largest.originY,
    width: largest.width,
    height: largest.height
  };
}

function getForeheadRegion(face) {
  return {
    x: face.x + face.width * 0.32,
    y: face.y + face.height * 0.12,
    width: face.width * 0.36,
    height: face.height * 0.18
  };
}

function extractForeheadSample(video, canvas, face) {
  if (!canvas) return null;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const forehead = getForeheadRegion(face);
  const x = Math.max(0, Math.floor(forehead.x));
  const y = Math.max(0, Math.floor(forehead.y));
  const width = Math.max(1, Math.floor(Math.min(forehead.width, canvas.width - x)));
  const height = Math.max(1, Math.floor(Math.min(forehead.height, canvas.height - y)));
  const data = context.getImageData(x, y, width, height).data;

  let greenSum = 0;
  let redSum = 0;
  let blueSum = 0;
  let pixels = 0;

  for (let index = 0; index < data.length; index += 16) {
    redSum += data[index];
    greenSum += data[index + 1];
    blueSum += data[index + 2];
    pixels += 1;
  }

  if (!pixels) return null;

  return {
    green: greenSum / pixels,
    red: redSum / pixels,
    blue: blueSum / pixels
  };
}
