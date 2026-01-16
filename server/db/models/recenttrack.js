'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RecentTrack extends Model {
    static associate(models) {
      RecentTrack.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      RecentTrack.belongsTo(models.Track, { foreignKey: 'trackId', as: 'track' });
    }
  }
  RecentTrack.init(
    {
      userId: DataTypes.INTEGER,
      trackId: DataTypes.INTEGER,
      playedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'RecentTrack',
    }
  );
  return RecentTrack;
};
