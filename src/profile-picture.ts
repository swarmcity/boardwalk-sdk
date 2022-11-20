import { WakuLight } from "js-waku/lib/interfaces"

import { bufferToHex, getHash } from "./utils"
import { postWakuMessage } from "./waku"

// Protos
import { ProfilePicture } from '../protos/profile-picture'
import { ethers } from "ethers"


export const getProfilePictureTopic = (hash: string) => {
    return `/swarmcity/1/profile-picture-${hash}/proto`
}

export const createProfilePicture = async (
    waku: WakuLight,
    dataUri: string
) => {
    const blob = await (await fetch(dataUri)).blob()
    const buffer = new Uint8Array(await blob.arrayBuffer())
    const hash = getHash(buffer)
    const message = postWakuMessage(
        waku,
        getProfilePictureTopic(hash),
        ProfilePicture.encode({
            data: buffer,
            type: blob.type,
        })
    )
    return { hash, message }
}