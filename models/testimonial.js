const testimonialModel = (sequelize, DataTypes) => {
  const Testimonial = sequelize.define("Testimonial", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  }, {
    tableName: "testimonials",
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return Testimonial;
};

export default testimonialModel; 