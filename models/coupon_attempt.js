const couponAttemptModel = (sequelize, DataTypes) => {
    const CouponAttempt = sequelize.define(
        "CouponAttempt",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            coupon_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
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
            status: {
                type: DataTypes.ENUM("success", "failed"),
                allowNull: false,
                defaultValue: "failed",
            },
            reason: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            meta: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
        },
        {
            tableName: "coupon_attempts",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
        }
    );

    CouponAttempt.associate = (models) => {
        CouponAttempt.belongsTo(models.coupon, {
            foreignKey: "coupon_id",
            as: "coupon",
        });
        CouponAttempt.belongsTo(models.user, {
            foreignKey: "user_id",
            as: "user",
        });
    };

    return CouponAttempt;
};

export default couponAttemptModel;
