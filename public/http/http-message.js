import { HeaderLine } from './header-line.js'
import {
	HTTPTransformStream,
	TYPE
} from './http-transform-stream.js'

/** @import { HTTPMessageBufferSource } from './defs.js' */
/** @import { HTTPTransformStreamHeaderOutput } from './http-transform-stream.js' */

/**
 * @typedef {Object} HTTPMessageOptions
 * @property {AbortSignal|undefined} [signal]
 */

/**
 * @typedef {Object} HTTPMessageResult
 * @property {string} method
 * @property {string} uri
 * @property {string} version
 * @property {Map<string, string|Array<string>>} headers
 * @property {ReadableWritablePair<HTTPMessageBufferSource, HTTPMessageBufferSource>} stream
 */

/**
 * @param {Partial<HTTPMessageResult>} message
 * @returns {message is HTTPMessageResult}
 */
export function isValidMessage(message) {
	if(message.method === undefined) { return false }
	if(message.uri === undefined) { return false }
	if(message.version === undefined) { return false }

	return true
}

export class HTTPMessage {
	/**
	 * @param {ReadableWritablePair<HTTPMessageBufferSource, HTTPMessageBufferSource>} pair
	 * @param {HTTPMessageOptions} [options={}]
	 * @returns {Promise<HTTPMessageResult>}
	 */
	static async message(pair, options = {}) {
		const {
			signal
		} = options

		const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false })
		const transformer = new HTTPTransformStream({ signal })
		const parts = pair.readable.pipeThrough(transformer, { signal })

		const headersMap = new Map()
		const makeBody = () => new ReadableStream({
			start(controller) {},

			async pull(controller) {
				for await (const part of parts) {
					if(part.type !== TYPE.BODY) {
						controller.error(new Error('invalid part'))
						return
					}
					controller.enqueue(part.value)
				}

				controller.close()
			},

			cancel(reason) {
				console.log('Cancel', reason)
			}
		}, undefined)

		/** @type {(headerPart: HTTPTransformStreamHeaderOutput) => void} */
		const updateHeader = headerPart => {
			const { key: rawKey, value: rawValue } = HeaderLine.parse(headerPart.value)
			const key = decoder.decode(rawKey).toLowerCase()
			const value = decoder.decode(rawValue)

			if(headersMap.has(key)) {
				const existingValue = headersMap.get(key)
				if(Array.isArray(existingValue)) {
					existingValue.push(value)
				}
				else {
					headersMap.set(key, [ existingValue, value ])
				}
			}
			else {
				headersMap.set(key, value)
			}
		}


		//
		//
		//
		/** @type {Partial<HTTPMessageResult>} */
		const message = {
			method: undefined,
			uri: undefined,
			version: undefined,
			headers: headersMap,
			stream: {
				readable: undefined,
				writable: pair.writable
			}
		}

		const reader = parts.getReader()
		try {
			while(true) {
				const { done, value: part } = await reader.read()
				if(done) {
					throw new Error('Done')
					break
				}

				const { type } = part

				switch(type) {
				case TYPE.METHOD:
					message.method = decoder.decode(part.value)
					break
				case TYPE.URI:
					message.uri = decoder.decode(part.value)
					break
				case TYPE.VERSION:
					message.version = decoder.decode(part.value)
					break
				case TYPE.HEADER:
					updateHeader(part)
					break
				case TYPE.EOH:
					if(!isValidMessage(message)) { throw new Error('Invalid message') }
					message.stream.readable = makeBody()
					return message
					break
				case TYPE.BODY:
					throw new Error('Unexpected body in header')
					break
				case TYPE.FLUSH:
					//
					break
				default:
					/** @type {never} */
					const unhandledType = type
					throw new Error(`Unhandled Type: ${unhandledType}`)
				}
			}
		}
		catch(e) {
			throw new Error('Header reader error', { cause: e })
		}
		finally {
			console.log('Release header Lock')
			reader.releaseLock()
		}

		throw new Error('Exit without resolution')
	}
}
