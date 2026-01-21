import { NextResponse } from 'next/server';
import { getLastfmUsername } from '@/app/lib/lastfm';

interface Track {
  name: string;
  artist: string;
  url: string;
  mbid?: string | null;
  image?: string | null;
  date?: string | null;
  source?: string; // кто добавил трек
}

interface PlaylistOptions {
  friends: string[];
  strategy: 'common' | 'diverse' | 'balanced' | 'discovery';
  limit: number;
}

export async function POST(request: Request) {
  try {
    const username = await getLastfmUsername();
    
    if (!username) {
      return NextResponse.json(
        { error: 'Not authenticated with Last.fm' },
        { status: 401 }
      );
    }

    const { friends, strategy, limit }: PlaylistOptions = await request.json();

    if (!friends || friends.length === 0) {
      return NextResponse.json(
        { error: 'At least one friend is required' },
        { status: 400 }
      );
    }

    // Получаем любимые треки пользователя
    const userTracksResponse = await fetch(`${request.url.split('/api')[0]}/api/lastfm/user/loved-tracks?limit=100`);
    const userTracksData = await userTracksResponse.json();
    const userTracks: Track[] = (userTracksData.tracks || []).map((track: any) => ({
      ...track,
      source: username
    }));

    // Получаем любимые треки друзей
    const friendsTracks: Track[] = [];
    for (const friend of friends) {
      try {
        const friendTracksResponse = await fetch(`${request.url.split('/api')[0]}/api/lastfm/user/friend-loved-tracks?username=${friend}&limit=100`);
        const friendTracksData = await friendTracksResponse.json();
        const tracks = (friendTracksData.tracks || []).map((track: any) => ({
          ...track,
          source: friend
        }));
        friendsTracks.push(...tracks);
      } catch (error) {
        console.error(`Error fetching tracks for ${friend}:`, error);
      }
    }

    // Генерируем плейлист на основе стратегии
    let playlist: Track[] = [];
    
    switch (strategy) {
      case 'common':
        playlist = generateCommonPlaylist(userTracks, friendsTracks, limit);
        break;
      case 'diverse':
        playlist = generateDiversePlaylist(userTracks, friendsTracks, limit);
        break;
      case 'balanced':
        playlist = generateBalancedPlaylist(userTracks, friendsTracks, limit, [username, ...friends]);
        break;
      case 'discovery':
        playlist = generateDiscoveryPlaylist(userTracks, friendsTracks, limit);
        break;
      default:
        playlist = generateBalancedPlaylist(userTracks, friendsTracks, limit, [username, ...friends]);
    }

    return NextResponse.json({
      playlist,
      strategy,
      participants: [username, ...friends],
      totalTracks: playlist.length,
      metadata: {
        userTracksCount: userTracks.length,
        friendsTracksCount: friendsTracks.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating collaborative playlist:', error);
    return NextResponse.json(
      { error: 'Failed to generate playlist' },
      { status: 500 }
    );
  }
}

// Стратегия: общие треки (пересечения)
function generateCommonPlaylist(userTracks: Track[], friendsTracks: Track[], limit: number): Track[] {
  const commonTracks: Track[] = [];
  const trackMap = new Map<string, Track>();

  // Создаем карту треков пользователя
  userTracks.forEach(track => {
    const key = `${track.artist.toLowerCase()}-${track.name.toLowerCase()}`;
    trackMap.set(key, track);
  });

  // Ищем пересечения с треками друзей
  friendsTracks.forEach(track => {
    const key = `${track.artist.toLowerCase()}-${track.name.toLowerCase()}`;
    if (trackMap.has(key) && !commonTracks.some(t => 
      t.artist.toLowerCase() === track.artist.toLowerCase() && 
      t.name.toLowerCase() === track.name.toLowerCase()
    )) {
      commonTracks.push(trackMap.get(key)!);
    }
  });

  return commonTracks.slice(0, limit);
}

// Стратегия: разнообразие (уникальные треки от каждого)
function generateDiversePlaylist(userTracks: Track[], friendsTracks: Track[], limit: number): Track[] {
  const allTracks = [...userTracks, ...friendsTracks];
  const uniqueTracks = new Map<string, Track>();

  allTracks.forEach(track => {
    const key = `${track.artist.toLowerCase()}-${track.name.toLowerCase()}`;
    if (!uniqueTracks.has(key)) {
      uniqueTracks.set(key, track);
    }
  });

  return Array.from(uniqueTracks.values())
    .sort(() => Math.random() - 0.5) // перемешиваем
    .slice(0, limit);
}

// Стратегия: сбалансированный (равное количество от каждого участника)
function generateBalancedPlaylist(userTracks: Track[], friendsTracks: Track[], limit: number, participants: string[]): Track[] {
  const tracksPerParticipant = Math.floor(limit / participants.length);
  const playlist: Track[] = [];

  // Группируем треки по участникам
  const tracksByParticipant = new Map<string, Track[]>();
  
  userTracks.forEach(track => {
    const source = track.source!;
    if (!tracksByParticipant.has(source)) {
      tracksByParticipant.set(source, []);
    }
    tracksByParticipant.get(source)!.push(track);
  });

  friendsTracks.forEach(track => {
    const source = track.source!;
    if (!tracksByParticipant.has(source)) {
      tracksByParticipant.set(source, []);
    }
    tracksByParticipant.get(source)!.push(track);
  });

  // Добавляем треки от каждого участника
  participants.forEach(participant => {
    const tracks = tracksByParticipant.get(participant) || [];
    const shuffled = tracks.sort(() => Math.random() - 0.5);
    playlist.push(...shuffled.slice(0, tracksPerParticipant));
  });

  // Добавляем оставшиеся треки если нужно
  const remaining = limit - playlist.length;
  if (remaining > 0) {
    const allRemaining = [...userTracks, ...friendsTracks]
      .filter(track => !playlist.some(p => 
        p.artist.toLowerCase() === track.artist.toLowerCase() && 
        p.name.toLowerCase() === track.name.toLowerCase()
      ))
      .sort(() => Math.random() - 0.5);
    
    playlist.push(...allRemaining.slice(0, remaining));
  }

  return playlist.sort(() => Math.random() - 0.5); // финальное перемешивание
}

// Стратегия: открытия (треки, которые пользователь не слушал)
function generateDiscoveryPlaylist(userTracks: Track[], friendsTracks: Track[], limit: number): Track[] {
  const userTrackKeys = new Set(
    userTracks.map(track => `${track.artist.toLowerCase()}-${track.name.toLowerCase()}`)
  );

  const discoveryTracks = friendsTracks.filter(track => {
    const key = `${track.artist.toLowerCase()}-${track.name.toLowerCase()}`;
    return !userTrackKeys.has(key);
  });

  // Убираем дубликаты
  const uniqueDiscovery = new Map<string, Track>();
  discoveryTracks.forEach(track => {
    const key = `${track.artist.toLowerCase()}-${track.name.toLowerCase()}`;
    if (!uniqueDiscovery.has(key)) {
      uniqueDiscovery.set(key, track);
    }
  });

  return Array.from(uniqueDiscovery.values())
    .sort(() => Math.random() - 0.5)
    .slice(0, limit);
}