/**
 * Incidents tab — lists cached incidents, report button.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { database, IncidentQueue } from '@/db';
import { SyncEngine } from '@/sync/SyncEngine';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

const SEVERITY_COLORS: Record<string, string> = {
  critical: Colors.danger,
  high: '#f97316',
  medium: Colors.warning,
  low: Colors.info,
};

export default function IncidentsScreen() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<IncidentQueue[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await database.get<IncidentQueue>('incidents_queue').query().fetch();
      setIncidents(all.sort((a: IncidentQueue, b: IncidentQueue) => b.createdAt - a.createdAt));
    } catch {
      // DB not ready
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await SyncEngine.syncOnConnect();
    await load();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: IncidentQueue }) => {
    const sevColor = SEVERITY_COLORS[item.severity] ?? Colors.muted;
    return (
      <View style={styles.card}>
        <View style={[styles.severityBar, { backgroundColor: sevColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            {item.pendingSync ? (
              <View style={styles.pendingBadge}>
                <Ionicons name="cloud-upload-outline" size={12} color={Colors.warning} />
                <Text style={styles.pendingLabel}>Pendiente</Text>
              </View>
            ) : (
              <View style={styles.syncedBadge}>
                <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                <Text style={styles.syncedLabel}>Sincronizado</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          <View style={styles.cardMeta}>
            <Text style={[styles.severityLabel, { color: sevColor }]}>{item.severity.toUpperCase()}</Text>
            <Text style={styles.metaText}>{item.incidentType}</Text>
            <Text style={styles.metaText}>{new Date(item.occurredAt).toLocaleDateString()}</Text>
          </View>
          {item.syncError ? (
            <Text style={styles.errorText}>⚠ {item.syncError}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Incidentes</Text>
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => router.push('/incident/report')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.reportBtnText}>Reportar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={incidents}
        keyExtractor={(item: IncidentQueue) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shield-checkmark-outline" size={48} color={Colors.success} />
            <Text style={styles.emptyText}>No hay incidentes registrados.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.foreground },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: 4,
  },
  reportBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },

  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  severityBar: { width: 4 },
  cardContent: { flex: 1, padding: Spacing.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.foreground, flex: 1, marginRight: Spacing.sm },
  pendingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.warning + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  pendingLabel: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: '600' },
  syncedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.success + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  syncedLabel: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '600' },
  cardDesc: { fontSize: FontSize.sm, color: Colors.muted, marginTop: 4 },
  cardMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  severityLabel: { fontSize: FontSize.xs, fontWeight: '800' },
  metaText: { fontSize: FontSize.xs, color: Colors.muted },
  errorText: { fontSize: FontSize.xs, color: Colors.danger, marginTop: Spacing.xs },

  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  emptyText: { fontSize: FontSize.sm, color: Colors.muted, textAlign: 'center' },
});
