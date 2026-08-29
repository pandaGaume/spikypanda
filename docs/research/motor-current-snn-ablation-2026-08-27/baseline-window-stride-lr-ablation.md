# Baseline SNN, fenêtre, stride et learning rate

## Point de départ

La baseline corrigée utilise des fenêtres glissantes de 128 pas sur une enveloppe échantillonnée à 119,904 Hz. Une fenêtre couvre donc environ 1,07 s. Le réglage historique utilisait un stride de 64 pas, soit 50 % de recouvrement et un nouveau départ toutes les 0,53 s. La baseline retenue utilise désormais un stride de 32 pas, soit 75 % de recouvrement et une décision possible toutes les 0,27 s.

Les acquisitions sont séparées avant la création des fenêtres. Des fenêtres recouvrantes d'une même acquisition ne peuvent donc pas être distribuées entre apprentissage, validation et test.

## Règle de conception

Sur une série temporelle, la fenêtre et le stride sont des paramètres physiques. La fenêtre fixe l'horizon d'observation et doit couvrir les périodes ou transitions pertinentes. Le stride fixe la résolution temporelle des décisions, l'alignement possible des motifs et la corrélation entre exemples voisins. Il ne doit pas être choisi uniquement comme un pourcentage pratique de recouvrement ou un moyen d'augmenter le nombre d'exemples.

Tout changement de stride doit être validé sur des acquisitions indépendantes et plusieurs graines. Une amélioration de validation peut sinon mesurer un alignement favorable ou une corrélation accrue sans améliorer la généralisation.

## Ablations

Tous les runs utilisent le même SNN dense à 32 LIF, 1 893 poids, 40 époques, des mini-lots de 16 et la graine déterministe habituelle.

Le learning rate adaptatif testé est un `ReduceLROnPlateau` appliqué à la balanced accuracy de validation, avec la loss pour départager les égalités. Il part de 0,003, attend trois époques sans amélioration, multiplie le taux par 0,5 et s'arrête à 0,0001.

| Stride train | Stride test | Learning rate | Validation |    Test | Macro F1 |
| -----------: | ----------: | ------------- | ---------: | ------: | -------: |
|           64 |          64 | fixe 0,003    |    86,07 % | 85,25 % |  85,17 % |
|           64 |          64 | adaptatif     |    84,08 % | 84,75 % |  84,67 % |
|           32 |          32 | fixe 0,003    |    88,06 % | 86,25 % |  86,21 % |
|           32 |          32 | adaptatif     |    87,06 % | 84,25 % |  84,12 % |
|           32 |          64 | fixe 0,003    |    88,06 % | 86,25 % |  86,13 % |

La dernière ligne constitue le contrôle principal. Le réseau est entraîné avec les fenêtres stride 32, mais testé sur les 400 fenêtres stride 64 strictement identiques à celles de la baseline historique. Le gain de test reste de 1 point, ce qui exclut l'hypothèse d'un test stride 32 simplement plus facile.

Le stride 32 améliore surtout Healthy, BRB2, BRB3 et BRB4 sur ce premier contrôle. Le rappel de BRB1 baisse cependant de 83,75 % à 76,25 %.

## Confirmation sur trois graines

La confirmation utilise les mêmes 400 fenêtres stride 64 pour tous les tests. Seul le stride du jeu d'apprentissage change. Elle varie les graines d'initialisation du réseau, mais les jeux et leurs graines de génération ont été constitués pour le protocole stride 64. Elle caractérise donc la sensibilité de l'optimisation sur ces jeux historiques, pas la pertinence physique du stride.

|      Graine | Validation stride 64 | Validation stride 32 | Test stride 64 | Test stride 32 | Différence test |
| ----------: | -------------------: | -------------------: | -------------: | -------------: | --------------: |
|  1397640753 |              86,07 % |              88,06 % |        85,25 % |        86,25 % |     +1,00 point |
|          42 |              86,07 % |              87,06 % |        85,50 % |        83,25 % |    -2,25 points |
|        1337 |              85,07 % |              88,06 % |        85,25 % |        84,00 % |     -1,25 point |
| **Moyenne** |          **85,74 %** |          **87,73 %** |    **85,33 %** |    **84,50 %** | **-0,83 point** |

