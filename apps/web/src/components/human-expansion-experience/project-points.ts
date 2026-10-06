import * as THREE from 'three';
import { CAMERA } from './experience-config';

export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * Where world-space points on the figure land on screen, for a canvas of the
 * given pixel size. The camera never moves (apart from a breath of 0.3 percent),
 * so this is a pure function of the canvas size — exactly the camera the scene
 * uses — and connector lines can be drawn in plain SVG without the render loop.
 */
export function projectPoints(
  points: readonly THREE.Vector3[],
  width: number,
  height: number,
): ScreenPoint[] {
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, width / height, 0.1, 50);
  camera.position.set(0, CAMERA.targetY, CAMERA.distance);
  camera.lookAt(0, CAMERA.targetY, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return points.map((point) => {
    const v = point.clone().project(camera);
    return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height };
  });
}
