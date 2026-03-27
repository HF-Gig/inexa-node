'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('inexa_facilitators', 'created_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('inexa_facilitators', 'updated_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('inexa_facilitators', 'created_at');
    await queryInterface.removeColumn('inexa_facilitators', 'updated_at');
  }
};
