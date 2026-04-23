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
/* harmony export */   ObjectiveNode: () => (/* reexport safe */ _mpc__WEBPACK_IMPORTED_MODULE_3__.ObjectiveNode),
/* harmony export */   RnnNode: () => (/* reexport safe */ _nodes_index__WEBPACK_IMPORTED_MODULE_2__.RnnNode),
/* harmony export */   RolloutNode: () => (/* reexport safe */ _mpc__WEBPACK_IMPORTED_MODULE_3__.RolloutNode),
/* harmony export */   ShootingSelectorNode: () => (/* reexport safe */ _mpc__WEBPACK_IMPORTED_MODULE_3__.ShootingSelectorNode),
/* harmony export */   makeDiscreteOneHotSampler: () => (/* reexport safe */ _mpc__WEBPACK_IMPORTED_MODULE_3__.makeDiscreteOneHotSampler),
/* harmony export */   makePiecewiseConstantSampler: () => (/* reexport safe */ _mpc__WEBPACK_IMPORTED_MODULE_3__.makePiecewiseConstantSampler)
/* harmony export */ });
/* harmony import */ var _compute_node_base__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./compute.node.base */ "./src/compute/compute.node.base.ts");
/* harmony import */ var _compute_graph__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./compute.graph */ "./src/compute/compute.graph.ts");
/* harmony import */ var _nodes_index__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./nodes/index */ "./src/compute/nodes/index.ts");
/* harmony import */ var _mpc__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./mpc */ "./src/compute/mpc.ts");







/***/ }),

/***/ "./src/compute/mpc.ts":
/*!****************************!*\
  !*** ./src/compute/mpc.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ObjectiveNode: () => (/* binding */ ObjectiveNode),
/* harmony export */   RolloutNode: () => (/* binding */ RolloutNode),
/* harmony export */   ShootingSelectorNode: () => (/* binding */ ShootingSelectorNode),
/* harmony export */   makeDiscreteOneHotSampler: () => (/* binding */ makeDiscreteOneHotSampler),
/* harmony export */   makePiecewiseConstantSampler: () => (/* binding */ makePiecewiseConstantSampler)
/* harmony export */ });
/* harmony import */ var _compute_node_base__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./compute.node.base */ "./src/compute/compute.node.base.ts");

// ─── RolloutNode ─────────────────────────────────────────────────────────────
/**
 * Unroll a dynamics sub-graph over a fixed horizon.
 *
 * Inputs:
 *   inputs[0] = initial state, shape [stateDim]
 *   inputs[1] = action sequence, shape [horizon * actionDim] (flattened)
 *
 * Outputs:
 *   trajectory, shape [(horizon+1) * stateDim] (flattened)
 *
 * The dynamics graph is expected to accept a single input tensor of shape
 * [stateDim + actionDim] (concatenated state and action) and return a single
 * output tensor of shape [stateDim] (the state delta OR the next state,
 * controlled by the `deltaMode` flag).
 */
class RolloutNode extends _compute_node_base__WEBPACK_IMPORTED_MODULE_0__.ComputeNodeBase {
    constructor(opts) {
        super();
        this.nodeType = "mpc_rollout";
        this._dynamics = opts.dynamics;
        this._dynamicsInputName = opts.dynamicsInputName;
        this._horizon = opts.horizon;
        this._stateDim = opts.stateDim;
        this._actionDim = opts.actionDim;
        this._deltaMode = opts.deltaMode ?? false;
        this.outputShapes = [[(opts.horizon + 1) * opts.stateDim]];
    }
    execute(inputs) {
        const initialState = inputs[0].data;
        const actions = inputs[1].data;
        const S = this._stateDim;
        const A = this._actionDim;
        const H = this._horizon;
        const trajectory = new Float32Array((H + 1) * S);
        // Seed trajectory with initial state
        for (let i = 0; i < S; i++) {
            trajectory[i] = initialState[i];
        }
        const stateActionBuf = new Float32Array(S + A);
        const externalInputs = new Map();
        for (let t = 0; t < H; t++) {
            // Build dynamics input: state concatenated with action
            const stateOff = t * S;
            const actionOff = t * A;
            for (let i = 0; i < S; i++)
                stateActionBuf[i] = trajectory[stateOff + i];
            for (let j = 0; j < A; j++)
                stateActionBuf[S + j] = actions[actionOff + j];
            const input = {
                data: stateActionBuf.slice(),
                shape: [1, S + A],
                name: this._dynamicsInputName,
            };
            externalInputs.clear();
            externalInputs.set(this._dynamicsInputName, input);
            const results = this._dynamics.run(externalInputs);
            const outTensor = results.values().next().value;
            const nextOff = (t + 1) * S;
            if (this._deltaMode) {
                // Model predicts delta -> add to current state
                for (let i = 0; i < S; i++) {
                    trajectory[nextOff + i] = trajectory[stateOff + i] + outTensor.data[i];
                }
            }
            else {
                for (let i = 0; i < S; i++) {
                    trajectory[nextOff + i] = outTensor.data[i];
                }
            }
        }
        return [{
                data: trajectory,
                shape: [H + 1, S],
                name: "trajectory",
            }];
    }
}
class ObjectiveNode extends _compute_node_base__WEBPACK_IMPORTED_MODULE_0__.ComputeNodeBase {
    constructor(opts) {
        super();
        this.nodeType = "mpc_objective";
        this.outputShapes = [[1]];
        this._costFn = opts.costFn;
        this._stateDim = opts.stateDim;
        this._actionDim = opts.actionDim;
        this._horizon = opts.horizon;
    }
    execute(inputs) {
        const trajectory = inputs[0].data;
        const actions = inputs[1].data;
        const cost = this._costFn(trajectory, actions, this._stateDim, this._actionDim, this._horizon);
        return [{ data: new Float32Array([cost]), shape: [1], name: "cost" }];
    }
}
class ShootingSelectorNode extends _compute_node_base__WEBPACK_IMPORTED_MODULE_0__.ComputeNodeBase {
    constructor(opts) {
        super();
        this.nodeType = "mpc_shooting";
        this._rollout = opts.rollout;
        this._objective = opts.objective;
        this._sampler = opts.sampler;
        this._numCandidates = opts.numCandidates;
        this._horizon = opts.horizon;
        this._actionDim = opts.actionDim;
        this._rng = opts.rng ?? Math.random;
        // stateDim is accepted for API consistency but the selector does not use it
        // directly; it is inferred from the initial state tensor at execute time.
        void opts.stateDim;
        this.outputShapes = [[opts.actionDim], [1], [opts.numCandidates]];
    }
    execute(inputs) {
        const initialState = inputs[0];
        let bestCost = Infinity;
        let bestActions = null;
        const allCosts = new Float32Array(this._numCandidates);
        for (let k = 0; k < this._numCandidates; k++) {
            const actions = this._sampler(this._horizon, this._actionDim, this._rng);
            const actionsTensor = {
                data: actions,
                shape: [this._horizon, this._actionDim],
                name: "actions",
            };
            const [trajectory] = this._rollout.execute([initialState, actionsTensor]);
            const [costTensor] = this._objective.execute([trajectory, actionsTensor]);
            const cost = costTensor.data[0];
            allCosts[k] = cost;
            if (cost < bestCost) {
                bestCost = cost;
                bestActions = actions;
            }
        }
        const firstAction = new Float32Array(this._actionDim);
        if (bestActions) {
            for (let j = 0; j < this._actionDim; j++)
                firstAction[j] = bestActions[j];
        }
        return [
            { data: firstAction, shape: [this._actionDim], name: "best_action" },
            { data: new Float32Array([bestCost]), shape: [1], name: "best_cost" },
            { data: allCosts, shape: [this._numCandidates], name: "all_costs" },
        ];
    }
}
// ─── Built-in samplers ───────────────────────────────────────────────────────
/**
 * Uniform random discrete action sequence sampler.
 *
 * Produces one-hot encoded actions over `numActions` categories.
 * Useful for discrete action spaces like scrubber-off/low/medium/high.
 */
function makeDiscreteOneHotSampler(numActions) {
    return (horizon, actionDim, rng) => {
        if (actionDim !== numActions) {
            throw new Error(`actionDim (${actionDim}) must match numActions (${numActions}) for one-hot sampler`);
        }
        const out = new Float32Array(horizon * actionDim);
        for (let t = 0; t < horizon; t++) {
            const choice = Math.floor(rng() * numActions);
            out[t * actionDim + choice] = 1.0;
        }
        return out;
    };
}
/**
 * Piecewise constant sampler: holds a random action for a random duration,
 * then picks a new one. Produces smoother trajectories than per-step random.
 */
function makePiecewiseConstantSampler(numActions, minSegment = 3, maxSegment = 15) {
    return (horizon, actionDim, rng) => {
        if (actionDim !== numActions) {
            throw new Error(`actionDim (${actionDim}) must match numActions (${numActions})`);
        }
        const out = new Float32Array(horizon * actionDim);
        let t = 0;
        while (t < horizon) {
            const segLen = minSegment + Math.floor(rng() * (maxSegment - minSegment + 1));
            const choice = Math.floor(rng() * numActions);
            const end = Math.min(t + segLen, horizon);
            for (let i = t; i < end; i++) {
                out[i * actionDim + choice] = 1.0;
            }
            t = end;
        }
        return out;
    };
}


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
/* harmony export */   deserializeTemplate: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.deserializeTemplate),
/* harmony export */   enroll: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.enroll),
/* harmony export */   getInitializerData: () => (/* reexport safe */ _registry__WEBPACK_IMPORTED_MODULE_4__.getInitializerData),
/* harmony export */   makeTensor: () => (/* reexport safe */ _registry__WEBPACK_IMPORTED_MODULE_4__.makeTensor),
/* harmony export */   onnxDataTypeSize: () => (/* reexport safe */ _onnx_types__WEBPACK_IMPORTED_MODULE_1__.onnxDataTypeSize),
/* harmony export */   registerActivationOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerActivationOps),
/* harmony export */   registerConvOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerConvOps),
/* harmony export */   registerDotVisionOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerDotVisionOps),
/* harmony export */   registerDspOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerDspOps),
/* harmony export */   registerMathOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerMathOps),
/* harmony export */   registerMatrixOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerMatrixOps),
/* harmony export */   registerMiscOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerMiscOps),
/* harmony export */   registerNormOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerNormOps),
/* harmony export */   registerRecurrentOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerRecurrentOps),
/* harmony export */   registerSpikyPandaOps: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.registerSpikyPandaOps),
/* harmony export */   serializeTemplate: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.serializeTemplate),
/* harmony export */   shapeSize: () => (/* reexport safe */ _registry__WEBPACK_IMPORTED_MODULE_4__.shapeSize),
/* harmony export */   templateToTensor: () => (/* reexport safe */ _ops_index__WEBPACK_IMPORTED_MODULE_6__.templateToTensor)
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

/***/ "./src/onnx/ops/dotvision.ts":
/*!***********************************!*\
  !*** ./src/onnx/ops/dotvision.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registerDotVisionOps: () => (/* binding */ registerDotVisionOps)
/* harmony export */ });
/* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../registry */ "./src/onnx/registry.ts");
/**
 * DotVision custom ONNX operators.
 *
 * Registered under the "com.dotvision" domain convention (encoded in
 * the op_type name since the protobuf writer does not yet support the
 * domain field on NodeProto).
 *
 * Operators:
 *
 *   com.dotvision.EnvelopeCenter
 *     Per-window centering of a pre-computed envelope signal.
 *     Subtracts the per-channel window mean, multiplies by a gain
 *     factor, shifts to 0.5, and clamps to [0, 1].
 *
 *     This op is OPTIONAL in the ONNX graph. Two valid deployment
 *     modes coexist:
 *
 *     (A) Firmware streams raw envelope (uncentered) into the ONNX
 *         model. The model contains EnvelopeCenter before the LSTM.
 *         The op handles the centering.
 *
 *     (B) Firmware does the centering itself and feeds the LSTM
 *         directly. The EnvelopeCenter node is absent or skipped.
 *         Both paths produce identical results.
 *
 *     The RMS extraction and decimation always run in firmware (they
 *     are streaming operations tied to the ADC interrupt loop, not
 *     suitable for a single-shot ONNX op).
 *
 *     Attributes:
 *       gain (float): amplification factor (default 6.0)
 *       since_version (int): operator version (1)
 *
 *     Input:  envelope [T, C] (uncentered envelope, e.g., [64, 3])
 *     Output: centered [T, C] (centered, clamped to [0, 1])
 */

const DOMAIN = "com.dotvision";
const PRIORITY = 100;
// ---------------------------------------------------------------------------
// EnvelopeCenter operator
// ---------------------------------------------------------------------------
class EnvelopeCenterNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.gain = this.attr("gain", 6.0);
    }
    execute(inputs) {
        const inp = inputs[0]; // [T, C]
        const T = inp.shape[0];
        const C = inp.shape.length > 1 ? inp.shape[1] : 1;
        const data = inp.data;
        const out = new Float32Array(T * C);
        for (let ch = 0; ch < C; ch++) {
            // Per-channel window mean
            let mean = 0;
            for (let t = 0; t < T; t++) {
                mean += data[t * C + ch];
            }
            mean /= T;
            // Center, amplify, shift to 0.5, clamp to [0, 1]
            for (let t = 0; t < T; t++) {
                let v = (data[t * C + ch] - mean) * this.gain + 0.5;
                if (v < 0)
                    v = 0;
                if (v > 1)
                    v = 1;
                out[t * C + ch] = v;
            }
        }
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(out, [T, C])];
    }
}
// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------
function registerDotVisionOps(registry) {
    registry.register("com.dotvision.EnvelopeCenter", (info) => new EnvelopeCenterNode(info), PRIORITY, DOMAIN);
}


/***/ }),

/***/ "./src/onnx/ops/dsp.ts":
/*!*****************************!*\
  !*** ./src/onnx/ops/dsp.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   deserializeTemplate: () => (/* binding */ deserializeTemplate),
/* harmony export */   enroll: () => (/* binding */ enroll),
/* harmony export */   registerDspOps: () => (/* binding */ registerDspOps),
/* harmony export */   serializeTemplate: () => (/* binding */ serializeTemplate),
/* harmony export */   templateToTensor: () => (/* binding */ templateToTensor)
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
 *   SpDTW             — Dynamic Time Warping distance between two MFCC sequences
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
// DTW — Dynamic Time Warping
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Euclidean distance between two frames extracted from [n_features, n_frames]
 * packed Float32Arrays.
 */
function frameDist(a, frameA, nFramesA, b, frameB, nFramesB, nFeatures) {
    let sum = 0;
    for (let f = 0; f < nFeatures; f++) {
        const d = a[f * nFramesA + frameA] - b[f * nFramesB + frameB];
        sum += d * d;
    }
    return Math.sqrt(sum);
}
/**
 * DTW with optional Sakoe-Chiba band constraint.
 * Returns the accumulated cost at the end of the optimal warping path.
 * When normalize=true the cost is divided by (n+m) to be length-independent.
 */
function dtw(live, nFramesLive, tmpl, nFramesTmpl, nFeatures, band, // Sakoe-Chiba radius, -1 = no constraint
normalize) {
    const n = nFramesLive;
    const m = nFramesTmpl;
    const INF = Infinity;
    // Cost matrix stored row-major: cost[i*m + j]
    const cost = new Float32Array(n * m).fill(INF);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            // Sakoe-Chiba band
            if (band >= 0 && Math.abs(i - j) > band)
                continue;
            const d = frameDist(live, i, n, tmpl, j, m, nFeatures);
            const top = i > 0 ? cost[(i - 1) * m + j] : INF;
            const left = j > 0 ? cost[i * m + (j - 1)] : INF;
            const diag = (i > 0 && j > 0) ? cost[(i - 1) * m + (j - 1)] : INF;
            const prev = (i === 0 && j === 0) ? 0 : Math.min(top, left, diag);
            cost[i * m + j] = d + (prev === INF ? 0 : prev);
        }
    }
    const raw = cost[(n - 1) * m + (m - 1)];
    return normalize ? raw / (n + m) : raw;
}
/**
 * SpDTW: Dynamic Time Warping distance between two MFCC sequences.
 *
 * Typical use: detect a spoken name by comparing incoming audio against a
 * per-asset enrolled template.  A low distance means the sequences match.
 *
 * Inputs:
 *   [0]  live     — MFCC of incoming audio     [n_features, n_frames_live]
 *   [1]  template — MFCC of enrolled reference [n_features, n_frames_template]
 *
 * Output: [1] — DTW distance (lower = closer match)
 *
 * Attributes:
 *   normalize  (0=raw, 1=divide by n+m,  default 1)
 *   band       (Sakoe-Chiba radius, -1=no constraint, default -1)
 */
class SpDTWNode extends _registry__WEBPACK_IMPORTED_MODULE_0__.OnnxOpNode {
    constructor(info) {
        super(info);
        this.outputShapes = [];
        this.normalize = this.attrInt("normalize", 1) !== 0;
        this.band = this.attrInt("band", -1);
    }
    execute(inputs) {
        const live = inputs[0];
        const tmpl = inputs[1];
        // Both inputs must be [n_features, n_frames] — same feature dimension
        const nFeatures = live.shape[0];
        const nFramesLive = live.shape[1] ?? 1;
        const nFramesTmpl = tmpl.shape[1] ?? 1;
        const distance = dtw(live.data, nFramesLive, tmpl.data, nFramesTmpl, nFeatures, this.band, this.normalize);
        return [(0,_registry__WEBPACK_IMPORTED_MODULE_0__.makeTensor)(new Float32Array([distance]), [1])];
    }
}
/**
 * Compute MFCC for a single raw audio buffer using the same internal
 * pipeline as SpMFCC.  Returns [n_mfcc, n_frames].
 */
function mfccFromAudio(audio, p) {
    const nFrames = Math.floor((audio.length - p.nFft) / p.hopLength) + 1;
    if (!mfccFromAudio._fb) { /* lazy init below */ }
    const fb = buildMelFilterbank(p.nMels, p.nFft, p.sampleRate);
    const engine = getFFTEngine(p.nFft);
    const winFn = p.windowType === 1 ? hammingWindow : hannWindow;
    const nBins = p.nFft / 2 + 1;
    const mfcc = new Float32Array(p.nMfcc * nFrames);
    const frame = new Float32Array(p.nFft);
    const melSpec = new Float32Array(p.nMels);
    for (let t = 0; t < nFrames; t++) {
        const start = t * p.hopLength;
        for (let i = 0; i < p.nFft; i++) {
            const idx = start + i;
            frame[i] = idx < audio.length ? audio[idx] * winFn(p.nFft, i) : 0;
        }
        const power = engine.forward(frame);
        for (let m = 0; m < p.nMels; m++) {
            let sum = 0;
            for (let k = 0; k < nBins; k++)
                sum += fb[m][k] * power[k];
            melSpec[m] = Math.log(Math.max(sum, 1e-10));
        }
        for (let c = 0; c < p.nMfcc; c++) {
            let sum = 0;
            for (let m = 0; m < p.nMels; m++) {
                sum += melSpec[m] * Math.cos(Math.PI * c * (2 * m + 1) / (2 * p.nMels));
            }
            mfcc[c * nFrames + t] = sum;
        }
    }
    return { data: mfcc, nFrames };
}
// ts requires property to exist for the lazy-init trick above
mfccFromAudio._fb = null;
/**
 * Linearly resample an MFCC matrix [n_mfcc, srcFrames] to [n_mfcc, dstFrames].
 * Used to normalize frame counts before averaging multiple enrollment samples.
 */
function resampleMfcc(src, nMfcc, srcFrames, dstFrames) {
    const out = new Float32Array(nMfcc * dstFrames);
    for (let t = 0; t < dstFrames; t++) {
        const srcT = t * (srcFrames - 1) / Math.max(dstFrames - 1, 1);
        const lo = Math.floor(srcT);
        const hi = Math.min(lo + 1, srcFrames - 1);
        const frac = srcT - lo;
        for (let c = 0; c < nMfcc; c++) {
            out[c * dstFrames + t] =
                src[c * srcFrames + lo] * (1 - frac) +
                    src[c * srcFrames + hi] * frac;
        }
    }
    return out;
}
/**
 * Enroll a name from one or more raw audio recordings.
 *
 * Each sample is processed through the MFCC pipeline, resampled to the
 * median frame count, then averaged element-wise to produce a single
 * robust template ready to be injected into SpDTW as input[1].
 *
 * @param samples   One or more Float32Array of raw PCM audio (same sample rate)
 * @param params    MFCC parameters — must match those used during inference
 * @returns         DtwTemplate ready for use with injectTemplate()
 *
 * @example
 * const template = enroll([recording1, recording2], { sampleRate: 16000 });
 * // At inference time:
 * externalInputs.set("dtw_template", injectTemplate(template));
 */
function enroll(samples, params = {}) {
    if (samples.length === 0)
        throw new Error("enroll: at least one sample required");
    const p = {
        sampleRate: params.sampleRate ?? 16000,
        nMfcc: params.nMfcc ?? 40,
        nFft: params.nFft ?? 512,
        hopLength: params.hopLength ?? 160,
        nMels: params.nMels ?? 40,
        windowType: params.windowType ?? 0,
    };
    // Compute MFCC for each sample
    const computed = samples.map((s) => mfccFromAudio(s, p));
    // Normalize to median frame count
    const frameCounts = computed.map((c) => c.nFrames).sort((a, b) => a - b);
    const targetFrames = frameCounts[Math.floor(frameCounts.length / 2)];
    // Resample and average
    const avg = new Float32Array(p.nMfcc * targetFrames);
    for (const { data, nFrames } of computed) {
        const resampled = nFrames === targetFrames
            ? data
            : resampleMfcc(data, p.nMfcc, nFrames, targetFrames);
        for (let i = 0; i < avg.length; i++)
            avg[i] += resampled[i];
    }
    for (let i = 0; i < avg.length; i++)
        avg[i] /= samples.length;
    return { data: avg, shape: [p.nMfcc, targetFrames], params: p };
}
/**
 * Serialize a DtwTemplate to a plain JSON-safe object for storage
 * (localStorage, IndexedDB, asset config file, etc.).
 */
function serializeTemplate(t) {
    return { data: Array.from(t.data), shape: t.shape, params: t.params };
}
/**
 * Deserialize a stored template back to a DtwTemplate.
 */
function deserializeTemplate(raw) {
    return { data: new Float32Array(raw.data), shape: raw.shape, params: raw.params };
}
/**
 * Wrap a DtwTemplate as an ITensor ready to inject into graph.run()
 * as the "dtw_template" external input.
 */
function templateToTensor(t) {
    return { data: t.data, shape: [...t.shape] };
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
    registry.register("SpDTW", (info) => new SpDTWNode(info));
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
/* harmony export */   deserializeTemplate: () => (/* reexport safe */ _dsp__WEBPACK_IMPORTED_MODULE_9__.deserializeTemplate),
/* harmony export */   enroll: () => (/* reexport safe */ _dsp__WEBPACK_IMPORTED_MODULE_9__.enroll),
/* harmony export */   registerActivationOps: () => (/* reexport safe */ _activations__WEBPACK_IMPORTED_MODULE_1__.registerActivationOps),
/* harmony export */   registerConvOps: () => (/* reexport safe */ _conv__WEBPACK_IMPORTED_MODULE_3__.registerConvOps),
/* harmony export */   registerDotVisionOps: () => (/* reexport safe */ _dotvision__WEBPACK_IMPORTED_MODULE_8__.registerDotVisionOps),
/* harmony export */   registerDspOps: () => (/* reexport safe */ _dsp__WEBPACK_IMPORTED_MODULE_9__.registerDspOps),
/* harmony export */   registerMathOps: () => (/* reexport safe */ _math__WEBPACK_IMPORTED_MODULE_0__.registerMathOps),
/* harmony export */   registerMatrixOps: () => (/* reexport safe */ _matrix__WEBPACK_IMPORTED_MODULE_2__.registerMatrixOps),
/* harmony export */   registerMiscOps: () => (/* reexport safe */ _misc__WEBPACK_IMPORTED_MODULE_6__.registerMiscOps),
/* harmony export */   registerNormOps: () => (/* reexport safe */ _normalization__WEBPACK_IMPORTED_MODULE_4__.registerNormOps),
/* harmony export */   registerRecurrentOps: () => (/* reexport safe */ _recurrent__WEBPACK_IMPORTED_MODULE_5__.registerRecurrentOps),
/* harmony export */   registerSpikyPandaOps: () => (/* reexport safe */ _spikypanda__WEBPACK_IMPORTED_MODULE_7__.registerSpikyPandaOps),
/* harmony export */   serializeTemplate: () => (/* reexport safe */ _dsp__WEBPACK_IMPORTED_MODULE_9__.serializeTemplate),
/* harmony export */   templateToTensor: () => (/* reexport safe */ _dsp__WEBPACK_IMPORTED_MODULE_9__.templateToTensor)
/* harmony export */ });
/* harmony import */ var _math__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./math */ "./src/onnx/ops/math.ts");
/* harmony import */ var _activations__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./activations */ "./src/onnx/ops/activations.ts");
/* harmony import */ var _matrix__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./matrix */ "./src/onnx/ops/matrix.ts");
/* harmony import */ var _conv__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./conv */ "./src/onnx/ops/conv.ts");
/* harmony import */ var _normalization__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./normalization */ "./src/onnx/ops/normalization.ts");
/* harmony import */ var _recurrent__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./recurrent */ "./src/onnx/ops/recurrent.ts");
/* harmony import */ var _misc__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./misc */ "./src/onnx/ops/misc.ts");
/* harmony import */ var _spikypanda__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./spikypanda */ "./src/onnx/ops/spikypanda.ts");
/* harmony import */ var _dotvision__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./dotvision */ "./src/onnx/ops/dotvision.ts");
/* harmony import */ var _dsp__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./dsp */ "./src/onnx/ops/dsp.ts");
/* harmony import */ var _registry__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../registry */ "./src/onnx/registry.ts");





















/**
 * Create a registry with all generic ONNX ops registered.
 */
function createDefaultRegistry() {
    const registry = new _registry__WEBPACK_IMPORTED_MODULE_10__.OnnxOpRegistry();
    (0,_math__WEBPACK_IMPORTED_MODULE_0__.registerMathOps)(registry);
    (0,_activations__WEBPACK_IMPORTED_MODULE_1__.registerActivationOps)(registry);
    (0,_matrix__WEBPACK_IMPORTED_MODULE_2__.registerMatrixOps)(registry);
    (0,_conv__WEBPACK_IMPORTED_MODULE_3__.registerConvOps)(registry);
    (0,_normalization__WEBPACK_IMPORTED_MODULE_4__.registerNormOps)(registry);
    (0,_recurrent__WEBPACK_IMPORTED_MODULE_5__.registerRecurrentOps)(registry);
    (0,_misc__WEBPACK_IMPORTED_MODULE_6__.registerMiscOps)(registry);
    (0,_dsp__WEBPACK_IMPORTED_MODULE_9__.registerDspOps)(registry);
    return registry;
}
/**
 * Create a registry with all ops + SpikyPanda native overrides at higher priority.
 */
function createSpikyPandaRegistry() {
    const registry = createDefaultRegistry();
    (0,_spikypanda__WEBPACK_IMPORTED_MODULE_7__.registerSpikyPandaOps)(registry);
    (0,_dotvision__WEBPACK_IMPORTED_MODULE_8__.registerDotVisionOps)(registry);
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
/* harmony export */   ObjectiveNode: () => (/* reexport safe */ _compute_index__WEBPACK_IMPORTED_MODULE_0__.ObjectiveNode),
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
/* harmony export */   RolloutNode: () => (/* reexport safe */ _compute_index__WEBPACK_IMPORTED_MODULE_0__.RolloutNode),
/* harmony export */   SHAPE_DIM: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.SHAPE_DIM),
/* harmony export */   SeekOrigin: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.SeekOrigin),
/* harmony export */   ShootingSelectorNode: () => (/* reexport safe */ _compute_index__WEBPACK_IMPORTED_MODULE_0__.ShootingSelectorNode),
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
/* harmony export */   deserializeTemplate: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.deserializeTemplate),
/* harmony export */   enroll: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.enroll),
/* harmony export */   getInitializerData: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.getInitializerData),
/* harmony export */   makeDiscreteOneHotSampler: () => (/* reexport safe */ _compute_index__WEBPACK_IMPORTED_MODULE_0__.makeDiscreteOneHotSampler),
/* harmony export */   makePiecewiseConstantSampler: () => (/* reexport safe */ _compute_index__WEBPACK_IMPORTED_MODULE_0__.makePiecewiseConstantSampler),
/* harmony export */   makeTensor: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.makeTensor),
/* harmony export */   onnxDataTypeSize: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.onnxDataTypeSize),
/* harmony export */   registerActivationOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerActivationOps),
/* harmony export */   registerConvOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerConvOps),
/* harmony export */   registerDotVisionOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerDotVisionOps),
/* harmony export */   registerDspOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerDspOps),
/* harmony export */   registerMathOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerMathOps),
/* harmony export */   registerMatrixOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerMatrixOps),
/* harmony export */   registerMiscOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerMiscOps),
/* harmony export */   registerNormOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerNormOps),
/* harmony export */   registerRecurrentOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerRecurrentOps),
/* harmony export */   registerSpikyPandaOps: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.registerSpikyPandaOps),
/* harmony export */   serializeTemplate: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.serializeTemplate),
/* harmony export */   shapeSize: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.shapeSize),
/* harmony export */   templateToTensor: () => (/* reexport safe */ _onnx_index__WEBPACK_IMPORTED_MODULE_1__.templateToTensor)
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUUsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzlELFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3hELFFBQVEsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3hELFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzlELFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RELFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RELFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3hELFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RELFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FB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QUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDakQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFFbEUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbEUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwRCxDQUFDO0lBQ0wsQ0FBQztJQUVELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN4QyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDM0MsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUNILE1BQU0sU0FBVSxTQUFRLGlEQUFVO0lBSzlCLFlBQVksSUFBa0I7UUFDMUIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBTFAsaUJBQVksR0FBZSxFQUFFLENBQUM7UUFNbkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRCxPQUFPLENBQUMsTUFBaUI7UUFDckIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV2QixzRUFBc0U7UUFDdEUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV2QyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQ2hCLElBQUksQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUN0QixJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFDdEIsU0FBUyxFQUNULElBQUksQ0FBQyxJQUFJLEVBQ1QsSUFBSSxDQUFDLFNBQVMsQ0FDakIsQ0FBQztRQUVGLE9BQU8sQ0FBQyxxREFBVSxDQUFDLElBQUksWUFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDO0NBQ0o7QUFxQkQ7OztHQUdHO0FBQ0gsU0FBUyxhQUFhLENBQUMsS0FBbUIsRUFBRSxDQUF1QjtJQUMvRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0RSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUVqRCxNQUFNLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzdELE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLFVBQVUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO0lBQzlELE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3QixNQUFNLElBQUksR0FBRyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxDQUFDO0lBQ2pELE1BQU0sS0FBSyxHQUFHLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QyxNQUFNLE9BQU8sR0FBRyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFMUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQy9CLE1BQU0sS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQzlCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDOUIsTUFBTSxHQUFHLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQztZQUN0QixLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQ1osS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEVBQUU7Z0JBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0QsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDWixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMvQixHQUFHLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzVFLENBQUM7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QUM7SUFDdEQsUUFBUSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbEUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDaEUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDeEQsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDMUQsUUFBUSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzlFLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RELFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RELFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RELFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFB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QUFDO1FBRS9ELE1BQU0sR0FBRyxHQUFHLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUM7WUFDM0IsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO1lBQ2IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLEVBQUU7Z0JBQUUsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzdELElBQUksSUFBSSxTQUFTLENBQUM7WUFDbEIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUNsQyxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QixDQUFDO1lBQ0QsUUFBUSxJQUFJLFNBQVMsQ0FBQztZQUN0QixNQUFNLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2xELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDakMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUM7Z0JBQzdDLElB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QUFLLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsT0FBTyxDQUFDLE1BQWlCO1FBQ3JCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFDZixDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUMvQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDdEIsRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDMUQsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQ3RCLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzFELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxHQUFH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QUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUUvQyxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFCLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDO1FBRTdELElBQUksQ0FBQyxHQUFHLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLElBQUksQ0FBQyxHQUFHLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQ2QsR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDakIsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFFaEMsMkJBQTJCO1FBQzNCLE1BQU0sS0FBSyxHQUFHLElBQUksWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUV0QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDOUIsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQztZQUUzQixrQ0FBa0M7WUFDbEMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNkLEtBQUssSUFBSSxDQUFDLEdBQUcs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Q0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDakMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDL0QsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDbkUsQ0FBQztnQkFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3pCLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMzQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDL0MsQ0FBQztnQkFDRCxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUNKLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUM5QyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FB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QztXQUNqRjtXQUNBO1dBQ0EsRTs7Ozs7V0NQQSx3Rjs7Ozs7V0NBQTtXQUNBO1dBQ0E7V0FDQSx1REFBdUQsaUJBQWlCO1dBQ3hFO1dBQ0EsZ0RBQWdELGFBQWE7V0FDN0QsRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNOQSw4RUFBOEU7QUFDOUUsdUJBQXVCO0FBQ3ZCLEVBQUU7QUFDRixrRUFBa0U7QUFDbEUsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxpREFBaUQ7QUFDakQsaURBQWlEO0FBQ2pELGlFQUFpRTtBQUNqRSxFQUFFO0FBQ0YsV0FBVztBQUNYLG9FQUFvRTtBQUNwRSwrREFBK0Q7QUFDL0QsOEVBQThFO0FBRTlDO0FBQ0giLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS93ZWJwYWNrL3VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24iLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5tanMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi4vY29yZS9zcmMvZ2VvbWV0cnkvZ2VvbWV0cnkuaW50ZXJmYWNlcy50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uLi9jb3JlL3NyYy9ncmFwaC9ncmFwaC5ncmFwaC50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uLi9jb3JlL3NyYy9ncmFwaC9ncmFwaC5ncmFwaEl0ZW0udHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi4vY29yZS9zcmMvZ3JhcGgvZ3JhcGguaW50ZXJmYWNlcy50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uLi9jb3JlL3NyYy9ncmFwaC9ncmFwaC5ub2RlLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4uL2NvcmUvc3JjL2dyYXBoL2dyYXBoLm9saW5rLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL2NvbXB1dGUvY29tcHV0ZS5ncmFwaC50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9jb21wdXRlL2NvbXB1dGUubm9kZS5iYXNlLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL2NvbXB1dGUvaW5kZXgudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvY29tcHV0ZS9tcGMudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvY29tcHV0ZS9ub2Rlcy9jbm4ubm9kZS50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9jb21wdXRlL25vZGVzL2NvbmNhdC5ub2RlLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL2NvbXB1dGUvbm9kZXMvZXh0ZXJuYWwtaW5wdXQubm9kZS50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9jb21wdXRlL25vZGVzL2luZGV4LnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL2NvbXB1dGUvbm9kZXMvbWxwLm5vZGUudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvY29tcHV0ZS9ub2Rlcy9ybm4ubm9kZS50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L2dyYXBoLWJ1aWxkZXIudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvb25ueC9pbmRleC50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L29ubngtcGFyc2VyLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvb25ueC10eXBlcy50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L29ubngtd3JpdGVyLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvb3BzL2FjdGl2YXRpb25zLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvb3BzL2NvbnYudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvb25ueC9vcHMvZG90dmlzaW9uLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvb3BzL2RzcC50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L29wcy9pbmRleC50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L29wcy9tYXRoLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvb3BzL21hdHJpeC50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L29wcy9taXNjLnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvb3BzL25vcm1hbGl6YXRpb24udHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvb25ueC9vcHMvcmVjdXJyZW50LnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lLy4vc3JjL29ubngvb3BzL3NwaWt5cGFuZGEudHMiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvb25ueC9wYi9pbmRleC50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L3BiL3JlYWRlci50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L3BiL3N0cmVhbS50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L3BiL3dyaXRlci50cyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS8uL3NyYy9vbm54L3JlZ2lzdHJ5LnRzIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9TcGlreXBhbmRhUnVudGltZS93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL1NwaWt5cGFuZGFSdW50aW1lL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vU3Bpa3lwYW5kYVJ1bnRpbWUvLi9zcmMvaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIHdlYnBhY2tVbml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uKHJvb3QsIGZhY3RvcnkpIHtcblx0aWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnKVxuXHRcdG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuXHRlbHNlIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcblx0XHRkZWZpbmUoW10sIGZhY3RvcnkpO1xuXHRlbHNlIGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jylcblx0XHRleHBvcnRzW1wiU3Bpa3lwYW5kYVJ1bnRpbWVcIl0gPSBmYWN0b3J5KCk7XG5cdGVsc2Vcblx0XHRyb290W1wiU3Bpa3lwYW5kYVJ1bnRpbWVcIl0gPSBmYWN0b3J5KCk7XG59KShnbG9iYWxUaGlzLCAoKSA9PiB7XG5yZXR1cm4gIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uXG5cblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxucHVycG9zZSB3aXRoIG9yIHdpdGhvdXQgZmVlIGlzIGhlcmVieSBncmFudGVkLlxuXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXG5SRUdBUkQgVE8gVEhJUyBTT0ZUV0FSRSBJTkNMVURJTkcgQUxMIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFlcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxuTE9TUyBPRiBVU0UsIERBVEEgT1IgUFJPRklUUywgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIE5FR0xJR0VOQ0UgT1Jcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqL1xuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UsIFN1cHByZXNzZWRFcnJvciwgU3ltYm9sLCBJdGVyYXRvciAqL1xuXG52YXIgZXh0ZW5kU3RhdGljcyA9IGZ1bmN0aW9uKGQsIGIpIHtcbiAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxuICAgICAgKHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXkgJiYgZnVuY3Rpb24gKGQsIGIpIHsgZC5fX3Byb3RvX18gPSBiOyB9KSB8fFxuICAgICAgZnVuY3Rpb24gKGQsIGIpIHsgZm9yICh2YXIgcCBpbiBiKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGIsIHApKSBkW3BdID0gYltwXTsgfTtcbiAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcbiAgaWYgKHR5cGVvZiBiICE9PSBcImZ1bmN0aW9uXCIgJiYgYiAhPT0gbnVsbClcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDbGFzcyBleHRlbmRzIHZhbHVlIFwiICsgU3RyaW5nKGIpICsgXCIgaXMgbm90IGEgY29uc3RydWN0b3Igb3IgbnVsbFwiKTtcbiAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcbiAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn1cblxuZXhwb3J0IHZhciBfX2Fzc2lnbiA9IGZ1bmN0aW9uKCkge1xuICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xuICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgcyA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHQ7XG4gIH1cbiAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3Jlc3QocywgZSkge1xuICB2YXIgdCA9IHt9O1xuICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcbiAgICAgIHRbcF0gPSBzW3BdO1xuICBpZiAocyAhPSBudWxsICYmIHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGUuaW5kZXhPZihwW2ldKSA8IDAgJiYgT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKHMsIHBbaV0pKVxuICAgICAgICAgICAgICB0W3BbaV1dID0gc1twW2ldXTtcbiAgICAgIH1cbiAgcmV0dXJuIHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2RlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XG4gIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XG4gIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XG4gIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XG4gIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3BhcmFtKHBhcmFtSW5kZXgsIGRlY29yYXRvcikge1xuICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fZXNEZWNvcmF0ZShjdG9yLCBkZXNjcmlwdG9ySW4sIGRlY29yYXRvcnMsIGNvbnRleHRJbiwgaW5pdGlhbGl6ZXJzLCBleHRyYUluaXRpYWxpemVycykge1xuICBmdW5jdGlvbiBhY2NlcHQoZikgeyBpZiAoZiAhPT0gdm9pZCAwICYmIHR5cGVvZiBmICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJGdW5jdGlvbiBleHBlY3RlZFwiKTsgcmV0dXJuIGY7IH1cbiAgdmFyIGtpbmQgPSBjb250ZXh0SW4ua2luZCwga2V5ID0ga2luZCA9PT0gXCJnZXR0ZXJcIiA/IFwiZ2V0XCIgOiBraW5kID09PSBcInNldHRlclwiID8gXCJzZXRcIiA6IFwidmFsdWVcIjtcbiAgdmFyIHRhcmdldCA9ICFkZXNjcmlwdG9ySW4gJiYgY3RvciA/IGNvbnRleHRJbltcInN0YXRpY1wiXSA/IGN0b3IgOiBjdG9yLnByb3RvdHlwZSA6IG51bGw7XG4gIHZhciBkZXNjcmlwdG9yID0gZGVzY3JpcHRvckluIHx8ICh0YXJnZXQgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgY29udGV4dEluLm5hbWUpIDoge30pO1xuICB2YXIgXywgZG9uZSA9IGZhbHNlO1xuICBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIGNvbnRleHQgPSB7fTtcbiAgICAgIGZvciAodmFyIHAgaW4gY29udGV4dEluKSBjb250ZXh0W3BdID0gcCA9PT0gXCJhY2Nlc3NcIiA/IHt9IDogY29udGV4dEluW3BdO1xuICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4uYWNjZXNzKSBjb250ZXh0LmFjY2Vzc1twXSA9IGNvbnRleHRJbi5hY2Nlc3NbcF07XG4gICAgICBjb250ZXh0LmFkZEluaXRpYWxpemVyID0gZnVuY3Rpb24gKGYpIHsgaWYgKGRvbmUpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgYWRkIGluaXRpYWxpemVycyBhZnRlciBkZWNvcmF0aW9uIGhhcyBjb21wbGV0ZWRcIik7IGV4dHJhSW5pdGlhbGl6ZXJzLnB1c2goYWNjZXB0KGYgfHwgbnVsbCkpOyB9O1xuICAgICAgdmFyIHJlc3VsdCA9ICgwLCBkZWNvcmF0b3JzW2ldKShraW5kID09PSBcImFjY2Vzc29yXCIgPyB7IGdldDogZGVzY3JpcHRvci5nZXQsIHNldDogZGVzY3JpcHRvci5zZXQgfSA6IGRlc2NyaXB0b3Jba2V5XSwgY29udGV4dCk7XG4gICAgICBpZiAoa2luZCA9PT0gXCJhY2Nlc3NvclwiKSB7XG4gICAgICAgICAgaWYgKHJlc3VsdCA9PT0gdm9pZCAwKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAocmVzdWx0ID09PSBudWxsIHx8IHR5cGVvZiByZXN1bHQgIT09IFwib2JqZWN0XCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3QgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmdldCkpIGRlc2NyaXB0b3IuZ2V0ID0gXztcbiAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuc2V0KSkgZGVzY3JpcHRvci5zZXQgPSBfO1xuICAgICAgICAgIGlmIChfID0gYWNjZXB0KHJlc3VsdC5pbml0KSkgaW5pdGlhbGl6ZXJzLnVuc2hpZnQoXyk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChfID0gYWNjZXB0KHJlc3VsdCkpIHtcbiAgICAgICAgICBpZiAoa2luZCA9PT0gXCJmaWVsZFwiKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcbiAgICAgICAgICBlbHNlIGRlc2NyaXB0b3Jba2V5XSA9IF87XG4gICAgICB9XG4gIH1cbiAgaWYgKHRhcmdldCkgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgY29udGV4dEluLm5hbWUsIGRlc2NyaXB0b3IpO1xuICBkb25lID0gdHJ1ZTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3J1bkluaXRpYWxpemVycyh0aGlzQXJnLCBpbml0aWFsaXplcnMsIHZhbHVlKSB7XG4gIHZhciB1c2VWYWx1ZSA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGluaXRpYWxpemVycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWUgPSB1c2VWYWx1ZSA/IGluaXRpYWxpemVyc1tpXS5jYWxsKHRoaXNBcmcsIHZhbHVlKSA6IGluaXRpYWxpemVyc1tpXS5jYWxsKHRoaXNBcmcpO1xuICB9XG4gIHJldHVybiB1c2VWYWx1ZSA/IHZhbHVlIDogdm9pZCAwO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9fcHJvcEtleSh4KSB7XG4gIHJldHVybiB0eXBlb2YgeCA9PT0gXCJzeW1ib2xcIiA/IHggOiBcIlwiLmNvbmNhdCh4KTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3NldEZ1bmN0aW9uTmFtZShmLCBuYW1lLCBwcmVmaXgpIHtcbiAgaWYgKHR5cGVvZiBuYW1lID09PSBcInN5bWJvbFwiKSBuYW1lID0gbmFtZS5kZXNjcmlwdGlvbiA/IFwiW1wiLmNvbmNhdChuYW1lLmRlc2NyaXB0aW9uLCBcIl1cIikgOiBcIlwiO1xuICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KGYsIFwibmFtZVwiLCB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IHByZWZpeCA/IFwiXCIuY29uY2F0KHByZWZpeCwgXCIgXCIsIG5hbWUpIDogbmFtZSB9KTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX21ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKSB7XG4gIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2dlbmVyYXRvcih0aGlzQXJnLCBib2R5KSB7XG4gIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGcgPSBPYmplY3QuY3JlYXRlKCh0eXBlb2YgSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEl0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpO1xuICByZXR1cm4gZy5uZXh0ID0gdmVyYigwKSwgZ1tcInRocm93XCJdID0gdmVyYigxKSwgZ1tcInJldHVyblwiXSA9IHZlcmIoMiksIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiAoZ1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSwgZztcbiAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XG4gIGZ1bmN0aW9uIHN0ZXAob3ApIHtcbiAgICAgIGlmIChmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtcbiAgICAgIHdoaWxlIChnICYmIChnID0gMCwgb3BbMF0gJiYgKF8gPSAwKSksIF8pIHRyeSB7XG4gICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xuICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcbiAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XG4gICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xuICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XG4gICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxuICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XG4gICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XG4gICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgfVxufVxuXG5leHBvcnQgdmFyIF9fY3JlYXRlQmluZGluZyA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG0sIGspO1xuICBpZiAoIWRlc2MgfHwgKFwiZ2V0XCIgaW4gZGVzYyA/ICFtLl9fZXNNb2R1bGUgOiBkZXNjLndyaXRhYmxlIHx8IGRlc2MuY29uZmlndXJhYmxlKSkge1xuICAgICAgZGVzYyA9IHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfTtcbiAgfVxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgb1trMl0gPSBtW2tdO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2V4cG9ydFN0YXIobSwgbykge1xuICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSBfX2NyZWF0ZUJpbmRpbmcobywgbSwgcCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XG4gIHZhciBzID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIFN5bWJvbC5pdGVyYXRvciwgbSA9IHMgJiYgb1tzXSwgaSA9IDA7XG4gIGlmIChtKSByZXR1cm4gbS5jYWxsKG8pO1xuICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XG4gICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKG8gJiYgaSA+PSBvLmxlbmd0aCkgbyA9IHZvaWQgMDtcbiAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XG4gICAgICB9XG4gIH07XG4gIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XG4gIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcbiAgaWYgKCFtKSByZXR1cm4gbztcbiAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XG4gIHRyeSB7XG4gICAgICB3aGlsZSAoKG4gPT09IHZvaWQgMCB8fCBuLS0gPiAwKSAmJiAhKHIgPSBpLm5leHQoKSkuZG9uZSkgYXIucHVzaChyLnZhbHVlKTtcbiAgfVxuICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cbiAgZmluYWxseSB7XG4gICAgICB0cnkge1xuICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xuICAgICAgfVxuICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XG4gIH1cbiAgcmV0dXJuIGFyO1xufVxuXG4vKiogQGRlcHJlY2F0ZWQgKi9cbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcbiAgZm9yICh2YXIgYXIgPSBbXSwgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXG4gICAgICBhciA9IGFyLmNvbmNhdChfX3JlYWQoYXJndW1lbnRzW2ldKSk7XG4gIHJldHVybiBhcjtcbn1cblxuLyoqIEBkZXByZWNhdGVkICovXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheXMoKSB7XG4gIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xuICBmb3IgKHZhciByID0gQXJyYXkocyksIGsgPSAwLCBpID0gMDsgaSA8IGlsOyBpKyspXG4gICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcbiAgICAgICAgICByW2tdID0gYVtqXTtcbiAgcmV0dXJuIHI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5KHRvLCBmcm9tLCBwYWNrKSB7XG4gIGlmIChwYWNrIHx8IGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIGZvciAodmFyIGkgPSAwLCBsID0gZnJvbS5sZW5ndGgsIGFyOyBpIDwgbDsgaSsrKSB7XG4gICAgICBpZiAoYXIgfHwgIShpIGluIGZyb20pKSB7XG4gICAgICAgICAgaWYgKCFhcikgYXIgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmcm9tLCAwLCBpKTtcbiAgICAgICAgICBhcltpXSA9IGZyb21baV07XG4gICAgICB9XG4gIH1cbiAgcmV0dXJuIHRvLmNvbmNhdChhciB8fCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmcm9tKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0KHYpIHtcbiAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xuICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xuICB2YXIgZyA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSwgaSwgcSA9IFtdO1xuICByZXR1cm4gaSA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBBc3luY0l0ZXJhdG9yID09PSBcImZ1bmN0aW9uXCIgPyBBc3luY0l0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpLCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIsIGF3YWl0UmV0dXJuKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xuICBmdW5jdGlvbiBhd2FpdFJldHVybihmKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHYpLnRoZW4oZiwgcmVqZWN0KTsgfTsgfVxuICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaWYgKGdbbl0pIHsgaVtuXSA9IGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAoYSwgYikgeyBxLnB1c2goW24sIHYsIGEsIGJdKSA+IDEgfHwgcmVzdW1lKG4sIHYpOyB9KTsgfTsgaWYgKGYpIGlbbl0gPSBmKGlbbl0pOyB9IH1cbiAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxuICBmdW5jdGlvbiBzdGVwKHIpIHsgci52YWx1ZSBpbnN0YW5jZW9mIF9fYXdhaXQgPyBQcm9taXNlLnJlc29sdmUoci52YWx1ZS52KS50aGVuKGZ1bGZpbGwsIHJlamVjdCkgOiBzZXR0bGUocVswXVsyXSwgcik7IH1cbiAgZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkgeyByZXN1bWUoXCJuZXh0XCIsIHZhbHVlKTsgfVxuICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XG4gIGZ1bmN0aW9uIHNldHRsZShmLCB2KSB7IGlmIChmKHYpLCBxLnNoaWZ0KCksIHEubGVuZ3RoKSByZXN1bWUocVswXVswXSwgcVswXVsxXSk7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNEZWxlZ2F0b3Iobykge1xuICB2YXIgaSwgcDtcbiAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcbiAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlbbl0gPSBvW25dID8gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIChwID0gIXApID8geyB2YWx1ZTogX19hd2FpdChvW25dKHYpKSwgZG9uZTogZmFsc2UgfSA6IGYgPyBmKHYpIDogdjsgfSA6IGY7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNWYWx1ZXMobykge1xuICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xuICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xuICByZXR1cm4gbSA/IG0uY2FsbChvKSA6IChvID0gdHlwZW9mIF9fdmFsdWVzID09PSBcImZ1bmN0aW9uXCIgPyBfX3ZhbHVlcyhvKSA6IG9bU3ltYm9sLml0ZXJhdG9yXSgpLCBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaSk7XG4gIGZ1bmN0aW9uIHZlcmIobikgeyBpW25dID0gb1tuXSAmJiBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyB2ID0gb1tuXSh2KSwgc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgdi5kb25lLCB2LnZhbHVlKTsgfSk7IH07IH1cbiAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcbiAgaWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29va2VkLCBcInJhd1wiLCB7IHZhbHVlOiByYXcgfSk7IH0gZWxzZSB7IGNvb2tlZC5yYXcgPSByYXc7IH1cbiAgcmV0dXJuIGNvb2tlZDtcbn07XG5cbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xufSkgOiBmdW5jdGlvbihvLCB2KSB7XG4gIG9bXCJkZWZhdWx0XCJdID0gdjtcbn07XG5cbnZhciBvd25LZXlzID0gZnVuY3Rpb24obykge1xuICBvd25LZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgfHwgZnVuY3Rpb24gKG8pIHtcbiAgICB2YXIgYXIgPSBbXTtcbiAgICBmb3IgKHZhciBrIGluIG8pIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgaykpIGFyW2FyLmxlbmd0aF0gPSBrO1xuICAgIHJldHVybiBhcjtcbiAgfTtcbiAgcmV0dXJuIG93bktleXMobyk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnRTdGFyKG1vZCkge1xuICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xuICB2YXIgcmVzdWx0ID0ge307XG4gIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayA9IG93bktleXMobW9kKSwgaSA9IDA7IGkgPCBrLmxlbmd0aDsgaSsrKSBpZiAoa1tpXSAhPT0gXCJkZWZhdWx0XCIpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwga1tpXSk7XG4gIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XG4gIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgZGVmYXVsdDogbW9kIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0KHJlY2VpdmVyLCBzdGF0ZSwga2luZCwgZikge1xuICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBnZXR0ZXJcIik7XG4gIGlmICh0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyICE9PSBzdGF0ZSB8fCAhZiA6ICFzdGF0ZS5oYXMocmVjZWl2ZXIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHJlYWQgcHJpdmF0ZSBtZW1iZXIgZnJvbSBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xuICByZXR1cm4ga2luZCA9PT0gXCJtXCIgPyBmIDoga2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIpIDogZiA/IGYudmFsdWUgOiBzdGF0ZS5nZXQocmVjZWl2ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZFNldChyZWNlaXZlciwgc3RhdGUsIHZhbHVlLCBraW5kLCBmKSB7XG4gIGlmIChraW5kID09PSBcIm1cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgbWV0aG9kIGlzIG5vdCB3cml0YWJsZVwiKTtcbiAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgc2V0dGVyXCIpO1xuICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB3cml0ZSBwcml2YXRlIG1lbWJlciB0byBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xuICByZXR1cm4gKGtpbmQgPT09IFwiYVwiID8gZi5jYWxsKHJlY2VpdmVyLCB2YWx1ZSkgOiBmID8gZi52YWx1ZSA9IHZhbHVlIDogc3RhdGUuc2V0KHJlY2VpdmVyLCB2YWx1ZSkpLCB2YWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRJbihzdGF0ZSwgcmVjZWl2ZXIpIHtcbiAgaWYgKHJlY2VpdmVyID09PSBudWxsIHx8ICh0eXBlb2YgcmVjZWl2ZXIgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHJlY2VpdmVyICE9PSBcImZ1bmN0aW9uXCIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHVzZSAnaW4nIG9wZXJhdG9yIG9uIG5vbi1vYmplY3RcIik7XG4gIHJldHVybiB0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyID09PSBzdGF0ZSA6IHN0YXRlLmhhcyhyZWNlaXZlcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZShlbnYsIHZhbHVlLCBhc3luYykge1xuICBpZiAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHZvaWQgMCkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3QgZXhwZWN0ZWQuXCIpO1xuICAgIHZhciBkaXNwb3NlLCBpbm5lcjtcbiAgICBpZiAoYXN5bmMpIHtcbiAgICAgIGlmICghU3ltYm9sLmFzeW5jRGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0Rpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xuICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5hc3luY0Rpc3Bvc2VdO1xuICAgIH1cbiAgICBpZiAoZGlzcG9zZSA9PT0gdm9pZCAwKSB7XG4gICAgICBpZiAoIVN5bWJvbC5kaXNwb3NlKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmRpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xuICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5kaXNwb3NlXTtcbiAgICAgIGlmIChhc3luYykgaW5uZXIgPSBkaXNwb3NlO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGRpc3Bvc2UgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBub3QgZGlzcG9zYWJsZS5cIik7XG4gICAgaWYgKGlubmVyKSBkaXNwb3NlID0gZnVuY3Rpb24oKSB7IHRyeSB7IGlubmVyLmNhbGwodGhpcyk7IH0gY2F0Y2ggKGUpIHsgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpOyB9IH07XG4gICAgZW52LnN0YWNrLnB1c2goeyB2YWx1ZTogdmFsdWUsIGRpc3Bvc2U6IGRpc3Bvc2UsIGFzeW5jOiBhc3luYyB9KTtcbiAgfVxuICBlbHNlIGlmIChhc3luYykge1xuICAgIGVudi5zdGFjay5wdXNoKHsgYXN5bmM6IHRydWUgfSk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG52YXIgX1N1cHByZXNzZWRFcnJvciA9IHR5cGVvZiBTdXBwcmVzc2VkRXJyb3IgPT09IFwiZnVuY3Rpb25cIiA/IFN1cHByZXNzZWRFcnJvciA6IGZ1bmN0aW9uIChlcnJvciwgc3VwcHJlc3NlZCwgbWVzc2FnZSkge1xuICB2YXIgZSA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgcmV0dXJuIGUubmFtZSA9IFwiU3VwcHJlc3NlZEVycm9yXCIsIGUuZXJyb3IgPSBlcnJvciwgZS5zdXBwcmVzc2VkID0gc3VwcHJlc3NlZCwgZTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2Rpc3Bvc2VSZXNvdXJjZXMoZW52KSB7XG4gIGZ1bmN0aW9uIGZhaWwoZSkge1xuICAgIGVudi5lcnJvciA9IGVudi5oYXNFcnJvciA/IG5ldyBfU3VwcHJlc3NlZEVycm9yKGUsIGVudi5lcnJvciwgXCJBbiBlcnJvciB3YXMgc3VwcHJlc3NlZCBkdXJpbmcgZGlzcG9zYWwuXCIpIDogZTtcbiAgICBlbnYuaGFzRXJyb3IgPSB0cnVlO1xuICB9XG4gIHZhciByLCBzID0gMDtcbiAgZnVuY3Rpb24gbmV4dCgpIHtcbiAgICB3aGlsZSAociA9IGVudi5zdGFjay5wb3AoKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKCFyLmFzeW5jICYmIHMgPT09IDEpIHJldHVybiBzID0gMCwgZW52LnN0YWNrLnB1c2gociksIFByb21pc2UucmVzb2x2ZSgpLnRoZW4obmV4dCk7XG4gICAgICAgIGlmIChyLmRpc3Bvc2UpIHtcbiAgICAgICAgICB2YXIgcmVzdWx0ID0gci5kaXNwb3NlLmNhbGwoci52YWx1ZSk7XG4gICAgICAgICAgaWYgKHIuYXN5bmMpIHJldHVybiBzIHw9IDIsIFByb21pc2UucmVzb2x2ZShyZXN1bHQpLnRoZW4obmV4dCwgZnVuY3Rpb24oZSkgeyBmYWlsKGUpOyByZXR1cm4gbmV4dCgpOyB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHMgfD0gMTtcbiAgICAgIH1cbiAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGZhaWwoZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChzID09PSAxKSByZXR1cm4gZW52Lmhhc0Vycm9yID8gUHJvbWlzZS5yZWplY3QoZW52LmVycm9yKSA6IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIGlmIChlbnYuaGFzRXJyb3IpIHRocm93IGVudi5lcnJvcjtcbiAgfVxuICByZXR1cm4gbmV4dCgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb24ocGF0aCwgcHJlc2VydmVKc3gpIHtcbiAgaWYgKHR5cGVvZiBwYXRoID09PSBcInN0cmluZ1wiICYmIC9eXFwuXFwuP1xcLy8udGVzdChwYXRoKSkge1xuICAgICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFwuKHRzeCkkfCgoPzpcXC5kKT8pKCg/OlxcLlteLi9dKz8pPylcXC4oW2NtXT8pdHMkL2ksIGZ1bmN0aW9uIChtLCB0c3gsIGQsIGV4dCwgY20pIHtcbiAgICAgICAgICByZXR1cm4gdHN4ID8gcHJlc2VydmVKc3ggPyBcIi5qc3hcIiA6IFwiLmpzXCIgOiBkICYmICghZXh0IHx8ICFjbSkgPyBtIDogKGQgKyBleHQgKyBcIi5cIiArIGNtLnRvTG93ZXJDYXNlKCkgKyBcImpzXCIpO1xuICAgICAgfSk7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgX19leHRlbmRzLFxuICBfX2Fzc2lnbixcbiAgX19yZXN0LFxuICBfX2RlY29yYXRlLFxuICBfX3BhcmFtLFxuICBfX2VzRGVjb3JhdGUsXG4gIF9fcnVuSW5pdGlhbGl6ZXJzLFxuICBfX3Byb3BLZXksXG4gIF9fc2V0RnVuY3Rpb25OYW1lLFxuICBfX21ldGFkYXRhLFxuICBfX2F3YWl0ZXIsXG4gIF9fZ2VuZXJhdG9yLFxuICBfX2NyZWF0ZUJpbmRpbmcsXG4gIF9fZXhwb3J0U3RhcixcbiAgX192YWx1ZXMsXG4gIF9fcmVhZCxcbiAgX19zcHJlYWQsXG4gIF9fc3ByZWFkQXJyYXlzLFxuICBfX3NwcmVhZEFycmF5LFxuICBfX2F3YWl0LFxuICBfX2FzeW5jR2VuZXJhdG9yLFxuICBfX2FzeW5jRGVsZWdhdG9yLFxuICBfX2FzeW5jVmFsdWVzLFxuICBfX21ha2VUZW1wbGF0ZU9iamVjdCxcbiAgX19pbXBvcnRTdGFyLFxuICBfX2ltcG9ydERlZmF1bHQsXG4gIF9fY2xhc3NQcml2YXRlRmllbGRHZXQsXG4gIF9fY2xhc3NQcml2YXRlRmllbGRTZXQsXG4gIF9fY2xhc3NQcml2YXRlRmllbGRJbixcbiAgX19hZGREaXNwb3NhYmxlUmVzb3VyY2UsXG4gIF9fZGlzcG9zZVJlc291cmNlcyxcbiAgX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb24sXG59O1xuIiwiZXhwb3J0IGludGVyZmFjZSBJQ2FydGVzaWFuIHtcclxuICAgIC8qKiBFdWNsaWRlYW4gZGlzdGFuY2UgdG8gYW5vdGhlciBwb2ludC4gKi9cclxuICAgIGRpc3RhbmNlKGI6IElDYXJ0ZXNpYW4pOiBudW1iZXI7XHJcbiAgICAvKiogU3F1YXJlZCBldWNsaWRlYW4gZGlzdGFuY2UgKGF2b2lkcyBzcXJ0KS4gUHJlZmVycmVkIGZvciBjb21wYXJpc29uLW9ubHkgdXNlIGNhc2VzLiAqL1xyXG4gICAgZGlzdGFuY2VTcXVhcmVkKGI6IElDYXJ0ZXNpYW4pOiBudW1iZXI7XHJcbiAgICBzdWJ0cmFjdChiOiBJQ2FydGVzaWFuKTogdGhpcztcclxuICAgIGFkZChiOiBJQ2FydGVzaWFuKTogdGhpcztcclxuICAgIGFkZEluUGxhY2UoYjogSUNhcnRlc2lhbik6IHRoaXM7XHJcbiAgICBtdWx0aXBseUJ5U2NhbGFyKG46IG51bWJlcik6IHRoaXM7XHJcbiAgICBkaXZpZGVCeVNjYWxhcihuOiBudW1iZXIpOiB0aGlzO1xyXG4gICAgbWFnbml0dWRlKCk6IG51bWJlcjtcclxuICAgIHRvU3RyaW5nKCk6IHN0cmluZztcclxuICAgIGNsb25lKCk6IHRoaXM7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUNhcnRlc2lhbjIgZXh0ZW5kcyBJQ2FydGVzaWFuIHtcclxuICAgIHg6IG51bWJlcjtcclxuICAgIHk6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJQ2FydGVzaWFuMyBleHRlbmRzIElDYXJ0ZXNpYW4yIHtcclxuICAgIHo6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJQ2FydGVzaWFuNCBleHRlbmRzIElDYXJ0ZXNpYW4zIHtcclxuICAgIHc6IG51bWJlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFR5cGUgZ3VhcmQgZm9yIElDYXJ0ZXNpYW4gKElDYXJ0ZXNpYW4yIHwgSUNhcnRlc2lhbjMgfCBJQ2FydGVzaWFuNClcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc0NhcnRlc2lhbihvYmo6IHVua25vd24pOiBvYmogaXMgSUNhcnRlc2lhbiB7XHJcbiAgICByZXR1cm4gaXNDYXJ0ZXNpYW4yKG9iaikgfHwgaXNDYXJ0ZXNpYW4zKG9iaikgfHwgaXNDYXJ0ZXNpYW40KG9iaik7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUeXBlIGd1YXJkIGZvciBJQ2FydGVzaWFuMlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzQ2FydGVzaWFuMihiOiB1bmtub3duKTogYiBpcyBJQ2FydGVzaWFuMiB8IElDYXJ0ZXNpYW4zIHwgSUNhcnRlc2lhbjQge1xyXG4gICAgaWYgKHR5cGVvZiBiICE9PSBcIm9iamVjdFwiIHx8IGIgPT09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgIHJldHVybiBcInhcIiBpbiBiICYmIFwieVwiIGluIGI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUeXBlIGd1YXJkIGZvciBJQ2FydGVzaWFuM1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzQ2FydGVzaWFuMyhiOiB1bmtub3duKTogYiBpcyBJQ2FydGVzaWFuMyB8IElDYXJ0ZXNpYW40IHtcclxuICAgIGlmICghaXNDYXJ0ZXNpYW4yKGIpKSByZXR1cm4gZmFsc2U7XHJcbiAgICByZXR1cm4gXCJ6XCIgaW4gYjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFR5cGUgZ3VhcmQgZm9yIElDYXJ0ZXNpYW40XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNDYXJ0ZXNpYW40KGI6IHVua25vd24pOiBiIGlzIElDYXJ0ZXNpYW40IHtcclxuICAgIGlmICghaXNDYXJ0ZXNpYW4zKGIpKSByZXR1cm4gZmFsc2U7XHJcbiAgICByZXR1cm4gXCJ3XCIgaW4gYjtcclxufVxyXG4iLCJpbXBvcnQgeyBJQ2FydGVzaWFuIH0gZnJvbSBcIi4uL2dlb21ldHJ5XCI7XHJcbmltcG9ydCB7IE51bGxhYmxlIH0gZnJvbSBcIi4uL3R5cGVzXCI7XHJcbmltcG9ydCB7IElHcmFwaCwgSU5vZGUsIElPbGluayB9IGZyb20gXCIuL2dyYXBoLmludGVyZmFjZXNcIjtcclxuaW1wb3J0IHsgR3JhcGhOb2RlIH0gZnJvbSBcIi4vZ3JhcGgubm9kZVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEdyYXBoPE4gZXh0ZW5kcyBJTm9kZSwgTCBleHRlbmRzIElPbGluaz4gZXh0ZW5kcyBHcmFwaE5vZGUgaW1wbGVtZW50cyBJR3JhcGg8TiwgTD4ge1xyXG4gICAgcHVibGljIG5vZGVzOiBOW107XHJcbiAgICBwdWJsaWMgbGlua3M6IExbXTtcclxuICAgIHB1YmxpYyBpbnB1dHM6IE5bXTtcclxuICAgIHB1YmxpYyBvdXRwdXRzOiBOW107XHJcbiAgICBwdWJsaWMgaGlkZGVuczogTltdO1xyXG5cclxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihcclxuICAgICAgICBub2RlczogTltdID0gW10sXHJcbiAgICAgICAgbGlua3M6IExbXSA9IFtdLFxyXG4gICAgICAgIGlucHV0czogTnVsbGFibGU8TltdPiA9IG51bGwsXHJcbiAgICAgICAgb3V0cHV0czogTnVsbGFibGU8TltdPiA9IG51bGwsXHJcbiAgICAgICAgaGlkZGVuczogTnVsbGFibGU8TltdPiA9IG51bGwsXHJcbiAgICAgICAgb25zYzogTnVsbGFibGU8TFtdPiA9IG51bGwsXHJcbiAgICAgICAgb3BzYzogTnVsbGFibGU8TFtdPiA9IG51bGwsXHJcbiAgICAgICAgcG9zaXRpb24/OiBJQ2FydGVzaWFuXHJcbiAgICApIHtcclxuICAgICAgICBzdXBlcihvbnNjLCBvcHNjLCBwb3NpdGlvbik7IC8vIFBhc3MgYHBvc2l0aW9uYCB0byBgR3JhcGhOb2RlYFxyXG4gICAgICAgIHRoaXMubm9kZXMgPSBub2RlcztcclxuICAgICAgICB0aGlzLmxpbmtzID0gbGlua3M7XHJcbiAgICAgICAgdGhpcy5pbnB1dHMgPSBpbnB1dHMgPz8gdGhpcy5ub2Rlcy5maWx0ZXIoKG4pID0+IG4ub3BzYygpLmxlbmd0aCA9PT0gMCk7XHJcbiAgICAgICAgdGhpcy5vdXRwdXRzID0gb3V0cHV0cyA/PyB0aGlzLm5vZGVzLmZpbHRlcigobikgPT4gbi5vbnNjKCkubGVuZ3RoID09PSAwKTtcclxuICAgICAgICB0aGlzLmhpZGRlbnMgPSBoaWRkZW5zID8/IHRoaXMubm9kZXMuZmlsdGVyKChuKSA9PiAhdGhpcy5pbnB1dHMuaW5jbHVkZXMobikgJiYgIXRoaXMub3V0cHV0cy5pbmNsdWRlcyhuKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGNsb25lKCk6IGFueSB7XHJcbiAgICAgICAgdmFyIGNvcHkgPSBzdXBlci5jbG9uZSgpO1xyXG4gICAgICAgIGNvcHkubm9kZXMgPSB0aGlzLm5vZGVzLm1hcCgobikgPT4gbi5jbG9uZSgpKTtcclxuICAgICAgICBjb3B5LmxpbmtzID0gdGhpcy5saW5rcy5tYXAoKGwpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgY2xvbmVkID0gbC5jbG9uZSgpO1xyXG4gICAgICAgICAgICBjbG9uZWQub2luaSA9IGNvcHkubm9kZXNbdGhpcy5ub2Rlcy5pbmRleE9mKDxOPmwub2luaSldOyAvLyB0aGUgdW5kZXJseWluZyBzZXR0ZXIgaXMgdGFraW5nIGNhcmUgb2YgdW5iaW5kL2JpbmQgdGhlIGxpbmsgZnJvbS90byBub2RlXHJcbiAgICAgICAgICAgIGNsb25lZC5vZmluID0gY29weS5ub2Rlc1t0aGlzLm5vZGVzLmluZGV4T2YoPE4+bC5vZmluKV07IC8vIC4uLlxyXG4gICAgICAgICAgICByZXR1cm4gY2xvbmVkO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb3B5LmlucHV0cyA9IGNvcHkubm9kZXMuZmlsdGVyKChuKSA9PiBuLm9wc2MoKS5sZW5ndGggPT09IDApO1xyXG4gICAgICAgIGNvcHkub3V0cHV0cyA9IGNvcHkubm9kZXMuZmlsdGVyKChuKSA9PiBuLm9uc2MoKS5sZW5ndGggPT09IDApO1xyXG4gICAgICAgIGNvcHkuaGlkZGVucyA9IGNvcHkubm9kZXMuZmlsdGVyKChuKSA9PiAhY29weS5pbnB1dHMuaW5jbHVkZXMobikgJiYgIWNvcHkub3V0cHV0cy5pbmNsdWRlcyhuKSk7XHJcbiAgICAgICAgcmV0dXJuIGNvcHk7XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHsgQ2xvbmVNZXRhZGF0YUtleSwgSUdyYXBoSXRlbSwgSXNDbG9uZWFibGUsIElUYWdnYWJsZSB9IGZyb20gXCIuL2dyYXBoLmludGVyZmFjZXNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBHcmFwaEl0ZW0gaW1wbGVtZW50cyBJR3JhcGhJdGVtIHtcclxuICAgIHByaXZhdGUgX2lkPzphbnk7XHJcbiAgICBwcml2YXRlIF90YWc/OiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIF9iYWc/OiB1bmtub3duO1xyXG5cclxuICAgIHB1YmxpYyBnZXQgdGFnKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RhZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGlkKCkgOiBhbnkgfCB1bmRlZmluZWR7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lkO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgaWQodjphbnkpIHtcclxuICAgICAgICB0aGlzLl9pZCA9IHY7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBiYWcoKSA6IHVua25vd24gfCB1bmRlZmluZWR7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JhZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGJhZyh2OnVua25vd24pIHtcclxuICAgICAgICB0aGlzLl9iYWcgPSB2O1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyB3aXRoVGFnKHRhZzogc3RyaW5nKTogSVRhZ2dhYmxlIHtcclxuICAgICAgICB0aGlzLl90YWcgPSB0YWc7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGRpc3Bvc2UoKTogdm9pZCB7XHJcbiAgICAgICAgLy8gRGlzcG9zZSBsb2dpYyBpZiBuZWVkZWRcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgY2xvbmUoKTogdGhpcyB7XHJcbiAgICAgICAgY29uc3QgY3RvciA9IHRoaXMuY29uc3RydWN0b3IgYXMgbmV3ICgpID0+IHRoaXM7XHJcbiAgICAgICAgY29uc3QgY2xvbmUgPSBuZXcgY3RvcigpO1xyXG4gICAgICAgIGNvbnN0IHByb3BzID0gUmVmbGVjdC5nZXRNZXRhZGF0YShDbG9uZU1ldGFkYXRhS2V5LCB0aGlzKSB8fCBbXTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgcHJvcHMpIHtcclxuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAodGhpcyBhcyBhbnkpW2tleV07XHJcbiAgICAgICAgICAgIChjbG9uZSBhcyBhbnkpW2tleV0gPSBJc0Nsb25lYWJsZSh2YWx1ZSkgPyB2YWx1ZS5jbG9uZSgpIDogc3RydWN0dXJlZENsb25lKHZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjbG9uZTtcclxuICAgIH1cclxufVxyXG4iLCJpbXBvcnQgeyBJQ2FydGVzaWFuLCBpc0NhcnRlc2lhbiB9IGZyb20gXCIuLi9nZW9tZXRyeS9nZW9tZXRyeS5pbnRlcmZhY2VzXCI7XHJcbmltcG9ydCB7IE51bGxhYmxlIH0gZnJvbSBcIi4uL3R5cGVzXCI7XHJcblxyXG5leHBvcnQgY29uc3QgQ2xvbmVNZXRhZGF0YUtleSA9IFN5bWJvbChcImNsb25lYWJsZVwiKTtcclxuXHJcbi8vLyA8c3VtbWFyeT5cclxuLy8vIE1hcmtzIGEgcHJvcGVydHkgYXMgY2xvbmVhYmxlIGZvciBhdXRvbWF0aWMgZGVlcCBjb3B5aW5nXHJcbi8vLyA8L3N1bW1hcnk+XHJcbmV4cG9ydCBmdW5jdGlvbiBjbG9uZWFibGUodGFyZ2V0OiBvYmplY3QsIHByb3BlcnR5S2V5OiBzdHJpbmcgfCBzeW1ib2wpOiB2b2lkIHtcclxuICAgIGNvbnN0IHByb3RvID0gdGFyZ2V0LmNvbnN0cnVjdG9yLnByb3RvdHlwZTtcclxuICAgIGNvbnN0IGV4aXN0aW5nUHJvcHM6IHN0cmluZ1tdID0gUmVmbGVjdC5nZXRNZXRhZGF0YShDbG9uZU1ldGFkYXRhS2V5LCBwcm90bykgfHwgW107XHJcbiAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKENsb25lTWV0YWRhdGFLZXksIFsuLi5leGlzdGluZ1Byb3BzLCBwcm9wZXJ0eUtleV0sIHByb3RvKTtcclxufVxyXG5cclxuLy8vIDxzdW1tYXJ5PlxyXG4vLy8gSW50ZXJmYWNlIGZvciBjbG9uZWFibGUgb2JqZWN0c1xyXG4vLy8gPC9zdW1tYXJ5PlxyXG5leHBvcnQgaW50ZXJmYWNlIElDbG9uZWFibGU8VCA9IGFueT4ge1xyXG4gICAgY2xvbmUoKTogVDtcclxufVxyXG5cclxuLy8vIDxzdW1tYXJ5PlxyXG4vLy8gVHlwZSBndWFyZCB0byBjaGVjayBpZiBhbiBvYmplY3QgaW1wbGVtZW50cyBJQ2xvbmVhYmxlXHJcbi8vLyA8L3N1bW1hcnk+XHJcbmV4cG9ydCBmdW5jdGlvbiBJc0Nsb25lYWJsZTxUPihvYmo6IGFueSk6IG9iaiBpcyBJQ2xvbmVhYmxlPFQ+IHtcclxuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiICYmIG9iaiAhPT0gbnVsbCAmJiB0eXBlb2Ygb2JqLmNsb25lID09PSBcImZ1bmN0aW9uXCI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSURpc3Bvc2FibGUge1xyXG4gICAgZGlzcG9zZSgpOiB2b2lkO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElUYWdnYWJsZSB7XHJcbiAgICB3aXRoVGFnKHRhZzogc3RyaW5nKTogSVRhZ2dhYmxlO1xyXG4gICAgdGFnPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElJRGVudGlmaWFibGUge1xyXG4gICAgaWQ/OiBhbnk7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUhhc0JhZyB7XHJcbiAgICAvKipcclxuICAgICAqIFJ1bnRpbWUtb25seSBjb250YWluZXIgZm9yIGV4ZWN1dGlvbiBjb250ZXh0LlxyXG4gICAgICogQ2FuIGJlIHNhZmVseSBvdmVyd3JpdHRlbiBiZXR3ZWVuIHJ1bnMuXHJcbiAgICAgKi9cclxuICAgIGJhZz86IHVua25vd247XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUdyYXBoSXRlbSBleHRlbmRzIElEaXNwb3NhYmxlLCBJQ2xvbmVhYmxlLCBJVGFnZ2FibGUsIElJRGVudGlmaWFibGUsIElIYXNCYWcge31cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSU5vZGUgZXh0ZW5kcyBJR3JhcGhJdGVtIHtcclxuICAgIHBvc2l0aW9uPzogSUNhcnRlc2lhbjtcclxuICAgIG9uc2M8TCBleHRlbmRzIElPbGluaz4oKTogQXJyYXk8TD47XHJcbiAgICBvcHNjPEwgZXh0ZW5kcyBJT2xpbms+KCk6IEFycmF5PEw+O1xyXG59XHJcblxyXG4vLyB3ZSBkZWZpbmUgdGhlIElOb2RlU2V0IGFuZCBJTGlua1NldCBpbnRlcmZhY2VzIHRvIGJlIGFibGUgdG8gdXNlIHRoZW0gdG8gZ3JvdXAgbm9kZXMgYW5kIGxpbmtzXHJcbi8vIHRoaXMgaXMgcGFydGljdWxhcmx5IHVzZWZ1bCB3aGVuIHdlIHdhbnQgdG8gcGVyZm9ybSBvcGVyYXRpb25zIG9uIGEgZ3JvdXAgc3VjaCBMYXllcnMgaW4gTmV1cmFsIE5ldHdvcmtzXHJcbi8vIG9yIGF0dGFjaCBzcGVjaWZpYyBwcm9wZXJ0aWVzIHRvIGEgZ3JvdXAgb2Ygbm9kZXMgb3IgbGlua3MuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSU5vZGVTZXQ8TiBleHRlbmRzIElOb2RlPiBleHRlbmRzIEFycmF5PE4+IHt9XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElPbGluayBleHRlbmRzIElHcmFwaEl0ZW0ge1xyXG4gICAgb2luaTogTnVsbGFibGU8SU5vZGU+O1xyXG4gICAgb2ZpbjogTnVsbGFibGU8SU5vZGU+O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElMaW5rU2V0PEwgZXh0ZW5kcyBJT2xpbms+IGV4dGVuZHMgQXJyYXk8TD4ge31cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUdyYXBoPE4gZXh0ZW5kcyBJTm9kZSwgTCBleHRlbmRzIElPbGluaz4gZXh0ZW5kcyBJTm9kZSB7XHJcbiAgICBub2RlczogSU5vZGVTZXQ8Tj47XHJcbiAgICBsaW5rczogSUxpbmtTZXQ8TD47XHJcbiAgICBpbnB1dHM6IElOb2RlU2V0PE4+O1xyXG4gICAgb3V0cHV0czogSU5vZGVTZXQ8Tj47XHJcbiAgICBoaWRkZW5zOiBJTm9kZVNldDxOPjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFR5cGUgZ3VhcmQgZm9yIElOb2RlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlPE4gZXh0ZW5kcyBJTm9kZT4ob2JqOiB1bmtub3duKTogb2JqIGlzIE4ge1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgICB0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiICYmXHJcbiAgICAgICAgb2JqICE9PSBudWxsICYmXHJcbiAgICAgICAgKFwicG9zaXRpb25cIiBpbiBvYmogPyBvYmoucG9zaXRpb24gPT09IHVuZGVmaW5lZCB8fCBpc0NhcnRlc2lhbihvYmoucG9zaXRpb24pIDogdHJ1ZSkgJiYgLy8gRW5zdXJlIHBvc2l0aW9uIGlzIHVuZGVmaW5lZCBvciBJQ2FydGVzaWFuM1xyXG4gICAgICAgIFwib25zY1wiIGluIG9iaiAmJlxyXG4gICAgICAgIFwib3BzY1wiIGluIG9ialxyXG4gICAgKTtcclxufVxyXG4vKipcclxuICogVHlwZSBndWFyZCBmb3IgSU9saW5rXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNPbGluazxMIGV4dGVuZHMgSU9saW5rPihvYmo6IHVua25vd24pOiBvYmogaXMgTCB7XHJcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIiAmJiBvYmogIT09IG51bGwgJiYgXCJvaW5pXCIgaW4gb2JqICYmIFwib2ZpblwiIGluIG9iaiAmJiBpc05vZGUoKG9iaiBhcyBJT2xpbmspLm9pbmkpICYmIGlzTm9kZSgob2JqIGFzIElPbGluaykub2Zpbik7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUeXBlIGd1YXJkIGZvciBJR3JhcGhcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc0dyYXBoPE4gZXh0ZW5kcyBJTm9kZSwgTCBleHRlbmRzIElPbGluaz4ob2JqOiB1bmtub3duKTogb2JqIGlzIElHcmFwaDxOLCBMPiB7XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIGlzTm9kZShvYmopICYmXHJcbiAgICAgICAgXCJub2Rlc1wiIGluIG9iaiAmJlxyXG4gICAgICAgIFwibGlua3NcIiBpbiBvYmogJiZcclxuICAgICAgICBcImlucHV0c1wiIGluIG9iaiAmJlxyXG4gICAgICAgIFwib3V0cHV0c1wiIGluIG9iaiAmJlxyXG4gICAgICAgIEFycmF5LmlzQXJyYXkoKG9iaiBhcyBJR3JhcGg8TiwgTD4pLm5vZGVzKSAmJlxyXG4gICAgICAgIEFycmF5LmlzQXJyYXkoKG9iaiBhcyBJR3JhcGg8TiwgTD4pLmxpbmtzKSAmJlxyXG4gICAgICAgIEFycmF5LmlzQXJyYXkoKG9iaiBhcyBJR3JhcGg8TiwgTD4pLmlucHV0cykgJiZcclxuICAgICAgICBBcnJheS5pc0FycmF5KChvYmogYXMgSUdyYXBoPE4sIEw+KS5vdXRwdXRzKSAmJlxyXG4gICAgICAgIChvYmogYXMgSUdyYXBoPE4sIEw+KS5ub2Rlcy5ldmVyeShpc05vZGUpICYmXHJcbiAgICAgICAgKG9iaiBhcyBJR3JhcGg8TiwgTD4pLmxpbmtzLmV2ZXJ5KGlzT2xpbmspICYmXHJcbiAgICAgICAgKG9iaiBhcyBJR3JhcGg8TiwgTD4pLmlucHV0cy5ldmVyeShpc05vZGUpICYmXHJcbiAgICAgICAgKG9iaiBhcyBJR3JhcGg8TiwgTD4pLm91dHB1dHMuZXZlcnkoaXNOb2RlKVxyXG4gICAgKTtcclxufVxyXG4iLCJpbXBvcnQgdHlwZSB7IElDYXJ0ZXNpYW4gfSBmcm9tIFwiLi4vZ2VvbWV0cnlcIjtcclxuaW1wb3J0IHsgTnVsbGFibGUgfSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgR3JhcGhJdGVtIH0gZnJvbSBcIi4vZ3JhcGguZ3JhcGhJdGVtXCI7XHJcbmltcG9ydCB7IGNsb25lYWJsZSwgSU5vZGUsIElPbGluayB9IGZyb20gXCIuL2dyYXBoLmludGVyZmFjZXNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBHcmFwaE5vZGUgZXh0ZW5kcyBHcmFwaEl0ZW0gaW1wbGVtZW50cyBJTm9kZSB7XHJcbiAgICBwcm90ZWN0ZWQgX29uc2M6IElPbGlua1tdO1xyXG4gICAgcHJvdGVjdGVkIF9vcHNjOiBJT2xpbmtbXTtcclxuXHJcbiAgICBAY2xvbmVhYmxlIHB1YmxpYyBwb3NpdGlvbj86IElDYXJ0ZXNpYW47IFxyXG5cclxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihvbnNjOiBOdWxsYWJsZTxJT2xpbmtbXT4gPSBudWxsLCBvcHNjOiBOdWxsYWJsZTxJT2xpbmtbXT4gPSBudWxsLCBwb3NpdGlvbj86IElDYXJ0ZXNpYW4pIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuX29uc2MgPSBvbnNjID8/IFtdO1xyXG4gICAgICAgIHRoaXMuX29wc2MgPSBvcHNjID8/IFtdO1xyXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBwb3NpdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgb25zYzxMIGV4dGVuZHMgSU9saW5rPigpOiBBcnJheTxMPiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX29uc2MgYXMgQXJyYXk8TD47XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIG9wc2M8TCBleHRlbmRzIElPbGluaz4oKTogQXJyYXk8TD4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9vcHNjIGFzIEFycmF5PEw+O1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCB7IE51bGxhYmxlIH0gZnJvbSBcIi4uL3R5cGVzXCI7XHJcbmltcG9ydCB7IEdyYXBoSXRlbSB9IGZyb20gXCIuL2dyYXBoLmdyYXBoSXRlbVwiO1xyXG5pbXBvcnQgeyBJTm9kZSwgSU9saW5rIH0gZnJvbSBcIi4vZ3JhcGguaW50ZXJmYWNlc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEdyYXBoT0xpbmsgZXh0ZW5kcyBHcmFwaEl0ZW0gaW1wbGVtZW50cyBJT2xpbmsge1xyXG4gICAgcHJpdmF0ZSBfb2luaTogTnVsbGFibGU8SU5vZGU+O1xyXG4gICAgcHVibGljIF9vZmluOiBOdWxsYWJsZTxJTm9kZT47XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKG9pbmk/OiBJTm9kZSwgb2Zpbj86IElOb2RlKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLl9vaW5pID0gb2luaSA/PyBudWxsO1xyXG4gICAgICAgIGlmICh0aGlzLl9vaW5pKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX29pbmkub25zYygpLnB1c2godGhpcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX29maW4gPSBvZmluID8/IG51bGw7XHJcbiAgICAgICAgaWYgKHRoaXMuX29maW4pIHtcclxuICAgICAgICAgICAgdGhpcy5fb2Zpbi5vcHNjKCkucHVzaCh0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBvaW5pKCk6IE51bGxhYmxlPElOb2RlPiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX29pbmk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBvaW5pKG46IE51bGxhYmxlPElOb2RlPikge1xyXG4gICAgICAgIGlmICh0aGlzLl9vaW5pICE9PSBuKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9vaW5pKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhID0gdGhpcy5fb2luaS5vbnNjKCk7XHJcbiAgICAgICAgICAgICAgICBhLnNwbGljZShhLmluZGV4T2YodGhpcykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuX29pbmkgPSBuO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fb2luaSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fb2luaS5vbnNjKCkucHVzaCh0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IG9maW4oKTogTnVsbGFibGU8SU5vZGU+IHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fb2ZpbjtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IG9maW4objogTnVsbGFibGU8SU5vZGU+KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX29maW4gIT09IG4pIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX29maW4pIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGEgPSB0aGlzLl9vZmluLm9wc2MoKTtcclxuICAgICAgICAgICAgICAgIGEuc3BsaWNlKGEuaW5kZXhPZih0aGlzKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5fb2ZpbiA9IG47XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9vZmluKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9vZmluLm9wc2MoKS5wdXNoKHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBkaXNwb3NlKCk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLl9vaW5pKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRtcCA9IHRoaXMuX29pbmkub25zYygpO1xyXG4gICAgICAgICAgICB0bXAuc3BsaWNlKHRtcC5pbmRleE9mKHRoaXMpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuX29maW4pIHtcclxuICAgICAgICAgICAgY29uc3QgdG1wID0gdGhpcy5fb2Zpbi5vcHNjKCk7XHJcbiAgICAgICAgICAgIHRtcC5zcGxpY2UodG1wLmluZGV4T2YodGhpcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzdXBlci5kaXNwb3NlKCk7XHJcbiAgICB9XHJcbn1cclxuIiwiLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcbi8vIENvbXB1dGVHcmFwaCA6IGV4ZWN1dGVzIGEgREFHIG9mIGNvbXB1dGUgbm9kZXMgaW4gdG9wb2xvZ2ljYWwgb3JkZXJcclxuLy9cclxuLy8gRWFjaCBjYWxsIHRvIHJ1bigpOlxyXG4vLyAxLiBJbmplY3QgZXh0ZXJuYWwgaW5wdXRzIGludG8gc291cmNlIG5vZGVzXHJcbi8vIDIuIFdhbGsgbm9kZXMgaW4gdG9wb2xvZ2ljYWwgb3JkZXJcclxuLy8gMy4gRm9yIGVhY2ggbm9kZTogZ2F0aGVyIGlucHV0IHRlbnNvcnMgZnJvbSBpbmNvbWluZyBJRGF0YUxpbmtzLFxyXG4vLyAgICBjYWxsIGV4ZWN1dGUoKSwgd3JpdGUgb3V0cHV0IHRlbnNvcnMgdG8gb3V0Z29pbmcgSURhdGFMaW5rc1xyXG4vLyA0LiBDb2xsZWN0IG91dHB1dCB0ZW5zb3JzIGZyb20gc2luayBub2Rlc1xyXG4vL1xyXG4vLyBUaGUgdG9wb2xvZ2ljYWwgb3JkZXIgaXMgY29tcHV0ZWQgb25jZSBhdCBjb25zdHJ1Y3Rpb24gKG9yIHdoZW4gdGhlXHJcbi8vIGdyYXBoIGNoYW5nZXMpIGFuZCBjYWNoZWQgZm9yIGZhc3QgcGVyLWZyYW1lIGV4ZWN1dGlvbi5cclxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcblxyXG5pbXBvcnQgeyBHcmFwaCwgR3JhcGhPTGluayB9IGZyb20gXCJzcGlreXBhbmRhLWNvcmVcIjtcclxuaW1wb3J0IHtcclxuICAgIElDb21wdXRlR3JhcGgsXHJcbiAgICBJQ29tcHV0ZU5vZGUsXHJcbiAgICBJQ29tcHV0ZU5vZGVCYWcsXHJcbiAgICBJRGF0YUxpbmssXHJcbiAgICBJVGVuc29yLFxyXG59IGZyb20gXCIuL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xyXG5cclxuLy8g4pSA4pSA4pSAIERhdGFMaW5rIGltcGxlbWVudGF0aW9uIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuLyoqXHJcbiAqIENvbmNyZXRlIGRhdGEgbGluazogYSBkaXJlY3RlZCBlZGdlIGNhcnJ5aW5nIGEgdGVuc29yLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIERhdGFMaW5rIGV4dGVuZHMgR3JhcGhPTGluayBpbXBsZW1lbnRzIElEYXRhTGluayB7XHJcbiAgICBwdWJsaWMgdGVuc29yOiBJVGVuc29yIHwgbnVsbCA9IG51bGw7XHJcbiAgICBwdWJsaWMgaW5wdXRJbmRleDogbnVtYmVyO1xyXG5cclxuICAgIHB1YmxpYyBjb25zdHJ1Y3Rvcihmcm9tPzogSUNvbXB1dGVOb2RlLCB0bz86IElDb21wdXRlTm9kZSwgaW5wdXRJbmRleCA9IC0xKSB7XHJcbiAgICAgICAgc3VwZXIoZnJvbSwgdG8pO1xyXG4gICAgICAgIHRoaXMuaW5wdXRJbmRleCA9IGlucHV0SW5kZXg7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIOKUgOKUgOKUgCBDb21wdXRlR3JhcGggaW1wbGVtZW50YXRpb24g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4vKipcclxuICogRXhlY3V0YWJsZSBjb21wdXRlIGdyYXBoLlxyXG4gKlxyXG4gKiBFeHRlbmRzIGBHcmFwaDxJQ29tcHV0ZU5vZGUsIElEYXRhTGluaz5gIGZyb20gQHNwaWt5LXBhbmRhL2NvcmUsXHJcbiAqIGFkZGluZyB0b3BvbG9naWNhbCBzb3J0IGFuZCB0aGUgYHJ1bigpYCBleGVjdXRpb24gbWV0aG9kLlxyXG4gKlxyXG4gKiAqKlVzYWdlOioqXHJcbiAqIGBgYHR5cGVzY3JpcHRcclxuICogY29uc3QgZ3JhcGggPSBuZXcgQ29tcHV0ZUdyYXBoKG5vZGVzLCBsaW5rcyk7XHJcbiAqIGNvbnN0IHJlc3VsdCA9IGdyYXBoLnJ1bihuZXcgTWFwKFtbXCJwb3NlXCIsIHBvc2VUZW5zb3JdXSkpO1xyXG4gKiBjb25zdCBjb21tYW5kID0gcmVzdWx0LmdldChcImNvbW1hbmRcIik7XHJcbiAqIGBgYFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENvbXB1dGVHcmFwaCBleHRlbmRzIEdyYXBoPElDb21wdXRlTm9kZSwgSURhdGFMaW5rPiBpbXBsZW1lbnRzIElDb21wdXRlR3JhcGgge1xyXG4gICAgcHJpdmF0ZSBfc29ydGVkTm9kZXM6IElDb21wdXRlTm9kZVtdIHwgbnVsbCA9IG51bGw7XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKG5vZGVzOiBJQ29tcHV0ZU5vZGVbXSwgbGlua3M6IElEYXRhTGlua1tdKSB7XHJcbiAgICAgICAgc3VwZXIobm9kZXMsIGxpbmtzKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEV4ZWN1dGUgdGhlIGZ1bGwgZ3JhcGggaW4gdG9wb2xvZ2ljYWwgb3JkZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIGV4dGVybmFsSW5wdXRzICBOYW1lZCB0ZW5zb3JzIGluamVjdGVkIGludG8gc291cmNlIG5vZGVzXHJcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAobWF0Y2hlZCBieSBub2RlIElEIG9yIG5hbWUgdGFnKS5cclxuICAgICAqIEByZXR1cm5zICAgICAgICAgICAgICAgIE5hbWVkIHRlbnNvcnMgZnJvbSBvdXRwdXQgbm9kZXMuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBydW4oZXh0ZXJuYWxJbnB1dHM/OiBNYXA8c3RyaW5nLCBJVGVuc29yPik6IE1hcDxzdHJpbmcsIElUZW5zb3I+IHtcclxuICAgICAgICBjb25zdCBzb3J0ZWQgPSB0aGlzLl9nZXRUb3BvbG9naWNhbE9yZGVyKCk7XHJcblxyXG4gICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBzb3J0ZWQpIHtcclxuICAgICAgICAgICAgY29uc3QgaW5wdXRzID0gdGhpcy5fZ2F0aGVySW5wdXRzKG5vZGUsIGV4dGVybmFsSW5wdXRzKTtcclxuICAgICAgICAgICAgY29uc3Qgb3V0cHV0cyA9IG5vZGUuZXhlY3V0ZShpbnB1dHMpO1xyXG4gICAgICAgICAgICB0aGlzLl9kaXN0cmlidXRlT3V0cHV0cyhub2RlLCBvdXRwdXRzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb2xsZWN0UmVzdWx0cygpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRXhlY3V0ZSB0aGUgZnVsbCBncmFwaCBhc3luY2hyb25vdXNseSBpbiB0b3BvbG9naWNhbCBvcmRlci5cclxuICAgICAqXHJcbiAgICAgKiBGb3IgZWFjaCBub2RlLCB1c2VzIGBleGVjdXRlQXN5bmMoKWAgaWYgdGhlIG5vZGUgcHJvdmlkZXMgaXQsXHJcbiAgICAgKiBvdGhlcndpc2UgZmFsbHMgYmFjayB0byBzeW5jaHJvbm91cyBgZXhlY3V0ZSgpYC5cclxuICAgICAqIE5vZGVzIGFyZSBhd2FpdGVkIHNlcXVlbnRpYWxseSAodG9wb2xvZ2ljYWwgb3JkZXIgbXVzdCBiZSByZXNwZWN0ZWQpLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSBleHRlcm5hbElucHV0cyAgTmFtZWQgdGVuc29ycyBpbmplY3RlZCBpbnRvIHNvdXJjZSBub2Rlcy5cclxuICAgICAqIEByZXR1cm5zICAgICAgICAgICAgICAgIFByb21pc2UgcmVzb2x2aW5nIHRvIG5hbWVkIHRlbnNvcnMgZnJvbSBvdXRwdXQgbm9kZXMuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBhc3luYyBydW5Bc3luYyhleHRlcm5hbElucHV0cz86IE1hcDxzdHJpbmcsIElUZW5zb3I+KTogUHJvbWlzZTxNYXA8c3RyaW5nLCBJVGVuc29yPj4ge1xyXG4gICAgICAgIGNvbnN0IHNvcnRlZCA9IHRoaXMuX2dldFRvcG9sb2dpY2FsT3JkZXIoKTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIHNvcnRlZCkge1xyXG4gICAgICAgICAgICBjb25zdCBpbnB1dHMgPSB0aGlzLl9nYXRoZXJJbnB1dHMobm9kZSwgZXh0ZXJuYWxJbnB1dHMpO1xyXG5cclxuICAgICAgICAgICAgLy8gUHJlZmVyIGV4ZWN1dGVBc3luYyB3aGVuIGF2YWlsYWJsZSwgZmFsbGJhY2sgdG8gc3luYyBleGVjdXRlXHJcbiAgICAgICAgICAgIGNvbnN0IG91dHB1dHMgPSBub2RlLmV4ZWN1dGVBc3luY1xyXG4gICAgICAgICAgICAgICAgPyBhd2FpdCBub2RlLmV4ZWN1dGVBc3luYyhpbnB1dHMpXHJcbiAgICAgICAgICAgICAgICA6IG5vZGUuZXhlY3V0ZShpbnB1dHMpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5fZGlzdHJpYnV0ZU91dHB1dHMobm9kZSwgb3V0cHV0cyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5fY29sbGVjdFJlc3VsdHMoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEludmFsaWRhdGUgdGhlIGNhY2hlZCB0b3BvbG9naWNhbCBvcmRlci5cclxuICAgICAqIENhbGwgYWZ0ZXIgYWRkaW5nL3JlbW92aW5nIG5vZGVzIG9yIGxpbmtzLlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgaW52YWxpZGF0ZU9yZGVyKCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMuX3NvcnRlZE5vZGVzID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgSW50ZXJuYWwgaGVscGVycyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdhdGhlciBpbnB1dCB0ZW5zb3JzIGZvciBhIG5vZGUgZnJvbSBpbmNvbWluZyBsaW5rcyBvciBleHRlcm5hbCBpbnB1dHMuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgX2dhdGhlcklucHV0cyhub2RlOiBJQ29tcHV0ZU5vZGUsIGV4dGVybmFsSW5wdXRzPzogTWFwPHN0cmluZywgSVRlbnNvcj4pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGluY29taW5nTGlua3MgPSBub2RlLm9wc2M8SURhdGFMaW5rPigpO1xyXG4gICAgICAgIGNvbnN0IGlucHV0czogSVRlbnNvcltdID0gW107XHJcblxyXG4gICAgICAgIGlmIChpbmNvbWluZ0xpbmtzLmxlbmd0aCA9PT0gMCAmJiBleHRlcm5hbElucHV0cykge1xyXG4gICAgICAgICAgICAvLyBTb3VyY2Ugbm9kZTogY2hlY2sgZm9yIGV4dGVybmFsIGlucHV0IGJ5IElEIG9yIHRhZ1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSAobm9kZS5pZCBhcyBzdHJpbmcpID8/IG5vZGUudGFnO1xyXG4gICAgICAgICAgICBpZiAoa2V5KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBleHQgPSBleHRlcm5hbElucHV0cy5nZXQoa2V5KTtcclxuICAgICAgICAgICAgICAgIGlmIChleHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dHMucHVzaChleHQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gVHJhbnNmb3JtIG5vZGU6IHJlYWQgdGVuc29ycyBmcm9tIGluY29taW5nIGRhdGEgbGlua3NcclxuICAgICAgICAgICAgLy8gU29ydCBieSBpbnB1dEluZGV4IHdoZW4gc2V0IChPTk5YIGdyYXBoIGJ1aWxkZXIgdGFncyBsaW5rcylcclxuICAgICAgICAgICAgY29uc3QgaGFzSW5kZXggPSBpbmNvbWluZ0xpbmtzLnNvbWUoKGwpID0+IGwuaW5wdXRJbmRleCA+PSAwKTtcclxuICAgICAgICAgICAgY29uc3Qgb3JkZXJlZCA9IGhhc0luZGV4XHJcbiAgICAgICAgICAgICAgICA/IFsuLi5pbmNvbWluZ0xpbmtzXS5zb3J0KChhLCBiKSA9PiBhLmlucHV0SW5kZXggLSBiLmlucHV0SW5kZXgpXHJcbiAgICAgICAgICAgICAgICA6IGluY29taW5nTGlua3M7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgbGluayBvZiBvcmRlcmVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobGluay50ZW5zb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dHMucHVzaChsaW5rLnRlbnNvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpbnB1dHM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWNoZSBvdXRwdXRzIGluIHRoZSBub2RlJ3MgYmFnIGFuZCB3cml0ZSB0aGVtIHRvIG91dGdvaW5nIGRhdGEgbGlua3MuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgX2Rpc3RyaWJ1dGVPdXRwdXRzKG5vZGU6IElDb21wdXRlTm9kZSwgb3V0cHV0czogSVRlbnNvcltdKTogdm9pZCB7XHJcbiAgICAgICAgLy8gQ2FjaGUgb3V0cHV0cyBpbiB0aGUgbm9kZSdzIGJhZ1xyXG4gICAgICAgIGNvbnN0IGJhZyA9IChub2RlLmJhZyA/PyB7fSkgYXMgSUNvbXB1dGVOb2RlQmFnO1xyXG4gICAgICAgIGJhZy5sYXN0T3V0cHV0cyA9IG91dHB1dHM7XHJcbiAgICAgICAgbm9kZS5iYWcgPSBiYWc7XHJcblxyXG4gICAgICAgIC8vIFdyaXRlIG91dHB1dHMgdG8gb3V0Z29pbmcgZGF0YSBsaW5rc1xyXG4gICAgICAgIGNvbnN0IG91dGdvaW5nTGlua3MgPSBub2RlLm9uc2M8SURhdGFMaW5rPigpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0Z29pbmdMaW5rcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAvLyBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgb3V0cHV0cywgZGlzdHJpYnV0ZSB0aGVtOyBvdGhlcndpc2UgYnJvYWRjYXN0XHJcbiAgICAgICAgICAgIG91dGdvaW5nTGlua3NbaV0udGVuc29yID0gb3V0cHV0cy5sZW5ndGggPiAxID8gKG91dHB1dHNbaV0gPz8gb3V0cHV0c1swXSkgOiAob3V0cHV0c1swXSA/PyBudWxsKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDb2xsZWN0IG91dHB1dCB0ZW5zb3JzIGZyb20gc2luayBub2RlcyAobm9kZXMgd2l0aCBubyBzdWNjZXNzb3JzKS5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBfY29sbGVjdFJlc3VsdHMoKTogTWFwPHN0cmluZywgSVRlbnNvcj4ge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCBJVGVuc29yPigpO1xyXG4gICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiB0aGlzLm91dHB1dHMpIHtcclxuICAgICAgICAgICAgY29uc3QgYmFnID0gbm9kZS5iYWcgYXMgSUNvbXB1dGVOb2RlQmFnIHwgdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICBpZiAoYmFnPy5sYXN0T3V0cHV0cykge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gKG5vZGUuaWQgYXMgc3RyaW5nKSA/PyBub2RlLnRhZyA/PyBub2RlLm5vZGVUeXBlO1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB0ZW5zb3Igb2YgYmFnLmxhc3RPdXRwdXRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldCh0ZW5zb3IubmFtZSA/PyBrZXksIHRlbnNvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgVG9wb2xvZ2ljYWwgc29ydCAoS2FobidzIGFsZ29yaXRobSkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSBfZ2V0VG9wb2xvZ2ljYWxPcmRlcigpOiBJQ29tcHV0ZU5vZGVbXSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3NvcnRlZE5vZGVzKSByZXR1cm4gdGhpcy5fc29ydGVkTm9kZXM7XHJcblxyXG4gICAgICAgIGNvbnN0IHNvcnRlZDogSUNvbXB1dGVOb2RlW10gPSBbXTtcclxuICAgICAgICBjb25zdCBpbkRlZ3JlZSA9IG5ldyBNYXA8SUNvbXB1dGVOb2RlLCBudW1iZXI+KCk7XHJcblxyXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW4tZGVncmVlc1xyXG4gICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiB0aGlzLm5vZGVzKSB7XHJcbiAgICAgICAgICAgIGluRGVncmVlLnNldChub2RlLCBub2RlLm9wc2M8SURhdGFMaW5rPigpLmxlbmd0aCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTdGFydCB3aXRoIHNvdXJjZSBub2RlcyAoaW4tZGVncmVlID0gMClcclxuICAgICAgICBjb25zdCBxdWV1ZTogSUNvbXB1dGVOb2RlW10gPSBbXTtcclxuICAgICAgICBmb3IgKGNvbnN0IFtub2RlLCBkZWdyZWVdIG9mIGluRGVncmVlKSB7XHJcbiAgICAgICAgICAgIGlmIChkZWdyZWUgPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHF1ZXVlLnB1c2gobm9kZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdoaWxlIChxdWV1ZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBxdWV1ZS5zaGlmdCgpITtcclxuICAgICAgICAgICAgc29ydGVkLnB1c2gobm9kZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBGb3IgZWFjaCBvdXRnb2luZyBsaW5rLCByZWR1Y2UgdGhlIGRlc3RpbmF0aW9uJ3MgaW4tZGVncmVlXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgbGluayBvZiBub2RlLm9uc2M8SURhdGFMaW5rPigpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkZXN0ID0gbGluay5vZmluIGFzIElDb21wdXRlTm9kZTtcclxuICAgICAgICAgICAgICAgIGlmIChkZXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3RGVncmVlID0gKGluRGVncmVlLmdldChkZXN0KSA/PyAxKSAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5EZWdyZWUuc2V0KGRlc3QsIG5ld0RlZ3JlZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0RlZ3JlZSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWV1ZS5wdXNoKGRlc3QpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHNvcnRlZC5sZW5ndGggIT09IHRoaXMubm9kZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgICAgICAgICAgIGBDb21wdXRlR3JhcGggaGFzIGEgY3ljbGU6IHNvcnRlZCAke3NvcnRlZC5sZW5ndGh9IG9mICR7dGhpcy5ub2Rlcy5sZW5ndGh9IG5vZGVzLiBgICtcclxuICAgICAgICAgICAgICAgIGBDb21wdXRlIGdyYXBocyBtdXN0IGJlIERBR3MuYFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fc29ydGVkTm9kZXMgPSBzb3J0ZWQ7XHJcbiAgICAgICAgcmV0dXJuIHNvcnRlZDtcclxuICAgIH1cclxufVxyXG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIENvbXB1dGVOb2RlQmFzZSA6IGFic3RyYWN0IGJhc2UgY2xhc3MgZm9yIGFsbCBjb21wdXRlIG5vZGVzXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuaW1wb3J0IHsgR3JhcGhOb2RlIH0gZnJvbSBcInNwaWt5cGFuZGEtY29yZVwiO1xuaW1wb3J0IHsgSUNvbXB1dGVOb2RlLCBJVGVuc29yIH0gZnJvbSBcIi4vY29tcHV0ZS5pbnRlcmZhY2VzXCI7XG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgY29tcHV0ZSBub2Rlcy4gRXh0ZW5kcyBHcmFwaE5vZGUgZm9yIGdyYXBoIGNvbXBhdGliaWxpdHkuXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBDb21wdXRlTm9kZUJhc2UgZXh0ZW5kcyBHcmFwaE5vZGUgaW1wbGVtZW50cyBJQ29tcHV0ZU5vZGUge1xuICAgIHB1YmxpYyBhYnN0cmFjdCByZWFkb25seSBub2RlVHlwZTogc3RyaW5nO1xuICAgIHB1YmxpYyBhYnN0cmFjdCByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW107XG4gICAgcHVibGljIGFic3RyYWN0IGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW107XG59XG4iLCJleHBvcnQgKiBmcm9tIFwiLi9jb21wdXRlLmludGVyZmFjZXNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2NvbXB1dGUubm9kZS5iYXNlXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9jb21wdXRlLmdyYXBoXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9ub2Rlcy9pbmRleFwiO1xuZXhwb3J0ICogZnJvbSBcIi4vbXBjXCI7XG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIE1vZGVsIFByZWRpY3RpdmUgQ29udHJvbCAoTVBDKSBub2Rlc1xuLy9cbi8vIEltcGxlbWVudHMgdGhlIFwiZnV0dXJlIGdyYXBoXCIgY29uY2VwdCBmcm9tIFNUQUcgKFNlbnNlLVRoaW5rLUFjdCB3aXRoIEdyYXBocykuXG4vLyBUaGUgZHluYW1pY3MgbW9kZWwgaXMgYSBzdGFuZGFyZCBDb21wdXRlR3JhcGggdGhhdCBtYXBzIChzdGF0ZSwgYWN0aW9uKVxuLy8gdG8gbmV4dF9zdGF0ZS4gTVBDIG5vZGVzIHdyYXAgdGhpcyBkeW5hbWljcyBncmFwaCB0bzpcbi8vXG4vLyAgIC0gUm9sbG91dE5vZGUgICAgICAgICAgICAgIDogdW5yb2xsIHRoZSBkeW5hbWljcyBOIHN0ZXBzIGZvcndhcmRcbi8vICAgLSBPYmplY3RpdmVOb2RlICAgICAgICAgICAgOiBzY29yZSBhIHRyYWplY3Rvcnkgd2l0aCBhIGNvc3QgZnVuY3Rpb25cbi8vICAgLSBTaG9vdGluZ1NlbGVjdG9yTm9kZSAgICAgOiByYW5kb20tc2hvb3RpbmcgTVBDLCBwaWNrIGJlc3QgZmlyc3QgYWN0aW9uXG4vL1xuLy8gVGhlc2Ugbm9kZXMgbGV0IHlvdSBydW4gZnVsbCBNUEMgbG9vcHMgb24gYSBtaWNyb2NvbnRyb2xsZXIgdXNpbmcgdGhlXG4vLyBzYW1lIGluZmVyZW5jZSBlbmdpbmUgYXMgdGhlIHBlcmNlcHRpb24gKHBhc3QgZ3JhcGgpLlxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5pbXBvcnQgeyBDb21wdXRlR3JhcGggfSBmcm9tIFwiLi9jb21wdXRlLmdyYXBoXCI7XG5pbXBvcnQgeyBDb21wdXRlTm9kZUJhc2UgfSBmcm9tIFwiLi9jb21wdXRlLm5vZGUuYmFzZVwiO1xuaW1wb3J0IHsgSVRlbnNvciB9IGZyb20gXCIuL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xuXG4vLyDilIDilIDilIAgUm9sbG91dE5vZGUg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbi8qKlxuICogVW5yb2xsIGEgZHluYW1pY3Mgc3ViLWdyYXBoIG92ZXIgYSBmaXhlZCBob3Jpem9uLlxuICpcbiAqIElucHV0czpcbiAqICAgaW5wdXRzWzBdID0gaW5pdGlhbCBzdGF0ZSwgc2hhcGUgW3N0YXRlRGltXVxuICogICBpbnB1dHNbMV0gPSBhY3Rpb24gc2VxdWVuY2UsIHNoYXBlIFtob3Jpem9uICogYWN0aW9uRGltXSAoZmxhdHRlbmVkKVxuICpcbiAqIE91dHB1dHM6XG4gKiAgIHRyYWplY3RvcnksIHNoYXBlIFsoaG9yaXpvbisxKSAqIHN0YXRlRGltXSAoZmxhdHRlbmVkKVxuICpcbiAqIFRoZSBkeW5hbWljcyBncmFwaCBpcyBleHBlY3RlZCB0byBhY2NlcHQgYSBzaW5nbGUgaW5wdXQgdGVuc29yIG9mIHNoYXBlXG4gKiBbc3RhdGVEaW0gKyBhY3Rpb25EaW1dIChjb25jYXRlbmF0ZWQgc3RhdGUgYW5kIGFjdGlvbikgYW5kIHJldHVybiBhIHNpbmdsZVxuICogb3V0cHV0IHRlbnNvciBvZiBzaGFwZSBbc3RhdGVEaW1dICh0aGUgc3RhdGUgZGVsdGEgT1IgdGhlIG5leHQgc3RhdGUsXG4gKiBjb250cm9sbGVkIGJ5IHRoZSBgZGVsdGFNb2RlYCBmbGFnKS5cbiAqL1xuZXhwb3J0IGNsYXNzIFJvbGxvdXROb2RlIGV4dGVuZHMgQ29tcHV0ZU5vZGVCYXNlIHtcbiAgICBwdWJsaWMgcmVhZG9ubHkgbm9kZVR5cGUgPSBcIm1wY19yb2xsb3V0XCI7XG4gICAgcHVibGljIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXTtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX2R5bmFtaWNzOiBDb21wdXRlR3JhcGg7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfZHluYW1pY3NJbnB1dE5hbWU6IHN0cmluZztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9ob3Jpem9uOiBudW1iZXI7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhdGVEaW06IG51bWJlcjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9hY3Rpb25EaW06IG51bWJlcjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9kZWx0YU1vZGU6IGJvb2xlYW47XG5cbiAgICBwdWJsaWMgY29uc3RydWN0b3Iob3B0czoge1xuICAgICAgICBkeW5hbWljczogQ29tcHV0ZUdyYXBoO1xuICAgICAgICBkeW5hbWljc0lucHV0TmFtZTogc3RyaW5nO1xuICAgICAgICBob3Jpem9uOiBudW1iZXI7XG4gICAgICAgIHN0YXRlRGltOiBudW1iZXI7XG4gICAgICAgIGFjdGlvbkRpbTogbnVtYmVyO1xuICAgICAgICBkZWx0YU1vZGU/OiBib29sZWFuO1xuICAgIH0pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fZHluYW1pY3MgPSBvcHRzLmR5bmFtaWNzO1xuICAgICAgICB0aGlzLl9keW5hbWljc0lucHV0TmFtZSA9IG9wdHMuZHluYW1pY3NJbnB1dE5hbWU7XG4gICAgICAgIHRoaXMuX2hvcml6b24gPSBvcHRzLmhvcml6b247XG4gICAgICAgIHRoaXMuX3N0YXRlRGltID0gb3B0cy5zdGF0ZURpbTtcbiAgICAgICAgdGhpcy5fYWN0aW9uRGltID0gb3B0cy5hY3Rpb25EaW07XG4gICAgICAgIHRoaXMuX2RlbHRhTW9kZSA9IG9wdHMuZGVsdGFNb2RlID8/IGZhbHNlO1xuICAgICAgICB0aGlzLm91dHB1dFNoYXBlcyA9IFtbKG9wdHMuaG9yaXpvbiArIDEpICogb3B0cy5zdGF0ZURpbV1dO1xuICAgIH1cblxuICAgIHB1YmxpYyBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcbiAgICAgICAgY29uc3QgaW5pdGlhbFN0YXRlID0gaW5wdXRzWzBdLmRhdGE7XG4gICAgICAgIGNvbnN0IGFjdGlvbnMgPSBpbnB1dHNbMV0uZGF0YTtcblxuICAgICAgICBjb25zdCBTID0gdGhpcy5fc3RhdGVEaW07XG4gICAgICAgIGNvbnN0IEEgPSB0aGlzLl9hY3Rpb25EaW07XG4gICAgICAgIGNvbnN0IEggPSB0aGlzLl9ob3Jpem9uO1xuICAgICAgICBjb25zdCB0cmFqZWN0b3J5ID0gbmV3IEZsb2F0MzJBcnJheSgoSCArIDEpICogUyk7XG5cbiAgICAgICAgLy8gU2VlZCB0cmFqZWN0b3J5IHdpdGggaW5pdGlhbCBzdGF0ZVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IFM7IGkrKykge1xuICAgICAgICAgICAgdHJhamVjdG9yeVtpXSA9IGluaXRpYWxTdGF0ZVtpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0YXRlQWN0aW9uQnVmID0gbmV3IEZsb2F0MzJBcnJheShTICsgQSk7XG4gICAgICAgIGNvbnN0IGV4dGVybmFsSW5wdXRzID0gbmV3IE1hcDxzdHJpbmcsIElUZW5zb3I+KCk7XG5cbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCBIOyB0KyspIHtcbiAgICAgICAgICAgIC8vIEJ1aWxkIGR5bmFtaWNzIGlucHV0OiBzdGF0ZSBjb25jYXRlbmF0ZWQgd2l0aCBhY3Rpb25cbiAgICAgICAgICAgIGNvbnN0IHN0YXRlT2ZmID0gdCAqIFM7XG4gICAgICAgICAgICBjb25zdCBhY3Rpb25PZmYgPSB0ICogQTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgUzsgaSsrKSBzdGF0ZUFjdGlvbkJ1ZltpXSA9IHRyYWplY3Rvcnlbc3RhdGVPZmYgKyBpXTtcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgQTsgaisrKSBzdGF0ZUFjdGlvbkJ1ZltTICsgal0gPSBhY3Rpb25zW2FjdGlvbk9mZiArIGpdO1xuXG4gICAgICAgICAgICBjb25zdCBpbnB1dDogSVRlbnNvciA9IHtcbiAgICAgICAgICAgICAgICBkYXRhOiBzdGF0ZUFjdGlvbkJ1Zi5zbGljZSgpLFxuICAgICAgICAgICAgICAgIHNoYXBlOiBbMSwgUyArIEFdLFxuICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMuX2R5bmFtaWNzSW5wdXROYW1lLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGV4dGVybmFsSW5wdXRzLmNsZWFyKCk7XG4gICAgICAgICAgICBleHRlcm5hbElucHV0cy5zZXQodGhpcy5fZHluYW1pY3NJbnB1dE5hbWUsIGlucHV0KTtcblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0cyA9IHRoaXMuX2R5bmFtaWNzLnJ1bihleHRlcm5hbElucHV0cyk7XG4gICAgICAgICAgICBjb25zdCBvdXRUZW5zb3IgPSByZXN1bHRzLnZhbHVlcygpLm5leHQoKS52YWx1ZSBhcyBJVGVuc29yO1xuXG4gICAgICAgICAgICBjb25zdCBuZXh0T2ZmID0gKHQgKyAxKSAqIFM7XG4gICAgICAgICAgICBpZiAodGhpcy5fZGVsdGFNb2RlKSB7XG4gICAgICAgICAgICAgICAgLy8gTW9kZWwgcHJlZGljdHMgZGVsdGEgLT4gYWRkIHRvIGN1cnJlbnQgc3RhdGVcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IFM7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB0cmFqZWN0b3J5W25leHRPZmYgKyBpXSA9IHRyYWplY3Rvcnlbc3RhdGVPZmYgKyBpXSArIG91dFRlbnNvci5kYXRhW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBTOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhamVjdG9yeVtuZXh0T2ZmICsgaV0gPSBvdXRUZW5zb3IuZGF0YVtpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gW3tcbiAgICAgICAgICAgIGRhdGE6IHRyYWplY3RvcnksXG4gICAgICAgICAgICBzaGFwZTogW0ggKyAxLCBTXSxcbiAgICAgICAgICAgIG5hbWU6IFwidHJhamVjdG9yeVwiLFxuICAgICAgICB9XTtcbiAgICB9XG59XG5cbi8vIOKUgOKUgOKUgCBPYmplY3RpdmVOb2RlIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4vKipcbiAqIFNjYWxhciBjb3N0IGZvciBhIHRyYWplY3RvcnkuXG4gKlxuICogSW5wdXRzOlxuICogICBpbnB1dHNbMF0gPSB0cmFqZWN0b3J5LCBzaGFwZSBbKGhvcml6b24rMSksIHN0YXRlRGltXVxuICogICBpbnB1dHNbMV0gPSBhY3Rpb24gc2VxdWVuY2UsIHNoYXBlIFtob3Jpem9uLCBhY3Rpb25EaW1dXG4gKlxuICogT3V0cHV0czpcbiAqICAgY29zdCwgc2hhcGUgWzFdXG4gKlxuICogVGhlIGNvc3QgaXMgY29tcHV0ZWQgdmlhIGEgdXNlci1zdXBwbGllZCBmdW5jdGlvbiByZWNlaXZpbmcgdGhlIHJhd1xuICogRmxvYXQzMkFycmF5cyBhbmQgZGltZW5zaW9ucy4gVGhpcyBsZXRzIHRoZSBkZW1vIGRlZmluZSBkb21haW4tc3BlY2lmaWNcbiAqIGNvc3QgZnVuY3Rpb25zIChlLmcuIENPMiB0aHJlc2hvbGQgcGVuYWx0eSArIGVuZXJneSkgd2l0aG91dCBiYWtpbmcgdGhlbVxuICogaW50byB0aGUgbm9kZSB0eXBlLlxuICovXG5leHBvcnQgdHlwZSBUcmFqZWN0b3J5Q29zdEZuID0gKFxuICAgIHRyYWplY3Rvcnk6IEZsb2F0MzJBcnJheSxcbiAgICBhY3Rpb25zOiBGbG9hdDMyQXJyYXksXG4gICAgc3RhdGVEaW06IG51bWJlcixcbiAgICBhY3Rpb25EaW06IG51bWJlcixcbiAgICBob3Jpem9uOiBudW1iZXIsXG4pID0+IG51bWJlcjtcblxuZXhwb3J0IGNsYXNzIE9iamVjdGl2ZU5vZGUgZXh0ZW5kcyBDb21wdXRlTm9kZUJhc2Uge1xuICAgIHB1YmxpYyByZWFkb25seSBub2RlVHlwZSA9IFwibXBjX29iamVjdGl2ZVwiO1xuICAgIHB1YmxpYyByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbWzFdXTtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Nvc3RGbjogVHJhamVjdG9yeUNvc3RGbjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdGF0ZURpbTogbnVtYmVyO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2FjdGlvbkRpbTogbnVtYmVyO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2hvcml6b246IG51bWJlcjtcblxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihvcHRzOiB7XG4gICAgICAgIGNvc3RGbjogVHJhamVjdG9yeUNvc3RGbjtcbiAgICAgICAgc3RhdGVEaW06IG51bWJlcjtcbiAgICAgICAgYWN0aW9uRGltOiBudW1iZXI7XG4gICAgICAgIGhvcml6b246IG51bWJlcjtcbiAgICB9KSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX2Nvc3RGbiA9IG9wdHMuY29zdEZuO1xuICAgICAgICB0aGlzLl9zdGF0ZURpbSA9IG9wdHMuc3RhdGVEaW07XG4gICAgICAgIHRoaXMuX2FjdGlvbkRpbSA9IG9wdHMuYWN0aW9uRGltO1xuICAgICAgICB0aGlzLl9ob3Jpem9uID0gb3B0cy5ob3Jpem9uO1xuICAgIH1cblxuICAgIHB1YmxpYyBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcbiAgICAgICAgY29uc3QgdHJhamVjdG9yeSA9IGlucHV0c1swXS5kYXRhO1xuICAgICAgICBjb25zdCBhY3Rpb25zID0gaW5wdXRzWzFdLmRhdGE7XG4gICAgICAgIGNvbnN0IGNvc3QgPSB0aGlzLl9jb3N0Rm4odHJhamVjdG9yeSwgYWN0aW9ucyxcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlRGltLCB0aGlzLl9hY3Rpb25EaW0sIHRoaXMuX2hvcml6b24pO1xuICAgICAgICByZXR1cm4gW3sgZGF0YTogbmV3IEZsb2F0MzJBcnJheShbY29zdF0pLCBzaGFwZTogWzFdLCBuYW1lOiBcImNvc3RcIiB9XTtcbiAgICB9XG59XG5cbi8vIOKUgOKUgOKUgCBTaG9vdGluZ1NlbGVjdG9yTm9kZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuLyoqXG4gKiBSYW5kb20tc2hvb3RpbmcgTVBDLlxuICpcbiAqIEdlbmVyYXRlcyBLIGNhbmRpZGF0ZSBhY3Rpb24gc2VxdWVuY2VzLCBldmFsdWF0ZXMgZWFjaCB2aWEgcm9sbG91dCArIGNvc3QsXG4gKiByZXR1cm5zIHRoZSBmaXJzdCBhY3Rpb24gb2YgdGhlIGJlc3Qgc2VxdWVuY2UuXG4gKlxuICogSW5wdXRzOlxuICogICBpbnB1dHNbMF0gPSBpbml0aWFsIHN0YXRlLCBzaGFwZSBbc3RhdGVEaW1dXG4gKlxuICogT3V0cHV0czpcbiAqICAgb3V0cHV0c1swXSA9IGJlc3QgZmlyc3QgYWN0aW9uLCBzaGFwZSBbYWN0aW9uRGltXVxuICogICBvdXRwdXRzWzFdID0gYmVzdCBjb3N0LCBzaGFwZSBbMV1cbiAqICAgb3V0cHV0c1syXSA9IGFsbCBjYW5kaWRhdGUgY29zdHMsIHNoYXBlIFtLXVxuICpcbiAqIFRoZSBub2RlIGlzIGNvbnN0cnVjdGVkIHdpdGg6XG4gKiAgIC0gYSBSb2xsb3V0Tm9kZSAgICAgICAgICh0byB1bnJvbGwgY2FuZGlkYXRlcylcbiAqICAgLSBhbiBPYmplY3RpdmVOb2RlICAgICAgKHRvIHNjb3JlIHRyYWplY3RvcmllcylcbiAqICAgLSBhbiBhY3Rpb24gc2FtcGxlciAgICAgKHByb2R1Y2VzIGEgW2hvcml6b24gKiBhY3Rpb25EaW1dIHNlcXVlbmNlKVxuICogICAtIEsgKG51bWJlciBvZiBjYW5kaWRhdGVzKVxuICovXG5leHBvcnQgdHlwZSBBY3Rpb25TYW1wbGVyRm4gPSAoXG4gICAgaG9yaXpvbjogbnVtYmVyLFxuICAgIGFjdGlvbkRpbTogbnVtYmVyLFxuICAgIHJuZzogKCkgPT4gbnVtYmVyLFxuKSA9PiBGbG9hdDMyQXJyYXk7XG5cbmV4cG9ydCBjbGFzcyBTaG9vdGluZ1NlbGVjdG9yTm9kZSBleHRlbmRzIENvbXB1dGVOb2RlQmFzZSB7XG4gICAgcHVibGljIHJlYWRvbmx5IG5vZGVUeXBlID0gXCJtcGNfc2hvb3RpbmdcIjtcbiAgICBwdWJsaWMgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdO1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSBfcm9sbG91dDogUm9sbG91dE5vZGU7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfb2JqZWN0aXZlOiBPYmplY3RpdmVOb2RlO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3NhbXBsZXI6IEFjdGlvblNhbXBsZXJGbjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9udW1DYW5kaWRhdGVzOiBudW1iZXI7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfaG9yaXpvbjogbnVtYmVyO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2FjdGlvbkRpbTogbnVtYmVyO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3JuZzogKCkgPT4gbnVtYmVyO1xuXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKG9wdHM6IHtcbiAgICAgICAgcm9sbG91dDogUm9sbG91dE5vZGU7XG4gICAgICAgIG9iamVjdGl2ZTogT2JqZWN0aXZlTm9kZTtcbiAgICAgICAgc2FtcGxlcjogQWN0aW9uU2FtcGxlckZuO1xuICAgICAgICBudW1DYW5kaWRhdGVzOiBudW1iZXI7XG4gICAgICAgIGhvcml6b246IG51bWJlcjtcbiAgICAgICAgc3RhdGVEaW06IG51bWJlcjtcbiAgICAgICAgYWN0aW9uRGltOiBudW1iZXI7XG4gICAgICAgIHJuZz86ICgpID0+IG51bWJlcjtcbiAgICB9KSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX3JvbGxvdXQgPSBvcHRzLnJvbGxvdXQ7XG4gICAgICAgIHRoaXMuX29iamVjdGl2ZSA9IG9wdHMub2JqZWN0aXZlO1xuICAgICAgICB0aGlzLl9zYW1wbGVyID0gb3B0cy5zYW1wbGVyO1xuICAgICAgICB0aGlzLl9udW1DYW5kaWRhdGVzID0gb3B0cy5udW1DYW5kaWRhdGVzO1xuICAgICAgICB0aGlzLl9ob3Jpem9uID0gb3B0cy5ob3Jpem9uO1xuICAgICAgICB0aGlzLl9hY3Rpb25EaW0gPSBvcHRzLmFjdGlvbkRpbTtcbiAgICAgICAgdGhpcy5fcm5nID0gb3B0cy5ybmcgPz8gTWF0aC5yYW5kb207XG4gICAgICAgIC8vIHN0YXRlRGltIGlzIGFjY2VwdGVkIGZvciBBUEkgY29uc2lzdGVuY3kgYnV0IHRoZSBzZWxlY3RvciBkb2VzIG5vdCB1c2UgaXRcbiAgICAgICAgLy8gZGlyZWN0bHk7IGl0IGlzIGluZmVycmVkIGZyb20gdGhlIGluaXRpYWwgc3RhdGUgdGVuc29yIGF0IGV4ZWN1dGUgdGltZS5cbiAgICAgICAgdm9pZCBvcHRzLnN0YXRlRGltO1xuICAgICAgICB0aGlzLm91dHB1dFNoYXBlcyA9IFtbb3B0cy5hY3Rpb25EaW1dLCBbMV0sIFtvcHRzLm51bUNhbmRpZGF0ZXNdXTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XG4gICAgICAgIGNvbnN0IGluaXRpYWxTdGF0ZSA9IGlucHV0c1swXTtcblxuICAgICAgICBsZXQgYmVzdENvc3QgPSBJbmZpbml0eTtcbiAgICAgICAgbGV0IGJlc3RBY3Rpb25zOiBGbG9hdDMyQXJyYXkgfCBudWxsID0gbnVsbDtcbiAgICAgICAgY29uc3QgYWxsQ29zdHMgPSBuZXcgRmxvYXQzMkFycmF5KHRoaXMuX251bUNhbmRpZGF0ZXMpO1xuXG4gICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgdGhpcy5fbnVtQ2FuZGlkYXRlczsgaysrKSB7XG4gICAgICAgICAgICBjb25zdCBhY3Rpb25zID0gdGhpcy5fc2FtcGxlcih0aGlzLl9ob3Jpem9uLCB0aGlzLl9hY3Rpb25EaW0sIHRoaXMuX3JuZyk7XG4gICAgICAgICAgICBjb25zdCBhY3Rpb25zVGVuc29yOiBJVGVuc29yID0ge1xuICAgICAgICAgICAgICAgIGRhdGE6IGFjdGlvbnMsXG4gICAgICAgICAgICAgICAgc2hhcGU6IFt0aGlzLl9ob3Jpem9uLCB0aGlzLl9hY3Rpb25EaW1dLFxuICAgICAgICAgICAgICAgIG5hbWU6IFwiYWN0aW9uc1wiLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgW3RyYWplY3RvcnldID0gdGhpcy5fcm9sbG91dC5leGVjdXRlKFtpbml0aWFsU3RhdGUsIGFjdGlvbnNUZW5zb3JdKTtcbiAgICAgICAgICAgIGNvbnN0IFtjb3N0VGVuc29yXSA9IHRoaXMuX29iamVjdGl2ZS5leGVjdXRlKFt0cmFqZWN0b3J5LCBhY3Rpb25zVGVuc29yXSk7XG4gICAgICAgICAgICBjb25zdCBjb3N0ID0gY29zdFRlbnNvci5kYXRhWzBdO1xuICAgICAgICAgICAgYWxsQ29zdHNba10gPSBjb3N0O1xuXG4gICAgICAgICAgICBpZiAoY29zdCA8IGJlc3RDb3N0KSB7XG4gICAgICAgICAgICAgICAgYmVzdENvc3QgPSBjb3N0O1xuICAgICAgICAgICAgICAgIGJlc3RBY3Rpb25zID0gYWN0aW9ucztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZpcnN0QWN0aW9uID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLl9hY3Rpb25EaW0pO1xuICAgICAgICBpZiAoYmVzdEFjdGlvbnMpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhpcy5fYWN0aW9uRGltOyBqKyspIGZpcnN0QWN0aW9uW2pdID0gYmVzdEFjdGlvbnNbal07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgeyBkYXRhOiBmaXJzdEFjdGlvbiwgc2hhcGU6IFt0aGlzLl9hY3Rpb25EaW1dLCBuYW1lOiBcImJlc3RfYWN0aW9uXCIgfSxcbiAgICAgICAgICAgIHsgZGF0YTogbmV3IEZsb2F0MzJBcnJheShbYmVzdENvc3RdKSwgc2hhcGU6IFsxXSwgbmFtZTogXCJiZXN0X2Nvc3RcIiB9LFxuICAgICAgICAgICAgeyBkYXRhOiBhbGxDb3N0cywgc2hhcGU6IFt0aGlzLl9udW1DYW5kaWRhdGVzXSwgbmFtZTogXCJhbGxfY29zdHNcIiB9LFxuICAgICAgICBdO1xuICAgIH1cbn1cblxuLy8g4pSA4pSA4pSAIEJ1aWx0LWluIHNhbXBsZXJzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4vKipcbiAqIFVuaWZvcm0gcmFuZG9tIGRpc2NyZXRlIGFjdGlvbiBzZXF1ZW5jZSBzYW1wbGVyLlxuICpcbiAqIFByb2R1Y2VzIG9uZS1ob3QgZW5jb2RlZCBhY3Rpb25zIG92ZXIgYG51bUFjdGlvbnNgIGNhdGVnb3JpZXMuXG4gKiBVc2VmdWwgZm9yIGRpc2NyZXRlIGFjdGlvbiBzcGFjZXMgbGlrZSBzY3J1YmJlci1vZmYvbG93L21lZGl1bS9oaWdoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZURpc2NyZXRlT25lSG90U2FtcGxlcihudW1BY3Rpb25zOiBudW1iZXIpOiBBY3Rpb25TYW1wbGVyRm4ge1xuICAgIHJldHVybiAoaG9yaXpvbiwgYWN0aW9uRGltLCBybmcpID0+IHtcbiAgICAgICAgaWYgKGFjdGlvbkRpbSAhPT0gbnVtQWN0aW9ucykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBhY3Rpb25EaW0gKCR7YWN0aW9uRGltfSkgbXVzdCBtYXRjaCBudW1BY3Rpb25zICgke251bUFjdGlvbnN9KSBmb3Igb25lLWhvdCBzYW1wbGVyYCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShob3Jpem9uICogYWN0aW9uRGltKTtcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCBob3Jpem9uOyB0KyspIHtcbiAgICAgICAgICAgIGNvbnN0IGNob2ljZSA9IE1hdGguZmxvb3Iocm5nKCkgKiBudW1BY3Rpb25zKTtcbiAgICAgICAgICAgIG91dFt0ICogYWN0aW9uRGltICsgY2hvaWNlXSA9IDEuMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG59XG5cbi8qKlxuICogUGllY2V3aXNlIGNvbnN0YW50IHNhbXBsZXI6IGhvbGRzIGEgcmFuZG9tIGFjdGlvbiBmb3IgYSByYW5kb20gZHVyYXRpb24sXG4gKiB0aGVuIHBpY2tzIGEgbmV3IG9uZS4gUHJvZHVjZXMgc21vb3RoZXIgdHJhamVjdG9yaWVzIHRoYW4gcGVyLXN0ZXAgcmFuZG9tLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZVBpZWNld2lzZUNvbnN0YW50U2FtcGxlcihcbiAgICBudW1BY3Rpb25zOiBudW1iZXIsXG4gICAgbWluU2VnbWVudDogbnVtYmVyID0gMyxcbiAgICBtYXhTZWdtZW50OiBudW1iZXIgPSAxNSxcbik6IEFjdGlvblNhbXBsZXJGbiB7XG4gICAgcmV0dXJuIChob3Jpem9uLCBhY3Rpb25EaW0sIHJuZykgPT4ge1xuICAgICAgICBpZiAoYWN0aW9uRGltICE9PSBudW1BY3Rpb25zKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGFjdGlvbkRpbSAoJHthY3Rpb25EaW19KSBtdXN0IG1hdGNoIG51bUFjdGlvbnMgKCR7bnVtQWN0aW9uc30pYCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShob3Jpem9uICogYWN0aW9uRGltKTtcbiAgICAgICAgbGV0IHQgPSAwO1xuICAgICAgICB3aGlsZSAodCA8IGhvcml6b24pIHtcbiAgICAgICAgICAgIGNvbnN0IHNlZ0xlbiA9IG1pblNlZ21lbnQgKyBNYXRoLmZsb29yKHJuZygpICogKG1heFNlZ21lbnQgLSBtaW5TZWdtZW50ICsgMSkpO1xuICAgICAgICAgICAgY29uc3QgY2hvaWNlID0gTWF0aC5mbG9vcihybmcoKSAqIG51bUFjdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgZW5kID0gTWF0aC5taW4odCArIHNlZ0xlbiwgaG9yaXpvbik7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gdDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgb3V0W2kgKiBhY3Rpb25EaW0gKyBjaG9pY2VdID0gMS4wO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdCA9IGVuZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG59XG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIENubk5vZGUgOiBnZW5lcmljIHdyYXBwZXIgZm9yIENOTiBpbmZlcmVuY2Vcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5pbXBvcnQgeyBJVGVuc29yIH0gZnJvbSBcIi4uL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xuaW1wb3J0IHsgQ29tcHV0ZU5vZGVCYXNlIH0gZnJvbSBcIi4uL2NvbXB1dGUubm9kZS5iYXNlXCI7XG5cbi8qKlxuICogQ05OIGluZmVyZW5jZSBub2RlIDogcnVucyBhIENOTiBldmFsdWF0b3IgYW5kIG91dHB1dHMgdGhlIHJlc3VsdC5cbiAqIFdyYXBzIGFueSBydW4oaW5wdXQ6IG51bWJlcltdKTogbnVtYmVyW10gZnVuY3Rpb24uXG4gKlxuICogVGhpcyBpcyBhIGdlbmVyaWMgd3JhcHBlcjogcGFzcyBpbiB0aGUgcnVuIGZ1bmN0aW9uIGZyb21cbiAqIGFueSBAc3Bpa3ktcGFuZGEvY29yZSBDTk4gcnVudGltZSAoQ25uSW5mZXJlbmNlUnVudGltZSwgZXRjLikuXG4gKi9cbmV4cG9ydCBjbGFzcyBDbm5Ob2RlIGV4dGVuZHMgQ29tcHV0ZU5vZGVCYXNlIHtcbiAgICBwdWJsaWMgcmVhZG9ubHkgbm9kZVR5cGU6IHN0cmluZztcbiAgICBwdWJsaWMgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdO1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSBfZXZhbHVhdGU6IChpbnB1dDogbnVtYmVyW10pID0+IG51bWJlcltdO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX291dHB1dE5hbWU6IHN0cmluZztcblxuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBub2RlVHlwZTogc3RyaW5nLFxuICAgICAgICBvdXRwdXRTaXplOiBudW1iZXIsXG4gICAgICAgIGV2YWx1YXRlOiAoaW5wdXQ6IG51bWJlcltdKSA9PiBudW1iZXJbXSxcbiAgICAgICAgb3V0cHV0TmFtZTogc3RyaW5nID0gXCJvdXRwdXRcIlxuICAgICkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmlkID0gbm9kZVR5cGU7XG4gICAgICAgIHRoaXMubm9kZVR5cGUgPSBub2RlVHlwZTtcbiAgICAgICAgdGhpcy5fZXZhbHVhdGUgPSBldmFsdWF0ZTtcbiAgICAgICAgdGhpcy5fb3V0cHV0TmFtZSA9IG91dHB1dE5hbWU7XG4gICAgICAgIHRoaXMub3V0cHV0U2hhcGVzID0gW1tvdXRwdXRTaXplXV07XG4gICAgfVxuXG4gICAgcHVibGljIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xuICAgICAgICAvLyBDb25jYXRlbmF0ZSBhbGwgaW5wdXQgdGVuc29ycyBpbnRvIGEgc2luZ2xlIGZsYXQgYXJyYXlcbiAgICAgICAgbGV0IHRvdGFsTGVuID0gMDtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIGlucHV0cykgdG90YWxMZW4gKz0gdC5kYXRhLmxlbmd0aDtcblxuICAgICAgICBjb25zdCBmbGF0ID0gbmV3IEZsb2F0MzJBcnJheSh0b3RhbExlbik7XG4gICAgICAgIGxldCBvZmZzZXQgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IHQgb2YgaW5wdXRzKSB7XG4gICAgICAgICAgICBmbGF0LnNldCh0LmRhdGEsIG9mZnNldCk7XG4gICAgICAgICAgICBvZmZzZXQgKz0gdC5kYXRhLmxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2V2YWx1YXRlKEFycmF5LmZyb20oZmxhdCkpO1xuICAgICAgICByZXR1cm4gW3sgZGF0YTogbmV3IEZsb2F0MzJBcnJheShyZXN1bHQpLCBzaGFwZTogW3Jlc3VsdC5sZW5ndGhdLCBuYW1lOiB0aGlzLl9vdXRwdXROYW1lIH1dO1xuICAgIH1cbn1cbiIsIi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gQ29uY2F0Tm9kZSA6IG1lcmdlcyBtdWx0aXBsZSBpbnB1dCB0ZW5zb3JzIGludG8gb25lIGZsYXQgdmVjdG9yXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuaW1wb3J0IHsgSVRlbnNvciB9IGZyb20gXCIuLi9jb21wdXRlLmludGVyZmFjZXNcIjtcbmltcG9ydCB7IENvbXB1dGVOb2RlQmFzZSB9IGZyb20gXCIuLi9jb21wdXRlLm5vZGUuYmFzZVwiO1xuXG4vKipcbiAqIENvbmNhdGVuYXRpb24gbm9kZSA6IG1lcmdlcyBtdWx0aXBsZSBpbnB1dCB0ZW5zb3JzIGludG8gb25lIGZsYXQgdmVjdG9yLlxuICovXG5leHBvcnQgY2xhc3MgQ29uY2F0Tm9kZSBleHRlbmRzIENvbXB1dGVOb2RlQmFzZSB7XG4gICAgcHVibGljIHJlYWRvbmx5IG5vZGVUeXBlID0gXCJjb25jYXRcIjtcbiAgICBwdWJsaWMgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdO1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSBfdG90YWxTaXplOiBudW1iZXI7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3V0cHV0TmFtZTogc3RyaW5nO1xuXG4gICAgY29uc3RydWN0b3IoaW5wdXRTaXplczogbnVtYmVyW10sIG91dHB1dE5hbWU6IHN0cmluZyA9IFwiY29uY2F0XCIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5pZCA9IG91dHB1dE5hbWU7XG4gICAgICAgIHRoaXMuX3RvdGFsU2l6ZSA9IGlucHV0U2l6ZXMucmVkdWNlKChhLCBiKSA9PiBhICsgYiwgMCk7XG4gICAgICAgIHRoaXMuX291dHB1dE5hbWUgPSBvdXRwdXROYW1lO1xuICAgICAgICB0aGlzLm91dHB1dFNoYXBlcyA9IFtbdGhpcy5fdG90YWxTaXplXV07XG4gICAgfVxuXG4gICAgcHVibGljIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xuICAgICAgICBjb25zdCBmbGF0ID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLl90b3RhbFNpemUpO1xuICAgICAgICBsZXQgb2Zmc2V0ID0gMDtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIGlucHV0cykge1xuICAgICAgICAgICAgZmxhdC5zZXQodC5kYXRhLCBvZmZzZXQpO1xuICAgICAgICAgICAgb2Zmc2V0ICs9IHQuZGF0YS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFt7IGRhdGE6IGZsYXQsIHNoYXBlOiBbdGhpcy5fdG90YWxTaXplXSwgbmFtZTogdGhpcy5fb3V0cHV0TmFtZSB9XTtcbiAgICB9XG59XG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIEV4dGVybmFsSW5wdXROb2RlIDogbmFtZWQgaW5qZWN0aW9uIHBvaW50IGZvciBydW50aW1lIGRhdGFcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5pbXBvcnQgeyBJVGVuc29yIH0gZnJvbSBcIi4uL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xuaW1wb3J0IHsgQ29tcHV0ZU5vZGVCYXNlIH0gZnJvbSBcIi4uL2NvbXB1dGUubm9kZS5iYXNlXCI7XG5cbi8qKlxuICogRXh0ZXJuYWwgaW5wdXQgbm9kZSA6IHJlY2VpdmVzIHRlbnNvcnMgZnJvbSB0aGUgZ3JhcGgncyBydW4oKSBjYWxsLlxuICogQWN0cyBhcyBhIG5hbWVkIGluamVjdGlvbiBwb2ludCBmb3Igc2Vuc29yIGRhdGEsIHBvc2UsIGdvYWwsIGV0Yy5cbiAqL1xuZXhwb3J0IGNsYXNzIEV4dGVybmFsSW5wdXROb2RlIGV4dGVuZHMgQ29tcHV0ZU5vZGVCYXNlIHtcbiAgICBwdWJsaWMgcmVhZG9ubHkgbm9kZVR5cGUgPSBcImV4dGVybmFsX2lucHV0XCI7XG4gICAgcHVibGljIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXTtcblxuICAgIHByaXZhdGUgX3NoYXBlOiBudW1iZXJbXTtcbiAgICBwcml2YXRlIF9uYW1lOiBzdHJpbmc7XG5cbiAgICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIHNoYXBlOiBudW1iZXJbXSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmlkID0gbmFtZTtcbiAgICAgICAgdGhpcy5fbmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMuX3NoYXBlID0gc2hhcGU7XG4gICAgICAgIHRoaXMub3V0cHV0U2hhcGVzID0gW3NoYXBlXTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XG4gICAgICAgIC8vIEV4dGVybmFsIGlucHV0cyBhcmUgaW5qZWN0ZWQgYnkgdGhlIGdyYXBoIGVuZ2luZSB2aWEgcnVuKClcbiAgICAgICAgaWYgKGlucHV0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gW3sgLi4uaW5wdXRzWzBdLCBuYW1lOiB0aGlzLl9uYW1lIH1dO1xuICAgICAgICB9XG4gICAgICAgIC8vIFJldHVybiB6ZXJvcyBpZiBubyBpbnB1dCBwcm92aWRlZFxuICAgICAgICBjb25zdCBzaXplID0gdGhpcy5fc2hhcGUucmVkdWNlKChhLCBiKSA9PiBhICogYiwgMSk7XG4gICAgICAgIHJldHVybiBbeyBkYXRhOiBuZXcgRmxvYXQzMkFycmF5KHNpemUpLCBzaGFwZTogdGhpcy5fc2hhcGUsIG5hbWU6IHRoaXMuX25hbWUgfV07XG4gICAgfVxufVxuIiwiZXhwb3J0ICogZnJvbSBcIi4vZXh0ZXJuYWwtaW5wdXQubm9kZVwiO1xuZXhwb3J0ICogZnJvbSBcIi4vbWxwLm5vZGVcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2Nubi5ub2RlXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9ybm4ubm9kZVwiO1xuZXhwb3J0ICogZnJvbSBcIi4vY29uY2F0Lm5vZGVcIjtcbiIsIi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gTUxQTm9kZSA6IGdlbmVyaWMgd3JhcHBlciBmb3IgTUxQIGluZmVyZW5jZVxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5cbmltcG9ydCB7IElUZW5zb3IgfSBmcm9tIFwiLi4vY29tcHV0ZS5pbnRlcmZhY2VzXCI7XG5pbXBvcnQgeyBDb21wdXRlTm9kZUJhc2UgfSBmcm9tIFwiLi4vY29tcHV0ZS5ub2RlLmJhc2VcIjtcblxuLyoqXG4gKiBNTFAgaW5mZXJlbmNlIG5vZGUgOiBydW5zIGFuIE1MUCBldmFsdWF0b3IgYW5kIG91dHB1dHMgdGhlIHJlc3VsdC5cbiAqIFdyYXBzIGFueSBldmFsdWF0ZShpbnB1dDogbnVtYmVyW10pOiBudW1iZXJbXSBmdW5jdGlvbi5cbiAqXG4gKiBUaGlzIGlzIGEgZ2VuZXJpYyB3cmFwcGVyOiBwYXNzIGluIHRoZSBldmFsdWF0ZSBmdW5jdGlvbiBmcm9tXG4gKiBhbnkgQHNwaWt5LXBhbmRhL2NvcmUgTUxQIHJ1bnRpbWUgKE1MUEluZmVyZW5jZVJ1bnRpbWUsIGV0Yy4pLlxuICovXG5leHBvcnQgY2xhc3MgTUxQTm9kZSBleHRlbmRzIENvbXB1dGVOb2RlQmFzZSB7XG4gICAgcHVibGljIHJlYWRvbmx5IG5vZGVUeXBlOiBzdHJpbmc7XG4gICAgcHVibGljIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXTtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX2V2YWx1YXRlOiAoaW5wdXQ6IG51bWJlcltdKSA9PiBudW1iZXJbXTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9vdXRwdXROYW1lOiBzdHJpbmc7XG5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgbm9kZVR5cGU6IHN0cmluZyxcbiAgICAgICAgX2lucHV0U2l6ZTogbnVtYmVyLFxuICAgICAgICBvdXRwdXRTaXplOiBudW1iZXIsXG4gICAgICAgIGV2YWx1YXRlOiAoaW5wdXQ6IG51bWJlcltdKSA9PiBudW1iZXJbXSxcbiAgICAgICAgb3V0cHV0TmFtZTogc3RyaW5nID0gXCJvdXRwdXRcIlxuICAgICkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmlkID0gbm9kZVR5cGU7XG4gICAgICAgIHRoaXMubm9kZVR5cGUgPSBub2RlVHlwZTtcbiAgICAgICAgdGhpcy5fZXZhbHVhdGUgPSBldmFsdWF0ZTtcbiAgICAgICAgdGhpcy5fb3V0cHV0TmFtZSA9IG91dHB1dE5hbWU7XG4gICAgICAgIHRoaXMub3V0cHV0U2hhcGVzID0gW1tvdXRwdXRTaXplXV07XG4gICAgfVxuXG4gICAgcHVibGljIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xuICAgICAgICAvLyBDb25jYXRlbmF0ZSBhbGwgaW5wdXQgdGVuc29ycyBpbnRvIGEgc2luZ2xlIGZsYXQgYXJyYXlcbiAgICAgICAgbGV0IHRvdGFsTGVuID0gMDtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIGlucHV0cykgdG90YWxMZW4gKz0gdC5kYXRhLmxlbmd0aDtcblxuICAgICAgICBjb25zdCBmbGF0ID0gbmV3IEZsb2F0MzJBcnJheSh0b3RhbExlbik7XG4gICAgICAgIGxldCBvZmZzZXQgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IHQgb2YgaW5wdXRzKSB7XG4gICAgICAgICAgICBmbGF0LnNldCh0LmRhdGEsIG9mZnNldCk7XG4gICAgICAgICAgICBvZmZzZXQgKz0gdC5kYXRhLmxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2V2YWx1YXRlKEFycmF5LmZyb20oZmxhdCkpO1xuICAgICAgICByZXR1cm4gW3sgZGF0YTogbmV3IEZsb2F0MzJBcnJheShyZXN1bHQpLCBzaGFwZTogW3Jlc3VsdC5sZW5ndGhdLCBuYW1lOiB0aGlzLl9vdXRwdXROYW1lIH1dO1xuICAgIH1cbn1cbiIsIi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gUm5uTm9kZSA6IGdlbmVyaWMgd3JhcHBlciBmb3IgUk5OIGluZmVyZW5jZSAoc2luZ2xlIHRpbWVzdGVwKVxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5cbmltcG9ydCB7IElUZW5zb3IgfSBmcm9tIFwiLi4vY29tcHV0ZS5pbnRlcmZhY2VzXCI7XG5pbXBvcnQgeyBDb21wdXRlTm9kZUJhc2UgfSBmcm9tIFwiLi4vY29tcHV0ZS5ub2RlLmJhc2VcIjtcblxuLyoqXG4gKiBSTk4gaW5mZXJlbmNlIG5vZGUgOiBydW5zIGEgc2luZ2xlIHRpbWVzdGVwIHRocm91Z2ggYW4gUk5OIGV2YWx1YXRvci5cbiAqIFdyYXBzIGFueSBzdGVwKGlucHV0OiBudW1iZXJbXSk6IG51bWJlcltdIGZ1bmN0aW9uLlxuICpcbiAqIFRoaXMgaXMgYSBnZW5lcmljIHdyYXBwZXI6IHBhc3MgaW4gdGhlIHN0ZXAgZnVuY3Rpb24gZnJvbVxuICogYW55IEBzcGlreS1wYW5kYS9jb3JlIFJOTiBydW50aW1lIChSbm5JbmZlcmVuY2VSdW50aW1lLCBldGMuKS5cbiAqXG4gKiBUaGUgUk5OIG1haW50YWlucyBoaWRkZW4gc3RhdGUgYWNyb3NzIGNhbGxzIGludGVybmFsbHksXG4gKiBzbyBlYWNoIGV4ZWN1dGUoKSBhZHZhbmNlcyBvbmUgdGltZXN0ZXAuXG4gKi9cbmV4cG9ydCBjbGFzcyBSbm5Ob2RlIGV4dGVuZHMgQ29tcHV0ZU5vZGVCYXNlIHtcbiAgICBwdWJsaWMgcmVhZG9ubHkgbm9kZVR5cGU6IHN0cmluZztcbiAgICBwdWJsaWMgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdO1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RlcDogKGlucHV0OiBudW1iZXJbXSkgPT4gbnVtYmVyW107XG4gICAgcHJpdmF0ZSByZWFkb25seSBfb3V0cHV0TmFtZTogc3RyaW5nO1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIG5vZGVUeXBlOiBzdHJpbmcsXG4gICAgICAgIG91dHB1dFNpemU6IG51bWJlcixcbiAgICAgICAgc3RlcDogKGlucHV0OiBudW1iZXJbXSkgPT4gbnVtYmVyW10sXG4gICAgICAgIG91dHB1dE5hbWU6IHN0cmluZyA9IFwib3V0cHV0XCJcbiAgICApIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5pZCA9IG5vZGVUeXBlO1xuICAgICAgICB0aGlzLm5vZGVUeXBlID0gbm9kZVR5cGU7XG4gICAgICAgIHRoaXMuX3N0ZXAgPSBzdGVwO1xuICAgICAgICB0aGlzLl9vdXRwdXROYW1lID0gb3V0cHV0TmFtZTtcbiAgICAgICAgdGhpcy5vdXRwdXRTaGFwZXMgPSBbW291dHB1dFNpemVdXTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XG4gICAgICAgIC8vIENvbmNhdGVuYXRlIGFsbCBpbnB1dCB0ZW5zb3JzIGludG8gYSBzaW5nbGUgZmxhdCBhcnJheVxuICAgICAgICBsZXQgdG90YWxMZW4gPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IHQgb2YgaW5wdXRzKSB0b3RhbExlbiArPSB0LmRhdGEubGVuZ3RoO1xuXG4gICAgICAgIGNvbnN0IGZsYXQgPSBuZXcgRmxvYXQzMkFycmF5KHRvdGFsTGVuKTtcbiAgICAgICAgbGV0IG9mZnNldCA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgdCBvZiBpbnB1dHMpIHtcbiAgICAgICAgICAgIGZsYXQuc2V0KHQuZGF0YSwgb2Zmc2V0KTtcbiAgICAgICAgICAgIG9mZnNldCArPSB0LmRhdGEubGVuZ3RoO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fc3RlcChBcnJheS5mcm9tKGZsYXQpKTtcbiAgICAgICAgcmV0dXJuIFt7IGRhdGE6IG5ldyBGbG9hdDMyQXJyYXkocmVzdWx0KSwgc2hhcGU6IFtyZXN1bHQubGVuZ3RoXSwgbmFtZTogdGhpcy5fb3V0cHV0TmFtZSB9XTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBDb21wdXRlR3JhcGgsIERhdGFMaW5rIH0gZnJvbSBcIi4uL2NvbXB1dGUvY29tcHV0ZS5ncmFwaFwiO1xyXG5pbXBvcnQgeyBDb21wdXRlTm9kZUJhc2UgfSBmcm9tIFwiLi4vY29tcHV0ZS9jb21wdXRlLm5vZGUuYmFzZVwiO1xyXG5pbXBvcnQgdHlwZSB7IElDb21wdXRlTm9kZSwgSVRlbnNvciB9IGZyb20gXCIuLi9jb21wdXRlL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xyXG5pbXBvcnQgdHlwZSB7IE9ubnhQYXJzZVJlc3VsdCB9IGZyb20gXCIuL29ubngtcGFyc2VyXCI7XHJcbmltcG9ydCB0eXBlIHsgT25ueFZhbHVlSW5mbyB9IGZyb20gXCIuL29ubngtdHlwZXNcIjtcclxuaW1wb3J0IHR5cGUgeyBPbm54VGVuc29ySW5mbyB9IGZyb20gXCIuL29ubngtdHlwZXNcIjtcclxuaW1wb3J0IHsgT25ueE9wUmVnaXN0cnksIGdldEluaXRpYWxpemVyRGF0YSwgbWFrZVRlbnNvciB9IGZyb20gXCIuL3JlZ2lzdHJ5XCI7XHJcblxyXG4vKipcclxuICogU291cmNlIG5vZGUgdGhhdCBwcm92aWRlcyBhIGNvbnN0YW50IHRlbnNvciAoZnJvbSBhbiBPTk5YIGluaXRpYWxpemVyKS5cclxuICovXHJcbmNsYXNzIEluaXRpYWxpemVyTm9kZSBleHRlbmRzIENvbXB1dGVOb2RlQmFzZSB7XHJcbiAgICByZWFkb25seSBub2RlVHlwZSA9IFwib25ueF9pbml0aWFsaXplclwiO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0ZW5zb3I6IElUZW5zb3I7XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5pdDogT25ueFRlbnNvckluZm8pIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIGNvbnN0IGRhdGEgPSBnZXRJbml0aWFsaXplckRhdGEoaW5pdCk7XHJcbiAgICAgICAgdGhpcy50ZW5zb3IgPSBtYWtlVGVuc29yKGRhdGEsIFsuLi5pbml0LmRpbXNdLCBpbml0Lm5hbWUpO1xyXG4gICAgICAgIHRoaXMub3V0cHV0U2hhcGVzID0gW2luaXQuZGltc107XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZSgpOiBJVGVuc29yW10ge1xyXG4gICAgICAgIHJldHVybiBbdGhpcy50ZW5zb3JdO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogU291cmNlIG5vZGUgZm9yIGV4dGVybmFsIGdyYXBoIGlucHV0cy5cclxuICovXHJcbmNsYXNzIElucHV0Tm9kZSBleHRlbmRzIENvbXB1dGVOb2RlQmFzZSB7XHJcbiAgICByZWFkb25seSBub2RlVHlwZSA9IFwib25ueF9pbnB1dFwiO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdO1xyXG4gICAgcmVhZG9ubHkgaW5wdXROYW1lOiBzdHJpbmc7XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBzaGFwZTogbnVtYmVyW10pIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuaWQgPSBuYW1lO1xyXG4gICAgICAgIHRoaXMuaW5wdXROYW1lID0gbmFtZTtcclxuICAgICAgICAvLyBSZXBsYWNlIGR5bmFtaWMgZGltcyAoMCkgd2l0aCAxIGZvciBpbmZlcmVuY2VcclxuICAgICAgICB0aGlzLm91dHB1dFNoYXBlcyA9IFtzaGFwZS5tYXAoKGQpID0+IChkIDw9IDAgPyAxIDogZCkpXTtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBpZiAoaW5wdXRzLmxlbmd0aCA+IDAgJiYgaW5wdXRzWzBdKSByZXR1cm4gW2lucHV0c1swXV07XHJcbiAgICAgICAgY29uc3Qgc3ogPSB0aGlzLm91dHB1dFNoYXBlc1swXS5yZWR1Y2UoKGEsIGIpID0+IGEgKiBiLCAxKTtcclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShzeiksIFsuLi50aGlzLm91dHB1dFNoYXBlc1swXV0sIHRoaXMuaW5wdXROYW1lKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBCdWlsZHMgYSBydW5uYWJsZSBDb21wdXRlR3JhcGggZnJvbSBhbiBPbm54UGFyc2VSZXN1bHQgKyBvcCByZWdpc3RyeS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBPbm54R3JhcGhCdWlsZGVyIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmVnaXN0cnk6IE9ubnhPcFJlZ2lzdHJ5O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHJlZ2lzdHJ5OiBPbm54T3BSZWdpc3RyeSkge1xyXG4gICAgICAgIHRoaXMucmVnaXN0cnkgPSByZWdpc3RyeTtcclxuICAgIH1cclxuXHJcbiAgICBidWlsZChtb2RlbDogT25ueFBhcnNlUmVzdWx0KTogeyBncmFwaDogQ29tcHV0ZUdyYXBoOyBpbnB1dE5hbWVzOiBzdHJpbmdbXTsgb3V0cHV0TmFtZXM6IHN0cmluZ1tdIH0ge1xyXG4gICAgICAgIGNvbnN0IG5vZGVzOiBJQ29tcHV0ZU5vZGVbXSA9IFtdO1xyXG4gICAgICAgIGNvbnN0IGxpbmtzOiBEYXRhTGlua1tdID0gW107XHJcblxyXG4gICAgICAgIC8vIE1hcCB0ZW5zb3IgbmFtZSAtPiB0aGUgbm9kZSB0aGF0IHByb2R1Y2VzIGl0ICsgb3V0cHV0IGluZGV4XHJcbiAgICAgICAgY29uc3QgdGVuc29yUHJvZHVjZXIgPSBuZXcgTWFwPHN0cmluZywgeyBub2RlOiBJQ29tcHV0ZU5vZGU7IG91dHB1dEluZGV4OiBudW1iZXIgfT4oKTtcclxuXHJcbiAgICAgICAgLy8gTWFwIHRlbnNvciBuYW1lIC0+IGxpc3Qgb2YgY29uc3VtZXJzIChub2RlICsgaW5wdXQgaW5kZXgpXHJcbiAgICAgICAgY29uc3QgdGVuc29yQ29uc3VtZXJzOiB7IHRlbnNvck5hbWU6IHN0cmluZzsgbm9kZTogSUNvbXB1dGVOb2RlOyBpbnB1dEluZGV4OiBudW1iZXIgfVtdID0gW107XHJcblxyXG4gICAgICAgIC8vIEJ1aWxkIGluaXRpYWxpemVyIG1hcFxyXG4gICAgICAgIGNvbnN0IGluaXRNYXAgPSBuZXcgTWFwPHN0cmluZywgT25ueFRlbnNvckluZm8+KCk7XHJcbiAgICAgICAgZm9yIChjb25zdCBpbml0IG9mIG1vZGVsLmluaXRpYWxpemVycykge1xyXG4gICAgICAgICAgICBpbml0TWFwLnNldChpbml0Lm5hbWUsIGluaXQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlIGluaXRpYWxpemVyIG5vZGVzXHJcbiAgICAgICAgZm9yIChjb25zdCBpbml0IG9mIG1vZGVsLmluaXRpYWxpemVycykge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gbmV3IEluaXRpYWxpemVyTm9kZShpbml0KTtcclxuICAgICAgICAgICAgbm9kZXMucHVzaChub2RlKTtcclxuICAgICAgICAgICAgdGVuc29yUHJvZHVjZXIuc2V0KGluaXQubmFtZSwgeyBub2RlLCBvdXRwdXRJbmRleDogMCB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBpbnB1dCBub2RlcyAoc2tpcCBpbml0aWFsaXplcnMgdGhhdCBzaGFyZSBpbnB1dCBuYW1lcylcclxuICAgICAgICBjb25zdCBpbnB1dE5hbWVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgIGZvciAoY29uc3QgaW5wIG9mIG1vZGVsLmlucHV0cykge1xyXG4gICAgICAgICAgICBpZiAoaW5pdE1hcC5oYXMoaW5wLm5hbWUpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IG5ldyBJbnB1dE5vZGUoaW5wLm5hbWUsIGlucC5zaGFwZSk7XHJcbiAgICAgICAgICAgIG5vZGVzLnB1c2gobm9kZSk7XHJcbiAgICAgICAgICAgIHRlbnNvclByb2R1Y2VyLnNldChpbnAubmFtZSwgeyBub2RlLCBvdXRwdXRJbmRleDogMCB9KTtcclxuICAgICAgICAgICAgaW5wdXROYW1lcy5wdXNoKGlucC5uYW1lKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBvcGVyYXRvciBub2Rlc1xyXG4gICAgICAgIGZvciAoY29uc3Qgbm9kZUluZm8gb2YgbW9kZWwubm9kZXMpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLnJlZ2lzdHJ5Lmhhcyhub2RlSW5mby5vcFR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFNraXBwaW5nIHVuc3VwcG9ydGVkIE9OTlggb3A6ICR7bm9kZUluZm8ub3BUeXBlfWApO1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLnJlZ2lzdHJ5LmNyZWF0ZShub2RlSW5mbywgaW5pdE1hcCk7XHJcbiAgICAgICAgICAgIG5vZGVzLnB1c2gobm9kZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBSZWdpc3RlciBjb25zdW1lciBmb3IgZWFjaCBpbnB1dCB0ZW5zb3JcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlSW5mby5pbnB1dHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRlbnNvck5hbWUgPSBub2RlSW5mby5pbnB1dHNbaV07XHJcbiAgICAgICAgICAgICAgICBpZiAodGVuc29yTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRlbnNvckNvbnN1bWVycy5wdXNoKHsgdGVuc29yTmFtZSwgbm9kZSwgaW5wdXRJbmRleDogaSB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gUmVnaXN0ZXIgcHJvZHVjZXIgZm9yIGVhY2ggb3V0cHV0IHRlbnNvclxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVJbmZvLm91dHB1dHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRlbnNvck5hbWUgPSBub2RlSW5mby5vdXRwdXRzW2ldO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRlbnNvck5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0ZW5zb3JQcm9kdWNlci5zZXQodGVuc29yTmFtZSwgeyBub2RlLCBvdXRwdXRJbmRleDogaSB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gV2lyZSBsaW5rc1xyXG4gICAgICAgIGZvciAoY29uc3QgY29uc3VtZXIgb2YgdGVuc29yQ29uc3VtZXJzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb2R1Y2VyID0gdGVuc29yUHJvZHVjZXIuZ2V0KGNvbnN1bWVyLnRlbnNvck5hbWUpO1xyXG4gICAgICAgICAgICBpZiAoIXByb2R1Y2VyKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYE5vIHByb2R1Y2VyIGZvciB0ZW5zb3I6ICR7Y29uc3VtZXIudGVuc29yTmFtZX1gKTtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGxpbmsgPSBuZXcgRGF0YUxpbmsoXHJcbiAgICAgICAgICAgICAgICBwcm9kdWNlci5ub2RlIGFzIElDb21wdXRlTm9kZSxcclxuICAgICAgICAgICAgICAgIGNvbnN1bWVyLm5vZGUgYXMgSUNvbXB1dGVOb2RlLFxyXG4gICAgICAgICAgICAgICAgY29uc3VtZXIuaW5wdXRJbmRleCxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgbGlua3MucHVzaChsaW5rKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIElkZW50aWZ5IG91dHB1dCB0ZW5zb3IgbmFtZXNcclxuICAgICAgICBjb25zdCBvdXRwdXROYW1lcyA9IG1vZGVsLm91dHB1dHMubWFwKChvOiBPbm54VmFsdWVJbmZvKSA9PiBvLm5hbWUpO1xyXG5cclxuICAgICAgICBjb25zdCBncmFwaCA9IG5ldyBDb21wdXRlR3JhcGgobm9kZXMsIGxpbmtzKTtcclxuICAgICAgICByZXR1cm4geyBncmFwaCwgaW5wdXROYW1lcywgb3V0cHV0TmFtZXMgfTtcclxuICAgIH1cclxufVxyXG4iLCJleHBvcnQgKiBmcm9tIFwiLi9wYi9pbmRleFwiO1xyXG5leHBvcnQgKiBmcm9tIFwiLi9vbm54LXR5cGVzXCI7XHJcbmV4cG9ydCAqIGZyb20gXCIuL29ubngtcGFyc2VyXCI7XHJcbmV4cG9ydCAqIGZyb20gXCIuL29ubngtd3JpdGVyXCI7XHJcbmV4cG9ydCAqIGZyb20gXCIuL3JlZ2lzdHJ5XCI7XHJcbmV4cG9ydCB7IE9ubnhHcmFwaEJ1aWxkZXIgfSBmcm9tIFwiLi9ncmFwaC1idWlsZGVyXCI7XHJcbmV4cG9ydCAqIGZyb20gXCIuL29wcy9pbmRleFwiO1xyXG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcclxuLy8gT05OWCBtb2RlbCBwYXJzZXJcclxuLy9cclxuLy8gUG9ydGVkIGZyb20gQ3lhbk15Y2VsaXVtOjpPbm54R3JhcGhCdWlsZGVyIChDKysgaW1wbGVtZW50YXRpb24pLlxyXG4vLyBQYXJzZXMgYW4gT05OWCBwcm90b2J1ZiBiaW5hcnkgaW50byBzdHJ1Y3R1cmVkIFR5cGVTY3JpcHQgb2JqZWN0c1xyXG4vLyAoT25ueE5vZGVJbmZvLCBPbm54VGVuc29ySW5mbywgT25ueFZhbHVlSW5mbykgdGhhdCBjYW4gdGhlbiBiZSB1c2VkXHJcbi8vIHRvIGJ1aWxkIGEgU3Bpa3lQYW5kYSBDb21wdXRlR3JhcGguXHJcbi8vXHJcbi8vIFplcm8gZGVwZW5kZW5jaWVzIGJleW9uZCB0aGUgbG9jYWwgcGIvIHJlYWRlciBhbmQgb25ueC10eXBlcy5cclxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcblxyXG5pbXBvcnQgeyBQQlJlYWRlciB9IGZyb20gXCIuL3BiL3JlYWRlclwiO1xyXG5pbXBvcnQgeyBNZW1vcnlTdHJlYW0gfSBmcm9tIFwiLi9wYi9zdHJlYW1cIjtcclxuaW1wb3J0IHsgV2lyZVR5cGUgfSBmcm9tIFwiLi9wYi9yZWFkZXJcIjtcclxuaW1wb3J0IHtcclxuICAgIE9ubnhEYXRhVHlwZSxcclxuICAgIE9ubnhMaW5rVHlwZSxcclxuICAgIE9ubnhOb2RlSW5mbyxcclxuICAgIE9ubnhUZW5zb3JJbmZvLFxyXG4gICAgT25ueFZhbHVlSW5mbyxcclxuICAgIEtFWV9NQVhfTEVOR1RILFxyXG4gICAgVEVOU09SX01BWF9ESU1FTlNJT04sXHJcbiAgICAvLyBNb2RlbFByb3RvIGZpZWxkc1xyXG4gICAgTU9ERUxfSVJfVkVSU0lPTixcclxuICAgIE1PREVMX0dSQVBILFxyXG4gICAgLy8gR3JhcGhQcm90byBmaWVsZHNcclxuICAgIEdSQVBIX05PREUsXHJcbiAgICBHUkFQSF9OQU1FLFxyXG4gICAgR1JBUEhfSU5JVElBTElaRVIsXHJcbiAgICBHUkFQSF9JTlBVVCxcclxuICAgIEdSQVBIX09VVFBVVCxcclxuICAgIEdSQVBIX1ZBTFVFX0lORk8sXHJcbiAgICAvLyBOb2RlUHJvdG8gZmllbGRzXHJcbiAgICBOT0RFX0lOUFVULFxyXG4gICAgTk9ERV9PVVRQVVQsXHJcbiAgICBOT0RFX05BTUUsXHJcbiAgICBOT0RFX09QX1RZUEUsXHJcbiAgICBOT0RFX0FUVFJJQlVURSxcclxuICAgIC8vIEF0dHJpYnV0ZVByb3RvIGZpZWxkc1xyXG4gICAgQVRUX05BTUUsXHJcbiAgICBBVFRfRkxPQVQsXHJcbiAgICBBVFRfSU5ULFxyXG4gICAgQVRUX1RFTlNPUixcclxuICAgIEFUVF9GTE9BVFMsXHJcbiAgICBBVFRfSU5UUyxcclxuICAgIC8vIFZhbHVlSW5mb1Byb3RvIGZpZWxkc1xyXG4gICAgVklORk9fTkFNRSxcclxuICAgIFZJTkZPX1RZUEUsXHJcbiAgICAvLyBUeXBlUHJvdG8gZmllbGRzXHJcbiAgICBUWVBFX1RFTlNPUixcclxuICAgIC8vIFRlbnNvclR5cGVQcm90byBmaWVsZHNcclxuICAgIFRFTlNPUl9UWVBFX0VMRU1fVFlQRSxcclxuICAgIFRFTlNPUl9UWVBFX1NIQVBFLFxyXG4gICAgLy8gU2hhcGUgZmllbGRzXHJcbiAgICBTSEFQRV9ESU0sXHJcbiAgICBESU1fVkFMVUUsXHJcbiAgICBESU1fU1lNQk9MLFxyXG4gICAgLy8gVGVuc29yUHJvdG8gZmllbGRzXHJcbiAgICBURU5TT1JfRElNUyxcclxuICAgIFRFTlNPUl9EQVRBX1RZUEUsXHJcbiAgICBURU5TT1JfRkxPQVRfREFUQSxcclxuICAgIFRFTlNPUl9OQU1FLFxyXG4gICAgVEVOU09SX1JBV19EQVRBLFxyXG59IGZyb20gXCIuL29ubngtdHlwZXNcIjtcclxuXHJcbi8vIOKUgOKUgOKUgCBFcnJvciBjb2RlcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbmV4cG9ydCBjb25zdCBPTk5YX1NVQ0NFU1MgPSAwO1xyXG5leHBvcnQgY29uc3QgT05OWF9VTlNVUFBPUlRFRF9OT0RFID0gMTAwO1xyXG5leHBvcnQgY29uc3QgT05OWF9VTlNVUFBPUlRFRF9BVFRSSUJVVEUgPSAxMDE7XHJcbmV4cG9ydCBjb25zdCBPTk5YX1VOU1VQUE9SVEVEX1RFTlNPUl9EQVRBX1RZUEUgPSAxMTA7XHJcbmV4cG9ydCBjb25zdCBPTk5YX1VOU1VQUE9SVEVEX1RFTlNPUl9ESU0gPSAxMTE7XHJcbmV4cG9ydCBjb25zdCBPTk5YX0lOVkFMSURfSU5JVElBTElaRVJfU0hBUEUgPSAxMTM7XHJcbmV4cG9ydCBjb25zdCBPTk5YX1JFQURfRVJST1IgPSAyMDA7XHJcbmV4cG9ydCBjb25zdCBPTk5YX1NZU1RFTV9FUlJPUiA9IDMwMDtcclxuXHJcbi8vIOKUgOKUgOKUgCBQYXJzZSByZXN1bHQg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4vKipcclxuICogVGhlIHJlc3VsdCBvZiBwYXJzaW5nIGFuIE9OTlggbW9kZWwuXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIE9ubnhQYXJzZVJlc3VsdCB7XHJcbiAgICBpclZlcnNpb246IG51bWJlcjtcclxuICAgIGdyYXBoTmFtZTogc3RyaW5nO1xyXG4gICAgbm9kZXM6IE9ubnhOb2RlSW5mb1tdO1xyXG4gICAgaW5pdGlhbGl6ZXJzOiBPbm54VGVuc29ySW5mb1tdO1xyXG4gICAgaW5wdXRzOiBPbm54VmFsdWVJbmZvW107XHJcbiAgICBvdXRwdXRzOiBPbm54VmFsdWVJbmZvW107XHJcbiAgICB2YWx1ZUluZm9zOiBPbm54VmFsdWVJbmZvW107XHJcbn1cclxuXHJcbi8vIOKUgOKUgOKUgCBPbm54UGFyc2VyIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuLyoqXHJcbiAqIFBhcnNlcyBhbiBPTk5YIHByb3RvYnVmIGJpbmFyeSBpbnRvIGEgc3RydWN0dXJlZCByZXN1bHQuXHJcbiAqXHJcbiAqIFBvcnRlZCBmcm9tIEN5YW5NeWNlbGl1bTo6T25ueEdyYXBoQnVpbGRlci5cclxuICpcclxuICogVXNhZ2U6XHJcbiAqIGBgYHR5cGVzY3JpcHRcclxuICogY29uc3QgYnl0ZXMgPSBhd2FpdCBmZXRjaChcIm1vZGVsLm9ubnhcIikudGhlbihyID0+IHIuYXJyYXlCdWZmZXIoKSk7XHJcbiAqIGNvbnN0IHJlc3VsdCA9IE9ubnhQYXJzZXIucGFyc2UobmV3IFVpbnQ4QXJyYXkoYnl0ZXMpKTtcclxuICogY29uc29sZS5sb2cocmVzdWx0Lm5vZGVzLm1hcChuID0+IG4ub3BUeXBlKSk7XHJcbiAqIGBgYFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIE9ubnhQYXJzZXIge1xyXG4gICAgcHJpdmF0ZSBfZXJyb3I6IG51bWJlciA9IE9OTlhfU1VDQ0VTUztcclxuICAgIHByaXZhdGUgX2Vycm9ySW5mbzogc3RyaW5nID0gXCJcIjtcclxuXHJcbiAgICBwdWJsaWMgZ2V0IGVycm9yKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Vycm9yO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgZXJyb3JJbmZvKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Vycm9ySW5mbztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFBhcnNlIGFuIE9OTlggbW9kZWwgZnJvbSByYXcgYnl0ZXMuXHJcbiAgICAgKiBAcGFyYW0gZGF0YSAgVGhlIHJhdyAub25ueCBmaWxlIGNvbnRlbnQuXHJcbiAgICAgKiBAcmV0dXJucyAgICAgVGhlIHBhcnNlZCByZXN1bHQsIG9yIG51bGwgb24gZXJyb3IuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBzdGF0aWMgcGFyc2UoZGF0YTogVWludDhBcnJheSk6IE9ubnhQYXJzZVJlc3VsdCB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IHBhcnNlciA9IG5ldyBPbm54UGFyc2VyKCk7XHJcbiAgICAgICAgcmV0dXJuIHBhcnNlci5wYXJzZU1vZGVsKGRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUGFyc2UgYW4gT05OWCBtb2RlbC5cclxuICAgICAqL1xyXG4gICAgcHVibGljIHBhcnNlTW9kZWwoZGF0YTogVWludDhBcnJheSk6IE9ubnhQYXJzZVJlc3VsdCB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBQQlJlYWRlcihuZXcgTWVtb3J5U3RyZWFtKGRhdGEpKTtcclxuICAgICAgICBjb25zdCByZXN1bHQ6IE9ubnhQYXJzZVJlc3VsdCA9IHtcclxuICAgICAgICAgICAgaXJWZXJzaW9uOiAwLFxyXG4gICAgICAgICAgICBncmFwaE5hbWU6IFwiXCIsXHJcbiAgICAgICAgICAgIG5vZGVzOiBbXSxcclxuICAgICAgICAgICAgaW5pdGlhbGl6ZXJzOiBbXSxcclxuICAgICAgICAgICAgaW5wdXRzOiBbXSxcclxuICAgICAgICAgICAgb3V0cHV0czogW10sXHJcbiAgICAgICAgICAgIHZhbHVlSW5mb3M6IFtdLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHdoaWxlIChyZWFkZXIucmVhZFRhZygpKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAocmVhZGVyLmZpZWxkTnVtYmVyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIE1PREVMX0lSX1ZFUlNJT046IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gcmVhZGVyLnJlYWRJbnQzMigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2ID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NldEVycm9yKE9OTlhfUkVBRF9FUlJPUiwgXCJGYWlsZWQgdG8gcmVhZCBJUiB2ZXJzaW9uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmlyVmVyc2lvbiA9IHY7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIE1PREVMX0dSQVBIOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViID0gcmVhZGVyLmdldFN1Yk1lc3NhZ2VSZWFkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXN1Yikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXRFcnJvcihPTk5YX1JFQURfRVJST1IsIFwiRmFpbGVkIHRvIHJlYWQgZ3JhcGhcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX3JlYWRHcmFwaChzdWIsIHJlc3VsdCkpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDoge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVhZGVyLnNraXAoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXRFcnJvcihPTk5YX1JFQURfRVJST1IsIFwiRmFpbGVkIHRvIHNraXAgZmllbGRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgR3JhcGgg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSBfcmVhZEdyYXBoKHJlYWRlcjogUEJSZWFkZXIsIHJlc3VsdDogT25ueFBhcnNlUmVzdWx0KTogYm9vbGVhbiB7XHJcbiAgICAgICAgd2hpbGUgKHJlYWRlci5yZWFkVGFnKCkpIHtcclxuICAgICAgICAgICAgc3dpdGNoIChyZWFkZXIuZmllbGROdW1iZXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgR1JBUEhfTk9ERToge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN1YiA9IHJlYWRlci5nZXRTdWJNZXNzYWdlUmVhZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdWIpIHJldHVybiB0aGlzLl9mYWlsKFwiRmFpbGVkIHRvIHJlYWQgbm9kZVwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBub2RlID0gdGhpcy5fcmVhZE5vZGUoc3ViKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIW5vZGUpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQubm9kZXMucHVzaChub2RlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgR1JBUEhfTkFNRToge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSByZWFkZXIucmVhZFN0cmluZyhLRVlfTUFYX0xFTkdUSCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUgPT09IG51bGwpIHJldHVybiB0aGlzLl9mYWlsKFwiRmFpbGVkIHRvIHJlYWQgZ3JhcGggbmFtZVwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuZ3JhcGhOYW1lID0gbmFtZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgR1JBUEhfSU5JVElBTElaRVI6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdWIgPSByZWFkZXIuZ2V0U3ViTWVzc2FnZVJlYWRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghc3ViKSByZXR1cm4gdGhpcy5fZmFpbChcIkZhaWxlZCB0byByZWFkIGluaXRpYWxpemVyXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluaXQgPSB0aGlzLl9yZWFkSW5pdGlhbGl6ZXIoc3ViKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWluaXQpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuaW5pdGlhbGl6ZXJzLnB1c2goaW5pdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdSQVBIX0lOUFVUOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViID0gcmVhZGVyLmdldFN1Yk1lc3NhZ2VSZWFkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXN1YikgcmV0dXJuIHRoaXMuX2ZhaWwoXCJGYWlsZWQgdG8gcmVhZCBpbnB1dFwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2aSA9IHRoaXMuX3JlYWRWYWx1ZUluZm8oc3ViLCBPbm54TGlua1R5cGUuSU5QVVQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdmkpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuaW5wdXRzLnB1c2godmkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBHUkFQSF9PVVRQVVQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdWIgPSByZWFkZXIuZ2V0U3ViTWVzc2FnZVJlYWRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghc3ViKSByZXR1cm4gdGhpcy5fZmFpbChcIkZhaWxlZCB0byByZWFkIG91dHB1dFwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2aSA9IHRoaXMuX3JlYWRWYWx1ZUluZm8oc3ViLCBPbm54TGlua1R5cGUuT1VUUFVUKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXZpKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0Lm91dHB1dHMucHVzaCh2aSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdSQVBIX1ZBTFVFX0lORk86IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdWIgPSByZWFkZXIuZ2V0U3ViTWVzc2FnZVJlYWRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghc3ViKSByZXR1cm4gdGhpcy5fZmFpbChcIkZhaWxlZCB0byByZWFkIHZhbHVlX2luZm9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmkgPSB0aGlzLl9yZWFkVmFsdWVJbmZvKHN1YiwgT25ueExpbmtUeXBlLlVOS05PV04pO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdmkpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQudmFsdWVJbmZvcy5wdXNoKHZpKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlYWRlci5za2lwKCkpIHJldHVybiB0aGlzLl9mYWlsKFwiRmFpbGVkIHRvIHNraXAgZ3JhcGggZmllbGRcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIE5vZGUg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSBfcmVhZE5vZGUocmVhZGVyOiBQQlJlYWRlcik6IE9ubnhOb2RlSW5mbyB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IG5vZGU6IE9ubnhOb2RlSW5mbyA9IHtcclxuICAgICAgICAgICAgbmFtZTogXCJcIixcclxuICAgICAgICAgICAgb3BUeXBlOiBcIlwiLFxyXG4gICAgICAgICAgICBpbnB1dHM6IFtdLFxyXG4gICAgICAgICAgICBvdXRwdXRzOiBbXSxcclxuICAgICAgICAgICAgYXR0cmlidXRlczogbmV3IE1hcCgpLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIFR3by1wYXNzIHJlYWQ6IGZpcnN0IGZpbmQgb3BfdHlwZSwgdGhlbiBwYXJzZSBldmVyeXRoaW5nXHJcbiAgICAgICAgcmVhZGVyLnNhdmUoKTtcclxuICAgICAgICB3aGlsZSAocmVhZGVyLnJlYWRUYWcoKSkge1xyXG4gICAgICAgICAgICBpZiAocmVhZGVyLmZpZWxkTnVtYmVyID09PSBOT0RFX09QX1RZUEUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHQgPSByZWFkZXIucmVhZFN0cmluZyhLRVlfTUFYX0xFTkdUSCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodCA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3NldEVycm9yKE9OTlhfUkVBRF9FUlJPUiwgXCJGYWlsZWQgdG8gcmVhZCBvcF90eXBlXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbm9kZS5vcFR5cGUgPSB0O1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVhZGVyLnJlc3RvcmUoKTtcclxuXHJcbiAgICAgICAgLy8gU2Vjb25kIHBhc3M6IHJlYWQgYWxsIGZpZWxkc1xyXG4gICAgICAgIHdoaWxlIChyZWFkZXIucmVhZFRhZygpKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAocmVhZGVyLmZpZWxkTnVtYmVyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIE5PREVfSU5QVVQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gcmVhZGVyLnJlYWRTdHJpbmcoS0VZX01BWF9MRU5HVEgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocy5sZW5ndGggPiAwKSBub2RlLmlucHV0cy5wdXNoKHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBOT0RFX09VVFBVVDoge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHMgPSByZWFkZXIucmVhZFN0cmluZyhLRVlfTUFYX0xFTkdUSCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHMgPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzLmxlbmd0aCA+IDApIG5vZGUub3V0cHV0cy5wdXNoKHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBOT0RFX05BTUU6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gcmVhZGVyLnJlYWRTdHJpbmcoS0VZX01BWF9MRU5HVEgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBub2RlLm5hbWUgPSBzO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBOT0RFX09QX1RZUEU6IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBBbHJlYWR5IHJlYWQgaW4gZmlyc3QgcGFzcywganVzdCBza2lwXHJcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgTk9ERV9BVFRSSUJVVEU6IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBJbmxpbmUgcGFyc2UgKGF2b2lkIHN1Yi1yZWFkZXIgZm9yIHBlcmZvcm1hbmNlKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlbiA9IHJlYWRlci5yZWFkTGVuZ3RoKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobGVuID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmQgPSByZWFkZXIucG9zaXRpb24gKyBsZW47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBhdHROYW1lID0gXCJcIjtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYXR0RmxvYXQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBhdHRJbnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBoYXNGbG9hdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBoYXNJbnQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYXR0VGVuc29yOiBPbm54VGVuc29ySW5mbyB8IG51bGwgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvc2l0aW9uIDwgZW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcmVhZGVyLnJlYWRUYWcoKSkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF0dEZpZWxkID0gcmVhZGVyLmZpZWxkTnVtYmVyIGFzIG51bWJlcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChhdHRGaWVsZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBVFRfTkFNRToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHMgPSByZWFkZXIucmVhZFN0cmluZyhLRVlfTUFYX0xFTkdUSCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMgPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dE5hbWUgPSBzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBVFRfRkxPQVQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmID0gcmVhZGVyLnJlYWRGbG9hdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRGbG9hdCA9IGY7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzRmxvYXQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBVFRfSU5UOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaSA9IHJlYWRlci5yZWFkSW50NjQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0SW50ID0gaTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNJbnQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBVFRfVEVOU09SOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViID0gcmVhZGVyLmdldFN1Yk1lc3NhZ2VSZWFkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXN1YikgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0VGVuc29yID0gdGhpcy5fcmVhZEluaXRpYWxpemVyKHN1Yik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEFUVF9JTlRTOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVwZWF0ZWQgaW50NjQ6IHN0b3JlIGZpcnN0IHZhbHVlIGFzIHNjYWxhciBhdHRyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaSA9IHJlYWRlci5yZWFkSW50NjQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNJbnQpIHsgYXR0SW50ID0gaTsgaGFzSW50ID0gdHJ1ZTsgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBVFRfRkxPQVRTOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVwZWF0ZWQgZmxvYXQ6IHN0b3JlIGZpcnN0IHZhbHVlIGFzIHNjYWxhciBhdHRyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZiA9IHJlYWRlci5yZWFkRmxvYXQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNGbG9hdCkgeyBhdHRGbG9hdCA9IGY7IGhhc0Zsb2F0ID0gdHJ1ZTsgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0TmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0VGVuc29yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW5vZGUudGVuc29yQXR0cmlidXRlcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUudGVuc29yQXR0cmlidXRlcyA9IG5ldyBNYXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUudGVuc29yQXR0cmlidXRlcy5zZXQoYXR0TmFtZSwgYXR0VGVuc29yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChoYXNGbG9hdCB8fCBoYXNJbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuYXR0cmlidXRlcy5zZXQoYXR0TmFtZSwgaGFzRmxvYXQgPyBhdHRGbG9hdCA6IGF0dEludCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFZhbHVlSW5mbyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICBwcml2YXRlIF9yZWFkVmFsdWVJbmZvKHJlYWRlcjogUEJSZWFkZXIsIHR5cGU6IE9ubnhMaW5rVHlwZSk6IE9ubnhWYWx1ZUluZm8gfCBudWxsIHtcclxuICAgICAgICBjb25zdCBpbmZvOiBPbm54VmFsdWVJbmZvID0ge1xyXG4gICAgICAgICAgICBuYW1lOiBcIlwiLFxyXG4gICAgICAgICAgICB0eXBlLFxyXG4gICAgICAgICAgICBlbGVtVHlwZTogT25ueERhdGFUeXBlLlVOREVGSU5FRCxcclxuICAgICAgICAgICAgc2hhcGU6IFtdLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHdoaWxlIChyZWFkZXIucmVhZFRhZygpKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAocmVhZGVyLmZpZWxkTnVtYmVyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFZJTkZPX05BTUU6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gcmVhZGVyLnJlYWRTdHJpbmcoS0VZX01BWF9MRU5HVEgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBpbmZvLm5hbWUgPSBzO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSBWSU5GT19UWVBFOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5saW5lIHBhcnNlIFR5cGVQcm90b1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlbiA9IHJlYWRlci5yZWFkTGVuZ3RoKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobGVuID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmQgPSByZWFkZXIucG9zaXRpb24gKyBsZW47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zaXRpb24gPCBlbmQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWFkZXIucmVhZFRhZygpKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChyZWFkZXIuZmllbGROdW1iZXIgYXMgbnVtYmVyKSA9PT0gVFlQRV9URU5TT1IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN1YiA9IHJlYWRlci5nZXRTdWJNZXNzYWdlUmVhZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXN1YikgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX3JlYWRUZW5zb3JUeXBlKHN1YiwgaW5mbykpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGluZm87XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBfcmVhZFRlbnNvclR5cGUocmVhZGVyOiBQQlJlYWRlciwgaW5mbzogT25ueFZhbHVlSW5mbyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHdoaWxlIChyZWFkZXIucmVhZFRhZygpKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAocmVhZGVyLmZpZWxkTnVtYmVyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRFTlNPUl9UWVBFX0VMRU1fVFlQRToge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHYgPSByZWFkZXIucmVhZEludDMyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHYgPT09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBpbmZvLmVsZW1UeXBlID0gdiBhcyBPbm54RGF0YVR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRFTlNPUl9UWVBFX1NIQVBFOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViID0gcmVhZGVyLmdldFN1Yk1lc3NhZ2VSZWFkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXN1YikgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5fcmVhZFRlbnNvclNoYXBlKHN1YiwgaW5mbykpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIF9yZWFkVGVuc29yU2hhcGUocmVhZGVyOiBQQlJlYWRlciwgaW5mbzogT25ueFZhbHVlSW5mbyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHdoaWxlIChyZWFkZXIucmVhZFRhZygpKSB7XHJcbiAgICAgICAgICAgIGlmIChyZWFkZXIuZmllbGROdW1iZXIgPT09IFNIQVBFX0RJTSkge1xyXG4gICAgICAgICAgICAgICAgLy8gSW5saW5lIHBhcnNlIERpbWVuc2lvblByb3RvXHJcbiAgICAgICAgICAgICAgICBjb25zdCBsZW4gPSByZWFkZXIucmVhZExlbmd0aChmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAobGVuID09PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbmQgPSByZWFkZXIucG9zaXRpb24gKyBsZW47XHJcblxyXG4gICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3NpdGlvbiA8IGVuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVhZGVyLnJlYWRUYWcoKSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpbUZpZWxkID0gcmVhZGVyLmZpZWxkTnVtYmVyIGFzIG51bWJlcjtcclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGRpbUZpZWxkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRElNX1ZBTFVFOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gcmVhZGVyLnJlYWRJbnQ2NCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYgPT09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZm8uc2hhcGUucHVzaCh2KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRElNX1NZTUJPTDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3ltYm9saWMgZGltZW5zaW9uIChlLmcuLCBcImJhdGNoX3NpemVcIiksIHN0b3JlIGFzIDBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmZvLnNoYXBlLnB1c2goMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlYWRlci5za2lwKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIEluaXRpYWxpemVyIChUZW5zb3JQcm90bykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSBfcmVhZEluaXRpYWxpemVyKHJlYWRlcjogUEJSZWFkZXIpOiBPbm54VGVuc29ySW5mbyB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IHRlbnNvcjogT25ueFRlbnNvckluZm8gPSB7XHJcbiAgICAgICAgICAgIG5hbWU6IFwiXCIsXHJcbiAgICAgICAgICAgIGRhdGFUeXBlOiBPbm54RGF0YVR5cGUuVU5ERUZJTkVELFxyXG4gICAgICAgICAgICBkaW1zOiBbXSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBsZXQgdG90YWxFbGVtZW50cyA9IDA7XHJcblxyXG4gICAgICAgIHdoaWxlIChyZWFkZXIucmVhZFRhZygpKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAocmVhZGVyLmZpZWxkTnVtYmVyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRFTlNPUl9ESU1TOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYWRlci53aXJlVHlwZSA9PT0gV2lyZVR5cGUuTEVOKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBhY2tlZCBkaW1zXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRtcERpbXMgPSBuZXcgSW50MzJBcnJheShURU5TT1JfTUFYX0RJTUVOU0lPTik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gcmVhZGVyLnJlYWRQYWNrZWRJbnQzMih0bXBEaW1zLCBURU5TT1JfTUFYX0RJTUVOU0lPTik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb3VudCA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbnNvci5kaW1zID0gQXJyYXkuZnJvbSh0bXBEaW1zLnN1YmFycmF5KDAsIGNvdW50KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5kaXZpZHVhbCB2YXJpbnQgZGltXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHYgPSByZWFkZXIucmVhZEludDMyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2ID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVuc29yLmRpbXMucHVzaCh2KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVjb21wdXRlIHRvdGFsIGVsZW1lbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxFbGVtZW50cyA9IHRlbnNvci5kaW1zLmxlbmd0aCA+IDAgPyB0ZW5zb3IuZGltcy5yZWR1Y2UoKGEsIGIpID0+IGEgKiBiLCAxKSA6IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRFTlNPUl9EQVRBX1RZUEU6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gcmVhZGVyLnJlYWRJbnQzMigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2ID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB0ZW5zb3IuZGF0YVR5cGUgPSB2IGFzIE9ubnhEYXRhVHlwZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgVEVOU09SX05BTUU6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gcmVhZGVyLnJlYWRTdHJpbmcoS0VZX01BWF9MRU5HVEgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB0ZW5zb3IubmFtZSA9IHM7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRFTlNPUl9GTE9BVF9EQVRBOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvdGFsRWxlbWVudHMgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXAoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGVuc29yLmZsb2F0RGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW5zb3IuZmxvYXREYXRhID0gbmV3IEZsb2F0MzJBcnJheSh0b3RhbEVsZW1lbnRzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYWRlci53aXJlVHlwZSA9PT0gV2lyZVR5cGUuTEVOKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBhY2tlZCBmbG9hdHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRQYWNrZWRGbG9hdDMyKHRlbnNvci5mbG9hdERhdGEsIHRvdGFsRWxlbWVudHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluZGl2aWR1YWwgZmxvYXQgKHJhcmUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGYgPSByZWFkZXIucmVhZEZsb2F0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmluZCBuZXh0IGVtcHR5IHNsb3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3RhbEVsZW1lbnRzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZW5zb3IuZmxvYXREYXRhW2ldID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVuc29yLmZsb2F0RGF0YVtpXSA9IGY7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRFTlNPUl9SQVdfREFUQToge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJ5dGVzID0gcmVhZGVyLnJlYWRCeXRlcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChieXRlcyA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgdGVuc29yLnJhd0RhdGEgPSBieXRlcztcclxuICAgICAgICAgICAgICAgICAgICAvLyBJZiBmbG9hdCB0eXBlLCBhbHNvIGNyZWF0ZSB0aGUgZmxvYXQgdmlld1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ZW5zb3IuZGF0YVR5cGUgPT09IE9ubnhEYXRhVHlwZS5GTE9BVCAmJiB0b3RhbEVsZW1lbnRzID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhbGlnbmVkID0gbmV3IEZsb2F0MzJBcnJheShieXRlcy5idWZmZXIsIGJ5dGVzLmJ5dGVPZmZzZXQsIHRvdGFsRWxlbWVudHMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW5zb3IuZmxvYXREYXRhID0gbmV3IEZsb2F0MzJBcnJheShhbGlnbmVkKTsgLy8gY29weSB0byBlbnN1cmUgYWxpZ25tZW50XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0ZW5zb3I7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIEVycm9yIGhlbHBlcnMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSBfc2V0RXJyb3IoY29kZTogbnVtYmVyLCBpbmZvOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLl9lcnJvciA9IGNvZGU7XHJcbiAgICAgICAgdGhpcy5fZXJyb3JJbmZvID0gaW5mbztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIF9mYWlsKG1zZzogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgICAgdGhpcy5fc2V0RXJyb3IoT05OWF9SRUFEX0VSUk9SLCBtc2cpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxufVxyXG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcclxuLy8gT05OWCBkYXRhIHR5cGVzIGFuZCBwcm90b2J1ZiBmaWVsZCBjb25zdGFudHNcclxuLy9cclxuLy8gTWlycm9ycyB0aGUgT05OWCAxLjE4LjAgcHJvdG9idWYgc2NoZW1hIChvbm54LnByb3RvMykgYXMgVHlwZVNjcmlwdFxyXG4vLyB0eXBlcyBhbmQgbnVtZXJpYyBjb25zdGFudHMuIE5vIGNvZGUgZ2VuZXJhdGlvbiByZXF1aXJlZC5cclxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcblxyXG4vLyDilIDilIDilIAgVGVuc29yIGRhdGEgdHlwZXMgKGZyb20gb25ueC5wcm90bzMgVGVuc29yUHJvdG8uRGF0YVR5cGUpIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuZXhwb3J0IGVudW0gT25ueERhdGFUeXBlIHtcclxuICAgIFVOREVGSU5FRCA9IDAsXHJcbiAgICBGTE9BVCA9IDEsXHJcbiAgICBVSU5UOCA9IDIsXHJcbiAgICBJTlQ4ID0gMyxcclxuICAgIFVJTlQxNiA9IDQsXHJcbiAgICBJTlQxNiA9IDUsXHJcbiAgICBJTlQzMiA9IDYsXHJcbiAgICBJTlQ2NCA9IDcsXHJcbiAgICBTVFJJTkcgPSA4LFxyXG4gICAgQk9PTCA9IDksXHJcbiAgICBGTE9BVDE2ID0gMTAsXHJcbiAgICBET1VCTEUgPSAxMSxcclxuICAgIFVJTlQzMiA9IDEyLFxyXG4gICAgVUlOVDY0ID0gMTMsXHJcbiAgICBDT01QTEVYNjQgPSAxNCxcclxuICAgIENPTVBMRVgxMjggPSAxNSxcclxuICAgIEJGTE9BVDE2ID0gMTYsXHJcbn1cclxuXHJcbi8qKiBCeXRlIHNpemUgcGVyIGVsZW1lbnQgZm9yIHN1cHBvcnRlZCBkYXRhIHR5cGVzLiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gb25ueERhdGFUeXBlU2l6ZSh0eXBlOiBPbm54RGF0YVR5cGUpOiBudW1iZXIge1xyXG4gICAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuRkxPQVQ6XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuSU5UMzI6XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuVUlOVDMyOlxyXG4gICAgICAgICAgICByZXR1cm4gNDtcclxuICAgICAgICBjYXNlIE9ubnhEYXRhVHlwZS5ET1VCTEU6XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuSU5UNjQ6XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuVUlOVDY0OlxyXG4gICAgICAgICAgICByZXR1cm4gODtcclxuICAgICAgICBjYXNlIE9ubnhEYXRhVHlwZS5GTE9BVDE2OlxyXG4gICAgICAgIGNhc2UgT25ueERhdGFUeXBlLkJGTE9BVDE2OlxyXG4gICAgICAgIGNhc2UgT25ueERhdGFUeXBlLklOVDE2OlxyXG4gICAgICAgIGNhc2UgT25ueERhdGFUeXBlLlVJTlQxNjpcclxuICAgICAgICAgICAgcmV0dXJuIDI7XHJcbiAgICAgICAgY2FzZSBPbm54RGF0YVR5cGUuSU5UODpcclxuICAgICAgICBjYXNlIE9ubnhEYXRhVHlwZS5VSU5UODpcclxuICAgICAgICBjYXNlIE9ubnhEYXRhVHlwZS5CT09MOlxyXG4gICAgICAgICAgICByZXR1cm4gMTtcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICByZXR1cm4gMDtcclxuICAgIH1cclxufVxyXG5cclxuLy8g4pSA4pSA4pSAIExpbmsgdHlwZSAobWlycm9ycyBDeWFuTXljZWxpdW06OkxpbmtUeXBlKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbmV4cG9ydCBlbnVtIE9ubnhMaW5rVHlwZSB7XHJcbiAgICBVTktOT1dOID0gMCxcclxuICAgIElOUFVUID0gMSxcclxuICAgIE9VVFBVVCA9IDIsXHJcbiAgICBJTklUSUFMSVpFUiA9IDMsXHJcbn1cclxuXHJcbi8vIOKUgOKUgOKUgCBQcm90b2J1ZiBmaWVsZCBudW1iZXJzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4vLyBUaGVzZSBtYXRjaCB0aGUgT05OWCAucHJvdG8gZmllbGQgaW5kaWNlcyBleGFjdGx5LlxyXG5cclxuLy8gTW9kZWxQcm90b1xyXG5leHBvcnQgY29uc3QgTU9ERUxfSVJfVkVSU0lPTiA9IDE7XHJcbmV4cG9ydCBjb25zdCBNT0RFTF9HUkFQSCA9IDc7XHJcblxyXG4vLyBHcmFwaFByb3RvXHJcbmV4cG9ydCBjb25zdCBHUkFQSF9OT0RFID0gMTtcclxuZXhwb3J0IGNvbnN0IEdSQVBIX05BTUUgPSAyO1xyXG5leHBvcnQgY29uc3QgR1JBUEhfSU5JVElBTElaRVIgPSA1O1xyXG5leHBvcnQgY29uc3QgR1JBUEhfRE9DX1NUUklORyA9IDEwO1xyXG5leHBvcnQgY29uc3QgR1JBUEhfSU5QVVQgPSAxMTtcclxuZXhwb3J0IGNvbnN0IEdSQVBIX09VVFBVVCA9IDEyO1xyXG5leHBvcnQgY29uc3QgR1JBUEhfVkFMVUVfSU5GTyA9IDEzO1xyXG5cclxuLy8gTm9kZVByb3RvXHJcbmV4cG9ydCBjb25zdCBOT0RFX0lOUFVUID0gMTtcclxuZXhwb3J0IGNvbnN0IE5PREVfT1VUUFVUID0gMjtcclxuZXhwb3J0IGNvbnN0IE5PREVfTkFNRSA9IDM7XHJcbmV4cG9ydCBjb25zdCBOT0RFX09QX1RZUEUgPSA0O1xyXG5leHBvcnQgY29uc3QgTk9ERV9BVFRSSUJVVEUgPSA1O1xyXG5cclxuLy8gQXR0cmlidXRlUHJvdG8gKHBhcnRpYWwsIG1vc3QgY29tbW9ubHkgdXNlZCBmaWVsZHMpXHJcbmV4cG9ydCBjb25zdCBBVFRfTkFNRSA9IDE7XHJcbmV4cG9ydCBjb25zdCBBVFRfRkxPQVQgPSAyO1xyXG5leHBvcnQgY29uc3QgQVRUX0lOVCA9IDM7XHJcbmV4cG9ydCBjb25zdCBBVFRfVEVOU09SID0gNTtcclxuZXhwb3J0IGNvbnN0IEFUVF9GTE9BVFMgPSA3O1xyXG5leHBvcnQgY29uc3QgQVRUX0lOVFMgPSA4O1xyXG5cclxuLy8gVmFsdWVJbmZvUHJvdG9cclxuZXhwb3J0IGNvbnN0IFZJTkZPX05BTUUgPSAxO1xyXG5leHBvcnQgY29uc3QgVklORk9fVFlQRSA9IDI7XHJcblxyXG4vLyBUeXBlUHJvdG9cclxuZXhwb3J0IGNvbnN0IFRZUEVfVEVOU09SID0gMTtcclxuXHJcbi8vIFRlbnNvclR5cGVQcm90b1xyXG5leHBvcnQgY29uc3QgVEVOU09SX1RZUEVfRUxFTV9UWVBFID0gMTtcclxuZXhwb3J0IGNvbnN0IFRFTlNPUl9UWVBFX1NIQVBFID0gMjtcclxuXHJcbi8vIFRlbnNvclNoYXBlUHJvdG8uRGltZW5zaW9uXHJcbmV4cG9ydCBjb25zdCBTSEFQRV9ESU0gPSAxO1xyXG5leHBvcnQgY29uc3QgRElNX1ZBTFVFID0gMTtcclxuZXhwb3J0IGNvbnN0IERJTV9TWU1CT0wgPSAyO1xyXG5cclxuLy8gVGVuc29yUHJvdG8gKGluaXRpYWxpemVyKVxyXG5leHBvcnQgY29uc3QgVEVOU09SX0RJTVMgPSAxO1xyXG5leHBvcnQgY29uc3QgVEVOU09SX0RBVEFfVFlQRSA9IDI7XHJcbmV4cG9ydCBjb25zdCBURU5TT1JfRkxPQVRfREFUQSA9IDQ7XHJcbmV4cG9ydCBjb25zdCBURU5TT1JfSU5UMzJfREFUQSA9IDU7XHJcbmV4cG9ydCBjb25zdCBURU5TT1JfU1RSSU5HX0RBVEEgPSA2O1xyXG5leHBvcnQgY29uc3QgVEVOU09SX0lOVDY0X0RBVEEgPSA3O1xyXG5leHBvcnQgY29uc3QgVEVOU09SX05BTUUgPSA4O1xyXG5leHBvcnQgY29uc3QgVEVOU09SX1JBV19EQVRBID0gOTtcclxuZXhwb3J0IGNvbnN0IFRFTlNPUl9ET1VCTEVfREFUQSA9IDEwO1xyXG5leHBvcnQgY29uc3QgVEVOU09SX1VJTlQ2NF9EQVRBID0gMTE7XHJcblxyXG4vLyDilIDilIDilIAgTWF4IGNvbnN0YW50cyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbmV4cG9ydCBjb25zdCBLRVlfTUFYX0xFTkdUSCA9IDEyODtcclxuZXhwb3J0IGNvbnN0IFRFTlNPUl9NQVhfRElNRU5TSU9OID0gODtcclxuXHJcbi8vIOKUgOKUgOKUgCBQYXJzZWQgc3RydWN0dXJlcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbi8qKlxyXG4gKiBBIHBhcnNlZCB0ZW5zb3IgaW5pdGlhbGl6ZXIgKHdlaWdodHMsIGJpYXNlcywgZXRjLikuXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIE9ubnhUZW5zb3JJbmZvIHtcclxuICAgIG5hbWU6IHN0cmluZztcclxuICAgIGRhdGFUeXBlOiBPbm54RGF0YVR5cGU7XHJcbiAgICBkaW1zOiBudW1iZXJbXTtcclxuICAgIGZsb2F0RGF0YT86IEZsb2F0MzJBcnJheTtcclxuICAgIHJhd0RhdGE/OiBVaW50OEFycmF5O1xyXG59XHJcblxyXG4vKipcclxuICogQSBwYXJzZWQgT05OWCBvcGVyYXRvciBub2RlLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBPbm54Tm9kZUluZm8ge1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgb3BUeXBlOiBzdHJpbmc7XHJcbiAgICBpbnB1dHM6IHN0cmluZ1tdO1xyXG4gICAgb3V0cHV0czogc3RyaW5nW107XHJcbiAgICBhdHRyaWJ1dGVzOiBNYXA8c3RyaW5nLCBudW1iZXI+OyAvLyBmbG9hdCBvciBpbnQgYXR0cmlidXRlc1xyXG4gICAgdGVuc29yQXR0cmlidXRlcz86IE1hcDxzdHJpbmcsIE9ubnhUZW5zb3JJbmZvPjsgLy8gdGVuc29yLXZhbHVlZCBhdHRyaWJ1dGVzXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBIHBhcnNlZCB2YWx1ZSBpbmZvIChncmFwaCBpbnB1dC9vdXRwdXQgd2l0aCBzaGFwZSBtZXRhZGF0YSkuXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIE9ubnhWYWx1ZUluZm8ge1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgdHlwZTogT25ueExpbmtUeXBlO1xyXG4gICAgZWxlbVR5cGU6IE9ubnhEYXRhVHlwZTtcclxuICAgIHNoYXBlOiBudW1iZXJbXTtcclxufVxyXG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIE9OTlggbW9kZWwgd3JpdGVyXG4vL1xuLy8gU3ltbWV0cmljIGNvdW50ZXJwYXJ0IHRvIG9ubngtcGFyc2VyLnRzLlxuLy8gU2VyaWFsaXplcyBhbiBPbm54UGFyc2VSZXN1bHQgYmFjayBpbnRvIGEgdmFsaWQgT05OWCBwcm90b2J1ZiBiaW5hcnksXG4vLyByZXVzaW5nIHRoZSBzYW1lIGZpZWxkIGNvbnN0YW50cyBhbmQgZGF0YSBzdHJ1Y3R1cmVzLlxuLy9cbi8vIFplcm8gZGVwZW5kZW5jaWVzIGJleW9uZCB0aGUgbG9jYWwgcGIvIHdyaXRlciBhbmQgb25ueC10eXBlcy5cbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5pbXBvcnQgeyBQQldyaXRlciB9IGZyb20gXCIuL3BiL3dyaXRlclwiO1xuaW1wb3J0IHsgV2lyZVR5cGUgfSBmcm9tIFwiLi9wYi9yZWFkZXJcIjtcbmltcG9ydCB7XG4gICAgT25ueERhdGFUeXBlLFxuICAgIE9ubnhOb2RlSW5mbyxcbiAgICBPbm54VGVuc29ySW5mbyxcbiAgICBPbm54VmFsdWVJbmZvLFxuICAgIC8vIE1vZGVsUHJvdG8gZmllbGRzXG4gICAgTU9ERUxfSVJfVkVSU0lPTixcbiAgICBNT0RFTF9HUkFQSCxcbiAgICAvLyBHcmFwaFByb3RvIGZpZWxkc1xuICAgIEdSQVBIX05PREUsXG4gICAgR1JBUEhfTkFNRSxcbiAgICBHUkFQSF9JTklUSUFMSVpFUixcbiAgICBHUkFQSF9JTlBVVCxcbiAgICBHUkFQSF9PVVRQVVQsXG4gICAgR1JBUEhfVkFMVUVfSU5GTyxcbiAgICAvLyBOb2RlUHJvdG8gZmllbGRzXG4gICAgTk9ERV9JTlBVVCxcbiAgICBOT0RFX09VVFBVVCxcbiAgICBOT0RFX05BTUUsXG4gICAgTk9ERV9PUF9UWVBFLFxuICAgIE5PREVfQVRUUklCVVRFLFxuICAgIC8vIEF0dHJpYnV0ZVByb3RvIGZpZWxkc1xuICAgIEFUVF9OQU1FLFxuICAgIEFUVF9GTE9BVCxcbiAgICBBVFRfSU5ULFxuICAgIC8vIFZhbHVlSW5mb1Byb3RvIGZpZWxkc1xuICAgIFZJTkZPX05BTUUsXG4gICAgVklORk9fVFlQRSxcbiAgICAvLyBUeXBlUHJvdG8gZmllbGRzXG4gICAgVFlQRV9URU5TT1IsXG4gICAgLy8gVGVuc29yVHlwZVByb3RvIGZpZWxkc1xuICAgIFRFTlNPUl9UWVBFX0VMRU1fVFlQRSxcbiAgICBURU5TT1JfVFlQRV9TSEFQRSxcbiAgICAvLyBTaGFwZSBmaWVsZHNcbiAgICBTSEFQRV9ESU0sXG4gICAgRElNX1ZBTFVFLFxuICAgIC8vIFRlbnNvclByb3RvIGZpZWxkc1xuICAgIFRFTlNPUl9ESU1TLFxuICAgIFRFTlNPUl9EQVRBX1RZUEUsXG4gICAgVEVOU09SX0ZMT0FUX0RBVEEsXG4gICAgVEVOU09SX05BTUUsXG4gICAgVEVOU09SX1JBV19EQVRBLFxufSBmcm9tIFwiLi9vbm54LXR5cGVzXCI7XG5pbXBvcnQgeyBPbm54UGFyc2VSZXN1bHQgfSBmcm9tIFwiLi9vbm54LXBhcnNlclwiO1xuXG4vLyDilIDilIDilIAgT25ueFdyaXRlciDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuLyoqXG4gKiBTZXJpYWxpemVzIGFuIE9ubnhQYXJzZVJlc3VsdCBpbnRvIE9OTlggcHJvdG9idWYgYmluYXJ5LlxuICpcbiAqIFVzYWdlOlxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgcmVzdWx0ID0gT25ueFBhcnNlci5wYXJzZShvcmlnaW5hbEJ5dGVzKTtcbiAqIC8vIOKApiBtb2RpZnkgcmVzdWx0IOKAplxuICogY29uc3QgYnl0ZXMgPSBPbm54V3JpdGVyLnNlcmlhbGl6ZShyZXN1bHQpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBPbm54V3JpdGVyIHtcbiAgICAvKipcbiAgICAgKiBTZXJpYWxpemUgYW4gT25ueFBhcnNlUmVzdWx0IHRvIHJhdyBPTk5YIHByb3RvYnVmIGJ5dGVzLlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgc2VyaWFsaXplKG1vZGVsOiBPbm54UGFyc2VSZXN1bHQpOiBVaW50OEFycmF5IHtcbiAgICAgICAgY29uc3Qgd3JpdGVyID0gbmV3IE9ubnhXcml0ZXIoKTtcbiAgICAgICAgcmV0dXJuIHdyaXRlci5fd3JpdGVNb2RlbChtb2RlbCk7XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIE1vZGVsIChNb2RlbFByb3RvKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIHByaXZhdGUgX3dyaXRlTW9kZWwobW9kZWw6IE9ubnhQYXJzZVJlc3VsdCk6IFVpbnQ4QXJyYXkge1xuICAgICAgICBjb25zdCB3ID0gbmV3IFBCV3JpdGVyKCk7XG5cbiAgICAgICAgLy8gaXJfdmVyc2lvbiAoZmllbGQgMSwgdmFyaW50KVxuICAgICAgICBpZiAobW9kZWwuaXJWZXJzaW9uID4gMCkge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhNT0RFTF9JUl9WRVJTSU9OLCBXaXJlVHlwZS5WQVJJTlQpO1xuICAgICAgICAgICAgdy53cml0ZUludDMyKG1vZGVsLmlyVmVyc2lvbik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBncmFwaCAoZmllbGQgNywgbGVuZ3RoLWRlbGltaXRlZClcbiAgICAgICAgdy53cml0ZVRhZyhNT0RFTF9HUkFQSCwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgdy53cml0ZVN1Yk1lc3NhZ2UoKHN1YikgPT4gdGhpcy5fd3JpdGVHcmFwaChzdWIsIG1vZGVsKSk7XG5cbiAgICAgICAgcmV0dXJuIHcuZmluaXNoKCkuc2xpY2UoKTsgLy8gZGV0YWNoIGZyb20gaW50ZXJuYWwgYnVmZmVyXG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIEdyYXBoIChHcmFwaFByb3RvKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIHByaXZhdGUgX3dyaXRlR3JhcGgodzogUEJXcml0ZXIsIG1vZGVsOiBPbm54UGFyc2VSZXN1bHQpOiB2b2lkIHtcbiAgICAgICAgLy8gbm9kZXMgKGZpZWxkIDEsIHJlcGVhdGVkKVxuICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgbW9kZWwubm9kZXMpIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoR1JBUEhfTk9ERSwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdWJNZXNzYWdlKChzdWIpID0+IHRoaXMuX3dyaXRlTm9kZShzdWIsIG5vZGUpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG5hbWUgKGZpZWxkIDIpXG4gICAgICAgIGlmIChtb2RlbC5ncmFwaE5hbWUpIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoR1JBUEhfTkFNRSwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdHJpbmcobW9kZWwuZ3JhcGhOYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGluaXRpYWxpemVycyAoZmllbGQgNSwgcmVwZWF0ZWQpXG4gICAgICAgIGZvciAoY29uc3QgaW5pdCBvZiBtb2RlbC5pbml0aWFsaXplcnMpIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoR1JBUEhfSU5JVElBTElaRVIsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlU3ViTWVzc2FnZSgoc3ViKSA9PiB0aGlzLl93cml0ZUluaXRpYWxpemVyKHN1YiwgaW5pdCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaW5wdXRzIChmaWVsZCAxMSwgcmVwZWF0ZWQpXG4gICAgICAgIGZvciAoY29uc3QgaW5wdXQgb2YgbW9kZWwuaW5wdXRzKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKEdSQVBIX0lOUFVULCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN1Yk1lc3NhZ2UoKHN1YikgPT4gdGhpcy5fd3JpdGVWYWx1ZUluZm8oc3ViLCBpbnB1dCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gb3V0cHV0cyAoZmllbGQgMTIsIHJlcGVhdGVkKVxuICAgICAgICBmb3IgKGNvbnN0IG91dHB1dCBvZiBtb2RlbC5vdXRwdXRzKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKEdSQVBIX09VVFBVVCwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdWJNZXNzYWdlKChzdWIpID0+IHRoaXMuX3dyaXRlVmFsdWVJbmZvKHN1Yiwgb3V0cHV0KSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWx1ZV9pbmZvIChmaWVsZCAxMywgcmVwZWF0ZWQpXG4gICAgICAgIGZvciAoY29uc3Qgdmkgb2YgbW9kZWwudmFsdWVJbmZvcykge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhHUkFQSF9WQUxVRV9JTkZPLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN1Yk1lc3NhZ2UoKHN1YikgPT4gdGhpcy5fd3JpdGVWYWx1ZUluZm8oc3ViLCB2aSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIE5vZGUgKE5vZGVQcm90bykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICBwcml2YXRlIF93cml0ZU5vZGUodzogUEJXcml0ZXIsIG5vZGU6IE9ubnhOb2RlSW5mbyk6IHZvaWQge1xuICAgICAgICAvLyBpbnB1dHMgKGZpZWxkIDEsIHJlcGVhdGVkIHN0cmluZylcbiAgICAgICAgZm9yIChjb25zdCBpbnB1dCBvZiBub2RlLmlucHV0cykge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhOT0RFX0lOUFVULCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN0cmluZyhpbnB1dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBvdXRwdXRzIChmaWVsZCAyLCByZXBlYXRlZCBzdHJpbmcpXG4gICAgICAgIGZvciAoY29uc3Qgb3V0cHV0IG9mIG5vZGUub3V0cHV0cykge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhOT0RFX09VVFBVVCwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdHJpbmcob3V0cHV0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG5hbWUgKGZpZWxkIDMpXG4gICAgICAgIGlmIChub2RlLm5hbWUpIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoTk9ERV9OQU1FLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN0cmluZyhub2RlLm5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gb3BfdHlwZSAoZmllbGQgNClcbiAgICAgICAgaWYgKG5vZGUub3BUeXBlKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKE5PREVfT1BfVFlQRSwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdHJpbmcobm9kZS5vcFR5cGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYXR0cmlidXRlcyAoZmllbGQgNSwgcmVwZWF0ZWQpXG4gICAgICAgIGZvciAoY29uc3QgW25hbWUsIHZhbHVlXSBvZiBub2RlLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoTk9ERV9BVFRSSUJVVEUsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlU3ViTWVzc2FnZSgoc3ViKSA9PiB0aGlzLl93cml0ZUF0dHJpYnV0ZShzdWIsIG5hbWUsIHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDilIDilIAgQXR0cmlidXRlIChBdHRyaWJ1dGVQcm90bykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICBwcml2YXRlIF93cml0ZUF0dHJpYnV0ZSh3OiBQQldyaXRlciwgbmFtZTogc3RyaW5nLCB2YWx1ZTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIC8vIG5hbWUgKGZpZWxkIDEpXG4gICAgICAgIHcud3JpdGVUYWcoQVRUX05BTUUsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgIHcud3JpdGVTdHJpbmcobmFtZSk7XG5cbiAgICAgICAgaWYgKE51bWJlci5pc0ludGVnZXIodmFsdWUpKSB7XG4gICAgICAgICAgICAvLyBpbnQgKGZpZWxkIDMsIHZhcmludCDigJQgc3RvcmVkIGFzIGludDY0IGluIE9OTlgpXG4gICAgICAgICAgICB3LndyaXRlVGFnKEFUVF9JTlQsIFdpcmVUeXBlLlZBUklOVCk7XG4gICAgICAgICAgICB3LndyaXRlSW50NjQodmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZmxvYXQgKGZpZWxkIDIsIGZpeGVkMzIpXG4gICAgICAgICAgICB3LndyaXRlVGFnKEFUVF9GTE9BVCwgV2lyZVR5cGUuRklYRUQzMik7XG4gICAgICAgICAgICB3LndyaXRlRmxvYXQodmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIFZhbHVlSW5mbyAoVmFsdWVJbmZvUHJvdG8pIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gICAgcHJpdmF0ZSBfd3JpdGVWYWx1ZUluZm8odzogUEJXcml0ZXIsIGluZm86IE9ubnhWYWx1ZUluZm8pOiB2b2lkIHtcbiAgICAgICAgLy8gbmFtZSAoZmllbGQgMSlcbiAgICAgICAgaWYgKGluZm8ubmFtZSkge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhWSU5GT19OQU1FLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN0cmluZyhpbmZvLm5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdHlwZSAoZmllbGQgMikg4oaSIFR5cGVQcm90byDihpIgdGVuc29yX3R5cGUgKGZpZWxkIDEpIOKGkiBUZW5zb3JUeXBlUHJvdG9cbiAgICAgICAgaWYgKGluZm8uZWxlbVR5cGUgIT09IE9ubnhEYXRhVHlwZS5VTkRFRklORUQgfHwgaW5mby5zaGFwZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKFZJTkZPX1RZUEUsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlU3ViTWVzc2FnZSgodHlwZVcpID0+IHtcbiAgICAgICAgICAgICAgICB0eXBlVy53cml0ZVRhZyhUWVBFX1RFTlNPUiwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgICAgICB0eXBlVy53cml0ZVN1Yk1lc3NhZ2UoKHR0VykgPT4gdGhpcy5fd3JpdGVUZW5zb3JUeXBlKHR0VywgaW5mbykpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDilIDilIAgVGVuc29yVHlwZVByb3RvIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gICAgcHJpdmF0ZSBfd3JpdGVUZW5zb3JUeXBlKHc6IFBCV3JpdGVyLCBpbmZvOiBPbm54VmFsdWVJbmZvKTogdm9pZCB7XG4gICAgICAgIC8vIGVsZW1fdHlwZSAoZmllbGQgMSwgdmFyaW50KVxuICAgICAgICBpZiAoaW5mby5lbGVtVHlwZSAhPT0gT25ueERhdGFUeXBlLlVOREVGSU5FRCkge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhURU5TT1JfVFlQRV9FTEVNX1RZUEUsIFdpcmVUeXBlLlZBUklOVCk7XG4gICAgICAgICAgICB3LndyaXRlSW50MzIoaW5mby5lbGVtVHlwZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzaGFwZSAoZmllbGQgMikg4oaSIFRlbnNvclNoYXBlUHJvdG9cbiAgICAgICAgaWYgKGluZm8uc2hhcGUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhURU5TT1JfVFlQRV9TSEFQRSwgV2lyZVR5cGUuTEVOKTtcbiAgICAgICAgICAgIHcud3JpdGVTdWJNZXNzYWdlKChzaGFwZVcpID0+IHRoaXMuX3dyaXRlVGVuc29yU2hhcGUoc2hhcGVXLCBpbmZvLnNoYXBlKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDilIDilIAgVGVuc29yU2hhcGVQcm90byDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIHByaXZhdGUgX3dyaXRlVGVuc29yU2hhcGUodzogUEJXcml0ZXIsIHNoYXBlOiBudW1iZXJbXSk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IGRpbSBvZiBzaGFwZSkge1xuICAgICAgICAgICAgLy8gZGltIChmaWVsZCAxKSDihpIgRGltZW5zaW9uUHJvdG9cbiAgICAgICAgICAgIHcud3JpdGVUYWcoU0hBUEVfRElNLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN1Yk1lc3NhZ2UoKGRpbVcpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBkaW1fdmFsdWUgKGZpZWxkIDEsIHZhcmludCBpbnQ2NClcbiAgICAgICAgICAgICAgICBkaW1XLndyaXRlVGFnKERJTV9WQUxVRSwgV2lyZVR5cGUuVkFSSU5UKTtcbiAgICAgICAgICAgICAgICBkaW1XLndyaXRlSW50NjQoZGltKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIEluaXRpYWxpemVyIChUZW5zb3JQcm90bykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICBwcml2YXRlIF93cml0ZUluaXRpYWxpemVyKHc6IFBCV3JpdGVyLCB0ZW5zb3I6IE9ubnhUZW5zb3JJbmZvKTogdm9pZCB7XG4gICAgICAgIC8vIGRpbXMgKGZpZWxkIDEsIHBhY2tlZCB2YXJpbnQpXG4gICAgICAgIGlmICh0ZW5zb3IuZGltcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKFRFTlNPUl9ESU1TLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgY29uc3QgZGltczMyID0gbmV3IEludDMyQXJyYXkodGVuc29yLmRpbXMpO1xuICAgICAgICAgICAgdy53cml0ZVBhY2tlZEludDMyKGRpbXMzMiwgZGltczMyLmxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkYXRhX3R5cGUgKGZpZWxkIDIsIHZhcmludClcbiAgICAgICAgdy53cml0ZVRhZyhURU5TT1JfREFUQV9UWVBFLCBXaXJlVHlwZS5WQVJJTlQpO1xuICAgICAgICB3LndyaXRlSW50MzIodGVuc29yLmRhdGFUeXBlKTtcblxuICAgICAgICAvLyBmbG9hdF9kYXRhIChmaWVsZCA0LCBwYWNrZWQgZmxvYXQzMikgb3IgcmF3X2RhdGEgKGZpZWxkIDksIGJ5dGVzKVxuICAgICAgICBpZiAodGVuc29yLmZsb2F0RGF0YSAmJiB0ZW5zb3IuZmxvYXREYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHcud3JpdGVUYWcoVEVOU09SX0ZMT0FUX0RBVEEsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlUGFja2VkRmxvYXQzMih0ZW5zb3IuZmxvYXREYXRhLCB0ZW5zb3IuZmxvYXREYXRhLmxlbmd0aCk7XG4gICAgICAgIH0gZWxzZSBpZiAodGVuc29yLnJhd0RhdGEgJiYgdGVuc29yLnJhd0RhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdy53cml0ZVRhZyhURU5TT1JfUkFXX0RBVEEsIFdpcmVUeXBlLkxFTik7XG4gICAgICAgICAgICB3LndyaXRlQnl0ZXModGVuc29yLnJhd0RhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbmFtZSAoZmllbGQgOClcbiAgICAgICAgaWYgKHRlbnNvci5uYW1lKSB7XG4gICAgICAgICAgICB3LndyaXRlVGFnKFRFTlNPUl9OQU1FLCBXaXJlVHlwZS5MRU4pO1xuICAgICAgICAgICAgdy53cml0ZVN0cmluZyh0ZW5zb3IubmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IElUZW5zb3IgfSBmcm9tIFwiLi4vLi4vY29tcHV0ZS9jb21wdXRlLmludGVyZmFjZXNcIjtcclxuaW1wb3J0IHsgT25ueE9wTm9kZSwgbWFrZVRlbnNvciwgT25ueE9wUmVnaXN0cnkgfSBmcm9tIFwiLi4vcmVnaXN0cnlcIjtcclxuaW1wb3J0IHR5cGUgeyBPbm54Tm9kZUluZm8gfSBmcm9tIFwiLi4vb25ueC10eXBlc1wiO1xyXG5cclxuZnVuY3Rpb24gdW5hcnlNYXAoaW5wOiBJVGVuc29yLCBmbjogKHg6IG51bWJlcikgPT4gbnVtYmVyKTogSVRlbnNvciB7XHJcbiAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGlucC5kYXRhLmxlbmd0aCk7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucC5kYXRhLmxlbmd0aDsgaSsrKSBvdXRbaV0gPSBmbihpbnAuZGF0YVtpXSk7XHJcbiAgICByZXR1cm4gbWFrZVRlbnNvcihvdXQsIFsuLi5pbnAuc2hhcGVdKTtcclxufVxyXG5cclxuY2xhc3MgUmVsdU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnB1dHNbMF0sICh4KSA9PiBNYXRoLm1heCgwLCB4KSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBTaWdtb2lkTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICByZXR1cm4gW3VuYXJ5TWFwKGlucHV0c1swXSwgKHgpID0+IDEgLyAoMSArIE1hdGguZXhwKC14KSkpXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgVGFuaE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnB1dHNbMF0sIE1hdGgudGFuaCldO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBMZWFreVJlbHVOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFscGhhOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKGluZm8pO1xyXG4gICAgICAgIHRoaXMuYWxwaGEgPSB0aGlzLmF0dHIoXCJhbHBoYVwiLCAwLjAxKTtcclxuICAgIH1cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGEgPSB0aGlzLmFscGhhO1xyXG4gICAgICAgIHJldHVybiBbdW5hcnlNYXAoaW5wdXRzWzBdLCAoeCkgPT4gKHggPj0gMCA/IHggOiBhICogeCkpXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQ2xpcE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgbWluID0gaW5wdXRzLmxlbmd0aCA+PSAyICYmIGlucHV0c1sxXSA/IGlucHV0c1sxXS5kYXRhWzBdIDogLUluZmluaXR5O1xyXG4gICAgICAgIGNvbnN0IG1heCA9IGlucHV0cy5sZW5ndGggPj0gMyAmJiBpbnB1dHNbMl0gPyBpbnB1dHNbMl0uZGF0YVswXSA6IEluZmluaXR5O1xyXG4gICAgICAgIHJldHVybiBbdW5hcnlNYXAoaW5wdXRzWzBdLCAoeCkgPT4gTWF0aC5taW4oTWF0aC5tYXgoeCwgbWluKSwgbWF4KSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBTb2Z0bWF4Tm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBheGlzOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKGluZm8pO1xyXG4gICAgICAgIHRoaXMuYXhpcyA9IHRoaXMuYXR0ckludChcImF4aXNcIiwgLTEpO1xyXG4gICAgfVxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgaW5wID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IHNoYXBlID0gaW5wLnNoYXBlO1xyXG4gICAgICAgIGNvbnN0IHJhbmsgPSBzaGFwZS5sZW5ndGg7XHJcbiAgICAgICAgY29uc3QgYXhpcyA9IHRoaXMuYXhpcyA8IDAgPyByYW5rICsgdGhpcy5heGlzIDogdGhpcy5heGlzO1xyXG5cclxuICAgICAgICBpZiAocmFuayA8PSAxIHx8IGF4aXMgPT09IHJhbmsgLSAxKSB7XHJcbiAgICAgICAgICAgIC8vIFNvZnRtYXggb3ZlciBsYXN0IGRpbVxyXG4gICAgICAgICAgICBjb25zdCBjb2xzID0gc2hhcGVbcmFuayAtIDFdID8/IGlucC5kYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3Qgcm93cyA9IGlucC5kYXRhLmxlbmd0aCAvIGNvbHM7XHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoaW5wLmRhdGEubGVuZ3RoKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCByb3dzOyByKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCBtYXhWYWwgPSAtSW5maW5pdHk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMrKykgbWF4VmFsID0gTWF0aC5tYXgobWF4VmFsLCBpbnAuZGF0YVtyICogY29scyArIGNdKTtcclxuICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCBjb2xzOyBjKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBvdXRbciAqIGNvbHMgKyBjXSA9IE1hdGguZXhwKGlucC5kYXRhW3IgKiBjb2xzICsgY10gLSBtYXhWYWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN1bSArPSBvdXRbciAqIGNvbHMgKyBjXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgY29sczsgYysrKSBvdXRbciAqIGNvbHMgKyBjXSAvPSBzdW07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgWy4uLnNoYXBlXSldO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBGYWxsYmFjazogZmxhdHRlbiBzb2Z0bWF4XHJcbiAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnAsICh4KSA9PiB4KV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEV4cE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnB1dHNbMF0sIE1hdGguZXhwKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIExvZ05vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnB1dHNbMF0sIE1hdGgubG9nKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFNxcnROb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIHJldHVybiBbdW5hcnlNYXAoaW5wdXRzWzBdLCBNYXRoLnNxcnQpXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQWJzTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICByZXR1cm4gW3VuYXJ5TWFwKGlucHV0c1swXSwgTWF0aC5hYnMpXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgTmVnTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICByZXR1cm4gW3VuYXJ5TWFwKGlucHV0c1swXSwgKHgpID0+IC14KV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckFjdGl2YXRpb25PcHMocmVnaXN0cnk6IE9ubnhPcFJlZ2lzdHJ5KTogdm9pZCB7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlJlbHVcIiwgKGluZm8pID0+IG5ldyBSZWx1Tm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlNpZ21vaWRcIiwgKGluZm8pID0+IG5ldyBTaWdtb2lkTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlRhbmhcIiwgKGluZm8pID0+IG5ldyBUYW5oTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkxlYWt5UmVsdVwiLCAoaW5mbykgPT4gbmV3IExlYWt5UmVsdU5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJDbGlwXCIsIChpbmZvKSA9PiBuZXcgQ2xpcE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTb2Z0bWF4XCIsIChpbmZvKSA9PiBuZXcgU29mdG1heE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJFeHBcIiwgKGluZm8pID0+IG5ldyBFeHBOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiTG9nXCIsIChpbmZvKSA9PiBuZXcgTG9nTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlNxcnRcIiwgKGluZm8pID0+IG5ldyBTcXJ0Tm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkFic1wiLCAoaW5mbykgPT4gbmV3IEFic05vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJOZWdcIiwgKGluZm8pID0+IG5ldyBOZWdOb2RlKGluZm8pKTtcclxufVxyXG4iLCJpbXBvcnQgdHlwZSB7IElUZW5zb3IgfSBmcm9tIFwiLi4vLi4vY29tcHV0ZS9jb21wdXRlLmludGVyZmFjZXNcIjtcclxuaW1wb3J0IHR5cGUgeyBPbm54Tm9kZUluZm8gfSBmcm9tIFwiLi4vb25ueC10eXBlc1wiO1xyXG5pbXBvcnQgeyBPbm54T3BOb2RlLCBtYWtlVGVuc29yLCBPbm54T3BSZWdpc3RyeSB9IGZyb20gXCIuLi9yZWdpc3RyeVwiO1xyXG5cclxuLyoqXHJcbiAqIENvbnY6IDJEIGNvbnZvbHV0aW9uLlxyXG4gKiBJbnB1dDogW04sIENfaW4sIEgsIFddIChidXQgd2Ugc3VwcG9ydCBbTiwgQ19pbiwgTF0gZm9yIDFEIGFuZCBbTiwgQ19pbiwgSCwgV10gZm9yIDJEKVxyXG4gKiBMaW1pdGVkIHRvIDJEIHRlbnNvcnMgbGF5b3V0OiBbYmF0Y2gsIGNoYW5uZWxzLCBoZWlnaHQsIHdpZHRoXSDihpIgdHJlYXRlZCBhcyBbYmF0Y2gsIGZlYXR1cmVzXS5cclxuICpcclxuICogRm9yIG91ciAyRC1saW1pdGVkIHNjb3BlOiBpbnB1dCBpcyBbMSwgQ19pbiAqIEggKiBXXSwga2VybmVsIGlzIFtDX291dCwgQ19pbiwga0gsIGtXXS5cclxuICogU2ltcGxpZmllZDogdHJlYXRzIGFzIG1hdHJpeCBtdWx0aXBseSBpZiBzaGFwZXMgYXJlIDJELlxyXG4gKi9cclxuY2xhc3MgQ29udk5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkga2VybmVsU2hhcGU6IG51bWJlcltdO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdHJpZGVzOiBudW1iZXJbXTtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFkczogbnVtYmVyW107XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmtlcm5lbFNoYXBlID0gW3RoaXMuYXR0ckludChcImtlcm5lbF9zaGFwZVwiLCAzKV07XHJcbiAgICAgICAgdGhpcy5zdHJpZGVzID0gW3RoaXMuYXR0ckludChcInN0cmlkZXNcIiwgMSldO1xyXG4gICAgICAgIHRoaXMucGFkcyA9IFt0aGlzLmF0dHJJbnQoXCJwYWRzXCIsIDApXTtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBYID0gaW5wdXRzWzBdOyAvLyBbTiwgQ19pbiwgLi4uc3BhdGlhbF1cclxuICAgICAgICBjb25zdCBXID0gaW5wdXRzWzFdOyAvLyBbQ19vdXQsIENfaW4vZ3JvdXAsIC4uLmtlcm5lbF1cclxuICAgICAgICBjb25zdCBCID0gaW5wdXRzLmxlbmd0aCA+IDIgPyBpbnB1dHNbMl0gOiBudWxsO1xyXG5cclxuICAgICAgICAvLyBTaW1wbGlmaWVkIDFEIGNvbnZvbHV0aW9uIGZvciAyRCB0ZW5zb3JzIFtiYXRjaCwgZmVhdHVyZXNdXHJcbiAgICAgICAgaWYgKFguc2hhcGUubGVuZ3RoIDw9IDIpIHtcclxuICAgICAgICAgICAgY29uc3QgZmVhdHVyZXMgPSBYLnNoYXBlLmxlbmd0aCA9PT0gMiA/IFguc2hhcGVbMV0gOiBYLmRhdGEubGVuZ3RoO1xyXG4gICAgICAgICAgICBjb25zdCBvdXRGZWF0dXJlcyA9IFcuc2hhcGVbMF0gPz8gVy5kYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBYLnNoYXBlWzBdID8/IDE7XHJcblxyXG4gICAgICAgICAgICAvLyBUcmVhdCBhcyBmdWxseSBjb25uZWN0ZWQ6IG91dCA9IFggQCBXXlQgKyBCXHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoYmF0Y2ggKiBvdXRGZWF0dXJlcyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHdDb2xzID0gVy5kYXRhLmxlbmd0aCAvIG91dEZlYXR1cmVzO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IGJhdGNoOyBuKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IG8gPSAwOyBvIDwgb3V0RmVhdHVyZXM7IG8rKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtMZW4gPSBNYXRoLm1pbih3Q29scywgZmVhdHVyZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwga0xlbjsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1bSArPSBYLmRhdGFbbiAqIGZlYXR1cmVzICsgaV0gKiBXLmRhdGFbbyAqIHdDb2xzICsgaV07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChCKSBzdW0gKz0gQi5kYXRhW28gJSBCLmRhdGEubGVuZ3RoXTtcclxuICAgICAgICAgICAgICAgICAgICBvdXRbbiAqIG91dEZlYXR1cmVzICsgb10gPSBzdW07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW2JhdGNoLCBvdXRGZWF0dXJlc10pXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIDNEOiBbTiwgQ19pbiwgTF0g4oaSIDFEIGNvbnZcclxuICAgICAgICBjb25zdCBOID0gWC5zaGFwZVswXTtcclxuICAgICAgICBjb25zdCBDX2luID0gWC5zaGFwZVsxXTtcclxuICAgICAgICBjb25zdCBMID0gWC5zaGFwZVsyXTtcclxuICAgICAgICBjb25zdCBDX291dCA9IFcuc2hhcGVbMF07XHJcbiAgICAgICAgY29uc3Qga0wgPSBXLnNoYXBlLmxlbmd0aCA+PSAzID8gVy5zaGFwZVsyXSA6IHRoaXMua2VybmVsU2hhcGVbMF07XHJcbiAgICAgICAgY29uc3Qgc3RyaWRlID0gdGhpcy5zdHJpZGVzWzBdO1xyXG4gICAgICAgIGNvbnN0IHBhZCA9IHRoaXMucGFkc1swXTtcclxuICAgICAgICBjb25zdCBvdXRMID0gTWF0aC5mbG9vcigoTCArIDIgKiBwYWQgLSBrTCkgLyBzdHJpZGUpICsgMTtcclxuXHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShOICogQ19vdXQgKiBvdXRMKTtcclxuICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IE47IG4rKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjbyA9IDA7IGNvIDwgQ19vdXQ7IGNvKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IG9sID0gMDsgb2wgPCBvdXRMOyBvbCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgY2kgPSAwOyBjaSA8IENfaW47IGNpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQga2sgPSAwOyBrayA8IGtMOyBraysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbCA9IG9sICogc3RyaWRlIC0gcGFkICsga2s7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWwgPj0gMCAmJiBpbCA8IEwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdW0gKz0gWC5kYXRhW24gKiBDX2luICogTCArIGNpICogTCArIGlsXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIFcuZGF0YVtjbyAqIChDX2luICoga0wpICsgY2kgKiBrTCArIGtrXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoQikgc3VtICs9IEIuZGF0YVtjb107XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W24gKiBDX291dCAqIG91dEwgKyBjbyAqIG91dEwgKyBvbF0gPSBzdW07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW04sIENfb3V0LCBvdXRMXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogTWF4UG9vbDogbWF4IHBvb2xpbmcgb3ZlciBsYXN0IHNwYXRpYWwgZGltZW5zaW9uKHMpLlxyXG4gKiBTdXBwb3J0cyAxRCBbTiwgQywgTF0gYW5kIDJEIGZhbGxiYWNrLlxyXG4gKi9cclxuY2xhc3MgTWF4UG9vbE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkga2VybmVsU2l6ZTogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdHJpZGU6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFkOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmtlcm5lbFNpemUgPSB0aGlzLmF0dHJJbnQoXCJrZXJuZWxfc2hhcGVcIiwgMik7XHJcbiAgICAgICAgdGhpcy5zdHJpZGUgPSB0aGlzLmF0dHJJbnQoXCJzdHJpZGVzXCIsIHRoaXMua2VybmVsU2l6ZSk7XHJcbiAgICAgICAgdGhpcy5wYWQgPSB0aGlzLmF0dHJJbnQoXCJwYWRzXCIsIDApO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF07XHJcbiAgICAgICAgaWYgKFguc2hhcGUubGVuZ3RoID09PSAzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFtOLCBDLCBMXSA9IFguc2hhcGU7XHJcbiAgICAgICAgICAgIGNvbnN0IG91dEwgPSBNYXRoLmZsb29yKChMICsgMiAqIHRoaXMucGFkIC0gdGhpcy5rZXJuZWxTaXplKSAvIHRoaXMuc3RyaWRlKSArIDE7XHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoTiAqIEMgKiBvdXRMKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgQzsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgbyA9IDA7IG8gPCBvdXRMOyBvKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1heCA9IC1JbmZpbml0eTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCB0aGlzLmtlcm5lbFNpemU7IGsrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWwgPSBvICogdGhpcy5zdHJpZGUgLSB0aGlzLnBhZCArIGs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWwgPj0gMCAmJiBpbCA8IEwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXggPSBNYXRoLm1heChtYXgsIFguZGF0YVtuICogQyAqIEwgKyBjICogTCArIGlsXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0W24gKiBDICogb3V0TCArIGMgKiBvdXRMICsgb10gPSBtYXg7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtOLCBDLCBvdXRMXSldO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyAyRCBmYWxsYmFjazogcGFzc3Rocm91Z2hcclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShYLmRhdGEpLCBbLi4uWC5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEF2ZXJhZ2VQb29sOiBhdmVyYWdlIHBvb2xpbmcuXHJcbiAqL1xyXG5jbGFzcyBBdmVyYWdlUG9vbE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkga2VybmVsU2l6ZTogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdHJpZGU6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGFkOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmtlcm5lbFNpemUgPSB0aGlzLmF0dHJJbnQoXCJrZXJuZWxfc2hhcGVcIiwgMik7XHJcbiAgICAgICAgdGhpcy5zdHJpZGUgPSB0aGlzLmF0dHJJbnQoXCJzdHJpZGVzXCIsIHRoaXMua2VybmVsU2l6ZSk7XHJcbiAgICAgICAgdGhpcy5wYWQgPSB0aGlzLmF0dHJJbnQoXCJwYWRzXCIsIDApO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF07XHJcbiAgICAgICAgaWYgKFguc2hhcGUubGVuZ3RoID09PSAzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFtOLCBDLCBMXSA9IFguc2hhcGU7XHJcbiAgICAgICAgICAgIGNvbnN0IG91dEwgPSBNYXRoLmZsb29yKChMICsgMiAqIHRoaXMucGFkIC0gdGhpcy5rZXJuZWxTaXplKSAvIHRoaXMuc3RyaWRlKSArIDE7XHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoTiAqIEMgKiBvdXRMKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgQzsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgbyA9IDA7IG8gPCBvdXRMOyBvKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN1bSA9IDAsIGNvdW50ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCB0aGlzLmtlcm5lbFNpemU7IGsrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWwgPSBvICogdGhpcy5zdHJpZGUgLSB0aGlzLnBhZCArIGs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWwgPj0gMCAmJiBpbCA8IEwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdW0gKz0gWC5kYXRhW24gKiBDICogTCArIGMgKiBMICsgaWxdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0W24gKiBDICogb3V0TCArIGMgKiBvdXRMICsgb10gPSBjb3VudCA+IDAgPyBzdW0gLyBjb3VudCA6IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtOLCBDLCBvdXRMXSldO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShYLmRhdGEpLCBbLi4uWC5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEdsb2JhbEF2ZXJhZ2VQb29sOiBhdmVyYWdlIG92ZXIgYWxsIHNwYXRpYWwgZGltcyDihpIgW04sIEMsIDFdIG9yIFtOLCBDXS5cclxuICovXHJcbmNsYXNzIEdsb2JhbEF2ZXJhZ2VQb29sTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBYID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGlmIChYLnNoYXBlLmxlbmd0aCA+PSAzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IE4gPSBYLnNoYXBlWzBdO1xyXG4gICAgICAgICAgICBjb25zdCBDID0gWC5zaGFwZVsxXTtcclxuICAgICAgICAgICAgbGV0IHNwYXRpYWwgPSAxO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8IFguc2hhcGUubGVuZ3RoOyBpKyspIHNwYXRpYWwgKj0gWC5zaGFwZVtpXTtcclxuICAgICAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShOICogQyk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgTjsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IEM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJhc2UgPSBuICogQyAqIHNwYXRpYWwgKyBjICogc3BhdGlhbDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBzID0gMDsgcyA8IHNwYXRpYWw7IHMrKykgc3VtICs9IFguZGF0YVtiYXNlICsgc107XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W24gKiBDICsgY10gPSBzdW0gLyBzcGF0aWFsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IG91dFNoYXBlID0gW04sIEMsIC4uLlguc2hhcGUuc2xpY2UoMikubWFwKCgpID0+IDEpXTtcclxuICAgICAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgb3V0U2hhcGUpXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoWC5kYXRhKSwgWy4uLlguc2hhcGVdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckNvbnZPcHMocmVnaXN0cnk6IE9ubnhPcFJlZ2lzdHJ5KTogdm9pZCB7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkNvbnZcIiwgKGluZm8pID0+IG5ldyBDb252Tm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIk1heFBvb2xcIiwgKGluZm8pID0+IG5ldyBNYXhQb29sTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkF2ZXJhZ2VQb29sXCIsIChpbmZvKSA9PiBuZXcgQXZlcmFnZVBvb2xOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiR2xvYmFsQXZlcmFnZVBvb2xcIiwgKGluZm8pID0+IG5ldyBHbG9iYWxBdmVyYWdlUG9vbE5vZGUoaW5mbykpO1xyXG59XHJcbiIsIi8qKlxuICogRG90VmlzaW9uIGN1c3RvbSBPTk5YIG9wZXJhdG9ycy5cbiAqXG4gKiBSZWdpc3RlcmVkIHVuZGVyIHRoZSBcImNvbS5kb3R2aXNpb25cIiBkb21haW4gY29udmVudGlvbiAoZW5jb2RlZCBpblxuICogdGhlIG9wX3R5cGUgbmFtZSBzaW5jZSB0aGUgcHJvdG9idWYgd3JpdGVyIGRvZXMgbm90IHlldCBzdXBwb3J0IHRoZVxuICogZG9tYWluIGZpZWxkIG9uIE5vZGVQcm90bykuXG4gKlxuICogT3BlcmF0b3JzOlxuICpcbiAqICAgY29tLmRvdHZpc2lvbi5FbnZlbG9wZUNlbnRlclxuICogICAgIFBlci13aW5kb3cgY2VudGVyaW5nIG9mIGEgcHJlLWNvbXB1dGVkIGVudmVsb3BlIHNpZ25hbC5cbiAqICAgICBTdWJ0cmFjdHMgdGhlIHBlci1jaGFubmVsIHdpbmRvdyBtZWFuLCBtdWx0aXBsaWVzIGJ5IGEgZ2FpblxuICogICAgIGZhY3Rvciwgc2hpZnRzIHRvIDAuNSwgYW5kIGNsYW1wcyB0byBbMCwgMV0uXG4gKlxuICogICAgIFRoaXMgb3AgaXMgT1BUSU9OQUwgaW4gdGhlIE9OTlggZ3JhcGguIFR3byB2YWxpZCBkZXBsb3ltZW50XG4gKiAgICAgbW9kZXMgY29leGlzdDpcbiAqXG4gKiAgICAgKEEpIEZpcm13YXJlIHN0cmVhbXMgcmF3IGVudmVsb3BlICh1bmNlbnRlcmVkKSBpbnRvIHRoZSBPTk5YXG4gKiAgICAgICAgIG1vZGVsLiBUaGUgbW9kZWwgY29udGFpbnMgRW52ZWxvcGVDZW50ZXIgYmVmb3JlIHRoZSBMU1RNLlxuICogICAgICAgICBUaGUgb3AgaGFuZGxlcyB0aGUgY2VudGVyaW5nLlxuICpcbiAqICAgICAoQikgRmlybXdhcmUgZG9lcyB0aGUgY2VudGVyaW5nIGl0c2VsZiBhbmQgZmVlZHMgdGhlIExTVE1cbiAqICAgICAgICAgZGlyZWN0bHkuIFRoZSBFbnZlbG9wZUNlbnRlciBub2RlIGlzIGFic2VudCBvciBza2lwcGVkLlxuICogICAgICAgICBCb3RoIHBhdGhzIHByb2R1Y2UgaWRlbnRpY2FsIHJlc3VsdHMuXG4gKlxuICogICAgIFRoZSBSTVMgZXh0cmFjdGlvbiBhbmQgZGVjaW1hdGlvbiBhbHdheXMgcnVuIGluIGZpcm13YXJlICh0aGV5XG4gKiAgICAgYXJlIHN0cmVhbWluZyBvcGVyYXRpb25zIHRpZWQgdG8gdGhlIEFEQyBpbnRlcnJ1cHQgbG9vcCwgbm90XG4gKiAgICAgc3VpdGFibGUgZm9yIGEgc2luZ2xlLXNob3QgT05OWCBvcCkuXG4gKlxuICogICAgIEF0dHJpYnV0ZXM6XG4gKiAgICAgICBnYWluIChmbG9hdCk6IGFtcGxpZmljYXRpb24gZmFjdG9yIChkZWZhdWx0IDYuMClcbiAqICAgICAgIHNpbmNlX3ZlcnNpb24gKGludCk6IG9wZXJhdG9yIHZlcnNpb24gKDEpXG4gKlxuICogICAgIElucHV0OiAgZW52ZWxvcGUgW1QsIENdICh1bmNlbnRlcmVkIGVudmVsb3BlLCBlLmcuLCBbNjQsIDNdKVxuICogICAgIE91dHB1dDogY2VudGVyZWQgW1QsIENdIChjZW50ZXJlZCwgY2xhbXBlZCB0byBbMCwgMV0pXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBJVGVuc29yIH0gZnJvbSBcIi4uLy4uL2NvbXB1dGUvY29tcHV0ZS5pbnRlcmZhY2VzXCI7XG5pbXBvcnQgdHlwZSB7IE9ubnhOb2RlSW5mbyB9IGZyb20gXCIuLi9vbm54LXR5cGVzXCI7XG5pbXBvcnQgeyBPbm54T3BOb2RlLCBtYWtlVGVuc29yLCBPbm54T3BSZWdpc3RyeSB9IGZyb20gXCIuLi9yZWdpc3RyeVwiO1xuXG5jb25zdCBET01BSU4gPSBcImNvbS5kb3R2aXNpb25cIjtcbmNvbnN0IFBSSU9SSVRZID0gMTAwO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEVudmVsb3BlQ2VudGVyIG9wZXJhdG9yXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuY2xhc3MgRW52ZWxvcGVDZW50ZXJOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBnYWluOiBudW1iZXI7XG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XG5cbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcbiAgICAgICAgc3VwZXIoaW5mbyk7XG4gICAgICAgIHRoaXMuZ2FpbiA9IHRoaXMuYXR0cihcImdhaW5cIiwgNi4wKTtcbiAgICB9XG5cbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcbiAgICAgICAgY29uc3QgaW5wID0gaW5wdXRzWzBdOyAvLyBbVCwgQ11cbiAgICAgICAgY29uc3QgVCA9IGlucC5zaGFwZVswXTtcbiAgICAgICAgY29uc3QgQyA9IGlucC5zaGFwZS5sZW5ndGggPiAxID8gaW5wLnNoYXBlWzFdIDogMTtcbiAgICAgICAgY29uc3QgZGF0YSA9IGlucC5kYXRhO1xuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KFQgKiBDKTtcblxuICAgICAgICBmb3IgKGxldCBjaCA9IDA7IGNoIDwgQzsgY2grKykge1xuICAgICAgICAgICAgLy8gUGVyLWNoYW5uZWwgd2luZG93IG1lYW5cbiAgICAgICAgICAgIGxldCBtZWFuID0gMDtcbiAgICAgICAgICAgIGZvciAobGV0IHQgPSAwOyB0IDwgVDsgdCsrKSB7XG4gICAgICAgICAgICAgICAgbWVhbiArPSBkYXRhW3QgKiBDICsgY2hdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWVhbiAvPSBUO1xuXG4gICAgICAgICAgICAvLyBDZW50ZXIsIGFtcGxpZnksIHNoaWZ0IHRvIDAuNSwgY2xhbXAgdG8gWzAsIDFdXG4gICAgICAgICAgICBmb3IgKGxldCB0ID0gMDsgdCA8IFQ7IHQrKykge1xuICAgICAgICAgICAgICAgIGxldCB2ID0gKGRhdGFbdCAqIEMgKyBjaF0gLSBtZWFuKSAqIHRoaXMuZ2FpbiArIDAuNTtcbiAgICAgICAgICAgICAgICBpZiAodiA8IDApIHYgPSAwO1xuICAgICAgICAgICAgICAgIGlmICh2ID4gMSkgdiA9IDE7XG4gICAgICAgICAgICAgICAgb3V0W3QgKiBDICsgY2hdID0gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtULCBDXSldO1xuICAgIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBSZWdpc3RyYXRpb25cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJEb3RWaXNpb25PcHMocmVnaXN0cnk6IE9ubnhPcFJlZ2lzdHJ5KTogdm9pZCB7XG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJjb20uZG90dmlzaW9uLkVudmVsb3BlQ2VudGVyXCIsIChpbmZvKSA9PiBuZXcgRW52ZWxvcGVDZW50ZXJOb2RlKGluZm8pLCBQUklPUklUWSwgRE9NQUlOKTtcbn1cbiIsIi8qKlxyXG4gKiBEU1Agb3BlcmF0b3JzIGZvciBhdWRpbyBwcmVwcm9jZXNzaW5nIGluIHRoZSBTcGlreVBhbmRhIE9OTlggcGlwZWxpbmUuXHJcbiAqXHJcbiAqIFRoZXNlIGFyZSBjdXN0b20gb3BzIChub3QgcGFydCBvZiBPTk5YIHN0YW5kYXJkKSB0aGF0IGVuYWJsZSBlbmQtdG8tZW5kXHJcbiAqIGF1ZGlvIGluZmVyZW5jZTogcmF3IGF1ZGlvIOKGkiBNRkNDIGZlYXR1cmVzIOKGkiBuZXVyYWwgbmV0d29yayDihpIgY2xhc3NpZmljYXRpb24uXHJcbiAqXHJcbiAqIEZGVCBpbXBsZW1lbnRhdGlvbiBwb3J0ZWQgZnJvbSBHdWlsbGF1bWUgUGVsbGV0aWVyJ3MgZHNwLmpzIChHYXVtZS9GRlRQYW5lbCkuXHJcbiAqXHJcbiAqIE9wczpcclxuICogICBTcEZGVCAgICAgICAgICAgIOKAlCBDb29sZXktVHVrZXkgcmFkaXgtMiBGRlQsIHBvd2VyIHNwZWN0cnVtIG91dHB1dFxyXG4gKiAgIFNwTWVsRmlsdGVyYmFuayAgIOKAlCBNZWwtc2NhbGUgdHJpYW5ndWxhciBmaWx0ZXJiYW5rXHJcbiAqICAgU3BMb2dTY2FsZSAgICAgICAg4oCUIEVsZW1lbnQtd2lzZSBsb2cgd2l0aCBmbG9vclxyXG4gKiAgIFNwRENUICAgICAgICAgICAgIOKAlCBUeXBlLUlJIERpc2NyZXRlIENvc2luZSBUcmFuc2Zvcm1cclxuICogICBTcE1GQ0MgICAgICAgICAgICDigJQgRnVsbCBNRkNDIHBpcGVsaW5lIChXaW5kb3cg4oaSIEZGVCDihpIgTWVsIOKGkiBMb2cg4oaSIERDVClcclxuICogICBTcFdpbmRvdyAgICAgICAgICDigJQgQXBwbHkgd2luZG93IGZ1bmN0aW9uIChIYW5uLCBIYW1taW5nLCBldGMuKVxyXG4gKiAgIFNwRFRXICAgICAgICAgICAgIOKAlCBEeW5hbWljIFRpbWUgV2FycGluZyBkaXN0YW5jZSBiZXR3ZWVuIHR3byBNRkNDIHNlcXVlbmNlc1xyXG4gKi9cclxuXHJcbmltcG9ydCB0eXBlIHsgSVRlbnNvciB9IGZyb20gXCIuLi8uLi9jb21wdXRlL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xyXG5pbXBvcnQgdHlwZSB7IE9ubnhOb2RlSW5mbyB9IGZyb20gXCIuLi9vbm54LXR5cGVzXCI7XHJcbmltcG9ydCB7IE9ubnhPcE5vZGUsIG1ha2VUZW5zb3IsIE9ubnhPcFJlZ2lzdHJ5IH0gZnJvbSBcIi4uL3JlZ2lzdHJ5XCI7XHJcblxyXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcclxuLy8gRkZUIOKAlCBDb29sZXktVHVrZXkgcmFkaXgtMiAocG9ydGVkIGZyb20gZHNwLmpzKVxyXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcclxuXHJcbmNsYXNzIEZGVEVuZ2luZSB7XHJcbiAgICByZWFkb25seSBzaXplOiBudW1iZXI7XHJcbiAgICBwcml2YXRlIHJldmVyc2VUYWJsZTogVWludDMyQXJyYXk7XHJcbiAgICBwcml2YXRlIHNpblRhYmxlOiBGbG9hdDY0QXJyYXk7XHJcbiAgICBwcml2YXRlIGNvc1RhYmxlOiBGbG9hdDY0QXJyYXk7XHJcbiAgICBwcml2YXRlIHJlYWw6IEZsb2F0NjRBcnJheTtcclxuICAgIHByaXZhdGUgaW1hZzogRmxvYXQ2NEFycmF5O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHNpemU6IG51bWJlcikge1xyXG4gICAgICAgIHRoaXMuc2l6ZSA9IHNpemU7XHJcbiAgICAgICAgdGhpcy5yZXZlcnNlVGFibGUgPSBuZXcgVWludDMyQXJyYXkoc2l6ZSk7XHJcbiAgICAgICAgdGhpcy5zaW5UYWJsZSA9IG5ldyBGbG9hdDY0QXJyYXkoc2l6ZSk7XHJcbiAgICAgICAgdGhpcy5jb3NUYWJsZSA9IG5ldyBGbG9hdDY0QXJyYXkoc2l6ZSk7XHJcbiAgICAgICAgdGhpcy5yZWFsID0gbmV3IEZsb2F0NjRBcnJheShzaXplKTtcclxuICAgICAgICB0aGlzLmltYWcgPSBuZXcgRmxvYXQ2NEFycmF5KHNpemUpO1xyXG5cclxuICAgICAgICAvLyBCdWlsZCBiaXQtcmV2ZXJzYWwgdGFibGVcclxuICAgICAgICBsZXQgbGltaXQgPSAxO1xyXG4gICAgICAgIGxldCBiaXQgPSBzaXplID4+IDE7XHJcbiAgICAgICAgd2hpbGUgKGxpbWl0IDwgc2l6ZSkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbWl0OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmV2ZXJzZVRhYmxlW2kgKyBsaW1pdF0gPSB0aGlzLnJldmVyc2VUYWJsZVtpXSArIGJpdDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsaW1pdCA8PD0gMTtcclxuICAgICAgICAgICAgYml0ID4+PSAxO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUHJlLWNvbXB1dGUgdHdpZGRsZSBmYWN0b3JzXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcclxuICAgICAgICAgICAgdGhpcy5zaW5UYWJsZVtpXSA9IE1hdGguc2luKC1NYXRoLlBJIC8gaSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29zVGFibGVbaV0gPSBNYXRoLmNvcygtTWF0aC5QSSAvIGkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEZvcndhcmQgRkZULiBSZXR1cm5zIHBvd2VyIHNwZWN0cnVtIFtzaXplLzIgKyAxXS5cclxuICAgICAqL1xyXG4gICAgZm9yd2FyZChidWZmZXI6IEZsb2F0MzJBcnJheSk6IEZsb2F0MzJBcnJheSB7XHJcbiAgICAgICAgY29uc3QgTiA9IHRoaXMuc2l6ZTtcclxuICAgICAgICBjb25zdCByZWFsID0gdGhpcy5yZWFsO1xyXG4gICAgICAgIGNvbnN0IGltYWcgPSB0aGlzLmltYWc7XHJcbiAgICAgICAgY29uc3QgcmV2ZXJzZVRhYmxlID0gdGhpcy5yZXZlcnNlVGFibGU7XHJcbiAgICAgICAgY29uc3QgY29zVGFibGUgPSB0aGlzLmNvc1RhYmxlO1xyXG4gICAgICAgIGNvbnN0IHNpblRhYmxlID0gdGhpcy5zaW5UYWJsZTtcclxuXHJcbiAgICAgICAgLy8gQml0LXJldmVyc2FsIHBlcm11dGF0aW9uXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBOOyBpKyspIHtcclxuICAgICAgICAgICAgcmVhbFtpXSA9IGJ1ZmZlcltyZXZlcnNlVGFibGVbaV1dO1xyXG4gICAgICAgICAgICBpbWFnW2ldID0gMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEJ1dHRlcmZseSBzdGFnZXNcclxuICAgICAgICBsZXQgaGFsZlNpemUgPSAxO1xyXG4gICAgICAgIHdoaWxlIChoYWxmU2l6ZSA8IE4pIHtcclxuICAgICAgICAgICAgY29uc3QgcGhhc2VTaGlmdFN0ZXBSZWFsID0gY29zVGFibGVbaGFsZlNpemVdO1xyXG4gICAgICAgICAgICBjb25zdCBwaGFzZVNoaWZ0U3RlcEltYWcgPSBzaW5UYWJsZVtoYWxmU2l6ZV07XHJcbiAgICAgICAgICAgIGxldCBjdXJyZW50UGhhc2VTaGlmdFJlYWwgPSAxO1xyXG4gICAgICAgICAgICBsZXQgY3VycmVudFBoYXNlU2hpZnRJbWFnID0gMDtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGZmdFN0ZXAgPSAwOyBmZnRTdGVwIDwgaGFsZlNpemU7IGZmdFN0ZXArKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IGkgPSBmZnRTdGVwO1xyXG4gICAgICAgICAgICAgICAgd2hpbGUgKGkgPCBOKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb2ZmID0gaSArIGhhbGZTaXplO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyID0gY3VycmVudFBoYXNlU2hpZnRSZWFsICogcmVhbFtvZmZdIC0gY3VycmVudFBoYXNlU2hpZnRJbWFnICogaW1hZ1tvZmZdO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpID0gY3VycmVudFBoYXNlU2hpZnRSZWFsICogaW1hZ1tvZmZdICsgY3VycmVudFBoYXNlU2hpZnRJbWFnICogcmVhbFtvZmZdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlYWxbb2ZmXSA9IHJlYWxbaV0gLSB0cjtcclxuICAgICAgICAgICAgICAgICAgICBpbWFnW29mZl0gPSBpbWFnW2ldIC0gdGk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVhbFtpXSArPSB0cjtcclxuICAgICAgICAgICAgICAgICAgICBpbWFnW2ldICs9IHRpO1xyXG4gICAgICAgICAgICAgICAgICAgIGkgKz0gaGFsZlNpemUgPDwgMTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnN0IHRtcFJlYWwgPSBjdXJyZW50UGhhc2VTaGlmdFJlYWw7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50UGhhc2VTaGlmdFJlYWwgPSB0bXBSZWFsICogcGhhc2VTaGlmdFN0ZXBSZWFsIC0gY3VycmVudFBoYXNlU2hpZnRJbWFnICogcGhhc2VTaGlmdFN0ZXBJbWFnO1xyXG4gICAgICAgICAgICAgICAgY3VycmVudFBoYXNlU2hpZnRJbWFnID0gdG1wUmVhbCAqIHBoYXNlU2hpZnRTdGVwSW1hZyArIGN1cnJlbnRQaGFzZVNoaWZ0SW1hZyAqIHBoYXNlU2hpZnRTdGVwUmVhbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBoYWxmU2l6ZSA8PD0gMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFBvd2VyIHNwZWN0cnVtXHJcbiAgICAgICAgY29uc3QgbkJpbnMgPSBOIC8gMiArIDE7XHJcbiAgICAgICAgY29uc3QgcG93ZXIgPSBuZXcgRmxvYXQzMkFycmF5KG5CaW5zKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5CaW5zOyBpKyspIHtcclxuICAgICAgICAgICAgcG93ZXJbaV0gPSByZWFsW2ldICogcmVhbFtpXSArIGltYWdbaV0gKiBpbWFnW2ldO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcG93ZXI7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxyXG4vLyBXaW5kb3cgZnVuY3Rpb25zIChwb3J0ZWQgZnJvbSBkc3AuanMpXHJcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxyXG5cclxuZnVuY3Rpb24gaGFubldpbmRvdyhsZW5ndGg6IG51bWJlciwgaW5kZXg6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gMC41ICogKDEgLSBNYXRoLmNvcygyICogTWF0aC5QSSAqIGluZGV4IC8gKGxlbmd0aCAtIDEpKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbW1pbmdXaW5kb3cobGVuZ3RoOiBudW1iZXIsIGluZGV4OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIDAuNTQgLSAwLjQ2ICogTWF0aC5jb3MoMiAqIE1hdGguUEkgKiBpbmRleCAvIChsZW5ndGggLSAxKSk7XHJcbn1cclxuXHJcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxyXG4vLyBNZWwgc2NhbGUgaGVscGVyc1xyXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcclxuXHJcbmZ1bmN0aW9uIGh6VG9NZWwoaHo6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gMjU5NSAqIE1hdGgubG9nMTAoMSArIGh6IC8gNzAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbWVsVG9IeihtZWw6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gNzAwICogKE1hdGgucG93KDEwLCBtZWwgLyAyNTk1KSAtIDEpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBidWlsZE1lbEZpbHRlcmJhbmsobk1lbHM6IG51bWJlciwgbkZmdDogbnVtYmVyLCBzYW1wbGVSYXRlOiBudW1iZXIpOiBGbG9hdDMyQXJyYXlbXSB7XHJcbiAgICBjb25zdCBuQmlucyA9IG5GZnQgLyAyICsgMTtcclxuICAgIGNvbnN0IG1lbE1pbiA9IGh6VG9NZWwoMCk7XHJcbiAgICBjb25zdCBtZWxNYXggPSBoelRvTWVsKHNhbXBsZVJhdGUgLyAyKTtcclxuXHJcbiAgICAvLyBNZWwtc3BhY2VkIGNlbnRlciBmcmVxdWVuY2llc1xyXG4gICAgY29uc3QgbWVsUG9pbnRzID0gbmV3IEZsb2F0MzJBcnJheShuTWVscyArIDIpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuTWVscyArIDI7IGkrKykge1xyXG4gICAgICAgIG1lbFBvaW50c1tpXSA9IG1lbE1pbiArIChtZWxNYXggLSBtZWxNaW4pICogaSAvIChuTWVscyArIDEpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENvbnZlcnQgdG8gRkZUIGJpbiBpbmRpY2VzXHJcbiAgICBjb25zdCBiaW5zID0gbmV3IEludDMyQXJyYXkobk1lbHMgKyAyKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbk1lbHMgKyAyOyBpKyspIHtcclxuICAgICAgICBiaW5zW2ldID0gTWF0aC5mbG9vcigobkZmdCArIDEpICogbWVsVG9IeihtZWxQb2ludHNbaV0pIC8gc2FtcGxlUmF0ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQnVpbGQgdHJpYW5ndWxhciBmaWx0ZXJzXHJcbiAgICBjb25zdCBmYjogRmxvYXQzMkFycmF5W10gPSBbXTtcclxuICAgIGZvciAobGV0IG0gPSAwOyBtIDwgbk1lbHM7IG0rKykge1xyXG4gICAgICAgIGNvbnN0IHJvdyA9IG5ldyBGbG9hdDMyQXJyYXkobkJpbnMpO1xyXG4gICAgICAgIGNvbnN0IGxlZnQgPSBiaW5zW21dLCBjZW50ZXIgPSBiaW5zW20gKyAxXSwgcmlnaHQgPSBiaW5zW20gKyAyXTtcclxuICAgICAgICBmb3IgKGxldCBrID0gbGVmdDsgayA8IGNlbnRlcjsgaysrKSB7XHJcbiAgICAgICAgICAgIGlmIChrID49IDAgJiYgayA8IG5CaW5zKSByb3dba10gPSAoayAtIGxlZnQpIC8gTWF0aC5tYXgoY2VudGVyIC0gbGVmdCwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZvciAobGV0IGsgPSBjZW50ZXI7IGsgPD0gcmlnaHQ7IGsrKykge1xyXG4gICAgICAgICAgICBpZiAoayA+PSAwICYmIGsgPCBuQmlucykgcm93W2tdID0gKHJpZ2h0IC0gaykgLyBNYXRoLm1heChyaWdodCAtIGNlbnRlciwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZiLnB1c2gocm93KTtcclxuICAgIH1cclxuICAgIHJldHVybiBmYjtcclxufVxyXG5cclxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcbi8vIERDVCBUeXBlLUlJXHJcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxyXG5cclxuZnVuY3Rpb24gZGN0SUkoaW5wdXQ6IEZsb2F0MzJBcnJheSwgbk91dHB1dDogbnVtYmVyKTogRmxvYXQzMkFycmF5IHtcclxuICAgIGNvbnN0IE4gPSBpbnB1dC5sZW5ndGg7XHJcbiAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KG5PdXRwdXQpO1xyXG4gICAgZm9yIChsZXQgayA9IDA7IGsgPCBuT3V0cHV0OyBrKyspIHtcclxuICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IE47IG4rKykge1xyXG4gICAgICAgICAgICBzdW0gKz0gaW5wdXRbbl0gKiBNYXRoLmNvcyhNYXRoLlBJICogayAqICgyICogbiArIDEpIC8gKDIgKiBOKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIG91dFtrXSA9IHN1bSAqIDI7IC8vIERDVC1JSSBzdGFuZGFyZCBzY2FsaW5nIGZhY3RvclxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG91dDtcclxufVxyXG5cclxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcbi8vIE9OTlggT3AgTm9kZXNcclxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcblxyXG4vLyBGRlQgZW5naW5lIGNhY2hlIChhdm9pZCByZS1jcmVhdGluZyBwZXIgZnJhbWUpXHJcbmNvbnN0IGZmdEVuZ2luZXMgPSBuZXcgTWFwPG51bWJlciwgRkZURW5naW5lPigpO1xyXG5mdW5jdGlvbiBnZXRGRlRFbmdpbmUoc2l6ZTogbnVtYmVyKTogRkZURW5naW5lIHtcclxuICAgIGxldCBlbmdpbmUgPSBmZnRFbmdpbmVzLmdldChzaXplKTtcclxuICAgIGlmICghZW5naW5lKSB7XHJcbiAgICAgICAgZW5naW5lID0gbmV3IEZGVEVuZ2luZShzaXplKTtcclxuICAgICAgICBmZnRFbmdpbmVzLnNldChzaXplLCBlbmdpbmUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGVuZ2luZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNwRkZUOiBjb21wdXRlIHBvd2VyIHNwZWN0cnVtIG9mIGEgMUQgc2lnbmFsLlxyXG4gKiBJbnB1dDogIFtzYW1wbGVzXSDigJQgdGltZS1kb21haW4gYXVkaW8gZnJhbWVcclxuICogT3V0cHV0OiBbbmZmdC8yKzFdIOKAlCBwb3dlciBzcGVjdHJ1bVxyXG4gKiBBdHRyaWJ1dGVzOiBuZmZ0IChkZWZhdWx0IDUxMilcclxuICovXHJcbmNsYXNzIFNwRkZUTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG5mZnQ6IG51bWJlcjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLm5mZnQgPSB0aGlzLmF0dHJJbnQoXCJuZmZ0XCIsIDUxMik7XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3Qgc2lnbmFsID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IGVuZ2luZSA9IGdldEZGVEVuZ2luZSh0aGlzLm5mZnQpO1xyXG5cclxuICAgICAgICAvLyBQYWQgb3IgdHJ1bmNhdGUgdG8gbmZmdFxyXG4gICAgICAgIGNvbnN0IGZyYW1lID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLm5mZnQpO1xyXG4gICAgICAgIGNvbnN0IGxlbiA9IE1hdGgubWluKHNpZ25hbC5kYXRhLmxlbmd0aCwgdGhpcy5uZmZ0KTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSBmcmFtZVtpXSA9IHNpZ25hbC5kYXRhW2ldO1xyXG5cclxuICAgICAgICBjb25zdCBwb3dlciA9IGVuZ2luZS5mb3J3YXJkKGZyYW1lKTtcclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IocG93ZXIsIFtwb3dlci5sZW5ndGhdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTcFdpbmRvdzogYXBwbHkgd2luZG93IGZ1bmN0aW9uIHRvIGF1ZGlvIGZyYW1lLlxyXG4gKiBJbnB1dDogIFtzYW1wbGVzXVxyXG4gKiBPdXRwdXQ6IFtzYW1wbGVzXVxyXG4gKiBBdHRyaWJ1dGVzOiB3aW5kb3dfdHlwZSAoMD1oYW5uLCAxPWhhbW1pbmcsIGRlZmF1bHQgMClcclxuICovXHJcbmNsYXNzIFNwV2luZG93Tm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHdpbmRvd1R5cGU6IG51bWJlcjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLndpbmRvd1R5cGUgPSB0aGlzLmF0dHJJbnQoXCJ3aW5kb3dfdHlwZVwiLCAwKTtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBpbnB1dCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGlucHV0LmRhdGEubGVuZ3RoKTtcclxuICAgICAgICBjb25zdCBOID0gaW5wdXQuZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgY29uc3Qgd2luRm4gPSB0aGlzLndpbmRvd1R5cGUgPT09IDEgPyBoYW1taW5nV2luZG93IDogaGFubldpbmRvdztcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE47IGkrKykge1xyXG4gICAgICAgICAgICBvdXRbaV0gPSBpbnB1dC5kYXRhW2ldICogd2luRm4oTiwgaSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFsuLi5pbnB1dC5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFNwTWVsRmlsdGVyYmFuazogYXBwbHkgbWVsLXNjYWxlIGZpbHRlcmJhbmsgdG8gYSBwb3dlciBzcGVjdHJ1bS5cclxuICogSW5wdXQ6ICBbbmZmdC8yKzFdIOKAlCBwb3dlciBzcGVjdHJ1bVxyXG4gKiBPdXRwdXQ6IFtuX21lbHNdIOKAlCBtZWwgZW5lcmdpZXNcclxuICogQXR0cmlidXRlczogbl9tZWxzIChkZWZhdWx0IDQwKSwgbmZmdCAoZGVmYXVsdCA1MTIpLCBzYW1wbGVfcmF0ZSAoZGVmYXVsdCAxNjAwMClcclxuICovXHJcbmNsYXNzIFNwTWVsRmlsdGVyYmFua05vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgcHJpdmF0ZSBmYjogRmxvYXQzMkFycmF5W10gfCBudWxsID0gbnVsbDtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbk1lbHM6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbmZmdDogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBzYW1wbGVSYXRlOiBudW1iZXI7XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5uTWVscyA9IHRoaXMuYXR0ckludChcIm5fbWVsc1wiLCA0MCk7XHJcbiAgICAgICAgdGhpcy5uZmZ0ID0gdGhpcy5hdHRySW50KFwibmZmdFwiLCA1MTIpO1xyXG4gICAgICAgIHRoaXMuc2FtcGxlUmF0ZSA9IHRoaXMuYXR0ckludChcInNhbXBsZV9yYXRlXCIsIDE2MDAwKTtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBpZiAoIXRoaXMuZmIpIHtcclxuICAgICAgICAgICAgdGhpcy5mYiA9IGJ1aWxkTWVsRmlsdGVyYmFuayh0aGlzLm5NZWxzLCB0aGlzLm5mZnQsIHRoaXMuc2FtcGxlUmF0ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IHNwZWN0cnVtID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IG5CaW5zID0gdGhpcy5uZmZ0IC8gMiArIDE7XHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLm5NZWxzKTtcclxuICAgICAgICBmb3IgKGxldCBtID0gMDsgbSA8IHRoaXMubk1lbHM7IG0rKykge1xyXG4gICAgICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICAgICAgY29uc3Qgcm93ID0gdGhpcy5mYlttXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBuQmluczsgaysrKSB7XHJcbiAgICAgICAgICAgICAgICBzdW0gKz0gcm93W2tdICogc3BlY3RydW0uZGF0YVtrXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvdXRbbV0gPSBzdW07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFt0aGlzLm5NZWxzXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogU3BMb2dTY2FsZTogZWxlbWVudC13aXNlIGxvZyB3aXRoIGZsb29yLlxyXG4gKiBJbnB1dDogIFtOXVxyXG4gKiBPdXRwdXQ6IFtOXVxyXG4gKiBBdHRyaWJ1dGVzOiBmbG9vciAoZGVmYXVsdCAxZS0xMClcclxuICovXHJcbmNsYXNzIFNwTG9nU2NhbGVOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmxvb3I6IG51bWJlcjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmZsb29yID0gdGhpcy5hdHRyKFwiZmxvb3JcIiwgMWUtMTApO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGlucHV0ID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoaW5wdXQuZGF0YS5sZW5ndGgpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQuZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBvdXRbaV0gPSBNYXRoLmxvZyhNYXRoLm1heChpbnB1dC5kYXRhW2ldLCB0aGlzLmZsb29yKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFsuLi5pbnB1dC5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFNwRENUOiBUeXBlLUlJIERpc2NyZXRlIENvc2luZSBUcmFuc2Zvcm0uXHJcbiAqIElucHV0OiAgW05dXHJcbiAqIE91dHB1dDogW25fb3V0cHV0XVxyXG4gKiBBdHRyaWJ1dGVzOiBuX291dHB1dCAoZGVmYXVsdCA0MClcclxuICovXHJcbmNsYXNzIFNwRENUTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG5PdXRwdXQ6IG51bWJlcjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLm5PdXRwdXQgPSB0aGlzLmF0dHJJbnQoXCJuX291dHB1dFwiLCA0MCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgaW5wdXQgPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3Qgb3V0ID0gZGN0SUkoaW5wdXQuZGF0YSwgdGhpcy5uT3V0cHV0KTtcclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbdGhpcy5uT3V0cHV0XSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogU3BNRkNDOiBjb21wbGV0ZSBNRkNDIHBpcGVsaW5lIGluIGEgc2luZ2xlIG9wLlxyXG4gKlxyXG4gKiBJbnB1dDogIFtzYW1wbGVzXSDigJQgMUQgYXVkaW8gKGUuZy4gMTYwMDAgc2FtcGxlcyA9IDEgc2Vjb25kIGF0IDE2a0h6KVxyXG4gKiBPdXRwdXQ6IFtuX21mY2MsIG5fZnJhbWVzXSDigJQgTUZDQyBmZWF0dXJlIG1hdHJpeFxyXG4gKlxyXG4gKiBBdHRyaWJ1dGVzOlxyXG4gKiAgIHNhbXBsZV9yYXRlIChkZWZhdWx0IDE2MDAwKVxyXG4gKiAgIG5fbWZjYyAoZGVmYXVsdCA0MClcclxuICogICBuX2ZmdCAoZGVmYXVsdCA1MTIpXHJcbiAqICAgaG9wX2xlbmd0aCAoZGVmYXVsdCAxNjApXHJcbiAqICAgbl9tZWxzIChkZWZhdWx0IDQwKVxyXG4gKiAgIHdpbmRvd190eXBlICgwPWhhbm4sIDE9aGFtbWluZywgZGVmYXVsdCAwKVxyXG4gKi9cclxuY2xhc3MgU3BNRkNDTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNhbXBsZVJhdGU6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbk1mY2M6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbkZmdDogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBob3BMZW5ndGg6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgbk1lbHM6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgd2luZG93VHlwZTogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSBmYjogRmxvYXQzMkFycmF5W10gfCBudWxsID0gbnVsbDtcclxuICAgIHByaXZhdGUgZmZ0RW5naW5lOiBGRlRFbmdpbmUgfCBudWxsID0gbnVsbDtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLnNhbXBsZVJhdGUgPSB0aGlzLmF0dHJJbnQoXCJzYW1wbGVfcmF0ZVwiLCAxNjAwMCk7XHJcbiAgICAgICAgdGhpcy5uTWZjYyA9IHRoaXMuYXR0ckludChcIm5fbWZjY1wiLCA0MCk7XHJcbiAgICAgICAgdGhpcy5uRmZ0ID0gdGhpcy5hdHRySW50KFwibl9mZnRcIiwgNTEyKTtcclxuICAgICAgICB0aGlzLmhvcExlbmd0aCA9IHRoaXMuYXR0ckludChcImhvcF9sZW5ndGhcIiwgMTYwKTtcclxuICAgICAgICB0aGlzLm5NZWxzID0gdGhpcy5hdHRySW50KFwibl9tZWxzXCIsIDQwKTtcclxuICAgICAgICB0aGlzLndpbmRvd1R5cGUgPSB0aGlzLmF0dHJJbnQoXCJ3aW5kb3dfdHlwZVwiLCAwKTtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBhdWRpbyA9IGlucHV0c1swXS5kYXRhO1xyXG4gICAgICAgIGNvbnN0IG5GcmFtZXMgPSBNYXRoLmZsb29yKChhdWRpby5sZW5ndGggLSB0aGlzLm5GZnQpIC8gdGhpcy5ob3BMZW5ndGgpICsgMTtcclxuXHJcbiAgICAgICAgLy8gTGF6eSBpbml0XHJcbiAgICAgICAgaWYgKCF0aGlzLmZiKSB0aGlzLmZiID0gYnVpbGRNZWxGaWx0ZXJiYW5rKHRoaXMubk1lbHMsIHRoaXMubkZmdCwgdGhpcy5zYW1wbGVSYXRlKTtcclxuICAgICAgICBpZiAoIXRoaXMuZmZ0RW5naW5lKSB0aGlzLmZmdEVuZ2luZSA9IGdldEZGVEVuZ2luZSh0aGlzLm5GZnQpO1xyXG5cclxuICAgICAgICBjb25zdCB3aW5GbiA9IHRoaXMud2luZG93VHlwZSA9PT0gMSA/IGhhbW1pbmdXaW5kb3cgOiBoYW5uV2luZG93O1xyXG4gICAgICAgIGNvbnN0IG5CaW5zID0gdGhpcy5uRmZ0IC8gMiArIDE7XHJcbiAgICAgICAgY29uc3QgbWZjYyA9IG5ldyBGbG9hdDMyQXJyYXkodGhpcy5uTWZjYyAqIG5GcmFtZXMpO1xyXG5cclxuICAgICAgICBjb25zdCBmcmFtZSA9IG5ldyBGbG9hdDMyQXJyYXkodGhpcy5uRmZ0KTtcclxuICAgICAgICBjb25zdCBtZWxTcGVjID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLm5NZWxzKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCBuRnJhbWVzOyB0KyspIHtcclxuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSB0ICogdGhpcy5ob3BMZW5ndGg7XHJcblxyXG4gICAgICAgICAgICAvLyBXaW5kb3dcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm5GZnQ7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gc3RhcnQgKyBpO1xyXG4gICAgICAgICAgICAgICAgZnJhbWVbaV0gPSBpZHggPCBhdWRpby5sZW5ndGggPyBhdWRpb1tpZHhdICogd2luRm4odGhpcy5uRmZ0LCBpKSA6IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEZGVCDihpIgcG93ZXIgc3BlY3RydW1cclxuICAgICAgICAgICAgY29uc3QgcG93ZXIgPSB0aGlzLmZmdEVuZ2luZS5mb3J3YXJkKGZyYW1lKTtcclxuXHJcbiAgICAgICAgICAgIC8vIE1lbCBmaWx0ZXJiYW5rXHJcbiAgICAgICAgICAgIGZvciAobGV0IG0gPSAwOyBtIDwgdGhpcy5uTWVsczsgbSsrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IHRoaXMuZmJbbV07XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrID0gMDsgayA8IG5CaW5zOyBrKyspIHN1bSArPSByb3dba10gKiBwb3dlcltrXTtcclxuICAgICAgICAgICAgICAgIG1lbFNwZWNbbV0gPSBNYXRoLmxvZyhNYXRoLm1heChzdW0sIDFlLTEwKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIERDVCDihpIgTUZDQ1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IHRoaXMubk1mY2M7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBtID0gMDsgbSA8IHRoaXMubk1lbHM7IG0rKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHN1bSArPSBtZWxTcGVjW21dICogTWF0aC5jb3MoTWF0aC5QSSAqIGMgKiAoMiAqIG0gKyAxKSAvICgyICogdGhpcy5uTWVscykpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbWZjY1tjICogbkZyYW1lcyArIHRdID0gc3VtO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobWZjYywgW3RoaXMubk1mY2MsIG5GcmFtZXNdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxyXG4vLyBEVFcg4oCUIER5bmFtaWMgVGltZSBXYXJwaW5nXHJcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxyXG5cclxuLyoqXHJcbiAqIEV1Y2xpZGVhbiBkaXN0YW5jZSBiZXR3ZWVuIHR3byBmcmFtZXMgZXh0cmFjdGVkIGZyb20gW25fZmVhdHVyZXMsIG5fZnJhbWVzXVxyXG4gKiBwYWNrZWQgRmxvYXQzMkFycmF5cy5cclxuICovXHJcbmZ1bmN0aW9uIGZyYW1lRGlzdChcclxuICAgIGE6IEZsb2F0MzJBcnJheSwgZnJhbWVBOiBudW1iZXIsIG5GcmFtZXNBOiBudW1iZXIsXHJcbiAgICBiOiBGbG9hdDMyQXJyYXksIGZyYW1lQjogbnVtYmVyLCBuRnJhbWVzQjogbnVtYmVyLFxyXG4gICAgbkZlYXR1cmVzOiBudW1iZXIsXHJcbik6IG51bWJlciB7XHJcbiAgICBsZXQgc3VtID0gMDtcclxuICAgIGZvciAobGV0IGYgPSAwOyBmIDwgbkZlYXR1cmVzOyBmKyspIHtcclxuICAgICAgICBjb25zdCBkID0gYVtmICogbkZyYW1lc0EgKyBmcmFtZUFdIC0gYltmICogbkZyYW1lc0IgKyBmcmFtZUJdO1xyXG4gICAgICAgIHN1bSArPSBkICogZDtcclxuICAgIH1cclxuICAgIHJldHVybiBNYXRoLnNxcnQoc3VtKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERUVyB3aXRoIG9wdGlvbmFsIFNha29lLUNoaWJhIGJhbmQgY29uc3RyYWludC5cclxuICogUmV0dXJucyB0aGUgYWNjdW11bGF0ZWQgY29zdCBhdCB0aGUgZW5kIG9mIHRoZSBvcHRpbWFsIHdhcnBpbmcgcGF0aC5cclxuICogV2hlbiBub3JtYWxpemU9dHJ1ZSB0aGUgY29zdCBpcyBkaXZpZGVkIGJ5IChuK20pIHRvIGJlIGxlbmd0aC1pbmRlcGVuZGVudC5cclxuICovXHJcbmZ1bmN0aW9uIGR0dyhcclxuICAgIGxpdmU6IEZsb2F0MzJBcnJheSwgbkZyYW1lc0xpdmU6IG51bWJlcixcclxuICAgIHRtcGw6IEZsb2F0MzJBcnJheSwgbkZyYW1lc1RtcGw6IG51bWJlcixcclxuICAgIG5GZWF0dXJlczogbnVtYmVyLFxyXG4gICAgYmFuZDogbnVtYmVyLCAgICAgICAvLyBTYWtvZS1DaGliYSByYWRpdXMsIC0xID0gbm8gY29uc3RyYWludFxyXG4gICAgbm9ybWFsaXplOiBib29sZWFuLFxyXG4pOiBudW1iZXIge1xyXG4gICAgY29uc3QgbiA9IG5GcmFtZXNMaXZlO1xyXG4gICAgY29uc3QgbSA9IG5GcmFtZXNUbXBsO1xyXG4gICAgY29uc3QgSU5GID0gSW5maW5pdHk7XHJcblxyXG4gICAgLy8gQ29zdCBtYXRyaXggc3RvcmVkIHJvdy1tYWpvcjogY29zdFtpKm0gKyBqXVxyXG4gICAgY29uc3QgY29zdCA9IG5ldyBGbG9hdDMyQXJyYXkobiAqIG0pLmZpbGwoSU5GKTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgbTsgaisrKSB7XHJcbiAgICAgICAgICAgIC8vIFNha29lLUNoaWJhIGJhbmRcclxuICAgICAgICAgICAgaWYgKGJhbmQgPj0gMCAmJiBNYXRoLmFicyhpIC0gaikgPiBiYW5kKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGQgPSBmcmFtZURpc3QobGl2ZSwgaSwgbiwgdG1wbCwgaiwgbSwgbkZlYXR1cmVzKTtcclxuICAgICAgICAgICAgY29uc3QgdG9wICA9IGkgPiAwID8gY29zdFsoaSAtIDEpICogbSArIGpdIDogSU5GO1xyXG4gICAgICAgICAgICBjb25zdCBsZWZ0ID0gaiA+IDAgPyBjb3N0W2kgKiBtICsgKGogLSAxKV0gOiBJTkY7XHJcbiAgICAgICAgICAgIGNvbnN0IGRpYWcgPSAoaSA+IDAgJiYgaiA+IDApID8gY29zdFsoaSAtIDEpICogbSArIChqIC0gMSldIDogSU5GO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgcHJldiA9IChpID09PSAwICYmIGogPT09IDApID8gMCA6IE1hdGgubWluKHRvcCwgbGVmdCwgZGlhZyk7XHJcbiAgICAgICAgICAgIGNvc3RbaSAqIG0gKyBqXSA9IGQgKyAocHJldiA9PT0gSU5GID8gMCA6IHByZXYpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByYXcgPSBjb3N0WyhuIC0gMSkgKiBtICsgKG0gLSAxKV07XHJcbiAgICByZXR1cm4gbm9ybWFsaXplID8gcmF3IC8gKG4gKyBtKSA6IHJhdztcclxufVxyXG5cclxuLyoqXHJcbiAqIFNwRFRXOiBEeW5hbWljIFRpbWUgV2FycGluZyBkaXN0YW5jZSBiZXR3ZWVuIHR3byBNRkNDIHNlcXVlbmNlcy5cclxuICpcclxuICogVHlwaWNhbCB1c2U6IGRldGVjdCBhIHNwb2tlbiBuYW1lIGJ5IGNvbXBhcmluZyBpbmNvbWluZyBhdWRpbyBhZ2FpbnN0IGFcclxuICogcGVyLWFzc2V0IGVucm9sbGVkIHRlbXBsYXRlLiAgQSBsb3cgZGlzdGFuY2UgbWVhbnMgdGhlIHNlcXVlbmNlcyBtYXRjaC5cclxuICpcclxuICogSW5wdXRzOlxyXG4gKiAgIFswXSAgbGl2ZSAgICAg4oCUIE1GQ0Mgb2YgaW5jb21pbmcgYXVkaW8gICAgIFtuX2ZlYXR1cmVzLCBuX2ZyYW1lc19saXZlXVxyXG4gKiAgIFsxXSAgdGVtcGxhdGUg4oCUIE1GQ0Mgb2YgZW5yb2xsZWQgcmVmZXJlbmNlIFtuX2ZlYXR1cmVzLCBuX2ZyYW1lc190ZW1wbGF0ZV1cclxuICpcclxuICogT3V0cHV0OiBbMV0g4oCUIERUVyBkaXN0YW5jZSAobG93ZXIgPSBjbG9zZXIgbWF0Y2gpXHJcbiAqXHJcbiAqIEF0dHJpYnV0ZXM6XHJcbiAqICAgbm9ybWFsaXplICAoMD1yYXcsIDE9ZGl2aWRlIGJ5IG4rbSwgIGRlZmF1bHQgMSlcclxuICogICBiYW5kICAgICAgIChTYWtvZS1DaGliYSByYWRpdXMsIC0xPW5vIGNvbnN0cmFpbnQsIGRlZmF1bHQgLTEpXHJcbiAqL1xyXG5jbGFzcyBTcERUV05vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBub3JtYWxpemU6IGJvb2xlYW47XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGJhbmQ6IG51bWJlcjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLm5vcm1hbGl6ZSA9IHRoaXMuYXR0ckludChcIm5vcm1hbGl6ZVwiLCAxKSAhPT0gMDtcclxuICAgICAgICB0aGlzLmJhbmQgPSB0aGlzLmF0dHJJbnQoXCJiYW5kXCIsIC0xKTtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBsaXZlID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IHRtcGwgPSBpbnB1dHNbMV07XHJcblxyXG4gICAgICAgIC8vIEJvdGggaW5wdXRzIG11c3QgYmUgW25fZmVhdHVyZXMsIG5fZnJhbWVzXSDigJQgc2FtZSBmZWF0dXJlIGRpbWVuc2lvblxyXG4gICAgICAgIGNvbnN0IG5GZWF0dXJlcyA9IGxpdmUuc2hhcGVbMF07XHJcbiAgICAgICAgY29uc3QgbkZyYW1lc0xpdmUgPSBsaXZlLnNoYXBlWzFdID8/IDE7XHJcbiAgICAgICAgY29uc3QgbkZyYW1lc1RtcGwgPSB0bXBsLnNoYXBlWzFdID8/IDE7XHJcblxyXG4gICAgICAgIGNvbnN0IGRpc3RhbmNlID0gZHR3KFxyXG4gICAgICAgICAgICBsaXZlLmRhdGEsIG5GcmFtZXNMaXZlLFxyXG4gICAgICAgICAgICB0bXBsLmRhdGEsIG5GcmFtZXNUbXBsLFxyXG4gICAgICAgICAgICBuRmVhdHVyZXMsXHJcbiAgICAgICAgICAgIHRoaXMuYmFuZCxcclxuICAgICAgICAgICAgdGhpcy5ub3JtYWxpemUsXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoW2Rpc3RhbmNlXSksIFsxXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcclxuLy8gRW5yb2xsbWVudCB1dGlsaXR5XHJcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNZmNjUGFyYW1zIHtcclxuICAgIHNhbXBsZVJhdGU/OiBudW1iZXI7ICAgLy8gZGVmYXVsdCAxNjAwMFxyXG4gICAgbk1mY2M/OiBudW1iZXI7ICAgICAgICAvLyBkZWZhdWx0IDQwXHJcbiAgICBuRmZ0PzogbnVtYmVyOyAgICAgICAgIC8vIGRlZmF1bHQgNTEyXHJcbiAgICBob3BMZW5ndGg/OiBudW1iZXI7ICAgIC8vIGRlZmF1bHQgMTYwXHJcbiAgICBuTWVscz86IG51bWJlcjsgICAgICAgIC8vIGRlZmF1bHQgNDBcclxuICAgIHdpbmRvd1R5cGU/OiBudW1iZXI7ICAgLy8gMD1oYW5uLCAxPWhhbW1pbmcsIGRlZmF1bHQgMFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIER0d1RlbXBsYXRlIHtcclxuICAgIGRhdGE6IEZsb2F0MzJBcnJheTsgICAgLy8gW25fbWZjYywgbl9mcmFtZXNdXHJcbiAgICBzaGFwZTogW251bWJlciwgbnVtYmVyXTtcclxuICAgIHBhcmFtczogUmVxdWlyZWQ8TWZjY1BhcmFtcz47XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb21wdXRlIE1GQ0MgZm9yIGEgc2luZ2xlIHJhdyBhdWRpbyBidWZmZXIgdXNpbmcgdGhlIHNhbWUgaW50ZXJuYWxcclxuICogcGlwZWxpbmUgYXMgU3BNRkNDLiAgUmV0dXJucyBbbl9tZmNjLCBuX2ZyYW1lc10uXHJcbiAqL1xyXG5mdW5jdGlvbiBtZmNjRnJvbUF1ZGlvKGF1ZGlvOiBGbG9hdDMyQXJyYXksIHA6IFJlcXVpcmVkPE1mY2NQYXJhbXM+KTogeyBkYXRhOiBGbG9hdDMyQXJyYXk7IG5GcmFtZXM6IG51bWJlciB9IHtcclxuICAgIGNvbnN0IG5GcmFtZXMgPSBNYXRoLmZsb29yKChhdWRpby5sZW5ndGggLSBwLm5GZnQpIC8gcC5ob3BMZW5ndGgpICsgMTtcclxuICAgIGlmICghbWZjY0Zyb21BdWRpby5fZmIpIHsgLyogbGF6eSBpbml0IGJlbG93ICovIH1cclxuXHJcbiAgICBjb25zdCBmYiA9IGJ1aWxkTWVsRmlsdGVyYmFuayhwLm5NZWxzLCBwLm5GZnQsIHAuc2FtcGxlUmF0ZSk7XHJcbiAgICBjb25zdCBlbmdpbmUgPSBnZXRGRlRFbmdpbmUocC5uRmZ0KTtcclxuICAgIGNvbnN0IHdpbkZuID0gcC53aW5kb3dUeXBlID09PSAxID8gaGFtbWluZ1dpbmRvdyA6IGhhbm5XaW5kb3c7XHJcbiAgICBjb25zdCBuQmlucyA9IHAubkZmdCAvIDIgKyAxO1xyXG4gICAgY29uc3QgbWZjYyA9IG5ldyBGbG9hdDMyQXJyYXkocC5uTWZjYyAqIG5GcmFtZXMpO1xyXG4gICAgY29uc3QgZnJhbWUgPSBuZXcgRmxvYXQzMkFycmF5KHAubkZmdCk7XHJcbiAgICBjb25zdCBtZWxTcGVjID0gbmV3IEZsb2F0MzJBcnJheShwLm5NZWxzKTtcclxuXHJcbiAgICBmb3IgKGxldCB0ID0gMDsgdCA8IG5GcmFtZXM7IHQrKykge1xyXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gdCAqIHAuaG9wTGVuZ3RoO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcC5uRmZ0OyBpKyspIHtcclxuICAgICAgICAgICAgY29uc3QgaWR4ID0gc3RhcnQgKyBpO1xyXG4gICAgICAgICAgICBmcmFtZVtpXSA9IGlkeCA8IGF1ZGlvLmxlbmd0aCA/IGF1ZGlvW2lkeF0gKiB3aW5GbihwLm5GZnQsIGkpIDogMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgcG93ZXIgPSBlbmdpbmUuZm9yd2FyZChmcmFtZSk7XHJcbiAgICAgICAgZm9yIChsZXQgbSA9IDA7IG0gPCBwLm5NZWxzOyBtKyspIHtcclxuICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgbkJpbnM7IGsrKykgc3VtICs9IGZiW21dW2tdICogcG93ZXJba107XHJcbiAgICAgICAgICAgIG1lbFNwZWNbbV0gPSBNYXRoLmxvZyhNYXRoLm1heChzdW0sIDFlLTEwKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgcC5uTWZjYzsgYysrKSB7XHJcbiAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBtID0gMDsgbSA8IHAubk1lbHM7IG0rKykge1xyXG4gICAgICAgICAgICAgICAgc3VtICs9IG1lbFNwZWNbbV0gKiBNYXRoLmNvcyhNYXRoLlBJICogYyAqICgyICogbSArIDEpIC8gKDIgKiBwLm5NZWxzKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbWZjY1tjICogbkZyYW1lcyArIHRdID0gc3VtO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB7IGRhdGE6IG1mY2MsIG5GcmFtZXMgfTtcclxufVxyXG4vLyB0cyByZXF1aXJlcyBwcm9wZXJ0eSB0byBleGlzdCBmb3IgdGhlIGxhenktaW5pdCB0cmljayBhYm92ZVxyXG5tZmNjRnJvbUF1ZGlvLl9mYiA9IG51bGwgYXMgbnVsbDtcclxuXHJcbi8qKlxyXG4gKiBMaW5lYXJseSByZXNhbXBsZSBhbiBNRkNDIG1hdHJpeCBbbl9tZmNjLCBzcmNGcmFtZXNdIHRvIFtuX21mY2MsIGRzdEZyYW1lc10uXHJcbiAqIFVzZWQgdG8gbm9ybWFsaXplIGZyYW1lIGNvdW50cyBiZWZvcmUgYXZlcmFnaW5nIG11bHRpcGxlIGVucm9sbG1lbnQgc2FtcGxlcy5cclxuICovXHJcbmZ1bmN0aW9uIHJlc2FtcGxlTWZjYyhzcmM6IEZsb2F0MzJBcnJheSwgbk1mY2M6IG51bWJlciwgc3JjRnJhbWVzOiBudW1iZXIsIGRzdEZyYW1lczogbnVtYmVyKTogRmxvYXQzMkFycmF5IHtcclxuICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkobk1mY2MgKiBkc3RGcmFtZXMpO1xyXG4gICAgZm9yIChsZXQgdCA9IDA7IHQgPCBkc3RGcmFtZXM7IHQrKykge1xyXG4gICAgICAgIGNvbnN0IHNyY1QgPSB0ICogKHNyY0ZyYW1lcyAtIDEpIC8gTWF0aC5tYXgoZHN0RnJhbWVzIC0gMSwgMSk7XHJcbiAgICAgICAgY29uc3QgbG8gPSBNYXRoLmZsb29yKHNyY1QpO1xyXG4gICAgICAgIGNvbnN0IGhpID0gTWF0aC5taW4obG8gKyAxLCBzcmNGcmFtZXMgLSAxKTtcclxuICAgICAgICBjb25zdCBmcmFjID0gc3JjVCAtIGxvO1xyXG4gICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgbk1mY2M7IGMrKykge1xyXG4gICAgICAgICAgICBvdXRbYyAqIGRzdEZyYW1lcyArIHRdID1cclxuICAgICAgICAgICAgICAgIHNyY1tjICogc3JjRnJhbWVzICsgbG9dICogKDEgLSBmcmFjKSArXHJcbiAgICAgICAgICAgICAgICBzcmNbYyAqIHNyY0ZyYW1lcyArIGhpXSAqIGZyYWM7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG91dDtcclxufVxyXG5cclxuLyoqXHJcbiAqIEVucm9sbCBhIG5hbWUgZnJvbSBvbmUgb3IgbW9yZSByYXcgYXVkaW8gcmVjb3JkaW5ncy5cclxuICpcclxuICogRWFjaCBzYW1wbGUgaXMgcHJvY2Vzc2VkIHRocm91Z2ggdGhlIE1GQ0MgcGlwZWxpbmUsIHJlc2FtcGxlZCB0byB0aGVcclxuICogbWVkaWFuIGZyYW1lIGNvdW50LCB0aGVuIGF2ZXJhZ2VkIGVsZW1lbnQtd2lzZSB0byBwcm9kdWNlIGEgc2luZ2xlXHJcbiAqIHJvYnVzdCB0ZW1wbGF0ZSByZWFkeSB0byBiZSBpbmplY3RlZCBpbnRvIFNwRFRXIGFzIGlucHV0WzFdLlxyXG4gKlxyXG4gKiBAcGFyYW0gc2FtcGxlcyAgIE9uZSBvciBtb3JlIEZsb2F0MzJBcnJheSBvZiByYXcgUENNIGF1ZGlvIChzYW1lIHNhbXBsZSByYXRlKVxyXG4gKiBAcGFyYW0gcGFyYW1zICAgIE1GQ0MgcGFyYW1ldGVycyDigJQgbXVzdCBtYXRjaCB0aG9zZSB1c2VkIGR1cmluZyBpbmZlcmVuY2VcclxuICogQHJldHVybnMgICAgICAgICBEdHdUZW1wbGF0ZSByZWFkeSBmb3IgdXNlIHdpdGggaW5qZWN0VGVtcGxhdGUoKVxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBjb25zdCB0ZW1wbGF0ZSA9IGVucm9sbChbcmVjb3JkaW5nMSwgcmVjb3JkaW5nMl0sIHsgc2FtcGxlUmF0ZTogMTYwMDAgfSk7XHJcbiAqIC8vIEF0IGluZmVyZW5jZSB0aW1lOlxyXG4gKiBleHRlcm5hbElucHV0cy5zZXQoXCJkdHdfdGVtcGxhdGVcIiwgaW5qZWN0VGVtcGxhdGUodGVtcGxhdGUpKTtcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBlbnJvbGwoc2FtcGxlczogRmxvYXQzMkFycmF5W10sIHBhcmFtczogTWZjY1BhcmFtcyA9IHt9KTogRHR3VGVtcGxhdGUge1xyXG4gICAgaWYgKHNhbXBsZXMubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoXCJlbnJvbGw6IGF0IGxlYXN0IG9uZSBzYW1wbGUgcmVxdWlyZWRcIik7XHJcblxyXG4gICAgY29uc3QgcDogUmVxdWlyZWQ8TWZjY1BhcmFtcz4gPSB7XHJcbiAgICAgICAgc2FtcGxlUmF0ZTogcGFyYW1zLnNhbXBsZVJhdGUgPz8gMTYwMDAsXHJcbiAgICAgICAgbk1mY2M6ICAgICAgcGFyYW1zLm5NZmNjICAgICAgPz8gNDAsXHJcbiAgICAgICAgbkZmdDogICAgICAgcGFyYW1zLm5GZnQgICAgICAgPz8gNTEyLFxyXG4gICAgICAgIGhvcExlbmd0aDogIHBhcmFtcy5ob3BMZW5ndGggID8/IDE2MCxcclxuICAgICAgICBuTWVsczogICAgICBwYXJhbXMubk1lbHMgICAgICA/PyA0MCxcclxuICAgICAgICB3aW5kb3dUeXBlOiBwYXJhbXMud2luZG93VHlwZSA/PyAwLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBDb21wdXRlIE1GQ0MgZm9yIGVhY2ggc2FtcGxlXHJcbiAgICBjb25zdCBjb21wdXRlZCA9IHNhbXBsZXMubWFwKChzKSA9PiBtZmNjRnJvbUF1ZGlvKHMsIHApKTtcclxuXHJcbiAgICAvLyBOb3JtYWxpemUgdG8gbWVkaWFuIGZyYW1lIGNvdW50XHJcbiAgICBjb25zdCBmcmFtZUNvdW50cyA9IGNvbXB1dGVkLm1hcCgoYykgPT4gYy5uRnJhbWVzKS5zb3J0KChhLCBiKSA9PiBhIC0gYik7XHJcbiAgICBjb25zdCB0YXJnZXRGcmFtZXMgPSBmcmFtZUNvdW50c1tNYXRoLmZsb29yKGZyYW1lQ291bnRzLmxlbmd0aCAvIDIpXTtcclxuXHJcbiAgICAvLyBSZXNhbXBsZSBhbmQgYXZlcmFnZVxyXG4gICAgY29uc3QgYXZnID0gbmV3IEZsb2F0MzJBcnJheShwLm5NZmNjICogdGFyZ2V0RnJhbWVzKTtcclxuICAgIGZvciAoY29uc3QgeyBkYXRhLCBuRnJhbWVzIH0gb2YgY29tcHV0ZWQpIHtcclxuICAgICAgICBjb25zdCByZXNhbXBsZWQgPSBuRnJhbWVzID09PSB0YXJnZXRGcmFtZXNcclxuICAgICAgICAgICAgPyBkYXRhXHJcbiAgICAgICAgICAgIDogcmVzYW1wbGVNZmNjKGRhdGEsIHAubk1mY2MsIG5GcmFtZXMsIHRhcmdldEZyYW1lcyk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhdmcubGVuZ3RoOyBpKyspIGF2Z1tpXSArPSByZXNhbXBsZWRbaV07XHJcbiAgICB9XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGF2Zy5sZW5ndGg7IGkrKykgYXZnW2ldIC89IHNhbXBsZXMubGVuZ3RoO1xyXG5cclxuICAgIHJldHVybiB7IGRhdGE6IGF2Zywgc2hhcGU6IFtwLm5NZmNjLCB0YXJnZXRGcmFtZXNdLCBwYXJhbXM6IHAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNlcmlhbGl6ZSBhIER0d1RlbXBsYXRlIHRvIGEgcGxhaW4gSlNPTi1zYWZlIG9iamVjdCBmb3Igc3RvcmFnZVxyXG4gKiAobG9jYWxTdG9yYWdlLCBJbmRleGVkREIsIGFzc2V0IGNvbmZpZyBmaWxlLCBldGMuKS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVUZW1wbGF0ZSh0OiBEdHdUZW1wbGF0ZSk6IHsgZGF0YTogbnVtYmVyW107IHNoYXBlOiBbbnVtYmVyLCBudW1iZXJdOyBwYXJhbXM6IFJlcXVpcmVkPE1mY2NQYXJhbXM+IH0ge1xyXG4gICAgcmV0dXJuIHsgZGF0YTogQXJyYXkuZnJvbSh0LmRhdGEpLCBzaGFwZTogdC5zaGFwZSwgcGFyYW1zOiB0LnBhcmFtcyB9O1xyXG59XHJcblxyXG4vKipcclxuICogRGVzZXJpYWxpemUgYSBzdG9yZWQgdGVtcGxhdGUgYmFjayB0byBhIER0d1RlbXBsYXRlLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGRlc2VyaWFsaXplVGVtcGxhdGUocmF3OiBSZXR1cm5UeXBlPHR5cGVvZiBzZXJpYWxpemVUZW1wbGF0ZT4pOiBEdHdUZW1wbGF0ZSB7XHJcbiAgICByZXR1cm4geyBkYXRhOiBuZXcgRmxvYXQzMkFycmF5KHJhdy5kYXRhKSwgc2hhcGU6IHJhdy5zaGFwZSwgcGFyYW1zOiByYXcucGFyYW1zIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBXcmFwIGEgRHR3VGVtcGxhdGUgYXMgYW4gSVRlbnNvciByZWFkeSB0byBpbmplY3QgaW50byBncmFwaC5ydW4oKVxyXG4gKiBhcyB0aGUgXCJkdHdfdGVtcGxhdGVcIiBleHRlcm5hbCBpbnB1dC5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB0ZW1wbGF0ZVRvVGVuc29yKHQ6IER0d1RlbXBsYXRlKTogSVRlbnNvciB7XHJcbiAgICByZXR1cm4geyBkYXRhOiB0LmRhdGEsIHNoYXBlOiBbLi4udC5zaGFwZV0gfTtcclxufVxyXG5cclxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcbi8vIFJlZ2lzdHJhdGlvblxyXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckRzcE9wcyhyZWdpc3RyeTogT25ueE9wUmVnaXN0cnkpOiB2b2lkIHtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiU3BGRlRcIiwgKGluZm8pID0+IG5ldyBTcEZGVE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTcFdpbmRvd1wiLCAoaW5mbykgPT4gbmV3IFNwV2luZG93Tm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlNwTWVsRmlsdGVyYmFua1wiLCAoaW5mbykgPT4gbmV3IFNwTWVsRmlsdGVyYmFua05vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTcExvZ1NjYWxlXCIsIChpbmZvKSA9PiBuZXcgU3BMb2dTY2FsZU5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTcERDVFwiLCAoaW5mbykgPT4gbmV3IFNwRENUTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlNwTUZDQ1wiLCAoaW5mbykgPT4gbmV3IFNwTUZDQ05vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTcERUV1wiLCAoaW5mbykgPT4gbmV3IFNwRFRXTm9kZShpbmZvKSk7XHJcbn1cclxuIiwiZXhwb3J0IHsgcmVnaXN0ZXJNYXRoT3BzIH0gZnJvbSBcIi4vbWF0aFwiO1xyXG5leHBvcnQgeyByZWdpc3RlckFjdGl2YXRpb25PcHMgfSBmcm9tIFwiLi9hY3RpdmF0aW9uc1wiO1xyXG5leHBvcnQgeyByZWdpc3Rlck1hdHJpeE9wcyB9IGZyb20gXCIuL21hdHJpeFwiO1xyXG5leHBvcnQgeyByZWdpc3RlckNvbnZPcHMgfSBmcm9tIFwiLi9jb252XCI7XHJcbmV4cG9ydCB7IHJlZ2lzdGVyTm9ybU9wcyB9IGZyb20gXCIuL25vcm1hbGl6YXRpb25cIjtcclxuZXhwb3J0IHsgcmVnaXN0ZXJSZWN1cnJlbnRPcHMgfSBmcm9tIFwiLi9yZWN1cnJlbnRcIjtcclxuZXhwb3J0IHsgcmVnaXN0ZXJNaXNjT3BzIH0gZnJvbSBcIi4vbWlzY1wiO1xyXG5leHBvcnQgeyByZWdpc3RlclNwaWt5UGFuZGFPcHMgfSBmcm9tIFwiLi9zcGlreXBhbmRhXCI7XHJcbmV4cG9ydCB7IHJlZ2lzdGVyRG90VmlzaW9uT3BzIH0gZnJvbSBcIi4vZG90dmlzaW9uXCI7XHJcbmV4cG9ydCB7IHJlZ2lzdGVyRHNwT3BzLCBlbnJvbGwsIHNlcmlhbGl6ZVRlbXBsYXRlLCBkZXNlcmlhbGl6ZVRlbXBsYXRlLCB0ZW1wbGF0ZVRvVGVuc29yIH0gZnJvbSBcIi4vZHNwXCI7XHJcbmV4cG9ydCB0eXBlIHsgTWZjY1BhcmFtcywgRHR3VGVtcGxhdGUgfSBmcm9tIFwiLi9kc3BcIjtcclxuXHJcbmltcG9ydCB7IE9ubnhPcFJlZ2lzdHJ5IH0gZnJvbSBcIi4uL3JlZ2lzdHJ5XCI7XHJcbmltcG9ydCB7IHJlZ2lzdGVyTWF0aE9wcyB9IGZyb20gXCIuL21hdGhcIjtcclxuaW1wb3J0IHsgcmVnaXN0ZXJBY3RpdmF0aW9uT3BzIH0gZnJvbSBcIi4vYWN0aXZhdGlvbnNcIjtcclxuaW1wb3J0IHsgcmVnaXN0ZXJNYXRyaXhPcHMgfSBmcm9tIFwiLi9tYXRyaXhcIjtcclxuaW1wb3J0IHsgcmVnaXN0ZXJDb252T3BzIH0gZnJvbSBcIi4vY29udlwiO1xyXG5pbXBvcnQgeyByZWdpc3Rlck5vcm1PcHMgfSBmcm9tIFwiLi9ub3JtYWxpemF0aW9uXCI7XHJcbmltcG9ydCB7IHJlZ2lzdGVyUmVjdXJyZW50T3BzIH0gZnJvbSBcIi4vcmVjdXJyZW50XCI7XHJcbmltcG9ydCB7IHJlZ2lzdGVyTWlzY09wcyB9IGZyb20gXCIuL21pc2NcIjtcclxuaW1wb3J0IHsgcmVnaXN0ZXJTcGlreVBhbmRhT3BzIH0gZnJvbSBcIi4vc3Bpa3lwYW5kYVwiO1xyXG5pbXBvcnQgeyByZWdpc3RlckRvdFZpc2lvbk9wcyB9IGZyb20gXCIuL2RvdHZpc2lvblwiO1xyXG5pbXBvcnQgeyByZWdpc3RlckRzcE9wcyB9IGZyb20gXCIuL2RzcFwiO1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBhIHJlZ2lzdHJ5IHdpdGggYWxsIGdlbmVyaWMgT05OWCBvcHMgcmVnaXN0ZXJlZC5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEZWZhdWx0UmVnaXN0cnkoKTogT25ueE9wUmVnaXN0cnkge1xyXG4gICAgY29uc3QgcmVnaXN0cnkgPSBuZXcgT25ueE9wUmVnaXN0cnkoKTtcclxuICAgIHJlZ2lzdGVyTWF0aE9wcyhyZWdpc3RyeSk7XHJcbiAgICByZWdpc3RlckFjdGl2YXRpb25PcHMocmVnaXN0cnkpO1xyXG4gICAgcmVnaXN0ZXJNYXRyaXhPcHMocmVnaXN0cnkpO1xyXG4gICAgcmVnaXN0ZXJDb252T3BzKHJlZ2lzdHJ5KTtcclxuICAgIHJlZ2lzdGVyTm9ybU9wcyhyZWdpc3RyeSk7XHJcbiAgICByZWdpc3RlclJlY3VycmVudE9wcyhyZWdpc3RyeSk7XHJcbiAgICByZWdpc3Rlck1pc2NPcHMocmVnaXN0cnkpO1xyXG4gICAgcmVnaXN0ZXJEc3BPcHMocmVnaXN0cnkpO1xyXG4gICAgcmV0dXJuIHJlZ2lzdHJ5O1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGEgcmVnaXN0cnkgd2l0aCBhbGwgb3BzICsgU3Bpa3lQYW5kYSBuYXRpdmUgb3ZlcnJpZGVzIGF0IGhpZ2hlciBwcmlvcml0eS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTcGlreVBhbmRhUmVnaXN0cnkoKTogT25ueE9wUmVnaXN0cnkge1xyXG4gICAgY29uc3QgcmVnaXN0cnkgPSBjcmVhdGVEZWZhdWx0UmVnaXN0cnkoKTtcclxuICAgIHJlZ2lzdGVyU3Bpa3lQYW5kYU9wcyhyZWdpc3RyeSk7XHJcbiAgICByZWdpc3RlckRvdFZpc2lvbk9wcyhyZWdpc3RyeSk7XHJcbiAgICByZXR1cm4gcmVnaXN0cnk7XHJcbn1cclxuIiwiaW1wb3J0IHR5cGUgeyBJVGVuc29yIH0gZnJvbSBcIi4uLy4uL2NvbXB1dGUvY29tcHV0ZS5pbnRlcmZhY2VzXCI7XHJcbmltcG9ydCB0eXBlIHsgT25ueE5vZGVJbmZvIH0gZnJvbSBcIi4uL29ubngtdHlwZXNcIjtcclxuaW1wb3J0IHsgT25ueE9wTm9kZSwgbWFrZVRlbnNvciwgT25ueE9wUmVnaXN0cnkgfSBmcm9tIFwiLi4vcmVnaXN0cnlcIjtcclxuXHJcbi8vIOKUgOKUgOKUgCBIZWxwZXJzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuLyoqIENvbXB1dGUgdG90YWwgZWxlbWVudCBjb3VudCBmcm9tIHNoYXBlLiAqL1xyXG5mdW5jdGlvbiBzaXplKHNoYXBlOiBudW1iZXJbXSk6IG51bWJlciB7XHJcbiAgICBsZXQgcyA9IDE7XHJcbiAgICBmb3IgKGNvbnN0IGQgb2Ygc2hhcGUpIHMgKj0gTWF0aC5tYXgoZCwgMSk7XHJcbiAgICByZXR1cm4gcztcclxufVxyXG5cclxuLyoqXHJcbiAqIEJyb2FkY2FzdCB0d28gc2hhcGVzICh1cCB0byAzRCkuIFJldHVybnMgdGhlIGJyb2FkY2FzdCByZXN1bHQgc2hhcGUuXHJcbiAqIEZvbGxvd3MgbnVtcHkgYnJvYWRjYXN0aW5nIHJ1bGVzOiBhbGlnbiByaWdodCwgZXhwYW5kIGRpbXMgb2Ygc2l6ZSAxLlxyXG4gKi9cclxuZnVuY3Rpb24gYnJvYWRjYXN0U2hhcGUoYTogbnVtYmVyW10sIGI6IG51bWJlcltdKTogbnVtYmVyW10ge1xyXG4gICAgY29uc3QgcmFuayA9IE1hdGgubWF4KGEubGVuZ3RoLCBiLmxlbmd0aCk7XHJcbiAgICBjb25zdCBvdXQ6IG51bWJlcltdID0gbmV3IEFycmF5KHJhbmspO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCByYW5rOyBpKyspIHtcclxuICAgICAgICBjb25zdCBkYSA9IGFbYS5sZW5ndGggLSByYW5rICsgaV0gPz8gMTtcclxuICAgICAgICBjb25zdCBkYiA9IGJbYi5sZW5ndGggLSByYW5rICsgaV0gPz8gMTtcclxuICAgICAgICBpZiAoZGEgIT09IGRiICYmIGRhICE9PSAxICYmIGRiICE9PSAxKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGJyb2FkY2FzdCBzaGFwZXMgWyR7YX1dIGFuZCBbJHtifV1gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgb3V0W2ldID0gTWF0aC5tYXgoZGEsIGRiKTtcclxuICAgIH1cclxuICAgIHJldHVybiBvdXQ7XHJcbn1cclxuXHJcbi8qKiBNYXAgYSBmbGF0IGluZGV4IGluIHRoZSBicm9hZGNhc3Qgb3V0cHV0IGJhY2sgdG8gYSBmbGF0IGluZGV4IGluIGEgc291cmNlIHRlbnNvci4gKi9cclxuZnVuY3Rpb24gYnJvYWRjYXN0SW5kZXgoZmxhdElkeDogbnVtYmVyLCBvdXRTaGFwZTogbnVtYmVyW10sIHNyY1NoYXBlOiBudW1iZXJbXSk6IG51bWJlciB7XHJcbiAgICBjb25zdCByYW5rID0gb3V0U2hhcGUubGVuZ3RoO1xyXG4gICAgbGV0IGlkeCA9IDA7XHJcbiAgICBsZXQgc3RyaWRlID0gMTtcclxuICAgIGZvciAobGV0IGkgPSByYW5rIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICBjb25zdCBjb29yZCA9IE1hdGguZmxvb3IoZmxhdElkeCAvIHN0cmlkZW9mKG91dFNoYXBlLCBpKSkgJSBvdXRTaGFwZVtpXTtcclxuICAgICAgICBjb25zdCBzcmNEaW0gPSBzcmNTaGFwZVtzcmNTaGFwZS5sZW5ndGggLSByYW5rICsgaV0gPz8gMTtcclxuICAgICAgICBjb25zdCBzcmNDb29yZCA9IHNyY0RpbSA9PT0gMSA/IDAgOiBjb29yZDtcclxuICAgICAgICBpZHggKz0gc3JjQ29vcmQgKiBzdHJpZGU7XHJcbiAgICAgICAgc3RyaWRlICo9IHNyY0RpbTtcclxuICAgIH1cclxuICAgIHJldHVybiBpZHg7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN0cmlkZW9mKHNoYXBlOiBudW1iZXJbXSwgZGltOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgbGV0IHMgPSAxO1xyXG4gICAgZm9yIChsZXQgaSA9IGRpbSArIDE7IGkgPCBzaGFwZS5sZW5ndGg7IGkrKykgcyAqPSBzaGFwZVtpXTtcclxuICAgIHJldHVybiBzO1xyXG59XHJcblxyXG4vKiogRWxlbWVudC13aXNlIGJpbmFyeSBvcCB3aXRoIGJyb2FkY2FzdGluZy4gKi9cclxuZnVuY3Rpb24gYmluYXJ5T3AoYTogSVRlbnNvciwgYjogSVRlbnNvciwgZm46ICh4OiBudW1iZXIsIHk6IG51bWJlcikgPT4gbnVtYmVyKTogSVRlbnNvciB7XHJcbiAgICBjb25zdCBvdXRTaGFwZSA9IGJyb2FkY2FzdFNoYXBlKGEuc2hhcGUsIGIuc2hhcGUpO1xyXG4gICAgY29uc3Qgb3V0U2l6ZSA9IHNpemUob3V0U2hhcGUpO1xyXG4gICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShvdXRTaXplKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0U2l6ZTsgaSsrKSB7XHJcbiAgICAgICAgY29uc3QgYWkgPSBicm9hZGNhc3RJbmRleChpLCBvdXRTaGFwZSwgYS5zaGFwZSk7XHJcbiAgICAgICAgY29uc3QgYmkgPSBicm9hZGNhc3RJbmRleChpLCBvdXRTaGFwZSwgYi5zaGFwZSk7XHJcbiAgICAgICAgb3V0W2ldID0gZm4oYS5kYXRhW2FpXSwgYi5kYXRhW2JpXSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbWFrZVRlbnNvcihvdXQsIG91dFNoYXBlKTtcclxufVxyXG5cclxuLy8g4pSA4pSA4pSAIE9wcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbmNsYXNzIE11bE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFtiaW5hcnlPcChpbnB1dHNbMF0sIGlucHV0c1sxXSwgKGEsIGIpID0+IGEgKiBiKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFN1Yk5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFtiaW5hcnlPcChpbnB1dHNbMF0sIGlucHV0c1sxXSwgKGEsIGIpID0+IGEgLSBiKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEFkZE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgcmV0dXJuIFtiaW5hcnlPcChpbnB1dHNbMF0sIGlucHV0c1sxXSwgKGEsIGIpID0+IGEgKyBiKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEF0YW5Ob2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGEgPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShhLmRhdGEubGVuZ3RoKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGEuZGF0YS5sZW5ndGg7IGkrKykgb3V0W2ldID0gTWF0aC5hdGFuKGEuZGF0YVtpXSk7XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgWy4uLmEuc2hhcGVdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW1tOiBZID0gYWxwaGEgKiBBIEAgQiArIGJldGEgKiBDXHJcbiAqIEEgaXMgW00sIEtdLCBCIGlzIFtLLCBOXSwgQyBpcyBicm9hZGNhc3RhYmxlIHRvIFtNLCBOXS5cclxuICovXHJcbmNsYXNzIEdlbW1Ob2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFscGhhOiBudW1iZXI7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGJldGE6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgdHJhbnNBOiBib29sZWFuO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0cmFuc0I6IGJvb2xlYW47XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihub2RlSW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIobm9kZUluZm8pO1xyXG4gICAgICAgIHRoaXMuYWxwaGEgPSB0aGlzLmF0dHIoXCJhbHBoYVwiLCAxLjApO1xyXG4gICAgICAgIHRoaXMuYmV0YSA9IHRoaXMuYXR0cihcImJldGFcIiwgMS4wKTtcclxuICAgICAgICB0aGlzLnRyYW5zQSA9IHRoaXMuYXR0ckludChcInRyYW5zQVwiLCAwKSAhPT0gMDtcclxuICAgICAgICB0aGlzLnRyYW5zQiA9IHRoaXMuYXR0ckludChcInRyYW5zQlwiLCAwKSAhPT0gMDtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBBID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IEIgPSBpbnB1dHNbMV07XHJcbiAgICAgICAgY29uc3QgQyA9IGlucHV0cy5sZW5ndGggPiAyID8gaW5wdXRzWzJdIDogbnVsbDtcclxuXHJcbiAgICAgICAgLy8gSW5mZXIgTSwgSywgTiBmcm9tIGFjdHVhbCB0ZW5zb3IgZGF0YSArIHNoYXBlc1xyXG4gICAgICAgIGNvbnN0IGFSb3dzID0gQS5zaGFwZS5sZW5ndGggPj0gMiA/IEEuc2hhcGVbMF0gOiAxO1xyXG4gICAgICAgIGNvbnN0IGFDb2xzID0gQS5zaGFwZS5sZW5ndGggPj0gMiA/IEEuc2hhcGVbMV0gOiBBLmRhdGEubGVuZ3RoO1xyXG4gICAgICAgIGNvbnN0IGJSb3dzID0gQi5zaGFwZS5sZW5ndGggPj0gMiA/IEIuc2hhcGVbMF0gOiAxO1xyXG4gICAgICAgIGNvbnN0IGJDb2xzID0gQi5zaGFwZS5sZW5ndGggPj0gMiA/IEIuc2hhcGVbMV0gOiBCLmRhdGEubGVuZ3RoO1xyXG5cclxuICAgICAgICBjb25zdCBNID0gdGhpcy50cmFuc0EgPyBhQ29scyA6IGFSb3dzO1xyXG4gICAgICAgIGNvbnN0IEsgPSB0aGlzLnRyYW5zQSA/IGFSb3dzIDogYUNvbHM7XHJcbiAgICAgICAgY29uc3QgTiA9IHRoaXMudHJhbnNCID8gYlJvd3MgOiBiQ29scztcclxuXHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShNICogTik7XHJcblxyXG4gICAgICAgIGZvciAobGV0IG0gPSAwOyBtIDwgTTsgbSsrKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgTjsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgSzsgaysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYUlkeCA9IHRoaXMudHJhbnNBID8gayAqIE0gKyBtIDogbSAqIEsgKyBrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJJZHggPSB0aGlzLnRyYW5zQiA/IG4gKiBLICsgayA6IGsgKiBOICsgbjtcclxuICAgICAgICAgICAgICAgICAgICBzdW0gKz0gQS5kYXRhW2FJZHhdICogQi5kYXRhW2JJZHhdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgb3V0W20gKiBOICsgbl0gPSB0aGlzLmFscGhhICogc3VtO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoQykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBtID0gMDsgbSA8IE07IG0rKykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjaSA9IG0gKiBOICsgbjtcclxuICAgICAgICAgICAgICAgICAgICAvLyBDIGlzIGJyb2FkY2FzdGFibGUg4oCUIGNvdWxkIGJlIFsxLCBOXSBvciBbTSwgTl1cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjSWR4ID0gQy5kYXRhLmxlbmd0aCA9PT0gTiA/IG4gOiBjaSAlIEMuZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W2NpXSArPSB0aGlzLmJldGEgKiBDLmRhdGFbY0lkeF07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtNLCBOXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ29uY2F0IGFsb25nIGF4aXMgKHN1cHBvcnRzIGF4aXMgMCBhbmQgMSBmb3IgMkQgdGVuc29ycykuXHJcbiAqL1xyXG5jbGFzcyBDb25jYXROb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGF4aXM6IG51bWJlcjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5vZGVJbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihub2RlSW5mbyk7XHJcbiAgICAgICAgdGhpcy5heGlzID0gdGhpcy5hdHRySW50KFwiYXhpc1wiLCAwKTtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBpZiAoaW5wdXRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoMCksIFswXSldO1xyXG4gICAgICAgIGlmIChpbnB1dHMubGVuZ3RoID09PSAxKSByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShpbnB1dHNbMF0uZGF0YSksIFsuLi5pbnB1dHNbMF0uc2hhcGVdKV07XHJcblxyXG4gICAgICAgIGNvbnN0IGF4aXMgPSB0aGlzLmF4aXM7XHJcblxyXG4gICAgICAgIGlmIChheGlzID09PSAwKSB7XHJcbiAgICAgICAgICAgIC8vIFN0YWNrIGFsb25nIHJvd3M6IGFsbCBtdXN0IGhhdmUgc2FtZSBjb2xzXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbHMgPSBpbnB1dHNbMF0uc2hhcGUubGVuZ3RoID49IDIgPyBpbnB1dHNbMF0uc2hhcGVbMV0gOiBpbnB1dHNbMF0uZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgICAgIGxldCB0b3RhbFJvd3MgPSAwO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlucCBvZiBpbnB1dHMpIHtcclxuICAgICAgICAgICAgICAgIHRvdGFsUm93cyArPSBpbnAuc2hhcGUubGVuZ3RoID49IDIgPyBpbnAuc2hhcGVbMF0gOiAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkodG90YWxSb3dzICogY29scyk7XHJcbiAgICAgICAgICAgIGxldCBvZmZzZXQgPSAwO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlucCBvZiBpbnB1dHMpIHtcclxuICAgICAgICAgICAgICAgIG91dC5zZXQoaW5wLmRhdGEsIG9mZnNldCk7XHJcbiAgICAgICAgICAgICAgICBvZmZzZXQgKz0gaW5wLmRhdGEubGVuZ3RoO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFt0b3RhbFJvd3MsIGNvbHNdKV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYXhpcyA9PT0gMSkge1xyXG4gICAgICAgICAgICAvLyBDb25jYXQgYWxvbmcgY29sdW1uczogYWxsIG11c3QgaGF2ZSBzYW1lIHJvd3NcclxuICAgICAgICAgICAgY29uc3Qgcm93cyA9IGlucHV0c1swXS5zaGFwZS5sZW5ndGggPj0gMiA/IGlucHV0c1swXS5zaGFwZVswXSA6IDE7XHJcbiAgICAgICAgICAgIGxldCB0b3RhbENvbHMgPSAwO1xyXG4gICAgICAgICAgICBjb25zdCBjb2xzTGlzdDogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBpbnAgb2YgaW5wdXRzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjID0gaW5wLnNoYXBlLmxlbmd0aCA+PSAyID8gaW5wLnNoYXBlWzFdIDogaW5wLmRhdGEubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgY29sc0xpc3QucHVzaChjKTtcclxuICAgICAgICAgICAgICAgIHRvdGFsQ29scyArPSBjO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkocm93cyAqIHRvdGFsQ29scyk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgcm93czsgcisrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgb3V0Q29sID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHQgPSAwOyB0IDwgaW5wdXRzLmxlbmd0aDsgdCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29scyA9IGNvbHNMaXN0W3RdO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNyY1JvdyA9IGlucHV0c1t0XS5zaGFwZS5sZW5ndGggPj0gMiA/IGlucHV0c1t0XS5zaGFwZVsxXSA6IGlucHV0c1t0XS5kYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRbciAqIHRvdGFsQ29scyArIG91dENvbCArIGNdID0gaW5wdXRzW3RdLmRhdGFbciAqIHNyY1JvdyArIGNdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBvdXRDb2wgKz0gY29scztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbcm93cywgdG90YWxDb2xzXSldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb25jYXQgYXhpcz0ke2F4aXN9IG5vdCBzdXBwb3J0ZWQgKG9ubHkgMCBhbmQgMSlgKTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFNsaWNlOiBjb2x1bW4tYmFzZWQgc2xpY2luZyBmb3IgMkQgdGVuc29ycy5cclxuICogT05OWCBvcHNldCDiiaUxMCB1c2VzIHRlbnNvciBpbnB1dHMgZm9yIHN0YXJ0cy9lbmRzL2F4ZXMvc3RlcHMuXHJcbiAqIE9wc2V0IDwxMCB1c2VzIGF0dHJpYnV0ZXMuXHJcbiAqIFdlIHN1cHBvcnQgYm90aDogdHJ5IHRlbnNvciBpbnB1dHMgZmlyc3QsIGZhbGwgYmFjayB0byBhdHRyaWJ1dGVzLlxyXG4gKi9cclxuY2xhc3MgU2xpY2VOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBkYXRhID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGlmICghZGF0YSkgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoMCksIFswXSldO1xyXG5cclxuICAgICAgICAvLyBPcHNldCDiiaUxMDogc3RhcnRzLCBlbmRzLCBheGVzLCBzdGVwcyBhcmUgdGVuc29yIGlucHV0c1xyXG4gICAgICAgIGNvbnN0IGhhc0lucHV0U3RhcnRzID0gaW5wdXRzLmxlbmd0aCA+PSAzICYmIGlucHV0c1sxXSAmJiBpbnB1dHNbMl07XHJcblxyXG4gICAgICAgIGxldCBzdGFydDogbnVtYmVyO1xyXG4gICAgICAgIGxldCBlbmQ6IG51bWJlcjtcclxuICAgICAgICBsZXQgYXhpczogbnVtYmVyO1xyXG5cclxuICAgICAgICBpZiAoaGFzSW5wdXRTdGFydHMpIHtcclxuICAgICAgICAgICAgc3RhcnQgPSBNYXRoLnJvdW5kKGlucHV0c1sxXS5kYXRhWzBdKTtcclxuICAgICAgICAgICAgZW5kID0gTWF0aC5yb3VuZChpbnB1dHNbMl0uZGF0YVswXSk7XHJcbiAgICAgICAgICAgIGF4aXMgPSBpbnB1dHMubGVuZ3RoID49IDQgJiYgaW5wdXRzWzNdID8gTWF0aC5yb3VuZChpbnB1dHNbM10uZGF0YVswXSkgOiAwO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIEZhbGwgYmFjayB0byBhdHRyaWJ1dGVzIChvcHNldCA8MTApXHJcbiAgICAgICAgICAgIHN0YXJ0ID0gdGhpcy5hdHRySW50KFwic3RhcnRzXCIsIDApO1xyXG4gICAgICAgICAgICBlbmQgPSB0aGlzLmF0dHJJbnQoXCJlbmRzXCIsIDApO1xyXG4gICAgICAgICAgICBheGlzID0gdGhpcy5hdHRySW50KFwiYXhlc1wiLCAxKTsgLy8gZGVmYXVsdCBheGlzPTEgZm9yIGNvbHVtbiBzbGljaW5nXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBIYW5kbGUgbmVnYXRpdmUgaW5kaWNlc1xyXG4gICAgICAgIGNvbnN0IGRpbVNpemUgPSBkYXRhLnNoYXBlW2F4aXNdID8/IGRhdGEuZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSBkaW1TaXplICsgc3RhcnQ7XHJcbiAgICAgICAgaWYgKGVuZCA8IDApIGVuZCA9IGRpbVNpemUgKyBlbmQ7XHJcbiAgICAgICAgaWYgKGVuZCA+IGRpbVNpemUgfHwgZW5kID4gMjE0NzQ4MzAwMCkgZW5kID0gZGltU2l6ZTtcclxuICAgICAgICBzdGFydCA9IE1hdGgubWF4KDAsIE1hdGgubWluKHN0YXJ0LCBkaW1TaXplKSk7XHJcbiAgICAgICAgZW5kID0gTWF0aC5tYXgoc3RhcnQsIE1hdGgubWluKGVuZCwgZGltU2l6ZSkpO1xyXG4gICAgICAgIGNvbnN0IHNsaWNlTGVuID0gZW5kIC0gc3RhcnQ7XHJcblxyXG4gICAgICAgIGlmIChkYXRhLnNoYXBlLmxlbmd0aCA8IDIgfHwgYXhpcyA9PT0gMCkge1xyXG4gICAgICAgICAgICAvLyAxRCBvciBheGlzPTA6IHNpbXBsZSBzbGljZVxyXG4gICAgICAgICAgICBjb25zdCBzbGljZWQgPSBkYXRhLmRhdGEuc2xpY2Uoc3RhcnQsIGVuZCk7XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihzbGljZWQsIFtzbGljZUxlbl0pXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIDJELCBheGlzPTE6IHNsaWNlIGNvbHVtbnNcclxuICAgICAgICBjb25zdCByb3dzID0gZGF0YS5zaGFwZVswXTtcclxuICAgICAgICBjb25zdCBjb2xzID0gZGF0YS5zaGFwZVsxXTtcclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KHJvd3MgKiBzbGljZUxlbik7XHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCByb3dzOyByKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCBzbGljZUxlbjsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICBvdXRbciAqIHNsaWNlTGVuICsgY10gPSBkYXRhLmRhdGFbciAqIGNvbHMgKyBzdGFydCArIGNdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtyb3dzLCBzbGljZUxlbl0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLy8g4pSA4pSA4pSAIFJlZ2lzdHJhdGlvbiDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWdpc3Rlck1hdGhPcHMocmVnaXN0cnk6IE9ubnhPcFJlZ2lzdHJ5KTogdm9pZCB7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkFkZFwiLCAoaW5mbykgPT4gbmV3IEFkZE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTdWJcIiwgKGluZm8pID0+IG5ldyBTdWJOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiTXVsXCIsIChpbmZvKSA9PiBuZXcgTXVsTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkF0YW5cIiwgKGluZm8pID0+IG5ldyBBdGFuTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkdlbW1cIiwgKGluZm8pID0+IG5ldyBHZW1tTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkNvbmNhdFwiLCAoaW5mbykgPT4gbmV3IENvbmNhdE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTbGljZVwiLCAoaW5mbykgPT4gbmV3IFNsaWNlTm9kZShpbmZvKSk7XHJcbn1cclxuIiwiaW1wb3J0IHR5cGUgeyBJVGVuc29yIH0gZnJvbSBcIi4uLy4uL2NvbXB1dGUvY29tcHV0ZS5pbnRlcmZhY2VzXCI7XHJcbmltcG9ydCB0eXBlIHsgT25ueE5vZGVJbmZvIH0gZnJvbSBcIi4uL29ubngtdHlwZXNcIjtcclxuaW1wb3J0IHsgT25ueE9wTm9kZSwgbWFrZVRlbnNvciwgT25ueE9wUmVnaXN0cnkgfSBmcm9tIFwiLi4vcmVnaXN0cnlcIjtcclxuXHJcbi8qKlxyXG4gKiBNYXRNdWw6IG1hdHJpeCBtdWx0aXBsaWNhdGlvbiBBIEAgQi5cclxuICogU3VwcG9ydHMgMkQgW00sS10geCBbSyxOXSDihpIgW00sTl0uXHJcbiAqIEZvciAxRCBpbnB1dHM6IFtLXSB0cmVhdGVkIGFzIFsxLEtdIG9yIFtLLDFdIGFzIG5lZWRlZC5cclxuICovXHJcbmNsYXNzIE1hdE11bE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgQSA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBCID0gaW5wdXRzWzFdO1xyXG5cclxuICAgICAgICBsZXQgTTogbnVtYmVyLCBLOiBudW1iZXIsIE46IG51bWJlcjtcclxuICAgICAgICBpZiAoQS5zaGFwZS5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgTSA9IDE7XHJcbiAgICAgICAgICAgIEsgPSBBLnNoYXBlWzBdO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIE0gPSBBLnNoYXBlWzBdO1xyXG4gICAgICAgICAgICBLID0gQS5zaGFwZVsxXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKEIuc2hhcGUubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgIE4gPSAxO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIE4gPSBCLnNoYXBlWzFdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShNICogTik7XHJcbiAgICAgICAgZm9yIChsZXQgbSA9IDA7IG0gPCBNOyBtKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBLOyBrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhaSA9IEEuc2hhcGUubGVuZ3RoID09PSAxID8gayA6IG0gKiBLICsgaztcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiaSA9IEIuc2hhcGUubGVuZ3RoID09PSAxID8gayA6IGsgKiBOICsgbjtcclxuICAgICAgICAgICAgICAgICAgICBzdW0gKz0gQS5kYXRhW2FpXSAqIEIuZGF0YVtiaV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBvdXRbbSAqIE4gKyBuXSA9IHN1bTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKEEuc2hhcGUubGVuZ3RoID09PSAxICYmIEIuc2hhcGUubGVuZ3RoID09PSAxKSByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbMV0pXTtcclxuICAgICAgICBpZiAoQS5zaGFwZS5sZW5ndGggPT09IDEpIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtOXSldO1xyXG4gICAgICAgIGlmIChCLnNoYXBlLmxlbmd0aCA9PT0gMSkgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW01dKV07XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW00sIE5dKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUcmFuc3Bvc2U6IHBlcm11dGUgZGltZW5zaW9ucy5cclxuICogU3VwcG9ydHMgMkQgKHN3YXAgcm93cy9jb2xzKSBhbmQgM0QuXHJcbiAqL1xyXG5jbGFzcyBUcmFuc3Bvc2VOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGlucCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCByYW5rID0gaW5wLnNoYXBlLmxlbmd0aDtcclxuXHJcbiAgICAgICAgaWYgKHJhbmsgPT09IDIpIHtcclxuICAgICAgICAgICAgY29uc3QgW3Jvd3MsIGNvbHNdID0gaW5wLnNoYXBlO1xyXG4gICAgICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGlucC5kYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgcm93czsgcisrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIG91dFtjICogcm93cyArIHJdID0gaW5wLmRhdGFbciAqIGNvbHMgKyBjXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbY29scywgcm93c10pXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChyYW5rID09PSAzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFtkMCwgZDEsIGQyXSA9IGlucC5zaGFwZTtcclxuICAgICAgICAgICAgLy8gRGVmYXVsdCBwZXJtOiByZXZlcnNlIOKGkiBbZDIsIGQxLCBkMF1cclxuICAgICAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShpbnAuZGF0YS5sZW5ndGgpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGQwOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZDE7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgZDI7IGsrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRbayAqIGQxICogZDAgKyBqICogZDAgKyBpXSA9IGlucC5kYXRhW2kgKiBkMSAqIGQyICsgaiAqIGQyICsga107XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtkMiwgZDEsIGQwXSldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gMUQ6IG5vb3BcclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShpbnAuZGF0YSksIFsuLi5pbnAuc2hhcGVdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXNoYXBlOiBjaGFuZ2Ugc2hhcGUgd2l0aG91dCBjaGFuZ2luZyBkYXRhLlxyXG4gKiBTdXBwb3J0cyAtMSBmb3Igb25lIGluZmVycmVkIGRpbWVuc2lvbi5cclxuICovXHJcbmNsYXNzIFJlc2hhcGVOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGRhdGEgPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3Qgc2hhcGVUID0gaW5wdXRzWzFdO1xyXG4gICAgICAgIGlmICghc2hhcGVUKSByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShkYXRhLmRhdGEpLCBbLi4uZGF0YS5zaGFwZV0pXTtcclxuXHJcbiAgICAgICAgY29uc3QgbmV3U2hhcGU6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgbGV0IGluZmVySWR4ID0gLTE7XHJcbiAgICAgICAgbGV0IGtub3duID0gMTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNoYXBlVC5kYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGQgPSBNYXRoLnJvdW5kKHNoYXBlVC5kYXRhW2ldKTtcclxuICAgICAgICAgICAgaWYgKGQgPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBpbmZlcklkeCA9IGk7XHJcbiAgICAgICAgICAgICAgICBuZXdTaGFwZS5wdXNoKC0xKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChkID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAvLyAwIG1lYW5zIGNvcHkgZnJvbSBpbnB1dFxyXG4gICAgICAgICAgICAgICAgY29uc3QgZGltID0gZGF0YS5zaGFwZVtpXSA/PyAxO1xyXG4gICAgICAgICAgICAgICAgbmV3U2hhcGUucHVzaChkaW0pO1xyXG4gICAgICAgICAgICAgICAga25vd24gKj0gZGltO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbmV3U2hhcGUucHVzaChkKTtcclxuICAgICAgICAgICAgICAgIGtub3duICo9IGQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGluZmVySWR4ID49IDApIHtcclxuICAgICAgICAgICAgbmV3U2hhcGVbaW5mZXJJZHhdID0gZGF0YS5kYXRhLmxlbmd0aCAvIGtub3duO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoZGF0YS5kYXRhKSwgbmV3U2hhcGUpXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEZsYXR0ZW46IGNvbGxhcHNlIGRpbXMgaW50byAyRCBbYmF0Y2gsIGZlYXR1cmVzXS5cclxuICovXHJcbmNsYXNzIEZsYXR0ZW5Ob2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGF4aXM6IG51bWJlcjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5heGlzID0gdGhpcy5hdHRySW50KFwiYXhpc1wiLCAxKTtcclxuICAgIH1cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGlucCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBzaGFwZSA9IGlucC5zaGFwZTtcclxuICAgICAgICBsZXQgZDAgPSAxLFxyXG4gICAgICAgICAgICBkMSA9IDE7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmF4aXM7IGkrKykgZDAgKj0gc2hhcGVbaV0gPz8gMTtcclxuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5heGlzOyBpIDwgc2hhcGUubGVuZ3RoOyBpKyspIGQxICo9IHNoYXBlW2ldID8/IDE7XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoaW5wLmRhdGEpLCBbZDAsIGQxXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogU3F1ZWV6ZTogcmVtb3ZlIGRpbWVuc2lvbnMgb2Ygc2l6ZSAxLlxyXG4gKi9cclxuY2xhc3MgU3F1ZWV6ZU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgaW5wID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IGF4ZXMgPSBpbnB1dHMubGVuZ3RoID49IDIgJiYgaW5wdXRzWzFdID8gQXJyYXkuZnJvbShpbnB1dHNbMV0uZGF0YSkubWFwKE1hdGgucm91bmQpIDogbnVsbDtcclxuICAgICAgICBjb25zdCBuZXdTaGFwZSA9IGF4ZXMgPyBpbnAuc2hhcGUuZmlsdGVyKChfLCBpKSA9PiAhYXhlcy5pbmNsdWRlcyhpKSkgOiBpbnAuc2hhcGUuZmlsdGVyKChkKSA9PiBkICE9PSAxKTtcclxuICAgICAgICBpZiAobmV3U2hhcGUubGVuZ3RoID09PSAwKSBuZXdTaGFwZS5wdXNoKDEpO1xyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KGlucC5kYXRhKSwgbmV3U2hhcGUpXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFVuc3F1ZWV6ZTogaW5zZXJ0IGRpbWVuc2lvbnMgb2Ygc2l6ZSAxLlxyXG4gKi9cclxuY2xhc3MgVW5zcXVlZXplTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBpbnAgPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3QgYXhlc1QgPSBpbnB1dHNbMV07XHJcbiAgICAgICAgaWYgKCFheGVzVCkgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoaW5wLmRhdGEpLCBbLi4uaW5wLnNoYXBlXSldO1xyXG4gICAgICAgIGNvbnN0IGF4ZXMgPSBBcnJheS5mcm9tKGF4ZXNULmRhdGEpXHJcbiAgICAgICAgICAgIC5tYXAoTWF0aC5yb3VuZClcclxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcclxuICAgICAgICBjb25zdCBuZXdTaGFwZSA9IFsuLi5pbnAuc2hhcGVdO1xyXG4gICAgICAgIGZvciAoY29uc3QgYSBvZiBheGVzKSB7XHJcbiAgICAgICAgICAgIG5ld1NoYXBlLnNwbGljZShhLCAwLCAxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG5ldyBGbG9hdDMyQXJyYXkoaW5wLmRhdGEpLCBuZXdTaGFwZSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogR2F0aGVyOiBzZWxlY3QgZWxlbWVudHMgYWxvbmcgYXhpcyB1c2luZyBpbmRpY2VzLlxyXG4gKiBTaW1wbGlmaWVkOiBzdXBwb3J0cyBheGlzPTAsIDFELzJELlxyXG4gKi9cclxuY2xhc3MgR2F0aGVyTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBheGlzOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKGluZm8pO1xyXG4gICAgICAgIHRoaXMuYXhpcyA9IHRoaXMuYXR0ckludChcImF4aXNcIiwgMCk7XHJcbiAgICB9XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBkYXRhID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IGluZGljZXMgPSBpbnB1dHNbMV07XHJcbiAgICAgICAgaWYgKCFpbmRpY2VzKSByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShkYXRhLmRhdGEpLCBbLi4uZGF0YS5zaGFwZV0pXTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYXhpcyA9PT0gMCAmJiBkYXRhLnNoYXBlLmxlbmd0aCA9PT0gMikge1xyXG4gICAgICAgICAgICBjb25zdCBjb2xzID0gZGF0YS5zaGFwZVsxXTtcclxuICAgICAgICAgICAgY29uc3QgbnVtSWR4ID0gaW5kaWNlcy5kYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShudW1JZHggKiBjb2xzKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1JZHg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gTWF0aC5yb3VuZChpbmRpY2VzLmRhdGFbaV0pO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCBjb2xzOyBjKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBvdXRbaSAqIGNvbHMgKyBjXSA9IGRhdGEuZGF0YVtpZHggKiBjb2xzICsgY107XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW251bUlkeCwgY29sc10pXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEZhbGxiYWNrOiAxRCBnYXRoZXJcclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGluZGljZXMuZGF0YS5sZW5ndGgpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5kaWNlcy5kYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIG91dFtpXSA9IGRhdGEuZGF0YVtNYXRoLnJvdW5kKGluZGljZXMuZGF0YVtpXSldID8/IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIFtpbmRpY2VzLmRhdGEubGVuZ3RoXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJNYXRyaXhPcHMocmVnaXN0cnk6IE9ubnhPcFJlZ2lzdHJ5KTogdm9pZCB7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIk1hdE11bFwiLCAoaW5mbykgPT4gbmV3IE1hdE11bE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJUcmFuc3Bvc2VcIiwgKGluZm8pID0+IG5ldyBUcmFuc3Bvc2VOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiUmVzaGFwZVwiLCAoaW5mbykgPT4gbmV3IFJlc2hhcGVOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiRmxhdHRlblwiLCAoaW5mbykgPT4gbmV3IEZsYXR0ZW5Ob2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiU3F1ZWV6ZVwiLCAoaW5mbykgPT4gbmV3IFNxdWVlemVOb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiVW5zcXVlZXplXCIsIChpbmZvKSA9PiBuZXcgVW5zcXVlZXplTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkdhdGhlclwiLCAoaW5mbykgPT4gbmV3IEdhdGhlck5vZGUoaW5mbykpO1xyXG59XHJcbiIsImltcG9ydCB0eXBlIHsgSVRlbnNvciB9IGZyb20gXCIuLi8uLi9jb21wdXRlL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xyXG5pbXBvcnQgdHlwZSB7IE9ubnhOb2RlSW5mbyB9IGZyb20gXCIuLi9vbm54LXR5cGVzXCI7XHJcbmltcG9ydCB7IE9ubnhPcE5vZGUsIG1ha2VUZW5zb3IsIGdldEluaXRpYWxpemVyRGF0YSwgT25ueE9wUmVnaXN0cnkgfSBmcm9tIFwiLi4vcmVnaXN0cnlcIjtcclxuXHJcbmNsYXNzIERpdk5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgYSA9IGlucHV0c1swXSwgYiA9IGlucHV0c1sxXTtcclxuICAgICAgICBjb25zdCBzaXplID0gTWF0aC5tYXgoYS5kYXRhLmxlbmd0aCwgYi5kYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShzaXplKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNpemU7IGkrKykge1xyXG4gICAgICAgICAgICBvdXRbaV0gPSBhLmRhdGFbaSAlIGEuZGF0YS5sZW5ndGhdIC8gYi5kYXRhW2kgJSBiLmRhdGEubGVuZ3RoXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgYS5kYXRhLmxlbmd0aCA+PSBiLmRhdGEubGVuZ3RoID8gWy4uLmEuc2hhcGVdIDogWy4uLmIuc2hhcGVdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFBvd05vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgYSA9IGlucHV0c1swXSwgYiA9IGlucHV0c1sxXTtcclxuICAgICAgICBjb25zdCBzaXplID0gTWF0aC5tYXgoYS5kYXRhLmxlbmd0aCwgYi5kYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShzaXplKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNpemU7IGkrKykge1xyXG4gICAgICAgICAgICBvdXRbaV0gPSBNYXRoLnBvdyhhLmRhdGFbaSAlIGEuZGF0YS5sZW5ndGhdLCBiLmRhdGFbaSAlIGIuZGF0YS5sZW5ndGhdKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgYS5kYXRhLmxlbmd0aCA+PSBiLmRhdGEubGVuZ3RoID8gWy4uLmEuc2hhcGVdIDogWy4uLmIuc2hhcGVdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFJlZHVjZU1lYW5Ob2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGF4aXM6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkga2VlcGRpbXM6IGJvb2xlYW47XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmF4aXMgPSB0aGlzLmF0dHJJbnQoXCJheGVzXCIsIC0xKTtcclxuICAgICAgICB0aGlzLmtlZXBkaW1zID0gdGhpcy5hdHRySW50KFwia2VlcGRpbXNcIiwgMSkgIT09IDA7XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgWCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBzaGFwZSA9IFguc2hhcGU7XHJcbiAgICAgICAgY29uc3QgcmFuayA9IHNoYXBlLmxlbmd0aDtcclxuICAgICAgICBjb25zdCBheGlzID0gdGhpcy5heGlzIDwgMCA/IHJhbmsgKyB0aGlzLmF4aXMgOiB0aGlzLmF4aXM7XHJcblxyXG4gICAgICAgIGlmIChyYW5rID09PSAyKSB7XHJcbiAgICAgICAgICAgIGlmIChheGlzID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByb3dzID0gc2hhcGVbMF07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb2xzID0gc2hhcGVbMV07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KHJvd3MpO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCByb3dzOyByKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMrKykgc3VtICs9IFguZGF0YVtyICogY29scyArIGNdO1xyXG4gICAgICAgICAgICAgICAgICAgIG91dFtyXSA9IHN1bSAvIGNvbHM7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCB0aGlzLmtlZXBkaW1zID8gW3Jvd3MsIDFdIDogW3Jvd3NdKV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGF4aXMgPT09IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJvd3MgPSBzaGFwZVswXTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbHMgPSBzaGFwZVsxXTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoY29scyk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgcm93czsgcisrKSBzdW0gKz0gWC5kYXRhW3IgKiBjb2xzICsgY107XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W2NdID0gc3VtIC8gcm93cztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIHRoaXMua2VlcGRpbXMgPyBbMSwgY29sc10gOiBbY29sc10pXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRmFsbGJhY2s6IHJlZHVjZSBhbGxcclxuICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IFguZGF0YS5sZW5ndGg7IGkrKykgc3VtICs9IFguZGF0YVtpXTtcclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShbc3VtIC8gWC5kYXRhLmxlbmd0aF0pLCBbMV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgUmVkdWNlU3VtTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBheGlzOiBudW1iZXI7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGtlZXBkaW1zOiBib29sZWFuO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5heGlzID0gdGhpcy5hdHRySW50KFwiYXhlc1wiLCAtMSk7XHJcbiAgICAgICAgdGhpcy5rZWVwZGltcyA9IHRoaXMuYXR0ckludChcImtlZXBkaW1zXCIsIDEpICE9PSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3Qgc2hhcGUgPSBYLnNoYXBlO1xyXG4gICAgICAgIGNvbnN0IHJhbmsgPSBzaGFwZS5sZW5ndGg7XHJcbiAgICAgICAgY29uc3QgYXhpcyA9IHRoaXMuYXhpcyA8IDAgPyByYW5rICsgdGhpcy5heGlzIDogdGhpcy5heGlzO1xyXG5cclxuICAgICAgICBpZiAocmFuayA9PT0gMiAmJiBheGlzID09PSAxKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvd3MgPSBzaGFwZVswXSwgY29scyA9IHNoYXBlWzFdO1xyXG4gICAgICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KHJvd3MpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCByID0gMDsgciA8IHJvd3M7IHIrKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IGNvbHM7IGMrKykgc3VtICs9IFguZGF0YVtyICogY29scyArIGNdO1xyXG4gICAgICAgICAgICAgICAgb3V0W3JdID0gc3VtO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIHRoaXMua2VlcGRpbXMgPyBbcm93cywgMV0gOiBbcm93c10pXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgWC5kYXRhLmxlbmd0aDsgaSsrKSBzdW0gKz0gWC5kYXRhW2ldO1xyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KFtzdW1dKSwgWzFdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIElkZW50aXR5Tm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShpbnB1dHNbMF0uZGF0YSksIFsuLi5pbnB1dHNbMF0uc2hhcGVdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIENhc3ROb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIC8vIEFsbCBkYXRhIGlzIEZsb2F0MzIgaW4gb3VyIHJ1bnRpbWUg4oCUIGNhc3QgaXMgYSBuby1vcFxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KGlucHV0c1swXS5kYXRhKSwgWy4uLmlucHV0c1swXS5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU2hhcGVOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IHNoYXBlID0gaW5wdXRzWzBdLnNoYXBlO1xyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KHNoYXBlKSwgW3NoYXBlLmxlbmd0aF0pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQ29uc3RhbnRPZlNoYXBlTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBzaGFwZVQgPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3Qgc2hhcGUgPSBBcnJheS5mcm9tKHNoYXBlVC5kYXRhKS5tYXAoTWF0aC5yb3VuZCk7XHJcbiAgICAgICAgbGV0IHNpemUgPSAxO1xyXG4gICAgICAgIGZvciAoY29uc3QgZCBvZiBzaGFwZSkgc2l6ZSAqPSBkO1xyXG4gICAgICAgIC8vIFRyeSB0ZW5zb3IgYXR0cmlidXRlIFwidmFsdWVcIiBmaXJzdCAoVGVuc29yUHJvdG8pLCBmYWxsIGJhY2sgdG8gc2NhbGFyXHJcbiAgICAgICAgbGV0IHZhbCA9IDA7XHJcbiAgICAgICAgY29uc3QgdmFsdWVUZW5zb3IgPSB0aGlzLmF0dHJUZW5zb3IoXCJ2YWx1ZVwiKTtcclxuICAgICAgICBpZiAodmFsdWVUZW5zb3IpIHtcclxuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGdldEluaXRpYWxpemVyRGF0YSh2YWx1ZVRlbnNvcik7XHJcbiAgICAgICAgICAgIGlmIChkYXRhLmxlbmd0aCA+IDApIHZhbCA9IGRhdGFbMF07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdmFsID0gdGhpcy5hdHRyKFwidmFsdWVcIiwgMCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoc2l6ZSkuZmlsbCh2YWwpO1xyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihvdXQsIHNoYXBlKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQYWQ6IHBhZCBhIHRlbnNvci4gU2ltcGxpZmllZDogMkQgY29uc3RhbnQgcGFkZGluZy5cclxuICovXHJcbmNsYXNzIFBhZE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgWCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBwYWRzID0gaW5wdXRzLmxlbmd0aCA+PSAyICYmIGlucHV0c1sxXSA/IGlucHV0c1sxXSA6IG51bGw7XHJcbiAgICAgICAgaWYgKCFwYWRzIHx8IFguc2hhcGUubGVuZ3RoICE9PSAyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KFguZGF0YSksIFsuLi5YLnNoYXBlXSldO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCB2YWwgPSBpbnB1dHMubGVuZ3RoID49IDMgJiYgaW5wdXRzWzJdID8gaW5wdXRzWzJdLmRhdGFbMF0gOiAwO1xyXG4gICAgICAgIGNvbnN0IFtyb3dzLCBjb2xzXSA9IFguc2hhcGU7XHJcbiAgICAgICAgY29uc3QgcCA9IEFycmF5LmZyb20ocGFkcy5kYXRhKS5tYXAoTWF0aC5yb3VuZCk7XHJcbiAgICAgICAgLy8gcGFkcyBmb3JtYXQ6IFt0b3AsIGxlZnQsIGJvdHRvbSwgcmlnaHRdIGZvciAyRFxyXG4gICAgICAgIGNvbnN0IHRvcCA9IHBbMF0gPz8gMCwgbGVmdCA9IHBbMV0gPz8gMCwgYm90dG9tID0gcFsyXSA/PyAwLCByaWdodCA9IHBbM10gPz8gMDtcclxuICAgICAgICBjb25zdCBuZXdSb3dzID0gcm93cyArIHRvcCArIGJvdHRvbTtcclxuICAgICAgICBjb25zdCBuZXdDb2xzID0gY29scyArIGxlZnQgKyByaWdodDtcclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KG5ld1Jvd3MgKiBuZXdDb2xzKS5maWxsKHZhbCk7XHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCByb3dzOyByKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCBjb2xzOyBjKyspIHtcclxuICAgICAgICAgICAgICAgIG91dFsociArIHRvcCkgKiBuZXdDb2xzICsgKGMgKyBsZWZ0KV0gPSBYLmRhdGFbciAqIGNvbHMgKyBjXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbbmV3Um93cywgbmV3Q29sc10pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgTWluTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGlucHV0c1swXS5kYXRhKTtcclxuICAgICAgICBmb3IgKGxldCB0ID0gMTsgdCA8IGlucHV0cy5sZW5ndGg7IHQrKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgb3V0W2ldID0gTWF0aC5taW4ob3V0W2ldLCBpbnB1dHNbdF0uZGF0YVtpICUgaW5wdXRzW3RdLmRhdGEubGVuZ3RoXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgWy4uLmlucHV0c1swXS5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgTWF4Tm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KGlucHV0c1swXS5kYXRhKTtcclxuICAgICAgICBmb3IgKGxldCB0ID0gMTsgdCA8IGlucHV0cy5sZW5ndGg7IHQrKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgb3V0W2ldID0gTWF0aC5tYXgob3V0W2ldLCBpbnB1dHNbdF0uZGF0YVtpICUgaW5wdXRzW3RdLmRhdGEubGVuZ3RoXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgWy4uLmlucHV0c1swXS5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnN0YW50OiBwcm9kdWNlcyBhIGNvbnN0YW50IHRlbnNvciBmcm9tIGF0dHJpYnV0ZXMuXHJcbiAqIFRoZSB2YWx1ZSBjb21lcyBmcm9tIGEgdGVuc29yIGF0dHJpYnV0ZSBcInZhbHVlXCIuXHJcbiAqL1xyXG5jbGFzcyBDb25zdGFudE5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgZXhlY3V0ZSgpOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IHZhbHVlVGVuc29yID0gdGhpcy5hdHRyVGVuc29yKFwidmFsdWVcIik7XHJcbiAgICAgICAgaWYgKHZhbHVlVGVuc29yKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBnZXRJbml0aWFsaXplckRhdGEodmFsdWVUZW5zb3IpO1xyXG4gICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShkYXRhKSwgWy4uLnZhbHVlVGVuc29yLmRpbXNdKV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIFNjYWxhciBmYWxsYmFja1xyXG4gICAgICAgIGNvbnN0IHZhbCA9IHRoaXMuYXR0cihcInZhbHVlX2Zsb2F0XCIsIDApO1xyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KFt2YWxdKSwgWzFdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFeHBhbmQ6IGJyb2FkY2FzdCBhIHRlbnNvciB0byBhIHRhcmdldCBzaGFwZS5cclxuICogSW5wdXQgMDogZGF0YSB0ZW5zb3JcclxuICogSW5wdXQgMTogc2hhcGUgdGVuc29yIChpbnQ2NCB2YWx1ZXMgYXMgZmxvYXQpXHJcbiAqL1xyXG5jbGFzcyBFeHBhbmROb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IGRhdGEgPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3Qgc2hhcGVUID0gaW5wdXRzWzFdO1xyXG4gICAgICAgIGNvbnN0IHRhcmdldFNoYXBlID0gQXJyYXkuZnJvbShzaGFwZVQuZGF0YSkubWFwKE1hdGgucm91bmQpO1xyXG5cclxuICAgICAgICAvLyBDb21wdXRlIG91dHB1dCBzaXplXHJcbiAgICAgICAgbGV0IG91dFNpemUgPSAxO1xyXG4gICAgICAgIGZvciAoY29uc3QgZCBvZiB0YXJnZXRTaGFwZSkgb3V0U2l6ZSAqPSBkO1xyXG5cclxuICAgICAgICAvLyBJZiBzaGFwZXMgYXJlIGlkZW50aWNhbCwgcmV0dXJuIGNvcHlcclxuICAgICAgICBpZiAoZGF0YS5kYXRhLmxlbmd0aCA9PT0gb3V0U2l6ZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShkYXRhLmRhdGEpLCB0YXJnZXRTaGFwZSldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQnJvYWRjYXN0OiBhbGlnbiBzaGFwZXMgcmlnaHQsIGV4cGFuZCBkaW1zIG9mIHNpemUgMVxyXG4gICAgICAgIGNvbnN0IHNyY1NoYXBlID0gZGF0YS5zaGFwZTtcclxuICAgICAgICBjb25zdCByYW5rID0gdGFyZ2V0U2hhcGUubGVuZ3RoO1xyXG4gICAgICAgIGNvbnN0IHNyY1BhZGRlZDogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJhbms7IGkrKykge1xyXG4gICAgICAgICAgICBjb25zdCBzaSA9IGkgLSAocmFuayAtIHNyY1NoYXBlLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIHNyY1BhZGRlZC5wdXNoKHNpID49IDAgPyBzcmNTaGFwZVtzaV0gOiAxKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkob3V0U2l6ZSk7XHJcbiAgICAgICAgLy8gQ29tcHV0ZSBzdHJpZGVzIGZvciBzb3VyY2UgYW5kIG91dHB1dFxyXG4gICAgICAgIGNvbnN0IG91dFN0cmlkZXM6IG51bWJlcltdID0gbmV3IEFycmF5KHJhbmspO1xyXG4gICAgICAgIGNvbnN0IHNyY1N0cmlkZXM6IG51bWJlcltdID0gbmV3IEFycmF5KHJhbmspO1xyXG4gICAgICAgIG91dFN0cmlkZXNbcmFuayAtIDFdID0gMTtcclxuICAgICAgICBzcmNTdHJpZGVzW3JhbmsgLSAxXSA9IDE7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IHJhbmsgLSAyOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgICAgICBvdXRTdHJpZGVzW2ldID0gb3V0U3RyaWRlc1tpICsgMV0gKiB0YXJnZXRTaGFwZVtpICsgMV07XHJcbiAgICAgICAgICAgIHNyY1N0cmlkZXNbaV0gPSBzcmNTdHJpZGVzW2kgKyAxXSAqIHNyY1BhZGRlZFtpICsgMV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCBvdXRTaXplOyBpZHgrKykge1xyXG4gICAgICAgICAgICBsZXQgc3JjSWR4ID0gMDtcclxuICAgICAgICAgICAgbGV0IHJlbSA9IGlkeDtcclxuICAgICAgICAgICAgZm9yIChsZXQgZCA9IDA7IGQgPCByYW5rOyBkKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvb3JkID0gTWF0aC5mbG9vcihyZW0gLyBvdXRTdHJpZGVzW2RdKTtcclxuICAgICAgICAgICAgICAgIHJlbSAlPSBvdXRTdHJpZGVzW2RdO1xyXG4gICAgICAgICAgICAgICAgLy8gSWYgc291cmNlIGRpbSBpcyAxLCBicm9hZGNhc3QgKHVzZSBjb29yZCAwKVxyXG4gICAgICAgICAgICAgICAgc3JjSWR4ICs9IChzcmNQYWRkZWRbZF0gPT09IDEgPyAwIDogY29vcmQpICogc3JjU3RyaWRlc1tkXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvdXRbaWR4XSA9IGRhdGEuZGF0YVtzcmNJZHhdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgdGFyZ2V0U2hhcGUpXTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyTWlzY09wcyhyZWdpc3RyeTogT25ueE9wUmVnaXN0cnkpOiB2b2lkIHtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiRGl2XCIsIChpbmZvKSA9PiBuZXcgRGl2Tm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIlBvd1wiLCAoaW5mbykgPT4gbmV3IFBvd05vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJSZWR1Y2VNZWFuXCIsIChpbmZvKSA9PiBuZXcgUmVkdWNlTWVhbk5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJSZWR1Y2VTdW1cIiwgKGluZm8pID0+IG5ldyBSZWR1Y2VTdW1Ob2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiSWRlbnRpdHlcIiwgKGluZm8pID0+IG5ldyBJZGVudGl0eU5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJDYXN0XCIsIChpbmZvKSA9PiBuZXcgQ2FzdE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJTaGFwZVwiLCAoaW5mbykgPT4gbmV3IFNoYXBlTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkNvbnN0YW50T2ZTaGFwZVwiLCAoaW5mbykgPT4gbmV3IENvbnN0YW50T2ZTaGFwZU5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJQYWRcIiwgKGluZm8pID0+IG5ldyBQYWROb2RlKGluZm8pKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiTWluXCIsIChpbmZvKSA9PiBuZXcgTWluTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIk1heFwiLCAoaW5mbykgPT4gbmV3IE1heE5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJDb25zdGFudFwiLCAoaW5mbykgPT4gbmV3IENvbnN0YW50Tm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkV4cGFuZFwiLCAoaW5mbykgPT4gbmV3IEV4cGFuZE5vZGUoaW5mbykpO1xyXG59XHJcbiIsImltcG9ydCB0eXBlIHsgSVRlbnNvciB9IGZyb20gXCIuLi8uLi9jb21wdXRlL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xyXG5pbXBvcnQgdHlwZSB7IE9ubnhOb2RlSW5mbyB9IGZyb20gXCIuLi9vbm54LXR5cGVzXCI7XHJcbmltcG9ydCB7IE9ubnhPcE5vZGUsIG1ha2VUZW5zb3IsIE9ubnhPcFJlZ2lzdHJ5IH0gZnJvbSBcIi4uL3JlZ2lzdHJ5XCI7XHJcblxyXG4vKipcclxuICogQmF0Y2hOb3JtYWxpemF0aW9uOiBZID0gKFggLSBtZWFuKSAvIHNxcnQodmFyICsgZXBzKSAqIHNjYWxlICsgYmlhc1xyXG4gKiBJbnB1dHM6IFgsIHNjYWxlLCBCLCBtZWFuLCB2YXJcclxuICogRm9yIDJEIFtOLCBDXTogbm9ybWFsaXplIHBlciBjaGFubmVsLlxyXG4gKiBGb3IgM0QgW04sIEMsIExdOiBub3JtYWxpemUgcGVyIGNoYW5uZWwgYWNyb3NzIHNwYXRpYWwuXHJcbiAqL1xyXG5jbGFzcyBCYXRjaE5vcm1Ob2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVwczogbnVtYmVyO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5lcHMgPSB0aGlzLmF0dHIoXCJlcHNpbG9uXCIsIDFlLTUpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3Qgc2NhbGUgPSBpbnB1dHNbMV07XHJcbiAgICAgICAgY29uc3QgYmlhcyA9IGlucHV0c1syXTtcclxuICAgICAgICBjb25zdCBtZWFuID0gaW5wdXRzWzNdO1xyXG4gICAgICAgIGNvbnN0IHZhcmlhbmNlID0gaW5wdXRzWzRdO1xyXG5cclxuICAgICAgICBpZiAoIXNjYWxlIHx8ICFiaWFzIHx8ICFtZWFuIHx8ICF2YXJpYW5jZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IobmV3IEZsb2F0MzJBcnJheShYLmRhdGEpLCBbLi4uWC5zaGFwZV0pXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoWC5kYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgY29uc3QgQyA9IHNjYWxlLmRhdGEubGVuZ3RoO1xyXG5cclxuICAgICAgICBpZiAoWC5zaGFwZS5sZW5ndGggPT09IDIpIHtcclxuICAgICAgICAgICAgY29uc3QgTiA9IFguc2hhcGVbMF07XHJcbiAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgTjsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IEM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IG4gKiBDICsgYztcclxuICAgICAgICAgICAgICAgICAgICBvdXRbaWR4XSA9IChYLmRhdGFbaWR4XSAtIG1lYW4uZGF0YVtjXSkgLyBNYXRoLnNxcnQodmFyaWFuY2UuZGF0YVtjXSArIHRoaXMuZXBzKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAqIHNjYWxlLmRhdGFbY10gKyBiaWFzLmRhdGFbY107XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKFguc2hhcGUubGVuZ3RoID09PSAzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IE4gPSBYLnNoYXBlWzBdO1xyXG4gICAgICAgICAgICBjb25zdCBMID0gWC5zaGFwZVsyXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgQzsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW52U3RkID0gMSAvIE1hdGguc3FydCh2YXJpYW5jZS5kYXRhW2NdICsgdGhpcy5lcHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGwgPSAwOyBsIDwgTDsgbCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IG4gKiBDICogTCArIGMgKiBMICsgbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0W2lkeF0gPSAoWC5kYXRhW2lkeF0gLSBtZWFuLmRhdGFbY10pICogaW52U3RkICogc2NhbGUuZGF0YVtjXSArIGJpYXMuZGF0YVtjXTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBvdXQuc2V0KFguZGF0YSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbLi4uWC5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIExheWVyTm9ybWFsaXphdGlvbjogbm9ybWFsaXplIGFjcm9zcyB0aGUgbGFzdCBheGlzLlxyXG4gKi9cclxuY2xhc3MgTGF5ZXJOb3JtTm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBlcHM6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYXhpczogbnVtYmVyO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5lcHMgPSB0aGlzLmF0dHIoXCJlcHNpbG9uXCIsIDFlLTUpO1xyXG4gICAgICAgIHRoaXMuYXhpcyA9IHRoaXMuYXR0ckludChcImF4aXNcIiwgLTEpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3Qgc2NhbGUgPSBpbnB1dHMubGVuZ3RoID49IDIgPyBpbnB1dHNbMV0gOiBudWxsO1xyXG4gICAgICAgIGNvbnN0IGJpYXMgPSBpbnB1dHMubGVuZ3RoID49IDMgPyBpbnB1dHNbMl0gOiBudWxsO1xyXG5cclxuICAgICAgICBjb25zdCBzaGFwZSA9IFguc2hhcGU7XHJcbiAgICAgICAgY29uc3QgcmFuayA9IHNoYXBlLmxlbmd0aDtcclxuICAgICAgICBjb25zdCBheGlzID0gdGhpcy5heGlzIDwgMCA/IHJhbmsgKyB0aGlzLmF4aXMgOiB0aGlzLmF4aXM7XHJcbiAgICAgICAgY29uc3Qgb3V0ZXJTaXplID0gc2hhcGUuc2xpY2UoMCwgYXhpcykucmVkdWNlKChhLCBiKSA9PiBhICogYiwgMSk7XHJcbiAgICAgICAgY29uc3QgaW5uZXJTaXplID0gc2hhcGUuc2xpY2UoYXhpcykucmVkdWNlKChhLCBiKSA9PiBhICogYiwgMSk7XHJcblxyXG4gICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoWC5kYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRlclNpemU7IGkrKykge1xyXG4gICAgICAgICAgICBjb25zdCBiYXNlID0gaSAqIGlubmVyU2l6ZTtcclxuICAgICAgICAgICAgbGV0IG1lYW4gPSAwO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGlubmVyU2l6ZTsgaisrKSBtZWFuICs9IFguZGF0YVtiYXNlICsgal07XHJcbiAgICAgICAgICAgIG1lYW4gLz0gaW5uZXJTaXplO1xyXG4gICAgICAgICAgICBsZXQgdmFyaWFuY2UgPSAwO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGlubmVyU2l6ZTsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkID0gWC5kYXRhW2Jhc2UgKyBqXSAtIG1lYW47XHJcbiAgICAgICAgICAgICAgICB2YXJpYW5jZSArPSBkICogZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXJpYW5jZSAvPSBpbm5lclNpemU7XHJcbiAgICAgICAgICAgIGNvbnN0IGludlN0ZCA9IDEgLyBNYXRoLnNxcnQodmFyaWFuY2UgKyB0aGlzLmVwcyk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgaW5uZXJTaXplOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCB2YWwgPSAoWC5kYXRhW2Jhc2UgKyBqXSAtIG1lYW4pICogaW52U3RkO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNjYWxlKSB2YWwgKj0gc2NhbGUuZGF0YVtqICUgc2NhbGUuZGF0YS5sZW5ndGhdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGJpYXMpIHZhbCArPSBiaWFzLmRhdGFbaiAlIGJpYXMuZGF0YS5sZW5ndGhdO1xyXG4gICAgICAgICAgICAgICAgb3V0W2Jhc2UgKyBqXSA9IHZhbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgWy4uLnNoYXBlXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogRHJvcG91dDogcGFzc3Rocm91Z2ggZHVyaW5nIGluZmVyZW5jZS5cclxuICovXHJcbmNsYXNzIERyb3BvdXROb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIC8vIER1cmluZyBpbmZlcmVuY2UsIGRyb3BvdXQgaXMgYSBuby1vcFxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihuZXcgRmxvYXQzMkFycmF5KGlucHV0c1swXS5kYXRhKSwgWy4uLmlucHV0c1swXS5zaGFwZV0pXTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyTm9ybU9wcyhyZWdpc3RyeTogT25ueE9wUmVnaXN0cnkpOiB2b2lkIHtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiQmF0Y2hOb3JtYWxpemF0aW9uXCIsIChpbmZvKSA9PiBuZXcgQmF0Y2hOb3JtTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkxheWVyTm9ybWFsaXphdGlvblwiLCAoaW5mbykgPT4gbmV3IExheWVyTm9ybU5vZGUoaW5mbykpO1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJJbnN0YW5jZU5vcm1hbGl6YXRpb25cIiwgKGluZm8pID0+IG5ldyBCYXRjaE5vcm1Ob2RlKGluZm8pKTsgLy8gc2FtZSBsb2dpY1xyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJEcm9wb3V0XCIsIChpbmZvKSA9PiBuZXcgRHJvcG91dE5vZGUoaW5mbykpO1xyXG59XHJcbiIsImltcG9ydCB0eXBlIHsgSVRlbnNvciB9IGZyb20gXCIuLi8uLi9jb21wdXRlL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xyXG5pbXBvcnQgdHlwZSB7IE9ubnhOb2RlSW5mbyB9IGZyb20gXCIuLi9vbm54LXR5cGVzXCI7XHJcbmltcG9ydCB7IE9ubnhPcE5vZGUsIG1ha2VUZW5zb3IsIE9ubnhPcFJlZ2lzdHJ5IH0gZnJvbSBcIi4uL3JlZ2lzdHJ5XCI7XHJcblxyXG5mdW5jdGlvbiBzaWdtb2lkKHg6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gMSAvICgxICsgTWF0aC5leHAoLXgpKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIExTVE06IExvbmcgU2hvcnQtVGVybSBNZW1vcnkuXHJcbiAqXHJcbiAqIElucHV0czogWCBbc2VxX2xlbiwgYmF0Y2gsIGlucHV0X3NpemVdLCBXIFtudW1fZGlyLCA0KmhpZGRlbiwgaW5wdXRdLCBSIFtudW1fZGlyLCA0KmhpZGRlbiwgaGlkZGVuXSxcclxuICogICAgICAgICBCIFtudW1fZGlyLCA4KmhpZGRlbl0gKG9wdGlvbmFsKSwgc2VxdWVuY2VfbGVucywgaW5pdGlhbF9oaWRkZW4sIGluaXRpYWxfY2VsbFxyXG4gKlxyXG4gKiBTaW1wbGlmaWVkOiBzaW5nbGUgZGlyZWN0aW9uLCBiYXRjaD0xLCAyRCBpbnB1dCBbc2VxX2xlbiwgaW5wdXRfc2l6ZV0uXHJcbiAqIFJldHVybnMgWV9oIFsxLCAxLCBoaWRkZW5fc2l6ZV0gKGxhc3QgaGlkZGVuIHN0YXRlKS5cclxuICovXHJcbmNsYXNzIExTVE1Ob2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGhpZGRlblNpemU6IG51bWJlcjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKGluZm8pO1xyXG4gICAgICAgIHRoaXMuaGlkZGVuU2l6ZSA9IHRoaXMuYXR0ckludChcImhpZGRlbl9zaXplXCIsIDApO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF07IC8vIFtzZXFfbGVuLCBpbnB1dF9zaXplXSBvciBbc2VxX2xlbiwgYmF0Y2gsIGlucHV0X3NpemVdXHJcbiAgICAgICAgY29uc3QgVyA9IGlucHV0c1sxXTsgLy8gWzEsIDQqSCwgaW5wdXRfc2l6ZV1cclxuICAgICAgICBjb25zdCBSID0gaW5wdXRzWzJdOyAvLyBbMSwgNCpILCBIXVxyXG4gICAgICAgIGNvbnN0IEIgPSBpbnB1dHMubGVuZ3RoID4gMyA/IGlucHV0c1szXSA6IG51bGw7IC8vIFsxLCA4KkhdXHJcblxyXG4gICAgICAgIGNvbnN0IHNlcUxlbiA9IFguc2hhcGVbMF07XHJcbiAgICAgICAgY29uc3QgaW5wdXRTaXplID0gWC5zaGFwZS5sZW5ndGggPj0gMyA/IFguc2hhcGVbMl0gOiBYLnNoYXBlWzFdO1xyXG4gICAgICAgIGNvbnN0IEggPSB0aGlzLmhpZGRlblNpemUgfHwgVy5kYXRhLmxlbmd0aCAvICg0ICogaW5wdXRTaXplKTtcclxuXHJcbiAgICAgICAgbGV0IGggPSBuZXcgRmxvYXQzMkFycmF5KEgpO1xyXG4gICAgICAgIGxldCBjID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuXHJcbiAgICAgICAgLy8gUHJlLWV4dHJhY3QgVyBhbmQgUiBtYXRyaWNlcyAoc3RvcmVkIGFzIFs0KkgsIGlucHV0XSBhbmQgWzQqSCwgSF0pXHJcbiAgICAgICAgY29uc3QgVzRIID0gVy5kYXRhO1xyXG4gICAgICAgIGNvbnN0IFI0SCA9IFIuZGF0YTtcclxuICAgICAgICBjb25zdCBiaWFzVyA9IEIgPyBCLmRhdGEgOiBudWxsO1xyXG5cclxuICAgICAgICBmb3IgKGxldCB0ID0gMDsgdCA8IHNlcUxlbjsgdCsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHhPZmZzZXQgPSB0ICogaW5wdXRTaXplO1xyXG4gICAgICAgICAgICBjb25zdCBnYXRlcyA9IG5ldyBGbG9hdDMyQXJyYXkoNCAqIEgpO1xyXG5cclxuICAgICAgICAgICAgLy8gZ2F0ZXMgPSBXIEAgeCArIFIgQCBoICsgYmlhc1xyXG4gICAgICAgICAgICBmb3IgKGxldCBnID0gMDsgZyA8IDQgKiBIOyBnKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dFNpemU7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHN1bSArPSBXNEhbZyAqIGlucHV0U2l6ZSArIGldICogWC5kYXRhW3hPZmZzZXQgKyBpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgSDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VtICs9IFI0SFtnICogSCArIGpdICogaFtqXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChiaWFzVykge1xyXG4gICAgICAgICAgICAgICAgICAgIHN1bSArPSBiaWFzV1tnXSArIGJpYXNXWzQgKiBIICsgZ107IC8vIFcgYmlhcyArIFIgYmlhc1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZ2F0ZXNbZ10gPSBzdW07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGk9c2lnbW9pZCwgbz1zaWdtb2lkLCBmPXNpZ21vaWQsIGMnPXRhbmggKElPRkMgb3JkZXIgaW4gT05OWClcclxuICAgICAgICAgICAgY29uc3QgbmV3SCA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5ld0MgPSBuZXcgRmxvYXQzMkFycmF5KEgpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IEg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaSA9IHNpZ21vaWQoZ2F0ZXNbMCAqIEggKyBqXSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBvID0gc2lnbW9pZChnYXRlc1sxICogSCArIGpdKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGYgPSBzaWdtb2lkKGdhdGVzWzIgKiBIICsgal0pO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZyA9IE1hdGgudGFuaChnYXRlc1szICogSCArIGpdKTtcclxuICAgICAgICAgICAgICAgIG5ld0Nbal0gPSBmICogY1tqXSArIGkgKiBnO1xyXG4gICAgICAgICAgICAgICAgbmV3SFtqXSA9IG8gKiBNYXRoLnRhbmgobmV3Q1tqXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaCA9IG5ld0g7XHJcbiAgICAgICAgICAgIGMgPSBuZXdDO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmV0dXJuIGxhc3QgaGlkZGVuIHN0YXRlIFsxLCAxLCBIXVxyXG4gICAgICAgIHJldHVybiBbbWFrZVRlbnNvcihoLCBbMSwgMSwgSF0pXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEdSVTogR2F0ZWQgUmVjdXJyZW50IFVuaXQuXHJcbiAqXHJcbiAqIFNpbXBsaWZpZWQ6IHNpbmdsZSBkaXJlY3Rpb24sIGJhdGNoPTEuXHJcbiAqIFJldHVybnMgWV9oIFsxLCAxLCBoaWRkZW5fc2l6ZV0uXHJcbiAqL1xyXG5jbGFzcyBHUlVOb2RlIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGhpZGRlblNpemU6IG51bWJlcjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKGluZm8pO1xyXG4gICAgICAgIHRoaXMuaGlkZGVuU2l6ZSA9IHRoaXMuYXR0ckludChcImhpZGRlbl9zaXplXCIsIDApO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF07XHJcbiAgICAgICAgY29uc3QgVyA9IGlucHV0c1sxXTsgLy8gWzEsIDMqSCwgaW5wdXRfc2l6ZV1cclxuICAgICAgICBjb25zdCBSID0gaW5wdXRzWzJdOyAvLyBbMSwgMypILCBIXVxyXG4gICAgICAgIGNvbnN0IEIgPSBpbnB1dHMubGVuZ3RoID4gMyA/IGlucHV0c1szXSA6IG51bGw7XHJcblxyXG4gICAgICAgIGNvbnN0IHNlcUxlbiA9IFguc2hhcGVbMF07XHJcbiAgICAgICAgY29uc3QgaW5wdXRTaXplID0gWC5zaGFwZS5sZW5ndGggPj0gMyA/IFguc2hhcGVbMl0gOiBYLnNoYXBlWzFdO1xyXG4gICAgICAgIGNvbnN0IEggPSB0aGlzLmhpZGRlblNpemUgfHwgVy5kYXRhLmxlbmd0aCAvICgzICogaW5wdXRTaXplKTtcclxuXHJcbiAgICAgICAgbGV0IGggPSBuZXcgRmxvYXQzMkFycmF5KEgpO1xyXG4gICAgICAgIGNvbnN0IFczSCA9IFcuZGF0YTtcclxuICAgICAgICBjb25zdCBSM0ggPSBSLmRhdGE7XHJcbiAgICAgICAgY29uc3QgYmlhc1cgPSBCID8gQi5kYXRhIDogbnVsbDtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCBzZXFMZW47IHQrKykge1xyXG4gICAgICAgICAgICBjb25zdCB4T2Zmc2V0ID0gdCAqIGlucHV0U2l6ZTtcclxuXHJcbiAgICAgICAgICAgIC8vIENvbXB1dGUgeiBhbmQgciBnYXRlczogZ2F0ZSA9IHNpZ21vaWQoV19nYXRlIEAgeCArIFJfZ2F0ZSBAIGggKyBiaWFzKVxyXG4gICAgICAgICAgICBjb25zdCB6R2F0ZSA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHJHYXRlID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBIOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCB6U3VtID0gMDtcclxuICAgICAgICAgICAgICAgIGxldCByU3VtID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRTaXplOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICB6U3VtICs9IFczSFsoMCAqIEggKyBqKSAqIGlucHV0U2l6ZSArIGldICogWC5kYXRhW3hPZmZzZXQgKyBpXTtcclxuICAgICAgICAgICAgICAgICAgICByU3VtICs9IFczSFsoMSAqIEggKyBqKSAqIGlucHV0U2l6ZSArIGldICogWC5kYXRhW3hPZmZzZXQgKyBpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgSDsgaysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgelN1bSArPSBSM0hbKDAgKiBIICsgaikgKiBIICsga10gKiBoW2tdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJTdW0gKz0gUjNIWygxICogSCArIGopICogSCArIGtdICogaFtrXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChiaWFzVykge1xyXG4gICAgICAgICAgICAgICAgICAgIHpTdW0gKz0gYmlhc1dbMCAqIEggKyBqXSArIGJpYXNXWzMgKiBIICsgal07XHJcbiAgICAgICAgICAgICAgICAgICAgclN1bSArPSBiaWFzV1sxICogSCArIGpdICsgYmlhc1dbNCAqIEggKyBqXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHpHYXRlW2pdID0gc2lnbW9pZCh6U3VtKTtcclxuICAgICAgICAgICAgICAgIHJHYXRlW2pdID0gc2lnbW9pZChyU3VtKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gQ29tcHV0ZSBjYW5kaWRhdGUgd2l0aCBsaW5lYXJfYmVmb3JlX3Jlc2V0PTEgKE9OTlggZGVmYXVsdCBmb3IgbW9zdCBleHBvcnRlcnMpOlxyXG4gICAgICAgICAgICAvLyBuID0gdGFuaChXbiBAIHggKyBXYl9uICsgciAqIChSbiBAIGggKyBSYl9uKSlcclxuICAgICAgICAgICAgY29uc3QgbmV3SCA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgSDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgblN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0U2l6ZTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgblN1bSArPSBXM0hbKDIgKiBIICsgaikgKiBpbnB1dFNpemUgKyBpXSAqIFguZGF0YVt4T2Zmc2V0ICsgaV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoYmlhc1cpIHtcclxuICAgICAgICAgICAgICAgICAgICBuU3VtICs9IGJpYXNXWzIgKiBIICsgal07IC8vIFcgYmlhcyBmb3IgY2FuZGlkYXRlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBIOyBrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICByaCArPSBSM0hbKDIgKiBIICsgaikgKiBIICsga10gKiBoW2tdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGJpYXNXKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmggKz0gYmlhc1dbNSAqIEggKyBqXTsgLy8gUiBiaWFzIGZvciBjYW5kaWRhdGUgKGluc2lkZSByZXNldClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIG5TdW0gKz0gckdhdGVbal0gKiByaDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG4gPSBNYXRoLnRhbmgoblN1bSk7XHJcbiAgICAgICAgICAgICAgICBuZXdIW2pdID0gKDEgLSB6R2F0ZVtqXSkgKiBuICsgekdhdGVbal0gKiBoW2pdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGggPSBuZXdIO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKGgsIFsxLCAxLCBIXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJSZWN1cnJlbnRPcHMocmVnaXN0cnk6IE9ubnhPcFJlZ2lzdHJ5KTogdm9pZCB7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkxTVE1cIiwgKGluZm8pID0+IG5ldyBMU1RNTm9kZShpbmZvKSk7XHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkdSVVwiLCAoaW5mbykgPT4gbmV3IEdSVU5vZGUoaW5mbykpO1xyXG59XHJcbiIsImltcG9ydCB0eXBlIHsgSVRlbnNvciB9IGZyb20gXCIuLi8uLi9jb21wdXRlL2NvbXB1dGUuaW50ZXJmYWNlc1wiO1xyXG5pbXBvcnQgdHlwZSB7IE9ubnhOb2RlSW5mbyB9IGZyb20gXCIuLi9vbm54LXR5cGVzXCI7XHJcbmltcG9ydCB7IE9ubnhPcE5vZGUsIG1ha2VUZW5zb3IsIE9ubnhPcFJlZ2lzdHJ5LCBQUklPUklUWV9OQVRJVkUgfSBmcm9tIFwiLi4vcmVnaXN0cnlcIjtcclxuXHJcbmNvbnN0IEJBQ0tFTkQgPSBcInNwaWt5cGFuZGFcIjtcclxuXHJcbi8vIOKUgOKUgOKUgCBBY3RpdmF0aW9uIGZ1bmN0aW9ucyAobWF0Y2hpbmcgc3Bpa3lwYW5kYS1jb3JlIEFjdGl2YXRpb25GdW5jdGlvbnMpIOKUgOKUgOKUgOKUgFxyXG5cclxuZnVuY3Rpb24gc3BSZWx1KHg6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gTWF0aC5tYXgoMCwgeCk7XHJcbn1cclxuZnVuY3Rpb24gc3BTaWdtb2lkKHg6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICByZXR1cm4gMSAvICgxICsgTWF0aC5leHAoLXgpKTtcclxufVxyXG5mdW5jdGlvbiBzcFRhbmgoeDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBNYXRoLnRhbmgoeCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVuYXJ5TWFwKGlucDogSVRlbnNvciwgZm46ICh4OiBudW1iZXIpID0+IG51bWJlcik6IElUZW5zb3Ige1xyXG4gICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShpbnAuZGF0YS5sZW5ndGgpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnAuZGF0YS5sZW5ndGg7IGkrKykgb3V0W2ldID0gZm4oaW5wLmRhdGFbaV0pO1xyXG4gICAgcmV0dXJuIG1ha2VUZW5zb3Iob3V0LCBbLi4uaW5wLnNoYXBlXSk7XHJcbn1cclxuXHJcbmNsYXNzIFNwR2VtbU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYWxwaGE6IG51bWJlcjtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgYmV0YTogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSB0cmFuc0E6IGJvb2xlYW47XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRyYW5zQjogYm9vbGVhbjtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGluZm86IE9ubnhOb2RlSW5mbykge1xyXG4gICAgICAgIHN1cGVyKGluZm8pO1xyXG4gICAgICAgIHRoaXMuYWxwaGEgPSB0aGlzLmF0dHIoXCJhbHBoYVwiLCAxLjApO1xyXG4gICAgICAgIHRoaXMuYmV0YSA9IHRoaXMuYXR0cihcImJldGFcIiwgMS4wKTtcclxuICAgICAgICB0aGlzLnRyYW5zQSA9IHRoaXMuYXR0ckludChcInRyYW5zQVwiLCAwKSAhPT0gMDtcclxuICAgICAgICB0aGlzLnRyYW5zQiA9IHRoaXMuYXR0ckludChcInRyYW5zQlwiLCAwKSAhPT0gMDtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBBID0gaW5wdXRzWzBdLFxyXG4gICAgICAgICAgICBCID0gaW5wdXRzWzFdO1xyXG4gICAgICAgIGNvbnN0IEMgPSBpbnB1dHMubGVuZ3RoID4gMiA/IGlucHV0c1syXSA6IG51bGw7XHJcbiAgICAgICAgY29uc3QgYVIgPSBBLnNoYXBlWzBdID8/IDEsXHJcbiAgICAgICAgICAgIGFDID0gQS5zaGFwZS5sZW5ndGggPj0gMiA/IEEuc2hhcGVbMV0gOiBBLmRhdGEubGVuZ3RoO1xyXG4gICAgICAgIGNvbnN0IGJSID0gQi5zaGFwZVswXSA/PyAxLFxyXG4gICAgICAgICAgICBiQyA9IEIuc2hhcGUubGVuZ3RoID49IDIgPyBCLnNoYXBlWzFdIDogQi5kYXRhLmxlbmd0aDtcclxuICAgICAgICBjb25zdCBNID0gdGhpcy50cmFuc0EgPyBhQyA6IGFSO1xyXG4gICAgICAgIGNvbnN0IEsgPSB0aGlzLnRyYW5zQSA/IGFSIDogYUM7XHJcbiAgICAgICAgY29uc3QgTiA9IHRoaXMudHJhbnNCID8gYlIgOiBiQztcclxuXHJcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShNICogTik7XHJcbiAgICAgICAgY29uc3QgYURhdGEgPSBBLmRhdGEsXHJcbiAgICAgICAgICAgIGJEYXRhID0gQi5kYXRhO1xyXG5cclxuICAgICAgICAvLyBPcHRpbWl6ZWQ6IGxvb3AgdGlsaW5nIGZvciBjYWNoZSBsb2NhbGl0eSBvbiBzbWFsbCBtYXRyaWNlc1xyXG4gICAgICAgIGlmICghdGhpcy50cmFuc0EgJiYgIXRoaXMudHJhbnNCKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG0gPSAwOyBtIDwgTTsgbSsrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBtSyA9IG0gKiBLO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbU4gPSBtICogTjtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgSzsgaysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYSA9IHRoaXMuYWxwaGEgKiBhRGF0YVttSyArIGtdO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtOID0gayAqIE47XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBOOyBuKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0W21OICsgbl0gKz0gYSAqIGJEYXRhW2tOICsgbl07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgbSA9IDA7IG0gPCBNOyBtKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgTjsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBLOyBrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWkgPSB0aGlzLnRyYW5zQSA/IGsgKiBNICsgbSA6IG0gKiBLICsgaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYmkgPSB0aGlzLnRyYW5zQiA/IG4gKiBLICsgayA6IGsgKiBOICsgbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VtICs9IGFEYXRhW2FpXSAqIGJEYXRhW2JpXTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W20gKiBOICsgbl0gPSB0aGlzLmFscGhhICogc3VtO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoQykge1xyXG4gICAgICAgICAgICBjb25zdCBjRGF0YSA9IEMuZGF0YTtcclxuICAgICAgICAgICAgY29uc3QgY0xlbiA9IGNEYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgaWYgKGNMZW4gPT09IE4pIHtcclxuICAgICAgICAgICAgICAgIC8vIEJpYXMgaXMgWzEsIE5dOiBicm9hZGNhc3QgcGVyIHJvd1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgbSA9IDA7IG0gPCBNOyBtKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtTiA9IG0gKiBOO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgTjsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dFttTiArIG5dICs9IHRoaXMuYmV0YSAqIGNEYXRhW25dO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W2ldICs9IHRoaXMuYmV0YSAqIGNEYXRhW2kgJSBjTGVuXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW00sIE5dKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFNwTHN0bU5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaGlkZGVuU2l6ZTogbnVtYmVyO1xyXG4gICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5mbzogT25ueE5vZGVJbmZvKSB7XHJcbiAgICAgICAgc3VwZXIoaW5mbyk7XHJcbiAgICAgICAgdGhpcy5oaWRkZW5TaXplID0gdGhpcy5hdHRySW50KFwiaGlkZGVuX3NpemVcIiwgMCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgY29uc3QgWCA9IGlucHV0c1swXTtcclxuICAgICAgICBjb25zdCBXID0gaW5wdXRzWzFdO1xyXG4gICAgICAgIGNvbnN0IFIgPSBpbnB1dHNbMl07XHJcbiAgICAgICAgY29uc3QgQiA9IGlucHV0cy5sZW5ndGggPiAzID8gaW5wdXRzWzNdIDogbnVsbDtcclxuXHJcbiAgICAgICAgY29uc3Qgc2VxTGVuID0gWC5zaGFwZVswXTtcclxuICAgICAgICBjb25zdCBpbnB1dFNpemUgPSBYLnNoYXBlLmxlbmd0aCA+PSAzID8gWC5zaGFwZVsyXSA6IFguc2hhcGVbMV07XHJcbiAgICAgICAgY29uc3QgSCA9IHRoaXMuaGlkZGVuU2l6ZSB8fCBXLmRhdGEubGVuZ3RoIC8gKDQgKiBpbnB1dFNpemUpO1xyXG5cclxuICAgICAgICBsZXQgaCA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgbGV0IGMgPSBuZXcgRmxvYXQzMkFycmF5KEgpO1xyXG4gICAgICAgIGNvbnN0IFc0SCA9IFcuZGF0YSxcclxuICAgICAgICAgICAgUjRIID0gUi5kYXRhO1xyXG4gICAgICAgIGNvbnN0IGJpYXNXID0gQiA/IEIuZGF0YSA6IG51bGw7XHJcblxyXG4gICAgICAgIC8vIFByZS1hbGxvY2F0ZSBnYXRlIGJ1ZmZlclxyXG4gICAgICAgIGNvbnN0IGdhdGVzID0gbmV3IEZsb2F0MzJBcnJheSg0ICogSCk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IHQgPSAwOyB0IDwgc2VxTGVuOyB0KyspIHtcclxuICAgICAgICAgICAgY29uc3QgeE9mZiA9IHQgKiBpbnB1dFNpemU7XHJcblxyXG4gICAgICAgICAgICAvLyBDb21wdXRlIGdhdGVzOiBXKnggKyBSKmggKyBiaWFzXHJcbiAgICAgICAgICAgIGdhdGVzLmZpbGwoMCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGcgPSAwOyBnIDwgNCAqIEg7IGcrKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBnSW5wdXQgPSBnICogaW5wdXRTaXplO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZ0hpZGRlbiA9IGcgKiBIO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dFNpemU7IGkrKykgc3VtICs9IFc0SFtnSW5wdXQgKyBpXSAqIFguZGF0YVt4T2ZmICsgaV07XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IEg7IGorKykgc3VtICs9IFI0SFtnSGlkZGVuICsgal0gKiBoW2pdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGJpYXNXKSBzdW0gKz0gYmlhc1dbZ10gKyBiaWFzV1s0ICogSCArIGddO1xyXG4gICAgICAgICAgICAgICAgZ2F0ZXNbZ10gPSBzdW07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEFwcGx5IGdhdGUgZnVuY3Rpb25zIChJT0ZDIG9yZGVyKVxyXG4gICAgICAgICAgICBjb25zdCBuZXdIID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuICAgICAgICAgICAgY29uc3QgbmV3QyA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgSDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpID0gc3BTaWdtb2lkKGdhdGVzW2pdKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG8gPSBzcFNpZ21vaWQoZ2F0ZXNbSCArIGpdKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGYgPSBzcFNpZ21vaWQoZ2F0ZXNbMiAqIEggKyBqXSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBnID0gc3BUYW5oKGdhdGVzWzMgKiBIICsgal0pO1xyXG4gICAgICAgICAgICAgICAgbmV3Q1tqXSA9IGYgKiBjW2pdICsgaSAqIGc7XHJcbiAgICAgICAgICAgICAgICBuZXdIW2pdID0gbyAqIHNwVGFuaChuZXdDW2pdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBoID0gbmV3SDtcclxuICAgICAgICAgICAgYyA9IG5ld0M7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IoaCwgWzEsIDEsIEhdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFNwR3J1Tm9kZSBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBoaWRkZW5TaXplOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcihpbmZvKTtcclxuICAgICAgICB0aGlzLmhpZGRlblNpemUgPSB0aGlzLmF0dHJJbnQoXCJoaWRkZW5fc2l6ZVwiLCAwKTtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICBjb25zdCBYID0gaW5wdXRzWzBdO1xyXG4gICAgICAgIGNvbnN0IFcgPSBpbnB1dHNbMV07XHJcbiAgICAgICAgY29uc3QgUiA9IGlucHV0c1syXTtcclxuICAgICAgICBjb25zdCBCID0gaW5wdXRzLmxlbmd0aCA+IDMgPyBpbnB1dHNbM10gOiBudWxsO1xyXG5cclxuICAgICAgICBjb25zdCBzZXFMZW4gPSBYLnNoYXBlWzBdO1xyXG4gICAgICAgIGNvbnN0IGlucHV0U2l6ZSA9IFguc2hhcGUubGVuZ3RoID49IDMgPyBYLnNoYXBlWzJdIDogWC5zaGFwZVsxXTtcclxuICAgICAgICBjb25zdCBIID0gdGhpcy5oaWRkZW5TaXplIHx8IFcuZGF0YS5sZW5ndGggLyAoMyAqIGlucHV0U2l6ZSk7XHJcblxyXG4gICAgICAgIGxldCBoID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCBzZXFMZW47IHQrKykge1xyXG4gICAgICAgICAgICBjb25zdCB4T2ZmID0gdCAqIGlucHV0U2l6ZTtcclxuXHJcbiAgICAgICAgICAgIC8vIENvbXB1dGUgeiBhbmQgciBnYXRlczogZ2F0ZSA9IHNpZ21vaWQoV19nYXRlIEAgeCArIFJfZ2F0ZSBAIGggKyBiaWFzKVxyXG4gICAgICAgICAgICBjb25zdCB6R2F0ZSA9IG5ldyBGbG9hdDMyQXJyYXkoSCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHJHYXRlID0gbmV3IEZsb2F0MzJBcnJheShIKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBIOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCB6U3VtID0gMDtcclxuICAgICAgICAgICAgICAgIGxldCByU3VtID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRTaXplOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICB6U3VtICs9IFcuZGF0YVsoMCAqIEggKyBqKSAqIGlucHV0U2l6ZSArIGldICogWC5kYXRhW3hPZmYgKyBpXTtcclxuICAgICAgICAgICAgICAgICAgICByU3VtICs9IFcuZGF0YVsoMSAqIEggKyBqKSAqIGlucHV0U2l6ZSArIGldICogWC5kYXRhW3hPZmYgKyBpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgSDsgaysrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgelN1bSArPSBSLmRhdGFbKDAgKiBIICsgaikgKiBIICsga10gKiBoW2tdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJTdW0gKz0gUi5kYXRhWygxICogSCArIGopICogSCArIGtdICogaFtrXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChCKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgelN1bSArPSBCLmRhdGFbMCAqIEggKyBqXSArIEIuZGF0YVszICogSCArIGpdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJTdW0gKz0gQi5kYXRhWzEgKiBIICsgal0gKyBCLmRhdGFbNCAqIEggKyBqXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHpHYXRlW2pdID0gc3BTaWdtb2lkKHpTdW0pO1xyXG4gICAgICAgICAgICAgICAgckdhdGVbal0gPSBzcFNpZ21vaWQoclN1bSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIENhbmRpZGF0ZSB3aXRoIGxpbmVhcl9iZWZvcmVfcmVzZXQ9MTpcclxuICAgICAgICAgICAgLy8gbiA9IHRhbmgoV24gQCB4ICsgV2JfbiArIHIgKiAoUm4gQCBoICsgUmJfbikpXHJcbiAgICAgICAgICAgIGNvbnN0IG5ld0ggPSBuZXcgRmxvYXQzMkFycmF5KEgpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IEg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5TdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dFNpemU7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIG5TdW0gKz0gVy5kYXRhWygyICogSCArIGopICogaW5wdXRTaXplICsgaV0gKiBYLmRhdGFbeE9mZiArIGldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKEIpIG5TdW0gKz0gQi5kYXRhWzIgKiBIICsgal07XHJcbiAgICAgICAgICAgICAgICBsZXQgcmggPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBIOyBrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICByaCArPSBSLmRhdGFbKDIgKiBIICsgaikgKiBIICsga10gKiBoW2tdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKEIpIHJoICs9IEIuZGF0YVs1ICogSCArIGpdO1xyXG4gICAgICAgICAgICAgICAgblN1bSArPSByR2F0ZVtqXSAqIHJoO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbiA9IHNwVGFuaChuU3VtKTtcclxuICAgICAgICAgICAgICAgIG5ld0hbal0gPSAoMSAtIHpHYXRlW2pdKSAqIG4gKyB6R2F0ZVtqXSAqIGhbal07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaCA9IG5ld0g7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gW21ha2VUZW5zb3IoaCwgWzEsIDEsIEhdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFNwQ29udk5vZGUgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG5cclxuICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgIGNvbnN0IFggPSBpbnB1dHNbMF0sXHJcbiAgICAgICAgICAgIFcgPSBpbnB1dHNbMV07XHJcbiAgICAgICAgY29uc3QgQiA9IGlucHV0cy5sZW5ndGggPiAyID8gaW5wdXRzWzJdIDogbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKFguc2hhcGUubGVuZ3RoIDw9IDIpIHtcclxuICAgICAgICAgICAgLy8gVHJlYXQgMkQgYXMgZnVsbHkgY29ubmVjdGVkXHJcbiAgICAgICAgICAgIGNvbnN0IGZlYXR1cmVzID0gWC5zaGFwZS5sZW5ndGggPT09IDIgPyBYLnNoYXBlWzFdIDogWC5kYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBYLnNoYXBlWzBdID8/IDE7XHJcbiAgICAgICAgICAgIGNvbnN0IG91dEYgPSBXLnNoYXBlWzBdID8/IFcuZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgICAgIGNvbnN0IHdDb2xzID0gVy5kYXRhLmxlbmd0aCAvIG91dEY7XHJcbiAgICAgICAgICAgIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoYmF0Y2ggKiBvdXRGKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBiYXRjaDsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBvID0gMDsgbyA8IG91dEY7IG8rKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlbiA9IE1hdGgubWluKHdDb2xzLCBmZWF0dXJlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbkYgPSBuICogZmVhdHVyZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9XID0gbyAqIHdDb2xzO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHN1bSArPSBYLmRhdGFbbkYgKyBpXSAqIFcuZGF0YVtvVyArIGldO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChCKSBzdW0gKz0gQi5kYXRhW28gJSBCLmRhdGEubGVuZ3RoXTtcclxuICAgICAgICAgICAgICAgICAgICBvdXRbbiAqIG91dEYgKyBvXSA9IHN1bTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gW21ha2VUZW5zb3Iob3V0LCBbYmF0Y2gsIG91dEZdKV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAzRDogW04sIENfaW4sIExdXHJcbiAgICAgICAgY29uc3QgTiA9IFguc2hhcGVbMF0sXHJcbiAgICAgICAgICAgIENfaW4gPSBYLnNoYXBlWzFdLFxyXG4gICAgICAgICAgICBMID0gWC5zaGFwZVsyXTtcclxuICAgICAgICBjb25zdCBDX291dCA9IFcuc2hhcGVbMF07XHJcbiAgICAgICAgY29uc3Qga0wgPSBXLnNoYXBlLmxlbmd0aCA+PSAzID8gVy5zaGFwZVsyXSA6IDE7XHJcbiAgICAgICAgY29uc3Qgc3RyaWRlID0gdGhpcy5hdHRySW50KFwic3RyaWRlc1wiLCAxKTtcclxuICAgICAgICBjb25zdCBwYWQgPSB0aGlzLmF0dHJJbnQoXCJwYWRzXCIsIDApO1xyXG4gICAgICAgIGNvbnN0IG91dEwgPSBNYXRoLmZsb29yKChMICsgMiAqIHBhZCAtIGtMKSAvIHN0cmlkZSkgKyAxO1xyXG5cclxuICAgICAgICBjb25zdCBvdXQgPSBuZXcgRmxvYXQzMkFycmF5KE4gKiBDX291dCAqIG91dEwpO1xyXG4gICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgTjsgbisrKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGNvID0gMDsgY28gPCBDX291dDsgY28rKykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgb2wgPSAwOyBvbCA8IG91dEw7IG9sKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3VtID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBjaSA9IDA7IGNpIDwgQ19pbjsgY2krKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBrayA9IDA7IGtrIDwga0w7IGtrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlsID0gb2wgKiBzdHJpZGUgLSBwYWQgKyBraztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbCA+PSAwICYmIGlsIDwgTCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1bSArPSBYLmRhdGFbbiAqIENfaW4gKiBMICsgY2kgKiBMICsgaWxdICogVy5kYXRhW2NvICogQ19pbiAqIGtMICsgY2kgKiBrTCArIGtrXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoQikgc3VtICs9IEIuZGF0YVtjb107XHJcbiAgICAgICAgICAgICAgICAgICAgb3V0W24gKiBDX291dCAqIG91dEwgKyBjbyAqIG91dEwgKyBvbF0gPSBzdW07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFttYWtlVGVuc29yKG91dCwgW04sIENfb3V0LCBvdXRMXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyDilIDilIDilIAgUmVnaXN0cmF0aW9uIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuLyoqXHJcbiAqIFJlZ2lzdGVyIFNwaWt5UGFuZGEgbmF0aXZlIGltcGxlbWVudGF0aW9ucyBhdCBQUklPUklUWV9OQVRJVkUuXHJcbiAqIFRoZXNlIG92ZXJyaWRlIHRoZSBnZW5lcmljIE9OTlggaW1wbGVtZW50YXRpb25zIGZvciBrZXkgb3BzLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyU3Bpa3lQYW5kYU9wcyhyZWdpc3RyeTogT25ueE9wUmVnaXN0cnkpOiB2b2lkIHtcclxuICAgIC8vIEFjdGl2YXRpb25zICh1c2luZyBTcGlreVBhbmRhJ3MgYWN0aXZhdGlvbiBmdW5jdGlvbnMpXHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcclxuICAgICAgICBcIlJlbHVcIixcclxuICAgICAgICAoaW5mbykgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBuID0gbmV3IChjbGFzcyBleHRlbmRzIE9ubnhPcE5vZGUge1xyXG4gICAgICAgICAgICAgICAgcmVhZG9ubHkgb3V0cHV0U2hhcGVzOiBudW1iZXJbXVtdID0gW107XHJcbiAgICAgICAgICAgICAgICBleGVjdXRlKGlucHV0czogSVRlbnNvcltdKTogSVRlbnNvcltdIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3VuYXJ5TWFwKGlucHV0c1swXSwgc3BSZWx1KV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pKGluZm8pO1xyXG4gICAgICAgICAgICByZXR1cm4gbjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIFBSSU9SSVRZX05BVElWRSxcclxuICAgICAgICBCQUNLRU5EXHJcbiAgICApO1xyXG5cclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFxyXG4gICAgICAgIFwiU2lnbW9pZFwiLFxyXG4gICAgICAgIChpbmZvKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IG4gPSBuZXcgKGNsYXNzIGV4dGVuZHMgT25ueE9wTm9kZSB7XHJcbiAgICAgICAgICAgICAgICByZWFkb25seSBvdXRwdXRTaGFwZXM6IG51bWJlcltdW10gPSBbXTtcclxuICAgICAgICAgICAgICAgIGV4ZWN1dGUoaW5wdXRzOiBJVGVuc29yW10pOiBJVGVuc29yW10ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbdW5hcnlNYXAoaW5wdXRzWzBdLCBzcFNpZ21vaWQpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSkoaW5mbyk7XHJcbiAgICAgICAgICAgIHJldHVybiBuO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgUFJJT1JJVFlfTkFUSVZFLFxyXG4gICAgICAgIEJBQ0tFTkRcclxuICAgICk7XHJcblxyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXHJcbiAgICAgICAgXCJUYW5oXCIsXHJcbiAgICAgICAgKGluZm8pID0+IHtcclxuICAgICAgICAgICAgY29uc3QgbiA9IG5ldyAoY2xhc3MgZXh0ZW5kcyBPbm54T3BOb2RlIHtcclxuICAgICAgICAgICAgICAgIHJlYWRvbmx5IG91dHB1dFNoYXBlczogbnVtYmVyW11bXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZXhlY3V0ZShpbnB1dHM6IElUZW5zb3JbXSk6IElUZW5zb3JbXSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt1bmFyeU1hcChpbnB1dHNbMF0sIHNwVGFuaCldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KShpbmZvKTtcclxuICAgICAgICAgICAgcmV0dXJuIG47XHJcbiAgICAgICAgfSxcclxuICAgICAgICBQUklPUklUWV9OQVRJVkUsXHJcbiAgICAgICAgQkFDS0VORFxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBNYXRyaXggb3BzXHJcbiAgICByZWdpc3RyeS5yZWdpc3RlcihcIkdlbW1cIiwgKGluZm8pID0+IG5ldyBTcEdlbW1Ob2RlKGluZm8pLCBQUklPUklUWV9OQVRJVkUsIEJBQ0tFTkQpO1xyXG5cclxuICAgIC8vIFJlY3VycmVudFxyXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoXCJMU1RNXCIsIChpbmZvKSA9PiBuZXcgU3BMc3RtTm9kZShpbmZvKSwgUFJJT1JJVFlfTkFUSVZFLCBCQUNLRU5EKTtcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiR1JVXCIsIChpbmZvKSA9PiBuZXcgU3BHcnVOb2RlKGluZm8pLCBQUklPUklUWV9OQVRJVkUsIEJBQ0tFTkQpO1xyXG5cclxuICAgIC8vIENvbnZcclxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKFwiQ29udlwiLCAoaW5mbykgPT4gbmV3IFNwQ29udk5vZGUoaW5mbyksIFBSSU9SSVRZX05BVElWRSwgQkFDS0VORCk7XHJcbn1cclxuIiwiZXhwb3J0ICogZnJvbSBcIi4vc3RyZWFtXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9yZWFkZXJcIjtcbmV4cG9ydCAqIGZyb20gXCIuL3dyaXRlclwiO1xuIiwiLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXHJcbi8vIFByb3RvYnVmIHdpcmUgZm9ybWF0IHJlYWRlclxyXG4vL1xyXG4vLyBQb3J0ZWQgZnJvbSBDeWFuTXljZWxpdW0vQmx1ZVN0ZWVsTGFkeUJ1ZyBDKysgaW1wbGVtZW50YXRpb24gKGxiX3BhcnNlcikuXHJcbi8vIFJlYWRzIHByb3RvYnVmLWVuY29kZWQgYmluYXJ5IGRhdGEgd2l0aG91dCByZXF1aXJpbmcgZ2VuZXJhdGVkIGNvZGUgb3JcclxuLy8gZXh0ZXJuYWwgZGVwZW5kZW5jaWVzLlxyXG4vL1xyXG4vLyBTdXBwb3J0czpcclxuLy8gICAtIFZhcmludCwgZml4ZWQzMiwgZml4ZWQ2NCB3aXJlIHR5cGVzXHJcbi8vICAgLSBMZW5ndGgtZGVsaW1pdGVkIGZpZWxkcyAoc3RyaW5ncywgYnl0ZXMsIHN1Yi1tZXNzYWdlcylcclxuLy8gICAtIFBhY2tlZCByZXBlYXRlZCBmaWVsZHNcclxuLy8gICAtIFNhdmUvcmVzdG9yZSBzbmFwc2hvdHMgZm9yIHR3by1wYXNzIHBhcnNpbmdcclxuLy8gICAtIFN1Yi1tZXNzYWdlIHJlYWRlcnMgd2l0aCBib3VuZGVkIHNjb3BlXHJcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxyXG5cclxuaW1wb3J0IHsgSUlucHV0U3RyZWFtLCBMQl9FT0YsIFNlZWtPcmlnaW4sIFN0cmVhbVZpZXcgfSBmcm9tIFwiLi9zdHJlYW1cIjtcclxuXHJcbmNvbnN0IE1BWF9SRUFERVJfU05BUFNIT1RfREVQVEggPSA4O1xyXG5cclxuLy8g4pSA4pSA4pSAIFdpcmUgdHlwZXMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG5leHBvcnQgZW51bSBXaXJlVHlwZSB7XHJcbiAgICBWQVJJTlQgPSAwLFxyXG4gICAgRklYRUQ2NCA9IDEsXHJcbiAgICBMRU4gPSAyLFxyXG4gICAgRklYRUQzMiA9IDUsXHJcbn1cclxuXHJcbi8vIOKUgOKUgOKUgCBJbnRlcm5hbCBzdGF0ZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbmludGVyZmFjZSBSZWFkZXJTdGF0dXMge1xyXG4gICAgZmllbGROdW1iZXI6IG51bWJlcjtcclxuICAgIHdpcmVUeXBlOiBXaXJlVHlwZTtcclxuICAgIGRlcHRoOiBudW1iZXI7XHJcbiAgICBsZW5ndGg6IG51bWJlcjtcclxuICAgIGxlbmd0aFJlYWQ6IGJvb2xlYW47XHJcbn1cclxuXHJcbmludGVyZmFjZSBSZWFkZXJTbmFwc2hvdCB7XHJcbiAgICBwb3NpdGlvbjogbnVtYmVyO1xyXG4gICAgc3RhdHVzOiBSZWFkZXJTdGF0dXM7XHJcbn1cclxuXHJcbi8vIOKUgOKUgOKUgCBTY3JhdGNoIGJ1ZmZlcnMgKHJldXNlZCBhY3Jvc3MgcmVhZHMgdG8gYXZvaWQgYWxsb2NhdGlvbnMpIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuY29uc3QgX3NjcmF0Y2g0ID0gbmV3IFVpbnQ4QXJyYXkoNCk7XHJcbmNvbnN0IF9zY3JhdGNoOCA9IG5ldyBVaW50OEFycmF5KDgpO1xyXG5jb25zdCBfdmlldzQgPSBuZXcgRGF0YVZpZXcoX3NjcmF0Y2g0LmJ1ZmZlcik7XHJcbmNvbnN0IF92aWV3OCA9IG5ldyBEYXRhVmlldyhfc2NyYXRjaDguYnVmZmVyKTtcclxuXHJcbi8vIOKUgOKUgOKUgCBQQlJlYWRlciDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbi8qKlxyXG4gKiBQdWxsLXN0eWxlIHByb3RvYnVmIHJlYWRlci4gUmVhZHMgdGFncywgdGhlbiB2YWx1ZXMgb24gZGVtYW5kLlxyXG4gKlxyXG4gKiBFcXVpdmFsZW50IHRvIEJsdWVTdGVlbExhZHlCdWc6OlBCUmVhZGVyLlxyXG4gKlxyXG4gKiBVc2FnZTpcclxuICogYGBgdHlwZXNjcmlwdFxyXG4gKiBjb25zdCByZWFkZXIgPSBuZXcgUEJSZWFkZXIobmV3IE1lbW9yeVN0cmVhbShieXRlcykpO1xyXG4gKiB3aGlsZSAocmVhZGVyLnJlYWRUYWcoKSkge1xyXG4gKiAgICAgc3dpdGNoIChyZWFkZXIuZmllbGROdW1iZXIpIHtcclxuICogICAgICAgICBjYXNlIDE6IHZhbHVlID0gcmVhZGVyLnJlYWRJbnQzMigpOyBicmVhaztcclxuICogICAgICAgICBjYXNlIDI6IG5hbWUgPSByZWFkZXIucmVhZFN0cmluZygyNTYpOyBicmVhaztcclxuICogICAgICAgICBkZWZhdWx0OiByZWFkZXIuc2tpcCgpOyBicmVhaztcclxuICogICAgIH1cclxuICogfVxyXG4gKiBgYGBcclxuICovXHJcbmV4cG9ydCBjbGFzcyBQQlJlYWRlciB7XHJcbiAgICBwcm90ZWN0ZWQgX2lucHV0OiBJSW5wdXRTdHJlYW07XHJcbiAgICBwcm90ZWN0ZWQgX3N0YXR1czogUmVhZGVyU3RhdHVzO1xyXG4gICAgcHJvdGVjdGVkIF9zbmFwc2hvdHM6IFJlYWRlclNuYXBzaG90W107XHJcbiAgICBwcm90ZWN0ZWQgX2FjdGl2ZVNuYXBzaG90OiBudW1iZXI7XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKGlucHV0OiBJSW5wdXRTdHJlYW0pIHtcclxuICAgICAgICB0aGlzLl9pbnB1dCA9IGlucHV0O1xyXG4gICAgICAgIHRoaXMuX3N0YXR1cyA9IHtcclxuICAgICAgICAgICAgZmllbGROdW1iZXI6IDAsXHJcbiAgICAgICAgICAgIHdpcmVUeXBlOiBXaXJlVHlwZS5WQVJJTlQsXHJcbiAgICAgICAgICAgIGRlcHRoOiAwLFxyXG4gICAgICAgICAgICBsZW5ndGg6IDAsXHJcbiAgICAgICAgICAgIGxlbmd0aFJlYWQ6IGZhbHNlLFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5fc25hcHNob3RzID0gbmV3IEFycmF5KE1BWF9SRUFERVJfU05BUFNIT1RfREVQVEgpO1xyXG4gICAgICAgIHRoaXMuX2FjdGl2ZVNuYXBzaG90ID0gLTE7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFRhZyByZWFkaW5nIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVhZCB0aGUgbmV4dCBwcm90b2J1ZiB0YWcgZnJvbSB0aGUgaW5wdXQuXHJcbiAgICAgKiBBZnRlciB0aGlzIGNhbGwsIGBmaWVsZE51bWJlcmAgYW5kIGB3aXJlVHlwZWAgYXJlIHNldC5cclxuICAgICAqIEByZXR1cm5zIHRydWUgaWYgYSB0YWcgd2FzIHJlYWQ7IGZhbHNlIGF0IGVuZCBvZiBzdHJlYW0uXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyByZWFkVGFnKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGNvbnN0IHRhZyA9IHRoaXMuX3JlYWRWYXJpbnQoKTtcclxuICAgICAgICBpZiAodGFnID09PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5fc3RhdHVzLmZpZWxkTnVtYmVyID0gTnVtYmVyKHRhZykgPj4+IDM7XHJcbiAgICAgICAgdGhpcy5fc3RhdHVzLndpcmVUeXBlID0gKE51bWJlcih0YWcpICYgMHgwNykgYXMgV2lyZVR5cGU7XHJcbiAgICAgICAgdGhpcy5fc3RhdHVzLmxlbmd0aFJlYWQgPSBmYWxzZTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgQWNjZXNzb3JzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHB1YmxpYyBnZXQgZmllbGROdW1iZXIoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdHVzLmZpZWxkTnVtYmVyO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgd2lyZVR5cGUoKTogV2lyZVR5cGUge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0dXMud2lyZVR5cGU7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBkZXB0aCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0dXMuZGVwdGg7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBwb3NpdGlvbigpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9pbnB1dC5nZXRQb3NpdGlvbigpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgc2l6ZSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9pbnB1dC5nZXRTaXplKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCByZW1haW5pbmdCeXRlcygpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9pbnB1dC5nZXRSZW1haW5pbmdCeXRlcygpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgaW5wdXQoKTogSUlucHV0U3RyZWFtIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5faW5wdXQ7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFZhbHVlIHJlYWRlcnMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgLyoqIFJlYWQgYSBsZW5ndGggcHJlZml4IChmb3IgTEVOIHdpcmUgdHlwZSkuIENhY2hlcyB0aGUgbGVuZ3RoLiAqL1xyXG4gICAgcHVibGljIHJlYWRMZW5ndGgodmFsaWRhdGU6IGJvb2xlYW4gPSB0cnVlKTogbnVtYmVyIHwgbnVsbCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3N0YXR1cy53aXJlVHlwZSAhPT0gV2lyZVR5cGUuTEVOKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX3N0YXR1cy5sZW5ndGhSZWFkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdGF0dXMubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdiA9IHRoaXMuX3JlYWRWYXJpbnQoKTtcclxuICAgICAgICBpZiAodiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMuX3N0YXR1cy5sZW5ndGggPSBOdW1iZXIodik7XHJcbiAgICAgICAgdGhpcy5fc3RhdHVzLmxlbmd0aFJlYWQgPSB2YWxpZGF0ZTtcclxuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdHVzLmxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICAvKiogUmVhZCBhbiBpbnQzMiAodmFyaW50IG9yIGZpeGVkMzIgZGVwZW5kaW5nIG9uIHdpcmUgdHlwZSkuICovXHJcbiAgICBwdWJsaWMgcmVhZEludDMyKCk6IG51bWJlciB8IG51bGwge1xyXG4gICAgICAgIGlmICh0aGlzLl9zdGF0dXMud2lyZVR5cGUgPT09IFdpcmVUeXBlLlZBUklOVCkge1xyXG4gICAgICAgICAgICBjb25zdCB2ID0gdGhpcy5fcmVhZFZhcmludCgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdiAhPT0gbnVsbCA/IE51bWJlcih2KSB8IDAgOiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5fcmVhZEZpeGVkMzJBc0ludCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKiBSZWFkIGFuIGludDY0IGFzIGEgbnVtYmVyICh2YXJpbnQgb3IgZml4ZWQ2NCkuICovXHJcbiAgICBwdWJsaWMgcmVhZEludDY0KCk6IG51bWJlciB8IG51bGwge1xyXG4gICAgICAgIGlmICh0aGlzLl9zdGF0dXMud2lyZVR5cGUgPT09IFdpcmVUeXBlLlZBUklOVCkge1xyXG4gICAgICAgICAgICBjb25zdCB2ID0gdGhpcy5fcmVhZFZhcmludCgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdiAhPT0gbnVsbCA/IE51bWJlcih2KSA6IG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLl9yZWFkRml4ZWQ2NEFzTnVtYmVyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIFJlYWQgYSBmbG9hdDMyIChmaXhlZDMyIHdpcmUgdHlwZSkuICovXHJcbiAgICBwdWJsaWMgcmVhZEZsb2F0KCk6IG51bWJlciB8IG51bGwge1xyXG4gICAgICAgIGlmICh0aGlzLl9pbnB1dC5yZWFkKF9zY3JhdGNoNCwgMCwgNCkgIT09IDQpIHJldHVybiBudWxsO1xyXG4gICAgICAgIHJldHVybiBfdmlldzQuZ2V0RmxvYXQzMigwLCB0cnVlKTsgLy8gbGl0dGxlLWVuZGlhblxyXG4gICAgfVxyXG5cclxuICAgIC8qKiBSZWFkIGEgZmxvYXQ2NCAoZml4ZWQ2NCB3aXJlIHR5cGUpLiAqL1xyXG4gICAgcHVibGljIHJlYWREb3VibGUoKTogbnVtYmVyIHwgbnVsbCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2lucHV0LnJlYWQoX3NjcmF0Y2g4LCAwLCA4KSAhPT0gOCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgcmV0dXJuIF92aWV3OC5nZXRGbG9hdDY0KDAsIHRydWUpOyAvLyBsaXR0bGUtZW5kaWFuXHJcbiAgICB9XHJcblxyXG4gICAgLyoqIFJlYWQgYSBib29sZWFuICh2YXJpbnQgd2lyZSB0eXBlKS4gKi9cclxuICAgIHB1YmxpYyByZWFkQm9vbCgpOiBib29sZWFuIHwgbnVsbCB7XHJcbiAgICAgICAgY29uc3QgdiA9IHRoaXMuX3JlYWRWYXJpbnQoKTtcclxuICAgICAgICBpZiAodiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgcmV0dXJuIHYgIT09IDA7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWFkIGEgbGVuZ3RoLWRlbGltaXRlZCBzdHJpbmcgd2l0aCBhIG1heCBzaXplIGJvdW5kLlxyXG4gICAgICogRXF1aXZhbGVudCB0byByZWFkVmFsdWVfcyhjaGFyKiwgaW50KSBpbiBDKysuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyByZWFkU3RyaW5nKG1heExlbmd0aDogbnVtYmVyID0gMjU2KTogc3RyaW5nIHwgbnVsbCB7XHJcbiAgICAgICAgY29uc3QgbGVuID0gdGhpcy5yZWFkTGVuZ3RoKCk7XHJcbiAgICAgICAgaWYgKGxlbiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZUxlbmd0aFJlYWQoKTtcclxuXHJcbiAgICAgICAgY29uc3QgcmVhZExlbiA9IE1hdGgubWluKGxlbiwgbWF4TGVuZ3RoKTtcclxuICAgICAgICBjb25zdCBidWYgPSBuZXcgVWludDhBcnJheShyZWFkTGVuKTtcclxuICAgICAgICBpZiAodGhpcy5faW5wdXQucmVhZChidWYsIDAsIHJlYWRMZW4pICE9PSByZWFkTGVuKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgLy8gU2tpcCBleGNlc3MgYnl0ZXMgaWYgc3RyaW5nIHdhcyB0cnVuY2F0ZWRcclxuICAgICAgICBpZiAocmVhZExlbiA8IGxlbikge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2lucHV0LnNlZWsobGVuIC0gcmVhZExlbiwgU2Vla09yaWdpbi5DVVJSRU5UKSkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKGJ1Zik7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWFkIGxlbmd0aC1kZWxpbWl0ZWQgcmF3IGJ5dGVzLlxyXG4gICAgICogQHBhcmFtIG1heFNpemUgIE1heGltdW0gYnl0ZXMgdG8gcmVhZCAoZXhjZXNzIGlzIHNraXBwZWQpLlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgcmVhZEJ5dGVzKG1heFNpemU/OiBudW1iZXIpOiBVaW50OEFycmF5IHwgbnVsbCB7XHJcbiAgICAgICAgY29uc3QgbGVuID0gdGhpcy5yZWFkTGVuZ3RoKCk7XHJcbiAgICAgICAgaWYgKGxlbiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZUxlbmd0aFJlYWQoKTtcclxuXHJcbiAgICAgICAgY29uc3QgcmVhZExlbiA9IG1heFNpemUgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKGxlbiwgbWF4U2l6ZSkgOiBsZW47XHJcbiAgICAgICAgY29uc3QgYnVmID0gbmV3IFVpbnQ4QXJyYXkocmVhZExlbik7XHJcbiAgICAgICAgaWYgKHRoaXMuX2lucHV0LnJlYWQoYnVmLCAwLCByZWFkTGVuKSAhPT0gcmVhZExlbikgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIGlmIChyZWFkTGVuIDwgbGVuKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5faW5wdXQuc2VlayhsZW4gLSByZWFkTGVuLCBTZWVrT3JpZ2luLkNVUlJFTlQpKSByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBidWY7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFBhY2tlZCByZXBlYXRlZCBmaWVsZHMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWFkIHBhY2tlZCB2YXJpbnQgaW50MzIgdmFsdWVzIGludG8gYSBwcmUtYWxsb2NhdGVkIGFycmF5LlxyXG4gICAgICogQHBhcmFtIHRhcmdldCAgVGFyZ2V0IGFycmF5LlxyXG4gICAgICogQHBhcmFtIG1heENvdW50ICBNYXhpbXVtIG51bWJlciBvZiBlbGVtZW50cyB0byByZWFkLlxyXG4gICAgICogQHJldHVybnMgVGhlIG51bWJlciBvZiBlbGVtZW50cyBhY3R1YWxseSByZWFkLCBvciBudWxsIG9uIGVycm9yLlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgcmVhZFBhY2tlZEludDMyKHRhcmdldDogSW50MzJBcnJheSwgbWF4Q291bnQ6IG51bWJlcik6IG51bWJlciB8IG51bGwge1xyXG4gICAgICAgIGlmICh0aGlzLl9zdGF0dXMud2lyZVR5cGUgIT09IFdpcmVUeXBlLkxFTikgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgY29uc3QgbGVuID0gdGhpcy5yZWFkTGVuZ3RoKCk7XHJcbiAgICAgICAgaWYgKGxlbiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgdGhpcy5faW52YWxpZGF0ZUxlbmd0aFJlYWQoKTtcclxuXHJcbiAgICAgICAgY29uc3QgZW5kID0gdGhpcy5wb3NpdGlvbiArIGxlbjtcclxuICAgICAgICBsZXQgaSA9IDA7XHJcbiAgICAgICAgd2hpbGUgKHRoaXMucG9zaXRpb24gPCBlbmQpIHtcclxuICAgICAgICAgICAgY29uc3QgdiA9IHRoaXMuX3JlYWRWYXJpbnQoKTtcclxuICAgICAgICAgICAgaWYgKHYgPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICBpZiAoaSA8IG1heENvdW50KSB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXRbaSsrXSA9IE51bWJlcih2KSB8IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWFkIHBhY2tlZCBmbG9hdDMyIHZhbHVlcyBpbnRvIGEgcHJlLWFsbG9jYXRlZCBhcnJheS5cclxuICAgICAqIEBwYXJhbSB0YXJnZXQgIFRhcmdldCBhcnJheS5cclxuICAgICAqIEBwYXJhbSBtYXhDb3VudCAgTWF4aW11bSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmVhZC5cclxuICAgICAqIEByZXR1cm5zIFRoZSBudW1iZXIgb2YgZWxlbWVudHMgYWN0dWFsbHkgcmVhZCwgb3IgbnVsbCBvbiBlcnJvci5cclxuICAgICAqL1xyXG4gICAgcHVibGljIHJlYWRQYWNrZWRGbG9hdDMyKHRhcmdldDogRmxvYXQzMkFycmF5LCBtYXhDb3VudDogbnVtYmVyKTogbnVtYmVyIHwgbnVsbCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3N0YXR1cy53aXJlVHlwZSAhPT0gV2lyZVR5cGUuTEVOKSByZXR1cm4gbnVsbDtcclxuICAgICAgICBjb25zdCBsZW4gPSB0aGlzLnJlYWRMZW5ndGgoKTtcclxuICAgICAgICBpZiAobGVuID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlTGVuZ3RoUmVhZCgpO1xyXG5cclxuICAgICAgICBjb25zdCBlbmQgPSB0aGlzLnBvc2l0aW9uICsgbGVuO1xyXG4gICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICB3aGlsZSAodGhpcy5wb3NpdGlvbiA8IGVuZCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5faW5wdXQucmVhZChfc2NyYXRjaDQsIDAsIDQpICE9PSA0KSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgaWYgKGkgPCBtYXhDb3VudCkge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0W2krK10gPSBfdmlldzQuZ2V0RmxvYXQzMigwLCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlYWQgcGFja2VkIGZsb2F0NjQgdmFsdWVzIGludG8gYSBwcmUtYWxsb2NhdGVkIGFycmF5LlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgcmVhZFBhY2tlZEZsb2F0NjQodGFyZ2V0OiBGbG9hdDY0QXJyYXksIG1heENvdW50OiBudW1iZXIpOiBudW1iZXIgfCBudWxsIHtcclxuICAgICAgICBpZiAodGhpcy5fc3RhdHVzLndpcmVUeXBlICE9PSBXaXJlVHlwZS5MRU4pIHJldHVybiBudWxsO1xyXG4gICAgICAgIGNvbnN0IGxlbiA9IHRoaXMucmVhZExlbmd0aCgpO1xyXG4gICAgICAgIGlmIChsZW4gPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVMZW5ndGhSZWFkKCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGVuZCA9IHRoaXMucG9zaXRpb24gKyBsZW47XHJcbiAgICAgICAgbGV0IGkgPSAwO1xyXG4gICAgICAgIHdoaWxlICh0aGlzLnBvc2l0aW9uIDwgZW5kKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9pbnB1dC5yZWFkKF9zY3JhdGNoOCwgMCwgOCkgIT09IDgpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICBpZiAoaSA8IG1heENvdW50KSB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXRbaSsrXSA9IF92aWV3OC5nZXRGbG9hdDY0KDAsIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBTdWItbWVzc2FnZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZSBhIHN1Yi1yZWFkZXIgc2NvcGVkIHRvIHRoZSBjdXJyZW50IGxlbmd0aC1kZWxpbWl0ZWQgZmllbGQuXHJcbiAgICAgKiBUaGUgc3ViLXJlYWRlcidzIHN0cmVhbSBpcyBib3VuZGVkIHRvIHRoZSBtZXNzYWdlIGJ5dGVzLlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgZ2V0U3ViTWVzc2FnZVJlYWRlcigpOiBQQlN1YlJlYWRlciB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IGxlbiA9IHRoaXMucmVhZExlbmd0aCgpO1xyXG4gICAgICAgIGlmIChsZW4gPT09IG51bGwpIHJldHVybiBudWxsO1xyXG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVMZW5ndGhSZWFkKCk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQQlN1YlJlYWRlcih0aGlzLCB0aGlzLl9zdGF0dXMuZGVwdGggKyAxLCB0aGlzLnBvc2l0aW9uLCBsZW4pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBTa2lwIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIC8qKiBTa2lwIHRoZSBjdXJyZW50IGZpZWxkIHZhbHVlLiAqL1xyXG4gICAgcHVibGljIHNraXAoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgc3dpdGNoICh0aGlzLl9zdGF0dXMud2lyZVR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBXaXJlVHlwZS5WQVJJTlQ6IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWFkVmFyaW50KCkgIT09IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBXaXJlVHlwZS5GSVhFRDMyOiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5faW5wdXQuc2Vlayg0LCBTZWVrT3JpZ2luLkNVUlJFTlQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgV2lyZVR5cGUuRklYRUQ2NDoge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lucHV0LnNlZWsoOCwgU2Vla09yaWdpbi5DVVJSRU5UKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlIFdpcmVUeXBlLkxFTjoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGVuID0gdGhpcy5yZWFkTGVuZ3RoKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAobGVuID09PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9pbnZhbGlkYXRlTGVuZ3RoUmVhZCgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lucHV0LnNlZWsobGVuLCBTZWVrT3JpZ2luLkNVUlJFTlQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBTYXZlIC8gcmVzdG9yZSAoc25hcHNob3Qgc3RhY2spIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIC8qKiBTYXZlIHRoZSBjdXJyZW50IHBhcnNlciBzdGF0ZS4gU3RyZWFtIG11c3Qgc3VwcG9ydCBzZWVraW5nLiAqL1xyXG4gICAgcHVibGljIHNhdmUoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2lucHV0LmNhblNlZWsoKSAmJiB0aGlzLl9hY3RpdmVTbmFwc2hvdCA8IE1BWF9SRUFERVJfU05BUFNIT1RfREVQVEggLSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2FjdGl2ZVNuYXBzaG90Kys7XHJcbiAgICAgICAgICAgIHRoaXMuX3NuYXBzaG90c1t0aGlzLl9hY3RpdmVTbmFwc2hvdF0gPSB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIHN0YXR1czogeyAuLi50aGlzLl9zdGF0dXMgfSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIFJlc3RvcmUgdGhlIGxhc3Qgc2F2ZWQgc3RhdGUuICovXHJcbiAgICBwdWJsaWMgcmVzdG9yZSgpOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5faW5wdXQuY2FuU2VlaygpICYmIHRoaXMuX2FjdGl2ZVNuYXBzaG90ID49IDApIHtcclxuICAgICAgICAgICAgY29uc3Qgc25hcCA9IHRoaXMuX3NuYXBzaG90c1t0aGlzLl9hY3RpdmVTbmFwc2hvdF07XHJcbiAgICAgICAgICAgIHRoaXMuX3N0YXR1cyA9IHsgLi4uc25hcC5zdGF0dXMgfTtcclxuICAgICAgICAgICAgdGhpcy5faW5wdXQuc2VlayhzbmFwLnBvc2l0aW9uLCBTZWVrT3JpZ2luLkJFR0lOKTtcclxuICAgICAgICAgICAgdGhpcy5fYWN0aXZlU25hcHNob3QtLTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIERpc2NhcmQgdGhlIGxhc3Qgc2F2ZSB3aXRob3V0IHJlc3RvcmluZy4gKi9cclxuICAgIHB1YmxpYyB1bnNhdmUoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZVNuYXBzaG90ID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5fYWN0aXZlU25hcHNob3QtLTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFByaXZhdGUgcHJpbWl0aXZlcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlYWQgYSB2YXJpbnQgKHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyKSBmcm9tIHRoZSBzdHJlYW0uXHJcbiAgICAgKiBSZXR1cm5zIG51bGwgb24gRU9GLiBVc2VzIE51bWJlciAoc2FmZSB1cCB0byAyXjUzKS5cclxuICAgICAqL1xyXG4gICAgcHJvdGVjdGVkIF9yZWFkVmFyaW50KCk6IG51bWJlciB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IGJ5dGUwID0gdGhpcy5faW5wdXQucmVhZEJ5dGUoKTtcclxuICAgICAgICBpZiAoYnl0ZTAgPT09IExCX0VPRikgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIC8vIEZhc3QgcGF0aDogc2luZ2xlIGJ5dGUgKG1vc3QgY29tbW9uIGZvciBmaWVsZCB0YWdzIGFuZCBzbWFsbCB2YWx1ZXMpXHJcbiAgICAgICAgaWYgKChieXRlMCAmIDB4ODApID09PSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBieXRlMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIE11bHRpLWJ5dGUgdmFyaW50XHJcbiAgICAgICAgbGV0IGxvID0gYnl0ZTAgJiAweDdmO1xyXG4gICAgICAgIGxldCBzaGlmdCA9IDc7XHJcbiAgICAgICAgbGV0IGJ5dGU6IG51bWJlcjtcclxuICAgICAgICBsZXQgYnl0ZUNvdW50ID0gMTtcclxuICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgIGJ5dGUgPSB0aGlzLl9pbnB1dC5yZWFkQnl0ZSgpO1xyXG4gICAgICAgICAgICBpZiAoYnl0ZSA9PT0gTEJfRU9GKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgYnl0ZUNvdW50Kys7XHJcbiAgICAgICAgICAgIGlmIChzaGlmdCA8IDMyKSB7XHJcbiAgICAgICAgICAgICAgICBsbyB8PSAoYnl0ZSAmIDB4N2YpIDw8IHNoaWZ0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNoaWZ0ICs9IDc7XHJcbiAgICAgICAgfSB3aGlsZSAoYnl0ZSAmIDB4ODApO1xyXG5cclxuICAgICAgICAvLyBGb3IgbmVnYXRpdmUgaW50NjQsIHByb3RvYnVmIHVzZXMgMTAtYnl0ZSB2YXJpbnRzIHdpdGggaGlnaCBiaXRzIHNldC5cclxuICAgICAgICAvLyBEZXRlY3QgdGhpcyBhbmQgcmV0dXJuIGFzIHNpZ25lZCAzMi1iaXQgKHN1ZmZpY2llbnQgZm9yIE9OTlggYXR0cmlidXRlIHZhbHVlcykuXHJcbiAgICAgICAgaWYgKGJ5dGVDb3VudCA+PSAxMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbG8gfCAwOyAvLyBpbnRlcnByZXQgYXMgc2lnbmVkIDMyLWJpdFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGxvID4+PiAwOyAvLyBmb3JjZSB1bnNpZ25lZCAzMi1iaXQgZm9yIHBvc2l0aXZlIHZhbHVlc1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBfcmVhZEZpeGVkMzJBc0ludCgpOiBudW1iZXIgfCBudWxsIHtcclxuICAgICAgICBpZiAodGhpcy5faW5wdXQucmVhZChfc2NyYXRjaDQsIDAsIDQpICE9PSA0KSByZXR1cm4gbnVsbDtcclxuICAgICAgICByZXR1cm4gX3ZpZXc0LmdldEludDMyKDAsIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBfcmVhZEZpeGVkNjRBc051bWJlcigpOiBudW1iZXIgfCBudWxsIHtcclxuICAgICAgICBpZiAodGhpcy5faW5wdXQucmVhZChfc2NyYXRjaDgsIDAsIDgpICE9PSA4KSByZXR1cm4gbnVsbDtcclxuICAgICAgICAvLyBSZWFkIGFzIHR3byAzMi1iaXQgdmFsdWVzIHRvIGF2b2lkIEJpZ0ludCBkZXBlbmRlbmN5XHJcbiAgICAgICAgY29uc3QgbG8gPSBfdmlldzguZ2V0VWludDMyKDAsIHRydWUpO1xyXG4gICAgICAgIGNvbnN0IGhpID0gX3ZpZXc4LmdldFVpbnQzMig0LCB0cnVlKTtcclxuICAgICAgICByZXR1cm4gaGkgKiAweDEwMDAwMDAwMCArIGxvO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBfaW52YWxpZGF0ZUxlbmd0aFJlYWQoKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5fc3RhdHVzLmxlbmd0aFJlYWQgPSBmYWxzZTtcclxuICAgIH1cclxufVxyXG5cclxuLy8g4pSA4pSA4pSAIFBCU3ViUmVhZGVyIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuLyoqXHJcbiAqIEEgUEJSZWFkZXIgc2NvcGVkIHRvIGEgc3ViLW1lc3NhZ2UgdmlhIGEgU3RyZWFtVmlldy5cclxuICpcclxuICogRXF1aXZhbGVudCB0byBCbHVlU3RlZWxMYWR5QnVnOjpQQlN1YlJlYWRlci5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBQQlN1YlJlYWRlciBleHRlbmRzIFBCUmVhZGVyIHtcclxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihwYXJlbnQ6IFBCUmVhZGVyLCBkZXB0aDogbnVtYmVyLCBmcm9tOiBudW1iZXIsIGxlbmd0aDogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIobmV3IFN0cmVhbVZpZXcocGFyZW50LmlucHV0LCBmcm9tLCBsZW5ndGgpKTtcclxuICAgICAgICB0aGlzLl9zdGF0dXMuZGVwdGggPSBkZXB0aDtcclxuICAgIH1cclxufVxyXG4iLCIvLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIFByb3RvYnVmIHN0cmVhbSBhYnN0cmFjdGlvblxuLy9cbi8vIFBvcnRlZCBmcm9tIEN5YW5NeWNlbGl1bS9CbHVlU3RlZWxMYWR5QnVnIEMrKyBpbXBsZW1lbnRhdGlvbi5cbi8vIFByb3ZpZGVzIElJbnB1dFN0cmVhbSwgTWVtb3J5U3RyZWFtIGFuZCBTdHJlYW1WaWV3IGZvciBiaW5hcnkgcGFyc2luZy5cbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG5leHBvcnQgY29uc3QgTEJfRU9GID0gLTE7XG5cbmV4cG9ydCBlbnVtIFNlZWtPcmlnaW4ge1xuICAgIEJFR0lOID0gMCxcbiAgICBDVVJSRU5UID0gMSxcbiAgICBFTkQgPSAyLFxufVxuXG4vKipcbiAqIEFic3RyYWN0IGlucHV0IHN0cmVhbSBpbnRlcmZhY2UgZm9yIHNlcXVlbnRpYWwgYmluYXJ5IHJlYWRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIElJbnB1dFN0cmVhbSB7XG4gICAgLyoqIFJlYWQgYGNvdW50YCBieXRlcyBpbnRvIHRhcmdldC4gUmV0dXJucyBieXRlcyByZWFkLCBvciBMQl9FT0YuICovXG4gICAgcmVhZCh0YXJnZXQ6IFVpbnQ4QXJyYXksIG9mZnNldDogbnVtYmVyLCBjb3VudDogbnVtYmVyKTogbnVtYmVyO1xuXG4gICAgLyoqIFJlYWQgYSBzaW5nbGUgYnl0ZS4gUmV0dXJucyB0aGUgYnl0ZSB2YWx1ZSwgb3IgTEJfRU9GLiAqL1xuICAgIHJlYWRCeXRlKCk6IG51bWJlcjtcblxuICAgIGNhblNlZWsoKTogYm9vbGVhbjtcbiAgICBzZWVrKHZhbHVlOiBudW1iZXIsIG9yaWdpbj86IFNlZWtPcmlnaW4pOiBib29sZWFuO1xuICAgIGdldFNpemUoKTogbnVtYmVyO1xuICAgIGdldFBvc2l0aW9uKCk6IG51bWJlcjtcbiAgICBnZXRSZW1haW5pbmdCeXRlcygpOiBudW1iZXI7XG59XG5cbi8vIOKUgOKUgOKUgCBNZW1vcnlTdHJlYW0g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbi8qKlxuICogUmVhZHMgZnJvbSBhbiBpbi1tZW1vcnkgYnl0ZSBidWZmZXIuXG4gKlxuICogRXF1aXZhbGVudCB0byBCbHVlU3RlZWxMYWR5QnVnOjpNZW1vcnlTdHJlYW0uXG4gKi9cbmV4cG9ydCBjbGFzcyBNZW1vcnlTdHJlYW0gaW1wbGVtZW50cyBJSW5wdXRTdHJlYW0ge1xuICAgIHByaXZhdGUgX2J1ZmZlcjogVWludDhBcnJheTtcbiAgICBwcml2YXRlIF9zaXplOiBudW1iZXI7XG4gICAgcHJpdmF0ZSBfcG9zOiBudW1iZXI7XG5cbiAgICBwdWJsaWMgY29uc3RydWN0b3IoYnVmZmVyOiBVaW50OEFycmF5KSB7XG4gICAgICAgIHRoaXMuX2J1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgdGhpcy5fc2l6ZSA9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICB0aGlzLl9wb3MgPSAwO1xuICAgIH1cblxuICAgIHB1YmxpYyByZWFkQnl0ZSgpOiBudW1iZXIge1xuICAgICAgICBpZiAodGhpcy5fcG9zIDwgdGhpcy5fc2l6ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2J1ZmZlclt0aGlzLl9wb3MrK107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIExCX0VPRjtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVhZCh0YXJnZXQ6IFVpbnQ4QXJyYXksIG9mZnNldDogbnVtYmVyLCBjb3VudDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgaWYgKHRoaXMuX3BvcyA+PSB0aGlzLl9zaXplKSB7XG4gICAgICAgICAgICByZXR1cm4gTEJfRU9GO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb3VudCA9PT0gMSkge1xuICAgICAgICAgICAgdGFyZ2V0W29mZnNldF0gPSB0aGlzLl9idWZmZXJbdGhpcy5fcG9zKytdO1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbGVuID0gTWF0aC5taW4oY291bnQsIHRoaXMuX3NpemUgLSB0aGlzLl9wb3MpO1xuICAgICAgICB0YXJnZXQuc2V0KHRoaXMuX2J1ZmZlci5zdWJhcnJheSh0aGlzLl9wb3MsIHRoaXMuX3BvcyArIGxlbiksIG9mZnNldCk7XG4gICAgICAgIHRoaXMuX3BvcyArPSBsZW47XG4gICAgICAgIHJldHVybiBsZW47XG4gICAgfVxuXG4gICAgcHVibGljIGNhblNlZWsoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHB1YmxpYyBzZWVrKHZhbHVlOiBudW1iZXIsIG9yaWdpbjogU2Vla09yaWdpbiA9IFNlZWtPcmlnaW4uQkVHSU4pOiBib29sZWFuIHtcbiAgICAgICAgbGV0IHRtcDogbnVtYmVyO1xuICAgICAgICBpZiAob3JpZ2luID09PSBTZWVrT3JpZ2luLkJFR0lOKSB7XG4gICAgICAgICAgICB0bXAgPSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChvcmlnaW4gPT09IFNlZWtPcmlnaW4uRU5EKSB7XG4gICAgICAgICAgICB0bXAgPSB0aGlzLl9zaXplIC0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0bXAgPSB0aGlzLl9wb3MgKyB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9wb3MgPSBNYXRoLm1pbihNYXRoLm1heCh0bXAsIDApLCB0aGlzLl9zaXplKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFNpemUoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NpemU7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFBvc2l0aW9uKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wb3M7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFJlbWFpbmluZ0J5dGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zaXplIC0gdGhpcy5fcG9zO1xuICAgIH1cbn1cblxuLy8g4pSA4pSA4pSAIFN0cmVhbVZpZXcg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbi8qKlxuICogQSBib3VuZGVkIHZpZXcgb3ZlciBhbiB1bmRlcmx5aW5nIHN0cmVhbSwgdXNlZCBmb3IgcmVhZGluZyBzdWItbWVzc2FnZXMuXG4gKlxuICogRXF1aXZhbGVudCB0byBCbHVlU3RlZWxMYWR5QnVnOjpTdHJlYW1WaWV3LlxuICovXG5leHBvcnQgY2xhc3MgU3RyZWFtVmlldyBpbXBsZW1lbnRzIElJbnB1dFN0cmVhbSB7XG4gICAgcHJpdmF0ZSBfZGVsZWdhdGU6IElJbnB1dFN0cmVhbTtcbiAgICBwcml2YXRlIF9vZmZzZXQ6IG51bWJlcjtcbiAgICBwcml2YXRlIF9zaXplOiBudW1iZXI7XG4gICAgcHJpdmF0ZSBfcG9zOiBudW1iZXI7XG5cbiAgICBwdWJsaWMgY29uc3RydWN0b3IoZGVsZWdhdGU6IElJbnB1dFN0cmVhbSwgb2Zmc2V0OiBudW1iZXIsIHNpemU6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9kZWxlZ2F0ZSA9IGRlbGVnYXRlO1xuICAgICAgICB0aGlzLl9vZmZzZXQgPSBvZmZzZXQ7XG4gICAgICAgIHRoaXMuX3NpemUgPSBzaXplO1xuICAgICAgICB0aGlzLl9wb3MgPSAwO1xuICAgIH1cblxuICAgIHB1YmxpYyByZWFkQnl0ZSgpOiBudW1iZXIge1xuICAgICAgICBpZiAodGhpcy5fcG9zID49IHRoaXMuX3NpemUpIHtcbiAgICAgICAgICAgIHJldHVybiBMQl9FT0Y7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYiA9IHRoaXMuX2RlbGVnYXRlLnJlYWRCeXRlKCk7XG4gICAgICAgIGlmIChiID09PSBMQl9FT0YpIHJldHVybiBMQl9FT0Y7XG4gICAgICAgIHRoaXMuX3BvcysrO1xuICAgICAgICByZXR1cm4gYjtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVhZCh0YXJnZXQ6IFVpbnQ4QXJyYXksIG9mZnNldDogbnVtYmVyLCBjb3VudDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgaWYgKHRoaXMuX3BvcyA+PSB0aGlzLl9zaXplKSB7XG4gICAgICAgICAgICByZXR1cm4gTEJfRU9GO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxlbiA9IE1hdGgubWluKGNvdW50LCB0aGlzLl9zaXplIC0gdGhpcy5fcG9zKTtcbiAgICAgICAgY29uc3QgciA9IHRoaXMuX2RlbGVnYXRlLnJlYWQodGFyZ2V0LCBvZmZzZXQsIGxlbik7XG4gICAgICAgIGlmIChyID4gMCkge1xuICAgICAgICAgICAgdGhpcy5fcG9zICs9IHI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHI7XG4gICAgfVxuXG4gICAgcHVibGljIGNhblNlZWsoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWxlZ2F0ZS5jYW5TZWVrKCk7XG4gICAgfVxuXG4gICAgcHVibGljIHNlZWsodmFsdWU6IG51bWJlciwgb3JpZ2luOiBTZWVrT3JpZ2luID0gU2Vla09yaWdpbi5CRUdJTik6IGJvb2xlYW4ge1xuICAgICAgICBsZXQgdG1wOiBudW1iZXI7XG4gICAgICAgIGlmIChvcmlnaW4gPT09IFNlZWtPcmlnaW4uQkVHSU4pIHtcbiAgICAgICAgICAgIHRtcCA9IHZhbHVlO1xuICAgICAgICB9IGVsc2UgaWYgKG9yaWdpbiA9PT0gU2Vla09yaWdpbi5FTkQpIHtcbiAgICAgICAgICAgIHRtcCA9IHRoaXMuX3NpemUgLSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRtcCA9IHRoaXMuX3BvcyArIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHRtcCA9IE1hdGgubWluKE1hdGgubWF4KHRtcCwgMCksIHRoaXMuX3NpemUpO1xuICAgICAgICBpZiAoIXRoaXMuX2RlbGVnYXRlLnNlZWsodG1wICsgdGhpcy5fb2Zmc2V0LCBTZWVrT3JpZ2luLkJFR0lOKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3BvcyA9IHRtcDtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFNpemUoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NpemU7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFBvc2l0aW9uKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wb3M7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFJlbWFpbmluZ0J5dGVzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zaXplIC0gdGhpcy5fcG9zO1xuICAgIH1cbn1cbiIsIi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gUHJvdG9idWYgd2lyZSBmb3JtYXQgd3JpdGVyXG4vL1xuLy8gU3ltbWV0cmljIGNvdW50ZXJwYXJ0IHRvIHJlYWRlci50cy5cbi8vIFdyaXRlcyBwcm90b2J1Zi1lbmNvZGVkIGJpbmFyeSBkYXRhIHdpdGhvdXQgcmVxdWlyaW5nIGdlbmVyYXRlZCBjb2RlIG9yXG4vLyBleHRlcm5hbCBkZXBlbmRlbmNpZXMuXG4vL1xuLy8gU3VwcG9ydHM6XG4vLyAgIC0gVmFyaW50LCBmaXhlZDMyLCBmaXhlZDY0IHdpcmUgdHlwZXNcbi8vICAgLSBMZW5ndGgtZGVsaW1pdGVkIGZpZWxkcyAoc3RyaW5ncywgYnl0ZXMsIHN1Yi1tZXNzYWdlcylcbi8vICAgLSBQYWNrZWQgcmVwZWF0ZWQgZmllbGRzXG4vLyAgIC0gU3ViLW1lc3NhZ2Ugd3JpdGVycyB3aXRoIGF1dG9tYXRpYyBsZW5ndGggcHJlZml4aW5nXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuaW1wb3J0IHsgV2lyZVR5cGUgfSBmcm9tIFwiLi9yZWFkZXJcIjtcblxuLy8g4pSA4pSA4pSAIERlZmF1bHQgYnVmZmVyIHNpemUg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbmNvbnN0IERFRkFVTFRfQ0FQQUNJVFkgPSAyNTY7XG5jb25zdCBHUk9XVEhfRkFDVE9SID0gMjtcblxuLy8g4pSA4pSA4pSAIFNjcmF0Y2ggYnVmZmVycyAocmV1c2VkIGFjcm9zcyB3cml0ZXMgdG8gYXZvaWQgYWxsb2NhdGlvbnMpIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG5jb25zdCBfc2NyYXRjaDQgPSBuZXcgVWludDhBcnJheSg0KTtcbmNvbnN0IF9zY3JhdGNoOCA9IG5ldyBVaW50OEFycmF5KDgpO1xuY29uc3QgX3ZpZXc0ID0gbmV3IERhdGFWaWV3KF9zY3JhdGNoNC5idWZmZXIpO1xuY29uc3QgX3ZpZXc4ID0gbmV3IERhdGFWaWV3KF9zY3JhdGNoOC5idWZmZXIpO1xuXG4vLyDilIDilIDilIAgUEJXcml0ZXIg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbi8qKlxuICogUHVzaC1zdHlsZSBwcm90b2J1ZiB3cml0ZXIuIFdyaXRlcyB0YWdzLCB0aGVuIHZhbHVlcyBzZXF1ZW50aWFsbHkuXG4gKlxuICogVXNhZ2U6XG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB3cml0ZXIgPSBuZXcgUEJXcml0ZXIoKTtcbiAqIHdyaXRlci53cml0ZVRhZygxLCBXaXJlVHlwZS5WQVJJTlQpO1xuICogd3JpdGVyLndyaXRlSW50MzIoNDIpO1xuICogd3JpdGVyLndyaXRlVGFnKDIsIFdpcmVUeXBlLkxFTik7XG4gKiB3cml0ZXIud3JpdGVTdHJpbmcoXCJoZWxsb1wiKTtcbiAqIGNvbnN0IGJ5dGVzID0gd3JpdGVyLmZpbmlzaCgpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBQQldyaXRlciB7XG4gICAgcHJvdGVjdGVkIF9idWZmZXI6IFVpbnQ4QXJyYXk7XG4gICAgcHJvdGVjdGVkIF9wb3M6IG51bWJlcjtcblxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihjYXBhY2l0eTogbnVtYmVyID0gREVGQVVMVF9DQVBBQ0lUWSkge1xuICAgICAgICB0aGlzLl9idWZmZXIgPSBuZXcgVWludDhBcnJheShjYXBhY2l0eSk7XG4gICAgICAgIHRoaXMuX3BvcyA9IDA7XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIFRhZyB3cml0aW5nIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gICAgLyoqXG4gICAgICogV3JpdGUgYSBwcm90b2J1ZiB0YWcgKGZpZWxkIG51bWJlciArIHdpcmUgdHlwZSkuXG4gICAgICovXG4gICAgcHVibGljIHdyaXRlVGFnKGZpZWxkTnVtYmVyOiBudW1iZXIsIHdpcmVUeXBlOiBXaXJlVHlwZSk6IHZvaWQge1xuICAgICAgICB0aGlzLl93cml0ZVZhcmludCgoKGZpZWxkTnVtYmVyIDw8IDMpIHwgd2lyZVR5cGUpID4+PiAwKTtcbiAgICB9XG5cbiAgICAvLyDilIDilIAgQWNjZXNzb3JzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG4gICAgLyoqIEN1cnJlbnQgbnVtYmVyIG9mIGJ5dGVzIHdyaXR0ZW4uICovXG4gICAgcHVibGljIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BvcztcbiAgICB9XG5cbiAgICAvLyDilIDilIAgVmFsdWUgd3JpdGVycyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIC8qKiBXcml0ZSBhIHZhcmludC1lbmNvZGVkIGludDMyLiAqL1xuICAgIHB1YmxpYyB3cml0ZUludDMyKHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd3JpdGVWYXJpbnQodmFsdWUgfCAwKTtcbiAgICB9XG5cbiAgICAvKiogV3JpdGUgYSB2YXJpbnQtZW5jb2RlZCB1aW50MzIuICovXG4gICAgcHVibGljIHdyaXRlVWludDMyKHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd3JpdGVWYXJpbnQodmFsdWUgPj4+IDApO1xuICAgIH1cblxuICAgIC8qKiBXcml0ZSBhIHZhcmludC1lbmNvZGVkIGludDY0IChmcm9tIGEgSlMgbnVtYmVyLCBzYWZlIHVwIHRvIDJeNTMpLiAqL1xuICAgIHB1YmxpYyB3cml0ZUludDY0KHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd3JpdGVWYXJpbnQ2NCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqIFdyaXRlIGEgZml4ZWQzMiAobGl0dGxlLWVuZGlhbiA0IGJ5dGVzKS4gKi9cbiAgICBwdWJsaWMgd3JpdGVGaXhlZDMyKHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlQ2FwYWNpdHkoNCk7XG4gICAgICAgIF92aWV3NC5zZXRJbnQzMigwLCB2YWx1ZSwgdHJ1ZSk7XG4gICAgICAgIHRoaXMuX2J1ZmZlci5zZXQoX3NjcmF0Y2g0LCB0aGlzLl9wb3MpO1xuICAgICAgICB0aGlzLl9wb3MgKz0gNDtcbiAgICB9XG5cbiAgICAvKiogV3JpdGUgYSBmaXhlZDY0IChsaXR0bGUtZW5kaWFuIDggYnl0ZXMsIGZyb20gYSBKUyBudW1iZXIpLiAqL1xuICAgIHB1YmxpYyB3cml0ZUZpeGVkNjQodmFsdWU6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9lbnN1cmVDYXBhY2l0eSg4KTtcbiAgICAgICAgY29uc3QgbG8gPSB2YWx1ZSA+Pj4gMDtcbiAgICAgICAgY29uc3QgaGkgPSAodmFsdWUgLyAweDEwMDAwMDAwMCkgPj4+IDA7XG4gICAgICAgIF92aWV3OC5zZXRVaW50MzIoMCwgbG8sIHRydWUpO1xuICAgICAgICBfdmlldzguc2V0VWludDMyKDQsIGhpLCB0cnVlKTtcbiAgICAgICAgdGhpcy5fYnVmZmVyLnNldChfc2NyYXRjaDgsIHRoaXMuX3Bvcyk7XG4gICAgICAgIHRoaXMuX3BvcyArPSA4O1xuICAgIH1cblxuICAgIC8qKiBXcml0ZSBhIGZsb2F0MzIgKGZpeGVkMzIgd2lyZSB0eXBlKS4gKi9cbiAgICBwdWJsaWMgd3JpdGVGbG9hdCh2YWx1ZTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2Vuc3VyZUNhcGFjaXR5KDQpO1xuICAgICAgICBfdmlldzQuc2V0RmxvYXQzMigwLCB2YWx1ZSwgdHJ1ZSk7XG4gICAgICAgIHRoaXMuX2J1ZmZlci5zZXQoX3NjcmF0Y2g0LCB0aGlzLl9wb3MpO1xuICAgICAgICB0aGlzLl9wb3MgKz0gNDtcbiAgICB9XG5cbiAgICAvKiogV3JpdGUgYSBmbG9hdDY0IChmaXhlZDY0IHdpcmUgdHlwZSkuICovXG4gICAgcHVibGljIHdyaXRlRG91YmxlKHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlQ2FwYWNpdHkoOCk7XG4gICAgICAgIF92aWV3OC5zZXRGbG9hdDY0KDAsIHZhbHVlLCB0cnVlKTtcbiAgICAgICAgdGhpcy5fYnVmZmVyLnNldChfc2NyYXRjaDgsIHRoaXMuX3Bvcyk7XG4gICAgICAgIHRoaXMuX3BvcyArPSA4O1xuICAgIH1cblxuICAgIC8qKiBXcml0ZSBhIGJvb2xlYW4gKHZhcmludCB3aXJlIHR5cGUpLiAqL1xuICAgIHB1YmxpYyB3cml0ZUJvb2wodmFsdWU6IGJvb2xlYW4pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd3JpdGVWYXJpbnQodmFsdWUgPyAxIDogMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogV3JpdGUgYSBsZW5ndGgtZGVsaW1pdGVkIHN0cmluZy5cbiAgICAgKiBXcml0ZXMgdGhlIGxlbmd0aCBwcmVmaXggZm9sbG93ZWQgYnkgVVRGLTggZW5jb2RlZCBieXRlcy5cbiAgICAgKi9cbiAgICBwdWJsaWMgd3JpdGVTdHJpbmcodmFsdWU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBlbmNvZGVkID0gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKHZhbHVlKTtcbiAgICAgICAgdGhpcy5fd3JpdGVWYXJpbnQoZW5jb2RlZC5ieXRlTGVuZ3RoKTtcbiAgICAgICAgdGhpcy5fd3JpdGVSYXdCeXRlcyhlbmNvZGVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBsZW5ndGgtZGVsaW1pdGVkIHJhdyBieXRlcy5cbiAgICAgKiBXcml0ZXMgdGhlIGxlbmd0aCBwcmVmaXggZm9sbG93ZWQgYnkgdGhlIGJ5dGUgY29udGVudC5cbiAgICAgKi9cbiAgICBwdWJsaWMgd3JpdGVCeXRlcyh2YWx1ZTogVWludDhBcnJheSk6IHZvaWQge1xuICAgICAgICB0aGlzLl93cml0ZVZhcmludCh2YWx1ZS5ieXRlTGVuZ3RoKTtcbiAgICAgICAgdGhpcy5fd3JpdGVSYXdCeXRlcyh2YWx1ZSk7XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIFBhY2tlZCByZXBlYXRlZCBmaWVsZHMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBwYWNrZWQgdmFyaW50IGludDMyIHZhbHVlcy5cbiAgICAgKiBXcml0ZXMgYSBsZW5ndGggcHJlZml4IGZvbGxvd2VkIGJ5IHZhcmludC1lbmNvZGVkIHZhbHVlcy5cbiAgICAgKiBAcGFyYW0gdmFsdWVzICBTb3VyY2UgYXJyYXkuXG4gICAgICogQHBhcmFtIGNvdW50ICAgTnVtYmVyIG9mIGVsZW1lbnRzIHRvIHdyaXRlIGZyb20gdGhlIGFycmF5LlxuICAgICAqL1xuICAgIHB1YmxpYyB3cml0ZVBhY2tlZEludDMyKHZhbHVlczogSW50MzJBcnJheSwgY291bnQ6IG51bWJlcik6IHZvaWQge1xuICAgICAgICAvLyBNZWFzdXJlIGZpcnN0IHRvIGNvbXB1dGUgbGVuZ3RoIHByZWZpeFxuICAgICAgICBjb25zdCB0bXAgPSBuZXcgUEJXcml0ZXIoKTtcbiAgICAgICAgY29uc3QgbiA9IE1hdGgubWluKGNvdW50LCB2YWx1ZXMubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIHRtcC5fd3JpdGVWYXJpbnQodmFsdWVzW2ldIHwgMCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGFja2VkID0gdG1wLmZpbmlzaCgpO1xuICAgICAgICB0aGlzLl93cml0ZVZhcmludChwYWNrZWQuYnl0ZUxlbmd0aCk7XG4gICAgICAgIHRoaXMuX3dyaXRlUmF3Qnl0ZXMocGFja2VkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBwYWNrZWQgZmxvYXQzMiB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHZhbHVlcyAgU291cmNlIGFycmF5LlxuICAgICAqIEBwYXJhbSBjb3VudCAgIE51bWJlciBvZiBlbGVtZW50cyB0byB3cml0ZSBmcm9tIHRoZSBhcnJheS5cbiAgICAgKi9cbiAgICBwdWJsaWMgd3JpdGVQYWNrZWRGbG9hdDMyKHZhbHVlczogRmxvYXQzMkFycmF5LCBjb3VudDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IG4gPSBNYXRoLm1pbihjb3VudCwgdmFsdWVzLmxlbmd0aCk7XG4gICAgICAgIHRoaXMuX3dyaXRlVmFyaW50KG4gKiA0KTtcbiAgICAgICAgdGhpcy5fZW5zdXJlQ2FwYWNpdHkobiAqIDQpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgX3ZpZXc0LnNldEZsb2F0MzIoMCwgdmFsdWVzW2ldLCB0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuX2J1ZmZlci5zZXQoX3NjcmF0Y2g0LCB0aGlzLl9wb3MpO1xuICAgICAgICAgICAgdGhpcy5fcG9zICs9IDQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBwYWNrZWQgZmxvYXQ2NCB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHZhbHVlcyAgU291cmNlIGFycmF5LlxuICAgICAqIEBwYXJhbSBjb3VudCAgIE51bWJlciBvZiBlbGVtZW50cyB0byB3cml0ZSBmcm9tIHRoZSBhcnJheS5cbiAgICAgKi9cbiAgICBwdWJsaWMgd3JpdGVQYWNrZWRGbG9hdDY0KHZhbHVlczogRmxvYXQ2NEFycmF5LCBjb3VudDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IG4gPSBNYXRoLm1pbihjb3VudCwgdmFsdWVzLmxlbmd0aCk7XG4gICAgICAgIHRoaXMuX3dyaXRlVmFyaW50KG4gKiA4KTtcbiAgICAgICAgdGhpcy5fZW5zdXJlQ2FwYWNpdHkobiAqIDgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgX3ZpZXc4LnNldEZsb2F0NjQoMCwgdmFsdWVzW2ldLCB0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuX2J1ZmZlci5zZXQoX3NjcmF0Y2g4LCB0aGlzLl9wb3MpO1xuICAgICAgICAgICAgdGhpcy5fcG9zICs9IDg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDilIDilIAgU3ViLW1lc3NhZ2Ug4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBhIHN1Yi1tZXNzYWdlIHVzaW5nIGEgY2FsbGJhY2suXG4gICAgICogVGhlIGNhbGxiYWNrIHJlY2VpdmVzIGEgZnJlc2ggd3JpdGVyOyBpdHMgb3V0cHV0IGlzIGF1dG9tYXRpY2FsbHlcbiAgICAgKiBsZW5ndGgtcHJlZml4ZWQgYW5kIGFwcGVuZGVkIHRvIHRoaXMgd3JpdGVyLlxuICAgICAqXG4gICAgICogVXNhZ2U6XG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHdyaXRlci53cml0ZVRhZygzLCBXaXJlVHlwZS5MRU4pO1xuICAgICAqIHdyaXRlci53cml0ZVN1Yk1lc3NhZ2UoKHN1YikgPT4ge1xuICAgICAqICAgICBzdWIud3JpdGVUYWcoMSwgV2lyZVR5cGUuVkFSSU5UKTtcbiAgICAgKiAgICAgc3ViLndyaXRlSW50MzIoNDIpO1xuICAgICAqIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIHB1YmxpYyB3cml0ZVN1Yk1lc3NhZ2UoZm46IChzdWI6IFBCV3JpdGVyKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHN1YiA9IG5ldyBQQldyaXRlcigpO1xuICAgICAgICBmbihzdWIpO1xuICAgICAgICBjb25zdCBkYXRhID0gc3ViLmZpbmlzaCgpO1xuICAgICAgICB0aGlzLl93cml0ZVZhcmludChkYXRhLmJ5dGVMZW5ndGgpO1xuICAgICAgICB0aGlzLl93cml0ZVJhd0J5dGVzKGRhdGEpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFdyaXRlIHByZS1zZXJpYWxpemVkIHN1Yi1tZXNzYWdlIGJ5dGVzIHdpdGggYSBsZW5ndGggcHJlZml4LlxuICAgICAqL1xuICAgIHB1YmxpYyB3cml0ZVJhd1N1Yk1lc3NhZ2UoZGF0YTogVWludDhBcnJheSk6IHZvaWQge1xuICAgICAgICB0aGlzLl93cml0ZVZhcmludChkYXRhLmJ5dGVMZW5ndGgpO1xuICAgICAgICB0aGlzLl93cml0ZVJhd0J5dGVzKGRhdGEpO1xuICAgIH1cblxuICAgIC8vIOKUgOKUgCBGaW5hbGl6ZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgd3JpdHRlbiBieXRlcyBhcyBhIGNvbXBhY3QgVWludDhBcnJheS5cbiAgICAgKiBBZnRlciBjYWxsaW5nIGZpbmlzaCgpLCB0aGUgd3JpdGVyIHNob3VsZCBub3QgYmUgcmV1c2VkLlxuICAgICAqL1xuICAgIHB1YmxpYyBmaW5pc2goKTogVWludDhBcnJheSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9idWZmZXIuc3ViYXJyYXkoMCwgdGhpcy5fcG9zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNldCB0aGUgd3JpdGVyIHRvIHJldXNlIGl0cyBidWZmZXIuXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0KCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9wb3MgPSAwO1xuICAgIH1cblxuICAgIC8vIOKUgOKUgCBQcml2YXRlIHByaW1pdGl2ZXMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICAvKipcbiAgICAgKiBXcml0ZSBhIHZhcmludCAodW5zaWduZWQgMzItYml0KS5cbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgX3dyaXRlVmFyaW50KHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZSA+Pj4gMDsgLy8gZm9yY2UgdW5zaWduZWQgMzItYml0XG4gICAgICAgIHdoaWxlICh2YWx1ZSA+IDB4N2YpIHtcbiAgICAgICAgICAgIHRoaXMuX3dyaXRlQnl0ZSgodmFsdWUgJiAweDdmKSB8IDB4ODApO1xuICAgICAgICAgICAgdmFsdWUgPj4+PSA3O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3dyaXRlQnl0ZSh2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogV3JpdGUgYSA2NC1iaXQgdmFyaW50IGZyb20gYSBKUyBudW1iZXIgKHNhZmUgdXAgdG8gMl41MykuXG4gICAgICovXG4gICAgcHJvdGVjdGVkIF93cml0ZVZhcmludDY0KHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgLy8gSGFuZGxlIG5lZ2F0aXZlIG9yIHZhbHVlcyA+IDJeMzIgYnkgc3BsaXR0aW5nIGludG8gbG8vaGlcbiAgICAgICAgbGV0IGxvID0gdmFsdWUgPj4+IDA7XG4gICAgICAgIGxldCBoaSA9ICh2YWx1ZSAvIDB4MTAwMDAwMDAwKSA+Pj4gMDtcblxuICAgICAgICAvLyBXcml0ZSBsbyBwYXJ0ICh1cCB0byA0IGZ1bGwgNy1iaXQgZ3JvdXBzID0gMjggYml0cylcbiAgICAgICAgd2hpbGUgKGhpID4gMCB8fCBsbyA+IDB4N2YpIHtcbiAgICAgICAgICAgIHRoaXMuX3dyaXRlQnl0ZSgobG8gJiAweDdmKSB8IDB4ODApO1xuICAgICAgICAgICAgbG8gPSAoKGxvID4+PiA3KSB8IChoaSA8PCAyNSkpID4+PiAwO1xuICAgICAgICAgICAgaGkgPj4+PSA3O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3dyaXRlQnl0ZShsbyAmIDB4N2YpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVCeXRlKGI6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9lbnN1cmVDYXBhY2l0eSgxKTtcbiAgICAgICAgdGhpcy5fYnVmZmVyW3RoaXMuX3BvcysrXSA9IGI7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZVJhd0J5dGVzKGRhdGE6IFVpbnQ4QXJyYXkpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlQ2FwYWNpdHkoZGF0YS5ieXRlTGVuZ3RoKTtcbiAgICAgICAgdGhpcy5fYnVmZmVyLnNldChkYXRhLCB0aGlzLl9wb3MpO1xuICAgICAgICB0aGlzLl9wb3MgKz0gZGF0YS5ieXRlTGVuZ3RoO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfZW5zdXJlQ2FwYWNpdHkobmVlZGVkOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgcmVxdWlyZWQgPSB0aGlzLl9wb3MgKyBuZWVkZWQ7XG4gICAgICAgIGlmIChyZXF1aXJlZCA8PSB0aGlzLl9idWZmZXIuYnl0ZUxlbmd0aCkgcmV0dXJuO1xuXG4gICAgICAgIGxldCBuZXdTaXplID0gdGhpcy5fYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgIHdoaWxlIChuZXdTaXplIDwgcmVxdWlyZWQpIHtcbiAgICAgICAgICAgIG5ld1NpemUgKj0gR1JPV1RIX0ZBQ1RPUjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuZXdCdWYgPSBuZXcgVWludDhBcnJheShuZXdTaXplKTtcbiAgICAgICAgbmV3QnVmLnNldCh0aGlzLl9idWZmZXIpO1xuICAgICAgICB0aGlzLl9idWZmZXIgPSBuZXdCdWY7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgQ29tcHV0ZU5vZGVCYXNlIH0gZnJvbSBcIi4uL2NvbXB1dGUvY29tcHV0ZS5ub2RlLmJhc2VcIjtcclxuaW1wb3J0IHR5cGUgeyBJVGVuc29yIH0gZnJvbSBcIi4uL2NvbXB1dGUvY29tcHV0ZS5pbnRlcmZhY2VzXCI7XHJcbmltcG9ydCB7IE9ubnhEYXRhVHlwZSB9IGZyb20gXCIuL29ubngtdHlwZXNcIjtcclxuaW1wb3J0IHR5cGUgeyBPbm54Tm9kZUluZm8sIE9ubnhUZW5zb3JJbmZvIH0gZnJvbSBcIi4vb25ueC10eXBlc1wiO1xyXG5cclxuLyoqXHJcbiAqIEZhY3RvcnkgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIGEgQ29tcHV0ZU5vZGVCYXNlIGZyb20gYW4gT05OWCBub2RlIGRlZmluaXRpb24uXHJcbiAqL1xyXG5leHBvcnQgdHlwZSBPbm54T3BGYWN0b3J5ID0gKG5vZGVJbmZvOiBPbm54Tm9kZUluZm8sIGluaXRpYWxpemVyczogTWFwPHN0cmluZywgT25ueFRlbnNvckluZm8+KSA9PiBDb21wdXRlTm9kZUJhc2U7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE9ubnhPcEVudHJ5IHtcclxuICAgIGZhY3Rvcnk6IE9ubnhPcEZhY3Rvcnk7XHJcbiAgICBwcmlvcml0eTogbnVtYmVyO1xyXG4gICAgYmFja2VuZDogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogRGVmYXVsdCBwcmlvcml0eSBsZXZlbHMuXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgUFJJT1JJVFlfR0VORVJJQyA9IDA7XHJcbmV4cG9ydCBjb25zdCBQUklPUklUWV9OQVRJVkUgPSAxMDA7XHJcblxyXG4vKipcclxuICogUmVnaXN0cnkgbWFwcGluZyBPTk5YIG9wVHlwZSBzdHJpbmdzIHRvIHRoZWlyIGNvbXB1dGUgaW1wbGVtZW50YXRpb25zLlxyXG4gKiBTdXBwb3J0cyBwcmlvcml0eS1iYXNlZCByZWdpc3RyYXRpb246IGhpZ2hlciBwcmlvcml0eSB3aW5zLlxyXG4gKiBNdWx0aXBsZSBiYWNrZW5kcyBjYW4gcmVnaXN0ZXIgZm9yIHRoZSBzYW1lIG9wIOKAlCBoaWdoZXN0IHByaW9yaXR5IGlzIHVzZWQuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgT25ueE9wUmVnaXN0cnkge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBlbnRyaWVzID0gbmV3IE1hcDxzdHJpbmcsIE9ubnhPcEVudHJ5W10+KCk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWdpc3RlciBhbiBvcCBpbXBsZW1lbnRhdGlvbi5cclxuICAgICAqIEBwYXJhbSBvcFR5cGUgICBPTk5YIG9wZXJhdG9yIHR5cGUgKGUuZy4gXCJDb252XCIsIFwiTFNUTVwiKVxyXG4gICAgICogQHBhcmFtIGZhY3RvcnkgIEZhY3RvcnkgZnVuY3Rpb25cclxuICAgICAqIEBwYXJhbSBwcmlvcml0eSBIaWdoZXIgcHJpb3JpdHkgd2lucyAoZGVmYXVsdDogUFJJT1JJVFlfR0VORVJJQyA9IDApXHJcbiAgICAgKiBAcGFyYW0gYmFja2VuZCAgTGFiZWwgZm9yIHRoZSBpbXBsZW1lbnRhdGlvbiBzb3VyY2UgKGUuZy4gXCJnZW5lcmljXCIsIFwic3Bpa3lwYW5kYVwiKVxyXG4gICAgICovXHJcbiAgICByZWdpc3RlcihvcFR5cGU6IHN0cmluZywgZmFjdG9yeTogT25ueE9wRmFjdG9yeSwgcHJpb3JpdHkgPSBQUklPUklUWV9HRU5FUklDLCBiYWNrZW5kID0gXCJnZW5lcmljXCIpOiB2b2lkIHtcclxuICAgICAgICBsZXQgbGlzdCA9IHRoaXMuZW50cmllcy5nZXQob3BUeXBlKTtcclxuICAgICAgICBpZiAoIWxpc3QpIHtcclxuICAgICAgICAgICAgbGlzdCA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLmVudHJpZXMuc2V0KG9wVHlwZSwgbGlzdCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxpc3QucHVzaCh7IGZhY3RvcnksIHByaW9yaXR5LCBiYWNrZW5kIH0pO1xyXG4gICAgICAgIGxpc3Quc29ydCgoYSwgYikgPT4gYi5wcmlvcml0eSAtIGEucHJpb3JpdHkpO1xyXG4gICAgfVxyXG5cclxuICAgIGhhcyhvcFR5cGU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmVudHJpZXMuaGFzKG9wVHlwZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgYSBub2RlIHVzaW5nIHRoZSBoaWdoZXN0LXByaW9yaXR5IGZhY3RvcnkuXHJcbiAgICAgKi9cclxuICAgIGNyZWF0ZShub2RlSW5mbzogT25ueE5vZGVJbmZvLCBpbml0aWFsaXplcnM6IE1hcDxzdHJpbmcsIE9ubnhUZW5zb3JJbmZvPik6IENvbXB1dGVOb2RlQmFzZSB7XHJcbiAgICAgICAgY29uc3QgbGlzdCA9IHRoaXMuZW50cmllcy5nZXQobm9kZUluZm8ub3BUeXBlKTtcclxuICAgICAgICBpZiAoIWxpc3QgfHwgbGlzdC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBPTk5YIG9wIGltcGxlbWVudGF0aW9uIGZvcjogJHtub2RlSW5mby5vcFR5cGV9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBsaXN0WzBdLmZhY3Rvcnkobm9kZUluZm8sIGluaXRpYWxpemVycyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgaW5mbyBhYm91dCB0aGUgYWN0aXZlIChoaWdoZXN0LXByaW9yaXR5KSBpbXBsZW1lbnRhdGlvbiBmb3IgYW4gb3AuXHJcbiAgICAgKi9cclxuICAgIGdldEFjdGl2ZUJhY2tlbmQob3BUeXBlOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgICAgIGNvbnN0IGxpc3QgPSB0aGlzLmVudHJpZXMuZ2V0KG9wVHlwZSk7XHJcbiAgICAgICAgcmV0dXJuIGxpc3QgJiYgbGlzdC5sZW5ndGggPiAwID8gbGlzdFswXS5iYWNrZW5kIDogdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0IGFsbCByZWdpc3RlcmVkIGJhY2tlbmRzIGZvciBhbiBvcCwgc29ydGVkIGJ5IHByaW9yaXR5IChoaWdoZXN0IGZpcnN0KS5cclxuICAgICAqL1xyXG4gICAgZ2V0QmFja2VuZHMob3BUeXBlOiBzdHJpbmcpOiB7IGJhY2tlbmQ6IHN0cmluZzsgcHJpb3JpdHk6IG51bWJlciB9W10ge1xyXG4gICAgICAgIGNvbnN0IGxpc3QgPSB0aGlzLmVudHJpZXMuZ2V0KG9wVHlwZSk7XHJcbiAgICAgICAgcmV0dXJuIGxpc3QgPyBsaXN0Lm1hcCgoZSkgPT4gKHsgYmFja2VuZDogZS5iYWNrZW5kLCBwcmlvcml0eTogZS5wcmlvcml0eSB9KSkgOiBbXTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRSZWdpc3RlcmVkKCk6IHN0cmluZ1tdIHtcclxuICAgICAgICByZXR1cm4gWy4uLnRoaXMuZW50cmllcy5rZXlzKCldLnNvcnQoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFN1bW1hcnk6IGZvciBlYWNoIG9wLCB3aGljaCBiYWNrZW5kIGlzIGFjdGl2ZS5cclxuICAgICAqL1xyXG4gICAgc3VtbWFyeSgpOiB7IG9wVHlwZTogc3RyaW5nOyBiYWNrZW5kOiBzdHJpbmc7IHByaW9yaXR5OiBudW1iZXI7IGFsdGVybmF0aXZlczogbnVtYmVyIH1bXSB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0OiB7IG9wVHlwZTogc3RyaW5nOyBiYWNrZW5kOiBzdHJpbmc7IHByaW9yaXR5OiBudW1iZXI7IGFsdGVybmF0aXZlczogbnVtYmVyIH1bXSA9IFtdO1xyXG4gICAgICAgIGZvciAoY29uc3QgW29wVHlwZSwgbGlzdF0gb2YgdGhpcy5lbnRyaWVzKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHtcclxuICAgICAgICAgICAgICAgIG9wVHlwZSxcclxuICAgICAgICAgICAgICAgIGJhY2tlbmQ6IGxpc3RbMF0uYmFja2VuZCxcclxuICAgICAgICAgICAgICAgIHByaW9yaXR5OiBsaXN0WzBdLnByaW9yaXR5LFxyXG4gICAgICAgICAgICAgICAgYWx0ZXJuYXRpdmVzOiBsaXN0Lmxlbmd0aCAtIDEsXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzdWx0LnNvcnQoKGEsIGIpID0+IGEub3BUeXBlLmxvY2FsZUNvbXBhcmUoYi5vcFR5cGUpKTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEJhc2UgY2xhc3MgZm9yIE9OTlggb3Agbm9kZXMuIFByb3ZpZGVzIGF0dHJpYnV0ZSBhY2Nlc3MgaGVscGVycy5cclxuICovXHJcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBPbm54T3BOb2RlIGV4dGVuZHMgQ29tcHV0ZU5vZGVCYXNlIHtcclxuICAgIHJlYWRvbmx5IG9wVHlwZTogc3RyaW5nO1xyXG4gICAgcHJvdGVjdGVkIHJlYWRvbmx5IGF0dHJpYnV0ZXM6IE1hcDxzdHJpbmcsIG51bWJlcj47XHJcbiAgICBwcm90ZWN0ZWQgcmVhZG9ubHkgdGVuc29yQXR0cmlidXRlczogTWFwPHN0cmluZywgT25ueFRlbnNvckluZm8+O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5vZGVJbmZvOiBPbm54Tm9kZUluZm8pIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMub3BUeXBlID0gbm9kZUluZm8ub3BUeXBlO1xyXG4gICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IG5vZGVJbmZvLmF0dHJpYnV0ZXM7XHJcbiAgICAgICAgdGhpcy50ZW5zb3JBdHRyaWJ1dGVzID0gbm9kZUluZm8udGVuc29yQXR0cmlidXRlcyA/PyBuZXcgTWFwKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IG5vZGVUeXBlKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGBvbm54XyR7dGhpcy5vcFR5cGUudG9Mb3dlckNhc2UoKX1gO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBhdHRyKG5hbWU6IHN0cmluZywgZGVmYXVsdFZhbDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hdHRyaWJ1dGVzLmdldChuYW1lKSA/PyBkZWZhdWx0VmFsO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBhdHRySW50KG5hbWU6IHN0cmluZywgZGVmYXVsdFZhbDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5yb3VuZCh0aGlzLmF0dHJpYnV0ZXMuZ2V0KG5hbWUpID8/IGRlZmF1bHRWYWwpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBhdHRyVGVuc29yKG5hbWU6IHN0cmluZyk6IE9ubnhUZW5zb3JJbmZvIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICByZXR1cm4gdGhpcy50ZW5zb3JBdHRyaWJ1dGVzLmdldChuYW1lKTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEhlbHBlcjogZ2V0IGluaXRpYWxpemVyIGFzIEZsb2F0MzJBcnJheSwgaGFuZGxpbmcgcmF3RGF0YSBjb252ZXJzaW9uLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEluaXRpYWxpemVyRGF0YShpbml0OiBPbm54VGVuc29ySW5mbyk6IEZsb2F0MzJBcnJheSB7XHJcbiAgICBpZiAoaW5pdC5mbG9hdERhdGEgJiYgaW5pdC5mbG9hdERhdGEubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIHJldHVybiBpbml0LmZsb2F0RGF0YTtcclxuICAgIH1cclxuICAgIGlmIChpbml0LnJhd0RhdGEgJiYgaW5pdC5yYXdEYXRhLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAvLyBIYW5kbGUgaW50NjQgcmF3IGRhdGE6IGNvbnZlcnQgOC1ieXRlIGludHMgdG8gZmxvYXQzMlxyXG4gICAgICAgIGlmIChpbml0LmRhdGFUeXBlID09PSBPbm54RGF0YVR5cGUuSU5UNjQpIHtcclxuICAgICAgICAgICAgY29uc3QgdmlldyA9IG5ldyBEYXRhVmlldyhpbml0LnJhd0RhdGEuYnVmZmVyLCBpbml0LnJhd0RhdGEuYnl0ZU9mZnNldCwgaW5pdC5yYXdEYXRhLmJ5dGVMZW5ndGgpO1xyXG4gICAgICAgICAgICBjb25zdCBjb3VudCA9IGluaXQucmF3RGF0YS5ieXRlTGVuZ3RoIC8gODtcclxuICAgICAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShjb3VudCk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgLy8gUmVhZCBhcyBpbnQ2NCAobG93IDMyIGJpdHMgc3VmZmljaWVudCBmb3IgdHlwaWNhbCB2YWx1ZXMpXHJcbiAgICAgICAgICAgICAgICBvdXRbaV0gPSBOdW1iZXIodmlldy5nZXRCaWdJbnQ2NChpICogOCwgdHJ1ZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBvdXQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBuZXcgRmxvYXQzMkFycmF5KGluaXQucmF3RGF0YS5idWZmZXIsIGluaXQucmF3RGF0YS5ieXRlT2Zmc2V0LCBpbml0LnJhd0RhdGEuYnl0ZUxlbmd0aCAvIDQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5ldyBGbG9hdDMyQXJyYXkoMCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIZWxwZXI6IGNvbXB1dGUgdG90YWwgZWxlbWVudCBjb3VudCBmcm9tIHNoYXBlLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHNoYXBlU2l6ZShzaGFwZTogbnVtYmVyW10pOiBudW1iZXIge1xyXG4gICAgbGV0IHMgPSAxO1xyXG4gICAgZm9yIChjb25zdCBkIG9mIHNoYXBlKSBzICo9IGQ7XHJcbiAgICByZXR1cm4gcztcclxufVxyXG5cclxuLyoqXHJcbiAqIEhlbHBlcjogY3JlYXRlIGFuIElUZW5zb3IuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWFrZVRlbnNvcihkYXRhOiBGbG9hdDMyQXJyYXksIHNoYXBlOiBudW1iZXJbXSwgbmFtZT86IHN0cmluZyk6IElUZW5zb3Ige1xyXG4gICAgcmV0dXJuIHsgZGF0YSwgc2hhcGUsIG5hbWUgfTtcclxufVxyXG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsIi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gQHNwaWt5LXBhbmRhL3J1bnRpbWVcbi8vXG4vLyBPTk5YLWxpa2UgY29tcHV0ZSBncmFwaCBydW50aW1lIGZvciBTcGlreVBhbmRhIG5ldXJhbCBuZXR3b3Jrcy5cbi8vXG4vLyBQcm92aWRlcyBhIHR5cGVkIERBRyBleGVjdXRpb24gZW5naW5lIHdoZXJlOlxuLy8gICAtIE5vZGVzIGFyZSBwcm9jZXNzaW5nIHN0YWdlcyAoSUNvbXB1dGVOb2RlKVxuLy8gICAtIEVkZ2VzIGNhcnJ5IHR5cGVkIGRhdGEgdGVuc29ycyAoSURhdGFMaW5rKVxuLy8gICAtIFRoZSBncmFwaCBleGVjdXRlcyBpbiB0b3BvbG9naWNhbCBvcmRlciAoS2FobidzIGFsZ29yaXRobSlcbi8vXG4vLyBNb2R1bGVzOlxuLy8gICBjb21wdXRlLyAgOiBJVGVuc29yLCBJQ29tcHV0ZU5vZGUsIENvbXB1dGVHcmFwaCwgYnVpbHQtaW4gbm9kZXNcbi8vICAgb25ueC8gICAgIDogUHJvdG9idWYgcmVhZGVyLCBPTk5YIHBhcnNlciAoemVyby1kZXBlbmRlbmN5KVxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5cbmV4cG9ydCAqIGZyb20gXCIuL2NvbXB1dGUvaW5kZXhcIjtcbmV4cG9ydCAqIGZyb20gXCIuL29ubngvaW5kZXhcIjtcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==