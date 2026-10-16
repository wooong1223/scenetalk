import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { EmotionId, GestureId, PropSpec, SceneMedia } from "../api/client";
import { useSceneStore } from "../state/sceneStore";

const EYE_Y = 1.55;
const HOTSPOT_RADIUS = 6;

// ---------- Panorama sphere ----------

function PanoSphere({ url }: { url: string }) {
  const texture = useLoader(THREE.TextureLoader, url);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.needsUpdate = true;
  }, [texture]);
  return (
    <mesh scale={[-1, 1, 1]} rotation={[0, Math.PI / 2, 0]}>
      <sphereGeometry args={[50, 64, 40]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

function PanoFallback() {
  return (
    <mesh>
      <sphereGeometry args={[50, 24, 16]} />
      <meshBasicMaterial color="#120f0d" side={THREE.BackSide} />
    </mesh>
  );
}

// ---------- Chroma-keyed character billboard ----------

const CHAR_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CHAR_FRAG = /* glsl */ `
  uniform sampler2D texA;
  uniform sampler2D texB;
  uniform float mixAmt;
  uniform float hasB;
  varying vec2 vUv;

  vec4 keyed(sampler2D t, vec2 uv) {
    vec4 c = texture2D(t, uv);
    float dom = c.g - max(c.r, c.b);
    float alpha = 1.0 - smoothstep(0.10, 0.34, dom);
    float spill = max(0.0, dom);
    c.g -= spill * 0.85;
    // soften edge halo
    float edge = smoothstep(0.0, 0.10, dom);
    c.rgb = mix(c.rgb, c.rgb * 0.92, edge);
    return vec4(c.rgb, alpha);
  }

  void main() {
    vec4 a = keyed(texA, vUv);
    vec4 b = hasB > 0.5 ? keyed(texB, vUv) : a;
    vec4 c = mix(b, a, mixAmt);
    // fade feet into the floor
    float footFade = smoothstep(0.0, 0.08, vUv.y);
    c.a *= footFade;
    if (c.a < 0.02) discard;
    gl_FragColor = c;
  }
`;

const textureCache = new Map<string, Promise<THREE.Texture>>();
function loadTexture(url: string): Promise<THREE.Texture> {
  let p = textureCache.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(
        url,
        (t) => {
          t.minFilter = THREE.LinearFilter;
          t.generateMipmaps = false;
          resolve(t);
        },
        undefined,
        reject
      );
    });
    textureCache.set(url, p);
  }
  return p;
}

interface CharacterBillboardProps {
  urls: Partial<Record<EmotionId, string>>;
  emotion: EmotionId;
  gesture: GestureId | null;
}

