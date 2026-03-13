/**
 * Home screen — quick actions, pending items, sync status.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/auth-store';
import { useSyncStore } from '@/stores/sync-store';
import { SyncEngine } from '@/sync/SyncEngine';
import { database } from '@/db';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface QuickAction {
  icon: IoniconsName;
  label: string;
  color: string;
  route: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: 'alert-circle', label: 'Reportar\nIncidente', color: Colors.danger, route: '/incident/report' },
  { icon: 'document-text', label: 'Inspección\nRápida', color: Colors.primary, route: '/(tabs)/forms' },
  { icon: 'qr-code', label: 'Escanear\nPermiso', color: Colors.warning, route: '/permit/scan' },
  { icon: 'hardware-chip', label: 'Escanear\nEquipo', color: Colors.success, route: '/equipment/scan' },
];

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { status, pendingCount, lastSynced } = useSyncStore();

  const [refreshing, setRefreshing] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [pendingIncidents, setPendingIncidents] = useState(0);
  const [cachedForms, setCachedForms] = useState(0);

  const loadCounts = useCallback(async () => {
    try {
      const subs = await database.get('submissions_queue').query().fetchCount();
      const incs = await database.get('incidents_queue').query().fetchCount();
      const forms = await database.get('forms_cache').query().fetchCount();
      setPendingSubmissions(subs);
      setPendingIncidents(incs);
      setCachedForms(forms);
    } catch {
      // DB may not be ready yet
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await SyncEngine.syncOnConnect();
    await loadCounts();
    setRefreshing(false);
  };

  const syncColor =
    status === 'syncing'
      ? Colors.primary
      : status === 'offline'
        ? Colors.syncOffline
        : status === 'error'
          ? Colors.danger
          : Colors.syncOk;

  const syncLabel =
    status === 'syncing'
      ? 'Sincronizando…'
      : status === 'offline'
        ? 'Sin conexión'
        : status === 'error'
          ? 'Error de sincronización'
          : lastSynced
            ? `Sincronizado ${new Date(lastSynced).toLocaleTimeString()}`
            : 'Conectado';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {user?.full_name?.split(' ')[0] ?? 'Usuario'} 👋</Text>
            <Text style={styles.site}>{user?.site_name ?? 'Sin sitio asignado'}</Text>
          </View>
          <View style={[styles.syncBadge, { backgroundColor: syncColor + '22' }]}>
            <View style={[styles.syncDot, { backgroundColor: syncColor }]} />
            <Text style={[styles.syncText, { color: syncColor }]}>{syncLabel}</Text>
          </View>
        </View>

        {/* Pending banner */}
        {pendingCount > 0 && (
          <TouchableOpacity style={styles.pendingBanner} onPress={onRefresh} activeOpacity={0.8}>
            <Ionicons name="cloud-upload-outline" size={20} color={Colors.warning} />
            <Text style={styles.pendingText}>
              {pendingCount} elemento{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''} de sincronización
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
          </TouchableOpacity>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickCard}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickIcon, { backgroundColor: action.color + '22' }]}>
                <Ionicons name={action.icon} size={28} color={action.color} />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Resumen</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{cachedForms}</Text>
            <Text style={styles.statLabel}>Formularios</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pendingSubmissions}</Text>
            <Text style={styles.statLabel}>Envíos pend.</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pendingIncidents}</Text>
            <Text style={styles.statLabel}>Incidentes pend.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  greeting: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.foreground },
  site: { fontSize: FontSize.sm, color: Colors.muted, marginTop: 2 },

  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: 6,
  },
  syncDot: { width: 8, height: 8, borderRadius: 4 },
  syncText: { fontSize: FontSize.xs, fontWeight: '600' },

  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    borderWidth: 1,
    borderColor: Colors.warning + '44',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  pendingText: { flex: 1, fontSize: FontSize.sm, color: Colors.foreground },

  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  quickCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLabel: { fontSize: FontSize.sm, color: Colors.foreground, textAlign: 'center', fontWeight: '600' },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statNumber: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 4, textAlign: 'center' },
});
