import { cmd } from "./cmd"
import { runOmaCodeCli } from "@/omacode/cli"

export const OmaCodeCommand = cmd({
  command: "omacode [action] [target..]",
  describe: "run OmaCode Actor-Auditor dual-agent engine with CLM & JEPA world model",
  builder: (yargs) =>
    yargs
      .positional("action", {
        type: "string",
        describe: "action to run (run, audit, clm-rank, jepa-eval, info)",
        default: "info"
      })
      .positional("target", {
        type: "string",
        array: true,
        describe: "task prompt or target arguments"
      }),
  handler: async (argv) => {
    const action = (argv.action as string) || "info"
    const target = Array.isArray(argv.target) ? (argv.target as string[]).join(" ") : ""
    await runOmaCodeCli([action, target].filter(Boolean))
  }
})
