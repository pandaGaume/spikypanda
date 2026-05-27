# HELIOS - Architecture d'IA incarnée multi-niveau

*Document conceptuel. Décrit le modèle d'agentivité distribuée que HELIOS instancie : une hiérarchie d'agents incarnés, des plus réactifs et embarqués jusqu'à la direction délibérative. Ce document développe le cadre théorique. Les sections « Architecture d'IA incarnée multi-niveau » des documents `project-overview.fr.md` et `isimgraph-v2-notes.fr.md` en donnent une version résumée orientée application.*

---

## Objet

HELIOS est habituellement décrit par sa fonction : un digital twin d'une boucle support vie, avec des agents qui surveillent les équipements. Cette description est exacte mais elle rate ce que l'architecture est réellement. HELIOS est une instance d'un patron architectural plus général : un système d'**IA incarnée multi-niveau** (embodied AI), où l'intelligence n'est pas centralisée mais distribuée en tiers, chacun avec sa propre forme d'incarnation, son horizon temporel, et son substrat d'exécution.

Ce document décrit ce patron. Il vaut au-delà du cas HELIOS, mais HELIOS lui donne une instanciation concrète et vérifiable.

## L'idée centrale : l'agentivité distribuée en tiers

Un système de contrôle classique sépare le plant (ce qui est contrôlé) et le contrôleur (ce qui contrôle). Quand le système devient grand, multi-physique et multi-échelle, ce partage binaire ne tient plus. Un contrôleur unique qui gérerait à la fois la régulation thermique milliseconde d'un réacteur et la planification d'une stratégie de régénération catalyseur sur plusieurs semaines serait soit trop lent pour la première tâche, soit trop myope pour la seconde.

La réponse de HELIOS est de ne pas avoir un contrôleur. L'intelligence est répartie en cinq tiers. Chaque tier est défini par trois propriétés conjointes :

- **Son incarnation** : à quel corps l'agent est-il lié ? Un équipement unique, la topologie de la boucle, aucun équipement, ou un corps humain.
- **Son horizon temporel** : sur quelle durée raisonne-t-il ? De la milliseconde à la durée d'une mission.
- **Son substrat** : sur quoi tourne-t-il ? Un microcontrôleur, un nœud de calcul, un modèle de langage distant, un cerveau humain.

Ces trois propriétés ne sont pas indépendantes. Elles co-varient. Plus un agent est incarné dans un corps étroit, plus son horizon est court et plus son substrat est contraint. C'est cette co-variation qui rend le modèle en tiers non arbitraire.

## Les cinq tiers

### Tier 0 : le substrat physique

Le SimGraph déterministe en simulation, l'équipement réel en déploiement. Ce n'est pas un agent. C'est le monde dans lequel tous les agents sont incarnés. Sa dynamique est gouvernée par la physique : conservation de la masse, de l'énergie, cinétique chimique. Les tiers supérieurs ne peuvent pas la violer, seulement la perturber dans les limites de ce que la physique autorise.

Distinguer ce tier explicitement importe, parce qu'il pose la contrainte dure. Aucun agent, à aucun niveau, ne peut décider que la conservation de la masse ne s'applique pas. L'environnement n'est pas négociable.

### Tier 1 : agents réactifs incarnés (embarqués)

Les vingt-cinq agents per-node de HELIOS. C'est le tier le plus incarné, au sens fort du terme.

Un agent du Tier 1 est lié à un équipement unique. Il perçoit le monde uniquement par les capteurs de cet équipement. Il agit uniquement par ses actuateurs. R601-THERMAL-REGULATION ne connaît pas l'existence de l'électrolyseur E-201 ; il vit dans la boucle sensorimotrice thermique du réacteur Sabatier et rien d'autre. Son intelligence n'est pas une représentation abstraite du monde, c'est un couplage serré entre ce qu'il sent et ce qu'il fait, sur un corps précis.

Ce tier est aussi le plus embarqué. Les agents tournent sur le microcontrôleur physiquement attaché ou proche de l'équipement, en inférence ONNX quantisée int8, dans un budget de quelques dizaines de kilooctets. Pas de dépendance réseau, pas de latence externe. L'agent et son corps sont colocalisés.

Horizon temporel : milliseconde à seconde. Réactif. Un agent du Tier 1 ne planifie pas, il répond.

C'est aussi à ce tier qu'appartiennent les agents safety. R601-RUNAWAY-PREVENTION est un agent réactif incarné dont la seule fonction est de détecter une signature d'emballement et de couper. Le placer au Tier 1, et pas plus haut, est un choix délibéré dont la justification vient plus bas.

