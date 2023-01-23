import { Signer, utils } from 'ethers'
import { defaultAbiCoder, getAddress } from 'ethers/lib/utils'

// Lib
import { shouldUpdate } from '../lib/blockchain'

// Types
import type { Provider } from '@ethersproject/providers'

// ABIs
import { MarketplaceList__factory } from '../abi'

const EVENT_ADDED = utils.id('MarketplaceAdded(address,string)')
const EVENT_REMOVED = utils.id('MarketplaceRemoved(address)')

export type MarketplaceListItem = {
	address: string
	name: string
	blockNumber: number
	transactionIndex: number
	deleted?: boolean
}

export type MarketplaceList = Record<string, MarketplaceListItem>

/**
 * Connect to a marketplace list contract instance
 * @param address The address of a marketplacelist contract
 * @param signerOrProvider 
 * @returns 
 */
export const getMarketplaceListContract = (
	address: string,
	signerOrProvider: Signer | Provider,
) => {
	return MarketplaceList__factory.connect(address, signerOrProvider)
}

/**
 * Get the feed of marketplaces from the marketplacelist contract
 * @param provider 
 * @param address The address of the marketplace list contract
 * @param fromBlock Start reading from block number
 * @returns 
 */
export const getMarketplaceList = async (
	provider: Provider,
	address: string,
	fromBlock?: number,
) => {
	const contract = getMarketplaceListContract(address, provider)
	const marketplaces: MarketplaceList = {}
	const events = await contract.queryFilter(
		{
			address,
			topics: [[EVENT_ADDED, EVENT_REMOVED]],
		},
		(fromBlock ?? -1) + 1,
	)

	let lastBlock = fromBlock

	for (const event of events) {
		const { topics, data, blockNumber, transactionIndex } = event
		const address = getAddress(topics[1].substring(topics[1].length - 40))

		if (!shouldUpdate(event, marketplaces[address])) {
			continue
		}

		switch (topics[0]) {
			case EVENT_ADDED:
				const [name] = defaultAbiCoder.decode(['string'], data)
				marketplaces[address] = {
					name,
					address,
					blockNumber,
					transactionIndex,
				}
				break

			case EVENT_REMOVED:
				if (marketplaces[address]) {
					marketplaces[address].deleted = true
				}
				break
		}

		lastBlock = event.blockNumber
	}

	return { marketplaces, lastBlock }
}
