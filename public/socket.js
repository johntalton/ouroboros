import { SOCKET_COMMANDS } from '@johntalton/wiz5500'

/** @import { Wiz5500, SocketNumber, ReceiveBufferSource, TransmitBufferSource } from '@johntalton/wiz5500' */

/**
 * @param {Wiz5500} wiz
 * @param {SocketNumber} socketNumber
 * @returns {Promise<ReceiveBufferSource|undefined>}
 */
export async function receive(wiz, socketNumber) {
	const receiveSize = await wiz.readSocketRXReceiveSize(socketNumber)
	const receivePointer = await wiz.readSocketRXReadPointer(socketNumber)
	console.log({ receivePointer, receiveSize })

	if(receiveSize <= 0) { return undefined }

	const adjustedSize = Math.min(receiveSize, 64)

	const result = await wiz.readSocketRX(socketNumber, receivePointer, adjustedSize)

	const updatedPointer = receivePointer + adjustedSize
	await wiz.writeSocketRXReadPointer(socketNumber, updatedPointer)
	await wiz.writeSocketCommand(socketNumber, SOCKET_COMMANDS.RECV)

	return result
}

/**
 * @param {Wiz5500} wiz
 * @param {SocketNumber} socketNumber
 * @param {TransmitBufferSource} buffer
 * @returns {Promise<void>}
 */
export async function transmit(wiz, socketNumber, buffer) {
	const freeSize = await wiz.readSocketTXFreeSize(socketNumber)
	const pointer = await wiz.readSocketTXWritePointer(socketNumber)
	// const deviceReadPointer = await wiz.readSocketTXReadPointer(socketNumber)

	// console.log('freeSize', freeSize)
	// console.log('pointer', pointer)
	// console.log('device pointer', deviceReadPointer)
	// console.log('write size', buffer.byteLength)

	await wiz.writeSocketTX(socketNumber, pointer, buffer)

	const updatedPointer = pointer + buffer.byteLength

	await wiz.writeSocketTXWritePointer(socketNumber, updatedPointer)

	// const status = await wiz.readSocketCommand(socketNumber)
	// console.log('command pri to send', status)
	await wiz.writeSocketCommand(socketNumber, SOCKET_COMMANDS.SEND)
}


/**
 * @extends {ReadableStream<ReceiveBufferSource>}
 */
export class SocketReader extends ReadableStream {
	/**
	 * @param {Wiz5500} wiz
	 * @param {SocketNumber} socketNumber
	 * @param {QueuingStrategy|undefined} strategy
	 */
	constructor(wiz, socketNumber, strategy) {
		super({
			type: 'bytes',
			// autoAllocateChunkSize: 0,

			async start(controller) {

			},

			async pull(controller) {
				const result = await receive(wiz, socketNumber)
				if(result === undefined) {
					//controller.error(new Error('undefined receive buffer'))
					controller.close()
					return
				}

				const result8 = ArrayBuffer.isView(result) ?
					new Uint8Array(result.buffer, result.byteOffset, result.byteLength) :
					new Uint8Array(result)

				controller.enqueue(result8)
			},

			cancel(reason) {}

		}, strategy)
	}
}

/**
 * @extends {WritableStream<TransmitBufferSource>}
 */
export class SocketWriter extends WritableStream {
	/**
	 * @param {Wiz5500} wiz
	 * @param {SocketNumber} socketNumber
	 * @param {QueuingStrategy|undefined} strategy
	 */
	constructor(wiz, socketNumber, strategy) {
		super({
			start(controller) {},

			async write(chunk, controller) {
				// console.log('transmit', chunk)
				await transmit(wiz, socketNumber, chunk)
			},

			abort(reason) {},

			async close() {
				console.log('Socket: close write', socketNumber)
				// const status = await wiz.readSocketStatus(socketNumber)
				// console.log('status', status)
				await wiz.writeSocketCommand(socketNumber, SOCKET_COMMANDS.DISCONNECT)
				// await wiz.writeSocketCommand(socketNumber, SOCKET_COMMANDS.CLOSE)
				// const command = await wiz.readSocketCommand(socketNumber)
				// console.log(command)
				// await wiz.writeSocketCommand(socketNumber, SOCKET_COMMANDS.OPEN)
				// await wiz.writeSocketCommand(socketNumber, SOCKET_COMMANDS.LISTEN)

			}
		}, strategy)
	}

}

export class Socket {
	#wiz
	#socketNumber

	#readable
	#writable

	/**
	 * @param {Wiz5500} wiz
	 * @param {SocketNumber} socketNumber
	 */
	constructor(wiz, socketNumber) {
		this.#wiz = wiz
		this.#socketNumber = socketNumber

		this.#readable = new SocketReader(wiz, socketNumber, undefined)
		this.#writable = new SocketWriter(wiz, socketNumber, undefined)
	}

	get readable() { return this.#readable }

	get writable() { return this.#writable}

}