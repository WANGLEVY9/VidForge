import { DataSource } from 'typeorm';

/**
 * TypeORM CLI entry point.
 *
 * Run from apps/backend with DATABASE_URL (or DB_HOST/DB_PORT/DB_USER/
 * DB_PASSWORD/DB_NAME) configured. This data source deliberately disables
 * synchronize; schema changes belong in migrations.
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: false,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
