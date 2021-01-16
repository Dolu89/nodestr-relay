import ws from 'App/WebSockets/CustomWs'
import Server from '@ioc:Adonis/Core/Server'
import { handle } from 'App/WebSockets/SocketHandler'

/**
 * Pass AdonisJS http server instance to ws.
 */
const wss = new ws.Server({ server: Server.instance! })

function noop() {}

wss.on('connection', (ws: ws) => {
  ws.isAlive = true
  ws.on('pong', () => (ws.isAlive = true))

  ws.on('message', async (message: string) => {
    // log the received message and send it back to the client
    await handle(message, ws)
  })
})

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws: ws) {
    if (ws.isAlive === false) return ws.terminate()
    ws.isAlive = false
    ws.ping(noop())
  })
}, 30000)

wss.on('close', function close() {
  clearInterval(interval)
})
