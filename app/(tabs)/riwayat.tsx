// app/(tabs)/riwayat.tsx
import { useState, useCallback } from "react";
import { View, Text, Button, Alert, Platform, TouchableOpacity } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ambilSemuaFavorit, hapusFavorit } from "../../services/favoritStorage";
import { KotaFavorit } from "../../types/favorit";

export default function TabRiwayat() {
  const [daftarFavorit, setDaftarFavorit] = useState<KotaFavorit[]>([]);

  // Memuat ulang daftar favorit setiap kali tab Riwayat dibuka
  useFocusEffect(
    useCallback(() => {
      ambilSemuaFavorit().then(setDaftarFavorit);
    }, [])
  );

  // Konfirmasi sebelum menghapus kota favorit (Alert di HP, confirm di Web)
  function konfirmasiHapus(kota: KotaFavorit) {
    const prosesHapus = async () => {
      await hapusFavorit(kota.id);
      setDaftarFavorit((prev) => prev.filter((k) => k.id !== kota.id));
    };

    if (Platform.OS === "web") {
      const yakin = window.confirm(`Yakin hapus ${kota.nama} dari daftar favorit?`);
      if (yakin) prosesHapus();
    } else {
      Alert.alert(
        "Konfirmasi Hapus",
        `Yakin hapus ${kota.nama} dari daftar favorit?`,
        [
          { text: "Batal", style: "cancel" },
          { text: "Hapus", style: "destructive", onPress: prosesHapus },
        ]
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>Kota Favorit</Text>

      {/* Menampilkan jumlah total kota favorit */}
      {daftarFavorit.length > 0 && (
        <Text style={{ color: "#666" }}>
          Tersimpan {daftarFavorit.length} kota
        </Text>
      )}

      {daftarFavorit.length === 0 && <Text>Belum ada kota favorit</Text>}

      {daftarFavorit.map((kota) => (
        <View
          key={kota.id}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
          }}
        >
          {/* Fitur Inovasi: Klik nama kota untuk langsung membuka cuacanya di Beranda */}
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 4 }}
            onPress={() => {
              router.push({
                pathname: "/",
                params: {
                  bukaKotaId: String(kota.id),
                  bukaKotaNama: kota.nama,
                  bukaKotaLat: String(kota.latitude),
                  bukaKotaLon: String(kota.longitude),
                },
              });
            }}
          >
            <Text style={{ fontSize: 16, color: "#2563EB" }}>📍 {kota.nama}</Text>
          </TouchableOpacity>

          {/* Tombol Hapus Favorit */}
          <Button
            title="Hapus"
            color="#dc2626"
            onPress={() => konfirmasiHapus(kota)}
          />
        </View>
      ))}
    </SafeAreaView>
  );
}