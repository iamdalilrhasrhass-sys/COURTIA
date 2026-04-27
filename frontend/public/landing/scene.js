import * as THREE from 'three';

/**
 * Initialise la scène Three.js avec une grosse bulle de savon irisée,
 * des petites bulles satellites, des particules et un éclairage coloré.
 *
 * @param {string} containerId - L'id de l'élément DOM conteneur
 * @returns {{ update: (deltaTime: number, mouseX: number, mouseY: number) => void, resize: () => void }}
 */
export function initScene(containerId) {
    // ──────────────────────────────────────────────
    // 1. INITIALISATION
    // ──────────────────────────────────────────────
    const container = document.getElementById(containerId);
    if (!container) {
        throw new Error(`Conteneur #${containerId} introuvable.`);
    }

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Scene + camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 50);
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0, 0);

    // ──────────────────────────────────────────────
    // 2. LUMIÈRES
    // ──────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    const pointLightViolet = new THREE.PointLight(0x8B5CF6, 3);
    pointLightViolet.position.set(-4, 2, 4);
    scene.add(pointLightViolet);

    const pointLightCyan = new THREE.PointLight(0x06B6D4, 3);
    pointLightCyan.position.set(3, -1, 3);
    scene.add(pointLightCyan);

    const pointLightRose = new THREE.PointLight(0xEC4899, 2);
    pointLightRose.position.set(-1, -2, 5);
    scene.add(pointLightRose);

    const pointLightOrange = new THREE.PointLight(0xF97316, 1);
    pointLightOrange.position.set(2, 3, 2);
    scene.add(pointLightOrange);

    // ──────────────────────────────────────────────
    // 3. SHADERS BULLE DE SAVON
    // ──────────────────────────────────────────────
    const bubbleVertexShader = /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying vec3 vWorldPosition;

        void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPos.xyz;
            vNormal = normalize(mat3(modelMatrix) * normal);
            vPosition = position;
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const bubbleFragmentShader = /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        uniform float uTime;

        void main() {
            // Direction de vue (de la surface vers la caméra)
            vec3 viewDir = normalize(cameraPosition - vWorldPosition);

            // Fresnel — fort sur les bords, faible au centre
            float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);
            fresnel = fresnel * 0.85 + 0.05; // léger boost

            // Ondulation du film liquide
            float wave = sin(vNormal.x * 12.0 + uTime * 0.6) * sin(vNormal.y * 10.0 + uTime * 0.7) * 0.08;
            wave += sin(vNormal.z * 8.0 + uTime * 0.5) * 0.05;
            fresnel += wave;

            // Couleurs irisées qui glissent avec le temps
            float hue1 = sin(vNormal.x * 3.0 + uTime * 0.3) * 0.5 + 0.5;
            float hue2 = sin(vNormal.y * 4.0 + uTime * 0.25) * 0.5 + 0.5;
            float hue3 = sin(vNormal.z * 5.0 + uTime * 0.35) * 0.5 + 0.5;

            // Palette irisée : violet, cyan, rose, orange, vert
            vec3 violet = vec3(0.545, 0.361, 0.965);  // #8B5CF6
            vec3 cyan = vec3(0.024, 0.714, 0.831);    // #06B6D4
            vec3 rose = vec3(0.925, 0.298, 0.600);    // #EC4899
            vec3 orange = vec3(0.976, 0.451, 0.086);  // #F97316
            vec3 vert = vec3(0.065, 0.725, 0.506);    // #10B981

            vec3 iridescent = mix(violet, cyan, hue1);
            iridescent = mix(iridescent, rose, hue2 * 0.5);
            iridescent = mix(iridescent, orange, hue3 * 0.3);
            iridescent = mix(iridescent, vert, sin(uTime * 0.2) * 0.5 + 0.5);

            // Centre laiteux subtil
            vec3 milky = vec3(0.95, 0.94, 0.98);
            vec3 finalColor = mix(milky, iridescent, fresnel);

            // Alpha : bord visible, centre quasi transparent + voile laiteux
            float alpha = fresnel * 0.70 + 0.04;
            alpha = clamp(alpha, 0.0, 1.0);

            gl_FragColor = vec4(finalColor, alpha);
        }
    `;

    // Matériau shader pour la membrane irisée
    const bubbleShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: bubbleVertexShader,
        fragmentShader: bubbleFragmentShader,
        uniforms: {
            uTime: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
    });

    // ──────────────────────────────────────────────
    // 4. GROSSE BULLE — GROUPE PRINCIPAL
    // ──────────────────────────────────────────────
    const bubbleGroup = new THREE.Group();
    bubbleGroup.position.set(0.6, 0.1, 0);
    scene.add(bubbleGroup);

    // Couche 1 : membrane irisée (ShaderMaterial)
    const membraneGeometry = new THREE.SphereGeometry(1.55, 128, 128);
    const membrane = new THREE.Mesh(membraneGeometry, bubbleShaderMaterial);
    bubbleGroup.add(membrane);

    // Couche 2 : renfort verre (MeshPhysicalMaterial)
    const glassGeometry = new THREE.SphereGeometry(1.58, 128, 128);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xffffff),
        metalness: 0,
        roughness: 0.05,
        transparent: true,
        opacity: 0.10,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        ior: 1.33,
        reflectivity: 0.5,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
    const glassLayer = new THREE.Mesh(glassGeometry, glassMaterial);
    bubbleGroup.add(glassLayer);

    // Couche 3 : reflets blancs
    const reflectionPositions = [
        { pos: [1.8, 0.8, 1.0], opacity: 0.18 },
        { pos: [-1.5, -1.0, 0.8], opacity: 0.25 },
        { pos: [0.3, 1.6, 0.5], opacity: 0.12 },
    ];

    const reflectionGeometry = new THREE.PlaneGeometry(2.5, 1.2);
    reflectionPositions.forEach(({ pos, opacity }) => {
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const plane = new THREE.Mesh(reflectionGeometry, mat);
        plane.position.set(...pos);
        // Orienter les reflets vers l'extérieur
        plane.lookAt(new THREE.Vector3(...pos).multiplyScalar(2));
        bubbleGroup.add(plane);
    });

    // ──────────────────────────────────────────────
    // 5. PETITES BULLES (28)
    // ──────────────────────────────────────────────
    const smallBubbles = [];
    const smallBubbleCount = 28;

    for (let i = 0; i < smallBubbleCount; i++) {
        // Rayon aléatoire entre 0.06 et 0.28
        const radius = 0.06 + Math.random() * 0.22;
        const geo = new THREE.SphereGeometry(radius, 32, 32);

        // Cloner le matériau shader pour chaque petite bulle (chaque instance a son propre uTime potentiellement)
        const mat = bubbleShaderMaterial.clone();

        const mesh = new THREE.Mesh(geo, mat);

        // Position aléatoire autour de la grosse bulle
        // Distance entre 1.0 et 5.5 (certaines proches : gouttelettes entre 1.0 et 2.0)
        const isDroplet = i < 10; // 10 premières = gouttelettes proches
        const distance = isDroplet
            ? 1.0 + Math.random() * 1.0   // 1.0 → 2.0
            : 2.0 + Math.random() * 3.5;  // 2.0 → 5.5

        // Direction aléatoire sur la sphère
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = distance * Math.sin(phi) * Math.cos(theta);
        const y = distance * Math.sin(phi) * Math.sin(theta);
        const z = distance * Math.cos(phi);

        mesh.position.set(x, y, z);

        // Propriétés d'animation
        mesh.userData = {
            floatSpeed: 0.3 + Math.random() * 0.9,    // 0.3 → 1.2
            floatAmplitude: 0.1 + Math.random() * 0.4, // 0.1 → 0.5
            rotSpeed: 0.1 + Math.random() * 0.4,       // 0.1 → 0.5
            initialY: y,
        };

        scene.add(mesh);
        smallBubbles.push(mesh);
    }

    // ──────────────────────────────────────────────
    // 6. PARTICULES (900)
    // ──────────────────────────────────────────────
    const particleCount = 900;
    const particlePositions = new Float32Array(particleCount * 3);
    const sphereRadius = 10;

    for (let i = 0; i < particleCount; i++) {
        // Distribution aléatoire dans une sphère de rayon 10
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = Math.pow(Math.random(), 1 / 3) * sphereRadius; // distribution uniforme dans le volume

        particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        particlePositions[i * 3 + 2] = radius * Math.cos(phi);
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.PointsMaterial({
        color: 0xaaaaff,
        size: 0.02,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // ──────────────────────────────────────────────
    // 7. ANIMATION
    // ──────────────────────────────────────────────
    let totalTime = 0;

    function update(deltaTime, mouseX, mouseY) {
        totalTime += deltaTime;

        // Mise à jour du temps dans le shader
        bubbleShaderMaterial.uniforms.uTime.value = totalTime;

        // Mise à jour des clones de matériaux des petites bulles
        for (const b of smallBubbles) {
            if (b.material.uniforms && b.material.uniforms.uTime) {
                b.material.uniforms.uTime.value = totalTime;
            }
        }

        // Grosse bulle : rotation lente + flottement vertical
        bubbleGroup.rotation.y += deltaTime * 0.12;
        bubbleGroup.position.y = 0.1 + Math.sin(totalTime * 0.4) * 0.1;

        // Petites bulles : flottement + rotation
        for (const b of smallBubbles) {
            const ud = b.userData;
            b.position.y = ud.initialY + Math.sin(totalTime * ud.floatSpeed) * ud.floatAmplitude;
            b.rotation.y += ud.rotSpeed * deltaTime;
        }

        // Particules : rotation lente
        particles.rotation.y += deltaTime * 0.025;
        particles.rotation.x += deltaTime * 0.015;

        // Caméra : parallaxe fluide selon la souris
        const targetX = mouseX * 0.4;
        const targetY = mouseY * 0.3;
        camera.position.x += (targetX - camera.position.x) * 0.03;
        camera.position.y += (targetY - camera.position.y) * 0.03;
        camera.lookAt(0, 0, 0);

        // Rendu
        renderer.render(scene, camera);
    }

    // ──────────────────────────────────────────────
    // 8. RESIZE
    // ──────────────────────────────────────────────
    function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    // ──────────────────────────────────────────────
    // 9. RETOUR
    // ──────────────────────────────────────────────
    return { update, resize };
}
