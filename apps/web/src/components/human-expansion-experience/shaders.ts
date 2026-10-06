/**
 * GLSL for the three visual layers. Kept as plain strings (no `.glsl` loader)
 * so there is no new build tooling. Restraint is the point: low alpha, soft
 * fresnel rims, warm colour only.
 */

/** The translucent sculptural skin. Rendered twice: back faces (depth / volume) then front faces (rim). */
export const bodyVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorld;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

export const bodyFragment = /* glsl */ `
  uniform vec3 uColor;      // pale warm cream: the lit side of the form
  uniform vec3 uShadow;     // warm umber: the shaded side, so the form reads as sculpted volume
  uniform vec3 uInner;      // amber: the light held inside the figure
  uniform vec3 uRim;        // pale gold: the light that catches the glass edge
  uniform float uGlow;      // 0 → 1, rises slowly as the theory is revealed
  uniform float uBack;      // 1.0 for the back-face (interior) layer
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorld;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    float facing = abs(dot(n, v));

    // Sculptural volume from one warm key light (upper left, front).
    vec3 key = normalize(vec3(-0.5, 0.6, 0.62));
    float lam = dot(n, key) * 0.5 + 0.5;
    lam = pow(clamp(lam, 0.0, 1.0), 1.35);
    vec3 lit = mix(uShadow, uColor, smoothstep(0.06, 0.92, lam));

    // Glass: a bright warm light along the edge of the form, and a broad soft
    // sheen where the key light catches it. Wide and low, never a hard glint.
    float fres = pow(1.0 - facing, 2.4);
    vec3 h = normalize(key + v);
    float sheen = pow(max(dot(n, h), 0.0), 18.0);

    // Light held inside: strongest along the centre line, warmer toward the feet.
    float core = exp(-pow(vWorld.x * 2.2, 2.0));
    float low = smoothstep(1.9, 0.0, vWorld.y);
    vec3 col = lit * 1.02;
    col += uInner * (0.26 + 0.42 * uGlow) * (0.35 + 0.65 * core) * facing;
    col += uRim * fres * 0.95;
    col += vec3(1.0, 0.94, 0.8) * sheen * 0.32;
    col = mix(col, col * vec3(1.07, 0.97, 0.84), low * 0.55);

    // See-through toward the centre so the inner light shows; more substance at the edge.
    float alpha = mix(0.34, 0.42, uGlow) + fres * 0.5 + sheen * 0.18 + lam * 0.04 - core * facing * 0.15;

    // The back-face layer is the glow behind the network: amber, soft.
    alpha *= mix(1.0, 0.5, uBack);
    col = mix(col, uInner * 0.95, 0.3 * uBack);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`;

/** The glossy gold orbs: a lit sphere with a soft highlight and a warm edge. */
export const orbVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const orbFragment = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uBright;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    vec3 key = normalize(vec3(-0.45, 0.65, 0.6));
    float lam = clamp(dot(n, key) * 0.5 + 0.5, 0.0, 1.0);
    float fres = pow(1.0 - abs(dot(n, v)), 2.0);
    float spec = pow(max(dot(n, normalize(key + v)), 0.0), 40.0);
    vec3 col = mix(uDeep, uBright, pow(lam, 1.4));
    col += uBright * fres * 0.35;
    col += vec3(1.0, 0.97, 0.88) * spec * 0.9;
    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }
`;

/** The atmosphere behind the figure: the room's dark, warmed by light gathering low around the feet. */
export const atmosphereVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragment = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uWarm;
  uniform float uAmount;   // 0 → 1: the glow strengthens as the theory is revealed
  varying vec3 vWorld;
  void main() {
    // The plane sits well behind the figure, so measure against the figure's own space.
    vec2 p = vWorld.xy * 0.62;
    float floorGlow = exp(-(p.x * p.x) / 1.1 - pow((p.y - 0.12) / 0.55, 2.0));
    float bodyGlow = exp(-(p.x * p.x) / 0.5 - pow((p.y - 0.78) / 1.15, 2.0));
    float k = (0.3 * floorGlow + 0.05 * bodyGlow) * (0.7 + 0.5 * uAmount);
    vec3 col = uBase + uWarm * k;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/** The internal network: thin lines that draw themselves in as progress passes each pathway's stage. */
export const networkVertex = /* glsl */ `
  attribute float aAlong;
  attribute float aStage;
  attribute float aWeight;
  attribute float aSeed;
  uniform float uProgress;
  uniform float uTime;
  uniform float uFlow;         // 0 under reduced motion
  uniform vec4 uNodes[5];      // xyz position, w activation 0..1
  varying float vAlpha;
  void main() {
    // Each pathway grows at its own pace, from its start toward its end.
    float span = 0.09 + 0.09 * aSeed;
    float head = clamp((uProgress - aStage) / span, 0.0, 1.0);
    float drawn = (1.0 - smoothstep(head - 0.06, head, aAlong)) * step(0.0001, head);

    // The freshly grown tip glows for a moment, then the line settles quietly.
    float lead = smoothstep(head - 0.25, head, aAlong) * (1.0 - smoothstep(0.85, 1.0, head));

    // Lines taper at both ends and are never evenly bright along their length.
    float taper = smoothstep(0.0, 0.07, aAlong) * (1.0 - smoothstep(0.93, 1.0, aAlong));
    float irregular = 0.45 + 0.55 * (0.5 + 0.5 * sin(aAlong * (7.0 + 9.0 * aSeed) + aSeed * 40.0));

    // A very slow breath of light travelling along the line.
    float flow = pow(0.5 + 0.5 * sin(6.28318 * (aAlong * 2.0 - uTime * 0.035 * (0.6 + aSeed))), 6.0) * uFlow;

    // Light gathers softly around whichever node is active.
    float boost = 0.0;
    for (int i = 0; i < 5; i++) {
      vec3 d = position - uNodes[i].xyz;
      boost += uNodes[i].w * exp(-dot(d, d) / 0.05);
    }

    // The whole system gains presence as the theory is revealed.
    float presence = 0.95 + 0.6 * uProgress;
    vAlpha = drawn * taper * aWeight * presence * (0.52 * irregular + 0.2 * flow + 0.7 * lead + 0.8 * boost);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const networkFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColor, clamp(vAlpha, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`;
