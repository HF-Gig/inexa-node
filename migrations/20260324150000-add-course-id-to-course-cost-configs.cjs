'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('course_cost_configs');
    if (!table.course_id) {
      await queryInterface.addColumn('course_cost_configs', 'course_id', {
        type: Sequelize.BIGINT,
        allowNull: true,
        after: 'provider_id',
      });
    }

    const indexes = await queryInterface.showIndex('course_cost_configs');
    const oldUniqueIndex = indexes.find((idx) => {
      if (!idx.unique || !Array.isArray(idx.fields)) return false;
      const cols = idx.fields.map((f) => f.attribute);
      return cols.length === 2 && cols[0] === 'provider_id' && cols[1] === 'country_code';
    });
    if (oldUniqueIndex) {
      await queryInterface.removeIndex('course_cost_configs', oldUniqueIndex.name);
    }

    const hasNewUnique = indexes.some((idx) => {
      if (!idx.unique || !Array.isArray(idx.fields)) return false;
      const cols = idx.fields.map((f) => f.attribute);
      return cols.length === 3 && cols[0] === 'provider_id' && cols[1] === 'course_id' && cols[2] === 'country_code';
    });
    if (!hasNewUnique) {
      await queryInterface.addIndex('course_cost_configs', ['provider_id', 'course_id', 'country_code'], {
        unique: true,
        name: 'uniq_provider_course_country_cost_config',
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('course_cost_configs');
    const newUniqueIndex = indexes.find((idx) => idx.name === 'uniq_provider_course_country_cost_config');
    if (newUniqueIndex) {
      await queryInterface.removeIndex('course_cost_configs', 'uniq_provider_course_country_cost_config');
    }

    const hasOldUnique = indexes.some((idx) => {
      if (!idx.unique || !Array.isArray(idx.fields)) return false;
      const cols = idx.fields.map((f) => f.attribute);
      return cols.length === 2 && cols[0] === 'provider_id' && cols[1] === 'country_code';
    });
    if (!hasOldUnique) {
      await queryInterface.addIndex('course_cost_configs', ['provider_id', 'country_code'], {
        unique: true,
        name: 'uniq_provider_country_cost_config',
      });
    }

    const table = await queryInterface.describeTable('course_cost_configs');
    if (table.course_id) {
      await queryInterface.removeColumn('course_cost_configs', 'course_id');
    }
  },
};

