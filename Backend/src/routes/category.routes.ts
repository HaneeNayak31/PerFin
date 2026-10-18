import { Router } from 'express';
import * as categories from '../controllers/category.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { CreateCategoryDto, UpdateCategoryDto } from '../validation/dtos.js';

export const categoryRouter = Router();
categoryRouter.use(requireAuth);
categoryRouter.get('/', categories.list);
categoryRouter.post('/', validateBody(CreateCategoryDto), categories.create);
categoryRouter.get('/:id', categories.getOne);
categoryRouter.patch('/:id', validateBody(UpdateCategoryDto), categories.update);
categoryRouter.delete('/:id', categories.remove);
