'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE courses
      SET trademark = 1
      WHERE trademark IS NULL OR trademark = 0
    `);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE courses
      SET trademark = 0
      WHERE trademark = 1
    `);
  }
};
