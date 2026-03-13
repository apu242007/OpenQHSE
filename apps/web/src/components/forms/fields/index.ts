/**
 * Barrel export for all form field render components.
 * Each field maps to a FieldType and is used both in the form
 * renderer (submission) and the builder preview.
 */

import type { FieldType, FieldComponentProps } from '@/types/forms';
import type React from 'react';

import { TextField } from './TextField.tsx';
import { TextareaField } from './TextareaField.tsx';
import { NumberField } from './NumberField.tsx';
import { BooleanField } from './BooleanField.tsx';
import { SelectField } from './SelectField.tsx';
import { MultiSelectField } from './MultiSelectField.tsx';
import { DateField } from './DateField.tsx';
import { DateTimeField } from './DateTimeField.tsx';
import { TimeField } from './TimeField.tsx';
import { PhotoField } from './PhotoField.tsx';
import { VideoField } from './VideoField.tsx';
import { AudioField } from './AudioField.tsx';
import { SignatureField } from './SignatureField.tsx';
import { GeolocationField } from './GeolocationField.tsx';
import { QrBarcodeField } from './QrBarcodeField.tsx';
import { NfcField } from './NfcField.tsx';
import { SliderField } from './SliderField.tsx';
import { RatingField } from './RatingField.tsx';
import { MatrixField } from './MatrixField.tsx';
import { ChecklistField } from './ChecklistField.tsx';
import { RiskMatrixField } from './RiskMatrixField.tsx';
import { InstructionField } from './InstructionField.tsx';
import { SectionField } from './SectionField.tsx';
import { TableField } from './TableField.tsx';
import { DrawingField } from './DrawingField.tsx';
import { BarcodeGenerateField } from './BarcodeGenerateField.tsx';
import { LookupField } from './LookupField.tsx';
import { CalculatedField } from './CalculatedField.tsx';
import { TemperatureField } from './TemperatureField.tsx';
import { WeatherField } from './WeatherField.tsx';

export {
  TextField, TextareaField, NumberField, BooleanField,
  SelectField, MultiSelectField, DateField, DateTimeField, TimeField,
  PhotoField, VideoField, AudioField, SignatureField, GeolocationField,
  QrBarcodeField, NfcField, SliderField, RatingField, MatrixField,
  ChecklistField, RiskMatrixField, InstructionField, SectionField,
  TableField, DrawingField, BarcodeGenerateField, LookupField,
  CalculatedField, TemperatureField, WeatherField,
};

export const FIELD_REGISTRY: Record<FieldType, React.ComponentType<FieldComponentProps>> = {
  text: TextField,
  textarea: TextareaField,
  number: NumberField,
  boolean: BooleanField,
  select: SelectField,
  multi_select: MultiSelectField,
  date: DateField,
  datetime: DateTimeField,
  time: TimeField,
  photo: PhotoField,
  video: VideoField,
  audio: AudioField,
  signature: SignatureField,
  geolocation: GeolocationField,
  qr_barcode: QrBarcodeField,
  nfc: NfcField,
  slider: SliderField,
  rating: RatingField,
  matrix: MatrixField,
  checklist: ChecklistField,
  risk_matrix: RiskMatrixField,
  instruction: InstructionField,
  section: SectionField,
  table: TableField,
  drawing: DrawingField,
  barcode_generate: BarcodeGenerateField,
  lookup: LookupField,
  calculated: CalculatedField,
  temperature: TemperatureField,
  weather: WeatherField,
};
