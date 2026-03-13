/**
 * Equipment Scan — QR/barcode scanner to look up equipment.
 * Shows equipment info, history, and option to start inspection.
 * Works offline with cached equipment data.
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { database, EquipmentCache } from '@/db';
import { api } from '@/lib/api';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

interface EquipmentResult {
  found: boolean;
  data: {
    tag: string;
    name: string;
    type: string;
    status: string;
    location: string;
    lastInspection: string;
    nextInspection: string;
    certExpiry: string;
    specs: Record<string, unknown>;
  } | null;
  source: 'online' | 'cache';
}

const STATUS_COLORS: Record<string, string> = {
  operational: Colors.success,
  maintenance: Colors.warning,
  out_of_service: Colors.danger,
  retired: Colors.muted,
};

export default function EquipmentScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EquipmentResult | null>(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!scanning || loading) return;
    setScanning(false);
    setLoading(true);

    try {
      let tag = data;
      // Extract tag from URL if needed
      if (data.includes('/equipment/')) {
        tag = data.split('/equipment/').pop() ?? data;
      }

      let equipResult: EquipmentResult = { found: false, data: null, source: 'cache' };

      // Try online
      try {
        const serverData = await api.equipment.getByTag(tag);
        const d = serverData as Record<string, unknown>;
        equipResult = {
          found: true,
          source: 'online',
          data: {
            tag: (d.tag ?? d.asset_tag ?? tag) as string,
            name: (d.name ?? '') as string,
            type: (d.equipment_type ?? d.type ?? '') as string,
            status: (d.status ?? 'operational') as string,
            location: (d.location ?? '') as string,
            lastInspection: d.last_inspection_date
              ? new Date(d.last_inspection_date as string).toLocaleDateString()
              : 'N/A',
            nextInspection: d.next_inspection_date
              ? new Date(d.next_inspection_date as string).toLocaleDateString()
              : 'N/A',
            certExpiry: d.certification_expiry
              ? new Date(d.certification_expiry as string).toLocaleDateString()
              : 'N/A',
            specs: (d.specifications ?? {}) as Record<string, unknown>,
          },
        };

        // Update cache
        try {
          await database.write(async () => {
            const existing = (await database.get<EquipmentCache>('equipment_cache').query().fetch())
              .find((e: EquipmentCache) => e.tag === tag || e.serverId === (d.id as string));

            if (existing) {
              await existing.update((r: any) => {
                r.name = equipResult.data!.name;
                r.equipmentType = equipResult.data!.type;
                r.status = equipResult.data!.status;
                r.location = equipResult.data!.location;
                r.syncedAt = Date.now();
                r.updatedAt = Date.now();
              });
            } else {
              await database.get('equipment_cache').create((r: any) => {
                r.serverId = (d.id ?? '') as string;
                r.tag = tag;
                r.name = equipResult.data!.name;
                r.equipmentType = equipResult.data!.type;
                r.status = equipResult.data!.status;
                r.location = equipResult.data!.location;
                r.lastInspectionDate = d.last_inspection_date
                  ? new Date(d.last_inspection_date as string).getTime()
                  : null;
                r.nextInspectionDate = d.next_inspection_date
                  ? new Date(d.next_inspection_date as string).getTime()
                  : null;
                r.certificationExpiry = d.certification_expiry
                  ? new Date(d.certification_expiry as string).getTime()
                  : null;
                r.specsJson = JSON.stringify(d.specifications ?? {});
                r.syncedAt = Date.now();
                r.updatedAt = Date.now();
              });
            }
          });
        } catch {
          // Cache update failed — not critical
        }
      } catch {
        // Offline — search cache
        const cached = await database.get<EquipmentCache>('equipment_cache').query().fetch();
        const match = cached.find((e: EquipmentCache) => e.tag === tag || e.serverId === tag);

        if (match) {
          equipResult = {
            found: true,
            source: 'cache',
            data: {
              tag: match.tag,
              name: match.name,
              type: match.equipmentType,
              status: match.status,
              location: match.location,
              lastInspection: match.lastInspectionDate
                ? new Date(match.lastInspectionDate).toLocaleDateString()
                : 'N/A',
              nextInspection: match.nextInspectionDate
                ? new Date(match.nextInspectionDate).toLocaleDateString()
                : 'N/A',
              certExpiry: match.certificationExpiry
                ? new Date(match.certificationExpiry).toLocaleDateString()
                : 'N/A',
              specs: {},
            },
          };
        }
      }

      setResult(equipResult);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error al buscar equipo');
    } finally {
      setLoading(false);
    }
  };

  const resetScan = () => {
    setResult(null);
    setScanning(true);
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Ionicons name="camera-outline" size={48} color={Colors.muted} />
          <Text style={styles.permText}>Se necesita permiso de cámara</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Dar permiso</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escanear Equipo</Text>
      </View>

      {scanning && !result ? (
        <>
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13'] }}
              onBarcodeScanned={handleBarCodeScanned}
            >
              <View style={styles.overlay}>
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
              </View>
            </CameraView>
          </View>
          <Text style={styles.hint}>Escanea el QR o código de barras del equipo</Text>
        </>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Buscando equipo…</Text>
        </View>
      ) : result ? (
        <ScrollView contentContainerStyle={styles.resultContent}>
          {result.found && result.data ? (
            <>
              {/* Source indicator */}
              <View style={styles.sourceBadge}>
                <Ionicons
                  name={result.source === 'online' ? 'cloud-done' : 'download-outline'}
                  size={14}
                  color={result.source === 'online' ? Colors.success : Colors.warning}
                />
                <Text style={styles.sourceText}>
                  {result.source === 'online' ? 'Datos en línea' : 'Datos en caché (offline)'}
                </Text>
              </View>

              {/* Equipment card */}
              <View style={styles.equipCard}>
                <View style={styles.equipHeader}>
                  <View style={styles.equipIcon}>
                    <Ionicons name="hardware-chip-outline" size={32} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.equipName}>{result.data.name}</Text>
                    <Text style={styles.equipTag}>TAG: {result.data.tag}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[result.data.status] ?? Colors.muted) + '22' }]}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[result.data.status] ?? Colors.muted }]} />
                    <Text style={[styles.statusText, { color: STATUS_COLORS[result.data.status] ?? Colors.muted }]}>
                      {result.data.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Details */}
              <View style={styles.detailsCard}>
                <DetailRow icon="construct-outline" label="Tipo" value={result.data.type} />
                <DetailRow icon="location-outline" label="Ubicación" value={result.data.location} />
                <DetailRow icon="search-outline" label="Última inspección" value={result.data.lastInspection} />
                <DetailRow icon="calendar-outline" label="Próxima inspección" value={result.data.nextInspection} />
                <DetailRow icon="ribbon-outline" label="Cert. vence" value={result.data.certExpiry} />
              </View>

              {/* Action buttons */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/(tabs)/forms')}
                activeOpacity={0.8}
              >
                <Ionicons name="clipboard-outline" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Iniciar Inspección</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.notFound}>
              <Ionicons name="search-outline" size={64} color={Colors.muted} />
              <Text style={styles.notFoundTitle}>Equipo no encontrado</Text>
              <Text style={styles.notFoundText}>
                No se encontró el equipo en el servidor ni en la caché local.
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.rescanBtn} onPress={resetScan} activeOpacity={0.8}>
            <Ionicons name="scan-outline" size={20} color={Colors.primary} />
            <Text style={styles.rescanBtnText}>Escanear otro equipo</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <Ionicons name={icon} size={16} color={Colors.muted} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: { marginRight: Spacing.md },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.foreground },

  cameraWrap: { flex: 1, marginHorizontal: Spacing.lg, borderRadius: Radius.lg, overflow: 'hidden' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  scanFrame: { width: 260, height: 160, position: 'relative' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: Colors.success, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },

  hint: { textAlign: 'center', color: Colors.muted, fontSize: FontSize.sm, marginVertical: Spacing.lg },
  loadingText: { color: Colors.muted, fontSize: FontSize.sm },

  resultContent: { padding: Spacing.lg, paddingBottom: 100 },

  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
  },
  sourceText: { fontSize: FontSize.xs, color: Colors.muted },

  equipCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  equipHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  equipIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  equipName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.foreground },
  equipTag: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },

  detailsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '33',
  },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  detailLabel: { fontSize: FontSize.sm, color: Colors.muted },
  detailValue: { fontSize: FontSize.sm, color: Colors.foreground, fontWeight: '600' },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  actionBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },

  notFound: { alignItems: 'center', marginTop: 40, marginBottom: 40, gap: Spacing.md },
  notFoundTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.foreground },
  notFoundText: { fontSize: FontSize.sm, color: Colors.muted, textAlign: 'center' },

  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  rescanBtnText: { color: Colors.primary, fontSize: FontSize.base, fontWeight: '600' },

  permText: { color: Colors.muted, fontSize: FontSize.sm, textAlign: 'center' },
  permBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  permBtnText: { color: '#fff', fontWeight: '700' },
});
