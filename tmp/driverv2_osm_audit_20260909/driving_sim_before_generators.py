"""
driving_sim.py : V2
===================
Simulateur de conduite avec CROISIERE REALISTE et TRAFIC MOUVANT
(car-following IDM), acquisition declenchee par evenement en aval.

Evolutions V2 (motivees par la campagne UAH-DriveSet, cf. docs/eval_uah.md) :
  - les routes-jouets V1 sur-representaient les manoeuvres (capture ~60-85 %
    vs 13 % sur conduite reelle) -> tronc,ons longs, autoroutes peu courbes,
    vraies lignes droites ;
  - profil de vitesse par INTEGRATION TEMPORELLE IDM (Intelligent Driver
    Model) au lieu du two-pass spatial : le style vit dans les parametres
    IDM (accel/decel confort, TIME HEADWAY = gestion d'inter-distance,
    anticipation) ;
  - TRAFIC MOUVANT : leaders episodiques avec ralentissements en accordeon,
    le confondant intra-dispositif n.1 et le revelateur du style ;
  - ERRANCE DE CROISIERE (processus OU sur la vitesse cible) : personne ne
    tient une vitesse exacte ;
  - les ARRETS (signalisation) sont des leaders virtuels immobiles : le
    freinage vers un stop emerge de l'IDM avec le style du conducteur.

Evolutions V3 (7 septembre 2026, motivees par le lot reel X1, 48 trajets,
5 conducteurs, une voiture ; cf. DataLake/campagnes/X1_20260907 et
legacy/v1/README.md) :
  - le VOLANT est un mouvement, plus un bruit : micro-corrections en
    processus autoregressif (STEER_TAU_S), transitions de courbure
    progressives (CLOTHOID_M). Avant, le lateral et le lacet simules etaient
    un bruit blanc (autocorrelation 0,007 a un pas contre 0,276 au reel) ;
  - VIBRATION de route et de moteur sur les canaux horizontaux
    (VehicleProfile.yaw_vib, lat_vib, long_vib), propriete du VEHICULE et
    non du conducteur ;
  - routes rééquilibrees vers l'urbain et le rural (le lacet reel est trois
    fois plus fort que celui de la simulation d'alors) ;
  - le STYLE d'un conducteur vit dans l'amplitude de ses manoeuvres
    (accel/frein/anticipation/vitesse/laterale toleree), plus dans son
    niveau de texture : micro_yaw_std, micro_long_std et jerk_smooth sont
    resserres a presque une constante (dataset.random_style). Mesure : la
    simulation separait les conducteurs 2,4 fois trop sur les a-coups et
    2,3 fois trop sur l'amplitude laterale, et 2 fois trop peu sur le lacet
    et l'amplitude longitudinale ;
  - le canal vertical a_vert reste produit mais n'entre plus dans
    l'encodeur (model.INPUT_GAIN[2] = 0) : il mesure la route, pas le
    conducteur.

Principe directeur INCHANGE : sortie au schema standard
ax,ay,az,gx,gy,gz,lat,lon,alt,speed (repere capteur) ; toute la chaine aval
(vehicle_frame -> detect -> embedding) est partagee sim/reel. Le simulateur
ne segmente pas et ne projette pas.

Dependances : numpy, pandas.
"""
from __future__ import annotations

from dataclasses import dataclass, field
import numpy as np
import pandas as pd

G = 9.81


# --------------------------------------------------------------------------- #
# Parametrisations
# --------------------------------------------------------------------------- #
@dataclass
class DriverStyle:
    """Ce qui caracterise un conducteur (fixe par conducteur)."""
    a_accel_max: float = 1.8       # IDM a : accel confort (m/s^2)
    a_brake_max: float = 2.5       # borne dure de freinage (m/s^2)
    a_lat_max: float = 2.5         # tolerance laterale (vitesse en virage)
    speed_factor: float = 1.0      # vitesse visee vs limite
    jerk_smooth: float = 0.6       # 0..1 douceur (lissage accel)
    micro_yaw_std: float = 0.010   # rad/s micro-corrections volant (texture HF)
    micro_long_std: float = 0.05   # m/s^2 a-coups longitudinaux (texture HF)
    anticipation: float = 1.0      # >1 freine tot/doux, <1 tard/fort
    headway_T: float = 1.4         # s : time headway IDM : gros discriminant
    cruise_wander: float = 0.03    # errance relative de vitesse en croisiere


