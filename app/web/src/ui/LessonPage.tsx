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

type Stage = "loading" | "error" | "intro" | "quiz" | "done";

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
      setFeedback({ ok: true, text: explanation || "정확해요." });
    } else {
      setHearts((h) => Math.max(0, h - 1));
      setFeedback({ ok: false, text: explanation || "다시 한 번 볼까요?" });
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

  // ---------- Render ----------

  if (stage === "loading") {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "90px 0" }}>
          <div className="st-serif" style={{ fontSize: 28, fontWeight: 700 }}>
            Gemini 4 Argon이 레슨을 만드는 중
          </div>
          <div style={{ color: "var(--smoke)", marginTop: 10, fontSize: 14 }}>
            대사에서 핵심 표현을 고르고 문제를 짜고 있어요. 처음 여는 영상은 30초에서 길면 2분까지 걸립니다.
          </div>
          <div className="st-shimmer" style={{ width: 260, height: 4, borderRadius: 4, margin: "26px auto 0" }} />
        </div>
      </Shell>
    );
  }

  if (stage === "error" || !lesson) {
    return (
      <Shell>
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <div style={{ color: "var(--bad)", fontSize: 16 }}>레슨을 만들지 못했습니다. {error}</div>
          <button className="st-btn" style={{ marginTop: 18 }} onClick={() => navigate(`/?v=${videoId}`)}>
            홈으로
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
            label={`표현 ${vocabIdx + 1} / ${lesson.vocab.length}`}
            progress={(vocabIdx + 1) / lesson.vocab.length}
            onExit={() => navigate(`/?v=${videoId}`)}
            hearts={null}
            xp={null}
          />
        }
      >
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 0" }}>
          <div style={{ color: "var(--smoke)", fontSize: 13, marginBottom: 8 }}>
            {lesson.title_ko}
          </div>
          <div className="st-serif" style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            {v.expression}
          </div>
          <div style={{ fontSize: 22, marginTop: 14 }}>{v.meaning_en}</div>
          <div style={{ fontSize: 15, color: "var(--smoke)", marginTop: 4 }}>{v.meaning_ko}</div>

          <div
            style={{
              marginTop: 26,
              padding: "16px 18px",
              borderLeft: "3px solid var(--sub-yellow)",
              background: "rgba(242, 201, 76, 0.06)",
              borderRadius: "0 10px 10px 0",
              fontSize: 15,
              lineHeight: 1.7,
            }}
          >
            {v.nuance_ko}
          </div>

          <div style={{ marginTop: 22, display: "grid", gap: 6 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{v.example_ko}</div>
            <div style={{ fontSize: 14, color: "var(--smoke)" }}>{v.example_en}</div>
            {v.source_line_ko && (
              <div style={{ fontSize: 13, color: "var(--smoke-2)", marginTop: 6 }}>
                장면 속 대사: “{v.source_line_ko}”
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 34, justifyContent: "space-between", alignItems: "center" }}>
            <span className="st-chip" style={{ fontSize: 12 }}>{v.formality}</span>
            <div style={{ display: "flex", gap: 10 }}>
              {vocabIdx > 0 && (
                <button className="st-btn st-btn--ghost" onClick={() => setVocabIdx((i) => i - 1)}>
                  이전
                </button>
              )}
              {vocabIdx + 1 < lesson.vocab.length ? (
                <button className="st-btn st-btn--yellow" onClick={() => setVocabIdx((i) => i + 1)}>
                  다음 표현
                </button>
              ) : (
                <button className="st-btn st-btn--yellow" onClick={() => setStage("quiz")}>
                  문제 풀기
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
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 0", textAlign: "center" }}>
          <div className="st-serif" style={{ fontSize: 36, fontWeight: 900 }}>
            레슨 완료
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 24 }}>
            <Stat label="정답률" value={`${accuracy}%`} />
            <Stat label="경험치" value={`${xp} XP`} />
            <Stat label="남은 하트" value={"♥".repeat(hearts) || "0"} />
          </div>
          <div style={{ marginTop: 30, textAlign: "left" }}>
            <div style={{ color: "var(--smoke)", fontSize: 13, marginBottom: 10 }}>
              배운 표현은 미션 표현으로 저장했어요
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {lesson.vocab.map((v) => (
                <span key={v.expression} className="st-chip st-chip--done">
                  {v.expression}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 36, flexWrap: "wrap" }}>
            <button
              className="st-btn st-btn--velvet"
              style={{ fontSize: 16, padding: "14px 22px" }}
              onClick={() => navigate(`/?tab=roleplay&v=${videoId}`)}
            >
              이 표현으로 롤플레잉 하기
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
              다시 학습
            </button>
          </div>
          {lesson.argon_trace && <TraceBadge trace={lesson.argon_trace} />}
        </div>
      </Shell>
    );
  }

  // quiz
  if (!current) {
    finish();
    return null;
  }

  return (
    <Shell
      top={
        <TopBar
          label={`문제 ${Math.min(qIdx + 1, total)} / ${total}`}
          progress={progress}
          onExit={() => navigate(`/?v=${videoId}`)}
          hearts={hearts}
          xp={xp}
        />
      }
    >
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "34px 0 140px" }}>
        <QuizCard key={`${qIdx}-${current.item.expression}`} item={current.item} locked={!!feedback} onAnswer={answer} />
      </div>
      {feedback && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            background: feedback.ok ? "rgba(26, 58, 38, 0.97)" : "rgba(74, 24, 27, 0.97)",
            borderTop: `2px solid ${feedback.ok ? "var(--ok)" : "var(--bad)"}`,
            padding: "20px 16px 26px",
          }}
        >
          <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <div className="st-serif" style={{ fontSize: 20, fontWeight: 700, color: feedback.ok ? "#bff0cd" : "#ffc2c6" }}>
                {feedback.ok ? "정답" : "아쉬워요"}
              </div>
              <div style={{ fontSize: 14, marginTop: 4, lineHeight: 1.6, maxWidth: 520 }}>{feedback.text}</div>
            </div>
            <button className={`st-btn ${feedback.ok ? "st-btn--yellow" : ""}`} onClick={next} style={{ fontSize: 16, padding: "12px 26px" }}>
              계속
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
      <div className="st-wrap">{top}{children}</div>
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
      <button className="st-btn st-btn--ghost" onClick={onExit} aria-label="나가기" style={{ padding: "8px 12px" }}>
        ✕
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ height: 10, borderRadius: 999, background: "rgba(243,237,226,0.1)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${Math.round(progress * 100)}%`,
              background: "var(--sub-yellow)",
              borderRadius: 999,
              transition: "width 0.35s ease",
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "var(--smoke)", marginTop: 6 }}>{label}</div>
      </div>
      {hearts !== null && (
        <div style={{ color: "var(--velvet-2)", fontSize: 16, letterSpacing: 2, minWidth: 90, textAlign: "right" }} aria-label={`하트 ${hearts}`}>
          {"♥".repeat(hearts)}
          <span style={{ opacity: 0.25 }}>{"♥".repeat(Math.max(0, 5 - hearts))}</span>
        </div>
      )}
      {xp !== null && (
        <div style={{ color: "var(--sub-yellow)", fontWeight: 700, fontSize: 14, minWidth: 60, textAlign: "right" }}>
          {xp} XP
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="st-serif" style={{ fontSize: 30, fontWeight: 900 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--smoke)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function TraceBadge({ trace, corner }: { trace: NonNullable<Lesson["argon_trace"]>; corner?: boolean }) {
  return (
    <div
      style={{
        position: corner ? "fixed" : "static",
        right: 16,
        bottom: 16,
        marginTop: corner ? 0 : 30,
        display: "inline-flex",
        gap: 8,
        alignItems: "center",
        fontSize: 11,
        color: "var(--smoke)",
        border: "1px solid var(--line)",
        borderRadius: 999,
        padding: "5px 10px",
        background: "rgba(12,10,9,0.7)",
      }}
    >
      <span>gemini-4-argon</span>
      <span style={{ color: "#c9b3ff" }}>thinking: {trace.thinking_level}</span>
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
      <div style={{ color: "var(--smoke)", fontSize: 13, marginBottom: 10 }}>
        {isFill ? "빈칸에 들어갈 표현을 고르세요" : "이 표현의 뜻을 고르세요"}
      </div>
      {isFill && promptParts ? (
        <div className="st-serif" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.5 }}>
          {promptParts[0]}
          <span
            style={{
              display: "inline-block",
              minWidth: 120,
              borderBottom: "3px solid var(--sub-yellow)",
              color: "var(--sub-yellow)",
              textAlign: "center",
              padding: "0 6px",
            }}
          >
            {picked !== null ? item.choices[picked] : " "}
          </span>
          {promptParts[1]}
        </div>
      ) : (
        <div className="st-serif" style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
          {item.prompt_ko}
        </div>
      )}
      {item.prompt_en && (
        <div style={{ color: "var(--smoke)", fontSize: 14, marginTop: 8 }}>{item.prompt_en}</div>
      )}
      <div style={{ display: "grid", gap: 10, marginTop: 28 }}>
        {item.choices.map((c, i) => {
          const isPicked = picked === i;
          const show = picked !== null;
          const bg = show && i === correct ? "rgba(95,179,122,0.18)" : show && isPicked ? "rgba(216,67,75,0.18)" : "var(--panel)";
          const border = show && i === correct ? "var(--ok)" : show && isPicked ? "var(--bad)" : "var(--line)";
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={locked || picked !== null}
              style={{
                textAlign: "left",
                background: bg,
                border: `1px solid ${border}`,
                color: "var(--paper)",
                borderRadius: 12,
                padding: "16px 18px",
                fontSize: 17,
                cursor: picked === null ? "pointer" : "default",
                display: "flex",
                gap: 14,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  color: "var(--smoke)",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
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
        onAnswer(misses === 0, misses === 0 ? item.explanation_ko : `${misses}번 헷갈렸어요. ${item.explanation_ko}`);
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

  const cell = (text: string, selected: boolean, done: boolean, onClick: () => void) => (
    <button
      key={text}
      onClick={onClick}
      disabled={locked || done}
      style={{
        background: done ? "rgba(95,179,122,0.16)" : selected ? (flash ? "rgba(216,67,75,0.2)" : "rgba(242,201,76,0.16)") : "var(--panel)",
        border: `1px solid ${done ? "var(--ok)" : selected ? (flash ? "var(--bad)" : "var(--sub-yellow)") : "var(--line)"}`,
        color: done ? "#9fe0b4" : "var(--paper)",
        borderRadius: 12,
        padding: "14px 14px",
        fontSize: 15,
        textAlign: "left",
        cursor: done ? "default" : "pointer",
        minHeight: 56,
      }}
    >
      {text}
    </button>
  );

  return (
    <div>
      <div style={{ color: "var(--smoke)", fontSize: 13, marginBottom: 10 }}>짝을 맞추세요</div>
      <div className="st-serif" style={{ fontSize: 26, fontWeight: 700 }}>{item.prompt_ko || "표현과 뜻을 연결하세요"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 24 }}>
        <div style={{ display: "grid", gap: 10 }}>
          {left.map((ko) => cell(ko, selKo === ko, matched.has(ko), () => pickKo(ko)))}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {right.map((en) => {
            const pairKo = pairs.find((p) => p.en === en)?.ko ?? "";
            return cell(en, selEn === en, matched.has(pairKo), () => pickEn(en));
          })}
        </div>
      </div>
    </div>
  );
}
