'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.LovedTrack, { foreignKey: 'userId', as: 'lovedTracks' });
      User.hasMany(models.RecentTrack, { foreignKey: 'userId', as: 'recentTracks' });
    }
  }
  User.init(
    {
      lastfmUsername: DataTypes.STRING,
      lastfmSessionKey: DataTypes.STRING,
      provider: DataTypes.ENUM('lastfm', 'yandex'),
      playcount: DataTypes.INTEGER,
      country: DataTypes.STRING,
      realname: DataTypes.STRING,
      image: DataTypes.TEXT,
      url: DataTypes.TEXT,
      lovedTracksLastSyncedAt: DataTypes.DATE,
      recentTracksLastSyncedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'User',
    }
  );
  return User;
};
