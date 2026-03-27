'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('courses');
    const boolCol = { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true };
    const amountCol = { type: Sequelize.DECIMAL(10, 2), allowNull: true };

    if (!table.payment_option_once_off) await queryInterface.addColumn('courses', 'payment_option_once_off', boolCol);
    if (!table.payment_option_thirty_sixty) await queryInterface.addColumn('courses', 'payment_option_thirty_sixty', boolCol);
    if (!table.payment_option_monthly_11) await queryInterface.addColumn('courses', 'payment_option_monthly_11', boolCol);
    if (!table.payment_option_quarterly_3) await queryInterface.addColumn('courses', 'payment_option_quarterly_3', boolCol);

    if (!table.payment_first_30_60) await queryInterface.addColumn('courses', 'payment_first_30_60', amountCol);
    if (!table.payment_second_30_60) await queryInterface.addColumn('courses', 'payment_second_30_60', amountCol);
    if (!table.payment_third_30_60) await queryInterface.addColumn('courses', 'payment_third_30_60', amountCol);
    if (!table.payment_first_monthly_11) await queryInterface.addColumn('courses', 'payment_first_monthly_11', amountCol);
    if (!table.payment_first_quarterly_3) await queryInterface.addColumn('courses', 'payment_first_quarterly_3', amountCol);
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('courses');
    const cols = [
      'payment_first_quarterly_3',
      'payment_first_monthly_11',
      'payment_third_30_60',
      'payment_second_30_60',
      'payment_first_30_60',
      'payment_option_quarterly_3',
      'payment_option_monthly_11',
      'payment_option_thirty_sixty',
      'payment_option_once_off',
    ];
    for (const col of cols) {
      if (table[col]) {
        await queryInterface.removeColumn('courses', col);
      }
    }
  },
};
