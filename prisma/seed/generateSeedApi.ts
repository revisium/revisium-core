import 'dotenv/config';
import * as process from 'process';
import * as path from 'node:path';
import { generateApi } from 'swagger-typescript-api';

async function main() {
  await generateApi({
    name: 'seed.ts',
    output: path.resolve(process.cwd(), './prisma/seed/__generated__'),
    url: process.env.SEED_OPENAPI_URL as string,
    apiClassName: 'SeedApi',
    unwrapResponseData: true,
  });
}

main().then(console.log);
