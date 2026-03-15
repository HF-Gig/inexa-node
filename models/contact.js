const contactModal = (sequelize, DataTypes) => {
    const Contact = sequelize.define("Contact", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        create_time: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        country: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        phone: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        whatsapp_call: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
    }, {
        tableName: "contact_forms",
        timestamps: false,
    });

    return Contact;
};

export default contactModal;
