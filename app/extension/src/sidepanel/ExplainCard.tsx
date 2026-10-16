export interface ExtExpressionNuance {
  expression: string;
  meaning_ko: string;
  meaning_en: string;
  nuance_note: string;
  formality: "casual" | "polite" | "formal";
  examples_ko: string[];
  practice_tip_ko: string;
}

interface ExplainCardProps {
  loading: boolean;
  nuance: ExtExpressionNuance | null;
  savedExpressions: string[];
  onSaveExpression: (expr: string) => void;
}

export function ExplainCard({
  loading,
  nuance,
  savedExpressions,
  onSaveExpression,
}: ExplainCardProps) {
  if (loading) {
    return (
      <div
        style={{
          background: "rgba(15, 23, 42, 0.85)",
          border: "1px solid rgba(59, 130, 246, 0.35)",
          borderRadius: "12px",
          padding: "14px",
          fontSize: "12px",
          color: "#93c5fd",
        }}
      >
        ⚡ Gemini 4 Argon (thinking_level=&quot;low&quot;)이 표현의 화용론·뉘앙스를 분석 중입니다...
      </div>
    );
  }

  if (!nuance) {
    return (
      <div
        style={{
          background: "rgba(15, 23, 42, 0.85)",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          borderRadius: "12px",
          padding: "12px",
          fontSize: "12px",
          color: "#94a3b8",
        }}
      >
        자막이나 #키워드 태그를 클릭하면{" "}
        <strong style={{ color: "#d8b4fe" }}>Gemini 4 Argon</strong> 해설이 표시됩니다.
      </div>
    );
  }

  const alreadySaved = savedExpressions.includes(nuance.expression);

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.92)",
        border: "1px solid rgba(56, 189, 248, 0.4)",
        borderRadius: "12px",
        padding: "12px 14px",
        fontSize: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "7px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong style={{ fontSize: "14px", color: "#fde68a" }}>
          “{nuance.expression}”
        </strong>
        <span
          style={{
            fontSize: "10px",
            background: "rgba(99, 102, 241, 0.25)",
            color: "#c7d2fe",
            padding: "2px 7px",
            borderRadius: "999px",
          }}
        >
          {nuance.formality}
        </span>
      </div>
      <div>
        <strong style={{ color: "#93c5fd" }}>의미:</strong> {nuance.meaning_ko} (
        {nuance.meaning_en})
      </div>
      <div>
        <strong style={{ color: "#6ee7b7" }}>화용론·어조:</strong>{" "}
        {nuance.nuance_note}
      </div>
      <div>
        <strong style={{ color: "#fcd34d" }}>실전 팁:</strong>{" "}
        {nuance.practice_tip_ko}
      </div>
      <button
        onClick={() => onSaveExpression(nuance.expression)}
        disabled={alreadySaved}
        style={{
          background: alreadySaved
            ? "rgba(16, 185, 129, 0.15)"
            : "rgba(16, 185, 129, 0.25)",
          border: "1px solid #10b981",
          color: "#6ee7b7",
          borderRadius: "8px",
          padding: "6px 10px",
          fontSize: "11px",
          fontWeight: 700,
          cursor: alreadySaved ? "default" : "pointer",
        }}
      >
        {alreadySaved ? "✓ 미션 표현에 저장됨" : "📌 3D 씬 미션 표현으로 저장"}
      </button>
    </div>
  );
}
