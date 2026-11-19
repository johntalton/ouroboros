import {
	Conditional,
	ContentType,
	ETag,
	Forwarded,
	Range,
	FORWARDED_KEY_FOR,
	HTTP_HEADER_CONTENT_LENGTH,
	HTTP_HEADER_CONTENT_TYPE,
	HTTP_HEADER_FORWARDED,
	HTTP_HEADER_IF_MATCH,
	HTTP_HEADER_IF_MODIFIED_SINCE,
	HTTP_HEADER_IF_NONE_MATCH,
	HTTP_HEADER_IF_RANGE,
	HTTP_HEADER_IF_UNMODIFIED_SINCE,
	HTTP_HEADER_MAX_FORWARDS,
	HTTP_HEADER_RANGE,
	HTTP_HEADER_PREFER,
	Preferences,
	HTTP_HEADER_SEC_FETCH_SITE,
	HTTP_HEADER_SEC_FETCH_MODE,
	HTTP_HEADER_SEC_FETCH_DEST,
	HTTP_HEADER_SEC_FETCH_USER,
	SecFetch,
	HTTP_HEADER_ACCEPT,
	HTTP_HEADER_ACCEPT_ENCODING,
	HTTP_HEADER_ACCEPT_LANGUAGE,
	Accept,
	AcceptEncoding,
	AcceptLanguage,
	AvailableDictionary,
	HTTP_HEADER_AVAILABLE_DICTIONARY,
	HTTP_HEADER_DICTIONARY_ID,
	DictionaryID,
	HTTP_HEADER_ACCESS_CONTROL_REQUEST_HEADERS,
	HTTP_HEADER_ACCESS_CONTROL_REQUEST_METHOD,
	AccessControlRequestMethod,
	AccessControlRequestHeaders,
	HTTP_HEADER_SERVICE_WORKER,
	HTTP_HEADER_WANT_REPR_DIGEST,
	HTTP_HEADER_WANT_CONTENT_DIGEST,
	HTTP_HEADER_WANT_UNENCODED_DIGEST,
	HTTP_HEADER_REPR_DIGEST,
	HTTP_HEADER_UNENCODED_DIGEST,
	HTTP_HEADER_CONTENT_DIGEST,
	WantReprDigest,
	WantContentDigest,
	WantUnencodedDigest,
	ReprDigest,
	ContentDigest,
	UnencodedDigest,
	HTTP_HEADER_ORIGIN
} from '@johntalton/http-util/headers'
import { InternetMessageFormatFixDate } from '@johntalton/http-util/util'

/** @import { RequestPreferences } from '@johntalton/http-util/headers' */

export class HTTPHeaders {
	#headers

	/**
	 * @param {Map<string, string|string[]>} headerMap
	 */
	constructor(headerMap) {
		this.#headers = headerMap
	}

	get origin() {
		const origin = this.#headers.get(HTTP_HEADER_ORIGIN)
		if(Array.isArray(origin)) { throw new Error(`${HTTP_HEADER_ORIGIN} array unsupported`) }
		return origin
	}

	get content() {
		const fullContentType =  this.#headers.get(HTTP_HEADER_CONTENT_TYPE)
		const fullContentLength =  this.#headers.get(HTTP_HEADER_CONTENT_LENGTH)

		if(Array.isArray(fullContentType)) { throw new Error(`${HTTP_HEADER_CONTENT_TYPE} array unsupported`) }
		if(Array.isArray(fullContentLength)) { throw new Error(`${HTTP_HEADER_CONTENT_LENGTH} array unsupported`) }

		const type = ContentType.parse(fullContentType)
		const length = Number.parseInt(fullContentLength ?? '', 10)

		 return {
			type,
			length
		 }
	}

	get forwarded() {
		const fullForwarded = this.#headers.get(HTTP_HEADER_FORWARDED)
		const maxForwards = this.#headers.get(HTTP_HEADER_MAX_FORWARDS)

		if(Array.isArray(fullForwarded)) { throw new Error(`${HTTP_HEADER_FORWARDED} array unsupported`) }

		const forwardedList = Forwarded.parse(fullForwarded, FORWARDED_ACCEPTABLE_KEYS)
		const forwarded = Forwarded.selectRightMost(forwardedList, FORWARDED_DROP_RIGHTMOST)
		const forwardedFor = forwarded?.get(FORWARDED_KEY_FOR)
		const forwardedSecret = forwarded?.get(FORWARDED_KEY_SECRET)

		return {
			forwardedList,
			forwarded,
			forwardedFor,
			forwardedSecret
		}
	}

