/* ═══════════════════════════════════════
   COURTIA — scene.js
   Bulle de savon 3D WebGL avec Three.js r128
   Fresnel + iridescence arc-en-ciel
═══════════════════════════════════════ */

// Vertex Shader : déformation organique avec Simplex 3D
const VERTEX_SHADER = `
  // Bruit Simplex 3D (implémentation compacte)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
      i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
      i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  uniform float u_time;
  varying vec3 v_normal;
  varying vec3 v_position;
  varying vec2 v_uv;

  void main() {
    v_uv = uv;
    vec3 pos = position;
    // Déformation organique : bruit Simplex 3D + temps
    float noise1 = snoise(pos * 1.8 + vec3(u_time * 0.35, u_time * 0.22, u_time * 0.18));
    float noise2 = snoise(pos * 3.2 + vec3(u_time * 0.18 + 5.0, u_time * 0.3 + 2.0, u_time * 0.25));
    float deform = noise1 * 0.045 + noise2 * 0.022;
    pos += normal * deform;
    v_normal = normalMatrix * (normal + vec3(0.0, deform * 0.5, 0.0));
    v_position = (modelViewMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Fragment Shader : Fresnel + iridescence arc-en-ciel
const FRAGMENT_SHADER = `
  uniform float u_time;
  uniform vec3 u_camera;
  varying vec3 v_normal;
  varying vec3 v_position;
  varying vec2 v_uv;

  // Conversion HSV → RGB
  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec3 N = normalize(v_normal);
    vec3 V = normalize(-v_position); // vue vers la caméra

    // Fresnel : bord plus réfléchissant
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.8);

    // Iridescence arc-en-ciel : teinte variant avec angle + temps
    float hue = fract(fresnel * 0.8 + u_time * 0.08 + v_uv.y * 0.4 + v_uv.x * 0.2);
    vec3 iridescence = hsv2rgb(vec3(hue, 0.7, 1.0));

    // Reflet blanc spéculaire en haut-gauche
    vec3 lightDir = normalize(vec3(-0.6, 0.8, 0.5));
    float specular = pow(max(dot(reflect(-lightDir, N), V), 0.0), 60.0);
    vec3 specularColor = vec3(specular * 1.5);

    // Reflet violet subtil bas-droite
    vec3 lightDir2 = normalize(vec3(0.5, -0.4, 0.3));
    float spec2 = pow(max(dot(reflect(-lightDir2, N), V), 0.0), 40.0);
    vec3 specColor2 = vec3(0.5, 0.4, 1.0) * spec2 * 0.6;

    // Couleur de base de la bulle : transparent avec teinte violet
    vec3 baseColor = vec3(0.3, 0.25, 0.6) * 0.3;

    // Assemblage final
    vec3 color = baseColor + iridescence * fresnel * 1.2 + specularColor + specColor2;

    // Alpha : transparent au centre, opaque sur les bords (Fresnel)
    float alpha = fresnel * 0.85 + 0.05 + specular * 0.4;
    alpha = clamp(alpha, 0.0, 0.95);

    gl_FragColor = vec4(color, alpha);
  }
`;

// ════════════════════════════════════════
// Création de la scène Three.js
// ════════════════════════════════════════

let scene, camera, renderer, bubble, bubbleMaterial;
let glow, droplets = [], particles;
const clock = new THREE.Clock();
const isMobile = window.innerWidth < 768;

function createScene() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  // === RENDERER ===
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  // === SCENE ===
  scene = new THREE.Scene();

  // === CAMERA ===
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 5.5);

  // === BULLE PRINCIPALE ===
  const bubbleGeom = new THREE.SphereGeometry(1.6, 128, 128);
  bubbleMaterial = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: {
      u_time: { value: 0.0 },
      u_camera: { value: camera.position }
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  bubble = new THREE.Mesh(bubbleGeom, bubbleMaterial);
  scene.add(bubble);

  // === GLOW (halo violet derrière) ===
  const glowGeom = new THREE.SphereGeometry(1.9, 32, 32);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x534AB7,
    transparent: true,
    opacity: 0.06,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  glow = new THREE.Mesh(glowGeom, glowMat);
  scene.add(glow);

  // === DROPLETS (8 petites bulles satellites) ===
  const dropletCount = isMobile ? 4 : 8;
  const dropletData = [
    { size: 0.22, pos: [2.1, 0.8, 0.2], speed: 0.42 },
    { size: 0.16, pos: [-2.0, 1.1, 0.1], speed: 0.58 },
    { size: 0.28, pos: [1.8, -1.0, 0.3], speed: 0.35 },
    { size: 0.12, pos: [-1.7, -0.9, 0.0], speed: 0.67 },
    { size: 0.19, pos: [2.5, 0.1, 0.2], speed: 0.48 },
    { size: 0.14, pos: [-2.3, 0.3, 0.1], speed: 0.55 },
    { size: 0.10, pos: [1.5, 1.6, 0.2], speed: 0.72 },
    { size: 0.08, pos: [-1.6, -1.5, 0.0], speed: 0.63 }
  ].slice(0, dropletCount);

  dropletData.forEach(d => {
    const geom = new THREE.SphereGeometry(d.size, 24, 24);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        u_time: { value: 0.0 },
        u_camera: { value: camera.position }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(...d.pos);
    mesh.userData.speed = d.speed;
    mesh.userData.origin = mesh.position.clone();
    droplets.push(mesh);
    scene.add(mesh);
  });

  // === PARTICULES (étoiles / poussière) ===
  const pCount = isMobile ? 90 : 200;
  const pGeom = new THREE.BufferGeometry();
  const pPositions = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount * 3; i++) {
    pPositions[i] = (Math.random() - 0.5) * 12;
  }
  pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0xAFA9EC,
    size: 0.025,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  particles = new THREE.Points(pGeom, pMat);
  scene.add(particles);

  // === LUMIÈRES ===
  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  const light1 = new THREE.PointLight(0x534AB7, 1.5, 10);
  light1.position.set(-3, 3, 2);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xAFA9EC, 0.8, 10);
  light2.position.set(3, -2, 1);
  scene.add(light2);
}

// Expose globally
window.courtiaScene = {
  get scene() { return scene; },
  get camera() { return camera; },
  get renderer() { return renderer; },
  get bubble() { return bubble; },
  get bubbleMaterial() { return bubbleMaterial; },
  get glow() { return glow; },
  get droplets() { return droplets; },
  get particles() { return particles; },
  get clock() { return clock; }
};

// Init dès que le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createScene);
} else {
  createScene();
}
