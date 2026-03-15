const facilitatorsModel = (sequelize, DataTypes) => {
  const Facilitator = sequelize.define(
    "Facilitator",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      create_time: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      last_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      subject_expertise: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      bio_info: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      social_links: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      profile_image_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      tableName: "inexa_facilitators",
      timestamps: false,
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
    }
  );

  // No associations for now

  return Facilitator;
};

export default facilitatorsModel;
