'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `exchange_rates`;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `standard_pricing`;');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('exchange_rates', {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      country_code: {
        type: Sequelize.STRING(3),
        allowNull: false,
      },
      country_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      currency_code: {
        type: Sequelize.STRING(3),
        allowNull: false,
      },
      currency_symbol: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      rate: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('standard_pricing', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      first_payment_usd: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 333,
      },
      quarterly_payment_usd: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 222,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },
};
