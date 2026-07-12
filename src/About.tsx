import type { SiteConfig } from "./config";

export function About({ config }: { config: SiteConfig }) {
    const birth = new Date(`${config.birthDate}T00:00:00`);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;

    return (
        <section id="about" className="mx-auto max-w-3xl scroll-mt-16 px-6 py-24">
            <h1 className="m-0 text-2xl leading-none tracking-[-0.08em]"># about</h1>
            <p className="mt-8 whitespace-pre-line text-sm leading-relaxed opacity-80">
                {config.about.replaceAll("{age}", String(age))}
            </p>
        </section>
    );
}
