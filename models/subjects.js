const subjectsModel = (sequelize, DataTypes) => {
    const Subject = sequelize.define("Subject", {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        title: { type: DataTypes.STRING(255), allowNull: false },
        slug: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        image_url: { type: DataTypes.STRING(255), allowNull: true },
        status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        display_order: { type: DataTypes.INTEGER, allowNull: true },
    }, {
        tableName: "subjects",
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return Subject;
};

export default subjectsModel; 