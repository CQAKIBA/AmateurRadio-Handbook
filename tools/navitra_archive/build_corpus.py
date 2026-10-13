import argparse, collections, csv, hashlib, json, re, zipfile
from pathlib import Path

parser=argparse.ArgumentParser(description='Build redacted, location-free corpus from archived gps-packet.net MPS ZIP')
parser.add_argument('zip_path', help='Local ZIP of archived MPS snapshots (not included in the repository)')
parser.add_argument('--output-dir', default='.', help='Output directory for CSV files and SHA256 manifest')
args=parser.parse_args()
BASE=Path(args.output_dir); BASE.mkdir(parents=True,exist_ok=True)
z=zipfile.ZipFile(args.zip_path)
POINT_RE=re.compile(r'^point oid="(?P<oid>[^"]*)" gid="(?P<gid>[^"]*)" pos="(?P<pos>[^"]*)" str="(?P<callsign>[^"]*)" info="(?P<info>[^"]*)" url="(?P<url>[^"]*)";$')
GROUP_RE=re.compile(r'^group gid="(?P<gid>[^"]+)" gname="(?P<name>[^"]+)"')
EMAIL_RE=re.compile(r'(?<![\w@])(?:[A-Za-z0-9.!#$%&\'*+/=?^_`{|}~-]+)@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+')
PHONE_RE=re.compile(r'(?<![0-9])(?:0[1-9]0[-ー −]?\d{4}[-ー −]?\d{4}|0\d{1,4}-\d{1,4}-\d{3,4})(?![0-9])')
ADDRESS_RE=re.compile(r'\d+(?:丁目|番地|番|号)(?:\d+号)?|\d{1,4}[-−]\d{1,4}[-−]\d{1,4}')
REPLACEMENTS=[('email',EMAIL_RE,'[メールアドレスのため掲載省略]'),('phone',PHONE_RE,'[電話番号のため掲載省略]'),('address',ADDRESS_RE,'[詳細住所のため掲載省略]')]
blobs={}
for name in z.namelist():
 data=z.read(name); digest=hashlib.sha256(data).hexdigest();blobs.setdefault(digest,{'name':name,'aliases':[],'data':data})['aliases'].append(name)
records=[];snapshots=[]; redacted_examples=[]
for digest,entry in blobs.items():
 name=entry['name'];data=entry['data'];s=data.decode('cp932')
 m=re.search(r'^theme str="ナビトラ(?P<kind>一週間情報|リアルタイム情報) \((?P<y>\d{4}) 年 (?P<m>\d{2}) 月 (?P<d>\d{2}) 日 (?P<H>\d{2}) 時 (?P<M>\d{2}) 分 (?P<S>\d{2}) 秒更新\)";',s,re.M)
 if not m:raise ValueError('theme unexpected '+name)
 kind='week' if m['kind']=='一週間情報' else 'realtime'
 timestamp=f'{m["y"]}-{m["m"]}-{m["d"]} {m["H"]}:{m["M"]}:{m["S"]}'
 snapshot=f'{m["y"]}-{m["m"]}-{m["d"]}-{kind}'
 gm={};num=0
 for line_num,line in enumerate(s.splitlines(),1):
  group=GROUP_RE.match(line)
  if group:gm[group['gid']]=group['name']
  if not line.startswith('point '):continue
  match=POINT_RE.fullmatch(line)
  if match is None:raise ValueError('point invalid '+name+':'+str(line_num))
  d=match.groupdict()
  if d['gid'] not in gm or d['gid'].split('.')[0] not in gm:raise ValueError('group invalid '+name+' '+d['gid'])
  pairs={}
  for field in d['info'].split('\\n'):
   key,sep,val=field.partition(': ')
   if not sep or key in pairs:raise ValueError('info invalid '+name+' '+repr(field))
   pairs[key]=val
  if set(pairs)!={'受信日時','データ日時','移動速度','移動方向','メッセージ','グループ'}:raise ValueError('wrong info '+name+' '+repr(pairs))
  message=pairs['メッセージ'].strip(); masked=message; flags=[]
  for reason,rx,replacement in REPLACEMENTS:
   masked,n=rx.subn(replacement,masked)
   if n:flags.append(reason);redacted_examples.append((name,d['callsign'],reason,message,masked))
  category=gm[d['gid'].split('.')[0]]; category='移動局' if category.startswith('移動局') else category if category in ('民家','レピーター') else 'その他'
  records.append({
   'snapshot':snapshot,'snapshot_time':timestamp,'period':kind,'source_file':name,'source_sha256':digest,'source_oid':d['oid'],
   'callsign':d['callsign'],'icon_gid':d['gid'],'icon_group':gm[d['gid'].split('.')[0]],'category':category,'icon':gm[d['gid']],
   'received_at_raw':pairs['受信日時'],'data_at_raw':pairs['データ日時'],'speed_raw':pairs['移動速度'],'direction_raw':pairs['移動方向'],
   'reported_group_code':pairs['グループ'],'message':masked,'redactions':';'.join(flags),'_raw_message':message})
  num+=1
 snapshots.append({'snapshot':snapshot,'source_file':name,'aliases':entry['aliases'],'sha256':digest,'updated_at':timestamp,'period':kind,'count':num})
