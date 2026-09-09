"""Isolated, cached OSM pilot. Does not import or change simulator code."""
import argparse
import bisect
import collections
import datetime
import hashlib
import json
import math
import pathlib
import re
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
APP = ROOT / 'packages/dev/applications/privates/driverv2'
OUT = APP / 'DataLake/results/osm_audit_20260909'
ZONES = {
    'urban': [(2.423, 48.628), (2.465, 48.614)],
    'rural': [(2.469, 48.403), (2.350, 48.484)],
    'motorway': [(2.486, 48.578), (2.533, 48.447)],
}
SOURCE_FILES = ['python/driving_sim.py', 'python/dataset.py', 'python/osm_overpass.py']
UA = 'DriverV2-readonly-OSM-pilot/1.0'

def save(name, obj):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding='utf-8')

def fetch(name, url, query=None):
    path = OUT / name
    if path.exists():
        return json.loads(path.read_text(encoding='utf-8'))
    data = urllib.parse.urlencode({'data': query}).encode() if query else None
    request = urllib.request.Request(url, data=data, headers={'User-Agent': UA})
    with urllib.request.urlopen(request, timeout=45) as response:
        raw = response.read()
    result = json.loads(raw)
    if result.get('remark') or (result.get('code') not in (None, 'Ok')):
        raise RuntimeError(result)
    OUT.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)
    save(name + '.meta.json', {'retrieved_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
         'url': url, 'query': query, 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)})
    print('Fetched', name, len(raw), flush=True)
    return result

def collect(zone):
    snapshots = OUT / 'source_hashes_before.json'
    if not snapshots.exists():
        save(snapshots.name, {f: hashlib.sha256((APP / f).read_bytes()).hexdigest() for f in SOURCE_FILES})
    ids = set()
    for direction, points in [('out', ZONES[zone]), ('back', list(reversed(ZONES[zone])))]:
        coordinates = ';'.join(f'{lon},{lat}' for lon, lat in points)
        url = ('https://router.project-osrm.org/route/v1/driving/' + coordinates
               + '?overview=full&geometries=geojson&annotations=nodes,distance&steps=true&alternatives=false')
        data = fetch(f'{zone}_{direction}_route.json', url)
        ids.update(data['routes'][0]['legs'][0]['annotation']['nodes'])
    seed = ','.join(map(str, sorted(ids)))
    query = (f'[out:json][timeout:30][maxsize:33554432];node(id:{seed})->.seed;'
             'way(bn.seed)["highway"]->.roads;'
             '(.roads;node(w.roads);relation(bw.roads)["type"="restriction"];'
             'node(around.seed:30)["traffic_sign"];);out body;')
    fetch(f'{zone}_osm.json', 'https://overpass-api.de/api/interpreter', query)
    if zone == 'motorway':
        # Targeted check of the one internal edge missed by rounded seed IDs.
        repair_query = ('[out:json][timeout:20];node(id:10196973016,10196973019)->.seed;'
                        'way(bn.seed)["highway"]->.roads;(.roads;node(w.roads);'
                        'relation(bw.roads)["type"="restriction"];);out body;')
        fetch('motorway_repair_osm.json', 'https://overpass-api.de/api/interpreter', repair_query)

def distance(a, b):
    p1, p2 = math.radians(a['lat']), math.radians(b['lat'])
    dp, dl = p2-p1, math.radians(b['lon']-a['lon'])
    return 2*6371008.8*math.asin(min(1, math.sqrt(math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2)))

def numeric(value):
    return bool(re.fullmatch(r'\d+(?:\.\d+)?(?: mph| km/h)?', value or ''))

def curvature_radius(geometry, cumulative, index, span):
    position = cumulative[index]
    if position < span or cumulative[-1] - position < span:
        return None
    def interpolate(s):
        j = min(bisect.bisect_right(cumulative, s)-1, len(geometry)-2)
        d = cumulative[j+1]-cumulative[j]
        f = (s-cumulative[j])/d if d else 0
        return [geometry[j][k] + f*(geometry[j+1][k]-geometry[j][k]) for k in (0,1)]
    a, b, c = interpolate(position-span), geometry[index], interpolate(position+span)
    scale = 6371008.8*math.pi/180
    ax, ay = (a[0]-b[0])*scale*math.cos(math.radians(b[1])), (a[1]-b[1])*scale
    cx, cy = (c[0]-b[0])*scale*math.cos(math.radians(b[1])), (c[1]-b[1])*scale
    cross = abs(ax*cy-ay*cx)
    return math.hypot(ax,ay)*math.hypot(cx,cy)*math.hypot(ax-cx,ay-cy)/(2*cross) if cross > 1e-8 else None

