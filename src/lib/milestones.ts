export type Act = 'india' | 'flight' | 'canada'

export type Milestone = {
  id: string
  act: Act
  year: string
  title: string
  description: string
}

export const milestones: readonly Milestone[] = [
  {
    id: 'india',
    act: 'india',
    year: 'Pre-2013',
    title: 'Home in India',
    description:
      'Preparing for the journey — backpack packed, bound for Canada.',
  },
  {
    id: 'departure-2013',
    act: 'flight',
    year: '2013',
    title: 'Left India to study in Canada',
    description: 'Boarded a flight from India to Canada in December 2013.',
  },
  {
    id: 'douglas-2014',
    act: 'canada',
    year: '2014',
    title: 'Douglas College, Vancouver',
    description:
      'Started a Post Graduate Diploma in Computer Science at Douglas College.',
  },
  {
    id: 'thrinacia-2015',
    act: 'canada',
    year: '2015',
    title: 'Thrinacia Software Solutions',
    description:
      'Building responsive AngularJS components and crowdfunding campaign pages with Semantic UI and Bootstrap. A short chapter, but where frontend really clicked — the immediacy of UI work, the breadth of the open web, the tight feedback loop. I knew quickly this was the direction.',
  },
  {
    id: 'sycle-2016',
    act: 'canada',
    year: '2016',
    title: 'Sycle, Vancouver',
    description:
      'Five years growing into a senior IC, owning the full product delivery lifecycle on a SaaS platform. Led the migration from AngularJS to React, championed TypeScript adoption across the codebase, and shipped custom D3 analytics dashboards that landed at industry conferences. Partnered with database architects on MySQL query and API optimizations, and helped establish coding standards that outlived my tenure.',
  },
  {
    id: 'unbounce-2020',
    act: 'canada',
    year: '2020',
    title: 'Unbounce, Vancouver',
    description:
      'Got serious about frontend platform work — design systems and build tooling. Cut deployment times from 15 minutes to 3 by restructuring a monolithic repo into a Lerna-based packaging system. Modernized a design system with Storybook and TypeScript, prototyped a customizable page builder using CSS variables and CSS Grid template areas, and grew from Senior to Staff. Started mentoring more deliberately through 1:1s and learning sessions.',
  },
  {
    id: 'intuit-2022',
    act: 'canada',
    year: '2022',
    title: 'Intuit, Vancouver',
    description:
      'Enterprise architecture at scale. Architected a complete frontend rewrite grounded in Single Responsibility, Separation of Concerns, and Loose Coupling. Cut code duplication from 300+ files to 20 with a reusable React widget scaffold, saving the team a week or more per feature shipped. Owned an end-to-end Lead Capturing capability spanning Java Spring Boot and React with Akamai for security and routing, and drove Core Web Vitals and accessibility improvements platform-wide.',
  },
  {
    id: 'scribd-2025',
    act: 'canada',
    year: '2025',
    title: 'Scribd, Vancouver',
    description:
      'Where I am right now — AI-augmented engineering. Leading SEO and AI-bot discoverability on a consumer reading platform, designing per-PR preview environments with Google Cloud Build, and pioneering AI-assisted dev workflows: Cursor agents that scope tickets into draft PRs, plus a Claude Code setup with codebase-specific skills and Mermaid-based AI memory. All on a Ruby on Rails + React codebase.',
  },
] as const

export const TOTAL_STAGES = milestones.length
