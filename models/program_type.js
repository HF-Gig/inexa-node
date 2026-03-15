const programTypeModel = (sequelize, DataTypes) => {
    const ProgramType = sequelize.define("ProgramType", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        uuid: {
            type: DataTypes.UUID,
            unique: true,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        coaching_supported: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        }
    }, {
        tableName: "program_types",
        timestamps: false,
    });

    // Association method
    ProgramType.associate = (models) => {
        ProgramType.hasMany(models.courses, { foreignKey: 'type_id' });
    };

    return ProgramType;
};

export default programTypeModel; 