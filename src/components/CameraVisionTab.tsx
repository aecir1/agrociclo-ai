import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PropertyProfile } from '../types';
import { ToggleSwitch } from './ToggleSwitch';
import {
  analyzeCacaoImageWithML,
  DiagnosisClass,
  VisionDiagnosisResult,
} from '../ml/cacaoVisionClassifier';
import {
  Camera,
  Upload,
  Video,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Droplets,
  SlidersHorizontal,
  Scan,
  Sparkles,
  Check,
} from 'lucide-react';

interface CameraVisionTabProps {
  profile: PropertyProfile;
  onUpdateProfile: (updated: PropertyProfile) => void;
}

const SAMPLE_PRESETS: Array<{ id: DiagnosisClass; label: string; badgeClass: string }> = [
  {
    id: 'vassoura_de_bruxa',
    label: 'Exemplo: Vassoura-de-Bruxa',
    badgeClass:
      'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/60',
  },
  {
    id: 'estresse_hidrico',
    label: 'Exemplo: Falta de Água (Seca)',
    badgeClass:
      'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60',
  },
  {
    id: 'saudavel',
    label: 'Exemplo: Folha Saudável',
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60',
  },
];

/**
 * Gera uma imagem ilustrativa em DataURL para os testes rápidos sem câmera,
 * garantindo que o estado da imagem seja idêntico ao de uma foto enviada pelo produtor.
 */
