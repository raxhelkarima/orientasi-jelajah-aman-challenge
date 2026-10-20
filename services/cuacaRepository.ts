// services/cuacaRepository.ts
import { ambilCuaca } from "./weatherService";
import { ambilKualitasUdara } from "./airQualityService";
import { ambilCache, simpanCache } from "./cacheService";
import { HasilCuacaOffline, KotaUntukCache } from "../types/cache";
import { ambilSemuaFavorit } from "./favoritStorage";

export const TTL_SEGAR_MS = 30 * 60 * 1000; // 30 menit
export const BATAS_CACHE_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

export async function ambilCuacaOfflineFirst(
  kota: KotaUntukCache,
  opsi: { paksaPerbarui?: boolean } = {}
): Promise<HasilCuacaOffline> {
  const cache = await ambilCache(kota.latitude, kota.longitude);
  const umur = cache ? Date.now() - cache.disimpanPada : Infinity;

  if (cache && umur < TTL_SEGAR_MS && !opsi.paksaPerbarui) {
    return { ...cache, sumber: "cache-segar" };
  }

  const lat = Number(kota.latitude);
  const lon = Number(kota.longitude);

  const dariJaringan = await Promise.all([
    ambilCuaca(lat, lon),
    ambilKualitasUdara(lat, lon),
  ]).catch(() => null);

  if (!dariJaringan) {
    if (cache) return { ...cache, sumber: "cache-basi" };
    throw new Error("Tidak ada koneksi dan belum ada data tersimpan");
  }

  const [cuaca, kualitasUdara] = dariJaringan;
  try {
    await simpanCache(kota, cuaca, kualitasUdara, true);
  } catch {}

  return { cuaca, kualitasUdara, disimpanPada: Date.now(), sumber: "jaringan" };
}

export async function sinkronisasiCuacaFavorit(): Promise<void> {
  try {
    const daftarFavorit = await ambilSemuaFavorit();
    if (!daftarFavorit || daftarFavorit.length === 0) return;

    for (const fav of daftarFavorit) {
      try {
        const cache = await ambilCache(fav.latitude, fav.longitude);
        const umur = cache ? Date.now() - cache.disimpanPada : Infinity;
        if (!cache || umur >= TTL_SEGAR_MS) {
          const [cuaca, kualitasUdara] = await Promise.all([
            ambilCuaca(Number(fav.latitude), Number(fav.longitude)),
            ambilKualitasUdara(Number(fav.latitude), Number(fav.longitude)),
          ]);
          await simpanCache(
            { id: fav.id, nama: fav.nama, latitude: Number(fav.latitude), longitude: Number(fav.longitude) },
            cuaca,
            kualitasUdara,
            false // Tidak masuk ke 5 riwayat Beranda
          );
        }
      } catch {}
    }
  } catch {}
}