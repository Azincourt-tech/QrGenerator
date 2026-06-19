/*
 * QR Studio — Vue 3 application.
 * Wires the UI to the offline QR encoder + renderer, manages the logo,
 * live preview, PNG/SVG export and a localStorage-backed history.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "qrstudio.history.v1";
  var HISTORY_LIMIT = 12;
  var Ecc = window.qrcodegen.QrCode.Ecc;

  function isValidHex(v) {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  var app = Vue.createApp({
    data: function () {
      return {
        text: "https://github.com/azincourt-tech/qrgenerator",
        foreground: "#1c2128",
        background: "#ffffff",
        transparent: false,
        resolution: 512,
        logoDataUrl: null,
        logoName: "",
        dragging: false,
        error: "",
        version: 0,
        moduleCount: 0,
        outputDim: 0,
        history: loadHistory(),
        eccLabel: "Médio"
      };
    },

    computed: {
      canRender: function () {
        return this.text.trim().length > 0 && !this.error;
      }
    },

    watch: {
      text: function () { this.scheduleRender(); },
      foreground: function () { this.scheduleRender(); },
      background: function () { this.scheduleRender(); },
      transparent: function () { this.scheduleRender(); },
      resolution: function () { this.scheduleRender(); },
      logoDataUrl: function (url) {
        var self = this;
        if (!url) {
          this._logoImg = null;
          this.scheduleRender();
          return;
        }
        var img = new Image();
        img.onload = function () {
          self._logoImg = img;
          self.scheduleRender();
        };
        img.onerror = function () {
          self._logoImg = null;
          self.scheduleRender();
        };
        img.src = url;
      }
    },

    mounted: function () {
      this._logoImg = null;
      this.render();
    },

    methods: {
      eccLevel: function () {
        return this.logoDataUrl ? Ecc.HIGH : Ecc.MEDIUM;
      },

      renderOptions: function (pixelSize, forSvg) {
        var opts = {
          foreground: this.foreground,
          background: this.background,
          transparent: this.transparent,
          pixelSize: pixelSize
        };
        if (forSvg) opts.logoDataUrl = this.logoDataUrl;
        else opts.logo = this._logoImg;
        return opts;
      },

      buildQr: function () {
        return window.qrcodegen.QrCode.encodeText(this.text, this.eccLevel());
      },

      scheduleRender: function () {
        var self = this;
        clearTimeout(this._renderTimer);
        this._renderTimer = setTimeout(function () { self.render(); }, 140);
      },

      render: function () {
        this.error = "";
        if (!this.text.trim()) {
          this.version = 0;
          return;
        }
        try {
          var qr = this.buildQr();
          // Preview is capped for snappiness; export always uses full resolution.
          var previewSize = Math.min(this.resolution, 720);
          window.QrRenderer.drawCanvas(
            this.$refs.canvas,
            qr,
            this.renderOptions(previewSize, false)
          );
          var total = qr.size + window.QrRenderer.QUIET_ZONE * 2;
          this.version = qr.version;
          this.moduleCount = qr.size;
          this.outputDim = Math.max(1, Math.floor(this.resolution / total)) * total;
          this.scheduleHistory(qr);
        } catch (e) {
          this.error =
            e && /too long/i.test(e.message)
              ? "Conteúdo muito longo para um QR Code. Reduza o texto."
              : "Não foi possível gerar o QR Code.";
        }
      },

      /* ---------- Colors ---------- */
      onHexInput: function (key, ev) {
        var v = ev.target.value.trim();
        if (v && v[0] !== "#") v = "#" + v;
        if (isValidHex(v)) this[key] = v.toLowerCase();
      },

      /* ---------- Logo ---------- */
      onLogoInput: function (ev) {
        var file = ev.target.files && ev.target.files[0];
        if (file) this.readLogo(file);
        ev.target.value = "";
      },
      onDrop: function (ev) {
        this.dragging = false;
        var file = ev.dataTransfer.files && ev.dataTransfer.files[0];
        if (file && /^image\//.test(file.type)) this.readLogo(file);
      },
      readLogo: function (file) {
        var self = this;
        var reader = new FileReader();
        reader.onload = function (e) {
          self.logoDataUrl = e.target.result;
          self.logoName = file.name;
        };
        reader.readAsDataURL(file);
      },
      removeLogo: function () {
        this.logoDataUrl = null;
        this.logoName = "";
      },

      /* ---------- Export ---------- */
      fileStamp: function () {
        return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      },
      downloadPng: function () {
        if (!this.canRender) return;
        var self = this;
        var qr = this.buildQr();
        var canvas = document.createElement("canvas");
        window.QrRenderer.drawCanvas(canvas, qr, this.renderOptions(this.resolution, false));
        canvas.toBlob(function (blob) {
          self.triggerDownload(URL.createObjectURL(blob), "qrcode-" + self.fileStamp() + ".png", true);
        }, "image/png");
        this.commitHistory(qr);
      },
      downloadSvg: function () {
        if (!this.canRender) return;
        var qr = this.buildQr();
        var svg = window.QrRenderer.buildSvg(qr, this.renderOptions(this.resolution, true));
        var blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        this.triggerDownload(URL.createObjectURL(blob), "qrcode-" + this.fileStamp() + ".svg", true);
        this.commitHistory(qr);
      },
      triggerDownload: function (url, name, revoke) {
        var a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (revoke) setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      },

      /* ---------- History ---------- */
      signature: function () {
        return [this.text, this.foreground, this.background, this.transparent, this.logoDataUrl ? "L" : "-"].join("|");
      },
      scheduleHistory: function (qr) {
        var self = this;
        clearTimeout(this._historyTimer);
        this._historyTimer = setTimeout(function () { self.commitHistory(qr); }, 1400);
      },
      commitHistory: function (qr) {
        var sig = this.signature();
        if (sig === this._lastSig && this.history.length && this.history[0].sig === sig) return;
        var thumbCanvas = document.createElement("canvas");
        window.QrRenderer.drawCanvas(thumbCanvas, qr, {
          foreground: this.foreground,
          background: this.transparent ? "#ffffff" : this.background,
          transparent: false,
          pixelSize: 160,
          logo: this._logoImg
        });
        var entry = {
          id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
          sig: sig,
          text: this.text.length > 60 ? this.text.slice(0, 57) + "…" : this.text,
          fullText: this.text,
          foreground: this.foreground,
          background: this.background,
          transparent: this.transparent,
          resolution: this.resolution,
          logoDataUrl: this.logoDataUrl,
          logoName: this.logoName,
          thumb: thumbCanvas.toDataURL("image/png")
        };
        this.history = this.history.filter(function (h) { return h.sig !== sig; });
        this.history.unshift(entry);
        if (this.history.length > HISTORY_LIMIT) this.history = this.history.slice(0, HISTORY_LIMIT);
        this._lastSig = sig;
        this.persistHistory();
      },
      persistHistory: function () {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
        } catch (e) {
          // Quota exceeded — drop oldest entries until it fits.
          while (this.history.length > 1) {
            this.history.pop();
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
              return;
            } catch (e2) { /* keep trimming */ }
          }
        }
      },
      restore: function (item) {
        this.foreground = item.foreground;
        this.background = item.background;
        this.transparent = item.transparent;
        this.resolution = item.resolution;
        this.logoName = item.logoName || "";
        this.logoDataUrl = item.logoDataUrl || null;
        this.text = item.fullText;
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      removeHistory: function (id) {
        this.history = this.history.filter(function (h) { return h.id !== id; });
        this.persistHistory();
      },
      clearHistory: function () {
        this.history = [];
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      }
    }
  });

  app.mount("#app");
})();
