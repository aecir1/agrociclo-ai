import React from 'react';
import {
  HelpCircle,
  Droplets,
  Sliders,
  Camera,
  CloudSun,
  Scale,
  Bot,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface InteractiveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: any) => void;
  onOpenWizard: () => void;
}

export const InteractiveTutorialModal: React.FC<InteractiveTutorialModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenWizard
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="p-5 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              Central de Ajuda do Produtor
            </span>
            <h3 className="text-lg sm:text-xl font-black mt-0.5">
              Como Operar o Sistema de Gestão e Automação Hídrica na sua Fazenda
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
          >
            Fechar ✕
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
          {/* Resumo para o Produtor */}
          <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-950 space-y-1.5">
            <div className="font-black text-sm uppercase text-emerald-800">
              Bem-vindo ao Painel de Controle Hídrico da sua Lavoura
            </div>
            <p className="leading-relaxed text-xs sm:text-sm">
              Este sistema ajuda você a <strong>economizar água e energia elétrica</strong>, evitar que a seca derrube a florada do cacau e impedir que o excesso de umidade favoreça a <strong>Vassoura-de-Bruxa</strong>. Tudo adaptado à realidade da sua região (Cabruca no Sul da Bahia ou Pleno Sol no Oeste).
            </p>
          </div>

          {/* Como Cadastrar do Zero */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="font-bold text-amber-950 text-sm">
                👨‍🌾 Primeiro Acesso? Cadastre os Dados da Sua Propriedade
              </div>
              <p className="text-xs text-amber-900">
                Em 4 passos simples você informa sua área de cacau, o tamanho do seu açude/cisterna e a área de telhado das barcaças para o sistema configurar sua irrigação automaticamente.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenWizard();
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1.5 shadow-sm"
            >
              <span>Configurar Minha Fazenda</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Explicação das 6 Abas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-emerald-600" />
                  1. Visão Geral Hídrica
                </div>
                <p className="text-xs text-slate-600">
                  Mostra quantos dias de água sua reserva realmente suporta (já descontando o lodo/assoreamento no fundo do açude), alertas do clima e o status da sua irrigação hoje.
                </p>
              </div>
              <button
                onClick={() => {
                  onNavigateTab('overview');
                  onClose();
                }}
                className="text-xs font-bold text-emerald-700 hover:underline text-left"
              >
                → Abrir Visão Geral
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-sky-600" />
                  2. Automação de Gotejamento
                </div>
                <p className="text-xs text-slate-600">
                  Controle as válvulas de cada talhão, ajuste a fase da planta (Muda, Flor, Fruto) e receba alertas automáticos caso uma mangueira entupa ou arrebente na roça.
                </p>
              </div>
              <button
                onClick={() => {
                  onNavigateTab('automation');
                  onClose();
                }}
                className="text-xs font-bold text-emerald-700 hover:underline text-left"
              >
                → Abrir Controle de Gotejamento
              </button>
            </div>

            <div className="p-4 rounded-xl border-2 border-emerald-400 bg-emerald-50/40 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  3. Diagnóstico por Foto (Sede & Vassoura)
                </div>
                <p className="text-xs text-slate-700">
                  Tire uma foto da folha ou ramo de cacau pelo celular. O sistema identifica sinais de <strong>falta d'água (estresse hídrico)</strong> ou <strong>Vassoura-de-Bruxa</strong> e ajusta a rega do talhão automaticamente.
                </p>
              </div>
              <button
                onClick={() => {
                  onNavigateTab('camera_ml');
                  onClose();
                }}
                className="text-xs font-bold text-emerald-700 hover:underline text-left"
              >
                → Abrir Diagnóstico por Foto
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CloudSun className="w-4 h-4 text-amber-600" />
                  4. Previsão de Seca & Captação de Chuva
                </div>
                <p className="text-xs text-slate-600">
                  Simule períodos de 15 a 90 dias sem chuva para planejar seu estoque e calcule quantos litros de chuva você pode captar nos telhados das barcaças e galpões.
                </p>
              </div>
              <button
                onClick={() => {
                  onNavigateTab('simulator');
                  onClose();
                }}
                className="text-xs font-bold text-emerald-700 hover:underline text-left"
              >
                → Abrir Simulador de Seca e Chuva
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  5. Regularidade (INEMA) & Crédito Rural
                </div>
                <p className="text-xs text-slate-600">
                  Acompanhe seu limite diário de outorga ou dispensa no INEMA, veja práticas de conservação de solo e emita o relatório técnico de economia de água para linhas de crédito rural (FNE Verde / FNE Água).
                </p>
              </div>
              <button
                onClick={() => {
                  onNavigateTab('regulation');
                  onClose();
                }}
                className="text-xs font-bold text-emerald-700 hover:underline text-left"
              >
                → Abrir Regularidade e Crédito
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-emerald-700" />
                  6. Plano de Contingência, Cadastro & Consultor IA
                </div>
                <p className="text-xs text-slate-600">
                  Siga o checklist preventivo para antes, durante e após a estiagem, atualize os dados da fazenda e tire dúvidas em tempo real com o consultor virtual AgroAssist.
                </p>
              </div>
              <button
                onClick={() => {
                  onNavigateTab('property_ai');
                  onClose();
                }}
                className="text-xs font-bold text-emerald-700 hover:underline text-left"
              >
                → Abrir Plano de Contingência e Consultor
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Voltar ao Painel da Fazenda
          </button>
        </div>
      </div>
    </div>
  );
};
