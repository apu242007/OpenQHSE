"""Construction (20–22) and Environment (23–25) templates."""

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
# TEMPLATE 20 — Inspección Semanal de Obra (OSHA 1926)
# ═════════════════════════════════════════════════════════════

T20 = {
    "name": "Inspección Semanal de Obra",
    "slug": "inspeccion-semanal-obra",
    "description": (
        "Inspección semanal de seguridad para obras de construcción civil, industrial y "
        "de infraestructura, basada en OSHA 1926 y normas ANSI. Cubre condiciones generales "
        "de la obra, trabajos en altura, excavaciones, equipos de levantamiento, instalaciones "
        "eléctricas provisionales, EPP y orden y limpieza."
    ),
    "short_description": "Inspección semanal de seguridad para obras de construcción (OSHA 1926).",
    "category": "construction",
    "industry": "Construcción",
    "standards": ["OSHA 1926", "ANSI A10", "ISO 45001:2018"],
    "tags": ["construcción", "obra", "OSHA 1926", "inspección semanal", "andamio", "excavación"],
    "language": "es",
    "version": "2.0.0",
    "is_featured": True,
    "estimated_duration_minutes": 45,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Condiciones Generales de la Obra",
                "order": 1,
                "questions": [
                    _yn("q1_1", "El acceso y egreso a la obra está controlado con vigilancia o cerco perimetral.", 7),
                    _yn("q1_2", "La señalización de obra (velocidad, prohibición, EPP) está completa.", 7),
                    _yn("q1_3", "Los materiales de construcción están apilados de forma segura y ordenada.", 7),
                    _yn("q1_4", "No hay acumulación de escombros en las zonas de tránsito.", 7),
                    _yn("q1_5", "Las instalaciones provisionales (bodegas, baños, vestuarios) son adecuadas.", 5),
                    _yn("q1_6", "El personal usa el EPP mínimo obligatorio en toda la obra (casco, lentes, chaleco, calzado).", 9),
                ],
            },
            {
                "id": "s2",
                "title": "2. Trabajos en Altura y Andamios",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Los andamios fueron inspeccionados por persona competente antes del turno.", 9),
                    _yn("q2_2", "Las plataformas de trabajo tienen barandas a 1.0 m y rodapié de 10 cm.", 9),
                    _yn("q2_3", "Los trabajadores en altura usan arnés con doble eslinga anclado a punto certificado.", 9),
                    _yn("q2_4", "Las aberturas en pisos/losas están cubiertas o tienen barandas.", 9),
                    _yn("q2_5", "Los bordes de losas y terrazas sin cerrar tienen protección perimetral.", 9),
                    _yn("q2_6", "El área inferior a los trabajos en altura está delimitada.", 8),
                ],
            },
            {
                "id": "s3",
                "title": "3. Excavaciones y Zanjas",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Las excavaciones >1.5 m tienen entibado, taludes adecuados o cajones de protección.", 10),
                    _yn("q3_2", "Los bordes de excavaciones tienen barreras a mín. 60 cm del borde.", 9),
                    _yn("q3_3", "El acceso a zanjas profundas es mediante escalera asegurada.", 8),
                    _yn("q3_4", "No hay maquinaria o material pesado dentro de la zona de influencia de la excavación.", 9),
                    _yn("q3_5", "Se verificó la ausencia de servicios subterráneos antes de excavar.", 9),
                ],
            },
            {
                "id": "s4",
                "title": "4. Grúas, Izajes y Equipos Pesados",
                "order": 4,
                "questions": [
                    _yn("q4_1", "El operador de grúa tiene licencia vigente y específica para el equipo.", 10),
                    _yn("q4_2", "Las eslingas, grilletes y aparejos tienen certificación vigente.", 9),
                    _yn("q4_3", "No se ejecutan izajes sobre personal (zona de exclusión bajo la carga).", 10),
                    _yn("q4_4", "El rigger/señalero es la única persona autorizada para dar señales al operador.", 9),
                    _yn("q4_5", "Los equipos pesados en movimiento tienen alarm de retroceso y señalero.", 9),
                ],
            },
            {
                "id": "s5",
                "title": "5. Instalaciones Eléctricas Provisionales",
                "order": 5,
                "questions": [
                    _yn("q5_1", "Los tableros eléctricos provisionales tienen GFCI/DDFT en todos los circuitos.", 9),
                    _yn("q5_2", "Los cables no están tendidos en el suelo o en zonas de tránsito vehicular.", 8),
                    _yn("q5_3", "Los empalmes eléctricos están correctamente aislados y protegidos.", 8),
                    _yn("q5_4", "Las herramientas eléctricas tienen doble aislamiento o están aterrizadas.", 8),
                    _yn("q5_5", "Los tableros están bloqueados para evitar acceso no autorizado.", 7),
                    _txt("q5_obs", "Observaciones generales, accidentes/cuasi-accidentes del período y plan de acción"),
                    _num("q5_trabajadores", "Total de trabajadores en obra durante la inspección", "personas"),
                    _sig("q5_residente", "Firma del Residente de Seguridad"),
                    _sig("q5_jefe_obra", "Firma del Jefe de Obra"),
                ],
            },
        ],
        "scoring_config": {**STD, "pass_threshold": 80},
    },
    "scoring_config": {**STD, "pass_threshold": 80},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 21 — Checklist de Izaje con Grúa
