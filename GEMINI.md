# Contexto Completo do Projeto (Memória Automática para o Antigravity)

Este arquivo `GEMINI.md` é lido automaticamente pelo **Google Antigravity** quando você abre esta pasta no seu notebook ou em outro computador da equipe. Ele contém todo o histórico e contexto de decisões tomadas na criação do projeto.

---

## 1. Visão Geral do Projeto (`AgroCiclo AI`)
* **Objetivo:** Plataforma AgTech de **Gestão Hídrica, Automação de Gotejamento de Baixo Custo e Regularidade Ambiental** focada na cacauicultura da Bahia (**Ilhéus / Sul da Bahia** vs. **Oeste Baiano / Cerrado**).
* **Regra de Design da Interface:** A interface do sistema deve sempre parecer um **produto comercial real voltado para o produtor rural** (sem mencionar "Hackathon", "banca", "Slide da FAEB" ou "dados simulados" na tela do usuário).

---

## 2. Tese Agronômica e Hídrica (Ilhéus vs. Oeste Baiano)
1. **Sul da Bahia (Ilhéus — Sistema Cabruca):**
   * Cacau com raízes superficiais que sofre abortamento de flores e frutos nos veranicos atuais (El Niño).
   * Não pode usar irrigação por aspersão sobre a copa porque a água livre nas folhas e a umidade relativa $>85\%$ explodem a **Vassoura-de-Bruxa (*Moniliophthora perniciosa*)** e a Podridão-Parda.
   * **Solução:** Gotejamento sub-copa (molha apenas a raiz de 0–20 cm) com **Trava Fitossanitária Automática** (suspende pulsos se $\text{UR} \ge 85\%$) + captação pluvial em telhados de barcaças de cacau + desconto de assoreamento em açudes + Dispensa de Outorga INEMA.
2. **Oeste Baiano (Cerrado — Riachão das Neves / Barreiras — Pleno Sol):**
   * Clima seco ($\text{UR } 35\text{–}45\%$) elimina naturalmente a Vassoura-de-Bruxa (escape fitossanitário).
   * A planta resiste ao ar seco e atinge **3.000 kg/ha** (10x a média nacional) graças ao **Ajuste Osmótico Ativo nas raízes** (*Moser et al., 2010*) aliado ao **Delivery System (Fertirrigação por Gotejamento)** entregando até $20\text{ L/árvore/dia}$ (*CPCRI, 2010*) sob sol pleno.
   * **Solução:** Agendamento automático na **Tarifa Verde Noturna (21h30 às 06h00)** (-38% de energia elétrica na Coelba e mínima evaporação), controle de salinidade e trava no limite diário da Outorga do INEMA.

---

## 3. Arquitetura e Módulos Implementados
* `src/App.tsx`: Barra superior com alternador ao vivo entre **Sul da Bahia (Ilhéus)** e **Oeste Baiano (Cerrado)**, botão **Guia do Produtor** (`InteractiveTutorialModal.tsx`), botão **Cadastrar Fazenda do Zero** (`FarmerSetupWizard.tsx`) e navegação em 6 abas:
  1. **Visão Geral Hídrica (`src/App.tsx` + `src/components/CityWeatherForecast.tsx`):** KPIs de Reserva Útil Real (descontando assoreamento), Autonomia em Dias (Gotejamento 224 mm vs. Aspersão 535 mm — *Jadin & Jacquemart, 1978*), Previsão Meteorológica em **todos os 24 horários do dia (00h–23h)** e para os **7 dias da semana** (conectada à API Open-Meteo ao vivo com fallback offline).
  2. **Automação de Gotejamento (`src/components/AutomationTab.tsx`):** Arquitetura *"Sensor-Lite"* de cabeçal único (sem malha cara de sensores enterrados na roça). Controle de válvulas por talhão, ajuste de lâmina por estágio fenológico e diagnóstico hidráulico de **gotejadores entupidos** (queda de vazão + subida de pressão, com botão de *Flushing*) e **mangueira rompida** (pico de vazão + queda de pressão, com fechamento automático).
  3. **Câmera IA — Sede & Vassoura (`src/components/CameraVisionTab.tsx` + `backend_python/ml_server.py`):** Usa a câmera do celular (`capture="environment"` ou webcam) como **Sensor Óptico Hídrico**. Extrai matrizes de pixels no Canvas (`ExG`, necrose marrom, clorose amarela, entropia), gera Mapa de Calor e classifica entre *Vassoura-de-Bruxa*, *Estresse Hídrico (Seca)* e *Saudável*, aplicando correção direta na válvula de água do talhão.
  4. **Simulador de Seca e Captação de Chuva (`src/components/DroughtSimulatorTab.tsx`):** Simulação de 15, 30, 60 e 90 dias sem chuva, calculadora de chuva em telhados de barcaças ($\text{Área} \times \text{Chuva mm} \times \text{Coeficiente}$), válvula de redistribuição anti-transbordo e auditoria de assoreamento.
  5. **Outorga (INEMA), Reúso & Crédito BNB (`src/components/RegulationCreditTab.tsx`):** Enquadramento nas Leis 9.433/1997, 11.612/2009 (INEMA) e 12.651/2012 (Código Florestal / APP), mapa de reúso seguro, práticas de conservação de solo (*Orchard & Saltos, 1988*) e gerador de **Relatório Técnico em PDF** para o **FNE Verde / FNE Água do Banco do Nordeste**.
  6. **Emergência, Cadastro & Consultor IA (`src/components/PropertyAndAiTab.tsx`):** Checklist Antes/Durante/Após a seca, edição rápida da propriedade e chat **AgroAssist** com motor matemático dinâmico + integração opcional com a API do **Google Gemini (`gemini-2.5-flash`)**.

---

## 4. Comandos Úteis
* Rodar servidor de desenvolvimento: `npm.cmd run dev`
* Gerar build de produção: `npm.cmd run build`
* Rodar via Docker (Frontend + Python ML): `docker compose up --build`
