const userFavoritesModel = (sequelize, DataTypes) => {
    const UserFavorite = sequelize.define("UserFavorite", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        course_uuid: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'courses',
                key: 'uuid'
            }
        }
    }, {
        tableName: "user_favorites",
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['user_id', 'course_uuid']
            }
        ]
    });

    // Association method
    UserFavorite.associate = (models) => {
        UserFavorite.belongsTo(models.user, { foreignKey: 'user_id' });
        UserFavorite.belongsTo(models.courses, { 
            foreignKey: 'course_uuid', 
            targetKey: 'uuid',
            as: 'courses'
        });
    };

    return UserFavorite;
};

export default userFavoritesModel; 