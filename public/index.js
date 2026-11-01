import {
	FTDIDevice,
	DEFAULT_FTDI_VENDOR_ID,
	DEFAULT_FT232H_PRODUCT_ID,
	BIT_MODE
} from '@johntalton/ftdi'
import { FTDISPIBus } from '@johntalton/ftdi/spi'
import { Wiz5500 } from '@johntalton/wiz5500'

export const FT232H_USB_FILTER = {
	vendorId: DEFAULT_FTDI_VENDOR_ID,
	productId: DEFAULT_FT232H_PRODUCT_ID
}

/**
 * @param {USBDevice} device
 */
async function initializeDevice(device) {
	await device.open()

	const driver = await FTDIDevice.from(device)
	await driver.setBitMode(BIT_MODE.MPSSE)

	const spi = new FTDISPIBus(driver)
	const wiz = new Wiz5500(spi)
	const chipId = await wiz.readChipVersion()
	console.log('wiz chip id', chipId)

	// await wiz.writeSourceHardwareAddress({ a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 })
	await wiz.writeSourceIPAddress({ dotQuad: '10.0.0.20' })
	await wiz.writeSubnetMaskAddress({ dotQuad: '255.0.0.0' })

	const mac = await wiz.readSourceHardwareAddress()
	console.log('mac', mac)

	const gateway = await wiz.readGatewayAddress()
	console.log('gateway', gateway)

	const sourceIp = await wiz.readSourceIPAddress()
	console.log('sourceIp', sourceIp)

	const subnetMask = await wiz.readSubnetMaskAddress()
	console.log('subnetMask', subnetMask)

	const phy = await wiz.readPHYConfig()
	console.log('phy', phy)

}

function onContentLoaded() {
	//
	navigator.usb.addEventListener('connect', event => {
		console.log('USB Device connect', event)
	})
	navigator.usb.addEventListener('disconnect', event => {
		console.log('USB Device disconnect', event)
	})

	navigator.usb.getDevices()
		.then(async devices => {
			console.log('existing paired device', devices)
			const [ device ] = devices

			await initializeDevice(device)
		})

	const pairURBButton = document.querySelector('button[name="PairUSB"]')
	pairURBButton?.addEventListener('click', event => {
		navigator.usb.requestDevice({ filters: [ FT232H_USB_FILTER ] })
			.then(async device => {
				console.log('Paired Device', device)

				await initializeDevice(device)
			})
	})
}

(document.readyState === 'loading') ?
	document.addEventListener('DOMContentLoaded', onContentLoaded) :
	onContentLoaded()
