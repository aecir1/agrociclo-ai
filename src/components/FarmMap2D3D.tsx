import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapPin,
  Crosshair,
  Undo2,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Compass,
  Navigation,
  Maximize2,
  Pencil,
  ZoomIn,
  ZoomOut,
  Box,
  Map as MapIcon,
  Satellite,
  Trees,
  Info,
  Mountain,
  CloudRain,
  ArrowRight
} from 'lucide-react';
import { LatLonPoint, PropertyProfile } from '../types';
import {
  calculateFarmGeometry,
  calculateReliefRainImpact,
  getTerrainDownhillVector,
  getTerrainElevationM,
  localMetersToLatLon
} from '../utils/geoMap';

interface FarmMap2D3DProps {
  profile: PropertyProfile;
  onUpdateProfile: (updated: PropertyProfile) => void;
  onOpenSimulator?: () => void;
}

const BAHIA_PRESETS: Array<{ label: string; lat: number; lon: number }> = [
  { label: 'Ilhéus • Zona Rural/Cabruca', lat: -14.7565, lon: -39.2245 },
  { label: 'Itabuna • CEPLAC', lat: -14.7695, lon: -39.2312 },
  { label: 'Uruçuca (Cacau)', lat: -14.5931, lon: -39.2844 },
  { label: 'Camacan', lat: -15.4192, lon: -39.4958 },
  { label: 'Riachão das Neves (Oeste)', lat: -11.7462, lon: -44.9102 },
  { label: 'Barreiras (Oeste)', lat: -12.1528, lon: -44.9901 }
];

type VisualStyle = 'agro' | 'satellite';

function latLonToLocalMeters(
  lat: number,
  lon: number,
  originLat: number,
  originLon: number
): { x: number; y: number } {
  const latScale = 111320;
  const lonScale = Math.max(1e-6, 111320 * Math.cos((originLat * Math.PI) / 180));
  return {
    x: (lon - originLon) * lonScale,
    y: (lat - originLat) * latScale
  };
}

