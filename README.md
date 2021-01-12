# Nodestr Relay - A [nostr](https://github.com/fiatjaf/nostr) implementation in Node.js

⚠️ Nodestr is still in development

---

Please refer to the official [NIPs](https://github.com/fiatjaf/nostr/tree/master/nips) repo

- [ ] NIP 01
	 - [x] sub-key
	 - [x] unsub-key
	 - [x] req-feed
	 - [ ] req-event
	 - [ ] req-key
	 - [ ] event (publish) **WIP**
- [ ] NIP 02
- [ ] NIP 03

--- 

## How to install
1. Clone & install
``` bash
git clone https://github.com/Dolu89/nodestr-relay.git
cd nodestr-relay
yarn
```
2. Create .env file
```
PORT=3333
HOST=0.0.0.0
NODE_ENV=development
APP_KEY=YourSecretKey
DB_CONNECTION=pg
PG_HOST=localhost
PG_PORT=5432
PG_USER=admin
PG_PASSWORD=admin
PG_DB_NAME=nostr
``` 
3. Launch
``` bash
yarn dev
```
4. Profit!

`ws://localhost:3333/ws`