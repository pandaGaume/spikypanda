// Build script for the ESA BIC one-pager docx files (EN + FR).
// Output: helios/private/esa-bic-one-pager.docx and esa-bic-one-pager.fr.docx
// Run: node helios/private/_build-pitch-docx.js
// This script lives in helios/private/ (gitignored). Safe to re-run any time.

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  LevelFormat, BorderStyle,
} = require('docx');

// === Style constants ===
const FONT = 'Arial';
const ACCENT = '1F4E79';        // dark blue, for title + section headings + ask box
const ACCENT_LIGHT = '4A6FA5';  // for subtitle
const BODY_COLOR = '202020';    // near-black
const SUBTLE = '666666';        // for the contact line

// === Helpers ===
function body(text, italic) {
  return new Paragraph({
    spacing: { before: 30, after: 70, line: 240 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({
      text, font: FONT, size: 20, color: BODY_COLOR,
      ...(italic ? { italics: true } : {}),
    })],
  });
}

function sectionHeading(text) {
  return new Paragraph({
    spacing: { before: 140, after: 30 },
    children: [new TextRun({
      text, font: FONT, size: 22, bold: true, color: ACCENT,
    })],
  });
}

function bulletPoint(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 0, after: 30, line: 240 },
    children: [new TextRun({ text, font: FONT, size: 20, color: BODY_COLOR })],
  });
}

function buildDoc(c) {
  const children = [];

  // Title
  children.push(new Paragraph({
    spacing: { before: 0, after: 30 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: c.title, font: FONT, size: 36, bold: true, color: ACCENT,
    })],
  }));

  // Subtitle
  children.push(new Paragraph({
    spacing: { before: 0, after: 70 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: c.subtitle, font: FONT, size: 22, italics: true, color: ACCENT_LIGHT,
    })],
  }));

  // Ask line, bordered top and bottom
  children.push(new Paragraph({
    spacing: { before: 70, after: 180 },
    alignment: AlignmentType.CENTER,
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: ACCENT, space: 6 },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: ACCENT, space: 6 },
    },
    children: [new TextRun({
      text: c.ask, font: FONT, size: 22, bold: true, color: ACCENT,
    })],
  }));

  // Sections
  for (const section of c.sections) {
    children.push(sectionHeading(section.heading));
    if (section.paragraphs) {
      for (const p of section.paragraphs) children.push(body(p));
    }
    if (section.bullets) {
      for (const b of section.bullets) children.push(bulletPoint(b));
    }
    if (section.deliverable) {
      children.push(body(section.deliverable, true));
    }
  }

  // Contact, bordered top
  children.push(new Paragraph({
    spacing: { before: 180, after: 0 },
    alignment: AlignmentType.CENTER,
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: ACCENT, space: 6 },
    },
    children: [new TextRun({
      text: c.contact, font: FONT, size: 18, color: SUBTLE,
    })],
  }));

  return new Document({
    creator: 'DotVision',
    title: c.title + ' - ESA BIC one-pager',
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 240 } } },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          // A4 portrait
          size: { width: 11906, height: 16838 },
          // 0.7 inch margins (1008 DXA) to maximize content area
          margin: { top: 1008, right: 1008, bottom: 1008, left: 1008 },
        },
      },
      children,
    }],
  });
}

