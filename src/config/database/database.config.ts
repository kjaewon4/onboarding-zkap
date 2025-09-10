import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';
const envFile =
  nodeEnv === 'local'
    ? '.env.local'
    : nodeEnv === 'development'
      ? '.env.development'
      : '.env.production';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const databaseConfig = (
  configService?: ConfigService,
): TypeOrmModuleOptions & DataSourceOptions => {
  const dbType =
    configService?.get<string>('db.type') || process.env.DB_TYPE || 'postgres';

  return {
    type: dbType as 'postgres',
    host:
      configService?.get<string>('db.host') ||
      process.env.DB_HOST ||
      'localhost',
    port: parseInt(
      configService?.get<string>('db.port') || process.env.DB_PORT || '5433',
      10,
    ),
    username:
      configService?.get<string>('db.username') ||
      process.env.DB_USERNAME ||
      'postgres',
    password:
      configService?.get<string>('db.password') ||
      process.env.DB_PASSWORD ||
      'password',
    database:
      configService?.get<string>('db.database') ||
      process.env.DB_DATABASE ||
      'onboarding_zkap',
    entities: ['dist/**/entities/*.entity{.js,.ts}'],
    migrations: ['dist/migration/*{.js,.ts}'],
    migrationsTableName: 'migration',
    synchronize: false,
    migrationsRun: false,
    logging: nodeEnv === 'local' ? 'all' : ['error', 'warn'],
    namingStrategy: new SnakeNamingStrategy(),
    maxQueryExecutionTime: 3000,
  };
};

export const AppDataSource = new DataSource(databaseConfig());
