'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('subscriptions');
    if (!tableDescription.name) {
      await queryInterface.addColumn('subscriptions', 'name', {
        type: Sequelize.TEXT,
        allowNull: false,
        after: 'id'
      });
    }
    if (!tableDescription.country) {
      await queryInterface.addColumn('subscriptions', 'country', {
        type: Sequelize.TEXT,
        allowNull: true,
        after: 'name'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('subscriptions', 'name');
    await queryInterface.removeColumn('subscriptions', 'country');
  }
};
