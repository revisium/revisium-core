import * as dotenv from 'dotenv';
import { configurePrisma } from '@revisium/prisma-pg-json';
import { Prisma } from 'src/__generated__/client';

dotenv.config({ path: '.env.test' });

configurePrisma(Prisma);
