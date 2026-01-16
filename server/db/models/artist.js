'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Artist extends Model {
    static associate(models) {
      Artist.hasMany(models.Track, { foreignKey: 'artistId', as: 'tracks' });
      Artist.hasMany(models.Album, { foreignKey: 'artistId', as: 'albums' });
    }
  }
  Artist.init(
    {
      name: DataTypes.STRING,
      mbid: DataTypes.STRING,
      url: DataTypes.TEXT,
      image: DataTypes.TEXT,
      playcount: DataTypes.INTEGER,
      listeners: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'Artist',
    }
  );
  return Artist;
};
