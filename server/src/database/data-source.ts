import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './data-source-options';

config({ path: resolve(__dirname, '../../.env') });
export default new DataSource(createDatabaseOptions());
