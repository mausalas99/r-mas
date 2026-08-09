import {
  STATUS_LABELS
} from "/mobile/js/chunks/chunk-TBUVYOE2.js";
import {
  buildCloudMobileJoinUrl
} from "/mobile/js/chunks/chunk-OBGB2GI4.js";
import {
  copyToClipboardSafe,
  getSharedNubeOutbox,
  getSharedNubeRuntime
} from "/mobile/js/chunks/chunk-JHCY7JRY.js";
import {
  STACKED_BACKDROP_CLASS
} from "/mobile/js/chunks/chunk-YR5I2T5V.js";
import {
  isCloudMutateBridgeConfigured,
  pruneLabSidecarsFromOutbox
} from "/mobile/js/chunks/chunk-QJ4AKPQ5.js";
import {
  CLOUD_SYNC_CLIENT_NOT_READY,
  formatCloudDiagnosticsReport,
  getCloudSyncDiagnostics,
  humanizeTechnicalSyncMessage,
  isCloudSyncNetworkErrorMessage,
  isToxicCloudOutboxEntry
} from "/mobile/js/chunks/chunk-RQX7XEPZ.js";
import {
  patients
} from "/mobile/js/chunks/chunk-4VEBEOGH.js";
import {
  CLOUD_LAB_BACKFILL_MUTATION_ID,
  CLOUD_PUSH_WARN_BODY_BYTES
} from "/mobile/js/chunks/chunk-ISXDOTEU.js";
import {
  esc
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-QHIEC6QJ.js";
import {
  isCloudSyncActive
} from "/mobile/js/chunks/chunk-CAVI7UGR.js";
import {
  getCloudSyncRoomSnapshot,
  getCloudSyncSettings,
  getCloudSyncToken,
  getCloudSyncUrl
} from "/mobile/js/chunks/chunk-KLMIZH6A.js";

// node_modules/qrcode-generator/dist/qrcode.mjs
var qrcode = function(typeNumber, errorCorrectionLevel) {
  const PAD0 = 236;
  const PAD1 = 17;
  let _typeNumber = typeNumber;
  const _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
  let _modules = null;
  let _moduleCount = 0;
  let _dataCache = null;
  const _dataList = [];
  const _this = {};
  const makeImpl = function(test, maskPattern) {
    _moduleCount = _typeNumber * 4 + 17;
    _modules = (function(moduleCount) {
      const modules = new Array(moduleCount);
      for (let row = 0; row < moduleCount; row += 1) {
        modules[row] = new Array(moduleCount);
        for (let col = 0; col < moduleCount; col += 1) {
          modules[row][col] = null;
        }
      }
      return modules;
    })(_moduleCount);
    setupPositionProbePattern(0, 0);
    setupPositionProbePattern(_moduleCount - 7, 0);
    setupPositionProbePattern(0, _moduleCount - 7);
    setupPositionAdjustPattern();
    setupTimingPattern();
    setupTypeInfo(test, maskPattern);
    if (_typeNumber >= 7) {
      setupTypeNumber(test);
    }
    if (_dataCache == null) {
      _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
    }
    mapData(_dataCache, maskPattern);
  };
  const setupPositionProbePattern = function(row, col) {
    for (let r = -1; r <= 7; r += 1) {
      if (row + r <= -1 || _moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c += 1) {
        if (col + c <= -1 || _moduleCount <= col + c) continue;
        if (0 <= r && r <= 6 && (c == 0 || c == 6) || 0 <= c && c <= 6 && (r == 0 || r == 6) || 2 <= r && r <= 4 && 2 <= c && c <= 4) {
          _modules[row + r][col + c] = true;
        } else {
          _modules[row + r][col + c] = false;
        }
      }
    }
  };
  const getBestMaskPattern = function() {
    let minLostPoint = 0;
    let pattern = 0;
    for (let i = 0; i < 8; i += 1) {
      makeImpl(true, i);
      const lostPoint = QRUtil.getLostPoint(_this);
      if (i == 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }
    return pattern;
  };
  const setupTimingPattern = function() {
    for (let r = 8; r < _moduleCount - 8; r += 1) {
      if (_modules[r][6] != null) {
        continue;
      }
      _modules[r][6] = r % 2 == 0;
    }
    for (let c = 8; c < _moduleCount - 8; c += 1) {
      if (_modules[6][c] != null) {
        continue;
      }
      _modules[6][c] = c % 2 == 0;
    }
  };
  const setupPositionAdjustPattern = function() {
    const pos = QRUtil.getPatternPosition(_typeNumber);
    for (let i = 0; i < pos.length; i += 1) {
      for (let j = 0; j < pos.length; j += 1) {
        const row = pos[i];
        const col = pos[j];
        if (_modules[row][col] != null) {
          continue;
        }
        for (let r = -2; r <= 2; r += 1) {
          for (let c = -2; c <= 2; c += 1) {
            if (r == -2 || r == 2 || c == -2 || c == 2 || r == 0 && c == 0) {
              _modules[row + r][col + c] = true;
            } else {
              _modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  };
  const setupTypeNumber = function(test) {
    const bits = QRUtil.getBCHTypeNumber(_typeNumber);
    for (let i = 0; i < 18; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
    }
    for (let i = 0; i < 18; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  };
  const setupTypeInfo = function(test, maskPattern) {
    const data = _errorCorrectionLevel << 3 | maskPattern;
    const bits = QRUtil.getBCHTypeInfo(data);
    for (let i = 0; i < 15; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      if (i < 6) {
        _modules[i][8] = mod;
      } else if (i < 8) {
        _modules[i + 1][8] = mod;
      } else {
        _modules[_moduleCount - 15 + i][8] = mod;
      }
    }
    for (let i = 0; i < 15; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      if (i < 8) {
        _modules[8][_moduleCount - i - 1] = mod;
      } else if (i < 9) {
        _modules[8][15 - i - 1 + 1] = mod;
      } else {
        _modules[8][15 - i - 1] = mod;
      }
    }
    _modules[_moduleCount - 8][8] = !test;
  };
  const mapData = function(data, maskPattern) {
    let inc = -1;
    let row = _moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    const maskFunc = QRUtil.getMaskFunction(maskPattern);
    for (let col = _moduleCount - 1; col > 0; col -= 2) {
      if (col == 6) col -= 1;
      while (true) {
        for (let c = 0; c < 2; c += 1) {
          if (_modules[row][col - c] == null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = (data[byteIndex] >>> bitIndex & 1) == 1;
            }
            const mask = maskFunc(row, col - c);
            if (mask) {
              dark = !dark;
            }
            _modules[row][col - c] = dark;
            bitIndex -= 1;
            if (bitIndex == -1) {
              byteIndex += 1;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || _moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  };
  const createBytes = function(buffer, rsBlocks) {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata = new Array(rsBlocks.length);
    const ecdata = new Array(rsBlocks.length);
    for (let r = 0; r < rsBlocks.length; r += 1) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcdata[r].length; i += 1) {
        dcdata[r][i] = 255 & buffer.getBuffer()[i + offset];
      }
      offset += dcCount;
      const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      const rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i += 1) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
      }
    }
    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i += 1) {
      totalCodeCount += rsBlocks[i].totalCount;
    }
    const data = new Array(totalCodeCount);
    let index = 0;
    for (let i = 0; i < maxDcCount; i += 1) {
      for (let r = 0; r < rsBlocks.length; r += 1) {
        if (i < dcdata[r].length) {
          data[index] = dcdata[r][i];
          index += 1;
        }
      }
    }
    for (let i = 0; i < maxEcCount; i += 1) {
      for (let r = 0; r < rsBlocks.length; r += 1) {
        if (i < ecdata[r].length) {
          data[index] = ecdata[r][i];
          index += 1;
        }
      }
    }
    return data;
  };
  const createData = function(typeNumber2, errorCorrectionLevel2, dataList) {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber2, errorCorrectionLevel2);
    const buffer = qrBitBuffer();
    for (let i = 0; i < dataList.length; i += 1) {
      const data = dataList[i];
      buffer.put(data.getMode(), 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber2));
      data.write(buffer);
    }
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i += 1) {
      totalDataCount += rsBlocks[i].dataCount;
    }
    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw "code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")";
    }
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }
    while (buffer.getLengthInBits() % 8 != 0) {
      buffer.putBit(false);
    }
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(PAD1, 8);
    }
    return createBytes(buffer, rsBlocks);
  };
  _this.addData = function(data, mode) {
    mode = mode || "Byte";
    let newData = null;
    switch (mode) {
      case "Numeric":
        newData = qrNumber(data);
        break;
      case "Alphanumeric":
        newData = qrAlphaNum(data);
        break;
      case "Byte":
        newData = qr8BitByte(data);
        break;
      case "Kanji":
        newData = qrKanji(data);
        break;
      default:
        throw "mode:" + mode;
    }
    _dataList.push(newData);
    _dataCache = null;
  };
  _this.isDark = function(row, col) {
    if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
      throw row + "," + col;
    }
    return _modules[row][col];
  };
  _this.getModuleCount = function() {
    return _moduleCount;
  };
  _this.make = function() {
    if (_typeNumber < 1) {
      let typeNumber2 = 1;
      for (; typeNumber2 < 40; typeNumber2++) {
        const rsBlocks = QRRSBlock.getRSBlocks(typeNumber2, _errorCorrectionLevel);
        const buffer = qrBitBuffer();
        for (let i = 0; i < _dataList.length; i++) {
          const data = _dataList[i];
          buffer.put(data.getMode(), 4);
          buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber2));
          data.write(buffer);
        }
        let totalDataCount = 0;
        for (let i = 0; i < rsBlocks.length; i++) {
          totalDataCount += rsBlocks[i].dataCount;
        }
        if (buffer.getLengthInBits() <= totalDataCount * 8) {
          break;
        }
      }
      _typeNumber = typeNumber2;
    }
    makeImpl(false, getBestMaskPattern());
  };
  _this.createTableTag = function(cellSize, margin) {
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    let qrHtml = "";
    qrHtml += '<table style="';
    qrHtml += " border-width: 0px; border-style: none;";
    qrHtml += " border-collapse: collapse;";
    qrHtml += " padding: 0px; margin: " + margin + "px;";
    qrHtml += '">';
    qrHtml += "<tbody>";
    for (let r = 0; r < _this.getModuleCount(); r += 1) {
      qrHtml += "<tr>";
      for (let c = 0; c < _this.getModuleCount(); c += 1) {
        qrHtml += '<td style="';
        qrHtml += " border-width: 0px; border-style: none;";
        qrHtml += " border-collapse: collapse;";
        qrHtml += " padding: 0px; margin: 0px;";
        qrHtml += " width: " + cellSize + "px;";
        qrHtml += " height: " + cellSize + "px;";
        qrHtml += " background-color: ";
        qrHtml += _this.isDark(r, c) ? "#000000" : "#ffffff";
        qrHtml += ";";
        qrHtml += '"/>';
      }
      qrHtml += "</tr>";
    }
    qrHtml += "</tbody>";
    qrHtml += "</table>";
    return qrHtml;
  };
  _this.createSvgTag = function(cellSize, margin, alt, title) {
    let opts = {};
    if (typeof arguments[0] == "object") {
      opts = arguments[0];
      cellSize = opts.cellSize;
      margin = opts.margin;
      alt = opts.alt;
      title = opts.title;
    }
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    alt = typeof alt === "string" ? { text: alt } : alt || {};
    alt.text = alt.text || null;
    alt.id = alt.text ? alt.id || "qrcode-description" : null;
    title = typeof title === "string" ? { text: title } : title || {};
    title.text = title.text || null;
    title.id = title.text ? title.id || "qrcode-title" : null;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    let c, mc, r, mr, qrSvg = "", rect;
    rect = "l" + cellSize + ",0 0," + cellSize + " -" + cellSize + ",0 0,-" + cellSize + "z ";
    qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
    qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : "";
    qrSvg += ' viewBox="0 0 ' + size + " " + size + '" ';
    qrSvg += ' preserveAspectRatio="xMinYMin meet"';
    qrSvg += title.text || alt.text ? ' role="img" aria-labelledby="' + escapeXml([title.id, alt.id].join(" ").trim()) + '"' : "";
    qrSvg += ">";
    qrSvg += title.text ? '<title id="' + escapeXml(title.id) + '">' + escapeXml(title.text) + "</title>" : "";
    qrSvg += alt.text ? '<description id="' + escapeXml(alt.id) + '">' + escapeXml(alt.text) + "</description>" : "";
    qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
    qrSvg += '<path d="';
    for (r = 0; r < _this.getModuleCount(); r += 1) {
      mr = r * cellSize + margin;
      for (c = 0; c < _this.getModuleCount(); c += 1) {
        if (_this.isDark(r, c)) {
          mc = c * cellSize + margin;
          qrSvg += "M" + mc + "," + mr + rect;
        }
      }
    }
    qrSvg += '" stroke="transparent" fill="black"/>';
    qrSvg += "</svg>";
    return qrSvg;
  };
  _this.createDataURL = function(cellSize, margin) {
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    const min = margin;
    const max = size - margin;
    return createDataURL(size, size, function(x, y) {
      if (min <= x && x < max && min <= y && y < max) {
        const c = Math.floor((x - min) / cellSize);
        const r = Math.floor((y - min) / cellSize);
        return _this.isDark(r, c) ? 0 : 1;
      } else {
        return 1;
      }
    });
  };
  _this.createImgTag = function(cellSize, margin, alt) {
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    let img = "";
    img += "<img";
    img += ' src="';
    img += _this.createDataURL(cellSize, margin);
    img += '"';
    img += ' width="';
    img += size;
    img += '"';
    img += ' height="';
    img += size;
    img += '"';
    if (alt) {
      img += ' alt="';
      img += escapeXml(alt);
      img += '"';
    }
    img += "/>";
    return img;
  };
  const escapeXml = function(s) {
    let escaped = "";
    for (let i = 0; i < s.length; i += 1) {
      const c = s.charAt(i);
      switch (c) {
        case "<":
          escaped += "&lt;";
          break;
        case ">":
          escaped += "&gt;";
          break;
        case "&":
          escaped += "&amp;";
          break;
        case '"':
          escaped += "&quot;";
          break;
        default:
          escaped += c;
          break;
      }
    }
    return escaped;
  };
  const _createHalfASCII = function(margin) {
    const cellSize = 1;
    margin = typeof margin == "undefined" ? cellSize * 2 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    const min = margin;
    const max = size - margin;
    let y, x, r1, r2, p;
    const blocks = {
      "\u2588\u2588": "\u2588",
      "\u2588 ": "\u2580",
      " \u2588": "\u2584",
      "  ": " "
    };
    const blocksLastLineNoMargin = {
      "\u2588\u2588": "\u2580",
      "\u2588 ": "\u2580",
      " \u2588": " ",
      "  ": " "
    };
    let ascii = "";
    for (y = 0; y < size; y += 2) {
      r1 = Math.floor((y - min) / cellSize);
      r2 = Math.floor((y + 1 - min) / cellSize);
      for (x = 0; x < size; x += 1) {
        p = "\u2588";
        if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
          p = " ";
        }
        if (min <= x && x < max && min <= y + 1 && y + 1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
          p += " ";
        } else {
          p += "\u2588";
        }
        ascii += margin < 1 && y + 1 >= max ? blocksLastLineNoMargin[p] : blocks[p];
      }
      ascii += "\n";
    }
    if (size % 2 && margin > 0) {
      return ascii.substring(0, ascii.length - size - 1) + Array(size + 1).join("\u2580");
    }
    return ascii.substring(0, ascii.length - 1);
  };
  _this.createASCII = function(cellSize, margin) {
    cellSize = cellSize || 1;
    if (cellSize < 2) {
      return _createHalfASCII(margin);
    }
    cellSize -= 1;
    margin = typeof margin == "undefined" ? cellSize * 2 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    const min = margin;
    const max = size - margin;
    let y, x, r, p;
    const white = Array(cellSize + 1).join("\u2588\u2588");
    const black = Array(cellSize + 1).join("  ");
    let ascii = "";
    let line = "";
    for (y = 0; y < size; y += 1) {
      r = Math.floor((y - min) / cellSize);
      line = "";
      for (x = 0; x < size; x += 1) {
        p = 1;
        if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
          p = 0;
        }
        line += p ? white : black;
      }
      for (r = 0; r < cellSize; r += 1) {
        ascii += line + "\n";
      }
    }
    return ascii.substring(0, ascii.length - 1);
  };
  _this.renderTo2dContext = function(context, cellSize) {
    cellSize = cellSize || 2;
    const length = _this.getModuleCount();
    for (let row = 0; row < length; row++) {
      for (let col = 0; col < length; col++) {
        context.fillStyle = _this.isDark(row, col) ? "black" : "white";
        context.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  };
  return _this;
};
qrcode.stringToBytes = function(s) {
  const bytes = [];
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    bytes.push(c & 255);
  }
  return bytes;
};
qrcode.createStringToBytes = function(unicodeData, numChars) {
  const unicodeMap = (function() {
    const bin = base64DecodeInputStream(unicodeData);
    const read = function() {
      const b = bin.read();
      if (b == -1) throw "eof";
      return b;
    };
    let count = 0;
    const unicodeMap2 = {};
    while (true) {
      const b0 = bin.read();
      if (b0 == -1) break;
      const b1 = read();
      const b2 = read();
      const b3 = read();
      const k = String.fromCharCode(b0 << 8 | b1);
      const v = b2 << 8 | b3;
      unicodeMap2[k] = v;
      count += 1;
    }
    if (count != numChars) {
      throw count + " != " + numChars;
    }
    return unicodeMap2;
  })();
  const unknownChar = "?".charCodeAt(0);
  return function(s) {
    const bytes = [];
    for (let i = 0; i < s.length; i += 1) {
      const c = s.charCodeAt(i);
      if (c < 128) {
        bytes.push(c);
      } else {
        const b = unicodeMap[s.charAt(i)];
        if (typeof b == "number") {
          if ((b & 255) == b) {
            bytes.push(b);
          } else {
            bytes.push(b >>> 8);
            bytes.push(b & 255);
          }
        } else {
          bytes.push(unknownChar);
        }
      }
    }
    return bytes;
  };
};
var QRMode = {
  MODE_NUMBER: 1 << 0,
  MODE_ALPHA_NUM: 1 << 1,
  MODE_8BIT_BYTE: 1 << 2,
  MODE_KANJI: 1 << 3
};
var QRErrorCorrectionLevel = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2
};
var QRMaskPattern = {
  PATTERN000: 0,
  PATTERN001: 1,
  PATTERN010: 2,
  PATTERN011: 3,
  PATTERN100: 4,
  PATTERN101: 5,
  PATTERN110: 6,
  PATTERN111: 7
};
var QRUtil = (function() {
  const PATTERN_POSITION_TABLE = [
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
    [6, 26, 50, 74],
    [6, 30, 54, 78],
    [6, 30, 56, 82],
    [6, 30, 58, 86],
    [6, 34, 62, 90],
    [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110],
    [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122],
    [6, 30, 54, 78, 102, 126],
    [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134],
    [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170]
  ];
  const G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
  const G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
  const G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
  const _this = {};
  const getBCHDigit = function(data) {
    let digit = 0;
    while (data != 0) {
      digit += 1;
      data >>>= 1;
    }
    return digit;
  };
  _this.getBCHTypeInfo = function(data) {
    let d = data << 10;
    while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
      d ^= G15 << getBCHDigit(d) - getBCHDigit(G15);
    }
    return (data << 10 | d) ^ G15_MASK;
  };
  _this.getBCHTypeNumber = function(data) {
    let d = data << 12;
    while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
      d ^= G18 << getBCHDigit(d) - getBCHDigit(G18);
    }
    return data << 12 | d;
  };
  _this.getPatternPosition = function(typeNumber) {
    return PATTERN_POSITION_TABLE[typeNumber - 1];
  };
  _this.getMaskFunction = function(maskPattern) {
    switch (maskPattern) {
      case QRMaskPattern.PATTERN000:
        return function(i, j) {
          return (i + j) % 2 == 0;
        };
      case QRMaskPattern.PATTERN001:
        return function(i, j) {
          return i % 2 == 0;
        };
      case QRMaskPattern.PATTERN010:
        return function(i, j) {
          return j % 3 == 0;
        };
      case QRMaskPattern.PATTERN011:
        return function(i, j) {
          return (i + j) % 3 == 0;
        };
      case QRMaskPattern.PATTERN100:
        return function(i, j) {
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
        };
      case QRMaskPattern.PATTERN101:
        return function(i, j) {
          return i * j % 2 + i * j % 3 == 0;
        };
      case QRMaskPattern.PATTERN110:
        return function(i, j) {
          return (i * j % 2 + i * j % 3) % 2 == 0;
        };
      case QRMaskPattern.PATTERN111:
        return function(i, j) {
          return (i * j % 3 + (i + j) % 2) % 2 == 0;
        };
      default:
        throw "bad maskPattern:" + maskPattern;
    }
  };
  _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
    let a = qrPolynomial([1], 0);
    for (let i = 0; i < errorCorrectLength; i += 1) {
      a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  };
  _this.getLengthInBits = function(mode, type) {
    if (1 <= type && type < 10) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 10;
        case QRMode.MODE_ALPHA_NUM:
          return 9;
        case QRMode.MODE_8BIT_BYTE:
          return 8;
        case QRMode.MODE_KANJI:
          return 8;
        default:
          throw "mode:" + mode;
      }
    } else if (type < 27) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 12;
        case QRMode.MODE_ALPHA_NUM:
          return 11;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 10;
        default:
          throw "mode:" + mode;
      }
    } else if (type < 41) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 14;
        case QRMode.MODE_ALPHA_NUM:
          return 13;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 12;
        default:
          throw "mode:" + mode;
      }
    } else {
      throw "type:" + type;
    }
  };
  _this.getLostPoint = function(qrcode2) {
    const moduleCount = qrcode2.getModuleCount();
    let lostPoint = 0;
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        let sameCount = 0;
        const dark = qrcode2.isDark(row, col);
        for (let r = -1; r <= 1; r += 1) {
          if (row + r < 0 || moduleCount <= row + r) {
            continue;
          }
          for (let c = -1; c <= 1; c += 1) {
            if (col + c < 0 || moduleCount <= col + c) {
              continue;
            }
            if (r == 0 && c == 0) {
              continue;
            }
            if (dark == qrcode2.isDark(row + r, col + c)) {
              sameCount += 1;
            }
          }
        }
        if (sameCount > 5) {
          lostPoint += 3 + sameCount - 5;
        }
      }
    }
    ;
    for (let row = 0; row < moduleCount - 1; row += 1) {
      for (let col = 0; col < moduleCount - 1; col += 1) {
        let count = 0;
        if (qrcode2.isDark(row, col)) count += 1;
        if (qrcode2.isDark(row + 1, col)) count += 1;
        if (qrcode2.isDark(row, col + 1)) count += 1;
        if (qrcode2.isDark(row + 1, col + 1)) count += 1;
        if (count == 0 || count == 4) {
          lostPoint += 3;
        }
      }
    }
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount - 6; col += 1) {
        if (qrcode2.isDark(row, col) && !qrcode2.isDark(row, col + 1) && qrcode2.isDark(row, col + 2) && qrcode2.isDark(row, col + 3) && qrcode2.isDark(row, col + 4) && !qrcode2.isDark(row, col + 5) && qrcode2.isDark(row, col + 6)) {
          lostPoint += 40;
        }
      }
    }
    for (let col = 0; col < moduleCount; col += 1) {
      for (let row = 0; row < moduleCount - 6; row += 1) {
        if (qrcode2.isDark(row, col) && !qrcode2.isDark(row + 1, col) && qrcode2.isDark(row + 2, col) && qrcode2.isDark(row + 3, col) && qrcode2.isDark(row + 4, col) && !qrcode2.isDark(row + 5, col) && qrcode2.isDark(row + 6, col)) {
          lostPoint += 40;
        }
      }
    }
    let darkCount = 0;
    for (let col = 0; col < moduleCount; col += 1) {
      for (let row = 0; row < moduleCount; row += 1) {
        if (qrcode2.isDark(row, col)) {
          darkCount += 1;
        }
      }
    }
    const ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;
    return lostPoint;
  };
  return _this;
})();
var QRMath = (function() {
  const EXP_TABLE = new Array(256);
  const LOG_TABLE = new Array(256);
  for (let i = 0; i < 8; i += 1) {
    EXP_TABLE[i] = 1 << i;
  }
  for (let i = 8; i < 256; i += 1) {
    EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
  }
  for (let i = 0; i < 255; i += 1) {
    LOG_TABLE[EXP_TABLE[i]] = i;
  }
  const _this = {};
  _this.glog = function(n) {
    if (n < 1) {
      throw "glog(" + n + ")";
    }
    return LOG_TABLE[n];
  };
  _this.gexp = function(n) {
    while (n < 0) {
      n += 255;
    }
    while (n >= 256) {
      n -= 255;
    }
    return EXP_TABLE[n];
  };
  return _this;
})();
var qrPolynomial = function(num, shift) {
  if (typeof num.length == "undefined") {
    throw num.length + "/" + shift;
  }
  const _num = (function() {
    let offset = 0;
    while (offset < num.length && num[offset] == 0) {
      offset += 1;
    }
    const _num2 = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i += 1) {
      _num2[i] = num[i + offset];
    }
    return _num2;
  })();
  const _this = {};
  _this.getAt = function(index) {
    return _num[index];
  };
  _this.getLength = function() {
    return _num.length;
  };
  _this.multiply = function(e) {
    const num2 = new Array(_this.getLength() + e.getLength() - 1);
    for (let i = 0; i < _this.getLength(); i += 1) {
      for (let j = 0; j < e.getLength(); j += 1) {
        num2[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i)) + QRMath.glog(e.getAt(j)));
      }
    }
    return qrPolynomial(num2, 0);
  };
  _this.mod = function(e) {
    if (_this.getLength() - e.getLength() < 0) {
      return _this;
    }
    const ratio = QRMath.glog(_this.getAt(0)) - QRMath.glog(e.getAt(0));
    const num2 = new Array(_this.getLength());
    for (let i = 0; i < _this.getLength(); i += 1) {
      num2[i] = _this.getAt(i);
    }
    for (let i = 0; i < e.getLength(); i += 1) {
      num2[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
    }
    return qrPolynomial(num2, 0).mod(e);
  };
  return _this;
};
var QRRSBlock = (function() {
  const RS_BLOCK_TABLE = [
    // L
    // M
    // Q
    // H
    // 1
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],
    // 2
    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],
    // 3
    [1, 70, 55],
    [1, 70, 44],
    [2, 35, 17],
    [2, 35, 13],
    // 4
    [1, 100, 80],
    [2, 50, 32],
    [2, 50, 24],
    [4, 25, 9],
    // 5
    [1, 134, 108],
    [2, 67, 43],
    [2, 33, 15, 2, 34, 16],
    [2, 33, 11, 2, 34, 12],
    // 6
    [2, 86, 68],
    [4, 43, 27],
    [4, 43, 19],
    [4, 43, 15],
    // 7
    [2, 98, 78],
    [4, 49, 31],
    [2, 32, 14, 4, 33, 15],
    [4, 39, 13, 1, 40, 14],
    // 8
    [2, 121, 97],
    [2, 60, 38, 2, 61, 39],
    [4, 40, 18, 2, 41, 19],
    [4, 40, 14, 2, 41, 15],
    // 9
    [2, 146, 116],
    [3, 58, 36, 2, 59, 37],
    [4, 36, 16, 4, 37, 17],
    [4, 36, 12, 4, 37, 13],
    // 10
    [2, 86, 68, 2, 87, 69],
    [4, 69, 43, 1, 70, 44],
    [6, 43, 19, 2, 44, 20],
    [6, 43, 15, 2, 44, 16],
    // 11
    [4, 101, 81],
    [1, 80, 50, 4, 81, 51],
    [4, 50, 22, 4, 51, 23],
    [3, 36, 12, 8, 37, 13],
    // 12
    [2, 116, 92, 2, 117, 93],
    [6, 58, 36, 2, 59, 37],
    [4, 46, 20, 6, 47, 21],
    [7, 42, 14, 4, 43, 15],
    // 13
    [4, 133, 107],
    [8, 59, 37, 1, 60, 38],
    [8, 44, 20, 4, 45, 21],
    [12, 33, 11, 4, 34, 12],
    // 14
    [3, 145, 115, 1, 146, 116],
    [4, 64, 40, 5, 65, 41],
    [11, 36, 16, 5, 37, 17],
    [11, 36, 12, 5, 37, 13],
    // 15
    [5, 109, 87, 1, 110, 88],
    [5, 65, 41, 5, 66, 42],
    [5, 54, 24, 7, 55, 25],
    [11, 36, 12, 7, 37, 13],
    // 16
    [5, 122, 98, 1, 123, 99],
    [7, 73, 45, 3, 74, 46],
    [15, 43, 19, 2, 44, 20],
    [3, 45, 15, 13, 46, 16],
    // 17
    [1, 135, 107, 5, 136, 108],
    [10, 74, 46, 1, 75, 47],
    [1, 50, 22, 15, 51, 23],
    [2, 42, 14, 17, 43, 15],
    // 18
    [5, 150, 120, 1, 151, 121],
    [9, 69, 43, 4, 70, 44],
    [17, 50, 22, 1, 51, 23],
    [2, 42, 14, 19, 43, 15],
    // 19
    [3, 141, 113, 4, 142, 114],
    [3, 70, 44, 11, 71, 45],
    [17, 47, 21, 4, 48, 22],
    [9, 39, 13, 16, 40, 14],
    // 20
    [3, 135, 107, 5, 136, 108],
    [3, 67, 41, 13, 68, 42],
    [15, 54, 24, 5, 55, 25],
    [15, 43, 15, 10, 44, 16],
    // 21
    [4, 144, 116, 4, 145, 117],
    [17, 68, 42],
    [17, 50, 22, 6, 51, 23],
    [19, 46, 16, 6, 47, 17],
    // 22
    [2, 139, 111, 7, 140, 112],
    [17, 74, 46],
    [7, 54, 24, 16, 55, 25],
    [34, 37, 13],
    // 23
    [4, 151, 121, 5, 152, 122],
    [4, 75, 47, 14, 76, 48],
    [11, 54, 24, 14, 55, 25],
    [16, 45, 15, 14, 46, 16],
    // 24
    [6, 147, 117, 4, 148, 118],
    [6, 73, 45, 14, 74, 46],
    [11, 54, 24, 16, 55, 25],
    [30, 46, 16, 2, 47, 17],
    // 25
    [8, 132, 106, 4, 133, 107],
    [8, 75, 47, 13, 76, 48],
    [7, 54, 24, 22, 55, 25],
    [22, 45, 15, 13, 46, 16],
    // 26
    [10, 142, 114, 2, 143, 115],
    [19, 74, 46, 4, 75, 47],
    [28, 50, 22, 6, 51, 23],
    [33, 46, 16, 4, 47, 17],
    // 27
    [8, 152, 122, 4, 153, 123],
    [22, 73, 45, 3, 74, 46],
    [8, 53, 23, 26, 54, 24],
    [12, 45, 15, 28, 46, 16],
    // 28
    [3, 147, 117, 10, 148, 118],
    [3, 73, 45, 23, 74, 46],
    [4, 54, 24, 31, 55, 25],
    [11, 45, 15, 31, 46, 16],
    // 29
    [7, 146, 116, 7, 147, 117],
    [21, 73, 45, 7, 74, 46],
    [1, 53, 23, 37, 54, 24],
    [19, 45, 15, 26, 46, 16],
    // 30
    [5, 145, 115, 10, 146, 116],
    [19, 75, 47, 10, 76, 48],
    [15, 54, 24, 25, 55, 25],
    [23, 45, 15, 25, 46, 16],
    // 31
    [13, 145, 115, 3, 146, 116],
    [2, 74, 46, 29, 75, 47],
    [42, 54, 24, 1, 55, 25],
    [23, 45, 15, 28, 46, 16],
    // 32
    [17, 145, 115],
    [10, 74, 46, 23, 75, 47],
    [10, 54, 24, 35, 55, 25],
    [19, 45, 15, 35, 46, 16],
    // 33
    [17, 145, 115, 1, 146, 116],
    [14, 74, 46, 21, 75, 47],
    [29, 54, 24, 19, 55, 25],
    [11, 45, 15, 46, 46, 16],
    // 34
    [13, 145, 115, 6, 146, 116],
    [14, 74, 46, 23, 75, 47],
    [44, 54, 24, 7, 55, 25],
    [59, 46, 16, 1, 47, 17],
    // 35
    [12, 151, 121, 7, 152, 122],
    [12, 75, 47, 26, 76, 48],
    [39, 54, 24, 14, 55, 25],
    [22, 45, 15, 41, 46, 16],
    // 36
    [6, 151, 121, 14, 152, 122],
    [6, 75, 47, 34, 76, 48],
    [46, 54, 24, 10, 55, 25],
    [2, 45, 15, 64, 46, 16],
    // 37
    [17, 152, 122, 4, 153, 123],
    [29, 74, 46, 14, 75, 47],
    [49, 54, 24, 10, 55, 25],
    [24, 45, 15, 46, 46, 16],
    // 38
    [4, 152, 122, 18, 153, 123],
    [13, 74, 46, 32, 75, 47],
    [48, 54, 24, 14, 55, 25],
    [42, 45, 15, 32, 46, 16],
    // 39
    [20, 147, 117, 4, 148, 118],
    [40, 75, 47, 7, 76, 48],
    [43, 54, 24, 22, 55, 25],
    [10, 45, 15, 67, 46, 16],
    // 40
    [19, 148, 118, 6, 149, 119],
    [18, 75, 47, 31, 76, 48],
    [34, 54, 24, 34, 55, 25],
    [20, 45, 15, 61, 46, 16]
  ];
  const qrRSBlock = function(totalCount, dataCount) {
    const _this2 = {};
    _this2.totalCount = totalCount;
    _this2.dataCount = dataCount;
    return _this2;
  };
  const _this = {};
  const getRsBlockTable = function(typeNumber, errorCorrectionLevel) {
    switch (errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default:
        return void 0;
    }
  };
  _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {
    const rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);
    if (typeof rsBlock == "undefined") {
      throw "bad rs block @ typeNumber:" + typeNumber + "/errorCorrectionLevel:" + errorCorrectionLevel;
    }
    const length = rsBlock.length / 3;
    const list = [];
    for (let i = 0; i < length; i += 1) {
      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j += 1) {
        list.push(qrRSBlock(totalCount, dataCount));
      }
    }
    return list;
  };
  return _this;
})();
var qrBitBuffer = function() {
  const _buffer = [];
  let _length = 0;
  const _this = {};
  _this.getBuffer = function() {
    return _buffer;
  };
  _this.getAt = function(index) {
    const bufIndex = Math.floor(index / 8);
    return (_buffer[bufIndex] >>> 7 - index % 8 & 1) == 1;
  };
  _this.put = function(num, length) {
    for (let i = 0; i < length; i += 1) {
      _this.putBit((num >>> length - i - 1 & 1) == 1);
    }
  };
  _this.getLengthInBits = function() {
    return _length;
  };
  _this.putBit = function(bit) {
    const bufIndex = Math.floor(_length / 8);
    if (_buffer.length <= bufIndex) {
      _buffer.push(0);
    }
    if (bit) {
      _buffer[bufIndex] |= 128 >>> _length % 8;
    }
    _length += 1;
  };
  return _this;
};
var qrNumber = function(data) {
  const _mode = QRMode.MODE_NUMBER;
  const _data = data;
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return _data.length;
  };
  _this.write = function(buffer) {
    const data2 = _data;
    let i = 0;
    while (i + 2 < data2.length) {
      buffer.put(strToNum(data2.substring(i, i + 3)), 10);
      i += 3;
    }
    if (i < data2.length) {
      if (data2.length - i == 1) {
        buffer.put(strToNum(data2.substring(i, i + 1)), 4);
      } else if (data2.length - i == 2) {
        buffer.put(strToNum(data2.substring(i, i + 2)), 7);
      }
    }
  };
  const strToNum = function(s) {
    let num = 0;
    for (let i = 0; i < s.length; i += 1) {
      num = num * 10 + chatToNum(s.charAt(i));
    }
    return num;
  };
  const chatToNum = function(c) {
    if ("0" <= c && c <= "9") {
      return c.charCodeAt(0) - "0".charCodeAt(0);
    }
    throw "illegal char :" + c;
  };
  return _this;
};
var qrAlphaNum = function(data) {
  const _mode = QRMode.MODE_ALPHA_NUM;
  const _data = data;
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return _data.length;
  };
  _this.write = function(buffer) {
    const s = _data;
    let i = 0;
    while (i + 1 < s.length) {
      buffer.put(
        getCode(s.charAt(i)) * 45 + getCode(s.charAt(i + 1)),
        11
      );
      i += 2;
    }
    if (i < s.length) {
      buffer.put(getCode(s.charAt(i)), 6);
    }
  };
  const getCode = function(c) {
    if ("0" <= c && c <= "9") {
      return c.charCodeAt(0) - "0".charCodeAt(0);
    } else if ("A" <= c && c <= "Z") {
      return c.charCodeAt(0) - "A".charCodeAt(0) + 10;
    } else {
      switch (c) {
        case " ":
          return 36;
        case "$":
          return 37;
        case "%":
          return 38;
        case "*":
          return 39;
        case "+":
          return 40;
        case "-":
          return 41;
        case ".":
          return 42;
        case "/":
          return 43;
        case ":":
          return 44;
        default:
          throw "illegal char :" + c;
      }
    }
  };
  return _this;
};
var qr8BitByte = function(data) {
  const _mode = QRMode.MODE_8BIT_BYTE;
  const _data = data;
  const _bytes = qrcode.stringToBytes(data);
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return _bytes.length;
  };
  _this.write = function(buffer) {
    for (let i = 0; i < _bytes.length; i += 1) {
      buffer.put(_bytes[i], 8);
    }
  };
  return _this;
};
var qrKanji = function(data) {
  const _mode = QRMode.MODE_KANJI;
  const _data = data;
  const stringToBytes2 = qrcode.stringToBytes;
  !(function(c, code) {
    const test = stringToBytes2(c);
    if (test.length != 2 || (test[0] << 8 | test[1]) != code) {
      throw "sjis not supported.";
    }
  })("\u53CB", 38726);
  const _bytes = stringToBytes2(data);
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return ~~(_bytes.length / 2);
  };
  _this.write = function(buffer) {
    const data2 = _bytes;
    let i = 0;
    while (i + 1 < data2.length) {
      let c = (255 & data2[i]) << 8 | 255 & data2[i + 1];
      if (33088 <= c && c <= 40956) {
        c -= 33088;
      } else if (57408 <= c && c <= 60351) {
        c -= 49472;
      } else {
        throw "illegal char at " + (i + 1) + "/" + c;
      }
      c = (c >>> 8 & 255) * 192 + (c & 255);
      buffer.put(c, 13);
      i += 2;
    }
    if (i < data2.length) {
      throw "illegal char at " + (i + 1);
    }
  };
  return _this;
};
var byteArrayOutputStream = function() {
  const _bytes = [];
  const _this = {};
  _this.writeByte = function(b) {
    _bytes.push(b & 255);
  };
  _this.writeShort = function(i) {
    _this.writeByte(i);
    _this.writeByte(i >>> 8);
  };
  _this.writeBytes = function(b, off, len) {
    off = off || 0;
    len = len || b.length;
    for (let i = 0; i < len; i += 1) {
      _this.writeByte(b[i + off]);
    }
  };
  _this.writeString = function(s) {
    for (let i = 0; i < s.length; i += 1) {
      _this.writeByte(s.charCodeAt(i));
    }
  };
  _this.toByteArray = function() {
    return _bytes;
  };
  _this.toString = function() {
    let s = "";
    s += "[";
    for (let i = 0; i < _bytes.length; i += 1) {
      if (i > 0) {
        s += ",";
      }
      s += _bytes[i];
    }
    s += "]";
    return s;
  };
  return _this;
};
var base64EncodeOutputStream = function() {
  let _buffer = 0;
  let _buflen = 0;
  let _length = 0;
  let _base64 = "";
  const _this = {};
  const writeEncoded = function(b) {
    _base64 += String.fromCharCode(encode(b & 63));
  };
  const encode = function(n) {
    if (n < 0) {
      throw "n:" + n;
    } else if (n < 26) {
      return 65 + n;
    } else if (n < 52) {
      return 97 + (n - 26);
    } else if (n < 62) {
      return 48 + (n - 52);
    } else if (n == 62) {
      return 43;
    } else if (n == 63) {
      return 47;
    } else {
      throw "n:" + n;
    }
  };
  _this.writeByte = function(n) {
    _buffer = _buffer << 8 | n & 255;
    _buflen += 8;
    _length += 1;
    while (_buflen >= 6) {
      writeEncoded(_buffer >>> _buflen - 6);
      _buflen -= 6;
    }
  };
  _this.flush = function() {
    if (_buflen > 0) {
      writeEncoded(_buffer << 6 - _buflen);
      _buffer = 0;
      _buflen = 0;
    }
    if (_length % 3 != 0) {
      const padlen = 3 - _length % 3;
      for (let i = 0; i < padlen; i += 1) {
        _base64 += "=";
      }
    }
  };
  _this.toString = function() {
    return _base64;
  };
  return _this;
};
var base64DecodeInputStream = function(str) {
  const _str = str;
  let _pos = 0;
  let _buffer = 0;
  let _buflen = 0;
  const _this = {};
  _this.read = function() {
    while (_buflen < 8) {
      if (_pos >= _str.length) {
        if (_buflen == 0) {
          return -1;
        }
        throw "unexpected end of file./" + _buflen;
      }
      const c = _str.charAt(_pos);
      _pos += 1;
      if (c == "=") {
        _buflen = 0;
        return -1;
      } else if (c.match(/^\s$/)) {
        continue;
      }
      _buffer = _buffer << 6 | decode(c.charCodeAt(0));
      _buflen += 6;
    }
    const n = _buffer >>> _buflen - 8 & 255;
    _buflen -= 8;
    return n;
  };
  const decode = function(c) {
    if (65 <= c && c <= 90) {
      return c - 65;
    } else if (97 <= c && c <= 122) {
      return c - 97 + 26;
    } else if (48 <= c && c <= 57) {
      return c - 48 + 52;
    } else if (c == 43) {
      return 62;
    } else if (c == 47) {
      return 63;
    } else {
      throw "c:" + c;
    }
  };
  return _this;
};
var gifImage = function(width, height) {
  const _width = width;
  const _height = height;
  const _data = new Array(width * height);
  const _this = {};
  _this.setPixel = function(x, y, pixel) {
    _data[y * _width + x] = pixel;
  };
  _this.write = function(out) {
    out.writeString("GIF87a");
    out.writeShort(_width);
    out.writeShort(_height);
    out.writeByte(128);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(255);
    out.writeByte(255);
    out.writeByte(255);
    out.writeString(",");
    out.writeShort(0);
    out.writeShort(0);
    out.writeShort(_width);
    out.writeShort(_height);
    out.writeByte(0);
    const lzwMinCodeSize = 2;
    const raster = getLZWRaster(lzwMinCodeSize);
    out.writeByte(lzwMinCodeSize);
    let offset = 0;
    while (raster.length - offset > 255) {
      out.writeByte(255);
      out.writeBytes(raster, offset, 255);
      offset += 255;
    }
    out.writeByte(raster.length - offset);
    out.writeBytes(raster, offset, raster.length - offset);
    out.writeByte(0);
    out.writeString(";");
  };
  const bitOutputStream = function(out) {
    const _out = out;
    let _bitLength = 0;
    let _bitBuffer = 0;
    const _this2 = {};
    _this2.write = function(data, length) {
      if (data >>> length != 0) {
        throw "length over";
      }
      while (_bitLength + length >= 8) {
        _out.writeByte(255 & (data << _bitLength | _bitBuffer));
        length -= 8 - _bitLength;
        data >>>= 8 - _bitLength;
        _bitBuffer = 0;
        _bitLength = 0;
      }
      _bitBuffer = data << _bitLength | _bitBuffer;
      _bitLength = _bitLength + length;
    };
    _this2.flush = function() {
      if (_bitLength > 0) {
        _out.writeByte(_bitBuffer);
      }
    };
    return _this2;
  };
  const getLZWRaster = function(lzwMinCodeSize) {
    const clearCode = 1 << lzwMinCodeSize;
    const endCode = (1 << lzwMinCodeSize) + 1;
    let bitLength = lzwMinCodeSize + 1;
    const table = lzwTable();
    for (let i = 0; i < clearCode; i += 1) {
      table.add(String.fromCharCode(i));
    }
    table.add(String.fromCharCode(clearCode));
    table.add(String.fromCharCode(endCode));
    const byteOut = byteArrayOutputStream();
    const bitOut = bitOutputStream(byteOut);
    bitOut.write(clearCode, bitLength);
    let dataIndex = 0;
    let s = String.fromCharCode(_data[dataIndex]);
    dataIndex += 1;
    while (dataIndex < _data.length) {
      const c = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;
      if (table.contains(s + c)) {
        s = s + c;
      } else {
        bitOut.write(table.indexOf(s), bitLength);
        if (table.size() < 4095) {
          if (table.size() == 1 << bitLength) {
            bitLength += 1;
          }
          table.add(s + c);
        }
        s = c;
      }
    }
    bitOut.write(table.indexOf(s), bitLength);
    bitOut.write(endCode, bitLength);
    bitOut.flush();
    return byteOut.toByteArray();
  };
  const lzwTable = function() {
    const _map = {};
    let _size = 0;
    const _this2 = {};
    _this2.add = function(key) {
      if (_this2.contains(key)) {
        throw "dup key:" + key;
      }
      _map[key] = _size;
      _size += 1;
    };
    _this2.size = function() {
      return _size;
    };
    _this2.indexOf = function(key) {
      return _map[key];
    };
    _this2.contains = function(key) {
      return typeof _map[key] != "undefined";
    };
    return _this2;
  };
  return _this;
};
var createDataURL = function(width, height, getPixel) {
  const gif = gifImage(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      gif.setPixel(x, y, getPixel(x, y));
    }
  }
  const b = byteArrayOutputStream();
  gif.write(b);
  const base64 = base64EncodeOutputStream();
  const bytes = b.toByteArray();
  for (let i = 0; i < bytes.length; i += 1) {
    base64.writeByte(bytes[i]);
  }
  base64.flush();
  return "data:image/gif;base64," + base64;
};
var qrcode_default = qrcode;
var stringToBytes = qrcode.stringToBytes;

