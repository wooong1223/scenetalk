export interface ExtSubtitleLine {
  index: number;
  start_sec: number;
  end_sec: number;
  text_ko: string;
  text_en: string;
  tokens: string[];
}

interface SubtitleListProps {
  lines: ExtSubtitleLine[];
  currentTime: number;
  activeLine: ExtSubtitleLine | null;
  onSelectLine: (line: ExtSubtitleLine, token?: string) => void;
}

export function SubtitleList({
  lines,
  currentTime,
  activeLine,
  onSelectLine,
}: SubtitleListProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "7px",
        maxHeight: "260px",
        overflowY: "auto",
        paddingRight: "4px",
      }}
    >
      {lines.map((line) => {
        const isTimeActive =
          currentTime >= line.start_sec && currentTime <= line.end_sec;
        const isSelected = activeLine?.index === line.index;
        const highlight = isSelected || isTimeActive;

        return (
          <div
            key={line.index}
            onClick={() => onSelectLine(line)}
            style={{
              padding: "9px 11px",
              borderRadius: "10px",
              background: highlight
                ? "rgba(59, 130, 246, 0.22)"
                : "rgba(30, 41, 59, 0.7)",
              border: `1px solid ${
                highlight ? "#60a5fa" : "rgba(148, 163, 184, 0.18)"
              }`,
              cursor: "pointer",
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
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "11px",
                  color: "#93c5fd",
                }}
              >
                {Math.floor(line.start_sec / 60)}:
                {String(Math.floor(line.start_sec % 60)).padStart(2, "0")}
              </span>
              <span style={{ fontSize: "10px", color: "#60a5fa" }}>
                🔍 Argon 해설
              </span>
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: highlight ? 700 : 500,
                color: "#f8fafc",
              }}
            >
              {line.text_ko}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
              {line.text_en}
            </div>

            {line.tokens && line.tokens.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "5px",
                  marginTop: "6px",
                }}
              >
                {line.tokens.map((tok) => (
                  <span
                    key={tok}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLine(line, tok);
                    }}
                    style={{
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(56, 189, 248, 0.35)",
                      color: "#7dd3fc",
                      fontSize: "10px",
                      padding: "1px 7px",
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
  );
}
