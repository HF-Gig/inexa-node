'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const subs = await queryInterface.describeTable('subscriptions');
    if (!subs.paystack_authorization_code) {
      await queryInterface.addColumn('subscriptions', 'paystack_authorization_code', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }
    if (!subs.paystack_customer_code) {
      await queryInterface.addColumn('subscriptions', 'paystack_customer_code', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }

    const pay = await queryInterface.describeTable('payments');
    if (!pay.paystack_parent_reference) {
      await queryInterface.addColumn('payments', 'paystack_parent_reference', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('payments', 'paystack_parent_reference').catch(() => {});
    await queryInterface.removeColumn('subscriptions', 'paystack_customer_code').catch(() => {});
    await queryInterface.removeColumn('subscriptions', 'paystack_authorization_code').catch(() => {});
  },
};
