import { useTranslation } from 'react-i18next';
import { ArrowUpFromLine, TriangleAlert } from 'lucide-react';
import { wheelLabel } from '@/entities/maintenance/lib';
import type { TireEvent, TirePastMount, TirePosition } from '@/entities/maintenance/schemas';
import { formatNumber } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { maintDate } from '@/widgets/maintenance/maint-date';
import { Block, Facts, Km, WorkOrderLink } from './detail-bits';
import { useGarageWord as useWord } from './use-garage-word';

const DASH = '—';

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
                    <WorkOrderLink
                      id={position.mounted_work_order_id}
                      label={t('maintenance.tires.openWorkOrder')}
                    />
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
