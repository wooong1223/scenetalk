import { useEffect, useState } from "react";
import { EnterButton } from "./EnterButton";
import { ExplainCard, ExtExpressionNuance } from "./ExplainCard";
import { SavedExpressions } from "./SavedExpressions";
import { ExtSubtitleLine, SubtitleList } from "./SubtitleList";

declare const chrome: any;

const DEFAULT_API_BASE = "http://localhost:8000";

export function SidePanel() {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [videoId, setVideoId] = useState("V1b8VxrkbZU");
  const [currentTime, setCurrentTime] = useState(29.0);
  const [screenshotB64, setScreenshotB64] = useState<string | null>(null);

  const [lines, setLines] = useState<ExtSubtitleLine[]>([]);
  const [activeLine, setActiveLine] = useState<ExtSubtitleLine | null>(null);
  const [nuance, setNuance] = useState<ExtExpressionNuance | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  const [savedExpressions, setSavedExpressions] = useState<string[]>([
    "정체를 숨기다",
    "밀명을 받다",
  ]);
  const [entering, setEntering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Poll active YouTube tab for videoId + currentTime
  useEffect(() => {
    const poll = () => {
      if (typeof chrome === "undefined" || !chrome.tabs) return;
      chrome.tabs.query(
        { active: true, currentWindow: true },
        (tabs: Array<{ id?: number }>) => {
          const tabId = tabs?.[0]?.id;
          if (!tabId) return;
          chrome.tabs.sendMessage(
            tabId,
            { type: "GET_VIDEO_STATE" },
            (resp?: {
              videoId?: string;
              currentTime?: number;
              screenshotB64?: string | null;
            }) => {
              if (chrome.runtime?.lastError || !resp) return;
              if (resp.videoId && resp.videoId !== videoId) {
                setVideoId(resp.videoId);
              }
              if (typeof resp.currentTime === "number") {
                setCurrentTime(resp.currentTime);
              }
              if (resp.screenshotB64) {
                setScreenshotB64(resp.screenshotB64);
              }
            }
          );
        }
      );
    };

    poll();
    const timer = window.setInterval(poll, 1200);
    return () => window.clearInterval(timer);
  }, [videoId]);

  // Fetch subtitle lines when videoId or apiBase changes
  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBase}/api/subtitles/${encodeURIComponent(videoId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const loaded: ExtSubtitleLine[] = data.lines || [];
        setLines(loaded);
        if (loaded.length > 0 && !activeLine) {
          setActiveLine(loaded[Math.min(4, loaded.length - 1)]);
        }
      })
      .catch(() => {
        // fallback if server not reachable yet
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, videoId]);

  const handleSelectLine = async (line: ExtSubtitleLine, token?: string) => {
    setActiveLine(line);
    setLoadingExplain(true);
    setErrorMsg(null);

    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query(
        { active: true, currentWindow: true },
        (tabs: Array<{ id?: number }>) => {
          const tabId = tabs?.[0]?.id;
          if (tabId) {
            chrome.tabs.sendMessage(tabId, {
              type: "SEEK_VIDEO",
              timeSec: line.start_sec,
            });
          }
        }
      );
    }

    try {
      const targetExpr =
        token ||
        (line.tokens && line.tokens.length > 0 ? line.tokens[0] : line.text_ko);
      const res = await fetch(`${apiBase}/api/subtitles/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: videoId,
          timestamp_sec: line.start_sec,
          line_ko: line.text_ko,
          target_expression: targetExpr,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ExtExpressionNuance = await res.json();
      setNuance(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingExplain(false);
    }
  };

  const handleSaveExpression = (expr: string) => {
    setSavedExpressions((prev) =>
      prev.includes(expr) ? prev : [...prev, expr]
    );
  };

  const handleRemoveExpression = (expr: string) => {
    setSavedExpressions((prev) => prev.filter((e) => e !== expr));
  };

  const handleEnterScene = async () => {
    if (entering) return;
    setEntering(true);
    setErrorMsg(null);
    try {
      const ts = activeLine ? activeLine.start_sec : currentTime || 29.0;
      const res = await fetch(`${apiBase}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: videoId,
          timestamp_sec: ts,
          saved_expressions:
            savedExpressions.length > 0 ? savedExpressions : ["정체를 숨기다"],
          scene_screenshot_b64: screenshotB64,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const session = await res.json();
      const targetUrl = `${apiBase}/scene/${encodeURIComponent(
        session.session_id
      )}`;
      window.open(targetUrl, "_blank");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setEntering(false);
    }
  };

  return (
    <div
      style={{
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
          paddingBottom: "10px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 800,
              color: "#d8b4fe",
            }}
          >
            GEMINI 4 ARGON · WATCH MODE
          </div>
          <div style={{ fontSize: "16px", fontWeight: 900 }}>
            SceneTalk Companion
          </div>
        </div>
        <span
          style={{
            fontSize: "11px",
            background: "rgba(59, 130, 246, 0.2)",
            color: "#93c5fd",
            padding: "3px 8px",
            borderRadius: "999px",
            fontFamily: "monospace",
          }}
        >
          ID: {videoId}
        </span>
      </div>

      {/* Server Endpoint Selector */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: "#94a3b8" }}>Server:</span>
        <input
          type="text"
          value={apiBase}
          onChange={(e) => setApiBase(e.target.value.replace(/\/$/, ""))}
          style={{
            flex: 1,
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            borderRadius: "6px",
            padding: "4px 8px",
            color: "#e2e8f0",
            fontSize: "11px",
          }}
        />
      </div>

      {/* Subtitle List */}
      <SubtitleList
        lines={lines}
        currentTime={currentTime}
        activeLine={activeLine}
        onSelectLine={handleSelectLine}
      />

      {/* Argon Nuance Card */}
      <ExplainCard
        loading={loadingExplain}
        nuance={nuance}
        savedExpressions={savedExpressions}
        onSaveExpression={handleSaveExpression}
      />

      {/* Saved Expressions */}
      <SavedExpressions
        expressions={savedExpressions}
        onRemove={handleRemoveExpression}
      />

      {errorMsg && (
        <div style={{ fontSize: "11px", color: "#fca5a5" }}>
          오류: {errorMsg}
        </div>
      )}

      {/* Enter 3D Scene CTA */}
      <EnterButton loading={entering} onEnter={handleEnterScene} />
    </div>
  );
}
