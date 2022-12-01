import { BytesLike, ethers } from 'ethers'
import { DeferredPromise } from 'p-defer'
import { Buffer } from 'node:buffer'

export function getHash(buffer: BytesLike): string {
	return ethers.utils.sha256(buffer)
}

/**
 * Compatibility functions for working with File API objects
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/File
 */

export function isBlob(blob: unknown): blob is Blob {
	// browser
	if (typeof Blob === 'function') {
		return blob instanceof Blob
	}

	// node.js
	const f = blob as Blob

	return (
		typeof f === 'object' && (typeof f.stream === 'function' || typeof f.arrayBuffer === 'function')
	)
}

/**
 * Compatibility helper for browsers where the `arrayBuffer function is
 * missing from `Blob` objects.
 *
 * @param blob A Blob object
 */
export async function blobArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
	if (blob.arrayBuffer) {
		return blob.arrayBuffer()
	}

	// workaround for Safari where arrayBuffer is not supported on Files
	return new Promise((resolve) => {
		const fr = new FileReader()
		fr.onload = () => resolve(fr.result as ArrayBuffer)
		fr.readAsArrayBuffer(blob)
	})
}

export const throwIfFasly = <Data>(defer: DeferredPromise<Data>, error?: string) => {
	return (result?: Data) => {
		result ? defer.resolve(result) : defer.reject(new Error(error))
	}
}

export const nativeDataUriToBlob = (dataUri: string): Blob => {
	const buffer = Buffer.from(dataUri.split(',')[1], 'base64')
	const type = dataUri.split(',')[0].split(':')[1].split(';')[0]

	return new Blob([buffer], { type })
}

export const dataUriToBlob = async (dataUri: string): Promise<Blob> => {
	if (typeof fetch === 'function') {
		return await (await fetch(dataUri)).blob()
	}

	return nativeDataUriToBlob(dataUri)
}
