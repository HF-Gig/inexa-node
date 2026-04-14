import db from "../../db.js";
import bcrypt from 'bcrypt'
import { generateToken } from "../helper/generateToken.js";
import jwt from 'jsonwebtoken'
import { sendSignupMail } from "./sendSignupMail.js";
import { sendPasswordResetMail } from "./sendPasswordResetMail.js";
import sendEmail from "../helper/sendEmail.js";

export async function signup(req, res) {
    try {
        const { user } = db;
        let { email } = req.body;
        const reditus_gr_id = typeof req.body.reditus_gr_id === 'string' ? req.body.reditus_gr_id.trim() : null;
        const reditus_affiliate_slug = typeof req.body.reditus_affiliate_slug === 'string' ? req.body.reditus_affiliate_slug.trim() : null;
        email = typeof email === 'string' ? email.trim() : '';

        // Input validation
        if (!email) {
            return res.status(400).json({
                message: "Email is required!",
                status: false,
                statusCode: 400
            });
        }

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

        if (existingUser && existingUser.email_verification && existingUser.password) {
            return res.status(400).json({
                message: "This email is already verified. Please sign in.",
                status: false,
                statusCode: 400
            });
        }

        const verificationToken = jwt.sign(
            { email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

        // if (!existingUser) {
        //     await user.create({
        //         email,
        //         password: null,
        //         first_name: null,
        //         last_name: null,
        //         email_verification: false,
        //         reditus_gr_id: reditus_gr_id || null,
        //         reditus_affiliate_slug: reditus_affiliate_slug || null,
        //     });
        // } else {
        //     // Update attribution if present (keep existing if already stored)
        //     const updateObj = {};
        //     if (reditus_gr_id && !existingUser.reditus_gr_id) updateObj.reditus_gr_id = reditus_gr_id;
        //     if (reditus_affiliate_slug && !existingUser.reditus_affiliate_slug) updateObj.reditus_affiliate_slug = reditus_affiliate_slug;
        //     if (Object.keys(updateObj).length > 0) {
        //         await user.update(updateObj, { where: { email } });
        //     }
        //     await sendSignupMail({ ...req.body, verifyUrl: verificationLink });

        //     return res.status(200).json({
        //         message: "Verification email re-sent successfully.",
        //         status: true,
        //         statusCode: 200
        //     });
        // }

        await sendSignupMail({ ...req.body, verifyUrl: verificationLink });

        if (existingUser && existingUser.email_verification && !existingUser.password) {
            return res.status(200).json({
                message: "Your email is already verified, but your profile is incomplete. We sent a fresh link so you can continue setup.",
                status: true,
                statusCode: 200
            });
        }

        return res.status(201).json({
            message: "Please check your email for verification.",
            status: true,
            statusCode: 201
        });

    } catch (error) {
        console.error("Error in signup:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            status: false,
            statusCode: 500
        });
    }
}
export async function resendVerification(req, res) {
    try {
        const { email } = req.body;
        const { user } = db;
        if (!email) {
            return res.status(400).json({ message: "Email is required", status: false });
        }

        const existingUser = await user.findOne({ where: { email }, raw: true });
        if (!existingUser) {
            return res.status(404).json({ message: "User not found", status: false });
        }

        if (existingUser.email_verification && existingUser.password) {
            return res.status(400).json({ message: "Email is already verified", status: false });
        }

        const verificationToken = jwt.sign(
            { email },
            process.env.JWT_SECRET,
            { expiresIn: '5m' }
        );
        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

        await sendSignupMail({ email, verifyUrl: verificationLink });

        return res.status(200).json({
            message: "Verification email re-sent successfully.",
            status: true,
            statusCode: 200
        });

    } catch (error) {
        console.error("Error in resendVerification:", error);
        return res.status(500).json({ message: "Internal Server Error", status: false });
    }
}
// export async function verifyEmail(req, res) {
//     try {
//         const token = req.query.token || req.body.token;
//         if (!token) {
//             return res.status(400).json({ message: "Token is required", status: false });
//         }

//         let decoded;
//         try {
//             decoded = jwt.verify(token, process.env.JWT_SECRET);
//         } catch (err) {
//             if (err.name === 'TokenExpiredError') {
//                 return res.status(400).json({ message: 'Token expired', status: false });
//             }
//             return res.status(400).json({ message: 'Invalid token', status: false });
//         }

//         const { user } = db;
//         const existingUser = await user.findOne({ where: { email: decoded.email } });
//         if (!existingUser) {
//             return res.status(400).json({ message: "Invalid token user", status: false });
//         }

//         if (existingUser.email_verification) {
//             return res.status(400).json({ message: "Token has expired or already been used", status: false });
//         }

//         const verifiedToken = jwt.sign(
//             { email: decoded.email, purpose: 'complete_profile' },
//             process.env.JWT_SECRET,
//             { expiresIn: '5m' }
//         );

//         await user.update(
//             {
//                 email_verification: true,
//                 password_reset_token: verifiedToken
//             },
//             { where: { email: decoded.email } }
//         );

//         return res.status(200).json({ message: 'Email verified successfully', status: true, verifiedToken });

//     } catch (error) {
//         console.log("error in email verification======>", error);
//         return res.json({ message: "Internal Server Error", status: false, statusCode: 500 });
//     }
// }

export async function verifyEmail(req, res) {
    try {
        const token = req.query.token || req.body.token;

        if (!token) {
            return res.status(400).json({ message: "Token is required", status: false });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {

            if (err.name === 'TokenExpiredError') {
                return res.status(400).json({
                    message: "The verification link has expired. Please re-register.",
                    status: false,
                    code: "TOKEN_EXPIRED"
                });
            }

            if (err.name === 'JsonWebTokenError') {
                return res.status(400).json({
                    message: "Invalid verification link",
                    status: false,
                    code: "INVALID_TOKEN"
                });
            }

            return res.status(400).json({
                message: "Token verification failed",
                status: false
            });
        }

        const { user } = db;

        // find user first
        let existingUser = await user.findOne({
            where: { email: decoded.email }
        });

        // CASE 1: Already verified — may still need to complete profile (password / details)
        if (existingUser?.email_verification) {
            if (!existingUser.password) {
                const verifiedToken = jwt.sign(
                    { email: decoded.email, purpose: 'complete_profile' },
                    process.env.JWT_SECRET,
                    { expiresIn: '24h' }
                );
                await user.update(
                    { password_reset_token: verifiedToken },
                    { where: { email: decoded.email } }
                );
                return res.status(200).json({
                    message: "Email already verified. Continue to complete your profile.",
                    status: true,
                    verifiedToken
                });
            }
            return res.status(200).json({
                message: "Email already verified.",
                status: true
            });
        }

        // CASE 2: Create user if not exists
        if (!existingUser) {
            try {
                existingUser = await user.create({
                    email: decoded.email,
                    email_verification: true,
                    password: null,
                    first_name: null,
                    last_name: null,
                    reditus_gr_id: decoded.reditus_gr_id || null,
                    reditus_affiliate_slug: decoded.reditus_affiliate_slug || null
                });
            } catch (err) {
                // Handle race condition (duplicate insert)
                if (err.name === 'SequelizeUniqueConstraintError') {
                    existingUser = await user.findOne({
                        where: { email: decoded.email }
                    });
                } else {
                    throw err;
                }
            }
        }

        // CASE 3: If exists but not verified → update
        if (!existingUser.email_verification) {
            await user.update(
                { email_verification: true },
                { where: { email: decoded.email } }
            );
        }

        // Always generate fresh profile token (long enough to finish the form)
        const verifiedToken = jwt.sign(
            { email: decoded.email, purpose: 'complete_profile' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        await user.update(
            { password_reset_token: verifiedToken },
            { where: { email: decoded.email } }
        );

        return res.status(200).json({
            message: "Email verified successfully",
            status: true,
            verifiedToken
        });

    } catch (error) {
        console.log("error in email verification======>", error);
        return res.status(500).json({
            message: "Internal Server Error",
            status: false
        });
    }
}

export async function completeProfile(req, res) {
    try {
        const firstName = typeof req.body.firstName === 'string' ? req.body.firstName.trim() : '';
        const lastName = typeof req.body.lastName === 'string' ? req.body.lastName.trim() : '';
        const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
        const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';
        const country = req.body.country;
        const reditus_gr_id = typeof req.body.reditus_gr_id === 'string' ? req.body.reditus_gr_id.trim() : null;
        const reditus_affiliate_slug = typeof req.body.reditus_affiliate_slug === 'string' ? req.body.reditus_affiliate_slug.trim() : null;
        const { user } = db;

        let email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : (req.body.verified_token || req.body.token);

        if (!token) {
            return res.status(400).json({
                message: 'Use the verification link from your email to open complete profile.',
                status: false
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.purpose !== 'complete_profile') {
                return res.status(400).json({ message: 'Invalid token purpose', status: false });
            }
            email = decoded.email;
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(400).json({ message: 'Token expired', status: false });
            }
            return res.status(400).json({ message: 'Invalid token', status: false });
        }

        if (!email) {
            return res.status(400).json({ message: "Email is required", status: false });
        }

        if (!firstName || !lastName || !phone || !password) {
            return res.status(400).json({ message: "Missing Required Fields", status: false });
        }

        // server-side password policy enforcement
        if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({ message: 'Password does not meet complexity requirements', status: false });
        }

        const getUser = await user.findOne({ where: { email: email } });
        if (!getUser) {
            return res.status(404).json({ message: "User Not Found", status: false });
        }

        if (getUser.password) {
            return res.status(400).json({ message: "Profile already completed", status: false });
        }

        if (getUser.password_reset_token !== token) {
            return res.status(400).json({ message: 'Invalid or already used token', status: false });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userObj = {
            first_name: firstName,
            last_name: lastName,
            phone,
            password: hashedPassword,
            country,
            ...(reditus_gr_id ? { reditus_gr_id } : {}),
            ...(reditus_affiliate_slug ? { reditus_affiliate_slug } : {}),
        };
        await user.update({ ...userObj, password_reset_token: null }, { where: { email } });

        // Generate JWT token for auto-login
        const updatedUser = await user.findOne({ where: { email }, raw: true });

        try {
            const esc = (v) =>
                String(v ?? '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
            const display = (v) => (v == null || v === '' ? 'N/A' : esc(v));
            const mailInfo = await sendEmail({
                to: 'sales@inexa.co.za',
                subject: `New account completed: ${firstName} ${lastName}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; border-bottom: 2px solid #3322ff; padding-bottom: 10px;">New user completed registration</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">User ID:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${updatedUser.id}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Name:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${display(firstName)} ${display(lastName)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="mailto:${esc(email)}">${display(email)}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="tel:${esc(phone)}">${display(phone)}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Country:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${display(country)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Completed:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</td>
              </tr>
            </table>
            <p style="margin-top: 20px; color: #666; font-size: 12px;">
              This user finished account setup after email verification (complete profile).
            </p>
          </div>
        `,
            });
            console.log('[completeProfile] Sales notification email sent', {
                to: 'sales@inexa.co.za',
                userId: updatedUser.id,
                userEmail: email,
                messageId: mailInfo?.messageId,
            });
        } catch (emailError) {
            console.error('Failed to send sales notification for completed profile:', emailError);
        }

        const loginToken = await generateToken({
            id: updatedUser.id,
            email: updatedUser.email
        });

        // Remove password from response
        const { password: _, ...userInfo } = updatedUser;

        return res.status(200).json({
            message: "User Data Added Successfully",
            status: true,
            data: {
                token: loginToken,
                user: userInfo
            }
        });
    } catch (error) {
        console.log("error in completeProfile======>", error)
        return res.json({ message: "Internal Server Error", status: false, statusCode: 500 })
    }
}

export async function login(req, res) {
    try {
        const { user } = db;
        const { email, password } = req.body;

        // Input validation
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
                status: false,
                statusCode: 400
            });
        }

        // Find user
        const userRecord = await user.findOne({
            where: { email },
            raw: true
        });

        if (!userRecord) {
            return res.status(401).json({
                message: "This email address doesn't exist",
                status: false,
                statusCode: 401
            });
        }

        if (!userRecord.password) {
            return res.status(401).json({
                message: "Please complete your profile to login!",
                status: false,
                statusCode: 401
            });
        }

        // Check email verification
        // if (!userRecord.emailVerification) {
        //     const verificationToken = jwt.sign(
        //         { email, userId: userRecord.id },
        //         process.env.JWT_SECRET,
        //         { expiresIn: '15m' }
        //     );
        //     const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        //     await handleForgotPasswordLink(email, verificationLink);

        //     return res.status(401).json({
        //         message: "Please verify your email first. A new verification link has been sent.",
        //         status: false,
        //         statusCode: 401
        //     });
        // }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, userRecord.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "The email or password you entered is invalid",
                status: false,
                statusCode: 401
            });
        }

        // Generate JWT token
        const token = await generateToken({
            id: userRecord.id,
            email: userRecord.email
        });

        // Remove sensitive data
        const { password: _, ...userInfo } = userRecord;

        return res.status(200).json({
            message: "Login successful",
            status: true,
            statusCode: 200,
            data: {
                token,
                user: userInfo
            }
        });

    } catch (error) {
        console.error("Error in login:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            status: false,
            statusCode: 500
        });
    }
}

