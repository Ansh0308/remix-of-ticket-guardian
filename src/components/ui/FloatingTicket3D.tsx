import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface TicketMeshProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  color?: string;
}

const TicketMesh: React.FC<TicketMeshProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  scale = 1,
  color = '#6366f1'
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1 + rotation[1];
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.05 + rotation[0];
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <group position={position} scale={scale}>
        {/* Main ticket body */}
        <RoundedBox
          ref={meshRef}
          args={[2.4, 1.2, 0.08]}
          radius={0.1}
          smoothness={4}
        >
          <meshStandardMaterial 
            color={color}
            metalness={0.3}
            roughness={0.4}
          />
        </RoundedBox>
        
        {/* Ticket stripe */}
        <mesh position={[-0.6, 0, 0.05]}>
          <boxGeometry args={[0.6, 1.0, 0.02]} />
          <meshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.6} />
        </mesh>
        
        {/* Decorative circles */}
        <mesh position={[0.8, 0.35, 0.05]}>
          <circleGeometry args={[0.1, 32]} />
          <meshStandardMaterial color="#ffffff" opacity={0.8} transparent />
        </mesh>
        <mesh position={[0.8, 0, 0.05]}>
          <circleGeometry args={[0.1, 32]} />
          <meshStandardMaterial color="#ffffff" opacity={0.6} transparent />
        </mesh>
        <mesh position={[0.8, -0.35, 0.05]}>
          <circleGeometry args={[0.1, 32]} />
          <meshStandardMaterial color="#ffffff" opacity={0.4} transparent />
        </mesh>
      </group>
    </Float>
  );
};

const GlowingSphere: React.FC<{ position: [number, number, number]; color: string }> = ({ position, color }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.1);
    }
  });

  return (
    <Float speed={3} rotationIntensity={0.2} floatIntensity={2}>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <MeshDistortMaterial
          color={color}
          speed={2}
          distort={0.3}
          radius={1}
          transparent
          opacity={0.7}
        />
      </mesh>
    </Float>
  );
};

const FloatingTicket3D: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#6366f1" />
        <pointLight position={[10, -10, 5]} intensity={0.3} color="#14b8a6" />
        
        {/* Main floating ticket */}
        <TicketMesh position={[0, 0.2, 0]} scale={1.2} color="#6366f1" />
        
        {/* Secondary tickets */}
        <TicketMesh position={[-2.5, -0.5, -1]} scale={0.6} color="#8b5cf6" rotation={[0.2, 0.5, 0.1]} />
        <TicketMesh position={[2.5, 0.8, -1.5]} scale={0.5} color="#14b8a6" rotation={[-0.1, -0.3, 0.1]} />
        
        {/* Glowing spheres */}
        <GlowingSphere position={[-1.5, 1.5, -0.5]} color="#6366f1" />
        <GlowingSphere position={[1.8, -1.2, -0.3]} color="#14b8a6" />
        <GlowingSphere position={[0.5, 1.8, -1]} color="#8b5cf6" />
      </Canvas>
    </div>
  );
};

export default FloatingTicket3D;