@dataclass
class VehicleProfile:
    """Signature vehicule (FIXE par session)."""
    engine_vib_freq: float = 30.0
    engine_vib_amp: float = 0.05
    susp_freq: float = 1.5
    susp_amp: float = 0.08
    # V3 (7 septembre 2026) : vibration de route et de moteur vue par les
    # capteurs HORIZONTAUX a 10 Hz. Depuis V6 (9 septembre 2026) c'est un
    # processus correle de constante VIB_TAU_S, non plus un bruit blanc. Mesure sur
    # le lot reel X1 : lacet 0,139 rad/s d'ecart-type dont une large part
    # sans correlation d'un pas au suivant ; lateral 1,21 m/s2 avec une
    # autocorrelation de 0,28 a un pas. Sans ces termes, le lateral et le
    # lacet simules etaient un bruit blanc minuscule (0,046 rad/s) et
    # l'encodeur apprenait des motifs temporels qui n'existent pas.
    yaw_vib: float = 0.05      # rad/s
    lat_vib: float = 0.5       # m/s2
    long_vib: float = 0.2      # m/s2


@dataclass
class SensorProfile:
    fs: float = 10.0
    accel_noise: float = 0.05
    gyro_noise: float = 0.004
    accel_bias: np.ndarray = field(default_factory=lambda: np.zeros(3))
    gyro_bias: np.ndarray = field(default_factory=lambda: np.zeros(3))


@dataclass
class SessionConfig:
    """Une session = 1 vehicule + 1 montage, FIXES. Plusieurs conducteurs/routes."""
    vehicle: VehicleProfile
    sensor: SensorProfile
    mount_euler: np.ndarray         # (roll,pitch,yaw) montage vehicule->capteur


@dataclass
class TrafficModel:
    """Signalisation : noeuds -> ARRETS effectifs avec temps d'arret."""
    p_red: float = 0.5
    p_giveway_stop: float = 0.3
    dwell_signal: tuple = (5.0, 40.0)
    dwell_stop: tuple = (1.0, 3.0)
    dwell_giveway: tuple = (0.0, 2.0)
    # ROND-POINT (9 septembre 2026, demande de l'utilisateur : « tu stoppes la
    # plupart du temps avant d'attaquer une grosse courbe a gauche avant un
    # autre virage perpendiculaire a droite »). On cede le passage, donc on
    # s'arrete souvent, mais brievement.
    p_roundabout_stop: float = 0.65
    dwell_roundabout: tuple = (0.5, 4.0)
    start_end_dwell: float = 2.5


@dataclass
class TrafficFlow:
    """Trafic MOUVANT (car-following). rate_scale module les densites
    d'episodes leader definies par type de route."""
    enabled: bool = True
    rate_scale: float = 1.0
    episode_duration: tuple = (20.0, 150.0)   # s
    leader_factor: tuple = (0.60, 0.95)       # v_lead initiale vs v_ego
    accordion_rate: float = 0.015             # proba/s d'un ralentissement leader
    accordion_factor: tuple = (0.30, 0.70)    # creux du ralentissement
    accordion_duration: tuple = (4.0, 12.0)   # s
    spawn_gap: tuple = (15.0, 50.0)           # m (+ v*T)
    lose_gap: float = 180.0                   # m : leader perdu de vue


# Geometrie + densites par type de route. V2 : vraies croisieres (la plupart
# des virages reels sont larges et pris sous le seuil de detection ; les
# manoeuvres franches sont l'exception, pas la regle).
ROAD_TYPES = {
    "urban":    dict(v_limit=13.9, length=(1000, 4000), curve_prob=0.35,
                     radius=(25, 150), straight=(100, 600),
                     signals_per_km=1.2, stops_per_km=0.6, giveway_per_km=1.0,
                     leader_per_min=1.2, turn_prob=0.22, turn_radius=(8, 25),
                     roundabout_prob=0.050),
    "rural":    dict(v_limit=25.0, length=(2000, 8000), curve_prob=0.30,
                     radius=(80, 400), straight=(200, 1200),
                     signals_per_km=0.1, stops_per_km=0.3, giveway_per_km=0.5,
                     leader_per_min=0.7, turn_prob=0.08, turn_radius=(12, 40),
                     roundabout_prob=0.030),
    "motorway": dict(v_limit=36.1, length=(5000, 20000), curve_prob=0.10,
                     radius=(500, 2000), straight=(500, 2500),
                     signals_per_km=0.0, stops_per_km=0.0, giveway_per_km=0.02,
                     leader_per_min=0.5, turn_prob=0.0, turn_radius=(50, 80),
                     roundabout_prob=0.0),
}

# Ponderation du tirage des tronc,ons : le kilometrage reel est domine par
# l'autoroute et le rural, pas par l'urbain.
ROAD_TYPE_WEIGHTS = {"urban": 0.50, "rural": 0.40, "motorway": 0.10}
# V3 (7 septembre 2026) : la campagne reelle X1 roule en peri-urbain (vitesse
# mediane 8 a 15 m/s) avec un lacet trois fois plus fort que la simulation
# d'alors (0,139 contre 0,046 rad/s). L'autoroute a rayons de 500 a 2 000 m
# ne produit presque aucun virage : elle passe de 40 % a 10 % du tirage.


