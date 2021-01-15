import Event from 'App/Models/Event'
import { KindEnum, MetadataInterface } from './RelayUtils'

export const setMetadata = async (event: Event) => {
  const eventMetadata: MetadataInterface = JSON.parse(event.content)

  let metadataEvent = await Event.query()
    .where('pubkey', event.pubkey)
    .where('kind', KindEnum.set_metadata)
    .orderBy('createdAt', 'desc')
    .first()

  if (metadataEvent !== null) {
    const currentMetadata: MetadataInterface = JSON.parse(metadataEvent.content)
    metadataEvent.content = JSON.stringify(getNewMetadataObject(currentMetadata, eventMetadata))
    await metadataEvent.save()
  } else {
    await Event.create(event)
  }
}

export const getNewMetadataObject = (
  oldMetadata: MetadataInterface,
  newMetadata: MetadataInterface
) => {
  return {
    about: newMetadata.about ?? oldMetadata.about,
    name: newMetadata.name ?? oldMetadata.name,
    picture: newMetadata.picture ?? oldMetadata.picture,
  }
}
