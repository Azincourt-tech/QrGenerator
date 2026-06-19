# QR Studio — Gerador de QR Code

Ferramenta web minimalista para gerar QR Codes, com design limpo, cantos
suaves e tudo rodando **100% no navegador** — sem servidor, sem banco de dados
e sem login. Feita em **Vue 3 + Vite** (sem React).

## Funcionalidades

- **Entrada de conteúdo** — URL ou qualquer texto (suporta Unicode, Wi-Fi, vCard, etc.).
- **Logo central** — envie uma imagem (PNG/JPG/SVG) para o centro do código.
  Uma margem é adicionada automaticamente ao redor do logo e o nível de correção
  de erro sobe para **Alto** para manter a leitura confiável.
- **Cores personalizadas** — cor do código e do fundo, com seletor visual e
  campo para código **hexadecimal** manual.
- **Fundo transparente** — checkbox que remove o fundo (exportação PNG/SVG com
  canal alfa).
- **Resolução ajustável** — de 256 px até 4096 px.
- **Exportação** — download em **PNG** (raster) e **SVG** (vetorial).
- **Histórico local** — os últimos QR Codes gerados ficam salvos no
  `localStorage`; clique para restaurar as configurações.

## Desenvolvimento

Requer Node.js 18+.

```bash
npm install      # instala dependências
npm run dev      # servidor de desenvolvimento (http://localhost:5173)
npm run build    # build de produção -> dist/
npm run preview  # pré-visualiza o build de produção
```

## Usar como componente em outro projeto

Toda a ferramenta é encapsulada no componente **`<QrStudio />`**
(`src/components/QrStudio.vue`), com estilos *scoped* e variáveis CSS próprias —
ele não vaza estilos para a aplicação hospedeira. Para reaproveitá-lo, copie a
pasta `src/lib/` (codificador + renderização, sem dependências) e o arquivo
`src/components/QrStudio.vue` para o seu projeto e importe:

```vue
<script setup>
import QrStudio from "@/components/QrStudio.vue";
</script>

<template>
  <QrStudio
    initial-text="https://meu-link.com"
    history-key="meu-projeto.qr-history"
  />
</template>
```

| Prop          | Tipo     | Padrão                    | Descrição                                  |
| ------------- | -------- | ------------------------- | ------------------------------------------ |
| `initialText` | `String` | `""`                      | Conteúdo inicial do QR Code.               |
| `historyKey`  | `String` | `"qrstudio.history.v1"`   | Chave do `localStorage` (isola históricos). |

## Hospedagem gratuita (Netlify)

O projeto já inclui `netlify.toml`. Há duas formas:

**1. Conectando o repositório (CI/CD automático)**

1. Em [app.netlify.com](https://app.netlify.com) → _Add new site_ → _Import an existing project_.
2. Selecione este repositório no GitHub.
3. O Netlify detecta as configurações do `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. _Deploy_. Cada push passa a gerar um novo deploy automaticamente.

**2. Deploy manual via CLI**

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

> Também funciona sem ajustes em **Vercel**, **Cloudflare Pages** e
> **GitHub Pages** (qualquer host de site estático), pois `vite.config.js`
> usa `base: "./"` (caminhos relativos).

## Estrutura

```
index.html                    Entrada do Vite
vite.config.js                Configuração de build (saída em dist/)
netlify.toml                  Configuração de deploy
src/
  main.js                     Bootstrap da aplicação
  App.vue                     Casca do app standalone (cabeçalho/rodapé)
  components/QrStudio.vue      Componente reutilizável (toda a UI + lógica)
  styles/global.css           Estilos globais da página
  lib/qrcodegen.js            Codificador de QR (versões 1–40, Reed–Solomon)
  lib/qr-renderer.js          Renderização canvas (PNG) + SVG, cores, logo
```

### Qualidade

O codificador de QR é próprio, **sem dependências externas**, e validado por
testes de _round-trip_ (codificar → rasterizar → decodificar com um leitor
independente) cobrindo conteúdo numérico, alfanumérico, Unicode, textos longos
e códigos com logo central.

> Conforme solicitado, **não** é usado React. O único framework é Vue 3.

## Privacidade

Nenhum dado sai do seu navegador. O conteúdo digitado, as imagens de logo e o
histórico permanecem apenas no seu dispositivo.

## Licença

[MIT](LICENSE) © Willian da Silva Almeida
