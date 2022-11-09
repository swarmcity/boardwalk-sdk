import {Contract} from 'ethers'

import {abi} from './abis/MarketplaceFactory.json'

export const getMarketplaceFactory = (address: string) => new Contract(address, abi)