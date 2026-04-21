import db from '../../db.js';
import { getPaginationMetadata, formatPaginatedResponse } from '../utils/pagination.js';
import { Op } from 'sequelize';
import { uploadLogo, deleteLogo, getImageUrl } from '../helper/fileUpload.js';
import { v4 as uuidv4 } from 'uuid';

export async function getOrganizations(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;
    const offset = (page - 1) * pageSize;
    const { organization_name, search } = req.query;

    // Build where clause
    const whereClause = {};
    if (organization_name) {
      whereClause.organization_name = { [Op.like]: `%${organization_name}%` };
    }
    if (search) {
      whereClause.organization_name = { [Op.like]: `%${search}%` };
    }

    // Sorting
    const orderBy = req.query.sortCol || 'createdAt';
    const orderDir = (req.query.sortDir || 'DESC').toUpperCase();
    const order = [[orderBy, orderDir]];

    // Default pagination to true unless explicitly set to 'false'
    const paginationEnabled = req.query.pagination !== 'false';
    let organizations, count;
    if (paginationEnabled) {
      const result = await db.organization.findAndCountAll({
        where: whereClause,
        limit: pageSize,
        offset: offset,
        order: order
      });
      organizations = result.rows;
      count = result.count;
    } else {
      organizations = await db.organization.findAll({
        where: whereClause,
        order: order
      });
      count = organizations.length;
    }

    // Add full URL to logo images
    const orgsWithLogoUrls = organizations.map(org => {
      const orgData = org.toJSON();
      if (orgData.organization_logo_image_url) {
        orgData.organization_logo_image_url = getImageUrl(orgData.organization_logo_image_url);
      }
      return orgData;
    });

    const pagination = paginationEnabled ? getPaginationMetadata({ page, pageSize, totalItems: count }) : undefined;

    return res.json(formatPaginatedResponse({
      data: orgsWithLogoUrls,
      ...(paginationEnabled ? { pagination } : {})
    }));
  } catch (error) {
    console.log("error in getOrganizations======>", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

// export async function getOrganizations(req, res) {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const pageSize = parseInt(req.query.page_size) || 10;
//     const offset = (page - 1) * pageSize;
//     const { organization_name, search } = req.query;

//     // Helper: normalize string for search
//     const normalize = str =>
//       str
//         .toLowerCase()
//         .replace(/\s+/g, ' ')     // collapse spaces
//         .replace(/[^\w\s]/g, '')  // remove special chars
//         .trim();

//     // Build where clause
//     const whereClause = {};
//     if (organization_name || search) {
//       const searchValue = normalize(organization_name || search);

//       // Case-insensitive and space-normalized search using Sequelize.fn
//       whereClause[db.Sequelize.Op.and] = [
//         db.Sequelize.where(
//           db.Sequelize.fn(
//             'LOWER',
//             db.Sequelize.fn('REPLACE', db.Sequelize.col('organization_name'), '  ', ' ')
//           ),
//           {
//             [db.Sequelize.Op.like]: `%${searchValue}%`
//           }
//         )
//       ];
//     }

//     // Sorting
//     const orderBy = req.query.sortCol || 'createdAt';
//     const orderDir = (req.query.sortDir || 'DESC').toUpperCase();
//     const order = [[orderBy, orderDir]];

//     // Default pagination to true unless explicitly set to 'false'
//     const paginationEnabled = req.query.pagination !== 'false';
//     let organizations, count;

//     if (paginationEnabled) {
//       const result = await db.organization.findAndCountAll({
//         where: whereClause,
//         limit: pageSize,
//         offset: offset,
//         order: order
//       });
//       organizations = result.rows;
//       count = result.count;
//     } else {
//       organizations = await db.organization.findAll({
//         where: whereClause,
//         order: order
//       });
//       count = organizations.length;
//     }

//     // // Add full URL to logo images
//     // const orgsWithLogoUrls = organizations.map(org => {
//     //   const orgData = org.toJSON();
//     //   if (orgData.organization_logo_image_url) {
//     //     orgData.organization_logo_image_url = getImageUrl(orgData.organization_logo_image_url);
//     //   }
//     //   return orgData;
//     // });

//     const uniqueMap = new Map();

//     organizations.forEach(org => {
//       const orgData = org.toJSON();
//       const normalizedName = normalize(orgData.organization_name);

//       // Keep only first occurrence
//       if (!uniqueMap.has(normalizedName)) {
//         if (orgData.organization_logo_image_url) {
//           orgData.organization_logo_image_url = getImageUrl(orgData.organization_logo_image_url);
//         }
//         uniqueMap.set(normalizedName, orgData);
//       }
//     });

//     const orgsWithLogoUrls = Array.from(uniqueMap.values());

//     const pagination = paginationEnabled
//       ? getPaginationMetadata({ page, pageSize, totalItems: count })
//       : undefined;

//     return res.json(
//       formatPaginatedResponse({
//         data: orgsWithLogoUrls,
//         ...(paginationEnabled ? { pagination } : {})
//       })
//     );
//   } catch (error) {
//     console.log("error in getOrganizations======>", error);
//     return res.status(500).json({
//       message: "Internal Server Error",
//       status: false,
//       statusCode: 500
//     });
//   }
// }

// export async function getOrganizations(req, res) {
//   try {
//     const organizations = await db.organization.findAll({
//       order: [['createdAt', 'DESC']]
//     });

//     const data = organizations.map(org => {
//       const orgData = org.toJSON();

//       if (orgData.organization_logo_image_url) {
//         orgData.organization_logo_image_url = getImageUrl(
//           orgData.organization_logo_image_url
//         );
//       }

//       return orgData;
//     });

//     return res.json({
//       status: true,
//       statusCode: 200,
//       data: data
//     });

//   } catch (error) {
//     console.log("error in getOrganizations======>", error);
//     return res.status(500).json({
//       message: "Internal Server Error",
//       status: false,
//       statusCode: 500
//     });
//   }
// }

export async function getOrganizationById(req, res) {
  try {
    const { id } = req.params;
    const org = await db.organization.findOne({
      where: { id },
      raw: true
    });

    if (!org) {
      return res.status(404).json({
        message: "Organization not found.",
        status: false,
        statusCode: 404
      });
    }

    // Add full URL to logo image
    if (org.organization_logo_image_url) {
      org.organization_logo_image_url = getImageUrl(org.organization_logo_image_url);
    }

    return res.json({
      message: "Organization retrieved successfully",
      status: true,
      statusCode: 200,
      data: org
    });
  } catch (error) {
    console.error("Error in getOrganizationById:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

// ... (imports)

// ... (getOrganizations, getOrganizationById)

export async function createOrganization(req, res) {
  try {
    const { organization_name } = req.body;
    const logoFile = req.file;

    // Input validation
    if (!organization_name) {
      return res.status(400).json({
        message: "Organization name is required",
        status: false,
        statusCode: 400
      });
    }

    // Handle logo upload
    let logoUrl = null;
    if (logoFile) {
      logoUrl = await uploadLogo(logoFile, 'organization');
    }
    let organization_uuid = req.body.uuid;
    if (!organization_uuid) {
      organization_uuid = uuidv4();
    }
    // Create organization
    const newOrg = await db.organization.create({
      organization_name,
      organization_uuid,
      organization_logo_image_url: logoUrl
    });

    // Sync with Owners table
    try {
      // Check if owner with same name exists to avoid duplicates
      const existingOwner = await db.owner.findOne({ where: { name: organization_name } });
      if (!existingOwner) {
        await db.owner.create({
          name: organization_name,
          certificate_logo_image_url: logoUrl,
          uuid: organization_uuid // Try to keep UUIDs synced if possible
        });
        console.log(`✅ Synced new Organization '${organization_name}' to Owners table.`);
      } else {
        console.log(`ℹ️ Owner '${organization_name}' already exists. Skipping sync.`);
      }
    } catch (syncError) {
      console.error("⚠️ Failed to sync with Owners table:", syncError.message);
      // Don't fail the request if sync fails, but log it
    }

    // Add full URL to logo image in response
    const orgData = newOrg.toJSON();
    orgData.organization_logo_image_url = orgData.organization_logo_image_url;
    return res.status(201).json({
      message: "Organization created successfully",
      status: true,
      statusCode: 201,
      data: orgData
    });

  } catch (error) {
    console.error("Error in createOrganization:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function updateOrganization(req, res) {
  // 🔍 LOG 1: Entry Point
  console.log("========================================");
  console.log("🚀 START: updateOrganization endpoint hit");
  console.log("🆔 Param ID:", req.params.id);
  console.log("📦 Req Body:", JSON.stringify(req.body, null, 2));
  console.log("📂 Req File:", req.file ? `Present: ${req.file.originalname}` : "❌ UNDEFINED (No file received)");

  try {
    const { id } = req.params;
    const { organization_name, organization_id, organization_uuid } = req.body;
    const logoFile = req.file;

    // Find organization
    const existingOrg = await db.organization.findOne({
      where: { id },
      raw: true
    });

    if (!existingOrg) {
      console.log("❌ ERROR: Organization not found in DB");
      return res.status(404).json({
        message: "Organization not found.",
        status: false,
        statusCode: 404
      });
    }

    console.log("✅ Found Org:", existingOrg.organization_name);
    console.log("🖼️ Current DB Logo URL:", existingOrg.organization_logo_image_url);

    // Handle logo upload
    let logoUrl = existingOrg.organization_logo_image_url;

    if (logoFile) {
      console.log("🔄 Processing new file upload...");

      // Delete old logo if exists
      if (existingOrg.organization_logo_image_url) {
        console.log("🗑️ Deleting old logo at:", existingOrg.organization_logo_image_url);
        try {
          await deleteLogo(existingOrg.organization_logo_image_url);
        } catch (err) {
          console.error("⚠️ Warning: Failed to delete old logo:", err.message);
        }
      }

      // Upload new logo
      logoUrl = await uploadLogo(logoFile, 'organization');
      console.log("✨ New Logo Saved to Disk at:", logoUrl);
    } else {
      console.log("ℹ️ No new file provided. Keeping existing logo URL:", logoUrl);
    }

    // Prepare update data
    const updateData = {};
    if (organization_name) updateData.organization_name = organization_name;
    if (organization_id) updateData.organization_id = organization_id;
    if (organization_uuid) updateData.organization_uuid = organization_uuid;

    // Always update the logo field (either with the new one or the old one)
    updateData.organization_logo_image_url = logoUrl;

    console.log("💾 SAVING TO DB: Final Update Payload:", JSON.stringify(updateData, null, 2));

    // Update organization
    const [affectedRows] = await db.organization.update(updateData, {
      where: { id }
    });

    console.log(`✅ DB Update Complete. Affected Rows: ${affectedRows}`);

    // Sync with Owners table
    try {
      const oldName = existingOrg.organization_name;
      const newName = organization_name || oldName;

      // Find valid owner by old name
      let owner = await db.owner.findOne({ where: { name: oldName } });

      if (owner) {
        // Update existing owner
        await owner.update({
          name: newName,
          certificate_logo_image_url: logoUrl
        });
        console.log(`✅ Synced update to Owner '${oldName}' -> '${newName}'.`);
      } else {
        // If not found by old name, check new name
        owner = await db.owner.findOne({ where: { name: newName } });
        if (owner) {
          await owner.update({
            certificate_logo_image_url: logoUrl
          });
          console.log(`✅ Synced update to Owner '${newName}'.`);
        } else {
          // Create if missing (Backfill)
          await db.owner.create({
            name: newName,
            certificate_logo_image_url: logoUrl,
            uuid: organization_uuid || existingOrg.organization_uuid || uuidv4()
          });
          console.log(`✅ Created missing Owner record for '${newName}'.`);
        }
      }
    } catch (syncError) {
      console.error("⚠️ Failed to sync update with Owners table:", syncError.message);
    }


    // Get updated organization
    const updatedOrg = await db.organization.findOne({
      where: { id },
      raw: true
    });

    console.log("🔍 VERIFYING DB READ:", updatedOrg.organization_logo_image_url);

    if (updatedOrg.organization_logo_image_url) {
      const originalPath = updatedOrg.organization_logo_image_url;
      updatedOrg.organization_logo_image_url = getImageUrl(updatedOrg.organization_logo_image_url);
      console.log(`🔗 URL Conversion: ${originalPath} -> ${updatedOrg.organization_logo_image_url}`);
    }

    console.log("========================================");

    return res.status(200).json({
      message: "Organization updated successfully",
      status: true,
      statusCode: 200,
      data: updatedOrg
    });
  } catch (error) {
    console.error("❌ CRITICAL ERROR in updateOrganization:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function deleteOrganization(req, res) {
  try {
    const { id } = req.params;
    const org = await db.organization.findOne({
      where: { id },
      raw: true
    });

    if (!org) {
      return res.status(404).json({
        message: "Organization not found.",
        status: false,
        statusCode: 404
      });
    }

    // Delete logo if exists
    if (org.organization_logo_image_url) {
      await deleteLogo(org.organization_logo_image_url);
    }

    await db.organization.destroy({
      where: { id }
    });

    // Sync delete with Owners
    try {
      const owner = await db.owner.findOne({ where: { name: org.organization_name } });
      if (owner) {
        await owner.destroy();
        console.log(`✅ Deleted Owner record '${org.organization_name}'.`);
      }
    } catch (syncError) {
      console.error("⚠️ Failed to sync delete with Owners table:", syncError.message);
    }

    return res.status(200).json({
      message: "Organization deleted successfully",
      status: true,
      statusCode: 200
    });
  } catch (error) {
    console.error("Error in deleteOrganization:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
} 