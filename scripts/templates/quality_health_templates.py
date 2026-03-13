"""Quality (26–28) and Health/Occupational Hygiene (29–30) templates."""

# ── Helpers ──────────────────────────────────────────────────
def _yn(qid, text, weight=5, required=True, note=True):
    q = {
        "id": qid, "text": text, "type": "yes_no",
        "required": required, "weight": weight,
        "options": [
            {"value": "yes", "label": "Sí",  "score": weight},
            {"value": "no",  "label": "No",  "score": 0},
            {"value": "na",  "label": "N/A", "score": weight},
        ],
    }
    if note:
        q["conditional_logic"] = {
            "when": {"field": qid, "operator": "equals", "value": "no"},
            "then": {"show_field": f"{qid}_note"},
        }
        q["follow_up_fields"] = [
            {"id": f"{qid}_note", "type": "text",
             "label": "Describe la no conformidad / acción inmediata"}
        ]
    return q

def _mc(qid, text, options, weight=5, required=True):
    return {"id": qid, "text": text, "type": "multiple_choice",
            "required": required, "weight": weight, "options": options}

def _txt(qid, text, required=False):
    return {"id": qid, "text": text, "type": "text", "required": required, "weight": 0}

def _num(qid, text, unit="", weight=5, required=True):
    return {"id": qid, "text": text, "type": "numeric",
            "required": required, "weight": weight, "unit": unit, "min": 0}

def _photo(qid, text, required=False):
    return {"id": qid, "text": text, "type": "photo", "required": required, "weight": 0}

def _sig(qid, text):
    return {"id": qid, "text": text, "type": "signature", "required": True, "weight": 0}

