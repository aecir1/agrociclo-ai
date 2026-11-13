# AgroCiclo AI — Gestão e Automação Hídrica na Cacauicultura Baiana

Plataforma web e mobile-first para **dimensionamento hídrico, automação de irrigação por gotejamento, diagnóstico óptico foliar (Visão Computacional) e conformidade legal (INEMA / Crédito Rural FNE Verde)** voltada a produtores de cacau na Bahia (**Sul da Bahia / Cabruca** e **Oeste Baiano / Cerrado Pleno Sol**).

---

## 🚀 Como Rodar o Projeto (3 Formas)

### Opção 1: Com Docker (Recomendado para Equipe — Roda Frontend React + Backend Python ML)
Basta ter o Docker Desktop instalado e rodar na raiz do projeto:
```bash
docker compose up --build
```
* **Frontend Web:** `http://localhost:5173`
* **Servidor Python ML (Visão Computacional):** `http://localhost:8000/health`

---

### Opção 2: Com Node.js e Python Localmente
1. Instale as dependências e inicie o frontend:
   ```bash
   npm install
   npm run dev
   ```
2. (Opcional) Em outro terminal, inicie o servidor Python de Machine Learning:
   ```bash
   python backend_python/ml_server.py
   ```
   *(Nota: O frontend também possui o classificador Mahalanobis embarcado em TypeScript, funcionando mesmo se o servidor Python não estiver aberto).*

---

### Opção 3: Sem Instalar Nada (Arquivo Único Portátil)
Basta dar dois cliques no arquivo **`prototipo_standalone.html`** na raiz do repositório. Ele contém todo o sistema compilado em um único arquivo `.html`.

---

## 📱 Como Hospedar Grátis com HTTPS (Para Usar a Câmera no Celular)
1. Conecte este repositório do GitHub na **Vercel** (`https://vercel.com`) ou **Netlify** (`https://app.netlify.com`).
2. Ou arraste o arquivo `prototipo_standalone.html` (renomeado como `index.html` dentro de uma pasta) em **https://app.netlify.com/drop**.
3. O link `https://` gerado libera automaticamente a câmera em qualquer celular Android ou iPhone.

---

## 🧠 Usando no Google Antigravity em Outros Computadores
Este repositório já inclui o arquivo **`GEMINI.md`** na raiz e a pasta **`docs/`** com o guia completo do projeto. Ao clonar este repositório no seu notebook e abrir a pasta no **Antigravity**, a IA carregará automaticamente todo o contexto e histórico de desenvolvimento do projeto.
