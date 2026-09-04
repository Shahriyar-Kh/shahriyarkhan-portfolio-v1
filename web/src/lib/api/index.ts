// The only import path pages/components should use for the API layer.
export * from "@/lib/api/types";
export * from "@/lib/api/errors";
export { getProjects, getProject, getExperiences, getSkills, getServices, getEducation, getServiceBySlug } from "@/lib/api/portfolio";
export { getSiteSettings } from "@/lib/api/site";
export { getPageSeo } from "@/lib/api/seo";
export { getDefaultResume, getResume, trackResumeDownload } from "@/lib/api/resume";
export { postContact, postServiceRequest } from "@/lib/api/inquiries";