// public/js/interno-qr-render.mjs
var QR_PRINT_TARGET_PX = 2048;
var QR_PRINT_MARGIN_MODULES = 4;
function resolveQrCanvasOpts(text, cfg = {}) {
  const targetPx = cfg.targetPx ?? QR_PRINT_TARGET_PX;
  const marginModules = cfg.marginModules ?? QR_PRINT_MARGIN_MODULES;
  const qr = qrcode_default(0, "M");
  qr.addData(String(text || ""));
  qr.make();
  const n = qr.getModuleCount();
  const totalModules = n + marginModules * 2;
  const cellPx = Math.max(8, Math.floor(targetPx / totalModules));
  return { cellPx, margin: marginModules * cellPx };
}
function drawInternoQrCanvas(canvas, text, opts = {}) {
  const cellPx = opts.cellPx ?? 4;
  const margin = opts.margin ?? 16;
  const qr = qrcode_default(0, "M");
  qr.addData(String(text || ""));
  qr.make();
  const n = qr.getModuleCount();
  const size = n * cellPx + margin * 2;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_context");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      if (!qr.isDark(row, col)) continue;
      ctx.fillRect(margin + col * cellPx, margin + row * cellPx, cellPx, cellPx);
    }
  }
  return canvas;
}
async function copyInternoQrImage(url, showToast) {
  const toast = typeof showToast === "function" ? showToast : (msg, kind) => {
    if (typeof window.showToast === "function") window.showToast(msg, kind);
  };
  try {
    const canvas = document.createElement("canvas");
    drawInternoQrCanvas(canvas, url, resolveQrCanvasOpts(url));
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("blob_failed")), "image/png");
    });
    if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast("QR copiado en alta resoluci\xF3n \u2014 listo para imprimir", "success");
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    await navigator.clipboard.writeText(dataUrl);
    toast("QR copiado como imagen (data URL)", "info");
  } catch {
    toast("No se pudo copiar el QR", "error");
  }
}