STD = {
    "method": "percentage", "pass_threshold": 80,
    "color_bands": [
        {"min": 90, "max": 100, "color": "#00E5A0", "label": "Excelente"},
        {"min": 80, "max": 89,  "color": "#66FF99", "label": "Aprobado"},
        {"min": 60, "max": 79,  "color": "#FFAA00", "label": "Observaciones"},
        {"min": 0,  "max": 59,  "color": "#FF4444", "label": "Reprobado"},
    ],
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 26 — Auditoría de Calidad ISO 9001
# ═════════════════════════════════════════════════════════════

T26 = {
    "name": "Auditoría de Calidad ISO 9001",
    "slug": "auditoria-calidad-iso-9001",
    "description": (
        "Auditoría interna del Sistema de Gestión de Calidad (SGC) conforme a ISO 9001:2015. "
        "Evalúa los requisitos de contexto, liderazgo, planificación, soporte, operación, "
        "evaluación del desempeño y mejora. Diseñada para auditorías internas completas o "
        "por proceso. Genera evidencia objetiva para la recertificación."
    ),
    "short_description": "Auditoría interna completa del SGC según ISO 9001:2015.",
    "category": "quality",
    "industry": "General / Manufactura / Servicios",
    "standards": ["ISO 9001:2015"],
    "tags": ["ISO 9001", "calidad", "SGC", "auditoría", "proceso", "mejora continua"],
    "language": "es",
    "version": "2.1.0",
    "is_featured": True,
    "estimated_duration_minutes": 90,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Contexto de la Organización (Cláusula 4)",
                "order": 1,
                "questions": [
                    _yn("q1_1", "La organización ha identificado las partes interesadas y sus requisitos (matriz de partes interesadas).", 8),
                    _yn("q1_2", "El alcance del SGC está definido, documentado y disponible.", 8),
                    _yn("q1_3", "Los procesos del SGC están identificados con sus interacciones (mapa de procesos).", 8),
                    _yn("q1_4", "Los riesgos y oportunidades de los procesos han sido identificados y tratados.", 8),
                ],
            },
            {
                "id": "s2",
                "title": "2. Liderazgo y Política (Cláusula 5)",
                "order": 2,
                "questions": [
                    _yn("q2_1", "La política de calidad es apropiada, comunicada y comprendida por el personal.", 9),
                    _yn("q2_2", "Los objetivos de calidad son medibles y coherentes con la política.", 8),
                    _yn("q2_3", "Los roles y responsabilidades de calidad están definidos y asignados.", 7),
                    _yn("q2_4", "La alta dirección participa activamente en la revisión del SGC.", 8),
                ],
            },
            {
                "id": "s3",
                "title": "3. Operación y Control de Procesos (Cláusula 8)",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Los criterios de aceptación del producto/servicio están definidos.", 9),
                    _yn("q3_2", "Los procesos de control de diseño y desarrollo están implementados.", 8),
                    _yn("q3_3", "Los proveedores externos son evaluados y controlados según criterios definidos.", 8),
                    _yn("q3_4", "Se realizan controles en proceso con evidencia documentada.", 8),
                    _yn("q3_5", "Los productos no conformes son identificados, segregados y tratados.", 9),
                    _yn("q3_6", "Las trazabilidad del producto está garantizada (lotes, números de serie, registros).", 8),
                ],
            },
            {
                "id": "s4",
                "title": "4. Evaluación del Desempeño (Cláusula 9)",
                "order": 4,
                "questions": [
                    _yn("q4_1", "Se miden indicadores de satisfacción del cliente con métodos definidos.", 8),
                    _yn("q4_2", "Los KPIs de calidad de proceso son monitoreados con tendencias.", 8),
                    _yn("q4_3", "El programa de auditorías internas se cumple según lo planificado.", 8),
                    _yn("q4_4", "La revisión por la dirección cubre todos los puntos de entrada de la norma.", 8),
                    _yn("q4_5", "Los resultados de la revisión incluyen decisiones y acciones documentadas.", 7),
                ],
            },
            {
                "id": "s5",
                "title": "5. Mejora Continua (Cláusula 10)",
                "order": 5,
                "questions": [
                    _yn("q5_1", "El proceso de gestión de no conformidades y acciones correctivas está funcionando.", 9),
                    _yn("q5_2", "Las acciones correctivas son analizadas por causa raíz y verificadas en su efectividad.", 9),
                    _yn("q5_3", "Se puede demostrar mejora del SGC con datos en el último período.", 8),
                    _mc("q5_resultado", "Resultado general de la auditoría", [
                        {"value": "sin_nc",       "label": "Sin No Conformidades"},
                        {"value": "nc_menores",   "label": "No Conformidades Menores (< 3 meses para cerrar)"},
                        {"value": "nc_mayores",   "label": "No Conformidades Mayores (cierre antes de recertificación)"},
                        {"value": "oportunidades","label": "Solo Oportunidades de Mejora"},
                    ], weight=0),
                    _num("q5_total_nc", "Total de No Conformidades encontradas", "unidades"),
                    _txt("q5_hallazgos", "Hallazgos, no conformidades y oportunidades de mejora"),
                    _sig("q5_auditor", "Firma del Auditor Interno de Calidad"),
                    _sig("q5_rep_calidad", "Firma del Representante de Calidad (QMR)"),
                ],
            },
        ],
        "scoring_config": {**STD, "pass_threshold": 80},
    },
    "scoring_config": {**STD, "pass_threshold": 80},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 27 — Inspección de Recepción de Materiales
# ═════════════════════════════════════════════════════════════

