# SpikyPanda - TODO

## Next Steps

### Motor Current Signature Analysis (MCSA)
- Analyse spectrale du courant moteur pour la detection de defauts electriques
- Un defaut mecanique (roulement, excentricite, barre rotor cassee) cree des vibrations a des frequences caracteristiques
- Ces vibrations modulent le courant et creent des harmoniques laterales autour de la fondamentale (50/60Hz)
- La frequence des harmoniques identifie le type de defaut :
  - Excentricite : f1 +/- fr (frequence de rotation)
  - Barres rotor cassees : f1(1 +/- 2s) ou s = glissement
  - Roulement : frequences BPFO/BPFI
- Implementation : FFT + classification (CNN 1D sur le spectre ou RNN sur coefficients FFT glissants)
- Complementaire au sample Motor Vibration existant (vibration = effet mecanique, courant = effet electromagnetique)
- Dataset : pEMP contient deja les fichiers "electrically_XXX_ohm_fault" pour les defauts electriques

### SNN Integration
- Integrer les Spiking Neural Networks dans les samples
- Use case bestioles : neurones LIF avec STDP pour l'apprentissage temporel local
- Bridge entre RNN (rate-coded) et SNN (event-driven)

### Neuroevolution
- Training par mutation + selection naturelle (bestioles)
- Mutations structurelles : ajouter/supprimer neurones et synapses dans le graph
- Comparaison avec backprop sur les memes taches

### LiDAR Simulator - Sensor Noise Model
- Appliquer le bruit capteur dans BabylonJS via post-process shader sur le depth render target
- Types de bruit a simuler :
  - Gaussien proportionnel a la distance : sigma = k * depth
  - Dropout aleatoire (~5%) : surfaces absorbantes, hors portee
  - Edge noise : bruit accru sur les contours (gradient de depth eleve)
  - Quantification : resolution limitee du capteur
- Le bruit appartient au capteur (simulateur), pas au post-processing
- Camera depth buffer (pas ray-tracing) - FOV max 180, multi-camera ou cubemap pour 360
- A appliquer avant la projection en grille 64x64x6

### 3D Brain Visualization
- Etendre Brain3D au-dela de XOR : visualiser CNN et RNN
- Thin instances pour les reseaux larges (milliers de neurones)
- Mode "layer slice" pour les CNN

### Astrocyte / Spatial Neurons
- Meta-neurones qui observent les neurones dans un rayon spatial
- Activation sparse : couper la propagation dans les zones inactives
- Calcul par region au lieu de par neurone
- Potentiel pour l'optimisation de l'inference
