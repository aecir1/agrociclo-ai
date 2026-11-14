import { LatLonPoint, RegionId } from '../types';

export function localMetersToLatLon(
  dxMeters: number,
  dyMeters: number,
  originLat: number,
  originLon: number
): LatLonPoint {
  const latScale = 111320;
  const lonScale = Math.max(1e-6, 111320 * Math.cos((originLat * Math.PI) / 180));
  return {
    lat: Number((originLat + dyMeters / latScale).toFixed(6)),
    lon: Number((originLon + dxMeters / lonScale).toFixed(6)),
  };
}

export function calculateFarmGeometry(
  originLat: number,
  originLon: number,
  farmRadiusM: number,
  vertices: LatLonPoint[]
) {
  const latScale = 111320;
  const lonScale = Math.max(1e-6, 111320 * Math.cos((originLat * Math.PI) / 180));

  const metersPts = vertices.map((v) => ({
    x: (v.lon - originLon) * lonScale,
    y: (v.lat - originLat) * latScale,
  }));

  let areaM2 = 0;
  let perimeterM = 0;
  const edgeLengthsM: number[] = [];

  if (metersPts.length >= 2) {
    for (let i = 0; i < metersPts.length; i++) {
      const a = metersPts[i];
      const b = metersPts[(i + 1) % metersPts.length];
      if (metersPts.length >= 3) {
        areaM2 += a.x * b.y - b.x * a.y;
      }
      if (metersPts.length >= 3 || i < metersPts.length - 1) {
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        edgeLengthsM.push(len);
        perimeterM += len;
      }
    }
    areaM2 = Math.abs(areaM2) / 2;
  }

  const maxVertexRadiusM =
    metersPts.length > 0 ? Math.max(...metersPts.map((p) => Math.hypot(p.x, p.y))) : 0;

  const centroid =
    vertices.length > 0
      ? {
          lat: vertices.reduce((sum, v) => sum + v.lat, 0) / vertices.length,
          lon: vertices.reduce((sum, v) => sum + v.lon, 0) / vertices.length,
        }
      : { lat: originLat, lon: originLon };

  const circleAreaHa = (Math.PI * farmRadiusM * farmRadiusM) / 10000;

  return {
    areaM2,
    areaHa: areaM2 / 10000,
    perimeterM,
    edgeLengthsM,
    maxVertexRadiusM,
    circleAreaHa,
    centroid,
  };
}

/**
 * Modelo didático contínuo de altitude (em metros acima da baixada do córrego)
 * baseado na declividade média da propriedade e no bioma (Mares de Morros Cabruca vs. Chapadão Oeste).
 */
export function getTerrainElevationM(
  mx: number,
  my: number,
  slopePct: number,
  region: RegionId = 'ilheus'
): number {
  const amplitude = Math.max(2, slopePct * 2.4);
  if (region === 'oeste') {
    // Chapadão suave inclinado em direção ao vale ao sul
    const gentleSlope = (my + 450) * (slopePct / 100) * 0.45;
    const wave =
      Math.sin(mx / 260) * Math.cos(my / 280) * (amplitude * 0.25) +
      Math.cos((mx - my) / 380) * (amplitude * 0.15);
    return Math.max(0, 6 + gentleSlope + wave);
  }

  // Sul da Bahia (Mares de Morros / Cabruca): colina principal ao norte/leste e vale do córrego ao sul-sudoeste
  const mainHill = Math.exp(-((mx - 120) ** 2 + (my - 140) ** 2) / (2 * 240 * 240)) * amplitude * 1.1;
  const secondaryRidge =
    Math.exp(-((mx + 260) ** 2 + (my - 190) ** 2) / (2 * 210 * 210)) * amplitude * 0.78;
  const valleyDip = Math.exp(-((my + 300) ** 2) / (2 * 160 * 160)) * amplitude * 0.35;
  const undulation = (Math.sin(mx / 160) * Math.cos(my / 170) + 1) * (amplitude * 0.16);

  return Math.max(0, 4 + mainHill + secondaryRidge + undulation - valleyDip);
}

/**
 * Calcula o vetor gradiente de descida (para onde a água da chuva escorre morro abaixo).
 */
export function getTerrainDownhillVector(
  mx: number,
  my: number,
  slopePct: number,
  region: RegionId = 'ilheus'
): { dx: number; dy: number; magnitude: number } {
  const eps = 12;
  const dzdx =
    (getTerrainElevationM(mx + eps, my, slopePct, region) -
      getTerrainElevationM(mx - eps, my, slopePct, region)) /
    (2 * eps);
  const dzdy =
    (getTerrainElevationM(mx, my + eps, slopePct, region) -
      getTerrainElevationM(mx, my - eps, slopePct, region)) /
    (2 * eps);
  const gx = -dzdx;
  const gy = -dzdy;
  const mag = Math.hypot(gx, gy);
  if (mag < 1e-5) return { dx: 0, dy: -1, magnitude: 0 };
  return { dx: gx / mag, dy: gy / mag, magnitude: mag };
}

