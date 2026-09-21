'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { UserCapabilities } from '@/lib/entitlements/capabilities';
import type { ActiveTrainingProgramContext } from '@/lib/training/active-program';
import type { Profile } from '@/lib/profile-service';
import { resolveTrainingProgramAccess } from '@/lib/training/training-program-access';
import { editorDays, programSessionCount, programSource } from '@/lib/training/program-editor';
import { mutateProgram } from '@/lib/training/program-mutation';
import { readActiveWorkoutDraft } from '@/lib/training/active-workout-draft';
import { downloadBlankTemplate, exportProgramToXlsx, parseProgramFromXlsx } from '@/lib/program-excel';
import { useAiQuota } from '@/app/hooks/useAiQuota';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { resolveAiQuotaBadgeState } from '../ui/AiQuotaBadge';
import { RailOverlay } from '../ui/RailOverlay';
import FollowupPreferences from './FollowupPreferences';
import FollowupPanel from './FollowupPanel';
import styles from './TrainingProgramManager.module.css';

const ProgramBuilder = dynamic(() => import('./ProgramBuilder'), {
  ssr: false,
});
type Program = {
  id: string;
  name: string;
  days: any[];
  is_active: boolean;
  source?: string;
  archived_at?: string | null;
  [key: string]: any;
};
interface Props {
  supabase: SupabaseClient;
  session: Session | null;
  profile?: Profile | null;
  capabilities: UserCapabilities;
  activeProgramContext: ActiveTrainingProgramContext;
  onRefresh: (force?: boolean) => Promise<void>;
  onClose: () => void;
  embedded?: boolean;
}

