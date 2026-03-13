/**
 * Form Runner — offline-first dynamic form engine.
 * Reads cached form template, renders fields dynamically, saves to submissions_queue.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';

import { database, FormCache } from '@/db';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

// ── Types ──────────────────────────────────────────────────

interface FormField {
  id: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'time' | 'photo' | 'signature' | 'geolocation' | 'qr' | 'audio' | 'rating';
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  section?: string;
}

// ── Component ──────────────────────────────────────────────

export default function FormRunnerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<FormCache | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startedAt] = useState(Date.now());
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);

  // Load form from cache
  useEffect(() => {
    (async () => {
      try {
        const record = await database.get<FormCache>('forms_cache').find(id);
        setForm(record);
        const schema = record.schemaJson as FormField[];
        setFields(Array.isArray(schema) ? schema : []);
      } catch {
        Alert.alert('Error', 'Formulario no encontrado en caché');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Get location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch {
        // Location optional
      }
    })();
  }, []);

  const setAnswer = useCallback((fieldId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  // Validate required fields
  const requiredMissing = useMemo(() => {
    return fields.filter((f) => f.required).filter((f) => {
      const val = answers[f.id];
      return val === undefined || val === null || val === '';
    });
  }, [fields, answers]);

  // Save to offline queue
  const handleSubmit = async () => {
    if (requiredMissing.length > 0) {
      Alert.alert(
        'Campos requeridos',
        `Completa: ${requiredMissing.map((f) => f.label).join(', ')}`,
      );
      return;
    }

    setSaving(true);
    try {
      await database.write(async () => {
        await database.get('submissions_queue').create((record: any) => {
          record.serverId = '';
          record.formCacheId = id;
          record.formServerId = form?.serverId ?? '';
          record.answersJson = JSON.stringify(answers);
          record.attachmentsJson = JSON.stringify([]);
          record.latitude = location?.lat ?? null;
          record.longitude = location?.lng ?? null;
          record.startedAt = startedAt;
          record.completedAt = Date.now();
          record.pendingSync = true;
          record.syncError = '';
          record.syncedAt = null;
          record.createdAt = Date.now();
        });
      });

      Alert.alert('✅ Guardado', 'El formulario se guardó localmente y se sincronizará automáticamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  // ── Field renderers ──────────────────────────────────────

  const renderField = (field: FormField) => {
    const value = answers[field.id];

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <TextInput
            style={styles.textInput}
            placeholder={field.placeholder ?? `Ingresa ${field.label.toLowerCase()}`}
            placeholderTextColor={Colors.mutedForeground}
            value={String(value ?? '')}
            onChangeText={(t: string) => setAnswer(field.id, field.type === 'number' ? Number(t) || '' : t)}
            keyboardType={field.type === 'number' ? 'numeric' : 'default'}
          />
        );

      case 'textarea':
        return (
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder={field.placeholder ?? `Ingresa ${field.label.toLowerCase()}`}
            placeholderTextColor={Colors.mutedForeground}
            value={String(value ?? '')}
            onChangeText={(t: string) => setAnswer(field.id, t)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        );

      case 'select':
        return (
          <View style={styles.selectGroup}>
            {(field.options ?? []).map((opt) => {
              const selected = value === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.selectOption, selected && styles.selectOptionActive]}
                  onPress={() => setAnswer(field.id, opt.value)}
                >
                  <Text style={[styles.selectOptionText, selected && styles.selectOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'multiselect':
        return (
          <View style={styles.selectGroup}>
            {(field.options ?? []).map((opt) => {
              const selected = Array.isArray(value) && value.includes(opt.value);
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.selectOption, selected && styles.selectOptionActive]}
                  onPress={() => {
                    const current = Array.isArray(value) ? [...value] : [];
                    if (selected) {
                      setAnswer(field.id, current.filter((v) => v !== opt.value));
                    } else {
                      setAnswer(field.id, [...current, opt.value]);
                    }
                  }}
                >
                  <Ionicons
                    name={selected ? 'checkbox' : 'square-outline'}
                    size={18}
                    color={selected ? Colors.primary : Colors.muted}
                  />
                  <Text style={[styles.selectOptionText, selected && styles.selectOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'checkbox':
        return (
          <View style={styles.checkboxRow}>
            <Switch
              value={!!value}
              onValueChange={(v: boolean) => setAnswer(field.id, v)}
              trackColor={{ false: Colors.surface, true: Colors.primary + '88' }}
              thumbColor={value ? Colors.primary : Colors.muted}
            />
            <Text style={styles.checkboxLabel}>{value ? 'Sí' : 'No'}</Text>
          </View>
        );

      case 'date':
      case 'time':
        return (
          <View>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowDatePicker(field.id)}
            >
              <Ionicons
                name={field.type === 'date' ? 'calendar-outline' : 'time-outline'}
                size={18}
                color={Colors.muted}
              />
              <Text style={styles.dateBtnText}>
                {value
                  ? field.type === 'date'
                    ? new Date(value as number).toLocaleDateString()
                    : new Date(value as number).toLocaleTimeString()
                  : `Seleccionar ${field.type === 'date' ? 'fecha' : 'hora'}`}
              </Text>
            </TouchableOpacity>
            {showDatePicker === field.id && (
              <DateTimePicker
                value={value ? new Date(value as number) : new Date()}
                mode={field.type}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_: unknown, selectedDate?: Date) => {
                  setShowDatePicker(null);
                  if (selectedDate) setAnswer(field.id, selectedDate.getTime());
                }}
              />
            )}
          </View>
        );

      case 'rating':
        return (
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setAnswer(field.id, star)}>
                <Ionicons
                  name={(value as number) >= star ? 'star' : 'star-outline'}
                  size={32}
                  color={(value as number) >= star ? Colors.warning : Colors.muted}
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'photo':
        return (
          <TouchableOpacity
            style={styles.nativeFieldBtn}
            onPress={() => {
              // PhotoField component would handle this in production
              Alert.alert('Foto', 'El componente PhotoField se abrirá aquí');
            }}
          >
            <Ionicons name="camera-outline" size={24} color={Colors.primary} />
            <Text style={styles.nativeFieldText}>Tomar / Seleccionar Foto</Text>
          </TouchableOpacity>
        );

      case 'signature':
        return (
          <TouchableOpacity
            style={styles.nativeFieldBtn}
            onPress={() => {
              Alert.alert('Firma', 'El componente SignatureCanvas se abrirá aquí');
            }}
          >
            <Ionicons name="pencil-outline" size={24} color={Colors.primary} />
            <Text style={styles.nativeFieldText}>Capturar Firma</Text>
          </TouchableOpacity>
        );

      case 'geolocation':
        return (
          <View style={styles.geoField}>
            <Ionicons name="location-outline" size={20} color={Colors.primary} />
            <Text style={styles.geoText}>
              {location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'Obteniendo ubicación…'}
            </Text>
          </View>
        );

      case 'qr':
        return (
          <TouchableOpacity
            style={styles.nativeFieldBtn}
            onPress={() => {
              Alert.alert('QR', 'El escáner QR se abrirá aquí');
            }}
          >
            <Ionicons name="qr-code-outline" size={24} color={Colors.primary} />
            <Text style={styles.nativeFieldText}>Escanear QR</Text>
          </TouchableOpacity>
        );

      case 'audio':
        return (
          <TouchableOpacity
            style={styles.nativeFieldBtn}
            onPress={() => {
              Alert.alert('Audio', 'El componente AudioField se abrirá aquí');
            }}
          >
            <Ionicons name="mic-outline" size={24} color={Colors.primary} />
            <Text style={styles.nativeFieldText}>Grabar Audio</Text>
          </TouchableOpacity>
        );

      default:
        return (
          <Text style={styles.unsupportedText}>Campo tipo "{field.type}" no soportado</Text>
        );
    }
  };

  // ── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Group by section
  const sections = fields.reduce<Record<string, FormField[]>>((acc, f) => {
    const key = f.section ?? 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{form?.title ?? 'Formulario'}</Text>
            <Text style={styles.headerSub}>
              {fields.length} campos · {requiredMissing.length} pendientes
            </Text>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {Object.entries(sections).map(([sectionName, sectionFields]) => (
            <View key={sectionName}>
              {Object.keys(sections).length > 1 && (
                <Text style={styles.sectionTitle}>{sectionName}</Text>
              )}
              {sectionFields.map((field) => (
                <View key={field.id} style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>
                    {field.label}
                    {field.required && <Text style={styles.requiredStar}> *</Text>}
                  </Text>
                  {renderField(field)}
                </View>
              ))}
            </View>
          ))}

          {/* Location info */}
          <View style={styles.metaSection}>
            <Ionicons name="location" size={16} color={Colors.muted} />
            <Text style={styles.metaText}>
              {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Sin GPS'}
            </Text>
            <Ionicons name="time" size={16} color={Colors.muted} />
            <Text style={styles.metaText}>
              Inicio: {new Date(startedAt).toLocaleTimeString()}
            </Text>
          </View>
        </ScrollView>

        {/* Submit button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Guardar (Offline)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '44',
  },
  backBtn: { marginRight: Spacing.md },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.foreground },
  headerSub: { fontSize: FontSize.xs, color: Colors.muted },

  scroll: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 120 },

  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary + '33',
  },

  fieldWrap: { marginBottom: Spacing.xl },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.foreground, marginBottom: Spacing.sm },
  requiredStar: { color: Colors.danger },

  textInput: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.foreground,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  selectGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectOptionActive: { backgroundColor: Colors.primary + '22', borderColor: Colors.primary },
  selectOptionText: { fontSize: FontSize.sm, color: Colors.foreground },
  selectOptionTextActive: { color: Colors.primary, fontWeight: '600' },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  checkboxLabel: { fontSize: FontSize.base, color: Colors.foreground },

  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateBtnText: { fontSize: FontSize.base, color: Colors.foreground },

  ratingRow: { flexDirection: 'row', gap: Spacing.sm },

  nativeFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary + '12',
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderStyle: 'dashed',
  },
  nativeFieldText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },

  geoField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  geoText: { fontSize: FontSize.sm, color: Colors.foreground },

  unsupportedText: { fontSize: FontSize.sm, color: Colors.muted, fontStyle: 'italic' },

  metaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
  },
  metaText: { fontSize: FontSize.xs, color: Colors.muted, marginRight: Spacing.md },

  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border + '44',
    backgroundColor: Colors.background,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
    height: 52,
    borderRadius: Radius.md,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
});
