require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/src/Jss.ts":[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Jss = void 0;
function stringProduct(a, b) {
    const result = [];
    if (!a) {
        return b;
    }
    for (let i = 0; i < a.length; i += 1) {
        for (let j = 0; j < b.length; j += 1) {
            result.push(a[i] + b[j]);
        }
    }
    return result;
}
class Jss {
    constructor(options) {
        this.idGen = options.idGen;
        this.prefixedKeys = new Set(options.prefixedKeys);
        this.defaultUnits = new Map();
        for (const unit in options.defaultUnits) {
            options.defaultUnits[unit].forEach(x => this.defaultUnits.set(x, unit));
        }
    }
    processFontFace(data) {
        return (Array.isArray(data) ? data : [data]).map(x => "@font-face" + this.processRule("normal", x)).join("");
    }
    processRule(mode, data, path) {
        const buffer = [];
        const items = [];
        for (const key in data) {
            const item = data[key];
            if (key[0] == "&") {
                buffer.push(this.processRule("normal", item, stringProduct(path, key.slice(1).replace(/\$/g, ".$").split(/,/g))));
            }
            else if (key[0] == "@") {
                const match = key.match(/^@[^\s]*/);
                switch (match[0]) {
                    case "@keyframes":
                        buffer.push(key + "{" + this.processRule("object", item) + "}");
                        break;
                    case "@media":
                        buffer.push(key + "{" + this.processRule(path ? "object-resolve" : "object", item, path) + "}");
                        break;
                    case "@font-face":
                        buffer.push(this.processFontFace(item));
                        break;
                    default:
                        buffer.push(key + " " + item + ";");
                }
            }
            else if (mode != "normal") {
                buffer.push(this.processRule("normal", item, stringProduct(path, [mode == "object-resolve" ? ".$" + key : key])));
            }
            else if (key != "composes") {
                const keyName = key.replace(/[A-Z]/g, x => "-" + x.toLocaleLowerCase());
                const value = typeof item == "string" ? item : item + (this.defaultUnits.get(keyName) || "");
                items.push(keyName + ":" + value + ";");
                if (this.prefixedKeys.has(keyName)) {
                    items.push("-ms-" + keyName + ":" + value + ";");
                    items.push("-moz-" + keyName + ":" + value + ";");
                    items.push("-webkit-" + keyName + ":" + value + ";");
                }
            }
        }
        return items.length ? (path ? path.join(", ") : "") + "{" + items.join("") + "}" + buffer.join("") : buffer.join("");
    }
    compile(data, sheet) {
        const buffer = [];
        const classMap = new Map();
        const idMap = new Map();
        for (const key in data) {
            const item = data[key];
            const match = key.match(/^(@[^\s]+)(?:\s+([^\s].*))?/);
            if (match) {
                switch (match[1]) {
                    case "@keyframes": {
                        const id = this.idGen("keyframes-" + match[2], sheet);
                        idMap.set(match[2], id);
                        buffer.push("@keyframes " + id + "{" + this.processRule("object", item) + "}");
                        break;
                    }
                    case "@media":
                        buffer.push(key + "{" + this.processRule("object-resolve", item) + "}");
                        break;
                    case "@font-face":
                        buffer.push(this.processFontFace(item));
                        break;
                    case "@global":
                        buffer.push(this.processRule("object", item));
                        break;
                    default:
                        buffer.push(key + " " + item + ";");
                }
            }
            else {
                const id = this.idGen(key, sheet);
                idMap.set(key, id);
                classMap.set(key, item.composes ? id + " " + item.composes : id);
                buffer.push(this.processRule("normal", item, ["." + id]));
            }
        }
        const source = buffer.join("").replace(/\$([A-Za-z0-9_-]+)/g, (_, x) => idMap.get(x) || x);
        const classes = {};
        classMap.forEach((value, key) => classes[key] = value.replace(/\$([A-Za-z0-9_-]+)/g, (_, x) => idMap.get(x) || x));
        return { classes, source };
    }
    inject(target, data, sheet) {
        const { classes, source } = this.compile(data, sheet);
        const textNode = document.createTextNode(source);
        if (!target) {
            const style = document.createElement("style");
            style.appendChild(textNode);
            document.head.appendChild(style);
        }
        else {
            target.appendChild(textNode);
        }
        return classes;
    }
}
exports.Jss = Jss;
exports.default = Jss;

},{}],"/src/UniqueIdGen.ts":[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UniqueIdGen {
    constructor() {
        this.map = new Map();
    }
    static create() {
        return (new this()).generator;
    }
    get generator() {
        return (rule, sheet) => this.get(rule, sheet);
    }
    reset() {
        this.map.clear();
    }
    get(rule, sheet) {
        const id = sheet ? sheet + "-" + rule : rule;
        const n = this.map.get(id);
        this.map.set(id, n ? n + 1 : 1);
        return id + (n || "");
    }
}
exports.default = UniqueIdGen;

},{}],"/src/defaultUnits.ts":[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    "px": [
        "background-position",
        "background-position-x",
        "background-position-y",
        "background-size",
        "border",
        "border-bottom",
        "border-bottom-left-radius",
        "border-bottom-right-radius",
        "border-bottom-width",
        "border-left",
        "border-left-width",
        "border-radius",
        "border-right",
        "border-right-width",
        "border-top",
        "border-top-left-radius",
        "border-top-right-radius",
        "border-top-width",
        "border-width",
        "border-block",
        "border-block-end",
        "border-block-end-width",
        "border-block-start",
        "border-block-start-width",
        "border-block-width",
        "border-inline",
        "border-inline-end",
        "border-inline-end-width",
        "border-inline-start",
        "border-inline-start-width",
        "border-inline-width",
        "border-start-start-radius",
        "border-start-end-radius",
        "border-end-start-radius",
        "border-end-end-radius",
        "margin",
        "margin-bottom",
        "margin-left",
        "margin-right",
        "margin-top",
        "margin-block",
        "margin-block-end",
        "margin-block-start",
        "margin-inline",
        "margin-inline-end",
        "margin-inline-start",
        "padding",
        "padding-bottom",
        "padding-left",
        "padding-right",
        "padding-top",
        "padding-block",
        "padding-block-end",
        "padding-block-start",
        "padding-inline",
        "padding-inline-end",
        "padding-inline-start",
        "mask-position-x",
        "mask-position-y",
        "mask-size",
        "height",
        "width",
        "min-height",
        "max-height",
        "min-width",
        "max-width",
        "bottom",
        "left",
        "top",
        "right",
        "inset",
        "inset-block",
        "inset-block-end",
        "inset-block-start",
        "inset-inline",
        "inset-inline-end",
        "inset-inline-start",
        "box-shadow",
        "text-shadow",
        "column-gap",
        "column-rule",
        "column-rule-width",
        "column-width",
        "font-size",
        "font-size-delta",
        "letter-spacing",
        "text-decoration-thickness",
        "text-indent",
        "text-stroke",
        "text-stroke-width",
        "word-spacing",
        "motion",
        "motion-offset",
        "outline",
        "outline-offset",
        "outline-width",
        "perspective",
        "vertical-align",
        "flex-basis",
        "shape-margin",
        "size",
        "gap",
        "grid",
        "grid-gap",
        "row-gap",
        "grid-row-gap",
        "grid-column-gap",
        "grid-template-rows",
        "grid-template-columns",
        "grid-auto-rows",
        "grid-auto-columns",
        "box-shadow-x",
        "box-shadow-y",
        "box-shadow-blur",
        "box-shadow-spread",
        "font-line-height",
        "text-shadow-x",
        "text-shadow-y",
        "text-shadow-blur"
    ],
    "ms": [
        "animation-delay",
        "animation-duration",
        "transition-delay",
        "transition-duration"
    ],
    "%": [
        "perspective-origin-x",
        "perspective-origin-y",
        "transform-origin",
        "transform-origin-x",
        "transform-origin-y",
        "transform-origin-z"
    ]
};

},{}]},{},[]);
