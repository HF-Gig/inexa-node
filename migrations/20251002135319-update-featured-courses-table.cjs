'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add place column
    await queryInterface.addColumn('featured_courses', 'place', {
      type: Sequelize.ENUM('home', 'explore_menu'),
      allowNull: false,
      defaultValue: 'home'
    });

    // Update category enum to include new values
    await queryInterface.changeColumn('featured_courses', 'category', {
      type: Sequelize.ENUM('courses_certificates', 'micro_masters_bachelors', 'degree', 'popular', 'course', 'professional-certificate'),
      allowNull: false
    });

    // Update position max to 10
    await queryInterface.changeColumn('featured_courses', 'position', {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 10
      }
    });

    // Remove old unique index
    await queryInterface.removeIndex('featured_courses', 'unique_position_category');

    // Add new unique index for position, category, place
    await queryInterface.addIndex('featured_courses', ['position', 'category', 'place'], {
      unique: true,
      name: 'unique_position_category_place'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove new index
    await queryInterface.removeIndex('featured_courses', 'unique_position_category_place');

    // Revert position max
    await queryInterface.changeColumn('featured_courses', 'position', {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    });

    // Revert category enum
    await queryInterface.changeColumn('featured_courses', 'category', {
      type: Sequelize.ENUM('courses_certificates', 'micro_masters_bachelors', 'degree'),
      allowNull: false
    });

    // Remove place column
    await queryInterface.removeColumn('featured_courses', 'place');

    // Add back old index
    await queryInterface.addIndex('featured_courses', ['position', 'category'], {
      unique: true,
      name: 'unique_position_category'
    });
  }
};
