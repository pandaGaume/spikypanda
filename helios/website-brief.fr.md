# HELIOS - Brief site web (FR/EN)

*Document de cadrage pour la conception du site de présentation publique du projet HELIOS. Destiné à être consommé par un assistant de design (Claude design ou équivalent) ou un studio externe.*

---

## 1. Contexte projet en 60 secondes

HELIOS est un digital twin open source pour les systèmes de support vie en boucle fermée (ECLSS) destinés aux habitats lunaires et martiens. Le système combine simulation physique crédible d'une boucle CO2 vers CH4 complète, 28 agents d'IA autonomes distribués sur chaque équipement, et une couche d'expérience VR/AR pilotée par un LLM scenario director pour l'entraînement crise d'équipages.

Construit sur l'écosystème SpikyPanda et CyanMycelium. Open source, non-ITAR par construction. Compatible nativement avec les programmes NASA ECLSS Forward, NextSTEP, HRP, STMD, et la prochaine génération de processeurs spaceflight HPSC.

Documentation technique complète disponible dans le repo : project overview, design framework, agent manifest.

---

## 2. Objectifs du site

Le site doit servir trois objectifs distincts, dans cet ordre de priorité :

**1. Crédibilité technique auprès d'organisations institutionnelles.** Quand un program manager NASA, un ingénieur Axiom, ou un chercheur ESA atterrit sur la page, il doit comprendre en moins de 30 secondes que le projet est sérieux, techniquement substantiel, et compatible avec leurs cadres opérationnels. Pas de marketing mou, pas de visionnaire creux.

**2. Génération de contacts pour partenariats.** Soit académiques (universités, labos), soit industriels (Axiom, Intuitive Machines, Collins Aerospace), soit institutionnels (NASA centers, ESA, JAXA). Le call-to-action principal n'est pas « achetez » mais « collaborons ».

**3. Attirer des contributeurs.** Doctorants, ingénieurs, étudiants. Le site doit donner envie de contribuer au repo GitHub, de proposer un sujet de thèse, de candidater à un stage.

Conversion business directe (vente produit) n'est pas un objectif. Le site n'a pas de tunnel d'achat, pas de pricing, pas de « démo gratuite ».

---

## 3. Audiences cibles

Quatre personas à servir, par priorité.

### Persona A : Program manager institutionnel (NASA, ESA, JAXA)

40-55 ans, ingénieur de formation, gère un budget de quelques millions à quelques dizaines de millions sur 3-5 ans. Lit beaucoup de proposals, signe peu de partenariats. Ce qu'il veut voir : maturité technique (TRL implicite ou explicite), alignement avec ses programmes (ECLSS Forward, NextSTEP), absence de risques juridiques (ITAR, IP), capacité à délivrer.

Ce qui le fait fermer la page : buzzwords creux, manque de spécifications techniques, photos stock de cosmonautes avec hublot, prétentions impossibles à vérifier.

### Persona B : Ingénieur ou chercheur industriel (Axiom, Intuitive Machines, Sierra Space, Collins)

30-45 ans, technique pure, cherche des briques technologiques utilisables dans ses propres projets. Ce qu'il veut voir : architecture documentée, interfaces ouvertes, exemples d'intégration concrets, repo GitHub actif avec issues et PRs récents.

Ce qui le fait fermer la page : manque de docs techniques, absence de code accessible, marketing-speak.

### Persona C : Chercheur académique (PI, postdoc, doctorant)

Tout âge, profil multiple (control, architecture spatiale, IA, HCI). Cherche soit un cadre pour ses propres recherches, soit un sujet de thèse pour ses étudiants. Ce qu'il veut voir : positionnement scientifique (qu'est-ce que ce projet apporte à la connaissance ?), références, papiers publiés ou en préparation, possibilités de collaboration.

Ce qui le fait fermer la page : claims sans citations, absence de positionnement vs état de l'art, ton commercial pur.

### Persona D : Étudiant en aerospace, control, ML

20-26 ans, motivé par le spatial, cherche des projets cool auxquels contribuer. Ce qu'il veut voir : visuel SF qui fait rêver mais qui reste crédible, instructions claires pour commencer, niveau d'engagement attendu, exemples de contributions précédentes.

