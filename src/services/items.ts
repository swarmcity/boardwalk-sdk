import { DecoderV0, EncoderV0, MessageV0 } from 'js-waku/lib/waku_message/version_0'
import { BigNumber, Event } from 'ethers'
import { arrayify, Interface, sha256 } from 'ethers/lib/utils'

// Types
import type { Signer } from 'ethers'
import type { WakuLight } from 'js-waku/lib/interfaces'
import type { UpdateTime } from '../lib/blockchain'
import type { WithPayload } from '../lib/types'
import type { Provider } from '@ethersproject/providers'

// Protos
import { ItemMetadata } from '../protos/item-metadata'

// Lib
import { shouldUpdate } from '../lib/blockchain'
import { decodeStoreClean, subscribeToWakuTopic } from '../lib/waku'

// Services
import { getMarketplaceContract } from './marketplace'
import { newItem } from './item'

// Status
export enum Status {
	None,
	Open,
	Funded,
	Done,
	Disputed,
	Resolved,
	Cancelled,
}

export type CreateItem = {
	price: bigint
	description: string
}

export type WakuItem = {
	hash: string
	metadata: ItemMetadata
}

export type ChainItem = {
	owner: string
	id: BigNumber
	metadata: string
	price: BigNumber
	fee: BigNumber
	seekerRep: BigNumber
	timestamp: BigNumber
	status: Status
	transactions: Partial<Record<Status, string>>
	provider?: string
}

type StatusChangeEvent = {
	id: BigNumber
	status: Status
}

type FundItemEvent = {
	id: BigNumber
	provider: string
}

export type Item = Omit<ChainItem, 'metadata'> & { metadata: ItemMetadata }

export const getItemTopic = (address: string) => {
	return `/swarmcity/1/marketplace-items-${address}/proto`
}

export const createItem = async (
	waku: WakuLight,
	marketplace: string,
	{ price, description }: CreateItem,
	signer: Signer,
) => {
	// Create the metadata
	const payload = ItemMetadata.encode({ description })
	const hash = sha256(payload)

	// Post the metadata on Waku
	await waku.lightPush.push(new EncoderV0(getItemTopic(marketplace)), {
		payload,
	})

	// Convert the price to bigint
	const { item } = await newItem(signer, marketplace, price, arrayify(hash))
	return item
}

const decodeWakuMessage = async (message: WithPayload<MessageV0>): Promise<WakuItem> => {
	return {
		hash: sha256(message.payload),
		metadata: ItemMetadata.decode(message.payload),
	}
}

export const subscribeToWakuItems = async (
	waku: WakuLight,
	marketplace: string,
	callback: (item: WakuItem) => void,
	onError?: (error: string) => void,
	onDone?: () => void,
	watch = true,
) => {
	return subscribeToWakuTopic(
		waku,
		[new DecoderV0(getItemTopic(marketplace))],
		decodeStoreClean(decodeWakuMessage, callback),
		onError,
		onDone,
		watch,
	)
}

const decodeNewItemEvent = async (event: Event, iface: Interface): Promise<ChainItem> => {
	const { args } = iface.parseLog(event)

	return {
		owner: args.owner,
		id: args.id,
		metadata: args.metadata,
		price: args.price,
		fee: args.fee,
		seekerRep: args.seekerRep,
		timestamp: args.timestamp,
		status: Status.Open,
		transactions: {},
	}
}

const decodeStatusChangeEvent = async (
	event: Event,
	iface: Interface,
): Promise<StatusChangeEvent> => {
	const { args } = iface.parseLog(event)

	return {
		id: args.id,
		status: args.newstatus,
	}
}

const decodeFundItemEvent = async (event: Event, iface: Interface): Promise<FundItemEvent> => {
	const { args } = iface.parseLog(event)

	return {
		id: args.id,
		provider: args.provider,
	}
}

type Metadata = UpdateTime & {
	metadata: string
}

type MetadataIndex = Record<string, Metadata>

