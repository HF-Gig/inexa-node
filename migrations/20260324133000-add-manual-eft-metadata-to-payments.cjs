'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('payments');

    if (!table.payment_method) {
      await queryInterface.addColumn('payments', 'payment_method', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!table.selected_plan) {
      await queryInterface.addColumn('payments', 'selected_plan', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!table.installment_label) {
      await queryInterface.addColumn('payments', 'installment_label', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!table.installment_number) {
      await queryInterface.addColumn('payments', 'installment_number', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!table.total_installments) {
      await queryInterface.addColumn('payments', 'total_installments', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!table.due_date) {
      await queryInterface.addColumn('payments', 'due_date', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('payments', 'due_date');
    await queryInterface.removeColumn('payments', 'total_installments');
    await queryInterface.removeColumn('payments', 'installment_number');
    await queryInterface.removeColumn('payments', 'installment_label');
    await queryInterface.removeColumn('payments', 'selected_plan');
    await queryInterface.removeColumn('payments', 'payment_method');
  },
};
