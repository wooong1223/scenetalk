import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm";
import { EmotionId, GestureId } from "../api/client";
import { useSceneStore } from "../state/sceneStore";

const EMOTION_COLOR: Record<EmotionId, string> = {
  neutral: "#60a5fa",
  happy: "#34d399",
  sad: "#818cf8",
  angry: "#f87171",
  surprised: "#fbbf24",
};

const EMOTION_LABEL_KO: Record<EmotionId, string> = {
  neutral: "평온 / 탐색",
  happy: "반가움 / 미소",
  sad: "서운함 / 애틋함",
  angry: "긴장 / 단호함",
  surprised: "놀람 / 당황",
};

export function VrmCharacter() {
  const { character, world, emotion, gesture, mouthOpen } = useSceneStore();
  const [vrm, setVrm] = useState<VRM | null>(null);

  const rootRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const mouthMeshRef = useRef<THREE.Mesh>(null);
  const leftBrowRef = useRef<THREE.Mesh>(null);
  const rightBrowRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);

  const gestureTimerRef = useRef<number>(0);
  const activeGestureRef = useRef<GestureId | null>(null);

  useEffect(() => {
    if (gesture) {
      activeGestureRef.current = gesture;
      gestureTimerRef.current = 2.4;
    }
  }, [gesture]);

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      "/assets/vrm/sample_a.vrm",
      (gltf) => {
        if (cancelled) return;
        const loadedVrm = gltf.userData.vrm as VRM | undefined;
        if (loadedVrm && loadedVrm.humanoid) {
          loadedVrm.scene.rotation.y = Math.PI;
          setVrm(loadedVrm);
        }
      },
      undefined,
      () => {
        // Stylized 3D character rig is used automatically when VRM binary is not full humanoid
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const isHistoricalOrRoom = world?.template_id === "generic_room";
  const coatColor = isHistoricalOrRoom ? "#1e293b" : "#4f46e5";
  const innerShirtColor = isHistoricalOrRoom ? "#f8fafc" : "#fef3c7";
  const hairColor = isHistoricalOrRoom ? "#0f172a" : "#1e1b4b";
  const auraColor = EMOTION_COLOR[emotion] || "#60a5fa";

  const auraMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: auraColor,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      }),
    [auraColor]
  );

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    if (gestureTimerRef.current > 0) {
      gestureTimerRef.current = Math.max(0, gestureTimerRef.current - delta);
      if (gestureTimerRef.current === 0) {
        activeGestureRef.current = null;
      }
    }
    const g = activeGestureRef.current;

    // 1. Update loaded VRM if present
    if (vrm) {
      vrm.update(delta);
      const em = vrm.expressionManager;
      if (em) {
        (["neutral", "happy", "sad", "angry", "surprised"] as EmotionId[]).forEach(
          (id) => {
            em.setValue(id, id === emotion ? 0.85 : 0.0);
          }
        );
        em.setValue("aa", THREE.MathUtils.clamp(mouthOpen, 0, 1));
      }
      const headNode = vrm.humanoid?.getNormalizedBoneNode("head");
      if (headNode) {
        if (g === "nod") {
          headNode.rotation.x = Math.sin(t * 9) * 0.25;
        } else if (g === "look_away") {
          headNode.rotation.y = THREE.MathUtils.lerp(headNode.rotation.y, 0.45, 0.1);
        } else {
          headNode.rotation.x = Math.sin(t * 1.5) * 0.04;
          headNode.rotation.y = Math.cos(t * 1.1) * 0.06;
        }
      }
      return;
    }

    // 2. Animate stylized 3D K-drama character rig
    if (rootRef.current) {
      rootRef.current.position.y = Math.sin(t * 2.1) * 0.018;
    }

    if (headGroupRef.current) {
      let targetPitch = Math.sin(t * 1.6) * 0.035;
      let targetYaw = Math.sin(t * 0.9) * 0.06;
      let targetRoll = 0;

      if (g === "nod") {
        targetPitch = Math.sin(t * 10.0) * 0.22;
      } else if (g === "look_away") {
        targetYaw = 0.42;
        targetPitch = 0.08;
      } else if (g === "smile" || emotion === "happy") {
        targetRoll = Math.sin(t * 3.0) * 0.08;
      }

      headGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.x,
        targetPitch,
        0.16
      );
      headGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.y,
        targetYaw,
        0.14
      );
      headGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.z,
        targetRoll,
        0.14
      );
    }

    if (rightArmRef.current && leftArmRef.current) {
      if (g === "wave") {
        rightArmRef.current.rotation.z = -2.2 + Math.sin(t * 11.0) * 0.35;
        rightArmRef.current.rotation.x = -0.3;
      } else if (g === "shrug") {
        rightArmRef.current.rotation.z = -0.65;
        leftArmRef.current.rotation.z = 0.65;
      } else {
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(
          rightArmRef.current.rotation.z,
          -0.18 - mouthOpen * 0.12,
          0.12
        );
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
          rightArmRef.current.rotation.x,
          mouthOpen > 0.1 ? -0.25 : 0,
          0.12
        );
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(
          leftArmRef.current.rotation.z,
          0.18,
          0.12
        );
      }
    }

    // Mouth lip-sync animation
    if (mouthMeshRef.current) {
      const openScaleY = 0.35 + mouthOpen * 2.4 + (emotion === "surprised" ? 0.8 : 0);
      const openScaleX = emotion === "happy" ? 1.35 : emotion === "sad" ? 0.85 : 1.0;
      mouthMeshRef.current.scale.set(openScaleX, openScaleY, 1);
    }

    // Eyebrow emotion expression
    if (leftBrowRef.current && rightBrowRef.current) {
      let browTilt = 0;
      let browY = 0.085;
      if (emotion === "angry") {
        browTilt = -0.28;
        browY = 0.072;
      } else if (emotion === "sad") {
        browTilt = 0.24;
        browY = 0.082;
      } else if (emotion === "surprised" || emotion === "happy") {
        browTilt = 0.06;
        browY = 0.102;
      }
      leftBrowRef.current.rotation.z = browTilt;
      rightBrowRef.current.rotation.z = -browTilt;
      leftBrowRef.current.position.y = browY;
      rightBrowRef.current.position.y = browY;
    }

    // Periodic natural eye blink
    if (leftEyeRef.current && rightEyeRef.current) {
      const blinkCycle = t % 4.2;
      const isBlinking = blinkCycle > 4.05;
      const eyeScaleY = isBlinking ? 0.1 : emotion === "surprised" ? 1.25 : 1.0;
      leftEyeRef.current.scale.y = eyeScaleY;
      rightEyeRef.current.scale.y = eyeScaleY;
    }
  });

  return (
    <group position={[0, 0, -1.05]}>
      {/* Emotion Aura Ground Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={auraMaterial}>
        <ringGeometry args={[0.42, 0.54, 48]} />
      </mesh>

      {vrm ? (
        <primitive object={vrm.scene} />
      ) : (
        <group ref={rootRef}>
          {/* Legs */}
          <mesh position={[-0.11, 0.38, 0]} castShadow>
            <capsuleGeometry args={[0.065, 0.55, 8, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} />
          </mesh>
          <mesh position={[0.11, 0.38, 0]} castShadow>
            <capsuleGeometry args={[0.065, 0.55, 8, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} />
          </mesh>

          {/* Torso / Tailored Coat */}
          <mesh position={[0, 0.96, 0]} castShadow>
            <capsuleGeometry args={[0.19, 0.44, 12, 24]} />
            <meshStandardMaterial color={coatColor} roughness={0.5} />
          </mesh>

          {/* Inner Shirt / Lapel Accent */}
          <mesh position={[0, 1.08, 0.155]} castShadow>
            <boxGeometry args={[0.14, 0.28, 0.06]} />
            <meshStandardMaterial color={innerShirtColor} roughness={0.4} />
          </mesh>

          {/* Left Arm */}
          <group ref={leftArmRef} position={[-0.24, 1.15, 0]}>
            <mesh position={[-0.04, -0.22, 0]} castShadow>
              <capsuleGeometry args={[0.052, 0.36, 8, 16]} />
              <meshStandardMaterial color={coatColor} roughness={0.5} />
            </mesh>
            <mesh position={[-0.04, -0.45, 0]}>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshStandardMaterial color="#fde68a" roughness={0.4} />
            </mesh>
          </group>

          {/* Right Arm */}
          <group ref={rightArmRef} position={[0.24, 1.15, 0]}>
            <mesh position={[0.04, -0.22, 0]} castShadow>
              <capsuleGeometry args={[0.052, 0.36, 8, 16]} />
              <meshStandardMaterial color={coatColor} roughness={0.5} />
            </mesh>
            <mesh position={[0.04, -0.45, 0]}>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshStandardMaterial color="#fde68a" roughness={0.4} />
            </mesh>
          </group>

          {/* Neck */}
          <mesh position={[0, 1.29, 0]}>
            <cylinderGeometry args={[0.055, 0.065, 0.12, 16]} />
            <meshStandardMaterial color="#fde68a" roughness={0.4} />
          </mesh>

          {/* Expressive Head & Face Rig */}
          <group ref={headGroupRef} position={[0, 1.48, 0]}>
            {/* Head Sphere */}
            <mesh castShadow>
              <sphereGeometry args={[0.19, 32, 32]} />
              <meshStandardMaterial color="#ffedd5" roughness={0.35} />
            </mesh>

            {/* Stylized Hair Cap & Side Bangs */}
            <mesh position={[0, 0.05, -0.02]} castShadow>
              <sphereGeometry args={[0.202, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
              <meshStandardMaterial color={hairColor} roughness={0.6} />
            </mesh>
            <mesh position={[-0.14, 0.02, 0.08]} rotation={[0, 0, 0.25]}>
              <capsuleGeometry args={[0.045, 0.16, 8, 12]} />
              <meshStandardMaterial color={hairColor} roughness={0.6} />
            </mesh>
            <mesh position={[0.14, 0.02, 0.08]} rotation={[0, 0, -0.25]}>
              <capsuleGeometry args={[0.045, 0.16, 8, 12]} />
              <meshStandardMaterial color={hairColor} roughness={0.6} />
            </mesh>

            {/* Eyebrows */}
            <mesh ref={leftBrowRef} position={[-0.068, 0.085, 0.175]}>
              <boxGeometry args={[0.055, 0.012, 0.015]} />
              <meshStandardMaterial color={hairColor} />
            </mesh>
            <mesh ref={rightBrowRef} position={[0.068, 0.085, 0.175]}>
              <boxGeometry args={[0.055, 0.012, 0.015]} />
              <meshStandardMaterial color={hairColor} />
            </mesh>

            {/* Eyes */}
            <mesh ref={leftEyeRef} position={[-0.065, 0.03, 0.176]}>
              <sphereGeometry args={[0.024, 16, 16]} />
              <meshStandardMaterial color="#0f172a" roughness={0.1} />
            </mesh>
            <mesh ref={rightEyeRef} position={[0.065, 0.03, 0.176]}>
              <sphereGeometry args={[0.024, 16, 16]} />
              <meshStandardMaterial color="#0f172a" roughness={0.1} />
            </mesh>

            {/* Eye Catchlights */}
            <mesh position={[-0.058, 0.038, 0.197]}>
              <sphereGeometry args={[0.006, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.072, 0.038, 0.197]}>
              <sphereGeometry args={[0.006, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>

            {/* Cheek Blush */}
            <mesh position={[-0.105, -0.02, 0.162]}>
              <sphereGeometry args={[0.024, 12, 12]} />
              <meshBasicMaterial
                color="#fda4af"
                transparent
                opacity={emotion === "happy" ? 0.65 : 0.28}
              />
            </mesh>
            <mesh position={[0.105, -0.02, 0.162]}>
              <sphereGeometry args={[0.024, 12, 12]} />
              <meshBasicMaterial
                color="#fda4af"
                transparent
                opacity={emotion === "happy" ? 0.65 : 0.28}
              />
            </mesh>

            {/* Animated Lip-Sync Mouth */}
            <mesh ref={mouthMeshRef} position={[0, -0.055, 0.18]}>
              <boxGeometry args={[0.052, 0.018, 0.016]} />
              <meshStandardMaterial color="#e11d48" roughness={0.3} />
            </mesh>
          </group>
        </group>
      )}

      {/* Floating 3D Character Status Tag */}
      {character && (
        <Html position={[0, 1.88, 0]} center distanceFactor={3.5}>
          <div
            style={{
              background: "rgba(15, 23, 42, 0.86)",
              backdropFilter: "blur(8px)",
              border: `1.5px solid ${auraColor}`,
              borderRadius: "999px",
              padding: "4px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
              color: "#f8fafc",
              fontSize: "12px",
              fontWeight: 700,
              boxShadow: `0 0 16px ${auraColor}44`,
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: auraColor,
                display: "inline-block",
              }}
            />
            <span>{character.display_name_ko}</span>
            <span style={{ color: "#94a3b8", fontWeight: 500 }}>
              {EMOTION_LABEL_KO[emotion]}
            </span>
            {gesture && (
              <span
                style={{
                  background: "rgba(251, 191, 36, 0.2)",
                  color: "#fbbf24",
                  padding: "1px 6px",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
              >
                {gesture}
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
