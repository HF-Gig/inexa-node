const couponModal = (sequelize, DataTypes) => {
    const Coupon = sequelize.define("Coupon", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        percentage: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        expiryDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: "coupons",
        timestamps: true,
    });

    return Coupon;
};

export default couponModal;
