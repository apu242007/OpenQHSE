"""Safety industry templates 1–10.

Categories: safety
Standards: ISO 45001, OSHA 1926, OSHA 29 CFR 1910
"""

# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

def _yn(qid: str, text: str, weight: int = 5, required: bool = True, note: bool = True):
    """Shorthand: yes/no question, optional note if no."""
    q = {
        "id": qid,
        "text": text,
        "type": "yes_no",
        "required": required,
        "weight": weight,
        "options": [
            {"value": "yes", "label": "Sí", "score": weight},
            {"value": "no",  "label": "No", "score": 0},
            {"value": "na",  "label": "N/A", "score": weight},
        ],
    }
    if note:
        q["conditional_logic"] = {
            "when": {"field": qid, "operator": "equals", "value": "no"},
            "then": {"show_field": f"{qid}_note"},
        }
        q["follow_up_fields"] = [
            {"id": f"{qid}_note", "type": "text", "label": "Describe la no conformidad / acción inmediata"}
        ]
    return q


def _mc(qid: str, text: str, options: list, weight: int = 5, required: bool = True):
    """Shorthand: multiple-choice question."""
    return {
        "id": qid,
        "text": text,
        "type": "multiple_choice",
        "required": required,
        "weight": weight,
        "options": options,
    }


def _txt(qid: str, text: str, required: bool = False):
    return {"id": qid, "text": text, "type": "text", "required": required, "weight": 0}


def _num(qid: str, text: str, unit: str = "", weight: int = 5, required: bool = True):
    return {
        "id": qid, "text": text, "type": "numeric",
        "required": required, "weight": weight,
        "unit": unit, "min": 0,
    }


def _photo(qid: str, text: str, required: bool = False):
    return {"id": qid, "text": text, "type": "photo", "required": required, "weight": 0}


def _sig(qid: str, text: str):
    return {"id": qid, "text": text, "type": "signature", "required": True, "weight": 0}


STANDARD_SCORING = {
    "method": "percentage",
    "pass_threshold": 80,
    "color_bands": [
        {"min": 90, "max": 100, "color": "#00E5A0", "label": "Excelente"},
        {"min": 80, "max": 89,  "color": "#66FF99", "label": "Aprobado"},
        {"min": 60, "max": 79,  "color": "#FFAA00", "label": "Observaciones"},
        {"min": 0,  "max": 59,  "color": "#FF4444", "label": "Reprobado"},
    ],
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 1 — Inspección General de Seguridad Industrial
# ═════════════════════════════════════════════════════════════

T01 = {
    "name": "Inspección General de Seguridad Industrial",
    "slug": "inspeccion-general-seguridad-industrial",
    "description": (
        "Inspección integral del lugar de trabajo basada en los requisitos de ISO 45001:2018. "
        "Evalúa condiciones generales, equipos, manejo de sustancias peligrosas, protección "
        "contra incendios y señalización. Diseñada para auditorías mensuales de HSE."
    ),
    "short_description": "Inspección mensual completa del lugar de trabajo según ISO 45001:2018.",
    "category": "safety",
    "industry": "General / Industria",
    "standards": ["ISO 45001:2018"],
    "tags": ["seguridad", "ISO 45001", "inspección mensual", "HSE", "condiciones de trabajo"],
    "language": "es",
    "version": "2.1.0",
    "is_featured": True,
    "estimated_duration_minutes": 45,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Condiciones Generales del Lugar de Trabajo",
                "order": 1,
                "questions": [
                    _yn("q1_1", "Las áreas de trabajo están libres de obstáculos y derrames.", 6),
                    _yn("q1_2", "La iluminación es adecuada para las tareas realizadas (mín. 200 lux).", 5),
                    _yn("q1_3", "La ventilación natural/mecánica es suficiente para el área.", 5),
                    _yn("q1_4", "Los pisos están en buen estado (sin grietas, desniveles o superficies resbaladizas).", 6),
                    _yn("q1_5", "Las instalaciones sanitarias están limpias y en correcto funcionamiento.", 4),
                    _num("q1_6", "Temperatura ambiente registrada", "°C", weight=0, required=False),
                    _num("q1_7", "Nivel de ruido registrado (si aplica)", "dB", weight=0, required=False),
                    _photo("q1_photo", "Fotografía del área de trabajo inspeccionada"),
                ],
            },
            {
                "id": "s2",
                "title": "2. Equipos y Maquinaria",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Los equipos y maquinarias cuentan con guardas de seguridad instaladas.", 8),
                    _yn("q2_2", "Los equipos tienen mantenimiento preventivo al día (registros visibles).", 7),
                    _yn("q2_3", "Los operadores de equipos poseen licencias/certificaciones vigentes.", 8),
                    _yn("q2_4", "Los equipos con defectos están bloqueados y etiquetados (LOTO).", 9),
                    _yn("q2_5", "Los botones de parada de emergencia son accesibles y funcionan.", 8),
                    _yn("q2_6", "Los cables eléctricos están correctamente canalizados y sin deterioro.", 7),
                ],
            },
            {
                "id": "s3",
                "title": "3. Manejo de Sustancias Peligrosas",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Las sustancias peligrosas están correctamente etiquetadas (GHS/SGA).", 8),
                    _yn("q3_2", "Las Hojas de Datos de Seguridad (HDS/MSDS) están disponibles y actualizadas.", 7),
                    _yn("q3_3", "Los recipientes de sustancias peligrosas están cerrados y en buen estado.", 7),
                    _yn("q3_4", "Los derrames potenciales tienen dique de contención adecuado.", 8),
                    _yn("q3_5", "El personal ha recibido capacitación en manejo de sustancias peligrosas.", 8),
                    _yn("q3_6", "Existe kit de respuesta a derrames disponible y completo.", 7),
                ],
            },
            {
                "id": "s4",
                "title": "4. Protección Contra Incendios",
                "order": 4,
                "questions": [
                    _yn("q4_1", "Los extintores están ubicados en lugares visibles y accesibles.", 9),
                    _yn("q4_2", "Los extintores tienen carga vigente y sello de inviolabilidad.", 9),
                    _yn("q4_3", "Las salidas de emergencia están señalizadas, desbloqueadas y funcionan.", 9),
                    _yn("q4_4", "El sistema de alarma contra incendios funciona correctamente.", 8),
                    _yn("q4_5", "Las rutas de evacuación están libres de obstáculos.", 9),
                    _yn("q4_6", "Se realizaron simulacros de evacuación en los últimos 6 meses.", 7),
                    _num("q4_7", "Número de extintores inspeccionados", "unidades"),
                ],
            },
            {
                "id": "s5",
                "title": "5. Señalización y EPP",
                "order": 5,
                "questions": [
                    _yn("q5_1", "La señalización de seguridad está completa y en buen estado.", 6),
                    _yn("q5_2", "Se señalizan correctamente las zonas de riesgo (eléctrico, caída, etc.).", 7),
                    _yn("q5_3", "El personal usa el EPP requerido para sus tareas.", 8),
                    _yn("q5_4", "El EPP está en buen estado y es el adecuado para la tarea.", 7),
                    _yn("q5_5", "Existe un registro de entrega de EPP actualizado.", 5),
                    _txt("q5_obs", "Observaciones adicionales y acciones correctivas recomendadas"),
                    _sig("q5_firma_inspector", "Firma del Inspector"),
                    _sig("q5_firma_responsable", "Firma del Responsable del Área"),
                ],
            },
        ],
        "scoring_config": {**STANDARD_SCORING, "max_score": 100},
    },
    "scoring_config": STANDARD_SCORING,
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 2 — Auditoría 5S
# ═════════════════════════════════════════════════════════════

