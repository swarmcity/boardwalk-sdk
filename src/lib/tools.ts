import { DeferredPromise } from 'p-defer'

export const numberToBigInt = (number: number | string, decimals: number) => {
	const [whole, fraction = ''] = number.toString().split('.')
	const fractionTrimmed = fraction.substring(0, decimals)
	const zeroes = Array.from({ length: decimals - fractionTrimmed.length }, (_) => '0')
	return BigInt(whole + fractionTrimmed + zeroes.join(''))
}

export const bufferToHex = (buffer: ArrayBuffer) => {
	return [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

export const throwIfFasly = <Data>(defer: DeferredPromise<Data>, error?: string) => {
	return (result?: Data) => {
		result ? defer.resolve(result) : defer.reject(new Error(error))
	}
}
