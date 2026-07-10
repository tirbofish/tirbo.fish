type FeaturedProject = {
    name: string;
    description: string;
    /** Path or import of a screenshot image; null renders a placeholder. */
    screenshot: string | null;
};

// stub data — replace with real projects
const featured: FeaturedProject[] = [
    {
        name: "project-one",
        description: "Stub — a short description of the project goes here.",
        screenshot: null,
    },
    {
        name: "project-two",
        description: "Stub — a short description of the project goes here.",
        screenshot: null,
    },
    {
        name: "project-three",
        description: "Stub — a short description of the project goes here.",
        screenshot: null,
    },
];

// stub data — the rest of the projects
const other = [
    { name: "project-four", description: "Stub — one-liner about it." },
    { name: "project-five", description: "Stub — one-liner about it." },
    { name: "project-six", description: "Stub — one-liner about it." },
    { name: "project-seven", description: "Stub — one-liner about it." },
];

export function Projects() {
    return (
        <section
            id="projects"
            className="mx-auto max-w-3xl scroll-mt-24 px-6 py-24"
        >
            <h1 className="m-0 text-2xl leading-none tracking-[-0.08em]">
                # projects
            </h1>

            <ul className="m-0 mt-8 grid list-none gap-8 p-0">
                {featured.map((project) => (
                    <li
                        key={project.name}
                        className="overflow-hidden rounded-md border border-cocoa/20"
                    >
                        {project.screenshot ? (
                            <img
                                className="block aspect-video w-full object-cover"
                                src={project.screenshot}
                                alt={`Screenshot of ${project.name}`}
                                loading="lazy"
                            />
                        ) : (
                            <div
                                className="grid aspect-video w-full place-items-center bg-latte/30 text-sm tracking-[-0.08em] opacity-60"
                                aria-hidden="true"
                            >
                                ::&lt;screenshot&gt;
                            </div>
                        )}
                        <div className="p-6">
                            <h2 className="m-0 text-base leading-none tracking-[-0.04em]">
                                ## {project.name}
                            </h2>
                            <p className="mb-0 mt-3 text-sm leading-relaxed opacity-80">
                                {project.description}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>

            <h2 className="mb-0 mt-16 text-base leading-none tracking-[-0.08em] opacity-70">
                ## etc
            </h2>
            <ul className="m-0 mt-6 grid list-none gap-3 p-0">
                {other.map((project) => (
                    <li
                        key={project.name}
                        className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-cocoa/10 pb-3 text-sm"
                    >
                        <span className="tracking-[-0.04em]">
                            {project.name}
                        </span>
                        <span className="opacity-60">
                            {project.description}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
