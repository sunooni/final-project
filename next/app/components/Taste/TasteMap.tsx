"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { motion } from "framer-motion";
import { useUserStore } from "@/app/stores/userStore";

interface Node {
  id: string;
  name: string;
  type: "genre" | "artist";
  value: number;
  color: string;
  ulr?: string;
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
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

export const TasteMap = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<any>(null);
  const dataFetchedRef = useRef(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { topGenres, topArtists, setGalaxyData, dataTimestamp } =
    useUserStore();

  useEffect(() => {
    // Проверяем, есть ли уже данные в store и не устарели ли они
    const hasData = topGenres.length > 0;
    const isDataFresh =
      hasData &&
      dataTimestamp !== undefined &&
      Date.now() - dataTimestamp < CACHE_DURATION;

    if (isDataFresh) {
      // Данные уже есть в store и свежие, используем их сразу
      setLoading(false);
      dataFetchedRef.current = true;
      return;
    }

    // Загружаем данные только если их нет или они устарели
    if (!dataFetchedRef.current) {
      dataFetchedRef.current = true;

      const getUserId = async (): Promise<string | null> => {
        try {
          const response = await fetch("/api/auth/user");
          const data = await response.json();
          return data.user?.id?.toString() || null;
        } catch {
          return null;
        }
      };

      const waitForSyncCompletion = async (userId: string): Promise<number> => {
        // Проверяем количество треков в БД и ждем стабилизации
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/music";
        
        let previousCount = -1; // Начальное значение -1 для первой итерации
        let stableIterations = 0;
        const maxWaitTime = 30000; // Максимальное время ожидания: 30 секунд
        const checkInterval = 1000; // Проверяем каждую секунду
        const stableIterationsRequired = 3; // Количество стабильных проверок подряд
        const startTime = Date.now();
        let firstCheck = true;

        while (Date.now() - startTime < maxWaitTime) {
          try {
            const response = await fetch(
              `${apiUrl}/users/${userId}/loved-tracks?limit=1&offset=0`
            );

            if (response.ok) {
              const data = await response.json();
              const currentCount = data.total || 0;

              if (firstCheck) {
                // Первая проверка - просто запоминаем количество
                previousCount = currentCount;
                firstCheck = false;
                console.log(`Initial tracks count: ${currentCount}`);
                
                // Если треков 0, ждем немного, чтобы дать время синхронизации начаться
                if (currentCount === 0) {
                  console.log("No tracks found, waiting for sync to start...");
                  await new Promise((resolve) => setTimeout(resolve, 3000)); // Ждем 3 секунды
                  continue; // Пропускаем эту итерацию и проверяем снова
                }
              } else if (currentCount === previousCount) {
                // Количество не изменилось
                stableIterations++;
                console.log(`Tracks count stable (${stableIterations}/${stableIterationsRequired}): ${currentCount}`);
                if (stableIterations >= stableIterationsRequired) {
                  // Количество стабилизировалось, синхронизация завершена
                  console.log(`Sync completed. Total tracks: ${currentCount}`);
                  return currentCount;
                }
              } else {
                // Количество изменилось, сбрасываем счетчик стабильности
                stableIterations = 0;
                previousCount = currentCount;
                console.log(`Tracks count changed: ${currentCount}`);
              }
            }
          } catch (error) {
            console.error("Error checking sync status:", error);
          }

          await new Promise((resolve) => setTimeout(resolve, checkInterval));
        }

        // Если время истекло, возвращаем последнее известное количество
        console.log(`Sync wait timeout. Final count: ${previousCount}`);
        return previousCount >= 0 ? previousCount : 0;
      };

      const fetchGalaxyData = async () => {
        try {
          setLoading(true);
          setError(null);

          // Ждем завершения синхронизации перед загрузкой данных
          const userId = await getUserId();
          if (userId) {
            setError("Ожидание завершения синхронизации треков...");
            await waitForSyncCompletion(userId);
            setError(null);
          }

          const response = await fetch("/api/database/galaxy");

          if (!response.ok) {
            if (response.status === 401) {
              setError("Необходима авторизация через Last.fm");
              setLoading(false);
              return;
            }

            // Try to parse error response as JSON, fallback to status text
            let errorMessage = "Ошибка загрузки данных";
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } catch {
              // If response is not JSON (e.g., 404 HTML page), use status text
              errorMessage = `Ошибка ${response.status}: ${
                response.statusText || "Не удалось загрузить данные"
              }`;
            }

            setError(errorMessage);
            setLoading(false);
            return;
          }

          const data = await response.json();
          if (data.genres && data.genres.length > 0) {
            setGalaxyData(data.genres);
          } else {
            setError(
              "Нет данных для отображения. Добавьте любимые треки на Last.fm"
            );
          }
        } catch (err) {
          console.error("Error fetching galaxy data:", err);
          setError(
            err instanceof Error ? err.message : "Ошибка при загрузке данных"
          );
        } finally {
          setLoading(false);
        }
      };

      fetchGalaxyData();
    }
  }, [topGenres.length, dataTimestamp, setGalaxyData]);

