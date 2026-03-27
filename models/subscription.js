const subscriptionModel = (sequelize, DataTypes) => {
    const Subscription = sequelize.define("Subscription", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        stripe_subscription_id: { type: DataTypes.STRING, allowNull: false },
        name: { type: DataTypes.STRING, allowNull: false },
        country: { type: DataTypes.STRING, allowNull: false },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        recurring_date: { type: DataTypes.DATE, allowNull: false },
        start_date: { type: DataTypes.DATE, allowNull: false },
        end_date: { type: DataTypes.DATE, allowNull: true },
        status: { type: DataTypes.STRING, allowNull: false },
        span: { type: DataTypes.STRING, allowNull: true },
        amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        provider: { type: DataTypes.STRING, allowNull: true },
        paystack_authorization_code: { type: DataTypes.STRING(255), allowNull: true },
        paystack_customer_code: { type: DataTypes.STRING(255), allowNull: true },
    }, {
        tableName: "subscriptions",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    Subscription.associate = (models) => {
        Subscription.belongsTo(models.user, { foreignKey: 'user_id', as: 'user' });
    };

    return Subscription;
};

export default subscriptionModel; 