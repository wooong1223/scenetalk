export type TemplateId = "cafe" | "generic_room";
export type TimeOfDay = "day" | "sunset" | "night";
export type Weather = "clear" | "rain";
export type LightingPreset = "warm_cafe" | "cool_evening" | "dramatic_neon";
export type EmotionId = "neutral" | "happy" | "sad" | "angry" | "surprised";
export type GestureId = "nod" | "wave" | "look_away" | "smile" | "shrug";
export type BeatPhase = "opening" | "rising_tension" | "twist" | "resolution";
export type ThinkingLevelId = "minimal" | "low" | "medium" | "high";
export type PropKind =
  | "counter"
  | "table"
  | "chair"
  | "coffee_cup"
  | "menu_board"
  | "window"
  | "rain_window"
  | "door"
  | "phone";

export interface ArgonCallTrace {
  stage:
    | "scene_planner"
    | "subtitle_explainer"
    | "story_director"
    | "hint_coach"
    | "learning_verifier"
    | "youtube_extractor";
  model: string;
  thinking_level: ThinkingLevelId;
  interaction_id: string;
  previous_interaction_id?: string | null;
  latency_ms: number;
  repair_attempts: number;
  fallback_used: boolean;
  modalities: string[];
  summary_ko: string;
}

export interface SubtitleLine {
  index: number;
  start_sec: number;
  end_sec: number;
  text_ko: string;
  text_en: string;
  tokens: string[];
}

export interface SubtitleTrack {
  video_id: string;
  title: string;
  lines: SubtitleLine[];
}

export interface ExplainRequest {
  video_id: string;
  timestamp_sec: number;
  line_ko: string;
  target_expression: string;
}

export interface ExpressionNuance {
  expression: string;
  meaning_ko: string;
  meaning_en: string;
  nuance_note: string;
  formality: "casual" | "polite" | "formal";
  examples_ko: string[];
  practice_tip_ko: string;
}

export interface PropSpec {
  id: string;
  kind: PropKind;
  label_ko: string;
  position: [number, number, number];
  rotation_y: number;
  interactable: boolean;
  clue_text_ko: string;
}

export interface LightingSpec {
  preset: LightingPreset;
  ambient_intensity: number;
  key_color_hex: string;
}

export interface WorldSpec {
  template_id: TemplateId;
  setting_title_ko: string;
  setting_summary_ko: string;
  time_of_day: TimeOfDay;
  weather: Weather;
  lighting: LightingSpec;
  props: PropSpec[];
  background_mood_tags: string[];
}

export interface CharacterSpec {
  id: string;
  display_name_ko: string;
  role_in_scene_ko: string;
  persona_summary_ko: string;
  speaking_style_ko: string;
  relationship_to_user_ko: string;
  initial_emotion: EmotionId;
  secret_or_tension_ko: string;
  opening_line_ko: string;
  voice_name: string;
}

export interface StoryEvent {
  id: string;
  kind:
    | "sudden_rain"
    | "phone_rings"
    | "misunderstanding"
    | "confession_moment"
    | "stranger_enters";
  title_ko: string;
  description_ko: string;
  world_patch_weather?: Weather | null;
  world_patch_lighting_preset?: LightingPreset | null;
  director_instruction_ko: string;
}

export interface StoryState {
  phase: BeatPhase;
  turn_count: number;
  user_Goal_ko: string;
  saved_expressions: string[];
  used_expressions: string[];
  active_gaze_prop_id?: string | null;
  selected_prop_id?: string | null;
  triggered_events: StoryEvent[];
  candidate_events: StoryEvent[];
}

export interface HintItem {
  line_ko: string;
  translation_en: string;
  target_expression: string;
  nuance_tip_ko: string;
}

export interface HintResponse {
  hints: HintItem[];
  argon_coach_note_ko: string;
}

export interface TranscriptTurn {
  speaker: "user" | "character" | "system";
  text_ko: string;
  timestamp_iso: string;
  emotion?: EmotionId | null;
}

export interface CorrectionItem {
  user_utterance_ko: string;
  issue_ko: string;
  natural_rewrite_ko: string;
  reason_en: string;
}

export interface ExpressionUsageResult {
  expression: string;
  used: boolean;
  evidence_utterance_ko: string;
  feedback_ko: string;
}

export interface LearningReport {
  session_id: string;
  fluency_score: number;
  summary_ko: string;
  summary_en: string;
  expression_results: ExpressionUsageResult[];
  corrections: CorrectionItem[];
  next_mission_ko: string;
  story_comparison_ko: string;
}

export interface SceneMedia {
  status: "pending" | "partial" | "ready" | "failed";
  panorama_url: string | null;
  character_urls: Partial<Record<EmotionId, string>>;
  model: string;
  updated_at: string;
}