def _5s_rating(qid: str, text: str):
    """1-5 rating question for 5S audits."""
    return {
        "id": qid,
        "text": text,
        "type": "multiple_choice",
        "required": True,
        "weight": 4,
        "options": [
            {"value": "1", "label": "1 - Muy deficiente", "score": 0},
            {"value": "2", "label": "2 - Deficiente", "score": 1},
            {"value": "3", "label": "3 - Aceptable", "score": 2},
            {"value": "4", "label": "4 - Bueno", "score": 3},
            {"value": "5", "label": "5 - Excelente", "score": 4},
        ],
    }


T02 = {
    "name": "Auditoría 5S",
    "slug": "auditoria-5s",
    "description": (
        "Auditoría completa del sistema 5S con puntuación por cada S: Seiri (Clasificar), "
        "Seiton (Ordenar), Seiso (Limpiar), Seiketsu (Estandarizar) y Shitsuke (Disciplina). "
        "Cada área se puntúa de 1 a 5, con un máximo de 100 puntos. Incluye evidencia fotográfica."
    ),
    "short_description": "Auditoría 5S completa con puntuación 1-5 por cada pilar y evidencia fotográfica.",
    "category": "safety",
    "industry": "Manufactura / Producción",
    "standards": ["5S Lean Manufacturing", "ISO 45001:2018"],
    "tags": ["5S", "lean", "orden", "limpieza", "manufactura", "mejora continua"],
    "language": "es",
    "version": "1.3.0",
    "is_featured": True,
    "estimated_duration_minutes": 30,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1ª S — Seiri (Clasificar)",
                "order": 1,
                "description": "Separar lo necesario de lo innecesario. Máx. 20 puntos.",
                "questions": [
                    _5s_rating("q1_1", "Solo los materiales necesarios para la tarea actual están en el área de trabajo."),
                    _5s_rating("q1_2", "Los elementos innecesarios han sido identificados con tarjeta roja y removidos."),
                    _5s_rating("q1_3", "Las herramientas y equipos son los apropiados para las tareas realizadas."),
                    _5s_rating("q1_4", "El inventario de materiales está al nivel mínimo necesario (sin excesos)."),
                    _5s_rating("q1_5", "No existen objetos personales o equipos obsoletos en el área productiva."),
                    _photo("q1_photo", "Foto del estado de clasificación del área"),
                ],
            },
            {
                "id": "s2",
                "title": "2ª S — Seiton (Ordenar)",
                "order": 2,
                "description": "Un lugar para cada cosa y cada cosa en su lugar. Máx. 20 puntos.",
                "questions": [
                    _5s_rating("q2_1", "Cada herramienta/material tiene un lugar asignado y claramente marcado."),
                    _5s_rating("q2_2", "Los pasillos y zonas de tránsito están delimitados con líneas en el piso."),
                    _5s_rating("q2_3", "Los materiales se almacenan de forma segura (sin riesgo de caída)."),
                    _5s_rating("q2_4", "El acceso a herramientas de uso frecuente es rápido (máx. 30 segundos)."),
                    _5s_rating("q2_5", "Existe gestión visual (etiquetas, colores, sombras de herramientas)."),
                    _photo("q2_photo", "Foto del sistema de organización del área"),
                ],
            },
            {
                "id": "s3",
                "title": "3ª S — Seiso (Limpiar)",
                "order": 3,
                "description": "Limpiar el área y equipos, identificar causas de suciedad. Máx. 20 puntos.",
                "questions": [
                    _5s_rating("q3_1", "Las superficies de trabajo, máquinas y equipos están limpios."),
                    _5s_rating("q3_2", "Los pisos están libres de aceite, polvo, virutas y desechos."),
                    _5s_rating("q3_3", "Los equipos de limpieza están disponibles, accesibles y en buen estado."),
                    _5s_rating("q3_4", "Se ha identificado y atacado la fuente de suciedad (no solo se limpia)."),
                    _5s_rating("q3_5", "Existe un programa de limpieza diaria con responsables asignados."),
                    _photo("q3_photo", "Foto del estado de limpieza general del área"),
                ],
            },
            {
                "id": "s4",
                "title": "4ª S — Seiketsu (Estandarizar)",
                "order": 4,
                "description": "Mantener y estandarizar las tres primeras S. Máx. 20 puntos.",
                "questions": [
                    _5s_rating("q4_1", "Existen procedimientos/estándares escritos para mantener las 3 primeras S."),
                    _5s_rating("q4_2", "Los estándares 5S están visualmente desplegados en el área de trabajo."),
                    _5s_rating("q4_3", "Se realizan auditorías 5S regularmente con resultados registrados."),
                    _5s_rating("q4_4", "El personal conoce los estándares y su rol en mantenerlos."),
                    _5s_rating("q4_5", "Las anomalías identificadas en auditorías anteriores han sido corregidas."),
                ],
            },
            {
                "id": "s5",
                "title": "5ª S — Shitsuke (Disciplina)",
                "order": 5,
                "description": "Convertir las 5S en hábito y cultura. Máx. 20 puntos.",
                "questions": [
                    _5s_rating("q5_1", "El personal mantiene las 5S sin necesidad de supervisión constante."),
                    _5s_rating("q5_2", "La dirección participa activamente en las auditorías 5S."),
                    _5s_rating("q5_3", "Se reconoce y recompensa el buen desempeño 5S del equipo."),
                    _5s_rating("q5_4", "El personal propone mejoras al sistema 5S activamente."),
                    _5s_rating("q5_5", "Las reuniones de equipo incluyen seguimiento del programa 5S."),
                    _txt("q5_plan", "Plan de acción para mejorar puntuación en próxima auditoría"),
                    _sig("q5_auditor", "Firma del Auditor"),
                    _sig("q5_lider", "Firma del Líder del Área"),
                ],
            },
        ],
        "scoring_config": {
            "method": "sum",
            "max_score": 100,
            "pass_threshold": 70,
            "color_bands": [
                {"min": 90, "max": 100, "color": "#00E5A0", "label": "Clase Mundial"},
                {"min": 70, "max": 89,  "color": "#66FF99", "label": "Buenas Prácticas"},
                {"min": 50, "max": 69,  "color": "#FFAA00", "label": "En Desarrollo"},
                {"min": 0,  "max": 49,  "color": "#FF4444", "label": "Inicio del Programa"},
            ],
        },
    },
    "scoring_config": {
        "method": "sum",
        "max_score": 100,
        "pass_threshold": 70,
    },
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 3 — Inspección Pre-Operacional de Equipos
# ═════════════════════════════════════════════════════════════