### Tier 2 : agents coordinatifs

Les trois agents cross-nœuds de HELIOS : LOOP-MASS-BALANCE, LOOP-ENERGY-BALANCE, THERMAL-CHAIN.

Un agent du Tier 2 n'a pas un corps unique. Il est incarné dans la topologie de la boucle. LOOP-MASS-BALANCE intègre des observations venant de E-201, M-501, R-601 et V-801, et raisonne sur une propriété que nul équipement isolé ne porte : la conservation de la masse à l'échelle du système entier. Cette propriété est émergente. Elle n'existe qu'au niveau de la boucle.

Le Tier 2 est encore embarquable, mais sur un nœud de calcul un peu plus capable, ou sur le runtime central qui agrège les flux. Il n'est plus colocalisé avec un équipement parce qu'il n'a pas d'équipement de référence.

Horizon temporel : minute à heure. Le bilan massique d'une boucle fermée ne dérive pas en une milliseconde. Il dérive lentement, et c'est cette dérive lente que le Tier 2 surveille.

### Tier 3 : direction délibérative

Le LLM scenario director. C'est le tier désincarné.

Un agent du Tier 3 n'est lié à aucun équipement et à aucune boucle. Il opère sur des objets que les tiers inférieurs ne manipulent pas : le narratif d'un scénario d'entraînement, la définition d'objectifs, l'intention pédagogique, l'évaluation d'une équipe humaine. Son substrat n'est pas un microcontrôleur, c'est un modèle de langage, distant en phase initiale, potentiellement local et quantisé plus tard.

Horizon temporel : la session, ou plusieurs semaines de temps mission simulé. Le Tier 3 raisonne sur des durées qu'aucun agent embarqué ne peut tenir en mémoire.

Le Tier 3 agit sur le monde uniquement de manière indirecte, à travers la surface MCP, qui valide chaque action avant de l'injecter dans le Tier 0. Il ne touche jamais la physique directement. Cette médiation n'est pas une limitation technique, c'est ce qui définit le tier : un agent délibératif agit en reconfigurant le contexte des agents inférieurs, pas en se substituant à eux.

### Tier 4 : supervision humaine

L'équipage, via la couche VR/AR.

Le Tier 4 est incarné au sens le plus littéral du terme : un corps humain, avec sa perception, sa cognition, ses limites de charge mentale. C'est le tier qui détient l'autorité ultime. C'est aussi le seul tier que HELIOS ne conçoit pas mais avec lequel il doit composer.

La couche VR/AR est l'interface entre le Tier 4 et les quatre autres. Les instruments research-grade de cette couche (NASA-TLX, SAGAT) existent précisément parce que le Tier 4 ne se programme pas, il s'étudie. Comprendre comment un humain supervise les tiers inférieurs est une question expérimentale, pas une question de design.

## La propriété d'inversion : autorité contre délibération

Le point qui rend ce modèle en tiers correct, et pas seulement une stratification commode, est le suivant. L'autorité pour les actions critiques de survie est **inversement** distribuée par rapport à la capacité de délibération.

Le Tier 3 délibère le mieux. Il raisonne sur les horizons longs, intègre le contexte le plus large, produit les décisions les plus informées. Et c'est le tier qui a le **moins** d'autorité sur les actions de survie. Il ne peut pas couper un réacteur.

Le Tier 1 ne délibère pas du tout. R601-RUNAWAY-PREVENTION ne raisonne sur rien, il détecte une signature et il coupe. Et c'est le tier qui a l'autorité **absolue** sur cette action de survie précise. Aucun autre tier ne peut l'empêcher de couper, et aucun ne peut couper à sa place.

Cette inversion n'est pas une bizarrerie. C'est l'enseignement central de l'**architecture de subsomption** formulée par Rodney Brooks en 1986. Brooks construisait des robots mobiles et avait observé qu'une architecture où une couche de raisonnement central décide de tout produit des robots lents et fragiles. Sa réponse : des couches de comportement, où les couches basses, rapides et réactives, peuvent préempter les couches hautes pour les actions critiques. Le robot qui va heurter un mur n'attend pas que le planificateur ait fini.

HELIOS applique cette logique à un système thermo-fluide. Le réacteur Sabatier qui s'emballe n'attend pas que le LLM ait fini de raisonner sur le scénario d'entraînement. La sécurité ne peut pas dépendre de la disponibilité ou de la vitesse du tier le plus intelligent. Elle doit vivre dans le tier le plus rapide et le plus local, même si c'est le tier le plus bête.

