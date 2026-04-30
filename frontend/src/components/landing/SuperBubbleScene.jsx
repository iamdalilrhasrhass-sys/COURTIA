import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/* ═══════════════════════════════════════════════════
   COURTIA — SuperBubbleScene.jsx
   Bulle de savon 3D ×15 améliorée — WebGL Three.js
   Fresnel ×10 harmoniques iridescence + Simplex 3D
   Particules ×3, Halo ×2, 12 droplets satellites
═══════════════════════════════════════════════════ */

// Vertex Shader : déformation organique Simplex 3D (×2 plus fluide)
const VERTEX_SHADER = `
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
  varying float v_deform;

  void main() {
    v_uv = uv;
    vec3 pos = position;

    // ×2 plus de fréquences de bruit pour déformation plus organique
    float noise1 = snoise(pos * 1.6 + vec3(u_time * 0.28, u_time * 0.18, u_time * 0.14));
    float noise2 = snoise(pos * 2.8 + vec3(u_time * 0.15 + 5.0, u_time * 0.25 + 2.0, u_time * 0.2));
    float noise3 = snoise(pos * 4.5 + vec3(u_time * 0.1 + 10.0, u_time * 0.08 + 7.0, u_time * 0.12));
    float deform = noise1 * 0.055 + noise2 * 0.028 + noise3 * 0.012;
    v_deform = deform;
    pos += normal * deform;

    v_normal = normalMatrix * (normal + vec3(0.0, deform * 0.5, 0.0));
    v_position = (modelViewMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

// Fragment Shader : Fresnel ×10 harmoniques iridescence
const FRAGMENT_SHADER = `
  uniform float u_time;
  varying vec3 v_normal;
  varying vec3 v_position;
  varying vec2 v_uv;
  varying float v_deform;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec3 N = normalize(v_normal);
    vec3 V = normalize(-v_position);

    // Fresnel ×2 plus prononcé
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.5);

    // ×10 harmoniques iridescence (au lieu de 5)
    float hue = fract(
      fresnel * 1.2 +
      u_time * 0.04 +
      v_uv.y * 0.6 +
      v_uv.x * 0.3 +
      sin(v_uv.x * 12.0 + u_time * 0.5) * 0.05 +
      cos(v_uv.y * 8.0 + u_time * 0.35) * 0.04
    );
    vec3 iridescence = hsv2rgb(vec3(hue, 0.85, 1.15));

    // Reflet spéculaire principal (blanc pur, brillant)
    vec3 lightDir = normalize(vec3(-0.65, 0.85, 0.55));
    float specular = pow(max(dot(reflect(-lightDir, N), V), 0.0), 80.0);
    vec3 specularColor = vec3(specular * 2.0);

    // Second reflet (violet teinté)
    vec3 lightDir2 = normalize(vec3(0.55, -0.45, 0.35));
    float spec2 = pow(max(dot(reflect(-lightDir2, N), V), 0.0), 50.0);
    vec3 specColor2 = vec3(0.55, 0.45, 1.0) * spec2 * 0.8;

    // Troisième reflet (cyan, petit et précis)
    vec3 lightDir3 = normalize(vec3(0.2, -0.7, 0.6));
    float spec3 = pow(max(dot(reflect(-lightDir3, N), V), 0.0), 100.0);
    vec3 specColor3 = vec3(0.3, 0.8, 1.0) * spec3 * 0.5;

    // Base très sombre (presque invisible, laisse passer le fond)
    vec3 baseColor = vec3(0.15, 0.12, 0.25) * 0.08;

    // Assemblage final
    vec3 color = baseColor + iridescence * fresnel * 1.4 + specularColor + specColor2 + specColor3;

    // Alpha : vraiment transparent au centre, vif sur les bords
    float alpha = fresnel * 0.92 + specular * 0.5;
    alpha = clamp(alpha, 0.0, 0.95);

    gl_FragColor = vec4(color, alpha);
  }