// public/js/features/cloud-sync/panel-mobile-invite.mjs
function mountCloudMobileQrPreview(host, url) {
  if (!host || !url) return;
  host.innerHTML = "";
  const canvas = document.createElement("canvas");
  canvas.className = "cloud-mobile-invite-qr-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "C\xF3digo QR del enlace m\xF3vil Nube");
  try {
    drawInternoQrCanvas(canvas, url, { cellPx: 2, margin: 10 });
    host.appendChild(canvas);
    host.removeAttribute("aria-hidden");
  } catch {
    host.setAttribute("aria-hidden", "true");
  }
}
async function copyCloudMobileLinkFromUi(deps, url) {
  const copied = await copyToClipboardSafe(url);
  if (copied) {
    deps.runtime().showToast(
      "Enlace m\xF3vil (Nube) copiado. \xC1brelo en Safari, espera a sincronizar, luego A\xF1adir a pantalla de inicio.",
      "success"
    );
    return true;
  }
  deps.runtime().showToast("No se pudo copiar al portapapeles.", "error");
  return false;
}
function resolveCloudMobileInviteUrl() {
  const auth = getCloudSyncToken();
  if (!auth) return "";
  let user = String(
    clinicalSessionContext.user?.username || clinicalSessionContext.user?.user_id || ""
  ).trim().replace(/^@+/, "");
  if (!user) {
    try {
      const raw = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
      user = String(raw.clinicalUsername || "").trim().replace(/^@+/, "");
    } catch {
    }
  }
  return buildCloudMobileJoinUrl({
    baseUrl: getCloudSyncUrl(),
    auth,
    user: user || void 0
  });
}
function fillCloudMobileInviteBody(body, deps, url) {
  const hint = document.createElement("p");
  hint.className = "lan-connect-card-hint";
  hint.style.margin = "0 0 8px";
  hint.innerHTML = "Enlace <strong>permanente</strong> ligado a <strong>tu @usuario</strong>. No cambia con la rotaci\xF3n \u2014 el iPad entra a tu sala nube activa. \xC1brelo en Safari \u2192 <strong>A\xF1adir a pantalla de inicio</strong>.";
  body.appendChild(hint);
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "btn-lan-primary";
  copyBtn.style.width = "100%";
  copyBtn.textContent = "Copiar enlace m\xF3vil (Nube)";
  copyBtn.onclick = function() {
    void copyCloudMobileLinkFromUi(deps, url);
  };
  body.appendChild(copyBtn);
  const qrRow = document.createElement("div");
  qrRow.className = "lan-connect-actions-row";
  qrRow.style.marginTop = "8px";
  const copyQrBtn = document.createElement("button");
  copyQrBtn.type = "button";
  copyQrBtn.className = "btn-lan-secondary";
  copyQrBtn.style.flex = "1";
  copyQrBtn.textContent = "Copiar QR";
  copyQrBtn.onclick = function() {
    void copyInternoQrImage(url, function(msg, kind) {
      deps.runtime().showToast(msg, kind);
    });
  };
  qrRow.appendChild(copyQrBtn);
  body.appendChild(qrRow);
  const qrHost = document.createElement("div");
  qrHost.className = "cloud-mobile-invite-qr-host";
  qrHost.style.marginTop = "8px";
  qrHost.style.display = "flex";
  qrHost.style.justifyContent = "center";
  mountCloudMobileQrPreview(qrHost, url);
  body.appendChild(qrHost);
}
function appendCloudMobileInviteCard(deps, root) {
  if (!root) return;
  const url = resolveCloudMobileInviteUrl();
  if (!url) return;
  fillCloudMobileInviteBody(root, deps, url);
}
function mountCloudMobileInviteInHost(host, deps) {
  if (!host) return;
  host.replaceChildren();
  const panel = document.createElement("div");
  panel.className = "cloud-mobile-invite-panel lan-invite-collapsible--mobile lan-invite-collapsible--cloud";
  appendCloudMobileInviteCard(deps, panel);
  if (panel.childElementCount) host.appendChild(panel);
}

