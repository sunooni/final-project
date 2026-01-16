'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { useUserStore } from '@/app/stores/userStore';

interface Node {
  id: string;
  name: string;
  type: 'genre' | 'artist';
  value: number;
  color: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | Node;
  target: string | Node;
  value: number;
}

export const TasteMap = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { topGenres, topArtists, setGalaxyData } = useUserStore();

  useEffect(() => {
    fetchGalaxyData();
  }, []);

  const fetchGalaxyData = async () => {
    try {
      setLoading(true);
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

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || topGenres.length === 0) return;

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
      value: Math.sqrt(g.trackCount) * 12, // Large planets
      color: g.color || '#FFB3BA',
    }));

    // Create artist nodes - top artists as satellites (smaller)
    const artistNodes: Node[] = [];
    const links: Link[] = [];
    const usedArtists = new Set<string>();

    topGenres.slice(0, 8).forEach((genre) => {
      genre.artists.slice(0, 5).forEach((artist) => {
        const artistId = `artist-${artist.name}`;
        
        // Each artist belongs to only one genre (planet)
        if (!usedArtists.has(artistId)) {
          artistNodes.push({
            id: artistId,
            name: artist.name,
            type: 'artist' as const,
            value: Math.sqrt(artist.trackCount) * 2.5, // Smaller satellites
            color: genre.color || '#FFB3BA',
          });

          // Create link between artist and genre
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
      // Keep nodes within bounds
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

    return () => {
      simulation.stop();
    };
  }, [topGenres, topArtists]);

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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <h2 className="text-2xl font-bold text-white mb-2">
          Космическая Карта Вкуса
        </h2>
        <p className="text-sm text-gray-400">
          Планеты — жанры, спутники — артисты. Перетаскивайте для исследования.
        </p>
      </motion.div>

      <div className="flex-1 relative">
        <div
          ref={containerRef}
          className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-purple-950 to-black rounded-2xl overflow-hidden border border-white/10"
        >
          <svg ref={svgRef} className="w-full h-full" />
        </div>

        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm p-4 rounded-xl max-w-xs border border-white/20"
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedNode.color }}
              />
              <span className="font-semibold text-white">
                {selectedNode.name}
              </span>
            </div>
            <p className="text-sm text-gray-300">
              {selectedNode.type === 'genre' ? 'Жанр (Планета)' : 'Артист (Спутник)'}
            </p>
            <button
              onClick={() => setSelectedNode(null)}
              className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Закрыть
            </button>
          </motion.div>
        )}
      </div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 flex flex-wrap gap-4"
      >
        {topGenres.slice(0, 5).map((genre) => (
          <div key={genre.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: genre.color }}
            />
            <span className="text-sm text-gray-300">
              {genre.name} ({genre.trackCount} треков)
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};
