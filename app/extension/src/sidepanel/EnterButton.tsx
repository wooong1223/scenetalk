interface EnterButtonProps {
  loading: boolean;
  onEnter: () => void;
}

export function EnterButton({ loading, onEnter }: EnterButtonProps) {
  return (
    <button
      onClick={onEnter}
      disabled={loading}
      style={{
        width: "100%",
        background:
          "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)",
        border: "none",
        borderRadius: "12px",
        padding: "13px 16px",
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: 900,
        cursor: loading ? "wait" : "pointer",
        boxShadow: "0 8px 22px rgba(124, 58, 237, 0.45)",
      }}
    >
      {loading
        ? "🧠 Gemini 4 Argon (medium) 3D 씬 생성 중..."
        : "🚪 Enter the Scene — 3D 씬 속으로 들어가기"}
    </button>
  );
}
