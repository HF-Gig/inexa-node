'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Insert 'Course' type into program_types
    const uuid = uuidv4();
    await queryInterface.bulkInsert('program_types', [{
      uuid: uuid,
      name: 'Course',
      slug: 'course',
      coaching_supported: false
    }], {});

    // 2. Get the id of the inserted type
    const [results] = await queryInterface.sequelize.query(
      "SELECT id FROM program_types WHERE slug = 'course' ORDER BY id DESC LIMIT 1;"
    );
    const courseTypeId = results[0]?.id;

    // 3. Update all courses with content_type='course' to have this type_id
    if (courseTypeId) {
      await queryInterface.sequelize.query(
        `UPDATE courses SET type_id = ${courseTypeId} WHERE content_type = 'course'`
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // 1. Remove type_id from courses where it matches the 'Course' type
    const [results] = await queryInterface.sequelize.query(
      "SELECT id FROM program_types WHERE slug = 'course' ORDER BY id DESC LIMIT 1;"
    );
    const courseTypeId = results[0]?.id;
    if (courseTypeId) {
      await queryInterface.sequelize.query(
        `UPDATE courses SET type_id = NULL WHERE type_id = ${courseTypeId}`
      );
      await queryInterface.bulkDelete('program_types', { id: courseTypeId });
    }
  }
};
