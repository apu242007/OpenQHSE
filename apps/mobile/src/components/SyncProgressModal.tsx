/**
 * SyncProgressModal — full-screen modal with progress bars per data type.
 */

import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSyncStore } from '@/stores/sync-store';
import { SyncEngine } from '@/sync/SyncEngine';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

interface SyncProgressModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SyncProgressModal({ visible, onClose }: SyncProgressModalProps) {
  const { status, progress, pendingCount, lastSynced, error } = useSyncStore();

  const handleForceSync = async () => {
    await SyncEngine.syncOnConnect();
  };

  const isSyncing = status === 'syncing';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Sincronización</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Status */}
          <View style={styles.statusCard}>
            {isSyncing ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons
                name={
                  status === 'error' ? 'alert-circle' :
                  status === 'offline' ? 'cloud-offline' :
                  'checkmark-circle'
                }
                size={24}
                color={
                  status === 'error' ? Colors.danger :
                  status === 'offline' ? Colors.warning :
                  Colors.success
                }
              />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.statusText}>
                {isSyncing ? 'Sincronizando datos…' :
                 status === 'error' ? 'Error en sincronización' :
                 status === 'offline' ? 'Sin conexión' :
                 'Sincronizado'}
              </Text>
              {lastSynced && (
                <Text style={styles.lastSync}>
                  Última vez: {new Date(lastSynced).toLocaleString()}
                </Text>
              )}
            </View>
          </View>

          {/* Overall progress */}
          {isSyncing && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progreso general</Text>
                <Text style={styles.progressPercent}>{progress}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
          )}

          {/* Data categories */}
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionLabel}>Datos</Text>

            <DataRow
              icon="document-text-outline"
              label="Formularios enviados"
              status={isSyncing && progress < 40 ? 'syncing' : 'idle'}
            />
            <DataRow
              icon="alert-circle-outline"
              label="Incidentes reportados"
              status={isSyncing && progress >= 40 && progress < 60 ? 'syncing' : 'idle'}
            />
            <DataRow
              icon="download-outline"
              label="Datos descargados"
              status={isSyncing && progress >= 60 ? 'syncing' : 'idle'}
            />
          </View>

          {/* Pending count */}
          <View style={styles.pendingCard}>
            <Ionicons name="cloud-upload-outline" size={20} color={Colors.warning} />
            <Text style={styles.pendingText}>
              {pendingCount} elemento{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={16} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Action button */}
          <TouchableOpacity
            style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]}
            onPress={handleForceSync}
            disabled={isSyncing}
            activeOpacity={0.8}
          >
            <Ionicons name={isSyncing ? 'hourglass-outline' : 'sync-outline'} size={20} color="#fff" />
            <Text style={styles.syncBtnText}>
              {isSyncing ? 'Sincronizando…' : 'Forzar sincronización'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function DataRow({
  icon,
  label,
  status,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  status: 'syncing' | 'idle';
}) {
  return (
    <View style={styles.dataRow}>
      <Ionicons name={icon} size={18} color={Colors.muted} />
      <Text style={styles.dataLabel}>{label}</Text>
      {status === 'syncing' ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <Ionicons name="checkmark" size={16} color={Colors.success} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: 40,
    maxHeight: '85%',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.foreground },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statusText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.foreground },
  lastSync: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },

  progressSection: { marginBottom: Spacing.lg },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  progressLabel: { fontSize: FontSize.sm, color: Colors.muted },
  progressPercent: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: Colors.surface, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },

  categoriesSection: { marginBottom: Spacing.lg },
  sectionLabel: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '33',
  },
  dataLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.foreground },

  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.warning + '12',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  pendingText: { fontSize: FontSize.sm, color: Colors.foreground },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.danger + '12',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: { flex: 1, fontSize: FontSize.sm, color: Colors.danger },

  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: Radius.md,
  },
  syncBtnDisabled: { opacity: 0.6 },
  syncBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
});
