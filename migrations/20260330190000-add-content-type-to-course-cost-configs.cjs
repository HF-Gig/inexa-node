'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('course_cost_configs');

    // 1. Add the content_type column if missing
    if (!table.content_type) {
      await queryInterface.addColumn('course_cost_configs', 'content_type', {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'all',
      });
    }

    // 2. Drop the old 3-column unique index (without content_type) if it exists
    const indexes = await queryInterface.showIndex('course_cost_configs');
    const oldIndex = indexes.find(idx => idx.name === 'uniq_provider_course_country_cost_config');
    if (oldIndex) {
      await queryInterface.removeIndex('course_cost_configs', 'uniq_provider_course_country_cost_config');
    }

    // 3. Add the correct 4-column unique index (with content_type)
    const hasCorrectIndex = indexes.some(idx =>
      idx.name === 'uniq_provider_course_country_content_type_cost_config'
    );
    if (!hasCorrectIndex) {
      await queryInterface.addIndex(
        'course_cost_configs',
        ['provider_id', 'course_id', 'country_code', 'content_type'],
        {
          unique: true,
          name: 'uniq_provider_course_country_content_type_cost_config',
        }
      );
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('course_cost_configs');

    // Remove the 4-column index
    const newIndex = indexes.find(idx => idx.name === 'uniq_provider_course_country_content_type_cost_config');
    if (newIndex) {
      await queryInterface.removeIndex('course_cost_configs', 'uniq_provider_course_country_content_type_cost_config');
    }

    // Restore the 3-column index
    const oldIndex = indexes.find(idx => idx.name === 'uniq_provider_course_country_cost_config');
    if (!oldIndex) {
      await queryInterface.addIndex(
        'course_cost_configs',
        ['provider_id', 'course_id', 'country_code'],
        {
          unique: true,
          name: 'uniq_provider_course_country_cost_config',
        }
      );
    }

    // Remove the content_type column
    const table = await queryInterface.describeTable('course_cost_configs');
    if (table.content_type) {
      await queryInterface.removeColumn('course_cost_configs', 'content_type');
    }
  },
};
