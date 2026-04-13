// utils/dependencyMap.ts
export const dependencyMap = new Map<string, Set<string>>();

/**
 * opsPath → asmPath のペアを登録
 */
export function registerDependency(opsPath: string, asmPath: string) {
    let asmSet = dependencyMap.get(opsPath);

    if (!asmSet) {
        asmSet = new Set();
        dependencyMap.set(opsPath, asmSet);
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
export function getDependentAsmFiles(opsPath: string): string[] {
  return Array.from(dependencyMap.get(opsPath) || []);
}
