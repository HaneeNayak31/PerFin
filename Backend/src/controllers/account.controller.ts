import type { Request, Response } from 'express';
import { currentUserId } from '../middleware/auth.middleware.js';
import * as accountService from '../services/account.service.js';
import { parseId } from '../utils/pagination.js';

export async function list(req: Request, res: Response) {
  res.json(await accountService.listAccounts(currentUserId(req)));
}

export async function getOne(req: Request, res: Response) {
  res.json(await accountService.getAccount(currentUserId(req), parseId(req.params.id)));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await accountService.createAccount(currentUserId(req), req.body));
}

export async function update(req: Request, res: Response) {
  res.json(await accountService.updateAccount(currentUserId(req), parseId(req.params.id), req.body));
}

export async function remove(req: Request, res: Response) {
  await accountService.deleteAccount(currentUserId(req), parseId(req.params.id));
  res.status(204).end();
}
