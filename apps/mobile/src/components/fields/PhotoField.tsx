/**
 * PhotoField — camera + gallery picker with multi-photo support and compression.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

interface PhotoFieldProps {
  value: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  label?: string;
}

export function PhotoField({ value = [], onChange, maxPhotos = 5, label }: PhotoFieldProps) {
  const [loading, setLoading] = useState(false);

  const compress = async (uri: string): Promise<string> => {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara');
        return;
      }
      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const compressed = await compress(result.assets[0].uri);
        onChange([...value, compressed]);
      }
    } catch {
      Alert.alert('Error', 'No se pudo tomar la foto');
    } finally {
      setLoading(false);
    }
  };

  const pickPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la galería');
        return;
      }
      setLoading(true);
      const remaining = maxPhotos - value.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
      });
      if (!result.canceled) {
        const uris: string[] = [];
        for (const asset of result.assets) {
          uris.push(await compress(asset.uri));
        }
        onChange([...value, ...uris]);
      }
    } catch {
      Alert.alert('Error', 'No se pudieron seleccionar fotos');
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <FlatList
        data={value}
        horizontal
        keyExtractor={(_: string, i: number) => String(i)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photosList}
        renderItem={({ item, index }: { item: string; index: number }) => (
          <View style={styles.photoWrap}>
            <Image source={{ uri: item }} style={styles.thumb} />
            <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(index)}>
              <Ionicons name="close-circle" size={22} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          value.length < maxPhotos ? (
            <View style={styles.addBtns}>
              <TouchableOpacity style={styles.addBtn} onPress={takePhoto} disabled={loading}>
                <Ionicons name="camera" size={22} color={Colors.primary} />
                <Text style={styles.addBtnText}>Cámara</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={pickPhotos} disabled={loading}>
                <Ionicons name="images" size={22} color={Colors.primary} />
                <Text style={styles.addBtnText}>Galería</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <Text style={styles.counter}>{value.length}/{maxPhotos} fotos</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.foreground },
  photosList: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  photoWrap: { position: 'relative' },
  thumb: { width: 88, height: 88, borderRadius: Radius.sm },
  removeBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: Colors.background, borderRadius: 11 },
  addBtns: { flexDirection: 'row', gap: Spacing.sm },
  addBtn: {
    width: 88,
    height: 88,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    borderStyle: 'dashed',
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: { fontSize: FontSize.xs, color: Colors.primary },
  counter: { fontSize: FontSize.xs, color: Colors.muted, textAlign: 'right' },
});
