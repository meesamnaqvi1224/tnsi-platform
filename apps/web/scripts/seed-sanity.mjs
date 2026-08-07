/**
 * One-off seed: migrate the existing hardcoded Articles + Programs into
 * Sanity so the Studio starts populated. Idempotent — uses deterministic
 * _ids with createOrReplace, so re-running updates rather than duplicates.
 *
 * Run from apps/web:
 *   NEXT_PUBLIC_SANITY_PROJECT_ID=… SANITY_API_WRITE_TOKEN=… node scripts/seed-sanity.mjs
 */
import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const token = process.env.SANITY_API_WRITE_TOKEN;
if (!projectId || !token) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-10-01',
  token,
  useCdn: false,
});

const assetCache = new Map();
async function uploadImage(relPath, alt) {
  if (assetCache.has(relPath)) return assetCache.get(relPath);
  const buf = readFileSync(join(PUBLIC, relPath));
  const asset = await client.assets.upload('image', buf, {
    filename: relPath.split('/').pop(),
  });
  const ref = { _type: 'image', asset: { _type: 'reference', _ref: asset._id }, alt };
  assetCache.set(relPath, ref);
  return ref;
}

const categories = [
  ['neuroscience', 'Neuroscience'],
  ['trauma-recovery', 'Trauma Recovery'],
  ['leadership', 'Leadership'],
  ['practitioner-education', 'Practitioner Education'],
  ['research', 'Research'],
  ['interviews', 'Interviews'],
];

const articles = [
  {
    slug: 'nervous-system-framework',
    title: 'The Nervous System as a Framework for Understanding Human Behaviour',
    excerpt:
      'A long-form introduction to how autonomic state shapes perception, relationships and the capacity for change.',
    category: 'neuroscience',
    readingTime: '14 min read',
    publishedAt: '2026-06-12',
    cover: ['images/articles/post-hero.webp', 'Editorial workspace with an open notebook and books'],
    featured: true,
    body: [
      'For most of the twentieth century, psychology treated the mind as something that happened above the neck. The body was acknowledged, but usually as a consequence of mental processes, not their source.',
      'That framing is changing. Across neuroscience and clinical practice, a quieter revolution has been gathering force: the nervous system is not a background system. It is the operating environment in which all experience — including thought — occurs.',
      'Autonomic state shapes attention, memory, empathy and the stories we tell ourselves. State precedes interpretation more often than we assume — and ignoring it becomes a clinical and organisational liability.',
    ],
  },
  {
    slug: 'polyvagal-theory-in-practice',
    title: 'Polyvagal Theory in Everyday Practice',
    excerpt:
      'Translating Stephen Porges’ framework into language clinicians, coaches and educators can use with confidence.',
    category: 'neuroscience',
    readingTime: '8 min read',
    publishedAt: '2026-06-01',
    cover: ['images/articles/latest-polyvagal.webp', 'Notebook, book, pen and mug on an oak desktop'],
  },
  {
    slug: 'window-of-tolerance',
    title: 'The Window of Tolerance Explained',
    excerpt: 'A clear, evidence-informed guide to dysregulation, hyperarousal and the physiology of overwhelm.',
    category: 'trauma-recovery',
    readingTime: '6 min read',
    publishedAt: '2026-05-20',
    cover: ['images/articles/latest-window-tolerance.webp', 'A quiet reading corner beside a bright window'],
  },
  {
    slug: 'nervous-system-of-leadership',
    title: 'The Physiology of Executive Decision-Making',
    excerpt: 'How autonomic state shapes judgment under pressure and the culture leaders create.',
    category: 'leadership',
    readingTime: '10 min read',
    publishedAt: '2026-05-10',
    cover: ['images/articles/latest-leadership.webp', 'An editorial flat lay of books and a coffee cup'],
  },
  {
    slug: 'neuroception-and-safety',
    title: 'Neuroception and the Science of Safety',
    excerpt:
      'How the nervous system detects threat and safety beneath conscious awareness — and what that means for healing.',
    category: 'research',
    readingTime: '11 min read',
    publishedAt: '2026-04-22',
    cover: ['images/articles/latest-neuroception.webp', 'An open book and tea beneath an arched window'],
  },
  {
    slug: 'somatic-markers-in-therapy',
    title: 'Somatic Markers in Therapeutic Work',
    excerpt: 'Integrating body-based signals into evidence-informed clinical practice without losing rigour.',
    category: 'practitioner-education',
    readingTime: '8 min read',
    publishedAt: '2026-03-30',
    cover: ['images/articles/latest-somatic.webp', 'An editorial desk with books and an open notebook'],
  },
  {
    slug: 'co-regulation',
    title: 'Co-Regulation and Relational Safety',
    excerpt: 'Why connection is a physiological intervention, not merely a therapeutic ideal.',
    category: 'neuroscience',
    readingTime: '7 min read',
    publishedAt: '2026-04-05',
    cover: ['images/resources/card-co-regulation.webp', 'A minimal interior with a linen lounge chair'],
  },
];

