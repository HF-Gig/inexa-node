import express from 'express';
import { createSiteStatistic, getSiteStatistics, getSiteStatisticById, updateSiteStatistic, deleteSiteStatistic, getHomeStatsCount } from '../controller/siteStatistics.js';
import { isAdmin, isEditor } from '../middleware/roleCheck.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/get-count', getHomeStatsCount);
router.get('/', getSiteStatistics); // public fetch

router.use(authenticateToken);
router.post('/', isEditor, createSiteStatistic);
router.get('/:id', isEditor, getSiteStatisticById);
router.put('/:id', isEditor, updateSiteStatistic);
router.delete('/:id', isEditor, deleteSiteStatistic);

export default router; 