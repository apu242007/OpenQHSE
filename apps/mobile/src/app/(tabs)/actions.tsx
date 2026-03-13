/**
 * Actions tab — lists assigned corrective/preventive actions.
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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { database, ActionCache } from '@/db';
import { SyncEngine } from '@/sync/SyncEngine';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

const STATUS_CONFIG: Record<string, { color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  pending: { color: Colors.warning, icon: 'time-outline' },
  in_progress: { color: Colors.primary, icon: 'play-outline' },
  completed: { color: Colors.success, icon: 'checkmark-circle-outline' },
  overdue: { color: Colors.danger, icon: 'alert-circle-outline' },
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: Colors.danger,
  high: '#f97316',
  medium: Colors.warning,
  low: Colors.info,
};

export default function ActionsScreen() {
  const [actions, setActions] = useState<ActionCache[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const all = await database.get<ActionCache>('actions_cache').query().fetch();
      setActions(all.sort((a: ActionCache, b: ActionCache) => {
        // Overdue first, then by due date
        const aDue = a.dueDate ?? Infinity;
        const bDue = b.dueDate ?? Infinity;
        return aDue - bDue;
      }));
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

  const filtered = filter ? actions.filter((a) => a.status === filter) : actions;

  const filters = ['pending', 'in_progress', 'completed', 'overdue'] as const;

  const renderItem = ({ item }: { item: ActionCache }) => {
    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
    const priColor = PRIORITY_COLORS[item.priority] ?? Colors.muted;
    const dueDate = item.dueDate ? new Date(item.dueDate) : null;
    const isOverdue = dueDate ? dueDate.getTime() < Date.now() && item.status !== 'completed' : false;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name={cfg.icon} size={20} color={isOverdue ? Colors.danger : cfg.color} />
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.priBadge, { backgroundColor: priColor + '22' }]}>
            <Text style={[styles.priText, { color: priColor }]}>{item.priority}</Text>
          </View>
        </View>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.metaText}>
            <Ionicons name="person-outline" size={12} color={Colors.muted} /> {item.assignedToName}
          </Text>
          {dueDate && (
            <Text style={[styles.metaText, isOverdue && { color: Colors.danger }]}>
              <Ionicons name="calendar-outline" size={12} color={isOverdue ? Colors.danger : Colors.muted} />{' '}
              {dueDate.toLocaleDateString()}
            </Text>
          )}
          <Text style={styles.metaText}>{item.sourceType}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Acciones</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[styles.chip, !filter && styles.chipActive]}
          onPress={() => setFilter(null)}
        >
          <Text style={[styles.chipText, !filter && styles.chipTextActive]}>Todas</Text>
        </TouchableOpacity>
        {filters.map((f) => {
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(active ? null : f)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: ActionCache) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-outline" size={48} color={Colors.success} />
            <Text style={styles.emptyText}>No hay acciones asignadas.</Text>
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
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.foreground },

  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
  },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, color: Colors.muted, textTransform: 'capitalize', fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { flex: 1, fontSize: FontSize.base, fontWeight: '700', color: Colors.foreground },
  priBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  priText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  cardDesc: { fontSize: FontSize.sm, color: Colors.muted, marginTop: Spacing.xs },
  cardMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm, flexWrap: 'wrap' },
  metaText: { fontSize: FontSize.xs, color: Colors.muted },

  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  emptyText: { fontSize: FontSize.sm, color: Colors.muted, textAlign: 'center' },
});
