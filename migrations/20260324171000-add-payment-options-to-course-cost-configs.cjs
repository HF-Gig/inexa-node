'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('course_cost_configs');

    if (!table.payment_option_once_off) {
      await queryInterface.addColumn('course_cost_configs', 'payment_option_once_off', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    if (!table.payment_option_thirty_sixty) {
      await queryInterface.addColumn('course_cost_configs', 'payment_option_thirty_sixty', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    if (!table.payment_option_monthly_11) {
      await queryInterface.addColumn('course_cost_configs', 'payment_option_monthly_11', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    if (!table.payment_option_quarterly_3) {
      await queryInterface.addColumn('course_cost_configs', 'payment_option_quarterly_3', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('course_cost_configs');

    if (table.payment_option_quarterly_3) {
      await queryInterface.removeColumn('course_cost_configs', 'payment_option_quarterly_3');
    }

    if (table.payment_option_monthly_11) {
      await queryInterface.removeColumn('course_cost_configs', 'payment_option_monthly_11');
    }

    if (table.payment_option_thirty_sixty) {
      await queryInterface.removeColumn('course_cost_configs', 'payment_option_thirty_sixty');
    }

    if (table.payment_option_once_off) {
      await queryInterface.removeColumn('course_cost_configs', 'payment_option_once_off');
    }
  },
};
