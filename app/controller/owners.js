import db from '../../db.js';
import { getPaginationMetadata, formatPaginatedResponse } from '../utils/pagination.js';
import { Op } from 'sequelize';
import { uploadLogo, deleteLogo, getImageUrl } from '../helper/fileUpload.js';

export async function getOwners(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 1000;
    const offset = (page - 1) * pageSize;
    const { name } = req.query;

    // Build where clause
    const whereClause = {};
    if (name) {
      whereClause.name = {
        [Op.like]: `%${name}%`
      };
    }

    const { count, rows: owners } = await db.owner.findAndCountAll({
      where: whereClause,
      limit: pageSize,
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    // Add full URL to logo images
    const ownersWithLogoUrls = owners.map(owner => {
      const ownerData = owner.toJSON();
      if (ownerData.certificate_logo_image_url) {
        ownerData.certificate_logo_image_url = getImageUrl(ownerData.certificate_logo_image_url);
      }
      return ownerData;
    });

    const pagination = getPaginationMetadata({
      page,
      pageSize,
      totalItems: count
    });

    return res.json(formatPaginatedResponse({
      data: ownersWithLogoUrls,
      pagination
    }));
  } catch (error) {
    console.log("error in getOwners======>", error);
    return res.status(500).json({ 
      message: "Internal Server Error", 
      status: false, 
      statusCode: 500 
    });
  }
}

export async function getOwnerById(req, res) {
  try {
    const { id } = req.params;
    const { owner } = db;

    const ownerData = await owner.findOne({
      where: { id },
      raw: true
    });

    if (!ownerData) {
      return res.status(404).json({
        message: "Owner not found",
        status: false,
        statusCode: 404
      });
    }

    // Add full URL to logo image
    if (ownerData.certificate_logo_image_url) {
      ownerData.certificate_logo_image_url = getImageUrl(ownerData.certificate_logo_image_url);
    }

    return res.json({
      message: "Owner retrieved successfully",
      status: true,
      statusCode: 200,
      data: ownerData
    });
  } catch (error) {
    console.error("Error in getOwnerById:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function createOwner(req, res) {
  try {
    const { owner } = db;
    const { name } = req.body;
    const logoFile = req.file;

    // Input validation
    if (!name) {
      return res.status(400).json({
        message: "Name is required",
        status: false,
        statusCode: 400
      });
    }

    // Handle logo upload
    let logoUrl = null;
    if (logoFile) {
      logoUrl = await uploadLogo(logoFile);
    }

    // Create owner
    const newOwner = await owner.create({
      name,
      certificate_logo_image_url: logoUrl
    });

    // Add full URL to logo image in response
    const ownerData = newOwner.toJSON();
    ownerData.certificate_logo_image_url = ownerData.certificate_logo_image_url;
    return res.status(201).json({
      message: "Owner created successfully",
      status: true,
      statusCode: 201,
      data: ownerData
    });

  } catch (error) {
    console.error("Error in createOwner:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function updateOwner(req, res) {
  try {
    const { owner } = db;
    const { id } = req.params;
    const { name } = req.body;
    const logoFile = req.file;

    // Find owner
    const existingOwner = await owner.findOne({
      where: { id },
      raw: true
    });

    if (!existingOwner) {
      return res.status(404).json({
        message: "Owner not found",
        status: false,
        statusCode: 404
      });
    }

    // Handle logo upload
    let logoUrl = existingOwner.certificate_logo_image_url;
    if (logoFile) {
      // Delete old logo if exists
      if (existingOwner.certificate_logo_image_url) {
        await deleteLogo(existingOwner.certificate_logo_image_url);
      }
      // Upload new logo
      logoUrl = await uploadLogo(logoFile);
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    updateData.certificate_logo_image_url = logoUrl;

    // Update owner
    await owner.update(updateData, {
      where: { id }
    });

    // Get updated owner
    const updatedOwner = await owner.findOne({
      where: { id },
      raw: true
    });

    // Add full URL to logo image in response
    if (updatedOwner.certificate_logo_image_url) {
      updatedOwner.certificate_logo_image_url = updatedOwner.certificate_logo_image_url;
    }

    return res.status(200).json({
      message: "Owner updated successfully",
      status: true,
      statusCode: 200,
      data: updatedOwner
    });

  } catch (error) {
    console.error("Error in updateOwner:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function deleteOwner(req, res) {
  try {
    const { owner } = db;
    const { id } = req.params;

    // Find owner
    const existingOwner = await owner.findOne({
      where: { id },
      raw: true
    });

    if (!existingOwner) {
      return res.status(404).json({
        message: "Owner not found",
        status: false,
        statusCode: 404
      });
    }

    // Delete logo file if exists
    if (existingOwner.certificate_logo_image_url) {
      await deleteLogo(existingOwner.certificate_logo_image_url);
    }

    // Delete owner
    await owner.destroy({
      where: { id }
    });

    return res.status(200).json({
      message: "Owner deleted successfully",
      status: true,
      statusCode: 200
    });

  } catch (error) {
    console.error("Error in deleteOwner:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

// New function to upload logo only
export async function uploadOwnerLogo(req, res) {
  try {
    const { id } = req.params;
    const logoFile = req.file;
    const { owner } = db;

    if (!logoFile) {
      return res.status(400).json({
        message: "Logo file is required",
        status: false,
        statusCode: 400
      });
    }

    // Find owner
    const existingOwner = await owner.findOne({
      where: { id },
      raw: true
    });

    if (!existingOwner) {
      return res.status(404).json({
        message: "Owner not found",
        status: false,
        statusCode: 404
      });
    }

    // Delete old logo if exists
    if (existingOwner.certificate_logo_image_url) {
      await deleteLogo(existingOwner.certificate_logo_image_url);
    }

    // Upload new logo
    const logoUrl = await uploadLogo(logoFile);

    // Update owner with new logo
    await owner.update({
      certificate_logo_image_url: logoUrl
    }, {
      where: { id }
    });

    // Get updated owner
    const updatedOwner = await owner.findOne({
      where: { id },
      raw: true
    });

    // Add full URL to logo image in response
    if (updatedOwner.certificate_logo_image_url) {
      updatedOwner.certificate_logo_image_url = getImageUrl(updatedOwner.certificate_logo_image_url);
    }

    return res.status(200).json({
      message: "Logo uploaded successfully",
      status: true,
      statusCode: 200,
      data: {
        certificate_logo_image_url: updatedOwner.certificate_logo_image_url
      }
    });

  } catch (error) {
    console.error("Error in uploadOwnerLogo:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
} 