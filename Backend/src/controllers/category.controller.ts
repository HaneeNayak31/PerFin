import type { Request, Response } from 'express';
import { currentUserId } from '../middleware/auth.middleware.js';
import * as categoryService from '../services/category.service.js';
import { parseId } from '../utils/pagination.js';

export async function list(req: Request, res: Response) {
  res.json(await categoryService.listCategories(currentUserId(req)));
}

export async function getOne(req: Request, res: Response) {
  res.json(await categoryService.getCategory(currentUserId(req), parseId(req.params.id)));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await categoryService.createCategory(currentUserId(req), req.body));
}

export async function update(req: Request, res: Response) {
  res.json(await categoryService.updateCategory(currentUserId(req), parseId(req.params.id), req.body));
}

export async function remove(req: Request, res: Response) {
  await categoryService.deleteCategory(currentUserId(req), parseId(req.params.id));
  res.status(204).end();
}
