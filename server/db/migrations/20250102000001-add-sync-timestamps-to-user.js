'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'lovedTracksLastSyncedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    
    await queryInterface.addColumn('Users', 'recentTracksLastSyncedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'lovedTracksLastSyncedAt');
    await queryInterface.removeColumn('Users', 'recentTracksLastSyncedAt');
  },
};
