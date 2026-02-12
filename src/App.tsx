import FaceDetector from "./components/FaceDetector";

export default function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="app-kicker">Vision Intelligence</p>
        <h1 className="app-title">Real-Time Face Analytics</h1>
        <p className="app-subtitle">
          Expression, age, and pair insight from your live camera feed.
        </p>
      </header>

      <FaceDetector />
    </main>
  );
}
