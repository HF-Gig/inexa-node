'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.sequelize.query(
      "SHOW TABLES LIKE 'featured_courses'",
      { type: Sequelize.QueryTypes.SELECT }
    );
    if (tableExists.length === 0) {
      await queryInterface.createTable('featured_courses', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        course_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'courses',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        position: {
          type: Sequelize.INTEGER,
          allowNull: false,
          validate: {
            min: 1,
            max: 10
          }
        },
        category: {
          type: Sequelize.ENUM('courses_certificates', 'micro_masters_bachelors', 'degree', 'popular', 'course', 'professional-certificate'),
          allowNull: false
        },
        place: {
          type: Sequelize.ENUM('home', 'explore_menu'),
          allowNull: false,
          defaultValue: 'home'
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE
        }
      });

      // Add unique constraint for position, category, place
      await queryInterface.addIndex('featured_courses', ['position', 'category', 'place'], {
        unique: true,
        name: 'unique_position_category_place'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('featured_courses');
  }
};
