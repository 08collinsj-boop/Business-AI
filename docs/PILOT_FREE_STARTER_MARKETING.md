# Free Starter + AI Marketing - Pilot only
* The deployed Pilot code was backed up at commit `e17d9a2` to `pilot-backup-20261010-before-free-access`.
* Database snapshot in private schema `pilot_backup_20261010` of Business-AI-Dev preserves billing, entitlements, usage, Marketing drafts, automation and the previous reservation function.
* The accompanying SQL migration targets **Business-AI-Dev only** and creates its flag disabled by default. NEVER run or enable in Production.
* Deploy this code to the existing `business-ai-pilot` Vercel project only. Enable `PILOT_FREE_STARTER_MARKETING=true` **in that project only**, and enable `public.pilot_free_access_config.enabled=true` in the separate Pilot database.
* During the Pilot, every existing and newly created business has virtual Starter access with 250 AI enquiries and two staff seats per UTC month, and AI Marketing with 100 drafts per UTC month. The existing 10-per-day Marketing limit and anti-abuse controls remain active.
* Stripe TEST subscriptions, webhook records and payment methods are NOT modified, stopped or cancelled. Billing and add-on purchase endpoints are blocked while the free Pilot feature is on.
* To roll back, disable `PILOT_FREE_STARTER_MARKETING` and the database flag. Historical Stripe state remains in place. To restore the prior SQL function, use the definition in `pilot_backup_20261010.marketing_reservation_function`.
* Marketing approval, publication, tenancy checks, and incident controls remain enforced. Enabling free access does not enable automated posting.
