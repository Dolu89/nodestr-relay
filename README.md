# Nodestr Relay - A [nostr](https://github.com/fiatjaf/nostr) implementation in Node.js

⚠️ Nodestr is still in development

---

Please refer to the official [NIPs](https://github.com/fiatjaf/nostr/tree/master/nips) repo

- [x] NIP 01
	 - [x] sub-key
	 - [x] unsub-key
	 - [x] req-feed
	 - [x] req-event
	 - [x] req-key
	 - [x] event (publish)
    	 - [x] set_metadata
    	 - [x] text_note
    	 - [x] recommend_server
- [ ] NIP 02
- [ ] NIP 03

--- 

## How to install
1. Clone & install
``` bash
git clone https://github.com/Dolu89/nodestr-relay.git
cd nodestr-relay
yarn
node ace generate:key
```
2. Create .env file
```
PORT=3333
HOST=0.0.0.0
NODE_ENV=development
APP_KEY=YourSecretKey  # result of 'node ace generate:key'
DB_CONNECTION=pg
PG_HOST=localhost
PG_PORT=5432
PG_USER=admin
PG_PASSWORD=admin
PG_DB_NAME=nostr
``` 
3. DB migration
```
node ace migration:run
```
4. Launch
``` bash
yarn dev
```
5. Profit!

`ws://localhost:3333/ws`
