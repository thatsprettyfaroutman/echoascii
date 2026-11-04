// Preloaded into every CLI run in the tests: any network access crashes it.
// Socket#connect covers net, tls, http, https and http2 at once.
const dgram = require('dgram')
const dns = require('dns')
const net = require('net')

const block = (object, key, name) => {
  object[key] = () => {
    throw new Error(`echoascii tried to use the network (${name})`)
  }
}

block(globalThis, 'fetch', 'fetch')
block(net.Socket.prototype, 'connect', 'socket connect')
block(dns, 'lookup', 'dns lookup')
block(dns.promises, 'lookup', 'dns lookup')
block(dgram, 'createSocket', 'udp socket')
