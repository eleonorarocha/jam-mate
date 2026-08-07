import { supabase } from '@/integrations/supabase/client';

/**
 * PROTÓTIPO — clustering server-side via PostGIS (RPC `get_map_clusters`).
 *
 * NÃO está ligado ao MapComponent. Existe para que o pipeline esteja pronto
 * caso os perfis com coordenadas ultrapassem a ordem das dezenas de milhares.
 * Critério de adopção e plano: docs/mapa-escalabilidade.md
 */

export interface ServerCluster {
  /** Chave estável da célula da grelha (WKT do ponto snapped) */
  cluster_key: string;
  lng: number;
  lat: number;
  /** Número de músicos na célula */
  point_count: number;
  /** Quantos desses são Pro (para o anel dourado do cluster) */
  pro_count: number;
  /** Preenchido apenas quando a célula tem exactamente 1 músico */
  profile_id: string | null;
}

export interface ClusterBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/**
 * Vai buscar clusters agregados no servidor para o viewport e zoom dados.
 * As coordenadas devolvidas são sempre aproximadas (privacidade).
 */
export async function fetchMapClusters(
  bounds: ClusterBounds,
  zoom: number,
  signal?: AbortSignal,
): Promise<ServerCluster[]> {
  const query = supabase.rpc('get_map_clusters', {
    _min_lng: bounds.minLng,
    _min_lat: bounds.minLat,
    _max_lng: bounds.maxLng,
    _max_lat: bounds.maxLat,
    _zoom: Math.round(zoom),
  });

  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  return (data ?? []) as ServerCluster[];
}

/** Converte a resposta do RPC para GeoJSON, o formato que o Mapbox consome directamente. */
export function clustersToGeoJSON(clusters: ServerCluster[]) {
  return {
    type: 'FeatureCollection' as const,
    features: clusters.map((c) => ({
      type: 'Feature' as const,
      id: c.cluster_key,
      properties: {
        cluster: c.point_count > 1,
        point_count: c.point_count,
        pro_count: c.pro_count,
        profile_id: c.profile_id,
      },
      geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
    })),
  };
}
