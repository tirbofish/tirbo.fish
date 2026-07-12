import { useEffect, useState } from "react";
import type { SiteConfig } from "./config";
import { About } from "./About";
import { Projects } from "./Projects";
import { Skills } from "./Skills";
import TirboFish from "./TirboFish";
import { FishingGame } from "./FishingGame";
import { readHiScore } from "./hiScore";

const WHEEL_PULL_TARGET = 2000; // roughly 20 standard upward wheel movements
const TOUCH_PULL_TARGET = 240; // px of downward drag at the top of the page

export function Landing({ config }: { config: SiteConfig }) {
    const [gameOpen, setGameOpen] = useState(false);
    const [hiScore, setHiScore] = useState(readHiScore);
    const [pullProgress, setPullProgress] = useState(0);

    useEffect(() => {
        if (gameOpen) return;

        let pull = 0;
        let resetTimer = 0;
        let touchStartY: number | null = null;

        const setPull = (value: number) => {
            pull = Math.max(value, 0);
            setPullProgress(Math.min(pull / WHEEL_PULL_TARGET, 1));
        };

        const open = () => {
            window.clearTimeout(resetTimer);
            setPull(0);
            setGameOpen(true);
        };

        const onWheel = (event: WheelEvent) => {
            window.clearTimeout(resetTimer);
            if (window.scrollY > 1 || event.deltaY >= 0) {
                setPull(0);
                return;
            }
            const px = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
            setPull(pull - px);
            if (pull >= WHEEL_PULL_TARGET) {
                open();
                return;
            }
            resetTimer = window.setTimeout(() => setPull(0), 600);
        };

        const onTouchStart = (event: TouchEvent) => {
            touchStartY =
                window.scrollY <= 1 ? event.touches[0].clientY : null;
        };

        const onTouchMove = (event: TouchEvent) => {
            if (touchStartY === null || window.scrollY > 1) {
                setPull(0);
                return;
            }
            const dragged = event.touches[0].clientY - touchStartY;
            setPull(dragged * (WHEEL_PULL_TARGET / TOUCH_PULL_TARGET));
            if (pull >= WHEEL_PULL_TARGET) {
                touchStartY = null;
                open();
            }
        };

        const onTouchEnd = () => {
            touchStartY = null;
            setPull(0);
        };

        window.addEventListener("wheel", onWheel, { passive: true });
        window.addEventListener("touchstart", onTouchStart, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onTouchEnd, { passive: true });
        window.addEventListener("touchcancel", onTouchEnd, { passive: true });
        return () => {
            window.clearTimeout(resetTimer);
            window.removeEventListener("wheel", onWheel);
            window.removeEventListener("touchstart", onTouchStart);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
            window.removeEventListener("touchcancel", onTouchEnd);
        };
    }, [gameOpen]);

    const pullBars = Math.round(pullProgress * 8);
    const navLinks = [
        { label: "about", href: "#about" },
        { label: "skills", href: "#skills" },
        { label: "projects", href: "#projects" },
        { label: "github", href: config.links.github },
        { label: "linkedin", href: config.links.linkedin },
        { label: "email", href: `mailto:${config.links.email}` },
        { label: "resume", href: config.links.resume },
    ];

    const scrollToSection = (href: string) => {
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="min-h-dvh bg-cream font-mono text-cocoa">
            <header className="fixed inset-x-0 top-0 z-20 animate-view-in motion-reduce:animate-none">
                <nav
                    className="flex items-center justify-between px-6 py-4"
                    aria-label="Primary"
                >
                    <TirboFish />
                    <ul className="m-0 flex list-none flex-wrap items-center gap-x-6 gap-y-1 p-0 text-sm">
                        {navLinks.map((link) => (
                            <li key={link.label}>
                                <a
                                    className="text-inherit no-underline outline-offset-[0.35em] hover:underline focus-visible:rounded-[0.15em] focus-visible:outline-2 focus-visible:outline-current"
                                    href={link.href}
                                    onClick={link.href.startsWith("#") ? (event) => {
                                        event.preventDefault();
                                        scrollToSection(link.href);
                                    } : undefined}
                                >
                                    {link.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </header>

            <main className="relative grid min-h-dvh place-items-center p-8">
                <a
                    className="whitespace-nowrap text-[clamp(1.55rem,5vw,3rem)] leading-none tracking-[0.02em] text-inherit no-underline outline-offset-[0.35em] focus-visible:rounded-[0.15em] focus-visible:outline-2 focus-visible:outline-current"
                    href={config.links.github}
                    aria-label={`Visit ${config.name} on GitHub`}
                >
                    {config.name}
                </a>
                <a
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-2xl leading-none text-inherit no-underline opacity-60 outline-offset-[0.35em] hover:opacity-100 focus-visible:rounded-[0.15em] focus-visible:outline-2 focus-visible:outline-current motion-reduce:animate-none"
                    href="#about"
                    onClick={(event) => {
                        event.preventDefault();
                        scrollToSection("#about");
                    }}
                    aria-label="Scroll down to about"
                >
                    ↓
                </a>
            </main>

            <About config={config} />
            <Skills config={config} />
            <Projects config={config} />

            {pullProgress > 0 && !gameOpen && (
                <div
                    className="pointer-events-none fixed inset-x-0 top-16 z-30 flex justify-center"
                    aria-hidden="true"
                >
                    <span
                        className="rounded-[0.15em] bg-cocoa px-3 py-1 font-mono text-xs text-cream"
                        style={{ opacity: 0.4 + pullProgress * 0.6 }}
                    >
                        reel up to go fishin&apos; [{"=".repeat(pullBars)}
                        {"\u00b7".repeat(8 - pullBars)}] ::&lt;&gt;
                    </span>
                </div>
            )}

            {hiScore > 0 && !gameOpen && (
                <button
                    className="fixed bottom-4 right-4 z-20 cursor-pointer border-0 bg-transparent p-0 font-mono text-xs text-inherit opacity-60 outline-offset-[0.35em] hover:underline hover:opacity-100 focus-visible:rounded-[0.15em] focus-visible:outline-2 focus-visible:outline-current"
                    type="button"
                    onClick={() => setGameOpen(true)}
                    title="cast again"
                >
                    hi-score: {hiScore} ::&lt;&gt;
                </button>
            )}

            {gameOpen && (
                <FishingGame
                    resistance={config.fishing?.resistance ?? 3}
                    onExit={(hi) => {
                        setHiScore(hi);
                        setGameOpen(false);
                    }}
                />
            )}
        </div>
    );
}
