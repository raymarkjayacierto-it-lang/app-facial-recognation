import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

type BgMode = "bg-default" | "bg-happy" | "bg-sad" | "bg-heart";

export default function FaceDetector() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [bgMode, setBgMode] = useState<BgMode>("bg-default");
  const [pairMessage, setPairMessage] = useState("No pair detected");

  // Start webcam
  const startVideo = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  };

  // Load models
  const loadModels = async () => {
    const MODEL_URL = "/models";

    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
    ]);

    setLoading(false);
    startVideo();
  };

  // Detect faces
  const handleVideoPlay = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    const displaySize = {
      width: video.videoWidth,
      height: video.videoHeight,
    };

    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    faceapi.matchDimensions(canvas, displaySize);

    const interval = setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(video)
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender();

      const hasMale = detections.some((detection) => detection.gender === "male");
      const hasFemale = detections.some(
        (detection) => detection.gender === "female",
      );
      const maleCount = detections.filter(
        (detection) => detection.gender === "male",
      ).length;
      const femaleCount = detections.filter(
        (detection) => detection.gender === "female",
      ).length;

      let nextMode: BgMode = "bg-default";
      if (hasMale && hasFemale) {
        nextMode = "bg-heart";
      } else {
        let strongestExpression: { label: string; score: number } | null = null;
        for (const detection of detections) {
          for (const [label, score] of Object.entries(detection.expressions)) {
            if (!strongestExpression || score > strongestExpression.score) {
              strongestExpression = { label, score };
            }
          }
        }

        if (strongestExpression?.label === "happy") {
          nextMode = "bg-happy";
        } else if (strongestExpression?.label === "sad") {
          nextMode = "bg-sad";
        }
      }

      setBgMode(nextMode);
      if (maleCount >= 1 && femaleCount >= 1) {
        setPairMessage("Match");
      } else if (maleCount >= 2 || femaleCount >= 2) {
        setPairMessage("Not Match");
      } else {
        setPairMessage("No pair detected");
      }

      const resized = faceapi.resizeResults(detections, displaySize);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      faceapi.draw.drawDetections(canvas, resized);
      faceapi.draw.drawFaceLandmarks(canvas, resized);
      faceapi.draw.drawFaceExpressions(canvas, resized);

      for (const detection of resized) {
        const ageText = `Age: ${Math.round(detection.age)}`;
        const { x, y } = detection.detection.box;
        const textX = x;
        const textY = y > 24 ? y - 8 : y + 24;

        ctx.font = "16px Arial";
        const textWidth = ctx.measureText(ageText).width;
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(textX - 4, textY - 16, textWidth + 8, 20);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(ageText, textX, textY);
      }
    }, 200);

    return () => clearInterval(interval);
  };

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    const classes: BgMode[] = ["bg-default", "bg-happy", "bg-sad", "bg-heart"];
    document.body.classList.remove(...classes);
    document.body.classList.add(bgMode);

    return () => {
      document.body.classList.remove(bgMode);
    };
  }, [bgMode]);

  const pairClass =
    pairMessage === "Match"
      ? "status-pill status-match"
      : pairMessage === "Not Match"
        ? "status-pill status-not-match"
        : "status-pill status-neutral";

  return (
    <section className="detector-shell">
      <div className="detector-panel">
        {loading && <p className="status-pill status-neutral">Loading AI models...</p>}
        {!loading && <p className={pairClass}>{pairMessage}</p>}

        <div className="detector-frame">
          <video
            ref={videoRef}
            autoPlay
            muted
            width="640"
            height="480"
            onPlay={handleVideoPlay}
            className="detector-video"
          />

          <canvas ref={canvasRef} className="detector-canvas" />
        </div>
      </div>
    </section>
  );
}
