import { Router } from 'express';
import * as accounts from '../controllers/account.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { CreateAccountDto, UpdateAccountDto } from '../validation/dtos.js';

export const accountRouter = Router();
accountRouter.use(requireAuth);
accountRouter.get('/', accounts.list);
accountRouter.post('/', validateBody(CreateAccountDto), accounts.create);
accountRouter.get('/:id', accounts.getOne);
accountRouter.patch('/:id', validateBody(UpdateAccountDto), accounts.update);
accountRouter.delete('/:id', accounts.remove);
