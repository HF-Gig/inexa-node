const staffDataModel = (sequelize, DataTypes) => {
    const StaffData = sequelize.define("StaffData", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        family_name: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        given_name: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        profile_image_url: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        position_title: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        edx_link: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        country: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        organization_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'organizations',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        },
    }, {
        tableName: "staff",
        timestamps: true,
    });

    // Association method for many-to-many with courses and belongsTo with Owner
    StaffData.associate = (models) => {
        StaffData.belongsToMany(models.courses, { through: models.staff_course, foreignKey: 'staff_id' });
        StaffData.belongsTo(models.organization, { foreignKey: 'organization_id', as: 'organization' });
    };

    return StaffData;
};

export default staffDataModel; 