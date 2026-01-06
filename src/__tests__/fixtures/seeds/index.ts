import { INestApplication } from '@nestjs/common';
import { seedTableById } from './table-by-id.seed';

export interface SeedModule {
  name: string;
  seed: (app: INestApplication) => Promise<void>;
}

export const allSeeds: SeedModule[] = [
  { name: 'table-by-id', seed: seedTableById },
];

export async function runAllSeeds(app: INestApplication): Promise<void> {
  for (const { name, seed } of allSeeds) {
    console.log(`Seeding: ${name}...`);
    await seed(app);
    console.log(`Seeding: ${name} done`);
  }
}
