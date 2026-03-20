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
    - Contributed to Deno Deploy, a globally distributed serverless platform
  ],
)

#entry(
  "Software Engineer — Stadium Inc.",
  "Online interview platform for enterprise recruiting",
  "2020 – 2022",
  details: [
    - Built Go microservices handling WebRTC middleware communication, asynchronous video recording pipelines, and interview data management
    - Developed React-based interview UI and admin dashboard for the web interview platform
  ],
)

#entry(
  "Software Engineer — Yahoo Japan Corporation",
  "Yahoo! Furima — C2C marketplace",
  "2019 – 2020",
  details: [
    - Built a Node.js BFF (Backend for Frontend) layer bridging the new Furima frontend with legacy Yahoo! Auctions backend services
    - Developed features for the C2C marketplace serving millions of users across Japan
  ],
)

#section("Education")

#entry(
  "Master of Science in Computer Science",
  "Georgia Institute of Technology",
  "2022 – 2025",
  details: [
    - GPA: 3.81
    - Relevant coursework: Distributed Computing, Computer Networks, Compilers, Operating Systems
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
  text(weight: "bold", "Languages:"), [Rust, TypeScript/JavaScript, Go, Python, Java, PHP, C/C++, SQL],
  text(weight: "bold", "Runtime & Platforms:"), [Deno, Node.js, PostgreSQL, MySQL],
  text(weight: "bold", "Systems:"), [Distributed systems, serverless infrastructure, container orchestration, Linux],
  text(weight: "bold", "Tools:"), [Git, Docker, Kubernetes, Terraform, CI/CD, cloud platforms (AWS, Google Cloud)],
)

#section("Open Source Contributions")

- *deno\_lint* (#link("https://github.com/denoland/deno_lint")[github.com/denoland/deno\_lint]) — \#2 all-time contributor (230+ PRs) to the Rust-based linter for Deno; implemented core lint rules
- *hyper ecosystem* (#link("https://github.com/hyperium/hyper")[hyper], #link("https://github.com/seanmonstar/reqwest")[reqwest], #link("https://github.com/hyperium/hyper-util")[hyper-util], #link("https://github.com/hyperium/h2")[h2]) — Feature additions and bug fixes to widely-used Rust HTTP libraries
- *rust-clippy* (#link("https://github.com/rust-lang/rust-clippy")[github.com/rust-lang/rust-clippy]) — Implemented new lints for the official Rust linter
- *Rust compiler* (#link("https://github.com/rust-lang/rust")[github.com/rust-lang/rust]) — Contributed patches to the Rust compiler

#section("Languages")

#grid(
  columns: (auto, 1fr),
  column-gutter: 12pt,
  row-gutter: 6pt,
  text(weight: "bold", "Japanese:"), [Native],
  text(weight: "bold", "English:"), [Business],
)

