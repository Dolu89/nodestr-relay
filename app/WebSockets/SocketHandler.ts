import ws from 'ws'
import Event from 'App/Models/Event'
import * as secp256k1 from 'noble-secp256k1'

export const handle = (message: string, ws: ws): void => {
  // If it starts with { it's an event to push
  if (message.startsWith('{')) {
    saveEvent(message)
    return
  }

  const [key, value] = message.split(':')
  switch (key) {
    case 'sub-key':
      subKey(value, ws)
      break
    case 'unsub-key':
      unsubKey(value, ws)
      break
    case 'req-feed':
      reqFeed(value, ws)
      break
    case 'req-event':
      // TODO
      break
    case 'req-key':
      // TODO
      break
  }
}

const saveEvent = async (message: string) => {
  const event: Event = JSON.parse(message)

  // Calculate event.id
  let eventHash = await sha256(Buffer.from(serializeEvent(event)))
  const eventId = Buffer.from(eventHash).toString('hex')
  event.id = eventId

  await Event.create(event)

  // Send the new post to all subscribers
  const wsToEmit: ws[] = subscriptionBack.get(event.pubkey)!
  for (const ws of wsToEmit) {
    ws.send(JSON.stringify([event, 'n']))
  }
}

const reqFeed = async (message: string, ws: ws) => {
  const body: { limit: number; offset: number } = JSON.parse(message)
  let limit = 50
  let offset = body.offset

  if (body.limit <= 0 || body.limit > 100) {
    limit = body.limit
  }

  if (!body.offset || body.offset < 0) {
    offset = 0
  } else if (body.offset > 500) {
    throw new Error('offset over 500')
  }

  const subscribedKeys = subscription.get(ws)!
  const events = await Event.query()
    .whereIn('pubkey', subscribedKeys)
    .limit(limit)
    .offset(offset)
    .orderBy('createdAt', 'desc')
  for (const event of events) {
    ws.send(JSON.stringify([event.serialize(), 'p']))
  }
}

let subscription: Map<ws, string[]> = new Map()
let subscriptionBack: Map<string, ws[]> = new Map()

const subKey = (pubKey: string, ws: ws) => {
  console.log('SUB KEY')
  const currentKeys: string[] = subscription.has(ws) ? subscription.get(ws)! : []
  if (!currentKeys.find((c) => pubKey === c)) {
    subscription.set(ws, [...currentKeys, pubKey])
  }

  if (subscriptionBack.has(pubKey)) {
    const wss = subscriptionBack.get(pubKey)!
    subscriptionBack.set(pubKey, [...wss, ws])
  } else {
    subscriptionBack.set(pubKey, [ws])
  }
  ws.send(pubKey)
}

const unsubKey = (pubKey: string, ws) => {
  console.log('UNSUB KEY')

  const currentKeys: string[] = subscription.has(ws) ? subscription.get(ws)! : []
  subscription.set(ws, [...currentKeys.filter((c) => pubKey !== c)])
  ws.send(pubKey)
}

/* Utils */
const sha256 = (m) => secp256k1.utils.sha256(Uint8Array.from(m))

const serializeEvent = (event: Event) => {
  return JSON.stringify([
    0,
    event.pubkey,
    event['created_at'],
    event.kind,
    event.tags || [],
    event.content,
  ])
}
