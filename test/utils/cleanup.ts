export type CleanUpFunction = () => Promise<void> | void

export const cleanup = async (cleanupFns: CleanUpFunction[]) => {
	await Promise.all(cleanupFns.map((fn) => fn()))
	cleanupFns.length = 0
}
