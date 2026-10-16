import { create } from "zustand";
import {
  ArgonCallTrace,
  BeatPhase,
  CharacterSpec,
  EmotionId,
  GestureId,
  HintItem,
  LearningReport,
  LightingPreset,
  PropSpec,
  SceneMedia,
  SessionRecord,
  StoryEvent,
  StoryState,
  Weather,
  WorldSpec,
} from "../api/client";

export interface LiveTranscriptBubble {
  id: string;
  speaker: "user" | "character" | "system";
  text_ko: string;
  final: boolean;
  timestamp: number;
}

interface SceneStoreState {
  session: SessionRecord | null;
  world: WorldSpec | null;
  character: CharacterSpec | null;
  story: StoryState | null;
  argonTraces: ArgonCallTrace[];
  report: LearningReport | null;
  media: SceneMedia | null;

  // Live Character & Audio state
  emotion: EmotionId;
  gesture: GestureId | null;
  mouthOpen: number;
  wsConnected: boolean;
  isRecording: boolean;

  // Live Conversation
  transcripts: LiveTranscriptBubble[];
  directorNoteKo: string;
  latestEvent: StoryEvent | null;

  // Argon Hint Coach (thinking_level=minimal)
  hints: HintItem[];
  coachTipKo: string | null;
  loadingHints: boolean;

  // Gaze & Prop Inspection
  hoveredProp: PropSpec | null;
  inspectedProp: PropSpec | null;

  // Actions
  setSession: (sess: SessionRecord) => void;
  setMedia: (media: SceneMedia | null) => void;
  applyStoryUpdate: (payload: {
    phase: BeatPhase;
    used_expressions: string[];
    event?: StoryEvent | null;
    weather?: Weather | null;
    lighting_preset?: LightingPreset | null;
    director_note_ko: string;
    argon_trace?: ArgonCallTrace | null;
  }) => void;
  setCharacterState: (emotion: EmotionId, gesture?: GestureId | null) => void;
  setMouthOpen: (val: number) => void;
  setWsConnected: (connected: boolean) => void;
  setIsRecording: (rec: boolean) => void;
  upsertTranscript: (
    speaker: "user" | "character" | "system",
    textKo: string,
    final: boolean
  ) => void;
  setHints: (hints: HintItem[], coachTipKo: string) => void;
  setLoadingHints: (loading: boolean) => void;
  setHoveredProp: (prop: PropSpec | null) => void;
  setInspectedProp: (prop: PropSpec | null) => void;
  setReport: (report: LearningReport) => void;
}

export const useSceneStore = create<SceneStoreState>((set) => ({
  session: null,
  world: null,
  character: null,
  story: null,
  argonTraces: [],
  report: null,
  media: null,

  emotion: "neutral",
  gesture: null,
  mouthOpen: 0,
  wsConnected: false,
  isRecording: false,

  transcripts: [],
  directorNoteKo: "",
  latestEvent: null,

  hints: [],
  coachTipKo: null,
  loadingHints: false,

  hoveredProp: null,
  inspectedProp: null,

  setSession: (sess) =>
    set({
      session: sess,
      world: sess.world,
      character: sess.character,
      story: sess.story,
      argonTraces: sess.argon_traces || [],
      report: sess.report || null,
      media: sess.media || null,
      emotion: sess.character.initial_emotion || "neutral",
      gesture: null,
      directorNoteKo: sess.last_director_note_ko || "",
      transcripts: (sess.transcript || []).map((t, idx) => ({
        id: `init-${idx}`,
        speaker: t.speaker,
        text_ko: t.text_ko,
        final: true,
        timestamp: Date.now() - (sess.transcript.length - idx) * 1000,
      })),
    }),

  setMedia: (media) => set({ media }),

  applyStoryUpdate: (payload) =>
    set((state) => {
      const nextStory: StoryState | null = state.story
        ? {
            ...state.story,
            phase: payload.phase,
            used_expressions: payload.used_expressions,
            triggered_events: payload.event
              ? [...state.story.triggered_events, payload.event]
              : state.story.triggered_events,
          }
        : null;

      const nextWorld: WorldSpec | null = state.world
        ? {
            ...state.world,
            weather: payload.weather ?? state.world.weather,
            lighting: payload.lighting_preset
              ? {
                  ...state.world.lighting,
                  preset: payload.lighting_preset,
                }
              : state.world.lighting,
          }
        : null;

      return {
        story: nextStory,
        world: nextWorld,
        latestEvent: payload.event ?? state.latestEvent,
        directorNoteKo: payload.director_note_ko || state.directorNoteKo,
        argonTraces: payload.argon_trace
          ? [...state.argonTraces, payload.argon_trace]
          : state.argonTraces,
      };
    }),

  setCharacterState: (emotion, gesture) =>
    set({
      emotion,
      gesture: gesture ?? null,
    }),

  setMouthOpen: (val) => set({ mouthOpen: val }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
  setIsRecording: (rec) => set({ isRecording: rec }),

  upsertTranscript: (speaker, textKo, final) =>
    set((state) => {
      const cleaned = textKo.trim();
      if (!cleaned) return state;
      const list = [...state.transcripts];
      const last = list[list.length - 1];
      if (last && last.speaker === speaker && !last.final) {
        list[list.length - 1] = {
          ...last,
          text_ko: final ? cleaned : `${last.text_ko} ${cleaned}`,
          final,
        };
      } else {
        list.push({
          id: `${speaker}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          speaker,
          text_ko: cleaned,
          final,
          timestamp: Date.now(),
        });
      }
      return { transcripts: list.slice(-30) };
    }),

  setHints: (hints, coachTipKo) =>
    set({
      hints,
      coachTipKo,
      loadingHints: false,
    }),

  setLoadingHints: (loading) => set({ loadingHints: loading }),
  setHoveredProp: (prop) => set({ hoveredProp: prop }),
  setInspectedProp: (prop) => set({ inspectedProp: prop }),
  setReport: (report) => set({ report }),
}));