function lonLatToTileXY(lon: number, lat: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

export const FarmMap2D3D: React.FC<FarmMap2D3DProps> = ({
  profile,
  onUpdateProfile,
  onOpenSimulator
}) => {
  const originLat = profile.latitude ?? (profile.id === 'oeste' ? -11.7462 : -14.7565);
  const originLon = profile.longitude ?? (profile.id === 'oeste' ? -44.9102 : -39.2245);
  const farmRadiusM = profile.farmRadiusM ?? 360;
  const slopePct = profile.terrainSlopePct ?? (profile.id === 'oeste' ? 4 : 16);
  const vertices: LatLonPoint[] = profile.polygonVertices ?? [];

  const [latInput, setLatInput] = useState<string>(String(originLat));
  const [lonInput, setLonInput] = useState<string>(String(originLon));
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('agro');
  const [drawingMode, setDrawingMode] = useState<boolean>(true);
  const [showRelief3D, setShowRelief3D] = useState<boolean>(true);
  const [showRunoffArrows, setShowRunoffArrows] = useState<boolean>(true);
  const [sampleRainMm, setSampleRainMm] = useState<number>(45);
  const [bearingDeg, setBearingDeg] = useState<number>(-18);
  const [pixelsPerMeter, setPixelsPerMeter] = useState<number>(0.55);
  const [panOffsetM, setPanOffsetM] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);
  const [satelliteStatus, setSatelliteStatus] = useState<'idle' | 'loading' | 'ok' | 'fallback'>('idle');
  const [showCoordsHelp, setShowCoordsHelp] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tileCacheRef = useRef<Map<string, HTMLImageElement | 'blocked'>>(new Map());
  const dragStateRef = useRef<{
    active: boolean;
    type: 'pan' | 'vertex' | 'sede';
    vertexIdx: number;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
    moved: boolean;
  }>({
    active: false,
    type: 'pan',
    vertexIdx: -1,
    startClientX: 0,
    startClientY: 0,
    startPanX: 0,
    startPanY: 0,
    moved: false
  });

  useEffect(() => {
    setLatInput(String(originLat));
    setLonInput(String(originLon));
    setPanOffsetM({ x: 0, y: 0 });
  }, [originLat, originLon, profile.id]);

  const geometry = useMemo(
    () => calculateFarmGeometry(originLat, originLon, farmRadiusM, vertices),
    [originLat, originLon, farmRadiusM, vertices]
  );

  const dailyDemandM3 = useMemo(
    () =>
      profile.sectors.reduce((acc, s) => acc + s.plantsCount * s.targetLitersPerPlantDay, 0) / 1000,
    [profile.sectors]
  );

  const reliefRainImpact = useMemo(
    () =>
      calculateReliefRainImpact({
        slopePct,
        rainMm: sampleRainMm,
        cacaoAreaHa: profile.cacaoAreaHa,
        hasMulchingOrCabruca: profile.id === 'ilheus',
        hasContourDitches: false,
        dailyDemandM3
      }),
    [dailyDemandM3, profile.cacaoAreaHa, profile.id, sampleRainMm, slopePct]
  );

  const reliefZ = useCallback(
    (mx: number, my: number) => {
      if (viewMode !== '3d' || !showRelief3D) return 0;
      return getTerrainElevationM(mx, my, slopePct, profile.id);
    },
    [profile.id, showRelief3D, slopePct, viewMode]
  );

  // Elevação min/max dentro da vizinhança da fazenda para exibição didática
  const elevationBounds = useMemo(() => {
    let minE = Infinity;
    let maxE = -Infinity;
    let maxPt = { x: 0, y: 0 };
    let minPt = { x: 0, y: 0 };
    for (let x = -420; x <= 420; x += 60) {
      for (let y = -420; y <= 420; y += 60) {
        const e = getTerrainElevationM(x, y, slopePct, profile.id);
        if (e > maxE) {
          maxE = e;
          maxPt = { x, y };
        }
        if (e < minE) {
          minE = e;
          minPt = { x, y };
        }
      }
    }
    return {
      minM: Math.round(minE),
      maxM: Math.round(maxE),
      diffM: Math.max(0, Math.round(maxE - minE)),
      maxPt,
      minPt
    };
  }, [profile.id, slopePct]);

  // Projeção isométrica exata 2D <-> 3D (zElev = altitude real, zExtra = estruturas acima do solo)
  const projectPoint = useCallback(
    (mx: number, my: number, zMeters: number, width: number, height: number) => {
      const cx = width / 2;
      const cy = height / 2 + (viewMode === '3d' ? 34 : 0);

      const dx = mx - panOffsetM.x;
      const dy = my - panOffsetM.y;

      const rad = (viewMode === '3d' ? bearingDeg : 0) * (Math.PI / 180);
      const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ry = dx * Math.sin(rad) + dy * Math.cos(rad);

      if (viewMode === '2d') {
        return {
          sx: cx + rx * pixelsPerMeter,
          sy: cy - ry * pixelsPerMeter,
          ryRot: ry
        };
      }

      const tiltFactor = 0.56;
      const zScale = 1.6;
      return {
        sx: cx + rx * pixelsPerMeter,
        sy: cy - ry * pixelsPerMeter * tiltFactor - zMeters * pixelsPerMeter * zScale,
        ryRot: ry
      };
    },
    [bearingDeg, panOffsetM.x, panOffsetM.y, pixelsPerMeter, viewMode]
  );

  // Projeção inversa iterativa considerando a superfície 3D do relevo
  const screenToLocalMeters = useCallback(
    (sx: number, sy: number, width: number, height: number): { mx: number; my: number } => {
      const cx = width / 2;
      const cy = height / 2 + (viewMode === '3d' ? 34 : 0);

      if (viewMode === '2d') {
        const rx = (sx - cx) / pixelsPerMeter;
        const ry = -(sy - cy) / pixelsPerMeter;
        return { mx: rx + panOffsetM.x, my: ry + panOffsetM.y };
      }

      const tiltFactor = 0.56;
      const zScale = 1.6;
      const rx = (sx - cx) / pixelsPerMeter;
      const rad = -bearingDeg * (Math.PI / 180);

      let zGuess = 0;
      let mx = panOffsetM.x;
      let my = panOffsetM.y;

      for (let iter = 0; iter < 5; iter++) {
        const ry = (cy - sy - zGuess * pixelsPerMeter * zScale) / (pixelsPerMeter * tiltFactor);
        const dx = rx * Math.cos(rad) - ry * Math.sin(rad);
        const dy = rx * Math.sin(rad) + ry * Math.cos(rad);
        mx = dx + panOffsetM.x;
        my = dy + panOffsetM.y;
        zGuess = showRelief3D ? getTerrainElevationM(mx, my, slopePct, profile.id) : 0;
      }

      return { mx, my };
    },
    [bearingDeg, panOffsetM.x, panOffsetM.y, pixelsPerMeter, profile.id, showRelief3D, slopePct, viewMode]
  );

  // Carrega grade 5x5 de tiles Esri via fetch CORS validado
  useEffect(() => {
    if (visualStyle !== 'satellite') {
      setSatelliteStatus('idle');
      return;
    }

    let cancelled = false;
    setSatelliteStatus('loading');

    const zoom = 15;
    const centerTile = lonLatToTileXY(originLon, originLat, zoom);
    const tx0 = Math.floor(centerTile.x);
    const ty0 = Math.floor(centerTile.y);
    const cache = tileCacheRef.current;

    const coordsToLoad: Array<{ z: number; x: number; y: number }> = [];
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        coordsToLoad.push({ z: zoom, x: tx0 + dx, y: ty0 + dy });
      }
    }

    Promise.all(
      coordsToLoad.map(async ({ z, x, y }) => {
        const key = `${z}/${x}/${y}`;
        if (cache.has(key)) return cache.get(key) !== 'blocked';
        try {
          const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
          const res = await fetch(url, { mode: 'cors' });
          if (!res.ok) {
            cache.set(key, 'blocked');
            return false;
          }
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.startsWith('image/')) {
            cache.set(key, 'blocked');
            return false;
          }
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Image error'));
            img.src = objUrl;
          });
          cache.set(key, img);
          return true;
        } catch {
          cache.set(key, 'blocked');
          return false;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const anyOk = results.some(Boolean);
      setSatelliteStatus(anyOk ? 'ok' : 'fallback');
    });

    return () => {
      cancelled = true;
    };
  }, [visualStyle, originLat, originLon]);

  // Desenho completo no Canvas (2D & 3D com Malha de Relevo Sombreada + Escoamento + Satélite)
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    const hasSatellite = visualStyle === 'satellite' && satelliteStatus === 'ok';

    // Fundo limpo atrás da cena
    ctx.fillStyle = hasSatellite
      ? '#143326'
      : viewMode === '3d'
      ? '#e8f4ee'
      : profile.id === 'oeste'
      ? '#fef9c3'
      : '#ecfdf5';
    ctx.fillRect(0, 0, w, h);

    if (viewMode === '3d' && !hasSatellite) {
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.42);
      sky.addColorStop(0, '#dbeafe');
      sky.addColorStop(1, '#e8f4ee');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h * 0.42);
    }

    // Chão plano base (ou satélite 5x5)
    if (hasSatellite) {
      const zoom = 15;
      const centerTile = lonLatToTileXY(originLon, originLat, zoom);
      const tx0 = Math.floor(centerTile.x);
      const ty0 = Math.floor(centerTile.y);
      const cache = tileCacheRef.current;
      const metersPerTile = (40075016.686 * Math.cos((originLat * Math.PI) / 180)) / Math.pow(2, zoom);
      const fracX = centerTile.x - tx0;
      const fracY = centerTile.y - ty0;

      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          const entry = cache.get(`${zoom}/${tx0 + dx}/${ty0 + dy}`);
          if (!entry || entry === 'blocked') continue;

          const leftM = (dx - fracX) * metersPerTile;
          const rightM = (dx + 1 - fracX) * metersPerTile;
          const topM = (fracY - dy) * metersPerTile;
          const bottomM = (fracY - (dy + 1)) * metersPerTile;

          const tl = projectPoint(leftM, topM, 0, w, h);
          const tr = projectPoint(rightM, topM, 0, w, h);
          const bl = projectPoint(leftM, bottomM, 0, w, h);

          ctx.save();
          const a = (tr.sx - tl.sx) / entry.width;
          const b = (tr.sy - tl.sy) / entry.width;
          const c = (bl.sx - tl.sx) / entry.height;
          const d = (bl.sy - tl.sy) / entry.height;
          ctx.setTransform(dpr * a, dpr * b, dpr * c, dpr * d, dpr * tl.sx, dpr * tl.sy);
          ctx.drawImage(entry, -0.5, -0.5, entry.width + 1, entry.height + 1);
          ctx.restore();
        }
      }
    }

    // MALHA DE RELEVO 3D (Mares de Morros / Chapadão com algoritmo do pintor!)
    if (viewMode === '3d' && showRelief3D) {
      const span = 680;
      const step = 68;
      const maxAlt = Math.max(10, elevationBounds.maxM);
      const quads: Array<{
        pts: Array<{ sx: number; sy: number }>;
        depth: number;
        fill: string;
        stroke: string;
      }> = [];

      for (let x = -span; x < span; x += step) {
        for (let y = -span; y < span; y += step) {
          const z00 = getTerrainElevationM(x, y, slopePct, profile.id);
          const z10 = getTerrainElevationM(x + step, y, slopePct, profile.id);
          const z11 = getTerrainElevationM(x + step, y + step, slopePct, profile.id);
          const z01 = getTerrainElevationM(x, y + step, slopePct, profile.id);

          const p00 = projectPoint(x, y, z00, w, h);
          const p10 = projectPoint(x + step, y, z10, w, h);
          const p11 = projectPoint(x + step, y + step, z11, w, h);
          const p01 = projectPoint(x, y + step, z01, w, h);

          const avgZ = (z00 + z10 + z11 + z01) / 4;
          const normH = Math.min(1, Math.max(0, avgZ / maxAlt));

          // Iluminação direcional (Sol Noroeste) para destacar morros e vales
          const dzdx = (z10 - z00 + z11 - z01) / (2 * step);
          const dzdy = (z01 - z00 + z11 - z10) / (2 * step);
          const shade = Math.max(-0.35, Math.min(0.35, (-dzdx * 0.7 + dzdy * 0.7) * 1.4));

          let fill: string;
          let stroke: string;
          if (hasSatellite) {
            // Sobreposição topográfica translúcida para enxergar o relevo sem esconder o satélite
            const lightAlpha = shade > 0 ? 0.08 + shade * 0.25 : 0.12 + Math.abs(shade) * 0.25;
            fill = shade >= 0 ? `rgba(255, 255, 220, ${lightAlpha.toFixed(2)})` : `rgba(6, 78, 59, ${lightAlpha.toFixed(2)})`;
            stroke = 'rgba(110, 231, 183, 0.28)';
          } else {
            // Hipsometria limpa agro: vale verde escuro úmido -> encosta verde vivo -> crista oliva/dourada
            const baseR = profile.id === 'oeste' ? 218 : 142;
            const baseG = profile.id === 'oeste' ? 215 : 210;
            const baseB = profile.id === 'oeste' ? 145 : 148;
            const r = Math.round(Math.min(248, Math.max(80, baseR + normH * 58 + shade * 65)));
            const g = Math.round(Math.min(245, Math.max(120, baseG + normH * 22 + shade * 55)));
            const b = Math.round(Math.min(210, Math.max(75, baseB - normH * 24 + shade * 35)));
            fill = `rgb(${r}, ${g}, ${b})`;
            stroke = 'rgba(20, 83, 45, 0.14)';
          }

          quads.push({
            pts: [p00, p10, p11, p01],
            depth: (p00.ryRot + p10.ryRot + p11.ryRot + p01.ryRot) / 4,
            fill,
            stroke
          });
        }
      }

      // Desenha de trás para frente (maior ryRot -> menor ryRot) para oclusão 3D correta
      quads.sort((a, b) => b.depth - a.depth);
      for (const q of quads) {
        ctx.beginPath();
        ctx.moveTo(q.pts[0].sx, q.pts[0].sy);
        ctx.lineTo(q.pts[1].sx, q.pts[1].sy);
        ctx.lineTo(q.pts[2].sx, q.pts[2].sy);
        ctx.lineTo(q.pts[3].sx, q.pts[3].sy);
        ctx.closePath();
        ctx.fillStyle = q.fill;
        ctx.fill();
        ctx.strokeStyle = q.stroke;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    } else if (!hasSatellite) {
      // Grade topográfica 2D (ou 3D sem relevo)
      const groundHalfM = 2000;
      const gCorners = [
        projectPoint(-groundHalfM, groundHalfM, 0, w, h),
        projectPoint(groundHalfM, groundHalfM, 0, w, h),
        projectPoint(groundHalfM, -groundHalfM, 0, w, h),
        projectPoint(-groundHalfM, -groundHalfM, 0, w, h)
      ];
      ctx.beginPath();
      ctx.moveTo(gCorners[0].sx, gCorners[0].sy);
      gCorners.slice(1).forEach((p) => ctx.lineTo(p.sx, p.sy));
      ctx.closePath();
      ctx.fillStyle = profile.id === 'oeste' ? '#f5f0d6' : '#e6f4ea';
      ctx.fill();

      ctx.strokeStyle = 'rgba(15, 118, 110, 0.10)';
      ctx.lineWidth = 1;
      for (let m = -1200; m <= 1200; m += 100) {
        const a = projectPoint(m, -1200, 0, w, h);
        const b = projectPoint(m, 1200, 0, w, h);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();

        const c = projectPoint(-1200, m, 0, w, h);
        const d = projectPoint(1200, m, 0, w, h);
        ctx.beginPath();
        ctx.moveTo(c.sx, c.sy);
        ctx.lineTo(d.sx, d.sy);
        ctx.stroke();
      }
    }

    // Rio e Estrada acompanhando a elevação do terreno (apenas no Mapa Limpo)
    if (!hasSatellite) {
      ctx.beginPath();
      const riverPts = [
        [-640, -390],
        [-380, -340],
        [-80, -305],
        [240, -355],
        [620, -450]
      ];
      riverPts.forEach(([rx, ry], idx) => {
        const p = projectPoint(rx, ry, reliefZ(rx, ry) + 0.5, w, h);
        if (idx === 0) ctx.moveTo(p.sx, p.sy);
        else ctx.lineTo(p.sx, p.sy);
      });
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = Math.max(4, pixelsPerMeter * 13);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      ctx.beginPath();
      const roadPts = [
        [-640, 90],
        [-280, 55],
        [0, 10],
        [340, 75],
        [640, 140]
      ];
      roadPts.forEach(([rx, ry], idx) => {
        const p = projectPoint(rx, ry, reliefZ(rx, ry) + 0.5, w, h);
        if (idx === 0) ctx.moveTo(p.sx, p.sy);
        else ctx.lineTo(p.sx, p.sy);
      });
      ctx.strokeStyle = '#d6d3d1';
      ctx.lineWidth = Math.max(3, pixelsPerMeter * 7);
      ctx.stroke();
    }

    // Setas azuis mostrando o escoamento da água da chuva morro abaixo!
    if (showRunoffArrows && slopePct >= 2) {
      for (let ax = -360; ax <= 360; ax += 180) {
        for (let ay = -300; ay <= 300; ay += 150) {
          const vec = getTerrainDownhillVector(ax, ay, slopePct, profile.id);
          const tailZ = reliefZ(ax, ay) + 1.5;
          const headX = ax + vec.dx * 52;
          const headY = ay + vec.dy * 52;
          const headZ = reliefZ(headX, headY) + 1.5;

          const p1 = projectPoint(ax, ay, tailZ, w, h);
          const p2 = projectPoint(headX, headY, headZ, w, h);

          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.strokeStyle = hasSatellite ? 'rgba(56, 189, 248, 0.9)' : 'rgba(2, 132, 199, 0.72)';
          ctx.lineWidth = 2.2;
          ctx.stroke();

          // Ponta da seta
          const ang = Math.atan2(p2.sy - p1.sy, p2.sx - p1.sx);
          ctx.beginPath();
          ctx.moveTo(p2.sx, p2.sy);
          ctx.lineTo(p2.sx - Math.cos(ang - 0.55) * 7, p2.sy - Math.sin(ang - 0.55) * 7);
          ctx.lineTo(p2.sx - Math.cos(ang + 0.55) * 7, p2.sy - Math.sin(ang + 0.55) * 7);
          ctx.closePath();
          ctx.fillStyle = hasSatellite ? '#38bdf8' : '#0284c7';
          ctx.fill();
        }
      }
    }

    // Círculo Azul do Raio da Fazenda acompanhando o relevo
    ctx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const ang = (i / 72) * Math.PI * 2;
      const rx = Math.cos(ang) * farmRadiusM;
      const ry = Math.sin(ang) * farmRadiusM;
      const p = projectPoint(rx, ry, reliefZ(rx, ry) + 0.8, w, h);
      if (i === 0) ctx.moveTo(p.sx, p.sy);
      else ctx.lineTo(p.sx, p.sy);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(14, 165, 233, 0.08)';
    ctx.fill();
    ctx.setLineDash([7, 5]);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Linha indicativa do raio
    const centerGround = projectPoint(0, 0, reliefZ(0, 0), w, h);
    const radiusEdge = projectPoint(farmRadiusM, 0, reliefZ(farmRadiusM, 0), w, h);
    ctx.beginPath();
    ctx.moveTo(centerGround.sx, centerGround.sy);
    ctx.lineTo(radiusEdge.sx, radiusEdge.sy);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    const midRadX = (centerGround.sx + radiusEdge.sx) / 2;
    const midRadY = (centerGround.sy + radiusEdge.sy) / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(midRadX - 36, midRadY - 11, 72, 20);
    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Raio ${farmRadiusM} m`, midRadX, midRadY + 3);

    // Açude ilustrativo na baixada (apenas no Mapa Limpo)
    if (!hasSatellite) {
      const pondZ = reliefZ(-95, -240) + 0.8;
      const pondPos = projectPoint(-95, -240, pondZ, w, h);
      ctx.beginPath();
      ctx.ellipse(
        pondPos.sx,
        pondPos.sy,
        Math.max(14, pixelsPerMeter * 28),
        Math.max(8, pixelsPerMeter * (viewMode === '3d' ? 14 : 22)),
        0,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = '#0ea5e9';
      ctx.fill();
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#0c4a6e';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillText('Açude (Baixada)', pondPos.sx, pondPos.sy + 18);
    }

    // Polígono Delimitado da Fazenda seguindo o Relevo 3D!
    const polyLocal = vertices.map((v) => latLonToLocalMeters(v.lat, v.lon, originLat, originLon));

    if (polyLocal.length >= 2) {
      const groundPts = polyLocal.map((p) => projectPoint(p.x, p.y, reliefZ(p.x, p.y) + 0.5, w, h));

      if (polyLocal.length >= 3) {
        ctx.beginPath();
        groundPts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy)));
        ctx.closePath();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.20)';
        ctx.fill();

        if (viewMode === '3d') {
          const topPts = polyLocal.map((p) => projectPoint(p.x, p.y, reliefZ(p.x, p.y) + 11, w, h));
          for (let i = 0; i < groundPts.length; i++) {
            const next = (i + 1) % groundPts.length;
            ctx.beginPath();
            ctx.moveTo(groundPts[i].sx, groundPts[i].sy);
            ctx.lineTo(groundPts[next].sx, groundPts[next].sy);
            ctx.lineTo(topPts[next].sx, topPts[next].sy);
            ctx.lineTo(topPts[i].sx, topPts[i].sy);
            ctx.closePath();
            ctx.fillStyle = 'rgba(5, 150, 105, 0.25)';
            ctx.fill();
            ctx.strokeStyle = '#047857';
            ctx.lineWidth = 1.4;
            ctx.stroke();
          }

          if (!hasSatellite) {
            const cLocal = latLonToLocalMeters(geometry.centroid.lat, geometry.centroid.lon, originLat, originLon);
            const treeOffsets = [
              [-55, 35],
              [-15, 55],
              [45, 40],
              [75, -15],
              [-45, -35],
              [25, -45]
            ];
            treeOffsets.forEach(([ox, oy]) => {
              const tx = cLocal.x + ox;
              const ty = cLocal.y + oy;
              const tz = reliefZ(tx, ty);
              const base = projectPoint(tx, ty, tz, w, h);
              const top = projectPoint(tx, ty, tz + 9, w, h);
              ctx.beginPath();
              ctx.moveTo(base.sx, base.sy);
              ctx.lineTo(top.sx, top.sy);
              ctx.strokeStyle = '#78350f';
              ctx.lineWidth = 2.5;
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(top.sx, top.sy, Math.max(5, pixelsPerMeter * 8.5), 0, Math.PI * 2);
              ctx.fillStyle = profile.id === 'oeste' ? '#65a30d' : '#15803d';
              ctx.fill();
            });
          }
        }
      }

      ctx.beginPath();
      groundPts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy)));
      if (polyLocal.length >= 3) ctx.closePath();
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 3;
      ctx.stroke();

      for (let i = 0; i < (polyLocal.length >= 3 ? polyLocal.length : polyLocal.length - 1); i++) {
        const j = (i + 1) % polyLocal.length;
        const distM = Math.round(Math.hypot(polyLocal[j].x - polyLocal[i].x, polyLocal[j].y - polyLocal[i].y));
        const mx = (groundPts[i].sx + groundPts[j].sx) / 2;
        const my = (groundPts[i].sy + groundPts[j].sy) / 2;
        if (distM > 20) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
          ctx.fillRect(mx - 22, my - 9, 44, 16);
          ctx.fillStyle = '#065f46';
          ctx.font = 'bold 10px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${distM}m`, mx, my + 3);
        }
      }
    }

    // Marcadores de altitude do relevo em 3D (Topo do morro vs Baixada)
    if (viewMode === '3d' && showRelief3D) {
      const highP = projectPoint(
        elevationBounds.maxPt.x,
        elevationBounds.maxPt.y,
        reliefZ(elevationBounds.maxPt.x, elevationBounds.maxPt.y) + 3,
        w,
        h
      );
      ctx.fillStyle = 'rgba(120, 53, 15, 0.9)';
      ctx.fillRect(highP.sx - 40, highP.sy - 18, 80, 17);
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Topo +${elevationBounds.maxM}m`, highP.sx, highP.sy - 6);
    }

    // Vértices Numerados
    polyLocal.forEach((p, idx) => {
      const sp = projectPoint(p.x, p.y, reliefZ(p.x, p.y) + 0.5, w, h);
      ctx.beginPath();
      ctx.arc(sp.sx, sp.sy, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${idx + 1}`, sp.sx, sp.sy + 3);
    });

    // Casa / Sede da Fazenda em cima do relevo
    const sedeZ = reliefZ(0, 0);
    const sedeGround = projectPoint(0, 0, sedeZ, w, h);
    if (viewMode === '3d') {
      const sTop = projectPoint(0, 0, sedeZ + 11, w, h);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(sedeGround.sx - 12, sTop.sy, 24, sedeGround.sy - sTop.sy + 4);
      ctx.beginPath();
      ctx.moveTo(sedeGround.sx - 16, sTop.sy);
      ctx.lineTo(sedeGround.sx, sTop.sy - 11);
      ctx.lineTo(sedeGround.sx + 16, sTop.sy);
      ctx.closePath();
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(sedeGround.sx, sedeGround.sy, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#e11d48';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(sedeGround.sx - 44, sedeGround.sy + 10, 88, 19);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sede (Arraste)', sedeGround.sx, sedeGround.sy + 23);

    // Rosa dos ventos
    const compassX = 34;
    const compassY = 34;
    ctx.beginPath();
    ctx.arc(compassX, compassY, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const northRad = (viewMode === '3d' ? bearingDeg : 0) * (Math.PI / 180);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('N', compassX - Math.sin(northRad) * 10, compassY - Math.cos(northRad) * 10 + 4);

    ctx.restore();
  }, [
    bearingDeg,
    elevationBounds.maxM,
    elevationBounds.maxPt.x,
    elevationBounds.maxPt.y,
    farmRadiusM,
    geometry.centroid.lat,
    geometry.centroid.lon,
    originLat,
    originLon,
    pixelsPerMeter,
    profile.id,
    projectPoint,
    reliefZ,
    satelliteStatus,
    showRelief3D,
    showRunoffArrows,
    slopePct,
    vertices,
    viewMode,
    visualStyle
  ]);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

  useEffect(() => {
    const onResize = () => drawMap();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [drawMap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      setPixelsPerMeter((z) => Math.max(0.18, Math.min(2.2, z * factor)));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const polyLocal = vertices.map((v) => latLonToLocalMeters(v.lat, v.lon, originLat, originLon));
    for (let i = 0; i < polyLocal.length; i++) {
      const vp = projectPoint(polyLocal[i].x, polyLocal[i].y, reliefZ(polyLocal[i].x, polyLocal[i].y) + 0.5, rect.width, rect.height);
      if (Math.hypot(sx - vp.sx, sy - vp.sy) <= 15) {
        dragStateRef.current = {
          active: true,
          type: 'vertex',
          vertexIdx: i,
          startClientX: e.clientX,
          startClientY: e.clientY,
          startPanX: panOffsetM.x,
          startPanY: panOffsetM.y,
          moved: false
        };
        canvas.setPointerCapture(e.pointerId);
        return;
      }
    }

    const sedePos = projectPoint(0, 0, reliefZ(0, 0), rect.width, rect.height);
    if (Math.hypot(sx - sedePos.sx, sy - sedePos.sy) <= 18) {
      dragStateRef.current = {
        active: true,
        type: 'sede',
        vertexIdx: -1,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: panOffsetM.x,
        startPanY: panOffsetM.y,
        moved: false
      };
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    dragStateRef.current = {
      active: true,
      type: 'pan',
      vertexIdx: -1,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: panOffsetM.x,
      startPanY: panOffsetM.y,
      moved: false
    };
    canvas.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const st = dragStateRef.current;
    if (!st.active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const distMoved = Math.hypot(e.clientX - st.startClientX, e.clientY - st.startClientY);
    if (distMoved > 5) st.moved = true;

    if (st.type === 'vertex' && st.vertexIdx >= 0) {
      const local = screenToLocalMeters(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
      const nextPt = localMetersToLatLon(local.mx, local.my, originLat, originLon);
      const nextVerts = [...vertices];
      nextVerts[st.vertexIdx] = nextPt;
      onUpdateProfile({ ...profile, polygonVertices: nextVerts });
      return;
    }

    if (st.type === 'pan' && st.moved) {
      const dScreenX = e.clientX - st.startClientX;
      const dScreenY = e.clientY - st.startClientY;
      const tiltMul = viewMode === '3d' ? 1.55 : 1;
      const rad = -(viewMode === '3d' ? bearingDeg : 0) * (Math.PI / 180);
      const dmx = -dScreenX / pixelsPerMeter;
      const dmy = (dScreenY * tiltMul) / pixelsPerMeter;
      const rotX = dmx * Math.cos(rad) - dmy * Math.sin(rad);
      const rotY = dmx * Math.sin(rad) + dmy * Math.cos(rad);
      setPanOffsetM({ x: st.startPanX + rotX, y: st.startPanY + rotY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const st = dragStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (st.type === 'sede' && st.moved) {
      const local = screenToLocalMeters(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
      const nextSede = localMetersToLatLon(local.mx, local.my, originLat, originLon);
      onUpdateProfile({
        ...profile,
        latitude: nextSede.lat,
        longitude: nextSede.lon
      });
    } else if (!st.moved && st.type === 'pan' && drawingMode) {
      const local = screenToLocalMeters(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
      const nextPt = localMetersToLatLon(local.mx, local.my, originLat, originLon);
      onUpdateProfile({
        ...profile,
        polygonVertices: [...vertices, nextPt]
      });
    }

    st.active = false;
  };

  const handleApplyCoords = () => {
    const lat = Number(latInput);
    const lon = Number(lonInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return;
    }
    setPanOffsetM({ x: 0, y: 0 });
    onUpdateProfile({
      ...profile,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lon.toFixed(6))
    });
  };

  const handleUseBrowserGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Seu navegador não tem acesso ao GPS.');
      return;
    }
    setGpsStatus('Buscando sua localização...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        setLatInput(String(lat));
        setLonInput(String(lon));
        setPanOffsetM({ x: 0, y: 0 });
        onUpdateProfile({ ...profile, latitude: lat, longitude: lon });
        setGpsStatus('Localização encontrada e aplicada!');
      },
      () => setGpsStatus('Não foi possível acessar o GPS agora. Use o seletor de cidade.')
    );
  };

  const handleGenerateFromRadius = () => {
    const r = farmRadiusM;
    const offsets = [
      [-r * 0.78, r * 0.65],
      [r * 0.72, r * 0.74],
      [r * 0.85, -r * 0.45],
      [-r * 0.15, -r * 0.85],
      [-r * 0.82, -r * 0.35]
    ];
    const generated = offsets.map(([dx, dy]) => localMetersToLatLon(dx, dy, originLat, originLon));
    onUpdateProfile({ ...profile, polygonVertices: generated });
  };

  const handleApplyDelimitedArea = () => {
    if (geometry.areaHa <= 0.05) return;
    const newTotalHa = Number(geometry.areaHa.toFixed(2));
    const ratio = profile.totalAreaHa > 0 ? profile.cacaoAreaHa / profile.totalAreaHa : 0.7;
    const newCacaoHa = Number(Math.max(0.5, newTotalHa * ratio).toFixed(2));
    const newEstimatedPlants = Math.round(newCacaoHa * profile.plantingDensityPerHa);
    onUpdateProfile({
      ...profile,
      totalAreaHa: newTotalHa,
      cacaoAreaHa: newCacaoHa,
      estimatedPlants: newEstimatedPlants
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 4000);
  };

  const handleUpdateSlope = (nextSlope: number) => {
    const profileType =
      nextSlope <= 5
        ? 'plano'
        : nextSlope <= 12
        ? 'ondulado'
        : nextSlope <= 22
        ? 'morro'
        : 'escarpado';
    onUpdateProfile({
      ...profile,
      terrainSlopePct: nextSlope,
      terrainProfileType: profileType
    });
  };

  return (
    <div className="space-y-5">
      {/* Barra de Controles Fáceis do Mapa */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            Mapa 2D / 3D com Relevo da Fazenda
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Alterne para <strong>Vista 3D</strong> para enxergar morros, baixadas e para onde a chuva escorre na sua propriedade.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`px-3 py-2 rounded-lg inline-flex items-center gap-1.5 transition-all ${
                viewMode === '2d' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              Vista 2D
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`px-3 py-2 rounded-lg inline-flex items-center gap-1.5 transition-all ${
                viewMode === '3d' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white'
              }`}
            >
              <Box className="w-4 h-4" />
              Vista 3D (Relevo)
            </button>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setVisualStyle('agro')}
              className={`px-3 py-2 rounded-lg inline-flex items-center gap-1.5 transition-all ${
                visualStyle === 'agro' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'
              }`}
            >
              <Trees className="w-4 h-4" />
              Relevo Agro
            </button>
            <button
              type="button"
              onClick={() => setVisualStyle('satellite')}
              className={`px-3 py-2 rounded-lg inline-flex items-center gap-1.5 transition-all ${
                visualStyle === 'satellite' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              <Satellite className="w-4 h-4" />
              Satélite
            </button>
          </div>

          {viewMode === '3d' && (
            <button
              type="button"
              onClick={() => setShowRelief3D((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                showRelief3D
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              <Mountain className="w-4 h-4 text-emerald-700" />
              {showRelief3D ? 'Relevo 3D Ativo' : 'Ativar Relevo 3D'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowRunoffArrows((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              showRunoffArrows
                ? 'bg-sky-50 text-sky-900 border-sky-300'
                : 'bg-white text-slate-600 border-slate-300'
            }`}
          >
            <CloudRain className="w-4 h-4 text-sky-600" />
            {showRunoffArrows ? 'Fluxo da Chuva' : 'Ver Fluxo Chuva'}
          </button>

          <button
            type="button"
            onClick={() => setDrawingMode((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              drawingMode
                ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Pencil className="w-4 h-4" />
            {drawingMode ? 'Marcando Pontos' : 'Marcar Limites'}
          </button>
        </div>
      </div>

      {visualStyle === 'satellite' && satelliteStatus === 'fallback' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Sem acesso às imagens externas de satélite agora. Exibindo o <strong>Relevo Agro Offline</strong> sem erros.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setVisualStyle('agro')}
            className="text-xs font-bold text-amber-950 underline shrink-0"
          >
            Usar Relevo Agro
          </button>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 space-y-4">
          {/* Passo 1: Onde fica a sede */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-xs">1</span>
              Localização da Fazenda
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleUseBrowserGps}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-3 rounded-xl inline-flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Compass className="w-4 h-4" />
                Meu GPS
              </button>
              <select
                value=""
                onChange={(e) => {
                  const found = BAHIA_PRESETS.find((p) => p.label === e.target.value);
                  if (!found) return;
                  setLatInput(String(found.lat));
                  setLonInput(String(found.lon));
                  setPanOffsetM({ x: 0, y: 0 });
                  onUpdateProfile({ ...profile, latitude: found.lat, longitude: found.lon });
                }}
                className="border border-slate-300 rounded-xl px-2.5 py-2 bg-white font-semibold text-slate-700"
              >
                <option value="">Cidade BA...</option>
                {BAHIA_PRESETS.map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {gpsStatus && <p className="text-[11px] text-sky-700 font-semibold">{gpsStatus}</p>}

            <button
              type="button"
              onClick={() => setShowCoordsHelp((v) => !v)}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <Crosshair className="w-3.5 h-3.5" />
              {showCoordsHelp ? 'Ocultar Latitude / Longitude' : 'Digitar Latitude / Longitude'}
            </button>

            {showCoordsHelp && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={latInput}
                    onChange={(e) => setLatInput(e.target.value)}
                    placeholder="Latitude"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={lonInput}
                    onChange={(e) => setLonInput(e.target.value)}
                    placeholder="Longitude"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyCoords}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-1.5 px-3 rounded-lg inline-flex items-center justify-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Ir para Coordenada
                </button>
              </div>
            )}
          </div>

          {/* Passo 2: Relevo 3D e Influência na Chuva */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 text-xs">
            <div className="font-bold text-slate-900 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-xs">2</span>
                Relevo e Chuva no Terreno
              </span>
              <span className="font-mono font-bold text-emerald-700">{slopePct}% declive</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'Plano', val: 3 },
                { label: 'Ondulado', val: 10 },
                { label: 'Morro', val: 18 },
                { label: 'Íngreme', val: 28 }
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleUpdateSlope(preset.val)}
                  className={`py-1.5 px-1 rounded-lg font-bold border text-[11px] transition-all ${
                    Math.abs(slopePct - preset.val) <= 3
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <input
              type="range"
              min={1}
              max={35}
              step={1}
              value={slopePct}
              onChange={(e) => handleUpdateSlope(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />

            {/* Resumo instantâneo de como o relevo afeta a chuva */}
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-950">Simular chuva neste relevo:</span>
                <span className="font-mono font-bold text-sky-800">{sampleRainMm} mm</span>
              </div>
              <input
                type="range"
                min={10}
                max={120}
                step={5}
                value={sampleRainMm}
                onChange={(e) => setSampleRainMm(Number(e.target.value))}
                className="w-full accent-sky-600"
              />

              {/* Barra Visual Infiltra vs Escorre */}
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-200">
                <div
                  style={{ width: `${reliefRainImpact.infiltrationPct}%` }}
                  className="bg-emerald-600 h-full"
                  title={`Infiltra na raiz: ${reliefRainImpact.infiltrationPct}%`}
                />
                <div
                  style={{ width: `${reliefRainImpact.runoffPct}%` }}
                  className="bg-amber-500 h-full"
                  title={`Escorre morro abaixo: ${reliefRainImpact.runoffPct}%`}
                />
              </div>

              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-emerald-800">
                  Entra no solo: {reliefRainImpact.infiltrationPct}% ({reliefRainImpact.infiltratedMm} mm)
                </span>
                <span className="text-amber-800">
                  Escorre: {reliefRainImpact.runoffPct}% ({reliefRainImpact.runoffMm} mm)
                </span>
              </div>

              <p className="text-[11px] text-slate-700 leading-snug">
                Desnível visível no 3D: <strong>{elevationBounds.minM}m (baixada)</strong> até{' '}
                <strong>{elevationBounds.maxM}m (topo)</strong>. Com {profile.cacaoAreaHa} ha, caixas secas na baixada podem aproveitar{' '}
                <strong>+{reliefRainImpact.collectibleRunoffM3} m³</strong> dessa enxurrada.
              </p>

              {onOpenSimulator && (
                <button
                  type="button"
                  onClick={onOpenSimulator}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-white hover:bg-sky-100 text-sky-900 font-bold border border-sky-300 inline-flex items-center justify-center gap-1"
                >
                  <span>Abrir Simulador Completo de Relevo e Chuva</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Passo 3: Raio, Limites e Área Medida */}
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-3 text-xs">
            <div className="font-bold text-emerald-950 text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-xs">3</span>
                Raio e Área Delimitada
              </span>
              <span className="font-mono text-sky-800 font-bold">{farmRadiusM} m</span>
            </div>

            <input
              type="range"
              min={100}
              max={1500}
              step={20}
              value={farmRadiusM}
              onChange={(e) => onUpdateProfile({ ...profile, farmRadiusM: Number(e.target.value) })}
              className="w-full accent-sky-600"
            />

            {viewMode === '3d' && (
              <label className="block space-y-1">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Girar Relevo 3D</span>
                  <span className="font-mono">{bearingDeg}°</span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={5}
                  value={bearingDeg}
                  onChange={(e) => setBearingDeg(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </label>
            )}

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateProfile({ ...profile, polygonVertices: vertices.slice(0, -1) })}
                disabled={vertices.length === 0}
                className="border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-800 font-bold py-1.5 px-2 rounded-lg inline-flex items-center justify-center gap-1"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Desfazer
              </button>
              <button
                type="button"
                onClick={() => onUpdateProfile({ ...profile, polygonVertices: [] })}
                disabled={vertices.length === 0}
                className="border border-rose-200 bg-white hover:bg-rose-50 disabled:opacity-40 text-rose-800 font-bold py-1.5 px-2 rounded-lg inline-flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar
              </button>
              <button
                type="button"
                onClick={handleGenerateFromRadius}
                className="border border-sky-200 bg-white hover:bg-sky-50 text-sky-900 font-bold py-1.5 px-2 rounded-lg inline-flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Do Raio
              </button>
            </div>

            <div className="bg-white p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <div className="text-slate-500">Área Marcada</div>
                <div className="text-xl font-black text-emerald-800">{geometry.areaHa.toFixed(2)} ha</div>
              </div>
              <div className="text-right">
                <div className="text-slate-500">Perímetro</div>
                <div className="text-sm font-bold text-slate-900">{Math.round(geometry.perimeterM)} m</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyDelimitedArea}
              disabled={geometry.areaHa <= 0.05}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold py-2.5 px-4 rounded-xl inline-flex items-center justify-center gap-2 shadow-sm text-xs transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Salvar Área na Minha Fazenda
            </button>

            {savedNotice && (
              <div className="p-2 rounded-lg bg-emerald-600 text-white font-bold text-center">
                Área de {geometry.areaHa.toFixed(2)} ha salva!
              </div>
            )}

            <p className="text-[11px] text-emerald-900 flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 shrink-0" />
              <span>Cadastro atual: <strong>{profile.totalAreaHa} ha</strong> ({profile.cacaoAreaHa} ha cacau).</span>
            </p>
          </div>
        </div>

        {/* Canvas Interativo 2D/3D */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3 font-medium text-slate-700">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-600" />
                  Sede
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-sky-500" />
                  Raio {farmRadiusM} m
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-600" />
                  Desnível {elevationBounds.diffM} m ({slopePct}%)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  {vertices.length} cantos
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPixelsPerMeter((z) => Math.min(2.2, z * 1.2))}
                  title="Aproximar Zoom"
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPixelsPerMeter((z) => Math.max(0.18, z / 1.2))}
                  title="Afastar Zoom"
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPanOffsetM({ x: 0, y: 0 });
                    setPixelsPerMeter(0.55);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold"
                >
                  Centralizar
                </button>
              </div>
            </div>

            <div className="relative">
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={`w-full h-[560px] block touch-none ${
                  drawingMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
                }`}
              />

              <div className="pointer-events-none absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm">
                {drawingMode
                  ? 'Clique no terreno para marcar os cantos • Setas azuis indicam descida da chuva'
                  : 'Arraste para mover • Role para zoom • Use "Girar Relevo 3D" para ver os morros'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