export const subscribeToMarketplaceItems = (
	address: string,
	provider: Provider,
	wsProvider: Provider,
	callback: (items: Record<string, ChainItem[]>) => void,
	onDone: () => void,
) => {
	// Contracts
	const contract = getMarketplaceContract(address, provider)
	const wsContract = getMarketplaceContract(address, wsProvider)

	// Data
	const metadata: MetadataIndex = {}
	const indexed: Record<string, ChainItem[]> = {}

	const updateMetadata = (
		id: BigNumber,
		metadata: string,
		status: Status,
		transactionHash: string,
	) => {
		for (const item of indexed[metadata]) {
			if (item.id.eq(id)) {
				item.status = status
				item.transactions[status] = transactionHash
			}
		}
	}

	const updateProvider = (id: BigNumber, provider: string) => {
		const data = metadata[id.toString()]
		for (const item of indexed[data.metadata]) {
			if (item.id.eq(id)) {
				item.provider = provider
			}
		}
	}

	// Real time event listener
	const statusListener = (id: BigNumber, status: Status, event: Event) => {
		const data = metadata[id.toString()]

		if (shouldUpdate(event, data)) {
			updateMetadata(id, data.metadata, status, event.transactionHash)
			callback(indexed)
		}
	}

	const fundListener = (provider: string, id: BigNumber) => {
		updateProvider(id, provider)
		callback(indexed)
	}

	// eslint-disable-next-line @typescript-eslint/no-extra-semi
	;(async () => {
		const newItem = contract.interface.getEventTopic('NewItem')
		const statusChange = contract.interface.getEventTopic('ItemStatusChange')
		const fundItem = contract.interface.getEventTopic('FundItem')

		// Listen to logs in real time
		wsContract.on('ItemStatusChange', statusListener)
		wsContract.on('FundItem', fundListener)

		// Fetch historical
		const events = await contract.queryFilter(
			{
				address: contract.address,
				topics: [[newItem, statusChange, fundItem]],
			},
			0,
		)

		for (const event of events) {
			const { blockNumber, transactionIndex, topics } = event

			switch (topics[0]) {
				case newItem:
					const item = await decodeNewItemEvent(event, contract.interface)
					metadata[item.id.toString()] = {
						blockNumber,
						transactionIndex,
						metadata: item.metadata,
					}
					if (!indexed[item.metadata]) {
						indexed[item.metadata] = []
					}
					indexed[item.metadata].push(item)
					break

				case statusChange:
					// eslint-disable-next-line no-lone-blocks
					{
						const { id, status } = await decodeStatusChangeEvent(event, contract.interface)
						const data = metadata[id.toString()]

						if (shouldUpdate(event, data)) {
							updateMetadata(id, data.metadata, status, event.transactionHash)
						}
					}
					break

				case fundItem:
					// eslint-disable-next-line no-lone-blocks
					{
						const { id, provider } = await decodeFundItemEvent(event, contract.interface)
						updateProvider(id, provider)
					}

					break
			}
		}

		callback(indexed)
		onDone()
	})()

	return () => {
		wsContract.off('ItemStatusChange', statusListener)
		wsContract.off('FundItem', fundListener)
	}
}

export const subscribeToItems = async (
	waku: WakuLight,
	provider: Provider,
	wsProvider: Provider,
	marketplace: string,
	callback: (items: Item[]) => void,
	onDone: () => void,
) => {
	// Loading
	let wakuLoading = true
	let chainLoading = true

	// Data
	const wakuItems: WakuItem[] = []
	let chainItems: Record<string, ChainItem[]>

	// On update
	const onUpdate = () => {
		const itemsCopy = { ...chainItems }
		const items = wakuItems.flatMap((item) => {
			const events = itemsCopy[item.hash] || []
			delete itemsCopy[item.hash]
			return events.map((event) => ({ ...event, metadata: item.metadata }))
		})
		callback(items)
	}
	const onLoadingUpdate = () => {
		if (!wakuLoading && !chainLoading) {
			onDone()
		}
	}

	// Subscribe to waku and chain items
	const wakuUnsubscribe = await subscribeToWakuItems(
		waku,
		marketplace,
		(item: WakuItem) => {
			wakuItems.push(item)
			onUpdate()
		},
		undefined,
		() => {
			wakuLoading = false
			onLoadingUpdate()
		},
	)
	const chainUnsubscribe = subscribeToMarketplaceItems(
		marketplace,
		provider,
		wsProvider,
		(items) => {
			chainItems = items
			onUpdate()
		},
		() => {
			chainLoading = false
			onLoadingUpdate()
		},
	)

	return () => {
		wakuUnsubscribe()
		chainUnsubscribe()
	}
}
