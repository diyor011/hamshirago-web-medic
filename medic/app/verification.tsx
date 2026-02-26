import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text } from '@/components/Themed';
import { Theme } from '@/constants/Theme';
import { API_BASE } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';

type PhotoType = 'facePhoto' | 'licensePhoto';

export default function VerificationScreen() {
  const { medic, token, refreshProfile } = useAuth();
  const [faceUri, setFaceUri] = useState<string | null>(medic?.facePhotoUrl ?? null);
  const [licenseUri, setLicenseUri] = useState<string | null>(medic?.licensePhotoUrl ?? null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async (type: PhotoType) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа', 'Разрешите доступ к галерее в настройках.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'facePhoto') setFaceUri(result.assets[0].uri);
      else setLicenseUri(result.assets[0].uri);
    }
  };

  const takePhoto = async (type: PhotoType) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа', 'Разрешите доступ к камере в настройках.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'facePhoto') setFaceUri(result.assets[0].uri);
      else setLicenseUri(result.assets[0].uri);
    }
  };

  const showPickerOptions = (type: PhotoType, label: string) => {
    Alert.alert(`Загрузить: ${label}`, undefined, [
      { text: 'Камера', onPress: () => takePhoto(type) },
      { text: 'Из галереи', onPress: () => pickImage(type) },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    const hasNewFace = faceUri && !faceUri.startsWith('http');
    const hasNewLicense = licenseUri && !licenseUri.startsWith('http');

    if (!hasNewFace && !hasNewLicense) {
      Alert.alert('Ничего не выбрано', 'Выберите хотя бы одно фото для загрузки.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();

      if (hasNewFace && faceUri) {
        const ext = faceUri.split('.').pop() ?? 'jpg';
        formData.append('facePhoto', {
          uri: faceUri,
          name: `face.${ext}`,
          type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        } as unknown as Blob);
      }

      if (hasNewLicense && licenseUri) {
        const ext = licenseUri.split('.').pop() ?? 'jpg';
        formData.append('licensePhoto', {
          uri: licenseUri,
          name: `license.${ext}`,
          type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        } as unknown as Blob);
      }

      const res = await fetch(`${API_BASE}/medics/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `HTTP ${res.status}`);
      }

      await refreshProfile();
      Alert.alert(
        'Документы отправлены',
        'Ваши документы переданы на проверку. Обычно это занимает до 24 часов.',
      );
    } catch (e: unknown) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось загрузить документы');
    } finally {
      setUploading(false);
    }
  };

  const status = medic?.verificationStatus ?? 'PENDING';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Status banner */}
      <View style={[styles.statusBanner, statusBannerStyle(status)]}>
        <FontAwesome
          name={status === 'APPROVED' ? 'check-circle' : status === 'REJECTED' ? 'times-circle' : 'clock-o'}
          size={20}
          color={statusIconColor(status)}
        />
        <View style={styles.statusTexts}>
          <Text style={[styles.statusTitle, { color: statusIconColor(status) }]}>
            {STATUS_TITLE[status]}
          </Text>
          <Text style={styles.statusDesc}>{STATUS_DESC[status]}</Text>
        </View>
      </View>

      {/* Rejection reason */}
      {status === 'REJECTED' && medic?.verificationRejectedReason && (
        <View style={styles.rejectedReason}>
          <Text style={styles.rejectedReasonLabel}>Причина отказа:</Text>
          <Text style={styles.rejectedReasonText}>{medic.verificationRejectedReason}</Text>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructionCard}>
        <Text style={styles.instructionTitle}>Что нужно загрузить</Text>
        <InstructionRow icon="user" text="Фото лица — чёткое, анфас, хорошее освещение" />
        <InstructionRow icon="id-card" text="Медицинская лицензия или диплом — все данные читаемы" />
      </View>

      {/* Face photo */}
      <PhotoBlock
        label="Фото лица"
        uri={faceUri}
        onPress={() => showPickerOptions('facePhoto', 'Фото лица')}
      />

      {/* License photo */}
      <PhotoBlock
        label="Медицинская лицензия / диплом"
        uri={licenseUri}
        onPress={() => showPickerOptions('licensePhoto', 'Лицензия / диплом')}
      />

      {/* Submit */}
      {status !== 'APPROVED' && (
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && { opacity: 0.85 },
            uploading && { opacity: 0.6 },
          ]}
          onPress={handleSubmit}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Отправить на проверку</Text>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PhotoBlock({ label, uri, onPress }: { label: string; uri: string | null; onPress: () => void }) {
  const isRemote = uri?.startsWith('http');
  return (
    <Pressable
      style={({ pressed }) => [styles.photoBlock, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.photoPreview} resizeMode="cover" />
      ) : (
        <View style={styles.photoPlaceholder}>
          <FontAwesome name="camera" size={28} color={Theme.textSecondary} />
        </View>
      )}
      <View style={styles.photoLabelRow}>
        <Text style={styles.photoLabel}>{label}</Text>
        <View style={[styles.photoBadge, { backgroundColor: uri ? `${Theme.success}20` : `${Theme.primary}15` }]}>
          <Text style={[styles.photoBadgeText, { color: uri ? Theme.success : Theme.primary }]}>
            {uri ? (isRemote ? 'Загружено ✓' : 'Выбрано') : 'Нажмите для выбора'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function InstructionRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.instructionRow}>
      <FontAwesome name={icon as keyof typeof FontAwesome.glyphMap} size={15} color={Theme.primary} style={styles.instructionIcon} />
      <Text style={styles.instructionText}>{text}</Text>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_TITLE: Record<string, string> = {
  PENDING: 'Ожидает проверки',
  APPROVED: 'Верифицирован ✓',
  REJECTED: 'Отклонено',
};

const STATUS_DESC: Record<string, string> = {
  PENDING: 'Загрузите документы — оператор проверит в течение 24 часов',
  APPROVED: 'Вы можете принимать заказы',
  REJECTED: 'Загрузите документы повторно с учётом причины отказа',
};

function statusBannerStyle(status: string) {
  if (status === 'APPROVED') return { backgroundColor: `${Theme.success}15`, borderColor: `${Theme.success}40` };
  if (status === 'REJECTED') return { backgroundColor: `${Theme.error}12`, borderColor: `${Theme.error}40` };
  return { backgroundColor: `${Theme.warning}12`, borderColor: `${Theme.warning}40` };
}

function statusIconColor(status: string) {
  if (status === 'APPROVED') return Theme.success;
  if (status === 'REJECTED') return Theme.error;
  return Theme.warning;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Theme.background },
  content: { padding: 16, paddingBottom: 40, gap: 16 },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusTexts: { flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: '700' },
  statusDesc: { fontSize: 13, color: Theme.textSecondary, marginTop: 2 },

  rejectedReason: {
    backgroundColor: `${Theme.error}08`,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: `${Theme.error}30`,
    gap: 4,
  },
  rejectedReasonLabel: { fontSize: 12, fontWeight: '700', color: Theme.error },
  rejectedReasonText: { fontSize: 14, color: Theme.text },

  instructionCard: {
    backgroundColor: Theme.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.border,
    gap: 10,
  },
  instructionTitle: { fontSize: 13, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  instructionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  instructionIcon: { width: 20, marginTop: 2 },
  instructionText: { flex: 1, fontSize: 14, color: Theme.text, lineHeight: 20 },

  photoBlock: {
    backgroundColor: Theme.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.border,
  },
  photoPreview: { width: '100%', height: 180 },
  photoPlaceholder: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Theme.primary}08`,
  },
  photoLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  photoLabel: { fontSize: 14, fontWeight: '600', color: Theme.text },
  photoBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  photoBadgeText: { fontSize: 12, fontWeight: '600' },

  submitBtn: {
    backgroundColor: Theme.primary,
    borderRadius: 14,
    padding: 17,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
