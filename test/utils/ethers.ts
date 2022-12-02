import { JsonRpcProvider } from '@ethersproject/providers'
import { ContractTransaction, Wallet } from 'ethers'

// Generated
import { PRIVATE_KEYS } from '../test-addresses.json'

export const getProvider = () => {
	return new JsonRpcProvider('http://127.0.0.1:8545')
}

export const getWallet = (index: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) => {
	return new Wallet(PRIVATE_KEYS[index], getProvider())
}

export const awaitTx = async (tx: Promise<ContractTransaction>) => {
	return await (await tx).wait()
}

export const getAddress = (id: number) => '0x' + id.toString().padStart(40, '0')
