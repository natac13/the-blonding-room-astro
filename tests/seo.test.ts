import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const distDir = resolve(import.meta.dirname, '../dist')

function readPage(path: string): string {
  return readFileSync(resolve(distDir, path), 'utf-8')
}

function extractJsonLd(html: string): Record<string, unknown>[] {
  const matches = html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )
  return [...matches].map((m) => JSON.parse(m[1]))
}

function extractMeta(html: string, name: string): string | null {
  const match = html.match(
    new RegExp(`<meta\\s+(?:name|property)=["']${name}["']\\s+content=["']([^"']*)["']`, 'i'),
  ) ?? html.match(
    new RegExp(`<meta\\s+content=["']([^"']*)["']\\s+(?:name|property)=["']${name}["']`, 'i'),
  )
  return match?.[1] ?? null
}

function extractTitle(html: string): string | null {
  return html.match(/<title>(.*?)<\/title>/)?.[1] ?? null
}

describe('Homepage schema (LocalBusiness + HairSalon)', () => {
  const html = readPage('index.html')
  const schemas = extractJsonLd(html)
  const business = schemas.find(
    (s) => Array.isArray(s['@type']) && (s['@type'] as string[]).includes('HairSalon'),
  )

  it('has a LocalBusiness/HairSalon schema', () => {
    expect(business).toBeDefined()
    expect(business!['@type']).toContain('LocalBusiness')
    expect(business!['@type']).toContain('HairSalon')
  })

  it('has required business fields', () => {
    expect(business!.name).toBe('The Blonding Room')
    expect(business!.address).toBeDefined()
    expect(business!.telephone).toBeDefined()
  })

  it('has priceRange', () => {
    expect(business!.priceRange).toBe('$$$')
  })

  it('has keywords array', () => {
    const keywords = business!.keywords as string[]
    expect(keywords).toBeInstanceOf(Array)
    expect(keywords.length).toBeGreaterThanOrEqual(5)
    expect(keywords.some((k) => k.includes('london ontario'))).toBe(true)
  })

  it('has hasOfferCatalog with service categories', () => {
    const catalog = business!.hasOfferCatalog as Record<string, unknown>
    expect(catalog).toBeDefined()
    expect(catalog['@type']).toBe('OfferCatalog')

    const categories = catalog.itemListElement as Record<string, unknown>[]
    expect(categories.length).toBeGreaterThanOrEqual(3)

    const names = categories.map((c) => c.name)
    expect(names).toContain('Blonding')
    expect(names).toContain('Colouring')
    expect(names).toContain('Haircuts & Styling')
  })

  it('has areaServed with at least 8 entries', () => {
    const areas = business!.areaServed as Record<string, unknown>[]
    expect(areas.length).toBeGreaterThanOrEqual(8)

    const names = areas.map((a) => a.name)
    expect(names).toContain('London')
    expect(names).toContain('Arva')
    expect(names).toContain('Masonville')
  })
})

describe('/services page meta tags', () => {
  const html = readPage('services/index.html')

  it('has a title with target keywords', () => {
    const title = extractTitle(html)
    expect(title).toBeDefined()
    expect(title!.toLowerCase()).toContain('london')
    expect(title!.toLowerCase()).toContain('ontario')
    expect(title!.toLowerCase()).toMatch(/hair salon|services/)
  })

  it('has a meta description with target keywords', () => {
    const desc = extractMeta(html, 'description')
    expect(desc).toBeDefined()
    expect(desc!.toLowerCase()).toContain('london')
    expect(desc!.toLowerCase()).toContain('hair salon')
  })

  it('has a canonical URL', () => {
    expect(html).toMatch(/<link\s+rel="canonical"/)
  })

  it('has Open Graph tags', () => {
    expect(extractMeta(html, 'og:title')).toBeDefined()
    expect(extractMeta(html, 'og:description')).toBeDefined()
  })
})

describe('/services page FAQ schema', () => {
  const html = readPage('services/index.html')
  const schemas = extractJsonLd(html)
  const faqSchema = schemas.find((s) => s['@type'] === 'FAQPage')

  it('has a FAQPage schema', () => {
    expect(faqSchema).toBeDefined()
  })

  it('has at least 5 questions', () => {
    const questions = faqSchema!.mainEntity as Record<string, unknown>[]
    expect(questions.length).toBeGreaterThanOrEqual(5)
  })

  it('each question has a valid structure', () => {
    const questions = faqSchema!.mainEntity as Record<string, unknown>[]
    for (const q of questions) {
      expect(q['@type']).toBe('Question')
      expect(q.name).toBeDefined()
      const answer = q.acceptedAnswer as Record<string, unknown>
      expect(answer['@type']).toBe('Answer')
      expect(answer.text).toBeDefined()
    }
  })
})

describe('Build output', () => {
  it('homepage exists', () => {
    expect(() => readPage('index.html')).not.toThrow()
  })

  it('/services page exists', () => {
    expect(() => readPage('services/index.html')).not.toThrow()
  })

  it('sitemap includes /services', () => {
    const sitemap = readFileSync(resolve(distDir, 'sitemap-0.xml'), 'utf-8')
    expect(sitemap).toContain('theblondingroom.ca/services/')
  })
})
