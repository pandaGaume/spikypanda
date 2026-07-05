# Guide de la validation — pour tout le monde

*Ce guide explique, sans aucun vocabulaire technique, ce que vérifie le fichier
`validation-pedagogique.mjs` et comment le modifier. Aucune connaissance en maths
ou en informatique n'est nécessaire pour le lire.*

## L'idée, avec une image

Pensez à la radio. Dans l'air, autour de vous, il y a en ce moment des dizaines de
stations qui émettent **en même temps, au même endroit**. Elles ne se mélangent pas,
parce que chacune a **sa fréquence** (« 98.4 FM », « 105.7 FM »…), et votre poste
rouvre celle que vous choisissez.

Nous voulons faire la même chose **à l'intérieur d'un réseau** : faire passer
**plusieurs messages sur un seul fil**, chacun sur sa fréquence, puis les récupérer
un par un. Si ça marche, un même câblage peut porter plusieurs calculs à la fois,
sans les dupliquer. C'est le cœur de l'idée du projet.

Le fichier de validation **prouve que ça marche**, en posant quatre questions simples.

## Les quatre vérifications

**Test 1 — Les messages arrivent-ils intacts ?**
On envoie trois messages (trois nombres), chacun sur sa station, tous mélangés sur un
seul fil. Puis on rouvre chaque station et on regarde si on retrouve bien le message
de départ. C'est comme poster trois lettres dans la même boîte et vérifier qu'aucune
n'a été abîmée.

**Test 2 — Un message déborde-t-il sur la station voisine ?**
Le vrai risque, c'est qu'un message « bave » sur la station d'à côté. Pour le mesurer,
on n'allume **qu'une** station à la fois et on écoute les autres : tout ce qu'on
entend ailleurs est du débordement. On veut qu'il reste **sous 5 %**.

**Test 3 — Changer un message dérange-t-il les autres ?**
On modifie un seul message et on vérifie que les autres ne bougent pas d'un poil.
C'est la preuve que chaque station est vraiment indépendante.

**Test 4 — Combien de stations tiennent sur un fil ?**
On rapproche les stations petit à petit. À un moment, elles se gênent. Ce test trouve
l'écart minimum où tout reste propre, et en déduit **combien de stations** on peut
mettre sur un même fil.

## Comment le lancer

Ouvrez un terminal dans ce dossier et tapez :

```
node validation-pedagogique.mjs
```

Rien à installer. Le programme affiche chaque test avec un ✅ ou un ❌ et une phrase
d'explication, puis un résumé.

## Comment le modifier (trois expériences faciles)

Tout ce qui est modifiable est en haut du fichier, dans le bloc marqué
**« 👉 À TOI DE JOUER »**. Vous ne pouvez rien casser : changez, relancez, observez.

1. **Changez les messages.** Remplacez `MESSAGES = [0.8, 0.5, 0.3]` par d'autres
   nombres. Le test 1 doit toujours retrouver exactement ce que vous avez mis.

2. **Ajoutez une station.** Ajoutez une fréquence dans `STATIONS` (par exemple
   `320`), un message dans `MESSAGES` et un volume dans `VOLUMES` — les trois listes
   doivent avoir la même longueur. Vous verrez qu'un quatrième message passe sans
   problème.

3. **Rapprochez les stations, exprès.** Mettez des fréquences très proches, par
   exemple `STATIONS = [100, 101, 102]`. Regardez le débordement du test 2 grimper :
   c'est la limite du système qui apparaît. Instructif.

## Comment lire le résultat

- **Tout est ✅** : plusieurs messages voyagent sur un seul fil et se récupèrent
  proprement. C'est ce qu'on voulait montrer.
- **Le test 2 passe au ❌** : les stations sont trop proches ou mal placées, elles
  débordent l'une sur l'autre. Écartez-les, ou revenez à des fréquences « rondes ».
- **Le test 4** vous donne un ordre de grandeur : combien de calculs différents un
  même fil pourrait porter en même temps.

## Ce que ça ne dit pas (honnêteté)

Cette validation montre que la **cohabitation** de plusieurs messages sur un fil
fonctionne. Elle ne teste pas encore l'**apprentissage** ni la partie « le réseau se
règle tout seul » : ce sont les étapes suivantes du projet. Ici, on a posé la
première pierre — le support qui portera le reste.
