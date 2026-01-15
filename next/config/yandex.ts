// Yandex OAuth configuration
export const yandexConfig = {
  clientId: process.env.YANDEX_CLIENT_ID || '4cdea5ba909c42509a74cdb8394e644c',
  clientSecret: process.env.YANDEX_CLIENT_SECRET || '143a887702a34973bb97e0ffce4e81ee',
  redirectUri: process.env.YANDEX_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
};

