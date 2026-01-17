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
    // Normalize empty mbid to null to avoid unique constraint violations
    const normalizedMbid = albumData.mbid && albumData.mbid.trim() !== '' ? albumData.mbid : null;
    const normalizedData = { ...albumData, mbid: normalizedMbid, artistId };

    const [album] = await this.Album.findOrCreate({
      where: normalizedMbid
        ? { mbid: normalizedMbid }
        : { title: albumData.title, artistId },
      defaults: normalizedData,
    });

    return album;
  }

  // Track methods
  async findOrCreateTrack(trackData, artistId, albumId = null) {
    // Normalize empty mbid to null to avoid unique constraint violations
    const normalizedMbid = trackData.mbid && trackData.mbid.trim() !== '' ? trackData.mbid : null;
    const normalizedData = { ...trackData, mbid: normalizedMbid, artistId, albumId };

    const [track] = await this.Track.findOrCreate({
      where: normalizedMbid
        ? { mbid: normalizedMbid }
        : { name: trackData.name, artistId },
      defaults: normalizedData,
    });

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
    return this.RecentTrack.create({
      userId,
      trackId,
      playedAt: playedAt || new Date(),
    });
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
              image: Array.isArray(albumData.image)
                ? albumData.image.find((img) => img.size === 'medium')?.['#text'] ||
                  albumData.image[albumData.image.length - 1]?.['#text']
                : albumData.image,
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
            image: Array.isArray(trackData.image)
              ? trackData.image.find((img) => img.size === 'medium')?.['#text'] ||
                trackData.image[trackData.image.length - 1]?.['#text']
              : trackData.image,
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
              image: Array.isArray(albumData.image)
                ? albumData.image.find((img) => img.size === 'medium')?.['#text'] ||
                  albumData.image[albumData.image.length - 1]?.['#text']
                : albumData.image,
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
            image: Array.isArray(trackData.image)
              ? trackData.image.find((img) => img.size === 'medium')?.['#text'] ||
                trackData.image[trackData.image.length - 1]?.['#text']
              : trackData.image,
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

    return results;
  }
}

const musicService = new MusicService(models);
module.exports = musicService;
