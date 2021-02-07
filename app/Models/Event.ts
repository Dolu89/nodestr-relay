import { BaseModel, beforeSave, column } from '@ioc:Adonis/Lucid/Orm'

export default class Event extends BaseModel {
  public static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  public id: string

  @column()
  public pubkey: string

  @column()
  public kind: number

  @column()
  public tags: string

  @column()
  public content: string

  @column()
  public sig: string

  @column()
  public createdAt: number

  @beforeSave()
  public static async stringifyTags(event: Event) {
    event.tags = JSON.stringify(event.tags)
  }
}
