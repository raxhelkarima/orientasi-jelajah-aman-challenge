// services/cacheService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DataCuacaLengkap, DataKualitasUdara } from "../types/weather";
import { DataTersimpan, KotaUntukCache, RingkasanKotaTersimpan } from "../types/cache";

const AWALAN_KUNCI_CACHE = "@jelajah_aman:cache_cuaca_";
const KUNCI_DAFTAR_RIWAYAT = "@jelajah_aman:riwayat_5_kota";

export function buatKunci(latitude: number | string, longitude: number | string): string {
  const lat = Number(latitude);
  const lon = Number(longitude);
  return lat.toFixed(2) + "," + lon.toFixed(2);
}

export async function simpanCache(
  kota: KotaUntukCache,
  cuaca: DataCuacaLengkap,
  kualitasUdara: DataKualitasUdara,
  masukkanKeRiwayat: boolean = true
): Promise<void> {
  try {
    const kunci = buatKunci(kota.latitude, kota.longitude);
    const waktuSimpan = Date.now();

    await AsyncStorage.setItem(
      `${AWALAN_KUNCI_CACHE}${kunci}`,
      JSON.stringify({
        kunci,
        kota_id: kota.id,
        nama_kota: kota.nama,
        latitude: Number(kota.latitude),
        longitude: Number(kota.longitude),
        cuaca,
        kualitasUdara,
        disimpanPada: waktuSimpan,
      })
    );

    // HANYA simpan ke 5 riwayat Beranda jika dicari manual oleh pengguna
    if (masukkanKeRiwayat && kota.id !== -1) {
      const listStr = await AsyncStorage.getItem(KUNCI_DAFTAR_RIWAYAT);
      const list: RingkasanKotaTersimpan[] = listStr ? JSON.parse(listStr) : [];
      const filtered = list.filter((item) => item.kunci !== kunci && item.id !== kota.id);

      const kotaBaru: RingkasanKotaTersimpan = {
        kunci,
        id: kota.id,
        nama: kota.nama,
        latitude: Number(kota.latitude),
        longitude: Number(kota.longitude),
        disimpanPada: waktuSimpan,
      };

      const daftarBaru = [kotaBaru, ...filtered].slice(0, 5);
      await AsyncStorage.setItem(KUNCI_DAFTAR_RIWAYAT, JSON.stringify(daftarBaru));
    }
  } catch {}
}

export async function ambilCache(latitude: number | string, longitude: number | string): Promise<DataTersimpan | null> {
  try {
    const kunci = buatKunci(latitude, longitude);
    const json = await AsyncStorage.getItem(`${AWALAN_KUNCI_CACHE}${kunci}`);
    if (!json) return null;
    const data = JSON.parse(json);
    return {
      cuaca: data.cuaca,
      kualitasUdara: data.kualitasUdara,
      disimpanPada: data.disimpanPada,
    };
  } catch {
    return null;
  }
}

export async function daftarKotaTersimpan(): Promise<RingkasanKotaTersimpan[]> {
  try {
    const json = await AsyncStorage.getItem(KUNCI_DAFTAR_RIWAYAT);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function hapusSatuKotaTersimpan(kunci: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${AWALAN_KUNCI_CACHE}${kunci}`);
    const listStr = await AsyncStorage.getItem(KUNCI_DAFTAR_RIWAYAT);
    if (listStr) {
      const list: RingkasanKotaTersimpan[] = JSON.parse(listStr);
      const filtered = list.filter((item) => item.kunci !== kunci);
      await AsyncStorage.setItem(KUNCI_DAFTAR_RIWAYAT, JSON.stringify(filtered));
    }
  } catch {}
}

export async function bersihkanCacheLama(batasUmurMs: number): Promise<void> {
  try {
    const batasWaktu = Date.now() - batasUmurMs;
    const listStr = await AsyncStorage.getItem(KUNCI_DAFTAR_RIWAYAT);
    if (!listStr) return;

    const list: RingkasanKotaTersimpan[] = JSON.parse(listStr);
    const valid: RingkasanKotaTersimpan[] = [];

    for (const item of list) {
      if (item.disimpanPada < batasWaktu) {
        await AsyncStorage.removeItem(`${AWALAN_KUNCI_CACHE}${item.kunci}`);
      } else {
        valid.push(item);
      }
    }
    await AsyncStorage.setItem(KUNCI_DAFTAR_RIWAYAT, JSON.stringify(valid));
  } catch {}
}

export async function hapusSemuaCache(): Promise<void> {
  try {
    const listStr = await AsyncStorage.getItem(KUNCI_DAFTAR_RIWAYAT);
    if (listStr) {
      const list: RingkasanKotaTersimpan[] = JSON.parse(listStr);
      for (const item of list) {
        await AsyncStorage.removeItem(`${AWALAN_KUNCI_CACHE}${item.kunci}`);
      }
    }
    await AsyncStorage.removeItem(KUNCI_DAFTAR_RIWAYAT);
  } catch {}
}