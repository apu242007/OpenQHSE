/**
 * WatermelonDB model definitions matching the schema.
 */

import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, json, text } from '@nozbe/watermelondb/decorators';

// Helper for JSON columns
const sanitize = (raw: unknown) => (typeof raw === 'string' ? JSON.parse(raw) : raw ?? []);

// ── Forms Cache ────────────────────────────────────────────

export class FormCache extends Model {
  static table = 'forms_cache';
  declare id: string;

  @text('server_id') serverId!: string;
  @text('title') title!: string;
  @text('description') description!: string;
  @text('category') category!: string;
  @json('schema_json', sanitize) schemaJson!: unknown[];
  @field('version') version!: number;
  @field('is_active') isActive!: boolean;
  @field('synced_at') syncedAt!: number;
  @field('updated_at') updatedAt!: number;
}

// ── Submissions Queue ──────────────────────────────────────

export class SubmissionQueue extends Model {
  static table = 'submissions_queue';
  declare id: string;

  @text('server_id') serverId!: string;
  @text('form_cache_id') formCacheId!: string;
  @text('form_server_id') formServerId!: string;
  @json('answers_json', sanitize) answersJson!: Record<string, unknown>;
  @json('attachments_json', sanitize) attachmentsJson!: string[];
  @field('latitude') latitude!: number | null;
  @field('longitude') longitude!: number | null;
  @field('started_at') startedAt!: number;
  @field('completed_at') completedAt!: number | null;
  @field('pending_sync') pendingSync!: boolean;
  @text('sync_error') syncError!: string;
  @field('synced_at') syncedAt!: number | null;
  @field('created_at') createdAt!: number;
}

// ── Inspections Cache ──────────────────────────────────────

export class InspectionCache extends Model {
  static table = 'inspections_cache';
  declare id: string;

  @text('server_id') serverId!: string;
  @text('title') title!: string;
  @text('site_name') siteName!: string;
  @text('area') area!: string;
  @text('status') status!: string;
  @field('scheduled_date') scheduledDate!: number | null;
  @text('inspector_name') inspectorName!: string;
  @text('template_json') templateJson!: string;
  @json('findings_json', sanitize) findingsJson!: unknown[];
  @field('score') score!: number | null;
  @field('pending_sync') pendingSync!: boolean;
  @field('synced_at') syncedAt!: number;
  @field('updated_at') updatedAt!: number;
}

// ── Incidents Queue ────────────────────────────────────────

export class IncidentQueue extends Model {
  static table = 'incidents_queue';
  declare id: string;

  @text('server_id') serverId!: string;
  @text('title') title!: string;
  @text('description') description!: string;
  @text('incident_type') incidentType!: string;
  @text('severity') severity!: string;
  @text('location') location!: string;
  @text('area') area!: string;
  @field('latitude') latitude!: number | null;
  @field('longitude') longitude!: number | null;
  @json('photos_json', sanitize) photosJson!: string[];
  @text('audio_uri') audioUri!: string;
  @field('occurred_at') occurredAt!: number;
  @text('reported_by') reportedBy!: string;
  @field('pending_sync') pendingSync!: boolean;
  @text('sync_error') syncError!: string;
  @field('synced_at') syncedAt!: number | null;
  @field('created_at') createdAt!: number;
}

// ── Actions Cache ──────────────────────────────────────────

export class ActionCache extends Model {
  static table = 'actions_cache';
  declare id: string;

  @text('server_id') serverId!: string;
  @text('title') title!: string;
  @text('description') description!: string;
  @text('status') status!: string;
  @text('priority') priority!: string;
  @field('due_date') dueDate!: number | null;
  @text('assigned_to_name') assignedToName!: string;
  @text('source_type') sourceType!: string;
  @text('source_id') sourceId!: string;
  @json('progress_notes_json', sanitize) progressNotesJson!: unknown[];
  @field('pending_sync') pendingSync!: boolean;
  @field('synced_at') syncedAt!: number;
  @field('updated_at') updatedAt!: number;
}

// ── Permits Cache ──────────────────────────────────────────

export class PermitCache extends Model {
  static table = 'permits_cache';
  declare id: string;

  @text('server_id') serverId!: string;
  @text('permit_number') permitNumber!: string;
  @text('permit_type') permitType!: string;
  @text('title') title!: string;
  @text('status') status!: string;
  @text('location') location!: string;
  @field('valid_from') validFrom!: number;
  @field('valid_until') validUntil!: number;
  @text('issued_to_name') issuedToName!: string;
  @json('workers_json', sanitize) workersJson!: string[];
  @text('qr_token') qrToken!: string;
  @text('checklist_json') checklistJson!: string;
  @field('synced_at') syncedAt!: number;
  @field('updated_at') updatedAt!: number;
}

// ── Equipment Cache ────────────────────────────────────────

export class EquipmentCache extends Model {
  static table = 'equipment_cache';
  declare id: string;

  @text('server_id') serverId!: string;
  @text('name') name!: string;
  @text('tag') tag!: string;
  @text('equipment_type') equipmentType!: string;
  @text('category') category!: string;
  @text('location') location!: string;
  @text('status') status!: string;
  @field('last_inspection_date') lastInspectionDate!: number | null;
  @field('next_inspection_date') nextInspectionDate!: number | null;
  @field('certification_expiry') certificationExpiry!: number | null;
  @text('specs_json') specsJson!: string;
  @text('details_json') detailsJson!: string;
  @field('synced_at') syncedAt!: number;
  @field('updated_at') updatedAt!: number;
}

// ── User Settings ──────────────────────────────────────────

export class UserSetting extends Model {
  static table = 'user_settings';
  declare id: string;

  @text('key') key!: string;
  @text('value') value!: string;
  @field('updated_at') updatedAt!: number;
}
