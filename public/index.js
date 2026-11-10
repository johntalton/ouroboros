import {
	FTDIDevice,
	DEFAULT_FTDI_VENDOR_ID,
	DEFAULT_FT232H_PRODUCT_ID,
	BIT_MODE
} from '@johntalton/ftdi'
import { FTDISPIBus } from '@johntalton/ftdi/spi'
import { Wiz5500, SOCKET_PROTOCOL, SOCKET_COMMANDS, CHIP_VERSION_W5500, SOCKET_STATUS } from '@johntalton/wiz5500'
import { dumpUSBDevice } from './usb-info.js'
import {
	InternetMessageFormatFixDate
} from '@johntalton/http-util/util'
import {
	CacheControl,
	AcceptEncoding,
	AcceptLanguage,
	Accept
} from '@johntalton/http-util/headers'

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

export function temporalIMFFixDate(instant) {
	return new Intl.DateTimeFormat('en-US', {
		timeZone: 'UTC',
		weekday: 'short',
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	})
		.format(instant)
		.replace(/(?:\d,)/, '')
		+ ' GMT'
}


/** @type {{ usb: USBDevice|undefined, ftdi: FTDIDevice|undefined, wiz: Wiz5500|undefined }} */
const config = {
	usb: undefined,
	ftdi: undefined,
	wiz: undefined
}


/**
 * @param {USBDevice} device
 */
async function initializeDevice(device) {
	await device.open()
	// console.log('device open')

	dumpUSBDevice(device)


	const driver = await FTDIDevice.from(device)
	await driver.setBitMode(BIT_MODE.MPSSE)

	const ok = await driver.mpsse.validateMPSSE()
	if(!ok) {
		console.log('MPSSE not Ok')
		return
	}

	const spi = new FTDISPIBus(driver)
	const wiz = new Wiz5500(spi)
	// console.log('wiz created')

	config.usb = device
	config.wiz = wiz
	config.ftdi = driver

	const chipId = await wiz.readChipVersion()
	if(chipId !== CHIP_VERSION_W5500) {
		console.log('Chip version invalid', chipId)
		return
	}



	// await wiz.writeMode({
	// 	reset: false,
	// 	blockPing: false,
	// 	enablePPPoE: false,
	// 	forceARP: true,
	// 	wakeOnLAN: true
	// })

	// await wiz.writePHYConfig({
	// 	reset: false,
	// 	mode: 7,
	// 	softwareConfiguredMode: false
	// })

	// const rtr = await wiz.readRetryTime()
	// console.log('retry time (0x07D0)', rtr.toString(16))

	// const rcr = await wiz.readRetryCount()
	// console.log('retry count (0x08)', rcr.toString(16))

	// const mode = await wiz.readMode()
	// console.log('mode', mode)

	const phy = await wiz.readPHYConfig()
	console.log('PHY', phy.fullDuplex ? 'Full-Duplex' : 'Half-Duplex', phy.highSpeed ? '10BaseT' : '100BaseT', phy.up ? 'Up' : 'Down')

	// await wiz.writeSourceHardwareAddress('c0:AB:CD:EF:00:00')
	// await wiz.writeGatewayAddress({ dotQuad: '0.0.0.0' })
	// await wiz.writeSourceIPAddress({ dotQuad: '10.0.0.20' })
	// await wiz.writeSubnetMaskAddress({ dotQuad: '255.0.0.0' })

	await dumpConfig(wiz)

	await wiz.writeInterrupt({
		conflict: true,
		closedPPPoE: true,
		magicWOL: true,
		unreachable: true
	})


	// await wiz.writeSocketInterruptMask([ true, true, true, true, true, true, true, true ])

	///
	///
	///

	// const bufferRXSize = await wiz.readSocketReceiveBufferSize(0)
	// const bufferTXSize = await wiz.readSocketTransmitBufferSize(0)
	// console.log('buffer size rx/tx', bufferRXSize, bufferTXSize)

	// // await wiz.writeSocketFragmentOffsetInIPHeader(0, 0x4000)
	// const fragmentOffset = await wiz.readSocketFragmentOffsetInIPHeader(0)
	// console.log('fragment offset (0x4000)', fragmentOffset.toString(16))

	await wiz.writeSocketMode(0, {
		protocol: SOCKET_PROTOCOL.TCP,
		enableNoDelayedACK: true
	})

	await wiz.writeSocketSocketInterrupt(0, {
		connect: true,
		disconnect: true,
		receive: true,
		sendOk: true,
		timeout: true
	})

	await wiz.writeSocketSocketInterruptMask(0, {
		enableConnect: true,
		enableDisconnect: true,
		enableReceive: true,
		enableSendOk: true,
		enableTimeout: true
	})

	await wiz.writeSocketSourcePort(0, 8888)
	// await socketInfo(wiz, 0)

	await wiz.writeSocketCommand(0, SOCKET_COMMANDS.OPEN)
	// const openResult = await wiz.readSocketCommand(0)
	// console.log('open result', openResult)
	// await socketInfo(wiz, 0)

	await wiz.writeSocketCommand(0, SOCKET_COMMANDS.LISTEN)
	// const listenResult = await wiz.readSocketCommand(0)
	// console.log('listen result', listenResult)
	// await socketInfo(wiz, 0)


}

