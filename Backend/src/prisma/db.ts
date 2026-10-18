// Prisma 8 maps DateTime columns to Temporal values. Node.js < 26.8.2 has no
// global Temporal, so the polyfill must load before the first query.
import 'temporal-polyfill/global';
import postgres from '@prisma/orm-postgres/runtime';
import { config } from '../config/env.js';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

export const db = postgres<Contract>({
  contractJson,
  url: config.databaseUrl,
});

export type Db = typeof db;
