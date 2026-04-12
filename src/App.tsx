/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  Users, TrendingUp, AlertTriangle, Sparkles, 
  Building2, Timer, FileText, Layout, Headset, MousePointer2, 
  Mail, ArrowLeft, Download, FileDown
} from 'lucide-react';

/**
 * SONATA CX CAPACITY PLANNER - v4.8 (Titanium Vercel Build)
 * Código tipado e blindado contra as regras estritas (noImplicitAny / strictNullChecks) do compilador do Vercel.
 */

const CHART_COLORS = ['#4F46E5', '#818CF8', '#C7D2FE', '#312E81', '#6366F1', '#4338CA', '#1E1B4B', '#A5B4FC'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface TicketData {
  id_ticket?: string;
  data_hora_entrada?: string;
  client_id?: string;
  canal?: string;
  assunto?: string;
  motivo?: string;
  isValidDate: boolean;
  dateObj: Date;
  yearMonth: string;
  hour: number;
  day: number;
  [key: string]: any;
}

interface ConfigState {
  companyMarket: string;
  teamSize: number | string;
  shiftHours: number | string;
  breakMinutes: number | string;
  phoneAHT: number | string;
  phoneTMEFirst: number | string;
  chatAHT: number | string;
  chatTMEFirst: number | string;
  chatSLAReopen: number | string;
  chatConcurrency: number | string;
  emailAHT: number | string;
  emailTMEFirst: number | string;
  emailSLAReopen: number | string;
}

interface StatsType {
  total: number;
  avgDailyVolLastMonth: number;
  growth: number;
  monthlyTrend: { month: string; volume: number }[];
  globalFCR: number;
  fcrTrend: { month: string; rate: number }[];
  hcIdeal: number;
  hcDist: { phone: number; chat: number; email: number };
  subjectsMap: Record<string, { total: number; motives: Record<string, number> }>;
  pieSubjects: { name: string; value: number }[];
  heatmapGrid: number[][];
  maxHeatmapVal: number;
}

const defaultStats: StatsType = {
  total: 0,
  avgDailyVolLastMonth: 0,
  growth: 0,
  monthlyTrend: [],
  globalFCR: 0,
  fcrTrend: [],
  hcIdeal: 0,
  hcDist: { phone: 0, chat: 0, email: 0 },
  subjectsMap: {},
  pieSubjects: [],
  heatmapGrid: Array(7).fill(null).map(() => Array(24).fill(0)),
  maxHeatmapVal: 0
};

export default function App() {
  
const apikey = import.meta.env.VITE_SONATA_API;
  
  const [rawData, setRawData] = useState<TicketData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isReportGenerated, setIsReportGenerated] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const [config, setConfig] = useState<ConfigState>({
    companyMarket: "", 
    teamSize: 50,
    shiftHours: 8, 
    breakMinutes: 60,
    phoneAHT: 5,
    phoneTMEFirst: 4, 
    chatAHT: 4,
    chatTMEFirst: 5,  
    chatSLAReopen: 5, 
    chatConcurrency: 3,
    emailAHT: 2,
    emailTMEFirst: 24, 
    emailSLAReopen: 24 
  });

  const handleDownloadTemplate = () => {
    const csvContent = "id_ticket;data_hora_entrada;client_id;canal;assunto;motivo\n" +
                       "TKT-005018;01/01/2025 00:08;CLI-18980;chat;logistica;atraso\n" +
                       "TKT-001351;01/01/2025 00:11;CLI-13328;email;pagamento;contestacao\n" +
                       "TKT-009209;01/01/2025 00:12;CLI-15635;telefone;logistica;atraso";
                       
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_sonata_cx.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event: any) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split('\n');
      if (lines.length < 2) {
          alert("Ficheiro vazio ou inválido.");
          return;
      }

      const delimiter = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(delimiter).map((h: string) => h.trim().toLowerCase().replace(/["']/g, ''));
      
      const parsed = lines.slice(1).filter((l: string) => {
        const cleaned = l.replace(/[;,]/g, '').trim();
        return cleaned !== "";
      }).map((line: string) => {
        const regex = new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
        const values = line.split(regex);
        const row: Record<string, any> = {};
        
        headers.forEach((h: string, i: number) => { 
            row[h] = values[i] ? values[i].trim().replace(/^["']|["']$/g, '') : ""; 
        });
        
        let dt = new Date(row.data_hora_entrada);
        if (Number.isNaN(dt.getTime()) && row.data_hora_entrada) {
            const parts = row.data_hora_entrada.split(/[\s/:]+/);
            if(parts.length >= 5) {
                dt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T${parts[3]}:${parts[4]}:00`);
            }
        }

        row.isValidDate = !Number.isNaN(dt.getTime());
        if(row.isValidDate) {
            row.dateObj = dt;
            row.yearMonth = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            row.hour = dt.getHours();
            row.day = dt.getDay();
        }
        return row as TicketData;
      }).filter((r: any) => r.isValidDate); 

      if(parsed.length === 0) {
          alert("Nenhuma linha com data válida encontrada.");
          return;
      }

      setRawData(parsed);
      setIsLoaded(true);
      setIsReportGenerated(false);
      setSelectedSubject(null);
      setAiReport("");
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const stats = useMemo<StatsType>(() => {
    if (!rawData.length) return defaultStats;

    const monthMap: Record<string, number> = {};
    rawData.forEach((d: TicketData) => {
        monthMap[d.yearMonth] = (monthMap[d.yearMonth] || 0) + 1;
    });
    
    const monthlyTrend = Object.keys(monthMap).sort().map((key: string) => ({
        month: key,
        volume: monthMap[key]
    }));

    let growth = 0;
    if (monthlyTrend.length > 1) {
        const firstVol = monthlyTrend[0].volume;
        const lastVol = monthlyTrend[monthlyTrend.length - 1].volume;
        const n = monthlyTrend.length;
        if(firstVol > 0 && n > 1) growth = Math.pow(lastVol / firstVol, 1 / (n - 1)) - 1;
    }

    const monthsKeys = Object.keys(monthMap).sort();
    const lastMonthKey = monthsKeys[monthsKeys.length - 1];
    const lastMonthData: TicketData[] = rawData.filter((d: TicketData) => d.yearMonth === lastMonthKey);
    
    const lastMonthChannels = lastMonthData.reduce((acc: Record<string, number>, d: TicketData) => { 
      const c = d.canal?.toLowerCase() || 'outros';
      acc[c] = (acc[c] || 0) + 1; 
      return acc; 
    }, { telefone: 0, chat: 0, email: 0 });
    
    const safeShiftHours = Number(config.shiftHours) || 8;
    const safeBreakMinutes = Number(config.breakMinutes) || 0;
    const netWorkSec = Math.max(1, (safeShiftHours * 3600) - (safeBreakMinutes * 60));

    const avgDailyVolLastMonth = lastMonthData.length / 30; 
    
    const pPhone = lastMonthChannels.telefone / lastMonthData.length || 0;
    const pChat = lastMonthChannels.chat / lastMonthData.length || 0;
    const pEmail = lastMonthChannels.email / lastMonthData.length || 0;

    const wlPhoneSec = (avgDailyVolLastMonth * pPhone) * ((Number(config.phoneAHT) || 0) * 60);
    const wlChatSec = ((avgDailyVolLastMonth * pChat) / (Number(config.chatConcurrency) || 1)) * ((Number(config.chatAHT) || 0) * 60);
    const wlEmailSec = (avgDailyVolLastMonth * pEmail) * ((Number(config.emailAHT) || 0) * 3600);
    const totalDailyWorkloadSec = wlPhoneSec + wlChatSec + wlEmailSec;

    const hcIdeal = Math.ceil((totalDailyWorkloadSec / netWorkSec) / 0.82) || 0;
    const hcPhone = Math.ceil((wlPhoneSec / netWorkSec) / 0.82) || 0;
    const hcChat = Math.ceil((wlChatSec / netWorkSec) / 0.82) || 0;
    const hcEmail = Math.ceil((wlEmailSec / netWorkSec) / 0.82) || 0;

    const sorted = [...rawData].sort((a: TicketData, b: TicketData) => a.dateObj.getTime() - b.dateObj.getTime());
    const clientHistory = new Map<string, Date>();
    const recontactsByMonth: Record<string, { total: number; recontacts: number }> = {};
    let totalRecontacts = 0;

    sorted.forEach((t: TicketData) => {
      if (!t.client_id) return;
      
      const key = `${t.client_id}-${t.assunto}`;
      if (!recontactsByMonth[t.yearMonth]) recontactsByMonth[t.yearMonth] = { total: 0, recontacts: 0 };
      recontactsByMonth[t.yearMonth].total++;

      if (clientHistory.has(key)) {
        const diff = (t.dateObj.getTime() - (clientHistory.get(key)?.getTime() || 0)) / (1000 * 3600 * 24);
        if (diff <= 14) {
            totalRecontacts++;
            recontactsByMonth[t.yearMonth].recontacts++;
        }
      }
      clientHistory.set(key, t.dateObj);
    });

    const fcrTrend = Object.keys(recontactsByMonth).sort().map((m: string) => ({
        month: m,
        rate: parseFloat(((recontactsByMonth[m].recontacts / Math.max(recontactsByMonth[m].total, 1)) * 100).toFixed(1))
    }));
    const globalFCR = rawData.length > 0 ? (totalRecontacts / rawData.length) * 100 : 0;

    const subjectsMap: Record<string, { total: number; motives: Record<string, number> }> = {};
    rawData.forEach((d: TicketData) => {
        const ass = d.assunto || 'Não Classificado';
        const mot = d.motivo || 'Não Classificado';
        if (!subjectsMap[ass]) subjectsMap[ass] = { total: 0, motives: {} };
        subjectsMap[ass].total++;
        subjectsMap[ass].motives[mot] = (subjectsMap[ass].motives[mot] || 0) + 1;
    });

    const pieSubjects = Object.keys(subjectsMap).map((k: string) => ({ name: k, value: subjectsMap[k].total })).sort((a: any, b: any) => b.value - a.value);

    const heatmapGrid = Array(7).fill(null).map(() => Array(24).fill(0));
    let maxHeatmapVal = 0;
    rawData.forEach((d: TicketData) => {
        heatmapGrid[d.day][d.hour]++;
        if (heatmapGrid[d.day][d.hour] > maxHeatmapVal) maxHeatmapVal = heatmapGrid[d.day][d.hour];
    });

    return { 
      total: rawData.length, 
      avgDailyVolLastMonth: Math.round(avgDailyVolLastMonth),
      growth, 
      monthlyTrend,
      globalFCR,
      fcrTrend,
      hcIdeal, 
      hcDist: { phone: hcPhone, chat: hcChat, email: hcEmail },
      subjectsMap,
      pieSubjects,
      heatmapGrid,
      maxHeatmapVal
    };
  }, [rawData, config]);

  const s: StatsType = stats || defaultStats;

  const getHcColorConfig = () => {
      if(s.total === 0) return { text: 'text-slate-900', bg: 'bg-slate-100', icon: 'text-slate-500' };
      const ratio = s.hcIdeal / (Number(config.teamSize) || 1);
      if (ratio > 1.15) return { text: 'text-rose-500', bg: 'bg-rose-50', icon: 'text-rose-400' }; 
      if (ratio > 1.0) return { text: 'text-amber-500', bg: 'bg-amber-50', icon: 'text-amber-400' }; 
      return { text: 'text-emerald-500', bg: 'bg-emerald-50', icon: 'text-emerald-400' }; 
  };

  const handlePieClick = (data: any) => {
      if (!selectedSubject && data && data.name) setSelectedSubject(data.name);
  };

  const currentPieData = useMemo(() => {
      if (s.total === 0) return [];
      if (!selectedSubject) return s.pieSubjects || [];
      const motives = s.subjectsMap[selectedSubject]?.motives || {};
      return Object.keys(motives).map((k: string) => ({ name: k, value: motives[k] })).sort((a: any, b: any) => b.value - a.value);
  }, [s, selectedSubject]);

  const getHeatmapColor = (val: number, max: number) => {
      if (val === 0 || !max) return '#f1f5f9'; 
      const ratio = Math.max(0, Math.min(1, val / max));
      const hue = (1 - ratio) * 200;
      return `hsl(${hue}, 90%, 60%)`;
  };

  const generateReportAndAI = async () => {
    setIsReportGenerated(true); 
    setIsAiLoading(true);
    
    const prompt = `
    [INSTRUÇÃO DE SISTEMA]: Você é um consultor sênior escrevendo um parecer executivo direto. Use formatação Markdown.

    Atue como um Consultor de Workforce Management (WFM) e CX Sênior da consultoria 'Sonata.cx'.
    Escreva um relatório em formato Markdown.

    DADOS:
    - Mercado: ${config.companyMarket}
    - Headcount Atual: ${config.teamSize} analistas.
    - Headcount Ideal Projetado (Mês Recente): ${s.hcIdeal} analistas.
    - Crescimento Mensal Médio: ${(s.growth * 100).toFixed(1)}%
    - Taxa de Recontato (14 dias): ${(s.globalFCR).toFixed(1)}%

    REGRAS:
    1. Baseie-se nas médias históricas apontadas.
    2. SE (Headcount Ideal) for maior que (Atual + 15%) OU Crescimento > 10%, sugira investir em self-service e automação (Tier 1) em vez de apenas contratar.
    3. SE (Headcount Ideal) estiver equilibrado/baixo E Crescimento < 10%, foque em qualidade e ajuste de produtividade.
    4. Venda discretamente a Sonata.cx no final como parceira estratégica.
    `;

    try {
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            contents: [{ 
              role: "user", 
              parts: [{ text: prompt }] 
            }]
        })
      });
      
      const responseText = await resp.text();

      if (!resp.ok) {
          throw new Error(`[Erro HTTP ${resp.status}] Resposta do Servidor: ${responseText.substring(0, 150)}...`);
      }

      let data: any;
      try {
          data = JSON.parse(responseText);
      } catch (parseError) {
          throw new Error(`Falha no processamento JSON. Resposta do servidor: ${responseText.substring(0, 150)}...`);
      }

      if(data.error) throw new Error(data.error.message);
      
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiText) {
          throw new Error("A API não retornou conteúdo de texto.");
      }

      setAiReport(aiText);
      
    } catch (e: any) {
      if (e?.message?.includes('Failed to fetch') || e?.message?.includes('NetworkError')) {
         setAiReport(`### Bloqueio de Rede 🛡️\n\nA requisição foi bloqueada localmente. Verifique configurações de AdBlock, Shields do Brave ou Firewalls corporativos.\n\n*(Detalhe Técnico: \`${e?.message}\`)*`);
      } else {
         setAiReport(`### Falha na API ⚠️\n\nErro de processamento.\n\n**Detalhe Técnico:**\n\`\`\`text\n${e?.message}\n\`\`\``);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const CustomTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
          <p className="font-bold text-slate-800 mb-1">{label}</p>
          {payload.map((p: any, idx: number) => (
             <p key={idx} className="text-sm font-semibold" style={{ color: p.color }}>
               {p.name}: {p.value}
             </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderPieLabel = (props: any) => {
      const { name, percent } = props;
      if(percent < 0.05) return null; 
      return `${name} (${(percent * 100).toFixed(0)}%)`;
  };

  const hcColors = getHcColorConfig();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-800 font-sans">
      
      <aside className="w-full lg:w-[400px] bg-white border-r border-slate-200 p-8 overflow-y-auto max-h-screen sticky top-0 shadow-lg z-50 flex flex-col">
        <div className="flex flex-col items-center mb-8 pb-6 border-b border-slate-100">
          <div className="bg-indigo-600 p-3 flex items-center justify-center rounded-2xl mb-3 shadow-lg shadow-indigo-200 w-14 h-14">
             <img src="/logo-branca.png" alt="Sonata CX Logo" className="w-8 h-8 object-contain" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">sonata.cx <span className="text-indigo-600 italic">lab</span></h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Capacity Planner v4.8</p>
        </div>

        <div className="space-y-8 flex-1">
          <section className="space-y-3">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Building2 size={16}/> Mercado da Empresa
                </label>
                <input 
                  placeholder="Ex: E-commerce, Fintech..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.companyMarket}
                  onChange={(e: any) => setConfig({...config, companyMarket: e.target.value})}
                />
             </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><Users size={16}/> Equipa e Jornada</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Equipa Atual</label>
                <input type="number" className="text-xl font-black w-full bg-transparent outline-none" value={config.teamSize} onChange={(e: any) => setConfig({...config, teamSize: e.target.value === '' ? '' : parseInt(e.target.value)})}/>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Carga Horária</label>
                <select className="text-base font-black w-full bg-transparent outline-none cursor-pointer" value={config.shiftHours} onChange={(e: any) => setConfig({...config, shiftHours: parseInt(e.target.value)})}>
                   <option value={4}>4h diárias</option>
                   <option value={6}>6h diárias</option>
                   <option value={8}>8h diárias</option>
                </select>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
              <label className="text-xs font-bold text-slate-600 uppercase">Pausa Total (Min)</label>
              <input type="number" className="text-right text-lg font-black w-20 bg-transparent outline-none text-indigo-600" value={config.breakMinutes} onChange={(e: any) => setConfig({...config, breakMinutes: e.target.value === '' ? '' : parseInt(e.target.value)})}/>
            </div>
          </section>

          <section className="space-y-5">
             <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><Timer size={16}/> Performance e Metas</h3>
             
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-600 mb-4"><Headset size={18}/> <span className="text-xs font-black uppercase">Voz / Telefone</span></div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-slate-50 p-3 rounded-xl"><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">TMA (Min)</label><input type="number" className="w-full font-black text-base bg-transparent" value={config.phoneAHT} onChange={(e: any) => setConfig({...config, phoneAHT: e.target.value === '' ? '' : parseFloat(e.target.value)})}/></div>
                   <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100"><label className="text-[10px] font-black text-indigo-600 uppercase block mb-1">TME (Min)</label><input type="number" className="w-full font-black text-base bg-transparent text-indigo-700" value={config.phoneTMEFirst} onChange={(e: any) => setConfig({...config, phoneTMEFirst: e.target.value === '' ? '' : parseInt(e.target.value)})}/></div>
                </div>
             </div>

             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-600 mb-4"><MousePointer2 size={18}/> <span className="text-xs font-black uppercase">Chat / Messaging</span></div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                   <div className="bg-slate-50 p-3 rounded-xl text-center"><label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">TMA (m)</label><input type="number" className="w-full font-black text-sm bg-transparent text-center" value={config.chatAHT} onChange={(e: any) => setConfig({...config, chatAHT: e.target.value === '' ? '' : parseFloat(e.target.value)})}/></div>
                   <div className="bg-indigo-50 p-3 rounded-xl text-center border border-indigo-100"><label className="text-[9px] font-black text-indigo-600 uppercase block mb-1">TME (m)</label><input type="number" className="w-full font-black text-sm bg-transparent text-center text-indigo-700" value={config.chatTMEFirst} onChange={(e: any) => setConfig({...config, chatTMEFirst: e.target.value === '' ? '' : parseInt(e.target.value)})}/></div>
                   <div className="bg-indigo-50 p-3 rounded-xl text-center border border-indigo-100"><label className="text-[9px] font-black text-indigo-600 uppercase block mb-1">Reab (m)</label><input type="number" className="w-full font-black text-sm bg-transparent text-center text-indigo-700" value={config.chatSLAReopen} onChange={(e: any) => setConfig({...config, chatSLAReopen: e.target.value === '' ? '' : parseInt(e.target.value)})}/></div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl flex justify-between items-center">
                   <label className="text-[10px] font-bold text-slate-600 uppercase">Simultaneidade</label>
                   <select className="bg-transparent font-black text-sm outline-none text-indigo-600 text-right" value={config.chatConcurrency} onChange={(e: any) => setConfig({...config, chatConcurrency: parseInt(e.target.value)})}>
                      {[1,2,3,4,5,6,7,8].map((n: number) => <option key={n} value={n}>{n}x</option>)}
                   </select>
                </div>
             </div>

             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-600 mb-4"><Mail size={18}/> <span className="text-xs font-black uppercase">E-mail / Tickets</span></div>
                <div className="grid grid-cols-3 gap-2">
                   <div className="bg-slate-50 p-3 rounded-xl text-center"><label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">TMA (h)</label><input type="number" className="w-full font-black text-sm bg-transparent text-center" value={config.emailAHT} onChange={(e: any) => setConfig({...config, emailAHT: e.target.value === '' ? '' : parseFloat(e.target.value)})}/></div>
                   <div className="bg-indigo-50 p-3 rounded-xl text-center border border-indigo-100"><label className="text-[9px] font-black text-indigo-600 uppercase block mb-1">TME (h)</label><input type="number" className="w-full font-black text-sm bg-transparent text-center text-indigo-700" value={config.emailTMEFirst} onChange={(e: any) => setConfig({...config, emailTMEFirst: e.target.value === '' ? '' : parseInt(e.target.value)})}/></div>
                   <div className="bg-indigo-50 p-3 rounded-xl text-center border border-indigo-100"><label className="text-[9px] font-black text-indigo-600 uppercase block mb-1">Reab (h)</label><input type="number" className="w-full font-black text-sm bg-transparent text-center text-indigo-700" value={config.emailSLAReopen} onChange={(e: any) => setConfig({...config, emailSLAReopen: e.target.value === '' ? '' : parseInt(e.target.value)})}/></div>
                </div>
             </div>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
           <button 
              onClick={generateReportAndAI}
              disabled={!isLoaded || !config.companyMarket}
              className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg transition-all disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center gap-2 active:scale-95"
            >
              {isAiLoading ? "A Analisar..." : <><Layout size={18}/> Gerar Relatório Estratégico</>}
            </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-10 overflow-y-auto relative">
        
        {!isLoaded ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
             <div className="mb-10 flex items-center justify-center hover:scale-105 transition-transform duration-500">
               <img src="/logo-apresentacao.png" alt="Sonata CX" className="h-28 object-contain drop-shadow-sm" />
             </div>
             <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Análise de Escala WFM</h2>
             <p className="text-slate-500 mb-10 text-lg">
               Faça o upload do histórico de tickets (CSV) com as colunas: <br/>
               <span className="font-mono text-sm bg-white p-1 rounded">data_hora_entrada, client_id, canal, assunto, motivo</span>
             </p>
             
             <div className="flex flex-col items-center gap-4 mb-10">
                 <div className="relative hover:scale-105 transition-transform">
                   <input 
                     id="csv-upload" 
                     type="file" 
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                     accept=".csv" 
                     onChange={handleImport} 
                     title="Clique para importar"
                   />
                   <div className="bg-indigo-600 text-white px-10 py-5 rounded-full font-black text-xl shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 cursor-pointer">
                     <FileText size={24} /> Importar Ficheiro CSV
                   </div>
                 </div>
                 
                 <button 
                   onClick={handleDownloadTemplate}
                   className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors underline underline-offset-4"
                 >
                   <FileDown size={16} /> Descarregar Planilha de Exemplo (Template)
                 </button>
             </div>

             <div className="bg-red-50 border border-red-200 p-6 rounded-2xl max-w-lg mx-auto text-left shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-red-500 shrink-0 mt-1" size={24} />
                  <div>
                    <h4 className="text-red-800 font-bold text-sm uppercase tracking-wider mb-2">Aviso de Segurança (LGPD/RGPD)</h4>
                    <p className="text-red-700 text-xs leading-relaxed mb-2">
                      <strong>Não faça upload de informações sensíveis ou dados reais de clientes.</strong> Recomendamos vivamente mascarar ou anonimizar a coluna <code className="bg-red-100 px-1 py-0.5 rounded font-mono">client_id</code>. Não utilize E-mails, CPFs ou Nomes reais em nenhuma hipótese.
                    </p>
                    <p className="text-red-700 text-xs leading-relaxed opacity-90">
                      Os seus dados brutos são processados 100% localmente no seu navegador e não ficam registados. Contudo, os resultados numéricos (KPIs consolidados) são enviados como prompt para a IA (Google Gemini) formatar o parecer, e este pedido de rede não deve conter dados pessoais identificáveis (PII).
                    </p>
                  </div>
                </div>
             </div>

          </div>
        ) : !isReportGenerated ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                 <FileText size={32}/>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Ficheiro Importado com Sucesso!</h3>
              <p className="text-slate-500 mb-8 text-lg">
                 O ficheiro possui <strong>{s.total.toLocaleString()}</strong> contactos válidos.<br/><br/>
                 Para visualizar o dashboard, preencha o campo <strong>Mercado da Empresa</strong> na barra lateral e clique em <strong>Gerar Relatório Estratégico</strong>.
              </p>
          </div>
        ) : (
          <div className="space-y-8 pb-20 max-w-7xl mx-auto">
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              
              <div className={`p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group bg-white`}>
                  <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-500 -z-10 ${hcColors.bg}`}></div>
                  <div className="flex justify-between items-start mb-4">
                      <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Users size={14} className={hcColors.icon}/> Headcount Ideal
                      </div>
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded">vs {config.teamSize}</span>
                  </div>
                  <div className={`text-5xl font-black mb-1 ${hcColors.text}`}>{s.hcIdeal}</div>
                  <div className="text-[11px] text-slate-500 font-medium">Vol Diário Ref: {s.avgDailyVolLastMonth} tickets</div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500 -z-10"></div>
                  <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mb-4"><TrendingUp size={14}/> Crescimento (MoM)</div>
                  <div className="text-5xl font-black text-slate-900 mb-1">{(s.growth * 100).toFixed(1)}%</div>
                  <div className="text-[11px] text-slate-500 font-medium">Taxa composta mensal</div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500 -z-10"></div>
                  <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mb-4"><AlertTriangle size={14}/> Taxa de Recontato</div>
                  <div className="text-5xl font-black text-slate-900 mb-1">{s.globalFCR.toFixed(1)}%</div>
                  <div className="text-[11px] text-slate-500 font-medium">Janela de 14 dias p/ cliente</div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm bg-slate-900 text-white">
                  <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mb-4"><Layout size={14}/> Equipa Necessária</div>
                  <div className="flex justify-between items-end">
                      <div className="text-center">
                          <div className="text-2xl font-black text-white">{s.hcDist.phone}</div>
                          <div className="text-[9px] uppercase tracking-wider text-slate-500 mt-1"><Headset size={10} className="mx-auto mb-1"/>Voz</div>
                      </div>
                      <div className="text-center border-l border-r border-slate-700 px-4">
                          <div className="text-2xl font-black text-white">{s.hcDist.chat}</div>
                          <div className="text-[9px] uppercase tracking-wider text-slate-500 mt-1"><MousePointer2 size={10} className="mx-auto mb-1"/>Chat</div>
                      </div>
                      <div className="text-center">
                          <div className="text-2xl font-black text-white">{s.hcDist.email}</div>
                          <div className="text-[9px] uppercase tracking-wider text-slate-500 mt-1"><Mail size={10} className="mx-auto mb-1"/>Email</div>
                      </div>
                  </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-96 flex flex-col">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">Evolução do Volume <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Mês a Mês</span></h3>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={s.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                            <RechartsTooltip content={(props: any) => <CustomTooltip {...props} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area type="monotone" dataKey="volume" name="Tickets" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorVol)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-96 flex flex-col">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">Taxa de Recontato (FCR) <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">% Mensal</span></h3>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={s.fcrTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(v: any) => `${v}%`} />
                            <RechartsTooltip content={(props: any) => <CustomTooltip {...props} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Line type="monotone" dataKey="rate" name="Recontato (%)" stroke="#334155" strokeWidth={3} dot={{r: 4, fill: '#334155', strokeWidth: 2, stroke: '#fff'}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[500px] flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 leading-tight">Distribuição de Demanda</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {selectedSubject ? `Motivos de: ${selectedSubject}` : 'Visão Macro: Assuntos. Clique na fatia para aprofundar.'}
                        </p>
                    </div>
                    {selectedSubject && (
                        <button onClick={() => setSelectedSubject(null)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full flex items-center gap-2 hover:bg-indigo-100 transition-colors">
                            <ArrowLeft size={14}/> Voltar Macro
                        </button>
                    )}
                </div>
                
                <div className="flex-1 min-h-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={currentPieData}
                                innerRadius={100}
                                outerRadius={160}
                                paddingAngle={2}
                                dataKey="value"
                                onClick={handlePieClick as any}
                                className={!selectedSubject ? "cursor-pointer" : ""}
                                label={renderPieLabel}
                                labelLine={true}
                            >
                                {currentPieData.map((_: any, i: number) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} className="hover:opacity-80 transition-opacity" />
                                ))}
                            </Pie>
                            <RechartsTooltip content={(props: any) => <CustomTooltip {...props} />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[450px] flex flex-col overflow-hidden">
                  <h3 className="text-lg font-black text-slate-800 mb-1">Mapa de Calor (Concentração de Volume)</h3>
                  <p className="text-xs text-slate-500 mb-6">Dias da Semana vs. Horas do Dia. Identifique picos térmicos para elaboração de escalas.</p>
                  
                  <div className="flex-1 overflow-auto pr-2 pb-2 custom-scrollbar">
                      <div className="flex ml-12 mb-2">
                          {Array.from({length: 24}).map((_: any, h: number) => (
                              <div key={h} className="flex-1 text-center text-[9px] font-bold text-slate-400 min-w-[24px]">
                                  {h}h
                              </div>
                          ))}
                      </div>
                      
                      <div className="flex flex-col gap-1">
                          {WEEKDAYS.map((day: string, dIdx: number) => (
                              <div key={day} className="flex items-center h-8">
                                  <div className="w-12 text-[10px] font-black text-slate-600 uppercase text-right pr-3">{day}</div>
                                  <div className="flex flex-1 gap-1 h-full">
                                      {s.heatmapGrid[dIdx].map((val: number, hIdx: number) => (
                                          <div 
                                            key={hIdx} 
                                            className="flex-1 rounded-sm relative group cursor-crosshair transition-all hover:ring-2 hover:ring-slate-900 hover:z-10"
                                            style={{ backgroundColor: getHeatmapColor(val, s.maxHeatmapVal) }}
                                          >
                                            <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded whitespace-nowrap pointer-events-none z-50">
                                                {day}, {hIdx}h: {val} contactos
                                            </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                      
                      <div className="mt-6 flex items-center justify-end gap-2 text-[10px] font-bold text-slate-400">
                          Zero
                          <div className="w-4 h-4 rounded-sm bg-[#f1f5f9]"></div>
                          <span className="mx-2">|</span>
                          Frio
                          <div className="w-32 h-3 rounded-full" style={{ background: 'linear-gradient(to right, #3b82f6, #22c55e, #eab308, #ef4444)' }}></div>
                          Quente
                      </div>
                  </div>
            </div>

            <div id="ai-report-section" className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl mt-4 relative overflow-hidden">
                <div className="absolute -right-20 -top-20 opacity-10 pointer-events-none rotate-12 scale-150">
                    <Sparkles size={400} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-10 border-b border-white/10 pb-6">
                        <div className="bg-indigo-500 p-4 rounded-2xl text-white shadow-lg shadow-indigo-500/30">
                            <Sparkles size={28} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black tracking-tight text-white">Parecer Estratégico WFM</h3>
                            <p className="text-indigo-400 text-sm font-bold uppercase tracking-widest mt-1">Sonata.cx • Powered by AI</p>
                        </div>
                    </div>

                    {isAiLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-indigo-300">
                            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-bold tracking-widest uppercase animate-pulse">A analisar dados e a criar ponto de situação...</p>
                        </div>
                    ) : aiReport ? (
                        <div className="prose prose-invert prose-indigo max-w-none text-slate-300">
                            {aiReport.split('\n').map((paragraph: string, index: number) => {
                                if (paragraph.startsWith('###')) return <h3 key={index} className="text-xl font-bold text-white mt-6 mb-2">{paragraph.replace('###', '')}</h3>;
                                if (paragraph.startsWith('##')) return <h2 key={index} className="text-2xl font-black text-white mt-8 mb-4 border-b border-white/10 pb-2">{paragraph.replace('##', '')}</h2>;
                                if (paragraph.startsWith('#')) return <h1 key={index} className="text-3xl font-black text-indigo-400 mt-6 mb-4">{paragraph.replace('#', '')}</h1>;
                                if (paragraph.startsWith('-')) return <li key={index} className="ml-4 mb-2">{paragraph.replace('-', '').trim()}</li>;
                                if (paragraph.trim() === '') return <br key={index} />;
                                
                                let parsedHtml = paragraph
                                  .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
                                  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-indigo-400 underline">$1</a>');

                                return <p key={index} className="mb-4 leading-relaxed text-lg font-light" dangerouslySetInnerHTML={{__html: parsedHtml}}></p>;
                            })}
                            
                            <div className="mt-12 pt-8 border-t border-white/10 flex justify-end">
                                <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full text-sm font-bold transition-colors flex items-center gap-2" onClick={() => window.print()}>
                                    <Download size={16}/> Exportar Relatório (PDF)
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        @media print {
            aside, button { display: none !important; }
            main { padding: 0; width: 100%; max-width: 100%; background: white; }
            #ai-report-section { background: white !important; color: black !important; box-shadow: none !important; margin-top: 2rem;}
            #ai-report-section * { color: black !important; border-color: #e2e8f0 !important; }
        }
      `}} />
    </div>
  );
}
