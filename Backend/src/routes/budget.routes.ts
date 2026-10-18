import { Router } from 'express';
import * as budgets from '../controllers/budget.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { CreateBudgetDto, UpdateBudgetDto } from '../validation/dtos.js';

export const budgetRouter = Router();
budgetRouter.use(requireAuth);
budgetRouter.get('/', budgets.list);
budgetRouter.get('/current', budgets.current);
budgetRouter.post('/', validateBody(CreateBudgetDto), budgets.create);
budgetRouter.get('/:id', budgets.getOne);
budgetRouter.patch('/:id', validateBody(UpdateBudgetDto), budgets.update);
budgetRouter.delete('/:id', budgets.remove);
