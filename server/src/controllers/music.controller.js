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
      res.json({
        tracks: result.rows,
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
      res.json({
        tracks: result.rows,
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
}

const musicController = new MusicController(serviceInstance);
module.exports = musicController;
