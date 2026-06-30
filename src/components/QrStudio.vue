<script setup>
/*
 * <QrStudio /> — gerador de QR Code altamente personalizável.
 * Renderização e estilos (pontos, cantos, gradientes, logo) via qr-code-styling;
 * interface em DaisyUI + Tailwind. Histórico salvo apenas no download.
 *
 * Reuso em outro projeto:
 *   import QrStudio from "@/components/QrStudio.vue";
 *   <QrStudio initial-text="https://..." history-key="meu-app.qr" />
 */
import { ref, reactive, computed, watch, onMounted, nextTick } from "vue";
import QRCodeStyling from "qr-code-styling";
import ColorField from "./ColorField.vue";

const props = defineProps({
  initialText: { type: String, default: "" },
  historyKey: { type: String, default: "qrstudio.history.v1" },
});

const PREVIEW_SIZE = 320;
const HISTORY_LIMIT = 12;

/* ---------- opções (estado reativo) ---------- */
const o = reactive({
  text: props.initialText,
  // pontos
  dotsType: "rounded",
  dotsColor: "#4f46e5",
  useGradient: false,
  gradientType: "linear",
  gradientColor2: "#7c3aed",
  gradientRotation: 45,
  // cantos
  cornersSquareType: "extra-rounded",
  cornersSquareColor: "#1c2128",
  cornersDotType: "dot",
  cornersDotColor: "#4f46e5",
  // logo
  logo: null,
  logoName: "",
  imageSize: 0.4,
  imageMargin: 6,
  hideBackgroundDots: true,
  // fundo
  transparent: false,
  backgroundColor: "#ffffff",
  // exportação
  ecc: "Q",
  resolution: 1024,
});

const activeTab = ref("pontos");
const error = ref("");
const history = ref(loadHistory());
const previewHost = ref(null);
const logoInput = ref(null);

let qr = null; // instância de preview
let renderTimer = null;

const canRender = computed(() => o.text.trim().length > 0);
const effectiveEcc = computed(() =>
  o.logo && (o.ecc === "L" || o.ecc === "M") ? "H" : o.ecc
);

const dotTypeOptions = [
  ["square", "Quadrado"],
  ["rounded", "Arredondado"],
  ["dots", "Pontos"],
  ["classy", "Clássico"],
  ["classy-rounded", "Clássico arredondado"],
  ["extra-rounded", "Extra arredondado"],
];
const cornerSquareOptions = [
  ["", "Automático"],
  ["square", "Quadrado"],
  ["dot", "Ponto"],
  ["extra-rounded", "Extra arredondado"],
];
const cornerDotOptions = [
  ["", "Automático"],
  ["square", "Quadrado"],
  ["dot", "Ponto"],
];

/* A qrcode-generator (interna da qr-code-styling) codifica os bytes em Latin-1.
   Convertemos o texto para a sequência de bytes UTF-8 para que acentos, emojis
   e caracteres não-ASCII sejam lidos corretamente pelos leitores de QR. */
function toQrData(text) {
  const bytes = new TextEncoder().encode(text);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

/* ---------- montagem da opção para a biblioteca ---------- */
function buildOptions(size, type) {
  const gradient = o.useGradient
    ? {
        type: o.gradientType,
        rotation: (o.gradientRotation * Math.PI) / 180,
        colorStops: [
          { offset: 0, color: o.dotsColor },
          { offset: 1, color: o.gradientColor2 },
        ],
      }
    : undefined;

  return {
    type,
    width: size,
    height: size,
    margin: Math.round(size * 0.05),
    data: o.text ? toQrData(o.text) : " ",
    image: o.logo || undefined,
    qrOptions: { errorCorrectionLevel: effectiveEcc.value },
    imageOptions: {
      hideBackgroundDots: o.hideBackgroundDots,
      imageSize: o.imageSize,
      margin: o.imageMargin,
      crossOrigin: "anonymous",
    },
    dotsOptions: { type: o.dotsType, color: o.dotsColor, gradient },
    cornersSquareOptions: {
      type: o.cornersSquareType || undefined,
      color: o.cornersSquareColor,
    },
    cornersDotOptions: {
      type: o.cornersDotType || undefined,
      color: o.cornersDotColor,
    },
    backgroundOptions: {
      color: o.transparent ? "transparent" : o.backgroundColor,
    },
  };
}

/* ---------- preview ---------- */
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(updatePreview, 160);
}
function updatePreview() {
  if (!qr) return;
  error.value = "";
  try {
    qr.update(buildOptions(PREVIEW_SIZE, "canvas"));
  } catch (e) {
    error.value = /overflow|too long|length/i.test(e?.message || "")
      ? "Conteúdo muito longo para o QR Code. Reduza o texto ou use mais correção de erro."
      : "Não foi possível gerar o QR Code.";
  }
}

