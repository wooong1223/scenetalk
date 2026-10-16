import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createSession,
  explainSubtitle,
  ExpressionNuance,
  getSubtitles,
  loadSavedExpressions,
  parseYoutubeId,
  storeSavedExpressions,
  SubtitleLine,
} from "../api/client";
import { useAppNavigate } from "../router";
import { LanguageSelector, loadUiLanguage } from "./LanguageSelector";

const DEMO_URL = "https://www.youtube.com/watch?v=V1b8VxrkbZU";
const DEMO_ID = "V1b8VxrkbZU";
const DEFAULT_MISSION = ["정체를 숨기다", "밀정이 되란 소리예요?"];

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LauncherPage() {
  const navigate = useAppNavigate();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const initial = useMemo(() => {
    const qs = new URLSearchParams(window.location.search);
    const v = qs.get("v");
    const tab = qs.get("tab");
    return { v: v && parseYoutubeId(v) ? v : DEMO_ID, tab };
  }, []);

  const [urlInput, setUrlInput] = useState(
    initial.v === DEMO_ID ? DEMO_URL : `https://www.youtube.com/watch?v=${initial.v}`
  );
  const [videoId, setVideoId] = useState<string>(initial.v);
  const [urlError, setUrlError] = useState<string | null>(null);

  const [trackTitle, setTrackTitle] = useState<string>("");
  const [subtitles, setSubtitles] = useState<SubtitleLine[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [subsError, setSubsError] = useState<string | null>(null);

  const [activeSub, setActiveSub] = useState<SubtitleLine | null>(null);
  const [explainData, setExplainData] = useState<ExpressionNuance | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainingExpr, setExplainingExpr] = useState<string>("");
  const [linesOpen, setLinesOpen] = useState(false);

  const [saved, setSaved] = useState<string[]>(() => loadSavedExpressions(initial.v));
  const [customExpr, setCustomExpr] = useState("");

  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);

  const roleplayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingSubs(true);
    setSubsError(null);
    setExplainData(null);
    setActiveSub(null);
    setSaved(loadSavedExpressions(videoId));
    getSubtitles(videoId, true)
      .then((res) => {
        if (cancelled) return;
        setSubtitles(res.lines);
        setTrackTitle(res.title);
      })
      .catch((err) => {
        if (cancelled) return;
        setSubsError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingSubs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  useEffect(() => {
    if (initial.tab === "roleplay" && roleplayRef.current) {
      roleplayRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [initial.tab, subtitles.length]);

  const persistSaved = (next: string[]) => {
    setSaved(next);
    storeSavedExpressions(videoId, next);
  };

  const handleLoadUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseYoutubeId(urlInput);
    if (!id) {
      setUrlError("Paste a YouTube link or an 11-character video ID.");
      return;
    }
    setUrlError(null);
    setVideoId(id);
    window.history.replaceState({}, "", `/?v=${id}`);
  };

  const seekYoutubeTo = (sec: number) => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(
      JSON.stringify({ event: "command", func: "seekTo", args: [sec, true] }),
      "*"
    );
    frame.contentWindow.postMessage(
      JSON.stringify({ event: "command", func: "playVideo", args: [] }),
      "*"
    );
  };

  const handleExplainLine = async (line: SubtitleLine, token?: string) => {
    setActiveSub(line);
    seekYoutubeTo(line.start_sec);
    const targetExpr =
      token || (line.tokens && line.tokens.length > 0 ? line.tokens[0] : line.text_ko);
    setExplainingExpr(targetExpr);
    setExplainData(null); // clear the previous card so the loading state is visible
    setExplaining(true);
    try {
      const res = await explainSubtitle({
        video_id: videoId,
        timestamp_sec: line.start_sec,
        line_ko: line.text_ko,
        target_expression: targetExpr,
      });
      setExplainData(res);
    } catch (err) {
      console.error("Explain failed:", err);
    } finally {
      setExplaining(false);
    }
  };

  const toggleSaved = (expr: string) => {
    const next = saved.includes(expr) ? saved.filter((e) => e !== expr) : [...saved, expr];
    persistSaved(next);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const t = customExpr.trim();
    if (!t) return;
    if (!saved.includes(t)) persistSaved([...saved, t]);
    setCustomExpr("");
  };

  // Starter mission when nothing is saved: suggest from this clip's own subtitle tokens.
  const suggestedMission = (() => {
    if (videoId === DEMO_ID) return DEFAULT_MISSION;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const ln of subtitles) {
      for (const tok of ln.tokens || []) {
        const t = tok.trim();
        if (t.length < 2 || seen.has(t)) continue;
        seen.add(t);
        out.push(t);
        if (out.length >= 4) return out;
      }
    }
    if (out.length > 0) return out;
    return subtitles.slice(0, 2).map((ln) => ln.text_ko).filter(Boolean);
  })();
  const mission = saved.length > 0 ? saved : suggestedMission;

  const handleEnterScene = async () => {
    if (entering) return;
    setEntering(true);
    setEnterError(null);
    const mid = subtitles[Math.floor(subtitles.length / 2)];
    try {
      const res = await createSession({
        video_id: videoId,
        timestamp_sec: mid ? mid.start_sec : 0,
        saved_expressions: mission.slice(0, 6),
        ui_language: loadUiLanguage(),
      });
      navigate(`/scene/${res.session_id}`);
    } catch (err) {
      setEnterError(err instanceof Error ? err.message : String(err));
      setEntering(false);
    }
  };

  const lineCount = subtitles.length;

  return (
    <div className="st-page">
      <div className="st-wrap">
        <header className="st-header">
          <a className="st-logo" href="/">
            <span className="st-logo-mark">S</span>
            SceneTalk
          </a>
          <LanguageSelector />
        </header>

        {/* Hero */}
        <section style={{ padding: "34px 0 10px", maxWidth: 760 }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: "var(--ink)" }}>
            Learn Korean from the K-drama you're watching.
          </h1>
          <p style={{ fontSize: 17, color: "var(--body)", margin: "14px 0 0", maxWidth: 620 }}>
            Paste a clip. SceneTalk turns its real lines into a lesson, then lets you step into the
            scene and talk with its character.
          </p>
        </section>

        <form
          onSubmit={handleLoadUrl}
          className="st-card"
          style={{
            display: "flex",
            gap: 8,
            padding: 8,
            margin: "22px 0 8px",
            alignItems: "center",
            borderRadius: 18,
          }}
        >
          <input
            className="st-input"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            aria-label="YouTube link"
            style={{ border: 0, boxShadow: "none", fontSize: 16, padding: "12px 12px" }}
          />
          <button className="st-btn st-btn--violet" type="submit" style={{ padding: "13px 22px", flexShrink: 0 }}>
            Load clip
          </button>
        </form>
        <div style={{ minHeight: 22, fontSize: 13, color: urlError ? "var(--coral)" : "var(--muted)", paddingLeft: 4 }}>
          {urlError ?? "Works best with short clips that have Korean dialogue — teasers, previews, key scenes."}
        </div>

        {/* Video + summary */}
        <section
          className="st-two-col"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)",
            gap: 24,
            margin: "22px 0 28px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              position: "relative",
              paddingTop: "56.25%",
              background: "#000",
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "var(--shadow)",
            }}
          >
            <iframe
              ref={iframeRef}
              title="YouTube"
              src={`https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
            />
          </div>
          <div style={{ paddingTop: 2 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.35, fontFamily: "Pretendard, var(--sans)" }}>
              {loadingSubs ? "Reading the clip…" : trackTitle || "Untitled clip"}
            </h2>
            <p style={{ marginTop: 8, color: "var(--body)", fontSize: 14, lineHeight: 1.6 }}>
              {subsError
                ? "We couldn't read this clip's lines. Try another video."
                : loadingSubs
                ? "No subtitles on file, so Gemini is watching the video and transcribing its Korean lines. This can take up to a minute."
                : `${lineCount} lines · ${saved.length} saved expression${saved.length === 1 ? "" : "s"}`}
            </p>
            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {saved.map((e) => (
                <button
                  key={e}
                  className="st-chip st-chip--green"
                  onClick={() => toggleSaved(e)}
                  title="Remove from mission"
                  style={{ cursor: "pointer", fontFamily: "Pretendard, var(--sans)" }}
                >
                  {e} <span style={{ opacity: 0.55 }}>×</span>
                </button>
              ))}
              {saved.length === 0 && !loadingSubs && (
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  Expressions you learn or save will show up here and become your roleplay mission.
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Two modes */}
        <section
          className="st-two-col"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
        >
          {/* Lesson */}
          <div className="st-card st-card--pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ModeHeader
              tint="var(--green-tint)"
              color="var(--green)"
              glyph="가"
              step="Step 1"
              title="Expression lesson"
              desc="Learn the key expressions from this clip, then check yourself with meaning, fill-in-the-blank and matching questions."
            />
            <button
              className="st-btn st-btn--green st-btn--lg"
              onClick={() => navigate(`/learn/${videoId}`)}
              disabled={loadingSubs || !!subsError}
            >
              Start lesson
            </button>

            <button
              className="st-btn st-btn--ghost"
              onClick={() => setLinesOpen((v) => !v)}
              style={{ justifyContent: "space-between", padding: "8px 10px", fontSize: 14 }}
            >
              <span>Browse the clip's lines {lineCount ? `(${lineCount})` : ""}</span>
              <span aria-hidden>{linesOpen ? "▴" : "▾"}</span>
            </button>

            {linesOpen && (
              <>
                <div
                  className="st-scroll"
                  style={{ maxHeight: 240, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 12 }}
                >
                  {subtitles.map((line) => {
                    const active = activeSub?.index === line.index;
                    return (
                      <button
                        key={line.index}
                        onClick={() => handleExplainLine(line)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "44px 1fr",
                          gap: 10,
                          width: "100%",
                          textAlign: "left",
                          background: active ? "var(--green-tint)" : "transparent",
                          border: 0,
                          borderBottom: "1px solid var(--line)",
                          color: "var(--ink)",
                          padding: "10px 12px",
                          cursor: "pointer",
                          fontSize: 14,
                        }}
                      >
                        <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums", fontSize: 12, paddingTop: 2 }}>
                          {fmtTime(line.start_sec)}
                        </span>
                        <span>
                          <span style={{ fontWeight: 600, fontFamily: "Pretendard, var(--sans)" }}>{line.text_ko}</span>
                          <span style={{ display: "block", color: "var(--body)", fontSize: 12, marginTop: 2 }}>
                            {line.text_en}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {(explaining || explainData) && (
                  <div style={{ border: "1px solid #bfe8d2", borderRadius: 12, padding: 14, background: "var(--green-tint)" }}>
                    {explaining && !explainData ? (
                      <div aria-live="polite">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                          <div style={{ fontSize: 22, fontWeight: 800 }}>{explainingExpr}</div>
                          <span className="st-chip st-pulse" style={{ fontSize: 11 }}>● Analysing…</span>
                        </div>
                        <div className="st-pulse" style={{ marginTop: 8, fontSize: 13, color: "var(--body)" }}>
                          Gemini is working out the meaning, nuance and politeness level. Usually 5–15 seconds.
                        </div>
                        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                          {[92, 76, 60].map((w) => (
                            <div key={w} className="st-shimmer" style={{ height: 12, width: `${w}%`, borderRadius: 6 }} />
                          ))}
                        </div>
                      </div>
                    ) : explainData ? (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "Pretendard, var(--sans)" }}>
                            {explainData.expression}
                          </div>
                          <span className="st-chip" style={{ fontSize: 11 }}>{explainData.formality}</span>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 15, fontWeight: 500 }}>{explainData.meaning_en}</div>
                        <div style={{ marginTop: 2, fontSize: 13, color: "var(--body)" }}>{explainData.meaning_ko}</div>
                        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "var(--body)" }}>{explainData.nuance_note}</div>
                        {explainData.examples_ko?.length > 0 && (
                          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--body)" }}>
                            {explainData.examples_ko.slice(0, 2).map((ex, i) => (
                              <li key={i}>{ex}</li>
                            ))}
                          </ul>
                        )}
                        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            className={`st-btn ${saved.includes(explainData.expression) ? "" : "st-btn--green"}`}
                            onClick={() => toggleSaved(explainData.expression)}
                            style={{ padding: "8px 14px", fontSize: 13 }}
                          >
                            {saved.includes(explainData.expression) ? "Saved · remove" : "Save expression"}
                          </button>
                          {activeSub?.tokens?.slice(0, 4).map((tk) => (
                            <button
                              key={tk}
                              className="st-btn st-btn--ghost"
                              onClick={() => activeSub && handleExplainLine(activeSub, tk)}
                              style={{ padding: "8px 12px", fontSize: 13 }}
                            >
                              {tk}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                )}

                <form onSubmit={handleAddCustom} style={{ display: "flex", gap: 8 }}>
                  <input
                    className="st-input"
                    value={customExpr}
                    onChange={(e) => setCustomExpr(e.target.value)}
                    placeholder="Add your own expression"
                    style={{ padding: "10px 12px", fontSize: 14 }}
                  />
                  <button className="st-btn" type="submit" style={{ padding: "10px 14px", fontSize: 13 }}>
                    Add
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Roleplay */}
          <div ref={roleplayRef} className="st-card st-card--pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ModeHeader
              tint="var(--violet-tint)"
              color="var(--violet)"
              glyph="▶"
              step="Step 2"
              title="Enter this scene"
              desc="Step into the situation of this clip and talk with its counterpart character — out loud, in Korean, in a photoreal 360° set."
            />

            <div>
              <div style={{ fontSize: 14, color: "var(--ink)", marginBottom: 4, fontWeight: 700 }}>
                Your mission {saved.length === 0 && <span style={{ color: "var(--muted)", fontWeight: 500 }}>(suggested from this clip)</span>}
              </div>
              <div style={{ fontSize: 13, color: "var(--body)", marginBottom: 10, lineHeight: 1.45 }}>
                Work these expressions into the conversation naturally. The character reacts in real time, and your
                end-of-scene report shows which ones you used and how natural they sounded.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {mission.map((e) => (
                  <span key={e} className="st-chip st-chip--violet" style={{ fontFamily: "Pretendard, var(--sans)" }}>
                    {e}
                  </span>
                ))}
              </div>
            </div>

            <button
              className="st-btn st-btn--violet st-btn--lg"
              onClick={handleEnterScene}
              disabled={entering || loadingSubs}
            >
              {entering ? "Building your scene…" : "Enter the scene"}
            </button>
            {entering && (
              <div>
                <div className="st-shimmer" style={{ height: 6, borderRadius: 6 }} />
                <div style={{ marginTop: 8, fontSize: 13, color: "var(--body)", lineHeight: 1.6 }}>
                  Gemini reads the clip and designs your counterpart and the room, then paints the set.
                  About 30 seconds for the demo clip, up to a minute for a new one.
                </div>
              </div>
            )}
            {enterError && <div style={{ color: "var(--coral)", fontSize: 13 }}>{enterError}</div>}

            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
              When you finish, you get a report on how naturally you used your mission expressions.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ModeHeader({
  tint,
  color,
  glyph,
  step,
  title,
  desc,
}: {
  tint: string;
  color: string;
  glyph: string;
  step: string;
  title: string;
  desc: string;
}) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div
        aria-hidden
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: tint,
          color,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          fontWeight: 800,
          flexShrink: 0,
          fontFamily: "Pretendard, var(--sans)",
        }}
      >
        {glyph}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color }}>{step}</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{title}</h2>
        <p style={{ color: "var(--body)", fontSize: 14, margin: "6px 0 0", lineHeight: 1.55 }}>{desc}</p>
      </div>
    </div>
  );
}
