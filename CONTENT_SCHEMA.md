# Amjad CMS content schema

Schema version: 1. UTF-8 JSON. Stable IDs use lowercase Latin letters, numbers, and hyphens. Every collection has `_meta.collection`, `schema_version`, monotonically increasing `revision`, and `updated_at`.

## Common record fields

- `id`: immutable stable identifier.
- `translations.ar|fr|en`: language-specific plain text. Arabic is authoritative; public clients may fall back to Arabic when another language is empty.
- `status`: `draft`, `published`, or `archived`.
- `image_id`: reference to the media collection.
- `created_at`, `updated_at`, and internal `revision`.
- Draft and archived records never appear in public projections.

### Stable identifier namespaces

- Pages: `hero`, `president`, `contact`, plus future explicit page IDs.
- Frontend sections: existing DOM anchors such as `islamic-tools`, `programs-structure`, `smart-eco-school`, and `news-grid`; these are inventory references, not translated text.
- Program families: `education` and `social`.
- Projects/program records: the record `id`; `detail_view_id` deliberately maps a record to an existing detail view such as `academy`, `school`, `warmth`, `iftar`, or `zakat`.
- News: the record `id`, reconciled with existing article/modal links during Milestone 2.
- Images: media record `id`; physical filenames are implementation details and can change on replacement.
- Gallery items: gallery record `id`, linked to a page/gallery by `page_ref`.

## Collections

| Collection | Translation fields | Specific fields |
|---|---|---|
| `programs` | title, summary, body, cta_text | family_id (`education`/`social`), detail_view_id, order |
| `news` | title, summary, body | category, published_at, order |
| `gallery` | caption, alt | page_ref, order |
| `pages` | depends on singleton | settings |
| `media` | caption, alt | path, thumbnail_path, MIME, dimensions; private record also keeps size/replacement history |
| `sections` | text | page, group, binding_key, binding_kind, optional URL |
| `products` | title, summary, availability_label | kind, product_code, price, currency, sizes, colors, available |
| `memory` | title, summary, body, caption, source_label | content_type, source_url, event_date, page_ref |

Required Arabic fields are `title` and `summary` for programs/news, and `caption` plus `alt` for gallery. Other translations and long body fields are optional. Contact values and statistics remain empty until an authorized administrator enters approved information.

## Current frontend inventory and future mapping

The static frontend remains authoritative in Milestone 1. This inventory prevents the six historical programs and three historical news entries from being mistaken for a complete site dataset.

| Frontend area | Current stable anchors/structure | Planned CMS source |
|---|---|---|
| Home | hero, introduction, featured programs/news, president speech, newsletter | `pages:hero`, selected `programs`/`news`, `pages:president`; newsletter is not managed by this milestone |
| Islamic gateway | `islamic-tools`, `prayer-times`, `zakat-calculator` | functional tools remain frontend code; only future surrounding editorial copy may become a page section |
| Programs | families `education` and `social`; detail views `academy`, `school`, `warmth`, `iftar`, `zakat`; planned project cards; `smart-eco-school` | `programs.family_id`, stable program IDs, and `detail_view_id`; the Eco-School interactive model remains frontend code |
| News | grid/search/categories and modal details `news1` through `news7` | `news` records with stable IDs, category, summary, body, image, and real publication date |
| Gallery / Skhirat memory | image-led memories and page galleries | `gallery.page_ref` plus `media`; exact frontend placement is deferred |
| About | institutional presentation, values, objectives, organization content | future page-section records; not silently inferred from historical JSON |
| President | approved identity, role, message, vision, mission | singleton `pages:president` |
| Contact | official coordinates, opening hours, map, social links and contact form | singleton `pages:contact`; form delivery is outside content storage |
| Services/forms | volunteering, membership, zakat and donation interactions | operational forms remain frontend code; submissions are not stored in the CMS |
| Shop | product search/filter and support order form | unchanged static/interactive frontend; commerce content is outside Milestone 1 |

All future records must receive explicit stable IDs during migration. Existing hash anchors and article links must be mapped deliberately; translated display titles must never become identifiers.

### Singleton pages

- `hero`: title, subtitle, cta_text, text_block; CTA link and numeric impact statistics.
- `president`: name, role, organization, motto, message, vision, mission.
- `contact`: address and opening_hours; phone, emails, map, and social URLs.

## Public boundary

`data/cms/*.json` is generated from published records and an explicit per-collection field allowlist. Audit metadata, original upload names, old file paths, credentials, throttling data, and draft content remain private. Milestone 2 consumes these projections through `js/cms-connector.js` without rewriting live files from the backoffice.

If a requested `fr` or `en` value is empty, the frontend displays Arabic, then preserves its static fallback. Component IDs and binding rules are documented in `CMS_FRONTEND_MAPPING.md`; fallbacks are never written back into storage.