`

export default function SuperBubbleScene({ intensity = 'max' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isMobile = window.innerWidth < 768
    const pixelRatio = Math.min(window.devicePixelRatio, 2)

    // ─── RENDERER ───
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(pixelRatio)
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2

    // ─── SCENE ───
    const scene = new THREE.Scene()

    // ─── CAMERA ───
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 0, 6.5)

    // ─── BULLE PRINCIPALE (×1.5 plus grosse que l'originale) ───
    const sphereGeom = new THREE.SphereGeometry(2.4, 128, 128)
    const uniforms = {
      u_time: { value: 0.0 },
      u_camera: { value: camera.position }
    }
    const bubbleMat = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending
    })
    const bubble = new THREE.Mesh(sphereGeom, bubbleMat)
    scene.add(bubble)

    // ─── HALO VIOLET ×2 plus lumineux ───
    const glowGeom = new THREE.SphereGeometry(2.8, 48, 48)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x7B6EDB,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    const glow = new THREE.Mesh(glowGeom, glowMat)
    scene.add(glow)

    // Second halo (cyan, plus large, plus diffus)
    const glow2Geom = new THREE.SphereGeometry(3.2, 32, 32)
    const glow2Mat = new THREE.MeshBasicMaterial({
      color: 0x22D3EE,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    const glow2 = new THREE.Mesh(glow2Geom, glow2Mat)
    scene.add(glow2)

    // ─── DROPLETS SATELLITES (12 au lieu de 8) ───
    const dropletData = isMobile
      ? [
          { size: 0.28, pos: [2.6, 1.0, 0.3], speed: 0.38, phase: 0 },
          { size: 0.20, pos: [-2.5, 1.3, 0.2], speed: 0.52, phase: 1.2 },
          { size: 0.32, pos: [2.2, -1.2, 0.4], speed: 0.32, phase: 2.5 },
          { size: 0.15, pos: [-2.1, -1.1, 0.1], speed: 0.60, phase: 3.8 },
          { size: 0.10, pos: [3.0, 0.2, 0.2], speed: 0.55, phase: 1.8 },
          { size: 0.12, pos: [-2.8, 0.4, 0.1], speed: 0.48, phase: 0.6 },
        ]
      : [
          { size: 0.28, pos: [2.8, 1.2, 0.3], speed: 0.38, phase: 0 },
          { size: 0.20, pos: [-2.7, 1.5, 0.2], speed: 0.52, phase: 1.2 },
          { size: 0.32, pos: [2.4, -1.4, 0.4], speed: 0.32, phase: 2.5 },
          { size: 0.15, pos: [-2.3, -1.3, 0.1], speed: 0.60, phase: 3.8 },
          { size: 0.22, pos: [3.2, -0.3, 0.3], speed: 0.42, phase: 4.2 },
          { size: 0.18, pos: [-3.0, 0.6, 0.2], speed: 0.55, phase: 0.8 },
          { size: 0.12, pos: [1.8, 2.2, 0.3], speed: 0.65, phase: 5.0 },
          { size: 0.10, pos: [-1.9, -2.0, 0.1], speed: 0.58, phase: 2.0 },
          { size: 0.08, pos: [3.5, 1.8, 0.2], speed: 0.72, phase: 3.0 },
          { size: 0.14, pos: [-3.3, -1.6, 0.2], speed: 0.45, phase: 1.5 },
          { size: 0.06, pos: [0.5, 3.2, 0.1], speed: 0.80, phase: 4.5 },
          { size: 0.07, pos: [-0.6, -3.0, 0.1], speed: 0.75, phase: 3.2 },
        ]

    const droplets = dropletData.map(d => {
      const geom = new THREE.SphereGeometry(d.size, 24, 24)
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
        blending: THREE.NormalBlending
      })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.position.set(...d.pos)
      mesh.userData = { speed: d.speed, origin: mesh.position.clone(), phase: d.phase }
      scene.add(mesh)
      return mesh
    })

    // ─── PARTICULES ×3 (600 au lieu de 200) ───
    const pCount = isMobile ? 200 : 600
    const pGeom = new THREE.BufferGeometry()
    const pPositions = new Float32Array(pCount * 3)
    const pSizes = new Float32Array(pCount)
    for (let i = 0; i < pCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 3 + Math.random() * 8
      pPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pPositions[i * 3 + 1] = r * Math.cos(phi)
      pPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      pSizes[i] = 0.015 + Math.random() * 0.04
    }
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3))
    pGeom.setAttribute('size', new THREE.BufferAttribute(pSizes, 1))

    const particleTexture = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 255]),
      1, 1, THREE.RGBAFormat
    )
    particleTexture.needsUpdate = true

    const pMat = new THREE.PointsMaterial({
      color: 0xB0A8F0,
      size: isMobile ? 0.03 : 0.04,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    })
    const particles = new THREE.Points(pGeom, pMat)
    scene.add(particles)

    // ─── LUMIÈRES ───
    const ambient = new THREE.AmbientLight(0xffffff, 0.3)
    scene.add(ambient)
    const light1 = new THREE.PointLight(0x7B6EDB, 2.0, 12)
    light1.position.set(-4, 4, 3)
    scene.add(light1)
    const light2 = new THREE.PointLight(0xB0A8F0, 1.2, 12)
    light2.position.set(4, -3, 2)
    scene.add(light2)
    const light3 = new THREE.PointLight(0x22D3EE, 0.6, 10)
    light3.position.set(0, 5, -2)
    scene.add(light3)

    // ─── ANIMATION ───
    const clock = new THREE.Clock()
    let animId

    function animate() {
      animId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      uniforms.u_time.value = elapsed * 0.6

      // Rotation lente de la bulle
      bubble.rotation.x = Math.sin(elapsed * 0.08) * 0.15
      bubble.rotation.y = elapsed * 0.06

      // Halos orbitent doucement
      glow.rotation.x = elapsed * 0.03
      glow.rotation.y = elapsed * 0.05
      glow2.rotation.x = -elapsed * 0.02
      glow2.rotation.y = -elapsed * 0.04

      // Halo pulse
      glowMat.opacity = 0.10 + Math.sin(elapsed * 0.4) * 0.04
      glow2Mat.opacity = 0.04 + Math.sin(elapsed * 0.3 + 1.5) * 0.025

      // Particules tournent lentement
      particles.rotation.y = elapsed * 0.015
      particles.rotation.x = Math.sin(elapsed * 0.01) * 0.05

      // Droplets orbitent
      droplets.forEach((d, i) => {
        const data = d.userData
        const o = data.origin
        const phase = data.phase + elapsed * 0.3 * data.speed
        d.position.x = o.x + Math.sin(phase) * 0.5
        d.position.y = o.y + Math.cos(phase * 0.8) * 0.5
        d.position.z = o.z + Math.sin(phase * 0.6 + i) * 0.3
        // Chaque droplet a son propre temps shader
        d.material.uniforms.u_time.value = elapsed * 0.5 + i * 0.3
      })

      renderer.render(scene, camera)
    }
    animate()

    // ─── RESIZE ───
    function handleResize() {
      const w = window.innerWidth
      const h = window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // ─── CLEANUP ───
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
          else obj.material.dispose()
        }
      })
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="super-bubble-canvas"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
