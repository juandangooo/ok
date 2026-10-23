export const vertexShader = /* glsl */ `
  precision mediump float;

  attribute vec3 aVertexPosition;
  attribute vec2 aTextureCoord;

  uniform mat4 uMVMatrix;
  uniform mat4 uPMatrix;
  uniform mat4 uTextureMatrix;

  varying vec2 vUv;
  varying vec2 vTextureCoord;

  void main() {
    vUv = aTextureCoord;
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
  }
`;

// The wallpaper is drawn untouched; the ripple only refracts it near the
// cursor, scaled by uHover (which rises while the mouse moves, then settles).
export const fragmentShader = /* glsl */ `
  precision mediump float;

  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uHover;
  uniform float uAspect;
  uniform vec2 uMouse;

  varying vec2 vUv;
  varying vec2 vTextureCoord;

  void main() {
    vec2 diff = vUv - (uMouse * 0.5 + 0.5);
    diff.x *= uAspect;
    float d = length(diff);

    float wave = sin(d * 55.0 - uTime * 6.0) * exp(-d * 8.0) * uHover;
    vec2 dir = d > 0.0 ? diff / d : vec2(0.0);
    dir.x /= uAspect;

    vec4 color = texture2D(uTexture, vTextureCoord + dir * wave * 0.012);
    color.rgb += wave * 0.05;

    gl_FragColor = color;
  }
`;
