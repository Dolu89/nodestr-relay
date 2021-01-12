import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Events extends BaseSchema {
  protected tableName = 'events'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary().index().notNullable()
      table.string('pubkey').notNullable()
      table.integer('kind').notNullable()
      table.jsonb('tags').notNullable()
      table.string('content').notNullable()
      table.string('sig').notNullable()
      table.integer('created_at').notNullable()
      table.index(['pubkey', 'created_at'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