export async function adminLogin(req, res) {
    try {
        const { user } = db;
        const { email, password } = req.body;

        // Input validation
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
                status: false,
                statusCode: 400
            });
        }

        // Find user
        const userRecord = await user.findOne({
            where: { email },
            raw: true
        });

        if (!userRecord) {
            return res.status(401).json({
                message: "Invalid email or password",
                status: false,
                statusCode: 401
            });
        }

        if (userRecord.role !== 'admin' && userRecord.role !== 'manager' && userRecord.role !== 'support' && userRecord.role !== 'editor' && userRecord.role !== 'owner' && userRecord.role !== 'moderator') {
            return res.status(403).json({
                message: "Access denied. Admin privileges required.",
                status: false,
                statusCode: 403
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, userRecord.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password",
                status: false,
                statusCode: 401
            });
        }

        // Generate JWT token
        const token = await generateToken({
            id: userRecord.id,
            email: userRecord.email,
            role: userRecord.role
        });

        // Remove sensitive data
        const { password: _, ...userInfo } = userRecord;

        return res.status(200).json({
            message: "Admin login successful",
            status: true,
            statusCode: 200,
            token,
            data: {
                user: userInfo
            }
        });

    } catch (error) {
        console.error("Error in admin login:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            status: false,
            statusCode: 500
        });
    }
}

