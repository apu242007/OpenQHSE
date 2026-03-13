"""Oil & Gas (11–15) and Mining (16–19) templates."""

# ── Reuse helpers from safety_templates ──────────────────────
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

STD_SCORING = {
    "method": "percentage", "pass_threshold": 85,
    "color_bands": [
        {"min": 90, "max": 100, "color": "#00E5A0", "label": "Excelente"},
        {"min": 85, "max": 89,  "color": "#66FF99", "label": "Aprobado"},
        {"min": 60, "max": 84,  "color": "#FFAA00", "label": "Observaciones"},
        {"min": 0,  "max": 59,  "color": "#FF4444", "label": "Reprobado"},
    ],
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 11 — Inspección Diaria de Plataforma Petrolera
# ═════════════════════════════════════════════════════════════

T11 = {
    "name": "Inspección Diaria de Plataforma Petrolera",
    "slug": "inspeccion-diaria-plataforma-petrolera",
    "description": (
        "Inspección diaria de seguridad para plataformas de producción offshore y onshore "
        "según API RP 75 (SEMS) y OSHA 29 CFR 1910.119. Cubre integridad mecánica, sistemas "
        "de control de pozos, equipos de seguridad, prevención de derrames y procedimientos "
        "de emergencia. Requerida al inicio de cada turno por el jefe de turno (Pusher)."
    ),
    "short_description": "Inspección de turno para plataformas de producción petrolera (API RP 75).",
    "category": "oil_and_gas",
    "industry": "Oil & Gas — Upstream",
    "standards": ["API RP 75", "OSHA 29 CFR 1910.119", "API RP 14C"],
    "tags": ["plataforma", "offshore", "oil gas", "API RP 75", "turno", "SEMS", "pozo"],
    "language": "es",
    "version": "3.0.0",
    "is_featured": True,
    "estimated_duration_minutes": 40,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Integridad de Equipos de Proceso",
                "order": 1,
                "questions": [
                    _yn("q1_1", "Los separadores y recipientes de proceso están operando dentro de parámetros normales.", 9),
                    _yn("q1_2", "No se observan fugas de hidrocarburo en bridas, válvulas o líneas.", 10),
                    _yn("q1_3", "Las válvulas de seguridad (PSV/PRV) están operativas y sin signos de fuga.", 9),
                    _yn("q1_4", "Los instrumentos de presión, temperatura y flujo muestran lecturas normales.", 8),
                    _yn("q1_5", "Los sistemas de inyección de inhibidores (anticorrosivo, antiparafínico) están activos.", 7),
                    _num("q1_presion_sep", "Presión del separador primario", "psig"),
                    _num("q1_temp_proceso", "Temperatura de proceso actual", "°C"),
                ],
            },
            {
                "id": "s2",
                "title": "2. Control de Pozo y Prevención de Blowout",
                "order": 2,
                "questions": [
                    _yn("q2_1", "El BOP (Blowout Preventer) está en buen estado, operativo y probado según programa.", 10),
                    _yn("q2_2", "El peso del lodo de perforación está dentro de los parámetros especificados.", 10),
                    _yn("q2_3", "No se observan indicios de kick (incremento de presión, gasbubbling).", 10),
                    _yn("q2_4", "El sistema de choke manifold está operativo y probado.", 9),
                    _yn("q2_5", "El equipo de control de pozos (well control equipment) está disponible y verificado.", 9),
                    _yn("q2_6", "El personal de turno está certificado en control de pozos (IWCF/IADC).", 9),
                ],
            },
            {
                "id": "s3",
                "title": "3. Sistemas de Seguridad y Contra Incendio",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Los detectores de gas (fijo y portátil) están calibrados y operativos.", 10),
                    _yn("q3_2", "El sistema de cierre de emergencia (ESD) fue probado según programa.", 9),
                    _yn("q3_3", "El sistema de supresión de incendio (diluvio/espuma) está operativo.", 9),
                    _yn("q3_4", "Las mangueras y monitores de incendio están disponibles y en buen estado.", 8),
                    _yn("q3_5", "Las alarmas de fuego y gas funcionan correctamente (prueba semanal).", 9),
                    _num("q3_gas_ppm", "Lectura de gas ambiental en área de proceso", "ppm"),
                ],
            },
            {
                "id": "s4",
                "title": "4. Manejo de Residuos y Prevención de Derrames",
                "order": 4,
                "questions": [
                    _yn("q4_1", "Los drenajes del proceso van al sistema de recuperación de hidrocarburo.", 9),
                    _yn("q4_2", "No se observan derrames de aceite ni químicos en la cubierta/plataforma.", 10),
                    _yn("q4_3", "El agua de producción se procesa según los límites de OIW permitidos.", 8),
                    _yn("q4_4", "Los residuos sólidos peligrosos están en contenedores etiquetados y cerrados.", 7),
                    _yn("q4_5", "El kit de respuesta a derrames está completo y accesible.", 8),
                ],
            },
            {
                "id": "s5",
                "title": "5. Preparación para Emergencias",
                "order": 5,
                "questions": [
                    _yn("q5_1", "El muster list del turno está actualizado con el headcount correcto.", 9),
                    _yn("q5_2", "Los botes/balsas salvavidas están listos para uso inmediato.", 10),
                    _yn("q5_3", "Los trajes de inmersión (immersion suits) están accesibles y en buen estado.", 8),
                    _yn("q5_4", "El sistema de radio y comunicaciones con tierra funciona correctamente.", 9),
                    _yn("q5_5", "Las cartas de evacuación (muster station) están visibles en camarotes y áreas comunes.", 7),
                    _txt("q5_obs", "Observaciones del turno, incidentes menores y estado general de la plataforma"),
                    _sig("q5_oim", "Firma OIM / Jefe de Turno (Pusher)"),
                ],
            },
        ],
        "scoring_config": {**STD_SCORING, "pass_threshold": 90},
    },
    "scoring_config": {**STD_SCORING, "pass_threshold": 90},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 12 — Auditoría de Integridad de Tuberías
