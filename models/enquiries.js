const enquiriesModel = (sequelize, DataTypes) => {
    const Enquiry = sequelize.define("Enquiry", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        full_name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        phone: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        whatsapp_callback: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        course_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        course_title: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        source_page: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true,
        },
    }, {
        tableName: "enquiries",
        timestamps: true,
    });

    Enquiry.associate = (models) => {
        Enquiry.belongsTo(models.courses, { foreignKey: 'course_id', as: 'course' });
        Enquiry.belongsTo(models.user, { foreignKey: 'user_id', as: 'user' });
    };

    return Enquiry;
};

export default enquiriesModel;