# ═════════════════════════════════════════════════════════════

T21 = {
    "name": "Checklist de Izaje con Grúa",
    "slug": "checklist-izaje-con-grua",
    "description": (
        "Verificación pre-izaje para operaciones con grúa móvil o torre. Cubre la "
        "planificación del izaje, condiciones del equipo, aparejos, comunicación y zona "
        "de seguridad. Basado en ASME B30.5 (grúas móviles) y ASME B30.3 (grúas torre). "
        "Requerido para izajes ordinarios; izajes críticos (>75% capacidad) requieren plan escrito."
    ),
    "short_description": "Verificación pre-izaje para grúas móviles y torres (ASME B30.5).",
    "category": "construction",
    "industry": "Construcción / Oil & Gas / Industria",
    "standards": ["ASME B30.5", "ASME B30.3", "OSHA 1926 Subpart CC", "ISO 45001:2018"],
    "tags": ["grúa", "izaje", "ASME B30", "rigging", "levantamiento", "aparejo"],
    "language": "es",
    "version": "1.9.0",
    "is_featured": True,
    "estimated_duration_minutes": 25,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s0",
                "title": "Datos del Izaje",
                "order": 0,
                "questions": [
                    _txt("q0_carga", "Descripción de la carga a izar"),
                    _num("q0_peso", "Peso de la carga", "kg"),
                    _txt("q0_grua", "Tipo y modelo de grúa"),
                    _num("q0_radio", "Radio de trabajo requerido", "m"),
                    _num("q0_altura", "Altura máxima de izaje", "m"),
                    _mc("q0_tipo_izaje", "Clasificación del izaje", [
                        {"value": "rutinario",    "label": "Rutinario (<75% capacidad, condiciones normales)"},
                        {"value": "no_rutinario", "label": "No rutinario (condiciones inusuales, requiere JSEA)"},
                        {"value": "critico",      "label": "Crítico (>75% capacidad o izaje en tándem — requiere plan escrito)"},
                    ], weight=0),
                ],
            },
            {
                "id": "s1",
                "title": "1. Condición de la Grúa",
                "order": 1,
                "questions": [
                    _yn("q1_1", "La grúa tiene inspección anual vigente y certificado del fabricante.", 9),
                    _yn("q1_2", "La capacidad de la carga de trabajo (carga real) es ≤ 80% de la capacidad de la grúa para ese radio.", 10),
                    _yn("q1_3", "Las tablas de carga de la grúa son visibles y accesibles al operador.", 9),
                    _yn("q1_4", "El operador tiene licencia vigente para el tipo y tonelaje de grúa.", 10),
                    _yn("q1_5", "El indicador de momento de carga (LMI) y limitadores de carga están operativos.", 9),
                    _yn("q1_6", "El terreno/superficie de apoyo es firme y nivelado; se usaron placas de apoyo si es necesario.", 9),
                    _yn("q1_7", "Los gatos estabilizadores están completamente extendidos y apoyados.", 9),
                ],
            },
            {
                "id": "s2",
                "title": "2. Aparejos y Accesorios de Izaje",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Todas las eslingas tienen placa de identificación con capacidad de carga (WLL).", 9),
                    _yn("q2_2", "Las eslingas están libres de cortes, aplastamientos, quemaduras o deformaciones.", 9),
                    _yn("q2_3", "Los grilletes son del tipo correcto y la tuerca está asegurada con pasador.", 9),
                    _yn("q2_4", "Los ganchos tienen seguro de cierre (latch) y no están deformados.", 9),
                    _yn("q2_5", "El ángulo de inclinación de eslingas es ≤ 60° respecto a la vertical (reducción de WLL).", 8),
                    _yn("q2_6", "Las aristas de la carga tienen protectores para evitar daño en eslingas.", 7),
                ],
            },
            {
                "id": "s3",
                "title": "3. Zona de Izaje y Comunicación",
                "order": 3,
                "questions": [
                    _yn("q3_1", "La zona de influencia del izaje está delimitada y sin personal no autorizado.", 10),
                    _yn("q3_2", "Se verificó la ausencia de líneas eléctricas aéreas en el radio de operación.", 10),
                    _yn("q3_3", "La velocidad del viento es inferior al límite del fabricante (generalmente <20 km/h).", 9),
                    _yn("q3_4", "El rigger/aparejador certificado fue asignado y es el único que da señales.", 9),
                    _yn("q3_5", "El sistema de comunicación (radio/señales visuales) fue acordado y probado.", 8),
                    _yn("q3_6", "Se estableció procedimiento de emergencia si el izaje falla.", 8),
                    _mc("q3_apto", "Resultado: autorización del izaje", [
                        {"value": "autorizado",   "label": "✅ AUTORIZADO — Proceder con el izaje"},
                        {"value": "no_autorizado","label": "🚫 NO AUTORIZADO — Corregir deficiencias primero"},
                    ], weight=0),
                    _txt("q3_obs", "Observaciones especiales y condiciones del izaje"),
                    _sig("q3_rigger",    "Firma del Rigger / Aparejador"),
                    _sig("q3_supervisor","Firma del Supervisor — Autoriza el izaje"),
                ],
            },
        ],
        "scoring_config": {**STD, "pass_threshold": 90},
    },
    "scoring_config": {**STD, "pass_threshold": 90},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 22 — Inspección de Instalaciones Eléctricas Temporales
