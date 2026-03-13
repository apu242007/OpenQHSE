/**
 * SignatureCanvas — touch-based signature capture using WebView.
 * Saves as base64 PNG.
 */

import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';

import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

interface SignatureCanvasProps {
  value: string | null;
  onChange: (signature: string | null) => void;
  label?: string;
}

export function SignatureCanvas({ value, onChange, label }: SignatureCanvasProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const ref = useRef<SignatureViewRef>(null);

  const handleOK = (signature: string) => {
    onChange(signature);
    setModalVisible(false);
  };

  const handleClear = () => {
    ref.current?.clearSignature();
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const webStyle = `
    .m-signature-pad { box-shadow: none; border: none; }
    .m-signature-pad--body { border: none; }
    .m-signature-pad--footer { display: none; margin: 0px; }
    body, html { width: 100%; height: 100%; }
  `;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      {value ? (
        <View style={styles.preview}>
          <Image source={{ uri: value }} style={styles.previewImage} resizeMode="contain" />
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="pencil" size={16} color={Colors.primary} />
              <Text style={styles.actionText}>Re-firmar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onChange(null)}>
              <Ionicons name="trash" size={16} color={Colors.danger} />
              <Text style={[styles.actionText, { color: Colors.danger }]}>Borrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.placeholder} onPress={() => setModalVisible(true)}>
          <Ionicons name="pencil-outline" size={32} color={Colors.primary} />
          <Text style={styles.placeholderText}>Toca para firmar</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Firma</Text>
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.modalClear}>Limpiar</Text>
            </TouchableOpacity>
          </View>

          <SignatureScreen
            ref={ref}
            onOK={handleOK}
            webStyle={webStyle}
            backgroundColor="#fff"
            penColor="#000"
            dotSize={2}
            minWidth={1.5}
            maxWidth={3}
          />

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => ref.current?.readSignature()}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.confirmBtnText}>Confirmar Firma</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.foreground },

  placeholder: {
    height: 120,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    borderStyle: 'dashed',
    backgroundColor: Colors.primary + '08',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  placeholderText: { fontSize: FontSize.sm, color: Colors.primary },

  preview: { gap: Spacing.sm },
  previewImage: {
    height: 120,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
  },
  previewActions: { flexDirection: 'row', gap: Spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },

  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: '#000' },
  modalCancel: { fontSize: FontSize.base, color: Colors.danger },
  modalClear: { fontSize: FontSize.base, color: Colors.primary },

  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
    height: 52,
    marginHorizontal: Spacing.lg,
    marginBottom: 40,
    borderRadius: Radius.md,
  },
  confirmBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
});
