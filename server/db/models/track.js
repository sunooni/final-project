'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Track extends Model {
    static associate(models) {
      Track.belongsTo(models.Artist, { foreignKey: 'artistId', as: 'artist' });
      Track.belongsTo(models.Album, { foreignKey: 'albumId', as: 'album' });
      Track.hasMany(models.LovedTrack, { foreignKey: 'trackId', as: 'lovedBy' });
      Track.hasMany(models.RecentTrack, { foreignKey: 'trackId', as: 'recentPlays' });
    }
  }
  Track.init(
    {
      name: DataTypes.STRING,
      artistId: DataTypes.INTEGER,
      albumId: DataTypes.INTEGER,
      mbid: DataTypes.STRING,
      url: DataTypes.TEXT,
      image: DataTypes.TEXT,
      duration: DataTypes.INTEGER,
      playcount: DataTypes.INTEGER,
      listeners: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'Track',
    }
  );
  return Track;
};
