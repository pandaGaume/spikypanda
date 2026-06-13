# Knob

`Viz.Control:knob`

Un bouton de contrôle unique, posé comme tuile de dashboard. Noeud SOURCE : il publie la valeur courante du cadran sur sa sortie `value` à chaque tick. C'est la surface de commande générique à un paramètre, par exemple une consigne de vitesse qui pilote le `speed_target` d'un contrôleur FOC, un niveau de charge, un gain.

## Usage

Le cadran est un NexusUI Dial : glisser verticalement pour tourner (convention DAW : vers le haut = plus grand), molette pour l'ajustement fin, double-clic pour saisir une valeur numérique. La tuile se monte automatiquement quand on dépose le noeud (comme toute tuile IRenderable) ; fermer la tuile par sa croix garde le noeud dans le graphe.

## Sortie

- `value` (float) : la position courante du cadran, republiée à chaque tick (un consommateur en aval voit toujours la dernière saisie sans décrochage).

## Éditables

| Champ   | Défaut  | Sens                       |
| ------- | ------- | -------------------------- |
| `label` | "Value" | nom affiché sous le cadran |
| `min`   | 0       | borne basse de la plage    |
| `max`   | 100     | borne haute de la plage    |

La position `value` est sauvegardée (cloneable) : un save/load restaure le dernier réglage. Modifier `min`, `max` ou `label` dans le panneau de propriétés reconstruit le cadran au prochain rendu (NexusUI ne change pas sa plage après construction).

## Piloter un FOC

Câbler `value` sur le `speed_target` du noeud `Physics.Electric.Motor.PMSM:foc` donne une interface de commande de la consigne de vitesse en direct : on tourne le bouton, la boucle fermée FOC + machine suit la consigne, et on observe le courant et la vitesse réagir sur les plots du dashboard. Régler `min`/`max` à la plage de vitesse mécanique visée (par exemple 0 à 314 rad/s).
