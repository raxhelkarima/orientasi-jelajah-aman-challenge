export interface DataCuaca {
  kota: string;
  suhu: number;
  kelembapan: number;
  catatan?: string;
}

export type TingkatAQI = "BAIK" | "SEDANG" | "TIDAK_SEHAT" | "BERBAHAYA";

export interface WeatherCardProps {
  kota: string;
  suhu: number | string;
  tingkatAQI: TingkatAQI;
  indeksAQI?: number; // baru: angka asli dari API, opsional
}

export interface LaporanUdara {
  kota: string;
  indeksAQI: number;
  tingkat: "BAIK" | "SEDANG" | "TIDAK_SEHAT" | "BERBAHAYA";
  diperbaruiPada?: string;
}