// === EN content ===
const EN = {
  title: 'DotVision',
  subtitle: 'Adapting industrial predictive‑maintenance AI to microgravity operations',
  ask: 'Request to the ESA BIC: an incubation seat and the 60 k€ grant.',
  sections: [
    {
      heading: 'Opportunity',
      paragraphs: [
        'Space hardware depends on rotating machinery: pumps, compressors, fans, electrolyzer drives, scrubber motors, water‑recovery systems. Failures of this equipment have been a recurring issue on the ISS and will be more critical on long‑duration missions where resupply is limited. The ESA Gateway, the commercial stations replacing the ISS, and Mars architectures all need predictive maintenance that catches degradation early.',
        'Industrial predictive maintenance has matured on Earth over the past decade, using motor current signature analysis (MCSA), vibration patterns and other modalities to detect faults before failure. DotVision works in this field and has documented research on the topic.',
        'A specific technical gap stands in the way of bringing these methods directly into space. Microgravity changes the physics of fault detection: lubrication behavior, debris settling, vibration propagation and thermal coupling are different. Earth‑trained models do not transfer unchanged. Our own published work documents this effect quantitatively: gravity amplifies the visibility of certain fault signatures, microgravity attenuates them. This finding raises a precise research and engineering question.',
      ],
    },
    {
      heading: 'The project',
      paragraphs: [
        'The 60 k€ funds a focused technical project: characterizing how DotVision’s existing predictive‑maintenance models behave in microgravity, and adapting them to recover operationally useful performance in that regime.',
      ],
      bullets: [
        'Quantifying the gap between Earth‑trained and microgravity‑relevant performance, using existing test data and accessible microgravity datasets.',
        'Adapting the model architectures (signal processing, feature extraction, embedded inference) to compensate for the physical effects gravity imposes.',
        'Validating on a representative rotating‑machinery setup, with the adapted models running on the CyanMycelium embedded AI runtime that DotVision already deploys.',
        'Documenting the methodology and the results so they are reusable by the ESA technical community.',
      ],
      deliverable: 'Deliverable at the end of incubation: a demonstrator predictive‑maintenance agent, microgravity‑adapted, running on representative space‑grade‑target hardware, with characterized accuracy under gravity‑varying conditions.',
    },
    {
      heading: 'Why DotVision',
      paragraphs: [
        'DotVision designs and deploys industrial predictive‑maintenance AI. The SpikyPanda graph framework and the CyanMycelium embedded‑AI runtime are operational technology, not roadmap items. Our MCSA work is documented in a research paper, and our results on gravity effects on fault signatures provide the empirical starting point for this project. The work proposed here is an adaptation of working capability, which is what 60 k€ realistically funds.',
      ],
    },
    {
      heading: 'HELIOS as the medium‑term integration platform',
      paragraphs: [
        'DotVision is developing HELIOS, an open‑source digital twin platform for closed‑loop life support systems. HELIOS includes a distributed agent architecture in which predictive‑maintenance agents on rotating machinery are first‑class components, alongside thermal, chemical and safety agents on the same loop.',
        'The work funded by this incubation feeds directly into HELIOS as the future integration target. The microgravity‑adapted maintenance models become a HELIOS agent family. The validation methodology becomes the qualification approach for other agent families. HELIOS is the broader experimentation terrain DotVision intends to develop in the medium term.',
      ],
    },
    {
      heading: 'Business model',
      paragraphs: [
        'Open‑core. The HELIOS platform and the adapted maintenance models are open source. Revenue comes from custom integration on specific space platforms (instrumenting a pump, scrubber or electrolyzer for a given operator), validation services, and specialized commercial modules. DotVision’s existing Earth‑side industrial customers continue to fund baseline activity during incubation.',
        'Target space customers: European primes (Airbus Defence and Space, Thales Alenia Space, OHB), ECLSS integrators, agencies, and commercial habitat operators (Axiom, Vast, Starlab).',
      ],
    },
    {
      heading: 'Team and academic collaborations',
      paragraphs: [
        'DotVision develops this work through two academic research collaborations. The National and Kapodistrian University of Athens contributes to the mathematical models underpinning fault‑signature analysis, the numerical methods and the spectral analysis. The University of Houston contributes control systems and space architecture expertise, the latter through its Sasakawa International Center for Space Architecture.',
        'The founding team combines industrial AI engineering and the space domain.',
      ],
    },
    {
      heading: 'What DotVision seeks from the ESA BIC beyond the grant',
      bullets: [
        'Access to the ESA technical network and the ECLSS and Operations communities.',
        'Access, where possible, to microgravity datasets and facilities (parabolic flights, drop towers).',
        'Credibility with European primes and operators.',
        'Business development support to convert the demonstrator into a first paid integration.',
      ],
    },
  ],
  contact: 'helios.iofmars.com   │   contact@iofmars.com   │   Open source under Apache 2.0',
};