  // Отдельный useEffect для рендеринга визуализации
  useEffect(() => {
    // Рендерим визуализацию когда данные загружены
    if (
      loading ||
      !svgRef.current ||
      !containerRef.current ||
      topGenres.length === 0
    ) {
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
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Create gradient definitions
    const defs = svg.append("defs");

    // Add stars background
    const starsGroup = svg.append("g").attr("class", "stars");

    // Generate random stars
    const starCount = 200;
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 0.5;
      const opacity = Math.random() * 0.7 + 0.3;

      starsGroup
        .append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", size)
        .attr("fill", "white")
        .attr("opacity", opacity)
        .append("animate")
        .attr("attributeName", "opacity")
        .attr("values", `${opacity};${opacity * 0.3};${opacity}`)
        .attr("dur", `${Math.random() * 3 + 2}s`)
        .attr("repeatCount", "indefinite");
    }

    // Glow filter
    const filter = defs
      .append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");

    filter
      .append("feGaussianBlur")
      .attr("stdDeviation", "4")
      .attr("result", "coloredBlur");

    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Create nodes - genres as planets (bigger)
    const genreNodes: Node[] = topGenres.slice(0, 8).map((g) => ({
      id: `genre-${g.name}`,
      name: g.name,
      type: "genre" as const,
      value: Math.sqrt(g.trackCount) * 24,
      color: g.color || "#FFB3BA",
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
            type: "artist" as const,
            value: Math.sqrt(artist.trackCount) * 4.5,
            color: genre.color || "#FFB3BA",
            url: artist.url,
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
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d: any) => d.value + 10)
      );

    // Add boundary force to keep nodes inside the container
    const padding = 50;
    simulation.on("tick", () => {
      nodes.forEach((d: any) => {
        const radius = d.value || 0;
        d.x = Math.max(
          padding + radius,
          Math.min(width - padding - radius, d.x)
        );
        d.y = Math.max(
          padding + radius,
          Math.min(height - padding - radius, d.y)
        );
      });

      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeGroup.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
    });

    // Draw links
    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "rgba(255, 255, 255, 0.15)")
      .attr("stroke-width", 1.5);

    // Draw nodes
    const nodeGroup = svg
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<any, Node>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (_, d) => setSelectedNode(d));

    // Node circles with glow
    nodeGroup
      .append("circle")
      .attr("r", (d) => d.value)
      .attr("fill", (d) => d.color)
      .attr("opacity", (d) => (d.type === "genre" ? 0.85 : 0.7))
      .attr("filter", "url(#glow)");

    // Labels
    nodeGroup
      .append("text")
      .text((d) => d.name)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.value + 16)
      .attr("fill", "white")
      .attr("font-size", (d) => (d.type === "genre" ? "13px" : "10px"))
      .attr("font-weight", (d) => (d.type === "genre" ? "600" : "400"))
      .attr("opacity", 0.9);

    simulationRef.current = simulation;

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, [topGenres, topArtists, loading]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2 text-white">
            Загрузка космической карты...
          </div>
          <div className="text-sm text-gray-400">
            Анализируем вашу музыку...
          </div>
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
              {selectedNode.type === "genre"
                ? "Жанр (Планета)"
                : "Артист (Спутник)"}
            </p>
            {selectedNode.type === "artist" && selectedNode.url && (
              <a
                href={selectedNode.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors underline"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Открыть на Last.fm
              </a>
            )}
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setSelectedNode(null)}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Закрыть
              </button>
            </div>
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