onMounted(() => {
  qr = new QRCodeStyling(buildOptions(PREVIEW_SIZE, "canvas"));
  qr.append(previewHost.value);
});

watch(
  () => JSON.stringify(o),
  () => scheduleRender()
);

/* ---------- logo ---------- */
function onLogoInput(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (file) readLogo(file);
  ev.target.value = "";
}
function onDrop(ev) {
  const file = ev.dataTransfer.files && ev.dataTransfer.files[0];
  if (file && /^image\//.test(file.type)) readLogo(file);
}
function readLogo(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    o.logo = e.target.result;
    o.logoName = file.name;
  };
  reader.readAsDataURL(file);
}
function removeLogo() {
  o.logo = null;
  o.logoName = "";
}

/* ---------- exportação (salva no histórico só aqui) ---------- */
function fileStamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}
function triggerDownload(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function download(ext) {
  if (!canRender.value) return;
  try {
    const inst = new QRCodeStyling(
      buildOptions(o.resolution, ext === "svg" ? "svg" : "canvas")
    );
    const blob = await inst.getRawData(ext);
    triggerDownload(URL.createObjectURL(blob), `qrcode-${fileStamp()}.${ext}`);
    await commitHistory();
  } catch (e) {
    error.value = "Falha ao exportar o QR Code.";
  }
}

/* ---------- histórico ---------- */
function loadHistory() {
  try {
    const raw = localStorage.getItem(props.historyKey);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function snapshot() {
  return { ...o };
}
function signature() {
  return JSON.stringify(snapshot());
}
function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}
async function commitHistory() {
  const sig = signature();
  if (history.value.length && history.value[0].sig === sig) return;
  const thumbInst = new QRCodeStyling(buildOptions(150, "canvas"));
  const blob = await thumbInst.getRawData("png");
  const thumb = await blobToDataURL(blob);
  const entry = {
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    sig,
    label: o.text.length > 48 ? o.text.slice(0, 45) + "…" : o.text,
    config: snapshot(),
    thumb,
  };
  history.value = history.value.filter((h) => h.sig !== sig);
  history.value.unshift(entry);
  if (history.value.length > HISTORY_LIMIT)
    history.value = history.value.slice(0, HISTORY_LIMIT);
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
  Object.assign(o, item.config);
  activeTab.value = "pontos";
  nextTick(() => window.scrollTo({ top: 0, behavior: "smooth" }));
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
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
    <!-- ====== Controles ====== -->
    <div class="flex min-w-0 flex-col gap-6">
      <!-- Conteúdo -->
      <div class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body gap-3">
          <div class="flex items-start gap-3">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            </span>
            <div>
              <h2 class="text-base font-semibold leading-tight">1. Conteúdo</h2>
              <p class="text-xs opacity-60">O link ou texto que o QR Code vai abrir.</p>
            </div>
          </div>
          <textarea
            v-model="o.text"
            class="textarea min-h-24 w-full"
            placeholder="Cole um link (https://...) ou digite qualquer texto"
          ></textarea>
          <p v-if="error" class="text-error text-xs">{{ error }}</p>
          <p v-else class="text-xs opacity-60">
            Suporta URLs, texto, Wi-Fi, vCard e qualquer conteúdo textual.
          </p>
        </div>
      </div>

      <!-- Personalização (tabs) -->
      <div class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body gap-4">
          <div class="flex items-start gap-3">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>
            </span>
            <div>
              <h2 class="text-base font-semibold leading-tight">2. Personalização</h2>
              <p class="text-xs opacity-60">Deixe o QR Code com a sua cara.</p>
            </div>
          </div>
          <div role="tablist" class="tabs tabs-box bg-base-200">
            <a
              role="tab"
              class="tab"
              :class="{ 'tab-active': activeTab === 'pontos' }"
              @click="activeTab = 'pontos'"
              >Pontos</a
            >
            <a
              role="tab"
              class="tab"
              :class="{ 'tab-active': activeTab === 'cantos' }"
              @click="activeTab = 'cantos'"
              >Cantos</a
            >
            <a
              role="tab"
              class="tab"
              :class="{ 'tab-active': activeTab === 'logo' }"
              @click="activeTab = 'logo'"
              >Logo</a
            >
            <a
              role="tab"
              class="tab"
              :class="{ 'tab-active': activeTab === 'fundo' }"
              @click="activeTab = 'fundo'"
              >Fundo</a
            >
          </div>

          <!-- Tab: Pontos -->
          <div v-show="activeTab === 'pontos'" class="flex flex-col gap-4">
            <label class="flex flex-col w-full">
              <span class="mb-1 text-xs font-medium opacity-70">Estilo dos pontos</span>
              <select v-model="o.dotsType" class="select select-sm w-full">
                <option v-for="[val, txt] in dotTypeOptions" :key="val" :value="val">{{ txt }}</option>
              </select>
            </label>

            <ColorField v-model="o.dotsColor" label="Cor dos pontos" />

            <div>
              <label class="flex cursor-pointer items-center gap-3">
                <input type="checkbox" v-model="o.useGradient" class="toggle toggle-primary toggle-sm" />
                <span class="text-sm">Usar gradiente</span>
              </label>
            </div>

            <div v-show="o.useGradient" class="flex flex-col gap-4 rounded-xl bg-base-200 p-4">
              <label class="flex flex-col w-full">
                <span class="mb-1 text-xs font-medium opacity-70">Tipo de gradiente</span>
                <select v-model="o.gradientType" class="select select-sm w-full">
                  <option value="linear">Linear</option>
                  <option value="radial">Radial</option>
                </select>
              </label>
              <ColorField v-model="o.gradientColor2" label="Segunda cor" />
              <label class="flex flex-col w-full">
                <span class="mb-1 text-xs font-medium opacity-70">
                  Rotação — {{ o.gradientRotation }}°
                </span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  v-model.number="o.gradientRotation"
                  class="range range-primary range-sm"
                />
              </label>
            </div>
          </div>

          <!-- Tab: Cantos -->
          <div v-show="activeTab === 'cantos'" class="flex flex-col gap-4">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label class="flex flex-col w-full">
                <span class="mb-1 text-xs font-medium opacity-70">Quadrado externo</span>
                <select v-model="o.cornersSquareType" class="select select-sm w-full">
                  <option v-for="[val, txt] in cornerSquareOptions" :key="val" :value="val">{{ txt }}</option>
                </select>
              </label>
              <ColorField v-model="o.cornersSquareColor" label="Cor do quadrado" />
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label class="flex flex-col w-full">
                <span class="mb-1 text-xs font-medium opacity-70">Ponto interno</span>
                <select v-model="o.cornersDotType" class="select select-sm w-full">
                  <option v-for="[val, txt] in cornerDotOptions" :key="val" :value="val">{{ txt }}</option>
                </select>
              </label>
              <ColorField v-model="o.cornersDotColor" label="Cor do ponto" />
            </div>
            <p class="text-xs opacity-60">
              "Automático" faz os cantos seguirem o estilo dos pontos.
            </p>
          </div>

          <!-- Tab: Logo -->
          <div v-show="activeTab === 'logo'" class="flex flex-col gap-4">
            <div
              v-if="!o.logo"
              class="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-base-300 bg-base-200 p-5 text-center transition hover:border-primary hover:bg-primary/5"
              @click="logoInput.click()"
              @dragover.prevent
              @drop.prevent="onDrop"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="opacity-60">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span class="text-sm opacity-70">
                <span class="font-semibold text-primary">Clique para enviar</span> ou arraste uma imagem
              </span>
              <span class="text-xs opacity-50">PNG, JPG ou SVG</span>
            </div>
            <div v-else class="flex items-center gap-3 rounded-xl border border-base-300 bg-base-200 p-3">
              <img :src="o.logo" alt="Logo" class="h-11 w-11 shrink-0 rounded-lg border border-base-300 bg-base-100 object-contain" />
              <span class="min-w-0 flex-1 truncate text-sm" :title="o.logoName">{{ o.logoName }}</span>
              <button class="btn btn-ghost btn-xs shrink-0" @click="removeLogo">Remover</button>
            </div>
            <input ref="logoInput" type="file" accept="image/*" hidden @change="onLogoInput" />

            <label class="flex flex-col w-full">
              <span class="mb-1 text-xs font-medium opacity-70">
                Tamanho do logo — {{ Math.round(o.imageSize * 100) }}%
              </span>
              <input type="range" min="0.1" max="0.6" step="0.05" v-model.number="o.imageSize" class="range range-primary range-sm" />
            </label>
            <label class="flex flex-col w-full">
              <span class="mb-1 text-xs font-medium opacity-70">
                Margem ao redor do logo — {{ o.imageMargin }} px
              </span>
              <input type="range" min="0" max="24" step="1" v-model.number="o.imageMargin" class="range range-primary range-sm" />
            </label>
            <div>
              <label class="flex cursor-pointer items-center gap-3">
                <input type="checkbox" v-model="o.hideBackgroundDots" class="toggle toggle-primary toggle-sm" />
                <span class="text-sm">Esconder pontos atrás do logo</span>
              </label>
            </div>
          </div>

          <!-- Tab: Fundo -->
          <div v-show="activeTab === 'fundo'" class="flex flex-col gap-4">
            <div>
              <label class="flex cursor-pointer items-center gap-3">
                <input type="checkbox" v-model="o.transparent" class="toggle toggle-primary toggle-sm" />
                <span class="text-sm">Fundo transparente</span>
              </label>
            </div>
            <ColorField v-model="o.backgroundColor" label="Cor do fundo" :disabled="o.transparent" />
          </div>
        </div>
      </div>

      <!-- Exportação -->
      <div class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body gap-4">
          <div class="flex items-start gap-3">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            </span>
            <div>
              <h2 class="text-base font-semibold leading-tight">3. Baixar</h2>
              <p class="text-xs opacity-60">Escolha a qualidade e o formato do arquivo.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label class="flex flex-col w-full">
              <span class="mb-1 text-xs font-medium opacity-70">Resistência a danos</span>
              <select v-model="o.ecc" class="select select-sm w-full">
                <option value="L">Baixa</option>
                <option value="M">Média</option>
                <option value="Q">Alta (recomendado)</option>
                <option value="H">Máxima</option>
              </select>
            </label>
            <label class="flex flex-col w-full">
              <span class="mb-1 text-xs font-medium opacity-70">Tamanho da imagem</span>
              <select v-model.number="o.resolution" class="select select-sm w-full">
                <option :value="256">Pequeno (256 px)</option>
                <option :value="512">Médio (512 px)</option>
                <option :value="1024">Grande (1024 px)</option>
                <option :value="2048">Impressão (2048 px)</option>
                <option :value="4096">Máximo (4096 px)</option>
              </select>
            </label>
          </div>
          <p class="text-xs opacity-60">
            <strong>Resistência a danos:</strong> níveis maiores mantêm a leitura
            mesmo com logo, desgaste ou sujeira — em troca de um desenho mais denso.
          </p>
          <p v-if="o.logo && (o.ecc === 'L' || o.ecc === 'M')" class="text-xs text-primary opacity-80">
            Como há um logo, a resistência é ajustada para Máxima automaticamente.
          </p>
          <div class="grid grid-cols-2 gap-3">
            <button class="btn btn-primary" :disabled="!canRender" @click="download('png')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              PNG
            </button>
            <button class="btn btn-outline" :disabled="!canRender" @click="download('svg')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              SVG
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== Preview + Histórico ====== -->
    <div class="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
      <div class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body items-center gap-4">
          <div class="qr-checker flex w-full items-center justify-center rounded-2xl border border-base-300 p-5">
            <div v-show="canRender" ref="previewHost" class="qr-canvas-host w-full max-w-[320px]"></div>
            <div v-show="!canRender" class="flex flex-col items-center gap-2 py-10 text-center opacity-50">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3M21 14v.01M14 21h.01M21 17v4h-4" /></svg>
              <span class="text-sm">Digite um conteúdo para ver o QR Code.</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body gap-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold">Histórico</h2>
            <button v-if="history.length" class="btn btn-ghost btn-xs" @click="clearHistory">
              Limpar tudo
            </button>
          </div>
          <div v-if="history.length" class="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3">
            <div
              v-for="item in history"
              :key="item.id"
              class="group relative cursor-pointer rounded-xl border border-base-300 bg-base-200 p-2 text-center transition hover:-translate-y-0.5 hover:border-primary"
              :title="item.label"
              @click="restore(item)"
            >
              <img :src="item.thumb" alt="" class="aspect-square w-full rounded-lg border border-base-300 bg-base-100 object-contain" />
              <span class="mt-1 block truncate text-[0.68rem] opacity-60">{{ item.label }}</span>
              <button
                class="btn btn-circle btn-xs absolute -right-2 -top-2 hidden border-base-300 bg-base-100 group-hover:flex"
                title="Remover"
                @click.stop="removeHistory(item.id)"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
              </button>
            </div>
          </div>
          <p v-else class="py-3 text-center text-sm opacity-60">
            Os QR Codes baixados aparecerão aqui, salvos no seu navegador.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