# ═════════════════════════════════════════════════════════════

T12 = {
    "name": "Auditoría de Gestión de Integridad de Tuberías",
    "slug": "auditoria-integridad-tuberias",
    "description": (
        "Auditoría del programa de gestión de integridad de tuberías según ASME B31.8S "
        "y API 1160. Evalúa el estado de los programas de inspección, documentación, "
        "tratamiento de riesgos, monitoreo de corrosión y respuesta a emergencias en "
        "sistemas de tuberías de hidrocarburos."
    ),
    "short_description": "Auditoría del programa de integridad de tuberías (ASME B31.8S / API 1160).",
    "category": "oil_and_gas",
    "industry": "Oil & Gas — Midstream",
    "standards": ["ASME B31.8S", "API 1160", "API 570", "NACE SP0169"],
    "tags": ["tuberías", "integridad", "corrosión", "pipeline", "API", "ASME", "inspection"],
    "language": "es",
    "version": "1.5.0",
    "is_featured": False,
    "estimated_duration_minutes": 60,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Documentación e Identificación de Amenazas",
                "order": 1,
                "questions": [
                    _yn("q1_1", "El registro de tuberías (piping register) está actualizado con todos los segmentos.", 8),
                    _yn("q1_2", "La evaluación de amenazas (corrosión, fatiga, daño externo, SCC) está al día.", 9),
                    _yn("q1_3", "Los planos isométricos y P&IDs están actualizados.", 7),
                    _yn("q1_4", "Las fichas de inspección de cada línea están completas y accesibles.", 7),
                    _yn("q1_5", "Los registros históricos de espesores están disponibles para análisis de tendencias.", 8),
                ],
            },
            {
                "id": "s2",
                "title": "2. Monitoreo de Corrosión e Inspección",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Las cupones de corrosión son instalados y analizados según el programa.", 8),
                    _yn("q2_2", "Las inspecciones de ultrasonido (UT) se realizan según el plan de inspección basado en riesgo (RBI).", 9),
                    _yn("q2_3", "La inyección de inhibidores de corrosión sigue la dosificación calculada.", 8),
                    _yn("q2_4", "Los tramos CUI (Corrosión Bajo Aislamiento) de alta criticidad están inspeccionados.", 8),
                    _yn("q2_5", "Los registros de pigging (limpieza / smart pig) están al día.", 7),
                    _num("q2_espesor_min", "Espesor mínimo medido en última inspección", "mm"),
                    _num("q2_espesor_req", "Espesor mínimo requerido (t_min calculado)", "mm"),
                ],
            },
            {
                "id": "s3",
                "title": "3. Protección Catódica",
                "order": 3,
                "questions": [
                    _yn("q3_1", "El potencial de protección catódica (CP) está en el rango –0.85V a –1.2V (CSE).", 9),
                    _yn("q3_2", "Los registros de potencial de CP muestran tendencia estable o positiva.", 8),
                    _yn("q3_3", "Las estaciones de medición de potencial están accesibles y señalizadas.", 6),
                    _yn("q3_4", "Los ánodos de sacrificio están inspeccionados y reemplazados según programa.", 7),
                    _num("q3_cp_actual", "Potencial CP promedio medido hoy", "mV CSE"),
                ],
            },
            {
                "id": "s4",
                "title": "4. Respuesta a Emergencias y Reparaciones",
                "order": 4,
                "questions": [
                    _yn("q4_1", "El procedimiento de respuesta a fuga/ruptura está documentado y accesible.", 9),
                    _yn("q4_2", "El equipo de respuesta a emergencias está entrenado y realiza simulacros periódicos.", 8),
                    _yn("q4_3", "Los materiales de reparación (clamps, epoxy, parches) están inventariados.", 7),
                    _yn("q4_4", "El sistema de cierre de emergencia (ESD/ESDV) ha sido probado en el período.", 9),
                    _yn("q4_5", "Las reparaciones temporales tienen fecha de cierre definitivo asignada.", 7),
                    _txt("q4_obs", "Hallazgos de auditoría, acciones correctivas y responsables"),
                    _sig("q4_auditor", "Firma del Auditor de Integridad"),
                    _sig("q4_ingeniero", "Firma del Ingeniero de Integridad"),
                ],
            },
        ],
        "scoring_config": STD_SCORING,
    },
    "scoring_config": STD_SCORING,
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 13 — Checklist de Operaciones de Perforación
# ═════════════════════════════════════════════════════════════

