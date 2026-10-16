import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { EmotionId, GestureId, PropSpec, SceneMedia } from "../api/client";
import { useSceneStore } from "../state/sceneStore";

const EYE_Y = 1.55;
const HOTSPOT_RADIUS = 6;
// Character framing (see CharacterBillboard): the person occupies ~85% of the
// portrait texture height; we want them to read as ~72% of the viewport.
const CHAR_DIST = 2.4;
const PERSON_FRACTION_IN_TEXTURE = 0.85;
const TARGET_VIEWPORT_FRACTION = 1.35; // conversational framing: head-to-waist visible, legs revealed when looking down
const FEET_VIEWPORT_FRACTION = -0.5;

// ---------- Panorama sphere ----------

function PanoSphere({ url }: { url: string }) {
  const texture = useLoader(THREE.TextureLoader, url);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    gl.initTexture(texture); // force the upload now, then tell the app the set is painted
    useSceneStore.getState().setPanoReady(true);
    return () => useSceneStore.getState().setPanoReady(false);
  }, [texture, gl]);
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
  uniform vec3 keyLight;
  uniform vec2 texel;
  varying vec2 vUv;

  float keyAlpha(vec3 c) {
    float dom = c.g - max(c.r, c.b);
    // wider smoothstep → softer, less razor-sharp cut-out edge
    return 1.0 - smoothstep(0.06, 0.30, dom);
  }

  vec4 keyed(sampler2D t, vec2 uv) {
    vec4 c = texture2D(t, uv);
    float dom = c.g - max(c.r, c.b);
    // 4-tap alpha softening (~1px)
    float a = keyAlpha(c.rgb);
    a += keyAlpha(texture2D(t, uv + vec2(texel.x, 0.0)).rgb);
    a += keyAlpha(texture2D(t, uv - vec2(texel.x, 0.0)).rgb);
    a += keyAlpha(texture2D(t, uv + vec2(0.0, texel.y)).rgb);
    a += keyAlpha(texture2D(t, uv - vec2(0.0, texel.y)).rgb);
    a /= 5.0;
    // spill suppression
    float spill = max(0.0, dom);
    c.g -= spill * 0.9;
    float edge = smoothstep(0.0, 0.10, dom);
    c.rgb = mix(c.rgb, c.rgb * 0.9, edge);
    return vec4(c.rgb, a);
  }

  void main() {
    vec4 a = keyed(texA, vUv);
    vec4 b = hasB > 0.5 ? keyed(texB, vUv) : a;
    vec4 c = mix(b, a, mixAmt);

    // --- harmonise with the panorama ---
    // desaturate ~12%
    float luma = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    c.rgb = mix(c.rgb, vec3(luma), 0.12);
    // tint by scene key light (~22%)
    c.rgb = mix(c.rgb, c.rgb * keyLight, 0.22);
    // lift blacks slightly
    c.rgb = c.rgb * 0.92 + 0.04;

    // fade feet into the floor
    float footFade = smoothstep(0.0, 0.06, vUv.y);
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
          t.colorSpace = THREE.SRGBColorSpace;
          t.minFilter = THREE.LinearMipmapLinearFilter;
          t.magFilter = THREE.LinearFilter;
          t.generateMipmaps = true;
          t.needsUpdate = true;
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

function makeRadialTexture(stops: Array<[number, string]>, size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, c] of stops) grad.addColorStop(o, c);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface CharacterBillboardProps {
  urls: Partial<Record<EmotionId, string>>;
  emotion: EmotionId;
  gesture: GestureId | null;
  keyColorHex: string;
}

