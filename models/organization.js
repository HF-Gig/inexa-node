const organizationModel = (sequelize, DataTypes) => {
  return sequelize.define("Organization", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    organization_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    organization_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    organization_uuid: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    organization_logo_image_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: "organizations",
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  });
};

export default organizationModel; 