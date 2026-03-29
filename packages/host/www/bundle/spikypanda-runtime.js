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
/* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../registry */ "./src/onnx/registry.ts");

















/**
 * Create a registry with all generic ONNX ops registered.
 */
function createDefaultRegistry() {
    const registry = new _registry__WEBPACK_IMPORTED_MODULE_8__.OnnxOpRegistry();
    (0,_math__WEBPACK_IMPORTED_MODULE_0__.registerMathOps)(registry);
    (0,_activations__WEBPACK_IMPORTED_MODULE_1__.registerActivationOps)(registry);
    (0,_matrix__WEBPACK_IMPORTED_MODULE_2__.registerMatrixOps)(registry);
    (0,_conv__WEBPACK_IMPORTED_MODULE_3__.registerConvOps)(registry);
    (0,_normalization__WEBPACK_IMPORTED_MODULE_4__.registerNormOps)(registry);
    (0,_recurrent__WEBPACK_IMPORTED_MODULE_5__.registerRecurrentOps)(registry);
    (0,_misc__WEBPACK_IMPORTED_MODULE_6__.registerMiscOps)(registry);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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SUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEYsTUFBTSxHQUFHLEdBQUcsSUFBSSxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUMzQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDekIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO3dCQUM1QixJQUFJLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQzt3QkFDcEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzs0QkFDdkMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7NEJBQzFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0NBQ3BCLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQzs0QkFDeEQsQ0FBQzt3QkFDTCxDQUFDO3dCQUNELEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUks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QUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDL0QsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUUvRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUN0QyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUN0QyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUV0QyxNQUFNLEdBQUcsR0FBRyxJQUFJLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFcEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO2dCQUNaLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMs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Q0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztRQUU5QixJQUFJLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNiLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztZQUMvQixNQUFNLEdBQUcsR0FBRyxJQUFJLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDNUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUM1QixHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLENBQUM7WUFDTCxDQUFDO1lBQ0QsT0FBTyxDQUFDLHFEQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBRUQsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDYixNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1lBQy9CLHVDQUF1QztZQUN2QyxNQUFNLEdBQUcsR0FBRyxJQUFJLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDMUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUMxQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7d0JBQzFCLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDdkUsQ0FBQztnQkFDTCxDQUFDO1lBQ0wsQ0FBQztZQUNELE9BQU8sQ0FBQyxxREFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFFRCxXQUFXO1FBQ1gsT0FBTyxDQUFDLHFEQUFVLENBQUMsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7Q0FDSjtBQUVEOzs7R0FHRztBQUNILE1BQU0sV0FBWSxTQUFRLGlEQUFVO0lBQXBDOztRQUNhLGlCQUFZLEdBQWUsRUFBRSxDQUFDO0lBOEIzQyxDQUFDO0lBN0JHLE9BQU8sQ0FBQyxNQUFpQjtRQUNyQixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkIsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxNQUFNO1lBQUUsT0FBTyxDQUFDLHFEQUFVLENBQUMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRS9FLE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQztRQUM5QixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNsQixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMxQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNYLFFBQVEsR0FBRyxDQUFDLENBQUM7Z0JBQ2IsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLENBQUM7aUJBQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2pCLDBCQUEwQjtnQkFDMUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQy9CLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ25CLEtBQUssSUFBSSxHQUFHLENBQUM7WUFDakIsQ0FBQztpQkFBTSxDQUFDO2dCQUNKLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pCLEtBQUssSUFBSSxDQUFDLENBQUM7WUFDZixDQUFDO1FBQ0wsQ0FBQztRQUNELElBQUksUUFBUSxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2hCLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDbEQsQ0FBQztRQUVELE9BQU8sQ0FBQyxxREFBVSxDQUFDLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQy9ELENBQUM7Q0FDSjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxXQUFZLFNBQVEsaURBQVU7SUFHaEMsWUFBWSxJQUFrQjtRQUMxQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFGUCxpQkFBWSxHQUFlLEVBQUUsQ0FBQztRQUduQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFDRCxPQUFPLENBQUMsTUFBaUI7UUFDckIsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFDeEIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUNOLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDWCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUU7WUFBRSxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4RCxLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFO1lBQUUsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkUsT0FBTyxDQUFDLHFEQUFVLENBQUMsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDO0NBQ0o7QUFFRDs7R0FFRztBQUNILE1BQU0sV0FBWSxTQUFRLGlEQUFVO0lBQXBDOztRQUNhLGlCQUFZLEdBQWUsRUFBRSxDQUFDO0lBUTNDLENBQUM7SUFQRyxPQUFPLENBQUMsTUFBaUI7UUFDckIsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ2pHLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6RyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUMsT0FBTyxDQUFDLHFEQUFVLENBQUMsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQztDQUNKO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLGFBQWMsU0FBUSxpREFBVTtJQUF0Qzs7UUFDYSxpQkFBWSxHQUFlLEVBQUUsQ0FBQztJQWMzQyxDQUFDO0lBYkcsT0FBTyxDQUFDLE1BQWlCO1FBQ3JCLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLEtBQUs7WUFBRSxPQUFPLENBQUMscURBQVUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUUsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO2FBQzlCLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO2FBQ2YsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzNCLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEMsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNuQixRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0IsQ0FBQztRQUNELE9BQU8sQ0FBQyxxREFBVSxDQUFDLElBQUksWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzlELENBQUM7Q0FDSjtBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVyxTQUFRLGlEQUFVO0lBRy9CLFlBQVksSUFBa0I7UUFDMUIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRlAsaUJBQVksR0FBZSxFQUFFLENBQUM7UUFHbkMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBQ0QsT0FBTyxDQUFDLE1BQWlCO1FBQ3JCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLE9BQU87WUFBRSxPQUFPLENBQUMscURBQVUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFaEYsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ25DLE1BQU0sR0FBRyxHQUFHLElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQztZQUM1QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzlCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN4QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzVCLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDbEQsQ0FBQztZQUNMLENBQUM7WUFDRCxPQUFPLENBQUMscURBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCxzQkFBc0I7UUFDdEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMzQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBQ0QsT0FBTyxDQUFDLHFEQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEQsQ0FBQztDQUNKO0FBRU0sU0FBUyxpQkFBaUIsQ0FBQyxRQUF3QjtJQUN0RCxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM1RCxRQUFRLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNsRSxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM5RCxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM5RCxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM5RCxRQUFRLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNsRSxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNoRSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7O0FDak93RjtBQUV6RixNQUFNLE9BQVEsU0FBUSxpREFBVTtJQUFoQzs7UUFDYSxpQkFBWSxHQUFlLEVBQUUsQ0FBQztJQVUzQyxDQUFDO0lBVEcsT0FBTyxDQUFDLE1BQWlCO1FBQ3JCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwRCxNQUFNLEdBQUcsR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUIsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuRSxDQUFDO1FBQ0QsT0FBTyxDQUFDLHFEQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzRixDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQVEsU0FBUSxpREFBVTtJQUFoQzs7UUFDYSxpQkFBWSxHQUFlLEVBQUUsQ0FBQztJQVUzQyxDQUFDO0lBVEcsT0FBTyxDQUFDLE1BQWlCO1FBQ3JCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwRCxNQUFNLEdBQUcsR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUIsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDNUUsQ0FBQztRQUNELE9BQU8sQ0FBQyxxREFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0YsQ0FBQztDQUNKO0FBRUQsTUFBTSxjQUFlLFNBQVEsaURBQVU7SUFLbkMsWUFBWSxJQUFrQjtRQUMxQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFIUCxpQkFBWSxHQUFlLEVBQUUsQ0FBQztRQUluQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVELE9BQU8sQ0FBQyxNQUFpQjtRQUNyQixNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUN0QixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQzFCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztRQUUxRCxJQUFJLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNiLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNiLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdEIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN0QixNQUFNLEdBQUcsR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUM1QixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7b0JBQ1osS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUU7d0JBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDM0QsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUM7Z0JBQ3hCLENBQUM7Z0JBQ0QsT0FBTyxDQUFDLHFEQUFVLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqRSxDQUFDO1lBQ0QsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2IsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN0QixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RCLE1BQU0sR0FBRyxHQUFHLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNuQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzVCLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztvQkFDWixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRTt3QkFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUMzRCxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQztnQkFDeEIsQ0FBQztnQkFDRCxPQUFPLENBQUMscURBQVUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pFLENBQUM7UUFDTCxDQUFDO1FBRUQsdUJBQXVCO1FBQ3ZCLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztRQUNaLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUU7WUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RCxPQUFPLENBQUMscURBQVUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEUsQ0FBQztDQUNKO0FBRUQsTUFBTSxhQUFjLFNBQVEsaURBQVU7SUFLbEMsWUFBWSxJQUFrQjtRQUMxQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFIUCxpQkFBWSxHQUFlLEVBQUUsQ0FBQztRQUluQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVELE9BQU8sQ0FBQyxNQUFpQjtRQUNyQixNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUN0QixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQzFCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztRQUUxRCxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sR0FBRyxHQUFHLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO2dCQUNaLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFO29CQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzNELEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7WUFDakIsQ0FBQztZQUNELE9BQU8sQ0FBQyxxREFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUVELElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztRQUNaLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUU7WUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RCxPQUFPLENBQUMscURBQVUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEQsQ0FBQztDQUNKO0FBRUQsTUFBTSxZQUFhLFNBQVEsaURBQVU7SUFBckM7O1FBQ2EsaUJBQVksR0FBZSxFQUFFLENBQUM7SUFJM0MsQ0FBQztJQUhHLE9BQU8sQ0FBQyxNQUFpQjtRQUNyQixPQUFPLENBQUMscURBQVUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEYsQ0FBQztDQUNKO0FBRUQsTUFBTSxRQUFTLFNBQVEsaURBQVU7SUFBakM7O1FBQ2EsaUJBQVksR0FBZSxFQUFFLENBQUM7SUFLM0MsQ0FBQztJQUpHLE9BQU8sQ0FBQyxNQUFpQjtRQUNyQix1REFBdUQ7UUFDdkQsT0FBTyxDQUFDLHFEQUFVLENBQUMsSUFBSSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hGLENBQUM7Q0FDSjtBQUVELE1BQU0sU0FBVSxTQUFRLGlEQUFVO0lBQWxDOztRQUNhLGlCQUFZLEdBQWUsRUFBRSxDQUFDO0lBSzNDLENBQUM7SUFKRyxPQUFPLENBQUMsTUFBaUI7UUFDckIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUM5QixPQUFPLENBQUMscURBQVUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakUsQ0FBQztDQUNKO0FBRUQsTUFBTSxtQkFBb0IsU0FBUSxpREFBVTtJQUE1Qzs7UUFDYSxpQkFBWSxHQUFlLEVBQUUsQ0FBQztJQWtCM0MsQ0FBQztJQWpCRyxPQUFPLENBQUMsTUFBaUI7UUFDckIsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQ2IsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLO1lBQUUsSUFBSSxJQUFJLENBQUMsQ0FBQztRQUNqQyx3RUFBd0U7UUFDeEUsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ1osTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3QyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2QsTUFBTSxJQUFJLEdBQUcsNkRBQWtCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDN0MsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUM7Z0JBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QyxDQUFDO2FBQU0sQ0FBQztZQUNKLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoQyxDQUFDO1FBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzdDLE9BQU8sQ0FBQyxxREFBVSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7Q0FDSjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFRLFNBQVEsaURBQVU7SUFBaEM7O1FBQ2EsaUJBQVksR0FBZSxFQUFFLENBQUM7SUFzQjNDLENBQUM7SUFyQkcsT0FBTyxDQUFDLE1BQWlCO1FBQ3JCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ2hFLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDaEMsT0FBTyxDQUFDLHFEQUFVLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLENBQUM7UUFDRCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRSxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDN0IsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoRCxpREFBaUQ7UUFDakQsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvRSxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLE1BQU0sQ0FBQztRQUNwQyxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEtBQUssQ0FBQztRQUNwQyxNQUFNLEdBQUcsR0FBRyxJQUFJLFlBQVksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM1QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzVCLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDakUsQ0FBQztRQUNMLENBQUM7UUFDRCxPQUFPLENBQUMscURBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pELENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBUSxTQUFRLGlEQUFVO0lBQWhDOztRQUNhLGlCQUFZLEdBQWUsRUFBRSxDQUFDO0lBVTNDLENBQUM7SUFURyxPQUFPLENBQUMsTUFBaUI7UUFDckIsTUFBTSxHQUFHLEdBQUcsSUFBSSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDckMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDbEMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN6RSxDQUFDO1FBQ0wsQ0FBQztRQUNELE9BQU8sQ0FBQyxxREFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuRCxDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQVEsU0FBUSxpREFBVTtJQUFoQzs7UUFDYSxpQkFBWSxHQUFlLEVBQUUsQ0FBQztJQVUzQyxDQUFDO0lBVEcsT0FBTyxDQUFDLE1BQWlCO1FBQ3JCLE1BQU0sR0FBRyxHQUFHLElBQUksWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3JDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ2xDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDekUsQ0FBQztRQUNMLENBQUM7UUFDRCxPQUFPLENBQUMscURBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNKO0FBRU0sU0FBUyxlQUFlLENBQUMsUUFBd0I7SUFDcEQsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdEQsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdEQsUUFBUSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbEUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDaEUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDeEQsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDMUQsUUFBUSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzlFLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RELFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RELFFBQVEsQ0FBQyxRQUFRLENB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LENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUM7WUFDM0IsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO1lBQ2IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLEVBQUU7Z0JBQUUsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzdELElBQUksSUFBSSxTQUFTLENBQUM7WUFDbEIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUNsQyxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QixDQUFDO1lBQ0QsUUFBUSxJQUFJLFNBQVMsQ0FBQztZQUN0QixNQUFNLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2xELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDakMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUM7Z0JBQzdDLElBQUksS0FBSztvQkFBRSxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztn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Q0FBQztJQUNsRCxDQUFDO0lBRUQsT0FBTyxDQUFDLE1BQWlCO1FBQ3JCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFDZixDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUMvQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDdEIsRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDMUQsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQ3RCLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzFELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBRWhDLE1BQU0sR0FBRyxHQUFHLElBQUksWUFB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QUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFCLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDO1FBRTdELElBQUksQ0FBQyxHQUFHLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLElBQUksQ0FBQyxHQUFHLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQ2QsR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDakIsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFFaEMsMkJBQTJCO1FBQzNCLE1BQU0sS0FBSyxHQUFHLElBQUksWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUV0QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDOUIsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQztZQUUzQixrQ0FBa0M7WUFDbEMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNkLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzdCLElBQUksR0FBRyxHQUFHLENBQUMsQ0FB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QyxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDL0QsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDbkUsQ0FBQztnQkFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3pCLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMzQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDL0MsQ0FBQztnQkFDRCxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUNKLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUM5QyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDbEQsQ0FBQztnQkFDRCxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcs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QWE7V0FDN0QsRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDTkEsOEVBQThFO0FBQzlFLHVCQUF1QjtBQUN2QixFQUFFO0FBQ0Ysa0VBQWtFO0FBQ2xFLEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsaURBQWlEO0FBQ2pELGlEQUFpRDtBQUNqRCxpRUFBaUU7QUFDakUsRUFBRTtBQUNGLFdBQVc7QUFDWCxvRUFBb0U7QUFDcEUsK0RBQStEO0FBQy9ELDhFQUE4RTtBQUU5QztBQUNIIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvd2VicGFjay91bml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4uLy4uLy4uL25vZGVfbW9kdWxlcy90c2xpYi90c2xpYi5lczYubWpzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4uL2NvcmUvc3JjL2dlb21ldHJ5L2dlb21ldHJ5LmludGVyZmFjZXMudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi4vY29yZS9zcmMvZ3JhcGgvZ3JhcGguZ3JhcGgudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi4vY29yZS9zcmMvZ3JhcGgvZ3JhcGguZ3JhcGhJdGVtLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4uL2NvcmUvc3JjL2dyYXBoL2dyYXBoLmludGVyZmFjZXMudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi4vY29yZS9zcmMvZ3JhcGgvZ3JhcGgubm9kZS50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uLi9jb3JlL3NyYy9ncmFwaC9ncmFwaC5vbGluay50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9jb21wdXRlL2NvbXB1dGUuZ3JhcGgudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvY29tcHV0ZS9jb21wdXRlLm5vZGUuYmFzZS50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9jb21wdXRlL2luZGV4LnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL2NvbXB1dGUvbm9kZXMvY25uLm5vZGUudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvY29tcHV0ZS9ub2Rlcy9jb25jYXQubm9kZS50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9jb21wdXRlL25vZGVzL2V4dGVybmFsLWlucHV0Lm5vZGUudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvY29tcHV0ZS9ub2Rlcy9pbmRleC50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9jb21wdXRlL25vZGVzL21scC5ub2RlLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL2NvbXB1dGUvbm9kZXMvcm5uLm5vZGUudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvb25ueC9ncmFwaC1idWlsZGVyLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvaW5kZXgudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvb25ueC9vbm54LXBhcnNlci50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L29ubngtdHlwZXMudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvb25ueC9vbm54LXdyaXRlci50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L29wcy9hY3RpdmF0aW9ucy50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L29wcy9jb252LnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvb3BzL2luZGV4LnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvb3BzL21hdGgudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvb25ueC9vcHMvbWF0cml4LnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvb3BzL21pc2MudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvb25ueC9vcHMvbm9ybWFsaXphdGlvbi50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L29wcy9yZWN1cnJlbnQudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvb25ueC9vcHMvc3Bpa3lwYW5kYS50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L3BiL2luZGV4LnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvcGIvcmVhZGVyLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvcGIvc3RyZWFtLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvcGIvd3JpdGVyLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvcmVnaXN0cnkudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gd2VicGFja1VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24ocm9vdCwgZmFjdG9yeSkge1xuXHRpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG5cdGVsc2UgaWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKVxuXHRcdGRlZmluZShbXSwgZmFjdG9yeSk7XG5cdGVsc2UgaWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKVxuXHRcdGV4cG9ydHNbXCJTcGlreXBhbmRhUnVudGltZVwiXSA9IGZhY3RvcnkoKTtcblx0ZWxzZVxuXHRcdHJvb3RbXCJTcGlreXBhbmRhUnVudGltZVwiXSA9IGZhY3RvcnkoKTtcbn0pKGdsb2JhbFRoaXMsICgpID0+IHtcbnJldHVybiAiLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5Db3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi5cblxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XG5wdXJwb3NlIHdpdGggb3Igd2l0aG91dCBmZWUgaXMgaGVyZWJ5IGdyYW50ZWQuXG5cblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcblJFR0FSRCBUTyBUSElTIFNPRlRXQVJFIElOQ0xVRElORyBBTEwgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWVxuQU5EIEZJVE5FU1MuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1IgQkUgTElBQkxFIEZPUiBBTlkgU1BFQ0lBTCwgRElSRUNULFxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXG5MT1NTIE9GIFVTRSwgREFUQSBPUiBQUk9GSVRTLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgTkVHTElHRU5DRSBPUlxuT1RIRVIgVE9SVElPVVMgQUNUSU9OLCBBUklTSU5HIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFVTRSBPUlxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXG4vKiBnbG9iYWwgUmVmbGVjdCwgUHJvbWlzZSwgU3VwcHJlc3NlZEVycm9yLCBTeW1ib2wsIEl0ZXJhdG9yICovXG5cbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xuICBleHRlbmRTdGF0aWNzID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8XG4gICAgICAoeyBfX3Byb3RvX186IFtdIH0gaW5zdGFuY2VvZiBBcnJheSAmJiBmdW5jdGlvbiAoZCwgYikgeyBkLl9fcHJvdG9fXyA9IGI7IH0pIHx8XG4gICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xuICByZXR1cm4gZXh0ZW5kU3RhdGljcyhkLCBiKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2V4dGVuZHMoZCwgYikge1xuICBpZiAodHlwZW9mIGIgIT09IFwiZnVuY3Rpb25cIiAmJiBiICE9PSBudWxsKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xuICBleHRlbmRTdGF0aWNzKGQsIGIpO1xuICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufVxuXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XG4gIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiBfX2Fzc2lnbih0KSB7XG4gICAgICBmb3IgKHZhciBzLCBpID0gMSwgbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSkgdFtwXSA9IHNbcF07XG4gICAgICB9XG4gICAgICByZXR1cm4gdDtcbiAgfVxuICByZXR1cm4gX19hc3NpZ24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVzdChzLCBlKSB7XG4gIHZhciB0ID0ge307XG4gIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSAmJiBlLmluZGV4T2YocCkgPCAwKVxuICAgICAgdFtwXSA9IHNbcF07XG4gIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcbiAgICAgIGZvciAodmFyIGkgPSAwLCBwID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzKTsgaSA8IHAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoZS5pbmRleE9mKHBbaV0pIDwgMCAmJiBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwocywgcFtpXSkpXG4gICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xuICAgICAgfVxuICByZXR1cm4gdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcbiAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcbiAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcbiAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcbiAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XG4gIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX19lc0RlY29yYXRlKGN0b3IsIGRlc2NyaXB0b3JJbiwgZGVjb3JhdG9ycywgY29udGV4dEluLCBpbml0aWFsaXplcnMsIGV4dHJhSW5pdGlhbGl6ZXJzKSB7XG4gIGZ1bmN0aW9uIGFjY2VwdChmKSB7IGlmIChmICE9PSB2b2lkIDAgJiYgdHlwZW9mIGYgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZ1bmN0aW9uIGV4cGVjdGVkXCIpOyByZXR1cm4gZjsgfVxuICB2YXIga2luZCA9IGNvbnRleHRJbi5raW5kLCBrZXkgPSBraW5kID09PSBcImdldHRlclwiID8gXCJnZXRcIiA6IGtpbmQgPT09IFwic2V0dGVyXCIgPyBcInNldFwiIDogXCJ2YWx1ZVwiO1xuICB2YXIgdGFyZ2V0ID0gIWRlc2NyaXB0b3JJbiAmJiBjdG9yID8gY29udGV4dEluW1wic3RhdGljXCJdID8gY3RvciA6IGN0b3IucHJvdG90eXBlIDogbnVsbDtcbiAgdmFyIGRlc2NyaXB0b3IgPSBkZXNjcmlwdG9ySW4gfHwgKHRhcmdldCA/IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBjb250ZXh0SW4ubmFtZSkgOiB7fSk7XG4gIHZhciBfLCBkb25lID0gZmFsc2U7XG4gIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgY29udGV4dCA9IHt9O1xuICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4pIGNvbnRleHRbcF0gPSBwID09PSBcImFjY2Vzc1wiID8ge30gOiBjb250ZXh0SW5bcF07XG4gICAgICBmb3IgKHZhciBwIGluIGNvbnRleHRJbi5hY2Nlc3MpIGNvbnRleHQuYWNjZXNzW3BdID0gY29udGV4dEluLmFjY2Vzc1twXTtcbiAgICAgIGNvbnRleHQuYWRkSW5pdGlhbGl6ZXIgPSBmdW5jdGlvbiAoZikgeyBpZiAoZG9uZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBhZGQgaW5pdGlhbGl6ZXJzIGFmdGVyIGRlY29yYXRpb24gaGFzIGNvbXBsZXRlZFwiKTsgZXh0cmFJbml0aWFsaXplcnMucHVzaChhY2NlcHQoZiB8fCBudWxsKSk7IH07XG4gICAgICB2YXIgcmVzdWx0ID0gKDAsIGRlY29yYXRvcnNbaV0pKGtpbmQgPT09IFwiYWNjZXNzb3JcIiA/IHsgZ2V0OiBkZXNjcmlwdG9yLmdldCwgc2V0OiBkZXNjcmlwdG9yLnNldCB9IDogZGVzY3JpcHRvcltrZXldLCBjb250ZXh0KTtcbiAgICAgIGlmIChraW5kID09PSBcImFjY2Vzc29yXCIpIHtcbiAgICAgICAgICBpZiAocmVzdWx0ID09PSB2b2lkIDApIGNvbnRpbnVlO1xuICAgICAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgdHlwZW9mIHJlc3VsdCAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZFwiKTtcbiAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuZ2V0KSkgZGVzY3JpcHRvci5nZXQgPSBfO1xuICAgICAgICAgIGlmIChfID0gYWNjZXB0KHJlc3VsdC5zZXQpKSBkZXNjcmlwdG9yLnNldCA9IF87XG4gICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmluaXQpKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKF8gPSBhY2NlcHQocmVzdWx0KSkge1xuICAgICAgICAgIGlmIChraW5kID09PSBcImZpZWxkXCIpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xuICAgICAgICAgIGVsc2UgZGVzY3JpcHRvcltrZXldID0gXztcbiAgICAgIH1cbiAgfVxuICBpZiAodGFyZ2V0KSBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBjb250ZXh0SW4ubmFtZSwgZGVzY3JpcHRvcik7XG4gIGRvbmUgPSB0cnVlO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9fcnVuSW5pdGlhbGl6ZXJzKHRoaXNBcmcsIGluaXRpYWxpemVycywgdmFsdWUpIHtcbiAgdmFyIHVzZVZhbHVlID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgaW5pdGlhbGl6ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZSA9IHVzZVZhbHVlID8gaW5pdGlhbGl6ZXJzW2ldLmNhbGwodGhpc0FyZywgdmFsdWUpIDogaW5pdGlhbGl6ZXJzW2ldLmNhbGwodGhpc0FyZyk7XG4gIH1cbiAgcmV0dXJuIHVzZVZhbHVlID8gdmFsdWUgOiB2b2lkIDA7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gX19wcm9wS2V5KHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSBcInN5bWJvbFwiID8geCA6IFwiXCIuY29uY2F0KHgpO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9fc2V0RnVuY3Rpb25OYW1lKGYsIG5hbWUsIHByZWZpeCkge1xuICBpZiAodHlwZW9mIG5hbWUgPT09IFwic3ltYm9sXCIpIG5hbWUgPSBuYW1lLmRlc2NyaXB0aW9uID8gXCJbXCIuY29uY2F0KG5hbWUuZGVzY3JpcHRpb24sIFwiXVwiKSA6IFwiXCI7XG4gIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoZiwgXCJuYW1lXCIsIHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogcHJlZml4ID8gXCJcIi5jb25jYXQocHJlZml4LCBcIiBcIiwgbmFtZSkgOiBuYW1lIH0pO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcbiAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0Lm1ldGFkYXRhID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiBSZWZsZWN0Lm1ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXRlcih0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fZ2VuZXJhdG9yKHRoaXNBcmcsIGJvZHkpIHtcbiAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZyA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBJdGVyYXRvciA9PT0gXCJmdW5jdGlvblwiID8gSXRlcmF0b3IgOiBPYmplY3QpLnByb3RvdHlwZSk7XG4gIHJldHVybiBnLm5leHQgPSB2ZXJiKDApLCBnW1widGhyb3dcIl0gPSB2ZXJiKDEpLCBnW1wicmV0dXJuXCJdID0gdmVyYigyKSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xuICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cbiAgZnVuY3Rpb24gc3RlcChvcCkge1xuICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xuICAgICAgd2hpbGUgKGcgJiYgKGcgPSAwLCBvcFswXSAmJiAoXyA9IDApKSwgXykgdHJ5IHtcbiAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XG4gICAgICAgICAgaWYgKHkgPSAwLCB0KSBvcCA9IFtvcFswXSAmIDIsIHQudmFsdWVdO1xuICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcbiAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgNDogXy5sYWJlbCsrOyByZXR1cm4geyB2YWx1ZTogb3BbMV0sIGRvbmU6IGZhbHNlIH07XG4gICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcbiAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XG4gICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSA2ICYmIF8ubGFiZWwgPCB0WzFdKSB7IF8ubGFiZWwgPSB0WzFdOyB0ID0gb3A7IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XG4gICAgICAgICAgICAgICAgICBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHsgb3AgPSBbNiwgZV07IHkgPSAwOyB9IGZpbmFsbHkgeyBmID0gdCA9IDA7IH1cbiAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xuICB9XG59XG5cbmV4cG9ydCB2YXIgX19jcmVhdGVCaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XG4gIGlmICghZGVzYyB8fCAoXCJnZXRcIiBpbiBkZXNjID8gIW0uX19lc01vZHVsZSA6IGRlc2Mud3JpdGFibGUgfHwgZGVzYy5jb25maWd1cmFibGUpKSB7XG4gICAgICBkZXNjID0geyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9O1xuICB9XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgZGVzYyk7XG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICBvW2syXSA9IG1ba107XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9fZXhwb3J0U3RhcihtLCBvKSB7XG4gIGZvciAodmFyIHAgaW4gbSkgaWYgKHAgIT09IFwiZGVmYXVsdFwiICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgcCkpIF9fY3JlYXRlQmluZGluZyhvLCBtLCBwKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fdmFsdWVzKG8pIHtcbiAgdmFyIHMgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgU3ltYm9sLml0ZXJhdG9yLCBtID0gcyAmJiBvW3NdLCBpID0gMDtcbiAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XG4gIGlmIChvICYmIHR5cGVvZiBvLmxlbmd0aCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHtcbiAgICAgIG5leHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAobyAmJiBpID49IG8ubGVuZ3RoKSBvID0gdm9pZCAwO1xuICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBvICYmIG9baSsrXSwgZG9uZTogIW8gfTtcbiAgICAgIH1cbiAgfTtcbiAgdGhyb3cgbmV3IFR5cGVFcnJvcihzID8gXCJPYmplY3QgaXMgbm90IGl0ZXJhYmxlLlwiIDogXCJTeW1ib2wuaXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19yZWFkKG8sIG4pIHtcbiAgdmFyIG0gPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb1tTeW1ib2wuaXRlcmF0b3JdO1xuICBpZiAoIW0pIHJldHVybiBvO1xuICB2YXIgaSA9IG0uY2FsbChvKSwgciwgYXIgPSBbXSwgZTtcbiAgdHJ5IHtcbiAgICAgIHdoaWxlICgobiA9PT0gdm9pZCAwIHx8IG4tLSA+IDApICYmICEociA9IGkubmV4dCgpKS5kb25lKSBhci5wdXNoKHIudmFsdWUpO1xuICB9XG4gIGNhdGNoIChlcnJvcikgeyBlID0geyBlcnJvcjogZXJyb3IgfTsgfVxuICBmaW5hbGx5IHtcbiAgICAgIHRyeSB7XG4gICAgICAgICAgaWYgKHIgJiYgIXIuZG9uZSAmJiAobSA9IGlbXCJyZXR1cm5cIl0pKSBtLmNhbGwoaSk7XG4gICAgICB9XG4gICAgICBmaW5hbGx5IHsgaWYgKGUpIHRocm93IGUuZXJyb3I7IH1cbiAgfVxuICByZXR1cm4gYXI7XG59XG5cbi8qKiBAZGVwcmVjYXRlZCAqL1xuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkKCkge1xuICBmb3IgKHZhciBhciA9IFtdLCBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKylcbiAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcbiAgcmV0dXJuIGFyO1xufVxuXG4vKiogQGRlcHJlY2F0ZWQgKi9cbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5cygpIHtcbiAgZm9yICh2YXIgcyA9IDAsIGkgPSAwLCBpbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBpbDsgaSsrKSBzICs9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XG4gIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcbiAgICAgIGZvciAodmFyIGEgPSBhcmd1bWVudHNbaV0sIGogPSAwLCBqbCA9IGEubGVuZ3RoOyBqIDwgamw7IGorKywgaysrKVxuICAgICAgICAgIHJba10gPSBhW2pdO1xuICByZXR1cm4gcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXkodG8sIGZyb20sIHBhY2spIHtcbiAgaWYgKHBhY2sgfHwgYXJndW1lbnRzLmxlbmd0aCA9PT0gMikgZm9yICh2YXIgaSA9IDAsIGwgPSBmcm9tLmxlbmd0aCwgYXI7IGkgPCBsOyBpKyspIHtcbiAgICAgIGlmIChhciB8fCAhKGkgaW4gZnJvbSkpIHtcbiAgICAgICAgICBpZiAoIWFyKSBhciA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20sIDAsIGkpO1xuICAgICAgICAgIGFyW2ldID0gZnJvbVtpXTtcbiAgICAgIH1cbiAgfVxuICByZXR1cm4gdG8uY29uY2F0KGFyIHx8IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20pKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xuICByZXR1cm4gdGhpcyBpbnN0YW5jZW9mIF9fYXdhaXQgPyAodGhpcy52ID0gdiwgdGhpcykgOiBuZXcgX19hd2FpdCh2KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNHZW5lcmF0b3IodGhpc0FyZywgX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSB7XG4gIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XG4gIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XG4gIHJldHVybiBpID0gT2JqZWN0LmNyZWF0ZSgodHlwZW9mIEFzeW5jSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEFzeW5jSXRlcmF0b3IgOiBPYmplY3QpLnByb3RvdHlwZSksIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiwgYXdhaXRSZXR1cm4pLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XG4gIGZ1bmN0aW9uIGF3YWl0UmV0dXJuKGYpIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBQcm9taXNlLnJlc29sdmUodikudGhlbihmLCByZWplY3QpOyB9OyB9XG4gIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpZiAoZ1tuXSkgeyBpW25dID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7IHEucHVzaChbbiwgdiwgYSwgYl0pID4gMSB8fCByZXN1bWUobiwgdik7IH0pOyB9OyBpZiAoZikgaVtuXSA9IGYoaVtuXSk7IH0gfVxuICBmdW5jdGlvbiByZXN1bWUobiwgdikgeyB0cnkgeyBzdGVwKGdbbl0odikpOyB9IGNhdGNoIChlKSB7IHNldHRsZShxWzBdWzNdLCBlKTsgfSB9XG4gIGZ1bmN0aW9uIHN0ZXAocikgeyByLnZhbHVlIGluc3RhbmNlb2YgX19hd2FpdCA/IFByb21pc2UucmVzb2x2ZShyLnZhbHVlLnYpLnRoZW4oZnVsZmlsbCwgcmVqZWN0KSA6IHNldHRsZShxWzBdWzJdLCByKTsgfVxuICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XG4gIGZ1bmN0aW9uIHJlamVjdCh2YWx1ZSkgeyByZXN1bWUoXCJ0aHJvd1wiLCB2YWx1ZSk7IH1cbiAgZnVuY3Rpb24gc2V0dGxlKGYsIHYpIHsgaWYgKGYodiksIHEuc2hpZnQoKSwgcS5sZW5ndGgpIHJlc3VtZShxWzBdWzBdLCBxWzBdWzFdKTsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0RlbGVnYXRvcihvKSB7XG4gIHZhciBpLCBwO1xuICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIsIGZ1bmN0aW9uIChlKSB7IHRocm93IGU7IH0pLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xuICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaVtuXSA9IG9bbl0gPyBmdW5jdGlvbiAodikgeyByZXR1cm4gKHAgPSAhcCkgPyB7IHZhbHVlOiBfX2F3YWl0KG9bbl0odikpLCBkb25lOiBmYWxzZSB9IDogZiA/IGYodikgOiB2OyB9IDogZjsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY1ZhbHVlcyhvKSB7XG4gIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XG4gIHZhciBtID0gb1tTeW1ib2wuYXN5bmNJdGVyYXRvcl0sIGk7XG4gIHJldHVybiBtID8gbS5jYWxsKG8pIDogKG8gPSB0eXBlb2YgX192YWx1ZXMgPT09IFwiZnVuY3Rpb25cIiA/IF9fdmFsdWVzKG8pIDogb1tTeW1ib2wuaXRlcmF0b3JdKCksIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpKTtcbiAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxuICBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCBkLCB2KSB7IFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGZ1bmN0aW9uKHYpIHsgcmVzb2x2ZSh7IHZhbHVlOiB2LCBkb25lOiBkIH0pOyB9LCByZWplY3QpOyB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX21ha2VUZW1wbGF0ZU9iamVjdChjb29rZWQsIHJhdykge1xuICBpZiAoT2JqZWN0LmRlZmluZVByb3BlcnR5KSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb29rZWQsIFwicmF3XCIsIHsgdmFsdWU6IHJhdyB9KTsgfSBlbHNlIHsgY29va2VkLnJhdyA9IHJhdzsgfVxuICByZXR1cm4gY29va2VkO1xufTtcblxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcbiAgb1tcImRlZmF1bHRcIl0gPSB2O1xufTtcblxudmFyIG93bktleXMgPSBmdW5jdGlvbihvKSB7XG4gIG93bktleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyB8fCBmdW5jdGlvbiAobykge1xuICAgIHZhciBhciA9IFtdO1xuICAgIGZvciAodmFyIGsgaW4gbykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvLCBrKSkgYXJbYXIubGVuZ3RoXSA9IGs7XG4gICAgcmV0dXJuIGFyO1xuICB9O1xuICByZXR1cm4gb3duS2V5cyhvKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XG4gIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XG4gIHZhciByZXN1bHQgPSB7fTtcbiAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrID0gb3duS2V5cyhtb2QpLCBpID0gMDsgaSA8IGsubGVuZ3RoOyBpKyspIGlmIChrW2ldICE9PSBcImRlZmF1bHRcIikgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrW2ldKTtcbiAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0RGVmYXVsdChtb2QpIHtcbiAgcmV0dXJuIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpID8gbW9kIDogeyBkZWZhdWx0OiBtb2QgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRHZXQocmVjZWl2ZXIsIHN0YXRlLCBraW5kLCBmKSB7XG4gIGlmIChraW5kID09PSBcImFcIiAmJiAhZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgYWNjZXNzb3Igd2FzIGRlZmluZWQgd2l0aG91dCBhIGdldHRlclwiKTtcbiAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgcmVhZCBwcml2YXRlIG1lbWJlciBmcm9tIGFuIG9iamVjdCB3aG9zZSBjbGFzcyBkaWQgbm90IGRlY2xhcmUgaXRcIik7XG4gIHJldHVybiBraW5kID09PSBcIm1cIiA/IGYgOiBraW5kID09PSBcImFcIiA/IGYuY2FsbChyZWNlaXZlcikgOiBmID8gZi52YWx1ZSA6IHN0YXRlLmdldChyZWNlaXZlcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0KHJlY2VpdmVyLCBzdGF0ZSwgdmFsdWUsIGtpbmQsIGYpIHtcbiAgaWYgKGtpbmQgPT09IFwibVwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBtZXRob2QgaXMgbm90IHdyaXRhYmxlXCIpO1xuICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBzZXR0ZXJcIik7XG4gIGlmICh0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyICE9PSBzdGF0ZSB8fCAhZiA6ICFzdGF0ZS5oYXMocmVjZWl2ZXIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHdyaXRlIHByaXZhdGUgbWVtYmVyIHRvIGFuIG9iamVjdCB3aG9zZSBjbGFzcyBkaWQgbm90IGRlY2xhcmUgaXRcIik7XG4gIHJldHVybiAoa2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIsIHZhbHVlKSA6IGYgPyBmLnZhbHVlID0gdmFsdWUgOiBzdGF0ZS5zZXQocmVjZWl2ZXIsIHZhbHVlKSksIHZhbHVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEluKHN0YXRlLCByZWNlaXZlcikge1xuICBpZiAocmVjZWl2ZXIgPT09IG51bGwgfHwgKHR5cGVvZiByZWNlaXZlciAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgcmVjZWl2ZXIgIT09IFwiZnVuY3Rpb25cIikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgdXNlICdpbicgb3BlcmF0b3Igb24gbm9uLW9iamVjdFwiKTtcbiAgcmV0dXJuIHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgPT09IHN0YXRlIDogc3RhdGUuaGFzKHJlY2VpdmVyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fYWRkRGlzcG9zYWJsZVJlc291cmNlKGVudiwgdmFsdWUsIGFzeW5jKSB7XG4gIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdm9pZCAwKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZC5cIik7XG4gICAgdmFyIGRpc3Bvc2UsIGlubmVyO1xuICAgIGlmIChhc3luYykge1xuICAgICAgaWYgKCFTeW1ib2wuYXN5bmNEaXNwb3NlKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jRGlzcG9zZSBpcyBub3QgZGVmaW5lZC5cIik7XG4gICAgICBkaXNwb3NlID0gdmFsdWVbU3ltYm9sLmFzeW5jRGlzcG9zZV07XG4gICAgfVxuICAgIGlmIChkaXNwb3NlID09PSB2b2lkIDApIHtcbiAgICAgIGlmICghU3ltYm9sLmRpc3Bvc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuZGlzcG9zZSBpcyBub3QgZGVmaW5lZC5cIik7XG4gICAgICBkaXNwb3NlID0gdmFsdWVbU3ltYm9sLmRpc3Bvc2VdO1xuICAgICAgaWYgKGFzeW5jKSBpbm5lciA9IGRpc3Bvc2U7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZGlzcG9zZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IG5vdCBkaXNwb3NhYmxlLlwiKTtcbiAgICBpZiAoaW5uZXIpIGRpc3Bvc2UgPSBmdW5jdGlvbigpIHsgdHJ5IHsgaW5uZXIuY2FsbCh0aGlzKTsgfSBjYXRjaCAoZSkgeyByZXR1cm4gUHJvbWlzZS5yZWplY3QoZSk7IH0gfTtcbiAgICBlbnYuc3RhY2sucHVzaCh7IHZhbHVlOiB2YWx1ZSwgZGlzcG9zZTogZGlzcG9zZSwgYXN5bmM6IGFzeW5jIH0pO1xuICB9XG4gIGVsc2UgaWYgKGFzeW5jKSB7XG4gICAgZW52LnN0YWNrLnB1c2goeyBhc3luYzogdHJ1ZSB9KTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbnZhciBfU3VwcHJlc3NlZEVycm9yID0gdHlwZW9mIFN1cHByZXNzZWRFcnJvciA9PT0gXCJmdW5jdGlvblwiID8gU3VwcHJlc3NlZEVycm9yIDogZnVuY3Rpb24gKGVycm9yLCBzdXBwcmVzc2VkLCBtZXNzYWdlKSB7XG4gIHZhciBlID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICByZXR1cm4gZS5uYW1lID0gXCJTdXBwcmVzc2VkRXJyb3JcIiwgZS5lcnJvciA9IGVycm9yLCBlLnN1cHByZXNzZWQgPSBzdXBwcmVzc2VkLCBlO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9fZGlzcG9zZVJlc291cmNlcyhlbnYpIHtcbiAgZnVuY3Rpb24gZmFpbChlKSB7XG4gICAgZW52LmVycm9yID0gZW52Lmhhc0Vycm9yID8gbmV3IF9TdXBwcmVzc2VkRXJyb3IoZSwgZW52LmVycm9yLCBcIkFuIGVycm9yIHdhcyBzdXBwcmVzc2VkIGR1cmluZyBkaXNwb3NhbC5cIikgOiBlO1xuICAgIGVudi5oYXNFcnJvciA9IHRydWU7XG4gIH1cbiAgdmFyIHIsIHMgPSAwO1xuICBmdW5jdGlvbiBuZXh0KCkge1xuICAgIHdoaWxlIChyID0gZW52LnN0YWNrLnBvcCgpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoIXIuYXN5bmMgJiYgcyA9PT0gMSkgcmV0dXJuIHMgPSAwLCBlbnYuc3RhY2sucHVzaChyKSwgUHJvbWlzZS5yZXNvbHZlKCkudGhlbihuZXh0KTtcbiAgICAgICAgaWYgKHIuZGlzcG9zZSkge1xuICAgICAgICAgIHZhciByZXN1bHQgPSByLmRpc3Bvc2UuY2FsbChyLnZhbHVlKTtcbiAgICAgICAgICBpZiAoci5hc3luYykgcmV0dXJuIHMgfD0gMiwgUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCkudGhlbihuZXh0LCBmdW5jdGlvbihlKSB7IGZhaWwoZSk7IHJldHVybiBuZXh0KCk7IH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgcyB8PSAxO1xuICAgICAgfVxuICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgZmFpbChlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHMgPT09IDEpIHJldHVybiBlbnYuaGFzRXJyb3IgPyBQcm9taXNlLnJlamVjdChlbnYuZXJyb3IpIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgaWYgKGVudi5oYXNFcnJvcikgdGhyb3cgZW52LmVycm9yO1xuICB9XG4gIHJldHVybiBuZXh0KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3Jld3JpdGVSZWxhdGl2ZUltcG9ydEV4dGVuc2lvbihwYXRoLCBwcmVzZXJ2ZUpzeCkge1xuICBpZiAodHlwZW9mIHBhdGggPT09IFwic3RyaW5nXCIgJiYgL15cXC5cXC4/XFwvLy50ZXN0KHBhdGgpKSB7XG4gICAgICByZXR1cm4gcGF0aC5yZXBsYWNlKC9cXC4odHN4KSR8KCg/OlxcLmQpPykoKD86XFwuW14uL10rPyk/KVxcLihbY21dPyl0cyQvaSwgZnVuY3Rpb24gKG0sIHRzeCwgZCwgZXh0LCBjbSkge1xuICAgICAgICAgIHJldHVybiB0c3ggPyBwcmVzZXJ2ZUpzeCA/IFwiLmpzeFwiIDogXCIuanNcIiA6IGQgJiYgKCFleHQgfHwgIWNtKSA/IG0gOiAoZCArIGV4dCArIFwiLlwiICsgY20udG9Mb3dlckNhc2UoKSArIFwianNcIik7XG4gICAgICB9KTtcbiAgfVxuICByZXR1cm4gcGF0aDtcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuICBfX2V4dGVuZHMsXG4gIF9fYXNzaWduLFxuICBfX3Jlc3QsXG4gIF9fZGVjb3JhdGUsXG4gIF9fcGFyYW0sXG4gIF9fZXNEZWNvcmF0ZSxcbiAgX19ydW5Jbml0aWFsaXplcnMsXG4gIF9fcHJvcEtleSxcbiAgX19zZXRGdW5jdGlvbk5hbWUsXG4gIF9fbWV0YWRhdGEsXG4gIF9fYXdhaXRlcixcbiAgX19nZW5lcmF0b3IsXG4gIF9fY3JlYXRlQmluZGluZyxcbiAgX19leHBvcnRTdGFyLFxuICBfX3ZhbHVlcyxcbiAgX19yZWFkLFxuICBfX3NwcmVhZCxcbiAgX19zcHJlYWRBcnJheXMsXG4gIF9fc3ByZWFkQXJyYXksXG4gIF9fYXdhaXQsXG4gIF9fYXN5bmNHZW5lcmF0b3IsXG4gIF9fYXN5bmNEZWxlZ2F0b3IsXG4gIF9fYXN5bmNWYWx1ZXMsXG4gIF9fbWFrZVRlbXBsYXRlT2JqZWN0LFxuICBfX2ltcG9ydFN0YXIsXG4gIF9faW1wb3J0RGVmYXVsdCxcbiAgX19jbGFzc1ByaXZhdGVGaWVsZEdldCxcbiAgX19jbGFzc1ByaXZhdGVGaWVsZFNldCxcbiAgX19jbGFzc1ByaXZhdGVGaWVsZEluLFxuICBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZSxcbiAgX19kaXNwb3NlUmVzb3VyY2VzLFxuICBfX3Jld3JpdGVSZWxhdGl2ZUltcG9ydEV4dGVuc2lvbixcbn07XG4iLCJleHBvcnQgaW50ZXJmYWNlIElDYXJ0ZXNpYW4ge1xyXG4gICAgLyoqIEV1Y2xpZGVhbiBkaXN0YW5jZSB0byBhbm90aGVyIHBvaW50LiAqL1xyXG4gICAgZGlzdGFuY2UoYjogSUNhcnRlc2lhbik6IG51bWJlcjtcclxuICAgIC8qKiBTcXVhcmVkIGV1Y2xpZGVhbiBkaXN0YW5jZSAoYXZvaWRzIHNxcnQpLiBQcmVmZXJyZWQgZm9yIGNvbXBhcmlzb24tb25seSB1c2UgY2FzZXMuICovXHJcbiAgICBkaXN0YW5jZVNxdWFyZWQoYjogSUNhcnRlc2lhbik6IG51bWJlcjtcclxuICAgIHN1YnRyYWN0KGI6IElDYXJ0ZXNpYW4pOiB0aGlzO1xyXG4gICAgYWRkKGI6IElDYXJ0ZXNpYW4pOiB0aGlzO1xyXG4gICAgYWRkSW5QbGFjZShiOiBJQ2FydGVzaWFuKTogdGhpcztcclxuICAgIG11bHRpcGx5QnlTY2FsYXIobjogbnVtYmVyKTogdGhpcztcclxuICAgIGRpdmlkZUJ5U2NhbGFyKG46IG51bWJlcik6IHRoaXM7XHJcbiAgICBtYWduaXR1ZGUoKTogbnVtYmVyO1xyXG4gICAgdG9TdHJpbmcoKTogc3RyaW5nO1xyXG4gICAgY2xvbmUoKTogdGhpcztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJQ2FydGVzaWFuMiBleHRlbmRzIElDYXJ0ZXNpYW4ge1xyXG4gICAgeDogbnVtYmVyO1xyXG4gICAgeTogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElDYXJ0ZXNpYW4zIGV4dGVuZHMgSUNhcnRlc2lhbjIge1xyXG4gICAgejogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElDYXJ0ZXNpYW40IGV4dGVuZHMgSUNhcnRlc2lhbjMge1xyXG4gICAgdzogbnVtYmVyO1xyXG59XHJcblxyXG4vKipcclxuICogVHlwZSBndWFyZCBmb3IgSUNhcnRlc2lhbiAoSUNhcnRlc2lhbjIgfCBJQ2FydGVzaWFuMyB8IElDYXJ0ZXNpYW40KVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzQ2FydGVzaWFuKG9iajogdW5rbm93bik6IG9iaiBpcyBJQ2FydGVzaWFuIHtcclxuICAgIHJldHVybiBpc0NhcnRlc2lhbjIob2JqKSB8fCBpc0NhcnRlc2lhbjMob2JqKSB8fCBpc0NhcnRlc2lhbjQob2JqKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFR5cGUgZ3VhcmQgZm9yIElDYXJ0ZXNpYW4yXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNDYXJ0ZXNpYW4yKGI6IHVua25vd24pOiBiIGlzIElDYXJ0ZXNpYW4yIHwgSUNhcnRlc2lhbjMgfCBJQ2FydGVzaWFuNCB7XHJcbiAgICBpZiAodHlwZW9mIGIgIT09IFwib2JqZWN0XCIgfHwgYiA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgcmV0dXJuIFwieFwiIGluIGIgJiYgXCJ5XCIgaW4gYjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFR5cGUgZ3VhcmQgZm9yIElDYXJ0ZXNpYW4zXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNDYXJ0ZXNpYW4zKGI6IHVua25vd24pOiBiIGlzIElDYXJ0ZXNpYW4zIHwgSUNhcnRlc2lhbjQge1xyXG4gICAgaWYgKCFpc0NhcnRlc2lhbjIoYikpIHJldHVybiBmYWxzZTtcclxuICAgIHJldHVybiBcInpcIiBpbiBiO1xyXG59XHJcblxyXG4vKipcclxuICogVHlwZSBndWFyZCBmb3IgSUNhcnRlc2lhbjRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc0NhcnRlc2lhbjQoYjogdW5rbm93bik6IGIgaXMgSUNhcnRlc2lhbjQge1xyXG4gICAgaWYgKCFpc0NhcnRlc2lhbjMoYikpIHJldHVybiBmYWxzZTtcclxuICAgIHJldHVybiBcIndcIiBpbiBiO1xyXG59XHJcbiIsImltcG9ydCB7IElDYXJ0ZXNpYW4gfSBmcm9tIFwiLi4vZ2VvbWV0cnlcIjtcclxuaW1wb3J0IHsgTnVsbGFibGUgfSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgSUdyYXBoLCBJTm9kZSwgSU9saW5rIH0gZnJvbSBcIi4vZ3JhcGguaW50ZXJmYWNlc1wiO1xyXG5pbXBvcnQgeyBHcmFwaE5vZGUgfSBmcm9tIFwiLi9ncmFwaC5ub2RlXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgR3JhcGg8TiBleHRlbmRzIElOb2RlLCBMIGV4dGVuZHMgSU9saW5rPiBleHRlbmRzIEdyYXBoTm9kZSBpbXBsZW1lbnRzIElHcmFwaDxOLCBMPiB7XHJcbiAgICBwdWJsaWMgbm9kZXM6IE5bXTtcclxuICAgIHB1YmxpYyBsaW5rczogTFtdO1xyXG4gICAgcHVibGljIGlucHV0czogTltdO1xyXG4gICAgcHVibGljIG91dHB1dHM6IE5bXTtcclxuICAgIHB1YmxpYyBoaWRkZW5zOiBOW107XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIG5vZGVzOiBOW10gPSBbXSxcclxuICAgICAgICBsaW5rczogTFtdID0gW10sXHJcbiAgICAgICAgaW5wdXRzOiBOdWxsYWJsZTxOW10+ID0gbnVsbCxcclxuICAgICAgICBvdXRwdXRzOiBOdWxsYWJsZTxOW10+ID0gbnVsbCxcclxuICAgICAgICBoaWRkZW5zOiBOdWxsYWJsZTxOW10+ID0gbnVsbCxcclxuICAgICAgICBvbnNjOiBOdWxsYWJsZTxMW10+ID0gbnVsbCxcclxuICAgICAgICBvcHNjOiBOdWxsYWJsZTxMW10+ID0gbnVsbCxcclxuICAgICAgICBwb3NpdGlvbj86IElDYXJ0ZXNpYW5cclxuICAgICkge1xyXG4gICAgICAgIHN1cGVyKG9uc2MsIG9wc2MsIHBvc2l0aW9uKTsgLy8gUGFzcyBgcG9zaXRpb25gIHRvIGBHcmFwaE5vZGVgXHJcbiAgICAgICAgdGhpcy5ub2RlcyA9IG5vZGVzO1xyXG4gICAgICAgIHRoaXMubGlua3MgPSBsaW5rcztcclxuICAgICAgICB0aGlzLmlucHV0cyA9IGlucHV0cyA/PyB0aGlzLm5vZGVzLmZpbHRlcigobikgPT4gbi5vcHNjKCkubGVuZ3RoID09PSAwKTtcclxuICAgICAgICB0aGlzLm91dHB1dHMgPSBvdXRwdXRzID8/IHRoaXMubm9kZXMuZmlsdGVyKChuKSA9PiBuLm9uc2MoKS5sZW5ndGggPT09IDApO1xyXG4gICAgICAgIHRoaXMuaGlkZGVucyA9IGhpZGRlbnMgPz8gdGhpcy5ub2Rlcy5maWx0ZXIoKG4pID0+ICF0aGlzLmlucHV0cy5pbmNsdWRlcyhuKSAmJiAhdGhpcy5vdXRwdXRzLmluY2x1ZGVzKG4pKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgY2xvbmUoKTogYW55IHtcclxuICAgICAgICB2YXIgY29weSA9IHN1cGVyLmNsb25lKCk7XHJcbiAgICAgICAgY29weS5ub2RlcyA9IHRoaXMubm9kZXMubWFwKChuKSA9PiBuLmNsb25lKCkpO1xyXG4gICAgICAgIGNvcHkubGlua3MgPSB0aGlzLmxpbmtzLm1hcCgobCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBjbG9uZWQgPSBsLmNsb25lKCk7XHJcbiAgICAgICAgICAgIGNsb25lZC5vaW5pID0gY29weS5ub2Rlc1t0aGlzLm5vZGVzLmluZGV4T2YoPE4+bC5vaW5pKV07IC8vIHRoZSB1bmRlcmx5aW5nIHNldHRlciBpcyB0YWtpbmcgY2FyZSBvZiB1bmJpbmQvYmluZCB0aGUgbGluayBmcm9tL3RvIG5vZGVcclxuICAgICAgICAgICAgY2xvbmVkLm9maW4gPSBjb3B5Lm5vZGVzW3RoaXMubm9kZXMuaW5kZXhPZig8Tj5sLm9maW4pXTsgLy8gLi4uXHJcbiAgICAgICAgICAgIHJldHVybiBjbG9uZWQ7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvcHkuaW5wdXRzID0gY29weS5ub2Rlcy5maWx0ZXIoKG4pID0+IG4ub3BzYygpLmxlbmd0aCA9PT0gMCk7XHJcbiAgICAgICAgY29weS5vdXRwdXRzID0gY29weS5ub2Rlcy5maWx0ZXIoKG4pID0+IG4ub25zYygpLmxlbmd0aCA9PT0gMCk7XHJcbiAgICAgICAgY29weS5oaWRkZW5zID0gY29weS5ub2Rlcy5maWx0ZXIoKG4pID0+ICFjb3B5LmlucHV0cy5pbmNsdWRlcyhuKSAmJiAhY29weS5vdXRwdXRzLmluY2x1ZGVzKG4pKTtcclxuICAgICAgICByZXR1cm4gY29weTtcclxuICAgIH1cclxufVxyXG4iLCJpbXBvcnQgeyBDbG9uZU1ldGFkYXRhS2V5LCBJR3JhcGhJdGVtLCBJc0Nsb25lYWJsZSwgSVRhZ2dhYmxlIH0gZnJvbSBcIi4vZ3JhcGguaW50ZXJmYWNlc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEdyYXBoSXRlbSBpbXBsZW1lbnRzIElHcmFwaEl0ZW0ge1xyXG4gICAgcHJpdmF0ZSBfaWQ/OmFueTtcclxuICAgIHByaXZhdGUgX3RhZz86IHN0cmluZztcclxuICAgIHByaXZhdGUgX2JhZz86IHVua25vd247XHJcblxyXG4gICAgcHVibGljIGdldCB0YWcoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fdGFnO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgaWQoKSA6IGFueSB8IHVuZGVmaW5lZHtcclxuICAgICAgICByZXR1cm4gdGhpcy5faWQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBpZCh2OmFueSkge1xyXG4gICAgICAgIHRoaXMuX2lkID0gdjtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGJhZygpIDogdW5rbm93biB8IHVuZGVmaW5lZHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fYmFnO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgYmFnKHY6dW5rbm93bikge1xyXG4gICAgICAgIHRoaXMuX2JhZyA9IHY7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHdpdGhUYWcodGFnOiBzdHJpbmcpOiBJVGFnZ2FibGUge1xyXG4gICAgICAgIHRoaXMuX3RhZyA9IHRhZztcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZGlzcG9zZSgpOiB2b2lkIHtcclxuICAgICAgICAvLyBEaXNwb3NlIGxvZ2ljIGlmIG5lZWRlZFxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBjbG9uZSgpOiB0aGlzIHtcclxuICAgICAgICBjb25zdCBjdG9yID0gdGhpcy5jb25zdHJ1Y3RvciBhcyBuZXcgKCkgPT4gdGhpcztcclxuICAgICAgICBjb25zdCBjbG9uZSA9IG5ldyBjdG9yKCk7XHJcbiAgICAgICAgY29uc3QgcHJvcHMgPSBSZWZsZWN0LmdldE1ldGFkYXRhKENsb25lTWV0YWRhdGFLZXksIHRoaXMpIHx8IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBwcm9wcykge1xyXG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICh0aGlzIGFzIGFueSlba2V5XTtcclxuICAgICAgICAgICAgKGNsb25lIGFzIGFueSlba2V5XSA9IElzQ2xvbmVhYmxlKHZhbHVlKSA/IHZhbHVlLmNsb25lKCkgOiBzdHJ1Y3R1cmVkQ2xvbmUodmFsdWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGNsb25lO1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCB7IElDYXJ0ZXNpYW4sIGlzQ2FydGVzaWFuIH0gZnJvbSBcIi4uL2dlb21ldHJ5L2dlb21ldHJ5LmludGVyZmFjZXNcIjtcclxuaW1wb3J0IHsgTnVsbGFibGUgfSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuXHJcbmV4cG9ydCBjb25zdCBDbG9uZU1ldGFkYXRhS2V5ID0gU3ltYm9sKFwiY2xvbmVhYmxlXCIpO1xyXG5cclxuLy8vIDxzdW1tYXJ5PlxyXG4vLy8gTWFya3MgYSBwcm9wZXJ0eSBhcyBjbG9uZWFibGUgZm9yIGF1dG9tYXRpYyBkZWVwIGNvcHlpbmdcclxuLy8vIDwvc3VtbWFyeT5cclxuZXhwb3J0IGZ1bmN0aW9uIGNsb25lYWJsZSh0YXJnZXQ6IG9iamVjdCwgcHJvcGVydHlLZXk6IHN0cmluZyB8IHN5bWJvbCk6IHZvaWQge1xyXG4gICAgY29uc3QgcHJvdG8gPSB0YXJnZXQuY29uc3RydWN0b3IucHJvdG90eXBlO1xyXG4gICAgY29uc3QgZXhpc3RpbmdQcm9wczogc3RyaW5nW10gPSBSZWZsZWN0LmdldE1ldGFkYXRhKENsb25lTWV0YWRhdGFLZXksIHByb3RvKSB8fCBbXTtcclxuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoQ2xvbmVNZXRhZGF0YUtleSwgWy4uLmV4aXN0aW5nUHJvcHMsIHByb3BlcnR5S2V5XSwgcHJvdG8pO1xyXG59XHJcblxyXG4vLy8gPHN1bW1hcnk+XHJcbi8vLyBJbnRlcmZhY2UgZm9yIGNsb25lYWJsZSBvYmplY3RzXHJcbi8vLyA8L3N1bW1hcnk+XHJcbmV4cG9ydCBpbnRlcmZhY2UgSUNsb25lYWJsZTxUID0gYW55PiB7XHJcbiAgICBjbG9uZSgpOiBUO1xyXG59XHJcblxyXG4vLy8gPHN1bW1hcnk+XHJcbi8vLyBUeXBlIGd1YXJkIHRvIGNoZWNrIGlmIGFuIG9iamVjdCBpbXBsZW1lbnRzIElDbG9uZWFibGVcclxuLy8vIDwvc3VtbWFyeT5cclxuZXhwb3J0IGZ1bmN0aW9uIElzQ2xvbmVhYmxlPFQ+KG9iajogYW55KTogb2JqIGlzIElDbG9uZWFibGU8VD4ge1xyXG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09IFwib2JqZWN0XCIgJiYgb2JqICE9PSBudWxsICYmIHR5cGVvZiBvYmouY2xvbmUgPT09IFwiZnVuY3Rpb25cIjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJRGlzcG9zYWJsZSB7XHJcbiAgICBkaXNwb3NlKCk6IHZvaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVRhZ2dhYmxlIHtcclxuICAgIHdpdGhUYWcodGFnOiBzdHJpbmcpOiBJVGFnZ2FibGU7XHJcbiAgICB0YWc/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUlEZW50aWZpYWJsZSB7XHJcbiAgICBpZD86IGFueTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJSGFzQmFnIHtcclxuICAgIC8qKlxyXG4gICAgICogUnVudGltZS1vbmx5IGNvbnRhaW5lciBmb3IgZXhlY3V0aW9uIGNvbnRleHQuXHJcbiAgICAgKiBDYW4gYmUgc2FmZWx5IG92ZXJ3cml0dGVuIGJldHdlZW4gcnVucy5cclxuICAgICAqL1xyXG4gICAgYmFnPzogdW5rbm93bjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJR3JhcGhJdGVtIGV4dGVuZHMgSURpc3Bvc2FibGUsIElDbG9uZWFibGUsIElUYWdnYWJsZSwgSUlEZW50aWZpYWJsZSwgSUhhc0JhZyB7fVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJTm9kZSBleHRlbmRzIElHcmFwaEl0ZW0ge1xyXG4gICAgcG9zaXRpb24/OiBJQ2FydGVzaWFuO1xyXG4gICAgb25zYzxMIGV4dGVuZHMgSU9saW5rPigpOiBBcnJheTxMPjtcclxuICAgIG9wc2M8TCBleHRlbmRzIElPbGluaz4oKTogQXJyYXk8TD47XHJcbn1cclxuXHJcbi8vIHdlIGRlZmluZSB0aGUgSU5vZGVTZXQgYW5kIElMaW5rU2V0IGludGVyZmFjZXMgdG8gYmUgYWJsZSB0byB1c2UgdGhlbSB0byBncm91cCBub2RlcyBhbmQgbGlua3NcclxuLy8gdGhpcyBpcyBwYXJ0aWN1bGFybHkgdXNlZnVsIHdoZW4gd2Ugd2FudCB0byBwZXJmb3JtIG9wZXJhdGlvbnMgb24gYSBncm91cCBzdWNoIExheWVycyBpbiBOZXVyYWwgTmV0d29ya3NcclxuLy8gb3IgYXR0YWNoIHNwZWNpZmljIHByb3BlcnRpZXMgdG8gYSBncm91cCBvZiBub2RlcyBvciBsaW5rcy5cclxuZXhwb3J0IGludGVyZmFjZSBJTm9kZVNldDxOIGV4dGVuZHMgSU5vZGU+IGV4dGVuZHMgQXJyYXk8Tj4ge31cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSU9saW5rIGV4dGVuZHMgSUdyYXBoSXRlbSB7XHJcbiAgICBvaW5pOiBOdWxsYWJsZTxJTm9kZT47XHJcbiAgICBvZmluOiBOdWxsYWJsZTxJTm9kZT47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUxpbmtTZXQ8TCBleHRlbmRzIElPbGluaz4gZXh0ZW5kcyBBcnJheTxMPiB7fVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJR3JhcGg8TiBleHRlbmRzIElOb2RlLCBMIGV4dGVuZHMgSU9saW5rPiBleHRlbmRzIElOb2RlIHtcclxuICAgIG5vZGVzOiBJTm9kZVNldDxOPjtcclxuICAgIGxpbmtzOiBJTGlua1NldDxMPjtcclxuICAgIGlucHV0czogSU5vZGVTZXQ8Tj47XHJcbiAgICBvdXRwdXRzOiBJTm9kZVNldDxOPjtcclxuICAgIGhpZGRlbnM6IElOb2RlU2V0PE4+O1xyXG59XHJcblxyXG4vKipcclxuICogVHlwZSBndWFyZCBmb3IgSU5vZGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc05vZGU8TiBleHRlbmRzIElOb2RlPihvYmo6IHVua25vd24pOiBvYmogaXMgTiB7XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIHR5cGVvZiBvYmogPT09IFwib2JqZWN0XCIgJiZcclxuICAgICAgICBvYmogIT09IG51bGwgJiZcclxuICAgICAgICAoXCJwb3NpdGlvblwiIGluIG9iaiA/IG9iai5wb3NpdGlvbiA9PT0gdW5kZWZpbmVkIHx8IGlzQ2FydGVzaWFuKG9iai5wb3NpdGlvbikgOiB0cnVlKSAmJiAvLyBFbnN1cmUgcG9zaXRpb24gaXMgdW5kZWZpbmVkIG9yIElDYXJ0ZXNpYW4zXHJcbiAgICAgICAgXCJvbnNjXCIgaW4gb2JqICYmXHJcbiAgICAgICAgXCJvcHNjXCIgaW4gb2JqXHJcbiAgICApO1xyXG59XHJcbi8qKlxyXG4gKiBUeXBlIGd1YXJkIGZvciBJT2xpbmtcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc09saW5rPEwgZXh0ZW5kcyBJT2xpbms+KG9iajogdW5rbm93bik6IG9iaiBpcyBMIHtcclxuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiICYmIG9iaiAhPT0gbnVsbCAmJiBcIm9pbmlcIiBpbiBvYmogJiYgXCJvZmluXCIgaW4gb2JqICYmIGlzTm9kZSgob2JqIGFzIElPbGluaykub2luaSkgJiYgaXNOb2RlKChvYmogYXMgSU9saW5rKS5vZmluKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFR5cGUgZ3VhcmQgZm9yIElHcmFwaFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzR3JhcGg8TiBleHRlbmRzIElOb2RlLCBMIGV4dGVuZHMgSU9saW5rPihvYmo6IHVua25vd24pOiBvYmogaXMgSUdyYXBoPE4sIEw+IHtcclxuICAgIHJldHVybiAoXHJcbiAgICAgICAgaXNOb2RlKG9iaikgJiZcclxuICAgICAgICBcIm5vZGVzXCIgaW4gb2JqICYmXHJcbiAgICAgICAgXCJsaW5rc1wiIGluIG9iaiAmJlxyXG4gICAgICAgIFwiaW5wdXRzXCIgaW4gb2JqICYmXHJcbiAgICAgICAgXCJvdXRwdXRzXCIgaW4gb2JqICYmXHJcbiAgICAgICAgQXJyYXkuaXNBcnJheSgob2JqIGFzIElHcmFwaDxOLCBMPikubm9kZXMpICYmXHJcbiAgICAgICAgQXJyYXkuaXNBcnJheSgob2JqIGFzIElHcmFwaDxOLCBMPikubGlua3MpICYmXHJcbiAgICAgICAgQXJyYXkuaXNBcnJheSgob2JqIGFzIElHcmFwaDxOLCBMPikuaW5wdXRzKSAmJlxyXG4gICAgICAgIEFycmF5LmlzQXJyYXkoKG9iaiBhcyBJR3JhcGg8TiwgTD4pLm91dHB1dHMpICYmXHJcbiAgICAgICAgKG9iaiBhcyBJR3JhcGg8TiwgTD4pLm5vZGVzLmV2ZXJ5KGlzTm9kZSkgJiZcclxuICAgICAgICAob2JqIGFzIElHcmFwaDxOLCBMPikubGlua3MuZXZlcnkoaXNPbGluaykgJiZcclxuICAgICAgICAob2JqIGFzIElHcmFwaDxOLCBMPikuaW5wdXRzLmV2ZXJ5KGlzTm9kZSkgJiZcclxuICAgICAgICAob2JqIGFzIElHcmFwaDxOLCBMPikub3V0cHV0cy5ldmVyeShpc05vZGUpXHJcbiAgICApO1xyXG59XHJcbiIsImltcG9ydCB0eXBlIHsgSUNhcnRlc2lhbiB9IGZyb20gXCIuLi9nZW9tZXRyeVwiO1xyXG5pbXBvcnQgeyBOdWxsYWJsZSB9IGZyb20gXCIuLi90eXBlc1wiO1xyXG5pbXBvcnQgeyBHcmFwaEl0ZW0gfSBmcm9tIFwiLi9ncmFwaC5ncmFwaEl0ZW1cIjtcclxuaW1wb3J0IHsgY2xvbmVhYmxlLCBJTm9kZSwgSU9saW5rIH0gZnJvbSBcIi4vZ3JhcGguaW50ZXJmYWNlc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEdyYXBoTm9kZSBleHRlbmRzIEdyYXBoSXRlbSBpbXBsZW1lbnRzIElOb2RlIHtcclxuICAgIHByb3RlY3RlZCBfb25zYzogSU9saW5rW107XHJcbiAgICBwcm90ZWN0ZWQgX29wc2M6IElPbGlua1tdO1xyXG5cclxuICAgIEBjbG9uZWFibGUgcHVibGljIHBvc2l0aW9uPzogSUNhcnRlc2lhbjsgXHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKG9uc2M6IE51bGxhYmxlPElPbGlua1tdPiA9IG51bGwsIG9wc2M6IE51bGxhYmxlPElPbGlua1tdPiA9IG51bGwsIHBvc2l0aW9uPzogSUNhcnRlc2lhbikge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5fb25zYyA9IG9uc2MgPz8gW107XHJcbiAgICAgICAgdGhpcy5fb3BzYyA9IG9wc2MgPz8gW107XHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IHBvc2l0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBvbnNjPEwgZXh0ZW5kcyBJT2xpbms+KCk6IEFycmF5PEw+IHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fb25zYyBhcyBBcnJheTxMPjtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgb3BzYzxMIGV4dGVuZHMgSU9saW5rPigpOiBBcnJheTxMPiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX29wc2MgYXMgQXJyYXk8TD47XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHsgTnVsbGFibGUgfSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgR3JhcGhJdGVtIH0gZnJvbSBcIi4vZ3JhcGguZ3JhcGhJdGVtXCI7XHJcbmltcG9ydCB7IElOb2RlLCBJT2xpbmsgfSBmcm9tIFwiLi9ncmFwaC5pbnRlcmZhY2VzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgR3JhcGhPTGluayBleHRlbmRzIEdyYXBoSXRlbSBpbXBsZW1lbnRzIElPbGluayB7XHJcbiAgICBwcml2YXRlIF9vaW5pOiBOdWxsYWJsZTxJTm9kZT47XHJcbiAgICBwdWJsaWMgX29maW46IE51bGxhYmxlPElOb2RlPjtcclxuXHJcbiAgICBwdWJsaWMgY29uc3RydWN0b3Iob2luaT86IElOb2RlLCBvZmluPzogSU5vZGUpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuX29pbmkgPSBvaW5pID8/IG51bGw7XHJcbiAgICAgICAgaWYgKHRoaXMuX29pbmkpIHtcclxuICAgICAgICAgICAgdGhpcy5fb2luaS5vbnNjKCkucHVzaCh0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fb2ZpbiA9IG9maW4gPz8gbnVsbDtcclxuICAgICAgICBpZiAodGhpcy5fb2Zpbikge1xyXG4gICAgICAgICAgICB0aGlzLl9vZmluLm9wc2MoKS5wdXNoKHRoaXMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IG9pbmkoKTogTnVsbGFibGU8SU5vZGU+IHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fb2luaTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IG9pbmkobjogTnVsbGFibGU8SU5vZGU+KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX29pbmkgIT09IG4pIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX29pbmkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGEgPSB0aGlzLl9vaW5pLm9uc2MoKTtcclxuICAgICAgICAgICAgICAgIGEuc3BsaWNlKGEuaW5kZXhPZih0aGlzKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5fb2luaSA9IG47XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9vaW5pKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9vaW5pLm9uc2MoKS5wdXNoKHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgb2ZpbigpOiBOdWxsYWJsZTxJTm9kZT4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9vZmluO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgb2ZpbihuOiBOdWxsYWJsZTxJTm9kZT4pIHtcclxuICAgICAgICBpZiAodGhpcy5fb2ZpbiAhPT0gbikge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fb2Zpbikge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYSA9IHRoaXMuX29maW4ub3BzYygpO1xyXG4gICAgICAgICAgICAgICAgYS5zcGxpY2UoYS5pbmRleE9mKHRoaXMpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLl9vZmluID0gbjtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX29maW4pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX29maW4ub3BzYygpLnB1c2godGhpcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGRpc3Bvc2UoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX29pbmkpIHtcclxuICAgICAgICAgICAgY29uc3QgdG1wID0gdGhpcy5fb2luaS5vbnNjKCk7XHJcbiAgICAgICAgICAgIHRtcC5zcGxpY2UodG1wLmluZGV4T2YodGhpcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5fb2Zpbikge1xyXG4gICAgICAgICAgICBjb25zdCB0bXAgPSB0aGlzLl9vZmluLm9wc2MoKTtcclxuICAgICAgICAgICAgdG1wLnNwbGljZSh0bXAuaW5kZXhPZih0aGlzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN1cGVyLmRpc3Bvc2UoKTtcclxuICAgIH1cclxufVxyXG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcclxuLy8gQ29tcHV0ZUdyYXBoIDogZXhlY3V0ZXMgYSBEQUcgb2YgY29tcHV0ZSBub2RlcyBpbiB0b3BvbG9naWNhbCBvcmRlclxyXG4vL1xyXG4vLyBFYWNoIGNhbGwgdG8gcnVuKCk6XHJcbi8vIDEuIEluamVjdCBleHRlcm5hbCBpbnB1dHMgaW50byBzb3VyY2Ugbm9kZXNcclxuLy8gMi4gV2FsayBub2RlcyBpbiB0b3BvbG9naWNhbCBvcmRlclxyXG4vLyAzLiBGb3IgZWFjaCBub2RlOiBnYXRoZXIgaW5wdXQgdGVuc29ycyBmcm9tIGluY29taW5nIElEYXRhTGlua3MsXHJcbi8vICAgIGNhbGwgZXhlY3V0ZSgpLCB3cml0ZSBvdXRwdXQgdGVuc29ycyB0byBvdXRnb2luZyBJRGF0YUxpbmtzXHJcbi8vIDQuIENvbGxlY3Qgb3V0cHV0IHRlbnNvcnMgZnJvbSBzaW5rIG5vZGVzXHJcbi8vXHJcbi8vIFRoZSB0b3BvbG9naWNhbCBvcmRlciBpcyBjb21wdXRlZCBvbmNlIGF0IGNvbnN0cnVjdGlvbiAob3Igd2hlbiB0aGVcclxuLy8gZ3JhcGggY2hhbmdlcykgYW5kIGNhY2hlZCBmb3IgZmFzdCBwZXItZnJhbWUgZXhlY3V0aW9uLlxyXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcclxuXHJcbmltcG9ydCB7IEdyYXBoLCBHcmFwaE9MaW5rIH0gZnJvbSBcInNwaWt5cGFuZGEtY29yZVwiO1xyXG5pbXBvcnQge1xyXG4gICAgSUNvbXB1dGVHcmFwaCxcclxuICAgIElDb21wdXRlTm9kZSxcclxuICAgIElDb21wdXRlTm9kZUJhZyxcclxuICAgIElEYXRhTGluayxcclxuICAgIElUZW5zb3IsXHJcbn0gZnJvbSBcIi4vY29tcHV0ZS5pbnRlcmZhY2VzXCI7XHJcblxyXG4vLyDilIDilIDilIAgRGF0YUxpbmsgaW1wbGVtZW50YXRpb24g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4vKipcclxuICogQ29uY3JldGUgZGF0YSBsaW5rOiBhIGRpcmVjdGVkIGVkZ2UgY2FycnlpbmcgYSB0ZW5zb3IuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRGF0YUxpbmsgZXh0ZW5kcyBHcmFwaE9MaW5rIGltcGxlbWVudHMgSURhdGFMaW5rIHtcclxuICAgIHB1YmxpYyB0ZW5zb3I6IElUZW5zb3IgfCBudWxsID0gbnVsbDtcclxuICAgIHB1YmxpYyBpbnB1dEluZGV4OiBudW1iZXI7XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKGZyb20/OiBJQ29tcHV0ZU5vZGUsIHRvPzogSUNvbXB1dGVOb2RlLCBpbnB1dEluZGV4ID0gLTEpIHtcclxuICAgICAgICBzdXBlcihmcm9tLCB0byk7XHJcbiAgICAgICAgdGhpcy5pbnB1dEluZGV4ID0gaW5wdXRJbmRleDtcclxuICAgIH1cclxufVxyXG5cclxuLy8g4pSA4pSA4pSAIENvbXB1dGVHcmFwaCBpbXBsZW1lbnRhdGlvbiDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbi8qKlxyXG4gKiBFeGVjdXRhYmxlIGNvbXB1dGUgZ3JhcGguXHJcbiAqXHJcbiAqIEV4dGVuZHMgYEdyYXBoPElDb21wdXRlTm9kZSwgSURhdGFMaW5rPmAgZnJvbSBAc3Bpa3ktcGFuZGEvY29yZSxcclxuICogYWRkaW5nIHRvcG9sb2dpY2FsIHNvcnQgYW5kIHRoZSBgcnVuKClgIGV4ZWN1dGlvbiBtZXRob2QuXHJcbiAqXHJcbiAqICoqVXNhZ2U6KipcclxuICogYGBgdHlwZXNjcmlwdFxyXG4gKiBjb25zdCBncmFwaCA9IG5ldyBDb21wdXRlR3JhcGgobm9kZXMsIGxpbmtzKTtcclxuICogY29uc3QgcmVzdWx0ID0gZ3JhcGgucnVuKG5ldyBNYXAoW1tcInBvc2VcIiwgcG9zZVRlbnNvcl1dKSk7XHJcbiAqIGNvbnN0IGNvbW1hbmQgPSByZXN1bHQuZ2V0KFwiY29tbWFuZFwiKTtcclxuICogYGBgXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQ29tcHV0ZUdyYXBoIGV4dGVuZHMgR3JhcGg8SUNvbXB1dGVOb2RlLCBJRGF0YUxpbms+IGltcGxlbWVudHMgSUNvbXB1dGVHcmFwaCB7XHJcbiAgICBwcml2YXRlIF9zb3J0ZWROb2RlczogSUNvbXB1dGVOb2RlW10gfCBudWxsID0gbnVsbDtcclxuXHJcbiAgICBwdWJsaWMgY29uc3RydWN0b3Iobm9kZXM6IElDb21wdXRlTm9kZVtdLCBsaW5rczogSURhdGFMaW5rW10pIHtcclxuICAgICAgICBzdXBlcihub2RlcywgbGlua3MpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRXhlY3V0ZSB0aGUgZnVsbCBncmFwaCBpbiB0b3BvbG9naWNhbCBvcmRlci5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0gZXh0ZXJuYWxJbnB1dHMgIE5hbWVkIHRlbnNvcnMgaW5qZWN0ZWQgaW50byBzb3VyY2Ugbm9kZXNcclxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgIChtYXRjaGVkIGJ5IG5vZGUgSUQgb3IgbmFtZSB0YWcpLlxyXG4gICAgICogQHJldHVybnMgICAgICAgICAgICAgICAgTmFtZWQgdGVuc29ycyBmcm9tIG91dHB1dCBub2Rlcy5cclxuICAgICAqL1xyXG4gICAgcHVibGljIHJ1bihleHRlcm5hbElucHV0cz86IE1hcDxzdHJpbmcsIElUZW5zb3I+KTogTWFwPHN0cmluZywgSVRlbnNvcj4ge1xyXG4gICAgICAgIGNvbnN0IHNvcnRlZCA9IHRoaXMuX2dldFRvcG9sb2dpY2FsT3JkZXIoKTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIHNvcnRlZCkge1xyXG4gICAgICAgICAgICBjb25zdCBpbnB1dHMgPSB0aGlzLl9nYXRoZXJJbnB1dHMobm9kZSwgZXh0ZXJuYWxJbnB1dHMpO1xyXG4gICAgICAgICAgICBjb25zdCBvdXRwdXRzID0gbm9kZS5leGVjdXRlKGlucHV0cyk7XHJcbiAgICAgICAgICAgIHRoaXMuX2Rpc3RyaWJ1dGVPdXRwdXRzKG5vZGUsIG91dHB1dHMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbGxlY3RSZXN1bHRzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBFeGVjdXRlIHRoZSBmdWxsIGdyYXBoIGFzeW5jaHJvbm91c2x5IGluIHRvcG9sb2dpY2FsIG9yZGVyLlxyXG4gICAgICpcclxuICAgICAqIEZvciBlYWNoIG5vZGUsIHVzZXMgYGV4ZWN1dGVBc3luYygpYCBpZiB0aGUgbm9kZSBwcm92aWRlcyBpdCxcclxuICAgICAqIG90aGVyd2lzZSBmYWxscyBiYWNrIHRvIHN5bmNocm9ub3VzIGBleGVjdXRlKClgLlxyXG4gICAgICogTm9kZXMgYXJlIGF3YWl0ZWQgc2VxdWVudGlhbGx5ICh0b3BvbG9naWNhbCBvcmRlciBtdXN0IGJlIHJlc3BlY3RlZCkuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIGV4dGVybmFsSW5wdXRzICBOYW1lZCB0ZW5zb3JzIGluamVjdGVkIGludG8gc291cmNlIG5vZGVzLlxyXG4gICAgICogQHJldHVybnMgICAgICAgICAgICAgICAgUHJvbWlzZSByZXNvbHZpbmcgdG8gbmFtZWQgdGVuc29ycyBmcm9tIG91dHB1dCBub2Rlcy5cclxuICAgICAqL1xyXG4gICAgcHVibGljIGFzeW5jIHJ1bkFzeW5jKGV4dGVybmFsSW5wdXRzPzogTWFwPHN0cmluZywgSVRlbnNvcj4pOiBQcm9taXNlPE1hcDxzdHJpbmcsIElUZW5zb3I+PiB7XHJcbiAgICAgICAgY29uc3Qgc29ydGVkID0gdGhpcy5fZ2V0VG9wb2xvZ2ljYWxPcmRlcigpO1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygc29ydGVkKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGlucHV0cyA9IHRoaXMuX2dhdGhlcklucHV0cyhub2RlLCBleHRlcm5hbElucHV0cyk7XHJcblxyXG4gICAgICAgICAgICAvLyBQcmVmZXIgZXhlY3V0ZUFzeW5jIHdoZW4gYXZhaWxhYmxlLCBmYWxsYmFjayB0byBzeW5jIGV4ZWN1dGVcclxuICAgICAgICAgICAgY29uc3Qgb3V0cHV0cyA9IG5vZGUuZXhlY3V0ZUFzeW5jXHJcbiAgICAgICAgICAgICAgICA/IGF3YWl0IG5vZGUuZXhlY3V0ZUFzeW5jKGlucHV0cylcclxuICAgICAgICAgICAgICAgIDogbm9kZS5leGVjdXRlKGlucHV0cyk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9kaXN0cmlidXRlT3V0cHV0cyhub2RlLCBvdXRwdXRzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb2xsZWN0UmVzdWx0cygpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW52YWxpZGF0ZSB0aGUgY2FjaGVkIHRvcG9sb2dpY2FsIG9yZGVyLlxyXG4gICAgICogQ2FsbCBhZnRlciBhZGRpbmcvcmVtb3Zpbmcgbm9kZXMgb3IgbGlua3MuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBpbnZhbGlkYXRlT3JkZXIoKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5fc29ydGVkTm9kZXMgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBJbnRlcm5hbCBoZWxwZXJzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2F0aGVyIGlucHV0IHRlbnNvcnMgZm9yIGEgbm9kZSBmcm9tIGluY29taW5nIGxpbmtzIG9yIGV4dGVybmFsIGlucHV0cy5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBfZ2F0aGVySW5wdXRzKG5vZGU6IElDb21wdXRlTm9kZSwgZXh0ZXJuYWxJbnB1dHM/OiBNYXA8c3RyaW5nLCBJVGVuc29yPik6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgaW5jb21pbmdMaW5rcyA9IG5vZGUub3BzYzxJRGF0YUxpbms+KCk7XHJcbiAgICAgICAgY29uc3QgaW5wdXRzOiBJVGVuc29yW10gPSBbXTtcclxuXHJcbiAgICAgICAgaWYgKGluY29taW5nTGlua3MubGVuZ3RoID09PSAwICYmIGV4dGVybmFsSW5wdXRzKSB7XHJcbiAgICAgICAgICAgIC8vIFNvdXJjZSBub2RlOiBjaGVjayBmb3IgZXh0ZXJuYWwgaW5wdXQgYnkgSUQgb3IgdGFnXHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IChub2RlLmlkIGFzIHN0cmluZykgPz8gbm9kZS50YWc7XHJcbiAgICAgICAgICAgIGlmIChrZXkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGV4dCA9IGV4dGVybmFsSW5wdXRzLmdldChrZXkpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGV4dCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0cy5wdXNoKGV4dCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBUcmFuc2Zvcm0gbm9kZTogcmVhZCB0ZW5zb3JzIGZyb20gaW5jb21pbmcgZGF0YSBsaW5rc1xyXG4gICAgICAgICAgICAvLyBTb3J0IGJ5IGlucHV0SW5kZXggd2hlbiBzZXQgKE9OTlggZ3JhcGggYnVpbGRlciB0YWdzIGxpbmtzKVxyXG4gICAgICAgICAgICBjb25zdCBoYXNJbmRleCA9IGluY29taW5nTGlua3Muc29tZSgobCkgPT4gbC5pbnB1dEluZGV4ID49IDApO1xyXG4gICAgICAgICAgICBjb25zdCBvcmRlcmVkID0gaGFzSW5kZXhcclxuICAgICAgICAgICAgICAgID8gWy4uLmluY29taW5nTGlua3NdLnNvcnQoKGEsIGIpID0+IGEuaW5wdXRJbmRleCAtIGIuaW5wdXRJbmRleClcclxuICAgICAgICAgICAgICAgIDogaW5jb21pbmdMaW5rcztcclxuICAgICAgICAgICAgZm9yIChjb25zdCBsaW5rIG9mIG9yZGVyZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChsaW5rLnRlbnNvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0cy5wdXNoKGxpbmsudGVuc29yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGlucHV0cztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhY2hlIG91dHB1dHMgaW4gdGhlIG5vZGUncyBiYWcgYW5kIHdyaXRlIHRoZW0gdG8gb3V0Z29pbmcgZGF0YSBsaW5rcy5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBfZGlzdHJpYnV0ZU91dHB1dHMobm9kZTogSUNvbXB1dGVOb2RlLCBvdXRwdXRzOiBJVGVuc29yW10pOiB2b2lkIHtcclxuICAgICAgICAvLyBDYWNoZSBvdXRwdXRzIGluIHRoZSBub2RlJ3MgYmFnXHJcbiAgICAgICAgY29uc3QgYmFnID0gKG5vZGUuYmFnID8/IHt9KSBhcyBJQ29tcHV0ZU5vZGVCYWc7XHJcbiAgICAgICAgYmFnLmxhc3RPdXRwdXRzID0gb3V0cHV0cztcclxuICAgICAgICBub2RlLmJhZyA9IGJhZztcclxuXHJcbiAgICAgICAgLy8gV3JpdGUgb3V0cHV0cyB0byBvdXRnb2luZyBkYXRhIGxpbmtzXHJcbiAgICAgICAgY29uc3Qgb3V0Z29pbmdMaW5rcyA9IG5vZGUub25zYzxJRGF0YUxpbms+KCk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRnb2luZ0xpbmtzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIC8vIElmIHRoZXJlIGFyZSBtdWx0aXBsZSBvdXRwdXRzLCBkaXN0cmlidXRlIHRoZW07IG90aGVyd2lzZSBicm9hZGNhc3RcclxuICAgICAgICAgICAgb3V0Z29pbmdMaW5rc1tpXS50ZW5zb3IgPSBvdXRwdXRzLmxlbmd0aCA+IDEgPyAob3V0cHV0c1tpXSA/PyBvdXRwdXRzWzBdKSA6IChvdXRwdXRzWzBdID8/IG51bGwpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENvbGxlY3Qgb3V0cHV0IHRlbnNvcnMgZnJvbSBzaW5rIG5vZGVzIChub2RlcyB3aXRoIG5vIHN1Y2Nlc3NvcnMpLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIF9jb2xsZWN0UmVzdWx0cygpOiBNYXA8c3RyaW5nLCBJVGVuc29yPiB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcDxzdHJpbmcsIElUZW5zb3I+KCk7XHJcbiAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIHRoaXMub3V0cHV0cykge1xyXG4gICAgICAgICAgICBjb25zdCBiYWcgPSBub2RlLmJhZyBhcyBJQ29tcHV0ZU5vZGVCYWcgfCB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGlmIChiYWc/Lmxhc3RPdXRwdXRzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSAobm9kZS5pZCBhcyBzdHJpbmcpID8/IG5vZGUudGFnID8/IG5vZGUubm9kZVR5cGU7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHRlbnNvciBvZiBiYWcubGFzdE91dHB1dHMpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0KHRlbnNvci5uYW1lID8/IGtleSwgdGVuc29yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBUb3BvbG9naWNhbCBzb3J0IChLYWhuJ3MgYWxnb3JpdGhtKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICBwcml2YXRlIF9nZXRUb3BvbG9naWNhbE9yZGVyKCk6IElDb21wdXRlTm9kZVtdIHtcclxuICAgICAgICBpZiAodGhpcy5fc29ydGVkTm9kZXMpIHJldHVybiB0aGlzLl9zb3J0ZWROb2RlcztcclxuXHJcbiAgICAgICAgY29uc3Qgc29ydGVkOiBJQ29tcHV0ZU5vZGVbXSA9IFtdO1xyXG4gICAgICAgIGNvbnN0IGluRGVncmVlID0gbmV3IE1hcDxJQ29tcHV0ZU5vZGUsIG51bWJlcj4oKTtcclxuXHJcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbi1kZWdyZWVzXHJcbiAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIHRoaXMubm9kZXMpIHtcclxuICAgICAgICAgICAgaW5EZWdyZWUuc2V0KG5vZGUsIG5vZGUub3BzYzxJRGF0YUxpbms+KCkubGVuZ3RoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFN0YXJ0IHdpdGggc291cmNlIG5vZGVzIChpbi1kZWdyZWUgPSAwKVxyXG4gICAgICAgIGNvbnN0IHF1ZXVlOiBJQ29tcHV0ZU5vZGVbXSA9IFtdO1xyXG4gICAgICAgIGZvciAoY29uc3QgW25vZGUsIGRlZ3JlZV0gb2YgaW5EZWdyZWUpIHtcclxuICAgICAgICAgICAgaWYgKGRlZ3JlZSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcXVldWUucHVzaChub2RlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHF1ZXVlLnNoaWZ0KCkhO1xyXG4gICAgICAgICAgICBzb3J0ZWQucHVzaChub2RlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIEZvciBlYWNoIG91dGdvaW5nIGxpbmssIHJlZHVjZSB0aGUgZGVzdGluYXRpb24ncyBpbi1kZWdyZWVcclxuICAgICAgICAgICAgZm9yIChjb25zdCBsaW5rIG9mIG5vZGUub25zYzxJRGF0YUxpbms+KCkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlc3QgPSBsaW5rLm9maW4gYXMgSUNvbXB1dGVOb2RlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRlc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdEZWdyZWUgPSAoaW5EZWdyZWUuZ2V0KGRlc3QpID8/IDEpIC0gMTtcclxuICAgICAgICAgICAgICAgICAgICBpbkRlZ3JlZS5zZXQoZGVzdCwgbmV3RGVncmVlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobmV3RGVncmVlID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXVlLnB1c2goZGVzdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc29ydGVkLmxlbmd0aCAhPT0gdGhpcy5ub2Rlcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxyXG4gICAgICAgICAgICAgICAgYENvbXB1dGVHcmFwaCBoYXMgYSBjeWNsZTogc29ydGVkICR7c29ydGVkLmxlbmd0aH0gb2YgJHt0aGlzLm5vZGVzLmxlbmd0aH0gbm9kZXMuIGAgK1xyXG4gICAgICAgICAgICAgICAgYENvbXB1dGUgZ3JhcGhzIG11c3QgYmUgREFHcy5gXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl9zb3J0ZWROb2RlcyA9IHNvcnRlZDtcclxuICAgICAgICByZXR1cm4gc29ydGVkO1xyXG4gICAgfVxyXG59XHJcbiIsIi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gQ29tcHV0ZU5vZGVCYXNlIDogYWJzdHJhY3QgYmFzZSBjbGFzcyBmb3IgYWxsIGNvbXB1dGUgbm9kZXNcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5pbXBvcnQgeyBHcmFwaE5vZGUgfSBmcm9tIFwic3Bpa3lwYW5kYS1jb3JlXCI7XG5pbXBvcnQgeyBJQ29tcHV0ZU5vZGUsIElUZW5zb3IgfSBmcm9tIFwiLi9jb21wdXRlLmludGVyZmFjZXNcIjtcblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBjb21wdXRlIG5vZGVzLiBFeHRlbmRzIEdyYXBoTm9kZSBmb3IgZ3JhcGggY29tcGF0aWJpbGl0eS5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbXB1dGVOb2RlQmFzZSBleHRlbmRzIEdyYXBoTm9kZSBpbXBsZW1lbnRzIElDb21wdXRlTm9kZSB7XG4gICAgcHVibGljIGFic3RyYWN0IHJlYWRvbmx5IG5vZGVUeXBlOiBzdHJpbmc7XG4gICAgcHVibGljIGFic3RyYWN0IHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXTtcbiAgICBwdWJsaWMgYWJzdHJhY3QgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXTtcbn1cbiIsImV4cG9ydCAqIGZyb20gXCIuL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vY29tcHV0ZS5ub2RlLmJhc2VcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2NvbXB1dGUuZ3JhcGhcIjtcbmV4cG9ydCAqIGZyb20gXCIuL25vZGVzL2luZGV4XCI7XG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIENubk5vZGUgOiBnZW5lcmljIHdyYXBwZXIgZm9yIENOTiBpbmZlcmVuY2Vcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5pbXBvcnQgeyBJVGVuc29yIH0gZnJvbSBcIi4uL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xuaW1wb3J0IHsgQ29tcHV0ZU5vZGVCYXNlIH0gZnJvbSBcIi4uL2NvbXB1dGUubm9kZS5iYXNlXCI7XG5cbi8qKlxuICogQ05OIGluZmVyZW5jZSBub2RlIDogcnVucyBhIENOTiBldmFsdWF0b3IgYW5kIG91dHB1dHMgdGhlIHJlc3VsdC5cbiAqIFdyYXBzIGFueSBydW4oaW5wdXQ6IG51bWJlcltdKTogbnVtYmVyW10gZnVuY3Rpb24uXG4gKlxuICogVGhpcyBpcyBhIGdlbmVyaWMgd3JhcHBlcjogcGFzcyBpbiB0aGUgcnVuIGZ1bmN0aW9uIGZyb21cbiAqIGFueSBAc3Bpa3ktcGFuZGEvY29yZSBDTk4gcnVudGltZSAoQ25uSW5mZXJlbmNlUnVudGltZSwgZXRjLikuXG4gKi9cbmV4cG9ydCBjbGFzcyBDbm5Ob2RlIGV4dGVuZHMgQ29tcHV0ZU5vZGVCYXNlIHtcbiAgICBwdWJsaWMgcmVhZG9ubHkgbm9kZVR5cGU6IHN0cmluZztcbiAgICBwdWJsaWMgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdO1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSBfZXZhbHVhdGU6IChpbnB1dDogbnVtYmVyW10pID0+IG51bWJlcltdO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX291dHB1dE5hbWU6IHN0cmluZztcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBub2RlVHlwZTogc3RyaW5nLFxuICAgICAgICBvdXRwdXRTaXplOiBudW1iZXIsXG4gICAgICAgIGV2YWx1YXRlOiAoaW5wdXQ6IG51bWJlcltdKSA9PiBudW1iZXJbXSxcbiAgICAgICAgb3V0cHV0TmFtZTogc3RyaW5nID0gXCJvdXRwdXRcIlxuICAgICkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmlkID0gbm9kZVR5cGU7XG4gICAgICAgIHRoaXMubm9kZVR5cGUgPSBub2RlVHlwZTtcbiAgICAgICAgdGhpcy5fZXZhbHVhdGUgPSBldmFsdWF0ZTtcbiAgICAgICAgdGhpcy5fb3V0cHV0TmFtZSA9IG91dHB1dE5hbWU7XG4gICAgICAgIHRoaXMub3V0cHV0U2hhcGVzID0gW1tvdXRwdXRTaXplXV07XG4gICAgfVxuXG4gICAgcHVibGljIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xuICAgICAgICAvLyBDb25jYXRlbmF0ZSBhbGwgaW5wdXQgdGVuc29ycyBpbnRvIGEgc2luZ2xlIGZsYXQgYXJyYXlcbiAgICAgICAgbGV0IHRvdGFsTGVuID0gMDtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIGlucHV0cykgdG90YWxMZW4gKz0gdC5kYXRhLmxlbmd0aDtcblxuICAgICAgICBjb25zdCBmbGF0ID0gbmV3IEZsb2F0MzJBcnJheSh0b3RhbExlbik7XG4gICAgICAgIGxldCBvZmZzZXQgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IHQgb2YgaW5wdXRzKSB7XG4gICAgICAgICAgICBmbGF0LnNldCh0LmRhdGEsIG9mZnNldCk7XG4gICAgICAgICAgICBvZmZzZXQgKz0gdC5kYXRhLmxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2V2YWx1YXRlKEFycmF5LmZyb20oZmxhdCkpO1xuICAgICAgICByZXR1cm4gW3sgZGF0YTogbmV3IEZsb2F0MzJBcnJheShyZXN1bHQpLCBzaGFwZTogW3Jlc3VsdC5sZW5ndGhdLCBuYW1lOiB0aGlzLl9vdXRwdXROYW1lIH1dO1xuICAgIH1cbn1cbiIsIi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gQ29uY2F0Tm9kZSA6IG1lcmdlcyBtdWx0aXBsZSBpbnB1dCB0ZW5zb3JzIGludG8gb25lIGZsYXQgdmVjdG9yXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuaW1wb3J0IHsgSVRlbnNvciB9IGZyb20gXCIuLi9jb21wdXRlLmludGVyZmFjZXNcIjtcbmltcG9ydCB7IENvbXB1dGVOb2RlQmFzZSB9IGZyb20gXCIuLi9jb21wdXRlLm5vZGUuYmFzZVwiO1xuXG4vKipcbiAqIENvbmNhdGVuYXRpb24gbm9kZSA6IG1lcmdlcyBtdWx0aXBsZSBpbnB1dCB0ZW5zb3JzIGludG8gb25lIGZsYXQgdmVjdG9yLlxuICovXG5leHBvcnQgY2xhc3MgQ29uY2F0Tm9kZSBleHRlbmRzIENvbXB1dGVOb2RlQmFzZSB7XG4gICAgcHVibGljIHJlYWRvbmx5IG5vZGVUeXBlID0gXCJjb25jYXRcIjtcbiAgICBwdWJsaWMgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdO1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSBfdG90YWxTaXplOiBudW1iZXI7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3V0cHV0TmFtZTogc3RyaW5nO1xuXG4gICAgY29uc3RydWN0b3IoaW5wdXRTaXplczogbnVtYmVyW10sIG91dHB1dE5hbWU6IHN0cmluZyA9IFwiY29uY2F0XCIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5pZCA9IG91dHB1dE5hbWU7XG4gICAgICAgIHRoaXMuX3RvdGFsU2l6ZSA9IGlucHV0U2l6ZXMucmVkdWNlKChhLCBiKSA9PiBhICsgYiwgMCk7XG4gICAgICAgIHRoaXMuX291dHB1dE5hbWUgPSBvdXRwdXROYW1lO1xuICAgICAgICB0aGlzLm91dHB1dFNoYXBlcyA9IFtbdGhpcy5fdG90YWxTaXplXV07XG4gICAgfVxuXG4gICAgcHVibGljIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xuICAgICAgICBjb25zdCBmbGF0ID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLl90b3RhbFNpemUpO1xuICAgICAgICBsZXQgb2Zmc2V0ID0gMDtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIGlucHV0cykge1xuICAgICAgICAgICAgZmxhdC5zZXQodC5kYXRhLCBvZmZzZXQpO1xuICAgICAgICAgICAgb2Zmc2V0ICs9IHQuZGF0YS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFt7IGRhdGE6IGZsYXQsIHNoYXBlOiBbdGhpcy5fdG90YWxTaXplXSwgbmFtZTogdGhpcy5fb3V0cHV0TmFtZSB9XTtcbiAgICB9XG59XG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIEV4dGVybmFsSW5wdXROb2RlIDogbmFtZWQgaW5qZWN0aW9uIHBvaW50IGZvciBydW50aW1lIGRhdGFcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5pbXBvcnQgeyBJVGVuc29yIH0gZnJvbSBcIi4uL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xuaW1wb3J0IHsgQ29tcHV0ZU5vZGVCYXNlIH0gZnJvbSBcIi4uL2NvbXB1dGUubm9kZS5iYXNlXCI7XG5cbi8qKlxuICogRXh0ZXJuYWwgaW5wdXQgbm9kZSA6IHJlY2VpdmVzIHRlbnNvcnMgZnJvbSB0aGUgZ3JhcGgncyBydW4oKSBjYWxsLlxuICogQWN0cyBhcyBhIG5hbWVkIGluamVjdGlvbiBwb2ludCBmb3Igc2Vuc29yIGRhdGEsIHBvc2UsIGdvYWwsIGV0Yy5cbiAqL1xuZXhwb3J0IGNsYXNzIEV4dGVybmFsSW5wdXROb2RlIGV4dGVuZHMgQ29tcHV0ZU5vZGVCYXNlIHtcbiAgICBwdWJsaWMgcmVhZG9ubHkgbm9kZVR5cGUgPSBcImV4dGVybmFsX2lucHV0XCI7XG4gICAgcHVibGljIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXTtcblxuICAgIHByaXZhdGUgX3NoYXBlOiBudW1iZXJbXTtcbiAgICBwcml2YXRlIF9uYW1lOiBzdHJpbmc7XG5cbiAgICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIHNoYXBlOiBudW1iZXJbXSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmlkID0gbmFtZTtcbiAgICAgICAgdGhpcy5fbmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMuX3NoYXBlID0gc2hhcGU7XG4gICAgICAgIHRoaXMub3V0cHV0U2hhcGVzID0gW3NoYXBlXTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XG4gICAgICAgIC8vIEV4dGVybmFsIGlucHV0cyBhcmUgaW5qZWN0ZWQgYnkgdGhlIGdyYXBoIGVuZ2luZSB2aWEgcnVuKClcbiAgICAgICAgaWYgKGlucHV0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gW3sgLi4uaW5wdXRzWzBdLCBuYW1lOiB0aGlzLl9uYW1lIH1dO1xuICAgICAgICB9XG4gICAgICAgIC8vIFJldHVybiB6ZXJvcyBpZiBubyBpbnB1dCBwcm92aWRlZFxuICAgICAgICBjb25zdCBzaXplID0gdGhpcy5fc2hhcGUucmVkdWNlKChhLCBiKSA9PiBhICogYiwgMSk7XG4gICAgICAgIHJldHVybiBbeyBkYXRhOiBuZXcgRmxvYXQzMkFycmF5KHNpemUpLCBzaGFwZTogdGhpcy5fc2hhcGUsIG5hbWU6IHRoaXMuX25hbWUgfV07XG4gICAgfVxufVxuIiwiZXhwb3J0ICogZnJvbSBcIi4vZXh0ZXJuYWwtaW5wdXQubm9kZVwiO1xuZXhwb3J0ICogZnJvbSBcIi4vbWxwLm5vZGVcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2Nubi5ub2RlXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9ybm4ubm9kZVwiO1xuZXhwb3J0ICogZnJvbSBcIi4vY29uY2F0Lm5vZGVcIjtcbiIsIi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gTUxQTm9kZSA6IGdlbmVyaWMgd3JhcHBlciBmb3IgTUxQIGluZmVyZW5jZVxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5cbmltcG9ydCB7IElUZW5zb3IgfSBmcm9tIFwiLi4vY29tcHV0ZS5pbnRlcmZhY2VzXCI7XG5pbXBvcnQgeyBDb21wdXRlTm9kZUJhc2UgfSBmcm9tIFwiLi4vY29tcHV0ZS5ub2RlLmJhc2VcIjtcblxuLyoqXG4gKiBNTFAgaW5mZXJlbmNlIG5vZGUgOiBydW5zIGFuIE1MUCBldmFsdWF0b3IgYW5kIG91dHB1dHMgdGhlIHJlc3VsdC5cbiAqIFdyYXBzIGFueSBldmFsdWF0ZShpbnB1dDogbnVtYmVyW10pOiBudW1iZXJbXSBmdW5jdGlvbi5cbiAqXG4gKiBUaGlzIGlzIGEgZ2VuZXJpYyB3cmFwcGVyOiBwYXNzIGluIHRoZSBldmFsdWF0ZSBmdW5jdGlvbiBmcm9tXG4gKiBhbnkgQHNwaWt5LXBhbmRhL2NvcmUgTUxQIHJ1bnRpbWUgKE1MUEluZmVyZW5jZVJ1bnRpbWUsIGV0Yy4pLlxuICovXG5leHBvcnQgY2xhc3MgTUxQTm9kZSBleHRlbmRzIENvbXB1dGVOb2RlQmFzZSB7XG4gICAgcHVibGljIHJlYWRvbmx5IG5vZGVUeXBlOiBzdHJpbmc7XG4gICAgcHVibGljIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXTtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX2V2YWx1YXRlOiAoaW5wdXQ6IG51bWJlcltdKSA9PiBudW1iZXJbXTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vdXRwdXROYW1lOiBzdHJpbmc7XG5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgbm9kZVR5cGU6IHN0cmluZyxcbiAgICAgICAgX2lucHV0U2l6ZTogbnVtYmVyLFxuICAgICAgICBvdXRwdXRTaXplOiBudW1iZXIsXG4gICAgICAgIGV2YWx1YXRlOiAoaW5wdXQ6IG51bWJlcltdKSA9PiBudW1iZXJbXSxcbiAgICAgICAgb3V0cHV0TmFtZTogc3RyaW5nID0gXCJvdXRwdXRcIlxuICAgICkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmlkID0gbm9kZVR5cGU7XG4gICAgICAgIHRoaXMubm9kZVR5cGUgPSBub2RlVHlwZTtcbiAgICAgICAgdGhpcy5fZXZhbHVhdGUgPSBldmFsdWF0ZTtcbiAgICAgICAgdGhpcy5fb3V0cHV0TmFtZSA9IG91dHB1dE5hbWU7XG4gICAgICAgIHRoaXMub3V0cHV0U2hhcGVzID0gW1tvdXRwdXRTaXplXV07XG4gICAgfVxuXG4gICAgcHVibGljIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xuICAgICAgICAvLyBDb25jYXRlbmF0ZSBhbGwgaW5wdXQgdGVuc29ycyBpbnRvIGEgc2luZ2xlIGZsYXQgYXJyYXlcbiAgICAgICAgbGV0IHRvdGFsTGVuID0gMDtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIGlucHV0cykgdG90YWxMZW4gKz0gdC5kYXRhLmxlbmd0aDtcblxuICAgICAgICBjb25zdCBmbGF0ID0gbmV3IEZsb2F0MzJBcnJheSh0b3RhbExlbik7XG4gICAgICAgIGxldCBvZmZzZXQgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IHQgb2YgaW5wdXRzKSB7XG4gICAgICAgICAgICBmbGF0LnNldCh0LmRhdGEsIG9mZnNldCk7XG4gICAgICAgICAgICBvZmZzZXQgKz0gdC5kYXRhLmxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2V2YWx1YXRlKEFycmF5LmZyb20oZmxhdCkpO1xuICAgICAgICByZXR1cm4gW3sgZGF0YTogbmV3IEZsb2F0MzJBcnJheShyZXN1bHQpLCBzaGFwZTogW3Jlc3VsdC5sZW5ndGhdLCBuYW1lOiB0aGlzLl9vdXRwdXROYW1lIH1dO1xuICAgIH1cbn1cbiIsIi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gUm5uTm9kZSA6IGdlbmVyaWMgd3JhcHBlciBmb3IgUk5OIGluZmVyZW5jZSAoc2luZ2xlIHRpbWVzdGVwKVxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5cbmltcG9ydCB7IElUZW5zb3IgfSBmcm9tIFwiLi4vY29tcHV0ZS5pbnRlcmZhY2VzXCI7XG5pbXBvcnQgeyBDb21wdXRlTm9kZUJhc2UgfSBmcm9tIFwiLi4vY29tcHV0ZS5ub2RlLmJhc2VcIjtcblxuLyoqXG4gKiBSTk4gaW5mZXJlbmNlIG5vZGUgOiBydW5zIGEgc2luZ2xlIHRpbWVzdGVwIHRocm91Z2ggYW4gUk5OIGV2YWx1YXRvci5cbiAqIFdyYXBzIGFueSBzdGVwKGlucHV0OiBudW1iZXJbXSk6IG51bWJlcltdIGZ1bmN0aW9uLlxuICpcbiAqIFRoaXMgaXMgYSBnZW5lcmljIHdyYXBwZXI6IHBhc3MgaW4gdGhlIHN0ZXAgZnVuY3Rpb24gZnJvbVxuICogYW55IEBzcGlreS1wYW5kYS9jb3JlIFJOTiBydW50aW1lIChSbm5JbmZlcmVuY2VSdW50aW1lLCBldGMuKS5cbiAqXG4gKiBUaGUgUk5OIG1haW50YWlucyBoaWRkZW4gc3RhdGUgYWNyb3NzIGNhbGxzIGludGVybmFsbHksXG4gKiBzbyBlYWNoIGV4ZWN1dGUoKSBhZHZhbmNlcyBvbmUgdGltZXN0ZXAuXG4gKi9cbmV4cG9ydCBjbGFzcyBSbm5Ob2RlIGV4dGVuZHMgQ29tcHV0ZU5vZGVCYXNlIHtcbiAgICBwdWJsaWMgcmVhZG9ubHkgbm9kZVR5cGU6IHN0cmluZztcbiAgICBwdWJsaWMgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdO1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RlcDogKGlucHV0OiBudW1iZXJbXSkgPT4gbnVtYmVyW107XG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3V0cHV0TmFtZTogc3RyaW5nO1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIG5vZGVUeXBlOiBzdHJpbmcsXG4gICAgICAgIG91dHB1dFNpemU6IG51bWJlcixcbiAgICAgICAgc3RlcDogKGlucHV0OiBudW1iZXJbXSkgPT4gbnVtYmVyW10sXG4gICAgICAgIG91dHB1dE5hbWU6IHN0cmluZyA9IFwib3V0cHV0XCJcbiAgICApIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5pZCA9IG5vZGVUeXBlO1xuICAgICAgICB0aGlzLm5vZGVUeXBlID0gbm9kZVR5cGU7XG4gICAgICAgIHRoaXMuX3N0ZXAgPSBzdGVwO1xuICAgICAgICB0aGlzLl9vdXRwdXROYW1lID0gb3V0cHV0TmFtZTtcbiAgICAgICAgdGhpcy5vdXRwdXRTaGFwZXMgPSBbW291dHB1dFNpemVdXTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XG4gICAgICAgIC8vIENvbmNhdGVuYXRlIGFsbCBpbnB1dCB0ZW5zb3JzIGludG8gYSBzaW5nbGUgZmxhdCBhcnJheVxuICAgICAgICBsZXQgdG90YWxMZW4gPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IHQgb2YgaW5wdXRzKSB0b3RhbExlbiArPSB0LmRhdGEubGVuZ3RoO1xuXG4gICAgICAgIGNvbnN0IGZsYXQgPSBuZXcgRmxvYXQzMkFycmF5KHRvdGFsTGVuKTtcbiAgICAgICAgbGV0IG9mZnNldCA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgdCBvZiBpbnB1dHMpIHtcbiAgICAgICAgICAgIGZsYXQuc2V0KHQuZGF0YSwgb2Zmc2V0KTtcbiAgICAgICAgICAgIG9mZnNldCArPSB0LmRhdGEubGVuZ3RoO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fc3RlcChBcnJheS5mcm9tKGZsYXQpKTtcbiAgICAgICAgcmV0dXJuIFt7IGRhdGE6IG5ldyBGbG9hdDMyQXJyYXkocmVzdWx0KSwgc2hhcGU6IFtyZXN1bHQubGVuZ3RoXSwgbmFtZTogdGhpcy5fb3V0cHV0TmFtZSB9XTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBDb21wdXRlR3JhcGgsIERhdGFMaW5rIH0gZnJvbSBcIi4uL2NvbXB1dGUvY29tcHV0ZS5ncmFwaFwiO1xyXG5pbXBvcnQgeyBDb21wdXRlTm9kZUJhc2UgfSBmcm9tIFwiLi4vY29tcHV0ZS9jb21wdXRlLm5vZGUuYmFzZVwiO1xyXG5pbXBvcnQgdHlwZSB7IElDb21wdXRlTm9kZSwgSVRlbnNvciB9IGZyb20gXCIuLi9jb21wdXRlL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xyXG5pbXBvcnQgdHlwZSB7IE9ubnhQYXJzZVJlc3VsdCB9IGZyb20gXCIuL29ubngtcGFyc2VyXCI7XHJcbmltcG9ydCB0eXBlIHsgT25ueFZhbHVlSW5mbyB9IGZyb20gXCIuL29ubngtdHlwZXNcIjtcclxuaW1wb3J0IHR5cGUgeyBPbm54VGVuc29ySW5mbyB9IGZyb20gXCIuL29ubngtdHlwZXNcIjtcclxuaW1wb3J0IHsgT25ueE9wUmVnaXN0cnksIGdldEluaXRpYWxpemVyRGF0YSwgbWFrZVRlbnNvciB9IGZyb20gXCIuL3JlZ2lzdHJ5XCI7XHJcblxyXG4vKipcclxuICogU291cmNlIG5vZGUgdGhhdCBwcm92aWRlcyBhIGNvbnN0YW50IHRlbnNvciAoZnJvbSBhbiBPTk5YIGluaXRpYWxpemVyKS5cclxuICovXHJcbmNsYXNzIEluaXRpYWxpemVyTm9kZSBleHRlbmRzIENvbXB1dGVOb2RlQmFzZSB7XHJcbiAgICByZWFkb25seSBub2RlVHlwZSA9IFwib25ueF9pbml0aWFsaXplclwiO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0ZW5zb3I6IElUZW5zb3I7XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5pdDogT25ueFRlbnNvckluZm8pIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIGNvbnN0IGRhdGEgPSBnZXRJbml0aWFsaXplckRhdGEoaW5pdCk7XHJcbiAgICAgICAgdGhpcy50ZW5zb3IgPSBtYWtlVGVuc29yKGRhdGEsIFsuLi5pbml0LmRpbXNdLCBpbml0Lm5hbWUpO1xyXG4gICAgICAgIHRoaXMub3V0cHV0U2hhcGVzID0gW2luaXQuZGltc107XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZSgpOiBJVGVuc29yW10ge1xyXG4gICAgICAgIHJldHVybiBbdGhpcy50ZW5zb3JdO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogU291cmNlIG5vZGUgZm9yIGV4dGVybmFsIGdyYXBoIGlucHV0cy5cclxuICovXHJcbmNsYXNzIElucHV0Tm9kZSBleHRlbmRzIENvbXB1dGVOb2RlQmFzZSB7XHJcbiAgICByZWFkb25seSBub2RlVHlwZSA9IFwib25ueF9pbnB1dFwiO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdO1xyXG4gICAgcmVhZG9ubHkgaW5wdXROYW1lOiBzdHJpbmc7XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBzaGFwZTogbnVtYmVyW10pIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuaWQgPSBuYW1lO1xyXG4gICAgICAgIHRoaXMuaW5wdXROYW1lID0gbmFtZTtcclxuICAgICAgICAvLyBSZXBsYWNlIGR5bmFtaWMgZGltcyAoMCkgd2l0aCAxIGZvciBpbmZlcmVuY2VcclxuICAgICAgICB0aGlzLm91dHB1dFNoYXBlcyA9IFtzaGFwZS5tYXAoKGQpID0+IChkIDw9IDAgPyAxIDogZCkpXTtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBpZiAoaW5wdXRzLmxlbmd0aCA+IDAgJiYgaW5wdXRzWzBdKSByZXR1cm4gW2lucHV0c1swXV07XHJcbiAgICAgICAgY29uc3Qgc3ogPSB0aGlzLm91dHB1dFNoYXBlc1swXS5yZWR1Y2UoKGEsIGIpID0+IGEgKiBiLCAxKTtcclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShzeiksIFsuLi50aGlzLm91dHB1dFNoYXBlc1swXV0sIHRoaXMuaW5wdXROYW1lKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBCdWlsZHMgYSBydW5uYWJsZSBDb21wdXRlR3JhcGggZnJvbSBhbiBPbm54UGFyc2VSZXN1bHQgKyBvcCByZWdpc3RyeS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBPbm54R3JhcGhCdWlsZGVyIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmVnaXN0cnk6IE9ubnhPcFJlZ2lzdHJ5O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHJlZ2lzdHJ5OiBPbm54T3BSZWdpc3RyeSkge1xyXG4gICAgICAgIHRoaXMucmVnaXN0cnkgPSByZWdpc3RyeTtcclxuICAgIH1cclxuXHJcbiAgICBidWlsZChtb2RlbDogT25ueFBhcnNlUmVzdWx0KTogeyBncmFwaDogQ29tcHV0ZUdyYXBoOyBpbnB1dE5hbWVzOiBzdHJpbmdbXTsgb3V0cHV0TmFtZXM6IHN0cmluZ1tdIH0ge1xyXG4gICAgICAgIGNvbnN0IG5vZGVzOiBJQ29tcHV0ZU5vZGVbXSA9IFtdO1xyXG4gICAgICAgIGNvbnN0IGxpbmtzOiBEYXRhTGlua1tdID0gW107XHJcblxyXG4gICAgICAgIC8vIE1hcCB0ZW5zb3IgbmFtZSAtPiB0aGUgbm9kZSB0aGF0IHByb2R1Y2VzIGl0ICsgb3V0cHV0IGluZGV4XHJcbiAgICAgICAgY29uc3QgdGVuc29yUHJvZHVjZXIgPSBuZXcgTWFwPHN0cmluZywgeyBub2RlOiBJQ29tcHV0ZU5vZGU7IG91dHB1dEluZGV4OiBudW1iZXIgfT4oKTtcclxuXHJcbiAgICAgICAgLy8gTWFwIHRlbnNvciBuYW1lIC0+IGxpc3Qgb2YgY29uc3VtZXJzIChub2RlICsgaW5wdXQgaW5kZXgpXHJcbiAgICAgICAgY29uc3QgdGVuc29yQ29uc3VtZXJzOiB7IHRlbnNvck5hbWU6IHN0cmluZzsgbm9kZTogSUNvbXB1dGVOb2RlOyBpbnB1dEluZGV4OiBudW1iZXIgfVtdID0gW107XHJcblxyXG4gICAgICAgIC8vIEJ1aWxkIGluaXRpYWxpemVyIG1hcFxyXG4gICAgICAgIGNvbnN0IGluaXRNYXAgPSBuZXcgTWFwPHN0cmluZywgT25ueFRlbnNvckluZm8+KCk7XHJcbiAgICAgICAgZm9yIChjb25zdCBpbml0IG9mIG1vZGVsLmluaXRpYWxpemVycykge1xyXG4gICAgICAgICAgICBpbml0TWFwLnNldChpbml0Lm5hbWUsIGluaXQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlIGluaXRpYWxpemVyIG5vZGVzXHJcbiAgICAgICAgZm9yIChjb25zdCBpbml0IG9mIG1vZGVsLmluaXRpYWxpemVycykge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gbmV3IEluaXRpYWxpemVyTm9kZShpbml0KTtcclxuICAgICAgICAgICAgbm9kZXMucHVzaChub2RlKTtcclxuICAgICAgICAgICAgdGVuc29yUHJvZHVjZXIuc2V0KGluaXQubmFtZSwgeyBub2RlLCBvdXRwdXRJbmRleDogMCB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBpbnB1dCBub2RlcyAoc2tpcCBpbml0aWFsaXplcnMgdGhhdCBzaGFyZSBpbnB1dCBuYW1lcylcclxuICAgICAgICBjb25zdCBpbnB1dE5hbWVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgIGZvciAoY29uc3QgaW5wIG9mIG1vZGVsLmlucHV0cykge1xyXG4gICAgICAgICAgICBpZiAoaW5pdE1hcC5oYXMoaW5wLm5hbWUpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IG5ldyBJbnB1dE5vZGUoaW5wLm5hbWUsIGlucC5zaGFwZSk7XHJcbiAgICAgICAgICAgIG5vZGVzLnB1c2gobm9kZSk7XHJcbiAgICAgICAgICAgIHRlbnNvclByb2R1Y2VyLnNldChpbnAubmFtZSwgeyBub2RlLCBvdXRwdXRJbmRleDogMCB9KTtcclxuICAgICAgICAgICAgaW5wdXROYW1lcy5wdXNoKGlucC5uYW1lKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBvcGVyYXRvciBub2Rlc1xyXG4gICAgICAgIGZvciAoY29uc3Qgbm9kZUluZm8gb2YgbW9kZWwubm9kZXMpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLnJlZ2lzdHJ5Lmhhcyhub2RlSW5mby5vcFR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFNraXBwaW5nIHVuc3VwcG9ydGVkIE9OTlggb3A6ICR7bm9kZUluZm8ub3BUeXBlfWApO1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLnJlZ2lzdHJ5LmNyZWF0ZShub2RlSW5mbywgaW5pdE1hcCk7XHJcbiAgICAgICAgICAgIG5vZGVzLnB1c2gobm9kZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBSZWdpc3RlciBjb25zdW1lciBmb3IgZWFjaCBpbnB1dCB0ZW5zb3JcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlSW5mby5pbnB1dHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRlbnNvck5hbWUgPSBub2RlSW5mby5pbnB1dHNbaV07XHJcbiAgICAgICAgICAgICAgICBpZiAodGVuc29yTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRlbnNvckNvbnN1bWVycy5wdXNoKHsgdGVuc29yTmFtZSwgbm9kZSwgaW5wdXRJbmRleDogaSB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gUmVnaXN0ZXIgcHJvZHVjZXIgZm9yIGVhY2ggb3V0cHV0IHRlbnNvclxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVJbmZvLm91dHB1dHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRlbnNvck5hbWUgPSBub2RlSW5mby5vdXRwdXRzW2ldO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRlbnNvck5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0ZW5zb3JQcm9kdWNlci5zZXQodGVuc29yTmFtZSwgeyBub2RlLCBvdXRwdXRJbmRleDogaSB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gV2lyZSBsaW5rc1xyXG4gICAgICAgIGZvciAoY29uc3QgY29uc3VtZXIgb2YgdGVuc29yQ29uc3VtZXJzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb2R1Y2VyID0gdGVuc29yUHJvZHVjZXIuZ2V0KGNvbnN1bWVyLnRlbnNvck5hbWUpO1xyXG4gICAgICAgICAgICBpZiAoIXByb2R1Y2VyKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYE5vIHByb2R1Y2VyIGZvciB0ZW5zb3I6ICR7Y29uc3VtZXIudGVuc29yTmFtZX1gKTtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGxpbmsgPSBuZXcgRGF0YUxpbmsoXHJcbiAgICAgICAgICAgICAgICBwcm9kdWNlci5ub2RlIGFzIElDb21wdXRlTm9kZSxcclxuICAgICAgICAgICAgICAgIGNvbnN1bWVyLm5vZGUgYXMgSUNvbXB1dGVOb2RlLFxyXG4gICAgICAgICAgICAgICAgY29uc3VtZXIuaW5wdXRJbmRleCxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgbGlua3MucHVzaChsaW5rKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIElkZW50aWZ5IG91dHB1dCB0ZW5zb3IgbmFtZXNcclxuICAgICAgICBjb25zdCBvdXRwdXROYW1lcyA9IG1vZGVsLm91dHB1dHMubWFwKChvOiBPbm54VmFsdWVJbmZvKSA9PiBvLm5hbWUpO1xyXG5cclxuICAgICAgICBjb25zdCBncmFwaCA9IG5ldyBDb21wdXRlR3JhcGgobm9kZXMsIGxpbmtzKTtcclxuICAgICAgICByZXR1cm4geyBncmFwaCwgaW5wdXROYW1lcywgb3V0cHV0TmFtZXMgfTtcclxuICAgIH1cclxufVxyXG4iLCJleHBvcnQgKiBmcm9tIFwiLi9wYi9pbmRleFwiO1xyXG5leHBvcnQgKiBmcm9tIFwiLi9vbm54LXR5cGVzXCI7XHJcbmV4cG9ydCAqIGZyb20gXCIuL29ubngtcGFyc2VyXCI7XHJcbmV4cG9ydCAqIGZyb20gXCIuL29ubngtd3JpdGVyXCI7XHJcbmV4cG9ydCAqIGZyb20gXCIuL3JlZ2lzdHJ5XCI7XHJcbmV4cG9ydCB7IE9ubnhHcmFwaEJ1aWxkZXIgfSBmcm9tIFwiLi9ncmFwaC1idWlsZGVyXCI7XHJcbmV4cG9ydCAqIGZyb20gXCIuL29wcy9pbmRleFwiO1xyXG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcclxuLy8gT05OWCBtb2RlbCBwYXJzZXJcclxuLy9cclxuLy8gUG9ydGVkIGZyb20gQ3lhbk15Y2VsaXVtOjpPbm54R3JhcGhCdWlsZGVyIChDKysgaW1wbGVtZW50YXRpb24pLlxyXG4vLyBQYXJzZXMgYW4gT05OWCBwcm90b2J1ZiBiaW5hcnkgaW50byBzdHJ1Y3R1cmVkIFR5cGVTY3JpcHQgb2JqZWN0c1xyXG4vLyAoT25ueE5vZGVJbmZvLCBPbm54VGVuc29ySW5mbywgT25ueFZhbHVlSW5mbykgdGhhdCBjYW4gdGhlbiBiZSB1c2VkXHJcbi8vIHRvIGJ1aWxkIGEgU3Bpa3lQYW5kYSBDb21wdXRlR3JhcGguXHJcbi8vXHJcbi8vIFplcm8gZGVwZW5kZW5jaWVzIGJleW9uZCB0aGUgbG9jYWwgcGIvIHJlYWRlciBhbmQgb25ueC10eXBlcy5cclxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcblxyXG5pbXBvcnQgeyBQQlJlYWRlciB9IGZyb20gXCIuL3BiL3JlYWRlclwiO1xyXG5pbXBvcnQgeyBNZW1vcnlTdHJlYW0gfSBmcm9tIFwiLi9wYi9zdHJlYW1cIjtcclxuaW1wb3J0IHsgV2lyZVR5cGUgfSBmcm9tIFwiLi9wYi9yZWFkZXJcIjtcclxuaW1wb3J0IHtcclxuICAgIE9ubnhEYXRhVHlwZSxcclxuICAgIE9ubnhMaW5rVHlwZSxcclxuICAgIE9ubnhOb2RlSW5mbyxcclxuICAgIE9ubnhUZW5zb3JJbmZvLFxyXG4gICAgT25ueFZhbHVlSW5mbyxcclxuICAgIEtFWV9NQVhfTEVOR1RILFxyXG4gICAgVEVOU09SX01BWF9ESU1FTlNJT04sXHJcbiAgICAvLyBNb2RlbFByb3RvIGZpZWxkc1xyXG4gICAgTU9ERUxfSVJfVkVSU0lPTixcclxuICAgIE1PREVMX0dSQVBILFxyXG4gICAgLy8gR3JhcGhQcm90byBmaWVsZHNcclxuICAgIEdSQVBIX05PREUsXHJcbiAgICBHUkFQSF9OQU1FLFxyXG4gICAgR1JBUEhfSU5JVElBTElaRVIsXHJcbiAgICBHUkFQSF9JTlBVVCxcclxuICAgIEdSQVBIX09VVFBVVCxcclxuICAgIEdSQVBIX1ZBTFVFX0lORk8sXHJcbiAgICAvLyBOb2RlUHJvdG8gZmllbGRzXHJcbiAgICBOT0RFX0lOUFVULFxyXG4gICAgTk9ERV9PVVRQVVQsXHJcbiAgICBOT0RFX05BTUUsXHJcbiAgICBOT0RFX09QX1RZUEUsXHJcbiAgICBOT0RFX0FUVFJJQlVURSxcclxuICAgIC8vIEF0dHJpYnV0ZVByb3RvIGZpZWxkc1xyXG4gICAgQVRUX05BTUUsXHJcbiAgICBBVFRfRkxPQVQsXHJcbiAgICBBVFRfSU5ULFxyXG4gICAgQVRUX1RFTlNPUixcclxuICAgIEFUVF9GTE9BVFMsXHJcbiAgICBBVFRfSU5UUyxcclxuICAgIC8vIFZhbHVlSW5mb1Byb3RvIGZpZWxkc1xyXG4gICAgVklORk9fTkFNRSxcclxuICAgIFZJTkZPX1RZUEUsXHJcbiAgICAvLyBUeXBlUHJvdG8gZmllbGRzXHJcbiAgICBUWVBFX1RFTlNPUixcclxuICAgIC8vIFRlbnNvclR5cGVQcm90byBmaWVsZHNcclxuICAgIFRFTlNPUl9UWVBFX0VMRU1fVFlQRSxcclxuICAgIFRFTlNPUl9UWVBFX1NIQVBFLFxyXG4gICAgLy8gU2hhcGUgZmllbGRzXHJcbiAgICBTSEFQRV9ESU0sXHJcbiAgICBESU1fVkFMVUUsXHJcbiAgICBESU1fU1lNQk9MLFxyXG4gICAgLy8gVGVuc29yUHJvdG8gZmllbGRzXHJcbiAgICBURU5TT1JfRElNUyxcclxuICAgIFRFTlNPUl9EQVRBX1RZUEUsXHJcbiAgICBURU5TT1JfRkxPQVRfREFUQSxcclxuICAgIFRFTlNPUl9OQU1FLFxyXG4gICAgVEVOU09SX1JBV19EQVRBLFxyXG59IGZyb20gXCIuL29ubngtdHlwZXNcIjtcclxuXHJcbi8vIOKUgOKUgOKUgCBFcnJvciBjb2RlcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbmV4cG9ydCBjb25zdCBPTk5YX1NVQ0NFU1MgPSAwO1xyXG5leHBvcnQgY29uc3QgT05OWF9VTlNVUFBPUlRFRF9OT0RFID0gMTAwO1xyXG5leHBvcnQgY29uc3QgT05OWF9VTlNVUFBPUlRFRF9BVFRSSUJVVEUgPSAxMDE7XHJcbmV4cG9ydCBjb25zdCBPTk5YX1VOU1VQUE9SVEVEX1RFTlNPUl9EQVRBX1RZUEUgPSAxMTA7XHJcbmV4cG9ydCBjb25zdCBPTk5YX1VOU1VQUE9SVEVEX1RFTlNPUl9ESU0gPSAxMTE7XHJcbmV4cG9ydCBjb25zdCBPTk5YX0lOVkFMSURfSU5JVElBTElaRVJfU0hBUEUgPSAxMTM7XHJcbmV4cG9ydCBjb25zdCBPTk5YX1JFQURfRVJST1IgPSAyMDA7XHJcbmV4cG9ydCBjb25zdCBPTk5YX1NZU1RFTV9FUlJPUiA9IDMwMDtcclxuXHJcbi8vIOKUgOKUgOKUgCBQYXJzZSByZXN1bHQg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4vKipcclxuICogVGhlIHJlc3VsdCBvZiBwYXJzaW5nIGFuIE9OTlggbW9kZWwuXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIE9ubnhQYXJzZVJlc3VsdCB7XHJcbiAgICBpclZlcnNpb246IG51bWJlcjtcclxuICAgIGdyYXBoTmFtZTogc3RyaW5nO1xyXG4gICAgbm9kZXM6IE9ubnhOb2RlSW5mb1tdO1xyXG4gICAgaW5pdGlhbGl6ZXJzOiBPbm54VGVuc29ySW5mb1tdO1xyXG4gICAgaW5wdXRzOiBPbm54VmFsdWVJbmZvW107XHJcbiAgICBvdXRwdXRzOiBPbm54VmFsdWVJbmZvW107XHJcbiAgICB2YWx1ZUluZm9zOiBPbm54VmFsdWVJbmZvW107XHJcbn1cclxuXHJcbi8vIOKUgOKUgOKUgCBPbm54UGFyc2VyIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuLyoqXHJcbiAqIFBhcnNlcyBhbiBPTk5YIHByb3RvYnVmIGJpbmFyeSBpbnRvIGEgc3RydWN0dXJlZCByZXN1bHQuXHJcbiAqXHJcbiAqIFBvcnRlZCBmcm9tIEN5YW5NeWNlbGl1bTo6T25ueEdyYXBoQnVpbGRlci5cclxuICpcclxuICogVXNhZ2U6XHJcbiAqIGBgYHR5cGVzY3JpcHRcclxuICogY29uc3QgYnl0ZXMgPSBhd2FpdCBmZXRjaChcIm1vZGVsLm9ubnhcIikudGhlbihyID0+IHIuYXJyYXlCdWZmZXIoKSk7XHJcbiAqIGNvbnN0IHJlc3VsdCA9IE9ubnhQYXJzZXIucGFyc2UobmV3IFVpbnQ4QXJyYXkoYnl0ZXMpKTtcclxuICogY29uc29sZS5sb2cocmVzdWx0Lm5vZGVzLm1hcChuID0+IG4ub3BUeXBlKSk7XHJcbiAqIGBgYFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIE9ubnhQYXJzZXIge1xyXG4gICAgcHJpdmF0ZSBfZXJyb3I6IG51bWJlciA9IE9OTlhfU1VDQ0VTUztcclxuICAgIHByaXZhdGUgX2Vycm9ySW5mbzogc3RyaW5nID0gXCJcIjtcclxuXHJcbiAgICBwdWJsaWMgZ2V0IGVycm9yKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Vycm9yO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgZXJyb3JJbmZvKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Vycm9ySW5mbztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFBhcnNlIGFuIE9OTlggbW9kZWwgZnJvbSByYXcgYnl0ZXMuXHJcbiAgICAgKiBAcGFyYW0gZGF0YSAgVGhlIHJhdyAub25ueCBmaWxlIGNvbnRlbnQuXHJcbiAgICAgKiBAcmV0dXJucyAgICAgVGhlIHBhcnNlZCByZXN1bHQsIG9yIG51bGwgb24gZXJyb3IuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBzdGF0aWMgcGFyc2UoZGF0YTogVWludDhBcnJheSk6IE9ubnhQYXJzZVJlc3VsdCB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IHBhcnNlciA9IG5ldyBPbm54UGFyc2VyKCk7XHJcbiAgICAgICAgcmV0dXJuIHBhcnNlci5wYXJzZU1vZGVsKGRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUGFyc2UgYW4gT05OWCBtb2RlbC5cclxuICAgICAqL1xyXG4gICAgcHVibGljIHBhcnNlTW9kZWwoZGF0YTogVWludDhBcnJheSk6IE9ubnhQYXJzZVJlc3VsdCB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBQQlJlYWRlcihuZXcgTWVtb3J5U3RyZWFtKGRhdGEpKTtcclxuICAgICAgICBjb25zdCByZXN1bHQ6IE9ubnhQYXJzZVJlc3VsdCA9IHtcclxuICAgICAgICAgICAgaXJWZXJzaW9uOiAwLFxyXG4gICAgICAgICAgICBncmFwaE5hbWU6IFwiXCIsXHJcbiAgICAgICAgICAgIG5vZGVzOiBbXSxcclxuICAgICAgICAgICAgaW5pdGlhbGl6ZXJzOiBbXSxcclxuICAgICAgICAgICAgaW5wdXRzOiBbXSxcclxuICAgICAgICAgICAgb3V0cHV0czogW10sXHJcbiAgICAgICAgICAgIHZhbHVlSW5mb3M6IFtdLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHdoaWxlIChyZWFkZXIucmVhZFRhZygpKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAocmVhZGVyLmZpZWxkTnVtYmVyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIE1PREVMX0lSX1ZFUlNJT046IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gcmVhZGVyLnJlYWRJbnQzMigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2ID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NldEVycm9yKE9OTlhfUkVBRF9FUlJPUiwgXCJGYWlsZWQgdG8gcmVhZCBJUiB2ZXJzaW9uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmlyVmVyc2lvbiA9IHY7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIE1PREVMX0dSQVBIOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViID0gcmVhZGVyLmdldFN1Yk1lc3NhZ2VSZWFkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXN1Yikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXRFcnJvcihPTk5YX1JFQURfRVJST1IsIFwiRmFpbGVkIHRvIHJlYWQgZ3JhcGhcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX3JlYWRHcmFwaChzdWIsIHJlc3VsdCkpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDoge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVhZGVyLnNraXAoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXRFcnJvcihPTk5YX1JFQURfRVJST1IsIFwiRmFpbGVkIHRvIHNraXAgZmllbGRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgR3JhcGgg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSBfcmVhZEdyYXBoKHJlYWRlcjogUEJSZWFkZXIsIHJlc3VsdDogT25ueFBhcnNlUmVzdWx0KTogYm9vbGVhbiB7XHJcbiAgICAgICAgd2hpbGUgKHJlYWRlci5yZWFkVGFnKCkpIHtcclxuICAgICAgICAgICAgc3dpdGNoIChyZWFkZXIuZmllbGROdW1iZXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgR1JBUEhfTk9ERToge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN1YiA9IHJlYWRlci5nZXRTdWJNZXNzYWdlUmVhZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdWIpIHJldHVybiB0aGlzLl9mYWlsKFwiRmFpbGVkIHRvIHJlYWQgbm9kZVwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBub2RlID0gdGhpcy5fcmVhZE5vZGUoc3ViKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIW5vZGUpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQubm9kZXMucHVzaChub2RlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgR1JBUEhfTkFNRToge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSByZWFkZXIucmVhZFN0cmluZyhLRVlfTUFYX0xFTkdUSCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUgPT09IG51bGwpIHJldHVybiB0aGlzLl9mYWlsKFwiRmFpbGVkIHRvIHJlYWQgZ3JhcGggbmFtZVwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuZ3JhcGhOYW1lID0gbmFtZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgR1JBUEhfSU5JVElBTElaRVI6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdWIgPSByZWFkZXIuZ2V0U3ViTWVzc2FnZVJlYWRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghc3ViKSByZXR1cm4gdGhpcy5fZmFpbChcIkZhaWxlZCB0byByZWFkIGluaXRpYWxpemVyXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluaXQgPSB0aGlzLl9yZWFkSW5pdGlhbGl6ZXIoc3ViKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWluaXQpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuaW5pdGlhbGl6ZXJzLnB1c2goaW5pdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdSQVBIX0lOUFVUOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViID0gcmVhZGVyLmdldFN1Yk1lc3NhZ2VSZWFkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXN1YikgcmV0dXJuIHRoaXMuX2ZhaWwoXCJGYWlsZWQgdG8gcmVhZCBpbnB1dFwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2aSA9IHRoaXMuX3JlYWRWYWx1ZUluZm8oc3ViLCBPbm54TGlua1R5cGUuSU5QVVQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdmkpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuaW5wdXRzLnB1c2godmkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBHUkFQSF9PVVRQVVQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdWIgPSByZWFkZXIuZ2V0U3ViTWVzc2FnZVJlYWRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghc3ViKSByZXR1cm4gdGhpcy5fZmFpbChcIkZhaWxlZCB0byByZWFkIG91dHB1dFwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2aSA9IHRoaXMuX3JlYWRWYWx1ZUluZm8oc3ViLCBPbm54TGlua1R5cGUuT1VUUFVUKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXZpKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0Lm91dHB1dHMucHVzaCh2aSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdSQVBIX1ZBTFVFX0lORk86IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdWIgPSByZWFkZXIuZ2V0U3ViTWVzc2FnZVJlYWRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghc3ViKSByZXR1cm4gdGhpcy5fZmFpbChcIkZhaWxlZCB0byByZWFkIHZhbHVlX2luZm9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmkgPSB0aGlzLl9yZWFkVmFsdWVJbmZvKHN1YiwgT25ueExpbmtUeXBlLlVOS05PV04pO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdmkpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQudmFsdWVJbmZvcy5wdXNoKHZpKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlYWRlci5za2lwKCkpIHJldHVybiB0aGlzLl9mYWlsKFwiRmFpbGVkIHRvIHNraXAgZ3JhcGggZmllbGRcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIE5vZGUg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSBfcmVhZE5vZGUocmVhZGVyOiBQQlJlYWRlcik6IE9ubnhOb2RlSW5mbyB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IG5vZGU6IE9ubnhOb2RlSW5mbyA9IHtcclxuICAgICAgICAgICAgbmFtZTogXCJcIixcclxuICAgICAgICAgICAgb3BUeXBlOiBcIlwiLFxyXG4gICAgICAgICAgICBpbnB1dHM6IFtdLFxyXG4gICAgICAgICAgICBvdXRwdXRzOiBbXSxcclxuICAgICAgICAgICAgYXR0cmlidXRlczogbmV3IE1hcCgpLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIFR3by1wYXNzIHJlYWQ6IGZpcnN0IGZpbmQgb3BfdHlwZSwgdGhlbiBwYXJzZSBldmVyeXRoaW5nXHJcbiAgICAgICAgcmVhZGVyLnNhdmUoKTtcclxuICAgICAgICB3aGlsZSAocmVhZGVyLnJlYWRUYWcoKSkge1xyXG4gICAgICAgICAgICBpZiAocmVhZGVyLmZpZWxkTnVtYmVyID09PSBOT0RFX09QX1RZUEUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHQgPSByZWFkZXIucmVhZFN0cmluZyhLRVlfTUFYX0xFTkdUSCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodCA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3NldEVycm9yKE9OTlhfUkVBRF9FUlJPUiwgXCJGYWlsZWQgdG8gcmVhZCBvcF90eXBlXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbm9kZS5vcFR5cGUgPSB0O1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVhZGVyLnJlc3RvcmUoKTtcclxuXHJcbiAgICAgICAgLy8gU2Vjb25kIHBhc3M6IHJlYWQgYWxsIGZpZWxkc1xyXG4gICAgICAgIHdoaWxlIChyZWFkZXIucmVhZFRhZygpKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAocmVhZGVyLmZpZWxkTnVtYmVyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIE5PREVfSU5QVVQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gcmVhZGVyLnJlYWRTdHJpbmcoS0VZX01BWF9MRU5HVEgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocy5sZW5ndGggPiAwKSBub2RlLmlucHV0cy5wdXNoKHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBOT0RFX09VVFBVVDoge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHMgPSByZWFkZXIucmVhZFN0cmluZyhLRVlfTUFYX0xFTkdUSCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHMgPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzLmxlbmd0aCA+IDApIG5vZGUub3V0cHV0cy5wdXNoKHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBOT0RFX05BTUU6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gcmVhZGVyLnJlYWRTdHJpbmcoS0VZX01BWF9MRU5HVEgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBub2RlLm5hbWUgPSBzO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBOT0RFX09QX1RZUEU6IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBBbHJlYWR5IHJlYWQgaW4gZmlyc3QgcGFzcywganVzdCBza2lwXHJcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgTk9ERV9BVFRSSUJVVEU6IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBJbmxpbmUgcGFyc2UgKGF2b2lkIHN1Yi1yZWFkZXIgZm9yIHBlcmZvcm1hbmNlKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlbiA9IHJlYWRlci5yZWFkTGVuZ3RoKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobGVuID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmQgPSByZWFkZXIucG9zaXRpb24gKyBsZW47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBhdHROYW1lID0gXCJcIjtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYXR0RmxvYXQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBhdHRJbnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBoYXNGbG9hdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBoYXNJbnQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYXR0VGVuc29yOiBPbm54VGVuc29ySW5mbyB8IG51bGwgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvc2l0aW9uIDwgZW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcmVhZGVyLnJlYWRUYWcoKSkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF0dEZpZWxkID0gcmVhZGVyLmZpZWxkTnVtYmVyIGFzIG51bWJlcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChhdHRGaWVsZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBVFRfTkFNRToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHMgPSByZWFkZXIucmVhZFN0cmluZyhLRVlfTUFYX0xFTkdUSCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMgPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dE5hbWUgPSBzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBVFRfRkxPQVQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmID0gcmVhZGVyLnJlYWRGbG9hdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRGbG9hdCA9IGY7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzRmxvYXQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBVFRfSU5UOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaSA9IHJlYWRlci5yZWFkSW50NjQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0SW50ID0gaTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNJbnQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBVFRfVEVOU09SOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViID0gcmVhZGVyLmdldFN1Yk1lc3NhZ2VSZWFkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXN1YikgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0VGVuc29yID0gdGhpcy5fcmVhZEluaXRpYWxpemVyKHN1Yik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEFUVF9JTlRTOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVwZWF0ZWQgaW50NjQ6IHN0b3JlIGZpcnN0IHZhbHVlIGFzIHNjYWxhciBhdHRyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaSA9IHJlYWRlci5yZWFkSW50NjQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNJbnQpIHsgYXR0SW50ID0gaTsgaGFzSW50ID0gdHJ1ZTsgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBVFRfRkxPQVRTOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVwZWF0ZWQgZmxvYXQ6IHN0b3JlIGZpcnN0IHZhbHVlIGFzIHNjYWxhciBhdHRyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZiA9IHJlYWRlci5yZWFkRmxvYXQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNGbG9hdCkgeyBhdHRGbG9hdCA9IGY7IGhhc0Zsb2F0ID0gdHJ1ZTsgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0TmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0VGVuc29yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW5vZGUudGVuc29yQXR0cmlidXRlcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUudGVuc29yQXR0cmlidXRlcyA9IG5ldyBNYXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUudGVuc29yQXR0cmlidXRlcy5zZXQoYXR0TmFtZSwgYXR0VGVuc29yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChoYXNGbG9hdCB8fCBoYXNJbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuYXR0cmlidXRlcy5zZXQoYXR0TmFtZSwgaGFzRmxvYXQgPyBhdHRGbG9hdCA6IGF0dEludCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFZhbHVlSW5mbyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICBwcml2YXRlIF9yZWFkVmFsdWVJbmZvKHJlYWRlcjogUEJSZWFkZXIsIHR5cGU6IE9ubnhMaW5rVHlwZSk6IE9ubnhWYWx1ZUluZm8gfCBudWxsIHtcclxuICAgICAgICBjb25zdCBpbmZvOiBPbm54VmFsdWVJbmZvID0ge1xyXG4gICAgICAgICAgICBuYW1lOiBcIlwiLFxyXG4gICAgICAgICAgICB0eXBlLFxyXG4gICAgICAgICAgICBlbGVtVHlwZTogT25ueERhdGFUeXBlLlVOREVGSU5FRCxcclxuICAgICAgICAgICAgc2hhcGU6IFtdLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHdoaWxlIChyZWFkZXIucmVhZFRhZygpKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAocmVhZGVyLmZpZWxkTnVtYmVyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFZJTkZPX05BTUU6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gcmVhZGVyLnJlYWRTdHJpbmcoS0VZX01BWF9MRU5HVEgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBpbmZvLm5hbWUgPSBzO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBWSU5GT19UWVBFOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5saW5lIHBhcnNlIFR5cGVQcm90b1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlbiA9IHJlYWRlci5yZWFkTGVuZ3RoKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobGVuID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmQgPSByZWFkZXIucG9zaXRpb24gKyBsZW47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zaXRpb24gPCBlbmQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWFkZXIucmVhZFRhZygpKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChyZWFkZXIuZmllbGROdW1iZXIgYXMgbnVtYmVyKSA9PT0gVFlQRV9URU5TT1IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN1YiA9IHJlYWRlci5nZXRTdWJNZXNzYWdlUmVhZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXN1YikgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX3JlYWRUZW5zb3JUeXBlKHN1YiwgaW5mbykpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGluZm87XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBfcmVhZFRlbnNvclR5cGUocmVhZGVyOiBQQlJlYWRlciwgaW5mbzogT25ueFZhbHVlSW5mbyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHdoaWxlIChyZWFkZXIucmVhZFRhZygpKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAocmVhZGVyLmZpZWxkTnVtYmVyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRFTlNPUl9UWVBFX0VMRU1fVFlQRToge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHYgPSByZWFkZXIucmVhZEludDMyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHYgPT09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBpbmZvLmVsZW1UeXBlID0gdiBhcyBPbm54RGF0YVR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRFTlNPUl9UWVBFX1NIQVBFOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViID0gcmVhZGVyLmdldFN1Yk1lc3NhZ2VSZWFkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXN1YikgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5fcmVhZFRlbnNvclNoYXBlKHN1YiwgaW5mbykpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIF9yZWFkVGVuc29yU2hhcGUocmVhZGVyOiBQQlJlYWRlciwgaW5mbzogT25ueFZhbHVlSW5mbyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHdoaWxlIChyZWFkZXIucmVhZFRhZygpKSB7XHJcbiAgICAgICAgICAgIGlmIChyZWFkZXIuZmllbGROdW1iZXIgPT09IFNIQVBFX0RJTSkge1xyXG4gICAgICAgICAgICAgICAgLy8gSW5saW5lIHBhcnNlIERpbWVuc2lvblByb3RvXHJcbiAgICAgICAgICAgICAgICBjb25zdCBsZW4gPSByZWFkZXIucmVhZExlbmd0aChmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAobGVuID09PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbmQgPSByZWFkZXIucG9zaXRpb24gKyBsZW47XHJcblxyXG4gICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3NpdGlvbiA8IGVuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVhZGVyLnJlYWRUYWcoKSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpbUZpZWxkID0gcmVhZGVyLmZpZWxkTnVtYmVyIGFzIG51bWJlcjtcclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGRpbUZpZWxkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRElNX1ZBTFVFOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gcmVhZGVyLnJlYWRJbnQ2NCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYgPT09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZm8uc2hhcGUucHVzaCh2KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRElNX1NZTUJPTDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3ltYm9saWMgZGltZW5zaW9uIChlLmcuLCBcImJhdGNoX3NpemVcIiksIHN0b3JlIGFzIDBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmZvLnNoYXBlLnB1c2goMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlYWRlci5za2lwKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIEluaXRpYWxpemVyIChUZW5zb3JQcm90bykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSBfcmVhZEluaXRpYWxpemVyKHJlYWRlcjogUEJSZWFkZXIpOiBPbm54VGVuc29ySW5mbyB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IHRlbnNvcjogT25ueFRlbnNvckluZm8gPSB7XHJcbiAgICAgICAgICAgIG5hbWU6IFwiXCIsXHJcbiAgICAgICAgICAgIGRhdGFUeXBlOiBPbm54RGF0YVR5cGUuVU5ERUZJTkVELFxyXG4gICAgICAgICAgICBkaW1zOiBbXSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBsZXQgdG90YWxFbGVtZW50cyA9IDA7XHJcblxyXG4gICAgICAgIHdoaWxlIChyZWFkZXIucmVhZFRhZygpKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAocmVhZGVyLmZpZWxkTnVtYmVyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRFTlNPUl9ESU1TOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYWRlci53aXJlVHlwZSA9PT0gV2lyZVR5cGUuTEVOKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBhY2tlZCBkaW1zXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRtcERpbXMgPSBuZXcgSW50MzJBcnJheShURU5TT1JfTUFYX0RJTUVOU0lPTik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gcmVhZGVyLnJlYWRQYWNrZWRJbnQzMih0bXBEaW1zLCBURU5TT1JfTUFYX0RJTUVOU0lPTik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb3VudCA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbnNvci5kaW1zID0gQXJyYXkuZnJvbSh0bXBEaW1zLnN1YmFycmF5KDAsIGNvdW50KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5kaXZpZHVhbCB2YXJpbnQgZGltXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHYgPSByZWFkZXIucmVhZEludDMyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2ID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVuc29yLmRpbXMucHVzaCh2KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVjb21wdXRlIHRvdGFsIGVsZW1lbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxFbGVtZW50cyA9IHRlbnNvci5kaW1zLmxlbmd0aCA+IDAgPyB0ZW5zb3IuZGltcy5yZWR1Y2UoKGEsIGIpID0+IGEgKiBiLCAxKSA6IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRFTlNPUl9EQVRBX1RZUEU6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gcmVhZGVyLnJlYWRJbnQzMigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2ID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB0ZW5zb3IuZGF0YVR5cGUgPSB2IGFzIE9ubnhEYXRhVHlwZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgVEVOU09SX05BTUU6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gcmVhZGVyLnJlYWRTdHJpbmcoS0VZX01BWF9MRU5HVEgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB0ZW5zb3IubmFtZSA9IHM7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRFTlNPUl9GTE9BVF9EQVRBOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvdGFsRWxlbWVudHMgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGVuc29yLmZsb2F0RGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW5zb3IuZmxvYXREYXRhID0gbmV3IEZsb2F0MzJBcnJheSh0b3RhbEVsZW1lbnRzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYWRlci53aXJlVHlwZSA9PT0gV2lyZVR5cGUuTEVOKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBhY2tlZCBmbG9hdHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRQYWNrZWRGbG9hdDMyKHRlbnNvci5mbG9hdERhdGEsIHRvdGFsRWxlbWVudHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluZGl2aWR1YWwgZmxvYXQgKHJhcmUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGYgPSByZWFkZXIucmVhZEZsb2F0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmluZCBuZXh0IGVtcHR5IHNsb3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3RhbEVsZW1lbnRzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZW5zb3IuZmxvYXREYXRhW2ldID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVuc29yLmZsb2F0RGF0YVtpXSA9IGY7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRFTlNPUl9SQVdfREFUQToge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJ5dGVzID0gcmVhZGVyLnJlYWRCeXRlcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChieXRlcyA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgdGVuc29yLnJhd0RhdGEgPSBieXRlcztcclxuICAgICAgICAgICAgICAgICAgICAvLyBJZiBmbG9hdCB0eXBlLCBhbHNvIGNyZWF0ZSB0aGUgZmxvYXQgdmlld1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ZW5zb3IuZGF0YVR5cGUgPT09IE9ubnhEYXRhVHlwZS5GTE9BVCAmJiB0b3RhbEVsZW1lbnRzID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhbGlnbmVkID0gbmV3IEZsb2F0MzJBcnJheShieXRlcy5idWZmZXIsIGJ5dGVzLmJ5dGVPZmZzZXQsIHRvdGFsRWxlbWVudHMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW5zb3IuZmxvYXREYXRhID0gbmV3IEZsb2F0MzJBcnJheShhbGlnbmVkKTsgLy8gY29weSB0byBlbnN1cmUgYWxpZ25tZW50XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0ZW5zb3I7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIEVycm9yIGhlbHBlcnMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSBfc2V0RXJyb3IoY29kZTogbnVtYmVyLCBpbmZvOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLl9lcnJvciA9IGNvZGU7XHJcbiAgICAgICAgdGhpcy5fZXJyb3JJbmZvID0gaW5mbztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIF9mYWlsKG1zZzogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgICAgdGhpcy5fc2V0RXJyb3IoT05OWF9SRUFEX0VSUk9SLCBtc2cpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxufVxyXG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcclxuLy8gT05OWCBkYXRhIHR5cGVzIGFuZCBwcm90b2J1ZiBmaWVsZCBjb25zdGFudHNcclxuLy9cclxuLy8gTWlycm9ycyB0aGUgT05OWCAxLjE4LjAgcHJvdG9idWYgc2NoZW1hIChvbm54LnByb3RvMykgYXMgVHlwZVNjcmlwdFxyXG4vLyB0eXBlcyBhbmQgbnVtZXJpYyBjb25zdGFudHMuIE5vIGNvZGUgZ2VuZXJhdGlvbiByZXF1aXJlZC5cclxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcblxyXG4vLyDilIDilIDilIAgVGVuc29yIGRhdGEgdHlwZXMgKGZyb20gb25ueC5wcm90bzMgVGVuc29yUHJvdG8uRGF0YVR5cGUpIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuZXhwb3J0IGVudW0gT25ueERhdGFUeXBlIHtcclxuICAgIFVOREVGSU5FRCA9IDAsXHJcbiAgICBGTE9BVCA9IDEsXHJcbiAgICBVSU5UOCA9IDIsXHJcbiAgICBJTlQ4ID0gMyxcclxuICAgIFVJTlQxNiA9IDQsXHJcbiAgICBJTlQxNiA9IDUsXHJcbiAgICBJTlQzMiA9IDYsXHJcbiAgICBJTlQ2NCA9IDcsXHJcbiAgICBTVFJJTkcgPSA4LFxyXG4gICAgQk9PTCA9IDksXHJcbiAgICBGTE9BVDE2ID0gMTAsXHJcbiAgICBET1VCTEUgPSAxMSxcclxuICAgIFVJTlQzMiA9IDEyLFxyXG4gICAgVUlOVDY0ID0gMTMsXHJcbiAgICBDT01QTEVYNjQgPSAxNCxcclxuICAgIENPTVBMRVgxMjggPSAxNSxcclxuICAgIEJGTE9BVDE2ID0gMTYsXHJcbn1cclxuXHJcbi8qKiBCeXRlIHNpemUgcGVyIGVsZW1lbnQgZm9yIHN1cHBvcnRlZCBkYXRhIHR5cGVzLiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gb25ueERhdGFUeXBlU2l6ZSh0eXBlOiBPbm54RGF0YVR5cGUpOiBudW1iZXIge1xyXG4gICAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuRkxPQVQ6XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuSU5UMzI6XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuVUlOVDMyOlxyXG4gICAgICAgICAgICByZXR1cm4gNDtcclxuICAgICAgICBjYXNlIE9ubnhEYXRhVHlwZS5ET1VCTEU6XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuSU5UNjQ6XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuVUlOVDY0OlxyXG4gICAgICAgICAgICByZXR1cm4gODtcclxuICAgICAgICBjYXNlIE9ubnhEYXRhVHlwZS5GTE9BVDE2OlxyXG4gICAgICAgIGNhc2UgT25ueERhdGFUeXBlLkJGTE9BVDE2OlxyXG4gICAgICAgIGNhc2UgT25ueERhdGFUeXBlLklOVDE2OlxyXG4gICAgICAgIGNhc2UgT25ueERhdGFUeXBlLlVJTlQxNjpcclxuICAgICAgICAgICAgcmV0dXJuIDI7XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuSU5UODpcclxuICAgICAgICBjYXNlIE9ubnhEYXRhVHlwZS5VSU5UODpcclxuICAgICAgICBjYXNlIE9ubnhEYXRhVHlwZS5CT09MOlxyXG4gICAgICAgICAgICByZXR1cm4gMTtcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICByZXR1cm4gMDtcclxuICAgIH1cclxufVxyXG5cclxuLy8g4pSA4pSA4pSAIExpbmsgdHlwZSAobWlycm9ycyBDeWFuTXljZWxpdW06OkxpbmtUeXBlKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbmV4cG9ydCBlbnVtIE9ubnhMaW5rVHlwZSB7XHJcbiAgICBVTktOT1dOID0gMCxcclxuICAgIElOUFVUID0gMSxcclxuICAgIE9VVFBVVCA9IDIsXHJcbiAgICBJTklUSUFMSVpFUiA9IDMsXHJcbn1cclxuXHJcbi8vIOKUgOKUgOKUgCBQcm90b2J1ZiBmaWVsZCBudW1iZXJzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4vLyBUaGVzZSBtYXRjaCB0aGUgT05OWCAucHJvdG8gZmllbGQgaW5kaWNlcyBleGFjdGx5LlxyXG5cclxuLy8gTW9kZWxQcm90b1xyXG5leHBvcnQgY29uc3QgTU9ERUxfSVJfVkVSU0lPTiA9IDE7XHJcbmV4cG9ydCBjb25zdCBNT0RFTF9HUkFQSCA9IDc7XHJcblxyXG4vLyBHcmFwaFByb3RvXHJcbmV4cG9ydCBjb25zdCBHUkFQSF9OT0RFID0gMTtcclxuZXhwb3J0IGNvbnN0IEdSQVBIX05BTUUgPSAyO1xyXG5leHBvcnQgY29uc3QgR1JBUEhfSU5JVElBTElaRVIgPSA1O1xyXG5leHBvcnQgY29uc3QgR1JBUEhfRE9DX1NUUklORyA9IDEwO1xyXG5leHBvcnQgY29uc3QgR1JBUEhfSU5QVVQgPSAxMTtcclxuZXhwb3J0IGNvbnN0IEdSQVBIX09VVFBVVCA9IDEyO1xyXG5leHBvcnQgY29uc3QgR1JBUEhfVkFMVUVfSU5GTyA9IDEzO1xyXG5cclxuLy8gTm9kZVByb3RvXHJcbmV4cG9ydCBjb25zdCBOT0RFX0lOUFVUID0gMTtcclxuZXhwb3J0IGNvbnN0IE5PREVfT1VUUFVUID0gMjtcclxuZXhwb3J0IGNvbnN0IE5PREVfTkFNRSA9IDM7XHJcbmV4cG9ydCBjb25zdCBOT0RFX09QX1RZUEUgPSA0O1xyXG5leHBvcnQgY29uc3QgTk9ERV9BVFRSSUJVVEUgPSA1O1xyXG5cclxuLy8gQXR0cmlidXRlUHJvdG8gKHBhcnRpYWwsIG1vc3QgY29tbW9ubHkgdXNlZCBmaWVsZHMpXHJcbmV4cG9ydCBjb25zdCBBVFRfTkFNRSA9IDE7XHJcbmV4cG9ydCBjb25zdCBBVFRfRkxPQVQgPSAyO1xyXG5leHBvcnQgY29uc3QgQVRUX0lOVCA9IDM7XHJcbmV4cG9ydCBjb25zdCBBVFRfVEVOU09SID0gNTtcclxuZXhwb3J0IGNvbnN0IEFUVF9GTE9BVFMgPSA3O1xyXG5leHBvcnQgY29uc3QgQVRUX0lOVFMgPSA4O1xyXG5cclxuLy8gVmFsdWVJbmZvUHJvdG9cclxuZXhwb3J0IGNvbnN0IFZJTkZPX05BTUUgPSAxO1xyXG5leHBvcnQgY29uc3QgVklORk9fVFlQRSA9IDI7XHJcblxyXG4vLyBUeXBlUHJvdG9cclxuZXhwb3J0IGNvbnN0IFRZUEVfVEVOU09SID0gMTtcclxuXHJcbi8vIFRlbnNvclR5cGVQcm90b1xyXG5leHBvcnQgY29uc3QgVEVOU09SX1RZUEVfRUxFTV9UWVBFID0gMTtcclxuZXhwb3J0IGNvbnN0IFRFTlNPUl9UWVBFX1NIQVBFID0gMjtcclxuXHJcbi8vIFRlbnNvclNoYXBlUHJvdG8uRGltZW5zaW9uXHJcbmV4cG9ydCBjb25zdCBTSEFQRV9ESU0gPSAxO1xyXG5leHBvcnQgY29uc3QgRElNX1ZBTFVFID0gMTtcclxuZXhwb3J0IGNvbnN0IERJTV9TWU1CT0wgPSAyO1xyXG5cclxuLy8gVGVuc29yUHJvdG8gKGluaXRpYWxpemVyKVxyXG5leHBvcnQgY29uc3QgVEVOU09SX0RJTVMgPSAxO1xyXG5leHBvcnQgY29uc3QgVEVOU09SX0RBVEFfVFlQRSA9IDI7XHJcbmV4cG9ydCBjb25zdCBURU5TT1JfRkxPQVRfREFUQSA9IDQ7XHJcbmV4cG9ydCBjb25zdCBURU5TT1JfSU5UMzJfREFUQSA9IDU7XHJcbmV4cG9ydCBjb25zdCBURU5TT1JfU1RSSU5HX0RBVEEgPSA2O1xyXG5leHBvcnQgY29uc3QgVEVOU09SX0lOVDY0X0RBVEEgPSA3O1xyXG5leHBvcnQgY29uc3QgVEVOU09SX05BTUUgPSA4O1xyXG5leHBvcnQgY29uc3QgVEVOU09SX1JBV19EQVRBID0gOTtcclxuZXhwb3J0IGNvbnN0IFRFTlNPUl9ET1VCTEVfREFUQSA9IDEwO1xyXG5leHBvcnQgY29uc3QgVEVOU09SX1VJTlQ2NF9EQVRBID0gMTE7XHJcblxyXG4vLyDilIDilIDilIAgTWF4IGNvbnN0YW50cyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbmV4cG9ydCBjb25zdCBLRVlfTUFYX0xFTkdUSCA9IDEyODtcclxuZXhwb3J0IGNvbnN0IFRFTlNPUl9NQVhfRElNRU5TSU9OID0gODtcclxuXHJcbi8vIOKUgOKUgOKUgCBQYXJzZWQgc3RydWN0dXJlcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbi8qKlxyXG4gKiBBIHBhcnNlZCB0ZW5zb3IgaW5pdGlhbGl6ZXIgKHdlaWdodHMsIGJpYXNlcywgZXRjLikuXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIE9ubnhUZW5zb3JJbmZvIHtcclxuICAgIG5hbWU6IHN0cmluZztcclxuICAgIGRhdGFUeXBlOiBPbm54RGF0YVR5cGU7XHJcbiAgICBkaW1zOiBudW1iZXJbXTtcclxuICAgIGZsb2F0RGF0YT86IEZsb2F0MzJBcnJheTtcclxuICAgIHJhd0RhdGE/OiBVaW50OEFycmF5O1xyXG59XHJcblxyXG4vKipcclxuICogQSBwYXJzZWQgT05OWCBvcGVyYXRvciBub2RlLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBPbm54Tm9kZUluZm8ge1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgb3BUeXBlOiBzdHJpbmc7XHJcbiAgICBpbnB1dHM6IHN0cmluZ1tdO1xyXG4gICAgb3V0cHV0czogc3RyaW5nW107XHJcbiAgICBhdHRyaWJ1dGVzOiBNYXA8c3RyaW5nLCBudW1iZXI+OyAvLyBmbG9hdCBvciBpbnQgYXR0cmlidXRlc1xyXG4gICAgdGVuc29yQXR0cmlidXRlcz86IE1hcDxzdHJpbmcsIE9ubnhUZW5zb3JJbmZvPjsgLy8gdGVuc29yLXZhbHVlZCBhdHRyaWJ1dGVzXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBIHBhcnNlZCB2YWx1ZSBpbmZvIChncmFwaCBpbnB1dC9vdXRwdXQgd2l0aCBzaGFwZSBtZXRhZGF0YSkuXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIE9ubnhWYWx1ZUluZm8ge1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgdHlwZTogT25ueExpbmtUeXBlO1xyXG4gICAgZWxlbVR5cGU6IE9ubnhEYXRhVHlwZTtcclxuICAgIHNoYXBlOiBudW1iZXJbXTtcclxufVxyXG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIE9OTlggbW9kZWwgd3JpdGVyXG4vL1xuLy8gU3ltbWV0cmljIGNvdW50ZXJwYXJ0IHRvIG9ubngtcGFyc2VyLnRzLlxuLy8gU2VyaWFsaXplcyBhbiBPbm54UGFyc2VSZXN1bHQgYmFjayBpbnRvIGEgdmFsaWQgT05OWCBwcm90b2J1ZiBiaW5hcnksXG4vLyByZXVzaW5nIHRoZSBzYW1lIGZpZWxkIGNvbnN0YW50cyBhbmQgZGF0YSBzdHJ1Y3R1cmVzLlxuLy9cbi8vIFplcm8gZGVwZW5kZW5jaWVzIGJleW9uZCB0aGUgbG9jYWwgcGIvIHdyaXRlciBhbmQgb25ueC10eXBlcy5cbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5pbXBvcnQgeyBQQldyaXRlciB9IGZyb20gXCIuL3BiL3dyaXRlclwiO1xuaW1wb3J0IHsgV2lyZVR5cGUgfSBmcm9tIFwiLi9wYi9yZWFkZXJcIjtcbmltcG9ydCB7XG4gICAgT25ueERhdGFUeXBlLFxuICAgIE9ubnhOb2RlSW5mbyxcbiAgICBPbm54VGVuc29ySW5mbyxcbiAgICBPbm54VmFsdWVJbmZvLFxuICAgIC8vIE1vZGVsUHJvdG8gZmllbGRzXG4gICAgTU9ERUxfSVJfVkVSU0lPTixcbiAgICBNT0RFTF9HUkFQSCxcbiAgICAvLyBHcmFwaFByb3RvIGZpZWxkc1xuICAgIEdSQVBIX05PREUsXG4gICAgR1JBUEhfTkFNRSxcbiAgICBHUkFQSF9JTklUSUFMSVpFUixcbiAgICBHUkFQSF9JTlBVVCxcbiAgICBHUkFQSF9PVVRQVVQsXG4gICAgR1JBUEhfVkFMVUVfSU5GTyxcbiAgICAvLyBOb2RlUHJvdG8gZmllbGRzXG4gICAgTk9ERV9JTlBVVCxcbiAgICBOT0RFX09VVFBVVCxcbiAgICBOT0RFX05BTUUsXG4gICAgTk9ERV9PUF9UWVBFLFxuICAgIE5PREVfQVRUUklCVVRFLFxuICAgIC8vIEF0dHJpYnV0ZVByb3RvIGZpZWxkc1xuICAgIEFUVF9OQU1FLFxuICAgIEFUVF9GTE9BVCxcbiAgICBBVFRfSU5ULFxuICAgIC8vIFZhbHVlSW5mb1Byb3RvIGZpZWxkc1xuICAgIFZJTkZPX05BTUUsXG4gICAgVklORk9fVFlQRSxcbiAgICAvLyBUeXBlUHJvdG8gZmllbGRzXG4gICAgVFlQRV9URU5TT1IsXG4gICAgLy8gVGVuc29yVHlwZVByb3RvIGZpZWxkc1xuICAgIFRFTlNPUl9UWVBFX0VMRU1fVFlQRSxcbiAgICBURU5TT1JfVFlQRV9TSEFQRSxcbiAgICAvLyBTaGFwZSBmaWVsZHNcbiAgICBTSEFQRV9ESU0sXG4gICAgRElNX1ZBTFVFLFxuICAgIC8vIFRlbnNvclByb3RvIGZpZWxkc1xuICAgIFRFTlNPUl9ESU1TLFxuICAgIFRFTlNPUl9EQVRBX1RZUEUsXG4gICAgVEVOU09SX0ZMT0FUX0RBVEEsXG4gICAgVEVOU09SX05BTUUsXG4gICAgVEVOU09SX1JBV19EQVRBLFxufSBmcm9tIFwiLi9vbm54LXR5cGVzXCI7XG5pbXBvcnQgeyBPbm54UGFyc2VSZXN1bHQgfSBmcm9tIFwiLi9vbm54LXBhcnNlclwiO1xuXG4vLyDilIDilIDilIAgT25ueFdyaXRlciDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuLyoqXG4gKiBTZXJpYWxpemVzIGFuIE9ubnhQYXJzZVJlc3VsdCBpbnRvIE9OTlggcHJvdG9idWYgYmluYXJ5LlxuICpcbiAqIFVzYWdlOlxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgcmVzdWx0ID0gT25ueFBhcnNlci5wYXJzZShvcmlnaW5hbEJ5dGVzKTtcbiAqIC8vIOKApiBtb2RpZnkgcmVzdWx0IOKAplxuICogY29uc3QgYnl0ZXMgPSBPbm54V3JpdGVyLnNlcmlhbGl6ZShyZXN1bHQpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBPbm54V3JpdGVyIHtcbiAgICAvKipcbiAgICAgKiBTZXJpYWxpemUgYW4gT25ueFBhcnNlUmVzdWx0IHRvIHJhdyBPTk5YIHByb3RvYnVmIGJ5dGVzLlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgc2VyaWFsaXplKG1vZGVsOiBPbm54UGFyc2VSZXN1bHQpOiBVaW50OEFycmF5IHtcbiAgICAgICAgY29uc3Qgd3JpdGVyID0gbmV3IE9ubnhXcml0ZXIoKTtcbiAgICAgICAgcmV0dXJuIHdyaXRlci5fd3JpdGVNb2RlbChtb2RlbCk7XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIE1vZGVsIChNb2RlbFByb3RvKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIHByaXZhdGUgX3dyaXRlTW9kZWwobW9kZWw6IE9ubnhQYXJzZVJlc3VsdCk6IFVpbnQ4QXJyYXkge1xuICAgICAgICBjb25zdCB3ID0gbmV3IFBCV3JpdGVyKCk7XG5cbiAgICAgICAgLy8gaXJfdmVyc2lvbiAoZmllbGQgMSwgdmFyaW50KVxuICAgICAgICBpZiAobW9kZWwuaXJWZXJzaW9uID4gMCkge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhNT0RFTF9JUl9WRVJTSU9OLCBXaXJlVHlwZS5WQVJJTlQpO1xuICAgICAgICAgICAgdy53cml0ZUludDMyKG1vZGVsLmlyVmVyc2lvbik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBncmFwaCAoZmllbGQgNywgbGVuZ3RoLWRlbGltaXRlZClcbiAgICAgICAgdy53cml0ZVRhZyhNT0RFTF9HUkFQSCwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgdy53cml0ZVN1Yk1lc3NhZ2UoKHN1YikgPT4gdGhpcy5fd3JpdGVHcmFwaChzdWIsIG1vZGVsKSk7XG5cbiAgICAgICAgcmV0dXJuIHcuZmluaXNoKCkuc2xpY2UoKTsgLy8gZGV0YWNoIGZyb20gaW50ZXJuYWwgYnVmZmVyXG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIEdyYXBoIChHcmFwaFByb3RvKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIHByaXZhdGUgX3dyaXRlR3JhcGgodzogUEJXcml0ZXIsIG1vZGVsOiBPbm54UGFyc2VSZXN1bHQpOiB2b2lkIHtcbiAgICAgICAgLy8gbm9kZXMgKGZpZWxkIDEsIHJlcGVhdGVkKVxuICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgbW9kZWwubm9kZXMpIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoR1JBUEhfTk9ERSwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdWJNZXNzYWdlKChzdWIpID0+IHRoaXMuX3dyaXRlTm9kZShzdWIsIG5vZGUpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG5hbWUgKGZpZWxkIDIpXG4gICAgICAgIGlmIChtb2RlbC5ncmFwaE5hbWUpIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoR1JBUEhfTkFNRSwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdHJpbmcobW9kZWwuZ3JhcGhOYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGluaXRpYWxpemVycyAoZmllbGQgNSwgcmVwZWF0ZWQpXG4gICAgICAgIGZvciAoY29uc3QgaW5pdCBvZiBtb2RlbC5pbml0aWFsaXplcnMpIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoR1JBUEhfSU5JVElBTElaRVIsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlU3ViTWVzc2FnZSgoc3ViKSA9PiB0aGlzLl93cml0ZUluaXRpYWxpemVyKHN1YiwgaW5pdCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaW5wdXRzIChmaWVsZCAxMSwgcmVwZWF0ZWQpXG4gICAgICAgIGZvciAoY29uc3QgaW5wdXQgb2YgbW9kZWwuaW5wdXRzKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKEdSQVBIX0lOUFVULCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN1Yk1lc3NhZ2UoKHN1YikgPT4gdGhpcy5fd3JpdGVWYWx1ZUluZm8oc3ViLCBpbnB1dCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gb3V0cHV0cyAoZmllbGQgMTIsIHJlcGVhdGVkKVxuICAgICAgICBmb3IgKGNvbnN0IG91dHB1dCBvZiBtb2RlbC5vdXRwdXRzKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKEdSQVBIX09VVFBVVCwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdWJNZXNzYWdlKChzdWIpID0+IHRoaXMuX3dyaXRlVmFsdWVJbmZvKHN1Yiwgb3V0cHV0KSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWx1ZV9pbmZvIChmaWVsZCAxMywgcmVwZWF0ZWQpXG4gICAgICAgIGZvciAoY29uc3Qgdmkgb2YgbW9kZWwudmFsdWVJbmZvcykge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhHUkFQSF9WQUxVRV9JTkZPLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN1Yk1lc3NhZ2UoKHN1YikgPT4gdGhpcy5fd3JpdGVWYWx1ZUluZm8oc3ViLCB2aSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIE5vZGUgKE5vZGVQcm90bykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICBwcml2YXRlIF93cml0ZU5vZGUodzogUEJXcml0ZXIsIG5vZGU6IE9ubnhOb2RlSW5mbyk6IHZvaWQge1xuICAgICAgICAvLyBpbnB1dHMgKGZpZWxkIDEsIHJlcGVhdGVkIHN0cmluZylcbiAgICAgICAgZm9yIChjb25zdCBpbnB1dCBvZiBub2RlLmlucHV0cykge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhOT0RFX0lOUFVULCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN0cmluZyhpbnB1dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBvdXRwdXRzIChmaWVsZCAyLCByZXBlYXRlZCBzdHJpbmcpXG4gICAgICAgIGZvciAoY29uc3Qgb3V0cHV0IG9mIG5vZGUub3V0cHV0cykge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhOT0RFX09VVFBVVCwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdHJpbmcob3V0cHV0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG5hbWUgKGZpZWxkIDMpXG4gICAgICAgIGlmIChub2RlLm5hbWUpIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoTk9ERV9OQU1FLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN0cmluZyhub2RlLm5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gb3BfdHlwZSAoZmllbGQgNClcbiAgICAgICAgaWYgKG5vZGUub3BUeXBlKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKE5PREVfT1BfVFlQRSwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdHJpbmcobm9kZS5vcFR5cGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYXR0cmlidXRlcyAoZmllbGQgNSwgcmVwZWF0ZWQpXG4gICAgICAgIGZvciAoY29uc3QgW25hbWUsIHZhbHVlXSBvZiBub2RlLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoTk9ERV9BVFRSSUJVVEUsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlU3ViTWVzc2FnZSgoc3ViKSA9PiB0aGlzLl93cml0ZUF0dHJpYnV0ZShzdWIsIG5hbWUsIHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDilIDilIAgQXR0cmlidXRlIChBdHRyaWJ1dGVQcm90bykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICBwcml2YXRlIF93cml0ZUF0dHJpYnV0ZSh3OiBQQldyaXRlciwgbmFtZTogc3RyaW5nLCB2YWx1ZTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIC8vIG5hbWUgKGZpZWxkIDEpXG4gICAgICAgIHcud3JpdGVUYWcoQVRUX05BTUUsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgIHcud3JpdGVTdHJpbmcobmFtZSk7XG5cbiAgICAgICAgaWYgKE51bWJlci5pc0ludGVnZXIodmFsdWUpKSB7XG4gICAgICAgICAgICAvLyBpbnQgKGZpZWxkIDMsIHZhcmludCDigJQgc3RvcmVkIGFzIGludDY0IGluIE9OTlgpXG4gICAgICAgICAgICB3LndyaXRlVGFnKEFUVF9JTlQsIFdpcmVUeXBlLlZBUklOVCk7XG4gICAgICAgICAgICB3LndyaXRlSW50NjQodmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZmxvYXQgKGZpZWxkIDIsIGZpeGVkMzIpXG4gICAgICAgICAgICB3LndyaXRlVGFnKEFUVF9GTE9BVCwgV2lyZVR5cGUuRklYRUQzMik7XG4gICAgICAgICAgICB3LndyaXRlRmxvYXQodmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIFZhbHVlSW5mbyAoVmFsdWVJbmZvUHJvdG8pIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gICAgcHJpdmF0ZSBfd3JpdGVWYWx1ZUluZm8odzogUEJXcml0ZXIsIGluZm86IE9ubnhWYWx1ZUluZm8pOiB2b2lkIHtcbiAgICAgICAgLy8gbmFtZSAoZmllbGQgMSlcbiAgICAgICAgaWYgKGluZm8ubmFtZSkge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhWSU5GT19OQU1FLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN0cmluZyhpbmZvLm5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdHlwZSAoZmllbGQgMikg4oaSIFR5cGVQcm90byDihpIgdGVuc29yX3R5cGUgKGZpZWxkIDEpIOKGkiBUZW5zb3JUeXBlUHJvdG9cbiAgICAgICAgaWYgKGluZm8uZWxlbVR5cGUgIT09IE9ubnhEYXRhVHlwZS5VTkRFRklORUQgfHwgaW5mby5zaGFwZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKFZJTkZPX1RZUEUsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlU3ViTWVzc2FnZSgodHlwZVcpID0+IHtcbiAgICAgICAgICAgICAgICB0eXBlVy53cml0ZVRhZyhUWVBFX1RFTlNPUiwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgICAgICB0eXBlVy53cml0ZVN1Yk1lc3NhZ2UoKHR0VykgPT4gdGhpcy5fd3JpdGVUZW5zb3JUeXBlKHR0VywgaW5mbykpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDilIDilIAgVGVuc29yVHlwZVByb3RvIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gICAgcHJpdmF0ZSBfd3JpdGVUZW5zb3JUeXBlKHc6IFBCV3JpdGVyLCBpbmZvOiBPbm54VmFsdWVJbmZvKTogdm9pZCB7XG4gICAgICAgIC8vIGVsZW1fdHlwZSAoZmllbGQgMSwgdmFyaW50KVxuICAgICAgICBpZiAoaW5mby5lbGVtVHlwZSAhPT0gT25ueERhdGFUeXBlLlVOREVGSU5FRCkge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhURU5TT1JfVFlQRV9FTEVNX1RZUEUsIFdpcmVUeXBlLlZBUklOVCk7XG4gICAgICAgICAgICB3LndyaXRlSW50MzIoaW5mby5lbGVtVHlwZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzaGFwZSAoZmllbGQgMikg4oaSIFRlbnNvclNoYXBlUHJvdG9cbiAgICAgICAgaWYgKGluZm8uc2hhcGUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhURU5TT1JfVFlQRV9TSEFQRSwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdWJNZXNzYWdlKChzaGFwZVcpID0+IHRoaXMuX3dyaXRlVGVuc29yU2hhcGUoc2hhcGVXLCBpbmZvLnNoYXBlKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDilIDilIAgVGVuc29yU2hhcGVQcm90byDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIHByaXZhdGUgX3dyaXRlVGVuc29yU2hhcGUodzogUEJXcml0ZXIsIHNoYXBlOiBudW1iZXJbXSk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IGRpbSBvZiBzaGFwZSkge1xuICAgICAgICAgICAgLy8gZGltIChmaWVsZCAxKSDihpIgRGltZW5zaW9uUHJvdG9cbiAgICAgICAgICAgIHcud3JpdGVUYWcoU0hBUEVfRElNLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN1Yk1lc3NhZ2UoKGRpbVcpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBkaW1fdmFsdWUgKGZpZWxkIDEsIHZhcmludCBpbnQ2NClcbiAgICAgICAgICAgICAgICBkaW1XLndyaXRlVGFnKERJTV9WQUxVRSwgV2lyZVR5cGUuVkFSSU5UKTtcbiAgICAgICAgICAgICAgICBkaW1XLndyaXRlSW50NjQoZGltKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIEluaXRpYWxpemVyIChUZW5zb3JQcm90bykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICBwcml2YXRlIF93cml0ZUluaXRpYWxpemVyKHc6IFBCV3JpdGVyLCB0ZW5zb3I6IE9ubnhUZW5zb3JJbmZvKTogdm9pZCB7XG4gICAgICAgIC8vIGRpbXMgKGZpZWxkIDEsIHBhY2tlZCB2YXJpbnQpXG4gICAgICAgIGlmICh0ZW5zb3IuZGltcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKFRFTlNPUl9ESU1TLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgY29uc3QgZGltczMyID0gbmV3IEludDMyQXJyYXkodGVuc29yLmRpbXMpO1xuICAgICAgICAgICAgdy53cml0ZVBhY2tlZEludDMyKGRpbXMzMiwgZGltczMyLmxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkYXRhX3R5cGUgKGZpZWxkIDIsIHZhcmludClcbiAgICAgICAgdy53cml0ZVRhZyhURU5TT1JfREFUQV9UWVBFLCBXaXJlVHlwZS5WQVJJTlQpO1xuICAgICAgICB3LndyaXRlSW50MzIodGVuc29yLmRhdGFUeXBlKTtcblxuICAgICAgICAvLyBmbG9hdF9kYXRhIChmaWVsZCA0LCBwYWNrZWQgZmxvYXQzMikgb3IgcmF3X2RhdGEgKGZpZWxkIDksIGJ5dGVzKVxuICAgICAgICBpZiAodGVuc29yLmZsb2F0RGF0YSAmJiB0ZW5zb3IuZmxvYXREYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoVEVOU09SX0ZMT0FUX0RBVEEsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlUGFja2VkRmxvYXQzMih0ZW5zb3IuZmxvYXREYXRhLCB0ZW5zb3IuZmxvYXREYXRhLmxlbmd0aCk7XG4gICAgICAgIH0gZWxzZSBpZiAodGVuc29yLnJhd0RhdGEgJiYgdGVuc29yLnJhd0RhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhURU5TT1JfUkFXX0RBVEEsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlQnl0ZXModGVuc29yLnJhd0RhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbmFtZSAoZmllbGQgOClcbiAgICAgICAgaWYgKHRlbnNvci5uYW1lKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKFRFTlNPUl9OQU1FLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN0cmluZyh0ZW5zb3IubmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IElUZW5zb3IgfSBmcm9tIFwiLi4vLi4vY29tcHV0ZS9jb21wdXRlLmludGVyZmFjZXNcIjtcclxuaW1wb3J0IHsgT25ueE9wTm9kZSwgbWFrZVRlbnNvciwgT25ueE9wUmVnaXN0cnkgfSBmcm9tIFwiLi4vcmVnaXN0cnlcIjtcclxuaW1wb3J0IHR5cGUgeyBPbm54Tm9kZUluZm8gfSBmcm9tIFwiLi4vb25ueC10eXBlc1wiO1xyXG5cclxuZnVuY3Rpb24gdW5hcnlNYXAoaW5wOiBJVGVuc29yLCBmbjogKHg6IG51bWJlcikgPT4gbnVtYmVyKTogSVRlbnNvciB7XHJcbiAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGlucC5kYXRhLmxlbmd0aCk7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucC5kYXRhLmxlbmd0aDsgaSsrKSBvdXRbaV0gPSBmbihpbnAuZGF0YVtpXSk7XHJcbiAgICByZXR1cm4gbWFrZVRlbnNvcihvdXQsIFsuLi5pbnAuc2hhcGVdKTtcclxufVxyXG5cclxuY2xhc3MgUmVsdU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnB1dHNbMF0sICh4KSA9PiBNYXRoLm1heCgwLCB4KSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBTaWdtb2lkTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICByZXR1cm4gW3VuYXJ5TWFwKGlucHV0c1swXSwgKHgpID0+IDEgLyAoMSArIE1hdGguZXhwKC14KSkpXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgVGFuaE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnB1dHNbMF0sIE1hdGgudGFuaCldO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBMZWFreVJlbHVOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFscGhhOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKGluZm8pO1xyXG4gICAgICAgIHRoaXMuYWxwaGEgPSB0aGlzLmF0dHIoXCJhbHBoYVwiLCAwLjAxKTtcclxuICAgIH1cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGEgPSB0aGlzLmFscGhhO1xyXG4gICAgICAgIHJldHVybiBbdW5hcnlNYXAoaW5wdXRzWzBdLCAoeCkgPT4gKHggPj0gMCA/IHggOiBhICogeCkpXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQ2xpcE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgbWluID0gaW5wdXRzLmxlbmd0aCA+PSAyICYmIGlucHV0c1sxXSA/IGlucHV0c1sxXS5kYXRhWzBdIDogLUluZmluaXR5O1xyXG4gICAgICAgIGNvbnN0IG1heCA9IGlucHV0cy5sZW5ndGggPj0gMyAmJiBpbnB1dHNbMl0gPyBpbnB1dHNbMl0uZGF0YVswXSA6IEluZmluaXR5O1xyXG4gICAgICAgIHJldHVybiBbdW5hcnlNYXAoaW5wdXRzWzBdLCAoeCkgPT4gTWF0aC5taW4oTWF0aC5tYXgoeCwgbWluKSwgbWF4KSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBTb2Z0bWF4Tm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBheGlzOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKGluZm8pO1xyXG4gICAgICAgIHRoaXMuYXhpcyA9IHRoaXMuYXR0ckludChcImF4aXNcIiwgLTEpO1xyXG4gICAgfVxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgaW5wID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IHNoYXBlID0gaW5wLnNoYXBlO1xyXG4gICAgICAgIGNvbnN0IHJhbmsgPSBzaGFwZS5sZW5ndGg7XHJcbiAgICAgICAgY29uc3QgYXhpcyA9IHRoaXMuYXhpcyA8IDAgPyByYW5rICsgdGhpcy5heGlzIDogdGhpcy5heGlzO1xyXG5cclxuICAgICAgICBpZiAocmFuayA8PSAxIHx8IGF4aXMgPT09IHJhbmsgLSAxKSB7XHJcbiAgICAgICAgICAgIC8vIFNvZnRtYXggb3ZlciBsYXN0IGRpbVxyXG4gICAgICAgICAgICBjb25zdCBjb2xzID0gc2hhcGVbcmFuayAtIDFdID8/IGlucC5kYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3Qgcm93cyA9IGlucC5kYXRhLmxlbmd0aCAvIGNvbHM7XHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoaW5wLmRhdGEubGVuZ3RoKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCByb3dzOyByKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCBtYXhWYWwgPSAtSW5maW5pdHk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMrKykgbWF4VmFsID0gTWF0aC5tYXgobWF4VmFsLCBpbnAuZGF0YVtyICogY29scyArIGNdKTtcclxuICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCBjb2xzOyBjKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBvdXRbciAqIGNvbHMgKyBjXSA9IE1hdGguZXhwKGlucC5kYXRhW3IgKiBjb2xzICsgY10gLSBtYXhWYWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN1bSArPSBvdXRbciAqIGNvbHMgKyBjXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgY29sczsgYysrKSBvdXRbciAqIGNvbHMgKyBjXSAvPSBzdW07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgWy4uLnNoYXBlXSldO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBGYWxsYmFjazogZmxhdHRlbiBzb2Z0bWF4XHJcbiAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnAsICh4KSA9PiB4KV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEV4cE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnB1dHNbMF0sIE1hdGguZXhwKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIExvZ05vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnB1dHNbMF0sIE1hdGgubG9nKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFNxcnROb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIHJldHVybiBbdW5hcnlNYXAoaW5wdXRzWzBdLCBNYXRoLnNxcnQpXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQWJzTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICByZXR1cm4gW3VuYXJ5TWFwKGlucHV0c1swXSwgTWF0aC5hYnMpXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgTmVnTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICByZXR1cm4gW3VuYXJ5TWFwKGlucHV0c1swXSwgKHgpID0+IC14KV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckFjdGl2YXRpb25PcHMocmVnaXN0cnk6IE9ubnhPcFJlZ2lzdHJ5KTogdm9pZCB7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlJlbHVcIiwgKGluZm8pID0+IG5ldyBSZWx1Tm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlNpZ21vaWRcIiwgKGluZm8pID0+IG5ldyBTaWdtb2lkTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlRhbmhcIiwgKGluZm8pID0+IG5ldyBUYW5oTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkxlYWt5UmVsdVwiLCAoaW5mbykgPT4gbmV3IExlYWt5UmVsdU5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJDbGlwXCIsIChpbmZvKSA9PiBuZXcgQ2xpcE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTb2Z0bWF4XCIsIChpbmZvKSA9PiBuZXcgU29mdG1heE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJFeHBcIiwgKGluZm8pID0+IG5ldyBFeHBOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiTG9nXCIsIChpbmZvKSA9PiBuZXcgTG9nTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlNxcnRcIiwgKGluZm8pID0+IG5ldyBTcXJ0Tm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkFic1wiLCAoaW5mbykgPT4gbmV3IEFic05vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJOZWdcIiwgKGluZm8pID0+IG5ldyBOZWdOb2RlKGluZm8pKTtcclxufVxyXG4iLCJpbXBvcnQgdHlwZSB7IElUZW5zb3IgfSBmcm9tIFwiLi4vLi4vY29tcHV0ZS9jb21wdXRlLmludGVyZmFjZXNcIjtcclxuaW1wb3J0IHR5cGUgeyBPbm54Tm9kZUluZm8gfSBmcm9tIFwiLi4vb25ueC10eXBlc1wiO1xyXG5pbXBvcnQgeyBPbm54T3BOb2RlLCBtYWtlVGVuc29yLCBPbm54T3BSZWdpc3RyeSB9IGZyb20gXCIuLi9yZWdpc3RyeVwiO1xyXG5cclxuLyoqXHJcbiAqIENvbnY6IDJEIGNvbnZvbHV0aW9uLlxyXG4gKiBJbnB1dDogW04sIENfaW4sIEgsIFddIChidXQgd2Ugc3VwcG9ydCBbTiwgQ19pbiwgTF0gZm9yIDFEIGFuZCBbTiwgQ19pbiwgSCwgV10gZm9yIDJEKVxyXG4gKiBMaW1pdGVkIHRvIDJEIHRlbnNvcnMgbGF5b3V0OiBbYmF0Y2gsIGNoYW5uZWxzLCBoZWlnaHQsIHdpZHRoXSDihpIgdHJlYXRlZCBhcyBbYmF0Y2gsIGZlYXR1cmVzXS5cclxuICpcclxuICogRm9yIG91ciAyRC1saW1pdGVkIHNjb3BlOiBpbnB1dCBpcyBbMSwgQ19pbiAqIEggKiBXXSwga2VybmVsIGlzIFtDX291dCwgQ19pbiwga0gsIGtXXS5cclxuICogU2ltcGxpZmllZDogdHJlYXRzIGFzIG1hdHJpeCBtdWx0aXBseSBpZiBzaGFwZXMgYXJlIDJELlxyXG4gKi9cclxuY2xhc3MgQ29udk5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkga2VybmVsU2hhcGU6IG51bWJlcltdO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdHJpZGVzOiBudW1iZXJbXTtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFkczogbnVtYmVyW107XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmtlcm5lbFNoYXBlID0gW3RoaXMuYXR0ckludChcImtlcm5lbF9zaGFwZVwiLCAzKV07XHJcbiAgICAgICAgdGhpcy5zdHJpZGVzID0gW3RoaXMuYXR0ckludChcInN0cmlkZXNcIiwgMSldO1xyXG4gICAgICAgIHRoaXMucGFkcyA9IFt0aGlzLmF0dHJJbnQoXCJwYWRzXCIsIDApXTtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBYID0gaW5wdXRzWzBdOyAvLyBbTiwgQ19pbiwgLi4uc3BhdGlhbF1cclxuICAgICAgICBjb25zdCBXID0gaW5wdXRzWzFdOyAvLyBbQ19vdXQsIENfaW4vZ3JvdXAsIC4uLmtlcm5lbF1cclxuICAgICAgICBjb25zdCBCID0gaW5wdXRzLmxlbmd0aCA+IDIgPyBpbnB1dHNbMl0gOiBudWxsO1xyXG5cclxuICAgICAgICAvLyBTaW1wbGlmaWVkIDFEIGNvbnZvbHV0aW9uIGZvciAyRCB0ZW5zb3JzIFtiYXRjaCwgZmVhdHVyZXNdXHJcbiAgICAgICAgaWYgKFguc2hhcGUubGVuZ3RoIDw9IDIpIHtcclxuICAgICAgICAgICAgY29uc3QgZmVhdHVyZXMgPSBYLnNoYXBlLmxlbmd0aCA9PT0gMiA/IFguc2hhcGVbMV0gOiBYLmRhdGEubGVuZ3RoO1xyXG4gICAgICAgICAgICBjb25zdCBvdXRGZWF0dXJlcyA9IFcuc2hhcGVbMF0gPz8gVy5kYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBYLnNoYXBlWzBdID8/IDE7XHJcblxyXG4gICAgICAgICAgICAvLyBUcmVhdCBhcyBmdWxseSBjb25uZWN0ZWQ6IG91dCA9IFggQCBXXlQgKyBCXHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoYmF0Y2ggKiBvdXRGZWF0dXJlcyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHdDb2xzID0gVy5kYXRhLmxlbmd0aCAvIG91dEZlYXR1cmVzO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IGJhdGNoOyBuKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IG8gPSAwOyBvIDwgb3V0RmVhdHVyZXM7IG8rKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtMZW4gPSBNYXRoLm1pbih3Q29scywgZmVhdHVyZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwga0xlbjsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1bSArPSBYLmRhdGFbbiAqIGZlYXR1cmVzICsgaV0gKiBXLmRhdGFbbyAqIHdDb2xzICsgaV07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChCKSBzdW0gKz0gQi5kYXRhW28gJSBCLmRhdGEubGVuZ3RoXTtcclxuICAgICAgICAgICAgICAgICAgICBvdXRbbiAqIG91dEZlYXR1cmVzICsgb10gPSBzdW07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW2JhdGNoLCBvdXRGZWF0dXJlc10pXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIDNEOiBbTiwgQ19pbiwgTF0g4oaSIDFEIGNvbnZcclxuICAgICAgICBjb25zdCBOID0gWC5zaGFwZVswXTtcclxuICAgICAgICBjb25zdCBDX2luID0gWC5zaGFwZVsxXTtcclxuICAgICAgICBjb25zdCBMID0gWC5zaGFwZVsyXTtcclxuICAgICAgICBjb25zdCBDX291dCA9IFcuc2hhcGVbMF07XHJcbiAgICAgICAgY29uc3Qga0wgPSBXLnNoYXBlLmxlbmd0aCA+PSAzID8gVy5zaGFwZVsyXSA6IHRoaXMua2VybmVsU2hhcGVbMF07XHJcbiAgICAgICAgY29uc3Qgc3RyaWRlID0gdGhpcy5zdHJpZGVzWzBdO1xyXG4gICAgICAgIGNvbnN0IHBhZCA9IHRoaXMucGFkc1swXTtcclxuICAgICAgICBjb25zdCBvdXRMID0gTWF0aC5mbG9vcigoTCArIDIgKiBwYWQgLSBrTCkgLyBzdHJpZGUpICsgMTtcclxuXHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShOICogQ19vdXQgKiBvdXRMKTtcclxuICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IE47IG4rKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjbyA9IDA7IGNvIDwgQ19vdXQ7IGNvKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IG9sID0gMDsgb2wgPCBvdXRMOyBvbCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgY2kgPSAwOyBjaSA8IENfaW47IGNpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQga2sgPSAwOyBrayA8IGtMOyBraysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbCA9IG9sICogc3RyaWRlIC0gcGFkICsga2s7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWwgPj0gMCAmJiBpbCA8IEwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdW0gKz0gWC5kYXRhW24gKiBDX2luICogTCArIGNpICogTCArIGlsXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIFcuZGF0YVtjbyAqIChDX2luICoga0wpICsgY2kgKiBrTCArIGtrXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoQikgc3VtICs9IEIuZGF0YVtjb107XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W24gKiBDX291dCAqIG91dEwgKyBjbyAqIG91dEwgKyBvbF0gPSBzdW07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW04sIENfb3V0LCBvdXRMXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogTWF4UG9vbDogbWF4IHBvb2xpbmcgb3ZlciBsYXN0IHNwYXRpYWwgZGltZW5zaW9uKHMpLlxyXG4gKiBTdXBwb3J0cyAxRCBbTiwgQywgTF0gYW5kIDJEIGZhbGxiYWNrLlxyXG4gKi9cclxuY2xhc3MgTWF4UG9vbE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkga2VybmVsU2l6ZTogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdHJpZGU6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFkOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmtlcm5lbFNpemUgPSB0aGlzLmF0dHJJbnQoXCJrZXJuZWxfc2hhcGVcIiwgMik7XHJcbiAgICAgICAgdGhpcy5zdHJpZGUgPSB0aGlzLmF0dHJJbnQoXCJzdHJpZGVzXCIsIHRoaXMua2VybmVsU2l6ZSk7XHJcbiAgICAgICAgdGhpcy5wYWQgPSB0aGlzLmF0dHJJbnQoXCJwYWRzXCIsIDApO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF07XHJcbiAgICAgICAgaWYgKFguc2hhcGUubGVuZ3RoID09PSAzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFtOLCBDLCBMXSA9IFguc2hhcGU7XHJcbiAgICAgICAgICAgIGNvbnN0IG91dEwgPSBNYXRoLmZsb29yKChMICsgMiAqIHRoaXMucGFkIC0gdGhpcy5rZXJuZWxTaXplKSAvIHRoaXMuc3RyaWRlKSArIDE7XHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoTiAqIEMgKiBvdXRMKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgQzsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgbyA9IDA7IG8gPCBvdXRMOyBvKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1heCA9IC1JbmZpbml0eTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCB0aGlzLmtlcm5lbFNpemU7IGsrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWwgPSBvICogdGhpcy5zdHJpZGUgLSB0aGlzLnBhZCArIGs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWwgPj0gMCAmJiBpbCA8IEwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXggPSBNYXRoLm1heChtYXgsIFguZGF0YVtuICogQyAqIEwgKyBjICogTCArIGlsXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0W24gKiBDICogb3V0TCArIGMgKiBvdXRMICsgb10gPSBtYXg7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtOLCBDLCBvdXRMXSldO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyAyRCBmYWxsYmFjazogcGFzc3Rocm91Z2hcclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShYLmRhdGEpLCBbLi4uWC5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEF2ZXJhZ2VQb29sOiBhdmVyYWdlIHBvb2xpbmcuXHJcbiAqL1xyXG5jbGFzcyBBdmVyYWdlUG9vbE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkga2VybmVsU2l6ZTogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdHJpZGU6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFkOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmtlcm5lbFNpemUgPSB0aGlzLmF0dHJJbnQoXCJrZXJuZWxfc2hhcGVcIiwgMik7XHJcbiAgICAgICAgdGhpcy5zdHJpZGUgPSB0aGlzLmF0dHJJbnQoXCJzdHJpZGVzXCIsIHRoaXMua2VybmVsU2l6ZSk7XHJcbiAgICAgICAgdGhpcy5wYWQgPSB0aGlzLmF0dHJJbnQoXCJwYWRzXCIsIDApO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF07XHJcbiAgICAgICAgaWYgKFguc2hhcGUubGVuZ3RoID09PSAzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFtOLCBDLCBMXSA9IFguc2hhcGU7XHJcbiAgICAgICAgICAgIGNvbnN0IG91dEwgPSBNYXRoLmZsb29yKChMICsgMiAqIHRoaXMucGFkIC0gdGhpcy5rZXJuZWxTaXplKSAvIHRoaXMuc3RyaWRlKSArIDE7XHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoTiAqIEMgKiBvdXRMKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgQzsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgbyA9IDA7IG8gPCBvdXRMOyBvKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN1bSA9IDAsIGNvdW50ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCB0aGlzLmtlcm5lbFNpemU7IGsrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWwgPSBvICogdGhpcy5zdHJpZGUgLSB0aGlzLnBhZCArIGs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWwgPj0gMCAmJiBpbCA8IEwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdW0gKz0gWC5kYXRhW24gKiBDICogTCArIGMgKiBMICsgaWxdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0W24gKiBDICogb3V0TCArIGMgKiBvdXRMICsgb10gPSBjb3VudCA+IDAgPyBzdW0gLyBjb3VudCA6IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtOLCBDLCBvdXRMXSldO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShYLmRhdGEpLCBbLi4uWC5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEdsb2JhbEF2ZXJhZ2VQb29sOiBhdmVyYWdlIG92ZXIgYWxsIHNwYXRpYWwgZGltcyDihpIgW04sIEMsIDFdIG9yIFtOLCBDXS5cclxuICovXHJcbmNsYXNzIEdsb2JhbEF2ZXJhZ2VQb29sTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBYID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGlmIChYLnNoYXBlLmxlbmd0aCA+PSAzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IE4gPSBYLnNoYXBlWzBdO1xyXG4gICAgICAgICAgICBjb25zdCBDID0gWC5zaGFwZVsxXTtcclxuICAgICAgICAgICAgbGV0IHNwYXRpYWwgPSAxO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8IFguc2hhcGUubGVuZ3RoOyBpKyspIHNwYXRpYWwgKj0gWC5zaGFwZVtpXTtcclxuICAgICAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShOICogQyk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgTjsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IEM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJhc2UgPSBuICogQyAqIHNwYXRpYWwgKyBjICogc3BhdGlhbDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBzID0gMDsgcyA8IHNwYXRpYWw7IHMrKykgc3VtICs9IFguZGF0YVtiYXNlICsgc107XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W24gKiBDICsgY10gPSBzdW0gLyBzcGF0aWFsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IG91dFNoYXBlID0gW04sIEMsIC4uLlguc2hhcGUuc2xpY2UoMikubWFwKCgpID0+IDEpXTtcclxuICAgICAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgb3V0U2hhcGUpXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoWC5kYXRhKSwgWy4uLlguc2hhcGVdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckNvbnZPcHMocmVnaXN0cnk6IE9ubnhPcFJlZ2lzdHJ5KTogdm9pZCB7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkNvbnZcIiwgKGluZm8pID0+IG5ldyBDb252Tm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIk1heFBvb2xcIiwgKGluZm8pID0+IG5ldyBNYXhQb29sTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkF2ZXJhZ2VQb29sXCIsIChpbmZvKSA9PiBuZXcgQXZlcmFnZVBvb2xOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiR2xvYmFsQXZlcmFnZVBvb2xcIiwgKGluZm8pID0+IG5ldyBHbG9iYWxBdmVyYWdlUG9vbE5vZGUoaW5mbykpO1xyXG59XHJcbiIsImV4cG9ydCB7IHJlZ2lzdGVyTWF0aE9wcyB9IGZyb20gXCIuL21hdGhcIjtcclxuZXhwb3J0IHsgcmVnaXN0ZXJBY3RpdmF0aW9uT3BzIH0gZnJvbSBcIi4vYWN0aXZhdGlvbnNcIjtcclxuZXhwb3J0IHsgcmVnaXN0ZXJNYXRyaXhPcHMgfSBmcm9tIFwiLi9tYXRyaXhcIjtcclxuZXhwb3J0IHsgcmVnaXN0ZXJDb252T3BzIH0gZnJvbSBcIi4vY29udlwiO1xyXG5leHBvcnQgeyByZWdpc3Rlck5vcm1PcHMgfSBmcm9tIFwiLi9ub3JtYWxpemF0aW9uXCI7XHJcbmV4cG9ydCB7IHJlZ2lzdGVyUmVjdXJyZW50T3BzIH0gZnJvbSBcIi4vcmVjdXJyZW50XCI7XHJcbmV4cG9ydCB7IHJlZ2lzdGVyTWlzY09wcyB9IGZyb20gXCIuL21pc2NcIjtcclxuZXhwb3J0IHsgcmVnaXN0ZXJTcGlreVBhbmRhT3BzIH0gZnJvbSBcIi4vc3Bpa3lwYW5kYVwiO1xyXG5cclxuaW1wb3J0IHsgT25ueE9wUmVnaXN0cnkgfSBmcm9tIFwiLi4vcmVnaXN0cnlcIjtcclxuaW1wb3J0IHsgcmVnaXN0ZXJNYXRoT3BzIH0gZnJvbSBcIi4vbWF0aFwiO1xyXG5pbXBvcnQgeyByZWdpc3RlckFjdGl2YXRpb25PcHMgfSBmcm9tIFwiLi9hY3RpdmF0aW9uc1wiO1xyXG5pbXBvcnQgeyByZWdpc3Rlck1hdHJpeE9wcyB9IGZyb20gXCIuL21hdHJpeFwiO1xyXG5pbXBvcnQgeyByZWdpc3RlckNvbnZPcHMgfSBmcm9tIFwiLi9jb252XCI7XHJcbmltcG9ydCB7IHJlZ2lzdGVyTm9ybU9wcyB9IGZyb20gXCIuL25vcm1hbGl6YXRpb25cIjtcclxuaW1wb3J0IHsgcmVnaXN0ZXJSZWN1cnJlbnRPcHMgfSBmcm9tIFwiLi9yZWN1cnJlbnRcIjtcclxuaW1wb3J0IHsgcmVnaXN0ZXJNaXNjT3BzIH0gZnJvbSBcIi4vbWlzY1wiO1xyXG5pbXBvcnQgeyByZWdpc3RlclNwaWt5UGFuZGFPcHMgfSBmcm9tIFwiLi9zcGlreXBhbmRhXCI7XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGEgcmVnaXN0cnkgd2l0aCBhbGwgZ2VuZXJpYyBPTk5YIG9wcyByZWdpc3RlcmVkLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURlZmF1bHRSZWdpc3RyeSgpOiBPbm54T3BSZWdpc3RyeSB7XHJcbiAgICBjb25zdCByZWdpc3RyeSA9IG5ldyBPbm54T3BSZWdpc3RyeSgpO1xyXG4gICAgcmVnaXN0ZXJNYXRoT3BzKHJlZ2lzdHJ5KTtcclxuICAgIHJlZ2lzdGVyQWN0aXZhdGlvbk9wcyhyZWdpc3RyeSk7XHJcbiAgICByZWdpc3Rlck1hdHJpeE9wcyhyZWdpc3RyeSk7XHJcbiAgICByZWdpc3RlckNvbnZPcHMocmVnaXN0cnkpO1xyXG4gICAgcmVnaXN0ZXJOb3JtT3BzKHJlZ2lzdHJ5KTtcclxuICAgIHJlZ2lzdGVyUmVjdXJyZW50T3BzKHJlZ2lzdHJ5KTtcclxuICAgIHJlZ2lzdGVyTWlzY09wcyhyZWdpc3RyeSk7XHJcbiAgICByZXR1cm4gcmVnaXN0cnk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgYSByZWdpc3RyeSB3aXRoIGFsbCBvcHMgKyBTcGlreVBhbmRhIG5hdGl2ZSBvdmVycmlkZXMgYXQgaGlnaGVyIHByaW9yaXR5LlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNwaWt5UGFuZGFSZWdpc3RyeSgpOiBPbm54T3BSZWdpc3RyeSB7XHJcbiAgICBjb25zdCByZWdpc3RyeSA9IGNyZWF0ZURlZmF1bHRSZWdpc3RyeSgpO1xyXG4gICAgcmVnaXN0ZXJTcGlreVBhbmRhT3BzKHJlZ2lzdHJ5KTtcclxuICAgIHJldHVybiByZWdpc3RyeTtcclxufVxyXG4iLCJpbXBvcnQgdHlwZSB7IElUZW5zb3IgfSBmcm9tIFwiLi4vLi4vY29tcHV0ZS9jb21wdXRlLmludGVyZmFjZXNcIjtcclxuaW1wb3J0IHR5cGUgeyBPbm54Tm9kZUluZm8gfSBmcm9tIFwiLi4vb25ueC10eXBlc1wiO1xyXG5pbXBvcnQgeyBPbm54T3BOb2RlLCBtYWtlVGVuc29yLCBPbm54T3BSZWdpc3RyeSB9IGZyb20gXCIuLi9yZWdpc3RyeVwiO1xyXG5cclxuLy8g4pSA4pSA4pSAIEhlbHBlcnMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4vKiogQ29tcHV0ZSB0b3RhbCBlbGVtZW50IGNvdW50IGZyb20gc2hhcGUuICovXHJcbmZ1bmN0aW9uIHNpemUoc2hhcGU6IG51bWJlcltdKTogbnVtYmVyIHtcclxuICAgIGxldCBzID0gMTtcclxuICAgIGZvciAoY29uc3QgZCBvZiBzaGFwZSkgcyAqPSBNYXRoLm1heChkLCAxKTtcclxuICAgIHJldHVybiBzO1xyXG59XHJcblxyXG4vKipcclxuICogQnJvYWRjYXN0IHR3byBzaGFwZXMgKHVwIHRvIDNEKS4gUmV0dXJucyB0aGUgYnJvYWRjYXN0IHJlc3VsdCBzaGFwZS5cclxuICogRm9sbG93cyBudW1weSBicm9hZGNhc3RpbmcgcnVsZXM6IGFsaWduIHJpZ2h0LCBleHBhbmQgZGltcyBvZiBzaXplIDEuXHJcbiAqL1xyXG5mdW5jdGlvbiBicm9hZGNhc3RTaGFwZShhOiBudW1iZXJbXSwgYjogbnVtYmVyW10pOiBudW1iZXJbXSB7XHJcbiAgICBjb25zdCByYW5rID0gTWF0aC5tYXgoYS5sZW5ndGgsIGIubGVuZ3RoKTtcclxuICAgIGNvbnN0IG91dDogbnVtYmVyW10gPSBuZXcgQXJyYXkocmFuayk7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJhbms7IGkrKykge1xyXG4gICAgICAgIGNvbnN0IGRhID0gYVthLmxlbmd0aCAtIHJhbmsgKyBpXSA/PyAxO1xyXG4gICAgICAgIGNvbnN0IGRiID0gYltiLmxlbmd0aCAtIHJhbmsgKyBpXSA/PyAxO1xyXG4gICAgICAgIGlmIChkYSAhPT0gZGIgJiYgZGEgIT09IDEgJiYgZGIgIT09IDEpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgYnJvYWRjYXN0IHNoYXBlcyBbJHthfV0gYW5kIFske2J9XWApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBvdXRbaV0gPSBNYXRoLm1heChkYSwgZGIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG91dDtcclxufVxyXG5cclxuLyoqIE1hcCBhIGZsYXQgaW5kZXggaW4gdGhlIGJyb2FkY2FzdCBvdXRwdXQgYmFjayB0byBhIGZsYXQgaW5kZXggaW4gYSBzb3VyY2UgdGVuc29yLiAqL1xyXG5mdW5jdGlvbiBicm9hZGNhc3RJbmRleChmbGF0SWR4OiBudW1iZXIsIG91dFNoYXBlOiBudW1iZXJbXSwgc3JjU2hhcGU6IG51bWJlcltdKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IHJhbmsgPSBvdXRTaGFwZS5sZW5ndGg7XHJcbiAgICBsZXQgaWR4ID0gMDtcclxuICAgIGxldCBzdHJpZGUgPSAxO1xyXG4gICAgZm9yIChsZXQgaSA9IHJhbmsgLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIGNvbnN0IGNvb3JkID0gTWF0aC5mbG9vcihmbGF0SWR4IC8gc3RyaWRlb2Yob3V0U2hhcGUsIGkpKSAlIG91dFNoYXBlW2ldO1xyXG4gICAgICAgIGNvbnN0IHNyY0RpbSA9IHNyY1NoYXBlW3NyY1NoYXBlLmxlbmd0aCAtIHJhbmsgKyBpXSA/PyAxO1xyXG4gICAgICAgIGNvbnN0IHNyY0Nvb3JkID0gc3JjRGltID09PSAxID8gMCA6IGNvb3JkO1xyXG4gICAgICAgIGlkeCArPSBzcmNDb29yZCAqIHN0cmlkZTtcclxuICAgICAgICBzdHJpZGUgKj0gc3JjRGltO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGlkeDtcclxufVxyXG5cclxuZnVuY3Rpb24gc3RyaWRlb2Yoc2hhcGU6IG51bWJlcltdLCBkaW06IG51bWJlcik6IG51bWJlciB7XHJcbiAgICBsZXQgcyA9IDE7XHJcbiAgICBmb3IgKGxldCBpID0gZGltICsgMTsgaSA8IHNoYXBlLmxlbmd0aDsgaSsrKSBzICo9IHNoYXBlW2ldO1xyXG4gICAgcmV0dXJuIHM7XHJcbn1cclxuXHJcbi8qKiBFbGVtZW50LXdpc2UgYmluYXJ5IG9wIHdpdGggYnJvYWRjYXN0aW5nLiAqL1xyXG5mdW5jdGlvbiBiaW5hcnlPcChhOiBJVGVuc29yLCBiOiBJVGVuc29yLCBmbjogKHg6IG51bWJlciwgeTogbnVtYmVyKSA9PiBudW1iZXIpOiBJVGVuc29yIHtcclxuICAgIGNvbnN0IG91dFNoYXBlID0gYnJvYWRjYXN0U2hhcGUoYS5zaGFwZSwgYi5zaGFwZSk7XHJcbiAgICBjb25zdCBvdXRTaXplID0gc2l6ZShvdXRTaGFwZSk7XHJcbiAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KG91dFNpemUpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRTaXplOyBpKyspIHtcclxuICAgICAgICBjb25zdCBhaSA9IGJyb2FkY2FzdEluZGV4KGksIG91dFNoYXBlLCBhLnNoYXBlKTtcclxuICAgICAgICBjb25zdCBiaSA9IGJyb2FkY2FzdEluZGV4KGksIG91dFNoYXBlLCBiLnNoYXBlKTtcclxuICAgICAgICBvdXRbaV0gPSBmbihhLmRhdGFbYWldLCBiLmRhdGFbYmldKTtcclxuICAgIH1cclxuICAgIHJldHVybiBtYWtlVGVuc29yKG91dCwgb3V0U2hhcGUpO1xyXG59XHJcblxyXG4vLyDilIDilIDilIAgT3BzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuY2xhc3MgTXVsTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICByZXR1cm4gW2JpbmFyeU9wKGlucHV0c1swXSwgaW5wdXRzWzFdLCAoYSwgYikgPT4gYSAqIGIpXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU3ViTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICByZXR1cm4gW2JpbmFyeU9wKGlucHV0c1swXSwgaW5wdXRzWzFdLCAoYSwgYikgPT4gYSAtIGIpXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQWRkTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICByZXR1cm4gW2JpbmFyeU9wKGlucHV0c1swXSwgaW5wdXRzWzFdLCAoYSwgYikgPT4gYSArIGIpXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQXRhbk5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgYSA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGEuZGF0YS5sZW5ndGgpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5kYXRhLmxlbmd0aDsgaSsrKSBvdXRbaV0gPSBNYXRoLmF0YW4oYS5kYXRhW2ldKTtcclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbLi4uYS5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbW06IFkgPSBhbHBoYSAqIEEgQCBCICsgYmV0YSAqIENcclxuICogQSBpcyBbTSwgS10sIEIgaXMgW0ssIE5dLCBDIGlzIGJyb2FkY2FzdGFibGUgdG8gW00sIE5dLlxyXG4gKi9cclxuY2xhc3MgR2VtbU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYWxwaGE6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYmV0YTogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0cmFuc0E6IGJvb2xlYW47XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRyYW5zQjogYm9vbGVhbjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5vZGVJbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihub2RlSW5mbyk7XHJcbiAgICAgICAgdGhpcy5hbHBoYSA9IHRoaXMuYXR0cihcImFscGhhXCIsIDEuMCk7XHJcbiAgICAgICAgdGhpcy5iZXRhID0gdGhpcy5hdHRyKFwiYmV0YVwiLCAxLjApO1xyXG4gICAgICAgIHRoaXMudHJhbnNBID0gdGhpcy5hdHRySW50KFwidHJhbnNBXCIsIDApICE9PSAwO1xyXG4gICAgICAgIHRoaXMudHJhbnNCID0gdGhpcy5hdHRySW50KFwidHJhbnNCXCIsIDApICE9PSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IEEgPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3QgQiA9IGlucHV0c1sxXTtcclxuICAgICAgICBjb25zdCBDID0gaW5wdXRzLmxlbmd0aCA+IDIgPyBpbnB1dHNbMl0gOiBudWxsO1xyXG5cclxuICAgICAgICAvLyBJbmZlciBNLCBLLCBOIGZyb20gYWN0dWFsIHRlbnNvciBkYXRhICsgc2hhcGVzXHJcbiAgICAgICAgY29uc3QgYVJvd3MgPSBBLnNoYXBlLmxlbmd0aCA+PSAyID8gQS5zaGFwZVswXSA6IDE7XHJcbiAgICAgICAgY29uc3QgYUNvbHMgPSBBLnNoYXBlLmxlbmd0aCA+PSAyID8gQS5zaGFwZVsxXSA6IEEuZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgY29uc3QgYlJvd3MgPSBCLnNoYXBlLmxlbmd0aCA+PSAyID8gQi5zaGFwZVswXSA6IDE7XHJcbiAgICAgICAgY29uc3QgYkNvbHMgPSBCLnNoYXBlLmxlbmd0aCA+PSAyID8gQi5zaGFwZVsxXSA6IEIuZGF0YS5sZW5ndGg7XHJcblxyXG4gICAgICAgIGNvbnN0IE0gPSB0aGlzLnRyYW5zQSA/IGFDb2xzIDogYVJvd3M7XHJcbiAgICAgICAgY29uc3QgSyA9IHRoaXMudHJhbnNBID8gYVJvd3MgOiBhQ29scztcclxuICAgICAgICBjb25zdCBOID0gdGhpcy50cmFuc0IgPyBiUm93cyA6IGJDb2xzO1xyXG5cclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KE0gKiBOKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgbSA9IDA7IG0gPCBNOyBtKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBLOyBrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhSWR4ID0gdGhpcy50cmFuc0EgPyBrICogTSArIG0gOiBtICogSyArIGs7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYklkeCA9IHRoaXMudHJhbnNCID8gbiAqIEsgKyBrIDogayAqIE4gKyBuO1xyXG4gICAgICAgICAgICAgICAgICAgIHN1bSArPSBBLmRhdGFbYUlkeF0gKiBCLmRhdGFbYklkeF07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBvdXRbbSAqIE4gKyBuXSA9IHRoaXMuYWxwaGEgKiBzdW07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChDKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG0gPSAwOyBtIDwgTTsgbSsrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IE47IG4rKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNpID0gbSAqIE4gKyBuO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEMgaXMgYnJvYWRjYXN0YWJsZSDigJQgY291bGQgYmUgWzEsIE5dIG9yIFtNLCBOXVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNJZHggPSBDLmRhdGEubGVuZ3RoID09PSBOID8gbiA6IGNpICUgQy5kYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICBvdXRbY2ldICs9IHRoaXMuYmV0YSAqIEMuZGF0YVtjSWR4XTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW00sIE5dKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb25jYXQgYWxvbmcgYXhpcyAoc3VwcG9ydHMgYXhpcyAwIGFuZCAxIGZvciAyRCB0ZW5zb3JzKS5cclxuICovXHJcbmNsYXNzIENvbmNhdE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYXhpczogbnVtYmVyO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3Iobm9kZUluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKG5vZGVJbmZvKTtcclxuICAgICAgICB0aGlzLmF4aXMgPSB0aGlzLmF0dHJJbnQoXCJheGlzXCIsIDApO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGlmIChpbnB1dHMubGVuZ3RoID09PSAwKSByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheSgwKSwgWzBdKV07XHJcbiAgICAgICAgaWYgKGlucHV0cy5sZW5ndGggPT09IDEpIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KGlucHV0c1swXS5kYXRhKSwgWy4uLmlucHV0c1swXS5zaGFwZV0pXTtcclxuXHJcbiAgICAgICAgY29uc3QgYXhpcyA9IHRoaXMuYXhpcztcclxuXHJcbiAgICAgICAgaWYgKGF4aXMgPT09IDApIHtcclxuICAgICAgICAgICAgLy8gU3RhY2sgYWxvbmcgcm93czogYWxsIG11c3QgaGF2ZSBzYW1lIGNvbHNcclxuICAgICAgICAgICAgY29uc3QgY29scyA9IGlucHV0c1swXS5zaGFwZS5sZW5ndGggPj0gMiA/IGlucHV0c1swXS5zaGFwZVsxXSA6IGlucHV0c1swXS5kYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgbGV0IHRvdGFsUm93cyA9IDA7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgaW5wIG9mIGlucHV0cykge1xyXG4gICAgICAgICAgICAgICAgdG90YWxSb3dzICs9IGlucC5zaGFwZS5sZW5ndGggPj0gMiA/IGlucC5zaGFwZVswXSA6IDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheSh0b3RhbFJvd3MgKiBjb2xzKTtcclxuICAgICAgICAgICAgbGV0IG9mZnNldCA9IDA7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgaW5wIG9mIGlucHV0cykge1xyXG4gICAgICAgICAgICAgICAgb3V0LnNldChpbnAuZGF0YSwgb2Zmc2V0KTtcclxuICAgICAgICAgICAgICAgIG9mZnNldCArPSBpbnAuZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW3RvdGFsUm93cywgY29sc10pXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChheGlzID09PSAxKSB7XHJcbiAgICAgICAgICAgIC8vIENvbmNhdCBhbG9uZyBjb2x1bW5zOiBhbGwgbXVzdCBoYXZlIHNhbWUgcm93c1xyXG4gICAgICAgICAgICBjb25zdCByb3dzID0gaW5wdXRzWzBdLnNoYXBlLmxlbmd0aCA+PSAyID8gaW5wdXRzWzBdLnNoYXBlWzBdIDogMTtcclxuICAgICAgICAgICAgbGV0IHRvdGFsQ29scyA9IDA7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbHNMaXN0OiBudW1iZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlucCBvZiBpbnB1dHMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGMgPSBpbnAuc2hhcGUubGVuZ3RoID49IDIgPyBpbnAuc2hhcGVbMV0gOiBpbnAuZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICBjb2xzTGlzdC5wdXNoKGMpO1xyXG4gICAgICAgICAgICAgICAgdG90YWxDb2xzICs9IGM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShyb3dzICogdG90YWxDb2xzKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCByb3dzOyByKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCBvdXRDb2wgPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCBpbnB1dHMubGVuZ3RoOyB0KyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb2xzID0gY29sc0xpc3RbdF07XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3JjUm93ID0gaW5wdXRzW3RdLnNoYXBlLmxlbmd0aCA+PSAyID8gaW5wdXRzW3RdLnNoYXBlWzFdIDogaW5wdXRzW3RdLmRhdGEubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dFtyICogdG90YWxDb2xzICsgb3V0Q29sICsgY10gPSBpbnB1dHNbdF0uZGF0YVtyICogc3JjUm93ICsgY107XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIG91dENvbCArPSBjb2xzO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtyb3dzLCB0b3RhbENvbHNdKV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbmNhdCBheGlzPSR7YXhpc30gbm90IHN1cHBvcnRlZCAob25seSAwIGFuZCAxKWApO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogU2xpY2U6IGNvbHVtbi1iYXNlZCBzbGljaW5nIGZvciAyRCB0ZW5zb3JzLlxyXG4gKiBPTk5YIG9wc2V0IOKJpTEwIHVzZXMgdGVuc29yIGlucHV0cyBmb3Igc3RhcnRzL2VuZHMvYXhlcy9zdGVwcy5cclxuICogT3BzZXQgPDEwIHVzZXMgYXR0cmlidXRlcy5cclxuICogV2Ugc3VwcG9ydCBib3RoOiB0cnkgdGVuc29yIGlucHV0cyBmaXJzdCwgZmFsbCBiYWNrIHRvIGF0dHJpYnV0ZXMuXHJcbiAqL1xyXG5jbGFzcyBTbGljZU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGRhdGEgPSBpbnB1dHNbMF07XHJcbiAgICAgICAgaWYgKCFkYXRhKSByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheSgwKSwgWzBdKV07XHJcblxyXG4gICAgICAgIC8vIE9wc2V0IOKJpTEwOiBzdGFydHMsIGVuZHMsIGF4ZXMsIHN0ZXBzIGFyZSB0ZW5zb3IgaW5wdXRzXHJcbiAgICAgICAgY29uc3QgaGFzSW5wdXRTdGFydHMgPSBpbnB1dHMubGVuZ3RoID49IDMgJiYgaW5wdXRzWzFdICYmIGlucHV0c1syXTtcclxuXHJcbiAgICAgICAgbGV0IHN0YXJ0OiBudW1iZXI7XHJcbiAgICAgICAgbGV0IGVuZDogbnVtYmVyO1xyXG4gICAgICAgIGxldCBheGlzOiBudW1iZXI7XHJcblxyXG4gICAgICAgIGlmIChoYXNJbnB1dFN0YXJ0cykge1xyXG4gICAgICAgICAgICBzdGFydCA9IE1hdGgucm91bmQoaW5wdXRzWzFdLmRhdGFbMF0pO1xyXG4gICAgICAgICAgICBlbmQgPSBNYXRoLnJvdW5kKGlucHV0c1syXS5kYXRhWzBdKTtcclxuICAgICAgICAgICAgYXhpcyA9IGlucHV0cy5sZW5ndGggPj0gNCAmJiBpbnB1dHNbM10gPyBNYXRoLnJvdW5kKGlucHV0c1szXS5kYXRhWzBdKSA6IDA7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gRmFsbCBiYWNrIHRvIGF0dHJpYnV0ZXMgKG9wc2V0IDwxMClcclxuICAgICAgICAgICAgc3RhcnQgPSB0aGlzLmF0dHJJbnQoXCJzdGFydHNcIiwgMCk7XHJcbiAgICAgICAgICAgIGVuZCA9IHRoaXMuYXR0ckludChcImVuZHNcIiwgMCk7XHJcbiAgICAgICAgICAgIGF4aXMgPSB0aGlzLmF0dHJJbnQoXCJheGVzXCIsIDEpOyAvLyBkZWZhdWx0IGF4aXM9MSBmb3IgY29sdW1uIHNsaWNpbmdcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEhhbmRsZSBuZWdhdGl2ZSBpbmRpY2VzXHJcbiAgICAgICAgY29uc3QgZGltU2l6ZSA9IGRhdGEuc2hhcGVbYXhpc10gPz8gZGF0YS5kYXRhLmxlbmd0aDtcclxuICAgICAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IGRpbVNpemUgKyBzdGFydDtcclxuICAgICAgICBpZiAoZW5kIDwgMCkgZW5kID0gZGltU2l6ZSArIGVuZDtcclxuICAgICAgICBpZiAoZW5kID4gZGltU2l6ZSB8fCBlbmQgPiAyMTQ3NDgzMDAwKSBlbmQgPSBkaW1TaXplO1xyXG4gICAgICAgIHN0YXJ0ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oc3RhcnQsIGRpbVNpemUpKTtcclxuICAgICAgICBlbmQgPSBNYXRoLm1heChzdGFydCwgTWF0aC5taW4oZW5kLCBkaW1TaXplKSk7XHJcbiAgICAgICAgY29uc3Qgc2xpY2VMZW4gPSBlbmQgLSBzdGFydDtcclxuXHJcbiAgICAgICAgaWYgKGRhdGEuc2hhcGUubGVuZ3RoIDwgMiB8fCBheGlzID09PSAwKSB7XHJcbiAgICAgICAgICAgIC8vIDFEIG9yIGF4aXM9MDogc2ltcGxlIHNsaWNlXHJcbiAgICAgICAgICAgIGNvbnN0IHNsaWNlZCA9IGRhdGEuZGF0YS5zbGljZShzdGFydCwgZW5kKTtcclxuICAgICAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKHNsaWNlZCwgW3NsaWNlTGVuXSldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gMkQsIGF4aXM9MTogc2xpY2UgY29sdW1uc1xyXG4gICAgICAgIGNvbnN0IHJvd3MgPSBkYXRhLnNoYXBlWzBdO1xyXG4gICAgICAgIGNvbnN0IGNvbHMgPSBkYXRhLnNoYXBlWzFdO1xyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkocm93cyAqIHNsaWNlTGVuKTtcclxuICAgICAgICBmb3IgKGxldCByID0gMDsgciA8IHJvd3M7IHIrKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IHNsaWNlTGVuOyBjKyspIHtcclxuICAgICAgICAgICAgICAgIG91dFtyICogc2xpY2VMZW4gKyBjXSA9IGRhdGEuZGF0YVtyICogY29scyArIHN0YXJ0ICsgY107XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW3Jvd3MsIHNsaWNlTGVuXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyDilIDilIDilIAgUmVnaXN0cmF0aW9uIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyTWF0aE9wcyhyZWdpc3RyeTogT25ueE9wUmVnaXN0cnkpOiB2b2lkIHtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiQWRkXCIsIChpbmZvKSA9PiBuZXcgQWRkTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlN1YlwiLCAoaW5mbykgPT4gbmV3IFN1Yk5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJNdWxcIiwgKGluZm8pID0+IG5ldyBNdWxOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiQXRhblwiLCAoaW5mbykgPT4gbmV3IEF0YW5Ob2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiR2VtbVwiLCAoaW5mbykgPT4gbmV3IEdlbW1Ob2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiQ29uY2F0XCIsIChpbmZvKSA9PiBuZXcgQ29uY2F0Tm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlNsaWNlXCIsIChpbmZvKSA9PiBuZXcgU2xpY2VOb2RlKGluZm8pKTtcclxufVxyXG4iLCJpbXBvcnQgdHlwZSB7IElUZW5zb3IgfSBmcm9tIFwiLi4vLi4vY29tcHV0ZS9jb21wdXRlLmludGVyZmFjZXNcIjtcclxuaW1wb3J0IHR5cGUgeyBPbm54Tm9kZUluZm8gfSBmcm9tIFwiLi4vb25ueC10eXBlc1wiO1xyXG5pbXBvcnQgeyBPbm54T3BOb2RlLCBtYWtlVGVuc29yLCBPbm54T3BSZWdpc3RyeSB9IGZyb20gXCIuLi9yZWdpc3RyeVwiO1xyXG5cclxuLyoqXHJcbiAqIE1hdE11bDogbWF0cml4IG11bHRpcGxpY2F0aW9uIEEgQCBCLlxyXG4gKiBTdXBwb3J0cyAyRCBbTSxLXSB4IFtLLE5dIOKGkiBbTSxOXS5cclxuICogRm9yIDFEIGlucHV0czogW0tdIHRyZWF0ZWQgYXMgWzEsS10gb3IgW0ssMV0gYXMgbmVlZGVkLlxyXG4gKi9cclxuY2xhc3MgTWF0TXVsTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBBID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IEIgPSBpbnB1dHNbMV07XHJcblxyXG4gICAgICAgIGxldCBNOiBudW1iZXIsIEs6IG51bWJlciwgTjogbnVtYmVyO1xyXG4gICAgICAgIGlmIChBLnNoYXBlLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICBNID0gMTtcclxuICAgICAgICAgICAgSyA9IEEuc2hhcGVbMF07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgTSA9IEEuc2hhcGVbMF07XHJcbiAgICAgICAgICAgIEsgPSBBLnNoYXBlWzFdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoQi5zaGFwZS5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgTiA9IDE7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgTiA9IEIuc2hhcGVbMV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KE0gKiBOKTtcclxuICAgICAgICBmb3IgKGxldCBtID0gMDsgbSA8IE07IG0rKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IE47IG4rKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrID0gMDsgayA8IEs7IGsrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFpID0gQS5zaGFwZS5sZW5ndGggPT09IDEgPyBrIDogbSAqIEsgKyBrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJpID0gQi5zaGFwZS5sZW5ndGggPT09IDEgPyBrIDogayAqIE4gKyBuO1xyXG4gICAgICAgICAgICAgICAgICAgIHN1bSArPSBBLmRhdGFbYWldICogQi5kYXRhW2JpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIG91dFttICogTiArIG5dID0gc3VtO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoQS5zaGFwZS5sZW5ndGggPT09IDEgJiYgQi5zaGFwZS5sZW5ndGggPT09IDEpIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFsxXSldO1xyXG4gICAgICAgIGlmIChBLnNoYXBlLmxlbmd0aCA9PT0gMSkgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW05dKV07XHJcbiAgICAgICAgaWYgKEIuc2hhcGUubGVuZ3RoID09PSAxKSByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbTV0pXTtcclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbTSwgTl0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFRyYW5zcG9zZTogcGVybXV0ZSBkaW1lbnNpb25zLlxyXG4gKiBTdXBwb3J0cyAyRCAoc3dhcCByb3dzL2NvbHMpIGFuZCAzRC5cclxuICovXHJcbmNsYXNzIFRyYW5zcG9zZU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgaW5wID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IHJhbmsgPSBpbnAuc2hhcGUubGVuZ3RoO1xyXG5cclxuICAgICAgICBpZiAocmFuayA9PT0gMikge1xyXG4gICAgICAgICAgICBjb25zdCBbcm93cywgY29sc10gPSBpbnAuc2hhcGU7XHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoaW5wLmRhdGEubGVuZ3RoKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCByb3dzOyByKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W2MgKiByb3dzICsgcl0gPSBpbnAuZGF0YVtyICogY29scyArIGNdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtjb2xzLCByb3dzXSldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHJhbmsgPT09IDMpIHtcclxuICAgICAgICAgICAgY29uc3QgW2QwLCBkMSwgZDJdID0gaW5wLnNoYXBlO1xyXG4gICAgICAgICAgICAvLyBEZWZhdWx0IHBlcm06IHJldmVyc2Ug4oaSIFtkMiwgZDEsIGQwXVxyXG4gICAgICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGlucC5kYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZDA7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBkMTsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBkMjsgaysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dFtrICogZDEgKiBkMCArIGogKiBkMCArIGldID0gaW5wLmRhdGFbaSAqIGQxICogZDIgKyBqICogZDIgKyBrXTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW2QyLCBkMSwgZDBdKV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAxRDogbm9vcFxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KGlucC5kYXRhKSwgWy4uLmlucC5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFJlc2hhcGU6IGNoYW5nZSBzaGFwZSB3aXRob3V0IGNoYW5naW5nIGRhdGEuXHJcbiAqIFN1cHBvcnRzIC0xIGZvciBvbmUgaW5mZXJyZWQgZGltZW5zaW9uLlxyXG4gKi9cclxuY2xhc3MgUmVzaGFwZU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgZGF0YSA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBzaGFwZVQgPSBpbnB1dHNbMV07XHJcbiAgICAgICAgaWYgKCFzaGFwZVQpIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KGRhdGEuZGF0YSksIFsuLi5kYXRhLnNoYXBlXSldO1xyXG5cclxuICAgICAgICBjb25zdCBuZXdTaGFwZTogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICBsZXQgaW5mZXJJZHggPSAtMTtcclxuICAgICAgICBsZXQga25vd24gPSAxO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2hhcGVULmRhdGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgY29uc3QgZCA9IE1hdGgucm91bmQoc2hhcGVULmRhdGFbaV0pO1xyXG4gICAgICAgICAgICBpZiAoZCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIGluZmVySWR4ID0gaTtcclxuICAgICAgICAgICAgICAgIG5ld1NoYXBlLnB1c2goLTEpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGQgPT09IDApIHtcclxuICAgICAgICAgICAgICAgIC8vIDAgbWVhbnMgY29weSBmcm9tIGlucHV0XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkaW0gPSBkYXRhLnNoYXBlW2ldID8/IDE7XHJcbiAgICAgICAgICAgICAgICBuZXdTaGFwZS5wdXNoKGRpbSk7XHJcbiAgICAgICAgICAgICAgICBrbm93biAqPSBkaW07XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBuZXdTaGFwZS5wdXNoKGQpO1xyXG4gICAgICAgICAgICAgICAga25vd24gKj0gZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaW5mZXJJZHggPj0gMCkge1xyXG4gICAgICAgICAgICBuZXdTaGFwZVtpbmZlcklkeF0gPSBkYXRhLmRhdGEubGVuZ3RoIC8ga25vd247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShkYXRhLmRhdGEpLCBuZXdTaGFwZSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogRmxhdHRlbjogY29sbGFwc2UgZGltcyBpbnRvIDJEIFtiYXRjaCwgZmVhdHVyZXNdLlxyXG4gKi9cclxuY2xhc3MgRmxhdHRlbk5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYXhpczogbnVtYmVyO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmF4aXMgPSB0aGlzLmF0dHJJbnQoXCJheGlzXCIsIDEpO1xyXG4gICAgfVxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgaW5wID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IHNoYXBlID0gaW5wLnNoYXBlO1xyXG4gICAgICAgIGxldCBkMCA9IDEsXHJcbiAgICAgICAgICAgIGQxID0gMTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYXhpczsgaSsrKSBkMCAqPSBzaGFwZVtpXSA/PyAxO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSB0aGlzLmF4aXM7IGkgPCBzaGFwZS5sZW5ndGg7IGkrKykgZDEgKj0gc2hhcGVbaV0gPz8gMTtcclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShpbnAuZGF0YSksIFtkMCwgZDFdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTcXVlZXplOiByZW1vdmUgZGltZW5zaW9ucyBvZiBzaXplIDEuXHJcbiAqL1xyXG5jbGFzcyBTcXVlZXplTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBpbnAgPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3QgYXhlcyA9IGlucHV0cy5sZW5ndGggPj0gMiAmJiBpbnB1dHNbMV0gPyBBcnJheS5mcm9tKGlucHV0c1sxXS5kYXRhKS5tYXAoTWF0aC5yb3VuZCkgOiBudWxsO1xyXG4gICAgICAgIGNvbnN0IG5ld1NoYXBlID0gYXhlcyA/IGlucC5zaGFwZS5maWx0ZXIoKF8sIGkpID0+ICFheGVzLmluY2x1ZGVzKGkpKSA6IGlucC5zaGFwZS5maWx0ZXIoKGQpID0+IGQgIT09IDEpO1xyXG4gICAgICAgIGlmIChuZXdTaGFwZS5sZW5ndGggPT09IDApIG5ld1NoYXBlLnB1c2goMSk7XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoaW5wLmRhdGEpLCBuZXdTaGFwZSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogVW5zcXVlZXplOiBpbnNlcnQgZGltZW5zaW9ucyBvZiBzaXplIDEuXHJcbiAqL1xyXG5jbGFzcyBVbnNxdWVlemVOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGlucCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBheGVzVCA9IGlucHV0c1sxXTtcclxuICAgICAgICBpZiAoIWF4ZXNUKSByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShpbnAuZGF0YSksIFsuLi5pbnAuc2hhcGVdKV07XHJcbiAgICAgICAgY29uc3QgYXhlcyA9IEFycmF5LmZyb20oYXhlc1QuZGF0YSlcclxuICAgICAgICAgICAgLm1hcChNYXRoLnJvdW5kKVxyXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xyXG4gICAgICAgIGNvbnN0IG5ld1NoYXBlID0gWy4uLmlucC5zaGFwZV07XHJcbiAgICAgICAgZm9yIChjb25zdCBhIG9mIGF4ZXMpIHtcclxuICAgICAgICAgICAgbmV3U2hhcGUuc3BsaWNlKGEsIDAsIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShpbnAuZGF0YSksIG5ld1NoYXBlKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHYXRoZXI6IHNlbGVjdCBlbGVtZW50cyBhbG9uZyBheGlzIHVzaW5nIGluZGljZXMuXHJcbiAqIFNpbXBsaWZpZWQ6IHN1cHBvcnRzIGF4aXM9MCwgMUQvMkQuXHJcbiAqL1xyXG5jbGFzcyBHYXRoZXJOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGF4aXM6IG51bWJlcjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5heGlzID0gdGhpcy5hdHRySW50KFwiYXhpc1wiLCAwKTtcclxuICAgIH1cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGRhdGEgPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3QgaW5kaWNlcyA9IGlucHV0c1sxXTtcclxuICAgICAgICBpZiAoIWluZGljZXMpIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KGRhdGEuZGF0YSksIFsuLi5kYXRhLnNoYXBlXSldO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5heGlzID09PSAwICYmIGRhdGEuc2hhcGUubGVuZ3RoID09PSAyKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbHMgPSBkYXRhLnNoYXBlWzFdO1xyXG4gICAgICAgICAgICBjb25zdCBudW1JZHggPSBpbmRpY2VzLmRhdGEubGVuZ3RoO1xyXG4gICAgICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KG51bUlkeCAqIGNvbHMpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bUlkeDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpZHggPSBNYXRoLnJvdW5kKGluZGljZXMuZGF0YVtpXSk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIG91dFtpICogY29scyArIGNdID0gZGF0YS5kYXRhW2lkeCAqIGNvbHMgKyBjXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbbnVtSWR4LCBjb2xzXSldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRmFsbGJhY2s6IDFEIGdhdGhlclxyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoaW5kaWNlcy5kYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbmRpY2VzLmRhdGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgb3V0W2ldID0gZGF0YS5kYXRhW01hdGgucm91bmQoaW5kaWNlcy5kYXRhW2ldKV0gPz8gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW2luZGljZXMuZGF0YS5sZW5ndGhdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWdpc3Rlck1hdHJpeE9wcyhyZWdpc3RyeTogT25ueE9wUmVnaXN0cnkpOiB2b2lkIHtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiTWF0TXVsXCIsIChpbmZvKSA9PiBuZXcgTWF0TXVsTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlRyYW5zcG9zZVwiLCAoaW5mbykgPT4gbmV3IFRyYW5zcG9zZU5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJSZXNoYXBlXCIsIChpbmZvKSA9PiBuZXcgUmVzaGFwZU5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJGbGF0dGVuXCIsIChpbmZvKSA9PiBuZXcgRmxhdHRlbk5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTcXVlZXplXCIsIChpbmZvKSA9PiBuZXcgU3F1ZWV6ZU5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJVbnNxdWVlemVcIiwgKGluZm8pID0+IG5ldyBVbnNxdWVlemVOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiR2F0aGVyXCIsIChpbmZvKSA9PiBuZXcgR2F0aGVyTm9kZShpbmZvKSk7XHJcbn1cclxuIiwiaW1wb3J0IHR5cGUgeyBJVGVuc29yIH0gZnJvbSBcIi4uLy4uL2NvbXB1dGUvY29tcHV0ZS5pbnRlcmZhY2VzXCI7XHJcbmltcG9ydCB0eXBlIHsgT25ueE5vZGVJbmZvIH0gZnJvbSBcIi4uL29ubngtdHlwZXNcIjtcclxuaW1wb3J0IHsgT25ueE9wTm9kZSwgbWFrZVRlbnNvciwgZ2V0SW5pdGlhbGl6ZXJEYXRhLCBPbm54T3BSZWdpc3RyeSB9IGZyb20gXCIuLi9yZWdpc3RyeVwiO1xyXG5cclxuY2xhc3MgRGl2Tm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBhID0gaW5wdXRzWzBdLCBiID0gaW5wdXRzWzFdO1xyXG4gICAgICAgIGNvbnN0IHNpemUgPSBNYXRoLm1heChhLmRhdGEubGVuZ3RoLCBiLmRhdGEubGVuZ3RoKTtcclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KHNpemUpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7XHJcbiAgICAgICAgICAgIG91dFtpXSA9IGEuZGF0YVtpICUgYS5kYXRhLmxlbmd0aF0gLyBiLmRhdGFbaSAlIGIuZGF0YS5sZW5ndGhdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBhLmRhdGEubGVuZ3RoID49IGIuZGF0YS5sZW5ndGggPyBbLi4uYS5zaGFwZV0gOiBbLi4uYi5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgUG93Tm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBhID0gaW5wdXRzWzBdLCBiID0gaW5wdXRzWzFdO1xyXG4gICAgICAgIGNvbnN0IHNpemUgPSBNYXRoLm1heChhLmRhdGEubGVuZ3RoLCBiLmRhdGEubGVuZ3RoKTtcclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KHNpemUpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7XHJcbiAgICAgICAgICAgIG91dFtpXSA9IE1hdGgucG93KGEuZGF0YVtpICUgYS5kYXRhLmxlbmd0aF0sIGIuZGF0YVtpICUgYi5kYXRhLmxlbmd0aF0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBhLmRhdGEubGVuZ3RoID49IGIuZGF0YS5sZW5ndGggPyBbLi4uYS5zaGFwZV0gOiBbLi4uYi5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgUmVkdWNlTWVhbk5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYXhpczogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBrZWVwZGltczogYm9vbGVhbjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKGluZm8pO1xyXG4gICAgICAgIHRoaXMuYXhpcyA9IHRoaXMuYXR0ckludChcImF4ZXNcIiwgLTEpO1xyXG4gICAgICAgIHRoaXMua2VlcGRpbXMgPSB0aGlzLmF0dHJJbnQoXCJrZWVwZGltc1wiLCAxKSAhPT0gMDtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBYID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IHNoYXBlID0gWC5zaGFwZTtcclxuICAgICAgICBjb25zdCByYW5rID0gc2hhcGUubGVuZ3RoO1xyXG4gICAgICAgIGNvbnN0IGF4aXMgPSB0aGlzLmF4aXMgPCAwID8gcmFuayArIHRoaXMuYXhpcyA6IHRoaXMuYXhpcztcclxuXHJcbiAgICAgICAgaWYgKHJhbmsgPT09IDIpIHtcclxuICAgICAgICAgICAgaWYgKGF4aXMgPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJvd3MgPSBzaGFwZVswXTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbHMgPSBzaGFwZVsxXTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkocm93cyk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCByID0gMDsgciA8IHJvd3M7IHIrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgY29sczsgYysrKSBzdW0gKz0gWC5kYXRhW3IgKiBjb2xzICsgY107XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W3JdID0gc3VtIC8gY29scztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIHRoaXMua2VlcGRpbXMgPyBbcm93cywgMV0gOiBbcm93c10pXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoYXhpcyA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgcm93cyA9IHNoYXBlWzBdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29scyA9IHNoYXBlWzFdO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShjb2xzKTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCByb3dzOyByKyspIHN1bSArPSBYLmRhdGFbciAqIGNvbHMgKyBjXTtcclxuICAgICAgICAgICAgICAgICAgICBvdXRbY10gPSBzdW0gLyByb3dzO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgdGhpcy5rZWVwZGltcyA/IFsxLCBjb2xzXSA6IFtjb2xzXSldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBGYWxsYmFjazogcmVkdWNlIGFsbFxyXG4gICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgWC5kYXRhLmxlbmd0aDsgaSsrKSBzdW0gKz0gWC5kYXRhW2ldO1xyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KFtzdW0gLyBYLmRhdGEubGVuZ3RoXSksIFsxXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBSZWR1Y2VTdW1Ob2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGF4aXM6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkga2VlcGRpbXM6IGJvb2xlYW47XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmF4aXMgPSB0aGlzLmF0dHJJbnQoXCJheGVzXCIsIC0xKTtcclxuICAgICAgICB0aGlzLmtlZXBkaW1zID0gdGhpcy5hdHRySW50KFwia2VlcGRpbXNcIiwgMSkgIT09IDA7XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgWCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBzaGFwZSA9IFguc2hhcGU7XHJcbiAgICAgICAgY29uc3QgcmFuayA9IHNoYXBlLmxlbmd0aDtcclxuICAgICAgICBjb25zdCBheGlzID0gdGhpcy5heGlzIDwgMCA/IHJhbmsgKyB0aGlzLmF4aXMgOiB0aGlzLmF4aXM7XHJcblxyXG4gICAgICAgIGlmIChyYW5rID09PSAyICYmIGF4aXMgPT09IDEpIHtcclxuICAgICAgICAgICAgY29uc3Qgcm93cyA9IHNoYXBlWzBdLCBjb2xzID0gc2hhcGVbMV07XHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkocm93cyk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgcm93czsgcisrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgY29sczsgYysrKSBzdW0gKz0gWC5kYXRhW3IgKiBjb2xzICsgY107XHJcbiAgICAgICAgICAgICAgICBvdXRbcl0gPSBzdW07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgdGhpcy5rZWVwZGltcyA/IFtyb3dzLCAxXSA6IFtyb3dzXSldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBYLmRhdGEubGVuZ3RoOyBpKyspIHN1bSArPSBYLmRhdGFbaV07XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoW3N1bV0pLCBbMV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgSWRlbnRpdHlOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KGlucHV0c1swXS5kYXRhKSwgWy4uLmlucHV0c1swXS5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQ2FzdE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgLy8gQWxsIGRhdGEgaXMgRmxvYXQzMiBpbiBvdXIgcnVudGltZSDigJQgY2FzdCBpcyBhIG5vLW9wXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoaW5wdXRzWzBdLmRhdGEpLCBbLi4uaW5wdXRzWzBdLnNoYXBlXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBTaGFwZU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3Qgc2hhcGUgPSBpbnB1dHNbMF0uc2hhcGU7XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoc2hhcGUpLCBbc2hhcGUubGVuZ3RoXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBDb25zdGFudE9mU2hhcGVOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IHNoYXBlVCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBzaGFwZSA9IEFycmF5LmZyb20oc2hhcGVULmRhdGEpLm1hcChNYXRoLnJvdW5kKTtcclxuICAgICAgICBsZXQgc2l6ZSA9IDE7XHJcbiAgICAgICAgZm9yIChjb25zdCBkIG9mIHNoYXBlKSBzaXplICo9IGQ7XHJcbiAgICAgICAgLy8gVHJ5IHRlbnNvciBhdHRyaWJ1dGUgXCJ2YWx1ZVwiIGZpcnN0IChUZW5zb3JQcm90byksIGZhbGwgYmFjayB0byBzY2FsYXJcclxuICAgICAgICBsZXQgdmFsID0gMDtcclxuICAgICAgICBjb25zdCB2YWx1ZVRlbnNvciA9IHRoaXMuYXR0clRlbnNvcihcInZhbHVlXCIpO1xyXG4gICAgICAgIGlmICh2YWx1ZVRlbnNvcikge1xyXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gZ2V0SW5pdGlhbGl6ZXJEYXRhKHZhbHVlVGVuc29yKTtcclxuICAgICAgICAgICAgaWYgKGRhdGEubGVuZ3RoID4gMCkgdmFsID0gZGF0YVswXTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB2YWwgPSB0aGlzLmF0dHIoXCJ2YWx1ZVwiLCAwKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShzaXplKS5maWxsKHZhbCk7XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgc2hhcGUpXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFBhZDogcGFkIGEgdGVuc29yLiBTaW1wbGlmaWVkOiAyRCBjb25zdGFudCBwYWRkaW5nLlxyXG4gKi9cclxuY2xhc3MgUGFkTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBYID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IHBhZHMgPSBpbnB1dHMubGVuZ3RoID49IDIgJiYgaW5wdXRzWzFdID8gaW5wdXRzWzFdIDogbnVsbDtcclxuICAgICAgICBpZiAoIXBhZHMgfHwgWC5zaGFwZS5sZW5ndGggIT09IDIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoWC5kYXRhKSwgWy4uLlguc2hhcGVdKV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IHZhbCA9IGlucHV0cy5sZW5ndGggPj0gMyAmJiBpbnB1dHNbMl0gPyBpbnB1dHNbMl0uZGF0YVswXSA6IDA7XHJcbiAgICAgICAgY29uc3QgW3Jvd3MsIGNvbHNdID0gWC5zaGFwZTtcclxuICAgICAgICBjb25zdCBwID0gQXJyYXkuZnJvbShwYWRzLmRhdGEpLm1hcChNYXRoLnJvdW5kKTtcclxuICAgICAgICAvLyBwYWRzIGZvcm1hdDogW3RvcCwgbGVmdCwgYm90dG9tLCByaWdodF0gZm9yIDJEXHJcbiAgICAgICAgY29uc3QgdG9wID0gcFswXSA/PyAwLCBsZWZ0ID0gcFsxXSA/PyAwLCBib3R0b20gPSBwWzJdID8/IDAsIHJpZ2h0ID0gcFszXSA/PyAwO1xyXG4gICAgICAgIGNvbnN0IG5ld1Jvd3MgPSByb3dzICsgdG9wICsgYm90dG9tO1xyXG4gICAgICAgIGNvbnN0IG5ld0NvbHMgPSBjb2xzICsgbGVmdCArIHJpZ2h0O1xyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkobmV3Um93cyAqIG5ld0NvbHMpLmZpbGwodmFsKTtcclxuICAgICAgICBmb3IgKGxldCByID0gMDsgciA8IHJvd3M7IHIrKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgb3V0WyhyICsgdG9wKSAqIG5ld0NvbHMgKyAoYyArIGxlZnQpXSA9IFguZGF0YVtyICogY29scyArIGNdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtuZXdSb3dzLCBuZXdDb2xzXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBNaW5Ob2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoaW5wdXRzWzBdLmRhdGEpO1xyXG4gICAgICAgIGZvciAobGV0IHQgPSAxOyB0IDwgaW5wdXRzLmxlbmd0aDsgdCsrKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBvdXRbaV0gPSBNYXRoLm1pbihvdXRbaV0sIGlucHV0c1t0XS5kYXRhW2kgJSBpbnB1dHNbdF0uZGF0YS5sZW5ndGhdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbLi4uaW5wdXRzWzBdLnNoYXBlXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBNYXhOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoaW5wdXRzWzBdLmRhdGEpO1xyXG4gICAgICAgIGZvciAobGV0IHQgPSAxOyB0IDwgaW5wdXRzLmxlbmd0aDsgdCsrKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBvdXRbaV0gPSBNYXRoLm1heChvdXRbaV0sIGlucHV0c1t0XS5kYXRhW2kgJSBpbnB1dHNbdF0uZGF0YS5sZW5ndGhdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbLi4uaW5wdXRzWzBdLnNoYXBlXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJNaXNjT3BzKHJlZ2lzdHJ5OiBPbm54T3BSZWdpc3RyeSk6IHZvaWQge1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJEaXZcIiwgKGluZm8pID0+IG5ldyBEaXZOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiUG93XCIsIChpbmZvKSA9PiBuZXcgUG93Tm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlJlZHVjZU1lYW5cIiwgKGluZm8pID0+IG5ldyBSZWR1Y2VNZWFuTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlJlZHVjZVN1bVwiLCAoaW5mbykgPT4gbmV3IFJlZHVjZVN1bU5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJJZGVudGl0eVwiLCAoaW5mbykgPT4gbmV3IElkZW50aXR5Tm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkNhc3RcIiwgKGluZm8pID0+IG5ldyBDYXN0Tm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlNoYXBlXCIsIChpbmZvKSA9PiBuZXcgU2hhcGVOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiQ29uc3RhbnRPZlNoYXBlXCIsIChpbmZvKSA9PiBuZXcgQ29uc3RhbnRPZlNoYXBlTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlBhZFwiLCAoaW5mbykgPT4gbmV3IFBhZE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJNaW5cIiwgKGluZm8pID0+IG5ldyBNaW5Ob2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiTWF4XCIsIChpbmZvKSA9PiBuZXcgTWF4Tm9kZShpbmZvKSk7XHJcbn1cclxuIiwiaW1wb3J0IHR5cGUgeyBJVGVuc29yIH0gZnJvbSBcIi4uLy4uL2NvbXB1dGUvY29tcHV0ZS5pbnRlcmZhY2VzXCI7XHJcbmltcG9ydCB0eXBlIHsgT25ueE5vZGVJbmZvIH0gZnJvbSBcIi4uL29ubngtdHlwZXNcIjtcclxuaW1wb3J0IHsgT25ueE9wTm9kZSwgbWFrZVRlbnNvciwgT25ueE9wUmVnaXN0cnkgfSBmcm9tIFwiLi4vcmVnaXN0cnlcIjtcclxuXHJcbi8qKlxyXG4gKiBCYXRjaE5vcm1hbGl6YXRpb246IFkgPSAoWCAtIG1lYW4pIC8gc3FydCh2YXIgKyBlcHMpICogc2NhbGUgKyBiaWFzXHJcbiAqIElucHV0czogWCwgc2NhbGUsIEIsIG1lYW4sIHZhclxyXG4gKiBGb3IgMkQgW04sIENdOiBub3JtYWxpemUgcGVyIGNoYW5uZWwuXHJcbiAqIEZvciAzRCBbTiwgQywgTF06IG5vcm1hbGl6ZSBwZXIgY2hhbm5lbCBhY3Jvc3Mgc3BhdGlhbC5cclxuICovXHJcbmNsYXNzIEJhdGNoTm9ybU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZXBzOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmVwcyA9IHRoaXMuYXR0cihcImVwc2lsb25cIiwgMWUtNSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgWCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBzY2FsZSA9IGlucHV0c1sxXTtcclxuICAgICAgICBjb25zdCBiaWFzID0gaW5wdXRzWzJdO1xyXG4gICAgICAgIGNvbnN0IG1lYW4gPSBpbnB1dHNbM107XHJcbiAgICAgICAgY29uc3QgdmFyaWFuY2UgPSBpbnB1dHNbNF07XHJcblxyXG4gICAgICAgIGlmICghc2NhbGUgfHwgIWJpYXMgfHwgIW1lYW4gfHwgIXZhcmlhbmNlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KFguZGF0YSksIFsuLi5YLnNoYXBlXSldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShYLmRhdGEubGVuZ3RoKTtcclxuICAgICAgICBjb25zdCBDID0gc2NhbGUuZGF0YS5sZW5ndGg7XHJcblxyXG4gICAgICAgIGlmIChYLnNoYXBlLmxlbmd0aCA9PT0gMikge1xyXG4gICAgICAgICAgICBjb25zdCBOID0gWC5zaGFwZVswXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgQzsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gbiAqIEMgKyBjO1xyXG4gICAgICAgICAgICAgICAgICAgIG91dFtpZHhdID0gKFguZGF0YVtpZHhdIC0gbWVhbi5kYXRhW2NdKSAvIE1hdGguc3FydCh2YXJpYW5jZS5kYXRhW2NdICsgdGhpcy5lcHMpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICogc2NhbGUuZGF0YVtjXSArIGJpYXMuZGF0YVtjXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoWC5zaGFwZS5sZW5ndGggPT09IDMpIHtcclxuICAgICAgICAgICAgY29uc3QgTiA9IFguc2hhcGVbMF07XHJcbiAgICAgICAgICAgIGNvbnN0IEwgPSBYLnNoYXBlWzJdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IE47IG4rKykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCBDOyBjKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnZTdGQgPSAxIC8gTWF0aC5zcXJ0KHZhcmlhbmNlLmRhdGFbY10gKyB0aGlzLmVwcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgbCA9IDA7IGwgPCBMOyBsKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gbiAqIEMgKiBMICsgYyAqIEwgKyBsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRbaWR4XSA9IChYLmRhdGFbaWR4XSAtIG1lYW4uZGF0YVtjXSkgKiBpbnZTdGQgKiBzY2FsZS5kYXRhW2NdICsgYmlhcy5kYXRhW2NdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG91dC5zZXQoWC5kYXRhKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFsuLi5YLnNoYXBlXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogTGF5ZXJOb3JtYWxpemF0aW9uOiBub3JtYWxpemUgYWNyb3NzIHRoZSBsYXN0IGF4aXMuXHJcbiAqL1xyXG5jbGFzcyBMYXllck5vcm1Ob2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVwczogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBheGlzOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmVwcyA9IHRoaXMuYXR0cihcImVwc2lsb25cIiwgMWUtNSk7XHJcbiAgICAgICAgdGhpcy5heGlzID0gdGhpcy5hdHRySW50KFwiYXhpc1wiLCAtMSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgWCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBzY2FsZSA9IGlucHV0cy5sZW5ndGggPj0gMiA/IGlucHV0c1sxXSA6IG51bGw7XHJcbiAgICAgICAgY29uc3QgYmlhcyA9IGlucHV0cy5sZW5ndGggPj0gMyA/IGlucHV0c1syXSA6IG51bGw7XHJcblxyXG4gICAgICAgIGNvbnN0IHNoYXBlID0gWC5zaGFwZTtcclxuICAgICAgICBjb25zdCByYW5rID0gc2hhcGUubGVuZ3RoO1xyXG4gICAgICAgIGNvbnN0IGF4aXMgPSB0aGlzLmF4aXMgPCAwID8gcmFuayArIHRoaXMuYXhpcyA6IHRoaXMuYXhpcztcclxuICAgICAgICBjb25zdCBvdXRlclNpemUgPSBzaGFwZS5zbGljZSgwLCBheGlzKS5yZWR1Y2UoKGEsIGIpID0+IGEgKiBiLCAxKTtcclxuICAgICAgICBjb25zdCBpbm5lclNpemUgPSBzaGFwZS5zbGljZShheGlzKS5yZWR1Y2UoKGEsIGIpID0+IGEgKiBiLCAxKTtcclxuXHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShYLmRhdGEubGVuZ3RoKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dGVyU2l6ZTsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGJhc2UgPSBpICogaW5uZXJTaXplO1xyXG4gICAgICAgICAgICBsZXQgbWVhbiA9IDA7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgaW5uZXJTaXplOyBqKyspIG1lYW4gKz0gWC5kYXRhW2Jhc2UgKyBqXTtcclxuICAgICAgICAgICAgbWVhbiAvPSBpbm5lclNpemU7XHJcbiAgICAgICAgICAgIGxldCB2YXJpYW5jZSA9IDA7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgaW5uZXJTaXplOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGQgPSBYLmRhdGFbYmFzZSArIGpdIC0gbWVhbjtcclxuICAgICAgICAgICAgICAgIHZhcmlhbmNlICs9IGQgKiBkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhcmlhbmNlIC89IGlubmVyU2l6ZTtcclxuICAgICAgICAgICAgY29uc3QgaW52U3RkID0gMSAvIE1hdGguc3FydCh2YXJpYW5jZSArIHRoaXMuZXBzKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBpbm5lclNpemU7IGorKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHZhbCA9IChYLmRhdGFbYmFzZSArIGpdIC0gbWVhbikgKiBpbnZTdGQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2NhbGUpIHZhbCAqPSBzY2FsZS5kYXRhW2ogJSBzY2FsZS5kYXRhLmxlbmd0aF07XHJcbiAgICAgICAgICAgICAgICBpZiAoYmlhcykgdmFsICs9IGJpYXMuZGF0YVtqICUgYmlhcy5kYXRhLmxlbmd0aF07XHJcbiAgICAgICAgICAgICAgICBvdXRbYmFzZSArIGpdID0gdmFsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbLi4uc2hhcGVdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEcm9wb3V0OiBwYXNzdGhyb3VnaCBkdXJpbmcgaW5mZXJlbmNlLlxyXG4gKi9cclxuY2xhc3MgRHJvcG91dE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgLy8gRHVyaW5nIGluZmVyZW5jZSwgZHJvcG91dCBpcyBhIG5vLW9wXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoaW5wdXRzWzBdLmRhdGEpLCBbLi4uaW5wdXRzWzBdLnNoYXBlXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJOb3JtT3BzKHJlZ2lzdHJ5OiBPbm54T3BSZWdpc3RyeSk6IHZvaWQge1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJCYXRjaE5vcm1hbGl6YXRpb25cIiwgKGluZm8pID0+IG5ldyBCYXRjaE5vcm1Ob2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiTGF5ZXJOb3JtYWxpemF0aW9uXCIsIChpbmZvKSA9PiBuZXcgTGF5ZXJOb3JtTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkluc3RhbmNlTm9ybWFsaXphdGlvblwiLCAoaW5mbykgPT4gbmV3IEJhdGNoTm9ybU5vZGUoaW5mbykpOyAvLyBzYW1lIGxvZ2ljXHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkRyb3BvdXRcIiwgKGluZm8pID0+IG5ldyBEcm9wb3V0Tm9kZShpbmZvKSk7XHJcbn1cclxuIiwiaW1wb3J0IHR5cGUgeyBJVGVuc29yIH0gZnJvbSBcIi4uLy4uL2NvbXB1dGUvY29tcHV0ZS5pbnRlcmZhY2VzXCI7XHJcbmltcG9ydCB0eXBlIHsgT25ueE5vZGVJbmZvIH0gZnJvbSBcIi4uL29ubngtdHlwZXNcIjtcclxuaW1wb3J0IHsgT25ueE9wTm9kZSwgbWFrZVRlbnNvciwgT25ueE9wUmVnaXN0cnkgfSBmcm9tIFwiLi4vcmVnaXN0cnlcIjtcclxuXHJcbmZ1bmN0aW9uIHNpZ21vaWQoeDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIHJldHVybiAxIC8gKDEgKyBNYXRoLmV4cCgteCkpO1xyXG59XHJcblxyXG4vKipcclxuICogTFNUTTogTG9uZyBTaG9ydC1UZXJtIE1lbW9yeS5cclxuICpcclxuICogSW5wdXRzOiBYIFtzZXFfbGVuLCBiYXRjaCwgaW5wdXRfc2l6ZV0sIFcgW251bV9kaXIsIDQqaGlkZGVuLCBpbnB1dF0sIFIgW251bV9kaXIsIDQqaGlkZGVuLCBoaWRkZW5dLFxyXG4gKiAgICAgICAgIEIgW251bV9kaXIsIDgqaGlkZGVuXSAob3B0aW9uYWwpLCBzZXF1ZW5jZV9sZW5zLCBpbml0aWFsX2hpZGRlbiwgaW5pdGlhbF9jZWxsXHJcbiAqXHJcbiAqIFNpbXBsaWZpZWQ6IHNpbmdsZSBkaXJlY3Rpb24sIGJhdGNoPTEsIDJEIGlucHV0IFtzZXFfbGVuLCBpbnB1dF9zaXplXS5cclxuICogUmV0dXJucyBZX2ggWzEsIDEsIGhpZGRlbl9zaXplXSAobGFzdCBoaWRkZW4gc3RhdGUpLlxyXG4gKi9cclxuY2xhc3MgTFNUTU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaGlkZGVuU2l6ZTogbnVtYmVyO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5oaWRkZW5TaXplID0gdGhpcy5hdHRySW50KFwiaGlkZGVuX3NpemVcIiwgMCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgWCA9IGlucHV0c1swXTsgLy8gW3NlcV9sZW4sIGlucHV0X3NpemVdIG9yIFtzZXFfbGVuLCBiYXRjaCwgaW5wdXRfc2l6ZV1cclxuICAgICAgICBjb25zdCBXID0gaW5wdXRzWzFdOyAvLyBbMSwgNCpILCBpbnB1dF9zaXplXVxyXG4gICAgICAgIGNvbnN0IFIgPSBpbnB1dHNbMl07IC8vIFsxLCA0KkgsIEhdXHJcbiAgICAgICAgY29uc3QgQiA9IGlucHV0cy5sZW5ndGggPiAzID8gaW5wdXRzWzNdIDogbnVsbDsgLy8gWzEsIDgqSF1cclxuXHJcbiAgICAgICAgY29uc3Qgc2VxTGVuID0gWC5zaGFwZVswXTtcclxuICAgICAgICBjb25zdCBpbnB1dFNpemUgPSBYLnNoYXBlLmxlbmd0aCA+PSAzID8gWC5zaGFwZVsyXSA6IFguc2hhcGVbMV07XHJcbiAgICAgICAgY29uc3QgSCA9IHRoaXMuaGlkZGVuU2l6ZSB8fCBXLmRhdGEubGVuZ3RoIC8gKDQgKiBpbnB1dFNpemUpO1xyXG5cclxuICAgICAgICBsZXQgaCA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgbGV0IGMgPSBuZXcgRmxvYXQzMkFycmF5KEgpO1xyXG5cclxuICAgICAgICAvLyBQcmUtZXh0cmFjdCBXIGFuZCBSIG1hdHJpY2VzIChzdG9yZWQgYXMgWzQqSCwgaW5wdXRdIGFuZCBbNCpILCBIXSlcclxuICAgICAgICBjb25zdCBXNEggPSBXLmRhdGE7XHJcbiAgICAgICAgY29uc3QgUjRIID0gUi5kYXRhO1xyXG4gICAgICAgIGNvbnN0IGJpYXNXID0gQiA/IEIuZGF0YSA6IG51bGw7XHJcblxyXG4gICAgICAgIGZvciAobGV0IHQgPSAwOyB0IDwgc2VxTGVuOyB0KyspIHtcclxuICAgICAgICAgICAgY29uc3QgeE9mZnNldCA9IHQgKiBpbnB1dFNpemU7XHJcbiAgICAgICAgICAgIGNvbnN0IGdhdGVzID0gbmV3IEZsb2F0MzJBcnJheSg0ICogSCk7XHJcblxyXG4gICAgICAgICAgICAvLyBnYXRlcyA9IFcgQCB4ICsgUiBAIGggKyBiaWFzXHJcbiAgICAgICAgICAgIGZvciAobGV0IGcgPSAwOyBnIDwgNCAqIEg7IGcrKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0U2l6ZTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VtICs9IFc0SFtnICogaW5wdXRTaXplICsgaV0gKiBYLmRhdGFbeE9mZnNldCArIGldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBIOyBqKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBzdW0gKz0gUjRIW2cgKiBIICsgal0gKiBoW2pdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGJpYXNXKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VtICs9IGJpYXNXW2ddICsgYmlhc1dbNCAqIEggKyBnXTsgLy8gVyBiaWFzICsgUiBiaWFzXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBnYXRlc1tnXSA9IHN1bTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gaT1zaWdtb2lkLCBvPXNpZ21vaWQsIGY9c2lnbW9pZCwgYyc9dGFuaCAoSU9GQyBvcmRlciBpbiBPTk5YKVxyXG4gICAgICAgICAgICBjb25zdCBuZXdIID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuICAgICAgICAgICAgY29uc3QgbmV3QyA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgSDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpID0gc2lnbW9pZChnYXRlc1swICogSCArIGpdKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG8gPSBzaWdtb2lkKGdhdGVzWzEgKiBIICsgal0pO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZiA9IHNpZ21vaWQoZ2F0ZXNbMiAqIEggKyBqXSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBnID0gTWF0aC50YW5oKGdhdGVzWzMgKiBIICsgal0pO1xyXG4gICAgICAgICAgICAgICAgbmV3Q1tqXSA9IGYgKiBjW2pdICsgaSAqIGc7XHJcbiAgICAgICAgICAgICAgICBuZXdIW2pdID0gbyAqIE1hdGgudGFuaChuZXdDW2pdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBoID0gbmV3SDtcclxuICAgICAgICAgICAgYyA9IG5ld0M7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBSZXR1cm4gbGFzdCBoaWRkZW4gc3RhdGUgWzEsIDEsIEhdXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKGgsIFsxLCAxLCBIXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogR1JVOiBHYXRlZCBSZWN1cnJlbnQgVW5pdC5cclxuICpcclxuICogU2ltcGxpZmllZDogc2luZ2xlIGRpcmVjdGlvbiwgYmF0Y2g9MS5cclxuICogUmV0dXJucyBZX2ggWzEsIDEsIGhpZGRlbl9zaXplXS5cclxuICovXHJcbmNsYXNzIEdSVU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaGlkZGVuU2l6ZTogbnVtYmVyO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5oaWRkZW5TaXplID0gdGhpcy5hdHRySW50KFwiaGlkZGVuX3NpemVcIiwgMCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgWCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBXID0gaW5wdXRzWzFdOyAvLyBbMSwgMypILCBpbnB1dF9zaXplXVxyXG4gICAgICAgIGNvbnN0IFIgPSBpbnB1dHNbMl07IC8vIFsxLCAzKkgsIEhdXHJcbiAgICAgICAgY29uc3QgQiA9IGlucHV0cy5sZW5ndGggPiAzID8gaW5wdXRzWzNdIDogbnVsbDtcclxuXHJcbiAgICAgICAgY29uc3Qgc2VxTGVuID0gWC5zaGFwZVswXTtcclxuICAgICAgICBjb25zdCBpbnB1dFNpemUgPSBYLnNoYXBlLmxlbmd0aCA+PSAzID8gWC5zaGFwZVsyXSA6IFguc2hhcGVbMV07XHJcbiAgICAgICAgY29uc3QgSCA9IHRoaXMuaGlkZGVuU2l6ZSB8fCBXLmRhdGEubGVuZ3RoIC8gKDMgKiBpbnB1dFNpemUpO1xyXG5cclxuICAgICAgICBsZXQgaCA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgY29uc3QgVzNIID0gVy5kYXRhO1xyXG4gICAgICAgIGNvbnN0IFIzSCA9IFIuZGF0YTtcclxuICAgICAgICBjb25zdCBiaWFzVyA9IEIgPyBCLmRhdGEgOiBudWxsO1xyXG5cclxuICAgICAgICBmb3IgKGxldCB0ID0gMDsgdCA8IHNlcUxlbjsgdCsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHhPZmZzZXQgPSB0ICogaW5wdXRTaXplO1xyXG5cclxuICAgICAgICAgICAgLy8gQ29tcHV0ZSB6IGFuZCByIGdhdGVzOiBnYXRlID0gc2lnbW9pZChXX2dhdGUgQCB4ICsgUl9nYXRlIEAgaCArIGJpYXMpXHJcbiAgICAgICAgICAgIGNvbnN0IHpHYXRlID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuICAgICAgICAgICAgY29uc3QgckdhdGUgPSBuZXcgRmxvYXQzMkFycmF5KEgpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IEg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHpTdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJTdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dFNpemU7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHpTdW0gKz0gVzNIWygwICogSCArIGopICogaW5wdXRTaXplICsgaV0gKiBYLmRhdGFbeE9mZnNldCArIGldO1xyXG4gICAgICAgICAgICAgICAgICAgIHJTdW0gKz0gVzNIWygxICogSCArIGopICogaW5wdXRTaXplICsgaV0gKiBYLmRhdGFbeE9mZnNldCArIGldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBIOyBrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICB6U3VtICs9IFIzSFsoMCAqIEggKyBqKSAqIEggKyBrXSAqIGhba107XHJcbiAgICAgICAgICAgICAgICAgICAgclN1bSArPSBSM0hbKDEgKiBIICsgaikgKiBIICsga10gKiBoW2tdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGJpYXNXKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgelN1bSArPSBiaWFzV1swICogSCArIGpdICsgYmlhc1dbMyAqIEggKyBqXTtcclxuICAgICAgICAgICAgICAgICAgICByU3VtICs9IGJpYXNXWzEgKiBIICsgal0gKyBiaWFzV1s0ICogSCArIGpdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgekdhdGVbal0gPSBzaWdtb2lkKHpTdW0pO1xyXG4gICAgICAgICAgICAgICAgckdhdGVbal0gPSBzaWdtb2lkKHJTdW0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBDb21wdXRlIGNhbmRpZGF0ZSB3aXRoIGxpbmVhcl9iZWZvcmVfcmVzZXQ9MSAoT05OWCBkZWZhdWx0IGZvciBtb3N0IGV4cG9ydGVycyk6XHJcbiAgICAgICAgICAgIC8vIG4gPSB0YW5oKFduIEAgeCArIFdiX24gKyByICogKFJuIEAgaCArIFJiX24pKVxyXG4gICAgICAgICAgICBjb25zdCBuZXdIID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBIOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCBuU3VtID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRTaXplOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBuU3VtICs9IFczSFsoMiAqIEggKyBqKSAqIGlucHV0U2l6ZSArIGldICogWC5kYXRhW3hPZmZzZXQgKyBpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChiaWFzVykge1xyXG4gICAgICAgICAgICAgICAgICAgIG5TdW0gKz0gYmlhc1dbMiAqIEggKyBqXTsgLy8gVyBiaWFzIGZvciBjYW5kaWRhdGVcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrID0gMDsgayA8IEg7IGsrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJoICs9IFIzSFsoMiAqIEggKyBqKSAqIEggKyBrXSAqIGhba107XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoYmlhc1cpIHtcclxuICAgICAgICAgICAgICAgICAgICByaCArPSBiaWFzV1s1ICogSCArIGpdOyAvLyBSIGJpYXMgZm9yIGNhbmRpZGF0ZSAoaW5zaWRlIHJlc2V0KVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgblN1bSArPSByR2F0ZVtqXSAqIHJoO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbiA9IE1hdGgudGFuaChuU3VtKTtcclxuICAgICAgICAgICAgICAgIG5ld0hbal0gPSAoMSAtIHpHYXRlW2pdKSAqIG4gKyB6R2F0ZVtqXSAqIGhbal07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaCA9IG5ld0g7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IoaCwgWzEsIDEsIEhdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlclJlY3VycmVudE9wcyhyZWdpc3RyeTogT25ueE9wUmVnaXN0cnkpOiB2b2lkIHtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiTFNUTVwiLCAoaW5mbykgPT4gbmV3IExTVE1Ob2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiR1JVXCIsIChpbmZvKSA9PiBuZXcgR1JVTm9kZShpbmZvKSk7XHJcbn1cclxuIiwiaW1wb3J0IHR5cGUgeyBJVGVuc29yIH0gZnJvbSBcIi4uLy4uL2NvbXB1dGUvY29tcHV0ZS5pbnRlcmZhY2VzXCI7XHJcbmltcG9ydCB0eXBlIHsgT25ueE5vZGVJbmZvIH0gZnJvbSBcIi4uL29ubngtdHlwZXNcIjtcclxuaW1wb3J0IHsgT25ueE9wTm9kZSwgbWFrZVRlbnNvciwgT25ueE9wUmVnaXN0cnksIFBSSU9SSVRZX05BVElWRSB9IGZyb20gXCIuLi9yZWdpc3RyeVwiO1xyXG5cclxuY29uc3QgQkFDS0VORCA9IFwic3Bpa3lwYW5kYVwiO1xyXG5cclxuLy8g4pSA4pSA4pSAIEFjdGl2YXRpb24gZnVuY3Rpb25zIChtYXRjaGluZyBzcGlreXBhbmRhLWNvcmUgQWN0aXZhdGlvbkZ1bmN0aW9ucykg4pSA4pSA4pSA4pSAXHJcblxyXG5mdW5jdGlvbiBzcFJlbHUoeDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBNYXRoLm1heCgwLCB4KTtcclxufVxyXG5mdW5jdGlvbiBzcFNpZ21vaWQoeDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIHJldHVybiAxIC8gKDEgKyBNYXRoLmV4cCgteCkpO1xyXG59XHJcbmZ1bmN0aW9uIHNwVGFuaCh4OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIE1hdGgudGFuaCh4KTtcclxufVxyXG5cclxuZnVuY3Rpb24gdW5hcnlNYXAoaW5wOiBJVGVuc29yLCBmbjogKHg6IG51bWJlcikgPT4gbnVtYmVyKTogSVRlbnNvciB7XHJcbiAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGlucC5kYXRhLmxlbmd0aCk7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucC5kYXRhLmxlbmd0aDsgaSsrKSBvdXRbaV0gPSBmbihpbnAuZGF0YVtpXSk7XHJcbiAgICByZXR1cm4gbWFrZVRlbnNvcihvdXQsIFsuLi5pbnAuc2hhcGVdKTtcclxufVxyXG5cclxuY2xhc3MgU3BHZW1tTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBhbHBoYTogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBiZXRhOiBudW1iZXI7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRyYW5zQTogYm9vbGVhbjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdHJhbnNCOiBib29sZWFuO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5hbHBoYSA9IHRoaXMuYXR0cihcImFscGhhXCIsIDEuMCk7XHJcbiAgICAgICAgdGhpcy5iZXRhID0gdGhpcy5hdHRyKFwiYmV0YVwiLCAxLjApO1xyXG4gICAgICAgIHRoaXMudHJhbnNBID0gdGhpcy5hdHRySW50KFwidHJhbnNBXCIsIDApICE9PSAwO1xyXG4gICAgICAgIHRoaXMudHJhbnNCID0gdGhpcy5hdHRySW50KFwidHJhbnNCXCIsIDApICE9PSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IEEgPSBpbnB1dHNbMF0sXHJcbiAgICAgICAgICAgIEIgPSBpbnB1dHNbMV07XHJcbiAgICAgICAgY29uc3QgQyA9IGlucHV0cy5sZW5ndGggPiAyID8gaW5wdXRzWzJdIDogbnVsbDtcclxuICAgICAgICBjb25zdCBhUiA9IEEuc2hhcGVbMF0gPz8gMSxcclxuICAgICAgICAgICAgYUMgPSBBLnNoYXBlLmxlbmd0aCA+PSAyID8gQS5zaGFwZVsxXSA6IEEuZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgY29uc3QgYlIgPSBCLnNoYXBlWzBdID8/IDEsXHJcbiAgICAgICAgICAgIGJDID0gQi5zaGFwZS5sZW5ndGggPj0gMiA/IEIuc2hhcGVbMV0gOiBCLmRhdGEubGVuZ3RoO1xyXG4gICAgICAgIGNvbnN0IE0gPSB0aGlzLnRyYW5zQSA/IGFDIDogYVI7XHJcbiAgICAgICAgY29uc3QgSyA9IHRoaXMudHJhbnNBID8gYVIgOiBhQztcclxuICAgICAgICBjb25zdCBOID0gdGhpcy50cmFuc0IgPyBiUiA6IGJDO1xyXG5cclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KE0gKiBOKTtcclxuICAgICAgICBjb25zdCBhRGF0YSA9IEEuZGF0YSxcclxuICAgICAgICAgICAgYkRhdGEgPSBCLmRhdGE7XHJcblxyXG4gICAgICAgIC8vIE9wdGltaXplZDogbG9vcCB0aWxpbmcgZm9yIGNhY2hlIGxvY2FsaXR5IG9uIHNtYWxsIG1hdHJpY2VzXHJcbiAgICAgICAgaWYgKCF0aGlzLnRyYW5zQSAmJiAhdGhpcy50cmFuc0IpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgbSA9IDA7IG0gPCBNOyBtKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG1LID0gbSAqIEs7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBtTiA9IG0gKiBOO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBLOyBrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhID0gdGhpcy5hbHBoYSAqIGFEYXRhW21LICsga107XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qga04gPSBrICogTjtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IE47IG4rKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRbbU4gKyBuXSArPSBhICogYkRhdGFba04gKyBuXTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBtID0gMDsgbSA8IE07IG0rKykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBrID0gMDsgayA8IEs7IGsrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhaSA9IHRoaXMudHJhbnNBID8gayAqIE0gKyBtIDogbSAqIEsgKyBrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBiaSA9IHRoaXMudHJhbnNCID8gbiAqIEsgKyBrIDogayAqIE4gKyBuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdW0gKz0gYURhdGFbYWldICogYkRhdGFbYmldO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBvdXRbbSAqIE4gKyBuXSA9IHRoaXMuYWxwaGEgKiBzdW07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChDKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNEYXRhID0gQy5kYXRhO1xyXG4gICAgICAgICAgICBjb25zdCBjTGVuID0gY0RhdGEubGVuZ3RoO1xyXG4gICAgICAgICAgICBpZiAoY0xlbiA9PT0gTikge1xyXG4gICAgICAgICAgICAgICAgLy8gQmlhcyBpcyBbMSwgTl06IGJyb2FkY2FzdCBwZXIgcm93XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBtID0gMDsgbSA8IE07IG0rKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1OID0gbSAqIE47XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0W21OICsgbl0gKz0gdGhpcy5iZXRhICogY0RhdGFbbl07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXQubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBvdXRbaV0gKz0gdGhpcy5iZXRhICogY0RhdGFbaSAlIGNMZW5dO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbTSwgTl0pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU3BMc3RtTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBoaWRkZW5TaXplOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmhpZGRlblNpemUgPSB0aGlzLmF0dHJJbnQoXCJoaWRkZW5fc2l6ZVwiLCAwKTtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBYID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IFcgPSBpbnB1dHNbMV07XHJcbiAgICAgICAgY29uc3QgUiA9IGlucHV0c1syXTtcclxuICAgICAgICBjb25zdCBCID0gaW5wdXRzLmxlbmd0aCA+IDMgPyBpbnB1dHNbM10gOiBudWxsO1xyXG5cclxuICAgICAgICBjb25zdCBzZXFMZW4gPSBYLnNoYXBlWzBdO1xyXG4gICAgICAgIGNvbnN0IGlucHV0U2l6ZSA9IFguc2hhcGUubGVuZ3RoID49IDMgPyBYLnNoYXBlWzJdIDogWC5zaGFwZVsxXTtcclxuICAgICAgICBjb25zdCBIID0gdGhpcy5oaWRkZW5TaXplIHx8IFcuZGF0YS5sZW5ndGggLyAoNCAqIGlucHV0U2l6ZSk7XHJcblxyXG4gICAgICAgIGxldCBoID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuICAgICAgICBsZXQgYyA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgY29uc3QgVzRIID0gVy5kYXRhLFxyXG4gICAgICAgICAgICBSNEggPSBSLmRhdGE7XHJcbiAgICAgICAgY29uc3QgYmlhc1cgPSBCID8gQi5kYXRhIDogbnVsbDtcclxuXHJcbiAgICAgICAgLy8gUHJlLWFsbG9jYXRlIGdhdGUgYnVmZmVyXHJcbiAgICAgICAgY29uc3QgZ2F0ZXMgPSBuZXcgRmxvYXQzMkFycmF5KDQgKiBIKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCBzZXFMZW47IHQrKykge1xyXG4gICAgICAgICAgICBjb25zdCB4T2ZmID0gdCAqIGlucHV0U2l6ZTtcclxuXHJcbiAgICAgICAgICAgIC8vIENvbXB1dGUgZ2F0ZXM6IFcqeCArIFIqaCArIGJpYXNcclxuICAgICAgICAgICAgZ2F0ZXMuZmlsbCgwKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgZyA9IDA7IGcgPCA0ICogSDsgZysrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGdJbnB1dCA9IGcgKiBpbnB1dFNpemU7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBnSGlkZGVuID0gZyAqIEg7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0U2l6ZTsgaSsrKSBzdW0gKz0gVzRIW2dJbnB1dCArIGldICogWC5kYXRhW3hPZmYgKyBpXTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgSDsgaisrKSBzdW0gKz0gUjRIW2dIaWRkZW4gKyBqXSAqIGhbal07XHJcbiAgICAgICAgICAgICAgICBpZiAoYmlhc1cpIHN1bSArPSBiaWFzV1tnXSArIGJpYXNXWzQgKiBIICsgZ107XHJcbiAgICAgICAgICAgICAgICBnYXRlc1tnXSA9IHN1bTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gQXBwbHkgZ2F0ZSBmdW5jdGlvbnMgKElPRkMgb3JkZXIpXHJcbiAgICAgICAgICAgIGNvbnN0IG5ld0ggPSBuZXcgRmxvYXQzMkFycmF5KEgpO1xyXG4gICAgICAgICAgICBjb25zdCBuZXdDID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBIOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGkgPSBzcFNpZ21vaWQoZ2F0ZXNbal0pO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbyA9IHNwU2lnbW9pZChnYXRlc1tIICsgal0pO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZiA9IHNwU2lnbW9pZChnYXRlc1syICogSCArIGpdKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGcgPSBzcFRhbmgoZ2F0ZXNbMyAqIEggKyBqXSk7XHJcbiAgICAgICAgICAgICAgICBuZXdDW2pdID0gZiAqIGNbal0gKyBpICogZztcclxuICAgICAgICAgICAgICAgIG5ld0hbal0gPSBvICogc3BUYW5oKG5ld0Nbal0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGggPSBuZXdIO1xyXG4gICAgICAgICAgICBjID0gbmV3QztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihoLCBbMSwgMSwgSF0pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU3BHcnVOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGhpZGRlblNpemU6IG51bWJlcjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKGluZm8pO1xyXG4gICAgICAgIHRoaXMuaGlkZGVuU2l6ZSA9IHRoaXMuYXR0ckludChcImhpZGRlbl9zaXplXCIsIDApO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3QgVyA9IGlucHV0c1sxXTtcclxuICAgICAgICBjb25zdCBSID0gaW5wdXRzWzJdO1xyXG4gICAgICAgIGNvbnN0IEIgPSBpbnB1dHMubGVuZ3RoID4gMyA/IGlucHV0c1szXSA6IG51bGw7XHJcblxyXG4gICAgICAgIGNvbnN0IHNlcUxlbiA9IFguc2hhcGVbMF07XHJcbiAgICAgICAgY29uc3QgaW5wdXRTaXplID0gWC5zaGFwZS5sZW5ndGggPj0gMyA/IFguc2hhcGVbMl0gOiBYLnNoYXBlWzFdO1xyXG4gICAgICAgIGNvbnN0IEggPSB0aGlzLmhpZGRlblNpemUgfHwgVy5kYXRhLmxlbmd0aCAvICgzICogaW5wdXRTaXplKTtcclxuXHJcbiAgICAgICAgbGV0IGggPSBuZXcgRmxvYXQzMkFycmF5KEgpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCB0ID0gMDsgdCA8IHNlcUxlbjsgdCsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHhPZmYgPSB0ICogaW5wdXRTaXplO1xyXG5cclxuICAgICAgICAgICAgLy8gQ29tcHV0ZSB6IGFuZCByIGdhdGVzOiBnYXRlID0gc2lnbW9pZChXX2dhdGUgQCB4ICsgUl9nYXRlIEAgaCArIGJpYXMpXHJcbiAgICAgICAgICAgIGNvbnN0IHpHYXRlID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuICAgICAgICAgICAgY29uc3QgckdhdGUgPSBuZXcgRmxvYXQzMkFycmF5KEgpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IEg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHpTdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJTdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dFNpemU7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHpTdW0gKz0gVy5kYXRhWygwICogSCArIGopICogaW5wdXRTaXplICsgaV0gKiBYLmRhdGFbeE9mZiArIGldO1xyXG4gICAgICAgICAgICAgICAgICAgIHJTdW0gKz0gVy5kYXRhWygxICogSCArIGopICogaW5wdXRTaXplICsgaV0gKiBYLmRhdGFbeE9mZiArIGldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBIOyBrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICB6U3VtICs9IFIuZGF0YVsoMCAqIEggKyBqKSAqIEggKyBrXSAqIGhba107XHJcbiAgICAgICAgICAgICAgICAgICAgclN1bSArPSBSLmRhdGFbKDEgKiBIICsgaikgKiBIICsga10gKiBoW2tdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKEIpIHtcclxuICAgICAgICAgICAgICAgICAgICB6U3VtICs9IEIuZGF0YVswICogSCArIGpdICsgQi5kYXRhWzMgKiBIICsgal07XHJcbiAgICAgICAgICAgICAgICAgICAgclN1bSArPSBCLmRhdGFbMSAqIEggKyBqXSArIEIuZGF0YVs0ICogSCArIGpdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgekdhdGVbal0gPSBzcFNpZ21vaWQoelN1bSk7XHJcbiAgICAgICAgICAgICAgICByR2F0ZVtqXSA9IHNwU2lnbW9pZChyU3VtKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gQ2FuZGlkYXRlIHdpdGggbGluZWFyX2JlZm9yZV9yZXNldD0xOlxyXG4gICAgICAgICAgICAvLyBuID0gdGFuaChXbiBAIHggKyBXYl9uICsgciAqIChSbiBAIGggKyBSYl9uKSlcclxuICAgICAgICAgICAgY29uc3QgbmV3SCA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgSDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgblN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0U2l6ZTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgblN1bSArPSBXLmRhdGFbKDIgKiBIICsgaikgKiBpbnB1dFNpemUgKyBpXSAqIFguZGF0YVt4T2ZmICsgaV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoQikgblN1bSArPSBCLmRhdGFbMiAqIEggKyBqXTtcclxuICAgICAgICAgICAgICAgIGxldCByaCA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrID0gMDsgayA8IEg7IGsrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJoICs9IFIuZGF0YVsoMiAqIEggKyBqKSAqIEggKyBrXSAqIGhba107XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoQikgcmggKz0gQi5kYXRhWzUgKiBIICsgal07XHJcbiAgICAgICAgICAgICAgICBuU3VtICs9IHJHYXRlW2pdICogcmg7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuID0gc3BUYW5oKG5TdW0pO1xyXG4gICAgICAgICAgICAgICAgbmV3SFtqXSA9ICgxIC0gekdhdGVbal0pICogbiArIHpHYXRlW2pdICogaFtqXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBoID0gbmV3SDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihoLCBbMSwgMSwgSF0pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU3BDb252Tm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgWCA9IGlucHV0c1swXSxcclxuICAgICAgICAgICAgVyA9IGlucHV0c1sxXTtcclxuICAgICAgICBjb25zdCBCID0gaW5wdXRzLmxlbmd0aCA+IDIgPyBpbnB1dHNbMl0gOiBudWxsO1xyXG5cclxuICAgICAgICBpZiAoWC5zaGFwZS5sZW5ndGggPD0gMikge1xyXG4gICAgICAgICAgICAvLyBUcmVhdCAyRCBhcyBmdWxseSBjb25uZWN0ZWRcclxuICAgICAgICAgICAgY29uc3QgZmVhdHVyZXMgPSBYLnNoYXBlLmxlbmd0aCA9PT0gMiA/IFguc2hhcGVbMV0gOiBYLmRhdGEubGVuZ3RoO1xyXG4gICAgICAgICAgICBjb25zdCBiYXRjaCA9IFguc2hhcGVbMF0gPz8gMTtcclxuICAgICAgICAgICAgY29uc3Qgb3V0RiA9IFcuc2hhcGVbMF0gPz8gVy5kYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3Qgd0NvbHMgPSBXLmRhdGEubGVuZ3RoIC8gb3V0RjtcclxuICAgICAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShiYXRjaCAqIG91dEYpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IGJhdGNoOyBuKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IG8gPSAwOyBvIDwgb3V0RjsgbysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGVuID0gTWF0aC5taW4od0NvbHMsIGZlYXR1cmVzKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuRiA9IG4gKiBmZWF0dXJlcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb1cgPSBvICogd0NvbHM7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykgc3VtICs9IFguZGF0YVtuRiArIGldICogVy5kYXRhW29XICsgaV07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKEIpIHN1bSArPSBCLmRhdGFbbyAlIEIuZGF0YS5sZW5ndGhdO1xyXG4gICAgICAgICAgICAgICAgICAgIG91dFtuICogb3V0RiArIG9dID0gc3VtO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtiYXRjaCwgb3V0Rl0pXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIDNEOiBbTiwgQ19pbiwgTF1cclxuICAgICAgICBjb25zdCBOID0gWC5zaGFwZVswXSxcclxuICAgICAgICAgICAgQ19pbiA9IFguc2hhcGVbMV0sXHJcbiAgICAgICAgICAgIEwgPSBYLnNoYXBlWzJdO1xyXG4gICAgICAgIGNvbnN0IENfb3V0ID0gVy5zaGFwZVswXTtcclxuICAgICAgICBjb25zdCBrTCA9IFcuc2hhcGUubGVuZ3RoID49IDMgPyBXLnNoYXBlWzJdIDogMTtcclxuICAgICAgICBjb25zdCBzdHJpZGUgPSB0aGlzLmF0dHJJbnQoXCJzdHJpZGVzXCIsIDEpO1xyXG4gICAgICAgIGNvbnN0IHBhZCA9IHRoaXMuYXR0ckludChcInBhZHNcIiwgMCk7XHJcbiAgICAgICAgY29uc3Qgb3V0TCA9IE1hdGguZmxvb3IoKEwgKyAyICogcGFkIC0ga0wpIC8gc3RyaWRlKSArIDE7XHJcblxyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoTiAqIENfb3V0ICogb3V0TCk7XHJcbiAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgY28gPSAwOyBjbyA8IENfb3V0OyBjbysrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBvbCA9IDA7IG9sIDwgb3V0TDsgb2wrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGNpID0gMDsgY2kgPCBDX2luOyBjaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGtrID0gMDsga2sgPCBrTDsga2srKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWwgPSBvbCAqIHN0cmlkZSAtIHBhZCArIGtrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlsID49IDAgJiYgaWwgPCBMKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VtICs9IFguZGF0YVtuICogQ19pbiAqIEwgKyBjaSAqIEwgKyBpbF0gKiBXLmRhdGFbY28gKiBDX2luICoga0wgKyBjaSAqIGtMICsga2tdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChCKSBzdW0gKz0gQi5kYXRhW2NvXTtcclxuICAgICAgICAgICAgICAgICAgICBvdXRbbiAqIENfb3V0ICogb3V0TCArIGNvICogb3V0TCArIG9sXSA9IHN1bTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbTiwgQ19vdXQsIG91dExdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIOKUgOKUgOKUgCBSZWdpc3RyYXRpb24g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4vKipcclxuICogUmVnaXN0ZXIgU3Bpa3lQYW5kYSBuYXRpdmUgaW1wbGVtZW50YXRpb25zIGF0IFBSSU9SSVRZX05BVElWRS5cclxuICogVGhlc2Ugb3ZlcnJpZGUgdGhlIGdlbmVyaWMgT05OWCBpbXBsZW1lbnRhdGlvbnMgZm9yIGtleSBvcHMuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJTcGlreVBhbmRhT3BzKHJlZ2lzdHJ5OiBPbm54T3BSZWdpc3RyeSk6IHZvaWQge1xyXG4gICAgLy8gQWN0aXZhdGlvbnMgKHVzaW5nIFNwaWt5UGFuZGEncyBhY3RpdmF0aW9uIGZ1bmN0aW9ucylcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFxyXG4gICAgICAgIFwiUmVsdVwiLFxyXG4gICAgICAgIChpbmZvKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IG4gPSBuZXcgKGNsYXNzIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICAgICAgICAgICAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgICAgICAgICAgICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbdW5hcnlNYXAoaW5wdXRzWzBdLCBzcFJlbHUpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSkoaW5mbyk7XHJcbiAgICAgICAgICAgIHJldHVybiBuO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgUFJJT1JJVFlfTkFUSVZFLFxyXG4gICAgICAgIEJBQ0tFTkRcclxuICAgICk7XHJcblxyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXHJcbiAgICAgICAgXCJTaWdtb2lkXCIsXHJcbiAgICAgICAgKGluZm8pID0+IHtcclxuICAgICAgICAgICAgY29uc3QgbiA9IG5ldyAoY2xhc3MgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgICAgICAgICAgICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnB1dHNbMF0sIHNwU2lnbW9pZCldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KShpbmZvKTtcclxuICAgICAgICAgICAgcmV0dXJuIG47XHJcbiAgICAgICAgfSxcclxuICAgICAgICBQUklPUklUWV9OQVRJVkUsXHJcbiAgICAgICAgQkFDS0VORFxyXG4gICAgKTtcclxuXHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcclxuICAgICAgICBcIlRhbmhcIixcclxuICAgICAgICAoaW5mbykgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBuID0gbmV3IChjbGFzcyBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgICAgICAgICAgICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICAgICAgICAgICAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3VuYXJ5TWFwKGlucHV0c1swXSwgc3BUYW5oKV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pKGluZm8pO1xyXG4gICAgICAgICAgICByZXR1cm4gbjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIFBSSU9SSVRZX05BVElWRSxcclxuICAgICAgICBCQUNLRU5EXHJcbiAgICApO1xyXG5cclxuICAgIC8vIE1hdHJpeCBvcHNcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiR2VtbVwiLCAoaW5mbykgPT4gbmV3IFNwR2VtbU5vZGUoaW5mbyksIFBSSU9SSVRZX05BVElWRSwgQkFDS0VORCk7XHJcblxyXG4gICAgLy8gUmVjdXJyZW50XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkxTVE1cIiwgKGluZm8pID0+IG5ldyBTcExzdG1Ob2RlKGluZm8pLCBQUklPUklUWV9OQVRJVkUsIEJBQ0tFTkQpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJHUlVcIiwgKGluZm8pID0+IG5ldyBTcEdydU5vZGUoaW5mbyksIFBSSU9SSVRZX05BVElWRSwgQkFDS0VORCk7XHJcblxyXG4gICAgLy8gQ29udlxyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJDb252XCIsIChpbmZvKSA9PiBuZXcgU3BDb252Tm9kZShpbmZvKSwgUFJJT1JJVFlfTkFUSVZFLCBCQUNLRU5EKTtcclxufVxyXG4iLCJleHBvcnQgKiBmcm9tIFwiLi9zdHJlYW1cIjtcbmV4cG9ydCAqIGZyb20gXCIuL3JlYWRlclwiO1xuZXhwb3J0ICogZnJvbSBcIi4vd3JpdGVyXCI7XG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcclxuLy8gUHJvdG9idWYgd2lyZSBmb3JtYXQgcmVhZGVyXHJcbi8vXHJcbi8vIFBvcnRlZCBmcm9tIEN5YW5NeWNlbGl1bS9CbHVlU3RlZWxMYWR5QnVnIEMrKyBpbXBsZW1lbnRhdGlvbiAobGJfcGFyc2VyKS5cclxuLy8gUmVhZHMgcHJvdG9idWYtZW5jb2RlZCBiaW5hcnkgZGF0YSB3aXRob3V0IHJlcXVpcmluZyBnZW5lcmF0ZWQgY29kZSBvclxyXG4vLyBleHRlcm5hbCBkZXBlbmRlbmNpZXMuXHJcbi8vXHJcbi8vIFN1cHBvcnRzOlxyXG4vLyAgIC0gVmFyaW50LCBmaXhlZDMyLCBmaXhlZDY0IHdpcmUgdHlwZXNcclxuLy8gICAtIExlbmd0aC1kZWxpbWl0ZWQgZmllbGRzIChzdHJpbmdzLCBieXRlcywgc3ViLW1lc3NhZ2VzKVxyXG4vLyAgIC0gUGFja2VkIHJlcGVhdGVkIGZpZWxkc1xyXG4vLyAgIC0gU2F2ZS9yZXN0b3JlIHNuYXBzaG90cyBmb3IgdHdvLXBhc3MgcGFyc2luZ1xyXG4vLyAgIC0gU3ViLW1lc3NhZ2UgcmVhZGVycyB3aXRoIGJvdW5kZWQgc2NvcGVcclxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcblxyXG5pbXBvcnQgeyBJSW5wdXRTdHJlYW0sIExCX0VPRiwgU2Vla09yaWdpbiwgU3RyZWFtVmlldyB9IGZyb20gXCIuL3N0cmVhbVwiO1xyXG5cclxuY29uc3QgTUFYX1JFQURFUl9TTkFQU0hPVF9ERVBUSCA9IDg7XHJcblxyXG4vLyDilIDilIDilIAgV2lyZSB0eXBlcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbmV4cG9ydCBlbnVtIFdpcmVUeXBlIHtcclxuICAgIFZBUklOVCA9IDAsXHJcbiAgICBGSVhFRDY0ID0gMSxcclxuICAgIExFTiA9IDIsXHJcbiAgICBGSVhFRDMyID0gNSxcclxufVxyXG5cclxuLy8g4pSA4pSA4pSAIEludGVybmFsIHN0YXRlIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuaW50ZXJmYWNlIFJlYWRlclN0YXR1cyB7XHJcbiAgICBmaWVsZE51bWJlcjogbnVtYmVyO1xyXG4gICAgd2lyZVR5cGU6IFdpcmVUeXBlO1xyXG4gICAgZGVwdGg6IG51bWJlcjtcclxuICAgIGxlbmd0aDogbnVtYmVyO1xyXG4gICAgbGVuZ3RoUmVhZDogYm9vbGVhbjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFJlYWRlclNuYXBzaG90IHtcclxuICAgIHBvc2l0aW9uOiBudW1iZXI7XHJcbiAgICBzdGF0dXM6IFJlYWRlclN0YXR1cztcclxufVxyXG5cclxuLy8g4pSA4pSA4pSAIFNjcmF0Y2ggYnVmZmVycyAocmV1c2VkIGFjcm9zcyByZWFkcyB0byBhdm9pZCBhbGxvY2F0aW9ucykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG5jb25zdCBfc2NyYXRjaDQgPSBuZXcgVWludDhBcnJheSg0KTtcclxuY29uc3QgX3NjcmF0Y2g4ID0gbmV3IFVpbnQ4QXJyYXkoOCk7XHJcbmNvbnN0IF92aWV3NCA9IG5ldyBEYXRhVmlldyhfc2NyYXRjaDQuYnVmZmVyKTtcclxuY29uc3QgX3ZpZXc4ID0gbmV3IERhdGFWaWV3KF9zY3JhdGNoOC5idWZmZXIpO1xyXG5cclxuLy8g4pSA4pSA4pSAIFBCUmVhZGVyIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuLyoqXHJcbiAqIFB1bGwtc3R5bGUgcHJvdG9idWYgcmVhZGVyLiBSZWFkcyB0YWdzLCB0aGVuIHZhbHVlcyBvbiBkZW1hbmQuXHJcbiAqXHJcbiAqIEVxdWl2YWxlbnQgdG8gQmx1ZVN0ZWVsTGFkeUJ1Zzo6UEJSZWFkZXIuXHJcbiAqXHJcbiAqIFVzYWdlOlxyXG4gKiBgYGB0eXBlc2NyaXB0XHJcbiAqIGNvbnN0IHJlYWRlciA9IG5ldyBQQlJlYWRlcihuZXcgTWVtb3J5U3RyZWFtKGJ5dGVzKSk7XHJcbiAqIHdoaWxlIChyZWFkZXIucmVhZFRhZygpKSB7XHJcbiAqICAgICBzd2l0Y2ggKHJlYWRlci5maWVsZE51bWJlcikge1xyXG4gKiAgICAgICAgIGNhc2UgMTogdmFsdWUgPSByZWFkZXIucmVhZEludDMyKCk7IGJyZWFrO1xyXG4gKiAgICAgICAgIGNhc2UgMjogbmFtZSA9IHJlYWRlci5yZWFkU3RyaW5nKDI1Nik7IGJyZWFrO1xyXG4gKiAgICAgICAgIGRlZmF1bHQ6IHJlYWRlci5za2lwKCk7IGJyZWFrO1xyXG4gKiAgICAgfVxyXG4gKiB9XHJcbiAqIGBgYFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFBCUmVhZGVyIHtcclxuICAgIHByb3RlY3RlZCBfaW5wdXQ6IElJbnB1dFN0cmVhbTtcclxuICAgIHByb3RlY3RlZCBfc3RhdHVzOiBSZWFkZXJTdGF0dXM7XHJcbiAgICBwcm90ZWN0ZWQgX3NuYXBzaG90czogUmVhZGVyU25hcHNob3RbXTtcclxuICAgIHByb3RlY3RlZCBfYWN0aXZlU25hcHNob3Q6IG51bWJlcjtcclxuXHJcbiAgICBwdWJsaWMgY29uc3RydWN0b3IoaW5wdXQ6IElJbnB1dFN0cmVhbSkge1xyXG4gICAgICAgIHRoaXMuX2lucHV0ID0gaW5wdXQ7XHJcbiAgICAgICAgdGhpcy5fc3RhdHVzID0ge1xyXG4gICAgICAgICAgICBmaWVsZE51bWJlcjogMCxcclxuICAgICAgICAgICAgd2lyZVR5cGU6IFdpcmVUeXBlLlZBUklOVCxcclxuICAgICAgICAgICAgZGVwdGg6IDAsXHJcbiAgICAgICAgICAgIGxlbmd0aDogMCxcclxuICAgICAgICAgICAgbGVuZ3RoUmVhZDogZmFsc2UsXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLl9zbmFwc2hvdHMgPSBuZXcgQXJyYXkoTUFYX1JFQURFUl9TTkFQU0hPVF9ERVBUSCk7XHJcbiAgICAgICAgdGhpcy5fYWN0aXZlU25hcHNob3QgPSAtMTtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgVGFnIHJlYWRpbmcg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWFkIHRoZSBuZXh0IHByb3RvYnVmIHRhZyBmcm9tIHRoZSBpbnB1dC5cclxuICAgICAqIEFmdGVyIHRoaXMgY2FsbCwgYGZpZWxkTnVtYmVyYCBhbmQgYHdpcmVUeXBlYCBhcmUgc2V0LlxyXG4gICAgICogQHJldHVybnMgdHJ1ZSBpZiBhIHRhZyB3YXMgcmVhZDsgZmFsc2UgYXQgZW5kIG9mIHN0cmVhbS5cclxuICAgICAqL1xyXG4gICAgcHVibGljIHJlYWRUYWcoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgY29uc3QgdGFnID0gdGhpcy5fcmVhZFZhcmludCgpO1xyXG4gICAgICAgIGlmICh0YWcgPT09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICB0aGlzLl9zdGF0dXMuZmllbGROdW1iZXIgPSBOdW1iZXIodGFnKSA+Pj4gMztcclxuICAgICAgICB0aGlzLl9zdGF0dXMud2lyZVR5cGUgPSAoTnVtYmVyKHRhZykgJiAweDA3KSBhcyBXaXJlVHlwZTtcclxuICAgICAgICB0aGlzLl9zdGF0dXMubGVuZ3RoUmVhZCA9IGZhbHNlO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBBY2Nlc3NvcnMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHVibGljIGdldCBmaWVsZE51bWJlcigpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0dXMuZmllbGROdW1iZXI7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCB3aXJlVHlwZSgpOiBXaXJlVHlwZSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXR1cy53aXJlVHlwZTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGRlcHRoKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXR1cy5kZXB0aDtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IHBvc2l0aW9uKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lucHV0LmdldFBvc2l0aW9uKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBzaXplKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lucHV0LmdldFNpemUoKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IHJlbWFpbmluZ0J5dGVzKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lucHV0LmdldFJlbWFpbmluZ0J5dGVzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBpbnB1dCgpOiBJSW5wdXRTdHJlYW0ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9pbnB1dDtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgVmFsdWUgcmVhZGVycyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICAvKiogUmVhZCBhIGxlbmd0aCBwcmVmaXggKGZvciBMRU4gd2lyZSB0eXBlKS4gQ2FjaGVzIHRoZSBsZW5ndGguICovXHJcbiAgICBwdWJsaWMgcmVhZExlbmd0aCh2YWxpZGF0ZTogYm9vbGVhbiA9IHRydWUpOiBudW1iZXIgfCBudWxsIHtcclxuICAgICAgICBpZiAodGhpcy5fc3RhdHVzLndpcmVUeXBlICE9PSBXaXJlVHlwZS5MRU4pIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5fc3RhdHVzLmxlbmd0aFJlYWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXR1cy5sZW5ndGg7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB2ID0gdGhpcy5fcmVhZFZhcmludCgpO1xyXG4gICAgICAgIGlmICh2ID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgdGhpcy5fc3RhdHVzLmxlbmd0aCA9IE51bWJlcih2KTtcclxuICAgICAgICB0aGlzLl9zdGF0dXMubGVuZ3RoUmVhZCA9IHZhbGlkYXRlO1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0dXMubGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKiBSZWFkIGFuIGludDMyICh2YXJpbnQgb3IgZml4ZWQzMiBkZXBlbmRpbmcgb24gd2lyZSB0eXBlKS4gKi9cclxuICAgIHB1YmxpYyByZWFkSW50MzIoKTogbnVtYmVyIHwgbnVsbCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3N0YXR1cy53aXJlVHlwZSA9PT0gV2lyZVR5cGUuVkFSSU5UKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHYgPSB0aGlzLl9yZWFkVmFyaW50KCk7XHJcbiAgICAgICAgICAgIHJldHVybiB2ICE9PSBudWxsID8gTnVtYmVyKHYpIHwgMCA6IG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLl9yZWFkRml4ZWQzMkFzSW50KCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIFJlYWQgYW4gaW50NjQgYXMgYSBudW1iZXIgKHZhcmludCBvciBmaXhlZDY0KS4gKi9cclxuICAgIHB1YmxpYyByZWFkSW50NjQoKTogbnVtYmVyIHwgbnVsbCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3N0YXR1cy53aXJlVHlwZSA9PT0gV2lyZVR5cGUuVkFSSU5UKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHYgPSB0aGlzLl9yZWFkVmFyaW50KCk7XHJcbiAgICAgICAgICAgIHJldHVybiB2ICE9PSBudWxsID8gTnVtYmVyKHYpIDogbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlYWRGaXhlZDY0QXNOdW1iZXIoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKiogUmVhZCBhIGZsb2F0MzIgKGZpeGVkMzIgd2lyZSB0eXBlKS4gKi9cclxuICAgIHB1YmxpYyByZWFkRmxvYXQoKTogbnVtYmVyIHwgbnVsbCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2lucHV0LnJlYWQoX3NjcmF0Y2g0LCAwLCA0KSAhPT0gNCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgcmV0dXJuIF92aWV3NC5nZXRGbG9hdDMyKDAsIHRydWUpOyAvLyBsaXR0bGUtZW5kaWFuXHJcbiAgICB9XHJcblxyXG4gICAgLyoqIFJlYWQgYSBmbG9hdDY0IChmaXhlZDY0IHdpcmUgdHlwZSkuICovXHJcbiAgICBwdWJsaWMgcmVhZERvdWJsZSgpOiBudW1iZXIgfCBudWxsIHtcclxuICAgICAgICBpZiAodGhpcy5faW5wdXQucmVhZChfc2NyYXRjaDgsIDAsIDgpICE9PSA4KSByZXR1cm4gbnVsbDtcclxuICAgICAgICByZXR1cm4gX3ZpZXc4LmdldEZsb2F0NjQoMCwgdHJ1ZSk7IC8vIGxpdHRsZS1lbmRpYW5cclxuICAgIH1cclxuXHJcbiAgICAvKiogUmVhZCBhIGJvb2xlYW4gKHZhcmludCB3aXJlIHR5cGUpLiAqL1xyXG4gICAgcHVibGljIHJlYWRCb29sKCk6IGJvb2xlYW4gfCBudWxsIHtcclxuICAgICAgICBjb25zdCB2ID0gdGhpcy5fcmVhZFZhcmludCgpO1xyXG4gICAgICAgIGlmICh2ID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICByZXR1cm4gdiAhPT0gMDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlYWQgYSBsZW5ndGgtZGVsaW1pdGVkIHN0cmluZyB3aXRoIGEgbWF4IHNpemUgYm91bmQuXHJcbiAgICAgKiBFcXVpdmFsZW50IHRvIHJlYWRWYWx1ZV9zKGNoYXIqLCBpbnQpIGluIEMrKy5cclxuICAgICAqL1xyXG4gICAgcHVibGljIHJlYWRTdHJpbmcobWF4TGVuZ3RoOiBudW1iZXIgPSAyNTYpOiBzdHJpbmcgfCBudWxsIHtcclxuICAgICAgICBjb25zdCBsZW4gPSB0aGlzLnJlYWRMZW5ndGgoKTtcclxuICAgICAgICBpZiAobGVuID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlTGVuZ3RoUmVhZCgpO1xyXG5cclxuICAgICAgICBjb25zdCByZWFkTGVuID0gTWF0aC5taW4obGVuLCBtYXhMZW5ndGgpO1xyXG4gICAgICAgIGNvbnN0IGJ1ZiA9IG5ldyBVaW50OEFycmF5KHJlYWRMZW4pO1xyXG4gICAgICAgIGlmICh0aGlzLl9pbnB1dC5yZWFkKGJ1ZiwgMCwgcmVhZExlbikgIT09IHJlYWRMZW4pIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICAvLyBTa2lwIGV4Y2VzcyBieXRlcyBpZiBzdHJpbmcgd2FzIHRydW5jYXRlZFxyXG4gICAgICAgIGlmIChyZWFkTGVuIDwgbGVuKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5faW5wdXQuc2VlayhsZW4gLSByZWFkTGVuLCBTZWVrT3JpZ2luLkNVUlJFTlQpKSByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUoYnVmKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlYWQgbGVuZ3RoLWRlbGltaXRlZCByYXcgYnl0ZXMuXHJcbiAgICAgKiBAcGFyYW0gbWF4U2l6ZSAgTWF4aW11bSBieXRlcyB0byByZWFkIChleGNlc3MgaXMgc2tpcHBlZCkuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyByZWFkQnl0ZXMobWF4U2l6ZT86IG51bWJlcik6IFVpbnQ4QXJyYXkgfCBudWxsIHtcclxuICAgICAgICBjb25zdCBsZW4gPSB0aGlzLnJlYWRMZW5ndGgoKTtcclxuICAgICAgICBpZiAobGVuID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlTGVuZ3RoUmVhZCgpO1xyXG5cclxuICAgICAgICBjb25zdCByZWFkTGVuID0gbWF4U2l6ZSAhPT0gdW5kZWZpbmVkID8gTWF0aC5taW4obGVuLCBtYXhTaXplKSA6IGxlbjtcclxuICAgICAgICBjb25zdCBidWYgPSBuZXcgVWludDhBcnJheShyZWFkTGVuKTtcclxuICAgICAgICBpZiAodGhpcy5faW5wdXQucmVhZChidWYsIDAsIHJlYWRMZW4pICE9PSByZWFkTGVuKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKHJlYWRMZW4gPCBsZW4pIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLl9pbnB1dC5zZWVrKGxlbiAtIHJlYWRMZW4sIFNlZWtPcmlnaW4uQ1VSUkVOVCkpIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGJ1ZjtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgUGFja2VkIHJlcGVhdGVkIGZpZWxkcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlYWQgcGFja2VkIHZhcmludCBpbnQzMiB2YWx1ZXMgaW50byBhIHByZS1hbGxvY2F0ZWQgYXJyYXkuXHJcbiAgICAgKiBAcGFyYW0gdGFyZ2V0ICBUYXJnZXQgYXJyYXkuXHJcbiAgICAgKiBAcGFyYW0gbWF4Q291bnQgIE1heGltdW0gbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHJlYWQuXHJcbiAgICAgKiBAcmV0dXJucyBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIGFjdHVhbGx5IHJlYWQsIG9yIG51bGwgb24gZXJyb3IuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyByZWFkUGFja2VkSW50MzIodGFyZ2V0OiBJbnQzMkFycmF5LCBtYXhDb3VudDogbnVtYmVyKTogbnVtYmVyIHwgbnVsbCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3N0YXR1cy53aXJlVHlwZSAhPT0gV2lyZVR5cGUuTEVOKSByZXR1cm4gbnVsbDtcclxuICAgICAgICBjb25zdCBsZW4gPSB0aGlzLnJlYWRMZW5ndGgoKTtcclxuICAgICAgICBpZiAobGVuID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlTGVuZ3RoUmVhZCgpO1xyXG5cclxuICAgICAgICBjb25zdCBlbmQgPSB0aGlzLnBvc2l0aW9uICsgbGVuO1xyXG4gICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICB3aGlsZSAodGhpcy5wb3NpdGlvbiA8IGVuZCkge1xyXG4gICAgICAgICAgICBjb25zdCB2ID0gdGhpcy5fcmVhZFZhcmludCgpO1xyXG4gICAgICAgICAgICBpZiAodiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIGlmIChpIDwgbWF4Q291bnQpIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldFtpKytdID0gTnVtYmVyKHYpIHwgMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlYWQgcGFja2VkIGZsb2F0MzIgdmFsdWVzIGludG8gYSBwcmUtYWxsb2NhdGVkIGFycmF5LlxyXG4gICAgICogQHBhcmFtIHRhcmdldCAgVGFyZ2V0IGFycmF5LlxyXG4gICAgICogQHBhcmFtIG1heENvdW50ICBNYXhpbXVtIG51bWJlciBvZiBlbGVtZW50cyB0byByZWFkLlxyXG4gICAgICogQHJldHVybnMgVGhlIG51bWJlciBvZiBlbGVtZW50cyBhY3R1YWxseSByZWFkLCBvciBudWxsIG9uIGVycm9yLlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgcmVhZFBhY2tlZEZsb2F0MzIodGFyZ2V0OiBGbG9hdDMyQXJyYXksIG1heENvdW50OiBudW1iZXIpOiBudW1iZXIgfCBudWxsIHtcclxuICAgICAgICBpZiAodGhpcy5fc3RhdHVzLndpcmVUeXBlICE9PSBXaXJlVHlwZS5MRU4pIHJldHVybiBudWxsO1xyXG4gICAgICAgIGNvbnN0IGxlbiA9IHRoaXMucmVhZExlbmd0aCgpO1xyXG4gICAgICAgIGlmIChsZW4gPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVMZW5ndGhSZWFkKCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGVuZCA9IHRoaXMucG9zaXRpb24gKyBsZW47XHJcbiAgICAgICAgbGV0IGkgPSAwO1xyXG4gICAgICAgIHdoaWxlICh0aGlzLnBvc2l0aW9uIDwgZW5kKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9pbnB1dC5yZWFkKF9zY3JhdGNoNCwgMCwgNCkgIT09IDQpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICBpZiAoaSA8IG1heENvdW50KSB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXRbaSsrXSA9IF92aWV3NC5nZXRGbG9hdDMyKDAsIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVhZCBwYWNrZWQgZmxvYXQ2NCB2YWx1ZXMgaW50byBhIHByZS1hbGxvY2F0ZWQgYXJyYXkuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyByZWFkUGFja2VkRmxvYXQ2NCh0YXJnZXQ6IEZsb2F0NjRBcnJheSwgbWF4Q291bnQ6IG51bWJlcik6IG51bWJlciB8IG51bGwge1xyXG4gICAgICAgIGlmICh0aGlzLl9zdGF0dXMud2lyZVR5cGUgIT09IFdpcmVUeXBlLkxFTikgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgY29uc3QgbGVuID0gdGhpcy5yZWFkTGVuZ3RoKCk7XHJcbiAgICAgICAgaWYgKGxlbiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZUxlbmd0aFJlYWQoKTtcclxuXHJcbiAgICAgICAgY29uc3QgZW5kID0gdGhpcy5wb3NpdGlvbiArIGxlbjtcclxuICAgICAgICBsZXQgaSA9IDA7XHJcbiAgICAgICAgd2hpbGUgKHRoaXMucG9zaXRpb24gPCBlbmQpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX2lucHV0LnJlYWQoX3NjcmF0Y2g4LCAwLCA4KSAhPT0gOCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIGlmIChpIDwgbWF4Q291bnQpIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldFtpKytdID0gX3ZpZXc4LmdldEZsb2F0NjQoMCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFN1Yi1tZXNzYWdlIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlIGEgc3ViLXJlYWRlciBzY29wZWQgdG8gdGhlIGN1cnJlbnQgbGVuZ3RoLWRlbGltaXRlZCBmaWVsZC5cclxuICAgICAqIFRoZSBzdWItcmVhZGVyJ3Mgc3RyZWFtIGlzIGJvdW5kZWQgdG8gdGhlIG1lc3NhZ2UgYnl0ZXMuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBnZXRTdWJNZXNzYWdlUmVhZGVyKCk6IFBCU3ViUmVhZGVyIHwgbnVsbCB7XHJcbiAgICAgICAgY29uc3QgbGVuID0gdGhpcy5yZWFkTGVuZ3RoKCk7XHJcbiAgICAgICAgaWYgKGxlbiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZUxlbmd0aFJlYWQoKTtcclxuICAgICAgICByZXR1cm4gbmV3IFBCU3ViUmVhZGVyKHRoaXMsIHRoaXMuX3N0YXR1cy5kZXB0aCArIDEsIHRoaXMucG9zaXRpb24sIGxlbik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFNraXAg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgLyoqIFNraXAgdGhlIGN1cnJlbnQgZmllbGQgdmFsdWUuICovXHJcbiAgICBwdWJsaWMgc2tpcCgpOiBib29sZWFuIHtcclxuICAgICAgICBzd2l0Y2ggKHRoaXMuX3N0YXR1cy53aXJlVHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFdpcmVUeXBlLlZBUklOVDoge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlYWRWYXJpbnQoKSAhPT0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlIFdpcmVUeXBlLkZJWEVEMzI6IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9pbnB1dC5zZWVrKDQsIFNlZWtPcmlnaW4uQ1VSUkVOVCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBXaXJlVHlwZS5GSVhFRDY0OiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5faW5wdXQuc2Vlayg4LCBTZWVrT3JpZ2luLkNVUlJFTlQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgV2lyZVR5cGUuTEVOOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsZW4gPSB0aGlzLnJlYWRMZW5ndGgoKTtcclxuICAgICAgICAgICAgICAgIGlmIChsZW4gPT09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2ludmFsaWRhdGVMZW5ndGhSZWFkKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5faW5wdXQuc2VlayhsZW4sIFNlZWtPcmlnaW4uQ1VSUkVOVCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFNhdmUgLyByZXN0b3JlIChzbmFwc2hvdCBzdGFjaykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgLyoqIFNhdmUgdGhlIGN1cnJlbnQgcGFyc2VyIHN0YXRlLiBTdHJlYW0gbXVzdCBzdXBwb3J0IHNlZWtpbmcuICovXHJcbiAgICBwdWJsaWMgc2F2ZSgpOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5faW5wdXQuY2FuU2VlaygpICYmIHRoaXMuX2FjdGl2ZVNuYXBzaG90IDwgTUFYX1JFQURFUl9TTkFQU0hPVF9ERVBUSCAtIDEpIHtcclxuICAgICAgICAgICAgdGhpcy5fYWN0aXZlU25hcHNob3QrKztcclxuICAgICAgICAgICAgdGhpcy5fc25hcHNob3RzW3RoaXMuX2FjdGl2ZVNuYXBzaG90XSA9IHtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiB7IC4uLnRoaXMuX3N0YXR1cyB9LFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKiogUmVzdG9yZSB0aGUgbGFzdCBzYXZlZCBzdGF0ZS4gKi9cclxuICAgIHB1YmxpYyByZXN0b3JlKCk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLl9pbnB1dC5jYW5TZWVrKCkgJiYgdGhpcy5fYWN0aXZlU25hcHNob3QgPj0gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBzbmFwID0gdGhpcy5fc25hcHNob3RzW3RoaXMuX2FjdGl2ZVNuYXBzaG90XTtcclxuICAgICAgICAgICAgdGhpcy5fc3RhdHVzID0geyAuLi5zbmFwLnN0YXR1cyB9O1xyXG4gICAgICAgICAgICB0aGlzLl9pbnB1dC5zZWVrKHNuYXAucG9zaXRpb24sIFNlZWtPcmlnaW4uQkVHSU4pO1xyXG4gICAgICAgICAgICB0aGlzLl9hY3RpdmVTbmFwc2hvdC0tO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKiogRGlzY2FyZCB0aGUgbGFzdCBzYXZlIHdpdGhvdXQgcmVzdG9yaW5nLiAqL1xyXG4gICAgcHVibGljIHVuc2F2ZSgpOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5fYWN0aXZlU25hcHNob3QgPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLl9hY3RpdmVTbmFwc2hvdC0tO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgUHJpdmF0ZSBwcmltaXRpdmVzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVhZCBhIHZhcmludCAodmFyaWFibGUtbGVuZ3RoIGludGVnZXIpIGZyb20gdGhlIHN0cmVhbS5cclxuICAgICAqIFJldHVybnMgbnVsbCBvbiBFT0YuIFVzZXMgTnVtYmVyIChzYWZlIHVwIHRvIDJeNTMpLlxyXG4gICAgICovXHJcbiAgICBwcm90ZWN0ZWQgX3JlYWRWYXJpbnQoKTogbnVtYmVyIHwgbnVsbCB7XHJcbiAgICAgICAgY29uc3QgYnl0ZTAgPSB0aGlzLl9pbnB1dC5yZWFkQnl0ZSgpO1xyXG4gICAgICAgIGlmIChieXRlMCA9PT0gTEJfRU9GKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgLy8gRmFzdCBwYXRoOiBzaW5nbGUgYnl0ZSAobW9zdCBjb21tb24gZm9yIGZpZWxkIHRhZ3MgYW5kIHNtYWxsIHZhbHVlcylcclxuICAgICAgICBpZiAoKGJ5dGUwICYgMHg4MCkgPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIGJ5dGUwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gTXVsdGktYnl0ZSB2YXJpbnRcclxuICAgICAgICBsZXQgbG8gPSBieXRlMCAmIDB4N2Y7XHJcbiAgICAgICAgbGV0IHNoaWZ0ID0gNztcclxuICAgICAgICBsZXQgYnl0ZTogbnVtYmVyO1xyXG4gICAgICAgIGxldCBieXRlQ291bnQgPSAxO1xyXG4gICAgICAgIGRvIHtcclxuICAgICAgICAgICAgYnl0ZSA9IHRoaXMuX2lucHV0LnJlYWRCeXRlKCk7XHJcbiAgICAgICAgICAgIGlmIChieXRlID09PSBMQl9FT0YpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICBieXRlQ291bnQrKztcclxuICAgICAgICAgICAgaWYgKHNoaWZ0IDwgMzIpIHtcclxuICAgICAgICAgICAgICAgIGxvIHw9IChieXRlICYgMHg3ZikgPDwgc2hpZnQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2hpZnQgKz0gNztcclxuICAgICAgICB9IHdoaWxlIChieXRlICYgMHg4MCk7XHJcblxyXG4gICAgICAgIC8vIEZvciBuZWdhdGl2ZSBpbnQ2NCwgcHJvdG9idWYgdXNlcyAxMC1ieXRlIHZhcmludHMgd2l0aCBoaWdoIGJpdHMgc2V0LlxyXG4gICAgICAgIC8vIERldGVjdCB0aGlzIGFuZCByZXR1cm4gYXMgc2lnbmVkIDMyLWJpdCAoc3VmZmljaWVudCBmb3IgT05OWCBhdHRyaWJ1dGUgdmFsdWVzKS5cclxuICAgICAgICBpZiAoYnl0ZUNvdW50ID49IDEwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBsbyB8IDA7IC8vIGludGVycHJldCBhcyBzaWduZWQgMzItYml0XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbG8gPj4+IDA7IC8vIGZvcmNlIHVuc2lnbmVkIDMyLWJpdCBmb3IgcG9zaXRpdmUgdmFsdWVzXHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIF9yZWFkRml4ZWQzMkFzSW50KCk6IG51bWJlciB8IG51bGwge1xyXG4gICAgICAgIGlmICh0aGlzLl9pbnB1dC5yZWFkKF9zY3JhdGNoNCwgMCwgNCkgIT09IDQpIHJldHVybiBudWxsO1xyXG4gICAgICAgIHJldHVybiBfdmlldzQuZ2V0SW50MzIoMCwgdHJ1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIF9yZWFkRml4ZWQ2NEFzTnVtYmVyKCk6IG51bWJlciB8IG51bGwge1xyXG4gICAgICAgIGlmICh0aGlzLl9pbnB1dC5yZWFkKF9zY3JhdGNoOCwgMCwgOCkgIT09IDgpIHJldHVybiBudWxsO1xyXG4gICAgICAgIC8vIFJlYWQgYXMgdHdvIDMyLWJpdCB2YWx1ZXMgdG8gYXZvaWQgQmlnSW50IGRlcGVuZGVuY3lcclxuICAgICAgICBjb25zdCBsbyA9IF92aWV3OC5nZXRVaW50MzIoMCwgdHJ1ZSk7XHJcbiAgICAgICAgY29uc3QgaGkgPSBfdmlldzguZ2V0VWludDMyKDQsIHRydWUpO1xyXG4gICAgICAgIHJldHVybiBoaSAqIDB4MTAwMDAwMDAwICsgbG87XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIF9pbnZhbGlkYXRlTGVuZ3RoUmVhZCgpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLl9zdGF0dXMubGVuZ3RoUmVhZCA9IGZhbHNlO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyDilIDilIDilIAgUEJTdWJSZWFkZXIg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4vKipcclxuICogQSBQQlJlYWRlciBzY29wZWQgdG8gYSBzdWItbWVzc2FnZSB2aWEgYSBTdHJlYW1WaWV3LlxyXG4gKlxyXG4gKiBFcXVpdmFsZW50IHRvIEJsdWVTdGVlbExhZHlCdWc6OlBCU3ViUmVhZGVyLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFBCU3ViUmVhZGVyIGV4dGVuZHMgUEJSZWFkZXIge1xyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKHBhcmVudDogUEJSZWFkZXIsIGRlcHRoOiBudW1iZXIsIGZyb206IG51bWJlciwgbGVuZ3RoOiBudW1iZXIpIHtcclxuICAgICAgICBzdXBlcihuZXcgU3RyZWFtVmlldyhwYXJlbnQuaW5wdXQsIGZyb20sIGxlbmd0aCkpO1xyXG4gICAgICAgIHRoaXMuX3N0YXR1cy5kZXB0aCA9IGRlcHRoO1xyXG4gICAgfVxyXG59XHJcbiIsIi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gUHJvdG9idWYgc3RyZWFtIGFic3RyYWN0aW9uXG4vL1xuLy8gUG9ydGVkIGZyb20gQ3lhbk15Y2VsaXVtL0JsdWVTdGVlbExhZHlCdWcgQysrIGltcGxlbWVudGF0aW9uLlxuLy8gUHJvdmlkZXMgSUlucHV0U3RyZWFtLCBNZW1vcnlTdHJlYW0gYW5kIFN0cmVhbVZpZXcgZm9yIGJpbmFyeSBwYXJzaW5nLlxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5cbmV4cG9ydCBjb25zdCBMQl9FT0YgPSAtMTtcblxuZXhwb3J0IGVudW0gU2Vla09yaWdpbiB7XG4gICAgQkVHSU4gPSAwLFxuICAgIENVUlJFTlQgPSAxLFxuICAgIEVORCA9IDIsXG59XG5cbi8qKlxuICogQWJzdHJhY3QgaW5wdXQgc3RyZWFtIGludGVyZmFjZSBmb3Igc2VxdWVudGlhbCBiaW5hcnkgcmVhZHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSUlucHV0U3RyZWFtIHtcbiAgICAvKiogUmVhZCBgY291bnRgIGJ5dGVzIGludG8gdGFyZ2V0LiBSZXR1cm5zIGJ5dGVzIHJlYWQsIG9yIExCX0VPRi4gKi9cbiAgICByZWFkKHRhcmdldDogVWludDhBcnJheSwgb2Zmc2V0OiBudW1iZXIsIGNvdW50OiBudW1iZXIpOiBudW1iZXI7XG5cbiAgICAvKiogUmVhZCBhIHNpbmdsZSBieXRlLiBSZXR1cm5zIHRoZSBieXRlIHZhbHVlLCBvciBMQl9FT0YuICovXG4gICAgcmVhZEJ5dGUoKTogbnVtYmVyO1xuXG4gICAgY2FuU2VlaygpOiBib29sZWFuO1xuICAgIHNlZWsodmFsdWU6IG51bWJlciwgb3JpZ2luPzogU2Vla09yaWdpbik6IGJvb2xlYW47XG4gICAgZ2V0U2l6ZSgpOiBudW1iZXI7XG4gICAgZ2V0UG9zaXRpb24oKTogbnVtYmVyO1xuICAgIGdldFJlbWFpbmluZ0J5dGVzKCk6IG51bWJlcjtcbn1cblxuLy8g4pSA4pSA4pSAIE1lbW9yeVN0cmVhbSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuLyoqXG4gKiBSZWFkcyBmcm9tIGFuIGluLW1lbW9yeSBieXRlIGJ1ZmZlci5cbiAqXG4gKiBFcXVpdmFsZW50IHRvIEJsdWVTdGVlbExhZHlCdWc6Ok1lbW9yeVN0cmVhbS5cbiAqL1xuZXhwb3J0IGNsYXNzIE1lbW9yeVN0cmVhbSBpbXBsZW1lbnRzIElJbnB1dFN0cmVhbSB7XG4gICAgcHJpdmF0ZSBfYnVmZmVyOiBVaW50OEFycmF5O1xuICAgIHByaXZhdGUgX3NpemU6IG51bWJlcjtcbiAgICBwcml2YXRlIF9wb3M6IG51bWJlcjtcblxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihidWZmZXI6IFVpbnQ4QXJyYXkpIHtcbiAgICAgICAgdGhpcy5fYnVmZmVyID0gYnVmZmVyO1xuICAgICAgICB0aGlzLl9zaXplID0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgIHRoaXMuX3BvcyA9IDA7XG4gICAgfVxuXG4gICAgcHVibGljIHJlYWRCeXRlKCk6IG51bWJlciB7XG4gICAgICAgIGlmICh0aGlzLl9wb3MgPCB0aGlzLl9zaXplKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fYnVmZmVyW3RoaXMuX3BvcysrXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTEJfRU9GO1xuICAgIH1cblxuICAgIHB1YmxpYyByZWFkKHRhcmdldDogVWludDhBcnJheSwgb2Zmc2V0OiBudW1iZXIsIGNvdW50OiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICBpZiAodGhpcy5fcG9zID49IHRoaXMuX3NpemUpIHtcbiAgICAgICAgICAgIHJldHVybiBMQl9FT0Y7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvdW50ID09PSAxKSB7XG4gICAgICAgICAgICB0YXJnZXRbb2Zmc2V0XSA9IHRoaXMuX2J1ZmZlclt0aGlzLl9wb3MrK107XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBsZW4gPSBNYXRoLm1pbihjb3VudCwgdGhpcy5fc2l6ZSAtIHRoaXMuX3Bvcyk7XG4gICAgICAgIHRhcmdldC5zZXQodGhpcy5fYnVmZmVyLnN1YmFycmF5KHRoaXMuX3BvcywgdGhpcy5fcG9zICsgbGVuKSwgb2Zmc2V0KTtcbiAgICAgICAgdGhpcy5fcG9zICs9IGxlbjtcbiAgICAgICAgcmV0dXJuIGxlbjtcbiAgICB9XG5cbiAgICBwdWJsaWMgY2FuU2VlaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcHVibGljIHNlZWsodmFsdWU6IG51bWJlciwgb3JpZ2luOiBTZWVrT3JpZ2luID0gU2Vla09yaWdpbi5CRUdJTik6IGJvb2xlYW4ge1xuICAgICAgICBsZXQgdG1wOiBudW1iZXI7XG4gICAgICAgIGlmIChvcmlnaW4gPT09IFNlZWtPcmlnaW4uQkVHSU4pIHtcbiAgICAgICAgICAgIHRtcCA9IHZhbHVlO1xuICAgICAgICB9IGVsc2UgaWYgKG9yaWdpbiA9PT0gU2Vla09yaWdpbi5FTkQpIHtcbiAgICAgICAgICAgIHRtcCA9IHRoaXMuX3NpemUgLSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRtcCA9IHRoaXMuX3BvcyArIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3BvcyA9IE1hdGgubWluKE1hdGgubWF4KHRtcCwgMCksIHRoaXMuX3NpemUpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0U2l6ZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2l6ZTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0UG9zaXRpb24oKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BvcztcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0UmVtYWluaW5nQnl0ZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NpemUgLSB0aGlzLl9wb3M7XG4gICAgfVxufVxuXG4vLyDilIDilIDilIAgU3RyZWFtVmlldyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuLyoqXG4gKiBBIGJvdW5kZWQgdmlldyBvdmVyIGFuIHVuZGVybHlpbmcgc3RyZWFtLCB1c2VkIGZvciByZWFkaW5nIHN1Yi1tZXNzYWdlcy5cbiAqXG4gKiBFcXVpdmFsZW50IHRvIEJsdWVTdGVlbExhZHlCdWc6OlN0cmVhbVZpZXcuXG4gKi9cbmV4cG9ydCBjbGFzcyBTdHJlYW1WaWV3IGltcGxlbWVudHMgSUlucHV0U3RyZWFtIHtcbiAgICBwcml2YXRlIF9kZWxlZ2F0ZTogSUlucHV0U3RyZWFtO1xuICAgIHByaXZhdGUgX29mZnNldDogbnVtYmVyO1xuICAgIHByaXZhdGUgX3NpemU6IG51bWJlcjtcbiAgICBwcml2YXRlIF9wb3M6IG51bWJlcjtcblxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihkZWxlZ2F0ZTogSUlucHV0U3RyZWFtLCBvZmZzZXQ6IG51bWJlciwgc2l6ZTogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2RlbGVnYXRlID0gZGVsZWdhdGU7XG4gICAgICAgIHRoaXMuX29mZnNldCA9IG9mZnNldDtcbiAgICAgICAgdGhpcy5fc2l6ZSA9IHNpemU7XG4gICAgICAgIHRoaXMuX3BvcyA9IDA7XG4gICAgfVxuXG4gICAgcHVibGljIHJlYWRCeXRlKCk6IG51bWJlciB7XG4gICAgICAgIGlmICh0aGlzLl9wb3MgPj0gdGhpcy5fc2l6ZSkge1xuICAgICAgICAgICAgcmV0dXJuIExCX0VPRjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBiID0gdGhpcy5fZGVsZWdhdGUucmVhZEJ5dGUoKTtcbiAgICAgICAgaWYgKGIgPT09IExCX0VPRikgcmV0dXJuIExCX0VPRjtcbiAgICAgICAgdGhpcy5fcG9zKys7XG4gICAgICAgIHJldHVybiBiO1xuICAgIH1cblxuICAgIHB1YmxpYyByZWFkKHRhcmdldDogVWludDhBcnJheSwgb2Zmc2V0OiBudW1iZXIsIGNvdW50OiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICBpZiAodGhpcy5fcG9zID49IHRoaXMuX3NpemUpIHtcbiAgICAgICAgICAgIHJldHVybiBMQl9FT0Y7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbGVuID0gTWF0aC5taW4oY291bnQsIHRoaXMuX3NpemUgLSB0aGlzLl9wb3MpO1xuICAgICAgICBjb25zdCByID0gdGhpcy5fZGVsZWdhdGUucmVhZCh0YXJnZXQsIG9mZnNldCwgbGVuKTtcbiAgICAgICAgaWYgKHIgPiAwKSB7XG4gICAgICAgICAgICB0aGlzLl9wb3MgKz0gcjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcjtcbiAgICB9XG5cbiAgICBwdWJsaWMgY2FuU2VlaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlbGVnYXRlLmNhblNlZWsoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2Vlayh2YWx1ZTogbnVtYmVyLCBvcmlnaW46IFNlZWtPcmlnaW4gPSBTZWVrT3JpZ2luLkJFR0lOKTogYm9vbGVhbiB7XG4gICAgICAgIGxldCB0bXA6IG51bWJlcjtcbiAgICAgICAgaWYgKG9yaWdpbiA9PT0gU2Vla09yaWdpbi5CRUdJTikge1xuICAgICAgICAgICAgdG1wID0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSBpZiAob3JpZ2luID09PSBTZWVrT3JpZ2luLkVORCkge1xuICAgICAgICAgICAgdG1wID0gdGhpcy5fc2l6ZSAtIHZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdG1wID0gdGhpcy5fcG9zICsgdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgdG1wID0gTWF0aC5taW4oTWF0aC5tYXgodG1wLCAwKSwgdGhpcy5fc2l6ZSk7XG4gICAgICAgIGlmICghdGhpcy5fZGVsZWdhdGUuc2Vlayh0bXAgKyB0aGlzLl9vZmZzZXQsIFNlZWtPcmlnaW4uQkVHSU4pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcG9zID0gdG1wO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0U2l6ZSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2l6ZTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0UG9zaXRpb24oKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BvcztcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0UmVtYWluaW5nQnl0ZXMoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NpemUgLSB0aGlzLl9wb3M7XG4gICAgfVxufVxuIiwiLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBQcm90b2J1ZiB3aXJlIGZvcm1hdCB3cml0ZXJcbi8vXG4vLyBTeW1tZXRyaWMgY291bnRlcnBhcnQgdG8gcmVhZGVyLnRzLlxuLy8gV3JpdGVzIHByb3RvYnVmLWVuY29kZWQgYmluYXJ5IGRhdGEgd2l0aG91dCByZXF1aXJpbmcgZ2VuZXJhdGVkIGNvZGUgb3Jcbi8vIGV4dGVybmFsIGRlcGVuZGVuY2llcy5cbi8vXG4vLyBTdXBwb3J0czpcbi8vICAgLSBWYXJpbnQsIGZpeGVkMzIsIGZpeGVkNjQgd2lyZSB0eXBlc1xuLy8gICAtIExlbmd0aC1kZWxpbWl0ZWQgZmllbGRzIChzdHJpbmdzLCBieXRlcywgc3ViLW1lc3NhZ2VzKVxuLy8gICAtIFBhY2tlZCByZXBlYXRlZCBmaWVsZHNcbi8vICAgLSBTdWItbWVzc2FnZSB3cml0ZXJzIHdpdGggYXV0b21hdGljIGxlbmd0aCBwcmVmaXhpbmdcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5pbXBvcnQgeyBXaXJlVHlwZSB9IGZyb20gXCIuL3JlYWRlclwiO1xuXG4vLyDilIDilIDilIAgRGVmYXVsdCBidWZmZXIgc2l6ZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuY29uc3QgREVGQVVMVF9DQVBBQ0lUWSA9IDI1NjtcbmNvbnN0IEdST1dUSF9GQUNUT1IgPSAyO1xuXG4vLyDilIDilIDilIAgU2NyYXRjaCBidWZmZXJzIChyZXVzZWQgYWNyb3NzIHdyaXRlcyB0byBhdm9pZCBhbGxvY2F0aW9ucykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbmNvbnN0IF9zY3JhdGNoNCA9IG5ldyBVaW50OEFycmF5KDQpO1xuY29uc3QgX3NjcmF0Y2g4ID0gbmV3IFVpbnQ4QXJyYXkoOCk7XG5jb25zdCBfdmlldzQgPSBuZXcgRGF0YVZpZXcoX3NjcmF0Y2g0LmJ1ZmZlcik7XG5jb25zdCBfdmlldzggPSBuZXcgRGF0YVZpZXcoX3NjcmF0Y2g4LmJ1ZmZlcik7XG5cbi8vIOKUgOKUgOKUgCBQQldyaXRlciDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuLyoqXG4gKiBQdXNoLXN0eWxlIHByb3RvYnVmIHdyaXRlci4gV3JpdGVzIHRhZ3MsIHRoZW4gdmFsdWVzIHNlcXVlbnRpYWxseS5cbiAqXG4gKiBVc2FnZTpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHdyaXRlciA9IG5ldyBQQldyaXRlcigpO1xuICogd3JpdGVyLndyaXRlVGFnKDEsIFdpcmVUeXBlLlZBUklOVCk7XG4gKiB3cml0ZXIud3JpdGVJbnQzMig0Mik7XG4gKiB3cml0ZXIud3JpdGVUYWcoMiwgV2lyZVR5cGUuTEVOKTtcbiAqIHdyaXRlci53cml0ZVN0cmluZyhcImhlbGxvXCIpO1xuICogY29uc3QgYnl0ZXMgPSB3cml0ZXIuZmluaXNoKCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIFBCV3JpdGVyIHtcbiAgICBwcm90ZWN0ZWQgX2J1ZmZlcjogVWludDhBcnJheTtcbiAgICBwcm90ZWN0ZWQgX3BvczogbnVtYmVyO1xuXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKGNhcGFjaXR5OiBudW1iZXIgPSBERUZBVUxUX0NBUEFDSVRZKSB7XG4gICAgICAgIHRoaXMuX2J1ZmZlciA9IG5ldyBVaW50OEFycmF5KGNhcGFjaXR5KTtcbiAgICAgICAgdGhpcy5fcG9zID0gMDtcbiAgICB9XG5cbiAgICAvLyDilIDilIAgVGFnIHdyaXRpbmcg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBhIHByb3RvYnVmIHRhZyAoZmllbGQgbnVtYmVyICsgd2lyZSB0eXBlKS5cbiAgICAgKi9cbiAgICBwdWJsaWMgd3JpdGVUYWcoZmllbGROdW1iZXI6IG51bWJlciwgd2lyZVR5cGU6IFdpcmVUeXBlKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3dyaXRlVmFyaW50KCgoZmllbGROdW1iZXIgPDwgMykgfCB3aXJlVHlwZSkgPj4+IDApO1xuICAgIH1cblxuICAgIC8vIOKUgOKUgCBBY2Nlc3NvcnMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICAvKiogQ3VycmVudCBudW1iZXIgb2YgYnl0ZXMgd3JpdHRlbi4gKi9cbiAgICBwdWJsaWMgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fcG9zO1xuICAgIH1cblxuICAgIC8vIOKUgOKUgCBWYWx1ZSB3cml0ZXJzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gICAgLyoqIFdyaXRlIGEgdmFyaW50LWVuY29kZWQgaW50MzIuICovXG4gICAgcHVibGljIHdyaXRlSW50MzIodmFsdWU6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl93cml0ZVZhcmludCh2YWx1ZSB8IDApO1xuICAgIH1cblxuICAgIC8qKiBXcml0ZSBhIHZhcmludC1lbmNvZGVkIHVpbnQzMi4gKi9cbiAgICBwdWJsaWMgd3JpdGVVaW50MzIodmFsdWU6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl93cml0ZVZhcmludCh2YWx1ZSA+Pj4gMCk7XG4gICAgfVxuXG4gICAgLyoqIFdyaXRlIGEgdmFyaW50LWVuY29kZWQgaW50NjQgKGZyb20gYSBKUyBudW1iZXIsIHNhZmUgdXAgdG8gMl41MykuICovXG4gICAgcHVibGljIHdyaXRlSW50NjQodmFsdWU6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl93cml0ZVZhcmludDY0KHZhbHVlKTtcbiAgICB9XG5cbiAgICAvKiogV3JpdGUgYSBmaXhlZDMyIChsaXR0bGUtZW5kaWFuIDQgYnl0ZXMpLiAqL1xuICAgIHB1YmxpYyB3cml0ZUZpeGVkMzIodmFsdWU6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9lbnN1cmVDYXBhY2l0eSg0KTtcbiAgICAgICAgX3ZpZXc0LnNldEludDMyKDAsIHZhbHVlLCB0cnVlKTtcbiAgICAgICAgdGhpcy5fYnVmZmVyLnNldChfc2NyYXRjaDQsIHRoaXMuX3Bvcyk7XG4gICAgICAgIHRoaXMuX3BvcyArPSA0O1xuICAgIH1cblxuICAgIC8qKiBXcml0ZSBhIGZpeGVkNjQgKGxpdHRsZS1lbmRpYW4gOCBieXRlcywgZnJvbSBhIEpTIG51bWJlcikuICovXG4gICAgcHVibGljIHdyaXRlRml4ZWQ2NCh2YWx1ZTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2Vuc3VyZUNhcGFjaXR5KDgpO1xuICAgICAgICBjb25zdCBsbyA9IHZhbHVlID4+PiAwO1xuICAgICAgICBjb25zdCBoaSA9ICh2YWx1ZSAvIDB4MTAwMDAwMDAwKSA+Pj4gMDtcbiAgICAgICAgX3ZpZXc4LnNldFVpbnQzMigwLCBsbywgdHJ1ZSk7XG4gICAgICAgIF92aWV3OC5zZXRVaW50MzIoNCwgaGksIHRydWUpO1xuICAgICAgICB0aGlzLl9idWZmZXIuc2V0KF9zY3JhdGNoOCwgdGhpcy5fcG9zKTtcbiAgICAgICAgdGhpcy5fcG9zICs9IDg7XG4gICAgfVxuXG4gICAgLyoqIFdyaXRlIGEgZmxvYXQzMiAoZml4ZWQzMiB3aXJlIHR5cGUpLiAqL1xuICAgIHB1YmxpYyB3cml0ZUZsb2F0KHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlQ2FwYWNpdHkoNCk7XG4gICAgICAgIF92aWV3NC5zZXRGbG9hdDMyKDAsIHZhbHVlLCB0cnVlKTtcbiAgICAgICAgdGhpcy5fYnVmZmVyLnNldChfc2NyYXRjaDQsIHRoaXMuX3Bvcyk7XG4gICAgICAgIHRoaXMuX3BvcyArPSA0O1xuICAgIH1cblxuICAgIC8qKiBXcml0ZSBhIGZsb2F0NjQgKGZpeGVkNjQgd2lyZSB0eXBlKS4gKi9cbiAgICBwdWJsaWMgd3JpdGVEb3VibGUodmFsdWU6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9lbnN1cmVDYXBhY2l0eSg4KTtcbiAgICAgICAgX3ZpZXc4LnNldEZsb2F0NjQoMCwgdmFsdWUsIHRydWUpO1xuICAgICAgICB0aGlzLl9idWZmZXIuc2V0KF9zY3JhdGNoOCwgdGhpcy5fcG9zKTtcbiAgICAgICAgdGhpcy5fcG9zICs9IDg7XG4gICAgfVxuXG4gICAgLyoqIFdyaXRlIGEgYm9vbGVhbiAodmFyaW50IHdpcmUgdHlwZSkuICovXG4gICAgcHVibGljIHdyaXRlQm9vbCh2YWx1ZTogYm9vbGVhbik6IHZvaWQge1xuICAgICAgICB0aGlzLl93cml0ZVZhcmludCh2YWx1ZSA/IDEgOiAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBhIGxlbmd0aC1kZWxpbWl0ZWQgc3RyaW5nLlxuICAgICAqIFdyaXRlcyB0aGUgbGVuZ3RoIHByZWZpeCBmb2xsb3dlZCBieSBVVEYtOCBlbmNvZGVkIGJ5dGVzLlxuICAgICAqL1xuICAgIHB1YmxpYyB3cml0ZVN0cmluZyh2YWx1ZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGVuY29kZWQgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUodmFsdWUpO1xuICAgICAgICB0aGlzLl93cml0ZVZhcmludChlbmNvZGVkLmJ5dGVMZW5ndGgpO1xuICAgICAgICB0aGlzLl93cml0ZVJhd0J5dGVzKGVuY29kZWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFdyaXRlIGxlbmd0aC1kZWxpbWl0ZWQgcmF3IGJ5dGVzLlxuICAgICAqIFdyaXRlcyB0aGUgbGVuZ3RoIHByZWZpeCBmb2xsb3dlZCBieSB0aGUgYnl0ZSBjb250ZW50LlxuICAgICAqL1xuICAgIHB1YmxpYyB3cml0ZUJ5dGVzKHZhbHVlOiBVaW50OEFycmF5KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3dyaXRlVmFyaW50KHZhbHVlLmJ5dGVMZW5ndGgpO1xuICAgICAgICB0aGlzLl93cml0ZVJhd0J5dGVzKHZhbHVlKTtcbiAgICB9XG5cbiAgICAvLyDilIDilIAgUGFja2VkIHJlcGVhdGVkIGZpZWxkcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIC8qKlxuICAgICAqIFdyaXRlIHBhY2tlZCB2YXJpbnQgaW50MzIgdmFsdWVzLlxuICAgICAqIFdyaXRlcyBhIGxlbmd0aCBwcmVmaXggZm9sbG93ZWQgYnkgdmFyaW50LWVuY29kZWQgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB2YWx1ZXMgIFNvdXJjZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gY291bnQgICBOdW1iZXIgb2YgZWxlbWVudHMgdG8gd3JpdGUgZnJvbSB0aGUgYXJyYXkuXG4gICAgICovXG4gICAgcHVibGljIHdyaXRlUGFja2VkSW50MzIodmFsdWVzOiBJbnQzMkFycmF5LCBjb3VudDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIC8vIE1lYXN1cmUgZmlyc3QgdG8gY29tcHV0ZSBsZW5ndGggcHJlZml4XG4gICAgICAgIGNvbnN0IHRtcCA9IG5ldyBQQldyaXRlcigpO1xuICAgICAgICBjb25zdCBuID0gTWF0aC5taW4oY291bnQsIHZhbHVlcy5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgdG1wLl93cml0ZVZhcmludCh2YWx1ZXNbaV0gfCAwKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwYWNrZWQgPSB0bXAuZmluaXNoKCk7XG4gICAgICAgIHRoaXMuX3dyaXRlVmFyaW50KHBhY2tlZC5ieXRlTGVuZ3RoKTtcbiAgICAgICAgdGhpcy5fd3JpdGVSYXdCeXRlcyhwYWNrZWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFdyaXRlIHBhY2tlZCBmbG9hdDMyIHZhbHVlcy5cbiAgICAgKiBAcGFyYW0gdmFsdWVzICBTb3VyY2UgYXJyYXkuXG4gICAgICogQHBhcmFtIGNvdW50ICAgTnVtYmVyIG9mIGVsZW1lbnRzIHRvIHdyaXRlIGZyb20gdGhlIGFycmF5LlxuICAgICAqL1xuICAgIHB1YmxpYyB3cml0ZVBhY2tlZEZsb2F0MzIodmFsdWVzOiBGbG9hdDMyQXJyYXksIGNvdW50OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbiA9IE1hdGgubWluKGNvdW50LCB2YWx1ZXMubGVuZ3RoKTtcbiAgICAgICAgdGhpcy5fd3JpdGVWYXJpbnQobiAqIDQpO1xuICAgICAgICB0aGlzLl9lbnN1cmVDYXBhY2l0eShuICogNCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBfdmlldzQuc2V0RmxvYXQzMigwLCB2YWx1ZXNbaV0sIHRydWUpO1xuICAgICAgICAgICAgdGhpcy5fYnVmZmVyLnNldChfc2NyYXRjaDQsIHRoaXMuX3Bvcyk7XG4gICAgICAgICAgICB0aGlzLl9wb3MgKz0gNDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFdyaXRlIHBhY2tlZCBmbG9hdDY0IHZhbHVlcy5cbiAgICAgKiBAcGFyYW0gdmFsdWVzICBTb3VyY2UgYXJyYXkuXG4gICAgICogQHBhcmFtIGNvdW50ICAgTnVtYmVyIG9mIGVsZW1lbnRzIHRvIHdyaXRlIGZyb20gdGhlIGFycmF5LlxuICAgICAqL1xuICAgIHB1YmxpYyB3cml0ZVBhY2tlZEZsb2F0NjQodmFsdWVzOiBGbG9hdDY0QXJyYXksIGNvdW50OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbiA9IE1hdGgubWluKGNvdW50LCB2YWx1ZXMubGVuZ3RoKTtcbiAgICAgICAgdGhpcy5fd3JpdGVWYXJpbnQobiAqIDgpO1xuICAgICAgICB0aGlzLl9lbnN1cmVDYXBhY2l0eShuICogOCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBfdmlldzguc2V0RmxvYXQ2NCgwLCB2YWx1ZXNbaV0sIHRydWUpO1xuICAgICAgICAgICAgdGhpcy5fYnVmZmVyLnNldChfc2NyYXRjaDgsIHRoaXMuX3Bvcyk7XG4gICAgICAgICAgICB0aGlzLl9wb3MgKz0gODtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIOKUgOKUgCBTdWItbWVzc2FnZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIC8qKlxuICAgICAqIFdyaXRlIGEgc3ViLW1lc3NhZ2UgdXNpbmcgYSBjYWxsYmFjay5cbiAgICAgKiBUaGUgY2FsbGJhY2sgcmVjZWl2ZXMgYSBmcmVzaCB3cml0ZXI7IGl0cyBvdXRwdXQgaXMgYXV0b21hdGljYWxseVxuICAgICAqIGxlbmd0aC1wcmVmaXhlZCBhbmQgYXBwZW5kZWQgdG8gdGhpcyB3cml0ZXIuXG4gICAgICpcbiAgICAgKiBVc2FnZTpcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogd3JpdGVyLndyaXRlVGFnKDMsIFdpcmVUeXBlLkxFTik7XG4gICAgICogd3JpdGVyLndyaXRlU3ViTWVzc2FnZSgoc3ViKSA9PiB7XG4gICAgICogICAgIHN1Yi53cml0ZVRhZygxLCBXaXJlVHlwZS5WQVJJTlQpO1xuICAgICAqICAgICBzdWIud3JpdGVJbnQzMig0Mik7XG4gICAgICogfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgcHVibGljIHdyaXRlU3ViTWVzc2FnZShmbjogKHN1YjogUEJXcml0ZXIpID0+IHZvaWQpOiB2b2lkIHtcbiAgICAgICAgY29uc3Qgc3ViID0gbmV3IFBCV3JpdGVyKCk7XG4gICAgICAgIGZuKHN1Yik7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBzdWIuZmluaXNoKCk7XG4gICAgICAgIHRoaXMuX3dyaXRlVmFyaW50KGRhdGEuYnl0ZUxlbmd0aCk7XG4gICAgICAgIHRoaXMuX3dyaXRlUmF3Qnl0ZXMoZGF0YSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogV3JpdGUgcHJlLXNlcmlhbGl6ZWQgc3ViLW1lc3NhZ2UgYnl0ZXMgd2l0aCBhIGxlbmd0aCBwcmVmaXguXG4gICAgICovXG4gICAgcHVibGljIHdyaXRlUmF3U3ViTWVzc2FnZShkYXRhOiBVaW50OEFycmF5KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3dyaXRlVmFyaW50KGRhdGEuYnl0ZUxlbmd0aCk7XG4gICAgICAgIHRoaXMuX3dyaXRlUmF3Qnl0ZXMoZGF0YSk7XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIEZpbmFsaXplIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSB3cml0dGVuIGJ5dGVzIGFzIGEgY29tcGFjdCBVaW50OEFycmF5LlxuICAgICAqIEFmdGVyIGNhbGxpbmcgZmluaXNoKCksIHRoZSB3cml0ZXIgc2hvdWxkIG5vdCBiZSByZXVzZWQuXG4gICAgICovXG4gICAgcHVibGljIGZpbmlzaCgpOiBVaW50OEFycmF5IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2J1ZmZlci5zdWJhcnJheSgwLCB0aGlzLl9wb3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc2V0IHRoZSB3cml0ZXIgdG8gcmV1c2UgaXRzIGJ1ZmZlci5cbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXQoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3BvcyA9IDA7XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIFByaXZhdGUgcHJpbWl0aXZlcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIC8qKlxuICAgICAqIFdyaXRlIGEgdmFyaW50ICh1bnNpZ25lZCAzMi1iaXQpLlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBfd3JpdGVWYXJpbnQodmFsdWU6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB2YWx1ZSA9IHZhbHVlID4+PiAwOyAvLyBmb3JjZSB1bnNpZ25lZCAzMi1iaXRcbiAgICAgICAgd2hpbGUgKHZhbHVlID4gMHg3Zikge1xuICAgICAgICAgICAgdGhpcy5fd3JpdGVCeXRlKCh2YWx1ZSAmIDB4N2YpIHwgMHg4MCk7XG4gICAgICAgICAgICB2YWx1ZSA+Pj49IDc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fd3JpdGVCeXRlKHZhbHVlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBhIDY0LWJpdCB2YXJpbnQgZnJvbSBhIEpTIG51bWJlciAoc2FmZSB1cCB0byAyXjUzKS5cbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgX3dyaXRlVmFyaW50NjQodmFsdWU6IG51bWJlcik6IHZvaWQge1xuICAgICAgICAvLyBIYW5kbGUgbmVnYXRpdmUgb3IgdmFsdWVzID4gMl4zMiBieSBzcGxpdHRpbmcgaW50byBsby9oaVxuICAgICAgICBsZXQgbG8gPSB2YWx1ZSA+Pj4gMDtcbiAgICAgICAgbGV0IGhpID0gKHZhbHVlIC8gMHgxMDAwMDAwMDApID4+PiAwO1xuXG4gICAgICAgIC8vIFdyaXRlIGxvIHBhcnQgKHVwIHRvIDQgZnVsbCA3LWJpdCBncm91cHMgPSAyOCBiaXRzKVxuICAgICAgICB3aGlsZSAoaGkgPiAwIHx8IGxvID4gMHg3Zikge1xuICAgICAgICAgICAgdGhpcy5fd3JpdGVCeXRlKChsbyAmIDB4N2YpIHwgMHg4MCk7XG4gICAgICAgICAgICBsbyA9ICgobG8gPj4+IDcpIHwgKGhpIDw8IDI1KSkgPj4+IDA7XG4gICAgICAgICAgICBoaSA+Pj49IDc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fd3JpdGVCeXRlKGxvICYgMHg3Zik7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZUJ5dGUoYjogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2Vuc3VyZUNhcGFjaXR5KDEpO1xuICAgICAgICB0aGlzLl9idWZmZXJbdGhpcy5fcG9zKytdID0gYjtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlUmF3Qnl0ZXMoZGF0YTogVWludDhBcnJheSk6IHZvaWQge1xuICAgICAgICB0aGlzLl9lbnN1cmVDYXBhY2l0eShkYXRhLmJ5dGVMZW5ndGgpO1xuICAgICAgICB0aGlzLl9idWZmZXIuc2V0KGRhdGEsIHRoaXMuX3Bvcyk7XG4gICAgICAgIHRoaXMuX3BvcyArPSBkYXRhLmJ5dGVMZW5ndGg7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF9lbnN1cmVDYXBhY2l0eShuZWVkZWQ6IG51bWJlcik6IHZvaWQge1xuICAgICAgICBjb25zdCByZXF1aXJlZCA9IHRoaXMuX3BvcyArIG5lZWRlZDtcbiAgICAgICAgaWYgKHJlcXVpcmVkIDw9IHRoaXMuX2J1ZmZlci5ieXRlTGVuZ3RoKSByZXR1cm47XG5cbiAgICAgICAgbGV0IG5ld1NpemUgPSB0aGlzLl9idWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgd2hpbGUgKG5ld1NpemUgPCByZXF1aXJlZCkge1xuICAgICAgICAgICAgbmV3U2l6ZSAqPSBHUk9XVEhfRkFDVE9SO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5ld0J1ZiA9IG5ldyBVaW50OEFycmF5KG5ld1NpemUpO1xuICAgICAgICBuZXdCdWYuc2V0KHRoaXMuX2J1ZmZlcik7XG4gICAgICAgIHRoaXMuX2J1ZmZlciA9IG5ld0J1ZjtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBDb21wdXRlTm9kZUJhc2UgfSBmcm9tIFwiLi4vY29tcHV0ZS9jb21wdXRlLm5vZGUuYmFzZVwiO1xyXG5pbXBvcnQgdHlwZSB7IElUZW5zb3IgfSBmcm9tIFwiLi4vY29tcHV0ZS9jb21wdXRlLmludGVyZmFjZXNcIjtcclxuaW1wb3J0IHsgT25ueERhdGFUeXBlIH0gZnJvbSBcIi4vb25ueC10eXBlc1wiO1xyXG5pbXBvcnQgdHlwZSB7IE9ubnhOb2RlSW5mbywgT25ueFRlbnNvckluZm8gfSBmcm9tIFwiLi9vbm54LXR5cGVzXCI7XHJcblxyXG4vKipcclxuICogRmFjdG9yeSBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgYSBDb21wdXRlTm9kZUJhc2UgZnJvbSBhbiBPTk5YIG5vZGUgZGVmaW5pdGlvbi5cclxuICovXHJcbmV4cG9ydCB0eXBlIE9ubnhPcEZhY3RvcnkgPSAobm9kZUluZm86IE9ubnhOb2RlSW5mbywgaW5pdGlhbGl6ZXJzOiBNYXA8c3RyaW5nLCBPbm54VGVuc29ySW5mbz4pID0+IENvbXB1dGVOb2RlQmFzZTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgT25ueE9wRW50cnkge1xyXG4gICAgZmFjdG9yeTogT25ueE9wRmFjdG9yeTtcclxuICAgIHByaW9yaXR5OiBudW1iZXI7XHJcbiAgICBiYWNrZW5kOiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWZhdWx0IHByaW9yaXR5IGxldmVscy5cclxuICovXHJcbmV4cG9ydCBjb25zdCBQUklPUklUWV9HRU5FUklDID0gMDtcclxuZXhwb3J0IGNvbnN0IFBSSU9SSVRZX05BVElWRSA9IDEwMDtcclxuXHJcbi8qKlxyXG4gKiBSZWdpc3RyeSBtYXBwaW5nIE9OTlggb3BUeXBlIHN0cmluZ3MgdG8gdGhlaXIgY29tcHV0ZSBpbXBsZW1lbnRhdGlvbnMuXHJcbiAqIFN1cHBvcnRzIHByaW9yaXR5LWJhc2VkIHJlZ2lzdHJhdGlvbjogaGlnaGVyIHByaW9yaXR5IHdpbnMuXHJcbiAqIE11bHRpcGxlIGJhY2tlbmRzIGNhbiByZWdpc3RlciBmb3IgdGhlIHNhbWUgb3Ag4oCUIGhpZ2hlc3QgcHJpb3JpdHkgaXMgdXNlZC5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBPbm54T3BSZWdpc3RyeSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVudHJpZXMgPSBuZXcgTWFwPHN0cmluZywgT25ueE9wRW50cnlbXT4oKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlZ2lzdGVyIGFuIG9wIGltcGxlbWVudGF0aW9uLlxyXG4gICAgICogQHBhcmFtIG9wVHlwZSAgIE9OTlggb3BlcmF0b3IgdHlwZSAoZS5nLiBcIkNvbnZcIiwgXCJMU1RNXCIpXHJcbiAgICAgKiBAcGFyYW0gZmFjdG9yeSAgRmFjdG9yeSBmdW5jdGlvblxyXG4gICAgICogQHBhcmFtIHByaW9yaXR5IEhpZ2hlciBwcmlvcml0eSB3aW5zIChkZWZhdWx0OiBQUklPUklUWV9HRU5FUklDID0gMClcclxuICAgICAqIEBwYXJhbSBiYWNrZW5kICBMYWJlbCBmb3IgdGhlIGltcGxlbWVudGF0aW9uIHNvdXJjZSAoZS5nLiBcImdlbmVyaWNcIiwgXCJzcGlreXBhbmRhXCIpXHJcbiAgICAgKi9cclxuICAgIHJlZ2lzdGVyKG9wVHlwZTogc3RyaW5nLCBmYWN0b3J5OiBPbm54T3BGYWN0b3J5LCBwcmlvcml0eSA9IFBSSU9SSVRZX0dFTkVSSUMsIGJhY2tlbmQgPSBcImdlbmVyaWNcIik6IHZvaWQge1xyXG4gICAgICAgIGxldCBsaXN0ID0gdGhpcy5lbnRyaWVzLmdldChvcFR5cGUpO1xyXG4gICAgICAgIGlmICghbGlzdCkge1xyXG4gICAgICAgICAgICBsaXN0ID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuZW50cmllcy5zZXQob3BUeXBlLCBsaXN0KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGlzdC5wdXNoKHsgZmFjdG9yeSwgcHJpb3JpdHksIGJhY2tlbmQgfSk7XHJcbiAgICAgICAgbGlzdC5zb3J0KChhLCBiKSA9PiBiLnByaW9yaXR5IC0gYS5wcmlvcml0eSk7XHJcbiAgICB9XHJcblxyXG4gICAgaGFzKG9wVHlwZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZW50cmllcy5oYXMob3BUeXBlKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZSBhIG5vZGUgdXNpbmcgdGhlIGhpZ2hlc3QtcHJpb3JpdHkgZmFjdG9yeS5cclxuICAgICAqL1xyXG4gICAgY3JlYXRlKG5vZGVJbmZvOiBPbm54Tm9kZUluZm8sIGluaXRpYWxpemVyczogTWFwPHN0cmluZywgT25ueFRlbnNvckluZm8+KTogQ29tcHV0ZU5vZGVCYXNlIHtcclxuICAgICAgICBjb25zdCBsaXN0ID0gdGhpcy5lbnRyaWVzLmdldChub2RlSW5mby5vcFR5cGUpO1xyXG4gICAgICAgIGlmICghbGlzdCB8fCBsaXN0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIE9OTlggb3AgaW1wbGVtZW50YXRpb24gZm9yOiAke25vZGVJbmZvLm9wVHlwZX1gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGxpc3RbMF0uZmFjdG9yeShub2RlSW5mbywgaW5pdGlhbGl6ZXJzKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldCBpbmZvIGFib3V0IHRoZSBhY3RpdmUgKGhpZ2hlc3QtcHJpb3JpdHkpIGltcGxlbWVudGF0aW9uIGZvciBhbiBvcC5cclxuICAgICAqL1xyXG4gICAgZ2V0QWN0aXZlQmFja2VuZChvcFR5cGU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgICAgICAgY29uc3QgbGlzdCA9IHRoaXMuZW50cmllcy5nZXQob3BUeXBlKTtcclxuICAgICAgICByZXR1cm4gbGlzdCAmJiBsaXN0Lmxlbmd0aCA+IDAgPyBsaXN0WzBdLmJhY2tlbmQgOiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgYWxsIHJlZ2lzdGVyZWQgYmFja2VuZHMgZm9yIGFuIG9wLCBzb3J0ZWQgYnkgcHJpb3JpdHkgKGhpZ2hlc3QgZmlyc3QpLlxyXG4gICAgICovXHJcbiAgICBnZXRCYWNrZW5kcyhvcFR5cGU6IHN0cmluZyk6IHsgYmFja2VuZDogc3RyaW5nOyBwcmlvcml0eTogbnVtYmVyIH1bXSB7XHJcbiAgICAgICAgY29uc3QgbGlzdCA9IHRoaXMuZW50cmllcy5nZXQob3BUeXBlKTtcclxuICAgICAgICByZXR1cm4gbGlzdCA/IGxpc3QubWFwKChlKSA9PiAoeyBiYWNrZW5kOiBlLmJhY2tlbmQsIHByaW9yaXR5OiBlLnByaW9yaXR5IH0pKSA6IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFJlZ2lzdGVyZWQoKTogc3RyaW5nW10ge1xyXG4gICAgICAgIHJldHVybiBbLi4udGhpcy5lbnRyaWVzLmtleXMoKV0uc29ydCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU3VtbWFyeTogZm9yIGVhY2ggb3AsIHdoaWNoIGJhY2tlbmQgaXMgYWN0aXZlLlxyXG4gICAgICovXHJcbiAgICBzdW1tYXJ5KCk6IHsgb3BUeXBlOiBzdHJpbmc7IGJhY2tlbmQ6IHN0cmluZzsgcHJpb3JpdHk6IG51bWJlcjsgYWx0ZXJuYXRpdmVzOiBudW1iZXIgfVtdIHtcclxuICAgICAgICBjb25zdCByZXN1bHQ6IHsgb3BUeXBlOiBzdHJpbmc7IGJhY2tlbmQ6IHN0cmluZzsgcHJpb3JpdHk6IG51bWJlcjsgYWx0ZXJuYXRpdmVzOiBudW1iZXIgfVtdID0gW107XHJcbiAgICAgICAgZm9yIChjb25zdCBbb3BUeXBlLCBsaXN0XSBvZiB0aGlzLmVudHJpZXMpIHtcclxuICAgICAgICAgICAgcmVzdWx0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgb3BUeXBlLFxyXG4gICAgICAgICAgICAgICAgYmFja2VuZDogbGlzdFswXS5iYWNrZW5kLFxyXG4gICAgICAgICAgICAgICAgcHJpb3JpdHk6IGxpc3RbMF0ucHJpb3JpdHksXHJcbiAgICAgICAgICAgICAgICBhbHRlcm5hdGl2ZXM6IGxpc3QubGVuZ3RoIC0gMSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXN1bHQuc29ydCgoYSwgYikgPT4gYS5vcFR5cGUubG9jYWxlQ29tcGFyZShiLm9wVHlwZSkpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogQmFzZSBjbGFzcyBmb3IgT05OWCBvcCBub2Rlcy4gUHJvdmlkZXMgYXR0cmlidXRlIGFjY2VzcyBoZWxwZXJzLlxyXG4gKi9cclxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIE9ubnhPcE5vZGUgZXh0ZW5kcyBDb21wdXRlTm9kZUJhc2Uge1xyXG4gICAgcmVhZG9ubHkgb3BUeXBlOiBzdHJpbmc7XHJcbiAgICBwcm90ZWN0ZWQgcmVhZG9ubHkgYXR0cmlidXRlczogTWFwPHN0cmluZywgbnVtYmVyPjtcclxuICAgIHByb3RlY3RlZCByZWFkb25seSB0ZW5zb3JBdHRyaWJ1dGVzOiBNYXA8c3RyaW5nLCBPbm54VGVuc29ySW5mbz47XHJcblxyXG4gICAgY29uc3RydWN0b3Iobm9kZUluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5vcFR5cGUgPSBub2RlSW5mby5vcFR5cGU7XHJcbiAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0gbm9kZUluZm8uYXR0cmlidXRlcztcclxuICAgICAgICB0aGlzLnRlbnNvckF0dHJpYnV0ZXMgPSBub2RlSW5mby50ZW5zb3JBdHRyaWJ1dGVzID8/IG5ldyBNYXAoKTtcclxuICAgIH1cclxuXHJcbiAgICBnZXQgbm9kZVR5cGUoKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gYG9ubnhfJHt0aGlzLm9wVHlwZS50b0xvd2VyQ2FzZSgpfWA7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIGF0dHIobmFtZTogc3RyaW5nLCBkZWZhdWx0VmFsOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmF0dHJpYnV0ZXMuZ2V0KG5hbWUpID8/IGRlZmF1bHRWYWw7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIGF0dHJJbnQobmFtZTogc3RyaW5nLCBkZWZhdWx0VmFsOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHRoaXMuYXR0cmlidXRlcy5nZXQobmFtZSkgPz8gZGVmYXVsdFZhbCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIGF0dHJUZW5zb3IobmFtZTogc3RyaW5nKTogT25ueFRlbnNvckluZm8gfCB1bmRlZmluZWQge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnRlbnNvckF0dHJpYnV0ZXMuZ2V0KG5hbWUpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogSGVscGVyOiBnZXQgaW5pdGlhbGl6ZXIgYXMgRmxvYXQzMkFycmF5LCBoYW5kbGluZyByYXdEYXRhIGNvbnZlcnNpb24uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW5pdGlhbGl6ZXJEYXRhKGluaXQ6IE9ubnhUZW5zb3JJbmZvKTogRmxvYXQzMkFycmF5IHtcclxuICAgIGlmIChpbml0LmZsb2F0RGF0YSAmJiBpbml0LmZsb2F0RGF0YS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgcmV0dXJuIGluaXQuZmxvYXREYXRhO1xyXG4gICAgfVxyXG4gICAgaWYgKGluaXQucmF3RGF0YSAmJiBpbml0LnJhd0RhdGEubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIC8vIEhhbmRsZSBpbnQ2NCByYXcgZGF0YTogY29udmVydCA4LWJ5dGUgaW50cyB0byBmbG9hdDMyXHJcbiAgICAgICAgaWYgKGluaXQuZGF0YVR5cGUgPT09IE9ubnhEYXRhVHlwZS5JTlQ2NCkge1xyXG4gICAgICAgICAgICBjb25zdCB2aWV3ID0gbmV3IERhdGFWaWV3KGluaXQucmF3RGF0YS5idWZmZXIsIGluaXQucmF3RGF0YS5ieXRlT2Zmc2V0LCBpbml0LnJhd0RhdGEuYnl0ZUxlbmd0aCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gaW5pdC5yYXdEYXRhLmJ5dGVMZW5ndGggLyA4O1xyXG4gICAgICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGNvdW50KTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBSZWFkIGFzIGludDY0IChsb3cgMzIgYml0cyBzdWZmaWNpZW50IGZvciB0eXBpY2FsIHZhbHVlcylcclxuICAgICAgICAgICAgICAgIG91dFtpXSA9IE51bWJlcih2aWV3LmdldEJpZ0ludDY0KGkgKiA4LCB0cnVlKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG91dDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ldyBGbG9hdDMyQXJyYXkoaW5pdC5yYXdEYXRhLmJ1ZmZlciwgaW5pdC5yYXdEYXRhLmJ5dGVPZmZzZXQsIGluaXQucmF3RGF0YS5ieXRlTGVuZ3RoIC8gNCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV3IEZsb2F0MzJBcnJheSgwKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEhlbHBlcjogY29tcHV0ZSB0b3RhbCBlbGVtZW50IGNvdW50IGZyb20gc2hhcGUuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gc2hhcGVTaXplKHNoYXBlOiBudW1iZXJbXSk6IG51bWJlciB7XHJcbiAgICBsZXQgcyA9IDE7XHJcbiAgICBmb3IgKGNvbnN0IGQgb2Ygc2hhcGUpIHMgKj0gZDtcclxuICAgIHJldHVybiBzO1xyXG59XHJcblxyXG4vKipcclxuICogSGVscGVyOiBjcmVhdGUgYW4gSVRlbnNvci5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtYWtlVGVuc29yKGRhdGE6IEZsb2F0MzJBcnJheSwgc2hhcGU6IG51bWJlcltdLCBuYW1lPzogc3RyaW5nKTogSVRlbnNvciB7XHJcbiAgICByZXR1cm4geyBkYXRhLCBzaGFwZSwgbmFtZSB9O1xyXG59XHJcbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBAc3Bpa3ktcGFuZGEvcnVudGltZVxuLy9cbi8vIE9OTlgtbGlrZSBjb21wdXRlIGdyYXBoIHJ1bnRpbWUgZm9yIFNwaWt5UGFuZGEgbmV1cmFsIG5ldHdvcmtzLlxuLy9cbi8vIFByb3ZpZGVzIGEgdHlwZWQgREFHIGV4ZWN1dGlvbiBlbmdpbmUgd2hlcmU6XG4vLyAgIC0gTm9kZXMgYXJlIHByb2Nlc3Npbmcgc3RhZ2VzIChJQ29tcHV0ZU5vZGUpXG4vLyAgIC0gRWRnZXMgY2FycnkgdHlwZWQgZGF0YSB0ZW5zb3JzIChJRGF0YUxpbmspXG4vLyAgIC0gVGhlIGdyYXBoIGV4ZWN1dGVzIGluIHRvcG9sb2dpY2FsIG9yZGVyIChLYWhuJ3MgYWxnb3JpdGhtKVxuLy9cbi8vIE1vZHVsZXM6XG4vLyAgIGNvbXB1dGUvICA6IElUZW5zb3IsIElDb21wdXRlTm9kZSwgQ29tcHV0ZUdyYXBoLCBidWlsdC1pbiBub2Rlc1xuLy8gICBvbm54LyAgICAgOiBQcm90b2J1ZiByZWFkZXIsIE9OTlggcGFyc2VyICh6ZXJvLWRlcGVuZGVuY3kpXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuZXhwb3J0ICogZnJvbSBcIi4vY29tcHV0ZS9pbmRleFwiO1xuZXhwb3J0ICogZnJvbSBcIi4vb25ueC9pbmRleFwiO1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9