# ═════════════════════════════════════════════════════════════

T22 = {
    "name": "Inspección de Instalaciones Eléctricas Temporales en Obra",
    "slug": "inspeccion-instalaciones-electricas-temporales",
    "description": (
        "Inspección quincenal de las instalaciones eléctricas temporales en obras de construcción. "
        "Cubre tableros de distribución, circuitos de protección (GFCI/DDFT), cableado, "
        "herramientas eléctricas y puesta a tierra. Basada en OSHA 29 CFR 1926 Subpart K "
        "y NEC (NFPA 70) para instalaciones temporales de construcción."
    ),
    "short_description": "Inspección quincenal de electricidad temporal en obra (OSHA 1926 Subpart K).",
    "category": "construction",
    "industry": "Construcción",
    "standards": ["OSHA 1926 Subpart K", "NFPA 70 (NEC)", "IEC 60364"],
    "tags": ["electricidad", "temporal", "GFCI", "tablero", "obra", "OSHA", "NEC"],
    "language": "es",
    "version": "1.2.0",
    "is_featured": False,
    "estimated_duration_minutes": 30,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Tableros de Distribución Temporales",
                "order": 1,
                "questions": [
                    _yn("q1_1", "Los tableros tienen caja protectora cerrada y con llave.", 8),
                    _yn("q1_2", "Todos los circuitos tienen protección GFCI/DDFT instalada.", 10),
                    _yn("q1_3", "Los breakers (interruptores) están identificados claramente.", 7),
                    _yn("q1_4", "El tablero tiene conexión a tierra verificada (resistencia ≤ 5 Ω).", 9),
                    _yn("q1_5", "El tablero no presenta quemaduras, cables sueltos ni calentamiento.", 9),
                    _yn("q1_6", "Hay espacio libre de 1 m frente al tablero.", 7),
                ],
            },
            {
                "id": "s2",
                "title": "2. Cableado y Extensiones",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Los cables están en buen estado (sin cortes, aplastamientos, pelados).", 9),
                    _yn("q2_2", "Los cables elevados sobre zonas de tránsito están a mín. 3 m de altura.", 8),
                    _yn("q2_3", "Los cables en el suelo están canalizados o protegidos contra tránsito vehicular.", 8),
                    _yn("q2_4", "Los empalmes están aislados con cinta o conectores tipo wirenuts.", 8),
                    _yn("q2_5", "No se usan extensiones como cableado permanente.", 7),
                    _yn("q2_6", "Los cables no están sobrecargados (no se 'suman' extensiones).", 8),
                ],
            },
            {
                "id": "s3",
                "title": "3. Herramientas Eléctricas y Equipos",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Las herramientas eléctricas tienen doble aislamiento o están aterrizadas.", 9),
                    _yn("q3_2", "Las herramientas no presentan daños en carcasa, cable o enchufe.", 9),
                    _yn("q3_3", "Los interruptores de herramientas funcionan correctamente.", 8),
                    _yn("q3_4", "No se usan herramientas eléctricas en condiciones de lluvia o humedad excesiva.", 9),
                    _yn("q3_5", "Las herramientas con defectos están retiradas del servicio y etiquetadas.", 9),
                    _num("q3_herr_insp", "Número de herramientas inspeccionadas", "unidades"),
                    _num("q3_herr_retiradas", "Número de herramientas retiradas por defectos", "unidades"),
                    _txt("q3_obs", "Observaciones, deficiencias y acciones correctivas con plazo"),
                    _sig("q3_electricista", "Firma del Electricista Maestro"),
                    _sig("q3_residente", "Firma del Residente de Seguridad"),
                ],
            },
        ],
        "scoring_config": {**STD, "pass_threshold": 85},
    },
    "scoring_config": {**STD, "pass_threshold": 85},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 23 — Auditoría Ambiental ISO 14001
