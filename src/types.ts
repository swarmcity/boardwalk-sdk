import type { Message } from 'js-waku/lib/interfaces'

// Custom types
export type WithPayload<Msg extends Message> = Msg & {
	get payload(): Uint8Array
}
