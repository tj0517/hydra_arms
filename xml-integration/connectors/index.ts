/**
 * xml-integration/connectors/index.ts
 *
 * Registry of all connectors.
 * Add new connectors here — the engine discovers them from this map.
 */

import { kolbaConnector } from './kolba'
import { shargConnector } from './sharg'
import { spechurtConnector } from './spechurt'
import type { Connector } from '../types'

export const connectors: Record<string, Connector> = {
  kolba: kolbaConnector,
  sharg: shargConnector,
  spechurt: spechurtConnector,
}

export { kolbaConnector, shargConnector, spechurtConnector }
