# Inexa Backend Service
## Description
InexaBE is a robust backend service built with Node.js and Express.js, providing a comprehensive API for the Inexa platform. It handles course management, user authentication, payment processing, and integration with EDX content.

## Project Structure
```
├── app/                  # Application core
│   ├── controller/       # Request handlers and business logic
│   ├── helper/          # Utility functions and helpers
│   ├── middleware/      # Express middleware functions
│   ├── routes/          # API route definitions
│   └── utils/           # General utility functions
├── config/              # Configuration files
├── migrations/          # Database migration scripts
├── models/              # Sequelize model definitions
└── seeders/             # Database seed data
```
## Features
### Core Features
- Authentication & Authorization
  - JWT-based authentication
  - Role-based access control (Admin, Student)
  - Password reset functionality

- Course Management
  - EDX content integration
  - Course filtering and search
  - Course provider management
  - Subject categorization

- User Management
  - User registration and profile management
  - Staff management
  - Organization management

- Payment System
  - Payment processing
  - Subscription management
  - Invoice generation and email delivery

### Additional Features
- Favorites system for course bookmarking
- Testimonial management
- Site statistics tracking
- Contact form handling
- File upload functionality

## Prerequisites
### Required Software
- Node.js (LTS version recommended)
- MySQL/PostgreSQL
- npm or yarn package manager

### Environment Setup
1. MySQL/PostgreSQL database server
2. SMTP server for email functionality
3. EDX API credentials
4. Storage solution for file uploads

## Installation
1. Clone the repository:
```
git clone [repository-url]
```
2. Install dependencies:
```
npm install
```
3. Configure environment variables:
   Create a .env file in the root directory with the following variables:
```
# Database Configuration
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
DB_PORT=your_db_port

# Email Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_SECURE=true_or_false

# EDX API Configuration
EDX_API_CLIENT_ID=your_edx_cl
ient_id
EDX_API_CLIENT_SECRET=your_ed
x_client_secret

# JWT Configuration
JWT_SECRET=your_jwt_secret
```
4. Run database migrations:
```
npx sequelize-cli db:migrate
```
5. Start the development server:
```
npm run dev
```
## API Documentation
The API is organized into the following main endpoints:

- /api/auth - Authentication endpoints
- /api/users - User management
- /api/courses - Course management
- /api/staff - Staff management
- /api/organization - Organization management
- /api/payment - Payment processing
- /api/testimonial - Testimonial management
- /api/subjects - Subject management
- /api/site-statistics - Site statistics
- /api/favorites - User favorites
- /api/contact - Contact form

## Development
### Database Migrations
To create a new migration:

```
npx sequelize-cli 
migration:generate --name 
migration-name
```
To run migrations:

```
npx sequelize-cli db:migrate
```
To undo migrations:

```
npx sequelize-cli 
db:migrate:undo
```