/**
 * OfflineIndicator — persistent banner showing connection status and pending sync count.
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSyncStore } from '@/stores/sync-store';
import { SyncEngine } from '@/sync/SyncEngine';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

export function OfflineIndicator() {
  const { status, pendingCount, progress } = useSyncStore();
  const [fadeAnim] = useState(new Animated.Value(0));

  // Show/hide with animation
  useEffect(() => {
    const shouldShow = status === 'offline' || status === 'syncing' || status === 'error' || pendingCount > 0;
    Animated.timing(fadeAnim, {
      toValue: shouldShow ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [status, pendingCount]);

  // Refresh pending count
  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await SyncEngine.getPendingCount();
      useSyncStore.getState().setPendingCount(count);
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const config = getConfig(status, pendingCount);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={16} color={config.color} />
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>

      {status === 'syncing' && (
        <View style={styles.progressWrap}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      )}

      {status === 'error' && (
        <TouchableOpacity style={styles.retryBtn} onPress={() => SyncEngine.syncOnConnect()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

function getConfig(status: string, pendingCount: number) {
  switch (status) {
    case 'offline':
      return {
        bg: Colors.danger + '18',
        color: Colors.danger,
        icon: 'cloud-offline-outline' as const,
        label: `Sin conexión${pendingCount > 0 ? ` · ${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}` : ''}`,
      };
    case 'syncing':
      return {
        bg: Colors.primary + '18',
        color: Colors.primary,
        icon: 'sync-outline' as const,
        label: 'Sincronizando…',
      };
    case 'error':
      return {
        bg: Colors.warning + '18',
        color: Colors.warning,
        icon: 'alert-circle-outline' as const,
        label: 'Error de sincronización',
      };
    default:
      if (pendingCount > 0) {
        return {
          bg: Colors.warning + '12',
          color: Colors.warning,
          icon: 'cloud-upload-outline' as const,
          label: `${pendingCount} pendiente${pendingCount > 1 ? 's' : ''} de envío`,
        };
      }
      return {
        bg: 'transparent',
        color: Colors.success,
        icon: 'checkmark-circle-outline' as const,
        label: '',
      };
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    gap: Spacing.xs,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  text: { fontSize: FontSize.xs, fontWeight: '600', flex: 1 },
  progressWrap: {
    width: 60,
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  retryBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    backgroundColor: Colors.warning + '33',
    borderRadius: Radius.sm,
  },
  retryText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.warning },
});
