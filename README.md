# Test Kit

A npm package written in Typescript to help running e2e tests for NodeJS and Typescript micro-services for distributed architectures.

Main features :

* Tools for tests based on RabbitMQ, Redis, ElasticSearch and MySQL
  * simplified client creation
  * simplified helpers to create/update/read/delete resources
  * simplified functions for _global listing_
  * simplified resoures state reset/dump/restore
  * provides an official client to interact with servers without abstractions (`amqplib`, `ioredis`, `@elastic/elasticsearch`, `mysql2`)
* Read micro services state by fetching standards endpoints
  * `GET /healthz`
    * service health that tells if the service is running
  * `GET /introspection`
    * service introspection, that contains custom advanced details
      * final configuration
      * current state (working, maintenance, waiting for _something_, exiting, ...)
      * pending actions (refreshs, dispose, ...)
      * processing stats
      * common nodejs metrics (event loop, ...)
  * ..._other suggestions would be appreciated_

> **Remark:** by _simplified_, understand that we provide one shot functions with few parameters for most operations during e2e testing
>
> We consider that during testing, we are able to quickly fetch all the data stored by associated provider

## Getting Started

```shell
npm i -D @duwab/test-kit
```

Usage in NodeJS

```javascript
import { RabbtiMQClient } from '@duwab/test-kit'
const client = new RabbitMQClient(credentials);
await client.getAllQueues(options?); // loops every queues to read current stats (messages counts by status ready/unack/total)

const amqplibClient = await client.getOfficialClient(); // returns the official (or most relevant) client for this technology

await client.dump(snapshotFile);
await client.restore(snapshotFile);
```
