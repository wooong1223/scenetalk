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
          background: "#090d16",
          color: "#f8fafc",
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
            border: "4px solid rgba(245, 158, 11, 0.25)",
            borderTopColor: "#f59e0b",
            animation: "spin 1s linear infinite",
          }}
        />
        <div style={{ fontSize: "20px", fontWeight: 800 }}>
          🧠 Gemini 4 Argon (thinking_level=&quot;high&quot;) 심층 리포트 생성 중...
        </div>
        <div style={{ fontSize: "14px", color: "#94a3b8" }}>
          대화 전사, 미션 표현 자연스러움, 한국어 화용론과 멀티버스 스토리 분기를 종합 검증하고 있습니다.
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
          background: "#090d16",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
        }}
      >
        <h2>학습 리포트를 불러오지 못했습니다</h2>
        <p style={{ color: "#f87171" }}>{error}</p>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            padding: "10px 18px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top right, #1e1b4b 0%, #090d16 55%)",
        color: "#f8fafc",
        padding: "36px 24px 64px",
        fontFamily:
          "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                color: "#fbbf24",
                letterSpacing: "0.08em",
                marginBottom: "6px",
              }}
            >
              SCENETALK · GEMINI 4 ARGON HIGH-THINKING VERIFIER
            </div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 900 }}>
              🎬 씬 체험 &amp; 한국어 화용론 심층 리포트
            </h1>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => navigate(`/scene/${sessionId}`)}
              style={{
                background: "rgba(30, 41, 59, 0.85)",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                color: "#e2e8f0",
                borderRadius: "12px",
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ↩ 3D 씬으로 돌아가기
            </button>
            <button
              onClick={() => navigate("/")}
              style={{
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                border: "none",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "10px 18px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ✨ 새로운 씬 시작하기
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
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
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
                    "conic-gradient(#10b981 0%, #3b82f6 70%, rgba(30,41,59,0.5) 100%)",
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
                    background: "#0f172a",
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
                      color: "#34d399",
                    }}
                  >
                    {report.fluency_score}
                  </span>
                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                    / 100점
                  </span>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#6ee7b7",
                    marginBottom: "6px",
                  }}
                >
                  총평 &amp; 화용론 피드백
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.55,
                    color: "#f1f5f9",
                  }}
                >
                  {report.summary_ko}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#94a3b8",
                    marginTop: "6px",
                  }}
                >
                  {report.summary_en}
                </div>
              </div>
            </div>

            {report.next_mission_ko && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "rgba(59, 130, 246, 0.14)",
                  border: "1px solid rgba(59, 130, 246, 0.35)",
                  fontSize: "13px",
                  color: "#bfdbfe",
                }}
              >
                <strong>🚀 다음 도전 미션:</strong> {report.next_mission_ko}
              </div>
            )}
          </div>

          {/* Original vs User Multiverse Story Comparison */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid rgba(168, 85, 247, 0.35)",
              borderRadius: "18px",
              padding: "24px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "#d8b4fe",
                marginBottom: "10px",
              }}
            >
              🌌 원작 씬 vs 나의 멀티버스 스토리 분기 분석
            </div>
            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.65,
                color: "#e2e8f0",
                margin: "0 0 14px",
              }}
            >
              {report.story_comparison_ko ||
                "원작의 긴장감 있는 대치 구도 속에서 사용자만의 주체적인 선택과 대사로 새로운 관계 변화를 이끌어냈습니다."}
            </p>
            {session && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  background: "rgba(30, 41, 59, 0.7)",
                  padding: "10px 12px",
                  borderRadius: "10px",
                }}
              >
                <div>
                  <strong>상대 캐릭터:</strong>{" "}
                  {session.character.display_name_ko} ·{" "}
                  <strong>도달 페이즈:</strong> {session.story.phase} ·{" "}
                  <strong>총 대화 턴:</strong> {session.story.turn_count}턴
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Saved Expressions Mastery */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            borderRadius: "18px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800 }}>
            📌 저장한 미션 표현 활용 평가
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
                  background: "rgba(30, 41, 59, 0.75)",
                  border: `1px solid ${
                    item.used ? "#10b981" : "rgba(148, 163, 184, 0.25)"
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
                        ? "rgba(16, 185, 129, 0.2)"
                        : "rgba(148, 163, 184, 0.2)",
                      color: item.used ? "#6ee7b7" : "#94a3b8",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {item.used ? "✅ 미션 성공" : "미사용"}
                  </span>
                </div>
                {item.evidence_utterance_ko && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#93c5fd",
                      marginBottom: "8px",
                      fontStyle: "italic",
                    }}
                  >
                    발화: “{item.evidence_utterance_ko}”
                  </div>
                )}
                <div
                  style={{
                    fontSize: "13px",
                    color: "#cbd5e1",
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
            background: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            borderRadius: "18px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800 }}>
            ✍️ 한국어 문법 · 화용론 · 존댓말 교정 노트
          </h2>
          {report.corrections.length === 0 ? (
            <div style={{ color: "#6ee7b7", fontSize: "14px" }}>
              교정이 필요한 어색한 표현 없이 매우 자연스럽게 대화를 이끌어갔습니다!
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
                    background: "rgba(30, 41, 59, 0.75)",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    borderLeft: "4px solid #38bdf8",
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
                        color: "#fca5a5",
                        textDecoration: "line-through",
                      }}
                    >
                      {fix.user_utterance_ko}
                    </span>
                    <span style={{ color: "#94a3b8" }}>→</span>
                    <strong style={{ color: "#6ee7b7" }}>
                      {fix.natural_rewrite_ko}
                    </strong>
                  </div>
                  <div style={{ fontSize: "13px", color: "#cbd5e1" }}>
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
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
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
                🧠 Gemini 4 Argon (`gemini-4-argon`) 4-Tier Thinking 파이프라인 로그
              </h2>
              <div
                style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}
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
                    borderBottom: "1px solid rgba(148, 163, 184, 0.25)",
                    textAlign: "left",
                    color: "#94a3b8",
                  }}
                >
                  <th style={{ padding: "10px 8px" }}>단계 (Stage)</th>
                  <th style={{ padding: "10px 8px" }}>모델</th>
                  <th style={{ padding: "10px 8px" }}>Thinking Level</th>
                  <th style={{ padding: "10px 8px" }}>Latency</th>
                  <th style={{ padding: "10px 8px" }}>Interaction Chain</th>
                  <th style={{ padding: "10px 8px" }}>Schema 검증</th>
                </tr>
              </thead>
              <tbody>
                {traces.map((tr, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
                    }}
                  >
                    <td style={{ padding: "10px 8px", fontWeight: 700 }}>
                      {tr.stage}
                    </td>
                    <td style={{ padding: "10px 8px", color: "#cbd5e1" }}>
                      <code>{tr.model}</code>
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontWeight: 700,
                          fontSize: "11px",
                          background: "rgba(168, 85, 247, 0.2)",
                          color: "#e9d5ff",
                          border: "1px solid #a855f7",
                        }}
                      >
                        {tr.thinking_level}
                      </span>
                    </td>
                    <td style={{ padding: "10px 8px", color: "#93c5fd" }}>
                      {tr.latency_ms} ms
                    </td>
                    <td
                      style={{
                        padding: "10px 8px",
                        fontSize: "11px",
                        color: "#94a3b8",
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
                    <td style={{ padding: "10px 8px", color: "#6ee7b7" }}>
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
