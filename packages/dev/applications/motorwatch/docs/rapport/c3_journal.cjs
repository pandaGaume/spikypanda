// Partie II : journal de realisation (chronologique, decisions et resultats negatifs inclus).
module.exports = (h) => {
    const { H1, H2, H3, P, B, I, CODEIN, BUL, NUM, CODE, ENCADRE, TABLE } = h;
    return [
        H1("PARTIE II : Journal de réalisation"),
        P([
            "Cette partie raconte le projet dans l'ordre où il s'est réellement déroulé, avec la même discipline que le cahier DriverV2 : chaque décision est motivée, chaque échec est documenté, et les chiffres cités sont ceux qui ont été mesurés (pas ceux qu'on espérait). ",
            "Le projet s'est exécuté en une journée (11 juin 2026), en orchestrant des vagues d'agents de développement parallèles sur des périmètres de fichiers disjoints, chaque vague étant suivie d'une intégration et d'une vérification centralisées.",
        ]),

        H2("II.1 Cadrage : trois directives qui ont fait l'architecture"),
        P([
            "Le point de départ est la partie V.2.1 du cahier DriverV2 (« Industriel : régimes machine et diagnostic, la synergie la plus forte ») et un scénario exprimé par le donneur d'ordre : capteur de courant, découverte d'un régime nouveau, alarme, diagnostic différentiel par modèles ONNX téléversés au runtime, labellisation centrale, partage entre sites. ",
            "Trois directives successives ont ensuite cadré l'architecture, chacune réorientant le plan en cours de route :",
        ]),
        ...NUM([
            [B("Deux sous-projets"), " : d'abord un moteur R385 (courant continu classique), ensuite les brushless ET les machines à cage d'écureuil « pour simuler des cassures de barre » : le défaut MCSA de référence, documenté par les notes de recherche du dépôt."],
            [B("Tous les nœuds génériques en plugins"), " (en créer si nécessaire) pour être compatibles nodeeditor v2 d'emblée ; tout ajout 100 % générique de niveau framework dans core. L'application ne garde que le métier."],
            [B("Graphes versionnés et sérialisés"), ", éditables dans l'éditeur, avec la charge du moteur PILOTABLE INDÉPENDAMMENT : le graphe moteur doit resservir à d'autres applications."],
        ], "numcadr"),
        H3("L'exploration : ce qui existait, ce qui manquait"),
        P([
            "Un graphe d'exemple fourni par le donneur d'ordre (graph (28).json) a servi de pierre de Rosette : il contenait déjà le banc R385 complet (potentiomètre, onduleur PWM, moteur CC aux paramètres R385, capteur LEM, chaîne FFT, scène), et surtout il montrait le couple de charge composé À LA MAIN : omega, canal de retour Z-1, deux multiplications, K.omega2. ",
            "Le manque nommé par le donneur d'ordre (« il manque la simulation du tau_load ») devenait précis : un nœud de PROFILS de charge.",
        ]),
        P("L'inventaire systématique du dépôt (agents d'exploration parallèles) a établi les faits suivants :"),
        ...BUL([
            ["Aucun modèle de machine asynchrone nulle part (les seules occurrences de « cage » concernaient les cages de roulement) : le moteur à induction du sous-projet 2 serait une création."],
            ["Aucun nœud de clustering, d'embedding ou de détection d'anomalie dans AUCUN plugin : le plugin ml serait une création."],
            ["Le plugin DSP était riche (FFT, fenêtres, RMS, oscillateur, transducteur générique) mais sans détecteur de régime stationnaire, sans multiplexeur, sans fenêtres multi-canaux, sans transposition."],
            ["Le moteur CC était devenu INTÉGRABLE (solveur RK4 de session, ports « signal ») alors que les brushless restaient en Euler-dans-fire à ports « stream » : deux régimes d'exécution à respecter."],
            ["Le nœud modèle ONNX de l'éditeur savait charger un modèle par glisser-déposer et le ré-exécuter, mais PAS être câblé en flux dans un graphe (voir II.5)."],
        ]),

        H2("II.2 Première vague : cinq chantiers de fondation en parallèle"),
        P([
            "Cinq agents ont travaillé simultanément sur des fichiers disjoints, les fichiers d'enregistrement partagés (index du plugin physics, manifestes, configurations racine) restant réservés à l'orchestrateur pour éviter tout conflit. Chaque chantier devait livrer ses tests verts avant intégration.",
        ]),
        TABLE(
            ["Chantier", "Livré", "Tests"],
            [
                ["Couple de charge", "LoadTorqueNode, 5 profils, zéro allocation par tick", "15"],
                ["Nœuds DSP", "porte de régime établi, multiplexeur, fenêtres [T,C], transposition", "18"],
                ["Plugin ml", "bibliothèque de clustering portée de DriverV2 + nœud open-set + boilerplate complet du plugin", "13"],
                ["Téléversement validé", "SHA-256 pur TypeScript (vecteurs FIPS) + loadModelValidated double banque", "12"],
                ["Machine à cage", "modèle alpha-beta complet + asymétrie de barres + validation spectrale", "15"],
            ],
            [2400, 5238, 2000]
        ),
        H3("Les pièges rencontrés et documentés pendant cette vague"),
        ...BUL([
            [B("La grammaire du bus d'alertes"), " : la sévérité « warning » n'existe pas ; le bus normalise tout ce qu'il ne connaît pas vers « info ». L'alarme du clusterer émet « warn », et un test fait transiter la trame par un vrai bus pour verrouiller la compatibilité."],
            [B("Le protobuf trop poli"), " : des octets 0xFF en série « parsent » comme un modèle ONNX VIDE (fin de fichier immédiate) ; le chargeur validé rejette explicitement « modèle sans nœuds » pour interdire la bascule silencieuse vers un modèle blanc."],
            [B("La calibration des barres cassées"), " : la proportionnalité raie/k/N n'est pas tombée du premier coup ; elle a été itérée jusqu'à mesurer, à dt = 2e-4 : raie basse à 3,9 % du fondamental pour 2 barres sur 28, 7,5 % pour 4 (rapport 1,92). Ces chiffres seront ré-ancrés plus tard au nouveau taux déclaré (voir II.8)."],
            [B("Le manifeste en retard sur le code"), " : le manifest.json du plugin physics ne listait déjà plus tous les nœuds réellement enregistrés (onduleur et capteur de courant absents) : constat documenté, les ajouts du projet ont mis à jour code ET manifeste."],
        ]),
        H3("Intégration de la vague"),
        P([
            "Branchement des deux sous-plugins physics (load, motor-induction), création des alias d'espace de travail (tsconfig, jest), enregistrement du plugin ml partout où l'éditeur l'attend (script de déploiement des bundles, page node-editor-v2, balise script). ",
            "Un seul accroc : le webpack du plugin onnx ne connaissait pas l'alias d'extension « .js vers .ts » (style d'import ESM des autres plugins) ; aligné sur la configuration du plugin physics. 77/77 tests verts après intégration, build TypeScript complet propre.",
        ]),

        H2("II.3 L'application : le métier, et un choix d'architecture défendu"),
        P([
            "L'application (catalogue, fédération, station, protocole, façade capteur) a été développée pendant que d'autres chantiers avançaient. Deux décisions notables :",
        ]),
        ...ENCADRE("Décision : le banc de diagnostic vit derrière un adaptateur, pas en nœud fractal nu", [
            ["La session d'exécution fige la topologie du graphe à sa construction (états, capacités, entrées requises). Permuter les nœuds INTERNES d'un nœud modèle fractal en cours de session serait donc invisible pour la session en cours. La façade capteur tient le banc de diagnostic dans un petit kernel adaptateur : la frontière du graphe reste stable, loadModelValidated permute les banques DERRIÈRE elle. Le streaming fractal (II.5) sert le cas de l'éditeur ; l'adaptateur sert le cas du capteur toujours allumé."],
        ]),
        ...ENCADRE("Décision : le démarrage à froid est silencieux", [
            ["Le premier profil découvert (la mise en service) ne lève PAS d'alarme : c'est la ligne de base. Chaque régime suivant alarme exactement une fois. Ce contrat est documenté dans la façade et asséré par les tests de bout en bout (3 régimes = 2 alarmes)."],
        ]),
        P([
            "L'encodeur de test a demandé une vraie réflexion : le clusterer normalise les empreintes (distance cosinus), donc une simple mise à l'échelle du courant est INVISIBLE. L'encodeur synthétique (octets ONNX réels, générés par l'exportateur du dépôt : Flatten, Gemm, Relu, Gemm, à poids fixés) combine des bandes de niveau saturantes, une sensibilité de forme (|pente|) et un chemin de biais constant, de sorte que la DIRECTION de l'empreinte change avec le régime. ",
            "Sur le banc R385 (7 V de moyenne PWM, trois régimes de charge), les distances cosinus inter-régimes mesurées valent 0,32 / 0,15 / 0,58 : toutes au-dessus du seuil d'assignation 0,05, avec un bruit intra-régime sous 1e-3.",
        ]),

        H2("II.4 La découverte qui a réorienté la semaine : le streaming fractal était cassé"),
        P([
            "Au moment d'écrire le graphe de démonstration, vérification de la mécanique d'insertion d'un modèle ONNX comme nœud : le routage d'entrée d'un graphe embarqué comparait le slot CÔTÉ SOURCE du canal (le nom de sortie du producteur amont) au lieu du slot de destination ; les canaux frontière que le mécanisme exigeait n'étaient créés nulle part ; et leurs constructeurs dans le builder étaient inutilisables (ils plantaient à la construction : cassés depuis leur création, jamais exercés). ",
            "Autrement dit : la promesse « déposer un modèle et le câbler » de l'éditeur n'avait jamais pu fonctionner en flux.",
        ]),
        P([
            "Un chantier core dédié a établi le contrat de câblage par NOM de tenseur (toSlot côté entrée, fromSlot côté sortie), créé les canaux frontière au chargement du modèle, ajouté une session à valeur portée pour les ports pendants, et invalidé proprement les topologies internes au remplacement de modèle. ",
            "Portes de régression larges : les suites onnx, dsp, ml, exécution, et les chaînes ONNX historiques (driverv2, cardriver) comme canaris du chemin infer(). Résultat inattendu et bienvenu : ",
            B("7 tests préexistants du dépôt, en échec avant le projet, sont passés au vert"),
            " : la perte de jetons sur canaux pendants était leur cause racine commune.",
        ]),

        H2("II.5 Les graphes : deux leçons de câblage et un test phare"),
        P([
            "Les quatre graphes sont GÉNÉRÉS par un script Python (les indices de ports des connexions, à la main, ne survivent pas) puis validés par un chargeur headless qui reproduit exactement les règles de l'éditeur (création par registre, désérialisation des champs, canaux par noms, rattachement automatique du solveur via la scène). Premier passage : 5 tests sur 9.",
        ]),
        ...BUL([
            [B("Leçon 1, le cycle de charge"), " : omega vers la loi de charge vers tau_load vers le moteur est un CYCLE. Sur le moteur CC (ports « signal », écrasement sans file) le fil direct passe ; sur la machine à cage (ports « stream ») il fait déborder les canaux. Le graphe de référence avait montré la solution : un canal de retour Z-1. Les graphes triphasés l'utilisent."],
            [B("Leçon 2, le canal fantôme"), " : la chaîne mono-canal envoyait des fenêtres [64] (rang 1) à une transposition qui exige le rang 2 ; le multiplexeur, même à une seule entrée, donne la dimension canal ([64,1])."],
        ]),
        P([
            "Après correction : 10 tests sur 10, dont le test phare du projet : charger ", CODEIN("motorwatch-r385.spikypanda"),
            " tel quel, téléverser l'encodeur dans le nœud modèle DU GRAPHE CHARGÉ (le même chemin validé que la station), faire tourner : le profil de base se crée, puis un échelon de charge appliqué PAR LE SEUL FIL tau_load fait découvrir un second régime. Le fichier versionné est, littéralement, un moniteur open-set en boîte.",
        ]),

        H2("II.6 Sous-projet 2 : la cage d'écureuil de bout en bout"),
        P([
            "Le scénario industriel complet a été rejoué sur la machine à cage, avec un choix de traitement assumé : la façade capteur reçoit une ENVELOPPE démodulée du courant (RMS glissant sur EXACTEMENT une période d'alimentation, dt = 1/(60 x 84) pour annuler la porteuse), pas le 60 Hz brut. C'est la pratique MCSA standard, et c'est ce qui rend la signature lisible par l'encodeur de niveau : l'asymétrie de barres module l'enveloppe à 2.s.f (environ 10,6 Hz ici) avec une profondeur en k/N (mesurée : 4,2 % à sévérité 1, 8,0 % à sévérité 2).",
        ]),
        ...NUM([
            ["Régime sain en charge (1,5 N.m, 80 V, 60 Hz) : ligne de base silencieuse."],
            ["Cassure de 2 barres déclenchée À CHAUD à t = 5 s, moteur en marche : EXACTEMENT une alarme NEW_REGIME."],
            ["Diagnostic différentiel poussé par la station (3 causes) : « broken_rotor_bar » gagne avec une marge de 3,1 ; le label atterrit au catalogue ET au capteur ; export, import au site B, fusion : compte sommé, sites « site-A,site-B », et le site B résout localement une empreinte de défaut voisine."],
            ["Contre-épreuve : un ÉCHELON DE CHARGE sain (1,5 vers 2,0 N.m, glissement 0,125 contre 0,088 pour le défaut) crée un troisième régime, diagnostiqué « load_change » : le modèle de diagnostic discrimine bien la cause, il ne crie pas « barre cassée » à chaque nouveauté."],
        ], "numsp2"),
        ...ENCADRE("Résultat de physique au passage : le PMSM en V/f boucle ouverte", [
            ["Avec la résistance par défaut (0,5 ohm), le rotor à faible inertie POMPE et saute des pôles à la moindre perturbation (vitesse oscillant entre 56 et 233 rad/s) : le banc PMSM était inexploitable. R = 2,0 ohm amortit le mode oscillant (stabilité V/f classique) et les deux régimes se verrouillent exactement à 157,08 rad/s, rendant la signature purement électrique. Le test du sous-projet 2 documente ce réglage dans son en-tête."],
        ]),

        H2("II.7 Vérification globale et preuve de non-régression"),
        ...BUL([
            ["Suite complète du dépôt : 1 193 tests verts sur 1 198. Les 5 échecs restants ont été PROUVÉS antérieurs au projet : un arbre de travail propre sur le commit de départ (worktree dédié) reproduit exactement les mêmes 5 échecs (mpc, scénarios PMSM du paquet sensors, session de simulation, deux tests du scheduler dynamique et un du statique)."],
            ["L'éditeur vérifié au navigateur : les 9 plugins se chargent (dont le nouveau ml), 156 types de nœuds dans la palette, zéro erreur console."],
            ["Construction TypeScript complète et bundles webpack de tous les paquets touchés (core, onnx, physics, dsp, ml, onnx-éditeur) déployés vers l'hôte."],
            ["Un faux suspect : deux tests d'ENTRAÎNEMENT de réseaux (XOR, CNN) ont flanché pendant un passage global lancé en concurrence avec les agents : initialisation aléatoire non semée + contention CPU. Trois passages isolés verts, et le passage global propre les confirme : flakiness préexistante, pas une régression."],
        ]),

        H2("II.8 La revue contradictoire : neuf défauts réels que les tests rataient"),
        P([
            "Tout étant vert, une revue adversariale a été lancée : quatre dimensions (rayon d'impact core, physique, fidélité du portage clustering, contrats application/protocole), chaque finding contre-vérifié par un agent chargé de le RÉFUTER, reproduction exécutée à l'appui. ",
            "Un réviseur est mort en vol (erreur réseau) : sa dimension a été rejouée par reprise du workflow (les résultats déjà acquis étant servis depuis le cache). Bilan : 9 défauts confirmés (3 majeurs, 6 moyens), plusieurs allégations réfutées avec preuves, et une grappe de défauts mineurs. ",
            "Tous les confirmés ont été corrigés selon la même discipline : test de reproduction d'abord (échec constaté), correctif ensuite, portes de régression larges enfin. Le détail complet est en annexe B ; les trois majeurs et deux leçons méritent le corps du texte :",
        ]),
        ...BUL([
            [B("Fan-out de sortie d'un modèle embarqué"), " (majeur) : la valeur d'un port de sortie était CONSOMMÉE par le premier canal parent ; tout deuxième consommateur (modèle vers détecteur ET courbe, un câblage d'éditeur banal) était affamé en silence. Correctif : lire une fois, publier à tous les canaux concordants, consommer une fois."],
            [B("Modèle partiellement câblé"), " (majeur) : à moitié alimenté, le graphe interne débordait au deuxième tick et l'exception TUAIT la session parente, avec un message désignant un slot interne que l'utilisateur n'a jamais câblé. Correctif : exécution « tout ou rien » sur les ports déclarés ; les jetons orphelins sont jetés, la session vit."],
            [B("Le déclencheur de re-clustering en port de données"), " (majeur) : le runtime compte TOUT port de données câblé comme requis (l'attribut « optional » est mort à l'exécution) ; câbler le déclencheur gelait donc le nœud puis faisait déborder le canal d'empreintes. Correctif : passage au plan de contrôle (« _recluster », drainé par processControlInputs), conformément à la convention du plugin logic ; et la sortie k n'est plus publiée qu'une fois par tir."],
        ]),
        ...ENCADRE("Leçon 1 : une revue qui s'exécute vaut dix relectures", [
            ["Chaque finding confirmé l'a été par REPRODUCTION (test jeté ou script), pas par plausibilité. Plusieurs allégations bien argumentées ont été réfutées de la même manière : la « fuite de confidentialité » du centroïde dans les alarmes est un contrat adapté, documenté et testé (un régime moteur n'identifie personne) ; le « double comptage » de la fusion n'existe pas dans la topologie supportée (recalcul depuis les feuilles)."],
        ]),
        ...ENCADRE("Leçon 2 : le correctif qui casse plus loin que ses portes", [
            ["Le correctif « pendingInput consommé à la lecture » (contre le mélange de tenseurs frais et périmés) a cassé l'entraînement CNN du dépôt : les boucles d'entraînement injectent UNE fois et relisent à chaque passe. Les portes de régression du chantier ne couvraient pas ces consommateurs lointains. Sémantique finale : PERSISTANCE sur les nœuds source purs (aucun canal entrant : le mélange y est impossible), consommation à la lecture uniquement sur la branche frontière. Moralité : pour un changement de core, la porte de régression minimale est la suite COMPLÈTE du dépôt."],
        ]),
        P([
            "Côté physique, deux corrections de fond issues de la même revue : la loi quadratique de charge devait être SIGNÉE (k.omega.|omega| ; la version k.omega2 propulsait un moteur en rotation inverse jusqu'au NaN, reproduit numériquement) ; et le taux d'échantillonnage auto-déclaré de la machine à cage ignorait la résistance rotorique (glissement faussé de moitié au taux déclaré, divergence d'Euler dès Rr supérieur à 19 fois Rs, reproduites toutes deux). Le taux est désormais calé sur le vrai pôle rapide et les calibrations de l'en-tête sont RÉ-ANCRÉES au taux déclaré (~9,8 kHz) : raies à 3,5 % (2/28) et 6,7 % (4/28), glissement 9,2 % contre 10,1 % pour la référence sur-échantillonnée x4.",
        ]),
        P([
            "Côté application, deux moyens : une trame pouvait chevaucher un changement de régime via la fenêtre d'hystérésis de la porte (3 % des transitions environ : régime fantôme reproduit ; corrigé par une quarantaine de breakHold-1 échantillons dans la façade, la porte et son contrat restant intacts) ; et un modèle de diagnostic au mauvais nombre de scores passait la validation puis échouait APRÈS la bascule (demi-engagement ; corrigé par la validation de FORME de sortie avant bascule, plus un chemin d'exécution qui distingue « chargement réussi, exécution échouée »).",
        ]),

        H2("II.9 État final"),
        TABLE(
            ["Vérification", "Résultat"],
            [
                ["Suites du périmètre motorwatch (15 suites)", "139 / 139 verts"],
                ["Dépôt complet", "1 193 / 1 198 (5 échecs prouvés antérieurs, 7 antérieurs réparés)"],
                ["Construction TypeScript (tsc -b, toutes références)", "propre"],
                ["Bundles webpack + déploiement hôte", "tous les paquets touchés, propres"],
                ["Éditeur nodeeditor v2 au navigateur", "9 plugins, 156 types, 0 erreur console"],
                ["Lint / format sur les fichiers touchés", "propres (eslint + prettier)"],
            ],
            [5800, 3838]
        ),
        H2("II.10 Retour d'usage immédiat : sept défauts signalés aux premiers essais"),
        P([
            "Les premiers chargements et les premières exécutions des graphes par le donneur d'ordre ont remonté sept anomalies, toutes réelles, toutes corrigées dans la foulée (avec la réponse à la question légitime « comment cela peut-il fonctionner ? » : le runtime ne valide JAMAIS les types de ports, qui sont des métadonnées d'interface ; seul le rendu de l'éditeur signale l'incohérence, et les tests headless activaient eux-mêmes les plugins manquants ou tournaient à une cadence qui masquait le défaut).",
        ]),
        ...BUL([
            [B("Fil « tensor vers float » signalé invalide"), " (multiplexeur vers tampon de fenêtres) : le port d'entrée du tampon déclarait encore « float » alors que le nœud avait appris les lignes tenseur. Le type déclaré a été élargi à « any » dans le nœud ET dans son enregistrement ; les graphes sont régénérés en conséquence."],
            [B("Le Feedback chargé en boîte unique, fils de boucle dessinés"), " : la cause était une divergence entre deux chemins de l'éditeur. Au dépôt depuis la palette, la définition visuelle d'un nœud est construite depuis le MÉTA du registre (nombre d'ancres de la vue scindée, routage des ports par ancre, ports de contrôle, descripteurs variadiques) ; au CHARGEMENT d'un fichier, elle était reconstruite depuis les seules listes de ports sauvegardées, qui ne portent rien de tout cela. Correctif générique dans l'éditeur : un enrichissement de la définition par le méta (fonction pure, testée sans DOM), qui préserve l'ORDRE des ports du fichier (les connexions s'y réfèrent par indice, et les ports variadiques poussés n'existent que là) tout en faisant revenir ancres, types faisant autorité, contrôles et variadiques. Vérifié au navigateur sur les graphes livrés : Feedback en deux demi-pavés aux positions sauvegardées, zéro lien incompatible, et le port libre suivant du multiplexeur (in_3) poussé au chargement comme au dépôt."],
            [B("Plantage au Play (« this._ofin.opsc is not a function »)"), " : la page node-editor-v2 ne chargeait PAS le plugin ONNX (jamais référencé : ni balise script, ni appel de chargement), donc « spk.onnx:model » manquait au registre, le nœud encodeur se chargeait en « layout-only » (sa donnée restait le blob JSON brut du fichier) et le constructeur de canal explosait au câblage de la session. Double correctif : le plugin ONNX est désormais chargé par la page (le nœud modèle et Conv rejoignent la palette), ET le constructeur de session ignore proprement, avec avertissement, tout fil dont une extrémité est layout-only (le même duck-typing que la collecte des nœuds : sans fire(), pas de câblage) : un typeId manquant ne tue plus jamais le Play, il prive seulement son nœud de ses fils. Vérifié au navigateur : bootstrap du Play sans erreur, moteur intégré en pas-à-pas (i = 0,66 A après 40 pas)."],
            [B("Les nœuds Start / Stop perdus à la désérialisation"), " : l'intuition « la désérialisation ne reconstruit pas un nœud correct » a été vérifiée champ par champ : les valeurs des nœuds TYPÉS revenaient toutes exactes (moteur, potentiomètre, charge, porte, clusterer). Le vrai coupable était structurel : l'hôte créait les nœuds de cycle de vie Start / Stop SANS typeId ; toute sauvegarde les réduisait donc à des blobs JSON au rechargement, Session.start() ne trouvait plus de StartNode à armer, et tout câblage « Start vers déclencheur » mourait en silence. Correctif générique : les nœuds de cycle de vie sont désormais enregistrés comme tout le monde (Core.Lifecycle:start / :stop), l'hôte les crée via le registre, et les graphes livrés les typent. Vérifié au navigateur : après save puis load, Start et Stop reviennent en vraies instances (fire et arm présents) ; le seul nœud non runtime restant est la scène Earth, par conception (GraphItem consommé par liens de configuration)."],
            [B("La rampe de charge non bornée"), " : le profil « ramp » montait pour toujours (tau0 + pente x t), dépassait le couple de décrochage du R385 (~45 mN.m à 6,7 V) et surtout ne se STABILISAIT jamais : aucun régime établi, donc aucune fenêtre, donc aucune alarme possible. Nouvelle sémantique : la rampe dérive de tau0 VERS tau1 puis tient le palier (la dérive lente VERS un nouveau régime, que la porte peut capturer)."],
            [B("Le papillotement de la porte à la cadence dérivée"), " : à 200 kHz (20 x fPwm exigés par l'onduleur), l'ondulation PWM est résolue à +/- 6 % alors que la tolérance de la porte est de 5 % : la porte n'accumulait jamais ses échantillons stables et la chaîne restait muette : la SECONDE cause du « jamais d'alarme ». Les tests headless tournaient à 10 kHz, où le PWM s'échantillonne en stroboscope : ils ne pouvaient pas le voir (leçon : la cadence est un paramètre de test). Correctif générique : un lissage EMA optionnel de la DÉCISION de stabilité (smoothAlpha, défaut 1 = inchangé) ; value_gated continue de transmettre les échantillons BRUTS à l'encodeur. Le graphe livré règle smoothAlpha 0,01 et des temporisations adaptées. Vérifié dans l'éditeur : l'alarme NEW_REGIME (sévérité warn) atteint le bus d'alertes."],
            [B("Les booléens invisibles du panneau de propriétés"), " : « je n'ai pas yAuto » : exact, et le champ était pourtant bien déclaré éditable ; c'est le panneau qui ne savait pas rendre les BOOLÉENS (les widgets intégrés couvraient nombre, chaîne et vecteurs). Un éditeur case à cocher générique a été ajouté : yAuto, dbScale, add_batch_dim et tous les booléens du système apparaissent désormais. Au passage, le cache-buster des bundles (?v=p41), jamais incrémenté pendant les correctifs du jour, a été bumpé : un navigateur au cache tiède pouvait servir d'anciens bundles et brouiller le diagnostic."],
        ]),
        P([
            "Deux retouches d'ergonomie ont immédiatement suivi l'apparition de la case yAuto (le réglage, invisible jusque-là, n'avait jamais été exercé) : au passage en échelle manuelle, le tracé sautait sur les bornes par défaut [-1, 1] et disparaissait si le signal en sortait ; le plot capture désormais l'ÉCHELLE VISIBLE courante comme bornes (sémantique oscilloscope, vérifié au navigateur : bascule à [-0,30, 3,10] sans saut). Et le nœud Print String, fidèle à la sémantique UE5 (déclencheur sur in, contenu sur text), affichait une ligne vide quand on lui câblait directement une charge utile : il imprime désormais la charge non-trigger arrivée sur in, et un jeton sur text seul suffit à déclencher (mode données), sans casser le mode exec historique (4 tests).",
        ]),
        H2("II.11 La contrainte d'acquisition : le capteur reprend son horloge"),
        P([
            "Le diagnostic du papillotement (II.10) a fait émerger chez le donneur d'ordre une contrainte de conception plus profonde : ",
            B("les capteurs ont leur propre capacité d'échantillonnage"),
            ", indépendante du pas de la simulation. Profil imposé (référencé IEC 61430 / 61407) : 10,24 kHz, blocs de 2 048 échantillons, 200 ms. ",
            "Le portage de cette contrainte a remplacé le contournement par la bonne architecture : un nœud d'acquisition générique (DSP.Acquire:daq) dont l'horloge dérive du temps simulé (mêmes blocs que la session tourne à 20 kHz ou à 200 kHz : la propriété est testée), avec anti-repliement, RMS par bloc, et rafales bornées. ",
            "Bénéfices immédiats mesurés : la porte de régime travaille au RMS par bloc (le lissage au niveau échantillon devient inutile dans le graphe livré) ; la FFT passe à 2 048 points et gagne la résolution de 5 Hz qui sépare réellement les bandes latérales MCSA ; et le scénario complet a été rejoué dans l'éditeur au profil par défaut : 16 blocs de référence (RMS 0,654 A), échelon de charge par l'unique fil tau_load, RMS 1,616 A, nouveau régime découvert et alarme NEW_REGIME sur le bus. ",
            "Le re-fenêtrage bloc vers fenêtre encodeur utilise les nœuds existants (Frame 64 / hop 2048 : le cliché de tête de bloc), et le risque résiduel de fenêtre à cheval sur une transition tombe à 64/2048 = 3 % par changement de régime (la quarantaine de la façade capteur le couvre côté MCU).",
        ]),
        P([
            I("Lacune d'éditeur notée au passage (annexe D) : la sauvegarde ne sait pas sérialiser les connexions de ports de CONTRÔLE (l'index est cherché dans les ports de données) ; les graphes livrés n'en utilisent donc pas."),
        ]),
        H2("II.12 La grenouille bouillie : l'ancre de référence"),
        P([
            "Dernier retour du donneur d'ordre, et le plus profond : en mode rampe de charge, AUCUN changement de régime n'est détecté. Son diagnostic était déjà la solution : ",
            B("« une fois qu'une référence est acquise, on doit la garder comme un snapshot, sinon un dérèglement progressif dans le temps ne sera jamais détecté »"),
            ". L'analyse du code a confirmé le mécanisme exact : quand chaque pas de la rampe reste sous update_thr (0,02), le centroïde du profil SUIT le signal par lissage EMA ; la référence marche AVEC la dérive, la distance d'assignation ne croît jamais, et une machine peut s'user jusqu'à sortir complètement de sa ligne de base sans une seule alarme. C'est le problème de la grenouille bouillie. Le seuillage update_thr hérité de DriverV2 était le compromis anti-dérive pour des CONDUCTEURS, dont le profil comportemental ne doit pas ramper ; une machine industrielle, elle, DÉRIVE par conception (l'usure), et le suivi seul est un angle mort.",
        ]),
        P([
            "Le correctif suit l'intuition à la lettre : chaque profil garde désormais une ANCRE, cliché immuable de son centroïde pris à la création. À chaque assignation, le centroïde de suivi est comparé à l'ancre ; passé drift_thr (défaut 0,1, soit 2 x assign_thr : une référence qui a silencieusement marché deux fois le rayon de l'ensemble ouvert n'est plus la référence apprise), le nœud publie UNE alarme REGIME_DRIFT (sévérité warn, charge utile portant driftSteps) et RÉ-ANCRE le profil sur son centroïde courant. Sémantique d'escalier : chaque alarme signifie « la référence a bougé d'encore drift_thr depuis la dernière ancre » ; une dérive continue produit un train régulier d'alarmes au lieu du silence, un régime stable n'en produit aucune. Le recalcul par lots (_recluster) reste un RE-BASELINING délibéré : profils reconstruits, ancres fraîches, compteurs remis à zéro ; et drift_thr 0 désactive tout (l'ancien comportement, conservé comme épingle de régression).",
        ]),
        P([
            "Une correction de géométrie mérite la trace : la distance cosinus est QUADRATIQUE en angle, donc le nombre de marches d'une dérive angulaire constante suit la longueur d'ARC (floor(angle total / acos(1 - drift_thr))), pas le quotient naïf distance totale / drift_thr, géométriquement inatteignable ; les tests épinglent l'attendu correct à plus ou moins une marche.",
        ]),
        P([
            "Côté protocole, le code d'alarme du fil s'élargit à « NEW_REGIME | REGIME_DRIFT » ; la façade capteur transmet la dérive SANS suppression de démarrage à froid (une dérive lente du régime de base commence légitimement à k = 1, c'est précisément le signal pour lequel l'ancre existe). Validation : 60 / 60 tests verts, dont la nouvelle suite de dérive (épingle de régression drift_thr 0 sur 500 pas de rotation lente, escalier de 4 marches sur une rotation de 2pi/3 en Session réelle, échelon net sans fausse dérive, 4 000 pas de gigue bénigne sans alarme, ré-ancrage au recluster, traversée du bus d'alertes) et un test bout-en-bout : rampe d'enveloppe 0,3 vers 1,4 A sur ~620 fenêtres, zéro NEW_REGIME (suppression à froid intacte), escalier REGIME_DRIFT croissant jusqu'au flux de notifications du serveur.",
        ]),
        P([
            "Et la preuve a été rejouée en direct dans l'éditeur, sur le scénario exact du rapport d'origine : graphe R385 livré, encodeur chargé et validé (sha256), profil de charge en rampe LENTE. Pendant seize secondes simulées de dérive, zéro création de profil (l'angle mort d'avant, reproduit) ; à la marche 0,1, l'alarme « REGIME_DRIFT label=2 step=1 distance=0.1006 » est apparue sur le bus d'alertes et le ré-ancrage s'est observé en direct (distance à l'ancre retombée de 0,0918 à 0,0001). Les graphes livrés exposent drift_thr (0,1) en éditable et drift_count en lecture.",
        ]),
        P([
            I("Note de méthode : aucun commit n'a été créé pendant le projet ; l'arbre de travail porte l'intégralité du livrable, et ce cahier est généré depuis des sources versionnées à ses côtés."),
        ]),
    ];
};