# --------------------------------------------------------------------------- #
# Outils
# --------------------------------------------------------------------------- #
def euler_to_R(roll, pitch, yaw):
    cr, sr = np.cos(roll), np.sin(roll); cp, sp = np.cos(pitch), np.sin(pitch)
    cy, sy = np.cos(yaw), np.sin(yaw)
    Rz = np.array([[cy, -sy, 0], [sy, cy, 0], [0, 0, 1]])
    Ry = np.array([[cp, 0, sp], [0, 1, 0], [-sp, 0, cp]])
    Rx = np.array([[1, 0, 0], [0, cr, -sr], [0, sr, cr]])
    return Rz @ Ry @ Rx


# --------------------------------------------------------------------------- #
# 1. Geometrie de route + NOEUDS de signalisation
# --------------------------------------------------------------------------- #
def _pas_local(kappa_abs, v_limit):
    """Pas de route, en metres, adapte au rayon et a la vitesse tenable (V7)."""
    if kappa_abs <= 1e-9:
        return DS_DROITE_M
    v = min(v_limit, float(np.sqrt(A_LAT_CONFORT / kappa_abs)))
    return float(np.clip(v * DS_CIBLE_S, DS_MIN_M, DS_MAX_M))


def make_road(rng, ds=None, road_types=None):
    """Route = suite de tronc,ons (urbain/rural/autoroute). Retourne
    (s, kappa, v_limit, nodes, type_per_point).

    La grille est NON UNIFORME depuis V7 (voir DS_CIBLE_S) : le pas suit le
    rayon et la vitesse tenable. L'argument `ds` est conserve pour compatibilite
    et force un pas constant quand il est donne (reproduction des jeux
    anterieurs)."""
    names = list(ROAD_TYPES)
    weights = np.array([ROAD_TYPE_WEIGHTS[n] for n in names])
    n_stretch = int(rng.integers(1, 4))
    seq = road_types or list(rng.choice(names, size=n_stretch, p=weights / weights.sum()))

    s_list, k_list, vlim_list, type_list, dl_list = [], [], [], [], []
    nodes = []
    s = 0.0
    for rt_name in seq:
        rt = ROAD_TYPES[rt_name]
        stretch_len = rng.uniform(*rt["length"])
        start_idx = len(s_list)
        built = 0.0
        while built < stretch_len:
            u = rng.random()
            if u < rt.get("turn_prob", 0.0):
                # V3 : virage d'INTERSECTION (angle droit, petit rayon), pris
                # a basse vitesse par la contrainte laterale du style. C'est
                # ce qui donne au lacet reel sa composante lente
                # (autocorrelation 0,14 a cinq pas) et son amplitude (0,139
                # rad/s), que les grandes courbes routieres ne produisent pas.
                radius = rng.uniform(*rt["turn_radius"])
                angle = rng.uniform(np.pi / 2 - 0.3, np.pi / 2 + 0.3)
                L = min(radius * angle, stretch_len - built); k = rng.choice([-1, 1]) / radius
            elif u < rt.get("turn_prob", 0.0) + rt["curve_prob"]:
                radius = rng.uniform(*rt["radius"]); angle = rng.uniform(np.pi / 6, np.pi)
                L = min(radius * angle, stretch_len - built); k = rng.choice([-1, 1]) / radius
            elif u < (rt.get("turn_prob", 0.0) + rt["curve_prob"]
                      + rt.get("roundabout_prob", 0.0)):
                # ROND-POINT (9 septembre 2026, demande de l'utilisateur). Ce
                # n'est pas un virage mais une SEQUENCE : on cede le passage et
                # on s'arrete la plupart du temps, on tourne a GAUCHE tout
                # autour de l'ilot, puis on ressort par un virage a DROITE
                # presque perpendiculaire. Le noeud « roundabout » est pose au
                # debut de l'approche, c'est lui qui declenche l'arret.
                r_rond = rng.uniform(*ROND_RAYON_M)
                r_sortie = rng.uniform(*ROND_SORTIE_RAYON_M)
                segments = [
                    (rng.uniform(*ROND_APPROCHE_M), 0.0),
                    (r_rond * rng.uniform(*ROND_ANGLE), 1.0 / r_rond),
                    (r_sortie * rng.uniform(*ROND_SORTIE_ANGLE), -1.0 / r_sortie),
                ]
                nodes.append((len(s_list), "roundabout"))
                for L_seg, k_seg in segments:
                    pas = ds if ds else _pas_local(abs(k_seg), rt["v_limit"])
                    L_seg = min(L_seg, max(pas, stretch_len - built))
                    npts_seg = max(1, int(round(L_seg / pas)))
                    for _ in range(npts_seg):
                        s_list.append(s); k_list.append(k_seg); dl_list.append(pas)
                        vlim_list.append(rt["v_limit"]); type_list.append(rt_name)
                        s += pas
                    built += npts_seg * pas
                continue
            else:
                L = min(rng.uniform(*rt["straight"]), stretch_len - built); k = 0.0
            pas = ds if ds else _pas_local(abs(k), rt["v_limit"])
            npts = max(1, int(round(L / pas)))
            for _ in range(npts):
                s_list.append(s); k_list.append(k); dl_list.append(pas)
                vlim_list.append(rt["v_limit"]); type_list.append(rt_name)
                s += pas
            built += npts * pas
        end_idx = len(s_list)
        if end_idx <= start_idx:
            continue
        km = stretch_len / 1000.0
        for typ, per_km in [("traffic_signals", rt["signals_per_km"]),
                            ("stop", rt["stops_per_km"]),
                            ("give_way", rt["giveway_per_km"])]:
            n_nodes = rng.poisson(per_km * km)
            for _ in range(int(n_nodes)):
                idx = int(rng.integers(start_idx, end_idx))
                nodes.append((idx, typ))
    kappa = np.array(k_list)
    # V3 : transition progressive entre ligne droite et virage (clothoide).
    # Sans elle la courbure sautait d'un point au suivant et le lacet restait
    # constant a l'interieur d'un virage : aucune dynamique de volant dans une
    # fenetre.
    #
    # V5 (9 septembre 2026, objection de l'utilisateur : « 25 m lisse sur 16 m
    # ca le fait pas ») : la longueur de la transition est PROPORTIONNELLE A LA
    # VITESSE, elle n'est pas fixe. Le conducteur tourne le volant en un temps a
    # peu pres constant (CLOTHOID_TAU_S), donc la transition est courte a basse
    # vitesse et longue a haute vitesse. Une largeur fixe de 16 m se trompait
    # dans les deux sens, ce qui a ete mesure :
    #   virage serre  R = 8 m, v = 4,9 m/s : il faut 7 m, on lissait sur 16
    #                 (2,3 fois trop, et l'arc lui-meme ne fait que 10 a 15 m,
    #                  donc la courbure crete tombait a 0,64 de sa valeur)
    #   urbain        v = 13,9 m/s : il faut 21 m
    #   rural         v = 25,0 m/s : il faut 38 m
    #   autoroute     v = 36,1 m/s : il faut 54 m (3,4 fois trop peu)
    # Consequence mesuree du defaut : la courbure simulee variait 1,5 fois plus
    # vite que la reelle (0,330 contre 0,216 par 0,1 s).
    #
    # La vitesse tenable en un point est bornee par la loi et par
    # l'acceleration laterale de confort (A_LAT_CONFORT) : v = sqrt(a / |kappa|).
    # La moyenne glissante devient donc a largeur VARIABLE, calculee en O(n) par
    # somme cumulee.
    vlim = np.array(vlim_list)
    s_arr = np.array(s_list)
    dl = np.array(dl_list) if dl_list else np.full(len(kappa), 2.0)
    v_lat = np.sqrt(A_LAT_CONFORT / np.maximum(np.abs(kappa), 1e-9))
    largeur = np.clip(np.minimum(vlim, v_lat) * CLOTHOID_TAU_S,
                      CLOTHOID_MIN_M, CLOTHOID_MAX_M)
    if len(kappa) > 3:
        # V7 : la grille etant non uniforme, la fenetre de lissage est definie en
        # METRES et la moyenne est PONDEREE PAR LA LONGUEUR de chaque pas. Sans
        # la ponderation, un cote fin de la fenetre (virage serre) pesserait plus
        # qu'un cote grossier (ligne droite) a longueur egale.
        c_k = np.concatenate([[0.0], np.cumsum(kappa * dl)])
        c_l = np.concatenate([[0.0], np.cumsum(dl)])
        lo = np.searchsorted(s_arr, s_arr - largeur / 2.0, side="left")
        hi = np.searchsorted(s_arr, s_arr + largeur / 2.0, side="right")
        hi = np.maximum(hi, lo + 1)
        long_tot = c_l[hi] - c_l[lo]
        kappa = np.where(long_tot > 1e-9, (c_k[hi] - c_k[lo]) / np.maximum(long_tot, 1e-9), kappa)
    return (np.array(s_list), kappa, np.array(vlim_list),
            nodes, np.array(type_list))