T03 = {
    "name": "Inspección Pre-Operacional de Equipos",
    "slug": "inspeccion-pre-operacional-equipos",
    "description": (
        "Checklist diario de inspección pre-operacional para equipos móviles e industriales. "
        "Cubre sistemas de motor, hidráulico, eléctrico, frenos y dispositivos de seguridad. "
        "Si algún punto falla, el equipo NO debe ser puesto en operación hasta su corrección."
    ),
    "short_description": "Inspección diaria pre-operacional para equipos móviles e industriales.",
    "category": "safety",
    "industry": "Minería / Construcción / Industria",
    "standards": ["ISO 45001:2018", "OSHA 29 CFR 1910"],
    "tags": ["pre-operacional", "equipos", "maquinaria", "inspección diaria", "mantenimiento"],
    "language": "es",
    "version": "1.5.0",
    "is_featured": False,
    "estimated_duration_minutes": 20,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s0",
                "title": "Datos del Equipo",
                "order": 0,
                "questions": [
                    _txt("q0_1", "Tipo y modelo del equipo"),
                    _txt("q0_2", "Número de identificación / placa / serie"),
                    _num("q0_3", "Horómetro / Kilometraje actual", "hr / km"),
                    _txt("q0_4", "Nombre del operador"),
                    _txt("q0_5", "Turno (Mañana / Tarde / Noche)"),
                ],
            },
            {
                "id": "s1",
                "title": "1. Motor y Sistema de Combustible",
                "order": 1,
                "questions": [
                    _yn("q1_1", "Nivel de aceite de motor correcto (entre marcas MIN/MAX).", 8),
                    _yn("q1_2", "Nivel de refrigerante correcto en el depósito de expansión.", 7),
                    _yn("q1_3", "Nivel de combustible suficiente para el turno completo.", 6),
                    _yn("q1_4", "No existen fugas de aceite, agua ni combustible visibles.", 9),
                    _yn("q1_5", "Correas y mangueras en buen estado (sin grietas, tensión adecuada).", 7),
                    _yn("q1_6", "El motor enciende correctamente y sin ruidos anómalos.", 8),
                ],
            },
            {
                "id": "s2",
                "title": "2. Sistema Hidráulico",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Nivel de aceite hidráulico correcto.", 7),
                    _yn("q2_2", "No existen fugas en mangueras ni cilindros hidráulicos.", 9),
                    _yn("q2_3", "Las funciones hidráulicas (levante, giro, extensión) operan correctamente.", 8),
                    _yn("q2_4", "Los accesorios hidráulicos están bien asegurados.", 7),
                ],
            },
            {
                "id": "s3",
                "title": "3. Sistema Eléctrico",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Batería en buen estado (terminales limpios, sin corrosión).", 7),
                    _yn("q3_2", "Luces delanteras, traseras y de trabajo funcionan.", 7),
                    _yn("q3_3", "Alarma de retroceso funciona.", 9),
                    _yn("q3_4", "Bocina operativa.", 8),
                    _yn("q3_5", "Panel de instrumentos sin alertas activas.", 8),
                    _yn("q3_6", "Sistema de comunicación (radio) operativo.", 6),
                ],
            },
            {
                "id": "s4",
                "title": "4. Sistema de Frenos y Dirección",
                "order": 4,
                "questions": [
                    _yn("q4_1", "Freno de servicio responde correctamente (prueba estática).", 10),
                    _yn("q4_2", "Freno de estacionamiento funciona y mantiene el equipo estático.", 10),
                    _yn("q4_3", "La dirección responde adecuadamente sin juego excesivo.", 8),
                    _yn("q4_4", "Neumáticos en buen estado (profundidad de rodadura, presión adecuada, sin cortes).", 8),
                    _yn("q4_5", "Pernos de rueda completos y apretados.", 9),
                ],
            },
            {
                "id": "s5",
                "title": "5. Dispositivos de Seguridad",
                "order": 5,
                "questions": [
                    _yn("q5_1", "Extintor instalado, cargado y con pin de seguridad.", 10),
                    _yn("q5_2", "Cinturón de seguridad en buen estado.", 9),
                    _yn("q5_3", "ROPS/FOPS (estructura de protección) presente y sin daños visibles.", 9),
                    _yn("q5_4", "Espejos retrovisores presentes y en buen estado.", 7),
                    _yn("q5_5", "Escaleras de acceso y pasamanos en buen estado.", 7),
                    _yn("q5_6", "Cabina limpia, sin objetos sueltos que puedan interferir con los controles.", 7),
                    {
                        "id": "q5_apto",
                        "text": "Resultado final de la inspección",
                        "type": "multiple_choice",
                        "required": True,
                        "weight": 0,
                        "options": [
                            {"value": "apto", "label": "✅ EQUIPO APTO PARA OPERAR", "score": 0},
                            {"value": "no_apto", "label": "🚫 EQUIPO NO APTO — Fuera de Servicio", "score": 0},
                            {"value": "condicionado", "label": "⚠️ APTO CON RESTRICCIONES", "score": 0},
                        ],
                    },
                    _txt("q5_obs", "Observaciones, defectos encontrados y acciones tomadas"),
                    _sig("q5_operador", "Firma del Operador"),
                    _sig("q5_supervisor", "Firma del Supervisor"),
                ],
            },
        ],
        "scoring_config": {**STANDARD_SCORING, "pass_threshold": 90},
    },
    "scoring_config": {**STANDARD_SCORING, "pass_threshold": 90},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 4 — Checklist de Trabajo en Altura (OSHA 1926)
# ═════════════════════════════════════════════════════════════

