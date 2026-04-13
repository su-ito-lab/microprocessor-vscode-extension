"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectDefinedLabels = collectDefinedLabels;
exports.collectLabelComments = collectLabelComments;
exports.collectLabelDefinitions = collectLabelDefinitions;
exports.makeLabelRegex = makeLabelRegex;
const vscode = __importStar(require("vscode"));
function collectDefinedLabels(document) {
    const labelDefRegex = /^([A-Za-z_][A-Za-z0-9_]*):/;
    const labels = new Set();
    for (let i = 0; i < document.lineCount; i++) {
        const text = document.lineAt(i).text;
        const m = labelDefRegex.exec(text);
        if (m)
            labels.add(m[1]);
    }
    return labels;
}
function collectLabelComments(document) {
    const labelDefRegex = /^([A-Za-z_][A-Za-z0-9_]*)\s*:(.*)$/;
    const labelComments = {};
    for (let i = 0; i < document.lineCount; i++) {
        const raw = document.lineAt(i).text;
        const m = raw.match(labelDefRegex);
        if (!m)
            continue;
        const label = m[1];
        const rest = m[2];
        const c = rest.match(/#(.*)$/);
        labelComments[label] = c ? c[1].trim() : "";
    }
    return labelComments;
}
function collectLabelDefinitions(document) {
    const labelDefRegex = /^([A-Za-z_][A-Za-z0-9_]*):/;
    const defs = new Map();
    for (let i = 0; i < document.lineCount; i++) {
        const text = document.lineAt(i).text;
        const m = labelDefRegex.exec(text);
        if (m) {
            const label = m[1];
            const col = text.indexOf(label);
            defs.set(label, new vscode.Position(i, col));
        }
    }
    return defs;
}
function makeLabelRegex(labels) {
    if (labels.size === 0)
        return null;
    return new RegExp(`\\b(${[...labels].join('|')})\\b`, 'g');
}
//# sourceMappingURL=labelUtils.js.map