// Partie I : le systeme tel qu'il est construit.
module.exports = (h) => {
    const { H1, H2, H3, P, B, I, CODEIN, BUL, CODE, FORMULE, ENCADRE, TABLE } = h;
    return [
        H1("PARTIE I : Le système"),

        H2("I.1 Le scénario et l'héritage DriverV2"),
        P([
            "motorwatch est le portage industriel de la recette DriverV2 : ",
            B("regroupement comportemental en ensemble ouvert, sur séries temporelles, embarqué, sans étiquettes"),
            ". On remplace « conducteur » par « régime de fonctionnement ou famille de défaut », et « centrale inertielle du véhicule » par « courant statorique du moteur ». ",
            "Les quatre briques génériques identifiées par le cahier DriverV2 (partie V.1) se retrouvent une à une : l'acquisition événementielle devient une porte de régime ÉTABLI (on capture les états stationnaires, pas les transitoires : la sémantique est inversée mais la machine à états est la même) ; l'encodeur boîte noire ONNX est conservé tel quel dans son contrat ; le clustering anonyme à k émergent est porté ligne à ligne ; la méthodologie (simulateur paramétré, transfert gelé, résultat négatif documenté) structure le journal de la partie II.",
        ]),
        P([
            "Le scénario opérationnel en une phrase : un capteur de courant découvre seul un régime nouveau et alerte le central ; le central téléverse au capteur, à chaud, des modèles ONNX de diagnostic ; le verdict différentiel permet de labelliser le régime ; le label est référencé localement par le capteur et fédéré entre les sites.",
        ]),

        H2("I.2 La règle de placement : plugins, core, application"),
        P([
            "Décision structurante prise en début de projet (et appliquée sans exception) : ",
            B("tout nœud générique va dans un plugin"),
            " (compatible nodeeditor v2, donc utilisable par n'importe quelle application graphique), ",
            B("tout ajout 100 % générique de niveau framework va dans core"),
            ", et l'application ne garde QUE la logique métier. Conséquence : motorwatch n'introduit aucun nœud privé, et la moitié de sa valeur est immédiatement réutilisable ailleurs.",
        ]),
        TABLE(
            ["Pièce", "Où elle vit", "Identifiant"],
            [
                ["Générateur de couple de charge (5 profils)", "plugin physics", "Physics.Mechanical.Load:torque"],
                ["Moteur asynchrone à cage d'écureuil (barres cassées)", "plugin physics", "Physics.Electric.Motor.Induction:dynamic"],
                ["Détecteur de régime établi (porte à hystérésis)", "plugin dsp", "DSP.Detect:steadystate"],
                ["Multiplexeur de phases (N flottants vers tenseur [N])", "plugin dsp", "DSP.Stream:mux"],
                ["Fenêtres multi-canaux [T,C] (extension du tampon)", "plugin dsp", "DSP.Stream:buffer"],
                ["Transposition de tenseur (vers (1,C,T) pour l'ONNX)", "plugin dsp", "DSP.Tensor:transpose"],
                ["Clustering open-set (bibliothèque + nœud)", "plugin ml (NOUVEAU)", "ML.Cluster:online"],
                ["Téléversement de modèle validé (double banque)", "plugin onnx", "OnnxModelGraph.loadModelValidated"],
                ["Streaming fractal par nom de port", "core (RuntimeGraph)", "ports frontière"],
                ["Catalogue, fédération, station, protocole, façade capteur", "application motorwatch", "logique métier seulement"],
            ],
            [4400, 2500, 2738]
        ),

        H2("I.3 Le contrat d'acquisition et la chaîne du capteur (edge)"),
        P([
            B("Le capteur possède sa propre horloge d'échantillonnage"),
            " : c'est une contrainte de conception posée par le donneur d'ordre (profil d'acquisition IEC 61430 / 61407 tel que transmis) et c'est la pratique standard de la surveillance de machines : échantillonnage à ",
            B("10,24 kHz"),
            " (le facteur 2,56 x Fmax classique, Fmax = 4 kHz d'analyse), livraison par ",
            B("blocs de 2 048 échantillons, soit 200 ms"),
            ", résolution spectrale fs/N = 5 Hz (ce qui résout proprement les bandes latérales de barres cassées à +/- 10 Hz). ",
            "Le nœud générique ", CODEIN("DSP.Acquire:daq"),
            " matérialise ce contrat : son horloge est fondée sur le TEMPS SIMULÉ (les instants k/fs), donc totalement découplée de la cadence des ticks de session ; il publie chaque bloc (tenseur [2048]) ET le RMS du bloc. ",
            "Le RMS par bloc est le scalaire naturel de la porte de régime : à la cadence bloc (5 Hz), l'ondulation PWM et le bruit capteur sont moyennés, plus besoin de lissage au niveau échantillon. Un filtre anti-repliement 1 pôle (coupure Fmax) tient lieu de filtre ADC.",
        ]),
        P([
            "Le pipeline embarqué, construit uniquement avec des nœuds de plugins, devient :",
        ]),
        ...CODE([
            "courant i(t) (capteur analogique bruite)",
            "  -> DSP.Acquire:daq            horloge PROPRE 10,24 kHz, blocs [2048] / 200 ms + RMS",
            "       |-> rms -> DSP.Detect:steadystate   porte de regime a la cadence bloc (5 Hz)",
            "       |-> block -> DSP.Frame(64, hop 2048) -> fenetre [1,64] (cliche de tete de bloc)",
            "              -> transpositions -> (1,1,64) -> encodeur ONNX -> ML.Cluster:online",
            "       |-> block -> fenetre de Hann -> FFT 2048 points (bins de 5 Hz) -> spectre MCSA",
        ]),
        P([
            I("Côté façade capteur (variante MCU), la même discipline s'applique avec en plus la quarantaine d'hystérésis et la suppression du démarrage à froid ; dans le graphe d'éditeur, le tout premier bloc (transitoire de démarrage) crée légitimement un profil « mise en route » visible."),
        ]),
        H3("La porte de régime établi"),
        P([
            "Machine à états à hystérésis sur un scalaire (le courant, ou son enveloppe en alternatif) : un échantillon est « stable » si son écart à une moyenne mobile exponentielle reste sous un seuil relatif ",
            CODEIN("epsilon"),
            " ; l'état STABLE s'ouvre après ", CODEIN("settle"), " échantillons stables consécutifs et se referme après ", CODEIN("breakHold"),
            " échantillons instables. Pendant la confirmation de rupture, la porte laisse passer jusqu'à breakHold-1 échantillons post-transition : c'est son contrat (testé). ",
            "C'est la façade capteur qui restaure l'invariant « aucune fenêtre ne chevauche un changement de régime » avec une petite file de quarantaine de breakHold-1 échantillons, vidée avant la remise à zéro du tampon sur chaque transition (défaut trouvé par la revue, partie II.8).",
        ]),
        H3("Le clustering open-set"),
        P([
            "Portage ligne à ligne de la brique 4 de DriverV2. Assignation en ligne par distance cosinus aux centroïdes :",
        ]),
        FORMULE("d(e, c) = 1 - (e/||e||) . (c/||c||)"),
        P([
            "d < assign_thr : assignation au profil le plus proche (et mise à jour EMA du centroïde si d < update_thr) ; sinon : création d'un profil, c'est le signal « nouveau régime ». ",
            "Seuils calibrés hérités de DriverV2 : assign 0,05, update 0,02, alpha 0,15. Le re-clustering par lots (agglomératif à seuil ABSOLU link_thr = 0,06, k_max = 4) reste disponible pour résorber la sur-segmentation ; son déclencheur est un port de ",
            B("plan de contrôle"), " (", CODEIN("_recluster"), ") : la revue a montré qu'en port de données il bloquait puis plantait la session (partie II.8). ",
            "L'historique est borné (512 entrées en anneau) : un capteur allumé des mois ne grossit pas. La sortie ", CODEIN("alarm"),
            " émet, uniquement à la création d'un profil, une trame compatible avec le bus d'alertes de l'éditeur : sévérité « warn » (la grammaire du bus normalise toute autre valeur, y compris « warning », vers « info » : pièges d'intégration documentés en II.2).",
        ]),

        H2("I.4 Les moteurs simulés"),
        H3("Sous-projet 1 : le R385 (courant continu)"),
        P([
            "Le nœud ", CODEIN("Physics.Electric.Motor.DC:dynamic"), " existait : c'est un nœud INTÉGRABLE (états [i, omega] intégrés par le solveur RK4 adaptatif de la session, entrées V et tau_load en ports « signal » à maintien d'ordre zéro). ",
            "Les valeurs par défaut ne sont PAS celles d'un R385 : tous les bancs (tests et graphes) posent explicitement R = 1,22 ohm, L = 1 mH, Ke = Kt = 8,22 mN.m/A, J = 6e-7 kg.m2, b = 1,03e-6. ",
            "La chaîne de démonstration reprend le graphe de référence fourni par l'utilisateur : potentiomètre, onduleur PWM (12 V, 10 kHz, bipolaire), moteur, capteur de courant LEM (bruit, résolution, bande passante).",
        ]),
        H3("Sous-projet 2 : la machine asynchrone à cage d'écureuil (créée pour ce projet)"),
        P([
            "Modèle en vecteurs d'espace dans le repère stationnaire alpha-beta, flux comme variables d'état :",
        ]),
        ...CODE([
            "i_s = (Lr.psi_s - Lm.psi_r)/D     i_r = (Ls.psi_r - Lm.psi_s)/D     D = Ls.Lr - Lm^2",
            "dpsi_s/dt = v_s - Rs.i_s",
            "dpsi_r/dt = -R_r(theta).i_r + j.P.omega.psi_r",
            "Te = (3/2).P.(Lm/Lr).(psi_r_a.i_s_b - psi_r_b.i_s_a)",
            "J.domega/dt = Te - b.omega - (tau_load + tau_fautes)",
        ]),
        P([
            "La ", B("cassure de barres"), " est une asymétrie de résistance rotorique FIXE DANS LE ROTOR : la matrice R_r(theta) vaut Rr.(I + delta.Proj(a)) où Proj(a) projette sur l'axe d'asymétrie a = P.theta (angle électrique du rotor) et delta = bar_severity x broken_bars / total_bars. ",
            "C'est le modèle localisé standard : il produit dans le courant statorique les raies latérales à f.(1 +/- 2s) dont l'amplitude suit k/N, exactement la signature MCSA décrite par la littérature (et par les notes de recherche du dépôt, motor-current-mcsa-principles.md : environ 2,9 % de modulation pour 1 barre sur 34). ",
            "Mesuré sur le modèle au taux déclaré (~9,8 kHz) : raie basse à 3,5 % du fondamental pour 2 barres sur 28, 6,7 % pour 4 barres (rapport 1,9x). La sortie ", CODEIN("slip"),
            " publie le glissement (borné [-1, 2] : la plage couvre la génératrice ET le freinage en contre-courant).",
        ]),
        P([
            "Intégration : Euler explicite dans fire() (cohérent avec la famille brushless existante), avec un taux requis auto-déclaré calé sur le VRAI pôle rapide du modèle, tau_e = D/(Rs.Lr + Rr.Ls), marge 40/tau_e, plancher 80 x f_alimentation : la première heuristique (qui ignorait Rr) sous-déclarait le taux d'un facteur 8 et faussait le glissement de moitié (défaut trouvé et corrigé par la revue, partie II.8).",
        ]),
        H3("Le couple de charge : la pièce qui manquait"),
        P([
            "Aucun nœud ne produisait de couple de charge variable : le graphe de référence le composait à la main (canal de retour Z-1 + deux multiplications pour K.omega2). ",
            CODEIN("Physics.Mechanical.Load:torque"),
            " fournit cinq profils : constant, échelon (T0 vers T1 à t_step : l'apparition d'un régime), rampe (dérive), quadratique (loi de ventilateur/pompe), périodique (modulation mécanique). ",
            "La loi quadratique est SIGNÉE : tau = k.omega.|omega|, et la sortie est bornée « ne jamais entraîner » (tau.omega >= 0 pour les profils dépendant de la vitesse) : la version naïve k.omega2 violait la passivité en rotation inverse et divergeait en temps fini (revue, partie II.8).",
        ]),

        H2("I.5 Le streaming fractal : la réparation de core"),
        P([
            "Le scénario exige qu'un modèle ONNX, inséré comme NŒUD d'un graphe (le nœud « spk.onnx:model » de l'éditeur), consomme et produise des tenseurs en flux. ",
            "Constat au moment de câbler : le mécanisme prévu (canaux frontière à extrémité pendante, ", CODEIN("withInputPort"), "/", CODEIN("withOutputPort"),
            ") était cassé depuis sa création et n'était utilisé NULLE PART ; le routage d'entrée comparait le mauvais nom de port ; et le chemin classique infer() reposait sur des invariants que des canaux frontière naïfs auraient brisés.",
        ]),
        P("La remise en état, entièrement dans core et le plugin onnx, établit le contrat de câblage suivant :"),
        ...BUL([
            ["VERS un nœud modèle : le ", B("toSlot"), " du canal est le NOM du tenseur d'entrée ONNX (ex. « current_window »). Le modèle tire « tout ou rien » : il ne s'exécute que si chaque entrée déclarée a reçu un jeton à ce tick (un modèle partiellement câblé jette les jetons et saute l'exécution, au lieu d'empoisonner la session : défaut majeur corrigé)."],
            ["DEPUIS un nœud modèle : le ", B("fromSlot"), " du canal est le NOM du tenseur de sortie (ex. « embedding »). La valeur est lue une fois puis publiée vers TOUS les canaux parents qui la demandent (le fan-out vers plusieurs consommateurs n'alimentait que le premier : défaut majeur corrigé)."],
            ["Les accesseurs ", CODEIN("inputPorts"), "/", CODEIN("outputPorts"), " du nœud modèle exposent les noms de tenseurs après chargement : l'éditeur les dessine comme des ports câblables."],
            ["Le chemin classique infer() reste intact octet pour octet ; l'injection ", CODEIN("pendingInput"), " PERSISTE sur les nœuds source purs (les boucles d'entraînement en dépendent : leçon apprise à nos dépens, partie II.8) et n'est consommée à la lecture que sur la branche frontière."],
        ]),
        P([
            "Bénéfice collatéral : cette remise en état a réparé ", B("7 tests préexistants du dépôt"),
            " (nested.test.ts) qui échouaient AVANT le projet : la perte de jetons sur les canaux de sortie pendants en était la cause racine.",
        ]),

        H2("I.6 Le téléversement de modèles : la double banque"),
        P([
            CODEIN("loadModelValidated(bytes, options)"),
            " : vérification SHA-256 AVANT le parsing (insensible à la casse), construction en zone de transit, validation du contrat (forme d'entrée déclarée avec jokers pour les dimensions dynamiques, nombre de sorties, et FORME de sortie : c'est elle qui garantit « un score par cause » avant de basculer), puis bascule atomique. ",
            "Tout échec laisse le modèle précédent ET ses métadonnées intacts ; la raison est exposée. Côté capteur, le banc de diagnostic est tenu par un petit adaptateur (kernel privé de l'application) : la session d'exécution fige la topologie à la construction, donc remplacer les nœuds INTERNES d'un nœud fractal en cours de session serait invisible ; l'adaptateur garde la frontière stable et permute les banques derrière elle. Le SHA du dernier téléversement réussi est mémorisé côté central : une alarme répétée ne re-téléverse pas les mêmes octets (outil ", CODEIN("diagnostic_run"), " sans transfert).",
        ]),

        H2("I.7 Le central : diagnostic différentiel et labellisation"),
        P([
            "La station s'abonne aux alarmes. Sur NEW_REGIME : recherche d'abord dans son catalogue (un régime déjà connu est re-labellisé sans diagnostic : le chemin rapide) ; sinon, téléversement du modèle de diagnostic enregistré, exécution sur la dernière fenêtre capturée, et verdict différentiel :",
        ]),
        FORMULE("{ topCause, score, runnerUp, margin = score(top) - score(runnerUp) }"),
        P([
            "Si la marge dépasse le seuil (0,25 par défaut), le label est la cause gagnante ; sinon « regime_k_unlabeled » (l'aveu d'ignorance est un label comme un autre). Le label est appliqué DES DEUX CÔTÉS : au catalogue central et au capteur (qui sait désormais résoudre localement ce régime : « référencé en local »).",
        ]),

        H2("I.8 La fédération entre sites"),
        P([
            "Fonction pure ", CODEIN("mergeCatalogs"), " : agglomération gloutonne des centroïdes labellisés sous link_thr (0,06), label par vote majoritaire pondéré par les comptes (égalité : ordre lexicographique, pour le déterminisme), centroïde = moyenne pondérée re-normalisée, sites = union triée. ",
            "Topologie supportée et documentée : la fédération se RECALCULE depuis les catalogues feuilles à chaque cycle (chaque feuille reste la source de vérité de son évidence) ; on ne re-fusionne pas un produit de fusion avec ses propres sources. Le scénario « un label appris au site A se résout au site B » est testé de bout en bout.",
        ]),

        H2("I.9 Le protocole capteur-central"),
        P([
            "Calqué sur l'API MCP du dispositif DriverV2 (JSON-RPC 2.0, push par notifications, pull par état), adapté au domaine industriel et câblé en mémoire pour cette version (le transport est hors périmètre, comme dans la spécification d'origine). ",
            "Outils : ", CODEIN("diagnostic_load_model"), ", ", CODEIN("diagnostic_run"), ", ", CODEIN("regime_current"), ", ", CODEIN("catalog_apply_label"), ", ", CODEIN("device_reset"),
            " (confirmation explicite exigée : code 1002 CONFIRM_REQUIRED sinon ; la portée « profiles » efface aussi la dernière fenêtre et la dernière empreinte : l'effacement est la promesse de premier rang), ", CODEIN("capture_set_profile"),
            ". Notifications : alarm (NEW_REGIME, avec le centroïde du régime : dans ce domaine l'empreinte d'un régime moteur n'identifie personne, l'adaptation de la règle de confidentialité DriverV2 est documentée dans l'en-tête du contrat), diagnostic_result, catalog_updated, status. La table d'erreurs 1001-1005 de la spécification d'origine est reprise.",
        ]),

        H2("I.10 Les graphes de démonstration"),
        P([
            "Quatre fichiers ", CODEIN(".spikypanda"), " (format v3 : layout + model + dashboards), versionnés dans le dépôt aux côtés des graphes existants, générés par un script (les indices de ports à la main ne survivent pas aux évolutions) :",
        ]),
        ...BUL([
            [CODEIN("motor-r385"), " : le BLOC MOTEUR seul, réutilisable : potentiomètre, onduleur, moteur R385, capteur de courant, scène. La charge est un nœud EXTERNE relié par un unique fil tau_load : changer de loi de charge = remplacer un nœud, sans toucher au bloc (exigence de réutilisation, prouvée par test)."],
            [CODEIN("motorwatch-r385"), " : le bloc + la chaîne de surveillance + le spectre/chute d'eau MCSA. Le nœud modèle est livré vide : on y dépose l'encodeur (entrée « current_window » [1,1,64], sortie « embedding ») et le graphe devient un moniteur vivant."],
            [CODEIN("motor-induction"), " et ", CODEIN("motorwatch-induction"), " : la même structure en triphasé (horloge + trois oscillateurs à 120 degrés, machine à cage, trois transducteurs, multiplexeur). Passer broken_bars à 2 en cours d'exécution fait monter les raies f(1 +/- 2s) dans le spectre et lève NEW_REGIME."],
        ]),
        ...ENCADRE("Deux contraintes de câblage découvertes en faisant tourner les graphes", [
            ["Le retour omega vers la loi de charge forme un CYCLE de flux : sur les moteurs à ports « stream » (induction), il DOIT passer par un canal de retour Z-1 (Control.Feedback:channel), exactement comme dans le graphe de référence ; le moteur CC, à ports « signal », tolère le fil direct. Tous les graphes livrés routent ce retour par le Feedback, en VUE SCINDÉE : ses deux demi-pavés (la moitié « entrée » près du moteur, la moitié « sortie » près de la charge) sont positionnés par le champ anchors du fichier, et aucun fil de boucle ne traverse le canevas."],
            ["La chaîne mono-canal doit passer par le multiplexeur même avec UNE seule entrée : c'est lui qui donne la dimension canal ([T] devient [T,1]) qu'exige la transposition vers (1,1,T). Le port d'entrée du tampon de fenêtres est déclaré « any » : il ingère aussi bien des scalaires que des lignes tenseur du multiplexeur (une déclaration « float » ferait signaler le fil mux vers tampon comme incompatible par l'éditeur)."],
        ]),
        P([
            "Limite assumée : l'encapsulation du bloc moteur dans un sous-graphe Sim.Graph reste un geste d'ÉDITEUR (le JSON interne sauvegardé n'est pas instancié au chargement par le runtime actuel) ; les graphes sont donc plats, et l'exigence de réutilisation est portée par le contrat « un seul fil de charge ».",
        ]),
    ];
};
