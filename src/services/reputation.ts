// Types
import type { Provider } from '@ethersproject/providers'

// ABIs
import { ERC20__factory } from '../abi/factories/ERC20__factory'

/**
 * Connect to a reputation contract
 */
export const getReputationContract = ERC20__factory.connect

/**
 * Get the reputation for a user on a specific marketplace
 * @param token 
 * @param user 
 * @param provider 
 * @returns 
 */
export const getReputation = async (token: string, user: string, provider: Provider) => {
	const contract = getReputationContract(token, provider)
	const reputation = await contract.balanceOf(user)
	return reputation.toBigInt()
}
