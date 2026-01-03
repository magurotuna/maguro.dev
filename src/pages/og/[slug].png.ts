import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadDefaultJapaneseParser } from 'budoux';

const fontPath = join(process.cwd(), 'src/assets/fonts/NotoSansJP-Bold.ttf');
const fontData = readFileSync(fontPath);

const avatarPath = join(process.cwd(), 'public/img/avatar.png');
const avatarData = readFileSync(avatarPath);
const avatarBase64 = `data:image/png;base64,${avatarData.toString('base64')}`;

// Initialize budoux parser for Japanese text segmentation
const parser = loadDefaultJapaneseParser();

// Parse text into segments for natural line breaking
function segmentJapaneseText(text: string): string[] {
  return parser.parse(text);
}

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.id.replace(/\.mdx?$/, '') },
    props: { title: post.data.title, date: post.data.date },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { title, date } = props as { title: string; date: Date };
  const formattedDate = date.toISOString().split('T')[0];

  // Segment title for better Japanese line breaking
  const segments = segmentJapaneseText(title);

  // Create elements for each segment - flexWrap will handle line breaks
  const titleChildren = segments.map((segment) => ({
    type: 'span',
    props: {
      children: segment,
    },
  }));

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          position: 'relative',
          background: '#0f0f14',
        },
        children: [
          // Gradient accent bar on left
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '8px',
                background: 'linear-gradient(180deg, #f43f5e 0%, #ec4899 50%, #8b5cf6 100%)',
              },
            },
          },
          // Subtle grid pattern overlay
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
                backgroundSize: '40px 40px',
              },
            },
          },
          // Main content container
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                width: '100%',
                height: '100%',
                padding: '56px 64px',
              },
              children: [
                // Title section (takes most of the space)
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flex: 1,
                      alignItems: 'center',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: title.length > 35 ? '56px' : '64px',
                            fontWeight: 'bold',
                            color: '#fafafa',
                            lineHeight: 1.4,
                            letterSpacing: '-0.02em',
                            display: 'flex',
                            flexWrap: 'wrap',
                          },
                          children: titleChildren,
                        },
                      },
                    ],
                  },
                },
                // Bottom section with avatar, site name, and date
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    },
                    children: [
                      // Left: Avatar + site name
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                          },
                          children: [
                            // Avatar
                            {
                              type: 'img',
                              props: {
                                src: avatarBase64,
                                width: 72,
                                height: 72,
                                style: {
                                  borderRadius: '50%',
                                },
                              },
                            },
                            // Site name
                            {
                              type: 'div',
                              props: {
                                style: {
                                  fontSize: '32px',
                                  fontWeight: 'bold',
                                  color: '#fafafa',
                                  letterSpacing: '-0.02em',
                                },
                                children: 'maguro.dev',
                              },
                            },
                          ],
                        },
                      },
                      // Right: Date
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '28px',
                            color: '#71717a',
                            fontWeight: 'bold',
                          },
                          children: formattedDate,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Noto Sans JP',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
    }
  );

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1200,
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(pngBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
