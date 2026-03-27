'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('course_cost_configs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      provider_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      country_code: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: 'DEFAULT',
      },
      self_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      self_caption: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      interactive_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      interactive_caption: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      payment_type_self: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      payment_type_interactive: {
        type: Sequelize.STRING,
        allowNull: true,
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

    await queryInterface.addIndex('course_cost_configs', ['provider_id', 'country_code'], {
      unique: true,
      name: 'uniq_provider_country_cost_config',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('course_cost_configs');
  },
};
