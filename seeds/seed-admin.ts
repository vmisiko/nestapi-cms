import { AppDataSource } from '../src/data-source';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

async function seed() {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

  const email = process.env.ADMIN_EMAIL ?? 'admin@citymega.org';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@123456';

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
