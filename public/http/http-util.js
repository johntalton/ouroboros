

export const SPACE = 0x20
export const CR = 0x0D
export const LF = 0x0A
export const HTAB = 0x09

/**
 * @param {number} c
 */
export function isAlpha(c) {
	return((c >= 0x41) && (c <= 0x5A)) || ((c >= 0x61) && (c <= 0x7A))
}

/**
 * @param {number} c
 */
export function isDigit(c) {
	return (c >= 0x30) && (c <= 0x39)
}

/**
 * @param {number} c
 */
export function isVChar(c) {
	return (c >= 0x21) && (c <= 0x7E)
}

const TCHAR_SYMBOLS = [
		'!', '#', '$', '%', '&', '\'', '*', '+', '-', '.',
		 '^', '_', '`', '|', '~'
	].map(c => c.codePointAt(0))

/**
 * @param {number} c
 */
export function isTokenChar(c) {
	if(isAlpha(c)) { return true }
	if(isDigit(c)) { return true }

	return TCHAR_SYMBOLS.includes(c)
}


/**
 * @overload
 * @param {ArrayBufferLike} buffer
 * @returns {buffer is ArrayBuffer}
 */
/**
 * @overload
 * @param {ArrayBufferView<ArrayBufferLike>} buffer
 * @returns {buffer is ArrayBufferView<ArrayBuffer>}
 */
/**
 * @overload
 * @param {ArrayBufferLike | ArrayBufferView<ArrayBufferLike>} buffer
 * @returns {buffer is ArrayBuffer|ArrayBufferView<ArrayBuffer>}
 */
/**
 * @param {ArrayBufferLike|ArrayBufferView} buffer
 * @returns {buffer is ArrayBuffer|ArrayBufferView<ArrayBuffer>}
 */
export function isNonSharedArrayBuffer(buffer) {
	if(typeof SharedArrayBuffer === 'undefined') { return true }

	if(ArrayBuffer.isView(buffer)) {
		return !(buffer.buffer instanceof SharedArrayBuffer)
	}

	return !(buffer instanceof SharedArrayBuffer)
}