T13 = {
    "name": "Checklist de Operaciones de Perforación",
    "slug": "checklist-operaciones-perforacion",
    "description": (
        "Verificación de seguridad para operaciones diarias de perforación de pozos "
        "petrolíferos y gasíferos. Cubre integridad del equipo de perforación (rig), "
        "parámetros de lodo, control de pozo, manejo de tubería y seguridad del personal. "
        "Basado en estándares IADC, API RP 59 y API RP 64."
    ),
    "short_description": "Verificación de seguridad diaria para operaciones de perforación (IADC / API).",
    "category": "oil_and_gas",
    "industry": "Oil & Gas — Drilling",
    "standards": ["API RP 59", "API RP 64", "IADC HSE Case Guidelines", "ISO 45001:2018"],
    "tags": ["perforación", "drilling", "rig", "IADC", "API", "lodo", "pozo"],
    "language": "es",
    "version": "2.1.0",
    "is_featured": False,
    "estimated_duration_minutes": 35,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Rig Floor y Subestructura",
                "order": 1,
                "questions": [
                    _yn("q1_1", "El Kelly bushing / top drive está en buen estado y operativo.", 9),
                    _yn("q1_2", "El drawworks, freno magnético y band brake están operativos.", 9),
                    _yn("q1_3", "El piso del rig (rig floor) está limpio, libre de aceite y sin objetos sueltos.", 8),
                    _yn("q1_4", "Las líneas muertas del cable de perforación están aseguradas.", 9),
                    _yn("q1_5", "Los stabbing boards y monkey board están en buen estado.", 8),
                    _yn("q1_6", "El cathead y tongs están en buen estado y calibrados.", 8),
                ],
            },
            {
                "id": "s2",
                "title": "2. Sistema de Lodos (Mud System)",
                "order": 2,
                "questions": [
                    _yn("q2_1", "El peso del lodo (densidad) está dentro de la ventana operacional del programa.", 10),
                    _num("q2_peso_lodo", "Peso del lodo actual", "pcf"),
                    _num("q2_viscosidad", "Viscosidad Marsh (embudo)", "seg/qt"),
                    _yn("q2_2", "Los shakers y sistema de control de sólidos funcionan correctamente.", 8),
                    _yn("q2_3", "El volumen del sistema de lodo está dentro de los parámetros esperados.", 9),
                    _yn("q2_4", "El sistema de monitoreo de pit (pit level sensors) está activo y calibrado.", 10),
                    _yn("q2_5", "No se observan ganancias inesperadas en el volumen de lodo (indicador de kick).", 10),
                ],
            },
            {
                "id": "s3",
                "title": "3. Control de Pozo",
                "order": 3,
                "questions": [
                    _yn("q3_1", "El BOP stack está debidamente probado (prueba de alta y baja presión vigente).", 10),
                    _yn("q3_2", "El equipo de control de fluidos (choke & kill manifold) está operativo.", 10),
                    _yn("q3_3", "El personal de turno realizó drill de control de pozo en el último mes.", 9),
                    _yn("q3_4", "Los formwater trap y gas trap funcionan correctamente.", 8),
                    _yn("q3_5", "Las líneas de kill y choke están libres de obstrucciones.", 9),
                ],
            },
            {
                "id": "s4",
                "title": "4. Manejo de Tubería y Levantamiento",
                "order": 4,
                "questions": [
                    _yn("q4_1", "Los slips, elevadores y cuñas están en buen estado.", 8),
                    _yn("q4_2", "Las llaves hidráulicas (iron roughneck / tong) están calibradas.", 8),
                    _yn("q4_3", "El manejo de tubería (tubería de perforación, BHA) sigue el procedimiento establecido.", 8),
                    _yn("q4_4", "Las fajas y eslingas de levantamiento tienen certificación vigente.", 9),
                    _yn("q4_5", "El área debajo del carrusel/tornamesa está despejada de personal durante rotación.", 10),
                    _txt("q4_obs", "Observaciones de la guardia, incidentes o condiciones inusuales"),
                    _sig("q4_driller", "Firma del Perforador (Driller)"),
                    _sig("q4_toolpusher", "Firma del Tool Pusher"),
                ],
            },
        ],
        "scoring_config": {**STD_SCORING, "pass_threshold": 90},
    },
    "scoring_config": {**STD_SCORING, "pass_threshold": 90},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 14 — Inspección de Estaciones de Compresión
# ═════════════════════════════════════════════════════════════

