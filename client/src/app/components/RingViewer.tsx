import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  useGLTF,
  Environment,
  Float,
  OrbitControls,
  Html,
} from "@react-three/drei";
import * as THREE from "three";

useGLTF.preload("/models/ring.glb");

function RingModel() {
  const { scene } = useGLTF("/models/ring.glb");

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const name = child.name.toLowerCase();
      const existingMat = child.material as THREE.MeshStandardMaterial;

      // Identify gem meshes by name convention or existing transmission / low-opacity material
      const isGem =
        /round|diamond|gem|stone|crystal|pavé|pave|brilliant/i.test(name) ||
        (existingMat?.transmission !== undefined && existingMat.transmission > 0) ||
        (existingMat?.opacity !== undefined && existingMat.opacity < 0.9);

      if (isGem) {
        child.material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color("#ffffff"),
          transmission: 1,
          ior: 2.4,
          roughness: 0.0,
          metalness: 0,
          thickness: 0.8,
          clearcoat: 1,
          clearcoatRoughness: 0,
          envMapIntensity: 4,
          attenuationDistance: 0.5,
          attenuationColor: new THREE.Color("#c8f0ff"),
        });
      } else {
        child.material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color("#c8922a"),
          metalness: 1,
          roughness: 0.07,
          envMapIntensity: 2.5,
          clearcoat: 0.3,
          clearcoatRoughness: 0.1,
        });
      }

      child.castShadow = true;
      child.receiveShadow = true;
    });

    return clone;
  }, [scene]);

  return (
    <Float speed={1.5} rotationIntensity={0.35} floatIntensity={0.5}>
      <primitive object={clonedScene} scale={1} position={[0, 0, 0]} />
    </Float>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div
        style={{
          fontFamily: "'General Sans', 'Inter', sans-serif",
          fontSize: "12px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#3F8BC3",
          opacity: 0.7,
        }}
      >
        Loading…
      </div>
    </Html>
  );
}

export function RingViewer() {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 4.5], fov: 32 }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <spotLight
        position={[4, 8, 4]}
        intensity={2}
        angle={0.35}
        penumbra={0.8}
        castShadow
      />
      <pointLight position={[-3, 2, -2]} intensity={0.6} color="#4488cc" />
      <pointLight position={[2, -2, 3]} intensity={0.3} color="#ffd580" />

      {/* Environment */}
      <Environment preset="city" />

      {/* Ring model */}
      <Suspense fallback={<LoadingFallback />}>
        <RingModel />
      </Suspense>

      {/* Controls */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={1.5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.6}
      />
    </Canvas>
  );
}
