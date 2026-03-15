import db from '../../db.js';
import { getPaginationMetadata, formatPaginatedResponse } from '../utils/pagination.js';

// Add course to favorites
export async function addToFavorites(req, res) {
    try {
        const { course_uuid } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!course_uuid) {
            return res.status(400).json({
                message: "Course UUID is required",
                status: false,
                statusCode: 400
            });
        }

        // Check if course exists
        const course = await db.courses.findOne({
            where: { uuid: course_uuid }
        });

        if (!course) {
            return res.status(404).json({
                message: "Course not found",
                status: false,
                statusCode: 404
            });
        }

        // Check if already in favorites
        const existingFavorite = await db.userFavorite.findOne({
            where: {
                user_id: userId,
                course_uuid: course_uuid
            }
        });

        if (existingFavorite) {
            return res.status(400).json({
                message: "Course is already in favorites",
                status: false,
                statusCode: 400
            });
        }

        // Add to favorites
        const favorite = await db.userFavorite.create({
            user_id: userId,
            course_uuid: course_uuid
        });

        return res.status(201).json({
            message: "Course added to favorites successfully",
            status: true,
            statusCode: 201,
            data: favorite
        });

    } catch (error) {
        console.error("Error in addToFavorites:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            status: false,
            statusCode: 500
        });
    }
}

// Remove course from favorites
export async function removeFromFavorites(req, res) {
    try {
        const { course_uuid } = req.params;
        const userId = req.user.id;

        // Check if favorite exists
        const favorite = await db.userFavorite.findOne({
            where: {
                user_id: userId,
                course_uuid: course_uuid
            }
        });

        if (!favorite) {
            return res.status(404).json({
                message: "Course not found in favorites",
                status: false,
                statusCode: 404
            });
        }

        // Remove from favorites
        await db.userFavorite.destroy({
            where: {
                user_id: userId,
                course_uuid: course_uuid
            }
        });

        return res.status(200).json({
            message: "Course removed from favorites successfully",
            status: true,
            statusCode: 200
        });

    } catch (error) {
        console.error("Error in removeFromFavorites:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            status: false,
            statusCode: 500
        });
    }
}

// Get user's favorite courses
export async function getFavorites(req, res) {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.page_size) || 10;
        const offset = (page - 1) * pageSize;

        const { count, rows: favorites } = await db.userFavorite.findAndCountAll({
            where: { user_id: userId },
            include: [
                {
                    model: db.courses,
                    as: 'courses',
                    attributes: [
                        'uuid', 'title', 'short_description', 'image_url', 'course_level',
                        'weeks_to_complete', 'estimated_hours', 'type_id', 'owners',
                        'course_provider_id', 'pacing_type', 'content_type', 'cobranding',
                        'start_date'
                    ],
                    include: [
                        {
                            model: db.course_providers,
                            as: 'provider',
                            attributes: ['name', 'logo_url']
                        },
                        {
                            model: db.program_type,
                            as: 'program_type',
                            attributes: ['name', 'slug']
                        }
                    ]
                }
            ],
            limit: pageSize,
            offset: offset,
            order: [['createdAt', 'DESC']]
        });

        const plainFavorites = favorites.map(f => f.toJSON());

        const ownerIds = [...new Set(plainFavorites.flatMap(f => {

            const owners = f.courses?.owners;
            if (Array.isArray(owners)) return owners;
            if (typeof owners === 'number') return [owners];
            return [];
        }))];

        if (ownerIds.length > 0) {
            const ownersList = await db.owner.findAll({
                where: {
                    id: ownerIds
                },
                attributes: ['id', 'name', 'certificate_logo_image_url']
            });

            const ownersMap = ownersList.reduce((acc, owner) => {
                acc[owner.id] = owner;
                return acc;
            }, {});

            plainFavorites.forEach(f => {
                if (f.courses && f.courses.owners) {
                    const ids = Array.isArray(f.courses.owners) ? f.courses.owners : [f.courses.owners];
                    f.courses.owners_details = ids.map(id => ownersMap[id]).filter(Boolean);
                }
            });
        }

        // ... existing owners fetch code ...

        // Fetch total_courses for programs
        const programCourseIds = plainFavorites
            .filter(f => f.courses && f.courses.content_type === 'program')
            .map(f => f.courses.id);

        if (programCourseIds.length > 0) {
            // Find Program entries linked to these courses
            const programs = await db.program.findAll({
                where: {
                    course_id: programCourseIds
                },
                attributes: ['id', 'course_id']
            });

            const programIdMap = programs.reduce((acc, p) => {
                acc[p.course_id] = p.id;
                return acc;
            }, {});

            const programIds = programs.map(p => p.id);

            if (programIds.length > 0) {
                // Count courses in each program
                // Group by program_id
                const counts = await db.program_course.findAll({
                    where: {
                        program_id: programIds
                    },
                    attributes: ['program_id', [db.Sequelize.fn('COUNT', db.Sequelize.col('course_id')), 'count']],
                    group: ['program_id']
                });

                const countMap = counts.reduce((acc, c) => {
                    acc[c.program_id] = c.get('count');
                    return acc;
                }, {});

                // Attach count to favorites
                plainFavorites.forEach(f => {
                    if (f.courses && f.courses.content_type === 'program') {
                        const programId = programIdMap[f.courses.id];
                        if (programId) {
                            f.courses.total_courses = countMap[programId] || 0;
                        }
                    }
                });
            }
        }

        const pagination = getPaginationMetadata({
            page,
            pageSize,
            totalItems: count
        });

        return res.json(formatPaginatedResponse({
            data: plainFavorites,
            pagination
        }));

    } catch (error) {
        console.error("Error in getFavorites:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            status: false,
            statusCode: 500
        });
    }
}