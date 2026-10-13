#!/usr/bin/env python3
"""Convert old gps-packet.net mapserver 1.0 MPS snapshots into history CSVs.

Usage: python parse_mps.py 0.mps 1.mps --output-dir out

For additional old snapshots:
  python parse_mps.py capture-2005.mps --snapshot 2005-02-week --prefix navitra-2005-02 --output-dir out

No latitude, longitude, tracking URL, or other point location is emitted.
Retention of callsigns and old messages is intended for historical study.
Redactions affect contact details only, not technical @ notation or domains.
"""
import argparse
import collections
import csv
import hashlib
import json
from pathlib import Path
import re

POINT_RE = re.compile(
    r'^point oid="(?P<oid>[^"]*)" gid="(?P<gid>[^"]*)" '
    r'pos="(?P<pos>[^"]*)" str="(?P<callsign>[^"]*)" '
    r'info="(?P<info>[^"]*)" url="(?P<url>[^"]*)";$'
)
GROUP_RE = re.compile(r'^group gid="(?P<gid>[^"]+)" gname="(?P<name>[^"]+)"')
# Restrict to conventional email local-part@domain.tld. A '@' in a
# hobbyist message is not automatically a contact address.
EMAIL_RE = re.compile(r'(?<![\w@])(?:[A-Za-z0-9.!#$%&\'*+/=?^_`{|}~-]+)@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+')
PHONE_RE = re.compile(r'(?<![0-9])(?:0[1-9]0[-ー −]?\d{4}[-ー −]?\d{4}|0\d{1,4}-\d{1,4}-\d{3,4})(?![0-9])')
# Detailed residential street/block numbers, not broad city/neighborhood text.
ADDRESS_RE = re.compile(r'\d+(?:丁目|番地|番|号)(?:\d+号)?|\d{1,4}[-−]\d{1,4}[-−]\d{1,4}')
KNOWN_SNAPSHOTS = {
    "affc5c20b39243157e507493da244056d864e805d62524b4ad7c572f5bd9e781": "2007-07-18-week",
    "ac65ea66e9ed8181a17a918172a856f7406a89013bcffa6d766af28598028886": "2008-05-10-realtime",
}
REPLACEMENTS = (
    ('email', EMAIL_RE, '[メールアドレスのため掲載省略]'),
    ('phone', PHONE_RE, '[電話番号のため掲載省略]'),
    ('address', ADDRESS_RE, '[詳細住所のため掲載省略]'),
)


def normalize(snapshot):
    fields = snapshot.split('\\n')
    result = {}
    for field in fields:
        label, sep, value = field.partition(': ')
        if not sep:
            raise ValueError(f'Unexpected info item: {field[:100]!r}')
        if label in result:
            raise ValueError(f'Duplicate item: {label}')
        result[label] = value
    expected = {'受信日時','データ日時','移動速度','移動方向','メッセージ','グループ'}
    if set(result) != expected:
        raise ValueError(f'Unexpected fields: {set(result).symmetric_difference(expected)}')
    return result


def scrub(message):
    flags=[]
    for label,expr,replace in REPLACEMENTS:
        message, found = expr.subn(replace,message)
        if found:flags.append(label)
    return message, ';'.join(flags)


