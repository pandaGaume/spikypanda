# Décision 003 — Pas de poids : un processus

**Statut :** ACTÉ comme **boussole** (orientation de fond, pas sprint court terme)
**Portée :** fondamentale — redéfinit *l'objet* du projet, pas un composant
**Fait suite à :** Décisions 001 (complexe) et 002 (CVNN) — qu'elle recadre sans annuler

---

## La décision, en une phrase

L'objet n'est pas un jeu de **poids** (une mémoire acquise), mais un **processus** : des
**fonctions de transfert pilotées par des événements (spikes)**, **régulées par une chimie
lente** (neuromodulation), **encodées par une règle topologique + un aléa développemental**.
Générer des poids, c'est produire le *fossile* d'un apprentissage ; la cible est le
*générateur qui le fait vivre*.

---

## Contexte : la critique qui frappe le socle

Tout ce qu'on a construit — `SpectralSynapse` (`gain/phase` par bande), CVNN, et même le
jalon 5 « générer le substrat » — raffine la **représentation** du poids (complexe,
spectral, phase, couplage) mais ne quitte jamais le paradigme « **un nombre appris et
stocké** ». Or, dans une architecture neurale biologique, il n'y a pas de poids posé : il y
a un processus. **« Générer les poids revient à considérer la mémoire comme acquise. »** Un
poids est le fossile d'un apprentissage — on peut le générer, mais on a sauté le processus
vivant qui l'a produit et qui continuerait à s'adapter.

---

## La distinction fondatrice : paramètre / état / processus

| | **Paramètre** | **État** | **Processus** |
|---|---|---|---|
| Quoi | un nombre posé | une variable dynamique | la règle qui fait évoluer l'état |
| Quand fixé | une fois, par l'apprentissage | jamais : maintenu en continu | encodé une fois (génome), tourne toujours |
| Exemple | poids d'un ANN, notre `w_b` | efficacité synaptique | plasticité pilotée par spikes + chimie |
| Mémoire | trace stockée | reconstruction permanente | jamais « acquise », toujours en cours |

Nuance de précision : en biologie il *y a* une grandeur physique par synapse (récepteurs,
vésicules, phosphorylation). Mais c'est de l'**état maintenu par un processus**, pas un
**paramètre posé**. « Pas de poids » n'est pas littéral — c'est : **le poids est de l'état,
jamais un paramètre.**

---

## Ce que ça implique

- La valeur (`gain/phase`) doit être comprise comme l'**état momentané d'un processus**,
  pas comme une mémoire. On **encode le générateur**, pas le fossile.
- **Le jalon 5 tombe sous la critique.** « Un petit générateur reproduit un substrat
  entier » génère encore *les poids entraînés*. La version forte n'encode pas la mémoire :
  elle encode le **processus qui apprend**. → jalon 5 à réorienter.
- **Spectral ↔ spiking sont le même objet.** En H7, un **spike est un paquet d'harmoniques
  verrouillées en phase**. Donc le substrat n'aurait jamais dû *stocker* des `w_b` : il
  aurait dû être une fonction de transfert **qu'un spike excite dynamiquement**, gatée par
  une variable chimique lente. spikypanda est un moteur **spiking** — c'est natif.

---

## Nuances honnêtes (pour ne pas s'emballer)

1. **In-context learning** : un système à poids *gelés* peut néanmoins *faire tourner un
   processus d'apprentissage* à l'inférence. Donc paramètre et processus ne s'excluent pas
   totalement — un substrat paramétrique peut *héberger* du processus. La dichotomie est
   plus souple qu'elle n'en a l'air.
2. **Ça existe déjà, en partie.** Le **reservoir computing / Liquid State Machines**
   (Maass, 2002) ne *règle pas* les poids internes : il lit la dynamique transitoire d'un
   système excité par des spikes. Les **synapses dynamiques** (Tsodyks-Markram) sont des
   fonctions de transfert dictées par le *timing* des spikes. L'intuition a des
   incarnations concrètes.
3. **Le mur de faisabilité.** La descente de gradient veut des paramètres *différentiables*.
   Un processus événementiel (spikes) régulé par de la chimie est largement **non
   différentiable** — on ne l'entraîne qu'avec des béquilles (**surrogate gradients**,
   **e-prop**). Plus fidèle, beaucoup moins traçable. **Donc le substrat paramétrique reste
   l'approximation qu'on sait construire aujourd'hui ; le processus est la vraie cible,
   pas encore atteignable à l'échelle.** Les deux sont vrais.

---

## Ce que ça ne casse pas

Le spectral, le complexe, la phase, le couplage restent **justes comme représentation**.
Cette décision ne change pas la *math* du substrat — elle change le **statut de la valeur** :
état d'un processus, pas paramètre d'une mémoire. Les preuves H1–H7 tiennent ; elles
décrivent la représentation, pas le régime de stockage.

---

## Réorientation (la vue unifiée, sans poids)

> **règle topologique + aléa développemental** (génome)
> → **fonctions de transfert pilotées par les spikes**
> → **régulées par une chimie lente** (neuromodulation)
> → un **processus qui tourne**, jamais une mémoire figée.

Dans cette vue, les jalons ne sont plus des étapes séparées mais des **facettes d'un même
objet** :
- **Jalon 2** (plasticité) = l'état est dynamique, pas stocké.
- **Jalon 3** (récompense/chimie) = la régulation lente du processus.
- **Jalon 5** (génome) = le **générateur du processus** — *pas* des poids. **Réorienté.**
- **Jalon 6** (champ ondulatoire) = la limite continue de ce processus.

## Statut honnête

C'est l'orientation **la plus ambitieuse et la moins traçable**. C'est la **ligne de fond
(« true north »)**, pas un livrable court terme. On continue de construire le substrat
paramétrique (traçable, entraînable par CVNN) — mais en gardant cette cible en ligne de
mire, et en refusant de confondre « avoir généré des poids » avec « avoir un apprenant ».

## Conséquences documentaires

- Réécrire le **jalon 5** : « encoder le *processus qui apprend* », pas « générer les
  poids ».
- Ajouter à la biblio : reservoir computing (Maass 2002), synapses dynamiques
  (Tsodyks-Markram), surrogate gradients (Neftci-Zenke 2019), e-prop (Bellec 2020).
- Cette décision est une **boussole** citée par le socle et la roadmap, pas un jalon.
