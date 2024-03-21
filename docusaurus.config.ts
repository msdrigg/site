import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Scott\'s Homepage',
  tagline: 'Looking into it',
  favicon: 'https://gravatar.com/avatar/c7abdf73e309877ecf09e03f27d44a4530dbb98035e47bd86b001a396d095a9b',

  // Set the production url of your site here
  url: 'https://scott.msd3.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'msdrigg', // Usually your GitHub org/user name.
  projectName: 'msdrigg', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: false,
        blog: {
          showReadingTime: true,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: "Scott",
      logo: {
        alt: 'Scott Driggers Logo',
        src: 'https://gravatar.com/avatar/c7abdf73e309877ecf09e03f27d44a4530dbb98035e47bd86b001a396d095a9b?size=512',
        style: {
          borderRadius: '50%',
        }
      },
      items: [
        { to: '/blog', label: 'Blog', position: 'left' },
        { to: '/blog/tags/projects', label: 'Projects', position: 'left' },
        { to: '/resume', label: 'Resume', position: 'left' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Links',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/msdrigg',
            },
            {
              label: 'Instagram',
              href: 'https://www.instagram.com/notscottdriggers',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/thecasualwaffle',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'Projects',
              to: '/projects',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Scott Driggers.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
