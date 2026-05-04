import { groq } from 'next-sanity'

export const homePageQuery = groq`*[_type == "homePage"][0] {
  heroTagline1,
  heroTagline2,
  hudLabel,
  aboutText,
  heroVideo
}`

export const servicesQuery = groq`*[_type == "service"] | order(order asc) {
  _id,
  id,
  label,
  title,
  desc,
  tags,
  image,
  order
}`

export const distributionChannelsQuery = groq`*[_type == "distributionChannel"] | order(order asc) {
  _id,
  tag,
  title,
  desc,
  order
}`

export const oNasPageQuery = groq`*[_type == "oNasPage"][0] {
  introText,
  missionTitle,
  missionDesc,
  missionItems[] {
    title,
    desc
  },
  certCards[] {
    tag,
    title,
    desc
  },
  fundamentyItems[] {
    title,
    desc
  }
}`

export const uslugiPageQuery = groq`*[_type == "uslugiPage"][0] {
  introText,
  competencies[] {
    id,
    tab,
    title,
    desc,
    tags,
    cta,
    image
  }
}`

export const wspolpracaPageQuery = groq`*[_type == "wspolpracaPage"][0] {
  introText,
  secondText,
  fundamenty[] {
    id,
    title,
    desc
  },
  korzysciTabs[] {
    label,
    id,
    title,
    desc
  },
  ethicsItems[] {
    title,
    desc
  }
}`

export const siteSettingsQuery = groq`*[_type == "siteSettings"][0] {
  companyName,
  nip,
  regon,
  koncesja,
  emailRD,
  emailB2G,
  emailHandel,
  emailBiuro,
  facebookUrl,
  instagramUrl,
  lat,
  lng
}`

export const navigationQuery = groq`*[_type == "navigation"][0] {
  links[] {
    href,
    label
  }
}`
