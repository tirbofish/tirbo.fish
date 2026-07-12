import type { SiteConfig } from "./config";

export function Projects({ config }: { config: SiteConfig }) {
    return (
        <section id="projects" className="mx-auto max-w-6xl scroll-mt-16 px-6 py-24">
            <h1 className="m-0 text-2xl leading-none tracking-[-0.08em]"># projects</h1>
            <ul className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-2 lg:grid-cols-3">
                {config.featuredProjects.map((project) => (
                    <li key={project.name} className="overflow-hidden rounded-md border border-cocoa/20">
                        {project.screenshot ? (
                            <img className="block aspect-video w-full object-cover" src={project.screenshot} alt={`Screenshot of ${project.name}`} loading="lazy" />
                        ) : (
                            <div className="grid aspect-video w-full place-items-center bg-latte/30 text-sm tracking-[-0.08em] opacity-60" aria-hidden="true">::&lt;screenshot&gt;</div>
                        )}
                        <div className="p-5">
                            <h2 className="m-0 text-base leading-none tracking-[-0.04em]">
                                {project.link ? <a className="text-inherit underline-offset-4 hover:underline" href={project.link} target="_blank" rel="noreferrer">## {project.name} ↗</a> : <>## {project.name}</>}
                            </h2>
                            <p className="mb-0 mt-3 whitespace-pre-line text-sm leading-relaxed opacity-80">{project.description}</p>
                        </div>
                    </li>
                ))}
            </ul>
            <h2 className="mb-0 mt-16 text-base leading-none tracking-[-0.08em] opacity-70">## etc</h2>
            <ul className="m-0 mt-6 grid w-full list-none gap-3 p-0">
                {config.otherProjects.map((project) => (
                    <li key={project.name} className="grid items-start gap-x-6 gap-y-1 border-b border-cocoa/10 pb-3 text-sm sm:grid-cols-[11rem_minmax(0,1fr)]">
                        {project.link ? <a className="tracking-[-0.04em] text-inherit underline-offset-4 hover:underline" href={project.link} target="_blank" rel="noreferrer">{project.name} ↗</a> : <span className="tracking-[-0.04em]">{project.name}</span>}
                        <span className="whitespace-pre-line opacity-60">{project.description}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
