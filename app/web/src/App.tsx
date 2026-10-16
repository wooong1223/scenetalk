import { useEffect, useState } from "react";
import { getSession } from "./api/client";
import { useLiveVoice } from "./audio/useLiveVoice";
import { usePathname } from "./router";
import { SceneCanvas } from "./scene/SceneCanvas";
import { useSceneStore } from "./state/sceneStore";
import { Hud } from "./ui/Hud";
import { LauncherPage } from "./ui/LauncherPage";
import { LessonPage } from "./ui/LessonPage";
import { ResultPage } from "./ui/ResultPage";

function SceneLoadingOverlay({ label, sub }: { label: string; sub?: string }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        background:
          "radial-gradient(ellipse at 50% 60%, #2a211a 0%, #120f0d 55%, #0c0a09 100%)",
        color: "var(--paper)",
        pointerEvents: "none",
      }}
    >
      <div
        className="st-serif"
        style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.01em" }}
      >
        {label}
      </div>
      {sub && <div style={{ color: "var(--smoke)", fontSize: 14 }}>{sub}</div>}
      <div
        className="st-shimmer"
        style={{ width: 260, height: 4, borderRadius: 4, marginTop: 6 }}
      />
    </div>
  );
}

function ScenePage({ sessionId }: { sessionId: string }) {
  const setSession = useSceneStore((s) => s.setSession);
  const setMedia = useSceneStore((s) => s.setMedia);
  const media = useSceneStore((s) => s.media);
  const character = useSceneStore((s) => s.character);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pointerLockEnabled, setPointerLockEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSession(sessionId)
      .then((session) => {
        if (cancelled) return;
        setSession(session);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, setSession]);

  // Poll for Nano Banana media until ready/failed (max ~2 min)
  const mediaStatus = media?.status ?? "pending";
  useEffect(() => {
    if (loading || error) return;
    if (mediaStatus === "ready" || mediaStatus === "failed") return;
    let cancelled = false;
    let ticks = 0;
    const timer = window.setInterval(async () => {
      ticks += 1;
      if (ticks > 40) {
        window.clearInterval(timer);
        return;
      }
      try {
        const s = await getSession(sessionId);
        if (cancelled) return;
        if (s.media) setMedia(s.media);
        if (s.media?.status === "ready" || s.media?.status === "failed") {
          window.clearInterval(timer);
        }
      } catch {
        // keep polling
      }
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [sessionId, loading, error, mediaStatus, setMedia]);

  const {
    startTalking,
    stopTalking,
    sendUserText,
    sendGaze,
    sendObjectSelected,
    sendTriggerEvent,
  } = useLiveVoice(loading || error ? null : sessionId);

  if (loading) {
    return <SceneLoadingOverlay label="장면을 여는 중" sub="세션을 불러오고 있어요" />;
  }

  if (error) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--bad)",
        }}
      >
        세션을 불러올 수 없습니다: {error}
      </div>
    );
  }

  const waitingForPano = !media?.panorama_url && mediaStatus !== "failed";

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#0c0a09",
      }}
    >
      <SceneCanvas
        pointerLockEnabled={pointerLockEnabled}
        sendGaze={sendGaze}
        sendObjectSelected={sendObjectSelected}
      />
      {waitingForPano && (
        <SceneLoadingOverlay
          label="Nano Banana가 장면을 그리는 중"
          sub={
            character
              ? `${character.display_name_ko}이(가) 먼저 말을 걸어올 거예요. 음성은 이미 연결 중입니다.`
              : "음성은 이미 연결 중입니다."
          }
        />
      )}
      <Hud
        sessionId={sessionId}
        pointerLockEnabled={pointerLockEnabled}
        onTogglePointerLock={() => setPointerLockEnabled((v) => !v)}
        onStartMic={startTalking}
        onStopMic={stopTalking}
        onSendTextTurn={sendUserText}
        onTriggerEvent={sendTriggerEvent}
        onSelectObject={sendObjectSelected}
      />
    </div>
  );
}

export function App() {
  const pathname = usePathname();

  if (pathname.startsWith("/scene/")) {
    const sessionId = decodeURIComponent(pathname.replace("/scene/", "").split("/")[0]);
    return <ScenePage sessionId={sessionId} />;
  }

  if (pathname.startsWith("/result/")) {
    const sessionId = decodeURIComponent(pathname.replace("/result/", "").split("/")[0]);
    return <ResultPage sessionId={sessionId} />;
  }

  if (pathname.startsWith("/learn/")) {
    const videoId = decodeURIComponent(pathname.replace("/learn/", "").split("/")[0]);
    return <LessonPage videoId={videoId} />;
  }

  return <LauncherPage />;
}
