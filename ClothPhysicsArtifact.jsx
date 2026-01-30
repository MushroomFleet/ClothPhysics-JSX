import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const ClothDemo = () => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const clothSystemRef = useRef(null);
  const animationFrameRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const attachmentPointsRef = useRef([]);
  
  const [config, setConfig] = useState({
    gravity: 15,
    windStrength: 3,
    stiffness: 0.9,
    damping: 0.98,
    iterations: 8,
    showParticles: false,
    showConstraints: false,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d12);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 4);
    camera.lookAt(0, -0.5, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0x404050, 0.8));
    const keyLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x4466ff, 0.6);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    const shoulderGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0xff4488, emissive: 0xff2266, emissiveIntensity: 0.3 });
    
    const leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    const rightShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    leftShoulder.position.set(-0.4, 0.8, 0);
    rightShoulder.position.set(0.4, 0.8, 0);
    scene.add(leftShoulder);
    scene.add(rightShoulder);
    attachmentPointsRef.current = [leftShoulder, rightShoulder];

    // CLOTH SYSTEM
    const WIDTH = 0.8, HEIGHT = 1.2, SEGMENTS_X = 12, SEGMENTS_Y = 18;
    const particles = [];
    const constraints = [];
    
    class Particle {
      constructor(x, y, z, pinned = false) {
        this.position = new THREE.Vector3(x, y, z);
        this.previous = new THREE.Vector3(x, y, z);
        this.acceleration = new THREE.Vector3();
        this.pinned = pinned;
      }
      applyForce(force) {
        if (!this.pinned) this.acceleration.add(force);
      }
      update(damping) {
        if (this.pinned) return;
        const velocity = this.position.clone().sub(this.previous).multiplyScalar(damping);
        this.previous.copy(this.position);
        this.position.add(velocity).add(this.acceleration);
        this.acceleration.set(0, 0, 0);
      }
    }
    
    const spacingX = WIDTH / SEGMENTS_X, spacingY = HEIGHT / SEGMENTS_Y;
    
    for (let y = 0; y <= SEGMENTS_Y; y++) {
      for (let x = 0; x <= SEGMENTS_X; x++) {
        const isLeftPin = y === 0 && x <= 2;
        const isRightPin = y === 0 && x >= SEGMENTS_X - 2;
        particles.push(new Particle((x - SEGMENTS_X / 2) * spacingX, -y * spacingY, 0, isLeftPin || isRightPin));
      }
    }
    
    const getParticle = (x, y) => (x < 0 || x > SEGMENTS_X || y < 0 || y > SEGMENTS_Y) ? null : particles[y * (SEGMENTS_X + 1) + x];
    
    for (let y = 0; y <= SEGMENTS_Y; y++) {
      for (let x = 0; x <= SEGMENTS_X; x++) {
        const p = getParticle(x, y);
        const right = getParticle(x + 1, y), down = getParticle(x, y + 1);
        const diagDR = getParticle(x + 1, y + 1), diagDL = getParticle(x - 1, y + 1);
        const right2 = getParticle(x + 2, y), down2 = getParticle(x, y + 2);
        
        if (right) constraints.push({ p1: p, p2: right, restLength: spacingX, stiffness: 1.0 });
        if (down) constraints.push({ p1: p, p2: down, restLength: spacingY, stiffness: 1.0 });
        if (diagDR) constraints.push({ p1: p, p2: diagDR, restLength: Math.sqrt(spacingX * spacingX + spacingY * spacingY), stiffness: 0.8 });
        if (diagDL) constraints.push({ p1: p, p2: diagDL, restLength: Math.sqrt(spacingX * spacingX + spacingY * spacingY), stiffness: 0.8 });
        if (right2) constraints.push({ p1: p, p2: right2, restLength: spacingX * 2, stiffness: 0.5 });
        if (down2) constraints.push({ p1: p, p2: down2, restLength: spacingY * 2, stiffness: 0.5 });
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(particles.length * 3);
    const uvs = new Float32Array(particles.length * 2);
    
    for (let y = 0; y <= SEGMENTS_Y; y++) {
      for (let x = 0; x <= SEGMENTS_X; x++) {
        const idx = y * (SEGMENTS_X + 1) + x;
        uvs[idx * 2] = x / SEGMENTS_X;
        uvs[idx * 2 + 1] = 1 - y / SEGMENTS_Y;
      }
    }
    
    const indices = [];
    for (let y = 0; y < SEGMENTS_Y; y++) {
      for (let x = 0; x < SEGMENTS_X; x++) {
        const a = y * (SEGMENTS_X + 1) + x, b = a + 1, c = a + (SEGMENTS_X + 1), d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#8b0000');
    grad.addColorStop(0.3, '#6b0000');
    grad.addColorStop(0.7, '#4a0000');
    grad.addColorStop(1, '#2a0000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#ffd700';
    for (let i = 0; i < 256; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke(); }
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(0, 0, 256, 8);
    
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(canvas),
      side: THREE.DoubleSide,
      roughness: 0.7,
      metalness: 0.1,
    }));
    scene.add(mesh);
    
    // Debug visuals
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particles.length * 3), 3));
    const particlePoints = new THREE.Points(pointsGeo, new THREE.PointsMaterial({ color: 0x00ffff, size: 0.03 }));
    particlePoints.visible = false;
    scene.add(particlePoints);
    
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(constraints.length * 6), 3));
    const constraintLines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0xffff00, opacity: 0.3, transparent: true }));
    constraintLines.visible = false;
    scene.add(constraintLines);
    
    clothSystemRef.current = {
      particles, constraints, mesh, particlePoints, constraintLines,
      setDebugMode: (showP, showC) => { particlePoints.visible = showP; constraintLines.visible = showC; }
    };

    // Mouse interaction
    let isDragging = false, dragTarget = null;
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    const onMouseDown = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects([leftShoulder, rightShoulder]);
      if (intersects.length > 0) {
        isDragging = true;
        dragTarget = intersects[0].object;
        containerRef.current.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (isDragging && dragTarget) {
        const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5).unproject(camera);
        const dir = vector.sub(camera.position).normalize();
        const pos = camera.position.clone().add(dir.multiplyScalar(-camera.position.z / dir.z));
        dragTarget.position.x = Math.max(-1.5, Math.min(1.5, pos.x));
        dragTarget.position.y = Math.max(-0.5, Math.min(1.5, pos.y));
      }
    };

    const onMouseUp = () => { isDragging = false; dragTarget = null; containerRef.current.style.cursor = 'default'; };

    containerRef.current.addEventListener('mousedown', onMouseDown);
    containerRef.current.addEventListener('mousemove', onMouseMove);
    containerRef.current.addEventListener('mouseup', onMouseUp);
    containerRef.current.addEventListener('mouseleave', onMouseUp);

    // Animation
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const dt = Math.min(clockRef.current.getDelta(), 0.02);
      const time = clockRef.current.getElapsedTime();

      if (!isDragging) {
        const speed = 0.8, ampX = 0.15, ampY = 0.08;
        leftShoulder.position.x = -0.4 + Math.sin(time * speed) * ampX;
        leftShoulder.position.y = 0.8 + Math.sin(time * speed * 2) * ampY;
        rightShoulder.position.x = 0.4 + Math.sin(time * speed) * ampX;
        rightShoulder.position.y = 0.8 + Math.sin(time * speed * 2) * ampY;
      }

      // Physics update
      const cs = clothSystemRef.current;
      if (cs) {
        const subSteps = 3;
        for (let step = 0; step < subSteps; step++) {
          const subDt = dt / subSteps;
          const gravity = new THREE.Vector3(0, -config.gravity * subDt * subDt, 0);
          const windX = Math.sin(time * 2.3) * 0.5 + Math.sin(time * 5.1) * 0.2;
          const windZ = Math.cos(time * 1.7) * 0.8 + 1.0;
          const wind = new THREE.Vector3(windX * config.windStrength * subDt * subDt, Math.sin(time * 3) * config.windStrength * 0.1 * subDt * subDt, windZ * config.windStrength * subDt * subDt);

          cs.particles.forEach((p, i) => {
            if (p.pinned) {
              const col = i % (SEGMENTS_X + 1);
              if (col <= 2) p.position.lerpVectors(leftShoulder.position, rightShoulder.position, col / SEGMENTS_X);
              else if (col >= SEGMENTS_X - 2) p.position.lerpVectors(leftShoulder.position, rightShoulder.position, col / SEGMENTS_X);
              p.position.z = 0;
              return;
            }
            p.applyForce(gravity);
            p.applyForce(p.position.z < 0 ? wind.clone().multiplyScalar(0.3) : wind);
            p.update(config.damping);
          });

          for (let iter = 0; iter < config.iterations; iter++) {
            cs.constraints.forEach(c => {
              const diff = c.p2.position.clone().sub(c.p1.position);
              const dist = diff.length();
              if (dist === 0) return;
              const correction = diff.multiplyScalar((dist - c.restLength) / dist * config.stiffness * c.stiffness * 0.5);
              if (!c.p1.pinned && !c.p2.pinned) { c.p1.position.add(correction); c.p2.position.sub(correction); }
              else if (!c.p1.pinned) c.p1.position.add(correction.multiplyScalar(2));
              else if (!c.p2.pinned) c.p2.position.sub(correction.multiplyScalar(2));
            });
          }
        }

        const posAttr = cs.mesh.geometry.attributes.position;
        cs.particles.forEach((p, i) => posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z));
        posAttr.needsUpdate = true;
        cs.mesh.geometry.computeVertexNormals();

        if (cs.particlePoints.visible) {
          const ppAttr = cs.particlePoints.geometry.attributes.position;
          cs.particles.forEach((p, i) => ppAttr.setXYZ(i, p.position.x, p.position.y, p.position.z));
          ppAttr.needsUpdate = true;
        }
        if (cs.constraintLines.visible) {
          const clAttr = cs.constraintLines.geometry.attributes.position;
          cs.constraints.forEach((c, i) => {
            clAttr.setXYZ(i * 2, c.p1.position.x, c.p1.position.y, c.p1.position.z);
            clAttr.setXYZ(i * 2 + 1, c.p2.position.x, c.p2.position.y, c.p2.position.z);
          });
          clAttr.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    clothSystemRef.current?.setDebugMode(config.showParticles, config.showConstraints);
  }, [config.showParticles, config.showConstraints]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950">
      <div ref={containerRef} className="absolute inset-0" />
      
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <h1 className="text-xl font-light text-purple-100 tracking-[0.3em] uppercase">Cloth Physics</h1>
        <p className="text-xs text-purple-300/50 tracking-[0.2em] mt-1 uppercase">Drag pink spheres to move attachment points</p>
      </div>
      
      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-52 bg-slate-900/90 backdrop-blur border border-purple-500/20 rounded-lg p-3 space-y-3">
        <h2 className="text-xs text-purple-300/70 tracking-wider uppercase pb-2 border-b border-purple-500/20">Physics</h2>
        
        {[
          { label: 'Gravity', key: 'gravity', min: 0, max: 40, step: 1 },
          { label: 'Wind', key: 'windStrength', min: 0, max: 15, step: 0.5 },
          { label: 'Stiffness', key: 'stiffness', min: 0.3, max: 1, step: 0.05 },
          { label: 'Damping', key: 'damping', min: 0.9, max: 0.995, step: 0.005 },
          { label: 'Iterations', key: 'iterations', min: 1, max: 20, step: 1 },
        ].map(({ label, key, min, max, step }) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-purple-400/60 uppercase tracking-wider">{label}</span>
              <span className="text-xs text-purple-300">{typeof config[key] === 'number' && config[key] % 1 !== 0 ? config[key].toFixed(2) : config[key]}</span>
            </div>
            <input
              type="range" min={min} max={max} step={step}
              value={config[key]}
              onChange={(e) => setConfig(c => ({ ...c, [key]: parseFloat(e.target.value) }))}
              className="w-full h-1 rounded-full appearance-none bg-slate-700 cursor-pointer accent-purple-500"
            />
          </div>
        ))}
        
        <div className="pt-2 border-t border-purple-500/20 space-y-2">
          {['showParticles', 'showConstraints'].map(key => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={config[key]} onChange={(e) => setConfig(c => ({ ...c, [key]: e.target.checked }))} className="w-3 h-3 rounded accent-purple-500" />
              <span className="text-xs text-purple-400/60 uppercase tracking-wider">{key === 'showParticles' ? 'Particles' : 'Constraints'}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div className="absolute right-4 bottom-4 text-right pointer-events-none text-xs text-purple-400/40">
        <p>12×18 particle grid</p>
        <p>Verlet integration</p>
        <p>Structural + Shear + Bending</p>
      </div>
    </div>
  );
};

export default ClothDemo;
