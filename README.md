# Ouroboros

Pure Javascript Web Server that runs Inside the Browser.

## Operation

Using WebUSB to connect the FTDI FT232H bridge chip, the hosted page creates an SPIBus interface to a connected Wiz5500 ethernet chip.

This allows the browser to directly access a Physical Socket, and perform listen/accept of incoming connection requests.

Using the HTTP-Util library, it pareses and response to standard web requests.

Can be attached to use the File System API to provide file hosting.


- [WebUSB](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API)
- [FT232H](https://github.com/johntaltn/ftdi)
- [SPIBus](https://github.com/johntalton/and-other-delights)
- [Wiz5500](https://github.com/johntalton/wiz5500)
- [HTTP-Util](https://github.com/http-util)
- [File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)