T04 = {
    "name": "Checklist de Trabajo en Altura",
    "slug": "checklist-trabajo-en-altura-osha",
    "description": (
        "Checklist de verificación para trabajos en altura superiores a 1.8 m (6 ft), "
        "basado en OSHA 1926 Subpart M y normas ANSI Z359. Cubre evaluación de riesgos, "
        "EPP anticaídas, sistemas de andamios, líneas de vida y condiciones ambientales. "
        "Requerido como parte del Permiso de Trabajo en Altura."
    ),
    "short_description": "Verificación pre-trabajo para alturas >1.8 m según OSHA 1926 Subpart M.",
    "category": "safety",
    "industry": "Construcción / Industria",
    "standards": ["OSHA 1926 Subpart M", "ANSI Z359", "ISO 45001:2018"],
    "tags": ["trabajo en altura", "OSHA 1926", "anticaídas", "andamios", "permiso de trabajo"],
    "language": "es",
    "version": "2.0.0",
    "is_featured": True,
    "estimated_duration_minutes": 25,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s0",
                "title": "Datos del Trabajo",
                "order": 0,
                "questions": [
                    _txt("q0_1", "Descripción del trabajo a realizar"),
                    _txt("q0_2", "Ubicación exacta (estructura/nivel/área)"),
                    _num("q0_3", "Altura máxima de trabajo", "m"),
                    _txt("q0_4", "Nombre del trabajador autorizado"),
                    _txt("q0_5", "Nombre del supervisor de la tarea"),
                ],
            },
            {
                "id": "s1",
                "title": "1. Evaluación del Riesgo y Autorización",
                "order": 1,
                "questions": [
                    _yn("q1_1", "Se ha realizado la evaluación de riesgos específica para esta tarea.", 9),
                    _yn("q1_2", "El permiso de trabajo en altura está emitido y firmado.", 10),
                    _yn("q1_3", "El área inferior está delimitada con barreras y señalización.", 9),
                    _yn("q1_4", "El personal ha recibido briefing de seguridad previo a la tarea.", 8),
                    _yn("q1_5", "Se ha designado un observador/vigía en tierra.", 8),
                    _mc("q1_6", "Condición meteorológica actual", [
                        {"value": "favorable", "label": "✅ Favorable (sin viento fuerte, sin lluvia)", "score": 5},
                        {"value": "alerta",     "label": "⚠️ Condición de Alerta (viento moderado)", "score": 2},
                        {"value": "prohibido",  "label": "🚫 Prohibido (viento >12 m/s, lluvia, tormenta)", "score": 0},
                    ], weight=5),
                ],
            },
            {
                "id": "s2",
                "title": "2. Equipo de Protección Anticaídas",
                "order": 2,
                "questions": [
                    _yn("q2_1", "El arnés de cuerpo completo es tipo D-ring dorsal, talla correcta.", 9),
                    _yn("q2_2", "El arnés está en buen estado (sin cortes, costuras deshilachadas, deformaciones).", 10),
                    _yn("q2_3", "El arnés no ha sido sometido a una caída (verificar etiqueta de historial).", 10),
                    _yn("q2_4", "El absorvedor de impacto/eslinga está en buen estado y es compatible.", 9),
                    _yn("q2_5", "El punto de anclaje soporta mín. 5,000 lb (22.2 kN) por trabajador.", 10),
                    _yn("q2_6", "La longitud libre de caída es menor a 1.8 m considerando el absorvedor.", 9),
                    _yn("q2_7", "El conector (mosquetón/gancho) tiene cierre de doble seguro.", 9),
                ],
            },
            {
                "id": "s3",
                "title": "3. Sistema de Acceso (Andamio / Escalera)",
                "order": 3,
                "questions": [
                    _mc("q3_tipo", "Tipo de sistema de acceso utilizado", [
                        {"value": "andamio", "label": "Andamio tubular"},
                        {"value": "escalera", "label": "Escalera portátil"},
                        {"value": "plataforma", "label": "Plataforma elevadora (MEWP)"},
                        {"value": "cuerda", "label": "Acceso por cuerda"},
                    ], weight=0),
                    _yn("q3_1", "La estructura de acceso fue inspeccionada por persona competente.", 9),
                    _yn("q3_2", "La plataforma de trabajo tiene barandas a 1.0 m y travesaño intermedio.", 8),
                    _yn("q3_3", "El rodapié (guarda-pie) de 10 cm está instalado en todos los lados.", 7),
                    _yn("q3_4", "La carga máxima permitida no ha sido superada.", 9),
                    _yn("q3_5", "Las bases/pies del andamio están sobre superficie firme y nivelada.", 8),
                ],
            },
            {
                "id": "s4",
                "title": "4. Herramientas y Materiales en Altura",
                "order": 4,
                "questions": [
                    _yn("q4_1", "Las herramientas manuales tienen sistema anticaídas (cuerda de seguridad).", 8),
                    _yn("q4_2", "Los materiales están asegurados para evitar caída de objetos.", 9),
                    _yn("q4_3", "Se utiliza bolsa porta-herramientas para transporte vertical.", 7),
                    _yn("q4_4", "Se ha establecido zona de exclusión bajo el área de trabajo.", 9),
                    _txt("q4_obs", "Observaciones sobre herramientas y materiales"),
                    _sig("q4_trabajador", "Firma del Trabajador (acepta condiciones)"),
                    _sig("q4_supervisor", "Firma del Supervisor (autoriza inicio)"),
                ],
            },
        ],
        "scoring_config": {**STANDARD_SCORING, "pass_threshold": 90},
    },
    "scoring_config": {**STANDARD_SCORING, "pass_threshold": 90},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 5 — Inspección de Espacio Confinado
# ═════════════════════════════════════════════════════════════