Ce qui le fait fermer la page : trop institutionnel sans aspérité, langue trop corporate, pas d'angle d'entrée concret.

L'équilibre du site doit servir A et B sans perdre C et D. C'est exactement le ton SF-institutionnel demandé.

---

## 4. Positionnement et tone of voice

### Le mélange SF + institutionnel

Référence mentale utile : un livre blanc technique de la NASA des années 1960-1970. Format institutionnel rigoureux, illustrations précises et soignées, prose factuelle, mais le sujet lui-même (envoyer des humains sur la Lune) est intrinsèquement de la SF. La crédibilité vient du contraste entre l'ambition extrême du sujet et la sobriété du traitement.

Autre référence : SpaceX dans ses meilleures pages techniques. Vidéos en 4K d'atterrissages de Falcon 9, mais accompagnées de specs techniques précises, pas de musique épique. Apple dans ses pages enterprise (Vision Pro for Business). Synchron, Karman Project, Sierra Space.

À éviter absolument :

- Le visuel « startup spatiale 2020 » avec gradient bleu vers violet, isométrie 3D, particules animées.
- Le langage type Elon-tweet (« revolutionary », « game-changing », « the future is here »).
- Le storytelling héroïque (« we are the team that will solve life support for Mars »).
- Les visualisations 3D génériques de réacteurs ou satellites sans rapport avec le projet réel.

### Vocabulaire à utiliser et à éviter

**À utiliser** : ECLSS, life support, closed loop, in-situ resource utilization, distributed autonomous agents, digital twin, deterministic simulation, conservation invariants, scenario director, training simulation, research platform, open source, NASA-compatible, mission operations, crew supervision.

**À éviter** : revolutionary, game-changer, cutting-edge, state-of-the-art (sans benchmark cité), transformative, unprecedented, leverage (comme verbe), seamless, robust (sans condition), ecosystem (utilisé seul), grounded (au figuré), at scale (utilisé en suffixe), journey, unlock value, empower.

### Exemples de copy good vs bad

**Bad** : « HELIOS leverages cutting-edge AI to revolutionize life support systems for the next frontier of space exploration. Our scalable, robust platform unlocks unprecedented capabilities for crew operations at scale. »

**Good** : « HELIOS simule en boucle fermée le procédé Sabatier qui transforme le CO2 expiré en méthane et oxygène. Vingt-huit agents autonomes distribués sur les équipements gèrent le monitoring, la sécurité et l'optimisation. Open source, non-ITAR, compatible avec les processeurs spaceflight HPSC de prochaine génération. »

La règle : chaque phrase doit dire quelque chose de vérifiable.

---

## 5. Direction visuelle

### Mood général

Sobre, technique, dense en information. L'inverse d'un site de SaaS B2B 2020 qui a peur de l'espace blanc. Ici, l'espace blanc (ou plutôt noir) est généreux quand il faut, et la densité technique est assumée quand le sujet l'exige.

### Palette de couleurs

**Mode sombre par défaut** (peut basculer en clair).

Base : noir profond (`#0A0A0F` à `#101018`) ou bleu nuit très désaturé (`#0A1018`).
Texte principal : blanc cassé (`#F0F0F5`) pour le confort de lecture.
Texte secondaire : gris clair (`#A0A0B0`).
Accent principal : un seul, suggéré ambre chaud (`#FF9A3C` ou `#E8762D`). Évite le bleu/cyan trop techno-cliché. L'ambre rappelle à la fois les écrans CRT de mission control 1960s-1970s et la lumière chaude du soleil filtré par l'atmosphère martienne.
Accent secondaire (parcimonieux) : un vert sodium très désaturé (`#5A8B5A`) pour les états « nominal » ou « OK », un rouge brique (`#B84A3C`) pour les alertes (sans le saturer comme un rouge web).

Pas de gradient. Pas de transparence inutile. Couleurs plates ou très subtilement texturées.

### Typographie

**Display** : une serif technique, type Söhne Mono Variable, IBM Plex Sans, Untitled Sans, ou Inter pour le sans-serif. Préférence pour Söhne ou IBM Plex Sans, qui ont la rigueur sans la froideur d'Helvetica.

**Mono pour les éléments techniques** (codes équipement, formules, données) : JetBrains Mono, IBM Plex Mono, ou Berkeley Mono.

