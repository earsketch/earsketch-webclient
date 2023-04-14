export function dbToFloat(dbValue: number) {
    return (Math.pow(10, (0.05 * dbValue)))
}
