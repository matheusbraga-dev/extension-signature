# M Signature Pro

Extensão de navegador (**Manifest V3**) para o Google Chrome que injeta assinaturas ricas e templates de respostas nativamente nos editores do **Jira** (Atlassian Fabric Editor), do **Gmail** (composição de e-mail) e do **Cervello** (plataforma de chamados/ITSM).

## ✨ Funcionalidades

- **Editor de assinatura** no popup, com formatação (negrito, itálico, links) e sanitização automática de HTML.
- **Múltiplos perfis** de assinatura com perfil ativo (configuráveis em *Configurações*).
- **Inserção rápida** via:
  - Botão nativo na toolbar do editor do Jira e do Gmail;
  - **Botão flutuante no canto inferior direito no Cervello** (configurável em *Configurações → Avançado*);
  - Atalhos de teclado (`Alt+S`, `Alt+1`, `Alt+2`);
  - Menu de contexto (clique com o botão direito em campos de texto).
- **Placeholder dinâmico** `{{data}}` para inserir a data atual, além de **placeholders personalizados** (ex.: `{{cargo}}`, `{{telefone}}`) configuráveis na aba *Placeholders*.
- **Sites permitidos**: a extensão atua apenas nos domínios que você aprovar (ex.: `minhaempresa.atlassian.net`, `mail.google.com`, `*.cervelloesm.com.br`), com permissão concedida dinamicamente.
- **Sanitização de HTML** contra XSS e contra o bug do "emoji gigante" (remove estilos/tags não permitidas e converte emoji de imagem de volta para texto).
- **Histórico de ações** e **backup/restauração** via JSON.
- Suporte a **tema claro/escuro** (`prefers-color-scheme`).

## 🚀 Instalação (modo desenvolvedor)

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/jira-signature-M.git
   ```
2. Abra `chrome://extensions`.
3. Ative o **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e selecione a pasta do projeto (a que contém o `manifest.json`).
5. Acesse um **Jira** (ex.: `*.atlassian.net`), o **Gmail** (`mail.google.com`) ou o **Cervello** (`*.cervelloesm.com.br`) para o botão M aparecer na toolbar do editor (Jira/Gmail) ou flutuando no canto inferior direito (Cervello).

> Domínios fora de `atlassian.net`/`mail.google.com`/`cervelloesm.com.br` (ex.: um Jira próprio) precisam ser adicionados manualmente em **Configurações → Sites Permitidos** para conceder a permissão.

## ⌨️ Atalhos padrão

| Ação | Atalho |
|------|--------|
| Inserir assinatura ativa | `Alt + S` |
| Ativar extensão no campo atual | `Alt + Shift + E` |
| Inserir perfil 1 | `Alt + 1` |
| Inserir perfil 2 | `Alt + 2` |
| Inserir perfil 3 | `Alt + 3` * |
| Inserir perfil 4 | `Alt + 4` * |
| Inserir perfil 5 | `Alt + 5` * |
| Inserir perfil 6 | `Alt + 6` * |
| Inserir perfil 7 | `Alt + 7` * |
| Inserir perfil 8 | `Alt + 8` * |
| Inserir perfil 9 | `Alt + 9` * |

> \* O Chrome limita a 4 atalhos padrão (`suggested_key`) por extensão. Os atalhos `Alt+3` … `Alt+9` precisam ser atribuídos manualmente em `chrome://extensions/shortcuts`.

Os atalhos podem ser alterados em `chrome://extensions/shortcuts`.

## 📁 Estrutura do projeto

