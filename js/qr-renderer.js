/*
 * Rendering layer: turns a QrCode module matrix into a <canvas> bitmap or an
 * SVG string, with support for custom colors, transparent background and a
 * centered logo that automatically clears a padded area for legibility.
 */
(function (global) {
  "use strict";

  var QUIET_ZONE = 4; // modules of empty margin around the code (spec minimum)
  var LOGO_RATIO = 0.22; // logo width relative to the code (excluding quiet zone)
  var LOGO_PADDING = 0.35; // extra cleared margin around the logo, as a fraction of logo size

  // Returns geometry describing the cleared square (in module units) behind the
  // logo, or null when there is no logo.
  function getLogoBox(qr, hasLogo) {
    if (!hasLogo) return null;
    var n = qr.size;
    var logoModules = Math.round(n * LOGO_RATIO);
    var clearModules = Math.round(logoModules * (1 + LOGO_PADDING * 2));
    if (clearModules % 2 !== n % 2) clearModules += 1; // keep it centered on the grid
    var start = Math.floor((n - clearModules) / 2);
    return {
      logoModules: logoModules,
      clearStart: start,
      clearEnd: start + clearModules,
      clearModules: clearModules
    };
  }

  function isCleared(box, x, y) {
    return box && x >= box.clearStart && x < box.clearEnd && y >= box.clearStart && y < box.clearEnd;
  }

  // Draw the code onto a canvas. options:
  //   foreground, background : hex strings
  //   transparent : boolean (background not painted)
  //   pixelSize : desired output width/height in px (approximate; snapped to module grid)
  //   logo : HTMLImageElement | null
  function drawCanvas(canvas, qr, options) {
    var n = qr.size;
    var totalModules = n + QUIET_ZONE * 2;
    var scale = Math.max(1, Math.floor(options.pixelSize / totalModules));
    var dim = totalModules * scale;
    canvas.width = dim;
    canvas.height = dim;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, dim, dim);

    if (!options.transparent) {
      ctx.fillStyle = options.background;
      ctx.fillRect(0, 0, dim, dim);
    }

    var box = getLogoBox(qr, !!options.logo);
    ctx.fillStyle = options.foreground;
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if (qr.getModule(x, y) && !isCleared(box, x, y)) {
          ctx.fillRect((x + QUIET_ZONE) * scale, (y + QUIET_ZONE) * scale, scale, scale);
        }
      }
    }

    if (box && options.logo) {
      var clearPx = box.clearModules * scale;
      var clearX = (box.clearStart + QUIET_ZONE) * scale;
      // Backing so the logo always sits on a clean, contrasting surface.
      if (!options.transparent) {
        ctx.fillStyle = options.background;
        roundRect(ctx, clearX, clearX, clearPx, clearPx, clearPx * 0.18);
        ctx.fill();
      }
      var logoPx = box.logoModules * scale;
      var logoOffset = (box.clearModules - box.logoModules) / 2 * scale;
      var lx = clearX + logoOffset;
      drawImageContain(ctx, options.logo, lx, lx, logoPx, logoPx);
    }
    return { dimension: dim, scale: scale };
  }

  function drawImageContain(ctx, img, x, y, w, h) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var ratio = Math.min(w / iw, h / ih);
    var dw = iw * ratio;
    var dh = ih * ratio;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Build a standalone SVG string. logoDataUrl is an embedded data: URI or null.
  function buildSvg(qr, options) {
    var n = qr.size;
    var total = n + QUIET_ZONE * 2;
    var box = getLogoBox(qr, !!options.logoDataUrl);
    var parts = [];
    parts.push(
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + options.pixelSize +
      '" height="' + options.pixelSize + '" viewBox="0 0 ' + total + " " + total +
      '" shape-rendering="crispEdges">'
    );
    if (!options.transparent) {
      parts.push('<rect width="' + total + '" height="' + total + '" fill="' + options.background + '"/>');
    }

    // Merge dark modules into a single path for a compact file.
    var d = "";
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if (qr.getModule(x, y) && !isCleared(box, x, y)) {
          d += "M" + (x + QUIET_ZONE) + "," + (y + QUIET_ZONE) + "h1v1h-1z";
        }
      }
    }
    parts.push('<path d="' + d + '" fill="' + options.foreground + '"/>');

    if (box && options.logoDataUrl) {
      var clearStart = box.clearStart + QUIET_ZONE;
      var clearSize = box.clearModules;
      if (!options.transparent) {
        var r = clearSize * 0.18;
        parts.push(
          '<rect x="' + clearStart + '" y="' + clearStart + '" width="' + clearSize +
          '" height="' + clearSize + '" rx="' + r + '" ry="' + r + '" fill="' + options.background + '"/>'
        );
      }
      var logoOffset = (box.clearModules - box.logoModules) / 2;
      var lx = clearStart + logoOffset;
      var ls = box.logoModules;
      parts.push(
        '<image x="' + lx + '" y="' + lx + '" width="' + ls + '" height="' + ls +
        '" preserveAspectRatio="xMidYMid meet" href="' + options.logoDataUrl + '"/>'
      );
    }
    parts.push("</svg>");
    return parts.join("");
  }

  global.QrRenderer = {
    QUIET_ZONE: QUIET_ZONE,
    drawCanvas: drawCanvas,
    buildSvg: buildSvg
  };
})(typeof window !== "undefined" ? window : this);
