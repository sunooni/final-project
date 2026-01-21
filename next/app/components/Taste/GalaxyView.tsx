import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { useUserStore } from '@/app/stores/userStore';

interface GenreOrb {
  percentage: number;
  color: string;
  position: [number, number, number];
  recommendedTrack?: {
    name: string;
    artist: string;
    url: string;
  };
}

const GenreSphere = ({ percentage, color, position, recommendedTrack }: GenreOrb) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const textGroupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.1);
    }
    
    // Синхронизируем текст с камерой
    if (textGroupRef.current) {
      textGroupRef.current.lookAt(camera.position);
    }
  });

  const size = Math.min(0.8, 0.3 + (percentage / 100) * 0.5); // Ограничиваем максимальный размер до 0.8
  const glowSize = size * 1.5;
  const textDistance = glowSize + 0.3;

  const handleClick = () => {
    if (recommendedTrack?.url) {
      window.open(recommendedTrack.url, '_blank');
    }
  };

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group position={position}>
        {/* Glow effect */}
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

        {/* Text group that rotates with camera */}
        <group ref={textGroupRef} position={[0, textDistance + 0.1, 0]}>
          {recommendedTrack && (
            <>
              <Text
                position={[0, 0.1, 0]}
                fontSize={0.12}
                color="white"
                anchorX="center"
                anchorY="middle"
              >
                {recommendedTrack.name}
              </Text>
              <Text
                position={[0, -0.1, 0]}
                fontSize={0.1}
                color="#cccccc"
                anchorX="center"
                anchorY="middle"
              >
                by {recommendedTrack.artist}
              </Text>
            </>
          )}
        </group>
      </group>
    </Float>
  );
};

const Stars = () => {
  const starsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    // Используем детерминированные значения вместо Math.random
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const seed = i * 0.1234; // Детерминированное значение
      const radius = 15 + (Math.sin(seed) * 0.5 + 0.5) * 35;
      const theta = (Math.sin(seed * 1.1) * 0.5 + 0.5) * Math.PI * 2;
      const phi = Math.acos(2 * (Math.sin(seed * 1.3) * 0.5 + 0.5) - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const colorChoice = Math.sin(seed * 1.7) * 0.5 + 0.5;
      if (colorChoice < 0.25) {
        colors[i3] = 1; colors[i3 + 1] = 1; colors[i3 + 2] = 1;
      } else if (colorChoice < 0.5) {
        colors[i3] = 0.9; colors[i3 + 1] = 0.6; colors[i3 + 2] = 1;
      } else if (colorChoice < 0.75) {
        colors[i3] = 0.4; colors[i3 + 1] = 0.8; colors[i3 + 2] = 1;
      } else {
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
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.15}
        vertexColors 
        transparent 
        opacity={0.9}
        sizeAttenuation={true}
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
      >
        {username || 'Пользователь'}
      </Text>
    </group>
  );
};

const Scene = () => {
  const { topGenres, topTracks } = useUserStore();

  const genreOrbs: GenreOrb[] = useMemo(() => {
    // Создаем всегда 10 планет
    const planetCount = 10;
    const orbs: GenreOrb[] = [];

    // Используем реальные жанры если есть, иначе создаем mock данные
    const genres = topGenres.length > 0 ? topGenres : [
      { name: 'Rock', trackCount: 150, color: '#F8BBD9' },
      { name: 'Electronic', trackCount: 120, color: '#E2C2FF' },
      { name: 'Pop', trackCount: 100, color: '#B8E6B8' },
      { name: 'Hip-Hop', trackCount: 80, color: '#FFE5CC' },
      { name: 'Jazz', trackCount: 60, color: '#D4F1F9' },
      { name: 'Classical', trackCount: 50, color: '#F5E6FF' },
      { name: 'Indie', trackCount: 45, color: '#FFE1E6' },
      { name: 'Alternative', trackCount: 40, color: '#E8F5E8' },
      { name: 'Folk', trackCount: 35, color: '#FFF2E6' },
      { name: 'Ambient', trackCount: 30, color: '#E6F3FF' },
    ];

    // Рассчитываем проценты только для уникальных жанров
    const uniqueGenres = genres.slice(0, Math.min(genres.length, planetCount));
    const total = uniqueGenres.reduce((sum, g) => sum + g.trackCount, 0);

    for (let i = 0; i < planetCount; i++) {
      const angle = (i / planetCount) * Math.PI * 2;
      const radius = 4 + (i % 3) * 1.2;
      
      // Берем жанр по индексу, если жанров меньше 10, циклически повторяем
      const genre = genres[i % genres.length];
      
      // Для повторяющихся жанров используем уменьшенный процент
      const basePercentage = Math.round((genre.trackCount / total) * 100);
      const repetitionFactor = Math.floor(i / genres.length) + 1;
      const percentage = Math.max(5, Math.round(basePercentage / repetitionFactor)); // Минимум 5%

      // Получаем трек по индексу вместо случайного
      const trackIndex = topTracks.length > 0 
        ? i % Math.min(topTracks.length, 20)
        : null;
      const selectedTrack = trackIndex !== null ? topTracks[trackIndex] : null;

      // Детерминированная высота на основе индекса
      const heightVariation = Math.sin(i * 0.7) * 1.5;

      orbs.push({
        percentage,
        color: genre.color || '#F8BBD9',
        position: [
          Math.cos(angle) * radius,
          heightVariation,
          Math.sin(angle) * radius,
        ] as [number, number, number],
        recommendedTrack: selectedTrack ? {
          name: selectedTrack.name,
          artist: selectedTrack.artist,
          url: selectedTrack.url,
        } : undefined,
      });
    }

    return orbs;
  }, [topGenres, topTracks]);

  return (
    <>
      <ambientLight intensity={0.4} /> {/* Увеличиваем общее освещение */}
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#a855f7" />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#ec4899" />
      
      <Stars />
      <CentralSun />
      
      {genreOrbs.map((orb, index) => (
        <GenreSphere key={index} {...orb} />
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
        <h2 className="text-3xl font-bold text-gradient-nebula mb-2">Галактика Рекомендаций</h2>
        <p className="text-muted-foreground">10 планет с топовыми треками. Вращайте мышью и кликайте для прослушивания!</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 bg-gradient-to-b from-indigo-950 via-purple-950 to-black rounded-2xl overflow-hidden border border-white/10"
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
        Кликните на планету чтобы послушать рекомендованный трек
      </motion.div>
    </div>
  );
};
  