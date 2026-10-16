import { Canvas } from "@react-three/fiber";
import { useSceneStore } from "../state/sceneStore";
import { FirstPersonLook } from "./FirstPersonLook";
import { PanoramaWorld } from "./PanoramaWorld";
import { useGaze } from "./useGaze";

interface SceneCanvasProps {
  pointerLockEnabled: boolean;
  sendGaze: (propId: string | null) => void;
  sendObjectSelected: (propId: string) => void;
}

export function SceneCanvas({
  pointerLockEnabled,
  sendGaze,
  sendObjectSelected,
}: SceneCanvasProps) {
  const world = useSceneStore((s) => s.world);
  const media = useSceneStore((s) => s.media);
  const emotion = useSceneStore((s) => s.emotion);
  const gesture = useSceneStore((s) => s.gesture);
  const hoveredProp = useSceneStore((s) => s.hoveredProp);
  const inspectedProp = useSceneStore((s) => s.inspectedProp);
  const { onPropPointerOver, onPropPointerOut, onPropClick } = useGaze(
    sendGaze,
    sendObjectSelected
  );

  const isRain = world?.weather === "rain";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1, background: "#0c0a09" }}>
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
        camera={{ fov: 58, near: 0.05, far: 120, position: [0, 1.55, 2.35] }}
      >
        <color attach="background" args={["#0c0a09"]} />
        <PanoramaWorld
          media={media}
          props={world?.props || []}
          emotion={emotion}
          gesture={gesture}
          hoveredId={hoveredProp?.id ?? null}
          selectedId={inspectedProp?.id ?? null}
          onPropOver={onPropPointerOver}
          onPropOut={onPropPointerOut}
          onPropClick={onPropClick}
        />
        <FirstPersonLook pointerLockEnabled={pointerLockEnabled} />
      </Canvas>
      {isRain && (
        <>
          <div className="st-rain-dim" />
          <div className="st-rain" />
        </>
      )}
      {/* cinematic vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