T14 = {
    "name": "Inspección de Estaciones de Compresión de Gas",
    "slug": "inspeccion-estaciones-compresion-gas",
    "description": (
        "Inspección de seguridad mensual para estaciones de compresión de gas natural. "
        "Cubre los compresores reciprocantes y centrífugos, sistemas de instrumentación y "
        "control, sistemas de depuración, alivio de presión y protección contra incendios, "
        "basada en API 618, API 672 y NFPA 54."
    ),
    "short_description": "Inspección mensual de seguridad en estaciones de compresión de gas (API 618).",
    "category": "oil_and_gas",
    "industry": "Oil & Gas — Midstream",
    "standards": ["API 618", "API 672", "NFPA 54", "ISO 45001:2018"],
    "tags": ["compresión", "gas natural", "compresor", "API", "estación", "midstream"],
    "language": "es",
    "version": "1.3.0",
    "is_featured": False,
    "estimated_duration_minutes": 45,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Compresores — Inspección General",
                "order": 1,
                "questions": [
                    _yn("q1_1", "Los compresores operan dentro de los parámetros de presión y temperatura diseñados.", 9),
                    _yn("q1_2", "No se detectan vibraciones anómalas ni ruidos inusuales en los compresores.", 8),
                    _yn("q1_3", "Los niveles de aceite lubricante están correctos en todos los compresores.", 8),
                    _yn("q1_4", "Los filtros de succión están limpios y en buen estado.", 7),
                    _yn("q1_5", "Los sistemas de enfriamiento (aire o agua) están funcionando correctamente.", 8),
                    _num("q1_presion_desc", "Presión de descarga del compresor principal", "psig"),
                    _num("q1_temp_descarga", "Temperatura de descarga del compresor principal", "°C"),
                ],
            },
            {
                "id": "s2",
                "title": "2. Sistemas de Seguridad e Instrumentación",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Los dispositivos de alivio de presión (PSV) están calibrados y en servicio.", 10),
                    _yn("q2_2", "Los sistemas de cierre automático (ESD) por alta/baja presión funcionan.", 10),
                    _yn("q2_3", "Los detectores de gas fijos están calibrados (máx. 12 meses).", 9),
                    _yn("q2_4", "Las alarmas de alta temperatura, alta presión y baja lubricación están activas.", 9),
                    _yn("q2_5", "Los controles PLC/DCS muestran estados normales en todos los compresores.", 8),
                ],
            },
            {
                "id": "s3",
                "title": "3. Sistemas de Depuración y Separación",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Los separadores de entrada están libres de acumulación excesiva de líquidos.", 8),
                    _yn("q3_2", "Las trampas de líquidos (scrubbers) drenan correctamente.", 7),
                    _yn("q3_3", "No se observan fugas en las bridas, válvulas y empaquetaduras del sistema.", 9),
                    _yn("q3_4", "El sistema de venteo (flare/vent) funciona correctamente.", 8),
                ],
            },
            {
                "id": "s4",
                "title": "4. Protección Contra Incendio y Área General",
                "order": 4,
                "questions": [
                    _yn("q4_1", "Los detectores UV/IR de llama funcionan y están calibrados.", 9),
                    _yn("q4_2", "El sistema de supresión de incendio del cuarto de compresores está activo.", 9),
                    _yn("q4_3", "La ventilación del edificio de compresores es adecuada (mín. 12 cambios/hora).", 8),
                    _yn("q4_4", "Las áreas clasificadas (clase I, div 1/2) no tienen equipos no aprobados.", 9),
                    _yn("q4_5", "El cuadro de control eléctrico está limpio, cerrado y sin anomalías visibles.", 7),
                    _txt("q4_obs", "Observaciones, mantenimientos pendientes y acciones correctivas"),
                    _sig("q4_operador", "Firma del Operador de la Estación"),
                    _sig("q4_supervisor", "Firma del Supervisor de Operaciones"),
                ],
            },
        ],
        "scoring_config": STD_SCORING,
    },
    "scoring_config": STD_SCORING,
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 15 — Checklist de Respuesta a Emergencias Oil & Gas
# ═════════════════════════════════════════════════════════════

T15 = {
    "name": "Checklist de Respuesta a Emergencias Oil & Gas",
    "slug": "checklist-respuesta-emergencias-oil-gas",
    "description": (
        "Evaluación mensual de la preparación para respuesta a emergencias en instalaciones "
        "de petróleo y gas. Cubre organización de respuesta, comunicaciones, equipos de "
        "supresión de incendios, materiales de contención de derrames, evacuación médica "
        "y simulacros. Basado en API RP 75, OGP Report 456 y OSHA 1910.38."
    ),
    "short_description": "Evaluación de preparación para emergencias en instalaciones O&G (API RP 75).",
    "category": "oil_and_gas",
    "industry": "Oil & Gas — General",
    "standards": ["API RP 75", "OGP Report 456", "OSHA 29 CFR 1910.38"],
    "tags": ["emergencias", "respuesta", "oil gas", "evacuación", "derrame", "incendio"],
    "language": "es",
    "version": "1.7.0",
    "is_featured": True,
    "estimated_duration_minutes": 35,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Plan y Organización de Respuesta",
                "order": 1,
                "questions": [
                    _yn("q1_1", "El Plan de Respuesta a Emergencias (ERP) está vigente (revisado en últimos 12 meses).", 9),
                    _yn("q1_2", "El organigrama de respuesta a emergencias está publicado y actualizado.", 8),
                    _yn("q1_3", "Todo el personal conoce su rol en la respuesta a emergencias.", 9),
                    _yn("q1_4", "Se realizaron al menos 2 simulacros en los últimos 12 meses.", 8),
                    _yn("q1_5", "El último simulacro fue evaluado y las lecciones aprendidas implementadas.", 7),
                ],
            },
            {
                "id": "s2",
                "title": "2. Comunicaciones de Emergencia",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Los números de emergencia internos y externos están publicados en puntos clave.", 8),
                    _yn("q2_2", "El sistema de alarma general de emergencia fue probado este mes.", 9),
                    _yn("q2_3", "Los radios de comunicación tienen baterías cargadas y funcionan.", 9),
                    _yn("q2_4", "El sistema de comunicación satelital/backup funciona (offshore/remoto).", 8),
                    _yn("q2_5", "Se tiene acuerdo/protocolo con autoridades locales (bomberos, policía, hospital).", 7),
                ],
            },
            {
                "id": "s3",
                "title": "3. Equipos de Extinción de Incendios",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Todos los extintores portátiles tienen inspección mensual vigente.", 9),
                    _yn("q3_2", "El sistema de rociadores o diluvio fue probado según programa.", 8),
                    _yn("q3_3", "Los sistemas de espuma (AFFF) tienen stock suficiente de concentrado.", 9),
                    _yn("q3_4", "Las brigadas de incendio tienen el equipamiento completo y operativo.", 9),
                    _yn("q3_5", "Los miembros de la brigada de incendio están entrenados (certificación vigente).", 8),
                ],
            },
            {
                "id": "s4",
                "title": "4. Respuesta a Derrames",
                "order": 4,
                "questions": [
                    _yn("q4_1", "El Plan de Contingencia para Derrames de Hidrocarburo está vigente.", 9),
                    _yn("q4_2", "Los materiales de contención (barreras, absorbentes, skimmer) están disponibles.", 8),
                    _yn("q4_3", "El personal de respuesta a derrames está certificado y entrenado.", 8),
                    _yn("q4_4", "Se tiene contrato con empresa de remediación de derrames mayor.", 7),
                ],
            },
            {
                "id": "s5",
                "title": "5. Atención Médica y Evacuación",
                "order": 5,
                "questions": [
                    _yn("q5_1", "El botiquín de primeros auxilios nivel II está completo y vigente.", 8),
                    _yn("q5_2", "El desfibrilador (AED) está operativo con parches vigentes.", 9),
                    _yn("q5_3", "Al menos 2 personas por turno tienen certificación de Primeros Auxilios vigente.", 8),
                    _yn("q5_4", "El procedimiento de evacuación médica (MEDEVAC) está documentado y activo.", 9),
                    _yn("q5_5", "Se tiene acuerdo con clínica u hospital para atención de emergencias.", 8),
                    _txt("q5_obs", "Deficiencias identificadas y plan de acción con fechas"),
                    _sig("q5_hse", "Firma del Responsable de HSE"),
                    _sig("q5_gerente", "Firma del Gerente de Instalación"),
                ],
            },
        ],
        "scoring_config": {**STD_SCORING, "pass_threshold": 90},
    },
    "scoring_config": {**STD_SCORING, "pass_threshold": 90},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 16 — Inspección Pre-Turno de Maquinaria Pesada
