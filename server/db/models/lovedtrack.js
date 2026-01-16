'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LovedTrack extends Model {
    static associate(models) {
      LovedTrack.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      LovedTrack.belongsTo(models.Track, { foreignKey: 'trackId', as: 'track' });
    }
  }
  LovedTrack.init(
    {
      userId: DataTypes.INTEGER,
      trackId: DataTypes.INTEGER,
      date: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'LovedTrack',
    }
  );
  return LovedTrack;
};