## Pourquoi cinq tiers et pas un seul : le mapping aux échelles de temps

Le système physique de HELIOS a une dynamique étalée sur quatre ordres de grandeur. La compression et le mélange se jouent en millisecondes. La thermique des cuves en minutes. La cinétique du Sabatier en secondes. Le vieillissement du catalyseur en semaines.

Cette séparation d'échelles n'est pas un détail. C'est ce qui rend le système raide, au sens numérique discuté dans le design framework, et c'est aussi ce qui justifie la structure en tiers du contrôle.

Un tier de contrôle ne peut bien réguler qu'une dynamique dont l'échelle de temps est proche de son propre horizon. Un agent réactif milliseconde gère mal une dérive sur plusieurs semaines : il ne la voit pas, elle est trop lente pour son horizon. Un agent délibératif qui raisonne sur des semaines gère mal un transitoire milliseconde : il arrive trop tard.

Donc la hiérarchie de contrôle de HELIOS suit la hiérarchie dynamique du plant qu'elle contrôle. Le Tier 1 capte les modes rapides, le Tier 2 les modes intermédiaires, le Tier 3 les dérives lentes et la stratégie. Ce n'est pas un choix d'architecture parmi d'autres. C'est imposé par la physique du système.

Il y a là une correspondance avec l'analyse spectrale décrite dans le design framework. Les valeurs propres du système linéarisé se regroupent par échelle de temps. Les tiers d'agents se regroupent aussi par échelle de temps. La décomposition modale du plant et la stratification de son contrôle parlent de la même structure, vue une fois par la physique et une fois par l'architecture logicielle.

## Filiation théorique

Le modèle n'est pas inventé de zéro. Il se situe dans une lignée.

L'**architecture de subsomption** de Brooks (1986) pour la préemption par les couches basses, déjà citée.

L'**embodied cognition** et l'**embodied AI** : la thèse, portée par Varela, Thompson et Rosch dans *The Embodied Mind* (1991) et par Brooks dans *Intelligence without representation* (1991), selon laquelle l'intelligence n'est pas un calcul abstrait sur des représentations, mais émerge du couplage d'un agent à un corps et à un environnement. Les agents du Tier 1 de HELIOS sont incarnés en ce sens précis : leur compétence est dans le couplage capteur-actuateur sur un équipement, pas dans un modèle du monde.

Le **contrôle hiérarchique** et le **contrôle supervisé**, en théorie du contrôle, pour l'idée qu'un système complexe se régule par niveaux emboîtés avec des bandes passantes décroissantes vers le haut.

L'**apprentissage par renforcement hiérarchique** : le cadre des options (Sutton, Precup, Singh, 1999), le feudal RL (Dayan et Hinton, 1993), pour la décomposition d'une politique en sous-politiques opérant à des granularités temporelles différentes.

La **Society of Mind** de Minsky (1986), pour l'idée que l'intelligence d'un système entier émerge de l'interaction d'agents simples dont aucun n'est intelligent isolément.

Les **systèmes cognitifs conjoints** de Hollnagel et Woods, et les travaux sur les niveaux d'automatisation (Sheridan et Verplank, Parasuraman), pour le traitement du Tier 4 humain comme une partie du système et non comme un opérateur externe.

HELIOS ne prétend pas dépasser ces cadres. Il les compose et les instancie sur un cas concret, vérifiable, et ouvert.

## Lien avec la plasticité structurelle

Un agent du Tier 1 est incarné dans un équipement qui change. Le catalyseur du réacteur Sabatier se dégrade sur plusieurs mois. Les capteurs dérivent. Le corps de l'agent n'est pas stationnaire.

Un agent dont l'architecture est figée s'adapte mal à un corps qui dérive. Il faut un agent dont la structure interne peut se reconfigurer pour suivre les changements lents de son corps. C'est précisément le sujet de la plasticité structurelle qui est au cœur de SpikyPanda : adaptation en ligne de l'architecture neuronale par synaptogenèse, élagage, apprentissage hebbien.

Embodied AI et plasticité structurelle sont donc deux faces d'un même problème. L'incarnation pose la question : comment un agent reste-t-il compétent quand son corps change ? La plasticité structurelle est une réponse possible : en laissant l'agent reconfigurer sa propre structure. HELIOS est le terrain où cette réponse peut être mise à l'épreuve sur un système physique réel, avec un corps qui vieillit de manière mesurable.

