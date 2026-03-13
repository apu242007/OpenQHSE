/**
 * AudioField — record and play audio notes using expo-av.
 */

import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

interface AudioFieldProps {
  value: string | null;
  onChange: (uri: string | null) => void;
  label?: string;
  maxDuration?: number; // seconds
}

export function AudioField({ value, onChange, label, maxDuration = 120 }: AudioFieldProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Se necesita acceso al micrófono');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(rec);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => {
          if (d >= maxDuration - 1) {
            stopRecording();
            return d;
          }
          return d + 1;
        });
      }, 1000);
    } catch (err) {
      Alert.alert('Error', 'No se pudo iniciar la grabación');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) onChange(uri);
    } catch {
      setRecording(null);
    }
  };

  const playRecording = async () => {
    if (!value) return;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync({ uri: value });
      soundRef.current = sound;
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status: { isLoaded: boolean; didJustFinish?: boolean }) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
      await sound.playAsync();
    } catch {
      Alert.alert('Error', 'No se pudo reproducir el audio');
    }
  };

  const stopPlaying = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    onChange(null);
    setDuration(0);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.card}>
        {isRecording ? (
          <View style={styles.recordingRow}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Grabando… {formatTime(duration)}</Text>
            <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
              <Ionicons name="stop" size={24} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        ) : value ? (
          <View style={styles.playbackRow}>
            <TouchableOpacity
              style={styles.playBtn}
              onPress={isPlaying ? stopPlaying : playRecording}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.playInfo}>
              <Text style={styles.playText}>Audio grabado</Text>
              <Text style={styles.playDuration}>{formatTime(duration)}</Text>
            </View>
            <TouchableOpacity onPress={deleteRecording}>
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
            </TouchableOpacity>
            <TouchableOpacity onPress={startRecording}>
              <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.startRow} onPress={startRecording}>
            <View style={styles.micCircle}>
              <Ionicons name="mic" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.startText}>Toca para grabar audio</Text>
            <Text style={styles.maxText}>Máx. {formatTime(maxDuration)}</Text>
          </TouchableOpacity>
        )}
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
  },

  recordingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.danger,
  },
  recordingText: { flex: 1, fontSize: FontSize.base, color: Colors.danger, fontWeight: '600' },
  stopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.danger + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },

  playbackRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playInfo: { flex: 1 },
  playText: { fontSize: FontSize.sm, color: Colors.foreground, fontWeight: '600' },
  playDuration: { fontSize: FontSize.xs, color: Colors.muted },

  startRow: { alignItems: 'center', gap: Spacing.sm },
  micCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startText: { fontSize: FontSize.sm, color: Colors.foreground },
  maxText: { fontSize: FontSize.xs, color: Colors.muted },
});
