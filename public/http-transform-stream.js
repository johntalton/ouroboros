import {
	CR,
	HTAB,
	isDigit,
	isTokenChar,
	isVChar,
	LF,
	SPACE
} from './http-util.js'

/** @typedef {typeof STATE[keyof typeof STATE]} State */

/** @typedef {typeof TYPE[keyof typeof TYPE]} Type */

/** @typedef {ArrayBufferLike|ArrayBufferView} HTTPTransformStreamInput */
/** @typedef {{ type: Type, value?: undefined|Uint8Array}} HTTPTransformStreamOutput */

/**
 * @typedef {Object} HTTPTransformStreamOptions
 * @property {QueuingStrategy<HTTPTransformStreamInput>} [writableStrategy]
 * @property {QueuingStrategy<HTTPTransformStreamOutput>} [readableStrategy]
 * @property {AbortSignal} [signal]
 */

export const MAX_METHOD_LENGTH = 16
export const MAX_URI_LENGTH = 1024 * 8
export const MAX_VERSION_LENGTH = 8
export const MAX_HEADER_LINE_LENGTH = 1024 * 8

export const MAX_HTTP_MESSAGE_LENGTH = 1024 * 16
export const MAX_HEADER_LINE_COUNT = 100

const STATE = /** @type {const} */ ({
	METHOD: 0,
	URI: 1,
	VERSION: 2,
	STATUS_LINE_LF: 3,
	HEADER_OR_CR: 4,
	END_OF_HEADER_LF: 5,
	BODY_OR_EOS: 6
})

export const TYPE = /** @type {const} */ ({
	METHOD: 'METHOD',
	URI: 'URI',
	VERSION: 'VERSION',
	HEADER: 'HEADER',
	EOH: 'END_OF_HEADER',
	BODY: 'BODY',
	FLUSH: 'FLUSH'
})

const HTTP_CHARS = [ 'H', 'T', 'P', '/', '.' ].map(c => c.codePointAt(0))

/**
 * @param {number} c
 */
export function isValidHTTPVersionChar(c) {
	if(isDigit(c)) { return true }
	return HTTP_CHARS.includes(c)
}

/**
 * @param {number} c
 */
export function isHeaderChar(c) {
	return isTokenChar(c) || isVChar(c) || (c === SPACE) || (c === HTAB)
}

/**
 * @param {Uint8Array} buffer
 * @returns {buffer is Uint8Array<ArrayBuffer>}
 */
export function isNonSharedArrayBuffer(buffer) {
	if(typeof SharedArrayBuffer === 'undefined') { return true }
	return !(buffer.buffer instanceof SharedArrayBuffer)
}

/**
 * @extends {TransformStream<HTTPTransformStreamInput, HTTPTransformStreamOutput>}
 */
