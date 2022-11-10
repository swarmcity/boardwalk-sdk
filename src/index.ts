import { Provider } from '@ethersproject/abstract-provider'
import {Contract, Signer} from 'ethers'

import ERC20 from './abis/MintableERC20.json'
import MarketplaceFactory from './abis/MarketplaceFactory.json'
import MarketplaceList from './abis/MarketplaceList.json'

export const getERC20 = (address: string, signer?: Signer | Provider) => new Contract(address, ERC20.abi, signer)
export const getMarketplaceFactory = (address: string, signer?: Signer | Provider) => new Contract(address, MarketplaceFactory.abi, signer)
export const getMarketplaceList = (address: string, signer?: Signer | Provider) => new Contract(address, MarketplaceList.abi, signer)