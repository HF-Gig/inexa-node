const featuredCourseModel = (sequelize, DataTypes) => {
  const FeaturedCourse = sequelize.define('featured_course', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id'
      }
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 15
      }
    },
    category: {
      type: DataTypes.ENUM('courses_certificates', 'micro_masters_bachelors', 'degree', 'popular', 'course', 'professional-certificate'),
      allowNull: false
    },
    place: {
      type: DataTypes.ENUM('home', 'explore_menu'),
      allowNull: false,
      defaultValue: 'home'
    }
  }, {
    tableName: 'featured_courses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associations
  FeaturedCourse.associate = (models) => {
    FeaturedCourse.belongsTo(models.courses, { foreignKey: 'course_id', as: 'course' });
  };

  return FeaturedCourse;
};

export default featuredCourseModel;
