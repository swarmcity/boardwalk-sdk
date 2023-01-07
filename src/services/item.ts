import { splitSignature } from '@ethersproject/bytes'

// Types
import type { Signer } from 'ethers'
import type { Log } from '@ethersproject/providers'

// Services
import { getMarketplaceContract, getMarketplaceTokenContract } from './marketplace'

export type NewItem = {
	id: bigint
	owner: string
	metadata: string
	price: bigint
	fee: bigint
	seekerRep: bigint
	timestamp: bigint
}

export const newItem = async (
	signer: Signer,
	marketplace: string,
	price: bigint,
	hash: Uint8Array,
) => {
	// Contracts
	const contract = getMarketplaceContract(marketplace, signer)
	const token = await getMarketplaceTokenContract(marketplace, signer)

	// Fee and total amount (price + half of the fee)
	const fee = (await contract.fee()).toBigInt()
	const amount = price + fee / 2n

	// Approve the tokens to be spent by the marketplace
	const approveTx = await token.approve(marketplace, amount)
	await approveTx.wait()

	// Post the item on chain
	const tx = await contract.newItem(price, hash)
	const receipt = await tx.wait()

	// Get the item ID
	// TODO: Make this an external constant
	const newItemTopic = contract.interface.getEventTopic('NewItem')
	const newItemLog = receipt.logs.find((log: Log) => log.topics[0] === newItemTopic)

	if (!newItemLog) {
		throw new Error('no new item event in the transaction')
	}

	const { args } = contract.interface.parseLog(newItemLog)
	const item = {
		id: args.id.toBigInt(),
		owner: args.owner,
		metadata: args.metadata,
		price: args.price.toBigInt(),
		fee: args.fee.toBigInt(),
		seekerRep: args.seekerRep.toBigInt(),
		timestamp: args.timestamp.toBigInt(),
	} as NewItem

	return { item, receipt }
}

export const fundItem = async (
	signer: Signer,
	marketplace: string,
	item: bigint,
	signature: Uint8Array,
) => {
	const contract = getMarketplaceContract(marketplace, signer)
	const token = await getMarketplaceTokenContract(marketplace, signer)

	// Get the price
	const { price, fee } = await contract.items(item)

	// Convert the price to bigint
	const amountToApprove = price.add(fee.div(2))

	// Approve the tokens to be spent by the marketplace
	const approveTx = await token.approve(marketplace, amountToApprove)
	await approveTx.wait()

	// Fund the item
	const { v, r, s } = splitSignature(signature)
	const tx = await contract.fundItem(item, v, r, s)
	await tx.wait()
}

export const cancelItem = async (signer: Signer, marketplace: string, item: bigint) => {
	const contract = getMarketplaceContract(marketplace, signer)
	const tx = await contract.cancelItem(item)
	await tx.wait()
}

export const payoutItem = async (signer: Signer, marketplace: string, item: bigint) => {
	const contract = getMarketplaceContract(marketplace, signer)
	const tx = await contract.payoutItem(item)
	await tx.wait()
}
