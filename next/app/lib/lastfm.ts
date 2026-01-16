import { cookies } from 'next/headers';
import { lastfmConfig } from '@/config/lastfm';
import crypto from 'crypto';

/**
 * Generate Last.fm API signature
 * @param params - Parameters to sign (excluding api_secret)
 * @param apiSecret - Shared secret from Last.fm
 * @returns MD5 hash signature
 */
export function generateApiSignature(
  params: Record<string, string>,
  apiSecret: string
): string {
  // Sort parameters alphabetically by name
  const sortedKeys = Object.keys(params).sort();
  
  // Concatenate in <name><value> format
  const stringToSign = sortedKeys
    .map(key => `${key}${params[key]}`)
    .join('');
  
  // Append secret and create MD5 hash
  const fullString = stringToSign + apiSecret;
  return crypto.createHash('md5').update(fullString, 'utf8').digest('hex');
}

/**
 * Get Last.fm session key from cookies
 * @returns Session key or null if not authenticated
 */
export async function getLastfmSessionKey(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionKey = cookieStore.get('lastfm_session_key');
  return sessionKey?.value || null;
}

/**
 * Get Last.fm username from cookies
 * @returns Username or null if not authenticated
 */
export async function getLastfmUsername(): Promise<string | null> {
  const cookieStore = await cookies();
  const username = cookieStore.get('lastfm_username');
  return username?.value || null;
}

/**
 * Make an authenticated Last.fm API call
 * @param method - API method name (e.g., 'user.getInfo')
 * @param params - Additional parameters (excluding api_key, sk, api_sig, format)
 * @returns API response data
 */
export async function callLastfmApi(
  method: string,
  params: Record<string, string> = {}
): Promise<any> {
  const sessionKey = await getLastfmSessionKey();
  
  if (!sessionKey) {
    throw new Error('Not authenticated with Last.fm');
  }

  const { apiKey, sharedSecret } = lastfmConfig;

  // Build parameters for the API call
  const apiParams: Record<string, string> = {
    method,
    api_key: apiKey,
    sk: sessionKey,
    ...params,
  };

  // Generate signature (excluding format parameter)
  const apiSig = generateApiSignature(apiParams, sharedSecret);
  apiParams.api_sig = apiSig;
  apiParams.format = 'json';

  // Build URL
  const url = new URL('https://ws.audioscrobbler.com/2.0/');
  Object.entries(apiParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  // Make request
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

  return data;
}
