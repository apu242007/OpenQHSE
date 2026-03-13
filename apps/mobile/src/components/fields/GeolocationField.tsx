/**
 * GeolocationField — auto GPS with mini coordinate display.
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

interface GeoValue {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

interface GeolocationFieldProps {
  value: GeoValue | null;
  onChange: (geo: GeoValue) => void;
  label?: string;
}

export function GeolocationField({ value, onChange, label }: GeolocationFieldProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLocation = async () => {
    setLoading(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permiso de ubicación no concedido');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      let address = '';
      try {
        const [addr] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (addr) {
          address = [addr.street, addr.city, addr.region].filter(Boolean).join(', ');
        }
      } catch {
        // Reverse geocode optional
      }

      onChange({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? undefined,
        address,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de ubicación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!value) fetchLocation();
  }, []);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.card}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Obteniendo ubicación…</Text>
          </View>
        ) : value ? (
          <>
            <View style={styles.coordsRow}>
              <Ionicons name="location" size={20} color={Colors.success} />
              <View>
                <Text style={styles.coordsText}>
                  {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
                </Text>
                {value.accuracy != null && (
                  <Text style={styles.accuracyText}>
                    Precisión: ±{value.accuracy.toFixed(0)}m
                  </Text>
                )}
              </View>
            </View>
            {value.address ? (
              <Text style={styles.addressText}>{value.address}</Text>
            ) : null}
          </>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <TouchableOpacity style={styles.refreshBtn} onPress={fetchLocation} disabled={loading}>
          <Ionicons name="refresh" size={16} color={Colors.primary} />
          <Text style={styles.refreshText}>Actualizar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.foreground },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  loadingText: { fontSize: FontSize.sm, color: Colors.muted },

  coordsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  coordsText: { fontSize: FontSize.sm, color: Colors.foreground, fontWeight: '600' },
  accuracyText: { fontSize: FontSize.xs, color: Colors.muted },
  addressText: { fontSize: FontSize.sm, color: Colors.muted, marginLeft: 28 },

  errorText: { fontSize: FontSize.sm, color: Colors.danger },

  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: Spacing.xs,
  },
  refreshText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
});
