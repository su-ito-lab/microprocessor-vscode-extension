"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dependencyMap = void 0;
exports.registerDependency = registerDependency;
exports.getDependentAsmFiles = getDependentAsmFiles;
// utils/dependencyMap.ts
exports.dependencyMap = new Map();
/**
 * opsPath → asmPath のペアを登録
 */
function registerDependency(opsPath, asmPath) {
    let asmSet = exports.dependencyMap.get(opsPath);
    if (!asmSet) {
        asmSet = new Set();
        exports.dependencyMap.set(opsPath, asmSet);
    }
    // すでに登録済みならスキップ
    if (asmSet.has(asmPath)) {
        // console.log(`[VProcAsm] dependency already exists: ${opsPath} → ${asmPath}`);
        return;
    }
    // 新規登録
    asmSet.add(asmPath);
    console.log(`[VProcAsm] registerDependency: ${opsPath} → ${asmPath}`);
}
/**
 * opsPath を使っているすべての asmPath を取得
 */
function getDependentAsmFiles(opsPath) {
    return Array.from(exports.dependencyMap.get(opsPath) || []);
}
//# sourceMappingURL=dependencyMap.js.map