# --------------------------------------------------------------------------- #
# 2. Signalisation : noeuds -> arrets effectifs (idx, dwell)
# --------------------------------------------------------------------------- #
def apply_traffic(nodes, n_points, tm: TrafficModel, rng):
    stops = {}

    def add(idx, dwell):
        stops[idx] = max(stops.get(idx, 0.0), float(dwell))

    for idx, typ in nodes:
        if typ == "traffic_signals":
            if rng.random() < tm.p_red:
                add(idx, rng.uniform(*tm.dwell_signal))
        elif typ == "stop":
            add(idx, rng.uniform(*tm.dwell_stop))
        elif typ == "give_way":
            if rng.random() < tm.p_giveway_stop:
                add(idx, rng.uniform(*tm.dwell_giveway))
        elif typ == "roundabout":
            if rng.random() < tm.p_roundabout_stop:
                add(idx, rng.uniform(*tm.dwell_roundabout))
    add(0, tm.start_end_dwell)
    add(n_points - 1, tm.start_end_dwell)
    return sorted(stops.items())


# --------------------------------------------------------------------------- #
# 3. Profil de vitesse STATIQUE (contraintes route, sans dynamique)
# --------------------------------------------------------------------------- #
def curve_speed_profile(kappa, v_limit, style: DriverStyle):
    """v_max(s) = min(limite * facteur de style, contrainte laterale)."""
    eps = 1e-3
    v_lat = np.sqrt(style.a_lat_max / np.maximum(np.abs(kappa), eps))
    return np.minimum(np.minimum(v_limit * style.speed_factor, v_lat), 60.0)