# ═════════════════════════════════════════════════════════════

T16 = {
    "name": "Inspección Pre-Turno de Maquinaria Pesada en Minería",
    "slug": "inspeccion-preturno-maquinaria-pesada-mineria",
    "description": (
        "Inspección pre-turno para camiones mineros, cargadores frontales, excavadoras "
        "y palas de minería. Cubre sistemas estructurales, hidráulicos, frenos, neumáticos, "
        "comunicaciones y dispositivos de seguridad. Basado en reglamentos de seguridad minera "
        "y estándares de fabricantes. Equipo NO APTO no debe salir a operación."
    ),
    "short_description": "Inspección pre-turno de equipos de minería: camiones, cargadores y excavadoras.",
    "category": "mining",
    "industry": "Minería — Operaciones",
    "standards": ["ISO 45001:2018", "MSHA 30 CFR Part 56/57", "SAE J1040"],
    "tags": ["minería", "camión minero", "cargador", "pre-turno", "maquinaria pesada", "MSHA"],
    "language": "es",
    "version": "2.3.0",
    "is_featured": True,
    "estimated_duration_minutes": 25,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s0",
                "title": "Identificación del Equipo",
                "order": 0,
                "questions": [
                    _mc("q0_tipo", "Tipo de equipo", [
                        {"value": "camion_minero", "label": "Camión Minero (haul truck)"},
                        {"value": "cargador",       "label": "Cargador Frontal (wheel loader)"},
                        {"value": "excavadora",     "label": "Excavadora hidráulica"},
                        {"value": "pala",           "label": "Pala eléctrica"},
                        {"value": "perforadora",    "label": "Perforadora rotativa"},
                        {"value": "motoniveladora", "label": "Motoniveladora"},
                    ], weight=0),
                    _txt("q0_id", "ID / Número de flota del equipo"),
                    _num("q0_horometro", "Horómetro actual", "hr"),
                    _txt("q0_operador", "Nombre y número de habilitación del operador"),
                    _txt("q0_turno", "Turno (Día 06:00–18:00 / Noche 18:00–06:00)"),
                ],
            },
            {
                "id": "s1",
                "title": "1. Inspección Visual General (Walk-Around)",
                "order": 1,
                "questions": [
                    _yn("q1_1", "El chasis y estructura del equipo están sin daños visibles (fisuras, deformaciones).", 9),
                    _yn("q1_2", "No se observan fugas de aceite, hidráulico, refrigerante ni combustible.", 9),
                    _yn("q1_3", "Los neumáticos tienen presión correcta y no presentan cortes ni abultamientos.", 9),
                    _num("q1_presion_llanta_delantera", "Presión llanta delantera izquierda", "psi"),
                    _num("q1_presion_llanta_trasera", "Presión llanta trasera izquierda", "psi"),
                    _yn("q1_4", "Los pernos de rueda están completos y sin holgura visible.", 9),
                    _yn("q1_5", "Las escaleras de acceso y pasamanos están en buen estado.", 7),
                ],
            },
            {
                "id": "s2",
                "title": "2. Motor y Niveles",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Nivel de aceite de motor correcto.", 8),
                    _yn("q2_2", "Nivel de refrigerante correcto.", 7),
                    _yn("q2_3", "Nivel de aceite hidráulico correcto.", 8),
                    _yn("q2_4", "Nivel de combustible suficiente para el turno.", 7),
                    _yn("q2_5", "El motor arranca correctamente y no produce humo excesivo.", 8),
                    _yn("q2_6", "El panel de instrumentos no muestra alertas activas al encender.", 9),
                ],
            },
            {
                "id": "s3",
                "title": "3. Frenos y Dirección",
                "order": 3,
                "questions": [
                    _yn("q3_1", "El freno de servicio responde correctamente a plena carga (prueba dinámica).", 10),
                    _yn("q3_2", "El freno de estacionamiento mantiene el equipo estático en rampa.", 10),
                    _yn("q3_3", "El freno de retardo (retarder) funciona correctamente.", 9),
                    _yn("q3_4", "La dirección responde adecuadamente (sin juego excesivo en articulación).", 9),
                ],
            },
            {
                "id": "s4",
                "title": "4. Sistemas de Seguridad",
                "order": 4,
                "questions": [
                    _yn("q4_1", "La alarma de retroceso (backing alarm) funciona.", 10),
                    _yn("q4_2", "La bocina funciona correctamente.", 9),
                    _yn("q4_3", "Las luces (faros, traseras, estroboscópica) funcionan.", 8),
                    _yn("q4_4", "El extintor de cabina está cargado y con seguro.", 9),
                    _yn("q4_5", "El ROPS/FOPS está presente y sin daños.", 9),
                    _yn("q4_6", "El cinturón de seguridad funciona correctamente.", 9),
                    _yn("q4_7", "El sistema de supresión de incendio automático (si aplica) está activo.", 8),
                    _yn("q4_8", "La radio de comunicación funciona en la frecuencia del turno.", 9),
                    _mc("q4_resultado", "Resultado final de la inspección pre-turno", [
                        {"value": "apto",      "label": "✅ EQUIPO APTO — Autorizado para operar"},
                        {"value": "no_apto",   "label": "🚫 EQUIPO NO APTO — Fuera de Servicio (reporte inmediato)"},
                        {"value": "restric",   "label": "⚠️ APTO CON RESTRICCIÓN — especificar en observaciones"},
                    ], weight=0),
                    _txt("q4_defectos", "Defectos encontrados y acciones tomadas"),
                    _sig("q4_operador", "Firma del Operador"),
                    _sig("q4_supervisor", "Firma del Supervisor de Turno"),
                ],
            },
        ],
        "scoring_config": {**STD_SCORING, "pass_threshold": 90},
    },
    "scoring_config": {**STD_SCORING, "pass_threshold": 90},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 17 — Checklist de Voladura Controlada
