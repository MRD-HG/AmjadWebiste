# CMS to frontend mapping

The public site reads only `data/cms/*.json`. Static HTML is complete fallback content and remains visible if a projection is missing, malformed, or unreachable. Only records whose public projection contains `status: published` are accepted by the browser connector.

## Stable contracts

| CMS source | Frontend target | Stable contract |
|---|---|---|
| `pages:hero` | Homepage cover and counters | `data-cms-hero`, first three `.counter` elements |
| `pages:president` | Homepage president section | existing `index_president_*` translation keys |
| `pages:contact` | Contact/footer details and official social links | mail/tel links and known official network domains |
| `sections` | Approved editorial/SEO copy | `binding_key` equals an existing `data-translate` key; `page` is a filename or `*` |
| `programs` | Program family cards and detail views | record `id` equals `data-cms-id`; `detail_view_id` maps to `#…-detail` |
| `news` | News cards, filters, search, modal and hash links | record `id` equals `data-cms-id` and detail `#<id>-detail` |
| `products` | Shop cards and order selection | record `id` equals `data-cms-id`; `product_code` is submitted by the form |
| `memory` | Skhirat article/person/place/timeline/gallery containers | `content_type` and `page_ref=skhirat-memory` |
| `gallery` | Homepage or memory gallery | `page_ref=index`, `memory`, or `skhirat-memory` |
| `media` | Images referenced by `image_id` | same-origin paths below `/images/uploads/` only |

Languages resolve active `ar`, `fr`, or `en`, then Arabic, then the unchanged static DOM. Plain text is assigned with `textContent`; links and media paths pass same-origin/HTTPS allowlists. The connector emits `amjad:cmsready`; the language switcher emits `amjad:languagechange`.

## Reconciliation

```powershell
php admin/bin/reconcile-frontend.php --report=artifacts/reconciliation-dry-run.json
```

`--apply` adds frontend-only records as drafts and never overwrites an existing ID. After a human verifies facts, dates, translations, links, and image rights, `--apply --publish-verified` is the explicit operator assertion that newly added records may be published. Existing conflicting records remain untouched and are listed in the report.

Operational form logic, prayer calculations, zakat calculations, search/filter behavior, the Eco-School 3D model, and newsletter/email submission behavior stay in frontend code. The CMS controls only approved explanatory copy.