function CharacterBillboard({ urls, emotion, gesture, keyColorHex }: CharacterBillboardProps) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const groupRef = useRef<THREE.Group>(null);
  const yawGroupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const [ready, setReady] = useState(false);
  const [aspect, setAspect] = useState(9 / 16);
  const [texSize, setTexSize] = useState<[number, number]>([768, 1376]);
  const currentUrlRef = useRef<string | null>(null);
  const gestureTimerRef = useRef(0);
  const activeGestureRef = useRef<GestureId | null>(null);
  const smoothMouthRef = useRef(0);
  const yawRef = useRef(0);

  const keyLight = useMemo(() => {
    const c = new THREE.Color(keyColorHex || "#ffd9a8");
    // normalise so the tint never darkens much
    const m = Math.max(c.r, c.g, c.b) || 1;
    return new THREE.Vector3(c.r / m, c.g / m, c.b / m);
  }, [keyColorHex]);

  const uniforms = useMemo(
    () => ({
      texA: { value: null as THREE.Texture | null },
      texB: { value: null as THREE.Texture | null },
      mixAmt: { value: 1 },
      hasB: { value: 0 },
      keyLight: { value: new THREE.Vector3(1, 1, 1) },
      texel: { value: new THREE.Vector2(1 / 768, 1 / 1376) },
    }),
    []
  );

  useEffect(() => {
    uniforms.keyLight.value.copy(keyLight);
  }, [keyLight, uniforms]);

  useEffect(() => {
    uniforms.texel.value.set(1 / texSize[0], 1 / texSize[1]);
  }, [texSize, uniforms]);

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
      const img = tex.image as { width?: number; height?: number } | undefined;
      if (img?.width && img?.height) {
        setAspect(img.width / img.height);
        setTexSize([img.width, img.height]);
      }
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

  // ---- framing from the camera (recomputed on resize / fov change) ----
  const centerYRef = useRef(0);
  const framing = useMemo(() => {
    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const viewH = 2 * CHAR_DIST * Math.tan(fovRad / 2);
    const planeH = (viewH * TARGET_VIEWPORT_FRACTION) / PERSON_FRACTION_IN_TEXTURE;
    const planeW = planeH * aspect;
    // feet (bottom of the person) at FEET_VIEWPORT_FRACTION from the bottom of the view
    const feetY = EYE_Y - viewH / 2 + viewH * FEET_VIEWPORT_FRACTION;
    // person's feet sit ~7.5% above the texture bottom (85% centred → 7.5% margins)
    const personBottomOffset = planeH * (1 - PERSON_FRACTION_IN_TEXTURE) * 0.5;
    const planeBottomY = feetY - personBottomOffset;
    const centerY = planeBottomY + planeH / 2;
    centerYRef.current = centerY;
    return { planeH, planeW, centerY, feetY };
    // size is read so the memo re-runs on resize (fov can change with aspect in some setups)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.fov, aspect, size.width, size.height]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const mouthOpen = useSceneStore.getState().mouthOpen;
    smoothMouthRef.current = THREE.MathUtils.lerp(smoothMouthRef.current, mouthOpen, 0.25);
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

    // ---- damped facing: follow the camera only while the user is roughly looking at us ----
    const yg = yawGroupRef.current;
    if (yg) {
      const dx = camera.position.x - yg.position.x;
      const dz = camera.position.z - yg.position.z;
      const toCamYaw = Math.atan2(dx, dz);
      // camera yaw (YXZ order) → where the user is looking
      const camYaw = camera.rotation.y;
      // angle between the look direction and the character
      const lookDelta = Math.atan2(Math.sin(camYaw - (toCamYaw + Math.PI)), Math.cos(camYaw - (toCamYaw + Math.PI)));
      const looking = Math.abs(lookDelta) < THREE.MathUtils.degToRad(20);
      const target = looking ? toCamYaw : yawRef.current;
      const k = looking ? 0.08 : 0.015;
      yawRef.current = THREE.MathUtils.lerp(yawRef.current, target, k);
      yg.rotation.y = yawRef.current;
    }

    const grp = groupRef.current;
    if (grp) {
      const breathe = Math.sin(t * 1.4) * 0.006;
      grp.scale.set(1 + m * 0.012, 1 + breathe + m * 0.025, 1);
      grp.position.y = centerYRef.current + Math.sin(t * 1.4) * 0.004 + m * 0.012;
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
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.1 + m * 0.4, 0.2);
      const s = framing.planeW * 1.9 + m * 0.3;
      glowRef.current.scale.set(s, s * 1.25, 1);
    }
    if (shadowRef.current) {
      const mat = shadowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 - m * 0.04;
    }
  });

  const glowTexture = useMemo(() => {
    const c = new THREE.Color(keyColorHex || "#ffd9a8");
    const rgb = `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}`;
    return makeRadialTexture([
      [0, `rgba(${rgb}, 0.85)`],
      [0.45, `rgba(${rgb}, 0.3)`],
      [1, `rgba(${rgb}, 0)`],
    ]);
  }, [keyColorHex]);

  const shadowTexture = useMemo(
    () =>
      makeRadialTexture([
        [0, "rgba(0, 0, 0, 1)"],
        [0.35, "rgba(0, 0, 0, 0.7)"],
        [0.7, "rgba(0, 0, 0, 0.2)"],
        [1, "rgba(0, 0, 0, 0)"],
      ]),
    []
  );

  if (!targetUrl) return null;

  const { planeH, planeW, centerY, feetY } = framing;
  const zPos = camera.position.z - CHAR_DIST;

  return (
    <group ref={yawGroupRef} position={[0, 0, zPos]}>
      {/* contact shadow on the floor under the feet */}
      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, feetY + 0.005, 0.05]}>
        <planeGeometry args={[planeW * 1.15, planeW * 0.5]} />
        <meshBasicMaterial
          map={shadowTexture}
          transparent
          opacity={0.35}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* warm back glow matching the key light */}
      <sprite ref={glowRef} position={[0, centerY + planeH * 0.12, -0.08]}>
        <spriteMaterial
          map={glowTexture}
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <group ref={groupRef} visible={ready} position={[0, centerY, 0]}>
        <mesh>
          <planeGeometry args={[planeW, planeH]} />
          <shaderMaterial
            vertexShader={CHAR_VERT}
            fragmentShader={CHAR_FRAG}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
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

  const color = selected ? "#f2b705" : hovered ? "#ffd84d" : "#f4f4f6";

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
              background: "rgba(255, 255, 255, 0.9)",
              border: "1px solid #E6E6EA",
              color: "#111",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "Inter, Pretendard, sans-serif",
              backdropFilter: "blur(10px)",
              boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
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
  keyColorHex?: string;
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
  keyColorHex,
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
      <CharacterBillboard
        urls={charUrls}
        emotion={emotion}
        gesture={gesture}
        keyColorHex={keyColorHex || "#ffd9a8"}
      />
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