# ═════════════════════════════════════════════════════════════

T23 = {
    "name": "Auditoría Ambiental ISO 14001",
    "slug": "auditoria-ambiental-iso-14001",
    "description": (
        "Auditoría interna del Sistema de Gestión Ambiental (SGA) conforme a ISO 14001:2015. "
        "Evalúa el contexto de la organización, liderazgo, planificación de aspectos e impactos, "
        "soporte, operación, evaluación del desempeño ambiental y mejora continua. "
        "Diseñada para auditorías internas anuales o de seguimiento trimestral."
    ),
    "short_description": "Auditoría interna del Sistema de Gestión Ambiental según ISO 14001:2015.",
    "category": "environment",
    "industry": "General / Industria",
    "standards": ["ISO 14001:2015"],
    "tags": ["ISO 14001", "medio ambiente", "SGA", "auditoría ambiental", "gestión ambiental"],
    "language": "es",
    "version": "2.0.0",
    "is_featured": True,
    "estimated_duration_minutes": 90,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Contexto y Liderazgo (Cláusulas 4 y 5)",
                "order": 1,
                "questions": [
                    _yn("q1_1", "La organización ha identificado las partes interesadas relevantes y sus requisitos ambientales.", 8),
                    _yn("q1_2", "La política ambiental está documentada, aprobada por la alta dirección y comunicada.", 9),
                    _yn("q1_3", "Los roles, responsabilidades y autoridades ambientales están definidos y comunicados.", 7),
                    _yn("q1_4", "La alta dirección demuestra compromiso activo con el SGA (revisión, recursos, liderazgo).", 8),
                ],
            },
            {
                "id": "s2",
                "title": "2. Planificación — Aspectos e Impactos (Cláusula 6)",
                "order": 2,
                "questions": [
                    _yn("q2_1", "El registro de aspectos e impactos ambientales está actualizado (máx. 1 año).", 9),
                    _yn("q2_2", "Los aspectos significativos están identificados con criterios objetivos.", 9),
                    _yn("q2_3", "Los requisitos legales ambientales aplicables están identificados y evaluados.", 9),
                    _yn("q2_4", "Los objetivos ambientales son medibles, con metas, responsables y plazo.", 8),
                    _yn("q2_5", "Los riesgos y oportunidades ambientales han sido evaluados.", 7),
                ],
            },
            {
                "id": "s3",
                "title": "3. Soporte y Operación (Cláusulas 7 y 8)",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Los recursos (personal, equipos, tecnología) son adecuados para el SGA.", 7),
                    _yn("q3_2", "El personal con impacto ambiental ha recibido capacitación específica.", 8),
                    _yn("q3_3", "Los procedimientos de control operacional están implementados para aspectos significativos.", 9),
                    _yn("q3_4", "Los procedimientos de respuesta a emergencia ambiental están documentados y probados.", 9),
                    _yn("q3_5", "Los requisitos ambientales son comunicados a proveedores y contratistas.", 7),
                ],
            },
            {
                "id": "s4",
                "title": "4. Evaluación del Desempeño y Mejora (Cláusulas 9 y 10)",
                "order": 4,
                "questions": [
                    _yn("q4_1", "Se realizan seguimientos y mediciones de los aspectos significativos.", 8),
                    _yn("q4_2", "Se evalúa el cumplimiento legal ambiental al menos 1 vez al año.", 9),
                    _yn("q4_3", "Se realizan auditorías internas del SGA según el programa establecido.", 8),
                    _yn("q4_4", "La revisión por la dirección cubre todos los requisitos de la norma.", 8),
                    _yn("q4_5", "Las no conformidades se gestionan con análisis de causa raíz y acciones correctivas.", 8),
                    _yn("q4_6", "Se puede demostrar mejora continua en el desempeño ambiental con datos.", 8),
                    _mc("q4_cumplimiento", "Nivel de cumplimiento global del SGA con ISO 14001:2015", [
                        {"value": "total",    "label": "Cumplimiento total — Certificable"},
                        {"value": "menor",    "label": "No conformidades menores — No compromete certificación"},
                        {"value": "mayor",    "label": "No conformidades mayores — Requiere acción correctiva urgente"},
                        {"value": "critico",  "label": "Incumplimiento crítico — No certificable"},
                    ], weight=0),
                    _txt("q4_hallazgos", "Hallazgos de auditoría, no conformidades y oportunidades de mejora"),
                    _sig("q4_auditor", "Firma del Auditor Interno"),
                    _sig("q4_rep_ambiental", "Firma del Representante de la Dirección para SGA"),
                ],
            },
        ],
        "scoring_config": {**STD, "pass_threshold": 80},
    },
    "scoring_config": {**STD, "pass_threshold": 80},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 24 — Inspección de Gestión de Residuos Peligrosos
