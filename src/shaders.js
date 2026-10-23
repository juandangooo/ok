export const vertexShader = /* glsl */ `
  precision mediump float;

  attribute vec3 aVertexPosition;
  attribute vec2 aTextureCoord;

  uniform mat4 uMVMatrix;
  uniform mat4 uPMatrix;

  uniform float uTime;
  uniform float uHover;
  uniform vec2 uMouse;

  varying vec2 vUv;
  varying vec2 vPos;
  varying float vLift;

  void main() {
    vec3 pos = aVertexPosition;

    // slow ambient cloth sway so the wallpaper is alive even when idle
    float idle = sin(pos.x * 2.5 + uTime * 0.6) * 0.018
               + sin(pos.y * 3.0 + uTime * 0.45) * 0.018;

    // ripple + bulge radiating from the cursor, faded in by hover
    float d = distance(pos.xy, uMouse);
    float falloff = exp(-d * 2.8);
    float ripple = sin(d * 14.0 - uTime * 4.0) * falloff;
    float bulge = exp(-d * d * 6.0);

    pos.z += idle + (ripple * 0.08 + bulge * 0.12) * uHover;

    vUv = aTextureCoord;
    vPos = aVertexPosition.xy;
    vLift = ripple * uHover;

    gl_Position = uPMatrix * uMVMatrix * vec4(pos, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision mediump float;

  uniform float uTime;
  uniform float uHover;
  uniform vec2 uMouse;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying vec2 vUv;
  varying vec2 vPos;
  varying float vLift;

  void main() {
    float flow = vUv.y + 0.12 * sin(vUv.x * 4.0 + uTime * 0.3);
    vec3 color = mix(uColorA, uColorB, clamp(flow, 0.0, 1.0));

    // folds catch light along the ripple crests
    color += vLift * 0.18;

    // soft spotlight under the cursor
    float glow = exp(-distance(vPos, uMouse) * 3.2) * uHover;
    color += glow * 0.28;

    // gentle vignette toward the plane edges
    vec2 e = smoothstep(0.0, 0.08, vUv) * smoothstep(0.0, 0.08, 1.0 - vUv);
    color *= 0.75 + 0.25 * e.x * e.y;

    gl_FragColor = vec4(color, 1.0);
  }
`;
