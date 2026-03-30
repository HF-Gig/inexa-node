'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('courses');

    if (!table.full_description) {
      await queryInterface.addColumn('courses', 'full_description', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('courses', 'full_description').catch(() => {});
  },
};