# ═════════════════════════════════════════════════════════════

T24 = {
    "name": "Inspección de Gestión de Residuos Peligrosos",
    "slug": "inspeccion-gestion-residuos-peligrosos",
    "description": (
        "Inspección mensual del almacén temporal de residuos peligrosos y del programa de "
        "gestión. Cubre clasificación, etiquetado, almacenamiento, manifiestos de transporte "
        "y disposición final. Basada en EPA 40 CFR Part 264/265 (RCRA) y normativas locales. "
        "Obligatoria para instalaciones generadoras de residuos peligrosos."
    ),
    "short_description": "Inspección mensual de almacenamiento y gestión de residuos peligrosos (RCRA).",
    "category": "environment",
    "industry": "Industria / Oil & Gas / Manufactura",
    "standards": ["EPA 40 CFR 264/265", "DOT 49 CFR", "ISO 14001:2015"],
    "tags": ["residuos peligrosos", "RCRA", "almacén", "hazwaste", "manifesto", "disposición"],
    "language": "es",
    "version": "1.7.0",
    "is_featured": False,
    "estimated_duration_minutes": 35,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Almacén Temporal de Residuos Peligrosos",
                "order": 1,
                "questions": [
                    _yn("q1_1", "El almacén tiene piso impermeabilizado y dique de contención sin fugas.", 9),
                    _yn("q1_2", "La capacidad del dique de contención es ≥110% del recipiente mayor.", 9),
                    _yn("q1_3", "El almacén tiene ventilación adecuada y señalización de seguridad.", 8),
                    _yn("q1_4", "Los residuos incompatibles están segregados según su clase de riesgo.", 9),
                    _yn("q1_5", "El tiempo de almacenamiento no excede lo permitido por la regulación (90/270 días EPA).", 9),
                    _yn("q1_6", "El almacén tiene acceso controlado y solo personas autorizadas entran.", 7),
                ],
            },
            {
                "id": "s2",
                "title": "2. Etiquetado y Documentación",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Todos los recipientes tienen etiqueta de 'Residuo Peligroso' con nombre del residuo, peligros y fecha de inicio de almacenamiento.", 10),
                    _yn("q2_2", "Las etiquetas son legibles y están correctamente pegadas.", 8),
                    _yn("q2_3", "El registro de generación de residuos está al día.", 8),
                    _yn("q2_4", "Los manifiestos de transporte de residuos peligrosos están archivados.", 9),
                    _yn("q2_5", "El inventario del almacén (tipo, cantidad, contenedor) está actualizado.", 7),
                ],
            },
            {
                "id": "s3",
                "title": "3. Recipientes e Integridad",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Los recipientes están en buen estado estructural (sin golpes, corrosión ni deformaciones).", 9),
                    _yn("q3_2", "Los recipientes están cerrados herméticamente cuando no se transvasan residuos.", 9),
                    _yn("q3_3", "No hay derrames ni fugas activas en el almacén.", 10),
                    _yn("q3_4", "Los recipientes son compatibles con el residuo almacenado.", 8),
                ],
            },
            {
                "id": "s4",
                "title": "4. Disposición Final y Transportista",
                "order": 4,
                "questions": [
                    _yn("q4_1", "El transportista de residuos peligrosos está autorizado/registrado ante la autoridad ambiental.", 9),
                    _yn("q4_2", "El sitio de disposición final tiene autorización ambiental vigente.", 9),
                    _yn("q4_3", "Se tiene el certificado de disposición final del último envío de residuos.", 8),
                    _yn("q4_4", "El personal del almacén ha recibido capacitación en manejo de residuos peligrosos.", 8),
                    _num("q4_total_kg", "Cantidad total de residuos peligrosos en almacén actualmente", "kg"),
                    _txt("q4_obs", "Observaciones y acciones correctivas"),
                    _sig("q4_responsable", "Firma del Responsable de Medio Ambiente"),
                ],
            },
        ],
        "scoring_config": {**STD, "pass_threshold": 85},
    },
    "scoring_config": {**STD, "pass_threshold": 85},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 25 — Checklist de Respuesta a Derrame
