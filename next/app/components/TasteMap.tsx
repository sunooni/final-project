"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Track {
  name: string;
  artist: { "#text": string; mbid?: string };
  url: string;
  image?: Array<{ "#text": string; size: string }>;
  mbid?: string;
}

interface LovedTracksResponse {
  success: boolean;
  lovedtracks?: {
    track: Track | Track[];
    "@attr": {
      page: string;
      perPage: string;
      totalPages: string;
      total: string;
    };
  };
  error?: string;
}
export const TasteMap = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<any>(null);
  const dataFetchedRef = useRef(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTracks, setShowTracks] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Загружаем данные только один раз при монтировании
    if (!dataFetchedRef.current) {
      dataFetchedRef.current = true;
      
      const fetchGalaxyData = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await fetch('/api/lastfm/galaxy');
          
          if (!response.ok) {
            if (response.status === 401) {
              setError('Необходима авторизация через Last.fm');
              setLoading(false);
              return;
            }
            const errorData = await response.json();
            setError(errorData.error || 'Ошибка загрузки данных');
            setLoading(false);
            return;
          }

          const data = await response.json();
          if (data.genres && data.genres.length > 0) {
            setGalaxyData(data.genres);
          } else {
            setError('Нет данных для отображения. Добавьте любимые треки на Last.fm');
          }
        } catch (err) {
          console.error('Error fetching galaxy data:', err);
          setError('Ошибка при загрузке данных');
        } finally {
          setLoading(false);
        }
      };

      fetchGalaxyData();
    }

    // Рендерим визуализацию когда данные загружены
    if (loading || !svgRef.current || !containerRef.current || topGenres.length === 0) {
      return;
    }

    // Останавливаем предыдущую симуляцию, если есть
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create gradient definitions
    const defs = svg.append('defs');

    // Add stars background
    const starsGroup = svg.append('g').attr('class', 'stars');
    
    // Generate random stars
    const starCount = 200;
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 0.5;
      const opacity = Math.random() * 0.7 + 0.3;
      
      starsGroup
        .append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', size)
        .attr('fill', 'white')
        .attr('opacity', opacity)
        .append('animate')
        .attr('attributeName', 'opacity')
        .attr('values', `${opacity};${opacity * 0.3};${opacity}`)
        .attr('dur', `${Math.random() * 3 + 2}s`)
        .attr('repeatCount', 'indefinite');
    }

    // Glow filter
    const filter = defs
      .append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    filter
      .append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create nodes - genres as planets (bigger)
    const genreNodes: Node[] = topGenres.slice(0, 8).map((g) => ({
      id: `genre-${g.name}`,
      name: g.name,
      type: 'genre' as const,
      value: Math.sqrt(g.trackCount) * 12,
      color: g.color || '#FFB3BA',
    }));

    // Create artist nodes - top artists as satellites (smaller)
    const artistNodes: Node[] = [];
    const links: Link[] = [];
    const usedArtists = new Set<string>();

    topGenres.slice(0, 8).forEach((genre) => {
      genre.artists.slice(0, 5).forEach((artist) => {
        const artistId = `artist-${artist.name}`;
        
        if (!usedArtists.has(artistId)) {
          artistNodes.push({
            id: artistId,
            name: artist.name,
            type: 'artist' as const,
            value: Math.sqrt(artist.trackCount) * 2.5,
            color: genre.color || '#FFB3BA',
          });

          links.push({
            source: artistId,
            target: `genre-${genre.name}`,
            value: 2,
          });

          usedArtists.add(artistId);
        }
      });
    });

    const nodes = [...genreNodes, ...artistNodes];

    // Create simulation
    const simulation = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide().radius((d: any) => d.value + 10)
      );

    // Add boundary force to keep nodes inside the container
    const padding = 50;
    simulation.on('tick', () => {
      nodes.forEach((d: any) => {
        const radius = d.value || 0;
        d.x = Math.max(padding + radius, Math.min(width - padding - radius, d.x));
        d.y = Math.max(padding + radius, Math.min(height - padding - radius, d.y));
      });

      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroup.attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);
    });

    // Draw links
    const link = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.15)')
      .attr('stroke-width', 1.5);

    // Draw nodes
    const nodeGroup = svg
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<any, Node>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (_, d) => setSelectedNode(d));

    // Node circles with glow
    nodeGroup
      .append('circle')
      .attr('r', (d) => d.value)
      .attr('fill', (d) => d.color)
      .attr('opacity', (d) => (d.type === 'genre' ? 0.85 : 0.7))
      .attr('filter', 'url(#glow)');

    // Labels
    nodeGroup
      .append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.value + 16)
      .attr('fill', 'white')
      .attr('font-size', (d) => (d.type === 'genre' ? '13px' : '10px'))
      .attr('font-weight', (d) => (d.type === 'genre' ? '600' : '400'))
      .attr('opacity', 0.9);

    simulationRef.current = simulation;

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, [topGenres, topArtists, loading, setGalaxyData]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2 text-white">Загрузка космической карты...</div>
          <div className="text-sm text-gray-400">Анализируем вашу музыку...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-400 mb-2">Ошибка</div>
          <div className="text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
          Карта вкуса
        </h1>

        {isAuthenticated === false && (
          <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200">
              Для просмотра любимых треков необходимо авторизоваться через
              Last.fm
            </p>
          </div>
        )}

        {isAuthenticated && (
          <button
            onClick={fetchLovedTracks}
            disabled={loading}
            className="px-6 py-3 bg-[#D51007] hover:bg-[#B00D06] disabled:bg-zinc-400 disabled:cursor-not-allowed text-white rounded-full font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Загрузка...
              </>
            ) : (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
                Показать любимые треки
              </>
            )}
          </button>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showTracks && lovedTracks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 overflow-y-auto"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                Любимые треки ({lovedTracks.length})
              </h2>
              <button
                onClick={() => setShowTracks(false)}
                className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Скрыть
              </button>
            </div>

            <div className="grid gap-3">
              {lovedTracks.map((track, index) => (
                <motion.div
                  key={`${track.name}-${track.artist["#text"]}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-800 rounded-lg hover:shadow-md transition-shadow"
                >
                  {track.image && track.image.length > 0 && (
                    <img
                      src={
                        track.image.find((img) => img.size === "medium")?.[
                          "#text"
                        ] ||
                        track.image[track.image.length - 1]["#text"] ||
                        ""
                      }
                      alt={track.name}
                      className="w-16 h-16 rounded object-cover"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-black dark:text-zinc-50 truncate">
                      {track.name}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                      {track.artist["#text"]}
                    </p>
                  </div>

                  <a
                    href={track.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#D51007] hover:bg-[#B00D06] text-white rounded-full text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    Открыть на Last.fm
                  </a>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {showTracks && lovedTracks.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 text-center text-zinc-600 dark:text-zinc-400"
          >
            <p>У вас пока нет любимых треков на Last.fm</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