export interface SessionRecord {
  session_id: string;
  created_at: string;
  video_id: string;
  timestamp_sec: number;
  world: WorldSpec;
  character: CharacterSpec;
  story: StoryState;
  transcript: TranscriptTurn[];
  report?: LearningReport | null;
  last_interaction_id?: string | null;
  last_director_note_ko: string;
  argon_traces: ArgonCallTrace[];
  media?: SceneMedia | null;
}

export interface LessonVocab {
  expression: string;
  meaning_ko: string;
  meaning_en: string;
  nuance_ko: string;
  example_ko: string;
  example_en: string;
  formality: "casual" | "polite" | "formal";
  source_line_ko: string;
}

export interface MatchPair {
  ko: string;
  en: string;
}

export interface QuizItem {
  kind: "meaning_choice" | "fill_blank" | "match";
  expression: string;
  prompt_ko: string;
  prompt_en: string;
  choices: string[];
  answer_index: number;
  pairs: MatchPair[];
  explanation_ko: string;
}

export interface Lesson {
  video_id: string;
  title_ko: string;
  title_en: string;
  vocab: LessonVocab[];
  quiz: QuizItem[];
  argon_trace?: ArgonCallTrace | null;
}

export function parseYoutubeId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "").split("/")[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    const v = url.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    const m = url.pathname.match(/\/(shorts|embed|live)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[2];
  } catch {
    return null;
  }
  return null;
}

const SAVED_PREFIX = "scenetalk.saved.";

export function loadSavedExpressions(videoId: string): string[] {
  try {
    const raw = localStorage.getItem(SAVED_PREFIX + videoId);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function storeSavedExpressions(videoId: string, exprs: string[]): void {
  try {
    localStorage.setItem(SAVED_PREFIX + videoId, JSON.stringify(exprs));
  } catch {
    // ignore
  }
}

export type WsServerMessage =
  | { type: "ready"; session_id: string }
  | { type: "audio_chunk"; pcm24_b64: string }
  | {
      type: "transcript";
      speaker: "user" | "character" | "system";
      text_ko: string;
      final: boolean;
    }
  | {
      type: "character_state";
      emotion: EmotionId;
      gesture?: GestureId | null;
    }
  | {
      type: "story_update";
      phase: BeatPhase;
      used_expressions: string[];
      event?: StoryEvent | null;
      weather?: Weather | null;
      lighting_preset?: LightingPreset | null;
      director_note_ko: string;
      argon_trace?: ArgonCallTrace | null;
    }
  | { type: "error"; code: string; message: string; recoverable: boolean };

const API_BASE = import.meta.env.VITE_API_BASE || "";

export async function getHealth(): Promise<{
  ok: boolean;
  demo_video_id: string;
  planner_model: string;
  live_model: string;
}> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function getSubtitles(
  videoId: string,
  extract = true
): Promise<SubtitleTrack> {
  const q = extract ? "?extract=true" : "";
  const res = await fetch(`${API_BASE}/api/subtitles/${encodeURIComponent(videoId)}${q}`);
  if (!res.ok) throw new Error(`Failed to fetch subtitles: ${res.status}`);
  return res.json();
}

export async function getLesson(videoId: string): Promise<Lesson> {
  const res = await fetch(`${API_BASE}/api/lessons/${encodeURIComponent(videoId)}`);
  if (!res.ok) throw new Error(`Failed to build lesson: ${res.status}`);
  return res.json();
}

export async function explainSubtitle(payload: ExplainRequest): Promise<ExpressionNuance> {
  const res = await fetch(`${API_BASE}/api/subtitles/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to explain expression: ${res.status}`);
  return res.json();
}

export async function createSession(payload: {
  video_id: string;
  timestamp_sec: number;
  saved_expressions: string[];
  scene_screenshot_b64?: string | null;
}): Promise<SessionRecord> {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  return res.json();
}

export async function getSession(sessionId: string): Promise<SessionRecord> {
  const res = await fetch(`${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`Session not found: ${res.status}`);
  return res.json();
}

export async function getHint(sessionId: string): Promise<HintResponse> {
  const res = await fetch(`${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}/hint`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to get Argon hint: ${res.status}`);
  return res.json();
}

export async function completeSession(sessionId: string): Promise<LearningReport> {
  const res = await fetch(`${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}/complete`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to complete session: ${res.status}`);
  return res.json();
}

export function getWsUrl(sessionId: string): string {
  if (API_BASE) {
    const wsBase = API_BASE.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
    return `${wsBase}/ws/sessions/${encodeURIComponent(sessionId)}`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/sessions/${encodeURIComponent(sessionId)}`;
}
