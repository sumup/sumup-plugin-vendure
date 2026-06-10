import "reflect-metadata"

import { bootstrap } from "@vendure/core"

import { config } from "../vendure-config"

bootstrap(config).catch((error) => {
  console.error(error)
  process.exit(1)
})
