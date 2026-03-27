'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('courses', 'first_payment', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true, 
      defaultValue: null,
    });
    await queryInterface.addColumn('courses', 'quarterly_payment', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('courses', 'first_payment');
    await queryInterface.removeColumn('courses', 'quarterly_payment');
  }
};
