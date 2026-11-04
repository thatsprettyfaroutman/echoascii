// Preloaded into every CLI run in the tests: any network access crashes it.
// Socket#connect covers net, tls, http, https and http2 at once.
import dgram from 'dgram'
import dns from 'dns'
import net from 'net'

const block = (object: object, key: string, name: string) => {
  Object.defineProperty(object, key, {
    value: () => {
      throw new Error(`echoascii tried to use the network (${name})`)
    },
  })
}

block(globalThis, 'fetch', 'fetch')
block(net.Socket.prototype, 'connect', 'socket connect')
block(dns, 'lookup', 'dns lookup')
block(dns.promises, 'lookup', 'dns lookup')
block(dgram, 'createSocket', 'udp socket')
