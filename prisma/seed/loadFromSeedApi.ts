import 'dotenv/config';
import * as process from 'process';
import * as fs from 'fs/promises';
import { join } from 'path';
import { SeedApi } from './__generated__/seed';

const api = new SeedApi({
  baseUrl: process.env.SEED_URL,
});

async function fetchAndSaveData(
  listMethod: () => Promise<{ edges: { node: { id: string } }[] }>,
  detailMethod: (id: string) => Promise<unknown>,
  directory: string,
) {
  const items = await listMethod().then((result) =>
    result.edges.map((edge) => edge.node.id),
  );

  for (const id of items) {
    const data = await detailMethod(id);
    await fs.writeFile(
      join(__dirname, `./${directory}/${id}.json`),
      JSON.stringify(data, null, 2),
      'utf8',
    );
  }
}

async function loadPermissions() {
  await fetchAndSaveData(
    () => api.permission.permissionList({ first: 1000 }),
    (id) => api.permission.permissionDetail(id),
    'permissions',
  );
}

async function loadRoles() {
  await fetchAndSaveData(
    () => api.role.roleList({ first: 1000 }),
    (id) => api.role.roleDetail(id),
    'roles',
  );
}

async function main() {
  await loadPermissions();
  await loadRoles();
}

main();
