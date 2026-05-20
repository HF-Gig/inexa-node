import cron from 'node-cron';
import dayjs from 'dayjs';
import initModels from '../../models/init_models.js';

const getFirstMonday = (date) => {
    let d = dayjs(date).startOf('month');
    const dayOfWeek = d.day();
    const daysToAdd = (1 - dayOfWeek + 7) % 7;

    return d.add(daysToAdd, 'day');
};

const preserveUpdatedAtForSilentUpdate = (model, values) => {
    if (!model?.rawAttributes?.updatedAt) {
        return values;
    }

    const updatedAtColumn = model.rawAttributes.updatedAt.field || 'updatedAt';
    const quotedUpdatedAtColumn = model.sequelize
        .getQueryInterface()
        .quoteIdentifier(updatedAtColumn);

    return {
        ...values,
        updatedAt: model.sequelize.literal(quotedUpdatedAtColumn),
    };
};

const updateCourseStartDates = async () => {
    console.log('Running Cron Job: Updating Course Start Dates...');
    try {
        const models = await initModels();
        const Course = models.courses;
        const ProgramType = models.program_type;
        const Op = models.Sequelize.Op;

        const now = dayjs();
        let targetDate = getFirstMonday(now);

        if (now.isAfter(targetDate, 'day')) {
            targetDate = getFirstMonday(now.add(1, 'month'));
        }

        const formattedDate = targetDate.toDate();

        console.log(`Setting all course start dates to: ${targetDate.format('YYYY-MM-DD')}`);

        const degreeType = await ProgramType.findOne({ where: { slug: 'degree' } });

        const whereClause = {};
        if (degreeType) {
            whereClause.type_id = {
                [Op.or]: [
                    { [Op.ne]: degreeType.id },
                    { [Op.eq]: null }
                ]
            };
        }

        const [updatedCount] = await Course.update(
            preserveUpdatedAtForSilentUpdate(Course, {
                start_date: formattedDate,
                pacing_type: 'self_paced'
            }),
            {
                where: whereClause,
                silent: true
            }
        );

        console.log(`Successfully updated start_date for ${updatedCount} courses (excluded degrees).`);

    } catch (error) {
        console.error('Error in Course Start Date Cron Job:', error);
    }
};

const startCourseCron = () => {
    cron.schedule('0 0 * * *', () => {
        updateCourseStartDates();
    });

};

export { startCourseCron, updateCourseStartDates };
