# Ouroboros

Pure Javascript Web Server that runs Inside the Browser.

- all code is 1st party / no 3rd party libraries are used
- all code is pure javascript / no WASM or browser plugins

## Operation

Using WebUSB to connect the FTDI FT232H bridge chip, the hosted page creates an SPIBus interface to a connected Wiz5500 ethernet chip.

This allows the browser to directly access a Physical Socket, and perform listen/accept of incoming connection requests.

Using the HTTP-Util library, it pareses and response to standard web requests.

Can be attached to use the File System API to provide file hosting.


Software Stack:
- [WebUSB](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API)
- [FT232H](https://github.com/johntaltn/ftdi)
- [SPIBus](https://github.com/johntalton/and-other-delights)
- [Wiz5500](https://github.com/johntalton/wiz5500)
- [HTTP-Util](https://github.com/http-util)
- [File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)


Physical parts (Adafruit):
- [Wiz5500](https://www.adafruit.com/product/6348)
- [FT232H](https://www.adafruit.com/product/2264)

## Why

Sort Answer: 🤷🏻‍♂️ 'cause

Long Answer:
  The browser provide a unique environment that has been hardened over the years.  And, engines like Chrome's V8, are the backbone to many server side runtimes (think nodejs etc).

  This provides a unique opportunity to leverage the engine and the "platforms" capabilities in a restrictive configuration (many runtimes have started introducing permission models on the server side for this reason).

  this also provide a rigorous runtime the can be used to dog-food isomorphic libraries (like http-util and the wiz5500 driver).

  Lastly, providing the browser with a direct / physical ethernet connect is unique and novel.  While other connection models exist (think P2P / VoIP etc) they do not directly allow the browser to "listen" for connections.  Other technologies, like QUIC / HTTP3, allow for accepting new "connections" over a multiplexed stream, however, this still requires establishing the initial outbound connection and is not a general solution.

## Limitation

The modern web platform has a wide capability set, but the restricted environment provides some challenges.

Most notably, a default browser instance heavily throttles Javascript runtime.  Further, web request require heavy processing / parsing, this provide a workload withing the browser not normally exercised by traditional web pages.

