/**
 * Permit Scan — QR scanner to verify work permits.
 * Shows green/red/yellow status card based on permit validity.
 * Works offline with cached permits.
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

import { database, PermitCache } from '@/db';
import { api } from '@/lib/api';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

type PermitStatus = 'valid' | 'expired' | 'revoked' | 'unknown';

interface PermitResult {
  status: PermitStatus;
  permit: PermitCache | null;
  serverData?: Record<string, unknown>;
}

const STATUS_CONFIG: Record<PermitStatus, { color: string; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }> = {
  valid: { color: Colors.success, icon: 'checkmark-circle', label: 'PERMISO VÁLIDO' },
  expired: { color: Colors.danger, icon: 'close-circle', label: 'PERMISO EXPIRADO' },
  revoked: { color: Colors.danger, icon: 'ban', label: 'PERMISO REVOCADO' },
  unknown: { color: Colors.warning, icon: 'help-circle', label: 'PERMISO NO ENCONTRADO' },
};

export default function PermitScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PermitResult | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!scanning || loading) return;
    setScanning(false);
    setLoading(true);

    try {
      // Extract QR token — supports full URLs or plain tokens
      let qrToken = data;
      if (data.includes('/qr/')) {
        qrToken = data.split('/qr/').pop() ?? data;
      }

      // Try online first
      let permitResult: PermitResult = { status: 'unknown', permit: null };

      try {
        const serverData = await api.permits.validateQr(qrToken);
        const status = (serverData as any)?.status;
        const isValid = status === 'active' || status === 'approved';
        const isExpired = status === 'expired';
        permitResult = {
          status: isValid ? 'valid' : isExpired ? 'expired' : 'revoked',
          permit: null,
          serverData: serverData as Record<string, unknown>,
        };
      } catch {
        // Offline — search local cache
        const cached = await database.get<PermitCache>('permits_cache').query().fetch();
        const match = cached.find((p: PermitCache) => p.qrToken === qrToken || p.serverId === qrToken);

        if (match) {
          const now = Date.now();
          const isValid = match.status === 'active' && match.validUntil > now;
          const isExpired = match.validUntil < now;
          permitResult = {
            status: isValid ? 'valid' : isExpired ? 'expired' : 'revoked',
            permit: match,
          };
        }
      }

      setResult(permitResult);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error al verificar');
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
          <Text style={styles.permText}>Se necesita permiso de cámara para escanear QR</Text>
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
        <Text style={styles.headerTitle}>Verificar Permiso</Text>
      </View>

      {scanning && !result ? (
        <>
          {/* Camera scanner */}
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
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
          <Text style={styles.hint}>Apunta la cámara al código QR del permiso</Text>
        </>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Verificando permiso…</Text>
        </View>
      ) : result ? (
        <ScrollView contentContainerStyle={styles.resultContent}>
          {/* Status card */}
          <View style={[styles.statusCard, { borderColor: STATUS_CONFIG[result.status].color }]}>
            <Ionicons
              name={STATUS_CONFIG[result.status].icon}
              size={64}
              color={STATUS_CONFIG[result.status].color}
            />
            <Text style={[styles.statusLabel, { color: STATUS_CONFIG[result.status].color }]}>
              {STATUS_CONFIG[result.status].label}
            </Text>
          </View>

          {/* Permit details */}
          {(result.permit || result.serverData) && (
            <View style={styles.detailsCard}>
              <DetailRow label="Número" value={
                result.permit?.permitNumber ?? (result.serverData?.permit_number as string) ?? '—'
              } />
              <DetailRow label="Tipo" value={
                result.permit?.permitType ?? (result.serverData?.permit_type as string) ?? '—'
              } />
              <DetailRow label="Título" value={
                result.permit?.title ?? (result.serverData?.title as string) ?? '—'
              } />
              <DetailRow label="Ubicación" value={
                result.permit?.location ?? (result.serverData?.location as string) ?? '—'
              } />
              <DetailRow label="Emitido a" value={
                result.permit?.issuedToName ?? (result.serverData?.issued_to_name as string) ?? '—'
              } />
              <DetailRow label="Válido desde" value={
                result.permit ? new Date(result.permit.validFrom).toLocaleString() :
                result.serverData?.valid_from ? new Date(result.serverData.valid_from as string).toLocaleString() : '—'
              } />
              <DetailRow label="Válido hasta" value={
                result.permit ? new Date(result.permit.validUntil).toLocaleString() :
                result.serverData?.valid_until ? new Date(result.serverData.valid_until as string).toLocaleString() : '—'
              } />
            </View>
          )}

          <TouchableOpacity style={styles.rescanBtn} onPress={resetScan} activeOpacity={0.8}>
            <Ionicons name="scan-outline" size={20} color="#fff" />
            <Text style={styles.rescanBtnText}>Escanear otro permiso</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

// Detail row component
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  scanFrame: { width: 240, height: 240, position: 'relative' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: Colors.primary, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },

  hint: { textAlign: 'center', color: Colors.muted, fontSize: FontSize.sm, marginVertical: Spacing.lg },

  loadingText: { color: Colors.muted, fontSize: FontSize.sm },

  resultContent: { padding: Spacing.lg, paddingBottom: 100 },

  statusCard: {
    alignItems: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 2,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statusLabel: { fontSize: FontSize.xl, fontWeight: '800' },

  detailsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '33',
  },
  detailLabel: { fontSize: FontSize.sm, color: Colors.muted, fontWeight: '600' },
  detailValue: { fontSize: FontSize.sm, color: Colors.foreground, maxWidth: '60%', textAlign: 'right' },

  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: Radius.md,
  },
  rescanBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },

  permText: { color: Colors.muted, fontSize: FontSize.sm, textAlign: 'center' },
  permBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  permBtnText: { color: '#fff', fontWeight: '700' },
});
