'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('courses', 'annual_discount_percentage', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 10,
      comment: 'Discount percentage for annual subscription plan'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('courses', 'annual_discount_percentage');
  }
};
