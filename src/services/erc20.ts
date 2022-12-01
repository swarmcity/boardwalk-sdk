// Types
import type { Signer } from 'ethers'
import type { Provider } from '@ethersproject/providers'

// ABIs
import { ERC20__factory } from '../abi'

export const getERC20Contract = (address: string, signerOrProvider: Signer | Provider) => {
	return ERC20__factory.connect(address, signerOrProvider)
}
