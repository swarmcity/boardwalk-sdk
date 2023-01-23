import { BigNumber, BigNumberish, Signer } from 'ethers'

// Types
import type { Provider } from '@ethersproject/providers'

// ABIs
import { Marketplace__factory } from '../abi'
import type { FundItemEvent, ItemStatusChangeEvent } from '../abi/Marketplace'

// Lib
import { cleanOutput, getProvider } from '../lib/ethers'

// Services
import { Status } from './items'
import { getReputation } from './reputation'
import { getERC20Contract } from './erc20'

// Types
export type MarketplaceItem = {
	fee: bigint
	metadata: string
	price: bigint
	providerAddress: string
	providerRep: bigint
	seekerAddress: string
	seekerRep: bigint
	status: Status
}

/**
 * Connect to an instance of a marketplace contract
 * @param address
 * @param signerOrProvider
 * @returns
 */
export const getMarketplaceContract = (address: string, signerOrProvider: Signer | Provider) => {
	return Marketplace__factory.connect(address, signerOrProvider)
}

type MarketplaceConfig = {
	name: string
	fee: BigNumberish
	token: string
	providerRep: string
	seekerRep: string
	payoutAddress: string
	metadataHash: string
	itemId: BigNumber
}

/**
 * Get the marketplace contract instance's dat
 * @param address The address of the marketplace contract
 * @param keys Array of which params to get from the contract
 * @param provider
 * @returns
 */
export const getMarketplaceConfig = async <Keys extends keyof MarketplaceConfig>(
	address: string,
	keys: Keys[],
	provider: Provider,
) => {
	// TODO: Batch provider somehow?
	/*
	return provider instanceof JsonRpcProvider
		? new JsonRpcBatchProvider(provider.connection, provider.network)
		: provider
	*/

	// Get the contract using said provider
	const contract = getMarketplaceContract(address, provider)

	// Fetch all required keys
	const elements = await Promise.all(
		keys.map(async (key) => ({ key, value: await contract[key]() })),
	)

	// Convert the array to a MarketplaceConfig object
	return elements.reduce((result, { key, value }) => {
		result[key] = value as MarketplaceConfig[typeof key]
		return result
	}, {} as Pick<MarketplaceConfig, Keys>)
}

/**
 * Get the token contract for a specific marketplace contract
 * @param marketplace
 * @param signerOrProvider
 * @returns
 */
export const getMarketplaceTokenContract = async (
	marketplace: string,
	signerOrProvider: Signer | Provider,
) => {
	const { token } = await getMarketplaceConfig(
		marketplace,
		['token'],
		getProvider(signerOrProvider),
	)
	return getERC20Contract(token, signerOrProvider)
}

/**
 * Get the decimals for a token contract used by a specific marketplace contract
 * @param address
 * @param provider
 * @returns
 */
export const getMarketplaceTokenDecimals = async (address: string, provider: Provider) => {
	const token = await getMarketplaceTokenContract(address, provider)
	return await token.decimals()
}

/**
 * Get a specific marketplace contract item and subscribe to it
 * @param marketplace
 * @param itemId
 * @param wsProvider
 * @param callback
 * @returns
 */
export const getMarketplaceItem = async (
	marketplace: string,
	itemId: bigint,
	wsProvider: Provider,
	callback?: (item: MarketplaceItem) => void,
) => {
	const contract = getMarketplaceContract(marketplace, wsProvider)
	const item: MarketplaceItem = cleanOutput(await contract.items(itemId))

	if (!item.status) {
		throw new Error('item not found')
	}

	const statusFilter = contract.filters.ItemStatusChange(itemId)
	const statusListener = (_: BigNumberish, status: Status) => {
		item.status = status
		callback && callback(item)
	}

	const fundFilter = contract.filters.FundItem(null, itemId)
	const fundListener = (providerAddress: string) => {
		// TODO: Fetch `providerRep`
		item.providerAddress = providerAddress
		item.providerRep = 0n
		item.status = Status.Funded
		callback && callback(item)
	}

	if (callback) {
		contract.on<ItemStatusChangeEvent>(statusFilter, statusListener)
		contract.on<FundItemEvent>(fundFilter, fundListener)
	}

	const unsubscribe = callback
		? () => {
				contract.off<ItemStatusChangeEvent>(statusFilter, statusListener)
				contract.off<FundItemEvent>(fundFilter, fundListener)
		  }
		: () => undefined

	return { item, unsubscribe }
}

/**
 * Get the seeker reputation on a specific marketplace
 * @param marketplace
 * @param user
 * @param provider
 * @returns
 */
export const getMarketplaceSeekerReputation = async (
	marketplace: string,
	user: string,
	provider: Provider,
) => {
	const { seekerRep } = await getMarketplaceConfig(marketplace, ['seekerRep'], provider)
	return getReputation(seekerRep, user, provider)
}

/**
 * Get the provider reputation on a specific marketplace
 * @param marketplace 
 * @param user 
 * @param provider 
 * @returns 
 */
export const getMarketplaceProviderReputation = async (
	marketplace: string,
	user: string,
	provider: Provider,
) => {
	const { providerRep } = await getMarketplaceConfig(marketplace, ['providerRep'], provider)
	return getReputation(providerRep, user, provider)
}

/**
 * Get the  number of items on a specific marketplace contract
 * @param marketplace 
 * @param provider 
 * @returns 
 */
export const getMarketplaceDealCount = async (marketplace: string, provider: Provider) => {
	const { itemId } = await getMarketplaceConfig(marketplace, ['itemId'], provider)
	return itemId.sub(1)
}
