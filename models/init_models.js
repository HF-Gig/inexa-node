import { Sequelize, DataTypes } from "sequelize";
import dotenv from "dotenv";
import userModal from "./user.js";
import coursesModal from "./courses.js";
import staffModal from "./staff.js";
import organizationModel from "./organization.js";
import ownersModal from "./owners.js";
import programDataModel from "./program.js";
import programCourseModel from "./program_courses.js";
import programTypeModel from "./program_type.js";
import userFavoritesModal from "./userFavorites.js";
import paymentModel from "./payment.js";
import subscriptionModel from "./subscription.js";
import testimonialModel from "./testimonial.js";
import siteStatisticsModel from "./site_statistics.js";
import courseProvidersModel from "./course_providers.js";
import subjectsModel from "./subjects.js";
import staffCourseModel from "./staff_course.js";
import featuredCoursesModal from "./featured_courses.js";
import contactModal from "./contact.js";
import enquiriesModel from "./enquiries.js";
import facilitatorsModel from "./facilitators.js";
import featuredFacilitatorsModel from "./featured_facilitators.js";
import courseCostConfigModel from "./course_cost_config.js";
import couponModel from "./coupon.js";
import couponRedemptionModel from "./coupon_redemption.js";
import couponAttemptModel from "./coupon_attempt.js";

dotenv.config();
const modelsObjs = [];

let sequelizeInstance = null;

export default async function initModels() {
    if (sequelizeInstance == null) {
        sequelizeInstance = await _initModels();
    }
    return sequelizeInstance;
}

async function _initModels() {
    try {
        
        const sequelize = new Sequelize(
            process.env.DB_NAME,
            process.env.DB_USER,
            process.env.DB_PASSWORD,
            {
                host: process.env.DB_HOST,
                dialect: "mysql",
                port: process.env.DB_PORT,
                dialectOptions: {
                    charset: "utf8mb4",
                },
                pool: {
                    max: 100,
                    min: 0,
                    acquire: 60000,
                    idle: 10000,
                },
                retry: {
                    match: [
                        /ETIMEDOUT/,
                        /EHOSTUNREACH/,
                        /ECONNRESET/,
                        /ENETUNREACH/,
                        /EAI_AGAIN/,
                    ],
                    max: 5,
                },
                logging: false,
            }
        );
    
        const db = {};
    
        db.Sequelize = Sequelize;
        db.sequelize = sequelize;
    
        await sequelize.authenticate()
        
        const User = userModal(sequelize, DataTypes)
        db.user = User;
        const Course = coursesModal(sequelize, DataTypes)
        db.courses = Course;
        const Staff = staffModal(sequelize, DataTypes)
        db.staff = Staff;
        const Organization = organizationModel(sequelize, DataTypes)
        db.organization = Organization;
        const Owner = ownersModal(sequelize, DataTypes)
        db.owner = Owner;
        const Program = programDataModel(sequelize, DataTypes)
        db.program = Program;
        const ProgramCourse = programCourseModel(sequelize, DataTypes)
        db.program_course = ProgramCourse;
        const ProgramType = programTypeModel(sequelize, DataTypes)
        db.program_type = ProgramType;
        const UserFavorite = userFavoritesModal(sequelize, DataTypes)
        db.userFavorite = UserFavorite;
        const Payment = paymentModel(sequelize, DataTypes)
        db.payment = Payment;
        const Subscription = subscriptionModel(sequelize, DataTypes)
        db.subscription = Subscription;
        const Testimonial = testimonialModel(sequelize, DataTypes)
        db.testimonial = Testimonial;
        const SiteStatistics = siteStatisticsModel(sequelize, DataTypes)
        db.site_statistics = SiteStatistics;
        const CourseProvider = courseProvidersModel(sequelize, DataTypes)
        db.course_providers = CourseProvider;
        const Subject = subjectsModel(sequelize, DataTypes)
        db.subject = Subject;
        const StaffCourse = staffCourseModel(sequelize, DataTypes)
        db.staff_course = StaffCourse;
        const FeaturedCourse = featuredCoursesModal(sequelize, DataTypes)
        db.featured_course = FeaturedCourse;
        const Contact = contactModal(sequelize, DataTypes)
        db.contact = Contact;
        const Enquiry = enquiriesModel(sequelize, DataTypes)
        db.enquiry = Enquiry;
        const Facilitator = facilitatorsModel(sequelize, DataTypes)
        db.facilitator = Facilitator;
        const FeaturedFacilitator = featuredFacilitatorsModel(sequelize, DataTypes)
        db.featured_facilitators = FeaturedFacilitator;
        const CourseCostConfig = courseCostConfigModel(sequelize, DataTypes)
        db.course_cost_config = CourseCostConfig;
        const Coupon = couponModel(sequelize, DataTypes)
        db.coupon = Coupon;
        const CouponRedemption = couponRedemptionModel(sequelize, DataTypes)
        db.coupon_redemption = CouponRedemption;
        const CouponAttempt = couponAttemptModel(sequelize, DataTypes)
        db.coupon_attempt = CouponAttempt;

        // Call associate methods for all models
        Object.values(db).forEach(model => {
            if (model.associate) {
                model.associate(db);
            }
        });

        await sequelize.sync({ force: false }); // use force: true to drop and re-create tables
        console.log("Connection has been established successfully.")

        Program.belongsToMany(Course, {
            through: 'program_courses',
            foreignKey: 'programId',
            otherKey: 'courseId',
            onDelete: "CASCADE",
        });

        return db;
    } catch (error) {
            console.log("Unable to connect to the database:", error);
    }
}