T27 = {
    "name": "Inspección de Recepción de Materiales",
    "slug": "inspeccion-recepcion-materiales",
    "description": (
        "Control de calidad en la recepción de materias primas, componentes y materiales "
        "de construcción. Verifica cumplimiento de especificaciones, cantidades, documentación "
        "de calidad (certificados, MTC) y condiciones de transporte. Aplica para industria "
        "manufacturera, construcción y oil & gas."
    ),
    "short_description": "Control de calidad en recepción de materias primas y componentes.",
    "category": "quality",
    "industry": "Manufactura / Construcción / Industria",
    "standards": ["ISO 9001:2015", "ASTM", "ISO/IEC 17025"],
    "tags": ["recepción", "materiales", "QC", "inspección", "proveedor", "certificado", "MTC"],
    "language": "es",
    "version": "1.4.0",
    "is_featured": False,
    "estimated_duration_minutes": 20,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s0",
                "title": "Datos de la Recepción",
                "order": 0,
                "questions": [
                    _txt("q0_proveedor", "Nombre del proveedor"),
                    _txt("q0_material", "Descripción del material / producto"),
                    _txt("q0_oc", "Número de Orden de Compra"),
                    _txt("q0_remision", "Número de remisión / guía de despacho"),
                    _num("q0_cantidad", "Cantidad recibida", "unidades / kg / m"),
                    _txt("q0_inspector", "Nombre del inspector de calidad"),
                ],
            },
            {
                "id": "s1",
                "title": "1. Verificación de Documentación",
                "order": 1,
                "questions": [
                    _yn("q1_1", "La remisión/albarán corresponde a la Orden de Compra emitida.", 9),
                    _yn("q1_2", "Se recibió el certificado de calidad / Mill Test Certificate (MTC).", 9),
                    _yn("q1_3", "El certificado de calidad incluye los valores de los parámetros requeridos.", 9),
                    _yn("q1_4", "Los materiales tienen la marcación/código de identificación del fabricante.", 7),
                    _yn("q1_5", "La fecha de fabricación / lote está dentro del período de vida útil.", 8),
                    _yn("q1_6", "Los documentos técnicos adicionales (ficha técnica, HDS) fueron recibidos.", 6),
                ],
            },
            {
                "id": "s2",
                "title": "2. Inspección Visual y Dimensional",
                "order": 2,
                "questions": [
                    _yn("q2_1", "El material no presenta daños visibles (golpes, corrosión, humedad, roturas).", 9),
                    _yn("q2_2", "Las dimensiones/medidas corresponden a las especificadas en la OC.", 9),
                    _yn("q2_3", "El color, acabado superficial y apariencia cumplen con la especificación.", 7),
                    _yn("q2_4", "El embalaje no presenta daños que puedan haber comprometido el material.", 7),
                    _yn("q2_5", "La cantidad recibida coincide con la indicada en la remisión.", 9),
                    _photo("q2_foto", "Fotografía del material recibido y su estado"),
                ],
            },
            {
                "id": "s3",
                "title": "3. Pruebas de Verificación (si aplica)",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Se realizaron pruebas de campo o laboratorio requeridas por el plan de calidad.", 8),
                    _mc("q3_resultado_prueba", "Resultado de pruebas realizadas", [
                        {"value": "aprobado",   "label": "✅ Aprobado — Cumple especificaciones"},
                        {"value": "condic",     "label": "⚠️ Aprobado con condiciones — Usar para aplicaciones secundarias"},
                        {"value": "rechazado",  "label": "🚫 Rechazado — No cumple especificaciones"},
                        {"value": "no_aplica",  "label": "N/A — No se requieren pruebas para este material"},
                    ], weight=0),
                    _mc("q3_disposicion", "Disposición del material", [
                        {"value": "aceptado",    "label": "✅ ACEPTADO — Almacenar en área habilitada"},
                        {"value": "cuarentena",  "label": "⚠️ EN CUARENTENA — Pendiente resultados de laboratorio"},
                        {"value": "rechazado",   "label": "🚫 RECHAZADO — Devolver al proveedor"},
                    ], weight=0),
                    _txt("q3_obs", "Observaciones, desviaciones y acciones tomadas"),
                    _sig("q3_inspector", "Firma del Inspector de Calidad"),
                    _sig("q3_almacen", "Firma del Jefe de Almacén"),
                ],
            },
        ],
        "scoring_config": {**STD, "pass_threshold": 85},
    },
    "scoring_config": {**STD, "pass_threshold": 85},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 28 — Checklist de Control de Proceso
# ═════════════════════════════════════════════════════════════