T05 = {
    "name": "Inspección de Espacio Confinado",
    "slug": "inspeccion-espacio-confinado",
    "description": (
        "Checklist de verificación para entrada a espacios confinados según OSHA 29 CFR 1910.146 "
        "y normas ANSI Z117.1. Incluye evaluación atmosférica, permisos de entrada, equipos de "
        "rescate y comunicación. Obligatorio antes de cada entrada al espacio confinado."
    ),
    "short_description": "Verificación pre-entrada a espacios confinados según OSHA 29 CFR 1910.146.",
    "category": "safety",
    "industry": "Industria / Oil & Gas / Minería",
    "standards": ["OSHA 29 CFR 1910.146", "ANSI Z117.1", "NFPA 350"],
    "tags": ["espacio confinado", "OSHA", "gases", "atmósfera peligrosa", "permiso de entrada"],
    "language": "es",
    "version": "2.2.0",
    "is_featured": True,
    "estimated_duration_minutes": 30,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s0",
                "title": "Identificación del Espacio",
                "order": 0,
                "questions": [
                    _txt("q0_1", "Nombre/descripción del espacio confinado"),
                    _txt("q0_2", "Ubicación (planta / nivel / área)"),
                    _mc("q0_tipo", "Clasificación del espacio", [
                        {"value": "permitido", "label": "Espacio Confinado con Permiso Requerido (PRCS)"},
                        {"value": "no_permitido", "label": "Espacio Confinado sin Permiso (NPCS)"},
                    ], weight=0),
                    _txt("q0_trabajo", "Descripción del trabajo a realizar"),
                    _txt("q0_entrante", "Nombre del entrante autorizado"),
                    _txt("q0_vigilante", "Nombre del vigilante (attendant)"),
                    _txt("q0_supervisor", "Nombre del supervisor de entrada"),
                ],
            },
            {
                "id": "s1",
                "title": "1. Evaluación Atmosférica (Monitoreo de Gases)",
                "order": 1,
                "questions": [
                    _yn("q1_1", "Se realizó monitoreo atmosférico ANTES de la entrada.", 10),
                    _num("q1_o2", "Nivel de Oxígeno (O₂) — aceptable: 19.5%–23.5%", "%"),
                    _num("q1_lel", "% LIE (Límite Inferior de Explosividad) — máx. permitido: 10%", "% LIE"),
                    _num("q1_co", "Monóxido de Carbono (CO) — máx. permitido: 25 ppm", "ppm"),
                    _num("q1_h2s", "Sulfuro de Hidrógeno (H₂S) — máx. permitido: 1 ppm", "ppm"),
                    _yn("q1_2", "Los valores atmosféricos están DENTRO de los límites aceptables.", 10),
                    _yn("q1_3", "El monitor de gases tiene calibración vigente (máx. 6 meses).", 8),
                    _yn("q1_4", "El monitoreo continuo está configurado durante todo el trabajo.", 9),
                ],
            },
            {
                "id": "s2",
                "title": "2. Aislamiento y Purgado",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Todas las líneas de energía y fluidos están bloqueadas (LOTO aplicado).", 10),
                    _yn("q2_2", "Las líneas conectadas al espacio están bloqueadas con blinds/spades.", 9),
                    _yn("q2_3", "El espacio fue ventilado/purgado antes del monitoreo.", 9),
                    _yn("q2_4", "La ventilación continua está activa durante el trabajo.", 8),
                    _mc("q2_tipo_vent", "Tipo de ventilación utilizada", [
                        {"value": "forzada", "label": "Ventilación forzada (soplador)"},
                        {"value": "natural", "label": "Ventilación natural"},
                        {"value": "ninguna", "label": "Sin ventilación adicional"},
                    ], weight=0),
                ],
            },
            {
                "id": "s3",
                "title": "3. Equipos de Rescate y Comunicación",
                "order": 3,
                "questions": [
                    _yn("q3_1", "El trípode de rescate o sistema de izado está instalado y listo.", 9),
                    _yn("q3_2", "El entrante usa arnés de rescate tipo D-ring esternal/dorsal.", 9),
                    _yn("q3_3", "La cuerda de rescate está conectada al entrante y al sistema de izado.", 9),
                    _yn("q3_4", "Los equipos de comunicación (radio/intercom) funcionan desde el interior.", 8),
                    _yn("q3_5", "El equipo de respiración autónoma (SCBA) de rescate está disponible.", 8),
                    _yn("q3_6", "El vigilante está entrenado en rescate no-entrada y en procedimientos de emergencia.", 9),
                    _yn("q3_7", "Se tiene comunicación activa con el servicio de rescate/emergencias.", 7),
                ],
            },
            {
                "id": "s4",
                "title": "4. Autorización de Entrada",
                "order": 4,
                "questions": [
                    _yn("q4_1", "El permiso de entrada ha sido completado y firmado.", 10),
                    _yn("q4_2", "El permiso de entrada está exhibido en la entrada del espacio.", 8),
                    _yn("q4_3", "El personal fue instruido sobre los peligros específicos del espacio.", 9),
                    _yn("q4_4", "El procedimiento de rescate de emergencia fue revisado con el equipo.", 9),
                    _txt("q4_obs", "Observaciones adicionales y condiciones especiales"),
                    _sig("q4_entrante", "Firma del Entrante Autorizado"),
                    _sig("q4_vigilante", "Firma del Vigilante (Attendant)"),
                    _sig("q4_supervisor", "Firma del Supervisor — AUTORIZA LA ENTRADA"),
                ],
            },
        ],
        "scoring_config": {**STANDARD_SCORING, "pass_threshold": 95},
    },
    "scoring_config": {**STANDARD_SCORING, "pass_threshold": 95},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 6 — Checklist de Trabajo en Caliente
# ═════════════════════════════════════════════════════════════

T06 = {
    "name": "Checklist de Trabajo en Caliente",
    "slug": "checklist-trabajo-en-caliente",
    "description": (
        "Verificación pre-trabajo para operaciones de corte, soldadura, esmerilado y otras "
        "actividades que generan calor, chispas o llama. Basado en NFPA 51B y OSHA 29 CFR 1910.252. "
        "Incluye inspección del área, equipos, medidas de protección contra incendio y monitoreo."
    ),
    "short_description": "Verificación pre-trabajo para soldadura, corte y esmerilado (NFPA 51B).",
    "category": "safety",
    "industry": "Industria / Petroquímica / Construcción",
    "standards": ["NFPA 51B", "OSHA 29 CFR 1910.252", "ISO 45001:2018"],
    "tags": ["trabajo en caliente", "soldadura", "corte", "NFPA", "permiso de trabajo", "incendio"],
    "language": "es",
    "version": "1.8.0",
    "is_featured": False,
    "estimated_duration_minutes": 20,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Preparación del Área de Trabajo",
                "order": 1,
                "questions": [
                    _yn("q1_1", "El área de trabajo está libre de materiales combustibles en radio de 11 m (35 ft).", 10),
                    _yn("q1_2", "Los materiales combustibles que no se pueden mover están protegidos con mantas ignífugas.", 9),
                    _yn("q1_3", "Los pisos combustibles están humedecidos o protegidos.", 8),
                    _yn("q1_4", "Las aberturas en pisos y paredes dentro del radio de 11 m están selladas.", 9),
                    _yn("q1_5", "Las tuberías y cables cercanos están identificados y protegidos.", 8),
                    _yn("q1_6", "Se verificó que no hay riesgos ocultos (atmósferas inflamables, tuberías con gas).", 10),
                ],
            },
            {
                "id": "s2",
                "title": "2. Equipos y Herramientas",
                "order": 2,
                "questions": [
                    _yn("q2_1", "El equipo de soldadura/corte está en buen estado y es el adecuado para la tarea.", 8),
                    _yn("q2_2", "Las mangueras de gas están en buen estado (sin grietas, fugas o rozaduras).", 9),
                    _yn("q2_3", "Los cilindros de gas están asegurados verticalmente y con capuchones.", 8),
                    _yn("q2_4", "Los reguladores y válvulas funcionan correctamente.", 8),
                    _yn("q2_5", "Los retorced de llama (flashback arrestors) están instalados en ambos lados.", 9),
                    _yn("q2_6", "El EPP específico (careta de soldar, guantes de carnaza, delantal) está disponible.", 8),
                ],
            },
            {
                "id": "s3",
                "title": "3. Protección Contra Incendio",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Extintor de polvo ABC (mín. 9 kg) disponible a máx. 10 m del punto de trabajo.", 10),
                    _yn("q3_2", "El vigía contra incendio está asignado, presente y tiene su extintor.", 10),
                    _yn("q3_3", "El sistema de detección/alarma de incendios en el área está operativo.", 8),
                    _yn("q3_4", "La manguera de agua o sistema de supresión es accesible.", 7),
                    _yn("q3_5", "Se ha notificado al equipo de seguridad/bomberos internos.", 7),
                ],
            },
            {
                "id": "s4",
                "title": "4. Monitoreo Post-Trabajo",
                "order": 4,
                "questions": [
                    _yn("q4_1", "El vigía permanecerá en el área MÍNIMO 30 minutos después de terminar el trabajo.", 10),
                    _yn("q4_2", "Se realizará inspección del área 4 horas después de finalizar el trabajo.", 8),
                    _yn("q4_3", "Se ha acordado verificación final al final del turno.", 7),
                    _txt("q4_obs", "Observaciones y condiciones especiales del trabajo"),
                    _sig("q4_soldador", "Firma del Soldador/Operario"),
                    _sig("q4_vigia", "Firma del Vigía Contra Incendio"),
                    _sig("q4_supervisor", "Firma del Supervisor — AUTORIZA EL TRABAJO"),
                ],
            },
        ],
        "scoring_config": {**STANDARD_SCORING, "pass_threshold": 90},
    },
    "scoring_config": {**STANDARD_SCORING, "pass_threshold": 90},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 7 — Auditoría de Orden y Limpieza
