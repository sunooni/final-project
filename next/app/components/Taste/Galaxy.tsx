'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';

interface Artist {
  name: string;
  trackCount: number;
  url: string;
}

interface Genre {
  name: string;
  trackCount: number;
  artists: Artist[];
}

interface GalaxyData {
  genres: Genre[];
}

// Component for a planet (genre)
function Planet({ 
  genre, 
  position, 
  onClick 
}: { 
  genre: Genre; 
  position: [number, number, number];
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate planet size based on track count (min 0.5, max 3)
  const size = Math.max(0.5, Math.min(3, 0.5 + (genre.trackCount / 50) * 2.5));
  
  // Generate color based on genre name hash
  const hue = (genre.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360);
  const color = `hsl(${hue}, 70%, 60%)`;

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <Text
        position={[0, size + 0.5, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
      >
        {genre.name}
      </Text>
      <Text
        position={[0, size + 0.2, 0]}
        fontSize={0.2}
        color="lightgray"
        anchorX="center"
        anchorY="middle"
      >
        {genre.trackCount} треков
      </Text>
    </group>
  );
}

// Component for a satellite (artist) orbiting a planet
function Satellite({
  artist,
  planetPosition,
  orbitRadius,
  angle,
  onClick,
}: {
  artist: Artist;
  planetPosition: [number, number, number];
  orbitRadius: number;
  angle: number;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const orbitSpeed = 0.01 + (artist.trackCount / 100) * 0.02;
  const [currentAngle, setCurrentAngle] = useState(angle);

  useFrame(() => {
    if (meshRef.current) {
      setCurrentAngle(prev => prev + orbitSpeed);
      const x = planetPosition[0] + Math.cos(currentAngle) * orbitRadius;
      const y = planetPosition[1] + Math.sin(currentAngle * 0.5) * 0.3;
      const z = planetPosition[2] + Math.sin(currentAngle) * orbitRadius;
      meshRef.current.position.set(x, y, z);
    }
  });

  const size = Math.max(0.1, Math.min(0.4, 0.1 + (artist.trackCount / 20) * 0.3));

  return (
    <mesh
      ref={meshRef}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.5} />
    </mesh>
  );
}

// Main Galaxy scene component
function GalaxyScene({ data }: { data: GalaxyData }) {
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const controlsRef = useRef<any>(null);

  // Distribute planets in a sphere
  const getPlanetPosition = (index: number, total: number): [number, number, number] => {
    const radius = 8 + (index * 2);
    const theta = (index * 137.5) % 360; // Golden angle
    const phi = Math.acos(1 - (2 * index) / total);
    return [
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
    ];
  };

  const handlePlanetClick = (genre: Genre) => {
    setSelectedGenre(genre);
  };

  const handleSatelliteClick = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />

      {data.genres.map((genre, index) => {
        const position = getPlanetPosition(index, data.genres.length);
        const orbitRadius = 2 + (genre.artists.length * 0.3);

        return (
          <group key={genre.name}>
            <Planet
              genre={genre}
              position={position}
              onClick={() => handlePlanetClick(genre)}
            />
            {genre.artists.map((artist, artistIndex) => {
              const angle = (artistIndex / genre.artists.length) * Math.PI * 2;
              return (
                <Satellite
                  key={artist.name}
                  artist={artist}
                  planetPosition={position}
                  orbitRadius={orbitRadius}
                  angle={angle}
                  onClick={() => handleSatelliteClick(artist.url)}
                />
              );
            })}
          </group>
        );
      })}

      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={50}
      />
    </>
  );
}

// Main Galaxy component
export default function Galaxy() {
  const [data, setData] = useState<GalaxyData | null>(() => {
    // Восстанавливаем кэш из localStorage при инициализации
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('galaxy-cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const now = Date.now();
          // Проверяем, не устарел ли кэш (30 минут)
          if (now - parsed.timestamp < 30 * 60 * 1000) {
            return parsed.data;
          }
        } catch (e) {
          // Игнорируем ошибки парсинга
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(data === null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(() => {
    // Восстанавливаем timestamp из localStorage
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('galaxy-cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          return parsed.timestamp;
        } catch (e) {
          // Игнорируем ошибки
        }
      }
    }
    return null;
  });

  // Время жизни кэша (30 минут для galaxy)
  const CACHE_TTL = 30 * 60 * 1000;

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      // Check if user is authenticated
      const authResponse = await fetch('/api/auth/user');
      if (authResponse.ok) {
        const authData = await authResponse.json();
        if (authData.authenticated && authData.user?.provider === 'lastfm') {
          setIsAuthenticated(true);
          await fetchGalaxyData();
        } else {
          setIsAuthenticated(false);
          setLoading(false);
        }
      } else {
        setIsAuthenticated(false);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error checking auth:', err);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const fetchGalaxyData = async (forceRefresh = false) => {
    const now = Date.now();
    
    // Stale-while-revalidate: если есть кэшированные данные и они свежие
    if (!forceRefresh && data && lastFetchedAt) {
      const timeSinceFetch = now - lastFetchedAt;
      
      // Если данные свежие, показываем их и обновляем в фоне
      if (timeSinceFetch < CACHE_TTL) {
        setIsRefreshing(true);
        
        try {
          const response = await fetch('/api/lastfm/galaxy');
          
          if (response.ok) {
            const galaxyData = await response.json();
            setData(galaxyData);
            setLastFetchedAt(now);
            setError(null);
            
            // Сохраняем в localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('galaxy-cache', JSON.stringify({
                data: galaxyData,
                timestamp: now
              }));
            }
          }
        } catch (err) {
          // Игнорируем ошибки при фоновом обновлении
          console.error('Error refreshing galaxy data:', err);
        } finally {
          setIsRefreshing(false);
        }
        
        return;
      }
    }
    
    // Первая загрузка или данные устарели
    try {
      setLoading(data === null); // Показываем loading только если данных нет
      setError(null);
      const response = await fetch('/api/lastfm/galaxy');
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Необходима авторизация через Last.fm');
          return;
        }
        const errorData = await response.json();
        setError(errorData.error || 'Ошибка загрузки данных');
        return;
      }

      const galaxyData = await response.json();
      setData(galaxyData);
      setLastFetchedAt(now);
      
      // Сохраняем в localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('galaxy-cache', JSON.stringify({
          data: galaxyData,
          timestamp: now
        }));
      }
    } catch (err) {
      console.error('Error fetching galaxy data:', err);
      setError('Ошибка при загрузке данных галактики');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated === null) {
    return null;
  }

  if (isAuthenticated === false) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-xl mb-4">Войдите через Last.fm</div>
          <div className="text-gray-400">Чтобы увидеть вашу музыкальную галактику</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-2xl mb-4">Загрузка галактики...</div>
          <div className="text-gray-400">Анализируем вашу музыку...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-xl text-red-400 mb-2">Ошибка</div>
          <div className="text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  if (!data || data.genres.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-xl mb-2">Нет данных</div>
          <div className="text-gray-400">У вас пока нет любимых треков</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black">
      <Canvas camera={{ position: [0, 0, 20], fov: 75 }}>
        <Suspense fallback={null}>
          <GalaxyScene data={data} />
        </Suspense>
      </Canvas>
      <div className="absolute top-4 left-4 text-white bg-black/50 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Ваша музыкальная галактика</h2>
        <p className="text-sm text-gray-300">
          Планеты = жанры • Спутники = артисты
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Кликните на спутник, чтобы перейти на Last.fm
        </p>
        {isRefreshing && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            <span>Обновление данных...</span>
          </div>
        )}
      </div>
    </div>
  );
}

