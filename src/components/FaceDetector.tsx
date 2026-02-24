import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

type BgMode = "bg-default" | "bg-happy" | "bg-sad" | "bg-angry" | "bg-heart";
type PairResult = "Match" | "Not Match" | "No pair detected";

// const API_BASE_URL = (
//   import.meta.env.VITE_API_BASE_URL ?? "/backend/api"
// ).replace(/\/$/, "");
const API_BASE_URL = "http://localhost/app-1/backend/api";
const SAVE_INTERVAL_MS = 5000;

type DetectionPayload = {
  male_count: number;
  female_count: number;
  pair_result: PairResult;
  expressions_json: string;
  dominant_expression: string;
  average_age: number;
};

type RegisteredFace = {
  id: number;
  person_name: string;
  person_notes: string;
  descriptor: number[];
};

const FACE_MATCH_THRESHOLD = 0.5;

function euclideanDistance(
  source: Float32Array | number[],
  target: number[],
): number {
  if (source.length !== target.length) {
    return Number.POSITIVE_INFINITY;
  }

  let sum = 0;
  for (let index = 0; index < source.length; index += 1) {
    const diff = source[index] - target[index];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

export default function FaceDetector() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const lastSavedAtRef = useRef(0);
  const isSavingRef = useRef(false);
  const latestDescriptorRef = useRef<Float32Array | null>(null);
  const [loading, setLoading] = useState(true);
  const [bgMode, setBgMode] = useState<BgMode>("bg-default");
  const [pairMessage, setPairMessage] =
    useState<PairResult>("No pair detected");
  const [registeredFaces, setRegisteredFaces] = useState<RegisteredFace[]>([]);
  const [pendingPersonId, setPendingPersonId] = useState<number | null>(null);
  const [personName, setPersonName] = useState("");
  const [personNotes, setPersonNotes] = useState("");
  const [enrollMessage, setEnrollMessage] = useState("");
  const [recognizedName, setRecognizedName] = useState("Unknown");

  // Start webcam
  const startVideo = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  };

  const saveDetectionToBackend = async (payload: DetectionPayload) => {
    const response = await fetch(`${API_BASE_URL}/save_detection.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`save_detection failed (${response.status})`);
    }
  };

  const fetchStatistics = async () => {
    const response = await fetch(`${API_BASE_URL}/get_statistics.php`);
    if (!response.ok) {
      throw new Error(`get_statistics failed (${response.status})`);
    }
    return response.json();
  };

  const fetchRegisteredFaces = async () => {
    const response = await fetch(`${API_BASE_URL}/get_registered_faces.php`);
    if (!response.ok) {
      throw new Error(`get_registered_faces failed (${response.status})`);
    }

    const data = (await response.json()) as {
      success: boolean;
      faces: RegisteredFace[];
    };

    if (!data.success) {
      throw new Error("Failed to load registered faces");
    }

    setRegisteredFaces(data.faces ?? []);
  };

  const registerFace = async (descriptor: number[]) => {
    const response = await fetch(`${API_BASE_URL}/register_face.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descriptor }),
    });

    if (!response.ok) {
      throw new Error(`register_face failed (${response.status})`);
    }

    return (await response.json()) as {
      success: boolean;
      person_id?: number;
      message?: string;
    };
  };

  const savePersonDetails = async (
    personId: number,
    name: string,
    notes: string,
  ) => {
    const response = await fetch(`${API_BASE_URL}/save_person_details.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        person_name: name,
        person_notes: notes,
      }),
    });

    if (!response.ok) {
      throw new Error(`save_person_details failed (${response.status})`);
    }
  };

  const handleRegisterFace = async () => {
    const descriptor = latestDescriptorRef.current;
    if (!descriptor) {
      setEnrollMessage("No face detected yet. Look at the camera first.");
      return;
    }

    try {
      const data = await registerFace(Array.from(descriptor));
      if (!data.success || !data.person_id) {
        setEnrollMessage("Unable to register face.");
        return;
      }

      setPendingPersonId(data.person_id);
      setEnrollMessage(
        `Face registered (ID ${data.person_id}). Add person details now.`,
      );
    } catch (error) {
      console.error(error);
      setEnrollMessage("Failed to register face.");
    }
  };

  const handleSavePersonDetails = async () => {
    if (!pendingPersonId) {
      setEnrollMessage("Register a face first.");
      return;
    }

    const trimmedName = personName.trim();
    if (!trimmedName) {
      setEnrollMessage("Person name is required.");
      return;
    }

    try {
      await savePersonDetails(pendingPersonId, trimmedName, personNotes.trim());
      await fetchRegisteredFaces();
      setEnrollMessage(`Person details saved for "${trimmedName}".`);
      setPendingPersonId(null);
      setPersonName("");
      setPersonNotes("");
    } catch (error) {
      console.error(error);
      setEnrollMessage("Failed to save person details.");
    }
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

    if (detectionIntervalRef.current) {
      window.clearInterval(detectionIntervalRef.current);
    }

    detectionIntervalRef.current = window.setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(video)
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions()
        .withAgeAndGender();

      latestDescriptorRef.current =
        detections.length > 0 ? detections[0].descriptor : null;

      if (detections.length > 0 && registeredFaces.length > 0) {
        const probe = detections[0].descriptor;
        let bestMatchName = "Unknown";
        let bestDistance = Number.POSITIVE_INFINITY;

        for (const face of registeredFaces) {
          const distance = euclideanDistance(probe, face.descriptor);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatchName = face.person_name;
          }
        }

        const matchName =
          bestDistance <= FACE_MATCH_THRESHOLD ? bestMatchName : "Unknown";
        setRecognizedName((previous) =>
          previous === matchName ? previous : matchName,
        );
      } else {
        setRecognizedName((previous) =>
          previous === "Unknown" ? previous : "Unknown",
        );
      }

      const hasMale = detections.some(
        (detection) => detection.gender === "male",
      );
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

        if (strongestExpression?.label === "angry") {
          nextMode = "bg-angry";
        } else if (strongestExpression?.label === "happy") {
          nextMode = "bg-happy";
        } else if (strongestExpression?.label === "sad") {
          nextMode = "bg-sad";
        }
      }

      setBgMode(nextMode);
      let pairResult: PairResult = "No pair detected";
      if (maleCount >= 1 && femaleCount >= 1) {
        pairResult = "Match";
      } else if (maleCount >= 2 || femaleCount >= 2) {
        pairResult = "Not Match";
      }
      setPairMessage(pairResult);

      const expressionTotals: Record<string, number> = {};
      let ageSum = 0;
      for (const detection of detections) {
        ageSum += detection.age;
        for (const [label, score] of Object.entries(detection.expressions)) {
          expressionTotals[label] = (expressionTotals[label] ?? 0) + score;
        }
      }

      const dominantExpression =
        Object.entries(expressionTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ??
        "";

      const now = Date.now();
      if (
        detections.length > 0 &&
        !isSavingRef.current &&
        now - lastSavedAtRef.current >= SAVE_INTERVAL_MS
      ) {
        isSavingRef.current = true;
        const payload: DetectionPayload = {
          male_count: maleCount,
          female_count: femaleCount,
          pair_result: pairResult,
          expressions_json: JSON.stringify(expressionTotals),
          dominant_expression: dominantExpression,
          average_age: ageSum / detections.length,
        };

        void saveDetectionToBackend(payload)
          .then(fetchStatistics)
          .catch((error) => {
            console.error("Backend sync error:", error);
          })
          .finally(() => {
            isSavingRef.current = false;
            lastSavedAtRef.current = Date.now();
          });
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
    }, 100);
  };

  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      const MODEL_URL = "/models";

      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
      ]);

      if (!isMounted) return;
      setLoading(false);
      await startVideo();
    };

    void initialize().catch((error) => {
      console.error("Failed to initialize models/camera:", error);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRegisteredFaces().catch((error) => {
      console.error("Failed to load registered faces:", error);
    });
    return () => {
      isMounted = false;
      if (detectionIntervalRef.current) {
        window.clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const classes: BgMode[] = [
      "bg-default",
      "bg-happy",
      "bg-sad",
      "bg-angry",
      "bg-heart",
    ];
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
        {loading && (
          <p className="status-pill status-neutral">Loading AI models...</p>
        )}
        {!loading && <p className={pairClass}>{pairMessage}</p>}
        {!loading && (
          <p className="status-pill status-neutral">
            Recognized: <strong>{recognizedName}</strong>
          </p>
        )}

        <div className="enroll-panel">
          <p className="enroll-title">Face Registration</p>
          <p className="enroll-text">
            Step 1: Register face. Step 2: Save person details.
          </p>
          <div className="enroll-actions">
            <button
              type="button"
              className="enroll-button"
              onClick={() => void handleRegisterFace()}>
              Register Current Face
            </button>
            <span className="enroll-meta">
              Registered People: {registeredFaces.length}
            </span>
          </div>
          <div className="enroll-form">
            <input
              type="text"
              placeholder="Person name"
              value={personName}
              onChange={(event) => setPersonName(event.target.value)}
              className="enroll-input"
            />
            <input
              type="text"
              placeholder="Optional details"
              value={personNotes}
              onChange={(event) => setPersonNotes(event.target.value)}
              className="enroll-input"
            />
            <button
              type="button"
              className="enroll-button"
              onClick={() => void handleSavePersonDetails()}>
              Save Person Details
            </button>
          </div>
          {pendingPersonId && (
            <p className="enroll-text">
              Pending registration ID: {pendingPersonId}
            </p>
          )}
          {enrollMessage && <p className="enroll-text">{enrollMessage}</p>}
        </div>

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
