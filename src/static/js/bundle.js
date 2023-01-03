"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/@lyrasearch/lyra/dist/browser/stemmer/lib/en.js
  var require_en = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/stemmer/lib/en.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.stemmer = void 0;
      var step2List = {
        ational: "ate",
        tional: "tion",
        enci: "ence",
        anci: "ance",
        izer: "ize",
        bli: "ble",
        alli: "al",
        entli: "ent",
        eli: "e",
        ousli: "ous",
        ization: "ize",
        ation: "ate",
        ator: "ate",
        alism: "al",
        iveness: "ive",
        fulness: "ful",
        ousness: "ous",
        aliti: "al",
        iviti: "ive",
        biliti: "ble",
        logi: "log"
      };
      var step3List = {
        icate: "ic",
        ative: "",
        alize: "al",
        iciti: "ic",
        ical: "ic",
        ful: "",
        ness: ""
      };
      var c = "[^aeiou]";
      var v = "[aeiouy]";
      var C = c + "[^aeiouy]*";
      var V = v + "[aeiou]*";
      var mgr0 = "^(" + C + ")?" + V + C;
      var meq1 = "^(" + C + ")?" + V + C + "(" + V + ")?$";
      var mgr1 = "^(" + C + ")?" + V + C + V + C;
      var s_v = "^(" + C + ")?" + v;
      function stemmer(w) {
        var _a, _b;
        let stem;
        let suffix;
        let re;
        let re2;
        let re3;
        let re4;
        if (w.length < 3) {
          return w;
        }
        const firstch = w.substring(0, 1);
        if (firstch == "y") {
          w = firstch.toUpperCase() + w.substring(1);
        }
        re = /^(.+?)(ss|i)es$/;
        re2 = /^(.+?)([^s])s$/;
        if (re.test(w)) {
          w = w.replace(re, "$1$2");
        } else if (re2.test(w)) {
          w = w.replace(re2, "$1$2");
        }
        re = /^(.+?)eed$/;
        re2 = /^(.+?)(ed|ing)$/;
        if (re.test(w)) {
          const fp = re.exec(w);
          re = new RegExp(mgr0);
          if (re.test(fp[1])) {
            re = /.$/;
            w = w.replace(re, "");
          }
        } else if (re2.test(w)) {
          const fp = re2.exec(w);
          stem = fp[1];
          re2 = new RegExp(s_v);
          if (re2.test(stem)) {
            w = stem;
            re2 = /(at|bl|iz)$/;
            re3 = new RegExp("([^aeiouylsz])\\1$");
            re4 = new RegExp("^" + C + v + "[^aeiouwxy]$");
            if (re2.test(w)) {
              w = w + "e";
            } else if (re3.test(w)) {
              re = /.$/;
              w = w.replace(re, "");
            } else if (re4.test(w)) {
              w = w + "e";
            }
          }
        }
        re = /^(.+?)y$/;
        if (re.test(w)) {
          const fp = re.exec(w);
          stem = fp === null || fp === void 0 ? void 0 : fp[1];
          re = new RegExp(s_v);
          if (stem && re.test(stem)) {
            w = stem + "i";
          }
        }
        re = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;
        if (re.test(w)) {
          const fp = re.exec(w);
          stem = fp === null || fp === void 0 ? void 0 : fp[1];
          suffix = fp === null || fp === void 0 ? void 0 : fp[2];
          re = new RegExp(mgr0);
          if (stem && re.test(stem)) {
            w = stem + step2List[suffix];
          }
        }
        re = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
        if (re.test(w)) {
          const fp = re.exec(w);
          stem = fp === null || fp === void 0 ? void 0 : fp[1];
          suffix = fp === null || fp === void 0 ? void 0 : fp[2];
          re = new RegExp(mgr0);
          if (stem && re.test(stem)) {
            w = stem + step3List[suffix];
          }
        }
        re = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
        re2 = /^(.+?)(s|t)(ion)$/;
        if (re.test(w)) {
          const fp = re.exec(w);
          stem = fp === null || fp === void 0 ? void 0 : fp[1];
          re = new RegExp(mgr1);
          if (stem && re.test(stem)) {
            w = stem;
          }
        } else if (re2.test(w)) {
          const fp = re2.exec(w);
          stem = (_b = (_a = fp === null || fp === void 0 ? void 0 : fp[1]) !== null && _a !== void 0 ? _a : "" + (fp === null || fp === void 0 ? void 0 : fp[2])) !== null && _b !== void 0 ? _b : "";
          re2 = new RegExp(mgr1);
          if (re2.test(stem)) {
            w = stem;
          }
        }
        re = /^(.+?)e$/;
        if (re.test(w)) {
          const fp = re.exec(w);
          stem = fp === null || fp === void 0 ? void 0 : fp[1];
          re = new RegExp(mgr1);
          re2 = new RegExp(meq1);
          re3 = new RegExp("^" + C + v + "[^aeiouwxy]$");
          if (stem && (re.test(stem) || re2.test(stem) && !re3.test(stem))) {
            w = stem;
          }
        }
        re = /ll$/;
        re2 = new RegExp(mgr1);
        if (re.test(w) && re2.test(w)) {
          re = /.$/;
          w = w.replace(re, "");
        }
        if (firstch == "y") {
          w = firstch.toLowerCase() + w.substring(1);
        }
        return w;
      }
      exports.stemmer = stemmer;
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/languages.js
  var require_languages = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/languages.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.SUPPORTED_LANGUAGES = void 0;
      exports.SUPPORTED_LANGUAGES = [
        "arabic",
        "armenian",
        "dutch",
        "english",
        "french",
        "greek",
        "indonesian",
        "italian",
        "irish",
        "indian",
        "lithuanian",
        "nepali",
        "norwegian",
        "portuguese",
        "russian",
        "spanish",
        "swedish",
        "german",
        "finnish",
        "danish",
        "hungarian",
        "romanian",
        "serbian",
        "turkish"
      ];
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/errors.js
  var require_errors = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/errors.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.INVALID_TOKENIZER_FUNCTION = exports.INVALID_STEMMER_FUNCTION_TYPE = exports.CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY = exports.CUSTOM_STOP_WORDS_ARRAY_MUST_BE_STRING_ARRAY = exports.NON_SUPPORTED_HOOKS = exports.INVALID_HOOKS_OBJECT = exports.GETTER_SETTER_WORKS_ON_EDGE_ONLY = exports.LANGUAGE_NOT_SUPPORTED = exports.DOC_ID_DOES_NOT_EXISTS = exports.UNSUPPORTED_NESTED_PROPERTIES = exports.CANT_DELETE_DOCUMENT = exports.CANT_DELETE_DOC_NOT_FOUND = exports.INVALID_PROPERTY = exports.INVALID_DOC_SCHEMA = exports.INVALID_SCHEMA_TYPE = void 0;
      var languages_1 = require_languages();
      function formatJSON(input) {
        return JSON.stringify(input, null, 2);
      }
      function INVALID_SCHEMA_TYPE(type) {
        return `Invalid schema type. Expected string or object, but got ${type}`;
      }
      exports.INVALID_SCHEMA_TYPE = INVALID_SCHEMA_TYPE;
      function INVALID_DOC_SCHEMA(expected, found) {
        return `Invalid document structure. 
Lyra has been initialized with the following schema: 

${formatJSON(expected)}

but found the following doc:

${formatJSON(found)}`;
      }
      exports.INVALID_DOC_SCHEMA = INVALID_DOC_SCHEMA;
      function INVALID_PROPERTY(name, expected) {
        return `Invalid property name. Expected a wildcard string ("*") or array containing one of the following properties: ${expected.join(", ")}, but got: ${name}`;
      }
      exports.INVALID_PROPERTY = INVALID_PROPERTY;
      function CANT_DELETE_DOC_NOT_FOUND(id) {
        return `Document with ID ${id} does not exist.`;
      }
      exports.CANT_DELETE_DOC_NOT_FOUND = CANT_DELETE_DOC_NOT_FOUND;
      function CANT_DELETE_DOCUMENT(docID, key, token) {
        return `Unable to delete document "${docID}" from index "${key}" on word "${token}".`;
      }
      exports.CANT_DELETE_DOCUMENT = CANT_DELETE_DOCUMENT;
      function UNSUPPORTED_NESTED_PROPERTIES() {
        return `Nested properties are not supported in this Lyra version, but will be in the future.`;
      }
      exports.UNSUPPORTED_NESTED_PROPERTIES = UNSUPPORTED_NESTED_PROPERTIES;
      function DOC_ID_DOES_NOT_EXISTS(id) {
        return `Document with ID ${id} does not exists`;
      }
      exports.DOC_ID_DOES_NOT_EXISTS = DOC_ID_DOES_NOT_EXISTS;
      function LANGUAGE_NOT_SUPPORTED(lang) {
        return `Language "${lang}" is not supported.
Supported languages are:
 - ${languages_1.SUPPORTED_LANGUAGES.join("\n - ")}`;
      }
      exports.LANGUAGE_NOT_SUPPORTED = LANGUAGE_NOT_SUPPORTED;
      function GETTER_SETTER_WORKS_ON_EDGE_ONLY(method) {
        return `${method} works on edge only. Use edge: true in Lyra constructor to enable it.`;
      }
      exports.GETTER_SETTER_WORKS_ON_EDGE_ONLY = GETTER_SETTER_WORKS_ON_EDGE_ONLY;
      function INVALID_HOOKS_OBJECT() {
        return "Invalid hooks object";
      }
      exports.INVALID_HOOKS_OBJECT = INVALID_HOOKS_OBJECT;
      function NON_SUPPORTED_HOOKS(invalidHooks) {
        return `The following hooks aren't supported. Hooks: ${invalidHooks}`;
      }
      exports.NON_SUPPORTED_HOOKS = NON_SUPPORTED_HOOKS;
      function CUSTOM_STOP_WORDS_ARRAY_MUST_BE_STRING_ARRAY() {
        return `Custom stop words array must only contain strings.`;
      }
      exports.CUSTOM_STOP_WORDS_ARRAY_MUST_BE_STRING_ARRAY = CUSTOM_STOP_WORDS_ARRAY_MUST_BE_STRING_ARRAY;
      function CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY() {
        return `Custom stop words must be a function or an array of strings.`;
      }
      exports.CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY = CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY;
      function INVALID_STEMMER_FUNCTION_TYPE() {
        return `tokenizer.stemmingFn property must be a function.`;
      }
      exports.INVALID_STEMMER_FUNCTION_TYPE = INVALID_STEMMER_FUNCTION_TYPE;
      function INVALID_TOKENIZER_FUNCTION() {
        return `tokenizer.tokenizerFn must be a function.`;
      }
      exports.INVALID_TOKENIZER_FUNCTION = INVALID_TOKENIZER_FUNCTION;
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/insertion-checker.js
  var require_insertion_checker = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/insertion-checker.js"(exports) {
      "use strict";
      var _a;
      var _b;
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.trackInsertion = void 0;
      var kInsertions = Symbol("lyra.insertions");
      var warn = (_b = (_a = globalThis.process) === null || _a === void 0 ? void 0 : _a.emitWarning) !== null && _b !== void 0 ? _b : function emitWarning(message, options) {
        console.warn(`[WARNING] [${options.code}] ${message}`);
      };
      function trackInsertion(_lyra) {
        const lyra2 = _lyra;
        if (typeof lyra2[kInsertions] !== "number") {
          queueMicrotask(() => {
            lyra2[kInsertions] = void 0;
          });
          lyra2[kInsertions] = 0;
        }
        if (lyra2[kInsertions] > 1e3) {
          warn("Lyra's insert operation is synchronous. Please avoid inserting a large number of document in a single operation in order not to block the main thread.", { code: "LYRA0001" });
          lyra2[kInsertions] = -1;
        } else if (lyra2[kInsertions] >= 0) {
          lyra2[kInsertions]++;
        }
      }
      exports.trackInsertion = trackInsertion;
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/utils.js
  var require_utils = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/utils.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.sortTokenScorePredicate = exports.includes = exports.insertSortedValue = exports.intersectTokenScores = exports.getTokenFrequency = exports.getOwnProperty = exports.uniqueId = exports.getNanosecondsTime = exports.formatNanoseconds = exports.formatBytes = exports.isServer = void 0;
      var baseId = Date.now().toString().slice(5);
      var lastId = 0;
      var k = 1024;
      var nano = BigInt(1e3);
      var milli = BigInt(1e6);
      var second = BigInt(1e9);
      exports.isServer = typeof window === "undefined";
      function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) {
          return "0 Bytes";
        }
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
      }
      exports.formatBytes = formatBytes;
      function formatNanoseconds(value) {
        if (typeof value === "number") {
          value = BigInt(value);
        }
        if (value < nano) {
          return `${value}ns`;
        } else if (value < milli) {
          return `${value / nano}\u03BCs`;
        } else if (value < second) {
          return `${value / milli}ms`;
        }
        return `${value / second}s`;
      }
      exports.formatNanoseconds = formatNanoseconds;
      function getNanosecondsTime() {
        if (typeof process !== "undefined" && process.hrtime !== void 0) {
          return process.hrtime.bigint();
        }
        if (typeof performance !== "undefined") {
          return BigInt(Math.floor(performance.now() * 1e6));
        }
        return BigInt(0);
      }
      exports.getNanosecondsTime = getNanosecondsTime;
      function uniqueId() {
        return `${baseId}-${lastId++}`;
      }
      exports.uniqueId = uniqueId;
      function getOwnProperty(object, property) {
        return Object.hasOwn(object, property) ? object[property] : void 0;
      }
      exports.getOwnProperty = getOwnProperty;
      function getTokenFrequency(token, tokens) {
        let count = 0;
        for (const t of tokens) {
          if (t === token) {
            count++;
          }
        }
        return count;
      }
      exports.getTokenFrequency = getTokenFrequency;
      function intersectTokenScores(arrays) {
        var _a, _b, _c;
        if (arrays.length === 0)
          return [];
        for (let i = 1; i < arrays.length; i++) {
          if (arrays[i].length < arrays[0].length) {
            const tmp = arrays[0];
            arrays[0] = arrays[i];
            arrays[i] = tmp;
          }
        }
        const set = /* @__PURE__ */ new Map();
        for (const elem of arrays[0]) {
          set.set(elem[0], [1, elem[1]]);
        }
        const arrLength = arrays.length;
        for (let i = 1; i < arrLength; i++) {
          let found = 0;
          for (const elem of arrays[i]) {
            const [count, score] = (_b = set.get((_a = elem[0]) !== null && _a !== void 0 ? _a : "")) !== null && _b !== void 0 ? _b : [0, 0];
            if (count === i) {
              set.set((_c = elem[0]) !== null && _c !== void 0 ? _c : "", [count + 1, score + elem[1]]);
              found++;
            }
          }
          if (found === 0) {
            return [];
          }
        }
        const result = [];
        for (const [token, [count, score]] of set) {
          if (count === arrLength) {
            result.push([token, score]);
          }
        }
        return result;
      }
      exports.intersectTokenScores = intersectTokenScores;
      function insertSortedValue(arr, el, compareFn = sortTokenScorePredicate) {
        let low = 0;
        let high = arr.length;
        let mid;
        while (low < high) {
          mid = low + high >>> 1;
          if (compareFn(el, arr[mid]) < 0) {
            high = mid;
          } else {
            low = mid + 1;
          }
        }
        arr.splice(low, 0, el);
        return arr;
      }
      exports.insertSortedValue = insertSortedValue;
      function includes(array, element) {
        for (let i = 0; i < array.length; i++) {
          if (array[i] === element) {
            return true;
          }
        }
        return false;
      }
      exports.includes = includes;
      function sortTokenScorePredicate(a, b) {
        return b[1] - a[1];
      }
      exports.sortTokenScorePredicate = sortTokenScorePredicate;
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/prefix-tree/node.js
  var require_node = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/prefix-tree/node.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.removeDocument = exports.updateParent = exports.create = void 0;
      var utils_1 = require_utils();
      function create2(key = "") {
        const node = {
          id: (0, utils_1.uniqueId)(),
          key,
          word: "",
          parent: null,
          children: {},
          docs: [],
          end: false
        };
        Object.defineProperty(node, "toJSON", { value: serialize });
        return node;
      }
      exports.create = create2;
      function updateParent(node, parent) {
        node.parent = parent.id;
        node.word = parent.word + node.key;
      }
      exports.updateParent = updateParent;
      function removeDocument(node, docID) {
        const index = node.docs.indexOf(docID);
        if (index === -1) {
          return false;
        }
        node.docs.splice(index, 1);
        return true;
      }
      exports.removeDocument = removeDocument;
      function serialize() {
        const { key, word, children, docs, end } = this;
        return { key, word, children, docs, end };
      }
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/levenshtein.js
  var require_levenshtein = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/levenshtein.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.levenshtein = exports.boundedLevenshtein = void 0;
      function boundedLevenshtein(a, b, tolerance) {
        const distance = _boundedLevenshtein(a, b, tolerance);
        return {
          distance,
          isBounded: distance >= 0
        };
      }
      exports.boundedLevenshtein = boundedLevenshtein;
      function _boundedLevenshtein(a, b, tolerance) {
        if (a === b) {
          return 0;
        }
        const swap = a;
        if (a.length > b.length) {
          a = b;
          b = swap;
        }
        let lenA = a.length;
        let lenB = b.length;
        while (lenA > 0 && a.charCodeAt(~-lenA) === b.charCodeAt(~-lenB)) {
          lenA--;
          lenB--;
        }
        if (!lenA) {
          return lenB > tolerance ? -1 : lenB;
        }
        let startIdx = 0;
        while (startIdx < lenA && a.charCodeAt(startIdx) === b.charCodeAt(startIdx)) {
          startIdx++;
        }
        lenA -= startIdx;
        lenB -= startIdx;
        if (lenA === 0) {
          return lenB > tolerance ? -1 : lenB;
        }
        const delta = lenB - lenA;
        if (tolerance > lenB) {
          tolerance = lenB;
        } else if (delta > tolerance) {
          return -1;
        }
        let i = 0;
        const row = [];
        const characterCodeCache = [];
        while (i < tolerance) {
          characterCodeCache[i] = b.charCodeAt(startIdx + i);
          row[i] = ++i;
        }
        while (i < lenB) {
          characterCodeCache[i] = b.charCodeAt(startIdx + i);
          row[i++] = tolerance + 1;
        }
        const offset = tolerance - delta;
        const haveMax = tolerance < lenB;
        let jStart = 0;
        let jEnd = tolerance;
        let current = 0;
        let left = 0;
        let above = 0;
        let charA = 0;
        let j = 0;
        for (i = 0; i < lenA; i++) {
          left = i;
          current = i + 1;
          charA = a.charCodeAt(startIdx + i);
          jStart += i > offset ? 1 : 0;
          jEnd += jEnd < lenB ? 1 : 0;
          for (j = jStart; j < jEnd; j++) {
            above = current;
            current = left;
            left = row[j];
            if (charA !== characterCodeCache[j]) {
              if (left < current) {
                current = left;
              }
              if (above < current) {
                current = above;
              }
              current++;
            }
            row[j] = current;
          }
          if (haveMax && row[i + delta] > tolerance) {
            return -1;
          }
        }
        return current <= tolerance ? current : -1;
      }
      function levenshtein(a, b) {
        if (!a.length) {
          return b.length;
        }
        if (!b.length) {
          return a.length;
        }
        const swap = a;
        if (a.length > b.length) {
          a = b;
          b = swap;
        }
        const row = Array.from({ length: a.length + 1 }, (_, i) => i);
        let val = 0;
        for (let i = 1; i <= b.length; i++) {
          let prev = i;
          for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
              val = row[j - 1];
            } else {
              val = Math.min(row[j - 1] + 1, Math.min(prev + 1, row[j] + 1));
            }
            row[j - 1] = prev;
            prev = val;
          }
          row[a.length] = prev;
        }
        return row[a.length];
      }
      exports.levenshtein = levenshtein;
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/prefix-tree/trie.js
  var require_trie = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/prefix-tree/trie.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.removeWord = exports.removeDocumentByWord = exports.find = exports.contains = exports.insert = void 0;
      var node_1 = require_node();
      var levenshtein_1 = require_levenshtein();
      var utils_1 = require_utils();
      function findAllWords(nodes, node, output, term, exact, tolerance) {
        if (node.end) {
          const { word, docs: docIDs } = node;
          if (exact && word !== term) {
            return;
          }
          if (!Object.hasOwn(output, word)) {
            if (tolerance) {
              const difference = Math.abs(term.length - word.length);
              if (difference <= tolerance && (0, levenshtein_1.boundedLevenshtein)(term, word, tolerance).isBounded) {
                output[word] = [];
              }
            } else {
              output[word] = [];
            }
          }
          if ((0, utils_1.getOwnProperty)(output, word) && docIDs.length) {
            const docs = new Set(output[word]);
            const docIDsLength = docIDs.length;
            for (let i = 0; i < docIDsLength; i++) {
              docs.add(docIDs[i]);
            }
            output[word] = Array.from(docs);
          }
        }
        const nodeChildrenKeys = Object.keys(node.children);
        for (let i = 0; i < nodeChildrenKeys.length; i++) {
          const childNode = node.children[nodeChildrenKeys[i]];
          findAllWords(nodes, nodes[childNode], output, term, exact, tolerance);
        }
      }
      function insert(nodes, node, word, docId) {
        var _a;
        const wordLength = word.length;
        for (let i = 0; i < wordLength; i++) {
          const char = word[i];
          if (!((_a = node.children) === null || _a === void 0 ? void 0 : _a[char])) {
            const newNode = (0, node_1.create)(char);
            (0, node_1.updateParent)(newNode, node);
            nodes[newNode.id] = newNode;
            node.children[char] = newNode.id;
          }
          node = nodes[node.children[char]];
          if (i === wordLength - 1) {
            node.end = true;
            node.docs.push(docId);
          }
        }
      }
      exports.insert = insert;
      function contains(nodes, node, word) {
        var _a;
        const wordLength = word.length;
        for (let i = 0; i < wordLength; i++) {
          const char = word[i];
          const next = (_a = node.children) === null || _a === void 0 ? void 0 : _a[char];
          if (!next) {
            return false;
          }
          node = nodes[next];
        }
        return node.end;
      }
      exports.contains = contains;
      function find(nodes, node, { term, exact, tolerance }) {
        var _a;
        const output = {};
        const termLength = term.length;
        for (let i = 0; i < termLength; i++) {
          const char = term[i];
          const next = (_a = node.children) === null || _a === void 0 ? void 0 : _a[char];
          if (next) {
            node = nodes[next];
          } else if (!tolerance) {
            return output;
          }
        }
        findAllWords(nodes, node, output, term, exact, tolerance);
        return output;
      }
      exports.find = find;
      function removeDocumentByWord(nodes, node, word, docID, exact = true) {
        var _a;
        if (!word) {
          return false;
        }
        const { word: nodeWord, docs: docIDs } = node;
        if (exact && node.end && nodeWord === word) {
          (0, node_1.removeDocument)(node, docID);
          if (((_a = node.children) === null || _a === void 0 ? void 0 : _a.size) && (0, utils_1.includes)(docIDs, docID)) {
            node.end = false;
          }
          return true;
        }
        const nodeChildrenKeys = Object.keys(node.children);
        for (let i = 0; i < nodeChildrenKeys.length; i++) {
          const childNode = node.children[nodeChildrenKeys[i]];
          removeDocumentByWord(nodes, nodes[childNode], word, docID);
        }
        return false;
      }
      exports.removeDocumentByWord = removeDocumentByWord;
      function removeWord(nodes, node, word) {
        var _a;
        if (!word) {
          return false;
        }
        if (node.end && node.word === word) {
          if ((_a = node.children) === null || _a === void 0 ? void 0 : _a.size) {
            node.end = false;
          } else {
            nodes[node.parent].children = {};
          }
          return true;
        }
        const nodeChildrenKeys = Object.keys(node.children);
        for (let i = 0; i < nodeChildrenKeys.length; i++) {
          const childNode = node.children[nodeChildrenKeys[i]];
          removeWord(nodes, nodes[childNode], word);
        }
        return false;
      }
      exports.removeWord = removeWord;
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/diacritics.js
  var require_diacritics = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/diacritics.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.replaceDiacritics = void 0;
      var DIACRITICS_CHARCODE_START = 192;
      var DIACRITICS_CHARCODE_END = 252;
      var CHARCODE_REPLACE_MAPPING = [
        65,
        65,
        65,
        65,
        65,
        65,
        65,
        67,
        69,
        69,
        69,
        69,
        73,
        73,
        73,
        73,
        null,
        78,
        79,
        79,
        79,
        79,
        79,
        79,
        79,
        85,
        85,
        85,
        85,
        null,
        null,
        null,
        97,
        97,
        97,
        97,
        97,
        97,
        97,
        99,
        101,
        101,
        101,
        101,
        105,
        105,
        105,
        105,
        null,
        110,
        111,
        111,
        111,
        111,
        111,
        111,
        111,
        117,
        117,
        117,
        117
      ];
      function replaceChar(charCode) {
        if (charCode < DIACRITICS_CHARCODE_START || charCode > DIACRITICS_CHARCODE_END)
          return charCode;
        return CHARCODE_REPLACE_MAPPING[charCode - DIACRITICS_CHARCODE_START] || charCode;
      }
      function replaceDiacritics(str) {
        const stringCharCode = [];
        for (let idx = 0; idx < str.length; idx++) {
          stringCharCode[idx] = replaceChar(str.charCodeAt(idx));
        }
        return String.fromCharCode(...stringCharCode);
      }
      exports.replaceDiacritics = replaceDiacritics;
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/index.js
  var require_tokenizer = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.tokenize = exports.normalizationCache = void 0;
      var lyra_1 = require_lyra();
      var diacritics_1 = require_diacritics();
      var utils_1 = require_utils();
      var splitRegex = {
        dutch: /[^a-z0-9_'-]+/gim,
        english: /[^a-z0-9_'-]+/gim,
        french: /[^a-z0-9äâàéèëêïîöôùüûœç-]+/gim,
        italian: /[^a-z0-9_'-]+/gim,
        norwegian: /[^a-z0-9_æøåÆØÅäÄöÖüÜ]+/gim,
        portuguese: /[^a-zà-úÀ-Ú]/gim,
        russian: /[^a-zа-яА-ЯёЁ]+/gim,
        spanish: /[^a-zA-Zá-úÁ-ÚñÑüÜ]+/gim,
        swedish: /[^a-z0-9_åÅäÄöÖüÜ-]+/gim,
        german: /[^a-zA-ZäöüÄÖÜß]+/gim,
        finnish: /[^a-z0-9äöÄÖ]+/gim,
        danish: /[^a-z0-9æøåÆØÅ]+/gim,
        hungarian: /[^a-z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ]+/gim,
        romanian: /[^a-z0-9ăâîșțĂÂÎȘȚ]+/gim,
        serbian: /[^a-z0-9čćžšđČĆŽŠĐ]+/gim,
        turkish: /[^a-z0-9çÇğĞıİöÖşŞüÜ]+/gim,
        lithuanian: /[^a-z0-9ąčęėįšųūžĄČĘĖĮŠŲŪŽ]+/gim,
        arabic: /[^a-z0-9أ-ي]+/gim,
        nepali: /[^a-z0-9अ-ह]+/gim,
        irish: /[^a-z0-9áéíóúÁÉÍÓÚ]+/gim,
        indian: /[^a-z0-9अ-ह]+/gim,
        armenian: /[^a-z0-9ա-ֆ]+/gim,
        greek: /[^a-z0-9α-ωά-ώ]+/gim,
        indonesian: /[^a-z0-9]+/gim
      };
      exports.normalizationCache = /* @__PURE__ */ new Map();
      function normalizeToken(token, language, tokenizerConfig) {
        const key = `${language}:${token}`;
        if (exports.normalizationCache.has(key)) {
          return exports.normalizationCache.get(key);
        }
        if (tokenizerConfig === null || tokenizerConfig === void 0 ? void 0 : tokenizerConfig.enableStopWords) {
          if ((0, utils_1.includes)(tokenizerConfig === null || tokenizerConfig === void 0 ? void 0 : tokenizerConfig.customStopWords, token)) {
            const token2 = "";
            exports.normalizationCache.set(key, token2);
            return token2;
          }
        }
        if (tokenizerConfig === null || tokenizerConfig === void 0 ? void 0 : tokenizerConfig.enableStemming) {
          if (typeof (tokenizerConfig === null || tokenizerConfig === void 0 ? void 0 : tokenizerConfig.stemmingFn) === "function") {
            token = tokenizerConfig === null || tokenizerConfig === void 0 ? void 0 : tokenizerConfig.stemmingFn(token);
          }
        }
        token = (0, diacritics_1.replaceDiacritics)(token);
        exports.normalizationCache.set(key, token);
        return token;
      }
      function tokenize(input, language = "english", allowDuplicates = false, tokenizerConfig = (0, lyra_1.defaultTokenizerConfig)(language)) {
        if (typeof input !== "string") {
          return [input];
        }
        const splitRule = splitRegex[language];
        const tokens = input.toLowerCase().split(splitRule).map((token) => normalizeToken(token, language, tokenizerConfig)).filter(Boolean);
        const trimTokens = trim(tokens);
        if (!allowDuplicates) {
          return Array.from(new Set(trimTokens));
        }
        return trimTokens;
      }
      exports.tokenize = tokenize;
      function trim(text) {
        while (text[text.length - 1] === "") {
          text.pop();
        }
        while (text[0] === "") {
          text.shift();
        }
        return text;
      }
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/en.js
  var require_en2 = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/en.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.en = void 0;
      exports.en = [
        "i",
        "me",
        "my",
        "myself",
        "we",
        "us",
        "our",
        "ours",
        "ourselves",
        "you",
        "your",
        "yours",
        "yourself",
        "yourselves",
        "he",
        "him",
        "his",
        "himself",
        "she",
        "her",
        "hers",
        "herself",
        "it",
        "its",
        "itself",
        "they",
        "them",
        "their",
        "theirs",
        "themselves",
        "what",
        "which",
        "who",
        "whom",
        "this",
        "that",
        "these",
        "those",
        "am",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "being",
        "have",
        "has",
        "had",
        "having",
        "do",
        "does",
        "did",
        "doing",
        "will",
        "would",
        "shall",
        "should",
        "can",
        "could",
        "may",
        "might",
        "must",
        "ought",
        "i'm",
        "you're",
        "he's",
        "she's",
        "it's",
        "we're",
        "they're",
        "i've",
        "you've",
        "we've",
        "they've",
        "i'd",
        "you'd",
        "he'd",
        "she'd",
        "we'd",
        "they'd",
        "i'll",
        "you'll",
        "he'll",
        "she'll",
        "we'll",
        "they'll",
        "isn't",
        "aren't",
        "wasn't",
        "weren't",
        "hasn't",
        "haven't",
        "hadn't",
        "doesn't",
        "don't",
        "didn't",
        "won't",
        "wouldn't",
        "shan't",
        "shouldn't",
        "can't",
        "cannot",
        "couldn't",
        "mustn't",
        "let's",
        "that's",
        "who's",
        "what's",
        "here's",
        "there's",
        "when's",
        "where's",
        "why's",
        "how's",
        "an",
        "the",
        "and",
        "but",
        "if",
        "or",
        "because",
        "as",
        "until",
        "while",
        "of",
        "at",
        "by",
        "for",
        "with",
        "about",
        "against",
        "between",
        "into",
        "through",
        "during",
        "before",
        "after",
        "above",
        "below",
        "to",
        "from",
        "up",
        "down",
        "in",
        "out",
        "on",
        "off",
        "over",
        "under",
        "again",
        "further",
        "then",
        "once",
        "here",
        "there",
        "when",
        "where",
        "why",
        "how",
        "all",
        "any",
        "both",
        "each",
        "few",
        "more",
        "most",
        "other",
        "some",
        "such",
        "no",
        "nor",
        "not",
        "only",
        "own",
        "same",
        "so",
        "than",
        "too",
        "very"
      ];
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/it.js
  var require_it = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/it.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.it = void 0;
      exports.it = [
        "ad",
        "al",
        "allo",
        "ai",
        "agli",
        "all",
        "agl",
        "alla",
        "alle",
        "con",
        "col",
        "coi",
        "da",
        "dal",
        "dallo",
        "dai",
        "dagli",
        "dall",
        "dagl",
        "dalla",
        "dalle",
        "di",
        "del",
        "dello",
        "dei",
        "degli",
        "dell",
        "degl",
        "della",
        "delle",
        "in",
        "nel",
        "nello",
        "nei",
        "negli",
        "nell",
        "negl",
        "nella",
        "nelle",
        "su",
        "sul",
        "sullo",
        "sui",
        "sugli",
        "sull",
        "sugl",
        "sulla",
        "sulle",
        "per",
        "tra",
        "contro",
        "io",
        "tu",
        "lui",
        "lei",
        "noi",
        "voi",
        "loro",
        "mio",
        "mia",
        "miei",
        "mie",
        "tuo",
        "tua",
        "tuoi",
        "tue",
        "suo",
        "sua",
        "suoi",
        "sue",
        "nostro",
        "nostra",
        "nostri",
        "nostre",
        "vostro",
        "vostra",
        "vostri",
        "vostre",
        "mi",
        "ti",
        "ci",
        "vi",
        "lo",
        "la",
        "li",
        "le",
        "gli",
        "ne",
        "il",
        "un",
        "uno",
        "una",
        "ma",
        "ed",
        "se",
        "perch\xE9",
        "anche",
        "come",
        "dov",
        "dove",
        "che",
        "chi",
        "cui",
        "non",
        "pi\xF9",
        "quale",
        "quanto",
        "quanti",
        "quanta",
        "quante",
        "quello",
        "quelli",
        "quella",
        "quelle",
        "questo",
        "questi",
        "questa",
        "queste",
        "si",
        "tutto",
        "tutti",
        "a",
        "c",
        "e",
        "i",
        "l",
        "o",
        "ho",
        "hai",
        "ha",
        "abbiamo",
        "avete",
        "hanno",
        "abbia",
        "abbiate",
        "abbiano",
        "avr\xF2",
        "avrai",
        "avr\xE0",
        "avremo",
        "avrete",
        "avranno",
        "avrei",
        "avresti",
        "avrebbe",
        "avremmo",
        "avreste",
        "avrebbero",
        "avevo",
        "avevi",
        "aveva",
        "avevamo",
        "avevate",
        "avevano",
        "ebbi",
        "avesti",
        "ebbe",
        "avemmo",
        "aveste",
        "ebbero",
        "avessi",
        "avesse",
        "avessimo",
        "avessero",
        "avendo",
        "avuto",
        "avuta",
        "avuti",
        "avute",
        "sono",
        "sei",
        "\xE8",
        "siamo",
        "siete",
        "sia",
        "siate",
        "siano",
        "sar\xF2",
        "sarai",
        "sar\xE0",
        "saremo",
        "sarete",
        "saranno",
        "sarei",
        "saresti",
        "sarebbe",
        "saremmo",
        "sareste",
        "sarebbero",
        "ero",
        "eri",
        "era",
        "eravamo",
        "eravate",
        "erano",
        "fui",
        "fosti",
        "fu",
        "fummo",
        "foste",
        "furono",
        "fossi",
        "fosse",
        "fossimo",
        "fossero",
        "essendo",
        "faccio",
        "fai",
        "facciamo",
        "fanno",
        "faccia",
        "facciate",
        "facciano",
        "far\xF2",
        "farai",
        "far\xE0",
        "faremo",
        "farete",
        "faranno",
        "farei",
        "faresti",
        "farebbe",
        "faremmo",
        "fareste",
        "farebbero",
        "facevo",
        "facevi",
        "faceva",
        "facevamo",
        "facevate",
        "facevano",
        "feci",
        "facesti",
        "fece",
        "facemmo",
        "faceste",
        "fecero",
        "facessi",
        "facesse",
        "facessimo",
        "facessero",
        "facendo",
        "sto",
        "stai",
        "sta",
        "stiamo",
        "stanno",
        "stia",
        "stiate",
        "stiano",
        "star\xF2",
        "starai",
        "star\xE0",
        "staremo",
        "starete",
        "staranno",
        "starei",
        "staresti",
        "starebbe",
        "staremmo",
        "stareste",
        "starebbero",
        "stavo",
        "stavi",
        "stava",
        "stavamo",
        "stavate",
        "stavano",
        "stetti",
        "stesti",
        "stette",
        "stemmo",
        "steste",
        "stettero",
        "stessi",
        "stesse",
        "stessimo",
        "stessero",
        "stando"
      ];
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/fr.js
  var require_fr = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/fr.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.fr = void 0;
      exports.fr = [
        "au",
        "aux",
        "avec",
        "ce",
        "ces",
        "dans",
        "de",
        "des",
        "du",
        "elle",
        "en",
        "et",
        "eux",
        "il",
        "je",
        "la",
        "le",
        "leur",
        "lui",
        "ma",
        "mais",
        "me",
        "m\xEAme",
        "mes",
        "moi",
        "mon",
        "ne",
        "nos",
        "notre",
        "nous",
        "on",
        "ou",
        "par",
        "pas",
        "pour",
        "qu",
        "que",
        "qui",
        "sa",
        "se",
        "ses",
        "son",
        "sur",
        "ta",
        "te",
        "tes",
        "toi",
        "ton",
        "tu",
        "un",
        "une",
        "vos",
        "votre",
        "vous",
        "c",
        "d",
        "j",
        "l",
        "\xE0",
        "m",
        "n",
        "s",
        "t",
        "y",
        "",
        "\xE9t\xE9",
        "\xE9t\xE9e",
        "\xE9t\xE9es",
        "\xE9t\xE9s",
        "\xE9tant",
        "suis",
        "es",
        "est",
        "sommes",
        "\xEAtes",
        "sont",
        "serai",
        "seras",
        "sera",
        "serons",
        "serez",
        "seront",
        "serais",
        "serait",
        "serions",
        "seriez",
        "seraient",
        "\xE9tais",
        "\xE9tait",
        "\xE9tions",
        "\xE9tiez",
        "\xE9taient",
        "fus",
        "fut",
        "f\xFBmes",
        "f\xFBtes",
        "furent",
        "sois",
        "soit",
        "soyons",
        "soyez",
        "soient",
        "fusse",
        "fusses",
        "f\xFBt",
        "fussions",
        "fussiez",
        "fussent",
        "ayant",
        "eu",
        "eue",
        "eues",
        "eus",
        "ai",
        "as",
        "avons",
        "avez",
        "ont",
        "aurai",
        "auras",
        "aura",
        "aurons",
        "aurez",
        "auront",
        "aurais",
        "aurait",
        "aurions",
        "auriez",
        "auraient",
        "avais",
        "avait",
        "avions",
        "aviez",
        "avaient",
        "eut",
        "e\xFBmes",
        "e\xFBtes",
        "eurent",
        "aie",
        "aies",
        "ait",
        "ayons",
        "ayez",
        "aient",
        "eusse",
        "eusses",
        "e\xFBt",
        "eussions",
        "eussiez",
        "eussent",
        "ceci",
        "cela",
        "cel\xE0",
        "cet",
        "cette",
        "ici",
        "ils",
        "les",
        "leurs",
        "quel",
        "quels",
        "quelle",
        "quelles",
        "sans",
        "soi"
      ];
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/es.js
  var require_es = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/es.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.es = void 0;
      exports.es = [
        "de",
        "la",
        "que",
        "el",
        "en",
        "y",
        "a",
        "los",
        "del",
        "se",
        "las",
        "por",
        "un",
        "para",
        "con",
        "no",
        "una",
        "su",
        "al",
        "lo",
        "como",
        "m\xE1s",
        "pero",
        "sus",
        "le",
        "ya",
        "o",
        "este",
        "s\xED",
        "porque",
        "esta",
        "entre",
        "cuando",
        "muy",
        "sin",
        "sobre",
        "tambi\xE9n",
        "me",
        "hasta",
        "hay",
        "donde",
        "quien",
        "desde",
        "todo",
        "nos",
        "durante",
        "todos",
        "uno",
        "les",
        "ni",
        "contra",
        "otros",
        "ese",
        "eso",
        "ante",
        "ellos",
        "e",
        "esto",
        "m\xED",
        "antes",
        "algunos",
        "qu\xE9",
        "unos",
        "yo",
        "otro",
        "otras",
        "otra",
        "\xE9l",
        "tanto",
        "esa",
        "estos",
        "mucho",
        "quienes",
        "nada",
        "muchos",
        "cual",
        "poco",
        "ella",
        "estar",
        "estas",
        "algunas",
        "algo",
        "nosotros",
        "mi",
        "mis",
        "t\xFA",
        "te",
        "ti",
        "tu",
        "tus",
        "ellas",
        "nosotras",
        "vosotros",
        "vosotras",
        "os",
        "m\xEDo",
        "m\xEDa",
        "m\xEDos",
        "m\xEDas",
        "tuyo",
        "tuya",
        "tuyos",
        "tuyas",
        "suyo",
        "suya",
        "suyos",
        "suyas",
        "nuestro",
        "nuestra",
        "nuestros",
        "nuestras",
        "vuestro",
        "vuestra",
        "vuestros",
        "vuestras",
        "esos",
        "esas",
        "estoy",
        "est\xE1s",
        "est\xE1",
        "estamos",
        "est\xE1is",
        "est\xE1n",
        "est\xE9",
        "est\xE9s",
        "estemos",
        "est\xE9is",
        "est\xE9n",
        "estar\xE9",
        "estar\xE1s",
        "estar\xE1",
        "estaremos",
        "estar\xE9is",
        "estar\xE1n",
        "estar\xEDa",
        "estar\xEDas",
        "estar\xEDamos",
        "estar\xEDais",
        "estar\xEDan",
        "estaba",
        "estabas",
        "est\xE1bamos",
        "estabais",
        "estaban",
        "estuve",
        "estuviste",
        "estuvo",
        "estuvimos",
        "estuvisteis",
        "estuvieron",
        "estuviera",
        "estuvieras",
        "estuvi\xE9ramos",
        "estuvierais",
        "estuvieran",
        "estuviese",
        "estuvieses",
        "estuvi\xE9semos",
        "estuvieseis",
        "estuviesen",
        "estando",
        "estado",
        "estada",
        "estados",
        "estadas",
        "estad",
        "he",
        "has",
        "ha",
        "hemos",
        "hab\xE9is",
        "han",
        "haya",
        "hayas",
        "hayamos",
        "hay\xE1is",
        "hayan",
        "habr\xE9",
        "habr\xE1s",
        "habr\xE1",
        "habremos",
        "habr\xE9is",
        "habr\xE1n",
        "habr\xEDa",
        "habr\xEDas",
        "habr\xEDamos",
        "habr\xEDais",
        "habr\xEDan",
        "hab\xEDa",
        "hab\xEDas",
        "hab\xEDamos",
        "hab\xEDais",
        "hab\xEDan",
        "hube",
        "hubiste",
        "hubo",
        "hubimos",
        "hubisteis",
        "hubieron",
        "hubiera",
        "hubieras",
        "hubi\xE9ramos",
        "hubierais",
        "hubieran",
        "hubiese",
        "hubieses",
        "hubi\xE9semos",
        "hubieseis",
        "hubiesen",
        "habiendo",
        "habido",
        "habida",
        "habidos",
        "habidas",
        "soy",
        "eres",
        "es",
        "somos",
        "sois",
        "son",
        "sea",
        "seas",
        "seamos",
        "se\xE1is",
        "sean",
        "ser\xE9",
        "ser\xE1s",
        "ser\xE1",
        "seremos",
        "ser\xE9is",
        "ser\xE1n",
        "ser\xEDa",
        "ser\xEDas",
        "ser\xEDamos",
        "ser\xEDais",
        "ser\xEDan",
        "era",
        "eras",
        "\xE9ramos",
        "erais",
        "eran",
        "fui",
        "fuiste",
        "fue",
        "fuimos",
        "fuisteis",
        "fueron",
        "fuera",
        "fueras",
        "fu\xE9ramos",
        "fuerais",
        "fueran",
        "fuese",
        "fueses",
        "fu\xE9semos",
        "fueseis",
        "fuesen",
        "siendo",
        "sido",
        "tengo",
        "tienes",
        "tiene",
        "tenemos",
        "ten\xE9is",
        "tienen",
        "tenga",
        "tengas",
        "tengamos",
        "teng\xE1is",
        "tengan",
        "tendr\xE9",
        "tendr\xE1s",
        "tendr\xE1",
        "tendremos",
        "tendr\xE9is",
        "tendr\xE1n",
        "tendr\xEDa",
        "tendr\xEDas",
        "tendr\xEDamos",
        "tendr\xEDais",
        "tendr\xEDan",
        "ten\xEDa",
        "ten\xEDas",
        "ten\xEDamos",
        "ten\xEDais",
        "ten\xEDan",
        "tuve",
        "tuviste",
        "tuvo",
        "tuvimos",
        "tuvisteis",
        "tuvieron",
        "tuviera",
        "tuvieras",
        "tuvi\xE9ramos",
        "tuvierais",
        "tuvieran",
        "tuviese",
        "tuvieses",
        "tuvi\xE9semos",
        "tuvieseis",
        "tuviesen",
        "teniendo",
        "tenido",
        "tenida",
        "tenidos",
        "tenidas",
        "tened"
      ];
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/pt.js
  var require_pt = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/pt.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.pt = void 0;
      exports.pt = [
        "de",
        "a",
        "o",
        "que",
        "e",
        "do",
        "da",
        "em",
        "um",
        "para",
        "com",
        "n\xE3o",
        "uma",
        "os",
        "no",
        "se",
        "na",
        "por",
        "mais",
        "as",
        "dos",
        "como",
        "mas",
        "ao",
        "ele",
        "das",
        "\xE0",
        "seu",
        "sua",
        "ou",
        "quando",
        "muito",
        "nos",
        "j\xE1",
        "eu",
        "tamb\xE9m",
        "s\xF3",
        "pelo",
        "pela",
        "at\xE9",
        "isso",
        "ela",
        "entre",
        "depois",
        "sem",
        "mesmo",
        "aos",
        "seus",
        "quem",
        "nas",
        "me",
        "esse",
        "eles",
        "voc\xEA",
        "essa",
        "num",
        "nem",
        "suas",
        "meu",
        "\xE0s",
        "minha",
        "numa",
        "pelos",
        "elas",
        "qual",
        "n\xF3s",
        "lhe",
        "deles",
        "essas",
        "esses",
        "pelas",
        "este",
        "dele",
        "tu",
        "te",
        "voc\xEAs",
        "vos",
        "lhes",
        "meus",
        "minhas",
        "teu",
        "tua",
        "teus",
        "tuas",
        "nosso",
        "nossa",
        "nossos",
        "nossas",
        "dela",
        "delas",
        "esta",
        "estes",
        "estas",
        "aquele",
        "aquela",
        "aqueles",
        "aquelas",
        "isto",
        "aquilo",
        "estou",
        "est\xE1",
        "estamos",
        "est\xE3o",
        "estive",
        "esteve",
        "estivemos",
        "estiveram",
        "estava",
        "est\xE1vamos",
        "estavam",
        "estivera",
        "estiv\xE9ramos",
        "esteja",
        "estejamos",
        "estejam",
        "estivesse",
        "estiv\xE9ssemos",
        "estivessem",
        "estiver",
        "estivermos",
        "estiverem",
        "hei",
        "h\xE1",
        "havemos",
        "h\xE3o",
        "houve",
        "houvemos",
        "houveram",
        "houvera",
        "houv\xE9ramos",
        "haja",
        "hajamos",
        "hajam",
        "houvesse",
        "houv\xE9ssemos",
        "houvessem",
        "houver",
        "houvermos",
        "houverem",
        "houverei",
        "houver\xE1",
        "houveremos",
        "houver\xE3o",
        "houveria",
        "houver\xEDamos",
        "houveriam",
        "sou",
        "somos",
        "s\xE3o",
        "era",
        "\xE9ramos",
        "eram",
        "fui",
        "foi",
        "fomos",
        "foram",
        "fora",
        "f\xF4ramos",
        "seja",
        "sejamos",
        "sejam",
        "fosse",
        "f\xF4ssemos",
        "fossem",
        "for",
        "formos",
        "forem",
        "serei",
        "ser\xE1",
        "seremos",
        "ser\xE3o",
        "seria",
        "ser\xEDamos",
        "seriam",
        "tenho",
        "tem",
        "temos",
        "t\xE9m",
        "tinha",
        "t\xEDnhamos",
        "tinham",
        "tive",
        "teve",
        "tivemos",
        "tiveram",
        "tivera",
        "tiv\xE9ramos",
        "tenha",
        "tenhamos",
        "tenham",
        "tivesse",
        "tiv\xE9ssemos",
        "tivessem",
        "tiver",
        "tivermos",
        "tiverem",
        "terei",
        "ter\xE1",
        "teremos",
        "ter\xE3o",
        "teria",
        "ter\xEDamos",
        "teriam"
      ];
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/nl.js
  var require_nl = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/nl.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.nl = void 0;
      exports.nl = [
        "de",
        "en",
        "van",
        "ik",
        "te",
        "dat",
        "die",
        "in",
        "een",
        "hij",
        "het",
        "niet",
        "zijn",
        "is",
        "was",
        "op",
        "aan",
        "met",
        "als",
        "voor",
        "had",
        "er",
        "maar",
        "om",
        "hem",
        "dan",
        "zou",
        "of",
        "wat",
        "mijn",
        "men",
        "dit",
        "zo",
        "door",
        "over",
        "ze",
        "zich",
        "bij",
        "ook",
        "tot",
        "je",
        "mij",
        "uit",
        "der",
        "daar",
        "haar",
        "naar",
        "heb",
        "hoe",
        "heeft",
        "hebben",
        "deze",
        "u",
        "want",
        "nog",
        "zal",
        "me",
        "zij",
        "nu",
        "ge",
        "geen",
        "omdat",
        "iets",
        "worden",
        "toch",
        "al",
        "waren",
        "veel",
        "meer",
        "doen",
        "toen",
        "moet",
        "ben",
        "zonder",
        "kan",
        "hun",
        "dus",
        "alles",
        "onder",
        "ja",
        "eens",
        "hier",
        "wie",
        "werd",
        "altijd",
        "doch",
        "wordt",
        "wezen",
        "kunnen",
        "ons",
        "zelf",
        "tegen",
        "na",
        "reeds",
        "wil",
        "kon",
        "niets",
        "uw",
        "iemand",
        "geweest",
        "andere"
      ];
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/se.js
  var require_se = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/se.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.se = void 0;
      exports.se = [
        "och",
        "det",
        "att",
        "i",
        "en",
        "jag",
        "hon",
        "som",
        "han",
        "p\xE5",
        "den",
        "med",
        "var",
        "sig",
        "f\xF6r",
        "s\xE5",
        "till",
        "\xE4r",
        "men",
        "ett",
        "om",
        "hade",
        "de",
        "av",
        "icke",
        "mig",
        "du",
        "henne",
        "d\xE5",
        "sin",
        "nu",
        "har",
        "inte",
        "hans",
        "honom",
        "skulle",
        "hennes",
        "d\xE4r",
        "min",
        "man",
        "ej",
        "vid",
        "kunde",
        "n\xE5got",
        "fr\xE5n",
        "ut",
        "n\xE4r",
        "efter",
        "upp",
        "vi",
        "dem",
        "vara",
        "vad",
        "\xF6ver",
        "\xE4n",
        "dig",
        "kan",
        "sina",
        "h\xE4r",
        "ha",
        "mot",
        "alla",
        "under",
        "n\xE5gon",
        "eller",
        "allt",
        "mycket",
        "sedan",
        "ju",
        "denna",
        "sj\xE4lv",
        "detta",
        "\xE5t",
        "utan",
        "varit",
        "hur",
        "ingen",
        "mitt",
        "ni",
        "bli",
        "blev",
        "oss",
        "din",
        "dessa",
        "n\xE5gra",
        "deras",
        "blir",
        "mina",
        "samma",
        "vilken",
        "er",
        "s\xE5dan",
        "v\xE5r",
        "blivit",
        "dess",
        "inom",
        "mellan",
        "s\xE5dant",
        "varf\xF6r",
        "varje",
        "vilka",
        "ditt",
        "vem",
        "vilket",
        "sitta",
        "s\xE5dana",
        "vart",
        "dina",
        "vars",
        "v\xE5rt",
        "v\xE5ra",
        "ert",
        "era",
        "vilkas"
      ];
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/ru.js
  var require_ru = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/ru.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ru = void 0;
      exports.ru = [
        "\u0438",
        "\u0432",
        "\u0432\u043E",
        "\u043D\u0435",
        "\u0447\u0442\u043E",
        "\u043E\u043D",
        "\u043D\u0430",
        "\u044F",
        "\u0441",
        "\u0441\u043E",
        "\u043A\u0430\u043A",
        "\u0430",
        "\u0442\u043E",
        "\u0432\u0441\u0435",
        "\u043E\u043D\u0430",
        "\u0442\u0430\u043A",
        "\u0435\u0433\u043E",
        "\u043D\u043E",
        "\u0434\u0430",
        "\u0442\u044B",
        "\u043A",
        "\u0443",
        "\u0436\u0435",
        "\u0432\u044B",
        "\u0437\u0430",
        "\u0431\u044B",
        "\u043F\u043E",
        "\u0442\u043E\u043B\u044C\u043A\u043E",
        "\u0435\u0435",
        "\u043C\u043D\u0435",
        "\u0431\u044B\u043B\u043E",
        "\u0432\u043E\u0442",
        "\u043E\u0442",
        "\u043C\u0435\u043D\u044F",
        "\u0435\u0449\u0435",
        "\u043D\u0435\u0442",
        "\u043E",
        "\u0438\u0437",
        "\u0435\u043C\u0443",
        "\u0442\u0435\u043F\u0435\u0440\u044C",
        "\u043A\u043E\u0433\u0434\u0430",
        "\u0434\u0430\u0436\u0435",
        "\u043D\u0443",
        "\u0432\u0434\u0440\u0443\u0433",
        "\u043B\u0438",
        "\u0435\u0441\u043B\u0438",
        "\u0443\u0436\u0435",
        "\u0438\u043B\u0438",
        "\u043D\u0438",
        "\u0431\u044B\u0442\u044C",
        "\u0431\u044B\u043B",
        "\u043D\u0435\u0433\u043E",
        "\u0434\u043E",
        "\u0432\u0430\u0441",
        "\u043D\u0438\u0431\u0443\u0434\u044C",
        "\u043E\u043F\u044F\u0442\u044C",
        "\u0443\u0436",
        "\u0432\u0430\u043C",
        "\u0441\u043A\u0430\u0437\u0430\u043B",
        "\u0432\u0435\u0434\u044C",
        "\u0442\u0430\u043C",
        "\u043F\u043E\u0442\u043E\u043C",
        "\u0441\u0435\u0431\u044F",
        "\u043D\u0438\u0447\u0435\u0433\u043E",
        "\u0435\u0439",
        "\u043C\u043E\u0436\u0435\u0442",
        "\u043E\u043D\u0438",
        "\u0442\u0443\u0442",
        "\u0433\u0434\u0435",
        "\u0435\u0441\u0442\u044C",
        "\u043D\u0430\u0434\u043E",
        "\u043D\u0435\u0439",
        "\u0434\u043B\u044F",
        "\u043C\u044B",
        "\u0442\u0435\u0431\u044F",
        "\u0438\u0445",
        "\u0447\u0435\u043C",
        "\u0431\u044B\u043B\u0430",
        "\u0441\u0430\u043C",
        "\u0447\u0442\u043E\u0431",
        "\u0431\u0435\u0437",
        "\u0431\u0443\u0434\u0442\u043E",
        "\u0447\u0435\u043B\u043E\u0432\u0435\u043A",
        "\u0447\u0435\u0433\u043E",
        "\u0440\u0430\u0437",
        "\u0442\u043E\u0436\u0435",
        "\u0441\u0435\u0431\u0435",
        "\u043F\u043E\u0434",
        "\u0436\u0438\u0437\u043D\u044C",
        "\u0431\u0443\u0434\u0435\u0442",
        "\u0436",
        "\u0442\u043E\u0433\u0434\u0430",
        "\u043A\u0442\u043E",
        "\u044D\u0442\u043E\u0442",
        "\u0433\u043E\u0432\u043E\u0440\u0438\u043B",
        "\u0442\u043E\u0433\u043E",
        "\u043F\u043E\u0442\u043E\u043C\u0443",
        "\u044D\u0442\u043E\u0433\u043E",
        "\u043A\u0430\u043A\u043E\u0439",
        "\u0441\u043E\u0432\u0441\u0435\u043C",
        "\u043D\u0438\u043C",
        "\u0437\u0434\u0435\u0441\u044C",
        "\u044D\u0442\u043E\u043C",
        "\u043E\u0434\u0438\u043D",
        "\u043F\u043E\u0447\u0442\u0438",
        "\u043C\u043E\u0439",
        "\u0442\u0435\u043C",
        "\u0447\u0442\u043E\u0431\u044B",
        "\u043D\u0435\u0435",
        "\u043A\u0430\u0436\u0435\u0442\u0441\u044F",
        "\u0441\u0435\u0439\u0447\u0430\u0441",
        "\u0431\u044B\u043B\u0438",
        "\u043A\u0443\u0434\u0430",
        "\u0437\u0430\u0447\u0435\u043C",
        "\u0441\u043A\u0430\u0437\u0430\u0442\u044C",
        "\u0432\u0441\u0435\u0445",
        "\u043D\u0438\u043A\u043E\u0433\u0434\u0430",
        "\u0441\u0435\u0433\u043E\u0434\u043D\u044F",
        "\u043C\u043E\u0436\u043D\u043E",
        "\u043F\u0440\u0438",
        "\u043D\u0430\u043A\u043E\u043D\u0435\u0446",
        "\u0434\u0432\u0430",
        "\u043E\u0431",
        "\u0434\u0440\u0443\u0433\u043E\u0439",
        "\u0445\u043E\u0442\u044C",
        "\u043F\u043E\u0441\u043B\u0435",
        "\u043D\u0430\u0434",
        "\u0431\u043E\u043B\u044C\u0448\u0435",
        "\u0442\u043E\u0442",
        "\u0447\u0435\u0440\u0435\u0437",
        "\u044D\u0442\u0438",
        "\u043D\u0430\u0441",
        "\u043F\u0440\u043E",
        "\u0432\u0441\u0435\u0433\u043E",
        "\u043D\u0438\u0445",
        "\u043A\u0430\u043A\u0430\u044F",
        "\u043C\u043D\u043E\u0433\u043E",
        "\u0440\u0430\u0437\u0432\u0435",
        "\u0441\u043A\u0430\u0437\u0430\u043B\u0430",
        "\u0442\u0440\u0438",
        "\u044D\u0442\u0443",
        "\u043C\u043E\u044F",
        "\u0432\u043F\u0440\u043E\u0447\u0435\u043C",
        "\u0445\u043E\u0440\u043E\u0448\u043E",
        "\u0441\u0432\u043E\u044E",
        "\u044D\u0442\u043E\u0439",
        "\u043F\u0435\u0440\u0435\u0434",
        "\u0438\u043D\u043E\u0433\u0434\u0430",
        "\u043B\u0443\u0447\u0448\u0435",
        "\u0447\u0443\u0442\u044C",
        "\u0442\u043E\u043C",
        "\u043D\u0435\u043B\u044C\u0437\u044F",
        "\u0442\u0430\u043A\u043E\u0439",
        "\u0438\u043C",
        "\u0431\u043E\u043B\u0435\u0435",
        "\u0432\u0441\u0435\u0433\u0434\u0430",
        "\u043A\u043E\u043D\u0435\u0447\u043D\u043E",
        "\u0432\u0441\u044E",
        "\u043C\u0435\u0436\u0434\u0443"
      ];
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/no.js
  var require_no = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/no.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.no = void 0;
      exports.no = [
        "og",
        "i",
        "jeg",
        "det",
        "at",
        "en",
        "et",
        "den",
        "til",
        "er",
        "som",
        "p\xE5",
        "de",
        "med",
        "han",
        "av",
        "ikke",
        "ikkje",
        "der",
        "s\xE5",
        "var",
        "meg",
        "seg",
        "men",
        "ett",
        "har",
        "om",
        "vi",
        "min",
        "mitt",
        "ha",
        "hadde",
        "hun",
        "n\xE5",
        "over",
        "da",
        "ved",
        "fra",
        "du",
        "ut",
        "sin",
        "dem",
        "oss",
        "opp",
        "man",
        "kan",
        "hans",
        "hvor",
        "eller",
        "hva",
        "skal",
        "selv",
        "sj\xF8l",
        "her",
        "alle",
        "vil",
        "bli",
        "ble",
        "blei",
        "blitt",
        "kunne",
        "inn",
        "n\xE5r",
        "v\xE6re",
        "kom",
        "noen",
        "noe",
        "ville",
        "dere",
        "som",
        "deres",
        "kun",
        "ja",
        "etter",
        "ned",
        "skulle",
        "denne",
        "for",
        "deg",
        "si",
        "sine",
        "sitt",
        "mot",
        "\xE5",
        "meget",
        "hvorfor",
        "dette",
        "disse",
        "uten",
        "hvordan",
        "ingen",
        "din",
        "ditt",
        "blir",
        "samme",
        "hvilken",
        "hvilke",
        "s\xE5nn",
        "inni",
        "mellom",
        "v\xE5r",
        "hver",
        "hvem",
        "vors",
        "hvis",
        "b\xE5de",
        "bare",
        "enn",
        "fordi",
        "f\xF8r",
        "mange",
        "ogs\xE5",
        "slik",
        "v\xE6rt",
        "v\xE6re",
        "b\xE5e",
        "begge",
        "siden",
        "dykk",
        "dykkar",
        "dei",
        "deira",
        "deires",
        "deim",
        "di",
        "d\xE5",
        "eg",
        "ein",
        "eit",
        "eitt",
        "elles",
        "honom",
        "hj\xE5",
        "ho",
        "hoe",
        "henne",
        "hennar",
        "hennes",
        "hoss",
        "hossen",
        "ikkje",
        "ingi",
        "inkje",
        "korleis",
        "korso",
        "kva",
        "kvar",
        "kvarhelst",
        "kven",
        "kvi",
        "kvifor",
        "me",
        "medan",
        "mi",
        "mine",
        "mykje",
        "no",
        "nokon",
        "noka",
        "nokor",
        "noko",
        "nokre",
        "si",
        "sia",
        "sidan",
        "so",
        "somt",
        "somme",
        "um",
        "upp",
        "vere",
        "vore",
        "verte",
        "vort",
        "varte",
        "vart"
      ];
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/de.js
  var require_de = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/de.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.de = void 0;
      exports.de = [
        "aber",
        "alle",
        "allem",
        "allen",
        "aller",
        "alles",
        "als",
        "also",
        "am",
        "an",
        "ander",
        "andere",
        "anderem",
        "anderen",
        "anderer",
        "anderes",
        "anderm",
        "andern",
        "anderr",
        "anders",
        "auch",
        "auf",
        "aus",
        "bei",
        "bin",
        "bis",
        "bist",
        "da",
        "damit",
        "dann",
        "der",
        "den",
        "des",
        "dem",
        "die",
        "das",
        "da\xDF",
        "derselbe",
        "derselben",
        "denselben",
        "desselben",
        "demselben",
        "dieselbe",
        "dieselben",
        "dasselbe",
        "dazu",
        "dein",
        "deine",
        "deinem",
        "deinen",
        "deiner",
        "deines",
        "denn",
        "derer",
        "dessen",
        "dich",
        "dir",
        "du",
        "dies",
        "diese",
        "diesem",
        "diesen",
        "dieser",
        "dieses",
        "doch",
        "dort",
        "durch",
        "ein",
        "eine",
        "einem",
        "einen",
        "einer",
        "eines",
        "einig",
        "einige",
        "einigem",
        "einigen",
        "einiger",
        "einiges",
        "einmal",
        "er",
        "ihn",
        "ihm",
        "es",
        "etwas",
        "euer",
        "eure",
        "eurem",
        "euren",
        "eurer",
        "eures",
        "f\xFCr",
        "gegen",
        "gewesen",
        "hab",
        "habe",
        "haben",
        "hat",
        "hatte",
        "hatten",
        "hier",
        "hin",
        "hinter",
        "ich",
        "mich",
        "mir",
        "ihr",
        "ihre",
        "ihrem",
        "ihren",
        "ihrer",
        "ihres",
        "euch",
        "im",
        "in",
        "indem",
        "ins",
        "ist",
        "jede",
        "jedem",
        "jeden",
        "jeder",
        "jedes",
        "jene",
        "jenem",
        "jenen",
        "jener",
        "jenes",
        "jetzt",
        "kann",
        "kein",
        "keine",
        "keinem",
        "keinen",
        "keiner",
        "keines",
        "k\xF6nnen",
        "k\xF6nnte",
        "machen",
        "man",
        "manche",
        "manchem",
        "manchen",
        "mancher",
        "manches",
        "mein",
        "meine",
        "meinem",
        "meinen",
        "meiner",
        "meines",
        "mit",
        "muss",
        "musste",
        "nach",
        "nicht",
        "nichts",
        "noch",
        "nun",
        "nur",
        "ob",
        "oder",
        "ohne",
        "sehr",
        "sein",
        "seine",
        "seinem",
        "seinen",
        "seiner",
        "seines",
        "selbst",
        "sich",
        "sie",
        "ihnen",
        "sind",
        "so",
        "solche",
        "solchem",
        "solchen",
        "solcher",
        "solches",
        "soll",
        "sollte",
        "sondern",
        "sonst",
        "\xFCber",
        "um",
        "und",
        "uns",
        "unse",
        "unsem",
        "unsen",
        "unser",
        "unses",
        "unter",
        "viel",
        "vom",
        "von",
        "vor",
        "w\xE4hrend",
        "war",
        "waren",
        "warst",
        "was",
        "weg",
        "weil",
        "weiter",
        "welche",
        "welchem",
        "welchen",
        "welcher",
        "welches",
        "wenn",
        "werde",
        "werden",
        "wie",
        "wieder",
        "will",
        "wir",
        "wird",
        "wirst",
        "wo",
        "wollen",
        "wollte",
        "w\xFCrde",
        "w\xFCrden",
        "zu",
        "zum",
        "zur",
        "zwar",
        "zwischen"
      ];
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/dk.js
  var require_dk = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/dk.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.dk = void 0;
      exports.dk = [
        "og",
        "i",
        "jeg",
        "det",
        "at",
        "en",
        "den",
        "til",
        "er",
        "som",
        "p\xE5",
        "de",
        "med",
        "han",
        "af",
        "for",
        "ikke",
        "der",
        "var",
        "mig",
        "sig",
        "men",
        "et",
        "har",
        "om",
        "vi",
        "min",
        "havde",
        "ham",
        "hun",
        "nu",
        "over",
        "da",
        "fra",
        "du",
        "ud",
        "sin",
        "dem",
        "os",
        "op",
        "man",
        "hans",
        "hvor",
        "eller",
        "hvad",
        "skal",
        "selv",
        "her",
        "alle",
        "vil",
        "blev",
        "kunne",
        "ind",
        "n\xE5r",
        "v\xE6re",
        "dog",
        "noget",
        "ville",
        "jo",
        "deres",
        "efter",
        "ned",
        "skulle",
        "denne",
        "end",
        "dette",
        "mit",
        "ogs\xE5",
        "under",
        "have",
        "dig",
        "anden",
        "hende",
        "mine",
        "alt",
        "meget",
        "sit",
        "sine",
        "vor",
        "mod",
        "disse",
        "hvis",
        "din",
        "nogle",
        "hos",
        "blive",
        "mange",
        "ad",
        "bliver",
        "hendes",
        "v\xE6ret",
        "thi",
        "jer",
        "s\xE5dan"
      ];
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/fi.js
  var require_fi = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/fi.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.fi = void 0;
      exports.fi = [
        "olla",
        "olen",
        "olet",
        "on",
        "olemme",
        "olette",
        "ovat",
        "ole",
        "oli",
        "olisi",
        "olisit",
        "olisin",
        "olisimme",
        "olisitte",
        "olisivat",
        "olit",
        "olin",
        "olimme",
        "olitte",
        "olivat",
        "ollut",
        "olleet",
        "en",
        "et",
        "ei",
        "emme",
        "ette",
        "eiv\xE4t",
        "min\xE4",
        "minun",
        "minut",
        "minua",
        "minussa",
        "minusta",
        "minuun",
        "minulla",
        "minulta",
        "minulle",
        "sin\xE4",
        "sinun",
        "sinut",
        "sinua",
        "sinussa",
        "sinusta",
        "sinuun",
        "sinulla",
        "sinulta",
        "sinulle",
        "h\xE4n",
        "h\xE4nen",
        "h\xE4net",
        "h\xE4nt\xE4",
        "h\xE4ness\xE4",
        "h\xE4nest\xE4",
        "h\xE4neen",
        "h\xE4nell\xE4",
        "h\xE4nelt\xE4",
        "h\xE4nelle",
        "me",
        "meid\xE4n",
        "meid\xE4t",
        "meit\xE4",
        "meiss\xE4",
        "meist\xE4",
        "meihin",
        "meill\xE4",
        "meilt\xE4",
        "meille",
        "te",
        "teid\xE4n",
        "teid\xE4t",
        "teit\xE4",
        "teiss\xE4",
        "teist\xE4",
        "teihin",
        "teill\xE4",
        "teilt\xE4",
        "teille",
        "he",
        "heid\xE4n",
        "heid\xE4t",
        "heit\xE4",
        "heiss\xE4",
        "heist\xE4",
        "heihin",
        "heill\xE4",
        "heilt\xE4",
        "heille",
        "t\xE4m\xE4",
        "t\xE4m\xE4n",
        "t\xE4t\xE4",
        "t\xE4ss\xE4",
        "t\xE4st\xE4",
        "t\xE4h\xE4n",
        "t\xE4ll\xE4",
        "t\xE4lt\xE4",
        "t\xE4lle",
        "t\xE4n\xE4",
        "t\xE4ksi",
        "tuo",
        "tuon",
        "tuota",
        "tuossa",
        "tuosta",
        "tuohon",
        "tuolla",
        "tuolta",
        "tuolle",
        "tuona",
        "tuoksi",
        "se",
        "sen",
        "sit\xE4",
        "siin\xE4",
        "siit\xE4",
        "siihen",
        "sill\xE4",
        "silt\xE4",
        "sille",
        "sin\xE4",
        "siksi",
        "n\xE4m\xE4",
        "n\xE4iden",
        "n\xE4it\xE4",
        "n\xE4iss\xE4",
        "n\xE4ist\xE4",
        "n\xE4ihin",
        "n\xE4ill\xE4",
        "n\xE4ilt\xE4",
        "n\xE4ille",
        "n\xE4in\xE4",
        "n\xE4iksi",
        "nuo",
        "noiden",
        "noita",
        "noissa",
        "noista",
        "noihin",
        "noilla",
        "noilta",
        "noille",
        "noina",
        "noiksi",
        "ne",
        "niiden",
        "niit\xE4",
        "niiss\xE4",
        "niist\xE4",
        "niihin",
        "niill\xE4",
        "niilt\xE4",
        "niille",
        "niin\xE4",
        "niiksi",
        "kuka",
        "kenen",
        "kenet",
        "ket\xE4",
        "keness\xE4",
        "kenest\xE4",
        "keneen",
        "kenell\xE4",
        "kenelt\xE4",
        "kenelle",
        "kenen\xE4",
        "keneksi",
        "ketk\xE4",
        "keiden",
        "ketk\xE4",
        "keit\xE4",
        "keiss\xE4",
        "keist\xE4",
        "keihin",
        "keill\xE4",
        "keilt\xE4",
        "keille",
        "kein\xE4",
        "keiksi",
        "mik\xE4",
        "mink\xE4",
        "mink\xE4",
        "mit\xE4",
        "miss\xE4",
        "mist\xE4",
        "mihin",
        "mill\xE4",
        "milt\xE4",
        "mille",
        "min\xE4",
        "miksi",
        "mitk\xE4",
        "joka",
        "jonka",
        "jota",
        "jossa",
        "josta",
        "johon",
        "jolla",
        "jolta",
        "jolle",
        "jona",
        "joksi",
        "jotka",
        "joiden",
        "joita",
        "joissa",
        "joista",
        "joihin",
        "joilla",
        "joilta",
        "joille",
        "joina",
        "joiksi",
        "ett\xE4",
        "ja",
        "jos",
        "koska",
        "kuin",
        "mutta",
        "niin",
        "sek\xE4",
        "sill\xE4",
        "tai",
        "vaan",
        "vai",
        "vaikka",
        "kanssa",
        "mukaan",
        "noin",
        "poikki",
        "yli",
        "kun",
        "niin",
        "nyt",
        "itse"
      ];
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/index.js
  var require_stop_words = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/tokenizer/stop-words/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.availableStopWords = exports.stopWords = void 0;
      var en_1 = require_en2();
      var it_1 = require_it();
      var fr_1 = require_fr();
      var es_1 = require_es();
      var pt_1 = require_pt();
      var nl_1 = require_nl();
      var se_1 = require_se();
      var ru_1 = require_ru();
      var no_1 = require_no();
      var de_1 = require_de();
      var dk_1 = require_dk();
      var fi_1 = require_fi();
      exports.stopWords = {
        english: en_1.en,
        italian: it_1.it,
        french: fr_1.fr,
        spanish: es_1.es,
        portuguese: pt_1.pt,
        dutch: nl_1.nl,
        swedish: se_1.se,
        russian: ru_1.ru,
        norwegian: no_1.no,
        german: de_1.de,
        danish: dk_1.dk,
        finnish: fi_1.fi
      };
      exports.availableStopWords = Object.keys(exports.stopWords);
    }
  });

  // node_modules/@lyrasearch/lyra/dist/browser/src/lyra.js
  var require_lyra = __commonJS({
    "node_modules/@lyrasearch/lyra/dist/browser/src/lyra.js"(exports) {
      "use strict";
      var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === void 0)
          k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      } : function(o, m, k, k2) {
        if (k2 === void 0)
          k2 = k;
        o[k2] = m[k];
      });
      var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      } : function(o, v) {
        o["default"] = v;
      });
      var __importStar = exports && exports.__importStar || function(mod) {
        if (mod && mod.__esModule)
          return mod;
        var result = {};
        if (mod != null) {
          for (var k in mod)
            if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
              __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.defaultTokenizerConfig = exports.load = exports.save = exports.search = exports.remove = exports.insertBatch = exports.insertWithHooks = exports.insert = exports.create = exports.formatNanoseconds = exports.tokenize = void 0;
      var en_1 = require_en();
      var ERRORS = __importStar(require_errors());
      var insertion_checker_1 = require_insertion_checker();
      var node_1 = require_node();
      var trie_1 = require_trie();
      var tokenizer_1 = require_tokenizer();
      var languages_1 = require_languages();
      var stop_words_1 = require_stop_words();
      var utils_1 = require_utils();
      var tokenizer_2 = require_tokenizer();
      Object.defineProperty(exports, "tokenize", { enumerable: true, get: function() {
        return tokenizer_2.tokenize;
      } });
      var utils_2 = require_utils();
      Object.defineProperty(exports, "formatNanoseconds", { enumerable: true, get: function() {
        return utils_2.formatNanoseconds;
      } });
      var SUPPORTED_HOOKS = ["afterInsert"];
      function validateHooks(hooks) {
        if (hooks) {
          if (typeof hooks !== "object") {
            throw new Error(ERRORS.INVALID_HOOKS_OBJECT());
          }
          const invalidHooks = Object.keys(hooks).filter((hook) => !(0, utils_1.includes)(SUPPORTED_HOOKS, hook));
          if (invalidHooks.length) {
            throw new Error(ERRORS.NON_SUPPORTED_HOOKS(invalidHooks));
          }
        }
      }
      async function hookRunner(funcs, ...args) {
        const hooks = Array.isArray(funcs) ? funcs : [funcs];
        for (let i = 0; i < hooks.length; i++) {
          await hooks[i].apply(this, args);
        }
      }
      function buildIndex(lyra2, schema, prefix = "") {
        for (const prop of Object.keys(schema)) {
          const propType = typeof prop;
          const isNested = typeof schema[prop] === "object";
          if (propType !== "string")
            throw new Error(ERRORS.INVALID_SCHEMA_TYPE(propType));
          const propName = `${prefix}${prop}`;
          if (isNested) {
            buildIndex(lyra2, schema[prop], `${propName}.`);
          } else {
            lyra2.index[propName] = (0, node_1.create)();
          }
        }
      }
      function recursiveCheckDocSchema(newDoc, schema) {
        for (const key in newDoc) {
          if (!(key in schema)) {
            continue;
          }
          const propType = typeof newDoc[key];
          if (propType === "object") {
            recursiveCheckDocSchema(newDoc[key], schema);
          } else if (typeof newDoc[key] !== schema[key]) {
            return false;
          }
        }
        return true;
      }
      function recursiveTrieInsertion(lyra2, doc, id, config, prefix = "", tokenizerConfig, schema = lyra2.schema) {
        const { index, nodes, frequencies, tokenOccurrencies } = lyra2;
        for (const key of Object.keys(doc)) {
          const isNested = typeof doc[key] === "object";
          const isSchemaNested = typeof schema[key] == "object";
          const propName = `${prefix}${key}`;
          if (isNested && key in schema && isSchemaNested) {
            recursiveTrieInsertion(lyra2, doc[key], id, config, propName + ".", tokenizerConfig, schema[key]);
          }
          if (typeof doc[key] === "string" && key in schema && !isSchemaNested) {
            const requestedTrie = index[propName];
            const tokens = tokenizerConfig.tokenizerFn(doc[key], config.language, false, tokenizerConfig);
            if (!(propName in frequencies)) {
              frequencies[propName] = {};
            }
            if (!(propName in tokenOccurrencies)) {
              tokenOccurrencies[propName] = {};
            }
            if (!(id in frequencies[propName])) {
              frequencies[propName][id] = {};
            }
            for (const token of tokens) {
              let tokenFrequency = 0;
              for (const t of tokens) {
                if (t === token) {
                  tokenFrequency++;
                }
              }
              const tf = tokenFrequency / tokens.length;
              frequencies[propName][id][token] = tf;
              if (!(token in tokenOccurrencies[propName])) {
                tokenOccurrencies[propName][token] = 0;
              }
              tokenOccurrencies[propName][token]++;
              (0, trie_1.insert)(nodes, requestedTrie, token, id);
            }
          }
        }
      }
      function getIndices(lyra2, indices) {
        const knownIndices = Object.keys(lyra2.index);
        if (!indices) {
          return knownIndices;
        }
        if (typeof indices === "string") {
          if (indices !== "*") {
            throw new Error(ERRORS.INVALID_PROPERTY(indices, knownIndices));
          }
          return knownIndices;
        }
        for (const index of indices) {
          if (!(0, utils_1.includes)(knownIndices, index)) {
            throw new Error(ERRORS.INVALID_PROPERTY(index, knownIndices));
          }
        }
        return indices;
      }
      function getDocumentIDsFromSearch(lyra2, params) {
        const idx = lyra2.index[params.index];
        const searchResult = (0, trie_1.find)(lyra2.nodes, idx, {
          term: params.term,
          exact: params.exact,
          tolerance: params.tolerance
        });
        const ids = /* @__PURE__ */ new Set();
        for (const key in searchResult) {
          for (const id of searchResult[key]) {
            ids.add(id);
          }
        }
        return Array.from(ids);
      }
      function assertSupportedLanguage(language) {
        if (!(0, utils_1.includes)(languages_1.SUPPORTED_LANGUAGES, language)) {
          throw new Error(ERRORS.LANGUAGE_NOT_SUPPORTED(language));
        }
      }
      function assertDocSchema(doc, lyraSchema) {
        if (!recursiveCheckDocSchema(doc, lyraSchema)) {
          throw new Error(ERRORS.INVALID_DOC_SCHEMA(lyraSchema, doc));
        }
      }
      function create2(properties) {
        var _a, _b, _c;
        const defaultLanguage = (_b = (_a = properties === null || properties === void 0 ? void 0 : properties.defaultLanguage) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : "english";
        assertSupportedLanguage(defaultLanguage);
        validateHooks(properties.hooks);
        const instance = {
          defaultLanguage,
          schema: properties.schema,
          docs: {},
          nodes: {},
          index: {},
          hooks: properties.hooks || {},
          edge: (_c = properties.edge) !== null && _c !== void 0 ? _c : false,
          tokenizer: defaultTokenizerConfig(defaultLanguage, properties.tokenizer),
          frequencies: {},
          tokenOccurrencies: {}
        };
        buildIndex(instance, properties.schema);
        return instance;
      }
      exports.create = create2;
      function insert(lyra2, doc, config) {
        config = { language: lyra2.defaultLanguage, ...config };
        const id = (0, utils_1.uniqueId)();
        assertSupportedLanguage(config.language);
        assertDocSchema(doc, lyra2.schema);
        lyra2.docs[id] = doc;
        recursiveTrieInsertion(lyra2, doc, id, config, void 0, lyra2.tokenizer);
        (0, insertion_checker_1.trackInsertion)(lyra2);
        return { id };
      }
      exports.insert = insert;
      async function insertWithHooks(lyra2, doc, config) {
        config = { language: lyra2.defaultLanguage, ...config };
        const id = (0, utils_1.uniqueId)();
        assertSupportedLanguage(config.language);
        assertDocSchema(doc, lyra2.schema);
        lyra2.docs[id] = doc;
        recursiveTrieInsertion(lyra2, doc, id, config, void 0, lyra2.tokenizer);
        (0, insertion_checker_1.trackInsertion)(lyra2);
        if (lyra2.hooks.afterInsert) {
          await hookRunner.call(lyra2, lyra2.hooks.afterInsert, id);
        }
        return { id };
      }
      exports.insertWithHooks = insertWithHooks;
      async function insertBatch(lyra2, docs, config) {
        var _a;
        const batchSize = (_a = config === null || config === void 0 ? void 0 : config.batchSize) !== null && _a !== void 0 ? _a : 1e3;
        return new Promise((resolve, reject) => {
          let i = 0;
          async function insertBatch2() {
            const batch = docs.slice(i * batchSize, (i + 1) * batchSize);
            i++;
            if (!batch.length) {
              return resolve();
            }
            for (const line of batch) {
              try {
                await insertWithHooks(lyra2, line, config);
              } catch (err) {
                reject(err);
              }
            }
            setTimeout(insertBatch2, 0);
          }
          setTimeout(insertBatch2, 0);
        });
      }
      exports.insertBatch = insertBatch;
      function remove(lyra2, docID) {
        if (!lyra2.tokenizer) {
          lyra2.tokenizer = defaultTokenizerConfig(lyra2.defaultLanguage);
        }
        if (!(docID in lyra2.docs)) {
          throw new Error(ERRORS.DOC_ID_DOES_NOT_EXISTS(docID));
        }
        const document = lyra2.docs[docID] || {};
        const documentKeys = Object.keys(document || {});
        const documentKeysLength = documentKeys.length;
        for (let i = 0; i < documentKeysLength; i++) {
          const key = documentKeys[i];
          const propertyType = lyra2.schema[key];
          if (propertyType === "string") {
            const idx = lyra2.index[key];
            const tokens = lyra2.tokenizer.tokenizerFn(document[key], lyra2.defaultLanguage, false, lyra2.tokenizer);
            const tokensLength = tokens.length;
            for (let k = 0; k < tokensLength; k++) {
              const token = tokens[k];
              delete lyra2.frequencies[key][docID];
              lyra2.tokenOccurrencies[key][token]--;
              if (token && (0, trie_1.removeDocumentByWord)(lyra2.nodes, idx, token, docID)) {
                throw new Error(ERRORS.CANT_DELETE_DOCUMENT(docID, key, token));
              }
            }
          }
        }
        lyra2.docs[docID] = void 0;
        return true;
      }
      exports.remove = remove;
      function search(lyra2, params, language) {
        var _a, _b;
        if (!language) {
          language = lyra2.defaultLanguage;
        }
        if (!lyra2.tokenizer) {
          lyra2.tokenizer = defaultTokenizerConfig(language);
        }
        const { limit = 10, offset = 0, exact = false, term, properties } = params;
        const tokens = lyra2.tokenizer.tokenizerFn(term, language, false, lyra2.tokenizer);
        const indices = getIndices(lyra2, properties);
        const results = Array.from({
          length: limit
        });
        const timeStart = (0, utils_1.getNanosecondsTime)();
        const uniqueDocsIDs = /* @__PURE__ */ new Map();
        const indexMap = {};
        const docsIntersection = {};
        for (const index of indices) {
          const tokensMap = {};
          for (const token of tokens) {
            tokensMap[token] = [];
          }
          indexMap[index] = tokensMap;
          docsIntersection[index] = [];
        }
        const N = Object.keys(lyra2.docs).length;
        const indexesLength = indices.length;
        for (let i = 0; i < indexesLength; i++) {
          const index = indices[i];
          if (!(index in lyra2.tokenOccurrencies))
            continue;
          const lyraOccurrencies = lyra2.tokenOccurrencies[index];
          const lyraFrequencies = lyra2.frequencies[index];
          const tokensLength = tokens.length;
          for (let j = 0; j < tokensLength; j++) {
            const term2 = tokens[j];
            const documentIDs = getDocumentIDsFromSearch(lyra2, { ...params, index, term: term2, exact });
            const termOccurrencies = lyraOccurrencies[term2];
            const orderedTFIDFList = [];
            const documentIDsLength = documentIDs.length;
            for (let k = 0; k < documentIDsLength; k++) {
              const id = documentIDs[k];
              const idf = Math.log10(N / termOccurrencies);
              const tfIdf = idf * ((_b = (_a = lyraFrequencies === null || lyraFrequencies === void 0 ? void 0 : lyraFrequencies[id]) === null || _a === void 0 ? void 0 : _a[term2]) !== null && _b !== void 0 ? _b : 0);
              (0, utils_1.insertSortedValue)(orderedTFIDFList, [id, tfIdf], utils_1.sortTokenScorePredicate);
            }
            indexMap[index][term2].push(...orderedTFIDFList);
          }
          const docIds = indexMap[index];
          const vals = Object.values(docIds);
          docsIntersection[index] = (0, utils_1.intersectTokenScores)(vals);
          const uniqueDocs = Object.values(docsIntersection[index]);
          const uniqueDocsLength = uniqueDocs.length;
          for (let i2 = 0; i2 < uniqueDocsLength; i2++) {
            const [id, tfIdfScore] = uniqueDocs[i2];
            if (uniqueDocsIDs.has(id)) {
              const prevScore = uniqueDocsIDs.get(id);
              uniqueDocsIDs.set(id, prevScore + tfIdfScore);
            } else {
              uniqueDocsIDs.set(id, tfIdfScore);
            }
          }
        }
        const uniqueDocsArray = Array.from(uniqueDocsIDs.entries()).sort(utils_1.sortTokenScorePredicate);
        const resultIDs = /* @__PURE__ */ new Set();
        for (let i = offset; i < limit + offset; i++) {
          const idAndScore = uniqueDocsArray[i];
          if (typeof idAndScore === "undefined") {
            break;
          }
          const [id, score] = idAndScore;
          if (!resultIDs.has(id)) {
            const fullDoc = lyra2.docs[id];
            results[i] = { id, score, document: fullDoc };
            resultIDs.add(id);
          }
        }
        const hits = results.filter(Boolean);
        return {
          elapsed: (0, utils_1.getNanosecondsTime)() - timeStart,
          hits,
          count: uniqueDocsIDs.size
        };
      }
      exports.search = search;
      function save(lyra2) {
        return {
          index: lyra2.index,
          docs: lyra2.docs,
          nodes: lyra2.nodes,
          schema: lyra2.schema,
          frequencies: lyra2.frequencies,
          tokenOccurrencies: lyra2.tokenOccurrencies
        };
      }
      exports.save = save;
      function load(lyra2, { index, docs, nodes, schema, frequencies, tokenOccurrencies }) {
        if (!lyra2.edge) {
          throw new Error(ERRORS.GETTER_SETTER_WORKS_ON_EDGE_ONLY("load"));
        }
        lyra2.index = index;
        lyra2.docs = docs;
        lyra2.nodes = nodes;
        lyra2.schema = schema;
        lyra2.frequencies = frequencies;
        lyra2.tokenOccurrencies = tokenOccurrencies;
      }
      exports.load = load;
      function defaultTokenizerConfig(language, tokenizerConfig = {}) {
        var _a, _b, _c;
        let defaultStopWords = [];
        let customStopWords = [];
        let defaultStemmingFn;
        let defaultTokenizerFn = tokenizer_1.tokenize;
        if (tokenizerConfig === null || tokenizerConfig === void 0 ? void 0 : tokenizerConfig.tokenizerFn) {
          if (typeof tokenizerConfig.tokenizerFn !== "function") {
            throw Error(ERRORS.INVALID_TOKENIZER_FUNCTION());
          }
          defaultTokenizerFn = tokenizerConfig.tokenizerFn;
        } else {
          if (tokenizerConfig === null || tokenizerConfig === void 0 ? void 0 : tokenizerConfig.stemmingFn) {
            if (typeof tokenizerConfig.stemmingFn !== "function") {
              throw Error(ERRORS.INVALID_STEMMER_FUNCTION_TYPE());
            }
            defaultStemmingFn = tokenizerConfig.stemmingFn;
          } else {
            defaultStemmingFn = en_1.stemmer;
          }
          if ((0, utils_1.includes)(stop_words_1.availableStopWords, language)) {
            defaultStopWords = (_a = stop_words_1.stopWords[language]) !== null && _a !== void 0 ? _a : [];
          }
          if (tokenizerConfig === null || tokenizerConfig === void 0 ? void 0 : tokenizerConfig.customStopWords) {
            switch (typeof tokenizerConfig.customStopWords) {
              case "function":
                customStopWords = tokenizerConfig.customStopWords(defaultStopWords);
                break;
              case "object":
                if (!Array.isArray(tokenizerConfig.customStopWords)) {
                  throw Error(ERRORS.CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY());
                }
                customStopWords = tokenizerConfig.customStopWords;
                if (customStopWords.some((x) => typeof x !== "string")) {
                  throw Error(ERRORS.CUSTOM_STOP_WORDS_ARRAY_MUST_BE_STRING_ARRAY());
                }
                break;
              default:
                throw Error(ERRORS.CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY());
            }
          }
        }
        return {
          enableStopWords: (_b = tokenizerConfig === null || tokenizerConfig === void 0 ? void 0 : tokenizerConfig.enableStopWords) !== null && _b !== void 0 ? _b : true,
          enableStemming: (_c = tokenizerConfig === null || tokenizerConfig === void 0 ? void 0 : tokenizerConfig.enableStemming) !== null && _c !== void 0 ? _c : true,
          stemmingFn: defaultStemmingFn,
          customStopWords: customStopWords !== null && customStopWords !== void 0 ? customStopWords : defaultStopWords,
          tokenizerFn: defaultTokenizerFn
        };
      }
      exports.defaultTokenizerConfig = defaultTokenizerConfig;
    }
  });

  // node_modules/dompurify/dist/purify.js
  var require_purify = __commonJS({
    "node_modules/dompurify/dist/purify.js"(exports, module) {
      (function(global, factory) {
        typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, global.DOMPurify = factory());
      })(exports, function() {
        "use strict";
        function _typeof(obj) {
          "@babel/helpers - typeof";
          return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(obj2) {
            return typeof obj2;
          } : function(obj2) {
            return obj2 && "function" == typeof Symbol && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
          }, _typeof(obj);
        }
        function _setPrototypeOf(o, p) {
          _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf2(o2, p2) {
            o2.__proto__ = p2;
            return o2;
          };
          return _setPrototypeOf(o, p);
        }
        function _isNativeReflectConstruct() {
          if (typeof Reflect === "undefined" || !Reflect.construct)
            return false;
          if (Reflect.construct.sham)
            return false;
          if (typeof Proxy === "function")
            return true;
          try {
            Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
            }));
            return true;
          } catch (e) {
            return false;
          }
        }
        function _construct(Parent, args, Class) {
          if (_isNativeReflectConstruct()) {
            _construct = Reflect.construct;
          } else {
            _construct = function _construct2(Parent2, args2, Class2) {
              var a = [null];
              a.push.apply(a, args2);
              var Constructor = Function.bind.apply(Parent2, a);
              var instance = new Constructor();
              if (Class2)
                _setPrototypeOf(instance, Class2.prototype);
              return instance;
            };
          }
          return _construct.apply(null, arguments);
        }
        function _toConsumableArray(arr) {
          return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
        }
        function _arrayWithoutHoles(arr) {
          if (Array.isArray(arr))
            return _arrayLikeToArray(arr);
        }
        function _iterableToArray(iter) {
          if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null)
            return Array.from(iter);
        }
        function _unsupportedIterableToArray(o, minLen) {
          if (!o)
            return;
          if (typeof o === "string")
            return _arrayLikeToArray(o, minLen);
          var n = Object.prototype.toString.call(o).slice(8, -1);
          if (n === "Object" && o.constructor)
            n = o.constructor.name;
          if (n === "Map" || n === "Set")
            return Array.from(o);
          if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))
            return _arrayLikeToArray(o, minLen);
        }
        function _arrayLikeToArray(arr, len) {
          if (len == null || len > arr.length)
            len = arr.length;
          for (var i = 0, arr2 = new Array(len); i < len; i++)
            arr2[i] = arr[i];
          return arr2;
        }
        function _nonIterableSpread() {
          throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
        }
        var hasOwnProperty = Object.hasOwnProperty, setPrototypeOf = Object.setPrototypeOf, isFrozen = Object.isFrozen, getPrototypeOf = Object.getPrototypeOf, getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
        var freeze = Object.freeze, seal = Object.seal, create2 = Object.create;
        var _ref = typeof Reflect !== "undefined" && Reflect, apply = _ref.apply, construct = _ref.construct;
        if (!apply) {
          apply = function apply2(fun, thisValue, args) {
            return fun.apply(thisValue, args);
          };
        }
        if (!freeze) {
          freeze = function freeze2(x) {
            return x;
          };
        }
        if (!seal) {
          seal = function seal2(x) {
            return x;
          };
        }
        if (!construct) {
          construct = function construct2(Func, args) {
            return _construct(Func, _toConsumableArray(args));
          };
        }
        var arrayForEach = unapply(Array.prototype.forEach);
        var arrayPop = unapply(Array.prototype.pop);
        var arrayPush = unapply(Array.prototype.push);
        var stringToLowerCase = unapply(String.prototype.toLowerCase);
        var stringToString = unapply(String.prototype.toString);
        var stringMatch = unapply(String.prototype.match);
        var stringReplace = unapply(String.prototype.replace);
        var stringIndexOf = unapply(String.prototype.indexOf);
        var stringTrim = unapply(String.prototype.trim);
        var regExpTest = unapply(RegExp.prototype.test);
        var typeErrorCreate = unconstruct(TypeError);
        function unapply(func) {
          return function(thisArg) {
            for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
              args[_key - 1] = arguments[_key];
            }
            return apply(func, thisArg, args);
          };
        }
        function unconstruct(func) {
          return function() {
            for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
              args[_key2] = arguments[_key2];
            }
            return construct(func, args);
          };
        }
        function addToSet(set, array, transformCaseFunc) {
          transformCaseFunc = transformCaseFunc ? transformCaseFunc : stringToLowerCase;
          if (setPrototypeOf) {
            setPrototypeOf(set, null);
          }
          var l = array.length;
          while (l--) {
            var element = array[l];
            if (typeof element === "string") {
              var lcElement = transformCaseFunc(element);
              if (lcElement !== element) {
                if (!isFrozen(array)) {
                  array[l] = lcElement;
                }
                element = lcElement;
              }
            }
            set[element] = true;
          }
          return set;
        }
        function clone(object) {
          var newObject = create2(null);
          var property;
          for (property in object) {
            if (apply(hasOwnProperty, object, [property])) {
              newObject[property] = object[property];
            }
          }
          return newObject;
        }
        function lookupGetter(object, prop) {
          while (object !== null) {
            var desc = getOwnPropertyDescriptor(object, prop);
            if (desc) {
              if (desc.get) {
                return unapply(desc.get);
              }
              if (typeof desc.value === "function") {
                return unapply(desc.value);
              }
            }
            object = getPrototypeOf(object);
          }
          function fallbackValue(element) {
            console.warn("fallback value for", element);
            return null;
          }
          return fallbackValue;
        }
        var html$1 = freeze(["a", "abbr", "acronym", "address", "area", "article", "aside", "audio", "b", "bdi", "bdo", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "content", "data", "datalist", "dd", "decorator", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "element", "em", "fieldset", "figcaption", "figure", "font", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "map", "mark", "marquee", "menu", "menuitem", "meter", "nav", "nobr", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "section", "select", "shadow", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "tt", "u", "ul", "var", "video", "wbr"]);
        var svg$1 = freeze(["svg", "a", "altglyph", "altglyphdef", "altglyphitem", "animatecolor", "animatemotion", "animatetransform", "circle", "clippath", "defs", "desc", "ellipse", "filter", "font", "g", "glyph", "glyphref", "hkern", "image", "line", "lineargradient", "marker", "mask", "metadata", "mpath", "path", "pattern", "polygon", "polyline", "radialgradient", "rect", "stop", "style", "switch", "symbol", "text", "textpath", "title", "tref", "tspan", "view", "vkern"]);
        var svgFilters = freeze(["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence"]);
        var svgDisallowed = freeze(["animate", "color-profile", "cursor", "discard", "fedropshadow", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignobject", "hatch", "hatchpath", "mesh", "meshgradient", "meshpatch", "meshrow", "missing-glyph", "script", "set", "solidcolor", "unknown", "use"]);
        var mathMl$1 = freeze(["math", "menclose", "merror", "mfenced", "mfrac", "mglyph", "mi", "mlabeledtr", "mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mroot", "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msup", "msubsup", "mtable", "mtd", "mtext", "mtr", "munder", "munderover"]);
        var mathMlDisallowed = freeze(["maction", "maligngroup", "malignmark", "mlongdiv", "mscarries", "mscarry", "msgroup", "mstack", "msline", "msrow", "semantics", "annotation", "annotation-xml", "mprescripts", "none"]);
        var text = freeze(["#text"]);
        var html = freeze(["accept", "action", "align", "alt", "autocapitalize", "autocomplete", "autopictureinpicture", "autoplay", "background", "bgcolor", "border", "capture", "cellpadding", "cellspacing", "checked", "cite", "class", "clear", "color", "cols", "colspan", "controls", "controlslist", "coords", "crossorigin", "datetime", "decoding", "default", "dir", "disabled", "disablepictureinpicture", "disableremoteplayback", "download", "draggable", "enctype", "enterkeyhint", "face", "for", "headers", "height", "hidden", "high", "href", "hreflang", "id", "inputmode", "integrity", "ismap", "kind", "label", "lang", "list", "loading", "loop", "low", "max", "maxlength", "media", "method", "min", "minlength", "multiple", "muted", "name", "nonce", "noshade", "novalidate", "nowrap", "open", "optimum", "pattern", "placeholder", "playsinline", "poster", "preload", "pubdate", "radiogroup", "readonly", "rel", "required", "rev", "reversed", "role", "rows", "rowspan", "spellcheck", "scope", "selected", "shape", "size", "sizes", "span", "srclang", "start", "src", "srcset", "step", "style", "summary", "tabindex", "title", "translate", "type", "usemap", "valign", "value", "width", "xmlns", "slot"]);
        var svg = freeze(["accent-height", "accumulate", "additive", "alignment-baseline", "ascent", "attributename", "attributetype", "azimuth", "basefrequency", "baseline-shift", "begin", "bias", "by", "class", "clip", "clippathunits", "clip-path", "clip-rule", "color", "color-interpolation", "color-interpolation-filters", "color-profile", "color-rendering", "cx", "cy", "d", "dx", "dy", "diffuseconstant", "direction", "display", "divisor", "dur", "edgemode", "elevation", "end", "fill", "fill-opacity", "fill-rule", "filter", "filterunits", "flood-color", "flood-opacity", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-weight", "fx", "fy", "g1", "g2", "glyph-name", "glyphref", "gradientunits", "gradienttransform", "height", "href", "id", "image-rendering", "in", "in2", "k", "k1", "k2", "k3", "k4", "kerning", "keypoints", "keysplines", "keytimes", "lang", "lengthadjust", "letter-spacing", "kernelmatrix", "kernelunitlength", "lighting-color", "local", "marker-end", "marker-mid", "marker-start", "markerheight", "markerunits", "markerwidth", "maskcontentunits", "maskunits", "max", "mask", "media", "method", "mode", "min", "name", "numoctaves", "offset", "operator", "opacity", "order", "orient", "orientation", "origin", "overflow", "paint-order", "path", "pathlength", "patterncontentunits", "patterntransform", "patternunits", "points", "preservealpha", "preserveaspectratio", "primitiveunits", "r", "rx", "ry", "radius", "refx", "refy", "repeatcount", "repeatdur", "restart", "result", "rotate", "scale", "seed", "shape-rendering", "specularconstant", "specularexponent", "spreadmethod", "startoffset", "stddeviation", "stitchtiles", "stop-color", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke", "stroke-width", "style", "surfacescale", "systemlanguage", "tabindex", "targetx", "targety", "transform", "transform-origin", "text-anchor", "text-decoration", "text-rendering", "textlength", "type", "u1", "u2", "unicode", "values", "viewbox", "visibility", "version", "vert-adv-y", "vert-origin-x", "vert-origin-y", "width", "word-spacing", "wrap", "writing-mode", "xchannelselector", "ychannelselector", "x", "x1", "x2", "xmlns", "y", "y1", "y2", "z", "zoomandpan"]);
        var mathMl = freeze(["accent", "accentunder", "align", "bevelled", "close", "columnsalign", "columnlines", "columnspan", "denomalign", "depth", "dir", "display", "displaystyle", "encoding", "fence", "frame", "height", "href", "id", "largeop", "length", "linethickness", "lspace", "lquote", "mathbackground", "mathcolor", "mathsize", "mathvariant", "maxsize", "minsize", "movablelimits", "notation", "numalign", "open", "rowalign", "rowlines", "rowspacing", "rowspan", "rspace", "rquote", "scriptlevel", "scriptminsize", "scriptsizemultiplier", "selection", "separator", "separators", "stretchy", "subscriptshift", "supscriptshift", "symmetric", "voffset", "width", "xmlns"]);
        var xml = freeze(["xlink:href", "xml:id", "xlink:title", "xml:space", "xmlns:xlink"]);
        var MUSTACHE_EXPR = seal(/\{\{[\w\W]*|[\w\W]*\}\}/gm);
        var ERB_EXPR = seal(/<%[\w\W]*|[\w\W]*%>/gm);
        var TMPLIT_EXPR = seal(/\${[\w\W]*}/gm);
        var DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]/);
        var ARIA_ATTR = seal(/^aria-[\-\w]+$/);
        var IS_ALLOWED_URI = seal(
          /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
        );
        var IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
        var ATTR_WHITESPACE = seal(
          /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g
        );
        var DOCTYPE_NAME = seal(/^html$/i);
        var getGlobal = function getGlobal2() {
          return typeof window === "undefined" ? null : window;
        };
        var _createTrustedTypesPolicy = function _createTrustedTypesPolicy2(trustedTypes, document) {
          if (_typeof(trustedTypes) !== "object" || typeof trustedTypes.createPolicy !== "function") {
            return null;
          }
          var suffix = null;
          var ATTR_NAME = "data-tt-policy-suffix";
          if (document.currentScript && document.currentScript.hasAttribute(ATTR_NAME)) {
            suffix = document.currentScript.getAttribute(ATTR_NAME);
          }
          var policyName = "dompurify" + (suffix ? "#" + suffix : "");
          try {
            return trustedTypes.createPolicy(policyName, {
              createHTML: function createHTML(html2) {
                return html2;
              },
              createScriptURL: function createScriptURL(scriptUrl) {
                return scriptUrl;
              }
            });
          } catch (_) {
            console.warn("TrustedTypes policy " + policyName + " could not be created.");
            return null;
          }
        };
        function createDOMPurify() {
          var window2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : getGlobal();
          var DOMPurify2 = function DOMPurify3(root) {
            return createDOMPurify(root);
          };
          DOMPurify2.version = "2.4.1";
          DOMPurify2.removed = [];
          if (!window2 || !window2.document || window2.document.nodeType !== 9) {
            DOMPurify2.isSupported = false;
            return DOMPurify2;
          }
          var originalDocument = window2.document;
          var document = window2.document;
          var DocumentFragment = window2.DocumentFragment, HTMLTemplateElement = window2.HTMLTemplateElement, Node = window2.Node, Element = window2.Element, NodeFilter = window2.NodeFilter, _window$NamedNodeMap = window2.NamedNodeMap, NamedNodeMap = _window$NamedNodeMap === void 0 ? window2.NamedNodeMap || window2.MozNamedAttrMap : _window$NamedNodeMap, HTMLFormElement = window2.HTMLFormElement, DOMParser = window2.DOMParser, trustedTypes = window2.trustedTypes;
          var ElementPrototype = Element.prototype;
          var cloneNode = lookupGetter(ElementPrototype, "cloneNode");
          var getNextSibling = lookupGetter(ElementPrototype, "nextSibling");
          var getChildNodes = lookupGetter(ElementPrototype, "childNodes");
          var getParentNode = lookupGetter(ElementPrototype, "parentNode");
          if (typeof HTMLTemplateElement === "function") {
            var template = document.createElement("template");
            if (template.content && template.content.ownerDocument) {
              document = template.content.ownerDocument;
            }
          }
          var trustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, originalDocument);
          var emptyHTML = trustedTypesPolicy ? trustedTypesPolicy.createHTML("") : "";
          var _document = document, implementation = _document.implementation, createNodeIterator = _document.createNodeIterator, createDocumentFragment = _document.createDocumentFragment, getElementsByTagName = _document.getElementsByTagName;
          var importNode = originalDocument.importNode;
          var documentMode = {};
          try {
            documentMode = clone(document).documentMode ? document.documentMode : {};
          } catch (_) {
          }
          var hooks = {};
          DOMPurify2.isSupported = typeof getParentNode === "function" && implementation && typeof implementation.createHTMLDocument !== "undefined" && documentMode !== 9;
          var MUSTACHE_EXPR$1 = MUSTACHE_EXPR, ERB_EXPR$1 = ERB_EXPR, TMPLIT_EXPR$1 = TMPLIT_EXPR, DATA_ATTR$1 = DATA_ATTR, ARIA_ATTR$1 = ARIA_ATTR, IS_SCRIPT_OR_DATA$1 = IS_SCRIPT_OR_DATA, ATTR_WHITESPACE$1 = ATTR_WHITESPACE;
          var IS_ALLOWED_URI$1 = IS_ALLOWED_URI;
          var ALLOWED_TAGS = null;
          var DEFAULT_ALLOWED_TAGS = addToSet({}, [].concat(_toConsumableArray(html$1), _toConsumableArray(svg$1), _toConsumableArray(svgFilters), _toConsumableArray(mathMl$1), _toConsumableArray(text)));
          var ALLOWED_ATTR = null;
          var DEFAULT_ALLOWED_ATTR = addToSet({}, [].concat(_toConsumableArray(html), _toConsumableArray(svg), _toConsumableArray(mathMl), _toConsumableArray(xml)));
          var CUSTOM_ELEMENT_HANDLING = Object.seal(Object.create(null, {
            tagNameCheck: {
              writable: true,
              configurable: false,
              enumerable: true,
              value: null
            },
            attributeNameCheck: {
              writable: true,
              configurable: false,
              enumerable: true,
              value: null
            },
            allowCustomizedBuiltInElements: {
              writable: true,
              configurable: false,
              enumerable: true,
              value: false
            }
          }));
          var FORBID_TAGS = null;
          var FORBID_ATTR = null;
          var ALLOW_ARIA_ATTR = true;
          var ALLOW_DATA_ATTR = true;
          var ALLOW_UNKNOWN_PROTOCOLS = false;
          var SAFE_FOR_TEMPLATES = false;
          var WHOLE_DOCUMENT = false;
          var SET_CONFIG = false;
          var FORCE_BODY = false;
          var RETURN_DOM = false;
          var RETURN_DOM_FRAGMENT = false;
          var RETURN_TRUSTED_TYPE = false;
          var SANITIZE_DOM = true;
          var SANITIZE_NAMED_PROPS = false;
          var SANITIZE_NAMED_PROPS_PREFIX = "user-content-";
          var KEEP_CONTENT = true;
          var IN_PLACE = false;
          var USE_PROFILES = {};
          var FORBID_CONTENTS = null;
          var DEFAULT_FORBID_CONTENTS = addToSet({}, ["annotation-xml", "audio", "colgroup", "desc", "foreignobject", "head", "iframe", "math", "mi", "mn", "mo", "ms", "mtext", "noembed", "noframes", "noscript", "plaintext", "script", "style", "svg", "template", "thead", "title", "video", "xmp"]);
          var DATA_URI_TAGS = null;
          var DEFAULT_DATA_URI_TAGS = addToSet({}, ["audio", "video", "img", "source", "image", "track"]);
          var URI_SAFE_ATTRIBUTES = null;
          var DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, ["alt", "class", "for", "id", "label", "name", "pattern", "placeholder", "role", "summary", "title", "value", "style", "xmlns"]);
          var MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
          var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
          var HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
          var NAMESPACE = HTML_NAMESPACE;
          var IS_EMPTY_INPUT = false;
          var ALLOWED_NAMESPACES = null;
          var DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [MATHML_NAMESPACE, SVG_NAMESPACE, HTML_NAMESPACE], stringToString);
          var PARSER_MEDIA_TYPE;
          var SUPPORTED_PARSER_MEDIA_TYPES = ["application/xhtml+xml", "text/html"];
          var DEFAULT_PARSER_MEDIA_TYPE = "text/html";
          var transformCaseFunc;
          var CONFIG = null;
          var formElement = document.createElement("form");
          var isRegexOrFunction = function isRegexOrFunction2(testValue) {
            return testValue instanceof RegExp || testValue instanceof Function;
          };
          var _parseConfig = function _parseConfig2(cfg) {
            if (CONFIG && CONFIG === cfg) {
              return;
            }
            if (!cfg || _typeof(cfg) !== "object") {
              cfg = {};
            }
            cfg = clone(cfg);
            PARSER_MEDIA_TYPE = SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? PARSER_MEDIA_TYPE = DEFAULT_PARSER_MEDIA_TYPE : PARSER_MEDIA_TYPE = cfg.PARSER_MEDIA_TYPE;
            transformCaseFunc = PARSER_MEDIA_TYPE === "application/xhtml+xml" ? stringToString : stringToLowerCase;
            ALLOWED_TAGS = "ALLOWED_TAGS" in cfg ? addToSet({}, cfg.ALLOWED_TAGS, transformCaseFunc) : DEFAULT_ALLOWED_TAGS;
            ALLOWED_ATTR = "ALLOWED_ATTR" in cfg ? addToSet({}, cfg.ALLOWED_ATTR, transformCaseFunc) : DEFAULT_ALLOWED_ATTR;
            ALLOWED_NAMESPACES = "ALLOWED_NAMESPACES" in cfg ? addToSet({}, cfg.ALLOWED_NAMESPACES, stringToString) : DEFAULT_ALLOWED_NAMESPACES;
            URI_SAFE_ATTRIBUTES = "ADD_URI_SAFE_ATTR" in cfg ? addToSet(
              clone(DEFAULT_URI_SAFE_ATTRIBUTES),
              cfg.ADD_URI_SAFE_ATTR,
              transformCaseFunc
            ) : DEFAULT_URI_SAFE_ATTRIBUTES;
            DATA_URI_TAGS = "ADD_DATA_URI_TAGS" in cfg ? addToSet(
              clone(DEFAULT_DATA_URI_TAGS),
              cfg.ADD_DATA_URI_TAGS,
              transformCaseFunc
            ) : DEFAULT_DATA_URI_TAGS;
            FORBID_CONTENTS = "FORBID_CONTENTS" in cfg ? addToSet({}, cfg.FORBID_CONTENTS, transformCaseFunc) : DEFAULT_FORBID_CONTENTS;
            FORBID_TAGS = "FORBID_TAGS" in cfg ? addToSet({}, cfg.FORBID_TAGS, transformCaseFunc) : {};
            FORBID_ATTR = "FORBID_ATTR" in cfg ? addToSet({}, cfg.FORBID_ATTR, transformCaseFunc) : {};
            USE_PROFILES = "USE_PROFILES" in cfg ? cfg.USE_PROFILES : false;
            ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false;
            ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false;
            ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false;
            SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false;
            WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false;
            RETURN_DOM = cfg.RETURN_DOM || false;
            RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false;
            RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false;
            FORCE_BODY = cfg.FORCE_BODY || false;
            SANITIZE_DOM = cfg.SANITIZE_DOM !== false;
            SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false;
            KEEP_CONTENT = cfg.KEEP_CONTENT !== false;
            IN_PLACE = cfg.IN_PLACE || false;
            IS_ALLOWED_URI$1 = cfg.ALLOWED_URI_REGEXP || IS_ALLOWED_URI$1;
            NAMESPACE = cfg.NAMESPACE || HTML_NAMESPACE;
            if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck)) {
              CUSTOM_ELEMENT_HANDLING.tagNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck;
            }
            if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)) {
              CUSTOM_ELEMENT_HANDLING.attributeNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck;
            }
            if (cfg.CUSTOM_ELEMENT_HANDLING && typeof cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements === "boolean") {
              CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements;
            }
            if (SAFE_FOR_TEMPLATES) {
              ALLOW_DATA_ATTR = false;
            }
            if (RETURN_DOM_FRAGMENT) {
              RETURN_DOM = true;
            }
            if (USE_PROFILES) {
              ALLOWED_TAGS = addToSet({}, _toConsumableArray(text));
              ALLOWED_ATTR = [];
              if (USE_PROFILES.html === true) {
                addToSet(ALLOWED_TAGS, html$1);
                addToSet(ALLOWED_ATTR, html);
              }
              if (USE_PROFILES.svg === true) {
                addToSet(ALLOWED_TAGS, svg$1);
                addToSet(ALLOWED_ATTR, svg);
                addToSet(ALLOWED_ATTR, xml);
              }
              if (USE_PROFILES.svgFilters === true) {
                addToSet(ALLOWED_TAGS, svgFilters);
                addToSet(ALLOWED_ATTR, svg);
                addToSet(ALLOWED_ATTR, xml);
              }
              if (USE_PROFILES.mathMl === true) {
                addToSet(ALLOWED_TAGS, mathMl$1);
                addToSet(ALLOWED_ATTR, mathMl);
                addToSet(ALLOWED_ATTR, xml);
              }
            }
            if (cfg.ADD_TAGS) {
              if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) {
                ALLOWED_TAGS = clone(ALLOWED_TAGS);
              }
              addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
            }
            if (cfg.ADD_ATTR) {
              if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) {
                ALLOWED_ATTR = clone(ALLOWED_ATTR);
              }
              addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
            }
            if (cfg.ADD_URI_SAFE_ATTR) {
              addToSet(URI_SAFE_ATTRIBUTES, cfg.ADD_URI_SAFE_ATTR, transformCaseFunc);
            }
            if (cfg.FORBID_CONTENTS) {
              if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) {
                FORBID_CONTENTS = clone(FORBID_CONTENTS);
              }
              addToSet(FORBID_CONTENTS, cfg.FORBID_CONTENTS, transformCaseFunc);
            }
            if (KEEP_CONTENT) {
              ALLOWED_TAGS["#text"] = true;
            }
            if (WHOLE_DOCUMENT) {
              addToSet(ALLOWED_TAGS, ["html", "head", "body"]);
            }
            if (ALLOWED_TAGS.table) {
              addToSet(ALLOWED_TAGS, ["tbody"]);
              delete FORBID_TAGS.tbody;
            }
            if (freeze) {
              freeze(cfg);
            }
            CONFIG = cfg;
          };
          var MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, ["mi", "mo", "mn", "ms", "mtext"]);
          var HTML_INTEGRATION_POINTS = addToSet({}, ["foreignobject", "desc", "title", "annotation-xml"]);
          var COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, ["title", "style", "font", "a", "script"]);
          var ALL_SVG_TAGS = addToSet({}, svg$1);
          addToSet(ALL_SVG_TAGS, svgFilters);
          addToSet(ALL_SVG_TAGS, svgDisallowed);
          var ALL_MATHML_TAGS = addToSet({}, mathMl$1);
          addToSet(ALL_MATHML_TAGS, mathMlDisallowed);
          var _checkValidNamespace = function _checkValidNamespace2(element) {
            var parent = getParentNode(element);
            if (!parent || !parent.tagName) {
              parent = {
                namespaceURI: NAMESPACE,
                tagName: "template"
              };
            }
            var tagName = stringToLowerCase(element.tagName);
            var parentTagName = stringToLowerCase(parent.tagName);
            if (!ALLOWED_NAMESPACES[element.namespaceURI]) {
              return false;
            }
            if (element.namespaceURI === SVG_NAMESPACE) {
              if (parent.namespaceURI === HTML_NAMESPACE) {
                return tagName === "svg";
              }
              if (parent.namespaceURI === MATHML_NAMESPACE) {
                return tagName === "svg" && (parentTagName === "annotation-xml" || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
              }
              return Boolean(ALL_SVG_TAGS[tagName]);
            }
            if (element.namespaceURI === MATHML_NAMESPACE) {
              if (parent.namespaceURI === HTML_NAMESPACE) {
                return tagName === "math";
              }
              if (parent.namespaceURI === SVG_NAMESPACE) {
                return tagName === "math" && HTML_INTEGRATION_POINTS[parentTagName];
              }
              return Boolean(ALL_MATHML_TAGS[tagName]);
            }
            if (element.namespaceURI === HTML_NAMESPACE) {
              if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) {
                return false;
              }
              if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) {
                return false;
              }
              return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
            }
            if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && ALLOWED_NAMESPACES[element.namespaceURI]) {
              return true;
            }
            return false;
          };
          var _forceRemove = function _forceRemove2(node) {
            arrayPush(DOMPurify2.removed, {
              element: node
            });
            try {
              node.parentNode.removeChild(node);
            } catch (_) {
              try {
                node.outerHTML = emptyHTML;
              } catch (_2) {
                node.remove();
              }
            }
          };
          var _removeAttribute = function _removeAttribute2(name, node) {
            try {
              arrayPush(DOMPurify2.removed, {
                attribute: node.getAttributeNode(name),
                from: node
              });
            } catch (_) {
              arrayPush(DOMPurify2.removed, {
                attribute: null,
                from: node
              });
            }
            node.removeAttribute(name);
            if (name === "is" && !ALLOWED_ATTR[name]) {
              if (RETURN_DOM || RETURN_DOM_FRAGMENT) {
                try {
                  _forceRemove(node);
                } catch (_) {
                }
              } else {
                try {
                  node.setAttribute(name, "");
                } catch (_) {
                }
              }
            }
          };
          var _initDocument = function _initDocument2(dirty) {
            var doc;
            var leadingWhitespace;
            if (FORCE_BODY) {
              dirty = "<remove></remove>" + dirty;
            } else {
              var matches = stringMatch(dirty, /^[\r\n\t ]+/);
              leadingWhitespace = matches && matches[0];
            }
            if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && NAMESPACE === HTML_NAMESPACE) {
              dirty = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + dirty + "</body></html>";
            }
            var dirtyPayload = trustedTypesPolicy ? trustedTypesPolicy.createHTML(dirty) : dirty;
            if (NAMESPACE === HTML_NAMESPACE) {
              try {
                doc = new DOMParser().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
              } catch (_) {
              }
            }
            if (!doc || !doc.documentElement) {
              doc = implementation.createDocument(NAMESPACE, "template", null);
              try {
                doc.documentElement.innerHTML = IS_EMPTY_INPUT ? "" : dirtyPayload;
              } catch (_) {
              }
            }
            var body = doc.body || doc.documentElement;
            if (dirty && leadingWhitespace) {
              body.insertBefore(document.createTextNode(leadingWhitespace), body.childNodes[0] || null);
            }
            if (NAMESPACE === HTML_NAMESPACE) {
              return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? "html" : "body")[0];
            }
            return WHOLE_DOCUMENT ? doc.documentElement : body;
          };
          var _createIterator = function _createIterator2(root) {
            return createNodeIterator.call(
              root.ownerDocument || root,
              root,
              NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT,
              null,
              false
            );
          };
          var _isClobbered = function _isClobbered2(elm) {
            return elm instanceof HTMLFormElement && (typeof elm.nodeName !== "string" || typeof elm.textContent !== "string" || typeof elm.removeChild !== "function" || !(elm.attributes instanceof NamedNodeMap) || typeof elm.removeAttribute !== "function" || typeof elm.setAttribute !== "function" || typeof elm.namespaceURI !== "string" || typeof elm.insertBefore !== "function" || typeof elm.hasChildNodes !== "function");
          };
          var _isNode = function _isNode2(object) {
            return _typeof(Node) === "object" ? object instanceof Node : object && _typeof(object) === "object" && typeof object.nodeType === "number" && typeof object.nodeName === "string";
          };
          var _executeHook = function _executeHook2(entryPoint, currentNode, data) {
            if (!hooks[entryPoint]) {
              return;
            }
            arrayForEach(hooks[entryPoint], function(hook) {
              hook.call(DOMPurify2, currentNode, data, CONFIG);
            });
          };
          var _sanitizeElements = function _sanitizeElements2(currentNode) {
            var content;
            _executeHook("beforeSanitizeElements", currentNode, null);
            if (_isClobbered(currentNode)) {
              _forceRemove(currentNode);
              return true;
            }
            if (regExpTest(/[\u0080-\uFFFF]/, currentNode.nodeName)) {
              _forceRemove(currentNode);
              return true;
            }
            var tagName = transformCaseFunc(currentNode.nodeName);
            _executeHook("uponSanitizeElement", currentNode, {
              tagName,
              allowedTags: ALLOWED_TAGS
            });
            if (currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && (!_isNode(currentNode.content) || !_isNode(currentNode.content.firstElementChild)) && regExpTest(/<[/\w]/g, currentNode.innerHTML) && regExpTest(/<[/\w]/g, currentNode.textContent)) {
              _forceRemove(currentNode);
              return true;
            }
            if (tagName === "select" && regExpTest(/<template/i, currentNode.innerHTML)) {
              _forceRemove(currentNode);
              return true;
            }
            if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
              if (!FORBID_TAGS[tagName] && _basicCustomElementTest(tagName)) {
                if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName))
                  return false;
                if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(tagName))
                  return false;
              }
              if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
                var parentNode = getParentNode(currentNode) || currentNode.parentNode;
                var childNodes = getChildNodes(currentNode) || currentNode.childNodes;
                if (childNodes && parentNode) {
                  var childCount = childNodes.length;
                  for (var i = childCount - 1; i >= 0; --i) {
                    parentNode.insertBefore(cloneNode(childNodes[i], true), getNextSibling(currentNode));
                  }
                }
              }
              _forceRemove(currentNode);
              return true;
            }
            if (currentNode instanceof Element && !_checkValidNamespace(currentNode)) {
              _forceRemove(currentNode);
              return true;
            }
            if ((tagName === "noscript" || tagName === "noembed") && regExpTest(/<\/no(script|embed)/i, currentNode.innerHTML)) {
              _forceRemove(currentNode);
              return true;
            }
            if (SAFE_FOR_TEMPLATES && currentNode.nodeType === 3) {
              content = currentNode.textContent;
              content = stringReplace(content, MUSTACHE_EXPR$1, " ");
              content = stringReplace(content, ERB_EXPR$1, " ");
              content = stringReplace(content, TMPLIT_EXPR$1, " ");
              if (currentNode.textContent !== content) {
                arrayPush(DOMPurify2.removed, {
                  element: currentNode.cloneNode()
                });
                currentNode.textContent = content;
              }
            }
            _executeHook("afterSanitizeElements", currentNode, null);
            return false;
          };
          var _isValidAttribute = function _isValidAttribute2(lcTag, lcName, value) {
            if (SANITIZE_DOM && (lcName === "id" || lcName === "name") && (value in document || value in formElement)) {
              return false;
            }
            if (ALLOW_DATA_ATTR && !FORBID_ATTR[lcName] && regExpTest(DATA_ATTR$1, lcName))
              ;
            else if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR$1, lcName))
              ;
            else if (!ALLOWED_ATTR[lcName] || FORBID_ATTR[lcName]) {
              if (_basicCustomElementTest(lcTag) && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(lcTag)) && (CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName) || CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.attributeNameCheck(lcName)) || lcName === "is" && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(value)))
                ;
              else {
                return false;
              }
            } else if (URI_SAFE_ATTRIBUTES[lcName])
              ;
            else if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE$1, "")))
              ;
            else if ((lcName === "src" || lcName === "xlink:href" || lcName === "href") && lcTag !== "script" && stringIndexOf(value, "data:") === 0 && DATA_URI_TAGS[lcTag])
              ;
            else if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA$1, stringReplace(value, ATTR_WHITESPACE$1, "")))
              ;
            else if (!value)
              ;
            else {
              return false;
            }
            return true;
          };
          var _basicCustomElementTest = function _basicCustomElementTest2(tagName) {
            return tagName.indexOf("-") > 0;
          };
          var _sanitizeAttributes = function _sanitizeAttributes2(currentNode) {
            var attr;
            var value;
            var lcName;
            var l;
            _executeHook("beforeSanitizeAttributes", currentNode, null);
            var attributes = currentNode.attributes;
            if (!attributes) {
              return;
            }
            var hookEvent = {
              attrName: "",
              attrValue: "",
              keepAttr: true,
              allowedAttributes: ALLOWED_ATTR
            };
            l = attributes.length;
            while (l--) {
              attr = attributes[l];
              var _attr = attr, name = _attr.name, namespaceURI = _attr.namespaceURI;
              value = name === "value" ? attr.value : stringTrim(attr.value);
              lcName = transformCaseFunc(name);
              hookEvent.attrName = lcName;
              hookEvent.attrValue = value;
              hookEvent.keepAttr = true;
              hookEvent.forceKeepAttr = void 0;
              _executeHook("uponSanitizeAttribute", currentNode, hookEvent);
              value = hookEvent.attrValue;
              if (hookEvent.forceKeepAttr) {
                continue;
              }
              _removeAttribute(name, currentNode);
              if (!hookEvent.keepAttr) {
                continue;
              }
              if (regExpTest(/\/>/i, value)) {
                _removeAttribute(name, currentNode);
                continue;
              }
              if (SAFE_FOR_TEMPLATES) {
                value = stringReplace(value, MUSTACHE_EXPR$1, " ");
                value = stringReplace(value, ERB_EXPR$1, " ");
                value = stringReplace(value, TMPLIT_EXPR$1, " ");
              }
              var lcTag = transformCaseFunc(currentNode.nodeName);
              if (!_isValidAttribute(lcTag, lcName, value)) {
                continue;
              }
              if (SANITIZE_NAMED_PROPS && (lcName === "id" || lcName === "name")) {
                _removeAttribute(name, currentNode);
                value = SANITIZE_NAMED_PROPS_PREFIX + value;
              }
              if (trustedTypesPolicy && _typeof(trustedTypes) === "object" && typeof trustedTypes.getAttributeType === "function") {
                if (namespaceURI)
                  ;
                else {
                  switch (trustedTypes.getAttributeType(lcTag, lcName)) {
                    case "TrustedHTML":
                      value = trustedTypesPolicy.createHTML(value);
                      break;
                    case "TrustedScriptURL":
                      value = trustedTypesPolicy.createScriptURL(value);
                      break;
                  }
                }
              }
              try {
                if (namespaceURI) {
                  currentNode.setAttributeNS(namespaceURI, name, value);
                } else {
                  currentNode.setAttribute(name, value);
                }
                arrayPop(DOMPurify2.removed);
              } catch (_) {
              }
            }
            _executeHook("afterSanitizeAttributes", currentNode, null);
          };
          var _sanitizeShadowDOM = function _sanitizeShadowDOM2(fragment) {
            var shadowNode;
            var shadowIterator = _createIterator(fragment);
            _executeHook("beforeSanitizeShadowDOM", fragment, null);
            while (shadowNode = shadowIterator.nextNode()) {
              _executeHook("uponSanitizeShadowNode", shadowNode, null);
              if (_sanitizeElements(shadowNode)) {
                continue;
              }
              if (shadowNode.content instanceof DocumentFragment) {
                _sanitizeShadowDOM2(shadowNode.content);
              }
              _sanitizeAttributes(shadowNode);
            }
            _executeHook("afterSanitizeShadowDOM", fragment, null);
          };
          DOMPurify2.sanitize = function(dirty) {
            var cfg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
            var body;
            var importedNode;
            var currentNode;
            var oldNode;
            var returnNode;
            IS_EMPTY_INPUT = !dirty;
            if (IS_EMPTY_INPUT) {
              dirty = "<!-->";
            }
            if (typeof dirty !== "string" && !_isNode(dirty)) {
              if (typeof dirty.toString !== "function") {
                throw typeErrorCreate("toString is not a function");
              } else {
                dirty = dirty.toString();
                if (typeof dirty !== "string") {
                  throw typeErrorCreate("dirty is not a string, aborting");
                }
              }
            }
            if (!DOMPurify2.isSupported) {
              if (_typeof(window2.toStaticHTML) === "object" || typeof window2.toStaticHTML === "function") {
                if (typeof dirty === "string") {
                  return window2.toStaticHTML(dirty);
                }
                if (_isNode(dirty)) {
                  return window2.toStaticHTML(dirty.outerHTML);
                }
              }
              return dirty;
            }
            if (!SET_CONFIG) {
              _parseConfig(cfg);
            }
            DOMPurify2.removed = [];
            if (typeof dirty === "string") {
              IN_PLACE = false;
            }
            if (IN_PLACE) {
              if (dirty.nodeName) {
                var tagName = transformCaseFunc(dirty.nodeName);
                if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
                  throw typeErrorCreate("root node is forbidden and cannot be sanitized in-place");
                }
              }
            } else if (dirty instanceof Node) {
              body = _initDocument("<!---->");
              importedNode = body.ownerDocument.importNode(dirty, true);
              if (importedNode.nodeType === 1 && importedNode.nodeName === "BODY") {
                body = importedNode;
              } else if (importedNode.nodeName === "HTML") {
                body = importedNode;
              } else {
                body.appendChild(importedNode);
              }
            } else {
              if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT && dirty.indexOf("<") === -1) {
                return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(dirty) : dirty;
              }
              body = _initDocument(dirty);
              if (!body) {
                return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : "";
              }
            }
            if (body && FORCE_BODY) {
              _forceRemove(body.firstChild);
            }
            var nodeIterator = _createIterator(IN_PLACE ? dirty : body);
            while (currentNode = nodeIterator.nextNode()) {
              if (currentNode.nodeType === 3 && currentNode === oldNode) {
                continue;
              }
              if (_sanitizeElements(currentNode)) {
                continue;
              }
              if (currentNode.content instanceof DocumentFragment) {
                _sanitizeShadowDOM(currentNode.content);
              }
              _sanitizeAttributes(currentNode);
              oldNode = currentNode;
            }
            oldNode = null;
            if (IN_PLACE) {
              return dirty;
            }
            if (RETURN_DOM) {
              if (RETURN_DOM_FRAGMENT) {
                returnNode = createDocumentFragment.call(body.ownerDocument);
                while (body.firstChild) {
                  returnNode.appendChild(body.firstChild);
                }
              } else {
                returnNode = body;
              }
              if (ALLOWED_ATTR.shadowroot) {
                returnNode = importNode.call(originalDocument, returnNode, true);
              }
              return returnNode;
            }
            var serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
            if (WHOLE_DOCUMENT && ALLOWED_TAGS["!doctype"] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name)) {
              serializedHTML = "<!DOCTYPE " + body.ownerDocument.doctype.name + ">\n" + serializedHTML;
            }
            if (SAFE_FOR_TEMPLATES) {
              serializedHTML = stringReplace(serializedHTML, MUSTACHE_EXPR$1, " ");
              serializedHTML = stringReplace(serializedHTML, ERB_EXPR$1, " ");
              serializedHTML = stringReplace(serializedHTML, TMPLIT_EXPR$1, " ");
            }
            return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(serializedHTML) : serializedHTML;
          };
          DOMPurify2.setConfig = function(cfg) {
            _parseConfig(cfg);
            SET_CONFIG = true;
          };
          DOMPurify2.clearConfig = function() {
            CONFIG = null;
            SET_CONFIG = false;
          };
          DOMPurify2.isValidAttribute = function(tag, attr, value) {
            if (!CONFIG) {
              _parseConfig({});
            }
            var lcTag = transformCaseFunc(tag);
            var lcName = transformCaseFunc(attr);
            return _isValidAttribute(lcTag, lcName, value);
          };
          DOMPurify2.addHook = function(entryPoint, hookFunction) {
            if (typeof hookFunction !== "function") {
              return;
            }
            hooks[entryPoint] = hooks[entryPoint] || [];
            arrayPush(hooks[entryPoint], hookFunction);
          };
          DOMPurify2.removeHook = function(entryPoint) {
            if (hooks[entryPoint]) {
              return arrayPop(hooks[entryPoint]);
            }
          };
          DOMPurify2.removeHooks = function(entryPoint) {
            if (hooks[entryPoint]) {
              hooks[entryPoint] = [];
            }
          };
          DOMPurify2.removeAllHooks = function() {
            hooks = {};
          };
          return DOMPurify2;
        }
        var purify = createDOMPurify();
        return purify;
      });
    }
  });

  // node_modules/isomorphic-dompurify/browser.js
  var require_browser = __commonJS({
    "node_modules/isomorphic-dompurify/browser.js"(exports, module) {
      module.exports = window.DOMPurify || (window.DOMPurify = require_purify().default || require_purify());
    }
  });

  // src/browser/hugo-lyra-browser.ts
  var lyra = __toESM(require_lyra());
  var import_isomorphic_dompurify = __toESM(require_browser());

  // src/lib/utils.ts
  function filterObject(obj, callback) {
    return Object.fromEntries(Object.entries(obj).filter(([key, val]) => callback([key, val])));
  }

  // src/browser/hugo-lyra-browser.ts
  var HugoLyra = () => {
    return {
      lyra,
      search: function(db, options = {}) {
        const defaultOpts = {
          queryString: typeof window !== "undefined" ? window.location.search : "",
          param: "q"
        };
        const filterOptions = filterObject(options, ([_, val]) => {
          _;
          return typeof val === "string" && !!val;
        });
        const opts = { ...defaultOpts, ...filterOptions };
        const params = new URLSearchParams(opts.queryString);
        const query = params.get(opts.param ?? "q");
        if (!query) {
          return;
        }
        const sanitized = import_isomorphic_dompurify.default.sanitize(query);
        const search = this.lyra.search(db, {
          term: sanitized,
          properties: "*"
        });
        return {
          search,
          q: sanitized
        };
      },
      bootstrap: function(data) {
        const db = lyra.create({
          schema: {
            __placeholder: "string"
          }
        });
        const deserialized = JSON.parse(data.toString());
        db.index = deserialized.index;
        db.defaultLanguage = deserialized.defaultLanguage;
        db.docs = deserialized.docs;
        db.nodes = deserialized.nodes;
        db.schema = deserialized.schema;
        db.frequencies = deserialized.frequencies;
        db.tokenOccurrencies = deserialized.tokenOccurrencies;
        return db;
      }
    };
  };
  if (typeof window !== "undefined") {
    window.HugoLyra = HugoLyra();
  }
})();
/*! Bundled license information:

dompurify/dist/purify.js:
  (*! @license DOMPurify 2.4.1 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/2.4.1/LICENSE *)
*/
