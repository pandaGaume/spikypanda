# Étape A — Résultats

Preuve de principe du substrat multi-fréquence (hypothèse **H1** de `00-PAPIER.md`) :
*plusieurs motifs, placés sur des bandes de fréquence distinctes, traversent une même
arête (leur somme) puis se re-séparent proprement par lecture fréquentielle.*

## Comment lancer

```bash
cd docs/multipath-frequentiel/etapeA
node multipath-standalone.mjs
```

Zéro dépendance (Node ≥ 18, ESM). Le script excite chaque bande **seule**, mesure
l'amplitude décodée à **toutes** les bandes, et en tire une matrice `D[b][j]` :
diagonale = signal utile, hors-diagonale = fuite. La **fuite max** est le pire
rapport `fuite / utile`. Cible du jalon : **< 5 %**.

---

## ✅ Statut : résultats MESURÉS (exécution du 2026, Node)

Sortie réelle de `node multipath-standalone.mjs`. Les trois scénarios passent
**très largement** sous le budget de 5 %.

### Scénario 1 — cohérent + rectangulaire (séparation idéale)

Fréquences `[50, 120, 200] Hz`, `fs=1000`, `N=1000` → bins entiers `50, 120, 200`.

- **Fidélité : exacte.** Décodé = attendu à la précision affichée : `0.800`, `0.300`,
  `0.390`. Aucune perte.
- **Fuite : 0.0000 %.** Le hors-diagonale de la matrice est au niveau du bruit
  machine (`~1e-16`), comme prévu par l'orthogonalité de la DFT.
- **Verdict : PASS.** Démonstration nette de **H1** : sur une seule arête, trois
  sous-chemins coexistent et se re-séparent **sans perte**.

### Scénario 2 — non-cohérent + Hann (réaliste, bandes espacées)

Fréquences `[50.5, 120.3, 200.7] Hz` (hors bins), fenêtre de Hann.

- **Fuite : 0.0002 %.** Négligeable, **PASS** confortable — les bandes espacées
  laissent les lobes de Hann s'effondrer bien avant.
- **Fidélité dégradée (confirmé) : le vrai coût à surveiller.** Décodé nettement
  sous l'attendu : bande 0 `0.679` au lieu de `0.800` (**−15 %**), bande 1 `0.283`
  au lieu de `0.300`, bande 2 `0.368` au lieu de `0.390`. C'est le **scalloping** :
  on lit à côté du sommet du lobe car le ton ne tombe pas sur un bin. Ce n'est pas
  de la fuite (la séparation reste parfaite), mais une perte d'**amplitude**.
- **Leçon nette :** poser les porteuses **sur les bins** (comme S1/S3) supprime ce
  coût entièrement. Le placement cohérent est le levier gratuit.

### Scénario 3 — bandes rapprochées + Hann (6 bins d'écart)

Fréquences `[100, 106, 112] Hz`, tons **sur les bins**.

- **Fuite : 0.0076 %.** Toujours très loin sous 5 %, **PASS**. Fidélité exacte
  (`0.800 / 0.300 / 0.390`) car tons alignés sur les bins.
- **Contrôle, pas stress.** Comme les tons sont alignés sur les bins, la fuite reste
  minime même rapprochés (0.0076 %). Le vrai stress est le scénario 4.

### Scénario 4 — bandes rapprochées ET hors-bins + Hann (vrai stress)

Fréquences `[100.5, 102.5, 104.5] Hz` (écart 2 bins, décalées d'un demi-bin).

- **Fuite : 26.11 % → FAIL.** Enfin la limite. Quand les bandes sont à la fois
  serrées (2 bins) et hors-bins, les lobes de la fenêtre se recouvrent massivement :
  plus d'un quart de l'énergie d'une bande déborde sur sa voisine. **C'est le mur
  cherché** — il existe, et on sait maintenant où.

### Balayage de densité — combien de canaux par arête ?

Pour chaque écart entre bandes, 5 porteuses hors-bins (pire cas), fuite max mesurée :

| Fenêtre | Écart minimal sous 5 % | Densité max estimée (plage utile 400 bins) |
|---|---|---|
| **Hann** | **3 bins** (≈ 3 Hz) | **~133 canaux** par arête |
| **rectangulaire** | **15 bins** (≈ 15 Hz) | **~26 canaux** par arête |

- **Le choix de fenêtre change tout hors-bins :** Hann permet ~**5× plus de canaux**
  que le rectangulaire (3 bins vs 15). La « physique du filtrage » n'est pas un
  détail, c'est le levier de densité.
- **Compromis central chiffré** (§8 du papier) : *espacement des bandes* ⇄ *nombre de
  canaux*. Avec Hann, on tient plus de **cent** sous-chemins sur une seule arête.
- **Consigne de design pour `SpectralSynapse` :** soit poser les porteuses **sur les
  bins** (fuite ≈ 0, fidélité exacte, cf. S1/S3), soit — si le placement est
  contraint — garder **≥ 3 bins** d'écart avec Hann.

---

## Résumé mesuré

| Scénario | Fenêtre | Placement | Fuite max mesurée | Fidélité | Verdict |
|---|---|---|---|---|---|
| 1 | rectangulaire | sur les bins | **0.0000 %** | exacte | **PASS** |
| 2 | Hann | hors bins, espacées | **0.0002 %** | −15 % (scalloping) | **PASS** |
| 3 | Hann | rapprochées (6 bins), sur bins | **0.0076 %** | exacte | **PASS** |
| 4 | Hann | rapprochées (2 bins), hors bins | **26.11 %** | — | **FAIL (mur)** |

**Densité :** ~133 canaux/arête (Hann) · ~26 (rectangulaire) sur la plage utile.

## Ce que ça dit sur H1

Le scénario 1 établit analytiquement le point fort : **avec des porteuses posées sur
les bins, la coexistence de plusieurs chemins sur une seule arête est sans perte.**
C'est exactement H1. Les scénarios 2–3 montrent le régime réaliste et où se situe la
limite (espacement des bandes). Rien ici ne repose sur une décision de routage : que
de l'addition et de la lecture fréquentielle, toutes deux dérivables — ce qui prépare
les jalons suivants (plasticité, apprentissage).

## Prochaines étapes

1. ✅ **H1 confirmée** — séparation sans perte quand les porteuses sont bien placées
   (S1/S2/S3 sous 0,01 %).
2. ✅ **Limite cartographiée** — S4 montre le mur (26 % à 2 bins hors-bins) ; le
   balayage donne la densité : **~133 canaux/arête** en Hann, ~26 en rectangulaire.
3. **Contraintes de design pour `SpectralSynapse`** (à porter en étape B) :
   - porter les bandes **sur les bins** → fuite ≈ 0 et fidélité exacte ;
   - sinon, **≥ 3 bins** d'écart avec fenêtre de Hann ;
   - préférer Hann au rectangulaire dès qu'un placement hors-bin est possible.
4. **Étape B** : porter cette composition dans le moteur du dépôt et introduire
   l'abstraction `SpectralSynapse` (poids par bande, bin-alignées par défaut).

*Note : la « plage utile 400 bins » et donc le « ~133 canaux » dépendent de N et de
`fs` (ici N=1000). Avec plus d'échantillons par trame, la résolution fréquentielle
monte et la densité aussi — à explorer si on veut plus de canaux.*
