import { useEffect, useState } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  adminCataloguePath,
  isAdminCatalogueResponse,
  type CatalogueClub,
  type CatalogueCourse,
  type CatalogueHole,
  type CatalogueTee,
} from './adminCatalogueApi.ts'
import './AdminCourseCatalogue.css'

type AdminCourseCatalogueProps = {
  onCatalogueChanged: () => void
}

type ClubDraft = {
  name: string
  city: string
  county: string
  postcode: string
  countryCode: string
  latitude: string
  longitude: string
  googleRating: string
  clubType: string
  courseType: string
}

type CourseDraft = {
  name: string
  holes: string
  par: string
  designedBy: string
  yearOpened: string
}

type TeeDraft = {
  teeName: string
  colour: string
  gender: string
  totalYardage: string
  totalMetres: string
  par: string
  courseRating: string
  slopeRating: string
}

type HoleDraft = Omit<CatalogueHole, 'par' | 'strokeIndex' | 'yardage' | 'source'> & {
  par: string
  strokeIndex: string
  yardage: string
}

const EMPTY_CLUB: ClubDraft = {
  name: '', city: '', county: '', postcode: '', countryCode: '', latitude: '',
  longitude: '', googleRating: '', clubType: '', courseType: '',
}
const EMPTY_COURSE: CourseDraft = {
  name: '', holes: '18', par: '', designedBy: '', yearOpened: '',
}
const EMPTY_TEE: TeeDraft = {
  teeName: '', colour: '', gender: '', totalYardage: '', totalMetres: '', par: '',
  courseRating: '', slopeRating: '',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return isRecord(body) && typeof body.error === 'string' ? body.error : fallback
}

function nullableNumber(value: string): number | null {
  return value.trim() === '' ? null : Number(value)
}

function clubDraft(club: CatalogueClub): ClubDraft {
  return {
    name: club.name,
    city: club.city ?? '',
    county: club.county ?? '',
    postcode: club.postcode ?? '',
    countryCode: club.countryCode ?? '',
    latitude: club.latitude?.toString() ?? '',
    longitude: club.longitude?.toString() ?? '',
    googleRating: club.googleRating?.toString() ?? '',
    clubType: club.clubType ?? '',
    courseType: club.courseType ?? '',
  }
}

function courseDraft(course: CatalogueCourse): CourseDraft {
  return {
    name: course.name,
    holes: course.holes?.toString() ?? '',
    par: course.par?.toString() ?? '',
    designedBy: course.designedBy ?? '',
    yearOpened: course.yearOpened ?? '',
  }
}

function teeDraft(tee: CatalogueTee): TeeDraft {
  return {
    teeName: tee.teeName,
    colour: tee.colour ?? '',
    gender: tee.gender ?? '',
    totalYardage: tee.totalYardage?.toString() ?? '',
    totalMetres: tee.totalMetres?.toString() ?? '',
    par: tee.par?.toString() ?? '',
    courseRating: tee.courseRating.toString(),
    slopeRating: tee.slopeRating.toString(),
  }
}

