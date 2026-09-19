import { siteSettings } from './siteSettings'
import { homePage } from './homePage'
import { service } from './service'
import { distributionChannel } from './distributionChannel'
import { oNasPage } from './oNasPage'
import { uslugiPage } from './uslugiPage'
import { wspolpracaPage } from './wspolpracaPage'
import { navigation } from './navigation'
import { newsPost } from './newsPost'
import { blogPost } from './blogPost'
import { certyfikatyPage } from './certyfikatyPage'
import { shopPage } from './shopPage'
import { shopBannerBlock } from './shop/shopBannerBlock'
import { shopProductPickerBlock } from './shop/shopProductPickerBlock'
import { shopTileGridBlock } from './shop/shopTileGridBlock'
import { shopTextCtaBlock } from './shop/shopTextCtaBlock'
import { shopIconStripBlock } from './shop/shopIconStripBlock'
import { shopFaqBlock } from './shop/shopFaqBlock'
import { shopStatsBlock } from './shop/shopStatsBlock'
import { shopBrandsBlock } from './shop/shopBrandsBlock'
import { shopRichTextBlock } from './shop/shopRichTextBlock'
import { shopAlertBlock } from './shop/shopAlertBlock'

export const schemaTypes = [
  siteSettings,
  homePage,
  service,
  distributionChannel,
  oNasPage,
  uslugiPage,
  wspolpracaPage,
  navigation,
  newsPost,
  blogPost,
  certyfikatyPage,
  // Shop page builder
  shopPage,
  shopBannerBlock,
  shopProductPickerBlock,
  shopTileGridBlock,
  shopTextCtaBlock,
  shopIconStripBlock,
  shopFaqBlock,
  shopStatsBlock,
  shopBrandsBlock,
  shopRichTextBlock,
  shopAlertBlock,
]
