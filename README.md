# ClothPhysics-JSX

A real-time cloth physics simulation component built with React and Three.js, featuring Verlet integration and constraint-based physics solving. Perfect for capes, flags, curtains, and fabric effects in web applications and games.

![Cloth Physics Demo](https://img.shields.io/badge/Three.js-r128+-blue) ![React](https://img.shields.io/badge/React-18+-61DAFB) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **Verlet Integration** — Stable, position-based physics simulation
- **Multi-Constraint System** — Structural, shear, and bending constraints for realistic cloth behavior
- **Interactive Controls** — Drag attachment points in real-time
- **Configurable Physics** — Adjustable gravity, wind, stiffness, damping, and solver iterations
- **Debug Visualization** — Toggle particle and constraint visibility for development
- **Procedural Textures** — Built-in gradient cape texture with customization support
- **Responsive Design** — Adapts to any container size
- **Performance Optimized** — Substep simulation and efficient geometry updates

## 🎮 Quick Preview

Open `demo.html` in any modern browser to see the cloth physics in action immediately — no build step required!

The demo includes:
- Interactive shoulder attachment points (click and drag the pink spheres)
- Real-time physics parameter adjustments
- Material presets (Silk, Heavy, Windy, Stiff)
- Debug visualization toggles

## 📁 Project Structure

```
ClothPhysics-JSX/
├── README.md                          # This file
├── demo.html                          # Standalone demo (open in browser)
├── ClothPhysics-JSX-integration.md    # Detailed integration guide
├── ClothPhysicsDemo.jsx               # Full component with UI controls
└── ClothPhysicsArtifact.jsx           # Compact artifact version
```

## 🚀 Getting Started

### Prerequisites

- React 18+
- Three.js r128+
- A module bundler (Vite, Webpack, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/MushroomFleet/ClothPhysics-JSX.git

# Or copy files directly into your project
cp ClothPhysics-JSX/*.jsx your-project/src/components/
```

### Basic Usage

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

## ⚙️ Configuration

Customize the physics behavior with these parameters:

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `gravity` | 0-40 | 15 | Downward force strength |
| `windStrength` | 0-15 | 3 | Wind turbulence intensity |
| `stiffness` | 0.3-1.0 | 0.9 | Cloth rigidity |
| `damping` | 0.9-0.995 | 0.98 | Energy preservation |
| `iterations` | 1-20 | 8 | Solver accuracy (higher = more stable) |

### Example Configurations

```javascript
// Silk-like material
const silkConfig = { gravity: 8, windStrength: 6, stiffness: 0.6, damping: 0.99, iterations: 12 };

// Heavy velvet cape
const heavyConfig = { gravity: 30, windStrength: 2, stiffness: 0.95, damping: 0.96, iterations: 10 };

// Windy flag
const flagConfig = { gravity: 12, windStrength: 12, stiffness: 0.85, damping: 0.97, iterations: 8 };
```

## 🔧 How It Works

### Physics Simulation

The cloth is modeled as a **particle system** with three types of constraints:

1. **Structural Constraints** — Connect adjacent particles horizontally and vertically
2. **Shear Constraints** — Connect diagonal neighbors to resist shearing
3. **Bending Constraints** — Skip-one connections to resist bending

### Verlet Integration

```
position_new = position + (position - position_old) × damping + acceleration
```

This approach is computationally efficient and naturally handles velocity through position history.

### Constraint Solving

Each frame, constraints are iteratively solved to maintain rest lengths:

```
correction = (current_distance - rest_length) / current_distance × stiffness
```

## 📖 Integration Guide

For detailed instructions on adapting this component to your project, see:

**[ClothPhysics-JSX-integration.md](./ClothPhysics-JSX-integration.md)**

Topics covered:
- Component architecture deep-dive
- Custom textures and materials
- Attachment point configurations
- Collision detection integration
- Performance optimization techniques
- Troubleshooting common issues

## 🎨 Customization

### Cloth Dimensions

```javascript
const WIDTH = 0.8;      // Horizontal span
const HEIGHT = 1.2;     // Vertical length
const SEGMENTS_X = 12;  // Horizontal resolution
const SEGMENTS_Y = 18;  // Vertical resolution
```

### Custom Textures

```javascript
const textureLoader = new THREE.TextureLoader();
const fabricTexture = textureLoader.load('/textures/fabric.png');
material.map = fabricTexture;
```

### Attachment Patterns

```javascript
// Full top edge (curtain)
const isPinned = y === 0;

// Side attachment (banner)
const isPinned = x === 0;

// Single point (pendant)
const isPinned = y === 0 && x === SEGMENTS_X / 2;
```

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

MIT License — feel free to use in personal and commercial projects.

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{clothphysics_jsx,
  title = {ClothPhysics-JSX: Real-time Cloth Physics Simulation for React and Three.js},
  author = {[Drift Johnson]},
  year = {2025},
  url = {https://github.com/MushroomFleet/ClothPhysics-JSX},
  version = {1.0.0}
}
```

### Donate:

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
