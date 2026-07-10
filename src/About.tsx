const birthYear = 2009; // born Jan 01, 2009

export function About() {
    const age = new Date().getFullYear() - birthYear;

    return (
        <section id="about" className="mx-auto max-w-3xl scroll-mt-24 px-6 py-24">
            <h1 className="m-0 text-2xl leading-none tracking-[-0.08em]">
                # about
            </h1>
            <p className="mt-8 text-sm leading-relaxed opacity-80">
                I&apos;m a {age} year old student software developer interested
                in systems, graphics, game dev and full-stack apps.
            </p>
        </section>
    );
}