# ═════════════════════════════════════════════════════════════

T25 = {
    "name": "Checklist de Respuesta a Derrame de Hidrocarburo",
    "slug": "checklist-respuesta-derrame-hidrocarburo",
    "description": (
        "Procedimiento de verificación para la respuesta inicial a derrames de hidrocarburo "
        "(petróleo, aceite, combustible). Cubre notificación, contención, limpieza, "
        "gestión de residuos contaminados y reporte. Para uso inmediato durante y después "
        "del evento de derrame por el equipo de respuesta ambiental."
    ),
    "short_description": "Verificación de respuesta a derrame de hidrocarburo para equipos de respuesta.",
    "category": "environment",
    "industry": "Oil & Gas / Industria / Minería",
    "standards": ["EPA 40 CFR Part 112", "OSHA 29 CFR 1910.120", "ISO 14001:2015"],
    "tags": ["derrame", "hidrocarburo", "respuesta ambiental", "contención", "limpieza", "SPCC"],
    "language": "es",
    "version": "1.5.0",
    "is_featured": True,
    "estimated_duration_minutes": 20,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s0",
                "title": "Información del Incidente",
                "order": 0,
                "questions": [
                    _txt("q0_fecha", "Fecha y hora del derrame"),
                    _txt("q0_ubicacion", "Ubicación exacta del derrame"),
                    _mc("q0_sustancia", "Sustancia derramada", [
                        {"value": "crudo",      "label": "Crudo / Petróleo"},
                        {"value": "combustible","label": "Combustible (diesel, gasolina)"},
                        {"value": "aceite",     "label": "Aceite lubricante"},
                        {"value": "quimico",    "label": "Producto químico"},
                        {"value": "otro",       "label": "Otro"},
                    ], weight=0),
                    _num("q0_volumen", "Volumen estimado del derrame", "litros"),
                    _txt("q0_causa", "Causa probable del derrame"),
                    _txt("q0_reporta", "Nombre de quien reporta el derrame"),
                ],
            },
            {
                "id": "s1",
                "title": "1. Notificación Inmediata (0–15 minutos)",
                "order": 1,
                "questions": [
                    _yn("q1_1", "Se notificó al supervisor y al equipo de HSE inmediatamente.", 10),
                    _yn("q1_2", "Se evaluó si el derrame requiere notificación a autoridades ambientales.", 9),
                    _yn("q1_3", "El personal del área fue evacuado si existe riesgo de incendio o toxicidad.", 9),
                    _yn("q1_4", "Se bloqueó el tráfico de personas y vehículos en la zona afectada.", 8),
                ],
            },
            {
                "id": "s2",
                "title": "2. Contención Inicial (15–60 minutos)",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Se activó la fuente del derrame (cerrar válvula, detener bomba, contener recipiente).", 10),
                    _yn("q2_2", "Se instalaron barreras absorbentes (boom, salchichas) alrededor del derrame.", 9),
                    _yn("q2_3", "Los drenajes cercanos al derrame fueron bloqueados para evitar llegada a cuerpos de agua.", 10),
                    _yn("q2_4", "La contención del derrame es efectiva (no avanza el frente del líquido).", 9),
                    _yn("q2_5", "El equipo de respuesta usa EPP adecuado (overol impermeable, guantes, botas, respirador).", 9),
                ],
            },
            {
                "id": "s3",
                "title": "3. Limpieza y Remediación",
                "order": 3,
                "questions": [
                    _yn("q3_1", "El hidrocarburo libre fue recuperado con skimmer, bombas o absorbentes específicos.", 9),
                    _yn("q3_2", "El suelo contaminado fue excavado y colocado en contenedores herméticos etiquetados.", 9),
                    _yn("q3_3", "Los materiales de limpieza contaminados son clasificados como residuo peligroso.", 9),
                    _yn("q3_4", "Se tomaron muestras del suelo/agua afectada para análisis de laboratorio.", 8),
                    _yn("q3_5", "El área fue inspeccionada visualmente al terminar — sin evidencia de contaminación residual.", 8),
                ],
            },
            {
                "id": "s4",
                "title": "4. Cierre y Reporte",
                "order": 4,
                "questions": [
                    _yn("q4_1", "El reporte interno del incidente fue completado dentro de las 24 horas.", 9),
                    _yn("q4_2", "La notificación a la autoridad ambiental fue realizada dentro del plazo legal.", 9),
                    _yn("q4_3", "Los residuos peligrosos generados fueron gestionados conforme a la normativa.", 9),
                    _yn("q4_4", "Se realizó análisis de causa raíz del derrame para prevenir recurrencia.", 8),
                    _yn("q4_5", "El Plan de Contingencia de Derrames fue actualizado si se identificaron deficiencias.", 7),
                    _num("q4_vol_recuperado", "Volumen total de hidrocarburo recuperado", "litros"),
                    _num("q4_residuos_kg", "Peso total de residuos contaminados generados", "kg"),
                    _txt("q4_obs", "Lecciones aprendidas y medidas preventivas acordadas"),
                    _sig("q4_coord_respuesta", "Firma del Coordinador de Respuesta a Emergencias"),
                    _sig("q4_gerente_hse", "Firma del Gerente de HSE"),
                ],
            },
        ],
        "scoring_config": {**STD, "pass_threshold": 85},
    },
    "scoring_config": {**STD, "pass_threshold": 85},
}


# ─────────────────────────────────────────────────────────────
# Export
# ─────────────────────────────────────────────────────────────
CONSTRUCTION_ENV_TEMPLATES = [T20, T21, T22, T23, T24, T25]
