import { StaticJsonRpcProvider, WebSocketProvider } from '@ethersproject/providers'
import { ContractTransaction, Wallet } from 'ethers'

export const getProvider = () => {
	return new StaticJsonRpcProvider('http://127.0.0.1:8545')
}

export const getWsProvider = () => {
	return new WebSocketProvider('ws://127.0.0.1:8545')
}

export const awaitTx = async (tx: Promise<ContractTransaction>) => {
	return await (await tx).wait()
}

export const getAddress = (id: number) => '0x' + id.toString().padStart(40, '0')

export const generateWallet = async () => {
	const provider = getProvider()
	const wallet = Wallet.createRandom()

	await provider.send('anvil_setBalance', [wallet.address, '0x21e19e0c9bab2400000'])
	return wallet.connect(provider)
}
