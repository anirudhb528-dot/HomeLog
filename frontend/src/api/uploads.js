import { Platform } from 'react-native';
import client from './client';

/**
 * Upload an image asset (from expo-image-picker) to the backend, which stores it
 * in Supabase and returns { url, path }. Handles the platform difference in how
 * FormData expects file data (native uses a { uri, name, type } object; web needs
 * an actual Blob).
 */
async function uploadImage(asset, folder = 'misc') {
  const mimeType = asset.mimeType || 'image/jpeg';
  const ext = mimeType.split('/')[1] || 'jpg';
  const name = asset.fileName || `upload.${ext}`;

  const form = new FormData();
  if (Platform.OS === 'web') {
    const res = await fetch(asset.uri);
    const blob = await res.blob();
    form.append('image', blob, name);
  } else {
    form.append('image', { uri: asset.uri, name, type: mimeType });
  }

  const { data } = await client.post(`/uploads/image?folder=${folder}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data; // { url, path }
}

export const uploadsApi = { uploadImage };
