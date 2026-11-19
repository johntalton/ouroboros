import { CONTENT_TYPE_HTML, HTTP_METHOD_GET, MIME_TYPE_HTML } from '@johntalton/http-util'
import { HTTP_HEADER_CONTENT_LENGTH } from '@johntalton/http-util/headers'

/** @import { HTTPHeaders } from './http/http-headers.js' */
/** @import { HTTPBody } from './http/http-body.js' */
/** @import { HTTPResponse } from './http/http-response.js' */


/**
 * @param {string} method
 * @param {string} uri
 * @param {HTTPHeaders} headers
 * @param {HTTPBody} body
 * @param {HTTPResponse} response
 */
export async function handleRequest(method, uri, headers, body, response) {
	const scheme = 'http'
	const authority = 'next.internal:8888'
	const requestUrl = new URL(uri, `${scheme}://${authority}`)

	const negotiatedAcceptType = headers.accept.select.type([ MIME_TYPE_HTML ])
	console.log('negotiated accept type', negotiatedAcceptType?.mimetype)

	if(method !== HTTP_METHOD_GET) {
		console.error('not a GET method')
		return
	}

	const text = await body.text()
	console.log('Body', text)

	const contentBody = '<html><body><h1>Compressed</h1></body></html>'
	const encoder = new TextEncoder()
	const content = encoder.encode(contentBody)

	const compressionStream = new CompressionStream('gzip')

	Promise.resolve()
		.then(async () => {
			const writer = compressionStream.writable.getWriter()
			await writer.write(content)
			await writer.close()
		})

	await response.respond(200, new Map([
		[ 'content-type', CONTENT_TYPE_HTML ],
		[ 'connection', 'close' ],
		[ 'content-encoding', 'gzip' ],
		// [ HTTP_HEADER_CONTENT_LENGTH, `${content.byteLength}` ]
	]))

	console.log('Send Body')
	// await response.end(contentBody)
	await response.end(compressionStream.readable)
}