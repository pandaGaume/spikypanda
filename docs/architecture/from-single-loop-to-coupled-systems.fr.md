# De la boucle simple aux systèmes couplés : pourquoi nous construisons ça

## Ce que ce document est

C'est le tissu conjonctif entre nos expériences. La démo CO2 MPC (sample 1)
est une preuve de concept pour quelques points théoriques sur les world
models sur microcontrôleur. Le sample 2 ajoutera les contraintes couplées
et démontrera ce que le premier sample n'a délibérément pas pu démontrer.
Ce document explique pourquoi nous avons construit le premier, ce qu'il
nous a réellement appris, et où se trouve la vraie valeur d'un contrôleur
à base de world model.

À lire si tu veux l'arc narratif, pas les détails techniques.

## La question de départ

Considère un habitat scellé : un module lunaire, une capsule spatiale
longue durée, un sous-marin, une plateforme offshore, une salle de
contrôle industrielle en environnement hostile. Les systèmes qui
maintiennent des humains en vie ou qui font tourner le procédé doivent
prendre des décisions en continu, en temps réel, sans possibilité de
déléguer le calcul à un serveur distant. La latence vers la Terre ou vers
le cloud est trop longue, la bande passante trop étroite, la
disponibilité pas garantie.

La question n'est pas "un réseau de neurones peut-il classifier des
données capteurs sur un microcontrôleur". Elle a été répondue de
nombreuses fois. La question est "un microcontrôleur peut-il faire
tourner un contrôleur suffisamment intelligent pour arbitrer entre des
sous-systèmes critiques couplés sous un budget énergétique tendu, en
utilisant des modèles appris de la dynamique du système".

C'est à cette question que SpikyPanda existe pour répondre. Tout le
reste, y compris le runtime ONNX, les opérateurs DSP, la suite de tests
de conformité, le moteur de compute graph, le port C++ CyanMycelium,
sert cette question.

## Ce que le sample 1 a réellement prouvé

Nous avons construit la démo de scrubbing CO2 pour répondre à trois
questions plus étroites d'abord :

**Peut-on faire tourner ensemble un modèle dynamique appris, une
fonction de coût, et un planificateur dans le même compute graph ?**
Oui. Le RolloutNode encapsule un modèle neuronal de 401 paramètres,
l'ObjectiveNode score les trajectoires, le ShootingSelectorNode fait
l'optimisation. L'ensemble tient en quelques kilo-octets et tourne en
environ 2 ms dans le navigateur. Le même compute graph passe par le
runtime TypeScript SpikyPanda et par le runtime C++ CyanMycelium.

**Le concept de world model a-t-il une importance réelle, ou le contrôle
par seuil suffit-il ?** Le contrôleur à seuil et le MPC donnent des
résultats presque identiques sur du matériel sur-dimensionné avec un
objectif unique. Sur du matériel dégradé, le MPC garde le CO2 à environ
40 % plus bas pour la même consommation d'énergie, ou utilise moins
d'énergie pour le même niveau de CO2. C'est une amélioration mesurable
mais pas dramatique. Les deux contrôleurs résolvent le problème.

**La forme de la fonction de coût a-t-elle une importance ?** Oui, et
c'était la leçon la plus importante. Avec un coût binaire (zéro en
dessous d'une limite, grand au-dessus), le MPC dégénère en contrôleur à
seuil parce qu'il n'y a pas de gradient à suivre. Remplacer le coût
binaire par un gradient lisse à trois zones a transformé le MPC en
véritable régulateur. Ce n'est pas une spécificité SpikyPanda. C'est une
propriété générique du model predictive control, et il valait la peine
de la démontrer concrètement.

**La distribution d'entraînement a-t-elle une importance ?** Oui. Quand
le modèle n'a été entraîné que sur du matériel sur-dimensionné, il a
extrapolé médiocrement sur du matériel dégradé. Le ré-entraîner sur une
distribution couvrant les trois régimes matériels a restauré un contrôle
précis dans chaque régime. Le world model ne vaut que par l'étendue des
données sur lesquelles il a été ajusté.

