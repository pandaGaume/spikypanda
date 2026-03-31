(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["SpikypandaRuntime"] = factory();
	else
		root["SpikypandaRuntime"] = factory();
})(globalThis, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "../../../node_modules/tslib/tslib.es6.mjs":
/*!*************************************************!*\
  !*** ../../../node_modules/tslib/tslib.es6.mjs ***!
  \*************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   __addDisposableResource: () => (/* binding */ __addDisposableResource),
/* harmony export */   __assign: () => (/* binding */ __assign),
/* harmony export */   __asyncDelegator: () => (/* binding */ __asyncDelegator),
/* harmony export */   __asyncGenerator: () => (/* binding */ __asyncGenerator),
/* harmony export */   __asyncValues: () => (/* binding */ __asyncValues),
/* harmony export */   __await: () => (/* binding */ __await),
/* harmony export */   __awaiter: () => (/* binding */ __awaiter),
/* harmony export */   __classPrivateFieldGet: () => (/* binding */ __classPrivateFieldGet),
/* harmony export */   __classPrivateFieldIn: () => (/* binding */ __classPrivateFieldIn),
/* harmony export */   __classPrivateFieldSet: () => (/* binding */ __classPrivateFieldSet),
/* harmony export */   __createBinding: () => (/* binding */ __createBinding),
/* harmony export */   __decorate: () => (/* binding */ __decorate),
/* harmony export */   __disposeResources: () => (/* binding */ __disposeResources),
/* harmony export */   __esDecorate: () => (/* binding */ __esDecorate),
/* harmony export */   __exportStar: () => (/* binding */ __exportStar),
/* harmony export */   __extends: () => (/* binding */ __extends),
/* harmony export */   __generator: () => (/* binding */ __generator),
/* harmony export */   __importDefault: () => (/* binding */ __importDefault),
/* harmony export */   __importStar: () => (/* binding */ __importStar),
/* harmony export */   __makeTemplateObject: () => (/* binding */ __makeTemplateObject),
/* harmony export */   __metadata: () => (/* binding */ __metadata),
/* harmony export */   __param: () => (/* binding */ __param),
/* harmony export */   __propKey: () => (/* binding */ __propKey),
/* harmony export */   __read: () => (/* binding */ __read),
/* harmony export */   __rest: () => (/* binding */ __rest),
/* harmony export */   __rewriteRelativeImportExtension: () => (/* binding */ __rewriteRelativeImportExtension),
/* harmony export */   __runInitializers: () => (/* binding */ __runInitializers),
/* harmony export */   __setFunctionName: () => (/* binding */ __setFunctionName),
/* harmony export */   __spread: () => (/* binding */ __spread),
/* harmony export */   __spreadArray: () => (/* binding */ __spreadArray),
/* harmony export */   __spreadArrays: () => (/* binding */ __spreadArrays),
/* harmony export */   __values: () => (/* binding */ __values),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */

var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
      function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
  return extendStatics(d, b);
};

function __extends(d, b) {
  if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() { this.constructor = d; }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
  __assign = Object.assign || function __assign(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
      return t;
  }
  return __assign.apply(this, arguments);
}

function __rest(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
              t[p[i]] = s[p[i]];
      }
  return t;
}

function __decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
  return function (target, key) { decorator(target, key, paramIndex); }
}

function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
  var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _, done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
      var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
      if (kind === "accessor") {
          if (result === void 0) continue;
          if (result === null || typeof result !== "object") throw new TypeError("Object expected");
          if (_ = accept(result.get)) descriptor.get = _;
          if (_ = accept(result.set)) descriptor.set = _;
          if (_ = accept(result.init)) initializers.unshift(_);
      }
      else if (_ = accept(result)) {
          if (kind === "field") initializers.unshift(_);
          else descriptor[key] = _;
      }
  }
  if (target) Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
};

function __runInitializers(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) {
      value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  }
  return useValue ? value : void 0;
};

function __propKey(x) {
  return typeof x === "symbol" ? x : "".concat(x);
};

function __setFunctionName(f, name, prefix) {
  if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
  return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};

function __metadata(metadataKey, metadataValue) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
      function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
      function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}

function __generator(thisArg, body) {
  var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
  return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
  function verb(n) { return function (v) { return step([n, v]); }; }
  function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (g && (g = 0, op[0] && (_ = 0)), _) try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];
          switch (op[0]) {
              case 0: case 1: t = op; break;
              case 4: _.label++; return { value: op[1], done: false };
              case 5: _.label++; y = op[1]; op = [0]; continue;
              case 7: op = _.ops.pop(); _.trys.pop(); continue;
              default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                  if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                  if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                  if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                  if (t[2]) _.ops.pop();
                  _.trys.pop(); continue;
          }
          op = body.call(thisArg, _);
      } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
      if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
  }
}

var __createBinding = Object.create ? (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
  }
  Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});

function __exportStar(m, o) {
  for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}

function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
      next: function () {
          if (o && i >= o.length) o = void 0;
          return { value: o && o[i++], done: !o };
      }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  }
  catch (error) { e = { error: error }; }
  finally {
      try {
          if (r && !r.done && (m = i["return"])) m.call(i);
      }
      finally { if (e) throw e.error; }
  }
  return ar;
}

/** @deprecated */
function __spread() {
  for (var ar = [], i = 0; i < arguments.length; i++)
      ar = ar.concat(__read(arguments[i]));
  return ar;
}

/** @deprecated */
function __spreadArrays() {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
  for (var r = Array(s), k = 0, i = 0; i < il; i++)
      for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
          r[k] = a[j];
  return r;
}

function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
      }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
}

function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
  function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
  function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
  function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
  function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
  function fulfill(value) { resume("next", value); }
  function reject(value) { resume("throw", value); }
  function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
  var i, p;
  return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
  function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
}

function __asyncValues(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
  function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
  function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

function __makeTemplateObject(cooked, raw) {
  if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
  return cooked;
};

var __setModuleDefault = Object.create ? (function(o, v) {
  Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
  o["default"] = v;
};

var ownKeys = function(o) {
  ownKeys = Object.getOwnPropertyNames || function (o) {
    var ar = [];
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
    return ar;
  };
  return ownKeys(o);
};

function __importStar(mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
  __setModuleDefault(result, mod);
  return result;
}

function __importDefault(mod) {
  return (mod && mod.__esModule) ? mod : { default: mod };
}

function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

function __classPrivateFieldIn(state, receiver) {
  if (receiver === null || (typeof receiver !== "object" && typeof receiver !== "function")) throw new TypeError("Cannot use 'in' operator on non-object");
  return typeof state === "function" ? receiver === state : state.has(receiver);
}

function __addDisposableResource(env, value, async) {
  if (value !== null && value !== void 0) {
    if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
    var dispose, inner;
    if (async) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      dispose = value[Symbol.asyncDispose];
    }
    if (dispose === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      dispose = value[Symbol.dispose];
      if (async) inner = dispose;
    }
    if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
    if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
    env.stack.push({ value: value, dispose: dispose, async: async });
  }
  else if (async) {
    env.stack.push({ async: true });
  }
  return value;
}

var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

function __disposeResources(env) {
  function fail(e) {
    env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
    env.hasError = true;
  }
  var r, s = 0;
  function next() {
    while (r = env.stack.pop()) {
      try {
        if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
        if (r.dispose) {
          var result = r.dispose.call(r.value);
          if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
        }
        else s |= 1;
      }
      catch (e) {
        fail(e);
      }
    }
    if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
    if (env.hasError) throw env.error;
  }
  return next();
}

function __rewriteRelativeImportExtension(path, preserveJsx) {
  if (typeof path === "string" && /^\.\.?\//.test(path)) {
      return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
          return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
      });
  }
  return path;
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  __extends,
  __assign,
  __rest,
  __decorate,
  __param,
  __esDecorate,
  __runInitializers,
  __propKey,
  __setFunctionName,
  __metadata,
  __awaiter,
  __generator,
  __createBinding,
  __exportStar,
  __values,
  __read,
  __spread,
  __spreadArrays,
  __spreadArray,
  __await,
  __asyncGenerator,
  __asyncDelegator,
  __asyncValues,
  __makeTemplateObject,
  __importStar,
  __importDefault,
  __classPrivateFieldGet,
  __classPrivateFieldSet,
  __classPrivateFieldIn,
  __addDisposableResource,
  __disposeResources,
  __rewriteRelativeImportExtension,
});


/***/ }),

/***/ "../core/src/geometry/geometry.interfaces.ts":
/*!***************************************************!*\
  !*** ../core/src/geometry/geometry.interfaces.ts ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   isCartesian: () => (/* binding */ isCartesian),
/* harmony export */   isCartesian2: () => (/* binding */ isCartesian2),
/* harmony export */   isCartesian3: () => (/* binding */ isCartesian3),
/* harmony export */   isCartesian4: () => (/* binding */ isCartesian4)
/* harmony export */ });
/**
 * Type guard for ICartesian (ICartesian2 | ICartesian3 | ICartesian4)
 */
function isCartesian(obj) {
    return isCartesian2(obj) || isCartesian3(obj) || isCartesian4(obj);
}
/**
 * Type guard for ICartesian2
 */
function isCartesian2(b) {
    if (typeof b !== "object" || b === null)
        return false;
    return "x" in b && "y" in b;
}
/**
 * Type guard for ICartesian3
 */
function isCartesian3(b) {
    if (!isCartesian2(b))
        return false;
    return "z" in b;
}
/**
 * Type guard for ICartesian4
 */
function isCartesian4(b) {
    if (!isCartesian3(b))
        return false;
    return "w" in b;
}


/***/ }),

/***/ "../core/src/graph/graph.graph.ts":
/*!****************************************!*\
  !*** ../core/src/graph/graph.graph.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Graph: () => (/* binding */ Graph)
/* harmony export */ });
/* harmony import */ var _graph_node__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./graph.node */ "../core/src/graph/graph.node.ts");

class Graph extends _graph_node__WEBPACK_IMPORTED_MODULE_0__.GraphNode {
    constructor(nodes = [], links = [], inputs = null, outputs = null, hiddens = null, onsc = null, opsc = null, position) {
        super(onsc, opsc, position); // Pass `position` to `GraphNode`
        this.nodes = nodes;
        this.links = links;
        this.inputs = inputs ?? this.nodes.filter((n) => n.opsc().length === 0);
        this.outputs = outputs ?? this.nodes.filter((n) => n.onsc().length === 0);
        this.hiddens = hiddens ?? this.nodes.filter((n) => !this.inputs.includes(n) && !this.outputs.includes(n));
    }
    clone() {
        var copy = super.clone();
        copy.nodes = this.nodes.map((n) => n.clone());
        copy.links = this.links.map((l) => {
            const cloned = l.clone();
            cloned.oini = copy.nodes[this.nodes.indexOf(l.oini)]; // the underlying setter is taking care of unbind/bind the link from/to node
            cloned.ofin = copy.nodes[this.nodes.indexOf(l.ofin)]; // ...
            return cloned;
        });
        copy.inputs = copy.nodes.filter((n) => n.opsc().length === 0);
        copy.outputs = copy.nodes.filter((n) => n.onsc().length === 0);
        copy.hiddens = copy.nodes.filter((n) => !copy.inputs.includes(n) && !copy.outputs.includes(n));
        return copy;
    }
}


/***/ }),

/***/ "../core/src/graph/graph.graphItem.ts":
/*!********************************************!*\
  !*** ../core/src/graph/graph.graphItem.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GraphItem: () => (/* binding */ GraphItem)
/* harmony export */ });
/* harmony import */ var _graph_interfaces__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./graph.interfaces */ "../core/src/graph/graph.interfaces.ts");

class GraphItem {
    get tag() {
        return this._tag;
    }
    get id() {
        return this._id;
    }
    set id(v) {
        this._id = v;
    }
    get bag() {
        return this._bag;
    }
    set bag(v) {
        this._bag = v;
    }
    withTag(tag) {
        this._tag = tag;
        return this;
    }
    dispose() {
        // Dispose logic if needed
    }
    clone() {
        const ctor = this.constructor;
        const clone = new ctor();
        const props = Reflect.getMetadata(_graph_interfaces__WEBPACK_IMPORTED_MODULE_0__.CloneMetadataKey, this) || [];
        for (const key of props) {
            const value = this[key];
            clone[key] = (0,_graph_interfaces__WEBPACK_IMPORTED_MODULE_0__.IsCloneable)(value) ? value.clone() : structuredClone(value);
        }
        return clone;
    }
}


/***/ }),

/***/ "../core/src/graph/graph.interfaces.ts":
/*!*********************************************!*\
  !*** ../core/src/graph/graph.interfaces.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CloneMetadataKey: () => (/* binding */ CloneMetadataKey),
/* harmony export */   IsCloneable: () => (/* binding */ IsCloneable),
/* harmony export */   cloneable: () => (/* binding */ cloneable),
/* harmony export */   isGraph: () => (/* binding */ isGraph),
/* harmony export */   isNode: () => (/* binding */ isNode),
/* harmony export */   isOlink: () => (/* binding */ isOlink)
/* harmony export */ });
/* harmony import */ var _geometry_geometry_interfaces__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../geometry/geometry.interfaces */ "../core/src/geometry/geometry.interfaces.ts");

const CloneMetadataKey = Symbol("cloneable");
/// <summary>
/// Marks a property as cloneable for automatic deep copying
/// </summary>
function cloneable(target, propertyKey) {
    const proto = target.constructor.prototype;
    const existingProps = Reflect.getMetadata(CloneMetadataKey, proto) || [];
    Reflect.defineMetadata(CloneMetadataKey, [...existingProps, propertyKey], proto);
}
/// <summary>
/// Type guard to check if an object implements ICloneable
/// </summary>
function IsCloneable(obj) {
    return typeof obj === "object" && obj !== null && typeof obj.clone === "function";
}
/**
 * Type guard for INode
 */
function isNode(obj) {
    return (typeof obj === "object" &&
        obj !== null &&
        ("position" in obj ? obj.position === undefined || (0,_geometry_geometry_interfaces__WEBPACK_IMPORTED_MODULE_0__.isCartesian)(obj.position) : true) && // Ensure position is undefined or ICartesian3
        "onsc" in obj &&
        "opsc" in obj);
}
/**
 * Type guard for IOlink
 */
function isOlink(obj) {
    return typeof obj === "object" && obj !== null && "oini" in obj && "ofin" in obj && isNode(obj.oini) && isNode(obj.ofin);
}
/**
 * Type guard for IGraph
 */
function isGraph(obj) {
    return (isNode(obj) &&
        "nodes" in obj &&
        "links" in obj &&
        "inputs" in obj &&
        "outputs" in obj &&
        Array.isArray(obj.nodes) &&
        Array.isArray(obj.links) &&
        Array.isArray(obj.inputs) &&
        Array.isArray(obj.outputs) &&
        obj.nodes.every(isNode) &&
        obj.links.every(isOlink) &&
        obj.inputs.every(isNode) &&
        obj.outputs.every(isNode));
}


/***/ }),

/***/ "../core/src/graph/graph.node.ts":
/*!***************************************!*\
  !*** ../core/src/graph/graph.node.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GraphNode: () => (/* binding */ GraphNode)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "../../../node_modules/tslib/tslib.es6.mjs");
/* harmony import */ var _graph_graphItem__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./graph.graphItem */ "../core/src/graph/graph.graphItem.ts");
/* harmony import */ var _graph_interfaces__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./graph.interfaces */ "../core/src/graph/graph.interfaces.ts");



class GraphNode extends _graph_graphItem__WEBPACK_IMPORTED_MODULE_1__.GraphItem {
    constructor(onsc = null, opsc = null, position) {
        super();
        this._onsc = onsc ?? [];
        this._opsc = opsc ?? [];
        this.position = position;
    }
    onsc() {
        return this._onsc;
    }
    opsc() {
        return this._opsc;
    }
}
(0,tslib__WEBPACK_IMPORTED_MODULE_0__.__decorate)([
    _graph_interfaces__WEBPACK_IMPORTED_MODULE_2__.cloneable,
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__metadata)("design:type", Object)
], GraphNode.prototype, "position", void 0);


/***/ }),

/***/ "../core/src/graph/graph.olink.ts":
/*!****************************************!*\
  !*** ../core/src/graph/graph.olink.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GraphOLink: () => (/* binding */ GraphOLink)
/* harmony export */ });
/* harmony import */ var _graph_graphItem__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./graph.graphItem */ "../core/src/graph/graph.graphItem.ts");

class GraphOLink extends _graph_graphItem__WEBPACK_IMPORTED_MODULE_0__.GraphItem {
    constructor(oini, ofin) {
        super();
        this._oini = oini ?? null;
        if (this._oini) {
            this._oini.onsc().push(this);
        }
        this._ofin = ofin ?? null;
        if (this._ofin) {
            this._ofin.opsc().push(this);
        }
    }
    get oini() {
        return this._oini;
    }
    set oini(n) {
        if (this._oini !== n) {
            if (this._oini) {
                const a = this._oini.onsc();
                a.splice(a.indexOf(this));
            }
            this._oini = n;
            if (this._oini) {
                this._oini.onsc().push(this);
            }
        }
    }
    get ofin() {
        return this._ofin;
    }
    set ofin(n) {
        if (this._ofin !== n) {
            if (this._ofin) {
                const a = this._ofin.opsc();
                a.splice(a.indexOf(this));
            }
            this._ofin = n;
            if (this._ofin) {
                this._ofin.opsc().push(this);
            }
        }
    }
    dispose() {
        if (this._oini) {
            const tmp = this._oini.onsc();
            tmp.splice(tmp.indexOf(this));
        }
        if (this._ofin) {
            const tmp = this._ofin.opsc();
            tmp.splice(tmp.indexOf(this));
        }
        super.dispose();
    }
}


/***/ }),

/***/ "./src/compute/compute.graph.ts":
/*!**************************************!*\
  !*** ./src/compute/compute.graph.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ComputeGraph: () => (/* binding */ ComputeGraph),
/* harmony export */   DataLink: () => (/* binding */ DataLink)
/* harmony export */ });
/* harmony import */ var spikypanda_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! spikypanda-core */ "../core/src/graph/graph.olink.ts");
/* harmony import */ var spikypanda_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! spikypanda-core */ "../core/src/graph/graph.graph.ts");
// ═══════════════════════════════════════════════════════════════════════════
// ComputeGraph : executes a DAG of compute nodes in topological order
//
// Each call to run():
// 1. Inject external inputs into source nodes
// 2. Walk nodes in topological order
// 3. For each node: gather input tensors from incoming IDataLinks,
//    call execute(), write output tensors to outgoing IDataLinks
// 4. Collect output tensors from sink nodes
//
// The topological order is computed once at construction (or when the
// graph changes) and cached for fast per-frame execution.
// ═══════════════════════════════════════════════════════════════════════════

// ─── DataLink implementation ─────────────────────────────────────────────────
/**
 * Concrete data link: a directed edge carrying a tensor.
 */
class DataLink extends spikypanda_core__WEBPACK_IMPORTED_MODULE_0__.GraphOLink {
    constructor(from, to, inputIndex = -1) {
        super(from, to);
        this.tensor = null;
        this.inputIndex = inputIndex;
    }
}
// ─── ComputeGraph implementation ─────────────────────────────────────────────
/**
 * Executable compute graph.
 *
 * Extends `Graph<IComputeNode, IDataLink>` from @spiky-panda/core,
 * adding topological sort and the `run()` execution method.
 *
 * **Usage:**
 * ```typescript
 * const graph = new ComputeGraph(nodes, links);
 * const result = graph.run(new Map([["pose", poseTensor]]));
 * const command = result.get("command");
 * ```
 */
class ComputeGraph extends spikypanda_core__WEBPACK_IMPORTED_MODULE_1__.Graph {
    constructor(nodes, links) {
        super(nodes, links);
        this._sortedNodes = null;
    }
    /**
     * Execute the full graph in topological order.
     *
     * @param externalInputs  Named tensors injected into source nodes
     *                         (matched by node ID or name tag).
     * @returns                Named tensors from output nodes.
     */
    run(externalInputs) {
        const sorted = this._getTopologicalOrder();
        for (const node of sorted) {
            const inputs = this._gatherInputs(node, externalInputs);
            const outputs = node.execute(inputs);
            this._distributeOutputs(node, outputs);
        }
        return this._collectResults();
    }
    /**
     * Execute the full graph asynchronously in topological order.
     *
     * For each node, uses `executeAsync()` if the node provides it,
     * otherwise falls back to synchronous `execute()`.
     * Nodes are awaited sequentially (topological order must be respected).
     *
     * @param externalInputs  Named tensors injected into source nodes.
     * @returns                Promise resolving to named tensors from output nodes.
     */
    async runAsync(externalInputs) {
        const sorted = this._getTopologicalOrder();
        for (const node of sorted) {
            const inputs = this._gatherInputs(node, externalInputs);
            // Prefer executeAsync when available, fallback to sync execute
            const outputs = node.executeAsync
                ? await node.executeAsync(inputs)
                : node.execute(inputs);
            this._distributeOutputs(node, outputs);
        }
        return this._collectResults();
    }
    /**
     * Invalidate the cached topological order.
     * Call after adding/removing nodes or links.
     */
    invalidateOrder() {
        this._sortedNodes = null;
    }
    // ── Internal helpers ───────────────────────────────────────────────────
    /**
     * Gather input tensors for a node from incoming links or external inputs.
     */
    _gatherInputs(node, externalInputs) {
        const incomingLinks = node.opsc();
        const inputs = [];
        if (incomingLinks.length === 0 && externalInputs) {
            // Source node: check for external input by ID or tag
            const key = node.id ?? node.tag;
            if (key) {
                const ext = externalInputs.get(key);
                if (ext) {
                    inputs.push(ext);
                }
            }
        }
        else {
            // Transform node: read tensors from incoming data links
            // Sort by inputIndex when set (ONNX graph builder tags links)
            const hasIndex = incomingLinks.some((l) => l.inputIndex >= 0);
            const ordered = hasIndex
                ? [...incomingLinks].sort((a, b) => a.inputIndex - b.inputIndex)
                : incomingLinks;
            for (const link of ordered) {
                if (link.tensor) {
                    inputs.push(link.tensor);
                }
            }
        }
        return inputs;
    }
    /**
     * Cache outputs in the node's bag and write them to outgoing data links.
     */
    _distributeOutputs(node, outputs) {
        // Cache outputs in the node's bag
        const bag = (node.bag ?? {});
        bag.lastOutputs = outputs;
        node.bag = bag;
        // Write outputs to outgoing data links
        const outgoingLinks = node.onsc();
        for (let i = 0; i < outgoingLinks.length; i++) {
            // If there are multiple outputs, distribute them; otherwise broadcast
            outgoingLinks[i].tensor = outputs.length > 1 ? (outputs[i] ?? outputs[0]) : (outputs[0] ?? null);
        }
    }
    /**
     * Collect output tensors from sink nodes (nodes with no successors).
     */
    _collectResults() {
        const result = new Map();
        for (const node of this.outputs) {
            const bag = node.bag;
            if (bag?.lastOutputs) {
                const key = node.id ?? node.tag ?? node.nodeType;
                for (const tensor of bag.lastOutputs) {
                    result.set(tensor.name ?? key, tensor);
                }
            }
        }
        return result;
    }
    // ── Topological sort (Kahn's algorithm) ──────────────────────────────
    _getTopologicalOrder() {
        if (this._sortedNodes)
            return this._sortedNodes;
        const sorted = [];
        const inDegree = new Map();
        // Initialize in-degrees
        for (const node of this.nodes) {
            inDegree.set(node, node.opsc().length);
        }
        // Start with source nodes (in-degree = 0)
        const queue = [];
        for (const [node, degree] of inDegree) {
            if (degree === 0) {
                queue.push(node);
            }
        }
        while (queue.length > 0) {
            const node = queue.shift();
            sorted.push(node);
            // For each outgoing link, reduce the destination's in-degree
            for (const link of node.onsc()) {
                const dest = link.ofin;
                if (dest) {
                    const newDegree = (inDegree.get(dest) ?? 1) - 1;
                    inDegree.set(dest, newDegree);
                    if (newDegree === 0) {
                        queue.push(dest);
                    }
                }
            }
        }
        if (sorted.length !== this.nodes.length) {
            throw new Error(`ComputeGraph has a cycle: sorted ${sorted.length} of ${this.nodes.length} nodes. ` +
                `Compute graphs must be DAGs.`);
        }
        this._sortedNodes = sorted;
        return sorted;
    }
}


/***/ }),

/***/ "./src/compute/compute.node.base.ts":
/*!******************************************!*\
  !*** ./src/compute/compute.node.base.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ComputeNodeBase: () => (/* binding */ ComputeNodeBase)
/* harmony export */ });
/* harmony import */ var spikypanda_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! spikypanda-core */ "../core/src/graph/graph.node.ts");
// ═══════════════════════════════════════════════════════════════════════════
// ComputeNodeBase : abstract base class for all compute nodes
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Base class for compute nodes. Extends GraphNode for graph compatibility.
 */
class ComputeNodeBase extends spikypanda_core__WEBPACK_IMPORTED_MODULE_0__.GraphNode {
}


/***/ }),

/***/ "./src/compute/index.ts":
/*!******************************!*\
  !*** ./src/compute/index.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CnnNode: () => (/* reexport safe */ _nodes_index__WEBPACK_IMPORTED_MODULE_2__.CnnNode),
/* harmony export */   ComputeGraph: () => (/* reexport safe */ _compute_graph__WEBPACK_IMPORTED_MODULE_1__.ComputeGraph),
/* harmony export */   ComputeNodeBase: () => (/* reexport safe */ _compute_node_base__WEBPACK_IMPORTED_MODULE_0__.ComputeNodeBase),
/* harmony export */   ConcatNode: () => (/* reexport safe */ _nodes_index__WEBPACK_IMPORTED_MODULE_2__.ConcatNode),
/* harmony export */   DataLink: () => (/* reexport safe */ _compute_graph__WEBPACK_IMPORTED_MODULE_1__.DataLink),
/* harmony export */   ExternalInputNode: () => (/* reexport safe */ _nodes_index__WEBPACK_IMPORTED_MODULE_2__.ExternalInputNode),
/* harmony export */   MLPNode: () => (/* reexport safe */ _nodes_index__WEBPACK_IMPORTED_MODULE_2__.MLPNode),
/* harmony export */   RnnNode: () => (/* reexport safe */ _nodes_index__WEBPACK_IMPORTED_MODULE_2__.RnnNode)
/* harmony export */ });
/* harmony import */ var _compute_node_base__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./compute.node.base */ "./src/compute/compute.node.base.ts");
/* harmony import */ var _compute_graph__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./compute.graph */ "./src/compute/compute.graph.ts");
/* harmony import */ var _nodes_index__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./nodes/index */ "./src/compute/nodes/index.ts");






/***/ }),

/***/ "./src/compute/nodes/cnn.node.ts":
/*!***************************************!*\
  !*** ./src/compute/nodes/cnn.node.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CnnNode: () => (/* binding */ CnnNode)
/* harmony export */ });
/* harmony import */ var _compute_node_base__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../compute.node.base */ "./src/compute/compute.node.base.ts");
// ═══════════════════════════════════════════════════════════════════════════
// CnnNode : generic wrapper for CNN inference
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CNN inference node : runs a CNN evaluator and outputs the result.
 * Wraps any run(input: number[]): number[] function.
 *
 * This is a generic wrapper: pass in the run function from
 * any @spiky-panda/core CNN runtime (CnnInferenceRuntime, etc.).
 */
class CnnNode extends _compute_node_base__WEBPACK_IMPORTED_MODULE_0__.ComputeNodeBase {
    constructor(nodeType, outputSize, evaluate, outputName = "output") {
        super();
        this.id = nodeType;
        this.nodeType = nodeType;
        this._evaluate = evaluate;
        this._outputName = outputName;
        this.outputShapes = [[outputSize]];
    }
    execute(inputs) {
        // Concatenate all input tensors into a single flat array
        let totalLen = 0;
        for (const t of inputs)
            totalLen += t.data.length;
        const flat = new Float32Array(totalLen);
        let offset = 0;
        for (const t of inputs) {
            flat.set(t.data, offset);
            offset += t.data.length;
        }
        const result = this._evaluate(Array.from(flat));
        return [{ data: new Float32Array(result), shape: [result.length], name: this._outputName }];
    }
}


/***/ }),

/***/ "./src/compute/nodes/concat.node.ts":
/*!******************************************!*\
  !*** ./src/compute/nodes/concat.node.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ConcatNode: () => (/* binding */ ConcatNode)
/* harmony export */ });
/* harmony import */ var _compute_node_base__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../compute.node.base */ "./src/compute/compute.node.base.ts");
// ═══════════════════════════════════════════════════════════════════════════
// ConcatNode : merges multiple input tensors into one flat vector
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Concatenation node : merges multiple input tensors into one flat vector.
 */
class ConcatNode extends _compute_node_base__WEBPACK_IMPORTED_MODULE_0__.ComputeNodeBase {
    constructor(inputSizes, outputName = "concat") {
        super();
        this.nodeType = "concat";
        this.id = outputName;
        this._totalSize = inputSizes.reduce((a, b) => a + b, 0);
        this._outputName = outputName;
        this.outputShapes = [[this._totalSize]];
    }
    execute(inputs) {
        const flat = new Float32Array(this._totalSize);
        let offset = 0;
        for (const t of inputs) {
            flat.set(t.data, offset);
            offset += t.data.length;
        }
        return [{ data: flat, shape: [this._totalSize], name: this._outputName }];
    }
}


/***/ }),

/***/ "./src/compute/nodes/external-input.node.ts":
/*!**************************************************!*\
  !*** ./src/compute/nodes/external-input.node.ts ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ExternalInputNode: () => (/* binding */ ExternalInputNode)
/* harmony export */ });
/* harmony import */ var _compute_node_base__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../compute.node.base */ "./src/compute/compute.node.base.ts");
// ═══════════════════════════════════════════════════════════════════════════
// ExternalInputNode : named injection point for runtime data
// ═══════════════════════════════════════════════════════════════════════════

/**
 * External input node : receives tensors from the graph's run() call.
 * Acts as a named injection point for sensor data, pose, goal, etc.
 */
class ExternalInputNode extends _compute_node_base__WEBPACK_IMPORTED_MODULE_0__.ComputeNodeBase {
    constructor(name, shape) {
        super();
        this.nodeType = "external_input";
        this.id = name;
        this._name = name;
        this._shape = shape;
        this.outputShapes = [shape];
    }
    execute(inputs) {
        // External inputs are injected by the graph engine via run()
        if (inputs.length > 0) {
            return [{ ...inputs[0], name: this._name }];
        }
        // Return zeros if no input provided
        const size = this._shape.reduce((a, b) => a * b, 1);
        return [{ data: new Float32Array(size), shape: this._shape, name: this._name }];
    }
}


/***/ }),

/***/ "./src/compute/nodes/index.ts":
/*!************************************!*\
  !*** ./src/compute/nodes/index.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CnnNode: () => (/* reexport safe */ _cnn_node__WEBPACK_IMPORTED_MODULE_2__.CnnNode),
/* harmony export */   ConcatNode: () => (/* reexport safe */ _concat_node__WEBPACK_IMPORTED_MODULE_4__.ConcatNode),
/* harmony export */   ExternalInputNode: () => (/* reexport safe */ _external_input_node__WEBPACK_IMPORTED_MODULE_0__.ExternalInputNode),
/* harmony export */   MLPNode: () => (/* reexport safe */ _mlp_node__WEBPACK_IMPORTED_MODULE_1__.MLPNode),
/* harmony export */   RnnNode: () => (/* reexport safe */ _rnn_node__WEBPACK_IMPORTED_MODULE_3__.RnnNode)
/* harmony export */ });
/* harmony import */ var _external_input_node__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./external-input.node */ "./src/compute/nodes/external-input.node.ts");
/* harmony import */ var _mlp_node__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./mlp.node */ "./src/compute/nodes/mlp.node.ts");
/* harmony import */ var _cnn_node__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./cnn.node */ "./src/compute/nodes/cnn.node.ts");
/* harmony import */ var _rnn_node__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./rnn.node */ "./src/compute/nodes/rnn.node.ts");
/* harmony import */ var _concat_node__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./concat.node */ "./src/compute/nodes/concat.node.ts");







/***/ }),

/***/ "./src/compute/nodes/mlp.node.ts":
/*!***************************************!*\
  !*** ./src/compute/nodes/mlp.node.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MLPNode: () => (/* binding */ MLPNode)
/* harmony export */ });
/* harmony import */ var _compute_node_base__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../compute.node.base */ "./src/compute/compute.node.base.ts");
// ═══════════════════════════════════════════════════════════════════════════
// MLPNode : generic wrapper for MLP inference
// ═══════════════════════════════════════════════════════════════════════════

/**
 * MLP inference node : runs an MLP evaluator and outputs the result.
 * Wraps any evaluate(input: number[]): number[] function.
 *
 * This is a generic wrapper: pass in the evaluate function from
 * any @spiky-panda/core MLP runtime (MLPInferenceRuntime, etc.).
 */
class MLPNode extends _compute_node_base__WEBPACK_IMPORTED_MODULE_0__.ComputeNodeBase {
    constructor(nodeType, _inputSize, outputSize, evaluate, outputName = "output") {
        super();
        this.id = nodeType;
        this.nodeType = nodeType;
        this._evaluate = evaluate;
        this._outputName = outputName;
        this.outputShapes = [[outputSize]];
    }
    execute(inputs) {
        // Concatenate all input tensors into a single flat array
        let totalLen = 0;
        for (const t of inputs)
            totalLen += t.data.length;
        const flat = new Float32Array(totalLen);
        let offset = 0;
        for (const t of inputs) {
            flat.set(t.data, offset);
            offset += t.data.length;
        }
        const result = this._evaluate(Array.from(flat));
        return [{ data: new Float32Array(result), shape: [result.length], name: this._outputName }];
    }
}


/***/ }),

/***/ "./src/compute/nodes/rnn.node.ts":
/*!***************************************!*\
  !*** ./src/compute/nodes/rnn.node.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RnnNode: () => (/* binding */ RnnNode)
/* harmony export */ });
/* harmony import */ var _compute_node_base__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../compute.node.base */ "./src/compute/compute.node.base.ts");
// ═══════════════════════════════════════════════════════════════════════════
// RnnNode : generic wrapper for RNN inference (single timestep)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * RNN inference node : runs a single timestep through an RNN evaluator.
 * Wraps any step(input: number[]): number[] function.
 *
 * This is a generic wrapper: pass in the step function from
 * any @spiky-panda/core RNN runtime (RnnInferenceRuntime, etc.).
 *
 * The RNN maintains hidden state across calls internally,
 * so each execute() advances one timestep.
 */
class RnnNode extends _compute_node_base__WEBPACK_IMPORTED_MODULE_0__.ComputeNodeBase {
    constructor(nodeType, outputSize, step, outputName = "output") {
        super();
        this.id = nodeType;
        this.nodeType = nodeType;
        this._step = step;
        this._outputName = outputName;
        this.outputShapes = [[outputSize]];
    }
    execute(inputs) {
        // Concatenate all input tensors into a single flat array
        let totalLen = 0;
        for (const t of inputs)
            totalLen += t.data.length;
        const flat = new Float32Array(totalLen);
        let offset = 0;
        for (const t of inputs) {
            flat.set(t.data, offset);
            offset += t.data.length;
        }
        const result = this._step(Array.from(flat));
        return [{ data: new Float32Array(result), shape: [result.length], name: this._outputName }];
    }
}


/***/ }),

/***/ "./src/onnx/graph-builder.ts":
/*!***********************************!*\
  !*** ./src/onnx/graph-builder.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   OnnxGraphBuilder: () => (/* binding */ OnnxGraphBuilder)
/* harmony export */ });
/* harmony import */ var _compute_compute_graph__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../compute/compute.graph */ "./src/compute/compute.graph.ts");
/* harmony import */ var _compute_compute_node_base__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../compute/compute.node.base */ "./src/compute/compute.node.base.ts");
/* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./registry */ "./src/onnx/registry.ts");



/**
 * Source node that provides a constant tensor (from an ONNX initializer).
 */
class InitializerNode extends _compute_compute_node_base__WEBPACK_IMPORTED_MODULE_1__.ComputeNodeBase {
    constructor(init) {
        super();
        this.nodeType = "onnx_initializer";
        const data = (0,_registry__WEBPACK_IMPORTED_MODULE_2__.getInitializerData)(init);
        this.tensor = (0,_registry__WEBPACK_IMPORTED_MODULE_2__.makeTensor)(data, [...init.dims], init.name);
        this.outputShapes = [init.dims];
    }
    execute() {
        return [this.tensor];
    }
}
/**
 * Source node for external graph inputs.
 */
class InputNode extends _compute_compute_node_base__WEBPACK_IMPORTED_MODULE_1__.ComputeNodeBase {
    constructor(name, shape) {
        super();
        this.nodeType = "onnx_input";
        this.id = name;
        this.inputName = name;
        // Replace dynamic dims (0) with 1 for inference
        this.outputShapes = [shape.map((d) => (d <= 0 ? 1 : d))];
    }
    execute(inputs) {
        if (inputs.length > 0 && inputs[0])
            return [inputs[0]];
        const sz = this.outputShapes[0].reduce((a, b) => a * b, 1);
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_2__.makeTensor)(new Float32Array(sz), [...this.outputShapes[0]], this.inputName)];
    }
}
/**
 * Builds a runnable ComputeGraph from an OnnxParseResult + op registry.
 */
class OnnxGraphBuilder {
    constructor(registry) {
        this.registry = registry;
    }
    build(model) {
        const nodes = [];
        const links = [];
        // Map tensor name -> the node that produces it + output index
        const tensorProducer = new Map();
        // Map tensor name -> list of consumers (node + input index)
        const tensorConsumers = [];
        // Build initializer map
        const initMap = new Map();
        for (const init of model.initializers) {
            initMap.set(init.name, init);
        }
        // Create initializer nodes
        for (const init of model.initializers) {
            const node = new InitializerNode(init);
            nodes.push(node);
            tensorProducer.set(init.name, { node, outputIndex: 0 });
        }
        // Create input nodes (skip initializers that share input names)
        const inputNames = [];
        for (const inp of model.inputs) {
            if (initMap.has(inp.name))
                continue;
            const node = new InputNode(inp.name, inp.shape);
            nodes.push(node);
            tensorProducer.set(inp.name, { node, outputIndex: 0 });
            inputNames.push(inp.name);
        }
        // Create operator nodes
        for (const nodeInfo of model.nodes) {
            if (!this.registry.has(nodeInfo.opType)) {
                console.warn(`Skipping unsupported ONNX op: ${nodeInfo.opType}`);
                continue;
            }
            const node = this.registry.create(nodeInfo, initMap);
            nodes.push(node);
            // Register consumer for each input tensor
            for (let i = 0; i < nodeInfo.inputs.length; i++) {
                const tensorName = nodeInfo.inputs[i];
                if (tensorName) {
                    tensorConsumers.push({ tensorName, node, inputIndex: i });
                }
            }
            // Register producer for each output tensor
            for (let i = 0; i < nodeInfo.outputs.length; i++) {
                const tensorName = nodeInfo.outputs[i];
                if (tensorName) {
                    tensorProducer.set(tensorName, { node, outputIndex: i });
                }
            }
        }
        // Wire links
        for (const consumer of tensorConsumers) {
            const producer = tensorProducer.get(consumer.tensorName);
            if (!producer) {
                console.warn(`No producer for tensor: ${consumer.tensorName}`);
                continue;
            }
            const link = new _compute_compute_graph__WEBPACK_IMPORTED_MODULE_0__.DataLink(producer.node, consumer.node, consumer.inputIndex);
            links.push(link);
        }
        // Identify output tensor names
        const outputNames = model.outputs.map((o) => o.name);
        const graph = new _compute_compute_graph__WEBPACK_IMPORTED_MODULE_0__.ComputeGraph(nodes, links);
        return { graph, inputNames, outputNames };
    }
}


/***/ }),

/***/ "./src/onnx/index.ts":
/*!***************************!*\
  !*** ./src/onnx/index.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ATT_FLOAT: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.ATT_FLOAT),
/* harmony export */   ATT_FLOATS: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.ATT_FLOATS),
/* harmony export */   ATT_INT: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.ATT_INT),
/* harmony export */   ATT_INTS: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.ATT_INTS),
/* harmony export */   ATT_NAME: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.ATT_NAME),
/* harmony export */   ATT_TENSOR: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.ATT_TENSOR),
/* harmony export */   DIM_SYMBOL: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.DIM_SYMBOL),
/* harmony export */   DIM_VALUE: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.DIM_VALUE),
/* harmony export */   GRAPH_DOC_STRING: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.GRAPH_DOC_STRING),
/* harmony export */   GRAPH_INITIALIZER: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.GRAPH_INITIALIZER),
/* harmony export */   GRAPH_INPUT: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.GRAPH_INPUT),
/* harmony export */   GRAPH_NAME: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.GRAPH_NAME),
/* harmony export */   GRAPH_NODE: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.GRAPH_NODE),
/* harmony export */   GRAPH_OUTPUT: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.GRAPH_OUTPUT),
/* harmony export */   GRAPH_VALUE_INFO: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.GRAPH_VALUE_INFO),
/* harmony export */   KEY_MAX_LENGTH: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.KEY_MAX_LENGTH),
/* harmony export */   LB_EOF: () => (/* reexport safe */ _pb_index__WEBPACK_IMPORTED_MODULE_0__.LB_EOF),
/* harmony export */   MODEL_GRAPH: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.MODEL_GRAPH),
/* harmony export */   MODEL_IR_VERSION: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.MODEL_IR_VERSION),
/* harmony export */   MemoryStream: () => (/* reexport safe */ _pb_index__WEBPACK_IMPORTED_MODULE_0__.MemoryStream),
/* harmony export */   NODE_ATTRIBUTE: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.NODE_ATTRIBUTE),
/* harmony export */   NODE_INPUT: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.NODE_INPUT),
/* harmony export */   NODE_NAME: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.NODE_NAME),
/* harmony export */   NODE_OP_TYPE: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.NODE_OP_TYPE),
/* harmony export */   NODE_OUTPUT: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.NODE_OUTPUT),
/* harmony export */   ONNX_INVALID_INITIALIZER_SHAPE: () => (/* reexport safe */ _onnx_parser__WEBPACK_IMPORTED_MODULE_2__.ONNX_INVALID_INITIALIZER_SHAPE),
/* harmony export */   ONNX_READ_ERROR: () => (/* reexport safe */ _onnx_parser__WEBPACK_IMPORTED_MODULE_2__.ONNX_READ_ERROR),
/* harmony export */   ONNX_SUCCESS: () => (/* reexport safe */ _onnx_parser__WEBPACK_IMPORTED_MODULE_2__.ONNX_SUCCESS),
/* harmony export */   ONNX_SYSTEM_ERROR: () => (/* reexport safe */ _onnx_parser__WEBPACK_IMPORTED_MODULE_2__.ONNX_SYSTEM_ERROR),
/* harmony export */   ONNX_UNSUPPORTED_ATTRIBUTE: () => (/* reexport safe */ _onnx_parser__WEBPACK_IMPORTED_MODULE_2__.ONNX_UNSUPPORTED_ATTRIBUTE),
/* harmony export */   ONNX_UNSUPPORTED_NODE: () => (/* reexport safe */ _onnx_parser__WEBPACK_IMPORTED_MODULE_2__.ONNX_UNSUPPORTED_NODE),
/* harmony export */   ONNX_UNSUPPORTED_TENSOR_DATA_TYPE: () => (/* reexport safe */ _onnx_parser__WEBPACK_IMPORTED_MODULE_2__.ONNX_UNSUPPORTED_TENSOR_DATA_TYPE),
/* harmony export */   ONNX_UNSUPPORTED_TENSOR_DIM: () => (/* reexport safe */ _onnx_parser__WEBPACK_IMPORTED_MODULE_2__.ONNX_UNSUPPORTED_TENSOR_DIM),
/* harmony export */   OnnxDataType: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.OnnxDataType),
/* harmony export */   OnnxGraphBuilder: () => (/* reexport safe */ _graph_builder__WEBPACK_IMPORTED_MODULE_5__.OnnxGraphBuilder),
/* harmony export */   OnnxLinkType: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.OnnxLinkType),
/* harmony export */   OnnxOpNode: () => (/* reexport safe */ _registry__WEBPACK_IMPORTED_MODULE_4__.OnnxOpNode),
/* harmony export */   OnnxOpRegistry: () => (/* reexport safe */ _registry__WEBPACK_IMPORTED_MODULE_4__.OnnxOpRegistry),
/* harmony export */   OnnxParser: () => (/* reexport safe */ _onnx_parser__WEBPACK_IMPORTED_MODULE_2__.OnnxParser),
/* harmony export */   OnnxWriter: () => (/* reexport safe */ _onnx_writer__WEBPACK_IMPORTED_MODULE_3__.OnnxWriter),
/* harmony export */   PBReader: () => (/* reexport safe */ _pb_index__WEBPACK_IMPORTED_MODULE_0__.PBReader),
/* harmony export */   PBSubReader: () => (/* reexport safe */ _pb_index__WEBPACK_IMPORTED_MODULE_0__.PBSubReader),
/* harmony export */   PBWriter: () => (/* reexport safe */ _pb_index__WEBPACK_IMPORTED_MODULE_0__.PBWriter),
/* harmony export */   PRIORITY_GENERIC: () => (/* reexport safe */ _registry__WEBPACK_IMPORTED_MODULE_4__.PRIORITY_GENERIC),
/* harmony export */   PRIORITY_NATIVE: () => (/* reexport safe */ _registry__WEBPACK_IMPORTED_MODULE_4__.PRIORITY_NATIVE),
/* harmony export */   SHAPE_DIM: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.SHAPE_DIM),
/* harmony export */   SeekOrigin: () => (/* reexport safe */ _pb_index__WEBPACK_IMPORTED_MODULE_0__.SeekOrigin),
/* harmony export */   StreamView: () => (/* reexport safe */ _pb_index__WEBPACK_IMPORTED_MODULE_0__.StreamView),
/* harmony export */   TENSOR_DATA_TYPE: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.TENSOR_DATA_TYPE),
/* harmony export */   TENSOR_DIMS: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.TENSOR_DIMS),
/* harmony export */   TENSOR_DOUBLE_DATA: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.TENSOR_DOUBLE_DATA),
/* harmony export */   TENSOR_FLOAT_DATA: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.TENSOR_FLOAT_DATA),
/* harmony export */   TENSOR_INT32_DATA: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.TENSOR_INT32_DATA),
/* harmony export */   TENSOR_INT64_DATA: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.TENSOR_INT64_DATA),
/* harmony export */   TENSOR_MAX_DIMENSION: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.TENSOR_MAX_DIMENSION),
/* harmony export */   TENSOR_NAME: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.TENSOR_NAME),
/* harmony export */   TENSOR_RAW_DATA: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.TENSOR_RAW_DATA),
/* harmony export */   TENSOR_STRING_DATA: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.TENSOR_STRING_DATA),
/* harmony export */   TENSOR_TYPE_ELEM_TYPE: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.TENSOR_TYPE_ELEM_TYPE),
/* harmony export */   TENSOR_TYPE_SHAPE: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.TENSOR_TYPE_SHAPE),
/* harmony export */   TENSOR_UINT64_DATA: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.TENSOR_UINT64_DATA),
/* harmony export */   TYPE_TENSOR: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.TYPE_TENSOR),
/* harmony export */   VINFO_NAME: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.VINFO_NAME),
/* harmony export */   VINFO_TYPE: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.VINFO_TYPE),
/* harmony export */   WireType: () => (/* reexport safe */ _pb_index__WEBPACK_IMPORTED_MODULE_0__.WireType),
/* harmony export */   createDefaultRegistry: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.createDefaultRegistry),
/* harmony export */   createSpikyPandaRegistry: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.createSpikyPandaRegistry),
/* harmony export */   getInitializerData: () => (/* reexport safe */ _registry__WEBPACK_IMPORTED_MODULE_4__.getInitializerData),
/* harmony export */   makeTensor: () => (/* reexport safe */ _registry__WEBPACK_IMPORTED_MODULE_4__.makeTensor),
/* harmony export */   onnxDataTypeSize: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.onnxDataTypeSize),
/* harmony export */   registerActivationOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerActivationOps),
/* harmony export */   registerConvOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerConvOps),
/* harmony export */   registerDspOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerDspOps),
/* harmony export */   registerMathOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerMathOps),
/* harmony export */   registerMatrixOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerMatrixOps),
/* harmony export */   registerMiscOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerMiscOps),
/* harmony export */   registerNormOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerNormOps),
/* harmony export */   registerRecurrentOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerRecurrentOps),
/* harmony export */   registerSpikyPandaOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerSpikyPandaOps),
/* harmony export */   shapeSize: () => (/* reexport safe */ _registry__WEBPACK_IMPORTED_MODULE_4__.shapeSize)
/* harmony export */ });
/* harmony import */ var _pb_index__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./pb/index */ "./src/onnx/pb/index.ts");
/* harmony import */ var _onnx_types__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./onnx-types */ "./src/onnx/onnx-types.ts");
/* harmony import */ var _onnx_parser__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./onnx-parser */ "./src/onnx/onnx-parser.ts");
/* harmony import */ var _onnx_writer__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./onnx-writer */ "./src/onnx/onnx-writer.ts");
/* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./registry */ "./src/onnx/registry.ts");
/* harmony import */ var _graph_builder__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./graph-builder */ "./src/onnx/graph-builder.ts");
/* harmony import */ var _ops_index__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./ops/index */ "./src/onnx/ops/index.ts");









/***/ }),

/***/ "./src/onnx/onnx-parser.ts":
/*!*********************************!*\
  !*** ./src/onnx/onnx-parser.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ONNX_INVALID_INITIALIZER_SHAPE: () => (/* binding */ ONNX_INVALID_INITIALIZER_SHAPE),
/* harmony export */   ONNX_READ_ERROR: () => (/* binding */ ONNX_READ_ERROR),
/* harmony export */   ONNX_SUCCESS: () => (/* binding */ ONNX_SUCCESS),
/* harmony export */   ONNX_SYSTEM_ERROR: () => (/* binding */ ONNX_SYSTEM_ERROR),
/* harmony export */   ONNX_UNSUPPORTED_ATTRIBUTE: () => (/* binding */ ONNX_UNSUPPORTED_ATTRIBUTE),
/* harmony export */   ONNX_UNSUPPORTED_NODE: () => (/* binding */ ONNX_UNSUPPORTED_NODE),
/* harmony export */   ONNX_UNSUPPORTED_TENSOR_DATA_TYPE: () => (/* binding */ ONNX_UNSUPPORTED_TENSOR_DATA_TYPE),
/* harmony export */   ONNX_UNSUPPORTED_TENSOR_DIM: () => (/* binding */ ONNX_UNSUPPORTED_TENSOR_DIM),
/* harmony export */   OnnxParser: () => (/* binding */ OnnxParser)
/* harmony export */ });
/* harmony import */ var _pb_reader__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./pb/reader */ "./src/onnx/pb/reader.ts");
/* harmony import */ var _pb_stream__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./pb/stream */ "./src/onnx/pb/stream.ts");
/* harmony import */ var _onnx_types__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./onnx-types */ "./src/onnx/onnx-types.ts");
// ═══════════════════════════════════════════════════════════════════════════
// ONNX model parser
//
// Ported from CyanMycelium::OnnxGraphBuilder (C++ implementation).
// Parses an ONNX protobuf binary into structured TypeScript objects
// (OnnxNodeInfo, OnnxTensorInfo, OnnxValueInfo) that can then be used
// to build a SpikyPanda ComputeGraph.
//
// Zero dependencies beyond the local pb/ reader and onnx-types.
// ═══════════════════════════════════════════════════════════════════════════




// ─── Error codes ─────────────────────────────────────────────────────────
const ONNX_SUCCESS = 0;
const ONNX_UNSUPPORTED_NODE = 100;
const ONNX_UNSUPPORTED_ATTRIBUTE = 101;
const ONNX_UNSUPPORTED_TENSOR_DATA_TYPE = 110;
const ONNX_UNSUPPORTED_TENSOR_DIM = 111;
const ONNX_INVALID_INITIALIZER_SHAPE = 113;
const ONNX_READ_ERROR = 200;
const ONNX_SYSTEM_ERROR = 300;
// ─── OnnxParser ──────────────────────────────────────────────────────────
/**
 * Parses an ONNX protobuf binary into a structured result.
 *
 * Ported from CyanMycelium::OnnxGraphBuilder.
 *
 * Usage:
 * ```typescript
 * const bytes = await fetch("model.onnx").then(r => r.arrayBuffer());
 * const result = OnnxParser.parse(new Uint8Array(bytes));
 * console.log(result.nodes.map(n => n.opType));
 * ```
 */
class OnnxParser {
    constructor() {
        this._error = ONNX_SUCCESS;
        this._errorInfo = "";
    }
    get error() {
        return this._error;
    }
    get errorInfo() {
        return this._errorInfo;
    }
    /**
     * Parse an ONNX model from raw bytes.
     * @param data  The raw .onnx file content.
     * @returns     The parsed result, or null on error.
     */
    static parse(data) {
        const parser = new OnnxParser();
        return parser.parseModel(data);
    }
    /**
     * Parse an ONNX model.
     */
    parseModel(data) {
        const reader = new _pb_reader__WEBPACK_IMPORTED_MODULE_0__.PBReader(new _pb_stream__WEBPACK_IMPORTED_MODULE_1__.MemoryStream(data));
        const result = {
            irVersion: 0,
            graphName: "",
            nodes: [],
            initializers: [],
            inputs: [],
            outputs: [],
            valueInfos: [],
        };
        while (reader.readTag()) {
            switch (reader.fieldNumber) {
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.MODEL_IR_VERSION: {
                    const v = reader.readInt32();
                    if (v === null) {
                        this._setError(ONNX_READ_ERROR, "Failed to read IR version");
                        return null;
                    }
                    result.irVersion = v;
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.MODEL_GRAPH: {
                    const sub = reader.getSubMessageReader();
                    if (!sub) {
                        this._setError(ONNX_READ_ERROR, "Failed to read graph");
                        return null;
                    }
                    if (!this._readGraph(sub, result))
                        return null;
                    break;
                }
                default: {
                    if (!reader.skip()) {
                        this._setError(ONNX_READ_ERROR, "Failed to skip field");
                        return null;
                    }
                }
            }
        }
        return result;
    }
    // ── Graph ─────────────────────────────────────────────────────────────
    _readGraph(reader, result) {
        while (reader.readTag()) {
            switch (reader.fieldNumber) {
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.GRAPH_NODE: {
                    const sub = reader.getSubMessageReader();
                    if (!sub)
                        return this._fail("Failed to read node");
                    const node = this._readNode(sub);
                    if (!node)
                        return false;
                    result.nodes.push(node);
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.GRAPH_NAME: {
                    const name = reader.readString(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.KEY_MAX_LENGTH);
                    if (name === null)
                        return this._fail("Failed to read graph name");
                    result.graphName = name;
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.GRAPH_INITIALIZER: {
                    const sub = reader.getSubMessageReader();
                    if (!sub)
                        return this._fail("Failed to read initializer");
                    const init = this._readInitializer(sub);
                    if (!init)
                        return false;
                    result.initializers.push(init);
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.GRAPH_INPUT: {
                    const sub = reader.getSubMessageReader();
                    if (!sub)
                        return this._fail("Failed to read input");
                    const vi = this._readValueInfo(sub, _onnx_types__WEBPACK_IMPORTED_MODULE_2__.OnnxLinkType.INPUT);
                    if (!vi)
                        return false;
                    result.inputs.push(vi);
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.GRAPH_OUTPUT: {
                    const sub = reader.getSubMessageReader();
                    if (!sub)
                        return this._fail("Failed to read output");
                    const vi = this._readValueInfo(sub, _onnx_types__WEBPACK_IMPORTED_MODULE_2__.OnnxLinkType.OUTPUT);
                    if (!vi)
                        return false;
                    result.outputs.push(vi);
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.GRAPH_VALUE_INFO: {
                    const sub = reader.getSubMessageReader();
                    if (!sub)
                        return this._fail("Failed to read value_info");
                    const vi = this._readValueInfo(sub, _onnx_types__WEBPACK_IMPORTED_MODULE_2__.OnnxLinkType.UNKNOWN);
                    if (!vi)
                        return false;
                    result.valueInfos.push(vi);
                    break;
                }
                default: {
                    if (!reader.skip())
                        return this._fail("Failed to skip graph field");
                }
            }
        }
        return true;
    }
    // ── Node ──────────────────────────────────────────────────────────────
    _readNode(reader) {
        const node = {
            name: "",
            opType: "",
            inputs: [],
            outputs: [],
            attributes: new Map(),
        };
        // Two-pass read: first find op_type, then parse everything
        reader.save();
        while (reader.readTag()) {
            if (reader.fieldNumber === _onnx_types__WEBPACK_IMPORTED_MODULE_2__.NODE_OP_TYPE) {
                const t = reader.readString(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.KEY_MAX_LENGTH);
                if (t === null) {
                    this._setError(ONNX_READ_ERROR, "Failed to read op_type");
                    return null;
                }
                node.opType = t;
                break;
            }
            reader.skip();
        }
        reader.restore();
        // Second pass: read all fields
        while (reader.readTag()) {
            switch (reader.fieldNumber) {
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.NODE_INPUT: {
                    const s = reader.readString(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.KEY_MAX_LENGTH);
                    if (s === null)
                        return null;
                    if (s.length > 0)
                        node.inputs.push(s);
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.NODE_OUTPUT: {
                    const s = reader.readString(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.KEY_MAX_LENGTH);
                    if (s === null)
                        return null;
                    if (s.length > 0)
                        node.outputs.push(s);
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.NODE_NAME: {
                    const s = reader.readString(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.KEY_MAX_LENGTH);
                    if (s === null)
                        return null;
                    node.name = s;
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.NODE_OP_TYPE: {
                    // Already read in first pass, just skip
                    reader.skip();
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.NODE_ATTRIBUTE: {
                    // Inline parse (avoid sub-reader for performance)
                    const len = reader.readLength(false);
                    if (len === null)
                        return null;
                    const end = reader.position + len;
                    let attName = "";
                    let attFloat = 0;
                    let attInt = 0;
                    let hasFloat = false;
                    let hasInt = false;
                    let attTensor = null;
                    while (reader.position < end) {
                        if (!reader.readTag())
                            return null;
                        const attField = reader.fieldNumber;
                        switch (attField) {
                            case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.ATT_NAME: {
                                const s = reader.readString(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.KEY_MAX_LENGTH);
                                if (s === null)
                                    return null;
                                attName = s;
                                break;
                            }
                            case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.ATT_FLOAT: {
                                const f = reader.readFloat();
                                if (f === null)
                                    return null;
                                attFloat = f;
                                hasFloat = true;
                                break;
                            }
                            case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.ATT_INT: {
                                const i = reader.readInt64();
                                if (i === null)
                                    return null;
                                attInt = i;
                                hasInt = true;
                                break;
                            }
                            case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.ATT_TENSOR: {
                                const sub = reader.getSubMessageReader();
                                if (!sub)
                                    return null;
                                attTensor = this._readInitializer(sub);
                                break;
                            }
                            case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.ATT_INTS: {
                                // Repeated int64: store first value as scalar attr
                                const i = reader.readInt64();
                                if (i === null)
                                    return null;
                                if (!hasInt) {
                                    attInt = i;
                                    hasInt = true;
                                }
                                break;
                            }
                            case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.ATT_FLOATS: {
                                // Repeated float: store first value as scalar attr
                                const f = reader.readFloat();
                                if (f === null)
                                    return null;
                                if (!hasFloat) {
                                    attFloat = f;
                                    hasFloat = true;
                                }
                                break;
                            }
                            default:
                                reader.skip();
                                break;
                        }
                    }
                    if (attName) {
                        if (attTensor) {
                            if (!node.tensorAttributes) {
                                node.tensorAttributes = new Map();
                            }
                            node.tensorAttributes.set(attName, attTensor);
                        }
                        else if (hasFloat || hasInt) {
                            node.attributes.set(attName, hasFloat ? attFloat : attInt);
                        }
                    }
                    break;
                }
                default: {
                    reader.skip();
                    break;
                }
            }
        }
        return node;
    }
    // ── ValueInfo ─────────────────────────────────────────────────────────
    _readValueInfo(reader, type) {
        const info = {
            name: "",
            type,
            elemType: _onnx_types__WEBPACK_IMPORTED_MODULE_2__.OnnxDataType.UNDEFINED,
            shape: [],
        };
        while (reader.readTag()) {
            switch (reader.fieldNumber) {
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.VINFO_NAME: {
                    const s = reader.readString(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.KEY_MAX_LENGTH);
                    if (s === null)
                        return null;
                    info.name = s;
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.VINFO_TYPE: {
                    // Inline parse TypeProto
                    const len = reader.readLength(false);
                    if (len === null)
                        return null;
                    const end = reader.position + len;
                    while (reader.position < end) {
                        if (!reader.readTag())
                            return null;
                        if (reader.fieldNumber === _onnx_types__WEBPACK_IMPORTED_MODULE_2__.TYPE_TENSOR) {
                            const sub = reader.getSubMessageReader();
                            if (!sub)
                                return null;
                            if (!this._readTensorType(sub, info))
                                return null;
                        }
                        else {
                            reader.skip();
                        }
                    }
                    break;
                }
                default:
                    reader.skip();
                    break;
            }
        }
        return info;
    }
    _readTensorType(reader, info) {
        while (reader.readTag()) {
            switch (reader.fieldNumber) {
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_TYPE_ELEM_TYPE: {
                    const v = reader.readInt32();
                    if (v === null)
                        return false;
                    info.elemType = v;
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_TYPE_SHAPE: {
                    const sub = reader.getSubMessageReader();
                    if (!sub)
                        return false;
                    if (!this._readTensorShape(sub, info))
                        return false;
                    break;
                }
                default:
                    reader.skip();
                    break;
            }
        }
        return true;
    }
    _readTensorShape(reader, info) {
        while (reader.readTag()) {
            if (reader.fieldNumber === _onnx_types__WEBPACK_IMPORTED_MODULE_2__.SHAPE_DIM) {
                // Inline parse DimensionProto
                const len = reader.readLength(false);
                if (len === null)
                    return false;
                const end = reader.position + len;
                while (reader.position < end) {
                    if (!reader.readTag())
                        return false;
                    const dimField = reader.fieldNumber;
                    switch (dimField) {
                        case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.DIM_VALUE: {
                            const v = reader.readInt64();
                            if (v === null)
                                return false;
                            info.shape.push(v);
                            break;
                        }
                        case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.DIM_SYMBOL: {
                            // Symbolic dimension (e.g., "batch_size"), store as 0
                            reader.skip();
                            info.shape.push(0);
                            break;
                        }
                        default:
                            reader.skip();
                            break;
                    }
                }
            }
            else {
                reader.skip();
            }
        }
        return true;
    }
    // ── Initializer (TensorProto) ─────────────────────────────────────────
    _readInitializer(reader) {
        const tensor = {
            name: "",
            dataType: _onnx_types__WEBPACK_IMPORTED_MODULE_2__.OnnxDataType.UNDEFINED,
            dims: [],
        };
        let totalElements = 0;
        while (reader.readTag()) {
            switch (reader.fieldNumber) {
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_DIMS: {
                    if (reader.wireType === _pb_reader__WEBPACK_IMPORTED_MODULE_0__.WireType.LEN) {
                        // Packed dims
                        const tmpDims = new Int32Array(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_MAX_DIMENSION);
                        const count = reader.readPackedInt32(tmpDims, _onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_MAX_DIMENSION);
                        if (count === null)
                            return null;
                        tensor.dims = Array.from(tmpDims.subarray(0, count));
                    }
                    else {
                        // Individual varint dim
                        const v = reader.readInt32();
                        if (v === null)
                            return null;
                        tensor.dims.push(v);
                    }
                    // Recompute total elements
                    totalElements = tensor.dims.length > 0 ? tensor.dims.reduce((a, b) => a * b, 1) : 0;
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_DATA_TYPE: {
                    const v = reader.readInt32();
                    if (v === null)
                        return null;
                    tensor.dataType = v;
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_NAME: {
                    const s = reader.readString(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.KEY_MAX_LENGTH);
                    if (s === null)
                        return null;
                    tensor.name = s;
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_FLOAT_DATA: {
                    if (totalElements === 0) {
                        reader.skip();
                        break;
                    }
                    if (!tensor.floatData) {
                        tensor.floatData = new Float32Array(totalElements);
                    }
                    if (reader.wireType === _pb_reader__WEBPACK_IMPORTED_MODULE_0__.WireType.LEN) {
                        // Packed floats
                        reader.readPackedFloat32(tensor.floatData, totalElements);
                    }
                    else {
                        // Individual float (rare)
                        const f = reader.readFloat();
                        if (f === null)
                            return null;
                        // Find next empty slot
                        for (let i = 0; i < totalElements; i++) {
                            if (tensor.floatData[i] === 0) {
                                tensor.floatData[i] = f;
                                break;
                            }
                        }
                    }
                    break;
                }
                case _onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_RAW_DATA: {
                    const bytes = reader.readBytes();
                    if (bytes === null)
                        return null;
                    tensor.rawData = bytes;
                    // If float type, also create the float view
                    if (tensor.dataType === _onnx_types__WEBPACK_IMPORTED_MODULE_2__.OnnxDataType.FLOAT && totalElements > 0) {
                        const aligned = new Float32Array(bytes.buffer, bytes.byteOffset, totalElements);
                        tensor.floatData = new Float32Array(aligned); // copy to ensure alignment
                    }
                    break;
                }
                default: {
                    reader.skip();
                    break;
                }
            }
        }
        return tensor;
    }
    // ── Error helpers ─────────────────────────────────────────────────────
    _setError(code, info) {
        this._error = code;
        this._errorInfo = info;
    }
    _fail(msg) {
        this._setError(ONNX_READ_ERROR, msg);
        return false;
    }
}


/***/ }),

/***/ "./src/onnx/onnx-types.ts":
/*!********************************!*\
  !*** ./src/onnx/onnx-types.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ATT_FLOAT: () => (/* binding */ ATT_FLOAT),
/* harmony export */   ATT_FLOATS: () => (/* binding */ ATT_FLOATS),
/* harmony export */   ATT_INT: () => (/* binding */ ATT_INT),
/* harmony export */   ATT_INTS: () => (/* binding */ ATT_INTS),
/* harmony export */   ATT_NAME: () => (/* binding */ ATT_NAME),
/* harmony export */   ATT_TENSOR: () => (/* binding */ ATT_TENSOR),
/* harmony export */   DIM_SYMBOL: () => (/* binding */ DIM_SYMBOL),
/* harmony export */   DIM_VALUE: () => (/* binding */ DIM_VALUE),
/* harmony export */   GRAPH_DOC_STRING: () => (/* binding */ GRAPH_DOC_STRING),
/* harmony export */   GRAPH_INITIALIZER: () => (/* binding */ GRAPH_INITIALIZER),
/* harmony export */   GRAPH_INPUT: () => (/* binding */ GRAPH_INPUT),
/* harmony export */   GRAPH_NAME: () => (/* binding */ GRAPH_NAME),
/* harmony export */   GRAPH_NODE: () => (/* binding */ GRAPH_NODE),
/* harmony export */   GRAPH_OUTPUT: () => (/* binding */ GRAPH_OUTPUT),
/* harmony export */   GRAPH_VALUE_INFO: () => (/* binding */ GRAPH_VALUE_INFO),
/* harmony export */   KEY_MAX_LENGTH: () => (/* binding */ KEY_MAX_LENGTH),
/* harmony export */   MODEL_GRAPH: () => (/* binding */ MODEL_GRAPH),
/* harmony export */   MODEL_IR_VERSION: () => (/* binding */ MODEL_IR_VERSION),
/* harmony export */   NODE_ATTRIBUTE: () => (/* binding */ NODE_ATTRIBUTE),
/* harmony export */   NODE_INPUT: () => (/* binding */ NODE_INPUT),
/* harmony export */   NODE_NAME: () => (/* binding */ NODE_NAME),
/* harmony export */   NODE_OP_TYPE: () => (/* binding */ NODE_OP_TYPE),
/* harmony export */   NODE_OUTPUT: () => (/* binding */ NODE_OUTPUT),
/* harmony export */   OnnxDataType: () => (/* binding */ OnnxDataType),
/* harmony export */   OnnxLinkType: () => (/* binding */ OnnxLinkType),
/* harmony export */   SHAPE_DIM: () => (/* binding */ SHAPE_DIM),
/* harmony export */   TENSOR_DATA_TYPE: () => (/* binding */ TENSOR_DATA_TYPE),
/* harmony export */   TENSOR_DIMS: () => (/* binding */ TENSOR_DIMS),
/* harmony export */   TENSOR_DOUBLE_DATA: () => (/* binding */ TENSOR_DOUBLE_DATA),
/* harmony export */   TENSOR_FLOAT_DATA: () => (/* binding */ TENSOR_FLOAT_DATA),
/* harmony export */   TENSOR_INT32_DATA: () => (/* binding */ TENSOR_INT32_DATA),
/* harmony export */   TENSOR_INT64_DATA: () => (/* binding */ TENSOR_INT64_DATA),
/* harmony export */   TENSOR_MAX_DIMENSION: () => (/* binding */ TENSOR_MAX_DIMENSION),
/* harmony export */   TENSOR_NAME: () => (/* binding */ TENSOR_NAME),
/* harmony export */   TENSOR_RAW_DATA: () => (/* binding */ TENSOR_RAW_DATA),
/* harmony export */   TENSOR_STRING_DATA: () => (/* binding */ TENSOR_STRING_DATA),
/* harmony export */   TENSOR_TYPE_ELEM_TYPE: () => (/* binding */ TENSOR_TYPE_ELEM_TYPE),
/* harmony export */   TENSOR_TYPE_SHAPE: () => (/* binding */ TENSOR_TYPE_SHAPE),
/* harmony export */   TENSOR_UINT64_DATA: () => (/* binding */ TENSOR_UINT64_DATA),
/* harmony export */   TYPE_TENSOR: () => (/* binding */ TYPE_TENSOR),
/* harmony export */   VINFO_NAME: () => (/* binding */ VINFO_NAME),
/* harmony export */   VINFO_TYPE: () => (/* binding */ VINFO_TYPE),
/* harmony export */   onnxDataTypeSize: () => (/* binding */ onnxDataTypeSize)
/* harmony export */ });
// ═══════════════════════════════════════════════════════════════════════════
// ONNX data types and protobuf field constants
//
// Mirrors the ONNX 1.18.0 protobuf schema (onnx.proto3) as TypeScript
// types and numeric constants. No code generation required.
// ═══════════════════════════════════════════════════════════════════════════
// ─── Tensor data types (from onnx.proto3 TensorProto.DataType) ───────────
var OnnxDataType;
(function (OnnxDataType) {
    OnnxDataType[OnnxDataType["UNDEFINED"] = 0] = "UNDEFINED";
    OnnxDataType[OnnxDataType["FLOAT"] = 1] = "FLOAT";
    OnnxDataType[OnnxDataType["UINT8"] = 2] = "UINT8";
    OnnxDataType[OnnxDataType["INT8"] = 3] = "INT8";
    OnnxDataType[OnnxDataType["UINT16"] = 4] = "UINT16";
    OnnxDataType[OnnxDataType["INT16"] = 5] = "INT16";
    OnnxDataType[OnnxDataType["INT32"] = 6] = "INT32";
    OnnxDataType[OnnxDataType["INT64"] = 7] = "INT64";
    OnnxDataType[OnnxDataType["STRING"] = 8] = "STRING";
    OnnxDataType[OnnxDataType["BOOL"] = 9] = "BOOL";
    OnnxDataType[OnnxDataType["FLOAT16"] = 10] = "FLOAT16";
    OnnxDataType[OnnxDataType["DOUBLE"] = 11] = "DOUBLE";
    OnnxDataType[OnnxDataType["UINT32"] = 12] = "UINT32";
    OnnxDataType[OnnxDataType["UINT64"] = 13] = "UINT64";
    OnnxDataType[OnnxDataType["COMPLEX64"] = 14] = "COMPLEX64";
    OnnxDataType[OnnxDataType["COMPLEX128"] = 15] = "COMPLEX128";
    OnnxDataType[OnnxDataType["BFLOAT16"] = 16] = "BFLOAT16";
})(OnnxDataType || (OnnxDataType = {}));
/** Byte size per element for supported data types. */
function onnxDataTypeSize(type) {
    switch (type) {
        case OnnxDataType.FLOAT:
        case OnnxDataType.INT32:
        case OnnxDataType.UINT32:
            return 4;
        case OnnxDataType.DOUBLE:
        case OnnxDataType.INT64:
        case OnnxDataType.UINT64:
            return 8;
        case OnnxDataType.FLOAT16:
        case OnnxDataType.BFLOAT16:
        case OnnxDataType.INT16:
        case OnnxDataType.UINT16:
            return 2;
        case OnnxDataType.INT8:
        case OnnxDataType.UINT8:
        case OnnxDataType.BOOL:
            return 1;
        default:
            return 0;
    }
}
// ─── Link type (mirrors CyanMycelium::LinkType) ─────────────────────────
var OnnxLinkType;
(function (OnnxLinkType) {
    OnnxLinkType[OnnxLinkType["UNKNOWN"] = 0] = "UNKNOWN";
    OnnxLinkType[OnnxLinkType["INPUT"] = 1] = "INPUT";
    OnnxLinkType[OnnxLinkType["OUTPUT"] = 2] = "OUTPUT";
    OnnxLinkType[OnnxLinkType["INITIALIZER"] = 3] = "INITIALIZER";
})(OnnxLinkType || (OnnxLinkType = {}));
// ─── Protobuf field numbers ──────────────────────────────────────────────
// These match the ONNX .proto field indices exactly.
// ModelProto
const MODEL_IR_VERSION = 1;
const MODEL_GRAPH = 7;
// GraphProto
const GRAPH_NODE = 1;
const GRAPH_NAME = 2;
const GRAPH_INITIALIZER = 5;
const GRAPH_DOC_STRING = 10;
const GRAPH_INPUT = 11;
const GRAPH_OUTPUT = 12;
const GRAPH_VALUE_INFO = 13;
// NodeProto
const NODE_INPUT = 1;
const NODE_OUTPUT = 2;
const NODE_NAME = 3;
const NODE_OP_TYPE = 4;
const NODE_ATTRIBUTE = 5;
// AttributeProto (partial, most commonly used fields)
const ATT_NAME = 1;
const ATT_FLOAT = 2;
const ATT_INT = 3;
const ATT_TENSOR = 5;
const ATT_FLOATS = 7;
const ATT_INTS = 8;
// ValueInfoProto
const VINFO_NAME = 1;
const VINFO_TYPE = 2;
// TypeProto
const TYPE_TENSOR = 1;
// TensorTypeProto
const TENSOR_TYPE_ELEM_TYPE = 1;
const TENSOR_TYPE_SHAPE = 2;
// TensorShapeProto.Dimension
const SHAPE_DIM = 1;
const DIM_VALUE = 1;
const DIM_SYMBOL = 2;
// TensorProto (initializer)
const TENSOR_DIMS = 1;
const TENSOR_DATA_TYPE = 2;
const TENSOR_FLOAT_DATA = 4;
const TENSOR_INT32_DATA = 5;
const TENSOR_STRING_DATA = 6;
const TENSOR_INT64_DATA = 7;
const TENSOR_NAME = 8;
const TENSOR_RAW_DATA = 9;
const TENSOR_DOUBLE_DATA = 10;
const TENSOR_UINT64_DATA = 11;
// ─── Max constants ───────────────────────────────────────────────────────
const KEY_MAX_LENGTH = 128;
const TENSOR_MAX_DIMENSION = 8;


/***/ }),

/***/ "./src/onnx/onnx-writer.ts":
/*!*********************************!*\
  !*** ./src/onnx/onnx-writer.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   OnnxWriter: () => (/* binding */ OnnxWriter)
/* harmony export */ });
/* harmony import */ var _pb_writer__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./pb/writer */ "./src/onnx/pb/writer.ts");
/* harmony import */ var _pb_reader__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./pb/reader */ "./src/onnx/pb/reader.ts");
/* harmony import */ var _onnx_types__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./onnx-types */ "./src/onnx/onnx-types.ts");
// ═══════════════════════════════════════════════════════════════════════════
// ONNX model writer
//
// Symmetric counterpart to onnx-parser.ts.
// Serializes an OnnxParseResult back into a valid ONNX protobuf binary,
// reusing the same field constants and data structures.
//
// Zero dependencies beyond the local pb/ writer and onnx-types.
// ═══════════════════════════════════════════════════════════════════════════



// ─── OnnxWriter ──────────────────────────────────────────────────────────
/**
 * Serializes an OnnxParseResult into ONNX protobuf binary.
 *
 * Usage:
 * ```typescript
 * const result = OnnxParser.parse(originalBytes);
 * // … modify result …
 * const bytes = OnnxWriter.serialize(result);
 * ```
 */
class OnnxWriter {
    /**
     * Serialize an OnnxParseResult to raw ONNX protobuf bytes.
     */
    static serialize(model) {
        const writer = new OnnxWriter();
        return writer._writeModel(model);
    }
    // ── Model (ModelProto) ────────────────────────────────────────────────
    _writeModel(model) {
        const w = new _pb_writer__WEBPACK_IMPORTED_MODULE_0__.PBWriter();
        // ir_version (field 1, varint)
        if (model.irVersion > 0) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.MODEL_IR_VERSION, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.VARINT);
            w.writeInt32(model.irVersion);
        }
        // graph (field 7, length-delimited)
        w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.MODEL_GRAPH, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
        w.writeSubMessage((sub) => this._writeGraph(sub, model));
        return w.finish().slice(); // detach from internal buffer
    }
    // ── Graph (GraphProto) ────────────────────────────────────────────────
    _writeGraph(w, model) {
        // nodes (field 1, repeated)
        for (const node of model.nodes) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.GRAPH_NODE, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeSubMessage((sub) => this._writeNode(sub, node));
        }
        // name (field 2)
        if (model.graphName) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.GRAPH_NAME, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeString(model.graphName);
        }
        // initializers (field 5, repeated)
        for (const init of model.initializers) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.GRAPH_INITIALIZER, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeSubMessage((sub) => this._writeInitializer(sub, init));
        }
        // inputs (field 11, repeated)
        for (const input of model.inputs) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.GRAPH_INPUT, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeSubMessage((sub) => this._writeValueInfo(sub, input));
        }
        // outputs (field 12, repeated)
        for (const output of model.outputs) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.GRAPH_OUTPUT, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeSubMessage((sub) => this._writeValueInfo(sub, output));
        }
        // value_info (field 13, repeated)
        for (const vi of model.valueInfos) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.GRAPH_VALUE_INFO, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeSubMessage((sub) => this._writeValueInfo(sub, vi));
        }
    }
    // ── Node (NodeProto) ──────────────────────────────────────────────────
    _writeNode(w, node) {
        // inputs (field 1, repeated string)
        for (const input of node.inputs) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.NODE_INPUT, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeString(input);
        }
        // outputs (field 2, repeated string)
        for (const output of node.outputs) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.NODE_OUTPUT, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeString(output);
        }
        // name (field 3)
        if (node.name) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.NODE_NAME, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeString(node.name);
        }
        // op_type (field 4)
        if (node.opType) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.NODE_OP_TYPE, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeString(node.opType);
        }
        // attributes (field 5, repeated)
        for (const [name, value] of node.attributes) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.NODE_ATTRIBUTE, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeSubMessage((sub) => this._writeAttribute(sub, name, value));
        }
    }
    // ── Attribute (AttributeProto) ────────────────────────────────────────
    _writeAttribute(w, name, value) {
        // name (field 1)
        w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.ATT_NAME, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
        w.writeString(name);
        if (Number.isInteger(value)) {
            // int (field 3, varint — stored as int64 in ONNX)
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.ATT_INT, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.VARINT);
            w.writeInt64(value);
        }
        else {
            // float (field 2, fixed32)
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.ATT_FLOAT, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.FIXED32);
            w.writeFloat(value);
        }
    }
    // ── ValueInfo (ValueInfoProto) ────────────────────────────────────────
    _writeValueInfo(w, info) {
        // name (field 1)
        if (info.name) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.VINFO_NAME, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeString(info.name);
        }
        // type (field 2) → TypeProto → tensor_type (field 1) → TensorTypeProto
        if (info.elemType !== _onnx_types__WEBPACK_IMPORTED_MODULE_2__.OnnxDataType.UNDEFINED || info.shape.length > 0) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.VINFO_TYPE, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeSubMessage((typeW) => {
                typeW.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.TYPE_TENSOR, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
                typeW.writeSubMessage((ttW) => this._writeTensorType(ttW, info));
            });
        }
    }
    // ── TensorTypeProto ───────────────────────────────────────────────────
    _writeTensorType(w, info) {
        // elem_type (field 1, varint)
        if (info.elemType !== _onnx_types__WEBPACK_IMPORTED_MODULE_2__.OnnxDataType.UNDEFINED) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_TYPE_ELEM_TYPE, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.VARINT);
            w.writeInt32(info.elemType);
        }
        // shape (field 2) → TensorShapeProto
        if (info.shape.length > 0) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_TYPE_SHAPE, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeSubMessage((shapeW) => this._writeTensorShape(shapeW, info.shape));
        }
    }
    // ── TensorShapeProto ──────────────────────────────────────────────────
    _writeTensorShape(w, shape) {
        for (const dim of shape) {
            // dim (field 1) → DimensionProto
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.SHAPE_DIM, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeSubMessage((dimW) => {
                // dim_value (field 1, varint int64)
                dimW.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.DIM_VALUE, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.VARINT);
                dimW.writeInt64(dim);
            });
        }
    }
    // ── Initializer (TensorProto) ─────────────────────────────────────────
    _writeInitializer(w, tensor) {
        // dims (field 1, packed varint)
        if (tensor.dims.length > 0) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_DIMS, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            const dims32 = new Int32Array(tensor.dims);
            w.writePackedInt32(dims32, dims32.length);
        }
        // data_type (field 2, varint)
        w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_DATA_TYPE, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.VARINT);
        w.writeInt32(tensor.dataType);
        // float_data (field 4, packed float32) or raw_data (field 9, bytes)
        if (tensor.floatData && tensor.floatData.length > 0) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_FLOAT_DATA, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writePackedFloat32(tensor.floatData, tensor.floatData.length);
        }
        else if (tensor.rawData && tensor.rawData.length > 0) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_RAW_DATA, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeBytes(tensor.rawData);
        }
        // name (field 8)
        if (tensor.name) {
            w.writeTag(_onnx_types__WEBPACK_IMPORTED_MODULE_2__.TENSOR_NAME, _pb_reader__WEBPACK_IMPORTED_MODULE_1__.WireType.LEN);
            w.writeString(tensor.name);
        }
    }
}


/***/ }),

/***/ "./src/onnx/ops/activations.ts":
/*!*************************************!*\
  !*** ./src/onnx/ops/activations.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registerActivationOps: () => (/* binding */ registerActivationOps)
/* harmony export */ });
/* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../registry */ "./src/onnx/registry.ts");

function unaryMap(inp, fn) {
    const out = new Float32Array(inp.data.length);
    for (let i = 0; i < inp.data.length; i++)
        out[i] = fn(inp.data[i]);
    return (0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [...inp.shape]);
}
class ReluNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        return [unaryMap(inputs[0], (x) => Math.max(0, x))];
    }
}
class SigmoidNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        return [unaryMap(inputs[0], (x) => 1 / (1 + Math.exp(-x)))];
    }
}
class TanhNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        return [unaryMap(inputs[0], Math.tanh)];
    }
}
class LeakyReluNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.alpha = this.attr("alpha", 0.01);
    }
    execute(inputs) {
        const a = this.alpha;
        return [unaryMap(inputs[0], (x) => (x >= 0 ? x : a * x))];
    }
}
class ClipNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const min = inputs.length >= 2 && inputs[1] ? inputs[1].data[0] : -Infinity;
        const max = inputs.length >= 3 && inputs[2] ? inputs[2].data[0] : Infinity;
        return [unaryMap(inputs[0], (x) => Math.min(Math.max(x, min), max))];
    }
}
class SoftmaxNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.axis = this.attrInt("axis", -1);
    }
    execute(inputs) {
        const inp = inputs[0];
        const shape = inp.shape;
        const rank = shape.length;
        const axis = this.axis < 0 ? rank + this.axis : this.axis;
        if (rank <= 1 || axis === rank - 1) {
            // Softmax over last dim
            const cols = shape[rank - 1] ?? inp.data.length;
            const rows = inp.data.length / cols;
            const out = new Float32Array(inp.data.length);
            for (let r = 0; r < rows; r++) {
                let maxVal = -Infinity;
                for (let c = 0; c < cols; c++)
                    maxVal = Math.max(maxVal, inp.data[r * cols + c]);
                let sum = 0;
                for (let c = 0; c < cols; c++) {
                    out[r * cols + c] = Math.exp(inp.data[r * cols + c] - maxVal);
                    sum += out[r * cols + c];
                }
                for (let c = 0; c < cols; c++)
                    out[r * cols + c] /= sum;
            }
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [...shape])];
        }
        // Fallback: flatten softmax
        return [unaryMap(inp, (x) => x)];
    }
}
class ExpNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        return [unaryMap(inputs[0], Math.exp)];
    }
}
class LogNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        return [unaryMap(inputs[0], Math.log)];
    }
}
class SqrtNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        return [unaryMap(inputs[0], Math.sqrt)];
    }
}
class AbsNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        return [unaryMap(inputs[0], Math.abs)];
    }
}
class NegNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        return [unaryMap(inputs[0], (x) => -x)];
    }
}
function registerActivationOps(registry) {
    registry.register("Relu", (info) => new ReluNode(info));
    registry.register("Sigmoid", (info) => new SigmoidNode(info));
    registry.register("Tanh", (info) => new TanhNode(info));
    registry.register("LeakyRelu", (info) => new LeakyReluNode(info));
    registry.register("Clip", (info) => new ClipNode(info));
    registry.register("Softmax", (info) => new SoftmaxNode(info));
    registry.register("Exp", (info) => new ExpNode(info));
    registry.register("Log", (info) => new LogNode(info));
    registry.register("Sqrt", (info) => new SqrtNode(info));
    registry.register("Abs", (info) => new AbsNode(info));
    registry.register("Neg", (info) => new NegNode(info));
}


/***/ }),

/***/ "./src/onnx/ops/conv.ts":
/*!******************************!*\
  !*** ./src/onnx/ops/conv.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registerConvOps: () => (/* binding */ registerConvOps)
/* harmony export */ });
/* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../registry */ "./src/onnx/registry.ts");

/**
 * Conv: 2D convolution.
 * Input: [N, C_in, H, W] (but we support [N, C_in, L] for 1D and [N, C_in, H, W] for 2D)
 * Limited to 2D tensors layout: [batch, channels, height, width] → treated as [batch, features].
 *
 * For our 2D-limited scope: input is [1, C_in * H * W], kernel is [C_out, C_in, kH, kW].
 * Simplified: treats as matrix multiply if shapes are 2D.
 */
class ConvNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.kernelShape = [this.attrInt("kernel_shape", 3)];
        this.strides = [this.attrInt("strides", 1)];
        this.pads = [this.attrInt("pads", 0)];
    }
    execute(inputs) {
        const X = inputs[0]; // [N, C_in, ...spatial]
        const W = inputs[1]; // [C_out, C_in/group, ...kernel]
        const B = inputs.length > 2 ? inputs[2] : null;
        // Simplified 1D convolution for 2D tensors [batch, features]
        if (X.shape.length <= 2) {
            const features = X.shape.length === 2 ? X.shape[1] : X.data.length;
            const outFeatures = W.shape[0] ?? W.data.length;
            const batch = X.shape[0] ?? 1;
            // Treat as fully connected: out = X @ W^T + B
            const out = new Float32Array(batch * outFeatures);
            const wCols = W.data.length / outFeatures;
            for (let n = 0; n < batch; n++) {
                for (let o = 0; o < outFeatures; o++) {
                    let sum = 0;
                    const kLen = Math.min(wCols, features);
                    for (let i = 0; i < kLen; i++) {
                        sum += X.data[n * features + i] * W.data[o * wCols + i];
                    }
                    if (B)
                        sum += B.data[o % B.data.length];
                    out[n * outFeatures + o] = sum;
                }
            }
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [batch, outFeatures])];
        }
        // 3D: [N, C_in, L] → 1D conv
        const N = X.shape[0];
        const C_in = X.shape[1];
        const L = X.shape[2];
        const C_out = W.shape[0];
        const kL = W.shape.length >= 3 ? W.shape[2] : this.kernelShape[0];
        const stride = this.strides[0];
        const pad = this.pads[0];
        const outL = Math.floor((L + 2 * pad - kL) / stride) + 1;
        const out = new Float32Array(N * C_out * outL);
        for (let n = 0; n < N; n++) {
            for (let co = 0; co < C_out; co++) {
                for (let ol = 0; ol < outL; ol++) {
                    let sum = 0;
                    for (let ci = 0; ci < C_in; ci++) {
                        for (let kk = 0; kk < kL; kk++) {
                            const il = ol * stride - pad + kk;
                            if (il >= 0 && il < L) {
                                sum += X.data[n * C_in * L + ci * L + il]
                                    * W.data[co * (C_in * kL) + ci * kL + kk];
                            }
                        }
                    }
                    if (B)
                        sum += B.data[co];
                    out[n * C_out * outL + co * outL + ol] = sum;
                }
            }
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [N, C_out, outL])];
    }
}
/**
 * MaxPool: max pooling over last spatial dimension(s).
 * Supports 1D [N, C, L] and 2D fallback.
 */
class MaxPoolNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.kernelSize = this.attrInt("kernel_shape", 2);
        this.stride = this.attrInt("strides", this.kernelSize);
        this.pad = this.attrInt("pads", 0);
    }
    execute(inputs) {
        const X = inputs[0];
        if (X.shape.length === 3) {
            const [N, C, L] = X.shape;
            const outL = Math.floor((L + 2 * this.pad - this.kernelSize) / this.stride) + 1;
            const out = new Float32Array(N * C * outL);
            for (let n = 0; n < N; n++) {
                for (let c = 0; c < C; c++) {
                    for (let o = 0; o < outL; o++) {
                        let max = -Infinity;
                        for (let k = 0; k < this.kernelSize; k++) {
                            const il = o * this.stride - this.pad + k;
                            if (il >= 0 && il < L) {
                                max = Math.max(max, X.data[n * C * L + c * L + il]);
                            }
                        }
                        out[n * C * outL + c * outL + o] = max;
                    }
                }
            }
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [N, C, outL])];
        }
        // 2D fallback: passthrough
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(X.data), [...X.shape])];
    }
}
/**
 * AveragePool: average pooling.
 */
class AveragePoolNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.kernelSize = this.attrInt("kernel_shape", 2);
        this.stride = this.attrInt("strides", this.kernelSize);
        this.pad = this.attrInt("pads", 0);
    }
    execute(inputs) {
        const X = inputs[0];
        if (X.shape.length === 3) {
            const [N, C, L] = X.shape;
            const outL = Math.floor((L + 2 * this.pad - this.kernelSize) / this.stride) + 1;
            const out = new Float32Array(N * C * outL);
            for (let n = 0; n < N; n++) {
                for (let c = 0; c < C; c++) {
                    for (let o = 0; o < outL; o++) {
                        let sum = 0, count = 0;
                        for (let k = 0; k < this.kernelSize; k++) {
                            const il = o * this.stride - this.pad + k;
                            if (il >= 0 && il < L) {
                                sum += X.data[n * C * L + c * L + il];
                                count++;
                            }
                        }
                        out[n * C * outL + c * outL + o] = count > 0 ? sum / count : 0;
                    }
                }
            }
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [N, C, outL])];
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(X.data), [...X.shape])];
    }
}
/**
 * GlobalAveragePool: average over all spatial dims → [N, C, 1] or [N, C].
 */
class GlobalAveragePoolNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const X = inputs[0];
        if (X.shape.length >= 3) {
            const N = X.shape[0];
            const C = X.shape[1];
            let spatial = 1;
            for (let i = 2; i < X.shape.length; i++)
                spatial *= X.shape[i];
            const out = new Float32Array(N * C);
            for (let n = 0; n < N; n++) {
                for (let c = 0; c < C; c++) {
                    let sum = 0;
                    const base = n * C * spatial + c * spatial;
                    for (let s = 0; s < spatial; s++)
                        sum += X.data[base + s];
                    out[n * C + c] = sum / spatial;
                }
            }
            const outShape = [N, C, ...X.shape.slice(2).map(() => 1)];
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, outShape)];
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(X.data), [...X.shape])];
    }
}
function registerConvOps(registry) {
    registry.register("Conv", (info) => new ConvNode(info));
    registry.register("MaxPool", (info) => new MaxPoolNode(info));
    registry.register("AveragePool", (info) => new AveragePoolNode(info));
    registry.register("GlobalAveragePool", (info) => new GlobalAveragePoolNode(info));
}


/***/ }),

/***/ "./src/onnx/ops/dsp.ts":
/*!*****************************!*\
  !*** ./src/onnx/ops/dsp.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registerDspOps: () => (/* binding */ registerDspOps)
/* harmony export */ });
/* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../registry */ "./src/onnx/registry.ts");
/**
 * DSP operators for audio preprocessing in the SpikyPanda ONNX pipeline.
 *
 * These are custom ops (not part of ONNX standard) that enable end-to-end
 * audio inference: raw audio → MFCC features → neural network → classification.
 *
 * FFT implementation ported from Guillaume Pelletier's dsp.js (Gaume/FFTPanel).
 *
 * Ops:
 *   SpFFT            — Cooley-Tukey radix-2 FFT, power spectrum output
 *   SpMelFilterbank   — Mel-scale triangular filterbank
 *   SpLogScale        — Element-wise log with floor
 *   SpDCT             — Type-II Discrete Cosine Transform
 *   SpMFCC            — Full MFCC pipeline (Window → FFT → Mel → Log → DCT)
 *   SpWindow          — Apply window function (Hann, Hamming, etc.)
 */

// ═══════════════════════════════════════════════════════════════════════════
// FFT — Cooley-Tukey radix-2 (ported from dsp.js)
// ═══════════════════════════════════════════════════════════════════════════
class FFTEngine {
    constructor(size) {
        this.size = size;
        this.reverseTable = new Uint32Array(size);
        this.sinTable = new Float64Array(size);
        this.cosTable = new Float64Array(size);
        this.real = new Float64Array(size);
        this.imag = new Float64Array(size);
        // Build bit-reversal table
        let limit = 1;
        let bit = size >> 1;
        while (limit < size) {
            for (let i = 0; i < limit; i++) {
                this.reverseTable[i + limit] = this.reverseTable[i] + bit;
            }
            limit <<= 1;
            bit >>= 1;
        }
        // Pre-compute twiddle factors
        for (let i = 0; i < size; i++) {
            this.sinTable[i] = Math.sin(-Math.PI / i);
            this.cosTable[i] = Math.cos(-Math.PI / i);
        }
    }
    /**
     * Forward FFT. Returns power spectrum [size/2 + 1].
     */
    forward(buffer) {
        const N = this.size;
        const real = this.real;
        const imag = this.imag;
        const reverseTable = this.reverseTable;
        const cosTable = this.cosTable;
        const sinTable = this.sinTable;
        // Bit-reversal permutation
        for (let i = 0; i < N; i++) {
            real[i] = buffer[reverseTable[i]];
            imag[i] = 0;
        }
        // Butterfly stages
        let halfSize = 1;
        while (halfSize < N) {
            const phaseShiftStepReal = cosTable[halfSize];
            const phaseShiftStepImag = sinTable[halfSize];
            let currentPhaseShiftReal = 1;
            let currentPhaseShiftImag = 0;
            for (let fftStep = 0; fftStep < halfSize; fftStep++) {
                let i = fftStep;
                while (i < N) {
                    const off = i + halfSize;
                    const tr = currentPhaseShiftReal * real[off] - currentPhaseShiftImag * imag[off];
                    const ti = currentPhaseShiftReal * imag[off] + currentPhaseShiftImag * real[off];
                    real[off] = real[i] - tr;
                    imag[off] = imag[i] - ti;
                    real[i] += tr;
                    imag[i] += ti;
                    i += halfSize << 1;
                }
                const tmpReal = currentPhaseShiftReal;
                currentPhaseShiftReal = tmpReal * phaseShiftStepReal - currentPhaseShiftImag * phaseShiftStepImag;
                currentPhaseShiftImag = tmpReal * phaseShiftStepImag + currentPhaseShiftImag * phaseShiftStepReal;
            }
            halfSize <<= 1;
        }
        // Power spectrum
        const nBins = N / 2 + 1;
        const power = new Float32Array(nBins);
        for (let i = 0; i < nBins; i++) {
            power[i] = real[i] * real[i] + imag[i] * imag[i];
        }
        return power;
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// Window functions (ported from dsp.js)
// ═══════════════════════════════════════════════════════════════════════════
function hannWindow(length, index) {
    return 0.5 * (1 - Math.cos(2 * Math.PI * index / (length - 1)));
}
function hammingWindow(length, index) {
    return 0.54 - 0.46 * Math.cos(2 * Math.PI * index / (length - 1));
}
// ═══════════════════════════════════════════════════════════════════════════
// Mel scale helpers
// ═══════════════════════════════════════════════════════════════════════════
function hzToMel(hz) {
    return 2595 * Math.log10(1 + hz / 700);
}
function melToHz(mel) {
    return 700 * (Math.pow(10, mel / 2595) - 1);
}
function buildMelFilterbank(nMels, nFft, sampleRate) {
    const nBins = nFft / 2 + 1;
    const melMin = hzToMel(0);
    const melMax = hzToMel(sampleRate / 2);
    // Mel-spaced center frequencies
    const melPoints = new Float32Array(nMels + 2);
    for (let i = 0; i < nMels + 2; i++) {
        melPoints[i] = melMin + (melMax - melMin) * i / (nMels + 1);
    }
    // Convert to FFT bin indices
    const bins = new Int32Array(nMels + 2);
    for (let i = 0; i < nMels + 2; i++) {
        bins[i] = Math.floor((nFft + 1) * melToHz(melPoints[i]) / sampleRate);
    }
    // Build triangular filters
    const fb = [];
    for (let m = 0; m < nMels; m++) {
        const row = new Float32Array(nBins);
        const left = bins[m], center = bins[m + 1], right = bins[m + 2];
        for (let k = left; k < center; k++) {
            if (k >= 0 && k < nBins)
                row[k] = (k - left) / Math.max(center - left, 1);
        }
        for (let k = center; k <= right; k++) {
            if (k >= 0 && k < nBins)
                row[k] = (right - k) / Math.max(right - center, 1);
        }
        fb.push(row);
    }
    return fb;
}
// ═══════════════════════════════════════════════════════════════════════════
// DCT Type-II
// ═══════════════════════════════════════════════════════════════════════════
function dctII(input, nOutput) {
    const N = input.length;
    const out = new Float32Array(nOutput);
    for (let k = 0; k < nOutput; k++) {
        let sum = 0;
        for (let n = 0; n < N; n++) {
            sum += input[n] * Math.cos(Math.PI * k * (2 * n + 1) / (2 * N));
        }
        out[k] = sum * 2; // DCT-II standard scaling factor
    }
    return out;
}
// ═══════════════════════════════════════════════════════════════════════════
// ONNX Op Nodes
// ═══════════════════════════════════════════════════════════════════════════
// FFT engine cache (avoid re-creating per frame)
const fftEngines = new Map();
function getFFTEngine(size) {
    let engine = fftEngines.get(size);
    if (!engine) {
        engine = new FFTEngine(size);
        fftEngines.set(size, engine);
    }
    return engine;
}
/**
 * SpFFT: compute power spectrum of a 1D signal.
 * Input:  [samples] — time-domain audio frame
 * Output: [nfft/2+1] — power spectrum
 * Attributes: nfft (default 512)
 */
class SpFFTNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.nfft = this.attrInt("nfft", 512);
    }
    execute(inputs) {
        const signal = inputs[0];
        const engine = getFFTEngine(this.nfft);
        // Pad or truncate to nfft
        const frame = new Float32Array(this.nfft);
        const len = Math.min(signal.data.length, this.nfft);
        for (let i = 0; i < len; i++)
            frame[i] = signal.data[i];
        const power = engine.forward(frame);
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(power, [power.length])];
    }
}
/**
 * SpWindow: apply window function to audio frame.
 * Input:  [samples]
 * Output: [samples]
 * Attributes: window_type (0=hann, 1=hamming, default 0)
 */
class SpWindowNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.windowType = this.attrInt("window_type", 0);
    }
    execute(inputs) {
        const input = inputs[0];
        const out = new Float32Array(input.data.length);
        const N = input.data.length;
        const winFn = this.windowType === 1 ? hammingWindow : hannWindow;
        for (let i = 0; i < N; i++) {
            out[i] = input.data[i] * winFn(N, i);
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [...input.shape])];
    }
}
/**
 * SpMelFilterbank: apply mel-scale filterbank to a power spectrum.
 * Input:  [nfft/2+1] — power spectrum
 * Output: [n_mels] — mel energies
 * Attributes: n_mels (default 40), nfft (default 512), sample_rate (default 16000)
 */
class SpMelFilterbankNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.fb = null;
        this.nMels = this.attrInt("n_mels", 40);
        this.nfft = this.attrInt("nfft", 512);
        this.sampleRate = this.attrInt("sample_rate", 16000);
    }
    execute(inputs) {
        if (!this.fb) {
            this.fb = buildMelFilterbank(this.nMels, this.nfft, this.sampleRate);
        }
        const spectrum = inputs[0];
        const nBins = this.nfft / 2 + 1;
        const out = new Float32Array(this.nMels);
        for (let m = 0; m < this.nMels; m++) {
            let sum = 0;
            const row = this.fb[m];
            for (let k = 0; k < nBins; k++) {
                sum += row[k] * spectrum.data[k];
            }
            out[m] = sum;
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [this.nMels])];
    }
}
/**
 * SpLogScale: element-wise log with floor.
 * Input:  [N]
 * Output: [N]
 * Attributes: floor (default 1e-10)
 */
class SpLogScaleNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.floor = this.attr("floor", 1e-10);
    }
    execute(inputs) {
        const input = inputs[0];
        const out = new Float32Array(input.data.length);
        for (let i = 0; i < input.data.length; i++) {
            out[i] = Math.log(Math.max(input.data[i], this.floor));
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [...input.shape])];
    }
}
/**
 * SpDCT: Type-II Discrete Cosine Transform.
 * Input:  [N]
 * Output: [n_output]
 * Attributes: n_output (default 40)
 */
class SpDCTNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.nOutput = this.attrInt("n_output", 40);
    }
    execute(inputs) {
        const input = inputs[0];
        const out = dctII(input.data, this.nOutput);
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [this.nOutput])];
    }
}
/**
 * SpMFCC: complete MFCC pipeline in a single op.
 *
 * Input:  [samples] — 1D audio (e.g. 16000 samples = 1 second at 16kHz)
 * Output: [n_mfcc, n_frames] — MFCC feature matrix
 *
 * Attributes:
 *   sample_rate (default 16000)
 *   n_mfcc (default 40)
 *   n_fft (default 512)
 *   hop_length (default 160)
 *   n_mels (default 40)
 *   window_type (0=hann, 1=hamming, default 0)
 */
class SpMFCCNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.fb = null;
        this.fftEngine = null;
        this.sampleRate = this.attrInt("sample_rate", 16000);
        this.nMfcc = this.attrInt("n_mfcc", 40);
        this.nFft = this.attrInt("n_fft", 512);
        this.hopLength = this.attrInt("hop_length", 160);
        this.nMels = this.attrInt("n_mels", 40);
        this.windowType = this.attrInt("window_type", 0);
    }
    execute(inputs) {
        const audio = inputs[0].data;
        const nFrames = Math.floor((audio.length - this.nFft) / this.hopLength) + 1;
        // Lazy init
        if (!this.fb)
            this.fb = buildMelFilterbank(this.nMels, this.nFft, this.sampleRate);
        if (!this.fftEngine)
            this.fftEngine = getFFTEngine(this.nFft);
        const winFn = this.windowType === 1 ? hammingWindow : hannWindow;
        const nBins = this.nFft / 2 + 1;
        const mfcc = new Float32Array(this.nMfcc * nFrames);
        const frame = new Float32Array(this.nFft);
        const melSpec = new Float32Array(this.nMels);
        for (let t = 0; t < nFrames; t++) {
            const start = t * this.hopLength;
            // Window
            for (let i = 0; i < this.nFft; i++) {
                const idx = start + i;
                frame[i] = idx < audio.length ? audio[idx] * winFn(this.nFft, i) : 0;
            }
            // FFT → power spectrum
            const power = this.fftEngine.forward(frame);
            // Mel filterbank
            for (let m = 0; m < this.nMels; m++) {
                let sum = 0;
                const row = this.fb[m];
                for (let k = 0; k < nBins; k++)
                    sum += row[k] * power[k];
                melSpec[m] = Math.log(Math.max(sum, 1e-10));
            }
            // DCT → MFCC
            for (let c = 0; c < this.nMfcc; c++) {
                let sum = 0;
                for (let m = 0; m < this.nMels; m++) {
                    sum += melSpec[m] * Math.cos(Math.PI * c * (2 * m + 1) / (2 * this.nMels));
                }
                mfcc[c * nFrames + t] = sum;
            }
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(mfcc, [this.nMfcc, nFrames])];
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// Registration
// ═══════════════════════════════════════════════════════════════════════════
function registerDspOps(registry) {
    registry.register("SpFFT", (info) => new SpFFTNode(info));
    registry.register("SpWindow", (info) => new SpWindowNode(info));
    registry.register("SpMelFilterbank", (info) => new SpMelFilterbankNode(info));
    registry.register("SpLogScale", (info) => new SpLogScaleNode(info));
    registry.register("SpDCT", (info) => new SpDCTNode(info));
    registry.register("SpMFCC", (info) => new SpMFCCNode(info));
}


/***/ }),

/***/ "./src/onnx/ops/index.ts":
/*!*******************************!*\
  !*** ./src/onnx/ops/index.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createDefaultRegistry: () => (/* binding */ createDefaultRegistry),
/* harmony export */   createSpikyPandaRegistry: () => (/* binding */ createSpikyPandaRegistry),
/* harmony export */   registerActivationOps: () => (/* reexport safe */ _activations__WEBPACK_IMPORTED_MODULE_1__.registerActivationOps),
/* harmony export */   registerConvOps: () => (/* reexport safe */ _conv__WEBPACK_IMPORTED_MODULE_3__.registerConvOps),
/* harmony export */   registerDspOps: () => (/* reexport safe */ _dsp__WEBPACK_IMPORTED_MODULE_8__.registerDspOps),
/* harmony export */   registerMathOps: () => (/* reexport safe */ _math__WEBPACK_IMPORTED_MODULE_0__.registerMathOps),
/* harmony export */   registerMatrixOps: () => (/* reexport safe */ _matrix__WEBPACK_IMPORTED_MODULE_2__.registerMatrixOps),
/* harmony export */   registerMiscOps: () => (/* reexport safe */ _misc__WEBPACK_IMPORTED_MODULE_6__.registerMiscOps),
/* harmony export */   registerNormOps: () => (/* reexport safe */ _normalization__WEBPACK_IMPORTED_MODULE_4__.registerNormOps),
/* harmony export */   registerRecurrentOps: () => (/* reexport safe */ _recurrent__WEBPACK_IMPORTED_MODULE_5__.registerRecurrentOps),
/* harmony export */   registerSpikyPandaOps: () => (/* reexport safe */ _spikypanda__WEBPACK_IMPORTED_MODULE_7__.registerSpikyPandaOps)
/* harmony export */ });
/* harmony import */ var _math__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./math */ "./src/onnx/ops/math.ts");
/* harmony import */ var _activations__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./activations */ "./src/onnx/ops/activations.ts");
/* harmony import */ var _matrix__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./matrix */ "./src/onnx/ops/matrix.ts");
/* harmony import */ var _conv__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./conv */ "./src/onnx/ops/conv.ts");
/* harmony import */ var _normalization__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./normalization */ "./src/onnx/ops/normalization.ts");
/* harmony import */ var _recurrent__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./recurrent */ "./src/onnx/ops/recurrent.ts");
/* harmony import */ var _misc__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./misc */ "./src/onnx/ops/misc.ts");
/* harmony import */ var _spikypanda__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./spikypanda */ "./src/onnx/ops/spikypanda.ts");
/* harmony import */ var _dsp__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./dsp */ "./src/onnx/ops/dsp.ts");
/* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../registry */ "./src/onnx/registry.ts");



















/**
 * Create a registry with all generic ONNX ops registered.
 */
function createDefaultRegistry() {
    const registry = new _registry__WEBPACK_IMPORTED_MODULE_9__.OnnxOpRegistry();
    (0,_math__WEBPACK_IMPORTED_MODULE_0__.registerMathOps)(registry);
    (0,_activations__WEBPACK_IMPORTED_MODULE_1__.registerActivationOps)(registry);
    (0,_matrix__WEBPACK_IMPORTED_MODULE_2__.registerMatrixOps)(registry);
    (0,_conv__WEBPACK_IMPORTED_MODULE_3__.registerConvOps)(registry);
    (0,_normalization__WEBPACK_IMPORTED_MODULE_4__.registerNormOps)(registry);
    (0,_recurrent__WEBPACK_IMPORTED_MODULE_5__.registerRecurrentOps)(registry);
    (0,_misc__WEBPACK_IMPORTED_MODULE_6__.registerMiscOps)(registry);
    (0,_dsp__WEBPACK_IMPORTED_MODULE_8__.registerDspOps)(registry);
    return registry;
}
/**
 * Create a registry with all ops + SpikyPanda native overrides at higher priority.
 */
function createSpikyPandaRegistry() {
    const registry = createDefaultRegistry();
    (0,_spikypanda__WEBPACK_IMPORTED_MODULE_7__.registerSpikyPandaOps)(registry);
    return registry;
}


/***/ }),

/***/ "./src/onnx/ops/math.ts":
/*!******************************!*\
  !*** ./src/onnx/ops/math.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registerMathOps: () => (/* binding */ registerMathOps)
/* harmony export */ });
/* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../registry */ "./src/onnx/registry.ts");

// ─── Helpers ────────────────────────────────────────────────────────────────
/** Compute total element count from shape. */
function size(shape) {
    let s = 1;
    for (const d of shape)
        s *= Math.max(d, 1);
    return s;
}
/**
 * Broadcast two shapes (up to 3D). Returns the broadcast result shape.
 * Follows numpy broadcasting rules: align right, expand dims of size 1.
 */
function broadcastShape(a, b) {
    const rank = Math.max(a.length, b.length);
    const out = new Array(rank);
    for (let i = 0; i < rank; i++) {
        const da = a[a.length - rank + i] ?? 1;
        const db = b[b.length - rank + i] ?? 1;
        if (da !== db && da !== 1 && db !== 1) {
            throw new Error(`Cannot broadcast shapes [${a}] and [${b}]`);
        }
        out[i] = Math.max(da, db);
    }
    return out;
}
/** Map a flat index in the broadcast output back to a flat index in a source tensor. */
function broadcastIndex(flatIdx, outShape, srcShape) {
    const rank = outShape.length;
    let idx = 0;
    let stride = 1;
    for (let i = rank - 1; i >= 0; i--) {
        const coord = Math.floor(flatIdx / strideof(outShape, i)) % outShape[i];
        const srcDim = srcShape[srcShape.length - rank + i] ?? 1;
        const srcCoord = srcDim === 1 ? 0 : coord;
        idx += srcCoord * stride;
        stride *= srcDim;
    }
    return idx;
}
function strideof(shape, dim) {
    let s = 1;
    for (let i = dim + 1; i < shape.length; i++)
        s *= shape[i];
    return s;
}
/** Element-wise binary op with broadcasting. */
function binaryOp(a, b, fn) {
    const outShape = broadcastShape(a.shape, b.shape);
    const outSize = size(outShape);
    const out = new Float32Array(outSize);
    for (let i = 0; i < outSize; i++) {
        const ai = broadcastIndex(i, outShape, a.shape);
        const bi = broadcastIndex(i, outShape, b.shape);
        out[i] = fn(a.data[ai], b.data[bi]);
    }
    return (0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, outShape);
}
// ─── Ops ────────────────────────────────────────────────────────────────────
class MulNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        return [binaryOp(inputs[0], inputs[1], (a, b) => a * b)];
    }
}
class SubNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        return [binaryOp(inputs[0], inputs[1], (a, b) => a - b)];
    }
}
class AddNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        return [binaryOp(inputs[0], inputs[1], (a, b) => a + b)];
    }
}
class AtanNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const a = inputs[0];
        const out = new Float32Array(a.data.length);
        for (let i = 0; i < a.data.length; i++)
            out[i] = Math.atan(a.data[i]);
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [...a.shape])];
    }
}
/**
 * Gemm: Y = alpha * A @ B + beta * C
 * A is [M, K], B is [K, N], C is broadcastable to [M, N].
 */
class GemmNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(nodeInfo) {
        super(nodeInfo);
        this.outputShapes = [];
        this.alpha = this.attr("alpha", 1.0);
        this.beta = this.attr("beta", 1.0);
        this.transA = this.attrInt("transA", 0) !== 0;
        this.transB = this.attrInt("transB", 0) !== 0;
    }
    execute(inputs) {
        const A = inputs[0];
        const B = inputs[1];
        const C = inputs.length > 2 ? inputs[2] : null;
        // Infer M, K, N from actual tensor data + shapes
        const aRows = A.shape.length >= 2 ? A.shape[0] : 1;
        const aCols = A.shape.length >= 2 ? A.shape[1] : A.data.length;
        const bRows = B.shape.length >= 2 ? B.shape[0] : 1;
        const bCols = B.shape.length >= 2 ? B.shape[1] : B.data.length;
        const M = this.transA ? aCols : aRows;
        const K = this.transA ? aRows : aCols;
        const N = this.transB ? bRows : bCols;
        const out = new Float32Array(M * N);
        for (let m = 0; m < M; m++) {
            for (let n = 0; n < N; n++) {
                let sum = 0;
                for (let k = 0; k < K; k++) {
                    const aIdx = this.transA ? k * M + m : m * K + k;
                    const bIdx = this.transB ? n * K + k : k * N + n;
                    sum += A.data[aIdx] * B.data[bIdx];
                }
                out[m * N + n] = this.alpha * sum;
            }
        }
        if (C) {
            for (let m = 0; m < M; m++) {
                for (let n = 0; n < N; n++) {
                    const ci = m * N + n;
                    // C is broadcastable — could be [1, N] or [M, N]
                    const cIdx = C.data.length === N ? n : ci % C.data.length;
                    out[ci] += this.beta * C.data[cIdx];
                }
            }
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [M, N])];
    }
}
/**
 * Concat along axis (supports axis 0 and 1 for 2D tensors).
 */
class ConcatNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(nodeInfo) {
        super(nodeInfo);
        this.outputShapes = [];
        this.axis = this.attrInt("axis", 0);
    }
    execute(inputs) {
        if (inputs.length === 0)
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(0), [0])];
        if (inputs.length === 1)
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(inputs[0].data), [...inputs[0].shape])];
        const axis = this.axis;
        if (axis === 0) {
            // Stack along rows: all must have same cols
            const cols = inputs[0].shape.length >= 2 ? inputs[0].shape[1] : inputs[0].data.length;
            let totalRows = 0;
            for (const inp of inputs) {
                totalRows += inp.shape.length >= 2 ? inp.shape[0] : 1;
            }
            const out = new Float32Array(totalRows * cols);
            let offset = 0;
            for (const inp of inputs) {
                out.set(inp.data, offset);
                offset += inp.data.length;
            }
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [totalRows, cols])];
        }
        if (axis === 1) {
            // Concat along columns: all must have same rows
            const rows = inputs[0].shape.length >= 2 ? inputs[0].shape[0] : 1;
            let totalCols = 0;
            const colsList = [];
            for (const inp of inputs) {
                const c = inp.shape.length >= 2 ? inp.shape[1] : inp.data.length;
                colsList.push(c);
                totalCols += c;
            }
            const out = new Float32Array(rows * totalCols);
            for (let r = 0; r < rows; r++) {
                let outCol = 0;
                for (let t = 0; t < inputs.length; t++) {
                    const cols = colsList[t];
                    const srcRow = inputs[t].shape.length >= 2 ? inputs[t].shape[1] : inputs[t].data.length;
                    for (let c = 0; c < cols; c++) {
                        out[r * totalCols + outCol + c] = inputs[t].data[r * srcRow + c];
                    }
                    outCol += cols;
                }
            }
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [rows, totalCols])];
        }
        throw new Error(`Concat axis=${axis} not supported (only 0 and 1)`);
    }
}
/**
 * Slice: column-based slicing for 2D tensors.
 * ONNX opset ≥10 uses tensor inputs for starts/ends/axes/steps.
 * Opset <10 uses attributes.
 * We support both: try tensor inputs first, fall back to attributes.
 */
class SliceNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const data = inputs[0];
        if (!data)
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(0), [0])];
        // Opset ≥10: starts, ends, axes, steps are tensor inputs
        const hasInputStarts = inputs.length >= 3 && inputs[1] && inputs[2];
        let start;
        let end;
        let axis;
        if (hasInputStarts) {
            start = Math.round(inputs[1].data[0]);
            end = Math.round(inputs[2].data[0]);
            axis = inputs.length >= 4 && inputs[3] ? Math.round(inputs[3].data[0]) : 0;
        }
        else {
            // Fall back to attributes (opset <10)
            start = this.attrInt("starts", 0);
            end = this.attrInt("ends", 0);
            axis = this.attrInt("axes", 1); // default axis=1 for column slicing
        }
        // Handle negative indices
        const dimSize = data.shape[axis] ?? data.data.length;
        if (start < 0)
            start = dimSize + start;
        if (end < 0)
            end = dimSize + end;
        if (end > dimSize || end > 2147483000)
            end = dimSize;
        start = Math.max(0, Math.min(start, dimSize));
        end = Math.max(start, Math.min(end, dimSize));
        const sliceLen = end - start;
        if (data.shape.length < 2 || axis === 0) {
            // 1D or axis=0: simple slice
            const sliced = data.data.slice(start, end);
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(sliced, [sliceLen])];
        }
        // 2D, axis=1: slice columns
        const rows = data.shape[0];
        const cols = data.shape[1];
        const out = new Float32Array(rows * sliceLen);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < sliceLen; c++) {
                out[r * sliceLen + c] = data.data[r * cols + start + c];
            }
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [rows, sliceLen])];
    }
}
// ─── Registration ───────────────────────────────────────────────────────────
function registerMathOps(registry) {
    registry.register("Add", (info) => new AddNode(info));
    registry.register("Sub", (info) => new SubNode(info));
    registry.register("Mul", (info) => new MulNode(info));
    registry.register("Atan", (info) => new AtanNode(info));
    registry.register("Gemm", (info) => new GemmNode(info));
    registry.register("Concat", (info) => new ConcatNode(info));
    registry.register("Slice", (info) => new SliceNode(info));
}


/***/ }),

/***/ "./src/onnx/ops/matrix.ts":
/*!********************************!*\
  !*** ./src/onnx/ops/matrix.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registerMatrixOps: () => (/* binding */ registerMatrixOps)
/* harmony export */ });
/* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../registry */ "./src/onnx/registry.ts");

/**
 * MatMul: matrix multiplication A @ B.
 * Supports 2D [M,K] x [K,N] → [M,N].
 * For 1D inputs: [K] treated as [1,K] or [K,1] as needed.
 */
class MatMulNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const A = inputs[0];
        const B = inputs[1];
        let M, K, N;
        if (A.shape.length === 1) {
            M = 1;
            K = A.shape[0];
        }
        else {
            M = A.shape[0];
            K = A.shape[1];
        }
        if (B.shape.length === 1) {
            N = 1;
        }
        else {
            N = B.shape[1];
        }
        const out = new Float32Array(M * N);
        for (let m = 0; m < M; m++) {
            for (let n = 0; n < N; n++) {
                let sum = 0;
                for (let k = 0; k < K; k++) {
                    const ai = A.shape.length === 1 ? k : m * K + k;
                    const bi = B.shape.length === 1 ? k : k * N + n;
                    sum += A.data[ai] * B.data[bi];
                }
                out[m * N + n] = sum;
            }
        }
        if (A.shape.length === 1 && B.shape.length === 1)
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [1])];
        if (A.shape.length === 1)
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [N])];
        if (B.shape.length === 1)
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [M])];
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [M, N])];
    }
}
/**
 * Transpose: permute dimensions.
 * Supports 2D (swap rows/cols) and 3D.
 */
class TransposeNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const inp = inputs[0];
        const rank = inp.shape.length;
        if (rank === 2) {
            const [rows, cols] = inp.shape;
            const out = new Float32Array(inp.data.length);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    out[c * rows + r] = inp.data[r * cols + c];
                }
            }
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [cols, rows])];
        }
        if (rank === 3) {
            const [d0, d1, d2] = inp.shape;
            // Default perm: reverse → [d2, d1, d0]
            const out = new Float32Array(inp.data.length);
            for (let i = 0; i < d0; i++) {
                for (let j = 0; j < d1; j++) {
                    for (let k = 0; k < d2; k++) {
                        out[k * d1 * d0 + j * d0 + i] = inp.data[i * d1 * d2 + j * d2 + k];
                    }
                }
            }
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [d2, d1, d0])];
        }
        // 1D: noop
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(inp.data), [...inp.shape])];
    }
}
/**
 * Reshape: change shape without changing data.
 * Supports -1 for one inferred dimension.
 */
class ReshapeNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const data = inputs[0];
        const shapeT = inputs[1];
        if (!shapeT)
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(data.data), [...data.shape])];
        const newShape = [];
        let inferIdx = -1;
        let known = 1;
        for (let i = 0; i < shapeT.data.length; i++) {
            const d = Math.round(shapeT.data[i]);
            if (d === -1) {
                inferIdx = i;
                newShape.push(-1);
            }
            else if (d === 0) {
                // 0 means copy from input
                const dim = data.shape[i] ?? 1;
                newShape.push(dim);
                known *= dim;
            }
            else {
                newShape.push(d);
                known *= d;
            }
        }
        if (inferIdx >= 0) {
            newShape[inferIdx] = data.data.length / known;
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(data.data), newShape)];
    }
}
/**
 * Flatten: collapse dims into 2D [batch, features].
 */
class FlattenNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.axis = this.attrInt("axis", 1);
    }
    execute(inputs) {
        const inp = inputs[0];
        const shape = inp.shape;
        let d0 = 1, d1 = 1;
        for (let i = 0; i < this.axis; i++)
            d0 *= shape[i] ?? 1;
        for (let i = this.axis; i < shape.length; i++)
            d1 *= shape[i] ?? 1;
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(inp.data), [d0, d1])];
    }
}
/**
 * Squeeze: remove dimensions of size 1.
 */
class SqueezeNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const inp = inputs[0];
        const axes = inputs.length >= 2 && inputs[1] ? Array.from(inputs[1].data).map(Math.round) : null;
        const newShape = axes ? inp.shape.filter((_, i) => !axes.includes(i)) : inp.shape.filter((d) => d !== 1);
        if (newShape.length === 0)
            newShape.push(1);
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(inp.data), newShape)];
    }
}
/**
 * Unsqueeze: insert dimensions of size 1.
 */
class UnsqueezeNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const inp = inputs[0];
        const axesT = inputs[1];
        if (!axesT)
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(inp.data), [...inp.shape])];
        const axes = Array.from(axesT.data)
            .map(Math.round)
            .sort((a, b) => a - b);
        const newShape = [...inp.shape];
        for (const a of axes) {
            newShape.splice(a, 0, 1);
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(inp.data), newShape)];
    }
}
/**
 * Gather: select elements along axis using indices.
 * Simplified: supports axis=0, 1D/2D.
 */
class GatherNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.axis = this.attrInt("axis", 0);
    }
    execute(inputs) {
        const data = inputs[0];
        const indices = inputs[1];
        if (!indices)
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(data.data), [...data.shape])];
        if (this.axis === 0 && data.shape.length === 2) {
            const cols = data.shape[1];
            const numIdx = indices.data.length;
            const out = new Float32Array(numIdx * cols);
            for (let i = 0; i < numIdx; i++) {
                const idx = Math.round(indices.data[i]);
                for (let c = 0; c < cols; c++) {
                    out[i * cols + c] = data.data[idx * cols + c];
                }
            }
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [numIdx, cols])];
        }
        // Fallback: 1D gather
        const out = new Float32Array(indices.data.length);
        for (let i = 0; i < indices.data.length; i++) {
            out[i] = data.data[Math.round(indices.data[i])] ?? 0;
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [indices.data.length])];
    }
}
function registerMatrixOps(registry) {
    registry.register("MatMul", (info) => new MatMulNode(info));
    registry.register("Transpose", (info) => new TransposeNode(info));
    registry.register("Reshape", (info) => new ReshapeNode(info));
    registry.register("Flatten", (info) => new FlattenNode(info));
    registry.register("Squeeze", (info) => new SqueezeNode(info));
    registry.register("Unsqueeze", (info) => new UnsqueezeNode(info));
    registry.register("Gather", (info) => new GatherNode(info));
}


/***/ }),

/***/ "./src/onnx/ops/misc.ts":
/*!******************************!*\
  !*** ./src/onnx/ops/misc.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registerMiscOps: () => (/* binding */ registerMiscOps)
/* harmony export */ });
/* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../registry */ "./src/onnx/registry.ts");

class DivNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const a = inputs[0], b = inputs[1];
        const size = Math.max(a.data.length, b.data.length);
        const out = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            out[i] = a.data[i % a.data.length] / b.data[i % b.data.length];
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, a.data.length >= b.data.length ? [...a.shape] : [...b.shape])];
    }
}
class PowNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const a = inputs[0], b = inputs[1];
        const size = Math.max(a.data.length, b.data.length);
        const out = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            out[i] = Math.pow(a.data[i % a.data.length], b.data[i % b.data.length]);
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, a.data.length >= b.data.length ? [...a.shape] : [...b.shape])];
    }
}
class ReduceMeanNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.axis = this.attrInt("axes", -1);
        this.keepdims = this.attrInt("keepdims", 1) !== 0;
    }
    execute(inputs) {
        const X = inputs[0];
        const shape = X.shape;
        const rank = shape.length;
        const axis = this.axis < 0 ? rank + this.axis : this.axis;
        if (rank === 2) {
            if (axis === 1) {
                const rows = shape[0];
                const cols = shape[1];
                const out = new Float32Array(rows);
                for (let r = 0; r < rows; r++) {
                    let sum = 0;
                    for (let c = 0; c < cols; c++)
                        sum += X.data[r * cols + c];
                    out[r] = sum / cols;
                }
                return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, this.keepdims ? [rows, 1] : [rows])];
            }
            if (axis === 0) {
                const rows = shape[0];
                const cols = shape[1];
                const out = new Float32Array(cols);
                for (let c = 0; c < cols; c++) {
                    let sum = 0;
                    for (let r = 0; r < rows; r++)
                        sum += X.data[r * cols + c];
                    out[c] = sum / rows;
                }
                return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, this.keepdims ? [1, cols] : [cols])];
            }
        }
        // Fallback: reduce all
        let sum = 0;
        for (let i = 0; i < X.data.length; i++)
            sum += X.data[i];
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array([sum / X.data.length]), [1])];
    }
}
class ReduceSumNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.axis = this.attrInt("axes", -1);
        this.keepdims = this.attrInt("keepdims", 1) !== 0;
    }
    execute(inputs) {
        const X = inputs[0];
        const shape = X.shape;
        const rank = shape.length;
        const axis = this.axis < 0 ? rank + this.axis : this.axis;
        if (rank === 2 && axis === 1) {
            const rows = shape[0], cols = shape[1];
            const out = new Float32Array(rows);
            for (let r = 0; r < rows; r++) {
                let sum = 0;
                for (let c = 0; c < cols; c++)
                    sum += X.data[r * cols + c];
                out[r] = sum;
            }
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, this.keepdims ? [rows, 1] : [rows])];
        }
        let sum = 0;
        for (let i = 0; i < X.data.length; i++)
            sum += X.data[i];
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array([sum]), [1])];
    }
}
class IdentityNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(inputs[0].data), [...inputs[0].shape])];
    }
}
class CastNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        // All data is Float32 in our runtime — cast is a no-op
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(inputs[0].data), [...inputs[0].shape])];
    }
}
class ShapeNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const shape = inputs[0].shape;
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(shape), [shape.length])];
    }
}
class ConstantOfShapeNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const shapeT = inputs[0];
        const shape = Array.from(shapeT.data).map(Math.round);
        let size = 1;
        for (const d of shape)
            size *= d;
        // Try tensor attribute "value" first (TensorProto), fall back to scalar
        let val = 0;
        const valueTensor = this.attrTensor("value");
        if (valueTensor) {
            const data = (0,_registry__WEBPACK_IMPORTED_MODULE_0__.getInitializerData)(valueTensor);
            if (data.length > 0)
                val = data[0];
        }
        else {
            val = this.attr("value", 0);
        }
        const out = new Float32Array(size).fill(val);
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, shape)];
    }
}
/**
 * Pad: pad a tensor. Simplified: 2D constant padding.
 */
class PadNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const X = inputs[0];
        const pads = inputs.length >= 2 && inputs[1] ? inputs[1] : null;
        if (!pads || X.shape.length !== 2) {
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(X.data), [...X.shape])];
        }
        const val = inputs.length >= 3 && inputs[2] ? inputs[2].data[0] : 0;
        const [rows, cols] = X.shape;
        const p = Array.from(pads.data).map(Math.round);
        // pads format: [top, left, bottom, right] for 2D
        const top = p[0] ?? 0, left = p[1] ?? 0, bottom = p[2] ?? 0, right = p[3] ?? 0;
        const newRows = rows + top + bottom;
        const newCols = cols + left + right;
        const out = new Float32Array(newRows * newCols).fill(val);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                out[(r + top) * newCols + (c + left)] = X.data[r * cols + c];
            }
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [newRows, newCols])];
    }
}
class MinNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const out = new Float32Array(inputs[0].data);
        for (let t = 1; t < inputs.length; t++) {
            for (let i = 0; i < out.length; i++) {
                out[i] = Math.min(out[i], inputs[t].data[i % inputs[t].data.length]);
            }
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [...inputs[0].shape])];
    }
}
class MaxNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const out = new Float32Array(inputs[0].data);
        for (let t = 1; t < inputs.length; t++) {
            for (let i = 0; i < out.length; i++) {
                out[i] = Math.max(out[i], inputs[t].data[i % inputs[t].data.length]);
            }
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [...inputs[0].shape])];
    }
}
/**
 * Constant: produces a constant tensor from attributes.
 * The value comes from a tensor attribute "value".
 */
class ConstantNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute() {
        const valueTensor = this.attrTensor("value");
        if (valueTensor) {
            const data = (0,_registry__WEBPACK_IMPORTED_MODULE_0__.getInitializerData)(valueTensor);
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(data), [...valueTensor.dims])];
        }
        // Scalar fallback
        const val = this.attr("value_float", 0);
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array([val]), [1])];
    }
}
/**
 * Expand: broadcast a tensor to a target shape.
 * Input 0: data tensor
 * Input 1: shape tensor (int64 values as float)
 */
class ExpandNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const data = inputs[0];
        const shapeT = inputs[1];
        const targetShape = Array.from(shapeT.data).map(Math.round);
        // Compute output size
        let outSize = 1;
        for (const d of targetShape)
            outSize *= d;
        // If shapes are identical, return copy
        if (data.data.length === outSize) {
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(data.data), targetShape)];
        }
        // Broadcast: align shapes right, expand dims of size 1
        const srcShape = data.shape;
        const rank = targetShape.length;
        const srcPadded = [];
        for (let i = 0; i < rank; i++) {
            const si = i - (rank - srcShape.length);
            srcPadded.push(si >= 0 ? srcShape[si] : 1);
        }
        const out = new Float32Array(outSize);
        // Compute strides for source and output
        const outStrides = new Array(rank);
        const srcStrides = new Array(rank);
        outStrides[rank - 1] = 1;
        srcStrides[rank - 1] = 1;
        for (let i = rank - 2; i >= 0; i--) {
            outStrides[i] = outStrides[i + 1] * targetShape[i + 1];
            srcStrides[i] = srcStrides[i + 1] * srcPadded[i + 1];
        }
        for (let idx = 0; idx < outSize; idx++) {
            let srcIdx = 0;
            let rem = idx;
            for (let d = 0; d < rank; d++) {
                const coord = Math.floor(rem / outStrides[d]);
                rem %= outStrides[d];
                // If source dim is 1, broadcast (use coord 0)
                srcIdx += (srcPadded[d] === 1 ? 0 : coord) * srcStrides[d];
            }
            out[idx] = data.data[srcIdx];
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, targetShape)];
    }
}
function registerMiscOps(registry) {
    registry.register("Div", (info) => new DivNode(info));
    registry.register("Pow", (info) => new PowNode(info));
    registry.register("ReduceMean", (info) => new ReduceMeanNode(info));
    registry.register("ReduceSum", (info) => new ReduceSumNode(info));
    registry.register("Identity", (info) => new IdentityNode(info));
    registry.register("Cast", (info) => new CastNode(info));
    registry.register("Shape", (info) => new ShapeNode(info));
    registry.register("ConstantOfShape", (info) => new ConstantOfShapeNode(info));
    registry.register("Pad", (info) => new PadNode(info));
    registry.register("Min", (info) => new MinNode(info));
    registry.register("Max", (info) => new MaxNode(info));
    registry.register("Constant", (info) => new ConstantNode(info));
    registry.register("Expand", (info) => new ExpandNode(info));
}


/***/ }),

/***/ "./src/onnx/ops/normalization.ts":
/*!***************************************!*\
  !*** ./src/onnx/ops/normalization.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registerNormOps: () => (/* binding */ registerNormOps)
/* harmony export */ });
/* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../registry */ "./src/onnx/registry.ts");

/**
 * BatchNormalization: Y = (X - mean) / sqrt(var + eps) * scale + bias
 * Inputs: X, scale, B, mean, var
 * For 2D [N, C]: normalize per channel.
 * For 3D [N, C, L]: normalize per channel across spatial.
 */
class BatchNormNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.eps = this.attr("epsilon", 1e-5);
    }
    execute(inputs) {
        const X = inputs[0];
        const scale = inputs[1];
        const bias = inputs[2];
        const mean = inputs[3];
        const variance = inputs[4];
        if (!scale || !bias || !mean || !variance) {
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(X.data), [...X.shape])];
        }
        const out = new Float32Array(X.data.length);
        const C = scale.data.length;
        if (X.shape.length === 2) {
            const N = X.shape[0];
            for (let n = 0; n < N; n++) {
                for (let c = 0; c < C; c++) {
                    const idx = n * C + c;
                    out[idx] = (X.data[idx] - mean.data[c]) / Math.sqrt(variance.data[c] + this.eps)
                        * scale.data[c] + bias.data[c];
                }
            }
        }
        else if (X.shape.length === 3) {
            const N = X.shape[0];
            const L = X.shape[2];
            for (let n = 0; n < N; n++) {
                for (let c = 0; c < C; c++) {
                    const invStd = 1 / Math.sqrt(variance.data[c] + this.eps);
                    for (let l = 0; l < L; l++) {
                        const idx = n * C * L + c * L + l;
                        out[idx] = (X.data[idx] - mean.data[c]) * invStd * scale.data[c] + bias.data[c];
                    }
                }
            }
        }
        else {
            out.set(X.data);
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [...X.shape])];
    }
}
/**
 * LayerNormalization: normalize across the last axis.
 */
class LayerNormNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.eps = this.attr("epsilon", 1e-5);
        this.axis = this.attrInt("axis", -1);
    }
    execute(inputs) {
        const X = inputs[0];
        const scale = inputs.length >= 2 ? inputs[1] : null;
        const bias = inputs.length >= 3 ? inputs[2] : null;
        const shape = X.shape;
        const rank = shape.length;
        const axis = this.axis < 0 ? rank + this.axis : this.axis;
        const outerSize = shape.slice(0, axis).reduce((a, b) => a * b, 1);
        const innerSize = shape.slice(axis).reduce((a, b) => a * b, 1);
        const out = new Float32Array(X.data.length);
        for (let i = 0; i < outerSize; i++) {
            const base = i * innerSize;
            let mean = 0;
            for (let j = 0; j < innerSize; j++)
                mean += X.data[base + j];
            mean /= innerSize;
            let variance = 0;
            for (let j = 0; j < innerSize; j++) {
                const d = X.data[base + j] - mean;
                variance += d * d;
            }
            variance /= innerSize;
            const invStd = 1 / Math.sqrt(variance + this.eps);
            for (let j = 0; j < innerSize; j++) {
                let val = (X.data[base + j] - mean) * invStd;
                if (scale)
                    val *= scale.data[j % scale.data.length];
                if (bias)
                    val += bias.data[j % bias.data.length];
                out[base + j] = val;
            }
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [...shape])];
    }
}
/**
 * Dropout: passthrough during inference.
 */
class DropoutNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        // During inference, dropout is a no-op
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array(inputs[0].data), [...inputs[0].shape])];
    }
}
function registerNormOps(registry) {
    registry.register("BatchNormalization", (info) => new BatchNormNode(info));
    registry.register("LayerNormalization", (info) => new LayerNormNode(info));
    registry.register("InstanceNormalization", (info) => new BatchNormNode(info)); // same logic
    registry.register("Dropout", (info) => new DropoutNode(info));
}


/***/ }),

/***/ "./src/onnx/ops/recurrent.ts":
/*!***********************************!*\
  !*** ./src/onnx/ops/recurrent.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registerRecurrentOps: () => (/* binding */ registerRecurrentOps)
/* harmony export */ });
/* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../registry */ "./src/onnx/registry.ts");

function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}
/**
 * LSTM: Long Short-Term Memory.
 *
 * Inputs: X [seq_len, batch, input_size], W [num_dir, 4*hidden, input], R [num_dir, 4*hidden, hidden],
 *         B [num_dir, 8*hidden] (optional), sequence_lens, initial_hidden, initial_cell
 *
 * Simplified: single direction, batch=1, 2D input [seq_len, input_size].
 * Returns Y_h [1, 1, hidden_size] (last hidden state).
 */
class LSTMNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.hiddenSize = this.attrInt("hidden_size", 0);
    }
    execute(inputs) {
        const X = inputs[0]; // [seq_len, input_size] or [seq_len, batch, input_size]
        const W = inputs[1]; // [1, 4*H, input_size]
        const R = inputs[2]; // [1, 4*H, H]
        const B = inputs.length > 3 ? inputs[3] : null; // [1, 8*H]
        const seqLen = X.shape[0];
        const inputSize = X.shape.length >= 3 ? X.shape[2] : X.shape[1];
        const H = this.hiddenSize || W.data.length / (4 * inputSize);
        let h = new Float32Array(H);
        let c = new Float32Array(H);
        // Pre-extract W and R matrices (stored as [4*H, input] and [4*H, H])
        const W4H = W.data;
        const R4H = R.data;
        const biasW = B ? B.data : null;
        for (let t = 0; t < seqLen; t++) {
            const xOffset = t * inputSize;
            const gates = new Float32Array(4 * H);
            // gates = W @ x + R @ h + bias
            for (let g = 0; g < 4 * H; g++) {
                let sum = 0;
                for (let i = 0; i < inputSize; i++) {
                    sum += W4H[g * inputSize + i] * X.data[xOffset + i];
                }
                for (let j = 0; j < H; j++) {
                    sum += R4H[g * H + j] * h[j];
                }
                if (biasW) {
                    sum += biasW[g] + biasW[4 * H + g]; // W bias + R bias
                }
                gates[g] = sum;
            }
            // i=sigmoid, o=sigmoid, f=sigmoid, c'=tanh (IOFC order in ONNX)
            const newH = new Float32Array(H);
            const newC = new Float32Array(H);
            for (let j = 0; j < H; j++) {
                const i = sigmoid(gates[0 * H + j]);
                const o = sigmoid(gates[1 * H + j]);
                const f = sigmoid(gates[2 * H + j]);
                const g = Math.tanh(gates[3 * H + j]);
                newC[j] = f * c[j] + i * g;
                newH[j] = o * Math.tanh(newC[j]);
            }
            h = newH;
            c = newC;
        }
        // Return last hidden state [1, 1, H]
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(h, [1, 1, H])];
    }
}
/**
 * GRU: Gated Recurrent Unit.
 *
 * Simplified: single direction, batch=1.
 * Returns Y_h [1, 1, hidden_size].
 */
class GRUNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.hiddenSize = this.attrInt("hidden_size", 0);
    }
    execute(inputs) {
        const X = inputs[0];
        const W = inputs[1]; // [1, 3*H, input_size]
        const R = inputs[2]; // [1, 3*H, H]
        const B = inputs.length > 3 ? inputs[3] : null;
        const seqLen = X.shape[0];
        const inputSize = X.shape.length >= 3 ? X.shape[2] : X.shape[1];
        const H = this.hiddenSize || W.data.length / (3 * inputSize);
        let h = new Float32Array(H);
        const W3H = W.data;
        const R3H = R.data;
        const biasW = B ? B.data : null;
        for (let t = 0; t < seqLen; t++) {
            const xOffset = t * inputSize;
            // Compute z and r gates: gate = sigmoid(W_gate @ x + R_gate @ h + bias)
            const zGate = new Float32Array(H);
            const rGate = new Float32Array(H);
            for (let j = 0; j < H; j++) {
                let zSum = 0;
                let rSum = 0;
                for (let i = 0; i < inputSize; i++) {
                    zSum += W3H[(0 * H + j) * inputSize + i] * X.data[xOffset + i];
                    rSum += W3H[(1 * H + j) * inputSize + i] * X.data[xOffset + i];
                }
                for (let k = 0; k < H; k++) {
                    zSum += R3H[(0 * H + j) * H + k] * h[k];
                    rSum += R3H[(1 * H + j) * H + k] * h[k];
                }
                if (biasW) {
                    zSum += biasW[0 * H + j] + biasW[3 * H + j];
                    rSum += biasW[1 * H + j] + biasW[4 * H + j];
                }
                zGate[j] = sigmoid(zSum);
                rGate[j] = sigmoid(rSum);
            }
            // Compute candidate with linear_before_reset=1 (ONNX default for most exporters):
            // n = tanh(Wn @ x + Wb_n + r * (Rn @ h + Rb_n))
            const newH = new Float32Array(H);
            for (let j = 0; j < H; j++) {
                let nSum = 0;
                for (let i = 0; i < inputSize; i++) {
                    nSum += W3H[(2 * H + j) * inputSize + i] * X.data[xOffset + i];
                }
                if (biasW) {
                    nSum += biasW[2 * H + j]; // W bias for candidate
                }
                let rh = 0;
                for (let k = 0; k < H; k++) {
                    rh += R3H[(2 * H + j) * H + k] * h[k];
                }
                if (biasW) {
                    rh += biasW[5 * H + j]; // R bias for candidate (inside reset)
                }
                nSum += rGate[j] * rh;
                const n = Math.tanh(nSum);
                newH[j] = (1 - zGate[j]) * n + zGate[j] * h[j];
            }
            h = newH;
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(h, [1, 1, H])];
    }
}
function registerRecurrentOps(registry) {
    registry.register("LSTM", (info) => new LSTMNode(info));
    registry.register("GRU", (info) => new GRUNode(info));
}


/***/ }),

/***/ "./src/onnx/ops/spikypanda.ts":
/*!************************************!*\
  !*** ./src/onnx/ops/spikypanda.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registerSpikyPandaOps: () => (/* binding */ registerSpikyPandaOps)
/* harmony export */ });
/* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../registry */ "./src/onnx/registry.ts");

const BACKEND = "spikypanda";
// ─── Activation functions (matching spikypanda-core ActivationFunctions) ────
function spRelu(x) {
    return Math.max(0, x);
}
function spSigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}
function spTanh(x) {
    return Math.tanh(x);
}
function unaryMap(inp, fn) {
    const out = new Float32Array(inp.data.length);
    for (let i = 0; i < inp.data.length; i++)
        out[i] = fn(inp.data[i]);
    return (0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [...inp.shape]);
}
class SpGemmNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.alpha = this.attr("alpha", 1.0);
        this.beta = this.attr("beta", 1.0);
        this.transA = this.attrInt("transA", 0) !== 0;
        this.transB = this.attrInt("transB", 0) !== 0;
    }
    execute(inputs) {
        const A = inputs[0], B = inputs[1];
        const C = inputs.length > 2 ? inputs[2] : null;
        const aR = A.shape[0] ?? 1, aC = A.shape.length >= 2 ? A.shape[1] : A.data.length;
        const bR = B.shape[0] ?? 1, bC = B.shape.length >= 2 ? B.shape[1] : B.data.length;
        const M = this.transA ? aC : aR;
        const K = this.transA ? aR : aC;
        const N = this.transB ? bR : bC;
        const out = new Float32Array(M * N);
        const aData = A.data, bData = B.data;
        // Optimized: loop tiling for cache locality on small matrices
        if (!this.transA && !this.transB) {
            for (let m = 0; m < M; m++) {
                const mK = m * K;
                const mN = m * N;
                for (let k = 0; k < K; k++) {
                    const a = this.alpha * aData[mK + k];
                    const kN = k * N;
                    for (let n = 0; n < N; n++) {
                        out[mN + n] += a * bData[kN + n];
                    }
                }
            }
        }
        else {
            for (let m = 0; m < M; m++) {
                for (let n = 0; n < N; n++) {
                    let sum = 0;
                    for (let k = 0; k < K; k++) {
                        const ai = this.transA ? k * M + m : m * K + k;
                        const bi = this.transB ? n * K + k : k * N + n;
                        sum += aData[ai] * bData[bi];
                    }
                    out[m * N + n] = this.alpha * sum;
                }
            }
        }
        if (C) {
            const cData = C.data;
            const cLen = cData.length;
            if (cLen === N) {
                // Bias is [1, N]: broadcast per row
                for (let m = 0; m < M; m++) {
                    const mN = m * N;
                    for (let n = 0; n < N; n++) {
                        out[mN + n] += this.beta * cData[n];
                    }
                }
            }
            else {
                for (let i = 0; i < out.length; i++) {
                    out[i] += this.beta * cData[i % cLen];
                }
            }
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [M, N])];
    }
}
class SpLstmNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.hiddenSize = this.attrInt("hidden_size", 0);
    }
    execute(inputs) {
        const X = inputs[0];
        const W = inputs[1];
        const R = inputs[2];
        const B = inputs.length > 3 ? inputs[3] : null;
        const seqLen = X.shape[0];
        const inputSize = X.shape.length >= 3 ? X.shape[2] : X.shape[1];
        const H = this.hiddenSize || W.data.length / (4 * inputSize);
        let h = new Float32Array(H);
        let c = new Float32Array(H);
        const W4H = W.data, R4H = R.data;
        const biasW = B ? B.data : null;
        // Pre-allocate gate buffer
        const gates = new Float32Array(4 * H);
        for (let t = 0; t < seqLen; t++) {
            const xOff = t * inputSize;
            // Compute gates: W*x + R*h + bias
            gates.fill(0);
            for (let g = 0; g < 4 * H; g++) {
                let sum = 0;
                const gInput = g * inputSize;
                const gHidden = g * H;
                for (let i = 0; i < inputSize; i++)
                    sum += W4H[gInput + i] * X.data[xOff + i];
                for (let j = 0; j < H; j++)
                    sum += R4H[gHidden + j] * h[j];
                if (biasW)
                    sum += biasW[g] + biasW[4 * H + g];
                gates[g] = sum;
            }
            // Apply gate functions (IOFC order)
            const newH = new Float32Array(H);
            const newC = new Float32Array(H);
            for (let j = 0; j < H; j++) {
                const i = spSigmoid(gates[j]);
                const o = spSigmoid(gates[H + j]);
                const f = spSigmoid(gates[2 * H + j]);
                const g = spTanh(gates[3 * H + j]);
                newC[j] = f * c[j] + i * g;
                newH[j] = o * spTanh(newC[j]);
            }
            h = newH;
            c = newC;
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(h, [1, 1, H])];
    }
}
class SpGruNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.hiddenSize = this.attrInt("hidden_size", 0);
    }
    execute(inputs) {
        const X = inputs[0];
        const W = inputs[1];
        const R = inputs[2];
        const B = inputs.length > 3 ? inputs[3] : null;
        const seqLen = X.shape[0];
        const inputSize = X.shape.length >= 3 ? X.shape[2] : X.shape[1];
        const H = this.hiddenSize || W.data.length / (3 * inputSize);
        let h = new Float32Array(H);
        for (let t = 0; t < seqLen; t++) {
            const xOff = t * inputSize;
            // Compute z and r gates: gate = sigmoid(W_gate @ x + R_gate @ h + bias)
            const zGate = new Float32Array(H);
            const rGate = new Float32Array(H);
            for (let j = 0; j < H; j++) {
                let zSum = 0;
                let rSum = 0;
                for (let i = 0; i < inputSize; i++) {
                    zSum += W.data[(0 * H + j) * inputSize + i] * X.data[xOff + i];
                    rSum += W.data[(1 * H + j) * inputSize + i] * X.data[xOff + i];
                }
                for (let k = 0; k < H; k++) {
                    zSum += R.data[(0 * H + j) * H + k] * h[k];
                    rSum += R.data[(1 * H + j) * H + k] * h[k];
                }
                if (B) {
                    zSum += B.data[0 * H + j] + B.data[3 * H + j];
                    rSum += B.data[1 * H + j] + B.data[4 * H + j];
                }
                zGate[j] = spSigmoid(zSum);
                rGate[j] = spSigmoid(rSum);
            }
            // Candidate with linear_before_reset=1:
            // n = tanh(Wn @ x + Wb_n + r * (Rn @ h + Rb_n))
            const newH = new Float32Array(H);
            for (let j = 0; j < H; j++) {
                let nSum = 0;
                for (let i = 0; i < inputSize; i++) {
                    nSum += W.data[(2 * H + j) * inputSize + i] * X.data[xOff + i];
                }
                if (B)
                    nSum += B.data[2 * H + j];
                let rh = 0;
                for (let k = 0; k < H; k++) {
                    rh += R.data[(2 * H + j) * H + k] * h[k];
                }
                if (B)
                    rh += B.data[5 * H + j];
                nSum += rGate[j] * rh;
                const n = spTanh(nSum);
                newH[j] = (1 - zGate[j]) * n + zGate[j] * h[j];
            }
            h = newH;
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(h, [1, 1, H])];
    }
}
class SpConvNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor() {
        super(...arguments);
        this.outputShapes = [];
    }
    execute(inputs) {
        const X = inputs[0], W = inputs[1];
        const B = inputs.length > 2 ? inputs[2] : null;
        if (X.shape.length <= 2) {
            // Treat 2D as fully connected
            const features = X.shape.length === 2 ? X.shape[1] : X.data.length;
            const batch = X.shape[0] ?? 1;
            const outF = W.shape[0] ?? W.data.length;
            const wCols = W.data.length / outF;
            const out = new Float32Array(batch * outF);
            for (let n = 0; n < batch; n++) {
                for (let o = 0; o < outF; o++) {
                    let sum = 0;
                    const len = Math.min(wCols, features);
                    const nF = n * features, oW = o * wCols;
                    for (let i = 0; i < len; i++)
                        sum += X.data[nF + i] * W.data[oW + i];
                    if (B)
                        sum += B.data[o % B.data.length];
                    out[n * outF + o] = sum;
                }
            }
            return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [batch, outF])];
        }
        // 3D: [N, C_in, L]
        const N = X.shape[0], C_in = X.shape[1], L = X.shape[2];
        const C_out = W.shape[0];
        const kL = W.shape.length >= 3 ? W.shape[2] : 1;
        const stride = this.attrInt("strides", 1);
        const pad = this.attrInt("pads", 0);
        const outL = Math.floor((L + 2 * pad - kL) / stride) + 1;
        const out = new Float32Array(N * C_out * outL);
        for (let n = 0; n < N; n++) {
            for (let co = 0; co < C_out; co++) {
                for (let ol = 0; ol < outL; ol++) {
                    let sum = 0;
                    for (let ci = 0; ci < C_in; ci++) {
                        for (let kk = 0; kk < kL; kk++) {
                            const il = ol * stride - pad + kk;
                            if (il >= 0 && il < L) {
                                sum += X.data[n * C_in * L + ci * L + il] * W.data[co * C_in * kL + ci * kL + kk];
                            }
                        }
                    }
                    if (B)
                        sum += B.data[co];
                    out[n * C_out * outL + co * outL + ol] = sum;
                }
            }
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [N, C_out, outL])];
    }
}
// ─── Registration ───────────────────────────────────────────────────────────
/**
 * Register SpikyPanda native implementations at PRIORITY_NATIVE.
 * These override the generic ONNX implementations for key ops.
 */
function registerSpikyPandaOps(registry) {
    // Activations (using SpikyPanda's activation functions)
    registry.register("Relu", (info) => {
        const n = new (class extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
            constructor() {
                super(...arguments);
                this.outputShapes = [];
            }
            execute(inputs) {
                return [unaryMap(inputs[0], spRelu)];
            }
        })(info);
        return n;
    }, _registry__WEBPACK_IMPORTED_MODULE_0__.PRIORITY_NATIVE, BACKEND);
    registry.register("Sigmoid", (info) => {
        const n = new (class extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
            constructor() {
                super(...arguments);
                this.outputShapes = [];
            }
            execute(inputs) {
                return [unaryMap(inputs[0], spSigmoid)];
            }
        })(info);
        return n;
    }, _registry__WEBPACK_IMPORTED_MODULE_0__.PRIORITY_NATIVE, BACKEND);
    registry.register("Tanh", (info) => {
        const n = new (class extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
            constructor() {
                super(...arguments);
                this.outputShapes = [];
            }
            execute(inputs) {
                return [unaryMap(inputs[0], spTanh)];
            }
        })(info);
        return n;
    }, _registry__WEBPACK_IMPORTED_MODULE_0__.PRIORITY_NATIVE, BACKEND);
    // Matrix ops
    registry.register("Gemm", (info) => new SpGemmNode(info), _registry__WEBPACK_IMPORTED_MODULE_0__.PRIORITY_NATIVE, BACKEND);
    // Recurrent
    registry.register("LSTM", (info) => new SpLstmNode(info), _registry__WEBPACK_IMPORTED_MODULE_0__.PRIORITY_NATIVE, BACKEND);
    registry.register("GRU", (info) => new SpGruNode(info), _registry__WEBPACK_IMPORTED_MODULE_0__.PRIORITY_NATIVE, BACKEND);
    // Conv
    registry.register("Conv", (info) => new SpConvNode(info), _registry__WEBPACK_IMPORTED_MODULE_0__.PRIORITY_NATIVE, BACKEND);
}


/***/ }),

/***/ "./src/onnx/pb/index.ts":
/*!******************************!*\
  !*** ./src/onnx/pb/index.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LB_EOF: () => (/* reexport safe */ _stream__WEBPACK_IMPORTED_MODULE_0__.LB_EOF),
/* harmony export */   MemoryStream: () => (/* reexport safe */ _stream__WEBPACK_IMPORTED_MODULE_0__.MemoryStream),
/* harmony export */   PBReader: () => (/* reexport safe */ _reader__WEBPACK_IMPORTED_MODULE_1__.PBReader),
/* harmony export */   PBSubReader: () => (/* reexport safe */ _reader__WEBPACK_IMPORTED_MODULE_1__.PBSubReader),
/* harmony export */   PBWriter: () => (/* reexport safe */ _writer__WEBPACK_IMPORTED_MODULE_2__.PBWriter),
/* harmony export */   SeekOrigin: () => (/* reexport safe */ _stream__WEBPACK_IMPORTED_MODULE_0__.SeekOrigin),
/* harmony export */   StreamView: () => (/* reexport safe */ _stream__WEBPACK_IMPORTED_MODULE_0__.StreamView),
/* harmony export */   WireType: () => (/* reexport safe */ _reader__WEBPACK_IMPORTED_MODULE_1__.WireType)
/* harmony export */ });
/* harmony import */ var _stream__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./stream */ "./src/onnx/pb/stream.ts");
/* harmony import */ var _reader__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./reader */ "./src/onnx/pb/reader.ts");
/* harmony import */ var _writer__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./writer */ "./src/onnx/pb/writer.ts");





/***/ }),

/***/ "./src/onnx/pb/reader.ts":
/*!*******************************!*\
  !*** ./src/onnx/pb/reader.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PBReader: () => (/* binding */ PBReader),
/* harmony export */   PBSubReader: () => (/* binding */ PBSubReader),
/* harmony export */   WireType: () => (/* binding */ WireType)
/* harmony export */ });
/* harmony import */ var _stream__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./stream */ "./src/onnx/pb/stream.ts");
// ═══════════════════════════════════════════════════════════════════════════
// Protobuf wire format reader
//
// Ported from CyanMycelium/BlueSteelLadyBug C++ implementation (lb_parser).
// Reads protobuf-encoded binary data without requiring generated code or
// external dependencies.
//
// Supports:
//   - Varint, fixed32, fixed64 wire types
//   - Length-delimited fields (strings, bytes, sub-messages)
//   - Packed repeated fields
//   - Save/restore snapshots for two-pass parsing
//   - Sub-message readers with bounded scope
// ═══════════════════════════════════════════════════════════════════════════

const MAX_READER_SNAPSHOT_DEPTH = 8;
// ─── Wire types ───────────────────────────────────────────────────────────
var WireType;
(function (WireType) {
    WireType[WireType["VARINT"] = 0] = "VARINT";
    WireType[WireType["FIXED64"] = 1] = "FIXED64";
    WireType[WireType["LEN"] = 2] = "LEN";
    WireType[WireType["FIXED32"] = 5] = "FIXED32";
})(WireType || (WireType = {}));
// ─── Scratch buffers (reused across reads to avoid allocations) ──────────
const _scratch4 = new Uint8Array(4);
const _scratch8 = new Uint8Array(8);
const _view4 = new DataView(_scratch4.buffer);
const _view8 = new DataView(_scratch8.buffer);
// ─── PBReader ─────────────────────────────────────────────────────────────
/**
 * Pull-style protobuf reader. Reads tags, then values on demand.
 *
 * Equivalent to BlueSteelLadyBug::PBReader.
 *
 * Usage:
 * ```typescript
 * const reader = new PBReader(new MemoryStream(bytes));
 * while (reader.readTag()) {
 *     switch (reader.fieldNumber) {
 *         case 1: value = reader.readInt32(); break;
 *         case 2: name = reader.readString(256); break;
 *         default: reader.skip(); break;
 *     }
 * }
 * ```
 */
class PBReader {
    constructor(input) {
        this._input = input;
        this._status = {
            fieldNumber: 0,
            wireType: WireType.VARINT,
            depth: 0,
            length: 0,
            lengthRead: false,
        };
        this._snapshots = new Array(MAX_READER_SNAPSHOT_DEPTH);
        this._activeSnapshot = -1;
    }
    // ── Tag reading ───────────────────────────────────────────────────────
    /**
     * Read the next protobuf tag from the input.
     * After this call, `fieldNumber` and `wireType` are set.
     * @returns true if a tag was read; false at end of stream.
     */
    readTag() {
        const tag = this._readVarint();
        if (tag === null)
            return false;
        this._status.fieldNumber = Number(tag) >>> 3;
        this._status.wireType = (Number(tag) & 0x07);
        this._status.lengthRead = false;
        return true;
    }
    // ── Accessors ─────────────────────────────────────────────────────────
    get fieldNumber() {
        return this._status.fieldNumber;
    }
    get wireType() {
        return this._status.wireType;
    }
    get depth() {
        return this._status.depth;
    }
    get position() {
        return this._input.getPosition();
    }
    get size() {
        return this._input.getSize();
    }
    get remainingBytes() {
        return this._input.getRemainingBytes();
    }
    get input() {
        return this._input;
    }
    // ── Value readers ─────────────────────────────────────────────────────
    /** Read a length prefix (for LEN wire type). Caches the length. */
    readLength(validate = true) {
        if (this._status.wireType !== WireType.LEN)
            return null;
        if (this._status.lengthRead) {
            return this._status.length;
        }
        const v = this._readVarint();
        if (v === null)
            return null;
        this._status.length = Number(v);
        this._status.lengthRead = validate;
        return this._status.length;
    }
    /** Read an int32 (varint or fixed32 depending on wire type). */
    readInt32() {
        if (this._status.wireType === WireType.VARINT) {
            const v = this._readVarint();
            return v !== null ? Number(v) | 0 : null;
        }
        return this._readFixed32AsInt();
    }
    /** Read an int64 as a number (varint or fixed64). */
    readInt64() {
        if (this._status.wireType === WireType.VARINT) {
            const v = this._readVarint();
            return v !== null ? Number(v) : null;
        }
        return this._readFixed64AsNumber();
    }
    /** Read a float32 (fixed32 wire type). */
    readFloat() {
        if (this._input.read(_scratch4, 0, 4) !== 4)
            return null;
        return _view4.getFloat32(0, true); // little-endian
    }
    /** Read a float64 (fixed64 wire type). */
    readDouble() {
        if (this._input.read(_scratch8, 0, 8) !== 8)
            return null;
        return _view8.getFloat64(0, true); // little-endian
    }
    /** Read a boolean (varint wire type). */
    readBool() {
        const v = this._readVarint();
        if (v === null)
            return null;
        return v !== 0;
    }
    /**
     * Read a length-delimited string with a max size bound.
     * Equivalent to readValue_s(char*, int) in C++.
     */
    readString(maxLength = 256) {
        const len = this.readLength();
        if (len === null)
            return null;
        this._invalidateLengthRead();
        const readLen = Math.min(len, maxLength);
        const buf = new Uint8Array(readLen);
        if (this._input.read(buf, 0, readLen) !== readLen)
            return null;
        // Skip excess bytes if string was truncated
        if (readLen < len) {
            if (!this._input.seek(len - readLen, _stream__WEBPACK_IMPORTED_MODULE_0__.SeekOrigin.CURRENT))
                return null;
        }
        return new TextDecoder().decode(buf);
    }
    /**
     * Read length-delimited raw bytes.
     * @param maxSize  Maximum bytes to read (excess is skipped).
     */
    readBytes(maxSize) {
        const len = this.readLength();
        if (len === null)
            return null;
        this._invalidateLengthRead();
        const readLen = maxSize !== undefined ? Math.min(len, maxSize) : len;
        const buf = new Uint8Array(readLen);
        if (this._input.read(buf, 0, readLen) !== readLen)
            return null;
        if (readLen < len) {
            if (!this._input.seek(len - readLen, _stream__WEBPACK_IMPORTED_MODULE_0__.SeekOrigin.CURRENT))
                return null;
        }
        return buf;
    }
    // ── Packed repeated fields ────────────────────────────────────────────
    /**
     * Read packed varint int32 values into a pre-allocated array.
     * @param target  Target array.
     * @param maxCount  Maximum number of elements to read.
     * @returns The number of elements actually read, or null on error.
     */
    readPackedInt32(target, maxCount) {
        if (this._status.wireType !== WireType.LEN)
            return null;
        const len = this.readLength();
        if (len === null)
            return null;
        this._invalidateLengthRead();
        const end = this.position + len;
        let i = 0;
        while (this.position < end) {
            const v = this._readVarint();
            if (v === null)
                return null;
            if (i < maxCount) {
                target[i++] = Number(v) | 0;
            }
        }
        return i;
    }
    /**
     * Read packed float32 values into a pre-allocated array.
     * @param target  Target array.
     * @param maxCount  Maximum number of elements to read.
     * @returns The number of elements actually read, or null on error.
     */
    readPackedFloat32(target, maxCount) {
        if (this._status.wireType !== WireType.LEN)
            return null;
        const len = this.readLength();
        if (len === null)
            return null;
        this._invalidateLengthRead();
        const end = this.position + len;
        let i = 0;
        while (this.position < end) {
            if (this._input.read(_scratch4, 0, 4) !== 4)
                return null;
            if (i < maxCount) {
                target[i++] = _view4.getFloat32(0, true);
            }
        }
        return i;
    }
    /**
     * Read packed float64 values into a pre-allocated array.
     */
    readPackedFloat64(target, maxCount) {
        if (this._status.wireType !== WireType.LEN)
            return null;
        const len = this.readLength();
        if (len === null)
            return null;
        this._invalidateLengthRead();
        const end = this.position + len;
        let i = 0;
        while (this.position < end) {
            if (this._input.read(_scratch8, 0, 8) !== 8)
                return null;
            if (i < maxCount) {
                target[i++] = _view8.getFloat64(0, true);
            }
        }
        return i;
    }
    // ── Sub-message ───────────────────────────────────────────────────────
    /**
     * Create a sub-reader scoped to the current length-delimited field.
     * The sub-reader's stream is bounded to the message bytes.
     */
    getSubMessageReader() {
        const len = this.readLength();
        if (len === null)
            return null;
        this._invalidateLengthRead();
        return new PBSubReader(this, this._status.depth + 1, this.position, len);
    }
    // ── Skip ──────────────────────────────────────────────────────────────
    /** Skip the current field value. */
    skip() {
        switch (this._status.wireType) {
            case WireType.VARINT: {
                return this._readVarint() !== null;
            }
            case WireType.FIXED32: {
                return this._input.seek(4, _stream__WEBPACK_IMPORTED_MODULE_0__.SeekOrigin.CURRENT);
            }
            case WireType.FIXED64: {
                return this._input.seek(8, _stream__WEBPACK_IMPORTED_MODULE_0__.SeekOrigin.CURRENT);
            }
            case WireType.LEN: {
                const len = this.readLength();
                if (len === null)
                    return false;
                this._invalidateLengthRead();
                return this._input.seek(len, _stream__WEBPACK_IMPORTED_MODULE_0__.SeekOrigin.CURRENT);
            }
            default:
                return false;
        }
    }
    // ── Save / restore (snapshot stack) ───────────────────────────────────
    /** Save the current parser state. Stream must support seeking. */
    save() {
        if (this._input.canSeek() && this._activeSnapshot < MAX_READER_SNAPSHOT_DEPTH - 1) {
            this._activeSnapshot++;
            this._snapshots[this._activeSnapshot] = {
                position: this.position,
                status: { ...this._status },
            };
        }
    }
    /** Restore the last saved state. */
    restore() {
        if (this._input.canSeek() && this._activeSnapshot >= 0) {
            const snap = this._snapshots[this._activeSnapshot];
            this._status = { ...snap.status };
            this._input.seek(snap.position, _stream__WEBPACK_IMPORTED_MODULE_0__.SeekOrigin.BEGIN);
            this._activeSnapshot--;
        }
    }
    /** Discard the last save without restoring. */
    unsave() {
        if (this._activeSnapshot >= 0) {
            this._activeSnapshot--;
        }
    }
    // ── Private primitives ────────────────────────────────────────────────
    /**
     * Read a varint (variable-length integer) from the stream.
     * Returns null on EOF. Uses Number (safe up to 2^53).
     */
    _readVarint() {
        const byte0 = this._input.readByte();
        if (byte0 === _stream__WEBPACK_IMPORTED_MODULE_0__.LB_EOF)
            return null;
        // Fast path: single byte (most common for field tags and small values)
        if ((byte0 & 0x80) === 0) {
            return byte0;
        }
        // Multi-byte varint
        let lo = byte0 & 0x7f;
        let shift = 7;
        let byte;
        let byteCount = 1;
        do {
            byte = this._input.readByte();
            if (byte === _stream__WEBPACK_IMPORTED_MODULE_0__.LB_EOF)
                return null;
            byteCount++;
            if (shift < 32) {
                lo |= (byte & 0x7f) << shift;
            }
            shift += 7;
        } while (byte & 0x80);
        // For negative int64, protobuf uses 10-byte varints with high bits set.
        // Detect this and return as signed 32-bit (sufficient for ONNX attribute values).
        if (byteCount >= 10) {
            return lo | 0; // interpret as signed 32-bit
        }
        return lo >>> 0; // force unsigned 32-bit for positive values
    }
    _readFixed32AsInt() {
        if (this._input.read(_scratch4, 0, 4) !== 4)
            return null;
        return _view4.getInt32(0, true);
    }
    _readFixed64AsNumber() {
        if (this._input.read(_scratch8, 0, 8) !== 8)
            return null;
        // Read as two 32-bit values to avoid BigInt dependency
        const lo = _view8.getUint32(0, true);
        const hi = _view8.getUint32(4, true);
        return hi * 0x100000000 + lo;
    }
    _invalidateLengthRead() {
        this._status.lengthRead = false;
    }
}
// ─── PBSubReader ──────────────────────────────────────────────────────────
/**
 * A PBReader scoped to a sub-message via a StreamView.
 *
 * Equivalent to BlueSteelLadyBug::PBSubReader.
 */
class PBSubReader extends PBReader {
    constructor(parent, depth, from, length) {
        super(new _stream__WEBPACK_IMPORTED_MODULE_0__.StreamView(parent.input, from, length));
        this._status.depth = depth;
    }
}


/***/ }),

/***/ "./src/onnx/pb/stream.ts":
/*!*******************************!*\
  !*** ./src/onnx/pb/stream.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LB_EOF: () => (/* binding */ LB_EOF),
/* harmony export */   MemoryStream: () => (/* binding */ MemoryStream),
/* harmony export */   SeekOrigin: () => (/* binding */ SeekOrigin),
/* harmony export */   StreamView: () => (/* binding */ StreamView)
/* harmony export */ });
// ═══════════════════════════════════════════════════════════════════════════
// Protobuf stream abstraction
//
// Ported from CyanMycelium/BlueSteelLadyBug C++ implementation.
// Provides IInputStream, MemoryStream and StreamView for binary parsing.
// ═══════════════════════════════════════════════════════════════════════════
const LB_EOF = -1;
var SeekOrigin;
(function (SeekOrigin) {
    SeekOrigin[SeekOrigin["BEGIN"] = 0] = "BEGIN";
    SeekOrigin[SeekOrigin["CURRENT"] = 1] = "CURRENT";
    SeekOrigin[SeekOrigin["END"] = 2] = "END";
})(SeekOrigin || (SeekOrigin = {}));
// ─── MemoryStream ─────────────────────────────────────────────────────────
/**
 * Reads from an in-memory byte buffer.
 *
 * Equivalent to BlueSteelLadyBug::MemoryStream.
 */
class MemoryStream {
    constructor(buffer) {
        this._buffer = buffer;
        this._size = buffer.byteLength;
        this._pos = 0;
    }
    readByte() {
        if (this._pos < this._size) {
            return this._buffer[this._pos++];
        }
        return LB_EOF;
    }
    read(target, offset, count) {
        if (this._pos >= this._size) {
            return LB_EOF;
        }
        if (count === 1) {
            target[offset] = this._buffer[this._pos++];
            return 1;
        }
        const len = Math.min(count, this._size - this._pos);
        target.set(this._buffer.subarray(this._pos, this._pos + len), offset);
        this._pos += len;
        return len;
    }
    canSeek() {
        return true;
    }
    seek(value, origin = SeekOrigin.BEGIN) {
        let tmp;
        if (origin === SeekOrigin.BEGIN) {
            tmp = value;
        }
        else if (origin === SeekOrigin.END) {
            tmp = this._size - value;
        }
        else {
            tmp = this._pos + value;
        }
        this._pos = Math.min(Math.max(tmp, 0), this._size);
        return true;
    }
    getSize() {
        return this._size;
    }
    getPosition() {
        return this._pos;
    }
    getRemainingBytes() {
        return this._size - this._pos;
    }
}
// ─── StreamView ───────────────────────────────────────────────────────────
/**
 * A bounded view over an underlying stream, used for reading sub-messages.
 *
 * Equivalent to BlueSteelLadyBug::StreamView.
 */
class StreamView {
    constructor(delegate, offset, size) {
        this._delegate = delegate;
        this._offset = offset;
        this._size = size;
        this._pos = 0;
    }
    readByte() {
        if (this._pos >= this._size) {
            return LB_EOF;
        }
        const b = this._delegate.readByte();
        if (b === LB_EOF)
            return LB_EOF;
        this._pos++;
        return b;
    }
    read(target, offset, count) {
        if (this._pos >= this._size) {
            return LB_EOF;
        }
        const len = Math.min(count, this._size - this._pos);
        const r = this._delegate.read(target, offset, len);
        if (r > 0) {
            this._pos += r;
        }
        return r;
    }
    canSeek() {
        return this._delegate.canSeek();
    }
    seek(value, origin = SeekOrigin.BEGIN) {
        let tmp;
        if (origin === SeekOrigin.BEGIN) {
            tmp = value;
        }
        else if (origin === SeekOrigin.END) {
            tmp = this._size - value;
        }
        else {
            tmp = this._pos + value;
        }
        tmp = Math.min(Math.max(tmp, 0), this._size);
        if (!this._delegate.seek(tmp + this._offset, SeekOrigin.BEGIN)) {
            return false;
        }
        this._pos = tmp;
        return true;
    }
    getSize() {
        return this._size;
    }
    getPosition() {
        return this._pos;
    }
    getRemainingBytes() {
        return this._size - this._pos;
    }
}


/***/ }),

/***/ "./src/onnx/pb/writer.ts":
/*!*******************************!*\
  !*** ./src/onnx/pb/writer.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PBWriter: () => (/* binding */ PBWriter)
/* harmony export */ });
// ═══════════════════════════════════════════════════════════════════════════
// Protobuf wire format writer
//
// Symmetric counterpart to reader.ts.
// Writes protobuf-encoded binary data without requiring generated code or
// external dependencies.
//
// Supports:
//   - Varint, fixed32, fixed64 wire types
//   - Length-delimited fields (strings, bytes, sub-messages)
//   - Packed repeated fields
//   - Sub-message writers with automatic length prefixing
// ═══════════════════════════════════════════════════════════════════════════
// ─── Default buffer size ─────────────────────────────────────────────────
const DEFAULT_CAPACITY = 256;
const GROWTH_FACTOR = 2;
// ─── Scratch buffers (reused across writes to avoid allocations) ─────────
const _scratch4 = new Uint8Array(4);
const _scratch8 = new Uint8Array(8);
const _view4 = new DataView(_scratch4.buffer);
const _view8 = new DataView(_scratch8.buffer);
// ─── PBWriter ────────────────────────────────────────────────────────────
/**
 * Push-style protobuf writer. Writes tags, then values sequentially.
 *
 * Usage:
 * ```typescript
 * const writer = new PBWriter();
 * writer.writeTag(1, WireType.VARINT);
 * writer.writeInt32(42);
 * writer.writeTag(2, WireType.LEN);
 * writer.writeString("hello");
 * const bytes = writer.finish();
 * ```
 */
class PBWriter {
    constructor(capacity = DEFAULT_CAPACITY) {
        this._buffer = new Uint8Array(capacity);
        this._pos = 0;
    }
    // ── Tag writing ───────────────────────────────────────────────────────
    /**
     * Write a protobuf tag (field number + wire type).
     */
    writeTag(fieldNumber, wireType) {
        this._writeVarint(((fieldNumber << 3) | wireType) >>> 0);
    }
    // ── Accessors ─────────────────────────────────────────────────────────
    /** Current number of bytes written. */
    get length() {
        return this._pos;
    }
    // ── Value writers ─────────────────────────────────────────────────────
    /** Write a varint-encoded int32. */
    writeInt32(value) {
        this._writeVarint(value | 0);
    }
    /** Write a varint-encoded uint32. */
    writeUint32(value) {
        this._writeVarint(value >>> 0);
    }
    /** Write a varint-encoded int64 (from a JS number, safe up to 2^53). */
    writeInt64(value) {
        this._writeVarint64(value);
    }
    /** Write a fixed32 (little-endian 4 bytes). */
    writeFixed32(value) {
        this._ensureCapacity(4);
        _view4.setInt32(0, value, true);
        this._buffer.set(_scratch4, this._pos);
        this._pos += 4;
    }
    /** Write a fixed64 (little-endian 8 bytes, from a JS number). */
    writeFixed64(value) {
        this._ensureCapacity(8);
        const lo = value >>> 0;
        const hi = (value / 0x100000000) >>> 0;
        _view8.setUint32(0, lo, true);
        _view8.setUint32(4, hi, true);
        this._buffer.set(_scratch8, this._pos);
        this._pos += 8;
    }
    /** Write a float32 (fixed32 wire type). */
    writeFloat(value) {
        this._ensureCapacity(4);
        _view4.setFloat32(0, value, true);
        this._buffer.set(_scratch4, this._pos);
        this._pos += 4;
    }
    /** Write a float64 (fixed64 wire type). */
    writeDouble(value) {
        this._ensureCapacity(8);
        _view8.setFloat64(0, value, true);
        this._buffer.set(_scratch8, this._pos);
        this._pos += 8;
    }
    /** Write a boolean (varint wire type). */
    writeBool(value) {
        this._writeVarint(value ? 1 : 0);
    }
    /**
     * Write a length-delimited string.
     * Writes the length prefix followed by UTF-8 encoded bytes.
     */
    writeString(value) {
        const encoded = new TextEncoder().encode(value);
        this._writeVarint(encoded.byteLength);
        this._writeRawBytes(encoded);
    }
    /**
     * Write length-delimited raw bytes.
     * Writes the length prefix followed by the byte content.
     */
    writeBytes(value) {
        this._writeVarint(value.byteLength);
        this._writeRawBytes(value);
    }
    // ── Packed repeated fields ────────────────────────────────────────────
    /**
     * Write packed varint int32 values.
     * Writes a length prefix followed by varint-encoded values.
     * @param values  Source array.
     * @param count   Number of elements to write from the array.
     */
    writePackedInt32(values, count) {
        // Measure first to compute length prefix
        const tmp = new PBWriter();
        const n = Math.min(count, values.length);
        for (let i = 0; i < n; i++) {
            tmp._writeVarint(values[i] | 0);
        }
        const packed = tmp.finish();
        this._writeVarint(packed.byteLength);
        this._writeRawBytes(packed);
    }
    /**
     * Write packed float32 values.
     * @param values  Source array.
     * @param count   Number of elements to write from the array.
     */
    writePackedFloat32(values, count) {
        const n = Math.min(count, values.length);
        this._writeVarint(n * 4);
        this._ensureCapacity(n * 4);
        for (let i = 0; i < n; i++) {
            _view4.setFloat32(0, values[i], true);
            this._buffer.set(_scratch4, this._pos);
            this._pos += 4;
        }
    }
    /**
     * Write packed float64 values.
     * @param values  Source array.
     * @param count   Number of elements to write from the array.
     */
    writePackedFloat64(values, count) {
        const n = Math.min(count, values.length);
        this._writeVarint(n * 8);
        this._ensureCapacity(n * 8);
        for (let i = 0; i < n; i++) {
            _view8.setFloat64(0, values[i], true);
            this._buffer.set(_scratch8, this._pos);
            this._pos += 8;
        }
    }
    // ── Sub-message ───────────────────────────────────────────────────────
    /**
     * Write a sub-message using a callback.
     * The callback receives a fresh writer; its output is automatically
     * length-prefixed and appended to this writer.
     *
     * Usage:
     * ```typescript
     * writer.writeTag(3, WireType.LEN);
     * writer.writeSubMessage((sub) => {
     *     sub.writeTag(1, WireType.VARINT);
     *     sub.writeInt32(42);
     * });
     * ```
     */
    writeSubMessage(fn) {
        const sub = new PBWriter();
        fn(sub);
        const data = sub.finish();
        this._writeVarint(data.byteLength);
        this._writeRawBytes(data);
    }
    /**
     * Write pre-serialized sub-message bytes with a length prefix.
     */
    writeRawSubMessage(data) {
        this._writeVarint(data.byteLength);
        this._writeRawBytes(data);
    }
    // ── Finalize ──────────────────────────────────────────────────────────
    /**
     * Return the written bytes as a compact Uint8Array.
     * After calling finish(), the writer should not be reused.
     */
    finish() {
        return this._buffer.subarray(0, this._pos);
    }
    /**
     * Reset the writer to reuse its buffer.
     */
    reset() {
        this._pos = 0;
    }
    // ── Private primitives ────────────────────────────────────────────────
    /**
     * Write a varint (unsigned 32-bit).
     */
    _writeVarint(value) {
        value = value >>> 0; // force unsigned 32-bit
        while (value > 0x7f) {
            this._writeByte((value & 0x7f) | 0x80);
            value >>>= 7;
        }
        this._writeByte(value);
    }
    /**
     * Write a 64-bit varint from a JS number (safe up to 2^53).
     */
    _writeVarint64(value) {
        // Handle negative or values > 2^32 by splitting into lo/hi
        let lo = value >>> 0;
        let hi = (value / 0x100000000) >>> 0;
        // Write lo part (up to 4 full 7-bit groups = 28 bits)
        while (hi > 0 || lo > 0x7f) {
            this._writeByte((lo & 0x7f) | 0x80);
            lo = ((lo >>> 7) | (hi << 25)) >>> 0;
            hi >>>= 7;
        }
        this._writeByte(lo & 0x7f);
    }
    _writeByte(b) {
        this._ensureCapacity(1);
        this._buffer[this._pos++] = b;
    }
    _writeRawBytes(data) {
        this._ensureCapacity(data.byteLength);
        this._buffer.set(data, this._pos);
        this._pos += data.byteLength;
    }
    _ensureCapacity(needed) {
        const required = this._pos + needed;
        if (required <= this._buffer.byteLength)
            return;
        let newSize = this._buffer.byteLength;
        while (newSize < required) {
            newSize *= GROWTH_FACTOR;
        }
        const newBuf = new Uint8Array(newSize);
        newBuf.set(this._buffer);
        this._buffer = newBuf;
    }
}


/***/ }),

/***/ "./src/onnx/registry.ts":
/*!******************************!*\
  !*** ./src/onnx/registry.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   OnnxOpNode: () => (/* binding */ OnnxOpNode),
/* harmony export */   OnnxOpRegistry: () => (/* binding */ OnnxOpRegistry),
/* harmony export */   PRIORITY_GENERIC: () => (/* binding */ PRIORITY_GENERIC),
/* harmony export */   PRIORITY_NATIVE: () => (/* binding */ PRIORITY_NATIVE),
/* harmony export */   getInitializerData: () => (/* binding */ getInitializerData),
/* harmony export */   makeTensor: () => (/* binding */ makeTensor),
/* harmony export */   shapeSize: () => (/* binding */ shapeSize)
/* harmony export */ });
/* harmony import */ var _compute_compute_node_base__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../compute/compute.node.base */ "./src/compute/compute.node.base.ts");
/* harmony import */ var _onnx_types__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./onnx-types */ "./src/onnx/onnx-types.ts");


/**
 * Default priority levels.
 */
const PRIORITY_GENERIC = 0;
const PRIORITY_NATIVE = 100;
/**
 * Registry mapping ONNX opType strings to their compute implementations.
 * Supports priority-based registration: higher priority wins.
 * Multiple backends can register for the same op — highest priority is used.
 */
class OnnxOpRegistry {
    constructor() {
        this.entries = new Map();
    }
    /**
     * Register an op implementation.
     * @param opType   ONNX operator type (e.g. "Conv", "LSTM")
     * @param factory  Factory function
     * @param priority Higher priority wins (default: PRIORITY_GENERIC = 0)
     * @param backend  Label for the implementation source (e.g. "generic", "spikypanda")
     */
    register(opType, factory, priority = PRIORITY_GENERIC, backend = "generic") {
        let list = this.entries.get(opType);
        if (!list) {
            list = [];
            this.entries.set(opType, list);
        }
        list.push({ factory, priority, backend });
        list.sort((a, b) => b.priority - a.priority);
    }
    has(opType) {
        return this.entries.has(opType);
    }
    /**
     * Create a node using the highest-priority factory.
     */
    create(nodeInfo, initializers) {
        const list = this.entries.get(nodeInfo.opType);
        if (!list || list.length === 0) {
            throw new Error(`No ONNX op implementation for: ${nodeInfo.opType}`);
        }
        return list[0].factory(nodeInfo, initializers);
    }
    /**
     * Get info about the active (highest-priority) implementation for an op.
     */
    getActiveBackend(opType) {
        const list = this.entries.get(opType);
        return list && list.length > 0 ? list[0].backend : undefined;
    }
    /**
     * Get all registered backends for an op, sorted by priority (highest first).
     */
    getBackends(opType) {
        const list = this.entries.get(opType);
        return list ? list.map((e) => ({ backend: e.backend, priority: e.priority })) : [];
    }
    getRegistered() {
        return [...this.entries.keys()].sort();
    }
    /**
     * Summary: for each op, which backend is active.
     */
    summary() {
        const result = [];
        for (const [opType, list] of this.entries) {
            result.push({
                opType,
                backend: list[0].backend,
                priority: list[0].priority,
                alternatives: list.length - 1,
            });
        }
        return result.sort((a, b) => a.opType.localeCompare(b.opType));
    }
}
/**
 * Base class for ONNX op nodes. Provides attribute access helpers.
 */
class OnnxOpNode extends _compute_compute_node_base__WEBPACK_IMPORTED_MODULE_0__.ComputeNodeBase {
    constructor(nodeInfo) {
        super();
        this.opType = nodeInfo.opType;
        this.attributes = nodeInfo.attributes;
        this.tensorAttributes = nodeInfo.tensorAttributes ?? new Map();
    }
    get nodeType() {
        return `onnx_${this.opType.toLowerCase()}`;
    }
    attr(name, defaultVal) {
        return this.attributes.get(name) ?? defaultVal;
    }
    attrInt(name, defaultVal) {
        return Math.round(this.attributes.get(name) ?? defaultVal);
    }
    attrTensor(name) {
        return this.tensorAttributes.get(name);
    }
}
/**
 * Helper: get initializer as Float32Array, handling rawData conversion.
 */
function getInitializerData(init) {
    if (init.floatData && init.floatData.length > 0) {
        return init.floatData;
    }
    if (init.rawData && init.rawData.length > 0) {
        // Handle int64 raw data: convert 8-byte ints to float32
        if (init.dataType === _onnx_types__WEBPACK_IMPORTED_MODULE_1__.OnnxDataType.INT64) {
            const view = new DataView(init.rawData.buffer, init.rawData.byteOffset, init.rawData.byteLength);
            const count = init.rawData.byteLength / 8;
            const out = new Float32Array(count);
            for (let i = 0; i < count; i++) {
                // Read as int64 (low 32 bits sufficient for typical values)
                out[i] = Number(view.getBigInt64(i * 8, true));
            }
            return out;
        }
        return new Float32Array(init.rawData.buffer, init.rawData.byteOffset, init.rawData.byteLength / 4);
    }
    return new Float32Array(0);
}
/**
 * Helper: compute total element count from shape.
 */
function shapeSize(shape) {
    let s = 1;
    for (const d of shape)
        s *= d;
    return s;
}
/**
 * Helper: create an ITensor.
 */
function makeTensor(data, shape, name) {
    return { data, shape, name };
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ATT_FLOAT: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.ATT_FLOAT),
/* harmony export */   ATT_FLOATS: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.ATT_FLOATS),
/* harmony export */   ATT_INT: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.ATT_INT),
/* harmony export */   ATT_INTS: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.ATT_INTS),
/* harmony export */   ATT_NAME: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.ATT_NAME),
/* harmony export */   ATT_TENSOR: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.ATT_TENSOR),
/* harmony export */   CnnNode: () => (/* reexport safe */ _compute_index__WEBPACK_IMPORTED_MODULE_0__.CnnNode),
/* harmony export */   ComputeGraph: () => (/* reexport safe */ _compute_index__WEBPACK_IMPORTED_MODULE_0__.ComputeGraph),
/* harmony export */   ComputeNodeBase: () => (/* reexport safe */ _compute_index__WEBPACK_IMPORTED_MODULE_0__.ComputeNodeBase),
/* harmony export */   ConcatNode: () => (/* reexport safe */ _compute_index__WEBPACK_IMPORTED_MODULE_0__.ConcatNode),
/* harmony export */   DIM_SYMBOL: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.DIM_SYMBOL),
/* harmony export */   DIM_VALUE: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.DIM_VALUE),
/* harmony export */   DataLink: () => (/* reexport safe */ _compute_index__WEBPACK_IMPORTED_MODULE_0__.DataLink),
/* harmony export */   ExternalInputNode: () => (/* reexport safe */ _compute_index__WEBPACK_IMPORTED_MODULE_0__.ExternalInputNode),
/* harmony export */   GRAPH_DOC_STRING: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.GRAPH_DOC_STRING),
/* harmony export */   GRAPH_INITIALIZER: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.GRAPH_INITIALIZER),
/* harmony export */   GRAPH_INPUT: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.GRAPH_INPUT),
/* harmony export */   GRAPH_NAME: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.GRAPH_NAME),
/* harmony export */   GRAPH_NODE: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.GRAPH_NODE),
/* harmony export */   GRAPH_OUTPUT: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.GRAPH_OUTPUT),
/* harmony export */   GRAPH_VALUE_INFO: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.GRAPH_VALUE_INFO),
/* harmony export */   KEY_MAX_LENGTH: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.KEY_MAX_LENGTH),
/* harmony export */   LB_EOF: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.LB_EOF),
/* harmony export */   MLPNode: () => (/* reexport safe */ _compute_index__WEBPACK_IMPORTED_MODULE_0__.MLPNode),
/* harmony export */   MODEL_GRAPH: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.MODEL_GRAPH),
/* harmony export */   MODEL_IR_VERSION: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.MODEL_IR_VERSION),
/* harmony export */   MemoryStream: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.MemoryStream),
/* harmony export */   NODE_ATTRIBUTE: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.NODE_ATTRIBUTE),
/* harmony export */   NODE_INPUT: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.NODE_INPUT),
/* harmony export */   NODE_NAME: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.NODE_NAME),
/* harmony export */   NODE_OP_TYPE: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.NODE_OP_TYPE),
/* harmony export */   NODE_OUTPUT: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.NODE_OUTPUT),
/* harmony export */   ONNX_INVALID_INITIALIZER_SHAPE: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.ONNX_INVALID_INITIALIZER_SHAPE),
/* harmony export */   ONNX_READ_ERROR: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.ONNX_READ_ERROR),
/* harmony export */   ONNX_SUCCESS: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.ONNX_SUCCESS),
/* harmony export */   ONNX_SYSTEM_ERROR: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.ONNX_SYSTEM_ERROR),
/* harmony export */   ONNX_UNSUPPORTED_ATTRIBUTE: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.ONNX_UNSUPPORTED_ATTRIBUTE),
/* harmony export */   ONNX_UNSUPPORTED_NODE: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.ONNX_UNSUPPORTED_NODE),
/* harmony export */   ONNX_UNSUPPORTED_TENSOR_DATA_TYPE: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.ONNX_UNSUPPORTED_TENSOR_DATA_TYPE),
/* harmony export */   ONNX_UNSUPPORTED_TENSOR_DIM: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.ONNX_UNSUPPORTED_TENSOR_DIM),
/* harmony export */   OnnxDataType: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.OnnxDataType),
/* harmony export */   OnnxGraphBuilder: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.OnnxGraphBuilder),
/* harmony export */   OnnxLinkType: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.OnnxLinkType),
/* harmony export */   OnnxOpNode: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.OnnxOpNode),
/* harmony export */   OnnxOpRegistry: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.OnnxOpRegistry),
/* harmony export */   OnnxParser: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.OnnxParser),
/* harmony export */   OnnxWriter: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.OnnxWriter),
/* harmony export */   PBReader: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.PBReader),
/* harmony export */   PBSubReader: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.PBSubReader),
/* harmony export */   PBWriter: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.PBWriter),
/* harmony export */   PRIORITY_GENERIC: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.PRIORITY_GENERIC),
/* harmony export */   PRIORITY_NATIVE: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.PRIORITY_NATIVE),
/* harmony export */   RnnNode: () => (/* reexport safe */ _compute_index__WEBPACK_IMPORTED_MODULE_0__.RnnNode),
/* harmony export */   SHAPE_DIM: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.SHAPE_DIM),
/* harmony export */   SeekOrigin: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.SeekOrigin),
/* harmony export */   StreamView: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.StreamView),
/* harmony export */   TENSOR_DATA_TYPE: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.TENSOR_DATA_TYPE),
/* harmony export */   TENSOR_DIMS: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.TENSOR_DIMS),
/* harmony export */   TENSOR_DOUBLE_DATA: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.TENSOR_DOUBLE_DATA),
/* harmony export */   TENSOR_FLOAT_DATA: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.TENSOR_FLOAT_DATA),
/* harmony export */   TENSOR_INT32_DATA: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.TENSOR_INT32_DATA),
/* harmony export */   TENSOR_INT64_DATA: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.TENSOR_INT64_DATA),
/* harmony export */   TENSOR_MAX_DIMENSION: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.TENSOR_MAX_DIMENSION),
/* harmony export */   TENSOR_NAME: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.TENSOR_NAME),
/* harmony export */   TENSOR_RAW_DATA: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.TENSOR_RAW_DATA),
/* harmony export */   TENSOR_STRING_DATA: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.TENSOR_STRING_DATA),
/* harmony export */   TENSOR_TYPE_ELEM_TYPE: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.TENSOR_TYPE_ELEM_TYPE),
/* harmony export */   TENSOR_TYPE_SHAPE: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.TENSOR_TYPE_SHAPE),
/* harmony export */   TENSOR_UINT64_DATA: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.TENSOR_UINT64_DATA),
/* harmony export */   TYPE_TENSOR: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.TYPE_TENSOR),
/* harmony export */   VINFO_NAME: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.VINFO_NAME),
/* harmony export */   VINFO_TYPE: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.VINFO_TYPE),
/* harmony export */   WireType: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.WireType),
/* harmony export */   createDefaultRegistry: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.createDefaultRegistry),
/* harmony export */   createSpikyPandaRegistry: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.createSpikyPandaRegistry),
/* harmony export */   getInitializerData: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.getInitializerData),
/* harmony export */   makeTensor: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.makeTensor),
/* harmony export */   onnxDataTypeSize: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.onnxDataTypeSize),
/* harmony export */   registerActivationOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerActivationOps),
/* harmony export */   registerConvOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerConvOps),
/* harmony export */   registerDspOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerDspOps),
/* harmony export */   registerMathOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerMathOps),
/* harmony export */   registerMatrixOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerMatrixOps),
/* harmony export */   registerMiscOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerMiscOps),
/* harmony export */   registerNormOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerNormOps),
/* harmony export */   registerRecurrentOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerRecurrentOps),
/* harmony export */   registerSpikyPandaOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerSpikyPandaOps),
/* harmony export */   shapeSize: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.shapeSize)
/* harmony export */ });
/* harmony import */ var _compute_index__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./compute/index */ "./src/compute/index.ts");
/* harmony import */ var _onnx_index__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./onnx/index */ "./src/onnx/index.ts");
// ═══════════════════════════════════════════════════════════════════════════
// @spiky-panda/runtime
//
// ONNX-like compute graph runtime for SpikyPanda neural networks.
//
// Provides a typed DAG execution engine where:
//   - Nodes are processing stages (IComputeNode)
//   - Edges carry typed data tensors (IDataLink)
//   - The graph executes in topological order (Kahn's algorithm)
//
// Modules:
//   compute/  : ITensor, IComputeNode, ComputeGraph, built-in nodes
//   onnx/     : Protobuf reader, ONNX parser (zero-dependency)
// ═══════════════════════════════════════════════════════════════════════════



})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoRixNQUFNLEdBQUcsR0FBRyxJQUFJLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQzNDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDekIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUN6QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7d0JBQzVCLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDO3dCQUN2QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDOzRCQUN2QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQzs0QkFDMUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQ0FDcEIsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztnQ0FDdEMsS0FBSyxFQUFFLENBQUM7NEJBQ1osQ0FBQzt3QkFDTCxDQUFDO3dCQUNELEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLENB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QUFNLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBRS9DLGlEQUFpRDtRQUNqRCxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRCxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQy9ELE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7UUFFL0QsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDdEMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDdEMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0s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QztRQUN2QyxJQUFJLEdBQUcsR0FBRyxDQUFDO1lBQUUsR0FBRyxHQUFHLE9BQU8sR0FBRyxHQUFHLENBQUM7UUFDakMsSUFBSSxHQUFHLEdBQUcsT0FBTyxJQUFJLEdBQUcsR0FBRyxVQUFVO1lBQUUsR0FBRyxHQUFHLE9BQU8sQ0FBQztRQUNyRCxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUM5QyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUM5QyxNQUFNLFFBQVEsR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDO1FBRTdCLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN0Qyw2QkFBNkI7WUFDN0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzNDLE9BQU8sQ0FBQyxxREFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixNQUFNLEdBQUcsR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUM7UUFDOUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzVCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDaEMsR0FBRyxDQUFDLENBQUMsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM1RCxDQUFDO1FBQ0wsQ0FBQztRQUNELE9BQU8sQ0FBQyxxREFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztDQUNKO0FBRUQsK0VBQStFO0FBRXhFLFNBQVMsZUFBZSxDQUFDLFFBQXdCO0lBQ3BELFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RELFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RELFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RELFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3hELFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3hELFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzVELFFB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QUFDLE1BQU0sQ0FBQztRQUMxQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDMUQsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRSxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFL0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDakMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQztZQUMzQixJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7WUFDYixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRTtnQkFBRSxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDN0QsSUFBSSxJQUFJLFNBQVMsQ0FBQztZQUNsQixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7WUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNq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Q3JELENBQUM7SUFFRCxPQUFPLENBQUMsTUFBaUI7UUFDckIsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsd0RBQXdEO1FBQzdFLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QjtRQUM1QyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjO1FBQ25DLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVc7UUFFM0QsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQixNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQztRQUU3RCxJQUFJLENBQUMsR0FBRyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsR0FBRyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU1QixxRUFBcUU7UUFDckUsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNuQixNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ25CLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxD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QUFDSSxTQUFTLFNBQVMsQ0FBQyxLQUFlO0lBQ3JDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNWLEtBQUssTUFBTSxDQUFDLElBQUksS0FBSztRQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUIsT0FBTyxDQUFDLENBQUM7QUFDYixDQUFDO0FBRUQ7O0dBRUc7QUFDSSxTQUFTLFVBQVUsQ0FBQyxJQUFrQixFQUFFLEtBQWUsRUFBRSxJQUFhO0lBQ3pFLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDO0FBQ2pDLENBQUM7Ozs7Ozs7VUN6S0Q7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTs7VUFFQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTs7Ozs7V0N0QkE7V0FDQTtXQUNBO1dBQ0E7V0FDQSx5Q0FBeUMsd0NBQXdDO1dBQ2pGO1dBQ0E7V0FDQSxFOzs7OztXQ1BBLHdGOzs7OztXQ0FBO1dBQ0E7V0FDQTtXQUNBLHVEQUF1RCxpQkFBaUI7V0FDeEU7V0FDQSxnREFBZ0QsYUFBYTtXQUM3RCxFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDTkEsOEVBQThFO0FBQzlFLHVCQUF1QjtBQUN2QixFQUFFO0FBQ0Ysa0VBQWtFO0FBQ2xFLEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsaURBQWlEO0FBQ2pELGlEQUFpRDtBQUNqRCxpRUFBaUU7QUFDakUsRUFBRTtBQUNGLFdBQVc7QUFDWCxvRUFBb0U7QUFDcEUsK0RBQStEO0FBQy9ELDhFQUE4RTtBQUU5QztBQUNIIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvd2VicGFjay91bml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4uLy4uLy4uL25vZGVfbW9kdWxlcy90c2xpYi90c2xpYi5lczYubWpzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4uL2NvcmUvc3JjL2dlb21ldHJ5L2dlb21ldHJ5LmludGVyZmFjZXMudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi4vY29yZS9zcmMvZ3JhcGgvZ3JhcGguZ3JhcGgudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi4vY29yZS9zcmMvZ3JhcGgvZ3JhcGguZ3JhcGhJdGVtLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4uL2NvcmUvc3JjL2dyYXBoL2dyYXBoLmludGVyZmFjZXMudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi4vY29yZS9zcmMvZ3JhcGgvZ3JhcGgubm9kZS50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uLi9jb3JlL3NyYy9ncmFwaC9ncmFwaC5vbGluay50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9jb21wdXRlL2NvbXB1dGUuZ3JhcGgudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvY29tcHV0ZS9jb21wdXRlLm5vZGUuYmFzZS50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9jb21wdXRlL2luZGV4LnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL2NvbXB1dGUvbm9kZXMvY25uLm5vZGUudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvY29tcHV0ZS9ub2Rlcy9jb25jYXQubm9kZS50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9jb21wdXRlL25vZGVzL2V4dGVybmFsLWlucHV0Lm5vZGUudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvY29tcHV0ZS9ub2Rlcy9pbmRleC50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9jb21wdXRlL25vZGVzL21scC5ub2RlLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL2NvbXB1dGUvbm9kZXMvcm5uLm5vZGUudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvb25ueC9ncmFwaC1idWlsZGVyLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvaW5kZXgudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvb25ueC9vbm54LXBhcnNlci50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L29ubngtdHlwZXMudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvb25ueC9vbm54LXdyaXRlci50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L29wcy9hY3RpdmF0aW9ucy50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L29wcy9jb252LnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvb3BzL2RzcC50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L29wcy9pbmRleC50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L29wcy9tYXRoLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvb3BzL21hdHJpeC50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L29wcy9taXNjLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvb3BzL25vcm1hbGl6YXRpb24udHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvb25ueC9vcHMvcmVjdXJyZW50LnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvb3BzL3NwaWt5cGFuZGEudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvb25ueC9wYi9pbmRleC50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L3BiL3JlYWRlci50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L3BiL3N0cmVhbS50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L3BiL3dyaXRlci50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L3JlZ2lzdHJ5LnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIHdlYnBhY2tVbml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uKHJvb3QsIGZhY3RvcnkpIHtcblx0aWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnKVxuXHRcdG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuXHRlbHNlIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcblx0XHRkZWZpbmUoW10sIGZhY3RvcnkpO1xuXHRlbHNlIGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jylcblx0XHRleHBvcnRzW1wiU3Bpa3lwYW5kYVJ1bnRpbWVcIl0gPSBmYWN0b3J5KCk7XG5cdGVsc2Vcblx0XHRyb290W1wiU3Bpa3lwYW5kYVJ1bnRpbWVcIl0gPSBmYWN0b3J5KCk7XG59KShnbG9iYWxUaGlzLCAoKSA9PiB7XG5yZXR1cm4gIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uXG5cblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxucHVycG9zZSB3aXRoIG9yIHdpdGhvdXQgZmVlIGlzIGhlcmVieSBncmFudGVkLlxuXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXG5SRUdBUkQgVE8gVEhJUyBTT0ZUV0FSRSBJTkNMVURJTkcgQUxMIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFlcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxuTE9TUyBPRiBVU0UsIERBVEEgT1IgUFJPRklUUywgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIE5FR0xJR0VOQ0UgT1Jcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqL1xuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UsIFN1cHByZXNzZWRFcnJvciwgU3ltYm9sLCBJdGVyYXRvciAqL1xuXG52YXIgZXh0ZW5kU3RhdGljcyA9IGZ1bmN0aW9uKGQsIGIpIHtcbiAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxuICAgICAgKHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXkgJiYgZnVuY3Rpb24gKGQsIGIpIHsgZC5fX3Byb3RvX18gPSBiOyB9KSB8fFxuICAgICAgZnVuY3Rpb24gKGQsIGIpIHsgZm9yICh2YXIgcCBpbiBiKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGIsIHApKSBkW3BdID0gYltwXTsgfTtcbiAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcbiAgaWYgKHR5cGVvZiBiICE9PSBcImZ1bmN0aW9uXCIgJiYgYiAhPT0gbnVsbClcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDbGFzcyBleHRlbmRzIHZhbHVlIFwiICsgU3RyaW5nKGIpICsgXCIgaXMgbm90IGEgY29uc3RydWN0b3Igb3IgbnVsbFwiKTtcbiAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcbiAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn1cblxuZXhwb3J0IHZhciBfX2Fzc2lnbiA9IGZ1bmN0aW9uKCkge1xuICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xuICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgcyA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHQ7XG4gIH1cbiAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3Jlc3QocywgZSkge1xuICB2YXIgdCA9IHt9O1xuICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcbiAgICAgIHRbcF0gPSBzW3BdO1xuICBpZiAocyAhPSBudWxsICYmIHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGUuaW5kZXhPZihwW2ldKSA8IDAgJiYgT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKHMsIHBbaV0pKVxuICAgICAgICAgICAgICB0W3BbaV1dID0gc1twW2ldXTtcbiAgICAgIH1cbiAgcmV0dXJuIHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2RlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XG4gIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XG4gIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XG4gIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XG4gIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3BhcmFtKHBhcmFtSW5kZXgsIGRlY29yYXRvcikge1xuICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fZXNEZWNvcmF0ZShjdG9yLCBkZXNjcmlwdG9ySW4sIGRlY29yYXRvcnMsIGNvbnRleHRJbiwgaW5pdGlhbGl6ZXJzLCBleHRyYUluaXRpYWxpemVycykge1xuICBmdW5jdGlvbiBhY2NlcHQoZikgeyBpZiAoZiAhPT0gdm9pZCAwICYmIHR5cGVvZiBmICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJGdW5jdGlvbiBleHBlY3RlZFwiKTsgcmV0dXJuIGY7IH1cbiAgdmFyIGtpbmQgPSBjb250ZXh0SW4ua2luZCwga2V5ID0ga2luZCA9PT0gXCJnZXR0ZXJcIiA/IFwiZ2V0XCIgOiBraW5kID09PSBcInNldHRlclwiID8gXCJzZXRcIiA6IFwidmFsdWVcIjtcbiAgdmFyIHRhcmdldCA9ICFkZXNjcmlwdG9ySW4gJiYgY3RvciA/IGNvbnRleHRJbltcInN0YXRpY1wiXSA/IGN0b3IgOiBjdG9yLnByb3RvdHlwZSA6IG51bGw7XG4gIHZhciBkZXNjcmlwdG9yID0gZGVzY3JpcHRvckluIHx8ICh0YXJnZXQgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgY29udGV4dEluLm5hbWUpIDoge30pO1xuICB2YXIgXywgZG9uZSA9IGZhbHNlO1xuICBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIGNvbnRleHQgPSB7fTtcbiAgICAgIGZvciAodmFyIHAgaW4gY29udGV4dEluKSBjb250ZXh0W3BdID0gcCA9PT0gXCJhY2Nlc3NcIiA/IHt9IDogY29udGV4dEluW3BdO1xuICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4uYWNjZXNzKSBjb250ZXh0LmFjY2Vzc1twXSA9IGNvbnRleHRJbi5hY2Nlc3NbcF07XG4gICAgICBjb250ZXh0LmFkZEluaXRpYWxpemVyID0gZnVuY3Rpb24gKGYpIHsgaWYgKGRvbmUpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgYWRkIGluaXRpYWxpemVycyBhZnRlciBkZWNvcmF0aW9uIGhhcyBjb21wbGV0ZWRcIik7IGV4dHJhSW5pdGlhbGl6ZXJzLnB1c2goYWNjZXB0KGYgfHwgbnVsbCkpOyB9O1xuICAgICAgdmFyIHJlc3VsdCA9ICgwLCBkZWNvcmF0b3JzW2ldKShraW5kID09PSBcImFjY2Vzc29yXCIgPyB7IGdldDogZGVzY3JpcHRvci5nZXQsIHNldDogZGVzY3JpcHRvci5zZXQgfSA6IGRlc2NyaXB0b3Jba2V5XSwgY29udGV4dCk7XG4gICAgICBpZiAoa2luZCA9PT0gXCJhY2Nlc3NvclwiKSB7XG4gICAgICAgICAgaWYgKHJlc3VsdCA9PT0gdm9pZCAwKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAocmVzdWx0ID09PSBudWxsIHx8IHR5cGVvZiByZXN1bHQgIT09IFwib2JqZWN0XCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3QgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmdldCkpIGRlc2NyaXB0b3IuZ2V0ID0gXztcbiAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuc2V0KSkgZGVzY3JpcHRvci5zZXQgPSBfO1xuICAgICAgICAgIGlmIChfID0gYWNjZXB0KHJlc3VsdC5pbml0KSkgaW5pdGlhbGl6ZXJzLnVuc2hpZnQoXyk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChfID0gYWNjZXB0KHJlc3VsdCkpIHtcbiAgICAgICAgICBpZiAoa2luZCA9PT0gXCJmaWVsZFwiKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcbiAgICAgICAgICBlbHNlIGRlc2NyaXB0b3Jba2V5XSA9IF87XG4gICAgICB9XG4gIH1cbiAgaWYgKHRhcmdldCkgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgY29udGV4dEluLm5hbWUsIGRlc2NyaXB0b3IpO1xuICBkb25lID0gdHJ1ZTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3J1bkluaXRpYWxpemVycyh0aGlzQXJnLCBpbml0aWFsaXplcnMsIHZhbHVlKSB7XG4gIHZhciB1c2VWYWx1ZSA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGluaXRpYWxpemVycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWUgPSB1c2VWYWx1ZSA/IGluaXRpYWxpemVyc1tpXS5jYWxsKHRoaXNBcmcsIHZhbHVlKSA6IGluaXRpYWxpemVyc1tpXS5jYWxsKHRoaXNBcmcpO1xuICB9XG4gIHJldHVybiB1c2VWYWx1ZSA/IHZhbHVlIDogdm9pZCAwO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9fcHJvcEtleSh4KSB7XG4gIHJldHVybiB0eXBlb2YgeCA9PT0gXCJzeW1ib2xcIiA/IHggOiBcIlwiLmNvbmNhdCh4KTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3NldEZ1bmN0aW9uTmFtZShmLCBuYW1lLCBwcmVmaXgpIHtcbiAgaWYgKHR5cGVvZiBuYW1lID09PSBcInN5bWJvbFwiKSBuYW1lID0gbmFtZS5kZXNjcmlwdGlvbiA/IFwiW1wiLmNvbmNhdChuYW1lLmRlc2NyaXB0aW9uLCBcIl1cIikgOiBcIlwiO1xuICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KGYsIFwibmFtZVwiLCB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IHByZWZpeCA/IFwiXCIuY29uY2F0KHByZWZpeCwgXCIgXCIsIG5hbWUpIDogbmFtZSB9KTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX21ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKSB7XG4gIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2dlbmVyYXRvcih0aGlzQXJnLCBib2R5KSB7XG4gIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGcgPSBPYmplY3QuY3JlYXRlKCh0eXBlb2YgSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEl0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpO1xuICByZXR1cm4gZy5uZXh0ID0gdmVyYigwKSwgZ1tcInRocm93XCJdID0gdmVyYigxKSwgZ1tcInJldHVyblwiXSA9IHZlcmIoMiksIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiAoZ1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSwgZztcbiAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XG4gIGZ1bmN0aW9uIHN0ZXAob3ApIHtcbiAgICAgIGlmIChmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtcbiAgICAgIHdoaWxlIChnICYmIChnID0gMCwgb3BbMF0gJiYgKF8gPSAwKSksIF8pIHRyeSB7XG4gICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xuICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcbiAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XG4gICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xuICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XG4gICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxuICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XG4gICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XG4gICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgfVxufVxuXG5leHBvcnQgdmFyIF9fY3JlYXRlQmluZGluZyA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG0sIGspO1xuICBpZiAoIWRlc2MgfHwgKFwiZ2V0XCIgaW4gZGVzYyA/ICFtLl9fZXNNb2R1bGUgOiBkZXNjLndyaXRhYmxlIHx8IGRlc2MuY29uZmlndXJhYmxlKSkge1xuICAgICAgZGVzYyA9IHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfTtcbiAgfVxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgb1trMl0gPSBtW2tdO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2V4cG9ydFN0YXIobSwgbykge1xuICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSBfX2NyZWF0ZUJpbmRpbmcobywgbSwgcCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XG4gIHZhciBzID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIFN5bWJvbC5pdGVyYXRvciwgbSA9IHMgJiYgb1tzXSwgaSA9IDA7XG4gIGlmIChtKSByZXR1cm4gbS5jYWxsKG8pO1xuICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XG4gICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKG8gJiYgaSA+PSBvLmxlbmd0aCkgbyA9IHZvaWQgMDtcbiAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XG4gICAgICB9XG4gIH07XG4gIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XG4gIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcbiAgaWYgKCFtKSByZXR1cm4gbztcbiAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XG4gIHRyeSB7XG4gICAgICB3aGlsZSAoKG4gPT09IHZvaWQgMCB8fCBuLS0gPiAwKSAmJiAhKHIgPSBpLm5leHQoKSkuZG9uZSkgYXIucHVzaChyLnZhbHVlKTtcbiAgfVxuICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cbiAgZmluYWxseSB7XG4gICAgICB0cnkge1xuICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xuICAgICAgfVxuICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XG4gIH1cbiAgcmV0dXJuIGFyO1xufVxuXG4vKiogQGRlcHJlY2F0ZWQgKi9cbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcbiAgZm9yICh2YXIgYXIgPSBbXSwgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXG4gICAgICBhciA9IGFyLmNvbmNhdChfX3JlYWQoYXJndW1lbnRzW2ldKSk7XG4gIHJldHVybiBhcjtcbn1cblxuLyoqIEBkZXByZWNhdGVkICovXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheXMoKSB7XG4gIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xuICBmb3IgKHZhciByID0gQXJyYXkocyksIGsgPSAwLCBpID0gMDsgaSA8IGlsOyBpKyspXG4gICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcbiAgICAgICAgICByW2tdID0gYVtqXTtcbiAgcmV0dXJuIHI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5KHRvLCBmcm9tLCBwYWNrKSB7XG4gIGlmIChwYWNrIHx8IGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIGZvciAodmFyIGkgPSAwLCBsID0gZnJvbS5sZW5ndGgsIGFyOyBpIDwgbDsgaSsrKSB7XG4gICAgICBpZiAoYXIgfHwgIShpIGluIGZyb20pKSB7XG4gICAgICAgICAgaWYgKCFhcikgYXIgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmcm9tLCAwLCBpKTtcbiAgICAgICAgICBhcltpXSA9IGZyb21baV07XG4gICAgICB9XG4gIH1cbiAgcmV0dXJuIHRvLmNvbmNhdChhciB8fCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmcm9tKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0KHYpIHtcbiAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xuICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xuICB2YXIgZyA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSwgaSwgcSA9IFtdO1xuICByZXR1cm4gaSA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBBc3luY0l0ZXJhdG9yID09PSBcImZ1bmN0aW9uXCIgPyBBc3luY0l0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpLCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIsIGF3YWl0UmV0dXJuKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xuICBmdW5jdGlvbiBhd2FpdFJldHVybihmKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHYpLnRoZW4oZiwgcmVqZWN0KTsgfTsgfVxuICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaWYgKGdbbl0pIHsgaVtuXSA9IGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAoYSwgYikgeyBxLnB1c2goW24sIHYsIGEsIGJdKSA+IDEgfHwgcmVzdW1lKG4sIHYpOyB9KTsgfTsgaWYgKGYpIGlbbl0gPSBmKGlbbl0pOyB9IH1cbiAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxuICBmdW5jdGlvbiBzdGVwKHIpIHsgci52YWx1ZSBpbnN0YW5jZW9mIF9fYXdhaXQgPyBQcm9taXNlLnJlc29sdmUoci52YWx1ZS52KS50aGVuKGZ1bGZpbGwsIHJlamVjdCkgOiBzZXR0bGUocVswXVsyXSwgcik7IH1cbiAgZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkgeyByZXN1bWUoXCJuZXh0XCIsIHZhbHVlKTsgfVxuICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XG4gIGZ1bmN0aW9uIHNldHRsZShmLCB2KSB7IGlmIChmKHYpLCBxLnNoaWZ0KCksIHEubGVuZ3RoKSByZXN1bWUocVswXVswXSwgcVswXVsxXSk7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNEZWxlZ2F0b3Iobykge1xuICB2YXIgaSwgcDtcbiAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcbiAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlbbl0gPSBvW25dID8gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIChwID0gIXApID8geyB2YWx1ZTogX19hd2FpdChvW25dKHYpKSwgZG9uZTogZmFsc2UgfSA6IGYgPyBmKHYpIDogdjsgfSA6IGY7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNWYWx1ZXMobykge1xuICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xuICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xuICByZXR1cm4gbSA/IG0uY2FsbChvKSA6IChvID0gdHlwZW9mIF9fdmFsdWVzID09PSBcImZ1bmN0aW9uXCIgPyBfX3ZhbHVlcyhvKSA6IG9bU3ltYm9sLml0ZXJhdG9yXSgpLCBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaSk7XG4gIGZ1bmN0aW9uIHZlcmIobikgeyBpW25dID0gb1tuXSAmJiBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyB2ID0gb1tuXSh2KSwgc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgdi5kb25lLCB2LnZhbHVlKTsgfSk7IH07IH1cbiAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcbiAgaWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29va2VkLCBcInJhd1wiLCB7IHZhbHVlOiByYXcgfSk7IH0gZWxzZSB7IGNvb2tlZC5yYXcgPSByYXc7IH1cbiAgcmV0dXJuIGNvb2tlZDtcbn07XG5cbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xufSkgOiBmdW5jdGlvbihvLCB2KSB7XG4gIG9bXCJkZWZhdWx0XCJdID0gdjtcbn07XG5cbnZhciBvd25LZXlzID0gZnVuY3Rpb24obykge1xuICBvd25LZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgfHwgZnVuY3Rpb24gKG8pIHtcbiAgICB2YXIgYXIgPSBbXTtcbiAgICBmb3IgKHZhciBrIGluIG8pIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgaykpIGFyW2FyLmxlbmd0aF0gPSBrO1xuICAgIHJldHVybiBhcjtcbiAgfTtcbiAgcmV0dXJuIG93bktleXMobyk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnRTdGFyKG1vZCkge1xuICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xuICB2YXIgcmVzdWx0ID0ge307XG4gIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayA9IG93bktleXMobW9kKSwgaSA9IDA7IGkgPCBrLmxlbmd0aDsgaSsrKSBpZiAoa1tpXSAhPT0gXCJkZWZhdWx0XCIpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwga1tpXSk7XG4gIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XG4gIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgZGVmYXVsdDogbW9kIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0KHJlY2VpdmVyLCBzdGF0ZSwga2luZCwgZikge1xuICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBnZXR0ZXJcIik7XG4gIGlmICh0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyICE9PSBzdGF0ZSB8fCAhZiA6ICFzdGF0ZS5oYXMocmVjZWl2ZXIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHJlYWQgcHJpdmF0ZSBtZW1iZXIgZnJvbSBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xuICByZXR1cm4ga2luZCA9PT0gXCJtXCIgPyBmIDoga2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIpIDogZiA/IGYudmFsdWUgOiBzdGF0ZS5nZXQocmVjZWl2ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZFNldChyZWNlaXZlciwgc3RhdGUsIHZhbHVlLCBraW5kLCBmKSB7XG4gIGlmIChraW5kID09PSBcIm1cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgbWV0aG9kIGlzIG5vdCB3cml0YWJsZVwiKTtcbiAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgc2V0dGVyXCIpO1xuICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB3cml0ZSBwcml2YXRlIG1lbWJlciB0byBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xuICByZXR1cm4gKGtpbmQgPT09IFwiYVwiID8gZi5jYWxsKHJlY2VpdmVyLCB2YWx1ZSkgOiBmID8gZi52YWx1ZSA9IHZhbHVlIDogc3RhdGUuc2V0KHJlY2VpdmVyLCB2YWx1ZSkpLCB2YWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRJbihzdGF0ZSwgcmVjZWl2ZXIpIHtcbiAgaWYgKHJlY2VpdmVyID09PSBudWxsIHx8ICh0eXBlb2YgcmVjZWl2ZXIgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHJlY2VpdmVyICE9PSBcImZ1bmN0aW9uXCIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHVzZSAnaW4nIG9wZXJhdG9yIG9uIG5vbi1vYmplY3RcIik7XG4gIHJldHVybiB0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyID09PSBzdGF0ZSA6IHN0YXRlLmhhcyhyZWNlaXZlcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZShlbnYsIHZhbHVlLCBhc3luYykge1xuICBpZiAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHZvaWQgMCkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3QgZXhwZWN0ZWQuXCIpO1xuICAgIHZhciBkaXNwb3NlLCBpbm5lcjtcbiAgICBpZiAoYXN5bmMpIHtcbiAgICAgIGlmICghU3ltYm9sLmFzeW5jRGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0Rpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xuICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5hc3luY0Rpc3Bvc2VdO1xuICAgIH1cbiAgICBpZiAoZGlzcG9zZSA9PT0gdm9pZCAwKSB7XG4gICAgICBpZiAoIVN5bWJvbC5kaXNwb3NlKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmRpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xuICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5kaXNwb3NlXTtcbiAgICAgIGlmIChhc3luYykgaW5uZXIgPSBkaXNwb3NlO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGRpc3Bvc2UgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBub3QgZGlzcG9zYWJsZS5cIik7XG4gICAgaWYgKGlubmVyKSBkaXNwb3NlID0gZnVuY3Rpb24oKSB7IHRyeSB7IGlubmVyLmNhbGwodGhpcyk7IH0gY2F0Y2ggKGUpIHsgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpOyB9IH07XG4gICAgZW52LnN0YWNrLnB1c2goeyB2YWx1ZTogdmFsdWUsIGRpc3Bvc2U6IGRpc3Bvc2UsIGFzeW5jOiBhc3luYyB9KTtcbiAgfVxuICBlbHNlIGlmIChhc3luYykge1xuICAgIGVudi5zdGFjay5wdXNoKHsgYXN5bmM6IHRydWUgfSk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG52YXIgX1N1cHByZXNzZWRFcnJvciA9IHR5cGVvZiBTdXBwcmVzc2VkRXJyb3IgPT09IFwiZnVuY3Rpb25cIiA/IFN1cHByZXNzZWRFcnJvciA6IGZ1bmN0aW9uIChlcnJvciwgc3VwcHJlc3NlZCwgbWVzc2FnZSkge1xuICB2YXIgZSA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgcmV0dXJuIGUubmFtZSA9IFwiU3VwcHJlc3NlZEVycm9yXCIsIGUuZXJyb3IgPSBlcnJvciwgZS5zdXBwcmVzc2VkID0gc3VwcHJlc3NlZCwgZTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2Rpc3Bvc2VSZXNvdXJjZXMoZW52KSB7XG4gIGZ1bmN0aW9uIGZhaWwoZSkge1xuICAgIGVudi5lcnJvciA9IGVudi5oYXNFcnJvciA/IG5ldyBfU3VwcHJlc3NlZEVycm9yKGUsIGVudi5lcnJvciwgXCJBbiBlcnJvciB3YXMgc3VwcHJlc3NlZCBkdXJpbmcgZGlzcG9zYWwuXCIpIDogZTtcbiAgICBlbnYuaGFzRXJyb3IgPSB0cnVlO1xuICB9XG4gIHZhciByLCBzID0gMDtcbiAgZnVuY3Rpb24gbmV4dCgpIHtcbiAgICB3aGlsZSAociA9IGVudi5zdGFjay5wb3AoKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKCFyLmFzeW5jICYmIHMgPT09IDEpIHJldHVybiBzID0gMCwgZW52LnN0YWNrLnB1c2gociksIFByb21pc2UucmVzb2x2ZSgpLnRoZW4obmV4dCk7XG4gICAgICAgIGlmIChyLmRpc3Bvc2UpIHtcbiAgICAgICAgICB2YXIgcmVzdWx0ID0gci5kaXNwb3NlLmNhbGwoci52YWx1ZSk7XG4gICAgICAgICAgaWYgKHIuYXN5bmMpIHJldHVybiBzIHw9IDIsIFByb21pc2UucmVzb2x2ZShyZXN1bHQpLnRoZW4obmV4dCwgZnVuY3Rpb24oZSkgeyBmYWlsKGUpOyByZXR1cm4gbmV4dCgpOyB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHMgfD0gMTtcbiAgICAgIH1cbiAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGZhaWwoZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChzID09PSAxKSByZXR1cm4gZW52Lmhhc0Vycm9yID8gUHJvbWlzZS5yZWplY3QoZW52LmVycm9yKSA6IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIGlmIChlbnYuaGFzRXJyb3IpIHRocm93IGVudi5lcnJvcjtcbiAgfVxuICByZXR1cm4gbmV4dCgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb24ocGF0aCwgcHJlc2VydmVKc3gpIHtcbiAgaWYgKHR5cGVvZiBwYXRoID09PSBcInN0cmluZ1wiICYmIC9eXFwuXFwuP1xcLy8udGVzdChwYXRoKSkge1xuICAgICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFwuKHRzeCkkfCgoPzpcXC5kKT8pKCg/OlxcLlteLi9dKz8pPylcXC4oW2NtXT8pdHMkL2ksIGZ1bmN0aW9uIChtLCB0c3gsIGQsIGV4dCwgY20pIHtcbiAgICAgICAgICByZXR1cm4gdHN4ID8gcHJlc2VydmVKc3ggPyBcIi5qc3hcIiA6IFwiLmpzXCIgOiBkICYmICghZXh0IHx8ICFjbSkgPyBtIDogKGQgKyBleHQgKyBcIi5cIiArIGNtLnRvTG93ZXJDYXNlKCkgKyBcImpzXCIpO1xuICAgICAgfSk7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgX19leHRlbmRzLFxuICBfX2Fzc2lnbixcbiAgX19yZXN0LFxuICBfX2RlY29yYXRlLFxuICBfX3BhcmFtLFxuICBfX2VzRGVjb3JhdGUsXG4gIF9fcnVuSW5pdGlhbGl6ZXJzLFxuICBfX3Byb3BLZXksXG4gIF9fc2V0RnVuY3Rpb25OYW1lLFxuICBfX21ldGFkYXRhLFxuICBfX2F3YWl0ZXIsXG4gIF9fZ2VuZXJhdG9yLFxuICBfX2NyZWF0ZUJpbmRpbmcsXG4gIF9fZXhwb3J0U3RhcixcbiAgX192YWx1ZXMsXG4gIF9fcmVhZCxcbiAgX19zcHJlYWQsXG4gIF9fc3ByZWFkQXJyYXlzLFxuICBfX3NwcmVhZEFycmF5LFxuICBfX2F3YWl0LFxuICBfX2FzeW5jR2VuZXJhdG9yLFxuICBfX2FzeW5jRGVsZWdhdG9yLFxuICBfX2FzeW5jVmFsdWVzLFxuICBfX21ha2VUZW1wbGF0ZU9iamVjdCxcbiAgX19pbXBvcnRTdGFyLFxuICBfX2ltcG9ydERlZmF1bHQsXG4gIF9fY2xhc3NQcml2YXRlRmllbGRHZXQsXG4gIF9fY2xhc3NQcml2YXRlRmllbGRTZXQsXG4gIF9fY2xhc3NQcml2YXRlRmllbGRJbixcbiAgX19hZGREaXNwb3NhYmxlUmVzb3VyY2UsXG4gIF9fZGlzcG9zZVJlc291cmNlcyxcbiAgX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb24sXG59O1xuIiwiZXhwb3J0IGludGVyZmFjZSBJQ2FydGVzaWFuIHtcclxuICAgIC8qKiBFdWNsaWRlYW4gZGlzdGFuY2UgdG8gYW5vdGhlciBwb2ludC4gKi9cclxuICAgIGRpc3RhbmNlKGI6IElDYXJ0ZXNpYW4pOiBudW1iZXI7XHJcbiAgICAvKiogU3F1YXJlZCBldWNsaWRlYW4gZGlzdGFuY2UgKGF2b2lkcyBzcXJ0KS4gUHJlZmVycmVkIGZvciBjb21wYXJpc29uLW9ubHkgdXNlIGNhc2VzLiAqL1xyXG4gICAgZGlzdGFuY2VTcXVhcmVkKGI6IElDYXJ0ZXNpYW4pOiBudW1iZXI7XHJcbiAgICBzdWJ0cmFjdChiOiBJQ2FydGVzaWFuKTogdGhpcztcclxuICAgIGFkZChiOiBJQ2FydGVzaWFuKTogdGhpcztcclxuICAgIGFkZEluUGxhY2UoYjogSUNhcnRlc2lhbik6IHRoaXM7XHJcbiAgICBtdWx0aXBseUJ5U2NhbGFyKG46IG51bWJlcik6IHRoaXM7XHJcbiAgICBkaXZpZGVCeVNjYWxhcihuOiBudW1iZXIpOiB0aGlzO1xyXG4gICAgbWFnbml0dWRlKCk6IG51bWJlcjtcclxuICAgIHRvU3RyaW5nKCk6IHN0cmluZztcclxuICAgIGNsb25lKCk6IHRoaXM7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUNhcnRlc2lhbjIgZXh0ZW5kcyBJQ2FydGVzaWFuIHtcclxuICAgIHg6IG51bWJlcjtcclxuICAgIHk6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJQ2FydGVzaWFuMyBleHRlbmRzIElDYXJ0ZXNpYW4yIHtcclxuICAgIHo6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJQ2FydGVzaWFuNCBleHRlbmRzIElDYXJ0ZXNpYW4zIHtcclxuICAgIHc6IG51bWJlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFR5cGUgZ3VhcmQgZm9yIElDYXJ0ZXNpYW4gKElDYXJ0ZXNpYW4yIHwgSUNhcnRlc2lhbjMgfCBJQ2FydGVzaWFuNClcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc0NhcnRlc2lhbihvYmo6IHVua25vd24pOiBvYmogaXMgSUNhcnRlc2lhbiB7XHJcbiAgICByZXR1cm4gaXNDYXJ0ZXNpYW4yKG9iaikgfHwgaXNDYXJ0ZXNpYW4zKG9iaikgfHwgaXNDYXJ0ZXNpYW40KG9iaik7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUeXBlIGd1YXJkIGZvciBJQ2FydGVzaWFuMlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzQ2FydGVzaWFuMihiOiB1bmtub3duKTogYiBpcyBJQ2FydGVzaWFuMiB8IElDYXJ0ZXNpYW4zIHwgSUNhcnRlc2lhbjQge1xyXG4gICAgaWYgKHR5cGVvZiBiICE9PSBcIm9iamVjdFwiIHx8IGIgPT09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgIHJldHVybiBcInhcIiBpbiBiICYmIFwieVwiIGluIGI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUeXBlIGd1YXJkIGZvciBJQ2FydGVzaWFuM1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzQ2FydGVzaWFuMyhiOiB1bmtub3duKTogYiBpcyBJQ2FydGVzaWFuMyB8IElDYXJ0ZXNpYW40IHtcclxuICAgIGlmICghaXNDYXJ0ZXNpYW4yKGIpKSByZXR1cm4gZmFsc2U7XHJcbiAgICByZXR1cm4gXCJ6XCIgaW4gYjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFR5cGUgZ3VhcmQgZm9yIElDYXJ0ZXNpYW40XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNDYXJ0ZXNpYW40KGI6IHVua25vd24pOiBiIGlzIElDYXJ0ZXNpYW40IHtcclxuICAgIGlmICghaXNDYXJ0ZXNpYW4zKGIpKSByZXR1cm4gZmFsc2U7XHJcbiAgICByZXR1cm4gXCJ3XCIgaW4gYjtcclxufVxyXG4iLCJpbXBvcnQgeyBJQ2FydGVzaWFuIH0gZnJvbSBcIi4uL2dlb21ldHJ5XCI7XHJcbmltcG9ydCB7IE51bGxhYmxlIH0gZnJvbSBcIi4uL3R5cGVzXCI7XHJcbmltcG9ydCB7IElHcmFwaCwgSU5vZGUsIElPbGluayB9IGZyb20gXCIuL2dyYXBoLmludGVyZmFjZXNcIjtcclxuaW1wb3J0IHsgR3JhcGhOb2RlIH0gZnJvbSBcIi4vZ3JhcGgubm9kZVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEdyYXBoPE4gZXh0ZW5kcyBJTm9kZSwgTCBleHRlbmRzIElPbGluaz4gZXh0ZW5kcyBHcmFwaE5vZGUgaW1wbGVtZW50cyBJR3JhcGg8TiwgTD4ge1xyXG4gICAgcHVibGljIG5vZGVzOiBOW107XHJcbiAgICBwdWJsaWMgbGlua3M6IExbXTtcclxuICAgIHB1YmxpYyBpbnB1dHM6IE5bXTtcclxuICAgIHB1YmxpYyBvdXRwdXRzOiBOW107XHJcbiAgICBwdWJsaWMgaGlkZGVuczogTltdO1xyXG5cclxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihcclxuICAgICAgICBub2RlczogTltdID0gW10sXHJcbiAgICAgICAgbGlua3M6IExbXSA9IFtdLFxyXG4gICAgICAgIGlucHV0czogTnVsbGFibGU8TltdPiA9IG51bGwsXHJcbiAgICAgICAgb3V0cHV0czogTnVsbGFibGU8TltdPiA9IG51bGwsXHJcbiAgICAgICAgaGlkZGVuczogTnVsbGFibGU8TltdPiA9IG51bGwsXHJcbiAgICAgICAgb25zYzogTnVsbGFibGU8TFtdPiA9IG51bGwsXHJcbiAgICAgICAgb3BzYzogTnVsbGFibGU8TFtdPiA9IG51bGwsXHJcbiAgICAgICAgcG9zaXRpb24/OiBJQ2FydGVzaWFuXHJcbiAgICApIHtcclxuICAgICAgICBzdXBlcihvbnNjLCBvcHNjLCBwb3NpdGlvbik7IC8vIFBhc3MgYHBvc2l0aW9uYCB0byBgR3JhcGhOb2RlYFxyXG4gICAgICAgIHRoaXMubm9kZXMgPSBub2RlcztcclxuICAgICAgICB0aGlzLmxpbmtzID0gbGlua3M7XHJcbiAgICAgICAgdGhpcy5pbnB1dHMgPSBpbnB1dHMgPz8gdGhpcy5ub2Rlcy5maWx0ZXIoKG4pID0+IG4ub3BzYygpLmxlbmd0aCA9PT0gMCk7XHJcbiAgICAgICAgdGhpcy5vdXRwdXRzID0gb3V0cHV0cyA/PyB0aGlzLm5vZGVzLmZpbHRlcigobikgPT4gbi5vbnNjKCkubGVuZ3RoID09PSAwKTtcclxuICAgICAgICB0aGlzLmhpZGRlbnMgPSBoaWRkZW5zID8/IHRoaXMubm9kZXMuZmlsdGVyKChuKSA9PiAhdGhpcy5pbnB1dHMuaW5jbHVkZXMobikgJiYgIXRoaXMub3V0cHV0cy5pbmNsdWRlcyhuKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGNsb25lKCk6IGFueSB7XHJcbiAgICAgICAgdmFyIGNvcHkgPSBzdXBlci5jbG9uZSgpO1xyXG4gICAgICAgIGNvcHkubm9kZXMgPSB0aGlzLm5vZGVzLm1hcCgobikgPT4gbi5jbG9uZSgpKTtcclxuICAgICAgICBjb3B5LmxpbmtzID0gdGhpcy5saW5rcy5tYXAoKGwpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgY2xvbmVkID0gbC5jbG9uZSgpO1xyXG4gICAgICAgICAgICBjbG9uZWQub2luaSA9IGNvcHkubm9kZXNbdGhpcy5ub2Rlcy5pbmRleE9mKDxOPmwub2luaSldOyAvLyB0aGUgdW5kZXJseWluZyBzZXR0ZXIgaXMgdGFraW5nIGNhcmUgb2YgdW5iaW5kL2JpbmQgdGhlIGxpbmsgZnJvbS90byBub2RlXHJcbiAgICAgICAgICAgIGNsb25lZC5vZmluID0gY29weS5ub2Rlc1t0aGlzLm5vZGVzLmluZGV4T2YoPE4+bC5vZmluKV07IC8vIC4uLlxyXG4gICAgICAgICAgICByZXR1cm4gY2xvbmVkO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb3B5LmlucHV0cyA9IGNvcHkubm9kZXMuZmlsdGVyKChuKSA9PiBuLm9wc2MoKS5sZW5ndGggPT09IDApO1xyXG4gICAgICAgIGNvcHkub3V0cHV0cyA9IGNvcHkubm9kZXMuZmlsdGVyKChuKSA9PiBuLm9uc2MoKS5sZW5ndGggPT09IDApO1xyXG4gICAgICAgIGNvcHkuaGlkZGVucyA9IGNvcHkubm9kZXMuZmlsdGVyKChuKSA9PiAhY29weS5pbnB1dHMuaW5jbHVkZXMobikgJiYgIWNvcHkub3V0cHV0cy5pbmNsdWRlcyhuKSk7XHJcbiAgICAgICAgcmV0dXJuIGNvcHk7XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHsgQ2xvbmVNZXRhZGF0YUtleSwgSUdyYXBoSXRlbSwgSXNDbG9uZWFibGUsIElUYWdnYWJsZSB9IGZyb20gXCIuL2dyYXBoLmludGVyZmFjZXNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBHcmFwaEl0ZW0gaW1wbGVtZW50cyBJR3JhcGhJdGVtIHtcclxuICAgIHByaXZhdGUgX2lkPzphbnk7XHJcbiAgICBwcml2YXRlIF90YWc/OiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIF9iYWc/OiB1bmtub3duO1xyXG5cclxuICAgIHB1YmxpYyBnZXQgdGFnKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RhZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGlkKCkgOiBhbnkgfCB1bmRlZmluZWR7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lkO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgaWQodjphbnkpIHtcclxuICAgICAgICB0aGlzLl9pZCA9IHY7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBiYWcoKSA6IHVua25vd24gfCB1bmRlZmluZWR7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JhZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGJhZyh2OnVua25vd24pIHtcclxuICAgICAgICB0aGlzLl9iYWcgPSB2O1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyB3aXRoVGFnKHRhZzogc3RyaW5nKTogSVRhZ2dhYmxlIHtcclxuICAgICAgICB0aGlzLl90YWcgPSB0YWc7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGRpc3Bvc2UoKTogdm9pZCB7XHJcbiAgICAgICAgLy8gRGlzcG9zZSBsb2dpYyBpZiBuZWVkZWRcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgY2xvbmUoKTogdGhpcyB7XHJcbiAgICAgICAgY29uc3QgY3RvciA9IHRoaXMuY29uc3RydWN0b3IgYXMgbmV3ICgpID0+IHRoaXM7XHJcbiAgICAgICAgY29uc3QgY2xvbmUgPSBuZXcgY3RvcigpO1xyXG4gICAgICAgIGNvbnN0IHByb3BzID0gUmVmbGVjdC5nZXRNZXRhZGF0YShDbG9uZU1ldGFkYXRhS2V5LCB0aGlzKSB8fCBbXTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgcHJvcHMpIHtcclxuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAodGhpcyBhcyBhbnkpW2tleV07XHJcbiAgICAgICAgICAgIChjbG9uZSBhcyBhbnkpW2tleV0gPSBJc0Nsb25lYWJsZSh2YWx1ZSkgPyB2YWx1ZS5jbG9uZSgpIDogc3RydWN0dXJlZENsb25lKHZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjbG9uZTtcclxuICAgIH1cclxufVxyXG4iLCJpbXBvcnQgeyBJQ2FydGVzaWFuLCBpc0NhcnRlc2lhbiB9IGZyb20gXCIuLi9nZW9tZXRyeS9nZW9tZXRyeS5pbnRlcmZhY2VzXCI7XHJcbmltcG9ydCB7IE51bGxhYmxlIH0gZnJvbSBcIi4uL3R5cGVzXCI7XHJcblxyXG5leHBvcnQgY29uc3QgQ2xvbmVNZXRhZGF0YUtleSA9IFN5bWJvbChcImNsb25lYWJsZVwiKTtcclxuXHJcbi8vLyA8c3VtbWFyeT5cclxuLy8vIE1hcmtzIGEgcHJvcGVydHkgYXMgY2xvbmVhYmxlIGZvciBhdXRvbWF0aWMgZGVlcCBjb3B5aW5nXHJcbi8vLyA8L3N1bW1hcnk+XHJcbmV4cG9ydCBmdW5jdGlvbiBjbG9uZWFibGUodGFyZ2V0OiBvYmplY3QsIHByb3BlcnR5S2V5OiBzdHJpbmcgfCBzeW1ib2wpOiB2b2lkIHtcclxuICAgIGNvbnN0IHByb3RvID0gdGFyZ2V0LmNvbnN0cnVjdG9yLnByb3RvdHlwZTtcclxuICAgIGNvbnN0IGV4aXN0aW5nUHJvcHM6IHN0cmluZ1tdID0gUmVmbGVjdC5nZXRNZXRhZGF0YShDbG9uZU1ldGFkYXRhS2V5LCBwcm90bykgfHwgW107XHJcbiAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKENsb25lTWV0YWRhdGFLZXksIFsuLi5leGlzdGluZ1Byb3BzLCBwcm9wZXJ0eUtleV0sIHByb3RvKTtcclxufVxyXG5cclxuLy8vIDxzdW1tYXJ5PlxyXG4vLy8gSW50ZXJmYWNlIGZvciBjbG9uZWFibGUgb2JqZWN0c1xyXG4vLy8gPC9zdW1tYXJ5PlxyXG5leHBvcnQgaW50ZXJmYWNlIElDbG9uZWFibGU8VCA9IGFueT4ge1xyXG4gICAgY2xvbmUoKTogVDtcclxufVxyXG5cclxuLy8vIDxzdW1tYXJ5PlxyXG4vLy8gVHlwZSBndWFyZCB0byBjaGVjayBpZiBhbiBvYmplY3QgaW1wbGVtZW50cyBJQ2xvbmVhYmxlXHJcbi8vLyA8L3N1bW1hcnk+XHJcbmV4cG9ydCBmdW5jdGlvbiBJc0Nsb25lYWJsZTxUPihvYmo6IGFueSk6IG9iaiBpcyBJQ2xvbmVhYmxlPFQ+IHtcclxuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiICYmIG9iaiAhPT0gbnVsbCAmJiB0eXBlb2Ygb2JqLmNsb25lID09PSBcImZ1bmN0aW9uXCI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSURpc3Bvc2FibGUge1xyXG4gICAgZGlzcG9zZSgpOiB2b2lkO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElUYWdnYWJsZSB7XHJcbiAgICB3aXRoVGFnKHRhZzogc3RyaW5nKTogSVRhZ2dhYmxlO1xyXG4gICAgdGFnPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElJRGVudGlmaWFibGUge1xyXG4gICAgaWQ/OiBhbnk7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUhhc0JhZyB7XHJcbiAgICAvKipcclxuICAgICAqIFJ1bnRpbWUtb25seSBjb250YWluZXIgZm9yIGV4ZWN1dGlvbiBjb250ZXh0LlxyXG4gICAgICogQ2FuIGJlIHNhZmVseSBvdmVyd3JpdHRlbiBiZXR3ZWVuIHJ1bnMuXHJcbiAgICAgKi9cclxuICAgIGJhZz86IHVua25vd247XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUdyYXBoSXRlbSBleHRlbmRzIElEaXNwb3NhYmxlLCBJQ2xvbmVhYmxlLCBJVGFnZ2FibGUsIElJRGVudGlmaWFibGUsIElIYXNCYWcge31cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSU5vZGUgZXh0ZW5kcyBJR3JhcGhJdGVtIHtcclxuICAgIHBvc2l0aW9uPzogSUNhcnRlc2lhbjtcclxuICAgIG9uc2M8TCBleHRlbmRzIElPbGluaz4oKTogQXJyYXk8TD47XHJcbiAgICBvcHNjPEwgZXh0ZW5kcyBJT2xpbms+KCk6IEFycmF5PEw+O1xyXG59XHJcblxyXG4vLyB3ZSBkZWZpbmUgdGhlIElOb2RlU2V0IGFuZCBJTGlua1NldCBpbnRlcmZhY2VzIHRvIGJlIGFibGUgdG8gdXNlIHRoZW0gdG8gZ3JvdXAgbm9kZXMgYW5kIGxpbmtzXHJcbi8vIHRoaXMgaXMgcGFydGljdWxhcmx5IHVzZWZ1bCB3aGVuIHdlIHdhbnQgdG8gcGVyZm9ybSBvcGVyYXRpb25zIG9uIGEgZ3JvdXAgc3VjaCBMYXllcnMgaW4gTmV1cmFsIE5ldHdvcmtzXHJcbi8vIG9yIGF0dGFjaCBzcGVjaWZpYyBwcm9wZXJ0aWVzIHRvIGEgZ3JvdXAgb2Ygbm9kZXMgb3IgbGlua3MuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSU5vZGVTZXQ8TiBleHRlbmRzIElOb2RlPiBleHRlbmRzIEFycmF5PE4+IHt9XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElPbGluayBleHRlbmRzIElHcmFwaEl0ZW0ge1xyXG4gICAgb2luaTogTnVsbGFibGU8SU5vZGU+O1xyXG4gICAgb2ZpbjogTnVsbGFibGU8SU5vZGU+O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElMaW5rU2V0PEwgZXh0ZW5kcyBJT2xpbms+IGV4dGVuZHMgQXJyYXk8TD4ge31cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUdyYXBoPE4gZXh0ZW5kcyBJTm9kZSwgTCBleHRlbmRzIElPbGluaz4gZXh0ZW5kcyBJTm9kZSB7XHJcbiAgICBub2RlczogSU5vZGVTZXQ8Tj47XHJcbiAgICBsaW5rczogSUxpbmtTZXQ8TD47XHJcbiAgICBpbnB1dHM6IElOb2RlU2V0PE4+O1xyXG4gICAgb3V0cHV0czogSU5vZGVTZXQ8Tj47XHJcbiAgICBoaWRkZW5zOiBJTm9kZVNldDxOPjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFR5cGUgZ3VhcmQgZm9yIElOb2RlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlPE4gZXh0ZW5kcyBJTm9kZT4ob2JqOiB1bmtub3duKTogb2JqIGlzIE4ge1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgICB0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiICYmXHJcbiAgICAgICAgb2JqICE9PSBudWxsICYmXHJcbiAgICAgICAgKFwicG9zaXRpb25cIiBpbiBvYmogPyBvYmoucG9zaXRpb24gPT09IHVuZGVmaW5lZCB8fCBpc0NhcnRlc2lhbihvYmoucG9zaXRpb24pIDogdHJ1ZSkgJiYgLy8gRW5zdXJlIHBvc2l0aW9uIGlzIHVuZGVmaW5lZCBvciBJQ2FydGVzaWFuM1xyXG4gICAgICAgIFwib25zY1wiIGluIG9iaiAmJlxyXG4gICAgICAgIFwib3BzY1wiIGluIG9ialxyXG4gICAgKTtcclxufVxyXG4vKipcclxuICogVHlwZSBndWFyZCBmb3IgSU9saW5rXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNPbGluazxMIGV4dGVuZHMgSU9saW5rPihvYmo6IHVua25vd24pOiBvYmogaXMgTCB7XHJcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIiAmJiBvYmogIT09IG51bGwgJiYgXCJvaW5pXCIgaW4gb2JqICYmIFwib2ZpblwiIGluIG9iaiAmJiBpc05vZGUoKG9iaiBhcyBJT2xpbmspLm9pbmkpICYmIGlzTm9kZSgob2JqIGFzIElPbGluaykub2Zpbik7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUeXBlIGd1YXJkIGZvciBJR3JhcGhcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc0dyYXBoPE4gZXh0ZW5kcyBJTm9kZSwgTCBleHRlbmRzIElPbGluaz4ob2JqOiB1bmtub3duKTogb2JqIGlzIElHcmFwaDxOLCBMPiB7XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIGlzTm9kZShvYmopICYmXHJcbiAgICAgICAgXCJub2Rlc1wiIGluIG9iaiAmJlxyXG4gICAgICAgIFwibGlua3NcIiBpbiBvYmogJiZcclxuICAgICAgICBcImlucHV0c1wiIGluIG9iaiAmJlxyXG4gICAgICAgIFwib3V0cHV0c1wiIGluIG9iaiAmJlxyXG4gICAgICAgIEFycmF5LmlzQXJyYXkoKG9iaiBhcyBJR3JhcGg8TiwgTD4pLm5vZGVzKSAmJlxyXG4gICAgICAgIEFycmF5LmlzQXJyYXkoKG9iaiBhcyBJR3JhcGg8TiwgTD4pLmxpbmtzKSAmJlxyXG4gICAgICAgIEFycmF5LmlzQXJyYXkoKG9iaiBhcyBJR3JhcGg8TiwgTD4pLmlucHV0cykgJiZcclxuICAgICAgICBBcnJheS5pc0FycmF5KChvYmogYXMgSUdyYXBoPE4sIEw+KS5vdXRwdXRzKSAmJlxyXG4gICAgICAgIChvYmogYXMgSUdyYXBoPE4sIEw+KS5ub2Rlcy5ldmVyeShpc05vZGUpICYmXHJcbiAgICAgICAgKG9iaiBhcyBJR3JhcGg8TiwgTD4pLmxpbmtzLmV2ZXJ5KGlzT2xpbmspICYmXHJcbiAgICAgICAgKG9iaiBhcyBJR3JhcGg8TiwgTD4pLmlucHV0cy5ldmVyeShpc05vZGUpICYmXHJcbiAgICAgICAgKG9iaiBhcyBJR3JhcGg8TiwgTD4pLm91dHB1dHMuZXZlcnkoaXNOb2RlKVxyXG4gICAgKTtcclxufVxyXG4iLCJpbXBvcnQgdHlwZSB7IElDYXJ0ZXNpYW4gfSBmcm9tIFwiLi4vZ2VvbWV0cnlcIjtcclxuaW1wb3J0IHsgTnVsbGFibGUgfSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgR3JhcGhJdGVtIH0gZnJvbSBcIi4vZ3JhcGguZ3JhcGhJdGVtXCI7XHJcbmltcG9ydCB7IGNsb25lYWJsZSwgSU5vZGUsIElPbGluayB9IGZyb20gXCIuL2dyYXBoLmludGVyZmFjZXNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBHcmFwaE5vZGUgZXh0ZW5kcyBHcmFwaEl0ZW0gaW1wbGVtZW50cyBJTm9kZSB7XHJcbiAgICBwcm90ZWN0ZWQgX29uc2M6IElPbGlua1tdO1xyXG4gICAgcHJvdGVjdGVkIF9vcHNjOiBJT2xpbmtbXTtcclxuXHJcbiAgICBAY2xvbmVhYmxlIHB1YmxpYyBwb3NpdGlvbj86IElDYXJ0ZXNpYW47IFxyXG5cclxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihvbnNjOiBOdWxsYWJsZTxJT2xpbmtbXT4gPSBudWxsLCBvcHNjOiBOdWxsYWJsZTxJT2xpbmtbXT4gPSBudWxsLCBwb3NpdGlvbj86IElDYXJ0ZXNpYW4pIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuX29uc2MgPSBvbnNjID8/IFtdO1xyXG4gICAgICAgIHRoaXMuX29wc2MgPSBvcHNjID8/IFtdO1xyXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBwb3NpdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgb25zYzxMIGV4dGVuZHMgSU9saW5rPigpOiBBcnJheTxMPiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX29uc2MgYXMgQXJyYXk8TD47XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIG9wc2M8TCBleHRlbmRzIElPbGluaz4oKTogQXJyYXk8TD4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9vcHNjIGFzIEFycmF5PEw+O1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCB7IE51bGxhYmxlIH0gZnJvbSBcIi4uL3R5cGVzXCI7XHJcbmltcG9ydCB7IEdyYXBoSXRlbSB9IGZyb20gXCIuL2dyYXBoLmdyYXBoSXRlbVwiO1xyXG5pbXBvcnQgeyBJTm9kZSwgSU9saW5rIH0gZnJvbSBcIi4vZ3JhcGguaW50ZXJmYWNlc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEdyYXBoT0xpbmsgZXh0ZW5kcyBHcmFwaEl0ZW0gaW1wbGVtZW50cyBJT2xpbmsge1xyXG4gICAgcHJpdmF0ZSBfb2luaTogTnVsbGFibGU8SU5vZGU+O1xyXG4gICAgcHVibGljIF9vZmluOiBOdWxsYWJsZTxJTm9kZT47XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKG9pbmk/OiBJTm9kZSwgb2Zpbj86IElOb2RlKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLl9vaW5pID0gb2luaSA/PyBudWxsO1xyXG4gICAgICAgIGlmICh0aGlzLl9vaW5pKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX29pbmkub25zYygpLnB1c2godGhpcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX29maW4gPSBvZmluID8/IG51bGw7XHJcbiAgICAgICAgaWYgKHRoaXMuX29maW4pIHtcclxuICAgICAgICAgICAgdGhpcy5fb2Zpbi5vcHNjKCkucHVzaCh0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBvaW5pKCk6IE51bGxhYmxlPElOb2RlPiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX29pbmk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBvaW5pKG46IE51bGxhYmxlPElOb2RlPikge1xyXG4gICAgICAgIGlmICh0aGlzLl9vaW5pICE9PSBuKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9vaW5pKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhID0gdGhpcy5fb2luaS5vbnNjKCk7XHJcbiAgICAgICAgICAgICAgICBhLnNwbGljZShhLmluZGV4T2YodGhpcykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuX29pbmkgPSBuO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fb2luaSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fb2luaS5vbnNjKCkucHVzaCh0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IG9maW4oKTogTnVsbGFibGU8SU5vZGU+IHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fb2ZpbjtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IG9maW4objogTnVsbGFibGU8SU5vZGU+KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX29maW4gIT09IG4pIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX29maW4pIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGEgPSB0aGlzLl9vZmluLm9wc2MoKTtcclxuICAgICAgICAgICAgICAgIGEuc3BsaWNlKGEuaW5kZXhPZih0aGlzKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5fb2ZpbiA9IG47XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9vZmluKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9vZmluLm9wc2MoKS5wdXNoKHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBkaXNwb3NlKCk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLl9vaW5pKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRtcCA9IHRoaXMuX29pbmkub25zYygpO1xyXG4gICAgICAgICAgICB0bXAuc3BsaWNlKHRtcC5pbmRleE9mKHRoaXMpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuX29maW4pIHtcclxuICAgICAgICAgICAgY29uc3QgdG1wID0gdGhpcy5fb2Zpbi5vcHNjKCk7XHJcbiAgICAgICAgICAgIHRtcC5zcGxpY2UodG1wLmluZGV4T2YodGhpcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzdXBlci5kaXNwb3NlKCk7XHJcbiAgICB9XHJcbn1cclxuIiwiLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcbi8vIENvbXB1dGVHcmFwaCA6IGV4ZWN1dGVzIGEgREFHIG9mIGNvbXB1dGUgbm9kZXMgaW4gdG9wb2xvZ2ljYWwgb3JkZXJcclxuLy9cclxuLy8gRWFjaCBjYWxsIHRvIHJ1bigpOlxyXG4vLyAxLiBJbmplY3QgZXh0ZXJuYWwgaW5wdXRzIGludG8gc291cmNlIG5vZGVzXHJcbi8vIDIuIFdhbGsgbm9kZXMgaW4gdG9wb2xvZ2ljYWwgb3JkZXJcclxuLy8gMy4gRm9yIGVhY2ggbm9kZTogZ2F0aGVyIGlucHV0IHRlbnNvcnMgZnJvbSBpbmNvbWluZyBJRGF0YUxpbmtzLFxyXG4vLyAgICBjYWxsIGV4ZWN1dGUoKSwgd3JpdGUgb3V0cHV0IHRlbnNvcnMgdG8gb3V0Z29pbmcgSURhdGFMaW5rc1xyXG4vLyA0LiBDb2xsZWN0IG91dHB1dCB0ZW5zb3JzIGZyb20gc2luayBub2Rlc1xyXG4vL1xyXG4vLyBUaGUgdG9wb2xvZ2ljYWwgb3JkZXIgaXMgY29tcHV0ZWQgb25jZSBhdCBjb25zdHJ1Y3Rpb24gKG9yIHdoZW4gdGhlXHJcbi8vIGdyYXBoIGNoYW5nZXMpIGFuZCBjYWNoZWQgZm9yIGZhc3QgcGVyLWZyYW1lIGV4ZWN1dGlvbi5cclxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcblxyXG5pbXBvcnQgeyBHcmFwaCwgR3JhcGhPTGluayB9IGZyb20gXCJzcGlreXBhbmRhLWNvcmVcIjtcclxuaW1wb3J0IHtcclxuICAgIElDb21wdXRlR3JhcGgsXHJcbiAgICBJQ29tcHV0ZU5vZGUsXHJcbiAgICBJQ29tcHV0ZU5vZGVCYWcsXHJcbiAgICBJRGF0YUxpbmssXHJcbiAgICBJVGVuc29yLFxyXG59IGZyb20gXCIuL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xyXG5cclxuLy8g4pSA4pSA4pSAIERhdGFMaW5rIGltcGxlbWVudGF0aW9uIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuLyoqXHJcbiAqIENvbmNyZXRlIGRhdGEgbGluazogYSBkaXJlY3RlZCBlZGdlIGNhcnJ5aW5nIGEgdGVuc29yLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIERhdGFMaW5rIGV4dGVuZHMgR3JhcGhPTGluayBpbXBsZW1lbnRzIElEYXRhTGluayB7XHJcbiAgICBwdWJsaWMgdGVuc29yOiBJVGVuc29yIHwgbnVsbCA9IG51bGw7XHJcbiAgICBwdWJsaWMgaW5wdXRJbmRleDogbnVtYmVyO1xyXG5cclxuICAgIHB1YmxpYyBjb25zdHJ1Y3Rvcihmcm9tPzogSUNvbXB1dGVOb2RlLCB0bz86IElDb21wdXRlTm9kZSwgaW5wdXRJbmRleCA9IC0xKSB7XHJcbiAgICAgICAgc3VwZXIoZnJvbSwgdG8pO1xyXG4gICAgICAgIHRoaXMuaW5wdXRJbmRleCA9IGlucHV0SW5kZXg7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIOKUgOKUgOKUgCBDb21wdXRlR3JhcGggaW1wbGVtZW50YXRpb24g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4vKipcclxuICogRXhlY3V0YWJsZSBjb21wdXRlIGdyYXBoLlxyXG4gKlxyXG4gKiBFeHRlbmRzIGBHcmFwaDxJQ29tcHV0ZU5vZGUsIElEYXRhTGluaz5gIGZyb20gQHNwaWt5LXBhbmRhL2NvcmUsXHJcbiAqIGFkZGluZyB0b3BvbG9naWNhbCBzb3J0IGFuZCB0aGUgYHJ1bigpYCBleGVjdXRpb24gbWV0aG9kLlxyXG4gKlxyXG4gKiAqKlVzYWdlOioqXHJcbiAqIGBgYHR5cGVzY3JpcHRcclxuICogY29uc3QgZ3JhcGggPSBuZXcgQ29tcHV0ZUdyYXBoKG5vZGVzLCBsaW5rcyk7XHJcbiAqIGNvbnN0IHJlc3VsdCA9IGdyYXBoLnJ1bihuZXcgTWFwKFtbXCJwb3NlXCIsIHBvc2VUZW5zb3JdXSkpO1xyXG4gKiBjb25zdCBjb21tYW5kID0gcmVzdWx0LmdldChcImNvbW1hbmRcIik7XHJcbiAqIGBgYFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENvbXB1dGVHcmFwaCBleHRlbmRzIEdyYXBoPElDb21wdXRlTm9kZSwgSURhdGFMaW5rPiBpbXBsZW1lbnRzIElDb21wdXRlR3JhcGgge1xyXG4gICAgcHJpdmF0ZSBfc29ydGVkTm9kZXM6IElDb21wdXRlTm9kZVtdIHwgbnVsbCA9IG51bGw7XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKG5vZGVzOiBJQ29tcHV0ZU5vZGVbXSwgbGlua3M6IElEYXRhTGlua1tdKSB7XHJcbiAgICAgICAgc3VwZXIobm9kZXMsIGxpbmtzKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEV4ZWN1dGUgdGhlIGZ1bGwgZ3JhcGggaW4gdG9wb2xvZ2ljYWwgb3JkZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIGV4dGVybmFsSW5wdXRzICBOYW1lZCB0ZW5zb3JzIGluamVjdGVkIGludG8gc291cmNlIG5vZGVzXHJcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAobWF0Y2hlZCBieSBub2RlIElEIG9yIG5hbWUgdGFnKS5cclxuICAgICAqIEByZXR1cm5zICAgICAgICAgICAgICAgIE5hbWVkIHRlbnNvcnMgZnJvbSBvdXRwdXQgbm9kZXMuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBydW4oZXh0ZXJuYWxJbnB1dHM/OiBNYXA8c3RyaW5nLCBJVGVuc29yPik6IE1hcDxzdHJpbmcsIElUZW5zb3I+IHtcclxuICAgICAgICBjb25zdCBzb3J0ZWQgPSB0aGlzLl9nZXRUb3BvbG9naWNhbE9yZGVyKCk7XHJcblxyXG4gICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBzb3J0ZWQpIHtcclxuICAgICAgICAgICAgY29uc3QgaW5wdXRzID0gdGhpcy5fZ2F0aGVySW5wdXRzKG5vZGUsIGV4dGVybmFsSW5wdXRzKTtcclxuICAgICAgICAgICAgY29uc3Qgb3V0cHV0cyA9IG5vZGUuZXhlY3V0ZShpbnB1dHMpO1xyXG4gICAgICAgICAgICB0aGlzLl9kaXN0cmlidXRlT3V0cHV0cyhub2RlLCBvdXRwdXRzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb2xsZWN0UmVzdWx0cygpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRXhlY3V0ZSB0aGUgZnVsbCBncmFwaCBhc3luY2hyb25vdXNseSBpbiB0b3BvbG9naWNhbCBvcmRlci5cclxuICAgICAqXHJcbiAgICAgKiBGb3IgZWFjaCBub2RlLCB1c2VzIGBleGVjdXRlQXN5bmMoKWAgaWYgdGhlIG5vZGUgcHJvdmlkZXMgaXQsXHJcbiAgICAgKiBvdGhlcndpc2UgZmFsbHMgYmFjayB0byBzeW5jaHJvbm91cyBgZXhlY3V0ZSgpYC5cclxuICAgICAqIE5vZGVzIGFyZSBhd2FpdGVkIHNlcXVlbnRpYWxseSAodG9wb2xvZ2ljYWwgb3JkZXIgbXVzdCBiZSByZXNwZWN0ZWQpLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSBleHRlcm5hbElucHV0cyAgTmFtZWQgdGVuc29ycyBpbmplY3RlZCBpbnRvIHNvdXJjZSBub2Rlcy5cclxuICAgICAqIEByZXR1cm5zICAgICAgICAgICAgICAgIFByb21pc2UgcmVzb2x2aW5nIHRvIG5hbWVkIHRlbnNvcnMgZnJvbSBvdXRwdXQgbm9kZXMuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBhc3luYyBydW5Bc3luYyhleHRlcm5hbElucHV0cz86IE1hcDxzdHJpbmcsIElUZW5zb3I+KTogUHJvbWlzZTxNYXA8c3RyaW5nLCBJVGVuc29yPj4ge1xyXG4gICAgICAgIGNvbnN0IHNvcnRlZCA9IHRoaXMuX2dldFRvcG9sb2dpY2FsT3JkZXIoKTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIHNvcnRlZCkge1xyXG4gICAgICAgICAgICBjb25zdCBpbnB1dHMgPSB0aGlzLl9nYXRoZXJJbnB1dHMobm9kZSwgZXh0ZXJuYWxJbnB1dHMpO1xyXG5cclxuICAgICAgICAgICAgLy8gUHJlZmVyIGV4ZWN1dGVBc3luYyB3aGVuIGF2YWlsYWJsZSwgZmFsbGJhY2sgdG8gc3luYyBleGVjdXRlXHJcbiAgICAgICAgICAgIGNvbnN0IG91dHB1dHMgPSBub2RlLmV4ZWN1dGVBc3luY1xyXG4gICAgICAgICAgICAgICAgPyBhd2FpdCBub2RlLmV4ZWN1dGVBc3luYyhpbnB1dHMpXHJcbiAgICAgICAgICAgICAgICA6IG5vZGUuZXhlY3V0ZShpbnB1dHMpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5fZGlzdHJpYnV0ZU91dHB1dHMobm9kZSwgb3V0cHV0cyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5fY29sbGVjdFJlc3VsdHMoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEludmFsaWRhdGUgdGhlIGNhY2hlZCB0b3BvbG9naWNhbCBvcmRlci5cclxuICAgICAqIENhbGwgYWZ0ZXIgYWRkaW5nL3JlbW92aW5nIG5vZGVzIG9yIGxpbmtzLlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgaW52YWxpZGF0ZU9yZGVyKCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMuX3NvcnRlZE5vZGVzID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgSW50ZXJuYWwgaGVscGVycyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdhdGhlciBpbnB1dCB0ZW5zb3JzIGZvciBhIG5vZGUgZnJvbSBpbmNvbWluZyBsaW5rcyBvciBleHRlcm5hbCBpbnB1dHMuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgX2dhdGhlcklucHV0cyhub2RlOiBJQ29tcHV0ZU5vZGUsIGV4dGVybmFsSW5wdXRzPzogTWFwPHN0cmluZywgSVRlbnNvcj4pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGluY29taW5nTGlua3MgPSBub2RlLm9wc2M8SURhdGFMaW5rPigpO1xyXG4gICAgICAgIGNvbnN0IGlucHV0czogSVRlbnNvcltdID0gW107XHJcblxyXG4gICAgICAgIGlmIChpbmNvbWluZ0xpbmtzLmxlbmd0aCA9PT0gMCAmJiBleHRlcm5hbElucHV0cykge1xyXG4gICAgICAgICAgICAvLyBTb3VyY2Ugbm9kZTogY2hlY2sgZm9yIGV4dGVybmFsIGlucHV0IGJ5IElEIG9yIHRhZ1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSAobm9kZS5pZCBhcyBzdHJpbmcpID8/IG5vZGUudGFnO1xyXG4gICAgICAgICAgICBpZiAoa2V5KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBleHQgPSBleHRlcm5hbElucHV0cy5nZXQoa2V5KTtcclxuICAgICAgICAgICAgICAgIGlmIChleHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dHMucHVzaChleHQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gVHJhbnNmb3JtIG5vZGU6IHJlYWQgdGVuc29ycyBmcm9tIGluY29taW5nIGRhdGEgbGlua3NcclxuICAgICAgICAgICAgLy8gU29ydCBieSBpbnB1dEluZGV4IHdoZW4gc2V0IChPTk5YIGdyYXBoIGJ1aWxkZXIgdGFncyBsaW5rcylcclxuICAgICAgICAgICAgY29uc3QgaGFzSW5kZXggPSBpbmNvbWluZ0xpbmtzLnNvbWUoKGwpID0+IGwuaW5wdXRJbmRleCA+PSAwKTtcclxuICAgICAgICAgICAgY29uc3Qgb3JkZXJlZCA9IGhhc0luZGV4XHJcbiAgICAgICAgICAgICAgICA/IFsuLi5pbmNvbWluZ0xpbmtzXS5zb3J0KChhLCBiKSA9PiBhLmlucHV0SW5kZXggLSBiLmlucHV0SW5kZXgpXHJcbiAgICAgICAgICAgICAgICA6IGluY29taW5nTGlua3M7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgbGluayBvZiBvcmRlcmVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobGluay50ZW5zb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dHMucHVzaChsaW5rLnRlbnNvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpbnB1dHM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWNoZSBvdXRwdXRzIGluIHRoZSBub2RlJ3MgYmFnIGFuZCB3cml0ZSB0aGVtIHRvIG91dGdvaW5nIGRhdGEgbGlua3MuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgX2Rpc3RyaWJ1dGVPdXRwdXRzKG5vZGU6IElDb21wdXRlTm9kZSwgb3V0cHV0czogSVRlbnNvcltdKTogdm9pZCB7XHJcbiAgICAgICAgLy8gQ2FjaGUgb3V0cHV0cyBpbiB0aGUgbm9kZSdzIGJhZ1xyXG4gICAgICAgIGNvbnN0IGJhZyA9IChub2RlLmJhZyA/PyB7fSkgYXMgSUNvbXB1dGVOb2RlQmFnO1xyXG4gICAgICAgIGJhZy5sYXN0T3V0cHV0cyA9IG91dHB1dHM7XHJcbiAgICAgICAgbm9kZS5iYWcgPSBiYWc7XHJcblxyXG4gICAgICAgIC8vIFdyaXRlIG91dHB1dHMgdG8gb3V0Z29pbmcgZGF0YSBsaW5rc1xyXG4gICAgICAgIGNvbnN0IG91dGdvaW5nTGlua3MgPSBub2RlLm9uc2M8SURhdGFMaW5rPigpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0Z29pbmdMaW5rcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAvLyBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgb3V0cHV0cywgZGlzdHJpYnV0ZSB0aGVtOyBvdGhlcndpc2UgYnJvYWRjYXN0XHJcbiAgICAgICAgICAgIG91dGdvaW5nTGlua3NbaV0udGVuc29yID0gb3V0cHV0cy5sZW5ndGggPiAxID8gKG91dHB1dHNbaV0gPz8gb3V0cHV0c1swXSkgOiAob3V0cHV0c1swXSA/PyBudWxsKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDb2xsZWN0IG91dHB1dCB0ZW5zb3JzIGZyb20gc2luayBub2RlcyAobm9kZXMgd2l0aCBubyBzdWNjZXNzb3JzKS5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBfY29sbGVjdFJlc3VsdHMoKTogTWFwPHN0cmluZywgSVRlbnNvcj4ge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCBJVGVuc29yPigpO1xyXG4gICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiB0aGlzLm91dHB1dHMpIHtcclxuICAgICAgICAgICAgY29uc3QgYmFnID0gbm9kZS5iYWcgYXMgSUNvbXB1dGVOb2RlQmFnIHwgdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICBpZiAoYmFnPy5sYXN0T3V0cHV0cykge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gKG5vZGUuaWQgYXMgc3RyaW5nKSA/PyBub2RlLnRhZyA/PyBub2RlLm5vZGVUeXBlO1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB0ZW5zb3Igb2YgYmFnLmxhc3RPdXRwdXRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldCh0ZW5zb3IubmFtZSA/PyBrZXksIHRlbnNvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgVG9wb2xvZ2ljYWwgc29ydCAoS2FobidzIGFsZ29yaXRobSkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSBfZ2V0VG9wb2xvZ2ljYWxPcmRlcigpOiBJQ29tcHV0ZU5vZGVbXSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3NvcnRlZE5vZGVzKSByZXR1cm4gdGhpcy5fc29ydGVkTm9kZXM7XHJcblxyXG4gICAgICAgIGNvbnN0IHNvcnRlZDogSUNvbXB1dGVOb2RlW10gPSBbXTtcclxuICAgICAgICBjb25zdCBpbkRlZ3JlZSA9IG5ldyBNYXA8SUNvbXB1dGVOb2RlLCBudW1iZXI+KCk7XHJcblxyXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW4tZGVncmVlc1xyXG4gICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiB0aGlzLm5vZGVzKSB7XHJcbiAgICAgICAgICAgIGluRGVncmVlLnNldChub2RlLCBub2RlLm9wc2M8SURhdGFMaW5rPigpLmxlbmd0aCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTdGFydCB3aXRoIHNvdXJjZSBub2RlcyAoaW4tZGVncmVlID0gMClcclxuICAgICAgICBjb25zdCBxdWV1ZTogSUNvbXB1dGVOb2RlW10gPSBbXTtcclxuICAgICAgICBmb3IgKGNvbnN0IFtub2RlLCBkZWdyZWVdIG9mIGluRGVncmVlKSB7XHJcbiAgICAgICAgICAgIGlmIChkZWdyZWUgPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHF1ZXVlLnB1c2gobm9kZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdoaWxlIChxdWV1ZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBxdWV1ZS5zaGlmdCgpITtcclxuICAgICAgICAgICAgc29ydGVkLnB1c2gobm9kZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBGb3IgZWFjaCBvdXRnb2luZyBsaW5rLCByZWR1Y2UgdGhlIGRlc3RpbmF0aW9uJ3MgaW4tZGVncmVlXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgbGluayBvZiBub2RlLm9uc2M8SURhdGFMaW5rPigpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkZXN0ID0gbGluay5vZmluIGFzIElDb21wdXRlTm9kZTtcclxuICAgICAgICAgICAgICAgIGlmIChkZXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3RGVncmVlID0gKGluRGVncmVlLmdldChkZXN0KSA/PyAxKSAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5EZWdyZWUuc2V0KGRlc3QsIG5ld0RlZ3JlZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0RlZ3JlZSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWV1ZS5wdXNoKGRlc3QpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHNvcnRlZC5sZW5ndGggIT09IHRoaXMubm9kZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgICAgICAgICAgIGBDb21wdXRlR3JhcGggaGFzIGEgY3ljbGU6IHNvcnRlZCAke3NvcnRlZC5sZW5ndGh9IG9mICR7dGhpcy5ub2Rlcy5sZW5ndGh9IG5vZGVzLiBgICtcclxuICAgICAgICAgICAgICAgIGBDb21wdXRlIGdyYXBocyBtdXN0IGJlIERBR3MuYFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fc29ydGVkTm9kZXMgPSBzb3J0ZWQ7XHJcbiAgICAgICAgcmV0dXJuIHNvcnRlZDtcclxuICAgIH1cclxufVxyXG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIENvbXB1dGVOb2RlQmFzZSA6IGFic3RyYWN0IGJhc2UgY2xhc3MgZm9yIGFsbCBjb21wdXRlIG5vZGVzXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuaW1wb3J0IHsgR3JhcGhOb2RlIH0gZnJvbSBcInNwaWt5cGFuZGEtY29yZVwiO1xuaW1wb3J0IHsgSUNvbXB1dGVOb2RlLCBJVGVuc29yIH0gZnJvbSBcIi4vY29tcHV0ZS5pbnRlcmZhY2VzXCI7XG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgY29tcHV0ZSBub2Rlcy4gRXh0ZW5kcyBHcmFwaE5vZGUgZm9yIGdyYXBoIGNvbXBhdGliaWxpdHkuXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBDb21wdXRlTm9kZUJhc2UgZXh0ZW5kcyBHcmFwaE5vZGUgaW1wbGVtZW50cyBJQ29tcHV0ZU5vZGUge1xuICAgIHB1YmxpYyBhYnN0cmFjdCByZWFkb25seSBub2RlVHlwZTogc3RyaW5nO1xuICAgIHB1YmxpYyBhYnN0cmFjdCByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW107XG4gICAgcHVibGljIGFic3RyYWN0IGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW107XG59XG4iLCJleHBvcnQgKiBmcm9tIFwiLi9jb21wdXRlLmludGVyZmFjZXNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2NvbXB1dGUubm9kZS5iYXNlXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9jb21wdXRlLmdyYXBoXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9ub2Rlcy9pbmRleFwiO1xuIiwiLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBDbm5Ob2RlIDogZ2VuZXJpYyB3cmFwcGVyIGZvciBDTk4gaW5mZXJlbmNlXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuaW1wb3J0IHsgSVRlbnNvciB9IGZyb20gXCIuLi9jb21wdXRlLmludGVyZmFjZXNcIjtcbmltcG9ydCB7IENvbXB1dGVOb2RlQmFzZSB9IGZyb20gXCIuLi9jb21wdXRlLm5vZGUuYmFzZVwiO1xuXG4vKipcbiAqIENOTiBpbmZlcmVuY2Ugbm9kZSA6IHJ1bnMgYSBDTk4gZXZhbHVhdG9yIGFuZCBvdXRwdXRzIHRoZSByZXN1bHQuXG4gKiBXcmFwcyBhbnkgcnVuKGlucHV0OiBudW1iZXJbXSk6IG51bWJlcltdIGZ1bmN0aW9uLlxuICpcbiAqIFRoaXMgaXMgYSBnZW5lcmljIHdyYXBwZXI6IHBhc3MgaW4gdGhlIHJ1biBmdW5jdGlvbiBmcm9tXG4gKiBhbnkgQHNwaWt5LXBhbmRhL2NvcmUgQ05OIHJ1bnRpbWUgKENubkluZmVyZW5jZVJ1bnRpbWUsIGV0Yy4pLlxuICovXG5leHBvcnQgY2xhc3MgQ25uTm9kZSBleHRlbmRzIENvbXB1dGVOb2RlQmFzZSB7XG4gICAgcHVibGljIHJlYWRvbmx5IG5vZGVUeXBlOiBzdHJpbmc7XG4gICAgcHVibGljIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXTtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX2V2YWx1YXRlOiAoaW5wdXQ6IG51bWJlcltdKSA9PiBudW1iZXJbXTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vdXRwdXROYW1lOiBzdHJpbmc7XG5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgbm9kZVR5cGU6IHN0cmluZyxcbiAgICAgICAgb3V0cHV0U2l6ZTogbnVtYmVyLFxuICAgICAgICBldmFsdWF0ZTogKGlucHV0OiBudW1iZXJbXSkgPT4gbnVtYmVyW10sXG4gICAgICAgIG91dHB1dE5hbWU6IHN0cmluZyA9IFwib3V0cHV0XCJcbiAgICApIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5pZCA9IG5vZGVUeXBlO1xuICAgICAgICB0aGlzLm5vZGVUeXBlID0gbm9kZVR5cGU7XG4gICAgICAgIHRoaXMuX2V2YWx1YXRlID0gZXZhbHVhdGU7XG4gICAgICAgIHRoaXMuX291dHB1dE5hbWUgPSBvdXRwdXROYW1lO1xuICAgICAgICB0aGlzLm91dHB1dFNoYXBlcyA9IFtbb3V0cHV0U2l6ZV1dO1xuICAgIH1cblxuICAgIHB1YmxpYyBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcbiAgICAgICAgLy8gQ29uY2F0ZW5hdGUgYWxsIGlucHV0IHRlbnNvcnMgaW50byBhIHNpbmdsZSBmbGF0IGFycmF5XG4gICAgICAgIGxldCB0b3RhbExlbiA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgdCBvZiBpbnB1dHMpIHRvdGFsTGVuICs9IHQuZGF0YS5sZW5ndGg7XG5cbiAgICAgICAgY29uc3QgZmxhdCA9IG5ldyBGbG9hdDMyQXJyYXkodG90YWxMZW4pO1xuICAgICAgICBsZXQgb2Zmc2V0ID0gMDtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIGlucHV0cykge1xuICAgICAgICAgICAgZmxhdC5zZXQodC5kYXRhLCBvZmZzZXQpO1xuICAgICAgICAgICAgb2Zmc2V0ICs9IHQuZGF0YS5sZW5ndGg7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9ldmFsdWF0ZShBcnJheS5mcm9tKGZsYXQpKTtcbiAgICAgICAgcmV0dXJuIFt7IGRhdGE6IG5ldyBGbG9hdDMyQXJyYXkocmVzdWx0KSwgc2hhcGU6IFtyZXN1bHQubGVuZ3RoXSwgbmFtZTogdGhpcy5fb3V0cHV0TmFtZSB9XTtcbiAgICB9XG59XG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIENvbmNhdE5vZGUgOiBtZXJnZXMgbXVsdGlwbGUgaW5wdXQgdGVuc29ycyBpbnRvIG9uZSBmbGF0IHZlY3RvclxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5cbmltcG9ydCB7IElUZW5zb3IgfSBmcm9tIFwiLi4vY29tcHV0ZS5pbnRlcmZhY2VzXCI7XG5pbXBvcnQgeyBDb21wdXRlTm9kZUJhc2UgfSBmcm9tIFwiLi4vY29tcHV0ZS5ub2RlLmJhc2VcIjtcblxuLyoqXG4gKiBDb25jYXRlbmF0aW9uIG5vZGUgOiBtZXJnZXMgbXVsdGlwbGUgaW5wdXQgdGVuc29ycyBpbnRvIG9uZSBmbGF0IHZlY3Rvci5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbmNhdE5vZGUgZXh0ZW5kcyBDb21wdXRlTm9kZUJhc2Uge1xuICAgIHB1YmxpYyByZWFkb25seSBub2RlVHlwZSA9IFwiY29uY2F0XCI7XG4gICAgcHVibGljIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXTtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX3RvdGFsU2l6ZTogbnVtYmVyO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX291dHB1dE5hbWU6IHN0cmluZztcblxuICAgIGNvbnN0cnVjdG9yKGlucHV0U2l6ZXM6IG51bWJlcltdLCBvdXRwdXROYW1lOiBzdHJpbmcgPSBcImNvbmNhdFwiKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuaWQgPSBvdXRwdXROYW1lO1xuICAgICAgICB0aGlzLl90b3RhbFNpemUgPSBpbnB1dFNpemVzLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApO1xuICAgICAgICB0aGlzLl9vdXRwdXROYW1lID0gb3V0cHV0TmFtZTtcbiAgICAgICAgdGhpcy5vdXRwdXRTaGFwZXMgPSBbW3RoaXMuX3RvdGFsU2l6ZV1dO1xuICAgIH1cblxuICAgIHB1YmxpYyBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcbiAgICAgICAgY29uc3QgZmxhdCA9IG5ldyBGbG9hdDMyQXJyYXkodGhpcy5fdG90YWxTaXplKTtcbiAgICAgICAgbGV0IG9mZnNldCA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgdCBvZiBpbnB1dHMpIHtcbiAgICAgICAgICAgIGZsYXQuc2V0KHQuZGF0YSwgb2Zmc2V0KTtcbiAgICAgICAgICAgIG9mZnNldCArPSB0LmRhdGEubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbeyBkYXRhOiBmbGF0LCBzaGFwZTogW3RoaXMuX3RvdGFsU2l6ZV0sIG5hbWU6IHRoaXMuX291dHB1dE5hbWUgfV07XG4gICAgfVxufVxuIiwiLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBFeHRlcm5hbElucHV0Tm9kZSA6IG5hbWVkIGluamVjdGlvbiBwb2ludCBmb3IgcnVudGltZSBkYXRhXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuaW1wb3J0IHsgSVRlbnNvciB9IGZyb20gXCIuLi9jb21wdXRlLmludGVyZmFjZXNcIjtcbmltcG9ydCB7IENvbXB1dGVOb2RlQmFzZSB9IGZyb20gXCIuLi9jb21wdXRlLm5vZGUuYmFzZVwiO1xuXG4vKipcbiAqIEV4dGVybmFsIGlucHV0IG5vZGUgOiByZWNlaXZlcyB0ZW5zb3JzIGZyb20gdGhlIGdyYXBoJ3MgcnVuKCkgY2FsbC5cbiAqIEFjdHMgYXMgYSBuYW1lZCBpbmplY3Rpb24gcG9pbnQgZm9yIHNlbnNvciBkYXRhLCBwb3NlLCBnb2FsLCBldGMuXG4gKi9cbmV4cG9ydCBjbGFzcyBFeHRlcm5hbElucHV0Tm9kZSBleHRlbmRzIENvbXB1dGVOb2RlQmFzZSB7XG4gICAgcHVibGljIHJlYWRvbmx5IG5vZGVUeXBlID0gXCJleHRlcm5hbF9pbnB1dFwiO1xuICAgIHB1YmxpYyByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW107XG5cbiAgICBwcml2YXRlIF9zaGFwZTogbnVtYmVyW107XG4gICAgcHJpdmF0ZSBfbmFtZTogc3RyaW5nO1xuXG4gICAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBzaGFwZTogbnVtYmVyW10pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5pZCA9IG5hbWU7XG4gICAgICAgIHRoaXMuX25hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLl9zaGFwZSA9IHNoYXBlO1xuICAgICAgICB0aGlzLm91dHB1dFNoYXBlcyA9IFtzaGFwZV07XG4gICAgfVxuXG4gICAgcHVibGljIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xuICAgICAgICAvLyBFeHRlcm5hbCBpbnB1dHMgYXJlIGluamVjdGVkIGJ5IHRoZSBncmFwaCBlbmdpbmUgdmlhIHJ1bigpXG4gICAgICAgIGlmIChpbnB1dHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIFt7IC4uLmlucHV0c1swXSwgbmFtZTogdGhpcy5fbmFtZSB9XTtcbiAgICAgICAgfVxuICAgICAgICAvLyBSZXR1cm4gemVyb3MgaWYgbm8gaW5wdXQgcHJvdmlkZWRcbiAgICAgICAgY29uc3Qgc2l6ZSA9IHRoaXMuX3NoYXBlLnJlZHVjZSgoYSwgYikgPT4gYSAqIGIsIDEpO1xuICAgICAgICByZXR1cm4gW3sgZGF0YTogbmV3IEZsb2F0MzJBcnJheShzaXplKSwgc2hhcGU6IHRoaXMuX3NoYXBlLCBuYW1lOiB0aGlzLl9uYW1lIH1dO1xuICAgIH1cbn1cbiIsImV4cG9ydCAqIGZyb20gXCIuL2V4dGVybmFsLWlucHV0Lm5vZGVcIjtcbmV4cG9ydCAqIGZyb20gXCIuL21scC5ub2RlXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9jbm4ubm9kZVwiO1xuZXhwb3J0ICogZnJvbSBcIi4vcm5uLm5vZGVcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2NvbmNhdC5ub2RlXCI7XG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIE1MUE5vZGUgOiBnZW5lcmljIHdyYXBwZXIgZm9yIE1MUCBpbmZlcmVuY2Vcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5pbXBvcnQgeyBJVGVuc29yIH0gZnJvbSBcIi4uL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xuaW1wb3J0IHsgQ29tcHV0ZU5vZGVCYXNlIH0gZnJvbSBcIi4uL2NvbXB1dGUubm9kZS5iYXNlXCI7XG5cbi8qKlxuICogTUxQIGluZmVyZW5jZSBub2RlIDogcnVucyBhbiBNTFAgZXZhbHVhdG9yIGFuZCBvdXRwdXRzIHRoZSByZXN1bHQuXG4gKiBXcmFwcyBhbnkgZXZhbHVhdGUoaW5wdXQ6IG51bWJlcltdKTogbnVtYmVyW10gZnVuY3Rpb24uXG4gKlxuICogVGhpcyBpcyBhIGdlbmVyaWMgd3JhcHBlcjogcGFzcyBpbiB0aGUgZXZhbHVhdGUgZnVuY3Rpb24gZnJvbVxuICogYW55IEBzcGlreS1wYW5kYS9jb3JlIE1MUCBydW50aW1lIChNTFBJbmZlcmVuY2VSdW50aW1lLCBldGMuKS5cbiAqL1xuZXhwb3J0IGNsYXNzIE1MUE5vZGUgZXh0ZW5kcyBDb21wdXRlTm9kZUJhc2Uge1xuICAgIHB1YmxpYyByZWFkb25seSBub2RlVHlwZTogc3RyaW5nO1xuICAgIHB1YmxpYyByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW107XG5cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9ldmFsdWF0ZTogKGlucHV0OiBudW1iZXJbXSkgPT4gbnVtYmVyW107XG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3V0cHV0TmFtZTogc3RyaW5nO1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIG5vZGVUeXBlOiBzdHJpbmcsXG4gICAgICAgIF9pbnB1dFNpemU6IG51bWJlcixcbiAgICAgICAgb3V0cHV0U2l6ZTogbnVtYmVyLFxuICAgICAgICBldmFsdWF0ZTogKGlucHV0OiBudW1iZXJbXSkgPT4gbnVtYmVyW10sXG4gICAgICAgIG91dHB1dE5hbWU6IHN0cmluZyA9IFwib3V0cHV0XCJcbiAgICApIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5pZCA9IG5vZGVUeXBlO1xuICAgICAgICB0aGlzLm5vZGVUeXBlID0gbm9kZVR5cGU7XG4gICAgICAgIHRoaXMuX2V2YWx1YXRlID0gZXZhbHVhdGU7XG4gICAgICAgIHRoaXMuX291dHB1dE5hbWUgPSBvdXRwdXROYW1lO1xuICAgICAgICB0aGlzLm91dHB1dFNoYXBlcyA9IFtbb3V0cHV0U2l6ZV1dO1xuICAgIH1cblxuICAgIHB1YmxpYyBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcbiAgICAgICAgLy8gQ29uY2F0ZW5hdGUgYWxsIGlucHV0IHRlbnNvcnMgaW50byBhIHNpbmdsZSBmbGF0IGFycmF5XG4gICAgICAgIGxldCB0b3RhbExlbiA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgdCBvZiBpbnB1dHMpIHRvdGFsTGVuICs9IHQuZGF0YS5sZW5ndGg7XG5cbiAgICAgICAgY29uc3QgZmxhdCA9IG5ldyBGbG9hdDMyQXJyYXkodG90YWxMZW4pO1xuICAgICAgICBsZXQgb2Zmc2V0ID0gMDtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIGlucHV0cykge1xuICAgICAgICAgICAgZmxhdC5zZXQodC5kYXRhLCBvZmZzZXQpO1xuICAgICAgICAgICAgb2Zmc2V0ICs9IHQuZGF0YS5sZW5ndGg7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9ldmFsdWF0ZShBcnJheS5mcm9tKGZsYXQpKTtcbiAgICAgICAgcmV0dXJuIFt7IGRhdGE6IG5ldyBGbG9hdDMyQXJyYXkocmVzdWx0KSwgc2hhcGU6IFtyZXN1bHQubGVuZ3RoXSwgbmFtZTogdGhpcy5fb3V0cHV0TmFtZSB9XTtcbiAgICB9XG59XG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIFJubk5vZGUgOiBnZW5lcmljIHdyYXBwZXIgZm9yIFJOTiBpbmZlcmVuY2UgKHNpbmdsZSB0aW1lc3RlcClcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5pbXBvcnQgeyBJVGVuc29yIH0gZnJvbSBcIi4uL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xuaW1wb3J0IHsgQ29tcHV0ZU5vZGVCYXNlIH0gZnJvbSBcIi4uL2NvbXB1dGUubm9kZS5iYXNlXCI7XG5cbi8qKlxuICogUk5OIGluZmVyZW5jZSBub2RlIDogcnVucyBhIHNpbmdsZSB0aW1lc3RlcCB0aHJvdWdoIGFuIFJOTiBldmFsdWF0b3IuXG4gKiBXcmFwcyBhbnkgc3RlcChpbnB1dDogbnVtYmVyW10pOiBudW1iZXJbXSBmdW5jdGlvbi5cbiAqXG4gKiBUaGlzIGlzIGEgZ2VuZXJpYyB3cmFwcGVyOiBwYXNzIGluIHRoZSBzdGVwIGZ1bmN0aW9uIGZyb21cbiAqIGFueSBAc3Bpa3ktcGFuZGEvY29yZSBSTk4gcnVudGltZSAoUm5uSW5mZXJlbmNlUnVudGltZSwgZXRjLikuXG4gKlxuICogVGhlIFJOTiBtYWludGFpbnMgaGlkZGVuIHN0YXRlIGFjcm9zcyBjYWxscyBpbnRlcm5hbGx5LFxuICogc28gZWFjaCBleGVjdXRlKCkgYWR2YW5jZXMgb25lIHRpbWVzdGVwLlxuICovXG5leHBvcnQgY2xhc3MgUm5uTm9kZSBleHRlbmRzIENvbXB1dGVOb2RlQmFzZSB7XG4gICAgcHVibGljIHJlYWRvbmx5IG5vZGVUeXBlOiBzdHJpbmc7XG4gICAgcHVibGljIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXTtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0ZXA6IChpbnB1dDogbnVtYmVyW10pID0+IG51bWJlcltdO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX291dHB1dE5hbWU6IHN0cmluZztcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBub2RlVHlwZTogc3RyaW5nLFxuICAgICAgICBvdXRwdXRTaXplOiBudW1iZXIsXG4gICAgICAgIHN0ZXA6IChpbnB1dDogbnVtYmVyW10pID0+IG51bWJlcltdLFxuICAgICAgICBvdXRwdXROYW1lOiBzdHJpbmcgPSBcIm91dHB1dFwiXG4gICAgKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuaWQgPSBub2RlVHlwZTtcbiAgICAgICAgdGhpcy5ub2RlVHlwZSA9IG5vZGVUeXBlO1xuICAgICAgICB0aGlzLl9zdGVwID0gc3RlcDtcbiAgICAgICAgdGhpcy5fb3V0cHV0TmFtZSA9IG91dHB1dE5hbWU7XG4gICAgICAgIHRoaXMub3V0cHV0U2hhcGVzID0gW1tvdXRwdXRTaXplXV07XG4gICAgfVxuXG4gICAgcHVibGljIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xuICAgICAgICAvLyBDb25jYXRlbmF0ZSBhbGwgaW5wdXQgdGVuc29ycyBpbnRvIGEgc2luZ2xlIGZsYXQgYXJyYXlcbiAgICAgICAgbGV0IHRvdGFsTGVuID0gMDtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIGlucHV0cykgdG90YWxMZW4gKz0gdC5kYXRhLmxlbmd0aDtcblxuICAgICAgICBjb25zdCBmbGF0ID0gbmV3IEZsb2F0MzJBcnJheSh0b3RhbExlbik7XG4gICAgICAgIGxldCBvZmZzZXQgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IHQgb2YgaW5wdXRzKSB7XG4gICAgICAgICAgICBmbGF0LnNldCh0LmRhdGEsIG9mZnNldCk7XG4gICAgICAgICAgICBvZmZzZXQgKz0gdC5kYXRhLmxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX3N0ZXAoQXJyYXkuZnJvbShmbGF0KSk7XG4gICAgICAgIHJldHVybiBbeyBkYXRhOiBuZXcgRmxvYXQzMkFycmF5KHJlc3VsdCksIHNoYXBlOiBbcmVzdWx0Lmxlbmd0aF0sIG5hbWU6IHRoaXMuX291dHB1dE5hbWUgfV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgQ29tcHV0ZUdyYXBoLCBEYXRhTGluayB9IGZyb20gXCIuLi9jb21wdXRlL2NvbXB1dGUuZ3JhcGhcIjtcclxuaW1wb3J0IHsgQ29tcHV0ZU5vZGVCYXNlIH0gZnJvbSBcIi4uL2NvbXB1dGUvY29tcHV0ZS5ub2RlLmJhc2VcIjtcclxuaW1wb3J0IHR5cGUgeyBJQ29tcHV0ZU5vZGUsIElUZW5zb3IgfSBmcm9tIFwiLi4vY29tcHV0ZS9jb21wdXRlLmludGVyZmFjZXNcIjtcclxuaW1wb3J0IHR5cGUgeyBPbm54UGFyc2VSZXN1bHQgfSBmcm9tIFwiLi9vbm54LXBhcnNlclwiO1xyXG5pbXBvcnQgdHlwZSB7IE9ubnhWYWx1ZUluZm8gfSBmcm9tIFwiLi9vbm54LXR5cGVzXCI7XHJcbmltcG9ydCB0eXBlIHsgT25ueFRlbnNvckluZm8gfSBmcm9tIFwiLi9vbm54LXR5cGVzXCI7XHJcbmltcG9ydCB7IE9ubnhPcFJlZ2lzdHJ5LCBnZXRJbml0aWFsaXplckRhdGEsIG1ha2VUZW5zb3IgfSBmcm9tIFwiLi9yZWdpc3RyeVwiO1xyXG5cclxuLyoqXHJcbiAqIFNvdXJjZSBub2RlIHRoYXQgcHJvdmlkZXMgYSBjb25zdGFudCB0ZW5zb3IgKGZyb20gYW4gT05OWCBpbml0aWFsaXplcikuXHJcbiAqL1xyXG5jbGFzcyBJbml0aWFsaXplck5vZGUgZXh0ZW5kcyBDb21wdXRlTm9kZUJhc2Uge1xyXG4gICAgcmVhZG9ubHkgbm9kZVR5cGUgPSBcIm9ubnhfaW5pdGlhbGl6ZXJcIjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXTtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdGVuc29yOiBJVGVuc29yO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGluaXQ6IE9ubnhUZW5zb3JJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICBjb25zdCBkYXRhID0gZ2V0SW5pdGlhbGl6ZXJEYXRhKGluaXQpO1xyXG4gICAgICAgIHRoaXMudGVuc29yID0gbWFrZVRlbnNvcihkYXRhLCBbLi4uaW5pdC5kaW1zXSwgaW5pdC5uYW1lKTtcclxuICAgICAgICB0aGlzLm91dHB1dFNoYXBlcyA9IFtpbml0LmRpbXNdO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoKTogSVRlbnNvcltdIHtcclxuICAgICAgICByZXR1cm4gW3RoaXMudGVuc29yXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFNvdXJjZSBub2RlIGZvciBleHRlcm5hbCBncmFwaCBpbnB1dHMuXHJcbiAqL1xyXG5jbGFzcyBJbnB1dE5vZGUgZXh0ZW5kcyBDb21wdXRlTm9kZUJhc2Uge1xyXG4gICAgcmVhZG9ubHkgbm9kZVR5cGUgPSBcIm9ubnhfaW5wdXRcIjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXTtcclxuICAgIHJlYWRvbmx5IGlucHV0TmFtZTogc3RyaW5nO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgc2hhcGU6IG51bWJlcltdKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLmlkID0gbmFtZTtcclxuICAgICAgICB0aGlzLmlucHV0TmFtZSA9IG5hbWU7XHJcbiAgICAgICAgLy8gUmVwbGFjZSBkeW5hbWljIGRpbXMgKDApIHdpdGggMSBmb3IgaW5mZXJlbmNlXHJcbiAgICAgICAgdGhpcy5vdXRwdXRTaGFwZXMgPSBbc2hhcGUubWFwKChkKSA9PiAoZCA8PSAwID8gMSA6IGQpKV07XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgaWYgKGlucHV0cy5sZW5ndGggPiAwICYmIGlucHV0c1swXSkgcmV0dXJuIFtpbnB1dHNbMF1dO1xyXG4gICAgICAgIGNvbnN0IHN6ID0gdGhpcy5vdXRwdXRTaGFwZXNbMF0ucmVkdWNlKChhLCBiKSA9PiBhICogYiwgMSk7XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoc3opLCBbLi4udGhpcy5vdXRwdXRTaGFwZXNbMF1dLCB0aGlzLmlucHV0TmFtZSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogQnVpbGRzIGEgcnVubmFibGUgQ29tcHV0ZUdyYXBoIGZyb20gYW4gT25ueFBhcnNlUmVzdWx0ICsgb3AgcmVnaXN0cnkuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgT25ueEdyYXBoQnVpbGRlciB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJlZ2lzdHJ5OiBPbm54T3BSZWdpc3RyeTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihyZWdpc3RyeTogT25ueE9wUmVnaXN0cnkpIHtcclxuICAgICAgICB0aGlzLnJlZ2lzdHJ5ID0gcmVnaXN0cnk7XHJcbiAgICB9XHJcblxyXG4gICAgYnVpbGQobW9kZWw6IE9ubnhQYXJzZVJlc3VsdCk6IHsgZ3JhcGg6IENvbXB1dGVHcmFwaDsgaW5wdXROYW1lczogc3RyaW5nW107IG91dHB1dE5hbWVzOiBzdHJpbmdbXSB9IHtcclxuICAgICAgICBjb25zdCBub2RlczogSUNvbXB1dGVOb2RlW10gPSBbXTtcclxuICAgICAgICBjb25zdCBsaW5rczogRGF0YUxpbmtbXSA9IFtdO1xyXG5cclxuICAgICAgICAvLyBNYXAgdGVuc29yIG5hbWUgLT4gdGhlIG5vZGUgdGhhdCBwcm9kdWNlcyBpdCArIG91dHB1dCBpbmRleFxyXG4gICAgICAgIGNvbnN0IHRlbnNvclByb2R1Y2VyID0gbmV3IE1hcDxzdHJpbmcsIHsgbm9kZTogSUNvbXB1dGVOb2RlOyBvdXRwdXRJbmRleDogbnVtYmVyIH0+KCk7XHJcblxyXG4gICAgICAgIC8vIE1hcCB0ZW5zb3IgbmFtZSAtPiBsaXN0IG9mIGNvbnN1bWVycyAobm9kZSArIGlucHV0IGluZGV4KVxyXG4gICAgICAgIGNvbnN0IHRlbnNvckNvbnN1bWVyczogeyB0ZW5zb3JOYW1lOiBzdHJpbmc7IG5vZGU6IElDb21wdXRlTm9kZTsgaW5wdXRJbmRleDogbnVtYmVyIH1bXSA9IFtdO1xyXG5cclxuICAgICAgICAvLyBCdWlsZCBpbml0aWFsaXplciBtYXBcclxuICAgICAgICBjb25zdCBpbml0TWFwID0gbmV3IE1hcDxzdHJpbmcsIE9ubnhUZW5zb3JJbmZvPigpO1xyXG4gICAgICAgIGZvciAoY29uc3QgaW5pdCBvZiBtb2RlbC5pbml0aWFsaXplcnMpIHtcclxuICAgICAgICAgICAgaW5pdE1hcC5zZXQoaW5pdC5uYW1lLCBpbml0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBpbml0aWFsaXplciBub2Rlc1xyXG4gICAgICAgIGZvciAoY29uc3QgaW5pdCBvZiBtb2RlbC5pbml0aWFsaXplcnMpIHtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IG5ldyBJbml0aWFsaXplck5vZGUoaW5pdCk7XHJcbiAgICAgICAgICAgIG5vZGVzLnB1c2gobm9kZSk7XHJcbiAgICAgICAgICAgIHRlbnNvclByb2R1Y2VyLnNldChpbml0Lm5hbWUsIHsgbm9kZSwgb3V0cHV0SW5kZXg6IDAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBDcmVhdGUgaW5wdXQgbm9kZXMgKHNraXAgaW5pdGlhbGl6ZXJzIHRoYXQgc2hhcmUgaW5wdXQgbmFtZXMpXHJcbiAgICAgICAgY29uc3QgaW5wdXROYW1lczogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBmb3IgKGNvbnN0IGlucCBvZiBtb2RlbC5pbnB1dHMpIHtcclxuICAgICAgICAgICAgaWYgKGluaXRNYXAuaGFzKGlucC5uYW1lKSkgY29udGludWU7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBuZXcgSW5wdXROb2RlKGlucC5uYW1lLCBpbnAuc2hhcGUpO1xyXG4gICAgICAgICAgICBub2Rlcy5wdXNoKG5vZGUpO1xyXG4gICAgICAgICAgICB0ZW5zb3JQcm9kdWNlci5zZXQoaW5wLm5hbWUsIHsgbm9kZSwgb3V0cHV0SW5kZXg6IDAgfSk7XHJcbiAgICAgICAgICAgIGlucHV0TmFtZXMucHVzaChpbnAubmFtZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBDcmVhdGUgb3BlcmF0b3Igbm9kZXNcclxuICAgICAgICBmb3IgKGNvbnN0IG5vZGVJbmZvIG9mIG1vZGVsLm5vZGVzKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5yZWdpc3RyeS5oYXMobm9kZUluZm8ub3BUeXBlKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBTa2lwcGluZyB1bnN1cHBvcnRlZCBPTk5YIG9wOiAke25vZGVJbmZvLm9wVHlwZX1gKTtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gdGhpcy5yZWdpc3RyeS5jcmVhdGUobm9kZUluZm8sIGluaXRNYXApO1xyXG4gICAgICAgICAgICBub2Rlcy5wdXNoKG5vZGUpO1xyXG5cclxuICAgICAgICAgICAgLy8gUmVnaXN0ZXIgY29uc3VtZXIgZm9yIGVhY2ggaW5wdXQgdGVuc29yXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZUluZm8uaW5wdXRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0ZW5zb3JOYW1lID0gbm9kZUluZm8uaW5wdXRzW2ldO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRlbnNvck5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0ZW5zb3JDb25zdW1lcnMucHVzaCh7IHRlbnNvck5hbWUsIG5vZGUsIGlucHV0SW5kZXg6IGkgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFJlZ2lzdGVyIHByb2R1Y2VyIGZvciBlYWNoIG91dHB1dCB0ZW5zb3JcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlSW5mby5vdXRwdXRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0ZW5zb3JOYW1lID0gbm9kZUluZm8ub3V0cHV0c1tpXTtcclxuICAgICAgICAgICAgICAgIGlmICh0ZW5zb3JOYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGVuc29yUHJvZHVjZXIuc2V0KHRlbnNvck5hbWUsIHsgbm9kZSwgb3V0cHV0SW5kZXg6IGkgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFdpcmUgbGlua3NcclxuICAgICAgICBmb3IgKGNvbnN0IGNvbnN1bWVyIG9mIHRlbnNvckNvbnN1bWVycykge1xyXG4gICAgICAgICAgICBjb25zdCBwcm9kdWNlciA9IHRlbnNvclByb2R1Y2VyLmdldChjb25zdW1lci50ZW5zb3JOYW1lKTtcclxuICAgICAgICAgICAgaWYgKCFwcm9kdWNlcikge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBObyBwcm9kdWNlciBmb3IgdGVuc29yOiAke2NvbnN1bWVyLnRlbnNvck5hbWV9YCk7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBsaW5rID0gbmV3IERhdGFMaW5rKFxyXG4gICAgICAgICAgICAgICAgcHJvZHVjZXIubm9kZSBhcyBJQ29tcHV0ZU5vZGUsXHJcbiAgICAgICAgICAgICAgICBjb25zdW1lci5ub2RlIGFzIElDb21wdXRlTm9kZSxcclxuICAgICAgICAgICAgICAgIGNvbnN1bWVyLmlucHV0SW5kZXgsXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGxpbmtzLnB1c2gobGluayk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBJZGVudGlmeSBvdXRwdXQgdGVuc29yIG5hbWVzXHJcbiAgICAgICAgY29uc3Qgb3V0cHV0TmFtZXMgPSBtb2RlbC5vdXRwdXRzLm1hcCgobzogT25ueFZhbHVlSW5mbykgPT4gby5uYW1lKTtcclxuXHJcbiAgICAgICAgY29uc3QgZ3JhcGggPSBuZXcgQ29tcHV0ZUdyYXBoKG5vZGVzLCBsaW5rcyk7XHJcbiAgICAgICAgcmV0dXJuIHsgZ3JhcGgsIGlucHV0TmFtZXMsIG91dHB1dE5hbWVzIH07XHJcbiAgICB9XHJcbn1cclxuIiwiZXhwb3J0ICogZnJvbSBcIi4vcGIvaW5kZXhcIjtcclxuZXhwb3J0ICogZnJvbSBcIi4vb25ueC10eXBlc1wiO1xyXG5leHBvcnQgKiBmcm9tIFwiLi9vbm54LXBhcnNlclwiO1xyXG5leHBvcnQgKiBmcm9tIFwiLi9vbm54LXdyaXRlclwiO1xyXG5leHBvcnQgKiBmcm9tIFwiLi9yZWdpc3RyeVwiO1xyXG5leHBvcnQgeyBPbm54R3JhcGhCdWlsZGVyIH0gZnJvbSBcIi4vZ3JhcGgtYnVpbGRlclwiO1xyXG5leHBvcnQgKiBmcm9tIFwiLi9vcHMvaW5kZXhcIjtcclxuIiwiLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcbi8vIE9OTlggbW9kZWwgcGFyc2VyXHJcbi8vXHJcbi8vIFBvcnRlZCBmcm9tIEN5YW5NeWNlbGl1bTo6T25ueEdyYXBoQnVpbGRlciAoQysrIGltcGxlbWVudGF0aW9uKS5cclxuLy8gUGFyc2VzIGFuIE9OTlggcHJvdG9idWYgYmluYXJ5IGludG8gc3RydWN0dXJlZCBUeXBlU2NyaXB0IG9iamVjdHNcclxuLy8gKE9ubnhOb2RlSW5mbywgT25ueFRlbnNvckluZm8sIE9ubnhWYWx1ZUluZm8pIHRoYXQgY2FuIHRoZW4gYmUgdXNlZFxyXG4vLyB0byBidWlsZCBhIFNwaWt5UGFuZGEgQ29tcHV0ZUdyYXBoLlxyXG4vL1xyXG4vLyBaZXJvIGRlcGVuZGVuY2llcyBiZXlvbmQgdGhlIGxvY2FsIHBiLyByZWFkZXIgYW5kIG9ubngtdHlwZXMuXHJcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxyXG5cclxuaW1wb3J0IHsgUEJSZWFkZXIgfSBmcm9tIFwiLi9wYi9yZWFkZXJcIjtcclxuaW1wb3J0IHsgTWVtb3J5U3RyZWFtIH0gZnJvbSBcIi4vcGIvc3RyZWFtXCI7XHJcbmltcG9ydCB7IFdpcmVUeXBlIH0gZnJvbSBcIi4vcGIvcmVhZGVyXCI7XHJcbmltcG9ydCB7XHJcbiAgICBPbm54RGF0YVR5cGUsXHJcbiAgICBPbm54TGlua1R5cGUsXHJcbiAgICBPbm54Tm9kZUluZm8sXHJcbiAgICBPbm54VGVuc29ySW5mbyxcclxuICAgIE9ubnhWYWx1ZUluZm8sXHJcbiAgICBLRVlfTUFYX0xFTkdUSCxcclxuICAgIFRFTlNPUl9NQVhfRElNRU5TSU9OLFxyXG4gICAgLy8gTW9kZWxQcm90byBmaWVsZHNcclxuICAgIE1PREVMX0lSX1ZFUlNJT04sXHJcbiAgICBNT0RFTF9HUkFQSCxcclxuICAgIC8vIEdyYXBoUHJvdG8gZmllbGRzXHJcbiAgICBHUkFQSF9OT0RFLFxyXG4gICAgR1JBUEhfTkFNRSxcclxuICAgIEdSQVBIX0lOSVRJQUxJWkVSLFxyXG4gICAgR1JBUEhfSU5QVVQsXHJcbiAgICBHUkFQSF9PVVRQVVQsXHJcbiAgICBHUkFQSF9WQUxVRV9JTkZPLFxyXG4gICAgLy8gTm9kZVByb3RvIGZpZWxkc1xyXG4gICAgTk9ERV9JTlBVVCxcclxuICAgIE5PREVfT1VUUFVULFxyXG4gICAgTk9ERV9OQU1FLFxyXG4gICAgTk9ERV9PUF9UWVBFLFxyXG4gICAgTk9ERV9BVFRSSUJVVEUsXHJcbiAgICAvLyBBdHRyaWJ1dGVQcm90byBmaWVsZHNcclxuICAgIEFUVF9OQU1FLFxyXG4gICAgQVRUX0ZMT0FULFxyXG4gICAgQVRUX0lOVCxcclxuICAgIEFUVF9URU5TT1IsXHJcbiAgICBBVFRfRkxPQVRTLFxyXG4gICAgQVRUX0lOVFMsXHJcbiAgICAvLyBWYWx1ZUluZm9Qcm90byBmaWVsZHNcclxuICAgIFZJTkZPX05BTUUsXHJcbiAgICBWSU5GT19UWVBFLFxyXG4gICAgLy8gVHlwZVByb3RvIGZpZWxkc1xyXG4gICAgVFlQRV9URU5TT1IsXHJcbiAgICAvLyBUZW5zb3JUeXBlUHJvdG8gZmllbGRzXHJcbiAgICBURU5TT1JfVFlQRV9FTEVNX1RZUEUsXHJcbiAgICBURU5TT1JfVFlQRV9TSEFQRSxcclxuICAgIC8vIFNoYXBlIGZpZWxkc1xyXG4gICAgU0hBUEVfRElNLFxyXG4gICAgRElNX1ZBTFVFLFxyXG4gICAgRElNX1NZTUJPTCxcclxuICAgIC8vIFRlbnNvclByb3RvIGZpZWxkc1xyXG4gICAgVEVOU09SX0RJTVMsXHJcbiAgICBURU5TT1JfREFUQV9UWVBFLFxyXG4gICAgVEVOU09SX0ZMT0FUX0RBVEEsXHJcbiAgICBURU5TT1JfTkFNRSxcclxuICAgIFRFTlNPUl9SQVdfREFUQSxcclxufSBmcm9tIFwiLi9vbm54LXR5cGVzXCI7XHJcblxyXG4vLyDilIDilIDilIAgRXJyb3IgY29kZXMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG5leHBvcnQgY29uc3QgT05OWF9TVUNDRVNTID0gMDtcclxuZXhwb3J0IGNvbnN0IE9OTlhfVU5TVVBQT1JURURfTk9ERSA9IDEwMDtcclxuZXhwb3J0IGNvbnN0IE9OTlhfVU5TVVBQT1JURURfQVRUUklCVVRFID0gMTAxO1xyXG5leHBvcnQgY29uc3QgT05OWF9VTlNVUFBPUlRFRF9URU5TT1JfREFUQV9UWVBFID0gMTEwO1xyXG5leHBvcnQgY29uc3QgT05OWF9VTlNVUFBPUlRFRF9URU5TT1JfRElNID0gMTExO1xyXG5leHBvcnQgY29uc3QgT05OWF9JTlZBTElEX0lOSVRJQUxJWkVSX1NIQVBFID0gMTEzO1xyXG5leHBvcnQgY29uc3QgT05OWF9SRUFEX0VSUk9SID0gMjAwO1xyXG5leHBvcnQgY29uc3QgT05OWF9TWVNURU1fRVJST1IgPSAzMDA7XHJcblxyXG4vLyDilIDilIDilIAgUGFyc2UgcmVzdWx0IOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuLyoqXHJcbiAqIFRoZSByZXN1bHQgb2YgcGFyc2luZyBhbiBPTk5YIG1vZGVsLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBPbm54UGFyc2VSZXN1bHQge1xyXG4gICAgaXJWZXJzaW9uOiBudW1iZXI7XHJcbiAgICBncmFwaE5hbWU6IHN0cmluZztcclxuICAgIG5vZGVzOiBPbm54Tm9kZUluZm9bXTtcclxuICAgIGluaXRpYWxpemVyczogT25ueFRlbnNvckluZm9bXTtcclxuICAgIGlucHV0czogT25ueFZhbHVlSW5mb1tdO1xyXG4gICAgb3V0cHV0czogT25ueFZhbHVlSW5mb1tdO1xyXG4gICAgdmFsdWVJbmZvczogT25ueFZhbHVlSW5mb1tdO1xyXG59XHJcblxyXG4vLyDilIDilIDilIAgT25ueFBhcnNlciDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbi8qKlxyXG4gKiBQYXJzZXMgYW4gT05OWCBwcm90b2J1ZiBiaW5hcnkgaW50byBhIHN0cnVjdHVyZWQgcmVzdWx0LlxyXG4gKlxyXG4gKiBQb3J0ZWQgZnJvbSBDeWFuTXljZWxpdW06Ok9ubnhHcmFwaEJ1aWxkZXIuXHJcbiAqXHJcbiAqIFVzYWdlOlxyXG4gKiBgYGB0eXBlc2NyaXB0XHJcbiAqIGNvbnN0IGJ5dGVzID0gYXdhaXQgZmV0Y2goXCJtb2RlbC5vbm54XCIpLnRoZW4ociA9PiByLmFycmF5QnVmZmVyKCkpO1xyXG4gKiBjb25zdCByZXN1bHQgPSBPbm54UGFyc2VyLnBhcnNlKG5ldyBVaW50OEFycmF5KGJ5dGVzKSk7XHJcbiAqIGNvbnNvbGUubG9nKHJlc3VsdC5ub2Rlcy5tYXAobiA9PiBuLm9wVHlwZSkpO1xyXG4gKiBgYGBcclxuICovXHJcbmV4cG9ydCBjbGFzcyBPbm54UGFyc2VyIHtcclxuICAgIHByaXZhdGUgX2Vycm9yOiBudW1iZXIgPSBPTk5YX1NVQ0NFU1M7XHJcbiAgICBwcml2YXRlIF9lcnJvckluZm86IHN0cmluZyA9IFwiXCI7XHJcblxyXG4gICAgcHVibGljIGdldCBlcnJvcigpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9lcnJvcjtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGVycm9ySW5mbygpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9lcnJvckluZm87XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQYXJzZSBhbiBPTk5YIG1vZGVsIGZyb20gcmF3IGJ5dGVzLlxyXG4gICAgICogQHBhcmFtIGRhdGEgIFRoZSByYXcgLm9ubnggZmlsZSBjb250ZW50LlxyXG4gICAgICogQHJldHVybnMgICAgIFRoZSBwYXJzZWQgcmVzdWx0LCBvciBudWxsIG9uIGVycm9yLlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgc3RhdGljIHBhcnNlKGRhdGE6IFVpbnQ4QXJyYXkpOiBPbm54UGFyc2VSZXN1bHQgfCBudWxsIHtcclxuICAgICAgICBjb25zdCBwYXJzZXIgPSBuZXcgT25ueFBhcnNlcigpO1xyXG4gICAgICAgIHJldHVybiBwYXJzZXIucGFyc2VNb2RlbChkYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFBhcnNlIGFuIE9OTlggbW9kZWwuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBwYXJzZU1vZGVsKGRhdGE6IFVpbnQ4QXJyYXkpOiBPbm54UGFyc2VSZXN1bHQgfCBudWxsIHtcclxuICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgUEJSZWFkZXIobmV3IE1lbW9yeVN0cmVhbShkYXRhKSk7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0OiBPbm54UGFyc2VSZXN1bHQgPSB7XHJcbiAgICAgICAgICAgIGlyVmVyc2lvbjogMCxcclxuICAgICAgICAgICAgZ3JhcGhOYW1lOiBcIlwiLFxyXG4gICAgICAgICAgICBub2RlczogW10sXHJcbiAgICAgICAgICAgIGluaXRpYWxpemVyczogW10sXHJcbiAgICAgICAgICAgIGlucHV0czogW10sXHJcbiAgICAgICAgICAgIG91dHB1dHM6IFtdLFxyXG4gICAgICAgICAgICB2YWx1ZUluZm9zOiBbXSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB3aGlsZSAocmVhZGVyLnJlYWRUYWcoKSkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHJlYWRlci5maWVsZE51bWJlcikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBNT0RFTF9JUl9WRVJTSU9OOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdiA9IHJlYWRlci5yZWFkSW50MzIoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodiA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXRFcnJvcihPTk5YX1JFQURfRVJST1IsIFwiRmFpbGVkIHRvIHJlYWQgSVIgdmVyc2lvblwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5pclZlcnNpb24gPSB2O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBNT0RFTF9HUkFQSDoge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN1YiA9IHJlYWRlci5nZXRTdWJNZXNzYWdlUmVhZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdWIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2V0RXJyb3IoT05OWF9SRUFEX0VSUk9SLCBcIkZhaWxlZCB0byByZWFkIGdyYXBoXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9yZWFkR3JhcGgoc3ViLCByZXN1bHQpKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlYWRlci5za2lwKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2V0RXJyb3IoT05OWF9SRUFEX0VSUk9SLCBcIkZhaWxlZCB0byBza2lwIGZpZWxkXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIEdyYXBoIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHByaXZhdGUgX3JlYWRHcmFwaChyZWFkZXI6IFBCUmVhZGVyLCByZXN1bHQ6IE9ubnhQYXJzZVJlc3VsdCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHdoaWxlIChyZWFkZXIucmVhZFRhZygpKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAocmVhZGVyLmZpZWxkTnVtYmVyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdSQVBIX05PREU6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdWIgPSByZWFkZXIuZ2V0U3ViTWVzc2FnZVJlYWRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghc3ViKSByZXR1cm4gdGhpcy5fZmFpbChcIkZhaWxlZCB0byByZWFkIG5vZGVcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuX3JlYWROb2RlKHN1Yik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFub2RlKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0Lm5vZGVzLnB1c2gobm9kZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdSQVBIX05BTUU6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gcmVhZGVyLnJlYWRTdHJpbmcoS0VZX01BWF9MRU5HVEgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChuYW1lID09PSBudWxsKSByZXR1cm4gdGhpcy5fZmFpbChcIkZhaWxlZCB0byByZWFkIGdyYXBoIG5hbWVcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmdyYXBoTmFtZSA9IG5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdSQVBIX0lOSVRJQUxJWkVSOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViID0gcmVhZGVyLmdldFN1Yk1lc3NhZ2VSZWFkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXN1YikgcmV0dXJuIHRoaXMuX2ZhaWwoXCJGYWlsZWQgdG8gcmVhZCBpbml0aWFsaXplclwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbml0ID0gdGhpcy5fcmVhZEluaXRpYWxpemVyKHN1Yik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpbml0KSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmluaXRpYWxpemVycy5wdXNoKGluaXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBHUkFQSF9JTlBVVDoge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN1YiA9IHJlYWRlci5nZXRTdWJNZXNzYWdlUmVhZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdWIpIHJldHVybiB0aGlzLl9mYWlsKFwiRmFpbGVkIHRvIHJlYWQgaW5wdXRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmkgPSB0aGlzLl9yZWFkVmFsdWVJbmZvKHN1YiwgT25ueExpbmtUeXBlLklOUFVUKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXZpKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmlucHV0cy5wdXNoKHZpKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgR1JBUEhfT1VUUFVUOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViID0gcmVhZGVyLmdldFN1Yk1lc3NhZ2VSZWFkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXN1YikgcmV0dXJuIHRoaXMuX2ZhaWwoXCJGYWlsZWQgdG8gcmVhZCBvdXRwdXRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmkgPSB0aGlzLl9yZWFkVmFsdWVJbmZvKHN1YiwgT25ueExpbmtUeXBlLk9VVFBVVCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF2aSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5vdXRwdXRzLnB1c2godmkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBHUkFQSF9WQUxVRV9JTkZPOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViID0gcmVhZGVyLmdldFN1Yk1lc3NhZ2VSZWFkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXN1YikgcmV0dXJuIHRoaXMuX2ZhaWwoXCJGYWlsZWQgdG8gcmVhZCB2YWx1ZV9pbmZvXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpID0gdGhpcy5fcmVhZFZhbHVlSW5mbyhzdWIsIE9ubnhMaW5rVHlwZS5VTktOT1dOKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXZpKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnZhbHVlSW5mb3MucHVzaCh2aSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWFkZXIuc2tpcCgpKSByZXR1cm4gdGhpcy5fZmFpbChcIkZhaWxlZCB0byBza2lwIGdyYXBoIGZpZWxkXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBOb2RlIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHByaXZhdGUgX3JlYWROb2RlKHJlYWRlcjogUEJSZWFkZXIpOiBPbm54Tm9kZUluZm8gfCBudWxsIHtcclxuICAgICAgICBjb25zdCBub2RlOiBPbm54Tm9kZUluZm8gPSB7XHJcbiAgICAgICAgICAgIG5hbWU6IFwiXCIsXHJcbiAgICAgICAgICAgIG9wVHlwZTogXCJcIixcclxuICAgICAgICAgICAgaW5wdXRzOiBbXSxcclxuICAgICAgICAgICAgb3V0cHV0czogW10sXHJcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IG5ldyBNYXAoKSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBUd28tcGFzcyByZWFkOiBmaXJzdCBmaW5kIG9wX3R5cGUsIHRoZW4gcGFyc2UgZXZlcnl0aGluZ1xyXG4gICAgICAgIHJlYWRlci5zYXZlKCk7XHJcbiAgICAgICAgd2hpbGUgKHJlYWRlci5yZWFkVGFnKCkpIHtcclxuICAgICAgICAgICAgaWYgKHJlYWRlci5maWVsZE51bWJlciA9PT0gTk9ERV9PUF9UWVBFKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0ID0gcmVhZGVyLnJlYWRTdHJpbmcoS0VZX01BWF9MRU5HVEgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHQgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXRFcnJvcihPTk5YX1JFQURfRVJST1IsIFwiRmFpbGVkIHRvIHJlYWQgb3BfdHlwZVwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIG5vZGUub3BUeXBlID0gdDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJlYWRlci5za2lwKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJlYWRlci5yZXN0b3JlKCk7XHJcblxyXG4gICAgICAgIC8vIFNlY29uZCBwYXNzOiByZWFkIGFsbCBmaWVsZHNcclxuICAgICAgICB3aGlsZSAocmVhZGVyLnJlYWRUYWcoKSkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHJlYWRlci5maWVsZE51bWJlcikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBOT0RFX0lOUFVUOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcyA9IHJlYWRlci5yZWFkU3RyaW5nKEtFWV9NQVhfTEVOR1RIKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocyA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHMubGVuZ3RoID4gMCkgbm9kZS5pbnB1dHMucHVzaChzKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgTk9ERV9PVVRQVVQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gcmVhZGVyLnJlYWRTdHJpbmcoS0VZX01BWF9MRU5HVEgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocy5sZW5ndGggPiAwKSBub2RlLm91dHB1dHMucHVzaChzKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgTk9ERV9OQU1FOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcyA9IHJlYWRlci5yZWFkU3RyaW5nKEtFWV9NQVhfTEVOR1RIKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocyA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5uYW1lID0gcztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgTk9ERV9PUF9UWVBFOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQWxyZWFkeSByZWFkIGluIGZpcnN0IHBhc3MsIGp1c3Qgc2tpcFxyXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIE5PREVfQVRUUklCVVRFOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5saW5lIHBhcnNlIChhdm9pZCBzdWItcmVhZGVyIGZvciBwZXJmb3JtYW5jZSlcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZW4gPSByZWFkZXIucmVhZExlbmd0aChmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxlbiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW5kID0gcmVhZGVyLnBvc2l0aW9uICsgbGVuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgYXR0TmFtZSA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGF0dEZsb2F0ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYXR0SW50ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaGFzRmxvYXQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaGFzSW50ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGF0dFRlbnNvcjogT25ueFRlbnNvckluZm8gfCBudWxsID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3NpdGlvbiA8IGVuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlYWRlci5yZWFkVGFnKCkpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdHRGaWVsZCA9IHJlYWRlci5maWVsZE51bWJlciBhcyBudW1iZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoYXR0RmllbGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQVRUX05BTUU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gcmVhZGVyLnJlYWRTdHJpbmcoS0VZX01BWF9MRU5HVEgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHROYW1lID0gcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQVRUX0ZMT0FUOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZiA9IHJlYWRlci5yZWFkRmxvYXQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0RmxvYXQgPSBmO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0Zsb2F0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQVRUX0lOVDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGkgPSByZWFkZXIucmVhZEludDY0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dEludCA9IGk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzSW50ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQVRUX1RFTlNPUjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN1YiA9IHJlYWRlci5nZXRTdWJNZXNzYWdlUmVhZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzdWIpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dFRlbnNvciA9IHRoaXMuX3JlYWRJbml0aWFsaXplcihzdWIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBVFRfSU5UUzoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlcGVhdGVkIGludDY0OiBzdG9yZSBmaXJzdCB2YWx1ZSBhcyBzY2FsYXIgYXR0clxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGkgPSByZWFkZXIucmVhZEludDY0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFzSW50KSB7IGF0dEludCA9IGk7IGhhc0ludCA9IHRydWU7IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQVRUX0ZMT0FUUzoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlcGVhdGVkIGZsb2F0OiBzdG9yZSBmaXJzdCB2YWx1ZSBhcyBzY2FsYXIgYXR0clxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGYgPSByZWFkZXIucmVhZEZsb2F0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGYgPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFzRmxvYXQpIHsgYXR0RmxvYXQgPSBmOyBoYXNGbG9hdCA9IHRydWU7IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF0dE5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dFRlbnNvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFub2RlLnRlbnNvckF0dHJpYnV0ZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnRlbnNvckF0dHJpYnV0ZXMgPSBuZXcgTWFwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnRlbnNvckF0dHJpYnV0ZXMuc2V0KGF0dE5hbWUsIGF0dFRlbnNvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaGFzRmxvYXQgfHwgaGFzSW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLmF0dHJpYnV0ZXMuc2V0KGF0dE5hbWUsIGhhc0Zsb2F0ID8gYXR0RmxvYXQgOiBhdHRJbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBWYWx1ZUluZm8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSBfcmVhZFZhbHVlSW5mbyhyZWFkZXI6IFBCUmVhZGVyLCB0eXBlOiBPbm54TGlua1R5cGUpOiBPbm54VmFsdWVJbmZvIHwgbnVsbCB7XHJcbiAgICAgICAgY29uc3QgaW5mbzogT25ueFZhbHVlSW5mbyA9IHtcclxuICAgICAgICAgICAgbmFtZTogXCJcIixcclxuICAgICAgICAgICAgdHlwZSxcclxuICAgICAgICAgICAgZWxlbVR5cGU6IE9ubnhEYXRhVHlwZS5VTkRFRklORUQsXHJcbiAgICAgICAgICAgIHNoYXBlOiBbXSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB3aGlsZSAocmVhZGVyLnJlYWRUYWcoKSkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHJlYWRlci5maWVsZE51bWJlcikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBWSU5GT19OQU1FOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcyA9IHJlYWRlci5yZWFkU3RyaW5nKEtFWV9NQVhfTEVOR1RIKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocyA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5mby5uYW1lID0gcztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgVklORk9fVFlQRToge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIElubGluZSBwYXJzZSBUeXBlUHJvdG9cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZW4gPSByZWFkZXIucmVhZExlbmd0aChmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxlbiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW5kID0gcmVhZGVyLnBvc2l0aW9uICsgbGVuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvc2l0aW9uIDwgZW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcmVhZGVyLnJlYWRUYWcoKSkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgocmVhZGVyLmZpZWxkTnVtYmVyIGFzIG51bWJlcikgPT09IFRZUEVfVEVOU09SKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdWIgPSByZWFkZXIuZ2V0U3ViTWVzc2FnZVJlYWRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzdWIpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9yZWFkVGVuc29yVHlwZShzdWIsIGluZm8pKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpbmZvO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgX3JlYWRUZW5zb3JUeXBlKHJlYWRlcjogUEJSZWFkZXIsIGluZm86IE9ubnhWYWx1ZUluZm8pOiBib29sZWFuIHtcclxuICAgICAgICB3aGlsZSAocmVhZGVyLnJlYWRUYWcoKSkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHJlYWRlci5maWVsZE51bWJlcikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBURU5TT1JfVFlQRV9FTEVNX1RZUEU6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gcmVhZGVyLnJlYWRJbnQzMigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2ID09PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5mby5lbGVtVHlwZSA9IHYgYXMgT25ueERhdGFUeXBlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBURU5TT1JfVFlQRV9TSEFQRToge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN1YiA9IHJlYWRlci5nZXRTdWJNZXNzYWdlUmVhZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdWIpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX3JlYWRUZW5zb3JTaGFwZShzdWIsIGluZm8pKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBfcmVhZFRlbnNvclNoYXBlKHJlYWRlcjogUEJSZWFkZXIsIGluZm86IE9ubnhWYWx1ZUluZm8pOiBib29sZWFuIHtcclxuICAgICAgICB3aGlsZSAocmVhZGVyLnJlYWRUYWcoKSkge1xyXG4gICAgICAgICAgICBpZiAocmVhZGVyLmZpZWxkTnVtYmVyID09PSBTSEFQRV9ESU0pIHtcclxuICAgICAgICAgICAgICAgIC8vIElubGluZSBwYXJzZSBEaW1lbnNpb25Qcm90b1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGVuID0gcmVhZGVyLnJlYWRMZW5ndGgoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGxlbiA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZW5kID0gcmVhZGVyLnBvc2l0aW9uICsgbGVuO1xyXG5cclxuICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zaXRpb24gPCBlbmQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlYWRlci5yZWFkVGFnKCkpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaW1GaWVsZCA9IHJlYWRlci5maWVsZE51bWJlciBhcyBudW1iZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChkaW1GaWVsZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIERJTV9WQUxVRToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdiA9IHJlYWRlci5yZWFkSW50NjQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2ID09PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmZvLnNoYXBlLnB1c2godik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIERJTV9TWU1CT0w6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN5bWJvbGljIGRpbWVuc2lvbiAoZS5nLiwgXCJiYXRjaF9zaXplXCIpLCBzdG9yZSBhcyAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5mby5zaGFwZS5wdXNoKDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZWFkZXIuc2tpcCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBJbml0aWFsaXplciAoVGVuc29yUHJvdG8pIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHByaXZhdGUgX3JlYWRJbml0aWFsaXplcihyZWFkZXI6IFBCUmVhZGVyKTogT25ueFRlbnNvckluZm8gfCBudWxsIHtcclxuICAgICAgICBjb25zdCB0ZW5zb3I6IE9ubnhUZW5zb3JJbmZvID0ge1xyXG4gICAgICAgICAgICBuYW1lOiBcIlwiLFxyXG4gICAgICAgICAgICBkYXRhVHlwZTogT25ueERhdGFUeXBlLlVOREVGSU5FRCxcclxuICAgICAgICAgICAgZGltczogW10sXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgbGV0IHRvdGFsRWxlbWVudHMgPSAwO1xyXG5cclxuICAgICAgICB3aGlsZSAocmVhZGVyLnJlYWRUYWcoKSkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHJlYWRlci5maWVsZE51bWJlcikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBURU5TT1JfRElNUzoge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWFkZXIud2lyZVR5cGUgPT09IFdpcmVUeXBlLkxFTikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQYWNrZWQgZGltc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0bXBEaW1zID0gbmV3IEludDMyQXJyYXkoVEVOU09SX01BWF9ESU1FTlNJT04pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb3VudCA9IHJlYWRlci5yZWFkUGFja2VkSW50MzIodG1wRGltcywgVEVOU09SX01BWF9ESU1FTlNJT04pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY291bnQgPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW5zb3IuZGltcyA9IEFycmF5LmZyb20odG1wRGltcy5zdWJhcnJheSgwLCBjb3VudCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluZGl2aWR1YWwgdmFyaW50IGRpbVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gcmVhZGVyLnJlYWRJbnQzMigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbnNvci5kaW1zLnB1c2godik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlY29tcHV0ZSB0b3RhbCBlbGVtZW50c1xyXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsRWxlbWVudHMgPSB0ZW5zb3IuZGltcy5sZW5ndGggPiAwID8gdGVuc29yLmRpbXMucmVkdWNlKChhLCBiKSA9PiBhICogYiwgMSkgOiAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBURU5TT1JfREFUQV9UWVBFOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdiA9IHJlYWRlci5yZWFkSW50MzIoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgdGVuc29yLmRhdGFUeXBlID0gdiBhcyBPbm54RGF0YVR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRFTlNPUl9OQU1FOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcyA9IHJlYWRlci5yZWFkU3RyaW5nKEtFWV9NQVhfTEVOR1RIKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocyA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgdGVuc29yLm5hbWUgPSBzO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBURU5TT1JfRkxPQVRfREFUQToge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0b3RhbEVsZW1lbnRzID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRlbnNvci5mbG9hdERhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVuc29yLmZsb2F0RGF0YSA9IG5ldyBGbG9hdDMyQXJyYXkodG90YWxFbGVtZW50cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWFkZXIud2lyZVR5cGUgPT09IFdpcmVUeXBlLkxFTikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQYWNrZWQgZmxvYXRzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkUGFja2VkRmxvYXQzMih0ZW5zb3IuZmxvYXREYXRhLCB0b3RhbEVsZW1lbnRzKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbmRpdmlkdWFsIGZsb2F0IChyYXJlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmID0gcmVhZGVyLnJlYWRGbG9hdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpbmQgbmV4dCBlbXB0eSBzbG90XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG90YWxFbGVtZW50czsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGVuc29yLmZsb2F0RGF0YVtpXSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbnNvci5mbG9hdERhdGFbaV0gPSBmO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBURU5TT1JfUkFXX0RBVEE6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBieXRlcyA9IHJlYWRlci5yZWFkQnl0ZXMoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYnl0ZXMgPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIHRlbnNvci5yYXdEYXRhID0gYnl0ZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgZmxvYXQgdHlwZSwgYWxzbyBjcmVhdGUgdGhlIGZsb2F0IHZpZXdcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGVuc29yLmRhdGFUeXBlID09PSBPbm54RGF0YVR5cGUuRkxPQVQgJiYgdG90YWxFbGVtZW50cyA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWxpZ25lZCA9IG5ldyBGbG9hdDMyQXJyYXkoYnl0ZXMuYnVmZmVyLCBieXRlcy5ieXRlT2Zmc2V0LCB0b3RhbEVsZW1lbnRzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVuc29yLmZsb2F0RGF0YSA9IG5ldyBGbG9hdDMyQXJyYXkoYWxpZ25lZCk7IC8vIGNvcHkgdG8gZW5zdXJlIGFsaWdubWVudFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGVuc29yO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBFcnJvciBoZWxwZXJzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHByaXZhdGUgX3NldEVycm9yKGNvZGU6IG51bWJlciwgaW5mbzogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5fZXJyb3IgPSBjb2RlO1xyXG4gICAgICAgIHRoaXMuX2Vycm9ySW5mbyA9IGluZm87XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBfZmFpbChtc2c6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHRoaXMuX3NldEVycm9yKE9OTlhfUkVBRF9FUlJPUiwgbXNnKTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbn1cclxuIiwiLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcbi8vIE9OTlggZGF0YSB0eXBlcyBhbmQgcHJvdG9idWYgZmllbGQgY29uc3RhbnRzXHJcbi8vXHJcbi8vIE1pcnJvcnMgdGhlIE9OTlggMS4xOC4wIHByb3RvYnVmIHNjaGVtYSAob25ueC5wcm90bzMpIGFzIFR5cGVTY3JpcHRcclxuLy8gdHlwZXMgYW5kIG51bWVyaWMgY29uc3RhbnRzLiBObyBjb2RlIGdlbmVyYXRpb24gcmVxdWlyZWQuXHJcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxyXG5cclxuLy8g4pSA4pSA4pSAIFRlbnNvciBkYXRhIHR5cGVzIChmcm9tIG9ubngucHJvdG8zIFRlbnNvclByb3RvLkRhdGFUeXBlKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbmV4cG9ydCBlbnVtIE9ubnhEYXRhVHlwZSB7XHJcbiAgICBVTkRFRklORUQgPSAwLFxyXG4gICAgRkxPQVQgPSAxLFxyXG4gICAgVUlOVDggPSAyLFxyXG4gICAgSU5UOCA9IDMsXHJcbiAgICBVSU5UMTYgPSA0LFxyXG4gICAgSU5UMTYgPSA1LFxyXG4gICAgSU5UMzIgPSA2LFxyXG4gICAgSU5UNjQgPSA3LFxyXG4gICAgU1RSSU5HID0gOCxcclxuICAgIEJPT0wgPSA5LFxyXG4gICAgRkxPQVQxNiA9IDEwLFxyXG4gICAgRE9VQkxFID0gMTEsXHJcbiAgICBVSU5UMzIgPSAxMixcclxuICAgIFVJTlQ2NCA9IDEzLFxyXG4gICAgQ09NUExFWDY0ID0gMTQsXHJcbiAgICBDT01QTEVYMTI4ID0gMTUsXHJcbiAgICBCRkxPQVQxNiA9IDE2LFxyXG59XHJcblxyXG4vKiogQnl0ZSBzaXplIHBlciBlbGVtZW50IGZvciBzdXBwb3J0ZWQgZGF0YSB0eXBlcy4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG9ubnhEYXRhVHlwZVNpemUodHlwZTogT25ueERhdGFUeXBlKTogbnVtYmVyIHtcclxuICAgIHN3aXRjaCAodHlwZSkge1xyXG4gICAgICAgIGNhc2UgT25ueERhdGFUeXBlLkZMT0FUOlxyXG4gICAgICAgIGNhc2UgT25ueERhdGFUeXBlLklOVDMyOlxyXG4gICAgICAgIGNhc2UgT25ueERhdGFUeXBlLlVJTlQzMjpcclxuICAgICAgICAgICAgcmV0dXJuIDQ7XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuRE9VQkxFOlxyXG4gICAgICAgIGNhc2UgT25ueERhdGFUeXBlLklOVDY0OlxyXG4gICAgICAgIGNhc2UgT25ueERhdGFUeXBlLlVJTlQ2NDpcclxuICAgICAgICAgICAgcmV0dXJuIDg7XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuRkxPQVQxNjpcclxuICAgICAgICBjYXNlIE9ubnhEYXRhVHlwZS5CRkxPQVQxNjpcclxuICAgICAgICBjYXNlIE9ubnhEYXRhVHlwZS5JTlQxNjpcclxuICAgICAgICBjYXNlIE9ubnhEYXRhVHlwZS5VSU5UMTY6XHJcbiAgICAgICAgICAgIHJldHVybiAyO1xyXG4gICAgICAgIGNhc2UgT25ueERhdGFUeXBlLklOVDg6XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuVUlOVDg6XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuQk9PTDpcclxuICAgICAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIOKUgOKUgOKUgCBMaW5rIHR5cGUgKG1pcnJvcnMgQ3lhbk15Y2VsaXVtOjpMaW5rVHlwZSkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG5leHBvcnQgZW51bSBPbm54TGlua1R5cGUge1xyXG4gICAgVU5LTk9XTiA9IDAsXHJcbiAgICBJTlBVVCA9IDEsXHJcbiAgICBPVVRQVVQgPSAyLFxyXG4gICAgSU5JVElBTElaRVIgPSAzLFxyXG59XHJcblxyXG4vLyDilIDilIDilIAgUHJvdG9idWYgZmllbGQgbnVtYmVycyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuLy8gVGhlc2UgbWF0Y2ggdGhlIE9OTlggLnByb3RvIGZpZWxkIGluZGljZXMgZXhhY3RseS5cclxuXHJcbi8vIE1vZGVsUHJvdG9cclxuZXhwb3J0IGNvbnN0IE1PREVMX0lSX1ZFUlNJT04gPSAxO1xyXG5leHBvcnQgY29uc3QgTU9ERUxfR1JBUEggPSA3O1xyXG5cclxuLy8gR3JhcGhQcm90b1xyXG5leHBvcnQgY29uc3QgR1JBUEhfTk9ERSA9IDE7XHJcbmV4cG9ydCBjb25zdCBHUkFQSF9OQU1FID0gMjtcclxuZXhwb3J0IGNvbnN0IEdSQVBIX0lOSVRJQUxJWkVSID0gNTtcclxuZXhwb3J0IGNvbnN0IEdSQVBIX0RPQ19TVFJJTkcgPSAxMDtcclxuZXhwb3J0IGNvbnN0IEdSQVBIX0lOUFVUID0gMTE7XHJcbmV4cG9ydCBjb25zdCBHUkFQSF9PVVRQVVQgPSAxMjtcclxuZXhwb3J0IGNvbnN0IEdSQVBIX1ZBTFVFX0lORk8gPSAxMztcclxuXHJcbi8vIE5vZGVQcm90b1xyXG5leHBvcnQgY29uc3QgTk9ERV9JTlBVVCA9IDE7XHJcbmV4cG9ydCBjb25zdCBOT0RFX09VVFBVVCA9IDI7XHJcbmV4cG9ydCBjb25zdCBOT0RFX05BTUUgPSAzO1xyXG5leHBvcnQgY29uc3QgTk9ERV9PUF9UWVBFID0gNDtcclxuZXhwb3J0IGNvbnN0IE5PREVfQVRUUklCVVRFID0gNTtcclxuXHJcbi8vIEF0dHJpYnV0ZVByb3RvIChwYXJ0aWFsLCBtb3N0IGNvbW1vbmx5IHVzZWQgZmllbGRzKVxyXG5leHBvcnQgY29uc3QgQVRUX05BTUUgPSAxO1xyXG5leHBvcnQgY29uc3QgQVRUX0ZMT0FUID0gMjtcclxuZXhwb3J0IGNvbnN0IEFUVF9JTlQgPSAzO1xyXG5leHBvcnQgY29uc3QgQVRUX1RFTlNPUiA9IDU7XHJcbmV4cG9ydCBjb25zdCBBVFRfRkxPQVRTID0gNztcclxuZXhwb3J0IGNvbnN0IEFUVF9JTlRTID0gODtcclxuXHJcbi8vIFZhbHVlSW5mb1Byb3RvXHJcbmV4cG9ydCBjb25zdCBWSU5GT19OQU1FID0gMTtcclxuZXhwb3J0IGNvbnN0IFZJTkZPX1RZUEUgPSAyO1xyXG5cclxuLy8gVHlwZVByb3RvXHJcbmV4cG9ydCBjb25zdCBUWVBFX1RFTlNPUiA9IDE7XHJcblxyXG4vLyBUZW5zb3JUeXBlUHJvdG9cclxuZXhwb3J0IGNvbnN0IFRFTlNPUl9UWVBFX0VMRU1fVFlQRSA9IDE7XHJcbmV4cG9ydCBjb25zdCBURU5TT1JfVFlQRV9TSEFQRSA9IDI7XHJcblxyXG4vLyBUZW5zb3JTaGFwZVByb3RvLkRpbWVuc2lvblxyXG5leHBvcnQgY29uc3QgU0hBUEVfRElNID0gMTtcclxuZXhwb3J0IGNvbnN0IERJTV9WQUxVRSA9IDE7XHJcbmV4cG9ydCBjb25zdCBESU1fU1lNQk9MID0gMjtcclxuXHJcbi8vIFRlbnNvclByb3RvIChpbml0aWFsaXplcilcclxuZXhwb3J0IGNvbnN0IFRFTlNPUl9ESU1TID0gMTtcclxuZXhwb3J0IGNvbnN0IFRFTlNPUl9EQVRBX1RZUEUgPSAyO1xyXG5leHBvcnQgY29uc3QgVEVOU09SX0ZMT0FUX0RBVEEgPSA0O1xyXG5leHBvcnQgY29uc3QgVEVOU09SX0lOVDMyX0RBVEEgPSA1O1xyXG5leHBvcnQgY29uc3QgVEVOU09SX1NUUklOR19EQVRBID0gNjtcclxuZXhwb3J0IGNvbnN0IFRFTlNPUl9JTlQ2NF9EQVRBID0gNztcclxuZXhwb3J0IGNvbnN0IFRFTlNPUl9OQU1FID0gODtcclxuZXhwb3J0IGNvbnN0IFRFTlNPUl9SQVdfREFUQSA9IDk7XHJcbmV4cG9ydCBjb25zdCBURU5TT1JfRE9VQkxFX0RBVEEgPSAxMDtcclxuZXhwb3J0IGNvbnN0IFRFTlNPUl9VSU5UNjRfREFUQSA9IDExO1xyXG5cclxuLy8g4pSA4pSA4pSAIE1heCBjb25zdGFudHMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG5leHBvcnQgY29uc3QgS0VZX01BWF9MRU5HVEggPSAxMjg7XHJcbmV4cG9ydCBjb25zdCBURU5TT1JfTUFYX0RJTUVOU0lPTiA9IDg7XHJcblxyXG4vLyDilIDilIDilIAgUGFyc2VkIHN0cnVjdHVyZXMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4vKipcclxuICogQSBwYXJzZWQgdGVuc29yIGluaXRpYWxpemVyICh3ZWlnaHRzLCBiaWFzZXMsIGV0Yy4pLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBPbm54VGVuc29ySW5mbyB7XHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICBkYXRhVHlwZTogT25ueERhdGFUeXBlO1xyXG4gICAgZGltczogbnVtYmVyW107XHJcbiAgICBmbG9hdERhdGE/OiBGbG9hdDMyQXJyYXk7XHJcbiAgICByYXdEYXRhPzogVWludDhBcnJheTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEEgcGFyc2VkIE9OTlggb3BlcmF0b3Igbm9kZS5cclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgT25ueE5vZGVJbmZvIHtcclxuICAgIG5hbWU6IHN0cmluZztcclxuICAgIG9wVHlwZTogc3RyaW5nO1xyXG4gICAgaW5wdXRzOiBzdHJpbmdbXTtcclxuICAgIG91dHB1dHM6IHN0cmluZ1tdO1xyXG4gICAgYXR0cmlidXRlczogTWFwPHN0cmluZywgbnVtYmVyPjsgLy8gZmxvYXQgb3IgaW50IGF0dHJpYnV0ZXNcclxuICAgIHRlbnNvckF0dHJpYnV0ZXM/OiBNYXA8c3RyaW5nLCBPbm54VGVuc29ySW5mbz47IC8vIHRlbnNvci12YWx1ZWQgYXR0cmlidXRlc1xyXG59XHJcblxyXG4vKipcclxuICogQSBwYXJzZWQgdmFsdWUgaW5mbyAoZ3JhcGggaW5wdXQvb3V0cHV0IHdpdGggc2hhcGUgbWV0YWRhdGEpLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBPbm54VmFsdWVJbmZvIHtcclxuICAgIG5hbWU6IHN0cmluZztcclxuICAgIHR5cGU6IE9ubnhMaW5rVHlwZTtcclxuICAgIGVsZW1UeXBlOiBPbm54RGF0YVR5cGU7XHJcbiAgICBzaGFwZTogbnVtYmVyW107XHJcbn1cclxuIiwiLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBPTk5YIG1vZGVsIHdyaXRlclxuLy9cbi8vIFN5bW1ldHJpYyBjb3VudGVycGFydCB0byBvbm54LXBhcnNlci50cy5cbi8vIFNlcmlhbGl6ZXMgYW4gT25ueFBhcnNlUmVzdWx0IGJhY2sgaW50byBhIHZhbGlkIE9OTlggcHJvdG9idWYgYmluYXJ5LFxuLy8gcmV1c2luZyB0aGUgc2FtZSBmaWVsZCBjb25zdGFudHMgYW5kIGRhdGEgc3RydWN0dXJlcy5cbi8vXG4vLyBaZXJvIGRlcGVuZGVuY2llcyBiZXlvbmQgdGhlIGxvY2FsIHBiLyB3cml0ZXIgYW5kIG9ubngtdHlwZXMuXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuaW1wb3J0IHsgUEJXcml0ZXIgfSBmcm9tIFwiLi9wYi93cml0ZXJcIjtcbmltcG9ydCB7IFdpcmVUeXBlIH0gZnJvbSBcIi4vcGIvcmVhZGVyXCI7XG5pbXBvcnQge1xuICAgIE9ubnhEYXRhVHlwZSxcbiAgICBPbm54Tm9kZUluZm8sXG4gICAgT25ueFRlbnNvckluZm8sXG4gICAgT25ueFZhbHVlSW5mbyxcbiAgICAvLyBNb2RlbFByb3RvIGZpZWxkc1xuICAgIE1PREVMX0lSX1ZFUlNJT04sXG4gICAgTU9ERUxfR1JBUEgsXG4gICAgLy8gR3JhcGhQcm90byBmaWVsZHNcbiAgICBHUkFQSF9OT0RFLFxuICAgIEdSQVBIX05BTUUsXG4gICAgR1JBUEhfSU5JVElBTElaRVIsXG4gICAgR1JBUEhfSU5QVVQsXG4gICAgR1JBUEhfT1VUUFVULFxuICAgIEdSQVBIX1ZBTFVFX0lORk8sXG4gICAgLy8gTm9kZVByb3RvIGZpZWxkc1xuICAgIE5PREVfSU5QVVQsXG4gICAgTk9ERV9PVVRQVVQsXG4gICAgTk9ERV9OQU1FLFxuICAgIE5PREVfT1BfVFlQRSxcbiAgICBOT0RFX0FUVFJJQlVURSxcbiAgICAvLyBBdHRyaWJ1dGVQcm90byBmaWVsZHNcbiAgICBBVFRfTkFNRSxcbiAgICBBVFRfRkxPQVQsXG4gICAgQVRUX0lOVCxcbiAgICAvLyBWYWx1ZUluZm9Qcm90byBmaWVsZHNcbiAgICBWSU5GT19OQU1FLFxuICAgIFZJTkZPX1RZUEUsXG4gICAgLy8gVHlwZVByb3RvIGZpZWxkc1xuICAgIFRZUEVfVEVOU09SLFxuICAgIC8vIFRlbnNvclR5cGVQcm90byBmaWVsZHNcbiAgICBURU5TT1JfVFlQRV9FTEVNX1RZUEUsXG4gICAgVEVOU09SX1RZUEVfU0hBUEUsXG4gICAgLy8gU2hhcGUgZmllbGRzXG4gICAgU0hBUEVfRElNLFxuICAgIERJTV9WQUxVRSxcbiAgICAvLyBUZW5zb3JQcm90byBmaWVsZHNcbiAgICBURU5TT1JfRElNUyxcbiAgICBURU5TT1JfREFUQV9UWVBFLFxuICAgIFRFTlNPUl9GTE9BVF9EQVRBLFxuICAgIFRFTlNPUl9OQU1FLFxuICAgIFRFTlNPUl9SQVdfREFUQSxcbn0gZnJvbSBcIi4vb25ueC10eXBlc1wiO1xuaW1wb3J0IHsgT25ueFBhcnNlUmVzdWx0IH0gZnJvbSBcIi4vb25ueC1wYXJzZXJcIjtcblxuLy8g4pSA4pSA4pSAIE9ubnhXcml0ZXIg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbi8qKlxuICogU2VyaWFsaXplcyBhbiBPbm54UGFyc2VSZXN1bHQgaW50byBPTk5YIHByb3RvYnVmIGJpbmFyeS5cbiAqXG4gKiBVc2FnZTpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHJlc3VsdCA9IE9ubnhQYXJzZXIucGFyc2Uob3JpZ2luYWxCeXRlcyk7XG4gKiAvLyDigKYgbW9kaWZ5IHJlc3VsdCDigKZcbiAqIGNvbnN0IGJ5dGVzID0gT25ueFdyaXRlci5zZXJpYWxpemUocmVzdWx0KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgT25ueFdyaXRlciB7XG4gICAgLyoqXG4gICAgICogU2VyaWFsaXplIGFuIE9ubnhQYXJzZVJlc3VsdCB0byByYXcgT05OWCBwcm90b2J1ZiBieXRlcy5cbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHNlcmlhbGl6ZShtb2RlbDogT25ueFBhcnNlUmVzdWx0KTogVWludDhBcnJheSB7XG4gICAgICAgIGNvbnN0IHdyaXRlciA9IG5ldyBPbm54V3JpdGVyKCk7XG4gICAgICAgIHJldHVybiB3cml0ZXIuX3dyaXRlTW9kZWwobW9kZWwpO1xuICAgIH1cblxuICAgIC8vIOKUgOKUgCBNb2RlbCAoTW9kZWxQcm90bykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICBwcml2YXRlIF93cml0ZU1vZGVsKG1vZGVsOiBPbm54UGFyc2VSZXN1bHQpOiBVaW50OEFycmF5IHtcbiAgICAgICAgY29uc3QgdyA9IG5ldyBQQldyaXRlcigpO1xuXG4gICAgICAgIC8vIGlyX3ZlcnNpb24gKGZpZWxkIDEsIHZhcmludClcbiAgICAgICAgaWYgKG1vZGVsLmlyVmVyc2lvbiA+IDApIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoTU9ERUxfSVJfVkVSU0lPTiwgV2lyZVR5cGUuVkFSSU5UKTtcbiAgICAgICAgICAgIHcud3JpdGVJbnQzMihtb2RlbC5pclZlcnNpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZ3JhcGggKGZpZWxkIDcsIGxlbmd0aC1kZWxpbWl0ZWQpXG4gICAgICAgIHcud3JpdGVUYWcoTU9ERUxfR1JBUEgsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgIHcud3JpdGVTdWJNZXNzYWdlKChzdWIpID0+IHRoaXMuX3dyaXRlR3JhcGgoc3ViLCBtb2RlbCkpO1xuXG4gICAgICAgIHJldHVybiB3LmZpbmlzaCgpLnNsaWNlKCk7IC8vIGRldGFjaCBmcm9tIGludGVybmFsIGJ1ZmZlclxuICAgIH1cblxuICAgIC8vIOKUgOKUgCBHcmFwaCAoR3JhcGhQcm90bykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICBwcml2YXRlIF93cml0ZUdyYXBoKHc6IFBCV3JpdGVyLCBtb2RlbDogT25ueFBhcnNlUmVzdWx0KTogdm9pZCB7XG4gICAgICAgIC8vIG5vZGVzIChmaWVsZCAxLCByZXBlYXRlZClcbiAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIG1vZGVsLm5vZGVzKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKEdSQVBIX05PREUsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlU3ViTWVzc2FnZSgoc3ViKSA9PiB0aGlzLl93cml0ZU5vZGUoc3ViLCBub2RlKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBuYW1lIChmaWVsZCAyKVxuICAgICAgICBpZiAobW9kZWwuZ3JhcGhOYW1lKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKEdSQVBIX05BTUUsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlU3RyaW5nKG1vZGVsLmdyYXBoTmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpbml0aWFsaXplcnMgKGZpZWxkIDUsIHJlcGVhdGVkKVxuICAgICAgICBmb3IgKGNvbnN0IGluaXQgb2YgbW9kZWwuaW5pdGlhbGl6ZXJzKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKEdSQVBIX0lOSVRJQUxJWkVSLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN1Yk1lc3NhZ2UoKHN1YikgPT4gdGhpcy5fd3JpdGVJbml0aWFsaXplcihzdWIsIGluaXQpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlucHV0cyAoZmllbGQgMTEsIHJlcGVhdGVkKVxuICAgICAgICBmb3IgKGNvbnN0IGlucHV0IG9mIG1vZGVsLmlucHV0cykge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhHUkFQSF9JTlBVVCwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdWJNZXNzYWdlKChzdWIpID0+IHRoaXMuX3dyaXRlVmFsdWVJbmZvKHN1YiwgaW5wdXQpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG91dHB1dHMgKGZpZWxkIDEyLCByZXBlYXRlZClcbiAgICAgICAgZm9yIChjb25zdCBvdXRwdXQgb2YgbW9kZWwub3V0cHV0cykge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhHUkFQSF9PVVRQVVQsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlU3ViTWVzc2FnZSgoc3ViKSA9PiB0aGlzLl93cml0ZVZhbHVlSW5mbyhzdWIsIG91dHB1dCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsdWVfaW5mbyAoZmllbGQgMTMsIHJlcGVhdGVkKVxuICAgICAgICBmb3IgKGNvbnN0IHZpIG9mIG1vZGVsLnZhbHVlSW5mb3MpIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoR1JBUEhfVkFMVUVfSU5GTywgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdWJNZXNzYWdlKChzdWIpID0+IHRoaXMuX3dyaXRlVmFsdWVJbmZvKHN1YiwgdmkpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIOKUgOKUgCBOb2RlIChOb2RlUHJvdG8pIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gICAgcHJpdmF0ZSBfd3JpdGVOb2RlKHc6IFBCV3JpdGVyLCBub2RlOiBPbm54Tm9kZUluZm8pOiB2b2lkIHtcbiAgICAgICAgLy8gaW5wdXRzIChmaWVsZCAxLCByZXBlYXRlZCBzdHJpbmcpXG4gICAgICAgIGZvciAoY29uc3QgaW5wdXQgb2Ygbm9kZS5pbnB1dHMpIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoTk9ERV9JTlBVVCwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdHJpbmcoaW5wdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gb3V0cHV0cyAoZmllbGQgMiwgcmVwZWF0ZWQgc3RyaW5nKVxuICAgICAgICBmb3IgKGNvbnN0IG91dHB1dCBvZiBub2RlLm91dHB1dHMpIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoTk9ERV9PVVRQVVQsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlU3RyaW5nKG91dHB1dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBuYW1lIChmaWVsZCAzKVxuICAgICAgICBpZiAobm9kZS5uYW1lKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKE5PREVfTkFNRSwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdHJpbmcobm9kZS5uYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG9wX3R5cGUgKGZpZWxkIDQpXG4gICAgICAgIGlmIChub2RlLm9wVHlwZSkge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhOT0RFX09QX1RZUEUsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlU3RyaW5nKG5vZGUub3BUeXBlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGF0dHJpYnV0ZXMgKGZpZWxkIDUsIHJlcGVhdGVkKVxuICAgICAgICBmb3IgKGNvbnN0IFtuYW1lLCB2YWx1ZV0gb2Ygbm9kZS5hdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKE5PREVfQVRUUklCVVRFLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN1Yk1lc3NhZ2UoKHN1YikgPT4gdGhpcy5fd3JpdGVBdHRyaWJ1dGUoc3ViLCBuYW1lLCB2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIEF0dHJpYnV0ZSAoQXR0cmlidXRlUHJvdG8pIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gICAgcHJpdmF0ZSBfd3JpdGVBdHRyaWJ1dGUodzogUEJXcml0ZXIsIG5hbWU6IHN0cmluZywgdmFsdWU6IG51bWJlcik6IHZvaWQge1xuICAgICAgICAvLyBuYW1lIChmaWVsZCAxKVxuICAgICAgICB3LndyaXRlVGFnKEFUVF9OQU1FLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICB3LndyaXRlU3RyaW5nKG5hbWUpO1xuXG4gICAgICAgIGlmIChOdW1iZXIuaXNJbnRlZ2VyKHZhbHVlKSkge1xuICAgICAgICAgICAgLy8gaW50IChmaWVsZCAzLCB2YXJpbnQg4oCUIHN0b3JlZCBhcyBpbnQ2NCBpbiBPTk5YKVxuICAgICAgICAgICAgdy53cml0ZVRhZyhBVFRfSU5ULCBXaXJlVHlwZS5WQVJJTlQpO1xuICAgICAgICAgICAgdy53cml0ZUludDY0KHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGZsb2F0IChmaWVsZCAyLCBmaXhlZDMyKVxuICAgICAgICAgICAgdy53cml0ZVRhZyhBVFRfRkxPQVQsIFdpcmVUeXBlLkZJWEVEMzIpO1xuICAgICAgICAgICAgdy53cml0ZUZsb2F0KHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIOKUgOKUgCBWYWx1ZUluZm8gKFZhbHVlSW5mb1Byb3RvKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIHByaXZhdGUgX3dyaXRlVmFsdWVJbmZvKHc6IFBCV3JpdGVyLCBpbmZvOiBPbm54VmFsdWVJbmZvKTogdm9pZCB7XG4gICAgICAgIC8vIG5hbWUgKGZpZWxkIDEpXG4gICAgICAgIGlmIChpbmZvLm5hbWUpIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoVklORk9fTkFNRSwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdHJpbmcoaW5mby5uYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHR5cGUgKGZpZWxkIDIpIOKGkiBUeXBlUHJvdG8g4oaSIHRlbnNvcl90eXBlIChmaWVsZCAxKSDihpIgVGVuc29yVHlwZVByb3RvXG4gICAgICAgIGlmIChpbmZvLmVsZW1UeXBlICE9PSBPbm54RGF0YVR5cGUuVU5ERUZJTkVEIHx8IGluZm8uc2hhcGUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhWSU5GT19UWVBFLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN1Yk1lc3NhZ2UoKHR5cGVXKSA9PiB7XG4gICAgICAgICAgICAgICAgdHlwZVcud3JpdGVUYWcoVFlQRV9URU5TT1IsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICAgICAgdHlwZVcud3JpdGVTdWJNZXNzYWdlKCh0dFcpID0+IHRoaXMuX3dyaXRlVGVuc29yVHlwZSh0dFcsIGluZm8pKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIFRlbnNvclR5cGVQcm90byDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIHByaXZhdGUgX3dyaXRlVGVuc29yVHlwZSh3OiBQQldyaXRlciwgaW5mbzogT25ueFZhbHVlSW5mbyk6IHZvaWQge1xuICAgICAgICAvLyBlbGVtX3R5cGUgKGZpZWxkIDEsIHZhcmludClcbiAgICAgICAgaWYgKGluZm8uZWxlbVR5cGUgIT09IE9ubnhEYXRhVHlwZS5VTkRFRklORUQpIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoVEVOU09SX1RZUEVfRUxFTV9UWVBFLCBXaXJlVHlwZS5WQVJJTlQpO1xuICAgICAgICAgICAgdy53cml0ZUludDMyKGluZm8uZWxlbVR5cGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2hhcGUgKGZpZWxkIDIpIOKGkiBUZW5zb3JTaGFwZVByb3RvXG4gICAgICAgIGlmIChpbmZvLnNoYXBlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoVEVOU09SX1RZUEVfU0hBUEUsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlU3ViTWVzc2FnZSgoc2hhcGVXKSA9PiB0aGlzLl93cml0ZVRlbnNvclNoYXBlKHNoYXBlVywgaW5mby5zaGFwZSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIFRlbnNvclNoYXBlUHJvdG8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICBwcml2YXRlIF93cml0ZVRlbnNvclNoYXBlKHc6IFBCV3JpdGVyLCBzaGFwZTogbnVtYmVyW10pOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCBkaW0gb2Ygc2hhcGUpIHtcbiAgICAgICAgICAgIC8vIGRpbSAoZmllbGQgMSkg4oaSIERpbWVuc2lvblByb3RvXG4gICAgICAgICAgICB3LndyaXRlVGFnKFNIQVBFX0RJTSwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdWJNZXNzYWdlKChkaW1XKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gZGltX3ZhbHVlIChmaWVsZCAxLCB2YXJpbnQgaW50NjQpXG4gICAgICAgICAgICAgICAgZGltVy53cml0ZVRhZyhESU1fVkFMVUUsIFdpcmVUeXBlLlZBUklOVCk7XG4gICAgICAgICAgICAgICAgZGltVy53cml0ZUludDY0KGRpbSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIOKUgOKUgCBJbml0aWFsaXplciAoVGVuc29yUHJvdG8pIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gICAgcHJpdmF0ZSBfd3JpdGVJbml0aWFsaXplcih3OiBQQldyaXRlciwgdGVuc29yOiBPbm54VGVuc29ySW5mbyk6IHZvaWQge1xuICAgICAgICAvLyBkaW1zIChmaWVsZCAxLCBwYWNrZWQgdmFyaW50KVxuICAgICAgICBpZiAodGVuc29yLmRpbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhURU5TT1JfRElNUywgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIGNvbnN0IGRpbXMzMiA9IG5ldyBJbnQzMkFycmF5KHRlbnNvci5kaW1zKTtcbiAgICAgICAgICAgIHcud3JpdGVQYWNrZWRJbnQzMihkaW1zMzIsIGRpbXMzMi5sZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZGF0YV90eXBlIChmaWVsZCAyLCB2YXJpbnQpXG4gICAgICAgIHcud3JpdGVUYWcoVEVOU09SX0RBVEFfVFlQRSwgV2lyZVR5cGUuVkFSSU5UKTtcbiAgICAgICAgdy53cml0ZUludDMyKHRlbnNvci5kYXRhVHlwZSk7XG5cbiAgICAgICAgLy8gZmxvYXRfZGF0YSAoZmllbGQgNCwgcGFja2VkIGZsb2F0MzIpIG9yIHJhd19kYXRhIChmaWVsZCA5LCBieXRlcylcbiAgICAgICAgaWYgKHRlbnNvci5mbG9hdERhdGEgJiYgdGVuc29yLmZsb2F0RGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKFRFTlNPUl9GTE9BVF9EQVRBLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVBhY2tlZEZsb2F0MzIodGVuc29yLmZsb2F0RGF0YSwgdGVuc29yLmZsb2F0RGF0YS5sZW5ndGgpO1xuICAgICAgICB9IGVsc2UgaWYgKHRlbnNvci5yYXdEYXRhICYmIHRlbnNvci5yYXdEYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoVEVOU09SX1JBV19EQVRBLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZUJ5dGVzKHRlbnNvci5yYXdEYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG5hbWUgKGZpZWxkIDgpXG4gICAgICAgIGlmICh0ZW5zb3IubmFtZSkge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhURU5TT1JfTkFNRSwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdHJpbmcodGVuc29yLm5hbWUpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBJVGVuc29yIH0gZnJvbSBcIi4uLy4uL2NvbXB1dGUvY29tcHV0ZS5pbnRlcmZhY2VzXCI7XHJcbmltcG9ydCB7IE9ubnhPcE5vZGUsIG1ha2VUZW5zb3IsIE9ubnhPcFJlZ2lzdHJ5IH0gZnJvbSBcIi4uL3JlZ2lzdHJ5XCI7XHJcbmltcG9ydCB0eXBlIHsgT25ueE5vZGVJbmZvIH0gZnJvbSBcIi4uL29ubngtdHlwZXNcIjtcclxuXHJcbmZ1bmN0aW9uIHVuYXJ5TWFwKGlucDogSVRlbnNvciwgZm46ICh4OiBudW1iZXIpID0+IG51bWJlcik6IElUZW5zb3Ige1xyXG4gICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShpbnAuZGF0YS5sZW5ndGgpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnAuZGF0YS5sZW5ndGg7IGkrKykgb3V0W2ldID0gZm4oaW5wLmRhdGFbaV0pO1xyXG4gICAgcmV0dXJuIG1ha2VUZW5zb3Iob3V0LCBbLi4uaW5wLnNoYXBlXSk7XHJcbn1cclxuXHJcbmNsYXNzIFJlbHVOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIHJldHVybiBbdW5hcnlNYXAoaW5wdXRzWzBdLCAoeCkgPT4gTWF0aC5tYXgoMCwgeCkpXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU2lnbW9pZE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnB1dHNbMF0sICh4KSA9PiAxIC8gKDEgKyBNYXRoLmV4cCgteCkpKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFRhbmhOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIHJldHVybiBbdW5hcnlNYXAoaW5wdXRzWzBdLCBNYXRoLnRhbmgpXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgTGVha3lSZWx1Tm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBhbHBoYTogbnVtYmVyO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmFscGhhID0gdGhpcy5hdHRyKFwiYWxwaGFcIiwgMC4wMSk7XHJcbiAgICB9XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBhID0gdGhpcy5hbHBoYTtcclxuICAgICAgICByZXR1cm4gW3VuYXJ5TWFwKGlucHV0c1swXSwgKHgpID0+ICh4ID49IDAgPyB4IDogYSAqIHgpKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIENsaXBOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IG1pbiA9IGlucHV0cy5sZW5ndGggPj0gMiAmJiBpbnB1dHNbMV0gPyBpbnB1dHNbMV0uZGF0YVswXSA6IC1JbmZpbml0eTtcclxuICAgICAgICBjb25zdCBtYXggPSBpbnB1dHMubGVuZ3RoID49IDMgJiYgaW5wdXRzWzJdID8gaW5wdXRzWzJdLmRhdGFbMF0gOiBJbmZpbml0eTtcclxuICAgICAgICByZXR1cm4gW3VuYXJ5TWFwKGlucHV0c1swXSwgKHgpID0+IE1hdGgubWluKE1hdGgubWF4KHgsIG1pbiksIG1heCkpXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU29mdG1heE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYXhpczogbnVtYmVyO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmF4aXMgPSB0aGlzLmF0dHJJbnQoXCJheGlzXCIsIC0xKTtcclxuICAgIH1cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGlucCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBzaGFwZSA9IGlucC5zaGFwZTtcclxuICAgICAgICBjb25zdCByYW5rID0gc2hhcGUubGVuZ3RoO1xyXG4gICAgICAgIGNvbnN0IGF4aXMgPSB0aGlzLmF4aXMgPCAwID8gcmFuayArIHRoaXMuYXhpcyA6IHRoaXMuYXhpcztcclxuXHJcbiAgICAgICAgaWYgKHJhbmsgPD0gMSB8fCBheGlzID09PSByYW5rIC0gMSkge1xyXG4gICAgICAgICAgICAvLyBTb2Z0bWF4IG92ZXIgbGFzdCBkaW1cclxuICAgICAgICAgICAgY29uc3QgY29scyA9IHNoYXBlW3JhbmsgLSAxXSA/PyBpbnAuZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvd3MgPSBpbnAuZGF0YS5sZW5ndGggLyBjb2xzO1xyXG4gICAgICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGlucC5kYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgcm93czsgcisrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbWF4VmFsID0gLUluZmluaXR5O1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCBjb2xzOyBjKyspIG1heFZhbCA9IE1hdGgubWF4KG1heFZhbCwgaW5wLmRhdGFbciAqIGNvbHMgKyBjXSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W3IgKiBjb2xzICsgY10gPSBNYXRoLmV4cChpbnAuZGF0YVtyICogY29scyArIGNdIC0gbWF4VmFsKTtcclxuICAgICAgICAgICAgICAgICAgICBzdW0gKz0gb3V0W3IgKiBjb2xzICsgY107XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMrKykgb3V0W3IgKiBjb2xzICsgY10gLz0gc3VtO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFsuLi5zaGFwZV0pXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gRmFsbGJhY2s6IGZsYXR0ZW4gc29mdG1heFxyXG4gICAgICAgIHJldHVybiBbdW5hcnlNYXAoaW5wLCAoeCkgPT4geCldO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBFeHBOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIHJldHVybiBbdW5hcnlNYXAoaW5wdXRzWzBdLCBNYXRoLmV4cCldO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBMb2dOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIHJldHVybiBbdW5hcnlNYXAoaW5wdXRzWzBdLCBNYXRoLmxvZyldO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBTcXJ0Tm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICByZXR1cm4gW3VuYXJ5TWFwKGlucHV0c1swXSwgTWF0aC5zcXJ0KV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEFic05vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnB1dHNbMF0sIE1hdGguYWJzKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIE5lZ05vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnB1dHNbMF0sICh4KSA9PiAteCldO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJBY3RpdmF0aW9uT3BzKHJlZ2lzdHJ5OiBPbm54T3BSZWdpc3RyeSk6IHZvaWQge1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJSZWx1XCIsIChpbmZvKSA9PiBuZXcgUmVsdU5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTaWdtb2lkXCIsIChpbmZvKSA9PiBuZXcgU2lnbW9pZE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJUYW5oXCIsIChpbmZvKSA9PiBuZXcgVGFuaE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJMZWFreVJlbHVcIiwgKGluZm8pID0+IG5ldyBMZWFreVJlbHVOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiQ2xpcFwiLCAoaW5mbykgPT4gbmV3IENsaXBOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiU29mdG1heFwiLCAoaW5mbykgPT4gbmV3IFNvZnRtYXhOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiRXhwXCIsIChpbmZvKSA9PiBuZXcgRXhwTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkxvZ1wiLCAoaW5mbykgPT4gbmV3IExvZ05vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTcXJ0XCIsIChpbmZvKSA9PiBuZXcgU3FydE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJBYnNcIiwgKGluZm8pID0+IG5ldyBBYnNOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiTmVnXCIsIChpbmZvKSA9PiBuZXcgTmVnTm9kZShpbmZvKSk7XHJcbn1cclxuIiwiaW1wb3J0IHR5cGUgeyBJVGVuc29yIH0gZnJvbSBcIi4uLy4uL2NvbXB1dGUvY29tcHV0ZS5pbnRlcmZhY2VzXCI7XHJcbmltcG9ydCB0eXBlIHsgT25ueE5vZGVJbmZvIH0gZnJvbSBcIi4uL29ubngtdHlwZXNcIjtcclxuaW1wb3J0IHsgT25ueE9wTm9kZSwgbWFrZVRlbnNvciwgT25ueE9wUmVnaXN0cnkgfSBmcm9tIFwiLi4vcmVnaXN0cnlcIjtcclxuXHJcbi8qKlxyXG4gKiBDb252OiAyRCBjb252b2x1dGlvbi5cclxuICogSW5wdXQ6IFtOLCBDX2luLCBILCBXXSAoYnV0IHdlIHN1cHBvcnQgW04sIENfaW4sIExdIGZvciAxRCBhbmQgW04sIENfaW4sIEgsIFddIGZvciAyRClcclxuICogTGltaXRlZCB0byAyRCB0ZW5zb3JzIGxheW91dDogW2JhdGNoLCBjaGFubmVscywgaGVpZ2h0LCB3aWR0aF0g4oaSIHRyZWF0ZWQgYXMgW2JhdGNoLCBmZWF0dXJlc10uXHJcbiAqXHJcbiAqIEZvciBvdXIgMkQtbGltaXRlZCBzY29wZTogaW5wdXQgaXMgWzEsIENfaW4gKiBIICogV10sIGtlcm5lbCBpcyBbQ19vdXQsIENfaW4sIGtILCBrV10uXHJcbiAqIFNpbXBsaWZpZWQ6IHRyZWF0cyBhcyBtYXRyaXggbXVsdGlwbHkgaWYgc2hhcGVzIGFyZSAyRC5cclxuICovXHJcbmNsYXNzIENvbnZOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGtlcm5lbFNoYXBlOiBudW1iZXJbXTtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3RyaWRlczogbnVtYmVyW107XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhZHM6IG51bWJlcltdO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5rZXJuZWxTaGFwZSA9IFt0aGlzLmF0dHJJbnQoXCJrZXJuZWxfc2hhcGVcIiwgMyldO1xyXG4gICAgICAgIHRoaXMuc3RyaWRlcyA9IFt0aGlzLmF0dHJJbnQoXCJzdHJpZGVzXCIsIDEpXTtcclxuICAgICAgICB0aGlzLnBhZHMgPSBbdGhpcy5hdHRySW50KFwicGFkc1wiLCAwKV07XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgWCA9IGlucHV0c1swXTsgLy8gW04sIENfaW4sIC4uLnNwYXRpYWxdXHJcbiAgICAgICAgY29uc3QgVyA9IGlucHV0c1sxXTsgLy8gW0Nfb3V0LCBDX2luL2dyb3VwLCAuLi5rZXJuZWxdXHJcbiAgICAgICAgY29uc3QgQiA9IGlucHV0cy5sZW5ndGggPiAyID8gaW5wdXRzWzJdIDogbnVsbDtcclxuXHJcbiAgICAgICAgLy8gU2ltcGxpZmllZCAxRCBjb252b2x1dGlvbiBmb3IgMkQgdGVuc29ycyBbYmF0Y2gsIGZlYXR1cmVzXVxyXG4gICAgICAgIGlmIChYLnNoYXBlLmxlbmd0aCA8PSAyKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZlYXR1cmVzID0gWC5zaGFwZS5sZW5ndGggPT09IDIgPyBYLnNoYXBlWzFdIDogWC5kYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3Qgb3V0RmVhdHVyZXMgPSBXLnNoYXBlWzBdID8/IFcuZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gWC5zaGFwZVswXSA/PyAxO1xyXG5cclxuICAgICAgICAgICAgLy8gVHJlYXQgYXMgZnVsbHkgY29ubmVjdGVkOiBvdXQgPSBYIEAgV15UICsgQlxyXG4gICAgICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGJhdGNoICogb3V0RmVhdHVyZXMpO1xyXG4gICAgICAgICAgICBjb25zdCB3Q29scyA9IFcuZGF0YS5sZW5ndGggLyBvdXRGZWF0dXJlcztcclxuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBiYXRjaDsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBvID0gMDsgbyA8IG91dEZlYXR1cmVzOyBvKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBrTGVuID0gTWF0aC5taW4od0NvbHMsIGZlYXR1cmVzKTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGtMZW47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdW0gKz0gWC5kYXRhW24gKiBmZWF0dXJlcyArIGldICogVy5kYXRhW28gKiB3Q29scyArIGldO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoQikgc3VtICs9IEIuZGF0YVtvICUgQi5kYXRhLmxlbmd0aF07XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W24gKiBvdXRGZWF0dXJlcyArIG9dID0gc3VtO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtiYXRjaCwgb3V0RmVhdHVyZXNdKV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAzRDogW04sIENfaW4sIExdIOKGkiAxRCBjb252XHJcbiAgICAgICAgY29uc3QgTiA9IFguc2hhcGVbMF07XHJcbiAgICAgICAgY29uc3QgQ19pbiA9IFguc2hhcGVbMV07XHJcbiAgICAgICAgY29uc3QgTCA9IFguc2hhcGVbMl07XHJcbiAgICAgICAgY29uc3QgQ19vdXQgPSBXLnNoYXBlWzBdO1xyXG4gICAgICAgIGNvbnN0IGtMID0gVy5zaGFwZS5sZW5ndGggPj0gMyA/IFcuc2hhcGVbMl0gOiB0aGlzLmtlcm5lbFNoYXBlWzBdO1xyXG4gICAgICAgIGNvbnN0IHN0cmlkZSA9IHRoaXMuc3RyaWRlc1swXTtcclxuICAgICAgICBjb25zdCBwYWQgPSB0aGlzLnBhZHNbMF07XHJcbiAgICAgICAgY29uc3Qgb3V0TCA9IE1hdGguZmxvb3IoKEwgKyAyICogcGFkIC0ga0wpIC8gc3RyaWRlKSArIDE7XHJcblxyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoTiAqIENfb3V0ICogb3V0TCk7XHJcbiAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgY28gPSAwOyBjbyA8IENfb3V0OyBjbysrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBvbCA9IDA7IG9sIDwgb3V0TDsgb2wrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGNpID0gMDsgY2kgPCBDX2luOyBjaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGtrID0gMDsga2sgPCBrTDsga2srKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWwgPSBvbCAqIHN0cmlkZSAtIHBhZCArIGtrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlsID49IDAgJiYgaWwgPCBMKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VtICs9IFguZGF0YVtuICogQ19pbiAqIEwgKyBjaSAqIEwgKyBpbF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBXLmRhdGFbY28gKiAoQ19pbiAqIGtMKSArIGNpICoga0wgKyBra107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKEIpIHN1bSArPSBCLmRhdGFbY29dO1xyXG4gICAgICAgICAgICAgICAgICAgIG91dFtuICogQ19vdXQgKiBvdXRMICsgY28gKiBvdXRMICsgb2xdID0gc3VtO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtOLCBDX291dCwgb3V0TF0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIE1heFBvb2w6IG1heCBwb29saW5nIG92ZXIgbGFzdCBzcGF0aWFsIGRpbWVuc2lvbihzKS5cclxuICogU3VwcG9ydHMgMUQgW04sIEMsIExdIGFuZCAyRCBmYWxsYmFjay5cclxuICovXHJcbmNsYXNzIE1heFBvb2xOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGtlcm5lbFNpemU6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3RyaWRlOiBudW1iZXI7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhZDogbnVtYmVyO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5rZXJuZWxTaXplID0gdGhpcy5hdHRySW50KFwia2VybmVsX3NoYXBlXCIsIDIpO1xyXG4gICAgICAgIHRoaXMuc3RyaWRlID0gdGhpcy5hdHRySW50KFwic3RyaWRlc1wiLCB0aGlzLmtlcm5lbFNpemUpO1xyXG4gICAgICAgIHRoaXMucGFkID0gdGhpcy5hdHRySW50KFwicGFkc1wiLCAwKTtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBYID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGlmIChYLnNoYXBlLmxlbmd0aCA9PT0gMykge1xyXG4gICAgICAgICAgICBjb25zdCBbTiwgQywgTF0gPSBYLnNoYXBlO1xyXG4gICAgICAgICAgICBjb25zdCBvdXRMID0gTWF0aC5mbG9vcigoTCArIDIgKiB0aGlzLnBhZCAtIHRoaXMua2VybmVsU2l6ZSkgLyB0aGlzLnN0cmlkZSkgKyAxO1xyXG4gICAgICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KE4gKiBDICogb3V0TCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgTjsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IEM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IG8gPSAwOyBvIDwgb3V0TDsgbysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBtYXggPSAtSW5maW5pdHk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgdGhpcy5rZXJuZWxTaXplOyBrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlsID0gbyAqIHRoaXMuc3RyaWRlIC0gdGhpcy5wYWQgKyBrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlsID49IDAgJiYgaWwgPCBMKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4ID0gTWF0aC5tYXgobWF4LCBYLmRhdGFbbiAqIEMgKiBMICsgYyAqIEwgKyBpbF0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dFtuICogQyAqIG91dEwgKyBjICogb3V0TCArIG9dID0gbWF4O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbTiwgQywgb3V0TF0pXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gMkQgZmFsbGJhY2s6IHBhc3N0aHJvdWdoXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoWC5kYXRhKSwgWy4uLlguc2hhcGVdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBdmVyYWdlUG9vbDogYXZlcmFnZSBwb29saW5nLlxyXG4gKi9cclxuY2xhc3MgQXZlcmFnZVBvb2xOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGtlcm5lbFNpemU6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3RyaWRlOiBudW1iZXI7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBhZDogbnVtYmVyO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5rZXJuZWxTaXplID0gdGhpcy5hdHRySW50KFwia2VybmVsX3NoYXBlXCIsIDIpO1xyXG4gICAgICAgIHRoaXMuc3RyaWRlID0gdGhpcy5hdHRySW50KFwic3RyaWRlc1wiLCB0aGlzLmtlcm5lbFNpemUpO1xyXG4gICAgICAgIHRoaXMucGFkID0gdGhpcy5hdHRySW50KFwicGFkc1wiLCAwKTtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBYID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGlmIChYLnNoYXBlLmxlbmd0aCA9PT0gMykge1xyXG4gICAgICAgICAgICBjb25zdCBbTiwgQywgTF0gPSBYLnNoYXBlO1xyXG4gICAgICAgICAgICBjb25zdCBvdXRMID0gTWF0aC5mbG9vcigoTCArIDIgKiB0aGlzLnBhZCAtIHRoaXMua2VybmVsU2l6ZSkgLyB0aGlzLnN0cmlkZSkgKyAxO1xyXG4gICAgICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KE4gKiBDICogb3V0TCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgTjsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IEM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IG8gPSAwOyBvIDwgb3V0TDsgbysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwLCBjb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgdGhpcy5rZXJuZWxTaXplOyBrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlsID0gbyAqIHRoaXMuc3RyaWRlIC0gdGhpcy5wYWQgKyBrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlsID49IDAgJiYgaWwgPCBMKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VtICs9IFguZGF0YVtuICogQyAqIEwgKyBjICogTCArIGlsXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dFtuICogQyAqIG91dEwgKyBjICogb3V0TCArIG9dID0gY291bnQgPiAwID8gc3VtIC8gY291bnQgOiAwO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbTiwgQywgb3V0TF0pXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoWC5kYXRhKSwgWy4uLlguc2hhcGVdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHbG9iYWxBdmVyYWdlUG9vbDogYXZlcmFnZSBvdmVyIGFsbCBzcGF0aWFsIGRpbXMg4oaSIFtOLCBDLCAxXSBvciBbTiwgQ10uXHJcbiAqL1xyXG5jbGFzcyBHbG9iYWxBdmVyYWdlUG9vbE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgWCA9IGlucHV0c1swXTtcclxuICAgICAgICBpZiAoWC5zaGFwZS5sZW5ndGggPj0gMykge1xyXG4gICAgICAgICAgICBjb25zdCBOID0gWC5zaGFwZVswXTtcclxuICAgICAgICAgICAgY29uc3QgQyA9IFguc2hhcGVbMV07XHJcbiAgICAgICAgICAgIGxldCBzcGF0aWFsID0gMTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPCBYLnNoYXBlLmxlbmd0aDsgaSsrKSBzcGF0aWFsICo9IFguc2hhcGVbaV07XHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoTiAqIEMpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IE47IG4rKykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCBDOyBjKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiYXNlID0gbiAqIEMgKiBzcGF0aWFsICsgYyAqIHNwYXRpYWw7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgcyA9IDA7IHMgPCBzcGF0aWFsOyBzKyspIHN1bSArPSBYLmRhdGFbYmFzZSArIHNdO1xyXG4gICAgICAgICAgICAgICAgICAgIG91dFtuICogQyArIGNdID0gc3VtIC8gc3BhdGlhbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBvdXRTaGFwZSA9IFtOLCBDLCAuLi5YLnNoYXBlLnNsaWNlKDIpLm1hcCgoKSA9PiAxKV07XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIG91dFNoYXBlKV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KFguZGF0YSksIFsuLi5YLnNoYXBlXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJDb252T3BzKHJlZ2lzdHJ5OiBPbm54T3BSZWdpc3RyeSk6IHZvaWQge1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJDb252XCIsIChpbmZvKSA9PiBuZXcgQ29udk5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJNYXhQb29sXCIsIChpbmZvKSA9PiBuZXcgTWF4UG9vbE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJBdmVyYWdlUG9vbFwiLCAoaW5mbykgPT4gbmV3IEF2ZXJhZ2VQb29sTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkdsb2JhbEF2ZXJhZ2VQb29sXCIsIChpbmZvKSA9PiBuZXcgR2xvYmFsQXZlcmFnZVBvb2xOb2RlKGluZm8pKTtcclxufVxyXG4iLCIvKipcbiAqIERTUCBvcGVyYXRvcnMgZm9yIGF1ZGlvIHByZXByb2Nlc3NpbmcgaW4gdGhlIFNwaWt5UGFuZGEgT05OWCBwaXBlbGluZS5cbiAqXG4gKiBUaGVzZSBhcmUgY3VzdG9tIG9wcyAobm90IHBhcnQgb2YgT05OWCBzdGFuZGFyZCkgdGhhdCBlbmFibGUgZW5kLXRvLWVuZFxuICogYXVkaW8gaW5mZXJlbmNlOiByYXcgYXVkaW8g4oaSIE1GQ0MgZmVhdHVyZXMg4oaSIG5ldXJhbCBuZXR3b3JrIOKGkiBjbGFzc2lmaWNhdGlvbi5cbiAqXG4gKiBGRlQgaW1wbGVtZW50YXRpb24gcG9ydGVkIGZyb20gR3VpbGxhdW1lIFBlbGxldGllcidzIGRzcC5qcyAoR2F1bWUvRkZUUGFuZWwpLlxuICpcbiAqIE9wczpcbiAqICAgU3BGRlQgICAgICAgICAgICDigJQgQ29vbGV5LVR1a2V5IHJhZGl4LTIgRkZULCBwb3dlciBzcGVjdHJ1bSBvdXRwdXRcbiAqICAgU3BNZWxGaWx0ZXJiYW5rICAg4oCUIE1lbC1zY2FsZSB0cmlhbmd1bGFyIGZpbHRlcmJhbmtcbiAqICAgU3BMb2dTY2FsZSAgICAgICAg4oCUIEVsZW1lbnQtd2lzZSBsb2cgd2l0aCBmbG9vclxuICogICBTcERDVCAgICAgICAgICAgICDigJQgVHlwZS1JSSBEaXNjcmV0ZSBDb3NpbmUgVHJhbnNmb3JtXG4gKiAgIFNwTUZDQyAgICAgICAgICAgIOKAlCBGdWxsIE1GQ0MgcGlwZWxpbmUgKFdpbmRvdyDihpIgRkZUIOKGkiBNZWwg4oaSIExvZyDihpIgRENUKVxuICogICBTcFdpbmRvdyAgICAgICAgICDigJQgQXBwbHkgd2luZG93IGZ1bmN0aW9uIChIYW5uLCBIYW1taW5nLCBldGMuKVxuICovXG5cbmltcG9ydCB0eXBlIHsgSVRlbnNvciB9IGZyb20gXCIuLi8uLi9jb21wdXRlL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xuaW1wb3J0IHR5cGUgeyBPbm54Tm9kZUluZm8gfSBmcm9tIFwiLi4vb25ueC10eXBlc1wiO1xuaW1wb3J0IHsgT25ueE9wTm9kZSwgbWFrZVRlbnNvciwgT25ueE9wUmVnaXN0cnkgfSBmcm9tIFwiLi4vcmVnaXN0cnlcIjtcblxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBGRlQg4oCUIENvb2xleS1UdWtleSByYWRpeC0yIChwb3J0ZWQgZnJvbSBkc3AuanMpXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuY2xhc3MgRkZURW5naW5lIHtcbiAgICByZWFkb25seSBzaXplOiBudW1iZXI7XG4gICAgcHJpdmF0ZSByZXZlcnNlVGFibGU6IFVpbnQzMkFycmF5O1xuICAgIHByaXZhdGUgc2luVGFibGU6IEZsb2F0NjRBcnJheTtcbiAgICBwcml2YXRlIGNvc1RhYmxlOiBGbG9hdDY0QXJyYXk7XG4gICAgcHJpdmF0ZSByZWFsOiBGbG9hdDY0QXJyYXk7XG4gICAgcHJpdmF0ZSBpbWFnOiBGbG9hdDY0QXJyYXk7XG5cbiAgICBjb25zdHJ1Y3RvcihzaXplOiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5zaXplID0gc2l6ZTtcbiAgICAgICAgdGhpcy5yZXZlcnNlVGFibGUgPSBuZXcgVWludDMyQXJyYXkoc2l6ZSk7XG4gICAgICAgIHRoaXMuc2luVGFibGUgPSBuZXcgRmxvYXQ2NEFycmF5KHNpemUpO1xuICAgICAgICB0aGlzLmNvc1RhYmxlID0gbmV3IEZsb2F0NjRBcnJheShzaXplKTtcbiAgICAgICAgdGhpcy5yZWFsID0gbmV3IEZsb2F0NjRBcnJheShzaXplKTtcbiAgICAgICAgdGhpcy5pbWFnID0gbmV3IEZsb2F0NjRBcnJheShzaXplKTtcblxuICAgICAgICAvLyBCdWlsZCBiaXQtcmV2ZXJzYWwgdGFibGVcbiAgICAgICAgbGV0IGxpbWl0ID0gMTtcbiAgICAgICAgbGV0IGJpdCA9IHNpemUgPj4gMTtcbiAgICAgICAgd2hpbGUgKGxpbWl0IDwgc2l6ZSkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW1pdDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXZlcnNlVGFibGVbaSArIGxpbWl0XSA9IHRoaXMucmV2ZXJzZVRhYmxlW2ldICsgYml0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGltaXQgPDw9IDE7XG4gICAgICAgICAgICBiaXQgPj49IDE7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmUtY29tcHV0ZSB0d2lkZGxlIGZhY3RvcnNcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuc2luVGFibGVbaV0gPSBNYXRoLnNpbigtTWF0aC5QSSAvIGkpO1xuICAgICAgICAgICAgdGhpcy5jb3NUYWJsZVtpXSA9IE1hdGguY29zKC1NYXRoLlBJIC8gaSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGb3J3YXJkIEZGVC4gUmV0dXJucyBwb3dlciBzcGVjdHJ1bSBbc2l6ZS8yICsgMV0uXG4gICAgICovXG4gICAgZm9yd2FyZChidWZmZXI6IEZsb2F0MzJBcnJheSk6IEZsb2F0MzJBcnJheSB7XG4gICAgICAgIGNvbnN0IE4gPSB0aGlzLnNpemU7XG4gICAgICAgIGNvbnN0IHJlYWwgPSB0aGlzLnJlYWw7XG4gICAgICAgIGNvbnN0IGltYWcgPSB0aGlzLmltYWc7XG4gICAgICAgIGNvbnN0IHJldmVyc2VUYWJsZSA9IHRoaXMucmV2ZXJzZVRhYmxlO1xuICAgICAgICBjb25zdCBjb3NUYWJsZSA9IHRoaXMuY29zVGFibGU7XG4gICAgICAgIGNvbnN0IHNpblRhYmxlID0gdGhpcy5zaW5UYWJsZTtcblxuICAgICAgICAvLyBCaXQtcmV2ZXJzYWwgcGVybXV0YXRpb25cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBOOyBpKyspIHtcbiAgICAgICAgICAgIHJlYWxbaV0gPSBidWZmZXJbcmV2ZXJzZVRhYmxlW2ldXTtcbiAgICAgICAgICAgIGltYWdbaV0gPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnV0dGVyZmx5IHN0YWdlc1xuICAgICAgICBsZXQgaGFsZlNpemUgPSAxO1xuICAgICAgICB3aGlsZSAoaGFsZlNpemUgPCBOKSB7XG4gICAgICAgICAgICBjb25zdCBwaGFzZVNoaWZ0U3RlcFJlYWwgPSBjb3NUYWJsZVtoYWxmU2l6ZV07XG4gICAgICAgICAgICBjb25zdCBwaGFzZVNoaWZ0U3RlcEltYWcgPSBzaW5UYWJsZVtoYWxmU2l6ZV07XG4gICAgICAgICAgICBsZXQgY3VycmVudFBoYXNlU2hpZnRSZWFsID0gMTtcbiAgICAgICAgICAgIGxldCBjdXJyZW50UGhhc2VTaGlmdEltYWcgPSAwO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBmZnRTdGVwID0gMDsgZmZ0U3RlcCA8IGhhbGZTaXplOyBmZnRTdGVwKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgaSA9IGZmdFN0ZXA7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGkgPCBOKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9mZiA9IGkgKyBoYWxmU2l6ZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHIgPSBjdXJyZW50UGhhc2VTaGlmdFJlYWwgKiByZWFsW29mZl0gLSBjdXJyZW50UGhhc2VTaGlmdEltYWcgKiBpbWFnW29mZl07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpID0gY3VycmVudFBoYXNlU2hpZnRSZWFsICogaW1hZ1tvZmZdICsgY3VycmVudFBoYXNlU2hpZnRJbWFnICogcmVhbFtvZmZdO1xuICAgICAgICAgICAgICAgICAgICByZWFsW29mZl0gPSByZWFsW2ldIC0gdHI7XG4gICAgICAgICAgICAgICAgICAgIGltYWdbb2ZmXSA9IGltYWdbaV0gLSB0aTtcbiAgICAgICAgICAgICAgICAgICAgcmVhbFtpXSArPSB0cjtcbiAgICAgICAgICAgICAgICAgICAgaW1hZ1tpXSArPSB0aTtcbiAgICAgICAgICAgICAgICAgICAgaSArPSBoYWxmU2l6ZSA8PCAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCB0bXBSZWFsID0gY3VycmVudFBoYXNlU2hpZnRSZWFsO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRQaGFzZVNoaWZ0UmVhbCA9IHRtcFJlYWwgKiBwaGFzZVNoaWZ0U3RlcFJlYWwgLSBjdXJyZW50UGhhc2VTaGlmdEltYWcgKiBwaGFzZVNoaWZ0U3RlcEltYWc7XG4gICAgICAgICAgICAgICAgY3VycmVudFBoYXNlU2hpZnRJbWFnID0gdG1wUmVhbCAqIHBoYXNlU2hpZnRTdGVwSW1hZyArIGN1cnJlbnRQaGFzZVNoaWZ0SW1hZyAqIHBoYXNlU2hpZnRTdGVwUmVhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGhhbGZTaXplIDw8PSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUG93ZXIgc3BlY3RydW1cbiAgICAgICAgY29uc3QgbkJpbnMgPSBOIC8gMiArIDE7XG4gICAgICAgIGNvbnN0IHBvd2VyID0gbmV3IEZsb2F0MzJBcnJheShuQmlucyk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbkJpbnM7IGkrKykge1xuICAgICAgICAgICAgcG93ZXJbaV0gPSByZWFsW2ldICogcmVhbFtpXSArIGltYWdbaV0gKiBpbWFnW2ldO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwb3dlcjtcbiAgICB9XG59XG5cbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gV2luZG93IGZ1bmN0aW9ucyAocG9ydGVkIGZyb20gZHNwLmpzKVxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5cbmZ1bmN0aW9uIGhhbm5XaW5kb3cobGVuZ3RoOiBudW1iZXIsIGluZGV4OiBudW1iZXIpOiBudW1iZXIge1xuICAgIHJldHVybiAwLjUgKiAoMSAtIE1hdGguY29zKDIgKiBNYXRoLlBJICogaW5kZXggLyAobGVuZ3RoIC0gMSkpKTtcbn1cblxuZnVuY3Rpb24gaGFtbWluZ1dpbmRvdyhsZW5ndGg6IG51bWJlciwgaW5kZXg6IG51bWJlcik6IG51bWJlciB7XG4gICAgcmV0dXJuIDAuNTQgLSAwLjQ2ICogTWF0aC5jb3MoMiAqIE1hdGguUEkgKiBpbmRleCAvIChsZW5ndGggLSAxKSk7XG59XG5cbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gTWVsIHNjYWxlIGhlbHBlcnNcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5mdW5jdGlvbiBoelRvTWVsKGh6OiBudW1iZXIpOiBudW1iZXIge1xuICAgIHJldHVybiAyNTk1ICogTWF0aC5sb2cxMCgxICsgaHogLyA3MDApO1xufVxuXG5mdW5jdGlvbiBtZWxUb0h6KG1lbDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICByZXR1cm4gNzAwICogKE1hdGgucG93KDEwLCBtZWwgLyAyNTk1KSAtIDEpO1xufVxuXG5mdW5jdGlvbiBidWlsZE1lbEZpbHRlcmJhbmsobk1lbHM6IG51bWJlciwgbkZmdDogbnVtYmVyLCBzYW1wbGVSYXRlOiBudW1iZXIpOiBGbG9hdDMyQXJyYXlbXSB7XG4gICAgY29uc3QgbkJpbnMgPSBuRmZ0IC8gMiArIDE7XG4gICAgY29uc3QgbWVsTWluID0gaHpUb01lbCgwKTtcbiAgICBjb25zdCBtZWxNYXggPSBoelRvTWVsKHNhbXBsZVJhdGUgLyAyKTtcblxuICAgIC8vIE1lbC1zcGFjZWQgY2VudGVyIGZyZXF1ZW5jaWVzXG4gICAgY29uc3QgbWVsUG9pbnRzID0gbmV3IEZsb2F0MzJBcnJheShuTWVscyArIDIpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbk1lbHMgKyAyOyBpKyspIHtcbiAgICAgICAgbWVsUG9pbnRzW2ldID0gbWVsTWluICsgKG1lbE1heCAtIG1lbE1pbikgKiBpIC8gKG5NZWxzICsgMSk7XG4gICAgfVxuXG4gICAgLy8gQ29udmVydCB0byBGRlQgYmluIGluZGljZXNcbiAgICBjb25zdCBiaW5zID0gbmV3IEludDMyQXJyYXkobk1lbHMgKyAyKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5NZWxzICsgMjsgaSsrKSB7XG4gICAgICAgIGJpbnNbaV0gPSBNYXRoLmZsb29yKChuRmZ0ICsgMSkgKiBtZWxUb0h6KG1lbFBvaW50c1tpXSkgLyBzYW1wbGVSYXRlKTtcbiAgICB9XG5cbiAgICAvLyBCdWlsZCB0cmlhbmd1bGFyIGZpbHRlcnNcbiAgICBjb25zdCBmYjogRmxvYXQzMkFycmF5W10gPSBbXTtcbiAgICBmb3IgKGxldCBtID0gMDsgbSA8IG5NZWxzOyBtKyspIHtcbiAgICAgICAgY29uc3Qgcm93ID0gbmV3IEZsb2F0MzJBcnJheShuQmlucyk7XG4gICAgICAgIGNvbnN0IGxlZnQgPSBiaW5zW21dLCBjZW50ZXIgPSBiaW5zW20gKyAxXSwgcmlnaHQgPSBiaW5zW20gKyAyXTtcbiAgICAgICAgZm9yIChsZXQgayA9IGxlZnQ7IGsgPCBjZW50ZXI7IGsrKykge1xuICAgICAgICAgICAgaWYgKGsgPj0gMCAmJiBrIDwgbkJpbnMpIHJvd1trXSA9IChrIC0gbGVmdCkgLyBNYXRoLm1heChjZW50ZXIgLSBsZWZ0LCAxKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBrID0gY2VudGVyOyBrIDw9IHJpZ2h0OyBrKyspIHtcbiAgICAgICAgICAgIGlmIChrID49IDAgJiYgayA8IG5CaW5zKSByb3dba10gPSAocmlnaHQgLSBrKSAvIE1hdGgubWF4KHJpZ2h0IC0gY2VudGVyLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBmYi5wdXNoKHJvdyk7XG4gICAgfVxuICAgIHJldHVybiBmYjtcbn1cblxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBEQ1QgVHlwZS1JSVxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5cbmZ1bmN0aW9uIGRjdElJKGlucHV0OiBGbG9hdDMyQXJyYXksIG5PdXRwdXQ6IG51bWJlcik6IEZsb2F0MzJBcnJheSB7XG4gICAgY29uc3QgTiA9IGlucHV0Lmxlbmd0aDtcbiAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KG5PdXRwdXQpO1xuICAgIGZvciAobGV0IGsgPSAwOyBrIDwgbk91dHB1dDsgaysrKSB7XG4gICAgICAgIGxldCBzdW0gPSAwO1xuICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IE47IG4rKykge1xuICAgICAgICAgICAgc3VtICs9IGlucHV0W25dICogTWF0aC5jb3MoTWF0aC5QSSAqIGsgKiAoMiAqIG4gKyAxKSAvICgyICogTikpO1xuICAgICAgICB9XG4gICAgICAgIG91dFtrXSA9IHN1bSAqIDI7IC8vIERDVC1JSSBzdGFuZGFyZCBzY2FsaW5nIGZhY3RvclxuICAgIH1cbiAgICByZXR1cm4gb3V0O1xufVxuXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIE9OTlggT3AgTm9kZXNcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG4vLyBGRlQgZW5naW5lIGNhY2hlIChhdm9pZCByZS1jcmVhdGluZyBwZXIgZnJhbWUpXG5jb25zdCBmZnRFbmdpbmVzID0gbmV3IE1hcDxudW1iZXIsIEZGVEVuZ2luZT4oKTtcbmZ1bmN0aW9uIGdldEZGVEVuZ2luZShzaXplOiBudW1iZXIpOiBGRlRFbmdpbmUge1xuICAgIGxldCBlbmdpbmUgPSBmZnRFbmdpbmVzLmdldChzaXplKTtcbiAgICBpZiAoIWVuZ2luZSkge1xuICAgICAgICBlbmdpbmUgPSBuZXcgRkZURW5naW5lKHNpemUpO1xuICAgICAgICBmZnRFbmdpbmVzLnNldChzaXplLCBlbmdpbmUpO1xuICAgIH1cbiAgICByZXR1cm4gZW5naW5lO1xufVxuXG4vKipcbiAqIFNwRkZUOiBjb21wdXRlIHBvd2VyIHNwZWN0cnVtIG9mIGEgMUQgc2lnbmFsLlxuICogSW5wdXQ6ICBbc2FtcGxlc10g4oCUIHRpbWUtZG9tYWluIGF1ZGlvIGZyYW1lXG4gKiBPdXRwdXQ6IFtuZmZ0LzIrMV0g4oCUIHBvd2VyIHNwZWN0cnVtXG4gKiBBdHRyaWJ1dGVzOiBuZmZ0IChkZWZhdWx0IDUxMilcbiAqL1xuY2xhc3MgU3BGRlROb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XG4gICAgcHJpdmF0ZSByZWFkb25seSBuZmZ0OiBudW1iZXI7XG5cbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcbiAgICAgICAgc3VwZXIoaW5mbyk7XG4gICAgICAgIHRoaXMubmZmdCA9IHRoaXMuYXR0ckludChcIm5mZnRcIiwgNTEyKTtcbiAgICB9XG5cbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcbiAgICAgICAgY29uc3Qgc2lnbmFsID0gaW5wdXRzWzBdO1xuICAgICAgICBjb25zdCBlbmdpbmUgPSBnZXRGRlRFbmdpbmUodGhpcy5uZmZ0KTtcblxuICAgICAgICAvLyBQYWQgb3IgdHJ1bmNhdGUgdG8gbmZmdFxuICAgICAgICBjb25zdCBmcmFtZSA9IG5ldyBGbG9hdDMyQXJyYXkodGhpcy5uZmZ0KTtcbiAgICAgICAgY29uc3QgbGVuID0gTWF0aC5taW4oc2lnbmFsLmRhdGEubGVuZ3RoLCB0aGlzLm5mZnQpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSBmcmFtZVtpXSA9IHNpZ25hbC5kYXRhW2ldO1xuXG4gICAgICAgIGNvbnN0IHBvd2VyID0gZW5naW5lLmZvcndhcmQoZnJhbWUpO1xuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IocG93ZXIsIFtwb3dlci5sZW5ndGhdKV07XG4gICAgfVxufVxuXG4vKipcbiAqIFNwV2luZG93OiBhcHBseSB3aW5kb3cgZnVuY3Rpb24gdG8gYXVkaW8gZnJhbWUuXG4gKiBJbnB1dDogIFtzYW1wbGVzXVxuICogT3V0cHV0OiBbc2FtcGxlc11cbiAqIEF0dHJpYnV0ZXM6IHdpbmRvd190eXBlICgwPWhhbm4sIDE9aGFtbWluZywgZGVmYXVsdCAwKVxuICovXG5jbGFzcyBTcFdpbmRvd05vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IHdpbmRvd1R5cGU6IG51bWJlcjtcblxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xuICAgICAgICBzdXBlcihpbmZvKTtcbiAgICAgICAgdGhpcy53aW5kb3dUeXBlID0gdGhpcy5hdHRySW50KFwid2luZG93X3R5cGVcIiwgMCk7XG4gICAgfVxuXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gaW5wdXRzWzBdO1xuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGlucHV0LmRhdGEubGVuZ3RoKTtcbiAgICAgICAgY29uc3QgTiA9IGlucHV0LmRhdGEubGVuZ3RoO1xuICAgICAgICBjb25zdCB3aW5GbiA9IHRoaXMud2luZG93VHlwZSA9PT0gMSA/IGhhbW1pbmdXaW5kb3cgOiBoYW5uV2luZG93O1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE47IGkrKykge1xuICAgICAgICAgICAgb3V0W2ldID0gaW5wdXQuZGF0YVtpXSAqIHdpbkZuKE4sIGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFsuLi5pbnB1dC5zaGFwZV0pXTtcbiAgICB9XG59XG5cbi8qKlxuICogU3BNZWxGaWx0ZXJiYW5rOiBhcHBseSBtZWwtc2NhbGUgZmlsdGVyYmFuayB0byBhIHBvd2VyIHNwZWN0cnVtLlxuICogSW5wdXQ6ICBbbmZmdC8yKzFdIOKAlCBwb3dlciBzcGVjdHJ1bVxuICogT3V0cHV0OiBbbl9tZWxzXSDigJQgbWVsIGVuZXJnaWVzXG4gKiBBdHRyaWJ1dGVzOiBuX21lbHMgKGRlZmF1bHQgNDApLCBuZmZ0IChkZWZhdWx0IDUxMiksIHNhbXBsZV9yYXRlIChkZWZhdWx0IDE2MDAwKVxuICovXG5jbGFzcyBTcE1lbEZpbHRlcmJhbmtOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XG4gICAgcHJpdmF0ZSBmYjogRmxvYXQzMkFycmF5W10gfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IG5NZWxzOiBudW1iZXI7XG4gICAgcHJpdmF0ZSByZWFkb25seSBuZmZ0OiBudW1iZXI7XG4gICAgcHJpdmF0ZSByZWFkb25seSBzYW1wbGVSYXRlOiBudW1iZXI7XG5cbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcbiAgICAgICAgc3VwZXIoaW5mbyk7XG4gICAgICAgIHRoaXMubk1lbHMgPSB0aGlzLmF0dHJJbnQoXCJuX21lbHNcIiwgNDApO1xuICAgICAgICB0aGlzLm5mZnQgPSB0aGlzLmF0dHJJbnQoXCJuZmZ0XCIsIDUxMik7XG4gICAgICAgIHRoaXMuc2FtcGxlUmF0ZSA9IHRoaXMuYXR0ckludChcInNhbXBsZV9yYXRlXCIsIDE2MDAwKTtcbiAgICB9XG5cbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcbiAgICAgICAgaWYgKCF0aGlzLmZiKSB7XG4gICAgICAgICAgICB0aGlzLmZiID0gYnVpbGRNZWxGaWx0ZXJiYW5rKHRoaXMubk1lbHMsIHRoaXMubmZmdCwgdGhpcy5zYW1wbGVSYXRlKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzcGVjdHJ1bSA9IGlucHV0c1swXTtcbiAgICAgICAgY29uc3QgbkJpbnMgPSB0aGlzLm5mZnQgLyAyICsgMTtcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLm5NZWxzKTtcbiAgICAgICAgZm9yIChsZXQgbSA9IDA7IG0gPCB0aGlzLm5NZWxzOyBtKyspIHtcbiAgICAgICAgICAgIGxldCBzdW0gPSAwO1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gdGhpcy5mYlttXTtcbiAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgbkJpbnM7IGsrKykge1xuICAgICAgICAgICAgICAgIHN1bSArPSByb3dba10gKiBzcGVjdHJ1bS5kYXRhW2tdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0W21dID0gc3VtO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFt0aGlzLm5NZWxzXSldO1xuICAgIH1cbn1cblxuLyoqXG4gKiBTcExvZ1NjYWxlOiBlbGVtZW50LXdpc2UgbG9nIHdpdGggZmxvb3IuXG4gKiBJbnB1dDogIFtOXVxuICogT3V0cHV0OiBbTl1cbiAqIEF0dHJpYnV0ZXM6IGZsb29yIChkZWZhdWx0IDFlLTEwKVxuICovXG5jbGFzcyBTcExvZ1NjYWxlTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgZmxvb3I6IG51bWJlcjtcblxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xuICAgICAgICBzdXBlcihpbmZvKTtcbiAgICAgICAgdGhpcy5mbG9vciA9IHRoaXMuYXR0cihcImZsb29yXCIsIDFlLTEwKTtcbiAgICB9XG5cbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBpbnB1dHNbMF07XG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoaW5wdXQuZGF0YS5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0LmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIG91dFtpXSA9IE1hdGgubG9nKE1hdGgubWF4KGlucHV0LmRhdGFbaV0sIHRoaXMuZmxvb3IpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbLi4uaW5wdXQuc2hhcGVdKV07XG4gICAgfVxufVxuXG4vKipcbiAqIFNwRENUOiBUeXBlLUlJIERpc2NyZXRlIENvc2luZSBUcmFuc2Zvcm0uXG4gKiBJbnB1dDogIFtOXVxuICogT3V0cHV0OiBbbl9vdXRwdXRdXG4gKiBBdHRyaWJ1dGVzOiBuX291dHB1dCAoZGVmYXVsdCA0MClcbiAqL1xuY2xhc3MgU3BEQ1ROb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XG4gICAgcHJpdmF0ZSByZWFkb25seSBuT3V0cHV0OiBudW1iZXI7XG5cbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcbiAgICAgICAgc3VwZXIoaW5mbyk7XG4gICAgICAgIHRoaXMubk91dHB1dCA9IHRoaXMuYXR0ckludChcIm5fb3V0cHV0XCIsIDQwKTtcbiAgICB9XG5cbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBpbnB1dHNbMF07XG4gICAgICAgIGNvbnN0IG91dCA9IGRjdElJKGlucHV0LmRhdGEsIHRoaXMubk91dHB1dCk7XG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFt0aGlzLm5PdXRwdXRdKV07XG4gICAgfVxufVxuXG4vKipcbiAqIFNwTUZDQzogY29tcGxldGUgTUZDQyBwaXBlbGluZSBpbiBhIHNpbmdsZSBvcC5cbiAqXG4gKiBJbnB1dDogIFtzYW1wbGVzXSDigJQgMUQgYXVkaW8gKGUuZy4gMTYwMDAgc2FtcGxlcyA9IDEgc2Vjb25kIGF0IDE2a0h6KVxuICogT3V0cHV0OiBbbl9tZmNjLCBuX2ZyYW1lc10g4oCUIE1GQ0MgZmVhdHVyZSBtYXRyaXhcbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBzYW1wbGVfcmF0ZSAoZGVmYXVsdCAxNjAwMClcbiAqICAgbl9tZmNjIChkZWZhdWx0IDQwKVxuICogICBuX2ZmdCAoZGVmYXVsdCA1MTIpXG4gKiAgIGhvcF9sZW5ndGggKGRlZmF1bHQgMTYwKVxuICogICBuX21lbHMgKGRlZmF1bHQgNDApXG4gKiAgIHdpbmRvd190eXBlICgwPWhhbm4sIDE9aGFtbWluZywgZGVmYXVsdCAwKVxuICovXG5jbGFzcyBTcE1GQ0NOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XG4gICAgcHJpdmF0ZSByZWFkb25seSBzYW1wbGVSYXRlOiBudW1iZXI7XG4gICAgcHJpdmF0ZSByZWFkb25seSBuTWZjYzogbnVtYmVyO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgbkZmdDogbnVtYmVyO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgaG9wTGVuZ3RoOiBudW1iZXI7XG4gICAgcHJpdmF0ZSByZWFkb25seSBuTWVsczogbnVtYmVyO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgd2luZG93VHlwZTogbnVtYmVyO1xuICAgIHByaXZhdGUgZmI6IEZsb2F0MzJBcnJheVtdIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBmZnRFbmdpbmU6IEZGVEVuZ2luZSB8IG51bGwgPSBudWxsO1xuXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XG4gICAgICAgIHN1cGVyKGluZm8pO1xuICAgICAgICB0aGlzLnNhbXBsZVJhdGUgPSB0aGlzLmF0dHJJbnQoXCJzYW1wbGVfcmF0ZVwiLCAxNjAwMCk7XG4gICAgICAgIHRoaXMubk1mY2MgPSB0aGlzLmF0dHJJbnQoXCJuX21mY2NcIiwgNDApO1xuICAgICAgICB0aGlzLm5GZnQgPSB0aGlzLmF0dHJJbnQoXCJuX2ZmdFwiLCA1MTIpO1xuICAgICAgICB0aGlzLmhvcExlbmd0aCA9IHRoaXMuYXR0ckludChcImhvcF9sZW5ndGhcIiwgMTYwKTtcbiAgICAgICAgdGhpcy5uTWVscyA9IHRoaXMuYXR0ckludChcIm5fbWVsc1wiLCA0MCk7XG4gICAgICAgIHRoaXMud2luZG93VHlwZSA9IHRoaXMuYXR0ckludChcIndpbmRvd190eXBlXCIsIDApO1xuICAgIH1cblxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xuICAgICAgICBjb25zdCBhdWRpbyA9IGlucHV0c1swXS5kYXRhO1xuICAgICAgICBjb25zdCBuRnJhbWVzID0gTWF0aC5mbG9vcigoYXVkaW8ubGVuZ3RoIC0gdGhpcy5uRmZ0KSAvIHRoaXMuaG9wTGVuZ3RoKSArIDE7XG5cbiAgICAgICAgLy8gTGF6eSBpbml0XG4gICAgICAgIGlmICghdGhpcy5mYikgdGhpcy5mYiA9IGJ1aWxkTWVsRmlsdGVyYmFuayh0aGlzLm5NZWxzLCB0aGlzLm5GZnQsIHRoaXMuc2FtcGxlUmF0ZSk7XG4gICAgICAgIGlmICghdGhpcy5mZnRFbmdpbmUpIHRoaXMuZmZ0RW5naW5lID0gZ2V0RkZURW5naW5lKHRoaXMubkZmdCk7XG5cbiAgICAgICAgY29uc3Qgd2luRm4gPSB0aGlzLndpbmRvd1R5cGUgPT09IDEgPyBoYW1taW5nV2luZG93IDogaGFubldpbmRvdztcbiAgICAgICAgY29uc3QgbkJpbnMgPSB0aGlzLm5GZnQgLyAyICsgMTtcbiAgICAgICAgY29uc3QgbWZjYyA9IG5ldyBGbG9hdDMyQXJyYXkodGhpcy5uTWZjYyAqIG5GcmFtZXMpO1xuXG4gICAgICAgIGNvbnN0IGZyYW1lID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLm5GZnQpO1xuICAgICAgICBjb25zdCBtZWxTcGVjID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLm5NZWxzKTtcblxuICAgICAgICBmb3IgKGxldCB0ID0gMDsgdCA8IG5GcmFtZXM7IHQrKykge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSB0ICogdGhpcy5ob3BMZW5ndGg7XG5cbiAgICAgICAgICAgIC8vIFdpbmRvd1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm5GZnQ7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IHN0YXJ0ICsgaTtcbiAgICAgICAgICAgICAgICBmcmFtZVtpXSA9IGlkeCA8IGF1ZGlvLmxlbmd0aCA/IGF1ZGlvW2lkeF0gKiB3aW5Gbih0aGlzLm5GZnQsIGkpIDogMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRkZUIOKGkiBwb3dlciBzcGVjdHJ1bVxuICAgICAgICAgICAgY29uc3QgcG93ZXIgPSB0aGlzLmZmdEVuZ2luZS5mb3J3YXJkKGZyYW1lKTtcblxuICAgICAgICAgICAgLy8gTWVsIGZpbHRlcmJhbmtcbiAgICAgICAgICAgIGZvciAobGV0IG0gPSAwOyBtIDwgdGhpcy5uTWVsczsgbSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gdGhpcy5mYlttXTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrID0gMDsgayA8IG5CaW5zOyBrKyspIHN1bSArPSByb3dba10gKiBwb3dlcltrXTtcbiAgICAgICAgICAgICAgICBtZWxTcGVjW21dID0gTWF0aC5sb2coTWF0aC5tYXgoc3VtLCAxZS0xMCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEQ1Qg4oaSIE1GQ0NcbiAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgdGhpcy5uTWZjYzsgYysrKSB7XG4gICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgbSA9IDA7IG0gPCB0aGlzLm5NZWxzOyBtKyspIHtcbiAgICAgICAgICAgICAgICAgICAgc3VtICs9IG1lbFNwZWNbbV0gKiBNYXRoLmNvcyhNYXRoLlBJICogYyAqICgyICogbSArIDEpIC8gKDIgKiB0aGlzLm5NZWxzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1mY2NbYyAqIG5GcmFtZXMgKyB0XSA9IHN1bTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihtZmNjLCBbdGhpcy5uTWZjYywgbkZyYW1lc10pXTtcbiAgICB9XG59XG5cbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gUmVnaXN0cmF0aW9uXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRHNwT3BzKHJlZ2lzdHJ5OiBPbm54T3BSZWdpc3RyeSk6IHZvaWQge1xuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiU3BGRlRcIiwgKGluZm8pID0+IG5ldyBTcEZGVE5vZGUoaW5mbykpO1xuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiU3BXaW5kb3dcIiwgKGluZm8pID0+IG5ldyBTcFdpbmRvd05vZGUoaW5mbykpO1xuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiU3BNZWxGaWx0ZXJiYW5rXCIsIChpbmZvKSA9PiBuZXcgU3BNZWxGaWx0ZXJiYW5rTm9kZShpbmZvKSk7XG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTcExvZ1NjYWxlXCIsIChpbmZvKSA9PiBuZXcgU3BMb2dTY2FsZU5vZGUoaW5mbykpO1xuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiU3BEQ1RcIiwgKGluZm8pID0+IG5ldyBTcERDVE5vZGUoaW5mbykpO1xuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiU3BNRkNDXCIsIChpbmZvKSA9PiBuZXcgU3BNRkNDTm9kZShpbmZvKSk7XG59XG4iLCJleHBvcnQgeyByZWdpc3Rlck1hdGhPcHMgfSBmcm9tIFwiLi9tYXRoXCI7XHJcbmV4cG9ydCB7IHJlZ2lzdGVyQWN0aXZhdGlvbk9wcyB9IGZyb20gXCIuL2FjdGl2YXRpb25zXCI7XHJcbmV4cG9ydCB7IHJlZ2lzdGVyTWF0cml4T3BzIH0gZnJvbSBcIi4vbWF0cml4XCI7XHJcbmV4cG9ydCB7IHJlZ2lzdGVyQ29udk9wcyB9IGZyb20gXCIuL2NvbnZcIjtcclxuZXhwb3J0IHsgcmVnaXN0ZXJOb3JtT3BzIH0gZnJvbSBcIi4vbm9ybWFsaXphdGlvblwiO1xyXG5leHBvcnQgeyByZWdpc3RlclJlY3VycmVudE9wcyB9IGZyb20gXCIuL3JlY3VycmVudFwiO1xyXG5leHBvcnQgeyByZWdpc3Rlck1pc2NPcHMgfSBmcm9tIFwiLi9taXNjXCI7XHJcbmV4cG9ydCB7IHJlZ2lzdGVyU3Bpa3lQYW5kYU9wcyB9IGZyb20gXCIuL3NwaWt5cGFuZGFcIjtcclxuZXhwb3J0IHsgcmVnaXN0ZXJEc3BPcHMgfSBmcm9tIFwiLi9kc3BcIjtcclxuXHJcbmltcG9ydCB7IE9ubnhPcFJlZ2lzdHJ5IH0gZnJvbSBcIi4uL3JlZ2lzdHJ5XCI7XHJcbmltcG9ydCB7IHJlZ2lzdGVyTWF0aE9wcyB9IGZyb20gXCIuL21hdGhcIjtcclxuaW1wb3J0IHsgcmVnaXN0ZXJBY3RpdmF0aW9uT3BzIH0gZnJvbSBcIi4vYWN0aXZhdGlvbnNcIjtcclxuaW1wb3J0IHsgcmVnaXN0ZXJNYXRyaXhPcHMgfSBmcm9tIFwiLi9tYXRyaXhcIjtcclxuaW1wb3J0IHsgcmVnaXN0ZXJDb252T3BzIH0gZnJvbSBcIi4vY29udlwiO1xyXG5pbXBvcnQgeyByZWdpc3Rlck5vcm1PcHMgfSBmcm9tIFwiLi9ub3JtYWxpemF0aW9uXCI7XHJcbmltcG9ydCB7IHJlZ2lzdGVyUmVjdXJyZW50T3BzIH0gZnJvbSBcIi4vcmVjdXJyZW50XCI7XHJcbmltcG9ydCB7IHJlZ2lzdGVyTWlzY09wcyB9IGZyb20gXCIuL21pc2NcIjtcclxuaW1wb3J0IHsgcmVnaXN0ZXJTcGlreVBhbmRhT3BzIH0gZnJvbSBcIi4vc3Bpa3lwYW5kYVwiO1xyXG5pbXBvcnQgeyByZWdpc3RlckRzcE9wcyB9IGZyb20gXCIuL2RzcFwiO1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBhIHJlZ2lzdHJ5IHdpdGggYWxsIGdlbmVyaWMgT05OWCBvcHMgcmVnaXN0ZXJlZC5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEZWZhdWx0UmVnaXN0cnkoKTogT25ueE9wUmVnaXN0cnkge1xyXG4gICAgY29uc3QgcmVnaXN0cnkgPSBuZXcgT25ueE9wUmVnaXN0cnkoKTtcclxuICAgIHJlZ2lzdGVyTWF0aE9wcyhyZWdpc3RyeSk7XHJcbiAgICByZWdpc3RlckFjdGl2YXRpb25PcHMocmVnaXN0cnkpO1xyXG4gICAgcmVnaXN0ZXJNYXRyaXhPcHMocmVnaXN0cnkpO1xyXG4gICAgcmVnaXN0ZXJDb252T3BzKHJlZ2lzdHJ5KTtcclxuICAgIHJlZ2lzdGVyTm9ybU9wcyhyZWdpc3RyeSk7XHJcbiAgICByZWdpc3RlclJlY3VycmVudE9wcyhyZWdpc3RyeSk7XHJcbiAgICByZWdpc3Rlck1pc2NPcHMocmVnaXN0cnkpO1xyXG4gICAgcmVnaXN0ZXJEc3BPcHMocmVnaXN0cnkpO1xyXG4gICAgcmV0dXJuIHJlZ2lzdHJ5O1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGEgcmVnaXN0cnkgd2l0aCBhbGwgb3BzICsgU3Bpa3lQYW5kYSBuYXRpdmUgb3ZlcnJpZGVzIGF0IGhpZ2hlciBwcmlvcml0eS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTcGlreVBhbmRhUmVnaXN0cnkoKTogT25ueE9wUmVnaXN0cnkge1xyXG4gICAgY29uc3QgcmVnaXN0cnkgPSBjcmVhdGVEZWZhdWx0UmVnaXN0cnkoKTtcclxuICAgIHJlZ2lzdGVyU3Bpa3lQYW5kYU9wcyhyZWdpc3RyeSk7XHJcbiAgICByZXR1cm4gcmVnaXN0cnk7XHJcbn1cclxuIiwiaW1wb3J0IHR5cGUgeyBJVGVuc29yIH0gZnJvbSBcIi4uLy4uL2NvbXB1dGUvY29tcHV0ZS5pbnRlcmZhY2VzXCI7XHJcbmltcG9ydCB0eXBlIHsgT25ueE5vZGVJbmZvIH0gZnJvbSBcIi4uL29ubngtdHlwZXNcIjtcclxuaW1wb3J0IHsgT25ueE9wTm9kZSwgbWFrZVRlbnNvciwgT25ueE9wUmVnaXN0cnkgfSBmcm9tIFwiLi4vcmVnaXN0cnlcIjtcclxuXHJcbi8vIOKUgOKUgOKUgCBIZWxwZXJzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuLyoqIENvbXB1dGUgdG90YWwgZWxlbWVudCBjb3VudCBmcm9tIHNoYXBlLiAqL1xyXG5mdW5jdGlvbiBzaXplKHNoYXBlOiBudW1iZXJbXSk6IG51bWJlciB7XHJcbiAgICBsZXQgcyA9IDE7XHJcbiAgICBmb3IgKGNvbnN0IGQgb2Ygc2hhcGUpIHMgKj0gTWF0aC5tYXgoZCwgMSk7XHJcbiAgICByZXR1cm4gcztcclxufVxyXG5cclxuLyoqXHJcbiAqIEJyb2FkY2FzdCB0d28gc2hhcGVzICh1cCB0byAzRCkuIFJldHVybnMgdGhlIGJyb2FkY2FzdCByZXN1bHQgc2hhcGUuXHJcbiAqIEZvbGxvd3MgbnVtcHkgYnJvYWRjYXN0aW5nIHJ1bGVzOiBhbGlnbiByaWdodCwgZXhwYW5kIGRpbXMgb2Ygc2l6ZSAxLlxyXG4gKi9cclxuZnVuY3Rpb24gYnJvYWRjYXN0U2hhcGUoYTogbnVtYmVyW10sIGI6IG51bWJlcltdKTogbnVtYmVyW10ge1xyXG4gICAgY29uc3QgcmFuayA9IE1hdGgubWF4KGEubGVuZ3RoLCBiLmxlbmd0aCk7XHJcbiAgICBjb25zdCBvdXQ6IG51bWJlcltdID0gbmV3IEFycmF5KHJhbmspO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCByYW5rOyBpKyspIHtcclxuICAgICAgICBjb25zdCBkYSA9IGFbYS5sZW5ndGggLSByYW5rICsgaV0gPz8gMTtcclxuICAgICAgICBjb25zdCBkYiA9IGJbYi5sZW5ndGggLSByYW5rICsgaV0gPz8gMTtcclxuICAgICAgICBpZiAoZGEgIT09IGRiICYmIGRhICE9PSAxICYmIGRiICE9PSAxKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGJyb2FkY2FzdCBzaGFwZXMgWyR7YX1dIGFuZCBbJHtifV1gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgb3V0W2ldID0gTWF0aC5tYXgoZGEsIGRiKTtcclxuICAgIH1cclxuICAgIHJldHVybiBvdXQ7XHJcbn1cclxuXHJcbi8qKiBNYXAgYSBmbGF0IGluZGV4IGluIHRoZSBicm9hZGNhc3Qgb3V0cHV0IGJhY2sgdG8gYSBmbGF0IGluZGV4IGluIGEgc291cmNlIHRlbnNvci4gKi9cclxuZnVuY3Rpb24gYnJvYWRjYXN0SW5kZXgoZmxhdElkeDogbnVtYmVyLCBvdXRTaGFwZTogbnVtYmVyW10sIHNyY1NoYXBlOiBudW1iZXJbXSk6IG51bWJlciB7XHJcbiAgICBjb25zdCByYW5rID0gb3V0U2hhcGUubGVuZ3RoO1xyXG4gICAgbGV0IGlkeCA9IDA7XHJcbiAgICBsZXQgc3RyaWRlID0gMTtcclxuICAgIGZvciAobGV0IGkgPSByYW5rIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICBjb25zdCBjb29yZCA9IE1hdGguZmxvb3IoZmxhdElkeCAvIHN0cmlkZW9mKG91dFNoYXBlLCBpKSkgJSBvdXRTaGFwZVtpXTtcclxuICAgICAgICBjb25zdCBzcmNEaW0gPSBzcmNTaGFwZVtzcmNTaGFwZS5sZW5ndGggLSByYW5rICsgaV0gPz8gMTtcclxuICAgICAgICBjb25zdCBzcmNDb29yZCA9IHNyY0RpbSA9PT0gMSA/IDAgOiBjb29yZDtcclxuICAgICAgICBpZHggKz0gc3JjQ29vcmQgKiBzdHJpZGU7XHJcbiAgICAgICAgc3RyaWRlICo9IHNyY0RpbTtcclxuICAgIH1cclxuICAgIHJldHVybiBpZHg7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN0cmlkZW9mKHNoYXBlOiBudW1iZXJbXSwgZGltOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgbGV0IHMgPSAxO1xyXG4gICAgZm9yIChsZXQgaSA9IGRpbSArIDE7IGkgPCBzaGFwZS5sZW5ndGg7IGkrKykgcyAqPSBzaGFwZVtpXTtcclxuICAgIHJldHVybiBzO1xyXG59XHJcblxyXG4vKiogRWxlbWVudC13aXNlIGJpbmFyeSBvcCB3aXRoIGJyb2FkY2FzdGluZy4gKi9cclxuZnVuY3Rpb24gYmluYXJ5T3AoYTogSVRlbnNvciwgYjogSVRlbnNvciwgZm46ICh4OiBudW1iZXIsIHk6IG51bWJlcikgPT4gbnVtYmVyKTogSVRlbnNvciB7XHJcbiAgICBjb25zdCBvdXRTaGFwZSA9IGJyb2FkY2FzdFNoYXBlKGEuc2hhcGUsIGIuc2hhcGUpO1xyXG4gICAgY29uc3Qgb3V0U2l6ZSA9IHNpemUob3V0U2hhcGUpO1xyXG4gICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShvdXRTaXplKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0U2l6ZTsgaSsrKSB7XHJcbiAgICAgICAgY29uc3QgYWkgPSBicm9hZGNhc3RJbmRleChpLCBvdXRTaGFwZSwgYS5zaGFwZSk7XHJcbiAgICAgICAgY29uc3QgYmkgPSBicm9hZGNhc3RJbmRleChpLCBvdXRTaGFwZSwgYi5zaGFwZSk7XHJcbiAgICAgICAgb3V0W2ldID0gZm4oYS5kYXRhW2FpXSwgYi5kYXRhW2JpXSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbWFrZVRlbnNvcihvdXQsIG91dFNoYXBlKTtcclxufVxyXG5cclxuLy8g4pSA4pSA4pSAIE9wcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbmNsYXNzIE11bE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFtiaW5hcnlPcChpbnB1dHNbMF0sIGlucHV0c1sxXSwgKGEsIGIpID0+IGEgKiBiKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFN1Yk5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFtiaW5hcnlPcChpbnB1dHNbMF0sIGlucHV0c1sxXSwgKGEsIGIpID0+IGEgLSBiKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEFkZE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFtiaW5hcnlPcChpbnB1dHNbMF0sIGlucHV0c1sxXSwgKGEsIGIpID0+IGEgKyBiKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEF0YW5Ob2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGEgPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShhLmRhdGEubGVuZ3RoKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGEuZGF0YS5sZW5ndGg7IGkrKykgb3V0W2ldID0gTWF0aC5hdGFuKGEuZGF0YVtpXSk7XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgWy4uLmEuc2hhcGVdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW1tOiBZID0gYWxwaGEgKiBBIEAgQiArIGJldGEgKiBDXHJcbiAqIEEgaXMgW00sIEtdLCBCIGlzIFtLLCBOXSwgQyBpcyBicm9hZGNhc3RhYmxlIHRvIFtNLCBOXS5cclxuICovXHJcbmNsYXNzIEdlbW1Ob2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFscGhhOiBudW1iZXI7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGJldGE6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdHJhbnNBOiBib29sZWFuO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0cmFuc0I6IGJvb2xlYW47XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihub2RlSW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIobm9kZUluZm8pO1xyXG4gICAgICAgIHRoaXMuYWxwaGEgPSB0aGlzLmF0dHIoXCJhbHBoYVwiLCAxLjApO1xyXG4gICAgICAgIHRoaXMuYmV0YSA9IHRoaXMuYXR0cihcImJldGFcIiwgMS4wKTtcclxuICAgICAgICB0aGlzLnRyYW5zQSA9IHRoaXMuYXR0ckludChcInRyYW5zQVwiLCAwKSAhPT0gMDtcclxuICAgICAgICB0aGlzLnRyYW5zQiA9IHRoaXMuYXR0ckludChcInRyYW5zQlwiLCAwKSAhPT0gMDtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBBID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IEIgPSBpbnB1dHNbMV07XHJcbiAgICAgICAgY29uc3QgQyA9IGlucHV0cy5sZW5ndGggPiAyID8gaW5wdXRzWzJdIDogbnVsbDtcclxuXHJcbiAgICAgICAgLy8gSW5mZXIgTSwgSywgTiBmcm9tIGFjdHVhbCB0ZW5zb3IgZGF0YSArIHNoYXBlc1xyXG4gICAgICAgIGNvbnN0IGFSb3dzID0gQS5zaGFwZS5sZW5ndGggPj0gMiA/IEEuc2hhcGVbMF0gOiAxO1xyXG4gICAgICAgIGNvbnN0IGFDb2xzID0gQS5zaGFwZS5sZW5ndGggPj0gMiA/IEEuc2hhcGVbMV0gOiBBLmRhdGEubGVuZ3RoO1xyXG4gICAgICAgIGNvbnN0IGJSb3dzID0gQi5zaGFwZS5sZW5ndGggPj0gMiA/IEIuc2hhcGVbMF0gOiAxO1xyXG4gICAgICAgIGNvbnN0IGJDb2xzID0gQi5zaGFwZS5sZW5ndGggPj0gMiA/IEIuc2hhcGVbMV0gOiBCLmRhdGEubGVuZ3RoO1xyXG5cclxuICAgICAgICBjb25zdCBNID0gdGhpcy50cmFuc0EgPyBhQ29scyA6IGFSb3dzO1xyXG4gICAgICAgIGNvbnN0IEsgPSB0aGlzLnRyYW5zQSA/IGFSb3dzIDogYUNvbHM7XHJcbiAgICAgICAgY29uc3QgTiA9IHRoaXMudHJhbnNCID8gYlJvd3MgOiBiQ29scztcclxuXHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShNICogTik7XHJcblxyXG4gICAgICAgIGZvciAobGV0IG0gPSAwOyBtIDwgTTsgbSsrKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgTjsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgSzsgaysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYUlkeCA9IHRoaXMudHJhbnNBID8gayAqIE0gKyBtIDogbSAqIEsgKyBrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJJZHggPSB0aGlzLnRyYW5zQiA/IG4gKiBLICsgayA6IGsgKiBOICsgbjtcclxuICAgICAgICAgICAgICAgICAgICBzdW0gKz0gQS5kYXRhW2FJZHhdICogQi5kYXRhW2JJZHhdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgb3V0W20gKiBOICsgbl0gPSB0aGlzLmFscGhhICogc3VtO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoQykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBtID0gMDsgbSA8IE07IG0rKykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjaSA9IG0gKiBOICsgbjtcclxuICAgICAgICAgICAgICAgICAgICAvLyBDIGlzIGJyb2FkY2FzdGFibGUg4oCUIGNvdWxkIGJlIFsxLCBOXSBvciBbTSwgTl1cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjSWR4ID0gQy5kYXRhLmxlbmd0aCA9PT0gTiA/IG4gOiBjaSAlIEMuZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W2NpXSArPSB0aGlzLmJldGEgKiBDLmRhdGFbY0lkeF07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtNLCBOXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ29uY2F0IGFsb25nIGF4aXMgKHN1cHBvcnRzIGF4aXMgMCBhbmQgMSBmb3IgMkQgdGVuc29ycykuXHJcbiAqL1xyXG5jbGFzcyBDb25jYXROb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGF4aXM6IG51bWJlcjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5vZGVJbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihub2RlSW5mbyk7XHJcbiAgICAgICAgdGhpcy5heGlzID0gdGhpcy5hdHRySW50KFwiYXhpc1wiLCAwKTtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBpZiAoaW5wdXRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoMCksIFswXSldO1xyXG4gICAgICAgIGlmIChpbnB1dHMubGVuZ3RoID09PSAxKSByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShpbnB1dHNbMF0uZGF0YSksIFsuLi5pbnB1dHNbMF0uc2hhcGVdKV07XHJcblxyXG4gICAgICAgIGNvbnN0IGF4aXMgPSB0aGlzLmF4aXM7XHJcblxyXG4gICAgICAgIGlmIChheGlzID09PSAwKSB7XHJcbiAgICAgICAgICAgIC8vIFN0YWNrIGFsb25nIHJvd3M6IGFsbCBtdXN0IGhhdmUgc2FtZSBjb2xzXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbHMgPSBpbnB1dHNbMF0uc2hhcGUubGVuZ3RoID49IDIgPyBpbnB1dHNbMF0uc2hhcGVbMV0gOiBpbnB1dHNbMF0uZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgICAgIGxldCB0b3RhbFJvd3MgPSAwO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlucCBvZiBpbnB1dHMpIHtcclxuICAgICAgICAgICAgICAgIHRvdGFsUm93cyArPSBpbnAuc2hhcGUubGVuZ3RoID49IDIgPyBpbnAuc2hhcGVbMF0gOiAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkodG90YWxSb3dzICogY29scyk7XHJcbiAgICAgICAgICAgIGxldCBvZmZzZXQgPSAwO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlucCBvZiBpbnB1dHMpIHtcclxuICAgICAgICAgICAgICAgIG91dC5zZXQoaW5wLmRhdGEsIG9mZnNldCk7XHJcbiAgICAgICAgICAgICAgICBvZmZzZXQgKz0gaW5wLmRhdGEubGVuZ3RoO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFt0b3RhbFJvd3MsIGNvbHNdKV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYXhpcyA9PT0gMSkge1xyXG4gICAgICAgICAgICAvLyBDb25jYXQgYWxvbmcgY29sdW1uczogYWxsIG11c3QgaGF2ZSBzYW1lIHJvd3NcclxuICAgICAgICAgICAgY29uc3Qgcm93cyA9IGlucHV0c1swXS5zaGFwZS5sZW5ndGggPj0gMiA/IGlucHV0c1swXS5zaGFwZVswXSA6IDE7XHJcbiAgICAgICAgICAgIGxldCB0b3RhbENvbHMgPSAwO1xyXG4gICAgICAgICAgICBjb25zdCBjb2xzTGlzdDogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBpbnAgb2YgaW5wdXRzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjID0gaW5wLnNoYXBlLmxlbmd0aCA+PSAyID8gaW5wLnNoYXBlWzFdIDogaW5wLmRhdGEubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgY29sc0xpc3QucHVzaChjKTtcclxuICAgICAgICAgICAgICAgIHRvdGFsQ29scyArPSBjO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkocm93cyAqIHRvdGFsQ29scyk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgcm93czsgcisrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgb3V0Q29sID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHQgPSAwOyB0IDwgaW5wdXRzLmxlbmd0aDsgdCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29scyA9IGNvbHNMaXN0W3RdO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNyY1JvdyA9IGlucHV0c1t0XS5zaGFwZS5sZW5ndGggPj0gMiA/IGlucHV0c1t0XS5zaGFwZVsxXSA6IGlucHV0c1t0XS5kYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRbciAqIHRvdGFsQ29scyArIG91dENvbCArIGNdID0gaW5wdXRzW3RdLmRhdGFbciAqIHNyY1JvdyArIGNdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBvdXRDb2wgKz0gY29scztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbcm93cywgdG90YWxDb2xzXSldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb25jYXQgYXhpcz0ke2F4aXN9IG5vdCBzdXBwb3J0ZWQgKG9ubHkgMCBhbmQgMSlgKTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFNsaWNlOiBjb2x1bW4tYmFzZWQgc2xpY2luZyBmb3IgMkQgdGVuc29ycy5cclxuICogT05OWCBvcHNldCDiiaUxMCB1c2VzIHRlbnNvciBpbnB1dHMgZm9yIHN0YXJ0cy9lbmRzL2F4ZXMvc3RlcHMuXHJcbiAqIE9wc2V0IDwxMCB1c2VzIGF0dHJpYnV0ZXMuXHJcbiAqIFdlIHN1cHBvcnQgYm90aDogdHJ5IHRlbnNvciBpbnB1dHMgZmlyc3QsIGZhbGwgYmFjayB0byBhdHRyaWJ1dGVzLlxyXG4gKi9cclxuY2xhc3MgU2xpY2VOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBkYXRhID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGlmICghZGF0YSkgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoMCksIFswXSldO1xyXG5cclxuICAgICAgICAvLyBPcHNldCDiiaUxMDogc3RhcnRzLCBlbmRzLCBheGVzLCBzdGVwcyBhcmUgdGVuc29yIGlucHV0c1xyXG4gICAgICAgIGNvbnN0IGhhc0lucHV0U3RhcnRzID0gaW5wdXRzLmxlbmd0aCA+PSAzICYmIGlucHV0c1sxXSAmJiBpbnB1dHNbMl07XHJcblxyXG4gICAgICAgIGxldCBzdGFydDogbnVtYmVyO1xyXG4gICAgICAgIGxldCBlbmQ6IG51bWJlcjtcclxuICAgICAgICBsZXQgYXhpczogbnVtYmVyO1xyXG5cclxuICAgICAgICBpZiAoaGFzSW5wdXRTdGFydHMpIHtcclxuICAgICAgICAgICAgc3RhcnQgPSBNYXRoLnJvdW5kKGlucHV0c1sxXS5kYXRhWzBdKTtcclxuICAgICAgICAgICAgZW5kID0gTWF0aC5yb3VuZChpbnB1dHNbMl0uZGF0YVswXSk7XHJcbiAgICAgICAgICAgIGF4aXMgPSBpbnB1dHMubGVuZ3RoID49IDQgJiYgaW5wdXRzWzNdID8gTWF0aC5yb3VuZChpbnB1dHNbM10uZGF0YVswXSkgOiAwO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIEZhbGwgYmFjayB0byBhdHRyaWJ1dGVzIChvcHNldCA8MTApXHJcbiAgICAgICAgICAgIHN0YXJ0ID0gdGhpcy5hdHRySW50KFwic3RhcnRzXCIsIDApO1xyXG4gICAgICAgICAgICBlbmQgPSB0aGlzLmF0dHJJbnQoXCJlbmRzXCIsIDApO1xyXG4gICAgICAgICAgICBheGlzID0gdGhpcy5hdHRySW50KFwiYXhlc1wiLCAxKTsgLy8gZGVmYXVsdCBheGlzPTEgZm9yIGNvbHVtbiBzbGljaW5nXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBIYW5kbGUgbmVnYXRpdmUgaW5kaWNlc1xyXG4gICAgICAgIGNvbnN0IGRpbVNpemUgPSBkYXRhLnNoYXBlW2F4aXNdID8/IGRhdGEuZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSBkaW1TaXplICsgc3RhcnQ7XHJcbiAgICAgICAgaWYgKGVuZCA8IDApIGVuZCA9IGRpbVNpemUgKyBlbmQ7XHJcbiAgICAgICAgaWYgKGVuZCA+IGRpbVNpemUgfHwgZW5kID4gMjE0NzQ4MzAwMCkgZW5kID0gZGltU2l6ZTtcclxuICAgICAgICBzdGFydCA9IE1hdGgubWF4KDAsIE1hdGgubWluKHN0YXJ0LCBkaW1TaXplKSk7XHJcbiAgICAgICAgZW5kID0gTWF0aC5tYXgoc3RhcnQsIE1hdGgubWluKGVuZCwgZGltU2l6ZSkpO1xyXG4gICAgICAgIGNvbnN0IHNsaWNlTGVuID0gZW5kIC0gc3RhcnQ7XHJcblxyXG4gICAgICAgIGlmIChkYXRhLnNoYXBlLmxlbmd0aCA8IDIgfHwgYXhpcyA9PT0gMCkge1xyXG4gICAgICAgICAgICAvLyAxRCBvciBheGlzPTA6IHNpbXBsZSBzbGljZVxyXG4gICAgICAgICAgICBjb25zdCBzbGljZWQgPSBkYXRhLmRhdGEuc2xpY2Uoc3RhcnQsIGVuZCk7XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihzbGljZWQsIFtzbGljZUxlbl0pXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIDJELCBheGlzPTE6IHNsaWNlIGNvbHVtbnNcclxuICAgICAgICBjb25zdCByb3dzID0gZGF0YS5zaGFwZVswXTtcclxuICAgICAgICBjb25zdCBjb2xzID0gZGF0YS5zaGFwZVsxXTtcclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KHJvd3MgKiBzbGljZUxlbik7XHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCByb3dzOyByKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCBzbGljZUxlbjsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICBvdXRbciAqIHNsaWNlTGVuICsgY10gPSBkYXRhLmRhdGFbciAqIGNvbHMgKyBzdGFydCArIGNdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtyb3dzLCBzbGljZUxlbl0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLy8g4pSA4pSA4pSAIFJlZ2lzdHJhdGlvbiDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWdpc3Rlck1hdGhPcHMocmVnaXN0cnk6IE9ubnhPcFJlZ2lzdHJ5KTogdm9pZCB7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkFkZFwiLCAoaW5mbykgPT4gbmV3IEFkZE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTdWJcIiwgKGluZm8pID0+IG5ldyBTdWJOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiTXVsXCIsIChpbmZvKSA9PiBuZXcgTXVsTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkF0YW5cIiwgKGluZm8pID0+IG5ldyBBdGFuTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkdlbW1cIiwgKGluZm8pID0+IG5ldyBHZW1tTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkNvbmNhdFwiLCAoaW5mbykgPT4gbmV3IENvbmNhdE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTbGljZVwiLCAoaW5mbykgPT4gbmV3IFNsaWNlTm9kZShpbmZvKSk7XHJcbn1cclxuIiwiaW1wb3J0IHR5cGUgeyBJVGVuc29yIH0gZnJvbSBcIi4uLy4uL2NvbXB1dGUvY29tcHV0ZS5pbnRlcmZhY2VzXCI7XHJcbmltcG9ydCB0eXBlIHsgT25ueE5vZGVJbmZvIH0gZnJvbSBcIi4uL29ubngtdHlwZXNcIjtcclxuaW1wb3J0IHsgT25ueE9wTm9kZSwgbWFrZVRlbnNvciwgT25ueE9wUmVnaXN0cnkgfSBmcm9tIFwiLi4vcmVnaXN0cnlcIjtcclxuXHJcbi8qKlxyXG4gKiBNYXRNdWw6IG1hdHJpeCBtdWx0aXBsaWNhdGlvbiBBIEAgQi5cclxuICogU3VwcG9ydHMgMkQgW00sS10geCBbSyxOXSDihpIgW00sTl0uXHJcbiAqIEZvciAxRCBpbnB1dHM6IFtLXSB0cmVhdGVkIGFzIFsxLEtdIG9yIFtLLDFdIGFzIG5lZWRlZC5cclxuICovXHJcbmNsYXNzIE1hdE11bE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgQSA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBCID0gaW5wdXRzWzFdO1xyXG5cclxuICAgICAgICBsZXQgTTogbnVtYmVyLCBLOiBudW1iZXIsIE46IG51bWJlcjtcclxuICAgICAgICBpZiAoQS5zaGFwZS5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgTSA9IDE7XHJcbiAgICAgICAgICAgIEsgPSBBLnNoYXBlWzBdO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIE0gPSBBLnNoYXBlWzBdO1xyXG4gICAgICAgICAgICBLID0gQS5zaGFwZVsxXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKEIuc2hhcGUubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgIE4gPSAxO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIE4gPSBCLnNoYXBlWzFdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShNICogTik7XHJcbiAgICAgICAgZm9yIChsZXQgbSA9IDA7IG0gPCBNOyBtKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBLOyBrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhaSA9IEEuc2hhcGUubGVuZ3RoID09PSAxID8gayA6IG0gKiBLICsgaztcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiaSA9IEIuc2hhcGUubGVuZ3RoID09PSAxID8gayA6IGsgKiBOICsgbjtcclxuICAgICAgICAgICAgICAgICAgICBzdW0gKz0gQS5kYXRhW2FpXSAqIEIuZGF0YVtiaV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBvdXRbbSAqIE4gKyBuXSA9IHN1bTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKEEuc2hhcGUubGVuZ3RoID09PSAxICYmIEIuc2hhcGUubGVuZ3RoID09PSAxKSByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbMV0pXTtcclxuICAgICAgICBpZiAoQS5zaGFwZS5sZW5ndGggPT09IDEpIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtOXSldO1xyXG4gICAgICAgIGlmIChCLnNoYXBlLmxlbmd0aCA9PT0gMSkgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW01dKV07XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW00sIE5dKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUcmFuc3Bvc2U6IHBlcm11dGUgZGltZW5zaW9ucy5cclxuICogU3VwcG9ydHMgMkQgKHN3YXAgcm93cy9jb2xzKSBhbmQgM0QuXHJcbiAqL1xyXG5jbGFzcyBUcmFuc3Bvc2VOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGlucCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCByYW5rID0gaW5wLnNoYXBlLmxlbmd0aDtcclxuXHJcbiAgICAgICAgaWYgKHJhbmsgPT09IDIpIHtcclxuICAgICAgICAgICAgY29uc3QgW3Jvd3MsIGNvbHNdID0gaW5wLnNoYXBlO1xyXG4gICAgICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGlucC5kYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgcm93czsgcisrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIG91dFtjICogcm93cyArIHJdID0gaW5wLmRhdGFbciAqIGNvbHMgKyBjXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbY29scywgcm93c10pXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChyYW5rID09PSAzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFtkMCwgZDEsIGQyXSA9IGlucC5zaGFwZTtcclxuICAgICAgICAgICAgLy8gRGVmYXVsdCBwZXJtOiByZXZlcnNlIOKGkiBbZDIsIGQxLCBkMF1cclxuICAgICAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShpbnAuZGF0YS5sZW5ndGgpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGQwOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZDE7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgZDI7IGsrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRbayAqIGQxICogZDAgKyBqICogZDAgKyBpXSA9IGlucC5kYXRhW2kgKiBkMSAqIGQyICsgaiAqIGQyICsga107XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtkMiwgZDEsIGQwXSldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gMUQ6IG5vb3BcclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShpbnAuZGF0YSksIFsuLi5pbnAuc2hhcGVdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXNoYXBlOiBjaGFuZ2Ugc2hhcGUgd2l0aG91dCBjaGFuZ2luZyBkYXRhLlxyXG4gKiBTdXBwb3J0cyAtMSBmb3Igb25lIGluZmVycmVkIGRpbWVuc2lvbi5cclxuICovXHJcbmNsYXNzIFJlc2hhcGVOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGRhdGEgPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3Qgc2hhcGVUID0gaW5wdXRzWzFdO1xyXG4gICAgICAgIGlmICghc2hhcGVUKSByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShkYXRhLmRhdGEpLCBbLi4uZGF0YS5zaGFwZV0pXTtcclxuXHJcbiAgICAgICAgY29uc3QgbmV3U2hhcGU6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgbGV0IGluZmVySWR4ID0gLTE7XHJcbiAgICAgICAgbGV0IGtub3duID0gMTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNoYXBlVC5kYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGQgPSBNYXRoLnJvdW5kKHNoYXBlVC5kYXRhW2ldKTtcclxuICAgICAgICAgICAgaWYgKGQgPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBpbmZlcklkeCA9IGk7XHJcbiAgICAgICAgICAgICAgICBuZXdTaGFwZS5wdXNoKC0xKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChkID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAvLyAwIG1lYW5zIGNvcHkgZnJvbSBpbnB1dFxyXG4gICAgICAgICAgICAgICAgY29uc3QgZGltID0gZGF0YS5zaGFwZVtpXSA/PyAxO1xyXG4gICAgICAgICAgICAgICAgbmV3U2hhcGUucHVzaChkaW0pO1xyXG4gICAgICAgICAgICAgICAga25vd24gKj0gZGltO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbmV3U2hhcGUucHVzaChkKTtcclxuICAgICAgICAgICAgICAgIGtub3duICo9IGQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGluZmVySWR4ID49IDApIHtcclxuICAgICAgICAgICAgbmV3U2hhcGVbaW5mZXJJZHhdID0gZGF0YS5kYXRhLmxlbmd0aCAvIGtub3duO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoZGF0YS5kYXRhKSwgbmV3U2hhcGUpXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEZsYXR0ZW46IGNvbGxhcHNlIGRpbXMgaW50byAyRCBbYmF0Y2gsIGZlYXR1cmVzXS5cclxuICovXHJcbmNsYXNzIEZsYXR0ZW5Ob2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGF4aXM6IG51bWJlcjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5heGlzID0gdGhpcy5hdHRySW50KFwiYXhpc1wiLCAxKTtcclxuICAgIH1cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGlucCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBzaGFwZSA9IGlucC5zaGFwZTtcclxuICAgICAgICBsZXQgZDAgPSAxLFxyXG4gICAgICAgICAgICBkMSA9IDE7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmF4aXM7IGkrKykgZDAgKj0gc2hhcGVbaV0gPz8gMTtcclxuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5heGlzOyBpIDwgc2hhcGUubGVuZ3RoOyBpKyspIGQxICo9IHNoYXBlW2ldID8/IDE7XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoaW5wLmRhdGEpLCBbZDAsIGQxXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogU3F1ZWV6ZTogcmVtb3ZlIGRpbWVuc2lvbnMgb2Ygc2l6ZSAxLlxyXG4gKi9cclxuY2xhc3MgU3F1ZWV6ZU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgaW5wID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IGF4ZXMgPSBpbnB1dHMubGVuZ3RoID49IDIgJiYgaW5wdXRzWzFdID8gQXJyYXkuZnJvbShpbnB1dHNbMV0uZGF0YSkubWFwKE1hdGgucm91bmQpIDogbnVsbDtcclxuICAgICAgICBjb25zdCBuZXdTaGFwZSA9IGF4ZXMgPyBpbnAuc2hhcGUuZmlsdGVyKChfLCBpKSA9PiAhYXhlcy5pbmNsdWRlcyhpKSkgOiBpbnAuc2hhcGUuZmlsdGVyKChkKSA9PiBkICE9PSAxKTtcclxuICAgICAgICBpZiAobmV3U2hhcGUubGVuZ3RoID09PSAwKSBuZXdTaGFwZS5wdXNoKDEpO1xyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KGlucC5kYXRhKSwgbmV3U2hhcGUpXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFVuc3F1ZWV6ZTogaW5zZXJ0IGRpbWVuc2lvbnMgb2Ygc2l6ZSAxLlxyXG4gKi9cclxuY2xhc3MgVW5zcXVlZXplTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBpbnAgPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3QgYXhlc1QgPSBpbnB1dHNbMV07XHJcbiAgICAgICAgaWYgKCFheGVzVCkgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoaW5wLmRhdGEpLCBbLi4uaW5wLnNoYXBlXSldO1xyXG4gICAgICAgIGNvbnN0IGF4ZXMgPSBBcnJheS5mcm9tKGF4ZXNULmRhdGEpXHJcbiAgICAgICAgICAgIC5tYXAoTWF0aC5yb3VuZClcclxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcclxuICAgICAgICBjb25zdCBuZXdTaGFwZSA9IFsuLi5pbnAuc2hhcGVdO1xyXG4gICAgICAgIGZvciAoY29uc3QgYSBvZiBheGVzKSB7XHJcbiAgICAgICAgICAgIG5ld1NoYXBlLnNwbGljZShhLCAwLCAxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoaW5wLmRhdGEpLCBuZXdTaGFwZSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogR2F0aGVyOiBzZWxlY3QgZWxlbWVudHMgYWxvbmcgYXhpcyB1c2luZyBpbmRpY2VzLlxyXG4gKiBTaW1wbGlmaWVkOiBzdXBwb3J0cyBheGlzPTAsIDFELzJELlxyXG4gKi9cclxuY2xhc3MgR2F0aGVyTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBheGlzOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKGluZm8pO1xyXG4gICAgICAgIHRoaXMuYXhpcyA9IHRoaXMuYXR0ckludChcImF4aXNcIiwgMCk7XHJcbiAgICB9XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBkYXRhID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IGluZGljZXMgPSBpbnB1dHNbMV07XHJcbiAgICAgICAgaWYgKCFpbmRpY2VzKSByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShkYXRhLmRhdGEpLCBbLi4uZGF0YS5zaGFwZV0pXTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYXhpcyA9PT0gMCAmJiBkYXRhLnNoYXBlLmxlbmd0aCA9PT0gMikge1xyXG4gICAgICAgICAgICBjb25zdCBjb2xzID0gZGF0YS5zaGFwZVsxXTtcclxuICAgICAgICAgICAgY29uc3QgbnVtSWR4ID0gaW5kaWNlcy5kYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShudW1JZHggKiBjb2xzKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1JZHg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gTWF0aC5yb3VuZChpbmRpY2VzLmRhdGFbaV0pO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCBjb2xzOyBjKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBvdXRbaSAqIGNvbHMgKyBjXSA9IGRhdGEuZGF0YVtpZHggKiBjb2xzICsgY107XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW251bUlkeCwgY29sc10pXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEZhbGxiYWNrOiAxRCBnYXRoZXJcclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGluZGljZXMuZGF0YS5sZW5ndGgpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5kaWNlcy5kYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIG91dFtpXSA9IGRhdGEuZGF0YVtNYXRoLnJvdW5kKGluZGljZXMuZGF0YVtpXSldID8/IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtpbmRpY2VzLmRhdGEubGVuZ3RoXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJNYXRyaXhPcHMocmVnaXN0cnk6IE9ubnhPcFJlZ2lzdHJ5KTogdm9pZCB7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIk1hdE11bFwiLCAoaW5mbykgPT4gbmV3IE1hdE11bE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJUcmFuc3Bvc2VcIiwgKGluZm8pID0+IG5ldyBUcmFuc3Bvc2VOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiUmVzaGFwZVwiLCAoaW5mbykgPT4gbmV3IFJlc2hhcGVOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiRmxhdHRlblwiLCAoaW5mbykgPT4gbmV3IEZsYXR0ZW5Ob2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiU3F1ZWV6ZVwiLCAoaW5mbykgPT4gbmV3IFNxdWVlemVOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiVW5zcXVlZXplXCIsIChpbmZvKSA9PiBuZXcgVW5zcXVlZXplTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkdhdGhlclwiLCAoaW5mbykgPT4gbmV3IEdhdGhlck5vZGUoaW5mbykpO1xyXG59XHJcbiIsImltcG9ydCB0eXBlIHsgSVRlbnNvciB9IGZyb20gXCIuLi8uLi9jb21wdXRlL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xyXG5pbXBvcnQgdHlwZSB7IE9ubnhOb2RlSW5mbyB9IGZyb20gXCIuLi9vbm54LXR5cGVzXCI7XHJcbmltcG9ydCB7IE9ubnhPcE5vZGUsIG1ha2VUZW5zb3IsIGdldEluaXRpYWxpemVyRGF0YSwgT25ueE9wUmVnaXN0cnkgfSBmcm9tIFwiLi4vcmVnaXN0cnlcIjtcclxuXHJcbmNsYXNzIERpdk5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgYSA9IGlucHV0c1swXSwgYiA9IGlucHV0c1sxXTtcclxuICAgICAgICBjb25zdCBzaXplID0gTWF0aC5tYXgoYS5kYXRhLmxlbmd0aCwgYi5kYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShzaXplKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNpemU7IGkrKykge1xyXG4gICAgICAgICAgICBvdXRbaV0gPSBhLmRhdGFbaSAlIGEuZGF0YS5sZW5ndGhdIC8gYi5kYXRhW2kgJSBiLmRhdGEubGVuZ3RoXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgYS5kYXRhLmxlbmd0aCA+PSBiLmRhdGEubGVuZ3RoID8gWy4uLmEuc2hhcGVdIDogWy4uLmIuc2hhcGVdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFBvd05vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgYSA9IGlucHV0c1swXSwgYiA9IGlucHV0c1sxXTtcclxuICAgICAgICBjb25zdCBzaXplID0gTWF0aC5tYXgoYS5kYXRhLmxlbmd0aCwgYi5kYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShzaXplKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNpemU7IGkrKykge1xyXG4gICAgICAgICAgICBvdXRbaV0gPSBNYXRoLnBvdyhhLmRhdGFbaSAlIGEuZGF0YS5sZW5ndGhdLCBiLmRhdGFbaSAlIGIuZGF0YS5sZW5ndGhdKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgYS5kYXRhLmxlbmd0aCA+PSBiLmRhdGEubGVuZ3RoID8gWy4uLmEuc2hhcGVdIDogWy4uLmIuc2hhcGVdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFJlZHVjZU1lYW5Ob2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGF4aXM6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkga2VlcGRpbXM6IGJvb2xlYW47XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmF4aXMgPSB0aGlzLmF0dHJJbnQoXCJheGVzXCIsIC0xKTtcclxuICAgICAgICB0aGlzLmtlZXBkaW1zID0gdGhpcy5hdHRySW50KFwia2VlcGRpbXNcIiwgMSkgIT09IDA7XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgWCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBzaGFwZSA9IFguc2hhcGU7XHJcbiAgICAgICAgY29uc3QgcmFuayA9IHNoYXBlLmxlbmd0aDtcclxuICAgICAgICBjb25zdCBheGlzID0gdGhpcy5heGlzIDwgMCA/IHJhbmsgKyB0aGlzLmF4aXMgOiB0aGlzLmF4aXM7XHJcblxyXG4gICAgICAgIGlmIChyYW5rID09PSAyKSB7XHJcbiAgICAgICAgICAgIGlmIChheGlzID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByb3dzID0gc2hhcGVbMF07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb2xzID0gc2hhcGVbMV07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KHJvd3MpO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCByb3dzOyByKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMrKykgc3VtICs9IFguZGF0YVtyICogY29scyArIGNdO1xyXG4gICAgICAgICAgICAgICAgICAgIG91dFtyXSA9IHN1bSAvIGNvbHM7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCB0aGlzLmtlZXBkaW1zID8gW3Jvd3MsIDFdIDogW3Jvd3NdKV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGF4aXMgPT09IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJvd3MgPSBzaGFwZVswXTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbHMgPSBzaGFwZVsxXTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoY29scyk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgcm93czsgcisrKSBzdW0gKz0gWC5kYXRhW3IgKiBjb2xzICsgY107XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W2NdID0gc3VtIC8gcm93cztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIHRoaXMua2VlcGRpbXMgPyBbMSwgY29sc10gOiBbY29sc10pXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRmFsbGJhY2s6IHJlZHVjZSBhbGxcclxuICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IFguZGF0YS5sZW5ndGg7IGkrKykgc3VtICs9IFguZGF0YVtpXTtcclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShbc3VtIC8gWC5kYXRhLmxlbmd0aF0pLCBbMV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgUmVkdWNlU3VtTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBheGlzOiBudW1iZXI7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGtlZXBkaW1zOiBib29sZWFuO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5heGlzID0gdGhpcy5hdHRySW50KFwiYXhlc1wiLCAtMSk7XHJcbiAgICAgICAgdGhpcy5rZWVwZGltcyA9IHRoaXMuYXR0ckludChcImtlZXBkaW1zXCIsIDEpICE9PSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3Qgc2hhcGUgPSBYLnNoYXBlO1xyXG4gICAgICAgIGNvbnN0IHJhbmsgPSBzaGFwZS5sZW5ndGg7XHJcbiAgICAgICAgY29uc3QgYXhpcyA9IHRoaXMuYXhpcyA8IDAgPyByYW5rICsgdGhpcy5heGlzIDogdGhpcy5heGlzO1xyXG5cclxuICAgICAgICBpZiAocmFuayA9PT0gMiAmJiBheGlzID09PSAxKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvd3MgPSBzaGFwZVswXSwgY29scyA9IHNoYXBlWzFdO1xyXG4gICAgICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KHJvd3MpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCByID0gMDsgciA8IHJvd3M7IHIrKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMrKykgc3VtICs9IFguZGF0YVtyICogY29scyArIGNdO1xyXG4gICAgICAgICAgICAgICAgb3V0W3JdID0gc3VtO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIHRoaXMua2VlcGRpbXMgPyBbcm93cywgMV0gOiBbcm93c10pXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgWC5kYXRhLmxlbmd0aDsgaSsrKSBzdW0gKz0gWC5kYXRhW2ldO1xyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KFtzdW1dKSwgWzFdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIElkZW50aXR5Tm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShpbnB1dHNbMF0uZGF0YSksIFsuLi5pbnB1dHNbMF0uc2hhcGVdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIENhc3ROb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIC8vIEFsbCBkYXRhIGlzIEZsb2F0MzIgaW4gb3VyIHJ1bnRpbWUg4oCUIGNhc3QgaXMgYSBuby1vcFxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KGlucHV0c1swXS5kYXRhKSwgWy4uLmlucHV0c1swXS5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU2hhcGVOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IHNoYXBlID0gaW5wdXRzWzBdLnNoYXBlO1xyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KHNoYXBlKSwgW3NoYXBlLmxlbmd0aF0pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQ29uc3RhbnRPZlNoYXBlTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBzaGFwZVQgPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3Qgc2hhcGUgPSBBcnJheS5mcm9tKHNoYXBlVC5kYXRhKS5tYXAoTWF0aC5yb3VuZCk7XHJcbiAgICAgICAgbGV0IHNpemUgPSAxO1xyXG4gICAgICAgIGZvciAoY29uc3QgZCBvZiBzaGFwZSkgc2l6ZSAqPSBkO1xyXG4gICAgICAgIC8vIFRyeSB0ZW5zb3IgYXR0cmlidXRlIFwidmFsdWVcIiBmaXJzdCAoVGVuc29yUHJvdG8pLCBmYWxsIGJhY2sgdG8gc2NhbGFyXHJcbiAgICAgICAgbGV0IHZhbCA9IDA7XHJcbiAgICAgICAgY29uc3QgdmFsdWVUZW5zb3IgPSB0aGlzLmF0dHJUZW5zb3IoXCJ2YWx1ZVwiKTtcclxuICAgICAgICBpZiAodmFsdWVUZW5zb3IpIHtcclxuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGdldEluaXRpYWxpemVyRGF0YSh2YWx1ZVRlbnNvcik7XHJcbiAgICAgICAgICAgIGlmIChkYXRhLmxlbmd0aCA+IDApIHZhbCA9IGRhdGFbMF07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdmFsID0gdGhpcy5hdHRyKFwidmFsdWVcIiwgMCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoc2l6ZSkuZmlsbCh2YWwpO1xyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIHNoYXBlKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQYWQ6IHBhZCBhIHRlbnNvci4gU2ltcGxpZmllZDogMkQgY29uc3RhbnQgcGFkZGluZy5cclxuICovXHJcbmNsYXNzIFBhZE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgWCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBwYWRzID0gaW5wdXRzLmxlbmd0aCA+PSAyICYmIGlucHV0c1sxXSA/IGlucHV0c1sxXSA6IG51bGw7XHJcbiAgICAgICAgaWYgKCFwYWRzIHx8IFguc2hhcGUubGVuZ3RoICE9PSAyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KFguZGF0YSksIFsuLi5YLnNoYXBlXSldO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCB2YWwgPSBpbnB1dHMubGVuZ3RoID49IDMgJiYgaW5wdXRzWzJdID8gaW5wdXRzWzJdLmRhdGFbMF0gOiAwO1xyXG4gICAgICAgIGNvbnN0IFtyb3dzLCBjb2xzXSA9IFguc2hhcGU7XHJcbiAgICAgICAgY29uc3QgcCA9IEFycmF5LmZyb20ocGFkcy5kYXRhKS5tYXAoTWF0aC5yb3VuZCk7XHJcbiAgICAgICAgLy8gcGFkcyBmb3JtYXQ6IFt0b3AsIGxlZnQsIGJvdHRvbSwgcmlnaHRdIGZvciAyRFxyXG4gICAgICAgIGNvbnN0IHRvcCA9IHBbMF0gPz8gMCwgbGVmdCA9IHBbMV0gPz8gMCwgYm90dG9tID0gcFsyXSA/PyAwLCByaWdodCA9IHBbM10gPz8gMDtcclxuICAgICAgICBjb25zdCBuZXdSb3dzID0gcm93cyArIHRvcCArIGJvdHRvbTtcclxuICAgICAgICBjb25zdCBuZXdDb2xzID0gY29scyArIGxlZnQgKyByaWdodDtcclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KG5ld1Jvd3MgKiBuZXdDb2xzKS5maWxsKHZhbCk7XHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCByb3dzOyByKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCBjb2xzOyBjKyspIHtcclxuICAgICAgICAgICAgICAgIG91dFsociArIHRvcCkgKiBuZXdDb2xzICsgKGMgKyBsZWZ0KV0gPSBYLmRhdGFbciAqIGNvbHMgKyBjXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbbmV3Um93cywgbmV3Q29sc10pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgTWluTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGlucHV0c1swXS5kYXRhKTtcclxuICAgICAgICBmb3IgKGxldCB0ID0gMTsgdCA8IGlucHV0cy5sZW5ndGg7IHQrKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgb3V0W2ldID0gTWF0aC5taW4ob3V0W2ldLCBpbnB1dHNbdF0uZGF0YVtpICUgaW5wdXRzW3RdLmRhdGEubGVuZ3RoXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgWy4uLmlucHV0c1swXS5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgTWF4Tm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGlucHV0c1swXS5kYXRhKTtcclxuICAgICAgICBmb3IgKGxldCB0ID0gMTsgdCA8IGlucHV0cy5sZW5ndGg7IHQrKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgb3V0W2ldID0gTWF0aC5tYXgob3V0W2ldLCBpbnB1dHNbdF0uZGF0YVtpICUgaW5wdXRzW3RdLmRhdGEubGVuZ3RoXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgWy4uLmlucHV0c1swXS5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnN0YW50OiBwcm9kdWNlcyBhIGNvbnN0YW50IHRlbnNvciBmcm9tIGF0dHJpYnV0ZXMuXHJcbiAqIFRoZSB2YWx1ZSBjb21lcyBmcm9tIGEgdGVuc29yIGF0dHJpYnV0ZSBcInZhbHVlXCIuXHJcbiAqL1xyXG5jbGFzcyBDb25zdGFudE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZSgpOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IHZhbHVlVGVuc29yID0gdGhpcy5hdHRyVGVuc29yKFwidmFsdWVcIik7XHJcbiAgICAgICAgaWYgKHZhbHVlVGVuc29yKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBnZXRJbml0aWFsaXplckRhdGEodmFsdWVUZW5zb3IpO1xyXG4gICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShkYXRhKSwgWy4uLnZhbHVlVGVuc29yLmRpbXNdKV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIFNjYWxhciBmYWxsYmFja1xyXG4gICAgICAgIGNvbnN0IHZhbCA9IHRoaXMuYXR0cihcInZhbHVlX2Zsb2F0XCIsIDApO1xyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KFt2YWxdKSwgWzFdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFeHBhbmQ6IGJyb2FkY2FzdCBhIHRlbnNvciB0byBhIHRhcmdldCBzaGFwZS5cclxuICogSW5wdXQgMDogZGF0YSB0ZW5zb3JcclxuICogSW5wdXQgMTogc2hhcGUgdGVuc29yIChpbnQ2NCB2YWx1ZXMgYXMgZmxvYXQpXHJcbiAqL1xyXG5jbGFzcyBFeHBhbmROb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGRhdGEgPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3Qgc2hhcGVUID0gaW5wdXRzWzFdO1xyXG4gICAgICAgIGNvbnN0IHRhcmdldFNoYXBlID0gQXJyYXkuZnJvbShzaGFwZVQuZGF0YSkubWFwKE1hdGgucm91bmQpO1xyXG5cclxuICAgICAgICAvLyBDb21wdXRlIG91dHB1dCBzaXplXHJcbiAgICAgICAgbGV0IG91dFNpemUgPSAxO1xyXG4gICAgICAgIGZvciAoY29uc3QgZCBvZiB0YXJnZXRTaGFwZSkgb3V0U2l6ZSAqPSBkO1xyXG5cclxuICAgICAgICAvLyBJZiBzaGFwZXMgYXJlIGlkZW50aWNhbCwgcmV0dXJuIGNvcHlcclxuICAgICAgICBpZiAoZGF0YS5kYXRhLmxlbmd0aCA9PT0gb3V0U2l6ZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShkYXRhLmRhdGEpLCB0YXJnZXRTaGFwZSldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQnJvYWRjYXN0OiBhbGlnbiBzaGFwZXMgcmlnaHQsIGV4cGFuZCBkaW1zIG9mIHNpemUgMVxyXG4gICAgICAgIGNvbnN0IHNyY1NoYXBlID0gZGF0YS5zaGFwZTtcclxuICAgICAgICBjb25zdCByYW5rID0gdGFyZ2V0U2hhcGUubGVuZ3RoO1xyXG4gICAgICAgIGNvbnN0IHNyY1BhZGRlZDogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJhbms7IGkrKykge1xyXG4gICAgICAgICAgICBjb25zdCBzaSA9IGkgLSAocmFuayAtIHNyY1NoYXBlLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIHNyY1BhZGRlZC5wdXNoKHNpID49IDAgPyBzcmNTaGFwZVtzaV0gOiAxKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkob3V0U2l6ZSk7XHJcbiAgICAgICAgLy8gQ29tcHV0ZSBzdHJpZGVzIGZvciBzb3VyY2UgYW5kIG91dHB1dFxyXG4gICAgICAgIGNvbnN0IG91dFN0cmlkZXM6IG51bWJlcltdID0gbmV3IEFycmF5KHJhbmspO1xyXG4gICAgICAgIGNvbnN0IHNyY1N0cmlkZXM6IG51bWJlcltdID0gbmV3IEFycmF5KHJhbmspO1xyXG4gICAgICAgIG91dFN0cmlkZXNbcmFuayAtIDFdID0gMTtcclxuICAgICAgICBzcmNTdHJpZGVzW3JhbmsgLSAxXSA9IDE7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IHJhbmsgLSAyOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgICAgICBvdXRTdHJpZGVzW2ldID0gb3V0U3RyaWRlc1tpICsgMV0gKiB0YXJnZXRTaGFwZVtpICsgMV07XHJcbiAgICAgICAgICAgIHNyY1N0cmlkZXNbaV0gPSBzcmNTdHJpZGVzW2kgKyAxXSAqIHNyY1BhZGRlZFtpICsgMV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCBvdXRTaXplOyBpZHgrKykge1xyXG4gICAgICAgICAgICBsZXQgc3JjSWR4ID0gMDtcclxuICAgICAgICAgICAgbGV0IHJlbSA9IGlkeDtcclxuICAgICAgICAgICAgZm9yIChsZXQgZCA9IDA7IGQgPCByYW5rOyBkKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvb3JkID0gTWF0aC5mbG9vcihyZW0gLyBvdXRTdHJpZGVzW2RdKTtcclxuICAgICAgICAgICAgICAgIHJlbSAlPSBvdXRTdHJpZGVzW2RdO1xyXG4gICAgICAgICAgICAgICAgLy8gSWYgc291cmNlIGRpbSBpcyAxLCBicm9hZGNhc3QgKHVzZSBjb29yZCAwKVxyXG4gICAgICAgICAgICAgICAgc3JjSWR4ICs9IChzcmNQYWRkZWRbZF0gPT09IDEgPyAwIDogY29vcmQpICogc3JjU3RyaWRlc1tkXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvdXRbaWR4XSA9IGRhdGEuZGF0YVtzcmNJZHhdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgdGFyZ2V0U2hhcGUpXTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyTWlzY09wcyhyZWdpc3RyeTogT25ueE9wUmVnaXN0cnkpOiB2b2lkIHtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiRGl2XCIsIChpbmZvKSA9PiBuZXcgRGl2Tm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlBvd1wiLCAoaW5mbykgPT4gbmV3IFBvd05vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJSZWR1Y2VNZWFuXCIsIChpbmZvKSA9PiBuZXcgUmVkdWNlTWVhbk5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJSZWR1Y2VTdW1cIiwgKGluZm8pID0+IG5ldyBSZWR1Y2VTdW1Ob2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiSWRlbnRpdHlcIiwgKGluZm8pID0+IG5ldyBJZGVudGl0eU5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJDYXN0XCIsIChpbmZvKSA9PiBuZXcgQ2FzdE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTaGFwZVwiLCAoaW5mbykgPT4gbmV3IFNoYXBlTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkNvbnN0YW50T2ZTaGFwZVwiLCAoaW5mbykgPT4gbmV3IENvbnN0YW50T2ZTaGFwZU5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJQYWRcIiwgKGluZm8pID0+IG5ldyBQYWROb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiTWluXCIsIChpbmZvKSA9PiBuZXcgTWluTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIk1heFwiLCAoaW5mbykgPT4gbmV3IE1heE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJDb25zdGFudFwiLCAoaW5mbykgPT4gbmV3IENvbnN0YW50Tm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkV4cGFuZFwiLCAoaW5mbykgPT4gbmV3IEV4cGFuZE5vZGUoaW5mbykpO1xyXG59XHJcbiIsImltcG9ydCB0eXBlIHsgSVRlbnNvciB9IGZyb20gXCIuLi8uLi9jb21wdXRlL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xyXG5pbXBvcnQgdHlwZSB7IE9ubnhOb2RlSW5mbyB9IGZyb20gXCIuLi9vbm54LXR5cGVzXCI7XHJcbmltcG9ydCB7IE9ubnhPcE5vZGUsIG1ha2VUZW5zb3IsIE9ubnhPcFJlZ2lzdHJ5IH0gZnJvbSBcIi4uL3JlZ2lzdHJ5XCI7XHJcblxyXG4vKipcclxuICogQmF0Y2hOb3JtYWxpemF0aW9uOiBZID0gKFggLSBtZWFuKSAvIHNxcnQodmFyICsgZXBzKSAqIHNjYWxlICsgYmlhc1xyXG4gKiBJbnB1dHM6IFgsIHNjYWxlLCBCLCBtZWFuLCB2YXJcclxuICogRm9yIDJEIFtOLCBDXTogbm9ybWFsaXplIHBlciBjaGFubmVsLlxyXG4gKiBGb3IgM0QgW04sIEMsIExdOiBub3JtYWxpemUgcGVyIGNoYW5uZWwgYWNyb3NzIHNwYXRpYWwuXHJcbiAqL1xyXG5jbGFzcyBCYXRjaE5vcm1Ob2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVwczogbnVtYmVyO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5lcHMgPSB0aGlzLmF0dHIoXCJlcHNpbG9uXCIsIDFlLTUpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3Qgc2NhbGUgPSBpbnB1dHNbMV07XHJcbiAgICAgICAgY29uc3QgYmlhcyA9IGlucHV0c1syXTtcclxuICAgICAgICBjb25zdCBtZWFuID0gaW5wdXRzWzNdO1xyXG4gICAgICAgIGNvbnN0IHZhcmlhbmNlID0gaW5wdXRzWzRdO1xyXG5cclxuICAgICAgICBpZiAoIXNjYWxlIHx8ICFiaWFzIHx8ICFtZWFuIHx8ICF2YXJpYW5jZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShYLmRhdGEpLCBbLi4uWC5zaGFwZV0pXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoWC5kYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgY29uc3QgQyA9IHNjYWxlLmRhdGEubGVuZ3RoO1xyXG5cclxuICAgICAgICBpZiAoWC5zaGFwZS5sZW5ndGggPT09IDIpIHtcclxuICAgICAgICAgICAgY29uc3QgTiA9IFguc2hhcGVbMF07XHJcbiAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgTjsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IEM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IG4gKiBDICsgYztcclxuICAgICAgICAgICAgICAgICAgICBvdXRbaWR4XSA9IChYLmRhdGFbaWR4XSAtIG1lYW4uZGF0YVtjXSkgLyBNYXRoLnNxcnQodmFyaWFuY2UuZGF0YVtjXSArIHRoaXMuZXBzKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAqIHNjYWxlLmRhdGFbY10gKyBiaWFzLmRhdGFbY107XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKFguc2hhcGUubGVuZ3RoID09PSAzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IE4gPSBYLnNoYXBlWzBdO1xyXG4gICAgICAgICAgICBjb25zdCBMID0gWC5zaGFwZVsyXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgQzsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW52U3RkID0gMSAvIE1hdGguc3FydCh2YXJpYW5jZS5kYXRhW2NdICsgdGhpcy5lcHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGwgPSAwOyBsIDwgTDsgbCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IG4gKiBDICogTCArIGMgKiBMICsgbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0W2lkeF0gPSAoWC5kYXRhW2lkeF0gLSBtZWFuLmRhdGFbY10pICogaW52U3RkICogc2NhbGUuZGF0YVtjXSArIGJpYXMuZGF0YVtjXTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBvdXQuc2V0KFguZGF0YSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbLi4uWC5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIExheWVyTm9ybWFsaXphdGlvbjogbm9ybWFsaXplIGFjcm9zcyB0aGUgbGFzdCBheGlzLlxyXG4gKi9cclxuY2xhc3MgTGF5ZXJOb3JtTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBlcHM6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYXhpczogbnVtYmVyO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5lcHMgPSB0aGlzLmF0dHIoXCJlcHNpbG9uXCIsIDFlLTUpO1xyXG4gICAgICAgIHRoaXMuYXhpcyA9IHRoaXMuYXR0ckludChcImF4aXNcIiwgLTEpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3Qgc2NhbGUgPSBpbnB1dHMubGVuZ3RoID49IDIgPyBpbnB1dHNbMV0gOiBudWxsO1xyXG4gICAgICAgIGNvbnN0IGJpYXMgPSBpbnB1dHMubGVuZ3RoID49IDMgPyBpbnB1dHNbMl0gOiBudWxsO1xyXG5cclxuICAgICAgICBjb25zdCBzaGFwZSA9IFguc2hhcGU7XHJcbiAgICAgICAgY29uc3QgcmFuayA9IHNoYXBlLmxlbmd0aDtcclxuICAgICAgICBjb25zdCBheGlzID0gdGhpcy5heGlzIDwgMCA/IHJhbmsgKyB0aGlzLmF4aXMgOiB0aGlzLmF4aXM7XHJcbiAgICAgICAgY29uc3Qgb3V0ZXJTaXplID0gc2hhcGUuc2xpY2UoMCwgYXhpcykucmVkdWNlKChhLCBiKSA9PiBhICogYiwgMSk7XHJcbiAgICAgICAgY29uc3QgaW5uZXJTaXplID0gc2hhcGUuc2xpY2UoYXhpcykucmVkdWNlKChhLCBiKSA9PiBhICogYiwgMSk7XHJcblxyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoWC5kYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRlclNpemU7IGkrKykge1xyXG4gICAgICAgICAgICBjb25zdCBiYXNlID0gaSAqIGlubmVyU2l6ZTtcclxuICAgICAgICAgICAgbGV0IG1lYW4gPSAwO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGlubmVyU2l6ZTsgaisrKSBtZWFuICs9IFguZGF0YVtiYXNlICsgal07XHJcbiAgICAgICAgICAgIG1lYW4gLz0gaW5uZXJTaXplO1xyXG4gICAgICAgICAgICBsZXQgdmFyaWFuY2UgPSAwO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGlubmVyU2l6ZTsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkID0gWC5kYXRhW2Jhc2UgKyBqXSAtIG1lYW47XHJcbiAgICAgICAgICAgICAgICB2YXJpYW5jZSArPSBkICogZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXJpYW5jZSAvPSBpbm5lclNpemU7XHJcbiAgICAgICAgICAgIGNvbnN0IGludlN0ZCA9IDEgLyBNYXRoLnNxcnQodmFyaWFuY2UgKyB0aGlzLmVwcyk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgaW5uZXJTaXplOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCB2YWwgPSAoWC5kYXRhW2Jhc2UgKyBqXSAtIG1lYW4pICogaW52U3RkO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNjYWxlKSB2YWwgKj0gc2NhbGUuZGF0YVtqICUgc2NhbGUuZGF0YS5sZW5ndGhdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGJpYXMpIHZhbCArPSBiaWFzLmRhdGFbaiAlIGJpYXMuZGF0YS5sZW5ndGhdO1xyXG4gICAgICAgICAgICAgICAgb3V0W2Jhc2UgKyBqXSA9IHZhbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgWy4uLnNoYXBlXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogRHJvcG91dDogcGFzc3Rocm91Z2ggZHVyaW5nIGluZmVyZW5jZS5cclxuICovXHJcbmNsYXNzIERyb3BvdXROb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIC8vIER1cmluZyBpbmZlcmVuY2UsIGRyb3BvdXQgaXMgYSBuby1vcFxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KGlucHV0c1swXS5kYXRhKSwgWy4uLmlucHV0c1swXS5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyTm9ybU9wcyhyZWdpc3RyeTogT25ueE9wUmVnaXN0cnkpOiB2b2lkIHtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiQmF0Y2hOb3JtYWxpemF0aW9uXCIsIChpbmZvKSA9PiBuZXcgQmF0Y2hOb3JtTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkxheWVyTm9ybWFsaXphdGlvblwiLCAoaW5mbykgPT4gbmV3IExheWVyTm9ybU5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJJbnN0YW5jZU5vcm1hbGl6YXRpb25cIiwgKGluZm8pID0+IG5ldyBCYXRjaE5vcm1Ob2RlKGluZm8pKTsgLy8gc2FtZSBsb2dpY1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJEcm9wb3V0XCIsIChpbmZvKSA9PiBuZXcgRHJvcG91dE5vZGUoaW5mbykpO1xyXG59XHJcbiIsImltcG9ydCB0eXBlIHsgSVRlbnNvciB9IGZyb20gXCIuLi8uLi9jb21wdXRlL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xyXG5pbXBvcnQgdHlwZSB7IE9ubnhOb2RlSW5mbyB9IGZyb20gXCIuLi9vbm54LXR5cGVzXCI7XHJcbmltcG9ydCB7IE9ubnhPcE5vZGUsIG1ha2VUZW5zb3IsIE9ubnhPcFJlZ2lzdHJ5IH0gZnJvbSBcIi4uL3JlZ2lzdHJ5XCI7XHJcblxyXG5mdW5jdGlvbiBzaWdtb2lkKHg6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gMSAvICgxICsgTWF0aC5leHAoLXgpKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIExTVE06IExvbmcgU2hvcnQtVGVybSBNZW1vcnkuXHJcbiAqXHJcbiAqIElucHV0czogWCBbc2VxX2xlbiwgYmF0Y2gsIGlucHV0X3NpemVdLCBXIFtudW1fZGlyLCA0KmhpZGRlbiwgaW5wdXRdLCBSIFtudW1fZGlyLCA0KmhpZGRlbiwgaGlkZGVuXSxcclxuICogICAgICAgICBCIFtudW1fZGlyLCA4KmhpZGRlbl0gKG9wdGlvbmFsKSwgc2VxdWVuY2VfbGVucywgaW5pdGlhbF9oaWRkZW4sIGluaXRpYWxfY2VsbFxyXG4gKlxyXG4gKiBTaW1wbGlmaWVkOiBzaW5nbGUgZGlyZWN0aW9uLCBiYXRjaD0xLCAyRCBpbnB1dCBbc2VxX2xlbiwgaW5wdXRfc2l6ZV0uXHJcbiAqIFJldHVybnMgWV9oIFsxLCAxLCBoaWRkZW5fc2l6ZV0gKGxhc3QgaGlkZGVuIHN0YXRlKS5cclxuICovXHJcbmNsYXNzIExTVE1Ob2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGhpZGRlblNpemU6IG51bWJlcjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKGluZm8pO1xyXG4gICAgICAgIHRoaXMuaGlkZGVuU2l6ZSA9IHRoaXMuYXR0ckludChcImhpZGRlbl9zaXplXCIsIDApO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF07IC8vIFtzZXFfbGVuLCBpbnB1dF9zaXplXSBvciBbc2VxX2xlbiwgYmF0Y2gsIGlucHV0X3NpemVdXHJcbiAgICAgICAgY29uc3QgVyA9IGlucHV0c1sxXTsgLy8gWzEsIDQqSCwgaW5wdXRfc2l6ZV1cclxuICAgICAgICBjb25zdCBSID0gaW5wdXRzWzJdOyAvLyBbMSwgNCpILCBIXVxyXG4gICAgICAgIGNvbnN0IEIgPSBpbnB1dHMubGVuZ3RoID4gMyA/IGlucHV0c1szXSA6IG51bGw7IC8vIFsxLCA4KkhdXHJcblxyXG4gICAgICAgIGNvbnN0IHNlcUxlbiA9IFguc2hhcGVbMF07XHJcbiAgICAgICAgY29uc3QgaW5wdXRTaXplID0gWC5zaGFwZS5sZW5ndGggPj0gMyA/IFguc2hhcGVbMl0gOiBYLnNoYXBlWzFdO1xyXG4gICAgICAgIGNvbnN0IEggPSB0aGlzLmhpZGRlblNpemUgfHwgVy5kYXRhLmxlbmd0aCAvICg0ICogaW5wdXRTaXplKTtcclxuXHJcbiAgICAgICAgbGV0IGggPSBuZXcgRmxvYXQzMkFycmF5KEgpO1xyXG4gICAgICAgIGxldCBjID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuXHJcbiAgICAgICAgLy8gUHJlLWV4dHJhY3QgVyBhbmQgUiBtYXRyaWNlcyAoc3RvcmVkIGFzIFs0KkgsIGlucHV0XSBhbmQgWzQqSCwgSF0pXHJcbiAgICAgICAgY29uc3QgVzRIID0gVy5kYXRhO1xyXG4gICAgICAgIGNvbnN0IFI0SCA9IFIuZGF0YTtcclxuICAgICAgICBjb25zdCBiaWFzVyA9IEIgPyBCLmRhdGEgOiBudWxsO1xyXG5cclxuICAgICAgICBmb3IgKGxldCB0ID0gMDsgdCA8IHNlcUxlbjsgdCsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHhPZmZzZXQgPSB0ICogaW5wdXRTaXplO1xyXG4gICAgICAgICAgICBjb25zdCBnYXRlcyA9IG5ldyBGbG9hdDMyQXJyYXkoNCAqIEgpO1xyXG5cclxuICAgICAgICAgICAgLy8gZ2F0ZXMgPSBXIEAgeCArIFIgQCBoICsgYmlhc1xyXG4gICAgICAgICAgICBmb3IgKGxldCBnID0gMDsgZyA8IDQgKiBIOyBnKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dFNpemU7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHN1bSArPSBXNEhbZyAqIGlucHV0U2l6ZSArIGldICogWC5kYXRhW3hPZmZzZXQgKyBpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgSDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VtICs9IFI0SFtnICogSCArIGpdICogaFtqXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChiaWFzVykge1xyXG4gICAgICAgICAgICAgICAgICAgIHN1bSArPSBiaWFzV1tnXSArIGJpYXNXWzQgKiBIICsgZ107IC8vIFcgYmlhcyArIFIgYmlhc1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZ2F0ZXNbZ10gPSBzdW07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGk9c2lnbW9pZCwgbz1zaWdtb2lkLCBmPXNpZ21vaWQsIGMnPXRhbmggKElPRkMgb3JkZXIgaW4gT05OWClcclxuICAgICAgICAgICAgY29uc3QgbmV3SCA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5ld0MgPSBuZXcgRmxvYXQzMkFycmF5KEgpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IEg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaSA9IHNpZ21vaWQoZ2F0ZXNbMCAqIEggKyBqXSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBvID0gc2lnbW9pZChnYXRlc1sxICogSCArIGpdKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGYgPSBzaWdtb2lkKGdhdGVzWzIgKiBIICsgal0pO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZyA9IE1hdGgudGFuaChnYXRlc1szICogSCArIGpdKTtcclxuICAgICAgICAgICAgICAgIG5ld0Nbal0gPSBmICogY1tqXSArIGkgKiBnO1xyXG4gICAgICAgICAgICAgICAgbmV3SFtqXSA9IG8gKiBNYXRoLnRhbmgobmV3Q1tqXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaCA9IG5ld0g7XHJcbiAgICAgICAgICAgIGMgPSBuZXdDO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmV0dXJuIGxhc3QgaGlkZGVuIHN0YXRlIFsxLCAxLCBIXVxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihoLCBbMSwgMSwgSF0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEdSVTogR2F0ZWQgUmVjdXJyZW50IFVuaXQuXHJcbiAqXHJcbiAqIFNpbXBsaWZpZWQ6IHNpbmdsZSBkaXJlY3Rpb24sIGJhdGNoPTEuXHJcbiAqIFJldHVybnMgWV9oIFsxLCAxLCBoaWRkZW5fc2l6ZV0uXHJcbiAqL1xyXG5jbGFzcyBHUlVOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGhpZGRlblNpemU6IG51bWJlcjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKGluZm8pO1xyXG4gICAgICAgIHRoaXMuaGlkZGVuU2l6ZSA9IHRoaXMuYXR0ckludChcImhpZGRlbl9zaXplXCIsIDApO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3QgVyA9IGlucHV0c1sxXTsgLy8gWzEsIDMqSCwgaW5wdXRfc2l6ZV1cclxuICAgICAgICBjb25zdCBSID0gaW5wdXRzWzJdOyAvLyBbMSwgMypILCBIXVxyXG4gICAgICAgIGNvbnN0IEIgPSBpbnB1dHMubGVuZ3RoID4gMyA/IGlucHV0c1szXSA6IG51bGw7XHJcblxyXG4gICAgICAgIGNvbnN0IHNlcUxlbiA9IFguc2hhcGVbMF07XHJcbiAgICAgICAgY29uc3QgaW5wdXRTaXplID0gWC5zaGFwZS5sZW5ndGggPj0gMyA/IFguc2hhcGVbMl0gOiBYLnNoYXBlWzFdO1xyXG4gICAgICAgIGNvbnN0IEggPSB0aGlzLmhpZGRlblNpemUgfHwgVy5kYXRhLmxlbmd0aCAvICgzICogaW5wdXRTaXplKTtcclxuXHJcbiAgICAgICAgbGV0IGggPSBuZXcgRmxvYXQzMkFycmF5KEgpO1xyXG4gICAgICAgIGNvbnN0IFczSCA9IFcuZGF0YTtcclxuICAgICAgICBjb25zdCBSM0ggPSBSLmRhdGE7XHJcbiAgICAgICAgY29uc3QgYmlhc1cgPSBCID8gQi5kYXRhIDogbnVsbDtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCBzZXFMZW47IHQrKykge1xyXG4gICAgICAgICAgICBjb25zdCB4T2Zmc2V0ID0gdCAqIGlucHV0U2l6ZTtcclxuXHJcbiAgICAgICAgICAgIC8vIENvbXB1dGUgeiBhbmQgciBnYXRlczogZ2F0ZSA9IHNpZ21vaWQoV19nYXRlIEAgeCArIFJfZ2F0ZSBAIGggKyBiaWFzKVxyXG4gICAgICAgICAgICBjb25zdCB6R2F0ZSA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHJHYXRlID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBIOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCB6U3VtID0gMDtcclxuICAgICAgICAgICAgICAgIGxldCByU3VtID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRTaXplOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICB6U3VtICs9IFczSFsoMCAqIEggKyBqKSAqIGlucHV0U2l6ZSArIGldICogWC5kYXRhW3hPZmZzZXQgKyBpXTtcclxuICAgICAgICAgICAgICAgICAgICByU3VtICs9IFczSFsoMSAqIEggKyBqKSAqIGlucHV0U2l6ZSArIGldICogWC5kYXRhW3hPZmZzZXQgKyBpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgSDsgaysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgelN1bSArPSBSM0hbKDAgKiBIICsgaikgKiBIICsga10gKiBoW2tdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJTdW0gKz0gUjNIWygxICogSCArIGopICogSCArIGtdICogaFtrXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChiaWFzVykge1xyXG4gICAgICAgICAgICAgICAgICAgIHpTdW0gKz0gYmlhc1dbMCAqIEggKyBqXSArIGJpYXNXWzMgKiBIICsgal07XHJcbiAgICAgICAgICAgICAgICAgICAgclN1bSArPSBiaWFzV1sxICogSCArIGpdICsgYmlhc1dbNCAqIEggKyBqXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHpHYXRlW2pdID0gc2lnbW9pZCh6U3VtKTtcclxuICAgICAgICAgICAgICAgIHJHYXRlW2pdID0gc2lnbW9pZChyU3VtKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gQ29tcHV0ZSBjYW5kaWRhdGUgd2l0aCBsaW5lYXJfYmVmb3JlX3Jlc2V0PTEgKE9OTlggZGVmYXVsdCBmb3IgbW9zdCBleHBvcnRlcnMpOlxyXG4gICAgICAgICAgICAvLyBuID0gdGFuaChXbiBAIHggKyBXYl9uICsgciAqIChSbiBAIGggKyBSYl9uKSlcclxuICAgICAgICAgICAgY29uc3QgbmV3SCA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgSDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgblN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0U2l6ZTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgblN1bSArPSBXM0hbKDIgKiBIICsgaikgKiBpbnB1dFNpemUgKyBpXSAqIFguZGF0YVt4T2Zmc2V0ICsgaV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoYmlhc1cpIHtcclxuICAgICAgICAgICAgICAgICAgICBuU3VtICs9IGJpYXNXWzIgKiBIICsgal07IC8vIFcgYmlhcyBmb3IgY2FuZGlkYXRlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBIOyBrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICByaCArPSBSM0hbKDIgKiBIICsgaikgKiBIICsga10gKiBoW2tdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGJpYXNXKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmggKz0gYmlhc1dbNSAqIEggKyBqXTsgLy8gUiBiaWFzIGZvciBjYW5kaWRhdGUgKGluc2lkZSByZXNldClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIG5TdW0gKz0gckdhdGVbal0gKiByaDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG4gPSBNYXRoLnRhbmgoblN1bSk7XHJcbiAgICAgICAgICAgICAgICBuZXdIW2pdID0gKDEgLSB6R2F0ZVtqXSkgKiBuICsgekdhdGVbal0gKiBoW2pdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGggPSBuZXdIO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKGgsIFsxLCAxLCBIXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJSZWN1cnJlbnRPcHMocmVnaXN0cnk6IE9ubnhPcFJlZ2lzdHJ5KTogdm9pZCB7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkxTVE1cIiwgKGluZm8pID0+IG5ldyBMU1RNTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkdSVVwiLCAoaW5mbykgPT4gbmV3IEdSVU5vZGUoaW5mbykpO1xyXG59XHJcbiIsImltcG9ydCB0eXBlIHsgSVRlbnNvciB9IGZyb20gXCIuLi8uLi9jb21wdXRlL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xyXG5pbXBvcnQgdHlwZSB7IE9ubnhOb2RlSW5mbyB9IGZyb20gXCIuLi9vbm54LXR5cGVzXCI7XHJcbmltcG9ydCB7IE9ubnhPcE5vZGUsIG1ha2VUZW5zb3IsIE9ubnhPcFJlZ2lzdHJ5LCBQUklPUklUWV9OQVRJVkUgfSBmcm9tIFwiLi4vcmVnaXN0cnlcIjtcclxuXHJcbmNvbnN0IEJBQ0tFTkQgPSBcInNwaWt5cGFuZGFcIjtcclxuXHJcbi8vIOKUgOKUgOKUgCBBY3RpdmF0aW9uIGZ1bmN0aW9ucyAobWF0Y2hpbmcgc3Bpa3lwYW5kYS1jb3JlIEFjdGl2YXRpb25GdW5jdGlvbnMpIOKUgOKUgOKUgOKUgFxyXG5cclxuZnVuY3Rpb24gc3BSZWx1KHg6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gTWF0aC5tYXgoMCwgeCk7XHJcbn1cclxuZnVuY3Rpb24gc3BTaWdtb2lkKHg6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gMSAvICgxICsgTWF0aC5leHAoLXgpKTtcclxufVxyXG5mdW5jdGlvbiBzcFRhbmgoeDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBNYXRoLnRhbmgoeCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVuYXJ5TWFwKGlucDogSVRlbnNvciwgZm46ICh4OiBudW1iZXIpID0+IG51bWJlcik6IElUZW5zb3Ige1xyXG4gICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShpbnAuZGF0YS5sZW5ndGgpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnAuZGF0YS5sZW5ndGg7IGkrKykgb3V0W2ldID0gZm4oaW5wLmRhdGFbaV0pO1xyXG4gICAgcmV0dXJuIG1ha2VUZW5zb3Iob3V0LCBbLi4uaW5wLnNoYXBlXSk7XHJcbn1cclxuXHJcbmNsYXNzIFNwR2VtbU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYWxwaGE6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYmV0YTogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0cmFuc0E6IGJvb2xlYW47XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRyYW5zQjogYm9vbGVhbjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKGluZm8pO1xyXG4gICAgICAgIHRoaXMuYWxwaGEgPSB0aGlzLmF0dHIoXCJhbHBoYVwiLCAxLjApO1xyXG4gICAgICAgIHRoaXMuYmV0YSA9IHRoaXMuYXR0cihcImJldGFcIiwgMS4wKTtcclxuICAgICAgICB0aGlzLnRyYW5zQSA9IHRoaXMuYXR0ckludChcInRyYW5zQVwiLCAwKSAhPT0gMDtcclxuICAgICAgICB0aGlzLnRyYW5zQiA9IHRoaXMuYXR0ckludChcInRyYW5zQlwiLCAwKSAhPT0gMDtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBBID0gaW5wdXRzWzBdLFxyXG4gICAgICAgICAgICBCID0gaW5wdXRzWzFdO1xyXG4gICAgICAgIGNvbnN0IEMgPSBpbnB1dHMubGVuZ3RoID4gMiA/IGlucHV0c1syXSA6IG51bGw7XHJcbiAgICAgICAgY29uc3QgYVIgPSBBLnNoYXBlWzBdID8/IDEsXHJcbiAgICAgICAgICAgIGFDID0gQS5zaGFwZS5sZW5ndGggPj0gMiA/IEEuc2hhcGVbMV0gOiBBLmRhdGEubGVuZ3RoO1xyXG4gICAgICAgIGNvbnN0IGJSID0gQi5zaGFwZVswXSA/PyAxLFxyXG4gICAgICAgICAgICBiQyA9IEIuc2hhcGUubGVuZ3RoID49IDIgPyBCLnNoYXBlWzFdIDogQi5kYXRhLmxlbmd0aDtcclxuICAgICAgICBjb25zdCBNID0gdGhpcy50cmFuc0EgPyBhQyA6IGFSO1xyXG4gICAgICAgIGNvbnN0IEsgPSB0aGlzLnRyYW5zQSA/IGFSIDogYUM7XHJcbiAgICAgICAgY29uc3QgTiA9IHRoaXMudHJhbnNCID8gYlIgOiBiQztcclxuXHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShNICogTik7XHJcbiAgICAgICAgY29uc3QgYURhdGEgPSBBLmRhdGEsXHJcbiAgICAgICAgICAgIGJEYXRhID0gQi5kYXRhO1xyXG5cclxuICAgICAgICAvLyBPcHRpbWl6ZWQ6IGxvb3AgdGlsaW5nIGZvciBjYWNoZSBsb2NhbGl0eSBvbiBzbWFsbCBtYXRyaWNlc1xyXG4gICAgICAgIGlmICghdGhpcy50cmFuc0EgJiYgIXRoaXMudHJhbnNCKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG0gPSAwOyBtIDwgTTsgbSsrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBtSyA9IG0gKiBLO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbU4gPSBtICogTjtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgSzsgaysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYSA9IHRoaXMuYWxwaGEgKiBhRGF0YVttSyArIGtdO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtOID0gayAqIE47XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0W21OICsgbl0gKz0gYSAqIGJEYXRhW2tOICsgbl07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgbSA9IDA7IG0gPCBNOyBtKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgTjsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBLOyBrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWkgPSB0aGlzLnRyYW5zQSA/IGsgKiBNICsgbSA6IG0gKiBLICsgaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYmkgPSB0aGlzLnRyYW5zQiA/IG4gKiBLICsgayA6IGsgKiBOICsgbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VtICs9IGFEYXRhW2FpXSAqIGJEYXRhW2JpXTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W20gKiBOICsgbl0gPSB0aGlzLmFscGhhICogc3VtO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoQykge1xyXG4gICAgICAgICAgICBjb25zdCBjRGF0YSA9IEMuZGF0YTtcclxuICAgICAgICAgICAgY29uc3QgY0xlbiA9IGNEYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgaWYgKGNMZW4gPT09IE4pIHtcclxuICAgICAgICAgICAgICAgIC8vIEJpYXMgaXMgWzEsIE5dOiBicm9hZGNhc3QgcGVyIHJvd1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgbSA9IDA7IG0gPCBNOyBtKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtTiA9IG0gKiBOO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgTjsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dFttTiArIG5dICs9IHRoaXMuYmV0YSAqIGNEYXRhW25dO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W2ldICs9IHRoaXMuYmV0YSAqIGNEYXRhW2kgJSBjTGVuXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW00sIE5dKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFNwTHN0bU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaGlkZGVuU2l6ZTogbnVtYmVyO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5oaWRkZW5TaXplID0gdGhpcy5hdHRySW50KFwiaGlkZGVuX3NpemVcIiwgMCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgWCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBXID0gaW5wdXRzWzFdO1xyXG4gICAgICAgIGNvbnN0IFIgPSBpbnB1dHNbMl07XHJcbiAgICAgICAgY29uc3QgQiA9IGlucHV0cy5sZW5ndGggPiAzID8gaW5wdXRzWzNdIDogbnVsbDtcclxuXHJcbiAgICAgICAgY29uc3Qgc2VxTGVuID0gWC5zaGFwZVswXTtcclxuICAgICAgICBjb25zdCBpbnB1dFNpemUgPSBYLnNoYXBlLmxlbmd0aCA+PSAzID8gWC5zaGFwZVsyXSA6IFguc2hhcGVbMV07XHJcbiAgICAgICAgY29uc3QgSCA9IHRoaXMuaGlkZGVuU2l6ZSB8fCBXLmRhdGEubGVuZ3RoIC8gKDQgKiBpbnB1dFNpemUpO1xyXG5cclxuICAgICAgICBsZXQgaCA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgbGV0IGMgPSBuZXcgRmxvYXQzMkFycmF5KEgpO1xyXG4gICAgICAgIGNvbnN0IFc0SCA9IFcuZGF0YSxcclxuICAgICAgICAgICAgUjRIID0gUi5kYXRhO1xyXG4gICAgICAgIGNvbnN0IGJpYXNXID0gQiA/IEIuZGF0YSA6IG51bGw7XHJcblxyXG4gICAgICAgIC8vIFByZS1hbGxvY2F0ZSBnYXRlIGJ1ZmZlclxyXG4gICAgICAgIGNvbnN0IGdhdGVzID0gbmV3IEZsb2F0MzJBcnJheSg0ICogSCk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IHQgPSAwOyB0IDwgc2VxTGVuOyB0KyspIHtcclxuICAgICAgICAgICAgY29uc3QgeE9mZiA9IHQgKiBpbnB1dFNpemU7XHJcblxyXG4gICAgICAgICAgICAvLyBDb21wdXRlIGdhdGVzOiBXKnggKyBSKmggKyBiaWFzXHJcbiAgICAgICAgICAgIGdhdGVzLmZpbGwoMCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGcgPSAwOyBnIDwgNCAqIEg7IGcrKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBnSW5wdXQgPSBnICogaW5wdXRTaXplO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZ0hpZGRlbiA9IGcgKiBIO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dFNpemU7IGkrKykgc3VtICs9IFc0SFtnSW5wdXQgKyBpXSAqIFguZGF0YVt4T2ZmICsgaV07XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IEg7IGorKykgc3VtICs9IFI0SFtnSGlkZGVuICsgal0gKiBoW2pdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGJpYXNXKSBzdW0gKz0gYmlhc1dbZ10gKyBiaWFzV1s0ICogSCArIGddO1xyXG4gICAgICAgICAgICAgICAgZ2F0ZXNbZ10gPSBzdW07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEFwcGx5IGdhdGUgZnVuY3Rpb25zIChJT0ZDIG9yZGVyKVxyXG4gICAgICAgICAgICBjb25zdCBuZXdIID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuICAgICAgICAgICAgY29uc3QgbmV3QyA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgSDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpID0gc3BTaWdtb2lkKGdhdGVzW2pdKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG8gPSBzcFNpZ21vaWQoZ2F0ZXNbSCArIGpdKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGYgPSBzcFNpZ21vaWQoZ2F0ZXNbMiAqIEggKyBqXSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBnID0gc3BUYW5oKGdhdGVzWzMgKiBIICsgal0pO1xyXG4gICAgICAgICAgICAgICAgbmV3Q1tqXSA9IGYgKiBjW2pdICsgaSAqIGc7XHJcbiAgICAgICAgICAgICAgICBuZXdIW2pdID0gbyAqIHNwVGFuaChuZXdDW2pdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBoID0gbmV3SDtcclxuICAgICAgICAgICAgYyA9IG5ld0M7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IoaCwgWzEsIDEsIEhdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFNwR3J1Tm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBoaWRkZW5TaXplOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmhpZGRlblNpemUgPSB0aGlzLmF0dHJJbnQoXCJoaWRkZW5fc2l6ZVwiLCAwKTtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBYID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IFcgPSBpbnB1dHNbMV07XHJcbiAgICAgICAgY29uc3QgUiA9IGlucHV0c1syXTtcclxuICAgICAgICBjb25zdCBCID0gaW5wdXRzLmxlbmd0aCA+IDMgPyBpbnB1dHNbM10gOiBudWxsO1xyXG5cclxuICAgICAgICBjb25zdCBzZXFMZW4gPSBYLnNoYXBlWzBdO1xyXG4gICAgICAgIGNvbnN0IGlucHV0U2l6ZSA9IFguc2hhcGUubGVuZ3RoID49IDMgPyBYLnNoYXBlWzJdIDogWC5zaGFwZVsxXTtcclxuICAgICAgICBjb25zdCBIID0gdGhpcy5oaWRkZW5TaXplIHx8IFcuZGF0YS5sZW5ndGggLyAoMyAqIGlucHV0U2l6ZSk7XHJcblxyXG4gICAgICAgIGxldCBoID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCBzZXFMZW47IHQrKykge1xyXG4gICAgICAgICAgICBjb25zdCB4T2ZmID0gdCAqIGlucHV0U2l6ZTtcclxuXHJcbiAgICAgICAgICAgIC8vIENvbXB1dGUgeiBhbmQgciBnYXRlczogZ2F0ZSA9IHNpZ21vaWQoV19nYXRlIEAgeCArIFJfZ2F0ZSBAIGggKyBiaWFzKVxyXG4gICAgICAgICAgICBjb25zdCB6R2F0ZSA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHJHYXRlID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBIOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCB6U3VtID0gMDtcclxuICAgICAgICAgICAgICAgIGxldCByU3VtID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRTaXplOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICB6U3VtICs9IFcuZGF0YVsoMCAqIEggKyBqKSAqIGlucHV0U2l6ZSArIGldICogWC5kYXRhW3hPZmYgKyBpXTtcclxuICAgICAgICAgICAgICAgICAgICByU3VtICs9IFcuZGF0YVsoMSAqIEggKyBqKSAqIGlucHV0U2l6ZSArIGldICogWC5kYXRhW3hPZmYgKyBpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgSDsgaysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgelN1bSArPSBSLmRhdGFbKDAgKiBIICsgaikgKiBIICsga10gKiBoW2tdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJTdW0gKz0gUi5kYXRhWygxICogSCArIGopICogSCArIGtdICogaFtrXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChCKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgelN1bSArPSBCLmRhdGFbMCAqIEggKyBqXSArIEIuZGF0YVszICogSCArIGpdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJTdW0gKz0gQi5kYXRhWzEgKiBIICsgal0gKyBCLmRhdGFbNCAqIEggKyBqXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHpHYXRlW2pdID0gc3BTaWdtb2lkKHpTdW0pO1xyXG4gICAgICAgICAgICAgICAgckdhdGVbal0gPSBzcFNpZ21vaWQoclN1bSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIENhbmRpZGF0ZSB3aXRoIGxpbmVhcl9iZWZvcmVfcmVzZXQ9MTpcclxuICAgICAgICAgICAgLy8gbiA9IHRhbmgoV24gQCB4ICsgV2JfbiArIHIgKiAoUm4gQCBoICsgUmJfbikpXHJcbiAgICAgICAgICAgIGNvbnN0IG5ld0ggPSBuZXcgRmxvYXQzMkFycmF5KEgpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IEg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5TdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dFNpemU7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIG5TdW0gKz0gVy5kYXRhWygyICogSCArIGopICogaW5wdXRTaXplICsgaV0gKiBYLmRhdGFbeE9mZiArIGldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKEIpIG5TdW0gKz0gQi5kYXRhWzIgKiBIICsgal07XHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBIOyBrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICByaCArPSBSLmRhdGFbKDIgKiBIICsgaikgKiBIICsga10gKiBoW2tdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKEIpIHJoICs9IEIuZGF0YVs1ICogSCArIGpdO1xyXG4gICAgICAgICAgICAgICAgblN1bSArPSByR2F0ZVtqXSAqIHJoO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbiA9IHNwVGFuaChuU3VtKTtcclxuICAgICAgICAgICAgICAgIG5ld0hbal0gPSAoMSAtIHpHYXRlW2pdKSAqIG4gKyB6R2F0ZVtqXSAqIGhbal07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaCA9IG5ld0g7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IoaCwgWzEsIDEsIEhdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFNwQ29udk5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF0sXHJcbiAgICAgICAgICAgIFcgPSBpbnB1dHNbMV07XHJcbiAgICAgICAgY29uc3QgQiA9IGlucHV0cy5sZW5ndGggPiAyID8gaW5wdXRzWzJdIDogbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKFguc2hhcGUubGVuZ3RoIDw9IDIpIHtcclxuICAgICAgICAgICAgLy8gVHJlYXQgMkQgYXMgZnVsbHkgY29ubmVjdGVkXHJcbiAgICAgICAgICAgIGNvbnN0IGZlYXR1cmVzID0gWC5zaGFwZS5sZW5ndGggPT09IDIgPyBYLnNoYXBlWzFdIDogWC5kYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBYLnNoYXBlWzBdID8/IDE7XHJcbiAgICAgICAgICAgIGNvbnN0IG91dEYgPSBXLnNoYXBlWzBdID8/IFcuZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgICAgIGNvbnN0IHdDb2xzID0gVy5kYXRhLmxlbmd0aCAvIG91dEY7XHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoYmF0Y2ggKiBvdXRGKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBiYXRjaDsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBvID0gMDsgbyA8IG91dEY7IG8rKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlbiA9IE1hdGgubWluKHdDb2xzLCBmZWF0dXJlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbkYgPSBuICogZmVhdHVyZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9XID0gbyAqIHdDb2xzO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHN1bSArPSBYLmRhdGFbbkYgKyBpXSAqIFcuZGF0YVtvVyArIGldO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChCKSBzdW0gKz0gQi5kYXRhW28gJSBCLmRhdGEubGVuZ3RoXTtcclxuICAgICAgICAgICAgICAgICAgICBvdXRbbiAqIG91dEYgKyBvXSA9IHN1bTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbYmF0Y2gsIG91dEZdKV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAzRDogW04sIENfaW4sIExdXHJcbiAgICAgICAgY29uc3QgTiA9IFguc2hhcGVbMF0sXHJcbiAgICAgICAgICAgIENfaW4gPSBYLnNoYXBlWzFdLFxyXG4gICAgICAgICAgICBMID0gWC5zaGFwZVsyXTtcclxuICAgICAgICBjb25zdCBDX291dCA9IFcuc2hhcGVbMF07XHJcbiAgICAgICAgY29uc3Qga0wgPSBXLnNoYXBlLmxlbmd0aCA+PSAzID8gVy5zaGFwZVsyXSA6IDE7XHJcbiAgICAgICAgY29uc3Qgc3RyaWRlID0gdGhpcy5hdHRySW50KFwic3RyaWRlc1wiLCAxKTtcclxuICAgICAgICBjb25zdCBwYWQgPSB0aGlzLmF0dHJJbnQoXCJwYWRzXCIsIDApO1xyXG4gICAgICAgIGNvbnN0IG91dEwgPSBNYXRoLmZsb29yKChMICsgMiAqIHBhZCAtIGtMKSAvIHN0cmlkZSkgKyAxO1xyXG5cclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KE4gKiBDX291dCAqIG91dEwpO1xyXG4gICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgTjsgbisrKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGNvID0gMDsgY28gPCBDX291dDsgY28rKykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgb2wgPSAwOyBvbCA8IG91dEw7IG9sKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBjaSA9IDA7IGNpIDwgQ19pbjsgY2krKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBrayA9IDA7IGtrIDwga0w7IGtrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlsID0gb2wgKiBzdHJpZGUgLSBwYWQgKyBraztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbCA+PSAwICYmIGlsIDwgTCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1bSArPSBYLmRhdGFbbiAqIENfaW4gKiBMICsgY2kgKiBMICsgaWxdICogVy5kYXRhW2NvICogQ19pbiAqIGtMICsgY2kgKiBrTCArIGtrXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoQikgc3VtICs9IEIuZGF0YVtjb107XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W24gKiBDX291dCAqIG91dEwgKyBjbyAqIG91dEwgKyBvbF0gPSBzdW07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW04sIENfb3V0LCBvdXRMXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyDilIDilIDilIAgUmVnaXN0cmF0aW9uIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuLyoqXHJcbiAqIFJlZ2lzdGVyIFNwaWt5UGFuZGEgbmF0aXZlIGltcGxlbWVudGF0aW9ucyBhdCBQUklPUklUWV9OQVRJVkUuXHJcbiAqIFRoZXNlIG92ZXJyaWRlIHRoZSBnZW5lcmljIE9OTlggaW1wbGVtZW50YXRpb25zIGZvciBrZXkgb3BzLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyU3Bpa3lQYW5kYU9wcyhyZWdpc3RyeTogT25ueE9wUmVnaXN0cnkpOiB2b2lkIHtcclxuICAgIC8vIEFjdGl2YXRpb25zICh1c2luZyBTcGlreVBhbmRhJ3MgYWN0aXZhdGlvbiBmdW5jdGlvbnMpXHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcclxuICAgICAgICBcIlJlbHVcIixcclxuICAgICAgICAoaW5mbykgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBuID0gbmV3IChjbGFzcyBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgICAgICAgICAgICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICAgICAgICAgICAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3VuYXJ5TWFwKGlucHV0c1swXSwgc3BSZWx1KV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pKGluZm8pO1xyXG4gICAgICAgICAgICByZXR1cm4gbjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIFBSSU9SSVRZX05BVElWRSxcclxuICAgICAgICBCQUNLRU5EXHJcbiAgICApO1xyXG5cclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFxyXG4gICAgICAgIFwiU2lnbW9pZFwiLFxyXG4gICAgICAgIChpbmZvKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IG4gPSBuZXcgKGNsYXNzIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICAgICAgICAgICAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgICAgICAgICAgICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbdW5hcnlNYXAoaW5wdXRzWzBdLCBzcFNpZ21vaWQpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSkoaW5mbyk7XHJcbiAgICAgICAgICAgIHJldHVybiBuO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgUFJJT1JJVFlfTkFUSVZFLFxyXG4gICAgICAgIEJBQ0tFTkRcclxuICAgICk7XHJcblxyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXHJcbiAgICAgICAgXCJUYW5oXCIsXHJcbiAgICAgICAgKGluZm8pID0+IHtcclxuICAgICAgICAgICAgY29uc3QgbiA9IG5ldyAoY2xhc3MgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgICAgICAgICAgICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnB1dHNbMF0sIHNwVGFuaCldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KShpbmZvKTtcclxuICAgICAgICAgICAgcmV0dXJuIG47XHJcbiAgICAgICAgfSxcclxuICAgICAgICBQUklPUklUWV9OQVRJVkUsXHJcbiAgICAgICAgQkFDS0VORFxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBNYXRyaXggb3BzXHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkdlbW1cIiwgKGluZm8pID0+IG5ldyBTcEdlbW1Ob2RlKGluZm8pLCBQUklPUklUWV9OQVRJVkUsIEJBQ0tFTkQpO1xyXG5cclxuICAgIC8vIFJlY3VycmVudFxyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJMU1RNXCIsIChpbmZvKSA9PiBuZXcgU3BMc3RtTm9kZShpbmZvKSwgUFJJT1JJVFlfTkFUSVZFLCBCQUNLRU5EKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiR1JVXCIsIChpbmZvKSA9PiBuZXcgU3BHcnVOb2RlKGluZm8pLCBQUklPUklUWV9OQVRJVkUsIEJBQ0tFTkQpO1xyXG5cclxuICAgIC8vIENvbnZcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiQ29udlwiLCAoaW5mbykgPT4gbmV3IFNwQ29udk5vZGUoaW5mbyksIFBSSU9SSVRZX05BVElWRSwgQkFDS0VORCk7XHJcbn1cclxuIiwiZXhwb3J0ICogZnJvbSBcIi4vc3RyZWFtXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9yZWFkZXJcIjtcbmV4cG9ydCAqIGZyb20gXCIuL3dyaXRlclwiO1xuIiwiLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcbi8vIFByb3RvYnVmIHdpcmUgZm9ybWF0IHJlYWRlclxyXG4vL1xyXG4vLyBQb3J0ZWQgZnJvbSBDeWFuTXljZWxpdW0vQmx1ZVN0ZWVsTGFkeUJ1ZyBDKysgaW1wbGVtZW50YXRpb24gKGxiX3BhcnNlcikuXHJcbi8vIFJlYWRzIHByb3RvYnVmLWVuY29kZWQgYmluYXJ5IGRhdGEgd2l0aG91dCByZXF1aXJpbmcgZ2VuZXJhdGVkIGNvZGUgb3JcclxuLy8gZXh0ZXJuYWwgZGVwZW5kZW5jaWVzLlxyXG4vL1xyXG4vLyBTdXBwb3J0czpcclxuLy8gICAtIFZhcmludCwgZml4ZWQzMiwgZml4ZWQ2NCB3aXJlIHR5cGVzXHJcbi8vICAgLSBMZW5ndGgtZGVsaW1pdGVkIGZpZWxkcyAoc3RyaW5ncywgYnl0ZXMsIHN1Yi1tZXNzYWdlcylcclxuLy8gICAtIFBhY2tlZCByZXBlYXRlZCBmaWVsZHNcclxuLy8gICAtIFNhdmUvcmVzdG9yZSBzbmFwc2hvdHMgZm9yIHR3by1wYXNzIHBhcnNpbmdcclxuLy8gICAtIFN1Yi1tZXNzYWdlIHJlYWRlcnMgd2l0aCBib3VuZGVkIHNjb3BlXHJcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxyXG5cclxuaW1wb3J0IHsgSUlucHV0U3RyZWFtLCBMQl9FT0YsIFNlZWtPcmlnaW4sIFN0cmVhbVZpZXcgfSBmcm9tIFwiLi9zdHJlYW1cIjtcclxuXHJcbmNvbnN0IE1BWF9SRUFERVJfU05BUFNIT1RfREVQVEggPSA4O1xyXG5cclxuLy8g4pSA4pSA4pSAIFdpcmUgdHlwZXMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG5leHBvcnQgZW51bSBXaXJlVHlwZSB7XHJcbiAgICBWQVJJTlQgPSAwLFxyXG4gICAgRklYRUQ2NCA9IDEsXHJcbiAgICBMRU4gPSAyLFxyXG4gICAgRklYRUQzMiA9IDUsXHJcbn1cclxuXHJcbi8vIOKUgOKUgOKUgCBJbnRlcm5hbCBzdGF0ZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbmludGVyZmFjZSBSZWFkZXJTdGF0dXMge1xyXG4gICAgZmllbGROdW1iZXI6IG51bWJlcjtcclxuICAgIHdpcmVUeXBlOiBXaXJlVHlwZTtcclxuICAgIGRlcHRoOiBudW1iZXI7XHJcbiAgICBsZW5ndGg6IG51bWJlcjtcclxuICAgIGxlbmd0aFJlYWQ6IGJvb2xlYW47XHJcbn1cclxuXHJcbmludGVyZmFjZSBSZWFkZXJTbmFwc2hvdCB7XHJcbiAgICBwb3NpdGlvbjogbnVtYmVyO1xyXG4gICAgc3RhdHVzOiBSZWFkZXJTdGF0dXM7XHJcbn1cclxuXHJcbi8vIOKUgOKUgOKUgCBTY3JhdGNoIGJ1ZmZlcnMgKHJldXNlZCBhY3Jvc3MgcmVhZHMgdG8gYXZvaWQgYWxsb2NhdGlvbnMpIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuY29uc3QgX3NjcmF0Y2g0ID0gbmV3IFVpbnQ4QXJyYXkoNCk7XHJcbmNvbnN0IF9zY3JhdGNoOCA9IG5ldyBVaW50OEFycmF5KDgpO1xyXG5jb25zdCBfdmlldzQgPSBuZXcgRGF0YVZpZXcoX3NjcmF0Y2g0LmJ1ZmZlcik7XHJcbmNvbnN0IF92aWV3OCA9IG5ldyBEYXRhVmlldyhfc2NyYXRjaDguYnVmZmVyKTtcclxuXHJcbi8vIOKUgOKUgOKUgCBQQlJlYWRlciDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbi8qKlxyXG4gKiBQdWxsLXN0eWxlIHByb3RvYnVmIHJlYWRlci4gUmVhZHMgdGFncywgdGhlbiB2YWx1ZXMgb24gZGVtYW5kLlxyXG4gKlxyXG4gKiBFcXVpdmFsZW50IHRvIEJsdWVTdGVlbExhZHlCdWc6OlBCUmVhZGVyLlxyXG4gKlxyXG4gKiBVc2FnZTpcclxuICogYGBgdHlwZXNjcmlwdFxyXG4gKiBjb25zdCByZWFkZXIgPSBuZXcgUEJSZWFkZXIobmV3IE1lbW9yeVN0cmVhbShieXRlcykpO1xyXG4gKiB3aGlsZSAocmVhZGVyLnJlYWRUYWcoKSkge1xyXG4gKiAgICAgc3dpdGNoIChyZWFkZXIuZmllbGROdW1iZXIpIHtcclxuICogICAgICAgICBjYXNlIDE6IHZhbHVlID0gcmVhZGVyLnJlYWRJbnQzMigpOyBicmVhaztcclxuICogICAgICAgICBjYXNlIDI6IG5hbWUgPSByZWFkZXIucmVhZFN0cmluZygyNTYpOyBicmVhaztcclxuICogICAgICAgICBkZWZhdWx0OiByZWFkZXIuc2tpcCgpOyBicmVhaztcclxuICogICAgIH1cclxuICogfVxyXG4gKiBgYGBcclxuICovXHJcbmV4cG9ydCBjbGFzcyBQQlJlYWRlciB7XHJcbiAgICBwcm90ZWN0ZWQgX2lucHV0OiBJSW5wdXRTdHJlYW07XHJcbiAgICBwcm90ZWN0ZWQgX3N0YXR1czogUmVhZGVyU3RhdHVzO1xyXG4gICAgcHJvdGVjdGVkIF9zbmFwc2hvdHM6IFJlYWRlclNuYXBzaG90W107XHJcbiAgICBwcm90ZWN0ZWQgX2FjdGl2ZVNuYXBzaG90OiBudW1iZXI7XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKGlucHV0OiBJSW5wdXRTdHJlYW0pIHtcclxuICAgICAgICB0aGlzLl9pbnB1dCA9IGlucHV0O1xyXG4gICAgICAgIHRoaXMuX3N0YXR1cyA9IHtcclxuICAgICAgICAgICAgZmllbGROdW1iZXI6IDAsXHJcbiAgICAgICAgICAgIHdpcmVUeXBlOiBXaXJlVHlwZS5WQVJJTlQsXHJcbiAgICAgICAgICAgIGRlcHRoOiAwLFxyXG4gICAgICAgICAgICBsZW5ndGg6IDAsXHJcbiAgICAgICAgICAgIGxlbmd0aFJlYWQ6IGZhbHNlLFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5fc25hcHNob3RzID0gbmV3IEFycmF5KE1BWF9SRUFERVJfU05BUFNIT1RfREVQVEgpO1xyXG4gICAgICAgIHRoaXMuX2FjdGl2ZVNuYXBzaG90ID0gLTE7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFRhZyByZWFkaW5nIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVhZCB0aGUgbmV4dCBwcm90b2J1ZiB0YWcgZnJvbSB0aGUgaW5wdXQuXHJcbiAgICAgKiBBZnRlciB0aGlzIGNhbGwsIGBmaWVsZE51bWJlcmAgYW5kIGB3aXJlVHlwZWAgYXJlIHNldC5cclxuICAgICAqIEByZXR1cm5zIHRydWUgaWYgYSB0YWcgd2FzIHJlYWQ7IGZhbHNlIGF0IGVuZCBvZiBzdHJlYW0uXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyByZWFkVGFnKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGNvbnN0IHRhZyA9IHRoaXMuX3JlYWRWYXJpbnQoKTtcclxuICAgICAgICBpZiAodGFnID09PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5fc3RhdHVzLmZpZWxkTnVtYmVyID0gTnVtYmVyKHRhZykgPj4+IDM7XHJcbiAgICAgICAgdGhpcy5fc3RhdHVzLndpcmVUeXBlID0gKE51bWJlcih0YWcpICYgMHgwNykgYXMgV2lyZVR5cGU7XHJcbiAgICAgICAgdGhpcy5fc3RhdHVzLmxlbmd0aFJlYWQgPSBmYWxzZTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgQWNjZXNzb3JzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHB1YmxpYyBnZXQgZmllbGROdW1iZXIoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdHVzLmZpZWxkTnVtYmVyO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgd2lyZVR5cGUoKTogV2lyZVR5cGUge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0dXMud2lyZVR5cGU7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBkZXB0aCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0dXMuZGVwdGg7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBwb3NpdGlvbigpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9pbnB1dC5nZXRQb3NpdGlvbigpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgc2l6ZSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9pbnB1dC5nZXRTaXplKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCByZW1haW5pbmdCeXRlcygpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9pbnB1dC5nZXRSZW1haW5pbmdCeXRlcygpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgaW5wdXQoKTogSUlucHV0U3RyZWFtIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5faW5wdXQ7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFZhbHVlIHJlYWRlcnMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgLyoqIFJlYWQgYSBsZW5ndGggcHJlZml4IChmb3IgTEVOIHdpcmUgdHlwZSkuIENhY2hlcyB0aGUgbGVuZ3RoLiAqL1xyXG4gICAgcHVibGljIHJlYWRMZW5ndGgodmFsaWRhdGU6IGJvb2xlYW4gPSB0cnVlKTogbnVtYmVyIHwgbnVsbCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3N0YXR1cy53aXJlVHlwZSAhPT0gV2lyZVR5cGUuTEVOKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX3N0YXR1cy5sZW5ndGhSZWFkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdGF0dXMubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdiA9IHRoaXMuX3JlYWRWYXJpbnQoKTtcclxuICAgICAgICBpZiAodiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMuX3N0YXR1cy5sZW5ndGggPSBOdW1iZXIodik7XHJcbiAgICAgICAgdGhpcy5fc3RhdHVzLmxlbmd0aFJlYWQgPSB2YWxpZGF0ZTtcclxuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdHVzLmxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICAvKiogUmVhZCBhbiBpbnQzMiAodmFyaW50IG9yIGZpeGVkMzIgZGVwZW5kaW5nIG9uIHdpcmUgdHlwZSkuICovXHJcbiAgICBwdWJsaWMgcmVhZEludDMyKCk6IG51bWJlciB8IG51bGwge1xyXG4gICAgICAgIGlmICh0aGlzLl9zdGF0dXMud2lyZVR5cGUgPT09IFdpcmVUeXBlLlZBUklOVCkge1xyXG4gICAgICAgICAgICBjb25zdCB2ID0gdGhpcy5fcmVhZFZhcmludCgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdiAhPT0gbnVsbCA/IE51bWJlcih2KSB8IDAgOiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5fcmVhZEZpeGVkMzJBc0ludCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKiBSZWFkIGFuIGludDY0IGFzIGEgbnVtYmVyICh2YXJpbnQgb3IgZml4ZWQ2NCkuICovXHJcbiAgICBwdWJsaWMgcmVhZEludDY0KCk6IG51bWJlciB8IG51bGwge1xyXG4gICAgICAgIGlmICh0aGlzLl9zdGF0dXMud2lyZVR5cGUgPT09IFdpcmVUeXBlLlZBUklOVCkge1xyXG4gICAgICAgICAgICBjb25zdCB2ID0gdGhpcy5fcmVhZFZhcmludCgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdiAhPT0gbnVsbCA/IE51bWJlcih2KSA6IG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLl9yZWFkRml4ZWQ2NEFzTnVtYmVyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIFJlYWQgYSBmbG9hdDMyIChmaXhlZDMyIHdpcmUgdHlwZSkuICovXHJcbiAgICBwdWJsaWMgcmVhZEZsb2F0KCk6IG51bWJlciB8IG51bGwge1xyXG4gICAgICAgIGlmICh0aGlzLl9pbnB1dC5yZWFkKF9zY3JhdGNoNCwgMCwgNCkgIT09IDQpIHJldHVybiBudWxsO1xyXG4gICAgICAgIHJldHVybiBfdmlldzQuZ2V0RmxvYXQzMigwLCB0cnVlKTsgLy8gbGl0dGxlLWVuZGlhblxyXG4gICAgfVxyXG5cclxuICAgIC8qKiBSZWFkIGEgZmxvYXQ2NCAoZml4ZWQ2NCB3aXJlIHR5cGUpLiAqL1xyXG4gICAgcHVibGljIHJlYWREb3VibGUoKTogbnVtYmVyIHwgbnVsbCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2lucHV0LnJlYWQoX3NjcmF0Y2g4LCAwLCA4KSAhPT0gOCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgcmV0dXJuIF92aWV3OC5nZXRGbG9hdDY0KDAsIHRydWUpOyAvLyBsaXR0bGUtZW5kaWFuXHJcbiAgICB9XHJcblxyXG4gICAgLyoqIFJlYWQgYSBib29sZWFuICh2YXJpbnQgd2lyZSB0eXBlKS4gKi9cclxuICAgIHB1YmxpYyByZWFkQm9vbCgpOiBib29sZWFuIHwgbnVsbCB7XHJcbiAgICAgICAgY29uc3QgdiA9IHRoaXMuX3JlYWRWYXJpbnQoKTtcclxuICAgICAgICBpZiAodiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgcmV0dXJuIHYgIT09IDA7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWFkIGEgbGVuZ3RoLWRlbGltaXRlZCBzdHJpbmcgd2l0aCBhIG1heCBzaXplIGJvdW5kLlxyXG4gICAgICogRXF1aXZhbGVudCB0byByZWFkVmFsdWVfcyhjaGFyKiwgaW50KSBpbiBDKysuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyByZWFkU3RyaW5nKG1heExlbmd0aDogbnVtYmVyID0gMjU2KTogc3RyaW5nIHwgbnVsbCB7XHJcbiAgICAgICAgY29uc3QgbGVuID0gdGhpcy5yZWFkTGVuZ3RoKCk7XHJcbiAgICAgICAgaWYgKGxlbiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZUxlbmd0aFJlYWQoKTtcclxuXHJcbiAgICAgICAgY29uc3QgcmVhZExlbiA9IE1hdGgubWluKGxlbiwgbWF4TGVuZ3RoKTtcclxuICAgICAgICBjb25zdCBidWYgPSBuZXcgVWludDhBcnJheShyZWFkTGVuKTtcclxuICAgICAgICBpZiAodGhpcy5faW5wdXQucmVhZChidWYsIDAsIHJlYWRMZW4pICE9PSByZWFkTGVuKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgLy8gU2tpcCBleGNlc3MgYnl0ZXMgaWYgc3RyaW5nIHdhcyB0cnVuY2F0ZWRcclxuICAgICAgICBpZiAocmVhZExlbiA8IGxlbikge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2lucHV0LnNlZWsobGVuIC0gcmVhZExlbiwgU2Vla09yaWdpbi5DVVJSRU5UKSkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKGJ1Zik7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWFkIGxlbmd0aC1kZWxpbWl0ZWQgcmF3IGJ5dGVzLlxyXG4gICAgICogQHBhcmFtIG1heFNpemUgIE1heGltdW0gYnl0ZXMgdG8gcmVhZCAoZXhjZXNzIGlzIHNraXBwZWQpLlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgcmVhZEJ5dGVzKG1heFNpemU/OiBudW1iZXIpOiBVaW50OEFycmF5IHwgbnVsbCB7XHJcbiAgICAgICAgY29uc3QgbGVuID0gdGhpcy5yZWFkTGVuZ3RoKCk7XHJcbiAgICAgICAgaWYgKGxlbiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZUxlbmd0aFJlYWQoKTtcclxuXHJcbiAgICAgICAgY29uc3QgcmVhZExlbiA9IG1heFNpemUgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKGxlbiwgbWF4U2l6ZSkgOiBsZW47XHJcbiAgICAgICAgY29uc3QgYnVmID0gbmV3IFVpbnQ4QXJyYXkocmVhZExlbik7XHJcbiAgICAgICAgaWYgKHRoaXMuX2lucHV0LnJlYWQoYnVmLCAwLCByZWFkTGVuKSAhPT0gcmVhZExlbikgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIGlmIChyZWFkTGVuIDwgbGVuKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5faW5wdXQuc2VlayhsZW4gLSByZWFkTGVuLCBTZWVrT3JpZ2luLkNVUlJFTlQpKSByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBidWY7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFBhY2tlZCByZXBlYXRlZCBmaWVsZHMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWFkIHBhY2tlZCB2YXJpbnQgaW50MzIgdmFsdWVzIGludG8gYSBwcmUtYWxsb2NhdGVkIGFycmF5LlxyXG4gICAgICogQHBhcmFtIHRhcmdldCAgVGFyZ2V0IGFycmF5LlxyXG4gICAgICogQHBhcmFtIG1heENvdW50ICBNYXhpbXVtIG51bWJlciBvZiBlbGVtZW50cyB0byByZWFkLlxyXG4gICAgICogQHJldHVybnMgVGhlIG51bWJlciBvZiBlbGVtZW50cyBhY3R1YWxseSByZWFkLCBvciBudWxsIG9uIGVycm9yLlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgcmVhZFBhY2tlZEludDMyKHRhcmdldDogSW50MzJBcnJheSwgbWF4Q291bnQ6IG51bWJlcik6IG51bWJlciB8IG51bGwge1xyXG4gICAgICAgIGlmICh0aGlzLl9zdGF0dXMud2lyZVR5cGUgIT09IFdpcmVUeXBlLkxFTikgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgY29uc3QgbGVuID0gdGhpcy5yZWFkTGVuZ3RoKCk7XHJcbiAgICAgICAgaWYgKGxlbiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZUxlbmd0aFJlYWQoKTtcclxuXHJcbiAgICAgICAgY29uc3QgZW5kID0gdGhpcy5wb3NpdGlvbiArIGxlbjtcclxuICAgICAgICBsZXQgaSA9IDA7XHJcbiAgICAgICAgd2hpbGUgKHRoaXMucG9zaXRpb24gPCBlbmQpIHtcclxuICAgICAgICAgICAgY29uc3QgdiA9IHRoaXMuX3JlYWRWYXJpbnQoKTtcclxuICAgICAgICAgICAgaWYgKHYgPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICBpZiAoaSA8IG1heENvdW50KSB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXRbaSsrXSA9IE51bWJlcih2KSB8IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWFkIHBhY2tlZCBmbG9hdDMyIHZhbHVlcyBpbnRvIGEgcHJlLWFsbG9jYXRlZCBhcnJheS5cclxuICAgICAqIEBwYXJhbSB0YXJnZXQgIFRhcmdldCBhcnJheS5cclxuICAgICAqIEBwYXJhbSBtYXhDb3VudCAgTWF4aW11bSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmVhZC5cclxuICAgICAqIEByZXR1cm5zIFRoZSBudW1iZXIgb2YgZWxlbWVudHMgYWN0dWFsbHkgcmVhZCwgb3IgbnVsbCBvbiBlcnJvci5cclxuICAgICAqL1xyXG4gICAgcHVibGljIHJlYWRQYWNrZWRGbG9hdDMyKHRhcmdldDogRmxvYXQzMkFycmF5LCBtYXhDb3VudDogbnVtYmVyKTogbnVtYmVyIHwgbnVsbCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3N0YXR1cy53aXJlVHlwZSAhPT0gV2lyZVR5cGUuTEVOKSByZXR1cm4gbnVsbDtcclxuICAgICAgICBjb25zdCBsZW4gPSB0aGlzLnJlYWRMZW5ndGgoKTtcclxuICAgICAgICBpZiAobGVuID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlTGVuZ3RoUmVhZCgpO1xyXG5cclxuICAgICAgICBjb25zdCBlbmQgPSB0aGlzLnBvc2l0aW9uICsgbGVuO1xyXG4gICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICB3aGlsZSAodGhpcy5wb3NpdGlvbiA8IGVuZCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5faW5wdXQucmVhZChfc2NyYXRjaDQsIDAsIDQpICE9PSA0KSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgaWYgKGkgPCBtYXhDb3VudCkge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0W2krK10gPSBfdmlldzQuZ2V0RmxvYXQzMigwLCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlYWQgcGFja2VkIGZsb2F0NjQgdmFsdWVzIGludG8gYSBwcmUtYWxsb2NhdGVkIGFycmF5LlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgcmVhZFBhY2tlZEZsb2F0NjQodGFyZ2V0OiBGbG9hdDY0QXJyYXksIG1heENvdW50OiBudW1iZXIpOiBudW1iZXIgfCBudWxsIHtcclxuICAgICAgICBpZiAodGhpcy5fc3RhdHVzLndpcmVUeXBlICE9PSBXaXJlVHlwZS5MRU4pIHJldHVybiBudWxsO1xyXG4gICAgICAgIGNvbnN0IGxlbiA9IHRoaXMucmVhZExlbmd0aCgpO1xyXG4gICAgICAgIGlmIChsZW4gPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVMZW5ndGhSZWFkKCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGVuZCA9IHRoaXMucG9zaXRpb24gKyBsZW47XHJcbiAgICAgICAgbGV0IGkgPSAwO1xyXG4gICAgICAgIHdoaWxlICh0aGlzLnBvc2l0aW9uIDwgZW5kKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9pbnB1dC5yZWFkKF9zY3JhdGNoOCwgMCwgOCkgIT09IDgpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICBpZiAoaSA8IG1heENvdW50KSB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXRbaSsrXSA9IF92aWV3OC5nZXRGbG9hdDY0KDAsIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBTdWItbWVzc2FnZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZSBhIHN1Yi1yZWFkZXIgc2NvcGVkIHRvIHRoZSBjdXJyZW50IGxlbmd0aC1kZWxpbWl0ZWQgZmllbGQuXHJcbiAgICAgKiBUaGUgc3ViLXJlYWRlcidzIHN0cmVhbSBpcyBib3VuZGVkIHRvIHRoZSBtZXNzYWdlIGJ5dGVzLlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgZ2V0U3ViTWVzc2FnZVJlYWRlcigpOiBQQlN1YlJlYWRlciB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IGxlbiA9IHRoaXMucmVhZExlbmd0aCgpO1xyXG4gICAgICAgIGlmIChsZW4gPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVMZW5ndGhSZWFkKCk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQQlN1YlJlYWRlcih0aGlzLCB0aGlzLl9zdGF0dXMuZGVwdGggKyAxLCB0aGlzLnBvc2l0aW9uLCBsZW4pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBTa2lwIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIC8qKiBTa2lwIHRoZSBjdXJyZW50IGZpZWxkIHZhbHVlLiAqL1xyXG4gICAgcHVibGljIHNraXAoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgc3dpdGNoICh0aGlzLl9zdGF0dXMud2lyZVR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBXaXJlVHlwZS5WQVJJTlQ6IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWFkVmFyaW50KCkgIT09IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBXaXJlVHlwZS5GSVhFRDMyOiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5faW5wdXQuc2Vlayg0LCBTZWVrT3JpZ2luLkNVUlJFTlQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgV2lyZVR5cGUuRklYRUQ2NDoge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lucHV0LnNlZWsoOCwgU2Vla09yaWdpbi5DVVJSRU5UKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlIFdpcmVUeXBlLkxFTjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGVuID0gdGhpcy5yZWFkTGVuZ3RoKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAobGVuID09PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9pbnZhbGlkYXRlTGVuZ3RoUmVhZCgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lucHV0LnNlZWsobGVuLCBTZWVrT3JpZ2luLkNVUlJFTlQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBTYXZlIC8gcmVzdG9yZSAoc25hcHNob3Qgc3RhY2spIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIC8qKiBTYXZlIHRoZSBjdXJyZW50IHBhcnNlciBzdGF0ZS4gU3RyZWFtIG11c3Qgc3VwcG9ydCBzZWVraW5nLiAqL1xyXG4gICAgcHVibGljIHNhdmUoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2lucHV0LmNhblNlZWsoKSAmJiB0aGlzLl9hY3RpdmVTbmFwc2hvdCA8IE1BWF9SRUFERVJfU05BUFNIT1RfREVQVEggLSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2FjdGl2ZVNuYXBzaG90Kys7XHJcbiAgICAgICAgICAgIHRoaXMuX3NuYXBzaG90c1t0aGlzLl9hY3RpdmVTbmFwc2hvdF0gPSB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHN0YXR1czogeyAuLi50aGlzLl9zdGF0dXMgfSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIFJlc3RvcmUgdGhlIGxhc3Qgc2F2ZWQgc3RhdGUuICovXHJcbiAgICBwdWJsaWMgcmVzdG9yZSgpOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5faW5wdXQuY2FuU2VlaygpICYmIHRoaXMuX2FjdGl2ZVNuYXBzaG90ID49IDApIHtcclxuICAgICAgICAgICAgY29uc3Qgc25hcCA9IHRoaXMuX3NuYXBzaG90c1t0aGlzLl9hY3RpdmVTbmFwc2hvdF07XHJcbiAgICAgICAgICAgIHRoaXMuX3N0YXR1cyA9IHsgLi4uc25hcC5zdGF0dXMgfTtcclxuICAgICAgICAgICAgdGhpcy5faW5wdXQuc2VlayhzbmFwLnBvc2l0aW9uLCBTZWVrT3JpZ2luLkJFR0lOKTtcclxuICAgICAgICAgICAgdGhpcy5fYWN0aXZlU25hcHNob3QtLTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIERpc2NhcmQgdGhlIGxhc3Qgc2F2ZSB3aXRob3V0IHJlc3RvcmluZy4gKi9cclxuICAgIHB1YmxpYyB1bnNhdmUoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZVNuYXBzaG90ID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5fYWN0aXZlU25hcHNob3QtLTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFByaXZhdGUgcHJpbWl0aXZlcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlYWQgYSB2YXJpbnQgKHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyKSBmcm9tIHRoZSBzdHJlYW0uXHJcbiAgICAgKiBSZXR1cm5zIG51bGwgb24gRU9GLiBVc2VzIE51bWJlciAoc2FmZSB1cCB0byAyXjUzKS5cclxuICAgICAqL1xyXG4gICAgcHJvdGVjdGVkIF9yZWFkVmFyaW50KCk6IG51bWJlciB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IGJ5dGUwID0gdGhpcy5faW5wdXQucmVhZEJ5dGUoKTtcclxuICAgICAgICBpZiAoYnl0ZTAgPT09IExCX0VPRikgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIC8vIEZhc3QgcGF0aDogc2luZ2xlIGJ5dGUgKG1vc3QgY29tbW9uIGZvciBmaWVsZCB0YWdzIGFuZCBzbWFsbCB2YWx1ZXMpXHJcbiAgICAgICAgaWYgKChieXRlMCAmIDB4ODApID09PSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBieXRlMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIE11bHRpLWJ5dGUgdmFyaW50XHJcbiAgICAgICAgbGV0IGxvID0gYnl0ZTAgJiAweDdmO1xyXG4gICAgICAgIGxldCBzaGlmdCA9IDc7XHJcbiAgICAgICAgbGV0IGJ5dGU6IG51bWJlcjtcclxuICAgICAgICBsZXQgYnl0ZUNvdW50ID0gMTtcclxuICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgIGJ5dGUgPSB0aGlzLl9pbnB1dC5yZWFkQnl0ZSgpO1xyXG4gICAgICAgICAgICBpZiAoYnl0ZSA9PT0gTEJfRU9GKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgYnl0ZUNvdW50Kys7XHJcbiAgICAgICAgICAgIGlmIChzaGlmdCA8IDMyKSB7XHJcbiAgICAgICAgICAgICAgICBsbyB8PSAoYnl0ZSAmIDB4N2YpIDw8IHNoaWZ0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNoaWZ0ICs9IDc7XHJcbiAgICAgICAgfSB3aGlsZSAoYnl0ZSAmIDB4ODApO1xyXG5cclxuICAgICAgICAvLyBGb3IgbmVnYXRpdmUgaW50NjQsIHByb3RvYnVmIHVzZXMgMTAtYnl0ZSB2YXJpbnRzIHdpdGggaGlnaCBiaXRzIHNldC5cclxuICAgICAgICAvLyBEZXRlY3QgdGhpcyBhbmQgcmV0dXJuIGFzIHNpZ25lZCAzMi1iaXQgKHN1ZmZpY2llbnQgZm9yIE9OTlggYXR0cmlidXRlIHZhbHVlcykuXHJcbiAgICAgICAgaWYgKGJ5dGVDb3VudCA+PSAxMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbG8gfCAwOyAvLyBpbnRlcnByZXQgYXMgc2lnbmVkIDMyLWJpdFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGxvID4+PiAwOyAvLyBmb3JjZSB1bnNpZ25lZCAzMi1iaXQgZm9yIHBvc2l0aXZlIHZhbHVlc1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBfcmVhZEZpeGVkMzJBc0ludCgpOiBudW1iZXIgfCBudWxsIHtcclxuICAgICAgICBpZiAodGhpcy5faW5wdXQucmVhZChfc2NyYXRjaDQsIDAsIDQpICE9PSA0KSByZXR1cm4gbnVsbDtcclxuICAgICAgICByZXR1cm4gX3ZpZXc0LmdldEludDMyKDAsIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBfcmVhZEZpeGVkNjRBc051bWJlcigpOiBudW1iZXIgfCBudWxsIHtcclxuICAgICAgICBpZiAodGhpcy5faW5wdXQucmVhZChfc2NyYXRjaDgsIDAsIDgpICE9PSA4KSByZXR1cm4gbnVsbDtcclxuICAgICAgICAvLyBSZWFkIGFzIHR3byAzMi1iaXQgdmFsdWVzIHRvIGF2b2lkIEJpZ0ludCBkZXBlbmRlbmN5XHJcbiAgICAgICAgY29uc3QgbG8gPSBfdmlldzguZ2V0VWludDMyKDAsIHRydWUpO1xyXG4gICAgICAgIGNvbnN0IGhpID0gX3ZpZXc4LmdldFVpbnQzMig0LCB0cnVlKTtcclxuICAgICAgICByZXR1cm4gaGkgKiAweDEwMDAwMDAwMCArIGxvO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBfaW52YWxpZGF0ZUxlbmd0aFJlYWQoKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5fc3RhdHVzLmxlbmd0aFJlYWQgPSBmYWxzZTtcclxuICAgIH1cclxufVxyXG5cclxuLy8g4pSA4pSA4pSAIFBCU3ViUmVhZGVyIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuLyoqXHJcbiAqIEEgUEJSZWFkZXIgc2NvcGVkIHRvIGEgc3ViLW1lc3NhZ2UgdmlhIGEgU3RyZWFtVmlldy5cclxuICpcclxuICogRXF1aXZhbGVudCB0byBCbHVlU3RlZWxMYWR5QnVnOjpQQlN1YlJlYWRlci5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBQQlN1YlJlYWRlciBleHRlbmRzIFBCUmVhZGVyIHtcclxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihwYXJlbnQ6IFBCUmVhZGVyLCBkZXB0aDogbnVtYmVyLCBmcm9tOiBudW1iZXIsIGxlbmd0aDogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIobmV3IFN0cmVhbVZpZXcocGFyZW50LmlucHV0LCBmcm9tLCBsZW5ndGgpKTtcclxuICAgICAgICB0aGlzLl9zdGF0dXMuZGVwdGggPSBkZXB0aDtcclxuICAgIH1cclxufVxyXG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIFByb3RvYnVmIHN0cmVhbSBhYnN0cmFjdGlvblxuLy9cbi8vIFBvcnRlZCBmcm9tIEN5YW5NeWNlbGl1bS9CbHVlU3RlZWxMYWR5QnVnIEMrKyBpbXBsZW1lbnRhdGlvbi5cbi8vIFByb3ZpZGVzIElJbnB1dFN0cmVhbSwgTWVtb3J5U3RyZWFtIGFuZCBTdHJlYW1WaWV3IGZvciBiaW5hcnkgcGFyc2luZy5cbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5leHBvcnQgY29uc3QgTEJfRU9GID0gLTE7XG5cbmV4cG9ydCBlbnVtIFNlZWtPcmlnaW4ge1xuICAgIEJFR0lOID0gMCxcbiAgICBDVVJSRU5UID0gMSxcbiAgICBFTkQgPSAyLFxufVxuXG4vKipcbiAqIEFic3RyYWN0IGlucHV0IHN0cmVhbSBpbnRlcmZhY2UgZm9yIHNlcXVlbnRpYWwgYmluYXJ5IHJlYWRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIElJbnB1dFN0cmVhbSB7XG4gICAgLyoqIFJlYWQgYGNvdW50YCBieXRlcyBpbnRvIHRhcmdldC4gUmV0dXJucyBieXRlcyByZWFkLCBvciBMQl9FT0YuICovXG4gICAgcmVhZCh0YXJnZXQ6IFVpbnQ4QXJyYXksIG9mZnNldDogbnVtYmVyLCBjb3VudDogbnVtYmVyKTogbnVtYmVyO1xuXG4gICAgLyoqIFJlYWQgYSBzaW5nbGUgYnl0ZS4gUmV0dXJucyB0aGUgYnl0ZSB2YWx1ZSwgb3IgTEJfRU9GLiAqL1xuICAgIHJlYWRCeXRlKCk6IG51bWJlcjtcblxuICAgIGNhblNlZWsoKTogYm9vbGVhbjtcbiAgICBzZWVrKHZhbHVlOiBudW1iZXIsIG9yaWdpbj86IFNlZWtPcmlnaW4pOiBib29sZWFuO1xuICAgIGdldFNpemUoKTogbnVtYmVyO1xuICAgIGdldFBvc2l0aW9uKCk6IG51bWJlcjtcbiAgICBnZXRSZW1haW5pbmdCeXRlcygpOiBudW1iZXI7XG59XG5cbi8vIOKUgOKUgOKUgCBNZW1vcnlTdHJlYW0g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbi8qKlxuICogUmVhZHMgZnJvbSBhbiBpbi1tZW1vcnkgYnl0ZSBidWZmZXIuXG4gKlxuICogRXF1aXZhbGVudCB0byBCbHVlU3RlZWxMYWR5QnVnOjpNZW1vcnlTdHJlYW0uXG4gKi9cbmV4cG9ydCBjbGFzcyBNZW1vcnlTdHJlYW0gaW1wbGVtZW50cyBJSW5wdXRTdHJlYW0ge1xuICAgIHByaXZhdGUgX2J1ZmZlcjogVWludDhBcnJheTtcbiAgICBwcml2YXRlIF9zaXplOiBudW1iZXI7XG4gICAgcHJpdmF0ZSBfcG9zOiBudW1iZXI7XG5cbiAgICBwdWJsaWMgY29uc3RydWN0b3IoYnVmZmVyOiBVaW50OEFycmF5KSB7XG4gICAgICAgIHRoaXMuX2J1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgdGhpcy5fc2l6ZSA9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICB0aGlzLl9wb3MgPSAwO1xuICAgIH1cblxuICAgIHB1YmxpYyByZWFkQnl0ZSgpOiBudW1iZXIge1xuICAgICAgICBpZiAodGhpcy5fcG9zIDwgdGhpcy5fc2l6ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2J1ZmZlclt0aGlzLl9wb3MrK107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIExCX0VPRjtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVhZCh0YXJnZXQ6IFVpbnQ4QXJyYXksIG9mZnNldDogbnVtYmVyLCBjb3VudDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgaWYgKHRoaXMuX3BvcyA+PSB0aGlzLl9zaXplKSB7XG4gICAgICAgICAgICByZXR1cm4gTEJfRU9GO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb3VudCA9PT0gMSkge1xuICAgICAgICAgICAgdGFyZ2V0W29mZnNldF0gPSB0aGlzLl9idWZmZXJbdGhpcy5fcG9zKytdO1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbGVuID0gTWF0aC5taW4oY291bnQsIHRoaXMuX3NpemUgLSB0aGlzLl9wb3MpO1xuICAgICAgICB0YXJnZXQuc2V0KHRoaXMuX2J1ZmZlci5zdWJhcnJheSh0aGlzLl9wb3MsIHRoaXMuX3BvcyArIGxlbiksIG9mZnNldCk7XG4gICAgICAgIHRoaXMuX3BvcyArPSBsZW47XG4gICAgICAgIHJldHVybiBsZW47XG4gICAgfVxuXG4gICAgcHVibGljIGNhblNlZWsoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHB1YmxpYyBzZWVrKHZhbHVlOiBudW1iZXIsIG9yaWdpbjogU2Vla09yaWdpbiA9IFNlZWtPcmlnaW4uQkVHSU4pOiBib29sZWFuIHtcbiAgICAgICAgbGV0IHRtcDogbnVtYmVyO1xuICAgICAgICBpZiAob3JpZ2luID09PSBTZWVrT3JpZ2luLkJFR0lOKSB7XG4gICAgICAgICAgICB0bXAgPSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChvcmlnaW4gPT09IFNlZWtPcmlnaW4uRU5EKSB7XG4gICAgICAgICAgICB0bXAgPSB0aGlzLl9zaXplIC0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0bXAgPSB0aGlzLl9wb3MgKyB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9wb3MgPSBNYXRoLm1pbihNYXRoLm1heCh0bXAsIDApLCB0aGlzLl9zaXplKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFNpemUoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NpemU7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFBvc2l0aW9uKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wb3M7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFJlbWFpbmluZ0J5dGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zaXplIC0gdGhpcy5fcG9zO1xuICAgIH1cbn1cblxuLy8g4pSA4pSA4pSAIFN0cmVhbVZpZXcg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbi8qKlxuICogQSBib3VuZGVkIHZpZXcgb3ZlciBhbiB1bmRlcmx5aW5nIHN0cmVhbSwgdXNlZCBmb3IgcmVhZGluZyBzdWItbWVzc2FnZXMuXG4gKlxuICogRXF1aXZhbGVudCB0byBCbHVlU3RlZWxMYWR5QnVnOjpTdHJlYW1WaWV3LlxuICovXG5leHBvcnQgY2xhc3MgU3RyZWFtVmlldyBpbXBsZW1lbnRzIElJbnB1dFN0cmVhbSB7XG4gICAgcHJpdmF0ZSBfZGVsZWdhdGU6IElJbnB1dFN0cmVhbTtcbiAgICBwcml2YXRlIF9vZmZzZXQ6IG51bWJlcjtcbiAgICBwcml2YXRlIF9zaXplOiBudW1iZXI7XG4gICAgcHJpdmF0ZSBfcG9zOiBudW1iZXI7XG5cbiAgICBwdWJsaWMgY29uc3RydWN0b3IoZGVsZWdhdGU6IElJbnB1dFN0cmVhbSwgb2Zmc2V0OiBudW1iZXIsIHNpemU6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9kZWxlZ2F0ZSA9IGRlbGVnYXRlO1xuICAgICAgICB0aGlzLl9vZmZzZXQgPSBvZmZzZXQ7XG4gICAgICAgIHRoaXMuX3NpemUgPSBzaXplO1xuICAgICAgICB0aGlzLl9wb3MgPSAwO1xuICAgIH1cblxuICAgIHB1YmxpYyByZWFkQnl0ZSgpOiBudW1iZXIge1xuICAgICAgICBpZiAodGhpcy5fcG9zID49IHRoaXMuX3NpemUpIHtcbiAgICAgICAgICAgIHJldHVybiBMQl9FT0Y7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYiA9IHRoaXMuX2RlbGVnYXRlLnJlYWRCeXRlKCk7XG4gICAgICAgIGlmIChiID09PSBMQl9FT0YpIHJldHVybiBMQl9FT0Y7XG4gICAgICAgIHRoaXMuX3BvcysrO1xuICAgICAgICByZXR1cm4gYjtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVhZCh0YXJnZXQ6IFVpbnQ4QXJyYXksIG9mZnNldDogbnVtYmVyLCBjb3VudDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgaWYgKHRoaXMuX3BvcyA+PSB0aGlzLl9zaXplKSB7XG4gICAgICAgICAgICByZXR1cm4gTEJfRU9GO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxlbiA9IE1hdGgubWluKGNvdW50LCB0aGlzLl9zaXplIC0gdGhpcy5fcG9zKTtcbiAgICAgICAgY29uc3QgciA9IHRoaXMuX2RlbGVnYXRlLnJlYWQodGFyZ2V0LCBvZmZzZXQsIGxlbik7XG4gICAgICAgIGlmIChyID4gMCkge1xuICAgICAgICAgICAgdGhpcy5fcG9zICs9IHI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHI7XG4gICAgfVxuXG4gICAgcHVibGljIGNhblNlZWsoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWxlZ2F0ZS5jYW5TZWVrKCk7XG4gICAgfVxuXG4gICAgcHVibGljIHNlZWsodmFsdWU6IG51bWJlciwgb3JpZ2luOiBTZWVrT3JpZ2luID0gU2Vla09yaWdpbi5CRUdJTik6IGJvb2xlYW4ge1xuICAgICAgICBsZXQgdG1wOiBudW1iZXI7XG4gICAgICAgIGlmIChvcmlnaW4gPT09IFNlZWtPcmlnaW4uQkVHSU4pIHtcbiAgICAgICAgICAgIHRtcCA9IHZhbHVlO1xuICAgICAgICB9IGVsc2UgaWYgKG9yaWdpbiA9PT0gU2Vla09yaWdpbi5FTkQpIHtcbiAgICAgICAgICAgIHRtcCA9IHRoaXMuX3NpemUgLSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRtcCA9IHRoaXMuX3BvcyArIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHRtcCA9IE1hdGgubWluKE1hdGgubWF4KHRtcCwgMCksIHRoaXMuX3NpemUpO1xuICAgICAgICBpZiAoIXRoaXMuX2RlbGVnYXRlLnNlZWsodG1wICsgdGhpcy5fb2Zmc2V0LCBTZWVrT3JpZ2luLkJFR0lOKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3BvcyA9IHRtcDtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFNpemUoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NpemU7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFBvc2l0aW9uKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wb3M7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFJlbWFpbmluZ0J5dGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zaXplIC0gdGhpcy5fcG9zO1xuICAgIH1cbn1cbiIsIi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gUHJvdG9idWYgd2lyZSBmb3JtYXQgd3JpdGVyXG4vL1xuLy8gU3ltbWV0cmljIGNvdW50ZXJwYXJ0IHRvIHJlYWRlci50cy5cbi8vIFdyaXRlcyBwcm90b2J1Zi1lbmNvZGVkIGJpbmFyeSBkYXRhIHdpdGhvdXQgcmVxdWlyaW5nIGdlbmVyYXRlZCBjb2RlIG9yXG4vLyBleHRlcm5hbCBkZXBlbmRlbmNpZXMuXG4vL1xuLy8gU3VwcG9ydHM6XG4vLyAgIC0gVmFyaW50LCBmaXhlZDMyLCBmaXhlZDY0IHdpcmUgdHlwZXNcbi8vICAgLSBMZW5ndGgtZGVsaW1pdGVkIGZpZWxkcyAoc3RyaW5ncywgYnl0ZXMsIHN1Yi1tZXNzYWdlcylcbi8vICAgLSBQYWNrZWQgcmVwZWF0ZWQgZmllbGRzXG4vLyAgIC0gU3ViLW1lc3NhZ2Ugd3JpdGVycyB3aXRoIGF1dG9tYXRpYyBsZW5ndGggcHJlZml4aW5nXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuaW1wb3J0IHsgV2lyZVR5cGUgfSBmcm9tIFwiLi9yZWFkZXJcIjtcblxuLy8g4pSA4pSA4pSAIERlZmF1bHQgYnVmZmVyIHNpemUg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbmNvbnN0IERFRkFVTFRfQ0FQQUNJVFkgPSAyNTY7XG5jb25zdCBHUk9XVEhfRkFDVE9SID0gMjtcblxuLy8g4pSA4pSA4pSAIFNjcmF0Y2ggYnVmZmVycyAocmV1c2VkIGFjcm9zcyB3cml0ZXMgdG8gYXZvaWQgYWxsb2NhdGlvbnMpIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG5jb25zdCBfc2NyYXRjaDQgPSBuZXcgVWludDhBcnJheSg0KTtcbmNvbnN0IF9zY3JhdGNoOCA9IG5ldyBVaW50OEFycmF5KDgpO1xuY29uc3QgX3ZpZXc0ID0gbmV3IERhdGFWaWV3KF9zY3JhdGNoNC5idWZmZXIpO1xuY29uc3QgX3ZpZXc4ID0gbmV3IERhdGFWaWV3KF9zY3JhdGNoOC5idWZmZXIpO1xuXG4vLyDilIDilIDilIAgUEJXcml0ZXIg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbi8qKlxuICogUHVzaC1zdHlsZSBwcm90b2J1ZiB3cml0ZXIuIFdyaXRlcyB0YWdzLCB0aGVuIHZhbHVlcyBzZXF1ZW50aWFsbHkuXG4gKlxuICogVXNhZ2U6XG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB3cml0ZXIgPSBuZXcgUEJXcml0ZXIoKTtcbiAqIHdyaXRlci53cml0ZVRhZygxLCBXaXJlVHlwZS5WQVJJTlQpO1xuICogd3JpdGVyLndyaXRlSW50MzIoNDIpO1xuICogd3JpdGVyLndyaXRlVGFnKDIsIFdpcmVUeXBlLkxFTik7XG4gKiB3cml0ZXIud3JpdGVTdHJpbmcoXCJoZWxsb1wiKTtcbiAqIGNvbnN0IGJ5dGVzID0gd3JpdGVyLmZpbmlzaCgpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBQQldyaXRlciB7XG4gICAgcHJvdGVjdGVkIF9idWZmZXI6IFVpbnQ4QXJyYXk7XG4gICAgcHJvdGVjdGVkIF9wb3M6IG51bWJlcjtcblxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihjYXBhY2l0eTogbnVtYmVyID0gREVGQVVMVF9DQVBBQ0lUWSkge1xuICAgICAgICB0aGlzLl9idWZmZXIgPSBuZXcgVWludDhBcnJheShjYXBhY2l0eSk7XG4gICAgICAgIHRoaXMuX3BvcyA9IDA7XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIFRhZyB3cml0aW5nIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gICAgLyoqXG4gICAgICogV3JpdGUgYSBwcm90b2J1ZiB0YWcgKGZpZWxkIG51bWJlciArIHdpcmUgdHlwZSkuXG4gICAgICovXG4gICAgcHVibGljIHdyaXRlVGFnKGZpZWxkTnVtYmVyOiBudW1iZXIsIHdpcmVUeXBlOiBXaXJlVHlwZSk6IHZvaWQge1xuICAgICAgICB0aGlzLl93cml0ZVZhcmludCgoKGZpZWxkTnVtYmVyIDw8IDMpIHwgd2lyZVR5cGUpID4+PiAwKTtcbiAgICB9XG5cbiAgICAvLyDilIDilIAgQWNjZXNzb3JzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gICAgLyoqIEN1cnJlbnQgbnVtYmVyIG9mIGJ5dGVzIHdyaXR0ZW4uICovXG4gICAgcHVibGljIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BvcztcbiAgICB9XG5cbiAgICAvLyDilIDilIAgVmFsdWUgd3JpdGVycyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIC8qKiBXcml0ZSBhIHZhcmludC1lbmNvZGVkIGludDMyLiAqL1xuICAgIHB1YmxpYyB3cml0ZUludDMyKHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd3JpdGVWYXJpbnQodmFsdWUgfCAwKTtcbiAgICB9XG5cbiAgICAvKiogV3JpdGUgYSB2YXJpbnQtZW5jb2RlZCB1aW50MzIuICovXG4gICAgcHVibGljIHdyaXRlVWludDMyKHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd3JpdGVWYXJpbnQodmFsdWUgPj4+IDApO1xuICAgIH1cblxuICAgIC8qKiBXcml0ZSBhIHZhcmludC1lbmNvZGVkIGludDY0IChmcm9tIGEgSlMgbnVtYmVyLCBzYWZlIHVwIHRvIDJeNTMpLiAqL1xuICAgIHB1YmxpYyB3cml0ZUludDY0KHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd3JpdGVWYXJpbnQ2NCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqIFdyaXRlIGEgZml4ZWQzMiAobGl0dGxlLWVuZGlhbiA0IGJ5dGVzKS4gKi9cbiAgICBwdWJsaWMgd3JpdGVGaXhlZDMyKHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlQ2FwYWNpdHkoNCk7XG4gICAgICAgIF92aWV3NC5zZXRJbnQzMigwLCB2YWx1ZSwgdHJ1ZSk7XG4gICAgICAgIHRoaXMuX2J1ZmZlci5zZXQoX3NjcmF0Y2g0LCB0aGlzLl9wb3MpO1xuICAgICAgICB0aGlzLl9wb3MgKz0gNDtcbiAgICB9XG5cbiAgICAvKiogV3JpdGUgYSBmaXhlZDY0IChsaXR0bGUtZW5kaWFuIDggYnl0ZXMsIGZyb20gYSBKUyBudW1iZXIpLiAqL1xuICAgIHB1YmxpYyB3cml0ZUZpeGVkNjQodmFsdWU6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9lbnN1cmVDYXBhY2l0eSg4KTtcbiAgICAgICAgY29uc3QgbG8gPSB2YWx1ZSA+Pj4gMDtcbiAgICAgICAgY29uc3QgaGkgPSAodmFsdWUgLyAweDEwMDAwMDAwMCkgPj4+IDA7XG4gICAgICAgIF92aWV3OC5zZXRVaW50MzIoMCwgbG8sIHRydWUpO1xuICAgICAgICBfdmlldzguc2V0VWludDMyKDQsIGhpLCB0cnVlKTtcbiAgICAgICAgdGhpcy5fYnVmZmVyLnNldChfc2NyYXRjaDgsIHRoaXMuX3Bvcyk7XG4gICAgICAgIHRoaXMuX3BvcyArPSA4O1xuICAgIH1cblxuICAgIC8qKiBXcml0ZSBhIGZsb2F0MzIgKGZpeGVkMzIgd2lyZSB0eXBlKS4gKi9cbiAgICBwdWJsaWMgd3JpdGVGbG9hdCh2YWx1ZTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2Vuc3VyZUNhcGFjaXR5KDQpO1xuICAgICAgICBfdmlldzQuc2V0RmxvYXQzMigwLCB2YWx1ZSwgdHJ1ZSk7XG4gICAgICAgIHRoaXMuX2J1ZmZlci5zZXQoX3NjcmF0Y2g0LCB0aGlzLl9wb3MpO1xuICAgICAgICB0aGlzLl9wb3MgKz0gNDtcbiAgICB9XG5cbiAgICAvKiogV3JpdGUgYSBmbG9hdDY0IChmaXhlZDY0IHdpcmUgdHlwZSkuICovXG4gICAgcHVibGljIHdyaXRlRG91YmxlKHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlQ2FwYWNpdHkoOCk7XG4gICAgICAgIF92aWV3OC5zZXRGbG9hdDY0KDAsIHZhbHVlLCB0cnVlKTtcbiAgICAgICAgdGhpcy5fYnVmZmVyLnNldChfc2NyYXRjaDgsIHRoaXMuX3Bvcyk7XG4gICAgICAgIHRoaXMuX3BvcyArPSA4O1xuICAgIH1cblxuICAgIC8qKiBXcml0ZSBhIGJvb2xlYW4gKHZhcmludCB3aXJlIHR5cGUpLiAqL1xuICAgIHB1YmxpYyB3cml0ZUJvb2wodmFsdWU6IGJvb2xlYW4pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd3JpdGVWYXJpbnQodmFsdWUgPyAxIDogMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogV3JpdGUgYSBsZW5ndGgtZGVsaW1pdGVkIHN0cmluZy5cbiAgICAgKiBXcml0ZXMgdGhlIGxlbmd0aCBwcmVmaXggZm9sbG93ZWQgYnkgVVRGLTggZW5jb2RlZCBieXRlcy5cbiAgICAgKi9cbiAgICBwdWJsaWMgd3JpdGVTdHJpbmcodmFsdWU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBlbmNvZGVkID0gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKHZhbHVlKTtcbiAgICAgICAgdGhpcy5fd3JpdGVWYXJpbnQoZW5jb2RlZC5ieXRlTGVuZ3RoKTtcbiAgICAgICAgdGhpcy5fd3JpdGVSYXdCeXRlcyhlbmNvZGVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBsZW5ndGgtZGVsaW1pdGVkIHJhdyBieXRlcy5cbiAgICAgKiBXcml0ZXMgdGhlIGxlbmd0aCBwcmVmaXggZm9sbG93ZWQgYnkgdGhlIGJ5dGUgY29udGVudC5cbiAgICAgKi9cbiAgICBwdWJsaWMgd3JpdGVCeXRlcyh2YWx1ZTogVWludDhBcnJheSk6IHZvaWQge1xuICAgICAgICB0aGlzLl93cml0ZVZhcmludCh2YWx1ZS5ieXRlTGVuZ3RoKTtcbiAgICAgICAgdGhpcy5fd3JpdGVSYXdCeXRlcyh2YWx1ZSk7XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIFBhY2tlZCByZXBlYXRlZCBmaWVsZHMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBwYWNrZWQgdmFyaW50IGludDMyIHZhbHVlcy5cbiAgICAgKiBXcml0ZXMgYSBsZW5ndGggcHJlZml4IGZvbGxvd2VkIGJ5IHZhcmludC1lbmNvZGVkIHZhbHVlcy5cbiAgICAgKiBAcGFyYW0gdmFsdWVzICBTb3VyY2UgYXJyYXkuXG4gICAgICogQHBhcmFtIGNvdW50ICAgTnVtYmVyIG9mIGVsZW1lbnRzIHRvIHdyaXRlIGZyb20gdGhlIGFycmF5LlxuICAgICAqL1xuICAgIHB1YmxpYyB3cml0ZVBhY2tlZEludDMyKHZhbHVlczogSW50MzJBcnJheSwgY291bnQ6IG51bWJlcik6IHZvaWQge1xuICAgICAgICAvLyBNZWFzdXJlIGZpcnN0IHRvIGNvbXB1dGUgbGVuZ3RoIHByZWZpeFxuICAgICAgICBjb25zdCB0bXAgPSBuZXcgUEJXcml0ZXIoKTtcbiAgICAgICAgY29uc3QgbiA9IE1hdGgubWluKGNvdW50LCB2YWx1ZXMubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIHRtcC5fd3JpdGVWYXJpbnQodmFsdWVzW2ldIHwgMCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGFja2VkID0gdG1wLmZpbmlzaCgpO1xuICAgICAgICB0aGlzLl93cml0ZVZhcmludChwYWNrZWQuYnl0ZUxlbmd0aCk7XG4gICAgICAgIHRoaXMuX3dyaXRlUmF3Qnl0ZXMocGFja2VkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBwYWNrZWQgZmxvYXQzMiB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHZhbHVlcyAgU291cmNlIGFycmF5LlxuICAgICAqIEBwYXJhbSBjb3VudCAgIE51bWJlciBvZiBlbGVtZW50cyB0byB3cml0ZSBmcm9tIHRoZSBhcnJheS5cbiAgICAgKi9cbiAgICBwdWJsaWMgd3JpdGVQYWNrZWRGbG9hdDMyKHZhbHVlczogRmxvYXQzMkFycmF5LCBjb3VudDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IG4gPSBNYXRoLm1pbihjb3VudCwgdmFsdWVzLmxlbmd0aCk7XG4gICAgICAgIHRoaXMuX3dyaXRlVmFyaW50KG4gKiA0KTtcbiAgICAgICAgdGhpcy5fZW5zdXJlQ2FwYWNpdHkobiAqIDQpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgX3ZpZXc0LnNldEZsb2F0MzIoMCwgdmFsdWVzW2ldLCB0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuX2J1ZmZlci5zZXQoX3NjcmF0Y2g0LCB0aGlzLl9wb3MpO1xuICAgICAgICAgICAgdGhpcy5fcG9zICs9IDQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBwYWNrZWQgZmxvYXQ2NCB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHZhbHVlcyAgU291cmNlIGFycmF5LlxuICAgICAqIEBwYXJhbSBjb3VudCAgIE51bWJlciBvZiBlbGVtZW50cyB0byB3cml0ZSBmcm9tIHRoZSBhcnJheS5cbiAgICAgKi9cbiAgICBwdWJsaWMgd3JpdGVQYWNrZWRGbG9hdDY0KHZhbHVlczogRmxvYXQ2NEFycmF5LCBjb3VudDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IG4gPSBNYXRoLm1pbihjb3VudCwgdmFsdWVzLmxlbmd0aCk7XG4gICAgICAgIHRoaXMuX3dyaXRlVmFyaW50KG4gKiA4KTtcbiAgICAgICAgdGhpcy5fZW5zdXJlQ2FwYWNpdHkobiAqIDgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgX3ZpZXc4LnNldEZsb2F0NjQoMCwgdmFsdWVzW2ldLCB0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuX2J1ZmZlci5zZXQoX3NjcmF0Y2g4LCB0aGlzLl9wb3MpO1xuICAgICAgICAgICAgdGhpcy5fcG9zICs9IDg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDilIDilIAgU3ViLW1lc3NhZ2Ug4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBhIHN1Yi1tZXNzYWdlIHVzaW5nIGEgY2FsbGJhY2suXG4gICAgICogVGhlIGNhbGxiYWNrIHJlY2VpdmVzIGEgZnJlc2ggd3JpdGVyOyBpdHMgb3V0cHV0IGlzIGF1dG9tYXRpY2FsbHlcbiAgICAgKiBsZW5ndGgtcHJlZml4ZWQgYW5kIGFwcGVuZGVkIHRvIHRoaXMgd3JpdGVyLlxuICAgICAqXG4gICAgICogVXNhZ2U6XG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHdyaXRlci53cml0ZVRhZygzLCBXaXJlVHlwZS5MRU4pO1xuICAgICAqIHdyaXRlci53cml0ZVN1Yk1lc3NhZ2UoKHN1YikgPT4ge1xuICAgICAqICAgICBzdWIud3JpdGVUYWcoMSwgV2lyZVR5cGUuVkFSSU5UKTtcbiAgICAgKiAgICAgc3ViLndyaXRlSW50MzIoNDIpO1xuICAgICAqIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIHB1YmxpYyB3cml0ZVN1Yk1lc3NhZ2UoZm46IChzdWI6IFBCV3JpdGVyKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHN1YiA9IG5ldyBQQldyaXRlcigpO1xuICAgICAgICBmbihzdWIpO1xuICAgICAgICBjb25zdCBkYXRhID0gc3ViLmZpbmlzaCgpO1xuICAgICAgICB0aGlzLl93cml0ZVZhcmludChkYXRhLmJ5dGVMZW5ndGgpO1xuICAgICAgICB0aGlzLl93cml0ZVJhd0J5dGVzKGRhdGEpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFdyaXRlIHByZS1zZXJpYWxpemVkIHN1Yi1tZXNzYWdlIGJ5dGVzIHdpdGggYSBsZW5ndGggcHJlZml4LlxuICAgICAqL1xuICAgIHB1YmxpYyB3cml0ZVJhd1N1Yk1lc3NhZ2UoZGF0YTogVWludDhBcnJheSk6IHZvaWQge1xuICAgICAgICB0aGlzLl93cml0ZVZhcmludChkYXRhLmJ5dGVMZW5ndGgpO1xuICAgICAgICB0aGlzLl93cml0ZVJhd0J5dGVzKGRhdGEpO1xuICAgIH1cblxuICAgIC8vIOKUgOKUgCBGaW5hbGl6ZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgd3JpdHRlbiBieXRlcyBhcyBhIGNvbXBhY3QgVWludDhBcnJheS5cbiAgICAgKiBBZnRlciBjYWxsaW5nIGZpbmlzaCgpLCB0aGUgd3JpdGVyIHNob3VsZCBub3QgYmUgcmV1c2VkLlxuICAgICAqL1xuICAgIHB1YmxpYyBmaW5pc2goKTogVWludDhBcnJheSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9idWZmZXIuc3ViYXJyYXkoMCwgdGhpcy5fcG9zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNldCB0aGUgd3JpdGVyIHRvIHJldXNlIGl0cyBidWZmZXIuXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0KCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9wb3MgPSAwO1xuICAgIH1cblxuICAgIC8vIOKUgOKUgCBQcml2YXRlIHByaW1pdGl2ZXMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBhIHZhcmludCAodW5zaWduZWQgMzItYml0KS5cbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgX3dyaXRlVmFyaW50KHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZSA+Pj4gMDsgLy8gZm9yY2UgdW5zaWduZWQgMzItYml0XG4gICAgICAgIHdoaWxlICh2YWx1ZSA+IDB4N2YpIHtcbiAgICAgICAgICAgIHRoaXMuX3dyaXRlQnl0ZSgodmFsdWUgJiAweDdmKSB8IDB4ODApO1xuICAgICAgICAgICAgdmFsdWUgPj4+PSA3O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3dyaXRlQnl0ZSh2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogV3JpdGUgYSA2NC1iaXQgdmFyaW50IGZyb20gYSBKUyBudW1iZXIgKHNhZmUgdXAgdG8gMl41MykuXG4gICAgICovXG4gICAgcHJvdGVjdGVkIF93cml0ZVZhcmludDY0KHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgLy8gSGFuZGxlIG5lZ2F0aXZlIG9yIHZhbHVlcyA+IDJeMzIgYnkgc3BsaXR0aW5nIGludG8gbG8vaGlcbiAgICAgICAgbGV0IGxvID0gdmFsdWUgPj4+IDA7XG4gICAgICAgIGxldCBoaSA9ICh2YWx1ZSAvIDB4MTAwMDAwMDAwKSA+Pj4gMDtcblxuICAgICAgICAvLyBXcml0ZSBsbyBwYXJ0ICh1cCB0byA0IGZ1bGwgNy1iaXQgZ3JvdXBzID0gMjggYml0cylcbiAgICAgICAgd2hpbGUgKGhpID4gMCB8fCBsbyA+IDB4N2YpIHtcbiAgICAgICAgICAgIHRoaXMuX3dyaXRlQnl0ZSgobG8gJiAweDdmKSB8IDB4ODApO1xuICAgICAgICAgICAgbG8gPSAoKGxvID4+PiA3KSB8IChoaSA8PCAyNSkpID4+PiAwO1xuICAgICAgICAgICAgaGkgPj4+PSA3O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3dyaXRlQnl0ZShsbyAmIDB4N2YpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVCeXRlKGI6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9lbnN1cmVDYXBhY2l0eSgxKTtcbiAgICAgICAgdGhpcy5fYnVmZmVyW3RoaXMuX3BvcysrXSA9IGI7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZVJhd0J5dGVzKGRhdGE6IFVpbnQ4QXJyYXkpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlQ2FwYWNpdHkoZGF0YS5ieXRlTGVuZ3RoKTtcbiAgICAgICAgdGhpcy5fYnVmZmVyLnNldChkYXRhLCB0aGlzLl9wb3MpO1xuICAgICAgICB0aGlzLl9wb3MgKz0gZGF0YS5ieXRlTGVuZ3RoO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfZW5zdXJlQ2FwYWNpdHkobmVlZGVkOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgcmVxdWlyZWQgPSB0aGlzLl9wb3MgKyBuZWVkZWQ7XG4gICAgICAgIGlmIChyZXF1aXJlZCA8PSB0aGlzLl9idWZmZXIuYnl0ZUxlbmd0aCkgcmV0dXJuO1xuXG4gICAgICAgIGxldCBuZXdTaXplID0gdGhpcy5fYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgIHdoaWxlIChuZXdTaXplIDwgcmVxdWlyZWQpIHtcbiAgICAgICAgICAgIG5ld1NpemUgKj0gR1JPV1RIX0ZBQ1RPUjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuZXdCdWYgPSBuZXcgVWludDhBcnJheShuZXdTaXplKTtcbiAgICAgICAgbmV3QnVmLnNldCh0aGlzLl9idWZmZXIpO1xuICAgICAgICB0aGlzLl9idWZmZXIgPSBuZXdCdWY7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgQ29tcHV0ZU5vZGVCYXNlIH0gZnJvbSBcIi4uL2NvbXB1dGUvY29tcHV0ZS5ub2RlLmJhc2VcIjtcclxuaW1wb3J0IHR5cGUgeyBJVGVuc29yIH0gZnJvbSBcIi4uL2NvbXB1dGUvY29tcHV0ZS5pbnRlcmZhY2VzXCI7XHJcbmltcG9ydCB7IE9ubnhEYXRhVHlwZSB9IGZyb20gXCIuL29ubngtdHlwZXNcIjtcclxuaW1wb3J0IHR5cGUgeyBPbm54Tm9kZUluZm8sIE9ubnhUZW5zb3JJbmZvIH0gZnJvbSBcIi4vb25ueC10eXBlc1wiO1xyXG5cclxuLyoqXHJcbiAqIEZhY3RvcnkgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIGEgQ29tcHV0ZU5vZGVCYXNlIGZyb20gYW4gT05OWCBub2RlIGRlZmluaXRpb24uXHJcbiAqL1xyXG5leHBvcnQgdHlwZSBPbm54T3BGYWN0b3J5ID0gKG5vZGVJbmZvOiBPbm54Tm9kZUluZm8sIGluaXRpYWxpemVyczogTWFwPHN0cmluZywgT25ueFRlbnNvckluZm8+KSA9PiBDb21wdXRlTm9kZUJhc2U7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE9ubnhPcEVudHJ5IHtcclxuICAgIGZhY3Rvcnk6IE9ubnhPcEZhY3Rvcnk7XHJcbiAgICBwcmlvcml0eTogbnVtYmVyO1xyXG4gICAgYmFja2VuZDogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogRGVmYXVsdCBwcmlvcml0eSBsZXZlbHMuXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgUFJJT1JJVFlfR0VORVJJQyA9IDA7XHJcbmV4cG9ydCBjb25zdCBQUklPUklUWV9OQVRJVkUgPSAxMDA7XHJcblxyXG4vKipcclxuICogUmVnaXN0cnkgbWFwcGluZyBPTk5YIG9wVHlwZSBzdHJpbmdzIHRvIHRoZWlyIGNvbXB1dGUgaW1wbGVtZW50YXRpb25zLlxyXG4gKiBTdXBwb3J0cyBwcmlvcml0eS1iYXNlZCByZWdpc3RyYXRpb246IGhpZ2hlciBwcmlvcml0eSB3aW5zLlxyXG4gKiBNdWx0aXBsZSBiYWNrZW5kcyBjYW4gcmVnaXN0ZXIgZm9yIHRoZSBzYW1lIG9wIOKAlCBoaWdoZXN0IHByaW9yaXR5IGlzIHVzZWQuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgT25ueE9wUmVnaXN0cnkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBlbnRyaWVzID0gbmV3IE1hcDxzdHJpbmcsIE9ubnhPcEVudHJ5W10+KCk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWdpc3RlciBhbiBvcCBpbXBsZW1lbnRhdGlvbi5cclxuICAgICAqIEBwYXJhbSBvcFR5cGUgICBPTk5YIG9wZXJhdG9yIHR5cGUgKGUuZy4gXCJDb252XCIsIFwiTFNUTVwiKVxyXG4gICAgICogQHBhcmFtIGZhY3RvcnkgIEZhY3RvcnkgZnVuY3Rpb25cclxuICAgICAqIEBwYXJhbSBwcmlvcml0eSBIaWdoZXIgcHJpb3JpdHkgd2lucyAoZGVmYXVsdDogUFJJT1JJVFlfR0VORVJJQyA9IDApXHJcbiAgICAgKiBAcGFyYW0gYmFja2VuZCAgTGFiZWwgZm9yIHRoZSBpbXBsZW1lbnRhdGlvbiBzb3VyY2UgKGUuZy4gXCJnZW5lcmljXCIsIFwic3Bpa3lwYW5kYVwiKVxyXG4gICAgICovXHJcbiAgICByZWdpc3RlcihvcFR5cGU6IHN0cmluZywgZmFjdG9yeTogT25ueE9wRmFjdG9yeSwgcHJpb3JpdHkgPSBQUklPUklUWV9HRU5FUklDLCBiYWNrZW5kID0gXCJnZW5lcmljXCIpOiB2b2lkIHtcclxuICAgICAgICBsZXQgbGlzdCA9IHRoaXMuZW50cmllcy5nZXQob3BUeXBlKTtcclxuICAgICAgICBpZiAoIWxpc3QpIHtcclxuICAgICAgICAgICAgbGlzdCA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLmVudHJpZXMuc2V0KG9wVHlwZSwgbGlzdCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxpc3QucHVzaCh7IGZhY3RvcnksIHByaW9yaXR5LCBiYWNrZW5kIH0pO1xyXG4gICAgICAgIGxpc3Quc29ydCgoYSwgYikgPT4gYi5wcmlvcml0eSAtIGEucHJpb3JpdHkpO1xyXG4gICAgfVxyXG5cclxuICAgIGhhcyhvcFR5cGU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmVudHJpZXMuaGFzKG9wVHlwZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgYSBub2RlIHVzaW5nIHRoZSBoaWdoZXN0LXByaW9yaXR5IGZhY3RvcnkuXHJcbiAgICAgKi9cclxuICAgIGNyZWF0ZShub2RlSW5mbzogT25ueE5vZGVJbmZvLCBpbml0aWFsaXplcnM6IE1hcDxzdHJpbmcsIE9ubnhUZW5zb3JJbmZvPik6IENvbXB1dGVOb2RlQmFzZSB7XHJcbiAgICAgICAgY29uc3QgbGlzdCA9IHRoaXMuZW50cmllcy5nZXQobm9kZUluZm8ub3BUeXBlKTtcclxuICAgICAgICBpZiAoIWxpc3QgfHwgbGlzdC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBPTk5YIG9wIGltcGxlbWVudGF0aW9uIGZvcjogJHtub2RlSW5mby5vcFR5cGV9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBsaXN0WzBdLmZhY3Rvcnkobm9kZUluZm8sIGluaXRpYWxpemVycyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgaW5mbyBhYm91dCB0aGUgYWN0aXZlIChoaWdoZXN0LXByaW9yaXR5KSBpbXBsZW1lbnRhdGlvbiBmb3IgYW4gb3AuXHJcbiAgICAgKi9cclxuICAgIGdldEFjdGl2ZUJhY2tlbmQob3BUeXBlOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgICAgIGNvbnN0IGxpc3QgPSB0aGlzLmVudHJpZXMuZ2V0KG9wVHlwZSk7XHJcbiAgICAgICAgcmV0dXJuIGxpc3QgJiYgbGlzdC5sZW5ndGggPiAwID8gbGlzdFswXS5iYWNrZW5kIDogdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0IGFsbCByZWdpc3RlcmVkIGJhY2tlbmRzIGZvciBhbiBvcCwgc29ydGVkIGJ5IHByaW9yaXR5IChoaWdoZXN0IGZpcnN0KS5cclxuICAgICAqL1xyXG4gICAgZ2V0QmFja2VuZHMob3BUeXBlOiBzdHJpbmcpOiB7IGJhY2tlbmQ6IHN0cmluZzsgcHJpb3JpdHk6IG51bWJlciB9W10ge1xyXG4gICAgICAgIGNvbnN0IGxpc3QgPSB0aGlzLmVudHJpZXMuZ2V0KG9wVHlwZSk7XHJcbiAgICAgICAgcmV0dXJuIGxpc3QgPyBsaXN0Lm1hcCgoZSkgPT4gKHsgYmFja2VuZDogZS5iYWNrZW5kLCBwcmlvcml0eTogZS5wcmlvcml0eSB9KSkgOiBbXTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRSZWdpc3RlcmVkKCk6IHN0cmluZ1tdIHtcclxuICAgICAgICByZXR1cm4gWy4uLnRoaXMuZW50cmllcy5rZXlzKCldLnNvcnQoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFN1bW1hcnk6IGZvciBlYWNoIG9wLCB3aGljaCBiYWNrZW5kIGlzIGFjdGl2ZS5cclxuICAgICAqL1xyXG4gICAgc3VtbWFyeSgpOiB7IG9wVHlwZTogc3RyaW5nOyBiYWNrZW5kOiBzdHJpbmc7IHByaW9yaXR5OiBudW1iZXI7IGFsdGVybmF0aXZlczogbnVtYmVyIH1bXSB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0OiB7IG9wVHlwZTogc3RyaW5nOyBiYWNrZW5kOiBzdHJpbmc7IHByaW9yaXR5OiBudW1iZXI7IGFsdGVybmF0aXZlczogbnVtYmVyIH1bXSA9IFtdO1xyXG4gICAgICAgIGZvciAoY29uc3QgW29wVHlwZSwgbGlzdF0gb2YgdGhpcy5lbnRyaWVzKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHtcclxuICAgICAgICAgICAgICAgIG9wVHlwZSxcclxuICAgICAgICAgICAgICAgIGJhY2tlbmQ6IGxpc3RbMF0uYmFja2VuZCxcclxuICAgICAgICAgICAgICAgIHByaW9yaXR5OiBsaXN0WzBdLnByaW9yaXR5LFxyXG4gICAgICAgICAgICAgICAgYWx0ZXJuYXRpdmVzOiBsaXN0Lmxlbmd0aCAtIDEsXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzdWx0LnNvcnQoKGEsIGIpID0+IGEub3BUeXBlLmxvY2FsZUNvbXBhcmUoYi5vcFR5cGUpKTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEJhc2UgY2xhc3MgZm9yIE9OTlggb3Agbm9kZXMuIFByb3ZpZGVzIGF0dHJpYnV0ZSBhY2Nlc3MgaGVscGVycy5cclxuICovXHJcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBPbm54T3BOb2RlIGV4dGVuZHMgQ29tcHV0ZU5vZGVCYXNlIHtcclxuICAgIHJlYWRvbmx5IG9wVHlwZTogc3RyaW5nO1xyXG4gICAgcHJvdGVjdGVkIHJlYWRvbmx5IGF0dHJpYnV0ZXM6IE1hcDxzdHJpbmcsIG51bWJlcj47XHJcbiAgICBwcm90ZWN0ZWQgcmVhZG9ubHkgdGVuc29yQXR0cmlidXRlczogTWFwPHN0cmluZywgT25ueFRlbnNvckluZm8+O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5vZGVJbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMub3BUeXBlID0gbm9kZUluZm8ub3BUeXBlO1xyXG4gICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IG5vZGVJbmZvLmF0dHJpYnV0ZXM7XHJcbiAgICAgICAgdGhpcy50ZW5zb3JBdHRyaWJ1dGVzID0gbm9kZUluZm8udGVuc29yQXR0cmlidXRlcyA/PyBuZXcgTWFwKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IG5vZGVUeXBlKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGBvbm54XyR7dGhpcy5vcFR5cGUudG9Mb3dlckNhc2UoKX1gO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBhdHRyKG5hbWU6IHN0cmluZywgZGVmYXVsdFZhbDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hdHRyaWJ1dGVzLmdldChuYW1lKSA/PyBkZWZhdWx0VmFsO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBhdHRySW50KG5hbWU6IHN0cmluZywgZGVmYXVsdFZhbDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5yb3VuZCh0aGlzLmF0dHJpYnV0ZXMuZ2V0KG5hbWUpID8/IGRlZmF1bHRWYWwpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBhdHRyVGVuc29yKG5hbWU6IHN0cmluZyk6IE9ubnhUZW5zb3JJbmZvIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICByZXR1cm4gdGhpcy50ZW5zb3JBdHRyaWJ1dGVzLmdldChuYW1lKTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEhlbHBlcjogZ2V0IGluaXRpYWxpemVyIGFzIEZsb2F0MzJBcnJheSwgaGFuZGxpbmcgcmF3RGF0YSBjb252ZXJzaW9uLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEluaXRpYWxpemVyRGF0YShpbml0OiBPbm54VGVuc29ySW5mbyk6IEZsb2F0MzJBcnJheSB7XHJcbiAgICBpZiAoaW5pdC5mbG9hdERhdGEgJiYgaW5pdC5mbG9hdERhdGEubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIHJldHVybiBpbml0LmZsb2F0RGF0YTtcclxuICAgIH1cclxuICAgIGlmIChpbml0LnJhd0RhdGEgJiYgaW5pdC5yYXdEYXRhLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAvLyBIYW5kbGUgaW50NjQgcmF3IGRhdGE6IGNvbnZlcnQgOC1ieXRlIGludHMgdG8gZmxvYXQzMlxyXG4gICAgICAgIGlmIChpbml0LmRhdGFUeXBlID09PSBPbm54RGF0YVR5cGUuSU5UNjQpIHtcclxuICAgICAgICAgICAgY29uc3QgdmlldyA9IG5ldyBEYXRhVmlldyhpbml0LnJhd0RhdGEuYnVmZmVyLCBpbml0LnJhd0RhdGEuYnl0ZU9mZnNldCwgaW5pdC5yYXdEYXRhLmJ5dGVMZW5ndGgpO1xyXG4gICAgICAgICAgICBjb25zdCBjb3VudCA9IGluaXQucmF3RGF0YS5ieXRlTGVuZ3RoIC8gODtcclxuICAgICAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShjb3VudCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgLy8gUmVhZCBhcyBpbnQ2NCAobG93IDMyIGJpdHMgc3VmZmljaWVudCBmb3IgdHlwaWNhbCB2YWx1ZXMpXHJcbiAgICAgICAgICAgICAgICBvdXRbaV0gPSBOdW1iZXIodmlldy5nZXRCaWdJbnQ2NChpICogOCwgdHJ1ZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBvdXQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBuZXcgRmxvYXQzMkFycmF5KGluaXQucmF3RGF0YS5idWZmZXIsIGluaXQucmF3RGF0YS5ieXRlT2Zmc2V0LCBpbml0LnJhd0RhdGEuYnl0ZUxlbmd0aCAvIDQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5ldyBGbG9hdDMyQXJyYXkoMCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIZWxwZXI6IGNvbXB1dGUgdG90YWwgZWxlbWVudCBjb3VudCBmcm9tIHNoYXBlLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHNoYXBlU2l6ZShzaGFwZTogbnVtYmVyW10pOiBudW1iZXIge1xyXG4gICAgbGV0IHMgPSAxO1xyXG4gICAgZm9yIChjb25zdCBkIG9mIHNoYXBlKSBzICo9IGQ7XHJcbiAgICByZXR1cm4gcztcclxufVxyXG5cclxuLyoqXHJcbiAqIEhlbHBlcjogY3JlYXRlIGFuIElUZW5zb3IuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWFrZVRlbnNvcihkYXRhOiBGbG9hdDMyQXJyYXksIHNoYXBlOiBudW1iZXJbXSwgbmFtZT86IHN0cmluZyk6IElUZW5zb3Ige1xyXG4gICAgcmV0dXJuIHsgZGF0YSwgc2hhcGUsIG5hbWUgfTtcclxufVxyXG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsIi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gQHNwaWt5LXBhbmRhL3J1bnRpbWVcbi8vXG4vLyBPTk5YLWxpa2UgY29tcHV0ZSBncmFwaCBydW50aW1lIGZvciBTcGlreVBhbmRhIG5ldXJhbCBuZXR3b3Jrcy5cbi8vXG4vLyBQcm92aWRlcyBhIHR5cGVkIERBRyBleGVjdXRpb24gZW5naW5lIHdoZXJlOlxuLy8gICAtIE5vZGVzIGFyZSBwcm9jZXNzaW5nIHN0YWdlcyAoSUNvbXB1dGVOb2RlKVxuLy8gICAtIEVkZ2VzIGNhcnJ5IHR5cGVkIGRhdGEgdGVuc29ycyAoSURhdGFMaW5rKVxuLy8gICAtIFRoZSBncmFwaCBleGVjdXRlcyBpbiB0b3BvbG9naWNhbCBvcmRlciAoS2FobidzIGFsZ29yaXRobSlcbi8vXG4vLyBNb2R1bGVzOlxuLy8gICBjb21wdXRlLyAgOiBJVGVuc29yLCBJQ29tcHV0ZU5vZGUsIENvbXB1dGVHcmFwaCwgYnVpbHQtaW4gbm9kZXNcbi8vICAgb25ueC8gICAgIDogUHJvdG9idWYgcmVhZGVyLCBPTk5YIHBhcnNlciAoemVyby1kZXBlbmRlbmN5KVxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5cbmV4cG9ydCAqIGZyb20gXCIuL2NvbXB1dGUvaW5kZXhcIjtcbmV4cG9ydCAqIGZyb20gXCIuL29ubngvaW5kZXhcIjtcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==