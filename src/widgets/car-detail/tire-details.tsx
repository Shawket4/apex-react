import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpFromLine, ChevronRight, TriangleAlert } from 'lucide-react';
import { wheelLabel } from '@/entities/maintenance/lib';
import type { TireEvent, TirePastMount, TirePosition } from '@/entities/maintenance/schemas';
import { formatNumber } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { maintDate } from '@/widgets/maintenance/maint-date';

const DASH = '—';

/** A garage word (status, reason, origin, event) in the reader's language;
 * one this build has never heard of is shown as it came. */
function useWord() {
  const { t } = useTranslation();
  return (group: string, value: string | null) =>
    value ? t(`maintenance.${group}.${value}`, { defaultValue: value }) : DASH;
}

function Km({ value }: { value: number | null }) {
  const { t } = useTranslation();
  if (value === null) return <>{DASH}</>;
  return (
    <span className="tabular-nums">
      {formatNumber(value)} {t('common.unit.km')}
    </span>
  );
}

/** Label / value rows; a value of null or '' is left out, not dashed. */
function Facts({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (shown.length === 0) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[11rem_1fr]">
      {shown.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words font-medium">{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t pt-3">
      <h5 className="text-xs font-semibold text-muted-foreground">{title}</h5>
      {children}
    </div>
  );
}

function PastMount({ mount }: { mount: TirePastMount }) {
  const { t, i18n } = useTranslation();
  const word = useWord();
  return (
    <li className="space-y-0.5 rounded-md bg-muted/40 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 font-medium">
        <span>
          {mount.plate ?? DASH}
          {mount.position_code && (
            <>
              {' · '}
              <bdi dir="ltr">{mount.position_code}</bdi>
            </>
          )}
        </span>
        {mount.km_run !== null && (
          <span className="text-muted-foreground">
            {t('maintenance.tires.kmRun')}: <Km value={mount.km_run} />
          </span>
        )}
      </div>
      <div className="text-muted-foreground">
        {t('maintenance.tires.fittedOn', { date: maintDate(mount.mounted_at, i18n.language) })}
        {mount.mounted_odometer !== null && (
          <>
            {' · '}
            <Km value={mount.mounted_odometer} />
          </>
        )}
        {mount.mount_reason && ` · ${word('mountReason', mount.mount_reason)}`}
      </div>
      <div className="text-muted-foreground">
        {t('maintenance.tires.removedOn', { date: maintDate(mount.dismounted_at, i18n.language) })}
        {mount.dismounted_odometer !== null && (
          <>
            {' · '}
            <Km value={mount.dismounted_odometer} />
          </>
        )}
        {mount.dismount_reason && ` · ${word('dismountReason', mount.dismount_reason)}`}
      </div>
    </li>
  );
}

function Event({ event }: { event: TireEvent }) {
  const { t, i18n } = useTranslation();
  const word = useWord();
  return (
    <li className="space-y-0.5 rounded-md bg-muted/40 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 font-medium">
        <span>{word('tireEvent', event.event_type)}</span>
        <span className="text-muted-foreground">{maintDate(event.occurred_at, i18n.language)}</span>
      </div>
      {(event.from_status || event.to_status) && (
        <div className="text-muted-foreground">
          {t('maintenance.tires.statusChange', {
            from: word('tireStatus', event.from_status),
            to: word('tireStatus', event.to_status),
          })}
        </div>
      )}
      {event.notes && (
        <p dir="auto" className="whitespace-pre-wrap text-muted-foreground">
          {event.notes}
        </p>
      )}
    </li>
  );
}

/**
 * Everything the garage records about the tire on one wheel: the tire itself
 * (DOT, status, where it came from, retreads, km, notes), this fitting (when,
 * at what km, why, on which work order, km since) and its history (earlier
 * fittings, status changes). The office only reads it.
 */
export function TireDetails({ position }: { position: TirePosition }) {
  const { t, i18n } = useTranslation();
  const word = useWord();
  const label = wheelLabel(position, (key, vars) => t(key, vars ?? {}), i18n.language);
  const code = position.position_code;
  const name = [position.brand, position.model].filter(Boolean).join(' ');
  const empty = position.tire_id === null;

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold">
            {label ?? (code ? <bdi dir="ltr">{code}</bdi> : DASH)}
          </div>
          {label && code && (
            <bdi dir="ltr" className="text-[11px] text-muted-foreground">
              {code}
            </bdi>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {position.is_lifted && (
            <Badge variant="secondary" className="gap-1">
              <ArrowUpFromLine className="h-3 w-3" aria-hidden="true" />
              {t('maintenance.tires.lifted')}
            </Badge>
          )}
          {!empty && position.status && (
            <Badge variant="outline">{word('tireStatus', position.status)}</Badge>
          )}
        </div>
      </div>

      {empty ? (
        <p className="text-sm text-muted-foreground">{t('maintenance.tires.emptyPosition')}</p>
      ) : (
        <>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">
              {name ? <bdi dir="ltr">{name}</bdi> : t('maintenance.tires.unnamed')}
            </div>
            {position.size && (
              <div className="truncate text-sm text-muted-foreground">
                <bdi dir="ltr">{position.size}</bdi>
              </div>
            )}
          </div>

          <Facts
            rows={[
              [
                t('maintenance.tires.dot'),
                position.dot_code && <bdi dir="ltr">{position.dot_code}</bdi>,
              ],
              [
                t('maintenance.tires.origin'),
                position.origin && word('tireOrigin', position.origin),
              ],
              [t('maintenance.tires.km'), <Km key="km" value={position.total_km} />],
              [
                t('maintenance.tires.baseKm'),
                position.base_km !== null && position.base_km > 0 ? (
                  <Km key="base" value={position.base_km} />
                ) : null,
              ],
              [
                t('maintenance.tires.retreadCount'),
                position.retread_count !== null ? (
                  <span className="tabular-nums">{formatNumber(position.retread_count)}</span>
                ) : null,
              ],
              [
                t('maintenance.tires.registered'),
                position.registered_at && maintDate(position.registered_at, i18n.language),
              ],
              [
                t('maintenance.tires.notes'),
                position.notes && (
                  <span dir="auto" className="whitespace-pre-wrap">
                    {position.notes}
                  </span>
                ),
              ],
            ]}
          />
          {position.km_incomplete && (
            <p className="flex items-start gap-1.5 rounded-md border border-dashed border-warning/40 bg-warning/10 px-2.5 py-1.5 text-xs">
              <TriangleAlert
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning"
                aria-hidden="true"
              />
              {t('maintenance.tires.kmIncomplete')}
            </p>
          )}

          <Block title={t('maintenance.tires.thisFitting')}>
            <Facts
              rows={[
                [
                  t('maintenance.tires.fitted'),
                  position.mounted_at && maintDate(position.mounted_at, i18n.language),
                ],
                [
                  t('maintenance.tires.fittedAtKm'),
                  position.mounted_odometer !== null ? (
                    <Km key="at" value={position.mounted_odometer} />
                  ) : null,
                ],
                [
                  t('maintenance.tires.kmThisMount'),
                  position.km_this_mount !== null ? (
                    <Km key="since" value={position.km_this_mount} />
                  ) : null,
                ],
                [
                  t('maintenance.tires.fitReason'),
                  position.mount_reason && word('mountReason', position.mount_reason),
                ],
                [
                  t('maintenance.tires.workOrder'),
                  position.mounted_work_order_id && (
                    <Link
                      to={`/work-orders/${position.mounted_work_order_id}`}
                      className="inline-flex items-center gap-0.5 text-primary hover:underline"
                    >
                      {t('maintenance.tires.openWorkOrder')}
                      <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
                    </Link>
                  ),
                ],
                [
                  t('maintenance.tires.fitNotes'),
                  position.mount_notes && (
                    <span dir="auto" className="whitespace-pre-wrap">
                      {position.mount_notes}
                    </span>
                  ),
                ],
              ]}
            />
          </Block>

          {position.past_mounts.length > 0 && (
            <Block title={t('maintenance.tires.pastMounts', { n: position.past_mounts.length })}>
              <ul className="space-y-1.5">
                {position.past_mounts.map((mount, i) => (
                  <PastMount key={`${mount.mounted_at ?? ''}-${i}`} mount={mount} />
                ))}
              </ul>
            </Block>
          )}

          {position.events.length > 0 && (
            <Block title={t('maintenance.tires.events')}>
              <ul className="space-y-1.5">
                {position.events.map((event, i) => (
                  <Event key={`${event.occurred_at ?? ''}-${i}`} event={event} />
                ))}
              </ul>
            </Block>
          )}
        </>
      )}
    </div>
  );
}
