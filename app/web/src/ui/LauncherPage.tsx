import React, { useEffect, useState } from "react";
import {
  createSession,
  explainSubtitle,
  ExpressionNuance,
  getSubtitles,
  SubtitleLine,
} from "../api/client";
import { useAppNavigate } from "../router";

interface PresetClip {
  videoId: string;
  badge: string;
  title: string;
  subtitle: string;
  defaultTimestamp: number;
  defaultExpressions: string[];
  youtubeId?: string;
}

const PRESET_CLIPS: PresetClip[] = [
  {
    videoId: "V1b8VxrkbZU",
    badge: "🎬 Official YouTube Demo (#100일의거짓말 EP.0)",
    title:
      "[잠입 티저] “나는 꼭 미국에 갈 거예요” — 경성 최고의 소매치기, 조선총독부에 잠입하다",
    subtitle:
      "tvN DRAMA · YouTube 멀티모달 컨텍스트 & 경성 잠입 스릴러 3D 룸 (generic_room)",
    defaultTimestamp: 29.0,
    defaultExpressions: ["정체를 숨기다", "밀명을 받다", "들키면 끝이다"],
    youtubeId: "V1b8VxrkbZU",
  },
  {
    videoId: "demo_cafe",
    badge: "☕ K-Drama Romance Preset (Rainy Seoul Café)",
    title: "비 오는 날의 서울 카페 — 3년 만의 우연한 재회",
    subtitle:
      "감성 로맨스 · 빗소리 & 따뜻한 조명 속 1인칭 카페 테이블 대면 (cafe)",
    defaultTimestamp: 18.0,
    defaultExpressions: ["오랜만이야", "혹시 시간 괜찮아?", "하고 싶은 말이 있었어"],
  },
];

