import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// Mengimpor typeScale dan spacing untuk hierarki visual yang konsisten
import { typeScale, spacing } from "../../constants/styles";

export default function TabTentang() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        padding: spacing.sedang,
        gap: spacing.kecil,
      }}
    >
      {/* 1. Judul halaman dengan accessibilityLabel dan typeScale.judul */}
      <Text
        accessibilityLabel="Judul halaman: Tentang Aplikasi Jelajah Aman"
        style={{
          fontSize: typeScale.judul,
          fontWeight: "bold",
        }}
      >
        Jelajah Aman
      </Text>

      {/* 2. Versi aplikasi dengan typeScale.subjudul */}
      <Text
        style={{
          fontSize: typeScale.subjudul,
          color: "#4b5563",
        }}
      >
        Versi 1.0.0
      </Text>

      {/* 3. Nama pembuat dengan typeScale.isi */}
      <Text
        style={{
          fontSize: typeScale.isi,
          color: "#1f2937",
        }}
      >
        Dibuat oleh: Rachel Karima Abdullah
      </Text>

      {/* Catatan tambahan dengan typeScale.keterangan */}
      <Text
        style={{
          fontSize: typeScale.keterangan,
          color: "#9ca3af",
          marginTop: spacing.sedang,
        }}
      >
        Aplikasi pemantau cuaca dan kualitas udara terpercaya.
      </Text>
    </SafeAreaView>
  );
}