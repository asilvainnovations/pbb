/* ==========================================================================
   PBB MEMBERSHIP ID — capture, render, export
   --------------------------------------------------------------------------
   Three responsibilities, kept separate so each can be tested on its own:

     PBB.photo      camera + file capture, cropped to a 3:4 portrait
     PBB.signature  finger/stylus/mouse drawing on a canvas, trimmed
     PBB.idCard     renders the front and back of a CR80 card and exports
                    PNG (share) and PDF (print)

   CARD GEOMETRY
   CR80 is the ISO/IEC 7810 credit-card size: 85.6 x 54 mm. At 300 DPI that is
   1011 x 638 px, which is what we render at — big enough to print crisply,
   small enough that a mid-range Android phone can hold two of them in canvas
   memory without the tab being killed.

   OFFLINE
   Everything here runs client-side. The only thing that requires the network
   is obtaining the membership number, which is issued by the server so that
   it is real and unique (a locally-generated number would let anyone
   fabricate a convincing PBB ID). If the submission is queued offline, the
   card can still be previewed but is watermarked PENDING and carries no QR,
   because there is nothing yet to verify against.

   DEPENDENCIES (loaded lazily, only when an export is actually requested)
     jsPDF    https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js
     QRious   https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js
   ========================================================================== */

(function (window, document) {
  'use strict';

  var PBB = window.PBB || (window.PBB = {});

  /* Card geometry ------------------------------------------------------- */
  var CARD_W = 1011;      // 85.6 mm @ 300 DPI
  var CARD_H = 638;       // 54.0 mm @ 300 DPI
  var CARD_W_MM = 85.6;
  var CARD_H_MM = 54;

  var COLOR = {
    forestDeep: '#063D1B',
    forest:     '#0A6E2E',
    gold:       '#C9A227',
    goldBright: '#F2C94C',
    white:      '#FFFFFF',
    ink:        '#EAF1EC',
    inkSoft:    '#B9C6BD'
  };

  /* ======================================================================
     0. LAZY SCRIPT LOADER
     ====================================================================== */

  var loaded = {};
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Hindi ma-load: ' + src)); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }

  /* ======================================================================
     1. PHOTO CAPTURE
     Camera via getUserMedia with a file-picker fallback. The fallback is not
     a nicety: camera permission is routinely denied, and on desktop there is
     often no camera at all.
     ====================================================================== */

  function PhotoCapture(opts) {
    this.video    = opts.video;
    this.canvas   = opts.canvas;
    this.preview  = opts.preview;
    this.fileInput = opts.fileInput;
    this.statusEl = opts.statusEl;
    this.stream   = null;
    this.dataUrl  = '';
    this.onChange = opts.onChange || function () {};
    this._wire();
  }

  PhotoCapture.prototype._wire = function () {
    var self = this;
    if (this.fileInput) {
      this.fileInput.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (file) self.fromFile(file);
      });
    }
  };

  PhotoCapture.prototype.supported = function () {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  PhotoCapture.prototype.start = function () {
    var self = this;
    if (!this.supported()) {
      return Promise.reject(new Error('Walang camera sa device na ito. Gamitin ang "Mag-upload ng litrato".'));
    }
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 1280 } },
      audio: false
    }).then(function (stream) {
      self.stream = stream;
      self.video.srcObject = stream;
      self.video.hidden = false;
      return self.video.play();
    });
  };

  PhotoCapture.prototype.stop = function () {
    if (!this.stream) return;
    this.stream.getTracks().forEach(function (t) { t.stop(); });
    this.stream = null;
    this.video.hidden = true;
  };

  /** Centre-crop whatever we got to 3:4 portrait at 600x800. */
  PhotoCapture.prototype._cropTo34 = function (source, sw, sh) {
    var TW = 600, TH = 800;
    var canvas = this.canvas;
    canvas.width = TW;
    canvas.height = TH;
    var ctx = canvas.getContext('2d');

    var targetRatio = TW / TH;
    var sourceRatio = sw / sh;
    var cx = 0, cy = 0, cw = sw, ch = sh;

    if (sourceRatio > targetRatio) {          // too wide -> crop sides
      cw = sh * targetRatio;
      cx = (sw - cw) / 2;
    } else {                                   // too tall -> crop top/bottom
      ch = sw / targetRatio;
      cy = (sh - ch) / 2;
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, TW, TH);
    ctx.drawImage(source, cx, cy, cw, ch, 0, 0, TW, TH);

    // JPEG at 0.82: a 600x800 portrait lands around 45-70 KB, which keeps the
    // whole submission comfortably under the Edge Function's 256 KB cap even
    // with a signature PNG attached.
    this.dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    if (this.preview) {
      this.preview.src = this.dataUrl;
      this.preview.hidden = false;
    }
    this.onChange(this.dataUrl);
    return this.dataUrl;
  };

  PhotoCapture.prototype.capture = function () {
    if (!this.stream) throw new Error('Hindi pa bukas ang camera.');
    var url = this._cropTo34(this.video, this.video.videoWidth, this.video.videoHeight);
    this.stop();
    return url;
  };

  PhotoCapture.prototype.fromFile = function (file) {
    var self = this;
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) {
        reject(new Error('Larawan lang ang puwede (JPG o PNG).'));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('Masyadong malaki ang file. Pumili ng mas maliit na larawan.'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          resolve(self._cropTo34(img, img.naturalWidth, img.naturalHeight));
        };
        img.onerror = function () { reject(new Error('Hindi mabasa ang larawan.')); };
        img.src = reader.result;
      };
      reader.onerror = function () { reject(new Error('Hindi mabasa ang file.')); };
      reader.readAsDataURL(file);
    });
  };

  PhotoCapture.prototype.clear = function () {
    this.dataUrl = '';
    if (this.preview) { this.preview.hidden = true; this.preview.removeAttribute('src'); }
    this.onChange('');
  };

  /* ======================================================================
     2. SIGNATURE PAD
     Pointer Events cover mouse, finger, and stylus with one code path.
     ====================================================================== */

  function SignaturePad(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.drawing = false;
    this.dirty = false;
    this.onChange = opts.onChange || function () {};
    this._resize();
    this._wire();
    window.addEventListener('resize', this._resize.bind(this));
  }

  SignaturePad.prototype._resize = function () {
    // Preserve any existing drawing across an orientation change.
    var prev = this.dirty ? this.canvas.toDataURL('image/png') : null;
    var ratio = Math.max(window.devicePixelRatio || 1, 1);
    var rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return;

    this.canvas.width = rect.width * ratio;
    this.canvas.height = rect.height * ratio;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(ratio, ratio);
    this.ctx.lineWidth = 2.4;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#14261A';

    if (prev) {
      var img = new Image();
      var self = this;
      img.onload = function () { self.ctx.drawImage(img, 0, 0, rect.width, rect.height); };
      img.src = prev;
    }
  };

  SignaturePad.prototype._point = function (e) {
    var rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  SignaturePad.prototype._wire = function () {
    var self = this;

    function down(e) {
      self.drawing = true;
      self.dirty = true;
      var p = self._point(e);
      self.ctx.beginPath();
      self.ctx.moveTo(p.x, p.y);
      // Capture so a finger that slides off the canvas still draws sensibly.
      if (self.canvas.setPointerCapture) self.canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
    function move(e) {
      if (!self.drawing) return;
      var p = self._point(e);
      self.ctx.lineTo(p.x, p.y);
      self.ctx.stroke();
      e.preventDefault();
    }
    function up(e) {
      if (!self.drawing) return;
      self.drawing = false;
      self.onChange(self.isEmpty() ? '' : self.toDataURL());
      if (e && e.preventDefault) e.preventDefault();
    }

    this.canvas.addEventListener('pointerdown', down);
    this.canvas.addEventListener('pointermove', move);
    this.canvas.addEventListener('pointerup', up);
    this.canvas.addEventListener('pointercancel', up);
    this.canvas.addEventListener('pointerleave', up);
    // Stop the page scrolling while someone signs with a finger.
    this.canvas.style.touchAction = 'none';
  };

  SignaturePad.prototype.isEmpty = function () { return !this.dirty; };

  SignaturePad.prototype.clear = function () {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.dirty = false;
    this.onChange('');
  };

  /** Trim surrounding whitespace so the signature sits tight on the card. */
  SignaturePad.prototype.toDataURL = function () {
    var w = this.canvas.width, h = this.canvas.height;
    var data;
    try {
      data = this.ctx.getImageData(0, 0, w, h).data;
    } catch (e) {
      return this.canvas.toDataURL('image/png');   // tainted canvas, unlikely
    }

    var minX = w, minY = h, maxX = 0, maxY = 0, found = false;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 8) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) return '';

    var pad = 8;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(w, maxX + pad); maxY = Math.min(h, maxY + pad);

    var out = document.createElement('canvas');
    out.width = maxX - minX;
    out.height = maxY - minY;
    out.getContext('2d').drawImage(this.canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  };

  /* ======================================================================
     3. ID CARD RENDERER
     ====================================================================== */

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      if (!src) { resolve(null); return; }
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };   // never block the card
      img.src = src;
    });
  }

  /** Draw text, shrinking the font until it fits maxWidth. */
  function fitText(ctx, text, x, y, maxWidth, startPx, family, weight) {
    var size = startPx;
    do {
      ctx.font = (weight || '700') + ' ' + size + 'px ' + (family || 'Poppins, sans-serif');
      if (ctx.measureText(text).width <= maxWidth || size <= 18) break;
      size -= 2;
    } while (true);
    ctx.fillText(text, x, y);
    return size;
  }

  function makeQR(text, size) {
    return loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js')
      .then(function () {
        var q = new window.QRious({
          value: text,
          size: size || 300,
          level: 'M',
          background: '#FFFFFF',
          foreground: '#063D1B'
        });
        return q.toDataURL('image/png');
      })
      .catch(function () { return ''; });   // a missing QR must not break the ID
  }

  /**
   * data = {
   *   memberNo, fullName, province, municipality, barangay, precinct,
   *   chapter, issuedAt, validUntil, photo (dataURL), signature (dataURL),
   *   verifyUrl, pending (bool)
   * }
   */
  function renderFront(canvas, data) {
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    var ctx = canvas.getContext('2d');

    return Promise.all([
      loadImage(data.photo),
      loadImage(data.signature),
      loadImage('assets/pbb-logo-256.png')
    ]).then(function (imgs) {
      var photo = imgs[0], sign = imgs[1], logo = imgs[2];

      /* Background */
      var g = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
      g.addColorStop(0, COLOR.forestDeep);
      g.addColorStop(1, '#0A4A22');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      /* Gold header band */
      var gb = ctx.createLinearGradient(0, 0, CARD_W, 0);
      gb.addColorStop(0, '#F7DE8E');
      gb.addColorStop(0.45, '#D9AF33');
      gb.addColorStop(1, '#8B6914');
      ctx.fillStyle = gb;
      ctx.fillRect(0, 0, CARD_W, 96);

      if (logo) ctx.drawImage(logo, 26, 14, 68, 68);

      ctx.fillStyle = COLOR.forestDeep;
      ctx.font = '800 30px Poppins, sans-serif';
      ctx.fillText('PARTIDO BANGON BANGSAMORO', 110, 46);
      ctx.font = '600 19px Montserrat, sans-serif';
      ctx.fillText('OFFICIAL MEMBERSHIP ID · BARMM', 110, 76);

      /* Photo frame */
      var px = 34, py = 132, pw = 210, ph = 280;
      ctx.fillStyle = '#ffffff14';
      roundRect(ctx, px - 6, py - 6, pw + 12, ph + 12, 14);
      ctx.fill();
      ctx.save();
      roundRect(ctx, px, py, pw, ph, 10);
      ctx.clip();
      if (photo) {
        ctx.drawImage(photo, px, py, pw, ph);
      } else {
        ctx.fillStyle = '#123C24';
        ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = COLOR.inkSoft;
        ctx.font = '600 20px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('WALANG', px + pw / 2, py + ph / 2 - 8);
        ctx.fillText('LITRATO', px + pw / 2, py + ph / 2 + 20);
        ctx.textAlign = 'left';
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(201,162,39,.55)';
      ctx.lineWidth = 3;
      roundRect(ctx, px, py, pw, ph, 10);
      ctx.stroke();

      /* Identity block */
      var tx = 282;
      ctx.fillStyle = COLOR.goldBright;
      ctx.font = '700 17px Montserrat, sans-serif';
      ctx.fillText('PANGALAN', tx, 156);

      ctx.fillStyle = COLOR.white;
      fitText(ctx, (data.fullName || '').toUpperCase(), tx, 194, CARD_W - tx - 40, 36, 'Poppins, sans-serif', '800');

      var rows = [
        ['MEMBER NO.',  data.memberNo || '—'],
        ['PROBINSYA',   data.province || '—'],
        ['MUNISIPYO',   data.municipality || '—'],
        ['BARANGAY',    data.barangay || '—'],
        ['PRECINCT NO.', data.precinct || '—']
      ];

      var ry = 240;
      rows.forEach(function (row) {
        ctx.fillStyle = COLOR.inkSoft;
        ctx.font = '600 15px Montserrat, sans-serif';
        ctx.fillText(row[0], tx, ry);
        ctx.fillStyle = COLOR.white;
        ctx.font = '700 22px Roboto Condensed, sans-serif';
        ctx.fillText(String(row[1]), tx + 172, ry + 1);
        ry += 36;
      });

      /* Signature */
      var sx = 282, sy = 470, sw = 250, sh = 70;
      if (sign) {
        // Draw the (dark) signature inverted so it reads on the dark card.
        var tmp = document.createElement('canvas');
        tmp.width = sign.naturalWidth;
        tmp.height = sign.naturalHeight;
        var tctx = tmp.getContext('2d');
        tctx.drawImage(sign, 0, 0);
        tctx.globalCompositeOperation = 'source-in';
        tctx.fillStyle = '#FFFFFF';
        tctx.fillRect(0, 0, tmp.width, tmp.height);

        var scale = Math.min(sw / tmp.width, sh / tmp.height);
        ctx.drawImage(tmp, sx, sy - tmp.height * scale + sh, tmp.width * scale, tmp.height * scale);
      }
      ctx.strokeStyle = 'rgba(255,255,255,.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy + sh + 6);
      ctx.lineTo(sx + sw, sy + sh + 6);
      ctx.stroke();
      ctx.fillStyle = COLOR.inkSoft;
      ctx.font = '600 14px Montserrat, sans-serif';
      ctx.fillText('LAGDA NG MIYEMBRO', sx, sy + sh + 28);

      /* Photo-side caption */
      ctx.fillStyle = COLOR.inkSoft;
      ctx.font = '600 14px Montserrat, sans-serif';
      ctx.fillText('CHAPTER', px, py + ph + 30);
      ctx.fillStyle = COLOR.goldBright;
      ctx.font = '700 17px Montserrat, sans-serif';
      fitText(ctx, data.chapter || 'PBB National', px, py + ph + 54, pw + 10, 17, 'Montserrat, sans-serif', '700');

      /* QR (only when the ID is actually verifiable) */
      var qrPromise = (data.verifyUrl && !data.pending)
        ? makeQR(data.verifyUrl, 300).then(loadImage)
        : Promise.resolve(null);

      return qrPromise.then(function (qr) {
        var qx = CARD_W - 178, qy = CARD_H - 190;
        if (qr) {
          ctx.fillStyle = '#FFFFFF';
          roundRect(ctx, qx - 10, qy - 10, 158, 158, 10);
          ctx.fill();
          ctx.drawImage(qr, qx, qy, 138, 138);
          ctx.fillStyle = COLOR.inkSoft;
          ctx.font = '600 13px Montserrat, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('I-scan para i-verify', qx + 69, qy + 168);
          ctx.textAlign = 'left';
        }

        /* PENDING watermark — an ID that has not reached the server yet must
           not look like a verified one. */
        if (data.pending) {
          ctx.save();
          ctx.translate(CARD_W / 2, CARD_H / 2);
          ctx.rotate(-Math.PI / 9);
          ctx.globalAlpha = 0.26;
          ctx.fillStyle = '#FFD86B';
          ctx.font = '800 92px Poppins, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('PENDING', 0, 0);
          ctx.restore();
        }

        return canvas;
      });
    });
  }

  function renderBack(canvas, data) {
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = '#F4F8F5';
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    ctx.fillStyle = COLOR.forest;
    ctx.fillRect(0, 0, CARD_W, 14);

    ctx.fillStyle = COLOR.forestDeep;
    ctx.font = '800 27px Poppins, sans-serif';
    ctx.fillText('MGA TUNTUNIN', 44, 74);

    var lines = [
      'Ang ID na ito ay patunay ng membership sa Partido Bangon',
      'Bangsamoro. Hindi ito government-issued ID at hindi ito',
      'kapalit ng voter’s ID o anumang opisyal na pagkakakilanlan.',
      '',
      'Kung mawala o manakaw, agad itong iulat sa hotline sa ibaba.',
      'Ang paggamit nito ng ibang tao ay labag sa tuntunin ng partido.',
      '',
      'Maaaring i-verify ang ID na ito sa pamamagitan ng QR code sa harap,',
      'o sa bangonbangsamoro.com/verify.html gamit ang member number.'
    ];
    ctx.fillStyle = '#243A2B';
    ctx.font = '400 21px Roboto Condensed, sans-serif';
    lines.forEach(function (line, i) { ctx.fillText(line, 44, 118 + i * 30); });

    ctx.fillStyle = COLOR.forestDeep;
    ctx.font = '700 20px Montserrat, sans-serif';
    ctx.fillText('Hotline: 0966 301 8777', 44, CARD_H - 96);
    ctx.font = '400 19px Roboto Condensed, sans-serif';
    ctx.fillText('info@bangonbangsamoro.com · Cotabato City, BARMM', 44, CARD_H - 66);

    ctx.fillStyle = '#5A6C60';
    ctx.font = '600 15px Montserrat, sans-serif';
    ctx.fillText('Petsa ng pagkakaloob: ' + (data.issuedAt || '—') +
                 '   ·   Valid hanggang: ' + (data.validUntil || '—'), 44, CARD_H - 32);

    return Promise.resolve(canvas);
  }

  /* ---- Exports ---------------------------------------------------------- */

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) canvas.toBlob(function (b) { resolve(b); }, type, quality);
      else {
        var parts = canvas.toDataURL(type, quality).split(',');
        var bin = atob(parts[1]);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        resolve(new Blob([arr], { type: type }));
      }
    });
  }

  function safeName(data) {
    return 'PBB-ID-' +
      (data.memberNo || 'PENDING').replace(/[^A-Za-z0-9-]/g, '') + '-' +
      (data.fullName || 'member').replace(/[^A-Za-z0-9]+/g, '-').slice(0, 40);
  }

  function exportPNG(frontCanvas, backCanvas, data) {
    return canvasToBlob(frontCanvas, 'image/png')
      .then(function (blob) {
        downloadBlob(blob, safeName(data) + '-front.png');
        return canvasToBlob(backCanvas, 'image/png');
      })
      .then(function (blob) {
        downloadBlob(blob, safeName(data) + '-back.png');
      });
  }

  function exportPDF(frontCanvas, backCanvas, data) {
    return loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js')
      .then(function () {
        var jsPDF = window.jspdf.jsPDF;
        // Exact CR80 page size so the card prints 1:1 with no scaling dialog.
        var doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [CARD_W_MM, CARD_H_MM],
          compress: true
        });
        doc.addImage(frontCanvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, CARD_W_MM, CARD_H_MM);
        doc.addPage([CARD_W_MM, CARD_H_MM], 'landscape');
        doc.addImage(backCanvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, CARD_W_MM, CARD_H_MM);
        doc.setProperties({
          title: 'PBB Membership ID — ' + (data.memberNo || 'PENDING'),
          author: 'Partido Bangon Bangsamoro',
          creator: 'bangonbangsamoro.com'
        });
        doc.save(safeName(data) + '.pdf');
      });
  }

  /* ======================================================================
     4. PUBLIC API
     ====================================================================== */

  PBB.idCard = {
    CARD_W: CARD_W,
    CARD_H: CARD_H,
    renderFront: renderFront,
    renderBack: renderBack,
    exportPNG: exportPNG,
    exportPDF: exportPDF,
    makeQR: makeQR
  };
  PBB.PhotoCapture = PhotoCapture;
  PBB.SignaturePad = SignaturePad;

})(window, document);
