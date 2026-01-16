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
    const [artist] = await this.Artist.findOrCreate({
      where: artistData.mbid ? { mbid: artistData.mbid } : { name: artistData.name },
      defaults: artistData,
    });

    if (!artist.mbid && artistData.mbid) {
      await artist.update({ mbid: artistData.mbid });
    }

    return artist;
  }

  // Album methods
  async findOrCreateAlbum(albumData, artistId) {
    const [album] = await this.Album.findOrCreate({
      where: albumData.mbid
        ? { mbid: albumData.mbid }
        : { title: albumData.title, artistId },
      defaults: { ...albumData, artistId },
    });

    return album;
  }

  // Track methods
  async findOrCreateTrack(trackData, artistId, albumId = null) {
    const [track] = await this.Track.findOrCreate({
      where: trackData.mbid
        ? { mbid: trackData.mbid }
        : { name: trackData.name, artistId },
      defaults: { ...trackData, artistId, albumId },
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
    }

    return results;
  }

  async syncRecentTracks(userId, tracksData) {
    const results = [];

    for (const trackData of tracksData) {
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
    }

    return results;
  }
}

const musicService = new MusicService(models);
module.exports = musicService;
