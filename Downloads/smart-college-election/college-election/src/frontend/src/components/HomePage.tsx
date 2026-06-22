import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NavBar } from "./NavBar";

const HERO_IMAGES = ["/college_1.jpg", "/college_2.webp"];

const SLIDE_DURATION = 4500;
const TRANSITION_DURATION = 1000;

interface HomePageProps {
  onStartVoting: () => void;
}

export function HomePage({ onStartVoting }: HomePageProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const slideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const scrollFrameRef = useRef<number | null>(null);

  const clearSlideTimeout = useCallback(() => {
    if (slideTimeoutRef.current) {
      clearTimeout(slideTimeoutRef.current);
      slideTimeoutRef.current = null;
    }
  }, []);

  const clearTransitionTimeout = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  const startSlideTransition = useCallback(
    (targetIndex: number) => {
      if (transitioning || targetIndex === activeIndex) return;

      clearTransitionTimeout();
      setNextIndex(targetIndex);
      setTransitioning(true);
      transitionTimeoutRef.current = setTimeout(() => {
        setActiveIndex(targetIndex);
        setNextIndex(null);
        setTransitioning(false);
        transitionTimeoutRef.current = null;
      }, TRANSITION_DURATION);
    },
    [activeIndex, clearTransitionTimeout, transitioning],
  );

  const goToNext = useCallback(() => {
    startSlideTransition((activeIndex + 1) % HERO_IMAGES.length);
  }, [activeIndex, startSlideTransition]);

  useEffect(() => {
    clearSlideTimeout();
    slideTimeoutRef.current = setTimeout(goToNext, SLIDE_DURATION);

    return clearSlideTimeout;
  }, [clearSlideTimeout, goToNext]);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollFrameRef.current !== null) return;

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        scrollFrameRef.current = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      clearSlideTimeout();
      clearTransitionTimeout();
    };
  }, [clearSlideTimeout, clearTransitionTimeout]);

  const parallaxOffset = scrollY * 0.4;

  return (
    <div id="home" className="min-h-screen bg-background">
      <NavBar />

      <section className="relative h-screen overflow-hidden" aria-label="Hero">
        <div
          className="absolute inset-0"
          style={{
            transform: `translateY(${parallaxOffset}px)`,
            willChange: "transform",
          }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${HERO_IMAGES[activeIndex]})` }}
          />
          {nextIndex !== null && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${HERO_IMAGES[nextIndex]})`,
                opacity: transitioning ? 1 : 0,
                transition: `opacity ${TRANSITION_DURATION}ms ease-in-out`,
              }}
            />
          )}
        </div>

        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-navy-900/80 via-navy-900/60 to-background" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-navy-900/50 to-transparent" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: -32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
            className="mb-4"
          >
            <span className="inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-sm">
              Sankara College
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="mb-6 font-display font-bold leading-[0.95] tracking-tight text-white"
            style={{ fontSize: "clamp(3rem, 10vw, 7rem)" }}
          >
            Sankara College
            <br />
            <span className="bg-gradient-to-r from-blue-300 via-white to-blue-200 bg-clip-text text-transparent">
              ELECTION
            </span>
            <br />
            <span
              className="font-light text-white/70"
              style={{ fontSize: "0.55em" }}
            >
              2026
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.45, ease: [0.4, 0, 0.2, 1] }}
            className="mb-10 max-w-xl font-body text-base leading-relaxed text-white/70 md:text-lg"
          >
            Shape the future of your campus. Cast your vote for the leaders who
            will represent your voice, drive change, and build tomorrow.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col items-center gap-4 sm:flex-row"
          >
            <button
              type="button"
              data-ocid="hero.start_voting_button"
              onClick={onStartVoting}
              className="group relative overflow-hidden rounded-xl px-10 py-4 font-display text-sm font-bold uppercase tracking-widest shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-primary/40 active:scale-95"
              style={{
                background:
                  "linear-gradient(135deg, #1e4a8a 0%, #2563eb 50%, #1e4a8a 100%)",
                color: "white",
              }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] transition-transform duration-700 group-hover:translate-x-[100%]" />
              ✦ Start Voting
            </button>

            <a
              href="#about"
              data-ocid="hero.learn_more_link"
              className="flex items-center gap-2 text-sm font-medium tracking-wide text-white/60 transition-colors duration-300 hover:text-white/90"
            >
              Learn more
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8 3v10M3 8l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {HERO_IMAGES.map((url, i) => (
            <button
              key={url}
              type="button"
              data-ocid={`hero.slide_indicator.${i + 1}`}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => startSlideTransition(i)}
              className={`rounded-full transition-all duration-500 ${
                i === activeIndex
                  ? "h-2 w-8 bg-white"
                  : "h-2 w-2 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </section>

      <section
        id="about"
        className="relative overflow-hidden py-28"
        style={{
          background:
            "linear-gradient(180deg, #0a0e1a 0%, #0d1633 40%, #0a0e1a 100%)",
        }}
        data-ocid="cta.section"
      >
        <div
          className="pointer-events-none absolute -top-24 left-1/4 h-96 w-96 rounded-full opacity-10 blur-3xl"
          style={{
            background: "radial-gradient(circle, #2563eb, transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 right-1/4 h-80 w-80 rounded-full opacity-10 blur-3xl"
          style={{
            background: "radial-gradient(circle, #1e4a8a, transparent)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
          >
            <span className="mb-6 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
              Student Democracy
            </span>
            <h2
              className="mb-6 font-display font-bold leading-tight text-foreground"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
            >
              Choose Your
              <span className="block bg-gradient-to-r from-blue-300 to-white bg-clip-text text-transparent">
                Leaders
              </span>
            </h2>
            <p className="mx-auto mb-12 max-w-2xl font-body text-base leading-relaxed text-muted-foreground md:text-lg">
              Eight pivotal positions. One collective voice. Cast your vote for
              the candidates who will shape the policies, events, and future of
              Sankara College of Science and Commerce, Coimbatore. Every vote is
              a step toward a stronger student community.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.85, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="relative mx-auto max-w-3xl rounded-2xl border border-white/10 p-8 backdrop-blur-xl md:p-12"
            style={{
              background: "rgba(255,255,255,0.04)",
              boxShadow:
                "0 8px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
            data-ocid="cta.glass_card"
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent" />

            <div className="relative mb-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {[
                { value: "8", label: "Election Positions" },
                { value: "48+", label: "Qualified Candidates" },
                { value: "2026", label: "Academic Year" },
              ].map(({ value, label }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.3 + i * 0.1 }}
                  className="text-center"
                >
                  <div
                    className="mb-1 font-display font-bold text-white"
                    style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
                  >
                    {value}
                  </div>
                  <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {label}
                  </div>
                </motion.div>
              ))}
            </div>

            <button
              type="button"
              data-ocid="cta.vote_now_button"
              onClick={onStartVoting}
              className="group relative w-full overflow-hidden rounded-xl px-12 py-4 font-display text-sm font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 sm:w-auto"
              style={{
                background:
                  "linear-gradient(135deg, #1e4a8a 0%, #2563eb 60%, #102040 100%)",
                color: "white",
                boxShadow: "0 4px 24px rgba(37,99,235,0.4)",
              }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] transition-transform duration-700 group-hover:translate-x-[100%]" />
              ✦ Vote Now — Start Your Journey
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-12 flex flex-wrap justify-center gap-3"
          >
            {[
              "Chairman",
              "Vice Chairman",
              "Secretary",
              "Treasurer",
              "Sports Head",
              "Cultural Head",
              "Technical Lead",
              "Class Representative",
            ].map((pos, i) => (
              <motion.span
                key={pos}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.55 + i * 0.06 }}
                className="cursor-default rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground transition-all duration-300 hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
              >
                {pos}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      <footer
        id="details"
        className="border-t border-white/5 py-10"
        style={{ background: "#0a0e1a" }}
        data-ocid="footer.section"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground md:flex-row">
          <span className="font-body">
            © {new Date().getFullYear()} Sankara College of Science and
            Commerce. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
