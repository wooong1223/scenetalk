import { useEffect, useState } from "react";
import {
  ArgonCallTrace,
  completeSession,
  getSession,
  LearningReport,
  SessionRecord,
} from "../api/client";
import { useAppNavigate } from "../router";

interface ResultPageProps {
  sessionId: string;
}

export function ResultPage({ sessionId }: ResultPageProps) {
  const navigate = useAppNavigate();

  const [session, setSession] = useState<SessionRecord | null>(null);
  const [report, setReport] = useState<LearningReport | null>(null);
  const [traces, setTraces] = useState<ArgonCallTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const s = await getSession(sessionId);
        if (cancelled) return;
        setSession(s);

        if (s.report) {
          setReport(s.report);
          setTraces(s.argon_traces || []);
        } else {
          const rep = await completeSession(sessionId);
          if (cancelled) return;
          setReport(rep);
          const refreshed = await getSession(sessionId);
          if (!cancelled) {
            setSession(refreshed);
            setTraces(refreshed.argon_traces || []);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--page)",
          color: "#111111",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          fontFamily:
            "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            border: "4px solid #fdf3d7",
            borderTopColor: "#b8860b",
            animation: "spin 1s linear infinite",
          }}
        />
        <div style={{ fontSize: "20px", fontWeight: 800 }}>
          Grading your scene…
        </div>
        <div style={{ fontSize: "14px", color: "#5b5b66" }}>
          Gemini is reviewing your transcript, your mission expressions, Korean pragmatics and how your choices changed the story. This takes about 30–40 seconds.
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--page)",
          color: "#111111",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
        }}
      >
        <h2>We couldn't load your report</h2>
        <p style={{ color: "#b42323" }}>{error}</p>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "#4f3fd8",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            padding: "10px 18px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "var(--page)",
        color: "#111111",
        padding: "36px 24px 64px",
        fontFamily: "var(--sans)",
      }}
    >
      <div style={{ maxWidth: "1020px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "28px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "#8a6400",
                letterSpacing: "0.08em",
                marginBottom: "6px",
              }}
            >
              Scene report
            </div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 900 }}>
              How you did in the scene
            </h1>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => navigate(`/scene/${sessionId}`)}
              style={{
                background: "#ffffff",
                border: "1px solid #e6e6ea",
                color: "#111111",
                borderRadius: "12px",
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Back to the scene
            </button>
            <button
              onClick={() => navigate("/")}
              style={{
                background: "linear-gradient(135deg, #4f3fd8, #6a5cf0)",
                border: "none",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "10px 18px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Start a new scene
            </button>
          </div>
        </div>

        {/* Top Summary Grid: Fluency Score + Story Multiverse Comparison */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          {/* Score & Summary Card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e6e6ea",
              borderRadius: "18px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div
                style={{
                  width: "88px",
                  height: "88px",
                  borderRadius: "50%",
                  background:
                    "conic-gradient(#1fa463 0%, #4f3fd8 70%, #f7f7f8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "24px",
                      fontWeight: 900,
                      color: "#1fa463",
                    }}
                  >
                    {report.fluency_score}
                  </span>
                  <span style={{ fontSize: "10px", color: "#5b5b66" }}>
                    / 100
                  </span>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#11643c",
                    marginBottom: "6px",
                  }}
                >
                  Overall feedback
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.55,
                    color: "#111111",
                  }}
                >
                  {report.summary_en || report.summary_ko}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#5b5b66",
                    marginTop: "8px",
                    lineHeight: 1.6,
                    fontFamily: "Pretendard, var(--sans)",
                  }}
                >
                  {report.summary_en ? report.summary_ko : ""}
                </div>
              </div>
            </div>

            {report.next_mission_ko && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "#eeebff",
                  border: "1px solid #d3ccff",
                  fontSize: "13px",
                  color: "#352a9e",
                }}
              >
                <strong>Next mission:</strong> {report.next_mission_ko}
              </div>
            )}
          </div>

          {/* Original vs User Multiverse Story Comparison */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e4d4ff",
              borderRadius: "18px",
              padding: "24px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "#5b2fb8",
                marginBottom: "10px",
              }}
            >
              Original scene vs. your version
            </div>
            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.65,
                color: "#111111",
                margin: "0 0 14px",
              }}
            >
              {report.story_comparison_ko ||
                "You steered the original standoff in your own direction with your choices and lines."}
            </p>
            {session && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#5b5b66",
                  background: "#f7f7f8",
                  padding: "10px 12px",
                  borderRadius: "10px",
                }}
              >
                <div>
                  <strong>Counterpart:</strong>{" "}
                  {session.character.display_name_ko} ·{" "}
                  <strong>Phase reached:</strong> {session.story.phase} ·{" "}
                  <strong>Turns:</strong> {session.story.turn_count}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Saved Expressions Mastery */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e6e6ea",
            borderRadius: "18px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800 }}>
            Mission expressions
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "14px",
            }}
          >
            {report.expression_results.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: "#f7f7f8",
                  border: `1px solid ${
                    item.used ? "#1fa463" : "#e6e6ea"
                  }`,
                  borderRadius: "14px",
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "16px", fontWeight: 800 }}>
                    {item.expression}
                  </span>
                  <span
                    style={{
                      background: item.used
                        ? "#e8f7ef"
                        : "#e6e6ea",
                      color: item.used ? "#11643c" : "#5b5b66",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {item.used ? "✓ Used" : "Not used"}
                  </span>
                </div>
                {item.evidence_utterance_ko && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#3f31b8",
                      marginBottom: "8px",
                      fontStyle: "italic",
                    }}
                  >
                    You said: “{item.evidence_utterance_ko}”
                  </div>
                )}
                <div
                  style={{
                    fontSize: "13px",
                    color: "#5b5b66",
                    lineHeight: 1.5,
                  }}
                >
                  {item.feedback_ko}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grammar & Nuance Fixes */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e6e6ea",
            borderRadius: "18px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800 }}>
            Corrections: grammar, politeness, nuance
          </h2>
          {report.corrections.length === 0 ? (
            <div style={{ color: "#11643c", fontSize: "14px" }}>
              No awkward lines to fix — you carried the conversation naturally.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {report.corrections.map((fix, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#f7f7f8",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    borderLeft: "4px solid #1d6fa8",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      alignItems: "center",
                      marginBottom: "6px",
                      fontSize: "14px",
                    }}
                  >
                    <span
                      style={{
                        color: "#b42323",
                        textDecoration: "line-through",
                      }}
                    >
                      {fix.user_utterance_ko}
                    </span>
                    <span style={{ color: "#5b5b66" }}>→</span>
                    <strong style={{ color: "#11643c" }}>
                      {fix.natural_rewrite_ko}
                    </strong>
                  </div>
                  <div style={{ fontSize: "13px", color: "#5b5b66" }}>
                    💡 {fix.issue_ko} ({fix.reason_en})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gemini 4 Argon 4-Tier Adaptive Thinking Trace Table */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #f3e2b3",
            borderRadius: "18px",
            padding: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
                Gemini 4 Argon thinking pipeline
              </h2>
              <div
                style={{ fontSize: "12px", color: "#5b5b66", marginTop: "4px" }}
              >
                Interactions API · Adaptive Thinking Level (minimal / low /
                medium / high) · Stateful previous_interaction_id Chain
              </div>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #e6e6ea",
                    textAlign: "left",
                    color: "#5b5b66",
                  }}
                >
                  <th style={{ padding: "10px 8px" }}>Stage</th>
                  <th style={{ padding: "10px 8px" }}>Model</th>
                  <th style={{ padding: "10px 8px" }}>Thinking Level</th>
                  <th style={{ padding: "10px 8px" }}>Latency</th>
                  <th style={{ padding: "10px 8px" }}>Interaction Chain</th>
                  <th style={{ padding: "10px 8px" }}>Schema check</th>
                </tr>
              </thead>
              <tbody>
                {traces.map((tr, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid #efeff2",
                    }}
                  >
                    <td style={{ padding: "10px 8px", fontWeight: 700 }}>
                      {tr.stage}
                    </td>
                    <td style={{ padding: "10px 8px", color: "#5b5b66" }}>
                      <code>{tr.model}</code>
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontWeight: 700,
                          fontSize: "11px",
                          background: "#f1e9ff",
                          color: "#5b2fb8",
                          border: "1px solid #7c3aed",
                        }}
                      >
                        {tr.thinking_level}
                      </span>
                    </td>
                    <td style={{ padding: "10px 8px", color: "#3f31b8" }}>
                      {tr.latency_ms} ms
                    </td>
                    <td
                      style={{
                        padding: "10px 8px",
                        fontSize: "11px",
                        color: "#5b5b66",
                      }}
                    >
                      {tr.previous_interaction_id
                        ? `⛓ ${tr.previous_interaction_id.slice(0, 14)}... → ${(
                            tr.interaction_id ?? ""
                          ).slice(0, 14)}...`
                        : tr.interaction_id
                        ? `🌱 Root: ${tr.interaction_id.slice(0, 18)}...`
                        : "—"}
                    </td>
                    <td style={{ padding: "10px 8px", color: "#11643c" }}>
                      {tr.repair_attempts > 0
                        ? `🔧 Self-Repaired (${tr.repair_attempts})`
                        : "✓ Strict JSON Pass"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
