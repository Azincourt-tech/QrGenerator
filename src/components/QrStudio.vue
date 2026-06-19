<script setup>
/*
 * <QrStudio /> — gerador de QR Code minimalista e auto-contido.
 * Pode ser usado isolado (app) ou importado como componente em outro projeto:
 *
 *   import QrStudio from "./components/QrStudio.vue";
 *   <QrStudio :initial-text="'https://...'" :history-key="'meu-app.qr'" />
 *
 * Sem dependências externas além do Vue: o codificador e a renderização são
 * locais (src/lib).
 */
import { ref, computed, watch, onMounted } from "vue";
import { QrCode } from "../lib/qrcodegen.js";
import { QrRenderer } from "../lib/qr-renderer.js";

const props = defineProps({
  initialText: { type: String, default: "" },
  // Permite isolar o histórico por instância/projeto ao embutir o componente.
  historyKey: { type: String, default: "qrstudio.history.v1" },
});

const Ecc = QrCode.Ecc;
const HISTORY_LIMIT = 12;

/* ---------- estado ---------- */
const text = ref(props.initialText);
const foreground = ref("#1c2128");
const background = ref("#ffffff");
const transparent = ref(false);
const resolution = ref(512);
const logoDataUrl = ref(null);
const logoName = ref("");
const dragging = ref(false);
const error = ref("");
const version = ref(0);
const moduleCount = ref(0);
const outputDim = ref(0);
const eccLabel = ref("Médio");
const history = ref(loadHistory());

const canvas = ref(null);
const logoInput = ref(null);
let logoImg = null; // não-reativo: imagem do logo já decodificada
let renderTimer = null;
let historyTimer = null;
let lastSig = null;

const canRender = computed(() => text.value.trim().length > 0 && !error.value);

/* ---------- helpers ---------- */
function isValidHex(v) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(props.historyKey);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function eccLevel() {
  return logoDataUrl.value ? Ecc.HIGH : Ecc.MEDIUM;
}

function buildQr() {
  return QrCode.encodeText(text.value, eccLevel());
}

function renderOptions(pixelSize, forSvg) {
  const opts = {
    foreground: foreground.value,
    background: background.value,
    transparent: transparent.value,
    pixelSize,
  };
  if (forSvg) opts.logoDataUrl = logoDataUrl.value;
  else opts.logo = logoImg;
  return opts;
}

/* ---------- render ---------- */
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 140);
}

function render() {
  error.value = "";
  if (!text.value.trim()) {
    version.value = 0;
    return;
  }
  try {
    const qr = buildQr();
    const previewSize = Math.min(resolution.value, 720);
    QrRenderer.drawCanvas(canvas.value, qr, renderOptions(previewSize, false));
    const total = qr.size + QrRenderer.QUIET_ZONE * 2;
    version.value = qr.version;
    moduleCount.value = qr.size;
    outputDim.value = Math.max(1, Math.floor(resolution.value / total)) * total;
    scheduleHistory(qr);
  } catch (e) {
    error.value = /too long/i.test(e?.message || "")
      ? "Conteúdo muito longo para um QR Code. Reduza o texto."
      : "Não foi possível gerar o QR Code.";
  }
}

watch([text, foreground, background, transparent, resolution], scheduleRender);
watch(logoDataUrl, (url) => {
  if (!url) {
    logoImg = null;
    scheduleRender();
    return;
  }
  const img = new Image();
  img.onload = () => {
    logoImg = img;
    scheduleRender();
  };
  img.onerror = () => {
    logoImg = null;
    scheduleRender();
  };
  img.src = url;
});

onMounted(render);

/* ---------- cores ---------- */
function onHexInput(target, ev) {
  let v = ev.target.value.trim();
  if (v && v[0] !== "#") v = "#" + v;
  if (isValidHex(v)) {
    if (target === "foreground") foreground.value = v.toLowerCase();
    else background.value = v.toLowerCase();
  }
}

