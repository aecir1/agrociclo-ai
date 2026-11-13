import React, { useState } from 'react';
import {
  ClipboardCheck,
  Bot,
  Send,
  Settings,
  CheckSquare,
  Square,
  Sparkles,
  Save,
  RotateCcw,
  KeyRound,
  UserPlus
} from 'lucide-react';
import { PropertyProfile } from '../types';
import { INITIAL_EMERGENCY_ACTIONS, EmergencyAction } from '../data/mockProfiles';

interface PropertyAndAiTabProps {
  profile: PropertyProfile;
  onUpdateProfile: (updated: PropertyProfile) => void;
  onResetProfile: () => void;
  brandName: string;
  onChangeBrandName: (name: string) => void;
  onOpenWizard: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

export const PropertyAndAiTab: React.FC<PropertyAndAiTabProps> = ({
  profile,
  onUpdateProfile,
  onResetProfile,
  brandName,
  onChangeBrandName,
  onOpenWizard
}) => {
  const [actions, setActions] = useState<EmergencyAction[]>(INITIAL_EMERGENCY_ACTIONS);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => localStorage.getItem('agrociclo_gemini_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Calculations for AI context
  const totalRealM3 = profile.reservoirs.reduce((acc, r) => acc + r.currentRealVolumeM3, 0);
  const totalApparentM3 = profile.reservoirs.reduce((acc, r) => acc + r.currentApparentVolumeM3, 0);
  const dailyDemandM3 =
    profile.sectors.reduce((acc, s) => acc + s.plantsCount * s.targetLitersPerPlantDay, 0) / 1000;
  const currentAutonomyDays = Math.floor(totalRealM3 / Math.max(1, dailyDemandM3));
  const extraDaysFromChecklist = actions
    .filter((a) => a.completed)
    .reduce((acc, a) => acc + a.autonomyGainDays, 0);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: `Olá! Sou o AgroAssist, seu consultor agronômico e hídrico. Analisando os dados da "${profile.name}" (${profile.municipality}/BA): você possui ${profile.cacaoAreaHa} ha (${profile.estimatedPlants.toLocaleString('pt-BR')} cacaueiros), reserva útil real de ${totalRealM3.toLocaleString('pt-BR')} m³ (descontando assoreamento) e consumo atual de ${dailyDemandM3.toFixed(1)} m³/dia (${currentAutonomyDays} dias de autonomia). Selecione uma consulta rápida abaixo ou digite sua dúvida (ex: "Minha água dura 45 dias sem chuva?" ou "Quanto capto em uma chuva de 65 mm?").`
    }
  ]);
  const [userInput, setUserInput] = useState('');

  const toggleAction = (id: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  };

  const handleSaveApiKey = (val: string) => {
    setGeminiApiKey(val);
    localStorage.setItem('agrociclo_gemini_key', val);
  };

  // Dynamic mathematical + agronomic engine (parses numbers and any topic from the user's question)
  const generateDynamicLocalAnswer = (question: string): string => {
    const q = question.toLowerCase();
    // Extract any number typed by the user (e.g., "45 dias", "80 mm", "10 hectares")
    const numMatch = q.match(/(\d+(?:[.,]\d+)?)/);
    const extractedNum = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : null;

    if (q.includes('mm') || (q.includes('chuv') && extractedNum !== null)) {
      const mm = extractedNum || 40;
      const liters = Math.round(profile.roofCatchmentAreaM2 * mm * profile.catchmentEfficiency);
      const m3 = (liters / 1000).toFixed(1);
      const extraDays = (liters / 1000 / Math.max(1, dailyDemandM3)).toFixed(1);
      return `Cálculo Pluvial Instantâneo para ${mm} mm de chuva: Nos seus ${profile.roofCatchmentAreaM2} m² de telhados (barcaças e galpões, eficiência de ${profile.catchmentEfficiency * 100}%), essa chuva capta exatamente ${liters.toLocaleString('pt-BR')} litros (${m3} m³) de água limpa! Isso garante +${extraDays} dias extras de irrigação por gotejamento para toda a sua lavoura.`;
    }

    if (q.includes('dia') || q.includes('resistir') || q.includes('seca') || q.includes('estiagem')) {
      const days = extractedNum || 30;
      const neededM3 = Math.round(dailyDemandM3 * days);
      const neededSprinklerM3 = Math.round(neededM3 * (535 / 224));
      const balanceM3 = Math.round(totalRealM3 - neededM3);
      return `Simulação Matemática para ${days} dias sem chuva na ${profile.name}:
• Consumo no Gotejamento (${dailyDemandM3.toFixed(1)} m³/dia): ${neededM3.toLocaleString('pt-BR')} m³ (Na aspersão gastaria ${neededSprinklerM3.toLocaleString('pt-BR')} m³!).
• Sua Reserva Útil Real hoje: ${totalRealM3.toLocaleString('pt-BR')} m³ (descontando ${totalApparentM3 - totalRealM3} m³ de lodo/assoreamento).
• Resultado após ${days} dias: ${
        balanceM3 >= 0
          ? `Sua lavoura RESISTE com segurança e ainda sobram ${balanceM3.toLocaleString('pt-BR')} m³ no reservatório!`
          : `Faltariam ${Math.abs(balanceM3).toLocaleString('pt-BR')} m³. Para não perder produção, ative o Modo Déficit Controlado (-15% água, Moser et al. 2010) e aplique cobertura morta de bananeira (+${extraDaysFromChecklist} dias de autonomia).`
      }`;
    }

    if (q.includes('vassoura') || q.includes('fungo') || q.includes('ilhéus') || q.includes('oeste') || q.includes('cerrado')) {
      return `Comparativo Científico Bahia (Ilhéus vs. Oeste Baiano):
1) Em Ilhéus (Cabruca): A Vassoura-de-Bruxa (Moniliophthora perniciosa) exige água livre nas folhas/frutos e umidade do ar >85% para germinar. Nosso gotejamento sub-copa molha só a raiz (0–20 cm) e trava a rega se a UR passar de 85%. Você também pode usar a aba "3. Câmera & IA (Vassoura/Seca)" para fotografar a folha e ajustar a válvula automaticamente!
2) No Oeste Baiano (Cerrado): O ar seco (38% UR) impede o fungo naturalmente, e o cacaueiro faz Ajuste Osmótico Ativo nas raízes (Moser et al., 2010) + fertirrigação de 20 L/planta/dia a pleno sol, colhendo até 3.000 kg/ha!`;
    }

    if (q.includes('economizar') || q.includes('baixo custo') || q.includes('barat')) {
      return `3 Ações de Baixo Custo Calculadas para seus ${profile.cacaoAreaHa} ha:
1) Cobertura morta com pseudocaule de bananeira picado e casca de cacau sobre a linha de gotejo: reduz em 18% a evaporação do solo (economiza ${(dailyDemandM3 * 0.18).toFixed(1)} m³/dia na sua roça);
2) Irrigar só na Tarifa Verde Noturna (21h30 às 06h00): corta 38% da conta de energia elétrica da Coelba;
3) Desentupir (Flushing) o setor com alerta hidráulico na Aba 2 para não desperdiçar bombeamento.`;
    }

    if (q.includes('proteger') || q.includes('priorizar') || q.includes('primeiro')) {
      return `Ordem de Prioridade Hídrica nos seus ${profile.sectors.length} setores:
1º) Mudas jovens (< 2 anos), pois raízes rasas morrem rápido na seca;
2º) Talhões em Floração e Peco de Bilros (${profile.sectors[0]?.name}), garantindo 100% da meta (${profile.sectors[0]?.targetLitersPerPlantDay} L/planta/dia);
3º) Talhões adultos em fase vegetativa, onde você pode reduzir 15% da água ativando o Estímulo de Ajuste Osmótico.`;
    }

    if (q.includes('banco') || q.includes('bnb') || q.includes('crédito') || q.includes('outorga') || q.includes('inema')) {
      return `Para a "${profile.name}": seu consumo diário (${dailyDemandM3.toFixed(1)} m³/dia) está regular perante o limite de ${profile.regulation.authorizedFlowM3Day} m³/dia (${profile.regulation.legalInstrument} — Lei Estadual 11.612/2009). Vá na Aba 5 e clique no botão amarelo para imprimir o Dossiê FNE Verde do Banco do Nordeste comprovando ${(profile.cacaoAreaHa * (profile.agronomicThesis.waterConsumptionSprinklerMmSeason - profile.agronomicThesis.waterConsumptionDripMmSeason) * 10).toLocaleString('pt-BR')} m³ economizados na safra!`;
    }

    return `Cálculo em Tempo Real para ${profile.name} (${profile.municipality}/BA):
• Área: ${profile.cacaoAreaHa} ha (${profile.estimatedPlants.toLocaleString('pt-BR')} pés de cacau em ${profile.cultivationSystem})
• Consumo no Gotejamento: ${dailyDemandM3.toFixed(1)} m³/dia (${(dailyDemandM3 * 1000).toLocaleString('pt-BR')} L/dia)
• Reserva Real Descontando Assoreamento: ${totalRealM3.toLocaleString('pt-BR')} m³ → Autonomia para ${currentAutonomyDays} dias.
Dica: Experimente me perguntar algo com números (ex: "Minha água aguenta 50 dias sem chuva?" ou "Quanto capto em uma chuva de 60 mm?")!`;
  };

  const handleSendQuestion = async (qText: string) => {
    if (!qText.trim()) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: qText
    };
    setMessages((prev) => [...prev, userMsg]);
    setUserInput('');

    // If user provided a real Gemini API Key, call Google Gemini 2.5 Flash live!
    if (geminiApiKey.trim().startsWith('AIza')) {
      setIsLoadingAi(true);
      try {
        const systemPrompt = `Você é o AgroAssist, engenheiro agrônomo e especialista em recursos hídricos da plataforma ${brandName}.
Responda de forma prática, direta e curta (máximo 120 palavras) usando os dados reais cadastrados da fazenda do produtor:
- Fazenda: ${profile.name} em ${profile.municipality}/BA (${profile.biome})
- Sistema: ${profile.cultivationSystem}, ${profile.cacaoAreaHa} hectares, ${profile.estimatedPlants} cacaueiros, estágio: ${profile.currentStage}
- Reserva útil real (descontando assoreamento): ${totalRealM3} m³ (Aparente: ${totalApparentM3} m³)
- Demanda atual no gotejamento: ${dailyDemandM3.toFixed(1)} m³/dia (Autonomia: ${currentAutonomyDays} dias)
- Telhados de barcaças p/ chuva: ${profile.roofCatchmentAreaM2} m²
- Clima hoje: ${profile.weather.tempC}°C, Umidade: ${profile.weather.airHumidityPct}%, ${profile.weather.daysWithoutRain} dias sem chuva
- Outorga INEMA: ${profile.regulation.legalInstrument} (Limite: ${profile.regulation.authorizedFlowM3Day} m³/dia)`;

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nPergunta do produtor: ${qText}` }] }]
            })
          }
        );
        const data = await resp.json();
        const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (aiText) {
          setMessages((prev) => [
            ...prev,
            { id: `b-${Date.now()}`, sender: 'bot', text: `🤖 [Gemini Live]: ${aiText}` }
          ]);
          setIsLoadingAi(false);
          return;
        }
      } catch {
        // Fallback to local mathematical engine if key is invalid or offline
      }
      setIsLoadingAi(false);
    }

    const botMsg: ChatMessage = {
      id: `b-${Date.now() + 1}`,
      sender: 'bot',
      text: generateDynamicLocalAnswer(qText)
    };
    setMessages((prev) => [...prev, botMsg]);
  };

  const quickQuestions = [
    'Minha água aguenta 45 dias sem chuva?',
    'Quanto capto se chover 60 mm nas barcaças?',
    'Por que o gotejamento evita vassoura-de-bruxa em Ilhéus e produz 10x mais no Oeste?',
    'Quais áreas devo proteger primeiro na seca?',
    'Como usar esses dados no INEMA e no Banco do Nordeste?'
  ];

  const handlePropertyFieldChange = (field: keyof PropertyProfile, value: any) => {
    const updated = { ...profile, [field]: value };
    if (field === 'cacaoAreaHa' || field === 'plantingDensityPerHa') {
      updated.estimatedPlants = Math.round(updated.cacaoAreaHa * updated.plantingDensityPerHa);
    }
    onUpdateProfile(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* BANNER PARA CADASTRAR DO ZERO EM PASSO A PASSO */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 rounded-2xl p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-black uppercase tracking-wider text-amber-950">
            👨‍🌾 JORNADA DO AGRICULTOR DO ZERO
          </div>
          <h3 className="text-lg font-black">
            Quer simular um Produtor Cadastrando a Fazenda Passo a Passo do Zero?
          </h3>
          <p className="text-xs font-medium text-slate-900">
            Clique no botão ao lado para abrir o assistente de 4 etapas simples que calcula toda a necessidade de água, tamanho de açude, chuva nas barcaças e outorga!
          </p>
        </div>
        <button
          onClick={onOpenWizard}
          className="px-5 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shrink-0 shadow-md"
        >
          <UserPlus className="w-4 h-4 text-amber-400" />
          Cadastrar Fazenda do Zero (4 Passos)
        </button>
      </div>

      {/* SECTION 1: PLANO DE EMERGÊNCIA HÍDRICA EL NIÑO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4" />
              Plano Operacional de Contingência para Secas (Antes, Durante e Após)
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              Checklist Preventivo de Manejo Hídrico
            </h3>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-right shrink-0">
            <div className="text-xs text-emerald-800 font-semibold">Ganho de Autonomia do Checklist</div>
            <div className="text-xl font-extrabold text-emerald-950">+{extraDaysFromChecklist} dias de água</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {(['antes', 'durante', 'depois'] as const).map((phase) => {
            const phaseTitle =
              phase === 'antes'
                ? '1. Antes da Seca (Preparação)'
                : phase === 'durante'
                ? '2. Durante a Seca (Contingência)'
                : '3. Após a Seca (Recuperação)';
            const phaseColor =
              phase === 'antes'
                ? 'border-sky-200 bg-sky-50/50'
                : phase === 'durante'
                ? 'border-amber-200 bg-amber-50/50'
                : 'border-emerald-200 bg-emerald-50/50';

            return (
              <div key={phase} className={`rounded-xl border p-4 space-y-3 ${phaseColor}`}>
                <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
                  {phaseTitle}
                </h4>
                <div className="space-y-2.5">
                  {actions
                    .filter((a) => a.phase === phase)
                    .map((act) => (
                      <div
                        key={act.id}
                        onClick={() => toggleAction(act.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          act.completed
                            ? 'bg-white border-emerald-400 shadow-sm'
                            : 'bg-white/70 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {act.completed ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-1 text-xs">
                            <div className={`font-bold ${act.completed ? 'text-emerald-950' : 'text-slate-800'}`}>
                              {act.title}
                            </div>
                            <p className="text-slate-600">{act.description}</p>
                            <div className="flex items-center justify-between pt-1 text-xs font-semibold">
                              <span className="text-slate-500">{act.costLevel}</span>
                              {act.autonomyGainDays > 0 && (
                                <span className="text-emerald-700">+{act.autonomyGainDays}d autonomia</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: ASSISTENTE VIRTUAL AGROASSIST + CADASTRO DA PROPRIEDADE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: AgroAssist IA Contextualizado (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
                  <Bot className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    AgroAssist — Calculadora IA & Gemini Live
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 font-semibold">
                      {geminiApiKey.startsWith('AIza') ? 'Gemini API Conectada' : 'Motor Matemático Ativo'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Lê qualquer número que você perguntar e calcula sobre os dados da {profile.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1 text-amber-300 border border-white/15"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {geminiApiKey.startsWith('AIza') ? 'Chave Gemini OK' : 'Conectar Gemini API'}
              </button>
            </div>

            {showKeyInput && (
              <div className="p-3 rounded-xl bg-black/30 border border-white/15 space-y-1.5 text-xs">
                <label className="block text-emerald-200 font-semibold">
                  Opcional: Cole sua API Key gratuita do Google AI Studio (começa com AIza...) para usar o LLM Gemini 2.5 Flash ao vivo:
                </label>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-white text-slate-900 rounded-lg px-3 py-1.5 font-mono text-xs"
                />
              </div>
            )}
          </div>

          {/* Quick Question Pills */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-1.5">
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleSendQuestion(q)}
                className="text-xs bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 px-2.5 py-1.5 rounded-lg font-medium transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="p-4 space-y-3 flex-1 max-h-[360px] overflow-y-auto bg-slate-50/40">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-emerald-700 text-white font-medium'
                      : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isLoadingAi && (
              <div className="text-xs text-emerald-700 font-semibold animate-pulse">
                Consultando Gemini API com os dados hídricos da fazenda...
              </div>
            )}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuestion(userInput);
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ex: Minha água dura 50 dias? Quanto capto se chover 80 mm?"
              className="flex-1 text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Calcular / Perguntar
            </button>
          </form>
        </div>

        {/* Right: Edição Rápida da Propriedade (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <Settings className="w-4 h-4" />
                Dados Cadastrais da Propriedade
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                Parâmetros da Fazenda Ativa
              </h3>
            </div>
            <button
              onClick={onResetProfile}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 border border-slate-200 px-2.5 py-1 rounded-lg"
              title="Restaurar dados originais da demonstração"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Padrão
            </button>
          </div>

          {saveSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
              <Save className="w-4 h-4 text-emerald-600" />
              Dados salvos e recalculados em todo o sistema!
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nome do Sistema no Topo (Personalizável):
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => onChangeBrandName(e.target.value)}
                className="w-full border border-emerald-300 bg-emerald-50/40 rounded-lg px-3 py-2 font-bold text-emerald-950"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nome da Propriedade Rural:</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => handlePropertyFieldChange('name', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Município (Bahia):</label>
                <input
                  type="text"
                  value={profile.municipality}
                  onChange={(e) => handlePropertyFieldChange('municipality', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Idade Média (Anos):</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={profile.cropAgeYears}
                  onChange={(e) => handlePropertyFieldChange('cropAgeYears', Math.max(1, Number(e.target.value)))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Área de Cacau (ha):</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={profile.cacaoAreaHa}
                  onChange={(e) => handlePropertyFieldChange('cacaoAreaHa', Math.max(1, Number(e.target.value)))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Densidade (Pés/ha):</label>
                <input
                  type="number"
                  min={400}
                  max={2500}
                  value={profile.plantingDensityPerHa}
                  onChange={(e) => handlePropertyFieldChange('plantingDensityPerHa', Math.max(100, Number(e.target.value)))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Telhados / Barcaças (m²):</label>
                <input
                  type="number"
                  min={20}
                  max={5000}
                  value={profile.roofCatchmentAreaM2}
                  onChange={(e) => handlePropertyFieldChange('roofCatchmentAreaM2', Math.max(0, Number(e.target.value)))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Total Estimado de Plantas:</label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800">
                  {profile.estimatedPlants.toLocaleString('pt-BR')} cacaueiros
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
