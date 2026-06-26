import React, { useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { uploadsApi } from '../api/uploads';
import { errorMessage } from '../api/client';
import { colors, radius, spacing, typography } from '../theme';

/**
 * Pick an image from the library, upload it via the backend (→ Supabase), and
 * report the resulting URL/path back to the parent. Shows the current image as a
 * thumbnail. `shape`: 'circle' (avatars) | 'rect' (receipts).
 */
export default function PhotoPicker({
  imageUrl,
  folder = 'misc',
  shape = 'rect',
  label = 'Add photo',
  onUploaded,
}) {
  const [uploading, setUploading] = useState(false);

  const pick = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo access to add an image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: shape === 'circle',
        aspect: shape === 'circle' ? [1, 1] : undefined,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploading(true);
      const data = await uploadsApi.uploadImage(result.assets[0], folder);
      onUploaded?.(data); // { url, path }
    } catch (e) {
      Alert.alert('Upload failed', errorMessage(e, 'Could not upload the image'));
    } finally {
      setUploading(false);
    }
  };

  const isCircle = shape === 'circle';
  const thumbStyle = isCircle ? styles.circle : styles.rect;

  return (
    <View style={isCircle ? styles.rowCenter : undefined}>
      <Pressable onPress={pick} disabled={uploading} style={[thumbStyle, styles.frame]}>
        {uploading ? (
          <ActivityIndicator color={colors.primary} />
        ) : imageUrl ? (
          <Image source={{ uri: imageUrl }} style={[thumbStyle, styles.image]} resizeMode="cover" />
        ) : (
          <Text style={styles.placeholder}>{isCircle ? '📷' : '🧾'}</Text>
        )}
      </Pressable>
      <Pressable onPress={pick} disabled={uploading} hitSlop={6}>
        <Text style={styles.link}>{uploading ? 'Uploading…' : imageUrl ? `Change ${label.toLowerCase()}` : label}</Text>
      </Pressable>
    </View>
  );
}

const SIZE = 88;
const styles = StyleSheet.create({
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  frame: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  circle: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  rect: { width: '100%', height: 140, borderRadius: radius.md },
  image: { borderWidth: 0 },
  placeholder: { fontSize: 28 },
  link: { ...typography.muted, color: colors.primary, marginTop: spacing.xs, fontWeight: '600' },
});
