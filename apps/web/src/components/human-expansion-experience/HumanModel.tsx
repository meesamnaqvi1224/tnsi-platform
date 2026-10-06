'use client';

import { useMemo, useRef, type RefObject } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from './experience-config';
import { bodyGlow, type ExperienceRuntime } from './experience-runtime';
import { bodyFragment, bodyVertex } from './shaders';

export const FIGURE_URL = '/models/human-expansion/figure.glb';

/**
 * The glTF is Meshopt-compressed with quantised positions, so its vertices
 * live in a small integer space with the real scale held on the node. We read
 * the first mesh back into plain float positions in world scale, then compute
 * smooth normals ourselves (the file is geometry only, by design).
 */
function decodeFigure(scene: THREE.Object3D): THREE.BufferGeometry {
  let source: THREE.Mesh | undefined;
  scene.updateWorldMatrix(true, true);
  scene.traverse((object) => {
    if (!source && (object as THREE.Mesh).isMesh) source = object as THREE.Mesh;
  });
  if (!source) throw new Error('The figure model contains no mesh.');

  const position = source.geometry.getAttribute('position');
  const floats = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    floats[i * 3] = position.getX(i);
    floats[i * 3 + 1] = position.getY(i);
    floats[i * 3 + 2] = position.getZ(i);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(floats, 3));
  const index = source.geometry.getIndex();
  if (index) geometry.setIndex(index.clone());
  geometry.applyMatrix4(source.matrixWorld);
  geometry.computeVertexNormals();
  return geometry;
}

function skinMaterial(back: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: bodyVertex,
    fragmentShader: bodyFragment,
    transparent: true,
    depthWrite: false,
    side: back ? THREE.BackSide : THREE.FrontSide,
    uniforms: {
      uColor: { value: new THREE.Color(PALETTE.skin) },
      uShadow: { value: new THREE.Color(PALETTE.shadow) },
      uInner: { value: new THREE.Color(PALETTE.inner) },
      uRim: { value: new THREE.Color(PALETTE.rim) },
      uGlow: { value: 0 },
      uBack: { value: back ? 1 : 0 },
    },
  });
}

/** The fixed central figure: a translucent sculptural skin drawn in two layers (interior, then rim). */
export function HumanModel({ runtimeRef }: { runtimeRef: RefObject<ExperienceRuntime> }) {
  const { scene } = useGLTF(FIGURE_URL);
  const geometry = useMemo(() => decodeFigure(scene), [scene]);
  const materials = useMemo(() => ({ back: skinMaterial(true), front: skinMaterial(false) }), []);
  const backRef = useRef<THREE.Mesh>(null);
  const frontRef = useRef<THREE.Mesh>(null);

  // Uniforms are updated through the mesh refs, the usual React Three Fiber idiom for per-frame changes.
  useFrame(() => {
    const glow = bodyGlow(runtimeRef.current.progress);
    for (const mesh of [backRef.current, frontRef.current]) {
      if (mesh) (mesh.material as THREE.ShaderMaterial).uniforms.uGlow!.value = glow;
    }
  });

  return (
    <group>
      <mesh
        ref={backRef}
        geometry={geometry}
        material={materials.back}
        renderOrder={1}
        frustumCulled={false}
      />
      <mesh
        ref={frontRef}
        geometry={geometry}
        material={materials.front}
        renderOrder={4}
        frustumCulled={false}
      />
    </group>
  );
}

useGLTF.preload(FIGURE_URL);