# ═════════════════════════════════════════════════════════════

T17 = {
    "name": "Checklist de Voladura Controlada",
    "slug": "checklist-voladura-controlada",
    "description": (
        "Procedimiento de verificación para operaciones de voladura (blast) en minería "
        "a cielo abierto y subterránea. Cubre diseño de la malla, cargue de explosivos, "
        "evacuación del área, iniciación y post-detonación. Basado en regulaciones MSHA "
        "30 CFR Part 56/57 y normativa nacional de explosivos."
    ),
    "short_description": "Verificación de seguridad para operaciones de voladura en minería.",
    "category": "mining",
    "industry": "Minería — Operaciones",
    "standards": ["MSHA 30 CFR Part 56", "ISEE Blasters Handbook", "ISO 45001:2018"],
    "tags": ["voladura", "explosivos", "blast", "minería", "MSHA", "ANFO", "detonación"],
    "language": "es",
    "version": "2.0.0",
    "is_featured": True,
    "estimated_duration_minutes": 40,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Diseño y Preparación de la Malla",
                "order": 1,
                "questions": [
                    _yn("q1_1", "El diseño de la malla de perforación fue aprobado por el ingeniero a cargo.", 9),
                    _yn("q1_2", "Los taladros están perforados según los diámetros, inclinación y espaciamiento del diseño.", 8),
                    _yn("q1_3", "La cantidad y tipo de explosivo calculado coincide con el diseño aprobado.", 9),
                    _yn("q1_4", "Las condiciones geológicas del banco son consistentes con el diseño de voladura.", 8),
                    _yn("q1_5", "Se tiene el permiso/autorización de voladura emitido por la autoridad competente.", 10),
                    _txt("q1_diseñador", "Nombre del Ingeniero de Voladura responsable del diseño"),
                ],
            },
            {
                "id": "s2",
                "title": "2. Cargue y Conexionado de Explosivos",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Sólo personal autorizado (artillero certificado) participa en el cargue.", 10),
                    _yn("q2_2", "Los explosivos son del tipo y lote especificados en el diseño.", 9),
                    _yn("q2_3", "Los detonadores no tienen signos de daño o humedad.", 9),
                    _yn("q2_4", "El taladro fue limpiado/soplado antes del cargue.", 7),
                    _yn("q2_5", "No hay presencia de agua en los taladros (o se usó explosivo resistente a agua).", 8),
                    _yn("q2_6", "La amarración (stemming) fue colocada a la longitud especificada.", 8),
                    _yn("q2_7", "El conexionado (amarre de línea de tiro) fue revisado por el artillero jefe.", 10),
                ],
            },
            {
                "id": "s3",
                "title": "3. Evacuación y Zona de Exclusión",
                "order": 3,
                "questions": [
                    _yn("q3_1", "El radio de exclusión fue establecido según cálculo (mín. 500 m para ANFO abierto).", 10),
                    _yn("q3_2", "Toda la maquinaria y personal fueron evacuados del área de exclusión.", 10),
                    _yn("q3_3", "Las vías de acceso al área de voladura están bloqueadas con vigías.", 10),
                    _yn("q3_4", "Se realizó la señal acústica de alerta de voladura (sirenas) según protocolo.", 9),
                    _yn("q3_5", "Se notificó a vialidad, instalaciones vecinas y aviación (si aplica).", 8),
                    _yn("q3_6", "El headcount del área fue confirmado: TODOS fuera de la zona.", 10),
                ],
            },
            {
                "id": "s4",
                "title": "4. Iniciación y Post-Detonación",
                "order": 4,
                "questions": [
                    _yn("q4_1", "La iniciación fue realizada por el artillero jefe desde posición segura.", 10),
                    _yn("q4_2", "Se confirmó la detonación total de todos los taladros cargados.", 10),
                    _yn("q4_3", "El tiempo de espera post-detonación fue respetado (mín. 30 min para gases).", 9),
                    _yn("q4_4", "La inspección post-voladura fue realizada por el artillero antes de reingreso.", 10),
                    _yn("q4_5", "No se identificaron taladros fallidos (misfires) o explosivos sin detonar.", 10),
                    _yn("q4_6", "En caso de misfire, se siguió el procedimiento de tratamiento de fallidos.", 10),
                    _yn("q4_7", "El área fue declarada segura para reingreso y se liberó.", 9),
                    _txt("q4_obs", "Observaciones de la operación, incidentes y cantidad de taladros"),
                    _sig("q4_artillero", "Firma del Artillero Jefe"),
                    _sig("q4_supervisor", "Firma del Supervisor de Mina"),
                ],
            },
        ],
        "scoring_config": {**STD_SCORING, "pass_threshold": 95},
    },
    "scoring_config": {**STD_SCORING, "pass_threshold": 95},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 18 — Auditoría de Estabilidad de Taludes
