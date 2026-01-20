import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { useUserStore } from '@/app/stores/userStore';

interface GenreOrb {
  name: string;
  percentage: number;
  color: string;
  position: [number, number, number];
  recommendedTrack?: {
    name: string;
    artist: string;
    url: string;
  };
}

const GenreSphere = ({ name, percentage, color, position, recommendedTrack }: GenreOrb) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.1);
    }
  });

  const size = 0.3 + percentage * 0.03;
  const glowSize = size * 1.5;
  const textDistance = glowSize + 0.3; // Увеличиваем расстояние от свечения

  const handleClick = () => {
    if (recommendedTrack?.url) {
      window.open(recommendedTrack.url, '_blank');
    }
  };

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group position={position}>
        {/* Glow effect - возвращаем прозрачность на 0.1 */}
        <Sphere ref={glowRef} args={[glowSize, 16, 16]}>
          <meshBasicMaterial color={color} transparent opacity={0.1} />
        </Sphere>

        {/* Main sphere */}
        <Sphere 
          ref={meshRef} 
          args={[size, 32, 32]}
          onClick={handleClick}
          onPointerOver={() => document.body.style.cursor = 'pointer'}
          onPointerOut={() => document.body.style.cursor = 'default'}
        >
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.8}
          />
        </Sphere>

        {/* Recommended Track - размещаем дальше от свечения */}
        {recommendedTrack && (
          <>
            <Text
              position={[0, textDistance + 0.2, 0]}
              fontSize={0.12}
              color="#ffdd44"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.03}
              outlineColor="black"
            >
              🎵 {recommendedTrack.name}
            </Text>
            <Text
              position={[0, textDistance, 0]}
              fontSize={0.1}
              color="#cccccc"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.03}
              outlineColor="black"
            >
              by {recommendedTrack.artist}
            </Text>
          </>
        )}
      </group>
    </Float>
  );
};

const Stars = () => {
  const starsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const count = 3000; // Увеличиваем количество звезд
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = 15 + Math.random() * 35; // Приближаем звезды
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const colorChoice = Math.random();
      if (colorChoice < 0.25) {
        // Яркие белые звезды
        colors[i3] = 1; colors[i3 + 1] = 1; colors[i3 + 2] = 1;
      } else if (colorChoice < 0.5) {
        // Фиолетовые звезды
        colors[i3] = 0.9; colors[i3 + 1] = 0.6; colors[i3 + 2] = 1;
      } else if (colorChoice < 0.75) {
        // Синие звезды
        colors[i3] = 0.4; colors[i3 + 1] = 0.8; colors[i3 + 2] = 1;
      } else {
        // Розовые звезды
        colors[i3] = 1; colors[i3 + 1] = 0.5; colors[i3 + 2] = 0.8;
      }
    }

    return [positions, colors];
  }, []);

  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = state.clock.elapsedTime * 0.01;
      starsRef.current.rotation.x = state.clock.elapsedTime * 0.005;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.15} // Увеличиваем размер звезд
        vertexColors 
        transparent 
        opacity={0.9} // Увеличиваем непрозрачность
        sizeAttenuation={true} // Звезды становятся меньше с расстоянием
      />
    </points>
  );
};

const CentralSun = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { username } = useUserStore();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.z += 0.002;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime) * 0.15);
    }
  });

  return (
    <group>
      <Sphere ref={glowRef} args={[1.5, 32, 32]}>
        <meshBasicMaterial color="#a855f7" transparent opacity={0.2} />
      </Sphere>
      <Sphere ref={meshRef} args={[0.8, 64, 64]}>
        <meshStandardMaterial
          color="#a855f7"
          emissive="#ec4899"
          emissiveIntensity={2}
          roughness={0}
          metalness={1}
        />
      </Sphere>
      <Text
        position={[0, 0, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="black"
      >
        {username || 'Пользователь'}
      </Text>
    </group>
  );
};

const Scene = () => {
  const { topGenres, topTracks } = useUserStore();

  const genreOrbs: GenreOrb[] = useMemo(() => {
    // Создаем mock данные если нет реальных жанров
    const genres = topGenres.length > 0 ? topGenres : [
      { name: 'Rock', trackCount: 150, color: '#FFB3BA' },
      { name: 'Electronic', trackCount: 120, color: '#FFDFBA' },
      { name: 'Pop', trackCount: 100, color: '#FFFFBA' },
      { name: 'Hip-Hop', trackCount: 80, color: '#BAFFC9' },
      { name: 'Jazz', trackCount: 60, color: '#BAE1FF' },
    ];

    const total = genres.reduce((sum, g) => sum + g.trackCount, 0);

    return genres.map((genre, i) => {
      const angle = (i / genres.length) * Math.PI * 2;
      const radius = 4 + (i % 2) * 1.5;
      const percentage = Math.round((genre.trackCount / total) * 100);

      // Получаем случайный трек из топ чарта для рекомендации
      const randomTrack = topTracks.length > 0 
        ? topTracks[Math.floor(Math.random() * Math.min(topTracks.length, 10))]
        : null;

      return {
        name: genre.name,
        percentage,
        color: genre.color || '#a855f7',
        position: [
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 2,
          Math.sin(angle) * radius,
        ] as [number, number, number],
        recommendedTrack: randomTrack ? {
          name: randomTrack.name,
          artist: randomTrack.artist,
          url: randomTrack.url,
        } : undefined,
      };
    });
  }, [topGenres, topTracks]);

  return (
    <>
      <ambientLight intensity={0.4} /> {/* Увеличиваем общее освещение */}
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#a855f7" />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#ec4899" />
      
      <Stars />
      <CentralSun />
      
      {genreOrbs.map((orb) => (
        <GenreSphere key={orb.name} {...orb} />
      ))}
      
      <OrbitControls 
        enableZoom={true}
        enablePan={false}
        minDistance={5}
        maxDistance={20}
        autoRotate
        autoRotateSpeed={0.3} // Немного замедляем автовращение
      />
    </>
  );
};

export const GalaxyView = () => {
  const { loadUserInfo, loadTopTracks, username, topTracks, isLoadingTopTracks } = useUserStore();

  useEffect(() => {
    if (!username) {
      loadUserInfo();
    }
    if (topTracks.length === 0 && !isLoadingTopTracks) {
      loadTopTracks();
    }
  }, [username, topTracks.length, isLoadingTopTracks, loadUserInfo, loadTopTracks]);

  return (
    <div className="h-full flex flex-col">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-3xl font-bold text-gradient-nebula mb-2">Самое яркое</h2>
        <p className="text-muted-foreground">3D-визуализация чарта топ-5. Вращайте мышью!</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 glass-card rounded-2xl overflow-hidden"
      >
        <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
          <Scene />
        </Canvas>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4 text-center text-sm text-muted-foreground"
      >
        💡 Используйте мышь для вращения, колёсико для масштабирования
        <br />
        🎵 Кликните на планету чтобы послушать рекомендованный трек
      </motion.div>
    </div>
  );
};
  