T28 = {
    "name": "Checklist de Control de Proceso Productivo",
    "slug": "checklist-control-proceso-productivo",
    "description": (
        "Verificación periódica de los parámetros de control en procesos productivos "
        "industriales. Monitorea variables críticas de proceso (temperatura, presión, "
        "flujo, viscosidad, pH), condición de equipos clave y conformidad del producto "
        "en proceso con las especificaciones. Frecuencia adaptable según el proceso."
    ),
    "short_description": "Control periódico de parámetros críticos en procesos productivos industriales.",
    "category": "quality",
    "industry": "Manufactura / Química / Alimentos",
    "standards": ["ISO 9001:2015", "ISO/TS 16949", "SPC (AIAG)"],
    "tags": ["control de proceso", "SPC", "variables de proceso", "QC", "producción", "manufactura"],
    "language": "es",
    "version": "1.3.0",
    "is_featured": False,
    "estimated_duration_minutes": 15,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s0",
                "title": "Datos de la Verificación",
                "order": 0,
                "questions": [
                    _txt("q0_linea", "Línea / Equipo de producción"),
                    _txt("q0_producto", "Producto en proceso"),
                    _txt("q0_lote", "Número de lote / orden de producción"),
                    _txt("q0_operador", "Nombre del operador"),
                ],
            },
            {
                "id": "s1",
                "title": "1. Parámetros Críticos del Proceso",
                "order": 1,
                "questions": [
                    _num("q1_temp", "Temperatura del proceso", "°C"),
                    _yn("q1_temp_ok", "La temperatura está dentro del rango especificado.", 9),
                    _num("q1_presion", "Presión del proceso", "bar / psi"),
                    _yn("q1_presion_ok", "La presión está dentro del rango especificado.", 9),
                    _num("q1_flujo", "Caudal / Flujo del proceso", "l/min o kg/h"),
                    _yn("q1_flujo_ok", "El flujo está dentro del rango especificado.", 8),
                    _num("q1_velocidad", "Velocidad de producción actual", "u/h o rpm"),
                    _yn("q1_vel_ok", "La velocidad está dentro del rango especificado.", 7),
                ],
            },
            {
                "id": "s2",
                "title": "2. Verificación de Calidad del Producto en Proceso",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Las dimensiones del producto en proceso cumplen con las tolerancias.", 9),
                    _yn("q2_2", "El aspecto visual del producto (color, acabado, sin defectos) es correcto.", 8),
                    _yn("q2_3", "El peso / volumen del producto está dentro de especificación.", 8),
                    _yn("q2_4", "Los resultados de pruebas rápidas (pH, viscosidad, dureza) están OK.", 8),
                    _mc("q2_nivel_defectos", "Nivel de defectos observado en el muestreo", [
                        {"value": "zero",   "label": "0 defectos — Proceso controlado"},
                        {"value": "menor1", "label": "< 1% defectos — Dentro de límite de alerta"},
                        {"value": "1_5",    "label": "1–5% defectos — Investigar causa"},
                        {"value": "mayor5", "label": "> 5% defectos — Detener proceso"},
                    ], weight=0),
                ],
            },
            {
                "id": "s3",
                "title": "3. Condición de Equipos de Proceso",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Los equipos principales de proceso no presentan ruidos ni vibraciones anómalas.", 8),
                    _yn("q3_2", "Los instrumentos de medición en línea están dentro de su período de calibración.", 8),
                    _yn("q3_3", "Los consumibles y tooling están en condición aceptable (dentro de vida útil).", 7),
                    _mc("q3_accion", "Acción tomada", [
                        {"value": "continuar",   "label": "Continuar producción — Todo OK"},
                        {"value": "ajuste",      "label": "Ajuste de parámetro realizado — Continuar"},
                        {"value": "cuarentena",  "label": "Producto en cuarentena — Pendiente verificación"},
                        {"value": "parar",       "label": "Proceso detenido — Notificar a supervisión"},
                    ], weight=0),
                    _txt("q3_obs", "Observaciones del proceso, desviaciones y acciones correctivas"),
                    _sig("q3_operador", "Firma del Operador"),
                    _sig("q3_supervisor_calidad", "Firma del Supervisor de Calidad"),
                ],
            },
        ],
        "scoring_config": {**STD, "pass_threshold": 85},
    },
    "scoring_config": {**STD, "pass_threshold": 85},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 29 — Inspección de Higiene Industrial
# ═════════════════════════════════════════════════════════════

