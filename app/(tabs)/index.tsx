// app/(tabs)/index.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Button,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

// Komponen UI
import SearchBox from "../../components/SearchBox";
import WeatherCard from "../../components/WeatherCard";
import AtribusiCuaca from "../../components/AtribusiCuaca";
import StatusData from "../../components/StatusData";

// Hooks & Services
import { useDebounce } from "../../hooks/use-debounce";
import { cariKota } from "../../services/geocodingService";
import {
  ambilCuacaOfflineFirst,
  BATAS_CACHE_MS,
  sinkronisasiCuacaFavorit,
} from "../../services/cuacaRepository";
import {
  bersihkanCacheLama,
  daftarKotaTersimpan,
  hapusSatuKotaTersimpan,
} from "../../services/cacheService";
import {
  mintaIzinLokasi,
  ambilKoordinatSaatIni,
} from "../../services/locationService";
import { konversiTingkatAQI } from "../../services/weatherAdapter";
import { labelKodeCuaca } from "../../constants/weatherCodes";
import { ambilSemuaFavorit } from "../../services/favoritStorage";

// Tipe Data
import { HasilGeocoding } from "../../types/geocoding";
import { HasilCuacaOffline, RingkasanKotaTersimpan } from "../../types/cache";

export default function HalamanUtama() {
  const [teksCari, setTeksCari] = useState("");
  const [hasilPencarian, setHasilPencarian] = useState<HasilGeocoding[]>([]);
  const [kotaTerpilih, setKotaTerpilih] = useState<HasilGeocoding | null>(null);
  const [hasil, setHasil] = useState<HasilCuacaOffline | null>(null);
  const [kotaTersimpan, setKotaTersimpan] = useState<RingkasanKotaTersimpan[]>([]);
  const [sudahFavorit, setSudahFavorit] = useState(false);
  const [sedangMemuat, setSedangMemuat] = useState(false);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const [pesanLokasi, setPesanLokasi] = useState<string | null>(null);

  // Menerima parameter rute jika pengguna mengeklik kota favorit dari tab Riwayat
  const params = useLocalSearchParams<{
    bukaKotaId?: string;
    bukaKotaNama?: string;
    bukaKotaLat?: string;
    bukaKotaLon?: string;
  }>();

  const teksTertunda = useDebounce(teksCari, 500);
  const requestIdRef = useRef(0); // Pencegah race condition jika user ganti kota cepat

  // 1. Fungsi memuat 5 daftar riwayat kota yang pernah dicari pengguna
  async function muatKotaTersimpan() {
    try {
      const daftar = await daftarKotaTersimpan();
      setKotaTersimpan(daftar);
    } catch {}
  }

  // 2. Navigasi otomatis: Buka kota saat dikirim dari tab Riwayat
  useEffect(() => {
    if (params.bukaKotaId && params.bukaKotaNama && params.bukaKotaLat && params.bukaKotaLon) {
      pilihKota({
        id: Number(params.bukaKotaId),
        name: params.bukaKotaNama,
        latitude: Number(params.bukaKotaLat),
        longitude: Number(params.bukaKotaLon),
        country: "",
      });
    }
  }, [params.bukaKotaId, params.bukaKotaNama, params.bukaKotaLat, params.bukaKotaLon]);

  // 3. Saat aplikasi pertama dibuka:
  // - Hapus cache usang yang lebih dari 7 hari (auto-invalidation)
  // - Muat riwayat tersimpan
  // - Jalankan auto-sync cuaca favorit diam-diam di background saat online
  useEffect(() => {
    bersihkanCacheLama(BATAS_CACHE_MS)
      .then(muatKotaTersimpan)
      .catch(() => {});

    sinkronisasiCuacaFavorit()
      .then(muatKotaTersimpan)
      .catch(() => {});
  }, []);

  // 4. Muat ulang status saat tab Beranda kembali aktif/fokus
  useFocusEffect(
    useCallback(() => {
      muatKotaTersimpan();
      if (kotaTerpilih) {
        ambilSemuaFavorit().then((daftar) => {
          setSudahFavorit(daftar.some((k) => k.id === kotaTerpilih.id));
        });
      }
    }, [kotaTerpilih])
  );

  // 5. Pencarian kota (online satelit lebih dulu, fallback ke 514 kota lokal jika offline)
  useEffect(() => {
    if (teksTertunda.trim().length === 0) {
      setHasilPencarian([]);
      return;
    }
    cariKota(teksTertunda)
      .then(setHasilPencarian)
      .catch(() => setHasilPencarian([]));
  }, [teksTertunda]);

  // 6. Fungsi utama saat kota dipilih
  async function pilihKota(kota: HasilGeocoding, paksaPerbarui = false) {
    setKotaTerpilih(kota);
    const idSaatIni = ++requestIdRef.current;
    setSedangMemuat(true);
    setPesanError(null);

    // Cek apakah kota ini sudah ada di daftar favorit
    ambilSemuaFavorit().then((daftar) => {
      setSudahFavorit(daftar.some((k) => k.id === kota.id));
    });

    try {
      // Ambil data via repository offline-first
      const data = await ambilCuacaOfflineFirst(
        {
          id: kota.id,
          nama: kota.name,
          latitude: Number(kota.latitude),
          longitude: Number(kota.longitude),
        },
        { paksaPerbarui }
      );

      if (idSaatIni !== requestIdRef.current) return;
      setHasil(data);
      muatKotaTersimpan();
    } catch {
      if (idSaatIni !== requestIdRef.current) return;

      // KONDISI OFFLINE & KOTA BELUM PERNAH DIUNDUH:
      // Tampilkan WeatherCard dengan estimasi suhu 30°C + Banner Peringatan Merah "Bukan Data Asli"
      const dataLokalOffline: HasilCuacaOffline = {
        cuaca: {
          saatIni: {
            suhu: 30, // Estimasi suhu normal
            kecepatanAngin: 10,
            kodeCuaca: 1, // Cerah berawan
            waktu: new Date().toISOString(),
          },
          harian: {
            tanggal: [new Date().toISOString().slice(0, 10)],
            kodeCuaca: [1],
            suhuMaksimal: [32],
            suhuMinimal: [25],
          },
        },
        kualitasUdara: {
          indeksAQI: 50,
          pm25: 15,
          pm10: 25,
        },
        disimpanPada: Date.now(),
        sumber: "lokal-offline", // Menandakan bahwa ini bukan data asli satelit
      };

      setHasil(dataLokalOffline);
    } finally {
      if (idSaatIni === requestIdRef.current) setSedangMemuat(false);
    }
  }

  // 7. Lokasi saat ini (GPS)
  async function gunakanLokasiSaatIni() {
    const status = await mintaIzinLokasi();
    if (status === "denied") {
      setPesanLokasi("Izin lokasi ditolak. Silakan cari kota secara manual di atas.");
      return;
    }
    if (status === "unavailable") {
      setPesanLokasi("Layanan lokasi tidak aktif di perangkat ini. Silakan cari kota secara manual.");
      return;
    }
    setPesanLokasi(null);
    const koordinat = await ambilKoordinatSaatIni();
    pilihKota({
      id: -1,
      name: "Lokasi Saat Ini",
      latitude: koordinat.latitude,
      longitude: koordinat.longitude,
      country: "",
    });
  }

  // 8. Hapus 1 kota dari daftar 5 riwayat (tombol ✕ silang merah)
  async function hapusSatuItem(kunci: string) {
    await hapusSatuKotaTersimpan(kunci);
    muatKotaTersimpan();
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* ScrollView diberi flex: 1 dan flexGrow: 1 agar di laptop browser bisa digulir pakai scroll mouse */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <SearchBox onCari={setTeksCari} />
        <Button title="Gunakan Lokasi Saat Ini" onPress={gunakanLokasiSaatIni} />
        {pesanLokasi && <Text style={{ color: "red" }}>{pesanLokasi}</Text>}

        {/* Hasil Rekomendasi Pencarian */}
        {hasilPencarian.map((kota) => (
          <TouchableOpacity
            key={`${kota.id}-${kota.name}-${kota.latitude}`}
            onPress={() => {
              setHasilPencarian([]);
              pilihKota(kota);
            }}
          >
            <Text style={{ paddingVertical: 4 }}>
              {kota.name}{" "}
              {kota.admin1 ? `(${kota.admin1})` : kota.country ? `(${kota.country})` : ""}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Daftar 5 Riwayat Kota Terakhir yang Dicari Pengguna */}
        {kotaTersimpan.length > 0 && hasilPencarian.length === 0 && (
          <View style={{ gap: 8, backgroundColor: "#F8FAFC", padding: 12, borderRadius: 8 }}>
            <Text style={{ fontWeight: "bold", fontSize: 13, color: "#475569" }}>
              💾 Tersimpan di perangkat (bisa dibuka offline)
            </Text>
            {kotaTersimpan.map((k) => (
              <View
                key={k.kunci}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 4,
                }}
              >
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() =>
                    pilihKota({
                      id: k.id,
                      name: k.nama,
                      latitude: k.latitude,
                      longitude: k.longitude,
                      country: "",
                    })
                  }
                >
                  <Text style={{ color: "#2563EB", fontSize: 14 }}>📍 {k.nama}</Text>
                </TouchableOpacity>

                {/* Tombol Hapus Satuan (Silang Merah ✕) */}
                <TouchableOpacity
                  onPress={() => hapusSatuItem(k.kunci)}
                  style={{ paddingHorizontal: 8, paddingVertical: 2 }}
                >
                  <Text style={{ color: "#EF4444", fontWeight: "bold", fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {sedangMemuat && <ActivityIndicator />}

        {pesanError && (
          <View style={{ gap: 8, backgroundColor: "#FEF2F2", padding: 12, borderRadius: 8 }}>
            <Text style={{ color: "#DC2626", textAlign: "center" }} accessibilityLabel={pesanError}>
              {pesanError}
            </Text>
            <Button
              title="Coba Lagi"
              onPress={() => kotaTerpilih && pilihKota(kotaTerpilih, true)}
            />
          </View>
        )}

        {/* Tampilan Kartu Cuaca Lengkap */}
        {hasil && kotaTerpilih && !sedangMemuat && (
          <>
            {/* Indikator Status Data (Jaringan / Cache Segar / Cache Basi / Lokal Offline) */}
            <StatusData sumber={hasil.sumber} disimpanPada={hasil.disimpanPada} />

            <WeatherCard
              kota={kotaTerpilih.name}
              suhu={hasil.cuaca.saatIni.suhu}
              tingkatAQI={konversiTingkatAQI(hasil.kualitasUdara.indeksAQI)}
              indeksAQI={hasil.kualitasUdara.indeksAQI}
            />

            {/* Suhu Maksimal & Minimal Hari Ini */}
            <Text style={{ fontSize: 13, color: "#444" }}>
              Suhu Hari Ini: {hasil.cuaca.harian.suhuMinimal[0]}°C – {hasil.cuaca.harian.suhuMaksimal[0]}°C
            </Text>

            {/* Kondisi & Kecepatan Angin */}
            <Text style={{ fontSize: 12, color: "#888" }}>
              Kondisi: {labelKodeCuaca(hasil.cuaca.saatIni.kodeCuaca)} • Angin{" "}
              {hasil.cuaca.saatIni.kecepatanAngin} km/j
            </Text>

            {/* PM2.5 dan PM10 */}
            <Text style={{ fontSize: 11, color: "#888", textAlign: "center" }}>
              PM2.5: {hasil.kualitasUdara.pm25} µg/m³ • PM10: {hasil.kualitasUdara.pm10} µg/m³
            </Text>

            {/* Tombol Aksi: Jika Offline tidak ada cache tombolnya "Coba Lagi", jika ada cache tombolnya "Perbarui Sekarang" */}
            <Button
              title={hasil.sumber === "lokal-offline" ? "Coba Lagi" : "Perbarui Sekarang"}
              onPress={() => pilihKota(kotaTerpilih, true)}
            />

            {/* Tombol Tambahkan ke Favorit */}
            <Button
              title={sudahFavorit ? "Sudah di Favorit" : "Tambahkan ke Favorit"}
              disabled={sudahFavorit}
              onPress={() =>
                router.push({
                  pathname: "/tambah-favorit",
                  params: {
                    id: String(kotaTerpilih.id),
                    nama: kotaTerpilih.name,
                    lat: String(kotaTerpilih.latitude),
                    lon: String(kotaTerpilih.longitude),
                  },
                })
              }
            />
          </>
        )}

        <AtribusiCuaca />
      </ScrollView>
    </SafeAreaView>
  );
}