'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Insert edX provider
    await queryInterface.bulkInsert('course_providers', [
      {
        name: 'edx',
        logo_url: '/uploads/edx.png',
        slug: 'edx',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      }
    ]);

    // Get the inserted edX provider id
    const [edx] = await queryInterface.sequelize.query(
      "SELECT id FROM course_providers WHERE slug = 'edx' ORDER BY id DESC LIMIT 1;"
    );
    const edxId = edx[0]?.id;

    // Set all existing courses to use edX as provider
    if (edxId) {
      await queryInterface.sequelize.query(
        `UPDATE courses SET course_provider_id = ${edxId} WHERE course_provider_id IS NULL`
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove edX provider and unset from courses
    const [edx] = await queryInterface.sequelize.query(
      "SELECT id FROM course_providers WHERE slug = 'edx' ORDER BY id DESC LIMIT 1;"
    );
    const edxId = edx[0]?.id;
    if (edxId) {
      await queryInterface.sequelize.query(
        `UPDATE courses SET course_provider_id = NULL WHERE course_provider_id = ${edxId}`
      );
      await queryInterface.bulkDelete('course_providers', { id: edxId });
    }
  }
}; 