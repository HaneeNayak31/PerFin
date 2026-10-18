import express, { Router } from 'express';
import * as transactions from '../controllers/transaction.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { CreateTransactionDto, UpdateTransactionDto } from '../validation/dtos.js';

export const transactionRouter = Router();
transactionRouter.use(requireAuth);
transactionRouter.get('/', transactions.list);
transactionRouter.post('/', validateBody(CreateTransactionDto), transactions.create);
transactionRouter.get('/export', transactions.exportCsv);
transactionRouter.post('/import', express.text({ type: ['text/csv', 'text/plain'], limit: '1mb' }), transactions.importCsv);
transactionRouter.get('/:id', transactions.getOne);
transactionRouter.patch('/:id', validateBody(UpdateTransactionDto), transactions.update);
transactionRouter.delete('/:id', transactions.remove);
