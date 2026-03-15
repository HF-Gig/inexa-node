module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('staff_course', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      staff_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'staff',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'courses',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    });
    await queryInterface.addConstraint('staff_course', {
      fields: ['staff_id', 'course_id'],
      type: 'unique',
      name: 'unique_staff_course'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('staff_course');
  }
}; 