const programs = [
  {
    slug: 'life-beyond-trauma',
    title: 'Life Beyond Trauma',
    audience: 'Individuals',
    overview:
      'For ambitious women ready to move beyond survival and reclaim lasting wellbeing — combining neuroscience, trauma recovery and nervous system regulation.',
    format: 'Live group programme',
    duration: 'Ongoing cohorts',
    outcome: 'Regulated nervous system, expanded capacity',
    ctaHref: '/method',
    order: 0,
    hero: ['images/programs/featured-life-beyond-trauma.webp', 'A woman walking a peaceful woodland path'],
  },
  {
    slug: 'practitioner-certification',
    title: 'Practitioner Certification',
    audience: 'Professionals',
    overview:
      'For professionals integrating trauma-informed nervous system education into practice — a certifiable curriculum grounded in clinical research.',
    format: 'Certification curriculum',
    duration: 'One year',
    outcome: 'Certifiable nervous system education',
    ctaHref: '/programs/practitioner-certification',
    order: 1,
    hero: ['images/programs/featured-practitioner.webp', 'A workshop circle in a light-filled studio'],
  },
  {
    slug: 'executive-advisory',
    title: 'Executive Advisory',
    audience: 'Organisations',
    overview:
      'For organisations building healthier leadership and workplace cultures — private advisory addressing the physiology of leadership and sustainable performance.',
    format: 'Private advisory',
    duration: 'Ongoing engagement',
    outcome: 'Healthier leadership culture',
    ctaHref: '/programs/executive-advisory',
    order: 2,
    hero: ['images/programs/featured-executive.webp', 'Women meeting around a table in a bright boardroom'],
  },
];

function blocks(paragraphs) {
  return paragraphs.map((text, i) => ({
    _type: 'block',
    _key: `p${i}`,
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: `s${i}`, text, marks: [] }],
  }));
}

async function run() {
  const tx = client.transaction();

  // Author
  const authorPhoto = await uploadImage(
    'images/shared/caroline-portrait-editorial.webp',
    'Portrait of Caroline Reed',
  );
  tx.createOrReplace({
    _id: 'author.caroline-reed',
    _type: 'author',
    name: 'Caroline Reed',
    slug: { _type: 'slug', current: 'caroline-reed' },
    role: 'Founder & Director',
    photo: authorPhoto,
    bio: 'Nervous system educator, clinical researcher and founder of The Nervous System Institute, with over fifteen years in private practice.',
    featured: true,
  });

  // Categories
  for (const [slug, title] of categories) {
    tx.createOrReplace({
      _id: `category.${slug}`,
      _type: 'category',
      title,
      slug: { _type: 'slug', current: slug },
    });
  }

  // Articles
  for (const a of articles) {
    const cover = await uploadImage(a.cover[0], a.cover[1]);
    tx.createOrReplace({
      _id: `article.${a.slug}`,
      _type: 'article',
      title: a.title,
      slug: { _type: 'slug', current: a.slug },
      excerpt: a.excerpt,
      coverImage: cover,
      category: { _type: 'reference', _ref: `category.${a.category}` },
      author: { _type: 'reference', _ref: 'author.caroline-reed' },
      readingTime: a.readingTime,
      publishedAt: new Date(a.publishedAt).toISOString(),
      featured: Boolean(a.featured),
      ...(a.body ? { body: blocks(a.body) } : {}),
    });
  }

  // Programs
  for (const p of programs) {
    const hero = await uploadImage(p.hero[0], p.hero[1]);
    tx.createOrReplace({
      _id: `program.${p.slug}`,
      _type: 'program',
      title: p.title,
      slug: { _type: 'slug', current: p.slug },
      audience: p.audience,
      overview: p.overview,
      heroImage: hero,
      format: p.format,
      duration: p.duration,
      outcome: p.outcome,
      ctaLabel: 'Explore',
      ctaHref: p.ctaHref,
      order: p.order,
      status: 'published',
    });
  }

  const res = await tx.commit();
  console.log(`Seeded ${res.results.length} documents.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
