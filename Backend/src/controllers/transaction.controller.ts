import type { Request, Response } from 'express';
import { currentUserId } from '../middleware/auth.middleware.js';
import * as transactionService from '../services/transaction.service.js';
import { badRequest } from '../utils/errors.js';
import { parseId, parseTransactionListQuery } from '../utils/pagination.js';

export async function list(req: Request, res: Response) {
  res.json(await transactionService.listTransactions(currentUserId(req), parseTransactionListQuery(req.query)));
}

export async function getOne(req: Request, res: Response) {
  res.json(await transactionService.getTransaction(currentUserId(req), parseId(req.params.id)));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await transactionService.createTransaction(currentUserId(req), req.body));
}

export async function update(req: Request, res: Response) {
  res.json(await transactionService.updateTransaction(currentUserId(req), parseId(req.params.id), req.body));
}

export async function remove(req: Request, res: Response) {
  await transactionService.deleteTransaction(currentUserId(req), parseId(req.params.id));
  res.status(204).end();
}

export async function exportCsv(req: Request, res: Response) {
  const csv = await transactionService.exportTransactionsCsv(currentUserId(req));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
  res.send(csv);
}

/** Body: raw CSV text with Content-Type: text/csv. */
export async function importCsv(req: Request, res: Response) {
  if (typeof req.body !== 'string' || req.body.trim() === '') {
    throw badRequest('Send the CSV file as the request body with Content-Type: text/csv');
  }
  res.json(await transactionService.importTransactionsCsv(currentUserId(req), req.body));
}
