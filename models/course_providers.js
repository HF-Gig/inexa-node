const courseProvidersModel = (sequelize, DataTypes) => {
    const CourseProvider = sequelize.define("CourseProvider", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING, allowNull: false },
        logo_url: { type: DataTypes.STRING, allowNull: false },
        slug: { type: DataTypes.STRING, allowNull: true },
        status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, {
        tableName: "course_providers",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    CourseProvider.associate = (models) => {
        CourseProvider.hasMany(models.courses, { foreignKey: 'course_provider_id', as: 'courses' });
    };

    return CourseProvider;
};

export default courseProvidersModel; 