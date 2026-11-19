
export const RESPONSE_HEADER_VERSION = 'HTTP/1.1'

export const RESPONSE_JOINER = '\r\n'

export const STATUS_CODE_TEXT = {
	200: 'OK'

}


export class HTTPResponse {
	#writable
	#writer

	/**
	 * @param {WritableStream} writable
	 */
	constructor(writable) {
		this.#writable = writable
		this.#writer = writable.getWriter()
	}

	/**
	 * @param {number} status
	 * @param {Map<string, string>} headers
	 */
	async respond(status, headers) {
		if(status < 100 || status > 600) { throw new RangeError('status code out of range') }

		const statusString = STATUS_CODE_TEXT[status] ?? 'UNUSED'
		const statusLine = `${RESPONSE_HEADER_VERSION} ${status} ${statusString}`

		const headerLines = headers
			.entries()
			.map(([ key, value ]) => {

				return `${key}: ${value}`
			})
			.toArray()

		const lines = [
			statusLine,
			...headerLines,
			''
		].join(RESPONSE_JOINER)

		const encoder = new TextEncoder()
		await this.#writer.write(encoder.encode(lines))
	}

	/**
	 * @param {*} body
	 */
	async end(body) {
		if(body !== undefined) {
			if(typeof body === 'string') {
				const encoder = new TextEncoder()
				await this.#writer.write(encoder.encode(body))
			}
			else if(body instanceof ReadableStream) {
				await body.pipeTo(this.#writable)
			}
			else if(body instanceof ArrayBuffer) {
				await this.#writer.write(body)
			}
			else if(ArrayBuffer.isView(body)) {
				await this.#writer.write(body)
			}
		}

		await this.#writer.close()
	}
}