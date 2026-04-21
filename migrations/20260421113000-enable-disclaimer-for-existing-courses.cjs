'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE courses
      SET disclaimer = 1
      WHERE disclaimer IS NULL OR disclaimer = 0
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE courses
      SET disclaimer = 0
      WHERE disclaimer = 1
    `);
  }
};
