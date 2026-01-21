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
const KEYWORDS = ['подскажи', 'подсказать','посоветуй', 'посоветовать', 'порекомендуй', 'порекомендовать', 'рекомендации', 'рекомендацию', 'совет'];


function isRecommendationRequest(message) {
  const lowerMessage = message.toLowerCase();
  return KEYWORDS.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Определяет, нужен ли поиск в интернете для ответа
 * Проверяет упоминание дат после октября 2024 или ключевые слова о текущих событиях
 */
function needsWebSearch(message) {
  const lowerMessage = message.toLowerCase();
  
  // Проверяем упоминание дат после октября 2024
  const datePatterns = [
    /\b(2024\s*(ноября|декабря|ноябрь|декабрь))\b/i,
    /\b(2025|2026|2027|2028|2029|2030)\b/,
    /\b(ноябрь|декабрь)\s*2024\b/i,
    /\b(январь|февраль|март|апрель|май|июнь|июль|август|сентябрь|октябрь|ноябрь|декабрь)\s*2025\b/i,
  ];
  
  if (datePatterns.some(pattern => pattern.test(message))) {
    return true;
  }
  
  // Проверяем ключевые слова о текущих событиях
  const currentEventKeywords = [
    'новости', 'события', 'произошло', 'случилось', 'вышло', 'релиз',
    'альбом', 'сингл', 'трек', 'музыка', 'артист', 'исполнитель',
    'концерт', 'тур', 'фестиваль', 'награда', 'премия'
  ];
  
  // Если есть упоминание даты и ключевых слов о событиях
  const hasDate = /\d{4}|\d{1,2}\s*(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/i.test(message);
  const hasEventKeyword = currentEventKeywords.some(keyword => lowerMessage.includes(keyword));
  
  if (hasDate && hasEventKeyword) {
    return true;
  }
  
  // Явный запрос на актуальную информацию
  const explicitSearchKeywords = [
    'актуальн', 'свеж', 'новое', 'недавн', 'последн', 'что сейчас',
    'что происходит', 'что случилось', 'что вышло'
  ];
  
  if (explicitSearchKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return true;
  }
  
  return false;
}

/**
 * Проверяет, указывает ли ответ ИИ на отсутствие данных о будущем или актуальной информации
 */
function indicatesMissingData(response) {
  if (!response) return false;
  
  const lowerResponse = response.toLowerCase();
  
  // Фразы, которые указывают на отсутствие данных
  const missingDataPatterns = [
    /не могу предоставить/i,
    /не могу дать/i,
    /мои данные не/i,
    /не охватывают/i,
    /данные до/i,
    /не знаю/i,
    /не имею/i,
    /не располагаю/i,
    /недоступн/i,
    /нет информации/i,
    /нет данных/i,
    /ограничен/i,
    /не включают/i,
    /не содержат/i,
    /не получаю/i,
    /не обновляю/i,
    /не имею доступа/i,
    /не могу найти/i,
    /нет сведений/i,
  ];
  
  return missingDataPatterns.some(pattern => pattern.test(lowerResponse));
}

/**
 * Выполняет поиск в интернете через DuckDuckGo Instant Answer API
 */
async function searchWeb(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`DuckDuckGo API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.AbstractText) {
      return {
        summary: data.AbstractText,
        source: data.AbstractURL || '',
      };
    }
    
    return null;
  } catch (error) {
    console.error('Web search error:', error);
    return null;
  }
}

/**
 * Выполняет поиск через DuckDuckGo HTML (более надежный метод)
 */
async function searchWebDuckDuckGoHTML(query) {
  try {
    // Используем DuckDuckGo HTML поиск через их поисковую страницу
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const html = await response.text();
    
    // Простой парсинг результатов (извлекаем первые несколько результатов)
    const resultPattern = /<a class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    const results = [];
    let match;
    let count = 0;
    
    while ((match = resultPattern.exec(html)) !== null && count < 3) {
      results.push({
        title: match[2].trim(),
        url: match[1]
      });
      count++;
    }
    
    if (results.length > 0) {
      // Извлекаем сниппеты из описаний
      const snippetPattern = /<a class="result__snippet"[^>]*>([^<]+)<\/a>/g;
      const snippets = [];
      let snippetMatch;
      let snippetCount = 0;
      
      while ((snippetMatch = snippetPattern.exec(html)) !== null && snippetCount < 3) {
        snippets.push(snippetMatch[1].trim());
        snippetCount++;
      }
      
      const summary = snippets.length > 0 
        ? snippets.join('. ') 
        : results.map(r => r.title).join('. ');
      
      return {
        summary: summary.substring(0, 800),
        source: results[0].url,
        results: results
      };
    }
    
    return null;
  } catch (error) {
    console.error('DuckDuckGo HTML search error:', error);
    return null;
  }
}

/**
 * Выполняет поиск через SerpAPI (если есть API ключ)
 */
async function searchWebSerpAPI(query) {
  const serpApiKey = process.env.SERP_API_KEY;
  
  if (!serpApiKey) {
    return null;
  }
  
  try {
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${serpApiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.organic_results && data.organic_results.length > 0) {
      const topResults = data.organic_results.slice(0, 3);
      const summary = topResults.map(r => r.snippet || r.title).join('. ');
      
      return {
        summary: summary.substring(0, 1000),
        source: topResults[0].link,
        results: topResults.map(r => ({ url: r.link, title: r.title }))
      };
    }
    
    return null;
  } catch (error) {
    console.error('SerpAPI search error:', error);
    return null;
  }
}

/**
 * Альтернативный метод поиска через Tavily API (если есть API ключ)
 */
async function searchWebTavily(query) {
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  
  if (!tavilyApiKey) {
    console.log('Tavily API key not found, skipping Tavily search');
    return null; // Fallback на DuckDuckGo
  }
  
  try {
    console.log('Searching with Tavily API for:', query);
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: query,
        search_depth: 'advanced', // Используем advanced для более глубокого поиска
        max_results: 10, // Увеличиваем количество результатов
        include_answer: true, // Включаем автоматический ответ
        include_raw_content: false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Tavily API error: ${response.status}`, errorText);
      throw new Error(`Tavily API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Используем answer если доступен (более точный ответ)
    if (data.answer) {
      console.log(`Tavily API returned answer: ${data.answer.substring(0, 100)}...`);
      let summary = data.answer;
      
      // Добавляем результаты если есть
      if (data.results && data.results.length > 0) {
        const resultsText = data.results.slice(0, 5).map(r => r.content).join('\n\n');
        summary = data.answer + '\n\nДополнительная информация:\n' + resultsText;
      }
      
      return {
        summary: summary.substring(0, 2000), // Увеличиваем лимит для более полной информации
        source: data.results && data.results[0] ? data.results[0].url : '',
        results: data.results ? data.results.map(r => ({ url: r.url, title: r.title })) : []
      };
    }
    
    if (data.results && data.results.length > 0) {
      console.log(`Tavily API found ${data.results.length} results`);
      // Объединяем содержимое всех результатов для более полной информации
      const summary = data.results.map(r => {
        const title = r.title ? `[${r.title}]: ` : '';
        return title + r.content;
      }).join('\n\n');
      
      return {
        summary: summary.substring(0, 2000), // Увеличиваем лимит
        source: data.results[0].url || '',
        results: data.results.map(r => ({ url: r.url, title: r.title }))
      };
    }
    
    console.log('Tavily API returned no results');
    return null;
  } catch (error) {
    console.error('Tavily search error:', error);
    return null;
  }
}

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

export async function chatWithAI(message, userId = null, conversationHistory = []) {
  // Если есть запрос на рекомендации и userId, используем функцию рекомендаций
  if (isRecommendationRequest(message) && userId) {
    try {
      const recommendations = await getTrackRecommedations(userId, 5);
      return `Вот 5 треков, которые могут тебе понравиться:\n\n${recommendations}`;
    } catch (error) {
      // Если ошибка при получении рекомендаций, продолжаем обычный чат
      console.error('Error getting recommendations:', error);
    }
  }

  // Обычная логика чата
  const systemPrompt = userId 
    ? 'Ты музыкальный ассистент. У тебя есть доступ к данным пользователя. Помогай с рекомендациями, анализом вкусов и статистикой.'
    : 'Ты музыкальный ассистент. Помогаешь пользователям с рекомендациями музыки, анализом вкусов и статистикой.';

  // ШАГ 1: Всегда сначала выполняем поиск в интернете для получения актуальной информации
  // Улучшаем поисковый запрос для музыкальных вопросов
  console.log('Performing web search for:', message);
  
  // Формируем улучшенный поисковый запрос для музыкальных вопросов
  let searchQuery = message;
  
  // Если вопрос о релизе/альбоме/сингле артиста, добавляем ключевые слова для более точного поиска
  const musicKeywords = ['релиз', 'альбом', 'сингл', 'трек', 'песня', 'вышел', 'вышла', 'выпустил', 'выпустила'];
  const hasMusicKeyword = musicKeywords.some(keyword => message.toLowerCase().includes(keyword));
  
  if (hasMusicKeyword) {
    // Добавляем контекст для более точного поиска
    searchQuery = message + ' музыка релиз альбом 2024 2025';
  }
  
  let webSearchResults = null;
  
  // Метод 1: Tavily API (самый надежный, если настроен)
  webSearchResults = await searchWebTavily(searchQuery);
  
  // Метод 2: SerpAPI (если настроен)
  if (!webSearchResults) {
    webSearchResults = await searchWebSerpAPI(searchQuery);
  }
  
  // Метод 3: DuckDuckGo Instant Answer API
  if (!webSearchResults) {
    webSearchResults = await searchWeb(searchQuery);
  }
  
  // Метод 4: DuckDuckGo HTML парсинг (fallback)
  if (!webSearchResults) {
    webSearchResults = await searchWebDuckDuckGoHTML(searchQuery);
  }
  
  // Если поиск не дал результатов, пробуем более простой запрос
  if (!webSearchResults) {
    console.log('Trying simpler search query');
    const simpleQuery = message.split(' ').slice(0, 5).join(' '); // Первые 5 слов
    webSearchResults = await searchWebTavily(simpleQuery);
    if (!webSearchResults) {
      webSearchResults = await searchWeb(simpleQuery);
    }
  }

  // ШАГ 2: Формируем сообщение с актуальной информацией из интернета
  let enhancedMessage = message;
  let searchContext = '';
  
  if (webSearchResults && webSearchResults.summary) {
    console.log('Web search successful, summary length:', webSearchResults.summary.length);
    console.log('Web search summary preview:', webSearchResults.summary.substring(0, 200));
    
    // Более явный формат для передачи информации из интернета
    const currentDate = new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
    searchContext = `\n\n=== АКТУАЛЬНАЯ ИНФОРМАЦИЯ ИЗ ИНТЕРНЕТА (${currentDate}) ===\n` +
      `ВАЖНО: Эта информация получена из интернета и является актуальной. ОБЯЗАТЕЛЬНО используй её для ответа.\n\n` +
      `${webSearchResults.summary}`;
    
    if (webSearchResults.source) {
      searchContext += `\n\nИсточник: ${webSearchResults.source}`;
    }
    
    if (webSearchResults.results && webSearchResults.results.length > 0) {
      searchContext += `\n\nДополнительные источники:`;
      webSearchResults.results.slice(0, 3).forEach((r, i) => {
        searchContext += `\n${i + 1}. ${r.title || r.url}: ${r.url}`;
      });
    }
    
    searchContext += `\n=== КОНЕЦ ИНФОРМАЦИИ ИЗ ИНТЕРНЕТА ===\n`;
    
    enhancedMessage = `${message}\n\n${searchContext}`;
  } else {
    console.log('No web search results found, but will still try to answer');
    // Даже если поиск не дал результатов, добавляем контекст
    searchContext = `\n\nВАЖНО: Твои данные ограничены до октября 2024 года. Если вопрос касается событий после этой даты, укажи, что у тебя нет актуальной информации, или попробуй ответить на основе имеющихся данных.`;
    enhancedMessage = message + searchContext;
  }

  // ШАГ 3: ИИ отвечает, используя актуальную информацию из интернета (если она есть) и свои знания
  // Более строгий промпт для использования информации из интернета
  const enhancedSystemPrompt = systemPrompt + 
    '\n\nКРИТИЧЕСКИ ВАЖНО:' +
    '\n1. Если в сообщении пользователя есть раздел "=== АКТУАЛЬНАЯ ИНФОРМАЦИЯ ИЗ ИНТЕРНЕТА ===", ОБЯЗАТЕЛЬНО используй эту информацию для ответа.' +
    '\n2. Информация из интернета имеет АБСОЛЮТНЫЙ ПРИОРИТЕТ над твоими знаниями.' +
    '\n3. НЕ упоминай, что твои данные ограничены, если информация из интернета предоставлена - просто используй её.' +
    '\n4. Отвечай точно и конкретно на основе предоставленной информации из интернета.' +
    '\n5. Если информация из интернета противоречит твоим знаниям, используй информацию из интернета.' +
    '\n6. Отвечай кратко, но полно и точно.';
  
  const messages = [
    { role: 'system', content: enhancedSystemPrompt },
    ...conversationHistory,
    { role: 'user', content: enhancedMessage }
  ];

  const apiResponse = await client.chat.completions.create({
    model: 'xiaomi/mimo-v2-flash:free',
    messages,
  });

  const aiResponse = apiResponse.choices?.[0]?.message?.content || 'Не удалось получить ответ от ИИ.';
  
  // Логируем ответ для отладки
  console.log('AI Response length:', aiResponse.length);
  console.log('AI Response preview:', aiResponse.substring(0, 200));
  
  // Проверяем, использует ли ИИ информацию из интернета
  if (webSearchResults && webSearchResults.summary) {
    const responseLower = aiResponse.toLowerCase();
    
    // Проверяем, содержит ли ответ ключевые слова из поиска
    const summaryKeywords = webSearchResults.summary.split(' ').slice(0, 10).filter(w => w.length > 3);
    const hasKeywords = summaryKeywords.some(keyword => responseLower.includes(keyword.toLowerCase()));
    
    if (!hasKeywords && indicatesMissingData(aiResponse)) {
      console.warn('WARNING: AI response may not be using web search results!');
      console.warn('Response contains missing data indicators but web search was performed');
    } else if (hasKeywords) {
      console.log('✓ AI response appears to use web search results');
    }
  }
  
  return aiResponse;
}
