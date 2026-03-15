'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const uuid = uuidv4();
    await queryInterface.bulkInsert('program_types', [{
      uuid: uuid,
      name: 'Degree',
      slug: 'degree',
      coaching_supported: false
    }], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('program_types', {slug: 'degree'}, {});
  }
}; 