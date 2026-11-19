import { isTokenChar, SPACE, HTAB } from './http-util.js'

export const COLON = ':'.charCodeAt(0)

/** @param {number} c  */
export function isWhitespace(c) {
	return (c === SPACE) || (c === HTAB)
}

export class HeaderLine {
	/**
	 * @param {ArrayBufferLike|ArrayBufferView} buffer
	 */
	static parse(buffer) {
		const buffer8 = ArrayBuffer.isView(buffer) ?
			new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Uint8Array(buffer)

		let colonIndex = 0
		while(true) {
			const token = buffer8[colonIndex]
			// console.log('colon?', token)
			if(token === COLON) { break }
			colonIndex += 1

			if(!isTokenChar(token)) { throw new Error('invalid field character') }
			if(colonIndex >= buffer8.byteLength) { throw new Error('field missing colon') }
		}

		const key = buffer8.subarray(0, colonIndex)
		// console.log('found key', colonIndex, key)

		let firstNonOWS = colonIndex + 1
		while(true) {
			const token = buffer8[firstNonOWS]
			if(isWhitespace(token)) {
				firstNonOWS += 1
				continue
			}

			if(firstNonOWS >= buffer.byteLength) { throw new Error('empty header value') }
			break
		}

		let lastNonOWS = buffer8.byteLength - 1
		while(true) {
			const token = buffer8[lastNonOWS]
			if(isWhitespace(token)) {
				lastNonOWS -= 1
				continue
			}

			if(lastNonOWS < firstNonOWS) { throw new Error('empty header value (tail)') }
			break
		}

		const value = buffer8.subarray(firstNonOWS, lastNonOWS + 1)

		return {
			key,
			value
		}
	}
}
