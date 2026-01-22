const models = require('../../db/models');

class MusicService {
  constructor({ User, Track, Artist, Album, LovedTrack, RecentTrack }) {
    this.User = User;
    this.Track = Track;
    this.Artist = Artist;
    this.Album = Album;
    this.LovedTrack = LovedTrack;
    this.RecentTrack = RecentTrack;
  }

  // Helper method to extract valid image URL from Last.fm image array
  extractImageUrl(imageData) {
    if (!imageData) return null;
    
    // If it's already a string, check if it's valid
    if (typeof imageData === 'string') {
      return imageData.trim() !== '' && !this.isPlaceholderImage(imageData) ? imageData : null;
    }
    
    // If it's an array, find the best available image
    if (Array.isArray(imageData)) {
      // Try to find images in order of preference: large, extralarge, medium, small
      const preferredSizes = ['large', 'extralarge', 'medium', 'small'];
      
      for (const size of preferredSizes) {
        const img = imageData.find((img) => img.size === size);
        if (img && img['#text'] && img['#text'].trim() !== '' && !this.isPlaceholderImage(img['#text'])) {
          return img['#text'];
        }
      }
      
      // If no preferred size found, try the last non-empty image
      for (let i = imageData.length - 1; i >= 0; i--) {
        const img = imageData[i];
        if (img && img['#text'] && img['#text'].trim() !== '' && !this.isPlaceholderImage(img['#text'])) {
          return img['#text'];
        }
      }
    }
    
    return null;
  }

  // Check if image URL is a placeholder (Last.fm uses specific placeholder IDs)
  isPlaceholderImage(url) {
    if (!url || typeof url !== 'string') return true;
    // Last.fm placeholder images often contain these IDs or are empty
    const placeholderPatterns = [
      '2a96cbd8b46e442fc41c2b86b821562f', // Common Last.fm placeholder
      'c6f59c1e5e7240a4c0d427abd71f3dbb', // Another placeholder
      '4128a6eb29f94943c9d206c08e625904', // Another placeholder
    ];
    return placeholderPatterns.some(pattern => url.includes(pattern));
  }

  // User methods
  async getUserByLastfmUsername(username) {
    return this.User.findOne({ where: { lastfmUsername: username } });
  }

  async createOrUpdateUser(userData) {
    const [user, created] = await this.User.findOrCreate({
      where: { lastfmUsername: userData.lastfmUsername },
      defaults: userData,
    });

    if (!created) {
      await user.update(userData);
    }

    return user;
  }

  // Artist methods
  async findOrCreateArtist(artistData) {
    // Normalize empty mbid to null to avoid unique constraint violations
    const normalizedMbid = artistData.mbid && artistData.mbid.trim() !== '' ? artistData.mbid : null;
    const normalizedData = { ...artistData, mbid: normalizedMbid };

    const [artist] = await this.Artist.findOrCreate({
      where: normalizedMbid ? { mbid: normalizedMbid } : { name: artistData.name },
      defaults: normalizedData,
    });

    if (!artist.mbid && normalizedMbid) {
      await artist.update({ mbid: normalizedMbid });
    }

    return artist;
  }

  // Album methods
  async findOrCreateAlbum(albumData, artistId) {
    // Convert empty mbid strings to null to avoid unique constraint violations
    const normalizedAlbumData = {
      ...albumData,
      mbid: albumData.mbid && albumData.mbid.trim() !== '' ? albumData.mbid : null,
    };

    const [album, created] = await this.Album.findOrCreate({
      where: normalizedAlbumData.mbid
        ? { mbid: normalizedAlbumData.mbid }
        : { title: normalizedAlbumData.title, artistId },
      defaults: { ...normalizedAlbumData, artistId },
    });

    // Update image if it's missing or if new image is provided
    if (!created && normalizedAlbumData.image && (!album.image || album.image.trim() === '')) {
      await album.update({ image: normalizedAlbumData.image });
    } else if (!created && normalizedAlbumData.image && album.image !== normalizedAlbumData.image) {
      // Update image if new one is provided (optional - can be removed if you don't want to overwrite existing images)
      await album.update({ image: normalizedAlbumData.image });
    }

    return album;
  }

  // Track methods
  async findOrCreateTrack(trackData, artistId, albumId = null) {
    // Convert empty mbid strings to null to avoid unique constraint violations
    const normalizedTrackData = {
      ...trackData,
      mbid: trackData.mbid && trackData.mbid.trim() !== '' ? trackData.mbid : null,
    };

    const [track, created] = await this.Track.findOrCreate({
      where: normalizedTrackData.mbid
        ? { mbid: normalizedTrackData.mbid }
        : { name: normalizedTrackData.name, artistId },
      defaults: { ...normalizedTrackData, artistId, albumId },
    });

    // Update image if it's missing or if new image is provided
    if (!created && normalizedTrackData.image && (!track.image || track.image.trim() === '')) {
      await track.update({ image: normalizedTrackData.image });
    } else if (!created && normalizedTrackData.image && track.image !== normalizedTrackData.image) {
      // Update image if new one is provided (optional - can be removed if you don't want to overwrite existing images)
      await track.update({ image: normalizedTrackData.image });
    }

    return track;
  }

  // LovedTrack methods
  async getUserLovedTracks(userId, limit = 50, offset = 0) {
    return this.LovedTrack.findAndCountAll({
      where: { userId },
      include: [
        {
          model: this.Track,
          as: 'track',
          include: [
            { model: this.Artist, as: 'artist' },
            { model: this.Album, as: 'album' },
          ],
        },
      ],
      order: [['date', 'DESC']],
      limit,
      offset,
    });
  }

