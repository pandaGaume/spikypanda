# DAQ (acquisition par blocs)

`DSP.Acquire:daq`

Chaîne d'acquisition de capteur : le nœud échantillonne le signal analogique amont sur **sa propre horloge**, indépendante de la cadence des ticks de la session, et livre des **blocs** d'échantillons accompagnés du **RMS du bloc**. C'est le pendant simulé d'une carte d'acquisition (ADC + tampon bloc) telle que la pratiquent les normes de surveillance de machines.

## Profil d'acquisition (exigence IEC 61430 / 61407 du projet)

Les valeurs par défaut matérialisent le profil imposé :

| Grandeur | Valeur | Pourquoi |
|---|---|---|
| `sample_rate_hz` | **10 240 Hz** | le facteur **2,56 x Fmax** des normes de surveillance, avec Fmax = 4 kHz de bande d'analyse |
| `block_size` | **2 048 échantillons** | puissance de deux (chemin FFT rapide) |
| Durée de bloc | **200 ms** | `block_size / sample_rate_hz` (grandeur affichée en lecture seule) |
| Résolution spectrale | **5 Hz** | `fs / N` : ce qui sépare réellement les bandes latérales MCSA à f(1 +/- 2s) (~ +/- 10 Hz) |
| `aa_cutoff_hz` | **4 000 Hz** | Fmax : le filtre anti-repliement (1 pôle, tenant lieu de filtre ADC) coupe au-dessus de la bande d'analyse |

## L'horloge appartient au capteur

Les instants d'échantillonnage sont `t0 + k / fs` en **temps simulé** : la session peut tourner à 20 kHz ou à 200 kHz (par exemple imposée par un onduleur PWM), les blocs produits sont les mêmes (propriété testée). Entre deux ticks, la valeur est tenue (maintien d'ordre zéro) ; si la session tourne PLUS LENTEMENT que `fs`, plusieurs instants consécutifs capturent la même valeur tenue : mode dégradé documenté, sans erreur.

## Sorties

- `block` : tenseur `[block_size]` (copie indépendante, l'aval peut la conserver), une publication par bloc complet ;
- `rms` : le RMS scalaire du bloc. C'est **l'entrée naturelle de la porte de régime** (`DSP.Detect:steadystate`) : à la cadence bloc (5 Hz), l'ondulation de découpage et le bruit capteur sont moyennés, aucun lissage au niveau échantillon n'est nécessaire.

## Chaîne type (surveillance MCSA)

```
capteur de courant -> DAQ -> block -> Window (Hann) -> FFT 2048 -> spectre (bins de 5 Hz)
                          -> rms   -> Steady-State Gate (settle/breakHold en BLOCS)
                          -> block -> Frame(64, hop 2048) -> transpositions -> encodeur ONNX
```

## Pièges

- **Entrée câblée mais affamée** : le nœud ne tire que lorsque son entrée reçoit un jeton ; sans jeton, l'horloge ne progresse pas. Non câblée, il échantillonne 0 à chaque tick.
- **Changement de `sample_rate_hz` ou `block_size` en cours de route** : l'horloge se réarme et le bloc partiel est jeté (le compteur `block_count` n'est pas remis à zéro).
- **Sauts de temps géants** (rattrapage en mode libre) : plusieurs blocs peuvent sortir dans un même tir ; les sorties tolèrent des rafales de 4 blocs, au-delà c'est un débordement volontaire.
- `anti_alias` coupé : l'échantillonneur lit la valeur tenue brute ; tout contenu au-dessus de fs/2 se replie dans la bande.
