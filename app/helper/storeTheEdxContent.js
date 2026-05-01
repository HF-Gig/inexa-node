import axios from 'axios';
import db from '../../db.js';
import cron from 'node-cron';
import fs from 'fs';
import { getEdxToken } from './generateEdxToken.js';
import logger from './logger.js';
import { Op } from 'sequelize';

function safeJsonField(val, fallback = null) {
  if (val == null) return fallback;
  if (Array.isArray(val) || typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return parsed;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

// Common function to extract only specified fields from each object in an array (or JSON string)
function extractFieldsFromArray(arr, fields) {
  const array = safeJsonField(arr);
  if (!Array.isArray(array) || array.length === 0) return null;
  return array.map(obj => {
    const result = {};
    for (const field of fields) {
      result[field] = obj && obj[field] !== undefined ? obj[field] : null;
    }
    return result;
  });
}

async function upsertOrganization(org, silent = false) {
  if (!org) return null;
  const {
    organization_name,
    organization_id = null,
    organization_uuid = null,
    organization_logo_image_url = null
  } = org;

  if (!organization_name) return null;

  let existing = null;
  // 1. Try finding by UUID
  if (organization_uuid) {
    existing = await db.organization.findOne({ where: { organization_uuid } });
  }
  // 2. Try finding by Org ID
  if (!existing && organization_id) {
    existing = await db.organization.findOne({ where: { organization_id } });
  }
  // 3. Try finding by Name
  if (!existing) {
    existing = await db.organization.findOne({ where: { organization_name } });
  }

  if (existing) {
    const updateData = {};
    if (organization_id) updateData.organization_id = organization_id;
    if (organization_uuid) updateData.organization_uuid = organization_uuid;
    if (organization_logo_image_url) updateData.organization_logo_image_url = organization_logo_image_url;

    if (Object.keys(updateData).length > 0) {

      logger.info({
        msg: '🔄 DB UPDATE: Organization',
        id: existing.id,
        name: existing.organization_name,
        changes: updateData
      });

      await db.organization.update(updateData, { where: { id: existing.id }, silent });
    } else {
      logger.info({
        msg: 'Start DB NO-OP: Organization (Skipped Update)',
        id: existing.id,
        name: existing.organization_name,
        reason: 'Incoming data was null or empty'
      });
    }
    return existing.id;
  } else {
    const createData = {
      organization_name,
      organization_id,
      organization_uuid,
      organization_logo_image_url
    };

    logger.info({
      msg: '✨ DB CREATE: Organization',
      data: createData
    });

    const created = await db.organization.create(createData);
    return created.id;
  }
}

// Helper for staff: extract only required fields, including nested fields
async function extractStaffFields(staffArr, silent = false) {
  // If it's a string, try to parse it
  let array = staffArr;
  if (typeof array === 'string') {
    try {
      array = JSON.parse(array);
    } catch {
      array = null;
    }
  }
  if (!Array.isArray(array) || array.length === 0) return null;

  const staffUuids = [];

  for (const obj of array) {
    const staffData = {
      uuid: obj?.uuid || null,
      family_name: obj?.family_name || null,
      given_name: obj?.given_name || null,
      profile_image_url: obj?.profile_image_url || (obj?.profile_image?.medium?.url ?? null),
      position_title: obj?.position?.title || null,
      organization_name: obj?.position?.organization_name || null,
      organization_logo_image_url: obj?.position?.organization_logo_image_url || null,
      organization_id: null
    };

    // Upsert organization if present
    let orgId = null;
    if (obj?.position && obj.position.organization_name) {
      orgId = await upsertOrganization({
        organization_name: obj.position.organization_name,
        organization_id: obj.position.organization_id,
        organization_uuid: obj.position.organization_uuid,
        organization_logo_image_url: obj.position.organization_logo_image_url
      }, silent);
    }

    if (obj?.position) {
      if (obj.position.organization_name || obj.position.organization_id || obj.position.organization_uuid) {
        logger.info({
          msg: '🏢 Organization Data Fetched',
          staff_name: `${obj.given_name} ${obj.family_name}`,
          raw_org_data: {
            name: obj.position.organization_name,
            api_id: obj.position.organization_id, // The field causing issues
            uuid: obj.position.organization_uuid,
            logo: obj.position.organization_logo_image_url
          }
        });
      }
    }

    // Add organization_id to staffData
    staffData.organization_id = orgId;

    // logger.info({
    //   msg: 'Staff Data Fetched',
    //   staff_uuid: staffData.uuid,
    //   name: `${staffData.given_name} ${staffData.family_name}`,
    //   data: staffData
    // });
    // Remove organization_name and organization_logo_image_url from staffData if present
    delete staffData.organization_name;
    delete staffData.organization_logo_image_url;

    if (staffData.uuid) {
      let existingStaff = await db.staff.findOne({ where: { uuid: staffData.uuid } });
      if (!existingStaff) {
        const newStaff = await db.staff.create(staffData);
        staffUuids.push(newStaff.id);
      } else {
        const updatedStaff = await db.staff.update(staffData, { where: { uuid: staffData.uuid }, silent });
        staffUuids.push(existingStaff.id);
      }
    } else {
      const newStaff = await db.staff.create(staffData);
      staffUuids.push(newStaff.id);
    }
  }

  return staffUuids.length > 0 ? staffUuids : null;
}

function getCurrentOrLatestRun(course_runs) {
  if (!Array.isArray(course_runs) || course_runs.length === 0) return null;

  // Prefer 'current' availability
  let currentRun = course_runs.find(run =>
    (run.availability || '').toLowerCase() !== 'archived'
  );
  if (currentRun) return currentRun;

  // Otherwise, pick the latest by end_date, then start_date
  return course_runs
    .slice()
    .sort((a, b) => {
      const aDate = new Date(a.start_date || 0);
      const bDate = new Date(b.start_date || 0);
      return bDate - aDate;
    })[0];
}

// Helper to upsert owners and return their IDs
async function upsertOwners(ownersArr, silent = false) {
  if (!Array.isArray(ownersArr) || ownersArr.length === 0) return [];
  const ownerIds = [];
  for (const obj of ownersArr) {
    if (!obj) continue;
    let existing = null;
    // First try to find by name
    if (obj.name) {
      existing = await db.owner.findOne({ where: { name: obj.name } });
    }
    // If not found by name, try by uuid
    if (!existing && obj.uuid) {
      existing = await db.owner.findOne({ where: { uuid: obj.uuid } });
    }
    if (existing) {
      // Only update fields that are missing or null
      const updateData = {};
      if (!existing.uuid && obj.uuid) {
        updateData.uuid = obj.uuid;
      }
      if (!existing.certificate_logo_image_url && obj.certificate_logo_image_url) {
        updateData.certificate_logo_image_url = obj.certificate_logo_image_url;
      }
      if (Object.keys(updateData).length > 0) {
        await db.owner.update(updateData, { where: { id: existing.id }, silent });
      }
      ownerIds.push(existing.id);
    } else {
      const created = await db.owner.create({
        uuid: obj.uuid,
        certificate_logo_image_url: obj.certificate_logo_image_url,
        name: obj.name,
      });
      ownerIds.push(created.id);
    }
  }
  return ownerIds;
}

// Helper to generate a unique key for a course
async function generateUniqueCourseKey(course) {
  let baseKey = course.key || (course.title ? course.title.replace(/\s+/g, '_') : null);
  if (!baseKey) return null;
  let uniqueKey = baseKey;
  let suffix = 1;
  while (true) {
    // Check if a course with this key exists (excluding the current course by uuid if present)
    const where = { key: uniqueKey };
    if (course.uuid) {
      where.uuid = { [db.Sequelize.Op.ne]: course.uuid };
    }
    const existing = await db.courses.findOne({ where });
    if (!existing) break;
    uniqueKey = `${baseKey}_${suffix}`;
    suffix++;
  }
  return uniqueKey;
}

async function ensureDefaultEdxCourseCostConfig({ providerId, courseId }) {
  // We no longer manually seed specific courses with default pricing on sync.
  // The system's 'applyCountrySpecificCosts' implicitly falls back to the 
  // centralized provider default pricing (course_id: null) when rendering details to users.
  return;
}

async function fetchAndStoreEdxCourses(req, res, silent = false) {
  if (!req && !res) silent = true;
  let totalInserted = 0, totalUpdated = 0, totalSkipped = 0;
  const fetchedCourseUuids = new Set();
  const results = [];
  try {
    // logger.info('Starting EDX Course Sync...');
    // 1. Get access token
    let accessToken = await getEdxToken();
    if (!accessToken) throw new Error('Failed to get access token');
    console.log("✅ Access token acquired");

    // Fetch edX provider id
    const edxProvider = await db.course_providers.findOne({ where: { slug: 'edx' } });
    const edxProviderId = edxProvider ? edxProvider.id : null;
    console.log(`🔹 EDX provider ID: ${edxProviderId}`);

    // 2. Get enterprise catalogs (to get UUID)
    const catalogResp = await axios.get('https://api.edx.org/enterprise/v2/enterprise-catalogs/', {
      headers: { Authorization: `JWT ${accessToken}` }
    });
    const catalogs = catalogResp.data.results;
    if (!catalogs || catalogs.length === 0) throw new Error('No enterprise catalogs found');
    const catalogUUID = catalogs[0].uuid; // Use the first catalog UUID
    console.log(`🔹 Catalog UUID: ${catalogUUID}`);

    // 3. Fetch all courses from the catalog with pagination
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      const url = `https://api.edx.org/enterprise/v2/enterprise-catalogs/${catalogUUID}/?page=${page}&page_size=100`;
      let data;
      let retry401 = false;
      try {
        const resp = await axios.get(url, {
          headers: { Authorization: `JWT ${accessToken}` }
        });
        data = resp.data;
      } catch (err) {
        if (err.response && err.response.status === 401) {
          // Refresh token and retry once
          accessToken = await getEdxToken();
          try {
            const resp = await axios.get(url, {
              headers: { Authorization: `JWT ${accessToken}` }
            });
            data = resp.data;
          } catch (err2) {
            if (err2.response && err2.response.status === 401) {
              // If still 401, throw error
              throw new Error('Failed to get access to EDX API after token refresh');
            } else if (err2.response && err2.response.status === 500) {
              // Skip this page and continue
              page++;
              continue;
            } else {
              throw err2;
            }
          }
        } else if (err.response && err.response.status === 500) {
          // Skip this page and continue
          page++;
          continue;
        } else {
          // console.log('page :>> ', page);
          throw err;
        }
      }

      const courses = data.results || [];

      for (const course of courses) {

        // logger.info({
        //   msg: '📦 Course Fetched Raw Data',
        //   course_uuid: course.uuid,
        //   course_title: course.title,
        //   data: course
        // });
        if (course.uuid) {
          fetchedCourseUuids.add(course.uuid);
        }
        const courseRuns = course.course_runs || [];
        const selectedRun = getCurrentOrLatestRun(courseRuns);
        let staffArr = selectedRun?.staff;

        const ownerIds = await upsertOwners(course.owners, silent);
        // SUBJECTS SYNC
        let subjectIds = [];
        if (Array.isArray(course.subjects)) {
          for (const subjName of course.subjects.map(s => s.name)) {
            if (!subjName) continue;
            const slug = subjName.toLowerCase().replace(/\s+/g, '-');
            let subject = await db.subject.findOne({ where: { slug } });
            if (!subject) {
              subject = await db.subject.create({
                title: subjName,
                slug,
                image_url: course.image_url || null,
                status: true
              });
            }
            subjectIds.push(subject.id);
          }
        }
        // Before creating or updating a course, generate a unique key
        const uniqueKey = await generateUniqueCourseKey(course);
        const courseTypes = await db.program_type.findOne({ where: { slug: 'course' } });
        let courseData = {
          key: uniqueKey,
          uuid: course.uuid,
          owners: ownerIds,
          subjects: subjectIds.length > 0 ? subjectIds : null,
          full_description: course.full_description || null,
          short_description: course.short_description || null,
          content_type: course.content_type,
          title: course.title || null,
          image_url: course.image_url || null,
          start_date: selectedRun?.start || null,
          enrollment_count: course.enrollment_count || null,
          skills: safeJsonField(course.skills ? course.skills.map(s => s.name) : course.skill_names),
          weeks_to_complete: selectedRun?.weeks_to_complete || null,
          estimated_hours: selectedRun?.estimated_hours || null,
          available_languages: Array.isArray(selectedRun.ai_languages?.translation_languages) ? selectedRun.ai_languages.translation_languages.map(l => l.label).filter(Boolean) : [],
          transcript_languages: Array.isArray(selectedRun.ai_languages?.transcription_languages) ? selectedRun.ai_languages.transcription_languages.map(l => l.label).filter(Boolean) : [],
          course_modules: course?.syllabus_raw || null,
          course_level: course?.level_type?.toLowerCase() || null,
          availability: selectedRun?.availability?.toLowerCase() || null,
          prerequisites: course?.prerequisites_raw || null,
          pacing_type: selectedRun?.pacing_type || null,
          efforts: safeJsonField((selectedRun.min_effort || selectedRun.max_effort) ? {
            min_effort: selectedRun?.min_effort,
            max_effort: selectedRun?.max_effort
          } : null),
          course_provider_id: edxProviderId,
          outcome: selectedRun?.outcome || null,
          type_id: courseTypes?.id || null,
        };
        // Resolve existing row by edX uuid first (stable id), then by generated key — key-only
        // lookup misses rows whose key changed between syncs and caused duplicate uuid on insert.
        let courseRecord = null;
        if (course.uuid) {
          courseRecord = await db.courses.findOne({ where: { uuid: course.uuid } });
        }
        if (!courseRecord) {
          courseRecord = await db.courses.findOne({ where: { key: uniqueKey } });
        }
        if (!courseRecord) {
          courseRecord = await db.courses.create({ ...courseData });
          totalInserted++;
          results.push({ course_id: course.uuid, title: course.title, action: 'inserted' });
        } else {
          await courseRecord.update(courseData, { silent });
          totalUpdated++;
          results.push({ course_id: course.uuid, title: course.title, action: 'updated' });
        }
        await ensureDefaultEdxCourseCostConfig({
          providerId: edxProviderId,
          courseId: courseRecord.id,
        });

        // After creating or updating a course, if staffIds exist, create staff_course records
        const staffIds = await extractStaffFields(staffArr, silent);
        if (staffIds && staffIds.length > 0 && courseRecord) {
          for (const staffId of staffIds) {
            const exists = await db.staff_course.findOne({ where: { staff_id: staffId, course_id: courseRecord.id } });
            if (!exists) {
              await db.staff_course.create({ staff_id: staffId, course_id: courseRecord.id });
            }
          }
        }

        // Handle programs
        if (course.programs && Array.isArray(course.programs)) {
          for (const program of course.programs) {
            if (program.uuid) {
              let programTypeId = null;
              if (program.type_attrs && program.type_attrs.uuid) {
                const [programTypeRecord] = await db.program_type.findOrCreate({
                  where: { uuid: program.type_attrs.uuid },
                  defaults: {
                    uuid: program.type_attrs.uuid,
                    name: program.type,
                    slug: program.type_attrs.slug,
                    coaching_supported: program.type_attrs.coaching_supported,
                  },
                });
                programTypeId = programTypeRecord.id;
              }

              // Ensure a course exists for this program (with minimal fields)
              let programCourseRecord = await db.courses.findOne({ where: { uuid: program.uuid } });
              if(program.uuid){
                fetchedCourseUuids.add(program.uuid);
              }
              if (!programCourseRecord) {
                programCourseRecord = await db.courses.create({
                  uuid: program.uuid,
                  title: program.title || null,
                  image_url: program.image_url || course.image_url || null,
                  description: program.description || null,
                  content_type: program.content_type,
                  owners: ownerIds,
                });
                await ensureDefaultEdxCourseCostConfig({
                  providerId: edxProviderId,
                  courseId: programCourseRecord.id,
                });
              } else {
                const uniqueKey = await generateUniqueCourseKey(program);
                await programCourseRecord.update({ owners: ownerIds, key: uniqueKey }, { silent });
              }

              // Create or update the program, linking to the program's course
              const [programRecord] = await db.program.findOrCreate({
                where: { uuid: program.uuid },
                defaults: {
                  uuid: program.uuid,
                  course_id: programCourseRecord.id,
                  industry_insights: null
                },
              });
              // Set type_id on course
              if (programTypeId) {
                await programCourseRecord.update({ type_id: programTypeId }, { silent });
              }
              // Maintain many-to-many relationship (program_course)
              await db.program_course.findOrCreate({
                where: {
                  program_id: programRecord.id,
                  course_id: courseRecord.id,
                },
              });
            }
          }
        }
      }
      // Pagination
      hasNext = !!data?.next;
      page++;

      const summary = `🎉 Cycle Complete. Inserted: ${totalInserted}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}`;
      console.log(summary);
      // logger.info(summary);
    }

    // Inactive old data
    const dbCourses = await db.courses.findAll({
      where: {
        course_provider_id: edxProviderId
      },
      attributes: ['id', 'uuid']
    });
    const toDelete = dbCourses.filter(c => !fetchedCourseUuids.has(c.uuid)).map(c => c.id);
    await db.courses.update(
      { status: 0 },
      {
        where: {
          id: {
            [Op.in]: toDelete
          }
        }
      });


    if (res) {
      return res.json({
        status: true,
        statusCode: 200,
        message: 'Courses fetched and stored successfully',
        inserted: totalInserted,
        updated: totalUpdated,
        skipped: totalSkipped,
        results,
        Inactive: toDelete.length
      });
    }
  } catch (error) {
    console.error(error);
    if (res) {
      return res.status(500).json({ status: false, statusCode: 500, message: 'Internal Server Error' });
    }
  }
}

// Helper function to get staff information by UUIDs
async function getStaffByUuids(staffUuids) {
  if (!Array.isArray(staffUuids) || staffUuids.length === 0) return [];

  const staff = await db.staff.findAll({
    where: {
      id: staffUuids
    }
  });

  return staff.map(staffMember => ({
    uuid: staffMember.uuid,
    family_name: staffMember.family_name,
    given_name: staffMember.given_name,
    profile_image_url: staffMember.profile_image_url,
    position: {
      title: staffMember.position_title,
      organization_name: staffMember.organization_name,
      organization_logo_image_url: staffMember.organization_logo_image_url
    }
  }));
}

async function getOwnersByIds(ownersIds) {
  if (!Array.isArray(ownersIds) || ownersIds.length === 0) return [];

  const owners = await db.owner.findAll({
    where: {
      id: ownersIds
    }
  });

  return owners.map(owner => ({
    uuid: owner.uuid,
    name: owner.name,
    certificate_logo_image_url: owner.certificate_logo_image_url,
  }));
}

export { fetchAndStoreEdxCourses, getStaffByUuids, getOwnersByIds };

cron.schedule('0 0 * * *', () => {
  fetchAndStoreEdxCourses(null, null, true);
});