function renderSampleDataUrl(preset: DiagnosisClass): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Fundo natural sombreado de lavoura
  ctx.fillStyle = preset === 'vassoura_de_bruxa' ? '#1e281d' : preset === 'estresse_hidrico' ? '#2c2215' : '#17301e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (preset === 'saudavel') {
    ctx.strokeStyle = '#365e32';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(45, 290);
    ctx.quadraticCurveTo(210, 175, 430, 50);
    ctx.stroke();

    const leaves = [
      { x: 130, y: 225, a: -0.45, s: 1.0 },
      { x: 195, y: 185, a: 0.35, s: 1.08 },
      { x: 255, y: 150, a: -0.35, s: 1.05 },
      { x: 325, y: 112, a: 0.3, s: 0.95 },
      { x: 385, y: 78, a: -0.25, s: 0.85 },
    ];
    leaves.forEach((lf) => {
      ctx.save();
      ctx.translate(lf.x, lf.y);
      ctx.rotate(lf.a);
      ctx.scale(lf.s, lf.s);
      ctx.fillStyle = '#2d8a47';
      ctx.beginPath();
      ctx.ellipse(0, 0, 58, 23, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-48, 0);
      ctx.lineTo(48, 0);
      ctx.stroke();
      ctx.restore();
    });
  } else if (preset === 'estresse_hidrico') {
    ctx.strokeStyle = '#6f5333';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(50, 290);
    ctx.quadraticCurveTo(230, 180, 420, 65);
    ctx.stroke();

    const leaves = [
      { x: 135, y: 225, a: -0.35, c: '#c7a432', edge: '#8c4b1f' },
      { x: 215, y: 185, a: 0.4, c: '#b88928', edge: '#7a3b14' },
      { x: 280, y: 142, a: -0.3, c: '#c9a63a', edge: '#8c4b1f' },
      { x: 350, y: 102, a: 0.35, c: '#9e7226', edge: '#6d3111' },
    ];
    leaves.forEach((lf) => {
      ctx.save();
      ctx.translate(lf.x, lf.y);
      ctx.rotate(lf.a);
      ctx.fillStyle = lf.c;
      ctx.strokeStyle = lf.edge;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 56, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  } else {
    // Ramo verde saudável à esquerda + vassoura seca e inchada aglomerada no centro-direita
    ctx.fillStyle = '#2d7a42';
    ctx.beginPath();
    ctx.ellipse(90, 230, 45, 18, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Superbrotamento tipo vassoura-de-bruxa (ramos inchados + folhas secas marrom-escuras)
    ctx.strokeStyle = '#5c331c';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(230, 285);
    ctx.lineTo(255, 185);
    ctx.stroke();

    for (let i = 0; i < 16; i++) {
      const ang = -2.2 + (i * 1.45) / 15;
      const len = 75 + (i % 3) * 28;
      const tx = 255 + Math.cos(ang) * len;
      const ty = 185 + Math.sin(ang) * len;
      ctx.strokeStyle = i % 2 === 0 ? '#703d20' : '#4f2814';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(255, 185);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(ang);
      ctx.fillStyle = i % 3 === 0 ? '#7b3e1b' : '#5e2c14';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  return canvas.toDataURL('image/png');
}

export const CameraVisionTab: React.FC<CameraVisionTabProps> = ({
  profile,
  onUpdateProfile,
}) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageLabel, setImageLabel] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<VisionDiagnosisResult | null>(null);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [selectedSectorId, setSelectedSectorId] = useState<string>(
    profile.sectors[0]?.id || ''
  );
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Garante que o talhão selecionado exista quando o usuário troca entre Ilhéus e Oeste
  useEffect(() => {
    if (!profile.sectors.some((s) => s.id === selectedSectorId)) {
      setSelectedSectorId(profile.sectors[0]?.id || '');
    }
  }, [profile.sectors, selectedSectorId]);

  // Limpa câmera ao sair da aba
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setWebcamActive(false);
  }, []);

  // Desenha apenas os contornos das regiões afetadas no canvas transparente sobre a imagem
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!imageDataUrl || !diagnosis || !showContours || diagnosis.contours.length === 0) {
      return;
    }

    diagnosis.contours.forEach((box) => {
      const x = (box.xPct / 100) * canvas.width;
      const y = (box.yPct / 100) * canvas.height;
      const w = (box.wPct / 100) * canvas.width;
      const h = (box.hPct / 100) * canvas.height;

      const strokeColor = box.severity === 'danger' ? '#ef4444' : '#f59e0b';
      const fillTint =
        box.severity === 'danger'
          ? 'rgba(239, 68, 68, 0.14)'
          : 'rgba(245, 158, 11, 0.14)';

      // Preenchimento leve + contorno duplo destacado
      ctx.fillStyle = fillTint;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 10);
      ctx.fill();

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3.5;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 10);
      ctx.stroke();
      ctx.setLineDash([]);

      // Etiqueta legível acima do contorno
      const tag = box.label;
      ctx.font = 'bold 13px sans-serif';
      const textWidth = ctx.measureText(tag).width + 16;
      const tagY = Math.max(6, y - 26);

      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.roundRect(x, tagY, textWidth, 22, 6);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(tag, x + 8, tagY + 15);
    });
  }, [imageDataUrl, diagnosis, showContours]);

  // Processa um DataURL enviado (câmera, galeria ou exemplo) sem resetar estado em cliques futuros
  const processImageSource = useCallback(
    async (dataUrl: string, label: string, presetHint?: DiagnosisClass) => {
      setIsAnalyzing(true);
      setAppliedBanner(null);
      setCameraError(null);
      setImageDataUrl(dataUrl);
      setImageLabel(label);

      const img = new Image();
      img.onload = async () => {
        try {
          const localResult = analyzeCacaoImageWithML(img, {
            region: profile.id,
            airHumidityPct: profile.weather.airHumidityPct,
            presetHint,
          });
          setDiagnosis(localResult);

          // Se o servidor local Python estiver ligado, complementa enviando os descritores reais extraídos da foto
          if (!presetHint) {
            const controller = new AbortController();
            const timer = window.setTimeout(() => controller.abort(), 350);
            try {
              const res = await fetch('http://127.0.0.1:8000/api/analyze-leaf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  region: profile.id,
                  features: {
                    exg_norm: localResult.features.exgMean,
                    necrotic_ratio: localResult.features.broomBrownFrac,
                    yellow_ratio: localResult.features.labBChlorosisFrac,
                    texture_entropy: localResult.features.orientationEntropy,
                    sobel_edge_density: localResult.features.sobelEdgeDensity,
                    lab_a_ferruginous: localResult.features.labAPosFrac,
                  },
                }),
                signal: controller.signal,
              });
              window.clearTimeout(timer);
              if (res.ok) {
                const payload = await res.json();
                if (payload?.probabilities) {
                  const srvBroom = Number(
                    payload.probabilities.vassoura_de_bruxa ?? localResult.probabilities.vassoura_de_bruxa
                  );
                  const srvDrought = Number(
                    payload.probabilities.estresse_hidrico ?? localResult.probabilities.estresse_hidrico
                  );
                  const srvHealthy = Number(
                    payload.probabilities.saudavel_hidratado ??
                      payload.probabilities.saudavel ??
                      localResult.probabilities.saudavel
                  );
                  const blendedBroom = Math.round(localResult.probabilities.vassoura_de_bruxa * 0.65 + srvBroom * 0.35);
                  const blendedDrought = Math.round(localResult.probabilities.estresse_hidrico * 0.65 + srvDrought * 0.35);
                  const blendedHealthy = Math.max(0, 100 - blendedBroom - blendedDrought || Math.round(srvHealthy));

                  setDiagnosis((prev) =>
                    prev
                      ? {
                          ...prev,
                          analysisSource: 'server',
                          probabilities: {
                            vassoura_de_bruxa: blendedBroom,
                            estresse_hidrico: blendedDrought,
                            saudavel: blendedHealthy,
                          },
                        }
                      : prev
                  );
                }
              }
            } catch {
              window.clearTimeout(timer);
              // Funciona 100% no aparelho do produtor quando offline
            }
          }
        } finally {
          setIsAnalyzing(false);
        }
      };
      img.onerror = () => {
        setIsAnalyzing(false);
        setCameraError('Não foi possível ler essa imagem. Tente outra foto JPG ou PNG.');
      };
      img.src = dataUrl;
    },
    [profile.id, profile.weather.airHumidityPct]
  );

  // Carrega exemplo padrão na primeira abertura para mostrar imediatamente como funciona
  useEffect(() => {
    if (!imageDataUrl) {
      const sampleUrl = renderSampleDataUrl('vassoura_de_bruxa');
      if (sampleUrl) {
        processImageSource(sampleUrl, 'Exemplo: Vassoura-de-Bruxa', 'vassoura_de_bruxa');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Permite selecionar o mesmo arquivo novamente se o usuário quiser
    e.target.value = '';
    if (!file) return;

    stopWebcam();
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processImageSource(reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartWebcam = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Navegador sem acesso à câmera. Use o botão Enviar Foto da Galeria.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setWebcamActive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      }, 60);
    } catch {
      setCameraError('Câmera bloqueada ou indisponível. Envie uma foto da galeria.');
    }
  };

  const handleCaptureWebcam = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    stopWebcam();
    processImageSource(dataUrl, 'Foto da Câmera');
  };

  const handleApplySectorAction = () => {
    if (!diagnosis) return;
    const targetSector = profile.sectors.find((s) => s.id === selectedSectorId);
    if (!targetSector) return;

    const updatedSectors = profile.sectors.map((s) => {
      if (s.id !== targetSector.id) return s;

      if (diagnosis.predictedClass === 'estresse_hidrico') {
        const nextLiters = Number((s.targetLitersPerPlantDay * 1.25).toFixed(1));
        return {
          ...s,
          targetLitersPerPlantDay: nextLiters,
          valveStatus: 'open' as const,
          diagnosticStatus: 'ok' as const,
          diagnosticMessage: `Reforço hídrico aplicado após foto da folha (${nextLiters} L/pé/dia).`,
        };
      }

      if (diagnosis.predictedClass === 'vassoura_de_bruxa') {
        return {
          ...s,
          valveStatus: 'auto_blocked' as const,
          diagnosticMessage:
            'Trava Anti-Vassoura ativada neste talhão. Priorize poda dos ramos e rega só na raiz.',
        };
      }

      return {
        ...s,
        diagnosticMessage: 'Folhagem saudável confirmada em foto. Programação normal mantida.',
      };
    });

    const nextAutomation =
      diagnosis.predictedClass === 'vassoura_de_bruxa'
        ? { ...profile.automationConfig, highHumidityLockEnabled: true }
        : profile.automationConfig;

    onUpdateProfile({
      ...profile,
      sectors: updatedSectors,
      automationConfig: nextAutomation,
    });

    if (diagnosis.predictedClass === 'estresse_hidrico') {
      setAppliedBanner(
        `Pronto! Aumentamos a água em +25% no ${targetSector.name} e abrimos a rega. Sua foto continua salva aqui.`
      );
    } else if (diagnosis.predictedClass === 'vassoura_de_bruxa') {
      setAppliedBanner(
        `Pronto! Trava Anti-Vassoura ativada no ${targetSector.name} para proteger as folhas da umidade.`
      );
    } else {
      setAppliedBanner(`Confirmado! Programação normal mantida no ${targetSector.name}.`);
    }
  };

  const isBroom = diagnosis?.predictedClass === 'vassoura_de_bruxa';
  const isDrought = diagnosis?.predictedClass === 'estresse_hidrico';

  return (
    <div className="space-y-6">
      {/* Cabeçalho simples + switches laterais */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <Camera className="w-5 h-5" />
            </span>
            Saúde da Folha pela Foto
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Tire ou envie uma foto do galho ou folha. O sistema contorna os sinais na imagem e mostra o que fazer na hora.
          </p>
        </div>

        {/* Botões Switch ao lado, como pedido pelo usuário */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-800/70 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <ToggleSwitch
            checked={showContours}
            onChange={setShowContours}
            label="Contornar sinais na foto"
            size="sm"
            activeColor="rose"
          />
          <div className="hidden sm:block w-px h-5 bg-slate-300 dark:bg-slate-600" />
          <ToggleSwitch
            checked={showTechDetails}
            onChange={setShowTechDetails}
            label="Mais informações técnicas"
            size="sm"
            activeColor="sky"
          />
        </div>
      </div>

      {/* Área Principal: Foto com Contorno à Esquerda + Diagnóstico Claro à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Esquerda (5 cols): Foto enviada com contorno destacado */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
              <Scan className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              1. Foto da Planta
            </h3>
            {imageLabel && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                {imageLabel}
              </span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelected}
            className="hidden"
          />

          {/* Ações de captura bem evidentes */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Enviar Foto da Galeria
            </button>

            {!webcamActive ? (
              <button
                type="button"
                onClick={handleStartWebcam}
                className="py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Video className="w-4 h-4" />
                Abrir Câmera
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCaptureWebcam}
                className="py-2.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm animate-pulse cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Bater Foto Agora!
              </button>
            )}
          </div>

          {cameraError && (
            <div className="text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2">
              {cameraError}
            </div>
          )}

          {/* Container da Imagem + Canvas de Contorno */}
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-200 dark:border-slate-700 shadow-inner">
            {webcamActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : imageDataUrl ? (
              <>
                <img
                  src={imageDataUrl}
                  alt="Folha ou galho de cacau analisado"
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={overlayCanvasRef}
                  width={480}
                  height={360}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center text-xs">
                <Camera className="w-8 h-8 mb-2 opacity-60" />
                Envie ou tire uma foto da folha para iniciar a leitura.
              </div>
            )}

            {isAnalyzing && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center text-white font-bold text-sm gap-2">
                <Sparkles className="w-5 h-5 animate-spin text-emerald-400" />
                Analisando imagem...
              </div>
            )}
          </div>

          {showContours && diagnosis && diagnosis.contours.length > 0 && (
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-sm inline-block border-2 ${
                  isBroom ? 'border-rose-500 bg-rose-500/30' : 'border-amber-500 bg-amber-500/30'
                }`}
              />
              Os quadros tracejados mostram onde o sistema achou alteração na planta.
            </p>
          )}

          {/* Exemplos rápidos para teste */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ou teste com uma foto de exemplo:
            </span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PRESETS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    stopWebcam();
                    const url = renderSampleDataUrl(sample.id);
                    if (url) processImageSource(url, sample.label, sample.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${sample.badgeClass}`}
                >
                  {sample.label.replace('Exemplo: ', '')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Direita (7 cols): O que o sistema encontrou — retorno rico em informações! */}
        <div className="lg:col-span-7 space-y-5">
          {diagnosis && (
            <>
              {/* ALERTA GIGANTE DE VASSOURA-DE-BRUXA OU SECA / SAUDÁVEL */}
              {isBroom ? (
                <div className="rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 text-white p-6 shadow-xl border-2 border-rose-400/60 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3.5 rounded-2xl bg-white/15 shrink-0">
                        <ShieldAlert className="w-9 h-9 text-white" />
                      </div>
                      <div>
                        <span className="inline-block text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white text-rose-700 mb-1.5">
                          Cuidado Urgente na Lavoura
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black leading-tight">
                          {diagnosis.title}
                        </h3>
                      </div>
                    </div>
                    <div className="text-right shrink-0 bg-black/20 px-3.5 py-2 rounded-xl">
                      <span className="block text-[10px] uppercase font-bold text-rose-100">
                        Chance
                      </span>
                      <span className="text-2xl sm:text-3xl font-black">
                        {diagnosis.probabilities.vassoura_de_bruxa}%
                      </span>
                    </div>
                  </div>

                  <p className="text-sm sm:text-base text-rose-50 leading-relaxed font-medium">
                    {diagnosis.simpleSummary}
                  </p>
                </div>
              ) : isDrought ? (
                <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 shadow-lg border border-amber-300/60 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-white/20 shrink-0">
                        <AlertTriangle className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <span className="inline-block text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white text-amber-800 mb-1">
                          Falta de Água na Raiz
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black leading-tight">
                          {diagnosis.title}
                        </h3>
                      </div>
                    </div>
                    <div className="text-right shrink-0 bg-black/15 px-3.5 py-2 rounded-xl">
                      <span className="block text-[10px] uppercase font-bold text-amber-50">
                        Chance
                      </span>
                      <span className="text-2xl sm:text-3xl font-black">
                        {diagnosis.probabilities.estresse_hidrico}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-amber-50 font-medium leading-relaxed">
                    {diagnosis.simpleSummary}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 shadow-lg border border-emerald-400/50 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-white/20 shrink-0">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <span className="inline-block text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white text-emerald-800 mb-1">
                          Condição Boa
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black leading-tight">
                          {diagnosis.title}
                        </h3>
                      </div>
                    </div>
                    <div className="text-right shrink-0 bg-black/15 px-3.5 py-2 rounded-xl">
                      <span className="block text-[10px] uppercase font-bold text-emerald-100">
                        Chance
                      </span>
                      <span className="text-2xl sm:text-3xl font-black">
                        {diagnosis.probabilities.saudavel}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-emerald-50 font-medium leading-relaxed">
                    {diagnosis.simpleSummary}
                  </p>
                </div>
              )}

              {/* PROBABILIDADES GRANDES E FÁCEIS DE LER */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                    2. Resultado por Condição (Probabilidades)
                  </h4>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Confiança geral: {diagnosis.confidencePct}%
                  </span>
                </div>

                <div className="space-y-3.5">
                  {/* Vassoura-de-Bruxa */}
                  <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm sm:text-base text-rose-950 dark:text-rose-200">
                        Vassoura-de-Bruxa / Ramo Seco
                      </span>
                      <span className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">
                        {diagnosis.probabilities.vassoura_de_bruxa}%
                      </span>
                    </div>
                    <div className="w-full h-3.5 bg-rose-200/70 dark:bg-rose-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-600 rounded-full transition-all duration-500"
                        style={{ width: `${diagnosis.probabilities.vassoura_de_bruxa}%` }}
                      />
                    </div>
                  </div>

                  {/* Falta de Água */}
                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm sm:text-base text-amber-950 dark:text-amber-200">
                        Falta de Água / Folha Seca (Estresse Hídrico)
                      </span>
                      <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">
                        {diagnosis.probabilities.estresse_hidrico}%
                      </span>
                    </div>
                    <div className="w-full h-3.5 bg-amber-200/70 dark:bg-amber-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${diagnosis.probabilities.estresse_hidrico}%` }}
                      />
                    </div>
                  </div>

                  {/* Planta Saudável */}
                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm sm:text-base text-emerald-950 dark:text-emerald-200">
                        Planta Saudável e Verde
                      </span>
                      <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                        {diagnosis.probabilities.saudavel}%
                      </span>
                    </div>
                    <div className="w-full h-3.5 bg-emerald-200/70 dark:bg-emerald-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${diagnosis.probabilities.saudavel}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* O QUE FAZER NA ROÇA E APLICAR NA IRRIGAÇÃO */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                  3. Passo a Passo do que Fazer Agora
                </h4>

                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {diagnosis.fieldSteps.map((step, i) => (
                    <li
                      key={i}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 font-medium"
                    >
                      {step}
                    </li>
                  ))}
                </ul>

                {/* Ação direta no talhão — nunca reseta a foto nem o diagnóstico! */}
                <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Droplets className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-sky-800 dark:text-sky-300 block">
                        Ajuste Automático de Gotejamento
                      </span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {diagnosis.recommendedIrrigationAction}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <select
                      value={selectedSectorId}
                      onChange={(e) => setSelectedSectorId(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm font-bold"
                    >
                      {profile.sectors.map((sector) => (
                        <option key={sector.id} value={sector.id}>
                          {sector.name} ({sector.areaHa} ha • {sector.targetLitersPerPlantDay} L/pé/dia)
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleApplySectorAction}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition cursor-pointer shrink-0"
                    >
                      Aplicar neste Talhão
                    </button>
                  </div>

                  {appliedBanner && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{appliedBanner}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* DETALHES TÉCNICOS ESCONDIDOS POR PADRÃO (ABRE NO SWITCH) */}
              {showTechDetails && (
                <div className="bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-2xl border border-slate-700 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm flex items-center gap-2 text-sky-300">
                        <SlidersHorizontal className="w-4 h-4" />
                        Dados Técnicos do Modelo ML
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {diagnosis.modelInfo.architecture}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      Motor: {diagnosis.analysisSource === 'server' ? 'Python + Local Ensemble' : 'Inferência Local 12D'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                    <div className="bg-slate-800/80 rounded-xl p-2.5">
                      <span className="text-slate-400 block text-[11px]">Verde Sadio (ExG)</span>
                      <span className="text-base font-black text-emerald-400">
                        {diagnosis.metrics.greenIndexPct}%
                      </span>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-2.5">
                      <span className="text-slate-400 block text-[11px]">Tecido Necrótico</span>
                      <span className="text-base font-black text-rose-400">
                        {diagnosis.metrics.necrosisPct}%
                      </span>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-2.5">
                      <span className="text-slate-400 block text-[11px]">Ramos Sobel</span>
                      <span className="text-base font-black text-rose-300">
                        {diagnosis.metrics.edgeDensityPct}%
                      </span>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-2.5">
                      <span className="text-slate-400 block text-[11px]">Entropia Textural</span>
                      <span className="text-base font-black text-fuchsia-300">
                        {diagnosis.metrics.textureEntropyPct}%
                      </span>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-2.5">
                      <span className="text-slate-400 block text-[11px]">Clorose CIELAB b*</span>
                      <span className="text-base font-black text-amber-400">
                        {diagnosis.metrics.chlorosisPct}%
                      </span>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-2.5">
                      <span className="text-slate-400 block text-[11px]">Índice Sede (CWSI)</span>
                      <span className="text-base font-black text-sky-400">
                        {diagnosis.metrics.cwsiPct}%
                      </span>
                    </div>
                  </div>

                  {diagnosis.modelInfo.decisionNotes.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Evidências que pesaram na decisão do modelo:
                      </span>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {diagnosis.modelInfo.decisionNotes.map((note, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
