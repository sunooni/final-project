'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Album extends Model {
    static associate(models) {
      Album.belongsTo(models.Artist, { foreignKey: 'artistId', as: 'artist' });
      Album.hasMany(models.Track, { foreignKey: 'albumId', as: 'tracks' });
    }
  }
  Album.init(
    {
      title: DataTypes.STRING,
      artistId: DataTypes.INTEGER,
      mbid: DataTypes.STRING,
      url: DataTypes.TEXT,
      image: DataTypes.TEXT,
      playcount: DataTypes.INTEGER,
      listeners: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'Album',
    }
  );
  return Album;
};
