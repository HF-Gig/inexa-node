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
        startsAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM("active", "paused", "deleted"),
            allowNull: false,
            defaultValue: "active",
        },
        usageLimitPerCustomer: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        audienceType: {
            type: DataTypes.ENUM("all", "business_domains", "specific_users", "mixed"),
            allowNull: false,
            defaultValue: "all",
        },
        allowedDomains: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        allowedUserIds: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName: "coupons",
        timestamps: true,
    });

    Coupon.associate = (models) => {
        Coupon.hasMany(models.coupon_redemption, {
            foreignKey: "coupon_id",
            as: "redemptions",
        });
        Coupon.hasMany(models.coupon_attempt, {
            foreignKey: "coupon_id",
            as: "attempts",
        });
    };

    return Coupon;
};

export default couponModal;
