import { useCallback, useEffect, useRef } from "react";
import { getWsUrl, WsServerMessage } from "../api/client";
import { useSceneStore } from "../state/sceneStore";

function base64ToInt16Array(b64: string): Int16Array {
  const binary = window.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

function int16ArrayToBase64(pcm16: Int16Array): string {
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return window.btoa(binary);
}

export function useLiveVoice(sessionId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const playCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const mouthDecayTimerRef = useRef<number | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micProcRef = useRef<ScriptProcessorNode | null>(null);

  const {
    setWsConnected,
    setIsRecording,
    setMouthOpen,
    setCharacterState,
    applyStoryUpdate,
    upsertTranscript,
  } = useSceneStore();

  const enqueueAudioChunk = useCallback(
    (pcm24B64: string) => {
      try {
        if (!playCtxRef.current) {
          playCtxRef.current = new AudioContext({ sampleRate: 24000 });
        }
        const ctx = playCtxRef.current;
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        const int16 = base64ToInt16Array(pcm24B64);
        if (int16.length === 0) return;

        const float32 = new Float32Array(int16.length);
        let sumSq = 0;
        for (let i = 0; i < int16.length; i++) {
          const sample = int16[i] / 32768.0;
          float32[i] = sample;
          sumSq += sample * sample;
        }
        const rms = Math.sqrt(sumSq / float32.length);
        const mouthTarget = Math.min(1.0, rms * 5.2);
        setMouthOpen(mouthTarget);

        const audioBuf = ctx.createBuffer(1, float32.length, 24000);
        audioBuf.getChannelData(0).set(float32);

        const source = ctx.createBufferSource();
        source.buffer = audioBuf;
        source.connect(ctx.destination);

        const now = ctx.currentTime;
        const startAt = Math.max(now, nextPlayTimeRef.current);
        source.start(startAt);
        nextPlayTimeRef.current = startAt + audioBuf.duration;

        if (mouthDecayTimerRef.current) {
          window.clearTimeout(mouthDecayTimerRef.current);
        }
        const remainingMs = Math.max(120, (nextPlayTimeRef.current - now) * 1000);
        mouthDecayTimerRef.current = window.setTimeout(() => {
          setMouthOpen(0);
        }, remainingMs);
      } catch (err) {
        console.warn("Audio playback error:", err);
      }
    },
    [setMouthOpen]
  );

  useEffect(() => {
    if (!sessionId) return;

    const wsUrl = getWsUrl(sessionId);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as WsServerMessage;
        switch (msg.type) {
          case "ready":
            setWsConnected(true);
            break;
          case "audio_chunk":
            enqueueAudioChunk(msg.pcm24_b64);
            break;
          case "transcript":
            upsertTranscript(msg.speaker, msg.text_ko, msg.final);
            if (msg.speaker === "character") {
              setMouthOpen(0.45);
              setTimeout(() => setMouthOpen(0), 260);
            }
            break;
          case "character_state":
            setCharacterState(msg.emotion, msg.gesture);
            break;
          case "story_update":
            applyStoryUpdate(msg);
            break;
          case "error":
            console.warn("WS server error:", msg.code, msg.message);
            break;
        }
      } catch (err) {
        console.warn("Failed to parse WS message:", err);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [
    sessionId,
    enqueueAudioChunk,
    setWsConnected,
    upsertTranscript,
    setCharacterState,
    applyStoryUpdate,
    setMouthOpen,
  ]);

  const sendJson = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  const startTalking = useCallback(async () => {
    try {
      if (playCtxRef.current && playCtxRef.current.state === "suspended") {
        await playCtxRef.current.resume();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      micStreamRef.current = stream;

      const micCtx = new AudioContext({ sampleRate: 16000 });
      micCtxRef.current = micCtx;
      const source = micCtx.createMediaStreamSource(stream);
      const proc = micCtx.createScriptProcessor(4096, 1, 1);
      micProcRef.current = proc;

      proc.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        sendJson({
          type: "audio_chunk",
          pcm16_b64: int16ArrayToBase64(pcm16),
        });
      };

      source.connect(proc);
      proc.connect(micCtx.destination);
      setIsRecording(true);
    } catch (err) {
      console.warn("Microphone access failed:", err);
      setIsRecording(false);
    }
  }, [sendJson, setIsRecording]);

  const stopTalking = useCallback(() => {
    if (micProcRef.current) {
      micProcRef.current.disconnect();
      micProcRef.current = null;
    }
    if (micCtxRef.current) {
      micCtxRef.current.close().catch(() => {});
      micCtxRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setIsRecording(false);
    sendJson({ type: "user_speech_end" });
  }, [sendJson, setIsRecording]);

  const sendUserText = useCallback(
    (textKo: string) => {
      const cleaned = textKo.trim();
      if (!cleaned) return;
      if (playCtxRef.current && playCtxRef.current.state === "suspended") {
        playCtxRef.current.resume().catch(() => {});
      }
      sendJson({ type: "user_text", text_ko: cleaned });
    },
    [sendJson]
  );

  const sendGaze = useCallback(
    (propId: string | null) => {
      sendJson({ type: "gaze_changed", prop_id: propId });
    },
    [sendJson]
  );

  const sendObjectSelected = useCallback(
    (propId: string) => {
      sendJson({ type: "object_selected", prop_id: propId });
    },
    [sendJson]
  );

  const sendTriggerEvent = useCallback(
    (eventId: string | null = null) => {
      sendJson({ type: "trigger_event", event_id: eventId });
    },
    [sendJson]
  );

  return {
    startTalking,
    stopTalking,
    sendUserText,
    sendGaze,
    sendObjectSelected,
    sendTriggerEvent,
  };
}
