 'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('courses', 'program_card_title', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('courses', 'program_card_subtitle', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('courses', 'program_card_bullets', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('courses', 'program_card_caption', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('courses', 'program_card_info_url', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('courses', 'program_card_info_url');
    await queryInterface.removeColumn('courses', 'program_card_caption');
    await queryInterface.removeColumn('courses', 'program_card_bullets');
    await queryInterface.removeColumn('courses', 'program_card_subtitle');
    await queryInterface.removeColumn('courses', 'program_card_title');
  }
};

