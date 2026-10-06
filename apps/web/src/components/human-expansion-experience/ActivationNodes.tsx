'use client';

import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from './experience-config';
import { nodeActivations, type ExperienceRuntime } from './experience-runtime';
import { bodyAt, nodePositions } from './network-geometry';
import { orbFragment, orbVertex } from './shaders';

/** A soft radial falloff used for the orb halos and the light behind the figure. */
export function createGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function orbMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: orbVertex,
    fragmentShader: orbFragment,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uDeep: { value: new THREE.Color(PALETTE.orbDeep) },
      uBright: { value: new THREE.Color(PALETTE.orbBright) },
      uOpacity: { value: 1 },
    },
  });
}

/** The two small orbs that rise above the crown on the central axis, echoing the five nodes. */
const CROWN_ORBS = [
  { y: 2.09, r: 0.024 },
  { y: 2.2, r: 0.014 },
] as const;

/**
 * The five activation nodes on the central axis, as glossy gold orbs. All five
 * are always present and softly visible; as the scroll reaches each condition
 * its orb brightens and grows while the others recede, and orbs already
 * reached stay lit. Two small orbs above the crown belong to the same family.
 */
export function ActivationNodes({ runtimeRef }: { runtimeRef: RefObject<ExperienceRuntime> }) {
  const positions = useMemo(() => nodePositions(), []);
  const crownZ = useMemo(() => bodyAt(1.96).zc, []);
  const glow = useMemo(() => createGlowTexture(), []);
  const materials = useMemo(() => positions.map(() => orbMaterial()), [positions]);
  const crownMaterial = useMemo(() => orbMaterial(), []);
  const cores = useRef<(THREE.Mesh | null)[]>([]);
  const halos = useRef<(THREE.Sprite | null)[]>([]);
  const haloColor = useMemo(() => new THREE.Color(PALETTE.halo), []);

  useFrame(() => {
    const activations = nodeActivations(runtimeRef.current.progress);
    activations.forEach((a, i) => {
      const core = cores.current[i];
      const halo = halos.current[i];
      if (core) {
        core.scale.setScalar(0.017 + 0.007 * a.lit + 0.016 * a.active);
        (core.material as THREE.ShaderMaterial).uniforms.uOpacity!.value = Math.min(
          1,
          0.5 + 0.2 * a.lit + 0.3 * a.active,
        );
      }
      if (halo) {
        halo.scale.setScalar(0.1 + 0.05 * a.lit + 0.2 * a.active);
        (halo.material as THREE.SpriteMaterial).opacity = 0.07 + 0.1 * a.lit + 0.38 * a.active;
      }
    });
  });

  return (
    <group renderOrder={5}>
      {positions.map((p, i) => (
        <group key={i} position={p}>
          <sprite
            ref={(s) => {
              halos.current[i] = s;
            }}
            renderOrder={5}
          >
            <spriteMaterial
              map={glow}
              color={haloColor}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.1}
            />
          </sprite>
          <mesh
            ref={(m) => {
              cores.current[i] = m;
            }}
            material={materials[i]}
            renderOrder={5}
          >
            <sphereGeometry args={[1, 28, 20]} />
          </mesh>
        </group>
      ))}
      {CROWN_ORBS.map((orb) => (
        <group key={orb.y} position={[0, orb.y, crownZ]}>
          <sprite scale={[orb.r * 7, orb.r * 7, 1]} renderOrder={5}>
            <spriteMaterial
              map={glow}
              color={haloColor}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.22}
            />
          </sprite>
          <mesh scale={orb.r} material={crownMaterial} renderOrder={5}>
            <sphereGeometry args={[1, 24, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
