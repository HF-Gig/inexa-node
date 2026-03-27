import db from '../../db.js';
import { getPaginationMetadata, formatPaginatedResponse } from '../utils/pagination.js';
import bcrypt from 'bcrypt';
import fs from 'fs';

export async function getUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;
    const offset = (page - 1) * pageSize;
    const { role, search } = req.query;

    // Build where clause to apply role filter if provided
    const whereClause = {};

    // If specific role is requested, add it to the where clause
    if (role) {
      whereClause.role = role;
    }

    // Add search functionality
    if (search) {
      const { Op } = db.Sequelize;
      whereClause[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { country: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await db.user.findAndCountAll({
      where: whereClause,
      limit: pageSize,
      offset: offset,
      attributes: { exclude: ['password'] } // Exclude password from response
    });

    const pagination = getPaginationMetadata({
      page,
      pageSize,
      totalItems: count
    });

    return res.json(formatPaginatedResponse({
      data: users,
      pagination
    }));
  } catch (error) {
    console.log("error in getUsers======>", error);
    return res.json({ message: "Internal Server Error", status: false, statusCode: 500 });
  }
}

export async function createUser(req, res) {
  try {
    const { user } = db;
    const { email, password, first_name, last_name, phone, role, country } = req.body;

    // Input validation
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        message: "Email, password, first name, and last name are required",
        status: false,
        statusCode: 400
      });
    }

    // // Prevent creating admin users
    // if (role === 'admin') {
    //   return res.status(403).json({
    //     message: "Cannot create admin users through this endpoint",
    //     status: false,
    //     statusCode: 403
    //   });
    // }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
        status: false,
        statusCode: 400
      });
    }

    // Check if user exists
    const existingUser = await user.findOne({
      where: { email },
      raw: true
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists",
        status: false,
        statusCode: 400
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user - only allow student or instructor roles
    const newUser = await user.create({
      email,
      password: hashedPassword,
      first_name,
      last_name,
      phone,
      country,
      role: role ? role : 'student',
      email_verification: true,
      provider: 'local'
    });

    // Remove sensitive data
    const { password: _, ...userInfo } = newUser.toJSON();

    return res.status(201).json({
      message: "User created successfully",
      status: true,
      statusCode: 201,
      data: userInfo
    });

  } catch (error) {
    console.error("Error in createUser:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function updateUser(req, res) {
  try {
    const { user } = db;
    const { id } = req.params;
    const { email, password, first_name, last_name, phone, role, country } = req.body;

    // Find user
    const existingUser = await user.findOne({
      where: { id },
      raw: true
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
        status: false,
        statusCode: 404
      });
    }

    // Prepare update data
    const updateData = {};
    if (email) updateData.email = email;
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (phone) updateData.phone = phone;
    if (country) updateData.country = country;
    if (role) updateData.role = role;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    await user.update(updateData, {
      where: { id }
    });

    // Get updated user
    const updatedUser = await user.findOne({
      where: { id },
      raw: true
    });

    // Remove sensitive data
    const { password: _, ...userInfo } = updatedUser;

    return res.status(200).json({
      message: "User updated successfully",
      status: true,
      statusCode: 200,
      data: userInfo
    });

  } catch (error) {
    console.error("Error in updateUser:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function deleteUser(req, res) {
  try {
    const { user } = db;
    const { email, password } = req.body;
    console.log("Using email: ", email);

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Password is required",
        status: false,
        statusCode: 400
      });
    }

    // Find user by email
    const existingUser = await user.findOne({
      where: { email },
      raw: true
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
        status: false,
        statusCode: 404
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid password",
        status: false,
        statusCode: 401
      });
    }

    const userId = existingUser.id;
    await db.sequelize.transaction(async (t) => {
      await db.userFavorite.destroy({
        where: { user_id: userId },
        transaction: t
      });
      await db.payment.destroy({ where: { user_id: userId }, transaction: t });
      await db.subscription.destroy({ where: { user_id: userId }, transaction: t });
      await db.enquiry.destroy({ where: { user_id: userId }, transaction: t });
      await user.destroy({ where: { id: userId }, transaction: t });
    });

    return res.status(200).json({
      message: "User deleted successfully",
      status: true,
      statusCode: 200
    });

  } catch (error) {
    console.error("Error in deleteUser:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function deleteUserAdmin(req, res) {
  try {
    const { user } = db;
    const { id } = req.params;

    // Input validation
    if (!id) {
      return res.status(400).json({
        message: "Id is required",
        status: false,
        statusCode: 400
      });
    }

    // Find user by email
    const existingUser = await user.findOne({
      where: { id },
      raw: true
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
        status: false,
        statusCode: 404
      });
    }

    // Delete dependent rows first (foreign key constraints)
    const userId = existingUser.id;

    await db.sequelize.transaction(async (t) => {
      await db.userFavorite.destroy({
        where: { user_id: userId },
        transaction: t
      });

      // These may not always have FK constraints, but deleting them prevents orphans.
      await db.payment.destroy({ where: { user_id: userId }, transaction: t });
      await db.subscription.destroy({ where: { user_id: userId }, transaction: t });
      await db.enquiry.destroy({ where: { user_id: userId }, transaction: t });

      // Delete user
      await user.destroy({ where: { id: userId }, transaction: t });
    });

    return res.status(200).json({
      message: "User deleted successfully",
      status: true,
      statusCode: 200
    });

  } catch (error) {
    console.error("Error in deleteUser:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function getUserById(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "User ID is required",
        status: false,
        statusCode: 400
      });
    }

    const user = await db.user.findOne({
      where: { id },
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: false,
        statusCode: 404
      });
    }

    return res.status(200).json({
      message: "User fetched successfully",
      status: true,
      statusCode: 200,
      data: user
    });

  } catch (error) {
    console.error("Error in getUserById:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      statusCode: 500
    });
  }
}

export async function updateUserProfile(req, res) {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, country } = req.body;

    const user = await db.user.findOne({ where: { id } });

    if (!user) {
      return res.status(404).json({ message: "User not found", status: false, statusCode: 404 });
    }

    const updateData = {};
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (country) updateData.country = country;

    if (req.files) {
      if (req.files['profile_photo']) {
        updateData.profile_photo = req.files['profile_photo'][0].path;
      }

      // 2. Handle Government ID
      if (req.files['government_id']) {
        updateData.government_id = req.files['government_id'][0].path;
        updateData.is_identity_verified = false;
      }
    }

    await user.update(updateData);

    const updatedUser = user.toJSON();
    delete updatedUser.password;

    return res.status(200).json({
      message: "Profile updated successfully",
      status: true,
      statusCode: 200,
      data: updatedUser
    });

  } catch (error) {
    console.error("Error in updateUser:", error);
    return res.status(500).json({ message: "Internal Server Error", status: false, statusCode: 500 });
  }
}

export async function updatePassword(req, res) {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new passwords are required", status: false });
    }

    const user = await db.user.findOne({ where: { id } });

    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password", status: false });
    }

    if (newPassword.length < 10) {
      return res.status(400).json({ message: "Password must be at least 10 characters", status: false });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await user.update({ password: hashedPassword });

    return res.status(200).json({
      message: "Password updated successfully",
      status: true,
      statusCode: 200
    });

  } catch (error) {
    console.error("Error in updatePassword:", error);
    return res.status(500).json({ message: "Internal Server Error", status: false });
  }
}