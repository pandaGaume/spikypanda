# Le multi-chemin fréquentiel

### Une piste pour des réseaux qui portent plusieurs calculs sur le même câblage

**Auteur :** Guillaume Pelletier · **Projet :** spikypanda · **Statut :** document de travail, v0.1
**But du document :** poser proprement une intuition pour qu'on puisse la construire et la tester. Pas un article pour impressionner : un texte pour partager une idée et la mettre à l'épreuve de l'ingénierie.

---

## En une phrase

Et si une même connexion entre deux neurones ne portait pas *un* poids, mais *plusieurs*, choisis selon la **fréquence** du signal qui la traverse — de sorte que plusieurs réseaux différents cohabitent sur le même câblage physique, séparés non pas dans l'espace mais dans le spectre ?

---

## Résumé pour aller vite

Aujourd'hui, un réseau de neurones apprend un jeu de poids figés et rejoue toujours le même calcul. Une connexion = un nombre. Si on veut que le réseau fasse autre chose, on change les poids, on écrase l'ancien comportement.

Ce document propose autre chose : garder **une seule topologie physique** (le graphe des connexions ne bouge pas), mais faire porter à chaque connexion **une réponse qui dépend de la fréquence du signal**. Un signal « lent » et un signal « rapide » qui empruntent la même connexion ne voient pas le même poids. Résultat : le même câblage héberge plusieurs sous-réseaux, un par bande de fréquence, et ils fonctionnent **en même temps** sans se marcher dessus, parce qu'on peut les additionner (superposition) puis les re-séparer (filtrage).

L'analogie est la radio : des dizaines de stations traversent l'air au même endroit, en même temps, sans collision, parce que chacune occupe une fréquence différente. On veut faire pareil à l'intérieur d'un réseau de calcul.

Le pari central : **c'est la physique du signal transporté — son spectre — qui fournit gratuitement le "multi-chemin", sans jamais avoir à prendre de décision de routage.**

---

## 1. D'où vient l'idée