def parse(filename, snapshot):
    blob=Path(filename).read_bytes()
    source=blob.decode('cp932')
    groupmap={}
    records=[]
    for line_no,line in enumerate(source.splitlines(),1):
        group=GROUP_RE.fullmatch(line.split(' pointstyle=')[0].rstrip(';')) if line.startswith('group ') else None
        if group:
            groupmap[group['gid']]=group['name']
        if not line.startswith('point '):
            continue
        m=POINT_RE.fullmatch(line)
        if m is None:
            raise ValueError(f'{filename}:{line_no}: point syntax differs from known archive')
        d=m.groupdict()
        info=normalize(d['info'])
        if d['gid'] not in groupmap:
            raise ValueError(f'{filename}:{line_no}: unknown icon group {d["gid"]}')
        orig=info['メッセージ'].strip()
        message,redact=scrub(orig)
        gid=d['gid']
        group_name=groupmap[gid.split('.')[0]]
        records.append({
            'snapshot':snapshot,
            'source_file':Path(filename).name,
            'source_oid':d['oid'],
            'callsign':d['callsign'],
            'icon_gid':gid,
            'icon_group':group_name,
            'icon':groupmap[gid],
            'received_at_raw':info['受信日時'],
            'data_at_raw':info['データ日時'],
            'speed_raw':info['移動速度'],
            'direction_raw':info['移動方向'],
            'reported_group_code':info['グループ'],
            'message':message,
            'redactions':redact,
            '_unredacted_message':orig,
        })
    digest=hashlib.sha256(blob).hexdigest()
    return records,digest


def write(path,fieldnames,records):
    with Path(path).open('w',encoding='utf-8',newline='') as handle:
        writer=csv.DictWriter(handle,fieldnames=fieldnames,extrasaction='ignore',lineterminator='\n')
        writer.writeheader()
        writer.writerows(records)


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('mps',nargs='+',help='Old gps-packet.net *.mps file(s)')
    ap.add_argument('--output-dir',default='.',help='Destination for two CSV files')
    ap.add_argument('--snapshot',action='append',help='Explicit label for each input, supplied in file order')
    ap.add_argument('--prefix',default='navitra-gps-packet-2007-2008',help='Output filename prefix')
    opts=ap.parse_args()
    if opts.snapshot and len(opts.snapshot) != len(opts.mps):
        ap.error('Supply exactly one --snapshot label for each *.mps input')
    records=[]
    hashes={}
    for i,source in enumerate(opts.mps):
        filename=Path(source).name
        digest=hashlib.sha256(Path(source).read_bytes()).hexdigest()
        snap=opts.snapshot[i] if opts.snapshot else KNOWN_SNAPSHOTS.get(digest)
        if snap is None:
            raise ValueError(f'Unknown snapshot {filename} ({digest}): specify --snapshot to avoid false dating')
        rec,sha=parse(source,snap)
        records.extend(rec)
        hashes[filename]={'sha256':sha,'records':len(rec),'snapshot':snap}
    out=Path(opts.output_dir)
    out.mkdir(parents=True,exist_ok=True)
    detail_columns=['snapshot','source_file','source_oid','callsign','icon_gid','icon_group','icon',
                    'received_at_raw','data_at_raw','speed_raw','direction_raw','reported_group_code',
                    'message','redactions']
    write(out/f'{opts.prefix}-observations.csv',detail_columns,records)
    unique=collections.OrderedDict()
    for rec in records:
        key=(rec['callsign'],rec['icon'],rec['_unredacted_message'])
        if key not in unique:
            category='移動局' if rec['icon_group'].startswith('移動局') else rec['icon_group'] if rec['icon_group'] in ('レピーター','民家') else 'その他'
            unique[key]={'snapshot':rec['snapshot'],'callsign':rec['callsign'],'category':category,
                         'icon':rec['icon'],'message':rec['message']}
        elif rec['snapshot'] not in unique[key]['snapshot'].split(';'):
            unique[key]['snapshot']+=';'+rec['snapshot']
    write(out/f'{opts.prefix}.csv', ['snapshot','callsign','category','icon','message'],list(unique.values()))
    count=collections.Counter(r['redactions'] for r in records)
    print(json.dumps({'sources':hashes,'observations':len(records),'unique_messages':len(unique),
        'nonzero_speed':sum(float(r['speed_raw'])>0 for r in records),
        'nonzero_direction':sum(float(r['direction_raw'])>0 for r in records),
        'unavailable_data_time':sum(r['data_at_raw']=='なし' for r in records),
        'raw_group_codes':dict(collections.Counter(r['reported_group_code'] for r in records)),
        'redaction_counts':dict(count)},ensure_ascii=False,indent=2))

if __name__=='__main__':
    main()