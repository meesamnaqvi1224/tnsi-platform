'use client';

import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from './experience-config';
import { nodeActivations, type ExperienceRuntime } from './experience-runtime';
import { buildNetworkArrays, nodePositions, type NetworkQuality } from './network-geometry';
import { networkFragment, networkVertex } from './shaders';

/**
 * The abstract internal network: an axis, twin helices, ribcage rings, limb
 * strands, crown rings, widening orbits and late outward reaches. Each
 * pathway draws itself in at its own point in the scroll.
 */
export function NeuralNetwork({
  runtimeRef,
  quality,
}: {
  runtimeRef: RefObject<ExperienceRuntime>;
  quality: NetworkQuality;
}) {
  const { geometry, material } = useMemo(() => {
    const arrays = buildNetworkArrays(quality);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arrays.position, 3));
    g.setAttribute('aAlong', new THREE.BufferAttribute(arrays.along, 1));
    g.setAttribute('aStage', new THREE.BufferAttribute(arrays.stage, 1));
    g.setAttribute('aWeight', new THREE.BufferAttribute(arrays.weight, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(arrays.seed, 1));

    const positions = nodePositions();
    const uNodes = positions.map((p) => new THREE.Vector4(p.x, p.y, p.z, 0));
    const m = new THREE.ShaderMaterial({
      vertexShader: networkVertex,
      fragmentShader: networkFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(PALETTE.line) },
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uFlow: { value: 1 },
        uNodes: { value: uNodes },
      },
    });
    return { geometry: g, material: m };
  }, [quality]);

  const lineRef = useRef<THREE.LineSegments>(null);

  // Uniforms are updated through the mesh ref, the usual React Three Fiber idiom for per-frame changes.
  useFrame((state) => {
    const mesh = lineRef.current;
    if (!mesh) return;
    const runtime = runtimeRef.current;
    const u = (mesh.material as THREE.ShaderMaterial).uniforms;
    u.uProgress!.value = runtime.progress;
    u.uTime!.value = state.clock.elapsedTime;
    u.uFlow!.value = runtime.reducedMotion ? 0 : 1;
    const activations = nodeActivations(runtime.progress);
    (u.uNodes!.value as THREE.Vector4[]).forEach((n, i) => {
      const a = activations[i]!;
      n.w = a.active + a.lit * 0.06;
    });
  });

  return (
    <lineSegments
      ref={lineRef}
      geometry={geometry}
      material={material}
      renderOrder={2}
      frustumCulled={false}
    />
  );
}
