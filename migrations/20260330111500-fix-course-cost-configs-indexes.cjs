'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const indexes = await queryInterface.showIndex('course_cost_configs');
    
    // Drop incorrect unique indexes
    const incorrectIndexes = [
      'uniq_provider_country_content_type_cost_config',
      'course_cost_configs_provider_id_country_code_content_type'
    ];

    for (const idxName of incorrectIndexes) {
      if (indexes.some(idx => idx.name === idxName)) {
        await queryInterface.removeIndex('course_cost_configs', idxName);
      }
    }

    // Ensure we have a correct unique index that includes course_id
    const hasCorrectUnique = indexes.some(idx => {
      if (!idx.unique || !Array.isArray(idx.fields)) return false;
      const cols = idx.fields.map(f => f.attribute);
      return cols.length === 3 && cols.includes('provider_id') && cols.includes('course_id') && cols.includes('country_code');
    });

    if (!hasCorrectUnique) {
      await queryInterface.addIndex('course_cost_configs', ['provider_id', 'course_id', 'country_code'], {
        unique: true,
        name: 'uniq_provider_course_country_cost_config'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // We don't want to re-add the incorrect ones.
  }
};