export interface ReliefRainImpactResult {
  slopePct: number;
  slopeLabel: string;
  infiltrationPct: number;
  runoffPct: number;
  infiltratedMm: number;
  runoffMm: number;
  infiltratedM3PerHa: number;
  runoffM3PerHa: number;
  totalFarmInfiltratedM3: number;
  totalFarmRunoffM3: number;
  collectibleRunoffM3: number; // Volume plausível de interceptar com caixas secas / curvas de nível
  extraIrrigationDaysPossible: number;
  erosionRisk: 'Baixo' | 'Moderado' | 'Alto';
  siltationWarning: string;
  practicalRecommendation: string;
}

/**
 * Estima de forma ilustrativa como a declividade do relevo + cobertura do solo
 * dividem a chuva entre infiltração útil na raiz do cacau e enxurrada morro abaixo.
 */
export function calculateReliefRainImpact(params: {
  slopePct: number;
  rainMm: number;
  cacaoAreaHa: number;
  hasMulchingOrCabruca: boolean;
  hasContourDitches: boolean;
  dailyDemandM3: number;
}): ReliefRainImpactResult {
  const slope = Math.max(0.5, Math.min(45, params.slopePct));
  const rain = Math.max(0, params.rainMm);
  const areaHa = Math.max(0.5, params.cacaoAreaHa);

  // Quanto mais íngreme + chuva intensa, maior a fração que escorre antes de infiltrar.
  // Cobertura morta / Cabruca e caixas secas em curva de nível retêm parte importante dessa água.
  const intensityFactor = rain > 60 ? 1.18 : rain > 35 ? 1.05 : 0.92;
  let rawRunoffPct = (7 + slope * 1.45) * intensityFactor;
  if (params.hasMulchingOrCabruca) rawRunoffPct *= 0.68;
  if (params.hasContourDitches) rawRunoffPct *= 0.58;

  const runoffPct = Math.round(Math.min(72, Math.max(4, rawRunoffPct)));
  const infiltrationPct = 100 - runoffPct;

  const infiltratedMm = Number(((rain * infiltrationPct) / 100).toFixed(1));
  const runoffMm = Number(((rain * runoffPct) / 100).toFixed(1));

  // 1 mm em 1 ha = 10 m³ de água
  const infiltratedM3PerHa = Number((infiltratedMm * 10).toFixed(1));
  const runoffM3PerHa = Number((runoffMm * 10).toFixed(1));
  const totalFarmInfiltratedM3 = Math.round(infiltratedM3PerHa * areaHa);
  const totalFarmRunoffM3 = Math.round(runoffM3PerHa * areaHa);

  // Fração da enxurrada que pode ser redirecionada para caixas secas / barreiro na baixada (35%–55%)
  const captureShare = params.hasContourDitches ? 0.55 : 0.35;
  const collectibleRunoffM3 = Math.round(totalFarmRunoffM3 * captureShare);
  const extraIrrigationDaysPossible = Number(
    (collectibleRunoffM3 / Math.max(1, params.dailyDemandM3)).toFixed(1)
  );

  const slopeLabel =
    slope <= 5
      ? 'Plano / Suave'
      : slope <= 12
      ? 'Ondulado Leve'
      : slope <= 22
      ? 'Morro / Encosta'
      : 'Íngreme / Escarpado';

  const erosionRisk: 'Baixo' | 'Moderado' | 'Alto' =
    runoffPct >= 34 || (slope >= 18 && !params.hasMulchingOrCabruca)
      ? 'Alto'
      : runoffPct >= 20
      ? 'Moderado'
      : 'Baixo';

  const siltationWarning =
    erosionRisk === 'Alto'
      ? 'Alta velocidade de enxurrada: risco de arrastar terra e assorear seu açude na baixada.'
      : erosionRisk === 'Moderado'
      ? 'Escoamento moderado nas encostas; recomenda-se manter serrapilheira e valas de contenção.'
      : 'Relevo bem segurado: boa infiltração de chuva com baixo risco de erosão.';

  const practicalRecommendation =
    slope > 10
      ? params.hasContourDitches
        ? 'Aproveite a gravidade da encosta direcionando as valas/caixas secas para o açude ou reservatório da parte baixa (sem gastar energia bombeando!).'
        : 'Em áreas inclinadas, plantar ou manejar em nível com cobertura morta + caixas secas segura a chuva antes que ela vire enxurrada.'
      : 'Terreno mais plano favorece boa penetração direta na raiz; mantenha a cobertura morta para segurar a umidade contra o sol.';

  return {
    slopePct: slope,
    slopeLabel,
    infiltrationPct,
    runoffPct,
    infiltratedMm,
    runoffMm,
    infiltratedM3PerHa,
    runoffM3PerHa,
    totalFarmInfiltratedM3,
    totalFarmRunoffM3,
    collectibleRunoffM3,
    extraIrrigationDaysPossible,
    erosionRisk,
    siltationWarning,
    practicalRecommendation,
  };
}
