# QR Studio — Gerador de QR Code

Ferramenta web minimalista para gerar QR Codes, com design limpo, cantos
suaves e tudo rodando **100% no navegador** — sem servidor, sem banco de dados
e sem login.

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
  `localStorage` do navegador; clique para restaurar as configurações.

## Como usar

É um site estático puro. Basta servir a pasta ou abrir o `index.html`:

```bash
# opção 1: abrir direto
xdg-open index.html        # Linux
open index.html            # macOS

# opção 2: servidor estático local (recomendado)
python3 -m http.server 8080
# depois acesse http://localhost:8080
```

Para publicar, faça deploy da pasta em qualquer host estático
(GitHub Pages, Netlify, Cloudflare Pages, S3, etc.).

## Arquitetura

Sem etapa de build e sem dependências de CDN em tempo de execução — tudo é
carregado localmente para funcionar inclusive offline.

```
index.html                 Estrutura e template Vue
css/styles.css             Estilos (design minimalista, cantos suaves)
js/qrcodegen.js            Codificador de QR Code (versões 1–40, modos
                           numérico/alfanumérico/byte, Reed–Solomon)
js/qr-renderer.js          Renderização para <canvas> (PNG) e SVG, cores,
                           transparência e recorte automático para o logo
js/app.js                  Aplicação Vue 3: UI, histórico e exportação
vendor/vue.global.prod.js  Vue 3 (build de produção, servido localmente)
```

### Stack

- **Vue 3** (build global, sem etapa de bundle) para a reatividade da interface.
- **Codificador de QR próprio**, sem dependências externas. A implementação foi
  validada por testes de _round-trip_ (codificar → rasterizar → decodificar com
  um leitor independente) cobrindo conteúdo numérico, alfanumérico, Unicode,
  textos longos e códigos com logo central.

> Conforme solicitado, **não** é usado React. O único framework é Vue 3.

## Privacidade

Nenhum dado sai do seu navegador. O conteúdo digitado, as imagens de logo e o
histórico permanecem apenas no seu dispositivo.

## Licença

[MIT](LICENSE) © Willian da Silva Almeida