function CharacterBillboard({ urls, emotion, gesture }: CharacterBillboardProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const [ready, setReady] = useState(false);
  const currentUrlRef = useRef<string | null>(null);
  const gestureTimerRef = useRef(0);
  const activeGestureRef = useRef<GestureId | null>(null);
  const smoothMouthRef = useRef(0);

  const uniforms = useMemo(
    () => ({
      texA: { value: null as THREE.Texture | null },
      texB: { value: null as THREE.Texture | null },
      mixAmt: { value: 1 },
      hasB: { value: 0 },
    }),
    []
  );

  const targetUrl = urls[emotion] || urls.neutral || null;

  useEffect(() => {
    if (!targetUrl || targetUrl === currentUrlRef.current) return;
    let cancelled = false;
    loadTexture(targetUrl).then((tex) => {
      if (cancelled) return;
      const prev = uniforms.texA.value;
      if (prev) {
        uniforms.texB.value = prev;
        uniforms.hasB.value = 1;
        uniforms.mixAmt.value = 0;
      } else {
        uniforms.mixAmt.value = 1;
      }
      uniforms.texA.value = tex;
      currentUrlRef.current = targetUrl;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [targetUrl, uniforms]);

  useEffect(() => {
    if (gesture) {
      activeGestureRef.current = gesture;
      gestureTimerRef.current = 1.6;
    }
  }, [gesture]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const mouthOpen = useSceneStore.getState().mouthOpen;
    smoothMouthRef.current = THREE.MathUtils.lerp(
      smoothMouthRef.current,
      mouthOpen,
      0.25
    );
    const m = smoothMouthRef.current;

    if (uniforms.mixAmt.value < 1) {
      uniforms.mixAmt.value = Math.min(1, uniforms.mixAmt.value + delta * 2.2);
    }

    if (gestureTimerRef.current > 0) {
      gestureTimerRef.current = Math.max(0, gestureTimerRef.current - delta);
      if (gestureTimerRef.current === 0) activeGestureRef.current = null;
    }
    const g = activeGestureRef.current;
    const gp = gestureTimerRef.current / 1.6; // 1 → 0

    const grp = groupRef.current;
    if (grp) {
      const breathe = Math.sin(t * 1.4) * 0.006;
      grp.scale.set(1 + m * 0.012, 1 + breathe + m * 0.025, 1);
      grp.position.y = Math.sin(t * 1.4) * 0.004 + m * 0.012;
      let rx = 0;
      let ry = 0;
      let rz = 0;
      if (g === "nod") rx = Math.sin(t * 11) * 0.06 * gp;
      else if (g === "look_away") ry = 0.35 * Math.min(1, gp * 1.6);
      else if (g === "wave" || g === "smile") rz = Math.sin(t * 7) * 0.035 * gp;
      else if (g === "shrug") {
        grp.position.y += 0.03 * Math.sin(Math.min(1, (1 - gp) * 2) * Math.PI);
      }
      grp.rotation.set(rx, ry, rz);
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.SpriteMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.12 + m * 0.5, 0.2);
      const s = 2.4 + m * 0.3;
      glowRef.current.scale.set(s, s * 1.15, 1);
    }
  });

  const glowTexture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255, 214, 150, 0.9)");
    grad.addColorStop(0.45, "rgba(255, 190, 120, 0.35)");
    grad.addColorStop(1, "rgba(255, 170, 100, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  if (!targetUrl) return null;

  return (
    <Billboard position={[0, 1.22, -0.25]} follow lockX lockZ>
      <sprite ref={glowRef} position={[0, 0.1, -0.05]}>
        <spriteMaterial
          map={glowTexture}
          transparent
          opacity={0.15}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <group ref={groupRef} visible={ready}>
        <mesh>
          <planeGeometry args={[1.2, 1.6]} />
          <shaderMaterial
            ref={matRef}
            vertexShader={CHAR_VERT}
            fragmentShader={CHAR_FRAG}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </Billboard>
  );
}

// ---------- Prop hotspots ----------

function propToPosition(prop: PropSpec): [number, number, number] {
  const [x, y, z] = prop.position;
  const yaw = Math.atan2(x, -z);
  const pitch = THREE.MathUtils.clamp(-0.25 + (y / 2) * 0.4, -0.3, 0.2);
  const r = HOTSPOT_RADIUS;
  return [
    Math.sin(yaw) * Math.cos(pitch) * r,
    EYE_Y + Math.sin(pitch) * r,
    -Math.cos(yaw) * Math.cos(pitch) * r,
  ];
}

interface HotspotProps {
  prop: PropSpec;
  hovered: boolean;
  selected: boolean;
  onOver: (p: PropSpec) => void;
  onOut: (p: PropSpec) => void;
  onClick: (p: PropSpec) => void;
}

function Hotspot({ prop, hovered, selected, onOver, onOut, onClick }: HotspotProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const position = useMemo(() => propToPosition(prop), [prop]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ringRef.current) {
      const base = hovered || selected ? 1.25 : 1;
      const pulse = 1 + Math.sin(t * 2.2 + position[0]) * 0.06;
      ringRef.current.scale.setScalar(base * pulse);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = hovered || selected ? 0.95 : 0.55 + Math.sin(t * 2.2) * 0.1;
    }
  });

  const color = selected ? "#f2c94c" : hovered ? "#ffe08a" : "#f3ede2";

  return (
    <Billboard position={position}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onOver(prop);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onOut(prop);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(prop);
        }}
      >
        <circleGeometry args={[0.28, 32]} />
        <meshBasicMaterial transparent opacity={0.0} depthWrite={false} />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.1, 0.14, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.035, 20]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {(hovered || selected) && (
        <Html center distanceFactor={8} position={[0, 0.34, 0]} style={{ pointerEvents: "none" }}>
          <div
            style={{
              whiteSpace: "nowrap",
              padding: "6px 12px",
              borderRadius: 999,
              background: "rgba(12, 10, 9, 0.82)",
              border: "1px solid rgba(242, 201, 76, 0.6)",
              color: "#f2c94c",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            {prop.label_ko}
          </div>
        </Html>
      )}
    </Billboard>
  );
}

// ---------- World ----------

interface PanoramaWorldProps {
  media: SceneMedia | null;
  props: PropSpec[];
  emotion: EmotionId;
  gesture: GestureId | null;
  hoveredId: string | null;
  selectedId: string | null;
  onPropOver: (p: PropSpec) => void;
  onPropOut: (p: PropSpec) => void;
  onPropClick: (p: PropSpec) => void;
}

export function PanoramaWorld({
  media,
  props,
  emotion,
  gesture,
  hoveredId,
  selectedId,
  onPropOver,
  onPropOut,
  onPropClick,
}: PanoramaWorldProps) {
  const panoUrl = media?.panorama_url || null;
  const charUrls = media?.character_urls || {};

  return (
    <>
      <Suspense fallback={<PanoFallback />}>
        {panoUrl ? <PanoSphere key={panoUrl} url={panoUrl} /> : <PanoFallback />}
      </Suspense>
      <CharacterBillboard urls={charUrls} emotion={emotion} gesture={gesture} />
      {props.map((p) => (
        <Hotspot
          key={p.id}
          prop={p}
          hovered={hoveredId === p.id}
          selected={selectedId === p.id}
          onOver={onPropOver}
          onOut={onPropOut}
          onClick={onPropClick}
        />
      ))}
    </>
  );
}
