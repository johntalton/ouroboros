
export const RESPONSE_HEADER_VERSION = 'HTTP/1.1'

export const RESPONSE_JOINER = '\r\n'

/** @type {Record<number, string | undefined>} */
export const STATUS_CODE_TEXT = ({
  // 1xx Informational
  100: 'CONTINUE',
  101: 'SWITCHING', // SWITCHING PROTOCOLS
  102: 'PROCESSING',
  103: 'EARLY HINTS',

  // 2xx Success
  200: 'OK',
  201: 'CREATED',
  202: 'ACCEPTED',
  203: 'NON-AUTH INFO', // NON-AUTHORITATIVE INFORMATION
  204: 'NO CONTENT',
  205: 'RESET', // RESET CONTENT
  206: 'PARTIAL', // PARTIAL CONTENT
  207: 'MULTI-STATUS',
  208: 'REPORTED', // ALREADY REPORTED
  226: 'IM USED',

  // 3xx Redirection
  300: 'CHOICES', // MULTIPLE CHOICES
  301: 'MOVED', // MOVED PERMANENTLY
  302: 'FOUND',
  303: 'SEE OTHER',
  304: 'NOT MODIFIED',
  305: 'USE PROXY',
  307: 'TEMP REDIRECT', // TEMPORARY REDIRECT
  308: 'PERM REDIRECT', // PERMANENT REDIRECT

  // 4xx Client Error
  400: 'BAD REQUEST',
  401: 'UNAUTHORIZED',
  402: 'PAYMENT REQ', // PAYMENT REQUIRED
  403: 'FORBIDDEN',
  404: 'NOT FOUND',
  405: 'BAD METHOD', // METHOD NOT ALLOWED
  406: 'UNACCEPTABLE', // NOT ACCEPTABLE
  407: 'PROXY AUTH', // PROXY AUTHENTICATION REQUIRED
  408: 'TIMEOUT', // REQUEST TIMEOUT
  409: 'CONFLICT',
  410: 'GONE',
  411: 'LENGTH REQ', // LENGTH REQUIRED
  412: 'PRECONDITION FAILED', // PRECONDITION FAILED
  413: 'TOO LARGE', // CONTENT TOO LARGE
  414: 'URI TOO LONG',
  415: 'BAD MEDIA', // UNSUPPORTED MEDIA TYPE
  416: 'BAD RANGE', // RANGE NOT SATISFIABLE
  417: 'EXPECT FAILED', // EXPECTATION FAILED
  418: 'TEAPOT', // I'M A TEAPOT
  421: 'MISDIRECTED', // MISDIRECTED REQUEST
  422: 'UNPROCESSABLE', // UNPROCESSABLE CONTENT
  423: 'LOCKED',
  424: 'FAILED DEP', // FAILED DEPENDENCY
  425: 'TOO EARLY',
  426: 'UPGRADE REQ', // UPGRADE REQUIRED
  428: 'PRECONDITION REQ', // PRECONDITION REQUIRED
  429: 'RATE LIMIT', // TOO MANY REQUESTS
  431: 'HEADERS LARGE', // REQUEST HEADER FIELDS TOO LARGE
  451: 'LEGAL BLOCK', // UNAVAILABLE FOR LEGAL REASONS

  // 5xx Server Error
  500: 'SERVER ERROR', // INTERNAL SERVER ERROR
  501: 'UNIMPLEMENTED', // NOT IMPLEMENTED
  502: 'BAD GATEWAY',
  503: 'UNAVAILABLE', // SERVICE UNAVAILABLE
  504: 'GW TIMEOUT', // GATEWAY TIMEOUT
  505: 'BAD HTTP VER', // HTTP VERSION NOT SUPPORTED
  506: 'NEGOTIATES', // VARIANT ALSO NEGOTIATES
  507: 'NO STORAGE', // INSUFFICIENT STORAGE
  508: 'LOOP DETECTED',
  510: 'NOT EXTENDED',
  511: 'NETWORK AUTH', // NETWORK AUTHENTICATION REQUIRED
})


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

		const statusString = STATUS_CODE_TEXT[status] ?? 'X'
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
			'', '' // double blank joiner create end-of-header
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
        // await this.#writer.close()
        await this.#writer.releaseLock()
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