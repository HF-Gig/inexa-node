import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";

import "reflect-metadata";
import http from "http";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';
import apiRoutes from './app/routes.js';
import { handleSubscriptionWebhook } from './app/controller/payment.js';
import { startCourseCron } from './app/cron/courseScheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOST = '0.0.0.0';

const app = express();
dotenv.config();

// CORS Middleware
const corsOpts = {
  origin: "*",
};
app.use(cors(corsOpts));

// Stripe webhook route: must be before body parsers!
app.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  handleSubscriptionWebhook
);

// Now add body parsers for all other routes
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from uploads directory
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// HTTP server and WebSocket server setup
const server = http.createServer(app);

// API Routes with common prefix
startCourseCron();
app.use('/api', apiRoutes);


// Start server
server.listen(process.env.PORT, HOST, () => {
  console.log(`Server running successfully on port ${process.env.PORT}`);
});
