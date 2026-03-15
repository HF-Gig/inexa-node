const programDataModel = (sequelize, DataTypes) => {
    const Program = sequelize.define("ProgramData", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            unique: true,
            allowNull: false,
        },
        course_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'courses',
                key: 'id'
            }
        },
        industry_insights: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName: "programs",
        timestamps: true,
    });

    // Association method
    Program.associate = (models) => {
        Program.belongsToMany(models.courses, { through: models.program_course, foreignKey: 'program_id' });
    };

    return Program;
};

export default programDataModel; 