/**
 * @param {Wiz5500} wiz
 */
async function dumpConfig(wiz) {
	const mac = await wiz.readSourceHardwareAddress()
	const subnetMask = await wiz.readSubnetMaskAddress()
	const gateway = await wiz.readGatewayAddress()
	const sourceIp = await wiz.readSourceIPAddress()

	console.log('mac', mac.canonical)
	console.log('sourceIp', sourceIp.dotQuad)
	console.log('subnetMask', subnetMask.dotQuad)
	console.log('gateway', gateway.dotQuad)
}

/**
 * @param {Wiz5500} wiz
 * @param {number} socketNumber
*/
async function socketInfo(wiz, socketNumber) {
	const socketDestHWAddress = await wiz.readSocketDestinationHardwareAddress(socketNumber)
	const socketDestIPAddress = await wiz.readSocketDestinationIPAddress(socketNumber)
	const socketDestPort = await wiz.readSocketDestinationPort(socketNumber)
	const socketMode = await wiz.readSocketMode(socketNumber)
	// const socketSrcPort = await wiz.readSocketSourcePort(socketNumber)
	const socketStatus = await wiz.readSocketStatus(socketNumber)

	const socketInterrupts = await wiz.readSocketSocketInterrupt(socketNumber)
	console.log('socket N interrupts', socketInterrupts)

	console.log(`Source:
		Protocol: ${modeProtocolToString(socketMode.protocol)}
		MAC: ${socketDestHWAddress.canonical}
		IP: ${socketDestIPAddress.dotQuad}
		Port: ${socketDestPort}
		Status: ${socketStatusToString(socketStatus)}
	`)

}

