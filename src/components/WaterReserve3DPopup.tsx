import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Box,
  Droplets,
  RotateCcw,
  CloudRain,
  TrendingUp,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { PropertyProfile } from '../types';

interface WaterReserve3DPopupProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PropertyProfile;
  totalNominalM3: number;
  totalApparentM3: number;
  totalRealM3: number;
  siltationHiddenM3: number;
  dailyDemandM3: number;
  sprinklerDailyM3: number;
  realAutonomyDays: number;
  sprinklerAutonomyDays: number;
  autonomyGainDays: number;
  rain40mmLiters: number;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Quad3D {
  pts: Array<{ sx: number; sy: number }>;
  depth: number;
  fill: string;
  stroke: string;
}

function projectPoint(
  p: Vec3,
  yawDeg: number,
  pitchDeg: number,
  w: number,
  h: number,
  scale: number
): { sx: number; sy: number; depth: number } {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;

  // Rotate around Y (yaw)
  const x1 = p.x * Math.cos(yaw) - p.z * Math.sin(yaw);
  const z1 = p.x * Math.sin(yaw) + p.z * Math.cos(yaw);

  // Rotate around X (pitch)
  const y2 = p.y * Math.cos(pitch) - z1 * Math.sin(pitch);
  const z2 = p.y * Math.sin(pitch) + z1 * Math.cos(pitch);

  const camDist = 6.2;
  const persp = camDist / Math.max(1.5, camDist - z2);

  return {
    sx: w / 2 + x1 * scale * persp,
    sy: h / 2 - y2 * scale * persp + 12,
    depth: z2,
  };
}

function buildBoxQuads(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  yawDeg: number,
  pitchDeg: number,
  w: number,
  h: number,
  scale: number,
  colors: {
    top: string;
    bottom: string;
    sideA: string;
    sideB: string;
    stroke: string;
  }
): Quad3D[] {
  const c: Vec3[] = [
    { x: x0, y: y0, z: z0 }, // 0
    { x: x1, y: y0, z: z0 }, // 1
    { x: x1, y: y0, z: z1 }, // 2
    { x: x0, y: y0, z: z1 }, // 3
    { x: x0, y: y1, z: z0 }, // 4
    { x: x1, y: y1, z: z0 }, // 5
    { x: x1, y: y1, z: z1 }, // 6
    { x: x0, y: y1, z: z1 }, // 7
  ];

  const p = c.map((pt) => projectPoint(pt, yawDeg, pitchDeg, w, h, scale));
  const faces: Array<{ idx: [number, number, number, number]; fill: string }> = [
    { idx: [0, 1, 2, 3], fill: colors.bottom },
    { idx: [4, 5, 6, 7], fill: colors.top },
    { idx: [0, 1, 5, 4], fill: colors.sideA },
    { idx: [2, 3, 7, 6], fill: colors.sideA },
    { idx: [1, 2, 6, 5], fill: colors.sideB },
    { idx: [3, 0, 4, 7], fill: colors.sideB },
  ];

  return faces.map((f) => {
    const pts = f.idx.map((i) => ({ sx: p[i].sx, sy: p[i].sy }));
    const depth = f.idx.reduce((acc, i) => acc + p[i].depth, 0) / 4;
    return { pts, depth, fill: f.fill, stroke: colors.stroke };
  });
}