/* ---------- logo ---------- */
function onLogoInput(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (file) readLogo(file);
  ev.target.value = "";
}
function onDrop(ev) {
  dragging.value = false;
  const file = ev.dataTransfer.files && ev.dataTransfer.files[0];
  if (file && /^image\//.test(file.type)) readLogo(file);
}
function readLogo(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    logoDataUrl.value = e.target.result;
    logoName.value = file.name;
  };
  reader.readAsDataURL(file);
}
function removeLogo() {
  logoDataUrl.value = null;
  logoName.value = "";
}

/* ---------- exportação ---------- */
function fileStamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}
function triggerDownload(url, name, revoke) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (revoke) setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadPng() {
  if (!canRender.value) return;
  const qr = buildQr();
  const c = document.createElement("canvas");
  QrRenderer.drawCanvas(c, qr, renderOptions(resolution.value, false));
  c.toBlob((blob) => {
    triggerDownload(URL.createObjectURL(blob), `qrcode-${fileStamp()}.png`, true);
  }, "image/png");
  commitHistory(qr);
}
function downloadSvg() {
  if (!canRender.value) return;
  const qr = buildQr();
  const svg = QrRenderer.buildSvg(qr, renderOptions(resolution.value, true));
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(URL.createObjectURL(blob), `qrcode-${fileStamp()}.svg`, true);
  commitHistory(qr);
}

