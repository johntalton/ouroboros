import { isNonSharedArrayBuffer } from './http-util.js'

/** @import { HTTPMessageBufferSource } from './defs.js' */

// 		duration

export class HTTPBody {
	#readable
	#mimetype = undefined

	bodyUsed = false

	/**
	 * @param {ReadableStream<HTTPMessageBufferSource>} readable
	 */
	constructor(readable, options = {}) {
		this.#readable = readable
	}

	get body() {
		this.bodyUsed = true
		return this.#readable
	}

	async blob() {
		this.bodyUsed = true

		const parts = []
		for await (const part of this.#readable) {
			if(!isNonSharedArrayBuffer(part)) { throw new Error('Blob doe not support SharedArrayBuffer') }
			parts.push(part)
		}

		return new Blob(parts, { type: this.#mimetype })
	}

	async arrayBuffer() {
		const blob = await this.blob()
		return blob.arrayBuffer()
	}

	async bytes() {
		const blob = await this.blob()
		return blob.bytes()
	}

	async text() {
		const blob = await this.blob()
		return blob.text()
	}

	async json() {
		const text = await this.text()
		return JSON.parse(text)
	}

	async formData() {

	}
}