import { program } from "commander";
import { startWatchServer } from "./watch-server.js";

program
  .name("differ")
  .description("Architecture monitoring — watch how your system evolves")
  .version("0.3.0");

program
  .command("watch")
  .description("Watch source files and show live structural activity")
  .option("-b, --base <ref>", "git base ref for diff", "origin/main")
  .option("-p, --port <port>", "port to serve on", "3141")
  .option("--debounce <ms>", "debounce delay in ms", "1500")
  .option("--fresh", "start a fresh session")
  .action((opts) => {
    startWatchServer({
      base: opts.base,
      port: parseInt(opts.port),
      debounceMs: parseInt(opts.debounce),
      fresh: opts.fresh || false,
    });
  });

program.parse();