def analyze(zone):
    raw = json.loads((OUT / f'{zone}_osm.json').read_text(encoding='utf-8'))
    repair_path = OUT / f'{zone}_repair_osm.json'
    if repair_path.exists():
        repair = json.loads(repair_path.read_text(encoding='utf-8'))
        elements = {(e['type'],e['id']):e for e in raw['elements']}
        elements.update({(e['type'],e['id']):e for e in repair['elements']})
        raw['elements'] = list(elements.values())
    nodes = {e['id']: e for e in raw['elements'] if e['type'] == 'node'}
    ways = {e['id']: e for e in raw['elements'] if e['type'] == 'way'}
    relations = [e for e in raw['elements'] if e['type'] == 'relation']
    edges, neighbours = collections.defaultdict(list), collections.defaultdict(set)
    road_classes = {'motorway','motorway_link','trunk','trunk_link','primary','primary_link',
                    'secondary','secondary_link','tertiary','tertiary_link','unclassified','residential','living_street','service'}
    for w in ways.values():
        for a, b in zip(w['nodes'], w['nodes'][1:]):
            edges[a,b].append((w, 'forward'))
            edges[b,a].append((w, 'backward'))
            if w['tags'].get('highway') in road_classes:
                neighbours[a].add(b)
                neighbours[b].add(a)
    result = {'zone': zone, 'osm_timestamp': raw.get('osm3s', {}).get('timestamp_osm_base'),
              'ways_downloaded': len(ways), 'nodes_downloaded': len(nodes), 'restrictions_downloaded': len(relations), 'routes': []}
    for direction in ['out','back']:
        data = json.loads((OUT / f'{zone}_{direction}_route.json').read_text(encoding='utf-8'))
        route = data['routes'][0]
        annotation = route['legs'][0]['annotation']
        raw_ids = annotation['nodes']
        geometry = route['geometry']['coordinates']
        assert len(raw_ids) == len(geometry) == len(annotation['distance']) + 1
        ids, id_checks = [], collections.Counter()
        cumulative = [0.0]
        for d in annotation['distance']:
            cumulative.append(cumulative[-1]+d)
        for raw_id, (lon,lat) in zip(raw_ids,geometry):
            position = {'lon':lon,'lat':lat}
            candidate_ids = [i for i in range(int(raw_id)-5,int(raw_id)+6) if i in nodes and distance(nodes[i],position)<=1.0]
            if int(raw_id) in candidate_ids and (isinstance(raw_id,int) or len(candidate_ids) == 1):
                resolved = int(raw_id)
                id_checks['exact_id_and_coordinate'] += 1
            elif len(candidate_ids) == 1:
                resolved = candidate_ids[0]
                id_checks['rounded_id_recovered_by_coordinate'] += 1
            else:
                resolved = None
                id_checks['unresolved_node'] += 1
            ids.append(resolved)
        pairs = list(zip(ids, ids[1:]))
        totals = collections.Counter()
        classes, speeds, usedways = collections.Counter(), collections.Counter(), set()
        details = []
        for pair_index, (a, b) in enumerate(pairs):
            length = annotation['distance'][pair_index]
            totals['node_geometry_m'] += length
            candidates = [(w,d) for w,d in edges[a,b] if w['tags'].get('highway') in road_classes]
            if a not in nodes or b not in nodes:
                totals['missing_node_pairs'] += 1
                totals['unresolved_m'] += length
                continue
            if len(candidates) != 1:
                totals['unresolved_m'] += length
                totals['unresolved_pairs'] += 1
                continue
            way, traversal = candidates[0]
            tags = way['tags']
            usedways.add(way['id'])
            classes[tags.get('highway','')] += length
            value = tags.get('maxspeed:' + traversal, tags.get('maxspeed'))
            speeds[value or 'MISSING'] += length
            category = 'numeric' if numeric(value) else ('non_numeric' if value else 'missing')
            totals[category + '_speed_m'] += length
            if any(k.startswith('maxspeed') and 'conditional' in k for k in tags):
                totals['conditional_m'] += length
            if tags.get('maxspeed:variable'):
                totals['variable_m'] += length
            if tags.get('maxspeed:' + traversal):
                totals['directional_speed_m'] += length
            if tags.get('lanes'):
                totals['lanes_tag_m'] += length
            if tags.get('width'):
                totals['width_tag_m'] += length
            if value is None and (tags.get('source:maxspeed') or tags.get('maxspeed:type')):
                totals['missing_with_context_m'] += length
            details.append({'from':a, 'to':b, 'way_id':way['id'], 'direction':traversal,
                            'highway':tags.get('highway'), 'route_pair_index':pair_index,
                            'length_m':length, 'speed':value, 'category':category})
        signals = []
        for i, node_id in enumerate(ids):
            if node_id not in nodes:
                continue
            n = nodes[node_id]
            t = n.get('tags', {})
            kind = t.get('highway')
            crossing_light = kind == 'crossing' and (t.get('crossing') == 'traffic_signals' or t.get('crossing:signals') == 'yes')
            if kind not in ('traffic_signals','stop','give_way') and not crossing_light:
                continue
            incoming = edges[ids[i-1],node_id] if i else []
            outgoing = edges[node_id,ids[i+1]] if i+1 < len(ids) else []
            connected = [*incoming, *outgoing]
            direction_tag = t.get('traffic_signals:direction',t.get('direction')) if kind == 'traffic_signals' else t.get('stop:direction',t.get('direction'))
            traversal = {d for w,d in connected}
            wayids = {w['id'] for w,d in connected}
            if crossing_light:
                status = 'crossing_representation_needs_review'
            elif len(neighbours[node_id]) > 2:
                status = 'junction_node_needs_approach_reconstruction'
            elif direction_tag in ('forward','backward') and len(traversal) == 1 and len(wayids) == 1:
                status = 'direction_matches' if direction_tag in traversal else 'opposite_direction'
            elif direction_tag == 'both':
                status = 'direction_matches'
            elif direction_tag:
                status = 'direction_needs_review'
            elif connected and all(w['tags'].get('oneway') in ('yes','1','true','-1') or w['tags'].get('highway') == 'motorway' or w['tags'].get('junction') == 'roundabout' for w,d in connected):
                status = 'inferred_oneway_needs_review'
            else:
                status = 'missing_direction_needs_review'
            signals.append({'node_id':node_id,'type':kind,'crossing_light':crossing_light,'status':status,
                            'degree':len(neighbours[node_id]),'tags':t,'route_index':i,'lat':n['lat'],'lon':n['lon'],
                            'raw_radius_span10_m':curvature_radius(geometry,cumulative,i,10),
                            'raw_radius_span20_m':curvature_radius(geometry,cumulative,i,20)})
        route_restrictions = [r for r in relations if any(m['type']=='way' and m['ref'] in usedways for m in r['members'])]
        metrics = {'name':f'{zone}_{direction}', 'distance_osrm_m':route['distance'], 'totals':dict(totals),
                   'id_checks':dict(id_checks),
                   'class_m':dict(classes),'speed_m':dict(speeds),'ways_used':len(usedways),
                   'restriction_relations_touching_route':len(route_restrictions), 'signals':signals,
                   'signal_status_counts':dict(collections.Counter(s['status'] for s in signals)),
                   'snap_distance_m':[w['distance'] for w in data['waypoints']],
                   'road_names':list(dict.fromkeys(s['name'] for s in route['legs'][0]['steps'] if s.get('name'))),
                   'edge_details':details}
        result['routes'].append(metrics)
        assert abs(sum(totals.get(k,0) for k in ('numeric_speed_m','non_numeric_speed_m','missing_speed_m','unresolved_m'))-totals['node_geometry_m']) < 1e-5
    route_node_ids = {s['node_id'] for r in result['routes'] for s in r['signals']}
    result['unique_route_signals'] = len(route_node_ids)
    result['roadside_signs_not_route_signal_nodes'] = [{'id':n['id'],'tags':n['tags']} for n in nodes.values() if n.get('tags',{}).get('traffic_sign') and n['id'] not in route_node_ids]
    return result

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('action', choices=['fetch','analyze'])
    p.add_argument('--zone', choices=list(ZONES))
    args = p.parse_args()
    if args.action == 'fetch':
        collect(args.zone)
    else:
        results = [analyze(z) for z in ZONES]
        save('analysis.json', results)
        all_totals, id_checks = collections.Counter(), collections.Counter()
        all_signals, motorway_edges = [], []
        for zone in results:
            for route in zone['routes']:
                all_totals.update(route['totals'])
                id_checks.update(route['id_checks'])
                all_signals.extend(route['signals'])
                motorway_edges.extend(e for e in route['edge_details'] if e['highway']=='motorway')
        fs = [s for s in all_signals if s['type'] in ('traffic_signals','stop')]
        provisional = [s for s in fs if s['status'] in ('direction_matches','inferred_oneway_needs_review')]
        diagnostic = []
        for span in (10,20):
            values = [s[f'raw_radius_span{span}_m'] for s in provisional if s[f'raw_radius_span{span}_m'] is not None]
            for threshold in (100,300):
                diagnostic.append({'span_each_side_m':span,'curve_radius_below_m':threshold,
                                   'curved':sum(v<threshold for v in values),'measurable':len(values)})
        save('summary.json', {'totals':dict(all_totals),'id_checks':dict(id_checks),
             'unique_signals_by_type':dict(collections.Counter(s['type'] for s in {s['node_id']:s for s in all_signals}.values())),
             'light_stop_occurrence_status':dict(collections.Counter(s['status'] for s in fs)),
             'motorway_only_m':sum(e['length_m'] for e in motorway_edges),
             'motorway_numeric_speed_m':sum(e['length_m'] for e in motorway_edges if e['category']=='numeric'),
             'raw_curve_diagnostic_not_physical_stop_line':diagnostic})
        for z in results:
            for r in z['routes']:
                t = r['totals']
                print(r['name'], round(r['distance_osrm_m']/1000,2), 'km',
                      'numeric%', round(100*t.get('numeric_speed_m',0)/t['node_geometry_m'],1),
                      'unknown%', round(100*t.get('missing_speed_m',0)/t['node_geometry_m'],1),
                      'signals',r['signal_status_counts'], 'classes', {k:round(v) for k,v in r['class_m'].items()})
        before = json.loads((OUT/'source_hashes_before.json').read_text())
        unchanged = {f: hashlib.sha256((APP/f).read_bytes()).hexdigest() == h for f,h in before.items()}
        save('source_integrity_check.json', unchanged)
        print('Simulator source files unchanged:', unchanged)
