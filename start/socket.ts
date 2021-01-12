import ws from 'ws'
import Server from '@ioc:Adonis/Core/Server'
import { handle } from 'App/WebSockets/SocketHandler'

/**
 * Pass AdonisJS http server instance to ws.
 */
const wss: ws.Server = new ws.Server({ server: Server.instance! })
wss.on('connection', (ws: ws) => {
  ws.on('message', (message: string) => {
    // log the received message and send it back to the client
    handle(message, ws)
  })
})