Le point de départ est une observation classique : dans un grand réseau tiré au hasard se cache déjà un petit sous-réseau capable de bien faire le travail (l'idée du « billet gagnant »). Autrement dit, l'information utile est bien plus petite que le réseau, et elle tient surtout dans *quelles connexions comptent* et *comment elles sont réglées au départ*.

En tirant ce fil, on arrive à une question plus large : et si on cherchait moins à *stocker une solution* dans les poids, et plus à *donner au réseau une manière de porter plusieurs comportements* ? Le vivant fait exactement ça. Le cerveau n'a pas un câblage par tâche : il réutilise le même tissu, et il sépare les flux d'information par le **rythme** des signaux (des oscillations lentes qui organisent, des oscillations rapides qui traitent). Plusieurs « conversations » passent sur les mêmes fils, distinguées par leur fréquence.

Ce document transpose cette idée dans spikypanda : une seule structure de graphe, mais des poids qui dépendent de la fréquence.

---

## 2. Le problème qu'on attaque

Deux limites des réseaux habituels, qu'on veut desserrer :

**Un chemin à la fois.** Quand un signal traverse une connexion, il rencontre un seul nombre. Pour faire coexister deux comportements sur la même connexion, on n'a pas de place : il faudrait dupliquer le câblage. Le « multi-chemin » coûte cher parce qu'il est spatial.

**Le routage est une décision brutale.** Les techniques qui font « choisir » un chemin (activer tel sous-réseau plutôt que tel autre) reposent sur des décisions tout-ou-rien. Or ces décisions sont difficiles à apprendre : elles ne sont pas « lisses », le réglage par gradient les traverse mal. C'est un obstacle connu et coriace.

L'idée du multi-chemin fréquentiel vise les deux d'un coup : plusieurs chemins **sur la même connexion** (pas de duplication spatiale), et **sans décision brutale** (on additionne et on filtre, deux opérations parfaitement lisses).

---

## 3. L'idée centrale, en clair

Remplaçons le poids unique d'une connexion par une **réponse en fréquence** : une petite fonction qui dit « à telle fréquence, multiplie par tant ; à telle autre, multiplie par tant d'autre ».

Concrètement, au premier jalon, ça peut être aussi simple qu'un **tableau de poids**, un poids par bande de fréquence. La connexion n'est plus le nombre `0,7` mais par exemple `[0,7 ; -0,2 ; 0,9]` pour trois bandes (lente, moyenne, rapide).

Alors :

- Un neurone peut émettre son information sur une **bande précise** (comme choisir une station de radio).
- Deux informations sur deux bandes différentes peuvent voyager **superposées** sur la même connexion : on les additionne, ça ne les mélange pas vraiment, car on saura les rouvrir.
- À l'arrivée, un **filtre** rouvre chaque bande séparément. Chacune a vu son propre poids en chemin.

On obtient donc, sur une seule topologie, autant de sous-réseaux effectifs qu'on a de bandes — chacun avec ses propres poids — qui tournent en parallèle et ne se choisissent jamais : ils coexistent.

---

## 4. Les hypothèses

Chaque hypothèse est écrite pour être **vérifiable** : si elle est fausse, on doit pouvoir le constater.

**H1 — Coexistence sans collision.**
Plusieurs signaux placés sur des bandes de fréquence distinctes peuvent traverser la même connexion en même temps et être re-séparés proprement à la sortie, avec une perte d'information faible (la « fuite » d'une bande vers une autre reste sous un seuil qu'on se fixe).
*Test :* injecter deux motifs connus sur deux bandes, additionner, filtrer, mesurer combien de chaque motif on retrouve dans la mauvaise bande.

**H2 — Des sous-réseaux réellement différents.**
En donnant à chaque bande son propre jeu de poids, on obtient sur le même câblage des comportements franchement différents d'une bande à l'autre (par exemple : une bande apprend à additionner, une autre à comparer), sans qu'ils interfèrent.
*Test :* entraîner deux tâches jouets, une par bande, sur une topologie partagée ; vérifier que les deux marchent et que toucher l'une ne casse pas l'autre.

**H3 — Le multi-chemin fréquentiel remplace le routage.**
Là où un système classique devrait « choisir » un chemin par une décision difficile à régler, la version fréquentielle obtient le même effet par superposition + filtrage, qui se règlent bien par gradient.
*Test :* comparer, sur une même petite tâche à deux régimes, une version « à aiguillage » et la version « fréquentielle » ; regarder laquelle se règle plus facilement et plus stablement.

**H4 — La capacité vient du couplage, pas du simple empilement.**
Additionner des bandes indépendantes n'ajoute pas de puissance de calcul en soi (ce ne sont que des canaux parallèles). Le gain arrive quand on autorise les bandes à **s'influencer** (une bande lente qui module une bande rapide). C'est là qu'on dépasse ce qu'un réseau ordinaire fait.
*Test :* mesurer ce qu'on sait résoudre avec bandes indépendantes vs. avec couplage entre bandes ; l'écart doit être net en faveur du couplage.

**H5 — L'"ADN" tient dans la réponse en fréquence.**
Une part de ce qui définit le comportement du réseau peut se ranger dans une description compacte de « comment chaque connexion répond à chaque fréquence », plutôt que dans une longue liste de poids scalaires. Cette description compacte est l'objet qu'on cherchait : une règle génératrice, pas un stock.
*Test :* voir si une réponse en fréquence à peu de paramètres (quelques nombres par connexion) suffit à reproduire un comportement qui, en scalaire, en demanderait beaucoup plus.

---

## 5. Le substrat, expliqué avec des images

**La radio.** Beaucoup d'émetteurs, un seul air, aucune collision : chacun sa fréquence, un poste de radio rouvre celle qu'on veut. Ici, les « émetteurs » sont des neurones, l'« air » est une connexion, le « poste » est un filtre.

**Le prisme.** Une lumière blanche, c'est plein de couleurs superposées. Un prisme les sépare. Notre signal composite, c'est la lumière blanche ; le filtre, c'est le prisme ; chaque couleur suit son propre chemin de poids.

**L'orchestre.** Tous les instruments jouent dans la même salle (même topologie). L'oreille suit la ligne des violons *et* celle des cuivres en même temps, parce qu'ils occupent des registres différents. Une bande lente peut donner le tempo (moduler) aux bandes rapides : c'est le couplage de H4.

---

## 6. Ce qu'on construit en premier

On ne construit pas les cinq hypothèses d'un coup. **Premier jalon : le substrat de H1.**

Objectif minimal et démontrable : *montrer que plusieurs sous-chemins coexistent sur une même arête du graphe et se séparent proprement par filtrage.*

Bonne nouvelle : spikypanda a déjà les briques. Le plugin de traitement du signal fournit des générateurs d'oscillations, des transformées vers le domaine des fréquences et retour, des filtres, un banc de filtres multi-bandes, et un multiplexeur de canaux. Le cœur fournit le graphe, les neurones et les connexions. Il « suffit » d'introduire une connexion dont le poids dépend de la bande, et de câbler une petite démonstration.

Le détail de mise en œuvre — quels fichiers, quels types, quelles étapes — est dans le document compagnon `01-BUILD-SPEC.md`, écrit pour être exécuté pas à pas.

---

## 7. Comment on saura si ça marche (critères de réussite)

Le premier jalon est réussi si, sur une démonstration reproductible :

1. On place deux (puis trois) motifs connus sur des bandes distinctes, on les fait passer sur **une seule** arête, et on récupère chaque motif dans sa bande avec une fuite vers les autres bandes **inférieure à 5 %** (seuil à ajuster, mais fixé d'avance).
2. Chaque bande a bien vu **son propre poids** : en changeant le poids d'une seule bande, seule la sortie de cette bande change.
3. Tout est **différentiable** de bout en bout : on peut faire remonter un gradient à travers la superposition et le filtrage (préparation des jalons suivants).
4. La démonstration tourne dans l'environnement du dépôt, avec un test automatique qui rejoue ces vérifications et passe au vert.

Si l'un de ces points échoue, on l'écrit noir sur blanc et on ajuste l'hypothèse — c'est le but d'un document de travail.

---

## 8. Ce qui pourrait tuer l'idée (et qu'on regarde en face)

- **La fuite entre bandes est trop forte.** Si les bandes « bavent » l'une sur l'autre, la coexistence est une illusion. Parade : bandes plus espacées, meilleurs filtres — mais ça réduit le nombre de canaux utiles.
- **Le matériel numérique n'aime pas ça.** Les processeurs actuels sont taillés pour de gros produits de nombres, pas pour maintenir et filtrer des signaux. L'idée pourrait n'être vraiment efficace que sur du matériel adapté (neuromorphique, optique). Au premier jalon on s'en moque : on veut d'abord montrer que le principe tient.
- **Le multiplexage seul n'apporte rien.** C'est H4 : sans couplage entre bandes, on n'a que des canaux parallèles, pas de puissance nouvelle. Si le couplage ne donne rien, l'intérêt retombe.
- **Le coût en calcul.** Passer dans le domaine des fréquences et revenir a un prix. Il faut qu'il reste raisonnable par rapport à ce qu'on gagne.

---

## 9. Où ça se situe (pour ne pas réinventer, et pour partager honnêtement)

L'idée n'arrive pas de nulle part ; plusieurs communautés ont touché des morceaux, chacune de son côté. On les cite pour **s'appuyer dessus**, pas pour se couvrir :

- **En neurosciences**, l'idée que le cerveau sépare des flux d'information par le rythme des oscillations (des ondes lentes qui cadencent des ondes rapides) est une théorie majeure. C'est exactement « des sous-topologies choisies par la fréquence sur un même câblage ».
- **En matériel optique**, on fait déjà passer plusieurs flux de calcul sur le même guide de lumière à des couleurs différentes. C'est la version physique la plus littérale de notre idée.
- **Côté mathématique**, il existe des réseaux qui apprennent des poids différents selon la fréquence, en passant explicitement par le domaine spectral. Preuve qu'on sait rendre ça entraînable.

Notre apport visé n'est pas une de ces briques isolées, mais leur **assemblage dans un graphe de calcul généraliste** (spikypanda), avec le couplage entre bandes (H4) comme cœur, et l'idée que la réponse en fréquence est une description compacte du comportement (H5).

---

## 10. La vision d'ensemble (où ce jalon s'insère)

Ce substrat multi-fréquence est la **première couche** d'une pile plus large qu'on a esquissée :

1. **Substrat multi-fréquence** *(ce document)* — le medium qui porte plusieurs chemins sur un même câblage.
2. **Plasticité locale** — des connexions qui se re-règlent sur place, vite, pendant l'usage.
3. **Récompense** — un signal global qui décide quelles modifications locales méritent de rester.
4. **Sélection** — garder les règles qui marchent, en préservant la diversité (ne pas ne garder que « le meilleur »).
5. **Règle génératrice ("ADN")** — encoder non pas les poids, mais la règle compacte qui les engendre.

On commence par le bas, par le medium. Le reste vient ensuite, une fois qu'on a montré que plusieurs chemins peuvent vraiment cohabiter sur le même fil.

---

*Ce document est fait pour être discuté, corrigé, contredit. Une hypothèse qui tombe est une bonne nouvelle : elle nous dit où regarder ensuite.*
