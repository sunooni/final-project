'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      lastfmUsername: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      lastfmSessionKey: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      provider: {
        type: Sequelize.ENUM('lastfm', 'yandex'),
        defaultValue: 'lastfm',
      },
      playcount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      country: {
        type: Sequelize.STRING,
      },
      realname: {
        type: Sequelize.STRING,
      },
      image: {
        type: Sequelize.TEXT,
      },
      url: {
        type: Sequelize.TEXT,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Users');
  },
};