// public/js/features/cloud-sync/cloud-nube-fix-guides.mjs
var FIX_GUIDES = {
  no_internet: {
    id: "no_internet",
    title: "Sin internet",
    summary: "R+ guarda los cambios en tu Mac hasta recuperar red.",
    steps: [
      "Revisa Wi\u2011Fi o cable en la Mac de guardia.",
      "Si usas VPN hospitalaria, confirma que est\xE1 conectada.",
      "Cuando vuelva la red, abre Diagn\xF3stico Nube y toca Forzar sync."
    ]
  },
  cloud_not_active: {
    id: "cloud_not_active",
    title: "Nube no activa",
    summary: "Esta guardia no est\xE1 usando sincronizaci\xF3n con Nube.",
    steps: [
      "Confirma en Mi rotaci\xF3n que la sala es una sala Nube (no solo local).",
      "Si acabas de cambiar de guardia, completa la configuraci\xF3n de rotaci\xF3n.",
      "Vuelve a Conexi\xF3n y verifica que el chip de Nube no diga offline."
    ]
  },
  no_session: {
    id: "no_session",
    title: "Sin sesi\xF3n en Nube",
    summary: "Hace falta iniciar sesi\xF3n para sincronizar con la sala.",
    steps: [
      "Ve a Conexi\xF3n \u2192 inicia sesi\xF3n con tu usuario Nube.",
      "Si no tienes cuenta, reg\xEDstrate o pide acceso al admin de la sala.",
      "Tras entrar, confirma que ves tu nombre y la sala en Conexi\xF3n."
    ]
  },
  no_room: {
    id: "no_room",
    title: "Sin sala configurada",
    summary: "R+ necesita saber en qu\xE9 sala de guardia sincronizar.",
    steps: [
      "Abre Conexi\xF3n y selecciona o crea la sala del turno.",
      "En Mi rotaci\xF3n, confirma equipo y sala asignados.",
      "Vuelve a Diagn\xF3stico Nube y revisa que la cadena muestre tu sala en verde."
    ]
  },
  bridge_not_configured: {
    id: "bridge_not_configured",
    title: "Sync local no enlazado",
    summary: "Los cambios cl\xEDnicos no est\xE1n llegando al motor de Nube.",
    steps: [
      "Cierra y vuelve a abrir R+ (o reinicia la app).",
      "Abre Conexi\xF3n y espera 10\u201315 s tras ver tu sala.",
      "Si persiste, cierra sesi\xF3n en Conexi\xF3n y vuelve a entrar."
    ]
  },
  sync_not_active: {
    id: "sync_not_active",
    title: "Sync no est\xE1 activo",
    summary: "Tienes sesi\xF3n y sala, pero el motor de sync no arranc\xF3.",
    steps: [
      "En Conexi\xF3n, confirma que ves la sala y el chip de estado de Nube.",
      "Vuelve aqu\xED y toca Forzar sync.",
      "Si sigue fallando: Conexi\xF3n \u2192 Cerrar sesi\xF3n \u2192 entra de nuevo.",
      "Como \xFAltimo recurso, reinicia R+ con la Mac conectada a red."
    ]
  },
  outbox_pending: {
    id: "outbox_pending",
    title: "Cambios pendientes en cola",
    summary: "Hay mutaciones locales que a\xFAn no llegaron al servidor.",
    steps: [
      "Confirma que hay internet y sesi\xF3n activa en Conexi\xF3n.",
      "Toca Reintentar cola en este panel.",
      "Si la cola es solo labs y ya est\xE1n en Nube, usa Descartar labs en cola.",
      "Si no baja el n\xFAmero de la cola, toca Forzar sync.",
      "Revisa las alertas de error: pueden bloquear el env\xEDo."
    ]
  },
  outbox_labs_stuck: {
    id: "outbox_labs_stuck",
    title: "Labs atorados en cola",
    summary: "Los laboratorios ya parseados no deber\xEDan re-subirse si Nube ya los tiene. Puedes vaciar solo labs sin tocar censo ni signos.",
    steps: [
      "Toca Forzar sync una vez (pull actualiza el \xEDndice de labs en servidor).",
      "Si la cola sigue con labs, toca Descartar labs en cola.",
      "Los labs siguen en tu Mac; solo se descarta el env\xEDo pendiente.",
      "Labs nuevos o re-parseados con cambios reales se volver\xE1n a encolar solos."
    ]
  },
  toxic_legacy_lab_backfill: {
    id: "toxic_legacy_lab_backfill",
    title: "Labs en un solo push (R+ antiguo)",
    summary: "Un cliente est\xE1 intentando enviar muchos labs en un solo lote (`cloud-lab-backfill`). Eso satura el servidor y bloquea la sala.",
    steps: [
      "Actualiza R+ en esta Mac (versi\xF3n 8.0.8+ con fix de labs por paciente).",
      "Reinicia R+ y abre Diagn\xF3stico Nube \u2192 Reintentar cola (divide el lote).",
      "Si otro Mac o iPad en la misma sala usa R+ viejo, actual\xEDzalo tambi\xE9n.",
      "Si los labs ya est\xE1n en Nube: Descartar labs en cola.",
      "Copia el informe t\xE9cnico si soporte debe revisar qui\xE9n empuja el lote."
    ]
  },
  toxic_outbox_chunk: {
    id: "toxic_outbox_chunk",
    title: "Lote demasiado grande en cola",
    summary: "Hay un push local que excede el tama\xF1o que el servidor acepta (~200 KB por lote).",
    steps: [
      "Revisa \xABLotes pesados en cola\xBB en este panel: anota el path m\xE1s grande.",
      "Toca Reintentar cola (R+ actual divide o recorta el lote).",
      "Si es solo labs y ya est\xE1n en Nube: Descartar labs en cola.",
      "Si el path es un lab con PDF o texto SOME crudo, re-parsea localmente sin re-subir el blob.",
      "Si la cola se vac\xEDa pero siguen 503, otro dispositivo en la sala puede estar empujando \u2014 actualiza todos los R+ de la guardia."
    ]
  },
  sync_error: {
    id: "sync_error",
    title: "Error de sincronizaci\xF3n",
    summary: "El \xFAltimo ciclo de sync report\xF3 un problema.",
    steps: [
      "Lee la alerta con el detalle del error (toca para ver pasos espec\xEDficos).",
      "Toca Forzar sync una vez.",
      "Si el error se repite, copia el informe t\xE9cnico y contacta soporte."
    ]
  },
  cloud_offline: {
    id: "cloud_offline",
    title: "Sin conexi\xF3n a Nube",
    summary: "No se puede contactar el servicio de sync en la nube.",
    steps: [
      "Revisa internet en la Mac.",
      "En Conexi\xF3n \u2192 Avanzado, confirma que la URL del servicio es correcta.",
      "Si el hospital bloquea workers.dev, avisa a soporte TI.",
      "Reintenta con Forzar sync cuando la red responda."
    ]
  },
  cycle_failed: {
    id: "cycle_failed",
    title: "Ciclo de sync fall\xF3",
    summary: "El intento autom\xE1tico de sincronizar no termin\xF3 bien.",
    steps: [
      "Toca Forzar sync en este panel.",
      "Si hay cola pendiente, usa tambi\xE9n Reintentar cola.",
      "Abre la alerta de error m\xE1s reciente para ver la causa."
    ]
  },
  ws_error: {
    id: "ws_error",
    title: "Error en canal en vivo",
    summary: "Las notificaciones instant\xE1neas fallaron; el sondeo HTTP puede seguir activo.",
    steps: [
      "Normal si la red es intermitente \u2014 espera 1\u20132 minutos.",
      "Toca Forzar sync para confirmar que pull/push responden.",
      "Si persiste, reinicia R+ o cierra sesi\xF3n y vuelve a entrar."
    ]
  },
  ws_close: {
    id: "ws_close",
    title: "Canal en vivo interrumpido",
    summary: "La conexi\xF3n WebSocket se cort\xF3; R+ reintenta y usa sondeo HTTP.",
    steps: [
      "No es grave si Cola est\xE1 vac\xEDa y Pull/Push dicen \xABahora\xBB o \xABhace X min\xBB.",
      "Evita cerrar R+ en segundo plano por largos periodos en guardia.",
      "Si el sync se detiene, toca Forzar sync."
    ]
  },
  sync_client_not_ready: {
    id: "sync_client_not_ready",
    title: "Cliente de Nube no listo",
    summary: "El enlace interno con el servidor de sync no se complet\xF3.",
    steps: [
      "Ve a Conexi\xF3n y confirma sala + equipo visibles.",
      "Espera 10 s y vuelve a Diagn\xF3stico Nube.",
      "Toca Forzar sync.",
      "Si persiste: Cerrar sesi\xF3n \u2192 volver a entrar \u2192 reiniciar R+ si hace falta."
    ]
  },
  revision_stale: {
    id: "revision_stale",
    title: "Revisi\xF3n desactualizada",
    summary: "Tu copia local qued\xF3 detr\xE1s de la sala; R+ deber\xEDa reintentar solo.",
    steps: [
      "Toca Forzar sync (hace pull y reintenta el env\xEDo).",
      "No edites el mismo paciente en dos Macs al mismo tiempo.",
      "Si se repite en bucle, cierra sesi\xF3n y vuelve a entrar."
    ]
  },
  push_failed: {
    id: "push_failed",
    title: "Env\xEDo a Nube fall\xF3",
    summary: "Un cambio local no se pudo subir al servidor.",
    steps: [
      "Toca Reintentar cola.",
      "Revisa internet y que la sesi\xF3n siga activa en Conexi\xF3n.",
      "Toca Forzar sync.",
      "Si hay c\xF3digo de error en la alerta, \xE1brela para m\xE1s detalle."
    ]
  },
  pull_failed: {
    id: "pull_failed",
    title: "Descarga desde Nube fall\xF3",
    summary: "No se pudieron traer cambios del servidor.",
    steps: [
      "Revisa internet y VPN.",
      "Toca Forzar sync.",
      "Confirma en Conexi\xF3n que la sala es la del turno actual."
    ]
  },
  invalid_token: {
    id: "invalid_token",
    title: "Sesi\xF3n expirada o inv\xE1lida",
    summary: "El token de Nube ya no es v\xE1lido.",
    steps: [
      "Conexi\xF3n \u2192 Cerrar sesi\xF3n.",
      "Vuelve a iniciar sesi\xF3n con tu usuario.",
      "Confirma sala y equipo; luego Forzar sync."
    ]
  },
  generic_sync_error: {
    id: "generic_sync_error",
    title: "Error de sincronizaci\xF3n",
    summary: "Ocurri\xF3 un error al sincronizar con Nube.",
    steps: [
      "Toca Forzar sync.",
      "Si hay cola, Reintentar cola.",
      "Cierra sesi\xF3n y vuelve a entrar si el error se repite.",
      "Copia el informe t\xE9cnico para soporte si sigue fallando."
    ]
  }
};
function getCloudNubeFixGuide(id) {
  const key = String(id || "").trim();
  return FIX_GUIDES[key] || null;
}
function resolveCloudErrorFixId(entry) {
  const code = String(entry?.code || "").trim();
  const explain = String(entry?.explain || entry?.message || "").toLowerCase();
  if (code === "revision_stale" || explain.includes("desactualizada")) return "revision_stale";
  if (code === "invalid_token" || code === "unauthorized" || code === "401" || code === "403") {
    return "invalid_token";
  }
  if (/enlace con nube|cliente nube|no está listo|no configurado/i.test(explain)) {
    return "sync_client_not_ready";
  }
  const op = String(entry?.op || "").toLowerCase();
  if (op.includes("env\xEDo") || entry?.op === "push") return "push_failed";
  if (op.includes("descarga") || entry?.op === "pull") return "pull_failed";
  if (entry?.op === "cycle") return "cycle_failed";
  return "generic_sync_error";
}
function cloudNubeFixModalMarkup(guide) {
  let stepsHtml = "";
  guide.steps.forEach(function(step) {
    stepsHtml += '<li class="cloud-nube-fix-step">' + esc(step) + "</li>";
  });
  return '<div class="' + STACKED_BACKDROP_CLASS + '" data-cloud-nube-fix-modal><div class="lab-conflict-modal cloud-nube-fix-modal material-glass ui-overlay-dialog" role="dialog" aria-modal="true" aria-labelledby="cloud-nube-fix-title"><h3 id="cloud-nube-fix-title" class="cloud-nube-fix-title">' + esc(guide.title) + '</h3><p class="cloud-nube-fix-summary">' + esc(guide.summary) + '</p><ol class="cloud-nube-fix-steps">' + stepsHtml + '</ol><div class="cloud-nube-fix-actions"><button type="button" class="cloud-sync-btn" data-cloud-nube-fix-close>Cerrar</button></div></div></div>';
}
function showCloudNubeFixModal(fixId) {
  const guide = getCloudNubeFixGuide(fixId) || getCloudNubeFixGuide("generic_sync_error");
  if (!guide) return;
  const host = document.createElement("div");
  host.innerHTML = cloudNubeFixModalMarkup(guide);
  const overlay = host.firstElementChild;
  if (!overlay || !(overlay instanceof HTMLElement)) return;
  function close() {
    overlay.remove();
  }
  overlay.addEventListener("click", function(ev) {
    if (ev.target === overlay) close();
  });
  const closeBtn = overlay.querySelector("[data-cloud-nube-fix-close]");
  if (closeBtn) closeBtn.addEventListener("click", close);
  document.body.appendChild(overlay);
  if (closeBtn && typeof closeBtn.focus === "function") closeBtn.focus();
}

