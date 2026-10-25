-- À coller dans Supabase → projet brain-max → SQL Editor → Run, UNE fois (25/10/2026). Copie de la migration
-- supabase/migrations/20261025150000_abonnes_releves_chaque_jour.sql de max-os : la question de validation du
-- connecteur Supabase ne t'arrive pas depuis la session cloud.

-- 25/10/2026 : les abonnés des comptes TikTok et YouTube se relèvent seuls, chaque jour, et mesurent les objectifs
-- « abonnés » des plans. Avant : social_accounts.followers était NULL sur les 10 comptes (le watcher du Mac ne le
-- remplissait jamais), les 3 objectifs abonnés étaient « saisie à la main » et Maxence n'a pas accès aux chiffres
-- TikTok ; le point de départ du 25/10 a dû être relevé à la main par Claude. Maxence : « oui corrige la synchro des
-- abonnés ».

-- 1. L'historique : un relevé par compte et par passage, pour voir la progression (et l'écart au point de départ).
create table if not exists public.social_followers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.social_accounts(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  platform text,
  followers integer not null,
  checked_at timestamptz not null default now()
);
create index if not exists social_followers_compte_date on public.social_followers (account_id, checked_at desc);
alter table public.social_followers enable row level security;
drop policy if exists sf_read on public.social_followers;
create policy sf_read on public.social_followers for select using (public.is_team_member());

-- 2. Deux mesures de plus : les abonnés du business à la fin de la fenêtre (le dernier relevé avant p_fin, ou le
--    dernier tout court si la fenêtre n'est pas finie). Un total, pas un gain : les cibles des plans sont des totaux
--    (« 25 → 250 abonnés »).
create or replace function public.mesure_fenetre(p_mesure text, p_business uuid, p_debut timestamp with time zone, p_fin timestamp with time zone)
 returns numeric
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v numeric;
begin
  case p_mesure
    when 'appels' then
      select count(*) into v from crm_activities a
       where a.business_id = p_business and a.type = 'call'
         and coalesce(a.occurred_at, a.created_at) >= p_debut and coalesce(a.occurred_at, a.created_at) < p_fin;
    when 'mails' then
      select count(*) into v from crm_activities a
       where a.business_id = p_business and a.type = 'email'
         and coalesce(a.occurred_at, a.created_at) >= p_debut and coalesce(a.occurred_at, a.created_at) < p_fin;
    when 'rdv' then
      select count(*) into v from crm_activities a
       where a.business_id = p_business and a.issue = 'rdv'
         and coalesce(a.occurred_at, a.created_at) >= p_debut and coalesce(a.occurred_at, a.created_at) < p_fin;
    when 'devis' then
      select count(*) into v from crm_quotes q
       where q.business_id = p_business and q.sent_at >= p_debut and q.sent_at < p_fin;
    when 'devis_signes' then
      select count(*) into v from crm_quotes q
       where q.business_id = p_business
         and coalesce(q.signed_at, q.accepted_at) >= p_debut and coalesce(q.signed_at, q.accepted_at) < p_fin;
    when 'clients_signes' then   -- pas de date de passage d'étape : les clients signés à ce jour
      select count(*) into v from crm_contacts c where c.business_id = p_business and c.stage = 'signe';
    when 'contacts_crees' then
      select count(*) into v from crm_contacts c
       where c.business_id = p_business and c.created_at >= p_debut and c.created_at < p_fin;
    when 'posts_publies' then
      select count(*) into v from social_posts s
       where s.business_id = p_business and s.posted_at >= p_debut and s.posted_at < p_fin;
    when 'videos_publiees' then
      select count(*) into v from social_posts s
       where s.business_id = p_business and s.posted_at >= p_debut and s.posted_at < p_fin and s.url like '%/video/%';
    when 'carrousels_publies' then
      select count(*) into v from social_posts s
       where s.business_id = p_business and s.posted_at >= p_debut and s.posted_at < p_fin and s.url like '%/photo/%';
    when 'commandes' then
      select coalesce(sum(d.orders), 0) into v from sales_daily d
       where d.business_id = p_business
         and d.day >= (p_debut at time zone 'Europe/Paris')::date and d.day < (p_fin at time zone 'Europe/Paris')::date;
    when 'abonnes_tiktok', 'abonnes_youtube' then
      -- Somme des comptes du business sur la plateforme, chacun à son dernier relevé avant la fin de la fenêtre.
      -- Aucun relevé : NULL (« non mesuré »), jamais 0.
      select sum(dernier.followers) into v from (
        select distinct on (f.account_id) f.followers
          from social_followers f
         where f.business_id = p_business and f.platform = replace(p_mesure, 'abonnes_', '') and f.checked_at < p_fin
         order by f.account_id, f.checked_at desc) dernier;
    else
      v := null;
  end case;
  return v;
end $function$;

create or replace function public.source_mesure(p_mesure text)
 returns text
 language sql
 immutable
as $function$
  select case p_mesure
    when 'cases' then 'cases cochées'
    when 'etapes' then 'cases cochées'
    when 'manuel' then 'saisie à la main'
    when 'appels' then 'journal d''appels du CRM'
    when 'mails' then 'mails enregistrés dans le CRM'
    when 'rdv' then 'appels conclus par un RDV (CRM)'
    when 'devis' then 'devis envoyés (CRM)'
    when 'devis_signes' then 'devis signés (CRM)'
    when 'clients_signes' then 'contacts à l''étape « signé » (CRM)'
    when 'contacts_crees' then 'contacts créés (CRM)'
    when 'posts_publies' then 'synchro des comptes'
    when 'videos_publiees' then 'synchro TikTok, vidéos'
    when 'carrousels_publies' then 'synchro TikTok, carrousels'
    when 'commandes' then 'Shopify'
    when 'abonnes_tiktok' then 'page publique TikTok, relevé chaque jour'
    when 'abonnes_youtube' then 'page publique YouTube, relevé chaque jour'
  end
$function$;

-- 3. Les 3 objectifs abonnés des plans (Maxwel IA, YouTube Faceless) passent de la saisie à la main au relevé.
update public.plan_objectifs set mesure = 'abonnes_tiktok' where mesure = 'manuel' and cle in ('abonnes', 'abonnes_tiktok');
update public.plan_objectifs set mesure = 'abonnes_youtube' where mesure = 'manuel' and cle = 'abonnes_youtube';

-- 4. Le relevé quotidien, à 6 h 13 UTC (après la nuit, avant la journée de Maxence).
select cron.unschedule('abonnes-quotidien') where exists (select 1 from cron.job where jobname = 'abonnes-quotidien');
select cron.schedule('abonnes-quotidien', '13 6 * * *', $cron$
  select net.http_post(
    url := 'https://lgvtjqtytwyovllsqbgv.supabase.co/functions/v1/social-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key'),
      'x-kairos-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'kairos_secret')
    ),
    body := jsonb_build_object('action', 'abonnes'),
    timeout_milliseconds := 120000
  );
$cron$);
