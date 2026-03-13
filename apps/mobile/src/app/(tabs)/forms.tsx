/**
 * Forms list — shows cached form templates, search, navigate to runner.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { database, FormCache } from '@/db';
import { SyncEngine } from '@/sync/SyncEngine';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  inspection: 'search-outline',
  audit: 'clipboard-outline',
  checklist: 'checkbox-outline',
  risk: 'alert-circle-outline',
  permit: 'ribbon-outline',
  default: 'document-text-outline',
};

export default function FormsScreen() {
  const router = useRouter();
  const [forms, setForms] = useState<FormCache[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadForms = useCallback(async () => {
    try {
      const all = await database.get<FormCache>('forms_cache').query().fetch();
      setForms(all.filter((f: FormCache) => f.isActive));
    } catch {
      // DB not ready
    }
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const onRefresh = async () => {
    setRefreshing(true);
    await SyncEngine.syncOnConnect();
    await loadForms();
    setRefreshing(false);
  };

  const filtered = search.trim()
    ? forms.filter(
        (f) =>
          f.title.toLowerCase().includes(search.toLowerCase()) ||
          f.category.toLowerCase().includes(search.toLowerCase()),
      )
    : forms;

  const renderItem = ({ item }: { item: FormCache }) => {
    const iconName = CATEGORY_ICONS[item.category] ?? CATEGORY_ICONS.default;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/form/[id]', params: { id: item.id } })}
        activeOpacity={0.7}
      >
        <View style={styles.cardIcon}>
          <Ionicons name={iconName} size={24} color={Colors.primary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description || 'Sin descripción'}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardCategory}>{item.category || 'General'}</Text>
            <Text style={styles.cardVersion}>v{item.version}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Formularios</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar formulario…"
          placeholderTextColor={Colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item: FormCache) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cloud-download-outline" size={48} color={Colors.muted} />
            <Text style={styles.emptyText}>
              No hay formularios en caché.{'\n'}Desliza hacia abajo para sincronizar.
            </Text>
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

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: FontSize.base, color: Colors.foreground },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.foreground },
  cardDesc: { fontSize: FontSize.sm, color: Colors.muted, marginTop: 2 },
  cardMeta: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  cardCategory: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    backgroundColor: Colors.primary + '18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  cardVersion: { fontSize: FontSize.xs, color: Colors.muted },

  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  emptyText: { fontSize: FontSize.sm, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
});
