import { Buffer } from 'buffer'

/**
 * Compatibility functions for working with File API objects
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/File
 */

export function isBlob(blob: unknown): blob is Blob {
	if (typeof Blob === 'undefined') {
		return false
	}

	return blob instanceof Blob || toString.call(blob) === '[object Blob]'
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
