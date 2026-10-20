import { GeocodingResponse, HasilGeocoding } from "../types/geocoding";
import { DAFTAR_KOTA_LOKAL } from "../constants/daftarKotaLokal";
import { ambilSemuaFavorit } from "./favoritStorage";
import { daftarKotaTersimpan } from "./cacheService";

const BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";

// Batas waktu tunggu pencarian online (1,5 detik)
// Jika internet lelet atau offline, sistem tidak membuat user menunggu lama dan langsung beralih ke pencarian lokal
const TIMEOUT_MS = 1500;

export async function cariKotaLokal(nama: string): Promise<HasilGeocoding[]> {
  const query = nama.trim().toLowerCase();
  if (!query) return [];

  // 1. Ambil kota dari daftar Favorit pengguna
  const daftarFavorit = await ambilSemuaFavorit().catch(() => []);
  const favoritSebagaiGeocoding: HasilGeocoding[] = daftarFavorit.map((f) => ({
    id: f.id,
    name: f.nama,
    latitude: f.latitude,
    longitude: f.longitude,
    country: "Indonesia",
    admin1: "Favorit", // Penanda badge (Favorit) di rekomendasi pencarian
  }));

  // 2. Ambil kota dari riwayat Cache tersimpan (misal kota luar negeri yang pernah dicari saat online)
  const kotaDariCache = await daftarKotaTersimpan().catch(() => []);
  const cacheSebagaiGeocoding: HasilGeocoding[] = kotaDariCache.map((c) => ({
    id: c.id,
    name: c.nama,
    latitude: c.latitude,
    longitude: c.longitude,
    country: "Indonesia",
    admin1: "Tersimpan", // Penanda badge (Tersimpan)
  }));

  // 3. Gabungkan 3 sumber: Kota Favorit + Kota dari Cache + 514 Kota Lokal se-Indonesia
  const semuaKota = [...favoritSebagaiGeocoding, ...cacheSebagaiGeocoding, ...DAFTAR_KOTA_LOKAL];

  // 4. Hapus duplikasi data berdasarkan ID unik kota menggunakan Map
  const mapUnik = new Map<number, HasilGeocoding>();
  for (const kota of semuaKota) {
    if (!mapUnik.has(kota.id)) {
      mapUnik.set(kota.id, kota);
    }
  }

  // 5. Filter kota yang nama atau provinsinya cocok dengan ketikan pengguna
  const hasil = Array.from(mapUnik.values()).filter((k) => {
    const namaCocok = k.name.toLowerCase().includes(query);
    const adminCocok = k.admin1 ? k.admin1.toLowerCase().includes(query) : false;
    const negaraCocok = k.country ? k.country.toLowerCase().includes(query) : false;
    return namaCocok || adminCocok || negaraCocok;
  });

  // 6. Urutkan hasil: prioritaskan kota yang huruf depannya persis sama dengan kata kunci pencarian
  hasil.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(query);
    const bStarts = b.name.toLowerCase().startsWith(query);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.name.localeCompare(b.name);
  });

  // Tampilkan maksimal 8 rekomendasi kota teratas
  return hasil.slice(0, 8);
}

export async function cariKota(nama: string): Promise<HasilGeocoding[]> {
  const url = `${BASE_URL}?name=${encodeURIComponent(nama)}&count=5&language=id&format=json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Coba cari secara online terlebih dahulu via Open-Meteo Geocoding API
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Gagal memuat data (status ${response.status})`);
    }

    const data: GeocodingResponse = await response.json();
    const results = data.results ?? [];

    // Jika online tapi nama kota tidak ditemukan di satelit, cari di database lokal kita
    if (results.length === 0) {
      return await cariKotaLokal(nama);
    }
    return results;
  } catch {
    // Mode offline / timeout / mode pesawat: otomatis beralih mencari ke database lokal
    return await cariKotaLokal(nama);
  } finally {
    clearTimeout(timer);
  }
}