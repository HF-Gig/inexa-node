const featuredFacilitatorsModel = (sequelize, DataTypes) => {
  const FeaturedFacilitator = sequelize.define(
    "FeaturedFacilitator",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      facilitator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'inexa_facilitators',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "featured_facilitators",
      timestamps: true,
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
    }
  );

  FeaturedFacilitator.associate = (models) => {
    FeaturedFacilitator.belongsTo(models.facilitator, { foreignKey: 'facilitator_id', as: 'facilitator' });
  };

  return FeaturedFacilitator;
};

export default featuredFacilitatorsModel;
