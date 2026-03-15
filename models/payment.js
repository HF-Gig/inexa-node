const paymentModel = (sequelize, DataTypes) => {
  const Payment = sequelize.define("Payment", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'usd'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false, // e.g., 'succeeded', 'pending', 'failed'
    },
    payment_type: {
      type: DataTypes.ENUM('one-time', 'subscription'),
      allowNull: false,
    },
    invoice_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    invoice_pdf_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: "payments",
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user'
    });
    Payment.belongsTo(models.courses, {
      foreignKey: 'course_id',
      as: 'course'
    });
  };

  return Payment;
};

export default paymentModel;
