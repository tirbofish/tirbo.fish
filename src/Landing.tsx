import { githubUrl, email, linkedinUrl } from "./site";
import { About } from "./About";
import { Projects } from "./Projects";
import { Skills } from "./Skills";
import TirboFish from "./TirboFish";

const navLinks = [
    { label: "about", href: "#about" },
    { label: "skills", href: "#skills" },
    { label: "projects", href: "#projects" },
    { label: "github", href: githubUrl },
    { label: "linkedin", href: linkedinUrl },
    { label: "email", href: `mailto:${email}` },
    { label: "resume", href: "/resume.pdf" },
];

export function Landing() {
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
                    href={githubUrl}
                    aria-label="Visit Thribhu K on GitHub"
                >
                    Thribhu K
                </a>
                <a
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-2xl leading-none text-inherit no-underline opacity-60 outline-offset-[0.35em] hover:opacity-100 focus-visible:rounded-[0.15em] focus-visible:outline-2 focus-visible:outline-current motion-reduce:animate-none"
                    href="#about"
                    aria-label="Scroll down to about"
                >
                    ↓
                </a>
            </main>

            <About />
            <Skills />
            <Projects />
        </div>
    );
}
