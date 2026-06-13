// Partie III : guide de reconstruction et d'extension.
module.exports = (h) => {
    const { H1, H2, H3, P, B, CODEIN, BUL, CODE, ENCADRE, TABLE } = h;
    return [
        H1("PARTIE III : Guide de reconstruction"),
        P([
            "Cette partie donne les chemins, les commandes et les contrats nécessaires pour reconstruire, vérifier et étendre le système. Convention du dépôt : toutes les commandes se lancent depuis la RACINE de l'espace de travail (jamais de cd dans les paquets).",
        ]),

        H2("III.1 Où vivent les fichiers"),
        TABLE(
            ["Zone", "Contenu"],
            [
                ["packages/dev/plugins/physics/src/mechanical/load/", "LoadTorqueNode + enregistrement du sous-plugin"],
                ["packages/dev/plugins/physics/src/electric/motor-induction/", "InductionMotorDynamicNode + enregistrement"],
                ["packages/dev/plugins/dsp/src/{detect,stream,tensor}/", "porte de régime établi ; multiplexeur + tampon [T,C] ; transposition"],
                ["packages/dev/plugins/ml/", "plugin complet : src/cluster/clustering.ts (bibliothèque), online-cluster.node.ts, manifest, webpack"],
                ["packages/dev/plugins/onnx/src/graphs/", "model.graph.ts (loadModelValidated, ports frontière), sha256.ts"],
                ["packages/dev/core/src/execution/, .../compute/", "routage fractal (execution.graph.ts), builder, kernel (pendingInput)"],
                ["packages/dev/applications/motorwatch/src/", "central/ (catalog, federation, station), edge/ (device, adaptateur), protocol/mcp.ts"],
                ["packages/host/www/data/graphs/*.spikypanda", "les 4 graphes de démonstration (v3)"],
                ["scripts/generate-motorwatch-graphs.py", "le générateur des graphes (à relancer après tout changement de ports)"],
                ["packages/tests/{motorwatch,ml,dsp,onnx-plugin,physics,execution}/", "les 15 suites du périmètre"],
            ],
            [4400, 5238]
        ),

        H2("III.2 Construire et vérifier"),
        ...CODE([
            "npm run build:dev                      # tsc -b, toutes references",
            "npx jest packages/tests/motorwatch     # central, r385, pmsm, induction, bord de regime, roundtrip graphes",
            "npx jest packages/tests/ml packages/tests/dsp packages/tests/onnx-plugin",
            "npx jest packages/tests/physics/loadtorque.node.test.ts packages/tests/physics/induction-motor.test.ts",
            "npx jest packages/tests/execution/boundary-ports.test.ts",
            "npx jest                               # depot complet (5 echecs preexistants attendus)",
            "python scripts/generate-motorwatch-graphs.py    # regenere les 4 .spikypanda",
            "npm run bundle -w @spikypanda/plugin-ml         # idem physics/dsp/onnx si touches",
            "node scripts/deploy-bundles.mjs                 # copie vers packages/host/www/bundle",
            "npm run server                                  # puis /node-editor-v2/index.html",
        ]),
        ...ENCADRE("Les cinq échecs préexistants", [
            ["mpc (résolution de module), sensors/pmsm-scenarios, sim/sim-session, execution/dynamic (2 tests) et execution/static (1 test) échouent AVANT le projet : la preuve a été faite sur un arbre de travail propre du commit de départ. Toute autre rougeur est une régression à traiter."],
        ]),

        H2("III.3 Les contrats d'interface"),
        H3("Nœuds livrés (entrées, sorties, réglages clés)"),
        TABLE(
            ["Nœud", "Entrées", "Sorties", "Réglages"],
            [
                ["Load:torque", "omega (opt.)", "tau_load", "profile, tau0/tau1, tStep, rampRate, k, amplitude, frequency"],
                ["Induction:dynamic", "V_a V_b V_c, tau_load, dt (opt.)", "i_a i_b i_c, omega, theta_m, tau_em, slip", "Rs Rr Ls Lr Lm P J b, f_supply, broken_bars, total_bars, bar_severity"],
                ["Detect:steadystate", "value", "value_gated, steady, transition", "epsilon, settle, breakHold, emaAlpha"],
                ["Stream:mux", "in_0..in_N (variadique)", "frame [N]", ""],
                ["Stream:buffer", "value (scalaire ou [C])", "frame [T] ou [T,C]", "frameSize, hopLength"],
                ["Tensor:transpose", "tensor [A,B]", "transposed [B,A] ou [1,B,A]", "add_batch_dim"],
                ["ML.Cluster:online", "embedding ; _recluster (contrôle)", "label, is_new, distance, k, alarm", "assign_thr, update_thr, alpha, link_thr, k_max, history_max"],
            ],
            [1900, 2400, 2600, 2738]
        ),
        H3("Câblage d'un modèle ONNX en flux (contrat core)"),
        ...BUL([
            ["Vers le modèle : le toSlot du canal est le NOM du tenseur d'entrée ONNX. Exécution « tout ou rien » : chaque entrée déclarée doit recevoir un jeton au même tick, sinon les jetons sont jetés et l'exécution est sautée."],
            ["Depuis le modèle : le fromSlot du canal est le NOM du tenseur de sortie ; la valeur est diffusée à tous les canaux parents demandeurs."],
            ["loadModelValidated(bytes, { name, sha256, expectInputShape, expectOutputCount, expectOutputShape }) renvoie { ok, error, sha256, inputNames, outputNames } ; tout échec laisse l'ancien modèle ET ses ports intacts (dimensions <= 0 = jokers)."],
        ]),
        H3("Le protocole capteur-central (in-process)"),
        ...CODE([
            "outils    : diagnostic_load_model { model_bytes, sha256?, causes[] }",
            "            diagnostic_run { causes? }        (re-execution sans transfert)",
            "            regime_current {}",
            "            catalog_apply_label { label, centroid }",
            "            device_reset { scope: profiles|all, confirm: true }   (1002 sinon)",
            "            capture_set_profile { preset | seuils }",
            "notifs    : alarm (NEW_REGIME, detail { k, label, distance, centroid })",
            "            diagnostic_result, catalog_updated, status",
            "erreurs   : 1001 BUSY, 1002 CONFIRM_REQUIRED, 1003 INVALID_STATE,",
            "            1004 PERSIST_FAILED, 1005 DIAGNOSTICS_OFF (table heritee de DriverV2)",
        ]),

        H2("III.4 Synthétiser les modèles ONNX de test et de démonstration"),
        P([
            "Les modèles des TESTS sont générés à poids fixés, en mémoire, par l'exportateur public du dépôt (OnnxGraphExporter), selon le patron de packages/tests/motorwatch/helpers.ts. ",
            "Les deux artefacts de DÉMONSTRATION référencés par les graphes de l'éditeur sont exportés sur disque par la suite demo-models.export.test.ts vers packages/host/www/data/models/ : ",
            CODEIN("motorwatch-encoder-demo.onnx"),
            " (à déposer sur le nœud modèle de motorwatch-r385) et ",
            CODEIN("motorwatch-diagnostic-demo.onnx"),
            " (la tête différentielle à 3 causes). Les octets sont déterministes : supprimer les fichiers est sans risque, un passage de la suite les régénère à l'identique.",
        ]),
        ...BUL([
            [B("Encodeur"), " : entrée « current_window » (1, 1, T), sortie « embedding » (1, 5). Topologie DriverV2 : Conv1d(1 vers 8, noyau 5) + Relu, deux étages Conv1d(8 vers 8, noyau 3, identité au tap central) + Relu, GlobalAveragePool, Flatten, Gemm(8 vers 5) ; 493 paramètres fixés à la main. Le premier étage calcule les bandes de niveau saturantes (noyaux moyenneurs, biais -0,15 / -0,50 / -0,85 / -1,20), la paire de dérivées centrées (|pente|) et un canal constant 0,2 (noyau nul, biais) ; la tête recompose les bosses de bande (gains 1/2/3), la pente (avec un terme correcteur -5/(T-1,2) fois la moyenne brute, qui annule EXACTEMENT la fuite continue du zero-padding dans les canaux de dérivée) et le biais. Le biais est ESSENTIEL : le clusterer normalise, seule la direction compte."],
            [B("Diagnostic"), " : un seul Gemm de l'empreinte normalisée vers un score par cause ; les poids se choisissent pour donner une marge nette à la cause attendue et un score NÉGATIF aux contre-épreuves."],
        ]),

        H2("III.5 Les calibrations qui comptent"),
        TABLE(
            ["Grandeur", "Valeur et provenance"],
            [
                ["R385", "R 1,22 ; L 1e-3 ; Ke = Kt 8,22e-3 ; J 6e-7 ; b 1,03e-6 (graphe de référence du banc physique)"],
                ["Machine à cage (défauts)", "Rs 2,3 ; Rr 2,5 ; Ls = Lr 0,23 ; Lm 0,22 ; P 2 ; J 5e-3 ; b 1e-4 ; 60 Hz"],
                ["Banc induction", "80 V crête, 1,5 N.m, dt = 1/(60 x 84) (la fenêtre RMS annule exactement la porteuse)"],
                ["Taux requis induction", "tau_e = D/(Rs.Lr + Rr.Ls), 40/tau_e, plancher 80.f : ~9 813 Hz aux défauts"],
                ["Raies de barres (au taux déclaré)", "2/28 : basse 3,5 %, haute 0,28 % ; 4/28 : 6,7 % / 0,50 % ; glissement 9,2 %"],
                ["Clustering", "assign 0,05 ; update 0,02 ; alpha 0,15 ; link 0,06 ; k_max 4 ; historique 512"],
                ["Acquisition (DSP.Acquire:daq)", "fs 10,24 kHz (2,56 x Fmax, Fmax 4 kHz) ; blocs 2 048 éch. = 200 ms ; résolution FFT 5 Hz ; anti-repliement 1 pôle à Fmax ; RMS par bloc en sortie"],
                ["Porte (graphes, cadence bloc)", "epsilon 0,05 ; settle 5 blocs ; breakHold 2 ; emaAlpha 0,2 ; smoothAlpha 1 (inutile à 5 Hz)"],
                ["Porte + quarantaine (façade capteur, cadence échantillon)", "epsilon 0,05 ; settle 20-40 ; breakHold 3 ; smoothAlpha 0,005-0,02 si porteuse résolue ; quarantaine breakHold-1 échantillons"],
                ["Diagnostic", "marge de labellisation 0,25 ; en deçà : « regime_k_unlabeled »"],
            ],
            [3300, 6338]
        ),

        H2("III.6 Étendre le système"),
        ...BUL([
            [B("Ajouter un type de moteur"), " : suivre le patron motor-induction (classe FaultableNode + IDeclaresPorts, computeRequiredHz calé sur le pôle rapide RÉEL du modèle, enregistrement dans le sous-plugin + index + manifeste du plugin physics) ; valider par un test spectral, pas seulement par des invariants."],
            [B("Ajouter un profil de charge"), " : un cas dans LoadTorqueNode + sa loi dans le commutateur ; respecter la convention de passivité (tau.omega >= 0 pour les profils dépendant de la vitesse)."],
            [B("Ajouter une cause de diagnostic"), " : étendre la liste de causes côté station ET la dimension de sortie du modèle ; expectOutputShape garantit la cohérence à la bascule."],
            [B("Brancher un transport réel"), " : implémenter IDeviceServer au-dessus de MQTT/BLE ; le contrat in-process est la spécification ; le découpage en trames du téléversement (chunks + reprise) est l'extension notée « hors périmètre » de l'API DriverV2, à traiter au même endroit."],
            [B("Régénérer les graphes"), " : TOUT changement de ports ou de champs sérialisés des nœuds impose de relancer le générateur puis la suite graphs.roundtrip (c'est elle qui garantit que les fichiers versionnés restent chargeables dans l'éditeur)."],
        ]),
    ];
};
