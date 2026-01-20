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
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      trackId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Tracks',
          key: 'id',
        },
      },
      playedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'RecentTrack',
      timestamps: true,
    }
  );
  return RecentTrack;
};