C'est ce qui fait de HELIOS plus qu'une application de support vie. C'est un banc d'essai pour la question de l'agent incarné adaptatif.

## Ce que l'architecture apporte

Cinq propriétés découlent de la structure en tiers.

La **robustesse de la sécurité**. La sécurité vit dans le Tier 1. Elle ne dépend ni de la disponibilité du LLM, ni de la connexion réseau, ni du runtime central. Si tout ce qui est au-dessus du Tier 1 disparaît, les agents safety embarqués fonctionnent encore.

La **dégradation gracieuse**. Perdre un tier supérieur dégrade une capacité, pas la sécurité. Sans Tier 3, plus de scénarios adaptatifs, mais le système continue de tourner et de se protéger. Sans Tier 2, plus de surveillance des invariants globaux, mais les agents locaux tiennent. La perte se propage vers le bas en réduisant l'intelligence, pas en cassant la survie.

La **traçabilité de la conception**. Chaque tier a une portée et un horizon bornés. Un agent du Tier 1 se conçoit et se vérifie indépendamment, parce que son monde est petit. Tenter de vérifier un contrôleur monolithique qui mélange les cinq échelles serait sans espoir.

La **déployabilité**. Les tiers bas tournent sur du matériel bon marché, proche de l'équipement, sans latence. Les tiers hauts, plus coûteux en calcul, tournent là où le calcul est disponible. La structure en tiers est aussi une structure de déploiement.

Le **mapping au plant**. La hiérarchie de contrôle suit la hiérarchie dynamique du système physique. Cette correspondance rend l'architecture explicable : on peut justifier l'existence de chaque tier en pointant l'échelle de temps physique qu'il régule.

## Questions de recherche ouvertes

Le modèle, posé, ouvre plus de questions qu'il n'en ferme.

Comment l'information remonte-t-elle et redescend-elle entre tiers ? Un agent du Tier 2 doit abstraire les observations brutes du Tier 1 en une propriété de système. Un agent du Tier 3 doit contextualiser ses objectifs en perturbations que le Tier 1 peut interpréter. Ces opérations d'abstraction montante et de contextualisation descendante ne sont pas spécifiées par le modèle ; elles sont à concevoir.

Comment vérifier une propriété qui traverse les tiers ? La sécurité d'un agent du Tier 1 se vérifie en isolation. Mais la propriété « le système reste sûr quelles que soient les décisions du Tier 3 » est une propriété cross-tier. Sa vérification demande des outils qui n'existent pas encore dans le projet.

Comment les tiers apprennent-ils, et à quelle vitesse ? Un agent du Tier 1 doit s'adapter au vieillissement de son corps, sur des mois. Un agent du Tier 3 pourrait apprendre des patterns de décision d'équipage, sur des dizaines de sessions. Les tiers n'apprennent pas à la même cadence, et la coordination de ces apprentissages est ouverte.

Que se passe-t-il quand le Tier 4 humain et le Tier 3 LLM sont en désaccord ? L'humain a l'autorité, par principe. Mais comment cette autorité est-elle matérialisée dans l'architecture, et comment l'humain est-il informé qu'un désaccord existe ? C'est une question d'interaction, à étudier sur la couche VR/AR.

Ces questions ne sont pas des faiblesses du modèle. Elles sont la raison pour laquelle HELIOS, en tant que banc d'essai concret et instrumenté, a une valeur de recherche.

## Références

- Brooks R., *A Robust Layered Control System for a Mobile Robot*, IEEE Journal of Robotics and Automation, 1986.
- Brooks R., *Intelligence without representation*, Artificial Intelligence, 1991.
- Varela F., Thompson E., Rosch E., *The Embodied Mind*, MIT Press, 1991.
- Minsky M., *The Society of Mind*, Simon & Schuster, 1986.
- Dayan P., Hinton G., *Feudal Reinforcement Learning*, NeurIPS, 1993.
- Sutton R., Precup D., Singh S., *Between MDPs and semi-MDPs: A framework for temporal abstraction in reinforcement learning*, Artificial Intelligence, 1999.
- Hollnagel E., Woods D., *Joint Cognitive Systems: Foundations of Cognitive Systems Engineering*, CRC Press, 2005.
- Parasuraman R., Sheridan T., Wickens C., *A model for types and levels of human interaction with automation*, IEEE Transactions on Systems, Man, and Cybernetics, 2000.

---

*Ce document est le cadre conceptuel du projet. Il est destiné à évoluer et constitue un matériau de base pour une publication sur l'architecture multi-niveau de HELIOS.*
