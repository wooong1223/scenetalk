import { useEffect, useState } from "react";
import { getSession } from "./api/client";
import { useLiveVoice } from "./audio/useLiveVoice";
import { usePathname } from "./router";
import { SceneCanvas } from "./scene/SceneCanvas";
import { useSceneStore } from "./state/sceneStore";
import { Hud } from "./ui/Hud";
import { LauncherPage } from "./ui/LauncherPage";
import { ResultPage } from "./ui/ResultPage";

function ScenePage({ sessionId }: { sessionId: string }) {
  const setSession = useSceneStore((s) => s.setSession);
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

  const {
    startTalking,
    stopTalking,
    sendUserText,
    sendGaze,
    sendObjectSelected,
    sendTriggerEvent,
  } = useLiveVoice(loading || error ? null : sessionId);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          background: "#090d16",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          fontFamily: "'Pretendard', sans-serif",
        }}
      >
        <div style={{ fontSize: "20px", fontWeight: 800 }}>
          🎬 3D 씬 및 Gemini 3.8 Live 음성 세션 준비 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          height: "100vh",
          background: "#090d16",
          color: "#f87171",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        세션을 불러올 수 없습니다: {error}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#090d16",
      }}
    >
      <SceneCanvas
        pointerLockEnabled={pointerLockEnabled}
        sendGaze={sendGaze}
        sendObjectSelected={sendObjectSelected}
      />
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

  return <LauncherPage />;
}
