// Last.fm API configuration
export const lastfmConfig = {
  apiKey: process.env.LASTFM_API_KEY || 'd38420f1e6d8a0c76363a8f9b218040f',
  sharedSecret: process.env.LASTFM_SHARED_SECRET || 'eed0d8ec74e9e7393be602ebc50cb8cc',
  redirectUri: process.env.LASTFM_REDIRECT_URI || 'http://localhost:3000/api/auth/lastfm/callback',
};