**Tailles** : système modulaire, base 16px, ratio 1.25 ou 1.333. Pas de tailles aléatoires.

**Style éditorial** : titres en sentence case (pas en TITLE CASE Anglo), poids generally medium (pas bold sauf exception), tracking légèrement positif (+10 à +20) sur les majuscules.

### Imagerie

**Photographie** : zéro stock. Soit des photos réelles d'équipement (Sabatier reactors, electrolyzers, lunar regolith samples, mission control consoles), soit aucune photo. Préférer des **schémas techniques de qualité** (le PFD lui-même, schémas d'agents, topologies de réseau).

**Visualisations 3D** : autorisées mais doivent être substantielles. Pas de modèle low-poly générique. Si on visualise R-601, c'est un modèle technique correct avec les bons tubes, les bonnes proportions. Sinon, schéma 2D propre.

**Diagrammes** : style ingénierie, lignes fines, palette restreinte (noir/blanc + ambre pour highlights). Style référence : les schémas d'instrument NASA ou les diagrammes Modelica.

**Animation** : très parcimonieuse. Pas de hero video pleine page. Si animation : transitions subtiles entre sections, peut-être une visualisation animée du flux dans le PFD (mais activable uniquement, pas en autoplay). Respecter `prefers-reduced-motion`.

### Layout et grille

Grille 12 colonnes classique, gutters généreux. Largeur de ligne pour le corps de texte : 60-75 caractères max (lisibilité institutionnelle). Sections pleine largeur acceptées pour les visuels ou les éléments stats.

Pas de parallax. Pas de scroll-jacking. Le scroll doit être prédictible.

---

## 6. Architecture de l'information

Sitemap minimaliste, six pages principales :

```
/
├── /mission          (le pourquoi)
├── /system           (le quoi, technique)
├── /research         (positionnement académique + open source)
├── /resources        (docs, papers, repo GitHub)
├── /about            (qui, comment, contact)
└── /[lang]/...       (variante linguistique)
```

Pas de blog au démarrage. Pas de pages « solutions par industrie ». Pas de pricing. Pas de testimonials (le projet est trop jeune et c'est l'occasion de se distinguer).

Navigation principale dans le header : Mission, System, Research, Resources, About. Langue (FR/EN) en haut à droite. Logo SpikyPanda discret en bas de page avec mention « HELIOS is built on the SpikyPanda + CyanMycelium open source stack ».

---

## 7. Brief par page

### 7.1 Home (/)

**Hero** (premier écran, dense mais lisible).

- Titre court, factuel. Pas de baseline marketing.
- Sous-titre : une à deux phrases qui posent le sujet.
- Visuel : le PFD HELIOS (figure existante) en très grand, sobre, avec une légende minimale en overlay.
- Pas de bouton « Get Started ». Un seul lien discret : « Explore the system → ».

**Copy hero proposée (FR)** :

> **HELIOS**
> Simulation et entraînement de boucles support vie autonomes
> pour habitats lunaires et martiens.
>
> Un digital twin open source du procédé Sabatier en boucle fermée, vingt-huit agents distribués, et une couche d'expérience VR/AR pilotée par LLM pour la formation crise d'équipages.

**Copy hero proposée (EN)** :

> **HELIOS**
> Simulation and crew training for autonomous life support loops
> in lunar and Martian habitats.
>
> An open source digital twin of the closed loop Sabatier process, twenty-eight distributed agents, and an LLM-directed VR/AR experience layer for crisis training.

**Sections de la home, ordre suggéré** :

1. Hero (ci-dessus).
2. Pourquoi HELIOS : trois paragraphes courts sur le problème ECLSS, le gap des outils actuels, et l'opportunité (fenêtres matériel ML, XR, programmes NASA).
3. Snapshot du système : visuel topologie 3 runtimes + une phrase explicative par runtime.
4. Capacités principales : 4 cards sobres (simulation physique, agents distribués, expérience VR/AR, scenario director LLM). Chaque card : un titre court, deux à trois lignes de texte, un lien « En savoir plus » vers la section system correspondante.
5. Positionnement institutionnel : encart sobre listant la compatibilité programmes NASA (ECLSS Forward, NextSTEP, HRP, STMD, HPSC) avec une phrase de qualification (« compatibilités de design, pas engagements contractuels »).
6. Open source : encart avec lien GitHub, licence, et l'argument non-ITAR.
7. Footer : navigation, mention SpikyPanda/CyanMycelium, contact.

