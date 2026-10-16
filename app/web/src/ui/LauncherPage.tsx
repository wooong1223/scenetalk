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

  const [saved, setSaved] = useState<string[]>(() => loadSavedExpressions(initial.v));
  const [customExpr, setCustomExpr] = useState("");

  const [timestampSec, setTimestampSec] = useState<number>(29);
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);

  const roleplayRef = useRef<HTMLDivElement | null>(null);

  // load subtitles when videoId changes
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
        const mid = res.lines[Math.floor(res.lines.length / 2)];
        if (mid) setTimestampSec(mid.start_sec);
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
      roleplayRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
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
      setUrlError("YouTube 링크나 11자리 영상 ID를 입력해 주세요.");
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
    setExplaining(true);
    try {
      const targetExpr =
        token || (line.tokens && line.tokens.length > 0 ? line.tokens[0] : line.text_ko);
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

  const mission = saved.length > 0 ? saved : DEFAULT_MISSION;

  const handleEnterScene = async () => {
    if (entering) return;
    setEntering(true);
    setEnterError(null);
    try {
      const res = await createSession({
        video_id: videoId,
        timestamp_sec: timestampSec,
        saved_expressions: mission,
      });
      navigate(`/scene/${res.session_id}`);
    } catch (err) {
      setEnterError(err instanceof Error ? err.message : String(err));
      setEntering(false);
    }
  };

  return (
    <div className="st-page">
      <div className="st-wrap">
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            padding: "28px 0 18px",
            borderBottom: "1px solid var(--line)",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div className="st-serif" style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em" }}>
            SceneTalk
          </div>
          <div style={{ color: "var(--smoke)", fontSize: 14 }}>
            Watch it. Enter it. Live the story.
          </div>
        </header>

        {/* URL input */}
        <form
          onSubmit={handleLoadUrl}
          style={{
            display: "flex",
            gap: 10,
            margin: "26px 0 8px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 420px" }}>
            <input
              className="st-input"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="YouTube 링크를 붙여넣으세요"
              aria-label="YouTube 링크"
            />
          </div>
          <button className="st-btn st-btn--yellow" type="submit" style={{ padding: "12px 22px" }}>
            불러오기
          </button>
        </form>
        <div style={{ minHeight: 20, fontSize: 13, color: urlError ? "var(--bad)" : "var(--smoke-2)" }}>
          {urlError ?? "K-드라마 클립을 넣으면 자막에서 표현을 뽑아 레슨과 롤플레잉 장면을 만듭니다."}
        </div>

        {/* Video + summary */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)",
            gap: 24,
            margin: "22px 0 34px",
            alignItems: "start",
          }}
          className="st-video-row"
        >
          <div
            style={{
              position: "relative",
              paddingTop: "56.25%",
              background: "#000",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid var(--line)",
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
          <div style={{ paddingTop: 4 }}>
            <div className="st-serif" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.35 }}>
              {loadingSubs ? "자막을 읽는 중…" : trackTitle || "제목 없는 영상"}
            </div>
            <div style={{ marginTop: 10, color: "var(--smoke)", fontSize: 14, lineHeight: 1.7 }}>
              {subsError
                ? "자막을 가져오지 못했습니다. 다른 영상으로 시도해 보세요."
                : loadingSubs
                ? "자막이 없으면 Gemini 4 Argon이 영상에서 직접 대사를 추출합니다. 조금 걸릴 수 있어요."
                : `자막 ${subtitles.length}줄 · 저장한 표현 ${saved.length}개`}
            </div>
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(saved.length ? saved : []).map((e) => (
                <span key={e} className="st-chip st-chip--yellow">
                  {e}
                </span>
              ))}
              {saved.length === 0 && !loadingSubs && (
                <span style={{ color: "var(--smoke-2)", fontSize: 13 }}>
                  아직 저장한 표현이 없어요. 아래 레슨에서 배우거나 자막을 눌러 저장하세요.
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Two modes */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 24,
          }}
        >
          {/* ① Study */}
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderTop: "4px solid var(--sub-yellow)",
              borderRadius: 14,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <div className="st-serif" style={{ fontSize: 24, fontWeight: 900 }}>
                ① 표현 학습
              </div>
              <div style={{ color: "var(--smoke)", fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>
                이 장면의 대사에서 핵심 표현을 배우고, 뜻 고르기·빈칸·짝 맞추기로 바로 확인합니다.
              </div>
            </div>

            <button
              className="st-btn st-btn--yellow"
              onClick={() => navigate(`/learn/${videoId}`)}
              disabled={loadingSubs || !!subsError}
              style={{ fontSize: 17, padding: "14px 20px" }}
            >
              레슨 시작
            </button>

            <div style={{ fontSize: 13, color: "var(--smoke)" }}>
              자막을 눌러 한 줄씩 해설을 보고 저장할 수도 있어요.
            </div>
            <div
              className="st-scroll"
              style={{
                maxHeight: 220,
                overflowY: "auto",
                border: "1px solid var(--line)",
                borderRadius: 10,
                background: "var(--ink)",
              }}
            >
              {subtitles.map((line) => {
                const active = activeSub?.index === line.index;
                return (
                  <button
                    key={line.index}
                    onClick={() => handleExplainLine(line)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "48px 1fr",
                      gap: 10,
                      width: "100%",
                      textAlign: "left",
                      background: active ? "rgba(242, 201, 76, 0.1)" : "transparent",
                      border: 0,
                      borderBottom: "1px solid var(--line)",
                      color: active ? "var(--sub-yellow)" : "var(--paper)",
                      padding: "10px 12px",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    <span style={{ color: "var(--smoke-2)", fontVariantNumeric: "tabular-nums" }}>
                      {fmtTime(line.start_sec)}
                    </span>
                    <span>
                      <span style={{ fontWeight: 600 }}>{line.text_ko}</span>
                      <span style={{ display: "block", color: "var(--smoke)", fontSize: 12, marginTop: 2 }}>
                        {line.text_en}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {(explaining || explainData) && (
              <div
                style={{
                  border: "1px solid rgba(242, 201, 76, 0.4)",
                  borderRadius: 10,
                  padding: 14,
                  background: "rgba(242, 201, 76, 0.06)",
                }}
              >
                {explaining && !explainData ? (
                  <div className="st-pulse" style={{ color: "var(--smoke)", fontSize: 13 }}>
                    Gemini 4 Argon이 뉘앙스를 설명하는 중…
                  </div>
                ) : explainData ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                      <div className="st-serif" style={{ fontSize: 18, fontWeight: 700 }}>
                        {explainData.expression}
                      </div>
                      <span className="st-chip" style={{ fontSize: 11 }}>
                        {explainData.formality}
                      </span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 14 }}>{explainData.meaning_en}</div>
                    <div style={{ marginTop: 2, fontSize: 13, color: "var(--smoke)" }}>
                      {explainData.meaning_ko}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>{explainData.nuance_note}</div>
                    {explainData.examples_ko?.length > 0 && (
                      <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--smoke)" }}>
                        {explainData.examples_ko.slice(0, 2).map((ex, i) => (
                          <li key={i}>{ex}</li>
                        ))}
                      </ul>
                    )}
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className={`st-btn ${saved.includes(explainData.expression) ? "" : "st-btn--yellow"}`}
                        onClick={() => toggleSaved(explainData.expression)}
                        style={{ padding: "8px 14px", fontSize: 13 }}
                      >
                        {saved.includes(explainData.expression) ? "저장됨 · 해제" : "이 표현 저장"}
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
                placeholder="직접 표현 추가"
                style={{ padding: "10px 12px", fontSize: 14 }}
              />
              <button className="st-btn" type="submit" style={{ padding: "10px 14px", fontSize: 13 }}>
                추가
              </button>
            </form>
            {saved.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {saved.map((e) => (
                  <button
                    key={e}
                    className="st-chip st-chip--yellow"
                    onClick={() => toggleSaved(e)}
                    title="누르면 저장 해제"
                    style={{ cursor: "pointer" }}
                  >
                    {e} <span style={{ opacity: 0.6 }}>×</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ② Roleplay */}
          <div
            ref={roleplayRef}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderTop: "4px solid var(--velvet)",
              borderRadius: 14,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <div className="st-serif" style={{ fontSize: 24, fontWeight: 900 }}>
                ② 롤플레잉 대화
              </div>
              <div style={{ color: "var(--smoke)", fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>
                장면 속으로 들어가 상대 인물과 음성으로 대화합니다. 미션 표현을 자연스럽게 써 보세요.
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, color: "var(--smoke)", marginBottom: 8 }}>
                미션 표현 {saved.length === 0 && "(기본값)"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {mission.map((e) => (
                  <span key={e} className="st-chip" style={{ borderColor: "rgba(216, 67, 75, 0.5)" }}>
                    {e}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, color: "var(--smoke)", marginBottom: 8 }}>
                들어갈 장면 시점 · {fmtTime(timestampSec)}
              </div>
              <select
                className="st-input"
                value={timestampSec}
                onChange={(e) => setTimestampSec(Number(e.target.value))}
                style={{ padding: "10px 12px", fontSize: 14 }}
              >
                {subtitles.map((l) => (
                  <option key={l.index} value={l.start_sec}>
                    {fmtTime(l.start_sec)} — {l.text_ko}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="st-btn st-btn--velvet"
              onClick={handleEnterScene}
              disabled={entering || loadingSubs}
              style={{ fontSize: 17, padding: "14px 20px" }}
            >
              {entering ? "장면을 짓는 중…" : "장면에 들어가기"}
            </button>
            {entering && (
              <div>
                <div className="st-shimmer" style={{ height: 4, borderRadius: 4 }} />
                <div style={{ marginTop: 8, fontSize: 13, color: "var(--smoke)", lineHeight: 1.6 }}>
                  Gemini 4 Argon이 영상 맥락을 읽고 상대 인물과 공간을 설계합니다. 그 다음 Nano Banana가 실사 장면을 그립니다. 데모 영상은 20–40초, 새 영상은 영상을 직접 보느라 1분 안팎 걸려요.
                </div>
              </div>
            )}
            {enterError && <div style={{ color: "var(--bad)", fontSize: 13 }}>{enterError}</div>}

            <div style={{ fontSize: 13, color: "var(--smoke-2)", lineHeight: 1.6 }}>
              대화가 끝나면 Gemini 4 Argon이 발화를 평가해 학습 리포트를 만듭니다.
            </div>
          </div>
        </section>
      </div>
      <style>{`
        @media (max-width: 860px) {
          .st-video-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
