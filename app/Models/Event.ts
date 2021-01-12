import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Event extends BaseModel {
  public static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  public id: string

  @column()
  public pubkey: string

  @column()
  public kind: number

  @column({
    serialize: (value?) => {
      return Array.from(value)
    },
  })
  public tags: string

  @column()
  public content: string

  @column()
  public sig: string

  @column()
  public createdAt: number
}
