const siteStatisticsModel = (sequelize, DataTypes) => {
    const SiteStatistics = sequelize.define("SiteStatistics", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        title: { type: DataTypes.STRING, allowNull: false },
        value: { type: DataTypes.STRING, allowNull: false },
        order: { type: DataTypes.INTEGER, allowNull: true },
        status: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
    }, {
        tableName: "site_statistics",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return SiteStatistics;
};

export default siteStatisticsModel; 