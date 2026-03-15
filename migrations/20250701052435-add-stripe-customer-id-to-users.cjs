'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'stripe_customer_id', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'email' // or after another column if you want to specify position
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'stripe_customer_id');
  }
};