export default function TrainingProgramManager({
  supabase,
  session,
  profile,
  capabilities,
  activeProgramContext,
  onRefresh,
  onClose,
  embedded = false,
}: Props) {
  const t = useTranslations('accountPrograms.training.management');
  const tx = useTranslations('programWorkspace');
  const locale = useLocale();
  const quota = useAiQuota();
  const access = resolveTrainingProgramAccess({
    capabilities,
    activeProgramContext,
    quotaState: resolveAiQuotaBadgeState(quota),
  });
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [builder, setBuilder] = useState<{ program: Program | null } | null>(null);
  const [library, setLibrary] = useState(false);
  const [imported, setImported] = useState<any>(null);
  const [importName, setImportName] = useState('');
  const [expanded, setExpanded] = useState<string | null | undefined>(undefined);
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const retry = useRef<{ body: string; id: string } | null>(null);
  const userId = session?.user.id || '';
  useFocusTrap({
    active: !embedded && !builder,
    containerRef: ref,
    initialFocusRef: closeRef,
    onEscape: onClose,
  });
  async function load() {
    const [p, v] = await Promise.all([
      supabase
        .from('custom_programs')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      supabase
        .from('training_program_changes')
        .select('id,program_id,action,created_at,previous_program')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    if (p.error || v.error) {
      setState('error');
      return;
    }
    setPrograms((p.data || []) as Program[]);
    setVersions(v.data || []);
    setState('ready');
  }
  useEffect(() => {
    void load();
  }, [supabase, userId]);
  const active = programs.find((p) => p.is_active);
  function workoutOpen() {
    return typeof window !== 'undefined' && Boolean(readActiveWorkoutDraft(localStorage, userId));
  }
  function openEditor(program: Program | null) {
    if (!access.canConfigure || busy) return;
    if (workoutOpen()) {
      toast.error(tx('finishWorkout'));
      return;
    }
    setBuilder({ program });
  }
  async function act(input: Record<string, unknown>) {
    if (busy || !access.canConfigure) return;
    if (workoutOpen()) {
      toast.error(tx('finishWorkout'));
      return;
    }
    setBusy(true);
    try {
      await mutateProgram(input, retry);
      setImported(null);
      await load();
      await onRefresh(true);
      toast.success(tx('saved'));
    } catch (error) {
      toast.error(tx(error instanceof Error && error.message==='PROGRAM_INVALID' ? 'invalid' : 'conflict'));
    } finally {
      setBusy(false);
    }
  }
  function activate(program: Program) {
    if (!window.confirm(tx('replaceConfirm', { name: program.name }))) return;
    void act({
      action: 'activate',
      programId: program.id,
      expected: program,
      activeProgramId: active?.id ?? null,
    });
  }
  async function importFile(file: File) {
    const result = await parseProgramFromXlsx(file);
    if (!result.success || !result.program) {
      toast.error(t('importValidationError'));
      return;
    }
    setImported(result.program);
    setImportName(result.program.name);
    if (result.skippedSheets?.length) toast.info(t('importSkipped', { count: result.skippedSheets.length }));
  }
  function card(program: Program) {
    const isOpen = expanded === undefined ? program.is_active : expanded === program.id;
    return (
      <article key={program.id} className={styles.programCard}>
        <button
          type="button"
          className={styles.programHeader}
          aria-expanded={isOpen}
          onClick={() => setExpanded(isOpen ? null : program.id)}
        >
          <span>
            <strong>{program.name}</strong>
            <small>
              {tx('sessionCount', {
                count: programSessionCount(program.days || []),
              })}{' '}
              · {t(programSource(program.source))}
            </small>
          </span>
          <span className={styles.status}>
            {program.is_active ? tx('current') : program.archived_at ? tx('archived') : tx('draft')}
          </span>
        </button>
        {isOpen && (
          <div className={styles.programBody}>
            <div className={styles.programActions}>
              {!program.archived_at && (
                <button
                  type="button"
                  disabled={busy || !access.canConfigure}
                  onClick={() => openEditor(program)}
                >
                  {tx('adjust')}
                </button>
              )}
              {!program.is_active && !program.archived_at && (
                <button
                  type="button"
                  disabled={busy || !access.canConfigure}
                  onClick={() => activate(program)}
                >
                  {tx('start')}
                </button>
              )}
              {program.archived_at && (
                <button
                  type="button"
                  disabled={busy || !access.canConfigure}
                  onClick={() =>
                    void act({
                      action: 'restore',
                      programId: program.id,
                      expected: program,
                    })
                  }
                >
                  {tx('unarchive')}
                </button>
              )}
            </div>
            <div className={styles.days}>
              {editorDays(program.days || []).map((day, index) => (
                <details key={index}>
                  <summary>
                    {new Intl.DateTimeFormat(locale, {
                      weekday: 'long',
                      timeZone: 'UTC',
                    }).format(new Date(Date.UTC(2024, 0, 1 + index)))}{' '}
                    — {day.is_rest ? tx('rest') : day.name || tx('session')}
                  </summary>
                  {!day.is_rest && (
                    <ul>
                      {day.exercises?.map((ex: any, i: number) => (
                        <li key={i}>{ex.name || ex.custom_name || ex.exercise_name}</li>
                      ))}
                    </ul>
                  )}
                  {day.is_rest && day.exercises?.length > 0 && <p>{tx('parked')}</p>}
                </details>
              ))}
            </div>
            <details className={styles.tools}>
              <summary>{tx('advanced')}</summary>
              <button type="button" onClick={() => exportProgramToXlsx(program)}>
                {t('export')}
              </button>
              {!program.is_active && !program.archived_at && (
                <button
                  type="button"
                  disabled={busy || !access.canConfigure}
                  onClick={() =>
                    void act({
                      action: 'archive',
                      programId: program.id,
                      expected: program,
                    })
                  }
                >
                  {tx('archive')}
                </button>
              )}
              {versions
                .filter(
                  (v) =>
                    v.program_id === program.id &&
                    v.previous_program &&
                    ['save', 'restore'].includes(v.action),
                )
                .map((v) => (
                  <div key={v.id} className={styles.version}>
                    <span>
                      {tx('version')} · {new Date(v.created_at).toLocaleString(locale)}
                    </span>
                    <button
                      type="button"
                      disabled={busy || !access.canConfigure || Boolean(program.archived_at)}
                      onClick={() => {
                        if (window.confirm(tx('restoreConfirm')))
                          void act({
                            action: 'restore',
                            programId: program.id,
                            expected: program,
                            versionId: v.id,
                          });
                      }}
                    >
                      {tx('restore')}
                    </button>
                  </div>
                ))}
            </details>
          </div>
        )}
      </article>
    );
  }
  const content = (
    <section
      ref={ref}
      className={embedded ? styles.embedded : styles.overlay}
      role={embedded ? undefined : 'dialog'}
      aria-modal={embedded ? undefined : true}
      aria-labelledby="training-manager-title"
      aria-busy={busy}
    >
      <header className={styles.header}>
        <div>
          <h2 id="training-manager-title">{tx('title')}</h2>
          <p>{tx('subtitle')}</p>
        </div>
        {!embedded && (
          <button ref={closeRef} onClick={onClose} aria-label={tx('close')}>
            ×
          </button>
        )}
      </header>
      {!access.canConfigure && (
        <p role="status" className={styles.blocked}>
          {t(access.isCoachManaged ? 'coachBlocked' : 'mutationBlocked')}
        </p>
      )}
      {state === 'loading' && <p role="status">{t('loading')}</p>}
      {state === 'error' && (
        <p role="alert">
          {t('listError')} <button onClick={() => void load()}>{tx('retry')}</button>
        </p>
      )}
      {state === 'ready' && (
        <>
          {active ? card(active) : <p>{tx('noActive')}</p>}
          <div className={styles.primaryActions}>
            <button type="button" disabled={busy || !access.canConfigure} onClick={() => openEditor(null)}>
              {tx('prepare')}
            </button>
            <button type="button" aria-expanded={library} onClick={() => setLibrary(!library)}>
              {tx('library')}
            </button>
          </div>
          {library && <div className={styles.list}>{programs.filter((p) => !p.is_active).map(card)}</div>}
          {activeProgramContext.source === 'personal' && (
            <details className={styles.tools}>
              <summary>{tx('followup')}</summary>
              <FollowupPreferences />
              <FollowupPanel programId={activeProgramContext.programId} hasActiveDraft={workoutOpen()} />
            </details>
          )}
          <details className={styles.tools}>
            <summary>{tx('tools')}</summary>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className={styles.hiddenInput}
              aria-label={t('import')}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importFile(file);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={!access.canConfigure || busy}
              onClick={() => fileRef.current?.click()}
            >
              {t('import')}
            </button>
            <button type="button" onClick={downloadBlankTemplate}>
              {t('template')}
            </button>
            {imported && (
              <div>
                <label>
                  {t('programName')}
                  <input value={importName} onChange={(e) => setImportName(e.target.value)} />
                </label>
                <p>{tx('draftOnly')}</p>
                <button
                  disabled={busy || !importName.trim()}
                  onClick={() =>
                    void act({
                      action: 'save',
                      programId: null,
                      expected: null,
                      candidate: {
                        name: importName,
                        days: imported.days,
                        description: imported.description,
                        source: 'import',
                        total_weeks: imported.total_weeks,
                        phases: imported.phases,
                      },
                    })
                  }
                >
                  {tx('saveDraft')}
                </button>
                <button onClick={() => setImported(null)}>{t('cancel')}</button>
              </div>
            )}
          </details>
        </>
      )}
      {builder && (
        <ProgramBuilder
          supabase={supabase}
          session={session}
          profile={profile}
          canMutate={access.canConfigure}
          aiAllowed={access.canGenerateWithAI}
          onAiQuotaChange={quota.refresh}
          editProgram={builder.program}
          onSave={() => {
            quota.refresh();
            void load();
            void onRefresh(true);
          }}
          onClose={() => setBuilder(null)}
        />
      )}
    </section>
  );
  return embedded ? content : <RailOverlay>{content}</RailOverlay>;
}
