const edxCoursesModal = (sequelize, DataTypes) => {
    return sequelize.define("EdxCourse", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        course_id: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
        },
        type: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '0: from edx, 1: from local',
            allowNull: true,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        number: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        org: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        short_description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        overview: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        effort: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        start: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        end: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        enrollment_start: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        enrollment_end: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        start_display: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        start_type: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        pacing: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        mobile_available: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        hidden: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        invitation_only: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        blocks_url: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        media: {
            type: DataTypes.JSON,
            allowNull: true,
        },
    }, {
        tableName: "edx_courses",
        timestamps: true,
    });
};

export default edxCoursesModal; 