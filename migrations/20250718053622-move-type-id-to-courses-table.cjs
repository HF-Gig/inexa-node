'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add type_id to courses table
    await queryInterface.addColumn('courses', 'type_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'program_types',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // 2. Copy type_id from programs to courses (for program courses only)
    await queryInterface.sequelize.query(`
      UPDATE courses c
      JOIN programs p ON p.course_id = c.id
      SET c.type_id = p.type_id
      WHERE p.type_id IS NOT NULL
    `);

    // 3. Remove type_id from programs table
    await queryInterface.removeColumn('programs', 'type_id');
  },

  async down(queryInterface, Sequelize) {
    // 1. Add type_id back to programs table
    await queryInterface.addColumn('programs', 'type_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'program_types',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // 2. Copy type_id from courses back to programs
    await queryInterface.sequelize.query(`
      UPDATE programs p
      JOIN courses c ON p.course_id = c.id
      SET p.type_id = c.type_id
      WHERE c.type_id IS NOT NULL
    `);

    // 3. Remove type_id from courses table
    await queryInterface.removeColumn('courses', 'type_id');
  }
};
