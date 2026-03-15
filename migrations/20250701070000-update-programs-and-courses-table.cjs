'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove 'title' and 'image_url' from 'programs' table
    await queryInterface.removeColumn('programs', 'uuid');
    await queryInterface.removeColumn('programs', 'title');
    await queryInterface.removeColumn('programs', 'image_url');

    // Add 'course_id' to 'programs' table
    await queryInterface.addColumn('programs', 'course_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // Add 'industry_insights' to 'programs' table
    await queryInterface.addColumn('programs', 'industry_insights', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Add 'content_type' to 'courses' table
    await queryInterface.addColumn('courses', 'content_type', {
      type: Sequelize.STRING,
      defaultValue: 'course',
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert 'content_type' from 'courses' table
    await queryInterface.removeColumn('courses', 'content_type');

    // Revert 'industry_insights' from 'programs' table
    await queryInterface.removeColumn('programs', 'industry_insights');

    // Revert 'course_id' from 'programs' table
    await queryInterface.removeColumn('programs', 'course_id');

    // Re-add 'title' and 'image_url' to 'programs' table
    await queryInterface.addColumn('programs', 'title', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('programs', 'image_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }
}; 