export async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        const { user } = db;
        if (!email) {
            return res.json({ message: "Email Required ", status: false, statusCode: 400 })
        }
        const isUserExist = await user.findOne({
            where: { email },
            raw: true
        })
        if (!isUserExist) {
            return res.json({ message: "No user Exist with this email", status: false, statusCode: 400 })
        }
        const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '5m' });
        const resetLink = `${process.env.FRONTEND_URL}/password-reset/reset_token?token=${resetToken}`;
        await user.update({ password_reset_token: resetToken }, { where: { email } });
        sendPasswordResetMail({ email, resetUrl: resetLink });
        return res.status(200).json({ message: "Password Reset sent to your mail", status: true, reset_link: resetLink, statusCode: 200 });
    } catch (error) {
        console.log("error in forgotpassword======>", error)
        return res.json({ message: "Internal Server Error", status: false, statusCode: 500 })
    }
}

export async function resetPasswrod(req, res) {
    try {
        const { email, password, token } = req.body;
        const reset_token = token || req.query.token;
        const { user } = db;
        if (!email) {
            return res.status(400).json({ message: "Email required", status: false, statusCode: 400 })
        }
        if (!password) {
            return res.status(400).json({ message: "password Required", status: false, statusCode: 400 })
        }
        if (!reset_token) {
            return res.status(400).json({ message: "Reset token required", status: false, statusCode: 400 })
        }

        let decoded;
        try {
            decoded = jwt.verify(reset_token, process.env.JWT_SECRET);
            if (decoded.email !== email) {
                return res.status(400).json({ message: "Token does not match email", status: false });
            }
        } catch (err) {
            return res.status(400).json({ message: "This password reset link is invalid or has expired. Please request a new one to continue.", status: false });
        }

        const existingUser = await user.findOne({ where: { email } });
        if (!existingUser) {
            return res.status(400).json({ message: "User not found on this email", status: false, statusCode: 400 })
        }

        if (existingUser.password_reset_token !== reset_token) {
            return res.status(400).json({ message: "Reset token has expired or already been used", status: false });
        }

        const isSamePassword = await bcrypt.compare(password, existingUser.password);
        if (isSamePassword) {
            return res.status(400).json({ message: "New password cannot be the same as your current password", status: false });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userObj = {
            password: hashedPassword,
            password_reset_token: null // Expire after use
        }
        await user.update(userObj, {
            where: { email }
        })
        return res.json({ message: "Password updated Successfully", status: true, statusCode: 200 })
    } catch (error) {
        console.log("error in resetPasswrod======>", error)
        return res.json({ message: "Internal Server Error", status: false, statusCode: 500 })
    }
}