/* ---------- histórico ---------- */
function signature() {
  return [
    text.value,
    foreground.value,
    background.value,
    transparent.value,
    logoDataUrl.value ? "L" : "-",
  ].join("|");
}
function scheduleHistory(qr) {
  clearTimeout(historyTimer);
  historyTimer = setTimeout(() => commitHistory(qr), 1400);
}
function commitHistory(qr) {
  const sig = signature();
  if (sig === lastSig && history.value.length && history.value[0].sig === sig) return;
  const thumbCanvas = document.createElement("canvas");
  QrRenderer.drawCanvas(thumbCanvas, qr, {
    foreground: foreground.value,
    background: transparent.value ? "#ffffff" : background.value,
    transparent: false,
    pixelSize: 160,
    logo: logoImg,
  });
  const entry = {
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    sig,
    text: text.value.length > 60 ? text.value.slice(0, 57) + "…" : text.value,
    fullText: text.value,
    foreground: foreground.value,
    background: background.value,
    transparent: transparent.value,
    resolution: resolution.value,
    logoDataUrl: logoDataUrl.value,
    logoName: logoName.value,
    thumb: thumbCanvas.toDataURL("image/png"),
  };
  history.value = history.value.filter((h) => h.sig !== sig);
  history.value.unshift(entry);
  if (history.value.length > HISTORY_LIMIT) history.value = history.value.slice(0, HISTORY_LIMIT);
  lastSig = sig;
  persistHistory();
}
function persistHistory() {
  try {
    localStorage.setItem(props.historyKey, JSON.stringify(history.value));
  } catch {
    while (history.value.length > 1) {
      history.value.pop();
      try {
        localStorage.setItem(props.historyKey, JSON.stringify(history.value));
        return;
      } catch {
        /* continua removendo */
      }
    }
  }
}
function restore(item) {
  foreground.value = item.foreground;
  background.value = item.background;
  transparent.value = item.transparent;
  resolution.value = item.resolution;
  logoName.value = item.logoName || "";
  logoDataUrl.value = item.logoDataUrl || null;
  text.value = item.fullText;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function removeHistory(id) {
  history.value = history.value.filter((h) => h.id !== id);
  persistHistory();
}
function clearHistory() {
  history.value = [];
  try {
    localStorage.removeItem(props.historyKey);
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <div class="qr-studio">
    <div class="layout">
      <!-- ===== Controles ===== -->
      <section>
        <div class="card">
          <div class="field">
            <label class="field__label" for="qrs-content">Conteúdo do QR Code</label>
            <textarea
              id="qrs-content"
              v-model="text"
              placeholder="Cole um link (https://...) ou digite qualquer texto"
            ></textarea>
            <p v-if="error" class="field__hint" style="color: var(--qrs-danger)">{{ error }}</p>
            <p v-else class="field__hint">
              Suporta URLs, texto, Wi-Fi, vCard e qualquer conteúdo textual.
            </p>
          </div>

          <div class="field">
            <label class="field__label">Logo central (opcional)</label>
            <div
              v-if="!logoDataUrl"
              class="dropzone"
              :class="{ 'is-drag': dragging }"
              @click="logoInput.click()"
              @dragover.prevent="dragging = true"
              @dragleave.prevent="dragging = false"
              @drop.prevent="onDrop"
            >
              <div class="dropzone__icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div class="dropzone__text">
                <strong>Clique para enviar</strong> ou arraste uma imagem<br />
                PNG, JPG ou SVG — a margem é adicionada automaticamente.
              </div>
            </div>
            <div v-else class="logo-preview">
              <img :src="logoDataUrl" alt="Logo" />
              <span class="logo-preview__name">{{ logoName }}</span>
              <button class="btn btn--text" @click="removeLogo">Remover</button>
            </div>
            <input ref="logoInput" type="file" accept="image/*" hidden @change="onLogoInput" />
          </div>

          <div class="field">
            <label class="field__label">Cores</label>
            <div class="colors">
              <div class="color-control">
                <span class="color-swatch">
                  <input type="color" v-model="foreground" aria-label="Cor do código" />
                </span>
                <input
                  class="color-hex"
                  type="text"
                  :value="foreground"
                  maxlength="7"
                  spellcheck="false"
                  @input="onHexInput('foreground', $event)"
                />
              </div>
              <div class="color-control" :class="{ 'is-disabled': transparent }">
                <span class="color-swatch">
                  <input type="color" v-model="background" aria-label="Cor do fundo" />
                </span>
                <input
                  class="color-hex"
                  type="text"
                  :value="background"
                  maxlength="7"
                  spellcheck="false"
                  @input="onHexInput('background', $event)"
                />
              </div>
            </div>
            <label class="checkbox">
              <input type="checkbox" v-model="transparent" />
              <span class="checkbox__box">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span>Fundo transparente</span>
            </label>
          </div>

          <div class="field">
            <label class="field__label" for="qrs-resolution">Resolução de exportação</label>
            <select id="qrs-resolution" v-model.number="resolution">
              <option :value="256">256 × 256 px — pequeno</option>
              <option :value="512">512 × 512 px — padrão</option>
              <option :value="1024">1024 × 1024 px — alta</option>
              <option :value="2048">2048 × 2048 px — impressão</option>
              <option :value="4096">4096 × 4096 px — máxima</option>
            </select>
            <p class="field__hint">
              Nível de correção de erro:
              <strong>{{ logoDataUrl ? "Alto (logo)" : eccLabel }}</strong>.
            </p>
          </div>

          <div class="field" style="margin-bottom: 0">
            <div class="download-row">
              <button class="btn btn--primary" :disabled="!canRender" @click="downloadPng">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                PNG
              </button>
              <button class="btn btn--ghost" :disabled="!canRender" @click="downloadSvg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                SVG
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== Preview + Histórico ===== -->
      <section class="preview">
        <div class="card">
          <div class="preview__stage">
            <canvas ref="canvas" v-show="canRender"></canvas>
            <div v-show="!canRender" class="preview__empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" style="opacity: 0.4; margin-bottom: 8px"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3M21 14v.01M14 21h.01M21 17v4h-4" /></svg>
              <div>Digite um conteúdo para ver o QR Code aqui.</div>
            </div>
          </div>
          <div v-show="canRender" class="preview__meta">
            <span class="pill">Versão {{ version }} · {{ moduleCount }}×{{ moduleCount }}</span>
            <span class="pill">{{ outputDim }} px</span>
          </div>
        </div>

        <div class="card">
          <div class="section-head">
            <h2>Histórico</h2>
            <button v-if="history.length" class="btn btn--text" @click="clearHistory">Limpar tudo</button>
          </div>
          <div v-if="history.length" class="history-grid">
            <div
              v-for="item in history"
              :key="item.id"
              class="history-item"
              :title="item.text"
              @click="restore(item)"
            >
              <img class="history-item__thumb" :src="item.thumb" alt="" />
              <span class="history-item__label">{{ item.text }}</span>
              <span class="history-item__del" title="Remover" @click.stop="removeHistory(item.id)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
              </span>
            </div>
          </div>
          <p v-else class="history-empty">
            Os QR Codes que você gerar aparecerão aqui, salvos no seu navegador.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.qr-studio {
  /* Variáveis com escopo no componente — não vazam para o app hospedeiro. */
  --qrs-surface: #ffffff;
  --qrs-surface-2: #f8f9fb;
  --qrs-border: #e7e9ee;
  --qrs-text: #1c2128;
  --qrs-muted: #6b7280;
  --qrs-accent: #4f46e5;
  --qrs-accent-hover: #4338ca;
  --qrs-accent-soft: #eef0ff;
  --qrs-danger: #dc2626;
  --qrs-radius-lg: 20px;
  --qrs-radius: 14px;
  --qrs-radius-sm: 10px;
  --qrs-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06);
  --qrs-shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.06);
  --qrs-checker: #e9ebf0;
  color: var(--qrs-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.5;
}

.qr-studio *,
.qr-studio *::before,
.qr-studio *::after {
  box-sizing: border-box;
}

.layout {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 860px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

.card {
  background: var(--qrs-surface);
  border: 1px solid var(--qrs-border);
  border-radius: var(--qrs-radius-lg);
  padding: 24px;
  box-shadow: var(--qrs-shadow);
}

.card + .card {
  margin-top: 24px;
}

.field {
  margin-bottom: 22px;
}

.field:last-child {
  margin-bottom: 0;
}

.field__label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--qrs-text);
}

.field__hint {
  font-size: 0.75rem;
  color: var(--qrs-muted);
  margin-top: 6px;
}

textarea,
input[type="text"],
select {
  width: 100%;
  font: inherit;
  color: var(--qrs-text);
  background: var(--qrs-surface-2);
  border: 1px solid var(--qrs-border);
  border-radius: var(--qrs-radius);
  padding: 12px 14px;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

textarea {
  resize: vertical;
  min-height: 88px;
}

textarea:focus,
input[type="text"]:focus,
select:focus {
  outline: none;
  border-color: var(--qrs-accent);
  background: var(--qrs-surface);
  box-shadow: 0 0 0 3px var(--qrs-accent-soft);
}

select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 38px;
  cursor: pointer;
}

.colors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 520px) {
  .colors {
    grid-template-columns: 1fr;
  }
}

