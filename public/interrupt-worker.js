import {
	Socket,
	BIT_MODE,
	delayMs,
	FTDIDevice,
	FTDIEEPROM,
	FTDISPIBus,
	SOCKET_COMMANDS,
	SOCKET_PROTOCOL,
	Util,
	Wiz5500
} from './dist/worker.bundle.js'
import config from './config.json' with { type: 'json' }

import { dumpUSBDevice } from './usb-info.js'
// import { Socket } from './socket.js'

/** @import { SPIBus } from '@johntalton/and-other-delights' */
/** @import { SocketInterrupt } from '@johntalton/wiz5500' */

/**
 * @typedef {Object} ConfigurationDeviceUSB
 * @property {number} [vendorId]
 * @property {number} [productId]
 * @property {string} [productName]
 * @property {string} [serialNumber]
 */

/**
 * @typedef {Object} ConfigurationDeviceSPI
 * @property {number} [cs]
 * @property {number} [speedHz]
 * @property {number} [mode]
 */

/**
 * @typedef {Object} ConfigurationDeviceWIZSocket
 * @property {number} socketNumber
 * @property {string} mode
 * @property {number} port
 */


/**
 * @typedef {Object} ConfigurationDeviceWIZ
 * @property {string} ip
 * @property {string} subnet
 * @property {string} MAC
 * @property {string} gateway
 * @property {Array<ConfigurationDeviceWIZSocket>} sockets
 */


/**
 * @typedef {Object} ConfigurationDevice
 * @property {string} name
 * @property {ConfigurationDeviceUSB} usb
 * @property {ConfigurationDeviceSPI} spi
 * @property {ConfigurationDeviceWIZ} wiz5500
 */

/**
 * @typedef {Object} Configuration
 * @property {Array<ConfigurationDevice>} devices
 */

/**
 * @typedef {Object} Registration
 * @property {USBDevice} device
 * @property {FTDIDevice} ftdi
 * @property {SPIBus} spi
 * @property {Wiz5500} wiz
 */

/** @type {Map<string, Promise<Registration|undefined>>} */
const deviceRegistry = new Map()

/**
 * @param {USBDevice} device
 * @param {Configuration} config
 */
function matchConfig(device, config) {
	const deviceConfig = config.devices.find(devConfig => {
		const { usb } = devConfig

		let match = false

		if(usb.vendorId !== undefined) {
			if(usb.vendorId !== device.vendorId) { return false }
			match = true
		}

		if(usb.productId !== undefined) {
			if(usb.productId !== device.productId) { return false }
			match = true
		}

		if(usb.productName !== undefined) {
			if(usb.productName !== device.productName) { return false }
			match = true
		}

		if(usb.serialNumber !== undefined) {
			if(usb.serialNumber !== device.serialNumber) { return false }
			match = true
		}

		return match
	})

	return deviceConfig
}

/**
 * @param {USBDevice} device
 * @returns {Promise<Registration|undefined>}
 */