```
├── manifest.json              # Manifesto MV3 (permissões, SW, páginas)
└── src/
    ├── background/            # Service Worker
    │   ├── index.js           #   Ponto de entrada (importScripts + listeners)
    │   └── contextMenu.js     #   Menu de contexto (botão direito)
    ├── content/               # Scripts injetados nas páginas (Jira e Gmail)
    │   ├── index.js           #   Entrada: cache, inserção, mensagens
    │   ├── domUtils.js        #   Helpers de DOM (toast, localizar editores)
    │   ├── injector.js        #   Botão + menu nativo na toolbar do Jira
    │   ├── observer.js        #   MutationObserver do DOM do Jira
    │   ├── gmail.js           #   Botão + menu na composição do Gmail
    │   └── cervello.js        #   Botão flutuante + menu no Cervello
    ├── popup/                 # Janela flutuante (index.html + namespace MPopup)
    │   ├── index.html         #   Estrutura + <link>/<script> das partes
    │   ├── popup-utils.js     #   Helpers puros (placeholders, texto)
    │   ├── popup-state.js     #   Estado global e renderização de perfis
    │   ├── popup-editor.js    #   Bindings do editor (paste, formatação, placeholders)
    │   ├── popup-actions.js   #   Salvar, copiar, trocar perfil, abrir opções
    │   ├── popup-banner.js    #   Status do site no topo
    │   ├── main.js            #   Entrada: refs DOM + wiring
    │   └── parts/             #   CSS dividido em partes
    │       ├── tokens.css base.css header.css forms.css
    │       ├── toolbar.css editor.css actions.css status.css
    ├── options/               # Configurações avançadas (index.html + namespace MOptions)
    │   ├── index.html         #   Estrutura + <link>/<script> das partes
    │   ├── app-state.js       #   Estado, status, persistência, renderers
    │   ├── profiles.js        #   CRUD de perfis
    │   ├── sites.js           #   Sites permitidos + permissões
    │   ├── placeholders.js    #   Placeholders customizados
    │   ├── history.js         #   Histórico de ações + onboarding
    │   ├── advanced.js        #   Atalhos, backup/import, reset
    │   ├── main.js            #   Entrada: refs DOM + wiring
    │   └── parts/             #   CSS dividido em partes
    │       ├── tokens.css base.css sidebar.css cards.css forms.css
    │       ├── editor.css lists.css tabs.css responsive.css
    ├── shared/                # Código compartilhado entre contextos
    │   ├── constants.js
    │   ├── api/storage.js     #   Wrapper para chrome.storage
    │   └── utils/
    │       ├── logger.js
    │       ├── sanitize.js
    │       └── normalizer.js
    └── assets/                # Ícones e imagens
```

### Convenções do projeto

- **Segurança**: todo HTML injetado/editado deve passar por `shared/utils/sanitize.js`.
- **Content scripts** operam em ambiente hostil: nenhuma exceção pode quebrar a página do Jira (use `try/catch` defensivos).
- Cliques no editor do Jira são interceptados pelo React/ProseMirror — use `mousedown` + `preventDefault()` em botões nativos.
- **Storage**: o acesso direto a `chrome.storage` nas UI deve passar por `shared/api/storage.js`.
- **Visual**: use variáveis CSS (design tokens em `:root`) e suporte a `prefers-color-scheme: dark`.
- **UI (sem build)**: `popup/` e `options/` não usam bundler. Os arquivos são carregados via `<script>`/`<link>` em ordem e expõem tudo em um namespace global (`window.MPopup` / `window.MOptions`). Cada módulo define `init*()`; o `main.js` faz o wiring do DOM. Não use `import`/`export`.
- **CSS dividido**: os estilos ficam em `parts/*.css` (um por área), linkados na ordem correta no `index.html`. Tokens ficam sempre em `parts/tokens.css`.

## 🧪 Teste local

- A extensão não usa build: carregue a pasta como extensão sem compactação e teste popup, configurações, botão no Jira e atalhos.
- Valide a sintaxe dos scripts com Node:
  ```bash
  node --check src/background/index.js
  node --check src/options/main.js
  node --check src/popup/main.js
  ```

## 🔒 Privacidade

A extensão **não coleta, não transmite e não compartilha dados** com servidores externos. Assinaturas, sites permitidos e histórico ficam apenas no armazenamento local do navegador (`chrome.storage`). Veja [PRIVACY_POLICY.md](PRIVACY_POLICY.md) para detalhes.

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**. Você pode usar, copiar, modificar, publicar e distribuir livremente, inclusive em projetos comerciais, desde que preserve o aviso de copyright. Veja o arquivo [LICENSE](LICENSE) para os termos completos.

---

Made with Coffee ☕