### 7.2 Mission (/mission)

Page narrative qui développe le pourquoi. Une à deux pages écrans.

Sections :

- Le problème ECLSS pour les missions longue durée.
- Le procédé Sabatier comme pierre angulaire du cycle carbone (avec équation, schéma, et un encart historique sur Paul Sabatier 1902).
- Le gap des digital twins actuels (CFD lourde vs simulations comportementales simples).
- Ce que HELIOS apporte.

Pas de visuel cosmonaute générique. Préférer un schéma sobre des cycles ECLSS, ou la photo NASA-domain-public d'un Sabatier hardware réel (il en existe à JSC et MSFC).

### 7.3 System (/system)

La page technique principale. C'est ici que Persona A et B doivent être convaincus.

Sections (ordre suggéré) :

- **Le procédé** : PFD en grand, description des 10 unités opératoires avec tableau des tags.
- **Boucles de conservation** : les quatre boucles (eau, gas recycle, thermal, catalyst lifecycle si ISRU), visualisées sobrement.
- **Framework de simulation** : ISimGraph v2 brièvement décrit, niveaux de fidélité, choix solveurs.
- **Agents distribués** : le manifest des 28 agents, visualisé en overlay sur le PFD (chaque équipement avec son ou ses agents), focus R-601 (6 agents).
- **Topologie de déploiement** : le schéma trois runtimes (SpikyPanda design, CyanMycelium MCU, CyanMycelium Unreal).
- **Expérience VR/AR** : Quest 3 phase 1, Vision Pro phase 2, instruments research-grade (NASA-TLX, SAGAT).
- **Direction de scénario LLM** : le mécanisme MCP, exemples de scénarios, garde-fous (le LLM ne touche pas la physique ni les agents safety).

Ton : factuel, dense en information technique, avec liens directs vers la documentation détaillée pour ceux qui veulent creuser. Chaque sous-section termine par un lien vers les docs correspondantes dans le repo.

### 7.4 Research (/research)

Page qui parle aux chercheurs et qui institutionnalise le positionnement open source.

Sections :

- **Plateforme de recherche ouverte** : open source dès le premier commit, instrumentation pour la recherche (reproductibilité, logging structuré, replay, métriques, configurations versionnées).
- **Non-ITAR par construction** : explication factuelle de la décision et de ses implications pour la collaboration internationale.
- **Angles de recherche supportés** : description courte des contributions possibles (distributed agent arbitration, physics-informed surrogates, adaptive autonomy, human-AI collaboration, spatial cognition pour CPS, mission-time digital twins). Présenté comme « ce que la plateforme rend possible », pas comme « ce que nous faisons ».
- **Programmes NASA compatibles** : ECLSS Forward, NextSTEP, HRP, STMD, HPSC, avec une à deux lignes sur chaque.
- **Comment collaborer** : SBIR partnerships, Space Act Agreements, university collaborations, direct GitHub contributions. Un lien clair pour contact.

### 7.5 Resources (/resources)

Pour les contributeurs et les évaluateurs techniques.

Sections :

- **Documentation** : liens directs vers le repo GitHub (README, project overview, design framework, agent manifest, glossaire).
- **Code** : repo GitHub avec badges (build status, license, contributors).
- **Publications** : si papers sortent, ils seront listés ici. Pour le moment, peut être vide ou avec « papers in preparation ».
- **Présentations** : slides, vidéos de talks, posters conférences.
- **Datasets** : configurations de référence, jeux de scénarios, datasets de validation.

Page peut être très simple, presque purement liste de liens. C'est OK, c'est sa fonction.

### 7.6 About (/about)

Qui est derrière, comment contacter.

Sections :

- **Le projet** : un paragraphe court sur l'origine et la philosophie (open source, facilitator role vis-à-vis des partenaires académiques et institutionnels).
- **SpikyPanda et CyanMycelium** : un paragraphe sur la base technique sur laquelle HELIOS est construit, avec liens.
- **Contributors** : section qui peut commencer vide et se remplir au fil du temps. Pas de photo glamour, juste noms et affiliations si pertinent.
- **Contact** : formulaire simple ou email direct. Pas de chatbot.

