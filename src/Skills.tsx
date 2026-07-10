import rust from "./assets/icons/rust.svg?raw";
import zig from "./assets/icons/zig.svg?raw";
import python from "./assets/icons/python.svg?raw";
import typescript from "./assets/icons/typescript.svg?raw";
import kotlin from "./assets/icons/kotlin.svg?raw";
import csharp from "./assets/icons/csharp.svg?raw";
import unrealengine from "./assets/icons/unrealengine.svg?raw";
import cpp from "./assets/icons/cpp.svg?raw";

const skills = [
    { name: "rust", icon: rust },
    { name: "zig", icon: zig },
    { name: "python", icon: python },
    { name: "typescript", icon: typescript },
    { name: "kotlin", icon: kotlin },
    { name: "c#", icon: csharp },
    { name: "unreal engine", icon: unrealengine },
    { name: "c++", icon: cpp },
];

const groups = [
    { name: "frameworks", items: ["ue5", "react", "vite", "flask"] },
    {
        name: "graphics and systems",
        items: ["vulkan", "directx 11 + 12", "webgpu"],
    },
    {
        name: "infrastructure",
        items: ["docker", "linux", "github actions", "digitalocean"],
    },
];

export function Skills() {
    return (
        <section id="skills" className="mx-auto max-w-3xl scroll-mt-24 px-6 py-24">
            <h2 className="m-0 text-2xl leading-none tracking-[-0.08em]">
                ## skills
            </h2>
            <ul className="m-0 mt-8 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-4">
                {skills.map((skill) => (
                    <li
                        key={skill.name}
                        className="flex flex-col items-center gap-3 rounded-md border border-cocoa/20 p-5"
                    >
                        <span
                            className="size-10 [&>svg]:h-full [&>svg]:w-full"
                            aria-hidden="true"
                            dangerouslySetInnerHTML={{ __html: skill.icon }}
                        />
                        <span className="text-sm">{skill.name}</span>
                    </li>
                ))}
            </ul>

            {groups.map((group) => (
                <div key={group.name}>
                    <h2 className="mb-0 mt-12 text-base leading-none tracking-[-0.08em] opacity-70">
                        ## {group.name}
                    </h2>
                    <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
                        {group.items.map((item) => (
                            <li
                                key={item}
                                className="rounded-full border border-cocoa/20 px-4 py-1.5 text-sm"
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </section>
    );
}