# --------------------------------------------------------------------------- #
# 4. Integration temporelle IDM : croisiere + leaders + arrets
# --------------------------------------------------------------------------- #
IDM_DELTA = 4.0
IDM_S0 = 2.5          # m : inter-distance minimale a l'arret


def _idm_accel(v, v0, a_max, gap=None, dv=None, T=0.0, b=2.0):
    """Acceleration IDM. gap/dv None = conduite libre."""
    a = a_max * (1.0 - (v / max(v0, 0.5)) ** IDM_DELTA)
    if gap is not None:
        s_star = IDM_S0 + v * T + v * dv / (2.0 * np.sqrt(a_max * b))
        a -= a_max * (max(s_star, 0.0) / max(gap, 0.5)) ** 2
    return a


def integrate_trip(rng, s_grid, kappa, v_curve, types, stops,
                   style: DriverStyle, fs: float, flow: TrafficFlow,
                   max_steps: int = 40000):
    """Integre la dynamique ego a fs Hz le long de la route.

    Retourne tt, v_t, a_long, yaw_rate, meta. Les arrets (signalisation)
    sont des leaders virtuels immobiles ; les leaders mobiles apparaissent
    par episodes avec ralentissements en accordeon.
    """
    dt = 1.0 / fs
    # V7 : la grille de route est NON UNIFORME (pas adapte au rayon et a la
    # vitesse). La position se lit par recherche dichotomique, jamais par
    # division par un pas suppose constant.
    n_grid = len(s_grid)
    s_end = float(s_grid[-1])

    b_comfort = float(np.clip(style.a_brake_max / max(style.anticipation, 0.3), 0.8, 4.0))
    # DEFAUT CORRIGE le 9 septembre 2026 : le simulateur ne freinait avant le
    # virage que dans 70 % des entrees contre 86 % au reel (horizon trop court).
    lookahead_base = max(22.0, 32.0 * style.anticipation)

    wander = 0.0
    tau_w = 20.0          # s : temps de correlation de l'errance de croisiere

    stop_q = [(float(s_grid[min(i, n_grid - 1)]), dw) for i, dw in stops]
    stop_q.sort()

    s = 0.0
    v = 0.0
    dwell_left = 0.0
    if stop_q and stop_q[0][0] <= 1.0:          # palier initial
        dwell_left = stop_q.pop(0)[1]

    leader = None
    n_episodes = 0

    v_out, a_out, yaw_out = [], [], []
    t_stopped = 0.0

    for _ in range(max_steps):
        idx = min(int(np.searchsorted(s_grid, s, side="right")) - 1, n_grid - 1)
        idx = max(idx, 0)

        # ----- cible libre : min des contraintes courbe sur l'horizon -------
        la = max(lookahead_base, v * 2.35 * style.anticipation)
        j2 = min(max(int(np.searchsorted(s_grid, s + la, side="right")), idx + 2), n_grid)
        v0 = float(np.min(v_curve[idx:j2])) * (1.0 + wander)
        wander += (-wander / tau_w) * dt \
            + style.cruise_wander * np.sqrt(2.0 * dt / tau_w) * rng.standard_normal()

        # ----- accel candidate : libre, leader, prochain arret ---------------
        a = _idm_accel(v, v0, style.a_accel_max)

        if leader is not None:
            a_l = _idm_accel(v, v0, style.a_accel_max,
                             gap=leader["s"] - s, dv=v - leader["v"],
                             T=style.headway_T, b=b_comfort)
            a = min(a, a_l)

        if dwell_left <= 0.0 and stop_q:
            s_stop, dw = stop_q[0]
            gap = s_stop - s
            if gap < max(120.0, v * v / (1.2 * b_comfort) + 20.0):
                a_s = _idm_accel(v, v0, style.a_accel_max,
                                 gap=max(gap, 0.3), dv=v,
                                 T=style.headway_T, b=b_comfort)
                a = min(a, a_s)
            # arrive au stop : l'IDM stabilise l'ego autour de IDM_S0, le
            # declenchement doit donc etre au-dela (anti-blocage), avec un
            # rattrapage si l'ego rampe a tres basse vitesse.
            if (gap <= IDM_S0 + 1.5 and v <= 0.6) or (gap <= 8.0 and v <= 0.12):
                dwell_left = dw
                stop_q.pop(0)
                v = 0.0
                a = 0.0

        # ----- avance ego ------------------------------------------------------
        v_prev = v
        if dwell_left > 0.0:
            dwell_left -= dt
            v = 0.0
        else:
            a = float(np.clip(a, -style.a_brake_max * 1.6, style.a_accel_max))
            v = max(0.0, v + a * dt)
            s += v * dt
        a_eff = (v - v_prev) / dt              # ce que mesure l'accelerometre

        if v < 0.05:
            t_stopped += dt

        # ----- dynamique leader -------------------------------------------------
        rt = types[idx]
        if leader is None:
            if flow.enabled and v > 5.0 and dwell_left <= 0.0:
                rate = ROAD_TYPES[rt]["leader_per_min"] * flow.rate_scale / 60.0
                if rng.random() < rate * dt:
                    base = v * rng.uniform(*flow.leader_factor)
                    leader = dict(
                        s=s + rng.uniform(*flow.spawn_gap) + v * style.headway_T,
                        v=base, base=base, phase="free", phase_left=0.0,
                        target=base,
                        episode_left=rng.uniform(*flow.episode_duration),
                    )
                    n_episodes += 1
        else:
            if leader["phase"] == "free" and rng.random() < flow.accordion_rate * dt:
                leader["phase"] = "slow"
                leader["phase_left"] = rng.uniform(*flow.accordion_duration)
                leader["target"] = leader["base"] * rng.uniform(*flow.accordion_factor)
            if leader["phase"] == "slow":
                leader["v"] += float(np.clip(leader["target"] - leader["v"],
                                             -1.8 * dt, 0.6 * dt))
                leader["phase_left"] -= dt
                if leader["phase_left"] <= 0.0:
                    leader["phase"] = "free"
            else:
                leader["v"] += float(np.clip(leader["base"] - leader["v"],
                                             -0.8 * dt, 0.8 * dt))
            leader["v"] = max(0.0, leader["v"] + 0.15 * np.sqrt(dt) * rng.standard_normal())
            leader["s"] += leader["v"] * dt
            leader["episode_left"] -= dt
            if (leader["episode_left"] <= 0.0
                    or (leader["s"] - s) > flow.lose_gap
                    or leader["s"] > s_end):
                leader = None

        # ----- sorties ------------------------------------------------------------
        v_out.append(v)
        a_out.append(a_eff)
        yaw_out.append(v * float(kappa[idx]))

        # fin de trajet : dernier arret consomme (il est place a ~s_end, le
        # declencheur IDM s'arme quelques metres avant la ligne)
        if not stop_q and dwell_left <= 0.0 and s >= s_end - 8.0 and v < 0.6:
            break

    v_t = np.array(v_out)
    a_long = np.array(a_out)
    yaw_rate = np.array(yaw_out)
    tt = np.arange(len(v_t)) / fs

    # limite de jerk = lissage par style (comme V1)
    win = max(1, int(style.jerk_smooth * fs))
    if win > 1:
        a_long = np.convolve(a_long, np.ones(win) / win, mode="same")

    meta = dict(n_leader_episodes=n_episodes, t_stopped_s=float(t_stopped),
                duration_s=float(tt[-1]) if len(tt) else 0.0)
    return tt, v_t, a_long, yaw_rate, meta


