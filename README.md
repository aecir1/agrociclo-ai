# AgroCiclo AI — Gestão e Automação Hídrica na Cacauicultura Baiana

Plataforma web e mobile-first para **dimensionamento hídrico, mapeamento 2D/3D com relevo e escoamento pluvial, automação de irrigação por gotejamento com divisão de talhões, diagnóstico óptico foliar (Visão Computacional) e conformidade legal (INEMA / Crédito Rural FNE Verde)** voltada a produtores de cacau na Bahia (**Sul da Bahia / Cabruca** e **Oeste Baiano / Cerrado Pleno Sol**).

---

## ✨ Principais Funcionalidades Recentes
* **Interface Limpa e Prática (Inspirada no Figma):** Menu lateral intuitivo, botões de acesso rápido em destaque para o produtor rural e informações técnicas avançadas organizadas em painéis expansíveis sob demanda.
* **Mapa 2D / 3D com Relevo e Escoamento da Chuva (`src/components/FarmMap2D3D.tsx`):**
  * Alternância entre **Vista 2D** e **Vista 3D (Relevo)** com malha topográfica sombreada, rotação 360°, setas azuis indicando a descida da água da chuva e visualização **Relevo Agro (100% Offline)** ou **Satélite**.
  * Localização por **GPS**, seleção de municípios da Bahia ou **Latitude / Longitude**, ajuste do **Raio da Fazenda** e delimitação manual dos cantos da propriedade com cálculo instantâneo em hectares.
* **Hidrologia de Encosta — Influência do Relevo na Chuva (`src/utils/geoMap.ts` & `src/components/DroughtSimulatorTab.tsx`):**
  * Calcula quanto da chuva **infiltra na raiz do cacau** vs. **escorre morro abaixo (enxurrada)** de acordo com a declividade (`1%` a `35%`), cobertura morta e **Caixas Secas / Curvas de Nível**, estimando o volume captável por gravidade na baixada e o risco de erosão/assoreamento.
* **Particionamento e Divisão de Talhões (`src/components/AutomationTab.tsx`):**
  * Botão **`+ Novo Talhão / Dividir Hectares`**, botão **`Dividir em 2`** e ajuste rápido de hectares (`-` / `+` 0,5 ha) com posição no relevo (*Baixada*, *Meia Encosta*, *Topo de Morro*).
* **Tutorial Guiado em 6 Passos + Dicionário Simples (`src/components/InteractiveTutorialModal.tsx`):**
  * Passo a passo interativo pensado para produtores com pouca familiaridade tecnológica.

---

## 🚀 Como Rodar o Projeto (3 Formas)

### Opção 1: Com Node.js Localmente (Desenvolvimento no VS Code / Antigravity)
1. Instale as dependências e inicie o servidor Vite:
   ```bash
   npm install
   npm run dev
   ```
   Acesse `http://localhost:5173`.
2. (Opcional) Em outro terminal, inicie o servidor Python de Machine Learning:
   ```bash
   python backend_python/ml_server.py
   ```
   *(O frontend também possui o classificador óptico embarcado em TypeScript, funcionando mesmo sem o servidor Python).*

---

### Opção 2: Com Docker (Frontend React + Backend Python ML)
Basta ter o Docker instalado e rodar na raiz do projeto:
```bash
docker compose up --build
```
* **Frontend Web:** `http://localhost:5173`
* **Servidor Python ML (Visão Computacional):** `http://localhost:8000/health`

---

### Opção 3: Sem Instalar Nada (Arquivo Único Portátil)
Basta abrir o arquivo **`prototipo_standalone.html`** na raiz do repositório diretamente em qualquer navegador. Ele contém todo o sistema compilado em um único arquivo `.html`.

---

## 🧠 Contexto Completo para o Google Antigravity / VS Code
Este repositório inclui:
* **`GEMINI.md`** (na raiz): carregado automaticamente pelo Antigravity com a arquitetura e regras de negócio completas.
* **`docs/HISTORICO_CONVERSA_E_CONTEXTO.md`**: resumo detalhado de todas as conversas, feedbacks de UI/UX e implementações realizadas.
* **`docs/GUIA_DO_PITCH_E_DEFESA.md`**: roteiro de apresentação e embasamento agronômico/hídrico.