Ces quatre résultats sont documentés dans
[world-models-and-regulation.fr.md](world-models-and-regulation.fr.md).

## La limite honnête du sample 1

Pour un problème de contrôle mono-objectif (garder le CO2 sous une
limite), un PID correctement réglé ou une hystérésis à seuil produit des
résultats très proches de notre MPC. L'avantage du MPC dans ce setup
spécifique est marginal.

C'est la vérité et nous l'assumons. Quiconque lit la démo peut lancer le
seuil et le MPC dos à dos, comparer les chiffres, et conclure que la
machinerie que nous avons enroulée autour d'un réseau de neurones est
disproportionnée pour contrôler une concentration de gaz avec un seul
actionneur.

Si l'histoire s'arrêtait là, SpikyPanda ne serait pas justifié. Des
décennies de théorie du contrôle classique ont déjà résolu le problème
mono-boucle.

## Où se trouve la vraie valeur

Un habitat scellé n'a pas un contrôleur. Il en a une dizaine, et ils
sont couplés. Ce n'est pas une opinion logicielle, c'est un fait
architectural bien documenté dans la littérature sur les habitats
spatiaux. Les travaux d'Olga Bannova à l'Université de Houston sur la
conception d'habitats lunaires et martiens montrent que les interactions
entre le support de vie, la gestion thermique, l'allocation d'énergie et
l'activité de l'équipage définissent l'enveloppe d'habitabilité plus que
n'importe quel sous-système pris isolément. Les systèmes ne peuvent pas
être conçus indépendamment, et par extension, ne peuvent pas non plus
être contrôlés indépendamment.

- **Le scrubbing CO2** enlève le dioxyde de carbone. Il consomme de
  l'énergie.
- **La génération d'oxygène** sépare l'eau par électrolyse. Elle
  consomme de l'énergie et de l'eau.
- **La régulation thermique** pompe la chaleur vers l'intérieur ou vers
  l'extérieur. Elle consomme de l'énergie et dépend de l'état des
  radiateurs.
- **Le contrôle d'humidité** condense la vapeur d'eau et la renvoie
  dans la boucle d'eau potable. Il interagit avec le thermique.
- **Le contrôle de pression** ajuste l'atmosphère totale. Il interagit
  avec les fuites et avec la composition des gaz.
- **La gestion d'énergie** alloue l'énergie disponible, qui est finie
  parce que l'apport solaire varie et que les batteries sont
  dimensionnées pour la survie, pas pour le confort.
- **Le planning d'activité de l'équipage** pilote la demande sur chacun
  de ces sous-systèmes, souvent avec plusieurs heures de préavis.

Une dizaine de sous-systèmes, chacun avec sa propre dynamique, sa
propre échelle de temps, son propre actionneur, ses propres mesures.
Ils partagent le budget énergétique, la boucle d'eau, la composition
atmosphérique. Une décision locale dans un sous-système se propage
comme contrainte sur les autres.

La théorie du contrôle classique gère mal cela. Des boucles PID
indépendantes réglées par sous-système se battent entre elles. Les
schémas de priorité statiques ("d'abord le thermique, puis le CO2, puis
l'humidité") sont fragiles et produisent de mauvais résultats quand la
priorité supposée ne convient pas à l'état courant. Le gain scheduling
aide mais exige qu'un ingénieur humain anticipe chaque transition de
régime. La logique de supervision empilée par-dessus devient une
machine à états illisible que plus personne n'ose toucher.

Ce qu'un world model change, c'est que tous ces sous-systèmes peuvent
partager une représentation unique de l'état de l'habitat et une
fonction de coût unique qui exprime ce que la mission valorise. Un seul
planificateur trouve alors la séquence d'actions (sur tous les
actionneurs, sur un horizon de planification) qui minimise le coût
total.

