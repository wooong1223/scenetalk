import React, { useState } from "react";
import { completeSession, getHint, PropSpec } from "../api/client";
import { useAppNavigate } from "../router";
import { useSceneStore } from "../state/sceneStore";

interface HudProps {
  sessionId: string;
  pointerLockEnabled: boolean;
  onTogglePointerLock: () => void;
  onStartMic: () => void;
  onStopMic: () => void;
  onSendTextTurn: (text: string) => void;
  onTriggerEvent: (eventId?: string | null) => void;
  onSelectObject: (propId: string) => void;
}

const THINKING_BADGE_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  minimal: {
    bg: "rgba(16, 185, 129, 0.18)",
    border: "#10b981",
    text: "#6ee7b7",
  },
  low: {
    bg: "rgba(59, 130, 246, 0.18)",
    border: "#3b82f6",
    text: "#93c5fd",
  },
  medium: {
    bg: "rgba(168, 85, 247, 0.18)",
    border: "#a855f7",
    text: "#d8b4fe",
  },
  high: {
    bg: "rgba(245, 158, 11, 0.2)",
    border: "#f59e0b",
    text: "#fde68a",
  },
};

export function Hud({
  sessionId,
  pointerLockEnabled,
  onTogglePointerLock,
  onStartMic,
  onStopMic,
  onSendTextTurn,
  onTriggerEvent,
  onSelectObject,
}: HudProps) {
  const navigate = useAppNavigate();
  const {
    character,
    world,
    story,
    argonTraces,
    wsConnected,
    isRecording,
    transcripts,
    directorNoteKo,
    hoveredProp,
    inspectedProp,
    hints,
    coachTipKo,
    loadingHints,
    setHints,
    setLoadingHints,
    setInspectedProp,
    setReport,
  } = useSceneStore();

  const [textInput, setTextInput] = useState("");
  const [completing, setCompleting] = useState(false);
  const [showTracePanel, setShowTracePanel] = useState(true);

  const savedExpressions = story?.saved_expressions ?? [];
  const usedSet = new Set(story?.used_expressions ?? []);
  const activeProp: PropSpec | null = inspectedProp ?? hoveredProp;

  const latestCharacterLine =
    transcripts
      .filter((t) => t.speaker === "character")
      .slice(-1)[0]?.text_ko ||
    character?.opening_line_ko ||
    "대화를 시작해 보세요.";

  const latestUserLine =
    transcripts
      .filter((t) => t.speaker === "user")
      .slice(-1)[0]?.text_ko || "";

  const handleRequestHint = async () => {
    if (loadingHints) return;
    setLoadingHints(true);
    try {
      const res = await getHint(sessionId);
      setHints(res.hints, res.argon_coach_note_ko);
    } catch (err) {
      console.error("Failed to fetch Argon minimal hint:", err);
      setLoadingHints(false);
    }
  };

  const handleCompleteScene = async () => {
    if (completing) return;
    setCompleting(true);
    try {
      const rep = await completeSession(sessionId);
      setReport(rep);
      navigate(`/result/${sessionId}`);
    } catch (err) {
      console.error("Failed to complete session:", err);
      setCompleting(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onSendTextTurn(textInput.trim());
    setTextInput("");
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "18px 22px",
        fontFamily: "var(--sans)",
        color: "#f8fafc",
        zIndex: 10,
      }}
    >
      {/* TOP BAR: Story Goal, Phase, & Action Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          pointerEvents: "auto",
          flexWrap: "wrap",
        }}
      >
        {/* Left: Character & Story Goal */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.84)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            borderRadius: "16px",
            padding: "12px 18px",
            maxWidth: "520px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "6px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                background: wsConnected
                  ? "rgba(16, 185, 129, 0.2)"
                  : "rgba(245, 158, 11, 0.2)",
                border: `1px solid ${wsConnected ? "#10b981" : "#f59e0b"}`,
                color: wsConnected ? "#6ee7b7" : "#fcd34d",
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "999px",
              }}
            >
              {wsConnected
                ? "● Gemini 3.8 Live 연결됨"
                : "◌ Live 연결 중..."}
            </span>
            <span
              style={{
                background: "rgba(99, 102, 241, 0.22)",
                border: "1px solid #6366f1",
                color: "#c7d2fe",
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "999px",
              }}
            >
              PHASE: {(story?.phase ?? "opening").toUpperCase()} · TURN{" "}
              {story?.turn_count ?? 0}
            </span>
            {world && (
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                {world.setting_title_ko}
              </span>
            )}
          </div>

          <div
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#f8fafc",
              marginBottom: "4px",
            }}
          >
            🎯 목표:{" "}
            {story?.user_Goal_ko ??
              "상대방과 자연스럽게 대화를 이어가며 미션 표현을 사용해 보세요."}
          </div>
          {character && (
            <div style={{ fontSize: "12px", color: "#cbd5e1" }}>
              상대역 <strong>{character.display_name_ko}</strong> (
              {character.role_in_scene_ko}) — {character.persona_summary_ko}
            </div>
          )}
        </div>

        {/* Right: Director Actions & Complete Scene */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => navigate("/")}
            style={{
              background: "rgba(30, 41, 59, 0.85)",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              color: "#cbd5e1",
              borderRadius: "12px",
              padding: "9px 13px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← 홈
          </button>

          <button
            onClick={onTogglePointerLock}
            style={{
              background: pointerLockEnabled
                ? "rgba(59, 130, 246, 0.28)"
                : "rgba(30, 41, 59, 0.85)",
              border: `1px solid ${
                pointerLockEnabled ? "#60a5fa" : "rgba(148, 163, 184, 0.3)"
              }`,
              color: "#e2e8f0",
              borderRadius: "12px",
              padding: "9px 12px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {pointerLockEnabled ? "🖱️ 시선 고정 ON" : "🖱️ 드래그로 둘러보기"}
          </button>

          <button
            onClick={handleRequestHint}
            disabled={loadingHints}
            style={{
              background:
                "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.35))",
              border: "1px solid #10b981",
              color: "#a7f3d0",
              borderRadius: "12px",
              padding: "9px 14px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
            }}
          >
            {loadingHints
              ? "⚡ Argon Minimal 생성 중..."
              : "💡 대사 힌트 (Argon minimal)"}
          </button>

          <button
            onClick={() => onTriggerEvent(null)}
            style={{
              background:
                "linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(126, 34, 206, 0.35))",
              border: "1px solid #a855f7",
              color: "#e9d5ff",
              borderRadius: "12px",
              padding: "9px 14px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ⚡ 스토리 반전 (Argon Director)
          </button>

          <button
            onClick={() => setShowTracePanel((v) => !v)}
            style={{
              background: "rgba(30, 41, 59, 0.85)",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              color: "#e2e8f0",
              borderRadius: "12px",
              padding: "9px 12px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🧠 Argon Trace ({argonTraces.length})
          </button>

          <button
            onClick={handleCompleteScene}
            disabled={completing}
            style={{
              background: "linear-gradient(135deg, #f59e0b, #ea580c)",
              border: "none",
              color: "#ffffff",
              borderRadius: "12px",
              padding: "10px 16px",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(234, 88, 12, 0.45)",
            }}
          >
            {completing
              ? "🧠 Argon High 분석 중..."
              : "🏁 씬 종료 & 학습 리포트"}
          </button>
        </div>
      </div>

      {/* MIDDLE AREA: Left Mission Panel + Center Reticle + Right Argon Trace Panel */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flex: 1,
          margin: "14px 0",
          position: "relative",
        }}
      >
        {/* Left: Saved Expressions Checklist & Prop Inspector */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: "320px",
            pointerEvents: "auto",
          }}
        >
          {/* Saved Expressions Mission Box */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.82)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "14px",
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#94a3b8",
                marginBottom: "8px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>
                📌 미션 표현 ({usedSet.size}/{savedExpressions.length})
              </span>
              <span style={{ color: "#38bdf8" }}>클릭하여 발화</span>
            </div>

            {savedExpressions.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                저장된 미션 표현이 없습니다. 자유롭게 대화해 보세요!
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {savedExpressions.map((expr) => {
                  const used = usedSet.has(expr);
                  return (
                    <div
                      key={expr}
                      onClick={() =>
                        onSendTextTurn(
                          `${expr}. 지금 이 상황에서 꼭 하고 싶은 말이에요.`
                        )
                      }
                      title="클릭하면 이 표현을 포함한 대사를 즉시 발화합니다"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "7px 10px",
                        borderRadius: "10px",
                        background: used
                          ? "rgba(16, 185, 129, 0.18)"
                          : "rgba(30, 41, 59, 0.75)",
                        border: `1px solid ${
                          used ? "#10b981" : "rgba(148, 163, 184, 0.2)"
                        }`,
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: used ? "#6ee7b7" : "#f1f5f9",
                        }}
                      >
                        {used ? "✅ " : "⬜ "}
                        {expr}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: used ? "#34d399" : "#94a3b8",
                        }}
                      >
                        {used ? "달성!" : "발화 →"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3D Prop Quick Selector & Inspector */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.82)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "14px",
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#94a3b8",
                marginBottom: "8px",
              }}
            >
              🔍 장면 속 단서 (0.6초 응시 또는 클릭)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {world?.props.map((prop) => {
                const isSelected = inspectedProp?.id === prop.id;
                const isGazed = hoveredProp?.id === prop.id;
                return (
                  <button
                    key={prop.id}
                    onClick={() => {
                      setInspectedProp(prop);
                      onSelectObject(prop.id);
                    }}
                    style={{
                      background: isSelected
                        ? "rgba(251, 191, 36, 0.22)"
                        : isGazed
                        ? "rgba(56, 189, 248, 0.22)"
                        : "rgba(30, 41, 59, 0.8)",
                      border: `1px solid ${
                        isSelected
                          ? "#fbbf24"
                          : isGazed
                          ? "#38bdf8"
                          : "rgba(148, 163, 184, 0.25)"
                      }`,
                      color: isSelected ? "#fde68a" : "#e2e8f0",
                      borderRadius: "8px",
                      padding: "5px 9px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {prop.label_ko}
                  </button>
                );
              })}
            </div>

            {activeProp && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: "rgba(30, 41, 59, 0.9)",
                  borderLeft: "3px solid #fbbf24",
                  fontSize: "12px",
                  color: "#fde68a",
                }}
              >
                <strong>{activeProp.label_ko}:</strong> {activeProp.clue_text_ko}
              </div>
            )}
          </div>

          {/* Instant Hint Card (Argon thinking_level="minimal") */}
          {hints.length > 0 && (
            <div
              style={{
                background:
                  "linear-gradient(145deg, rgba(6, 78, 59, 0.92), rgba(15, 23, 42, 0.95))",
                border: "1px solid #10b981",
                borderRadius: "14px",
                padding: "12px 14px",
                boxShadow: "0 10px 25px rgba(16, 185, 129, 0.25)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#6ee7b7",
                  }}
                >
                  ⚡ GEMINI-4-ARGON (MINIMAL) 추천 대사
                </span>
                <button
                  onClick={() => setHints([], "")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  ✕
                </button>
              </div>
              {coachTipKo && (
                <div
                  style={{
                    fontSize: "11px",
                    color: "#a7f3d0",
                    marginBottom: "8px",
                  }}
                >
                  💡 {coachTipKo}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {hints.slice(0, 2).map((h, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(15, 23, 42, 0.7)",
                      borderRadius: "10px",
                      padding: "8px 10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#ecfdf5",
                        marginBottom: "3px",
                      }}
                    >
                      “{h.line_ko}”
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#cbd5e1",
                        marginBottom: "6px",
                      }}
                    >
                      {h.nuance_tip_ko}
                    </div>
                    <button
                      onClick={() => {
                        onSendTextTurn(h.line_ko);
                        setHints([], "");
                      }}
                      style={{
                        width: "100%",
                        background: "#10b981",
                        border: "none",
                        borderRadius: "6px",
                        padding: "5px 8px",
                        color: "#022c22",
                        fontWeight: 800,
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      🎤 이 대사로 바로 말하기
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center Reticle (First-Person Gaze Pointer) */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <div
            style={{
              width: hoveredProp ? "14px" : "8px",
              height: hoveredProp ? "14px" : "8px",
              borderRadius: "50%",
              border: `2px solid ${
                hoveredProp ? "#fbbf24" : "rgba(255,255,255,0.55)"
              }`,
              background: hoveredProp
                ? "rgba(251, 191, 36, 0.35)"
                : "transparent",
              transition: "all 0.15s ease",
            }}
          />
          {hoveredProp && (
            <span
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                color: "#fde68a",
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "999px",
                border: "1px solid #fbbf24",
              }}
            >
              👁️ {hoveredProp.label_ko} 응시 중
            </span>
          )}
        </div>

        {/* Right: Gemini 4 Argon 4-Tier Adaptive Thinking & Stateful Chain Panel */}
        {showTracePanel && (
          <div
            style={{
              width: "340px",
              background: "rgba(15, 23, 42, 0.84)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(168, 85, 247, 0.35)",
              borderRadius: "14px",
              padding: "12px 14px",
              pointerEvents: "auto",
              maxHeight: "380px",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "#d8b4fe",
                marginBottom: "4px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>🧠 GEMINI-4-ARGON ENGINE TRACE</span>
              <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                Interactions API
              </span>
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                marginBottom: "10px",
              }}
            >
              4-Tier Adaptive Thinking (minimal/low/medium/high) + Stateful Chain
            </div>

            {directorNoteKo && (
              <div
                style={{
                  background: "rgba(168, 85, 247, 0.16)",
                  borderLeft: "3px solid #a855f7",
                  padding: "7px 9px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "#f3e8ff",
                  marginBottom: "10px",
                }}
              >
                <strong>🎬 Argon StoryDirector 연출:</strong> {directorNoteKo}
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
              }}
            >
              {argonTraces
                .slice()
                .reverse()
                .map((tr, idx) => {
                  const style =
                    THINKING_BADGE_COLORS[tr.thinking_level] ??
                    THINKING_BADGE_COLORS.low;
                  return (
                    <div
                      key={`${tr.interaction_id}-${idx}`}
                      style={{
                        background: "rgba(30, 41, 59, 0.8)",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        borderRadius: "9px",
                        padding: "7px 9px",
                        fontSize: "11px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "3px",
                        }}
                      >
                        <strong style={{ color: "#f8fafc" }}>{tr.stage}</strong>
                        <span
                          style={{
                            background: style.bg,
                            border: `1px solid ${style.border}`,
                            color: style.text,
                            padding: "1px 6px",
                            borderRadius: "999px",
                            fontSize: "10px",
                            fontWeight: 700,
                          }}
                        >
                          thinking: {tr.thinking_level}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          color: "#94a3b8",
                          fontSize: "10px",
                        }}
                      >
                        <span>⏱ {tr.latency_ms}ms</span>
                        <span>
                          {tr.repair_attempts > 0
                            ? `🔧 Self-Repair (${tr.repair_attempts})`
                            : "✓ Schema Verified"}
                        </span>
                      </div>
                      {tr.previous_interaction_id && (
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#38bdf8",
                            marginTop: "2px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ⛓ Chained from:{" "}
                          {tr.previous_interaction_id.slice(0, 18)}...
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM BAR: Live Transcript Subtitle Box + Voice Mic & Text Turn Controls */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          pointerEvents: "auto",
        }}
      >
        {/* Character & User Live Dialogue Banner */}
        <div
          style={{
            width: "100%",
            maxWidth: "820px",
            textAlign: "center",
            padding: "6px 20px",
          }}
        >
          <div
            className="st-subtitle-line"
            style={{
              fontSize: "22px",
              lineHeight: 1.45,
              minHeight: "30px",
            }}
          >
            <span style={{ color: "#f2c94c", marginRight: "10px", fontSize: "15px" }}>
              {character?.display_name_ko ?? "상대역"}
            </span>
            {latestCharacterLine}
          </div>

          {latestUserLine && (
            <div
              style={{
                marginTop: "6px",
                fontSize: "15px",
                color: "#e7e0d4",
                textShadow: "0 1px 2px #000, 0 2px 8px rgba(0,0,0,0.9)",
              }}
            >
              <strong style={{ color: "#9fe0b4" }}>나</strong>{" "}
              {latestUserLine}
            </div>
          )}
        </div>

        {/* Voice Mic Button + Text Turn Input Form */}
        <div
          style={{
            width: "100%",
            maxWidth: "820px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={isRecording ? onStopMic : onStartMic}
            style={{
              background: isRecording
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, #3b82f6, #2563eb)",
              border: "none",
              color: "#ffffff",
              borderRadius: "14px",
              padding: "12px 18px",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
              boxShadow: isRecording
                ? "0 0 20px rgba(239, 68, 68, 0.65)"
                : "0 6px 18px rgba(37, 99, 235, 0.4)",
            }}
          >
            <span>
              {isRecording ? "⏹ 마이크 끄기 (Live)" : "🎙️ 음성 대화 시작"}
            </span>
          </button>

          <form
            onSubmit={handleTextSubmit}
            style={{
              flex: 1,
              display: "flex",
              gap: "8px",
            }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="한국어로 대사를 입력해 보세요 (예: 오늘 비가 많이 오네요. 잠깐 이야기할 수 있을까요?)"
              style={{
                flex: 1,
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                borderRadius: "12px",
                padding: "12px 16px",
                color: "#f8fafc",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                background: "rgba(59, 130, 246, 0.25)",
                border: "1px solid #3b82f6",
                color: "#93c5fd",
                borderRadius: "12px",
                padding: "0 18px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              대사 전송 ↵
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
