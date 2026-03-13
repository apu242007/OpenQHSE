/**
 * WatermelonDB schema for offline-first storage.
 *
 * Every table uses `synced_at` to track last sync timestamp
 * and `pending_sync` boolean for optimistic queue.
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // ── Forms cache (downloaded templates) ─────────────────
    tableSchema({
      name: 'forms_cache',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'category', type: 'string', isOptional: true },
        { name: 'schema_json', type: 'string' },       // JSON of field definitions
        { name: 'version', type: 'number' },
        { name: 'is_active', type: 'boolean' },
        { name: 'synced_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── Submissions queue (offline answers) ────────────────
    tableSchema({
      name: 'submissions_queue',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true }, // null = not yet synced
        { name: 'form_cache_id', type: 'string', isIndexed: true },
        { name: 'form_server_id', type: 'string' },
        { name: 'answers_json', type: 'string' },       // JSON of all field answers
        { name: 'attachments_json', type: 'string' },    // JSON array of local file URIs
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'started_at', type: 'number' },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'pending_sync', type: 'boolean' },       // true = needs upload
        { name: 'sync_error', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),

    // ── Inspections cache ──────────────────────────────────
    tableSchema({
      name: 'inspections_cache',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'site_name', type: 'string', isOptional: true },
        { name: 'area', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'scheduled_date', type: 'number', isOptional: true },
        { name: 'inspector_name', type: 'string', isOptional: true },
        { name: 'template_json', type: 'string', isOptional: true },
        { name: 'findings_json', type: 'string' },      // local findings array
        { name: 'score', type: 'number', isOptional: true },
        { name: 'pending_sync', type: 'boolean' },
        { name: 'synced_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── Incidents queue ────────────────────────────────────
    tableSchema({
      name: 'incidents_queue',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'incident_type', type: 'string' },
        { name: 'severity', type: 'string' },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'area', type: 'string', isOptional: true },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'photos_json', type: 'string' },         // JSON array of local URIs
        { name: 'audio_uri', type: 'string', isOptional: true },
        { name: 'occurred_at', type: 'number' },
        { name: 'reported_by', type: 'string' },
        { name: 'pending_sync', type: 'boolean' },
        { name: 'sync_error', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),

    // ── Corrective actions cache ───────────────────────────
    tableSchema({
      name: 'actions_cache',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'priority', type: 'string' },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'assigned_to_name', type: 'string', isOptional: true },
        { name: 'source_type', type: 'string', isOptional: true },
        { name: 'source_id', type: 'string', isOptional: true },
        { name: 'progress_notes_json', type: 'string' },
        { name: 'pending_sync', type: 'boolean' },
        { name: 'synced_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── Permits cache ──────────────────────────────────────
    tableSchema({
      name: 'permits_cache',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'permit_number', type: 'string', isIndexed: true },
        { name: 'permit_type', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'valid_from', type: 'number' },
        { name: 'valid_until', type: 'number' },
        { name: 'issued_to_name', type: 'string', isOptional: true },
        { name: 'workers_json', type: 'string' },       // authorized workers
        { name: 'qr_token', type: 'string', isOptional: true },
        { name: 'checklist_json', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── Equipment cache ────────────────────────────────────
    tableSchema({
      name: 'equipment_cache',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'tag', type: 'string', isIndexed: true },
        { name: 'equipment_type', type: 'string', isOptional: true },
        { name: 'category', type: 'string', isOptional: true },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'last_inspection_date', type: 'number', isOptional: true },
        { name: 'next_inspection_date', type: 'number', isOptional: true },
        { name: 'certification_expiry', type: 'number', isOptional: true },
        { name: 'specs_json', type: 'string', isOptional: true },
        { name: 'details_json', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── User settings ──────────────────────────────────────
    tableSchema({
      name: 'user_settings',
      columns: [
        { name: 'key', type: 'string', isIndexed: true },
        { name: 'value', type: 'string' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
