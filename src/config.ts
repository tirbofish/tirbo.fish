export type Project = { name: string; description: string; link?: string; screenshot?: string };
export type SkillGroup = { name: string; items: string[] };
export type SiteConfig = {
    name: string;
    handle: string;
    birthDate: string;
    about: string;
    links: { github: string; linkedin: string; email: string; resume: string };
    fishing?: { resistance: number };
    skills: string[];
    skillGroups: SkillGroup[];
    featuredProjects: Project[];
    otherProjects: Project[];
};

export async function loadSiteConfig(): Promise<SiteConfig> {
    return JSON.parse(siteConfigJson) as SiteConfig;
}
import siteConfigJson from "./site-config.json?raw";