// === FR content ===
const FR = {
  title: 'DotVision',
  subtitle: 'Adapter l’IA de maintenance prédictive industrielle aux opérations en microgravité',
  ask: 'Demande adressée à l’ESA BIC : une place en incubation et la subvention de 60 k€.',
  sections: [
    {
      heading: 'Opportunité',
      paragraphs: [
        'Le matériel spatial repose sur des machines tournantes : pompes, compresseurs, ventilateurs, entraînements d’électrolyseurs, moteurs de scrubbers, systèmes de récupération d’eau. Les défaillances de ces équipements ont été un problème récurrent sur l’ISS et le seront plus encore pour les missions de longue durée où le ravitaillement est limité. La station Gateway de l’ESA, les stations commerciales qui remplacent l’ISS et les architectures martiennes ont toutes besoin d’une maintenance prédictive qui détecte la dégradation tôt.',
        'La maintenance prédictive industrielle a mûri sur Terre au cours de la dernière décennie. Elle s’appuie sur l’analyse des signatures du courant moteur (MCSA), les motifs vibratoires et d’autres modalités pour détecter les défauts avant la défaillance. DotVision travaille dans ce domaine et a publié des résultats sur le sujet.',
        'Un verrou technique précis empêche de transposer directement ces méthodes dans le spatial. La microgravité change la physique de la détection de défaut : le comportement de la lubrification, la sédimentation des débris, la propagation vibratoire et le couplage thermique sont différents. Les modèles entraînés au sol ne se transposent pas tels quels. Nos propres travaux publiés documentent cet effet de façon quantitative : la gravité amplifie la visibilité de certaines signatures de défaut, la microgravité les atténue. Ce constat pose une question de recherche et d’ingénierie claire.',
      ],
    },
    {
      heading: 'Le projet',
      paragraphs: [
        'Les 60 k€ financent un projet technique resserré : caractériser le comportement des modèles de maintenance prédictive existants de DotVision en microgravité, puis les adapter pour retrouver une performance opérationnelle utile dans ce régime.',
      ],
      bullets: [
        'La quantification de l’écart entre la performance des modèles entraînés au sol et celle attendue en microgravité, à partir de données de test existantes et de jeux de données microgravité accessibles.',
        'L’adaptation des architectures de modèles (traitement du signal, extraction de caractéristiques, inférence embarquée) pour compenser les effets physiques imposés par l’absence de gravité.',
        'La validation sur un banc représentatif de machine tournante, avec les modèles adaptés tournant sur le runtime d’IA embarquée CyanMycelium que DotVision déploie déjà.',
        'La documentation de la méthodologie et des résultats pour qu’ils soient réutilisables par la communauté technique de l’ESA.',
      ],
      deliverable: 'Livrable à la fin de l’incubation : un démonstrateur d’agent de maintenance prédictive, adapté à la microgravité, tournant sur du matériel représentatif des cibles vol, avec une précision caractérisée sur des conditions de gravité variables.',
    },
    {
      heading: 'Pourquoi DotVision',
      paragraphs: [
        'DotVision conçoit et déploie de l’IA de maintenance prédictive industrielle depuis plusieurs années. Le framework de graphes SpikyPanda et le runtime d’IA embarquée CyanMycelium sont des technologies opérationnelles, pas des éléments de feuille de route. Nos travaux MCSA sont documentés dans un article de recherche, et nos résultats sur l’effet de la gravité sur les signatures de défaut fournissent le point d’appui empirique de ce projet. Le travail proposé ici est une adaptation d’une capacité existante, ce qui correspond à ce que 60 k€ peuvent réellement financer.',
      ],
    },
    {
      heading: 'HELIOS comme plateforme d’intégration à moyen terme',
      paragraphs: [
        'DotVision développe HELIOS, une plateforme open source de jumeau numérique pour les systèmes de support vie en boucle fermée. HELIOS inclut une architecture d’agents distribués où les agents de maintenance prédictive sur machines tournantes sont des composants de premier plan, aux côtés des agents thermiques, chimiques et de sécurité de la même boucle.',
        'Le travail financé par cette incubation alimente directement HELIOS comme cible d’intégration future. Les modèles de maintenance adaptés à la microgravité deviennent une famille d’agents HELIOS. La méthodologie de validation devient l’approche de qualification pour les autres familles d’agents. HELIOS est le terrain d’expérimentation plus large que DotVision compte développer à moyen terme.',
      ],
    },
    {
      heading: 'Modèle économique',
      paragraphs: [
        'Open‑core. La plateforme HELIOS et les modèles de maintenance adaptés sont open source. Les revenus viennent d’intégrations sur mesure sur des plateformes spatiales spécifiques (instrumentation d’une pompe, d’un scrubber, d’un électrolyseur pour un opérateur donné), de prestations de validation et de modules commerciaux spécialisés. Les clients industriels existants côté Terre continuent de financer l’activité socle de DotVision pendant l’incubation.',
        'Clients spatiaux visés : les maîtres d’œuvre européens (Airbus Defence and Space, Thales Alenia Space, OHB), les intégrateurs ECLSS, les agences et les opérateurs commerciaux d’habitats (Axiom, Vast, Starlab).',
      ],
    },
    {
      heading: 'Équipe et collaborations académiques',
      paragraphs: [
        'DotVision développe ce travail à travers deux collaborations de recherche académiques. L’université nationale et capodistrienne d’Athènes (NKUA) contribue aux modèles mathématiques qui sous‑tendent l’analyse des signatures de défaut, aux méthodes numériques et à l’analyse spectrale. L’université de Houston apporte une expertise en systèmes de contrôle et en architecture spatiale, cette dernière à travers son Sasakawa International Center for Space Architecture.',
        'L’équipe fondatrice combine l’ingénierie en IA industrielle et le domaine spatial.',
      ],
    },
    {
      heading: 'Ce que DotVision recherche auprès de l’ESA BIC au-delà de la subvention',
      bullets: [
        'Accès au réseau technique de l’ESA et aux communautés ECLSS et Operations.',
        'Accès, quand c’est possible, à des jeux de données microgravité ou installations (vols paraboliques, tour de chute).',
        'Crédibilité auprès des maîtres d’œuvre et opérateurs européens.',
        'Accompagnement au développement commercial pour convertir le démonstrateur en une première intégration payante.',
      ],
    },
  ],
  contact: 'helios.iofmars.com   │   contact@iofmars.com   │   Open source sous licence Apache 2.0',
};

// === Build and write ===
const outDir = path.join(__dirname);

(async () => {
  const enBuf = await Packer.toBuffer(buildDoc(EN));
  fs.writeFileSync(path.join(outDir, 'esa-bic-one-pager.docx'), enBuf);
  console.log('Wrote esa-bic-one-pager.docx (' + enBuf.length + ' bytes)');

  const frBuf = await Packer.toBuffer(buildDoc(FR));
  fs.writeFileSync(path.join(outDir, 'esa-bic-one-pager.fr.docx'), frBuf);
  console.log('Wrote esa-bic-one-pager.fr.docx (' + frBuf.length + ' bytes)');
})();