export const WaterReserve3DPopup: React.FC<WaterReserve3DPopupProps> = ({
  isOpen,
  onClose,
  profile,
  totalNominalM3,
  totalApparentM3,
  totalRealM3,
  siltationHiddenM3,
  dailyDemandM3,
  sprinklerDailyM3,
  realAutonomyDays,
  sprinklerAutonomyDays,
  autonomyGainDays,
  rain40mmLiters,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [compareMode, setCompareMode] = useState<'drip' | 'sprinkler'>('drip');
  const [includeRoofRain, setIncludeRoofRain] = useState<boolean>(false);
  const [yawDeg, setYawDeg] = useState<number>(36);
  const [pitchDeg, setPitchDeg] = useState<number>(26);
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startYaw: number;
    startPitch: number;
  }>({ active: false, startX: 0, startY: 0, startYaw: 36, startPitch: 26 });

  const roofBonusM3 = useMemo(() => Number((rain40mmLiters / 1000).toFixed(1)), [rain40mmLiters]);
  const effectiveStartM3 = useMemo(
    () => Math.min(totalNominalM3, totalRealM3 + (includeRoofRain ? roofBonusM3 : 0)),
    [includeRoofRain, roofBonusM3, totalNominalM3, totalRealM3]
  );

  // Série diária de 0 a 30 dias
  const dailySeries = useMemo(() => {
    return Array.from({ length: 31 }, (_, day) => {
      const drip = Math.max(0, Number((effectiveStartM3 - dailyDemandM3 * day).toFixed(1)));
      const sprinkler = Math.max(0, Number((effectiveStartM3 - sprinklerDailyM3 * day).toFixed(1)));
      return { day, drip, sprinkler };
    });
  }, [dailyDemandM3, effectiveStartM3, sprinklerDailyM3]);

  const activeDay = hoverDay ?? selectedDay;
  const activeEntry = dailySeries[activeDay] ?? dailySeries[0];
  const remainingWaterM3 = compareMode === 'drip' ? activeEntry.drip : activeEntry.sprinkler;
  const dailySavedM3 = Math.max(0, Math.round((sprinklerDailyM3 - dailyDemandM3) * 10) / 10);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Renderização 3D contínua (onda leve na lâmina d'água + projeção orbital)
  useEffect(() => {
    if (!isOpen) return;
    let rafId = 0;

    const render = (timeMs: number) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const w = Math.round(rect.width);
          const h = Math.round(rect.height);
          if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
            canvas.width = w * dpr;
            canvas.height = h * dpr;
          }
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.save();
            ctx.scale(dpr, dpr);

            // Fundo técnico 3D em degradê sutil
            const bg = ctx.createLinearGradient(0, 0, 0, h);
            bg.addColorStop(0, '#0f172a');
            bg.addColorStop(1, '#1e293b');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, w, h);

            const scale = Math.min(w, h) * 0.25;
            const totalCap = Math.max(1, totalNominalM3);
            const siltFrac = Math.min(0.32, Math.max(0, siltationHiddenM3 / totalCap));
            const waterFrac = Math.min(1 - siltFrac, Math.max(0, remainingWaterM3 / totalCap));

            const tankH = 1.9;
            const yBase = -0.95;
            const ySiltTop = yBase + siltFrac * tankH;
            const waveOffset = Math.sin(timeMs / 520) * 0.015;
            const yWaterTop = Math.max(ySiltTop, ySiltTop + waterFrac * tankH + (waterFrac > 0.02 ? waveOffset : 0));

            const quads: Quad3D[] = [];

            // 1. Sombra/Base do solo ao redor do açude
            quads.push(
              ...buildBoxQuads(-1.35, 1.35, yBase - 0.1, yBase, -1.1, 1.1, yawDeg, pitchDeg, w, h, scale, {
                top: '#1e3a2f',
                bottom: '#0f172a',
                sideA: '#142921',
                sideB: '#0f2019',
                stroke: 'rgba(16, 185, 129, 0.25)',
              })
            );

            // 2. Camada de Lodo / Assoreamento no fundo
            if (siltFrac > 0.01) {
              quads.push(
                ...buildBoxQuads(-1.0, 1.0, yBase, ySiltTop, -0.78, 0.78, yawDeg, pitchDeg, w, h, scale, {
                  top: '#78350f',
                  bottom: '#451a03',
                  sideA: '#6b3214',
                  sideB: '#54240d',
                  stroke: 'rgba(245, 158, 11, 0.4)',
                })
              );
            }

            // 3. Volume Real de Água Útil no Dia Selecionado
            if (waterFrac > 0.008) {
              const critical = remainingWaterM3 < totalRealM3 * 0.25;
              const waterColors = critical
                ? {
                    top: 'rgba(251, 146, 60, 0.88)',
                    bottom: 'rgba(194, 65, 12, 0.72)',
                    sideA: 'rgba(249, 115, 22, 0.7)',
                    sideB: 'rgba(234, 88, 12, 0.62)',
                    stroke: 'rgba(253, 186, 116, 0.75)',
                  }
                : compareMode === 'drip'
                  ? {
                      top: 'rgba(56, 189, 248, 0.9)',
                      bottom: 'rgba(2, 132, 199, 0.78)',
                      sideA: 'rgba(14, 165, 233, 0.72)',
                      sideB: 'rgba(3, 105, 161, 0.68)',
                      stroke: 'rgba(186, 230, 253, 0.85)',
                    }
                  : {
                      top: 'rgba(148, 163, 184, 0.82)',
                      bottom: 'rgba(71, 85, 105, 0.75)',
                      sideA: 'rgba(100, 116, 139, 0.68)',
                      sideB: 'rgba(71, 85, 105, 0.64)',
                      stroke: 'rgba(226, 232, 240, 0.7)',
                    };

              quads.push(
                ...buildBoxQuads(-0.98, 0.98, ySiltTop, yWaterTop, -0.76, 0.76, yawDeg, pitchDeg, w, h, scale, waterColors)
              );
            }

            // 4. Estrutura / Parede Translúcida da Caixa d'Água / Açude (altura nominal)
            quads.push(
              ...buildBoxQuads(-1.02, 1.02, yBase, yBase + tankH, -0.8, 0.8, yawDeg, pitchDeg, w, h, scale, {
                top: 'rgba(255, 255, 255, 0.04)',
                bottom: 'rgba(255, 255, 255, 0.02)',
                sideA: 'rgba(148, 163, 184, 0.1)',
                sideB: 'rgba(100, 116, 139, 0.08)',
                stroke: 'rgba(226, 232, 240, 0.42)',
              })
            );

            // 5. Mini Barcaça / Telhado de Captação Pluvial ao lado (quando ativo)
            if (includeRoofRain) {
              quads.push(
                ...buildBoxQuads(1.18, 1.72, yBase, yBase + 0.55, -0.42, 0.42, yawDeg, pitchDeg, w, h, scale, {
                  top: '#0284c7',
                  bottom: '#1e293b',
                  sideA: '#94a3b8',
                  sideB: '#64748b',
                  stroke: 'rgba(125, 211, 252, 0.85)',
                })
              );
            }

            // Painter's algorithm (desenha de trás para frente)
            quads.sort((a, b) => a.depth - b.depth);
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
              ctx.lineWidth = 1.1;
              ctx.stroke();
            }

            ctx.restore();
          }
        }
      }
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [
    compareMode,
    includeRoofRain,
    isOpen,
    pitchDeg,
    remainingWaterM3,
    siltationHiddenM3,
    totalNominalM3,
    totalRealM3,
    yawDeg,
  ]);

  if (!isOpen) return null;

  // Dimensões do Gráfico SVG de 30 dias
  const chartW = 500;
  const chartH = 210;
  const padL = 42;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const yMax = Math.max(100, totalNominalM3);

  const toX = (day: number) => padL + (day / 30) * innerW;
  const toY = (val: number) => padT + (1 - Math.min(1, Math.max(0, val / yMax))) * innerH;

  const dripPath = dailySeries
    .map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(d.day).toFixed(1)} ${toY(d.drip).toFixed(1)}`)
    .join(' ');
  const dripArea = `${dripPath} L ${toX(30).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${toX(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;
  const sprinklerPath = dailySeries
    .map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(d.day).toFixed(1)} ${toY(d.sprinkler).toFixed(1)}`)
    .join(' ');

  const criticalThresholdM3 = totalRealM3 * 0.2;
  const criticalY = toY(criticalThresholdM3);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Pop-up */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Box className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                Raio-X Hídrico 3D — {profile.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Modelo volumétrico da reserva real, perda por lodo e projeção em 30 dias
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Fechar pop-up 3D"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* KPIs rápidos do Pop-up */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
              <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 block">
                Água Útil Hoje
              </span>
              <span className="text-xl font-black text-sky-950 dark:text-white">
                {Math.round(totalRealM3)} m³
              </span>
              <span className="text-[11px] text-sky-700/80 dark:text-sky-300/80 block">
                de {totalNominalM3} m³ nominais
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block">
                Lodo Descontado
              </span>
              <span className="text-xl font-black text-amber-950 dark:text-white">
                -{siltationHiddenM3} m³
              </span>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80 block">
                Aparente era {Math.round(totalApparentM3)} m³
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">
                Ganho do Gotejamento
              </span>
              <span className="text-xl font-black text-emerald-900 dark:text-emerald-300">
                +{autonomyGainDays} dias
              </span>
              <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 block">
                {realAutonomyDays}d gotejo vs {sprinklerAutonomyDays}d comum
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 block">
                Economia Diária
              </span>
              <span className="text-xl font-black text-indigo-950 dark:text-white">
                +{dailySavedM3} m³/dia
              </span>
              <span className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 block">
                +{(roofBonusM3).toFixed(1)} m³ por chuva 40mm
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* ESQUERDA (5 cols): RESERVATÓRIO 3D ORBITAL */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-900 overflow-hidden flex flex-col">
              <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 text-xs text-white">
                <span className="font-bold inline-flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-sky-400" />
                  Reservatório 3D (Arraste para girar)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setYawDeg(36);
                    setPitchDeg(26);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Resetar
                </button>
              </div>

              <div className="relative h-64 sm:h-72 w-full">
                <canvas
                  ref={canvasRef}
                  onPointerDown={(e) => {
                    dragRef.current = {
                      active: true,
                      startX: e.clientX,
                      startY: e.clientY,
                      startYaw: yawDeg,
                      startPitch: pitchDeg,
                    };
                  }}
                  onPointerMove={(e) => {
                    if (!dragRef.current.active) return;
                    const dx = e.clientX - dragRef.current.startX;
                    const dy = e.clientY - dragRef.current.startY;
                    setYawDeg(dragRef.current.startYaw + dx * 0.45);
                    setPitchDeg(Math.max(8, Math.min(62, dragRef.current.startPitch + dy * 0.35)));
                  }}
                  onPointerUp={() => {
                    dragRef.current.active = false;
                  }}
                  onPointerCancel={() => {
                    dragRef.current.active = false;
                  }}
                  className="w-full h-full block touch-none cursor-grab active:cursor-grabbing"
                />

                {/* HUD sobre o Canvas 3D */}
                <div className="pointer-events-none absolute top-3 left-3 bg-slate-950/75 backdrop-blur-xs border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Dia {activeDay} ({compareMode === 'drip' ? 'Gotejamento' : 'Aspersão'})
                  </div>
                  <div className="text-base font-black text-sky-300">
                    {Math.round(remainingWaterM3)} m³ restantes
                  </div>
                </div>

                {/* Legenda 3D */}
                <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-200 bg-slate-950/70 px-2.5 py-1.5 rounded-xl border border-slate-800">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block" /> Água Útil
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-800 inline-block" /> Lodo (-{siltationHiddenM3} m³)
                  </span>
                  {includeRoofRain && (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Telhados (+{roofBonusM3} m³)
                    </span>
                  )}
                </div>
              </div>

              {/* Controles Interativos do 3D */}
              <div className="p-3.5 bg-slate-950/90 border-t border-slate-800 space-y-3 text-xs text-slate-200">
                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span>Simular Consumo no Dia:</span>
                    <span className="text-sky-300">Dia {selectedDay}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex rounded-xl bg-slate-800 p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setCompareMode('drip')}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                        compareMode === 'drip' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Gotejamento
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompareMode('sprinkler')}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                        compareMode === 'sprinkler' ? 'bg-slate-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Aspersão Comum
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIncludeRoofRain((v) => !v)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition ${
                      includeRoofRain
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <CloudRain className="w-3.5 h-3.5" />
                    {includeRoofRain ? 'Chuva Telhados ON' : '+ Simular Chuva 40mm'}
                  </button>
                </div>
              </div>
            </div>

            {/* DIREITA (7 cols): GRÁFICOS DETALHADOS */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Gráfico 1: Curva 30 dias */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Gráfico de Autonomia em 30 Dias (m³ restantes)
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <span className="w-2.5 h-0.5 bg-emerald-500 inline-block" /> Gotejo
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <span className="w-2.5 h-0.5 bg-slate-400 inline-block" /> Aspersão
                    </span>
                  </div>
                </div>

                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  className="w-full h-auto overflow-visible select-none"
                  onMouseLeave={() => setHoverDay(null)}
                >
                  {/* Grid horizontal */}
                  {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                    const y = padT + (1 - frac) * innerH;
                    const labelVal = Math.round(yMax * frac);
                    return (
                      <g key={frac}>
                        <line
                          x1={padL}
                          x2={chartW - padR}
                          y1={y}
                          y2={y}
                          stroke="currentColor"
                          className="text-slate-200 dark:text-slate-700"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={padL - 6}
                          y={y + 3}
                          textAnchor="end"
                          className="fill-slate-400 text-[9px] font-mono"
                        >
                          {labelVal}
                        </text>
                      </g>
                    );
                  })}

                  {/* Zona crítica */}
                  <line
                    x1={padL}
                    x2={chartW - padR}
                    y1={criticalY}
                    y2={criticalY}
                    stroke="#ef4444"
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                  />
                  <text x={chartW - padR} y={criticalY - 4} textAnchor="end" className="fill-rose-500 text-[9px] font-bold">
                    Nível Crítico (20%)
                  </text>

                  {/* Área e curva Gotejamento */}
                  <path d={dripArea} fill="rgba(16, 185, 129, 0.14)" />
                  <path d={dripPath} fill="none" stroke="#10b981" strokeWidth="2.8" strokeLinecap="round" />

                  {/* Curva Aspersão */}
                  <path
                    d={sprinklerPath}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                  />

                  {/* Eixo X dias */}
                  {[0, 5, 10, 15, 20, 25, 30].map((d) => (
                    <text
                      key={d}
                      x={toX(d)}
                      y={chartH - 8}
                      textAnchor="middle"
                      className="fill-slate-500 dark:fill-slate-400 text-[9px] font-semibold"
                    >
                      D{d}
                    </text>
                  ))}

                  {/* Cursor interativo do Dia */}
                  <line
                    x1={toX(activeDay)}
                    x2={toX(activeDay)}
                    y1={padT}
                    y2={padT + innerH}
                    stroke="#0284c7"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <circle cx={toX(activeDay)} cy={toY(activeEntry.drip)} r="4.5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
                  <circle cx={toX(activeDay)} cy={toY(activeEntry.sprinkler)} r="4" fill="#64748b" stroke="#fff" strokeWidth="1.5" />

                  {/* Hit zones clicáveis/hover */}
                  {dailySeries.map((d) => (
                    <rect
                      key={d.day}
                      x={toX(d.day) - innerW / 62}
                      y={padT}
                      width={innerW / 31}
                      height={innerH}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoverDay(d.day)}
                      onClick={() => setSelectedDay(d.day)}
                    />
                  ))}
                </svg>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white dark:bg-slate-900 rounded-xl px-3 py-2 border border-slate-200/80 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    Dia {activeDay}:
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">
                    Gotejamento: {activeEntry.drip} m³
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-bold">
                    Rega Comum: {activeEntry.sprinkler} m³
                  </span>
                </div>
              </div>

              {/* Gráfico 2: Consumo por Talhão e Assoreamento */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-sky-600" />
                    Consumo Diário por Talhão ({dailyDemandM3} m³/dia)
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    {profile.sectors.length} setores
                  </span>
                </div>

                <div className="space-y-2.5">
                  {profile.sectors.map((sec) => {
                    const secM3 = Number(((sec.plantsCount * sec.targetLitersPerPlantDay) / 1000).toFixed(1));
                    const pct = Math.round((secM3 / Math.max(0.1, dailyDemandM3)) * 100);
                    return (
                      <div key={sec.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Droplets className="w-3.5 h-3.5 text-sky-500" />
                            {sec.name} ({sec.areaHa} ha • {sec.targetLitersPerPlantDay} L/pé)
                          </span>
                          <span className="font-black text-slate-900 dark:text-white">
                            {secM3} m³/dia ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              sec.diagnosticStatus === 'ok'
                                ? 'bg-emerald-500'
                                : sec.diagnosticStatus === 'clogged_alert'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {siltationHiddenM3 > 0 && (
                  <div className="flex items-start gap-2 text-[11px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-3 py-2 rounded-xl">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      Há <strong>{siltationHiddenM3} m³</strong> ocupados por lodo/assoreamento no fundo. Desassorear na estação seca devolve até{' '}
                      <strong>{Math.floor(siltationHiddenM3 / Math.max(1, dailyDemandM3))} dias</strong> de autonomia extras.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
