// app/(tabs)/pengaturan.tsx
import { useState } from "react";
import { Text, Button, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { hapusSemuaCache } from "../../services/cacheService";

export default function TabPengaturan() {
  const [pesan, setPesan] = useState<string | null>(null);

  // Membersihkan seluruh memori cache cuaca dan 5 riwayat pencarian
  async function hapusDataTersimpan() {
    await hapusSemuaCache();
    setPesan("Data cuaca tersimpan sudah dihapus.");
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>Jelajah Aman</Text>
      <Text>Versi 1.0.0 (Challenge)</Text>

      {/* Tombol pembersih cache */}
      <Button
        title="Hapus Data Cuaca Tersimpan"
        color="#DC2626"
        onPress={hapusDataTersimpan}
      />

      {pesan && (
        <View style={{ backgroundColor: "#F3F4F6", padding: 10, borderRadius: 8 }}>
          <Text style={{ color: "#374151" }} accessibilityLabel={pesan}>
            {pesan}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}