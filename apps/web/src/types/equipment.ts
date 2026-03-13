/**
 * TypeScript types for the Equipment Management module.
 */

export type EquipmentStatus = 'active' | 'maintenance' | 'out_of_service' | 'decommissioned';
export type InspectionResult = 'pass' | 'fail' | 'conditional';

export interface Equipment {
  id: string;
  organization_id: string;
  site_id: string;
  name: string;
  code: string;
  description: string | null;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  photo_url: string | null;
  qr_code_url: string | null;
  location: string | null;
  status: EquipmentStatus;
  purchase_date: string | null;
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  certifications: EquipmentCertification[] | null;
  documents: EquipmentDocument[] | null;
  created_at: string;
}

export interface EquipmentListItem {
  id: string;
  name: string;
  code: string;
  category: string;
  status: EquipmentStatus;
  photo_url: string | null;
  location: string | null;
  next_inspection_date: string | null;
  created_at: string;
}

export interface EquipmentCertification {
  name: string;
  issuer: string;
  issued_date: string;
  expiry_date: string;
  file_url?: string;
}

export interface EquipmentDocument {
  title: string;
  type: string;
  file_url: string;
}

export interface EquipmentInspection {
  id: string;
  equipment_id: string;
  inspector_id: string;
  inspected_at: string;
  result: InspectionResult;
  notes: string | null;
  findings: InspectionFinding[] | null;
  next_inspection_date: string | null;
  attachments: { file_url: string; filename: string }[] | null;
  created_at: string;
}

export interface InspectionFinding {
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  photo_url?: string;
  action_required: boolean;
}

export const EQUIPMENT_STATUS_CONFIG: Record<EquipmentStatus, { label: string; bg: string; color: string; dot: string }> = {
  active:          { label: 'Operativo',          bg: 'bg-green-100',  color: 'text-green-800',  dot: 'bg-green-500'  },
  maintenance:     { label: 'En mantenimiento',   bg: 'bg-yellow-100', color: 'text-yellow-800', dot: 'bg-yellow-500' },
  out_of_service:  { label: 'Fuera de servicio',  bg: 'bg-red-100',    color: 'text-red-800',    dot: 'bg-red-500'    },
  decommissioned:  { label: 'Dado de baja',       bg: 'bg-gray-100',   color: 'text-gray-500',   dot: 'bg-gray-400'   },
};

export const INSPECTION_RESULT_CONFIG: Record<InspectionResult, { label: string; bg: string; color: string }> = {
  pass:        { label: 'Aprobado',     bg: 'bg-green-100',  color: 'text-green-800'  },
  fail:        { label: 'Reprobado',    bg: 'bg-red-100',    color: 'text-red-800'    },
  conditional: { label: 'Condicional', bg: 'bg-yellow-100', color: 'text-yellow-800' },
};
