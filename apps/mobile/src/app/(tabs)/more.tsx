/**
 * More tab — profile, settings, about, logout.
 */

import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/auth-store';
import { useSyncStore } from '@/stores/sync-store';
import { SyncEngine } from '@/sync/SyncEngine';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  icon: IoniconsName;
  label: string;
  detail?: string;
  onPress: () => void;
  danger?: boolean;
}

export default function MoreScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { status, lastSynced, pendingCount } = useSyncStore();

  const handleSync = async () => {
    await SyncEngine.syncOnConnect();
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Sincronización',
      items: [
        {
          icon: 'cloud-outline',
          label: 'Estado',
          detail: status === 'offline' ? 'Sin conexión' : status === 'syncing' ? 'Sincronizando…' : 'Conectado',
          onPress: handleSync,
        },
        {
          icon: 'time-outline',
          label: 'Última sincronización',
          detail: lastSynced ? new Date(lastSynced).toLocaleString() : 'Nunca',
          onPress: handleSync,
        },
        {
          icon: 'cloud-upload-outline',
          label: 'Pendientes',
          detail: `${pendingCount} elemento${pendingCount !== 1 ? 's' : ''}`,
          onPress: handleSync,
        },
      ],
    },
    {
      title: 'Cuenta',
      items: [
        {
          icon: 'person-outline',
          label: 'Perfil',
          detail: user?.full_name ?? '',
          onPress: () => {},
        },
        {
          icon: 'mail-outline',
          label: 'Email',
          detail: user?.email ?? '',
          onPress: () => {},
        },
        {
          icon: 'business-outline',
          label: 'Rol',
          detail: user?.role ?? '',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'App',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'Versión',
          detail: '0.1.0',
          onPress: () => {},
        },
        {
          icon: 'log-out-outline',
          label: 'Cerrar sesión',
          onPress: handleLogout,
          danger: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar header */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.full_name ?? 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.full_name ?? 'Usuario'}</Text>
          <Text style={styles.userSite}>{user?.site_name ?? 'Sin sitio'}</Text>
        </View>

        {/* Sections */}
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, idx < section.items.length - 1 && styles.menuItemBorder]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon} size={20} color={item.danger ? Colors.danger : Colors.foreground} />
                  <Text style={[styles.menuLabel, item.danger && { color: Colors.danger }]}>{item.label}</Text>
                  {item.detail && <Text style={styles.menuDetail}>{item.detail}</Text>}
                  <Ionicons name="chevron-forward" size={16} color={Colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 100 },

  avatarSection: { alignItems: 'center', marginBottom: Spacing.xxl },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: { fontSize: FontSize.xxl, fontWeight: '800', color: '#fff' },
  userName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.foreground },
  userSite: { fontSize: FontSize.sm, color: Colors.muted, marginTop: 2 },

  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: '600', textTransform: 'uppercase', marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  sectionCard: { backgroundColor: Colors.card, borderRadius: Radius.md },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border + '44' },
  menuLabel: { fontSize: FontSize.base, color: Colors.foreground, fontWeight: '500' },
  menuDetail: { flex: 1, fontSize: FontSize.sm, color: Colors.muted, textAlign: 'right' },
});