  async addLovedTrack(userId, trackId, date = null) {
    const [lovedTrack] = await this.LovedTrack.findOrCreate({
      where: { userId, trackId },
      defaults: { userId, trackId, date: date || new Date() },
    });

    return lovedTrack;
  }

  async removeLovedTrack(userId, trackId) {
    return this.LovedTrack.destroy({
      where: { userId, trackId },
    });
  }

  // RecentTrack methods
  async getUserRecentTracks(userId, limit = 50, offset = 0) {
    return this.RecentTrack.findAndCountAll({
      where: { userId },
      include: [
        {
          model: this.Track,
          as: 'track',
          include: [
            { model: this.Artist, as: 'artist' },
            { model: this.Album, as: 'album' },
          ],
        },
      ],
      order: [['playedAt', 'DESC']],
      limit,
      offset,
    });
  }

  async addRecentTrack(userId, trackId, playedAt) {
    // Use findOrCreate with userId, trackId, and playedAt to allow same track at different times
    // But check if playedAt is provided, otherwise use current time
    const playedAtDate = playedAt || new Date();
    
    const [recentTrack, created] = await this.RecentTrack.findOrCreate({
      where: {
        userId,
        trackId,
        playedAt: playedAtDate,
      },
      defaults: {
        userId,
        trackId,
        playedAt: playedAtDate,
      },
    });
    
    return recentTrack;
  }

  // Sync methods for Last.fm data
  async syncLovedTracks(userId, tracksData) {
    const results = [];

    for (const trackData of tracksData) {
      try {
        // Find or create artist
        const artist = await this.findOrCreateArtist({
          name: trackData.artist['#text'] || trackData.artist.name,
          mbid: trackData.artist.mbid,
          url: trackData.artist.url || trackData.url,
        });

        // Find or create album if exists
        let album = null;
        if (trackData.album) {
          const albumData = Array.isArray(trackData.album) ? trackData.album[0] : trackData.album;
          album = await this.findOrCreateAlbum(
            {
              title: albumData.title || albumData['#text'],
              mbid: albumData.mbid,
              url: albumData.url,
              image: this.extractImageUrl(albumData.image),
            },
            artist.id
          );
        }

        // Find or create track
        const track = await this.findOrCreateTrack(
          {
            name: trackData.name,
            mbid: trackData.mbid,
            url: trackData.url,
            image: this.extractImageUrl(trackData.image),
            duration: trackData.duration,
          },
          artist.id,
          album?.id
        );

        // Add to loved tracks
        const lovedTrack = await this.addLovedTrack(
          userId,
          track.id,
          trackData.date ? new Date(parseInt(trackData.date.uts) * 1000) : null
        );

        results.push(lovedTrack);
      } catch (error) {
        console.error(`Error syncing track "${trackData.name}" by "${trackData.artist['#text'] || trackData.artist.name}":`, error.message);
        // Continue with other tracks even if one fails
      }
    }

    // Update last sync timestamp
    try {
      await this.User.update(
        { lovedTracksLastSyncedAt: new Date() },
        { where: { id: userId } }
      );
    } catch (error) {
      console.error('Error updating lovedTracksLastSyncedAt:', error.message);
    }

    return results;
  }

  async syncRecentTracks(userId, tracksData) {
    const results = [];

    for (const trackData of tracksData) {
      try {
        // Find or create artist
        const artist = await this.findOrCreateArtist({
          name: trackData.artist['#text'] || trackData.artist.name,
          mbid: trackData.artist.mbid,
          url: trackData.artist.url || trackData.url,
        });

        // Find or create album if exists
        let album = null;
        if (trackData.album) {
          const albumData = Array.isArray(trackData.album) ? trackData.album[0] : trackData.album;
          album = await this.findOrCreateAlbum(
            {
              title: albumData.title || albumData['#text'],
              mbid: albumData.mbid,
              url: albumData.url,
              image: this.extractImageUrl(albumData.image),
            },
            artist.id
          );
        }

        // Find or create track
        const track = await this.findOrCreateTrack(
          {
            name: trackData.name,
            mbid: trackData.mbid,
            url: trackData.url,
            image: this.extractImageUrl(trackData.image),
            duration: trackData.duration,
          },
          artist.id,
          album?.id
        );

        // Add recent track
        const playedAt = trackData.date
          ? new Date(parseInt(trackData.date.uts) * 1000)
          : new Date();
        const recentTrack = await this.addRecentTrack(userId, track.id, playedAt);

        results.push(recentTrack);
      } catch (error) {
        console.error(`Error syncing recent track "${trackData.name}" by "${trackData.artist['#text'] || trackData.artist.name}":`, error.message);
        // Continue with other tracks even if one fails
      }
    }

    // Update last sync timestamp
    try {
      await this.User.update(
        { recentTracksLastSyncedAt: new Date() },
        { where: { id: userId } }
      );
    } catch (error) {
      console.error('Error updating recentTracksLastSyncedAt:', error.message);
    }

    return results;
  }

  async getUserRecentTracksByDateRange(userId, startDate, endDate) {
    const { Op } = require('sequelize');

    return this.RecentTrack.findAndCountAll({
      where: {
        userId,
        playedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        {
          model: this.Track,
          as: 'track',
          include: [
            { model: this.Artist, as: 'artist' },
            { model: this.Album, as: 'album' },           
          ],
        },
      ],
      order: [['playedAt', 'ASC']]
    });
  }
}

const musicService = new MusicService(models);
module.exports = musicService;
