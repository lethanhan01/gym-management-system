import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import {
  memberService,
  type MemberProgress,
  type TrainerStudentDetail,
} from '@/services/member.service'
import { useAuthStore } from '@/stores/authStore'
import {
  TrainerEmptyState,
  TrainerErrorState,
  TrainerModal,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
} from '@/components/TrainerUI'

export default function ProgressListPage() {
  const { t } = useTranslation('trainer')
  const { id = '' } = useParams()
  const { user } = useAuthStore()
  const [student, setStudent] = useState<TrainerStudentDetail | null>(null)
  const [progress, setProgress] = useState<MemberProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<MemberProgress | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [studentData, progressData] = await Promise.all([
        memberService.getById(id),
        memberService.getProgress(id, { limit: 100 }),
      ])
      setStudent(studentData)
      setProgress(progressData)
    } catch (err) {
      setError(getApiError(err, t('students.progressList.error.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function deleteProgress() {
    if (!deleting) return
    setSubmitting(true)
    setError(null)
    try {
      await memberService.deleteProgress(deleting.progressId)
      setProgress((current) => current.filter((item) => item.progressId !== deleting.progressId))
      setDeleting(null)
    } catch (err) {
      setError(getApiError(err, t('students.progressList.error.deleteFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  function canDelete(item: MemberProgress) {
    return !user?.staffId || item.staffId === user.staffId
  }

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow={t('students.progressList.eyebrow')}
        title={
          student
            ? t('students.progressList.titleWith', { name: student.fullName })
            : t('students.progressList.title')
        }
        actions={
          <>
            <Link
              className="rogym-text-link rogym-text-link--muted"
              to={`/trainer/students/${id}?tab=progress`}
            >
              <ArrowLeft size={15} /> {t('students.progressList.backToDetail')}
            </Link>
            <Link className="rogym-btn rogym-btn--primary" to={`/trainer/students/${id}/progress`}>
              <Plus size={16} /> {t('students.progressList.addNew')}
            </Link>
          </>
        }
      />
      {loading ? (
        <TrainerSkeleton rows={5} />
      ) : error ? (
        <TrainerErrorState message={error} onRetry={load} />
      ) : progress.length === 0 ? (
        <TrainerEmptyState
          title={t('students.progressList.noData')}
          action={
            <Link className="rogym-btn rogym-btn--primary" to={`/trainer/students/${id}/progress`}>
              {t('students.progressList.addFirst')}
            </Link>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider rogym-text-dim">
                <tr>
                  <th className="px-5 py-4">{t('students.progressList.colDate')}</th>
                  <th className="px-5 py-4">{t('students.progressList.colWeight')}</th>
                  <th className="px-5 py-4">{t('students.progressList.colBmi')}</th>
                  <th className="px-5 py-4">{t('students.progressList.colGoal')}</th>
                  <th className="px-5 py-4">{t('students.progressList.colNotes')}</th>
                  <th className="px-5 py-4 text-right">{t('students.progressList.colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {progress.map((item) => (
                  <tr
                    key={item.progressId}
                    className="border-t border-white/5 bg-[var(--rogym-bg-card)]"
                  >
                    <td className="px-5 py-4 text-white">{formatDate(item.recordedAt)}</td>
                    <td className="px-5 py-4 rogym-text-secondary">
                      {item.weight ? `${Number(item.weight).toFixed(1)} kg` : '--'}
                    </td>
                    <td className="px-5 py-4 rogym-text-secondary">
                      {item.bmi ? Number(item.bmi).toFixed(2) : '--'}
                    </td>
                    <td className="px-5 py-4 rogym-text-secondary">
                      {item.goal ?? '--'}
                    </td>
                    <td className="max-w-xs px-5 py-4 rogym-text-dim">
                      {item.notes ?? '--'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {canDelete(item) && (
                        <button
                          type="button"
                          className="rogym-text-link text-red-300"
                          onClick={() => setDeleting(item)}
                        >
                          {t('students.progressList.delete')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 md:hidden">
            {progress.map((item) => (
              <article key={item.progressId} className="rogym-card rogym-card--compact p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{formatDate(item.recordedAt)}</div>
                    <div className="mt-1 text-sm rogym-text-secondary">
                      {item.weight ? `${Number(item.weight).toFixed(1)} kg` : '--'} · BMI{' '}
                      {item.bmi ? Number(item.bmi).toFixed(2) : '--'}
                    </div>
                  </div>
                  {canDelete(item) && (
                    <button
                      type="button"
                      className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                      onClick={() => setDeleting(item)}
                      aria-label={t('students.progressList.deleteModal.ariaDelete')}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className="mt-4 text-sm text-white">
                  {item.goal ?? t('students.progressList.noGoal')}
                </div>
                <p className="mt-2 text-sm rogym-text-dim">
                  {item.notes ?? t('students.progressList.noNotes')}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
      <TrainerModal
        open={Boolean(deleting)}
        title={t('students.progressList.deleteModal.title')}
        onClose={() => setDeleting(null)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setDeleting(null)}
            >
              {t('students.progressList.deleteModal.cancel')}
            </button>
            <button
              type="button"
              className="rogym-btn rogym-btn--danger"
              disabled={submitting}
              onClick={deleteProgress}
            >
              {submitting
                ? t('students.progressList.deleteModal.submitting')
                : t('students.progressList.deleteModal.submit')}
            </button>
          </>
        }
      >
        <p className="text-sm leading-6 rogym-text-secondary">
          {t('students.progressList.deleteModal.confirm', {
            date: formatDate(deleting?.recordedAt),
          })}
        </p>
      </TrainerModal>
    </TrainerPage>
  )
}
