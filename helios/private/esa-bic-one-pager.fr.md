# DotVision

## Adapter l'IA de maintenance prédictive industrielle aux opérations en microgravité

**Demande adressée à l'ESA BIC : une place en incubation et la subvention de 60 k€.**

*Version française pour relecture. La version de soumission est en anglais (`esa-bic-one-pager.md`).*

---

### Opportunité

Le matériel spatial repose sur des machines tournantes : pompes, compresseurs, ventilateurs, entraînements d'électrolyseurs, moteurs de scrubbers, systèmes de récupération d'eau. Les défaillances de ces équipements ont été un problème récurrent sur l'ISS et le seront plus encore pour les missions de longue durée où le ravitaillement est limité. La station Gateway de l'ESA, les stations commerciales qui remplacent l'ISS et les architectures martiennes ont toutes besoin d'une maintenance prédictive qui détecte la dégradation tôt.

La maintenance prédictive industrielle a mûri sur Terre au cours de la dernière décennie. Elle s'appuie sur l'analyse des signatures du courant moteur (MCSA), les motifs vibratoires et d'autres modalités pour détecter les défauts avant la défaillance. DotVision travaille dans ce domaine et a publié des résultats sur le sujet.

Un verrou technique précis empêche de transposer directement ces méthodes dans le spatial. La microgravité change la physique de la détection de défaut : le comportement de la lubrification, la sédimentation des débris, la propagation vibratoire et le couplage thermique sont différents. Les modèles entraînés au sol ne se transposent pas tels quels. Nos propres travaux publiés documentent cet effet de façon quantitative : la gravité amplifie la visibilité de certaines signatures de défaut, la microgravité les atténue. Ce constat pose une question de recherche et d'ingénierie claire.

### Le projet

Les 60 k€ financent un projet technique resserré : caractériser le comportement des modèles de maintenance prédictive existants de DotVision en microgravité, puis les adapter pour retrouver une performance opérationnelle utile dans ce régime.

Le travail couvre :

- La quantification de l'écart entre la performance des modèles entraînés au sol et celle attendue en microgravité, à partir de données de test existantes et de jeux de données microgravité accessibles.
- L'adaptation des architectures de modèles (traitement du signal, extraction de caractéristiques, inférence embarquée) pour compenser les effets physiques imposés par l'absence de gravité.
- La validation sur un banc représentatif de machine tournante, avec les modèles adaptés tournant sur le runtime d'IA embarquée CyanMycelium que DotVision déploie déjà.
- La documentation de la méthodologie et des résultats pour qu'ils soient réutilisables par la communauté technique de l'ESA.

Livrable à la fin de l'incubation : un démonstrateur d'agent de maintenance prédictive, adapté à la microgravité, tournant sur du matériel représentatif des cibles vol, avec une précision caractérisée sur des conditions de gravité variables.

### Pourquoi DotVision

DotVision conçoit et déploie de l'IA de maintenance prédictive industrielle depuis plusieurs années. Le framework de graphes SpikyPanda et le runtime d'IA embarquée CyanMycelium sont des technologies opérationnelles, pas des éléments de feuille de route. Nos travaux MCSA sont documentés dans un article de recherche, et nos résultats sur l'effet de la gravité sur les signatures de défaut fournissent le point d'appui empirique de ce projet. Le travail proposé ici est une adaptation d'une capacité existante, ce qui correspond à ce que 60 k€ peuvent réellement financer.

### HELIOS comme plateforme d'intégration à moyen terme

DotVision développe HELIOS, une plateforme open source de jumeau numérique pour les systèmes de support vie en boucle fermée. HELIOS inclut une architecture d'agents distribués où les agents de maintenance prédictive sur machines tournantes sont des composants de premier plan, aux côtés des agents thermiques, chimiques et de sécurité de la même boucle.

Le travail financé par cette incubation alimente directement HELIOS comme cible d'intégration future. Les modèles de maintenance adaptés à la microgravité deviennent une famille d'agents HELIOS. La méthodologie de validation devient l'approche de qualification pour les autres familles d'agents. HELIOS est le terrain d'expérimentation plus large que DotVision compte développer à moyen terme, avec les maîtres d'œuvre spatiaux européens, les agences et les partenaires académiques.

### Modèle économique

Open-core. La plateforme HELIOS et les modèles de maintenance adaptés sont open source. Les revenus viennent d'intégrations sur mesure sur des plateformes spatiales spécifiques (instrumentation d'une pompe, d'un scrubber, d'un électrolyseur pour un opérateur donné), de prestations de validation et de modules commerciaux spécialisés. Les clients industriels existants côté Terre continuent de financer l'activité socle de DotVision pendant l'incubation.

Clients spatiaux visés : les maîtres d'œuvre européens (Airbus Defence and Space, Thales Alenia Space, OHB), les intégrateurs ECLSS, les agences et les opérateurs commerciaux d'habitats (Axiom, Vast, Starlab).

### Équipe et collaborations académiques

DotVision développe ce travail à travers deux collaborations de recherche académiques. L'université nationale et capodistrienne d'Athènes (NKUA) contribue aux modèles mathématiques qui sous-tendent l'analyse des signatures de défaut, aux méthodes numériques et à l'analyse spectrale. L'université de Houston apporte une expertise en systèmes de contrôle et en architecture spatiale, cette dernière à travers son Sasakawa International Center for Space Architecture.

L'équipe fondatrice combine l'ingénierie en IA industrielle et le domaine spatial. [Membres de l'équipe et rôles à confirmer avant le rendez-vous : Guillaume Pelletier, Ali Nehme, Ferdinand Sellin.]

### Ce que DotVision recherche auprès de l'ESA BIC au-delà de la subvention

- Accès au réseau technique de l'ESA et aux communautés ECLSS et Operations.
- Accès, quand c'est possible, à des jeux de données microgravité ou à des installations (vols paraboliques, tour de chute) représentatifs.
- Crédibilité auprès des maîtres d'œuvre et opérateurs européens.
- Accompagnement au développement commercial pour convertir le démonstrateur en une première intégration payante.

### Contact

helios.iofmars.com | contact@iofmars.com | Open source sous licence Apache 2.0

---

*Notes pour Guillaume, ne font pas partie du one-pager :*

- *Vérifier l'éligibilité de DotVision pour l'ESA BIC visé (pays d'établissement, plafond d'âge, en général 5 ans).*
- *Confirmer les noms et rôles de l'équipe.*
- *Partenaire d'Athènes confirmé NKUA. Confirmer le périmètre de la collaboration.*
- *Accès aux données microgravité : identifier ce que DotVision peut utiliser (vols paraboliques ESA, tour de chute Bremen, archives ISS via l'ESA). Si l'accès demande l'appui du BIC, c'est un levier intéressant à mentionner explicitement à l'oral.*
- *Citer l'article MCSA de DotVision s'il est publié ou en soumission. Même « soumis à [revue] » est un signal de crédibilité fort.*
- *Cette version recentre l'ambition par rapport à la précédente : maintenance microgravité maintenant + HELIOS à moyen terme, au lieu d'un HELIOS complet financé sur 60 k€. Plus crédible pour un évaluateur BIC.*
- *Si tu veux un PDF une page mis en forme, il peut être produit à partir de ce contenu.*