// public/js/features/cloud-sync/cloud-sync-diagnostics-human.mjs
var WS_CLOSE_EXPLAIN = {
  1e3: "Cierre normal del canal en vivo.",
  1001: "El servidor o la aplicaci\xF3n cerr\xF3 el canal en vivo.",
  1006: "La conexi\xF3n en vivo se cort\xF3 sin aviso (red intermitente, pesta\xF1a en segundo plano o el servidor cerr\xF3 el socket). Se reintenta autom\xE1ticamente.",
  1008: "El servidor rechaz\xF3 la conexi\xF3n en vivo (token, sala o permisos inv\xE1lidos).",
  1011: "Error interno del servidor en el canal en vivo.",
  1012: "El servidor reinici\xF3 el canal en vivo.",
  1013: "El servidor pide reintentar el canal en vivo m\xE1s tarde."
};
var ERROR_CODE_EXPLAIN = {
  revision_stale: "La revisi\xF3n local est\xE1 desactualizada. R+ har\xE1 pull y reintentar\xE1 el env\xEDo.",
  conflict: "Conflicto de versiones con la sala. Se reintenta tras actualizar.",
  quota_exceeded: "L\xEDmite de la sala alcanzado en el servidor.",
  invalid_credentials: "Usuario o contrase\xF1a incorrectos.",
  unauthorized: "Sesi\xF3n no autorizada. Vuelve a iniciar sesi\xF3n en Conexi\xF3n.",
  invalid_token: "Token de sesi\xF3n inv\xE1lido o expirado. Cierra sesi\xF3n y vuelve a entrar.",
  auth_required: "Se requiere iniciar sesi\xF3n en Nube.",
  forbidden: "No tienes permiso para esta acci\xF3n en la sala.",
  not_member: "Tu usuario no pertenece a esta sala.",
  not_found: "Sala o recurso no encontrado en el servidor.",
  payload_too_large: "El cambio es demasiado grande para enviar.",
  push_failed: "No se pudo enviar el censo u operaci\xF3n a Nube.",
  not_implemented: "Funci\xF3n no disponible en el servidor.",
  error: "Error gen\xE9rico del servidor.",
  401: "No autorizado (401). Vuelve a iniciar sesi\xF3n.",
  403: "Acceso denegado (403). Revisa sala y permisos.",
  404: "No encontrado (404). Revisa URL del servicio y sala.",
  409: "Conflicto de versi\xF3n (409). Se reintenta tras actualizar.",
  413: "Payload demasiado grande (413).",
  500: "Error del servidor (500). Reintenta en unos minutos.",
  502: "Servidor no disponible (502).",
  503: "Servidor saturado (503)."
};
var OP_LABELS = {
  push: "Env\xEDo a Nube",
  pull: "Descarga desde Nube",
  census: "Censo",
  cycle: "Ciclo de sync",
  unknown: "Operaci\xF3n"
};
var OUTBOX_KIND_LABELS = {
  signos: "signos",
  pendientes: "pendientes",
  censo: "censo",
  eventualidades: "eventualidades",
  agenda: "agenda",
  delete: "borrados",
  patient: "paciente",
  clinicalOps: "operaciones",
  labs: "labs",
  other: "otros"
};
function parseWsClose(raw) {
  const text = String(raw || "").trim();
  if (!text) return { code: 0, reason: "" };
  try {
    const o = JSON.parse(text);
    return {
      code: Number(o?.code) || 0,
      reason: String(o?.reason || "").trim()
    };
  } catch {
    return { code: 0, reason: text };
  }
}
function explainWsCloseCode(code, reason) {
  const n = Number(code) || 0;
  const base = WS_CLOSE_EXPLAIN[n] || `C\xF3digo de cierre WebSocket ${n}.`;
  const extra = String(reason || "").trim();
  if (!extra) return base;
  return base + " Motivo: " + extra + ".";
}
function explainCloudErrorCode(code, fallbackMessage) {
  const key = String(code || "").trim();
  const fallback = humanizeTechnicalSyncMessage(String(fallbackMessage || "").trim());
  if (key && ERROR_CODE_EXPLAIN[key]) return ERROR_CODE_EXPLAIN[key];
  if (fallback) return fallback;
  if (key) return "Error: " + key + ".";
  return "Error de sincronizaci\xF3n.";
}
function humanizeCloudSyncError(entry) {
  const op = OP_LABELS[String(entry?.op || "unknown")] || String(entry?.op || "Operaci\xF3n");
  const explain = explainCloudErrorCode(entry?.code, entry?.message);
  return { op, explain, rawMessage: String(entry?.message || "").trim() };
}
function cloudDiagTransportLabel(transport) {
  if (transport === "ws") return "En vivo (WebSocket)";
  if (transport === "offline") return "Sin conexi\xF3n";
  return "Sondeo HTTP";
}
function formatCloudDiagWhen(iso, nowMs) {
  const raw = String(iso || "").trim();
  if (!raw) return "\u2014";
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return raw;
  const now = Number(nowMs) || Date.now();
  const delta = Math.max(0, now - t);
  if (delta < 45e3) return "ahora";
  if (delta < 9e4) return "hace 1 min";
  const mins = Math.floor(delta / 6e4);
  if (mins < 60) return "hace " + mins + " min";
  const hours = Math.floor(mins / 60);
  if (hours < 48) return "hace " + hours + " h";
  try {
    return new Date(t).toLocaleString("es", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return raw;
  }
}
function formatRoomLabel(snapshot, roomId) {
  if (snapshot?.name) return String(snapshot.name);
  const sala = String(snapshot?.sala || "").trim();
  const turn = String(snapshot?.turnKey || "").trim();
  if (sala) return turn ? sala + " \xB7 " + turn : sala;
  const code = String(snapshot?.code || "").trim();
  if (code) return code;
  const id = String(roomId || "").trim();
  if (id.length > 12) return id.slice(0, 8) + "\u2026";
  return id || "Sin sala";
}
function formatOutboxKinds(byKind) {
  const rows = Object.entries(byKind || {}).filter(function(pair) {
    return Number(pair[1]) > 0;
  }).map(function(pair) {
    const label = OUTBOX_KIND_LABELS[pair[0]] || pair[0];
    return Number(pair[1]) + " " + label;
  });
  return rows.join(", ");
}
function formatCloudDiagBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return String(n) + " B";
  if (n < 1024 * 1024) return String(Math.round(n / 1024)) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}