Ne pas mentionner ici les contacts académiques ou institutionnels avant qu'ils ne soient formalisés.

---

## 8. Stratégie bilingue (FR / EN)

### Principes

**Détection automatique de la langue** au premier load via `navigator.language`, avec respect du choix utilisateur ensuite (cookie ou localStorage). Switch FR/EN visible et accessible en haut à droite.

**URL strategy** : `/fr/...` et `/en/...` avec redirection à la racine selon la détection. Sitemap et SEO séparés pour chaque langue.

**Pas de traduction littérale**. Les deux versions doivent être idiomatiques dans leur langue respective. Pour le ton institutionnel, le français peut se permettre un peu plus de formalité que l'anglais (qui doit rester direct, presque sec).

**Contenu prioritaire EN**. Si une page n'est pas encore traduite, c'est l'anglais qui est servi par défaut (audience institutionnelle internationale). Le français est servi quand disponible et préféré par l'utilisateur.

**Termes techniques** : conservés en anglais dans les deux versions (PFD, ECLSS, ISRU, Sabatier, MCP, etc.). Ils font partie du vocabulaire commun du domaine.

### Conventions

- Acronymes : expliqués en première occurrence dans chaque page, puis utilisés sans expansion.
- Citations et noms propres (NASA, Axiom Space, etc.) : non traduits.
- Unités : SI partout (K, Pa, m, kg, s, mol). Conversions impériales optionnelles pour audience US si pertinent.

---

## 9. Spécifications techniques

### Stack suggéré

**Framework** : Astro (idéal pour ce type de site contenu-statique multilingue) ou Next.js si interactivité plus poussée prévue. Éviter les SPAs lourdes (React seul) pour un site de présentation.

**CMS** : pas nécessaire au démarrage. Tous les contenus en Markdown dans le repo. Si un jour besoin, Sanity ou Contentful.

**Hébergement** : Vercel, Netlify, ou Cloudflare Pages. CDN obligatoire, latence < 100ms partout dans le monde.

**Repository** : public sur GitHub, séparé du repo principal SpikyPanda. Permet aux contributeurs externes de proposer des corrections de texte par PR.

### Performance

- Lighthouse score ≥ 95 sur toutes les pages.
- Largest Contentful Paint < 1.5s.
- Pas de fonts custom chargées de manière bloquante. Soit système, soit fonts variables chargées en async avec fallback.
- Images servies en WebP ou AVIF, lazy loaded sauf hero.
- Pas de framework JS lourd (Cloudflare bundle analyzer indique le poids).

### Accessibilité

