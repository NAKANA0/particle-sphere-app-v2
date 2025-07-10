// src/App.jsx
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

function ParticleSphere() {
  const pointsRef = useRef();
  const mouseRef = useRef(new THREE.Vector2(-999, -999));
  const { size, camera } = useThree();

  const count = 1000;
  const radius = 2;

  const { positions, opacities, velocities } = useMemo(() => {
    const pos = [];
    const opa = [];
    const vel = [];

    for (let i = 0; i < count; i++) {
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = 2 * Math.PI * Math.random();
      const x = radius * Math.sin(theta) * Math.cos(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(theta);
      pos.push(x, y, z);
      opa.push(Math.random());
      vel.push(0, 0, 0);
    }

    return {
      positions: new Float32Array(pos),
      opacities: new Float32Array(opa),
      velocities: new Float32Array(vel),
    };
  }, []);

  useFrame(() => {
    const pos = pointsRef.current.geometry.attributes.position.array;
    const opa = pointsRef.current.geometry.attributes.opacity.array;
    const vel = velocities;

    const vector = new THREE.Vector3(
      (mouseRef.current.x / size.width) * 2 - 1,
      -(mouseRef.current.y / size.height) * 2 + 1,
      0.5
    );
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const mousePos = camera.position.clone().add(dir.multiplyScalar(4));

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const particle = new THREE.Vector3(pos[i3], pos[i3 + 1], pos[i3 + 2]);
      const dist = particle.distanceTo(mousePos);

      if (dist < 3 && opa[i] > 0.2) {
        const dir = particle.clone().sub(mousePos).normalize();
        vel[i3] += dir.x * 0.2;
        vel[i3 + 1] += dir.y * 0.2;
        vel[i3 + 2] += dir.z * 0.2;
      }

      pos[i3] += vel[i3];
      pos[i3 + 1] += vel[i3 + 1];
      pos[i3 + 2] += vel[i3 + 2];

      vel[i3] *= 0.95;
      vel[i3 + 1] *= 0.95;
      vel[i3 + 2] *= 0.95;

      opa[i] *= 0.99;

      if (opa[i] < 0.05) {
        const theta = Math.acos(2 * Math.random() - 1);
        const phi = 2 * Math.PI * Math.random();
        const x = radius * Math.sin(theta) * Math.cos(phi);
        const y = radius * Math.sin(theta) * Math.sin(phi);
        const z = radius * Math.cos(theta);
        pos[i3] = x;
        pos[i3 + 1] = y;
        pos[i3 + 2] = z;
        opa[i] = Math.random();
        vel[i3] = vel[i3 + 1] = vel[i3 + 2] = 0;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.opacity.needsUpdate = true;
  });

  useEffect(() => {
    const handlePointer = (x, y) => {
      mouseRef.current.x = x;
      mouseRef.current.y = y;
    };

    const handleMouseMove = (e) => handlePointer(e.clientX, e.clientY);
    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        handlePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const uniforms = useMemo(() => ({
    size: { value: 4.0 },
  }), []);

  const vertexShader = `
    attribute float opacity;
    varying float vOpacity;
    uniform float size;
    void main() {
      vOpacity = opacity;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size;
    }
  `;

  const fragmentShader = `
    varying float vOpacity;
    void main() {
      vec2 cxy = 2.0 * gl_PointCoord - 1.0;
      float r = dot(cxy, cxy);
      if (r > 1.0) discard;
      gl_FragColor = vec4(0.125, 0.215, 0.266, vOpacity); // #203744
    }
  `;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-opacity"
          array={opacities}
          count={opacities.length}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent={true}
        uniforms={uniforms}
      />
    </points>
  );
}

export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 75 }}
      gl={{ alpha: true }}
    >
      <ambientLight />
      <ParticleSphere />
      <OrbitControls />
    </Canvas>
  );
}
