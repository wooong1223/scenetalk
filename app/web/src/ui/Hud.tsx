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

const THINKING_BADGE: Record<string, { bg: string; text: string }> = {
  minimal: { bg: "var(--green-tint)", text: "#11643c" },
  low: { bg: "#e8f0fe", text: "#1d4ed8" },
  medium: { bg: "var(--violet-tint)", text: "#352a9e" },
  high: { bg: "#fff4d6", text: "#8a5a00" },
};

const MISSION_HINT =
  "Work these into the conversation naturally — the character reacts in real time and your report shows which ones you used.";

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
  const [showTracePanel, setShowTracePanel] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const savedExpressions = story?.saved_expressions ?? [];
  const usedSet = new Set(story?.used_expressions ?? []);
  const activeProp: PropSpec | null = inspectedProp ?? hoveredProp;

  const latestCharacterLine =
    transcripts.filter((t) => t.speaker === "character").slice(-1)[0]?.text_ko ||
    character?.opening_line_ko ||
    "Start the conversation.";

  const latestUserLine =
    transcripts.filter((t) => t.speaker === "user").slice(-1)[0]?.text_ko || "";

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

  const phase = (story?.phase ?? "opening").replace("_", " ");

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        fontFamily: "var(--sans)",
        color: "var(--ink)",
        zIndex: 10,
      }}
    >
      {/* ---------- TOP: status/goal card (left) + action pill group (right) ---------- */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 20,
          right: 20,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "flex-start",
          gap: 16,
          pointerEvents: "none",
        }}
      >
        <div className="st-pillgroup" style={{ pointerEvents: "auto" }}>
          <button className="st-pill" onClick={() => navigate("/")}>
            ← Home
          </button>
          <button className={`st-pill ${pointerLockEnabled ? "st-pill--on" : ""}`} onClick={onTogglePointerLock}>
            {pointerLockEnabled ? "Look lock on" : "Drag to look"}
          </button>
          <button className="st-pill" onClick={handleRequestHint} disabled={loadingHints}>
            {loadingHints ? "Thinking…" : "Line hint"}
          </button>
          <button className="st-pill" onClick={() => onTriggerEvent(null)}>
            Plot twist
          </button>
          <button className="st-pill st-pill--violet" onClick={handleCompleteScene} disabled={completing}>
            {completing ? "Grading…" : "End scene & get report"}
          </button>
        </div>
      </div>

      {/* ---------- LEFT: mission + clues + hints ---------- */}
      <div
        style={{
          position: "absolute",
          left: 20,
          top: 20,
          width: 340,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "auto",
          maxHeight: "calc(100vh - 150px)",
          overflowY: "auto",
          scrollbarWidth: "none",
        }}
      >
        <div className="st-hud-card" style={{ padding: "12px 16px", flexShrink: 0 }}>
          {world && (
            <div className="st-eyebrow" style={{ marginBottom: 4 }}>
              {world.setting_title_ko}
            </div>
          )}
          <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.45 }}>
            {story?.user_Goal_ko ?? "Keep the conversation going and work in your mission expressions."}
          </div>
          {character && (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setShowAbout((v) => !v)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: "var(--violet)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {showAbout ? "Hide" : "About"} {character.display_name_ko} {showAbout ? "▴" : "▾"}
              </button>
              {showAbout && (
                <div className="st-hud-sub" style={{ marginTop: 6 }}>
                  <strong style={{ color: "var(--ink)" }}>{character.role_in_scene_ko}</strong> —{" "}
                  {character.persona_summary_ko}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="st-hud-card" style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="st-hud-title">
              Mission expressions{" "}
              <span style={{ color: "var(--body)", fontWeight: 500 }}>
                {usedSet.size}/{savedExpressions.length}
              </span>
            </span>
            <span style={{ fontSize: 11, color: "var(--violet)", fontWeight: 600 }}>Tap to say</span>
          </div>
          <div className="st-hud-sub" style={{ margin: "4px 0 8px" }}>{MISSION_HINT}</div>

          {savedExpressions.length === 0 ? (
            <div className="st-hud-sub">No mission expressions saved. Talk freely!</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {savedExpressions.map((expr) => {
                const used = usedSet.has(expr);
                return (
                  <div
                    key={expr}
                    className={`st-mission-row ${used ? "st-mission-row--done" : ""}`}
                    onClick={() => onSendTextTurn(`${expr}. 지금 이 상황에서 꼭 하고 싶은 말이에요.`)}
                    title="Say a line that uses this expression"
                  >
                    <span style={{ fontFamily: "Pretendard, var(--sans)" }}>
                      <span style={{ marginRight: 6 }}>{used ? "✓" : "○"}</span>
                      {expr}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: used ? "#11643c" : "var(--muted)" }}>
                      {used ? "Done" : "Say"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Clues as a compact chip row */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
            <div className="st-hud-title" style={{ marginBottom: 6 }}>
              Clues in the scene{" "}
              <span style={{ color: "var(--muted)", fontWeight: 500 }}>gaze or click</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {world?.props.map((prop) => {
                const isSelected = inspectedProp?.id === prop.id;
                const isGazed = hoveredProp?.id === prop.id;
                return (
                  <button
                    key={prop.id}
                    type="button"
                    className="st-chip"
                    onClick={() => {
                      setInspectedProp(prop);
                      onSelectObject(prop.id);
                    }}
                    style={{
                      cursor: "pointer",
                      padding: "4px 10px",
                      fontSize: 12,
                      fontFamily: "Pretendard, var(--sans)",
                      background: isSelected ? "#fff4d6" : isGazed ? "var(--violet-tint)" : "#f2f2f4",
                      borderColor: isSelected ? "#f3dfae" : isGazed ? "#d3ccff" : "var(--line)",
                      color: isSelected ? "#8a5a00" : isGazed ? "#352a9e" : "var(--ink)",
                    }}
                  >
                    {prop.label_ko}
                  </button>
                );
              })}
            </div>
            {activeProp && (
              <div
                className="st-hud-sub"
                style={{
                  marginTop: 8,
                  padding: "7px 10px",
                  borderRadius: 10,
                  background: "#fff4d6",
                  color: "#6b4600",
                  fontFamily: "Pretendard, var(--sans)",
                }}
              >
                <strong>{activeProp.label_ko}</strong> · {activeProp.clue_text_ko}
              </div>
            )}
          </div>
        </div>

        {hints.length > 0 && (
          <div className="st-hud-card" style={{ padding: "12px 14px", borderColor: "#bfe8d2" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span className="st-hud-title" style={{ color: "#11643c" }}>
                Suggested lines
              </span>
              <button
                type="button"
                onClick={() => setHints([], "")}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14 }}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
            {coachTipKo && (
              <div className="st-hud-sub" style={{ marginBottom: 8, fontFamily: "Pretendard, var(--sans)" }}>
                {coachTipKo}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {hints.slice(0, 2).map((h, i) => (
                <div key={i} style={{ background: "#f6f6f8", borderRadius: 12, padding: "9px 10px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "Pretendard, var(--sans)", marginBottom: 2 }}>
                    “{h.line_ko}”
                  </div>
                  {h.translation_en && (
                    <div style={{ fontSize: 12, color: "var(--body)", marginBottom: 2 }}>{h.translation_en}</div>
                  )}
                  <div className="st-hud-sub" style={{ fontSize: 11, marginBottom: 7, fontFamily: "Pretendard, var(--sans)" }}>
                    {h.nuance_tip_ko}
                  </div>
                  <button
                    type="button"
                    className="st-pill st-pill--green"
                    style={{ width: "100%", justifyContent: "center", padding: "7px 10px" }}
                    onClick={() => {
                      onSendTextTurn(h.line_ko);
                      setHints([], "");
                    }}
                  >
                    Say this line
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---------- RIGHT: Argon trace panel (toggle) ---------- */}
      {showTracePanel && (
        <div
          className="st-hud-card"
          style={{
            position: "absolute",
            right: 20,
            top: 76,
            width: 320,
            padding: "12px 14px",
            pointerEvents: "auto",
            maxHeight: "calc(100vh - 250px)",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
            <span className="st-hud-title">Gemini 4 Argon trace</span>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>Interactions API</span>
          </div>
          <div className="st-hud-sub" style={{ marginBottom: 10 }}>
            Adaptive thinking (minimal → high), schema-verified, chained by interaction id.
          </div>
          {directorNoteKo && (
            <div
              className="st-hud-sub"
              style={{
                background: "var(--violet-tint)",
                borderLeft: "3px solid var(--violet)",
                padding: "7px 9px",
                borderRadius: 8,
                color: "#352a9e",
                marginBottom: 10,
                fontFamily: "Pretendard, var(--sans)",
              }}
            >
              <strong>Director's note</strong> · {directorNoteKo}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {argonTraces
              .slice()
              .reverse()
              .map((tr, idx) => {
                const badge = THINKING_BADGE[tr.thinking_level] ?? THINKING_BADGE.low;
                return (
                  <div
                    key={`${tr.interaction_id}-${idx}`}
                    style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "7px 9px", fontSize: 11, background: "#fff" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <strong>{tr.stage}</strong>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.text,
                          padding: "1px 7px",
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        thinking: {tr.thinking_level}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--body)", fontSize: 10 }}>
                      <span>{tr.latency_ms} ms</span>
                      <span>{tr.repair_attempts > 0 ? `self-repair ×${tr.repair_attempts}` : "schema verified"}</span>
                    </div>
                    {tr.previous_interaction_id && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--violet)",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        chained from {tr.previous_interaction_id.slice(0, 18)}…
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ---------- CENTER: gaze reticle ---------- */}
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
          gap: 6,
        }}
      >
        <div
          style={{
            width: hoveredProp ? 14 : 8,
            height: hoveredProp ? 14 : 8,
            borderRadius: "50%",
            border: `2px solid ${hoveredProp ? "#f2b705" : "rgba(255,255,255,0.6)"}`,
            background: hoveredProp ? "rgba(242, 183, 5, 0.35)" : "transparent",
            transition: "all 0.15s ease",
          }}
        />
        {hoveredProp && (
          <span
            className="st-chip"
            style={{ padding: "2px 9px", fontSize: 11, background: "var(--hud-glass)", fontFamily: "Pretendard, var(--sans)" }}
          >
            Looking at {hoveredProp.label_ko}
          </span>
        )}
      </div>

      {/* ---------- BOTTOM: film subtitles + controls ---------- */}
      <div
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 18,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          pointerEvents: "auto",
        }}
      >
        <div style={{ width: "100%", maxWidth: 820, textAlign: "center", padding: "6px 20px" }}>
          <div
            className="st-subtitle-line"
            style={{
              fontSize: 22,
              lineHeight: 1.45,
              minHeight: 30,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            <span style={{ color: "#f2c94c", marginRight: 10, fontSize: 15 }}>
              {character?.display_name_ko ?? "Counterpart"}
            </span>
            {latestCharacterLine.length > 140 ? "…" + latestCharacterLine.slice(-140) : latestCharacterLine}
          </div>
          {latestUserLine && (
            <div
              style={{
                marginTop: 6,
                fontSize: 15,
                color: "#eeeaf0",
                textShadow: "0 1px 2px #000, 0 2px 8px rgba(0,0,0,0.9)",
                fontFamily: "Pretendard, var(--sans)",
              }}
            >
              <strong style={{ color: "#9fe0b4" }}>You</strong> {latestUserLine}
            </div>
          )}
        </div>

        <div style={{ width: "100%", maxWidth: 820, display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            className={`st-pill ${isRecording ? "st-pill--coral" : "st-pill--violet"}`}
            style={{ padding: "12px 18px", fontSize: 13.5, borderRadius: 14 }}
            onClick={isRecording ? onStopMic : onStartMic}
          >
            {isRecording ? "● Stop mic" : "🎙 Start talking"}
          </button>
          <form onSubmit={handleTextSubmit} style={{ flex: 1, display: "flex", gap: 8, minWidth: 0 }}>
            <input
              type="text"
              className="st-hud-input"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type a line in Korean (e.g. 오늘 비가 많이 오네요. 잠깐 이야기할 수 있을까요?)"
            />
            <button
              type="submit"
              className="st-pill"
              style={{ background: "var(--hud-glass)", border: "1px solid var(--hud-line)", padding: "0 18px", borderRadius: 14 }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
