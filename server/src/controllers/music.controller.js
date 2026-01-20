const serviceInstance = require('../services/service');

class MusicController {
  constructor(service) {
    this.service = service;
  }

  // User endpoints
  getUser = async (req, res) => {
    try {
      const { username } = req.params;
      const user = await this.service.getUserByLastfmUsername(username);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  createOrUpdateUser = async (req, res) => {
    try {
      const user = await this.service.createOrUpdateUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  // Loved tracks endpoints
  getUserLovedTracks = async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const result = await this.service.getUserLovedTracks(
        parseInt(userId),
        parseInt(limit),
        parseInt(offset)
      );
      // Serialize data to ensure track and artist names are included
      const tracks = result.rows.map(lovedTrack => ({
        id: lovedTrack.id,
        userId: lovedTrack.userId,
        trackId: lovedTrack.trackId,
        date: lovedTrack.date,
        createdAt: lovedTrack.createdAt,
        updatedAt: lovedTrack.updatedAt,
        track: lovedTrack.track ? {
          id: lovedTrack.track.id,
          name: lovedTrack.track.name,
          mbid: lovedTrack.track.mbid,
          url: lovedTrack.track.url,
          image: lovedTrack.track.image,
          duration: lovedTrack.track.duration,
          artist: lovedTrack.track.artist ? {
            id: lovedTrack.track.artist.id,
            name: lovedTrack.track.artist.name,
            mbid: lovedTrack.track.artist.mbid,
            url: lovedTrack.track.artist.url,
          } : null,
          album: lovedTrack.track.album ? {
            id: lovedTrack.track.album.id,
            title: lovedTrack.track.album.title,
            mbid: lovedTrack.track.album.mbid,
            image: lovedTrack.track.album.image,
          } : null,
        } : null,
      }));
      res.json({
        tracks,
        total: result.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  syncLovedTracks = async (req, res) => {
    try {
      const { userId } = req.params;
      const { tracks } = req.body;
      if (!Array.isArray(tracks)) {
        return res.status(400).json({ message: 'Tracks must be an array' });
      }
      const result = await this.service.syncLovedTracks(parseInt(userId), tracks);
      res.status(201).json({ message: 'Loved tracks synced', count: result.length });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  // Recent tracks endpoints
  getUserRecentTracks = async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const result = await this.service.getUserRecentTracks(
        parseInt(userId),
        parseInt(limit),
        parseInt(offset)
      );
      // Serialize data to ensure track and artist names are included
      const tracks = result.rows.map(recentTrack => ({
        id: recentTrack.id,
        userId: recentTrack.userId,
        trackId: recentTrack.trackId,
        playedAt: recentTrack.playedAt,
        createdAt: recentTrack.createdAt,
        updatedAt: recentTrack.updatedAt,
        track: recentTrack.track ? {
          id: recentTrack.track.id,
          name: recentTrack.track.name,
          mbid: recentTrack.track.mbid,
          url: recentTrack.track.url,
          image: recentTrack.track.image,
          duration: recentTrack.track.duration,
          artist: recentTrack.track.artist ? {
            id: recentTrack.track.artist.id,
            name: recentTrack.track.artist.name,
            mbid: recentTrack.track.artist.mbid,
            url: recentTrack.track.artist.url,
          } : null,
          album: recentTrack.track.album ? {
            id: recentTrack.track.album.id,
            title: recentTrack.track.album.title,
            mbid: recentTrack.track.album.mbid,
            image: recentTrack.track.album.image,
          } : null,
        } : null,
      }));
      res.json({
        tracks,
        total: result.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  syncRecentTracks = async (req, res) => {
    try {
      const { userId } = req.params;
      const { tracks } = req.body;
      if (!Array.isArray(tracks)) {
        return res.status(400).json({ message: 'Tracks must be an array' });
      }
      const result = await this.service.syncRecentTracks(parseInt(userId), tracks);
      res.status(201).json({ message: 'Recent tracks synced', count: result.length });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  // AI recommendations endpoint
  getTrackRecommendations = async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 5 } = req.query;
      
      console.log('=== getTrackRecommendations called ===');
      console.log('UserId:', userId, 'Limit:', limit);
      
      // Dynamic import for ES module
      const { getTrackRecommedations } = await import('../services/aiService.mjs');
      
      console.log('Function imported, calling...');
      const recommendations = await getTrackRecommedations(
        parseInt(userId),
        parseInt(limit)
      );
      
      console.log('Recommendations received, sending response');
      res.json({ recommendations });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  getUserRecentTracksByDateRange = async (req, res) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ 
          message: 'startDate and endDate are required' 
        });
      }

      const result = await this.service.getUserRecentTracksByDateRange(
        parseInt(userId),
        new Date(startDate),
        new Date(endDate)
      );

      // Сериализация данных (аналогично getUserRecentTracks)
      const tracks = result.rows.map(recentTrack => ({
        id: recentTrack.id,
        userId: recentTrack.userId,
        trackId: recentTrack.trackId,
        playedAt: recentTrack.playedAt,
        createdAt: recentTrack.createdAt,
        updatedAt: recentTrack.updatedAt,
        track: recentTrack.track ? {
          id: recentTrack.track.id,
          name: recentTrack.track.name,
          mbid: recentTrack.track.mbid,
          url: recentTrack.track.url,
          image: recentTrack.track.image,
          duration: recentTrack.track.duration,
          artist: recentTrack.track.artist ? {
            id: recentTrack.track.artist.id,
            name: recentTrack.track.artist.name,
            mbid: recentTrack.track.artist.mbid,
            url: recentTrack.track.artist.url,
          } : null,
          album: recentTrack.track.album ? {
            id: recentTrack.track.album.id,
            title: recentTrack.track.album.title,
            mbid: recentTrack.track.album.mbid,
            image: recentTrack.track.album.image,
          } : null,
        } : null,
      }));

      res.json({
        tracks,
        total: result.count,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  // AI chat endpoint
  chat = async (req, res) => {
    try {
      const { userId } = req.params;
      const { message, conversationHistory = [] } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: 'Message is required and must be a string' });
      }

      if (message.length > 1000) {
        return res.status(400).json({ message: 'Message is too long (max 1000 characters)' });
      }

      if (!Array.isArray(conversationHistory)) {
        return res.status(400).json({ message: 'conversationHistory must be an array' });
      }

      // Dynamic import for ES module
      const { chatWithAI } = await import('../services/aiService.mjs');
      
      const response = await chatWithAI(
        message,
        userId ? parseInt(userId) : null,
        conversationHistory
      );

      res.json({ response });
    } catch (error) {
      console.error('Error in chat:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
}

const musicController = new MusicController(serviceInstance);
module.exports = musicController;
