import type { InspectionTemplate } from '@/types/inspections';

/**
 * Hardcoded demo template — used by /inspections/demo.
 * No backend required. Based on ISO 45001 general safety inspection.
 */
export const DEMO_TEMPLATE: InspectionTemplate = {
  id: 'demo-iso45001-general',
  title: 'Inspección General de Seguridad (ISO 45001)',
  description:
    'Plantilla demo · sin backend · evalúa condiciones básicas de un área de trabajo.',
  category: 'Seguridad',
  version: 1,
  is_published: true,
  is_global: true,
  tags: ['ISO 45001', 'Seguridad', 'Demo'],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  schema_definition: {
    sections: [
      {
        id: 's1',
        title: 'Condiciones del Área',
        order: 1,
        questions: [
          {
            id: 's1q1',
            text: '¿El área está libre de obstáculos y bien señalizada?',
            question_type: 'yes_no',
            required: true,
            weight: 2,
            guidance:
              'Verificar pasillos, salidas de emergencia y señales de seguridad.',
          },
          {
            id: 's1q2',
            text: '¿Los EPP están disponibles y en buen estado?',
            question_type: 'yes_no',
            required: true,
            weight: 3,
            guidance:
              'Casco, guantes, lentes, calzado de seguridad, arnés según aplique.',
          },
          {
            id: 's1q3',
            text: '¿Los extintores están vigentes y accesibles?',
            question_type: 'yes_no',
            required: true,
            weight: 3,
            guidance: 'Fecha de recarga vigente, sin obstrucciones, señalizados.',
          },
          {
            id: 's1q4',
            text: 'Observaciones del área',
            question_type: 'text',
            required: false,
            weight: 0,
          },
        ],
      },
      {
        id: 's2',
        title: 'Equipos y Herramientas',
        order: 2,
        questions: [
          {
            id: 's2q1',
            text: '¿Los equipos tienen mantenimiento al día?',
            question_type: 'yes_no',
            required: true,
            weight: 3,
            guidance:
              'Verificar bitácoras o stickers de mantenimiento preventivo.',
          },
          {
            id: 's2q2',
            text: '¿Las herramientas manuales están en buen estado?',
            question_type: 'yes_no',
            required: true,
            weight: 2,
            guidance: 'Sin filos rotos, mangos seguros, sin óxido excesivo.',
          },
          {
            id: 's2q3',
            text: '¿Las guardas de seguridad de los equipos están instaladas?',
            question_type: 'yes_no',
            required: true,
            weight: 3,
            guidance:
              'Revisión visual de guardas en equipos con partes en movimiento.',
          },
          {
            id: 's2q4',
            text: 'Número de equipos inspeccionados',
            question_type: 'number',
            required: false,
            weight: 0,
          },
        ],
      },
      {
        id: 's3',
        title: 'Personal y Procedimientos',
        order: 3,
        questions: [
          {
            id: 's3q1',
            text: '¿El personal porta correctamente el EPP?',
            question_type: 'yes_no',
            required: true,
            weight: 3,
            guidance:
              'Observación directa del uso correcto de los elementos de protección.',
          },
          {
            id: 's3q2',
            text: '¿El personal conoce los procedimientos de emergencia?',
            question_type: 'yes_no',
            required: true,
            weight: 3,
            guidance:
              'Verificar rutas de evacuación, punto de encuentro y responsables.',
          },
          {
            id: 's3q3',
            text: '¿El área cuenta con señalización de riesgos actualizada?',
            question_type: 'yes_no',
            required: true,
            weight: 2,
            guidance: 'Señales de riesgo eléctrico, caída, químicos, etc.',
          },
          {
            id: 's3q4',
            text: 'Observaciones generales',
            question_type: 'text',
            required: false,
            weight: 0,
          },
        ],
      },
    ],
  },
};
