'use client';

import { Suspense, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ActivationNodes, createGlowTexture } from './ActivationNodes';
import { CAMERA, PALETTE } from './experience-config';
import { bodyGlow, type ExperienceRuntime } from './experience-runtime';
import { HumanModel } from './HumanModel';
import type { NetworkQuality } from './network-geometry';
import { NeuralNetwork } from './NeuralNetwork';
import { atmosphereFragment, atmosphereVertex } from './shaders';

/** Fixed camera with a barely-perceptible breath. (The eased scroll progress is advanced by the page, not the canvas, so the text never depends on WebGL.) */
function CameraRig({ runtimeRef }: { runtimeRef: RefObject<ExperienceRuntime> }) {
  const camera = useThree((state) => state.camera);
  useFrame((state) => {
    const runtime = runtimeRef.current;
    const breath = runtime.reducedMotion
      ? 0
      : Math.sin(state.clock.elapsedTime * 0.45) * CAMERA.breathing;
    camera.position.set(0, CAMERA.targetY, CAMERA.distance + breath);
    camera.lookAt(0, CAMERA.targetY, 0);
  });
  return null;
}

/**
 * The atmosphere: a dark room warmed by light gathering low around the feet
 * and faintly behind the torso, a soft vertical beam of light on the central
 * axis, and a glow on the floor beneath the figure. All soft and additive, so
 * nothing here reads as an object.
 */
function Atmosphere({ runtimeRef }: { runtimeRef: RefObject<ExperienceRuntime> }) {
  const glow = useMemo(() => createGlowTexture(), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        depthWrite: false,
        uniforms: {
          uBase: { value: new THREE.Color(PALETTE.background) },
          uWarm: { value: new THREE.Color(PALETTE.warm) },
          uAmount: { value: 0 },
        },
      }),
    [],
  );
  const planeRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const mesh = planeRef.current;
    if (mesh) {
      (mesh.material as THREE.ShaderMaterial).uniforms.uAmount!.value = bodyGlow(
        runtimeRef.current.progress,
      );
    }
  });
  return (
    <>
      <mesh ref={planeRef} position={[0, 1, -3]} material={material} renderOrder={-2}>
        <planeGeometry args={[30, 20]} />
      </mesh>
      {/* The beam on the central axis, a little taller than the figure. */}
      <sprite position={[0, 1.15, -0.12]} scale={[0.34, 3.5, 1]} renderOrder={0}>
        <spriteMaterial
          map={glow}
          color="#e9c887"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.1}
        />
      </sprite>
      {/* Light pooled on the floor beneath the feet. */}
      <sprite position={[0, 0.02, 0.05]} scale={[2.6, 0.55, 1]} renderOrder={0}>
        <spriteMaterial
          map={glow}
          color="#d8ad66"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.26}
        />
      </sprite>
    </>
  );
}

export interface ExperienceSceneProps {
  runtimeRef: RefObject<ExperienceRuntime>;
  quality: NetworkQuality;
  /** Render loop runs only while the scene is on screen. */
  active: boolean;
}

export function ExperienceScene({ runtimeRef, quality, active }: ExperienceSceneProps) {
  return (
    <Canvas
      dpr={[1, quality === 'high' ? 1.75 : 1.25]}
      camera={{
        fov: CAMERA.fov,
        position: [0, CAMERA.targetY, CAMERA.distance],
        near: 0.1,
        far: 50,
      }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      frameloop={active ? 'always' : 'never'}
      aria-hidden
    >
      <color attach="background" args={[PALETTE.background]} />
      <CameraRig runtimeRef={runtimeRef} />
      <Atmosphere runtimeRef={runtimeRef} />
      <Suspense fallback={null}>
        <HumanModel runtimeRef={runtimeRef} />
      </Suspense>
      <NeuralNetwork runtimeRef={runtimeRef} quality={quality} />
      <ActivationNodes runtimeRef={runtimeRef} />
    </Canvas>
  );
}
