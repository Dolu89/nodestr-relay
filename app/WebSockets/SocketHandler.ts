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
  verifySignature,
} from 'App/WebSockets/RelayUtils'
import { recommendServer, setMetadata } from './EventHandler'
import Database from '@ioc:Adonis/Lucid/Database'

let SUBSCRIPTION: Map<ws, string[]> = new Map()
let SUBSCRIPTION_BACK: Map<string, ws[]> = new Map()

export const handle = async (message: string, ws: ws) => {
  // If it starts with { it's an event to push
  if (message.startsWith('{')) {
    await saveEvent(message, ws)
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
      reqEvent(value, ws)
      break
    case 'req-key':
      reqKey(value, ws)
      break
  }
}

const saveEvent = async (message: string, ws: ws) => {
  const event: Event = JSON.parse(message)

  // Calculate event.id
  let eventHash = await sha256(Buffer.from(serializeEvent(event)))
  const eventId = Buffer.from(eventHash).toString('hex')
  event.id = eventId

  //Verify signature
  if (!(await verifySignature(event))) {
    ws.send(FormatNotice('Invalid signature'))
    return
  }

  if (event.kind === KindEnum.set_metadata) {
    await setMetadata(event)
  } else if (event.kind === KindEnum.text_note) {
    await Event.create(event)
  } else if (event.kind === KindEnum.recommend_server) {
    await recommendServer(event)
  } else {
    // Handle all kinds blindly (eg. NIP04)
    await Event.create(event)
  }

  // Send event all subscribers (including yourself)
  const wssToEmit: ws[] = SUBSCRIPTION_BACK.has(event.pubkey)
    ? SUBSCRIPTION_BACK.get(event.pubkey)!
    : []
  for (const wsToEmit of wssToEmit) {
    wsToEmit.send(FormatEvent(event, ContextEnum.subKey))
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

const reqEvent = async (message: string, ws: ws) => {
  const body: { id: string; limit: number } = JSON.parse(message)
  if (body.id === null) {
    ws.send(FormatNotice('`id` must be provided'))
    return
  }
  let limit = GetFeedLimit(body.limit)

  const event = await Event.query()
    .where('id', body.id)
    .limit(limit)
    .orderBy('createdAt', 'desc')
    .first()

  if (event === null) {
    ws.send(FormatNotice('Event not found'))
    return
  }

  ws.send(FormatEvent(event, ContextEnum.reqEvent))

  const relatedEvents = await Database.rawQuery(
    `
    WITH
    A AS (
      SELECT * ,jsonb_array_elements(tags) AS tag
      FROM events
    )
    SELECT id, pubkey, kind, tags, content, sig, created_at
    FROM A
    WHERE (tag->>0) = 'e'
    AND (tag->>1) = ?
    LIMIT ?;
    `,
    [event.id, limit]
  )

  if (relatedEvents.rows.length > 0) {
    for (const relatedEvent of relatedEvents.rows) {
      ws.send(FormatEvent(relatedEvent, ContextEnum.reqEvent))
    }
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
