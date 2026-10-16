import { useCallback, useEffect, useRef } from "react";
import { PropSpec } from "../api/client";
import { useSceneStore } from "../state/sceneStore";

export function useGaze(
  sendGaze: (propId: string | null) => void,
  sendObjectSelected: (propId: string) => void
) {
  const { setHoveredProp, setInspectedProp } = useSceneStore();
  const dwellTimerRef = useRef<number | null>(null);
  const currentHoverIdRef = useRef<string | null>(null);
  const lastEmittedGazeIdRef = useRef<string | null>(null);

  const onPropPointerOver = useCallback(
    (prop: PropSpec) => {
      if (!prop.interactable) return;
      if (currentHoverIdRef.current === prop.id) return;

      currentHoverIdRef.current = prop.id;
      setHoveredProp(prop);

      if (dwellTimerRef.current) {
        window.clearTimeout(dwellTimerRef.current);
      }
      dwellTimerRef.current = window.setTimeout(() => {
        if (
          currentHoverIdRef.current === prop.id &&
          lastEmittedGazeIdRef.current !== prop.id
        ) {
          lastEmittedGazeIdRef.current = prop.id;
          sendGaze(prop.id);
        }
      }, 600);
    },
    [sendGaze, setHoveredProp]
  );

  const onPropPointerOut = useCallback(
    (prop: PropSpec) => {
      if (currentHoverIdRef.current === prop.id) {
        currentHoverIdRef.current = null;
        setHoveredProp(null);
      }
      if (dwellTimerRef.current) {
        window.clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
    },
    [setHoveredProp]
  );

  const onPropClick = useCallback(
    (prop: PropSpec) => {
      if (!prop.interactable) return;
      setInspectedProp(prop);
      sendObjectSelected(prop.id);
    },
    [sendObjectSelected, setInspectedProp]
  );

  useEffect(() => {
    return () => {
      if (dwellTimerRef.current) {
        window.clearTimeout(dwellTimerRef.current);
      }
    };
  }, []);

  return {
    onPropPointerOver,
    onPropPointerOut,
    onPropClick,
  };
}
