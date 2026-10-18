import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import type { NextFunction, Request, Response } from 'express';
import { badRequest } from '../utils/errors.js';

type DtoClass<T extends object> = new () => T;

function flattenErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...flattenErrors(error.children ?? []),
  ]);
}

/** Converts a plain object into a validated DTO instance, or throws a 400. */
export async function parseDto<T extends object>(dtoClass: DtoClass<T>, input: unknown): Promise<T> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest('Request body must be a JSON object');
  }
  const instance = plainToInstance(dtoClass, input);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  });
  if (errors.length > 0) {
    throw badRequest('Validation failed', flattenErrors(errors));
  }
  return instance;
}

/** Express middleware: validates req.body and replaces it with the DTO. */
export function validateBody<T extends object>(dtoClass: DtoClass<T>) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    req.body = await parseDto(dtoClass, req.body ?? {});
    next();
  };
}
