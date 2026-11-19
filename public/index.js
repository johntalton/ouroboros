import {
	DEFAULT_FTDI_VENDOR_ID,
	DEFAULT_FT232H_PRODUCT_ID
} from '@johntalton/ftdi'
import { HTTPMessage } from './http/http-message.js'
import { HTTPBody } from './http/http-body.js'
import { HTTPHeaders } from './http/http-headers.js'
import { HTTPResponse } from './http/http-response.js'
import { SOCKET_PROTOCOL, SOCKET_STATUS } from '@johntalton/wiz5500'
import { handleRequest } from './request-handler.js'

export const FT232H_USB_FILTER = {
	vendorId: DEFAULT_FTDI_VENDOR_ID,
	productId: DEFAULT_FT232H_PRODUCT_ID
}

/**
 * @param {number} protocol
 */
export function modeProtocolToString(protocol) {
	if(protocol === SOCKET_PROTOCOL.CLOSED) { return 'closed' }
	if(protocol === SOCKET_PROTOCOL.TCP) { return 'TCP' }
	if(protocol === SOCKET_PROTOCOL.UDP) { return 'UDP' }
	if(protocol === SOCKET_PROTOCOL.MAC_RAW) { return 'RAW' }
	return 'unknown'
}

/**
 * @param {number} status
 */
export function socketStatusToString(status) {
	if(status === SOCKET_STATUS.CLOSED) { return 'CLOSED'}
	if(status === SOCKET_STATUS.INIT) { return 'INIT'}
	if(status === SOCKET_STATUS.LISTEN) { return 'LISTEN'}
	if(status === SOCKET_STATUS.ESTABLISHED) { return 'ESTABLISHED'}
	if(status === SOCKET_STATUS.CLOSE_WAIT) { return 'CLOSE_WAIT'}
	if(status === SOCKET_STATUS.UDP) { return 'UDP'}
	if(status === SOCKET_STATUS.MAC_RAW) { return 'MAC_RAW'}
	if(status === SOCKET_STATUS.SYN_SENT) { return 'SYN_SENT'}
	if(status === SOCKET_STATUS.SYN_RECV) { return 'SYN_RECV'}
	if(status === SOCKET_STATUS.FIN_WAIT) { return 'FIN_WAIT'}
	if(status === SOCKET_STATUS.CLOSING) { return 'CLOSING'}
	if(status === SOCKET_STATUS.TIME_WAIT) { return 'TIME_WAIT'}
	if(status === SOCKET_STATUS.LAST_ACK) { return 'LAST_ACK'}

	return 'unknown'
}

/** @param {MessageEvent} event  */
function handleWorkerMessage(event) {
	const { type } = event.data
	console.log('Event from worker', type)

	if(type === 'connect') {
		handleWorkerConnectMessage(event)
		return
	}

	console.error('unknown worker message type', type)
}

/** @param {MessageEvent} event  */
function handleWorkerConnectMessage(event) {
	const { socketNumber, readable, writable, peer } = event.data

	const signal = AbortSignal.timeout(10 * 1000)

	HTTPMessage.message({
		readable, writable
	}, { signal })
		.then(async message => {
			console.log('Message', message)
			const response = new HTTPResponse(message.stream.writable)
			const headers = new HTTPHeaders(message.headers)
			const body = new HTTPBody(message.stream.readable)

			await handleRequest(message.method, message.uri, headers, body, response)

			// await message.stream.writable.close()
			await message.stream.readable.cancel('EOS')
		})
		.catch(e => console.warn('error im http message', e))

}

function onContentLoaded() {
	const interruptWorker = new Worker('./interrupt-worker.js', { name: 'Interrupt', type: 'module' })
	interruptWorker.onerror = event => {
		console.warn('Worker Error', event.error)
	}
	interruptWorker.onmessage = handleWorkerMessage

	//
	const pairURBButton = document.querySelector('button[name="PairUSB"]')
	pairURBButton?.addEventListener('click', event => {
		navigator.usb.requestDevice({ filters: [ FT232H_USB_FILTER ] })
			.then(async device => {
				console.log('Paired Device', device)
				// worker should get device connect from here
			})
	})
}

(document.readyState === 'loading') ?
	document.addEventListener('DOMContentLoaded', onContentLoaded) :
	onContentLoaded()
