import pDefer from 'p-defer'

// Types
import type { DeferredPromise } from 'p-defer'

export const pEvent = <Type>() => {
	const waitingDefers: DeferredPromise<Type>[] = []
	const resolvedDefers: DeferredPromise<Type>[] = []

	const push = (array: DeferredPromise<Type>[]) => {
		const defer = pDefer<Type>()
		array.push(defer)
		return defer
	}

	return {
		listener: (event: Type) => {
			const defer = waitingDefers.shift() || push(resolvedDefers)
			defer.resolve(event)
		},
		next: () => {
			const defer = resolvedDefers.shift() || push(waitingDefers)
			return defer.promise
		},
	}
}