T29 = {
    "name": "Inspección de Higiene Industrial",
    "slug": "inspeccion-higiene-industrial",
    "description": (
        "Evaluación de higiene industrial para identificar, evaluar y controlar los riesgos "
        "higiénicos en el lugar de trabajo: agentes químicos, físicos y biológicos. "
        "Cubre exposición a ruido, calor, polvo, vapores, iluminación y vibración. "
        "Recomendada semestralmente o ante cambios en los procesos productivos."
    ),
    "short_description": "Evaluación semestral de agentes higiénicos: ruido, polvo, químicos, calor.",
    "category": "health",
    "industry": "Industria / Manufactura / Minería",
    "standards": ["ACGIH TLV-TWA", "OSHA 29 CFR 1910 Subpart Z", "ISO 45001:2018"],
    "tags": ["higiene industrial", "ruido", "polvo", "químicos", "TLV", "ACGIH", "exposición"],
    "language": "es",
    "version": "1.5.0",
    "is_featured": True,
    "estimated_duration_minutes": 60,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Agentes Físicos — Ruido",
                "order": 1,
                "questions": [
                    _yn("q1_1", "Se realizó medición de ruido ambiental en las áreas de trabajo (dosimetría).", 9),
                    _num("q1_ruido_max", "Nivel de ruido máximo medido en el área más crítica", "dB(A)"),
                    _num("q1_dosis", "Dosis de ruido promedio del trabajador más expuesto", "% dosis/8h"),
                    _yn("q1_2", "Los trabajadores expuestos a >85 dB(A) usan protección auditiva certificada.", 9),
                    _yn("q1_3", "Se han implementado controles de ingeniería para fuentes de ruido > 85 dB(A).", 8),
                    _yn("q1_4", "El programa de conservación auditiva (PCA) está vigente y documentado.", 8),
                    _yn("q1_5", "Los trabajadores expuestos tienen audiometría anual dentro del programa.", 8),
                ],
            },
            {
                "id": "s2",
                "title": "2. Agentes Físicos — Calor y Radiación",
                "order": 2,
                "questions": [
                    _yn("q2_1", "El índice WBGT fue medido en las áreas de trabajo con exposición a calor.", 8),
                    _num("q2_wbgt", "WBGT máximo medido", "°C"),
                    _yn("q2_2", "Se implementaron controles para estrés térmico: pausas, agua, sombra, ventilación.", 8),
                    _yn("q2_3", "Los trabajadores expuestos a radiación UV (soldadura, exterior) usan protección adecuada.", 8),
                    _yn("q2_4", "Se controla la exposición a fuentes de radiación ionizante (si aplica).", 7),
                ],
            },
            {
                "id": "s3",
                "title": "3. Agentes Químicos — Exposición",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Se tiene el inventario de sustancias químicas con sus HDS actualizadas.", 9),
                    _yn("q3_2", "Se realizaron mediciones de exposición a contaminantes aéreos en los últimos 12 meses.", 9),
                    _yn("q3_3", "Ningún trabajador supera el 50% del TLV-TWA (nivel de acción) para su sustancia.", 9),
                    _yn("q3_4", "Los controles de ingeniería (ventilación local exhaustiva) funcionan correctamente.", 9),
                    _yn("q3_5", "La protección respiratoria asignada es específica para los contaminantes presentes.", 9),
                    _num("q3_sustancias", "Número de sustancias con medición de exposición en el período", "sustancias"),
                ],
            },
            {
                "id": "s4",
                "title": "4. Polvo y Vibración",
                "order": 4,
                "questions": [
                    _yn("q4_1", "La concentración de polvo respirable está por debajo del TLV-TWA (3 mg/m³).", 9),
                    _yn("q4_2", "El polvo de sílice cristalina (si aplica) está por debajo de 0.025 mg/m³ (ACGIH).", 10),
                    _yn("q4_3", "Se monitorea la exposición a vibración mano-brazo en operadores de herramientas vibrantes.", 7),
                    _yn("q4_4", "Los trabajadores expuestos a vibración de cuerpo entero (VCE) están identificados.", 7),
                ],
            },
            {
                "id": "s5",
                "title": "5. Iluminación y Ergonomía Visual",
                "order": 5,
                "questions": [
                    _yn("q5_1", "Los niveles de iluminación cumplen con los mínimos recomendados (200 lux oficinas, 500 lux manufactura).", 8),
                    _num("q5_iluminacion_min", "Nivel mínimo de iluminación medido en área más crítica", "lux"),
                    _yn("q5_2", "No existen deslumbramientos ni contrastes extremos en las estaciones de trabajo.", 7),
                    _yn("q5_3", "Las pantallas de visualización (PVD) tienen filtros y están correctamente posicionadas.", 6),
                    _txt("q5_prioridades", "Agentes higiénicos prioritarios y plan de control recomendado"),
                    _sig("q5_higienista", "Firma del Higienista Industrial"),
                    _sig("q5_gerente_hse", "Firma del Gerente de HSE"),
                ],
            },
        ],
        "scoring_config": {**STD, "pass_threshold": 80},
    },
    "scoring_config": {**STD, "pass_threshold": 80},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 30 — Checklist de Ergonomía en Puesto de Trabajo
