// Backstop for bugs that would otherwise stall the Node event loop and
// leave the container accepting TCP but never responding.
declare global {
  var __MEMOS_handlers_registered: boolean | undefined
}

if (!globalThis.__MEMOS_handlers_registered) {
  globalThis.__MEMOS_handlers_registered = true

  process.on('uncaughtException', (err) => {
    console.error('uncaughtException', err)
  })

  process.on('unhandledRejection', (reason: unknown) => {
    console.error('unhandledRejection', reason)
  })
}

export {}
