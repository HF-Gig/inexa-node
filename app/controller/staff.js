import db from '../../db.js';
import { getPaginationMetadata, formatPaginatedResponse } from '../utils/pagination.js';
import { Op } from 'sequelize';
import { uploadLogo, deleteLogo, getImageUrl } from '../helper/fileUpload.js';

export async function getStaff(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;
    const offset = (page - 1) * pageSize;
    const { given_name, family_name, search } = req.query;

    // Build where clause
    const whereClause = {};
    if (given_name) {
      whereClause.given_name = { [Op.like]: `%${given_name}%` };
    }
    if (family_name) {
      whereClause.family_name = { [Op.like]: `%${family_name}%` };
    }
    if (search) {
      whereClause[Op.or] = [
        { family_name: { [Op.like]: `%${search}%` } },
        { given_name: { [Op.like]: `%${search}%` } },
        { position_title: { [Op.like]: `%${search}%` } }
      ];
    }

    // Sorting
    let orderBy = req.query.sortCol || 'createdAt';
    const orderDir = (req.query.sortDir || 'DESC').toUpperCase();

    // Handle sorting by organization_name
    let include = [];
    let order = [];
    if (orderBy === 'organization_name') {
      include = [{
        model: db.organization,
        as: 'organization',
        attributes: ['organization_name']
      }];
      order = [[{ model: db.organization, as: 'organization' }, 'organization_name', orderDir]];
    } else {
      order = [[orderBy, orderDir]];
    }

    const { count, rows: staff } = await db.staff.findAndCountAll({
      where: whereClause,
      include: include,
      limit: pageSize,
      offset: offset,
      order: order
    });

    // Add full URL to profile images and organization name
    const staffWithPhotoUrls = await Promise.all(staff.map(async member => {
      const memberData = member.toJSON();
      if (memberData.profile_image_url) {
        memberData.profile_image_url = getImageUrl(memberData.profile_image_url);
      }
      if (memberData.organization_id) {
        const org = await db.organization.findOne({ 
          where: { id: memberData.organization_id },
          attributes: ['organization_name'], 
          raw: true 
        });
        memberData.organization_name = org ? org.organization_name : null;
      } else {
        memberData.organization_name = null;
      }
      return memberData;
    }));

    const pagination = getPaginationMetadata({
      page,
      pageSize,
      totalItems: count
    });

    return res.json(formatPaginatedResponse({
      data: staffWithPhotoUrls,
      pagination
    }));
  } catch (error) {
    console.log("error in getStaff======>", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function getStaffById(req, res) {
  try {
    const { id } = req.params;
    const staff = await db.staff.findOne({
      where: { id },
      raw: true
    });

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
        status: false,
        statusCode: 404
      });
    }

    // Add full URL to profile image
    if (staff.profile_image_url) {
      staff.profile_image_url = getImageUrl(staff.profile_image_url);
    }

    return res.json({
      message: "Staff retrieved successfully",
      status: true,
      statusCode: 200,
      data: staff
    });
  } catch (error) {
    console.error("Error in getStaffById:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function createStaff(req, res) {
  try {
    const { given_name, family_name, position_title, organization_id, edx_link } = req.body;
    const photoFile = req.file;

    // Input validation
    if (!given_name || !family_name) {
      return res.status(400).json({
        message: "Given name and family name are required",
        status: false,
        statusCode: 400
      });
    }

    // Check if organization exists if organization_id is provided
    if (organization_id) {
      const org = await db.organization.findOne({ where: { id: organization_id } });
      if (!org) {
        return res.status(400).json({
          message: "Organization not found.",
          status: false,
          statusCode: 400
        });
      }
    }

    // Handle photo upload
    let photoUrl = null;
    if (photoFile) {
      photoUrl = await uploadLogo(photoFile, 'staff');
    }

    // Create staff
    const newStaff = await db.staff.create({
      given_name,
      family_name,
      position_title,
      organization_id,
      edx_link,
      profile_image_url: photoUrl
    });

    // Add full URL to photo in response
    const staffData = newStaff.toJSON();
    staffData.profile_image_url = staffData.profile_image_url;
    return res.status(201).json({
      message: "Staff created successfully",
      status: true,
      statusCode: 201,
      data: staffData
    });

  } catch (error) {
    console.error("Error in createStaff:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function updateStaff(req, res) {
  try {
    const { id } = req.params;
    const { given_name, family_name, position_title, organization_id, edx_link } = req.body;
    const photoFile = req.file;

    // Find staff
    const existingStaff = await db.staff.findOne({
      where: { id },
      raw: true
    });

    if (!existingStaff) {
      return res.status(404).json({
        message: "Staff not found, updateStaff",
        status: false,
        statusCode: 404
      });
    }

    // Check if organization exists if organization_id is provided
    if (organization_id) {
      const org = await db.organization.findOne({ where: { id: organization_id } });
      if (!org) {
        return res.status(400).json({
          message: "Organization not found.",
          status: false,
          statusCode: 400
        });
      }
    }

    // Handle photo upload
    let photoUrl = existingStaff.profile_image_url;
    if (photoFile) {
      // Delete old photo if exists
      if (existingStaff.profile_image_url) {
        await deleteLogo(existingStaff.profile_image_url);
      }
      // Upload new photo
      photoUrl = await uploadLogo(photoFile, 'staff');
    }

    // Prepare update data
    const updateData = {};
    if (given_name) updateData.given_name = given_name;
    if (family_name) updateData.family_name = family_name;
    if (position_title) updateData.position_title = position_title;
    if (organization_id) updateData.organization_id = organization_id;
    if (edx_link) updateData.edx_link = edx_link;
    updateData.profile_image_url = photoUrl;

    // Update staff
    await db.staff.update(updateData, {
      where: { id }
    });

    // Get updated staff
    const updatedStaff = await db.staff.findOne({
      where: { id },
      raw: true
    });

    // Add full URL to photo in response
    if (updatedStaff.profile_image_url) {
      updatedStaff.profile_image_url = updatedStaff.profile_image_url;
    }

    return res.status(200).json({
      message: "Staff updated successfully",
      status: true,
      statusCode: 200,
      data: updatedStaff
    });
  } catch (error) {
    console.error("Error in updateStaff:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function deleteStaff(req, res) {
  try {
    const { id } = req.params;
    const staff = await db.staff.findOne({
      where: { id },
      raw: true
    });

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
        status: false,
        statusCode: 404
      });
    }

    // Delete photo if exists
    if (staff.profile_image_url) {
      await deleteLogo(staff.profile_image_url);
    }

    // Delete all staff_course assignments for this staff
    await db.staff_course.destroy({ where: { staff_id: id } });

    await db.staff.destroy({
      where: { id }
    });

    return res.status(200).json({
      message: "Staff deleted successfully",
      status: true,
      statusCode: 200
    });
  } catch (error) {
    console.error("Error in deleteStaff:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function assignCoursesToStaff(req, res) {
  try {
    const { id } = req.params; // staffId
    let { courseIds } = req.body;
    if (!Array.isArray(courseIds)) {
      courseIds = courseIds ? [courseIds] : [];
    }
    courseIds = courseIds.map(Number).filter(Boolean);
    if (courseIds.length === 0) {
      return res.status(400).json({ message: 'courseIds must be a non-empty array', status: false });
    }
    // Check staff exists
    const staff = await db.staff.findOne({ where: { id }, raw: true });
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found', status: false });
    }
    // For each course, create staff_course record if not exists
    for (const courseId of courseIds) {
      const course = await db.courses.findByPk(courseId);
      if (!course) continue;
      const exists = await db.staff_course.findOne({ where: { staff_id: id, course_id: courseId } });
      if (!exists) {
        await db.staff_course.create({ staff_id: id, course_id: courseId });
      }
    }
    return res.json({ message: 'Courses assigned to staff successfully', status: true });
  } catch (error) {
    console.error('Error in assignCoursesToStaff:', error);
    return res.status(500).json({ message: 'Internal Server Error', status: false });
  }
}

export async function getAssignedCourses(req, res) {
  try {
    const { id } = req.params; // staffId
    // Check staff exists
    const staff = await db.staff.findOne({ where: { id } });
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found', status: false });
    }
    // Find all course_ids for this staff
    const staffCourses = await db.staff_course.findAll({ where: { staff_id: id }, attributes: ['course_id'], raw: true });
    const courseIds = staffCourses.map(sc => sc.course_id);

    let courses = [];
    if (courseIds.length > 0) {
      courses = await db.courses.findAll({ where: { id: courseIds } });
    }
    return res.json({ message: 'Assigned courses fetched successfully', status: true, data: courses });
  } catch (error) {
    console.error('Error in getAssignedCourses:', error);
    return res.status(500).json({ message: 'Internal Server Error', status: false });
  }
}

export async function unassignCoursesFromStaff(req, res) {
  try {
    const { id } = req.params; // staffId
    let { courseIds, courseId } = req.body;
    // Support both courseId and courseIds
    if (!courseIds && courseId) courseIds = [courseId];
    if (!Array.isArray(courseIds)) courseIds = courseIds ? [courseIds] : [];
    courseIds = courseIds.map(Number).filter(Boolean);
    if (courseIds.length === 0) {
      return res.status(400).json({ message: 'courseIds must be a non-empty array', status: false });
    }
    // Check staff exists
    const staff = await db.staff.findOne({ where: { id } });
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found', status: false });
    }
    // Remove staff-course relationships
    await db.staff_course.destroy({ where: { staff_id: id, course_id: courseIds } });
    return res.json({ message: 'Courses unassigned from staff successfully', status: true, unassigned: courseIds });
  } catch (error) {
    console.error('Error in unassignCoursesFromStaff:', error);
    return res.status(500).json({ message: 'Internal Server Error', status: false });
  }
}

export async function getInexaStaff(req, res) {
  try {
    const inexaStaff = await db.facilitator.findAll({
      order: [['first_name', 'ASC']],
      raw: true
    });

    const staffWithPhotoUrls = inexaStaff.map(member => {
      if (member.profile_image_url) {
        member.profile_image_url = getImageUrl(member.profile_image_url);
      }
      return member;
    });
    return res.json({
      message: "Inexa facilitators retrieved successfully",
      status: true,
      statusCode: 200,
      data: staffWithPhotoUrls
    });
  } catch (error) {
    console.error("Error in getInexaStaff:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function getInexaFacilitatorById(req, res) {
  try {
    const { id } = req.params;
    const facilitator = await db.facilitator.findOne({
      where: { id },
      raw: true
    });

    if (!facilitator) {
      return res.status(404).json({
        message: "Facilitator not found",
        status: false,
        statusCode: 404
      });
    }

    // Add full URL to profile image
    if (facilitator.profile_image_url) {
      facilitator.profile_image_url = getImageUrl(facilitator.profile_image_url);
    }

    return res.json({
      message: "Facilitator retrieved successfully",
      status: true,
      statusCode: 200,
      data: facilitator
    });
  } catch (error) {
    console.error("Error in getInexaFacilitatorById:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function createInexaFacilitator(req, res) {
  try {
    const { first_name, last_name, subject_expertise, email, bio_info, social_links } = req.body;
    const photoFile = req.file;

    // Input validation
    if (!first_name || !last_name || !email) {
      return res.status(400).json({
        message: "First name, last name, and email are required",
        status: false,
        statusCode: 400
      });
    }

    // Check if email already exists
    const existing = await db.facilitator.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({
        message: "Email already exists",
        status: false,
        statusCode: 400
      });
    }

    // Handle photo upload
    let photoUrl = null;
    if (photoFile) {
      photoUrl = await uploadLogo(photoFile, 'staff');
    }

    // Parse social_links
    let socialLinks = {};
    if (social_links) {
      try {
        socialLinks = JSON.parse(social_links);
      } catch (e) {
        socialLinks = {};
      }
    }

    // Create facilitator
    const newFacilitator = await db.facilitator.create({
      first_name,
      last_name,
      subject_expertise,
      email,
      bio_info,
      social_links: socialLinks,
      profile_image_url: photoUrl
    });

    // Add full URL to photo in response
    const facilitatorData = newFacilitator.toJSON();
    facilitatorData.profile_image_url = facilitatorData.profile_image_url;
    return res.status(201).json({
      message: "Facilitator created successfully",
      status: true,
      statusCode: 201,
      data: facilitatorData
    });

  } catch (error) {
    console.error("Error in createInexaFacilitator:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function updateInexaFacilitator(req, res) {
  try {
    const { id } = req.params;
    const { first_name, last_name, subject_expertise, email, bio_info, social_links } = req.body;
    const photoFile = req.file;

    // Find facilitator
    const existingFacilitator = await db.facilitator.findOne({
      where: { id },
      raw: true
    });

    if (!existingFacilitator) {
      return res.status(404).json({
        message: "Facilitator not found",
        status: false,
        statusCode: 404
      });
    }

    // Check if email already exists for another facilitator
    if (email && email !== existingFacilitator.email) {
      const existing = await db.facilitator.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({
          message: "Email already exists",
          status: false,
          statusCode: 400
        });
      }
    }

    // Handle photo upload
    let photoUrl = existingFacilitator.profile_image_url;
    if (photoFile) {
      // Delete old photo if exists
      if (existingFacilitator.profile_image_url) {
        await deleteLogo(existingFacilitator.profile_image_url);
      }
      // Upload new photo
      photoUrl = await uploadLogo(photoFile, 'staff');
    }

    // Parse social_links
    let socialLinks = existingFacilitator.social_links;
    if (social_links) {
      try {
        socialLinks = JSON.parse(social_links);
      } catch (e) {
        socialLinks = {};
      }
    }

    // Prepare update data
    const updateData = {};
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (subject_expertise) updateData.subject_expertise = subject_expertise;
    if (email) updateData.email = email;
    if (bio_info !== undefined) updateData.bio_info = bio_info;
    updateData.social_links = socialLinks;
    updateData.profile_image_url = photoUrl;

    // Update facilitator
    await db.facilitator.update(updateData, {
      where: { id }
    });

    // Get updated facilitator
    const updatedFacilitator = await db.facilitator.findOne({
      where: { id },
      raw: true
    });

    // Add full URL to photo in response
    if (updatedFacilitator.profile_image_url) {
      updatedFacilitator.profile_image_url = updatedFacilitator.profile_image_url;
    }

    return res.status(200).json({
      message: "Facilitator updated successfully",
      status: true,
      statusCode: 200,
      data: updatedFacilitator
    });
  } catch (error) {
    console.error("Error in updateInexaFacilitator:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function deleteInexaFacilitator(req, res) {
  try {
    const { id } = req.params;
    const facilitator = await db.facilitator.findOne({
      where: { id },
      raw: true
    });

    if (!facilitator) {
      return res.status(404).json({
        message: "Facilitator not found",
        status: false,
        statusCode: 404
      });
    }

    // Delete photo if exists
    if (facilitator.profile_image_url) {
      await deleteLogo(facilitator.profile_image_url);
    }

    await db.facilitator.destroy({
      where: { id }
    });

    return res.status(200).json({
      message: "Facilitator deleted successfully",
      status: true,
      statusCode: 200
    });
  } catch (error) {
    console.error("Error in deleteInexaFacilitator:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function getFeaturedFacilitators(req, res) {
  try {
    const featured = await db.featured_facilitators.findAll({
      include: [
        {
          model: db.facilitator,
          as: 'facilitator',
          attributes: [
            'id',
            'first_name',
            'last_name',
            'subject_expertise',
            'email',
            'bio_info',
            'social_links',
            'profile_image_url'
          ]
        }
      ],
      order: [['position', 'ASC']], // ensures correct order
      raw: false
    });

    // If no featured facilitators exist
    if (!featured || featured.length === 0) {
      return res.json({
        message: "No featured facilitators found",
        status: true,
        statusCode: 200,
        data: []
      });
    }

    // Map through and attach proper image URLs + organization names
    const facilitators = await Promise.all(featured.map(async (item) => {
      const facilitator = item.facilitator?.toJSON ? item.facilitator.toJSON() : item.facilitator;

      if (!facilitator) return null;

      if (facilitator.profile_image_url) {
        facilitator.profile_image_url = getImageUrl(facilitator.profile_image_url);
      }

      // Attach organization name if exists
      if (facilitator.organization_id) {
        const org = await db.organization.findOne({
          where: { id: facilitator.organization_id },
          attributes: ['name'],
          raw: true
        });
        facilitator.organization_name = org ? org.name : null;
      } else {
        facilitator.organization_name = null;
      }

      return {
        id: item.id,
        position: item.position,
        facilitator_id: facilitator.id,
        facilitator
      };
    }));

    // Filter out nulls (in case some facilitators are missing)
    const validFacilitators = facilitators.filter(f => f !== null);

    return res.json({
      message: "Featured facilitators fetched successfully",
      status: true,
      statusCode: 200,
      data: validFacilitators
    });

  } catch (error) {
    console.error("Error in getFeaturedFacilitators:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function updateFeaturedFacilitatorPosition(req, res) {
  try {
    const { position } = req.params;
    const { facilitator_id } = req.body;

    if (!facilitator_id) {
      return res.status(400).json({
        message: "Facilitator ID is required",
        status: false,
        statusCode: 400
      });
    }

    // Check if facilitator exists
    const facilitator = await db.facilitator.findOne({ where: { id: facilitator_id } });
    if (!facilitator) {
      return res.status(404).json({
        message: "Facilitator not found",
        status: false,
        statusCode: 404
      });
    }

    // Check if there's already a featured facilitator at this position
    const existingAtPosition = await db.featured_facilitators.findOne({ where: { position: parseInt(position) } });

    if (existingAtPosition) {
      // Update the existing record
      await db.featured_facilitators.update(
        { facilitator_id },
        { where: { position: parseInt(position) } }
      );
    } else {
      // Create a new record
      await db.featured_facilitators.create({
        facilitator_id,
        position: parseInt(position)
      });
    }

    return res.json({
      message: "Featured facilitator position updated successfully",
      status: true,
      statusCode: 200
    });

  } catch (error) {
    console.error("Error in updateFeaturedFacilitatorPosition:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function addFeaturedFacilitator(req, res) {
  console.log("Received request at add facilitatator")
  try {
    const { facilitator_id } = req.body;
    console.log(`Using staff is ${facilitator_id}`)
    if (!facilitator_id) {
      return res.status(400).json({
        message: "Facilitator ID is required",
        status: false,
        statusCode: 400
      });
    }

    const facilitator = await db.facilitator.findOne({ where: { id: facilitator_id } });
    if (!facilitator) {
      return res.status(404).json({
        message: "Facilitator not found",
        status: false,
        statusCode: 404
      });
    }

    // Find the next position
    const maxPosition = await db.featured_facilitators.max('position') || 0;
    const newPosition = maxPosition + 1;

    await db.featured_facilitators.create({
      facilitator_id,
      position: newPosition
    });

    return res.json({
      message: "Featured facilitator added successfully",
      status: true,
      statusCode: 201
    });
  } catch (error) {
    console.error("Error in addFeaturedFacilitator:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function removeFeaturedFacilitator(req, res) {
  try {
    const { id } = req.params; // featured id

    const featured = await db.featured_facilitators.findOne({ where: { id } });
    if (!featured) {
      return res.status(404).json({
        message: "Featured facilitator not found",
        status: false,
        statusCode: 404
      });
    }

    await db.featured_facilitators.destroy({ where: { id } });

    return res.json({
      message: "Featured facilitator removed successfully",
      status: true,
      statusCode: 200
    });
  } catch (error) {
    console.error("Error in removeFeaturedFacilitator:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function updateFeaturedFacilitator(req, res) {
  try {
    const { id } = req.params;
    const { facilitator_id } = req.body;

    console.log(`Request received at updateFeaturedFacilitators: Selected Facilitator id ${facilitator_id}, Editing facilitator is: ${id}`)
    if (!facilitator_id) {
      return res.status(400).json({
        message: "Facilitator ID is required",
        status: false,
        statusCode: 400
      });
    }

    const featured = await db.featured_facilitators.findOne({ where: { id } });
    if (!featured) {
      return res.status(404).json({
        message: "Featured facilitator not found",
        status: false,
        statusCode: 404
      });
    }

    const facilitator = await db.facilitator.findOne({ where: { id: facilitator_id } });
    if (!facilitator) {
      return res.status(404).json({
        message: "Facilitator not found",
        status: false,
        statusCode: 404
      });
    }

    await db.featured_facilitators.update({ facilitator_id }, { where: { id } });

    return res.json({
      message: "Featured facilitator updated successfully",
      status: true,
      statusCode: 200
    });
  } catch (error) {
    console.error("Error in updateFeaturedFacilitator:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}
