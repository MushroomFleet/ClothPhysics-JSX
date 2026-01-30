# ClothPhysics-JSX Integration Guide

A comprehensive guide for integrating the Cloth Physics JSX component into your React projects.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Basic Integration](#basic-integration)
4. [Component Architecture](#component-architecture)
5. [Configuration Options](#configuration-options)
6. [Customization](#customization)
7. [Advanced Usage](#advanced-usage)
8. [Performance Optimization](#performance-optimization)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before integrating the Cloth Physics component, ensure your project has:

- **React 18+** (with hooks support)
- **Three.js r128+** 
- **A bundler** that supports JSX (Vite, Webpack, Create React App, etc.)

### Required Dependencies

```bash
npm install three react react-dom
# or
yarn add three react react-dom
```

---

## Installation

### Option 1: Direct File Copy

Copy the component file directly into your project:

```
your-project/
├── src/
│   └── components/
│       └── ClothPhysics/
│           ├── ClothPhysicsDemo.jsx    # Full demo with UI
│           └── ClothPhysicsArtifact.jsx # Compact version
```

### Option 2: From GitHub

```bash
git clone https://github.com/MushroomFleet/ClothPhysics-JSX.git
cp ClothPhysics-JSX/src/*.jsx your-project/src/components/
```

---

## Basic Integration

### Minimal Setup

```jsx
import React from 'react';
import ClothDemo from './components/ClothPhysicsDemo';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ClothDemo />
    </div>
  );
}

export default App;
```

### With Tailwind CSS

The component uses Tailwind CSS classes. If your project uses Tailwind, no additional setup is needed. Otherwise, include the required styles manually or use the inline-style version (`ClothPhysicsArtifact.jsx`).

```jsx
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  // ... rest of config
}
```

---

## Component Architecture

### Core Systems

The cloth physics simulation is built on three interconnected systems:

```
┌─────────────────────────────────────────────────────────┐
│                    ClothDemo Component                   │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Particle   │  │  Constraint  │  │    Mesh      │  │
│  │   System     │  │   Solver     │  │   Renderer   │  │
│  │              │  │              │  │              │  │
│  │  • Position  │  │  • Structural│  │  • Geometry  │  │
│  │  • Velocity  │  │  • Shear     │  │  • Texture   │  │
│  │  • Forces    │  │  • Bending   │  │  • Normals   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    Three.js Scene                        │
│  • Camera • Lighting • Renderer • Animation Loop        │
└─────────────────────────────────────────────────────────┘
```

### Particle Class

```javascript
class Particle {
  constructor(x, y, z, pinned = false) {
    this.position = new THREE.Vector3(x, y, z);
    this.previous = new THREE.Vector3(x, y, z);  // Verlet integration
    this.acceleration = new THREE.Vector3();
    this.pinned = pinned;  // Fixed attachment points
  }

  applyForce(force) {
    if (!this.pinned) this.acceleration.add(force);
  }

  update(damping) {
    if (this.pinned) return;
    // Verlet integration: pos_new = pos + (pos - pos_old) * damping + accel
    const velocity = this.position.clone().sub(this.previous).multiplyScalar(damping);
    this.previous.copy(this.position);
    this.position.add(velocity).add(this.acceleration);
    this.acceleration.set(0, 0, 0);
  }
}
```

### Constraint Types

| Type | Purpose | Stiffness |
|------|---------|-----------|
| **Structural** | Horizontal/vertical connections | 1.0 |
| **Shear** | Diagonal connections | 0.8 |
| **Bending** | Skip-one connections | 0.5 |

---

## Configuration Options

### Physics Parameters

```javascript
const [config, setConfig] = useState({
  gravity: 15,        // 0-40: Downward force strength
  windStrength: 3,    // 0-15: Wind turbulence intensity
  stiffness: 0.9,     // 0.3-1.0: Cloth rigidity
  damping: 0.98,      // 0.9-0.995: Energy preservation
  iterations: 8,      // 1-20: Solver accuracy
  showParticles: false,    // Debug: show particle points
  showConstraints: false,  // Debug: show constraint lines
});
```

### Parameter Effects

| Parameter | Low Value | High Value |
|-----------|-----------|------------|
| **Gravity** | Floating, slow fall | Heavy, fast drop |
| **Wind** | Calm, minimal movement | Turbulent, flapping |
| **Stiffness** | Stretchy, elastic | Rigid, maintains shape |
| **Damping** | Quick energy loss | Sustained oscillation |
| **Iterations** | Fast but less accurate | Accurate but slower |

### Preset Configurations

```javascript
// Silk-like material
const silkConfig = {
  gravity: 8,
  windStrength: 6,
  stiffness: 0.6,
  damping: 0.99,
  iterations: 12
};

// Heavy velvet
const heavyConfig = {
  gravity: 30,
  windStrength: 2,
  stiffness: 0.95,
  damping: 0.96,
  iterations: 10
};

// Windy flag
const windyConfig = {
  gravity: 12,
  windStrength: 12,
  stiffness: 0.85,
  damping: 0.97,
  iterations: 8
};
```

---

## Customization

### Cloth Dimensions

Modify these constants in `createClothSystem()`:

```javascript
const WIDTH = 0.8;      // Horizontal span (meters)
const HEIGHT = 1.2;     // Vertical length (meters)
const SEGMENTS_X = 12;  // Horizontal particle count
const SEGMENTS_Y = 18;  // Vertical particle count
```

### Custom Textures

Replace the procedural texture with your own:

```javascript
// Using an image texture
const textureLoader = new THREE.TextureLoader();
const clothTexture = textureLoader.load('/textures/fabric.jpg');

const material = new THREE.MeshStandardMaterial({
  map: clothTexture,
  side: THREE.DoubleSide,
  roughness: 0.7,
  metalness: 0.1
});
```

### Custom Procedural Texture

```javascript
function createCustomTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Your custom pattern
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(0.5, '#16213e');
  gradient.addColorStop(1, '#0f3460');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  
  // Add pattern details
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.1)';
  for (let i = 0; i < 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
  }
  
  return new THREE.CanvasTexture(canvas);
}
```

### Attachment Points

Modify pin positions for different attachment configurations:

```javascript
// Original: Top edge pinned at corners
const isLeftPin = y === 0 && x <= 2;
const isRightPin = y === 0 && x >= SEGMENTS_X - 2;

// Alternative: Full top edge pinned
const isTopEdge = y === 0;

// Alternative: Side attachment (banner style)
const isLeftEdge = x === 0;

// Alternative: Single point (pendant style)
const isCenterTop = y === 0 && x === Math.floor(SEGMENTS_X / 2);
```

---

## Advanced Usage

### Extracting the Physics System

For use in existing Three.js scenes:

```javascript
import { createClothSystem } from './ClothPhysicsDemo';

// In your existing scene setup
const clothSystem = createClothSystem(yourScene, initialConfig);

// In your animation loop
function animate() {
  clothSystem.update(
    deltaTime,
    elapsedTime,
    [leftAttachPoint.position, rightAttachPoint.position],
    currentConfig
  );
}
```

### Multiple Cloth Instances

```jsx
function MultiClothScene() {
  const clothSystems = useRef([]);
  
  useEffect(() => {
    // Create multiple cloth instances with different configs
    clothSystems.current = [
      createClothSystem(scene, { ...config, gravity: 10 }),
      createClothSystem(scene, { ...config, gravity: 20 }),
    ];
  }, []);
  
  // ... animation loop updates all systems
}
```

### Custom Wind Patterns

```javascript
// Replace the wind calculation in the update loop
function getCustomWind(time, config) {
  // Sine wave wind
  const baseWind = Math.sin(time * 2) * config.windStrength;
  
  // Add turbulence
  const turbulence = (
    Math.sin(time * 5.7) * 0.3 +
    Math.sin(time * 11.3) * 0.15 +
    Math.sin(time * 23.1) * 0.07
  ) * config.windStrength;
  
  return new THREE.Vector3(
    baseWind + turbulence,
    Math.sin(time * 3) * config.windStrength * 0.1,
    config.windStrength * 0.5
  );
}
```

### Collision Detection

Add simple sphere collision:

```javascript
function applyCollision(particle, sphereCenter, sphereRadius) {
  const diff = particle.position.clone().sub(sphereCenter);
  const dist = diff.length();
  
  if (dist < sphereRadius) {
    // Push particle outside sphere
    diff.normalize().multiplyScalar(sphereRadius - dist);
    particle.position.add(diff);
  }
}

// In update loop, after constraint solving:
particles.forEach(p => {
  if (!p.pinned) {
    applyCollision(p, colliderPosition, colliderRadius);
  }
});
```

---

## Performance Optimization

### Reduce Particle Count

For mobile or low-end devices:

```javascript
// Mobile configuration
const SEGMENTS_X = 8;   // Reduced from 12
const SEGMENTS_Y = 12;  // Reduced from 18
```

### Lower Iteration Count

```javascript
// Performance mode
const performanceConfig = {
  ...config,
  iterations: 4,  // Reduced from 8
};
```

### Substep Optimization

```javascript
// Reduce substeps for faster simulation
const subSteps = 2;  // Default is 3
```

### Frame Rate Throttling

```javascript
// Limit physics updates to 30fps
let lastPhysicsUpdate = 0;
const physicsInterval = 1000 / 30;

function animate(currentTime) {
  if (currentTime - lastPhysicsUpdate > physicsInterval) {
    updatePhysics(deltaTime);
    lastPhysicsUpdate = currentTime;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

---

## Troubleshooting

### Common Issues

#### Cloth Falls Through Scene

**Cause:** Gravity too high or damping too low

**Solution:**
```javascript
setConfig(c => ({
  ...c,
  gravity: 15,    // Reduce if > 25
  damping: 0.98,  // Increase if < 0.95
}));
```

#### Cloth Explodes/Stretches

**Cause:** Stiffness too low or iterations too few

**Solution:**
```javascript
setConfig(c => ({
  ...c,
  stiffness: 0.9,   // Increase toward 1.0
  iterations: 12,   // Increase for stability
}));
```

#### Jittery Movement

**Cause:** Time step too large

**Solution:**
```javascript
// Cap delta time
const dt = Math.min(clock.getDelta(), 0.016);  // Max ~60fps timestep
```

#### Black/Missing Cloth

**Cause:** Lighting or material issue

**Solution:**
```javascript
// Ensure scene has ambient light
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// Check material is double-sided
material.side = THREE.DoubleSide;
```

### Debug Mode

Enable debug visualization:

```jsx
<ClothDemo 
  initialConfig={{
    showParticles: true,
    showConstraints: true,
  }}
/>
```

This shows:
- **Cyan points**: Particle positions
- **Yellow lines**: Constraint connections

---

## API Reference

### ClothDemo Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialConfig` | `object` | See defaults | Initial physics parameters |
| `onConfigChange` | `function` | - | Callback when config updates |

### Config Object

```typescript
interface ClothConfig {
  gravity: number;        // 0-40
  windStrength: number;   // 0-15
  stiffness: number;      // 0.3-1.0
  damping: number;        // 0.9-0.995
  iterations: number;     // 1-20
  showParticles: boolean;
  showConstraints: boolean;
}
```

### ClothSystem Methods

```javascript
const clothSystem = createClothSystem(scene, config);

// Update simulation
clothSystem.update(deltaTime, elapsedTime, attachmentPositions, config);

// Toggle debug visuals
clothSystem.setDebugMode(showParticles, showConstraints);
```

---

## Examples

### Game Character Cape

```jsx
function CharacterCape({ characterRef }) {
  const clothRef = useRef();
  
  useFrame(() => {
    if (clothRef.current && characterRef.current) {
      const shoulders = getShoulderPositions(characterRef.current);
      clothRef.current.update(delta, time, shoulders, capeConfig);
    }
  });
  
  return <ClothMesh ref={clothRef} />;
}
```

### Interactive Curtain

```jsx
function InteractiveCurtain() {
  return (
    <ClothDemo 
      initialConfig={{
        gravity: 20,
        windStrength: 0,
        stiffness: 0.95,
      }}
    />
  );
}
```

---

## Support

For issues and feature requests, visit the [GitHub repository](https://github.com/MushroomFleet/ClothPhysics-JSX).
