// src/App.jsx
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

function ParticleSphere() {
  const pointsRef = useRef();
  const mouseRef = useRef(new THREE.Vector2(-999, -999));
  const { size, camera } = useThree();

  const count = 850;
  const radius = 2;

  const hasBurst = useRef(new Array(count).fill(false));

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
  const vx = vel[i3];
  const vy = vel[i3 + 1];
  const vz = vel[i3 + 2];
  const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const dist = particle.distanceTo(mousePos);

  // 弾く処理（近づいたら反発）
  if (dist < 1.2) {
    const dir = particle.clone().sub(mousePos).normalize();
    const force = 0.08 / (dist * dist + 0.2);
    vel[i3] += dir.x * force;
    vel[i3 + 1] += dir.y * force;
    vel[i3 + 2] += dir.z * force;
    hasBurst[i] = true; // ← マウスによって弾けた
  }

 // 条件：動きが止まりかけており、かつ透明度が下がってきたら
if (hasBurst.current[i] && opa[i] < 0.3 && speed < 0.02) {
  const toCenter = new THREE.Vector3(0, 0, 0).sub(particle).multiplyScalar(0.001);
  vel[i3] += toCenter.x;
  vel[i3 + 1] += toCenter.y;
  vel[i3 + 2] += toCenter.z;

  // 吸引中はゆっくり透明に
  opa[i] *= 0.997;
} else {
  // 通常フェード
  opa[i] *= 0.99;
}

  // 位置更新と減衰
  pos[i3] += vel[i3];
  pos[i3 + 1] += vel[i3 + 1];
  pos[i3 + 2] += vel[i3 + 2];
  vel[i3] *= 0.90;
  vel[i3 + 1] *= 0.90;
  vel[i3 + 2] *= 0.90;

  // フェードアウト
  opa[i] *= 0.99;

  // 👇 完全に消えたらリセット（ここで初期化）
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
    hasBurst.current[i] = false;
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

  const handleMouseMove = (e) => {
    const rect = document.body.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handlePointer(x, y);
  };

  const handleTouchMove = (e) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = document.body.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      handlePointer(x, y);
    }
  };

  // 👇 追加：タッチ時に画面スクロールを防ぐ
  const preventTouchScroll = (e) => {
    if (e.touches.length === 1) e.preventDefault();
  };

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchstart', preventTouchScroll, { passive: false });

  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchstart', preventTouchScroll);
  };
}, []);



  const uniforms = useMemo(() => ({
    size: { value: 6.0 },
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
  const controlRef = useRef();
  const controlAreaRef = useRef();

  useEffect(() => {
    if (controlRef.current && controlAreaRef.current) {
      controlRef.current.domElement = controlAreaRef.current;
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 上65%：回転操作を通す透明レイヤー */}
      <div
        ref={controlAreaRef}
        style={{
          position: 'absolute',
          top: 0,
          width: '100%',
          height: '65vh',
          zIndex: 2,
          pointerEvents: 'auto', // ← ここが回転を許可するエリア
        }}
      />

      {/* Canvas は操作を受け付けないが描画される */}
      <Canvas
        camera={{ position: [0, 0, 6], fov: 75 }}
        gl={{ alpha: true }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'none', // ← OrbitControlsがないと無効
        }}
      >
        <ParticleSphere />
        <OrbitControls
          ref={controlRef}
          enableZoom={false}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}