# ═════════════════════════════════════════════════════════════

T07 = {
    "name": "Auditoría de Orden y Limpieza",
    "slug": "auditoria-orden-limpieza",
    "description": (
        "Auditoría semanal de orden y limpieza para instalaciones industriales. Evalúa áreas de "
        "trabajo, almacenamiento, pasillos, gestión de residuos e instalaciones sanitarias. "
        "Herramienta clave para la prevención de accidentes y enfermedades laborales."
    ),
    "short_description": "Auditoría semanal de orden y limpieza en instalaciones industriales.",
    "category": "safety",
    "industry": "General / Industria",
    "standards": ["ISO 45001:2018", "OSHA 29 CFR 1910"],
    "tags": ["orden", "limpieza", "housekeeping", "auditoría semanal", "prevención"],
    "language": "es",
    "version": "1.2.0",
    "is_featured": False,
    "estimated_duration_minutes": 25,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Áreas de Trabajo",
                "order": 1,
                "questions": [
                    _yn("q1_1", "Las superficies de trabajo están limpias y organizadas.", 5),
                    _yn("q1_2", "No hay acumulación de material innecesario en las áreas de trabajo.", 5),
                    _yn("q1_3", "Las herramientas están guardadas en sus lugares designados cuando no se usan.", 5),
                    _yn("q1_4", "Los derrames de aceite/agua/químicos son limpiados inmediatamente.", 6),
                    _yn("q1_5", "Las máquinas y equipos están limpios externamente.", 4),
                ],
            },
            {
                "id": "s2",
                "title": "2. Almacenamiento",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Los materiales están almacenados de forma segura y estable.", 6),
                    _yn("q2_2", "El apilamiento no supera la altura máxima permitida.", 7),
                    _yn("q2_3", "Los materiales pesados se almacenan en niveles bajos.", 6),
                    _yn("q2_4", "Los materiales peligrosos están en áreas designadas y segregados.", 8),
                    _yn("q2_5", "Los estantes y racks están en buen estado y anclados.", 7),
                ],
            },
            {
                "id": "s3",
                "title": "3. Pasillos y Vías de Evacuación",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Los pasillos tienen ancho mínimo de 1.1 m y están despejados.", 8),
                    _yn("q3_2", "Las marcas de piso (líneas amarillas) están visibles y en buen estado.", 5),
                    _yn("q3_3", "Las salidas de emergencia están libres de obstáculos.", 9),
                    _yn("q3_4", "La señalización de rutas de evacuación está completa y visible.", 8),
                ],
            },
            {
                "id": "s4",
                "title": "4. Gestión de Residuos",
                "order": 4,
                "questions": [
                    _yn("q4_1", "Los contenedores de residuos están disponibles en puntos estratégicos.", 5),
                    _yn("q4_2", "Los residuos están correctamente clasificados (ordinario, reciclable, peligroso).", 6),
                    _yn("q4_3", "Los contenedores no están sobrepasando su capacidad.", 5),
                    _yn("q4_4", "Los residuos peligrosos tienen etiquetado y almacenamiento específico.", 8),
                    _yn("q4_5", "Los residuos son retirados con la frecuencia adecuada.", 5),
                ],
            },
            {
                "id": "s5",
                "title": "5. Instalaciones Sanitarias y Vestuarios",
                "order": 5,
                "questions": [
                    _yn("q5_1", "Los baños están limpios, con agua, jabón y papel disponibles.", 5),
                    _yn("q5_2", "Los vestuarios están limpios y organizados.", 4),
                    _yn("q5_3", "Los lavaojos de emergencia están operativos y accesibles.", 8),
                    _yn("q5_4", "Las duchas de emergencia (si aplica) funcionan correctamente.", 7),
                    _num("q5_puntaje", "Puntaje global estimado por el auditor (0-100)", "pts", weight=0, required=False),
                    _txt("q5_obs", "Observaciones y plan de acción con responsables y fechas"),
                    _sig("q5_auditor", "Firma del Auditor"),
                ],
            },
        ],
        "scoring_config": {**STANDARD_SCORING, "pass_threshold": 80},
    },
    "scoring_config": {**STANDARD_SCORING, "pass_threshold": 80},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 8 — Inspección de EPP
# ═════════════════════════════════════════════════════════════

