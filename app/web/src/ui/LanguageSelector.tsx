import { useEffect, useState } from "react";

export type UiLanguage = "en";

const LANGS: { code: string; label: string; supported: boolean }[] = [
  { code: "en", label: "English", supported: true },
  { code: "fr", label: "Français", supported: false },
  { code: "es", label: "Español", supported: false },
];

const KEY = "scenetalk.lang";

export function loadUiLanguage(): UiLanguage {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "en") return v;
  } catch {
    // ignore
  }
  return "en";
}

export function LanguageSelector({ dark, compact }: { dark?: boolean; compact?: boolean }) {
  const [lang, setLang] = useState<UiLanguage>(() => loadUiLanguage());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const pick = (code: string, supported: boolean) => {
    if (!supported) {
      setToast("Coming soon — English only for now.");
      return;
    }
    setLang("en");
  };

  return (
    <>
      <div className={`st-lang${dark ? " st-lang--dark" : ""}`} role="group" aria-label="Interface language">
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            aria-pressed={lang === l.code}
            onClick={() => pick(l.code, l.supported)}
            title={l.supported ? l.label : `${l.label} — coming soon`}
            style={compact ? { padding: "5px 10px", fontSize: 12 } : undefined}
          >
            {compact ? l.code.toUpperCase() : l.label}
          </button>
        ))}
      </div>
      {toast && (
        <div className="st-toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
