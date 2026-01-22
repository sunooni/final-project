import { cookies } from 'next/headers';
import { lastfmConfig } from '@/config/lastfm';
import CryptoJS from 'crypto-js';


interface CacheEntry {
  data: any;
  expiresAt: number;
}

const apiCache = new Map<string, CacheEntry>();

const DEFAULT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const CACHE_TTL_BY_METHOD: Record<string, number> = {
  'user.getFriends': 10 * 60 * 1000, // 10 minutes
  'user.getLovedTracks': 15 * 60 * 1000, // 15 minutes
  'user.getRecentTracks': 1 * 60 * 1000, // 1 minute (reduced for real-time updates)
  'user.getTopArtists': 15 * 60 * 1000, // 15 minutes
  'artist.getInfo': 30 * 60 * 1000, // 30 minutes
  'track.getInfo': 30 * 60 * 1000, // 30 minutes
  'user.getInfo': 15 * 60 * 1000, // 15 minutes
};


function generateCacheKey(method: string, params: Record<string, string>): string {

  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return `lastfm:${method}:${sortedParams}`;
}


function getCachedData(key: string): any | null {
  const entry = apiCache.get(key);
  
  if (!entry) {
    return null;
  }
  
  if (Date.now() > entry.expiresAt) {
    
    apiCache.delete(key);
    return null;
  }
  
  return entry.data;
}


function setCachedData(key: string, data: any, ttl: number): void {
  apiCache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
}


function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of apiCache.entries()) {
    if (now > entry.expiresAt) {
      apiCache.delete(key);
    }
  }
}

if (typeof setInterval !== 'undefined') {
  setInterval(cleanupCache, 3 * 60 * 1000);
}

export function generateApiSignature(
  params: Record<string, string>,
  apiSecret: string
): string {
  
  const sortedKeys = Object.keys(params).sort();
  
  
  const stringToSign = sortedKeys
    .map(key => `${key}${params[key]}`)
    .join('');
  
  
  const fullString = stringToSign + apiSecret;
  return CryptoJS.MD5(fullString).toString();
}

export async function getLastfmSessionKey(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionKey = cookieStore.get('lastfm_session_key');
  return sessionKey?.value || null;
}

export async function getLastfmUsername(): Promise<string | null> {
  const cookieStore = await cookies();
  const username = cookieStore.get('lastfm_username');
  return username?.value || null;
}

export async function callLastfmApi(
  method: string,
  params: Record<string, string> = {},
  options: { useCache?: boolean; cacheTTL?: number } = {}
): Promise<any> {
  const { useCache = true, cacheTTL } = options;

  const sessionKey = await getLastfmSessionKey();
  
  if (!sessionKey) {
    throw new Error('Not authenticated with Last.fm');
  }

  const { apiKey, sharedSecret } = lastfmConfig;
  
  if (!apiKey || !sharedSecret) {
    throw new Error('Last.fm API configuration is missing');
  }

  // Формируем параметры для кеша (без api_sig и format, так как они не влияют на результат)
  const cacheParams: Record<string, string> = {
    method,
    api_key: apiKey,
    sk: sessionKey,
    ...params,
  };
  const cacheKey = generateCacheKey(method, cacheParams);

  // Проверяем кеш после генерации ключа
  if (useCache) {
    const cachedData = getCachedData(cacheKey);
    if (cachedData !== null) {
      return cachedData;
    }
  }

  // Формируем параметры для запроса (добавляем api_sig и format)
  const apiParams: Record<string, string> = {
    ...cacheParams,
  };
  const apiSig = generateApiSignature(apiParams, sharedSecret);
  apiParams.api_sig = apiSig;
  apiParams.format = 'json';

  const url = new URL('https://ws.audioscrobbler.com/2.0/');
  Object.entries(apiParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Last.fm API error: ${errorText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Last.fm API error: ${data.message || data.error}`);
  }

  if (useCache) {
    const ttl = cacheTTL || CACHE_TTL_BY_METHOD[method] || DEFAULT_CACHE_TTL;
    setCachedData(cacheKey, data, ttl);
  }

  return data;
}

export async function callLastfmPublicApi(
  method: string,
  params: Record<string, string> = {},
  options: { useCache?: boolean; cacheTTL?: number } = {}
): Promise<any> {
  const { useCache = true, cacheTTL } = options;
  
  const cacheKey = generateCacheKey(method, params);
  
  if (useCache) {
    const cachedData = getCachedData(cacheKey);
    if (cachedData !== null) {
      return cachedData;
    }
  }

  const { apiKey } = lastfmConfig;
  
  if (!apiKey) {
    throw new Error('Last.fm API key is missing');
  }

  const url = new URL('https://ws.audioscrobbler.com/2.0/');
  url.searchParams.set('method', method);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('format', 'json');
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Last.fm API error: ${errorText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Last.fm API error: ${data.message || data.error}`);
  }

  if (useCache) {
    const ttl = cacheTTL || CACHE_TTL_BY_METHOD[method] || DEFAULT_CACHE_TTL;
    setCachedData(cacheKey, data, ttl);
  }

  return data;
}
