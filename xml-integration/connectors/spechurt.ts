/**
 * xml-integration/connectors/spechurt.ts
 *
 * Parser for Spechurt XML feed.
 *
 * Status: BLOCKED — feed requires IP whitelisting.
 * Our IP (83.25.13.208) must be whitelisted by Spechurt before we can access it.
 * URL: https://b2b.spechurt.pl/xml_heavy_export.php?key=7e77a720d1d9eefce296983de6c0eb00
 *
 * Error received: "[ ERR105 ] - Błędny klucz API lub adres IP"
 *
 * NEXT STEP: Contact Spechurt to whitelist the production server IP.
 * Once accessible, download a sample and complete this parser.
 *
 * The parser skeleton is here so the connector can be wired up
 * as soon as the IP is whitelisted.
 */

import type { Connector, ConnectorConfig, NormalizedProduct } from '../types'

export const spechurtConfig: ConnectorConfig = {
  name: 'spechurt',
  xml_url: 'https://b2b.spechurt.pl/xml_heavy_export.php?key=7e77a720d1d9eefce296983de6c0eb00',
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
