import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

// ============================================================================
// CLOTH PHYSICS DEMONSTRATION - Video Game Cape
// Verlet integration with proper constraint solving
// ============================================================================

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

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d12);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 4);
    camera.lookAt(0, -0.5, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0x404050, 0.8));
    
    const keyLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    
    const rimLight = new THREE.DirectionalLight(0x4466ff, 0.6);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    // Attachment point visualization (shoulder markers)
    const shoulderGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const shoulderMat = new THREE.MeshStandardMaterial({ 
      color: 0xff4488, 
      emissive: 0xff2266,
      emissiveIntensity: 0.3 
    });
    
    const leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    const rightShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    leftShoulder.position.set(-0.4, 0.8, 0);
    rightShoulder.position.set(0.4, 0.8, 0);
    scene.add(leftShoulder);
    scene.add(rightShoulder);
    attachmentPointsRef.current = [leftShoulder, rightShoulder];

    // Initialize cloth system
    const clothSystem = createClothSystem(scene, config);
    clothSystemRef.current = clothSystem;

    // Mouse drag for shoulder movement
    let isDragging = false;
    let dragTarget = null;
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
        // Project mouse to 3D space at z=0
        const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
        vector.unproject(camera);
        const dir = vector.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        const pos = camera.position.clone().add(dir.multiplyScalar(distance));
        
        dragTarget.position.x = Math.max(-1.5, Math.min(1.5, pos.x));
        dragTarget.position.y = Math.max(-0.5, Math.min(1.5, pos.y));
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      dragTarget = null;
      containerRef.current.style.cursor = 'default';
    };

    containerRef.current.addEventListener('mousedown', onMouseDown);
    containerRef.current.addEventListener('mousemove', onMouseMove);
    containerRef.current.addEventListener('mouseup', onMouseUp);
    containerRef.current.addEventListener('mouseleave', onMouseUp);

    // Animation
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      const delta = Math.min(clockRef.current.getDelta(), 0.02);
      const time = clockRef.current.getElapsedTime();

      // Animate shoulders in a figure-8 pattern when not dragging
      if (!isDragging) {
        const speed = 0.8;
        const ampX = 0.15;
        const ampY = 0.08;
        
        leftShoulder.position.x = -0.4 + Math.sin(time * speed) * ampX;
        leftShoulder.position.y = 0.8 + Math.sin(time * speed * 2) * ampY;
        
        rightShoulder.position.x = 0.4 + Math.sin(time * speed) * ampX;
        rightShoulder.position.y = 0.8 + Math.sin(time * speed * 2) * ampY;
      }

      // Update cloth
      if (clothSystemRef.current) {
        clothSystemRef.current.update(
          delta,
          time,
          [leftShoulder.position, rightShoulder.position],
          config
        );
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update cloth config reactively
  useEffect(() => {
    if (clothSystemRef.current) {
      clothSystemRef.current.setDebugMode(config.showParticles, config.showConstraints);
    }
  }, [config.showParticles, config.showConstraints]);

  // Create cloth system
  function createClothSystem(scene, initialConfig) {
    // Cape dimensions - proportional for a character
    const WIDTH = 0.8;  // shoulder span
    const HEIGHT = 1.2; // cape length
    const SEGMENTS_X = 12;
    const SEGMENTS_Y = 18;
    
    const particles = [];
    const constraints = [];
    
    // Particle class
    class Particle {
      constructor(x, y, z, pinned = false) {
        this.position = new THREE.Vector3(x, y, z);
        this.previous = new THREE.Vector3(x, y, z);
        this.acceleration = new THREE.Vector3();
        this.pinned = pinned;
        this.mass = 1;
      }
      
      applyForce(force) {
        if (this.pinned) return;
        this.acceleration.add(force.clone().divideScalar(this.mass));
      }
      
      update(damping) {
        if (this.pinned) return;
        
        // Verlet integration
        const velocity = this.position.clone().sub(this.previous);
        velocity.multiplyScalar(damping);
        
        this.previous.copy(this.position);
        this.position.add(velocity);
        this.position.add(this.acceleration);
        
        this.acceleration.set(0, 0, 0);
      }
    }
    
    // Create particles in a grid
    const spacingX = WIDTH / SEGMENTS_X;
    const spacingY = HEIGHT / SEGMENTS_Y;
    
    for (let y = 0; y <= SEGMENTS_Y; y++) {
      for (let x = 0; x <= SEGMENTS_X; x++) {
        const px = (x - SEGMENTS_X / 2) * spacingX;
        const py = -y * spacingY;
        const pz = 0;
        
        // Pin the top corners (attachment points)
        const isLeftPin = y === 0 && x <= 2;
        const isRightPin = y === 0 && x >= SEGMENTS_X - 2;
        
        particles.push(new Particle(px, py, pz, isLeftPin || isRightPin));
      }
    }
    
    // Helper to get particle at grid position
    const getParticle = (x, y) => {
      if (x < 0 || x > SEGMENTS_X || y < 0 || y > SEGMENTS_Y) return null;
      return particles[y * (SEGMENTS_X + 1) + x];
    };
    
    // Create constraints
    for (let y = 0; y <= SEGMENTS_Y; y++) {
      for (let x = 0; x <= SEGMENTS_X; x++) {
        const p = getParticle(x, y);
        
        // Structural (direct neighbors)
        const right = getParticle(x + 1, y);
        const down = getParticle(x, y + 1);
        
        if (right) {
          constraints.push({
            p1: p, p2: right,
            restLength: spacingX,
            type: 'structural',
            stiffness: 1.0
          });
        }
        if (down) {
          constraints.push({
            p1: p, p2: down,
            restLength: spacingY,
            type: 'structural',
            stiffness: 1.0
          });
        }
        
        // Shear (diagonal)
        const diagDR = getParticle(x + 1, y + 1);
        const diagDL = getParticle(x - 1, y + 1);
        
        if (diagDR) {
          constraints.push({
            p1: p, p2: diagDR,
            restLength: Math.sqrt(spacingX * spacingX + spacingY * spacingY),
            type: 'shear',
            stiffness: 0.8
          });
        }
        if (diagDL) {
          constraints.push({
            p1: p, p2: diagDL,
            restLength: Math.sqrt(spacingX * spacingX + spacingY * spacingY),
            type: 'shear',
            stiffness: 0.8
          });
        }
        
        // Bending (skip one)
        const right2 = getParticle(x + 2, y);
        const down2 = getParticle(x, y + 2);
        
        if (right2) {
          constraints.push({
            p1: p, p2: right2,
            restLength: spacingX * 2,
            type: 'bending',
            stiffness: 0.5
          });
        }
        if (down2) {
          constraints.push({
            p1: p, p2: down2,
            restLength: spacingY * 2,
            type: 'bending',
            stiffness: 0.5
          });
        }
      }
    }
    
    // Create cloth mesh
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(particles.length * 3);
    const uvs = new Float32Array(particles.length * 2);
    
    // Generate UVs
    for (let y = 0; y <= SEGMENTS_Y; y++) {
      for (let x = 0; x <= SEGMENTS_X; x++) {
        const idx = y * (SEGMENTS_X + 1) + x;
        uvs[idx * 2] = x / SEGMENTS_X;
        uvs[idx * 2 + 1] = 1 - y / SEGMENTS_Y;
      }
    }
    
    // Generate indices for triangles
    const indices = [];
    for (let y = 0; y < SEGMENTS_Y; y++) {
      for (let x = 0; x < SEGMENTS_X; x++) {
        const a = y * (SEGMENTS_X + 1) + x;
        const b = a + 1;
        const c = a + (SEGMENTS_X + 1);
        const d = c + 1;
        
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    
    // Cape texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Rich fabric gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#8b0000');
    grad.addColorStop(0.3, '#6b0000');
    grad.addColorStop(0.7, '#4a0000');
    grad.addColorStop(1, '#2a0000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    
    // Subtle pattern
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    for (let i = 0; i < 256; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
    }
    
    // Edge trim
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(0, 0, 256, 8);
    ctx.fillRect(0, 0, 4, 256);
    ctx.fillRect(252, 0, 4, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      roughness: 0.7,
      metalness: 0.1,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    // Debug visualization
    let particlePoints = null;
    let constraintLines = null;
    
    const createDebugVisuals = () => {
      // Particle points
      const pointsGeo = new THREE.BufferGeometry();
      const pointsPos = new Float32Array(particles.length * 3);
      pointsGeo.setAttribute('position', new THREE.BufferAttribute(pointsPos, 3));
      
      particlePoints = new THREE.Points(
        pointsGeo,
        new THREE.PointsMaterial({ color: 0x00ffff, size: 0.03 })
      );
      particlePoints.visible = false;
      scene.add(particlePoints);
      
      // Constraint lines
      const lineGeo = new THREE.BufferGeometry();
      const linePos = new Float32Array(constraints.length * 6);
      lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
      
      constraintLines = new THREE.LineSegments(
        lineGeo,
        new THREE.LineBasicMaterial({ color: 0xffff00, opacity: 0.3, transparent: true })
      );
      constraintLines.visible = false;
      scene.add(constraintLines);
    };
    createDebugVisuals();
    
    // Update function
    const update = (dt, time, attachments, cfg) => {
      const subSteps = 3;
      const subDt = dt / subSteps;
      
      for (let step = 0; step < subSteps; step++) {
        // Apply gravity
        const gravity = new THREE.Vector3(0, -cfg.gravity * subDt * subDt, 0);
        
        // Apply wind (turbulent)
        const windBase = cfg.windStrength;
        const windX = Math.sin(time * 2.3) * 0.5 + Math.sin(time * 5.1) * 0.2;
        const windZ = Math.cos(time * 1.7) * 0.8 + 1.0;
        const wind = new THREE.Vector3(
          windX * windBase * subDt * subDt,
          Math.sin(time * 3) * windBase * 0.1 * subDt * subDt,
          windZ * windBase * subDt * subDt
        );
        
        // Update particles
        particles.forEach((p, i) => {
          if (p.pinned) {
            // Move pinned particles to attachment points
            const row = Math.floor(i / (SEGMENTS_X + 1));
            const col = i % (SEGMENTS_X + 1);
            
            if (row === 0) {
              if (col <= 2 && attachments[0]) {
                // Left attachment
                const t = col / 2;
                p.position.lerpVectors(attachments[0], attachments[1], t * 0.2);
                p.position.z = 0;
              } else if (col >= SEGMENTS_X - 2 && attachments[1]) {
                // Right attachment
                const t = (SEGMENTS_X - col) / 2;
                p.position.lerpVectors(attachments[1], attachments[0], t * 0.2);
                p.position.z = 0;
              }
            }
            return;
          }
          
          p.applyForce(gravity);
          
          // Wind affects front face more
          const windEffect = wind.clone();
          if (p.position.z < 0) windEffect.multiplyScalar(0.3);
          p.applyForce(windEffect);
          
          p.update(cfg.damping);
        });
        
        // Solve constraints
        for (let iter = 0; iter < cfg.iterations; iter++) {
          constraints.forEach(c => {
            const diff = c.p2.position.clone().sub(c.p1.position);
            const dist = diff.length();
            if (dist === 0) return;
            
            const error = (dist - c.restLength) / dist;
            const correction = diff.multiplyScalar(error * cfg.stiffness * c.stiffness * 0.5);
            
            if (!c.p1.pinned && !c.p2.pinned) {
              c.p1.position.add(correction);
              c.p2.position.sub(correction);
            } else if (!c.p1.pinned) {
              c.p1.position.add(correction.multiplyScalar(2));
            } else if (!c.p2.pinned) {
              c.p2.position.sub(correction.multiplyScalar(2));
            }
          });
        }
      }
      
      // Update mesh geometry
      const posAttr = mesh.geometry.attributes.position;
      particles.forEach((p, i) => {
        posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
      });
      posAttr.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      
      // Update debug visuals
      if (particlePoints?.visible) {
        const ppAttr = particlePoints.geometry.attributes.position;
        particles.forEach((p, i) => {
          ppAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
        });
        ppAttr.needsUpdate = true;
      }
      
      if (constraintLines?.visible) {
        const clAttr = constraintLines.geometry.attributes.position;
        constraints.forEach((c, i) => {
          clAttr.setXYZ(i * 2, c.p1.position.x, c.p1.position.y, c.p1.position.z);
          clAttr.setXYZ(i * 2 + 1, c.p2.position.x, c.p2.position.y, c.p2.position.z);
        });
        clAttr.needsUpdate = true;
      }
    };
    
    const setDebugMode = (showParticles, showConstraints) => {
      if (particlePoints) particlePoints.visible = showParticles;
      if (constraintLines) constraintLines.visible = showConstraints;
    };
    
    return { update, setDebugMode };
  }

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: '#0d0d12' }}>
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <h1 className="text-xl font-light tracking-[0.3em] uppercase" style={{ color: '#e8e4f0' }}>
          Cloth Physics Demo
        </h1>
        <p className="text-xs tracking-[0.2em] mt-1 uppercase" style={{ color: 'rgba(200,180,220,0.5)' }}>
          Drag the pink spheres to move attachment points
        </p>
      </div>
      
      {/* Controls */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-56 z-10">
        <div className="rounded-lg p-4 space-y-4" style={{ 
          background: 'rgba(20,18,28,0.9)', 
          border: '1px solid rgba(100,80,140,0.3)',
          backdropFilter: 'blur(8px)'
        }}>
          <h2 className="text-xs tracking-[0.15em] uppercase pb-2" style={{ 
            color: 'rgba(180,160,200,0.8)',
            borderBottom: '1px solid rgba(100,80,140,0.3)'
          }}>
            Physics Parameters
          </h2>
          
          {/* Gravity */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(160,140,180,0.7)' }}>Gravity</span>
              <span className="text-xs" style={{ color: 'rgba(200,180,220,0.9)' }}>{config.gravity.toFixed(1)}</span>
            </div>
            <input
              type="range" min="0" max="40" step="1"
              value={config.gravity}
              onChange={(e) => setConfig(c => ({ ...c, gravity: parseFloat(e.target.value) }))}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{ background: '#2a2540', accentColor: '#8866aa' }}
            />
          </div>
          
          {/* Wind */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(160,140,180,0.7)' }}>Wind</span>
              <span className="text-xs" style={{ color: 'rgba(200,180,220,0.9)' }}>{config.windStrength.toFixed(1)}</span>
            </div>
            <input
              type="range" min="0" max="15" step="0.5"
              value={config.windStrength}
              onChange={(e) => setConfig(c => ({ ...c, windStrength: parseFloat(e.target.value) }))}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{ background: '#2a2540', accentColor: '#8866aa' }}
            />
          </div>
          
          {/* Stiffness */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(160,140,180,0.7)' }}>Stiffness</span>
              <span className="text-xs" style={{ color: 'rgba(200,180,220,0.9)' }}>{config.stiffness.toFixed(2)}</span>
            </div>
            <input
              type="range" min="0.3" max="1" step="0.05"
              value={config.stiffness}
              onChange={(e) => setConfig(c => ({ ...c, stiffness: parseFloat(e.target.value) }))}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{ background: '#2a2540', accentColor: '#8866aa' }}
            />
          </div>
          
          {/* Damping */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(160,140,180,0.7)' }}>Damping</span>
              <span className="text-xs" style={{ color: 'rgba(200,180,220,0.9)' }}>{config.damping.toFixed(2)}</span>
            </div>
            <input
              type="range" min="0.9" max="0.995" step="0.005"
              value={config.damping}
              onChange={(e) => setConfig(c => ({ ...c, damping: parseFloat(e.target.value) }))}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{ background: '#2a2540', accentColor: '#8866aa' }}
            />
          </div>
          
          {/* Iterations */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(160,140,180,0.7)' }}>Solver Iterations</span>
              <span className="text-xs" style={{ color: 'rgba(200,180,220,0.9)' }}>{config.iterations}</span>
            </div>
            <input
              type="range" min="1" max="20" step="1"
              value={config.iterations}
              onChange={(e) => setConfig(c => ({ ...c, iterations: parseInt(e.target.value) }))}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{ background: '#2a2540', accentColor: '#8866aa' }}
            />
          </div>
          
          {/* Debug toggles */}
          <div className="pt-2 space-y-2" style={{ borderTop: '1px solid rgba(100,80,140,0.3)' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showParticles}
                onChange={(e) => setConfig(c => ({ ...c, showParticles: e.target.checked }))}
                className="w-3 h-3 rounded"
              />
              <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(160,140,180,0.7)' }}>
                Show Particles
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showConstraints}
                onChange={(e) => setConfig(c => ({ ...c, showConstraints: e.target.checked }))}
                className="w-3 h-3 rounded"
              />
              <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(160,140,180,0.7)' }}>
                Show Constraints
              </span>
            </label>
          </div>
        </div>
      </div>
      
      {/* Info */}
      <div className="absolute right-4 bottom-4 text-right pointer-events-none">
        <p className="text-xs" style={{ color: 'rgba(140,120,160,0.6)' }}>
          12×18 particle grid
        </p>
        <p className="text-xs" style={{ color: 'rgba(140,120,160,0.6)' }}>
          Verlet integration + constraint solving
        </p>
        <p className="text-xs" style={{ color: 'rgba(140,120,160,0.6)' }}>
          Structural + shear + bending constraints
        </p>
      </div>
    </div>
  );
};

export default ClothDemo;