# --------------------------------------------------------------------------- #
# 5. Synthese IMU dans le repere CAPTEUR (schema standard) : inchange V1
# --------------------------------------------------------------------------- #
STEER_TAU_S = 1.0     # s : temps de correlation des micro-corrections de volant
# DEFAUT CORRIGE le 9 septembre 2026 : la vibration du VEHICULE etait un bruit
# BLANC, ajoute echantillon par echantillon. Ce n'est pas physique (la vibration
# d'un montage reel vient de resonances, elle est correlee) et cela gonflait la
# variation image a image du lacet (ecart-type 0,095 contre 0,072 au reel) et
# donc la variation de courbure (0,463 contre 0,260). Elle devient un processus
# correle de constante VIB_TAU_S.
VIB_TAU_S = 0.15      # s : temps de correlation de la vibration du vehicule
                      # (0,30 lissait trop : ecart-type du lacet image a image
                      #  0,054 contre 0,072 au reel ; 0,15 le retablit)
LONG_TAU_S = 0.3      # s : idem pour les a-coups de pedale
CLOTHOID_M = 16.0     # m : ANCIENNE transition fixe (avant le 9 septembre 2026),
                      # conservee pour reproduire les jeux anterieurs
# V5 : la transition est proportionnelle a la vitesse (make_road)
# Mesure du 9 septembre 2026 : avec 1,5 s la montee de courbure simulee durait
# 2,3 s contre 1,3 s au reel (1,8 fois trop). La dispersion, elle, etait deja
# bonne (rapport p90 sur p10 de 13,8 contre 11,3), car elle vient de la
# variation de vitesse. Seul le niveau est corrige.
CLOTHOID_TAU_S = 0.82  # s : temps que met le conducteur a tourner le volant
                       # (cale sur la grille adaptative V7 : 0,75 s donnait une
                       #  montee mediane de 1,0 s et 0,90 s en donnait 1,45,
                       #  contre 1,2 s au reel)
