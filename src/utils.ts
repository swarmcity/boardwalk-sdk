import { ethers } from "ethers";

export function bufferToHex(buffer: ArrayBuffer) {
    return [...new Uint8Array(buffer)]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('')
}

export function blobToDataURL(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = _e => resolve(reader.result as string);
        reader.onerror = _e => reject(reader.error);
        reader.onabort = _e => reject(new Error("Read aborted"));
        reader.readAsDataURL(blob);
    });
}

export function getHash(buffer: Uint8Array): string {
    return ethers.utils.sha256(buffer)
}

/**
 * Compatibility functions for working with File API objects
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/File
 */

export function isFile(file: unknown): file is File {
    // browser
    if (typeof File === 'function') {
        return file instanceof File
    }

    // node.js
    const f = file as File

    return (
        typeof f === 'object' &&
        typeof f.name === 'string' &&
        (typeof f.stream === 'function' || typeof f.arrayBuffer === 'function')
    )
}

/**
 * Compatibility helper for browsers where the `arrayBuffer function is
 * missing from `File` objects.
 *
 * @param file A File object
 */
export async function fileArrayBuffer(file: File): Promise<ArrayBuffer> {
    if (file.arrayBuffer) {
        return file.arrayBuffer()
    }

    // workaround for Safari where arrayBuffer is not supported on Files
    return new Promise(resolve => {
        const fr = new FileReader()
        fr.onload = () => resolve(fr.result as ArrayBuffer)
        fr.readAsArrayBuffer(file)
    })
}