# ═════════════════════════════════════════════════════════════

T30 = {
    "name": "Checklist de Ergonomía en Puesto de Trabajo",
    "slug": "checklist-ergonomia-puesto-trabajo",
    "description": (
        "Evaluación ergonómica del puesto de trabajo para identificar factores de riesgo "
        "de trastornos musculoesqueléticos (TME). Aplica método REBA simplificado para "
        "posturas, analiza fuerzas, movimientos repetitivos, condiciones ambientales y "
        "diseño del puesto. Para puestos de manufactura, oficina y tareas manuales."
    ),
    "short_description": "Evaluación ergonómica simplificada (REBA) para puestos industriales y de oficina.",
    "category": "health",
    "industry": "General / Industria / Oficina",
    "standards": ["ISO 11228", "ISO 9241", "NIOSH Lifting Equation", "OSHA 29 CFR 1910"],
    "tags": ["ergonomía", "REBA", "TME", "postura", "puesto de trabajo", "musculoesquelético"],
    "language": "es",
    "version": "1.8.0",
    "is_featured": True,
    "estimated_duration_minutes": 40,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s0",
                "title": "Datos del Puesto",
                "order": 0,
                "questions": [
                    _txt("q0_puesto", "Nombre del puesto de trabajo"),
                    _txt("q0_trabajador", "Nombre del trabajador evaluado"),
                    _txt("q0_tarea", "Descripción de la tarea principal"),
                    _num("q0_duracion", "Tiempo diario en la tarea principal", "horas"),
                    _mc("q0_tipo_puesto", "Tipo de puesto", [
                        {"value": "manufactura", "label": "Manufactura / Ensamblaje"},
                        {"value": "oficina",     "label": "Oficina / PVD"},
                        {"value": "manual",      "label": "Trabajo manual / campo"},
                        {"value": "conduccion",  "label": "Conducción de vehículos"},
                    ], weight=0),
                ],
            },
            {
                "id": "s1",
                "title": "1. Postura y Carga Postural",
                "order": 1,
                "questions": [
                    _mc("q1_postura_cuello", "Postura del cuello durante la tarea", [
                        {"value": "neutral",  "label": "0–20° flexión — Neutral (bajo riesgo)"},
                        {"value": "flexion",  "label": "20–45° flexión — Riesgo Medio"},
                        {"value": "extrema",  "label": "> 45° o extensión — Alto Riesgo"},
                    ], weight=4),
                    _mc("q1_postura_tronco", "Postura del tronco durante la tarea", [
                        {"value": "erecto",   "label": "Erecto o leve inclinación < 20° (bajo riesgo)"},
                        {"value": "inclinado","label": "20–60° inclinación (riesgo medio)"},
                        {"value": "extremo",  "label": "> 60° o torsión (alto riesgo)"},
                    ], weight=5),
                    _mc("q1_postura_hombros", "Postura de los hombros", [
                        {"value": "neutro",    "label": "Brazos junto al cuerpo (neutro)"},
                        {"value": "elevados",  "label": "Brazos elevados 45–90° (riesgo medio)"},
                        {"value": "muy_alto",  "label": "Brazos > 90° sobre hombros (alto riesgo)"},
                    ], weight=4),
                    _yn("q1_1", "El trabajador puede alternar entre posturas sentado/parado.", 6),
                    _yn("q1_2", "No se requieren posturas con la cabeza girada > 30° por periodos prolongados.", 7),
                    _yn("q1_3", "El plano de trabajo está a la altura de los codos del trabajador.", 7),
                ],
            },
            {
                "id": "s2",
                "title": "2. Manejo Manual de Cargas",
                "order": 2,
                "questions": [
                    _yn("q2_1", "El peso máximo manipulado no supera los límites recomendados (25 kg hombres / 15 kg mujeres, condiciones ideales).", 9),
                    _num("q2_peso_max", "Peso máximo manipulado manualmente", "kg"),
                    _mc("q2_frecuencia", "Frecuencia de levantamiento", [
                        {"value": "esporadico", "label": "< 1 vez/hora — Esporádico"},
                        {"value": "frecuente",  "label": "1–12 veces/hora — Frecuente"},
                        {"value": "muy_frec",   "label": "> 12 veces/hora — Muy Frecuente"},
                    ], weight=5),
                    _yn("q2_2", "El levantamiento se realiza cerca del cuerpo (sin alcances extremos).", 8),
                    _yn("q2_3", "Se usan ayudas mecánicas para cargas > 15 kg (zorra, grúa manual, mesa elevadora).", 8),
                    _yn("q2_4", "El personal ha recibido capacitación en técnicas de levantamiento seguro.", 7),
                ],
            },
            {
                "id": "s3",
                "title": "3. Movimientos Repetitivos",
                "order": 3,
                "questions": [
                    _mc("q3_ciclo", "Ciclo de la tarea repetitiva", [
                        {"value": "largo",  "label": "> 30 segundos por ciclo (bajo riesgo)"},
                        {"value": "medio",  "label": "10–30 segundos por ciclo (riesgo medio)"},
                        {"value": "corto",  "label": "< 10 segundos por ciclo (alto riesgo)"},
                    ], weight=5),
                    _yn("q3_1", "Existen pausas de descanso de al menos 5 min por cada 50–60 min de trabajo repetitivo.", 8),
                    _yn("q3_2", "Se rotan los trabajadores entre tareas para disminuir la exposición repetitiva.", 7),
                    _yn("q3_3", "No se usan guantes que dificulten la destreza manual (reducción de la fuerza prensil).", 6),
                ],
            },
            {
                "id": "s4",
                "title": "4. Entorno de Trabajo y Puesto de Oficina",
                "order": 4,
                "questions": [
                    _yn("q4_1", "La silla de trabajo (si aplica) es ajustable en altura, respaldo y apoyabrazos.", 7),
                    _yn("q4_2", "La pantalla de computador está al nivel de los ojos del trabajador.", 7),
                    _yn("q4_3", "El teclado y ratón permiten mantener los codos en ángulo de 90°.", 7),
                    _yn("q4_4", "Los pies del trabajador descansan en el suelo o en reposapiés.", 6),
                    _mc("q4_riesgo_total", "Nivel de riesgo ergonómico global del puesto", [
                        {"value": "bajo",    "label": "🟢 BAJO — Riesgo insignificante, mantener condiciones"},
                        {"value": "medio",   "label": "🟡 MEDIO — Riesgo significativo, investigar y mejorar a corto plazo"},
                        {"value": "alto",    "label": "🟠 ALTO — Riesgo importante, intervención inmediata"},
                        {"value": "muy_alto","label": "🔴 MUY ALTO — Riesgo inaceptable, cambiar puesto URGENTE"},
                    ], weight=0),
                    _txt("q4_recom", "Recomendaciones ergonómicas y plan de intervención con plazos"),
                    _photo("q4_foto", "Fotografía de la postura más crítica del trabajador"),
                    _sig("q4_evaluador", "Firma del Evaluador Ergonómico"),
                    _sig("q4_trabajador", "Firma del Trabajador"),
                ],
            },
        ],
        "scoring_config": {**STD, "pass_threshold": 75},
    },
    "scoring_config": {**STD, "pass_threshold": 75},
}


# ─────────────────────────────────────────────────────────────
# Export
# ─────────────────────────────────────────────────────────────
QUALITY_HEALTH_TEMPLATES = [T26, T27, T28, T29, T30]