export class HTTPTransformStream extends TransformStream {
	/**
	 * @param {HTTPTransformStreamOptions} [options={}]
	 */
	constructor(options = {}) {
		const {
			readableStrategy,
			writableStrategy,
			signal
		} = options

		/** @type {State} */
		let state = STATE.METHOD
		let accumulator = new Uint8Array(MAX_METHOD_LENGTH)
		let accumulatorOffset = 0

		let headerCount = 0
		let totalBytesProcessed = 0

		/** @type {((event: Event) => void)|undefined} */
		let abortHandler = undefined

		/** @type {(signal: AbortSignal) => Error} */
		const exceptionFromSignal = signal => {
			return (signal.reason === undefined) ?
				new DOMException('Abort', 'AbortError') :
				(signal.reason instanceof Error) ?
					signal.reason :
					new DOMException(signal.reason, 'AbortError')
		}

		/** @type {Transformer<HTTPTransformStreamInput, HTTPTransformStreamOutput>} */
		const transformer = {
			async start(controller) {
				if(signal !== undefined) {
					if(signal.aborted) {
						controller.error(exceptionFromSignal(signal))
						return
					}

					abortHandler = event => {
						controller.error(exceptionFromSignal(signal))
					}
					signal.addEventListener('abort', abortHandler, { once: true })
				}
			},

			async transform(chunk, controller) {
				if(signal?.aborted) {
					controller.error(exceptionFromSignal(signal))
					return
				}

				const chunk8 = ArrayBuffer.isView(chunk) ?
					new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength) :
					new Uint8Array(chunk)

				const localChunk8 = isNonSharedArrayBuffer(chunk8) ?
					chunk8 :
					chunk8.slice() // copy out shared

				if(state === STATE.BODY_OR_EOS) {
					controller.enqueue({
						type: TYPE.BODY,
						value: chunk8
					})
					return
				}

				/** @type {(type: Type, next: State, length: number, name: string) => boolean} */
				const emit = (type, next, length, name) => {
					if(accumulatorOffset === 0) {
						controller.error(new Error(`Empty ${name}`))
						return false
					}

					controller.enqueue({
						type,
						value: accumulator.subarray(0, accumulatorOffset)
					})

					state = next
					accumulator = new Uint8Array(length)
					accumulatorOffset = 0

					return true
				}

				/** @type {(token: number, valid: (c: number) => boolean, name: string) => boolean} */
				const accumulate = (token, valid, name) => {
					if(!valid(token)) {
						controller.error(new Error(`Invalid Character for ${name}`))
						return false
					}

					if(accumulatorOffset >= accumulator.byteLength) {
						controller.error(new Error('overflow max method length'))
						return false
					}
					accumulator[accumulatorOffset] = token
					accumulatorOffset += 1

					return true
				}

				totalBytesProcessed += chunk.byteLength
				if(totalBytesProcessed > MAX_HTTP_MESSAGE_LENGTH) {
					controller.error(new Error('maximum header bytes exceeded'))
					return
				}

				let chunkOffset = 0
				for(const token of localChunk8) {
					if(signal?.aborted) {
						controller.error(exceptionFromSignal(signal))
						return
					}

					switch(state) {
						case STATE.METHOD:
							if(token === SPACE) {
								if(!emit(TYPE.METHOD, STATE.URI, MAX_URI_LENGTH, 'Method')) { return }
							}
							else {
								if(!accumulate(token, isTokenChar, 'Method')) { return }
							}
							break
						case STATE.URI:
							if(token === SPACE) {
								if(!emit(TYPE.URI, STATE.VERSION, MAX_VERSION_LENGTH, 'URI')) { return }
							}
							else {
								if(!accumulate(token, isVChar, 'URI')) { return }
							}
							break
						case STATE.VERSION:
							if(token === CR) {
								state = STATE.STATUS_LINE_LF
							}
							else {
								if(!accumulate(token, isValidHTTPVersionChar, 'Version')) { return }
							}
							break
						case STATE.STATUS_LINE_LF:
							if(token === LF) {
								if(!emit(TYPE.VERSION, STATE.HEADER_OR_CR, MAX_HEADER_LINE_LENGTH, 'Version')) { return }
							}
							else {
								controller.error(new Error('expected CRLF on status line'))
								return
							}
							break
						case STATE.HEADER_OR_CR:
							if(token === CR) {
								state = STATE.END_OF_HEADER_LF
							}
							else if(accumulatorOffset === 0 && token === SPACE) {
								controller.error(new Error('header folding rejected'))
								return
							}
							else {
								if(!accumulate(token, isHeaderChar, 'Header')) { return }
							}
							break
						case STATE.END_OF_HEADER_LF:
							if(token === LF) {
								if(accumulatorOffset === 0) {
									// end of HTTP preamble
									controller.enqueue({
										type: TYPE.EOH
									})

									state = STATE.BODY_OR_EOS
								}
								else {
									headerCount += 1
									if(headerCount >= MAX_HEADER_LINE_COUNT) {
										controller.error(new Error('maximum header count exceeded'))
										return
									}
									if(!emit(TYPE.HEADER, STATE.HEADER_OR_CR, MAX_HEADER_LINE_LENGTH, 'Header')) { return }
								}
							}
							else {
								controller.error(new Error('expected CRLF on header line'))
								return
							}
							break
						case STATE.BODY_OR_EOS:
							controller.enqueue({
								type: TYPE.BODY,
								value: localChunk8.subarray(chunkOffset)
							})
							return

							break
						default:
							const unknownToken = token
							controller.error(new Error(`unknown state: ${unknownToken}`))
							return
							break
						}
					chunkOffset += 1
				}
			},

			async flush(controller) {
				if(signal !== undefined && abortHandler !== undefined) {
					signal.removeEventListener('abort', abortHandler)
				}

				if(accumulatorOffset !== 0) {
					controller.enqueue({
						type: TYPE.FLUSH,
						value: accumulator.subarray(0, accumulatorOffset)
					})
				}
			},
		}

		super(transformer, writableStrategy, readableStrategy)
	}
}
