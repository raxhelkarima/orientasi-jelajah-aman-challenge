export interface HasilGeocoding {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string; // nama provinsi/wilayah, tidak selalu ada di setiap negara
}

export interface GeocodingResponse {
  results?: HasilGeocoding[]; // opsional -- tidak dikirim oleh server saat pencarian kosong
}