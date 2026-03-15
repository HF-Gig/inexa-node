const staffCourseModel = (sequelize, DataTypes) => {
    return sequelize.define("StaffCourse", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        staff_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'staff',
                key: 'id'
            }
        },
        course_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'courses',
                key: 'id'
            }
        },
    }, {
        tableName: "staff_course",
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ["staff_id", "course_id"]
            }
        ]
    });
};

export default staffCourseModel; 