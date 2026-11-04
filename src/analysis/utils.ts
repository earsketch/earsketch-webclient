export function hammingDistance<T>(array1: T[], array2: T[]): number {
    if (array1.length !== array2.length) {
        throw new Error("Arrays must be of the same length")
    }

    let distance = 0
    for (let i = 0; i < array1.length; i++) {
        if (array1[i] !== array2[i]) {
            distance++
        }
    }

    return distance
}

export function entropy(list: number[]) {
    let H = 0
    for (const p of list) {
        if (p > 0) {
            H -= p * Math.log2(p)
        }
    }
    return H
}

export function combinations<T>(array: T[], combinationSize: number): T[][] {
    const result: Set<string> = new Set()

    function combine(subArray: T[], m: number): void {
        if (m === 0) {
            result.add(JSON.stringify(subArray))
        } else {
            for (let i = 0; i <= array.length - m; ++i) {
                combine(subArray.concat(array[i]), m - 1)
                array = array.slice(1)
            }
        }
    }

    combine([], combinationSize)
    return Array.from(result).map(item => JSON.parse(item))
}

export function normalize(array: number[]): number[] {
    const sum = array.reduce((a, b) => a + b, 0)
    return array.map(x => x / sum)
}
