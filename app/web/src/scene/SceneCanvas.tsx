import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "../state/sceneStore";
import { CafeTemplate } from "./CafeTemplate";
import { GenericRoomTemplate } from "./GenericRoomTemplate";
import { VrmCharacter } from "./VrmCharacter";
import { FirstPersonLook } from "./FirstPersonLook";
import { useGaze } from "./useGaze";

function RainEffect() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 350;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 7.5;
      arr[i * 3 + 1] = Math.random() * 4.0;
      arr[i * 3 + 2] = -0.8 - Math.random() * 2.5;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      let y = posAttr.getY(i) - delta * 5.8;
      if (y < 0.05) y = 3.9;
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#7dd3fc" size={0.035} transparent opacity={0.55} />
    </points>
  );
}

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
  const { world } = useSceneStore();
  const { onPropPointerOver, onPropPointerOut, onPropClick } = useGaze(
    sendGaze,
    sendObjectSelected
  );

  const preset = world?.lighting?.preset || "warm_cafe";
  const keyColor =
    world?.lighting?.key_color_hex ||
    (preset === "dramatic_neon"
      ? "#c084fc"
      : preset === "cool_evening"
      ? "#60a5fa"
      : "#ffd9a8");
  const ambientIntensity = world?.lighting?.ambient_intensity ?? 0.75;
  const bgColor =
    preset === "dramatic_neon"
      ? "#0d061a"
      : preset === "cool_evening"
      ? "#081226"
      : "#120d16";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1 }}>
      <Canvas
        shadows
        camera={{ fov: 52, near: 0.1, far: 50, position: [0, 1.55, 2.35] }}
      >
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, 3.8, 11.5]} />

        <ambientLight intensity={ambientIntensity * 0.7} color={keyColor} />
        <directionalLight
          position={[2.5, 4.2, 2.5]}
          intensity={1.35}
          color={keyColor}
          castShadow
        />
        <pointLight
          position={[0, 2.4, -0.5]}
          intensity={preset === "dramatic_neon" ? 2.1 : 1.25}
          color={keyColor}
          distance={8}
        />

        {world?.weather === "rain" && <RainEffect />}

        {world?.template_id === "cafe" ? (
          <CafeTemplate
            props={world.props}
            onPointerOver={onPropPointerOver}
            onPointerOut={onPropPointerOut}
            onClick={onPropClick}
          />
        ) : (
          <GenericRoomTemplate
            props={world?.props || []}
            onPointerOver={onPropPointerOver}
            onPointerOut={onPropPointerOut}
            onClick={onPropClick}
          />
        )}

        <VrmCharacter />
        <FirstPersonLook pointerLockEnabled={pointerLockEnabled} />
      </Canvas>
    </div>
  );
}
