import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/client';

/**
 * Web tarayıcılarında dosya indirme yardımcı fonksiyonu
 */
async function downloadOnWeb(url: string, fileName: string, token: string | null) {
  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`İndirme başarısız (${response.status})`);

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err: any) {
    console.error('Web indirme hatası:', err);
    Alert.alert('Hata', 'Excel dosyası indirilemedi: ' + (err?.message || 'Bilinmeyen hata'));
  }
}

/**
 * Belirli bir deponun tüm malzeme listesini Excel (.xlsx) olarak indirir ve paylaşım menüsünü açar
 */
export async function exportWarehouseToExcel(warehouseId: string, warehouseName: string): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    const safeName = (warehouseName || 'Depo').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ_-]/g, '_');
    const fileName = `${safeName}_Malzeme_Listesi_${Date.now()}.xlsx`;
    const downloadUrl = `${API_BASE_URL}/warehouses/${warehouseId}/export`;

    if (Platform.OS === 'web') {
      await downloadOnWeb(downloadUrl, fileName, token);
      return true;
    }

    const localUri = `${FileSystem.cacheDirectory}${fileName}`;
    const result = await FileSystem.downloadAsync(downloadUrl, localUri, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (result.status !== 200) {
      throw new Error(`Sunucu hatası: Kod ${result.status}`);
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Bilgi', 'Bu cihazda dosya paylaşımı desteklenmiyor. Dosya konumu: ' + result.uri);
      return true;
    }

    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      UTI: 'com.microsoft.excel.xlsx',
      dialogTitle: `${warehouseName} Malzeme Listesi (Excel)`,
    });

    return true;
  } catch (error: any) {
    console.error('Depo Excel dışa aktarma hatası:', error);
    Alert.alert('Hata', 'Depo malzeme listesi Excel olarak alınamadı: ' + (error?.message || 'Bilinmeyen hata'));
    return false;
  }
}

/**
 * Tüm depoların malzeme listesini konsolide ve ayrı sayfalar içeren tek bir Excel (.xlsx) kitabında indirir
 */
export async function exportAllWarehousesToExcel(companyName?: string): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    const fileName = `Tum_Depolar_Malzeme_Envanteri_${Date.now()}.xlsx`;
    const downloadUrl = `${API_BASE_URL}/warehouses/export/all`;

    if (Platform.OS === 'web') {
      await downloadOnWeb(downloadUrl, fileName, token);
      return true;
    }

    const localUri = `${FileSystem.cacheDirectory}${fileName}`;
    const result = await FileSystem.downloadAsync(downloadUrl, localUri, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (result.status !== 200) {
      throw new Error(`Sunucu hatası: Kod ${result.status}`);
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Bilgi', 'Bu cihazda dosya paylaşımı desteklenmiyor. Dosya konumu: ' + result.uri);
      return true;
    }

    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      UTI: 'com.microsoft.excel.xlsx',
      dialogTitle: `${companyName || 'MotorTrack'} Tüm Depolar Malzeme Listesi`,
    });

    return true;
  } catch (error: any) {
    console.error('Tüm depolar Excel dışa aktarma hatası:', error);
    Alert.alert('Hata', 'Depoların malzeme envanteri Excel olarak alınamadı: ' + (error?.message || 'Bilinmeyen hata'));
    return false;
  }
}

/**
 * Parça & Malzeme Envanterini Excel (.xlsx) Olarak İndirir ve Paylaşır
 */
export async function exportPartsToExcel(params?: { category?: string; search?: string }): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'Tümü') query.append('category', params.category);
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString();
    const downloadUrl = `${API_BASE_URL}/parts/export-excel${queryString ? `?${queryString}` : ''}`;
    const fileName = `Parca_Malzeme_Listesi_${Date.now()}.xlsx`;

    if (Platform.OS === 'web') {
      await downloadOnWeb(downloadUrl, fileName, token);
      return true;
    }

    const localUri = `${FileSystem.cacheDirectory}${fileName}`;
    const result = await FileSystem.downloadAsync(downloadUrl, localUri, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (result.status !== 200) {
      throw new Error(`Sunucu hatası: Kod ${result.status}`);
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Bilgi', 'Bu cihazda dosya paylaşımı desteklenmiyor.');
      return true;
    }

    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      UTI: 'com.microsoft.excel.xlsx',
      dialogTitle: 'Parça & Malzeme Envanteri (Excel)',
    });

    return true;
  } catch (error: any) {
    console.error('Parça envanteri Excel dışa aktarma hatası:', error);
    Alert.alert('Hata', 'Malzeme listesi Excel olarak alınamadı: ' + (error?.message || 'Bilinmeyen hata'));
    return false;
  }
}
