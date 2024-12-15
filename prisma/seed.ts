import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs/promises';
import { nanoid } from 'nanoid';
import * as process from 'node:process';
import { join } from 'path';
import { PrismaClient, RoleLevel } from '@prisma/client';
import { UserRole } from '../src/auth/consts';
import { Permission, Role } from './seed/__generated__/seed';
import { SystemOrganizations } from '../src/share/system-organizations.consts';

const prisma = new PrismaClient();

async function upsertData<T>(
  directory: string,
  upsertCallback: (id: string, data: T) => Promise<unknown>,
) {
  const files = await fs.readdir(join(__dirname, directory));

  for (const file of files) {
    const [id] = file.split('.');
    const data: T = JSON.parse(
      await fs.readFile(join(__dirname, `${directory}/${file}`), 'utf8'),
    );

    await upsertCallback(id, data);
  }
}

async function organization() {
  await prisma.organization.upsert({
    where: { id: SystemOrganizations.Revisium },
    create: {
      id: SystemOrganizations.Revisium,
    },
    update: {},
  });
}

async function permissions() {
  return upsertData<Permission>('./seed/permissions', (id, data) =>
    prisma.permission.upsert({
      where: { id },
      create: {
        id,
        ...data,
      },
      update: data,
    }),
  );
}

async function roles() {
  return upsertData<Role>('./seed/roles', (id, data) =>
    prisma.role.upsert({
      where: { id },
      create: {
        id,
        name: data.name,
        level: data.level as RoleLevel,
        permissions: {
          connect: data.permissions.map((permission) => ({ id: permission })),
        },
      },
      update: {
        name: data.name,
        level: data.level as RoleLevel,
        permissions: {
          set: data.permissions.map((permission) => ({ id: permission })),
        },
      },
    }),
  );
}

async function addSystemAdmin() {
  const userId = 'admin';

  const password = process.env.ADMIN_PASSWORD || 'admin';

  await prisma.user.upsert({
    where: {
      id: userId,
    },
    create: {
      id: userId,
      username: userId,
      password: await bcrypt.hash(password, 10),
      roleId: UserRole.systemAdmin,
      isEmailConfirmed: true,
      userOrganizations: {
        create: {
          id: nanoid(),
          organization: {
            create: {
              id: userId,
            },
          },
          role: {
            connect: {
              id: UserRole.organizationOwner,
            },
          },
        },
      },
    },
    update: {},
  });
}

async function addSystemFullApiRead() {
  const userId = 'endpoint';

  const password = process.env.ENDPOINT_PASSWORD || 'endpoint';

  await prisma.user.upsert({
    where: {
      id: userId,
    },
    create: {
      id: userId,
      username: userId,
      password: await bcrypt.hash(password, 10),
      roleId: UserRole.systemFullApiRead,
      isEmailConfirmed: true,
      userOrganizations: {
        create: {
          id: nanoid(),
          organization: {
            create: {
              id: userId,
            },
          },
          role: {
            connect: {
              id: UserRole.organizationOwner,
            },
          },
        },
      },
    },
    update: {},
  });
}

async function main() {
  await organization();
  await permissions();
  await roles();
  await addSystemAdmin();
  await addSystemFullApiRead();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
