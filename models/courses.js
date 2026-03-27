const courseDataModel = (sequelize, DataTypes) => {
    const Course = sequelize.define("CourseData", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            unique: true,
            allowNull: false,
        },
        key: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        title: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        subjects: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        image_url: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        short_description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        content_type: {
            type: DataTypes.STRING,
            defaultValue: 'course',
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        end_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        enrollment_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: true,
        },
        skills: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        weeks_to_complete: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        estimated_hours: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        available_languages: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        transcript_languages: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        cobranding: {
            type: DataTypes.SMALLINT,
            default: 1,
            allowNull: true,
        },
        status: {
            type: DataTypes.SMALLINT,
            default: 1,
            allowNull: true,
        },
        course_modules: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        course_level: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        efforts: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        facilitator: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        pacing_type: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        availability: {
            type: DataTypes.STRING(100),
            default: 'current'
        },
        prerequisites: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        outcome: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        owners: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        order: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        org_logo: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        breakdown_description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        course_provider_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        price: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        register_link: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        self_cost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        self_caption: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        interactive_cost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        interactive_caption: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        card_short: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        degree_detail_short_desc: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        admission_steps: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        admission_steps_desc: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        cert_and_cred_pathways: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        disclaimer: {
            type: DataTypes.SMALLINT,
            default: 0,
            allowNull: true,
        },
        course_snapshot: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        degree_pdf_path: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        key_highlights: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        fee_highlights: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        type_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'program_types',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        },
        payment_type_self: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        payment_type_interactive: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        payment_option_once_off: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        payment_option_thirty_sixty: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        payment_option_monthly_11: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        payment_option_quarterly_3: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        payment_first_30_60: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        payment_second_30_60: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        payment_third_30_60: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        payment_first_monthly_11: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        payment_first_quarterly_3: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        first_payment: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        quarterly_payment: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        program_card_title: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        program_card_subtitle: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        program_card_bullets: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        program_card_caption: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        program_card_info_url: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName: "courses",
        timestamps: true,
    });

    // Association method
    Course.associate = (models) => {
        Course.belongsToMany(models.staff, { through: models.staff_course, foreignKey: 'course_id' });
        Course.belongsToMany(models.program, { through: models.program_course, foreignKey: 'course_id' });
        Course.belongsTo(models.course_providers, { foreignKey: 'course_provider_id', as: 'provider' });
        Course.belongsTo(models.program_type, { foreignKey: 'type_id', as: 'program_type' });
    };

    return Course;
};

export default courseDataModel;
