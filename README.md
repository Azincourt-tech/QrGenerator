# QR Studio — Gerador de QR Code

Ferramenta web para gerar QR Codes **altamente personalizáveis**, com design
limpo e tudo rodando **100% no navegador** — sem servidor, sem banco de dados e
sem login. Feita em **Vue 3 + Vite + Tailwind CSS + DaisyUI** (sem React).

## Funcionalidades

- **Conteúdo livre** — URL ou qualquer texto, com suporte correto a **acentos,
  emojis e Unicode** (codificação UTF-8).
- **Estilo dos pontos** — quadrado, arredondado, pontos, clássico, clássico
  arredondado e extra arredondado.
- **Estilo dos cantos** — formato e cor independentes para o quadrado externo e
  o ponto interno dos marcadores (ou "automático", seguindo os pontos).
- **Cores e gradiente** — cor sólida ou gradiente (linear/radial) com rotação
  ajustável; entrada visual e por código **hexadecimal** manual.
- **Logo central** — envie uma imagem (PNG/JPG/SVG), ajuste **tamanho** e
  **margem**, e opcionalmente esconda os pontos atrás do logo.
- **Fundo** — cor personalizada ou **transparente** (PNG/SVG com canal alfa).
- **Correção de erro** — L / M / Q / H (elevada automaticamente para H quando há
  logo).
- **Exportação** — PNG (raster) e SVG (vetorial), de 256 px a 4096 px.
- **Histórico local** — salvo no `localStorage` **somente ao baixar** um QR
  Code; clique para restaurar todas as configurações.

A renderização e os estilos usam a biblioteca
[`qr-code-styling`](https://qr-code-styling.com/) (a mesma do site de
referência), empacotada localmente — nada é carregado de CDN em tempo de
execução.

## Desenvolvimento

Requer Node.js 18+.

```bash
npm install      # instala dependências
npm run dev      # servidor de desenvolvimento (http://localhost:5173)
npm run build    # build de produção -> dist/
npm run preview  # pré-visualiza o build de produção
```

> O projeto inclui um `.npmrc` com `legacy-peer-deps=true` para evitar conflitos
> de peer dependencies de ferramentas transitivas.

## Usar como componente em outro projeto

Toda a ferramenta é encapsulada no componente **`<QrStudio />`**
(`src/components/QrStudio.vue`, que usa o auxiliar `ColorField.vue`). Para
reaproveitá-lo, copie esses componentes para o seu projeto e instale as
dependências usadas:

```bash
npm install qr-code-styling
# o projeto hospedeiro precisa de Tailwind CSS + DaisyUI para os estilos
```

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

| Prop          | Tipo     | Padrão                  | Descrição                                   |
| ------------- | -------- | ----------------------- | ------------------------------------------- |
| `initialText` | `String` | `""`                    | Conteúdo inicial do QR Code.                |
| `historyKey`  | `String` | `"qrstudio.history.v1"` | Chave do `localStorage` (isola históricos). |

## Estrutura

```
index.html                    Entrada do Vite
vite.config.js                Build + plugins (Vue, Tailwind)
netlify.toml                  Configuração de deploy
src/
  main.js                     Bootstrap da aplicação
  App.vue                     Casca do app (cabeçalho, tema claro/escuro, rodapé)
  components/QrStudio.vue      Componente principal (toda a UI + lógica)
  components/ColorField.vue    Campo de cor reutilizável (seletor + hexadecimal)
  styles/global.css           Tailwind + DaisyUI + utilitários
```

### Qualidade / notas técnicas

- A `qr-code-styling` codifica os bytes em Latin-1; o componente converte o
  texto para **bytes UTF-8** antes de gerar o código, garantindo a leitura
  correta de acentos e emojis. Esse comportamento foi validado por testes de
  _round-trip_ (gerar → decodificar com um leitor independente) cobrindo ASCII,
  Unicode/emoji, conteúdo numérico e alfanumérico, em vários níveis de correção
  de erro.


## Privacidade

Nenhum dado sai do seu navegador. O conteúdo digitado, as imagens de logo e o
histórico permanecem apenas no seu dispositivo.

## Licença

[MIT](LICENSE) © Willian da Silva Almeida
