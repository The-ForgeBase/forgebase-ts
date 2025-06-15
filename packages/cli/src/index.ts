#!/usr/bin/env node

import { program } from "commander";
import { databaseCommand } from "./commands/database.js";

program
  .name("forgebase-cli")
  .description("CLI for interacting with Forgebase services")
  .version("0.1.0-alpha.1")
  .addCommand(databaseCommand)
  .parse();
