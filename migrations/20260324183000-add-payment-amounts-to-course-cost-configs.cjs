'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('course_cost_configs');
    const amountColumn = { type: Sequelize.DECIMAL(10, 2), allowNull: true };

    if (!table.payment_once_off_amount) {
      await queryInterface.addColumn('course_cost_configs', 'payment_once_off_amount', amountColumn);
    }
    if (!table.payment_first_30_60) {
      await queryInterface.addColumn('course_cost_configs', 'payment_first_30_60', amountColumn);
    }
    if (!table.payment_second_30_60) {
      await queryInterface.addColumn('course_cost_configs', 'payment_second_30_60', amountColumn);
    }
    if (!table.payment_third_30_60) {
      await queryInterface.addColumn('course_cost_configs', 'payment_third_30_60', amountColumn);
    }
    if (!table.payment_first_monthly_11) {
      await queryInterface.addColumn('course_cost_configs', 'payment_first_monthly_11', amountColumn);
    }
    if (!table.payment_first_quarterly_3) {
      await queryInterface.addColumn('course_cost_configs', 'payment_first_quarterly_3', amountColumn);
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('course_cost_configs');
    const cols = [
      'payment_first_quarterly_3',
      'payment_first_monthly_11',
      'payment_third_30_60',
      'payment_second_30_60',
      'payment_first_30_60',
      'payment_once_off_amount',
    ];
    for (const col of cols) {
      if (table[col]) {
        await queryInterface.removeColumn('course_cost_configs', col);
      }
    }
  },
};