# ═════════════════════════════════════════════════════════════

T18 = {
    "name": "Auditoría de Estabilidad de Taludes",
    "slug": "auditoria-estabilidad-taludes",
    "description": (
        "Inspección mensual de la estabilidad geotécnica de taludes en minas a cielo abierto. "
        "Evalúa indicadores visuales de inestabilidad, sistemas de monitoreo, condiciones de "
        "agua subterránea, geometría del talud y estado de bermas. Realizada por geotécnico "
        "competente o persona calificada en estabilidad de taludes."
    ),
    "short_description": "Inspección mensual de estabilidad geotécnica de taludes en minería.",
    "category": "mining",
    "industry": "Minería — Geotecnia",
    "standards": ["ISO 45001:2018", "MSHA 30 CFR Part 56", "ISRM Guidelines"],
    "tags": ["taludes", "geotecnia", "estabilidad", "minería", "roca", "monitoreo", "deslizamiento"],
    "language": "es",
    "version": "1.4.0",
    "is_featured": False,
    "estimated_duration_minutes": 50,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Inspección Visual del Talud",
                "order": 1,
                "questions": [
                    _yn("q1_1", "No se observan grietas de tensión en la corona del talud.", 10),
                    _yn("q1_2", "No hay signos de desplazamiento o subsidencia en bermas y bancos.", 10),
                    _yn("q1_3", "No se observan escurrimientos de agua o filtraciones inusuales en el talud.", 9),
                    _yn("q1_4", "La geometría del talud (ángulo, bermas) está dentro del diseño geotécnico.", 9),
                    _yn("q1_5", "Las bermas de seguridad tienen ancho mínimo de ½ la altura del banco.", 9),
                    _yn("q1_6", "El drenaje superficial del talud está funcionando correctamente.", 8),
                    _photo("q1_foto", "Fotografía general del talud inspeccionado"),
                ],
            },
            {
                "id": "s2",
                "title": "2. Monitoreo Instrumental",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Los prismas de monitoreo están en buen estado y con lecturas recientes.", 9),
                    _yn("q2_2", "Las lecturas de desplazamiento están dentro de los umbrales de alerta.", 10),
                    _yn("q2_3", "Los piezómetros registran niveles freáticos dentro de los parámetros de diseño.", 9),
                    _yn("q2_4", "El sistema de radar de monitoreo (si existe) está operativo.", 8),
                    _num("q2_desplaz_max", "Desplazamiento máximo registrado en período", "mm"),
                    _num("q2_nivel_freatico", "Nivel freático máximo medido en piezómetros", "msnm"),
                ],
            },
            {
                "id": "s3",
                "title": "3. Drenaje y Control de Aguas",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Los pozos de drenaje (dewatering wells) están operativos y bombeando.", 8),
                    _yn("q3_2", "Las zanjas de coronación para desvío de aguas están limpias y funcionando.", 8),
                    _yn("q3_3", "No se observan acumulaciones de agua en bancos o bermas del talud.", 9),
                    _yn("q3_4", "El sistema de drenaje subhorizontal (drenes californianos) está operativo.", 7),
                ],
            },
            {
                "id": "s4",
                "title": "4. Plan de Acción y Clasificación del Riesgo",
                "order": 4,
                "questions": [
                    _mc("q4_nivel_riesgo", "Nivel de riesgo geotécnico actual del talud", [
                        {"value": "bajo",    "label": "🟢 BAJO — Condiciones estables, sin anomalías"},
                        {"value": "medio",   "label": "🟡 MEDIO — Observar, monitoreo intensificado"},
                        {"value": "alto",    "label": "🟠 ALTO — Restricción de acceso, acción correctiva"},
                        {"value": "critico", "label": "🔴 CRÍTICO — Evacuar área, notificar gerencia"},
                    ], weight=0),
                    _yn("q4_1", "Las zonas de acceso restringido están correctamente señalizadas.", 8),
                    _yn("q4_2", "El plan de respuesta ante movimiento de talud está documentado y conocido.", 9),
                    _txt("q4_recom", "Recomendaciones del geotécnico y acciones correctivas propuestas"),
                    _sig("q4_geotecnico", "Firma del Geotécnico / Inspector Calificado"),
                    _sig("q4_jefe_mina", "Firma del Jefe de Mina"),
                ],
            },
        ],
        "scoring_config": {**STD_SCORING, "pass_threshold": 85},
    },
    "scoring_config": {**STD_SCORING, "pass_threshold": 85},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 19 — Inspección de Ventilación en Mina Subterránea