function holesDraft(holes: CatalogueHole[]): HoleDraft[] {
  const byNumber = new Map(holes.map((hole) => [hole.holeNumber, hole]))
  return Array.from({ length: 18 }, (_, index) => {
    const hole = byNumber.get(index + 1)
    return {
      holeNumber: index + 1,
      par: hole?.par.toString() ?? '',
      strokeIndex: hole?.strokeIndex.toString() ?? String(index + 1),
      yardage: hole?.yardage?.toString() ?? '',
    }
  })
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number'
  required?: boolean
  disabled?: boolean
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        type={type}
        step={type === 'number' ? 'any' : undefined}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function ClubFields({ draft, setDraft }: {
  draft: ClubDraft
  setDraft: (draft: ClubDraft) => void
}) {
  return (
    <div className="admin-catalogue-fields">
      <Field label="Club name" value={draft.name} required onChange={(name) => setDraft({ ...draft, name })} />
      <Field label="City" value={draft.city} onChange={(city) => setDraft({ ...draft, city })} />
      <Field label="County" value={draft.county} onChange={(county) => setDraft({ ...draft, county })} />
      <Field label="Postcode" value={draft.postcode} onChange={(postcode) => setDraft({ ...draft, postcode })} />
      <Field label="Country (ENG/SCO/WAL/NIR)" value={draft.countryCode} onChange={(countryCode) => setDraft({ ...draft, countryCode })} />
      <Field label="Club type" value={draft.clubType} onChange={(clubType) => setDraft({ ...draft, clubType })} />
      <Field label="Course type" value={draft.courseType} onChange={(courseType) => setDraft({ ...draft, courseType })} />
      <Field label="Google rating" type="number" value={draft.googleRating} onChange={(googleRating) => setDraft({ ...draft, googleRating })} />
      <Field label="Latitude" type="number" value={draft.latitude} onChange={(latitude) => setDraft({ ...draft, latitude })} />
      <Field label="Longitude" type="number" value={draft.longitude} onChange={(longitude) => setDraft({ ...draft, longitude })} />
    </div>
  )
}

function CourseFields({ draft, setDraft }: {
  draft: CourseDraft
  setDraft: (draft: CourseDraft) => void
}) {
  return (
    <div className="admin-catalogue-fields admin-catalogue-fields-course">
      <Field label="Course name" value={draft.name} required onChange={(name) => setDraft({ ...draft, name })} />
      <Field label="Holes" type="number" value={draft.holes} onChange={(holes) => setDraft({ ...draft, holes })} />
      <Field label="Par" type="number" value={draft.par} onChange={(par) => setDraft({ ...draft, par })} />
      <Field label="Designed by" value={draft.designedBy} onChange={(designedBy) => setDraft({ ...draft, designedBy })} />
      <Field label="Year opened" value={draft.yearOpened} onChange={(yearOpened) => setDraft({ ...draft, yearOpened })} />
    </div>
  )
}

function TeeFields({ draft, setDraft, ratingsLocked = false }: {
  draft: TeeDraft
  setDraft: (draft: TeeDraft) => void
  ratingsLocked?: boolean
}) {
  return (
    <div className="admin-catalogue-fields admin-catalogue-fields-tee">
      <Field label="Tee name" value={draft.teeName} required onChange={(teeName) => setDraft({ ...draft, teeName })} />
      <Field label="Colour" value={draft.colour} onChange={(colour) => setDraft({ ...draft, colour })} />
      <Field label="Gender" value={draft.gender} onChange={(gender) => setDraft({ ...draft, gender })} />
      <Field label="Yardage" type="number" value={draft.totalYardage} onChange={(totalYardage) => setDraft({ ...draft, totalYardage })} />
      <Field label="Metres" type="number" value={draft.totalMetres} onChange={(totalMetres) => setDraft({ ...draft, totalMetres })} />
      <Field label="Par" type="number" value={draft.par} disabled={ratingsLocked} onChange={(par) => setDraft({ ...draft, par })} />
      <Field label="Course rating" type="number" value={draft.courseRating} required disabled={ratingsLocked} onChange={(courseRating) => setDraft({ ...draft, courseRating })} />
      <Field label="Slope rating" type="number" value={draft.slopeRating} required disabled={ratingsLocked} onChange={(slopeRating) => setDraft({ ...draft, slopeRating })} />
    </div>
  )
}

function AdminCourseCatalogue({ onCatalogueChanged }: AdminCourseCatalogueProps) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [clubs, setClubs] = useState<CatalogueClub[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [openClub, setOpenClub] = useState('')
  const [editing, setEditing] = useState('')
  const [clubFormOpen, setClubFormOpen] = useState(false)
  const [clubForm, setClubForm] = useState<ClubDraft>(EMPTY_CLUB)
  const [courseForm, setCourseForm] = useState<CourseDraft>(EMPTY_COURSE)
  const [teeForm, setTeeForm] = useState<TeeDraft>(EMPTY_TEE)
  const [scorecard, setScorecard] = useState<HoleDraft[]>([])

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setIsLoading(true)
      setError('')
      try {
        const response = await authenticatedFetch(adminCataloguePath(search, page), {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(await readError(response, 'We could not load the course catalogue.'))
        const body: unknown = await response.json()
        if (!isAdminCatalogueResponse(body)) throw new Error('The catalogue response was incomplete.')
        setClubs(body.clubs)
        setTotal(body.pagination.total)
        setTotalPages(body.pagination.totalPages)
      } catch (caught: unknown) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setError(caught instanceof Error ? caught.message : 'We could not load the course catalogue.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [search, page, attempt])

  async function mutate(path: string, method: string, body: unknown, success: string) {
    setBusy(path)
    setError('')
    setNotice('')
    try {
      const response = await authenticatedFetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(await readError(response, 'The catalogue could not be updated.'))
      setNotice(success)
      setEditing('')
      setClubFormOpen(false)
      setAttempt((value) => value + 1)
      onCatalogueChanged()
      return true
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'The catalogue could not be updated.')
      return false
    } finally {
      setBusy('')
    }
  }

  function clubPayload(draft: ClubDraft) {
    return {
      ...draft,
      latitude: nullableNumber(draft.latitude),
      longitude: nullableNumber(draft.longitude),
      googleRating: nullableNumber(draft.googleRating),
    }
  }

  function coursePayload(draft: CourseDraft) {
    return { ...draft, holes: nullableNumber(draft.holes), par: nullableNumber(draft.par) }
  }

  function teePayload(draft: TeeDraft) {
    return {
      ...draft,
      totalYardage: nullableNumber(draft.totalYardage),
      totalMetres: nullableNumber(draft.totalMetres),
      par: nullableNumber(draft.par),
      courseRating: Number(draft.courseRating),
      slopeRating: Number(draft.slopeRating),
    }
  }

  async function remove(path: string, label: string) {
    const confirmation = window.prompt(`Type DELETE to permanently remove ${label}.`)
    if (confirmation === null) return
    await mutate(path, 'DELETE', { confirmation }, `${label} removed from the catalogue.`)
  }

  return (
    <section className="admin-panel admin-catalogue" aria-labelledby="admin-catalogue-title">
      <div className="admin-panel-heading admin-catalogue-heading">
        <div>
          <p>Course data</p>
          <h2 id="admin-catalogue-title">Catalogue management</h2>
        </div>
        <span>{total} clubs</span>
      </div>

      <p className="admin-catalogue-intro">
        Search, create and correct clubs, courses, rated tees and hole-by-hole scorecards. Ratings and scorecards become locked once a round uses that tee.
      </p>

      <form className="admin-catalogue-search" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()) }}>
        <label>
          <span>Search clubs, courses or tees</span>
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="e.g. Hallamshire" />
        </label>
        <button type="submit">Search</button>
        <button type="button" className="admin-catalogue-secondary" onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}>Clear</button>
        <button type="button" onClick={() => { setClubForm({ ...EMPTY_CLUB }); setClubFormOpen((value) => !value); setEditing('') }}>Add club</button>
      </form>

      {clubFormOpen ? (
        <form className="admin-catalogue-editor" onSubmit={async (event) => {
          event.preventDefault()
          if (await mutate('/api/admin/catalogue/clubs', 'POST', clubPayload(clubForm), 'Club added to the catalogue.')) setClubForm({ ...EMPTY_CLUB })
        }}>
          <h3>Add a club</h3>
          <ClubFields draft={clubForm} setDraft={setClubForm} />
          <div className="admin-catalogue-actions"><button disabled={Boolean(busy)}>Save club</button><button type="button" className="admin-catalogue-secondary" onClick={() => setClubFormOpen(false)}>Cancel</button></div>
        </form>
      ) : null}

      {error ? <p className="admin-catalogue-feedback admin-catalogue-error" role="alert">{error}</p> : null}
      {notice ? <p className="admin-catalogue-feedback" role="status">{notice}</p> : null}

      {isLoading ? <div className="admin-state" role="status">Loading catalogue…</div> : clubs.length === 0 ? (
        <p className="admin-empty">No catalogue records match this search.</p>
      ) : (
        <div className="admin-catalogue-list">
          {clubs.map((club) => (
            <article className="admin-catalogue-club" key={club.id}>
              <header>
                <button type="button" className="admin-catalogue-toggle" aria-expanded={openClub === club.id} onClick={() => setOpenClub(openClub === club.id ? '' : club.id)}>
                  <span><small>{club.city ?? club.county ?? 'Location not recorded'}</small><strong>{club.name}</strong></span>
                  <span>{club.courses.length} {club.courses.length === 1 ? 'course' : 'courses'} · {openClub === club.id ? 'Close' : 'Manage'}</span>
                </button>
              </header>
              {openClub === club.id ? (
                <div className="admin-catalogue-club-body">
                  {editing === `club:${club.id}` ? (
                    <ClubEditor club={club} draft={clubForm} setDraft={setClubForm} busy={Boolean(busy)} onSave={(draft) => mutate(`/api/admin/catalogue/clubs/${club.id}`, 'PATCH', clubPayload(draft), 'Club details updated.')} onCancel={() => setEditing('')} />
                  ) : (
                    <div className="admin-catalogue-record-actions">
                      <p>{[club.county, club.postcode, club.countryCode].filter(Boolean).join(' · ') || 'No further club details recorded.'}</p>
                      <button type="button" onClick={() => { setClubForm(clubDraft(club)); setEditing(`club:${club.id}`) }}>Edit club</button>
                      <button type="button" className="admin-catalogue-danger" disabled={!club.canDelete} title={club.canDelete ? '' : 'Remove home-club links and courses first'} onClick={() => remove(`/api/admin/catalogue/clubs/${club.id}`, club.name)}>Delete club</button>
                    </div>
                  )}

                  <div className="admin-catalogue-courses">
                    {club.courses.map((course) => (
                      <CourseCard key={course.id} course={course} editing={editing} setEditing={setEditing} courseForm={courseForm} setCourseForm={setCourseForm} teeForm={teeForm} setTeeForm={setTeeForm} scorecard={scorecard} setScorecard={setScorecard} busy={Boolean(busy)} mutate={mutate} remove={remove} coursePayload={coursePayload} teePayload={teePayload} />
                    ))}
                  </div>

                  {editing === `new-course:${club.id}` ? (
                    <form className="admin-catalogue-editor" onSubmit={async (event) => { event.preventDefault(); if (await mutate(`/api/admin/catalogue/clubs/${club.id}/courses`, 'POST', coursePayload(courseForm), 'Course added to the club.')) setCourseForm({ ...EMPTY_COURSE }) }}>
                      <h4>Add course</h4><CourseFields draft={courseForm} setDraft={setCourseForm} />
                      <div className="admin-catalogue-actions"><button disabled={Boolean(busy)}>Save course</button><button type="button" className="admin-catalogue-secondary" onClick={() => setEditing('')}>Cancel</button></div>
                    </form>
                  ) : <button type="button" className="admin-catalogue-add" onClick={() => { setCourseForm({ ...EMPTY_COURSE }); setEditing(`new-course:${club.id}`) }}>Add course to {club.name}</button>}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 ? <nav className="admin-catalogue-pages" aria-label="Catalogue pages"><button type="button" disabled={page <= 1 || isLoading} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page >= totalPages || isLoading} onClick={() => setPage((value) => value + 1)}>Next</button></nav> : null}
    </section>
  )
}

function ClubEditor({ club, draft, setDraft, busy, onSave, onCancel }: { club: CatalogueClub; draft: ClubDraft; setDraft: (draft: ClubDraft) => void; busy: boolean; onSave: (draft: ClubDraft) => Promise<boolean>; onCancel: () => void }) {
  return <form className="admin-catalogue-editor" onSubmit={(event) => { event.preventDefault(); void onSave(draft) }}><h3>Edit {club.name}</h3><ClubFields draft={draft} setDraft={setDraft} /><div className="admin-catalogue-actions"><button disabled={busy}>Save changes</button><button type="button" className="admin-catalogue-secondary" onClick={onCancel}>Cancel</button></div></form>
}

type CourseCardProps = {
  course: CatalogueCourse; editing: string; setEditing: (value: string) => void
  courseForm: CourseDraft; setCourseForm: (value: CourseDraft) => void
  teeForm: TeeDraft; setTeeForm: (value: TeeDraft) => void
  scorecard: HoleDraft[]; setScorecard: (value: HoleDraft[]) => void
  busy: boolean
  mutate: (path: string, method: string, body: unknown, success: string) => Promise<boolean>
  remove: (path: string, label: string) => Promise<void>
  coursePayload: (draft: CourseDraft) => unknown
  teePayload: (draft: TeeDraft) => unknown
}

function CourseCard(props: CourseCardProps) {
  const { course, editing, setEditing, courseForm, setCourseForm, teeForm, setTeeForm, scorecard, setScorecard, busy, mutate, remove, coursePayload, teePayload } = props
  return (
    <section className="admin-catalogue-course">
      <header><div><small>Course</small><h4>{course.name}</h4><p>{course.holes ?? '—'} holes · Par {course.par ?? '—'} · {course.tees.length} tees</p></div><div><button type="button" onClick={() => { setCourseForm(courseDraft(course)); setEditing(`course:${course.id}`) }}>Edit</button><button type="button" className="admin-catalogue-danger" disabled={!course.canDelete} onClick={() => remove(`/api/admin/catalogue/courses/${course.id}`, course.name)}>Delete</button></div></header>
      {editing === `course:${course.id}` ? <form className="admin-catalogue-editor" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/admin/catalogue/courses/${course.id}`, 'PATCH', coursePayload(courseForm), 'Course details updated.') }}><CourseFields draft={courseForm} setDraft={setCourseForm} /><div className="admin-catalogue-actions"><button disabled={busy}>Save course</button><button type="button" className="admin-catalogue-secondary" onClick={() => setEditing('')}>Cancel</button></div></form> : null}
      <div className="admin-catalogue-tees">
        {course.tees.map((tee) => <TeeCard key={tee.id} tee={tee} editing={editing} setEditing={setEditing} teeForm={teeForm} setTeeForm={setTeeForm} scorecard={scorecard} setScorecard={setScorecard} busy={busy} mutate={mutate} remove={remove} teePayload={teePayload} />)}
      </div>
      {editing === `new-tee:${course.id}` ? <form className="admin-catalogue-editor" onSubmit={async (event) => { event.preventDefault(); if (await mutate(`/api/admin/catalogue/courses/${course.id}/tees`, 'POST', teePayload(teeForm), 'Rated tee added.')) setTeeForm({ ...EMPTY_TEE }) }}><h4>Add rated tee</h4><TeeFields draft={teeForm} setDraft={setTeeForm} /><div className="admin-catalogue-actions"><button disabled={busy}>Save tee</button><button type="button" className="admin-catalogue-secondary" onClick={() => setEditing('')}>Cancel</button></div></form> : <button type="button" className="admin-catalogue-add" onClick={() => { setTeeForm({ ...EMPTY_TEE }); setEditing(`new-tee:${course.id}`) }}>Add rated tee</button>}
    </section>
  )
}

function TeeCard({ tee, editing, setEditing, teeForm, setTeeForm, scorecard, setScorecard, busy, mutate, remove, teePayload }: Omit<CourseCardProps, 'course' | 'courseForm' | 'setCourseForm' | 'coursePayload'> & { tee: CatalogueTee }) {
  function updateHole(holeNumber: number, field: 'par' | 'strokeIndex' | 'yardage', value: string) {
    setScorecard(scorecard.map((hole) => hole.holeNumber === holeNumber ? { ...hole, [field]: value } : hole))
  }
  const scorecardPayload = { holes: scorecard.map((hole) => ({ holeNumber: hole.holeNumber, par: Number(hole.par), strokeIndex: Number(hole.strokeIndex), ...(hole.yardage.trim() ? { yardage: Number(hole.yardage) } : {}) })) }
  return (
    <article className="admin-catalogue-tee">
      <header><div><strong>{tee.teeName}</strong><span>CR {tee.courseRating} · Slope {tee.slopeRating} · Par {tee.par ?? '—'} · {tee.holes.length}/18 holes</span></div>{tee.isUsed ? <em>Historical data locked</em> : null}</header>
      <div className="admin-catalogue-record-actions"><button type="button" onClick={() => { setTeeForm(teeDraft(tee)); setEditing(`tee:${tee.id}`) }}>Edit tee</button><button type="button" disabled={tee.isUsed} onClick={() => { setScorecard(holesDraft(tee.holes)); setEditing(`scorecard:${tee.id}`) }}>{tee.holes.length === 18 ? 'Edit scorecard' : 'Add scorecard'}</button><button type="button" className="admin-catalogue-danger" disabled={!tee.canDelete} onClick={() => remove(`/api/admin/catalogue/tees/${tee.id}`, `${tee.teeName} tee`)}>Delete tee</button></div>
      {editing === `tee:${tee.id}` ? <form className="admin-catalogue-editor" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/admin/catalogue/tees/${tee.id}`, 'PATCH', teePayload(teeForm), 'Tee details updated.') }}><TeeFields draft={teeForm} setDraft={setTeeForm} ratingsLocked={tee.isUsed} />{tee.isUsed ? <p className="admin-catalogue-lock">Course rating, slope and par are locked. Name, colour, gender and distance can still be corrected.</p> : null}<div className="admin-catalogue-actions"><button disabled={busy}>Save tee</button><button type="button" className="admin-catalogue-secondary" onClick={() => setEditing('')}>Cancel</button></div></form> : null}
      {editing === `scorecard:${tee.id}` ? <form className="admin-catalogue-editor" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/admin/catalogue/tees/${tee.id}/scorecard`, 'PUT', scorecardPayload, 'Scorecard saved to the catalogue.') }}><h4>Hole-by-hole scorecard</h4><p>Enter all 18 pars and use each stroke index from 1 to 18 once. Yardage is optional.</p><div className="admin-catalogue-scorecard"><span>Hole</span><span>Par</span><span>Stroke index</span><span>Yardage</span>{scorecard.map((hole) => <div className="admin-catalogue-hole" key={hole.holeNumber}><strong>{hole.holeNumber}</strong><input aria-label={`Hole ${hole.holeNumber} par`} type="number" value={hole.par} required onChange={(event) => updateHole(hole.holeNumber, 'par', event.target.value)} /><input aria-label={`Hole ${hole.holeNumber} stroke index`} type="number" value={hole.strokeIndex} required onChange={(event) => updateHole(hole.holeNumber, 'strokeIndex', event.target.value)} /><input aria-label={`Hole ${hole.holeNumber} yardage`} type="number" value={hole.yardage} onChange={(event) => updateHole(hole.holeNumber, 'yardage', event.target.value)} /></div>)}</div><div className="admin-catalogue-actions"><button disabled={busy}>Save scorecard</button><button type="button" className="admin-catalogue-secondary" onClick={() => setEditing('')}>Cancel</button></div></form> : null}
    </article>
  )
}

export default AdminCourseCatalogue
