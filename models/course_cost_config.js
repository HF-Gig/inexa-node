const courseCostConfigModel = (sequelize, DataTypes) => {
  const CourseCostConfig = sequelize.define(
    "CourseCostConfig",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      provider_id: { type: DataTypes.BIGINT, allowNull: false },
      course_id: { type: DataTypes.BIGINT, allowNull: true },
      country_code: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "DEFAULT" },
      self_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      self_caption: { type: DataTypes.TEXT, allowNull: true },
      interactive_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      interactive_caption: { type: DataTypes.TEXT, allowNull: true },
      payment_type_self: { type: DataTypes.STRING, allowNull: true },
      payment_type_interactive: { type: DataTypes.STRING, allowNull: true },
      payment_option_once_off: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      payment_option_thirty_sixty: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      payment_option_monthly_11: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      payment_option_quarterly_3: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      payment_once_off_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      payment_first_30_60: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      payment_second_30_60: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      payment_third_30_60: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      payment_first_monthly_11: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      payment_first_quarterly_3: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    },
    {
      tableName: "course_cost_configs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          unique: true,
          fields: ["provider_id", "course_id", "country_code"],
        },
      ],
    }
  );

  return CourseCostConfig;
};

export default courseCostConfigModel;
