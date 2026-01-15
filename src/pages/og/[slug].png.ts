import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadDefaultJapaneseParser } from "budoux";

const fontPath = join(process.cwd(), "src/assets/fonts/NotoSansJP-Bold.ttf");
const fontData = readFileSync(fontPath);

const avatarPath = join(process.cwd(), "public/img/avatar.png");
const avatarData = readFileSync(avatarPath);
const avatarBase64 = `data:image/png;base64,${avatarData.toString("base64")}`;

// Initialize budoux parser for Japanese text segmentation
const parser = loadDefaultJapaneseParser();

// Parse text into segments for natural line breaking
function segmentJapaneseText(text: string): string[] {
  return parser.parse(text);
}

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title, date: post.data.date },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { title, date } = props as { title: string; date: Date };
  const formattedDate = date.toISOString().split("T")[0];

  // Segment title for better Japanese line breaking
  const segments = segmentJapaneseText(title);

  // Create elements for each segment - flexWrap will handle line breaks
  const titleChildren = segments.map((segment) => ({
    type: "span",
    props: {
      children: segment,
    },
  }));

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          height: "100%",
          width: "100%",
          display: "flex",
          position: "relative",
          background: "#000000",
        },
        children: [
          // Gradient glow orb - top right
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "-100px",
                right: "-100px",
                width: "400px",
                height: "400px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(139,92,246,0) 70%)",
              },
            },
          },
          // Gradient glow orb - bottom left
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: "-150px",
                left: "-100px",
                width: "500px",
                height: "500px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(236,72,153,0.25) 0%, rgba(236,72,153,0) 70%)",
              },
            },
          },
          // Subtle grid pattern
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              },
            },
          },
          // Main content container
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                width: "100%",
                height: "100%",
                padding: "60px 70px",
              },
              children: [
                // Title section
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flex: 1,
                      alignItems: "center",
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            fontSize: title.length > 35 ? "54px" : "62px",
                            fontWeight: "bold",
                            color: "#ffffff",
                            lineHeight: 1.35,
                            letterSpacing: "-0.02em",
                            display: "flex",
                            flexWrap: "wrap",
                          },
                          children: titleChildren,
                        },
                      },
                    ],
                  },
                },
                // Bottom section
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    },
                    children: [
                      // Left: Avatar with glow ring + site name
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            alignItems: "center",
                            gap: "24px",
                          },
                          children: [
                            // Avatar container with glow ring
                            {
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "88px",
                                  height: "88px",
                                  borderRadius: "50%",
                                  background:
                                    "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)",
                                  padding: "3px",
                                },
                                children: [
                                  {
                                    type: "img",
                                    props: {
                                      src: avatarBase64,
                                      width: 82,
                                      height: 82,
                                      style: {
                                        borderRadius: "50%",
                                      },
                                    },
                                  },
                                ],
                              },
                            },
                            // Site name with gradient
                            {
                              type: "div",
                              props: {
                                style: {
                                  fontSize: "36px",
                                  fontWeight: "bold",
                                  background:
                                    "linear-gradient(90deg, #ffffff 0%, #a78bfa 100%)",
                                  backgroundClip: "text",
                                  color: "transparent",
                                  letterSpacing: "-0.02em",
                                },
                                children: "maguro.dev",
                              },
                            },
                          ],
                        },
                      },
                      // Right: Date with accent
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          },
                          children: [
                            {
                              type: "div",
                              props: {
                                style: {
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background: "#ec4899",
                                },
                              },
                            },
                            {
                              type: "div",
                              props: {
                                style: {
                                  fontSize: "28px",
                                  color: "#a1a1aa",
                                  fontWeight: "bold",
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
          // Top accent line
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 0,
                left: "70px",
                right: "70px",
                height: "4px",
                background:
                  "linear-gradient(90deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)",
              },
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
          name: "Noto Sans JP",
          data: fontData,
          weight: 700,
          style: "normal",
        },
      ],
    },
  );

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 1200,
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(pngBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
