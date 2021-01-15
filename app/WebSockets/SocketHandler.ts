import ws from 'ws'
import Event from 'App/Models/Event'
import {
  GetFeedLimit,
  GetFeedOffset,
  FormatNotice,
  FormatEvent,
  KindEnum,
  sha256,
  serializeEvent,
  ContextEnum,
} from 'App/WebSockets/RelayUtils'
import { recommendServer, setMetadata } from './EventHandler'

let SUBSCRIPTION: Map<ws, string[]> = new Map()
let SUBSCRIPTION_BACK: Map<string, ws[]> = new Map()

export const handle = (message: string, ws: ws): void => {
  // If it starts with { it's an event to push
  if (message.startsWith('{')) {
    saveEvent(message, ws)
    return
  }

  const [key, value] = message.split(/:(.+)/)
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
      reqKey(value, ws)
      break
  }
}

const saveEvent = async (message: string, ws: ws) => {
  const event: Event = JSON.parse(message)

  if (event.kind === KindEnum.set_metadata) {
    setMetadata(event)
    ws.send(JSON.stringify([event, ContextEnum.subKey]))
  } else if (event.kind === KindEnum.text_note) {
    // Calculate event.id
    let eventHash = await sha256(Buffer.from(serializeEvent(event)))
    const eventId = Buffer.from(eventHash).toString('hex')
    event.id = eventId

    await Event.create(event)
    // Send the new post to all subscribers (except yourself)
    const wssToEmit: ws[] = SUBSCRIPTION_BACK.has(event.pubkey)
      ? SUBSCRIPTION_BACK.get(event.pubkey)!
      : []
    for (const wsToEmit of wssToEmit) {
      wsToEmit.send(JSON.stringify([event, ContextEnum.subKey]))
    }
  } else if (event.kind === KindEnum.recommend_server) {
    await recommendServer(event)
    ws.send(JSON.stringify([event, ContextEnum.subKey]))
  } else {
    ws.send(FormatNotice('Incorrect value : `kind`'))
  }
}

const reqKey = async (message: string, ws: ws) => {
  const body: { key: string; limit: number; offset: number } = JSON.parse(message)
  if (!body.key) {
    ws.send(FormatNotice('`key` must be provided'))
    return
  }
  let limit = GetFeedLimit(body.limit)
  let offset = GetFeedOffset(body.offset)

  const metadataQuery = Event.query()
    .where('pubkey', body.key)
    .where('kind', KindEnum.set_metadata)
    .orderBy('createdAt', 'desc')
    .first()

  const eventsQuery = Event.query()
    .where('pubkey', body.key)
    .whereNot('kind', KindEnum.set_metadata)
    .limit(limit)
    .offset(offset)
    .orderBy('createdAt', 'desc')

  const metadata = await metadataQuery
  if (metadata !== null) {
    ws.send(FormatEvent(metadata, ContextEnum.reqKey))
  }

  const events = await eventsQuery
  if (events !== null) {
    for (const event of events) {
      ws.send(FormatEvent(event, ContextEnum.reqKey))
    }
  }
}

const reqFeed = async (message: string, ws: ws) => {
  const body: { limit: number; offset: number } = JSON.parse(message)
  let limit = GetFeedLimit(body.limit)
  let offset = GetFeedOffset(body.offset)

  const subscribedKeys = SUBSCRIPTION.get(ws)!
  const events = await Event.query()
    .whereIn('pubkey', subscribedKeys)
    .limit(limit)
    .offset(offset)
    .orderBy('createdAt', 'desc')
  for (const event of events) {
    ws.send(JSON.stringify([event.serialize(), ContextEnum.reqFeed]))
  }
}

const subKey = (pubKey: string, ws: ws) => {
  const currentKeys: string[] = SUBSCRIPTION.has(ws) ? SUBSCRIPTION.get(ws)! : []
  if (!currentKeys.find((c) => pubKey === c)) {
    SUBSCRIPTION.set(ws, [...currentKeys, pubKey])
  }

  if (SUBSCRIPTION_BACK.has(pubKey)) {
    const wss = SUBSCRIPTION_BACK.get(pubKey)!
    SUBSCRIPTION_BACK.set(pubKey, [...wss, ws])
  } else {
    SUBSCRIPTION_BACK.set(pubKey, [ws])
  }
}

const unsubKey = (pubKey: string, ws) => {
  const currentKeys: string[] = SUBSCRIPTION.has(ws) ? SUBSCRIPTION.get(ws)! : []
  SUBSCRIPTION.set(ws, [...currentKeys.filter((c) => pubKey !== c)])
  ws.send(pubKey)
}
