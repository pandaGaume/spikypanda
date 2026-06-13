// Chapitre 1 : abstract non technique.
module.exports = (h) => {
    const { H1n, H2, P, B, BUL, TABLE, ENCADRE } = h;
    return [
        H1n("Résumé pour lecteur non technique"),

        H2("De quoi s'agit-il ?"),
        P([
            "Ce dossier décrit la conception et la réalisation d'un système de surveillance de machines électriques capable de répondre, sans aucune configuration préalable, à la question : ",
            B("« cette machine est-elle en train de changer de comportement, et pourquoi ? »"),
        ]),
        P([
            "Le principe : une pince de courant (un capteur bon marché, posé sur un câble d'alimentation, sans rien démonter) observe en continu le courant que consomme un moteur. ",
            "La forme de ce courant est une signature : un moteur à vide, un moteur chargé, un moteur dont un composant commence à se dégrader ne « consomment » pas de la même façon. ",
            "Un petit programme d'intelligence artificielle transforme quelques dizaines de millisecondes de courant en une empreinte mathématique, et regroupe les empreintes qui se ressemblent. ",
            "La machine découvre ainsi TOUTE SEULE ses « régimes de fonctionnement », sans qu'on lui ait jamais dit combien il en existe ni à quoi ils ressemblent : c'est ce qu'on appelle le fonctionnement en « ensemble ouvert » (open-set).",
        ]),
        P([
            "Quand un régime jamais vu apparaît, le capteur lève une alarme vers un poste central. ",
            "Le central peut alors lui téléverser, à chaud et sans redémarrage, de petits modèles d'IA de diagnostic : « est-ce une surcharge ? un déséquilibre d'alimentation ? une barre rotorique cassée ? ». ",
            "Le verdict permet de poser une étiquette (« barre cassée ») qui est mémorisée localement par le capteur ET partagée entre les sites industriels : ce qu'un site a appris, les autres le savent. ",
            "C'est le portage industriel direct de la recette validée dans le projet DriverV2 (regroupement anonyme de conducteurs) : son cahier de référence identifiait ce portage comme l'application transverse au meilleur rapport information/coût (partie V.2.1).",
        ]),

        H2("Ce qui a été réalisé"),
        P("Le travail couvre la chaîne complète, du moteur simulé jusqu'au partage d'étiquettes entre sites, en deux sous-projets et sept volets :"),
        ...BUL([
            [B("Sous-projet 1 : moteur à courant continu R385"), " : un petit moteur de modélisme servant de banc d'essai réaliste (mêmes paramètres que le banc physique : résistance, inductance, inertie), alimenté par un onduleur PWM simulé et lu à travers un capteur de courant bruité. Le scénario complet y est démontré : trois régimes de charge successifs, deux alarmes « nouveau régime », diagnostics poussés à chaud, étiquettes fédérées entre deux sites."],
            [B("Sous-projet 2 : moteurs triphasés"), " : les moteurs brushless existants (PMSM/BLDC) sont couverts, et surtout un ", B("moteur asynchrone à cage d'écureuil a été modélisé de zéro"), " (il n'existait pas dans la plateforme), avec le défaut industriel emblématique : les barres rotoriques cassées. La cassure est simulée physiquement (asymétrie de résistance du rotor) et produit exactement la signature attendue par la littérature : des raies latérales dans le spectre du courant, dont l'amplitude croît avec le nombre de barres cassées. Le scénario y est rejoué : barres cassées EN COURS DE FONCTIONNEMENT, une seule alarme, diagnostic différentiel correct (« barre cassée », et non « changement de charge »), étiquette propagée à un second site."],
            [B("Des briques génériques rangées au bon endroit"), " : selon la règle fixée en début de projet, tous les composants réutilisables sont des « nœuds » de l'éditeur graphique nodeeditor v2 (et non du code privé de l'application) : générateur de couple de charge, détecteur de régime établi, multiplexeur de phases, fenêtres multi-canaux, et un tout nouveau plugin d'apprentissage automatique (clustering open-set). L'application elle-même ne contient QUE la logique métier."],
            [B("Une réparation profonde du moteur d'exécution"), " : faire circuler des tenseurs à travers un modèle ONNX inséré comme nœud d'un graphe (le « streaming fractal ») ne fonctionnait pas : le mécanisme prévu était cassé depuis sa création et n'avait jamais été utilisé. Sa remise en état a au passage réparé 7 tests de la plateforme qui échouaient AVANT ce projet."],
            [B("Le téléversement de modèles durci"), " : empreinte cryptographique (SHA-256), vérification du contrat d'entrées/sorties, bascule atomique « double banque » : un modèle rejeté laisse l'ancien parfaitement intact, y compris pour les erreurs subtiles (mauvais nombre de scores pour la liste de causes)."],
            [B("Quatre graphes de démonstration versionnés"), " : éditables dans l'éditeur graphique, rechargeables, et conçus pour la réutilisation : le bloc moteur est indépendant de sa charge (un seul fil à remplacer pour changer la loi de charge), et un test automatique recharge ces fichiers « comme l'éditeur » et vérifie qu'ils tournent."],
            [B("Une revue contradictoire systématique"), " : une trentaine d'agents de relecture ont attaqué le code livré ; chaque défaut allégué a été contre-vérifié par reproduction exécutée. Neuf défauts réels que les tests rataient ont été confirmés puis corrigés (avec, pour chacun, un test qui échoue avant le correctif et passe après)."],
        ]),

        H2("Le travail en chiffres"),
        TABLE(
            ["Indicateur", "Valeur"],
            [
                ["Fichiers créés / modifiés", "47 créés (8 877 lignes TypeScript) / 22 modifiés (+1 605 / -859 lignes)"],
                ["Nouveaux nœuds d'éditeur", "6 (couple de charge, moteur à induction, détecteur de régime établi, multiplexeur, transposition, clusterer open-set) + extension multicanal du tampon de fenêtres"],
                ["Nouveau plugin", "@spikypanda/plugin-ml (clustering open-set, bibliothèque + nœud)"],
                ["Tests automatiques du périmètre", "15 suites, 139 tests, tous verts"],
                ["Tests du dépôt complet", "1 193 verts / 1 198 (les 5 échecs restants sont antérieurs au projet, preuve à l'appui)"],
                ["Tests préexistants RÉPARÉS par le projet", "7 (perte de jetons sur les ports frontière du moteur d'exécution)"],
                ["Défauts confirmés par la revue contradictoire puis corrigés", "9 (3 majeurs, 6 moyens) + 8 mineurs"],
                ["Graphes de démonstration versionnés", "4 fichiers .spikypanda (format v3 de l'éditeur)"],
                ["Modèles ONNX livrés en binaire", "0 : tous les modèles de test sont synthétisés à la volée, à poids fixés"],
            ],
            [5200, 4438]
        ),

        H2("Les résultats, en langage courant"),
        ...BUL([
            ["Sur le banc R385 : trois régimes de charge appliqués successivement sont découverts comme ", B("trois profils distincts"), " ; le premier (mise en service) est silencieux par contrat, les deux suivants lèvent ", B("exactement une alarme chacun"), ", sont diagnostiqués (« palier de surcharge », « loi de ventilateur ») et leurs étiquettes survivent à l'export, à l'import et à la fusion entre deux sites."],
            ["Sur le moteur à cage : deux barres cassées sur 28 produisent une raie latérale basse à ", B("3,5 % du fondamental"), " (7 % pour quatre barres : la proportionnalité au nombre de barres attendue par la théorie est mesurée). La cassure déclenchée EN MARCHE est détectée comme un régime nouveau, et le diagnostic différentiel répond « barre rotorique cassée » là où un simple changement de charge, testé en contre-épreuve, est correctement étiqueté « changement de charge »."],
            ["Dans l'éditeur graphique : le graphe de démonstration chargé tel quel devient un ", B("moniteur vivant"), " dès qu'on y téléverse l'encodeur : il découvre un régime quand on change la charge, en direct. Vérifié au navigateur : 156 types de nœuds, zéro erreur console."],
        ]),
        P([
            "Honnêteté sur le périmètre : l'encodeur (le réseau qui transforme le courant en empreinte) utilisé dans les tests et la démo est ",
            B("synthétique à poids fixés"),
            ", mais à la TOPOLOGIE EXACTE de la référence DriverV2 : trois étages de convolution 1D, moyennage global, tête dense (493 paramètres, contre 5 224 pour l'encodeur DriverV2 entraîné). Il démontre l'architecture ET valide le jeu d'opérateurs cible (Conv, GAP) sur toute la chaîne (export, téléversement validé, streaming dans l'éditeur), pas la performance d'un modèle entraîné. ",
            "L'entraînement d'un encodeur industriel réel et sa campagne « simulation vers réel » sont exactement le travail que le cahier DriverV2 décrit en partie V.3 : c'est l'étape suivante naturelle, pas un oubli.",
        ]),

        H2("Les questions encore ouvertes"),
        ...BUL([
            [B("L'encodeur entraîné"), " : reproduire pour le courant moteur ce qui a été fait pour la conduite dans DriverV2 (simulateur statistiquement réaliste, entraînement contrastif, transfert gelé mesuré sur données réelles, par exemple le jeu public UFU de barres cassées)."],
            [B("Le transport réel"), " : le protocole capteur-central est complet mais câblé en mémoire (in-process) ; le branchement MQTT/BLE et le découpage en trames du téléversement restent à faire."],
            [B("Le re-clustering périodique"), " : le déclencheur existe sur le nœud (plan de contrôle) mais n'est pas encore exposé comme outil du protocole ; sur un capteur allumé des mois, c'est le mécanisme de résorption de la sur-segmentation."],
            [B("Le portage microcontrôleur"), " : comme pour DriverV2, tout est dimensionné pour l'embarqué (modèles de quelques kilo-octets, clustering en arithmétique pure) mais la compilation sur cible reste à faire."],
        ]),

        ...ENCADRE("Comment lire ce dossier", [
            ["La ", B("partie I"), " décrit le système tel qu'il est construit : la chaîne du capteur, les moteurs simulés, le moteur d'exécution, le central et la fédération. La ", B("partie II"), " est le journal de réalisation : chaque décision, chaque découverte, chaque échec instructif, dans l'ordre où ils sont arrivés, y compris les neuf défauts trouvés par la revue contradictoire et la façon dont ils ont été confirmés puis corrigés. La ", B("partie III"), " donne tout ce qu'il faut pour reconstruire et étendre le système (fichiers, commandes, contrats d'interface, calibrations). Les ", B("annexes"), " contiennent la correspondance brique à brique avec le cahier DriverV2, le détail des défauts corrigés, les limites connues et un glossaire."],
        ]),
    ];
};
