/**
 * Incident Report — 3-step ultra-simple flow, one-handed operation.
 * Step 1: Type + Severity
 * Step 2: Description + Photos + Audio
 * Step 3: Location + Review + Submit
 *
 * Everything saves to local incidents_queue (offline-first).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { database } from '@/db';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

// ── Constants ──────────────────────────────────────────────

const INCIDENT_TYPES = [
  { value: 'accident', label: 'Accidente', icon: 'medkit-outline' as const, color: Colors.danger },
  { value: 'near_miss', label: 'Casi-accidente', icon: 'alert-outline' as const, color: Colors.warning },
  { value: 'unsafe_condition', label: 'Condición insegura', icon: 'construct-outline' as const, color: '#f97316' },
  { value: 'unsafe_act', label: 'Acto inseguro', icon: 'person-outline' as const, color: Colors.info },
  { value: 'environmental', label: 'Ambiental', icon: 'leaf-outline' as const, color: Colors.success },
  { value: 'property_damage', label: 'Daño material', icon: 'cube-outline' as const, color: '#8b5cf6' },
];

const SEVERITIES = [
  { value: 'low', label: 'Baja', color: Colors.info },
  { value: 'medium', label: 'Media', color: Colors.warning },
  { value: 'high', label: 'Alta', color: '#f97316' },
  { value: 'critical', label: 'Crítica', color: Colors.danger },
];

// ── Component ──────────────────────────────────────────────

export default function IncidentReportScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [incidentType, setIncidentType] = useState('');
  const [severity, setSeverity] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [area, setArea] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [audioUri, setAudioUri] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  // Auto-GPS on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setGps({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          // Reverse geocode for location text
          const [addr] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (addr) {
            setLocationText([addr.street, addr.city, addr.region].filter(Boolean).join(', '));
          }
        }
      } catch {
        // GPS optional
      }
    })();
  }, []);

  // Take photo
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        // Compress
        const compressed = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
        );
        setPhotos((prev) => [...prev, compressed.uri]);
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  // Pick from gallery
  const pickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la galería');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });
      if (!result.canceled) {
        for (const asset of result.assets) {
          const compressed = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1200 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
          );
          setPhotos((prev) => [...prev, compressed.uri]);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudieron seleccionar fotos');
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit to offline queue
  const handleSubmit = async () => {
    if (!incidentType || !severity || !title.trim()) {
      Alert.alert('Campos requeridos', 'Completa tipo, severidad y título');
      return;
    }

    setSaving(true);
    try {
      await database.write(async () => {
        await database.get('incidents_queue').create((record: any) => {
          record.serverId = '';
          record.title = title.trim();
          record.description = description.trim();
          record.incidentType = incidentType;
          record.severity = severity;
          record.location = locationText;
          record.area = area;
          record.latitude = gps?.lat ?? null;
          record.longitude = gps?.lng ?? null;
          record.photosJson = JSON.stringify(photos);
          record.audioUri = audioUri;
          record.occurredAt = Date.now();
          record.reportedBy = '';
          record.pendingSync = true;
          record.syncError = '';
          record.syncedAt = null;
          record.createdAt = Date.now();
        });
      });

      Alert.alert(
        '✅ Incidente registrado',
        'Se guardó localmente. Se sincronizará cuando haya conexión.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  // ── Step renderers ───────────────────────────────────────

  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>¿Qué tipo de incidente?</Text>
      <View style={styles.typeGrid}>
        {INCIDENT_TYPES.map((t) => {
          const active = incidentType === t.value;
          return (
            <TouchableOpacity
              key={t.value}
              style={[styles.typeCard, active && { borderColor: t.color, backgroundColor: t.color + '15' }]}
              onPress={() => setIncidentType(t.value)}
              activeOpacity={0.7}
            >
              <Ionicons name={t.icon} size={28} color={active ? t.color : Colors.muted} />
              <Text style={[styles.typeLabel, active && { color: t.color }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.stepTitle, { marginTop: Spacing.xl }]}>Severidad</Text>
      <View style={styles.severityRow}>
        {SEVERITIES.map((s) => {
          const active = severity === s.value;
          return (
            <TouchableOpacity
              key={s.value}
              style={[styles.severityChip, active && { backgroundColor: s.color, borderColor: s.color }]}
              onPress={() => setSeverity(s.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.severityText, active && { color: '#fff' }]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        style={[styles.textInput, { marginTop: Spacing.xl }]}
        placeholder="Título breve del incidente *"
        placeholderTextColor={Colors.mutedForeground}
        value={title}
        onChangeText={setTitle}
      />
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>Descripción</Text>
      <TextInput
        style={[styles.textInput, styles.textArea]}
        placeholder="¿Qué ocurrió? Describe brevemente…"
        placeholderTextColor={Colors.mutedForeground}
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />

      <Text style={[styles.stepTitle, { marginTop: Spacing.xl }]}>Fotos</Text>
      <View style={styles.photosRow}>
        {photos.map((uri, idx) => (
          <View key={uri} style={styles.photoWrap}>
            <Image source={{ uri }} style={styles.photoThumb} />
            <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(idx)}>
              <Ionicons name="close-circle" size={22} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < 5 && (
          <>
            <TouchableOpacity style={styles.photoAdd} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color={Colors.primary} />
              <Text style={styles.photoAddText}>Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto}>
              <Ionicons name="images" size={24} color={Colors.primary} />
              <Text style={styles.photoAddText}>Galería</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Text style={[styles.stepTitle, { marginTop: Spacing.xl }]}>Audio (opcional)</Text>
      <TouchableOpacity style={styles.audioBtn}>
        <Ionicons name="mic-outline" size={24} color={Colors.primary} />
        <Text style={styles.audioBtnText}>
          {audioUri ? 'Audio grabado ✓' : 'Grabar nota de voz'}
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>Ubicación</Text>
      <View style={styles.gpsRow}>
        <Ionicons name="location" size={20} color={gps ? Colors.success : Colors.muted} />
        <Text style={styles.gpsText}>
          {gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : 'Obteniendo GPS…'}
        </Text>
      </View>

      <TextInput
        style={[styles.textInput, { marginTop: Spacing.md }]}
        placeholder="Ubicación / Dirección"
        placeholderTextColor={Colors.mutedForeground}
        value={locationText}
        onChangeText={setLocationText}
      />

      <TextInput
        style={[styles.textInput, { marginTop: Spacing.md }]}
        placeholder="Área / Zona"
        placeholderTextColor={Colors.mutedForeground}
        value={area}
        onChangeText={setArea}
      />

      {/* Review summary */}
      <Text style={[styles.stepTitle, { marginTop: Spacing.xl }]}>Resumen</Text>
      <View style={styles.reviewCard}>
        <Text style={styles.reviewLabel}>Tipo:</Text>
        <Text style={styles.reviewValue}>
          {INCIDENT_TYPES.find((t) => t.value === incidentType)?.label ?? '—'}
        </Text>
        <Text style={styles.reviewLabel}>Severidad:</Text>
        <Text style={styles.reviewValue}>
          {SEVERITIES.find((s) => s.value === severity)?.label ?? '—'}
        </Text>
        <Text style={styles.reviewLabel}>Título:</Text>
        <Text style={styles.reviewValue}>{title || '—'}</Text>
        <Text style={styles.reviewLabel}>Fotos:</Text>
        <Text style={styles.reviewValue}>{photos.length}</Text>
      </View>
    </>
  );

  const canGoNext =
    step === 1 ? !!(incidentType && severity && title.trim()) :
    step === 2 ? true :
    true;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (step > 1 ? setStep(step - 1) : router.back())} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reportar Incidente</Text>
          <Text style={styles.stepIndicator}>Paso {step}/3</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {step < 3 ? (
            <TouchableOpacity
              style={[styles.nextBtn, !canGoNext && styles.btnDisabled]}
              onPress={() => setStep(step + 1)}
              disabled={!canGoNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextBtnText}>Siguiente</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, saving && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Guardar Incidente</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: { marginRight: Spacing.md },
  headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: '700', color: Colors.foreground },
  stepIndicator: { fontSize: FontSize.sm, color: Colors.muted, fontWeight: '600' },

  progressBar: {
    height: 3,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: 2,
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },

  scroll: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 120 },

  stepTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.foreground, marginBottom: Spacing.md },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  typeCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeLabel: { fontSize: FontSize.sm, color: Colors.foreground, fontWeight: '600', textAlign: 'center' },

  severityRow: { flexDirection: 'row', gap: Spacing.sm },
  severityChip: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  severityText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.foreground },

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

  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  photoWrap: { position: 'relative' },
  photoThumb: { width: 80, height: 80, borderRadius: Radius.sm },
  photoRemove: { position: 'absolute', top: -6, right: -6 },
  photoAdd: {
    width: 80,
    height: 80,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    borderStyle: 'dashed',
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  photoAddText: { fontSize: FontSize.xs, color: Colors.primary },

  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  audioBtnText: { fontSize: FontSize.base, color: Colors.foreground },

  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  gpsText: { fontSize: FontSize.sm, color: Colors.foreground },

  reviewCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  reviewLabel: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: '600' },
  reviewValue: { fontSize: FontSize.base, color: Colors.foreground, marginBottom: Spacing.sm },

  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border + '44',
    backgroundColor: Colors.background,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: Radius.md,
  },
  nextBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.danger,
    height: 52,
    borderRadius: Radius.md,
  },
  submitBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
