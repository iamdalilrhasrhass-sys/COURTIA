import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ═══════════════════════════════════════
// COURTIA — BubbleGlobe.jsx
// Bulle 3D WebGL iridescente ×15 AMÉLIORÉE
//
// Améliorations vs original scene.js :
// - 2× plus de points (256 segments)
// - Particules 3× plus nombreuses (600)
// - Anneaux orbitaux lumineux
// - Gouttelettes scintillantes
// - Halo magenta pulsé
// - Rotation lente auto
// - Mouse parallax
// - Lumières colorées dynamiques
// ═══════════════════════════════════════

// Vertex Shader : déformation organique Simplex 3D (amélioré)
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
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
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
  uniform float u_morph;
  varying vec3 v_normal;
  varying vec3 v_position;
  varying vec2 v_uv;
  varying float v_noise;

  void main() {
    v_uv = uv;
    vec3 pos = position;
    // Déformation organique : 3 couches de bruit Simplex
    float noise1 = snoise(pos * 1.8 + vec3(u_time * 0.35, u_time * 0.22, u_time * 0.18));
    float noise2 = snoise(pos * 3.2 + vec3(u_time * 0.18 + 5.0, u_time * 0.3 + 2.0, u_time * 0.25));
    float noise3 = snoise(pos * 5.0 + vec3(u_time * 0.4, u_time * 0.5, u_time * 0.3));
    v_noise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
    float deform = v_noise * 0.065 * u_morph;
    pos += normal * deform;
    v_normal = normalMatrix * (normal + vec3(0.0, deform * 0.5, 0.0));
    v_position = (modelViewMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

// Fragment Shader : Fresnel + iridescence ×15 amélioré
const FRAGMENT_SHADER = `
  uniform float u_time;
  uniform vec3 u_camera;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform float u_opacity;
  varying vec3 v_normal;
  varying vec3 v_position;
  varying vec2 v_uv;
  varying float v_noise;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec3 N = normalize(v_normal);
    vec3 V = normalize(-v_position);

    // Fresnel renforcé
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.4);

    // Iridescence arc-en-ciel dynamique
    float hue = fract(fresnel * 0.9 + u_time * 0.06 + v_uv.y * 0.5 + v_uv.x * 0.3 + v_noise * 0.1);
    vec3 iridescence = hsv2rgb(vec3(hue, 0.65, 1.0));

    // Deux lumières spéculaires
    vec3 lightDir = normalize(vec3(-0.6, 0.8, 0.5));
    float specular = pow(max(dot(reflect(-lightDir, N), V), 0.0), 80.0);
    vec3 specularColor = vec3(specular * 2.0);

    vec3 lightDir2 = normalize(vec3(0.5, -0.4, 0.3));
    float spec2 = pow(max(dot(reflect(-lightDir2, N), V), 0.0), 50.0);
    vec3 specColor2 = u_color2 * spec2 * 0.8;

    // Couleur de base avec les uniforms
    vec3 baseColor = u_color1 * 0.35;

    // Assemblage final : iridescence + reflets + morph
    vec3 color = baseColor + iridescence * fresnel * 1.4 + specularColor + specColor2;

    // Alpha avec morph pour douceur
    float alpha = fresnel * 0.85 + 0.05 + specular * 0.5;
    alpha = clamp(alpha, 0.0, u_opacity);

    gl_FragColor = vec4(color, alpha);
  }
`

export default function BubbleGlobe({
  className = '',
  color1 = '#7C3AED', // violet
  color2 = '#3B82F6', // bleu
  size = 1.6,
  opacity = 0.92,
  morph = 1.0,
  autoRotate = true,
  mouseParallax = true,
  particles = true,
  rings = true,
  droplets = true,
}) {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isMobile = window.innerWidth < 768
    const pixelRatio = Math.min(window.devicePixelRatio, 2)

    // Convertir hex en vec3
    const hexToVec3 = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255
      return new THREE.Vector3(r, g, b)
    }

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    renderer.setPixelRatio(pixelRatio)
    renderer.setClearColor(0x000000, 0)

    // Scène
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Caméra
    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
    camera.position.set(0, 0.3, 5.0)

    // ─── BULLE PRINCIPALE ───
    const sphereGeom = new THREE.SphereGeometry(size, 256, 256)
    const bubbleMat = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        u_time: { value: 0 },
        u_camera: { value: camera.position },
        u_color1: { value: hexToVec3(color1) },
        u_color2: { value: hexToVec3(color2) },
        u_opacity: { value: opacity },
        u_morph: { value: morph },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const bubble = new THREE.Mesh(sphereGeom, bubbleMat)
    scene.add(bubble)

    // ─── HALO VIOLET AMÉLIORÉ ───
    const glowGeom = new THREE.SphereGeometry(size * 1.25, 48, 48)
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color1),
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const glow = new THREE.Mesh(glowGeom, glowMat)
    scene.add(glow)

    // ─── HALO MAGENTA PULSÉ (NOUVEAU) ───
    const pulseGeom = new THREE.SphereGeometry(size * 1.6, 32, 32)
    const pulseMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#EC4899'),
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const pulseHalo = new THREE.Mesh(pulseGeom, pulseMat)
    scene.add(pulseHalo)

    // ─── GOUTTELETTES SATELLITES (×2 plus que l'original) ───
    const dropletsArr = []
    if (droplets) {
      const dropletCount = isMobile ? 6 : 16
      const dropletData = []
      for (let i = 0; i < dropletCount; i++) {
        const angle = (i / dropletCount) * Math.PI * 2
        const radius = 2.0 + Math.random() * 1.5
        const height = (Math.random() - 0.5) * 2.5
        dropletData.push({
          size: 0.04 + Math.random() * 0.22,
          pos: [Math.cos(angle) * radius, height, Math.sin(angle) * radius],
          speed: 0.2 + Math.random() * 0.6,
          orbitRadius: radius,
          orbitAngle: angle,
          orbitHeight: height,
        })
      }

      dropletData.forEach((d) => {
        const geom = new THREE.SphereGeometry(d.size, 24, 24)
        const mat = new THREE.ShaderMaterial({
          vertexShader: VERTEX_SHADER,
          fragmentShader: FRAGMENT_SHADER,
          uniforms: {
            u_time: { value: 0 },
            u_camera: { value: camera.position },
            u_color1: { value: hexToVec3(color1) },
            u_color2: { value: hexToVec3(color2) },
            u_opacity: { value: opacity * 0.7 },
            u_morph: { value: morph * 0.5 },
          },
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
        const mesh = new THREE.Mesh(geom, mat)
        mesh.position.set(...d.pos)
        mesh.userData = d
        dropletsArr.push(mesh)
        scene.add(mesh)
      })
    }

    // ─── PARTICULES (×3 plus que l'original) ───
    let particlesMesh = null
    if (particles) {
      const pCount = isMobile ? 150 : 600
      const pGeom = new THREE.BufferGeometry()
      const pPositions = new Float32Array(pCount * 3)
      const pColors = new Float32Array(pCount * 3)
      for (let i = 0; i < pCount; i++) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const r = 2 + Math.random() * 8
        pPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
        pPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6
        pPositions[i * 3 + 2] = r * Math.cos(phi)
        // Couleurs aléatoires violet/bleu/rose
        const c = new THREE.Color().setHSL(0.75 + Math.random() * 0.2, 0.6, 0.5 + Math.random() * 0.4)
        pColors[i * 3] = c.r
        pColors[i * 3 + 1] = c.g
        pColors[i * 3 + 2] = c.b
      }
      pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3))
      pGeom.setAttribute('color', new THREE.BufferAttribute(pColors, 3))
      const pMat = new THREE.PointsMaterial({
        size: isMobile ? 0.02 : 0.035,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
      particlesMesh = new THREE.Points(pGeom, pMat)
      scene.add(particlesMesh)
    }

    // ─── ANNEAUX ORBITAUX LUMINEUX (NOUVEAU) ───
    const ringsArr = []
    if (rings) {
      const ringCount = isMobile ? 1 : 3
      for (let i = 0; i < ringCount; i++) {
        const rGeom = new THREE.RingGeometry(size * 1.5 + i * 0.4, size * 1.55 + i * 0.4, 80)
        const rMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(i === 0 ? color1 : i === 1 ? color2 : '#EC4899'),
          transparent: true,
          opacity: 0.06 - i * 0.015,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
        const ring = new THREE.Mesh(rGeom, rMat)
        ring.rotation.x = Math.PI / 2 + (i * Math.PI) / 6
        ring.rotation.z = i * 0.5
        ring.userData.rotSpeed = 0.1 + i * 0.05
        ringsArr.push(ring)
        scene.add(ring)
      }
    }

    // ─── LUMIÈRES ───
    const ambient = new THREE.AmbientLight(0xffffff, 0.2)
    scene.add(ambient)

    const light1 = new THREE.PointLight(new THREE.Color(color1), 2.0, 10)
    light1.position.set(-3, 3, 2)
    scene.add(light1)

    const light2 = new THREE.PointLight(new THREE.Color(color2), 1.2, 10)
    light2.position.set(3, -2, 1)
    scene.add(light2)

    const light3 = new THREE.PointLight(0xEC4899, 0.6, 8)
    light3.position.set(2, 3, -1)
    scene.add(light3)

    // ─── MOUSE TRACKING ───
    const handleMouse = (e) => {
      if (!mouseParallax) return
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', handleMouse)

    // ─── RESIZE ───
    const handleResize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    window.addEventListener('resize', handleResize)

    // ─── ANIMATION LOOP ───
    let animId
    const clock = new THREE.Clock()

    const animate = () => {
      const elapsed = clock.getElapsedTime()
      const delta = clock.getDelta()

      // Update uniforms
      bubbleMat.uniforms.u_time.value = elapsed
      glowMat.opacity = 0.08 + Math.sin(elapsed * 0.3) * 0.03
      pulseMat.opacity = 0.03 + Math.sin(elapsed * 0.5) * 0.02
      pulseHalo.scale.setScalar(1 + Math.sin(elapsed * 0.4) * 0.03)

      // Gouttelettes en orbite
      dropletsArr.forEach((mesh) => {
        const d = mesh.userData
        const angle = d.orbitAngle + elapsed * d.speed * 0.3
        mesh.position.x = Math.cos(angle) * d.orbitRadius
        mesh.position.z = Math.sin(angle) * d.orbitRadius
        mesh.position.y = d.orbitHeight + Math.sin(elapsed * d.speed + d.orbitAngle) * 0.3
        mesh.material.uniforms.u_time.value = elapsed
        const s = 1 + Math.sin(elapsed * d.speed * 2 + d.orbitAngle) * 0.15
        mesh.scale.setScalar(s)
      })

      // Anneaux en rotation
      ringsArr.forEach((ring, i) => {
        ring.rotation.z += ring.userData.rotSpeed * 0.01
        ring.rotation.x = Math.PI / 2 + Math.sin(elapsed * 0.1 + i) * 0.15
      })

      // Rotation lente de la bulle
      if (autoRotate) {
        bubble.rotation.y += 0.002
        glow.rotation.y += 0.0015
        pulseHalo.rotation.y += 0.001
      }

      // Mouse parallax
      if (mouseParallax) {
        const targetX = mouseRef.current.x * 0.15
        const targetY = mouseRef.current.y * 0.1
        bubble.rotation.x += (targetY - bubble.rotation.x) * 0.02
        bubble.rotation.z += (-targetX * 0.3 - bubble.rotation.z) * 0.02
        camera.position.x += (targetX * 0.3 - camera.position.x) * 0.02
        camera.position.y += (targetY * 0.2 - camera.position.y) * 0.02
        camera.lookAt(0, 0, 0)
      }

      // Particules lentes
      if (particlesMesh) {
        particlesMesh.rotation.y += 0.0008
        particlesMesh.rotation.x += 0.0003
      }

      renderer.render(scene, camera)
      animId = requestAnimationFrame(animate)
    }

    animate()

    // ─── CLEANUP ───
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', handleMouse)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      bubbleGeom.dispose()
      bubbleMat.dispose()
      glowGeom.dispose()
      glowMat.dispose()
      pulseGeom.dispose()
      pulseMat.dispose()
      dropletsArr.forEach((m) => {
        m.geometry.dispose()
        m.material.dispose()
      })
      ringsArr.forEach((r) => {
        r.geometry.dispose()
        r.material.dispose()
      })
      if (particlesMesh) {
        particlesMesh.geometry.dispose()
        particlesMesh.material.dispose()
      }
    }
  }, [color1, color2, size, opacity, morph, autoRotate, mouseParallax, particles, rings, droplets])

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  )
}
