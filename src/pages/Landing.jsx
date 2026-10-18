import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CalendarDays,
  AudioLines,
  MessageSquare,
  ShieldCheck,
  Phone,
  Sparkles,
} from "lucide-react";
import { Brand } from "../components/ui";
export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/" aria-label="Voicely home">
          <Brand />
        </Link>
        <nav>
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <Link to="/app">
            Open workspace <ArrowUpRight size={15} />
          </Link>
        </nav>
        <Link className="button small" to="/app">
          Try Live Demo <ArrowRight size={16} />
        </Link>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="pill">
              <i /> YOUR NEXT GREAT FIRST IMPRESSION
            </span>
            <h1>
              A warm welcome.
              <br />A little less <em>work.</em>
            </h1>
            <p>
              Your business has a lot to say. Give it a receptionist that
              listens, answers, and turns conversations into confirmed
              appointments.
            </p>
            <div className="hero-actions">
              <Link className="button" to="/app">
                Try Live Demo <ArrowRight size={18} />
              </Link>
              <a className="button secondary" href="#how-it-works">
                See how it works
              </a>
            </div>
            <div className="hero-fine">
              <Check size={15} /> No signup <span>·</span> No API keys{" "}
              <span>·</span> A real, working demo
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-visual-top">
              <span>THE RECEPTION DESK, REIMAGINED</span>
              <AudioLines size={20} />
            </div>
            <div className="call-orbit">
              <div className="orbit-ring" />
              <div className="voice-orb">
                <AudioLines size={62} strokeWidth={1.4} />
              </div>
              <span className="orbit-label">
                <i /> Here to help
              </span>
            </div>
            <div className="demo-bubble customer">
              “I’d love to book a consultation.”
            </div>
            <div className="demo-bubble assistant">
              “Of course. Let’s find a time that works for you.”
            </div>
            <div className="visual-caption">
              <span>
                <CalendarDays size={20} />
                <strong>Conversation → confirmation</strong>
              </span>
              <small>Illustrative conversation · Try the live workspace</small>
            </div>
          </div>
        </section>
        <div className="promise-strip">
          <span>Made for the human side of business.</span>
          <strong>Wellness studios</strong>
          <span className="tiny-star">✳</span>
          <strong>Local practices</strong>
          <span className="tiny-star">✳</span>
          <strong>Service businesses</strong>
        </div>
        <section className="landing-section" id="how-it-works">
          <div className="landing-heading">
            <span className="eyebrow">LESS ADMIN. MORE POSSIBILITY.</span>
            <h2>
              Good conversations
              <br />
              go somewhere.
            </h2>
            <p>
              A simple path from “hello” to “see you then.”
              <br />
              Explore every step in the free demo.
            </p>
          </div>
          <div className="steps">
            {[
              [
                AudioLines,
                "01",
                "A natural hello",
                "Speak in a supported browser, or type. Your receptionist remembers the details as you go.",
              ],
              [
                CalendarDays,
                "02",
                "A time that actually works",
                "Services, opening hours, buffers, and existing appointments all shape the available slots.",
              ],
              [
                MessageSquare,
                "03",
                "Everything in its place",
                "A confirmed booking, a saved transcript, and an SMS preview. Ready for your next conversation.",
              ],
            ].map(([Icon, n, title, copy]) => (
              <article key={n}>
                <div className="step-top">
                  <Icon />
                  <span>{n}</span>
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="feature-section" id="features">
          <div className="feature-copy">
            <span className="eyebrow">YOUR BUSINESS, IN VIEW</span>
            <h2>
              A calmer day
              <br />
              starts here.
            </h2>
            <p>
              One considered workspace for your receptionist, your calendar, and
              the conversations that connect them.
            </p>
            <ul>
              <li>
                <Check /> A calendar that prevents double bookings
              </li>
              <li>
                <Check /> Call history with the actual conversation
              </li>
              <li>
                <Check /> Business settings your receptionist follows
              </li>
              <li>
                <Check /> Persistent demo records you can reset
              </li>
            </ul>
            <Link to="/app" className="text-link">
              Explore the workspace <ArrowRight size={17} />
            </Link>
          </div>
          <div className="product-preview">
            <div className="preview-toolbar">
              <Brand />
              <span>WORKSPACE PREVIEW</span>
            </div>
            <div className="preview-head">
              <h3>Every detail, connected.</h3>
              <span className="badge green">Demo Mode</span>
            </div>
            <div className="preview-grid">
              <div>
                <CalendarDays />
                <strong>Appointments</strong>
                <span>Confirmed, never assumed</span>
              </div>
              <div>
                <Phone />
                <strong>Conversations</strong>
                <span>A record of every request</span>
              </div>
            </div>
            <div className="preview-line">
              <span className="business-avatar">M</span>
              <div>
                <strong>Meet Mia, your receptionist</strong>
                <small>Knows your services. Respects your calendar.</small>
              </div>
              <AudioLines />
            </div>
            <p>
              <ShieldCheck size={15} /> Your free demo stays in this browser.
            </p>
          </div>
        </section>
        <section className="landing-cta">
          <Sparkles size={27} />
          <h2>
            Let’s take care of
            <br />
            your next conversation.
          </h2>
          <p>Start with a hello. See what happens next.</p>
          <Link to="/app/agent" className="button light">
            Meet your receptionist <ArrowRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <p>Every conversation, taken care of.</p>
        <span>
          Local demo · Voice support varies by browser · SMS previews only
        </span>
      </footer>
    </div>
  );
}
