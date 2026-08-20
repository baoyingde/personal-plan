// Polyfill structuredClone for jsdom
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
}

import 'fake-indexeddb/auto'
