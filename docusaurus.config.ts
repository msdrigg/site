import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Scott\'s Homepage',
  tagline: 'Looking into it',
  favicon: '/img/me.png',

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
        src: '/img/me.png',
      },
      items: [
        { to: '/blog', label: 'Blog', position: 'left' },
        { to: '/about', label: 'About', position: 'left' },
      ],
    },
    footer: {
      links: [
        {
          html: `<a href="https://github.com/msdrigg" class="logo" target="_blank">
            <img src="/img/gh.png" alt="Github Logo">
          </a>`
        },
        {
          html: `<a href="https://www.instagram.com/notscottdriggers" class="logo" target="_blank">
            <img src="/img/ig.png" alt="Instagram Logo">
          </a>`
        },
        {
          html: `<a href="https://twitter.com/thecasualwaffle" class="logo" target="_blank">
            <img src="/img/x.png" alt="Twitter Logo">
          </a>`
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Scott Driggers.`,
    },
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
  plugins: [[
    'docusaurus-plugin-plausible',
    {
      domain: 'site.msd3.io',
      customDomain: 'plaus-alytics.msd3.io'
    },
  ]],
};

export default config;