function onContentLoaded() {
	//
	navigator.usb.addEventListener('connect', async event => {
		console.log('USB Device connect', event)

		const { device } = event
		await initializeDevice(device)
	})
	navigator.usb.addEventListener('disconnect', event => {
		console.log('USB Device disconnect', event)
	})

	navigator.usb.getDevices()
		.then(async devices => {
			console.log('existing paired device', devices)
			if(devices.length === 0) { return }

			const [ device ] = devices

			await initializeDevice(device)
		})
		.catch(e => console.warn('initialize error', e))

	const pairURBButton = document.querySelector('button[name="PairUSB"]')
	pairURBButton?.addEventListener('click', event => {
		navigator.usb.requestDevice({ filters: [ FT232H_USB_FILTER ] })
			.then(async device => {
				console.log('Paired Device', device)

				await initializeDevice(device)
			})
	})

	const infoButton = document.querySelector('button[name="TestInfo"]')
	infoButton?.addEventListener('click', async event => {

		const interrupt = await config.wiz?.readInterrupt()
		console.log('interrupts', interrupt)
		const socketInterrupts = await config.wiz?.readSocketInterrupt()
		console.log('socket interrupts', socketInterrupts)

		await socketInfo(config.wiz, 0)


	})


	const parts = []
	const receiveButton = document.querySelector('button[name="TestReceive"]')
	receiveButton?.addEventListener('click', async event => {
		if(config.wiz === undefined) {
			console.warn('undefined wiz')
			return
		}

		const receiveSize = await config.wiz.readSocketRXReceiveSize(0)
		const receivePointer = await config.wiz.readSocketRXReadPointer(0)
		console.log({ receivePointer, receiveSize })

		const adjustedSize = Math.min(receiveSize, 64)

		const result = await config.wiz?.readSocketRX(0, receivePointer, adjustedSize)
		console.log(result)
		parts.push(result)

		const updatedPointer = receivePointer + adjustedSize
		await config.wiz.writeSocketRXReadPointer(0, updatedPointer)
		await config.wiz?.writeSocketCommand(0, SOCKET_COMMANDS.RECV)


		const blob = new Blob(parts)
		const text = await blob.text()
		//console.log('current text', text)
		if(text.includes('\r\n\r\n')) {
			// @ts-ignore
			const headers = new Map(text.split('\r\n')
				.map(line => {
					const [ rawKey, rawValue ] = line.split(':')

					const key = rawKey.toLowerCase()
					let value = rawValue?.trimStart()

					if(key === 'connection') {}

					if(key === 'cache-control') {
						const result = CacheControl.parse(value)
						return [ key, result ]
					}

					if(key === 'dnt') {}

					if(key === 'upgrade-insecure-requests') {}

					if(key === 'user-agent') {}

					if(key === 'accept') {
						const result = Accept.parse(rawValue)
						return [ key, result ]
					}

					if(key === 'accept-encoding') {
						const result = AcceptEncoding.parse(rawValue)
						return [ key, result ]
					}

					if(key === 'accept-language') {
						const result = AcceptEncoding.parse(rawValue)
						return [ key, result ]
					}

					return [ key, value ]
				}))

			console.log(headers)
		}
	})

	const sendButton = document.querySelector('button[name="TestSend"]')
	sendButton?.addEventListener('click', async event => {
		if(config.wiz === undefined) {
			console.warn('undefined wiz')
			return
		}

		const now = Temporal.Now.instant()

		const response = '<html><body>Success</body></html>'
		const text = [
			'HTTP/1.1 200 OK',
			`Date: ${InternetMessageFormatFixDate.encode(now)}`,
			'Server: Chrome-WizNet5500',
			'Content-Type: text/html',
			`Content-Length: ${response.length}`,
			'Connection: close',
			'',
			response,
			''
		].join('\r\n')

		const encoder = new TextEncoder()
		const buffer = encoder.encode(text)

		const freeSize = await config.wiz.readSocketTXFreeSize(0)
		const pointer = await config.wiz.readSocketTXWritePointer(0)

		console.log('freeSize', freeSize)
		console.log('replay size', buffer.byteLength)

		await config.wiz.writeSocketTX(0, pointer, buffer)

		const updatedPointer = pointer + buffer.byteLength

		await config.wiz.writeSocketTXWritePointer(0, updatedPointer)
		await config.wiz?.writeSocketCommand(0, SOCKET_COMMANDS.SEND)
	})

	const closeButon = document.querySelector('button[name="TestClose"]')
	closeButon?.addEventListener('click', async event => {
		await config.wiz?.writeSocketSocketInterrupt(0, {
			connect: true,
			disconnect: true,
			receive: true,
			sendOk: true,
			timeout: true
		})

		// await config.wiz?.writeSocketDestinationHardwareAddress(0, '0:0:0:0:0:0')
		// await config.wiz?.writeSocketDestinationIPAddress(0, '0.0.0.0')
		// await config.wiz?.writeSocketDestinationPort(0, 0)

		await config.wiz.writeSocketCommand(0, SOCKET_COMMANDS.CLOSE)
	})

	const resetButton = document.querySelector('button[name="TestReset"]')
	resetButton?.addEventListener('click', async event => {
		await config.ftdi?.reset()
		await config.usb?.reset()
		await config.ftdi?.setBitMode(BIT_MODE.RESET)
	})

	const configForm = document.getElementById('ConfigurationForm')
	configForm?.addEventListener('submit', async event => {
		event.preventDefault()

		const fd = new FormData(event.target)
		console.log('submit config', [ ...fd.entries() ])

		const mac = fd.get('MAC') ?? ''
		const ip = fd.get('IP') ?? ''
		const subnet = fd.get('Subnet') ?? ''
		const gateway = fd.get('Gateway') ?? ''

		if(mac instanceof File) { throw new Error('FormData File found') }
		if(ip instanceof File) { throw new Error('FormData File found') }
		if(subnet instanceof File) { throw new Error('FormData File found') }
		if(gateway instanceof File) { throw new Error('FormData File found') }

		await config.wiz?.writeSourceHardwareAddress(mac)
		await config.wiz?.writeSourceIPAddress(ip)
		await config.wiz?.writeSubnetMaskAddress(subnet)
		await config.wiz?.writeGatewayAddress(gateway)


		await dumpConfig(config.wiz)
	})
}

(document.readyState === 'loading') ?
	document.addEventListener('DOMContentLoaded', onContentLoaded) :
	onContentLoaded()
