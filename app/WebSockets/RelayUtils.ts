import Event from 'App/Models/Event'
import * as secp256k1 from 'noble-secp256k1'

export interface MetadataInterface {
  name: string
  about: string
  picture: string
}

export enum KindEnum {
  set_metadata = 0,
  text_note = 1,
  recommend_server = 2,
}

export enum ContextEnum {
  reqFeed = 'p',
  subKey = 'n',
  reqEvent = 'r',
  reqKey = 'r',
}

export const sha256 = (m) => secp256k1.utils.sha256(Uint8Array.from(m))

export const serializeEvent = (event: Event) => {
  return JSON.stringify([
    0,
    event.pubkey,
    event['created_at'],
    event.kind,
    event.tags || [],
    event.content,
  ])
}

export const FormatNotice = (message: string) => JSON.stringify(['notice', message])
export const FormatEvent = (event: Event, context: string) =>
  JSON.stringify([event.serialize(), context])

export const GetFeedOffset = (offset: number) => {
  if (!offset || offset < 0) {
    offset = 0
  }
  return offset
}

export const GetFeedLimit = (limit: number) => {
  const hardLimit = 50
  if (!limit || limit <= 0) {
    limit = hardLimit
  }
  return limit
}
