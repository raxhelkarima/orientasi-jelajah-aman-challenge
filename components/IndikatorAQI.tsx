import { View, Text, StyleSheet } from "react-native";
import { LaporanUdara } from "../types/cuaca";

interface IndikatorAQIProps {
  data: LaporanUdara;
}

// Mapping warna sesuai status tingkat AQI
const WARNA_AQI: Record<LaporanUdara["tingkat"], string> = {
  BAIK: "#16a34a",        // ijo
  SEDANG: "#d97706",      // Kuning aga Oren
  TIDAK_SEHAT: "#dc2626", // Merah
  BERBAHAYA: "#7e22ce",   // Ungu
};

export default function IndikatorAQI({ data }: IndikatorAQIProps) {
  const warna = WARNA_AQI[data.tingkat] ?? "#000000";

  return (
    <View style={styles.card}>
      <Text style={styles.labelKota}>Kualitas Udara - {data.kota}</Text>
      
      {/* Teks nilai indeks dan status dengan warna dinamis */}
      <Text style={[styles.indeks, { color: warna }]}>
        AQI {data.indeksAQI} ({data.tingkat})
      </Text>

      {/* Render teks tanggal jika properti opsional ada */}
      {data.diperbaruiPada && (
        <Text style={styles.diperbarui}>
          Diperbarui pada: {data.diperbaruiPada}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#F4F7FA",
    gap: 4,
  },
  labelKota: {
    fontSize: 14,
    color: "#6b7280",
  },
  indeks: {
    fontSize: 20,
    fontWeight: "bold",
  },
  diperbarui: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
});