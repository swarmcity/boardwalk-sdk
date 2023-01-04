import { generatePrivateKey, getPublicKey } from 'js-waku'
import { randomBytes } from 'node:crypto'

export const generateKeyPair = () => {
	const privateKey = generatePrivateKey()
	const publicKey = getPublicKey(privateKey)

	return { publicKey, privateKey }
}

export const randomBigInt = (bytes = 8) => {
	return BigInt('0x' + randomBytes(bytes).toString('hex'))
}
