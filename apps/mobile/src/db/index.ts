/**
 * WatermelonDB database singleton.
 *
 * Initialises a SQLite-backed database with all models.
 * Import `database` anywhere to access the local store.
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import {
  FormCache,
  SubmissionQueue,
  InspectionCache,
  IncidentQueue,
  ActionCache,
  PermitCache,
  EquipmentCache,
  UserSetting,
} from './models';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'openqhse_offline',
  jsi: true,              // use JSI for faster access on native
  onSetUpError: (error: unknown) => {
    console.error('[DB] Setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    FormCache,
    SubmissionQueue,
    InspectionCache,
    IncidentQueue,
    ActionCache,
    PermitCache,
    EquipmentCache,
    UserSetting,
  ],
});

export {
  FormCache,
  SubmissionQueue,
  InspectionCache,
  IncidentQueue,
  ActionCache,
  PermitCache,
  EquipmentCache,
  UserSetting,
};
