const { Router } = require('express');
const musicController = require('../controllers/music.controller');
const musicRouter = Router();

// User routes
musicRouter.route('/users/:username').get(musicController.getUser);
musicRouter.route('/users').post(musicController.createOrUpdateUser);

// Loved tracks routes
musicRouter.route('/users/:userId/loved-tracks').get(musicController.getUserLovedTracks);
musicRouter.route('/users/:userId/loved-tracks/sync').post(musicController.syncLovedTracks);

// Recent tracks routes
musicRouter.route('/users/:userId/recent-tracks').get(musicController.getUserRecentTracks);
musicRouter.route('/users/:userId/recent-tracks/sync').post(musicController.syncRecentTracks);

// AI recommendations route
musicRouter.route('/users/:userId/recommendations').get(musicController.getTrackRecommendations);

// AI chat route
musicRouter.route('/users/:userId/chat').post(musicController.chat);
musicRouter.route('/chat').post(musicController.chat);

musicRouter.route('/users/:userId/recent-tracks/date-range').get(musicController.getUserRecentTracksByDateRange);

module.exports = musicRouter;
