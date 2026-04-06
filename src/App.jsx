import { useState, useEffect, useRef, useCallback } from "react"
import * as XLSX from "xlsx"
import {
  Shield, Bell, Plus, X, Eye, Network, Zap, BarChart2,
  Search, ChevronRight, Upload, FileSpreadsheet, AlertTriangle,
  RefreshCw, Globe, Package, ChevronDown, ChevronUp, Layers,
  TrendingUp, TrendingDown, Info, CheckCircle, ArrowRight,
  Cpu, Truck, Building2, Download
} from "lucide-react"
import { AreaChart, Area, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Cell } from "recharts"

/* ─── GLOBAL CSS ──────────────────────────────────────────────── */
const G = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'DM Sans',sans-serif;background:#060A12;color:#E2E8F0;}
  .mono{font-family:'Space Mono',monospace!important;}
  ::-webkit-scrollbar{width:3px;height:3px;}
  ::-webkit-scrollbar-track{background:#0D1424;}
  ::-webkit-scrollbar-thumb{background:#2D3748;border-radius:2px;}
  .pulse{animation:pulse 2.2s ease-in-out infinite;}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
  .spin{animation:spin 1s linear infinite;}
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  .fade{animation:fadeIn .35s ease;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
  .slide-r{animation:slideR .3s ease;}
  @keyframes slideR{from{opacity:0;transform:translateX(-10px);}to{opacity:1;transform:translateX(0);}}
  input::placeholder{color:#374151;}
  input:focus{outline:none;border-color:#0EA5E9!important;}
  button:active{transform:scale(.98);}
`

/* ─── UTILS ─────────────────────────────────────────────────── */
const rc = s => s>=80?'#EF4444':s>=60?'#F59E0B':s>=35?'#3B82F6':'#22C55E'
const rl = s => s>=80?'CRITICAL':s>=60?'HIGH':s>=35?'MEDIUM':'LOW'
const fi = s => s>=80?'🔴':s>=60?'🟠':s>=35?'🟡':'🟢'
const genSpark = (base,vol=.05,n=24) => {
  let v=base,d=[]
  for(let i=0;i<n;i++){v=v*(1+(Math.random()-.5)*vol*2);d.push({v:+v.toFixed(2)})}
  return d
}
const sleep = ms => new Promise(r => setTimeout(r,ms))

/* ─── GEMINI API HELPER ──────────────────────────────────────── */
async function geminiCall(apiKey, prompt){
  const r=await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        contents:[{parts:[{text:prompt}]}],
        generationConfig:{maxOutputTokens:1500,temperature:0.2}
      })
    }
  )
  if(!r.ok){const e=await r.json();throw new Error(e?.error?.message||`HTTP ${r.status}`)}
  const d=await r.json()
  const txt=d.candidates?.[0]?.content?.parts?.[0]?.text||''
  return txt.replace(/```json\n?|```/g,'').trim()
}

/* ─── COMPONENTS ─────────────────────────────────────────────── */
function Badge({score,lg,pulse}){
  const c=rc(score),l=rl(score)
  return(
    <span className="mono" style={{background:c+'18',color:c,border:`1px solid ${c}30`,borderRadius:4,padding:lg?'3px 10px':'2px 7px',fontSize:lg?11:9,fontWeight:700,letterSpacing:.5,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:4}}>
      {pulse&&<span className="pulse" style={{width:5,height:5,borderRadius:'50%',background:c,display:'inline-block'}}/>}
      {l}
    </span>
  )
}

function Spinner({size=18,color='#0EA5E9'}){
  return <div className="spin" style={{width:size,height:size,border:`2px solid ${color}22`,borderTop:`2px solid ${color}`,borderRadius:'50%',display:'inline-block',flexShrink:0}}/>
}

function Spark({data,color,id,h=40}){
  return(
    <ResponsiveContainer width="100%" height={h}>
      <AreaChart data={data} margin={{top:2,right:0,bottom:2,left:0}}>
        <defs>
          <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={.3}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} fill={`url(#sg-${id})`} strokeWidth={1.5} dot={false} isAnimationActive={false}/>
        <Tooltip contentStyle={{background:'#0D1424',border:'1px solid #1E2D4A',borderRadius:6,fontSize:10}} formatter={v=>[v,'']} labelFormatter={()=>''}/>
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ─── STATIC DATA ─────────────────────────────────────────────── */
const COMMS = [
  {id:'nd',sym:'Nd',name:'Neodymium',price:78.5,chg:+2.3,unit:'$/kg',src:'China 92%',risk:82,spark:genSpark(78.5,.06,24)},
  {id:'co',sym:'Co',name:'Cobalt',   price:33.2,chg:-1.2,unit:'$/kg',src:'DRC 67%', risk:68,spark:genSpark(33.2,.05,24)},
  {id:'ti',sym:'Ti',name:'Titanium', price:11.7,chg:+0.8,unit:'$/kg',src:'RU+CN',   risk:74,spark:genSpark(11.7,.04,24)},
  {id:'cu',sym:'Cu',name:'Copper',   price: 9.1,chg:+0.4,unit:'$/kg',src:'Chile 28%',risk:32,spark:genSpark(9.1,.03,24)},
  {id:'li',sym:'Li',name:'Lithium',  price:13.2,chg:-3.1,unit:'$/kg',src:'AUS 47%',  risk:41,spark:genSpark(13.2,.07,24)},
  {id:'si',sym:'Si',name:'Silicon',  price: 3.8,chg:+1.1,unit:'$/kg',src:'China 80%',risk:71,spark:genSpark(3.8,.05,24)},
]

const ALERTS_STATIC = [
  {id:1,lvl:'CRITICAL',ago:'4 min', msg:'China restricts NdFeB magnet export permits — 90-day review period announced',suppliers:['Ningbo Jintian','Inner Mongolia RE']},
  {id:2,lvl:'HIGH',    ago:'31 min',msg:'TSMC power allocation cut Q2 — lead times for power MOSFETs +6 weeks',suppliers:['TSMC','Infineon']},
  {id:3,lvl:'HIGH',    ago:'2h',    msg:'VSMPO-AVISMA added to BIS Entity List — titanium alloys supply critical',suppliers:['VSMPO-AVISMA']},
  {id:4,lvl:'MEDIUM',  ago:'5h',    msg:'Baltic Freight Index +8.3% WoW — red sea rerouting pressure continues',suppliers:[]},
  {id:5,lvl:'LOW',     ago:'8h',    msg:'Cobalt spot price -1.2% — Glencore announces Mutanda ramp-up',suppliers:[]},
]

/* ─── EXCEL IMPORTER ─────────────────────────────────────────── */
function ExcelImporter({onImport}){
  const [drag,setDrag]=useState(false)
  const [loading,setLoading]=useState(false)
  const [err,setErr]=useState('')
  const ref=useRef()

  const parse=async file=>{
    setLoading(true);setErr('')
    try{
      const buf=await file.arrayBuffer()
      const wb=XLSX.read(buf,{type:'array'})
      const rows=[]
      wb.SheetNames.forEach(name=>{
        const ws=wb.Sheets[name]
        const data=XLSX.utils.sheet_to_json(ws,{defval:''})
        data.forEach(r=>rows.push({...r,_sheet:name}))
      })
      if(!rows.length)throw new Error('No data found in spreadsheet')
      onImport(rows,file.name)
    }catch(e){setErr(e.message)}
    finally{setLoading(false)}
  }

  const onDrop=e=>{
    e.preventDefault();setDrag(false)
    const f=e.dataTransfer.files[0]
    if(f)parse(f)
  }

  const downloadTemplate=()=>{
    const ws=XLSX.utils.aoa_to_sheet([
      ['Supplier Name','Country','Tier','Product / Component','Category','Annual Spend (€k)','Lead Time (weeks)','Single Source?','Notes'],
      ['Baumüller GmbH','Germany','T1','Electric Motors','Electromechanical',850,12,'No','Main motor supplier'],
      ['Ningbo Jintian','China','T2','NdFeB Magnets','Rare Earth Materials',320,16,'Yes','Critical — sole source'],
      ['TSMC','Taiwan','T2','Power MOSFETs','Semiconductors',210,20,'No','Allocated through Infineon'],
      ['VSMPO-AVISMA','Russia','T2','Titanium Alloys','Raw Materials',440,24,'Yes','SANCTIONS RISK'],
      ['Thyssenkrupp','Germany','T2','Steel Laminations','Metals',180,8,'No',''],
      ['Inner Mongolia RE','China','T3','Rare Earth Mining','Raw Materials',0,0,'Yes','Sub of Ningbo Jintian'],
    ])
    const wb=XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb,ws,'Suppliers')
    XLSX.writeFile(wb,'SupplyGuard_Template.xlsx')
  }

  return(
    <div style={{padding:32,display:'flex',flexDirection:'column',gap:20,alignItems:'center',justifyContent:'center',minHeight:'70vh'}} className="fade">
      <div style={{textAlign:'center',marginBottom:8}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:10}}>
          <Shield size={24} style={{color:'#0EA5E9'}}/>
          <span style={{fontSize:22,fontWeight:700,color:'#F1F5F9'}}>SupplyGuard</span>
        </div>
        <div style={{fontSize:14,color:'#64748B',maxWidth:440,lineHeight:1.6}}>
          Import your supplier list to generate a personalized risk dashboard with multi-tier visibility up to L4.
        </div>
      </div>

      <div
        onDragOver={e=>{e.preventDefault();setDrag(true)}}
        onDragLeave={()=>setDrag(false)}
        onDrop={onDrop}
        onClick={()=>ref.current.click()}
        style={{
          width:'100%',maxWidth:500,padding:'36px 24px',
          border:`2px dashed ${drag?'#0EA5E9':'#1E2D4A'}`,
          borderRadius:16,background:drag?'#0EA5E91A':'#0D1424',
          cursor:'pointer',textAlign:'center',transition:'all .2s'
        }}>
        {loading
          ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <Spinner size={28}/>
            <div style={{color:'#64748B',fontSize:13}}>Parsing spreadsheet…</div>
          </div>
          :<>
            <FileSpreadsheet size={36} style={{color:'#0EA5E9',marginBottom:12,opacity:.7}}/>
            <div style={{fontWeight:600,fontSize:14,color:'#E2E8F0',marginBottom:6}}>Drop your supplier Excel / CSV here</div>
            <div style={{fontSize:12,color:'#475569'}}>or click to browse · .xlsx .xls .csv supported</div>
          </>
        }
        <input ref={ref} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={e=>e.target.files[0]&&parse(e.target.files[0])}/>
      </div>

      {err&&<div style={{color:'#EF4444',fontSize:12,padding:'8px 14px',background:'#EF444411',borderRadius:8,maxWidth:500,width:'100%'}}>{err}</div>}

      <div style={{display:'flex',alignItems:'center',gap:12,maxWidth:500,width:'100%'}}>
        <div style={{flex:1,height:1,background:'#1E2D4A'}}/>
        <span style={{fontSize:11,color:'#374151'}}>or</span>
        <div style={{flex:1,height:1,background:'#1E2D4A'}}/>
      </div>

      <div style={{display:'flex',gap:12}}>
        <button onClick={downloadTemplate} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 18px',borderRadius:8,background:'#0D1424',border:'1px solid #1E2D4A',color:'#94A3B8',fontSize:13,fontWeight:500,cursor:'pointer'}}>
          <Download size={13}/> Download Excel Template
        </button>
        <button onClick={()=>onImport(null,'demo')} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 18px',borderRadius:8,background:'#0EA5E91A',border:'1px solid #0EA5E933',color:'#0EA5E9',fontSize:13,fontWeight:600,cursor:'pointer'}}>
          <Zap size={13}/> Try with Demo Data
        </button>
      </div>

      <div style={{maxWidth:500,width:'100%',background:'#0D1424',border:'1px solid #1E2D4A',borderRadius:10,padding:'14px 18px'}}>
        <div className="mono" style={{fontSize:9,color:'#374151',letterSpacing:1,marginBottom:10}}>EXPECTED COLUMNS</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
          {['Supplier Name','Country','Tier (T1/T2/T3…)','Product / Component','Category','Annual Spend (€k)','Lead Time (weeks)','Single Source? (Yes/No)'].map(c=>(
            <div key={c} style={{display:'flex',gap:6,alignItems:'center',fontSize:11,color:'#64748B'}}>
              <CheckCircle size={10} style={{color:'#22C55E',flexShrink:0}}/>
              {c}
            </div>
          ))}
        </div>
        <div style={{marginTop:10,fontSize:11,color:'#374151',borderTop:'1px solid #1E2D4A',paddingTop:8}}>Extra columns are preserved and searchable.</div>
      </div>
    </div>
  )
}

/* ─── L4 ANALYSIS ─────────────────────────────────────────────── */
async function runL4Analysis(suppliers,category,apiKey){
  const sup_list=suppliers.slice(0,8).map(s=>`${s.name} (${s.country}, ${s.tier}, ${s.product})`).join('\n')
  const prompt = `You are a supply chain risk analyst. Analyze this supplier list and identify risks down to Tier 4. Reply with ONLY strictly valid JSON, no markdown, no explanation, no extra text before or after.

Suppliers:
${sup_list}

Required JSON format:
{
  "summary": "2 sentences describing main vulnerabilities",
  "overall_score": 75,
  "critical_paths": [
    {
      "chain": ["T1 name", "T2 name", "T3 inferred", "T4 inferred"],
      "material": "material name",
      "country_concentration": "China",
      "pct": 85,
      "risk_score": 82,
      "bottleneck": "specific vulnerability at T4",
      "mitigation": "concrete recommended action"
    }
  ],
  "geographic_clusters": [
    {
      "country": "China",
      "exposure_pct": 70,
      "categories": ["Rare earths", "Magnets"]
    }
  ],
  "single_source_alerts": ["Supplier name: reason for sole source risk"],
  "strategic_actions": ["Action 1", "Action 2", "Action 3"]
}`
  const txt=await geminiCall(apiKey,prompt)
  const cleaned = txt.substring(txt.indexOf('{'), txt.lastIndexOf('}') + 1)
return JSON.parse(cleaned)
}

/* ─── DEMO DATA ─────────────────────────────────────────────── */
const DEMO_SUPPLIERS = [
  {name:'Baumüller GmbH',       country:'Germany', tier:'T1',product:'Electric Motors',       category:'Electromechanical',spend:850, lead:12,single:'No'},
  {name:'Woodward Inc.',        country:'USA',     tier:'T1',product:'Control Systems',        category:'Electronics',      spend:420, lead:14,single:'No'},
  {name:'Liebherr Aerospace',   country:'Germany', tier:'T1',product:'Turbine Components',     category:'Mechanical',       spend:1100,lead:18,single:'Yes'},
  {name:'AVL List GmbH',        country:'Austria', tier:'T1',product:'Testing Systems',        category:'Electronics',      spend:290, lead:10,single:'No'},
  {name:'Ningbo Jintian',       country:'China',   tier:'T2',product:'NdFeB Magnets',          category:'Rare Earth Mats.', spend:320, lead:16,single:'Yes'},
  {name:'Thyssenkrupp',         country:'Germany', tier:'T2',product:'Steel Laminations',      category:'Metals',           spend:180, lead:8, single:'No'},
  {name:'TSMC',                 country:'Taiwan',  tier:'T2',product:'Power MOSFETs',          category:'Semiconductors',   spend:210, lead:20,single:'No'},
  {name:'VSMPO-AVISMA',         country:'Russia',  tier:'T2',product:'Titanium Alloys',        category:'Raw Materials',    spend:440, lead:24,single:'Yes'},
  {name:'Arconic Corp.',        country:'USA',     tier:'T2',product:'Aluminium Castings',     category:'Metals',           spend:155, lead:10,single:'No'},
  {name:'Infineon Technologies',country:'Germany', tier:'T2',product:'Power ICs',              category:'Semiconductors',   spend:190, lead:16,single:'No'},
  {name:'Inner Mongolia RE',    country:'China',   tier:'T3',product:'Rare Earth Mining',      category:'Raw Materials',    spend:0,   lead:0, single:'Yes'},
  {name:'ASML',                 country:'Netherlands',tier:'T3',product:'EUV Lithography',     category:'Equipment',        spend:0,   lead:0, single:'Yes'},
  {name:'Shin-Etsu Chemical',   country:'Japan',   tier:'T3',product:'Silicon Wafers',        category:'Raw Materials',    spend:0,   lead:0, single:'No'},
  {name:'Umicore',              country:'Belgium', tier:'T3',product:'Cobalt Precursors',      category:'Raw Materials',    spend:0,   lead:0, single:'No'},
]

function parseRows(rows){
  if(!rows)return DEMO_SUPPLIERS
  return rows.map(r=>{
    const keys=Object.keys(r).map(k=>k.toLowerCase())
    const get=(...names)=>{
      for(const n of names){
        const k=keys.find(k=>k.includes(n))
        if(k)return r[Object.keys(r).find(ok=>ok.toLowerCase()===k)]||''
      }
      return ''
    }
    return{
      name:    get('supplier','name','company','vendor')||'Unknown',
      country: get('country','nation','origin')||'Unknown',
      tier:    get('tier','level')||'T1',
      product: get('product','component','item','material')||'—',
      category:get('category','type','family')||'General',
      spend:   parseFloat(get('spend','cost','amount','budget'))||0,
      lead:    parseFloat(get('lead','time','delay','week'))||0,
      single:  get('single','sole','unique','source')||'No',
      notes:   get('notes','comment','remark')||'',
    }
  }).filter(r=>r.name&&r.name!=='Unknown')
}

/* ─── PERSONALIZED DASHBOARD ─────────────────────────────────── */
function PersonalDashboard({suppliers,comms,onReset}){
  const tiers={T1:[],T2:[],T3:[],T4:[]}
  suppliers.forEach(s=>{const t=s.tier?.toUpperCase();if(tiers[t])tiers[t].push(s)})

  const critical=suppliers.filter(s=>s.single==='Yes'||s.single===true||s.single==='yes')
  const byCountry={}
  suppliers.forEach(s=>{byCountry[s.country]=(byCountry[s.country]||0)+1})
  const topCountry=Object.entries(byCountry).sort((a,b)=>b[1]-a[1])[0]
  const conc=topCountry?Math.round(topCountry[1]/suppliers.length*100):0

  const globalRisk=Math.min(95,Math.round(
    (critical.length/Math.max(suppliers.length,1))*35 +
    conc*.3 +
    (tiers.T3.length+tiers.T4.length>0?15:0) +
    25
  ))

  const spendData=Object.entries(
    suppliers.reduce((a,s)=>{a[s.category]=(a[s.category]||0)+(s.spend||0);return a},{})
  ).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,v])=>({name:name.length>14?name.slice(0,14)+'…':name,v}))

  return(
    <div style={{padding:24,display:'flex',flexDirection:'column',gap:20}} className="fade">
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:17,fontWeight:700,color:'#F1F5F9'}}>Your Supply Chain</div>
          <div className="mono" style={{fontSize:10,color:'#475569',marginTop:2}}>{suppliers.length} suppliers · {Object.keys(tiers).filter(t=>tiers[t].length).length} tiers mapped</div>
        </div>
        <button onClick={onReset} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:7,background:'#1E2D4A',border:'none',color:'#94A3B8',fontSize:12,cursor:'pointer'}}>
          <RefreshCw size={11}/> Import new
        </button>
      </div>

      {/* KPI row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[
          {label:'Global Risk',val:globalRisk,fmt:'score',icon:<Shield size={16}/>},
          {label:'Critical Deps.',val:critical.length,fmt:'count',icon:<AlertTriangle size={16}/>},
          {label:'Country Concentration',val:conc+'%',fmt:'text',icon:<Globe size={16}/>},
          {label:'Suppliers Total',val:suppliers.length,fmt:'count',icon:<Building2 size={16}/>},
        ].map(k=>(
          <div key={k.label} style={{background:'#0D1424',border:'1px solid #1E2D4A',borderRadius:10,padding:'14px 16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div style={{color:'#475569'}}>{k.icon}</div>
              {k.fmt==='score'&&<Badge score={globalRisk} lg pulse/>}
            </div>
            <div className="mono" style={{fontSize:k.fmt==='score'?34:26,fontWeight:700,color:k.fmt==='score'?rc(globalRisk):'#F1F5F9',lineHeight:1,marginBottom:4}}>
              {k.fmt==='score'?globalRisk:k.val}
            </div>
            <div style={{fontSize:11,color:'#475569'}}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* Tier breakdown */}
        <div style={{background:'#0D1424',border:'1px solid #1E2D4A',borderRadius:10,padding:'16px 18px'}}>
          <div className="mono" style={{fontSize:9,color:'#475569',letterSpacing:1,marginBottom:14}}>TIER BREAKDOWN</div>
          {Object.entries(tiers).filter(([,v])=>v.length).map(([t,v])=>(
            <div key={t} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontSize:12,color:'#94A3B8'}}>{t} — {v.length} suppliers</span>
                <span className="mono" style={{fontSize:10,color:'#475569'}}>{v.filter(s=>s.single==='Yes').length} sole-source</span>
              </div>
              <div style={{height:4,borderRadius:99,background:'#1E2D4A',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.min(100,v.length/suppliers.length*300)}%`,background:'#0EA5E9',borderRadius:99}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Spend by category */}
        <div style={{background:'#0D1424',border:'1px solid #1E2D4A',borderRadius:10,padding:'16px 18px'}}>
          <div className="mono" style={{fontSize:9,color:'#475569',letterSpacing:1,marginBottom:14}}>SPEND BY CATEGORY (€k)</div>
          {spendData.length>0
            ?<ResponsiveContainer width="100%" height={130}>
              <BarChart data={spendData} margin={{top:0,right:0,bottom:0,left:-20}}>
                <XAxis dataKey="name" tick={{fontSize:9,fill:'#475569',fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:9,fill:'#475569',fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                <Bar dataKey="v" radius={[3,3,0,0]}>
                  {spendData.map((entry,i)=><Cell key={i} fill={['#0EA5E9','#22C55E','#F59E0B','#EF4444','#A855F7','#EC4899'][i%6]}/>)}
                </Bar>
                <Tooltip contentStyle={{background:'#0D1424',border:'1px solid #1E2D4A',borderRadius:6,fontSize:10}} formatter={v=>[`€${v}k`]}/>
              </BarChart>
            </ResponsiveContainer>
            :<div style={{height:130,display:'flex',alignItems:'center',justifyContent:'center',color:'#374151',fontSize:12}}>No spend data in import</div>
          }
        </div>
      </div>

      {/* Single source alerts */}
      {critical.length>0&&(
        <div style={{background:'#EF44440D',border:'1px solid #EF444422',borderRadius:10,padding:'14px 18px'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <AlertTriangle size={14} style={{color:'#EF4444'}}/>
            <div className="mono" style={{fontSize:9,color:'#EF4444',letterSpacing:1}}>SOLE-SOURCE DEPENDENCIES — {critical.length} identified</div>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {critical.map(s=>(
              <div key={s.name} style={{padding:'5px 10px',borderRadius:6,background:'#EF444415',border:'1px solid #EF444425',display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:12,color:'#FCA5A5'}}>{s.name}</span>
                <span className="mono" style={{fontSize:9,color:'#EF4444'}}>{s.tier} · {s.country}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commodity live tracker */}
      <div>
        <div className="mono" style={{fontSize:9,color:'#475569',letterSpacing:1,marginBottom:12}}>COMMODITY TRACKER — LIVE</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {comms.map(c=>{
            const col=rc(c.risk),up=c.chg>=0
            return(
              <div key={c.id} style={{background:'#0D1424',border:`1px solid ${col}18`,borderRadius:9,padding:13}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:7}}>
                      <span className="mono" style={{fontSize:14,fontWeight:700,color:col}}>{c.sym}</span>
                      <span style={{fontSize:12,color:'#94A3B8'}}>{c.name}</span>
                    </div>
                    <div style={{fontSize:10,color:'#374151',marginTop:2}}>{c.src}</div>
                  </div>
                  <Badge score={c.risk}/>
                </div>
                <Spark data={c.spark} color={col} id={c.id}/>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:7}}>
                  <span className="mono" style={{fontSize:12,fontWeight:700,color:'#E2E8F0'}}>{c.price.toFixed(1)} <span style={{fontSize:9,color:'#374151'}}>{c.unit}</span></span>
                  <span className="mono" style={{fontSize:10,fontWeight:700,color:up?'#22C55E':'#EF4444'}}>{up?'▲':'▼'}{Math.abs(c.chg).toFixed(1)}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── L4 PANEL ────────────────────────────────────────────────── */
function L4Panel({suppliers,apiKey}){
  const [loading,setLoading]=useState(false)
  const [result,setResult]=useState(null)
  const [err,setErr]=useState('')
  const [filter,setFilter]=useState('')
  const [expanded,setExpanded]=useState(null)

  const analyze=async()=>{
    setLoading(true);setResult(null);setErr('')
    try{
      const r=await runL4Analysis(
        suppliers.filter(s=>!filter||s.category?.toLowerCase().includes(filter.toLowerCase())||s.name?.toLowerCase().includes(filter.toLowerCase())),
        filter,
        apiKey
      )
      setResult(r)
    }catch(e){setErr('Analysis failed: '+e.message)}
    finally{setLoading(false)}
  }

  const cats=[...new Set(suppliers.map(s=>s.category).filter(Boolean))]

  return(
    <div style={{padding:24,display:'flex',flexDirection:'column',gap:18}} className="fade">
      <div>
        <div style={{fontSize:17,fontWeight:700,color:'#F1F5F9'}}>L4 Sub-Supplier Analysis</div>
        <div className="mono" style={{fontSize:10,color:'#475569',marginTop:2}}>AI extrapolates hidden risks down to Tier 4 based on your supplier data</div>
      </div>

      <div style={{background:'#0D1424',border:'1px solid #1E2D4A',borderRadius:10,padding:'16px 18px',display:'flex',flexDirection:'column',gap:14}}>
        <div className="mono" style={{fontSize:9,color:'#475569',letterSpacing:1}}>ANALYSIS SCOPE</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button onClick={()=>setFilter('')} style={{padding:'5px 12px',borderRadius:6,border:`1px solid ${!filter?'#0EA5E9':'#1E2D4A'}`,background:!filter?'#0EA5E91A':'transparent',color:!filter?'#0EA5E9':'#64748B',fontSize:12,cursor:'pointer'}}>
            All suppliers ({suppliers.length})
          </button>
          {cats.slice(0,6).map(c=>(
            <button key={c} onClick={()=>setFilter(c===filter?'':c)} style={{padding:'5px 12px',borderRadius:6,border:`1px solid ${filter===c?'#0EA5E9':'#1E2D4A'}`,background:filter===c?'#0EA5E91A':'transparent',color:filter===c?'#0EA5E9':'#64748B',fontSize:12,cursor:'pointer'}}>
              {c}
            </button>
          ))}
        </div>
        <button onClick={analyze} disabled={loading} style={{alignSelf:'flex-start',display:'flex',alignItems:'center',gap:8,padding:'9px 20px',borderRadius:8,background:'#0EA5E9',border:'none',color:'#000',fontWeight:700,fontSize:13,cursor:'pointer',opacity:loading?.7:1}}>
          {loading?<><Spinner size={14} color="#000"/> Analyzing L4 chain…</>:<><Layers size={14}/> Run L4 Deep Analysis</>}
        </button>
      </div>

      {err&&<div style={{color:'#EF4444',fontSize:12,padding:'10px 14px',background:'#EF444411',borderRadius:8}}>{err}</div>}

      {result&&!loading&&(
        <div style={{display:'flex',flexDirection:'column',gap:14}} className="fade">
          {/* Summary + score */}
          <div style={{background:'#0D1424',border:'1px solid #1E2D4A',borderRadius:10,padding:'16px 18px',display:'flex',gap:18,alignItems:'flex-start'}}>
            <div style={{flex:1}}>
              <div className="mono" style={{fontSize:9,color:'#475569',letterSpacing:1,marginBottom:8}}>EXECUTIVE SUMMARY</div>
              <div style={{fontSize:13,color:'#CBD5E1',lineHeight:1.6}}>{result.summary}</div>
            </div>
            <div style={{textAlign:'center',flexShrink:0}}>
              <div className="mono" style={{fontSize:48,fontWeight:700,color:rc(result.overall_score),lineHeight:1}}>{result.overall_score}</div>
              <Badge score={result.overall_score} lg pulse/>
            </div>
          </div>

          {/* Critical chains */}
          <div>
            <div className="mono" style={{fontSize:9,color:'#475569',letterSpacing:1,marginBottom:10}}>CRITICAL SUPPLY CHAINS (T1 → T4 INFERRED)</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {result.critical_paths?.map((p,i)=>(
                <div key={i} style={{background:'#0D1424',border:`1px solid ${rc(p.risk_score)}22`,borderRadius:10,overflow:'hidden'}}>
                  <div onClick={()=>setExpanded(expanded===i?null:i)} style={{padding:'14px 18px',cursor:'pointer',display:'flex',alignItems:'flex-start',gap:14,justifyContent:'space-between'}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
                        {p.chain?.map((node,j,arr)=>(
                          <span key={j} style={{display:'flex',alignItems:'center',gap:5}}>
                            <span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600,
                              background:j===0?'#0EA5E91A':j===arr.length-1?`${rc(p.risk_score)}1A`:'#1E2D4A',
                              color:j===0?'#0EA5E9':j===arr.length-1?rc(p.risk_score):'#94A3B8',
                              border:`1px solid ${j===0?'#0EA5E933':j===arr.length-1?rc(p.risk_score)+'33':'transparent'}`
                            }}>
                              {j===arr.length-1&&'⚠ '}{node}
                            </span>
                            {j<arr.length-1&&<ArrowRight size={10} style={{color:'#374151'}}/>}
                          </span>
                        ))}
                      </div>
                      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                        <span className="mono" style={{fontSize:10,color:'#64748B'}}>📍 {p.country_concentration} · {p.pct}% concentration</span>
                        <span className="mono" style={{fontSize:10,color:'#64748B'}}>⚗ {p.material}</span>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                      <Badge score={p.risk_score} lg/>
                      {expanded===i?<ChevronUp size={14} style={{color:'#475569'}}/>:<ChevronDown size={14} style={{color:'#475569'}}/>}
                    </div>
                  </div>
                  {expanded===i&&(
                    <div style={{borderTop:'1px solid #1E2D4A',padding:'14px 18px',display:'flex',flexDirection:'column',gap:8}} className="fade">
                      <div style={{background:'#EF44440D',borderRadius:7,padding:'10px 13px'}}>
                        <div className="mono" style={{fontSize:9,color:'#EF4444',letterSpacing:1,marginBottom:4}}>L4 BOTTLENECK</div>
                        <div style={{fontSize:12,color:'#FCA5A5'}}>{p.bottleneck}</div>
                      </div>
                      <div style={{background:'#22C55E0D',borderRadius:7,padding:'10px 13px'}}>
                        <div className="mono" style={{fontSize:9,color:'#22C55E',letterSpacing:1,marginBottom:4}}>MITIGATION</div>
                        <div style={{fontSize:12,color:'#86EFAC'}}>{p.mitigation}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Geo concentration */}
          {result.geographic_clusters?.length>0&&(
            <div style={{background:'#0D1424',border:'1px solid #1E2D4A',borderRadius:10,padding:'16px 18px'}}>
              <div className="mono" style={{fontSize:9,color:'#475569',letterSpacing:1,marginBottom:12}}>GEOGRAPHIC CONCENTRATION</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {result.geographic_clusters.map(g=>(
                  <div key={g.country} style={{display:'flex',alignItems:'center',gap:12}}>
                    <span style={{width:100,fontSize:12,color:'#94A3B8',flexShrink:0}}>{g.country}</span>
                    <div style={{flex:1,height:5,borderRadius:99,background:'#1E2D4A',overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${g.exposure_pct}%`,background:g.exposure_pct>70?'#EF4444':g.exposure_pct>40?'#F59E0B':'#22C55E',borderRadius:99,transition:'width 1s'}}/>
                    </div>
                    <span className="mono" style={{fontSize:11,fontWeight:700,color:g.exposure_pct>70?'#EF4444':g.exposure_pct>40?'#F59E0B':'#22C55E',width:40,textAlign:'right'}}>{g.exposure_pct}%</span>
                    <span style={{fontSize:10,color:'#475569',width:180}}>{g.categories?.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{background:'#0D1424',border:'1px solid #22C55E1A',borderRadius:10,padding:'16px 18px'}}>
            <div className="mono" style={{fontSize:9,color:'#475569',letterSpacing:1,marginBottom:12}}>STRATEGIC ACTIONS</div>
            {result.strategic_actions?.map((a,i)=>(
              <div key={i} style={{display:'flex',gap:10,marginBottom:8,alignItems:'flex-start'}}>
                <div style={{width:20,height:20,borderRadius:'50%',background:'#22C55E1A',border:'1px solid #22C55E33',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span className="mono" style={{fontSize:9,color:'#22C55E'}}>{i+1}</span>
                </div>
                <span style={{fontSize:13,color:'#CBD5E1',lineHeight:1.5}}>{a}</span>
              </div>
            ))}
          </div>

          {/* Sole source */}
          {result.single_source_alerts?.length>0&&(
            <div style={{background:'#F59E0B0D',border:'1px solid #F59E0B22',borderRadius:10,padding:'14px 18px'}}>
              <div className="mono" style={{fontSize:9,color:'#F59E0B',letterSpacing:1,marginBottom:8}}>SOLE-SOURCE VULNERABILITIES ({result.single_source_alerts.length})</div>
              {result.single_source_alerts.map((a,i)=>(
                <div key={i} style={{fontSize:12,color:'#FDE68A',marginBottom:4,display:'flex',gap:6}}>
                  <span style={{color:'#F59E0B',flexShrink:0}}>⚑</span>{a}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── SUPPLIER TABLE ─────────────────────────────────────────── */
function SupplierTable({suppliers}){
  const [q,setQ]=useState('')
  const [sort,setSort]=useState('tier')
  const [tierF,setTierF]=useState('')
  const filtered=suppliers
    .filter(s=>!q||(s.name+s.product+s.country).toLowerCase().includes(q.toLowerCase()))
    .filter(s=>!tierF||s.tier===tierF)
    .sort((a,b)=>{
      if(sort==='tier')return(a.tier||'').localeCompare(b.tier||'')
      if(sort==='spend')return(b.spend||0)-(a.spend||0)
      if(sort==='lead')return(b.lead||0)-(a.lead||0)
      if(sort==='name')return(a.name||'').localeCompare(b.name||'')
      return 0
    })

  return(
    <div style={{padding:24,display:'flex',flexDirection:'column',gap:14}} className="fade">
      <div>
        <div style={{fontSize:17,fontWeight:700,color:'#F1F5F9'}}>Supplier Registry</div>
        <div className="mono" style={{fontSize:10,color:'#475569',marginTop:2}}>{suppliers.length} suppliers imported</div>
      </div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <Search size={12} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#374151'}}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search suppliers, products…"
            style={{width:'100%',padding:'8px 10px 8px 30px',background:'#0D1424',border:'1px solid #1E2D4A',borderRadius:7,color:'#E2E8F0',fontSize:13}}/>
        </div>
        <select value={tierF} onChange={e=>setTierF(e.target.value)} style={{padding:'8px 12px',background:'#0D1424',border:'1px solid #1E2D4A',borderRadius:7,color:'#E2E8F0',fontSize:12}}>
          <option value="">All Tiers</option>
          {['T1','T2','T3','T4'].map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{padding:'8px 12px',background:'#0D1424',border:'1px solid #1E2D4A',borderRadius:7,color:'#E2E8F0',fontSize:12}}>
          <option value="tier">Sort: Tier</option>
          <option value="spend">Sort: Spend ↓</option>
          <option value="lead">Sort: Lead Time ↓</option>
          <option value="name">Sort: Name A-Z</option>
        </select>
      </div>

      <div style={{background:'#0D1424',border:'1px solid #1E2D4A',borderRadius:10,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1.2fr .8fr 1fr .6fr .6fr',padding:'9px 16px',borderBottom:'1px solid #1E2D4A',background:'#080E1A'}}>
          {['Supplier','Product / Component','Country','Category','Tier','Sole Src'].map(h=>(
            <div key={h} className="mono" style={{fontSize:9,color:'#374151',letterSpacing:.5}}>{h}</div>
          ))}
        </div>
        <div style={{maxHeight:440,overflowY:'auto'}}>
          {filtered.map((s,i)=>{
            const sole=s.single==='Yes'||s.single===true||s.single==='yes'
            return(
              <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1.2fr .8fr 1fr .6fr .6fr',padding:'10px 16px',borderBottom:'1px solid #1E2D4A',background:i%2?'transparent':'#0A1020',alignItems:'center'}}>
                <div style={{fontWeight:500,fontSize:13,color:'#F1F5F9',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div>
                <div style={{fontSize:12,color:'#94A3B8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.product}</div>
                <div style={{fontSize:12,color:'#64748B'}}>{s.country}</div>
                <div style={{fontSize:11,color:'#64748B'}}>{s.category}</div>
                <div><span className="mono" style={{padding:'2px 7px',borderRadius:4,background:'#1E2D4A',color:'#94A3B8',fontSize:10}}>{s.tier}</span></div>
                <div>{sole&&<span className="mono" style={{padding:'2px 7px',borderRadius:4,background:'#EF44441A',color:'#EF4444',fontSize:9}}>SOLE</span>}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── WATCH LISTS (reuse logic) ──────────────────────────────── */
function WatchLists({apiKey}){
  const [lists,setLists]=useState([
    {id:1,name:'Rare Earth Metals',product:'Industrial Generators',items:['Neodymium','Praseodymium','Dysprosium'],risk:82,status:'🔴 China NdFeB export alert active'},
    {id:2,name:'Power Semiconductors',product:'Control Systems',items:['SiC MOSFET','GaN','Power ICs'],risk:67,status:'🟡 TSMC capacity -12% Q2'},
  ])
  const [open,setOpen]=useState(false)
  const [prod,setProd]=useState('')
  const [loading,setLoading]=useState(false)
  const [result,setResult]=useState(null)
  const [err,setErr]=useState('')

  const analyze=async()=>{
    if(!prod.trim())return
    setLoading(true);setResult(null);setErr('')
    try{
      const prompt=`Supply chain risk expert. Analyze critical raw materials for: "${prod}"\n\nReply ONLY valid JSON:\n{"watch_list_name":"name","materials":[{"name":"","criticality":"HIGH|MEDIUM|LOW","main_country":"","concentration_pct":0,"substitutability":"EASY|DIFFICULT|NEAR IMPOSSIBLE","risk_note":""}],"top_risk":"","actions":["","",""]}`
      const txt=await geminiCall(apiKey,prompt)
      setResult(JSON.parse(txt))
    }catch(e){setErr('Failed: '+e.message)}
    finally{setLoading(false)}
  }

  const save=()=>{
    if(!result)return
    const avgRisk=Math.round(result.materials.reduce((s,m)=>s+(m.criticality==='HIGH'?78:m.criticality==='MEDIUM'?48:22),0)/Math.max(result.materials.length,1))
    setLists(p=>[{id:Date.now(),name:result.watch_list_name,product:prod,items:result.materials.map(m=>m.name),risk:avgRisk,status:`⚡ ${result.top_risk}`},...p])
    setOpen(false);setProd('');setResult(null)
  }

  return(
    <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}} className="fade">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:17,fontWeight:700,color:'#F1F5F9'}}>Watch Lists</div>
          <div className="mono" style={{fontSize:10,color:'#475569',marginTop:2}}>AI-powered critical material surveillance</div>
        </div>
        <button onClick={()=>{setOpen(true);setResult(null);setProd('')}} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 15px',borderRadius:7,border:'1px solid #0EA5E933',background:'#0EA5E91A',color:'#0EA5E9',fontSize:13,fontWeight:600,cursor:'pointer'}}>
          <Plus size={13}/> New List
        </button>
      </div>

      {open&&(
        <div style={{background:'#0D1424',border:'1px solid #0EA5E933',borderRadius:10,padding:'16px 18px',display:'flex',flexDirection:'column',gap:14}} className="fade">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:7,color:'#0EA5E9',fontWeight:600,fontSize:13}}><Zap size={13}/> AI Material Analysis</div>
            <button onClick={()=>{setOpen(false);setResult(null)}} style={{background:'none',border:'none',cursor:'pointer',color:'#374151'}}><X size={14}/></button>
          </div>
          <div style={{display:'flex',gap:8}}>
            <input value={prod} onChange={e=>setProd(e.target.value)} onKeyDown={e=>e.key==='Enter'&&analyze()}
              placeholder="Product to analyze — e.g. NdFeB magnets for military generators…"
              style={{flex:1,background:'#080E1A',border:'1px solid #1E2D4A',borderRadius:7,padding:'9px 13px',color:'#E2E8F0',fontSize:13}}/>
            <button onClick={analyze} disabled={loading||!prod.trim()} style={{padding:'9px 16px',borderRadius:7,background:'#0EA5E9',border:'none',color:'#000',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:6,opacity:(!prod.trim()||loading)?.5:1}}>
              {loading?<Spinner size={13} color="#000"/>:<Search size={13}/>} Analyze
            </button>
          </div>
          {loading&&<div style={{display:'flex',alignItems:'center',gap:10,color:'#475569',fontSize:12,justifyContent:'center',padding:'16px 0'}}><Spinner/> Analyzing critical dependencies…</div>}
          {err&&<div style={{color:'#EF4444',fontSize:12,padding:'8px 12px',background:'#EF444411',borderRadius:6}}>{err}</div>}
          {result&&!err&&(
            <div style={{display:'flex',flexDirection:'column',gap:10}} className="fade">
              <div style={{fontWeight:700,fontSize:14,color:'#F1F5F9'}}>{result.watch_list_name}</div>
              {result.materials?.map((m,i)=>{
                const sc=m.criticality==='HIGH'?78:m.criticality==='MEDIUM'?48:22
                return(
                  <div key={i} style={{background:'#080E1A',borderRadius:7,padding:'11px 13px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                      <span style={{fontWeight:600,color:'#E2E8F0',fontSize:13}}>{m.name}</span>
                      <Badge score={sc}/>
                      <span className="mono" style={{fontSize:9,color:'#475569'}}>{m.main_country} {m.concentration_pct}%</span>
                    </div>
                    <div style={{fontSize:11,color:'#94A3B8'}}>{m.risk_note}</div>
                  </div>
                )
              })}
              <div style={{background:'#EF44441A',borderRadius:7,padding:'10px 13px',fontSize:12,color:'#FCA5A5'}}>{result.top_risk}</div>
              {result.actions?.map((a,i)=>(
                <div key={i} style={{display:'flex',gap:7,fontSize:12,color:'#CBD5E1'}}>
                  <ChevronRight size={12} style={{color:'#0EA5E9',marginTop:2,flexShrink:0}}/>{a}
                </div>
              ))}
              <button onClick={save} style={{padding:'9px',borderRadius:7,background:'#0EA5E9',border:'none',color:'#000',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                + Add to Watch Lists
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:9}}>
        {lists.map(l=>(
          <div key={l.id} style={{background:'#0D1424',border:`1px solid ${rc(l.risk)}18`,borderRadius:9,padding:'14px 16px'}} className="fade">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div>
                <div style={{fontWeight:600,fontSize:13,color:'#F1F5F9'}}>{l.name}</div>
                <div style={{fontSize:11,color:'#374151',marginTop:2}}>Product: {l.product}</div>
              </div>
              <Badge score={l.risk} lg/>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
              {l.items.map(it=><span key={it} className="mono" style={{padding:'2px 7px',borderRadius:4,background:'#1E2D4A',color:'#94A3B8',fontSize:9}}>{it}</span>)}
            </div>
            <div style={{fontSize:11,color:'#475569'}}>{l.status}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── API KEY SETUP ───────────────────────────────────────────── */
function ApiKeySetup({onSave}){
  const [key,setKey]=useState('')
  const [testing,setTesting]=useState(false)
  const [err,setErr]=useState('')

  const test=async()=>{
    if(!key.trim())return
    setTesting(true);setErr('')
    try{
      const txt=await geminiCall(key.trim(),'Reply with exactly: ok')
      if(txt.toLowerCase().includes('ok')||txt.length>0){onSave(key.trim())}
      else throw new Error('Unexpected response')
    }catch(e){setErr('Invalid key or connection error: '+e.message)}
    finally{setTesting(false)}
  }

  return(
    <div style={{minHeight:'100vh',background:'#060A12',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <style>{G}</style>
      <div style={{width:'100%',maxWidth:440,display:'flex',flexDirection:'column',gap:24}} className="fade">
        <div style={{textAlign:'center'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:12}}>
            <Shield size={28} style={{color:'#0EA5E9'}}/>
            <span style={{fontSize:24,fontWeight:700,color:'#F1F5F9'}}>SupplyGuard</span>
          </div>
          <div style={{fontSize:14,color:'#64748B',lineHeight:1.6}}>Enter your Gemini API key to enable AI-powered analysis. Free, no credit card required.</div>
        </div>

        <div style={{background:'#0D1424',border:'1px solid #1E2D4A',borderRadius:12,padding:24,display:'flex',flexDirection:'column',gap:16}}>
          <div>
            <div className="mono" style={{fontSize:9,color:'#475569',letterSpacing:1,marginBottom:8}}>GEMINI API KEY</div>
            <input
              value={key}
              onChange={e=>setKey(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&test()}
              placeholder="AIza..."
              type="password"
              style={{width:'100%',background:'#080E1A',border:'1px solid #1E2D4A',borderRadius:8,padding:'10px 14px',color:'#E2E8F0',fontSize:13,fontFamily:'Space Mono,monospace'}}
            />
          </div>
          {err&&<div style={{fontSize:12,color:'#EF4444',padding:'8px 12px',background:'#EF444411',borderRadius:6}}>{err}</div>}
          <button onClick={test} disabled={testing||!key.trim()} style={{padding:'11px',borderRadius:8,background:'#0EA5E9',border:'none',color:'#000',fontWeight:700,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:(!key.trim()||testing)?.5:1}}>
            {testing?<><Spinner size={14} color="#000"/> Testing connection…</>:'Connect & Launch'}
          </button>
        </div>

        <div style={{background:'#0D1424',border:'1px solid #1E2D4A',borderRadius:10,padding:'14px 18px'}}>
          <div className="mono" style={{fontSize:9,color:'#475569',letterSpacing:1,marginBottom:10}}>HOW TO GET YOUR FREE KEY</div>
          {[
            ['1','Go to aistudio.google.com'],
            ['2','Sign in with your Google account'],
            ['3','Click "Get API Key" → "Create API key"'],
            ['4','Copy the key (starts with AIza…) and paste above'],
          ].map(([n,t])=>(
            <div key={n} style={{display:'flex',gap:10,marginBottom:7,alignItems:'flex-start'}}>
              <div style={{width:18,height:18,borderRadius:'50%',background:'#1E2D4A',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span className="mono" style={{fontSize:8,color:'#0EA5E9'}}>{n}</span>
              </div>
              <span style={{fontSize:12,color:'#94A3B8'}}>{t}</span>
            </div>
          ))}
          <div style={{marginTop:10,fontSize:11,color:'#374151',borderTop:'1px solid #1E2D4A',paddingTop:10}}>
            Free tier: 1,500 requests/day · 15 requests/minute · No credit card required.
          </div>
        </div>
      </div>
    </div>
  )
}


const TABS=[
  {id:'dashboard', label:'Dashboard',  Icon:BarChart2},
  {id:'l4',        label:'L4 Analysis',Icon:Layers,  badge:'AI'},
  {id:'registry',  label:'Registry',   Icon:Package},
  {id:'watchlists',label:'Watch Lists', Icon:Eye},
  {id:'alerts',    label:'Alerts',      Icon:Bell,   badge:'3'},
]

export default function App(){
  const [tab,setTab]=useState('dashboard')
  const [suppliers,setSuppliers]=useState(null)
  const [fileName,setFileName]=useState('')
  const [comms,setComms]=useState(()=>COMMS.map(c=>({...c})))
  const [apiKey,setApiKey]=useState('')

  useEffect(()=>{
    const iv=setInterval(()=>setComms(p=>p.map(c=>({
      ...c,price:+(c.price*(1+(Math.random()-.5)*.003)).toFixed(2),
      chg:+((Math.random()-.47)*3).toFixed(2)
    }))),5000)
    return()=>clearInterval(iv)
  },[])

  const handleImport=(rows,name)=>{
    const parsed=parseRows(rows)
    setSuppliers(parsed)
    setFileName(name)
    setTab('dashboard')
  }

  if(!apiKey) return <ApiKeySetup onSave={setApiKey}/>

  if(!suppliers){
    return<>
      <style>{G}</style>
      <ExcelImporter onImport={handleImport}/>
    </>
  }

  return(
    <div style={{minHeight:'100vh',background:'#060A12',display:'flex',flexDirection:'column'}}>
      <style>{G}</style>

      {/* Topbar */}
      <div style={{background:'#0A0E1C',borderBottom:'1px solid #141E33',padding:'9px 22px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <Shield size={18} style={{color:'#0EA5E9'}}/>
          <span style={{fontWeight:700,fontSize:15,color:'#F1F5F9'}}>SupplyGuard</span>
          <span className="mono" style={{fontSize:8,padding:'2px 7px',borderRadius:3,background:'#0EA5E91A',color:'#0EA5E9',letterSpacing:1}}>v2</span>
          {fileName&&<span className="mono" style={{fontSize:9,color:'#374151',padding:'2px 8px',borderRadius:4,background:'#1E2D4A',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>📄 {fileName}</span>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:'#374151'}}>
            <div className="pulse" style={{width:5,height:5,borderRadius:'50%',background:'#22C55E'}}/>
            <span className="mono">LIVE</span>
          </div>
          <span className="mono" style={{fontSize:9,color:'#374151'}}>{suppliers.length} SUPPLIERS</span>
        </div>
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {/* Sidebar */}
        <div style={{width:160,flexShrink:0,background:'#0A0E1C',borderRight:'1px solid #141E33',paddingTop:6,display:'flex',flexDirection:'column'}}>
          {TABS.map(({id,label,Icon,badge})=>{
            const a=tab===id
            return(
              <button key={id} onClick={()=>setTab(id)} style={{
                display:'flex',alignItems:'center',gap:9,padding:'10px 15px',background:a?'#0EA5E91A':'transparent',
                borderLeft:a?'2px solid #0EA5E9':'2px solid transparent',
                color:a?'#0EA5E9':'#4B5563',border:'none',borderLeft:a?'2px solid #0EA5E9':'2px solid transparent',
                cursor:'pointer',fontSize:12,fontWeight:a?600:400,textAlign:'left',width:'100%',transition:'all .15s'
              }}>
                <Icon size={13}/>
                <span style={{flex:1}}>{label}</span>
                {badge&&<span className="mono" style={{padding:'1px 5px',borderRadius:3,background:badge==='AI'?'#0EA5E91A':'#EF44441A',color:badge==='AI'?'#0EA5E9':'#EF4444',fontSize:8}}>{badge}</span>}
              </button>
            )
          })}
          <div style={{flex:1}}/>
          <div style={{padding:'12px 15px',borderTop:'1px solid #141E33'}}>
            <div className="mono" style={{fontSize:8,color:'#1E2D4A',letterSpacing:.5,marginBottom:5}}>DATA SOURCES</div>
            {['World Bank','GDELT','Alpha Vantage','UN Comtrade','NewsAPI'].map(s=>(
              <div key={s} style={{display:'flex',alignItems:'center',gap:4,marginBottom:3}}>
                <div style={{width:3,height:3,borderRadius:'50%',background:'#1E2D4A'}}/>
                <span style={{fontSize:9,color:'#1E2D4A'}}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflow:'auto',maxHeight:'calc(100vh - 46px)'}}>
          {tab==='dashboard' &&<PersonalDashboard suppliers={suppliers} comms={comms} onReset={()=>setSuppliers(null)}/>}
          {tab==='l4'        &&<L4Panel suppliers={suppliers} apiKey={apiKey}/>}
          {tab==='registry'  &&<SupplierTable suppliers={suppliers}/>}
          {tab==='watchlists'&&<WatchLists apiKey={apiKey}/>}
          {tab==='alerts'    &&(
            <div style={{padding:24,display:'flex',flexDirection:'column',gap:12}} className="fade">
              <div style={{fontSize:17,fontWeight:700,color:'#F1F5F9'}}>Alert Center</div>
              {ALERTS_STATIC.map(a=>{
                const sc=a.lvl==='CRITICAL'?85:a.lvl==='HIGH'?65:a.lvl==='MEDIUM'?40:15
                return(
                  <div key={a.id} style={{background:'#0D1424',borderRadius:9,padding:'14px 16px',borderLeft:`3px solid ${rc(sc)}`}} className="fade">
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
                      <Badge score={sc} lg pulse={sc>=80}/>
                      <span className="mono" style={{fontSize:9,color:'#374151'}}>{a.ago} ago</span>
                    </div>
                    <div style={{fontSize:13,color:'#CBD5E1',lineHeight:1.5,marginBottom:a.suppliers?.length?9:0}}>{a.msg}</div>
                    {a.suppliers?.length>0&&(
                      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                        {a.suppliers.map(s=><span key={s} className="mono" style={{padding:'2px 7px',borderRadius:4,background:'#1E2D4A',color:'#94A3B8',fontSize:9}}>{s}</span>)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
