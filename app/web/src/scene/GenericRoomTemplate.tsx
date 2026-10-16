import { PropSpec } from "../api/client";
import { useSceneStore } from "../state/sceneStore";
import { InteractivePropMesh } from "./CafeTemplate";

interface TemplateProps {
  props: PropSpec[];
  onPointerOver: (p: PropSpec) => void;
  onPointerOut: (p: PropSpec) => void;
  onClick: (p: PropSpec) => void;
}

export function GenericRoomTemplate({
  props,
  onPointerOver,
  onPointerOut,
  onClick,
}: TemplateProps) {
  const { hoveredProp } = useSceneStore();

  return (
    <group>
      {/* Classic 1930s Gyeongseong / K-Drama Parlor Floor & Rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial color="#291d16" roughness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -0.2]} receiveShadow>
        <planeGeometry args={[3.8, 3.2]} />
        <meshStandardMaterial color="#4c1d24" roughness={0.85} />
      </mesh>

      {/* Walls with Dark Wood Wainscoting */}
      <mesh position={[0, 2.1, -3.2]} receiveShadow>
        <boxGeometry args={[9, 4.4, 0.2]} />
        <meshStandardMaterial color="#1a2234" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.65, -3.08]} receiveShadow>
        <boxGeometry args={[8.8, 1.3, 0.06]} />
        <meshStandardMaterial color="#3b2314" roughness={0.65} />
      </mesh>
      <mesh position={[-3.8, 2.1, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[8, 4.4, 0.2]} />
        <meshStandardMaterial color="#161e2e" roughness={0.85} />
      </mesh>
      <mesh position={[3.8, 2.1, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[8, 4.4, 0.2]} />
        <meshStandardMaterial color="#161e2e" roughness={0.85} />
      </mesh>

      {/* Vintage Wooden Executive Desk Between Character & Player */}
      <group position={[0, 0, 0.2]}>
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.65, 0.07, 0.85]} />
          <meshStandardMaterial color="#5c2d16" roughness={0.45} />
        </mesh>
        <mesh position={[-0.65, 0.37, 0]} castShadow>
          <boxGeometry args={[0.28, 0.72, 0.78]} />
          <meshStandardMaterial color="#451a03" roughness={0.6} />
        </mesh>
        <mesh position={[0.65, 0.37, 0]} castShadow>
          <boxGeometry args={[0.28, 0.72, 0.78]} />
          <meshStandardMaterial color="#451a03" roughness={0.6} />
        </mesh>
      </group>

      {/* Bookshelves / Dossier Cabinets in Background */}
      <mesh position={[-2.2, 1.2, -2.85]} castShadow>
        <boxGeometry args={[1.4, 2.4, 0.4]} />
        <meshStandardMaterial color="#3b1d0e" roughness={0.65} />
      </mesh>
      <mesh position={[2.2, 1.2, -2.85]} castShadow>
        <boxGeometry args={[1.4, 2.4, 0.4]} />
        <meshStandardMaterial color="#3b1d0e" roughness={0.65} />
      </mesh>

      {/* Vintage Brass Bankers Chandelier */}
      <group position={[0, 2.85, -0.3]}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.45, 0.18, 24]} />
          <meshStandardMaterial
            color="#d97706"
            emissive="#f59e0b"
            emissiveIntensity={0.65}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      </group>

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
