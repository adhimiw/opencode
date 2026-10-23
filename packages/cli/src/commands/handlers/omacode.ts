import { Effect, Option } from "effect"
import { Commands } from "../commands"
import { Runtime } from "../../framework/runtime"
import { runOmaCodeCli } from "../omacode/cli"

const handler = Effect.fn("cli.omacode")(function* (input: Runtime.Input<typeof Commands.commands.omacode>) {
  const action = Option.getOrUndefined(input.action) ?? "info"
  const target = Option.getOrUndefined(input.target) ?? ""
  yield* Effect.tryPromise(async () => {
    await runOmaCodeCli([action, target].filter(Boolean))
  }).pipe(
    Effect.catch((error) =>
      Effect.sync(() => {
        console.error(error)
        process.exitCode = 1
      }),
    ),
  )
})

export default Runtime.handler(Commands.commands.omacode, handler)