CLOTHOID_MIN_M = 2.0  # m : plancher (virage tres serre a basse vitesse ; 4 m
                      # privait le simulateur des montees les plus rapides)
CLOTHOID_MAX_M = 90.0  # m : plafond (grande courbe d'autoroute)
A_LAT_CONFORT = 3.0   # m/s2 : acceleration laterale de confort, borne la vitesse
                      # tenable dans une courbe (v = sqrt(a / |kappa|))

# ROND-POINT (9 septembre 2026). Sens de circulation a droite : l'ilot reste a
# GAUCHE du vehicule, qui tourne donc a gauche tout autour (courbure POSITIVE,
# le lacet positif etant le sens trigonometrique). La sortie est un virage a
# DROITE presque perpendiculaire. L'approche courte porte le noeud qui declenche
# l'arret.
ROND_APPROCHE_M = (10.0, 30.0)     # m : ligne droite d'approche
ROND_RAYON_M = (10.0, 22.0)        # m : rayon de la trajectoire autour de l'ilot
ROND_ANGLE = (0.5 * np.pi, 1.5 * np.pi)   # de la premiere a la derniere sortie
ROND_SORTIE_RAYON_M = (8.0, 15.0)  # m : rayon du virage de sortie
ROND_SORTIE_ANGLE = (np.pi / 3, np.pi / 2)   # sortie presque perpendiculaire

# DECOUPAGE DE LA ROUTE (V7, 9 septembre 2026, objection de l'utilisateur : « pas
# de segments de taille fixe pour tous mais plutot un decoupage en angles, ou
# mieux encore une approche analytique qui donne la position en fonction de la
# vitesse et du rayon »).
#
# Le pas etait FIXE a 2 m, ce qui est faux dans les deux sens :
#   R =    8 m : 2 m font 14,3 degres, et la voiture (4,9 m/s tenable) parcourt
#                0,49 m par echantillon a 10 Hz, donc elle reste 4,1 echantillons
#                sur le MEME point de route. Le lacet devient un escalier a
#                marches de quatre echantillons, dans les virages serres, c'est
#                a dire precisement la ou l'encodeur cherche le style.
#   R = 2000 m : 2 m font 0,06 degre, mille fois plus fin que necessaire.
#
# Regle retenue : le pas local est la distance parcourue en DS_CIBLE_S secondes
# a la vitesse tenable dans la courbe, soit min(v_limite, sqrt(a / |kappa|)).
# Avec DS_CIBLE_S = 0,05 s, il y a au moins deux points de route par echantillon
# de 10 Hz partout, et la geometrie n'est plus le facteur limitant. La grille
# devient NON UNIFORME : toute lecture se fait par recherche dichotomique sur
# les abscisses curvilignes, jamais par division.
DS_CIBLE_S = 0.05     # s : duree couverte par un pas de route
DS_MIN_M = 0.20       # m
DS_MAX_M = 5.00       # m
DS_DROITE_M = 4.00    # m : pas sur une ligne droite (courbure nulle)


def _ar1(rng, n, std, tau_s, fs):
    """V3 (7 septembre 2026). Processus autoregressif d'ordre 1, stationnaire,
    d'ecart-type std et de temps de correlation tau_s. rho = exp(-dt / tau) ;
    l'innovation est reduite de sqrt(1 - rho^2) pour que l'ecart-type TOTAL
    reste std.

    Sert aux micro-corrections du conducteur : un volant et une pedale bougent
    de facon continue, la valeur a l'instant t dit quelque chose de la valeur
    un dixieme de seconde plus tard. Avant V3 ces termes etaient un bruit
    blanc, independant d'un echantillon au suivant, et le lateral simule avait
    une autocorrelation de 0,007 a un pas contre 0,276 sur le reel."""
    if n == 0:
        return np.zeros(0)
    rho = float(np.exp(-1.0 / (tau_s * fs)))
    x = np.empty(n)
    x[0] = std * rng.standard_normal()
    innov = std * np.sqrt(1.0 - rho * rho) * rng.standard_normal(n)
    for i in range(1, n):
        x[i] = rho * x[i - 1] + innov[i]
    return x