# ═════════════════════════════════════════════════════════════

T19 = {
    "name": "Inspección de Ventilación en Mina Subterránea",
    "slug": "inspeccion-ventilacion-mina-subterranea",
    "description": (
        "Inspección semanal del sistema de ventilación en minería subterránea. "
        "Verifica el flujo de aire en frentes y galerías, funcionamiento de ventiladores "
        "principales y auxiliares, calidad del aire (gases, polvo), puertas de ventilación "
        "y actuación en caso de emergencia. Según MSHA 30 CFR Part 57 y normas nacionales."
    ),
    "short_description": "Inspección semanal de ventilación en minas subterráneas (MSHA 30 CFR 57).",
    "category": "mining",
    "industry": "Minería — Subterránea",
    "standards": ["MSHA 30 CFR Part 57", "ISO 45001:2018"],
    "tags": ["ventilación", "mina subterránea", "gases", "aire", "MSHA", "calidad del aire"],
    "language": "es",
    "version": "1.6.0",
    "is_featured": False,
    "estimated_duration_minutes": 40,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Ventiladores Principales y Auxiliares",
                "order": 1,
                "questions": [
                    _yn("q1_1", "El ventilador principal está operativo a la velocidad/caudal especificado.", 10),
                    _yn("q1_2", "Los ventiladores auxiliares en los frentes activos están funcionando.", 10),
                    _num("q1_caudal_principal", "Caudal medido en ventilador principal", "m³/s"),
                    _yn("q1_3", "Las mangas de ventilación (ductos flexibles) no tienen roturas ni acodamientos.", 8),
                    _yn("q1_4", "La distancia entre la manga y el frente de trabajo es ≤ 10 m.", 9),
                    _yn("q1_5", "El ventilador de emergencia (backup) está operativo.", 9),
                ],
            },
            {
                "id": "s2",
                "title": "2. Calidad del Aire — Medición de Gases",
                "order": 2,
                "questions": [
                    _yn("q2_1", "El O₂ en los frentes activos está en rango 19.5%–23.5%.", 10),
                    _num("q2_o2", "% O₂ medido en el frente más alejado", "%"),
                    _num("q2_co", "CO medido (máx. permitido: 25 ppm)", "ppm"),
                    _num("q2_no2", "NO₂ medido (máx. permitido: 1 ppm)", "ppm"),
                    _num("q2_h2s", "H₂S medido (máx. permitido: 1 ppm)", "ppm"),
                    _num("q2_ch4", "CH₄ medido (máx. permitido: 1% = 10,000 ppm)", "ppm"),
                    _yn("q2_2", "Todos los valores de gases están DENTRO de los límites permisibles.", 10),
                    _yn("q2_3", "Las mediciones son realizadas con instrumento calibrado y certificado.", 9),
                ],
            },
            {
                "id": "s3",
                "title": "3. Control del Polvo",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Los sistemas de supresión de polvo en frentes activos están operativos.", 8),
                    _yn("q3_2", "El contenido de polvo en el aire está por debajo del TLV-TWA correspondiente.", 9),
                    _yn("q3_3", "Las perforadoras tienen sistema de perforación húmeda activo.", 8),
                    _yn("q3_4", "El sellado de roca con escoria o mortero reduce la generación de polvo.", 6),
                ],
            },
            {
                "id": "s4",
                "title": "4. Puertas y Reguladores de Ventilación",
                "order": 4,
                "questions": [
                    _yn("q4_1", "Todas las puertas de ventilación cierran herméticamente.", 9),
                    _yn("q4_2", "Los reguladores de flujo de aire están en la posición correcta.", 8),
                    _yn("q4_3", "El circuito de ventilación está libre de obstrucciones (caídas de roca, equipo mal estacionado).", 9),
                    _yn("q4_4", "El mapa de ventilación actualizado está disponible en la guardia de mina.", 7),
                    _txt("q4_obs", "Observaciones, frentes con mala ventilación y acciones correctivas"),
                    _sig("q4_ventilador", "Firma del Ingeniero/Técnico de Ventilación"),
                    _sig("q4_jefe_turno", "Firma del Jefe de Turno Subterráneo"),
                ],
            },
        ],
        "scoring_config": {**STD_SCORING, "pass_threshold": 90},
    },
    "scoring_config": {**STD_SCORING, "pass_threshold": 90},
}


# ─────────────────────────────────────────────────────────────
# Export
# ─────────────────────────────────────────────────────────────
OIL_GAS_TEMPLATES = [T11, T12, T13, T14, T15]
MINING_TEMPLATES  = [T16, T17, T18, T19]