	get conditions() {

		const conditionIfMatch = this.#headers.get(HTTP_HEADER_IF_MATCH)
		const conditionIfNoneMatch = this.#headers.get(HTTP_HEADER_IF_NONE_MATCH)
		const conditionIfModifiedSince = this.#headers.get(HTTP_HEADER_IF_MODIFIED_SINCE)
		const conditionIfUnmodifiedSince = this.#headers.get(HTTP_HEADER_IF_UNMODIFIED_SINCE)
		const conditionIfRange = this.#headers.get(HTTP_HEADER_IF_RANGE)

		if(Array.isArray(conditionIfMatch)) { throw new Error(`${HTTP_HEADER_IF_MATCH} array unsupported`) }
		if(Array.isArray(conditionIfNoneMatch)) { throw new Error(`${HTTP_HEADER_IF_NONE_MATCH} array unsupported`) }
		if(Array.isArray(conditionIfModifiedSince)) { throw new Error(`${HTTP_HEADER_IF_MODIFIED_SINCE} array unsupported`) }
		if(Array.isArray(conditionIfUnmodifiedSince)) { throw new Error(`${HTTP_HEADER_IF_UNMODIFIED_SINCE} array unsupported`) }
		if(Array.isArray(conditionIfRange)) { throw new Error(`${HTTP_HEADER_IF_RANGE} array unsupported`) }

		return {
			match: Conditional.parseEtagList(conditionIfMatch),
			noneMatch: Conditional.parseEtagList(conditionIfNoneMatch),
			modifiedSince: InternetMessageFormatFixDate.parse(conditionIfModifiedSince),
			unmodifiedSince: InternetMessageFormatFixDate.parse(conditionIfUnmodifiedSince),
			range: InternetMessageFormatFixDate.parse(conditionIfRange) ?? ETag.parse(conditionIfRange)
		}
	}

	get range() {
		const rangeHeader = this.#headers.get(HTTP_HEADER_RANGE)

		if(Array.isArray(rangeHeader)) { throw new Error(`${HTTP_HEADER_RANGE} array unsupported`) }

		return Range.parse(rangeHeader)
	}

	get secFetchMetadata() {
			// const secUA = header[HTTP_HEADER_SEC_CH_UA]
		// const secPlatform = header[HTTP_HEADER_SEC_CH_PLATFORM]
		// const secMobile = header[HTTP_HEADER_SEC_CH_MOBILE]
		const secFetchSite = this.#headers.get(HTTP_HEADER_SEC_FETCH_SITE)
		const secFetchMode = this.#headers.get(HTTP_HEADER_SEC_FETCH_MODE)
		const secFetchDest = this.#headers.get(HTTP_HEADER_SEC_FETCH_DEST)
		const secFetchUser = this.#headers.get(HTTP_HEADER_SEC_FETCH_USER)

		if(Array.isArray(secFetchSite)) { throw new Error(`${HTTP_HEADER_SEC_FETCH_SITE} array unsupported`) }
		if(Array.isArray(secFetchMode)) { throw new Error(`${HTTP_HEADER_SEC_FETCH_MODE} array unsupported`) }
		if(Array.isArray(secFetchDest)) { throw new Error(`${HTTP_HEADER_SEC_FETCH_DEST} array unsupported`) }
		if(Array.isArray(secFetchUser)) { throw new Error(`${HTTP_HEADER_SEC_FETCH_USER} array unsupported`) }

		return {
		site: SecFetch.parseSite(secFetchSite),
		mode: SecFetch.parseMode(secFetchMode),
		dest: SecFetch.parseDestination(secFetchDest),
		user: SecFetch.parseUser(secFetchUser)
	}
	}

	/** @returns {RequestPreferences} */
	get preferences() {
		const fullPreferences = this.#headers.get(HTTP_HEADER_PREFER)
		if(Array.isArray(fullPreferences)) { throw new Error(`${HTTP_HEADER_PREFER} array unsupported`) }
		return Preferences.parse(fullPreferences) ?? { preferences: new Map() }
	}

	get accept() {
		const fullAccept = this.#headers.get(HTTP_HEADER_ACCEPT)
		const fullAcceptEncoding = this.#headers.get(HTTP_HEADER_ACCEPT_ENCODING)
		const fullAcceptLanguage = this.#headers.get(HTTP_HEADER_ACCEPT_LANGUAGE)

		const availableDictionaryHeader = this.#headers.get(HTTP_HEADER_AVAILABLE_DICTIONARY)
		const dictionaryIdHeader = this.#headers.get(HTTP_HEADER_DICTIONARY_ID)

		if(Array.isArray(fullAccept)) { throw new Error(`${HTTP_HEADER_ACCEPT} array unsupported`) }
		if(Array.isArray(fullAcceptEncoding)) { throw new Error(`${HTTP_HEADER_ACCEPT_ENCODING} array unsupported`) }
		if(Array.isArray(fullAcceptLanguage)) { throw new Error(`${HTTP_HEADER_ACCEPT_LANGUAGE} array unsupported`) }
		if(Array.isArray(availableDictionaryHeader)) { throw new Error(`${HTTP_HEADER_AVAILABLE_DICTIONARY} array unsupported`) }
		if(Array.isArray(dictionaryIdHeader)) { throw new Error(`${HTTP_HEADER_DICTIONARY_ID} array unsupported`) }

		const acceptItem = Accept.parse(fullAccept)
		const acceptEncodingItem = AcceptEncoding.parse(fullAcceptEncoding)
		const acceptLanguageItem = AcceptLanguage.parse(fullAcceptLanguage)
		const availableDictionary = AvailableDictionary.parse(availableDictionaryHeader)
		const dictionaryId = DictionaryID.parse(dictionaryIdHeader)

		return {
			parsed: {
				type: acceptItem,
				encoding: acceptEncodingItem,
				language: acceptLanguageItem,

				availableDictionary,
			},

			get availableDictionary() { return AvailableDictionary.encode(availableDictionary) },
			dictionaryId,

			select: {
				type: acceptableTypes => Accept.selectItemFrom(acceptItem, acceptableTypes ?? DEFAULT_SUPPORTED_MIME_TYPES),
				encoding: acceptableEncodings => AcceptEncoding.selectItemFrom(acceptEncodingItem, acceptableEncodings ?? DEFAULT_SUPPORTED_ENCODINGS),
				language: acceptableLanguages => AcceptLanguage.selectItemFrom(acceptLanguageItem, acceptableLanguages ?? DEFAULT_SUPPORTED_LANGUAGES)
			}
		}

	}

