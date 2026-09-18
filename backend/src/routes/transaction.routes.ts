import { Router } from 'express';
import { getTransactions, exportCSV } from '../controllers/transaction.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Protect all transaction routes with JWT authentication
router.use(authMiddleware);

router.get('/', getTransactions);
router.get('/export', exportCSV);

export default router;