T08 = {
    "name": "Inspección de EPP (Equipo de Protección Personal)",
    "slug": "inspeccion-epp",
    "description": (
        "Inspección completa del estado y uso correcto de todos los tipos de Equipos de Protección "
        "Personal. Cubre protección de cabeza, ojos, oídos, respiratoria, manos, pies y anticaídas. "
        "Recomendada mensualmente por supervisor de HSE y trimestralmente por auditor externo."
    ),
    "short_description": "Inspección mensual de estado y uso de todos los tipos de EPP.",
    "category": "safety",
    "industry": "General / Industria",
    "standards": ["ANSI Z89.1", "ANSI Z87.1", "ANSI S3.19", "ISO 45001:2018"],
    "tags": ["EPP", "casco", "guantes", "botas", "protección", "inspección mensual"],
    "language": "es",
    "version": "1.4.0",
    "is_featured": False,
    "estimated_duration_minutes": 30,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Protección de la Cabeza (Cascos)",
                "order": 1,
                "questions": [
                    _yn("q1_1", "Los cascos son del tipo correcto para las tareas (Clase E, G o C).", 8),
                    _yn("q1_2", "Los cascos no presentan grietas, deformaciones ni perforaciones.", 9),
                    _yn("q1_3", "El arnés interior del casco está en buen estado y ajustado correctamente.", 7),
                    _yn("q1_4", "Los cascos no tienen pegatinas no autorizadas que oculten defectos.", 6),
                    _yn("q1_5", "Los cascos tienen fecha de fabricación visible y están dentro del periodo de vida útil (máx. 5 años).", 7),
                ],
            },
            {
                "id": "s2",
                "title": "2. Protección Ocular y Facial",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Los lentes de seguridad son el tipo correcto (impacto, químicos, radiación).", 8),
                    _yn("q2_2", "Los lentes no presentan rayaduras que limiten la visibilidad.", 6),
                    _yn("q2_3", "Las caretas faciales para trabajo con químicos o esmerilado están disponibles.", 7),
                    _yn("q2_4", "Los trabajadores usan la protección ocular adecuada para su tarea.", 9),
                ],
            },
            {
                "id": "s3",
                "title": "3. Protección Auditiva",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Se usa protección auditiva en todas las zonas con ruido >85 dB(A).", 9),
                    _yn("q3_2", "Los tapones auditivos son desechables y en buen estado de higiene.", 7),
                    _yn("q3_3", "Las orejeras (cuando se usan) están en buen estado y limpias.", 6),
                    _yn("q3_4", "El NRR de la protección auditiva es adecuado para los niveles de ruido del área.", 8),
                ],
            },
            {
                "id": "s4",
                "title": "4. Protección Respiratoria",
                "order": 4,
                "questions": [
                    _yn("q4_1", "El tipo de respirador es el correcto para los contaminantes presentes.", 9),
                    _yn("q4_2", "Los filtros/cartuchos están vigentes y son los correctos para el peligro.", 9),
                    _yn("q4_3", "Se realizó prueba de ajuste (fit test) y el resultado fue positivo.", 8),
                    _yn("q4_4", "Los respiradores se limpian y almacenan correctamente.", 7),
                    _yn("q4_5", "El programa de protección respiratoria escrito está vigente.", 7),
                ],
            },
            {
                "id": "s5",
                "title": "5. Protección de Manos y Pies",
                "order": 5,
                "questions": [
                    _yn("q5_1", "Los guantes son el tipo correcto para la tarea (corte, químicos, calor, etc.).", 8),
                    _yn("q5_2", "Los guantes están en buen estado (sin cortes, huecos o deterioro).", 7),
                    _yn("q5_3", "Los calzados de seguridad tienen punta de acero/composite y suela antideslizante.", 8),
                    _yn("q5_4", "Los calzados tienen protección dieléctrica donde se requiere.", 8),
                    _yn("q5_5", "Los zapatos están en buen estado (suelas adheridas, sin rotura).", 6),
                ],
            },
            {
                "id": "s6",
                "title": "6. Protección Anticaídas y Vestuario",
                "order": 6,
                "questions": [
                    _yn("q6_1", "Los arneses de seguridad están en buen estado (sin daños, historial limpio).", 10),
                    _yn("q6_2", "La ropa de trabajo de alta visibilidad es usada en todas las áreas de tránsito vehicular.", 8),
                    _yn("q6_3", "La ropa ignífuga es usada donde existe riesgo de arco eléctrico o flash fire.", 8),
                    _yn("q6_4", "Existe un registro actualizado de entrega de EPP por trabajador.", 6),
                    _yn("q6_5", "Hay EPP de reemplazo disponible en cantidad suficiente.", 6),
                    _num("q6_total_trabajadores", "Total de trabajadores inspeccionados", "personas"),
                    _txt("q6_obs", "EPP en estado deficiente con nombre del trabajador y acción tomada"),
                    _sig("q6_inspector", "Firma del Inspector de HSE"),
                ],
            },
        ],
        "scoring_config": {**STANDARD_SCORING, "pass_threshold": 85},
    },
    "scoring_config": {**STANDARD_SCORING, "pass_threshold": 85},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 9 — Bloqueo y Etiquetado (LOTO)
# ═════════════════════════════════════════════════════════════

T09 = {
    "name": "Checklist de Bloqueo y Etiquetado (LOTO)",
    "slug": "checklist-bloqueo-etiquetado-loto",
    "description": (
        "Procedimiento de verificación para Control de Energías Peligrosas mediante "
        "Bloqueo y Etiquetado (LOTO — Lockout/Tagout), según OSHA 29 CFR 1910.147. "
        "Cubre identificación de fuentes de energía, proceso de bloqueo, verificación del "
        "aislamiento completo y procedimiento de reactivación segura."
    ),
    "short_description": "Verificación del procedimiento LOTO según OSHA 29 CFR 1910.147.",
    "category": "safety",
    "industry": "Industria / Manufactura / Minería",
    "standards": ["OSHA 29 CFR 1910.147", "NFPA 70E", "ISO 45001:2018"],
    "tags": ["LOTO", "lockout", "tagout", "energía peligrosa", "mantenimiento", "OSHA"],
    "language": "es",
    "version": "2.0.0",
    "is_featured": True,
    "estimated_duration_minutes": 20,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Identificación y Preparación",
                "order": 1,
                "questions": [
                    _txt("q1_equipo", "Identificación del equipo / máquina a intervenir"),
                    _txt("q1_trabajo", "Descripción del trabajo de mantenimiento a realizar"),
                    _txt("q1_tecnico", "Nombre del técnico responsable"),
                    _yn("q1_1", "Se localizó e identificó el procedimiento LOTO específico para este equipo.", 9),
                    _yn("q1_2", "El procedimiento LOTO está disponible en el punto de trabajo.", 8),
                    _yn("q1_3", "Se notificó al personal afectado (operadores, supervisores) del inicio del LOTO.", 9),
                    _mc("q1_energias", "Tipos de energía presentes (selección múltiple)", [
                        {"value": "electrica",   "label": "Eléctrica"},
                        {"value": "hidraulica",  "label": "Hidráulica"},
                        {"value": "neumatica",   "label": "Neumática"},
                        {"value": "termica",     "label": "Térmica"},
                        {"value": "quimica",     "label": "Química"},
                        {"value": "mecanica",    "label": "Mecánica / Gravitacional"},
                    ], weight=0),
                ],
            },
            {
                "id": "s2",
                "title": "2. Proceso de Bloqueo (Pasos en Orden)",
                "order": 2,
                "questions": [
                    _yn("q2_1", "Paso 1: El equipo fue apagado mediante controles normales de operación.", 10),
                    _yn("q2_2", "Paso 2: TODAS las fuentes de energía del equipo fueron aisladas.", 10),
                    _yn("q2_3", "Paso 3: El dispositivo de bloqueo (candado) fue instalado en cada punto de aislamiento.", 10),
                    _yn("q2_4", "Paso 4: La energía almacenada fue liberada o contenida (capacitores, presión, resortes, gravedad).", 10),
                    _yn("q2_5", "Paso 5: Cada técnico que trabaja en el equipo instaló SU PROPIO candado personal.", 10),
                    _yn("q2_6", "Las etiquetas de peligro están firmadas, con fecha y descripción del trabajo.", 9),
                ],
            },
            {
                "id": "s3",
                "title": "3. Verificación del Aislamiento",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Se verificó con multímetro/tester que no hay tensión eléctrica residual.", 10),
                    _yn("q3_2", "Se verificó que la presión hidráulica/neumática está en cero.", 10),
                    _yn("q3_3", "Se intentó arrancar el equipo con el botón normal de inicio — NO arrancó.", 10),
                    _yn("q3_4", "Las partes móviles con energía gravitacional están bloqueadas mecánicamente.", 9),
                    _yn("q3_5", "El equipo está en condición de CERO ENERGÍA confirmada.", 10),
                ],
            },
            {
                "id": "s4",
                "title": "4. Reactivación del Equipo (Post-Trabajo)",
                "order": 4,
                "questions": [
                    _yn("q4_1", "El trabajo fue completado y todas las herramientas fueron retiradas.", 9),
                    _yn("q4_2", "El área fue limpiada y despejada de personal.", 9),
                    _yn("q4_3", "Cada técnico retiró SU PROPIO candado y etiqueta.", 10),
                    _yn("q4_4", "Se notificó a los operadores y supervisores que el equipo fue reactivado.", 9),
                    _yn("q4_5", "El equipo fue puesto en marcha de forma controlada y verificada.", 8),
                    _txt("q4_obs", "Observaciones del proceso y hallazgos durante el mantenimiento"),
                    _sig("q4_tecnico", "Firma del Técnico Responsable"),
                    _sig("q4_supervisor", "Firma del Supervisor Eléctrico/Mecánico"),
                ],
            },
        ],
        "scoring_config": {**STANDARD_SCORING, "pass_threshold": 95},
    },
    "scoring_config": {**STANDARD_SCORING, "pass_threshold": 95},
}