export function LauncherPage() {
  const navigate = useAppNavigate();
  const [selectedClip, setSelectedClip] = useState<PresetClip>(PRESET_CLIPS[0]);
  const [subtitles, setSubtitles] = useState<SubtitleLine[]>([]);
  const [activeSub, setActiveSub] = useState<SubtitleLine | null>(null);
  const [savedExpressions, setSavedExpressions] = useState<string[]>(
    PRESET_CLIPS[0].defaultExpressions
  );
  const [customExpr, setCustomExpr] = useState("");

  const [explainData, setExplainData] = useState<ExpressionNuance | null>(null);
  const [explaining, setExplaining] = useState(false);

  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSavedExpressions(selectedClip.defaultExpressions);
    setExplainData(null);

    getSubtitles(selectedClip.videoId)
      .then((res) => {
        if (cancelled) return;
        setSubtitles(res.lines);
        const initial =
          res.lines.find(
            (s) =>
              selectedClip.defaultTimestamp >= s.start_sec &&
              selectedClip.defaultTimestamp <= s.end_sec
          ) ||
          res.lines[Math.min(4, res.lines.length - 1)] ||
          null;
        setActiveSub(initial);
      })
      .catch((err) => {
        console.error("Failed to load subtitles:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedClip]);

  const handleExplainLine = async (line: SubtitleLine, token?: string) => {
    setActiveSub(line);
    setExplaining(true);
    try {
      const targetExpr =
        token ||
        (line.tokens && line.tokens.length > 0 ? line.tokens[0] : line.text_ko);
      const res = await explainSubtitle({
        video_id: selectedClip.videoId,
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

  const toggleExpression = (expr: string) => {
    setSavedExpressions((prev) =>
      prev.includes(expr) ? prev.filter((e) => e !== expr) : [...prev, expr]
    );
  };

  const handleAddCustomExpr = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customExpr.trim();
    if (!trimmed) return;
    if (!savedExpressions.includes(trimmed)) {
      setSavedExpressions((prev) => [...prev, trimmed]);
    }
    setCustomExpr("");
  };

  const handleEnterScene = async () => {
    if (entering) return;
    setEntering(true);
    setEnterError(null);
    try {
      const ts = activeSub ? activeSub.start_sec : selectedClip.defaultTimestamp;
      const res = await createSession({
        video_id: selectedClip.videoId,
        timestamp_sec: ts,
        saved_expressions:
          savedExpressions.length > 0
            ? savedExpressions
            : selectedClip.defaultExpressions,
      });
      navigate(`/scene/${res.session_id}`);
    } catch (err) {
      setEnterError(err instanceof Error ? err.message : String(err));
      setEntering(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 0%, #1e1b4b 0%, #090d16 55%, #050811 100%)",
        color: "#f8fafc",
        fontFamily:
          "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "32px 24px 72px",
      }}
    >
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
        {/* HERO HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "20px",
            marginBottom: "28px",
            borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
            paddingBottom: "22px",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(168, 85, 247, 0.18)",
                border: "1px solid #a855f7",
                color: "#e9d5ff",
                padding: "4px 12px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
                marginBottom: "10px",
              }}
            >
              <span>
                ✨ Google DeepMind AI Hackathon · Track 1 Entertainment
              </span>
            </div>
            <h1
              style={{
                margin: "0 0 8px",
                fontSize: "36px",
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              SceneTalk{" "}
              <span
                style={{
                  fontWeight: 400,
                  fontSize: "22px",
                  color: "#94a3b8",
                }}
              >
                — Watch it. Enter it. Live the story.
              </span>
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "15px",
                color: "#cbd5e1",
                maxWidth: "740px",
                lineHeight: 1.6,
              }}
            >
              K-드라마 명장면 자막의 한국어 화용론·뉘앙스를{" "}
              <strong style={{ color: "#d8b4fe" }}>Gemini 4 Argon</strong>으로
              즉시 해부하고, 방금 본 씬 속 주인공과{" "}
              <strong style={{ color: "#6ee7b7" }}>Gemini 3.8 Live</strong> 1인칭
              3D 음성 대화로 직접 부딪히며 나만의 멀티버스 결말을 만드세요.
            </p>
          </div>

          {/* Argon 4-Tier Architecture Summary Pill */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "14px",
              padding: "12px 16px",
              fontSize: "12px",
              minWidth: "280px",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                color: "#fbbf24",
                marginBottom: "6px",
              }}
            >
              🧠 Gemini 4 Argon 4-Tier Adaptive Thinking
            </div>
            <div style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
              <div>
                • <code style={{ color: "#6ee7b7" }}>minimal</code> : 1초 즉석 대사 힌트 코치
              </div>
              <div>
                • <code style={{ color: "#93c5fd" }}>low</code> : 자막 해설 &amp; 실시간 StoryDirector
              </div>
              <div>
                • <code style={{ color: "#d8b4fe" }}>medium</code> : YouTube 멀티모달 3D 씬 설계
              </div>
              <div>
                • <code style={{ color: "#fde68a" }}>high</code> : 한국어 화용론 &amp; 멀티버스 검증
              </div>
            </div>
          </div>
        </div>

        {/* CLIP SELECTOR TABS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          {PRESET_CLIPS.map((clip) => {
            const active = selectedClip.videoId === clip.videoId;
            return (
              <div
                key={clip.videoId}
                onClick={() => setSelectedClip(clip)}
                style={{
                  background: active
                    ? "linear-gradient(135deg, rgba(59, 130, 246, 0.22), rgba(99, 102, 241, 0.28))"
                    : "rgba(15, 23, 42, 0.75)",
                  border: `2px solid ${
                    active ? "#60a5fa" : "rgba(148, 163, 184, 0.2)"
                  }`,
                  borderRadius: "16px",
                  padding: "16px 18px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: active ? "#93c5fd" : "#94a3b8",
                    marginBottom: "4px",
                  }}
                >
                  {clip.badge}
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#f8fafc",
                    marginBottom: "4px",
                  }}
                >
                  {clip.title}
                </div>
                <div style={{ fontSize: "12px", color: "#cbd5e1" }}>
                  {clip.subtitle}
                </div>
              </div>
            );
          })}
        </div>

        {/* MAIN WATCH-TO-ENTER WORKSPACE */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: "22px",
            alignItems: "start",
          }}
        >
          {/* LEFT COLUMN: Video Player + Interactive Time-Coded Subtitles */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {/* Video Preview Frame */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(148, 163, 184, 0.25)",
                borderRadius: "18px",
                overflow: "hidden",
              }}
            >
              {selectedClip.youtubeId ? (
                <div
                  style={{
                    position: "relative",
                    paddingBottom: "56.25%",
                    height: 0,
                  }}
                >
                  <iframe
                    title={selectedClip.title}
                    src={`https://www.youtube.com/embed/${selectedClip.youtubeId}?rel=0`}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      border: 0,
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div
                  style={{
                    height: "280px",
                    background:
                      "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "24px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "44px", marginBottom: "10px" }}>
                    ☕🌧️
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>
                    {selectedClip.title}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#cbd5e1",
                      marginTop: "6px",
                    }}
                  >
                    아래 대본에서 원하는 장면 대사를 클릭해 Argon 해설을 확인하거나 바로 3D 카페 씬으로 진입하세요.
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Subtitle Script List */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(148, 163, 184, 0.25)",
                borderRadius: "18px",
                padding: "18px 20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div style={{ fontSize: "15px", fontWeight: 800 }}>
                  📜 타임코드 자막 스크립트 (대사를 클릭하면 Argon 해설 &amp; 진입 지점이 설정됩니다)
                </div>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  총 {subtitles.length}개 컷
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  maxHeight: "340px",
                  overflowY: "auto",
                  paddingRight: "4px",
                }}
              >
                {subtitles.map((line, i) => {
                  const isCurrent = activeSub?.start_sec === line.start_sec;
                  return (
                    <div
                      key={i}
                      onClick={() => handleExplainLine(line)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        background: isCurrent
                          ? "rgba(59, 130, 246, 0.22)"
                          : "rgba(30, 41, 59, 0.65)",
                        border: `1px solid ${
                          isCurrent
                            ? "#60a5fa"
                            : "rgba(148, 163, 184, 0.16)"
                        }`,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "12px",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "12px",
                              color: "#93c5fd",
                              background: "rgba(15, 23, 42, 0.75)",
                              padding: "3px 7px",
                              borderRadius: "6px",
                            }}
                          >
                            {Math.floor(line.start_sec / 60)}:
                            {String(Math.floor(line.start_sec % 60)).padStart(
                              2,
                              "0"
                            )}
                          </span>
                          <div>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: isCurrent ? 700 : 500,
                                color: "#f8fafc",
                              }}
                            >
                              {line.text_ko}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#94a3b8",
                                marginTop: "2px",
                              }}
                            >
                              {line.text_en}
                            </div>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            color: isCurrent ? "#60a5fa" : "#94a3b8",
                            whiteSpace: "nowrap",
                          }}
                        >
                          🔍 Argon 해설
                        </span>
                      </div>

                      {line.tokens && line.tokens.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            flexWrap: "wrap",
                            paddingLeft: "48px",
                          }}
                        >
                          {line.tokens.map((tok) => (
                            <span
                              key={tok}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExplainLine(line, tok);
                              }}
                              style={{
                                background: "rgba(15, 23, 42, 0.75)",
                                border: "1px solid rgba(56, 189, 248, 0.35)",
                                color: "#7dd3fc",
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "999px",
                              }}
                            >
                              #{tok}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Argon Subtitle Explainer + Saved Expressions + Enter 3D Scene CTA */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {/* Enter the 3D Scene CTA Card */}
            <div
              style={{
                background:
                  "linear-gradient(145deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.95))",
                border: "1.5px solid #818cf8",
                borderRadius: "18px",
                padding: "22px",
                boxShadow: "0 14px 36px rgba(79, 70, 229, 0.3)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#a5b4fc",
                  marginBottom: "6px",
                }}
              >
                STEP 2 · ENTER THE 3D SCENE (GEMINI-4-ARGON MEDIUM PLANNER)
              </div>
              <h2
                style={{ margin: "0 0 10px", fontSize: "20px", fontWeight: 900 }}
              >
                🎬 선택한 장면 속 주인공과 1인칭 3D 대화 시작
              </h2>
              <div
                style={{
                  fontSize: "13px",
                  color: "#cbd5e1",
                  marginBottom: "14px",
                  lineHeight: 1.55,
                }}
              >
                현재 선택된 진입 시점:{" "}
                <strong style={{ color: "#fde68a" }}>
                  {activeSub
                    ? `${activeSub.start_sec.toFixed(1)}초 — “${activeSub.text_ko}”`
                    : `${selectedClip.defaultTimestamp}초`}
                </strong>
              </div>

              {/* Saved Expressions Mission Manager */}
              <div style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#94a3b8",
                    marginBottom: "8px",
                  }}
                >
                  📌 씬 안에서 직접 써볼 미션 한국어 표현 ({savedExpressions.length}개)
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "7px",
                    marginBottom: "10px",
                  }}
                >
                  {savedExpressions.map((expr) => (
                    <span
                      key={expr}
                      onClick={() => toggleExpression(expr)}
                      style={{
                        background: "rgba(16, 185, 129, 0.2)",
                        border: "1px solid #10b981",
                        color: "#6ee7b7",
                        padding: "5px 11px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ✓ {expr} ✕
                    </span>
                  ))}
                </div>

                <form
                  onSubmit={handleAddCustomExpr}
                  style={{ display: "flex", gap: "8px" }}
                >
                  <input
                    type="text"
                    value={customExpr}
                    onChange={(e) => setCustomExpr(e.target.value)}
                    placeholder="추가할 한국어 표현 입력 (예: 꼭 성공할 거예요)"
                    style={{
                      flex: 1,
                      background: "rgba(15, 23, 42, 0.85)",
                      border: "1px solid rgba(148, 163, 184, 0.3)",
                      borderRadius: "10px",
                      padding: "8px 12px",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: "rgba(59, 130, 246, 0.25)",
                      border: "1px solid #3b82f6",
                      color: "#93c5fd",
                      borderRadius: "10px",
                      padding: "8px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + 추가
                  </button>
                </form>
              </div>

              {enterError && (
                <div
                  style={{
                    color: "#fca5a5",
                    fontSize: "12px",
                    marginBottom: "10px",
                  }}
                >
                  오류: {enterError}
                </div>
              )}

              <button
                onClick={handleEnterScene}
                disabled={entering}
                style={{
                  width: "100%",
                  background:
                    "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)",
                  border: "none",
                  borderRadius: "14px",
                  padding: "15px 20px",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 10px 28px rgba(124, 58, 237, 0.5)",
                }}
              >
                {entering
                  ? "🧠 Gemini 4 Argon (thinking_level=medium) 3D 씬 생성 중..."
                  : "🚪 Enter the Scene — 3D 씬 속으로 들어가기"}
              </button>
            </div>

            {/* Argon Subtitle Nuance & Pragmatics Card */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(148, 163, 184, 0.25)",
                borderRadius: "18px",
                padding: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#38bdf8",
                  }}
                >
                  🔍 GEMINI 4 ARGON 자막 뉘앙스·화용론 해설 (thinking_level=&quot;low&quot;)
                </span>
              </div>

              {explaining ? (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#94a3b8",
                    padding: "12px 0",
                  }}
                >
                  ⚡ Gemini 4 Argon이 대사의 드라마 맥락과 존댓말·반말 뉘앙스를 분석하고 있습니다...
                </div>
              ) : explainData ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    fontSize: "13px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: 800,
                        color: "#fde68a",
                      }}
                    >
                      “{explainData.expression}”
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        background: "rgba(99, 102, 241, 0.2)",
                        border: "1px solid #6366f1",
                        color: "#c7d2fe",
                        padding: "2px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      어조: {explainData.formality}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: "#93c5fd" }}>한국어 의미:</strong>{" "}
                    {explainData.meaning_ko}
                  </div>
                  <div>
                    <strong style={{ color: "#cbd5e1" }}>English:</strong>{" "}
                    {explainData.meaning_en}
                  </div>
                  <div>
                    <strong style={{ color: "#6ee7b7" }}>화용론·뉘앙스:</strong>{" "}
                    {explainData.nuance_note}
                  </div>
                  <div>
                    <strong style={{ color: "#fcd34d" }}>실전 말하기 팁:</strong>{" "}
                    {explainData.practice_tip_ko}
                  </div>
                  {explainData.examples_ko.length > 0 && (
                    <div
                      style={{
                        background: "rgba(30, 41, 59, 0.8)",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        color: "#e2e8f0",
                      }}
                    >
                      <strong>💬 응용 예문:</strong>{" "}
                      {explainData.examples_ko.join(" / ")}
                    </div>
                  )}
                  {!savedExpressions.includes(explainData.expression) && (
                    <button
                      onClick={() => toggleExpression(explainData.expression)}
                      style={{
                        alignSelf: "flex-start",
                        background: "rgba(16, 185, 129, 0.2)",
                        border: "1px solid #10b981",
                        color: "#6ee7b7",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      📌 이 표현을 미션 표현으로 추가
                    </button>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#94a3b8",
                    lineHeight: 1.55,
                  }}
                >
                  왼쪽 타임코드 자막 중 하나를 클릭하면{" "}
                  <strong>Gemini 4 Argon (thinking_level=&quot;low&quot;)</strong>
                  이 해당 대사의 드라마 속 숨은 의도와 한국어 어조를 즉시 분석해 드립니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