.color-control {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--qrs-surface-2);
  border: 1px solid var(--qrs-border);
  border-radius: var(--qrs-radius);
  padding: 6px 10px 6px 6px;
}

.color-control.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.color-swatch {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: var(--qrs-radius-sm);
  border: 1px solid var(--qrs-border);
  overflow: hidden;
  flex-shrink: 0;
}

.color-swatch input[type="color"] {
  position: absolute;
  inset: -6px;
  width: calc(100% + 12px);
  height: calc(100% + 12px);
  border: none;
  padding: 0;
  cursor: pointer;
  background: none;
}

.color-hex {
  border: none !important;
  background: transparent !important;
  padding: 4px 2px !important;
  font-variant-numeric: tabular-nums;
  text-transform: uppercase;
  box-shadow: none !important;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.85rem;
  user-select: none;
  margin-top: 14px;
}

.checkbox input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkbox__box {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1.5px solid var(--qrs-border);
  background: var(--qrs-surface-2);
  display: grid;
  place-items: center;
  transition: all 0.15s;
  flex-shrink: 0;
}

.checkbox__box svg {
  opacity: 0;
  transform: scale(0.6);
  transition: all 0.15s;
}

.checkbox input:checked + .checkbox__box {
  background: var(--qrs-accent);
  border-color: var(--qrs-accent);
}

.checkbox input:checked + .checkbox__box svg {
  opacity: 1;
  transform: scale(1);
}

.checkbox input:focus-visible + .checkbox__box {
  box-shadow: 0 0 0 3px var(--qrs-accent-soft);
}

.dropzone {
  border: 1.5px dashed var(--qrs-border);
  border-radius: var(--qrs-radius);
  padding: 18px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  background: var(--qrs-surface-2);
}