# ═════════════════════════════════════════════════════════════
# TEMPLATE 10 — Inspección de Escaleras y Andamios
# ═════════════════════════════════════════════════════════════

T10 = {
    "name": "Inspección de Escaleras y Andamios",
    "slug": "inspeccion-escaleras-andamios",
    "description": (
        "Inspección de seguridad de escaleras portátiles y andamios tubulares según "
        "OSHA 1926 Subpart L y ANSI A10.8. Cubre estado estructural, anclajes, plataformas "
        "de trabajo y sistemas de protección perimetral. Debe realizarse antes de cada uso y "
        "por una persona competente en andamios."
    ),
    "short_description": "Inspección pre-uso de escaleras y andamios según OSHA 1926 Subpart L.",
    "category": "safety",
    "industry": "Construcción / Industria",
    "standards": ["OSHA 1926 Subpart L", "ANSI A10.8", "ANSI A14.2"],
    "tags": ["andamios", "escaleras", "OSHA 1926", "altura", "acceso", "inspección pre-uso"],
    "language": "es",
    "version": "1.6.0",
    "is_featured": False,
    "estimated_duration_minutes": 20,
    "contributor_name": "OpenQHSE Team",
    "schema_json": {
        "sections": [
            {
                "id": "s1",
                "title": "1. Inspección de Escaleras Portátiles",
                "order": 1,
                "questions": [
                    _mc("s1_tipo", "Tipo de escalera", [
                        {"value": "extension", "label": "Escalera de extensión"},
                        {"value": "tijera",    "label": "Escalera de tijera"},
                        {"value": "plataforma","label": "Escalera de plataforma"},
                        {"value": "na",        "label": "No aplica (solo andamio)"},
                    ], weight=0),
                    _yn("q1_1", "Los peldaños y largueros están en buen estado (sin fisuras, sin corrosión severa).", 9),
                    _yn("q1_2", "Los pies antideslizantes (zapatas) están presentes y en buen estado.", 9),
                    _yn("q1_3", "La escalera se instala con ángulo correcto (1:4 horizontal:vertical / 75°).", 8),
                    _yn("q1_4", "La escalera sobresale mín. 1 m sobre el punto de desembarco.", 8),
                    _yn("q1_5", "La capacidad de carga de la escalera es adecuada para el usuario + herramientas.", 8),
                    _yn("q1_6", "La escalera está asegurada (superior e inferior) para evitar desplazamiento.", 9),
                ],
            },
            {
                "id": "s2",
                "title": "2. Inspección de Andamios — Estructura",
                "order": 2,
                "questions": [
                    _mc("s2_tipo", "Tipo de andamio", [
                        {"value": "tubo_marco",  "label": "Andamio tubular de marcos"},
                        {"value": "modular",     "label": "Andamio modular/sistema"},
                        {"value": "colgante",    "label": "Andamio colgante"},
                        {"value": "na",          "label": "No aplica (solo escalera)"},
                    ], weight=0),
                    _yn("q2_1", "La base del andamio es firme, nivelada y sin riesgo de hundimiento.", 9),
                    _yn("q2_2", "Los pies regulables están correctamente instalados y nivelados.", 8),
                    _yn("q2_3", "Las cruces de arriostramiento diagonales están instaladas en todos los niveles.", 9),
                    _yn("q2_4", "Los marcos/módulos están correctamente acoplados y seguros.", 9),
                    _yn("q2_5", "El andamio no presenta deformaciones, dobleces ni daños estructurales.", 10),
                    _yn("q2_6", "Los anclajes a la estructura permanente están instalados cada 9 m² (máx.).", 8),
                ],
            },
            {
                "id": "s3",
                "title": "3. Plataformas de Trabajo",
                "order": 3,
                "questions": [
                    _yn("q3_1", "Las plataformas cubren el ancho completo del andamio (mín. 45 cm).", 8),
                    _yn("q3_2", "Las tablas de la plataforma están sanas (sin nudo perforante, sin rotura).", 9),
                    _yn("q3_3", "Las tablas están aseguradas para evitar desplazamiento o volcamiento.", 9),
                    _yn("q3_4", "No hay espacio mayor a 2.5 cm entre tablas adyacentes.", 7),
                    _yn("q3_5", "La plataforma puede soportar 4 veces la carga máxima prevista.", 9),
                ],
            },
            {
                "id": "s4",
                "title": "4. Barandas y Protección Perimetral",
                "order": 4,
                "questions": [
                    _yn("q4_1", "La baranda superior está a altura entre 0.9 m y 1.15 m.", 9),
                    _yn("q4_2", "La baranda intermedia está a altura de 0.45–0.55 m.", 8),
                    _yn("q4_3", "El rodapié (guarda-pie) de mín. 10 cm está instalado en todo el perímetro.", 8),
                    _yn("q4_4", "Las barandas están instaladas en todos los lados abiertos.", 9),
                    _yn("q4_5", "Las barandas resisten una fuerza horizontal de 90 kg (200 lb).", 8),
                    _mc("q4_apto", "Resultado de la inspección", [
                        {"value": "apto",    "label": "✅ APTO PARA USO"},
                        {"value": "no_apto", "label": "🚫 NO APTO — Fuera de Servicio"},
                        {"value": "restric", "label": "⚠️ USO CON RESTRICCIONES"},
                    ], weight=0),
                    _txt("q4_obs", "Defectos identificados y acciones correctivas requeridas"),
                    _sig("q4_inspector", "Firma Inspector Competente en Andamios"),
                ],
            },
        ],
        "scoring_config": {**STANDARD_SCORING, "pass_threshold": 85},
    },
    "scoring_config": {**STANDARD_SCORING, "pass_threshold": 85},
}


# ─────────────────────────────────────────────────────────────
# Export
# ─────────────────────────────────────────────────────────────
SAFETY_TEMPLATES = [T01, T02, T03, T04, T05, T06, T07, T08, T09, T10]