function formatToxicOutboxDetail(row) {
  const id = String(row.clientMutationId || "push");
  const total = formatCloudDiagBytes(row.totalBytes);
  let detail = "\xAB" + id + "\xBB: " + String(row.opCount || 0) + " ops, ~" + total + " total.";
  const maxPath = String(row.maxOpPath || "").trim();
  if (maxPath) {
    detail += " Mayor: " + maxPath + " (~" + formatCloudDiagBytes(row.maxOpBytes) + ").";
  }
  if (Number(row.totalBytes) > CLOUD_PUSH_WARN_BODY_BYTES) {
    detail += " L\xEDmite servidor ~" + formatCloudDiagBytes(CLOUD_PUSH_WARN_BODY_BYTES) + ".";
  }
  return detail;
}
function isSyncFailureActive(diag) {
  const status = String(diag.status || "unknown");
  return status === "error" || diag.lastCycleOk === false;
}
function isWsCloseStillActive(diag, transport, wsClose) {
  const code = Number(wsClose.code) || 0;
  if (!code || code === 1e3 || code === 1001) return false;
  if (transport === "ws") {
    return code === 1008 || code === 1011;
  }
  if (code === 1006) {
    return isSyncFailureActive(diag);
  }
  return true;
}
function isWsErrorStillActive(diag, transport) {
  if (!diag.lastWsError) return false;
  if (transport === "ws") return false;
  return isSyncFailureActive(diag) || transport === "offline" || diag.online === false;
}
function dedupeRecentErrors(rows) {
  const seen = /* @__PURE__ */ new Set();
  return rows.filter(function(row) {
    const key = row.op + "\0" + row.explain;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function buildCloudDiagnosticsHumanView(diag, nowMs) {
  const d = diag && typeof diag === "object" ? diag : {};
  const now = Number(nowMs) || Date.now();
  const status = String(d.status || "unknown");
  const transport = String(d.transport || "poll");
  const outboxCount = Number(d.outbox?.count || 0);
  const wsClose = parseWsClose(d.lastWsClose);
  const issues = [];
  const syncFailing = isSyncFailureActive(d);
  const recentErrors = syncFailing ? dedupeRecentErrors(
    (d.lastErrors || []).map(function(entry) {
      const human = humanizeCloudSyncError(entry);
      return {
        at: formatCloudDiagWhen(entry.at, now),
        op: human.op,
        explain: human.explain,
        code: String(entry.code || ""),
        fixId: resolveCloudErrorFixId({
          op: entry.op,
          code: entry.code,
          message: entry.message,
          explain: human.explain
        })
      };
    })
  ) : [];
  if (d.online === false) {
    issues.push({
      fixId: "no_internet",
      severity: "warn",
      title: "Sin internet",
      detail: "No hay conexi\xF3n de red. Los cambios se guardan localmente hasta recuperar red."
    });
  } else if (syncFailing && (recentErrors.some((row) => isCloudSyncNetworkErrorMessage(row.explain)) || isCloudSyncNetworkErrorMessage(d.detail))) {
    issues.push({
      fixId: "network_unreachable",
      severity: "error",
      title: "Sin contacto estable con Nube",
      detail: "El dispositivo reporta internet, pero las peticiones a Nube fallan (Failed to fetch). Revisa Wi\u2011Fi, VPN o firewall; recarga R+ y reintenta cuando la red sea estable.",
      hint: "El servidor de Nube puede estar bien; el problema suele ser la ruta de red del dispositivo."
    });
  }
  if (d.cloudActive === false) {
    issues.push({
      fixId: "cloud_not_active",
      severity: "info",
      title: "Nube no activa",
      detail: "La sincronizaci\xF3n con Nube est\xE1 desactivada para esta guardia."
    });
  }
  if (d.tokenPresent === false) {
    issues.push({
      fixId: "no_session",
      severity: "error",
      title: "Sin sesi\xF3n en Nube",
      detail: "Inicia sesi\xF3n en Conexi\xF3n para sincronizar."
    });
  }
  if (!String(d.roomId || "").trim()) {
    issues.push({
      fixId: "no_room",
      severity: "warn",
      title: "Sin sala configurada",
      detail: "Selecciona sala y equipo en Conexi\xF3n."
    });
  }
  if (d.bridgeConfigured === false) {
    issues.push({
      fixId: "bridge_not_configured",
      severity: "warn",
      title: "Sync local no enlazado",
      detail: "El runtime de Nube no est\xE1 conectado a los cambios cl\xEDnicos."
    });
  }
  if (d.tokenPresent && String(d.roomId || "").trim() && d.runtimeActive === false) {
    issues.push({
      fixId: "sync_not_active",
      severity: "error",
      title: "Sync no est\xE1 activo",
      detail: CLOUD_SYNC_CLIENT_NOT_READY,
      hint: "Tienes sesi\xF3n y sala, pero el motor de sync no arranc\xF3."
    });
  }
  if (outboxCount > 0) {
    const kinds = formatOutboxKinds(d.outbox?.byKind);
    issues.push({
      fixId: "outbox_pending",
      severity: "warn",
      title: outboxCount + " cambio" + (outboxCount !== 1 ? "s" : "") + " pendiente" + (outboxCount !== 1 ? "s" : ""),
      detail: kinds ? "En cola: " + kinds + ". Usa \xABReintentar cola Nube\xBB si no se env\xEDan." : "Hay mutaciones en cola. Usa \xABReintentar cola Nube\xBB si no se env\xEDan."
    });
  }
  const toxicRows = (Array.isArray(d.outbox?.entries) ? d.outbox.entries : []).filter(isToxicCloudOutboxEntry).sort(function(a, b) {
    return Number(b.totalBytes) - Number(a.totalBytes);
  });
  if (toxicRows.length > 0) {
    const worst = toxicRows[0];
    const legacyBackfill = String(worst.clientMutationId || "") === CLOUD_LAB_BACKFILL_MUTATION_ID && Number(worst.opCount) > 1;
    issues.push({
      fixId: legacyBackfill ? "toxic_legacy_lab_backfill" : "toxic_outbox_chunk",
      severity: "error",
      title: legacyBackfill ? "Labs en lote obsoleto (cliente antiguo)" : "Lote pesado bloqueando la cola",
      detail: formatToxicOutboxDetail(worst),
      hint: legacyBackfill ? "Actualiza R+ en esta Mac y en cualquier otra en la sala; luego \xABReintentar cola\xBB divide por paciente." : "\xABDescartar labs en cola\xBB si ya est\xE1n en Nube, o \xABReintentar cola\xBB tras actualizar R+."
    });
  }
  if (status === "error" && recentErrors.length === 0) {
    issues.push({
      fixId: "sync_error",
      severity: "error",
      title: "Error de sincronizaci\xF3n",
      detail: String(d.detail || "Revisa los \xFAltimos errores abajo.")
    });
  }
  if (status === "offline") {
    issues.push({
      fixId: "cloud_offline",
      severity: "warn",
      title: "Sin conexi\xF3n a Nube",
      detail: String(d.detail || "No se puede contactar el servicio de sync.")
    });
  }
  if (d.lastCycleOk === false && recentErrors.length === 0) {
    issues.push({
      fixId: "cycle_failed",
      severity: "error",
      title: "El \xFAltimo ciclo de sync fall\xF3",
      detail: "\xDAltimo intento: " + formatCloudDiagWhen(d.lastCycleAt, now) + "."
    });
  }
  if (isWsErrorStillActive(d, transport)) {
    issues.push({
      fixId: "ws_error",
      severity: "warn",
      title: "Error en canal en vivo",
      detail: String(d.lastWsError)
    });
  }
  if (isWsCloseStillActive(d, transport, wsClose)) {
    const abnormal = wsClose.code === 1006;
    const severity = wsClose.code === 1008 || wsClose.code === 1011 ? "error" : abnormal && transport === "poll" ? "info" : "warn";
    const hint = transport === "poll" ? "El sync sigue activo por sondeo HTTP cada pocos segundos." : "Se reintentar\xE1 la conexi\xF3n en vivo autom\xE1ticamente.";
    issues.push({
      fixId: "ws_close",
      severity,
      title: abnormal ? "Canal en vivo interrumpido" : "Canal en vivo cerrado",
      detail: explainWsCloseCode(wsClose.code, wsClose.reason),
      hint
    });
  }
  const facts = [
    { label: "Sincronizaci\xF3n", value: STATUS_LABELS[status] || status },
    { label: "Internet", value: d.online === false ? "Sin conexi\xF3n" : d.online ? "Conectado" : "\u2014" },
    {
      label: "Sesi\xF3n Nube",
      value: d.tokenPresent ? "Activa" : "Sin iniciar"
    },
    {
      label: "Sala",
      value: formatRoomLabel(d.roomSnapshot, String(d.roomId || ""))
    },
    {
      label: "Revisi\xF3n local",
      value: Number.isFinite(Number(d.revision)) ? String(d.revision) : "\u2014"
    },
    {
      label: "Canal activo",
      value: cloudDiagTransportLabel(transport)
    },
    {
      label: "Cola de cambios",
      value: outboxCount > 0 ? outboxCount + " pendiente" + (outboxCount !== 1 ? "s" : "") + (formatOutboxKinds(d.outbox?.byKind) ? " (" + formatOutboxKinds(d.outbox?.byKind) + ")" : "") : "Vac\xEDa"
    },
    { label: "\xDAltimo pull", value: formatCloudDiagWhen(d.lastPullAt, now) },
    { label: "\xDAltimo push", value: formatCloudDiagWhen(d.lastPushAt, now) },
    {
      label: "\xDAltima se\xF1al en vivo",
      value: d.lastWsSignalAt ? formatCloudDiagWhen(d.lastWsSignalAt, now) : "Sin se\xF1ales recientes"
    },
    {
      label: "Pacientes locales",
      value: Number.isFinite(Number(d.localPatientCount)) ? String(d.localPatientCount) : "\u2014"
    }
  ];
  const hasError = issues.some(function(item) {
    return item.severity === "error";
  }) || recentErrors.length > 0;
  const hasWarn = issues.some(function(item) {
    return item.severity === "warn";
  });
  let level = "ok";
  let headline = STATUS_LABELS.idle;
  let subline = "Los cambios locales coinciden con la sala en Nube.";
  if (status === "syncing") {
    level = "info";
    headline = STATUS_LABELS.syncing;
    subline = "Enviando o descargando cambios\u2026";
  } else if (hasError) {
    level = "error";
    headline = "Hay problemas de sincronizaci\xF3n";
    subline = "Revisa las alertas m\xE1s abajo.";
  } else if (hasWarn || status === "pending") {
    level = "warn";
    headline = status === "pending" ? STATUS_LABELS.pending : "Revisa la sincronizaci\xF3n";
    subline = issues.find(function(item) {
      return item.severity === "warn";
    })?.detail || "Hay avisos que conviene revisar.";
  } else if (status === "offline") {
    level = "warn";
    headline = STATUS_LABELS.offline;
    subline = "Sin contacto con el servicio de Nube.";
  } else if (status === "idle") {
    level = "ok";
    headline = STATUS_LABELS.idle;
    subline = transport === "ws" ? "Canal en vivo conectado; la cola est\xE1 vac\xEDa." : "Sync por sondeo HTTP; la cola est\xE1 vac\xEDa.";
  }
  const roomLabel = formatRoomLabel(d.roomSnapshot, String(d.roomId || ""));
  function activityTileStatus(iso) {
    if (!iso) return d.online === false ? "error" : "warn";
    const t = Date.parse(String(iso));
    if (!Number.isFinite(t)) return "warn";
    const delta = Math.max(0, now - t);
    if (delta < 12e4) return "ok";
    if (delta < 9e5) return "warn";
    return "warn";
  }
  let liveValue = "\u2014";
  let liveStatus = "neutral";
  let liveHint = "";
  if (transport === "offline" || d.online === false) {
    liveValue = "Sin conexi\xF3n";
    liveStatus = "error";
    liveHint = "Sin red";
  } else if (transport === "ws") {
    if (wsClose.code && wsClose.code !== 1e3 && wsClose.code !== 1001) {
      liveValue = "Reconectando";
      liveStatus = "warn";
      liveHint = "Canal en vivo";
    } else {
      liveValue = "En vivo";
      liveStatus = "ok";
      liveHint = "WebSocket activo";
    }
  } else {
    liveValue = "Sondeo HTTP";
    liveStatus = wsClose.code === 1006 ? "ok" : "ok";
    liveHint = wsClose.code === 1006 ? "En vivo en pausa" : "Activo";
  }
  const queueStatus = outboxCount > 0 ? status === "error" || recentErrors.length > 0 ? "error" : "warn" : "ok";
  let syncPipelineState = status === "error" ? "error" : status === "offline" ? "error" : status === "pending" ? "warn" : status === "syncing" ? "info" : "ok";
  let syncPipelineDetail = STATUS_LABELS[status] || status;
  if (recentErrors.length > 0 || d.lastCycleOk === false) {
    syncPipelineState = "error";
    syncPipelineDetail = recentErrors[0]?.explain || "Fall\xF3 el \xFAltimo ciclo de sync";
  } else if (status === "error") {
    syncPipelineDetail = humanizeTechnicalSyncMessage(String(d.detail || "")) || STATUS_LABELS.error;
  } else if (d.tokenPresent && String(d.roomId || "").trim() && d.runtimeActive === false) {
    syncPipelineState = "error";
    syncPipelineDetail = "Sync detenido";
  }
  if (/enlace con nube|cliente nube|no está listo|sync detenido/i.test(syncPipelineDetail)) {
    syncPipelineDetail = "Sin enlace activo";
  } else if (syncPipelineDetail.length > 32) {
    syncPipelineDetail = syncPipelineDetail.slice(0, 29) + "\u2026";
  }
  const displayStatusKey = recentErrors.length > 0 || status === "error" ? "error" : hasWarn || status === "pending" ? "pending" : status === "syncing" ? "syncing" : status === "offline" ? "offline" : "idle";
  const pipeline = [
    {
      label: "Internet",
      state: d.online === false ? "error" : d.online ? "ok" : "warn",
      detail: d.online === false ? "Sin conexi\xF3n" : d.online ? "Conectado" : "\u2014"
    },
    {
      label: "Sesi\xF3n",
      state: d.tokenPresent ? "ok" : "error",
      detail: d.tokenPresent ? "Activa" : "Sin iniciar"
    },
    {
      label: "Sala",
      state: String(d.roomId || "").trim() ? "ok" : "warn",
      detail: roomLabel
    },
    {
      label: "Sync",
      state: syncPipelineState,
      detail: syncPipelineDetail
    }
  ];
  const tiles = [
    {
      id: "queue",
      label: "Cola",
      value: String(outboxCount),
      status: queueStatus,
      hint: outboxCount > 0 ? "Pendientes" : "Vac\xEDa"
    },
    {
      id: "revision",
      label: "Revisi\xF3n",
      value: Number.isFinite(Number(d.revision)) ? String(d.revision) : "\u2014",
      status: "neutral",
      hint: "Local"
    },
    {
      id: "pull",
      label: "Pull",
      value: formatCloudDiagWhen(d.lastPullAt, now),
      status: activityTileStatus(d.lastPullAt),
      hint: "Descarga"
    },
    {
      id: "push",
      label: "Push",
      value: formatCloudDiagWhen(d.lastPushAt, now),
      status: activityTileStatus(d.lastPushAt),
      hint: "Env\xEDo"
    },
    {
      id: "live",
      label: "Canal",
      value: liveValue,
      status: liveStatus,
      hint: liveHint
    },
    {
      id: "patients",
      label: "Pacientes",
      value: Number.isFinite(Number(d.localPatientCount)) ? String(d.localPatientCount) : "\u2014",
      status: "neutral",
      hint: "Locales"
    }
  ];
  const outboxBreakdown = Object.entries(d.outbox?.byKind || {}).filter(function(pair) {
    return Number(pair[1]) > 0;
  }).map(function(pair) {
    const kind = pair[0];
    const count = Number(pair[1]) || 0;
    return {
      kind,
      label: OUTBOX_KIND_LABELS[kind] || kind,
      count,
      share: outboxCount > 0 ? Math.round(count / outboxCount * 100) : 0
    };
  }).sort(function(a, b) {
    return b.count - a.count;
  });
  return {
    verdict: { level, headline, subline },
    statusKey: status,
    displayStatusKey,
    roomLabel,
    facts,
    tiles,
    pipeline,
    outboxBreakdown,
    toxicOutbox: toxicRows.slice(0, 3).map(function(row) {
      return {
        clientMutationId: String(row.clientMutationId || ""),
        opCount: Number(row.opCount) || 0,
        totalBytes: Number(row.totalBytes) || 0,
        totalLabel: formatCloudDiagBytes(row.totalBytes),
        maxOpPath: row.maxOpPath || null,
        maxOpBytes: Number(row.maxOpBytes) || 0,
        maxOpLabel: formatCloudDiagBytes(row.maxOpBytes),
        detail: formatToxicOutboxDetail(row)
      };
    }),
    issues,
    recentErrors
  };
}

// public/js/features/cloud-sync/panel-cloud-diagnostics-html.mjs
function statusChipClass(displayStatusKey, verdictLevel) {
  const key = String(displayStatusKey || "");
  if (key === "error" || verdictLevel === "error") return "is-error";
  if (key === "syncing" || verdictLevel === "info") return "is-syncing";
  if (key === "pending" || key === "offline" || verdictLevel === "warn") return "is-pending";
  return "is-idle";
}
function renderClickableAlert(item) {
  const fixId = String(item.fixId || "generic_sync_error");
  let html = '<button type="button" class="cloud-sync-inset-row cloud-sync-inset-row--nav cloud-nube-dash-alert" data-cloud-diag-fix="' + esc(fixId) + '" data-severity="' + esc(String(item.severity || "warn")) + '"><span class="cloud-nube-dash-alert-body"><span class="cloud-nube-dash-alert-title">' + esc(String(item.title || "Problema")) + '</span><span class="cloud-nube-dash-alert-detail">' + esc(String(item.detail || "")) + "</span>";
  if (item.hint) {
    html += '<span class="cloud-nube-dash-alert-hint">' + esc(String(item.hint)) + "</span>";
  }
  html += '<span class="cloud-nube-dash-alert-cta">C\xF3mo arreglar</span></span><span class="cloud-sync-options-row-chevron" aria-hidden="true">\u203A</span></button>';
  return html;
}
function renderCloudNubeDashboardHtml(view) {
  const v = view && typeof view === "object" ? view : {};
  const verdict = v.verdict || { level: "ok", headline: "\u2014", subline: "" };
  const chipClass = statusChipClass(v.displayStatusKey || v.statusKey, verdict.level);
  let html = '<div class="cloud-nube-dashboard"><div class="cloud-sync-inset-group cloud-nube-dash-card"><div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-head"><div class="cloud-nube-dash-head-main"><span class="cloud-sync-status-chip cloud-nube-dash-chip ' + esc(chipClass) + '">' + esc(verdict.headline) + "</span>";
  if (v.roomLabel) {
    html += '<span class="cloud-nube-dash-room">' + esc(v.roomLabel) + "</span>";
  }
  html += "</div>";
  if (verdict.subline) {
    html += '<p class="cloud-nube-dash-subline">' + esc(verdict.subline) + "</p>";
  }
  html += "</div>";
  if (Array.isArray(v.tiles) && v.tiles.length > 0) {
    v.tiles.forEach(function(tile) {
      const dd = esc(tile.value) + (tile.hint ? '<span class="cloud-nube-dash-kv-muted"> \xB7 ' + esc(tile.hint) + "</span>" : "");
      html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--kv cloud-nube-dash-kv" data-status="' + esc(tile.status) + '"><dt>' + esc(tile.label) + "</dt><dd>" + dd + "</dd></div>";
    });
  }
  if (Array.isArray(v.pipeline) && v.pipeline.length > 0) {
    html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-pipeline-wrap">';
    html += '<span class="cloud-nube-dash-pipeline-label">Conexi\xF3n</span>';
    html += '<div class="cloud-nube-dash-pipeline">';
    v.pipeline.forEach(function(step) {
      const pipeFix = step.label === "Sync" && (step.state === "error" || step.state === "warn") ? ' data-cloud-diag-pipe-fix="sync_not_active"' : "";
      html += '<span class="cloud-nube-dash-pipe" data-state="' + esc(step.state) + '"' + pipeFix + '><span class="cloud-nube-dash-pipe-dot" aria-hidden="true"></span><span class="cloud-nube-dash-pipe-text">' + esc(step.label) + "<small>" + esc(step.detail) + "</small></span></span>";
    });
    html += "</div></div>";
  }
  if (Array.isArray(v.outboxBreakdown) && v.outboxBreakdown.length > 0) {
    html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-outbox-head">Cola por tipo</div>';
    v.outboxBreakdown.forEach(function(row) {
      html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--kv cloud-nube-dash-outbox-row"><dt>' + esc(row.label) + '</dt><dd><span class="cloud-nube-dash-outbox-track" aria-hidden="true"><span class="cloud-nube-dash-outbox-bar" style="width:' + String(row.share) + '%"></span></span> ' + esc(String(row.count)) + "</dd></div>";
    });
  }
  if (Array.isArray(v.toxicOutbox) && v.toxicOutbox.length > 0) {
    html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-toxic-head">Lotes pesados en cola</div>';
    v.toxicOutbox.forEach(function(row) {
      html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--kv cloud-nube-dash-toxic-row" data-status="error"><dt>' + esc(String(row.clientMutationId || "push")) + "</dt><dd>" + esc(String(row.opCount || 0) + " ops \xB7 ~" + String(row.totalLabel || "") + (row.maxOpPath ? " \xB7 " + row.maxOpPath : "")) + "</dd></div>";
    });
  }
  html += "</div>";
  const hasAlerts = Array.isArray(v.issues) && v.issues.length > 0 || Array.isArray(v.recentErrors) && v.recentErrors.length > 0;
  if (hasAlerts) {
    html += '<div class="cloud-sync-inset-group cloud-nube-dash-card cloud-nube-dash-alerts-card">';
    html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-alerts-head">Problemas detectados</div>';
    if (Array.isArray(v.issues) && v.issues.length > 0) {
      v.issues.forEach(function(issue) {
        html += renderClickableAlert(issue);
      });
    }
    if (Array.isArray(v.recentErrors) && v.recentErrors.length > 0) {
      v.recentErrors.forEach(function(entry) {
        html += renderClickableAlert({
          fixId: entry.fixId,
          severity: "error",
          title: entry.op + " \xB7 " + entry.at,
          detail: entry.explain,
          hint: entry.code ? "C\xF3digo: " + entry.code : ""
        });
      });
    }
    html += "</div>";
  }
  html += '<div class="cloud-nube-dash-actions"><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-diag-action="retry">Reintentar cola</button><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-diag-action="sync">Forzar sync</button><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-diag-action="prune-labs">Descartar labs en cola</button></div></div>';
  return html;
}

// public/js/features/cloud-sync/panel-cloud-diagnostics.mjs
function readCloudDiagnosticsRuntime() {
  const runtime = getSharedNubeRuntime();
  const outbox = getSharedNubeOutbox();
  return {
    status: runtime?.getStatus?.() || "idle",
    detail: runtime?.getDetail?.() || "",
    transport: runtime?.getTransportState?.() || "poll",
    runtimeActive: !!runtime,
    outboxEntries: outbox?.list?.() || []
  };
}
function readCloudDiagnosticsSettings() {
  const settings = getCloudSyncSettings();
  return {
    online: typeof navigator !== "undefined" ? navigator.onLine : null,
    bridgeConfigured: isCloudMutateBridgeConfigured(),
    cloudActive: isCloudSyncActive(),
    baseUrl: settings.baseUrl,
    tokenPresent: !!settings.token,
    roomId: settings.roomId,
    revision: settings.revision,
    roomSnapshot: getCloudSyncRoomSnapshot(),
    localPatientCount: Array.isArray(patients) ? patients.length : 0
  };
}
function buildCloudDiagnosticsDeps(deps) {
  return {
    ...readCloudDiagnosticsRuntime(),
    ...readCloudDiagnosticsSettings(),
    toast: typeof deps?.toast === "function" ? deps.toast : function() {
    }
  };
}
function updateDashboardPanel(host, view) {
  const panel = host.querySelector("[data-cloud-diag-dashboard]");
  if (!panel) return;
  panel.innerHTML = renderCloudNubeDashboardHtml(view);
}
function renderCloudDiagnosticsReport(host, deps) {
  const diagDeps = buildCloudDiagnosticsDeps(deps);
  const diag = getCloudSyncDiagnostics(diagDeps);
  const view = buildCloudDiagnosticsHumanView(diag);
  const report = formatCloudDiagnosticsReport(diag);
  const pre = host.querySelector(".cloud-sync-diagnostics-pre");
  if (pre) pre.textContent = report;
  updateDashboardPanel(host, view);
  return { diagDeps, diag, view, report };
}
function createDiagnosticsButton(label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cloud-sync-btn cloud-sync-btn--ghost";
  btn.style.width = "100%";
  btn.textContent = label;
  return btn;
}
function runDiagnosticsRetry(host, deps) {
  const runtime = getSharedNubeRuntime();
  if (!runtime) {
    deps?.toast?.("Runtime Nube inactivo. Reconecta en Conexi\xF3n.", "warn");
    return;
  }
  void runtime.flushOutbox().then(function() {
    return runtime.syncCycle();
  }).then(function() {
    deps?.toast?.("Cola Nube reintentada.", "info");
    refreshCloudSyncDiagnostics(host, deps);
  }).catch(function() {
    deps?.toast?.("Fall\xF3 el reintento. Revisa el dashboard.", "error");
    refreshCloudSyncDiagnostics(host, deps);
  });
}
function runDiagnosticsSync(host, deps) {
  const runtime = getSharedNubeRuntime();
  if (!runtime) {
    deps?.toast?.("Runtime Nube inactivo. Reconecta en Conexi\xF3n.", "warn");
    return;
  }
  void runtime.syncCycle().then(function() {
    deps?.toast?.("Ciclo Nube ejecutado.", "info");
    refreshCloudSyncDiagnostics(host, deps);
  });
}
function runDiagnosticsPruneLabs(host, deps) {
  const outbox = getSharedNubeOutbox();
  if (!outbox) {
    deps?.toast?.("Runtime Nube inactivo. Reconecta en Conexi\xF3n.", "warn");
    return;
  }
  const result = pruneLabSidecarsFromOutbox(outbox);
  const runtime = getSharedNubeRuntime();
  runtime?.refreshIdleStatus?.();
  if (result.removedOps > 0) {
    deps?.toast?.(
      "Se descartaron " + result.removedOps + " lab" + (result.removedOps !== 1 ? "s" : "") + " de la cola.",
      "info"
    );
  } else {
    deps?.toast?.("No hab\xEDa labs pendientes en la cola.", "info");
  }
  refreshCloudSyncDiagnostics(host, deps);
}
function wireDashboardActions(host, deps) {
  const panel = host.querySelector("[data-cloud-diag-dashboard]");
  if (!panel || panel.dataset.wired === "1") return;
  panel.dataset.wired = "1";
  panel.addEventListener("click", function(ev) {
    const target = ev.target;
    if (!target || typeof target.closest !== "function") return;
    const fixBtn = target.closest("[data-cloud-diag-fix]");
    if (fixBtn && panel.contains(fixBtn)) {
      const fixId = fixBtn.getAttribute("data-cloud-diag-fix");
      if (fixId) showCloudNubeFixModal(fixId);
      return;
    }
    const pipe = target.closest("[data-cloud-diag-pipe-fix]");
    if (pipe && panel.contains(pipe)) {
      const fixId = pipe.getAttribute("data-cloud-diag-pipe-fix");
      if (fixId) showCloudNubeFixModal(fixId);
      return;
    }
    const btn = target.closest("[data-cloud-diag-action]");
    if (!btn || !panel.contains(btn)) return;
    const action = btn.getAttribute("data-cloud-diag-action");
    if (action === "retry") runDiagnosticsRetry(host, deps);
    else if (action === "sync") runDiagnosticsSync(host, deps);
    else if (action === "prune-labs") runDiagnosticsPruneLabs(host, deps);
  });
}
function mountCloudSyncDiagnostics(host, deps) {
  if (!host) return;
  host.textContent = "";
  const wrap = document.createElement("div");
  wrap.className = "cloud-sync-diagnostics";
  const dashboardPanel = document.createElement("div");
  dashboardPanel.className = "cloud-sync-diag-dashboard-host";
  dashboardPanel.setAttribute("data-cloud-diag-dashboard", "1");
  wrap.appendChild(dashboardPanel);
  const technical = document.createElement("details");
  technical.className = "cloud-sync-diag-technical";
  const technicalSummary = document.createElement("summary");
  technicalSummary.textContent = "Informe t\xE9cnico (soporte)";
  technical.appendChild(technicalSummary);
  const reportPre = document.createElement("pre");
  reportPre.className = "cloud-sync-diagnostics-pre lan-sync-diagnostics-pre";
  technical.appendChild(reportPre);
  wrap.appendChild(technical);
  const copyBtn = createDiagnosticsButton("Copiar informe t\xE9cnico");
  copyBtn.style.marginTop = "6px";
  copyBtn.onclick = function() {
    const built = renderCloudDiagnosticsReport(host, deps);
    void copyToClipboardSafe(built.report).then(function(ok) {
      deps?.toast?.(
        ok ? "Informe t\xE9cnico copiado (tokens redactados)." : "No se pudo copiar el informe.",
        ok ? "success" : "error"
      );
    });
  };
  wrap.appendChild(copyBtn);
  host.appendChild(wrap);
  wireDashboardActions(host, deps);
  renderCloudDiagnosticsReport(host, deps);
}
function refreshCloudSyncDiagnostics(host, deps) {
  if (!host) return;
  if (!host.querySelector(".cloud-sync-diagnostics")) {
    mountCloudSyncDiagnostics(host, deps);
    return;
  }
  renderCloudDiagnosticsReport(host, deps);
}

export {
  mountCloudMobileInviteInHost,
  refreshCloudSyncDiagnostics
};
//# sourceMappingURL=/js/chunks/chunk-CG6HUK2R.js.map
