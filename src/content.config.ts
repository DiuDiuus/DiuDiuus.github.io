import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import {
  beyondSchema,
  experienceSchema,
  profileSchema,
  projectSchema,
  researchSchema,
} from './content/schemas';

const yamlDir = (dir: string) => glob({ base: `./src/content/${dir}`, pattern: '*.yaml' });

export const collections = {
  profile: defineCollection({ loader: file('src/content/profile.yaml'), schema: profileSchema }),
  projects: defineCollection({ loader: yamlDir('projects'), schema: projectSchema }),
  research: defineCollection({ loader: yamlDir('research'), schema: researchSchema }),
  experience: defineCollection({ loader: yamlDir('experience'), schema: experienceSchema }),
  beyond: defineCollection({ loader: yamlDir('beyond'), schema: beyondSchema }),
};
