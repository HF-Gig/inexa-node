const programCourseModel = (sequelize, DataTypes) => {
    return sequelize.define("ProgramCourse", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        program_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'programs',
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
        tableName: "program_courses",
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ["program_id", "course_id"]
            }
        ]
    });
};

export default programCourseModel; 