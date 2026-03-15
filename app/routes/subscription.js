import express from 'express';
import {
    getAllSubscriptions,
    createSubscription,
    updateSubscription,
    deleteSubscription
} from '../controller/subscription.js';

const router = express.Router();

router.get('/', getAllSubscriptions);
router.post('/', createSubscription);
router.put('/:id', updateSubscription);
router.delete('/:id', deleteSubscription);

export default router;
