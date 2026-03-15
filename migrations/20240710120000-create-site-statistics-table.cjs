'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('site_statistics', {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      value: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      order: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Insert default values
    await queryInterface.bulkInsert('site_statistics', [
      {
        id: 1,
        title: 'Digital online offerings',
        value: '5000+',
        order: 1,
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2,
        title: 'Countries with registered edX learners',
        value: '200+',
        order: 2,
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 3,
        title: 'Of top world universities',
        value: '37',
        order: 3,
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 4,
        title: 'Learner networks',
        value: '91M+',
        order: 4,
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('site_statistics');
  }
}; 