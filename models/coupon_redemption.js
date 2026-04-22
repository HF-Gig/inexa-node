const couponRedemptionModel = (sequelize, DataTypes) => {
    const CouponRedemption = sequelize.define(
        "CouponRedemption",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            coupon_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            code: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            email: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            payment_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            payment_reference: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            discount_percentage: {
                type: DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
            },
            status: {
                type: DataTypes.ENUM("succeeded", "reverted"),
                allowNull: false,
                defaultValue: "succeeded",
            },
        },
        {
            tableName: "coupon_redemptions",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
        }
    );

    CouponRedemption.associate = (models) => {
        CouponRedemption.belongsTo(models.coupon, {
            foreignKey: "coupon_id",
            as: "coupon",
        });
        CouponRedemption.belongsTo(models.user, {
            foreignKey: "user_id",
            as: "user",
        });
        CouponRedemption.belongsTo(models.payment, {
            foreignKey: "payment_id",
            as: "payment",
        });
    };

    return CouponRedemption;
};

export default couponRedemptionModel;
