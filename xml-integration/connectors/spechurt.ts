/**
 * xml-integration/connectors/spechurt.ts
 *
 * Parser for Spechurt XML feed.
 *
 * Access: feed requires IP whitelisting by Spechurt (production server IP
 * 51.83.134.183 is whitelisted). The download key is read from SPECHURT_KEY (.env).
 *
 * NEXT STEP: parser not yet implemented — a real HEAVY sample downloads fine now,
 * complete parse() to map <produkt> nodes to NormalizedProduct.
 */

import type { Connector, ConnectorConfig, NormalizedProduct } from '../types'

export const spechurtConfig: ConnectorConfig = {
  name: 'spechurt',
  xml_url: `https://b2b.spechurt.pl/xml_heavy_export.php?key=${process.env.SPECHURT_KEY ?? ''}`,
  auth_type: 'query_param',  // key= is in the URL
  charset: 'utf-8',          // to be confirmed once accessible
}

export const spechurtConnector: Connector = {
  config: spechurtConfig,
  parse(_xml: string): NormalizedProduct[] {
    throw new Error(
      'Spechurt connector is not yet implemented. ' +
      'IP must be whitelisted first. See xml-integration/connectors/spechurt.ts',
    )
  },
}
