import db from '../../db.js';
import { getPaginationMetadata, formatPaginatedResponse } from '../utils/pagination.js';
import { getOwnersByIds, getStaffByUuids } from '../helper/storeTheEdxContent.js';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import getUpload from '../middleware/upload.js';
import { uploadLogo } from '../helper/fileUpload.js';
import { formatDate } from '../helper/common.js';

// Cache for popular courses
const popularCoursesCache = new Map();

// Helper function to get weeks range based on duration
function getWeeksRange(duration) {
  switch (duration) {
    case "1-4 weeks":
      return { min: 1, max: 4 };
    case "1-3 Months":
      return { min: 4, max: 12 }; // 1 month = ~4 weeks, 3 months = ~12 weeks
    case "3-6 Months":
      return { min: 12, max: 24 }; // 3 months = ~12 weeks, 6 months = ~24 weeks
    case "6-12 Months":
      return { min: 24, max: 48 }; // 6 months = ~24 weeks, 12 months = ~48 weeks
    case "1-4 Years":
      return { min: 48, max: 208 }; // 1 year = ~48 weeks, 4 years = ~208 weeks
    default:
      return null;
  }
}

function generateCourseKey({ provider, title }) {
  // Normalize provider and title, replace spaces with underscores, remove special chars
  const providerPart = (provider || 'Provider').replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
  const titlePart = (title || 'Course').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  // Add a short random suffix for uniqueness
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${providerPart}+${titlePart}.${suffix}`;
}

// Helper to normalize array or JSON string to array of numbers
function normalizeToNumberArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map(v => Number(v)).filter(v => !isNaN(v));
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.map(v => Number(v)).filter(v => !isNaN(v));
      }
    } catch {
      // ignore
    }
  }
  return [];
}

export async function getCourses(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;
    const offset = (page - 1) * pageSize;

    const where = {};

    // Content type filter
    const contentType = req.query.content_type || 'both';
    if (contentType !== 'both') {
      if (contentType.startsWith('!')) {
        const base = contentType.slice(1);
        const mapped = base === 'courses' ? 'course' : 'program';
        where.content_type = { [Op.ne]: mapped };
      } else if (contentType === 'courses') {
        where.content_type = 'course';
      } else if (contentType === 'program') {
        where.content_type = 'program';
      }
    }

    // Organization filter (legacy, optional)
    // if (req.query.organization_id) {
    //   where.organization_id = req.query.organization_id;
    // }

    // Subjects filter
    if (req.query.subjects) {
      const subjects = req.query.subjects.split(',');
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        ...subjects.map(subject =>
          Sequelize.literal(`JSON_CONTAINS(subjects, '[${Number(subject)}]')`)
        )
      );
    }

    // Skills filter
    if (req.query.skills) {
      const skills = req.query.skills.split(',');
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        ...skills.map(skill =>
          Sequelize.literal(`JSON_CONTAINS(skills, '["${skill}"]')`)
        )
      );
    }

    // Languages filter
    if (req.query.languages) {
      const languages = req.query.languages.split(',');
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        ...languages.map(lang =>
          Sequelize.literal(`JSON_CONTAINS(available_languages, '["${lang}"]')`)
        )
      );
    }

    // Course level filter
    if (req.query.levels) {
      const levels = req.query.levels.split(',');
      where.course_level = levels.length === 1 ? levels[0] : { [Op.in]: levels };
    }

    // Availability filter
    if (req.query.availabilities) {
      const levels = req.query.availabilities.split(',');
      where.availability = levels.length === 1 ? levels[0] : { [Op.in]: levels };
    }

    // Duration filter
    if (req.query.durations) {
      const durations = req.query.durations.split(',');
      const durationRanges = durations
        .map(d => getWeeksRange(d.trim()))
        .filter(Boolean)
        .map(r => ({ [Op.between]: [r.min, r.max] }));

      if (durationRanges.length) {
        where.weeks_to_complete = { [Op.or]: durationRanges };
      }
    }

    // Owners filter
    if (req.query.owners) {
      const ownerIds = req.query.owners.split(',');
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        ...ownerIds.map(ownerId =>
          Sequelize.literal(`JSON_CONTAINS(owners, '[${Number(ownerId)}]')`)
        )
      );
    }

    // Learning Products
    if (req.query.learningProducts) {
      where.type_id = { [Op.in]: req.query.learningProducts.split(',') };
    }

    // Program type slug filter
    if (req.query.program_type_slug) {
      const slugs = req.query.program_type_slug.split(',');
      const programTypes = await db.program_type.findAll({ attributes: ['id', 'slug'], raw: true });
      const typeIds = programTypes.filter(t => slugs.includes(t.slug)).map(t => t.id);
      if (typeIds.length) where.type_id = { [Op.in]: typeIds };
    }

    if (req.query.search) {
      const q = req.query.search.toLowerCase();

      where[Op.or] = [
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('title')), {
          [Op.like]: `%${q}%`
        }),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('short_description')), {
          [Op.like]: `%${q}%`
        }),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('skills')), {
          [Op.like]: `%${q}%`
        })
      ];
    }

    // Sorting
    const orderBy = req.query.sortCol || 'id';
    const orderDir = (req.query.sortDir || 'DESC').toUpperCase();
    const order = [[orderBy, orderDir]];

    if (req.query.search) {
      order.unshift([
        Sequelize.literal(`CASE
          WHEN LOWER(title) LIKE '${req.query.search.toLowerCase()}%' THEN 1
          WHEN LOWER(title) LIKE '%${req.query.search.toLowerCase()}%' THEN 2
          WHEN LOWER(short_description) LIKE '%${req.query.search.toLowerCase()}%' THEN 3
          WHEN JSON_CONTAINS(skills, '["${req.query.search.toLowerCase()}"]') THEN 4
          ELSE 5 END`),
        'ASC'
      ]);
    }

    const isLight = req.query.light === '1' || req.query.light === 'true';
    const attributes = isLight
      ? ['id', 'title', 'key', 'status', 'owners', 'type_id', 'short_description', 'skills', 'price']
      : [
        'id', 'key', 'owners', 'title', 'image_url', 'weeks_to_complete',
        'course_level', 'start_date', 'pacing_type', 'content_type',
        'uuid', 'type_id', 'cobranding', 'course_provider_id', 'status', 'short_description',
        'skills', 'createdAt', 'updatedAt', 'price'
      ];

    where.status = 1;
    const { count, rows: courses } = await db.courses.findAndCountAll({
      attributes,
      where,
      limit: pageSize,
      offset,
      order,
      raw: true,
    });

    //console.log("Got raw courses:", courses.slice(0,2)); // sample 2 for clarity

    const ownerIds = Array.from(
      new Set(
        courses.flatMap(c => {
          if (Array.isArray(c.owners)) return c.owners;
          try {
            courses.forEach(c => {
              //console.log("Raw owners field type:", typeof c.owners, "value:", c.owners);
            });

            const parsed = JSON.parse(c.owners);
            //console.log("c.owners: ", parsed);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })
      )
    );

    //console.log(`Got courses owners ids: `, ownerIds);

    // Fetch owners
    const ownersMap = {};
    if (ownerIds.length) {
      const owners = await db.owner.findAll({
        where: { id: ownerIds },
        attributes: ['id', 'uuid', 'name', 'certificate_logo_image_url'],
        raw: true
      });
      //console.log(`Owners Fetched for id ${ownerIds}: ${owners}`)
      owners.forEach(o => (ownersMap[o.id] = o));
    }

    // Providers (for cobranding)
    const providerIds = courses
      .filter(c => c.course_provider_id)
      .map(c => c.course_provider_id);

    const providers = await db.course_providers.findAll({
      where: { id: providerIds },
      raw: true
    });

    const providerMap = providers.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});

    // Assemble course data
    const resultCourses = [];
    for (const course of courses) {
      const c = course.toJSON ? course.toJSON() : { ...course };

      // Get owner info
      const ownerArr = Array.isArray(c.owners)
        ? c.owners
        : (() => {
          try {
            const parsed = JSON.parse(c.owners);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();

      const ownerObj = ownerArr.length ? ownersMap[ownerArr[0]] : null;
      c.owner = ownerObj
        ? {
          id: ownerObj.id,
          name: ownerObj.name,
          certificate_logo_image_url: ownerObj.certificate_logo_image_url
        }
        : null;
      //console.log("Final Owners: ", ownerObj);

      // Set organization logo (provider if cobranding)
      if (c.course_provider_id && providerMap[c.course_provider_id]) {
        c.organization_logo = providerMap[c.course_provider_id].logo_url;
      } else {
        c.organization_logo = ownerObj
          ? ownerObj.certificate_logo_image_url || null
          : null;
      }

      // Program type (if program)
      if (c.content_type === 'program' && c.type_id) {
        const programType = await db.program_type.findOne({
          where: { id: c.type_id },
          attributes: ['name', 'slug'],
          raw: true
        });
        c.program_type_name = programType ? programType.name : null;
        c.program_type_slug = programType ? programType.slug : null;

        const program = await db.program.findOne({ where: { course_id: c.id } });
        if (program) {
          const programCourses = await db.program_course.findAll({
            where: { program_id: program.id },
            attributes: ['course_id'],
            raw: true
          });
          const courseIds = programCourses.map(pc => pc.course_id);
          const courseRecords = await db.courses.findAll({
            where: { id: courseIds },
            attributes: ['id', 'start_date'],
            raw: true
          });
          if (courseRecords.length) {
            const now = new Date();
            courseRecords.sort(
              (a, b) =>
                Math.abs(new Date(a.start_date) - now) -
                Math.abs(new Date(b.start_date) - now)
            );
            c.start_date = courseRecords[0].start_date;
          }
          c.total_courses = courseRecords.length;
        }
      }

      // Attach staff
      const staffLinks = await db.staff_course.findAll({
        where: { course_id: c.id },
        attributes: ['staff_id'],
        raw: true
      });
      const staffIds = staffLinks.map(l => l.staff_id);
      c.staff = staffIds.length
        ? await db.staff.findAll({ where: { id: staffIds }, raw: true })
        : [];

      c.short_description = course.short_description || '';

      resultCourses.push(c);

    }

    const pagination = getPaginationMetadata({ page, pageSize, totalItems: count });

    return res.json(formatPaginatedResponse({ data: resultCourses, pagination }));
  } catch (error) {
    //console.log("error in getcourses======>", error);
    return res.json({ message: "Internal Server Error", status: false, statusCode: 500 });
  }
}


const updateCoursesWithProgramInfo = async (courses) => {
  const ownerIdSet = new Set();
  for (const course of courses) {
    if (course.owners && Array.isArray(course.owners)) {
      course.owners.forEach(id => ownerIdSet.add(id));
    } else if (typeof course.owners === 'string') {
      try {
        const parsed = JSON.parse(course.owners);
        if (Array.isArray(parsed)) {
          parsed.forEach(id => ownerIdSet.add(id));
        }
      } catch { }
    }
  }
  const ownerIds = Array.from(ownerIdSet);
  let ownersMap = {};
  if (ownerIds.length > 0) {
    const owners = await db.owner.findAll({
      where: { id: ownerIds },
      attributes: ['id', 'uuid', 'name', 'certificate_logo_image_url'],
      raw: true
    });
    ownersMap = owners.reduce((acc, owner) => {
      acc[owner.id] = owner;
      return acc;
    }, {});
  }

  const resultCourses = [];
  for (let course of courses) {
    const courseObj = course.toJSON ? course.toJSON() : { ...course };

    // Owners
    let ownerIdsArr = [];
    if (courseObj.owners && Array.isArray(courseObj.owners)) {
      ownerIdsArr = courseObj.owners;
    } else if (typeof courseObj.owners === 'string') {
      try {
        const parsed = JSON.parse(courseObj.owners);
        if (Array.isArray(parsed)) {
          ownerIdsArr = parsed;
        }
      } catch { }
    }
    const ownerObj = ownerIdsArr.length > 0 ? ownersMap[ownerIdsArr[0]] : null;
    courseObj.owner = ownerObj ? {
      name: ownerObj.name,
      certificate_logo_image_url: ownerObj.certificate_logo_image_url
    } : null;
    if (course.content_type === 'program') {
      // Fetch type_id from course
      if (course.type_id) {
        const programType = await db.program_type.findOne({
          where: { id: course.type_id },
          attributes: ['name', 'slug'],
          raw: true
        });
        courseObj.program_type_name = programType ? programType.name : null;
        courseObj.program_type_slug = programType ? programType.slug : null;
      } else {
        courseObj.program_type_name = null;
        courseObj.program_type_slug = null;
      }

      // Fetch program for the course
      const program = await db.program.findOne({ where: { course_id: course.id } });
      if (program) {
        const programCourses = await db.program_course.findAll({
          where: { program_id: program.id },
          attributes: ['course_id'],
          raw: true
        });
        const courseIds = programCourses.map(pc => pc.course_id);

        // Fetch the full course records for these IDs
        const courseRecords = await db.courses.findAll({
          where: { id: courseIds },
          attributes: ['id', 'start_date'],
          raw: true
        });

        if (courseRecords.length > 0) {
          const currentDate = new Date();
          const sortedCourses = courseRecords.sort((a, b) => {
            const diffA = Math.abs(new Date(a.start_date) - currentDate);
            const diffB = Math.abs(new Date(b.start_date) - currentDate);
            return diffA - diffB;
          });

          // Get the nearest course
          const nearestCourse = sortedCourses[0];
          // Assign the nearest start date to courseObj
          courseObj.start_date = nearestCourse.start_date;
        }

        // Assign total_courses to courseObj
        courseObj.total_courses = courseRecords.length;
      }
    }
    resultCourses.push(courseObj);
  }

  return resultCourses;
};

export async function getPopularCourses(req, res) {
  try {
    const cacheKey = 'popularCourses';
    const cached = popularCoursesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour TTL
      return res.json(cached.data);
    }

    // Fetch all program types (once)
    const programTypes = await db.program_type.findAll({ attributes: ['id', 'slug'] });

    // Filter program type ids based on slug
    const courses_certificates_type_ids = programTypes.filter(type => ['course', 'professional-certificate'].includes(type.slug)).map(type => type.id);

    const micro_masters_bachelors_type_ids = programTypes.filter(type => ['micromasters', 'microbachelors'].includes(type.slug)).map(type => type.id);
    const degree_type_ids = programTypes.filter(type => type.slug === 'degree').map(type => type.id);

    // Fetch courses for 'Courses' and 'Certificates' types
    let courses_certificates = await db.courses.findAll({
      where: {
        type_id: {
          [Op.in]: courses_certificates_type_ids,
        },
      },
      order: [
        [db.sequelize.literal('CASE WHEN `order` IS NULL THEN 1 ELSE 0 END'), 'ASC'], // Put nulls last
        ['order', 'ASC'], // Then order by the actual order value (1, 2, 3, etc.)
      ],
      raw: true,
      limit: 15
    });

    // Check for featured courses
    const featuredCoursesCertificates = await db.featured_course.findAll({
      where: { category: 'courses_certificates' },
      include: [{
        model: db.courses,
        as: 'course'
      }],
      order: [['position']]
    });

    if (featuredCoursesCertificates.length === 5) {
      courses_certificates = featuredCoursesCertificates.map(f => f.course.toJSON());
    }
    // Fetch courses for 'MicroMasters' and 'MicroBachelors' types
    let micro_masters_bachelors = await db.courses.findAll({
      where: {
        type_id: {
          [Op.in]: micro_masters_bachelors_type_ids,
        },
      },
      order: [
        [db.sequelize.literal('CASE WHEN `order` IS NULL THEN 1 ELSE 0 END'), 'ASC'], // Put nulls last
        ['order', 'ASC'], // Then order by the actual order value
      ],
      raw: true,
      limit: 15
    });

    // Check for featured MicroMasters and MicroBachelors
    const featuredMicroMasters = await db.featured_course.findAll({
      where: { category: 'micro_masters_bachelors' },
      include: [{
        model: db.courses,
        as: 'course'
      }],
      order: [['position']]
    });

    if (featuredMicroMasters.length === 5) {
      const featuredCourses = featuredMicroMasters.map(f => f.course.toJSON());
      micro_masters_bachelors.splice(0, 5, ...featuredCourses);
    }

    // Fetch courses for 'Degree' types
    let degree = await db.courses.findAll({
      where: {
        type_id: {
          [Op.in]: degree_type_ids,
        },
      },
      order: [
        [db.sequelize.literal('CASE WHEN `order` IS NULL THEN 1 ELSE 0 END'), 'ASC'], // Put nulls last
        ['order', 'ASC'], // Then order by the actual order value
      ],
      raw: true,
      limit: 15
    });

    // Check for featured Degrees
    const featuredDegrees = await db.featured_course.findAll({
      where: { category: 'degree' },
      include: [{
        model: db.courses,
        as: 'course'
      }],
      order: [['position']]
    });

    if (featuredDegrees.length === 5) {
      degree = featuredDegrees.map(f => f.course.toJSON());
    }
    // Process all course arrays (certificates, micro_masters_bachelors, degree)
    const courses_certificates_updated = await updateCoursesWithProgramInfo(courses_certificates);
    const micro_masters_bachelors_updated = await updateCoursesWithProgramInfo(micro_masters_bachelors);
    const degree_updated = await updateCoursesWithProgramInfo(degree);

    const data = {
      courses_certificates: courses_certificates_updated,
      micro_masters_bachelors: micro_masters_bachelors_updated,
      degree: degree_updated
    };

    // Cache the result
    popularCoursesCache.set(cacheKey, { data, timestamp: Date.now() });

    return res.json(data);
  } catch (error) {
    //console.error('Error fetching popular courses:', error);
    return res.json({ message: "Internal Server Error", status: false, statusCode: 500 });
  }
}

export async function getFeaturedCourses(req, res) {
  try {
    const featured = await db.featured_course.findAll({
      include: [{
        model: db.courses,
        as: 'course',
        attributes: ['id', 'title', 'image_url', 'key', 'course_provider_id']
      }],
      order: [['place'], ['category'], ['position']]
    });

    // Collect unique course_provider_ids
    const providerIds = featured
      .map(f => f.course.course_provider_id)
      .filter(id => id);

    // Fetch providers
    const providers = await db.course_providers.findAll({
      where: { id: providerIds },
      attributes: ['id', 'name', 'logo_url'],
      raw: true
    });

    const providerMap = providers.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});

    // Add course_provider to each course
    featured.forEach(f => {
      f.course = f.course.toJSON();  // ← convert Sequelize instance to plain object

      if (f.course.course_provider_id && providerMap[f.course.course_provider_id]) {
        const provider = providerMap[f.course.course_provider_id];
        f.course.course_provider = {
          name: provider.name,
          image: provider.logo_url.startsWith('http')
            ? provider.logo_url
            : (process.env.BASE_URL || '') + provider.logo_url
        };
      } else {
        f.course.course_provider = null;
      }
    });

    const result = {};
    featured.forEach(f => {
      if (!result[f.place]) result[f.place] = {};
      if (!result[f.place][f.category]) {
        // Set array size based on category
        let size = 5;
        if (f.place === 'explore_menu') {
          if (f.category === 'popular') size = 8;
          else if (f.category === 'course_certificates' || f.category === 'professional-certificate') size = 6;
          else if (f.category === 'micro_masters_bachelors') size = 3;
        }
        result[f.place][f.category] = new Array(size).fill(null);
      }
      result[f.place][f.category][f.position - 1] = f.course;
    });

    return res.json(result);
  } catch (error) {
    console.error('Error fetching featured courses:', error);
    return res.json({ message: "Internal Server Error", status: false, statusCode: 500 });
  }
}

export async function updateFeaturedCourse(req, res) {
  try {
    const { position } = req.params;
    const { course_id, category: reqCategory, place: reqPlace } = req.body;
    // console.log(`Received request with position ${position} and course_id ${course_id} and request category ${reqCategory}`);
    let category = reqCategory || 'courses_certificates';
    const place = reqPlace || 'home';

    if (!course_id || !position) {
      return res.json({ message: "Missing required fields", status: false, statusCode: 400 });
    }

    const pos = parseInt(position);
    let maxPos = 15;
    if (place === 'explore_menu') {
      if (category === 'popular') maxPos = 8;
      else if (category === 'course' || category === 'professional-certificate') maxPos = 6;
      else if (category === 'degree') maxPos = 6;
    }
    if (pos < 1 || pos > maxPos) {
      return res.json({ message: `Position must be between 1 and ${maxPos}`, status: false, statusCode: 400 });
    }

    // Check if course exists
    const course = await db.courses.findByPk(course_id);
    if (!course) {
      return res.json({ message: "Course not found", status: false, statusCode: 404 });
    }

    // Validate course belongs to the category's program types
    const programType = await db.program_type.findOne({ where: { id: course.type_id }, attributes: ['slug'] });
    if (!programType) {
      return res.json({ message: "Invalid course type", status: false, statusCode: 400 });
    }

    const allowedSlugs = {
      'courses_certificates': ['course', 'professional-certificate'],
      'micro_masters_bachelors': ['micromasters', 'microbachelors', 'xseries'], // add 'degree' here if you want to allow them too
      'degree': ['degree'],
      'popular': ['course', 'professional-certificate', 'micromasters', 'microbachelors', 'degree'],
      'course': ['course'],
      'professional-certificate': ['professional-certificate']
    };


    if (!allowedSlugs[category] || !allowedSlugs[category].includes(programType.slug)) {
      return res.json({ message: "Course does not belong to the selected category", status: false, statusCode: 400 });
    }

    // Delete any existing entry for this position to allow replacement
    await db.featured_course.destroy({
      where: {
        position: pos,
        category,
        place
      }
    });

    // Delete any existing entry for this course_id in the category and place to avoid duplicates
    await db.featured_course.destroy({
      where: {
        course_id,
        category,
        place
      }
    });

    // Then upsert
    //console.log(`Course featured created for ${place}, categroy ${category} and position ${pos}`)
    await db.featured_course.upsert({
      course_id,
      position: pos,
      category,
      place
    });

    return res.json({ message: "Featured course updated successfully", status: true, statusCode: 200 });
  } catch (error) {
    console.error('Error updating featured course:', error);
    return res.json({ message: "Internal Server Error", status: false, statusCode: 500 });
  }
}

const parseArrayField = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export async function getCoursesDetail(req, res) {
  try {
    const { courseId } = req.params;
    const course = await db.courses.findOne({
      where: { id: courseId }
    });

    if (!course) {
      return res.json({
        message: "Course not found",
        status: false,
        statusCode: 404
      });
    }

    //console.log("Using course data:", course);

    const courseData = course.toJSON();

    if (courseData.facilitator && Array.isArray(courseData.facilitator) && courseData.facilitator.length > 0) {
      // Fetch all facilitators whose IDs are in the array
      const facilitators = await db.facilitator.findAll({
        where: { id: courseData.facilitator },
        attributes: ['id', 'first_name', 'last_name', 'email', 'profile_image_url'],
        raw: true
      });
      courseData.facilitator = facilitators;
    } else {
      courseData.facilitator = [];
    }

    if (courseData.course_provider_id) {
      const provider = await db.course_providers.findOne({
        where: { id: courseData.course_provider_id },
        attributes: ['name', 'logo_url'],
        raw: true
      });

      let courseProviderImage = null;
      if (provider?.logo_url) {
        courseProviderImage = provider.logo_url;
      }

      courseData.course_provider = {
        name: provider?.name || null,
        image: courseProviderImage
      };
    } else {
      courseData.course_provider = null;
    }

    // Ensure efforts is always an object
    if (courseData.efforts && typeof courseData.efforts === 'string') {
      try {
        courseData.efforts = JSON.parse(courseData.efforts);
      } catch {
        courseData.efforts = null;
      }
    }

    // Ensure available_languages, skills, and subjects are always arrays
    courseData.available_languages = parseArrayField(courseData.available_languages);
    courseData.transcript_languages = parseArrayField(courseData.transcript_languages);
    courseData.owners = parseArrayField(courseData.owners);
    courseData.skills = parseArrayField(courseData.skills);
    courseData.subjects = parseArrayField(courseData.subjects);

    // Enrich owners with name and certificate_logo_image_url
    if (courseData.owners && Array.isArray(courseData.owners) && courseData.owners.length > 0) {
      const ownerId = courseData.owners[0];
      const ownerObj = await db.owner.findOne({ where: { id: ownerId }, attributes: ['name', 'certificate_logo_image_url'], raw: true });
      courseData.owner = ownerObj ? {
        name: ownerObj.name,
        certificate_logo_image_url: ownerObj.certificate_logo_image_url
      } : null;
    } else {
      courseData.owner = null;
    }

    courseData.start_date = formatDate(courseData.start_date);

    // Fetch staff via staff_course pivot table
    const staffCourseLinks = await db.staff_course.findAll({ where: { course_id: course.id }, attributes: ['staff_id'], raw: true });
    const staffIds = staffCourseLinks.map(link => link.staff_id);
    if (staffIds.length > 0) {
      courseData.staff = await db.staff.findAll({ where: { id: staffIds } });
    } else {
      courseData.staff = [];
    }
    if (course.content_type === 'program') {
      // Fetch program record
      const program = await db.program.findOne({ where: { course_id: course.id } });
      if (program) {
        courseData.industry_insights = program.industry_insights;
        // Fetch type_id from course, not program
        courseData.program_type = course.type_id;
        // Fetch program_type_name and program_type_slug
        if (course.type_id) {
          const programType = await db.program_type.findOne({ where: { id: course.type_id }, attributes: ['name', 'slug'], raw: true });
          courseData.program_type_name = programType ? programType.name : null;
          courseData.program_type_slug = programType ? programType.slug : null;
        } else {
          courseData.program_type_name = null;
          courseData.program_type_slug = null;
        }
        // Fetch all connected course IDs from program_courses
        const programCourses = await db.program_course.findAll({
          where: { program_id: program.id },
          attributes: ['course_id'],
          raw: true
        });
        courseData.courses = programCourses.map(pc => pc.course_id);
        courseData.total_courses = courseData.courses.length;
      } else {
        courseData.industry_insights = null;
        courseData.program_type = null;
        courseData.program_type_name = null;
        courseData.program_type_slug = null;
        courseData.courses = [];
        courseData.total_courses = 0;
      }
    }
    res.json({
      data: courseData,
      status: true,
      statusCode: 200
    });
  } catch (error) {
    // console.error('error in getCoursesDetail======>', error);
    return res.json({ message: 'Internal Server Error', status: false, statusCode: 500 });
  }
}

export async function getCourseDetailBySlug(req, res) {
  try {
    const { slug } = req.params;
    const course = await db.courses.findOne({
      where: { key: slug }
    });

    if (!course) {
      return res.json({
        message: "Course not found",
        status: false,
        statusCode: 404
      });
    }

    const courseData = course.toJSON();

    // Parse facilitator field and fetch facilitator data
    if (courseData.facilitator) {
      let facilitatorIds = [];

      try {
        // Handle cases where facilitator is a stringified JSON
        if (typeof courseData.facilitator === "string") {
          facilitatorIds = JSON.parse(courseData.facilitator);
        } else if (Array.isArray(courseData.facilitator)) {
          facilitatorIds = courseData.facilitator;
        }

        // Fetch facilitator data if we have valid IDs
        if (facilitatorIds.length > 0) {
          const facilitators = await db.facilitator.findAll({
            where: { id: facilitatorIds },
            attributes: ['id', 'first_name', 'last_name', 'email', 'profile_image_url', 'subject_expertise'],
            raw: true
          });
          courseData.facilitator = facilitators;
        } else {
          courseData.facilitator = [];
        }
      } catch (err) {
        console.error("Error parsing facilitator field:", err);
        courseData.facilitator = [];
      }
    } else {
      courseData.facilitator = [];
    }

    // Ensure efforts is always an object
    if (courseData.efforts && typeof courseData.efforts === 'string') {
      try {
        courseData.efforts = JSON.parse(courseData.efforts);
      } catch {
        courseData.efforts = null;
      }
    }

    // Ensure available_languages, skills, and subjects are always arrays
    courseData.available_languages = parseArrayField(courseData.available_languages);
    courseData.transcript_languages = parseArrayField(courseData.transcript_languages);
    courseData.owners = parseArrayField(courseData.owners);
    courseData.skills = parseArrayField(courseData.skills);
    courseData.subjects = parseArrayField(courseData.subjects);

    // Enrich owners with name and certificate_logo_image_url
    if (courseData.owners && Array.isArray(courseData.owners) && courseData.owners.length > 0) {
      const ownerId = courseData.owners[0];
      const ownerObj = await db.owner.findOne({ where: { id: ownerId }, attributes: ['name', 'certificate_logo_image_url'], raw: true });
      courseData.owner = ownerObj ? {
        name: ownerObj.name,
        certificate_logo_image_url: ownerObj.certificate_logo_image_url
      } : null;
    } else {
      courseData.owner = null;
    }

    courseData.start_date = formatDate(courseData.start_date);

    if (course.content_type === 'program') {
      // Fetch program record
      const program = await db.program.findOne({ where: { course_id: course.id } });
      if (program) {
        courseData.industry_insights = program.industry_insights;
        // Fetch type_id from course, not program
        if (course.type_id) {
          const programType = await db.program_type.findOne({ where: { id: courseData.type_id }, attributes: ['name', 'slug'], raw: true });
          courseData.program_type_name = programType ? programType.name : null;
          courseData.program_type_slug = programType ? programType.slug : null;
        } else {
          courseData.program_type_name = null;
          courseData.program_type_slug = null;
        }
        // Fetch all connected course IDs from program_courses
        const programCourses = await db.program_course.findAll({
          where: { program_id: program.id },
          attributes: ['course_id'],
          raw: true
        });
        const courseIds = programCourses.map(pc => pc.course_id);
        // Fetch the full course records for these IDs
        const courseRecords = await db.courses.findAll({
          where: { id: courseIds },
          attributes: ['id', 'title', 'efforts', 'weeks_to_complete', 'key'],
          raw: true
        });

        // Map to the desired structure
        courseData.courses = courseRecords.map(c => ({
          id: c.id,
          course_title: c.title,
          efforts: c.efforts,
          weeks_to_complete: c.weeks_to_complete,
          key: c.key
        }));

        courseData.total_courses = courseRecords.length;

        // Fetch all staff for all courses in the program
        const staffLinks = await db.staff_course.findAll({
          where: { course_id: courseIds },
          attributes: ['staff_id'],
          raw: true
        });
        const staffIds = [...new Set(staffLinks.map(link => link.staff_id))];
        if (staffIds.length > 0) {
          let staffList = await db.staff.findAll({ where: { id: staffIds }, raw: true });
          // Enrich staff with organization image
          for (let i = 0; i < staffList.length; i++) {
            let staff = staffList[i];
            if (!staff.organization_logo_image_url && staff.organization_id) {
              const org = await db.owner.findOne({ where: { id: staff.organization_id }, attributes: ['certificate_logo_image_url'], raw: true });
              staff.organization_logo_image_url = org ? org.certificate_logo_image_url : null;
            }
            staffList[i] = staff;
          }
          // Deduplicate staff by id (should already be unique, but just in case)
          const uniqueStaff = [];
          const seen = new Set();
          for (const s of staffList) {
            if (!seen.has(s.id)) {
              uniqueStaff.push(s);
              seen.add(s.id);
            }
          }
          courseData.staff = uniqueStaff;
        } else {
          courseData.staff = [];
        }
      } else {
        courseData.industry_insights = null;
        courseData.program_type = null;
        courseData.courses = [];
        courseData.total_courses = 0;
      }
    } else {
      if (course.type_id) {
        const programType = await db.program_type.findOne({ where: { id: courseData.type_id }, attributes: ['name', 'slug'], raw: true });
        courseData.program_type_name = programType ? programType.name : null;
        courseData.program_type_slug = programType ? programType.slug : null;
      } else {
        courseData.program_type_name = null;
        courseData.program_type_slug = null;
      }
    }

    // Fetch staff via staff_course pivot table
    if (courseData?.content_type !== 'program' || courseData?.content_type === 'program') {
      const staffCourseLinks = await db.staff_course.findAll({ where: { course_id: course.id }, attributes: ['staff_id'], raw: true });
      const staffIds = staffCourseLinks.map(link => link.staff_id);
      if (staffIds.length > 0) {
        let staffList = await db.staff.findAll({ where: { id: staffIds }, raw: true });
        // Enrich staff with organization image if not present
        for (let i = 0; i < staffList.length; i++) {
          let staff = staffList[i];
          if (!staff.organization_logo_image_url && staff.organization_id) {
            const org = await db.owner.findOne({ where: { id: staff.organization_id }, attributes: ['certificate_logo_image_url'], raw: true });
            staff.organization_logo_image_url = org ? org.certificate_logo_image_url : null;
          }
          staffList[i] = staff;
        }
        courseData.staff = staffList;
      } else {
        courseData.staff = [];
      }
    }

    // Add programs list for this course
    const programLinks = await db.program_course.findAll({ where: { course_id: course.id }, attributes: ['program_id'], raw: true });
    let programs = [];
    if (programLinks.length > 0) {
      const programIds = programLinks.map(link => link.program_id);
      const programRecords = await db.program.findAll({ where: { id: programIds }, attributes: ['id', 'course_id'], raw: true });
      // Fetch titles from courses table
      const courseIds = programRecords.map(p => p.course_id);
      const courseRecords = await db.courses.findAll({ where: { id: courseIds }, attributes: ['id', 'key', 'title'], raw: true });
      const courseMap = {};
      for (const c of courseRecords) courseMap[c.id] = { key: c.key, title: c.title };
      programs = programRecords.map(p => ({ key: courseMap[p.course_id]?.key || '', title: courseMap[p.course_id]?.title || '' }));
    }
    courseData.programs = programs;
    // Add course_providers with image only
    let courseProviderImage = null;
    let courseProviderName = '';
    if (courseData.course_provider_id) {
      const provider = await db.course_providers.findOne({ where: { id: courseData.course_provider_id }, attributes: ['name', 'logo_url'], raw: true });
      courseProviderName = provider ? provider.name : '';
      if (provider && provider.logo_url) {
        // Prepend domain from env if not already absolute
        const domain = process.env.BASE_URL || '';
        if (provider.logo_url.startsWith('http')) {
          courseProviderImage = provider.logo_url;
        } else {
          courseProviderImage = domain.replace(/\/$/, '') + provider.logo_url;
        }
      }
    }
    courseData.course_provider = {
      name: courseProviderName,
      image: courseProviderImage
    };

    // console.log("Sending courseData: ", courseData);

    res.json({
      data: courseData,
      status: true,
      statusCode: 200
    });
  } catch (error) {
    // console.error('error in getCoursesDetail======>', error);
    return res.json({ message: 'Internal Server Error', status: false, statusCode: 500 });
  }
}

export const uploadCourseImage = getUpload('courses').single('image');

export async function createCourse(req, res) {
  try {
    // Ensure req.body is always an object
    if (!req.body || typeof req.body !== 'object') {
      req.body = {};
    }
    // Handle owner field
    if (req.body.owner) {
      req.body.owners = [req.body.owner];
      delete req.body.owner;
    }
    const fieldsToCheck = [
      'estimated_hours',
      'start_date',
      'self_cost',
      'self_caption',
      'interactive_cost',
      'interactive_caption',
      'payment_type_self',
      'payment_type_interactive',
    ];
    fieldsToCheck.forEach(field => {
      if (req.body[field] === 'null' || req.body[field] === '' || !req.body[field]) {
        req.body[field] = null;
      }
    });
    // Combine min_effort and max_effort into efforts JSON if present
    if (req.body.min_effort !== undefined || req.body.max_effort !== undefined) {
      req.body.efforts = {
        min_effort: req.body.min_effort ?? null,
        max_effort: req.body.max_effort ?? null
      };
      delete req.body.min_effort;
      delete req.body.max_effort;
    }
    if (req.body.disclaimer) {
      req.body.disclaimer = String(req.body.disclaimer).split(',')[0] === "1" ? 1 : 0;
    }
    // Generate uuid if not provided
    if (!req.body.uuid) {
      req.body.uuid = uuidv4();
    }
    // Generate key if not provided
    if (!req.body.key) {
      // Try to use course_provider_id to get provider name if available
      let provider = req.body.provider || req.body.course_provider || '';
      if (!provider && req.body.course_provider_id) {
        const providerObj = await db.course_providers.findByPk(req.body.course_provider_id);
        provider = providerObj ? providerObj.name : '';
      }
      req.body.key = generateCourseKey({ provider, title: req.body.title });
    }
    // Handle image upload
    if (req.file) {
      req.body.image_url = await uploadLogo(req.file, 'courses');
    }
    if (req.files && req.files.degree_pdf_path && req.files.degree_pdf_path[0]) {
      const pdfFile = req.files.degree_pdf_path[0];
      req.body.degree_pdf_path = `/uploads/courses/${pdfFile.filename}`;
    }
    if (req.body.staff) {
      req.body.staff = normalizeToNumberArray(req.body.staff);
    }
    if (req.body.facilitator) {
      req.body.facilitator = normalizeToNumberArray(req.body.facilitator);
    }
    if (req.body.subjects) {
      req.body.subjects = normalizeToNumberArray(req.body.subjects);
    }
    if (req.body.owners) {
      req.body.owners = normalizeToNumberArray(req.body.owners);
    }
    const course = await db.courses.create(req.body);
    if (!course) {
      return res.json({ message: 'Course not created', status: false, statusCode: 400 });
    }
    // If content_type is 'program', insert into programs table
    let programInstance = null;
    if (req.body.content_type === 'program') {
      programInstance = await db.program.create({
        course_id: course.id,
        industry_insights: req.body.industry_insights || null
      });
      // Set type_id on course
      if (req.body.program_type) {
        await course.update({ type_id: req.body.program_type });
      }
      // If courses array is provided, create program_courses records
      if (Array.isArray(req.body.courses) && req.body.courses.length > 0) {
        const uniqueCourseIds = [...new Set(req.body.courses.map(Number).filter(Boolean))];
        for (const courseId of uniqueCourseIds) {
          // Check for existing record to avoid duplicates
          const exists = await db.program_course.findOne({ where: { program_id: programInstance.id, course_id: courseId } });
          if (!exists) {
            await db.program_course.create({ program_id: programInstance.id, course_id: courseId });
          }
        }
      }
    } else if (req.body.content_type === 'course') {
      // Set type_id to the id of program_type where slug = 'course'
      const courseType = await db.program_type.findOne({ where: { slug: 'course' } });
      if (courseType) {
        await course.update({ type_id: courseType.id });
      }
    }
    // After creating the course, update staff_course if staff is provided
    if (req.body.staff && Array.isArray(req.body.staff)) {
      const staffIds = req.body.staff.map(Number).filter(Boolean);
      // Remove staff_course not in the new list
      await db.staff_course.destroy({
        where: {
          course_id: course.id,
          staff_id: { [Op.notIn]: staffIds }
        }
      });
      // Add new staff_course records (no duplicates)
      for (const staffId of staffIds) {
        const exists = await db.staff_course.findOne({ where: { course_id: course.id, staff_id: staffId } });
        if (!exists) {
          await db.staff_course.create({ course_id: course.id, staff_id: staffId });
        }
      }
    }
    return res.json({ message: 'Course created successfully', status: true, statusCode: 200, data: course });
  } catch (error) {
    console.error('error in createCourse======>', error);
    return res.json({ message: 'Internal Server Error', status: false, statusCode: 500 });
  }
}

export async function updateCobranding(req, res) {
  try {
    const { courseId } = req.params;
    const { cobranding } = req.body;

    if (cobranding === undefined || (cobranding !== 0 && cobranding !== 1)) {
      return res.json({ message: 'Invalid cobranding value. Must be 0 or 1.', status: false, statusCode: 400 });
    }

    const [updated] = await db.courses.update({ cobranding }, { where: { id: courseId } });
    if (!updated) {
      return res.json({ message: 'Course not found or not updated', status: false, statusCode: 404 });
    }

    return res.json({ message: 'Cobranding updated successfully', status: true, statusCode: 200 });
  } catch (error) {
    //console.error('error in updateCobranding======>', error);
    return res.json({ message: 'Internal Server Error', status: false, statusCode: 500 });
  }
}

export async function updateCourse(req, res) {
  try {
    const { courseId } = req.params;
    // Handle owner field
    if (req.body.owner) {
      req.body.owners = [req.body.owner];
      delete req.body.owner;
    }
    const fieldsToCheck = [
      'subjects',
      'start_date',
      'enrollment_count',
      'prerequisites',
      'outcome',
      'course_modules',
      'order',
      'estimated_hours',
      'self_cost',
      'self_caption',
      'interactive_cost',
      'interactive_caption',
      'payment_type_self',
      'payment_type_interactive'
    ];

    if (req.body.price) {
      if (Array.isArray(req.body.price)) {
        req.body.price = req.body.price.join(' ');
      } else if (typeof req.body.price === 'object') {
        req.body.price = JSON.stringify(req.body.price);
      }
      req.body.price = String(req.body.price);
    }

    if (req.body.disclaimer) {
      req.body.disclaimer = String(req.body.disclaimer).split(',')[0] === "1" ? 1 : 0;
    }

    if (req.body.register_link) {
      if (Array.isArray(req.body.register_link)) {
        req.body.register_link = req.body.register_link.join(' ');
      } else if (typeof req.body.register_link === 'object') {
        req.body.register_link = JSON.stringify(req.body.register_link);
      }
      req.body.register_link = String(req.body.register_link);
    }

    fieldsToCheck.forEach(field => {
      if (req.body[field] === 'null' || req.body[field] === '' || !req.body[field]) {
        req.body[field] = null;
      }
    });
    // Combine min_effort and max_effort into efforts JSON if present
    if (req.body.min_effort !== undefined || req.body.max_effort !== undefined) {
      req.body.efforts = {
        min_effort: req.body.min_effort ?? null,
        max_effort: req.body.max_effort ?? null
      };
      delete req.body.min_effort;
      delete req.body.max_effort;
    }
    if (req.file) {
      req.body.image_url = await uploadLogo(req.file, 'courses');
    }
    if (req.files && req.files.degree_pdf_path && req.files.degree_pdf_path[0]) {
      const pdfFile = req.files.degree_pdf_path[0];
      req.body.degree_pdf_path = `/uploads/courses/${pdfFile.filename}`;
      console.log('✅ Degree PDF uploaded:', req.body.degree_pdf_path);
    }
    // Normalize staff, subjects, owners, and facilitator to array of numbers if present
    if (req.body.staff) {
      req.body.staff = normalizeToNumberArray(req.body.staff);
    }
    if (req.body.subjects) {
      req.body.subjects = normalizeToNumberArray(req.body.subjects);
    }
    if (req.body.owners) {
      req.body.owners = normalizeToNumberArray(req.body.owners);
    }
    if (req.body.facilitator) {
      req.body.facilitator = normalizeToNumberArray(req.body.facilitator);
    }

    const [updated] = await db.courses.update(req.body, { where: { id: courseId } });
    if (!updated) {
      return res.json({ message: 'Course not updated', status: false, statusCode: 400 });
    }
    // If content_type is 'program', update the programs table
    if (req.body.content_type === 'program') {
      let program = await db.program.findOne({ where: { course_id: courseId } });
      if (program) {
        await program.update({
          industry_insights: req.body.industry_insights || null
        });
      } else {
        program = await db.program.create({
          course_id: courseId,
          industry_insights: req.body.industry_insights || null
        });
      }
      // Set type_id on course
      if (req.body.program_type) {
        await db.courses.update({ type_id: req.body.program_type }, { where: { id: courseId } });
      }
      // If courses array is provided, update program_courses records
      if (Array.isArray(req.body.courses) && req.body.courses.length > 0) {
        const uniqueCourseIds = [...new Set(req.body.courses.map(Number).filter(Boolean))];
        // Remove program_courses not in the new list
        await db.program_course.destroy({
          where: {
            program_id: program.id,
            course_id: { [Op.notIn]: uniqueCourseIds }
          }
        });
        // Add new program_courses (no duplicates)
        for (const cId of uniqueCourseIds) {
          const exists = await db.program_course.findOne({ where: { program_id: program.id, course_id: cId } });
          if (!exists) {
            await db.program_course.create({ program_id: program.id, course_id: cId });
          }
        }
      }
    }
    if (req.body.staff && Array.isArray(req.body.staff)) {
      const staffIds = req.body.staff.map(Number).filter(Boolean);
      await db.staff_course.destroy({
        where: {
          course_id: courseId,
          staff_id: { [Op.notIn]: staffIds }
        }
      });
      for (const staffId of staffIds) {
        const exists = await db.staff_course.findOne({ where: { course_id: courseId, staff_id: staffId } });
        if (!exists) {
          await db.staff_course.create({ course_id: courseId, staff_id: staffId });
        }
      }
    }
    const updatedCourse = await db.courses.findByPk(courseId);
    return res.json({ message: 'Course updated successfully', status: true, statusCode: 200, data: updatedCourse });
  } catch (error) {
    console.error('error in updateCourse======>', error);
    return res.json({ message: 'Internal Server Error', status: false, statusCode: 500 });
  }
}

export async function deleteCourse(req, res) {
  try {
    const { courseId } = req.params;
    // Find the course by uuid to get its id and content_type
    const course = await db.courses.findOne({ where: { uuid: courseId } });
    if (!course) {
      return res.json({ message: 'Course not found', status: false, statusCode: 404 });
    }
    if (course.content_type === 'program') {
      // Find and delete the related program record(s)
      const program = await db.program.findOne({ where: { course_id: course.id } });
      if (program) {
        // Delete all program_courses for this program
        await db.program_course.destroy({ where: { program_id: program.id } });
        // Delete the program record
        await db.program.destroy({ where: { id: program.id } });
      }
    }
    // Delete all staff_course assignments for this course
    await db.staff_course.destroy({ where: { course_id: course.id } });
    // Delete the course itself
    const deleted = await db.courses.destroy({ where: { uuid: courseId } });
    return res.json({ message: 'Course deleted successfully', status: true, statusCode: 200, data: deleted });
  } catch (error) {
    //console.error('error in deleteCourse======>', error);
    return res.json({ message: 'Internal Server Error', status: false, statusCode: 500 });
  }
}

const normalizeArray = (input) => {
  if (!input) return [];

  // If it's already an array, return as-is
  if (Array.isArray(input)) return input;

  // If it's a string, try to parse it
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    //console.warn('Invalid JSON input:', input);
    return [];
  }
};

export const getFilterData = async (req, res) => {
  try {
    const { courses, owner, program_type, subject } = db;
    const coursesPromise = courses.findAll({
      attributes: [
        'subjects',
        'skills',
        'owners',
        'course_level',
        'available_languages',
        'availability',
      ]
    });

    const programTypesPromise = program_type.findAll({
      attributes: ['name', 'id', 'slug'],
      raw: true,
    });

    const [courseData, program_types] = await Promise.all([coursesPromise, programTypesPromise]);

    const uniqueSubjects = new Set();
    const uniqueSkills = new Set();
    const ownerIds = new Set();
    const uniqueCourseLevels = new Set();
    const uniqueLanguages = new Set();
    const uniqueAvailabilities = new Set();

    for (const course of courseData) {
      normalizeArray(course.subjects).forEach(subject => uniqueSubjects.add(subject));
      normalizeArray(course.skills).forEach(skill => uniqueSkills.add(skill));
      normalizeArray(course.owners).forEach(ownerId => ownerIds.add(ownerId));
      normalizeArray(course.available_languages).forEach(lang => uniqueLanguages.add(lang));

      if (course.course_level) {
        uniqueCourseLevels.add(course.course_level);
      }

      // normalizeArray(course.available_languages).forEach(lang => {
      //   if (lang) {
      //     uniqueLanguages.set(lang);
      //   }
      // });

      if (course.availability) {
        uniqueAvailabilities.add(course.availability);
      }
    }

    const owners = await owner.findAll({
      where: {
        id: [...ownerIds]
      },
      attributes: ['id', 'uuid', 'name', 'certificate_logo_image_url'],
      raw: true,
    });

    const subjects = await subject.findAll({
      where: {
        id: [...uniqueSubjects]
      },
      attributes: ['id', 'title'],
      raw: true,
    });

    const response = {
      subjects: subjects,
      skills: [...uniqueSkills],
      owners: owners,
      program_types,
      course_level: [...uniqueCourseLevels],
      available_languages: [...uniqueLanguages.values()],
      availability: [...uniqueAvailabilities],
    };

    res.status(200).json(response);

  } catch (error) {
    console.error("Error while sending: ", error);
    res.status(500).json({ message: "Error fetching filter data" });
  }
};

export const getAllFilterData = async (req, res) => {
  try {
    // Fetch all subjects
    const subjects = await db.subject.findAll({
      attributes: ['id', 'title'],
      order: [['display_order', 'ASC'], ['created_at', 'DESC']],
      raw: true,
    });

    // Fetch all owners (universities)
    const owners = await db.owner.findAll({
      attributes: ['id', 'name', 'certificate_logo_image_url'],
      order: [['id', 'ASC']],
      raw: true,
    });

    // Fetch all staff
    const staff = await db.staff.findAll({
      attributes: ['id', 'family_name', 'given_name'],
      order: [['id', 'ASC']],
      raw: true,
    });

    const facilitator = await db.facilitator.findAll({
      attributes: ['id', 'first_name', 'last_name'],
      order: [['id', 'ASC']],
      raw: true,
    });

    // Fetch all courses for skills, available_languages, transcript_languages
    const courses = await db.courses.findAll({
      attributes: ['skills', 'available_languages', 'transcript_languages', 'title', 'id'],
      where: { content_type: 'course' },
      raw: true,
    });

    let programTypes = [];
    let coursesList = [];
    if (req.query.type === 'programs' || req.query.filter === 'courses') {
      programTypes = await db.program_type.findAll({
        attributes: ['id', 'name'],
        raw: true,
      });
      coursesList = courses
        .filter(course => course.id && course.title)
        .map(course => ({ id: course.id, title: course.title }))
        .sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
    }

    // Normalize helper
    const normalizeArray = (input) => {
      if (!input) return [];
      if (Array.isArray(input)) return input;
      try {
        const parsed = JSON.parse(input);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    // Collect unique skills, available_languages, transcript_languages
    const uniqueSkills = new Set();
    const uniqueAvailableLanguages = new Map();
    const uniqueTranscriptLanguages = new Map();

    for (const course of courses) {
      normalizeArray(course.skills).forEach(skill => {
        if (skill) uniqueSkills.add(skill);
      });
      normalizeArray(course.available_languages).forEach(lang => {
        if (lang && lang.code && !uniqueAvailableLanguages.has(lang.code)) {
          uniqueAvailableLanguages.set(lang.code, lang);
        }
      });
      normalizeArray(course.transcript_languages).forEach(lang => {
        if (lang && lang.code && !uniqueTranscriptLanguages.has(lang.code)) {
          uniqueTranscriptLanguages.set(lang.code, lang);
        }
      });
    }

    // Fetch all course providers
    const courseProviders = await db.course_providers.findAll({
      attributes: ['id', 'name', 'logo_url', 'slug', 'status'],
      order: [['created_at', 'DESC']],
      raw: true,
    });

    // Sort helpers
    const sortByKey = (arr, key) => arr.slice().sort((a, b) => {
      if (!a[key] && !b[key]) return 0;
      if (!a[key]) return 1;
      if (!b[key]) return -1;
      return a[key].toLowerCase().localeCompare(b[key].toLowerCase());
    });
    const sortStrings = arr => arr.slice().sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    const sortedSubjects = sortByKey(subjects, 'title');
    const sortedProgramTypes = sortByKey(programTypes, 'name');
    const sortedOwners = sortByKey(owners, 'name');
    const sortedStaff = sortByKey(staff, 'family_name');
    const sortedFacilitator = sortByKey(facilitator, 'first_name');
    const sortedSkills = sortStrings([...uniqueSkills]);
    const sortedAvailableLanguages = sortByKey([...uniqueAvailableLanguages.values()], 'name' in ([...uniqueAvailableLanguages.values()][0] || {}) ? 'name' : 'code');
    const sortedTranscriptLanguages = sortByKey([...uniqueTranscriptLanguages.values()], 'name' in ([...uniqueTranscriptLanguages.values()][0] || {}) ? 'name' : 'code');
    const sortedCourseProviders = sortByKey(courseProviders, 'name');

    const response = {
      subjects: sortedSubjects,
      owners: sortedOwners,
      staff: sortedStaff,
      facilitator: sortedFacilitator,
      skills: sortedSkills,
      available_languages: sortedAvailableLanguages,
      transcript_languages: sortedTranscriptLanguages,
      course_providers: sortedCourseProviders,
    };

    if (req.query.type === 'programs' || req.query.filter === 'courses') {
      response.program_types = sortedProgramTypes;
      response.courses = coursesList;
    }

    // Filter response if filter param is present
    if (req.query.filter) {
      let filters = req.query.filter;

      if (typeof filters === 'string') {
        // Support comma-separated or repeated filter params
        if (filters.includes(',')) {
          filters = filters.split(',').map(f => f.trim().toLowerCase());
        } else {
          filters = [filters.toLowerCase()];
        }
      } else if (Array.isArray(filters)) {
        filters = filters.map(f => f.toLowerCase());
      }
      // //console.log('filters :>> ', filters);
      if (Array.isArray(filters) && filters.length > 1) {
        const filteredResponse = {};
        for (const key of filters) {
          if (response.hasOwnProperty(key)) {
            filteredResponse[key] = response[key];
          }
        }
        return res.status(200).json(filteredResponse);
      } else if (Array.isArray(filters) && filters.length === 1) {
        // Always return as an object: { key: value }
        const key = filters[0];
        if (response.hasOwnProperty(key)) {
          return res.status(200).json({ [key]: response[key] });
        } else {
          return res.status(200).json({});
        }
      }
    }

    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching all filter data' });
  }
};

export const exportCoursesCsv = async (req, res) => {
  try {
    const courses = await db.courses.findAll({
      raw: true,
      attributes: [
        'title', 'key', 'start_date', 'enrollment_count', 'available_languages',
        'course_provider_id', 'type_id', 'cobranding', 'status', 'price', 'owners'
      ]
    });

    const providerIds = [...new Set(courses.map(c => c.course_provider_id).filter(id => id))];
    const providers = await db.course_providers.findAll({
      where: { id: providerIds },
      attributes: ['id', 'name'],
      raw: true
    });
    const providerMap = providers.reduce((acc, p) => { acc[p.id] = p.name; return acc; }, {});

    // 2. Owners (need to parse JSON field)
    let allOwnerIds = [];
    courses.forEach(c => {
      try {
        const parsed = JSON.parse(c.owners);
        if (Array.isArray(parsed)) allOwnerIds.push(...parsed);
      } catch (e) {
        // ignore invalid json
      }
    });
    allOwnerIds = [...new Set(allOwnerIds)];

    const ownersData = await db.owner.findAll({
      where: { id: allOwnerIds },
      attributes: ['id', 'name'],
      raw: true
    });
    const ownerMap = ownersData.reduce((acc, o) => { acc[o.id] = o.name; return acc; }, {});


    // Build CSV content
    // Header
    const headers = [
      'Title', 'Key', 'Start Date', 'Enrollment Count', 'Available Languages',
      'Course Provider', 'Type ID', 'Cobranding', 'Status', 'Price', 'Owners'
    ];
    let csvContent = headers.join(',') + '\n';

    for (const course of courses) {
      const row = [];

      // Helper to escape CSV fields
      const escapeCsv = (val) => {
        if (val === null || val === undefined) return '';
        const stringVal = String(val);
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      };

      row.push(escapeCsv(course.title));
      row.push(escapeCsv(course.key));
      row.push(escapeCsv(course.start_date ? new Date(course.start_date).toISOString().split('T')[0] : ''));
      row.push(escapeCsv(course.enrollment_count));

      let languagesStr = '';
      let langVal = course.available_languages;

      if (typeof langVal === 'string') {
        try {
          if (langVal.trim().startsWith('[') || langVal.trim().startsWith('{')) {
            langVal = JSON.parse(langVal);
          }
        } catch (e) {
          console.log("error(edxContent.js:1782): ", e);
        }
      }

      if (Array.isArray(langVal)) {
        languagesStr = langVal.join('; ');
      } else if (langVal) {
        languagesStr = String(langVal);
      }
      row.push(escapeCsv(languagesStr));

      row.push(escapeCsv(providerMap[course.course_provider_id] || ''));

      row.push(escapeCsv(course.type_id));
      row.push(escapeCsv(course.cobranding));
      row.push(escapeCsv(course.status));
      row.push(escapeCsv(course.price));

      // Owners Names
      let ownersStr = '';
      try {
        const ownerIds = JSON.parse(course.owners);
        if (Array.isArray(ownerIds)) {
          ownersStr = ownerIds.map(id => ownerMap[id]).filter(Boolean).join('; ');
        }
      } catch { ownersStr = ''; }
      row.push(escapeCsv(ownersStr));

      csvContent += row.join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="courses_export.csv"');
    res.status(200).send(csvContent);

  } catch (error) {
    console.error("Error exporting courses CSV:", error);
    res.status(500).json({ message: "Error exporting courses", status: false });
  }
};
