import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const require = createRequire(import.meta.url);
const musicService = require('./service.js');

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error('OPENROUTER_API_KEY is not set in environment variables');
}

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey,
});

const SYSTEM_PROMPT = 'Отвечай максимально кратко и лаконично. Экономь токены, избегай лишних слов и объяснений.';
const MAX_TRACKS_FOR_PROMPT = 50;

export async function getTrackRecommedations(userId, limit = 5) {
  // Получаем любимые треки пользователя
  const lovedTracksResult = await musicService.getUserLovedTracks(userId, MAX_TRACKS_FOR_PROMPT, 0);

  // Формируем список треков
  const tracksList = lovedTracksResult.rows
    ?.filter((lovedTrack) => lovedTrack.track?.artist)
    .map((lovedTrack) => `${lovedTrack.track.artist.name} - ${lovedTrack.track.name}`) || [];

  if (tracksList.length === 0) {
    return 'У пользователя пока нет треков в базе данных для анализа.';
  }

  // Формируем промпт для ИИ
  const tracksText = tracksList.slice(0, MAX_TRACKS_FOR_PROMPT).join(', ');
  const userPrompt = `Пользователь слушает следующие треки: ${tracksText}. Порекомендуй ${limit} похожих треков в формате "Исполнитель - Название трека". Только список треков, без объяснений.`;

  // Запрашиваем рекомендации у ИИ
  const apiResponse = await client.chat.completions.create({
    model: 'xiaomi/mimo-v2-flash:free',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  const recommendations = apiResponse.choices?.[0]?.message?.content;
  
  if (!recommendations) {
    return 'Не удалось получить рекомендации от ИИ.';
  }

  return recommendations;
}