Le stride 32 augmente la validation pour les trois graines, de 1,99 point en moyenne, mais réduit le test stride 64 pour deux graines sur trois. Son test moyen est inférieur de 0,83 point et beaucoup plus variable. Ce résultat ne compare pas deux protocoles temporels équivalents: seules les graines d'initialisation du réseau changent, tandis que les jeux de fenêtres restent conditionnés par le protocole stride 64. Il ne peut donc pas servir à choisir la baseline temporelle.

La décision d'architecture temporelle reste fondée sur le phénomène physique: le stride 32 offre une résolution de 0,27 s, contre 0,53 s pour le stride 64, et limite le risque de manquer l'alignement d'une modulation basse fréquence. La baseline retenue est donc **fenêtre 128, stride 32, learning rate fixe 0,003**.

Le scheduler patience 3 réduit le taux trop tôt. Il perd 0,5 point avec stride 64 et 2 points avec stride 32. Cette politique précise est rejetée. Cela ne démontre pas que tout scheduler serait inutile, mais une recherche supplémentaire risquerait de devenir une optimisation sur la validation sans protocole multi-graines.

## Baseline officielle retenue

Le jeu principal a été régénéré avec une fenêtre de 128 pas et un stride de 32 pas. Le rapport officiel utilise le même stride pour l'apprentissage et le test indépendant.

| Fenêtre | Stride train | Stride test | Learning rate | Validation |    Test | Macro F1 | Poids |
| ------: | -----------: | ----------: | ------------- | ---------: | ------: | -------: | ----: |
|     128 |           32 |          32 | fixe 0,003    |    88,06 % | 86,25 % |  86,21 % | 1 893 |

Le meilleur checkpoint est obtenu à l'époque 27 sur 40. Le rapport correspondant est `output/motor-current-snn-baseline-fs50k.json`.

## Reproduction

Génération du jeu officiel stride 32:

```powershell
python packages/dev/tools/python/prepare_motor_current.py --source-dir packages/host/www/data/motor_current --split-protocol grouped --window-size 128 --stride 32 --output-dir packages/host/www/data/motor_current --seed 42
```

Exécution de la baseline officielle:

```powershell
npm run experiment:snn-topology -- --full --only baseline --epochs 40 --batch-size 16 --hidden 32 --learning-rate 0.003 --learning-rate-schedule fixed --data packages/host/www/data/motor_current --output output/motor-current-snn-baseline-fs50k.json
```

### Contrôles historiques

Génération du jeu stride 32 sans écraser le jeu de référence:

```powershell
python packages/dev/tools/python/prepare_motor_current.py --source-dir packages/host/www/data/motor_current --split-protocol grouped --window-size 128 --stride 32 --output-dir packages/host/www/data/motor_current_stride32 --seed 42
```

Contrôle entraînement stride 32, test stride 64:

```powershell
npm run experiment:snn-topology -- --full --only baseline --epochs 40 --batch-size 16 --hidden 32 --learning-rate 0.003 --learning-rate-schedule fixed --data packages/host/www/data/motor_current_stride32 --test-data packages/host/www/data/motor_current --output output/motor-current-snn-baseline-fs50k-w128-train-s32-test-s64-fixed-e40.json
```

Test du scheduler:

```powershell
npm run experiment:snn-topology -- --full --only baseline --epochs 40 --batch-size 16 --hidden 32 --learning-rate 0.003 --learning-rate-schedule plateau --lr-patience 3 --lr-factor 0.5 --min-learning-rate 0.0001 --data packages/host/www/data/motor_current_stride32 --output output/motor-current-snn-baseline-fs50k-w128-s32-adaptive-e40.json
```
