// Annexes A a F.
module.exports = (h) => {
    const { H1, H2, P, B, I, CODEIN, BUL, ENCADRE, TABLE } = h;
    return [
        H1("ANNEXES"),

        H2("Annexe A : correspondance brique à brique avec le cahier DriverV2"),
        P([
            "Le cahier DriverV2 (partie V.1) recensait quatre briques réutilisables et une méthodologie. Voici leur incarnation exacte dans motorwatch :",
        ]),
        TABLE(
            ["Brique DriverV2", "Incarnation motorwatch", "Ce qui a changé"],
            [
                ["Brique 1 : invariance au montage (repère véhicule)", "sans objet direct : le courant n'a pas d'orientation", "remplacée par la normalisation d'enveloppe (référence de mise en service)"],
                ["Brique 2 : acquisition événementielle (manœuvres)", "DSP.Detect:steadystate + quarantaine", "sémantique INVERSÉE : on capture les états établis, pas les transitoires ; la machine à états à hystérésis est la même"],
                ["Brique 3 : encodeur ~20 Ko, boîte noire ONNX", "contrat identique (fenêtre vers empreinte normalisée)", "l'encodeur livré est synthétique à poids fixés ; l'entraînement contrastif sur simulateur est l'étape V.3 à rejouer"],
                ["Brique 4 : clustering anonyme à k émergent", "plugin ml : portage ligne à ligne (assignation en ligne + agglomératif à seuil absolu)", "historique borné en anneau ; déclencheur de re-clustering déplacé sur le plan de contrôle ; alarme câblable au bus d'alertes"],
                ["Méthodologie : sim vers réel, négatifs documentés", "journal partie II ; revue contradictoire avec reproductions", "ajout : la revue adversariale multi-agents comme étape de sortie"],
            ],
            [2700, 3600, 3338]
        ),
        P([
            "S'y ajoutent les pièces NOUVELLES propres au scénario industriel : le téléversement de modèles au runtime (que l'API DriverV2 notait explicitement « hors périmètre, canal OTA à part »), le diagnostic différentiel, le catalogue labellisé et la fédération entre sites.",
        ]),

        H2("Annexe B : les neuf défauts confirmés par la revue, et leurs correctifs"),
        TABLE(
            ["Défaut (sévérité)", "Où", "Correctif"],
            [
                ["Fan-out de sortie d'un modèle embarqué : seul le premier consommateur servi (MAJEUR)", "core / routage fractal", "lecture unique par port, publication à tous les canaux concordants, consommation unique"],
                ["Modèle partiellement câblé : débordement interne au tick 2, session parente tuée (MAJEUR)", "core / routage fractal", "exécution « tout ou rien » sur les ports déclarés ; jetons orphelins jetés"],
                ["Déclencheur de re-clustering en port de données : gel puis débordement (MAJEUR)", "plugin ml / nœud clusterer", "port de plan de contrôle « _recluster » + drapeau drainé ; k publié une seule fois par tir"],
                ["pendingInput périmé mélangé aux jetons frais (MOYEN)", "core / kernel", "persistance sur source pure, consommation à la lecture sur la branche frontière (après un premier correctif trop large qui cassait l'entraînement CNN)"],
                ["Loi quadratique de charge non passive : NaN en rotation inverse (MOYEN)", "plugin physics / LoadTorque", "loi signée k.omega.|omega| + borne « ne jamais entraîner »"],
                ["Taux requis de la machine à cage aveugle à Rr : glissement faussé de moitié, divergence Euler (MOYEN)", "plugin physics / induction", "vrai pôle rapide D/(Rs.Lr+Rr.Ls), marge 40/tau, plancher 80.f ; calibrations ré-ancrées"],
                ["Trame chevauchant un changement de régime via la fuite d'hystérésis (~3 % des transitions) (MOYEN)", "application / façade capteur", "quarantaine de breakHold-1 échantillons, vidée avant la remise à zéro du tampon ; la porte et son contrat restent intacts"],
                ["Téléversement de diagnostic à demi engagé sur mauvais nombre de scores (MOYEN)", "plugin onnx + application", "validation de FORME de sortie avant bascule ; « chargé mais non exécuté » distinct d'un rejet"],
                ["k publié deux fois dans un même tir (assignation + re-clustering) (MOYEN)", "plugin ml / nœud clusterer", "publication unique en fin de tir, valeur finale"],
            ],
            [4200, 1900, 3538]
        ),
        P([
            "Défauts mineurs corrigés dans la foulée : plage du glissement étendue à [-1, 2] (freinage en contre-courant) ; ingestion d'empreintes tolérante à tout tableau numérique (un tenseur Float64 était jeté en silence) ; restriction du repli de routage hérité (jeton mal aiguillé vers un port homonyme après remplacement de modèle) ; compteur de trames avalées exposé dans l'état du capteur ; l'effacement « profiles » purge aussi la dernière fenêtre et la dernière empreinte ; historique de la station en anneau borné + déduplication des téléversements par SHA (outil diagnostic_run sans transfert).",
        ]),

        H2("Annexe C : allégations réfutées (et pourquoi c'est important)"),
        ...BUL([
            [B("« Le centroïde dans les alarmes viole la règle de confidentialité DriverV2 »"), " : réfuté. La règle DriverV2 protège des EMPREINTES DE PERSONNES (un embedding de conduite identifie un humain) ; un centroïde de régime moteur n'identifie personne. L'adaptation est documentée dans l'en-tête du contrat et le chemin rapide du catalogue en dépend ; trois tests l'assèrent."],
            [B("« La fusion de catalogues double-compte l'évidence en cas de re-fédération »"), " : réfuté pour la topologie supportée. La fusion est une fonction pure recalculée depuis les catalogues FEUILLES ; nul ne re-fusionne un produit de fusion avec ses sources. Le mode d'emploi (une phrase) suffit ; la propriété mathématique sous-jacente (l'agglomération sur centroïdes n'est pas idempotente) est réelle mais inatteignable ici."],
            [B("« Le re-clustering efface des profils dont l'évidence a quitté l'historique borné »"), " : mécaniquement exact, mais inatteignable sur le capteur livré (rien n'y déclenche de re-clustering) et couvert par le contrat documenté « les étiquettes locales ne sont jamais stables à travers un re-clustering ». Conservé en annexe D comme piège latent."],
        ]),
        P([
            I("La valeur de cette annexe : la revue n'a pas seulement trouvé des défauts, elle a aussi établi par preuve ce qui N'EST PAS un défaut, et ces justifications sont désormais opposables aux relectures futures."),
        ]),

        H2("Annexe D : limites connues et travaux futurs"),
        ...BUL([
            [B("Encodeur entraîné"), " : la boucle « simulateur statistiquement réaliste, entraînement contrastif, transfert gelé mesuré sur réel » (DriverV2 partie V.3) reste à rejouer pour le courant moteur ; le jeu public UFU (barres cassées) est le candidat naturel pour la campagne de transfert."],
            [B("Re-clustering périodique"), " : le déclencheur existe (plan de contrôle) mais n'est exposé ni par un outil du protocole ni par la façade ; sur un capteur allumé des mois, c'est le mécanisme anti-sur-segmentation (et la liste de centroïdes n'est pas bornée, contrairement à l'historique)."],
            [B("Dérive lente des références de labels"), " : les centroïdes du clusterer suivent le régime (EMA) tandis que les références de labels et le catalogue gardent le centroïde de découverte ; un régime qui dérive lentement peut rester assigné mais perdre son label local. Piste : rafraîchir la référence au rythme de l'assignation."],
            [B("Rafales sur les ports de sortie fractals"), " : la session à valeur portée garde la DERNIÈRE valeur par port et par tir ; un sous-graphe qui émettrait plusieurs jetons sur un même port de sortie en un tir n'en livrerait qu'un (documenté ; file bornée si le besoin apparaît)."],
            [B("Producteurs ONNX multi-sorties"), " : l'appariement sortie-canal est positionnel dans le kernel ; exact pour les modèles à sorties uniques (la totalité du registre actuel), à indexer le jour où un opérateur multi-sorties réel arrive."],
            [B("Sim.Graph au chargement"), " : le JSON interne d'un sous-graphe sauvegardé n'est pas instancié par le runtime au chargement d'un fichier ; le jour où il l'est, l'encapsulation du bloc moteur redevient la forme naturelle des graphes de démonstration."],
            [B("Connexions de ports de contrôle non sérialisables"), " : la sauvegarde de l'éditeur cherche l'index du port dans les tableaux de ports de DONNÉES (assertion non nulle) ; un fil branché sur _enable / _started ferait échouer save(). Les graphes livrés n'utilisent aucun fil de contrôle ; à corriger le jour où le câblage Start vers déclencheurs doit survivre à un cycle save / load."],
            [B("Transport et OTA réels, portage MCU"), " : voir partie III.6 ; rien dans l'architecture ne s'y oppose, rien n'en est fait."],
        ]),

        H2("Annexe E : glossaire"),
        TABLE(
            ["Terme", "Définition"],
            [
                ["Ensemble ouvert (open-set)", "régime de fonctionnement où le système découvre lui-même ses catégories, sans liste fixée à l'avance ; « combien de régimes ? » est une SORTIE, pas une entrée"],
                ["Empreinte (embedding)", "vecteur de quelques nombres résumant une fenêtre de signal ; deux fenêtres semblables donnent des vecteurs proches (distance cosinus)"],
                ["MCSA", "Motor Current Signature Analysis : diagnostic des machines par le spectre de leur courant statorique"],
                ["Glissement (s)", "écart relatif entre la vitesse de synchronisme et la vitesse du rotor d'une machine asynchrone ; les barres cassées signent à f.(1 +/- 2s)"],
                ["Port signal / port stream", "deux sémantiques de canaux : valeur maintenue écrasée à chaque publication (signal) ou file de jetons consommés (stream) ; les cycles de flux exigent un retard Z-1 sur les seconds"],
                ["Nœud fractal", "un graphe complet (ici : un modèle ONNX) inséré comme nœud d'un graphe parent ; ses entrées/sorties sont des « ports frontière » nommés"],
                ["Double banque", "technique de mise à jour sûre : le nouveau contenu est validé dans une zone de transit et ne remplace l'ancien que d'un coup, ou pas du tout"],
                ["Quarantaine d'hystérésis", "petite file retenant les derniers échantillons admis par la porte, le temps de savoir s'ils appartiennent déjà au régime suivant"],
                ["Revue contradictoire", "relecture où chaque défaut allégué est confié à un agent chargé de le RÉFUTER par reproduction exécutée ; seuls les défauts qui survivent sont corrigés"],
            ],
            [2700, 6938]
        ),

        H2("Annexe F : inventaire des suites de tests du périmètre"),
        TABLE(
            ["Suite", "Objet", "Tests"],
            [
                ["motorwatch.central", "catalogue, fusion, protocole, station (y compris rejets atomiques)", "15"],
                ["motorwatch.r385", "bout en bout SP1 : 3 régimes, 2 alarmes, diagnostics, fédération", "1"],
                ["motorwatch.induction", "bout en bout SP2 : casse à chaud, différentiel, contre-épreuve, fédération", "1"],
                ["motorwatch.pmsm", "couverture brushless (agnosticisme moteur de la recette)", "1"],
                ["motorwatch.regime-edge", "reproduction du chevauchement de trame + preuve du correctif", "1"],
                ["graphs.roundtrip", "chargement headless des 4 graphes, charge échangeable, encodeur poussé dans le graphe", "10"],
                ["ml/online-cluster", "open-set, k émergent dont k = 1, _recluster en session réelle, bornes", "15"],
                ["dsp (3 suites)", "porte, multiplexeur + fenêtres [T,C], transposition", "18"],
                ["onnx-plugin (2 suites)", "sha256 (FIPS), chargements validés, streaming fractal, permutations", "30+"],
                ["physics (loadtorque + induction)", "profils signés, passivité, spectre des barres, taux requis, glissement", "36"],
                ["execution/boundary-ports", "ports frontière génériques (hors ONNX), fan-out", "6"],
            ],
            [2600, 5638, 1400]
        ),
        ...ENCADRE("Le mot de la fin", [
            ["Ce cahier est la contrepartie industrielle de celui de DriverV2 : même exigence de traçabilité (chaque chiffre cité a été mesuré, chaque échec est raconté), même objectif (qu'un ingénieur qui n'a participé à rien puisse tout refabriquer), et une étape de plus dans la méthode : la revue contradictoire exécutable comme condition de sortie. Le système livré découvre, alerte, diagnostique, étiquette et partage ; il attend maintenant son encodeur entraîné et son premier vrai moteur."],
        ]),
    ];
};
