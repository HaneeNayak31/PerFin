import { db } from '../prisma/db.js';
import { conflict, isForeignKeyViolation, isUniqueViolation, notFound } from '../utils/errors.js';
import type { CreateCategoryDto, UpdateCategoryDto } from '../validation/dtos.js';

export async function listCategories(userId: number) {
  return db.orm.public.Category.where({ userId }).orderBy((c) => c.name.asc()).all();
}

export async function getCategory(userId: number, categoryId: number) {
  const category = await db.orm.public.Category.where({ id: categoryId, userId }).first();
  if (!category) throw notFound('Category not found');
  return category;
}

/**
 * The database's unique index is case-sensitive, so "Food" and "food" would
 * both be allowed. This check makes names unique regardless of case.
 */
async function assertNameAvailable(userId: number, name: string, exceptId = 0) {
  const plan = db.raw.sql`
    SELECT "id" FROM "category"
     WHERE "userId" = ${userId} AND lower("name") = lower(${name}) AND "id" <> ${exceptId}
     LIMIT 1`
    .returnsRow({ id: 'pg/int4@1' })
    .build();
  const rows = await db.runtime().query(plan);
  if (rows.length > 0) throw conflict('Category with this name already exists');
}

export async function createCategory(userId: number, input: CreateCategoryDto) {
  await assertNameAvailable(userId, input.name);
  try {
    return await db.orm.public.Category.create({ userId, name: input.name, type: input.type });
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict('Category with this name already exists');
    throw error;
  }
}

export async function updateCategory(userId: number, categoryId: number, input: UpdateCategoryDto) {
  const category = await getCategory(userId, categoryId);

  if (input.type !== undefined && input.type !== category.type) {
    // Changing the type would silently reclassify existing transactions.
    const used = await db.orm.public.Transaction.select('id').where({ categoryId, userId }).first();
    if (used) throw conflict('Cannot change the type of a category that already has transactions');
  }

  if (input.name !== undefined) await assertNameAvailable(userId, input.name, categoryId);

  const changes: Partial<Pick<UpdateCategoryDto, 'name' | 'type'>> = {};
  if (input.name !== undefined) changes.name = input.name;
  if (input.type !== undefined) changes.type = input.type;
  if (Object.keys(changes).length === 0) return category;

  try {
    return await db.orm.public.Category.where({ id: categoryId, userId }).update(changes);
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict('Category with this name already exists');
    throw error;
  }
}

export async function deleteCategory(userId: number, categoryId: number): Promise<void> {
  await getCategory(userId, categoryId);
  try {
    // Foreign keys reject the delete if transactions or budgets still use it.
    await db.orm.public.Category.where({ id: categoryId, userId }).delete();
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw conflict('Cannot delete a category that is used by transactions or budgets');
    }
    throw error;
  }
}