async function setup(device) {
	/** @type {Configuration} */
	const localConfig = config

	const deviceConfig = matchConfig(device, localConfig)
	if(deviceConfig === undefined) {
		console.log('No matching configuration found for device', device)
		return undefined
	}

	console.log('Matching configuration', deviceConfig)

	const registration = await deviceRegistry.getOrInsertComputed(deviceConfig.name, async key => {
		console.log('create new registration', key)

		dumpUSBDevice(device)

		await device.open()
		const ftdi = await FTDIDevice.from(device)

		await ftdi.setBitMode(BIT_MODE.RESET)
		await ftdi.setBitMode(BIT_MODE.MPSSE)


		// await ftdi.mpsse.setGpioHigh(0b0001_0100, 0b0001_1111)
		// await delayMs(1000)

		// await ftdi.mpsse.setGpioHigh(0b0001_0001, 0b0001_1111)
		// await delayMs(1000)

		// await ftdi.mpsse.setGpioHigh(0b0000_0101, 0b0001_1111)
		// await delayMs(1000)

		// await ftdi.mpsse.setGpioHigh(0b0001_0101, 0b0001_1111)


		// const chipInfo = Util.chip(device.deviceVersionMajor, device.deviceVersionMinor)
		// console.log('ftdi chip info', chipInfo)
		// const eepromBuffer = await FTDIEEPROM.readEEPROMBulk(ftdi, chipInfo?.eepromSize)
		// // console.log('eeprome buffer', eepromBuffer)
		// const eepromInfo = FTDIEEPROM.parseEEPROM(eepromBuffer, chipInfo)
		// console.log('eeprom', eepromInfo)

		// const latencyTimer = await ftdi.getLatencyTimer()
		// console.log('ftdi latency timer', latencyTimer)

		await ftdi.mpsse.enableLoopback(false)

		const spi = new FTDISPIBus(ftdi, { cs: 0 })


		try {

			// await ftdi.setBitMode(BIT_MODE.RESET)
			await ftdi.setBitMode(BIT_MODE.MPSSE)

			const ok = await ftdi.mpsse.validateMPSSE()
			if(!ok) {
				console.log('MPSSE not Ok')
				await ftdi.reset()
				await device.reset()
				await device.close()
				return undefined
			}

			const wiz = new Wiz5500(spi)

			const version = await wiz.readChipVersion()
			console.log('Wiz Version', version)
			if(version !== 0x04) {
				throw new Error('version missmatch')
			}


			await wiz.writeSourceHardwareAddress(deviceConfig.wiz5500.MAC)
			await wiz.writeGatewayAddress({ dotQuad: deviceConfig.wiz5500.gateway })
			await wiz.writeSourceIPAddress({ dotQuad: deviceConfig.wiz5500.ip })
			await wiz.writeSubnetMaskAddress({ dotQuad: deviceConfig.wiz5500.subnet })

			const mac = await wiz.readSourceHardwareAddress()
			const subnetMask = await wiz.readSubnetMaskAddress()
			const gateway = await wiz.readGatewayAddress()
			const sourceIp = await wiz.readSourceIPAddress()

			console.log('mac', mac.canonical)
			console.log('sourceIp', sourceIp.dotQuad)
			console.log('subnetMask', subnetMask.dotQuad)
			console.log('gateway', gateway.dotQuad)

			await wiz.writeInterrupt({
				conflict: true,
				unreachable: true,
				closedPPPoE: true,
				magicWOL: true,
			})

			const sockets = [
				{ socketNumber: 0 },
				{ socketNumber: 1 },
				{ socketNumber: 2 },
				{ socketNumber: 3 },
				{ socketNumber: 4 },
				{ socketNumber: 5 },
				{ socketNumber: 6 },
				{ socketNumber: 7 },
			]


			for(const socketCache of sockets) {

				await wiz.writeSocketSocketInterrupt(socketCache.socketNumber, {
					sendOk: true,
					timeout: true,
					receive: true,
					disconnect: true,
					connect: true
				})


				const socketConfig = deviceConfig.wiz5500.sockets.find(s => s.socketNumber === socketCache.socketNumber)
				if(socketConfig === undefined) {
					console.log('no configuration for socket', socketCache.socketNumber)
					continue
				}

				console.log('configuring socket', socketConfig.socketNumber)


				if(socketConfig.mode === 'TCP/LISTEN') {
					console.log('\tSetting up TCP Listen on port', socketConfig.port)
					await wiz.writeSocketMode(socketConfig.socketNumber, {
						protocol: SOCKET_PROTOCOL.TCP,
						enableNoDelayedACK: true
					})

					await wiz.writeSocketSourcePort(socketConfig.socketNumber, socketConfig.port)

					await wiz.writeSocketCommand(socketConfig.socketNumber, SOCKET_COMMANDS.OPEN)
					await wiz.writeSocketCommand(socketConfig.socketNumber, SOCKET_COMMANDS.LISTEN)
				}
				else {
					console.log('no mode set for socket', socketConfig.socketNumber)
				}

			}


			return {
				device,
				ftdi,
				spi,
				wiz,
				// sockets
			}
		}
		catch(e) {
			console.log('error registering', e)
			await ftdi.reset()
			await device.reset()
			await device.close()
		}
	})

	await delayMs(1000)
	pollInterruptState()

	return registration
}

async function pollInterruptState() {
	if(deviceRegistry.size === 0) { return }

	for await (const [ key, futureRegistration ] of deviceRegistry) {
		const registration = await futureRegistration
		if(registration === undefined) {
			console.log('bad registration', )
			return
		}
		const interrupts = await registration.wiz.readSocketInterrupt()
		// console.log(key, 'interrupts', interrupts)


		for(let iindex = 0; iindex < interrupts.length; iindex +=1) {
			const interrupt = interrupts[iindex]
			if(interrupt === false) { continue }

			console.log('has interrupt socketNumber', iindex)

			const socketInterrupts = await registration.wiz.readSocketSocketInterrupt(iindex)
			console.log(socketInterrupts)

			if(socketInterrupts.connect) {
				const socketStatus = await registration.wiz.readSocketStatus(iindex)
				const peerIP = await registration.wiz.readSocketDestinationIPAddress(iindex)
				const peerPort = await registration.wiz.readSocketDestinationPort(iindex)

				const pair = new Socket(registration.wiz, iindex)
				postMessage({
					socketNumber: iindex,
					readable: pair.readable,
					writable: pair.writable,
					peer: {
						ip: peerIP,
						port: peerPort
					}
				}, [ pair.readable, pair.writable ])
			}

			await registration.wiz.writeSocketSocketInterrupt(iindex, {
				sendOk: true,
				timeout: true,
				receive: true,
				disconnect: true,
				connect: true
			})
		}


	}

	await delayMs(1000 * 2)

	console.log('Enqueue Microtask')
	queueMicrotask(pollInterruptState)
}


/**
 * @param {USBDevice} device
 */
async function teardown(device) {
	const deviceConfig = matchConfig(device, config)
	if(deviceConfig === undefined) {
		console.log('no configured device match')
		return
	}

	const registration = deviceRegistry.get(deviceConfig.name)
	if(registration === undefined) {
		console.log('no registration for device')
		return
	}

	console.log('teardown for device registration', deviceConfig.name)
	deviceRegistry.delete(deviceConfig.name)

}

navigator.usb.addEventListener('connect', event => {
	console.log('USB Device connect', event)
	const { device } = event
	setup(device)
		.catch(e => console.warn('connect error', e))
})
navigator.usb.addEventListener('disconnect', event => {
	console.log('USB Device disconnect', event)
	const { device } = event
	teardown(device)
		.catch(e => console.warn('disconnect error', e))
})

navigator.usb.getDevices()
	.then(async devices => {
		console.log('Worker Devices')
		for(const device of devices) {
			await setup(device)
		}
	})
	.catch(e => console.warn('get devices error', e))

onmessage = async event => {
	console.log('Interrupt Worker', event.data)



}
