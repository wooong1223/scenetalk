import { useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { PropSpec } from "../api/client";
import { useSceneStore } from "../state/sceneStore";

interface TemplateProps {
  props: PropSpec[];
  onPointerOver: (p: PropSpec) => void;
  onPointerOut: (p: PropSpec) => void;
  onClick: (p: PropSpec) => void;
}

export function InteractivePropMesh({
  prop,
  isHovered,
  onPointerOver,
  onPointerOut,
  onClick,
}: {
  prop: PropSpec;
  isHovered: boolean;
  onPointerOver: (p: PropSpec) => void;
  onPointerOut: (p: PropSpec) => void;
  onClick: (p: PropSpec) => void;
}) {
  const emissive = isHovered ? "#fbbf24" : "#000000";
  const emissiveIntensity = isHovered ? 0.55 : 0.0;

  return (
    <group
      position={prop.position}
      rotation={[0, prop.rotation_y || 0, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver(prop);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut(prop);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(prop);
      }}
    >
      {prop.kind === "coffee_cup" && (
        <group>
          {/* Saucer */}
          <mesh position={[0, 0.01, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.09, 0.02, 24]} />
            <meshStandardMaterial
              color="#f8fafc"
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
          {/* Cup */}
          <mesh position={[0, 0.07, 0]} castShadow>
            <cylinderGeometry args={[0.068, 0.055, 0.11, 24]} />
            <meshStandardMaterial
              color="#fef3c7"
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
          {/* Coffee Liquid */}
          <mesh position={[0, 0.121, 0]}>
            <cylinderGeometry args={[0.062, 0.062, 0.008, 20]} />
            <meshStandardMaterial color="#3f2305" roughness={0.2} />
          </mesh>
        </group>
      )}

      {prop.kind === "phone" && (
        <group>
          <mesh position={[0, 0.03, 0]} castShadow>
            <boxGeometry args={[0.18, 0.06, 0.14]} />
            <meshStandardMaterial
              color="#1e293b"
              metalness={0.5}
              roughness={0.3}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
          <mesh position={[0, 0.075, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.022, 0.022, 0.2, 16]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.2} />
          </mesh>
        </group>
      )}

      {prop.kind === "menu_board" && (
        <group>
          <mesh castShadow>
            <boxGeometry args={[0.95, 0.65, 0.05]} />
            <meshStandardMaterial
              color="#78350f"
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
          <mesh position={[0, 0, 0.028]}>
            <planeGeometry args={[0.85, 0.55]} />
            <meshStandardMaterial color="#0f172a" roughness={0.85} />
          </mesh>
        </group>
      )}

      {(prop.kind === "window" || prop.kind === "rain_window") && (
        <group>
          <mesh>
            <boxGeometry args={[1.35, 1.45, 0.06]} />
            <meshStandardMaterial
              color="#475569"
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
          <mesh position={[0, 0, 0.035]}>
            <planeGeometry args={[1.22, 1.32]} />
            <meshStandardMaterial
              color="#38bdf8"
              transparent
              opacity={0.32}
              metalness={0.8}
              roughness={0.1}
            />
          </mesh>
        </group>
      )}

      {prop.kind === "door" && (
        <group>
          <mesh castShadow>
            <boxGeometry args={[0.95, 2.05, 0.08]} />
            <meshStandardMaterial
              color="#451a03"
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
          <mesh position={[0.35, 0, 0.06]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      )}

      {(prop.kind === "table" || prop.kind === "counter" || prop.kind === "chair") && (
        <group>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.58, 0.58, 0.06, 32]} />
            <meshStandardMaterial
              color="#78350f"
              roughness={0.45}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
        </group>
      )}

      {/* Interactive Floating Label */}
      <Html position={[0, 0.26, 0]} center distanceFactor={4.2}>
        <div
          onClick={() => onClick(prop)}
          style={{
            background: isHovered
              ? "rgba(251, 191, 36, 0.95)"
              : "rgba(15, 23, 42, 0.78)",
            color: isHovered ? "#0f172a" : "#e2e8f0",
            border: isHovered
              ? "1.5px solid #fef08a"
              : "1px solid rgba(148, 163, 184, 0.35)",
            borderRadius: "999px",
            padding: "3px 10px",
            fontSize: "11px",
            fontWeight: 700,
            whiteSpace: "nowrap",
            cursor: "pointer",
            boxShadow: isHovered ? "0 0 14px rgba(251,191,36,0.6)" : "none",
            transition: "all 0.15s ease",
            userSelect: "none",
          }}
        >
          🔍 {prop.label_ko}
        </div>
      </Html>
    </group>
  );
}

export function CafeTemplate({
  props,
  onPointerOver,
  onPointerOut,
  onClick,
}: TemplateProps) {
  const { hoveredProp } = useSceneStore();

  const floorGrid = useMemo(() => {
    const tex = new THREE.DataTexture(
      new Uint8Array([
        60, 42, 30, 255, 72, 50, 36, 255,
        72, 50, 36, 255, 60, 42, 30, 255,
      ]),
      2,
      2
    );
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group>
      {/* Warm Hardwood Cafe Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial map={floorGrid} roughness={0.65} />
      </mesh>

      {/* Back Wall & Side Walls */}
      <mesh position={[0, 2.0, -3.2]} receiveShadow>
        <boxGeometry args={[9, 4.2, 0.2]} />
        <meshStandardMaterial color="#1e1b2e" roughness={0.85} />
      </mesh>
      <mesh position={[-3.8, 2.0, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[8, 4.2, 0.2]} />
        <meshStandardMaterial color="#272038" roughness={0.85} />
      </mesh>
      <mesh position={[3.8, 2.0, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[8, 4.2, 0.2]} />
        <meshStandardMaterial color="#272038" roughness={0.85} />
      </mesh>

      {/* Center Conversation Cafe Table */}
      <group position={[0, 0, 0.25]}>
        <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.68, 0.68, 0.05, 36]} />
          <meshStandardMaterial color="#92400e" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.36, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.12, 0.7, 16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* Espresso Bar Counter in Background */}
      <mesh position={[-1.4, 0.55, -2.3]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.1, 0.75]} />
        <meshStandardMaterial color="#451a03" roughness={0.55} />
      </mesh>

      {/* Warm Cafe Pendant Lamps */}
      {[-1.2, 0, 1.2].map((x, idx) => (
        <group key={idx} position={[x, 2.75, -0.4]}>
          <mesh>
            <coneGeometry args={[0.22, 0.24, 20]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#f59e0b"
              emissiveIntensity={0.7}
            />
          </mesh>
        </group>
      ))}

      {/* Interactive Props from ScenePlan */}
      {props.map((prop) => (
        <InteractivePropMesh
          key={prop.id}
          prop={prop}
          isHovered={hoveredProp?.id === prop.id}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
          onClick={onClick}
        />
      ))}
    </group>
  );
}
