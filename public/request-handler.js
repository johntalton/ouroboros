import { CONTENT_TYPE_HTML, HTTP_METHOD_GET, MIME_TYPE_HTML } from '@johntalton/http-util'
import {
	HTTP_HEADER_CONTENT_LENGTH,
	HTTP_HEADER_CONTENT_ENCODING,
	HTTP_HEADER_CONTENT_TYPE,
	HTTP_HEADER_CONNECTION
} from '@johntalton/http-util/headers'

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
	try {


		const scheme = 'http'
		const authority = 'next.internal:8888'
		const requestUrl = new URL(uri, `${scheme}://${authority}`)

		const negotiatedAcceptType = headers.accept.select.type([ MIME_TYPE_HTML ])
		console.log('negotiated accept type', negotiatedAcceptType?.mimetype)

		const negotiatedAcceptEncoding = headers.accept.select.encoding([ 'gzip', 'deflate' ])
		console.log('negotiated accept encoding', negotiatedAcceptEncoding?.name)

		if(method !== HTTP_METHOD_GET) {
			console.error('not a GET method')
			return
		}

		// const text = await body.text()
		// console.log('Body', text)

		const pattern = new URLPattern({ pathname: '/static/:path' }, { ignoreCase: true })
		const match = pattern.exec(requestUrl)
		if(match === null) {
			await response.respond(404, new Map([]))
			await response.end(undefined)
			return
		}

		const path = match.pathname.groups['path']
		console.log('lookup in webroot', path)
		if(path === undefined) {
			await response.respond(404, new Map([]))
			await response.end(undefined)
			return
		}

		const root = await navigator.storage.getDirectory()
		const webrootDir = await root.getDirectoryHandle('webroot')
		const handle = await webrootDir.getFileHandle(path, { create: false })
		const file = await handle.getFile()

		// const contentBody = '<html><body><h1>Compressed</h1></body></html>'
		// const encoder = new TextEncoder()
		// const content = encoder.encode(contentBody)

		// const compressionStream = new CompressionStream('gzip')

		// Promise.resolve()
		// 	.then(async () => {
		// 		const writer = compressionStream.writable.getWriter()
		// 		await writer.write(content)
		// 		await writer.close()
		// 	})

		await response.respond(200, new Map([
			[ HTTP_HEADER_CONTENT_TYPE, CONTENT_TYPE_HTML ],
			[ HTTP_HEADER_CONNECTION, 'close' ],
			// [ HTTP_HEADER_CONTENT_ENCODING, 'gzip' ],
			// [ HTTP_HEADER_CONTENT_LENGTH, `${content.byteLength}` ]
			[ HTTP_HEADER_CONTENT_LENGTH, `${file.size}`]
		]))

		console.log('Send Body')
		// await response.end(contentBody)
		// await response.end(compressionStream.readable)
		await response.end(file.stream())
	}
	catch(e) {
		console.error('Error in handler', e)
		await response.end(undefined)
	}
}