	get client() {

	}

	get accessControlRequest() {
		const fullAccessControlRequestHeaders = this.#headers.get(HTTP_HEADER_ACCESS_CONTROL_REQUEST_HEADERS)
		const fullAccessControlRequestMethod = this.#headers.get(HTTP_HEADER_ACCESS_CONTROL_REQUEST_METHOD)

		if(Array.isArray(fullAccessControlRequestHeaders)) { throw new Error(`${HTTP_HEADER_ACCESS_CONTROL_REQUEST_HEADERS} array unsupported`) }
		if(Array.isArray(fullAccessControlRequestMethod)) { throw new Error(`${HTTP_HEADER_ACCESS_CONTROL_REQUEST_METHOD} array unsupported`) }

		return {
			method: AccessControlRequestMethod.parse(fullAccessControlRequestMethod),
			headers: AccessControlRequestHeaders.parse(fullAccessControlRequestHeaders)
		}
	}

	get serviceWorker() {
		const serviceWorker = this.#headers.get(HTTP_HEADER_SERVICE_WORKER)
		return this.#headers.get(HTTP_HEADER_SERVICE_WORKER)
	}

	get digestInfo() {

			// Digest
		const wantReprDigest = this.#headers.get(HTTP_HEADER_WANT_REPR_DIGEST)
		const wantContentDigest = this.#headers.get(HTTP_HEADER_WANT_CONTENT_DIGEST)
		const wantUnencodedDigest = this.#headers.get(HTTP_HEADER_WANT_UNENCODED_DIGEST)
		const reprDigest = this.#headers.get(HTTP_HEADER_REPR_DIGEST)
		const contentDigest = this.#headers.get(HTTP_HEADER_CONTENT_DIGEST)
		const unencodedDigest = this.#headers.get(HTTP_HEADER_UNENCODED_DIGEST)

		if(Array.isArray(wantReprDigest)) { throw new Error(`${HTTP_HEADER_WANT_REPR_DIGEST} array unsupported`) }
		if(Array.isArray(wantContentDigest)) { throw new Error(`${HTTP_HEADER_WANT_CONTENT_DIGEST} array unsupported`) }
		if(Array.isArray(wantUnencodedDigest)) { throw new Error(`${HTTP_HEADER_WANT_UNENCODED_DIGEST} array unsupported`) }
		if(Array.isArray(reprDigest)) { throw new Error(`${HTTP_HEADER_REPR_DIGEST} array unsupported`) }
		if(Array.isArray(contentDigest)) { throw new Error(`${HTTP_HEADER_CONTENT_DIGEST} array unsupported`) }
		if(Array.isArray(unencodedDigest)) { throw new Error(`${HTTP_HEADER_UNENCODED_DIGEST} array unsupported`) }

		const wantRepr = WantReprDigest.parse(wantReprDigest)
		const wantContent = WantContentDigest.parse(wantContentDigest)
		const wantUnencoded = WantUnencodedDigest.parse(wantUnencodedDigest)

		return {
			want: {
				repr: wantRepr,
				content: wantContent,
				unencoded: wantUnencoded
			},

			repr: ReprDigest.parse(reprDigest),
			content: ContentDigest.parse(contentDigest),
			unencoded: UnencodedDigest.parse(unencodedDigest),

			select: {
				repr: supportedAlgorithms => WantReprDigest.selectItemsFrom(wantRepr, supportedAlgorithms),
				content: supportedAlgorithms => WantContentDigest.selectItemsFrom(wantContent, supportedAlgorithms),
				unencoded: supportedAlgorithms => WantUnencodedDigest.selectItemsFrom(wantUnencoded, supportedAlgorithms)
			}
		}
	}

}