assert len(records)==1152 and len(snapshots)==9
snapshots.sort(key=lambda x:x['updated_at'])
records.sort(key=lambda x:(x['snapshot_time'],int(x['source_oid'])))
key=lambda r:(r['callsign'],r['icon'],r['_raw_message'])
unique={};
for r in records:
 k=key(r)
 if k not in unique:unique[k]={'snapshots':set(),'first_updated_at':r['snapshot_time'],'last_updated_at':r['snapshot_time'],'count':0,'record':r}
 u=unique[k];u['snapshots'].add(r['snapshot']);u['last_updated_at']=r['snapshot_time'];u['count']+=1;u['record']=r
allcols=['snapshot','source_file','source_oid','callsign','icon_gid','icon_group','icon','received_at_raw','data_at_raw','speed_raw','direction_raw','reported_group_code','message','redactions']
def csv_out(path,columns,rows):
 with (BASE/path).open('w',encoding='utf-8',newline='') as f:
  w=csv.DictWriter(f,fieldnames=columns,extrasaction='ignore',lineterminator='\n');w.writeheader();w.writerows(rows)
csv_out('navitra-gps-packet-2005-2008-observations.csv',allcols,records)
unique_rows=[]
for k,u in sorted(unique.items(),key=lambda kv:(kv[1]['last_updated_at'],kv[1]['record']['callsign']),reverse=True):
 rec=u['record'];unique_rows.append({'last_updated_at':u['last_updated_at'],'first_updated_at':u['first_updated_at'],'snapshots':';'.join(sorted(u['snapshots'])),'observations':u['count'],'callsign':rec['callsign'],'category':rec['category'],'icon':rec['icon'],'message':rec['message'],'speed_latest_raw':rec['speed_raw'],'direction_latest_raw':rec['direction_raw'],'reported_group_latest_raw':rec['reported_group_code']})
uniqcols=list(unique_rows[0]);csv_out('navitra-gps-packet-2005-2008.csv',uniqcols,unique_rows)
with (BASE/'navitra-snapshot-manifest.json').open('w',encoding='utf-8') as f:json.dump({'snapshots':snapshots,'total_observations':len(records),'unique_messages':len(unique_rows),'note':'All source hashes SHA256; source bytes not republished'},f,ensure_ascii=False,indent=2)
print(json.dumps({
  'sources':len(snapshots), 'observations':len(records),
  'unique_messages':len(unique_rows), 'callsign_variants':len(set(r['callsign'] for r in records)),
  'redactions':dict(collections.Counter(reason for _,_,reason,_,_ in redacted_examples)),
  'nonzero_speed':sum(bool(r['speed_raw']) and float(r['speed_raw'])!=0 for r in records),
  'nonzero_direction':sum(bool(r['direction_raw']) and float(r['direction_raw'])!=0 for r in records),
  'unknown_data_time':sum(r['data_at_raw']=='なし' for r in records),
},ensure_ascii=False,indent=2))
