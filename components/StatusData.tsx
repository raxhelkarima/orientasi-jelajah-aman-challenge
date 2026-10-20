// components/StatusData.tsx
import { View, Text } from "react-native";
import { SumberData } from "../types/cache";

interface StatusDataProps {
  sumber: SumberData;
  disimpanPada: number | string;
}

function parseTimestamp(disimpanPada: number | string): number {
  if (typeof disimpanPada === "number") {
    return isNaN(disimpanPada) ? Date.now() : disimpanPada;
  }
  const parsed = new Date(disimpanPada).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}

function formatUmur(disimpanPada: number | string): string {
  const waktu = parseTimestamp(disimpanPada);
  const selisihMs = Math.max(0, Date.now() - waktu);
  const menit = Math.floor(selisihMs / 60000);

  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return `${Math.floor(jam / 24)} hari lalu`;
}

function labelSumber(sumber: SumberData): string {
  if (sumber === "jaringan") return "Data terbaru dari internet";
  if (sumber === "cache-segar") return "Data tersimpan (masih segar)";
  if (sumber === "lokal-offline") return "⚠️ Mode Offline: Bukan Data Asli";
  return "Mode offline - data tersimpan mungkin sudah usang";
}

export default function StatusData({ sumber, disimpanPada }: StatusDataProps) {
  const isLokalOffline = sumber === "lokal-offline";
  const basi = sumber === "cache-basi" || isLokalOffline;
  const label = labelSumber(sumber);
  const umur = formatUmur(disimpanPada);

  const waktuMs = parseTimestamp(disimpanPada);
  const jamFormat = new Date(waktuMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View
      accessible
      accessibilityLabel={`${label}, diperbarui ${umur}`}
      style={{
        padding: 10,
        borderRadius: 8,
        backgroundColor: isLokalOffline ? "#FEF2F2" : basi ? "#FEF3E2" : "#EAFBF6",
        borderWidth: 1,
        borderColor: isLokalOffline ? "#EF4444" : basi ? "#F59E0B" : "#10B981",
        gap: 4,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: isLokalOffline ? "#DC2626" : basi ? "#B45309" : "#13795F",
        }}
      >
        {label}
      </Text>

      {isLokalOffline ? (
        <Text style={{ fontSize: 12, color: "#991B1B" }}>
          Data cuaca kota ini belum pernah diunduh. Hubungkan internet lalu coba lagi untuk melihat cuaca sebenarnya.
        </Text>
      ) : (
        <Text style={{ fontSize: 11, color: "#666666" }}>
          Diperbarui {umur} ({jamFormat})
        </Text>
      )}
    </View>
  );
}