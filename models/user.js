const userModal = (sequelize, DataTypes) => {
    const User = sequelize.define("User", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        first_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        last_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        country: {
            type: DataTypes.STRING,
            allowNull: true,
        },
         phone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isEmail: true,
            },
            unique:true
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        role: {
            type: DataTypes.ENUM('admin', 'instructor', 'student', 'manager', 'owner', 'editor', 'support', 'moderator'),
            allowNull: false,
            defaultValue: 'student'
        },
        email_verification:{
            type:DataTypes.BOOLEAN,
            allowNull:false,
            defaultValue:false
        },
        provider: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "local"
        },
        stripe_customer_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        profile_photo: {
            type: DataTypes.STRING,
            allowNull: true
        },
        government_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
    }, {
        tableName: "users",
        timestamps: true,
    });

    User.associate = (models) => {
        User.hasMany(models.payment, {
            foreignKey: 'user_id',
            as: 'payments'
        });
    };

    return User;
};

export default userModal;
