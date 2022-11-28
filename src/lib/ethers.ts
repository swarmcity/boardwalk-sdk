import { BigNumber, Signer } from 'ethers'

// Types
import type { Provider } from '@ethersproject/providers'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cleanOutput = <Type>(object: Array<any>): Type => {
	const keys = new Set(Object.keys([...object]))
	const isBasicArray = keys.size === Object.keys(object).length

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const result: any = isBasicArray ? [...object] : { ...object }

	for (const [key, value] of Object.entries(result)) {
		if (!isBasicArray && keys.has(key)) {
			delete result[key]
		} else if (Array.isArray(value)) {
			result[key] = cleanOutput(value)
		} else if (BigNumber.isBigNumber(value)) {
			result[key] = value.toBigInt()
		}
	}

	return result
}

export const getProvider = (signerOrProvider: Signer | Provider): Provider => {
	const provider = Signer.isSigner(signerOrProvider) ? signerOrProvider.provider : signerOrProvider
	if (!provider) {
		throw new Error('signer does not have a provider')
	}
	return provider
}