def synth_imu(rng, tt, v_t, a_long, a_lat, yaw_rate,
              session: SessionConfig, style: DriverStyle):
    fs = session.sensor.fs; n = len(tt)
    veh = session.vehicle
    # V3 : les micro-corrections du CONDUCTEUR (volant, pedale) et la vibration
    # du VEHICULE sont deux termes distincts. Avant V3 ils etaient confondus en
    # un seul bruit blanc dont le niveau etait un reglage PAR CONDUCTEUR : une
    # empreinte triviale a apprendre, et qui n'existe pas dans la realite.
    # V6 (9 septembre 2026) : la vibration du vehicule n'est plus un bruit
    # blanc mais un processus correle (VIB_TAU_S), car la vibration d'un
    # montage vient de resonances. En bruit blanc, la variation image a image
    # du lacet valait 0,095 contre 0,077 au reel.
    a_long = a_long + _ar1(rng, n, style.micro_long_std, LONG_TAU_S, fs)
    steer = yaw_rate + _ar1(rng, n, style.micro_yaw_std, STEER_TAU_S, fs)
    a_lat = v_t * steer + _ar1(rng, n, veh.lat_vib, VIB_TAU_S, fs)
    a_long = a_long + _ar1(rng, n, veh.long_vib, VIB_TAU_S, fs)
    yaw_rate = steer + _ar1(rng, n, veh.yaw_vib, VIB_TAU_S, fs)

    a_vert = np.zeros(n)
    veh = session.vehicle
    a_vert += veh.engine_vib_amp * np.sin(2 * np.pi * veh.engine_vib_freq * tt)
    a_vert += veh.susp_amp * np.sin(2 * np.pi * veh.susp_freq * tt) * np.abs(a_long)

    sf_veh = np.column_stack([a_long, a_lat, a_vert]) + np.array([0, 0, G])
    w_veh = np.column_stack([0.01 * rng.standard_normal(n),
                             0.01 * rng.standard_normal(n), yaw_rate])

    R_vs = euler_to_R(*session.mount_euler)
    a_sensor = sf_veh @ R_vs.T + session.sensor.accel_bias
    w_sensor = w_veh @ R_vs.T + session.sensor.gyro_bias
    a_sensor += session.sensor.accel_noise * rng.standard_normal(a_sensor.shape)
    w_sensor += session.sensor.gyro_noise * rng.standard_normal(w_sensor.shape)

    heading = np.cumsum(yaw_rate) / fs
    vx = v_t * np.cos(heading); vy = v_t * np.sin(heading)
    lat = 40.0 + np.cumsum(vy) / fs / 111_000
    lon = -3.7 + np.cumsum(vx) / fs / (111_000 * np.cos(np.radians(40)))
    alt = 600 + np.cumsum(0.005 * rng.standard_normal(n))

    return pd.DataFrame({
        "ax": a_sensor[:, 0], "ay": a_sensor[:, 1], "az": a_sensor[:, 2],
        "gx": w_sensor[:, 0], "gy": w_sensor[:, 1], "gz": w_sensor[:, 2],
        "lat": lat, "lon": lon, "alt": alt, "speed": v_t,
    })


def simulate_trip(rng, session: SessionConfig, style: DriverStyle,
                  traffic: TrafficModel | None = None,
                  flow: TrafficFlow | None = None,
                  road_types: list | None = None,
                  road=None) -> pd.DataFrame:
    """road_types : sequence explicite de troncons passee a make_road. Le
    tirage naturel (1 a 3 troncons) plafonne les trajets vers ~1500 s ; une
    campagne qui vise des periodes longues (N_min, porte G6) passe une
    sequence plus longue, la troncature ne pouvant que RACCOURCIR."""
    traffic = traffic or TrafficModel()
    flow = flow or TrafficFlow()
    # V4 (7 septembre 2026) : `road` permet de REJOUER un itineraire deja
    # construit (routes habituelles et partagees d'un vehicule, cf.
    # dataset.build_corpus) ; la signalisation effective (apply_traffic) et le
    # trafic sont retires a chaque trajet, comme dans la realite.
    s, kappa, vlim, nodes, types = (road if road is not None
                                    else make_road(rng, road_types=road_types))
    stops = apply_traffic(nodes, len(s), traffic, rng)
    v_curve = curve_speed_profile(kappa, vlim, style)
    tt, v_t, a_long, yaw_rate, meta = integrate_trip(
        rng, s, kappa, v_curve, types, stops, style, session.sensor.fs, flow)
    a_lat = v_t * yaw_rate
    df = synth_imu(rng, tt, v_t, a_long, a_lat, yaw_rate, session, style)
    from collections import Counter
    df.attrs["sim_meta"] = {
        "road_types": list(dict.fromkeys(types.tolist())),
        "n_nodes": len(nodes),
        "nodes_by_type": dict(Counter(t for _, t in nodes)),
        "n_effective_stops": len(stops),
        **meta,
    }
    return df
