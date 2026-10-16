import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface FirstPersonLookProps {
  pointerLockEnabled: boolean;
}

export function FirstPersonLook({ pointerLockEnabled }: FirstPersonLookProps) {
  const { camera, gl } = useThree();
  const yawRef = useRef(0);
  const pitchRef = useRef(-0.04);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const posOffsetRef = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    camera.position.set(0, 1.55, 2.35);
    camera.rotation.order = "YXZ";
  }, [camera]);

  useEffect(() => {
    const dom = gl.domElement;

    const onMouseDown = (e: MouseEvent) => {
      if (pointerLockEnabled) {
        if (document.pointerLockElement !== dom) {
          dom.requestPointerLock?.();
        }
        return;
      }
      if (e.button === 0) {
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === dom) {
        yawRef.current -= e.movementX * 0.0022;
        pitchRef.current -= e.movementY * 0.0022;
      } else if (isDraggingRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        yawRef.current -= dx * 0.0032;
        pitchRef.current -= dy * 0.0032;
      } else {
        return;
      }
      pitchRef.current = Math.max(-0.55, Math.min(0.5, pitchRef.current));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
      ) {
        return;
      }
      keysRef.current.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [gl, pointerLockEnabled]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const speed = 1.4 * delta;
    const keys = keysRef.current;

    if (keys.has("KeyA") || keys.has("ArrowLeft")) {
      posOffsetRef.current.x = Math.max(-1.2, posOffsetRef.current.x - speed);
    }
    if (keys.has("KeyD") || keys.has("ArrowRight")) {
      posOffsetRef.current.x = Math.min(1.2, posOffsetRef.current.x + speed);
    }
    if (keys.has("KeyW") || keys.has("ArrowUp")) {
      posOffsetRef.current.z = Math.max(-0.8, posOffsetRef.current.z - speed);
    }
    if (keys.has("KeyS") || keys.has("ArrowDown")) {
      posOffsetRef.current.z = Math.min(0.8, posOffsetRef.current.z + speed);
    }

    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      posOffsetRef.current.x,
      0.12
    );
    camera.position.z = THREE.MathUtils.lerp(
      camera.position.z,
      2.35 + posOffsetRef.current.z,
      0.12
    );
    camera.position.y = 1.55 + Math.sin(t * 1.6) * 0.012;

    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, yawRef.current, 0.18);
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, pitchRef.current, 0.18);
  });

  return null;
}
