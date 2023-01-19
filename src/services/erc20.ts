// Types
import type { Signer } from 'ethers'
import type { Provider } from '@ethersproject/providers'

// ABIs
import { ERC20__factory } from '../abi'

/**
 * Connect to an instance of a ERC20 token contract
 * @param address
 * @param signerOrProvider
 * @returns
 */
export const getERC20Contract = (address: string, signerOrProvider: Signer | Provider) => {
	return ERC20__factory.connect(address, signerOrProvider)
}
