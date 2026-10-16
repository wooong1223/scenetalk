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
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(12, 10, 9, 0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        pointerEvents: "none",
        fontFamily: "var(--sans)",
      }}
    >
      <div className="st-hud-card" style={{ width: 380, padding: "26px 28px", textAlign: "center" }}>
        <div className="st-eyebrow" style={{ marginBottom: 8 }}>SceneTalk · Roleplay</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>{label}</div>
        {sub && (
          <div style={{ color: "var(--body)", fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>{sub}</div>
        )}
        <div
          className="st-shimmer"
          style={{ width: "100%", height: 6, borderRadius: 6, marginTop: 18, background: "#ececf1" }}
        />
      </div>
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

  // Only open the voice session once the scene is actually on screen, so the
  // character's first line lands on a painted set instead of a black screen.
  const panoReady = useSceneStore((s) => s.panoReady);
  const sceneReady = mediaStatus === "failed" || panoReady;
  const [voiceOn, setVoiceOn] = useState(false);
  useEffect(() => {
    if (!sceneReady) return;
    const t = window.setTimeout(() => setVoiceOn(true), 600); // a beat after the set appears
    return () => window.clearTimeout(t);
  }, [sceneReady]);

  const {
    startTalking,
    stopTalking,
    sendUserText,
    sendGaze,
    sendObjectSelected,
    sendTriggerEvent,
  } = useLiveVoice(loading || error || !voiceOn ? null : sessionId);

  if (loading) {
    return <SceneLoadingOverlay label="Opening the scene" sub="Loading your session" />;
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
        Couldn't load this session: {error}
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
          label="Painting the scene"
          sub={
            character
              ? `${character.display_name_ko} will greet you as soon as the set is ready.`
              : "The character will greet you as soon as the set is ready."
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