- WCAG 2.1 AA minimum. Idéalement AAA pour le contenu textuel.
- Contraste minimum 4.5:1 partout (la palette ambre/noir y arrive sans problème).
- Navigation entièrement keyboard-friendly.
- Tous les visuels techniques avec alt text descriptif (le PFD doit avoir un alt text long qui décrit textuellement les 10 sections, pour les lecteurs d'écran).
- Respecter `prefers-reduced-motion` partout.
- Respecter `prefers-color-scheme` (light theme propre obligatoire).

### SEO

- Title et meta description par page, distincts par langue.
- Open Graph et Twitter Cards avec un visuel sobre du PFD.
- Sitemap.xml automatique, séparé par langue.
- Schema.org markup type `ResearchProject` ou `SoftwareApplication` avec auteur, licence, datePublished.
- Robots.txt permissif (le projet veut être indexé).

### Analytics

Pas de Google Analytics. Préférer Plausible, Fathom, ou self-hosted Matomo. Le respect privacy renforce la crédibilité institutionnelle. Bannière cookies seulement si analytics présents (et même là, RGPD-compliant minimaliste).

---

## 10. À éviter explicitement

Liste non exhaustive de patterns qui tueraient la crédibilité institutionnelle :

- Hero video pleine page en autoplay (« sci-fi cinematic »).
- Compteurs animés (« 28 agents, 13 equipment tags, 4 conservation loops, 1 mission »).
- Sliders de testimonials.
- Sections « Trusted by » avec logos d'organisations qui n'ont rien signé.
- Stock photos de cosmonautes, fusées génériques, Terre vue de l'espace.
- Modèles 3D génériques de réacteurs ou satellites.
- Pop-up de newsletter à 15 secondes.
- Chatbot.
- Gradients pastel, glassmorphism, neumorphism.
- Particules animées en background.
- Toute mention de « revolutionary », « game-changer », « next-gen », « cutting-edge », « disruptive ».

---

## 11. Références d'inspiration

Sites à étudier comme calibres de référence pour le ton SF-institutionnel :

- [**Astrobotic**](https://www.astrobotic.com) : livraison de payloads lunaires, hardware réel, ton purement institutionnel sans flonflons.
- [**Voyager Space**](https://voyagerspace.com) : infrastructure orbitale, NASA-adjacent, design typographique sobre.
- [**Synchron**](https://synchron.com) : deep tech (brain-computer interface), écriture factuelle, design sobre.
- [**Sierra Space**](https://www.sierraspace.com) : SF crédible, palette restreinte, hardware réel mis en avant.
- [**Axiom Space**](https://www.axiomspace.com) : équilibre commercial et institutionnel, Houston-based.
- [**NASA Artemis program**](https://www.nasa.gov/humans-in-space/artemis/) : référence pour la dimension institutionnelle pure.
- [**Apple Vision Pro**](https://www.apple.com/apple-vision-pro/) : référence pour le mélange high-tech accessible et corporate, hardware spatial mis en avant sans excès.
- [**Anthropic**](https://www.anthropic.com) : pour la sobriété typographique et la densité de texte technique.
- [**DeepMind**](https://deepmind.google) : pour le mélange research-friendly et grand public.
- [**The Aerospace Corporation**](https://aerospace.org) : FFRDC, référence d'écriture institutionnelle aerospace pure si tu veux pousser le curseur à fond dans cette direction.

Sites à NE PAS imiter :

- SpaceX pour les pages « starship animations en boucle » (trop spectacle, trop Elon).
- N'importe quel site de startup IA 2024 (templates gradient violet, hero avec demo video).
- Sites de SaaS B2B avec « Trusted by Fortune 500 ».

---

## 12. Contenus prêts à utiliser

Cette section fournit des copies finalisées que le designer peut intégrer directement.

### 12.1 Tagline du site

**FR** : Simulation et entraînement de boucles support vie autonomes pour habitats lunaires et martiens.

**EN** : Simulation and crew training for autonomous life support loops in lunar and Martian habitats.

### 12.2 Description courte (meta description, ~155 caractères)

**FR** : Digital twin open source d'une boucle ECLSS CO2 vers CH4 avec 28 agents IA distribués et entraînement crise piloté par LLM en VR/AR.

**EN** : Open source digital twin of a closed loop ECLSS process with 28 distributed AI agents and LLM-directed crisis training in VR/AR.

### 12.3 Description longue (Open Graph, ~250 caractères)

**FR** : HELIOS est un digital twin open source pour la simulation et l'entraînement d'équipages sur des systèmes ECLSS de boucle fermée. Construit sur SpikyPanda et CyanMycelium. Non-ITAR. Compatible NASA ECLSS Forward, NextSTEP, HPSC.

**EN** : HELIOS is an open source digital twin for simulation and crew training of closed loop ECLSS systems. Built on SpikyPanda and CyanMycelium. Non-ITAR. Compatible with NASA ECLSS Forward, NextSTEP, HPSC.

### 12.4 Sections home (4 cards capabilities)

**Card 1 : Simulation physique**

FR : Simulation déterministe d'une boucle fermée Sabatier complète : électrolyse, capture CO2, compression, réaction catalytique, condensation, séparation. Conservation par espèce vérifiée à chaque pas.

EN : Deterministic simulation of a complete Sabatier closed loop : electrolysis, CO2 capture, compression, catalytic reaction, condensation, separation. Per-species conservation verified at every step.

**Card 2 : Agents distribués**

FR : Vingt-huit agents autonomes répartis sur les équipements du PFD. Six agents sur le réacteur Sabatier seul, dont un agent de sécurité avec autorité absolue sur les autres. Déployables sur MCU ou dans Unreal.

EN : Twenty-eight autonomous agents distributed across the PFD equipment. Six agents on the Sabatier reactor alone, including a safety agent with absolute authority over the others. Deployable on MCU or in Unreal.

**Card 3 : Expérience VR/AR**

FR : Plugin Unreal Blueprint exposant le système en VR (Meta Quest 3) puis en AR (Apple Vision Pro). Instruments research-grade intégrés (NASA-TLX, SAGAT) pour les études utilisateur.

EN : Unreal Blueprint plugin exposing the system in VR (Meta Quest 3) then AR (Apple Vision Pro). Research-grade instruments integrated (NASA-TLX, SAGAT) for user studies.

**Card 4 : Scenario director LLM**

FR : Direction de scénarios d'entraînement crise par modèle de langage, via une surface MCP qui valide chaque action avant injection dans la simulation. Le LLM joue le rôle de game master, jamais celui de contrôleur.

EN : LLM-directed crisis training scenarios via an MCP surface that validates each action before injection into the simulation. The LLM acts as game master, never as controller.

### 12.5 Encart positionnement institutionnel (home)

**FR** :

> HELIOS est conçu pour s'aligner sur les programmes publics de recherche spatiale : NASA ECLSS Forward (roadmap support vie), NextSTEP (habitats commerciaux cislunaires), Human Research Program (formation équipage), STMD Game Changing Development (ISRU), et la prochaine génération de processeurs spaceflight HPSC.
>
> Ces compatibilités sont des caractéristiques de design, pas des engagements contractuels.

**EN** :

> HELIOS is designed for alignment with public space research programs : NASA ECLSS Forward (life support roadmap), NextSTEP (commercial cislunar habitats), Human Research Program (crew training), STMD Game Changing Development (ISRU), and the next generation of HPSC spaceflight processors.
>
> These compatibilities are design characteristics, not contractual engagements.

### 12.6 Encart open source (home)

**FR** :

> Code source ouvert sous licence permissive. Pas de contenu ITAR. Conçu dès le premier commit pour permettre la collaboration internationale, la réutilisation académique, et l'audit indépendant.

**EN** :

> Source code open under permissive license. No ITAR-controlled content. Designed from the first commit to enable international collaboration, academic reuse, and independent audit.

### 12.7 Pied de page

**FR** :

> HELIOS est construit sur la pile open source SpikyPanda et CyanMycelium.
> Repo GitHub : [lien à remplacer]. Licence : Apache 2.0 (ou MIT, à confirmer).
> Le projet ne sollicite ni ne stocke d'informations personnelles via ce site.

**EN** :

> HELIOS is built on the SpikyPanda and CyanMycelium open source stack.
> GitHub repo : [lien à remplacer]. License : Apache 2.0 (or MIT, to be confirmed).
> This site does not solicit or store personal information.

---

## 13. Livrables attendus du designer

Le designer (humain ou IA) doit produire :

- Mockups haute fidélité des 6 pages principales, version desktop et mobile, dans les deux langues.
- Style guide (couleurs, typographie, composants, espacements) exportable.
- Composants réutilisables (cards, sections hero, headers, footers) en HTML/CSS ou framework choisi.
- Sources éditables (Figma ou équivalent) livrées avec le projet.
- Documentation succincte des choix de design.

Délai indicatif suggéré : 2-3 semaines pour les mockups, 4-6 semaines pour une implémentation complète déployable.

---

## 14. Annexe : matériaux fournis

Disponibles dans le répertoire HELIOS et utilisables directement :

- `figures/pfd.png` : le PFD principal du système.
- `project-overview.fr.md` : la fiche projet complète, source de tout contenu détaillé.
- `agent-manifest-v1.fr.md` : spec des 28 agents pour la section system.
- `isimgraph-v2-notes.fr.md` : design framework pour la section technique.
- `website-copy.fr-en.md` : contenu rédigé des 6 pages en FR et EN.

D'autres visuels (schéma topologie 3 runtimes, schéma habitat avec PFD intégré, visualisation des 28 agents en overlay sur le PFD) peuvent être produits au besoin ; le designer peut les commander en complément du brief initial.

---

*Brief produit pour cadrer la conception du site HELIOS. Toute question ou besoin d'éclaircissement doit être adressé avant le démarrage des mockups, pas après.*
