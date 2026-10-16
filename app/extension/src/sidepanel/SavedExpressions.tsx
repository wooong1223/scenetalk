interface SavedExpressionsProps {
  expressions: string[];
  onRemove: (expr: string) => void;
}

export function SavedExpressions({
  expressions,
  onRemove,
}: SavedExpressionsProps) {
  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.85)",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        borderRadius: "12px",
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: "#94a3b8",
          marginBottom: "6px",
        }}
      >
        📌 저장된 미션 표현 ({expressions.length}개)
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {expressions.map((expr) => (
          <span
            key={expr}
            onClick={() => onRemove(expr)}
            style={{
              background: "rgba(16, 185, 129, 0.2)",
              border: "1px solid #10b981",
              color: "#6ee7b7",
              padding: "3px 9px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {expr} ✕
          </span>
        ))}
      </div>
    </div>
  );
}