.dropzone:hover,
.dropzone.is-drag {
  border-color: var(--qrs-accent);
  background: var(--qrs-accent-soft);
}

.dropzone__icon {
  color: var(--qrs-muted);
  margin-bottom: 6px;
}

.dropzone__text {
  font-size: 0.82rem;
  color: var(--qrs-muted);
}

.dropzone__text strong {
  color: var(--qrs-accent);
}

.logo-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--qrs-surface-2);
  border: 1px solid var(--qrs-border);
  border-radius: var(--qrs-radius);
  padding: 10px 12px;
}

.logo-preview img {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 8px;
  background: #fff;
  border: 1px solid var(--qrs-border);
}

.logo-preview__name {
  flex: 1;
  font-size: 0.82rem;
  color: var(--qrs-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn {
  font: inherit;
  font-weight: 600;
  font-size: 0.875rem;
  border: 1px solid transparent;
  border-radius: var(--qrs-radius);
  padding: 11px 16px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.05s;
}

.btn:active {
  transform: translateY(1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--qrs-accent);
  color: #fff;
}

.btn--primary:hover:not(:disabled) {
  background: var(--qrs-accent-hover);
}

.btn--ghost {
  background: var(--qrs-surface);
  border-color: var(--qrs-border);
  color: var(--qrs-text);
}

.btn--ghost:hover:not(:disabled) {
  border-color: var(--qrs-accent);
  color: var(--qrs-accent);
}

.btn--text {
  background: none;
  border: none;
  color: var(--qrs-muted);
  padding: 4px 8px;
}

.btn--text:hover {
  color: var(--qrs-danger);
}

.download-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.preview {
  position: sticky;
  top: 24px;
}

.preview__stage {
  border-radius: var(--qrs-radius);
  padding: 22px;
  display: grid;
  place-items: center;
  min-height: 260px;
  background-color: var(--qrs-surface-2);
  background-image: linear-gradient(45deg, var(--qrs-checker) 25%, transparent 25%),
    linear-gradient(-45deg, var(--qrs-checker) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--qrs-checker) 75%),
    linear-gradient(-45deg, transparent 75%, var(--qrs-checker) 75%);
  background-size: 18px 18px;
  background-position: 0 0, 0 9px, 9px -9px, -9px 0;
  border: 1px solid var(--qrs-border);
}

.preview__stage canvas {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  image-rendering: pixelated;
  box-shadow: 0 4px 18px rgba(16, 24, 40, 0.08);
}

.preview__empty {
  color: var(--qrs-muted);
  font-size: 0.875rem;
  text-align: center;
}

.preview__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--qrs-muted);
  margin-top: 14px;
}

.preview__meta .pill {
  background: var(--qrs-surface-2);
  border: 1px solid var(--qrs-border);
  border-radius: 999px;
  padding: 3px 10px;
  font-variant-numeric: tabular-nums;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-head h2 {
  font-size: 0.95rem;
  margin: 0;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 12px;
}

.history-item {
  border: 1px solid var(--qrs-border);
  border-radius: var(--qrs-radius);
  background: var(--qrs-surface-2);
  padding: 8px;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
  position: relative;
  text-align: center;
}

.history-item:hover {
  border-color: var(--qrs-accent);
  transform: translateY(-2px);
}

.history-item__thumb {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  background: #fff;
  border: 1px solid var(--qrs-border);
  object-fit: contain;
}

.history-item__label {
  display: block;
  font-size: 0.68rem;
  color: var(--qrs-muted);
  margin-top: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item__del {
  position: absolute;
  top: -7px;
  right: -7px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--qrs-surface);
  border: 1px solid var(--qrs-border);
  color: var(--qrs-muted);
  display: none;
  place-items: center;
  cursor: pointer;
  box-shadow: var(--qrs-shadow-sm);
}

.history-item:hover .history-item__del {
  display: grid;
}

.history-item__del:hover {
  color: var(--qrs-danger);
  border-color: var(--qrs-danger);
}

.history-empty {
  font-size: 0.85rem;
  color: var(--qrs-muted);
  text-align: center;
  padding: 16px 0;
}
</style>
