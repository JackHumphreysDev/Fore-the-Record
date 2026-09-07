import { formatWhatsNewDate, WHATS_NEW_ENTRIES } from './whatsNewData.ts'
import './WhatsNew.css'

function WhatsNew() {
  return (
    <section className="whats-new-page" id="whats-new">
      <header className="whats-new-hero">
        <div>
          <p className="eyebrow">
            <span aria-hidden="true" /> Latest updates
          </p>
          <h1>
            What’s new.
            <span>Made for your game.</span>
          </h1>
        </div>
        <p>
          A plain-language look at the latest ways Fore the Record helps you
          capture every round and understand your golf.
        </p>
      </header>

      <ol className="updates-timeline" aria-label="Fore the Record updates">
        {WHATS_NEW_ENTRIES.map((entry, index) => {
          const titleId = `update-${entry.id}`

          return (
            <li key={entry.id}>
              <div className="update-marker" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </div>
              <article className="update-card" aria-labelledby={titleId}>
                <time dateTime={entry.publishedAt}>
                  {formatWhatsNewDate(entry.publishedAt)}
                </time>
                <h2 id={titleId}>{entry.title}</h2>
                <p>{entry.summary}</p>
                <ul>
                  {entry.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </article>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default WhatsNew
