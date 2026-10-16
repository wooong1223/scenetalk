import { useEffect, useMemo, useState } from "react";
import {
  getLesson,
  Lesson,
  loadSavedExpressions,
  MatchPair,
  QuizItem,
  storeSavedExpressions,
} from "../api/client";
import { useAppNavigate } from "../router";
import { LanguageSelector } from "./LanguageSelector";

type Stage = "loading" | "error" | "intro" | "quiz" | "done";

const KO = { fontFamily: "Pretendard, var(--sans)" } as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface QueueItem {
  item: QuizItem;
  retry: boolean;
}

export function LessonPage({ videoId }: { videoId: string }) {
  const navigate = useAppNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState<string | null>(null);

  const [vocabIdx, setVocabIdx] = useState(0);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [hearts, setHearts] = useState(5);
  const [xp, setXp] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStage("loading");
    getLesson(videoId)
      .then((l) => {
        if (cancelled) return;
        setLesson(l);
        setQueue(l.quiz.map((item) => ({ item, retry: false })));
        setStage(l.vocab.length > 0 ? "intro" : "quiz");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStage("error");
      });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const total = queue.length;
  const current = queue[qIdx];
  const progress = total ? Math.min(1, qIdx / total) : 0;

  const finish = () => {
    if (lesson) {
      const prev = loadSavedExpressions(videoId);
      const merged = [...prev];
      lesson.vocab.forEach((v) => {
        if (!merged.includes(v.expression)) merged.push(v.expression);
      });
      storeSavedExpressions(videoId, merged);
    }
    setStage("done");
  };

  const answer = (ok: boolean, explanation: string) => {
    if (!current) return;
    if (ok) {
      setXp((x) => x + (current.retry ? 5 : 10));
      setCorrectCount((c) => c + 1);
      setFeedback({ ok: true, text: explanation || "Nice." });
    } else {
      setHearts((h) => Math.max(0, h - 1));
      setFeedback({ ok: false, text: explanation || "Let's see this one again later." });
      if (!current.retry) {
        setQueue((q) => [...q, { item: current.item, retry: true }]);
      }
    }
  };

  const next = () => {
    setFeedback(null);
    if (qIdx + 1 >= queue.length) {
      finish();
    } else {
      setQIdx((i) => i + 1);
    }
  };

  if (stage === "loading") {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "110px 0" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Building your lesson</h1>
          <p style={{ color: "var(--body)", marginTop: 10, fontSize: 15, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
            Gemini is picking the most useful expressions from the clip and writing the questions.
            The first time for a clip takes 30 seconds to 2 minutes.
          </p>
          <div className="st-shimmer" style={{ width: 280, height: 8, borderRadius: 8, margin: "28px auto 0" }} />
        </div>
      </Shell>
    );
  }

  if (stage === "error" || !lesson) {
    return (
      <Shell>
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <h1 style={{ fontSize: 24 }}>We couldn't build this lesson</h1>
          <p style={{ color: "var(--body)", marginTop: 8 }}>{error}</p>
          <button className="st-btn" style={{ marginTop: 18 }} onClick={() => navigate(`/?v=${videoId}`)}>
            Back to home
          </button>
        </div>
      </Shell>
    );
  }

  if (stage === "intro") {
    const v = lesson.vocab[vocabIdx];
    return (
      <Shell
        top={
          <TopBar
            label={`Expression ${vocabIdx + 1} of ${lesson.vocab.length}`}
            progress={(vocabIdx + 1) / lesson.vocab.length}
            onExit={() => navigate(`/?v=${videoId}`)}
            hearts={null}
            xp={null}
          />
        }
      >
        <div className="st-card" style={{ maxWidth: 680, margin: "28px auto 0", padding: "40px 40px 32px" }}>
          <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 10 }}>{lesson.title_en || lesson.title_ko}</div>
          <div style={{ ...KO, fontSize: 48, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
            {v.expression}
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, marginTop: 14 }}>{v.meaning_en}</div>
          <div style={{ ...KO, fontSize: 15, color: "var(--body)", marginTop: 4 }}>{v.meaning_ko}</div>

          <div
            style={{
              marginTop: 26,
              padding: "14px 18px",
              borderLeft: "4px solid var(--green)",
              background: "var(--green-tint)",
              borderRadius: "0 12px 12px 0",
              fontSize: 15,
              lineHeight: 1.7,
              color: "#11643c",
              ...KO,
            }}
          >
            {v.nuance_ko}
          </div>

          <div style={{ marginTop: 22, display: "grid", gap: 6 }}>
            <div style={{ ...KO, fontSize: 18, fontWeight: 700 }}>{v.example_ko}</div>
            <div style={{ fontSize: 15, color: "var(--body)" }}>{v.example_en}</div>
            {v.source_line_ko && (
              <div style={{ ...KO, fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
                In the clip: “{v.source_line_ko}”
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 34, justifyContent: "space-between", alignItems: "center" }}>
            <span className="st-chip" style={{ fontSize: 12 }}>{v.formality}</span>
            <div style={{ display: "flex", gap: 10 }}>
              {vocabIdx > 0 && (
                <button className="st-btn st-btn--ghost" onClick={() => setVocabIdx((i) => i - 1)}>
                  Back
                </button>
              )}
              {vocabIdx + 1 < lesson.vocab.length ? (
                <button className="st-btn st-btn--green" onClick={() => setVocabIdx((i) => i + 1)} style={{ padding: "12px 24px" }}>
                  Next
                </button>
              ) : (
                <button className="st-btn st-btn--green" onClick={() => setStage("quiz")} style={{ padding: "12px 24px" }}>
                  Start the quiz
                </button>
              )}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (stage === "done") {
    const accuracy = total ? Math.round((correctCount / total) * 100) : 0;
    return (
      <Shell>
        <div className="st-card" style={{ maxWidth: 680, margin: "60px auto 0", padding: "44px 40px", textAlign: "center" }}>
          <h1 style={{ fontSize: 34, fontWeight: 800 }}>Lesson complete</h1>
          <div style={{ display: "flex", justifyContent: "center", gap: 36, marginTop: 26 }}>
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat label="XP earned" value={`${xp}`} />
            <Stat label="Hearts left" value={`${hearts}`} />
          </div>
          <div style={{ marginTop: 32, textAlign: "left" }}>
            <div style={{ color: "var(--body)", fontSize: 14, marginBottom: 10 }}>
              These expressions are now your roleplay mission
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {lesson.vocab.map((v) => (
                <span key={v.expression} className="st-chip st-chip--green" style={KO}>
                  {v.expression}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 36, flexWrap: "wrap" }}>
            <button
              className="st-btn st-btn--violet"
              style={{ fontSize: 16, padding: "14px 24px" }}
              onClick={() => navigate(`/?tab=roleplay&v=${videoId}`)}
            >
              Roleplay with these expressions
            </button>
            <button
              className="st-btn"
              onClick={() => {
                setQueue(lesson.quiz.map((item) => ({ item, retry: false })));
                setQIdx(0);
                setHearts(5);
                setXp(0);
                setCorrectCount(0);
                setVocabIdx(0);
                setStage("intro");
              }}
            >
              Practice again
            </button>
          </div>
          {lesson.argon_trace && (
            <div style={{ marginTop: 28 }}>
              <TraceBadge trace={lesson.argon_trace} />
            </div>
          )}
        </div>
      </Shell>
    );
  }

  if (!current) {
    finish();
    return null;
  }

  return (
    <Shell
      top={
        <TopBar
          label={`Question ${Math.min(qIdx + 1, total)} of ${total}`}
          progress={progress}
          onExit={() => navigate(`/?v=${videoId}`)}
          hearts={hearts}
          xp={xp}
        />
      }
    >
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "30px 0 160px" }}>
        <QuizCard key={`${qIdx}-${current.item.expression}`} item={current.item} locked={!!feedback} onAnswer={answer} />
      </div>
      {feedback && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            background: feedback.ok ? "var(--green-tint)" : "var(--coral-tint)",
            borderTop: `2px solid ${feedback.ok ? "#bfe8d2" : "#f3c2c2"}`,
            padding: "22px 24px 28px",
          }}
        >
          <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div
                aria-hidden
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: feedback.ok ? "var(--green)" : "var(--coral)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {feedback.ok ? "✓" : "✕"}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: feedback.ok ? "#11643c" : "#8e2323" }}>
                  {feedback.ok ? "Correct" : "Not quite"}
                </div>
                <div style={{ ...KO, fontSize: 14, marginTop: 4, lineHeight: 1.6, maxWidth: 520, color: feedback.ok ? "#1d5e3c" : "#7a2a2a" }}>
                  {feedback.text}
                </div>
              </div>
            </div>
            <button
              className={`st-btn ${feedback.ok ? "st-btn--green" : "st-btn--violet"}`}
              onClick={next}
              style={{ fontSize: 16, padding: "12px 30px" }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
      {lesson.argon_trace && <TraceBadge trace={lesson.argon_trace} corner />}
    </Shell>
  );
}

// ---------- pieces ----------

function Shell({ children, top }: { children: React.ReactNode; top?: React.ReactNode }) {
  return (
    <div className="st-page" style={{ paddingBottom: 40 }}>
      <div className="st-wrap">
        {top}
        {children}
      </div>
    </div>
  );
}

function TopBar({
  label,
  progress,
  onExit,
  hearts,
  xp,
}: {
  label: string;
  progress: number;
  onExit: () => void;
  hearts: number | null;
  xp: number | null;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "22px 0 6px" }}>
      <button className="st-btn st-btn--ghost" onClick={onExit} aria-label="Exit lesson" style={{ padding: "8px 12px", fontSize: 18 }}>
        ✕
      </button>
      <div style={{ flex: 1 }}>
        <div className="st-progress">
          <div style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{label}</div>
      </div>
      {hearts !== null && (
        <div style={{ color: "var(--coral)", fontSize: 17, letterSpacing: 2, minWidth: 96, textAlign: "right" }} aria-label={`${hearts} hearts`}>
          {"♥".repeat(hearts)}
          <span style={{ opacity: 0.22 }}>{"♥".repeat(Math.max(0, 5 - hearts))}</span>
        </div>
      )}
      {xp !== null && (
        <div style={{ color: "var(--green-dark)", fontWeight: 700, fontSize: 14, minWidth: 60, textAlign: "right" }}>
          {xp} XP
        </div>
      )}
      <LanguageSelector compact />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--body)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function TraceBadge({ trace, corner }: { trace: NonNullable<Lesson["argon_trace"]>; corner?: boolean }) {
  return (
    <div
      style={{
        position: corner ? "fixed" : "static",
        left: corner ? 16 : undefined,
        bottom: corner ? 16 : undefined,
        display: "inline-flex",
        gap: 8,
        alignItems: "center",
        fontSize: 11,
        color: "var(--body)",
        border: "1px solid var(--line)",
        borderRadius: 999,
        padding: "5px 10px",
        background: "var(--card)",
        boxShadow: "var(--shadow)",
      }}
    >
      <span>gemini-4-argon</span>
      <span style={{ color: "var(--violet)" }}>thinking: {trace.thinking_level}</span>
      <span>{trace.latency_ms} ms</span>
      <span>{trace.fallback_used ? "fallback" : trace.repair_attempts > 0 ? `repaired ×${trace.repair_attempts}` : "schema ok"}</span>
    </div>
  );
}

// ---------- quiz card ----------

function QuizCard({
  item,
  locked,
  onAnswer,
}: {
  item: QuizItem;
  locked: boolean;
  onAnswer: (ok: boolean, explanation: string) => void;
}) {
  if (item.kind === "match") {
    return <MatchCard item={item} locked={locked} onAnswer={onAnswer} />;
  }
  return <ChoiceCard item={item} locked={locked} onAnswer={onAnswer} />;
}

function ChoiceCard({
  item,
  locked,
  onAnswer,
}: {
  item: QuizItem;
  locked: boolean;
  onAnswer: (ok: boolean, explanation: string) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const isFill = item.kind === "fill_blank";
  const correct = item.answer_index;

  const promptParts = useMemo(() => {
    if (!isFill) return null;
    const idx = item.prompt_ko.indexOf("____");
    if (idx < 0) return null;
    return [item.prompt_ko.slice(0, idx), item.prompt_ko.slice(idx + 4)];
  }, [isFill, item.prompt_ko]);

  const choose = (i: number) => {
    if (locked || picked !== null) return;
    setPicked(i);
    onAnswer(i === correct, item.explanation_ko);
  };

  return (
    <div>
      <div style={{ color: "var(--body)", fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
        {isFill ? "Fill in the blank" : "What does this mean?"}
      </div>
      {isFill && promptParts ? (
        <div style={{ ...KO, fontSize: 28, fontWeight: 700, lineHeight: 1.5 }}>
          {promptParts[0]}
          <span
            style={{
              display: "inline-block",
              minWidth: 120,
              borderBottom: "3px solid var(--violet)",
              color: "var(--violet)",
              textAlign: "center",
              padding: "0 6px",
            }}
          >
            {picked !== null ? item.choices[picked] : " "}
          </span>
          {promptParts[1]}
        </div>
      ) : (
        <div style={{ ...KO, fontSize: 34, fontWeight: 800, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
          {item.prompt_ko}
        </div>
      )}
      {item.prompt_en && <div style={{ color: "var(--body)", fontSize: 15, marginTop: 10 }}>{item.prompt_en}</div>}
      <div style={{ display: "grid", gap: 12, marginTop: 28 }}>
        {item.choices.map((c, i) => {
          const isPicked = picked === i;
          const show = picked !== null;
          const cls =
            show && i === correct ? "st-choice st-choice--ok" : show && isPicked ? "st-choice st-choice--bad" : "st-choice";
          return (
            <button key={i} className={cls} onClick={() => choose(i)} disabled={locked || picked !== null} style={isFill ? KO : undefined}>
              <span className="st-choice-key">{show && i === correct ? "✓" : show && isPicked ? "✕" : i + 1}</span>
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchCard({
  item,
  locked,
  onAnswer,
}: {
  item: QuizItem;
  locked: boolean;
  onAnswer: (ok: boolean, explanation: string) => void;
}) {
  const pairs: MatchPair[] = item.pairs.slice(0, 5);
  const left = useMemo(() => shuffle(pairs.map((p) => p.ko)), [item]); // eslint-disable-line react-hooks/exhaustive-deps
  const right = useMemo(() => shuffle(pairs.map((p) => p.en)), [item]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selKo, setSelKo] = useState<string | null>(null);
  const [selEn, setSelEn] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState<"bad" | null>(null);

  const tryPair = (ko: string | null, en: string | null) => {
    if (!ko || !en) return;
    const ok = pairs.some((p) => p.ko === ko && p.en === en);
    if (ok) {
      const nextMatched = new Set(matched);
      nextMatched.add(ko);
      setMatched(nextMatched);
      setSelKo(null);
      setSelEn(null);
      if (nextMatched.size === pairs.length) {
        onAnswer(misses === 0, misses === 0 ? item.explanation_ko : `${misses} mix-up${misses === 1 ? "" : "s"} along the way. ${item.explanation_ko}`);
      }
    } else {
      setMisses((m) => m + 1);
      setFlash("bad");
      window.setTimeout(() => {
        setFlash(null);
        setSelKo(null);
        setSelEn(null);
      }, 420);
    }
  };

  const pickKo = (ko: string) => {
    if (locked || matched.has(ko)) return;
    setSelKo(ko);
    tryPair(ko, selEn);
  };
  const pickEn = (en: string) => {
    if (locked) return;
    const pairKo = pairs.find((p) => p.en === en)?.ko;
    if (pairKo && matched.has(pairKo)) return;
    setSelEn(en);
    tryPair(selKo, en);
  };

  const cell = (text: string, selected: boolean, done: boolean, onClick: () => void, ko: boolean) => (
    <button
      key={text}
      onClick={onClick}
      disabled={locked || done}
      className={`st-choice${done ? " st-choice--ok" : selected ? (flash ? " st-choice--bad" : " st-choice--sel") : ""}`}
      style={{ fontSize: 15, padding: "14px 14px", minHeight: 58, ...(ko ? KO : {}) }}
    >
      {text}
    </button>
  );

  return (
    <div>
      <div style={{ color: "var(--body)", fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Match the pairs</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{item.prompt_en || "Connect each expression to its meaning"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 24 }}>
        <div style={{ display: "grid", gap: 10 }}>
          {left.map((ko) => cell(ko, selKo === ko, matched.has(ko), () => pickKo(ko), true))}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {right.map((en) => {
            const pairKo = pairs.find((p) => p.en === en)?.ko ?? "";
            return cell(en, selEn === en, matched.has(pairKo), () => pickEn(en), false);
          })}
        </div>
      </div>
    </div>
  );
}