C'est là que le MPC gagne sa place. Pas en remplaçant un PID sur un
gaz. En arbitrant entre dix sous-systèmes couplés sous une contrainte
d'énergie dure, avec des perturbations futures connues, tout en
respectant des marges de sécurité sur chaque variable.

Aucun contrôleur à seuil ne peut faire ça. Aucune pile de PID
indépendants ne peut le faire non plus, sans un superviseur fragile qui
finit généralement par être son propre problème.

## Ce que le sample 2 démontrera

La prochaine démo garde le CO2 comme l'une des variables, mais elle
ajoute :

**Un budget d'énergie fini.** L'apport solaire varie dans le temps. Les
batteries ont une capacité limitée. Le contrôleur a une enveloppe de
puissance et doit rester à l'intérieur. Si le scrubbing CO2 et la
régulation thermique veulent tous deux la pleine puissance au même
moment, quelque chose doit céder. Le world model choisit quoi
compromettre sur la base de la fonction de coût.

**Une seconde variable critique pour la vie.** Probablement le
thermique, parce que CO2 et thermique se disputent le même budget
énergétique dans un vrai habitat et que la physique est bien
documentée. Le contrôleur doit maintenir simultanément le CO2 et la
température cabine dans leurs plages acceptables.

**Une perturbation prévisible.** Le planning d'activité de l'équipage,
le cycle solaire, ou les deux. Le contrôleur peut regarder devant lui
et agir à l'avance. Un seuil ne le peut pas. Un PID non plus. Un MPC
avec un modèle dynamique correct le peut.

**Un mode d'échec visible pour le contrôle classique.** Un scénario
concret où une paire bien réglée de PID indépendants produit un mauvais
résultat (violation de contrainte, épuisement de ressource, ou
oscillation dangereuse) alors que le MPC produit un résultat sûr. Sans
cela, la démo est décorative.

Le livrable n'est pas "un autre sample". C'est la démonstration
concrète, exécutable dans un navigateur, qu'un contrôleur à base de
world model sur microcontrôleur fait quelque chose qui ne peut être
remplacé par aucune combinaison de contrôleurs classiques réglés pour
chaque sous-système isolément.

## La position que cela prend

SpikyPanda n'est pas un énième runtime ONNX. Il en existe plein. Ce
n'est pas non plus un toolkit de réseaux de neurones. Il en existe
plein.

C'est un moteur pour faire tourner des world models appris et couplés
sur microcontrôleur, avec une fonction de coût et un planificateur,
fermant la boucle sense-think-act à l'intérieur de l'appareil. Le
sample CO2 a établi la machinerie. Le prochain sample établira pourquoi
la machinerie est nécessaire plutôt que simplement possible.

C'est le récit. Tout ce que nous avons construit jusqu'ici a gagné sa
place dedans. Tout ce que nous construirons ensuite doit répondre : ça
aide ce récit spécifique ? Si oui, ça ship. Sinon, c'est intéressant
mais pas pertinent.

## Ce qui vient après le sample 2

Si la démo couplée réussit, l'étape suivante est le hardware. Un petit
analogue physique, probablement basé sur un ESP32, faisant tourner le
même compute graph, pilotant de vrais capteurs et de vrais actionneurs
dans une enceinte scellée. La démo navigateur est la preuve du
logiciel. La démo hardware est la preuve du déploiement.

Si la démo couplée révèle quelque chose que nous n'avions pas anticipé,
nous le documentons honnêtement et ajustons. C'est comme ça que le
premier sample s'est passé. Nous pensions prouver que MPC bat le seuil.
Nous avons prouvé quelque chose de plus subtil et, d'une certaine
manière, de plus utile : nous avons prouvé que la valeur d'un world
model émerge avec le couplage, pas avec une boucle unique. C'est ce
résultat que le sample 2 doit exploiter.
