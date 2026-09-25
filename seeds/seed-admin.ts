import { AppDataSource } from '../src/data-source';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

function resolveCredentials(): { email: string; password: string } {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // The defaults below are published in docs/LOCAL-DEMO-RUNBOOK.md and
    // DEVELOPMENT.md for local/demo convenience — never allow them (or an
    // unset var silently falling back to them) in production.
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
      throw new Error(
        'ADMIN_EMAIL and ADMIN_PASSWORD must both be set when NODE_ENV=production — refusing to fall back to the known local-dev defaults.',
      );
    }
    return { email, password };
  }

  return {
    email: process.env.ADMIN_EMAIL ?? 'admin@citymega.org',
    password: process.env.ADMIN_PASSWORD ?? 'Admin@123456',
  };
}

async function seed() {
  // Fail fast, before touching the database, if production is missing the
  // credentials it needs.
  const { email, password } = resolveCredentials();

  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

  const [existing] = await AppDataSource.query<{ id: string }[]>(
    'SELECT id FROM users WHERE email = $1',
    [email],
  );

  if (existing) {
    console.log('Admin user already exists, skipping.');
    await AppDataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await AppDataSource.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'super_admin')`,
    [email, passwordHash],
  );

  console.log(`Super-admin created: ${email}`);
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
