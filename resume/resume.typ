#set page(margin: (x: 1.2cm, y: 1.2cm), paper: "a4")
#set text(font: "Libertinus Serif", size: 10pt)
#set par(justify: true)

#let accent = rgb("#2563eb")

#let section(title) = {
  v(6pt)
  text(size: 12pt, weight: "bold", fill: accent, upper(title))
  v(-4pt)
  line(length: 100%, stroke: 0.5pt + accent)
  v(2pt)
}

#let entry(title, subtitle, date, details: none) = {
  grid(
    columns: (1fr, auto),
    align: (left, right),
    text(weight: "bold", title),
    text(style: "italic", date),
  )
  if subtitle != none {
    text(style: "italic", subtitle)
  }
  if details != none {
    v(2pt)
    details
  }
  v(4pt)
}

// Header
#align(center)[
  #text(size: 22pt, weight: "bold")[Yusuke Tanaka]
  #v(-2pt)
  #text(size: 10pt)[
    yusuktan\@maguro.dev
    #h(8pt) | #h(8pt)
    #link("https://github.com/magurotuna")[github.com/magurotuna]
    #h(8pt) | #h(8pt)
    #link("https://linkedin.com/in/yusuktan")[linkedin.com/in/yusuktan]
    #h(8pt) | #h(8pt)
    #link("https://maguro.dev")[maguro.dev]
  ]
]

#section("Experience")

#entry(
  "Software Engineer — Deno Land Inc.",
  "Deno: a modern JavaScript/TypeScript runtime built on Rust and V8",
  "2022 – Present",
  details: [
    - Core contributor to the Deno runtime (open-source, 100k+ GitHub stars), working across the Rust and TypeScript codebase
    - Developed Deno Sandbox, an isolated VM environment for secure AI-driven code execution
    - Contributed to Deno Deploy, a globally distributed serverless platform, focusing on reliability and performance
    - Worked on the Deno standard library (`deno_std`) and built-in linter/formatter tooling
    - Reviewed book "Deno Web Development" (Packt Publishing, 2021) as technical reviewer
    - Authored "速習Deno" for WEB+DB PRESS Vol.124 (2021)
  ],
)

#entry(
  "Software Engineer — Stadium Inc.",
  none,
  "2020 – 2022",
  details: [
    - Built backend services and infrastructure for web applications
    - Developed and maintained production systems using TypeScript and cloud services
  ],
)

#entry(
  "Software Engineer — Yahoo Japan Corporation",
  none,
  "2019 – 2020",
  details: [
    - Worked on large-scale web services at one of Japan's largest internet companies
  ],
)

#section("Education")

#entry(
  "Master of Science in Computer Science",
  "Georgia Institute of Technology (OMSCS)",
  "2022 – 2025",
  details: [
    - Relevant coursework: Computer Networks, System Design, Distributed Systems
  ],
)

#entry(
  "Bachelor of Engineering",
  "The University of Tokyo",
  "2014 – 2019",
)

#section("Technical Skills")

#grid(
  columns: (auto, 1fr),
  column-gutter: 12pt,
  row-gutter: 6pt,
  text(weight: "bold", "Languages:"), [Rust, TypeScript/JavaScript, Python, Go],
  text(weight: "bold", "Runtime & Platforms:"), [Deno, Node.js, V8],
  text(weight: "bold", "Systems:"), [Distributed systems, serverless infrastructure, container orchestration, Linux],
  text(weight: "bold", "Tools:"), [Git, Docker, CI/CD, cloud platforms (AWS, GCP)],
)

#section("Selected Publications & Talks")

- Technical reviewer for _"Deno Web Development"_ (Packt Publishing, 2021)
- Author of _"速習Deno"_ — WEB+DB PRESS Vol.124 (2021)
- Contributor to Findy's _"あの人も読んでる"_ technical article series (2025)

#section("Open Source & Projects")

- *Deno* (#link("https://github.com/denoland/deno")[github.com/denoland/deno]) — Core contributor to the Rust-based JavaScript/TypeScript runtime
- *maguro.dev* (#link("https://maguro.dev")[maguro.dev]) — Personal technical blog covering Rust, systems programming, and distributed systems
- Active competitive programmer on AtCoder; built Rust libraries for competitive programming
